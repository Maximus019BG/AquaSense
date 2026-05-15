"use client";

import React, { useId, useState } from "react";
import { ForecastResults } from "./ForecastResults";

export default function PredictionForm() {
  const forecastPeriodId = useId();
  const forecastHelpId = useId();
  const forecastStatusId = useId();

  const [forecastPeriod, setForecastPeriod] = useState<string>("2d");
  const [forecastLoading, setForecastLoading] = useState(false);
  const [forecastError, setForecastError] = useState<string | null>(null);
  const [forecastResults, setForecastResults] = useState<any | null>(null);

  function parseForecastPeriod(value: string) {
    const match = /^(\d+)([hdwmy])$/.exec(value.trim().toLowerCase());
    if (!match) return null;

    const amount = Number(match[1]);
    const unit = match[2];
    const unitToDays: Record<string, number> = {
      h: 1 / 24,
      d: 1,
      w: 7,
      m: 30,
      y: 365,
    };

    const totalDays = amount * unitToDays[unit];
    return { amount, unit, totalDays };
  }

  async function runForecast() {
    setForecastError(null);

    const normalizedPeriod = forecastPeriod.trim().toLowerCase();
    const parsed = parseForecastPeriod(normalizedPeriod);
    if (!parsed) {
      setForecastError("Enter a valid horizon like 5d, 18w, 3m, or 2y.");
      return;
    }

    if (parsed.totalDays > 365) {
      setForecastError("Maximum forecast horizon is 1 year.");
      return;
    }

    setForecastLoading(true);
    try {
      const resp = await fetch("/api/forecast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ period: normalizedPeriod }),
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

  return (
    <div className="p-6 bg-[#0F2636] border border-[#223645] rounded-xl">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white">Forecast by time period</h3>
        <div className="text-sm text-gray-400">Type any horizon and request predictions for all features from the LSTM endpoint</div>
      </div>

      <div className="mt-6 pt-6 border-t border-[#233741]">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h4 className="text-base font-semibold text-white">Forecast horizon</h4>
            <p className="text-sm text-gray-400">Type any horizon you want, then request predictions for all features from the LSTM endpoint. Short horizons show hourly detail, month-scale horizons show weekly detail, and year-scale horizons show monthly detail.</p>
          </div>
        </div>

        <fieldset className="mb-4" aria-describedby={forecastHelpId}>
          <legend className="sr-only">Forecast horizon picker</legend>
          <label htmlFor={forecastPeriodId} className="block text-sm text-gray-300 mb-2">
              Forecast horizon
          </label>
          <input
            id={forecastPeriodId}
              type="text"
              inputMode="text"
              autoComplete="off"
              spellCheck={false}
              placeholder="e.g. 5d, 18w, 3m, 2y"
            aria-describedby={`${forecastHelpId} ${forecastStatusId}`}
              className="w-full p-2 bg-[#132F4C] rounded border border-[#334155] text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#6EE7B7]/70 focus:border-[#6EE7B7]"
              value={forecastPeriod}
              onChange={(e) => setForecastPeriod(e.target.value)}
          />

          <div className="mt-3 flex items-center justify-between gap-4">
            <p id={forecastHelpId} className="text-xs text-gray-400">
                Enter a horizon with a number and a unit, for example 5d, 18w, 3m, or 1y. Maximum horizon is 1 year.
            </p>
            <div id={forecastStatusId} className="text-xs text-gray-400 min-w-fit" aria-live="polite">
                {`Selected horizon: ${forecastPeriod || "n/a"}`}
            </div>
          </div>

          <div className="mt-3 flex gap-2">
            <button
              onClick={runForecast}
              disabled={forecastLoading}
              className="px-4 py-2 bg-[#6EE7B7] text-black rounded disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-[#6EE7B7]/70"
            >
              {forecastLoading ? "Forecasting..." : "Run Forecast"}
            </button>
            <button
              onClick={clearForecast}
              className="px-3 py-2 bg-[#334155] text-white rounded focus:outline-none focus:ring-2 focus:ring-[#93C5FD]/70"
            >
              Clear Forecast
            </button>
          </div>
        </fieldset>

          {forecastError && (
            <div 
              className="mt-4 p-4 bg-red-900/20 border border-red-700 rounded-lg text-red-300 flex items-start gap-3" 
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
