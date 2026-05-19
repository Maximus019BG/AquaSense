import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextRequest, NextResponse } from "next/server";

const FALLBACK_CSV_PATH = path.resolve(process.cwd(), "..", "docs", "data", "processed", "burgas_final.csv");
const LSTM_FORECAST_PATH = path.resolve(
  process.cwd(),
  "..",
  "ml_system",
  "models",
  "artifacts",
  "lstm_forecaster",
  "lstm_forecaster_forecast.json",
);

const DAY_MS = 24 * 60 * 60 * 1000;
const HOUR_MS = 60 * 60 * 1000;

const FEATURE_KEYS = [
  "sea_level_m",
  "temperature_C",
  "dissolved_o2",
  "salinity_psu",
  "current_speed_m_s",
  "ph",
  "turbidity_kd",
];

type ForecastCadence = "hourly" | "daily" | "weekly" | "monthly";

type ForecastPoint = {
  timestamp: string;
  features: Record<string, number>;
  is_anomaly?: boolean;
  score?: number;
};

type AnomalyPrediction = {
  is_anomaly?: boolean;
  score?: number;
};

type ForecastSpec = {
  amount: number;
  unit: "h" | "d" | "w" | "m" | "y";
  totalDays: number;
  dailySteps: number;
  cadence: ForecastCadence;
  detailPoints: number;
};

function hashString(value: string) {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }
  return hash;
}

function getFeatureStats(seedRows: Array<Record<string, string>>, featureKeys: string[]) {
  return Object.fromEntries(
    featureKeys.map((key) => {
      const values = seedRows.map((row) => Number(row[key] ?? 0)).filter((value) => Number.isFinite(value));
      const meanValue = values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
      const variance = values.length
        ? values.reduce((sum, value) => sum + (value - meanValue) ** 2, 0) / values.length
        : 0;
      return [key, { mean: meanValue, std: Math.sqrt(variance) }];
    }),
  ) as Record<string, { mean: number; std: number }>;
}

function parseForecastSpec(period: string): ForecastSpec {
  const match = /^(\d+)([dhwmy])$/i.exec((period || "7d").trim());
  if (!match) {
    return parseForecastSpec("7d");
  }

  const amount = Number(match[1]);
  const unit = match[2].toLowerCase();

  const unitToDays: Record<string, number> = {
    h: 1 / 24,
    d: 1,
    w: 7,
    m: 30,
    y: 365,
  };

  const totalDays = amount * unitToDays[unit];

  const dailySteps = Math.max(1, Math.ceil(totalDays));

  let cadence: ForecastCadence;
  if (totalDays <= 2) {
    cadence = "hourly";
  } else if (totalDays <= 35) {
    cadence = "daily";
  } else {
    cadence = "weekly";
  }

  let detailPoints = 0;
  if (cadence === "hourly") {
    detailPoints = Math.max(1, Math.round(totalDays * 24));
  } else if (cadence === "daily") {
    detailPoints = Math.max(1, Math.ceil(totalDays));
  } else if (cadence === "weekly") {
    detailPoints = Math.max(1, Math.floor(totalDays / 7));
  } else {
    detailPoints = unit === "y" ? amount * 12 : unit === "m" ? amount : Math.max(1, Math.round(totalDays / 30));
  }

  return { amount, unit, totalDays, dailySteps, cadence, detailPoints };
}

function parsePeriodToSteps(period: string): number {
  return parseForecastSpec(period).dailySteps;
}

function rebasePredictionsToNow(predictions: ForecastPoint[]) {
  const start = new Date();
  start.setUTCHours(0, 0, 0, 0);
  return predictions.map((p, idx) => {
    const ts = new Date(start.getTime() + (idx + 1) * DAY_MS).toISOString();
    return { ...p, timestamp: ts };
  });
}

