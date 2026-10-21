"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useWallet } from "@/context/WalletContext";
import {
  Boxes,
  Truck,
  PlusCircle,
  Users,
  History,
  BarChart3,
  LogIn,
  LogOut,
  AlertTriangle,
  Shield,
  Layers,
  Radio,
  Network,
  Route,
} from "lucide-react";

export function Navbar() {
  const pathname = usePathname();
  const {
    account,
    displayAddress,
    isCorrectNetwork,
    role,
    roleName,
    isAuthenticated,
    isConnecting,
    isLoggingIn,
    connectWallet,
    loginWithSignature,
    logout,
    switchNetwork,
  } = useWallet();

  const isShipper = role === 2;
  const isAdmin = role === 1;
  const isInspector = role === 5;

  const navLinks = [
    { href: "/dashboard", label: "Overview", icon: Layers, show: isAuthenticated },
    { href: "/shipments", label: "Consignments", icon: Truck, show: isAuthenticated },
    { href: "/shipments/new", label: "Dispatch", icon: PlusCircle, show: isShipper || isAdmin },
    { href: "/disruption", label: "Disruption Engine", icon: Route, show: isAdmin },
    { href: "/disputes", label: "Disputes", icon: AlertTriangle, show: isAuthenticated },
    { href: "/oracle", label: "Oracle Feed", icon: Radio, show: isAdmin },
    { href: "/participants", label: "RBAC Registry", icon: Users, show: isAdmin },
    { href: "/audit", label: "Ledger Audit", icon: History, show: isAdmin || isInspector },
    { href: "/analytics", label: "Telemetry", icon: BarChart3, show: isAuthenticated },
    { href: "/consensus", label: "Consensus Lab", icon: Network, show: true },
  ];

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-800 bg-slate-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-13 flex items-center justify-between gap-4">
        {/* Brand */}
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-sm bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-200">
              <Boxes className="w-4 h-4 text-sky-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm tracking-tight text-white uppercase font-mono">
                  CargoChain
                </span>
                <span className="text-[10px] font-mono px-1.5 py-0.2 bg-slate-800 border border-slate-700 text-slate-400 rounded-sm">
                  OP-CONSOLE
                </span>
              </div>
              <span className="block text-[10px] font-mono text-slate-400">
                Phase 1 Resilience Platform
              </span>
            </div>
          </Link>

          {/* Navigation Links */}
          <nav className="hidden lg:flex items-center gap-0.5">
            {navLinks
              .filter((l) => l.show)
              .map((link) => {
                const Icon = link.icon;
                const isActive = pathname === link.href || (link.href !== "/dashboard" && pathname.startsWith(link.href));
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-mono transition-colors rounded-sm ${
                      isActive
                        ? "bg-slate-800 text-white font-semibold border-b-2 border-sky-500"
                        : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    {link.label}
                  </Link>
                );
              })}
          </nav>
        </div>

        {/* Network & Wallet Controls */}
        <div className="flex items-center gap-2.5">
          {/* Network indicator */}
          {account && (
            <div className="hidden sm:flex items-center gap-1.5 text-[11px] font-mono px-2 py-1 rounded-sm border border-slate-800 bg-slate-950">
              {isCorrectNetwork ? (
                <>
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span className="text-slate-300">GANACHE:1337</span>
                </>
              ) : (
                <button
                  onClick={switchNetwork}
                  className="flex items-center gap-1 text-amber-400 hover:underline"
                >
                  <AlertTriangle className="w-3 h-3" />
                  <span>SWITCH TO 1337</span>
                </button>
              )}
            </div>
          )}

          {/* Wallet / Session State */}
          {!account ? (
            <button
              onClick={connectWallet}
              disabled={isConnecting}
              className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-100 text-xs font-mono font-medium px-3 py-1.5 rounded-sm border border-slate-700 transition-colors disabled:opacity-50"
            >
              <LogIn className="w-3.5 h-3.5 text-sky-400" />
              {isConnecting ? "CONNECTING..." : "CONNECT WALLET"}
            </button>
          ) : !isAuthenticated ? (
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono text-slate-400">{displayAddress}</span>
              <button
                onClick={loginWithSignature}
                disabled={isLoggingIn}
                className="flex items-center gap-1.5 bg-sky-950 hover:bg-sky-900 text-sky-200 border border-sky-800 text-xs font-mono px-3 py-1.5 rounded-sm transition-colors disabled:opacity-50"
              >
                <Shield className="w-3.5 h-3.5 text-sky-400" />
                {isLoggingIn ? "VERIFYING..." : "EIP-191 SIGN"}
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              {/* Role Badge */}
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-sm text-[11px] font-mono font-bold uppercase tracking-wider bg-slate-800 text-sky-300 border border-slate-700">
                ROLE: {roleName}
              </span>

              {/* Account Address */}
              <span className="hidden sm:inline text-xs font-mono text-slate-400 bg-slate-950 px-2 py-0.5 rounded-sm border border-slate-800">
                {displayAddress}
              </span>

              {/* Logout button */}
              <button
                onClick={logout}
                title="Disconnect & Logout"
                className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-sm border border-transparent hover:border-slate-700 transition-colors"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
