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
    id: "level",
    title: "Water Level",
    color: "#6C5CE7",
    unit: "cm",
    min: 200,
    max: 300,
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
    <div className="p-4 bg-[#132F4C] border border-[#334155] rounded-xl">
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-sm font-medium text-gray-300">{config.title}</h4>
        <span className="text-xs text-gray-500">{config.unit}</span>
      </div>

      <div className="h-32">
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
              stroke="#334155"
              opacity={0.5}
            />
            <XAxis dataKey="time" hide />
            <YAxis domain={[config.min, config.max]} hide />
            <Tooltip
              contentStyle={{
                backgroundColor: "#132F4C",
                border: "1px solid #334155",
                borderRadius: "8px",
              }}
              labelStyle={{ color: "#94A3B8" }}
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
    <div className="p-6 bg-[#132F4C] border border-[#334155] rounded-xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-white">Live Charts</h3>

        <div className="flex gap-1">
          {timeRanges.map((range) => (
            <button
              key={range}
              onClick={() => setActiveRange(range)}
              className={cn(
                "px-3 py-1 text-xs rounded transition-colors",
                activeRange === range
                  ? "bg-[#00BCD4]/20 text-[#00BCD4]"
                  : "text-gray-400 hover:text-white hover:bg-white/5"
              )}
            >
              {range}
            </button>
          ))}
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-5 gap-4">
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
