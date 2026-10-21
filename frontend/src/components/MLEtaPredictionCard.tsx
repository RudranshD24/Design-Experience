"use client";

import React, { useState, useEffect } from "react";
import { api } from "@/lib/api";
import {
  Clock,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  TrendingUp,
  Info,
  Calendar,
  Terminal,
} from "lucide-react";

interface MLEtaPredictionCardProps {
  shipmentId: number;
}

export function MLEtaPredictionCard({ shipmentId }: MLEtaPredictionCardProps) {
  const [prediction, setPrediction] = useState<any | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPrediction = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.predictETA({ shipment_id: shipmentId });
      setPrediction(res);
    } catch (err: any) {
      setError(err.message || "Failed to load ETA estimation");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (shipmentId) {
      fetchPrediction();
    }
  }, [shipmentId]);

  const getRiskBadge = (category: string, prob: number) => {
    const pct = Math.round(prob * 100);
    switch (category) {
      case "HIGH":
        return (
          <span className="px-2 py-0.5 text-[11px] font-mono font-bold rounded-sm bg-rose-950 text-rose-300 border border-rose-800 flex items-center gap-1.5 w-fit">
            <AlertTriangle className="w-3 h-3 text-rose-400" /> HIGH DELAY RISK ({pct}%)
          </span>
        );
      case "MODERATE":
        return (
          <span className="px-2 py-0.5 text-[11px] font-mono font-bold rounded-sm bg-amber-950 text-amber-300 border border-amber-800 flex items-center gap-1.5 w-fit">
            <Clock className="w-3 h-3 text-amber-400" /> MODERATE DELAY RISK ({pct}%)
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 text-[11px] font-mono font-bold rounded-sm bg-emerald-950 text-emerald-300 border border-emerald-800 flex items-center gap-1.5 w-fit">
            <CheckCircle2 className="w-3 h-3 text-emerald-400" /> ON SCHEDULE ({pct}%)
          </span>
        );
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-sm p-4 font-mono flex flex-col gap-3.5">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-sky-400" />
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                PREDICTIVE CORRIDOR TRANSIT PROFILE
              </h3>
              <span className="text-[10px] font-semibold uppercase bg-slate-800 text-slate-300 px-1.5 py-0.2 rounded-sm border border-slate-700">
                ADVISORY
              </span>
            </div>
            <p className="text-[10px] text-slate-400 font-sans mt-0.5">
              Off-chain decision support model. Trained on synthetic corridor datasets &mdash; illustrative only.
            </p>
          </div>
        </div>

        <button
          onClick={fetchPrediction}
          disabled={loading}
          className="p-1 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-sm border border-slate-700 transition-colors disabled:opacity-50"
          title="Recalculate Transit Estimation"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-sky-400 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {/* Body */}
      {loading ? (
        <div className="py-6 flex flex-col items-center justify-center text-xs text-slate-400 gap-2">
          <div className="h-2 w-32 bg-slate-800 animate-pulse rounded-sm" />
          <span className="text-[11px]">CALCULATING TRANSIT PROFILE...</span>
        </div>
      ) : error ? (
        <div className="p-2.5 rounded-sm bg-slate-950 border border-slate-800 text-xs text-slate-400 flex items-center gap-2">
          <Info className="w-3.5 h-3.5 text-slate-500 shrink-0" />
          <span>MODEL UNAVAILABLE: {error}</span>
        </div>
      ) : prediction ? (
        <div className="space-y-3.5">
          {/* Key Metric Blocks */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <div className="bg-slate-950 border border-slate-800 rounded-sm p-3">
              <span className="text-[10px] text-slate-400 uppercase block">REMAINING TRANSIT</span>
              <span className="text-lg font-bold text-white mt-0.5 block">
                {prediction.predicted_remaining_hours}{" "}
                <span className="text-xs font-normal text-slate-400">HOURS</span>
              </span>
              <span className="text-[10px] text-slate-400 mt-0.5 block">
                90% CI: [{prediction.confidence_interval_hours?.lower_bound_hours}h &ndash; {prediction.confidence_interval_hours?.upper_bound_hours}h]
              </span>
            </div>

            <div className="bg-slate-950 border border-slate-800 rounded-sm p-3">
              <span className="text-[10px] text-slate-400 uppercase block">ESTIMATED ARRIVAL</span>
              <span className="text-sm font-bold text-sky-300 mt-1 block">
                {prediction.predicted_eta_timestamp
                  ? new Date(prediction.predicted_eta_timestamp * 1000).toLocaleString(undefined, {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                  : "WITHIN 24H"}
              </span>
              <span className="text-[10px] text-slate-400 mt-0.5 block">
                TOTAL RUNTIME: ~{prediction.predicted_total_duration_hours}H
              </span>
            </div>

            <div className="bg-slate-950 border border-slate-800 rounded-sm p-3 flex flex-col justify-between">
              <span className="text-[10px] text-slate-400 uppercase block">SLA DELAY HAZARD</span>
              <div className="mt-1">
                {getRiskBadge(prediction.delay_risk_category, prediction.delay_risk_probability)}
              </div>
              <span className="text-[10px] text-slate-400 mt-0.5 block">
                MODEL: {prediction.model_version}
              </span>
            </div>
          </div>

          {/* Contributing Risk Factors (Tabular Progress Lines) */}
          {prediction.contributing_factors && prediction.contributing_factors.length > 0 && (
            <div className="p-3 bg-slate-950 border border-slate-800 rounded-sm space-y-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                FEATURE ATTRIBUTION (NORMALIZED WEIGHTS)
              </span>
              <div className="space-y-1.5 text-xs">
                {prediction.contributing_factors.slice(0, 3).map((f: any, idx: number) => {
                  const pct = Math.round(f.importance * 100);
                  return (
                    <div key={idx} className="space-y-0.5">
                      <div className="flex justify-between text-[11px]">
                        <span className="text-slate-300">{f.feature}</span>
                        <span className="text-sky-400 font-bold">{pct}%</span>
                      </div>
                      <div className="w-full bg-slate-800 h-1 rounded-none">
                        <div
                          className="bg-sky-500 h-1 rounded-none"
                          style={{ width: `${Math.min(100, Math.max(5, pct))}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