async function annotateForecastWithAnomalies(predictions: ForecastPoint[]) {
  const inferenceBase = (process.env.INFERENCE_URL || "http://localhost:8000").replace(/\/(predict|forecast)$/, "");
  const inferenceUrl = `${inferenceBase}/predict`;

  // keep full series payload using all available feature keys
  const series = predictions.map((point) => ({
    timestamp: point.timestamp,
    ...point.features,
  }));

  // helper: compute per-feature stats from seed CSV to detect which feature deviates
  let seedRows = [];
  try {
    seedRows = await loadSeedRows(90);
  } catch (e) {
    seedRows = [];
  }

  const featureKeysLocal = Object.keys(predictions[0]?.features ?? {});
  const stats = seedRows.length && featureKeysLocal.length ? getFeatureStats(seedRows, featureKeysLocal) : {};

  try {
    const response = await fetch(inferenceUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode: "inline", series }),
    });

    if (!response.ok) {
      throw new Error(`Anomaly check failed with status ${response.status}`);
    }

    const data = (await response.json()) as { predictions?: AnomalyPrediction[] };
    const anomalyRows = Array.isArray(data.predictions) ? data.predictions : [];

    // For each anomalous timestamp, attempt leave-one-out attribution by
    // replacing each feature with its recent mean and re-querying /predict.
    // To avoid excessive requests, cap number of timestamps and concurrency.
    const MAX_ATTR_POINTS = Number(process.env.FEATURE_ATTRIBUTION_MAX_POINTS ?? 20);
    const ATTR_CONCURRENCY = Number(process.env.ATTRIBUTION_CONCURRENCY ?? 4);

    // Identify anomalous indices
    const anomalousIndices: number[] = [];
    for (let i = 0; i < anomalyRows.length; i += 1) {
      if (anomalyRows[i]?.is_anomaly) anomalousIndices.push(i);
    }

    // Prepare feature_anomalies and feature_stats map per index
    const featureAnomalyMap: Record<number, Record<string, boolean>> = {};
    const featureStatsMap: Record<number, Record<string, { mean: number; std: number; value: number; delta: number; z: number }>> = {};
    const zThreshold = Number(process.env.FEATURE_Z_THRESHOLD ?? 2);

    for (let i = 0; i < predictions.length; i += 1) {
      featureAnomalyMap[i] = Object.fromEntries(featureKeysLocal.map((k) => [k, false]));
      featureStatsMap[i] = Object.fromEntries(
        featureKeysLocal.map((k) => {
          const value = Number(predictions[i].features?.[k] ?? 0);
          const s = (stats && stats[k]) || { mean: 0, std: 0 } as any;
          const meanVal = Number(s.mean ?? 0);
          const stdVal = Number(s.std ?? 0) || 0;
          const delta = value - meanVal;
          const z = stdVal > 1e-9 ? delta / stdVal : 0;
          return [k, { mean: meanVal, std: stdVal, value, delta, z }];
        }),
      );
    }

    // First-pass: simple z-score attribution for all anomalous indices
    const zFlaggedIndices: number[] = [];
    for (const idx of anomalousIndices) {
      let anyFlag = false;
      for (const k of featureKeysLocal) {
        const meta = featureStatsMap[idx][k];
        if (Math.abs(meta.z) >= zThreshold) {
          featureAnomalyMap[idx][k] = true;
          anyFlag = true;
        }
      }
      if (anyFlag) zFlaggedIndices.push(idx);
    }

    // If too many anomalous indices, sample remaining for deeper LOO attribution
    const remaining = anomalousIndices.filter((i) => !zFlaggedIndices.includes(i));
    const MAX_ATTR_POINTS_ENV = Number(process.env.FEATURE_ATTRIBUTION_MAX_POINTS ?? MAX_ATTR_POINTS);
    let selectedForLoo = remaining;
    if (remaining.length > MAX_ATTR_POINTS_ENV) {
      const step = Math.ceil(remaining.length / MAX_ATTR_POINTS_ENV);
      selectedForLoo = remaining.filter((_, idx) => idx % step === 0).slice(0, MAX_ATTR_POINTS_ENV);
    }

    // If there are still no selected points, skip LOO entirely
    if (selectedForLoo.length > 0) {
      type TaskResult = { idx: number; key: string; contributor: boolean };
      const tasks: Array<() => Promise<TaskResult | null>> = [];

      let TOP_FEATURES_FOR_LOO = Number(process.env.TOP_FEATURES_FOR_LOO ?? 3);
      const MAX_TOTAL_LOO_CALLS = Number(process.env.FEATURE_ATTRIBUTION_MAX_CALLS ?? 40);

      // adjust TOP_FEATURES_FOR_LOO downward if estimated calls exceed cap
      const estCalls = selectedForLoo.length * TOP_FEATURES_FOR_LOO;
      if (estCalls > MAX_TOTAL_LOO_CALLS && selectedForLoo.length > 0) {
        TOP_FEATURES_FOR_LOO = Math.max(1, Math.floor(MAX_TOTAL_LOO_CALLS / selectedForLoo.length));
      }

      // If still too many points, downsample selectedForLoo
      const maxPointsAllowed = Math.max(1, Math.floor(MAX_TOTAL_LOO_CALLS / TOP_FEATURES_FOR_LOO));
      if (selectedForLoo.length > maxPointsAllowed) {
        const step = Math.ceil(selectedForLoo.length / maxPointsAllowed);
        selectedForLoo = selectedForLoo.filter((_, idx) => idx % step === 0).slice(0, maxPointsAllowed);
      }

      // small fetch timeout wrapper to avoid long-hanging requests
      const fetchWithTimeout = async (url: string, opts: any = {}, timeout = Number(process.env.ATTRIBUTION_FETCH_TIMEOUT_MS ?? 3000)) => {
        const controller = new AbortController();
        const id = setTimeout(() => controller.abort(), timeout);
        try {
          const response = await fetch(url, { ...opts, signal: controller.signal });
          clearTimeout(id);
          return response;
        } catch (err) {
          clearTimeout(id);
          throw err;
        }
      };

      for (const idx of selectedForLoo) {
        const point = predictions[idx];
        const baseScore = Number(anomalyRows[idx]?.score ?? 0);

        // pick top candidate features by absolute z or delta to limit checks
        const candidates = featureKeysLocal.slice()
          .map((k) => ({ k, score: Math.abs((featureStatsMap[idx]?.[k]?.z) ?? (featureStatsMap[idx]?.[k]?.delta ?? 0)) }))
          .sort((a, b) => b.score - a.score)
          .slice(0, TOP_FEATURES_FOR_LOO)
          .map((c) => c.k);

        for (const k of candidates) {
          tasks.push(async () => {
            // create a modified point that includes all features but swaps the candidate with its mean
            const modified: Record<string, any> = { timestamp: point.timestamp, ...(point.features ?? {}) };
            if (stats && stats[k] && typeof stats[k].mean === "number") {
              modified[k] = stats[k].mean;
            } else {
              modified[k] = point.features?.[k];
            }

            try {
              const resp = await fetchWithTimeout(inferenceUrl, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ mode: "inline", series: [modified] }),
              }, Number(process.env.ATTRIBUTION_FETCH_TIMEOUT_MS ?? 3000));
              if (!resp.ok) return null;
              const d = await resp.json();
              const p = Array.isArray(d.predictions) ? d.predictions[0] : null;
              if (!p) return null;
              const newIsAnom = Boolean(p.is_anomaly);
              const newScore = Number(p.score ?? 0);
              const contributor = !newIsAnom || newScore > baseScore;
              return { idx, key: k, contributor };
            } catch (err) {
              return null;
            }
          });
        }
      }

      // Run tasks in batches with concurrency limit
      const runBatches = async () => {
        while (tasks.length > 0) {
          const batch = tasks.splice(0, ATTR_CONCURRENCY).map((t) => t());
          const results = await Promise.all(batch);
          for (const r of results) {
            if (!r) continue;
            if (r.contributor) {
              featureAnomalyMap[r.idx][r.key] = true;
            }
          }
        }
      };

      try {
        await runBatches();
      } catch (e) {
        // ignore
      }
    }

    const results = predictions.map((point, index) => {
      const overall = Boolean(anomalyRows[index]?.is_anomaly);
      const score = Number(anomalyRows[index]?.score ?? 0);
      const perFeatureStats = featureStatsMap[index] ?? Object.fromEntries(featureKeysLocal.map((k) => [k, { mean: 0, std: 0, value: 0, delta: 0, z: 0 }]));
      return {
        ...point,
        is_anomaly: overall,
        score,
        feature_anomalies: featureAnomalyMap[index] ?? Object.fromEntries(featureKeysLocal.map((k) => [k, false])),
        feature_stats: perFeatureStats,
      };
    });

    return results;
  } catch (e) {
    // fallback: no anomalies
    return predictions.map((point) => ({
      ...point,
      is_anomaly: false,
      score: 0,
      feature_anomalies: Object.fromEntries(Object.keys(point.features ?? {}).map((k) => [k, false])),
    }));
  }
}

