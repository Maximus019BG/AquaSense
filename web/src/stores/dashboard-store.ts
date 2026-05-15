import { create } from "zustand";
import { devtools } from "zustand/middleware";
import type { WaterData, Alert } from "~/types";

interface DashboardState {
  // Data
  currentData: WaterData | null;
  historicalData: WaterData[];
  alerts: Alert[];

  // UI State
  selectedParameter: string | null;
  timeRange: "1H" | "6H" | "24H" | "7D";
  isLive: boolean;

  // Actions
  setCurrentData: (data: WaterData) => void;
  addHistoricalData: (data: WaterData) => void;
  addAlert: (alert: Alert) => void;
  acknowledgeAlert: (id: string) => void;
  setSelectedParameter: (id: string | null) => void;
  setTimeRange: (range: "1H" | "6H" | "24H" | "7D") => void;
  setIsLive: (live: boolean) => void;
}

export const useDashboardStore = create<DashboardState>()(
  devtools(
    (set) => ({
      // Initial state
      currentData: null,
      historicalData: [],
      alerts: [],
      selectedParameter: null,
      timeRange: "24H",
      isLive: true,

      // Actions
      setCurrentData: (data) => set({ currentData: data }),

      addHistoricalData: (data) =>
        set((state) => ({
          historicalData: [...state.historicalData.slice(-100), data],
        })),

      addAlert: (alert) =>
        set((state) => ({
          alerts: [alert, ...state.alerts].slice(0, 50),
        })),

      acknowledgeAlert: (id) =>
        set((state) => ({
          alerts: state.alerts.map((a) =>
            a.id === id ? { ...a, acknowledged: true } : a
          ),
        })),

      setSelectedParameter: (id) => set({ selectedParameter: id }),
      setTimeRange: (range) => set({ timeRange: range }),
      setIsLive: (live) => set({ isLive: live }),
    }),
    { name: "DashboardStore" }
  )
);
