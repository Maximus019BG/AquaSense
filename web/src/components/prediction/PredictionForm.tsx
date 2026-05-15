"use client";

import React, { useState } from "react";
import { PredictionResults } from "./PredictionResults";

type Reading = {
  timestamp: string;
  temperature_C: number | null;
  dissolved_o2: number | null;
  salinity_psu: number | null;
  sea_level_m: number | null;
};

export default function PredictionForm() {
  const [readings, setReadings] = useState<Reading[]>([]);
  const [timestamp, setTimestamp] = useState<string>(new Date().toISOString());
  const [temperature, setTemperature] = useState<string>("");
  const [dissolved, setDissolved] = useState<string>("");
  const [salinity, setSalinity] = useState<string>("");
  const [level, setLevel] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<any | null>(null);

  function addReading() {
    const r: Reading = {
      timestamp,
      temperature_C: temperature === "" ? null : Number(temperature),
      dissolved_o2: dissolved === "" ? null : Number(dissolved),
      salinity_psu: salinity === "" ? null : Number(salinity),
      sea_level_m: level === "" ? null : Number(level),
    };

    setReadings((s: Reading[]) => [...s, r]);
    // reset some inputs
    const next = new Date(new Date(timestamp).getTime() + 60 * 60 * 1000);
    setTimestamp(next.toISOString());
    setTemperature("");
    setDissolved("");
    setSalinity("");
    setLevel("");
  }

  async function submit() {
    setError(null);
    if (readings.length === 0) {
      setError("Add at least one reading before submitting.");
      return;
    }
    setLoading(true);
    try {
      const resp = await fetch("/api/predict", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "inline", series: readings }),
      });
      if (!resp.ok) {
        const txt = await resp.text();
        throw new Error(`Request failed: ${txt}`);
      }
      const data = await resp.json();
      setResults(data);
    } catch (e: any) {
      setError(e.message || String(e));
    } finally {
      setLoading(false);
    }
  }

  function clear() {
    setReadings([]);
    setResults(null);
    setError(null);
  }

  return (
    <div className="p-6 bg-[#0F2636] border border-[#223645] rounded-xl">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white">Prediction (inline)</h3>
        <div className="text-sm text-gray-400">Model inference via inline series</div>
      </div>

      <div className="grid grid-cols-6 gap-3 mb-4">
        <input
          className="col-span-2 p-2 bg-[#132F4C] rounded border border-[#334155] text-sm text-white"
          value={timestamp}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTimestamp(e.target.value)}
        />

        <input
          placeholder="Temperature °C"
          className="p-2 bg-[#132F4C] rounded border border-[#334155] text-sm text-white"
          value={temperature}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTemperature(e.target.value)}
        />
        <input
          placeholder="Dissolved O2"
          className="p-2 bg-[#132F4C] rounded border border-[#334155] text-sm text-white"
          value={dissolved}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDissolved(e.target.value)}
        />
        <input
          placeholder="Salinity PSU"
          className="p-2 bg-[#132F4C] rounded border border-[#334155] text-sm text-white"
          value={salinity}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSalinity(e.target.value)}
        />
        <input
          placeholder="Sea level m"
          className="p-2 bg-[#132F4C] rounded border border-[#334155] text-sm text-white"
          value={level}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setLevel(e.target.value)}
        />
      </div>

      <div className="flex gap-2 mb-4">
        <button
          onClick={addReading}
          className="px-4 py-2 bg-[#00BCD4]/20 text-[#00BCD4] rounded"
        >
          Add Reading
        </button>
        <button
          onClick={submit}
          disabled={loading}
          className="px-4 py-2 bg-[#6EE7B7] text-black rounded disabled:opacity-50"
        >
          {loading ? "Running..." : "Run Prediction"}
        </button>
        <button onClick={clear} className="px-3 py-2 bg-[#334155] text-white rounded">
          Clear
        </button>
      </div>

      {error && <div className="text-sm text-red-400 mb-3">{error}</div>}

      <div className="mb-4">
        <h4 className="text-sm text-gray-300 mb-2">Queued Readings ({readings.length})</h4>
        <div className="max-h-40 overflow-auto bg-[#071822] p-3 rounded border border-[#233741]">
          {readings.length === 0 && <div className="text-gray-500">No readings yet</div>}
          {readings.map((r, i) => (
            <div key={i} className="text-sm text-gray-200 mb-1">
              <strong>{r.timestamp}</strong>: Temp {r.temperature_C ?? "-"}, DO {r.dissolved_o2 ?? "-"}, Sal {r.salinity_psu ?? "-"}, Level {r.sea_level_m ?? "-"}
            </div>
          ))}
        </div>
      </div>

      {results && <PredictionResults results={results} />}
    </div>
  );
}
