"use client";

import React, { useState, useMemo } from "react";
import { AssetScannerSummary } from "@/lib/types";
import {
  Compass,
  TrendingUp,
  TrendingDown,
  Flame,
  ShieldAlert,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  Search,
  Zap,
  ArrowRight,
  Filter,
  CheckCircle2,
  Clock,
  Layers,
} from "lucide-react";

interface MarketOpportunityRadarProps {
  summaries: AssetScannerSummary[];
  selectedAsset: string;
  onSelectAsset: (symbol: string) => void;
  lastSyncTime?: string;
  isLoading?: boolean;
}

function MarketOpportunityRadar({
  summaries,
  selectedAsset,
  onSelectAsset,
  lastSyncTime = "เพิ่งอัปเดต",
  isLoading = false,
}: MarketOpportunityRadarProps) {
  const [isExpanded, setIsExpanded] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<"ALL" | "ACTIONABLE" | "CRYPTO" | "FOREX" | "COMMODITIES">("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Filter and sort summaries
  const filteredSummaries = useMemo(() => {
    let list = [...summaries];

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (s) => s.symbol.toLowerCase().includes(q) || s.name.toLowerCase().includes(q)
      );
    }

    // Category / Actionable filter
    if (activeTab === "ACTIONABLE") {
      list = list.filter(
        (s) => (s.signal === "STRONG_BUY" || s.signal === "BUY" || s.signal === "STRONG_SELL" || s.signal === "SELL") &&
               s.orderType !== "WAIT_NO_ORDER" &&
               !s.isNewsFrozen
      );
    } else if (activeTab === "CRYPTO") {
      list = list.filter((s) => s.category === "crypto");
    } else if (activeTab === "FOREX") {
      list = list.filter((s) => s.category === "forex");
    } else if (activeTab === "COMMODITIES") {
      list = list.filter((s) => s.category === "commodities");
    }

    // Sort: Actionable first, then by Confluence Score descending
    return list.sort((a, b) => {
      const aActionable = a.orderType !== "WAIT_NO_ORDER" && !a.isNewsFrozen ? 1 : 0;
      const bActionable = b.orderType !== "WAIT_NO_ORDER" && !b.isNewsFrozen ? 1 : 0;
      if (bActionable !== aActionable) return bActionable - aActionable;
      return b.confluenceScore - a.confluenceScore;
    });
  }, [summaries, activeTab, searchQuery]);

  // Count actionable setups
  const actionableCount = useMemo(() => {
    return summaries.filter(
      (s) =>
        (s.signal.includes("BUY") || s.signal.includes("SELL")) &&
        s.orderType !== "WAIT_NO_ORDER" &&
        !s.isNewsFrozen
    ).length;
  }, [summaries]);

  const bullishCount = useMemo(() => summaries.filter((s) => s.signal.includes("BUY")).length, [summaries]);
  const bearishCount = useMemo(() => summaries.filter((s) => s.signal.includes("SELL")).length, [summaries]);
  const frozenCount = useMemo(() => summaries.filter((s) => s.isNewsFrozen).length, [summaries]);

  const formatPrice = (price: number, sym: string) => {
    const s = sym.toUpperCase();
    const precision = s.includes("JPY")
      ? 2
      : ["EUR", "GBP", "AUD", "NZD", "USD", "CAD", "CHF"].some((c) => s.startsWith(c) || s.endsWith(c))
      ? 4
      : s === "XAGUSD"
      ? 3
      : s.endsWith("USDT")
      ? price < 10
        ? 4
        : 2
      : 2;
    return price.toLocaleString(undefined, { minimumFractionDigits: precision, maximumFractionDigits: precision });
  };

  const getSignalBadge = (signal: string) => {
    switch (signal) {
      case "STRONG_BUY":
      case "BUY":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
            <TrendingUp className="w-3 h-3 text-emerald-400" />
            <span>{signal === "STRONG_BUY" ? "STRONG BUY" : "BUY"}</span>
          </span>
        );
      case "STRONG_SELL":
      case "SELL":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-500/15 text-rose-400 border border-rose-500/30">
            <TrendingDown className="w-3 h-3 text-rose-400" />
            <span>{signal === "STRONG_SELL" ? "STRONG SELL" : "SELL"}</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-800 text-slate-400 border border-slate-700">
            <Clock className="w-3 h-3 text-slate-500" />
            <span>WAIT</span>
          </span>
        );
    }
  };

  const getGradeBadge = (grade: string) => {
    const isA = grade.startsWith("A");
    const isB = grade.startsWith("B");
    return (
      <span
        className={`px-1.5 py-0.2 rounded font-mono font-bold text-[9.5px] border ${
          isA
            ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
            : isB
            ? "bg-indigo-500/20 text-indigo-300 border-indigo-500/40"
            : "bg-slate-800 text-slate-400 border-slate-700"
        }`}
      >
        {grade}
      </span>
    );
  };

  return (
    <div className="terminal-card p-3 sm:p-3.5 space-y-2.5 transition-all w-full min-w-0 max-w-full overflow-hidden">
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-7 h-7 rounded-md bg-white/[0.06] border border-white/[0.1] text-blue-400 flex items-center justify-center shrink-0">
            <Compass className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm font-semibold text-white flex items-center gap-1.5 tracking-tight">
                <span>Market Opportunity Radar</span>
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
                  SCANNER
                </span>
              </h3>

              {actionableCount > 0 && (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold font-mono bg-amber-500/10 text-amber-400 border border-amber-500/30">
                  <Flame className="w-3 h-3 text-amber-400" />
                  <span>{actionableCount} Actionable</span>
                </span>
              )}
            </div>
            <p className="text-[11px] text-zinc-400 truncate max-w-xl">
              สแกน Confluence, OTE โซนเข้าเทรดสถาบัน และตรวจจับข่าวกล่องแดง (ซิงค์ {lastSyncTime})
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {/* Quick Metrics Badges */}
          <div className="hidden md:flex items-center gap-1 text-[10.5px] font-mono">
            <span className="px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-medium">
              Buy: {bullishCount}
            </span>
            <span className="px-2 py-0.5 rounded bg-rose-500/10 border border-rose-500/20 text-rose-400 font-medium">
              Sell: {bearishCount}
            </span>
            {frozenCount > 0 && (
              <span className="px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/20 text-amber-400 font-medium">
                Shielded: {frozenCount}
              </span>
            )}
          </div>

          {/* Toggle Expand Button */}
          <button
            onClick={() => setIsExpanded((prev) => !prev)}
            className="btn-terminal h-7 px-2 text-xs flex items-center gap-1 cursor-pointer"
            title={isExpanded ? "ย่อตาราง" : "ขยายตาราง"}
          >
            <span className="text-[11px] font-medium">{isExpanded ? "ย่อหน้าต่าง" : "เปิดดูเรดาร์"}</span>
            {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Expandable Body */}
      {isExpanded && (
        <div className="space-y-2.5 pt-1.5 border-t border-white/[0.08] animate-fadeIn min-w-0 max-w-full">
          {/* Filter Bar & Search */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 min-w-0 w-full">
            {/* Category Tabs (Segmented Control) */}
            <div className="flex items-center gap-0.5 p-0.5 rounded-md bg-[#0A0C10] border border-white/[0.08] overflow-x-auto scrollbar-none min-w-0">
              {[
                { id: "ALL", label: `ทั้งหมด (${summaries.length})` },
                { id: "ACTIONABLE", label: `พร้อมเทรด (${actionableCount})` },
                { id: "CRYPTO", label: "Crypto" },
                { id: "FOREX", label: "Forex" },
                { id: "COMMODITIES", label: "Commodities" },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`px-2.5 py-1 rounded-[5px] text-[11px] font-medium whitespace-nowrap transition-colors border cursor-pointer ${
                    activeTab === tab.id
                      ? "bg-white/[0.12] text-white border-white/[0.2]"
                      : "bg-transparent text-zinc-400 border-transparent hover:text-white hover:bg-white/[0.04]"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Search Input */}
            <div className="relative shrink-0">
              <Search className="w-3 h-3 text-zinc-400 absolute left-2.5 top-2.5" />
              <input
                id="radar-symbol-search"
                name="radarSearch"
                type="text"
                placeholder="ค้นหาคู่เงิน (XAU, EUR, BTC)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-7 pr-3 py-1 bg-white/[0.04] border border-white/[0.1] rounded-md text-[11px] text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500 w-full sm:w-52 transition-colors"
              />
            </div>
          </div>

          {/* Radar Table */}
          {filteredSummaries.length === 0 ? (
            <div className="p-8 rounded-xl bg-surface-50 border border-slate-800/80 text-center space-y-1.5 text-xs text-slate-400">
              <Compass className="w-6 h-6 text-slate-500 mx-auto" />
              <p className="font-semibold text-slate-300">ไม่พบคู่เงินตามตัวกรองนี้</p>
              <p className="text-[11px] text-slate-500">ลองเปลี่ยนตัวกรองเป็น &quot;ทั้งหมด&quot; หรือล้างคำค้นหา</p>
            </div>
          ) : (
            <>
              {/* Desktop View: Full Data Table (hidden on mobile) */}
              <div className="hidden md:block overflow-x-auto rounded-md border border-white/[0.08] max-h-[380px] overflow-y-auto scrollbar-thin">
              <table className="w-full text-left text-[11px] font-mono whitespace-nowrap">
                <thead className="sticky top-0 bg-[#14171F] text-zinc-400 border-b border-white/[0.08] z-10">
                  <tr>
                    <th className="px-3 py-2 font-medium">คู่เงิน (Asset)</th>
                    <th className="px-3 py-2 font-medium">ราคาล่าสุด & 24h</th>
                    <th className="px-3 py-2 font-medium">Confluence</th>
                    <th className="px-3 py-2 font-medium">สัญญาณ AI</th>
                    <th className="px-3 py-2 font-medium">แผนออกออเดอร์</th>
                    <th className="px-3 py-2 font-medium">สภาวะตลาด & ข่าว</th>
                    <th className="px-3 py-2 text-right font-medium">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.06] bg-[#0E1015]">
                  {filteredSummaries.map((item) => {
                    const isSelected = selectedAsset === item.symbol;
                    const isActionable = item.orderType !== "WAIT_NO_ORDER" && !item.isNewsFrozen;

                    return (
                      <tr
                        key={item.symbol}
                        onClick={() => onSelectAsset(item.symbol)}
                        className={`transition-colors cursor-pointer group ${
                          isSelected
                            ? "bg-blue-600/15 border-l-2 border-blue-500"
                            : "hover:bg-white/[0.04]"
                        }`}
                      >
                        {/* 1. Asset & Name */}
                        <td className="px-3 py-2">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-white font-mono group-hover:text-cyan-300 transition-colors">
                              {item.symbol}
                            </span>
                            {getGradeBadge(item.setupGrade)}
                            {item.symbol.includes("XAU") && (
                              <span className="px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20 text-[9px] font-bold">
                                GOLD
                              </span>
                            )}
                          </div>
                          <span className="text-[9.5px] text-slate-400 font-sans block truncate max-w-[130px]">
                            {item.name}
                          </span>
                        </td>

                        {/* 2. Price & 24h Change */}
                        <td className="px-3 py-2">
                          <span className="font-bold text-slate-100 block">
                            ${formatPrice(item.price, item.symbol)}
                          </span>
                          <span
                            className={`flex items-center text-[10px] font-bold ${
                              item.change24h >= 0 ? "text-emerald-400" : "text-rose-400"
                            }`}
                          >
                            {item.change24h >= 0 ? "+" : ""}
                            {item.change24h.toFixed(2)}%
                          </span>
                        </td>

                        {/* 3. Confluence Score & Progress Bar */}
                        <td className="px-3 py-2 min-w-[130px]">
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <span className="font-bold text-slate-200 text-[10.5px]">
                              {item.confluenceScore}%
                            </span>
                            <span className="text-[9px] text-slate-400 font-sans">
                              {item.confluenceScore >= 75 ? "Sniper" : item.confluenceScore >= 60 ? "Moderate" : "Low"}
                            </span>
                          </div>
                          <div className="w-full h-1.5 bg-slate-800/80 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${
                                item.confluenceScore >= 75
                                  ? "bg-gradient-to-r from-emerald-500 to-cyan-400 shadow-[0_0_8px_rgba(16,185,129,0.4)]"
                                  : item.confluenceScore >= 60
                                  ? "bg-gradient-to-r from-indigo-500 to-cyan-500"
                                  : "bg-slate-600"
                              }`}
                              style={{ width: `${item.confluenceScore}%` }}
                            />
                          </div>
                        </td>

                        {/* 4. AI Signal */}
                        <td className="px-3 py-2">
                          {getSignalBadge(item.signal)}
                        </td>

                        {/* 5. Order Setup */}
                        <td className="px-3 py-2">
                          {item.orderType !== "WAIT_NO_ORDER" && item.pendingPrice ? (
                            <div className="space-y-0.5">
                              <span className="font-bold text-amber-300 block text-[10px]">
                                {item.orderType} @ {formatPrice(item.pendingPrice, item.symbol)}
                              </span>
                              <span className="text-[9.5px] text-slate-400 block font-sans">
                                ห่างราคาปัจจุบัน {item.distancePips} pips
                              </span>
                            </div>
                          ) : (
                            <span className="text-slate-500 text-[10px]">รอจังหวะสะสมแรง</span>
                          )}
                        </td>

                        {/* 6. Market Condition & News Status */}
                        <td className="px-3 py-2">
                          <div className="flex items-center gap-1.5">
                            {item.isNewsFrozen ? (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9.5px] font-bold bg-rose-500/15 text-rose-300 border border-rose-500/30">
                                <ShieldAlert className="w-3 h-3 text-rose-400" />
                                <span>ติดข่าวกล่องแดง</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9.5px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                <ShieldCheck className="w-3 h-3 text-emerald-400" />
                                <span>เทรดได้ปลอดภัย</span>
                              </span>
                            )}
                          </div>
                          <span className="text-[9.5px] text-slate-400 block mt-0.5 truncate max-w-[120px]">
                            {item.regime.replace(/_/g, " ")}
                          </span>
                        </td>

                        {/* 7. Action Button */}
                        <td className="px-3 py-2 text-right">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onSelectAsset(item.symbol);
                            }}
                            className={`px-2.5 py-1 rounded-md text-[10.5px] font-semibold transition-colors inline-flex items-center gap-1 cursor-pointer ${
                              isSelected
                                ? "bg-primary text-white"
                                : isActionable
                                ? "bg-emerald-600 hover:bg-emerald-500 text-white"
                                : "btn-terminal"
                            }`}
                          >
                            <span>{isSelected ? "กำลังดู" : "วิเคราะห์"}</span>
                            <ArrowRight className="w-3 h-3" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

              {/* Mobile View: Touch-Friendly Responsive Cards (hidden on desktop) */}
              <div className="md:hidden space-y-2 max-h-[420px] overflow-y-auto pr-0.5 min-w-0 w-full">
                {filteredSummaries.map((item) => {
                  const isSelected = selectedAsset === item.symbol;
                  const isActionable = item.orderType !== "WAIT_NO_ORDER" && !item.isNewsFrozen;

                  return (
                    <div
                      key={`mob-${item.symbol}`}
                      onClick={() => onSelectAsset(item.symbol)}
                      className={`p-3 rounded-md border transition-colors cursor-pointer ${
                        isSelected
                          ? "bg-primary/10 border-primary/40 shadow-xs"
                          : "bg-surface-50 border-slate-800 hover:border-slate-700"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-white font-mono text-xs">{item.symbol}</span>
                          {getGradeBadge(item.setupGrade)}
                          {item.symbol.includes("XAU") && (
                            <span className="px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20 text-[9px] font-bold">
                              GOLD
                            </span>
                          )}
                        </div>
                        <div className="text-right">
                          <span className="font-bold text-slate-100 font-mono text-xs">
                            ${formatPrice(item.price, item.symbol)}
                          </span>
                          <span
                            className={`text-[10px] font-bold ml-1.5 font-mono ${
                              item.change24h >= 0 ? "text-emerald-400" : "text-rose-400"
                            }`}
                          >
                            {item.change24h >= 0 ? "+" : ""}
                            {item.change24h.toFixed(2)}%
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between gap-2 mt-2 pt-2 border-t border-slate-800/80">
                        <div className="flex items-center gap-2">
                          {getSignalBadge(item.signal)}
                          <span className="text-[10px] text-slate-400 font-mono">
                            Score: <strong className="text-slate-200">{item.confluenceScore}%</strong>
                          </span>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectAsset(item.symbol);
                          }}
                          className={`px-2.5 py-1 rounded-md text-[10px] font-semibold transition-colors inline-flex items-center gap-1 ${
                            isSelected
                              ? "bg-primary text-white"
                              : isActionable
                              ? "bg-emerald-600 text-white"
                              : "btn-terminal"
                          }`}
                        >
                          <span>{isSelected ? "กำลังดู" : "วิเคราะห์"}</span>
                          <ArrowRight className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default React.memo(MarketOpportunityRadar);
