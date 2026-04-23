export interface Alert {
  id: string;
  type: "critical" | "warning" | "info";
  message: string;
  parameter: string;
  value: number;
  threshold?: number;
  timestamp: Date;
  acknowledged: boolean;
}

export interface AlertConfig {
  temperature: { min: number; max: number };
  ph: { min: number; max: number };
  turbidity: { min: number; max: number };
  dissolvedOxygen: { min: number; max: number };
  waterLevel: { min: number; max: number };
}
