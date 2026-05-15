export interface WaterParameter {
  id: string;
  name: string;
  value: number;
  unit: string;
  min: number;
  max: number;
  optimal: { min: number; max: number };
  trend: number;
  timestamp: Date;
}

export interface WaterData {
  temperature: number;
  ph: number;
  turbidity: number;
  dissolvedOxygen: number;
  waterLevel: number;
  timestamp: Date;
}

export type ParameterStatus = "normal" | "warning" | "critical";

export interface Sensor {
  id: string;
  name: string;
  type: string;
  status: "online" | "offline" | "error";
  lastReading: string;
  lastUpdate: Date;
}
