import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatValue(value: number, decimals = 1): string {
  return value.toFixed(decimals);
}

export function getStatusColor(status: "normal" | "warning" | "critical"): string {
  const colors = {
    normal: "#4CAF50",
    warning: "#FFC107",
    critical: "#F44336",
  };
  return colors[status];
}
