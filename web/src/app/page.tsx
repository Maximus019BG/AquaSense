"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { ParameterCard } from "~/components/dashboard/parameter-card";
import { AlertTimeline } from "~/components/dashboard/alert-timeline";
import { ChartSection } from "~/components/dashboard/chart-section";
import { PredictionPanel } from "~/components/dashboard/prediction-panel";
import { WaterScene } from "~/components/visualization/water-scene";
import { SensorStatus } from "~/components/dashboard/sensor-status";
import { HumidityWidget } from "~/components/dashboard/humidity-widget";
import {
  Thermometer, FlaskConical, Eye, Wind, Ruler,
  Sun, Moon,
} from "lucide-react";
import type { Alert } from "~/types";

interface SensorValues {
  temperature: number;
  ph: number;
  turbidity: number;
  dissolvedOxygen: number;
  waterLevel: number;
  humidity: number;
  alertLevel: "none" | "warning" | "critical";
}

const INITIAL: SensorValues = {
  temperature: 24.5,
  ph: 7.2,
  turbidity: 15.3,
  dissolvedOxygen: 8.5,
  waterLevel: 250,
  humidity: 68.4,
  alertLevel: "none",
};

const mockAlerts: Alert[] = [
  {
    id: "1", type: "critical", message: "pH dropped below safe threshold",
    parameter: "pH", value: 6.2, timestamp: new Date(Date.now() - 2 * 60 * 1000), acknowledged: false,
  },
  {
    id: "2", type: "warning", message: "Temperature above normal range",
    parameter: "Temperature", value: 29.5, timestamp: new Date(Date.now() - 15 * 60 * 1000), acknowledged: false,
  },
  {
    id: "3", type: "warning", message: "Humidity climbing — possible storm front",
    parameter: "Humidity", value: 84, timestamp: new Date(Date.now() - 38 * 60 * 1000), acknowledged: false,
  },
];

function getStatus(id: string, value: number): "normal" | "warning" | "critical" {
  const ranges: Record<string, [number, number]> = {
    temperature: [20, 28], ph: [6.5, 8.5], turbidity: [0, 30],
    "dissolved-oxygen": [6, 12], "water-level": [200, 300],
  };
  const [lo, hi] = ranges[id] ?? [0, 100];
  if (value < lo || value > hi) return "critical";
  const margin = (hi - lo) * 0.1;
  if (value < lo + margin || value > hi - margin) return "warning";
  return "normal";
}

function formatTime(h: number) {
  const hh = Math.floor(h);
  const mm = Math.floor((h - hh) * 60);
  return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
}

function timeLabel(h: number) {
  if (h >= 5  && h < 8)  return "Dawn";
  if (h >= 8  && h < 12) return "Morning";
  if (h >= 12 && h < 14) return "Midday";
  if (h >= 14 && h < 18) return "Afternoon";
  if (h >= 18 && h < 21) return "Evening";
  return "Night";
}

