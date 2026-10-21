"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useWallet } from "@/context/WalletContext";
import { api } from "@/lib/api";
import { STATUS_LABELS, STATUS_BADGE_CLASSES } from "@/contracts/config";
import {
  Truck,
  PlusCircle,
  Package,
  Clock,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Shield,
  Users,
  RefreshCw,
  FileText,
  Boxes,
  Route,
  Activity,
} from "lucide-react";

export default function DashboardPage() {
  const { account, role, roleName, user, isAuthenticated, loginWithSignature } = useWallet();

  const [analytics, setAnalytics] = useState<any>(null);
  const [recentShipments, setRecentShipments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) return;

    let isMounted = true;
    async function loadDashboardData() {
      setLoading(true);
      setError(null);
      try {
        const [analyticsRes, shipmentsRes] = await Promise.all([
          api.getAnalyticsSummary().catch(() => null),
          api.getShipments({ pageSize: 10 }).catch(() => ({ items: [], total: 0 })),
        ]);
        if (isMounted) {
          setAnalytics(analyticsRes);
          setRecentShipments(shipmentsRes?.items || []);
        }
      } catch (err: any) {
        if (isMounted) setError(err.message || "Failed to load dashboard data");
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadDashboardData();
    return () => {
      isMounted = false;
    };
  }, [isAuthenticated]);

  const handleQuickSync = async () => {
    setSyncing(true);
    try {
      await api.triggerSync();
      const shipmentsRes = await api.getShipments({ pageSize: 10 });
      setRecentShipments(shipmentsRes?.items || []);
    } catch (e) {
      console.error(e);
    } finally {
      setSyncing(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center font-mono">
        <div className="w-12 h-12 rounded-sm bg-slate-900 border border-slate-800 flex items-center justify-center text-sky-400 mb-3">
          <Shield className="w-6 h-6" />
        </div>
        <h2 className="text-base font-bold text-white uppercase tracking-wider">Authentication Required</h2>
        <p className="text-xs text-slate-400 max-w-sm mt-1 mb-5 font-sans">
          Connect your wallet and sign the cryptographic EIP-191 personal_sign challenge to decrypt and access your role-specific console.
        </p>
        <button
          onClick={loginWithSignature}
          className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-sky-300 border border-slate-700 font-mono text-xs font-semibold rounded-sm transition-colors"
        >
          [SIGN WITH METAMASK TO LOGIN]
        </button>
      </div>
    );
  }

  const isShipper = role === 2;
  const isTransporter = role === 3;
  const isInspector = role === 5;
  const isAdmin = role === 1;

  return (
    <div className="flex flex-col gap-5">
      {/* Operations Control Ribbon */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 rounded-sm p-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-sm bg-slate-950 border border-slate-800 text-sky-400 flex items-center justify-center font-mono font-bold text-sm">
            {roleName ? roleName.slice(0, 3).toUpperCase() : "USR"}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-mono font-bold text-white uppercase tracking-wider">
                {user?.companyName || "CARGOCHAIN OPERATIONS DESK"}
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-mono font-bold rounded-sm bg-slate-800 text-sky-300 border border-slate-700 uppercase">
                {roleName}
              </span>
            </div>
            <div className="flex items-center gap-2 text-[11px] font-mono text-slate-400 mt-0.5">
              <span>WALLET: {account}</span>
              <span className="text-slate-600">|</span>
              <span className="text-slate-300">Phase 1 Resilience Platform</span>
            </div>
          </div>
        </div>

        {/* Action Shortcuts */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleQuickSync}
            disabled={syncing}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-sm text-xs font-mono transition-colors disabled:opacity-50"
            title="Replay blockchain events into read-model"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-sky-400 ${syncing ? "animate-spin" : ""}`} />
            {syncing ? "SYNCING..." : "SYNC LEDGER"}
          </button>

          {(isShipper || isAdmin) && (
            <Link
              href="/shipments/new"
              className="flex items-center gap-1.5 px-3 py-1.5 bg-sky-950 hover:bg-sky-900 text-sky-200 border border-sky-800 rounded-sm text-xs font-mono font-semibold transition-colors"
            >
              <PlusCircle className="w-3.5 h-3.5 text-sky-400" />
              NEW SHIPMENT
            </Link>
          )}

          {isAdmin && (
            <Link
              href="/disruption"
              className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-950/80 hover:bg-rose-900 text-rose-200 border border-rose-800 rounded-sm text-xs font-mono font-semibold transition-colors"
            >
              <Route className="w-3.5 h-3.5 text-rose-400" />
              DISRUPTION ENGINE
            </Link>
          )}
        </div>
      </div>

      {/* Industrial KPI Metrics Strip (5 columns) */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-2.5 font-mono">
        <div className="bg-slate-900 border border-slate-800 rounded-sm p-3.5">
          <span className="text-[10px] text-slate-400 uppercase tracking-wider block">TOTAL CONSIGNMENTS</span>
          <div className="text-xl font-bold text-white mt-1">
            {loading ? "—" : analytics?.totalShipments ?? recentShipments.length}
          </div>
          <span className="text-[10px] text-slate-400 mt-0.5 block">Indexed in read model</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-sm p-3.5">
          <span className="text-[10px] text-slate-400 uppercase tracking-wider block">ACTIVE IN TRANSIT</span>
          <div className="text-xl font-bold text-sky-400 mt-1">
            {loading ? "—" : analytics?.statusCounts?.InTransit ?? 0}
          </div>
          <span className="text-[10px] text-slate-400 mt-0.5 block">On active freight corridors</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-sm p-3.5">
          <span className="text-[10px] text-slate-400 uppercase tracking-wider block">COMPLETED DELIVERIES</span>
          <div className="text-xl font-bold text-emerald-400 mt-1">
            {loading ? "—" : analytics?.statusCounts?.Completed ?? 0}
          </div>
          <span className="text-[10px] text-slate-400 mt-0.5 block">Escrow released</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-sm p-3.5">
          <span className="text-[10px] text-slate-400 uppercase tracking-wider block">DELAYED / FLAGGED</span>
          <div className="text-xl font-bold text-amber-400 mt-1">
            {loading ? "—" : analytics?.statusCounts?.Delayed ?? 0}
          </div>
          <span className="text-[10px] text-slate-400 mt-0.5 block">Oracle / corridor alerts</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-sm p-3.5">
          <span className="text-[10px] text-slate-400 uppercase tracking-wider block">DISPUTES / FROZEN</span>
          <div className="text-xl font-bold text-rose-400 mt-1">
            {loading ? "—" : analytics?.statusCounts?.Disputed ?? 0}
          </div>
          <span className="text-[10px] text-slate-400 mt-0.5 block">Escrow frozen</span>
        </div>
      </div>

      {/* Role Tasks Banner (Utilitarian) */}
      {isTransporter && (
        <div className="p-3 bg-slate-900 border border-slate-800 rounded-sm flex items-center justify-between text-xs font-mono">
          <div className="flex items-center gap-2.5">
            <Truck className="w-4 h-4 text-sky-400" />
            <span className="text-slate-300">
              TRANSPORTER DISPATCH QUEUE: Inspect assigned consignments ready to accept or dispatch.
            </span>
          </div>
          <Link href="/shipments" className="text-sky-400 hover:underline">
            OPEN SHIPMENTS &rarr;
          </Link>
        </div>
      )}

      {isInspector && (
        <div className="p-3 bg-slate-900 border border-slate-800 rounded-sm flex items-center justify-between text-xs font-mono">
          <div className="flex items-center gap-2.5">
            <FileText className="w-4 h-4 text-sky-400" />
            <span className="text-slate-300">
              INSPECTION QUEUE: Verify Bill of Lading SHA-256 hashes against IPFS and record certificates.
            </span>
          </div>
          <Link href="/shipments" className="text-sky-400 hover:underline">
            INSPECT DOCUMENTS &rarr;
          </Link>
        </div>
      )}

      {/* High-Density Active Shipments Data Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-sm overflow-hidden">
        <div className="p-3.5 border-b border-slate-800 flex items-center justify-between bg-slate-950 font-mono">
          <div className="flex items-center gap-2">
            <Activity className="w-3.5 h-3.5 text-sky-400" />
            <h3 className="font-bold text-xs text-white uppercase tracking-wider">
              Accessible Consignments Ledger
            </h3>
            <span className="text-[10px] text-slate-400">
              ({analytics?.totalShipments ?? recentShipments.length} total)
            </span>
          </div>
          <Link
            href="/shipments"
            className="text-[11px] font-mono text-sky-400 hover:underline flex items-center gap-1"
          >
            VIEW FULL TABLE &rarr;
          </Link>
        </div>

        {loading ? (
          <div className="p-6 space-y-2">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-8 bg-slate-800/60 rounded-sm animate-pulse" />
            ))}
          </div>
        ) : recentShipments.length === 0 ? (
          <div className="p-8 text-center flex flex-col items-center font-mono">
            <Boxes className="w-8 h-8 text-slate-500 mb-2" />
            <h4 className="text-xs font-bold text-slate-300 uppercase">No Shipments Found in Read Model</h4>
            <p className="text-[11px] text-slate-400 max-w-sm mt-1 mb-3">
              No transactions indexed for the connected account. Use &apos;New Shipment&apos; or re-run the demo seeder.
            </p>
            {(isShipper || isAdmin) && (
              <Link
                href="/shipments/new"
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-sky-300 border border-slate-700 rounded-sm text-xs font-semibold"
              >
                CREATE SHIPMENT
              </Link>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 uppercase text-[10px]">
                <tr>
                  <th className="py-2.5 px-3 border-r border-slate-800">ID</th>
                  <th className="py-2.5 px-3 border-r border-slate-800">Reference / Cargo</th>
                  <th className="py-2.5 px-3 border-r border-slate-800">Corridor</th>
                  <th className="py-2.5 px-3 border-r border-slate-800">Current Custodian</th>
                  <th className="py-2.5 px-3 border-r border-slate-800">Escrow</th>
                  <th className="py-2.5 px-3 border-r border-slate-800">Ledger Status</th>
                  <th className="py-2.5 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-slate-300">
                {recentShipments.map((s) => {
                  const statusLabel = STATUS_LABELS[s.status] || `Code ${s.status}`;
                  const badgeClass = STATUS_BADGE_CLASSES[s.status] || "bg-slate-800 text-slate-300";
                  return (
                    <tr key={s.shipmentId} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-2.5 px-3 border-r border-slate-800 font-bold text-white">
                        #{s.shipmentId}
                      </td>
                      <td className="py-2.5 px-3 border-r border-slate-800">
                        <div className="font-semibold text-slate-200 truncate max-w-[240px]">
                          {s.productDescription}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          REF: {s.externalRef || "N/A"} | QTY: {s.quantity}
                        </div>
                      </td>
                      <td className="py-2.5 px-3 border-r border-slate-800 whitespace-nowrap">
                        <span className="text-slate-300">{s.origin}</span>
                        <span className="text-slate-500 mx-1">&rarr;</span>
                        <span className="text-slate-300">{s.destination}</span>
                      </td>
                      <td className="py-2.5 px-3 border-r border-slate-800 text-[11px] text-slate-400 whitespace-nowrap">
                        {s.currentCustodian
                          ? `${s.currentCustodian.substring(0, 6)}...${s.currentCustodian.substring(s.currentCustodian.length - 4)}`
                          : "UNASSIGNED"}
                      </td>
                      <td className="py-2.5 px-3 border-r border-slate-800 text-[11px] whitespace-nowrap text-slate-200">
                        {s.paymentAmount ? `${Number(s.paymentAmount) / 1e18} ETH` : "0.0 ETH"}
                      </td>
                      <td className="py-2.5 px-3 border-r border-slate-800 whitespace-nowrap">
                        <span className={`inline-block px-2 py-0.5 rounded-sm text-[10px] font-bold uppercase border ${badgeClass}`}>
                          {statusLabel}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right whitespace-nowrap">
                        <Link
                          href={`/shipments/${s.shipmentId}`}
                          className="text-sky-400 hover:underline font-semibold"
                        >
                          INSPECT &rarr;
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
