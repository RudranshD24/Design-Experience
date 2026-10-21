"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useWallet } from "@/context/WalletContext";
import { api } from "@/lib/api";
import {
  AlertTriangle,
  Route,
  ArrowRight,
  TrendingUp,
  RefreshCw,
  Shield,
  Clock,
  Compass,
  CheckCircle2,
  ExternalLink,
  Zap,
  Info,
  Layers,
  MapPin,
  HelpCircle,
} from "lucide-react";

const NETWORK_HUBS = [
  "Indore",
  "Mumbai/JNPT",
  "Mundra",
  "Ahmedabad",
  "Delhi",
  "Jaipur",
  "Pune",
  "Bengaluru",
  "Chennai",
  "Hyderabad",
  "Nagpur",
  "Kolkata",
];

export default function DisruptionConsolePage() {
  const { account, role, isAuthenticated, loginWithSignature } = useWallet();
  const isAdmin = role === 1;

  const [shipments, setShipments] = useState<any[]>([]);
  const [selectedShipmentId, setSelectedShipmentId] = useState<number | "">("");
  const [currentNode, setCurrentNode] = useState<string>("Indore");
  const [destinationNode, setDestinationNode] = useState<string>("Mumbai/JNPT");
  const [disruptedNode, setDisruptedNode] = useState<string>("Mumbai/JNPT");
  const [severity, setSeverity] = useState<number>(0.85);

  const [simulating, setSimulating] = useState<boolean>(false);
  const [simulationResult, setSimulationResult] = useState<any | null>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Load active InTransit shipments
  useEffect(() => {
    if (!isAuthenticated || !isAdmin) return;
    async function loadData() {
      try {
        const res = await api.getShipments({ pageSize: 50 });
        const all = res?.items || [];
        setShipments(all);

        // Pre-select first InTransit or first available shipment
        const inTransit = all.find((s: any) => s.status === 2);
        if (inTransit) {
          setSelectedShipmentId(inTransit.shipmentId);
          if (inTransit.origin) setCurrentNode(inTransit.origin);
          if (inTransit.destination) setDestinationNode(inTransit.destination);
        } else if (all.length > 0) {
          setSelectedShipmentId(all[0].shipmentId);
        }

        // Load recent history
        const hist = await api.getDisruptionHistory(10).catch(() => []);
        setHistory(hist);
      } catch (err: any) {
        console.error("Failed to load initial shipments for disruption console", err);
      }
    }
    loadData();
  }, [isAuthenticated, isAdmin]);

  // Update current/destination node when shipment selection changes
  const handleShipmentChange = (sId: number) => {
    setSelectedShipmentId(sId);
    const s = shipments.find((item) => item.shipmentId === sId);
    if (s) {
      if (s.origin) setCurrentNode(s.origin);
      if (s.destination) setDestinationNode(s.destination);
    }
  };

  // Preset 1: Storm at Mumbai/JNPT
  const applyPresetMumbaiStorm = () => {
    setDisruptedNode("Mumbai/JNPT");
    setSeverity(0.85);
    // Find InTransit shipment targeting Mumbai/JNPT if available
    const match = shipments.find(
      (s) => s.status === 2 && s.destination?.toLowerCase().includes("mumbai")
    ) || shipments.find((s) => s.status === 2) || shipments[0];

    if (match) {
      setSelectedShipmentId(match.shipmentId);
      if (match.origin) setCurrentNode(match.origin);
      setDestinationNode("Mumbai/JNPT");
    }
  };

  // Preset 2: Port Congestion at Mundra
  const applyPresetMundraCongestion = () => {
    setDisruptedNode("Mundra");
    setSeverity(0.60);
    const match = shipments.find(
      (s) => s.destination?.toLowerCase().includes("mundra") || s.origin?.toLowerCase().includes("mundra")
    ) || shipments.find((s) => s.status === 2) || shipments[0];

    if (match) {
      setSelectedShipmentId(match.shipmentId);
      setCurrentNode("Ahmedabad");
      setDestinationNode("Delhi");
    }
  };

  // Run simulation
  const handleSimulate = async () => {
    if (!selectedShipmentId) {
      setError("Please select a valid shipment.");
      return;
    }
    setSimulating(true);
    setError(null);
    setSimulationResult(null);

    try {
      const payload = {
        shipment_id: Number(selectedShipmentId),
        current_node: currentNode,
        destination: destinationNode,
        disrupted_node: disruptedNode,
        severity: Number(severity),
      };
      const result = await api.simulateDisruption(payload);
      setSimulationResult(result);

      // Refresh history
      const hist = await api.getDisruptionHistory(10).catch(() => []);
      setHistory(hist);
    } catch (err: any) {
      setError(err.message || "Disruption simulation failed.");
    } finally {
      setSimulating(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <Shield className="w-12 h-12 text-slate-400 mb-3" />
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">Admin Authentication Required</h2>
        <p className="text-xs text-slate-500 max-w-sm mt-1 mb-4">
          Connect your authorized Admin wallet to access the Disruption &amp; Dynamic Rerouting Console.
        </p>
        <button
          onClick={loginWithSignature}
          className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl text-xs transition-colors shadow-sm"
        >
          Sign with MetaMask
        </button>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <AlertTriangle className="w-12 h-12 text-amber-500 mb-3" />
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">Restricted Access</h2>
        <p className="text-xs text-slate-500 max-w-sm mt-1 mb-4">
          The Disruption Console is restricted to Administrator participants per CargoChain security governance.
        </p>
        <Link
          href="/dashboard"
          className="px-4 py-2 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-semibold rounded-xl text-xs"
        >
          Return to Dashboard
        </Link>
      </div>
    );
  }

  const selectedShipment = shipments.find((s) => s.shipmentId === Number(selectedShipmentId));

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto">
      {/* Header and Provenance Tag */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-600 via-rose-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-rose-500/20">
              <Route className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-black text-slate-900 dark:text-white">
                  Dynamic Disruption &amp; Rerouting Console
                </h1>
                <span className="px-2.5 py-0.5 text-[10px] font-bold rounded-full bg-rose-500/10 text-rose-500 border border-rose-500/20 uppercase tracking-wider">
                  Admin Control
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Proactive hazard simulation, Dijkstra SSSP rerouting, ML delay estimation, and Oracle audit anchoring.
              </p>
            </div>
          </div>
        </div>

        {/* Provenance Badge */}
        <div className="flex items-center gap-2 self-start sm:self-center">
          <span className="text-[11px] font-medium text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-900/60 px-3 py-1.5 rounded-xl flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5 text-amber-500" />
            Synthetic demo data — advisory only
          </span>
        </div>
      </div>

      {/* Main Grid: Control Panel + Output View */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Disruption Simulation Parameters (5 cols) */}
        <div className="lg:col-span-5 flex flex-col gap-5">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <Compass className="w-4 h-4 text-blue-500" />
                Simulation Inputs
              </span>
              <span className="text-[11px] text-slate-400">Phase 1 Logistics Corridors</span>
            </div>

            {/* One-Click Presets */}
            <div className="space-y-1.5">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                Quick Demonstration Presets
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={applyPresetMumbaiStorm}
                  className="p-2.5 rounded-xl border border-rose-200 dark:border-rose-900/50 bg-rose-50/50 dark:bg-rose-950/20 hover:bg-rose-100/60 dark:hover:bg-rose-900/30 text-left transition-all group"
                >
                  <div className="flex items-center gap-1.5 text-xs font-bold text-rose-700 dark:text-rose-300">
                    <Zap className="w-3.5 h-3.5 text-rose-500 group-hover:scale-110 transition-transform" />
                    Storm at Mumbai
                  </div>
                  <span className="text-[10px] text-slate-500 block mt-0.5">
                    Severity 0.85 — High cyclone hazard
                  </span>
                </button>

                <button
                  type="button"
                  onClick={applyPresetMundraCongestion}
                  className="p-2.5 rounded-xl border border-amber-200 dark:border-amber-900/50 bg-amber-50/50 dark:bg-amber-950/20 hover:bg-amber-100/60 dark:hover:bg-amber-900/30 text-left transition-all group"
                >
                  <div className="flex items-center gap-1.5 text-xs font-bold text-amber-700 dark:text-amber-300">
                    <Clock className="w-3.5 h-3.5 text-amber-500 group-hover:scale-110 transition-transform" />
                    Port Congestion
                  </div>
                  <span className="text-[10px] text-slate-500 block mt-0.5">
                    Mundra — Severity 0.60 lane delay
                  </span>
                </button>
              </div>
            </div>

            {/* Target Shipment Selector */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                <span>Select Target Shipment</span>
                {selectedShipment && (
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded font-semibold ${
                      selectedShipment.status === 2
                        ? "bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800"
                        : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                    }`}
                  >
                    {selectedShipment.statusName || `Status ${selectedShipment.status}`}
                  </span>
                )}
              </label>
              <select
                value={selectedShipmentId}
                onChange={(e) => handleShipmentChange(Number(e.target.value))}
                className="w-full text-xs font-medium bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2.5 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {shipments.map((s) => (
                  <option key={s.shipmentId} value={s.shipmentId}>
                    #{s.shipmentId} — {s.productDescription} ({s.origin} → {s.destination}) [
                    {s.status === 2 ? "InTransit" : s.statusName}]
                  </option>
                ))}
              </select>
            </div>

            {/* Origin & Destination Hubs */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                  Current Node
                </label>
                <select
                  value={currentNode}
                  onChange={(e) => setCurrentNode(e.target.value)}
                  className="w-full text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-2.5 py-2 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  {NETWORK_HUBS.map((h) => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                  Destination Hub
                </label>
                <select
                  value={destinationNode}
                  onChange={(e) => setDestinationNode(e.target.value)}
                  className="w-full text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-2.5 py-2 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  {NETWORK_HUBS.map((h) => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Disrupted Node */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                <span>Disrupted Corridor Hub</span>
                <span className="text-[10px] text-rose-500 font-semibold">Simulated blockage</span>
              </label>
              <select
                value={disruptedNode}
                onChange={(e) => setDisruptedNode(e.target.value)}
                className="w-full text-xs font-medium bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2.5 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-500"
              >
                {NETWORK_HUBS.map((h) => (
                  <option key={h} value={h}>
                    {h}
                  </option>
                ))}
              </select>
            </div>

            {/* Severity Slider */}
            <div className="space-y-2 pt-1">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-700 dark:text-slate-300">Hazard Severity</span>
                <span className="font-mono font-bold text-sm text-rose-500">
                  {severity.toFixed(2)}{" "}
                  <span className="text-[10px] text-slate-400 font-normal">
                    ({severity >= 0.7 ? "High Risk" : severity >= 0.4 ? "Moderate" : "Low"})
                  </span>
                </span>
              </div>
              <input
                type="range"
                min="0.0"
                max="1.0"
                step="0.05"
                value={severity}
                onChange={(e) => setSeverity(parseFloat(e.target.value))}
                className="w-full accent-rose-600 bg-slate-200 dark:bg-slate-700 h-2 rounded-lg cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                <span>0.0 (Clear)</span>
                <span>0.5 (Moderate)</span>
                <span>1.0 (Critical)</span>
              </div>
            </div>

            {error && (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-xs text-rose-700 dark:text-rose-300 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-500 flex-shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {/* Action Button */}
            <button
              type="button"
              onClick={handleSimulate}
              disabled={simulating || !selectedShipmentId}
              className="w-full mt-2 py-3 px-4 bg-gradient-to-r from-blue-600 via-indigo-600 to-rose-600 hover:from-blue-700 hover:via-indigo-700 hover:to-rose-700 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow-sm transition-all disabled:opacity-50 active:scale-98"
            >
              {simulating ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Computing Optimal Dynamic Corridor...</span>
                </>
              ) : (
                <>
                  <Route className="w-4 h-4" />
                  <span>Simulate Disruption &amp; Evaluate Reroute</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Right Column: Decision Support & Reroute Results (7 cols) */}
        <div className="lg:col-span-7 flex flex-col gap-5">
          {simulationResult ? (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm flex flex-col gap-5">
              {/* Top Banner: Status & Delta */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Dynamic Reroute Decision
                  </span>
                  <h3 className="text-base font-extrabold text-slate-900 dark:text-white mt-0.5">
                    Shipment #{simulationResult.shipment_id}: {simulationResult.current_node} →{" "}
                    {simulationResult.destination}
                  </h3>
                </div>

                <div className="flex items-center gap-2">
                  {/* Risk Badge */}
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-bold border flex items-center gap-1.5 ${
                      simulationResult.delay_risk_category === "HIGH"
                        ? "bg-rose-500/10 text-rose-500 border-rose-500/20"
                        : simulationResult.delay_risk_category === "MODERATE"
                        ? "bg-amber-500/10 text-amber-500 border-amber-500/20"
                        : "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                    }`}
                  >
                    <AlertTriangle className="w-3.5 h-3.5" />
                    {simulationResult.delay_risk_category} RISK (
                    {Math.round(simulationResult.delay_risk_probability * 100)}%)
                  </span>

                  {/* Delta Badge */}
                  <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                    +{simulationResult.delta_hours}h Transit
                  </span>
                </div>
              </div>

              {/* Corridor Comparison: SVG Node Chain Visualization */}
              <div className="bg-slate-50 dark:bg-slate-950 rounded-xl p-4 border border-slate-200 dark:border-slate-800/80">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block mb-3 flex items-center gap-1.5">
                  <Route className="w-3.5 h-3.5 text-blue-500" />
                  Corridor Comparison: Baseline vs Rerouted
                </span>

                {/* Baseline Route */}
                {simulationResult.baseline_route && (
                  <div className="mb-4">
                    <div className="flex items-center justify-between text-[11px] text-slate-500 mb-1.5 font-medium">
                      <span>Baseline Route (Pre-disruption):</span>
                      <span className="font-mono">
                        {simulationResult.baseline_route.total_hours}h · {simulationResult.baseline_route.total_km}km
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5">
                      {simulationResult.baseline_route.node_list.map((node: string, idx: number) => {
                        const isDisrupted = node === simulationResult.disrupted_node;
                        return (
                          <React.Fragment key={idx}>
                            <span
                              className={`px-2.5 py-1 rounded-lg text-xs font-semibold border ${
                                isDisrupted
                                  ? "bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 border-rose-300 dark:border-rose-800 line-through"
                                  : "bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800"
                              }`}
                            >
                              {node}
                            </span>
                            {idx < simulationResult.baseline_route.node_list.length - 1 && (
                              <ArrowRight className="w-3 h-3 text-slate-400" />
                            )}
                          </React.Fragment>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Rerouted Route */}
                {simulationResult.rerouted_route ? (
                  <div>
                    <div className="flex items-center justify-between text-[11px] text-emerald-600 dark:text-emerald-400 mb-1.5 font-semibold">
                      <span>Dynamic Reroute (Bypassing Disruption):</span>
                      <span className="font-mono">
                        {simulationResult.rerouted_route.total_hours}h · {simulationResult.rerouted_route.total_km}km
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5">
                      {simulationResult.rerouted_route.node_list.map((node: string, idx: number) => (
                        <React.Fragment key={idx}>
                          <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 shadow-xs">
                            {node}
                          </span>
                          {idx < simulationResult.rerouted_route.node_list.length - 1 && (
                            <ArrowRight className="w-3 h-3 text-emerald-500" />
                          )}
                        </React.Fragment>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="text-xs text-rose-500">
                    No alternate path feasible without traversing the disrupted node.
                  </div>
                )}
              </div>

              {/* Recommendation Narrative */}
              <div className="p-3.5 rounded-xl bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/60 text-xs text-slate-800 dark:text-slate-200 leading-relaxed">
                <span className="font-bold text-blue-700 dark:text-blue-300 block mb-0.5">
                  Algorithmic Reroute Advisory:
                </span>
                {simulationResult.recommendation}
              </div>

              {/* On-Chain Anchoring Status Banner */}
              <div
                className={`p-4 rounded-xl border flex flex-col gap-2 ${
                  simulationResult.onchain_status === "anchored"
                    ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-900 dark:text-emerald-200"
                    : simulationResult.onchain_status === "skipped"
                    ? "bg-slate-100 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300"
                    : "bg-amber-500/10 border-amber-500/30 text-amber-900 dark:text-amber-200"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {simulationResult.onchain_status === "anchored" ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    ) : (
                      <Info className="w-4 h-4 text-slate-400" />
                    )}
                    <span className="text-xs font-bold uppercase tracking-wider">
                      On-Chain Blockchain Anchor: {simulationResult.onchain_status}
                    </span>
                  </div>
                  {simulationResult.onchain_status === "anchored" && (
                    <Link
                      href={`/shipments/${simulationResult.shipment_id}`}
                      className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                    >
                      <span>View Timeline</span>
                      <ExternalLink className="w-3 h-3" />
                    </Link>
                  )}
                </div>

                <p className="text-[11px] opacity-90">{simulationResult.onchain_reason}</p>

                {simulationResult.tx_hashes && simulationResult.tx_hashes.length > 0 && (
                  <div className="mt-1 pt-2 border-t border-emerald-500/20 text-[10px] font-mono flex flex-wrap gap-2">
                    <span className="text-slate-400">Transaction Hashes:</span>
                    {simulationResult.tx_hashes.map((tx: string, idx: number) => (
                      <span key={idx} className="bg-black/20 px-2 py-0.5 rounded">
                        {tx.slice(0, 10)}...{tx.slice(-8)}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Explanatory Factors & Alternates */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Contributing Risk Factors */}
                <div className="space-y-2">
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block flex items-center gap-1.5">
                    <TrendingUp className="w-3 h-3 text-indigo-400" />
                    Top Model Factors
                  </span>
                  <div className="space-y-1.5">
                    {simulationResult.contributing_factors?.slice(0, 3).map((f: any, idx: number) => (
                      <div
                        key={idx}
                        className="p-2 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-[11px] flex justify-between items-center"
                      >
                        <span className="text-slate-600 dark:text-slate-400 truncate">
                          {f.feature.replace(/_/g, " ")}
                        </span>
                        <span className="font-mono font-medium text-slate-800 dark:text-slate-200">
                          {(f.importance * 100).toFixed(1)}%
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Alternates from Yen's K-paths */}
                <div className="space-y-2">
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block flex items-center gap-1.5">
                    <Layers className="w-3 h-3 text-blue-400" />
                    K-Shortest Alternates (Yen)
                  </span>
                  {simulationResult.alternates && simulationResult.alternates.length > 0 ? (
                    <div className="space-y-1.5">
                      {simulationResult.alternates.map((alt: any, idx: number) => (
                        <div
                          key={idx}
                          className="p-2 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-[11px]"
                        >
                          <div className="flex justify-between font-mono text-[10px] text-slate-500 mb-0.5">
                            <span>Option #{idx + 2}</span>
                            <span>{alt.total_hours}h</span>
                          </div>
                          <span className="text-slate-700 dark:text-slate-300 font-medium">
                            {alt.node_list.join(" → ")}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <span className="text-[11px] text-slate-400 italic">No additional paths available</span>
                  )}
                </div>
              </div>

              {/* Safeguard Notice */}
              <div className="text-[10px] text-slate-400 text-center pt-2 border-t border-slate-100 dark:border-slate-800">
                {simulationResult.caveat}
              </div>
            </div>
          ) : (
            <div className="bg-white dark:bg-slate-900 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl p-12 text-center flex flex-col items-center justify-center min-h-[400px]">
              <div className="w-14 h-14 rounded-2xl bg-blue-50 dark:bg-blue-950/40 text-blue-500 flex items-center justify-center mb-3">
                <Route className="w-7 h-7" />
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                No Active Disruption Simulation
              </h3>
              <p className="text-xs text-slate-500 max-w-sm mt-1">
                Select a shipment corridor on the left, configure hazard parameters or click a preset, and run the
                simulation to view real-time dynamic rerouting.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Section: Recent Disruption Audit Log */}
      {history.length > 0 && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3 mb-4">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-indigo-500" />
              Recent Reroute Decision History
            </span>
            <span className="text-[11px] text-slate-400">Bounded Audit Buffer</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="text-[10px] uppercase font-bold text-slate-400 border-b border-slate-100 dark:border-slate-800">
                <tr>
                  <th className="pb-2">Timestamp</th>
                  <th className="pb-2">Shipment</th>
                  <th className="pb-2">Corridor</th>
                  <th className="pb-2">Disrupted Hub</th>
                  <th className="pb-2">Risk</th>
                  <th className="pb-2">Delta</th>
                  <th className="pb-2">On-Chain</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium text-slate-700 dark:text-slate-300">
                {history.map((h: any, idx: number) => (
                  <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                    <td className="py-2.5 text-[11px] font-mono text-slate-500">
                      {new Date(h.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                    </td>
                    <td className="py-2.5 font-bold">#{h.shipment_id}</td>
                    <td className="py-2.5">
                      {h.current_node} → {h.destination}
                    </td>
                    <td className="py-2.5 text-rose-500 font-semibold">{h.disrupted_node}</td>
                    <td className="py-2.5">
                      <span className="font-bold">{h.delay_risk_category}</span> (
                      {Math.round(h.delay_risk_probability * 100)}%)
                    </td>
                    <td className="py-2.5 font-mono text-indigo-500 font-bold">+{h.delta_hours}h</td>
                    <td className="py-2.5">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          h.onchain_status === "anchored"
                            ? "bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300"
                            : "bg-slate-100 dark:bg-slate-800 text-slate-500"
                        }`}
                      >
                        {h.onchain_status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
