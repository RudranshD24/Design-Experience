"use client";

import React from "react";
import Link from "next/link";
import { useWallet } from "@/context/WalletContext";
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
    <div className="flex flex-col gap-6 py-2">
      {/* System Telemetry & Gateway Banner */}
      <section className="bg-slate-900 border border-slate-800 rounded-sm p-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="max-w-3xl flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono uppercase tracking-widest px-2 py-0.5 bg-slate-800 text-sky-400 border border-slate-700 rounded-sm">
                SYSTEM OPERATIONAL
              </span>
              <span className="text-[10px] font-mono text-slate-400">
                CHAIN ID: 1337 | EVM LOCALHOST :8545
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white font-mono uppercase">
              Smart Supply Chain Resilience Platform
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 font-sans leading-relaxed">
              Decentralized logistics operations console providing multi-party custody auditing,
              IPFS-anchored document verification, milestone-conditioned escrow, and proactive
              incident rerouting with on-chain cryptographic provenance.
            </p>

            <div className="flex flex-wrap items-center gap-3 text-[11px] font-mono text-slate-400 border-t border-slate-800 pt-3">
              <span>PROJECT: <strong className="text-slate-200">CargoChain Phase 1</strong></span>
              <span className="text-slate-700">|</span>
              <span>AUTHOR: <strong className="text-slate-200">Rudransh Dubey</strong></span>
              <span className="text-slate-700">|</span>
              <span>AFFILIATION: <strong className="text-slate-200">B.Tech AI &amp; DS, NMIMS Indore</strong></span>
            </div>
          </div>

          {/* Authentication Gateway Card */}
          <div className="bg-slate-950 border border-slate-800 p-5 rounded-sm min-w-[300px] flex flex-col gap-3">
            <div className="flex items-center justify-between text-xs font-mono border-b border-slate-800 pb-2">
              <span className="text-slate-400 font-semibold uppercase">NODE ACCESS GATEWAY</span>
              <span className="text-emerald-400 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> ONLINE
              </span>
            </div>

            {!account ? (
              <button
                onClick={connectWallet}
                disabled={isConnecting}
                className="w-full flex items-center justify-center gap-2 bg-sky-950 hover:bg-sky-900 text-sky-200 border border-sky-800 font-mono text-xs font-semibold px-4 py-2.5 rounded-sm transition-colors disabled:opacity-50"
              >
                <LogIn className="w-3.5 h-3.5" />
                {isConnecting ? "CONNECTING..." : "CONNECT METAMASK"}
              </button>
            ) : !isAuthenticated ? (
              <div className="flex flex-col gap-2">
                <div className="text-[11px] font-mono text-slate-400 truncate">
                  WALLET: <span className="text-slate-200">{displayAddress}</span>
                </div>
                <button
                  onClick={loginWithSignature}
                  disabled={isLoggingIn}
                  className="w-full flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 font-mono text-xs font-semibold px-4 py-2.5 rounded-sm transition-colors disabled:opacity-50"
                >
                  <Shield className="w-3.5 h-3.5 text-sky-400" />
                  {isLoggingIn ? "VERIFYING SIGNATURE..." : "AUTHENTICATE (EIP-191)"}
                </button>
                {!isCorrectNetwork && (
                  <button
                    onClick={switchNetwork}
                    className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 bg-amber-950/60 text-amber-300 border border-amber-800 rounded-sm text-[11px] font-mono"
                  >
                    <AlertTriangle className="w-3 h-3" />
                    SWITCH TO GANACHE 1337
                  </button>
                )}
              </div>
            ) : (
              <div className="flex flex-col gap-2.5">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-slate-400">ACTIVE ROLE:</span>
                  <span className="text-sky-300 font-bold uppercase">{roleName}</span>
                </div>
                <div className="text-[11px] font-mono text-slate-400 truncate">
                  ACCOUNT: <span className="text-slate-300">{displayAddress}</span>
                </div>
                <Link
                  href="/dashboard"
                  className="w-full flex items-center justify-center gap-2 bg-emerald-950 hover:bg-emerald-900 text-emerald-200 border border-emerald-800 font-mono text-xs font-semibold px-4 py-2.5 rounded-sm transition-colors"
                >
                  <Layers className="w-3.5 h-3.5" />
                  ENTER OPERATIONAL CONSOLE
                  <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
            )}

            {authError && (
              <div className="p-2 bg-rose-950/80 border border-rose-800 text-rose-300 rounded-sm text-[11px] font-mono">
                ERR: {authError}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Protocol Architecture & Guarantee Matrix (Tabular, not 3 bento cards) */}
      <section className="bg-slate-900 border border-slate-800 rounded-sm p-6">
        <div className="border-b border-slate-800 pb-3 mb-4 flex items-center justify-between">
          <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
            <Terminal className="w-3.5 h-3.5 text-sky-400" />
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
                <td className="p-3">
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
                <td className="p-3">
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
                <td className="p-3">
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
                <td className="p-3 border-r border-slate-800 text-sky-400">
                  ML Advisory + Oracle Audit
                </td>
                <td className="p-3">
                  Risk scoring off-chain; reroute decision hashes anchored by Oracle account.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* Structured Demonstration Sequence (Acts 1 to 6) */}
      <section className="bg-slate-900 border border-slate-800 rounded-sm p-6">
        <div className="border-b border-slate-800 pb-3 mb-4 flex items-center justify-between">
          <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
            <Activity className="w-3.5 h-3.5 text-sky-400" />
            Verification Sequence &amp; Evaluation Acts
          </h2>
          <span className="text-[10px] font-mono text-slate-400">
            DEMO SCRIPT REF: DOCS/DEMO_SCRIPT.MD
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-sm flex flex-col justify-between">
            <div>
              <span className="text-[10px] font-mono uppercase text-sky-400 font-semibold">ACT 01</span>
              <h3 className="text-xs font-mono font-bold text-white mt-0.5">Role-Based Access Control</h3>
              <p className="text-[11px] text-slate-400 mt-1 font-sans">
                Admin registers authorized participants (Shipper, Transporter, Inspector). Unauthorized attempts revert.
              </p>
            </div>
            <Link href="/participants" className="text-[11px] font-mono text-sky-400 hover:underline mt-2 inline-flex items-center gap-1">
              Inspect RBAC Registry &rarr;
            </Link>
          </div>

          <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-sm flex flex-col justify-between">
            <div>
              <span className="text-[10px] font-mono uppercase text-sky-400 font-semibold">ACT 02</span>
              <h3 className="text-xs font-mono font-bold text-white mt-0.5">Custody &amp; Lifecycle</h3>
              <p className="text-[11px] text-slate-400 mt-1 font-sans">
                Shipper creates consignment, Transporter accepts and dispatches, milestones recorded sequentially.
              </p>
            </div>
            <Link href="/shipments" className="text-[11px] font-mono text-sky-400 hover:underline mt-2 inline-flex items-center gap-1">
              Inspect Consignments &rarr;
            </Link>
          </div>

          <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-sm flex flex-col justify-between">
            <div>
              <span className="text-[10px] font-mono uppercase text-sky-400 font-semibold">ACT 03</span>
              <h3 className="text-xs font-mono font-bold text-white mt-0.5">IPFS Hashes &amp; Escrow</h3>
              <p className="text-[11px] text-slate-400 mt-1 font-sans">
                Upload Bill of Lading, compute SHA-256, verify against tampering, deposit and release test-ETH.
              </p>
            </div>
            <Link href="/shipments/2" className="text-[11px] font-mono text-sky-400 hover:underline mt-2 inline-flex items-center gap-1">
              Inspect Escrow &amp; Documents &rarr;
            </Link>
          </div>

          <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-sm flex flex-col justify-between">
            <div>
              <span className="text-[10px] font-mono uppercase text-sky-400 font-semibold">ACT 04</span>
              <h3 className="text-xs font-mono font-bold text-white mt-0.5">Ledger Audit &amp; Recovery</h3>
              <p className="text-[11px] text-slate-400 mt-1 font-sans">
                Query event log, trigger idempotent database reindex to prove PostgreSQL projection is disposable.
              </p>
            </div>
            <Link href="/audit" className="text-[11px] font-mono text-sky-400 hover:underline mt-2 inline-flex items-center gap-1">
              Inspect Audit Log &rarr;
            </Link>
          </div>

          <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-sm flex flex-col justify-between">
            <div>
              <span className="text-[10px] font-mono uppercase text-sky-400 font-semibold">ACT 05</span>
              <h3 className="text-xs font-mono font-bold text-white mt-0.5">Dispute Tribunal &amp; Consensus</h3>
              <p className="text-[11px] text-slate-400 mt-1 font-sans">
                Freeze escrow upon commercial breach; benchmark simulated PoW, PoA, and PBFT consensus metrics.
              </p>
            </div>
            <Link href="/disputes" className="text-[11px] font-mono text-sky-400 hover:underline mt-2 inline-flex items-center gap-1">
              Inspect Disputes &rarr;
            </Link>
          </div>

          <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-sm flex flex-col justify-between">
            <div>
              <span className="text-[10px] font-mono uppercase text-sky-400 font-semibold">ACT 06</span>
              <h3 className="text-xs font-mono font-bold text-white mt-0.5">Disruption &amp; Dynamic Rerouting</h3>
              <p className="text-[11px] text-slate-400 mt-1 font-sans">
                Simulate corridor failure (Mumbai/Mundra), run ML delay risk, calculate Yen detour, anchor on-chain.
              </p>
            </div>
            <Link href="/disruption" className="text-[11px] font-mono text-sky-400 hover:underline mt-2 inline-flex items-center gap-1">
              Launch Disruption Engine &rarr;
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
