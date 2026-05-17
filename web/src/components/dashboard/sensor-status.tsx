"use client";

import { Thermometer, FlaskConical, Eye, Wind, Ruler, Droplets } from "lucide-react";

interface SensorValues {
  temperature: number;
  ph: number;
  turbidity: number;
  dissolvedOxygen: number;
  waterLevel: number;
  humidity: number;
}

interface SensorStatusProps {
  sensors: SensorValues;
}

const SENSORS = [
  { id: "temperature",     key: "temperature"     as keyof SensorValues, label: "TEMP",     unit: "°C",   icon: Thermometer, color: "#FF6B6B", range: [20, 28]  as [number,number] },
  { id: "ph",              key: "ph"              as keyof SensorValues, label: "pH",       unit: "",     icon: FlaskConical, color: "#4ECDC4", range: [6.5, 8.5] as [number,number] },
  { id: "turbidity",       key: "turbidity"       as keyof SensorValues, label: "TURB",     unit: "NTU",  icon: Eye,          color: "#FFE66D", range: [0, 30]    as [number,number] },
  { id: "dissolvedOxygen", key: "dissolvedOxygen" as keyof SensorValues, label: "O₂",       unit: "mg/L", icon: Wind,         color: "#95E1D3", range: [6, 12]    as [number,number] },
  { id: "waterLevel",      key: "waterLevel"      as keyof SensorValues, label: "LEVEL",    unit: "cm",   icon: Ruler,        color: "#6C5CE7", range: [200, 300] as [number,number] },
  { id: "humidity",        key: "humidity"        as keyof SensorValues, label: "HUMIDITY", unit: "%",    icon: Droplets,     color: "#06b6d4", range: [40, 75]   as [number,number] },
];

function SignalBars({ level }: { level: number }) {
  return (
    <div className="flex items-end gap-[2px]">
      {[3, 5, 7].map((h, i) => (
        <div
          key={i}
          className="w-[3px] rounded-sm transition-all"
          style={{ height: `${h}px`, backgroundColor: i < level ? "#4ade80" : "#1e3a5f" }}
        />
      ))}
    </div>
  );
}

export function SensorStatus({ sensors }: SensorStatusProps) {
  return (
    <div className="p-4 rounded-xl border dark:border-white/10 border-slate-200 dark:bg-slate-900/40 bg-white shadow-sm">
      {/* Title */}
      <div className="flex items-center gap-2 mb-4">
        <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" style={{ boxShadow: "0 0 5px #4ade80" }} />
        <h3 className="text-[10px] font-bold tracking-[0.15em] text-gray-400 uppercase">Sensor Network</h3>
        <span className="ml-auto text-[8px] font-mono text-emerald-500">6/6 ONLINE</span>
      </div>

      <div className="space-y-2">
        {SENSORS.map((s) => {
          const value = sensors[s.key];
          const [lo, hi] = s.range;
          const ok = value >= lo && value <= hi;
          const pct = Math.max(0, Math.min(1, (value - lo) / (hi - lo)));
          const Icon = s.icon;

          return (
            <div
              key={s.id}
              className="p-2.5 rounded-lg transition-all dark:bg-slate-800/40 bg-slate-50 border dark:border-white/5 border-slate-100"
            >
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <div className="p-1 rounded" style={{ backgroundColor: `${s.color}15` }}>
                    <Icon className="w-3 h-3" style={{ color: s.color }} />
                  </div>
                  <span className="text-[9px] font-bold tracking-[0.12em] text-gray-500">{s.label}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono font-bold dark:text-white text-slate-900">
                    {(() => {
                      if (typeof value === "number") {
                        return value % 1 !== 0 ? value.toFixed(s.id === "ph" ? 2 : 1) : value.toFixed(0);
                      }
                      return String(value ?? "-");
                    })()}
                    <span className="text-gray-600 text-[8px] ml-0.5">{s.unit}</span>
                  </span>
                  <SignalBars level={ok ? 3 : 1} />
                </div>
              </div>
              {/* Mini bar */}
              <div className="h-[2px] rounded-full dark:bg-[#1e3a5f] bg-slate-200">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{ width: `${pct * 100}%`, backgroundColor: ok ? s.color : "#f87171", boxShadow: `0 0 4px ${ok ? s.color : "#f87171"}60` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
