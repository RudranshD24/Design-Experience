"use client";

import React, { useState, useEffect, useRef } from "react";
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
  Menu,
  X,
  ChevronDown,
} from "lucide-react";

export function Navbar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [moreDropdownOpen, setMoreDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

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

  // Primary operational workflows
  const primaryLinks = [
    { href: "/dashboard", label: "Overview", icon: Layers, show: isAuthenticated },
    { href: "/shipments", label: "Consignments", icon: Truck, show: isAuthenticated },
    { href: "/shipments/new", label: "Dispatch", icon: PlusCircle, show: isShipper || isAdmin },
    { href: "/disruption", label: "Disruption Engine", icon: Route, show: isAdmin },
    { href: "/disputes", label: "Disputes", icon: AlertTriangle, show: isAuthenticated },
  ];

  // Secondary or administrative modules
  const secondaryLinks = [
    { href: "/oracle", label: "Oracle Feed", icon: Radio, show: isAdmin },
    { href: "/participants", label: "RBAC Registry", icon: Users, show: isAdmin },
    { href: "/audit", label: "Ledger Audit", icon: History, show: isAdmin || isInspector },
    { href: "/analytics", label: "Telemetry", icon: BarChart3, show: isAuthenticated },
    { href: "/consensus", label: "Consensus Lab", icon: Network, show: true },
  ];

  const allVisibleLinks = [...primaryLinks, ...secondaryLinks].filter((l) => l.show);
  const visiblePrimary = primaryLinks.filter((l) => l.show);
  const visibleSecondary = secondaryLinks.filter((l) => l.show);

  const isSecondaryActive = visibleSecondary.some(
    (link) => pathname === link.href || (link.href !== "/dashboard" && pathname.startsWith(link.href))
  );

  // Close menus on path navigation
  useEffect(() => {
    setMobileOpen(false);
    setMoreDropdownOpen(false);
  }, [pathname]);

  // Click outside to close "More" dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setMoreDropdownOpen(false);
      }
    }
    if (moreDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [moreDropdownOpen]);

  // Keyboard navigation: Escape key closes menus
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setMoreDropdownOpen(false);
        setMobileOpen(false);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-slate-800 bg-slate-900/95 backdrop-blur-md">
      <div className="w-full max-w-[1680px] mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between gap-3 lg:gap-4">
        {/* ========================================================= */}
        {/* LEFT REGION: Brand Section                                 */}
        {/* ========================================================= */}
        <div className="flex items-center gap-3 shrink-0">
          <Link
            href="/"
            className="flex items-center gap-2.5 group focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-sky-400 rounded-sm"
          >
            <div className="w-8 h-8 rounded-sm bg-slate-800 border border-slate-700 flex items-center justify-center text-sky-400 group-hover:border-sky-500/50 transition-colors shrink-0">
              <Boxes className="w-4 h-4" />
            </div>
            <div className="flex flex-col justify-center">
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm tracking-tight text-white uppercase font-mono whitespace-nowrap">
                  CargoChain
                </span>
                <span className="hidden sm:inline-block text-[9px] font-mono px-1.5 py-0.5 bg-slate-800 border border-slate-700 text-slate-300 rounded font-semibold tracking-wider whitespace-nowrap">
                  OP-CONSOLE
                </span>
              </div>
              <span className="hidden md:block text-[10px] font-mono text-slate-400 whitespace-nowrap leading-tight">
                Phase 1 Resilience Platform
              </span>
            </div>
          </Link>
        </div>

        {/* ========================================================= */}
        {/* CENTER REGION: Primary Desktop Navigation                 */}
        {/* ========================================================= */}
        {/* Wide Desktop View (2XL screens: all links in a single row) */}
        <nav className="hidden 2xl:flex items-center gap-1 flex-1 justify-center max-w-4xl px-2">
          {allVisibleLinks.map((link) => {
            const Icon = link.icon;
            const isActive =
              pathname === link.href || (link.href !== "/dashboard" && pathname.startsWith(link.href));
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-mono transition-colors rounded-sm whitespace-nowrap ${
                  isActive
                    ? "bg-slate-800 text-white font-semibold border-b-2 border-sky-400"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
                }`}
              >
                <Icon className="w-3.5 h-3.5 shrink-0" />
                <span>{link.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Standard Desktop / Laptop View (LG to 2XL screens: Core links + "More" dropdown) */}
        <nav className="hidden lg:flex 2xl:hidden items-center gap-1 flex-1 justify-center px-2">
          {visiblePrimary.map((link) => {
            const Icon = link.icon;
            const isActive =
              pathname === link.href || (link.href !== "/dashboard" && pathname.startsWith(link.href));
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-mono transition-colors rounded-sm whitespace-nowrap ${
                  isActive
                    ? "bg-slate-800 text-white font-semibold border-b-2 border-sky-400"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
                }`}
              >
                <Icon className="w-3.5 h-3.5 shrink-0" />
                <span>{link.label}</span>
              </Link>
            );
          })}

          {visibleSecondary.length > 0 && (
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setMoreDropdownOpen(!moreDropdownOpen)}
                aria-expanded={moreDropdownOpen}
                aria-label="More navigation modules"
                className={`flex items-center gap-1 px-2.5 py-1.5 text-xs font-mono transition-colors rounded-sm whitespace-nowrap ${
                  isSecondaryActive || moreDropdownOpen
                    ? "bg-slate-800 text-white font-semibold border-b-2 border-sky-400"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
                }`}
              >
                <span>More</span>
                <ChevronDown
                  className={`w-3.5 h-3.5 transition-transform duration-150 ${
                    moreDropdownOpen ? "rotate-180 text-sky-400" : ""
                  }`}
                />
              </button>

              {moreDropdownOpen && (
                <div className="absolute left-0 mt-1.5 w-52 bg-slate-900 border border-slate-800 rounded-sm shadow-xl py-1 z-50">
                  {visibleSecondary.map((link) => {
                    const Icon = link.icon;
                    const isActive =
                      pathname === link.href || (link.href !== "/dashboard" && pathname.startsWith(link.href));
                    return (
                      <Link
                        key={link.href}
                        href={link.href}
                        onClick={() => setMoreDropdownOpen(false)}
                        className={`flex items-center gap-2 px-3 py-2 text-xs font-mono transition-colors ${
                          isActive
                            ? "bg-slate-800/90 text-sky-400 font-semibold border-l-2 border-sky-400"
                            : "text-slate-400 hover:text-white hover:bg-slate-800/50"
                        }`}
                      >
                        <Icon className="w-3.5 h-3.5 shrink-0" />
                        <span className="whitespace-nowrap">{link.label}</span>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </nav>

        {/* ========================================================= */}
        {/* RIGHT REGION: System and Account Controls                 */}
        {/* ========================================================= */}
        <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
          {/* Blockchain Network Indicator */}
          {account && (
            <div className="hidden sm:flex items-center gap-1.5 text-[10px] font-mono px-2 py-1 rounded-sm border border-slate-800 bg-slate-950 shrink-0">
              {isCorrectNetwork ? (
                <>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-slate-300 font-medium">GANACHE:1337</span>
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

          {/* Wallet and Role Controls */}
          {!account ? (
            <button
              onClick={connectWallet}
              disabled={isConnecting}
              className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-100 text-xs font-mono font-medium px-3 py-1.5 rounded-sm border border-slate-700 transition-colors disabled:opacity-50 shrink-0"
            >
              <LogIn className="w-3.5 h-3.5 text-sky-400" />
              <span className="whitespace-nowrap">{isConnecting ? "CONNECTING..." : "CONNECT WALLET"}</span>
            </button>
          ) : !isAuthenticated ? (
            <div className="flex items-center gap-2 shrink-0">
              <span className="hidden xl:inline text-xs font-mono text-slate-400 bg-slate-950 px-2 py-0.5 rounded-sm border border-slate-800 whitespace-nowrap">
                {displayAddress}
              </span>
              <button
                onClick={loginWithSignature}
                disabled={isLoggingIn}
                className="flex items-center gap-1.5 bg-sky-950 hover:bg-sky-900 text-sky-200 border border-sky-800 text-xs font-mono px-3 py-1.5 rounded-sm transition-colors disabled:opacity-50 shrink-0"
              >
                <Shield className="w-3.5 h-3.5 text-sky-400" />
                <span className="whitespace-nowrap">{isLoggingIn ? "VERIFYING..." : "EIP-191 SIGN"}</span>
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
              {/* Role Badge */}
              <span className="hidden md:inline-flex items-center px-1.5 py-0.5 rounded-sm text-[10px] font-mono font-bold uppercase tracking-wider bg-slate-800 text-sky-300 border border-slate-700 whitespace-nowrap shrink-0">
                ROLE: {roleName}
              </span>

              {/* Account Address */}
              <span
                className="hidden xl:inline-block text-xs font-mono text-slate-400 bg-slate-950 px-2 py-0.5 rounded-sm border border-slate-800 whitespace-nowrap shrink-0"
                title={account || ""}
              >
                {displayAddress}
              </span>

              {/* Logout Button */}
              <button
                onClick={logout}
                aria-label="Disconnect wallet and log out"
                title="Disconnect & Logout"
                className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-sm border border-transparent hover:border-slate-700 transition-colors shrink-0"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Mobile Navigation Toggle (Visible on screens < lg) */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Toggle navigation menu"
            aria-expanded={mobileOpen}
            className="lg:hidden p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-sm border border-slate-800 transition-colors shrink-0"
          >
            {mobileOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* ========================================================= */}
      {/* MOBILE / TABLET NAVIGATION DRAWER                         */}
      {/* ========================================================= */}
      {mobileOpen && (
        <div className="lg:hidden border-t border-slate-800 bg-slate-950/98 px-4 pt-3 pb-6 flex flex-col gap-3 shadow-2xl">
          {/* Identity & Status Summary (Mobile) */}
          {account && (
            <div className="p-3 bg-slate-900 border border-slate-800 rounded-sm flex flex-col gap-2 font-mono text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-400 text-[11px]">NETWORK:</span>
                <span className="flex items-center gap-1.5 text-emerald-400 text-[11px] font-semibold">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  GANACHE 1337
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400 text-[11px]">ROLE:</span>
                <span className="text-sky-300 text-[11px] font-bold">
                  {isAuthenticated ? roleName : "UNVERIFIED"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400 text-[11px]">WALLET:</span>
                <span className="text-slate-300 text-[11px] font-mono">{displayAddress}</span>
              </div>
            </div>
          )}

          {/* Navigation Links (Mobile) */}
          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500 px-2 py-1 font-semibold">
              Mission Control Navigation
            </span>
            {allVisibleLinks.map((link) => {
              const Icon = link.icon;
              const isActive =
                pathname === link.href || (link.href !== "/dashboard" && pathname.startsWith(link.href));
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  className={`flex items-center gap-2.5 px-3 py-2 text-xs font-mono rounded-sm transition-colors ${
                    isActive
                      ? "bg-slate-800 text-sky-400 font-bold border-l-2 border-sky-400"
                      : "text-slate-300 hover:text-white hover:bg-slate-900"
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0 text-slate-400" />
                  <span>{link.label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </header>
  );
}