async function loadSavedLstmForecast() {
  const raw = await readFile(LSTM_FORECAST_PATH, "utf-8");
  const data = JSON.parse(raw) as { predictions?: ForecastPoint[]; feature_columns?: string[] };
  return {
    predictions: Array.isArray(data.predictions) ? data.predictions : [],
    featureKeys: Array.isArray(data.feature_columns) ? data.feature_columns : FEATURE_KEYS,
  };
}

function interpolateValues(start: Record<string, number>, end: Record<string, number>, ratio: number) {
  return Object.fromEntries(
    Object.keys(start).map((key) => {
      const startValue = Number(start[key] ?? 0);
      const endValue = Number(end[key] ?? startValue);
      return [key, Number((startValue + (endValue - startValue) * ratio).toFixed(4))];
    }),
  );
}

function addSeasonality(
  values: Record<string, number>,
  featureKeys: string[],
  progress: number,
  amplitudeScale: number,
) {
  return Object.fromEntries(
    featureKeys.map((key) => {
      const baseValue = Number(values[key] ?? 0);
      const phase = (hashString(key) % 360) * (Math.PI / 180);
      const seasonal = Math.sin(progress * 2 * Math.PI + phase) * amplitudeScale;
      return [key, Number((baseValue + seasonal).toFixed(4))];
    }),
  ) as Record<string, number>;
}

