"use client";

import { Brain, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { cn } from "~/lib/utils";

interface ForecastItem {
  parameter: string;
  current: number;
  predicted: number;
  unit: string;
  confidence: number;
}

const forecasts: ForecastItem[] = [
  {
    parameter: "Temperature",
    current: 24.5,
    predicted: 26.8,
    unit: "°C",
    confidence: 94,
  },
  {
    parameter: "pH Level",
    current: 7.2,
    predicted: 7.1,
    unit: "",
    confidence: 91,
  },
  {
    parameter: "Turbidity",
    current: 15.3,
    predicted: 14.8,
    unit: "NTU",
    confidence: 88,
  },
];

function ForecastRow({ item }: { item: ForecastItem }) {
  const change = item.predicted - item.current;
  const changePercent = ((change / item.current) * 100).toFixed(1);

  const TrendIcon =
    change > 0 ? TrendingUp : change < 0 ? TrendingDown : Minus;
  const trendColor =
    change > 0 ? "text-emerald-300" : change < 0 ? "text-rose-300" : "text-slate-400";

  return (
    <div className="flex items-center justify-between border-b border-white/10 py-3 last:border-0">
      <div>
        <p className="text-sm text-slate-200">{item.parameter}</p>
        <p className="text-xs text-slate-500">Confidence: {item.confidence}%</p>
      </div>

      <div className="text-right">
        <p className="font-mono text-sm text-white">
          {item.predicted.toFixed(1)}
          {item.unit}
        </p>
        <div className={cn("flex items-center gap-1 text-xs", trendColor)}>
          <TrendIcon className="h-3 w-3" />
          <span>
            {change > 0 ? "+" : ""}
            {changePercent}%
          </span>
        </div>
      </div>
    </div>
  );
}

export function ForecastPanel() {
  return (
    <div className="rounded-2xl border border-white/10 bg-slate-950/80 p-5 shadow-[0_18px_50px_rgba(0,0,0,0.28)]">
      <div className="mb-4 flex items-center gap-2">
        <div className="rounded-lg bg-cyan-400/10 p-1.5">
          <Brain className="h-4 w-4 text-cyan-300" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-white">24h Forecast</h3>
          <p className="text-xs text-slate-500">AI-powered LSTM model</p>
        </div>
      </div>

      <div className="space-y-1 mb-4">
        {forecasts.map((item) => (
          <ForecastRow key={item.parameter} item={item} />
        ))}
      </div>

      <div className="flex gap-2">
        <button className="flex-1 rounded-xl border border-white/10 px-3 py-2 text-xs text-slate-200 transition-colors hover:border-cyan-400/30 hover:bg-white/5">
          View Report
        </button>
        <button className="flex-1 rounded-xl border border-white/10 px-3 py-2 text-xs text-slate-200 transition-colors hover:border-emerald-400/30 hover:bg-white/5">
          Export
        </button>
      </div>
    </div>
  );
}
