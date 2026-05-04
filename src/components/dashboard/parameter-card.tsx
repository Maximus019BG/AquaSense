"use client";

import { cn } from "~/lib/utils";
import type { LucideIcon } from "lucide-react";

interface ParameterCardProps {
  title: string;
  value: number;
  unit: string;
  status: "normal" | "warning" | "critical";
  range: { min: number; max: number };
  trend: number;
  icon: LucideIcon;
  color: string;
}

export function ParameterCard({
  title,
  value,
  unit,
  status,
  range,
  trend,
  icon: Icon,
  color,
}: ParameterCardProps) {
  const statusColors = {
    normal: "bg-green-500",
    warning: "bg-yellow-500",
    critical: "bg-red-500",
  };

  return (
    <div className="p-5 bg-[#132F4C] border border-[#334155] rounded-xl hover:scale-[1.02] transition-transform duration-200">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div
            className="p-2 rounded-lg"
            style={{ backgroundColor: `${color}20` }}
          >
            <Icon className="w-5 h-5" style={{ color }} />
          </div>
          <span className="text-sm font-medium text-gray-300">{title}</span>
        </div>
        <div className={cn("w-2.5 h-2.5 rounded-full", statusColors[status])} />
      </div>

      {/* Value */}
      <div className="mb-3">
        <span className="text-3xl font-bold font-mono text-white">
          {value.toFixed(1)}
        </span>
        <span className="text-lg text-gray-400 ml-1">{unit}</span>
      </div>

      {/* Range & Trend */}
      <div className="space-y-1">
        <p className="text-xs text-gray-500">
          Normal range: {range.min}-{range.max}{unit}
        </p>
        <p
          className={cn(
            "text-xs font-medium",
            trend > 0 ? "text-green-400" : trend < 0 ? "text-red-400" : "text-gray-400"
          )}
        >
          {trend > 0 ? "↑" : trend < 0 ? "↓" : "→"} {Math.abs(trend).toFixed(1)}
          {unit} from avg
        </p>
      </div>
    </div>
  );
}