function getSeriesAnchors(seedRows: Array<Record<string, string>>, baseForecast: { predictions: ForecastPoint[] }) {
  const latest = seedRows[seedRows.length - 1] ?? {};
  const latestTime = latest.time ? new Date(latest.time) : new Date();
  const startFeatures = Object.fromEntries(
    FEATURE_KEYS.map((key) => [key, Number(latest[key] ?? 0)]),
  ) as Record<string, number>;

  const anchors: Array<{ timestamp: Date; features: Record<string, number> }> = [
    { timestamp: latestTime, features: startFeatures },
    ...baseForecast.predictions.map((point) => ({ timestamp: new Date(point.timestamp), features: point.features })),
  ];

  return { anchors, featureKeys: FEATURE_KEYS, latestTime };
}

function sampleAnchorsAt(targetTime: Date, anchors: Array<{ timestamp: Date; features: Record<string, number> }>) {
  if (anchors.length === 0) {
    return { timestamp: targetTime.toISOString(), features: {} as Record<string, number> };
  }

  if (targetTime <= anchors[0].timestamp) {
    return { timestamp: targetTime.toISOString(), features: { ...anchors[0].features } };
  }

  const lastAnchor = anchors[anchors.length - 1];
  if (targetTime >= lastAnchor.timestamp) {
    return { timestamp: targetTime.toISOString(), features: { ...lastAnchor.features } };
  }

  for (let index = 0; index < anchors.length - 1; index += 1) {
    const current = anchors[index];
    const next = anchors[index + 1];
    if (targetTime >= current.timestamp && targetTime <= next.timestamp) {
      const span = next.timestamp.getTime() - current.timestamp.getTime();
      const ratio = span <= 0 ? 0 : (targetTime.getTime() - current.timestamp.getTime()) / span;
      return {
        timestamp: targetTime.toISOString(),
        features: interpolateValues(current.features, next.features, ratio),
      };
    }
  }

  return { timestamp: targetTime.toISOString(), features: { ...lastAnchor.features } };
}

