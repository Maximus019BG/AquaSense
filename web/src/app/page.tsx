"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { ParameterCard } from "~/components/dashboard/parameter-card";
import { AlertTimeline } from "~/components/dashboard/alert-timeline";
import { ChartSection } from "~/components/dashboard/chart-section";
import { ForecastPanel } from "~/components/dashboard/forecast-panel";
import { WaterScene } from "~/components/visualization/water-scene";
import { SensorStatus } from "~/components/dashboard/sensor-status";
import {
  Thermometer,
  FlaskConical,
  Eye,
  Wind,
  Ruler,
  Sun,
  Moon,
  Activity,
  Brain,
  Waves,
} from "lucide-react";
import type { Alert } from "~/types";

interface SensorValues {
  temperature: number;
  ph: number;
  turbidity: number;
  dissolvedOxygen: number;
  waterLevel: number;
  alertLevel: "none" | "warning" | "critical";
  lastUpdate: Date | null;
}

const INITIAL_SENSORS: SensorValues = {
  temperature: 24.5,
  ph: 7.2,
  turbidity: 15.3,
  dissolvedOxygen: 8.5,
  waterLevel: 250,
  alertLevel: "none",
  lastUpdate: null,
};

const mockAlerts: Alert[] = [
  {
    id: "1",
    type: "critical",
    message: "pH dropped below 6.5",
    parameter: "pH",
    value: 6.2,
    timestamp: new Date(Date.now() - 2 * 60 * 1000),
    acknowledged: false,
  },
  {
    id: "2",
    type: "warning",
    message: "Temperature above normal range",
    parameter: "Temperature",
    value: 29.5,
    timestamp: new Date(Date.now() - 15 * 60 * 1000),
    acknowledged: false,
  },
];

function getStatus(id: string, value: number): "normal" | "warning" | "critical" {
  const ranges: Record<string, [number, number]> = {
    temperature: [20, 28],
    ph: [6.5, 8.5],
    turbidity: [0, 30],
    "dissolved-oxygen": [6, 12],
    "water-level": [200, 300],
  };
  const [lo, hi] = ranges[id] || [0, 100];
  if (value < lo || value > hi) return "critical";
  const margin = (hi - lo) * 0.1;
  if (value < lo + margin || value > hi - margin) return "warning";
  return "normal";
}

function formatTime(hour: number): string {
  const h = Math.floor(hour);
  const m = Math.floor((hour - h) * 60);
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
}

function getTimeDescription(hour: number): string {
  if (hour >= 5 && hour < 8) return "Dawn";
  if (hour >= 8 && hour < 12) return "Morning";
  if (hour >= 12 && hour < 14) return "Midday";
  if (hour >= 14 && hour < 18) return "Afternoon";
  if (hour >= 18 && hour < 21) return "Evening";
  if (hour >= 21 || hour < 5) return "Night";
  return "Day";
}

