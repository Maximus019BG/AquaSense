"use client";

import React from "react";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";

export function PredictionResults({ results }: { results: any }) {
  const preds = results?.predictions ?? [];

  // prepare chart data
  const chartData = preds.map((p: any) => ({
    timestamp: p.timestamp,
    score: p.score,
    is_anomaly: p.is_anomaly ? 1 : 0,
  }));

  function downloadCsv() {
    const headers = ["timestamp", "is_anomaly", "score"];
    const rows = preds.map((p: any) => [p.timestamp, p.is_anomaly ? "1" : "0", String(p.score)]);
    const csv = [headers.join(","), ...rows.map((r: any) => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "predictions.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="p-4 bg-[#071822] border border-[#233741] rounded-xl">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-medium text-gray-200">Prediction Results</h4>
        <div className="flex gap-2">
          <button onClick={downloadCsv} className="px-3 py-1 bg-[#334155] text-white rounded text-sm">Download CSV</button>
        </div>
      </div>

      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData}>
            <CartesianGrid stroke="#21343A" />
            <XAxis dataKey="timestamp" hide />
            <YAxis />
            <Tooltip
              contentStyle={{ backgroundColor: "#132F4C", border: "1px solid #334155" }}
              labelStyle={{ color: "#94A3B8" }}
            />
            <Line type="monotone" dataKey="score" stroke="#00BCD4" dot={false} strokeWidth={2} />
            <Line
              type="monotone"
              dataKey="is_anomaly"
              stroke="#FF6B6B"
              dot={{ r: 3 }}
              strokeWidth={0}
              activeDot={{ r: 5 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-3 max-h-44 overflow-auto">
        {preds.length === 0 && <div className="text-gray-500 text-sm">No predictions</div>}
        {preds.map((p: any, i: number) => (
          <div key={i} className="flex items-center justify-between text-sm px-2 py-1 border-b border-[#162C33]">
            <div>
              <div className="text-gray-200">{p.timestamp}</div>
              <div className="text-gray-400 text-xs">Score: {Number(p.score).toFixed(3)}</div>
            </div>
            <div className={p.is_anomaly ? "text-red-400 font-semibold" : "text-green-300"}>
              {p.is_anomaly ? "Anomaly" : "Normal"}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
