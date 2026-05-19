"use client";

import React from "react";
import { Brain, TrendingUp, TrendingDown, Minus, Zap, RefreshCw } from "lucide-react";

interface ForecastItem {
  parameter: string;
  key: string;
  current: number;
  predicted: number;
  unit: string;
  confidence: number;
  color: string;
}

interface LatestReading {
  temperature: number;
  ph: number;
  turbidity: number;
  dissolvedOxygen: number;
  waterLevel: number;
}

const FORECAST_SPECS: Array<{
  parameter: string;
  readingKey: keyof LatestReading;
  forecastKey: string;
  unit: string;
  color: string;
}> = [
  { parameter: "Temperature", readingKey: "temperature", forecastKey: "temperature_C", unit: "°C", color: "#FF6B6B" },
  { parameter: "pH Level", readingKey: "ph", forecastKey: "ph", unit: "", color: "#4ECDC4" },
  { parameter: "Turbidity", readingKey: "turbidity", forecastKey: "turbidity_kd", unit: "NTU", color: "#FFE66D" },
  { parameter: "Dissolved O2", readingKey: "dissolvedOxygen", forecastKey: "dissolved_o2", unit: "mg/L", color: "#95E1D3" },
  { parameter: "Water Level", readingKey: "waterLevel", forecastKey: "sea_level_m", unit: "m", color: "#6C5CE7" },
];

function toSafeNumber(value: unknown, fallback = 0): number {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : fallback;
}

function normalizeReading(data: Record<string, unknown> | null | undefined): LatestReading {
  return {
    temperature: toSafeNumber(data?.temperature ?? data?.temperature_C),
    ph: toSafeNumber(data?.ph),
    turbidity: toSafeNumber(data?.turbidity ?? data?.turbidity_kd),
    dissolvedOxygen: toSafeNumber(data?.dissolvedOxygen ?? data?.dissolved_oxygen),
    waterLevel: toSafeNumber(data?.waterLevel ?? data?.water_level ?? data?.sea_level_m),
  };
}

function buildForecastItems(reading: LatestReading | null, predictions: Array<{ features?: Record<string, unknown> }> | null): ForecastItem[] {
  const latest = reading ?? normalizeReading(null);
  const firstPrediction = predictions?.[0]?.features ?? {};

  return FORECAST_SPECS.map((spec) => {
    const current = toSafeNumber(latest[spec.readingKey], 0);
    const predicted = toSafeNumber(firstPrediction[spec.forecastKey], current);
    return {
      parameter: spec.parameter,
      key: spec.forecastKey,
      current,
      predicted,
      unit: spec.unit,
      confidence: 0,
      color: spec.color,
    };
  });
}

function ForecastRow({ item, anomalyCount }: { item: ForecastItem; anomalyCount?: number }) {
  const delta = item.predicted - item.current;
  const pct = item.current === 0 ? "0.0" : ((delta / item.current) * 100).toFixed(1);
  const TrendIcon = delta > 0 ? TrendingUp : delta < 0 ? TrendingDown : Minus;
  const trendColor = delta > 0 ? "#4ade80" : delta < 0 ? "#f87171" : "#64748b";

  return (
    <div className="py-2.5 border-b border-[#1e3a5f] last:border-0">
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: item.color }} />
          <span className="text-[10px] font-semibold text-gray-300">{item.parameter}</span>
          {typeof anomalyCount === 'number' && anomalyCount > 0 ? (
            <span className="ml-2 inline-flex items-center rounded-full bg-red-600/20 px-2 py-0.5 text-[10px] text-red-200">{anomalyCount}</span>
          ) : null}
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] font-mono font-bold text-white">
            {item.predicted.toFixed(item.unit === "" ? 2 : 1)}{item.unit}
          </span>
          <div className="flex items-center gap-0.5" style={{ color: trendColor }}>
            <TrendIcon className="w-3 h-3" />
            <span className="text-[9px] font-mono">{delta > 0 ? "+" : ""}{pct}%</span>
          </div>
        </div>
      </div>
      {/* Confidence bar */}
      <div className="flex items-center gap-2">
        <div className="flex-1 h-[3px] rounded-full" style={{ background: "#1e3a5f" }}>
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{ width: `${item.confidence}%`, backgroundColor: item.color, opacity: 0.7 }}
          />
        </div>
        <span className="text-[8px] font-mono text-gray-600 w-7 text-right">{item.confidence}%</span>
      </div>
    </div>
  );
}

