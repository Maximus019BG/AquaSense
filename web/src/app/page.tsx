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
} from "lucide-react";
import type { Alert } from "~/types";
import PredictionForm from "~/components/prediction/PredictionForm";

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

  const handleQualityChange = useCallback((q: "PERF" | "HIGH" | "ULTRA") => {
    setQuality(q);
  }, []);

  const handleTimeChange = useCallback((hour: number) => {
    setTimeOfDay(hour);
  }, []);

  return (
    <div className="grid grid-cols-12 gap-5 xl:gap-6">
      <div className="col-span-12 space-y-5 lg:col-span-3 xl:col-span-3">
        <SensorStatus sensors={sensors} />

        <div>
          <AlertTimeline alerts={mockAlerts} />
        </div>
      </div>

      <div className="col-span-12 lg:col-span-6 xl:col-span-6">
        <div
          className="relative overflow-hidden rounded-3xl border border-white/10 bg-slate-950/80 shadow-[0_24px_80px_rgba(0,0,0,0.35)]"
          style={{ height: "500px" }}
        >
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

          <div className="absolute bottom-3 right-3 z-30 flex gap-1">
            {(["PERF", "HIGH", "ULTRA"] as const).map((q) => (
              <button
                key={q}
                onClick={() => handleQualityChange(q)}
                className={`px-2 py-1 text-[9px] font-bold tracking-wider rounded border transition-all ${
                  quality === q
                    ? "bg-[rgba(0,188,212,0.18)] border-[rgba(0,188,212,0.5)] text-[#00BCD4]"
                    : "bg-[rgba(10,25,41,0.85)] border-[rgba(0,188,212,0.2)] text-[#475569]"
                }`}
              >
                {q}
              </button>
            ))}
          </div>

          <div className="absolute right-3 top-3 z-20 flex items-center gap-1.5 rounded-full border border-emerald-400/15 bg-slate-950/75 px-3 py-1.5 backdrop-blur-xl">
            <div className="w-1.5 h-1.5 rounded-full bg-[#4CAF50] animate-pulse" />
            <span className="text-[10px] text-[#94A3B8] font-mono">
              LIVE · sync {syncAgo}s ago
            </span>
          </div>

          <div className="absolute left-3 top-3 z-20 flex items-center gap-2 rounded-full border border-cyan-400/15 bg-slate-950/75 px-3 py-1.5 backdrop-blur-xl">
            {timeOfDay >= 6 && timeOfDay < 20 ? (
              <Sun size={14} color="#FFD700" />
            ) : (
              <Moon size={14} color="#AADDFF" />
            )}
            <input
              type="range"
              min="0"
              max="23.9"
              step="0.1"
              value={timeOfDay}
              onChange={(e) => handleTimeChange(parseFloat(e.target.value))}
              className="w-16 h-1 accent-[#FFD700] cursor-pointer"
            />
            <span className="text-[10px] text-[#94A3B8] font-mono min-w-[40px]">
              {formatTime(timeOfDay)} · {getTimeDescription(timeOfDay)}
            </span>
          </div>

          <div className="absolute bottom-3 left-3 z-20 flex items-center gap-2 text-[9px] text-slate-500">
            <span> BLACK SEA DIGITAL TWIN</span>
            <span className="mx-1">|</span>
            <span>Depth: ~2215m max</span>
            <span className="mx-1">|</span>
            <span>Surface Area: ~436,400 km²</span>
          </div>
        </div>

        <div className="mt-6">
          <ChartSection />
        </div>
      </div>

      <div className="col-span-12 space-y-4 lg:col-span-3 xl:col-span-3">
        {parameters.map((param) => (
          <ParameterCard key={param.id} {...param} />
        ))}
      </div>

      <div className="col-span-12 grid gap-5 lg:grid-cols-12">
        <div className="lg:col-span-3">
          <ForecastPanel />
        </div>

        <div className="lg:col-span-9">
          <div className="rounded-3xl border border-white/10 bg-slate-950/70 p-4 shadow-[0_22px_70px_rgba(0,0,0,0.35)] backdrop-blur-xl sm:p-6">
            <h2 className="mb-4 text-lg font-semibold text-white">
              Prediction Form
            </h2>
            <PredictionForm />
          </div>
        </div>
      </div>
    </div>
  );
}