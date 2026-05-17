"use client";

import { useState, useCallback } from "react";
import { Brain, TrendingUp, TrendingDown, Minus, Zap, RefreshCw, AlertTriangle, AlertOctagon, CheckCircle } from "lucide-react";

interface SensorValues {
  temperature: number;
  ph: number;
  turbidity: number;
  dissolvedOxygen: number;
  waterLevel: number;
  humidity: number;
}

interface MetricPrediction {
  d1: number;
  d2: number;
  d3: number;
  confidence: number;
  trend: "rising" | "falling" | "stable";
  risk: "normal" | "warning" | "critical";
  insight: string;
}

interface PredictionResult {
  predictions: Record<string, MetricPrediction>;
  summary: string;
}

const METRIC_META: Record<string, { label: string; unit: string; color: string; safeMin: number; safeMax: number; decimals: number }> = {
  temperature:     { label: "Temperature",  unit: "°C",   color: "#FF6B6B", safeMin: 20,  safeMax: 28,  decimals: 1 },
  ph:              { label: "pH Level",     unit: "",     color: "#4ECDC4", safeMin: 6.5, safeMax: 8.5, decimals: 2 },
  turbidity:       { label: "Turbidity",    unit: " NTU", color: "#FFE66D", safeMin: 0,   safeMax: 30,  decimals: 1 },
  dissolvedOxygen: { label: "Dissolved O₂", unit: " mg/L",color: "#95E1D3", safeMin: 6,   safeMax: 12,  decimals: 2 },
  waterLevel:      { label: "Water Level",  unit: " cm",  color: "#6C5CE7", safeMin: 200, safeMax: 300, decimals: 0 },
  humidity:        { label: "Humidity",     unit: "%",    color: "#06b6d4", safeMin: 40,  safeMax: 75,  decimals: 1 },
};

const INSIGHTS: Record<string, { rising: string; falling: string; stable: string }> = {
  temperature:     { rising: "Surface warming expected — elevated algal bloom risk.", falling: "Cooling trend favors dissolved oxygen retention.", stable: "Thermal equilibrium maintained across the monitoring zone." },
  ph:              { rising: "Alkalinity shift detected — monitor carbonate balance.", falling: "Acidification trend — potential CO₂ absorption increasing.", stable: "pH buffering capacity holding within acceptable bounds." },
  turbidity:       { rising: "Increased particulate load likely from runoff activity.", falling: "Water clarity improving — sediment settling progressing.", stable: "Turbidity stable; no significant disturbance detected." },
  dissolvedOxygen: { rising: "Oxygenation improving — biological activity increasing.", falling: "O₂ depletion trend detected — watch for hypoxic zones.", stable: "Dissolved oxygen balanced with current biological demand." },
  waterLevel:      { rising: "Water level rising — possible upstream inflow surge.", falling: "Level dropping — evaporation or outflow exceeding inflow.", stable: "Hydrological balance stable over the forecast window." },
  humidity:        { rising: "Atmospheric moisture climbing — storm front possible.", falling: "Drying trend likely linked to anticyclonic conditions.", stable: "Humidity within comfortable maritime range." },
};

