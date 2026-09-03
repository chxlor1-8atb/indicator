"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import dynamic from "next/dynamic";
import Header from "@/components/Header";
import AssetSelector from "@/components/AssetSelector";
import NewsFeed from "@/components/NewsFeed";
import AnalysisCard from "@/components/AnalysisCard";
import TelegramSettingsModal from "@/components/TelegramSettingsModal";
import { Candle, IndicatorData, NewsItem, AnalysisResult } from "@/lib/types";
import { calculateAllIndicators } from "@/lib/indicators";

// Dynamically import MarketChart with SSR disabled for clean canvas lifecycle
const MarketChart = dynamic(() => import("@/components/MarketChart"), {
  ssr: false,
  loading: () => (
    <div className="bg-surface-100 border border-slate-800 rounded-2xl p-6 min-h-[440px] flex items-center justify-center text-center">
      <div className="space-y-2">
        <div className="w-8 h-8 border-2 border-brand-blue border-t-transparent rounded-full animate-spin mx-auto"></div>
        <p className="text-xs text-slate-400">Loading interactive candlestick chart...</p>
      </div>
    </div>
  ),
});

export default function DashboardPage() {
  const [selectedAsset, setSelectedAsset] = useState<string>("XAUUSD");
  const [selectedTimeframe, setSelectedTimeframe] = useState<string>("1h");

  const [candles, setCandles] = useState<Candle[]>([]);
  const [indicators, setIndicators] = useState<IndicatorData>({
    rsi14: [],
    ema20: [],
    ema50: [],
    ema200: [],
    macd: { macdLine: [], signalLine: [], histogram: [] },
    supportLevels: [],
    resistanceLevels: [],
    currentPrice: 0,
    priceChange24h: 0,
    priceChangePercent24h: 0,
  });

  const [news, setNews] = useState<NewsItem[]>([]);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);

  const [isLoadingMarket, setIsLoadingMarket] = useState<boolean>(true);
  const [isLoadingNews, setIsLoadingNews] = useState<boolean>(true);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [isSendingTelegram, setIsSendingTelegram] = useState<boolean>(false);
  const [telegramStatus, setTelegramStatus] = useState<{ success: boolean; message: string } | null>(null);

  const [isTelegramModalOpen, setIsTelegramModalOpen] = useState<boolean>(false);
  const wsRef = useRef<WebSocket | null>(null);

  // Fetch Market Candles & Technicals (Ultra-fresh with cache-busting)
  const loadMarketData = useCallback(async (symbol: string, tf: string, isSilent = false) => {
    if (!isSilent) setIsLoadingMarket(true);
    try {
      const res = await fetch(`/api/market-data?symbol=${encodeURIComponent(symbol)}&timeframe=${encodeURIComponent(tf)}&_t=${Date.now()}`, {
        cache: "no-store",
      });
      const data = await res.json();
      if (data.success && data.candles && data.candles.length > 0) {
        setCandles(data.candles);
        setIndicators(data.indicators);
      }
    } catch (err) {
      console.error("Failed to load market data:", err);
    } finally {
      if (!isSilent) setIsLoadingMarket(false);
    }
  }, []);

  // Fetch Live Breaking News
  const loadNews = useCallback(async (symbol?: string) => {
    setIsLoadingNews(true);
    try {
      const query = symbol ? `?symbol=${encodeURIComponent(symbol)}` : "";
      const res = await fetch(`/api/news${query}`);
      const data = await res.json();
      if (data.success) {
        setNews(data.news);
      }
    } catch (err) {
      console.error("Failed to load news:", err);
    } finally {
      setIsLoadingNews(false);
    }
  }, []);

  // Run AI Confluence Analysis (Automated Backtest & 3-Tier Hierarchy included)
  const runAnalysis = useCallback(async () => {
    setIsAnalyzing(true);
    setTelegramStatus(null);
    try {
      let customApiKey = "";
      if (typeof window !== "undefined") {
        customApiKey = localStorage.getItem("gemini_api_key") || "";
      }

      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          symbol: selectedAsset,
          timeframe: selectedTimeframe,
          customApiKey: customApiKey || undefined,
        }),
      });

      const data = await res.json();
      if (data.success && data.analysis) {
        setAnalysis(data.analysis);
      }
    } catch (err) {
      console.error("AI Analysis failed:", err);
    } finally {
      setIsAnalyzing(false);
    }
  }, [selectedAsset, selectedTimeframe]);

  // Send Signal to Telegram Bot
  const handleSendTelegram = async () => {
    if (!analysis) return;

    setIsSendingTelegram(true);
    setTelegramStatus(null);

    try {
      let botToken = "";
      let chatId = "";
      if (typeof window !== "undefined") {
        botToken = localStorage.getItem("telegram_bot_token") || "";
        chatId = localStorage.getItem("telegram_chat_id") || "";
      }

      const res = await fetch("/api/telegram", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          botToken: botToken || undefined,
          chatId: chatId || undefined,
          analysis,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setTelegramStatus({ success: true, message: "Alert sent to Telegram successfully!" });
      } else {
        setTelegramStatus({
          success: false,
          message: data.error || "Failed to dispatch alert to Telegram. Please check Bot Token & Chat ID in Settings.",
        });
      }
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      setTelegramStatus({ success: false, message: errMsg });
    } finally {
      setIsSendingTelegram(false);
    }
  };

  // ─── Instant Millisecond Live Ticker (WebSocket for Gold XAUUSD & All Cryptos) ───
  useEffect(() => {
    loadMarketData(selectedAsset, selectedTimeframe);
    loadNews(selectedAsset);

    // Map symbol to Binance Live Trade WebSocket
    let wsSymbol: string | null = null;
    if (selectedAsset === "XAUUSD") {
      wsSymbol = "paxgusdt"; // PAX Gold tracks Gold 1:1 on Binance with sub-second ticks!
    } else if (selectedAsset.endsWith("USDT")) {
      wsSymbol = selectedAsset.toLowerCase();
    } else if (["BTC", "ETH", "SOL", "BNB", "XRP", "ADA", "DOGE"].some((c) => selectedAsset.startsWith(c))) {
      wsSymbol = `${selectedAsset.toLowerCase()}usdt`;
    }

    if (wsSymbol) {
      try {
        const ws = new WebSocket(`wss://stream.binance.com:9443/ws/${wsSymbol}@trade`);
        wsRef.current = ws;

        ws.onmessage = (event) => {
          const trade = JSON.parse(event.data);
          const livePrice = parseFloat(trade.p);
          if (livePrice && !isNaN(livePrice)) {
            const formattedPrice = Number(livePrice.toFixed(2));
            setCandles((prevCandles) => {
              if (prevCandles.length === 0) return prevCandles;
              const newCandles = [...prevCandles];
              const last = { ...newCandles[newCandles.length - 1] };
              last.close = formattedPrice;
              last.high = Math.max(last.high, formattedPrice);
              last.low = Math.min(last.low, formattedPrice);
              newCandles[newCandles.length - 1] = last;
              return newCandles;
            });

            setIndicators((prev) => ({
              ...prev,
              currentPrice: formattedPrice,
            }));
          }
        };

        ws.onerror = () => ws.close();
      } catch (e) {
        console.warn("WebSocket stream error:", e);
      }
    }

    // Stable background sync (every 10 seconds)
    const pollInterval = setInterval(() => {
      loadMarketData(selectedAsset, selectedTimeframe, true);
    }, 10000);

    return () => {
      clearInterval(pollInterval);
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [selectedAsset, selectedTimeframe, loadMarketData, loadNews]);

  // Auto trigger AI analysis
  useEffect(() => {
    const timer = setTimeout(() => {
      runAnalysis();
    }, 500);
    return () => clearTimeout(timer);
  }, [selectedAsset, selectedTimeframe, runAnalysis]);

  const handleRefreshAll = () => {
    loadMarketData(selectedAsset, selectedTimeframe);
    loadNews(selectedAsset);
    runAnalysis();
  };

  return (
    <div className="min-h-screen flex flex-col bg-surface-300">
      {/* Top Navigation */}
      <Header
        onRefreshAll={handleRefreshAll}
        isLoading={isLoadingMarket || isLoadingNews || isAnalyzing}
        onOpenTelegramModal={() => setIsTelegramModalOpen(true)}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 lg:p-6 space-y-5">
        {/* Asset & Timeframe Bar */}
        <AssetSelector
          selectedAsset={selectedAsset}
          onSelectAsset={setSelectedAsset}
          selectedTimeframe={selectedTimeframe}
          onSelectTimeframe={setSelectedTimeframe}
          onRunAnalysis={runAnalysis}
          isAnalyzing={isAnalyzing}
          currentPrice={indicators.currentPrice}
          priceChangePercent={indicators.priceChangePercent24h}
        />

        {/* 2-Column Grid Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Left Column (8 cols): Chart & AI Analysis */}
          <div className="lg:col-span-8 space-y-5">
            {/* Candlestick & Indicator Chart */}
            <MarketChart
              candles={candles}
              indicators={indicators}
              symbol={selectedAsset}
              timeframe={selectedTimeframe}
              isLiveUpdating={true}
              optimizedConfig={analysis?.optimizedConfig}
            />

            {/* AI Hybrid Analysis & Signals Card (3-Tier Hierarchy & Auto-Tuning inside) */}
            <AnalysisCard
              analysis={analysis}
              isLoading={isAnalyzing}
              onSendTelegram={handleSendTelegram}
              isSendingTelegram={isSendingTelegram}
              telegramStatus={telegramStatus}
            />
          </div>

          {/* Right Column (4 cols): Real-time News Feed */}
          <div className="lg:col-span-4">
            <NewsFeed
              news={news}
              isLoading={isLoadingNews}
              selectedAsset={selectedAsset}
            />
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 py-4 px-6 text-center text-xs text-slate-500 bg-surface-200/40">
        AI Market & News Indicator • Ready for Vercel Deployment & Telegram Bot Automations • For Educational & Research Purposes
      </footer>

      {/* Settings Modal */}
      <TelegramSettingsModal
        isOpen={isTelegramModalOpen}
        onClose={() => setIsTelegramModalOpen(false)}
        onSave={() => {
          setTelegramStatus(null);
        }}
      />
    </div>
  );
}