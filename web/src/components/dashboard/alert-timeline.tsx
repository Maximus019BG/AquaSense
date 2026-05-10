"use client";

import { cn } from "~/lib/utils";
import { formatDistanceToNow } from "date-fns";
import type { Alert } from "~/types";

interface AlertTimelineProps {
  alerts: Alert[];
}

const alertStyles = {
  critical: {
    badge: "bg-red-500 text-white",
    border: "border-red-500/30",
  },
  warning: {
    badge: "bg-yellow-500 text-black",
    border: "border-yellow-500/30",
  },
  info: {
    badge: "bg-blue-500 text-white",
    border: "border-blue-500/30",
  },
};

export function AlertTimeline({ alerts }: AlertTimelineProps) {
  return (
    <div className="bg-[#132F4C] rounded-xl border border-[#334155] p-4">
      <h3 className="text-sm font-semibold text-white mb-4">Alert Timeline</h3>

      <div className="h-[400px] overflow-y-auto">
        <div className="space-y-3">
          {alerts.map((alert) => (
            <div
              key={alert.id}
              className={cn(
                "p-3 rounded-lg border transition-all hover:translate-x-1",
                alertStyles[alert.type].border,
                "bg-[#0A1929]/50"
              )}
            >
              <div className="flex items-center gap-2 mb-1">
                <span
                  className={cn(
                    "text-[10px] font-bold px-2 py-0.5 rounded uppercase",
                    alertStyles[alert.type].badge
                  )}
                >
                  {alert.type}
                </span>
              </div>

              <p className="text-sm text-gray-200 mb-1">{alert.message}</p>

              <p className="text-xs text-gray-500">
                {formatDistanceToNow(alert.timestamp, { addSuffix: true })} •{" "}
                {alert.parameter}: {alert.value}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