function buildDetailedForecast(
  baseForecast: { predictions: ForecastPoint[] },
  seedRows: Array<Record<string, string>>,
  spec: ForecastSpec,
) {
  const { anchors, featureKeys, latestTime } = getSeriesAnchors(seedRows, baseForecast);
  const featureStats = getFeatureStats(seedRows, featureKeys);

  if (spec.cadence === "hourly") {
    const hourlyPoints: ForecastPoint[] = [];
    const totalHours = Math.max(1, Math.round(spec.totalDays * 24));
    for (let hourIndex = 1; hourIndex <= totalHours; hourIndex += 1) {
      const targetTime = new Date(latestTime.getTime() + hourIndex * HOUR_MS);
      const sampled = sampleAnchorsAt(targetTime, anchors);
      const progress = hourIndex / totalHours;
      const amplitudeScale = 0.08;
      const adjusted = addSeasonality(sampled.features, featureKeys, progress, amplitudeScale);
      hourlyPoints.push({ timestamp: sampled.timestamp, features: adjusted });
    }
    return { points: hourlyPoints, featureKeys, cadence: spec.cadence };
  }

  if (spec.cadence === "daily") {
    const dailyPoints: ForecastPoint[] = [];
    const days = Math.max(1, spec.detailPoints);
    for (let dayIndex = 1; dayIndex <= days; dayIndex += 1) {
      const targetTime = new Date(latestTime.getTime() + dayIndex * DAY_MS);
      const sampled = sampleAnchorsAt(targetTime, anchors);
      const progress = dayIndex / days;
      const amplitudeScale = 0.07;
      const adjusted = addSeasonality(sampled.features, featureKeys, progress, amplitudeScale);
      dailyPoints.push({ timestamp: sampled.timestamp, features: adjusted });
    }
    return { points: dailyPoints, featureKeys, cadence: spec.cadence };
  }

  if (spec.cadence === "weekly") {
    const weeklyPoints: ForecastPoint[] = [];
      const weeks = Math.max(1, spec.detailPoints);
    for (let weekIndex = 1; weekIndex <= weeks; weekIndex += 1) {
      const targetTime = new Date(latestTime.getTime() + weekIndex * 7 * DAY_MS);
      const sampled = sampleAnchorsAt(targetTime, anchors);
      const progress = weekIndex / weeks;
      const amplitudeScale = 0.06;
      const adjusted = addSeasonality(sampled.features, featureKeys, progress, amplitudeScale);
      weeklyPoints.push({ timestamp: sampled.timestamp, features: adjusted });
    }
    return { points: weeklyPoints, featureKeys, cadence: spec.cadence };
  }

  const monthlyPoints: ForecastPoint[] = [];
    const months = Math.max(1, spec.detailPoints);
  for (let monthIndex = 1; monthIndex <= months; monthIndex += 1) {
    const targetTime = new Date(latestTime);
    targetTime.setMonth(targetTime.getMonth() + monthIndex);
    const sampled = sampleAnchorsAt(targetTime, anchors);
    const progress = monthIndex / months;
    const amplitudeScale = 0.04;
    const adjusted = addSeasonality(sampled.features, featureKeys, progress, amplitudeScale);
    monthlyPoints.push({ timestamp: sampled.timestamp, features: adjusted });
  }

  return { points: monthlyPoints, featureKeys, cadence: spec.cadence };
}

async function loadSeedRows(limit: number) {
  const csv = await readFile(FALLBACK_CSV_PATH, "utf-8");
  const lines = csv.trim().split(/\r?\n/);

  if (lines.length < 2) {
    throw new Error("No fallback forecast data available");
  }

  const headers = lines[0].split(",");
  const rows = lines.slice(1).map((line) => {
    const values = line.split(",");
    const row: Record<string, string> = {};
    headers.forEach((header, index) => {
      row[header] = values[index] ?? "";
    });
    return row;
  });

  return rows.slice(Math.max(0, rows.length - limit));
}

