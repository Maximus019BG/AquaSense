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

const STATUS = {
  normal:   { dot: "#4ade80", label: "OK",   border: "rgba(74,222,128,0.18)",  shadow: "rgba(74,222,128,0.06)" },
  warning:  { dot: "#facc15", label: "WARN", border: "rgba(250,204,21,0.22)",  shadow: "rgba(250,204,21,0.07)" },
  critical: { dot: "#f87171", label: "CRIT", border: "rgba(248,113,113,0.28)", shadow: "rgba(248,113,113,0.09)" },
};

function Sparkline({ color, seed, value }: { color: string; seed: number; value: number }) {
  const pts = Array.from({ length: 18 }, (_, i) => {
    const n = Math.sin(i * 0.9 + seed) * 0.35 + Math.cos(i * 0.4 + seed * 1.7) * 0.2;
    return value + n * (value * 0.05 + 0.5);
  });
  const lo = Math.min(...pts), hi = Math.max(...pts);
  const span = hi - lo || 1;
  const W = 56, H = 22;
  const d = pts.map((v, i) => {
    const x = (i / (pts.length - 1)) * W;
    const y = H - ((v - lo) / span) * H;
    return `${i === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`;
  }).join(" ");

  return (
    <svg width={W} height={H} className="overflow-visible opacity-75">
      <defs>
        <linearGradient id={`spk-${seed.toFixed(0)}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.25" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={`${d} V ${H} H 0 Z`} fill={`url(#spk-${seed.toFixed(0)})`} />
      <path d={d} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

export function ParameterCard({ title, value, unit, status, range, trend, icon: Icon, color }: ParameterCardProps) {
  const cfg = STATUS[status];
  const pct = Math.max(0, Math.min(1, (value - range.min) / (range.max - range.min)));
  const seed = title.charCodeAt(0) * 0.17 + (title.charCodeAt(2) ?? 3) * 0.09;

  return (
    <div
      className="relative p-4 rounded-xl transition-all duration-200 hover:-translate-y-px cursor-default"
      style={{ background: "#091a2e", border: `1px solid ${cfg.border}`, boxShadow: `0 0 18px ${cfg.shadow}, inset 0 1px 0 rgba(255,255,255,0.03)` }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-2.5">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg" style={{ backgroundColor: `${color}14`, boxShadow: `0 0 8px ${color}20` }}>
            <Icon className="w-3.5 h-3.5" style={{ color }} />
          </div>
          <span className="text-[10px] font-semibold tracking-[0.1em] text-gray-400 uppercase">{title}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-[8px] font-bold tracking-widest" style={{ color: cfg.dot }}>{cfg.label}</span>
          <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: cfg.dot, boxShadow: `0 0 4px ${cfg.dot}` }} />
        </div>
      </div>

      {/* Value + sparkline */}
      <div className="flex items-end justify-between mb-3">
        <div className="flex items-baseline gap-0.5">
          <span className="text-[26px] font-bold font-mono text-white leading-none" style={{ textShadow: `0 0 12px ${color}35` }}>
            {value.toFixed(unit === "" ? 2 : 1)}
          </span>
          <span className="text-xs text-gray-500 font-mono pb-0.5">{unit}</span>
        </div>
        <Sparkline color={color} seed={seed} value={value} />
      </div>

      {/* Range bar */}
      <div className="space-y-1">
        <div className="relative h-[3px] rounded-full" style={{ background: "#1e3a5f" }}>
          <div
            className="absolute h-full rounded-full transition-all duration-500"
            style={{ width: `${pct * 100}%`, background: `linear-gradient(to right, ${color}70, ${color})`, boxShadow: `0 0 5px ${color}50` }}
          />
          <div
            className="absolute top-1/2 w-[7px] h-[7px] rounded-full -translate-y-1/2 transition-all duration-500"
            style={{ left: `calc(${pct * 100}% - 3.5px)`, backgroundColor: color, border: "2px solid #091a2e", boxShadow: `0 0 5px ${color}` }}
          />
        </div>
        <div className="flex justify-between items-center">
          <span className="text-[8px] font-mono text-gray-700">{range.min}{unit}</span>
          <span className={cn("text-[10px] font-mono font-semibold", trend > 0 ? "text-emerald-400" : trend < 0 ? "text-rose-400" : "text-gray-500")}>
            {trend > 0 ? "▲" : trend < 0 ? "▼" : "─"} {Math.abs(trend).toFixed(1)}{unit}
          </span>
          <span className="text-[8px] font-mono text-gray-700">{range.max}{unit}</span>
        </div>
      </div>
    </div>
  );
}
