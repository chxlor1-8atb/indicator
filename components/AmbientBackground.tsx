"use client";

import React, { useEffect, useState, useRef } from "react";

export type BackgroundTheme = "cyber-aurora" | "dark-gold" | "neural-matrix" | "minimal-obsidian";

interface AmbientBackgroundProps {
  theme?: BackgroundTheme;
  intensity?: number; // 0.1 to 1.0 (default 0.75)
  parallaxEnabled?: boolean;
}

export default function AmbientBackground({
  theme = "cyber-aurora",
  intensity = 0.75,
  parallaxEnabled = true,
}: AmbientBackgroundProps) {
  const [scrollY, setScrollY] = useState<number>(0);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (!parallaxEnabled) {
      setScrollY(0);
      return;
    }

    const handleScroll = () => {
      if (rafRef.current !== null) return;
      rafRef.current = window.requestAnimationFrame(() => {
        setScrollY(window.scrollY || window.pageYOffset || 0);
        rafRef.current = null;
      });
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    // Initial sync
    handleScroll();

    return () => {
      window.removeEventListener("scroll", handleScroll);
      if (rafRef.current !== null) {
        window.cancelAnimationFrame(rafRef.current);
      }
    };
  }, [parallaxEnabled]);

  // Parallax offsets (Layered speeds for cinematic 3D depth)
  const orbsOffsetY = parallaxEnabled ? scrollY * -0.15 : 0;
  const gridOffsetY = parallaxEnabled ? scrollY * -0.22 : 0;
  const deepAuraOffsetY = parallaxEnabled ? scrollY * -0.06 : 0;

  // Theme-specific color gradients and configurations
  const renderThemeLayers = () => {
    switch (theme) {
      case "dark-gold":
        return (
          <>
            {/* Base Background Color */}
            <div className="absolute inset-0 bg-[#090807]" />

            {/* Deep Ambient Light (Slowest Parallax) */}
            <div
              className="absolute inset-0 pointer-events-none parallax-gpu"
              style={{
                transform: `translate3d(0, ${deepAuraOffsetY}px, 0)`,
                opacity: intensity,
              }}
            >
              <div className="absolute -top-[15%] left-[10%] w-[650px] h-[650px] rounded-full bg-amber-600/20 blur-[130px] animate-aurora-pulse" />
              <div className="absolute top-[35%] -right-[10%] w-[750px] h-[750px] rounded-full bg-yellow-700/15 blur-[150px] animate-ambient-slow" />
              <div className="absolute top-[75%] left-[20%] w-[600px] h-[600px] rounded-full bg-orange-700/15 blur-[140px]" />
            </div>

            {/* Mid Orbs Layer (Medium Parallax) */}
            <div
              className="absolute inset-0 pointer-events-none parallax-gpu"
              style={{
                transform: `translate3d(0, ${orbsOffsetY}px, 0)`,
                opacity: intensity * 0.9,
              }}
            >
              <div className="absolute top-[5%] left-[25%] w-[450px] h-[450px] rounded-full bg-gradient-to-br from-amber-400/25 to-yellow-600/10 blur-[100px]" />
              <div className="absolute top-[50%] right-[15%] w-[500px] h-[500px] rounded-full bg-gradient-to-tl from-amber-500/20 to-orange-600/10 blur-[110px]" />
            </div>

            {/* Institutional Dot Matrix Pattern (Fastest Parallax) */}
            <div
              className="absolute inset-0 dot-matrix-pattern pointer-events-none parallax-gpu opacity-40"
              style={{
                transform: `translate3d(0, ${gridOffsetY}px, 0)`,
              }}
            />
          </>
        );

      case "neural-matrix":
        return (
          <>
            {/* Base Background Color */}
            <div className="absolute inset-0 bg-[#020b08]" />

            {/* Deep Ambient Light */}
            <div
              className="absolute inset-0 pointer-events-none parallax-gpu"
              style={{
                transform: `translate3d(0, ${deepAuraOffsetY}px, 0)`,
                opacity: intensity,
              }}
            >
              <div className="absolute -top-[10%] left-[5%] w-[700px] h-[700px] rounded-full bg-emerald-600/20 blur-[140px] animate-aurora-pulse" />
              <div className="absolute top-[40%] -right-[15%] w-[800px] h-[800px] rounded-full bg-teal-700/15 blur-[160px] animate-ambient-slow" />
            </div>

            {/* Mid Orbs Layer */}
            <div
              className="absolute inset-0 pointer-events-none parallax-gpu"
              style={{
                transform: `translate3d(0, ${orbsOffsetY}px, 0)`,
                opacity: intensity * 0.9,
              }}
            >
              <div className="absolute top-[10%] left-[30%] w-[480px] h-[480px] rounded-full bg-emerald-500/20 blur-[100px]" />
              <div className="absolute top-[55%] right-[20%] w-[520px] h-[520px] rounded-full bg-teal-400/15 blur-[110px]" />
            </div>

            {/* Cyber Grid Pattern */}
            <div
              className="absolute inset-0 cyber-grid-pattern pointer-events-none parallax-gpu opacity-50"
              style={{
                transform: `translate3d(0, ${gridOffsetY}px, 0)`,
              }}
            />
          </>
        );

      case "minimal-obsidian":
        return (
          <>
            <div className="absolute inset-0 bg-[#060709]" />
            <div
              className="absolute inset-0 pointer-events-none parallax-gpu"
              style={{
                transform: `translate3d(0, ${deepAuraOffsetY}px, 0)`,
                opacity: intensity * 0.5,
              }}
            >
              <div className="absolute top-[10%] left-[20%] w-[600px] h-[600px] rounded-full bg-slate-700/15 blur-[150px]" />
            </div>
            <div
              className="absolute inset-0 dot-matrix-pattern pointer-events-none parallax-gpu opacity-25"
              style={{
                transform: `translate3d(0, ${gridOffsetY}px, 0)`,
              }}
            />
          </>
        );

      case "cyber-aurora":
      default:
        return (
          <>
            {/* Base Background Color: Deep obsidian with navy undertone */}
            <div className="absolute inset-0 bg-[#04060A]" />

            {/* Deep Ambient Auroras (Slowest Parallax) */}
            <div
              className="absolute inset-0 pointer-events-none parallax-gpu"
              style={{
                transform: `translate3d(0, ${deepAuraOffsetY}px, 0)`,
                opacity: intensity,
              }}
            >
              {/* Cyan Aurora (Hero zone illumination) */}
              <div className="absolute -top-[12%] left-[8%] w-[750px] h-[750px] rounded-full bg-cyan-500/25 blur-[140px] animate-aurora-pulse" />
              
              {/* Electric Indigo/Purple Aurora (Right side depth) */}
              <div className="absolute top-[25%] -right-[12%] w-[850px] h-[850px] rounded-full bg-indigo-600/20 blur-[160px] animate-ambient-slow" />

              {/* Blue/Violet Mid Aura */}
              <div className="absolute top-[65%] left-[15%] w-[700px] h-[700px] rounded-full bg-blue-600/20 blur-[150px] animate-aurora-pulse" />
            </div>

            {/* Mid Glowing Orbs Layer (Medium Parallax) */}
            <div
              className="absolute inset-0 pointer-events-none parallax-gpu"
              style={{
                transform: `translate3d(0, ${orbsOffsetY}px, 0)`,
                opacity: intensity * 0.95,
              }}
            >
              {/* High-intensity Cyan Focal Point */}
              <div className="absolute top-[8%] left-[22%] w-[420px] h-[420px] rounded-full bg-gradient-to-tr from-cyan-400/30 to-blue-500/10 blur-[90px]" />
              
              {/* Secondary Violet Focal Point */}
              <div className="absolute top-[45%] right-[18%] w-[480px] h-[480px] rounded-full bg-gradient-to-bl from-indigo-500/25 to-purple-600/15 blur-[100px]" />

              {/* Lower Emerald Micro Accent (Bullish/Profitable Trading Feel) */}
              <div className="absolute top-[85%] right-[30%] w-[380px] h-[380px] rounded-full bg-emerald-500/15 blur-[110px]" />
            </div>

            {/* Cyber Grid Geometric Texture (Fastest Parallax) */}
            <div
              className="absolute inset-0 cyber-grid-pattern pointer-events-none parallax-gpu opacity-55"
              style={{
                transform: `translate3d(0, ${gridOffsetY}px, 0)`,
              }}
            />
          </>
        );
    }
  };

  return (
    <div
      aria-hidden="true"
      className="fixed inset-0 pointer-events-none overflow-hidden z-0 select-none"
    >
      {/* Theme Graphic & Light Layers */}
      {renderThemeLayers()}

      {/* Top Ambient Edge Glow (Matches the header and hero) */}
      <div className="absolute top-0 inset-x-0 h-32 bg-gradient-to-b from-cyan-500/10 via-transparent to-transparent pointer-events-none" />

      {/* Contrast Shield & Dark Frosted Vignette Mask */}
      {/* Ensures all text, charts, numbers, and badges retain 100% clarity */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/60 pointer-events-none" />
    </div>
  );
}