export default function DashboardPage() {
  const [sensors, setSensors] = useState<SensorValues>(INITIAL_SENSORS);
  const [quality, setQuality] = useState<"PERF" | "HIGH" | "ULTRA">("ULTRA");
  const [timeOfDay, setTimeOfDay] = useState(12);
  const [syncAgo, setSyncAgo] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLatestData = useCallback(async () => {
    try {
      const response = await fetch("/api/readings");
      const result = await response.json();
      
      if (result.success && result.data) {
        setSensors({
          temperature: result.data.temperature,
          ph: result.data.ph,
          turbidity: result.data.turbidity,
          dissolvedOxygen: result.data.dissolvedOxygen,
          waterLevel: result.data.waterLevel,
          alertLevel: "none",
          lastUpdate: new Date(result.data.timestamp),
        });
        setError(null);
        setSyncAgo(0);
      } else {
        setError(result.error || "Failed to fetch data");
      }
    } catch (err) {
      setError("Connection error");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLatestData();
    
    const interval = setInterval(() => {
      fetchLatestData();
    }, 5000);

    const syncInterval = setInterval(() => setSyncAgo((a) => a + 1), 1000);

    return () => {
      clearInterval(interval);
      clearInterval(syncInterval);
    };
  }, [fetchLatestData]);

  const alertCount = useMemo(() => {
    let c = 0;
    if (sensors.ph < 6.5 || sensors.ph > 8.5) c++;
    if (sensors.temperature > 27.5) c++;
    if (sensors.turbidity > 35) c++;
    if (sensors.dissolvedOxygen < 6) c++;
    return c;
  }, [sensors]);

  const parameters = useMemo(
    () => [
      {
        id: "temperature",
        title: "Temperature",
        value: sensors.temperature,
        unit: "°C",
        status: getStatus("temperature", sensors.temperature),
        range: { min: 20, max: 28 },
        trend: 2.3,
        icon: Thermometer,
        color: "#FF6B6B",
      },
      {
        id: "ph",
        title: "pH Level",
        value: sensors.ph,
        unit: "",
        status: getStatus("ph", sensors.ph),
        range: { min: 6.5, max: 8.5 },
        trend: 0.1,
        icon: FlaskConical,
        color: "#4ECDC4",
      },
      {
        id: "turbidity",
        title: "Turbidity",
        value: sensors.turbidity,
        unit: "NTU",
        status: getStatus("turbidity", sensors.turbidity),
        range: { min: 0, max: 50 },
        trend: -3.2,
        icon: Eye,
        color: "#FFE66D",
      },
      {
        id: "dissolved-oxygen",
        title: "Dissolved O2",
        value: sensors.dissolvedOxygen,
        unit: "mg/L",
        status: getStatus("dissolved-oxygen", sensors.dissolvedOxygen),
        range: { min: 5, max: 12 },
        trend: 0.5,
        icon: Wind,
        color: "#95E1D3",
      },
      {
        id: "water-level",
        title: "Water Level",
        value: sensors.waterLevel,
        unit: "cm",
        status: getStatus("water-level", sensors.waterLevel),
        range: { min: 200, max: 300 },
        trend: -5,
        icon: Ruler,
        color: "#6C5CE7",
      },
    ],
    [sensors]
  );

  const sensorData = useMemo(
    () => ({
      temperature: sensors.temperature,
      ph: sensors.ph,
      turbidity: sensors.turbidity,
      dissolvedOxygen: sensors.dissolvedOxygen,
      waterLevel: sensors.waterLevel,
      alertLevel: sensors.alertLevel,
    }),
    [sensors]
  );

  const liveMetrics = useMemo(
    () => [
      {
        label: "Temperature",
        value: `${sensors.temperature.toFixed(1)}°C`,
        color: "#FF6B6B",
        detail: sensors.temperature > 27.5 ? "Heating up" : "Stable thermal band",
      },
      {
        label: "pH",
        value: sensors.ph.toFixed(2),
        color: "#4ECDC4",
        detail: sensors.ph < 6.5 || sensors.ph > 8.5 ? "Needs attention" : "Balanced chemistry",
      },
      {
        label: "Turbidity",
        value: `${sensors.turbidity.toFixed(1)} NTU`,
        color: "#FFE66D",
        detail: sensors.turbidity > 35 ? "Particles rising" : "Clear water column",
      },
      {
        label: "Oxygen",
        value: `${sensors.dissolvedOxygen.toFixed(1)} mg/L`,
        color: "#95E1D3",
        detail: sensors.dissolvedOxygen < 6 ? "Low oxygen margin" : "Healthy saturation",
      },
      {
        label: "Water Level",
        value: `${Math.round(sensors.waterLevel)} cm`,
        color: "#6C5CE7",
        detail: sensors.waterLevel < 210 || sensors.waterLevel > 290 ? "Outside guard band" : "Within expected range",
      },
    ],
    [sensors]
  );

  const headerTone = liveMetrics[alertCount > 0 ? 0 : 3] ?? liveMetrics[0];

  const handleQualityChange = useCallback((q: "PERF" | "HIGH" | "ULTRA") => {
    setQuality(q);
  }, []);

  const handleTimeChange = useCallback((hour: number) => {
    setTimeOfDay(hour);
  }, []);

  return (
    <div className="space-y-4">
      <section className="rounded-[1.75rem] border border-white/10 bg-slate-950/85 px-4 py-3 shadow-[0_20px_70px_rgba(0,0,0,0.35)] backdrop-blur-xl sm:px-5">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex flex-wrap items-center gap-2 text-[9px] font-bold uppercase tracking-[0.28em] text-slate-400">
            <span className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-cyan-200">Live 3D twin</span>
            <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-emerald-200">Dynamic sensors</span>
            <span className="rounded-full border border-violet-400/20 bg-violet-400/10 px-3 py-1 text-violet-200">Analytics palette</span>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 xl:min-w-[520px]">
            <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2">
              <div className="flex items-center gap-2 text-[9px] font-bold uppercase tracking-[0.18em] text-slate-500">
                <Activity className="h-3.5 w-3.5" style={{ color: headerTone.color }} />
                Sync
              </div>
              <p className="mt-1 text-sm font-semibold text-white">{syncAgo}s</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2">
              <div className="flex items-center gap-2 text-[9px] font-bold uppercase tracking-[0.18em] text-slate-500">
                <Brain className="h-3.5 w-3.5" style={{ color: "#4ECDC4" }} />
                Alerts
              </div>
              <p className="mt-1 text-sm font-semibold text-white">{alertCount}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2">
              <div className="flex items-center gap-2 text-[9px] font-bold uppercase tracking-[0.18em] text-slate-500">
                <Waves className="h-3.5 w-3.5" style={{ color: "#95E1D3" }} />
                Scene
              </div>
              <p className="mt-1 text-sm font-semibold text-white">{quality}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2">
              <div className="flex items-center gap-2 text-[9px] font-bold uppercase tracking-[0.18em] text-slate-500">
                <Sun className="h-3.5 w-3.5 text-amber-300" />
                Time
              </div>
              <p className="mt-1 text-sm font-semibold text-white">{formatTime(timeOfDay)}</p>
            </div>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-12 gap-4 xl:gap-5">
        <aside className="col-span-12 space-y-4 xl:col-span-3">
          <SensorStatus sensors={sensors} />
          <AlertTimeline alerts={mockAlerts} />

          <div className="rounded-[1.5rem] border border-white/10 bg-slate-950/80 p-4 shadow-[0_18px_60px_rgba(0,0,0,0.3)] backdrop-blur-xl">
            <div className="flex items-center justify-between gap-2">
              <p className="text-[9px] font-bold uppercase tracking-[0.22em] text-slate-500">Live metrics</p>
              <span className="text-[9px] font-mono text-slate-600">Dynamic</span>
            </div>
            <div className="mt-3 grid gap-2">
              {liveMetrics.map((metric) => (
                <div key={metric.label} className="flex items-center justify-between rounded-2xl border border-white/8 bg-white/5 px-3 py-2">
                  <div>
                    <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-slate-500">{metric.label}</p>
                    <p className="text-sm font-semibold text-white">{metric.value}</p>
                  </div>
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: metric.color, boxShadow: `0 0 10px ${metric.color}` }} />
                </div>
              ))}
            </div>
          </div>
        </aside>

        <main className="col-span-12 space-y-4 xl:col-span-6">
          <div className="relative aspect-[21/11] w-full overflow-hidden rounded-[2rem] border border-white/10 bg-slate-950/90 shadow-[0_30px_100px_rgba(0,0,0,0.45)] xl:aspect-[21/13]">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(0,188,212,0.14),_transparent_36%),radial-gradient(circle_at_80%_20%,_rgba(108,92,231,0.14),_transparent_28%),linear-gradient(180deg,_rgba(2,6,23,0.08)_0%,_rgba(2,6,23,0.34)_100%)]" />
            <WaterScene
              turbidity={sensorData.turbidity}
              ph={sensorData.ph}
              dissolvedOxygen={sensorData.dissolvedOxygen}
              temperature={sensorData.temperature}
              waterLevel={sensorData.waterLevel}
              alertLevel={sensorData.alertLevel}
              quality={quality}
              timeOfDay={timeOfDay}
            />

            <div className="absolute left-4 top-4 z-30 flex items-center gap-2 rounded-full border border-cyan-400/15 bg-slate-950/80 px-3 py-2 backdrop-blur-xl">
              {timeOfDay >= 6 && timeOfDay < 20 ? <Sun size={14} color="#FFD700" /> : <Moon size={14} color="#AADDFF" />}
              <input
                type="range"
                min="0"
                max="23.9"
                step="0.1"
                value={timeOfDay}
                onChange={(e) => handleTimeChange(parseFloat(e.target.value))}
                className="h-1 w-28 cursor-pointer accent-[#FFD700]"
              />
              <span className="min-w-[132px] text-[10px] font-mono text-[#94A3B8]">
                {formatTime(timeOfDay)} · {getTimeDescription(timeOfDay)}
              </span>
            </div>

            <div className="absolute right-4 top-4 z-30 flex items-center gap-1.5 rounded-full border border-emerald-400/15 bg-slate-950/80 px-3 py-1.5 backdrop-blur-xl">
              <div className="h-1.5 w-1.5 rounded-full bg-[#4CAF50] animate-pulse" />
              <span className="text-[10px] font-mono text-[#94A3B8]">LIVE · sync {syncAgo}s ago</span>
            </div>

            <div className="absolute left-4 bottom-4 z-30 rounded-full border border-white/10 bg-slate-950/80 px-3 py-1.5 backdrop-blur-xl">
              <div className="flex flex-wrap items-center gap-2 text-[9px] text-slate-500">
                <span>BLACK SEA DIGITAL TWIN</span>
                <span className="text-slate-700">|</span>
                <span>Depth: ~2215m max</span>
                <span className="text-slate-700">|</span>
                <span>Surface Area: ~436,400 km²</span>
              </div>
            </div>

            <div className="absolute right-4 bottom-4 z-30 flex gap-1.5 rounded-full border border-white/10 bg-slate-950/80 p-1.5 backdrop-blur-xl">
              {(["PERF", "HIGH", "ULTRA"] as const).map((q) => (
                <button
                  key={q}
                  onClick={() => handleQualityChange(q)}
                  className={`rounded-full px-3 py-1 text-[9px] font-bold tracking-[0.18em] transition-all ${
                    quality === q
                      ? "border border-cyan-400/50 bg-cyan-400/15 text-cyan-200 shadow-[0_0_18px_rgba(0,188,212,0.18)]"
                      : "border border-white/10 bg-white/5 text-slate-500 hover:border-cyan-400/30 hover:text-cyan-200"
                  }`}
                >
                  {q}
                </button>
              ))}
            </div>
          </div>

          <ChartSection />
        </main>

        <aside className="col-span-12 space-y-4 xl:col-span-3">
          <ForecastPanel />

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
            {parameters.map((param) => (
              <ParameterCard key={param.id} {...param} />
            ))}
          </div>
        </aside>
      </div>
    </div>
  );
}