function mean(values: number[]) {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function lastDelta(values: number[]) {
  if (values.length < 2) return 0;
  const window = values.slice(-Math.min(7, values.length));
  const diffs: number[] = [];
  for (let index = 1; index < window.length; index += 1) {
    diffs.push(window[index] - window[index - 1]);
  }
  return mean(diffs);
}

function buildLocalForecast(period: string, seedRows: Array<Record<string, string>>) {
  const spec = parseForecastSpec(period);
  const steps = spec.dailySteps;
  const featureKeys = FEATURE_KEYS;

  // Use all available history for pattern analysis
  const seriesByFeature = Object.fromEntries(
    featureKeys.map((key) => [
      key,
      seedRows.map((row) => Number(row[key] ?? 0)).filter((value) => Number.isFinite(value)),
    ]),
  ) as Record<string, number[]>;

  // Extract actual day-to-day changes from history
  const deltasByFeature = Object.fromEntries(
    featureKeys.map((key) => {
      const values = seriesByFeature[key] ?? [];
      const deltas: number[] = [];
      for (let i = 1; i < values.length; i += 1) {
        deltas.push(values[i] - values[i - 1]);
      }
      return [key, deltas];
    }),
  ) as Record<string, number[]>;

  // Analyze observed patterns
  const featureStats = Object.fromEntries(
    featureKeys.map((key) => {
      const values = seriesByFeature[key] ?? [];
      const deltas = deltasByFeature[key] ?? [];
      
      if (values.length === 0) return [key, { mean: 0, std: 0, volatility: 0, recentDeltas: [] }];
      
      const mean_val = mean(values);
      const variance = mean(values.map((v) => (v - mean_val) ** 2));
      const std_val = Math.sqrt(variance);
      
      // Volatility: standard deviation of day-to-day changes
      const volatility = Math.sqrt(mean(deltas.map((d) => d ** 2)));
      
      // Keep recent deltas for sampling realistic patterns
      const recentDeltas = deltas.slice(-Math.min(30, deltas.length));
      
      return [key, { mean: mean_val, std: std_val, volatility, recentDeltas }];
    }),
  ) as Record<string, { mean: number; std: number; volatility: number; recentDeltas: number[] }>;

  const latest = seedRows[seedRows.length - 1] ?? {};
  const latestTime = latest.time ? new Date(latest.time) : new Date();

  // Pseudo-random number generator seeded by day offset for reproducibility
  const seededRandom = (seed: number): number => {
    const x = Math.sin(seed) * 10000;
    return x - Math.floor(x);
  };

  // Generate predictions by combining observed patterns with realistic variation
  const predictions = Array.from({ length: steps }, (_, stepIndex) => {
    const dayOffset = stepIndex + 1;
    
    const features = Object.fromEntries(
      featureKeys.map((key) => {
        const stats = featureStats[key] ?? { mean: 0, std: 0, volatility: 0, recentDeltas: [] };
        let current = Number(latest[key] ?? stats.mean);
        
        // Build forward day-by-day to accumulate realistic variation
        for (let day = 1; day <= dayOffset; day += 1) {
          // Sample from observed deltas with some random variation
          const recentDeltas = stats.recentDeltas;
          let deltaComponent = 0;
          
          if (recentDeltas.length > 0) {
            // Pick a recent observed delta and add noise
            const deltaIdx = Math.floor(seededRandom(day * 1000 + stepIndex) * recentDeltas.length);
            const baseDelta = recentDeltas[deltaIdx] ?? 0;
            const noise = (seededRandom(day * 2000 + stepIndex) - 0.5) * stats.volatility * 0.6;
            deltaComponent = baseDelta + noise;
          } else {
            // Fallback: random walk with observed volatility
            deltaComponent = (seededRandom(day * 3000 + stepIndex) - 0.5) * stats.volatility * 1.5;
          }
          
          // Apply light mean-reversion to prevent drift
          const deviation = current - stats.mean;
          const meanReversionPull = deviation * 0.02; // Gentle pull back to mean
          current = current + deltaComponent - meanReversionPull;
        }
        
        return [key, Number(current.toFixed(4))];
      }),
    );

    const timestamp = new Date(latestTime.getTime() + dayOffset * 24 * 60 * 60 * 1000).toISOString();
    return { timestamp, features };
  });

  return {
    success: true,
    model_version: "fallback_csv",
    period,
    steps,
    predictions,
    summary: {
      n_points: predictions.length,
      start_timestamp: predictions[0]?.timestamp ?? null,
      end_timestamp: predictions[predictions.length - 1]?.timestamp ?? null,
    },
  };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const period = body.period || "7d";
    const spec = parseForecastSpec(period);

    try {
      // Try live inference server first
      const inferenceBase = (process.env.INFERENCE_URL || "http://localhost:8000").replace(/\/$/, "");
      try {
        const resp = await fetch(`${inferenceBase}/forecast`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ period }),
        });

        if (resp.ok) {
          const data = await resp.json();
          const serverPreds = Array.isArray(data.predictions) ? data.predictions : [];
          if (serverPreds.length > 0) {
            const limited = serverPreds.slice(0, spec.dailySteps);
            // If client requested a lightweight summary, compute z-score annotations only
            if (body?.summary) {
              const seedRows = await loadSeedRows(90).catch(() => []);
              const annotated = computeZScoreAnnotations(limited, seedRows);
              const rebased = rebasePredictionsToNow(annotated);
              return NextResponse.json({
                success: true,
                model_version: data.model_version || "remote_lstm_forecast",
                period,
                steps: rebased.length,
                detail_cadence: "daily",
                predictions: rebased,
                summary: { n_points: rebased.length, detail_cadence: "daily", start_timestamp: rebased[0]?.timestamp ?? null, end_timestamp: rebased[rebased.length - 1]?.timestamp ?? null },
              });
            }

            let annotated = await annotateForecastWithAnomalies(limited);
            annotated = rebasePredictionsToNow(annotated);
            return NextResponse.json({
              success: true,
              model_version: data.model_version || "remote_lstm_forecast",
              period,
              steps: annotated.length,
              detail_cadence: "daily",
              predictions: annotated,
              summary: {
                n_points: annotated.length,
                detail_cadence: "daily",
                start_timestamp: annotated[0]?.timestamp ?? null,
                end_timestamp: annotated[annotated.length - 1]?.timestamp ?? null,
              },
            });
          }
        }
      } catch (e) {
        // fall through to saved/local fallback
      }

      const saved = await loadSavedLstmForecast();
      if (body?.summary) {
        const seedRows = await loadSeedRows(90).catch(() => []);
        let predictions = computeZScoreAnnotations(saved.predictions.slice(0, spec.dailySteps), seedRows);
        predictions = rebasePredictionsToNow(predictions);
        if (predictions.length === 0) {
          throw new Error("no_saved_lstm_forecast");
        }

        return NextResponse.json({
          success: true,
          model_version: "saved_lstm_forecast",
          period,
          steps: predictions.length,
          detail_cadence: "daily",
          predictions,
          summary: {
            n_points: predictions.length,
            detail_cadence: "daily",
            start_timestamp: predictions[0]?.timestamp ?? null,
            end_timestamp: predictions[predictions.length - 1]?.timestamp ?? null,
          },
        });
      }

      let predictions = await annotateForecastWithAnomalies(saved.predictions.slice(0, spec.dailySteps));
      predictions = rebasePredictionsToNow(predictions);
      if (predictions.length === 0) {
        throw new Error("no_saved_lstm_forecast");
      }

      return NextResponse.json({
        success: true,
        model_version: "saved_lstm_forecast",
        period,
        steps: predictions.length,
        detail_cadence: "daily",
        predictions,
        summary: {
          n_points: predictions.length,
          detail_cadence: "daily",
          start_timestamp: predictions[0]?.timestamp ?? null,
          end_timestamp: predictions[predictions.length - 1]?.timestamp ?? null,
        },
      });
    } catch {
      const seedRows = await loadSeedRows(Math.max(30, spec.dailySteps + 1));
      const baseForecast = buildLocalForecast(`${spec.dailySteps}d`, seedRows);
      if (body?.summary) {
        let predictions = computeZScoreAnnotations(baseForecast.predictions, seedRows);
        predictions = rebasePredictionsToNow(predictions);
        return NextResponse.json({
          ...baseForecast,
          predictions,
          period,
          detail_cadence: "daily",
          steps: predictions.length,
          summary: {
            n_points: predictions.length,
            detail_cadence: "daily",
            start_timestamp: predictions[0]?.timestamp ?? null,
            end_timestamp: predictions[predictions.length - 1]?.timestamp ?? null,
            anomaly_count: predictions.filter((point) => point.is_anomaly).length,
          },
        });
      }

      let predictions = await annotateForecastWithAnomalies(baseForecast.predictions);
      predictions = rebasePredictionsToNow(predictions);
      return NextResponse.json({
        ...baseForecast,
        predictions,
        period,
        detail_cadence: "daily",
        steps: predictions.length,
        summary: {
          n_points: predictions.length,
          detail_cadence: "daily",
          start_timestamp: predictions[0]?.timestamp ?? null,
          end_timestamp: predictions[predictions.length - 1]?.timestamp ?? null,
          anomaly_count: predictions.filter((point) => point.is_anomaly).length,
        },
      });
    }
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}

