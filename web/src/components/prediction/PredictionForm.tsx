"use client";

import React, { useId, useState } from "react";
import { ForecastResults } from "./ForecastResults";

export default function PredictionForm() {
  const forecastAmountId = useId();
  const forecastUnitId = useId();
  const forecastHelpId = useId();
  const forecastStatusId = useId();

  const [forecastAmount, setForecastAmount] = useState<string>("2");
  const [forecastUnit, setForecastUnit] = useState<"d" | "m" | "y">("d");
  const [forecastLoading, setForecastLoading] = useState(false);
  const [forecastError, setForecastError] = useState<string | null>(null);
  const [forecastResults, setForecastResults] = useState<any | null>(null);

  function parseForecastPeriod(amountValue: string, unitValue: "d" | "m" | "y") {
    const amount = Number(amountValue.trim());

    if (!Number.isFinite(amount) || amount <= 0) {
      return null;
    }

    const totalDays = amount * (unitValue === "d" ? 1 : unitValue === "m" ? 30 : 365);
    return { amount, unit: unitValue, totalDays, period: `${amount}${unitValue}` };
  }

  async function runForecast() {
    setForecastError(null);

    const parsed = parseForecastPeriod(forecastAmount, forecastUnit);
    if (!parsed) {
      setForecastError("Enter a valid positive number for the forecast horizon.");
      return;
    }

    setForecastLoading(true);
    try {
      const resp = await fetch("/api/forecast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ period: parsed.period }),
      });
      if (!resp.ok) {
        const data = await resp.json();
        throw new Error(data.error || `Request failed with status ${resp.status}`);
      }
      const data = await resp.json();
      setForecastResults(data);
    } catch (e: any) {
      setForecastError(e.message || String(e));
    } finally {
      setForecastLoading(false);
    }
  }

  function clearForecast() {
    setForecastResults(null);
    setForecastError(null);
  }

  const selectedHorizon = (() => {
    const parsed = parseForecastPeriod(forecastAmount, forecastUnit);
    if (!parsed) {
      return "n/a";
    }

    const unitLabel = forecastUnit === "d" ? "days" : forecastUnit === "m" ? "months" : "years";
    return `${parsed.amount} ${unitLabel}`;
  })();

  return (
    <div className="rounded-3xl border border-white/10 bg-slate-950/80 p-6 shadow-[0_0_0_1px_rgba(0,255,168,0.08),0_24px_80px_rgba(0,0,0,0.45)] backdrop-blur-xl">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold text-white">Forecast by time period</h3>
          <p className="mt-1 text-sm text-slate-400">Pick a number and unit, then preview the curve with a cleaner timeline.</p>
        </div>
        <div className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-xs font-medium text-emerald-200">
          {selectedHorizon}
        </div>
      </div>

      <div className="mt-6 border-t border-white/10 pt-6">
        <fieldset className="mb-4" aria-describedby={forecastHelpId}>
          <legend className="sr-only">Forecast horizon picker</legend>
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <label htmlFor={forecastAmountId} className="mb-2 block text-sm text-slate-300">
                Forecast amount
              </label>
              <input
                id={forecastAmountId}
                type="number"
                min="1"
                step="1"
                inputMode="numeric"
                autoComplete="off"
                spellCheck={false}
                placeholder="e.g. 18"
                aria-describedby={`${forecastHelpId} ${forecastStatusId}`}
                className="w-28 rounded-xl border border-white/10 bg-slate-900/80 px-3 py-2 text-sm text-white outline-none transition focus:border-cyan-400/70 focus:ring-2 focus:ring-cyan-400/30"
                value={forecastAmount}
                onChange={(e) => setForecastAmount(e.target.value)}
              />
            </div>

            <div>
              <label htmlFor={forecastUnitId} className="mb-2 block text-sm text-slate-300">
                Unit
              </label>
              <select
                id={forecastUnitId}
                aria-describedby={`${forecastHelpId} ${forecastStatusId}`}
                className="w-36 rounded-xl border border-white/10 bg-slate-900/80 px-3 py-2 text-sm text-white outline-none transition focus:border-emerald-400/70 focus:ring-2 focus:ring-emerald-400/30"
                value={forecastUnit}
                onChange={(e) => setForecastUnit(e.target.value as "d" | "m" | "y")}
              >
                <option value="d">Days</option>
                <option value="m">Months</option>
                <option value="y">Years</option>
              </select>
            </div>
          </div>

          <div className="mt-3 flex items-center justify-between gap-4">
            <p id={forecastHelpId} className="text-xs text-slate-400">
              Pick a numeric horizon and a unit. The request will be sent as a compact period string.
            </p>
            <div id={forecastStatusId} className="min-w-fit text-xs text-slate-400" aria-live="polite">
              {`Selected horizon: ${selectedHorizon}`}
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              onClick={runForecast}
              disabled={forecastLoading}
              className="rounded-xl bg-gradient-to-r from-emerald-400 via-cyan-400 to-blue-400 px-4 py-2 font-medium text-slate-950 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-emerald-300/70"
            >
              {forecastLoading ? "Forecasting..." : "Run Forecast"}
            </button>
            <button
              onClick={clearForecast}
              className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-cyan-300/70"
            >
              Clear Forecast
            </button>
          </div>
        </fieldset>

          {forecastError && (
            <div 
              className="mt-4 flex items-start gap-3 rounded-xl border border-red-500/30 bg-red-950/25 p-4 text-red-300" 
              role="alert" 
              aria-live="assertive"
            >
              <div className="text-xl mt-0.5">⚠️</div>
              <div className="flex-1">
                <p className="font-semibold text-red-200">Forecast Error</p>
                <p className="text-sm text-red-300 mt-1">{forecastError}</p>
              </div>
            </div>
          )}
        {forecastResults && <ForecastResults results={forecastResults} />}
      </div>
    </div>
  );
}
