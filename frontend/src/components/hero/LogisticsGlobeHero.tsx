"use client";

import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";

// Canonical logistics hub coordinates [lat, lon, name]
const LOGISTICS_HUBS = [
  { lat: 18.95, lon: 72.95, name: "Mumbai/JNPT", isMajor: true },
  { lat: 22.72, lon: 75.86, name: "Indore Depot", isMajor: true },
  { lat: 22.83, lon: 69.71, name: "Mundra Port", isMajor: true },
  { lat: 28.61, lon: 77.21, name: "Delhi NCR", isMajor: true },
  { lat: 13.08, lon: 80.27, name: "Chennai Port", isMajor: false },
  { lat: 18.52, lon: 73.85, name: "Pune Logistics Hub", isMajor: false },
  { lat: 25.27, lon: 55.30, name: "Dubai (Jebel Ali)", isMajor: true },
  { lat: 1.35, lon: 103.82, name: "Singapore Port", isMajor: true },
  { lat: 51.92, lon: 4.48, name: "Rotterdam", isMajor: true },
  { lat: 31.23, lon: 121.47, name: "Shanghai", isMajor: false },
];

// Freight trade lane routes between hubs [sourceIdx, targetIdx, colorHex]
const TRADE_LANES = [
  { from: 1, to: 0, color: 0x06b6d4 }, // Indore -> Mumbai
  { from: 0, to: 6, color: 0x38bdf8 }, // Mumbai -> Dubai
  { from: 2, to: 3, color: 0x06b6d4 }, // Mundra -> Delhi
  { from: 6, to: 8, color: 0x818cf8 }, // Dubai -> Rotterdam
  { from: 0, to: 7, color: 0x34d399 }, // Mumbai -> Singapore
  { from: 7, to: 4, color: 0x34d399 }, // Singapore -> Chennai
  { from: 1, to: 5, color: 0x06b6d4 }, // Indore -> Pune
  { from: 7, to: 9, color: 0x818cf8 }, // Singapore -> Shanghai
];

function latLonToVector3(lat: number, lon: number, radius: number): THREE.Vector3 {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lon + 180) * (Math.PI / 180);
  const x = -(radius * Math.sin(phi) * Math.cos(theta));
  const z = radius * Math.sin(phi) * Math.sin(theta);
  const y = radius * Math.cos(phi);
  return new THREE.Vector3(x, y, z);
}