function simulatePredictions(sensors: SensorValues): PredictionResult {
  const predictions: Record<string, MetricPrediction> = {};

  const entries = Object.entries(sensors) as [keyof SensorValues, number][];

  for (const [key, current] of entries) {
    const meta = METRIC_META[key as string];
    if (!meta) continue;

    const span = meta.safeMax - meta.safeMin;
    // Gentle random walk seeded on current value to be deterministic-ish per reading
    const seed = (current * 137.5) % 1;
    const drift = (seed - 0.5) * span * 0.04;
    const noise = () => (Math.random() - 0.5) * span * 0.015;

    const d1 = +(current + drift + noise()).toFixed(meta.decimals);
    const d2 = +(d1     + drift + noise()).toFixed(meta.decimals);
    const d3 = +(d2     + drift + noise()).toFixed(meta.decimals);

    const delta = d3 - current;
    const trend: MetricPrediction["trend"] =
      Math.abs(delta) < span * 0.01 ? "stable" : delta > 0 ? "rising" : "falling";

    const margin = span * 0.1;
    const worstVal = [d1, d2, d3].reduce((a, b) =>
      Math.abs(b - (meta.safeMin + span / 2)) > Math.abs(a - (meta.safeMin + span / 2)) ? b : a
    );
    const risk: MetricPrediction["risk"] =
      worstVal < meta.safeMin || worstVal > meta.safeMax
        ? "critical"
        : worstVal < meta.safeMin + margin || worstVal > meta.safeMax - margin
        ? "warning"
        : "normal";

    const confidence = Math.round(82 + Math.random() * 14);
    const insight = INSIGHTS[key as string]?.[trend] ?? "Parameter within expected range.";

    predictions[key as string] = { d1, d2, d3, confidence, trend, risk, insight };
  }

  // Summary based on how many metrics are at risk
  const risks = Object.values(predictions).map(p => p.risk);
  const critCount = risks.filter(r => r === "critical").length;
  const warnCount = risks.filter(r => r === "warning").length;

  let summary: string;
  if (critCount > 0) {
    summary = `Critical anomalies detected in ${critCount} parameter(s). Immediate monitoring recommended. Conditions may deteriorate over the 72-hour window without intervention.`;
  } else if (warnCount > 1) {
    summary = `${warnCount} parameters approaching threshold boundaries. Conditions are borderline but manageable — continue close observation over the next 48 hours.`;
  } else {
    summary = "All parameters forecast within safe operating ranges for the next 72 hours. Black Sea monitoring zone stable — no intervention required.";
  }

  return { predictions, summary };
}

function RiskIcon({ risk }: { risk: MetricPrediction["risk"] }) {
  if (risk === "critical") return <AlertOctagon className="w-3 h-3" style={{ color: "#f87171" }} />;
  if (risk === "warning")  return <AlertTriangle className="w-3 h-3" style={{ color: "#facc15" }} />;
  return <CheckCircle className="w-3 h-3" style={{ color: "#4ade80" }} />;
}

function TrendIcon({ trend }: { trend: MetricPrediction["trend"] }) {
  const color = trend === "rising" ? "#4ade80" : trend === "falling" ? "#f87171" : "#64748b";
  const Icon = trend === "rising" ? TrendingUp : trend === "falling" ? TrendingDown : Minus;
  return <Icon className="w-3 h-3" style={{ color }} />;
}

function MetricRow({ metricKey, pred }: { metricKey: string; pred: MetricPrediction }) {
  const [open, setOpen] = useState(false);
  const meta = METRIC_META[metricKey]!;
  const fmt = (v: number) => v.toFixed(meta.decimals);

  return (
    <div
      className="rounded-lg cursor-pointer select-none transition-all duration-150"
      style={{
        background: open ? `${meta.color}0a` : "#0d2137",
        border: `1px solid ${open ? meta.color + "25" : "#1e3a5f"}`,
      }}
      onClick={() => setOpen(o => !o)}
    >
      <div className="flex items-center gap-2 px-3 py-2.5">
        <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: meta.color }} />
        <span className="text-[10px] font-semibold text-gray-300 flex-1">{meta.label}</span>

        <div className="flex gap-1.5 mr-2">
          {([pred.d1, pred.d2, pred.d3] as number[]).map((v, i) => (
            <div key={i} className="text-center">
              <div className="text-[7px] text-gray-600 font-mono mb-0.5">D+{i + 1}</div>
              <div className="text-[10px] font-mono font-bold" style={{ color: meta.color }}>
                {fmt(v)}{meta.unit}
              </div>
            </div>
          ))}
        </div>

        <div className="flex items-center gap-1.5">
          <TrendIcon trend={pred.trend} />
          <RiskIcon risk={pred.risk} />
          <span className="text-[8px] font-mono text-gray-600">{pred.confidence}%</span>
        </div>
      </div>

      <div className="px-3 pb-2">
        <div className="h-[2px] rounded-full" style={{ background: "#1e3a5f" }}>
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{ width: `${pred.confidence}%`, backgroundColor: meta.color, opacity: 0.6 }}
          />
        </div>
      </div>

      {open && (
        <div className="px-3 pb-2.5">
          <p className="text-[9px] text-gray-400 font-mono leading-relaxed border-t border-[#1e3a5f] pt-2">
            {pred.insight}
          </p>
        </div>
      )}
    </div>
  );
}

