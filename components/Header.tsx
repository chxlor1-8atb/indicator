"use client";

import React, { useState, useEffect } from "react";
import { Activity, Send, Sparkles, RefreshCw } from "lucide-react";

interface HeaderProps {
  onRefreshAll: () => void;
  isLoading: boolean;
  onOpenTelegramModal: () => void;
  lastSyncTimestamp?: number | null;
}

export default function Header({
  onRefreshAll,
  isLoading,
  onOpenTelegramModal,
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
    <header className="border-b border-slate-800/80 bg-[#0B0F17]/95 backdrop-blur-xl sticky top-0 z-40 px-3 sm:px-6 lg:px-8 py-2.5 sm:py-3 w-full min-w-0 shadow-lg shadow-black/30">
      <div className="w-full flex items-center justify-between gap-2 sm:gap-4 min-w-0">
        {/* Logo & Title */}
        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-tr from-cyan-500 via-indigo-600 to-purple-600 p-[1px] shrink-0 shadow-lg shadow-cyan-500/20">
            <div className="w-full h-full bg-[#0E131F] rounded-[11px] flex items-center justify-center">
              <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-cyan-400 animate-pulse" />
            </div>
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="font-extrabold text-sm sm:text-base text-white tracking-tight truncate flex items-center gap-1.5">
                <span className="bg-gradient-to-r from-white via-slate-100 to-slate-300 bg-clip-text text-transparent">
                  Aegis Quant Terminal
                </span>
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5 shrink-0 shadow-sm shadow-emerald-500/10">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
                LIVE QUANT
              </span>
              <span className="hidden xl:inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400"></span>
                Institutional Connected
              </span>
            </div>
            <p className="text-[11px] text-slate-400 hidden sm:block truncate">
              Institutional 5-Pillar Confluence Engine • Real-time Alpha Signals • Multi-Asset Scanner
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
          {/* Data Freshness Indicator */}
          <div
            className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/25 text-[11px] font-mono text-emerald-300 shadow-sm"
            title="ความสดใหม่ของข้อมูลราคาและการซิงค์ตลาด"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>{freshnessText}</span>
          </div>

          {/* Clock */}
          <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-surface-50/80 border border-slate-800 text-[11px] font-mono text-slate-300">
            <Activity className="w-3 h-3 text-cyan-400" />
            <span>{time || "Loading..."}</span>
          </div>

          {/* Refresh Button */}
          <button
            onClick={onRefreshAll}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl bg-surface-50/80 hover:bg-slate-800/90 border border-slate-700/80 hover:border-cyan-500/40 text-xs font-semibold text-slate-200 transition-all disabled:opacity-50 active:scale-95 cursor-pointer shadow-sm"
            title="Refresh Market & News Data"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-slate-400 ${isLoading ? "animate-spin text-cyan-400" : ""}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>

          {/* Telegram & AI Settings */}
          <button
            onClick={onOpenTelegramModal}
            className="flex items-center gap-1.5 px-2.5 sm:px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 border border-indigo-400/40 text-xs font-bold text-white shadow-md shadow-indigo-600/30 transition-all active:scale-95 cursor-pointer"
          >
            <Send className="w-3.5 h-3.5 text-cyan-200" />
            <span className="hidden sm:inline">Telegram & API Keys</span>
            <span className="sm:hidden">Keys</span>
          </button>
        </div>
      </div>
    </header>
  );
}