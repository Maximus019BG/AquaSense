"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "~/lib/utils";
import {
  LayoutDashboard,
  BarChart3,
  Radio,
  Settings,
  HelpCircle,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

const navItems = [
  { icon: LayoutDashboard, label: "Dashboard", href: "/" },
  { icon: BarChart3, label: "Analytics", href: "/analytics" },
  { icon: Radio, label: "Sensors", href: "/sensors" },
  { icon: Settings, label: "Settings", href: "/settings" },
  { icon: HelpCircle, label: "Help", href: "/help" },
];

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();

  return (
    <aside
      className={cn(
        "h-[calc(100vh-4rem)] border-r border-white/10 bg-slate-950/90 backdrop-blur-xl transition-all duration-300",
        collapsed ? "w-20" : "w-64"
      )}
    >
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="flex w-full justify-end p-2 text-slate-400 transition-colors hover:bg-white/5 hover:text-white"
      >
        {collapsed ? (
          <ChevronRight className="h-5 w-5" />
        ) : (
          <ChevronLeft className="h-5 w-5" />
        )}
      </button>

      <nav className="p-3 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 transition-all duration-200",
                isActive
                  ? "border border-emerald-400/25 bg-emerald-400/10 text-emerald-200 shadow-[0_0_24px_rgba(0,255,168,0.12)]"
                  : "text-slate-400 hover:border hover:border-white/10 hover:bg-white/5 hover:text-slate-100"
              )}
            >
              <Icon className="h-5 w-5 flex-shrink-0" />
              {!collapsed && (
                <span className="text-sm font-medium">{item.label}</span>
              )}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
