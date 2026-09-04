"use client";

import React, { useState, useEffect } from "react";
import { Activity, Send, Sparkles, RefreshCw } from "lucide-react";

interface HeaderProps {
  onRefreshAll: () => void;
  isLoading: boolean;
  onOpenTelegramModal: () => void;
}

export default function Header({
  onRefreshAll,
  isLoading,
  onOpenTelegramModal,
}: HeaderProps) {
  const [time, setTime] = useState<string>("");

  useEffect(() => {
    const update = () => {
      const now = new Date();
      setTime(now.toTimeString().split(" ")[0] + " UTC" + (now.getTimezoneOffset() > 0 ? "-" : "+") + Math.abs(now.getTimezoneOffset() / 60));
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="border-b border-slate-800/80 bg-surface-100/90 backdrop-blur sticky top-0 z-40 px-4 lg:px-6 py-3">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        {/* Logo & Title */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-zinc-700 to-zinc-800 border border-zinc-600/40 flex items-center justify-center shadow-md shadow-black/40">
            <Sparkles className="w-5 h-5 text-zinc-200 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-bold text-lg text-white tracking-tight">AI Market Intelligence</h1>
              <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
                LIVE
              </span>
            </div>
            <p className="text-xs text-slate-400 hidden sm:block">
              Technical Chart Analysis & Real-time Financial News Confluence Engine
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Clock */}
          <div className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-50 border border-slate-800 text-xs font-mono text-slate-300">
            <Activity className="w-3.5 h-3.5 text-slate-400" />
            <span>{time || "Loading..."}</span>
          </div>

          {/* Refresh Button */}
          <button
            onClick={onRefreshAll}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-50 hover:bg-slate-800 border border-slate-800 text-xs font-medium text-slate-200 transition-all disabled:opacity-50"
            title="Refresh Market & News Data"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-slate-400 ${isLoading ? "animate-spin text-slate-200" : ""}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>

          {/* Telegram & AI Settings */}
          <button
            onClick={onOpenTelegramModal}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 hover:border-zinc-600 text-xs font-medium text-zinc-100 shadow-sm transition-all active:scale-95"
          >
            <Send className="w-3.5 h-3.5 text-zinc-400" />
            <span>Telegram & API Keys</span>
          </button>
        </div>
      </div>
    </header>
  );
}