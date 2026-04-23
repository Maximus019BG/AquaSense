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

interface Sensor {
  id: string;
  name: string;
  icon: LucideIcon;
  status: "online" | "offline" | "error";
  lastReading: string;
}

const sensors: Sensor[] = [
  {
    id: "1",
    name: "Temperature",
    icon: Thermometer,
    status: "online",
    lastReading: "24.5°C",
  },
  {
    id: "2",
    name: "pH Sensor",
    icon: FlaskConical,
    status: "online",
    lastReading: "7.2 pH",
  },
  {
    id: "3",
    name: "Turbidity",
    icon: Eye,
    status: "online",
    lastReading: "15 NTU",
  },
  {
    id: "4",
    name: "Dissolved O2",
    icon: Wind,
    status: "online",
    lastReading: "8.5 mg/L",
  },
  {
    id: "5",
    name: "Water Level",
    icon: Ruler,
    status: "online",
    lastReading: "250 cm",
  },
];

export function SensorStatus() {
  return (
    <div className="p-4 bg-[#132F4C] border border-[#334155] rounded-xl">
      <h3 className="text-sm font-semibold text-white mb-4">Sensor Status</h3>

      <div className="space-y-3">
        {sensors.map((sensor) => {
          const Icon = sensor.icon;
          const StatusIcon = sensor.status === "online" ? Wifi : WifiOff;

          return (
            <div
              key={sensor.id}
              className="flex items-center justify-between p-2 rounded-lg bg-[#0A1929]/50"
            >
              <div className="flex items-center gap-3">
                <div className="p-1.5 bg-[#1E4976] rounded">
                  <Icon className="w-4 h-4 text-gray-300" />
                </div>
                <div>
                  <p className="text-sm text-gray-200">{sensor.name}</p>
                  <p className="text-xs text-gray-500">{sensor.lastReading}</p>
                </div>
              </div>

              <StatusIcon
                className={cn(
                  "w-4 h-4",
                  sensor.status === "online" ? "text-green-500" : "text-red-500"
                )}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
