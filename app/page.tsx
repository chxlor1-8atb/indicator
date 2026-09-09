"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import dynamic from "next/dynamic";
import Header from "@/components/Header";
import AssetSelector from "@/components/AssetSelector";
import NewsFeed from "@/components/NewsFeed";
import AnalysisCard from "@/components/AnalysisCard";
import SignalJournalCard from "@/components/SignalJournalCard";
import TelegramSettingsModal from "@/components/TelegramSettingsModal";
import { Candle, IndicatorData, NewsItem, AnalysisResult } from "@/lib/types";
import { calculateAllIndicators } from "@/lib/indicators";
import { Bot, Radio, Zap, ShieldCheck, Activity } from "lucide-react";

// Dynamically import MarketChart with SSR disabled for clean canvas lifecycle
const MarketChart = dynamic(() => import("@/components/MarketChart"), {
  ssr: false,
  loading: () => (
    <div className="bg-surface-100 border border-slate-800 rounded-2xl p-6 min-h-[440px] flex items-center justify-center text-center">
      <div className="space-y-2">
        <div className="w-8 h-8 border-2 border-zinc-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
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
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(true);
  const [isSendingTelegram, setIsSendingTelegram] = useState<boolean>(false);
  const [telegramStatus, setTelegramStatus] = useState<{ success: boolean; message: string } | null>(null);

  const [isTelegramModalOpen, setIsTelegramModalOpen] = useState<boolean>(false);
  const wsRef = useRef<WebSocket | null>(null);

  // ─── Data Freshness & Last Updated Timestamps (ข้อ 7) ───
  const [marketLastUpdated, setMarketLastUpdated] = useState<number | null>(null);
  const [newsLastUpdated, setNewsLastUpdated] = useState<number | null>(null);
  const [analysisLastUpdated, setAnalysisLastUpdated] = useState<number | null>(null);
  const [liveTickLastUpdated, setLiveTickLastUpdated] = useState<number | null>(null);

  // ─── Autonomous AI Auto-Pilot State ───
  const [isAutoPilot, setIsAutoPilot] = useState<boolean>(true);
  const [activeBridgeOrders, setActiveBridgeOrders] = useState<any[]>([]);
  const [latestTelemetry, setLatestTelemetry] = useState<string>("ระบบ AI ตัดสินใจอัตโนมัติทำงาน • Watchlist ซิงค์เรียลไทม์ 100%");
  const [lastSyncTime, setLastSyncTime] = useState<string>("เพิ่งอัปเดต");

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
        const t = data.timestamp || Date.now();
        setMarketLastUpdated(t);
        setLiveTickLastUpdated(t);
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
        setNewsLastUpdated(data.timestamp || Date.now());
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
        setAnalysisLastUpdated(Date.now());
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

  // ─── Dual Stream: TradingView Institutional Sync for Forex/Gold + Binance WS for Cryptos ───
  useEffect(() => {
    loadMarketData(selectedAsset, selectedTimeframe);
    loadNews(selectedAsset);

    let isMounted = true;
    let tickerInterval: NodeJS.Timeout | null = null;
    let reconnectTimeout: NodeJS.Timeout | null = null;
    let reconnectDelay = 1000;

    const isInstitutionalAsset =
      selectedAsset === "XAUUSD" ||
      selectedAsset === "GOLD" ||
      selectedAsset === "XAGUSD" ||
      selectedAsset === "USOIL" ||
      selectedAsset === "UKOIL" ||
      (selectedAsset.length === 6 && !selectedAsset.includes("USDT"));

    if (isInstitutionalAsset) {
      // Direct TradingView Institutional OANDA/Interbank Feed Polling (adaptive 2.5s active / 12s inactive)
      const pollLiveTicker = async () => {
        if (!isMounted) return;
        // If tab is in background, skip some polls to conserve bandwidth and prevent rate limiting
        if (typeof document !== "undefined" && document.hidden && Math.random() > 0.25) {
          return;
        }
        try {
          const res = await fetch(`/api/live-ticker?symbol=${selectedAsset}`, { cache: "no-store" });
          if (res.ok) {
            const data = await res.json();
            if (data.success && typeof data.price === "number" && data.price > 0 && isMounted) {
              const livePrice = data.price;
              setLiveTickLastUpdated(data.timestamp || Date.now());
              setCandles((prevCandles) => {
                if (prevCandles.length === 0) return prevCandles;
                const newCandles = [...prevCandles];
                const last = { ...newCandles[newCandles.length - 1] };
                last.close = livePrice;
                last.high = Math.max(last.high, livePrice);
                last.low = Math.min(last.low, livePrice);
                newCandles[newCandles.length - 1] = last;
                return newCandles;
              });

              setIndicators((prev) => ({
                ...prev,
                currentPrice: livePrice,
              }));
            }
          }
        } catch {
          // ignore transient poll error
        }
      };

      // Poll immediately and then every 2500ms
      pollLiveTicker();
      tickerInterval = setInterval(pollLiveTicker, 2500);
    } else {
      // Map symbol to Binance Live Trade WebSocket for Cryptocurrencies
      let wsSymbol: string | null = null;
      if (selectedAsset.endsWith("USDT")) {
        wsSymbol = selectedAsset.toLowerCase();
      } else if (["BTC", "ETH", "SOL", "BNB", "XRP", "ADA", "DOGE"].some((c) => selectedAsset.startsWith(c))) {
        wsSymbol = `${selectedAsset.toLowerCase()}usdt`;
      }

      const connectWebSocket = () => {
        if (!wsSymbol || !isMounted) return;

        try {
          const ws = new WebSocket(`wss://stream.binance.com:9443/ws/${wsSymbol}@trade`);
          wsRef.current = ws;

          ws.onopen = () => {
            reconnectDelay = 1000;
          };

          ws.onmessage = (event) => {
            if (!isMounted) return;
            try {
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
                setLiveTickLastUpdated(Date.now());
              }
            } catch {
              // Ignore malformed tick
            }
          };

          ws.onclose = () => {
            if (isMounted) {
              reconnectTimeout = setTimeout(() => {
                reconnectDelay = Math.min(reconnectDelay * 1.5, 10000);
                connectWebSocket();
              }, reconnectDelay);
            }
          };

          ws.onerror = () => {
            ws.close();
          };
        } catch (e) {
          console.warn("WebSocket stream error:", e);
        }
      };

      if (wsSymbol) {
        connectWebSocket();
      }
    }

    // Stable background sync (every 10 seconds)
    const pollInterval = setInterval(() => {
      loadMarketData(selectedAsset, selectedTimeframe, true);
    }, 10000);

    return () => {
      isMounted = false;
      if (tickerInterval) clearInterval(tickerInterval);
      clearInterval(pollInterval);
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [selectedAsset, selectedTimeframe, loadMarketData, loadNews]);

  // Continuous Real-Time Autonomous Scanner Loop (adaptive 25s cadence to prevent rate limits & serverless load)
  useEffect(() => {
    if (!isAutoPilot) return;

    let isMounted = true;
    const runAutonomousSync = async () => {
      if (!isMounted) return;
      // Skip autonomous scan when user is not viewing the tab
      if (typeof document !== "undefined" && document.hidden) return;

      try {
        const res = await fetch(`/api/autonomous-scanner?scan=true&_t=${Date.now()}`);
        if (res.ok && isMounted) {
          const data = await res.json();
          if (data.success) {
            if (data.activeOrders) setActiveBridgeOrders(data.activeOrders);
            if (data.telemetryLogs && data.telemetryLogs.length > 0) {
              setLatestTelemetry(data.telemetryLogs[0].message);
            }
            const now = new Date();
            setLastSyncTime(now.toTimeString().split(" ")[0]);
          }
        }
      } catch {
        // Silently handle transient network issue
      }
    };

    const initialTimer = setTimeout(runAutonomousSync, 2000);
    const syncInterval = setInterval(runAutonomousSync, 25000);

    return () => {
      isMounted = false;
      clearTimeout(initialTimer);
      clearInterval(syncInterval);
    };
  }, [isAutoPilot]);

  // Auto trigger AI analysis immediately on mount and debounced on change
  const isInitialMount = useRef(true);
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      runAnalysis();
      return;
    }
    const timer = setTimeout(() => {
      runAnalysis();
    }, 400);
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
        lastSyncTimestamp={liveTickLastUpdated || marketLastUpdated}
      />

      {/* Main Container */}
      <main className="flex-1 w-full px-3 sm:px-6 lg:px-8 py-4 lg:py-6 space-y-4 lg:space-y-6">
        {/* AI Autonomous Auto-Pilot Live HUD Banner */}
        <div className="w-full bg-surface-100/90 border border-indigo-500/25 rounded-2xl p-3 sm:p-4 shadow-lg shadow-black/20 flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border transition-all ${
                isAutoPilot
                  ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400 shadow-md shadow-emerald-500/10"
                  : "bg-slate-800 border-slate-700 text-slate-400"
              }`}
            >
              <Bot className={`w-5 h-5 ${isAutoPilot ? "animate-pulse" : ""}`} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-bold text-sm text-white flex items-center gap-1.5">
                  AI Autonomous Decision Pilot
                  {isAutoPilot && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                      ULTRA REAL-TIME SYNC
                    </span>
                  )}
                </span>
                <span className="text-[11px] text-slate-400 font-mono">
                  (ซิงค์สด {lastSyncTime})
                </span>
              </div>
              <p className="text-xs text-slate-300 truncate max-w-xl flex items-center gap-1.5 mt-0.5">
                <Radio className={`w-3.5 h-3.5 shrink-0 ${isAutoPilot ? "text-cyan-400 animate-spin" : "text-slate-500"}`} />
                <span className="truncate">{latestTelemetry}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 sm:gap-3 self-end md:self-center shrink-0">
            {/* Active Bridge Orders Badge */}
            <div className="px-2.5 py-1.5 rounded-xl bg-surface-50 border border-slate-800 flex items-center gap-1.5 text-xs font-mono">
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-slate-400">MT Bridge:</span>
              <span className="font-bold text-white">{activeBridgeOrders.length} ออเดอร์</span>
            </div>

            {/* Auto-Pilot Toggle Button */}
            <button
              onClick={() => setIsAutoPilot((prev) => !prev)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all border shadow-sm ${
                isAutoPilot
                  ? "bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-400/30 shadow-emerald-600/20"
                  : "bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700"
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${isAutoPilot ? "bg-white animate-pulse" : "bg-slate-500"}`} />
              {isAutoPilot ? "ระบบตัดสินใจอัตโนมัติ: เปิด" : "ระบบตัดสินใจอัตโนมัติ: ปิด"}
            </button>
          </div>
        </div>

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
          isLoadingPrice={isLoadingMarket || !indicators.currentPrice || indicators.currentPrice <= 0}
          lastPriceUpdate={liveTickLastUpdated || marketLastUpdated}
        />

        {/* 2-Column Responsive Grid Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 2xl:grid-cols-12 gap-4 lg:gap-6 w-full items-start">
          {/* Left Column: Chart & AI Analysis & Signal Journal (8 cols on lg, 9 cols on 2xl) */}
          <div className="lg:col-span-8 2xl:col-span-9 space-y-4 lg:space-y-6 min-w-0">
            {/* Candlestick & Indicator Chart */}
            <MarketChart
              candles={candles}
              indicators={indicators}
              symbol={selectedAsset}
              timeframe={selectedTimeframe}
              isLiveUpdating={true}
              optimizedConfig={analysis?.optimizedConfig}
              lastTickTime={liveTickLastUpdated || marketLastUpdated}
            />

            {/* AI Hybrid Analysis & Signals Card (3-Tier Hierarchy & Auto-Tuning inside) */}
            <AnalysisCard
              analysis={analysis}
              isLoading={isAnalyzing}
              onSendTelegram={handleSendTelegram}
              isSendingTelegram={isSendingTelegram}
              telegramStatus={telegramStatus}
            />

            {/* AI Trade Journal & Real Win-Rate Tracker (Neon Serverless Postgres) */}
            <SignalJournalCard />
          </div>

          {/* Right Column: Real-time News Feed & Calendar (4 cols on lg, 3 cols on 2xl) with sticky sidebar */}
          <div className="lg:col-span-4 2xl:col-span-3 min-w-0">
            <div className="lg:sticky lg:top-[68px] space-y-4">
              <NewsFeed
                news={news}
                isLoading={isLoadingNews}
                selectedAsset={selectedAsset}
                lastNewsTime={newsLastUpdated}
              />
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 py-4 px-4 sm:px-6 lg:px-8 text-center text-xs text-slate-500 bg-surface-200/40 w-full">
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