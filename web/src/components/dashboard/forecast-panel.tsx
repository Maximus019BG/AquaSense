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
    change > 0 ? "text-green-400" : change < 0 ? "text-red-400" : "text-gray-400";

  return (
    <div className="flex items-center justify-between py-3 border-b border-[#334155] last:border-0">
      <div>
        <p className="text-sm text-gray-300">{item.parameter}</p>
        <p className="text-xs text-gray-500">Confidence: {item.confidence}%</p>
      </div>

      <div className="text-right">
        <p className="text-sm font-mono text-white">
          {item.predicted.toFixed(1)}
          {item.unit}
        </p>
        <div className={cn("flex items-center gap-1 text-xs", trendColor)}>
          <TrendIcon className="w-3 h-3" />
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
    <div className="p-5 bg-[#132F4C] border border-[#334155] rounded-xl">
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <div className="p-1.5 bg-purple-500/20 rounded">
          <Brain className="w-4 h-4 text-purple-400" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-white">24h Forecast</h3>
          <p className="text-xs text-gray-500">AI-Powered LSTM Model</p>
        </div>
      </div>

      {/* Forecast List */}
      <div className="space-y-1 mb-4">
        {forecasts.map((item) => (
          <ForecastRow key={item.parameter} item={item} />
        ))}
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <button className="flex-1 px-3 py-2 text-xs border border-[#334155] rounded hover:bg-white/5 transition-colors">
          View Report
        </button>
        <button className="flex-1 px-3 py-2 text-xs border border-[#334155] rounded hover:bg-white/5 transition-colors">
          Export
        </button>
      </div>
    </div>
  );
}
