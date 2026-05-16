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
    <div className="rounded-2xl border border-white/10 bg-slate-950/80 p-5 transition-transform duration-200 hover:-translate-y-0.5 hover:border-emerald-400/20 hover:shadow-[0_18px_50px_rgba(0,0,0,0.35)]">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className="rounded-xl p-2"
            style={{ backgroundColor: `${color}18` }}
          >
            <Icon className="h-5 w-5" style={{ color }} />
          </div>
          <span className="text-sm font-medium text-slate-300">{title}</span>
        </div>
        <div className={cn("h-2.5 w-2.5 rounded-full shadow-[0_0_16px_currentColor]", statusColors[status])} />
      </div>

      <div className="mb-3">
        <span className="font-mono text-3xl font-bold text-white">
          {value.toFixed(1)}
        </span>
        <span className="ml-1 text-lg text-slate-400">{unit}</span>
      </div>

      <div className="space-y-1">
        <p className="text-xs text-slate-500">
          Normal range: {range.min}-{range.max}{unit}
        </p>
        <p
          className={cn(
            "text-xs font-medium",
            trend > 0 ? "text-emerald-300" : trend < 0 ? "text-rose-300" : "text-slate-400"
          )}
        >
          {trend > 0 ? "↑" : trend < 0 ? "↓" : "→"} {Math.abs(trend).toFixed(1)}
          {unit} from avg
        </p>
      </div>
    </div>
  );
}