export default function DashboardPage() {
  const [sensors, setSensors] = useState<SensorValues>(INITIAL);
  const [quality, setQuality] = useState<"PERF" | "HIGH" | "ULTRA">("ULTRA");
  const [timeOfDay, setTimeOfDay] = useState(12);
  const [syncAgo, setSyncAgo] = useState(0);

  useEffect(() => {
    const data = setInterval(() => {
      setSensors(s => ({
        ...s,
        temperature:     +(s.temperature     + (Math.random() - 0.5) * 0.04).toFixed(2),
        ph:              +Math.max(4, Math.min(10, s.ph + (Math.random() - 0.5) * 0.004)).toFixed(3),
        turbidity:       +Math.max(0, s.turbidity + (Math.random() - 0.5) * 0.08).toFixed(1),
        dissolvedOxygen: +Math.max(0, Math.min(14, s.dissolvedOxygen + (Math.random() - 0.5) * 0.015)).toFixed(2),
        humidity:        +Math.max(30, Math.min(100, s.humidity + (Math.random() - 0.5) * 0.3)).toFixed(1),
      }));
      setSyncAgo(0);
    }, 2000);
    const tick = setInterval(() => setSyncAgo(a => a + 1), 1000);
    return () => { clearInterval(data); clearInterval(tick); };
  }, []);

  const parameters = useMemo(() => [
    { id: "temperature",     title: "Temperature",   value: sensors.temperature,     unit: "°C",   status: getStatus("temperature",     sensors.temperature),     range: { min: 20, max: 28  }, trend: 2.3,  icon: Thermometer, color: "#FF6B6B" },
    { id: "ph",              title: "pH Level",      value: sensors.ph,              unit: "",     status: getStatus("ph",              sensors.ph),              range: { min: 6.5, max: 8.5 }, trend: 0.1,  icon: FlaskConical, color: "#4ECDC4" },
    { id: "turbidity",       title: "Turbidity",     value: sensors.turbidity,       unit: "NTU",  status: getStatus("turbidity",       sensors.turbidity),       range: { min: 0, max: 50   }, trend: -3.2, icon: Eye,          color: "#FFE66D" },
    { id: "dissolved-oxygen",title: "Dissolved O₂",  value: sensors.dissolvedOxygen, unit: "mg/L", status: getStatus("dissolved-oxygen", sensors.dissolvedOxygen), range: { min: 5, max: 12   }, trend: 0.5,  icon: Wind,         color: "#95E1D3" },
    { id: "water-level",     title: "Water Level",   value: sensors.waterLevel,      unit: "cm",   status: getStatus("water-level",     sensors.waterLevel),      range: { min: 200, max: 300 }, trend: -5,  icon: Ruler,        color: "#6C5CE7" },
  ], [sensors]);

  const handleQuality = useCallback((q: "PERF" | "HIGH" | "ULTRA") => setQuality(q), []);
  const handleTime    = useCallback((h: number) => setTimeOfDay(h), []);

  return (
    <div className="grid grid-cols-12 gap-4">
      {/* ── Left col ─────────────────────────────────────────── */}
      <div className="col-span-2 space-y-4">
        <SensorStatus sensors={sensors} />
        <AlertTimeline alerts={mockAlerts} />
      </div>

      {/* ── Center col ───────────────────────────────────────── */}
      <div className="col-span-7 space-y-4">
        {/* 3D scene */}
        <div className="rounded-xl border border-[#1e3a5f] overflow-hidden relative" style={{ height: "468px", background: "#091a2e" }}>
          <WaterScene
            turbidity={sensors.turbidity} ph={sensors.ph}
            dissolvedOxygen={sensors.dissolvedOxygen} temperature={sensors.temperature}
            waterLevel={sensors.waterLevel} alertLevel={sensors.alertLevel}
            quality={quality} timeOfDay={timeOfDay}
          />
          {/* Quality buttons */}
          <div className="absolute bottom-3 right-3 z-30 flex gap-1">
            {(["PERF", "HIGH", "ULTRA"] as const).map(q => (
              <button key={q} onClick={() => handleQuality(q)}
                className="px-2 py-1 text-[9px] font-bold tracking-wider rounded border transition-all"
                style={quality === q
                  ? { backgroundColor: "rgba(6,182,212,0.18)", borderColor: "rgba(6,182,212,0.5)", color: "#06b6d4" }
                  : { backgroundColor: "rgba(10,25,41,0.85)", borderColor: "rgba(6,182,212,0.15)", color: "#475569" }
                }
              >{q}</button>
            ))}
          </div>
          {/* Live badge */}
          <div className="absolute top-2.5 right-3 z-20 flex items-center gap-1.5 bg-[rgba(9,26,46,0.85)] border border-[rgba(6,182,212,0.15)] rounded-full px-3 py-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" style={{ boxShadow: "0 0 4px #4ade80" }} />
            <span className="text-[10px] text-gray-400 font-mono">LIVE · {syncAgo}s ago</span>
          </div>
          {/* Time slider */}
          <div className="absolute top-2.5 left-3 z-20 flex items-center gap-2 bg-[rgba(9,26,46,0.85)] border border-[rgba(255,193,7,0.15)] rounded-full px-3 py-1.5">
            {timeOfDay >= 6 && timeOfDay < 20 ? <Sun size={12} color="#FFD700" /> : <Moon size={12} color="#AADDFF" />}
            <input type="range" min="0" max="23.9" step="0.1" value={timeOfDay}
              onChange={e => handleTime(parseFloat(e.target.value))}
              className="w-14 h-1 cursor-pointer accent-yellow-400"
            />
            <span className="text-[10px] text-gray-400 font-mono min-w-[56px]">{formatTime(timeOfDay)} · {timeLabel(timeOfDay)}</span>
          </div>
          {/* Footer tag */}
          <div className="absolute bottom-3 left-3 z-20 flex items-center gap-2 text-[8px] text-gray-700 font-mono">
            <span>BLACK SEA DIGITAL TWIN</span>
            <span className="mx-1 opacity-50">|</span>
            <span>2215m Max Depth</span>
            <span className="mx-1 opacity-50">|</span>
            <span>436,400 km²</span>
          </div>
        </div>

        {/* Charts */}
        <ChartSection />
      </div>

      {/* ── Right col ────────────────────────────────────────── */}
      <div className="col-span-3 space-y-3">
        {/* Humidity widget (featured) */}
        <HumidityWidget humidity={sensors.humidity} temperature={sensors.temperature} />

        {/* Parameter cards */}
        {parameters.map(p => <ParameterCard key={p.id} {...p} />)}

        {/* AI Predictions */}
        <PredictionPanel sensors={sensors} />
      </div>
    </div>
  );
}
