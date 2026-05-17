"use client";

import { Brain, TrendingUp, TrendingDown, Minus, Zap } from "lucide-react";
import { cn } from "~/lib/utils";

interface ForecastItem {
  parameter: string;
  current: number;
  predicted: number;
  unit: string;
  confidence: number;
  color: string;
}

const FORECASTS: ForecastItem[] = [
  { parameter: "Temperature", current: 24.5, predicted: 26.8, unit: "°C",   confidence: 94, color: "#FF6B6B" },
  { parameter: "pH Level",    current: 7.2,  predicted: 7.1,  unit: "",     confidence: 91, color: "#4ECDC4" },
  { parameter: "Turbidity",   current: 15.3, predicted: 14.8, unit: "NTU",  confidence: 88, color: "#FFE66D" },
  { parameter: "Humidity",    current: 68,   predicted: 72,   unit: "%",    confidence: 85, color: "#06b6d4" },
];

function ForecastRow({ item }: { item: ForecastItem }) {
  const delta = item.predicted - item.current;
  const pct = ((delta / item.current) * 100).toFixed(1);
  const TrendIcon = delta > 0 ? TrendingUp : delta < 0 ? TrendingDown : Minus;
  const trendColor = delta > 0 ? "#4ade80" : delta < 0 ? "#f87171" : "#64748b";

  return (
    <div className="py-2.5 border-b border-[#1e3a5f] last:border-0">
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: item.color }} />
          <span className="text-[10px] font-semibold text-gray-300">{item.parameter}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] font-mono font-bold text-white">
            {item.predicted.toFixed(item.unit === "" ? 1 : 1)}{item.unit}
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
        {FORECASTS.map(item => <ForecastRow key={item.parameter} item={item} />)}
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