export default function LogisticsGlobeHero() {
  const mountRef = useRef<HTMLDivElement>(null);
  const [webglSupported, setWebglSupported] = useState<boolean>(true);
  const [activeHub, setActiveHub] = useState<string>("Mumbai/JNPT");

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    // Detect WebGL capability
    try {
      const canvas = document.createElement("canvas");
      const gl = canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
      if (!gl) {
        setWebglSupported(false);
        return;
      }
    } catch {
      setWebglSupported(false);
      return;
    }

    // Check prefers-reduced-motion
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // Dimensions
    const width = container.clientWidth || 480;
    const height = container.clientHeight || 480;

    // 1. Scene & Camera
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(0, 8, 24);

    // 2. Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);
    container.appendChild(renderer.domElement);

    // 3. Globe Root Group (rotated to center Indian subcontinent)
    const globeGroup = new THREE.Group();
    globeGroup.rotation.x = 0.25;
    globeGroup.rotation.y = -1.2;
    scene.add(globeGroup);

    const GLOBE_RADIUS = 7.5;

    // A. Inner dark core sphere
    const coreGeo = new THREE.SphereGeometry(GLOBE_RADIUS * 0.98, 48, 48);
    const coreMat = new THREE.MeshBasicMaterial({
      color: 0x080f1d,
      transparent: true,
      opacity: 0.95,
    });
    const coreSphere = new THREE.Mesh(coreGeo, coreMat);
    globeGroup.add(coreSphere);

    // B. Graticule grid rings (Latitude & Longitude parallels)
    const gridMat = new THREE.LineBasicMaterial({ color: 0x1e3a5f, transparent: true, opacity: 0.25 });
    for (let lat = -60; lat <= 60; lat += 30) {
      const ringRad = GLOBE_RADIUS * Math.cos((lat * Math.PI) / 180);
      const ringY = GLOBE_RADIUS * Math.sin((lat * Math.PI) / 180);
      const ringGeo = new THREE.BufferGeometry();
      const points: THREE.Vector3[] = [];
      for (let i = 0; i <= 64; i++) {
        const theta = (i / 64) * Math.PI * 2;
        points.push(new THREE.Vector3(ringRad * Math.cos(theta), ringY, ringRad * Math.sin(theta)));
      }
      ringGeo.setFromPoints(points);
      const ring = new THREE.Line(ringGeo, gridMat);
      globeGroup.add(ring);
    }

    // C. Procedural landmass dot grid
    const dotCount = 1400;
    const dotPositions = new Float32Array(dotCount * 3);
    const dotColors = new Float32Array(dotCount * 3);
    const baseColor = new THREE.Color(0x38bdf8);
    const oceanColor = new THREE.Color(0x0f2942);

    for (let i = 0; i < dotCount; i++) {
      // Fibonacci sphere distribution
      const y = 1 - (i / (dotCount - 1)) * 2;
      const radiusAtY = Math.sqrt(1 - y * y);
      const theta = i * 2.3999632; // Golden angle in radians

      const x = Math.cos(theta) * radiusAtY;
      const z = Math.sin(theta) * radiusAtY;

      dotPositions[i * 3] = x * GLOBE_RADIUS;
      dotPositions[i * 3 + 1] = y * GLOBE_RADIUS;
      dotPositions[i * 3 + 2] = z * GLOBE_RADIUS;

      // Color variation simulating land density
      const isHighDensity = Math.sin(x * 4) * Math.cos(z * 4) + y > 0.1;
      const c = isHighDensity ? baseColor : oceanColor;
      dotColors[i * 3] = c.r;
      dotColors[i * 3 + 1] = c.g;
      dotColors[i * 3 + 2] = c.b;
    }

    const dotGeo = new THREE.BufferGeometry();
    dotGeo.setAttribute("position", new THREE.BufferAttribute(dotPositions, 3));
    dotGeo.setAttribute("color", new THREE.BufferAttribute(dotColors, 3));
    const dotMat = new THREE.PointsMaterial({
      size: 0.13,
      vertexColors: true,
      transparent: true,
      opacity: 0.85,
    });
    const globeDots = new THREE.Points(dotGeo, dotMat);
    globeGroup.add(globeDots);

    // D. Outer Atmospheric Glow Ring
    const atmosphereGeo = new THREE.RingGeometry(GLOBE_RADIUS * 1.02, GLOBE_RADIUS * 1.14, 64);
    const atmosphereMat = new THREE.MeshBasicMaterial({
      color: 0x0284c7,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.15,
    });
    const atmosphere = new THREE.Mesh(atmosphereGeo, atmosphereMat);
    scene.add(atmosphere); // Stays screen-aligned

    // E. Hub Markers & Beacon Rings
    const hubPositions: THREE.Vector3[] = [];
    LOGISTICS_HUBS.forEach((hub) => {
      const pos = latLonToVector3(hub.lat, hub.lon, GLOBE_RADIUS);
      hubPositions.push(pos);

      // Hub core pin
      const pinGeo = new THREE.SphereGeometry(hub.isMajor ? 0.16 : 0.11, 16, 16);
      const pinMat = new THREE.MeshBasicMaterial({
        color: hub.isMajor ? 0x38bdf8 : 0x34d399,
      });
      const pin = new THREE.Mesh(pinGeo, pinMat);
      pin.position.copy(pos);
      globeGroup.add(pin);

      // Pulse ring for major hubs
      if (hub.isMajor) {
        const ringG = new THREE.RingGeometry(0.2, 0.28, 16);
        const ringM = new THREE.MeshBasicMaterial({
          color: 0x06b6d4,
          side: THREE.DoubleSide,
          transparent: true,
          opacity: 0.5,
        });
        const pulseRing = new THREE.Mesh(ringG, ringM);
        pulseRing.position.copy(pos);
        pulseRing.lookAt(new THREE.Vector3(0, 0, 0));
        globeGroup.add(pulseRing);
      }
    });

    // F. 3D Spline Trade Lanes & Animated Packets
    interface RouteData {
      curve: THREE.CubicBezierCurve3;
      packet: THREE.Mesh;
      speed: number;
      progress: number;
    }
    const routes: RouteData[] = [];

    TRADE_LANES.forEach((lane) => {
      const start = hubPositions[lane.from];
      const end = hubPositions[lane.to];
      if (!start || !end) return;

      // Calculate arched control points elevated above globe
      const distance = start.distanceTo(end);
      const altitude = GLOBE_RADIUS + Math.min(distance * 0.35, 2.8);

      const mid1 = start.clone().lerp(end, 0.33).normalize().multiplyScalar(altitude);
      const mid2 = start.clone().lerp(end, 0.66).normalize().multiplyScalar(altitude);

      const curve = new THREE.CubicBezierCurve3(start, mid1, mid2, end);
      const curvePoints = curve.getPoints(40);
      const curveGeo = new THREE.BufferGeometry().setFromPoints(curvePoints);
      const curveMat = new THREE.LineBasicMaterial({
        color: lane.color,
        transparent: true,
        opacity: 0.6,
      });
      const line = new THREE.Line(curveGeo, curveMat);
      globeGroup.add(line);

      // Animated Cargo Packet (Traveling Photon)
      const packetGeo = new THREE.SphereGeometry(0.12, 12, 12);
      const packetMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
      const packet = new THREE.Mesh(packetGeo, packetMat);
      globeGroup.add(packet);

      routes.push({
        curve,
        packet,
        speed: 0.003 + Math.random() * 0.002,
        progress: Math.random(),
      });
    });

    // 4. Mouse Interactive Parallax & Dragging
    let isDragging = false;
    let prevMouseX = 0;
    let prevMouseY = 0;
    let targetRotationX = 0.25;
    let targetRotationY = -1.2;

    const onPointerDown = (e: PointerEvent) => {
      isDragging = true;
      prevMouseX = e.clientX;
      prevMouseY = e.clientY;
    };

    const onPointerMove = (e: PointerEvent) => {
      if (isDragging) {
        const deltaX = e.clientX - prevMouseX;
        const deltaY = e.clientY - prevMouseY;
        targetRotationY += deltaX * 0.005;
        targetRotationX += deltaY * 0.005;
        targetRotationX = Math.max(-0.6, Math.min(0.6, targetRotationX));
        prevMouseX = e.clientX;
        prevMouseY = e.clientY;
      } else {
        // Subtle tilt when hovering
        const rect = container.getBoundingClientRect();
        const normX = (e.clientX - rect.left) / rect.width - 0.5;
        const normY = (e.clientY - rect.top) / rect.height - 0.5;
        camera.position.x = normX * 1.5;
        camera.position.y = 8 - normY * 1.5;
        camera.lookAt(0, 0, 0);
      }
    };

    const onPointerUp = () => {
      isDragging = false;
    };

    container.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);

    // Hub rotation cycling for live UI label
    let hubTimer = 0;
    let currentHubIndex = 0;

    // 5. Render Loop
    let animationFrameId: number;
    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);

      if (!prefersReducedMotion) {
        // Continuous slow rotation if not dragging
        if (!isDragging) {
          targetRotationY += 0.0012;
        }

        // Animate cargo packets along curves
        routes.forEach((r) => {
          r.progress += r.speed;
          if (r.progress > 1) r.progress = 0;
          const pos = r.curve.getPointAt(r.progress);
          r.packet.position.copy(pos);
        });
      }

      // Smooth damping interpolation
      globeGroup.rotation.y += (targetRotationY - globeGroup.rotation.y) * 0.05;
      globeGroup.rotation.x += (targetRotationX - globeGroup.rotation.x) * 0.05;

      // Cycle active hub label periodically
      hubTimer++;
      if (hubTimer > 240) {
        hubTimer = 0;
        currentHubIndex = (currentHubIndex + 1) % LOGISTICS_HUBS.length;
        setActiveHub(LOGISTICS_HUBS[currentHubIndex].name);
      }

      renderer.render(scene, camera);
    };

    animate();

    // 6. Responsive Resize Observer
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const newWidth = entry.contentRect.width;
        const newHeight = entry.contentRect.height;
        if (newWidth > 0 && newHeight > 0) {
          camera.aspect = newWidth / newHeight;
          camera.updateProjectionMatrix();
          renderer.setSize(newWidth, newHeight);
        }
      }
    });
    resizeObserver.observe(container);

    // 7. Cleanup
    return () => {
      cancelAnimationFrame(animationFrameId);
      container.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      resizeObserver.disconnect();

      // Dispose Geometries and Materials
      coreGeo.dispose();
      coreMat.dispose();
      dotGeo.dispose();
      dotMat.dispose();
      gridMat.dispose();
      atmosphereGeo.dispose();
      atmosphereMat.dispose();
      routes.forEach((r) => {
        r.packet.geometry.dispose();
        (r.packet.material as THREE.Material).dispose();
      });

      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  return (
    <div className="relative w-full h-[380px] sm:h-[440px] lg:h-[500px] flex items-center justify-center select-none">
      {webglSupported ? (
        <>
          {/* 3D Canvas Container */}
          <div
            ref={mountRef}
            className="w-full h-full cursor-grab active:cursor-grabbing touch-none"
            aria-label="Interactive 3D Logistics Globe showing freight routes and hubs"
          />

          {/* Floating Telemetry Indicator Overlay */}
          <div className="absolute bottom-3 left-4 right-4 flex items-center justify-between text-[11px] font-mono text-slate-400 bg-slate-950/80 backdrop-blur-sm border border-slate-800/80 px-3 py-1.5 rounded-sm pointer-events-none">
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
              <span className="text-slate-300">ACTIVE HUB:</span>
              <span className="text-cyan-400 font-bold">{activeHub}</span>
            </div>
            <span className="text-slate-500 hidden sm:inline">
              DRAG TO ROTATE &bull; 8 GLOBAL FREIGHT LANES
            </span>
          </div>
        </>
      ) : (
        /* Graceful WebGL Unavailable Fallback */
        <div className="w-full h-full flex flex-col items-center justify-center p-8 bg-slate-900 border border-slate-800 rounded-sm text-center font-mono">
          <div className="w-16 h-16 rounded-full border border-sky-500/30 flex items-center justify-center mb-3 text-sky-400">
            &bull;
          </div>
          <h3 className="text-xs font-bold text-white uppercase tracking-wider">
            CONNECTED FREIGHT TOPOLOGY
          </h3>
          <p className="text-[11px] text-slate-400 max-w-xs mt-1 font-sans">
            Hardware acceleration unavailable. Logistics routing engine operates across 12 Indian and global multimodal corridor hubs.
          </p>
        </div>
      )}
    </div>
  );
}
