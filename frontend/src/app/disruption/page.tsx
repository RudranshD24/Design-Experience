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
  Layers,
  MapPin,
  Activity,
  Terminal,
  FileCode,
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
  const [showJsonInspector, setShowJsonInspector] = useState<boolean>(false);

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
    const match =
      shipments.find((s) => s.status === 2 && s.destination?.toLowerCase().includes("mumbai")) ||
      shipments.find((s) => s.status === 2) ||
      shipments[0];

    if (match) {
      setSelectedShipmentId(match.shipmentId);
      if (match.origin) setCurrentNode(match.origin);
      setDestinationNode("Mumbai/JNPT");
    }
  };

  // Preset 2: Port Congestion at Mundra
  const applyPresetMundraCongestion = () => {
    setDisruptedNode("Mundra");
    setSeverity(0.6);
    const match =
      shipments.find((s) => s.destination?.toLowerCase().includes("mundra") || s.origin?.toLowerCase().includes("mundra")) ||
      shipments.find((s) => s.status === 2) ||
      shipments[0];

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
      <div className="flex flex-col items-center justify-center py-20 text-center font-mono">
        <Shield className="w-10 h-10 text-slate-500 mb-3" />
        <h2 className="text-sm font-bold text-white uppercase tracking-wider">ADMIN AUTHENTICATION REQUIRED</h2>
        <p className="text-xs text-slate-400 max-w-sm mt-1 mb-4 font-sans">
          Connect your authorized Administrator wallet to execute corridor hazard simulations.
        </p>
        <button
          onClick={loginWithSignature}
          className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-sky-300 border border-slate-700 text-xs font-semibold rounded-sm transition-colors"
        >
          [SIGN WITH METAMASK]
        </button>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center font-mono">
        <AlertTriangle className="w-10 h-10 text-amber-500 mb-3" />
        <h2 className="text-sm font-bold text-white uppercase tracking-wider">ACCESS RESTRICTED (ROLE_CHECK_FAILED)</h2>
        <p className="text-xs text-slate-400 max-w-sm mt-1 mb-4 font-sans">
          The Disruption Console is restricted to Administrator participants per CargoChain security governance.
        </p>
        <Link
          href="/dashboard"
          className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-semibold rounded-sm"
        >
          &larr; RETURN TO DASHBOARD
        </Link>
      </div>
    );
  }

  const selectedShipment = shipments.find((s) => s.shipmentId === Number(selectedShipmentId));

  return (
    <div className="flex flex-col gap-5 max-w-7xl mx-auto font-mono">
      {/* Console Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 rounded-sm p-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold px-1.5 py-0.5 bg-rose-950 text-rose-300 border border-rose-800 rounded-sm uppercase tracking-wider">
              ADMIN ESCALATION CONSOLE
            </span>
            <span className="text-[11px] text-slate-400">MODULE: SSSP-REROUTE-V1</span>
          </div>
          <h1 className="text-base font-bold text-white uppercase tracking-wider mt-1">
            Dynamic Corridor Disruption &amp; Rerouting Engine
          </h1>
          <p className="text-xs text-slate-400 font-sans mt-0.5">
            Dijkstra risk-penalized edge routing, Yen&apos;s K=3 simple path alternatives, ML delay advisory, and Oracle ledger anchoring.
          </p>
        </div>

        {/* Provenance Badge */}
        <div className="text-[11px] text-amber-300 bg-amber-950/60 border border-amber-800 px-3 py-1.5 rounded-sm flex items-center gap-2 self-start sm:self-center">
          <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          <span>SYNTHETIC DEMO NETWORK &amp; DATA &mdash; ADVISORY ONLY</span>
        </div>
      </div>

      {/* Main Grid: Control Panel + Output View */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left Column: Disruption Simulation Parameters (5 cols) */}
        <div className="lg:col-span-5 flex flex-col gap-4">
          <div className="bg-slate-900 border border-slate-800 rounded-sm p-4 flex flex-col gap-3.5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                <Compass className="w-3.5 h-3.5 text-sky-400" />
                INCIDENT PARAMETERS
              </span>
              <span className="text-[10px] text-slate-500">12 INDIAN CORRIDOR HUBS</span>
            </div>

            {/* Quick Demonstration Presets */}
            <div className="space-y-1.5">
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
                ONE-CLICK INCIDENT PRESETS
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                <button
                  type="button"
                  onClick={applyPresetMumbaiStorm}
                  className="p-2 rounded-sm border border-rose-900 bg-rose-950/40 hover:bg-rose-950/80 text-left transition-colors"
                >
                  <div className="font-bold text-rose-300 flex items-center gap-1.5">
                    <AlertTriangle className="w-3 h-3 text-rose-400" />
                    MUMBAI STORM (0.85)
                  </div>
                  <span className="text-[10px] text-slate-400 block mt-0.5">
                    Severe cyclone &amp; JNPT port halt
                  </span>
                </button>

                <button
                  type="button"
                  onClick={applyPresetMundraCongestion}
                  className="p-2 rounded-sm border border-amber-900 bg-amber-950/40 hover:bg-amber-950/80 text-left transition-colors"
                >
                  <div className="font-bold text-amber-300 flex items-center gap-1.5">
                    <Clock className="w-3 h-3 text-amber-400" />
                    MUNDRA CONGESTION (0.60)
                  </div>
                  <span className="text-[10px] text-slate-400 block mt-0.5">
                    Vessel backlog on NH-8 corridor
                  </span>
                </button>
              </div>
            </div>

            {/* Target Shipment Selector */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-300 flex items-center justify-between">
                <span>TARGET CONSIGNMENT</span>
                {selectedShipment && (
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-sm font-semibold uppercase ${
                      selectedShipment.status === 2
                        ? "bg-emerald-950 text-emerald-300 border border-emerald-800"
                        : "bg-slate-800 text-slate-400"
                    }`}
                  >
                    {selectedShipment.status === 2 ? "IN_TRANSIT (2)" : `STATUS_${selectedShipment.status}`}
                  </span>
                )}
              </label>
              <select
                value={selectedShipmentId}
                onChange={(e) => handleShipmentChange(Number(e.target.value))}
                className="w-full text-xs font-mono bg-slate-950 border border-slate-800 rounded-sm px-2.5 py-2 text-slate-200 focus:outline-none focus:border-sky-500"
              >
                {shipments.map((s) => (
                  <option key={s.shipmentId} value={s.shipmentId}>
                    #{s.shipmentId} — {s.productDescription.slice(0, 28)}... ({s.origin} &rarr; {s.destination}) [
                    {s.status === 2 ? "InTransit" : `State_${s.status}`}]
                  </option>
                ))}
              </select>
            </div>

            {/* Origin & Destination Hubs */}
            <div className="grid grid-cols-2 gap-2.5">
              <div className="space-y-1">
                <label className="text-[10px] font-semibold text-slate-400 uppercase">
                  CURRENT NODE
                </label>
                <select
                  value={currentNode}
                  onChange={(e) => setCurrentNode(e.target.value)}
                  className="w-full text-xs font-mono bg-slate-950 border border-slate-800 rounded-sm px-2 py-1.5 text-slate-200 focus:outline-none focus:border-sky-500"
                >
                  {NETWORK_HUBS.map((h) => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-semibold text-slate-400 uppercase">
                  DESTINATION HUB
                </label>
                <select
                  value={destinationNode}
                  onChange={(e) => setDestinationNode(e.target.value)}
                  className="w-full text-xs font-mono bg-slate-950 border border-slate-800 rounded-sm px-2 py-1.5 text-slate-200 focus:outline-none focus:border-sky-500"
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
              <label className="text-xs font-bold text-slate-300 flex items-center justify-between">
                <span>DISRUPTED CORRIDOR HUB</span>
                <span className="text-[10px] text-rose-400 font-semibold">[BLOCKED NODE]</span>
              </label>
              <select
                value={disruptedNode}
                onChange={(e) => setDisruptedNode(e.target.value)}
                className="w-full text-xs font-mono bg-slate-950 border border-rose-900 rounded-sm px-2.5 py-2 text-rose-200 focus:outline-none focus:border-rose-500"
              >
                {NETWORK_HUBS.map((h) => (
                  <option key={h} value={h}>
                    {h}
                  </option>
                ))}
              </select>
            </div>

            {/* Severity Slider */}
            <div className="space-y-1.5 pt-1">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-300 uppercase">HAZARD SEVERITY</span>
                <span className="font-mono font-bold text-rose-400">
                  {severity.toFixed(2)}{" "}
                  <span className="text-[10px] text-slate-400 font-normal">
                    ({severity >= 0.7 ? "TRIGGER ON-CHAIN ANCHOR" : "SKIPS ON-CHAIN"})
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
                className="w-full accent-rose-500 bg-slate-800 h-1.5 rounded-none cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                <span>0.0 (CLEAR)</span>
                <span>0.5 (MODERATE)</span>
                <span>1.0 (CRITICAL)</span>
              </div>
            </div>

            {error && (
              <div className="p-2.5 rounded-sm bg-rose-950/80 border border-rose-800 text-xs text-rose-300 flex items-start gap-2">
                <AlertTriangle className="w-3.5 h-3.5 text-rose-400 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {/* Action Button */}
            <button
              type="button"
              onClick={handleSimulate}
              disabled={simulating || !selectedShipmentId}
              className="w-full mt-1 py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-white font-mono text-xs font-bold rounded-sm border border-slate-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {simulating ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 text-sky-400 animate-spin" />
                  <span>CALCULATING SSSP DIJKSTRA DETOUR...</span>
                </>
              ) : (
                <>
                  <Route className="w-3.5 h-3.5 text-sky-400" />
                  <span>[EXECUTE SIMULATION &amp; LEDGER AUDIT]</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Right Column: Decision Support & Reroute Results (7 cols) */}
        <div className="lg:col-span-7 flex flex-col gap-4">
          {simulationResult ? (
            <div className="bg-slate-900 border border-slate-800 rounded-sm p-4 flex flex-col gap-4">
              {/* Header Status & Key Metrics */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
                <div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                    ALGORITHMIC REROUTE DETERMINATION
                  </span>
                  <h3 className="text-sm font-bold text-white mt-0.5">
                    CONSIGNMENT #{simulationResult.shipment_id}: {simulationResult.current_node} &rarr;{" "}
                    {simulationResult.destination}
                  </h3>
                </div>

                <div className="flex items-center gap-2">
                  <span
                    className={`px-2 py-0.5 rounded-sm text-[11px] font-bold border ${
                      simulationResult.delay_risk_category === "HIGH"
                        ? "bg-rose-950 text-rose-300 border-rose-800"
                        : simulationResult.delay_risk_category === "MODERATE"
                        ? "bg-amber-950 text-amber-300 border-amber-800"
                        : "bg-emerald-950 text-emerald-300 border-emerald-800"
                    }`}
                  >
                    RISK: {simulationResult.delay_risk_category} (
                    {Math.round(simulationResult.delay_risk_probability * 100)}%)
                  </span>

                  <span className="px-2 py-0.5 rounded-sm text-[11px] font-bold bg-slate-950 text-sky-300 border border-slate-800">
                    +{simulationResult.delta_hours}h DELTA
                  </span>
                </div>
              </div>

              {/* Differential Comparison Table (Clean, Not Floating) */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border border-slate-800">
                  <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 uppercase text-[10px]">
                    <tr>
                      <th className="p-2.5 border-r border-slate-800">Plan</th>
                      <th className="p-2.5 border-r border-slate-800">Corridor Nodes</th>
                      <th className="p-2.5 border-r border-slate-800 text-right">Distance</th>
                      <th className="p-2.5 border-r border-slate-800 text-right">Est. Transit</th>
                      <th className="p-2.5 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    <tr className="bg-slate-950/40 text-slate-400">
                      <td className="p-2.5 border-r border-slate-800 font-semibold text-slate-300">
                        BASELINE
                      </td>
                      <td className="p-2.5 border-r border-slate-800">
                        {simulationResult.baseline_route?.node_list.map((n: string, i: number) => (
                          <span key={i}>
                            <span className={n === simulationResult.disrupted_node ? "text-rose-400 line-through font-bold" : ""}>
                              {n}
                            </span>
                            {i < simulationResult.baseline_route.node_list.length - 1 && " \u2192 "}
                          </span>
                        ))}
                      </td>
                      <td className="p-2.5 border-r border-slate-800 text-right">
                        {simulationResult.baseline_route?.total_km} km
                      </td>
                      <td className="p-2.5 border-r border-slate-800 text-right">
                        {simulationResult.baseline_route?.total_hours} h
                      </td>
                      <td className="p-2.5 text-right text-rose-400">BLOCKED</td>
                    </tr>
                    <tr className="bg-slate-900 text-slate-200">
                      <td className="p-2.5 border-r border-slate-800 font-semibold text-emerald-400">
                        DETOUR (SSSP)
                      </td>
                      <td className="p-2.5 border-r border-slate-800 font-bold text-white">
                        {simulationResult.rerouted_route?.node_list.join(" \u2192 ")}
                      </td>
                      <td className="p-2.5 border-r border-slate-800 text-right font-bold">
                        {simulationResult.rerouted_route?.total_km} km
                      </td>
                      <td className="p-2.5 border-r border-slate-800 text-right font-bold text-sky-400">
                        {simulationResult.rerouted_route?.total_hours} h
                      </td>
                      <td className="p-2.5 text-right text-emerald-400 font-bold">FEASIBLE</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Reroute Recommendation Narrative */}
              <div className="p-3 bg-slate-950 border border-slate-800 rounded-sm text-xs text-slate-300 leading-relaxed">
                <span className="font-bold text-sky-400 block mb-0.5">
                  OPERATIONAL DISPATCH ADVISORY:
                </span>
                {simulationResult.recommendation}
              </div>

              {/* On-Chain Ledger Anchoring State */}
              <div
                className={`p-3.5 rounded-sm border flex flex-col gap-2 ${
                  simulationResult.onchain_status === "anchored"
                    ? "bg-slate-950 border-emerald-800 text-emerald-200"
                    : simulationResult.onchain_status === "skipped"
                    ? "bg-slate-950 border-slate-800 text-slate-400"
                    : "bg-slate-950 border-amber-800 text-amber-200"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {simulationResult.onchain_status === "anchored" ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <Terminal className="w-3.5 h-3.5 text-slate-400" />
                    )}
                    <span className="text-xs font-bold uppercase tracking-wider">
                      LEDGER AUDIT STATUS: {simulationResult.onchain_status}
                    </span>
                  </div>
                  {simulationResult.onchain_status === "anchored" && (
                    <Link
                      href={`/shipments/${simulationResult.shipment_id}`}
                      className="text-xs text-sky-400 hover:underline flex items-center gap-1"
                    >
                      <span>INSPECT TIMELINE</span>
                      <ExternalLink className="w-3 h-3" />
                    </Link>
                  )}
                </div>

                <p className="text-[11px] font-sans text-slate-400">{simulationResult.onchain_reason}</p>

                {simulationResult.tx_hashes && simulationResult.tx_hashes.length > 0 && (
                  <div className="mt-1 pt-2 border-t border-slate-800 text-[10px] flex flex-wrap items-center gap-2">
                    <span className="text-slate-500 uppercase">TX HASHES:</span>
                    {simulationResult.tx_hashes.map((tx: string, idx: number) => (
                      <span key={idx} className="bg-slate-900 border border-slate-800 px-1.5 py-0.5 text-slate-300">
                        {tx.slice(0, 10)}...{tx.slice(-8)}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Explanatory Factors & Alternates (Yen K-paths) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                {/* Contributing Risk Factors */}
                <div className="p-3 bg-slate-950 border border-slate-800 rounded-sm">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
                    ML EXPLANATORY FEATURE WEIGHTS
                  </span>
                  <div className="space-y-1.5">
                    {simulationResult.contributing_factors?.slice(0, 3).map((f: any, idx: number) => (
                      <div key={idx} className="flex justify-between items-center text-[11px]">
                        <span className="text-slate-400">{f.feature}</span>
                        <span className="font-bold text-slate-200">{(f.importance * 100).toFixed(1)}%</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Alternates from Yen's K-paths */}
                <div className="p-3 bg-slate-950 border border-slate-800 rounded-sm">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
                    YEN K-SHORTEST ALTERNATIVES (K=3)
                  </span>
                  {simulationResult.alternates && simulationResult.alternates.length > 0 ? (
                    <div className="space-y-1 text-[11px]">
                      {simulationResult.alternates.map((alt: any, idx: number) => (
                        <div key={idx} className="flex justify-between text-slate-300">
                          <span className="text-slate-400">#{idx + 2}: {alt.node_list.join(" \u2192 ")}</span>
                          <span className="font-bold text-sky-400 whitespace-nowrap ml-2">{alt.total_hours}h</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <span className="text-[11px] text-slate-500 italic">No additional paths feasible</span>
                  )}
                </div>
              </div>

              {/* Raw JSON Inspector Drawer Toggle */}
              <div className="border-t border-slate-800 pt-3 flex items-center justify-between text-xs">
                <button
                  type="button"
                  onClick={() => setShowJsonInspector(!showJsonInspector)}
                  className="text-slate-400 hover:text-slate-200 flex items-center gap-1.5 text-[11px]"
                >
                  <FileCode className="w-3.5 h-3.5 text-sky-400" />
                  <span>{showJsonInspector ? "[-] HIDE RAW AUDIT JSON" : "[+] INSPECT RAW AUDIT JSON"}</span>
                </button>
                <span className="text-[10px] text-slate-500">
                  SHA-256 HASH VERIFIED BY ORACLE
                </span>
              </div>

              {showJsonInspector && (
                <pre className="p-3 bg-slate-950 border border-slate-800 rounded-sm text-[10px] text-slate-300 overflow-x-auto">
                  {JSON.stringify(simulationResult, null, 2)}
                </pre>
              )}
            </div>
          ) : (
            <div className="bg-slate-900 border border-slate-800 rounded-sm p-12 text-center flex flex-col items-center justify-center min-h-[360px]">
              <Terminal className="w-8 h-8 text-slate-600 mb-2" />
              <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                NO SIMULATION EXECUTED IN CURRENT SESSION
              </h3>
              <p className="text-[11px] text-slate-500 max-w-sm mt-1 font-sans">
                Select a shipment corridor on the left, set the hazard severity or click one of the presets, and execute
                the simulation to view real-time detour and ledger anchoring.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Section: Recent Disruption Audit Log */}
      {history.length > 0 && (
        <div className="bg-slate-900 border border-slate-800 rounded-sm p-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-sky-400" />
              RECENT CORRIDOR REROUTE LOGS (BOUNDED BUFFER)
            </span>
            <span className="text-[10px] text-slate-500">AUDIT PROVENANCE</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border border-slate-800">
              <thead className="text-[10px] uppercase font-bold text-slate-400 bg-slate-950 border-b border-slate-800">
                <tr>
                  <th className="p-2 border-r border-slate-800">Time</th>
                  <th className="p-2 border-r border-slate-800">Shipment</th>
                  <th className="p-2 border-r border-slate-800">Corridor</th>
                  <th className="p-2 border-r border-slate-800">Disrupted Hub</th>
                  <th className="p-2 border-r border-slate-800">Delay Risk</th>
                  <th className="p-2 border-r border-slate-800">Delta</th>
                  <th className="p-2">On-Chain State</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-slate-300">
                {history.map((h: any, idx: number) => (
                  <tr key={idx} className="hover:bg-slate-800/40">
                    <td className="p-2 border-r border-slate-800 text-[11px] text-slate-400 whitespace-nowrap">
                      {new Date(h.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                    </td>
                    <td className="p-2 border-r border-slate-800 font-bold text-white">#{h.shipment_id}</td>
                    <td className="p-2 border-r border-slate-800">
                      {h.current_node} &rarr; {h.destination}
                    </td>
                    <td className="p-2 border-r border-slate-800 text-rose-400 font-semibold">{h.disrupted_node}</td>
                    <td className="p-2 border-r border-slate-800">
                      <span className="font-bold">{h.delay_risk_category}</span> (
                      {Math.round(h.delay_risk_probability * 100)}%)
                    </td>
                    <td className="p-2 border-r border-slate-800 font-bold text-sky-400">+{h.delta_hours}h</td>
                    <td className="p-2">
                      <span
                        className={`px-1.5 py-0.2 rounded-sm text-[10px] font-bold uppercase border ${
                          h.onchain_status === "anchored"
                            ? "bg-emerald-950 text-emerald-300 border-emerald-800"
                            : "bg-slate-800 text-slate-400 border-slate-700"
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
