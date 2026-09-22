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
  const [isTabVisible, setIsTabVisible] = useState<boolean>(true);
  const rafRef = useRef<number | null>(null);

  // ─── Page Visibility Listener (Battery & GPU Saver) ───
  useEffect(() => {
    const handleVisibilityChange = () => {
      setIsTabVisible(document.visibilityState === "visible");
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  // ─── Parallax Scroll Tracking with iOS Overscroll Clamping ───
  useEffect(() => {
    if (!parallaxEnabled) {
      setScrollY(0);
      return;
    }

    if (typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setScrollY(0);
      return;
    }

    const handleScroll = () => {
      if (rafRef.current !== null || !isTabVisible) return;
      rafRef.current = window.requestAnimationFrame(() => {
        const rawY = window.scrollY || window.pageYOffset || 0;
        // ป้องกัน iOS Safari Rubber-Band bounce ที่ทำให้ scrollY ติดลบ
        setScrollY(Math.max(0, rawY));
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
  }, [parallaxEnabled, isTabVisible]);

  // Parallax offsets (Layered speeds for cinematic 3D depth)
  const orbsOffsetY = parallaxEnabled ? scrollY * -0.12 : 0;
  const gridOffsetY = parallaxEnabled ? Math.round(scrollY * -0.22) : 0;
  const deepAuraOffsetY = parallaxEnabled ? scrollY * -0.05 : 0;

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
              <div className="absolute top-[110%] right-[15%] w-[650px] h-[650px] rounded-full bg-amber-600/15 blur-[150px]" />
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
              <div className="absolute top-[105%] left-[20%] w-[480px] h-[480px] rounded-full bg-gradient-to-tr from-yellow-600/15 to-amber-700/10 blur-[120px]" />
            </div>

            {/* Institutional Dot Matrix Pattern (Infinite seamless background-position scroll) */}
            <div
              className="absolute inset-0 dot-matrix-pattern pointer-events-none opacity-40"
              style={{
                backgroundPosition: `0px ${gridOffsetY}px`,
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
              <div className="absolute top-[110%] left-[10%] w-[700px] h-[700px] rounded-full bg-emerald-700/15 blur-[150px]" />
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
              <div className="absolute top-[115%] left-[25%] w-[450px] h-[450px] rounded-full bg-emerald-600/15 blur-[120px]" />
            </div>

            {/* Cyber Grid Pattern (Infinite seamless background-position scroll) */}
            <div
              className="absolute inset-0 cyber-grid-pattern pointer-events-none opacity-50"
              style={{
                backgroundPosition: `0px ${gridOffsetY}px`,
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
              <div className="absolute top-[80%] right-[20%] w-[600px] h-[600px] rounded-full bg-slate-800/10 blur-[150px]" />
            </div>
            <div
              className="absolute inset-0 dot-matrix-pattern pointer-events-none opacity-25"
              style={{
                backgroundPosition: `0px ${gridOffsetY}px`,
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

              {/* Lower Indigo/Cyan Extended Aura (Covers long scroll views) */}
              <div className="absolute top-[115%] right-[10%] w-[750px] h-[750px] rounded-full bg-indigo-700/15 blur-[160px]" />
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

              {/* Deep Page Bottom Accent */}
              <div className="absolute top-[125%] left-[20%] w-[450px] h-[450px] rounded-full bg-cyan-500/15 blur-[120px]" />
            </div>

            {/* Cyber Grid Geometric Texture (Infinite seamless background-position scroll) */}
            <div
              className="absolute inset-0 cyber-grid-pattern pointer-events-none opacity-55"
              style={{
                backgroundPosition: `0px ${gridOffsetY}px`,
              }}
            />
          </>
        );
    }
  };

  // Dynamic adaptive anti-glare scrim for high-intensity vibrancy (Step 3)
  const adaptiveScrimOpacity = intensity > 0.8 ? Math.min(0.5, (intensity - 0.8) * 1.5) : 0;

  return (
    <div
      aria-hidden="true"
      className={`fixed inset-0 pointer-events-none overflow-hidden z-0 select-none ${
        !isTabVisible ? "paused-animations" : ""
      }`}
    >
      {/* Theme Graphic & Light Layers with Smooth Cross-Fade Transition */}
      <div key={theme} className="absolute inset-0 animate-fadeIn transition-opacity duration-500 pointer-events-none">
        {renderThemeLayers()}
      </div>

      {/* Top Ambient Edge Glow (Matches the header and hero) */}
      <div className="absolute top-0 inset-x-0 h-32 bg-gradient-to-b from-cyan-500/10 via-transparent to-transparent pointer-events-none" />

      {/* Contrast Shield & Dark Frosted Vignette Mask */}
      {/* Ensures all text, charts, numbers, and badges retain 100% clarity */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/25 via-transparent to-black/65 pointer-events-none" />

      {/* Adaptive Anti-Glare Scrim for Ultra-Vibrant Intensity Settings */}
      {adaptiveScrimOpacity > 0 && (
        <div
          className="absolute inset-0 bg-black/40 pointer-events-none transition-opacity duration-300"
          style={{ opacity: adaptiveScrimOpacity }}
        />
      )}
    </div>
  );
}
