"use client";

import React from "react";
import dynamic from "next/dynamic";

const LogisticsGlobeHero = dynamic(() => import("./LogisticsGlobeHero"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[380px] sm:h-[440px] lg:h-[500px] flex flex-col items-center justify-center p-8 bg-slate-950/40 border border-slate-800/80 rounded-sm text-center font-mono animate-pulse">
      <div className="w-12 h-12 rounded-full border-2 border-slate-700 border-t-cyan-500 animate-spin mb-3" />
      <span className="text-xs text-slate-400 font-mono tracking-wider">
        INITIALIZING 3D LOGISTICS TOPOLOGY...
      </span>
      <span className="text-[10px] text-slate-600 mt-1">
        LOADING PROCEDURAL GLOBE &bull; MERCATOR ARCS
      </span>
    </div>
  ),
});

export function Hero3DWrapper() {
  return <LogisticsGlobeHero />;
}
