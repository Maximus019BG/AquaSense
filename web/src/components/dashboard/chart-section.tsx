"use client";

import { useEffect, useMemo, useState } from "react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { cn } from "~/lib/utils";

type TimeRange = "1H" | "6H" | "24H" | "7D";
const TIME_RANGES: TimeRange[] = ["1H", "6H", "24H", "7D"];

type ReadingPoint = {
  timestamp: string;
  temperature: number;
  ph: number;
  turbidity: number;
  dissolvedOxygen: number;
  waterLevel: number;
};

const PARAMS = [
  { id: "temperature", label: "Temp", color: "#FF6B6B", unit: "°C", min: 20, max: 30 },
  { id: "ph", label: "pH", color: "#4ECDC4", unit: "", min: 6, max: 9 },
  { id: "turbidity", label: "Turb", color: "#FFE66D", unit: "NTU", min: 0, max: 50 },
  { id: "dissolvedOxygen", label: "O₂", color: "#95E1D3", unit: "mg/L", min: 5, max: 12 },
  { id: "waterLevel", label: "Level", color: "#6C5CE7", unit: "cm", min: 200, max: 300 },
];

const PT_COUNTS: Record<TimeRange, number> = { "1H": 12, "6H": 24, "24H": 48, "7D": 84 };

function deterministicData(points: number, min: number, max: number, seed: number) {
  return Array.from({ length: points }, (_, i) => {
    const t = i / points;
    const v = min + (max - min) * (
      0.5
      + 0.25 * Math.sin(i * 0.6 + seed)
      + 0.12 * Math.cos(i * 1.3 + seed * 2.1)
      + 0.08 * Math.sin(i * 2.5 + seed * 0.7)
    );
    const label = points <= 12 ? `${i * 5}m` : points <= 24 ? `${i}h` : points <= 48 ? `${Math.floor(i / 2)}h` : `D${Math.floor(i / 12) + 1}`;
    return { time: label, value: +Math.max(min, Math.min(max, v)).toFixed(2) };
  });
}

function toSafeNumber(value: unknown, fallback = 0): number {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : fallback;
}

function normalizeReadings(data: unknown): ReadingPoint[] {
  if (!Array.isArray(data)) {
    return [];
  }

  return data.map((entry) => {
    const row = entry as Record<string, unknown>;
    return {
      timestamp: String(row.timestamp ?? row.created_at ?? ""),
      temperature: toSafeNumber(row.temperature ?? row.temperature_C),
      ph: toSafeNumber(row.ph),
      turbidity: toSafeNumber(row.turbidity ?? row.turbidity_kd),
      dissolvedOxygen: toSafeNumber(row.dissolvedOxygen ?? row.dissolved_oxygen ?? row.dissolved_o2),
      waterLevel: toSafeNumber(row.waterLevel ?? row.water_level ?? row.sea_level_m),
    };
  });
}

