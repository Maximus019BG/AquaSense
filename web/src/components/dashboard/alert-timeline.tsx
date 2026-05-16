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
    <div className="rounded-2xl border border-white/10 bg-slate-950/80 p-4 shadow-[0_18px_50px_rgba(0,0,0,0.25)]">
      <h3 className="mb-4 text-sm font-semibold text-white">Alert Timeline</h3>

      <div className="h-[400px] overflow-y-auto pr-1">
        <div className="space-y-3">
          {alerts.map((alert) => (
            <div
              key={alert.id}
              className={cn(
                "rounded-xl border p-3 transition-all hover:-translate-y-0.5 hover:border-white/20",
                alertStyles[alert.type].border,
                "bg-white/5"
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

              <p className="mb-1 text-sm text-slate-200">{alert.message}</p>

              <p className="text-xs text-slate-500">
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
