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
}

const CATEGORIES: { id: "all" | AssetCategory; label: string }[] = [
  { id: "all", label: "All Assets" },
  { id: "commodities", label: "Gold & Commodities" },
  { id: "forex", label: "Forex (All Pairs)" },
  { id: "crypto", label: "Crypto" },
  { id: "stocks", label: "Indices & Stocks" },
];

const TIMEFRAMES = ["15m", "1h", "4h", "1D"];

export default function AssetSelector({
  selectedAsset,
  onSelectAsset,
  selectedTimeframe,
  onSelectTimeframe,
  onRunAnalysis,
  isAnalyzing,
  currentPrice,
  priceChangePercent = 0,
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
    <div className="bg-surface-100 border border-slate-800 rounded-2xl p-4 shadow-sm relative z-30">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Left: Category tabs & Searchable Asset Selector */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          {/* Categories */}
          <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                onClick={() => {
                  setActiveTab(cat.id);
                  setSearchQuery("");
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                  activeTab === cat.id
                    ? "bg-slate-800 text-white shadow-inner"
                    : "text-slate-400 hover:text-slate-200 hover:bg-surface-50"
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          <div className="hidden sm:block h-5 w-px bg-slate-800"></div>

          {/* Searchable Dropdown Picker */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="flex items-center justify-between gap-2 px-3 py-1.5 bg-surface-50 hover:bg-slate-800/80 border border-slate-700/80 rounded-lg text-xs font-semibold text-white transition-colors min-w-[210px]"
            >
              <div className="flex items-center gap-2">
                <span className="font-mono text-brand-blue font-bold">{selectedAsset}</span>
                <span className="text-slate-400 truncate max-w-[120px] font-normal">
                  {currentAssetInfo.name.split("(")[0]}
                </span>
              </div>
              <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${isOpen ? "rotate-180" : ""}`} />
            </button>

            {/* Dropdown Menu */}
            {isOpen && (
              <div className="absolute top-full left-0 mt-1.5 w-80 bg-surface-100 border border-slate-700 rounded-xl shadow-2xl p-2 z-50 animate-fadeIn">
                {/* Search Input */}
                <form onSubmit={handleCustomTickerSubmit} className="relative mb-2">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                  <input
                    type="text"
                    placeholder="Search or type any pair (e.g. GBPJPY)..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    autoFocus
                    className="w-full pl-8 pr-3 py-1.5 bg-surface-50 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-brand-blue"
                  />
                </form>

                {/* Asset List */}
                <div className="max-h-60 overflow-y-auto space-y-0.5 pr-1">
                  {filteredAssets.length === 0 ? (
                    <div className="p-3 text-center">
                      <p className="text-xs text-slate-400">No preset match for &quot;{searchQuery}&quot;</p>
                      {searchQuery && (
                        <button
                          type="button"
                          onClick={() => {
                            const clean = searchQuery.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
                            onSelectAsset(clean);
                            setIsOpen(false);
                            setSearchQuery("");
                          }}
                          className="mt-2 flex items-center justify-center gap-1.5 w-full py-1.5 rounded bg-brand-blue/20 text-brand-blue hover:bg-brand-blue/30 text-xs font-semibold"
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
                        className={`w-full flex items-center justify-between p-2 rounded-lg text-left text-xs transition-colors ${
                          selectedAsset === asset.symbol
                            ? "bg-blue-500/10 text-brand-blue font-bold border border-blue-500/20"
                            : "text-slate-300 hover:bg-surface-50 hover:text-white"
                        }`}
                      >
                        <div>
                          <span className="font-mono font-bold block">{asset.symbol}</span>
                          <span className="text-[10px] text-slate-500 font-normal">{asset.name}</span>
                        </div>
                        {selectedAsset === asset.symbol && <Check className="w-4 h-4 text-brand-blue" />}
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Quick Price Badge */}
          {currentPrice !== undefined && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-surface-50 rounded-lg border border-slate-800 text-xs">
              <span className="font-mono font-bold text-white">
                ${currentPrice.toLocaleString(undefined, { minimumFractionDigits: currentAssetInfo?.precision || 2 })}
              </span>
              <span
                className={`flex items-center font-mono text-[11px] font-semibold ${
                  priceChangePercent >= 0 ? "text-brand-green" : "text-brand-red"
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
        <div className="flex items-center justify-between sm:justify-end gap-2.5">
          {/* Timeframe Chips */}
          <div className="flex items-center bg-surface-50 p-0.5 rounded-lg border border-slate-800">
            {TIMEFRAMES.map((tf) => (
              <button
                key={tf}
                onClick={() => onSelectTimeframe(tf)}
                className={`px-2.5 py-1 rounded-md text-xs font-semibold font-mono transition-all ${
                  selectedTimeframe === tf
                    ? "bg-brand-blue text-white shadow-sm"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                {tf}
              </button>
            ))}
          </div>

          {/* AI Run Button */}
          <button
            onClick={onRunAnalysis}
            disabled={isAnalyzing}
            className="flex items-center gap-2 px-4 py-1.5 rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-xs font-bold text-white shadow-lg shadow-emerald-500/20 transition-all active:scale-95 disabled:opacity-50"
          >
            <Sparkles className={`w-3.5 h-3.5 ${isAnalyzing ? "animate-spin" : ""}`} />
            <span>{isAnalyzing ? "Analyzing Market & News..." : "AI Synthesize"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}