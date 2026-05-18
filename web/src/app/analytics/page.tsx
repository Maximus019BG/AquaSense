"use client";

import PredictionForm from "~/components/prediction/PredictionForm";
import { ForecastPanel } from "~/components/dashboard/forecast-panel";

export default function AnalyticsPage() {
  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-white/10 bg-slate-950/80 p-6 shadow-[0_24px_80px_rgba(0,0,0,0.35)] backdrop-blur-xl">
        <div className="max-w-3xl">
          <p className="text-xs uppercase tracking-[0.3em] text-cyan-300/80">Analytics</p>
          <h1 className="mt-2 text-3xl font-semibold text-white sm:text-4xl">Forecast modeling and trend analysis</h1>
          <p className="mt-3 text-sm leading-6 text-slate-400">
            Generate forecasts, inspect the unified trend graph, and review the feature-level values on a dedicated analytics surface.
          </p>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-12">
        <div className="lg:col-span-3">
          <ForecastPanel />
        </div>

        <div className="lg:col-span-9">
          <div className="rounded-3xl border border-white/10 bg-slate-950/70 p-4 shadow-[0_22px_70px_rgba(0,0,0,0.35)] backdrop-blur-xl sm:p-6">
            <h2 className="mb-4 text-lg font-semibold text-white">Prediction Form</h2>
            <PredictionForm />
          </div>
        </div>
      </div>
    </div>
  );
}