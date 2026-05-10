"use client";

import { Bell, User, Activity } from "lucide-react";

export function Header() {
  return (
    <header className="h-16 bg-[#0A1929] border-b border-[#334155] px-6 flex items-center justify-between">
      {/* Logo */}
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 bg-[#00BCD4] rounded-lg flex items-center justify-center">
          <Activity className="w-5 h-5 text-white" />
        </div>
        <span className="text-xl font-bold text-white">
          AquaSense
        </span>
      </div>

      {/* Center - Live Status */}
      <div className="flex items-center gap-2">
        <div className="relative">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          <div className="absolute inset-0 w-2 h-2 bg-green-500 rounded-full animate-ping opacity-75" />
        </div>
        <span className="text-sm text-gray-300">Live Monitoring</span>
      </div>

      {/* Right - Actions */}
      <div className="flex items-center gap-4">
        {/* Alerts Badge */}
        <button className="relative p-2 hover:bg-white/5 rounded-lg transition-colors">
          <Bell className="w-5 h-5 text-gray-400" />
          <span className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 bg-red-500 text-white text-[10px] rounded-full">
            3
          </span>
        </button>

        {/* User Profile */}
        <button className="flex items-center gap-2 p-2 hover:bg-white/5 rounded-lg transition-colors">
          <div className="w-8 h-8 bg-[#1E4976] rounded-full flex items-center justify-center">
            <User className="w-4 h-4 text-gray-300" />
          </div>
        </button>
      </div>
    </header>
  );
}
