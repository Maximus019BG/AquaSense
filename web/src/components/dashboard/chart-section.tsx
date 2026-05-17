"use client";

import { useState } from "react";
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
} from "recharts";
import { cn } from "~/lib/utils";

const timeRanges = ["1H", "6H", "24H", "7D"] as const;

type TimeRange = (typeof timeRanges)[number];

// Mock data generator
function generateData(points: number, min: number, max: number) {
  return Array.from({ length: points }, (_, i) => ({
    time: `${i}:00`,
    value: min + Math.random() * (max - min),
  }));
}

const chartConfigs = [
  {
    id: "temperature",
    title: "Temperature",
    color: "#FF6B6B",
    unit: "°C",
    min: 20,
    max: 30,
  },
  {
    id: "ph",
    title: "pH Level",
    color: "#4ECDC4",
    unit: "",
    min: 6,
    max: 9,
  },
  {
    id: "turbidity",
    title: "Turbidity",
    color: "#FFE66D",
    unit: "NTU",
    min: 0,
    max: 50,
  },
  {
    id: "oxygen",
    title: "Dissolved O2",
    color: "#95E1D3",
    unit: "mg/L",
    min: 5,
    max: 12,
  },
  {
    id: "salinity",
    title: "Salinity",
    color: "#A78BFA",
    unit: "PSU",
    min: 16,
    max: 22,
  },
  {
    id: "current",
    title: "Current Speed",
    color: "#60A5FA",
    unit: "m/s",
    min: 0,
    max: 0.6,
  },
  {
    id: "level",
    title: "Sea Level",
    color: "#6C5CE7",
    unit: "m",
    min: 0.2,
    max: 0.5,
  },
];

function MiniChart({
  config,
  data,
}: {
  config: (typeof chartConfigs)[0];
  data: { time: string; value: number }[];
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-slate-950/80 p-4 shadow-[0_18px_50px_rgba(0,0,0,0.25)]">
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-sm font-medium text-slate-200">{config.title}</h4>
        <span className="text-xs text-slate-500">{config.unit}</span>
      </div>

      <div className="h-36">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <defs>
              <linearGradient
                id={`gradient-${config.id}`}
                x1="0"
                y1="0"
                x2="0"
                y2="1"
              >
                <stop
                  offset="5%"
                  stopColor={config.color}
                  stopOpacity={0.3}
                />
                <stop
                  offset="95%"
                  stopColor={config.color}
                  stopOpacity={0}
                />
              </linearGradient>
            </defs>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="#24384d"
              opacity={0.45}
            />
            <XAxis dataKey="time" hide />
            <YAxis domain={[config.min, config.max]} hide />
            <Tooltip
              contentStyle={{
                backgroundColor: "#07111b",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: "8px",
              }}
              labelStyle={{ color: "#9fb3c8" }}
              itemStyle={{ color: config.color }}
            />
            <Area
              type="monotone"
              dataKey="value"
              stroke={config.color}
              strokeWidth={2}
              fill={`url(#gradient-${config.id})`}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export function ChartSection() {
  const [activeRange, setActiveRange] = useState<TimeRange>("24H");

  const dataPoints =
    activeRange === "1H"
      ? 12
      : activeRange === "6H"
        ? 24
        : activeRange === "24H"
          ? 48
          : 84;

  return (
    <div className="rounded-3xl border border-white/10 bg-slate-950/80 p-6 shadow-[0_24px_80px_rgba(0,0,0,0.3)]">
      <div className="mb-6 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white">Live Charts</h3>

        <div className="flex gap-1">
          {timeRanges.map((range) => (
            <button
              key={range}
              onClick={() => setActiveRange(range)}
              className={cn(
                "rounded-full px-3 py-1 text-xs transition-colors",
                activeRange === range
                  ? "bg-emerald-400/15 text-emerald-200"
                  : "text-slate-400 hover:bg-white/5 hover:text-white"
              )}
            >
              {range}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-7">
        {chartConfigs.map((config) => (
          <MiniChart
            key={config.id}
            config={config}
            data={generateData(dataPoints, config.min, config.max)}
          />
        ))}
      </div>
    </div>
  );
}
