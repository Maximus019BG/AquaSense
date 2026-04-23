"use client";

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

const parameters = [
  {
    id: "temperature",
    title: "Temperature",
    value: 24.5,
    unit: "°C",
    status: "normal" as const,
    range: { min: 20, max: 28 },
    trend: 2.3,
    icon: Thermometer,
    color: "#FF6B6B",
  },
  {
    id: "ph",
    title: "pH Level",
    value: 7.2,
    unit: "",
    status: "normal" as const,
    range: { min: 6.5, max: 8.5 },
    trend: 0.1,
    icon: FlaskConical,
    color: "#4ECDC4",
  },
  {
    id: "turbidity",
    title: "Turbidity",
    value: 15.3,
    unit: "NTU",
    status: "normal" as const,
    range: { min: 0, max: 50 },
    trend: -3.2,
    icon: Eye,
    color: "#FFE66D",
  },
  {
    id: "dissolved-oxygen",
    title: "Dissolved O2",
    value: 8.5,
    unit: "mg/L",
    status: "normal" as const,
    range: { min: 5, max: 12 },
    trend: 0.5,
    icon: Wind,
    color: "#95E1D3",
  },
  {
    id: "water-level",
    title: "Water Level",
    value: 250,
    unit: "cm",
    status: "normal" as const,
    range: { min: 200, max: 300 },
    trend: -5,
    icon: Ruler,
    color: "#6C5CE7",
  },
];

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

export default function DashboardPage() {
  return (
    <div className="grid grid-cols-12 gap-6">
      {/* Left Sidebar - Sensor Status */}
      <div className="col-span-2">
        <SensorStatus />

        {/* Alert Timeline */}
        <div className="mt-6">
          <AlertTimeline alerts={mockAlerts} />
        </div>
      </div>

      {/* Center - 3D Visualization */}
      <div className="col-span-7">
        <div
          className="bg-[#132F4C] rounded-xl border border-[#334155] overflow-hidden"
          style={{ height: "600px" }}
        >
          <WaterScene />
        </div>

        {/* Charts Section */}
        <div className="mt-6">
          <ChartSection />
        </div>
      </div>

      {/* Right Sidebar - Parameters & Forecast */}
      <div className="col-span-3 space-y-4">
        {parameters.map((param) => (
          <ParameterCard key={param.id} {...param} />
        ))}

        <ForecastPanel />
      </div>
    </div>
  );
}
