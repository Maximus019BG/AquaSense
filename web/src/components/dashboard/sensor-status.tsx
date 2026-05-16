"use client";

import {
  Thermometer,
  FlaskConical,
  Eye,
  Wind,
  Ruler,
  Wifi,
  WifiOff,
} from "lucide-react";
import { cn } from "~/lib/utils";

import type { LucideIcon } from "lucide-react";

interface SensorValues {
  temperature: number;
  ph: number;
  turbidity: number;
  dissolvedOxygen: number;
  waterLevel: number;
}

interface SensorStatusProps {
  sensors: SensorValues;
}

function getStatus(id: string, value: number): boolean {
  const ranges: Record<string, [number, number]> = {
    temperature: [20, 28],
    ph: [6.5, 8.5],
    turbidity: [0, 30],
    "dissolved-oxygen": [6, 12],
    "water-level": [200, 300],
  };
  const [lo, hi] = ranges[id] || [0, 100];
  return value >= lo && value <= hi;
}

export function SensorStatus({ sensors }: SensorStatusProps) {
  const sensorItems = [
    {
      id: "temperature",
      name: "Temperature",
      key: "temperature" as keyof SensorValues,
      unit: "°C",
      Icon: Thermometer,
    },
    {
      id: "ph",
      name: "pH Sensor",
      key: "ph" as keyof SensorValues,
      unit: " pH",
      Icon: FlaskConical,
    },
    {
      id: "turbidity",
      name: "Turbidity",
      key: "turbidity" as keyof SensorValues,
      unit: " NTU",
      Icon: Eye,
    },
    {
      id: "dissolved-oxygen",
      name: "Dissolved O2",
      key: "dissolvedOxygen" as keyof SensorValues,
      unit: " mg/L",
      Icon: Wind,
    },
    {
      id: "water-level",
      name: "Water Level",
      key: "waterLevel" as keyof SensorValues,
      unit: " cm",
      Icon: Ruler,
    },
  ];

  const keyMap: Record<string, string> = {
    temperature: "temperature",
    ph: "ph",
    turbidity: "turbidity",
    dissolvedOxygen: "dissolved-oxygen",
    waterLevel: "water-level",
  };

  return (
    <div className="rounded-2xl border border-white/10 bg-slate-950/80 p-4 shadow-[0_18px_50px_rgba(0,0,0,0.25)]">
      <h3 className="mb-4 text-sm font-semibold text-white">Sensor Status</h3>

      <div className="space-y-3">
        {sensorItems.map((sensor) => {
          const value = sensors[sensor.key];
          const statusKey = keyMap[sensor.id];
          const isOnline = getStatus(statusKey, value);
          const displayValue =
            sensor.key === "ph" ? value.toFixed(2) : value.toFixed(1);

          return (
            <div
              key={sensor.id}
              className="flex items-center justify-between rounded-xl border border-white/5 bg-white/5 p-2.5"
            >
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-cyan-400/10 p-1.5">
                  <sensor.Icon className="h-4 w-4 text-cyan-200" />
                </div>
                <div>
                  <p className="text-sm text-slate-200">{sensor.name}</p>
                  <p className="font-mono text-xs text-slate-500">
                    {displayValue}
                    {sensor.unit}
                  </p>
                </div>
              </div>

              <Wifi
                className={cn(
                  "h-4 w-4",
                  isOnline ? "text-emerald-400" : "text-rose-400"
                )}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}