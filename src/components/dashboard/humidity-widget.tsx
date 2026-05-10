"use client";

import { useMemo } from "react";
import { Droplets } from "lucide-react";

interface HumidityWidgetProps {
  humidity: number;
  temperature?: number;
}

function polarToCartesian(cx: number, cy: number, r: number, deg: number) {
  const rad = (deg * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function arcPath(cx: number, cy: number, r: number, startDeg: number, endDeg: number) {
  const s = polarToCartesian(cx, cy, r, startDeg);
  const e = polarToCartesian(cx, cy, r, endDeg);
  const large = Math.abs(endDeg - startDeg) > 180 ? 1 : 0;
  return `M ${s.x.toFixed(2)} ${s.y.toFixed(2)} A ${r} ${r} 0 ${large} 1 ${e.x.toFixed(2)} ${e.y.toFixed(2)}`;
}

function comfortZone(h: number) {
  if (h < 30) return { label: "DRY",       color: "#f97316" };
  if (h <= 60) return { label: "OPTIMAL",   color: "#4ade80" };
  if (h <= 75) return { label: "HUMID",     color: "#facc15" };
  return         { label: "VERY HUMID", color: "#f87171" };
}

export function HumidityWidget({ humidity, temperature = 24.5 }: HumidityWidgetProps) {
  const cx = 80, cy = 82, r = 56;
  const START = 135, ARC = 270;
  const h = Math.max(0.5, Math.min(100, humidity));
  const fillEnd = START + (h / 100) * ARC;
  const comfort = comfortZone(h);
  const dewPoint = +(temperature - (100 - h) / 5).toFixed(1);
  const minToday = +(h - 8 - Math.abs(Math.sin(h)) * 3).toFixed(1);
  const maxToday = +(h + 6 + Math.abs(Math.cos(h)) * 2).toFixed(1);
  const tipPt = polarToCartesian(cx, cy, r, fillEnd);

  const ticks = useMemo(() =>
    [0, 25, 50, 75, 100].map((v) => {
      const deg = START + (v / 100) * ARC;
      return {
        inner: polarToCartesian(cx, cy, r - 9, deg),
        outer: polarToCartesian(cx, cy, r - 1, deg),
        lbl:   polarToCartesian(cx, cy, r - 18, deg),
        v,
      };
    }), []
  );

  return (
    <div className="p-4 rounded-xl border border-cyan-500/20 bg-[#091a2e] relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse at 50% -10%, rgba(6,182,212,0.07) 0%, transparent 65%)" }} />

      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-cyan-500/10" style={{ boxShadow: "0 0 10px rgba(6,182,212,0.2)" }}>
            <Droplets className="w-3.5 h-3.5 text-cyan-400" />
          </div>
          <div>
            <p className="text-[10px] font-bold tracking-[0.15em] text-gray-400 uppercase">Atmospheric Humidity</p>
            <p className="text-[9px] text-gray-600 font-mono">Surface Station · Live</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-[9px] font-bold tracking-[0.1em] animate-pulse" style={{ color: comfort.color }}>{comfort.label}</p>
          <div className="flex justify-end mt-0.5">
            <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: comfort.color, boxShadow: `0 0 5px ${comfort.color}` }} />
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/* Gauge */}
        <svg width="160" height="160" viewBox="0 0 160 164" className="flex-shrink-0 -mt-1">
          <defs>
            <linearGradient id="hgGrad" gradientUnits="userSpaceOnUse" x1="20" y1="150" x2="140" y2="20">
              <stop offset="0%" stopColor="#0ea5e9" />
              <stop offset="100%" stopColor="#22d3ee" />
            </linearGradient>
          </defs>
          {/* Track */}
          <path d={arcPath(cx, cy, r, START, START + ARC)} fill="none" stroke="#1e3a5f" strokeWidth="9" strokeLinecap="round" />
          {/* Glow layer */}
          <path d={arcPath(cx, cy, r, START, fillEnd)} fill="none" stroke="url(#hgGrad)" strokeWidth="16" strokeLinecap="round" opacity="0.18" />
          {/* Fill */}
          <path d={arcPath(cx, cy, r, START, fillEnd)} fill="none" stroke="url(#hgGrad)" strokeWidth="8" strokeLinecap="round" />
          {/* Tip dot */}
          <circle cx={tipPt.x} cy={tipPt.y} r="5.5" fill="#06b6d4" style={{ filter: "drop-shadow(0 0 6px #06b6d4)" }} />
          {/* Ticks */}
          {ticks.map((t) => (
            <g key={t.v}>
              <line x1={t.inner.x} y1={t.inner.y} x2={t.outer.x} y2={t.outer.y} stroke="#334155" strokeWidth="1.5" />
              <text x={t.lbl.x} y={t.lbl.y} textAnchor="middle" dominantBaseline="middle" fill="#475569" fontSize="7" fontFamily="monospace">{t.v}</text>
            </g>
          ))}
          {/* Value */}
          <text x={cx} y={cy - 10} textAnchor="middle" fill="white" fontSize="30" fontWeight="700" fontFamily="monospace" style={{ filter: "drop-shadow(0 0 12px rgba(6,182,212,0.5))" }}>
            {h.toFixed(0)}
          </text>
          <text x={cx} y={cy + 18} textAnchor="middle" fill="#06b6d4" fontSize="12" fontWeight="600" fontFamily="monospace">% RH</text>
        </svg>

        {/* Stats */}
        <div className="flex-1 space-y-2">
          <div className="p-2.5 rounded-lg bg-[#0d2137] border border-[#1e3a5f]">
            <p className="text-[8px] text-gray-600 font-mono uppercase tracking-widest mb-0.5">Dew Point</p>
            <p className="text-lg font-bold font-mono text-white">{dewPoint}<span className="text-xs text-gray-500 ml-0.5">°C</span></p>
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            <div className="p-2 rounded-lg bg-[#0d2137] border border-[#1e3a5f]">
              <p className="text-[8px] text-gray-600 font-mono uppercase tracking-widest">24h Min</p>
              <p className="text-sm font-bold font-mono text-sky-400">{minToday}%</p>
            </div>
            <div className="p-2 rounded-lg bg-[#0d2137] border border-[#1e3a5f]">
              <p className="text-[8px] text-gray-600 font-mono uppercase tracking-widest">24h Max</p>
              <p className="text-sm font-bold font-mono text-sky-400">{maxToday}%</p>
            </div>
          </div>
          {/* Comfort bar */}
          <div className="p-2 rounded-lg bg-[#0d2137] border border-[#1e3a5f]">
            <p className="text-[8px] text-gray-600 font-mono uppercase tracking-widest mb-1.5">Comfort Index</p>
            <div className="relative h-2 rounded-full overflow-hidden" style={{ background: "linear-gradient(to right, #f97316 0%, #4ade80 35%, #4ade80 60%, #facc15 80%, #f87171 100%)" }}>
              <div
                className="absolute top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full bg-white border border-gray-300 transition-all duration-500"
                style={{ left: `calc(${Math.min(98, Math.max(2, h))}% - 5px)`, boxShadow: "0 0 6px rgba(255,255,255,0.9)" }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