export function ForecastPanel() {
  const [loading, setLoading] = React.useState(false);
  const [latestReading, setLatestReading] = React.useState<LatestReading | null>(null);
  const [forecastItems, setForecastItems] = React.useState<ForecastItem[]>([]);
  const [anomalySummary, setAnomalySummary] = React.useState<null | {
    totalAnomalies: number;
    perFeatureCounts: Record<string, number>;
    perFeatureStats: Record<string, { mean: number; std: number; avgDelta: number; avgZ: number }>;
  }>(null);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const [readingResp, forecastResp] = await Promise.all([
        fetch("/api/readings?limit=1"),
        fetch("/api/forecast", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ period: "2m", summary: true }),
        }),
      ]);

      let reading: LatestReading | null = null;
      if (readingResp.ok) {
        const readingJson = await readingResp.json();
        const payload = Array.isArray(readingJson.data) ? readingJson.data[0] : readingJson.data;
        reading = normalizeReading(payload);
        setLatestReading(reading);
      }

      if (!forecastResp.ok) {
        return;
      }

      const data = await forecastResp.json();
      const preds = Array.isArray(data.predictions) ? data.predictions : [];
      setForecastItems(buildForecastItems(reading, preds));

      const perFeatureCounts: Record<string, number> = {};
      const perFeatureAcc: Record<string, { meanSum: number; stdSum: number; deltaSum: number; zSum: number; n: number }> = {};
      let totalAnomalies = 0;
      for (const prediction of preds) {
        if (prediction?.is_anomaly) totalAnomalies += 1;
        const stats = prediction?.feature_stats ?? {};
        for (const key of Object.keys(prediction?.features ?? {})) {
          perFeatureCounts[key] = perFeatureCounts[key] ?? 0;
          if (prediction?.feature_anomalies?.[key]) perFeatureCounts[key] += 1;
          perFeatureAcc[key] = perFeatureAcc[key] ?? { meanSum: 0, stdSum: 0, deltaSum: 0, zSum: 0, n: 0 };
          const stat = stats[key] ?? { mean: 0, std: 0, delta: 0, z: 0 };
          perFeatureAcc[key].meanSum += Number(stat.mean ?? 0);
          perFeatureAcc[key].stdSum += Number(stat.std ?? 0);
          perFeatureAcc[key].deltaSum += Number(stat.delta ?? 0);
          perFeatureAcc[key].zSum += Number(stat.z ?? 0);
          perFeatureAcc[key].n += 1;
        }
      }

      const perFeatureStats: Record<string, { mean: number; std: number; avgDelta: number; avgZ: number }> = {};
      Object.entries(perFeatureAcc).forEach(([key, value]) => {
        perFeatureStats[key] = {
          mean: value.n ? value.meanSum / value.n : 0,
          std: value.n ? value.stdSum / value.n : 0,
          avgDelta: value.n ? value.deltaSum / value.n : 0,
          avgZ: value.n ? value.zSum / value.n : 0,
        };
      });

      setAnomalySummary({ totalAnomalies, perFeatureCounts, perFeatureStats });
    } catch (e) {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="p-4 rounded-xl border border-[#1e3a5f] bg-[#091a2e] relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse at 80% 20%, rgba(139,92,246,0.05) 0%, transparent 60%)" }} />

      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <div className="p-1.5 rounded-lg bg-violet-500/10" style={{ boxShadow: "0 0 8px rgba(139,92,246,0.2)" }}>
          <Brain className="w-3.5 h-3.5 text-violet-400" />
        </div>
        <div>
          <h3 className="text-[10px] font-bold tracking-[0.12em] text-gray-400 uppercase">24h Forecast</h3>
          <p className="text-[8px] text-gray-600 font-mono">LSTM · v2.3 · Black Sea</p>
        </div>
        <div className="ml-auto flex items-center gap-1 px-1.5 py-0.5 rounded bg-violet-500/10 border border-violet-500/20">
          <Zap className="w-2.5 h-2.5 text-violet-400" />
          <span className="text-[8px] text-violet-400 font-mono">ACTIVE</span>
        </div>
      </div>

      {/* Rows */}
      <div className="mb-4">
        {(() => {
          const predictionCount = Math.max(1, forecastItems.length);
          return forecastItems.map((item) => {
            const count = anomalySummary?.perFeatureCounts?.[item.key] ?? 0;
            const confidence = Math.max(0, Math.min(99, Math.round(100 - (count / predictionCount) * 100)));
            return <ForecastRow key={item.parameter} item={{ ...item, confidence }} anomalyCount={count} />;
          });
        })()}
      </div>

      {/* Anomaly summary */}
      <div className="mb-4 border-t border-[#102034] pt-4">
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-xs font-semibold text-white">Anomalies</h4>
          <button
            onClick={load}
            className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-xs text-white/80"
          >
            <RefreshCw className="w-3 h-3" />
            Refresh
          </button>
        </div>

        {loading ? (
          <div className="text-xs text-slate-400">Loading anomaly summary…</div>
        ) : anomalySummary ? (
          <div className="text-xs text-slate-300">
            {latestReading ? (
              <div className="mb-2 text-slate-400">
                Live reading: <span className="font-mono text-slate-200">{latestReading.temperature.toFixed(1)}°C / {latestReading.ph.toFixed(2)} pH / {latestReading.turbidity.toFixed(1)} NTU</span>
              </div>
            ) : null}
            <div className="mb-2">Total anomalous points: <strong className="font-mono">{anomalySummary.totalAnomalies}</strong></div>
            <div className="grid gap-2 text-[11px]">
              {Object.keys(anomalySummary.perFeatureStats).map((k) => (
                <div key={k} className="flex items-center justify-between">
                  <div className="text-slate-200">{k}</div>
                  <div className="text-right text-slate-400 font-mono">
                    Count: {anomalySummary.perFeatureCounts[k] ?? 0} · Normal: {Number(anomalySummary.perFeatureStats[k].mean).toFixed(3)} ± {Number(anomalySummary.perFeatureStats[k].std).toFixed(3)} · Δ {Number(anomalySummary.perFeatureStats[k].avgDelta).toFixed(3)} (z={Number(anomalySummary.perFeatureStats[k].avgZ).toFixed(2)})
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="text-xs text-slate-400">No anomaly summary available.</div>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <button className="flex-1 py-1.5 text-[9px] font-bold tracking-wider rounded-lg border border-[#1e3a5f] text-gray-500 hover:border-violet-500/30 hover:text-violet-400 transition-all">
          VIEW REPORT
        </button>
        <button className="flex-1 py-1.5 text-[9px] font-bold tracking-wider rounded-lg border border-[#1e3a5f] text-gray-500 hover:border-cyan-500/30 hover:text-cyan-400 transition-all">
          EXPORT
        </button>
      </div>
    </div>
  );
}