function computeZScoreAnnotations(predictions: ForecastPoint[], seedRows: Array<Record<string, string>>, zThreshold = Number(process.env.FEATURE_Z_THRESHOLD ?? 2)) {
  const featureKeysLocal = Object.keys(predictions[0]?.features ?? {});
  const stats = seedRows.length && featureKeysLocal.length ? getFeatureStats(seedRows, featureKeysLocal) : {};

  const featureStatsMap: Record<number, Record<string, { mean: number; std: number; value: number; delta: number; z: number }>> = {};
  const featureAnomalyMap: Record<number, Record<string, boolean>> = {};

  const summaryThreshold = Number(process.env.SUMMARY_FEATURE_Z_THRESHOLD ?? process.env.FEATURE_Z_THRESHOLD ?? 1);

  for (let i = 0; i < predictions.length; i += 1) {
    featureAnomalyMap[i] = Object.fromEntries(featureKeysLocal.map((k) => [k, false]));
    featureStatsMap[i] = Object.fromEntries(
      featureKeysLocal.map((k) => {
        const value = Number(predictions[i].features?.[k] ?? 0);
        const s = (stats && stats[k]) || { mean: 0, std: 0 } as any;
        const meanVal = Number(s.mean ?? 0);
        const stdVal = Number(s.std ?? 0) || 0;
        // Avoid near-zero std causing z=0: floor std using relative and absolute floors
        const absStdFloor = 1e-6;
        const relStdFloor = Math.abs(meanVal) * 0.01; // 1% of mean as floor
        const stdFloor = Math.max(stdVal, relStdFloor, absStdFloor);
        const delta = value - meanVal;
        const z = delta / stdFloor;
        return [k, { mean: meanVal, std: stdVal, value, delta, z }];
      }),
    );

    for (const k of featureKeysLocal) {
      const meta = featureStatsMap[i][k];
      if (Math.abs(meta.z) >= summaryThreshold) {
        featureAnomalyMap[i][k] = true;
      }
    }
  }

  const results = predictions.map((point, idx) => {
    const perFeatureStats = featureStatsMap[idx] ?? {};
    const feature_anomalies = featureAnomalyMap[idx] ?? {};
    const is_anomaly = Object.values(feature_anomalies).some(Boolean);
    // compute a lightweight score: maximum absolute z across features
    const zValues = Object.values(perFeatureStats).map((s) => Math.abs(Number(s.z ?? 0)));
    const maxAbsZ = zValues.length ? Math.max(...zValues) : 0;
    return {
      ...point,
      is_anomaly,
      score: Number(maxAbsZ.toFixed(3)),
      feature_anomalies,
      feature_stats: perFeatureStats,
    };
  });

  return results;
}