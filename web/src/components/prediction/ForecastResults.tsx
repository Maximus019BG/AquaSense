"use client";

import React, { useState } from "react";
import { format, parseISO } from "date-fns";
import { CartesianGrid, AreaChart, Area, ResponsiveContainer, Tooltip, XAxis, YAxis, LineChart, Line } from "recharts";

const palette = ["#00BCD4", "#6EE7B7", "#F59E0B", "#F472B6", "#60A5FA", "#A78BFA", "#F87171"];
const defaultColor = "#00BCD4";

type ForecastFeatureValues = Record<string, number>;

type ForecastPrediction = {
  timestamp: string;
  features: ForecastFeatureValues;
  is_anomaly?: boolean;
  score?: number;
};

type ForecastResultsData = {
  period?: string;
  detail_cadence?: string;
  predictions?: ForecastPrediction[];
};

type ForecastTooltipEntry = {
  dataKey?: string | number;
  color?: string;
  value?: number;
  payload?: {
    raw?: ForecastFeatureValues;
    is_anomaly?: boolean;
    score?: number;
  };
};

type ForecastDotProps = {
  cx?: number;
  cy?: number;
  payload?: {
    is_anomaly?: boolean;
  };
};

type ForecastTooltipProps = {
  active?: boolean;
  payload?: ForecastTooltipEntry[];
  label?: string | number;
};

const featureLabels: Record<string, string> = {
  sea_level_m: "Sea Level",
  temperature_C: "Temperature",
  dissolved_o2: "Dissolved O2",
  salinity_psu: "Salinity",
  current_speed_m_s: "Current Speed",
  ph: "pH",
  turbidity_kd: "Turbidity",
};

function formatFeatureLabel(key: string) {
  return featureLabels[key] ?? key;
}

function getSeriesDomain(values: number[]) {
  if (values.length === 0) {
    return [0, 1] as [number, number];
  }

  const firstValue = values[0] ?? 0;
  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);
  const spread = maxValue - minValue;

  if (spread < 1e-9) {
    const pad = Math.abs(values[0] ?? 1) * 0.05 || 1;
    return [Number((firstValue - pad).toFixed(3)), Number((firstValue + pad).toFixed(3))];
  }

  const pad = Math.max(spread * 0.22, Math.abs(minValue) * 0.03, Math.abs(maxValue) * 0.03, 0.01);
  return [Number((minValue - pad).toFixed(3)), Number((maxValue + pad).toFixed(3))];
}

function normalizeSeries(values: number[]) {
  if (values.length === 0) {
    return [];
  }

  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);
  const spread = maxValue - minValue;

  if (spread < 1e-9) {
    return values.map(() => 50);
  }

  return values.map((value) => ((value - minValue) / spread) * 100);
}

function ForecastTooltip({ active, payload = [], label }: ForecastTooltipProps) {
  if (!active || payload.length === 0) {
    return null;
  }

  const readableLabel = typeof label === "string" ? format(new Date(label), "MMM d, yyyy h:mm a") : String(label);

  return (
    <div className="rounded-xl border border-white/10 bg-slate-950/95 px-3 py-2 text-xs text-slate-100 shadow-xl backdrop-blur-xl">
      <div className="mb-2 font-semibold text-white">{readableLabel}</div>
      {payload.some((entry) => entry.payload?.is_anomaly) ? (
        <div className="mb-2 rounded-full border border-red-400/20 bg-red-400/10 px-2 py-1 text-[11px] text-red-200">
          Anomaly detected at this point
        </div>
      ) : null}
      <div className="grid gap-1">
        {payload.map((entry) => {
          const featureKey = String(entry.dataKey ?? "").replace("display_", "");

          return (
          <div key={entry.dataKey} className="flex items-center justify-between gap-4">
            <span style={{ color: entry.color ?? defaultColor }}>{formatFeatureLabel(featureKey)}</span>
            <span className="font-mono text-white">
              {Number(entry.payload?.raw?.[featureKey] ?? entry.value ?? 0).toFixed(3)}
            </span>
          </div>
          );
        })}
      </div>
    </div>
  );
}

