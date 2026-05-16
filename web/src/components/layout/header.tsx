"use client";

import { Bell, User, Activity } from "lucide-react";

export function Header() {
  return (
    <header className="flex h-18 items-center justify-between border-b border-white/10 bg-slate-950/85 px-4 backdrop-blur-xl sm:px-6">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-400 via-cyan-400 to-blue-500 shadow-[0_0_24px_rgba(0,255,168,0.35)]">
          <Activity className="h-5 w-5 text-slate-950" />
        </div>
        <div>
          <span className="block text-xl font-semibold tracking-wide text-white">AquaSense</span>
        </div>
      </div>

      <div className="hidden items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-4 py-1.5 sm:flex">
        <div className="relative">
          <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
          <div className="absolute inset-0 h-2 w-2 rounded-full bg-emerald-400 opacity-75 animate-ping" />
        </div>
        <span className="text-sm font-medium text-emerald-200">Live monitoring</span>
      </div>

      <div className="flex items-center gap-4">
        <button className="relative rounded-xl border border-white/10 bg-white/5 p-2.5 transition-colors hover:border-cyan-400/40 hover:bg-cyan-400/10">
          <Bell className="h-5 w-5 text-slate-300" />
          <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-gradient-to-r from-emerald-400 to-cyan-400 text-[10px] font-semibold text-slate-950">
            3
          </span>
        </button>

        <button className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 p-2 transition-colors hover:border-emerald-400/30 hover:bg-emerald-400/10">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-800/80 ring-1 ring-white/10">
            <User className="h-4 w-4 text-slate-200" />
          </div>
        </button>
      </div>
    </header>
  );
}