// Mini inline sparkline (pure SVG, no recharts)
function MiniSparkline({ data, color }: { data: { value: number }[]; color: string }) {
  const vals = data.map(d => d.value);
  const lo = Math.min(...vals), hi = Math.max(...vals);
  const span = hi - lo || 1;
  const W = 40, H = 18;
  const pts = vals.map((v, i) => {
    const x = (i / (vals.length - 1)) * W;
    const y = H - ((v - lo) / span) * H;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(" ");
  return (
    <svg width={W} height={H} className="overflow-visible">
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

export function ChartSection() {
  const [activeRange, setActiveRange] = useState<TimeRange>("24H");
  const [activeId, setActiveId] = useState("temperature");
  const [readings, setReadings] = useState<ReadingPoint[]>([]);

  useEffect(() => {
    let mounted = true;

    async function loadReadings() {
      try {
        const response = await fetch("/api/readings?limit=200");
        const data = await response.json();
        if (!mounted || !data?.success) {
          return;
        }

        setReadings(normalizeReadings(data.data));
      } catch (error) {
        if (mounted) {
          setReadings([]);
        }
      }
    }

    loadReadings();
    const interval = setInterval(loadReadings, 15000);

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  const active = PARAMS.find(p => p.id === activeId) ?? PARAMS[0]!;
  const pts = PT_COUNTS[activeRange];

  const mainData = useMemo(
    () => {
      const series = readings.map((point) => ({
        time: new Date(point.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        value: toSafeNumber(point[active.id as keyof ReadingPoint], 0),
      }));

      const windowed = series.slice(-pts);
      return windowed.length > 0 ? windowed : deterministicData(pts, active.min, active.max, active.id.charCodeAt(0) * 0.13);
    },
    [pts, activeId, readings]
  );

  const overviewData = useMemo(
    () => PARAMS.map((param) => ({
      ...param,
      data: readings.length
        ? readings.slice(-16).map((point) => ({
            value: toSafeNumber(point[param.id as keyof ReadingPoint], 0),
          }))
        : deterministicData(16, param.min, param.max, param.id.charCodeAt(0) * 0.13),
    })),
    [readings]
  );

  const lastVal = mainData[mainData.length - 1]?.value ?? 0;

  return (
    <div className="p-5 rounded-xl border border-[#1e3a5f] bg-[#091a2e]">
      {/* Header row */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-1 flex-wrap">
          {PARAMS.map(p => (
            <button
              key={p.id}
              onClick={() => setActiveId(p.id)}
              className="px-2.5 py-1 text-[10px] font-bold tracking-wider rounded-md transition-all duration-150"
              style={
                activeId === p.id
                  ? { backgroundColor: `${p.color}20`, color: p.color, border: `1px solid ${p.color}40`, boxShadow: `0 0 8px ${p.color}20` }
                  : { color: "#475569", border: "1px solid transparent" }
              }
            >
              {p.label}
            </button>
          ))}
        </div>
        <div className="flex gap-1 ml-2">
          {TIME_RANGES.map(r => (
            <button
              key={r}
              onClick={() => setActiveRange(r)}
              className={cn(
                "px-2 py-1 text-[9px] font-bold tracking-wider rounded transition-all",
                activeRange === r ? "bg-[#1e3a5f] text-white" : "text-gray-600 hover:text-gray-400"
              )}
            >{r}</button>
          ))}
        </div>
      </div>

      {/* Featured chart */}
      <div className="mb-1">
        <div className="flex items-baseline gap-2 mb-2">
          <h3 className="text-[10px] font-bold tracking-[0.15em] text-gray-400 uppercase">{active.label}</h3>
          <span className="text-xl font-bold font-mono text-white" style={{ textShadow: `0 0 12px ${active.color}40` }}>
            {lastVal.toFixed(active.unit === "" ? 2 : 1)}
          </span>
          <span className="text-xs text-gray-500 font-mono">{active.unit}</span>
        </div>

        <div className="h-44">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={mainData} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id="cGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor={active.color} stopOpacity={0.22} />
                  <stop offset="95%" stopColor={active.color} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="2 6" stroke="#1e3a5f" vertical={false} />
              <XAxis dataKey="time" tick={{ fill: "#2d4a6a", fontSize: 8 }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
              <YAxis domain={[active.min, active.max]} tick={{ fill: "#2d4a6a", fontSize: 8 }} tickLine={false} axisLine={false} width={32} />
              <Tooltip
                contentStyle={{ backgroundColor: "#0d2137", border: `1px solid ${active.color}30`, borderRadius: "8px", fontSize: "11px", padding: "6px 10px" }}
                labelStyle={{ color: "#64748b", marginBottom: "2px" }}
                itemStyle={{ color: active.color }}
                cursor={{ stroke: active.color, strokeWidth: 1, strokeDasharray: "3 3" }}
              />
              <Area type="monotone" dataKey="value" stroke={active.color} strokeWidth={2}
                fill="url(#cGrad)"
                dot={false}
                activeDot={{ r: 4, fill: active.color, stroke: "#091a2e", strokeWidth: 2 }}
                style={{ filter: `drop-shadow(0 0 3px ${active.color}50)` }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Overview sparkline chips */}
      <div className="grid grid-cols-2 gap-2 pt-3 border-t border-[#1e3a5f] sm:grid-cols-3 xl:grid-cols-6">
        {overviewData.map(p => (
          <button
            key={p.id}
            onClick={() => setActiveId(p.id)}
            className="min-h-[64px] p-2 rounded-lg transition-all duration-150 text-left"
            style={{
              background: activeId === p.id ? `${p.color}12` : "#0d2137",
              border: `1px solid ${activeId === p.id ? p.color + "35" : "#1e3a5f"}`,
            }}
          >
            <p className="text-[8px] text-gray-600 font-mono uppercase mb-1">{p.label}</p>
            <MiniSparkline data={p.data} color={p.color} />
          </button>
        ))}
      </div>
    </div>
  );
}
