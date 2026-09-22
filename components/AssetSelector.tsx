"use client";

import React, { useState, useRef, useEffect } from "react";
import { AVAILABLE_ASSETS } from "@/lib/marketService";
import { AssetCategory } from "@/lib/types";
import { Sparkles, TrendingUp, TrendingDown, Search, ChevronDown, Plus, Check } from "lucide-react";

interface AssetSelectorProps {
  selectedAsset: string;
  onSelectAsset: (symbol: string) => void;
  selectedTimeframe: string;
  onSelectTimeframe: (tf: string) => void;
  onRunAnalysis: () => void;
  isAnalyzing: boolean;
  currentPrice?: number;
  priceChangePercent?: number;
  isLoadingPrice?: boolean;
  lastPriceUpdate?: number | null;
}

const CATEGORIES: { id: "all" | AssetCategory; label: string; shortLabel: string }[] = [
  { id: "all", label: "All Assets", shortLabel: "All" },
  { id: "crypto", label: "Crypto Hot (12 Pairs)", shortLabel: "Crypto" },
  { id: "forex", label: "Forex (39 Pairs)", shortLabel: "Forex" },
  { id: "commodities", label: "Gold & Commodities (MT5)", shortLabel: "Commodities" },
];

export interface TimeframeItem {
  id: string;
  label: string;
  tooltip: string;
  isCore?: boolean;
}

const TIMEFRAMES: TimeframeItem[] = [
  { id: "1m", label: "M1", tooltip: "1 นาที • Sniper Scalping" },
  { id: "5m", label: "M5", tooltip: "5 นาที • Fast Scalping" },
  { id: "15m", label: "M15", tooltip: "15 นาที • Day Trading" },
  { id: "30m", label: "M30", tooltip: "30 นาที • Intraday Swing" },
  { id: "1h", label: "H1", tooltip: "1 ชั่วโมง • Institutional Anchor (Win Rate สูงสุด)", isCore: true },
  { id: "4h", label: "H4", tooltip: "4 ชั่วโมง • Structural Trend" },
  { id: "1D", label: "D1", tooltip: "1 วัน • Macro Bias" },
  { id: "1W", label: "W1", tooltip: "1 สัปดาห์ • Major Cycle" },
];

