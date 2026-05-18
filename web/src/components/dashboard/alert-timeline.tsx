"use client";

import { cn } from "~/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { AlertTriangle, AlertOctagon, Info } from "lucide-react";
import type { Alert } from "~/types";

interface AlertTimelineProps {
  alerts: Alert[];
}

const ALERT_CFG = {
  critical: { color: "#f87171", bg: "rgba(248,113,113,0.08)", label: "CRIT", Icon: AlertOctagon },
  warning:  { color: "#facc15", bg: "rgba(250,204,21,0.06)",  label: "WARN", Icon: AlertTriangle },
  info:     { color: "#60a5fa", bg: "rgba(96,165,250,0.06)",  label: "INFO", Icon: Info },
};

export function AlertTimeline({ alerts }: AlertTimelineProps) {
  return (
    <div className="p-4 rounded-xl border dark:border-white/10 border-slate-200 dark:bg-slate-900/40 bg-white shadow-sm">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" style={{ boxShadow: "0 0 5px #f87171" }} />
        <h3 className="text-[10px] font-bold tracking-[0.15em] text-gray-400 uppercase">Alert Feed</h3>
        <span className="ml-auto text-[8px] font-mono px-1.5 py-0.5 rounded bg-red-500/10 text-red-400 border border-red-500/20">
          {alerts.length} ACTIVE
        </span>
      </div>

      <div className="space-y-2 max-h-[380px] overflow-y-auto pr-0.5 scrollbar-thin">
        {alerts.length === 0 ? (
          <div className="py-8 text-center">
            <p className="text-[10px] text-gray-600 font-mono">NO ACTIVE ALERTS</p>
          </div>
        ) : alerts.map((alert) => {
          const cfg = ALERT_CFG[alert.type] ?? ALERT_CFG.info;
          const Icon = cfg.Icon;
          return (
            <div
              key={alert.id}
              className="relative pl-3 pr-3 py-2.5 rounded-lg transition-all duration-150 hover:brightness-110"
              style={{ background: cfg.bg, borderLeft: `3px solid ${cfg.color}`, border: `1px solid ${cfg.color}20`, borderLeftWidth: "3px" }}
            >
              <div className="flex items-start gap-2">
                <Icon className="w-3 h-3 mt-0.5 flex-shrink-0" style={{ color: cfg.color }} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-0.5">
                    <span className="text-[9px] font-bold tracking-widest" style={{ color: cfg.color }}>{cfg.label}</span>
                    <span className="text-[8px] font-mono text-gray-600">
                      {formatDistanceToNow(alert.timestamp, { addSuffix: true })}
                    </span>
                  </div>
                  <p className="text-[11px] dark:text-gray-200 text-slate-700 leading-snug">{alert.message}</p>
                  <p className="text-[9px] dark:text-gray-600 text-slate-400 font-mono mt-1">
                    {alert.parameter}: <span style={{ color: cfg.color }}>{alert.value}</span>
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