function FeatureSparkline({
  featureKey,
  color,
  values,
  timestamps,
}: {
  featureKey: string;
  color: string;
  values: number[];
  timestamps: string[];
}) {
  const domain = getSeriesDomain(values);
  const featureLabel = formatFeatureLabel(featureKey);
  const chartData = values.map((value, index) => ({
    timestamp: timestamps[index],
    value,
  }));

  const current = values[values.length - 1] ?? 0;
  const start = values[0] ?? 0;
  const delta = current - start;

  return (
    <div className="rounded-2xl border border-white/10 bg-slate-950/80 p-4 shadow-[0_18px_50px_rgba(0,0,0,0.2)]">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <h5 className="text-sm font-medium text-slate-100">{featureLabel}</h5>
          <p className="text-xs text-slate-500">
            {start.toFixed(3)} → {current.toFixed(3)}
          </p>
        </div>
        <div className="text-right">
          <div className="font-mono text-sm text-white">{current.toFixed(3)}</div>
          <div className={`text-xs ${delta >= 0 ? "text-emerald-300" : "text-rose-300"}`}>
            {delta >= 0 ? "+" : ""}{delta.toFixed(3)}
          </div>
        </div>
      </div>

      <div className="h-40">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id={`forecast-fill-${featureKey}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={color} stopOpacity={0.35} />
                <stop offset="95%" stopColor={color} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="#21343A" strokeDasharray="3 3" opacity={0.35} />
            <XAxis dataKey="timestamp" hide />
            <YAxis
              domain={domain}
              width={44}
              tick={{ fontSize: 11, fill: "#94A3B8" }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(value) => Number(value).toFixed(1)}
            />
            <Tooltip content={<ForecastTooltip />} />
            <Area
              type="monotone"
              dataKey="value"
              stroke={color}
              strokeWidth={2.5}
              fill={`url(#forecast-fill-${featureKey})`}
              fillOpacity={1}
              dot={false}
              activeDot={{ r: 4 }}
              isAnimationActive
              animationDuration={1000}
              animationEasing="ease-out"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

/**
 * Unified forecast chart - displays all selected features on a normalized scale.
 */
function UnifiedForecastChart({
  featureKeys,
  preds,
  timestamps,
  visibleFeatures,
}: {
  featureKeys: string[];
  preds: ForecastPrediction[];
  timestamps: string[];
  visibleFeatures: Record<string, boolean>;
}) {

  const chartWidth = Math.max(1200, preds.length * 60);

  const chartData = preds.map((item, index) => {
    const normalized = Object.fromEntries(
      featureKeys.map((key) => {
        const series = normalizeSeries(preds.map((entry) => Number(entry.features?.[key] ?? 0)));
        return [`display_${key}`, series[index] ?? 50];
      }),
    );

    return {
      timestamp: timestamps[index],
      raw: item.features,
      ...normalized,
    };
  });

  return (
    <div className="mb-6">

      <div className="mb-2 flex items-center justify-between gap-3">
        <div>
          <h5 className="text-sm font-medium text-slate-100">Unified forecast overview</h5>
          <p className="text-xs text-slate-500">Each line is normalized independently to its own forecast range.</p>
        </div>
        <div className="rounded-full border border-cyan-400/15 bg-cyan-400/10 px-3 py-1 text-[11px] text-cyan-100">
          0% = that feature&apos;s lowest forecast value, 100% = its highest
        </div>
      </div>
      <div className="mb-3 text-[11px] text-slate-500">Red dots mark forecast points the anomaly detector flagged as unusual.</div>

      <div className="overflow-x-auto rounded-2xl border border-white/10 bg-slate-950/80">
        <div style={{ width: `${chartWidth}px`, height: 320 }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 16, right: 24, left: 8, bottom: 16 }}>
              <CartesianGrid stroke="#21343A" strokeDasharray="3 3" opacity={0.4} />
              <XAxis
                dataKey="timestamp"
                tickFormatter={(value) => {
                  const date = parseISO(String(value));
                  return Number.isNaN(date.getTime()) ? String(value) : format(date, "MMM d HH:mm");
                }}
                angle={-35}
                textAnchor="end"
                height={72}
                minTickGap={24}
                tick={{ fontSize: 12, fill: "#94A3B8" }}
              />
              <YAxis
                domain={[0, 100]}
                width={52}
                tick={{ fontSize: 11, fill: "#94A3B8" }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => `${value}%`}
              />
              <Tooltip content={<ForecastTooltip />} />
              {featureKeys.map((key, index) => {
                const isVisible = visibleFeatures[key] !== false;

                return (
                  <Line
                    key={key}
                    type="monotone"
                    dataKey={`display_${key}`}
                    stroke={palette[index % palette.length] ?? defaultColor}
                    strokeWidth={3}
                    strokeOpacity={isVisible ? 1 : 0}
                    fillOpacity={isVisible ? 1 : 0}
                    opacity={isVisible ? 1 : 0}
                    style={{
                      transition: "opacity 350ms ease, stroke-opacity 350ms ease",
                      pointerEvents: isVisible ? "auto" : "none",
                    }}
                    dot={(dotProps: ForecastDotProps) => {
                      if (!isVisible || !dotProps.payload?.is_anomaly || dotProps.cx === undefined || dotProps.cy === undefined) {
                        return false;
                      }

                      return (
                        <circle
                          key={`anomaly-${key}-${dotProps.cx}`}
                          cx={dotProps.cx}
                          cy={dotProps.cy}
                          r={5}
                          fill="#ef4444"
                          stroke="#fff"
                          strokeWidth={2}
                        />
                      );
                    }}
                    activeDot={isVisible ? { r: 6 } : false}
                  />
                );
              })}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Individual Feature Sparklines */}
      <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {featureKeys.map((key, index) => {
          if (visibleFeatures[key] === false) return null;

          const values = preds.map((p) => Number(p.features?.[key] ?? 0));
          return (
            <FeatureSparkline
              key={key}
              featureKey={key}
              color={palette[index % palette.length] ?? defaultColor}
              values={values}
              timestamps={timestamps}
            />
          );
        })}
      </div>
    </div>
  );
}

export function ForecastResults({ results }: { results: ForecastResultsData }) {
  const preds = results?.predictions ?? [];
  const featureKeys = preds[0] ? Object.keys(preds[0].features) : [];
  const [visibleFeatures, setVisibleFeatures] = useState<Record<string, boolean>>(
    Object.fromEntries(featureKeys.map((key) => [key, true])),
  );

  const timestamps = preds.map((item) => item.timestamp);
  const activeFeatureKeys = featureKeys.filter((key) => visibleFeatures[key]);

  const formatRowTimestamp = (value: string) => {
    const date = parseISO(value);
    if (Number.isNaN(date.getTime())) {
      return value;
    }
    return format(date, "EEE, MMM d, h:mm a");
  };

  function downloadCsv() {
    const headers = ["timestamp", ...featureKeys];
    const rows: string[][] = preds.map((item) => [
      item.timestamp,
      ...featureKeys.map((key) => String(item.features?.[key] ?? "")),
    ]);
    const csv = [headers.join(","), ...rows.map((row) => row.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "forecast.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  function toggleFeature(key: string) {
    setVisibleFeatures((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  }

  function toggleAllFeatures(show: boolean) {
    setVisibleFeatures(Object.fromEntries(featureKeys.map((key) => [key, show])));
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-slate-950/80 p-4">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h4 className="text-sm font-medium text-slate-200">Forecast Results</h4>
          <p className="text-xs text-slate-500">
            Horizon: {results?.period ?? "n/a"} · Cadence: {results?.detail_cadence ?? "n/a"} · Points: {preds.length}
          </p>
        </div>
        <button
          onClick={downloadCsv}
          className="rounded-lg border border-white/10 bg-white/5 px-3 py-1 text-sm text-white transition hover:bg-white/10"
        >
          Download CSV
        </button>
      </div>

      <div className="mb-3">
        <div className="mb-2 flex items-center justify-between">
          <p className="text-xs text-slate-400">Each feature uses its own raw scale, so small bends stay visible without flattening the values.</p>
          <div className="flex gap-2">
            <button
              onClick={() => toggleAllFeatures(true)}
              className="rounded-lg border border-emerald-400/20 bg-emerald-400/10 px-2 py-1 text-xs text-emerald-200 transition hover:bg-emerald-400/15"
            >
              Show All
            </button>
            <button
              onClick={() => toggleAllFeatures(false)}
              className="rounded-lg border border-rose-400/20 bg-rose-400/10 px-2 py-1 text-xs text-rose-200 transition hover:bg-rose-400/15"
            >
              Hide All
            </button>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 text-[11px] text-slate-300">
          {featureKeys.map((key: string, index: number) => (
            <button
              key={key}
              onClick={() => toggleFeature(key)}
              className={`inline-flex items-center gap-2 rounded-full border px-2 py-1 cursor-pointer transition ${
                visibleFeatures[key]
                  ? "border-white/10 bg-white/5 hover:bg-white/10"
                  : "border-white/10 bg-white/0 opacity-50 hover:opacity-75"
              }`}
            >
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: palette[index % palette.length] }} />
              {formatFeatureLabel(key)}
            </button>
          ))}
        </div>
      </div>

      <div className="mb-4">
        {activeFeatureKeys.length > 0 ? (
          <UnifiedForecastChart
            featureKeys={activeFeatureKeys}
            preds={preds}
            timestamps={timestamps}
            visibleFeatures={visibleFeatures}
          />
        ) : (
          <div className="mb-6 rounded-2xl border border-white/10 bg-slate-950/80 p-4 text-sm text-slate-400">
            No features are selected, so the unified graph is hidden.
          </div>
        )}

        <p className="mb-2 text-xs text-slate-400">Toggle features to focus on the ones you care about most.</p>
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          {featureKeys.map((key: string, index: number) =>
            visibleFeatures[key] ? (
              <FeatureSparkline
                key={key}
                featureKey={key}
                color={palette[index % palette.length] ?? defaultColor}
                values={preds.map((item) => Number(item.features?.[key] ?? 0))}
                timestamps={timestamps}
              />
            ) : null,
          )}
        </div>
      </div>

      <div className="max-h-72 overflow-auto pt-1">
        {preds.length === 0 && <div className="text-sm text-slate-500">No forecast data</div>}
        {preds.map((item, index) => (
          <div key={index} className="border-b border-white/10 px-2 py-3 text-sm last:border-b-0">
            <div className="mb-1 text-slate-200">{formatRowTimestamp(item.timestamp)}</div>
            <div className="grid grid-cols-1 gap-x-6 gap-y-1 text-xs text-slate-400 sm:grid-cols-2">
              {featureKeys.map((key: string) => (
                <div key={key} className="flex items-center justify-between gap-2">
                  <span>{formatFeatureLabel(key)}</span>
                  <span className="font-mono text-slate-200">{Number(item.features?.[key]).toFixed(3)}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}