export function PredictionPanel({ sensors }: { sensors: SensorValues }) {
  const [state, setState] = useState<"idle" | "loading" | "done">("idle");
  const [result, setResult] = useState<PredictionResult | null>(null);

  const analyze = useCallback(() => {
    setState("loading");
    // Simulate async model inference delay
    setTimeout(() => {
      setResult(simulatePredictions(sensors));
      setState("done");
    }, 1400);
  }, [sensors]);

  const refresh = useCallback(() => {
    setResult(simulatePredictions(sensors));
  }, [sensors]);

  return (
    <div className="p-4 rounded-xl border border-[#1e3a5f] bg-[#091a2e] relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse at 80% 20%, rgba(139,92,246,0.05) 0%, transparent 60%)" }} />

      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <div className="p-1.5 rounded-lg bg-violet-500/10" style={{ boxShadow: "0 0 8px rgba(139,92,246,0.2)" }}>
          <Brain className="w-3.5 h-3.5 text-violet-400" />
        </div>
        <div>
          <h3 className="text-[10px] font-bold tracking-[0.12em] text-gray-400 uppercase">AI Forecast</h3>
          <p className="text-[8px] text-gray-600 font-mono">LSTM · 3-Day · Black Sea</p>
        </div>
        <div className="ml-auto flex items-center gap-1 px-1.5 py-0.5 rounded bg-violet-500/10 border border-violet-500/20">
          <Zap className="w-2.5 h-2.5 text-violet-400" />
          <span className="text-[8px] text-violet-400 font-mono">{state === "loading" ? "RUNNING" : "READY"}</span>
        </div>
      </div>

      {state === "idle" && (
        <div className="py-6 flex flex-col items-center gap-3">
          <p className="text-[9px] text-gray-600 font-mono text-center">
            Run predictive analysis on current sensor readings<br />to generate 3-day environmental forecasts.
          </p>
          <button
            onClick={analyze}
            className="px-4 py-2 text-[10px] font-bold tracking-wider rounded-lg border border-violet-500/30 text-violet-400 bg-violet-500/10 hover:bg-violet-500/20 transition-all"
          >
            ANALYZE NOW
          </button>
        </div>
      )}

      {state === "loading" && (
        <div className="space-y-1.5 mb-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="rounded-lg px-3 py-2.5 animate-pulse" style={{ background: "#0d2137", border: "1px solid #1e3a5f" }}>
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-[#1e3a5f]" />
                <div className="h-2 w-20 rounded bg-[#1e3a5f]" />
                <div className="flex gap-1.5 ml-auto">
                  {[0,1,2].map(j => <div key={j} className="w-8 h-4 rounded bg-[#1e3a5f]" />)}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {state === "done" && result && (
        <>
          <div className="space-y-1.5 mb-3">
            {Object.entries(result.predictions).map(([key, pred]) => (
              <MetricRow key={key} metricKey={key} pred={pred} />
            ))}
          </div>

          <div className="p-2.5 rounded-lg mb-3" style={{ background: "#0d2137", border: "1px solid #1e3a5f" }}>
            <p className="text-[9px] text-gray-400 font-mono leading-relaxed">{result.summary}</p>
          </div>

          <button
            onClick={refresh}
            className="w-full py-1.5 text-[9px] font-bold tracking-wider rounded-lg border border-[#1e3a5f] text-gray-500 hover:border-violet-500/30 hover:text-violet-400 transition-all flex items-center justify-center gap-1.5"
          >
            <RefreshCw className="w-2.5 h-2.5" />
            REFRESH ANALYSIS
          </button>
        </>
      )}
    </div>
  );
}