export default function AssetSelector({
  selectedAsset,
  onSelectAsset,
  selectedTimeframe,
  onSelectTimeframe,
  onRunAnalysis,
  isAnalyzing,
  currentPrice,
  priceChangePercent = 0,
  isLoadingPrice,
  lastPriceUpdate,
}: AssetSelectorProps) {
  const [activeTab, setActiveTab] = useState<"all" | AssetCategory>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredAssets = AVAILABLE_ASSETS.filter((a) => {
    const matchCategory = activeTab === "all" || a.category === activeTab;
    const matchSearch =
      a.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchCategory && matchSearch;
  });

  const currentAssetInfo = AVAILABLE_ASSETS.find((a) => a.symbol === selectedAsset) || {
    symbol: selectedAsset,
    name: selectedAsset,
    precision: 2,
  };

  const handleCustomTickerSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      const cleanTicker = searchQuery.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
      onSelectAsset(cleanTicker);
      setIsOpen(false);
      setSearchQuery("");
    }
  };

  return (
    <div className="terminal-card p-2.5 sm:p-3 relative z-30 w-full min-w-0 max-w-full">
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-2.5 sm:gap-3 min-w-0 w-full">
        {/* Left: Category tabs & Searchable Asset Selector */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
          {/* Categories Segmented Control */}
          <div className="flex items-center gap-0.5 p-0.5 rounded-md bg-[#0A0C10] border border-white/[0.08] overflow-x-auto scrollbar-none flex-nowrap max-w-full">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                onClick={() => {
                  setActiveTab(cat.id);
                  setSearchQuery("");
                  setIsOpen(true);
                }}
                className={`px-2 sm:px-2.5 py-1 rounded-[5px] text-[11px] sm:text-xs font-medium whitespace-nowrap transition-colors cursor-pointer shrink-0 ${
                  activeTab === cat.id
                    ? "bg-white/[0.12] text-white font-semibold border border-white/[0.15]"
                    : "text-zinc-400 hover:text-white hover:bg-white/[0.04] border border-transparent"
                }`}
              >
                <span className="hidden sm:inline">{cat.label}</span>
                <span className="sm:hidden">{cat.shortLabel}</span>
              </button>
            ))}
          </div>

          <div className="hidden sm:block h-4 w-px bg-white/[0.08]" />

          {/* Searchable Dropdown Picker */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="btn-terminal h-8 px-2 sm:px-2.5 flex items-center justify-between gap-1.5 sm:gap-2 text-xs font-medium min-w-[140px] sm:min-w-[180px]"
            >
              <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
                <span className="font-mono text-white font-bold">{selectedAsset}</span>
                <span className="text-zinc-400 truncate max-w-[80px] sm:max-w-[110px] font-normal">
                  {currentAssetInfo.name.split("(")[0]}
                </span>
              </div>
              <ChevronDown className={`w-3.5 h-3.5 text-zinc-400 transition-transform shrink-0 ${isOpen ? "rotate-180" : ""}`} />
            </button>

            {/* Dropdown Menu */}
            {isOpen && (
              <div className="absolute top-full left-0 mt-1 w-[calc(100vw-32px)] max-w-[340px] sm:w-80 terminal-card-elevated shadow-2xl p-2 z-50 animate-fadeIn">
                {/* Search Input */}
                <form onSubmit={handleCustomTickerSubmit} className="relative mb-2">
                  <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-2.5 top-2.5" />
                  <input
                    id="asset-selector-search"
                    name="assetSearch"
                    type="text"
                    placeholder="Search or type any pair (e.g. GBPJPY)..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    autoFocus
                    className="w-full pl-8 pr-3 py-1.5 bg-white/[0.04] border border-white/[0.1] rounded-md text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500"
                  />
                </form>

                {/* Asset List */}
                <div className="max-h-80 overflow-y-auto space-y-0.5 pr-1">
                  {filteredAssets.length === 0 ? (
                    <div className="p-3 text-center">
                      <p className="text-xs text-zinc-400">No preset match for &quot;{searchQuery}&quot;</p>
                      {searchQuery && (
                        <button
                          type="button"
                          onClick={() => {
                            const clean = searchQuery.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
                            onSelectAsset(clean);
                            setIsOpen(false);
                            setSearchQuery("");
                          }}
                          className="mt-2 flex items-center justify-center gap-1.5 w-full py-1.5 rounded-md bg-blue-600 text-white hover:bg-blue-500 text-xs font-semibold"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Load & Analyze &quot;{searchQuery.toUpperCase()}&quot;</span>
                        </button>
                      )}
                    </div>
                  ) : (
                    filteredAssets.map((asset) => (
                      <button
                        key={asset.symbol}
                        onClick={() => {
                          onSelectAsset(asset.symbol);
                          setIsOpen(false);
                          setSearchQuery("");
                        }}
                        className={`w-full flex items-center justify-between p-2 rounded-md text-left text-xs transition-colors ${
                          selectedAsset === asset.symbol
                            ? "bg-white/[0.1] text-white font-bold border border-white/[0.15]"
                            : "text-zinc-300 hover:bg-white/[0.04] hover:text-white"
                        }`}
                      >
                        <div>
                          <span className="font-mono font-bold block">{asset.symbol}</span>
                          <span className="text-[10px] text-zinc-500 font-normal">{asset.name}</span>
                        </div>
                        {selectedAsset === asset.symbol && <Check className="w-4 h-4 text-white" />}
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Quick Price Badge with Loading Skeleton */}
          {isLoadingPrice || !currentPrice || currentPrice <= 0 ? (
            <div className="flex items-center gap-2 h-8 px-2.5 bg-white/[0.03] rounded-md border border-white/[0.06] text-xs animate-pulse">
              <div className="h-4 w-16 bg-white/[0.08] rounded" />
              <div className="h-3 w-10 bg-white/[0.05] rounded" />
            </div>
          ) : (
            <div className="flex items-center gap-2 h-8 px-2.5 bg-white/[0.03] rounded-md border border-white/[0.06] text-xs font-mono">
              <span className="font-bold text-white">
                ${currentPrice.toLocaleString(undefined, { minimumFractionDigits: currentAssetInfo?.precision || 2 })}
              </span>
              <span
                className={`flex items-center text-[11px] font-semibold ${
                  priceChangePercent >= 0 ? "text-emerald-400" : "text-rose-400"
                }`}
              >
                {priceChangePercent >= 0 ? (
                  <TrendingUp className="w-3 h-3 mr-0.5" />
                ) : (
                  <TrendingDown className="w-3 h-3 mr-0.5" />
                )}
                {priceChangePercent > 0 ? "+" : ""}
                {priceChangePercent.toFixed(2)}%
              </span>
            </div>
          )}
        </div>

        {/* Right: Timeframes & AI Trigger Button */}
        <div className="flex flex-wrap items-center justify-between sm:justify-end gap-2 w-full sm:w-auto">
          {/* Timeframe Chips with MT4/MT5 Standards */}
          <div className="flex items-center gap-0.5 bg-[#0A0C10] p-0.5 rounded-md border border-white/[0.08] overflow-x-auto max-w-full scrollbar-none flex-nowrap">
            {TIMEFRAMES.map((tf) => {
              const isSelected = selectedTimeframe === tf.id;
              return (
                <button
                  key={tf.id}
                  onClick={() => onSelectTimeframe(tf.id)}
                  title={`${tf.label} (${tf.id}) - ${tf.tooltip}`}
                  className={`h-7 px-2 sm:px-2.5 rounded-[5px] text-[11px] sm:text-xs font-mono font-medium transition-colors relative shrink-0 flex items-center gap-1 cursor-pointer ${
                    isSelected
                      ? "bg-blue-600 text-white font-bold border border-blue-500"
                      : "text-zinc-400 hover:text-white hover:bg-white/[0.04] border border-transparent"
                  }`}
                >
                  <span>{tf.label}</span>
                  {tf.isCore && !isSelected && (
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" title="Institutional Anchor" />
                  )}
                </button>
              );
            })}
          </div>

          {/* AI Run Button */}
          <button
            onClick={onRunAnalysis}
            disabled={isAnalyzing}
            className="btn-primary h-7 px-2.5 sm:px-3 flex items-center gap-1.5 text-xs font-medium disabled:opacity-50 shrink-0"
          >
            <Sparkles className={`w-3.5 h-3.5 ${isAnalyzing ? "animate-spin" : ""}`} />
            <span className="hidden xs:inline">{isAnalyzing ? "Analyzing..." : "AI Synthesize"}</span>
            <span className="xs:hidden">{isAnalyzing ? "..." : "AI Run"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}