"use client";

import React, { useState, useEffect } from "react";
import { Activity, Send, Sparkles, Palette, Clock, Download } from "lucide-react";
import { getTradingSessionPhase, SessionPhaseInfo } from "../lib/sessionEngine";

interface HeaderProps {
  onRefreshAll?: () => void;
  isLoading?: boolean;
  onOpenTelegramModal: () => void;
  onOpenBackgroundModal?: () => void;
  onOpenMt5Modal?: () => void;
  lastSyncTimestamp?: number | null;
}

export default function Header({
  onOpenTelegramModal,
  onOpenBackgroundModal,
  onOpenMt5Modal,
}: HeaderProps) {
  const [time, setTime] = useState<string>("");
  const [sessionInfo, setSessionInfo] = useState<SessionPhaseInfo | null>(null);

  useEffect(() => {
    const update = () => {
      const now = new Date();
      setTime(now.toTimeString().split(" ")[0] + " UTC" + (now.getTimezoneOffset() > 0 ? "-" : "+") + Math.abs(now.getTimezoneOffset() / 60));
      setSessionInfo(getTradingSessionPhase(now));
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="border-b border-white/[0.08] bg-[#0A0C10]/95 backdrop-blur-xl sticky top-0 z-40 px-2.5 sm:px-4 lg:px-6 py-2 w-full min-w-0 shadow-lg shadow-black/40">
      <div className="w-full flex items-center justify-between gap-1.5 sm:gap-4 min-w-0">
        {/* Logo & Title */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-md bg-white/[0.06] border border-white/[0.12] flex items-center justify-center shrink-0">
            <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-400" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
              <h1 className="font-bold text-xs sm:text-sm md:text-[15px] text-white tracking-tight truncate flex items-center gap-1.5">
                <span>Aegis Quant Terminal</span>
              </h1>
              <span className="px-1.5 py-0.5 text-[9px] sm:text-[10px] font-mono font-medium rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 flex items-center gap-1 shrink-0">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="hidden xs:inline">LIVE QUANT</span>
                <span className="xs:hidden">LIVE</span>
              </span>
              <span className="hidden xl:inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-mono text-zinc-400 rounded bg-white/[0.04] border border-white/[0.08]">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                Institutional
              </span>
              {sessionInfo && (
                <span
                  className={`inline-flex items-center gap-1.5 px-2 py-0.5 text-[10px] font-mono font-medium rounded border ${
                    sessionInfo.phase === "NIGHT"
                      ? "bg-amber-500/10 text-amber-300 border-amber-500/30"
                      : sessionInfo.phase === "AFTERNOON"
                      ? "bg-sky-500/10 text-sky-300 border-sky-500/30"
                      : sessionInfo.phase === "MORNING"
                      ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/30"
                      : "bg-rose-500/10 text-rose-300 border-rose-500/30 animate-pulse"
                  }`}
                  title={sessionInfo.description}
                >
                  <span>{sessionInfo.label}</span>
                  <span className="hidden lg:inline text-zinc-400 text-[9px]">
                    ({sessionInfo.recommendedRegime === "RANGE_BOX" ? "เน้นกรอบ Sideway" : sessionInfo.recommendedRegime === "STAND_DOWN" ? "พักเทรด" : "เน้นรันเทรนด์"})
                  </span>
                </span>
              )}
            </div>
            <p className="text-[10px] sm:text-[11px] text-zinc-400 hidden sm:block truncate font-normal">
              5-Pillar Confluence Engine • Real-time Alpha Signals • Autonomous Execution Bridge
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          {/* Clock */}
          <div className="hidden md:flex items-center gap-1.5 h-7 sm:h-8 px-2.5 rounded-md bg-white/[0.03] border border-white/[0.06] text-[11px] font-mono text-zinc-400">
            <Activity className="w-3 h-3 text-zinc-400" />
            <span>{time || "Loading..."}</span>
          </div>

          {/* Background Studio Visual FX Trigger */}
          {onOpenBackgroundModal && (
            <button
              onClick={onOpenBackgroundModal}
              className="btn-terminal h-7 sm:h-8 px-2 sm:px-2.5 text-[11px] sm:text-xs font-medium flex items-center gap-1.5"
              title="ปรับแต่งฉากหลังพรีเมียม & Parallax"
            >
              <Palette className="w-3.5 h-3.5 text-zinc-400" />
              <span className="hidden md:inline">ธีมพื้นหลัง</span>
            </button>
          )}

          {/* MT5 EA Modal Trigger */}
          {onOpenMt5Modal && (
            <button
              onClick={onOpenMt5Modal}
              className="h-7 sm:h-8 px-2.5 sm:px-3 text-[11px] sm:text-xs font-semibold rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 transition-all flex items-center gap-1.5 shadow-sm shadow-emerald-950/30 cursor-pointer"
              title="ดาวน์โหลด EA สำหรับ MetaTrader 5 พร้อม On-Chart GUI Dashboard"
            >
              <Download className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
              <span className="hidden sm:inline">โหลด MT5 EA</span>
              <span className="sm:hidden">EA</span>
            </button>
          )}

          {/* Telegram & AI Settings */}
          <button
            onClick={onOpenTelegramModal}
            className="btn-primary h-7 sm:h-8 px-2.5 sm:px-3 text-[11px] sm:text-xs font-medium flex items-center gap-1.5"
          >
            <Send className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
            <span className="hidden sm:inline">Telegram & Keys</span>
            <span className="sm:hidden">Keys</span>
          </button>
        </div>
      </div>
    </header>
  );
}