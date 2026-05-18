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

  const unitToDays: Record<typeof unit, number> = {
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

async function annotateForecastWithAnomalies(predictions: ForecastPoint[]) {
  const inferenceBase = (process.env.INFERENCE_URL || "http://localhost:8000").replace(/\/(predict|forecast)$/, "");
  const inferenceUrl = `${inferenceBase}/predict`;

  const series = predictions.map((point) => ({
    timestamp: point.timestamp,
    temperature_C: point.features.temperature_C,
    dissolved_o2: point.features.dissolved_o2,
    salinity_psu: point.features.salinity_psu,
    sea_level_m: point.features.sea_level_m,
  }));

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

    return predictions.map((point, index) => ({
      ...point,
      is_anomaly: Boolean(anomalyRows[index]?.is_anomaly),
      score: Number(anomalyRows[index]?.score ?? 0),
    }));
  } catch {
    return predictions.map((point) => ({
      ...point,
      is_anomaly: false,
      score: 0,
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
      const saved = await loadSavedLstmForecast();
      const predictions = await annotateForecastWithAnomalies(saved.predictions.slice(0, spec.dailySteps));
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
      const predictions = await annotateForecastWithAnomalies(baseForecast.predictions);
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