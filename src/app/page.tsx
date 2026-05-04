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
} from "lucide-react";
import type { Alert } from "~/types";

interface SensorValues {
  temperature: number;
  ph: number;
  turbidity: number;
  dissolvedOxygen: number;
  waterLevel: number;
  alertLevel: "none" | "warning" | "critical";
}

const INITIAL_SENSORS: SensorValues = {
  temperature: 24.5,
  ph: 7.2,
  turbidity: 15.3,
  dissolvedOxygen: 8.5,
  waterLevel: 250,
  alertLevel: "none",
};

const SPARKLINES = {
  temperature: [23.1, 23.8, 24.2, 24.0, 24.5, 24.3, 24.5],
  ph: [7.1, 7.15, 7.18, 7.2, 7.22, 7.2, 7.2],
  turbidity: [16.1, 15.8, 15.5, 15.6, 15.3, 15.4, 15.3],
  "dissolved-oxygen": [8.2, 8.3, 8.4, 8.35, 8.5, 8.45, 8.5],
  "water-level": [255, 253, 251, 250, 250, 250, 250],
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

export default function DashboardPage() {
  const [sensors, setSensors] = useState<SensorValues>(INITIAL_SENSORS);
  const [quality, setQuality] = useState<"PERF" | "HIGH" | "ULTRA">("ULTRA");
  const [syncAgo, setSyncAgo] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setSensors((s) => ({
        ...s,
        temperature: +(
          s.temperature + (Math.random() - 0.5) * 0.04
        ).toFixed(2),
        ph: +Math.max(4, Math.min(10, s.ph + (Math.random() - 0.5) * 0.004)).toFixed(3),
        turbidity: +Math.max(0, s.turbidity + (Math.random() - 0.5) * 0.08).toFixed(1),
        dissolvedOxygen: +Math.max(
          0,
          Math.min(14, s.dissolvedOxygen + (Math.random() - 0.5) * 0.015)
        ).toFixed(2),
      }));
      setSyncAgo(0);
    }, 2000);

    const syncInterval = setInterval(() => setSyncAgo((a) => a + 1), 1000);

    return () => {
      clearInterval(interval);
      clearInterval(syncInterval);
    };
  }, []);

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

  return (
    <div className="grid grid-cols-12 gap-6">
      <div className="col-span-2">
        <SensorStatus sensors={sensors} />

        <div className="mt-6">
          <AlertTimeline alerts={mockAlerts} />
        </div>
      </div>

      <div className="col-span-7">
        <div
          className="bg-[#132F4C] rounded-xl border border-[#334155] overflow-hidden relative"
          style={{ height: "480px" }}
        >
          <WaterScene
            turbidity={sensorData.turbidity}
            ph={sensorData.ph}
            dissolvedOxygen={sensorData.dissolvedOxygen}
            temperature={sensorData.temperature}
            waterLevel={sensorData.waterLevel}
            alertLevel={sensorData.alertLevel}
            quality={quality}
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

          <div className="absolute top-2.5 right-3 z-20 flex items-center gap-1.5 bg-[rgba(10,25,41,0.8)] border border-[rgba(0,188,212,0.15)] rounded-full px-3 py-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-[#4CAF50] animate-pulse" />
            <span className="text-[10px] text-[#94A3B8] font-mono">
              LIVE · sync {syncAgo}s ago
            </span>
          </div>
        </div>

        <div className="mt-6">
          <ChartSection />
        </div>
      </div>

      <div className="col-span-3 space-y-4">
        {parameters.map((param) => (
          <ParameterCard key={param.id} {...param} />
        ))}

        <ForecastPanel />
      </div>
    </div>
  );
}