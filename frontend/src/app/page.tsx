"use client";

import React from "react";
import Link from "next/link";
import { useWallet } from "@/context/WalletContext";
import { Hero3DWrapper } from "@/components/hero/Hero3DWrapper";
import {
  Boxes,
  Shield,
  Truck,
  FileCheck2,
  Coins,
  ArrowRight,
  AlertTriangle,
  LogIn,
  Layers,
  Database,
  Route,
  Activity,
  Terminal,
  CheckCircle2,
  Compass,
} from "lucide-react";

export default function Home() {
  const {
    account,
    displayAddress,
    isCorrectNetwork,
    role,
    roleName,
    isAuthenticated,
    isConnecting,
    isLoggingIn,
    authError,
    connectWallet,
    loginWithSignature,
    switchNetwork,
  } = useWallet();

  return (
    <div className="flex flex-col gap-8 py-2">
      {/* Interactive 3D Hero Section (Two-Column Balanced Asymmetric Layout) */}
      <section className="bg-slate-900 border border-slate-800 rounded-sm p-6 lg:p-8 overflow-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          {/* Text & Action Column (7 cols on desktop) */}
          <div className="lg:col-span-7 flex flex-col gap-5 z-10">
            {/* Eyebrow Label & Status */}
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="text-[10px] font-mono font-bold tracking-wider uppercase px-2 py-0.5 bg-slate-950 text-cyan-400 border border-slate-800 rounded-sm">
                SMART FREIGHT NETWORK
              </span>
              <span className="text-[11px] font-mono text-slate-400 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                GANACHE 1337 ONLINE
              </span>
            </div>

            {/* Main Headline */}
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-white font-mono uppercase leading-tight">
              Every Shipment. <br />
              <span className="text-cyan-400">Connected. Visible.</span>
            </h1>

            {/* Supporting Copy */}
            <p className="text-sm sm:text-base text-slate-300 font-sans leading-relaxed max-w-xl">
              Coordinate shipments, monitor delivery milestones, and gain operational visibility into freight corridors through an enterprise logistics platform powered by smart-contract audit trails.
            </p>

            {/* Capability Indicators */}
            <div className="grid grid-cols-3 gap-2 py-1 text-[11px] font-mono text-slate-300 border-y border-slate-800/80 my-1">
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                <span>Multi-Party Custody</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                <span>Escrow Settlement</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                <span>Dynamic Rerouting</span>
              </div>
            </div>

            {/* Primary & Secondary Call to Actions */}
            <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              {!account ? (
                <button
                  onClick={connectWallet}
                  disabled={isConnecting}
                  className="flex items-center justify-center gap-2 bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-mono text-xs font-bold px-5 py-3 rounded-sm transition-colors disabled:opacity-50 shadow-sm"
                >
                  <LogIn className="w-4 h-4" />
                  {isConnecting ? "CONNECTING..." : "CONNECT WALLET"}
                </button>
              ) : !isAuthenticated ? (
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
                  <button
                    onClick={loginWithSignature}
                    disabled={isLoggingIn}
                    className="flex items-center justify-center gap-2 bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-mono text-xs font-bold px-5 py-3 rounded-sm transition-colors disabled:opacity-50 shadow-sm"
                  >
                    <Shield className="w-4 h-4" />
                    {isLoggingIn ? "VERIFYING SIGNATURE..." : `EIP-191 AUTH (${displayAddress})`}
                  </button>
                  {!isCorrectNetwork && (
                    <button
                      onClick={switchNetwork}
                      className="flex items-center justify-center gap-1.5 px-3 py-2.5 bg-amber-950/60 text-amber-300 border border-amber-800 rounded-sm text-xs font-mono"
                    >
                      <AlertTriangle className="w-3.5 h-3.5" />
                      SWITCH TO 1337
                    </button>
                  )}
                </div>
              ) : (
                <Link
                  href="/dashboard"
                  className="flex items-center justify-center gap-2 bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-mono text-xs font-bold px-5 py-3 rounded-sm transition-colors shadow-sm"
                >
                  <Layers className="w-4 h-4" />
                  ENTER OPERATIONS DESK ({roleName})
                  <ArrowRight className="w-4 h-4" />
                </Link>
              )}

              <Link
                href="/shipments"
                className="flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-mono text-xs font-semibold px-4 py-3 rounded-sm transition-colors"
              >
                <Truck className="w-4 h-4 text-slate-400" />
                EXPLORE CONSIGNMENTS
              </Link>
            </div>

            {authError && (
              <div className="p-2.5 bg-rose-950/80 border border-rose-800 text-rose-300 rounded-sm text-xs font-mono">
                AUTH REJECTED: {authError}
              </div>
            )}
          </div>

          {/* Interactive 3D Logistics Globe Column (5 cols on desktop) */}
          <div className="lg:col-span-5 flex items-center justify-center relative">
            <div className="w-full bg-slate-950/40 border border-slate-800/80 rounded-sm overflow-hidden p-2">
              <Hero3DWrapper />
            </div>
          </div>
        </div>
      </section>

      {/* Protocol Architecture & Guarantee Matrix (Tabular Operational Truth) */}
      <section className="bg-slate-900 border border-slate-800 rounded-sm p-6">
        <div className="border-b border-slate-800 pb-3 mb-4 flex items-center justify-between">
          <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
            <Terminal className="w-3.5 h-3.5 text-cyan-400" />
            Core Architectural Enforcements &amp; Invariants
          </h2>
          <span className="text-[10px] font-mono text-slate-400">
            SOLIDITY 0.8.24 + FASTAPI + POSTGRESQL + KUBO IPFS
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono border border-slate-800">
            <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 uppercase text-[10px]">
              <tr>
                <th className="p-3 border-r border-slate-800">Subsystem</th>
                <th className="p-3 border-r border-slate-800">Implementation Layer</th>
                <th className="p-3 border-r border-slate-800">State Authority</th>
                <th className="p-3">Deterministic Guarantees</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 text-slate-300">
              <tr className="hover:bg-slate-800/40">
                <td className="p-3 border-r border-slate-800 font-semibold text-white">
                  Custody &amp; Transitions
                </td>
                <td className="p-3 border-r border-slate-800 text-slate-400">
                  TrackingManager.sol &amp; ShipmentRegistry.sol
                </td>
                <td className="p-3 border-r border-slate-800 text-emerald-400">
                  Smart Contract (EVM)
                </td>
                <td className="p-3 font-sans text-xs">
                  10-stage sequential state machine. Illegal jumps revert on-chain.
                </td>
              </tr>
              <tr className="hover:bg-slate-800/40">
                <td className="p-3 border-r border-slate-800 font-semibold text-white">
                  Document Integrity
                </td>
                <td className="p-3 border-r border-slate-800 text-slate-400">
                  DocumentRegistry.sol + Local Kubo IPFS
                </td>
                <td className="p-3 border-r border-slate-800 text-emerald-400">
                  SHA-256 Digest on Ledger
                </td>
                <td className="p-3 font-sans text-xs">
                  Only 32-byte cryptographic hash is on-chain; full payload stored in IPFS.
                </td>
              </tr>
              <tr className="hover:bg-slate-800/40">
                <td className="p-3 border-r border-slate-800 font-semibold text-white">
                  Settlement &amp; Penalties
                </td>
                <td className="p-3 border-r border-slate-800 text-slate-400">
                  EscrowManager.sol
                </td>
                <td className="p-3 border-r border-slate-800 text-emerald-400">
                  Smart Contract Escrow
                </td>
                <td className="p-3 font-sans text-xs">
                  Delivery SLA delay penalties automatically computed on-chain (up to 30% cap).
                </td>
              </tr>
              <tr className="hover:bg-slate-800/40">
                <td className="p-3 border-r border-slate-800 font-semibold text-white">
                  Disruption &amp; Detours
                </td>
                <td className="p-3 border-r border-slate-800 text-slate-400">
                  FastAPI Routing Engine (Dijkstra + Yen K=3)
                </td>
                <td className="p-3 border-r border-slate-800 text-cyan-400">
                  ML Advisory + Oracle Audit
                </td>
                <td className="p-3 font-sans text-xs">
                  Risk scoring off-chain; reroute decision hashes anchored by Oracle account.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* Guided Demonstration Sequences (Acts 1 to 6) */}
      <section className="bg-slate-900 border border-slate-800 rounded-sm p-6">
        <div className="border-b border-slate-800 pb-3 mb-4 flex items-center justify-between">
          <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
            <Activity className="w-3.5 h-3.5 text-cyan-400" />
            Verification Sequence &amp; Evaluation Acts
          </h2>
          <span className="text-[10px] font-mono text-slate-400">
            DEMO SCRIPT REF: DOCS/DEMO_SCRIPT.MD
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-sm flex flex-col justify-between">
            <div>
              <span className="text-[10px] font-mono uppercase text-cyan-400 font-semibold">ACT 01</span>
              <h3 className="text-xs font-mono font-bold text-white mt-0.5">Role-Based Access Control</h3>
              <p className="text-[11px] text-slate-400 mt-1 font-sans">
                Admin registers authorized participants (Shipper, Transporter, Inspector). Unauthorized attempts revert.
              </p>
            </div>
            <Link href="/participants" className="text-[11px] font-mono text-cyan-400 hover:underline mt-2 inline-flex items-center gap-1">
              Inspect RBAC Registry &rarr;
            </Link>
          </div>

          <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-sm flex flex-col justify-between">
            <div>
              <span className="text-[10px] font-mono uppercase text-cyan-400 font-semibold">ACT 02</span>
              <h3 className="text-xs font-mono font-bold text-white mt-0.5">Custody &amp; Lifecycle</h3>
              <p className="text-[11px] text-slate-400 mt-1 font-sans">
                Shipper creates consignment, Transporter accepts and dispatches, milestones recorded sequentially.
              </p>
            </div>
            <Link href="/shipments" className="text-[11px] font-mono text-cyan-400 hover:underline mt-2 inline-flex items-center gap-1">
              Inspect Consignments &rarr;
            </Link>
          </div>

          <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-sm flex flex-col justify-between">
            <div>
              <span className="text-[10px] font-mono uppercase text-cyan-400 font-semibold">ACT 03</span>
              <h3 className="text-xs font-mono font-bold text-white mt-0.5">IPFS Hashes &amp; Escrow</h3>
              <p className="text-[11px] text-slate-400 mt-1 font-sans">
                Upload Bill of Lading, compute SHA-256, verify against tampering, deposit and release test-ETH.
              </p>
            </div>
            <Link href="/shipments/2" className="text-[11px] font-mono text-cyan-400 hover:underline mt-2 inline-flex items-center gap-1">
              Inspect Escrow &amp; Documents &rarr;
            </Link>
          </div>

          <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-sm flex flex-col justify-between">
            <div>
              <span className="text-[10px] font-mono uppercase text-cyan-400 font-semibold">ACT 04</span>
              <h3 className="text-xs font-mono font-bold text-white mt-0.5">Ledger Audit &amp; Recovery</h3>
              <p className="text-[11px] text-slate-400 mt-1 font-sans">
                Query event log, trigger idempotent database reindex to prove PostgreSQL projection is disposable.
              </p>
            </div>
            <Link href="/audit" className="text-[11px] font-mono text-cyan-400 hover:underline mt-2 inline-flex items-center gap-1">
              Inspect Audit Log &rarr;
            </Link>
          </div>

          <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-sm flex flex-col justify-between">
            <div>
              <span className="text-[10px] font-mono uppercase text-cyan-400 font-semibold">ACT 05</span>
              <h3 className="text-xs font-mono font-bold text-white mt-0.5">Dispute Tribunal &amp; Consensus</h3>
              <p className="text-[11px] text-slate-400 mt-1 font-sans">
                Freeze escrow upon commercial breach; benchmark simulated PoW, PoA, and PBFT consensus metrics.
              </p>
            </div>
            <Link href="/disputes" className="text-[11px] font-mono text-cyan-400 hover:underline mt-2 inline-flex items-center gap-1">
              Inspect Disputes &rarr;
            </Link>
          </div>

          <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-sm flex flex-col justify-between">
            <div>
              <span className="text-[10px] font-mono uppercase text-cyan-400 font-semibold">ACT 06</span>
              <h3 className="text-xs font-mono font-bold text-white mt-0.5">Disruption &amp; Dynamic Rerouting</h3>
              <p className="text-[11px] text-slate-400 mt-1 font-sans">
                Simulate corridor failure (Mumbai/Mundra), run ML delay risk, calculate Yen detour, anchor on-chain.
              </p>
            </div>
            <Link href="/disruption" className="text-[11px] font-mono text-cyan-400 hover:underline mt-2 inline-flex items-center gap-1">
              Launch Disruption Engine &rarr;
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
