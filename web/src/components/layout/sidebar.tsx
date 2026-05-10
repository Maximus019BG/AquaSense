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
        "h-[calc(100vh-64px)] bg-[#0A1929] border-r border-[#334155] transition-all duration-300",
        collapsed ? "w-20" : "w-64"
      )}
    >
      {/* Collapse Toggle */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="w-full flex justify-end p-2 hover:bg-white/5"
      >
        {collapsed ? (
          <ChevronRight className="w-5 h-5 text-gray-400" />
        ) : (
          <ChevronLeft className="w-5 h-5 text-gray-400" />
        )}
      </button>

      {/* Navigation */}
      <nav className="p-3 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all",
                isActive
                  ? "bg-[#00BCD4]/20 text-[#00BCD4]"
                  : "text-gray-400 hover:bg-white/5 hover:text-gray-200"
              )}
            >
              <Icon className="w-5 h-5 flex-shrink-0" />
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
