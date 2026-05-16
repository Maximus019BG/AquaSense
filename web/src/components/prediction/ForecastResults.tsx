"use client";

import React, { useRef, useState } from "react";
import { format, parseISO } from "date-fns";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

const palette = ["#00BCD4", "#6EE7B7", "#F59E0B", "#F472B6", "#60A5FA", "#A78BFA", "#F87171"];

function ForecastTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) {
    return null;
  }

  const readableLabel = typeof label === "string" ? format(new Date(label), "MMM d, yyyy h:mm a") : String(label);

  return (
    <div className="rounded-xl border border-white/10 bg-slate-950/95 px-3 py-2 text-xs text-slate-100 shadow-xl backdrop-blur-xl">
      <div className="mb-2 font-semibold text-white">{readableLabel}</div>
      <div className="grid gap-1">
        {payload.map((entry: any) => (
          <div key={entry.dataKey} className="flex items-center justify-between gap-4">
            <span style={{ color: entry.color }}>{entry.dataKey}</span>
            <span className="font-mono text-white">{Number(entry.value).toFixed(3)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function ForecastResults({ results }: { results: any }) {
  const preds = results?.predictions ?? [];
  const featureKeys = preds[0]?.features ? Object.keys(preds[0].features) : [];
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  
  // Initialize all features as visible
  const [visibleFeatures, setVisibleFeatures] = useState<Record<string, boolean>>(
    Object.fromEntries(featureKeys.map((key) => [key, true]))
  );

  const chartData = preds.map((item: any) => ({
    timestamp: item.timestamp,
    ...item.features,
  }));

  const formatTick = (value: string) => {
    const date = parseISO(value);
    if (Number.isNaN(date.getTime())) {
      return value;
    }
    return format(date, "MMM d HH:mm");
  };

  const formatRowTimestamp = (value: string) => {
    const date = parseISO(value);
    if (Number.isNaN(date.getTime())) {
      return value;
    }
    return format(date, "EEE, MMM d, h:mm a");
  };

  // Calculate zoom level based on number of data points
  // For better visibility, allocate ~60px per data point to keep points very close
  const chartWidth = Math.max(1200, preds.length * 60);

  function downloadCsv() {
    const headers = ["timestamp", ...featureKeys];
    const rows = preds.map((item: any) => [
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
      <div className="flex items-center justify-between mb-3">
        <div>
          <h4 className="text-sm font-medium text-slate-200">Forecast Results</h4>
          <p className="text-xs text-slate-500">
            Horizon: {results?.period ?? "n/a"} · Cadence: {results?.detail_cadence ?? "n/a"} · Points: {preds.length}
          </p>
        </div>
        <button onClick={downloadCsv} className="rounded-lg border border-white/10 bg-white/5 px-3 py-1 text-sm text-white transition hover:bg-white/10">
          Download CSV
        </button>
      </div>

      <div className="mb-3">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs text-slate-400">Click features to show or hide them from the chart:</p>
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
              <span
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: palette[index % palette.length] }}
              />
              {key}
            </button>
          ))}
        </div>
      </div>

      <div className="mb-4">
        <p className="mb-2 text-xs text-slate-400">Scroll horizontally to view the complete forecast curve.</p>
        <div 
          ref={scrollContainerRef}
          className="mb-4 h-80 overflow-x-auto overflow-y-hidden rounded-xl border border-white/10"
          style={{ scrollBehavior: 'smooth' }}
        >
          <div style={{ width: `${chartWidth}px`, height: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 10 }}>
                <CartesianGrid stroke="#21343A" strokeDasharray="3 3" opacity={0.4} />
                <XAxis 
                  dataKey="timestamp" 
                  tickFormatter={formatTick}
                  angle={-35}
                  textAnchor="end"
                  height={78}
                  minTickGap={28}
                  tick={{ fontSize: 12, fill: "#9fb3c8" }}
                />
                <YAxis width={68} tick={{ fontSize: 12, fill: "#9fb3c8" }} />
                <Tooltip content={<ForecastTooltip />} />
                {featureKeys.map((key: string, index: number) =>
                  visibleFeatures[key] ? (
                    <Line
                      key={key}
                      type="basis"
                      dataKey={key}
                      stroke={palette[index % palette.length]}
                      dot={false}
                      activeDot={{ r: 5 }}
                      strokeWidth={3}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  ) : null
                )}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="max-h-72 overflow-auto pt-1">
        {preds.length === 0 && <div className="text-sm text-slate-500">No forecast data</div>}
        {preds.map((item: any, index: number) => (
          <div key={index} className="text-sm px-2 py-3 border-b border-white/10 last:border-b-0">
            <div className="mb-1 text-slate-200">{formatRowTimestamp(item.timestamp)}</div>
            <div className="grid grid-cols-1 gap-x-6 gap-y-1 text-xs text-slate-400 sm:grid-cols-2">
              {featureKeys.map((key: string) => (
                <div key={key} className="flex items-center justify-between gap-2">
                  <span>{key}</span>
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