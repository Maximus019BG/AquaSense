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
    <div className="p-4 bg-[#132F4C] border border-[#334155] rounded-xl">
      <h3 className="text-sm font-semibold text-white mb-4">Sensor Status</h3>

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
              className="flex items-center justify-between p-2 rounded-lg bg-[#0A1929]/50"
            >
              <div className="flex items-center gap-3">
                <div className="p-1.5 bg-[#1E4976] rounded">
                  <sensor.Icon className="w-4 h-4 text-gray-300" />
                </div>
                <div>
                  <p className="text-sm text-gray-200">{sensor.name}</p>
                  <p className="text-xs text-gray-500 font-mono">
                    {displayValue}
                    {sensor.unit}
                  </p>
                </div>
              </div>

              <Wifi
                className={cn(
                  "w-4 h-4",
                  isOnline ? "text-green-500" : "text-red-500"
                )}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}