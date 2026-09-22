"use client";

import React, { useState, useEffect } from "react";
import { Activity, Send, Sparkles, RefreshCw, Palette } from "lucide-react";

interface HeaderProps {
  onRefreshAll: () => void;
  isLoading: boolean;
  onOpenTelegramModal: () => void;
  onOpenBackgroundModal?: () => void;
  lastSyncTimestamp?: number | null;
}

export default function Header({
  onRefreshAll,
  isLoading,
  onOpenTelegramModal,
  onOpenBackgroundModal,
  lastSyncTimestamp,
}: HeaderProps) {
  const [time, setTime] = useState<string>("");
  const [freshnessText, setFreshnessText] = useState<string>("เพิ่งซิงค์");

  useEffect(() => {
    const update = () => {
      const now = new Date();
      setTime(now.toTimeString().split(" ")[0] + " UTC" + (now.getTimezoneOffset() > 0 ? "-" : "+") + Math.abs(now.getTimezoneOffset() / 60));
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!lastSyncTimestamp) {
      setFreshnessText("กำลังซิงค์...");
      return;
    }
    const updateFreshness = () => {
      const diffSec = Math.max(0, Math.floor((Date.now() - lastSyncTimestamp) / 1000));
      if (diffSec < 5) setFreshnessText("สดเรียลไทม์ (เมื่อสักครู่)");
      else if (diffSec < 60) setFreshnessText(`ซิงค์ล่าสุด: ${diffSec} วิที่แล้ว`);
      else {
        const mins = Math.floor(diffSec / 60);
        setFreshnessText(`ซิงค์ล่าสุด: ${mins} นาทีที่แล้ว`);
      }
    };
    updateFreshness();
    const interval = setInterval(updateFreshness, 2000);
    return () => clearInterval(interval);
  }, [lastSyncTimestamp]);

  return (
    <header className="border-b border-white/[0.08] bg-[#0A0C10]/95 backdrop-blur-xl sticky top-0 z-40 px-3 sm:px-6 py-2 w-full min-w-0 shadow-lg shadow-black/40">
      <div className="w-full flex items-center justify-between gap-2 sm:gap-4 min-w-0">
        {/* Logo & Title */}
        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
          <div className="w-8 h-8 rounded-md bg-white/[0.06] border border-white/[0.12] flex items-center justify-center shrink-0">
            <Sparkles className="w-4 h-4 text-blue-400" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="font-bold text-sm sm:text-[15px] text-white tracking-tight truncate flex items-center gap-2">
                <span>Aegis Quant Terminal</span>
              </h1>
              <span className="px-1.5 py-0.5 text-[10px] font-mono font-medium rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 flex items-center gap-1.5 shrink-0">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                LIVE QUANT
              </span>
              <span className="hidden xl:inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-mono text-zinc-400 rounded bg-white/[0.04] border border-white/[0.08]">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                Institutional
              </span>
            </div>
            <p className="text-[11px] text-zinc-400 hidden sm:block truncate font-normal">
              5-Pillar Confluence Engine • Real-time Alpha Signals • Autonomous Execution Bridge
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Data Freshness Indicator */}
          <div
            className="hidden lg:flex items-center gap-1.5 h-8 px-2.5 rounded-md bg-white/[0.03] border border-white/[0.06] text-[11px] font-mono text-zinc-400"
            title="ความสดใหม่ของข้อมูลราคาและการซิงค์ตลาด"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>{freshnessText}</span>
          </div>

          {/* Clock */}
          <div className="hidden md:flex items-center gap-1.5 h-8 px-2.5 rounded-md bg-white/[0.03] border border-white/[0.06] text-[11px] font-mono text-zinc-400">
            <Activity className="w-3 h-3 text-zinc-400" />
            <span>{time || "Loading..."}</span>
          </div>

          {/* Background Studio Visual FX Trigger */}
          {onOpenBackgroundModal && (
            <button
              onClick={onOpenBackgroundModal}
              className="btn-terminal h-8 px-2.5 text-xs font-medium flex items-center gap-1.5"
              title="ปรับแต่งฉากหลังพรีเมียม & Parallax"
            >
              <Palette className="w-3.5 h-3.5 text-zinc-400" />
              <span className="hidden sm:inline">ธีมพื้นหลัง</span>
            </button>
          )}

          {/* Refresh Button */}
          <button
            onClick={onRefreshAll}
            disabled={isLoading}
            className="btn-terminal h-8 px-2.5 text-xs font-medium flex items-center gap-1.5 disabled:opacity-50"
            title="Refresh Market & News Data"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-zinc-400 ${isLoading ? "animate-spin text-blue-400" : ""}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>

          {/* Telegram & AI Settings */}
          <button
            onClick={onOpenTelegramModal}
            className="btn-primary h-8 px-3 text-xs font-medium flex items-center gap-1.5"
          >
            <Send className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Telegram & API Keys</span>
            <span className="sm:hidden">Keys</span>
          </button>
        </div>
      </div>
    </header>
  );
}