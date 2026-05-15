"use client";

import React, { useRef, useState } from "react";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

const palette = ["#00BCD4", "#6EE7B7", "#F59E0B", "#F472B6", "#60A5FA", "#A78BFA", "#F87171"];

function ForecastTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) {
    return null;
  }

  return (
    <div className="rounded border border-[#334155] bg-[#132F4C] px-3 py-2 text-xs text-gray-100 shadow-lg">
      <div className="mb-2 font-semibold text-white">{label}</div>
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
    <div className="p-4 bg-[#071822] border border-[#233741] rounded-xl">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h4 className="text-sm font-medium text-gray-200">Forecast Results</h4>
          <p className="text-xs text-gray-500">
            Horizon: {results?.period ?? "n/a"} · Cadence: {results?.detail_cadence ?? "n/a"} · Points: {preds.length}
          </p>
        </div>
        <button onClick={downloadCsv} className="px-3 py-1 bg-[#334155] text-white rounded text-sm">
          Download CSV
        </button>
      </div>

      <div className="mb-3">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs text-gray-400">Click features to show/hide them from the chart:</p>
          <div className="flex gap-2">
            <button
              onClick={() => toggleAllFeatures(true)}
              className="text-xs px-2 py-1 bg-[#1a4d4d] text-green-300 rounded hover:bg-[#2a5d5d] transition"
            >
              Show All
            </button>
            <button
              onClick={() => toggleAllFeatures(false)}
              className="text-xs px-2 py-1 bg-[#4d1a1a] text-red-300 rounded hover:bg-[#5d2a2a] transition"
            >
              Hide All
            </button>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 text-[11px] text-gray-300">
          {featureKeys.map((key: string, index: number) => (
            <button
              key={key}
              onClick={() => toggleFeature(key)}
              className={`inline-flex items-center gap-2 rounded-full border px-2 py-1 cursor-pointer transition ${
                visibleFeatures[key]
                  ? "border-[#233741] bg-[#162C33] hover:bg-[#1a3a42]"
                  : "border-[#334155] bg-[#0a1b1f] opacity-50 hover:opacity-75"
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
        <p className="text-xs text-gray-400 mb-2">📊 Scroll horizontally to view the complete forecast curve</p>
        <div 
          ref={scrollContainerRef}
          className="h-72 mb-4 border border-[#233741] rounded overflow-x-auto overflow-y-hidden"
          style={{ scrollBehavior: 'smooth' }}
        >
          <div style={{ width: `${chartWidth}px`, height: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
                <CartesianGrid stroke="#21343A" strokeDasharray="0" />
                <XAxis 
                  dataKey="timestamp" 
                  angle={-45}
                  textAnchor="end"
                  height={80}
                  tick={{ fontSize: 12 }}
                />
                <YAxis width={60} tick={{ fontSize: 12 }} />
                <Tooltip content={<ForecastTooltip />} />
                {featureKeys.map((key: string, index: number) =>
                  visibleFeatures[key] ? (
                    <Line
                      key={key}
                      type="monotone"
                      dataKey={key}
                      stroke={palette[index % palette.length]}
                      dot={{ r: 2 }}
                      activeDot={{ r: 6 }}
                      strokeWidth={2.5}
                    />
                  ) : null
                )}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="max-h-72 overflow-auto pt-1">
        {preds.length === 0 && <div className="text-gray-500 text-sm">No forecast data</div>}
        {preds.map((item: any, index: number) => (
          <div key={index} className="text-sm px-2 py-3 border-b border-[#162C33] last:border-b-0">
            <div className="text-gray-200 mb-1">{item.timestamp}</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1 text-xs text-gray-400">
              {featureKeys.map((key: string) => (
                <div key={key} className="flex items-center justify-between gap-2">
                  <span>{key}</span>
                  <span className="font-mono text-gray-200">{Number(item.features?.[key]).toFixed(3)}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}