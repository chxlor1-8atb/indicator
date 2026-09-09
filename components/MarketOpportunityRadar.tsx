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

export default function MarketOpportunityRadar({
  summaries,
  selectedAsset,
  onSelectAsset,
  lastSyncTime = "เพิ่งอัปเดต",
  isLoading = false,
}: MarketOpportunityRadarProps) {
  const [isExpanded, setIsExpanded] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<"ALL" | "ACTIONABLE" | "FOREX" | "COMMODITIES" | "CRYPTO">("ALL");
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
    } else if (activeTab === "FOREX") {
      list = list.filter((s) => s.category === "forex");
    } else if (activeTab === "COMMODITIES") {
      list = list.filter((s) => s.category === "commodities");
    } else if (activeTab === "CRYPTO") {
      list = list.filter((s) => s.category === "crypto");
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
    <div className="w-full bg-surface-100 border border-slate-800 rounded-2xl p-3.5 sm:p-4 shadow-sm space-y-3 transition-all">
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-cyan-500/20 to-indigo-500/20 text-cyan-400 border border-cyan-500/30 flex items-center justify-center shadow-sm">
            <Compass className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                <span>Live Market Opportunity Radar</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
                  สแกนทั้งตลาดสด
                </span>
              </h3>

              {actionableCount > 0 && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10.5px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse">
                  <Flame className="w-3 h-3 text-amber-400" />
                  <span>{actionableCount} คู่เงินพร้อมเทรด 🔥</span>
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-400">
              สแกนความสอดคล้อง (Confluence), โซนราคาเข้าเทรดสถาบัน (OTE) และตรวจจับข่าวกล่องแดง Real-time (ซิงค์ {lastSyncTime})
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {/* Quick Metrics Badges */}
          <div className="hidden md:flex items-center gap-1.5 text-[10.5px] font-mono">
            <span className="px-2 py-0.5 rounded-lg bg-surface-50 border border-slate-800 text-emerald-400 font-semibold">
              🟢 Buy: {bullishCount}
            </span>
            <span className="px-2 py-0.5 rounded-lg bg-surface-50 border border-slate-800 text-rose-400 font-semibold">
              🔴 Sell: {bearishCount}
            </span>
            {frozenCount > 0 && (
              <span className="px-2 py-0.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 font-semibold">
                🛡️ ติดข่าว: {frozenCount}
              </span>
            )}
          </div>

          {/* Toggle Expand Button */}
          <button
            onClick={() => setIsExpanded((prev) => !prev)}
            className="px-2.5 py-1.5 rounded-xl bg-surface-50 hover:bg-slate-800 border border-slate-700 text-slate-300 hover:text-white transition-all text-xs flex items-center gap-1 cursor-pointer"
            title={isExpanded ? "ย่อตาราง" : "ขยายตาราง"}
          >
            <span className="text-[11px] font-medium">{isExpanded ? "ย่อหน้าต่าง" : "เปิดดูเรดาร์ทั้งตลาด"}</span>
            {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Expandable Body */}
      {isExpanded && (
        <div className="space-y-3 pt-1 border-t border-slate-800/80 animate-fadeIn">
          {/* Filter Bar & Search */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            {/* Category Tabs */}
            <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
              {[
                { id: "ALL", label: `ทั้งหมด (${summaries.length})` },
                { id: "ACTIONABLE", label: `🔥 พร้อมเทรด (${actionableCount})` },
                { id: "FOREX", label: "Forex Majors & Crosses" },
                { id: "COMMODITIES", label: "ทองคำ & สินค้าโภคภัณฑ์" },
                { id: "CRYPTO", label: "Crypto" },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`px-2.5 py-1 rounded-lg text-[10.5px] font-semibold whitespace-nowrap transition-all border cursor-pointer ${
                    activeTab === tab.id
                      ? "bg-indigo-600 text-white border-indigo-500 shadow-sm"
                      : "bg-surface-50 text-slate-400 border-slate-800 hover:text-white"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Search Input */}
            <div className="relative shrink-0">
              <Search className="w-3 h-3 text-slate-400 absolute left-2.5 top-2.5" />
              <input
                type="text"
                placeholder="ค้นหาคู่เงิน (เช่น XAU, EUR, BTC)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-7 pr-3 py-1 bg-surface-50 border border-slate-800 rounded-lg text-[11px] text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 w-full sm:w-56"
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
            <div className="overflow-x-auto rounded-xl border border-slate-800 max-h-[380px] overflow-y-auto scrollbar-thin">
              <table className="w-full text-left text-[11px] font-mono whitespace-nowrap">
                <thead className="sticky top-0 bg-surface-200/95 backdrop-blur-sm text-slate-400 border-b border-slate-800 z-10">
                  <tr>
                    <th className="px-3 py-2 font-semibold">คู่เงิน (Asset)</th>
                    <th className="px-3 py-2 font-semibold">ราคาล่าสุด & 24h</th>
                    <th className="px-3 py-2 font-semibold">Confluence Score</th>
                    <th className="px-3 py-2 font-semibold">สัญญาณ AI</th>
                    <th className="px-3 py-2 font-semibold">แผนการออกออเดอร์</th>
                    <th className="px-3 py-2 font-semibold">สภาวะตลาด & ข่าว</th>
                    <th className="px-3 py-2 text-right font-semibold">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 bg-surface-50/50">
                  {filteredSummaries.map((item) => {
                    const isSelected = selectedAsset === item.symbol;
                    const isActionable = item.orderType !== "WAIT_NO_ORDER" && !item.isNewsFrozen;

                    return (
                      <tr
                        key={item.symbol}
                        onClick={() => onSelectAsset(item.symbol)}
                        className={`transition-colors cursor-pointer group ${
                          isSelected
                            ? "bg-indigo-950/40 border-l-2 border-indigo-500"
                            : "hover:bg-slate-800/50"
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
                            <span className="text-[9px] text-slate-400">
                              {item.confluenceScore >= 75 ? "Sniper" : item.confluenceScore >= 60 ? "Moderate" : "Low"}
                            </span>
                          </div>
                          <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${
                                item.confluenceScore >= 75
                                  ? "bg-gradient-to-r from-emerald-500 to-cyan-400"
                                  : item.confluenceScore >= 60
                                  ? "bg-indigo-500"
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
                            className={`px-2.5 py-1 rounded-lg text-[10.5px] font-bold transition-all inline-flex items-center gap-1 cursor-pointer ${
                              isSelected
                                ? "bg-indigo-600 text-white shadow-sm"
                                : isActionable
                                ? "bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm active:scale-95"
                                : "bg-surface-100 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700"
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
          )}
        </div>
      )}
    </div>
  );
}
