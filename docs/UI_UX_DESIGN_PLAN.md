# AquaSense Frontend - UI/UX Design & Implementation Plan

**Document Version:** 1.0  
**Date:** April 23, 2026  
**Framework:** Next.js 15 + React 19  
**Focus:** Frontend UI/UX Only - No Backend Logic

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Tech Stack & Tools](#2-tech-stack--tools)
3. [Design System](#3-design-system)
4. [Component Architecture](#4-component-architecture)
5. [Page Structure](#5-page-structure)
6. [Implementation Roadmap](#6-implementation-roadmap)
7. [Step-by-Step Implementation](#7-step-by-step-implementation)
8. [3D Visualization Design](#8-3d-visualization-design)
9. [Responsive Design](#9-responsive-design)
10. [Accessibility](#10-accessibility)
11. [Performance Optimization](#11-performance-optimization)
12. [Testing Strategy](#12-testing-strategy)

---

## 1. Project Overview

### What We're Building
A professional water quality monitoring dashboard with:
- **3D Water Visualization** - Real-time interactive water body rendering
- **Live Data Dashboard** - 5 water parameter cards with real-time updates
- **Interactive Charts** - Historical and forecast data visualization
- **Alert System** - Visual notifications for anomalies
- **Responsive Design** - Works on desktop, tablet, and mobile

### Core User Flows

```
User Opens App
    ↓
Dashboard Loads (3D Scene + Data)
    ↓
User Views Live Parameters (Cards)
    ↓
User Interacts with 3D Scene (Rotate/Zoom)
    ↓
User Checks Charts (Historical Data)
    ↓
User Reviews Alerts (Timeline)
```

### Target Users
- Environmental scientists
- Water quality managers
- Aquaculture operators
- Research institutions

---

## 2. Tech Stack & Tools

### Core Framework
| Technology | Version | Purpose |
|------------|---------|---------|
| Next.js | 15.x | React framework with App Router |
| React | 19.x | UI library |
| TypeScript | 5.x | Type safety |
| Tailwind CSS | 4.x | Styling |

### UI Libraries
| Technology | Purpose |
|------------|---------|
| shadcn/ui | Base component library |
| Lucide React | Icons |
| Framer Motion | Animations |
| Recharts | Charts |

### 3D Visualization
| Technology | Purpose |
|------------|---------|
| Three.js | 3D rendering |
| React Three Fiber | React integration |
| React Three Drei | 3D helpers |

### State Management
| Technology | Purpose |
|------------|---------|
| Zustand | Global state |
| React Query | Server state |
| React Context | Theme/auth |

---

## 3. Design System

### 3.1 Color Palette

Create file: `src/styles/colors.ts`

```typescript
export const colors = {
  // Primary - Ocean Theme
  ocean: {
    deep: '#0A1929',
    primary: '#00BCD4',
    light: '#4DD0E1',
    pale: '#B2EBF2',
  },
  
  // Surfaces
  surface: {
    dark: '#132F4C',
    medium: '#1E4976',
    light: '#1A3A5C',
  },
  
  // Status Colors
  status: {
    safe: '#4CAF50',
    warning: '#FFC107',
    critical: '#F44336',
    info: '#2196F3',
  },
  
  // Text
  text: {
    primary: '#FFFFFF',
    secondary: '#94A3B8',
    muted: '#64748B',
  },
  
  // Borders
  border: '#334155',
  borderLight: '#475569',
} as const;
```

### 3.2 Typography

Create file: `src/styles/typography.ts`

```typescript
export const typography = {
  fontFamily: {
    sans: ['Inter', 'system-ui', 'sans-serif'],
    mono: ['JetBrains Mono', 'monospace'],
    display: ['Space Grotesk', 'sans-serif'],
  },
  
  fontSize: {
    xs: '0.75rem',    // 12px
    sm: '0.875rem',   // 14px
    base: '1rem',     // 16px
    lg: '1.125rem',   // 18px
    xl: '1.25rem',    // 20px
    '2xl': '1.5rem',  // 24px
    '3xl': '1.875rem',// 30px
    '4xl': '2.25rem', // 36px
    '5xl': '3rem',    // 48px
  },
  
  fontWeight: {
    normal: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
  },
} as const;
```

### 3.3 Spacing System

```typescript
export const spacing = {
  0: '0',
  1: '0.25rem',   // 4px
  2: '0.5rem',    // 8px
  3: '0.75rem',   // 12px
  4: '1rem',      // 16px
  5: '1.25rem',   // 20px
  6: '1.5rem',    // 24px
  8: '2rem',      // 32px
  10: '2.5rem',   // 40px
  12: '3rem',     // 48px
  16: '4rem',     // 64px
  20: '5rem',     // 80px
  24: '6rem',     // 96px
} as const;
```

### 3.4 Border Radius

```typescript
export const radius = {
  sm: '0.25rem',   // 4px
  md: '0.5rem',    // 8px
  lg: '0.75rem',   // 12px
  xl: '1rem',      // 16px
  '2xl': '1.5rem', // 24px
  full: '9999px',
} as const;
```

---

## 4. Component Architecture

### 4.1 Component Hierarchy

```
app/
├── layout.tsx              # Root layout with providers
├── page.tsx                # Main dashboard
├── globals.css             # Global styles
│
├── (routes)/
│   ├── analytics/
│   │   └── page.tsx        # Analytics page
│   ├── sensors/
│   │   └── page.tsx        # Sensor status page
│   └── settings/
│       └── page.tsx        # Settings page
│
components/
├── ui/                     # shadcn/ui components
│   ├── button.tsx
│   ├── card.tsx
│   ├── badge.tsx
│   └── ...
│
├── layout/                 # Layout components
│   ├── header.tsx          # Top navigation
│   ├── sidebar.tsx         # Left sidebar
│   └── footer.tsx          # Footer
│
├── dashboard/              # Dashboard-specific
│   ├── parameter-card.tsx  # Water parameter card
│   ├── alert-timeline.tsx  # Alert feed
│   ├── chart-section.tsx   # Charts container
│   └── forecast-panel.tsx  # AI forecast
│
├── visualization/          # 3D components
│   ├── water-scene.tsx     # Main 3D scene
│   ├── ocean-shader.tsx    # Water shader
│   └── camera-controls.tsx # 3D controls
│
├── charts/                 # Chart components
│   ├── line-chart.tsx      # Recharts wrapper
│   └── chart-card.tsx      # Chart container
│
└── common/                 # Shared components
    ├── loading-spinner.tsx
    ├── error-boundary.tsx
    └── status-indicator.tsx

hooks/
├── use-water-data.ts       # Water data hook
├── use-alerts.ts           # Alerts hook
├── use-websocket.ts        # WebSocket hook
└── use-media-query.ts      # Responsive hook

stores/
├── dashboard-store.ts      # Dashboard state
├── theme-store.ts          # Theme state
└── user-store.ts           # User preferences

lib/
├── utils.ts                # Utilities
├── api-client.ts           # API client
└── constants.ts            # App constants

types/
├── water-data.ts           # Data types
├── alerts.ts               # Alert types
└── index.ts                # Type exports
```

### 4.2 Component Specifications

#### Parameter Card Component

**File:** `src/components/dashboard/parameter-card.tsx`

**Visual Design:**
```
┌─────────────────────────────────────┐
│ [Icon]  Parameter Name        [●]   │ ← Header
├─────────────────────────────────────┤
│                                     │
│           24.5°C                    │ ← Value (32px)
│           ──────                    │
│     Normal range: 20-28°C           │ ← Range
│     ↑ 2.3°C from yesterday          │ ← Trend
│                                     │
└─────────────────────────────────────┘
```

**Implementation:**

Step 1: Create directory
```bash
mkdir -p src/components/dashboard
```

Step 2: Write component
```tsx
'use client';

import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';

interface ParameterCardProps {
  title: string;
  value: number;
  unit: string;
  status: 'normal' | 'warning' | 'critical';
  range: { min: number; max: number };
  trend: number;
  icon: LucideIcon;
  color: string;
}

export function ParameterCard({
  title,
  value,
  unit,
  status,
  range,
  trend,
  icon: Icon,
  color,
}: ParameterCardProps) {
  const statusColors = {
    normal: 'bg-green-500',
    warning: 'bg-yellow-500',
    critical: 'bg-red-500',
  };

  return (
    <Card className="p-5 bg-[#132F4C] border-[#334155] hover:scale-[1.02] transition-transform duration-200">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div 
            className="p-2 rounded-lg"
            style={{ backgroundColor: `${color}20` }}
          >
            <Icon className="w-5 h-5" style={{ color }} />
          </div>
          <span className="text-sm font-medium text-gray-300">{title}</span>
        </div>
        <div className={cn('w-2.5 h-2.5 rounded-full', statusColors[status])} />
      </div>

      {/* Value */}
      <div className="mb-3">
        <span className="text-3xl font-bold font-mono text-white">
          {value.toFixed(1)}
        </span>
        <span className="text-lg text-gray-400 ml-1">{unit}</span>
      </div>

      {/* Range & Trend */}
      <div className="space-y-1">
        <p className="text-xs text-gray-500">
          Normal range: {range.min}-{range.max}{unit}
        </p>
        <p className={cn(
          'text-xs font-medium',
          trend > 0 ? 'text-green-400' : trend < 0 ? 'text-red-400' : 'text-gray-400'
        )}>
          {trend > 0 ? '↑' : trend < 0 ? '↓' : '→'} {Math.abs(trend).toFixed(1)}{unit} from avg
        </p>
      </div>
    </Card>
  );
}
```

#### Alert Timeline Component

**File:** `src/components/dashboard/alert-timeline.tsx`

**Visual Design:**
```
┌─────────────────────────────────┐
│ 🔴 Critical                    │
│ pH dropped below 6.5           │
│ 2 minutes ago • pH: 6.2        │
└─────────────────────────────────┘
```

**Implementation:**

```tsx
'use client';

import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';

interface Alert {
  id: string;
  type: 'critical' | 'warning' | 'info';
  message: string;
  parameter: string;
  value: number;
  timestamp: Date;
}

interface AlertTimelineProps {
  alerts: Alert[];
}

const alertStyles = {
  critical: {
    badge: 'bg-red-500 text-white',
    border: 'border-red-500/30',
  },
  warning: {
    badge: 'bg-yellow-500 text-black',
    border: 'border-yellow-500/30',
  },
  info: {
    badge: 'bg-blue-500 text-white',
    border: 'border-blue-500/30',
  },
};

export function AlertTimeline({ alerts }: AlertTimelineProps) {
  return (
    <div className="bg-[#132F4C] rounded-xl border border-[#334155] p-4">
      <h3 className="text-sm font-semibold text-white mb-4">Alert Timeline</h3>
      
      <ScrollArea className="h-[400px]">
        <div className="space-y-3">
          {alerts.map((alert) => (
            <div
              key={alert.id}
              className={cn(
                'p-3 rounded-lg border transition-all hover:translate-x-1',
                alertStyles[alert.type].border,
                'bg-[#0A1929]/50'
              )}
            >
              <div className="flex items-center gap-2 mb-1">
                <span className={cn(
                  'text-[10px] font-bold px-2 py-0.5 rounded uppercase',
                  alertStyles[alert.type].badge
                )}>
                  {alert.type}
                </span>
              </div>
              
              <p className="text-sm text-gray-200 mb-1">{alert.message}</p>
              
              <p className="text-xs text-gray-500">
                {formatDistanceToNow(alert.timestamp, { addSuffix: true })} • {alert.parameter}: {alert.value}
              </p>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
```

---

## 5. Page Structure

### 5.1 Dashboard Layout

**File:** `src/app/layout.tsx`

```tsx
import type { Metadata } from 'next';
import { Inter, JetBrains_Mono, Space_Grotesk } from 'next/font/google';
import './globals.css';
import { ThemeProvider } from '@/components/providers/theme-provider';
import { Header } from '@/components/layout/header';
import { Sidebar } from '@/components/layout/sidebar';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });
const jetbrains = JetBrains_Mono({ subsets: ['latin'], variable: '--font-mono' });
const spaceGrotesk = Space_Grotesk({ subsets: ['latin'], variable: '--font-display' });

export const metadata: Metadata = {
  title: 'AquaSense - Water Quality Monitor',
  description: 'Digital twin water body monitoring system',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.variable} ${jetbrains.variable} ${spaceGrotesk.variable} font-sans`}>
        <ThemeProvider>
          <div className="min-h-screen bg-[#0A1929] text-white">
            <Header />
            <div className="flex">
              <Sidebar />
              <main className="flex-1 p-6">
                {children}
              </main>
            </div>
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}
```

### 5.2 Main Dashboard Page

**File:** `src/app/page.tsx`

```tsx
'use client';

import { ParameterCard } from '@/components/dashboard/parameter-card';
import { AlertTimeline } from '@/components/dashboard/alert-timeline';
import { ChartSection } from '@/components/dashboard/chart-section';
import { ForecastPanel } from '@/components/dashboard/forecast-panel';
import { WaterScene } from '@/components/visualization/water-scene';
import { SensorStatus } from '@/components/dashboard/sensor-status';
import { 
  Thermometer, 
  FlaskConical, 
  Eye, 
  Wind, 
  Ruler 
} from 'lucide-react';

const parameters = [
  {
    id: 'temperature',
    title: 'Temperature',
    value: 24.5,
    unit: '°C',
    status: 'normal' as const,
    range: { min: 20, max: 28 },
    trend: 2.3,
    icon: Thermometer,
    color: '#FF6B6B',
  },
  {
    id: 'ph',
    title: 'pH Level',
    value: 7.2,
    unit: '',
    status: 'normal' as const,
    range: { min: 6.5, max: 8.5 },
    trend: 0.1,
    icon: FlaskConical,
    color: '#4ECDC4',
  },
  {
    id: 'turbidity',
    title: 'Turbidity',
    value: 15.3,
    unit: 'NTU',
    status: 'normal' as const,
    range: { min: 0, max: 50 },
    trend: -3.2,
    icon: Eye,
    color: '#FFE66D',
  },
  {
    id: 'dissolved-oxygen',
    title: 'Dissolved O2',
    value: 8.5,
    unit: 'mg/L',
    status: 'normal' as const,
    range: { min: 5, max: 12 },
    trend: 0.5,
    icon: Wind,
    color: '#95E1D3',
  },
  {
    id: 'water-level',
    title: 'Water Level',
    value: 250,
    unit: 'cm',
    status: 'normal' as const,
    range: { min: 200, max: 300 },
    trend: -5,
    icon: Ruler,
    color: '#6C5CE7',
  },
];

const mockAlerts = [
  {
    id: '1',
    type: 'critical' as const,
    message: 'pH dropped below 6.5',
    parameter: 'pH',
    value: 6.2,
    timestamp: new Date(Date.now() - 2 * 60 * 1000),
  },
  {
    id: '2',
    type: 'warning' as const,
    message: 'Temperature above normal range',
    parameter: 'Temperature',
    value: 29.5,
    timestamp: new Date(Date.now() - 15 * 60 * 1000),
  },
];

export default function DashboardPage() {
  return (
    <div className="grid grid-cols-12 gap-6">
      {/* Left Sidebar - Sensor Status */}
      <div className="col-span-2">
        <SensorStatus />
        
        {/* Alert Timeline */}
        <div className="mt-6">
          <AlertTimeline alerts={mockAlerts} />
        </div>
      </div>

      {/* Center - 3D Visualization */}
      <div className="col-span-7">
        <div className="bg-[#132F4C] rounded-xl border border-[#334155] overflow-hidden" style={{ height: '600px' }}>
          <WaterScene />
        </div>
        
        {/* Charts Section */}
        <div className="mt-6">
          <ChartSection />
        </div>
      </div>

      {/* Right Sidebar - Parameters & Forecast */}
      <div className="col-span-3 space-y-4">
        {parameters.map((param) => (
          <ParameterCard key={param.id} {...param} />
        ))}
        
        <ForecastPanel />
      </div>
    </div>
  );
}
```

---

## 6. Implementation Roadmap

### Phase 1: Project Setup (Day 1)
- [ ] Initialize Next.js 15 project
- [ ] Install dependencies
- [ ] Configure Tailwind CSS
- [ ] Set up folder structure
- [ ] Configure fonts

### Phase 2: Design System (Day 1-2)
- [ ] Create color constants
- [ ] Create typography system
- [ ] Set up Tailwind config
- [ ] Create global styles
- [ ] Add shadcn/ui base components

### Phase 3: Layout Components (Day 2)
- [ ] Header component
- [ ] Sidebar navigation
- [ ] Layout wrapper
- [ ] Page structure

### Phase 4: Dashboard Components (Day 3-4)
- [ ] Parameter cards
- [ ] Alert timeline
- [ ] Sensor status panel
- [ ] Forecast panel
- [ ] Status indicators

### Phase 5: 3D Visualization (Day 4-6)
- [ ] Three.js scene setup
- [ ] Ocean shader implementation
- [ ] Camera controls
- [ ] Parameter mapping to visuals
- [ ] Anomaly visualization

### Phase 6: Charts (Day 6-7)
- [ ] Recharts integration
- [ ] Line chart component
- [ ] Chart containers
- [ ] Time range selector
- [ ] Real-time updates

### Phase 7: State Management (Day 7-8)
- [ ] Zustand store setup
- [ ] Data fetching hooks
- [ ] WebSocket connection
- [ ] Real-time updates

### Phase 8: Polish (Day 8-10)
- [ ] Animations (Framer Motion)
- [ ] Loading states
- [ ] Error handling
- [ ] Responsive design
- [ ] Accessibility

---

## 7. Step-by-Step Implementation

### Step 1: Initialize Project

```bash
# Create project with Next.js 15
echo "my-app" | npx shadcn@latest init --yes --template next --base-color slate

# Or manually:
npx create-next-app@latest aquasense-client --typescript --tailwind --eslint --app --src-dir --import-alias "@/*"

cd aquasense-client

# Install shadcn/ui components
npx shadcn add button card badge scroll-area separator skeleton

# Install additional dependencies
npm install three @react-three/fiber @react-three/drei
npm install recharts
npm install framer-motion
npm install zustand
npm install lucide-react
npm install date-fns
npm install clsx tailwind-merge

# Install types
npm install -D @types/three
```

### Step 2: Configure Tailwind

**File:** `tailwind.config.ts`

```typescript
import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        ocean: {
          deep: '#0A1929',
          primary: '#00BCD4',
          light: '#4DD0E1',
          pale: '#B2EBF2',
        },
        surface: {
          dark: '#132F4C',
          medium: '#1E4976',
          light: '#1A3A5C',
        },
        status: {
          safe: '#4CAF50',
          warning: '#FFC107',
          critical: '#F44336',
          info: '#2196F3',
        },
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'monospace'],
        display: ['var(--font-display)', 'sans-serif'],
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'alert-pulse': 'alertPulse 2s ease-in-out infinite',
      },
      keyframes: {
        alertPulse: {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(244, 67, 54, 0.4)' },
          '50%': { boxShadow: '0 0 0 10px rgba(244, 67, 54, 0)' },
        },
      },
    },
  },
  plugins: [],
};

export default config;
```

### Step 3: Create Utility Functions

**File:** `src/lib/utils.ts`

```typescript
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatValue(value: number, decimals: number = 1): string {
  return value.toFixed(decimals);
}

export function getStatusColor(status: 'normal' | 'warning' | 'critical'): string {
  const colors = {
    normal: '#4CAF50',
    warning: '#FFC107',
    critical: '#F44336',
  };
  return colors[status];
}
```

### Step 4: Create Types

**File:** `src/types/water-data.ts`

```typescript
export interface WaterParameter {
  id: string;
  name: string;
  value: number;
  unit: string;
  min: number;
  max: number;
  optimal: { min: number; max: number };
  trend: number;
  timestamp: Date;
}

export interface WaterData {
  temperature: number;
  ph: number;
  turbidity: number;
  dissolvedOxygen: number;
  waterLevel: number;
  timestamp: Date;
}

export type ParameterStatus = 'normal' | 'warning' | 'critical';
```

**File:** `src/types/alerts.ts`

```typescript
export interface Alert {
  id: string;
  type: 'critical' | 'warning' | 'info';
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
```

### Step 5: Create Header Component

**File:** `src/components/layout/header.tsx`

```tsx
'use client';

import { Bell, User, Activity } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export function Header() {
  return (
    <header className="h-16 bg-[#0A1929] border-b border-[#334155] px-6 flex items-center justify-between">
      {/* Logo */}
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 bg-[#00BCD4] rounded-lg flex items-center justify-center">
          <Activity className="w-5 h-5 text-white" />
        </div>
        <span className="text-xl font-bold font-display text-white">
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
          <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 bg-red-500 text-white text-[10px]">
            3
          </Badge>
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
```

### Step 6: Create Sidebar Component

**File:** `src/components/layout/sidebar.tsx`

```tsx
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  BarChart3,
  Radio,
  Settings,
  HelpCircle,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

const navItems = [
  { icon: LayoutDashboard, label: 'Dashboard', href: '/' },
  { icon: BarChart3, label: 'Analytics', href: '/analytics' },
  { icon: Radio, label: 'Sensors', href: '/sensors' },
  { icon: Settings, label: 'Settings', href: '/settings' },
  { icon: HelpCircle, label: 'Help', href: '/help' },
];

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();

  return (
    <aside
      className={cn(
        'h-[calc(100vh-64px)] bg-[#0A1929] border-r border-[#334155] transition-all duration-300',
        collapsed ? 'w-20' : 'w-64'
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
                'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all',
                isActive
                  ? 'bg-[#00BCD4]/20 text-[#00BCD4]'
                  : 'text-gray-400 hover:bg-white/5 hover:text-gray-200'
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
```

### Step 7: Create Sensor Status Component

**File:** `src/components/dashboard/sensor-status.tsx`

```tsx
'use client';

import { Card } from '@/components/ui/card';
import { 
  Thermometer, 
  FlaskConical, 
  Eye, 
  Wind, 
  Ruler,
  Wifi,
  WifiOff
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface Sensor {
  id: string;
  name: string;
  icon: React.ElementType;
  status: 'online' | 'offline' | 'error';
  lastReading: string;
}

const sensors: Sensor[] = [
  { id: '1', name: 'Temperature', icon: Thermometer, status: 'online', lastReading: '24.5°C' },
  { id: '2', name: 'pH Sensor', icon: FlaskConical, status: 'online', lastReading: '7.2 pH' },
  { id: '3', name: 'Turbidity', icon: Eye, status: 'online', lastReading: '15 NTU' },
  { id: '4', name: 'Dissolved O2', icon: Wind, status: 'online', lastReading: '8.5 mg/L' },
  { id: '5', name: 'Water Level', icon: Ruler, status: 'online', lastReading: '250 cm' },
];

export function SensorStatus() {
  return (
    <Card className="p-4 bg-[#132F4C] border-[#334155]">
      <h3 className="text-sm font-semibold text-white mb-4">Sensor Status</h3>
      
      <div className="space-y-3">
        {sensors.map((sensor) => {
          const Icon = sensor.icon;
          const StatusIcon = sensor.status === 'online' ? Wifi : WifiOff;
          
          return (
            <div
              key={sensor.id}
              className="flex items-center justify-between p-2 rounded-lg bg-[#0A1929]/50"
            >
              <div className="flex items-center gap-3">
                <div className="p-1.5 bg-[#1E4976] rounded">
                  <Icon className="w-4 h-4 text-gray-300" />
                </div>
                <div>
                  <p className="text-sm text-gray-200">{sensor.name}</p>
                  <p className="text-xs text-gray-500">{sensor.lastReading}</p>
                </div>
              </div>
              
              <StatusIcon
                className={cn(
                  'w-4 h-4',
                  sensor.status === 'online' ? 'text-green-500' : 'text-red-500'
                )}
              />
            </div>
          );
        })}
      </div>
    </Card>
  );
}
```

### Step 8: Create Chart Section

**File:** `src/components/dashboard/chart-section.tsx`

```tsx
'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
} from 'recharts';
import { cn } from '@/lib/utils';

const timeRanges = ['1H', '6H', '24H', '7D'] as const;

type TimeRange = typeof timeRanges[number];

// Mock data generator
function generateData(points: number, min: number, max: number) {
  return Array.from({ length: points }, (_, i) => ({
    time: `${i}:00`,
    value: min + Math.random() * (max - min),
  }));
}

const chartConfigs = [
  {
    id: 'temperature',
    title: 'Temperature',
    color: '#FF6B6B',
    unit: '°C',
    min: 20,
    max: 30,
  },
  {
    id: 'ph',
    title: 'pH Level',
    color: '#4ECDC4',
    unit: '',
    min: 6,
    max: 9,
  },
  {
    id: 'turbidity',
    title: 'Turbidity',
    color: '#FFE66D',
    unit: 'NTU',
    min: 0,
    max: 50,
  },
  {
    id: 'oxygen',
    title: 'Dissolved O2',
    color: '#95E1D3',
    unit: 'mg/L',
    min: 5,
    max: 12,
  },
  {
    id: 'level',
    title: 'Water Level',
    color: '#6C5CE7',
    unit: 'cm',
    min: 200,
    max: 300,
  },
];

function MiniChart({ config, data }: { config: typeof chartConfigs[0]; data: any[] }) {
  return (
    <Card className="p-4 bg-[#132F4C] border-[#334155]">
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-sm font-medium text-gray-300">{config.title}</h4>
        <span className="text-xs text-gray-500">{config.unit}</span>
      </div>
      
      <div className="h-32">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <defs>
              <linearGradient id={`gradient-${config.id}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={config.color} stopOpacity={0.3} />
                <stop offset="95%" stopColor={config.color} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.5} />
            <XAxis 
              dataKey="time" 
              hide
            />
            <YAxis 
              domain={[config.min, config.max]} 
              hide
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#132F4C',
                border: '1px solid #334155',
                borderRadius: '8px',
              }}
              labelStyle={{ color: '#94A3B8' }}
              itemStyle={{ color: config.color }}
            />
            <Area
              type="monotone"
              dataKey="value"
              stroke={config.color}
              strokeWidth={2}
              fill={`url(#gradient-${config.id})`}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}

export function ChartSection() {
  const [activeRange, setActiveRange] = useState<TimeRange>('24H');
  
  const dataPoints = activeRange === '1H' ? 12 : activeRange === '6H' ? 24 : activeRange === '24H' ? 48 : 84;

  return (
    <Card className="p-6 bg-[#132F4C] border-[#334155]">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-white">Live Charts</h3>
        
        <div className="flex gap-1">
          {timeRanges.map((range) => (
            <Button
              key={range}
              variant="ghost"
              size="sm"
              onClick={() => setActiveRange(range)}
              className={cn(
                'text-xs',
                activeRange === range
                  ? 'bg-[#00BCD4]/20 text-[#00BCD4]'
                  : 'text-gray-400 hover:text-white'
              )}
            >
              {range}
            </Button>
          ))}
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-5 gap-4">
        {chartConfigs.map((config) => (
          <MiniChart
            key={config.id}
            config={config}
            data={generateData(dataPoints, config.min, config.max)}
          />
        ))}
      </div>
    </Card>
  );
}
```

### Step 9: Create Forecast Panel

**File:** `src/components/dashboard/forecast-panel.tsx`

```tsx
'use client';

import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Brain, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ForecastItem {
  parameter: string;
  current: number;
  predicted: number;
  unit: string;
  confidence: number;
}

const forecasts: ForecastItem[] = [
  { parameter: 'Temperature', current: 24.5, predicted: 26.8, unit: '°C', confidence: 94 },
  { parameter: 'pH Level', current: 7.2, predicted: 7.1, unit: '', confidence: 91 },
  { parameter: 'Turbidity', current: 15.3, predicted: 14.8, unit: 'NTU', confidence: 88 },
];

function ForecastRow({ item }: { item: ForecastItem }) {
  const change = item.predicted - item.current;
  const changePercent = ((change / item.current) * 100).toFixed(1);
  
  const TrendIcon = change > 0 ? TrendingUp : change < 0 ? TrendingDown : Minus;
  const trendColor = change > 0 ? 'text-green-400' : change < 0 ? 'text-red-400' : 'text-gray-400';

  return (
    <div className="flex items-center justify-between py-3 border-b border-[#334155] last:border-0">
      <div>
        <p className="text-sm text-gray-300">{item.parameter}</p>
        <p className="text-xs text-gray-500">Confidence: {item.confidence}%</p>
      </div>
      
      <div className="text-right">
        <p className="text-sm font-mono text-white">
          {item.predicted.toFixed(1)}{item.unit}
        </p>
        <div className={cn('flex items-center gap-1 text-xs', trendColor)}>
          <TrendIcon className="w-3 h-3" />
          <span>{change > 0 ? '+' : ''}{changePercent}%</span>
        </div>
      </div>
    </div>
  );
}

export function ForecastPanel() {
  return (
    <Card className="p-5 bg-[#132F4C] border-[#334155]">
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <div className="p-1.5 bg-purple-500/20 rounded">
          <Brain className="w-4 h-4 text-purple-400" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-white">24h Forecast</h3>
          <p className="text-xs text-gray-500">AI-Powered LSTM Model</p>
        </div>
      </div>

      {/* Forecast List */}
      <div className="space-y-1 mb-4">
        {forecasts.map((item) => (
          <ForecastRow key={item.parameter} item={item} />
        ))}
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <Button variant="outline" size="sm" className="flex-1 text-xs border-[#334155] hover:bg-white/5">
          View Report
        </Button>
        <Button variant="outline" size="sm" className="flex-1 text-xs border-[#334155] hover:bg-white/5">
          Export
        </Button>
      </div>
    </Card>
  );
}
```

### Step 10: Create 3D Water Scene

**File:** `src/components/visualization/water-scene.tsx`

```tsx
'use client';

import { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, Environment } from '@react-three/drei';
import { Ocean } from './ocean';
import { AnomalyMarkers } from './anomaly-markers';

function Scene() {
  return (
    <>
      {/* Lighting */}
      <ambientLight intensity={0.5} />
      <directionalLight position={[10, 10, 5]} intensity={1} />
      <pointLight position={[-10, -10, -10]} color="#00BCD4" intensity={0.5} />

      {/* Camera */}
      <PerspectiveCamera makeDefault position={[0, 5, 10]} fov={60} />

      {/* Ocean */}
      <Ocean />

      {/* Anomaly Markers */}
      <AnomalyMarkers />

      {/* Controls */}
      <OrbitControls
        enablePan={true}
        enableZoom={true}
        enableRotate={true}
        minDistance={5}
        maxDistance={20}
        maxPolarAngle={Math.PI / 2 - 0.1}
      />

      {/* Environment */}
      <Environment preset="sunset" />
    </>
  );
}

function LoadingFallback() {
  return (
    <div className="flex items-center justify-center h-full">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-[#00BCD4] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-gray-400">Loading water simulation...</p>
      </div>
    </div>
  );
}

export function WaterScene() {
  return (
    <div className="w-full h-full">
      <Suspense fallback={<LoadingFallback />}>
        <Canvas
          gl={{ antialias: true, alpha: true }}
          dpr={[1, 2]}
          camera={{ position: [0, 5, 10], fov: 60 }}
        >
          <Scene />
        </Canvas>
      </Suspense>
    </div>
  );
}
```

**File:** `src/components/visualization/ocean.tsx`

```tsx
'use client';

import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

// Simple water shader
const waterVertexShader = `
  uniform float uTime;
  uniform float uBigWavesElevation;
  uniform vec2 uBigWavesFrequency;
  uniform float uBigWavesSpeed;
  
  varying float vElevation;
  varying vec2 vUv;
  
  void main() {
    vUv = uv;
    
    vec4 modelPosition = modelMatrix * vec4(position, 1.0);
    
    // Big waves
    float elevation = sin(modelPosition.x * uBigWavesFrequency.x + uTime * uBigWavesSpeed) * 
                      sin(modelPosition.z * uBigWavesFrequency.y + uTime * uBigWavesSpeed) * 
                      uBigWavesElevation;
    
    // Add smaller waves for detail
    elevation += sin(modelPosition.x * 3.0 + uTime * 1.5) * 0.1;
    elevation += sin(modelPosition.z * 2.5 + uTime * 1.2) * 0.1;
    
    modelPosition.y += elevation;
    vElevation = elevation;
    
    vec4 viewPosition = viewMatrix * modelPosition;
    vec4 projectedPosition = projectionMatrix * viewPosition;
    
    gl_Position = projectedPosition;
  }
`;

const waterFragmentShader = `
  uniform vec3 uDepthColor;
  uniform vec3 uSurfaceColor;
  uniform float uColorOffset;
  uniform float uColorMultiplier;
  
  varying float vElevation;
  varying vec2 vUv;
  
  void main() {
    float mixStrength = (vElevation + uColorOffset) * uColorMultiplier;
    vec3 color = mix(uDepthColor, uSurfaceColor, mixStrength);
    
    // Add some transparency based on depth
    float alpha = 0.9 + vElevation * 0.1;
    
    gl_FragColor = vec4(color, alpha);
  }
`;

export function Ocean() {
  const meshRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<THREE.ShaderMaterial>(null);

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uBigWavesElevation: { value: 0.2 },
      uBigWavesFrequency: { value: new THREE.Vector2(0.4, 0.2) },
      uBigWavesSpeed: { value: 0.75 },
      uDepthColor: { value: new THREE.Color('#0A1929') },
      uSurfaceColor: { value: new THREE.Color('#00BCD4') },
      uColorOffset: { value: 0.08 },
      uColorMultiplier: { value: 3.0 },
    }),
    []
  );

  useFrame((state) => {
    if (materialRef.current) {
      materialRef.current.uniforms.uTime.value = state.clock.elapsedTime;
    }
  });

  return (
    <mesh ref={meshRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, -1, 0]}>
      <planeGeometry args={[20, 20, 128, 128]} />
      <shaderMaterial
        ref={materialRef}
        vertexShader={waterVertexShader}
        fragmentShader={waterFragmentShader}
        uniforms={uniforms}
        transparent
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}
```

**File:** `src/components/visualization/anomaly-markers.tsx`

```tsx
'use client';

import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { AlertTriangle } from 'lucide-react';

interface Anomaly {
  id: string;
  type: 'critical' | 'warning' | 'info';
  parameter: string;
  value: number;
  position: [number, number, number];
}

const anomalies: Anomaly[] = [
  {
    id: '1',
    type: 'critical',
    parameter: 'pH',
    value: 6.2,
    position: [2, 0.5, 1],
  },
  {
    id: '2',
    type: 'warning',
    parameter: 'Temperature',
    value: 29.5,
    position: [-1.5, 0.5, -2],
  },
];

function Marker({ anomaly }: { anomaly: Anomaly }) {
  const groupRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (groupRef.current) {
      // Floating animation
      groupRef.current.position.y = anomaly.position[1] + Math.sin(state.clock.elapsedTime * 2) * 0.1;
      
      // Pulse scale animation
      const scale = 1 + Math.sin(state.clock.elapsedTime * 3) * 0.1;
      groupRef.current.scale.set(scale, scale, scale);
    }
  });

  const color = anomaly.type === 'critical' ? '#F44336' : anomaly.type === 'warning' ? '#FFC107' : '#2196F3';

  return (
    <group ref={groupRef} position={anomaly.position}>
      {/* Glow ring */}
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.3, 0.35, 32]} />
        <meshBasicMaterial color={color} transparent opacity={0.5} />
      </mesh>
      
      {/* Vertical line to water */}
      <mesh position={[0, -0.5, 0]}>
        <cylinderGeometry args={[0.02, 0.02, 1, 8]} />
        <meshBasicMaterial color={color} transparent opacity={0.3} />
      </mesh>
      
      {/* Label */}
      <Html distanceFactor={10}>
        <div
          className="px-2 py-1 rounded text-xs font-bold whitespace-nowrap"
          style={{
            backgroundColor: color,
            color: anomaly.type === 'warning' ? '#000' : '#fff',
          }}
        >
          <div className="flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" />
            <span>{anomaly.parameter}: {anomaly.value}</span>
          </div>
        </div>
      </Html>
    </group>
  );
}

export function AnomalyMarkers() {
  return (
    <>
      {anomalies.map((anomaly) => (
        <Marker key={anomaly.id} anomaly={anomaly} />
      ))}
    </>
  );
}
```

### Step 11: Create Zustand Store

**File:** `src/stores/dashboard-store.ts`

```typescript
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

interface WaterData {
  temperature: number;
  ph: number;
  turbidity: number;
  dissolvedOxygen: number;
  waterLevel: number;
  timestamp: Date;
}

interface Alert {
  id: string;
  type: 'critical' | 'warning' | 'info';
  message: string;
  parameter: string;
  value: number;
  timestamp: Date;
  acknowledged: boolean;
}

interface DashboardState {
  // Data
  currentData: WaterData | null;
  historicalData: WaterData[];
  alerts: Alert[];
  
  // UI State
  selectedParameter: string | null;
  timeRange: '1H' | '6H' | '24H' | '7D';
  isLive: boolean;
  
  // Actions
  setCurrentData: (data: WaterData) => void;
  addHistoricalData: (data: WaterData) => void;
  addAlert: (alert: Alert) => void;
  acknowledgeAlert: (id: string) => void;
  setSelectedParameter: (id: string | null) => void;
  setTimeRange: (range: '1H' | '6H' | '24H' | '7D') => void;
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
      timeRange: '24H',
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
    { name: 'DashboardStore' }
  )
);
```

### Step 12: Global Styles

**File:** `src/app/globals.css`

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  --background: #0A1929;
  --foreground: #FFFFFF;
}

@layer base {
  * {
    @apply border-border;
  }
  
  body {
    @apply bg-ocean-deep text-white antialiased;
    font-feature-settings: "rlig" 1, "calt" 1;
  }
  
  /* Custom scrollbar */
  ::-webkit-scrollbar {
    width: 8px;
    height: 8px;
  }
  
  ::-webkit-scrollbar-track {
    @apply bg-ocean-deep;
  }
  
  ::-webkit-scrollbar-thumb {
    @apply bg-surface-medium rounded-full;
  }
  
  ::-webkit-scrollbar-thumb:hover {
    @apply bg-[#4DD0E1];
  }
}

@layer utilities {
  /* Glow effects */
  .glow-aqua {
    box-shadow: 0 0 20px rgba(0, 188, 212, 0.3);
  }
  
  .glow-green {
    box-shadow: 0 0 20px rgba(76, 175, 80, 0.3);
  }
  
  .glow-red {
    box-shadow: 0 0 20px rgba(244, 67, 54, 0.3);
  }
  
  /* Text gradient */
  .text-gradient-aqua {
    background: linear-gradient(135deg, #00BCD4 0%, #4DD0E1 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
  }
  
  /* Glass effect */
  .glass {
    background: rgba(19, 47, 76, 0.7);
    backdrop-filter: blur(10px);
  }
}

/* Animation keyframes */
@keyframes pulse-ring {
  0% {
    transform: scale(0.8);
    opacity: 1;
  }
  100% {
    transform: scale(1.3);
    opacity: 0;
  }
}

@keyframes shimmer {
  0% {
    background-position: -200% 0;
  }
  100% {
    background-position: 200% 0;
  }
}

.animate-pulse-ring {
  animation: pulse-ring 1.5s ease-out infinite;
}

.animate-shimmer {
  background: linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent);
  background-size: 200% 100%;
  animation: shimmer 2s infinite;
}
```

---

## 8. 3D Visualization Design

### 8.1 Visual Parameter Mapping

| Parameter | Visual Effect | Implementation |
|-----------|---------------|----------------|
| **Temperature** | Water color warmth | Fragment shader color interpolation |
| **pH** | Color tint overlay | Post-processing tint |
| **Turbidity** | Water transparency | Alpha channel in shader |
| **Dissolved O2** | Particle glow | Point lights in scene |
| **Water Level** | Wave amplitude | Vertex shader uniform |

### 8.2 Shader Uniforms

```typescript
interface WaterUniforms {
  uTime: number;                    // Animation time
  uBigWavesElevation: number;       // Wave height (0.1 - 1.0)
  uBigWavesFrequency: Vector2;      // Wave frequency
  uBigWavesSpeed: number;           // Animation speed
  uDepthColor: Color;               // Deep water color
  uSurfaceColor: Color;             // Surface water color
  uTemperature: number;             // Temperature for color shift
  uTurbidity: number;               // Transparency level
}
```

### 8.3 Camera Controls

- **Orbit**: Left mouse drag
- **Pan**: Right mouse drag
- **Zoom**: Mouse wheel
- **Reset**: Double click
- **Focus**: Click parameter card

---

## 9. Responsive Design

### 9.1 Breakpoints

```typescript
const breakpoints = {
  sm: '640px',   // Mobile landscape
  md: '768px',   // Tablet
  lg: '1024px',  // Desktop
  xl: '1280px',  // Large desktop
  '2xl': '1536px', // Extra large
};
```

### 9.2 Layout Adaptations

**Desktop (lg+):**
- 3-column layout
- Full sidebar visible
- All charts in row

**Tablet (md-lg):**
- 2-column layout
- Collapsible sidebar
- Charts in 2 rows

**Mobile (<md):**
- Single column
- Bottom navigation
- Charts as tabs

---

## 10. Accessibility

### 10.1 WCAG 2.1 AA Requirements

- ✅ **Color Contrast**: 4.5:1 minimum for text
- ✅ **Keyboard Navigation**: Full keyboard operability
- ✅ **Screen Reader**: ARIA labels on all interactive elements
- ✅ **Focus Indicators**: Visible focus states
- ✅ **Motion**: Respect `prefers-reduced-motion`

### 10.2 Keyboard Shortcuts

```typescript
const keyboardShortcuts = {
  'Ctrl+1': 'Focus temperature card',
  'Ctrl+2': 'Focus pH card',
  'Ctrl+3': 'Focus turbidity card',
  'Ctrl+4': 'Focus oxygen card',
  'Ctrl+5': 'Focus level card',
  'Ctrl+D': 'Focus 3D view',
  'Ctrl+A': 'Open alerts',
  'Space': 'Play/pause simulation',
  'Escape': 'Close modals/panels',
};
```

---

## 11. Performance Optimization

### 11.1 Code Splitting

```typescript
// Lazy load 3D scene
const WaterScene = dynamic(
  () => import('@/components/visualization/water-scene'),
  { 
    ssr: false,
    loading: () => <LoadingSpinner />
  }
);

// Lazy load charts
const ChartSection = dynamic(
  () => import('@/components/dashboard/chart-section'),
  { ssr: false }
);
```

### 11.2 Memoization

```typescript
// Memoize expensive calculations
const chartData = useMemo(() => {
  return processData(rawData, timeRange);
}, [rawData, timeRange]);

// Memoize callbacks
const handleParameterClick = useCallback((id: string) => {
  setSelectedParameter(id);
}, []);
```

### 11.3 Performance Targets

| Metric | Target |
|--------|--------|
| First Contentful Paint | < 1.5s |
| Time to Interactive | < 3s |
| 3D Scene Load | < 2s |
| Chart Render | 60fps |
| Memory Usage | < 100MB |

---

## 12. Testing Strategy

### 12.1 Component Testing

```typescript
// ParameterCard.test.tsx
import { render, screen } from '@testing-library/react';
import { ParameterCard } from './parameter-card';

describe('ParameterCard', () => {
  it('renders parameter value correctly', () => {
    render(<ParameterCard {...mockProps} />);
    expect(screen.getByText('24.5')).toBeInTheDocument();
  });
  
  it('shows correct status color', () => {
    render(<ParameterCard {...mockProps} status="critical" />);
    expect(screen.getByTestId('status-indicator')).toHaveClass('bg-red-500');
  });
});
```

### 12.2 E2E Testing

```typescript
// dashboard.spec.ts
test('user can view all parameters', async ({ page }) => {
  await page.goto('/');
  
  await expect(page.getByText('Temperature')).toBeVisible();
  await expect(page.getByText('pH Level')).toBeVisible();
  await expect(page.getByText('Turbidity')).toBeVisible();
});

test('3D scene loads and is interactive', async ({ page }) => {
  await page.goto('/');
  
  const canvas = page.locator('canvas');
  await expect(canvas).toBeVisible();
  
  // Test orbit controls
  await canvas.dragTo(canvas, { targetPosition: { x: 100, y: 100 } });
});
```

---

## Summary

This document provides a complete implementation guide for the AquaSense frontend:

1. **Design System**: Colors, typography, spacing, and components
2. **Component Architecture**: Organized, reusable component structure
3. **Step-by-Step Implementation**: Detailed code for each component
4. **3D Visualization**: Three.js water scene with parameter mapping
5. **Responsive Design**: Mobile, tablet, and desktop layouts
6. **Accessibility**: WCAG 2.1 AA compliant
7. **Performance**: Optimization techniques and targets
8. **Testing**: Component, E2E, and visual testing strategies

All code is ready to implement with the latest Next.js 15, React 19, and TypeScript.

---

**Document End**
