"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import dynamic from "next/dynamic";
import Header from "@/components/Header";
import AssetSelector from "@/components/AssetSelector";
import NewsFeed from "@/components/NewsFeed";
import AnalysisCard from "@/components/AnalysisCard";
import SignalJournalCard from "@/components/SignalJournalCard";
import MarketOpportunityRadar from "@/components/MarketOpportunityRadar";
import TelegramSettingsModal from "@/components/TelegramSettingsModal";
import AmbientBackground, { BackgroundTheme } from "@/components/AmbientBackground";
import BackgroundCustomizerModal from "@/components/BackgroundCustomizerModal";
import { Candle, IndicatorData, NewsItem, AnalysisResult, AssetScannerSummary } from "@/lib/types";
import { calculateAllIndicators } from "@/lib/indicators";
import { Bot, Radio, Zap, ShieldCheck, Activity, Target, BarChart3, Newspaper, BookOpen, Layers } from "lucide-react";

// Dynamically import MarketChart with SSR disabled for clean canvas lifecycle
const MarketChart = dynamic(() => import("@/components/MarketChart"), {
  ssr: false,
  loading: () => (
    <div className="terminal-card p-6 min-h-[440px] flex items-center justify-center text-center">
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
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [isSendingTelegram, setIsSendingTelegram] = useState<boolean>(false);
  const [telegramStatus, setTelegramStatus] = useState<{ success: boolean; message: string } | null>(null);

  const [isTelegramModalOpen, setIsTelegramModalOpen] = useState<boolean>(false);
  const [isBackgroundModalOpen, setIsBackgroundModalOpen] = useState<boolean>(false);
  const [bgTheme, setBgTheme] = useState<BackgroundTheme>("cyber-aurora");
  const [bgIntensity, setBgIntensity] = useState<number>(0.75);
  const [parallaxEnabled, setParallaxEnabled] = useState<boolean>(true);

  const wsRef = useRef<WebSocket | null>(null);
  const marketDataInFlightRef = useRef<boolean>(false);
  const analysisInFlightRef = useRef<boolean>(false);

  // ─── Background Settings LocalStorage Sync ───
  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const savedTheme = localStorage.getItem("aegis_bg_theme") as BackgroundTheme;
        if (savedTheme && ["cyber-aurora", "dark-gold", "neural-matrix", "minimal-obsidian"].includes(savedTheme)) {
          setBgTheme(savedTheme);
        }
        const savedIntensity = localStorage.getItem("aegis_bg_intensity");
        if (savedIntensity) {
          const val = parseFloat(savedIntensity);
          if (!isNaN(val) && val >= 0.1 && val <= 1.0) setBgIntensity(val);
        }
        const savedParallax = localStorage.getItem("aegis_bg_parallax");
        if (savedParallax !== null) {
          setParallaxEnabled(savedParallax === "true");
        }
      } catch {
        // Fallback silently if storage unavailable
      }
    }
  }, []);

  const handleSelectBgTheme = (theme: BackgroundTheme) => {
    setBgTheme(theme);
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("aegis_bg_theme", theme);
      } catch {}
    }
  };

  const handleChangeIntensity = (intensity: number) => {
    setBgIntensity(intensity);
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("aegis_bg_intensity", intensity.toString());
      } catch {}
    }
  };

  const handleToggleParallax = (enabled: boolean) => {
    setParallaxEnabled(enabled);
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("aegis_bg_parallax", enabled.toString());
      } catch {}
    }
  };

  // ─── Data Freshness & Last Updated Timestamps (ข้อ 7) ───
  const [marketLastUpdated, setMarketLastUpdated] = useState<number | null>(null);
  const [newsLastUpdated, setNewsLastUpdated] = useState<number | null>(null);
  const [analysisLastUpdated, setAnalysisLastUpdated] = useState<number | null>(null);
  const [liveTickLastUpdated, setLiveTickLastUpdated] = useState<number | null>(null);

  // ─── Autonomous AI Auto-Pilot State ───
  const [isAutoPilot, setIsAutoPilot] = useState<boolean>(true);
  const [activeBridgeOrders, setActiveBridgeOrders] = useState<any[]>([]);
  const [latestTelemetry, setLatestTelemetry] = useState<string>("ระบบ AI ตรวจจับ 5 เสาหลัก & พร้อมส่งสัญญาณแจ้งเตือน Telegram เรียลไทม์ 100%");
  const [scannerSummaries, setScannerSummaries] = useState<AssetScannerSummary[]>([]);
  const [isLoadingScanner, setIsLoadingScanner] = useState<boolean>(true);

  // ─── PWA Mobile & Responsive Workspace View State ───
  const [activeTab, setActiveTab] = useState<"SIGNALS" | "CHART" | "RADAR" | "NEWS" | "JOURNAL" | "ALL">("ALL");

  useEffect(() => {
    // Keep default as ALL across all screen sizes for complete view, allow switching on mobile/desktop
  }, []);

  const loadMarketData = useCallback(async (symbol: string, tf: string, isSilent = false) => {
    if (marketDataInFlightRef.current) return;
    marketDataInFlightRef.current = true;
    if (!isSilent) setIsLoadingMarket(true);
    try {
      // Keep a stable URL so Vercel's shared cache can serve historical candles.
      // Live price updates arrive independently over a browser WebSocket below.
      const res = await fetch(`/api/market-data?symbol=${encodeURIComponent(symbol)}&timeframe=${encodeURIComponent(tf)}`);
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
      marketDataInFlightRef.current = false;
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
    if (analysisInFlightRef.current) return;
    analysisInFlightRef.current = true;
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
      analysisInFlightRef.current = false;
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
    runAnalysis();

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

    // Gold uses Binance's public PAXG/USDT trade stream directly in the browser.
    // This is a free live reference price and does not invoke a Vercel Function.
    const isGoldReferenceStream = selectedAsset === "XAUUSD" || selectedAsset === "GOLD";

    let fallbackPollingInterval: NodeJS.Timeout | null = null;
    let wsWatchdogTimeout: NodeJS.Timeout | null = null;

    const startPollingFallback = () => {
      if (fallbackPollingInterval || !isMounted) return;
      const pollFallback = async () => {
        if (!isMounted) return;
        if (typeof document !== "undefined" && document.hidden) return;
        try {
          const res = await fetch(`/api/live-ticker?symbol=${selectedAsset}`);
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

              setIndicators((prev) => {
                const firstPrice = candles[0]?.open || candles[0]?.close || livePrice;
                const chg24h = Number((livePrice - firstPrice).toFixed(4));
                const chgPct = firstPrice > 0 ? Number(((chg24h / firstPrice) * 100).toFixed(2)) : 0;
                return {
                  ...prev,
                  currentPrice: livePrice,
                  priceChange24h: chg24h,
                  priceChangePercent24h: chgPct,
                };
              });
            }
          }
        } catch {
          // ignore transient poll error
        }
      };

      pollFallback();
      fallbackPollingInterval = setInterval(pollFallback, 3500);
    };

    if (isInstitutionalAsset && !isGoldReferenceStream) {
      // Direct TradingView Institutional OANDA/Interbank Feed Polling (3.5s high frequency)
      const pollLiveTicker = async () => {
        if (!isMounted) return;
        if (typeof document !== "undefined" && document.hidden) return;
        try {
          const res = await fetch(`/api/live-ticker?symbol=${selectedAsset}`);
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

              setIndicators((prev) => {
                const firstPrice = candles[0]?.open || candles[0]?.close || livePrice;
                const chg24h = Number((livePrice - firstPrice).toFixed(4));
                const chgPct = firstPrice > 0 ? Number(((chg24h / firstPrice) * 100).toFixed(2)) : 0;
                return {
                  ...prev,
                  currentPrice: livePrice,
                  priceChange24h: chg24h,
                  priceChangePercent24h: chgPct,
                };
              });
            }
          }
        } catch {
          // ignore transient poll error
        }
      };

      pollLiveTicker();
      tickerInterval = setInterval(pollLiveTicker, 3500);
    } else {
      // Map crypto assets, plus XAUUSD's PAXG gold reference, to Binance's
      // public live-trade WebSocket.
      let wsSymbol: string | null = null;
      if (isGoldReferenceStream) {
        wsSymbol = "paxgusdt";
      } else if (selectedAsset.endsWith("USDT")) {
        wsSymbol = selectedAsset.toLowerCase();
      } else if (["BTC", "ETH", "SOL", "BNB", "XRP", "ADA", "DOGE"].some((c) => selectedAsset.startsWith(c))) {
        wsSymbol = `${selectedAsset.toLowerCase()}usdt`;
      }

      // Watchdog: If WebSocket does not produce a tick in 3.5s, trigger polling fallback
      wsWatchdogTimeout = setTimeout(() => {
        startPollingFallback();
      }, 3500);

      const connectWebSocket = () => {
        if (!wsSymbol || !isMounted) return;

        try {
          const ws = new WebSocket(`wss://stream.binance.com:9443/ws/${wsSymbol}@trade`);
          wsRef.current = ws;

          ws.onopen = () => {
            reconnectDelay = 1000;
          };

          let _rafId: number | null = null;
          let _pendingPrice: number | null = null;

          const _flushTick = () => {
            _rafId = null;
            if (_pendingPrice === null || !isMounted) return;
            const formattedPrice = _pendingPrice;
            _pendingPrice = null;

            // Clear polling fallback if websocket is actively feeding
            if (fallbackPollingInterval) {
              clearInterval(fallbackPollingInterval);
              fallbackPollingInterval = null;
            }

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
            setIndicators((prev) => {
              const firstPrice = candles[0]?.open || candles[0]?.close || formattedPrice;
              const chg24h = Number((formattedPrice - firstPrice).toFixed(4));
              const chgPct = firstPrice > 0 ? Number(((chg24h / firstPrice) * 100).toFixed(2)) : 0;
              return {
                ...prev,
                currentPrice: formattedPrice,
                priceChange24h: chg24h,
                priceChangePercent24h: chgPct,
              };
            });
            setLiveTickLastUpdated(Date.now());
          };

          ws.onmessage = (event) => {
            if (!isMounted) return;
            try {
              const trade = JSON.parse(event.data);
              const livePrice = parseFloat(trade.p);
              if (livePrice && !isNaN(livePrice)) {
                const dec = livePrice < 0.001 ? 6 : livePrice < 1 ? 4 : livePrice < 20 ? 3 : 2;
                _pendingPrice = Number(livePrice.toFixed(dec));
                if (_rafId !== null) cancelAnimationFrame(_rafId);
                _rafId = requestAnimationFrame(_flushTick);
              }
            } catch {
              // Ignore malformed tick
            }
          };

          ws.onclose = () => {
            if (_rafId !== null) { cancelAnimationFrame(_rafId); _rafId = null; }
            startPollingFallback();
            if (isMounted) {
              reconnectTimeout = setTimeout(() => {
                reconnectDelay = Math.min(reconnectDelay * 1.5, 10000);
                connectWebSocket();
              }, reconnectDelay);
            }
          };

          ws.onerror = () => {
            startPollingFallback();
            ws.close();
          };
        } catch (e) {
          console.warn("WebSocket stream error, starting polling fallback:", e);
          startPollingFallback();
        }
      };

      if (wsSymbol) {
        connectWebSocket();
      } else {
        startPollingFallback();
      }
    }

    // Historical candles and indicators are reconciled periodically; the open
    // candle itself is updated by the direct stream above.
    const pollInterval = setInterval(() => {
      if (typeof document !== "undefined" && document.hidden) return;
      loadMarketData(selectedAsset, selectedTimeframe, true);
    }, 30000);

    const onVisChangeChart = () => {
      if (typeof document !== "undefined" && document.visibilityState === "visible") {
        loadMarketData(selectedAsset, selectedTimeframe, true);
      }
    };
    if (typeof document !== "undefined") {
      document.addEventListener("visibilitychange", onVisChangeChart);
    }

    return () => {
      isMounted = false;
      if (tickerInterval) clearInterval(tickerInterval);
      if (fallbackPollingInterval) clearInterval(fallbackPollingInterval);
      if (wsWatchdogTimeout) clearTimeout(wsWatchdogTimeout);
      clearInterval(pollInterval);
      if (typeof document !== "undefined") {
        document.removeEventListener("visibilitychange", onVisChangeChart);
      }
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [selectedAsset, selectedTimeframe, loadMarketData, loadNews]);

  // Continuous Real-Time Autonomous Scanner Loop (reads cached status every 60s; paused when tab hidden)
  useEffect(() => {
    let isMounted = true;
    let inFlight = false;
    const runAutonomousSync = async (forceScan = false) => {
      if (!isMounted || inFlight) return;
      if (typeof document !== "undefined" && document.hidden) return;
      inFlight = true;
      try {
        const endpoint = forceScan
          ? `/api/autonomous-scanner?scan=true`
          : `/api/autonomous-scanner`;
        const res = await fetch(endpoint);
        if (res.ok && isMounted) {
          const data = await res.json();
          if (data.success) {
            if (data.activeOrders) setActiveBridgeOrders(data.activeOrders);
            if (data.scannerSummaries && data.scannerSummaries.length > 0) {
              setScannerSummaries(data.scannerSummaries);
            }
            if (data.telemetryLogs && data.telemetryLogs.length > 0) {
              setLatestTelemetry(data.telemetryLogs[0].message);
            }
            setIsLoadingScanner(false);
          }
        }
      } catch {
        // Silently handle transient network issue
      } finally {
        inFlight = false;
      }
    };

    // Initial soft sync from cache instead of forcing serverless scan
    const initialTimer = setTimeout(() => runAutonomousSync(false), 1000);
    const syncInterval = setInterval(() => runAutonomousSync(false), 60000);

    const onVisChangeScanner = () => {
      if (typeof document !== "undefined" && document.visibilityState === "visible") {
        runAutonomousSync(false);
      }
    };
    if (typeof document !== "undefined") {
      document.addEventListener("visibilitychange", onVisChangeScanner);
    }

    return () => {
      isMounted = false;
      clearTimeout(initialTimer);
      clearInterval(syncInterval);
      if (typeof document !== "undefined") {
        document.removeEventListener("visibilitychange", onVisChangeScanner);
      }
    };
  }, []);

  const handleToggleAutoPilot = async () => {
    const nextVal = !isAutoPilot;
    setIsAutoPilot(nextVal);
    try {
      await fetch("/api/autonomous-scanner", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isEnabled: nextVal }),
      });
    } catch (err) {
      console.error("Failed to update auto-pilot on server:", err);
    }
  };

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

  return (
    <div className="min-h-screen flex flex-col text-slate-100 selection:bg-cyan-500/30 selection:text-cyan-200 relative overflow-x-hidden">
      {/* Dynamic Multi-Layer Ambient Background with Parallax Scroll */}
      <AmbientBackground
        theme={bgTheme}
        intensity={bgIntensity}
        parallaxEnabled={parallaxEnabled}
      />

      {/* Top Navigation */}
      <Header
        isLoading={isLoadingMarket || isLoadingNews || isAnalyzing}
        onOpenTelegramModal={() => setIsTelegramModalOpen(true)}
        onOpenBackgroundModal={() => setIsBackgroundModalOpen(true)}
      />

      {/* Main Container */}
      <main className="flex-1 w-full max-w-full min-w-0 overflow-x-hidden relative z-10 px-3 sm:px-6 lg:px-8 py-3 space-y-3 pb-24 md:pb-8">
        {/* AI Autonomous Auto-Pilot Live HUD (Compact Executive Telemetry Strip) */}
        <div className="terminal-card px-3 sm:px-4 py-2 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5">
          <div className="flex items-center gap-2 sm:gap-2.5 min-w-0 w-full sm:w-auto">
            <div
              className={`w-7 h-7 rounded-md flex items-center justify-center shrink-0 border transition-colors ${
                isAutoPilot
                  ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                  : "bg-white/[0.04] border-white/[0.08] text-zinc-500"
              }`}
            >
              <Bot className="w-4 h-4" />
            </div>
            <div className="min-w-0 flex items-center gap-1.5 sm:gap-2 flex-wrap">
              <span className="font-semibold text-xs text-white flex items-center gap-1.5 tracking-tight">
                AI Autonomous Pilot
                {isAutoPilot && (
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/25">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    LIVE
                  </span>
                )}
              </span>
              <p className="text-[10px] sm:text-[11px] text-zinc-300 truncate max-w-[200px] xs:max-w-xs sm:max-w-sm md:max-w-md lg:max-w-xl flex items-center gap-1.5">
                <Radio className={`w-3 h-3 shrink-0 ${isAutoPilot ? "text-blue-400" : "text-zinc-500"}`} />
                <span className="truncate">{latestTelemetry}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between sm:justify-end gap-2 w-full sm:w-auto shrink-0">
            {/* Telegram Signals Live Badge */}
            <div className="h-7 px-2 rounded-md bg-white/[0.03] border border-white/[0.06] flex items-center gap-1.5 text-[10px] sm:text-[11px] font-mono text-zinc-300">
              <Zap className="w-3 h-3 text-amber-400" />
              <span className="text-zinc-400 hidden xs:inline">TG:</span>
              <span className="font-medium text-white hidden xs:inline">Live Broadcast</span>
              <span className="font-medium text-white xs:hidden">Live</span>
            </div>

            {/* Auto-Pilot Toggle Button */}
            <button
              onClick={handleToggleAutoPilot}
              className={`h-7 px-2 sm:px-2.5 rounded-md text-[11px] sm:text-xs font-medium flex items-center gap-1.5 transition-colors border cursor-pointer ${
                isAutoPilot
                  ? "bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border-emerald-500/30"
                  : "bg-white/[0.04] hover:bg-white/[0.08] text-zinc-400 border-white/[0.08]"
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${isAutoPilot ? "bg-emerald-400 animate-pulse" : "bg-zinc-600"}`} />
              <span className="hidden xs:inline">{isAutoPilot ? "Auto-Pilot: ON" : "Auto-Pilot: OFF"}</span>
              <span className="xs:hidden">{isAutoPilot ? "Pilot: ON" : "Pilot: OFF"}</span>
            </button>
          </div>
        </div>

        {/* ─── DESKTOP VIEW SELECTOR (Precision Segmented Control) ─── */}
        <div className="hidden md:flex items-center justify-between gap-2 overflow-x-auto no-scrollbar py-0.5">
          <div className="flex items-center gap-1 p-0.5 rounded-md bg-[#0A0C10] border border-white/[0.08] shrink-0">
            <button
              onClick={() => setActiveTab("SIGNALS")}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-[5px] text-xs font-medium transition-colors cursor-pointer ${
                activeTab === "SIGNALS"
                  ? "bg-white/[0.12] text-white border border-white/[0.15]"
                  : "text-zinc-400 hover:text-white hover:bg-white/[0.04] border border-transparent"
              }`}
            >
              <Target className="w-3.5 h-3.5 text-blue-400" />
              <span>สัญญาณเทรด</span>
            </button>

            <button
              onClick={() => setActiveTab("CHART")}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-[5px] text-xs font-medium transition-colors cursor-pointer ${
                activeTab === "CHART"
                  ? "bg-white/[0.12] text-white border border-white/[0.15]"
                  : "text-zinc-400 hover:text-white hover:bg-white/[0.04] border border-transparent"
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5 text-blue-400" />
              <span>กราฟสด</span>
            </button>

            <button
              onClick={() => setActiveTab("RADAR")}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-[5px] text-xs font-medium transition-colors cursor-pointer ${
                activeTab === "RADAR"
                  ? "bg-white/[0.12] text-white border border-white/[0.15]"
                  : "text-zinc-400 hover:text-white hover:bg-white/[0.04] border border-transparent"
              }`}
            >
              <Radio className="w-3.5 h-3.5 text-blue-400" />
              <span>เรดาร์ตลาด</span>
            </button>

            <button
              onClick={() => setActiveTab("NEWS")}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-[5px] text-xs font-medium transition-colors cursor-pointer ${
                activeTab === "NEWS"
                  ? "bg-white/[0.12] text-white border border-white/[0.15]"
                  : "text-zinc-400 hover:text-white hover:bg-white/[0.04] border border-transparent"
              }`}
            >
              <Newspaper className="w-3.5 h-3.5 text-blue-400" />
              <span>ข่าวเศรษฐกิจ</span>
            </button>

            <button
              onClick={() => setActiveTab("JOURNAL")}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-[5px] text-xs font-medium transition-colors cursor-pointer ${
                activeTab === "JOURNAL"
                  ? "bg-white/[0.12] text-white border border-white/[0.15]"
                  : "text-zinc-400 hover:text-white hover:bg-white/[0.04] border border-transparent"
              }`}
            >
              <BookOpen className="w-3.5 h-3.5 text-blue-400" />
              <span>บันทึกสถิติ</span>
            </button>

            <button
              onClick={() => setActiveTab("ALL")}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-[5px] text-xs font-medium transition-colors cursor-pointer ${
                activeTab === "ALL"
                  ? "bg-white/[0.12] text-white border border-white/[0.15]"
                  : "text-zinc-400 hover:text-white hover:bg-white/[0.04] border border-transparent"
              }`}
            >
              <Layers className="w-3.5 h-3.5 text-blue-400" />
              <span>รวมทั้งหมด</span>
            </button>
          </div>

          <span className="text-[11px] text-zinc-500 hidden lg:inline font-mono">
            {selectedAsset} • {selectedTimeframe.toUpperCase()}
          </span>
        </div>

        {/* ─── TAB-DRIVEN CONTENT VIEWS ─── */}
        {activeTab === "ALL" ? (
          <div className="space-y-4 lg:space-y-6 animate-fadeIn">
            {/* Live Multi-Asset Opportunity Radar */}
            <MarketOpportunityRadar
              summaries={scannerSummaries}
              selectedAsset={selectedAsset}
              onSelectAsset={(sym) => {
                setSelectedAsset(sym);
              }}
              isLoading={isLoadingScanner && scannerSummaries.length === 0}
            />

            {/* Asset & Timeframe Bar */}
            <AssetSelector
              selectedAsset={selectedAsset}
              onSelectAsset={setSelectedAsset}
              selectedTimeframe={selectedTimeframe}
              onSelectTimeframe={setSelectedTimeframe}
              onRunAnalysis={runAnalysis}
              isAnalyzing={isAnalyzing}
              currentPrice={indicators.currentPrice || (candles.length > 0 ? candles[candles.length - 1].close : 0)}
              priceChangePercent={indicators.priceChangePercent24h}
              isLoadingPrice={isLoadingMarket && (!candles || candles.length === 0)}
              lastPriceUpdate={liveTickLastUpdated || marketLastUpdated}
            />

            {/* 2-Column Responsive Grid Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-12 2xl:grid-cols-12 gap-3 sm:gap-3.5 w-full items-start">
              {/* Left Column: Chart & AI Analysis & Signal Journal (8 cols on lg, 9 cols on 2xl) */}
              <div className="lg:col-span-8 2xl:col-span-9 space-y-3 sm:space-y-3.5 min-w-0">
                <MarketChart
                  candles={candles}
                  indicators={indicators}
                  symbol={selectedAsset}
                  timeframe={selectedTimeframe}
                  isLiveUpdating={true}
                  optimizedConfig={analysis?.optimizedConfig}
                  lastTickTime={liveTickLastUpdated || marketLastUpdated}
                  priceFeedLabel={selectedAsset === "XAUUSD" || selectedAsset === "GOLD" ? "PAXG LIVE" : "LIVE TICK"}
                  livePrice={indicators.currentPrice}
                />

                <AnalysisCard
                  analysis={analysis}
                  isLoading={isAnalyzing}
                  onSendTelegram={handleSendTelegram}
                  isSendingTelegram={isSendingTelegram}
                  telegramStatus={telegramStatus}
                />

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
          </div>
        ) : (
          <div className="space-y-4 animate-fadeIn">
            {/* Show AssetSelector bar on SIGNALS & CHART views for instant switching */}
            {(activeTab === "SIGNALS" || activeTab === "CHART") && (
              <AssetSelector
                selectedAsset={selectedAsset}
                onSelectAsset={setSelectedAsset}
                selectedTimeframe={selectedTimeframe}
                onSelectTimeframe={setSelectedTimeframe}
                onRunAnalysis={runAnalysis}
                isAnalyzing={isAnalyzing}
                currentPrice={indicators.currentPrice || (candles.length > 0 ? candles[candles.length - 1].close : 0)}
                priceChangePercent={indicators.priceChangePercent24h}
                isLoadingPrice={isLoadingMarket && (!candles || candles.length === 0)}
                lastPriceUpdate={liveTickLastUpdated || marketLastUpdated}
              />
            )}

            {/* TAB: SIGNALS (Fast 1-Click Execution & 5 Core Pillars) */}
            {activeTab === "SIGNALS" && (
              <div className="space-y-4">
                <MarketChart
                  candles={candles}
                  indicators={indicators}
                  symbol={selectedAsset}
                  timeframe={selectedTimeframe}
                  isLiveUpdating={true}
                  optimizedConfig={analysis?.optimizedConfig}
                  lastTickTime={liveTickLastUpdated || marketLastUpdated}
                  priceFeedLabel={selectedAsset === "XAUUSD" || selectedAsset === "GOLD" ? "PAXG LIVE" : "LIVE TICK"}
                  livePrice={indicators.currentPrice}
                />
                <AnalysisCard
                  analysis={analysis}
                  isLoading={isAnalyzing}
                  onSendTelegram={handleSendTelegram}
                  isSendingTelegram={isSendingTelegram}
                  telegramStatus={telegramStatus}
                />
              </div>
            )}

            {/* TAB: CHART (Candlestick & Technical Indicator Workspace) */}
            {activeTab === "CHART" && (
              <div className="space-y-4">
                <MarketChart
                  candles={candles}
                  indicators={indicators}
                  symbol={selectedAsset}
                  timeframe={selectedTimeframe}
                  isLiveUpdating={true}
                  optimizedConfig={analysis?.optimizedConfig}
                  lastTickTime={liveTickLastUpdated || marketLastUpdated}
                  priceFeedLabel={selectedAsset === "XAUUSD" || selectedAsset === "GOLD" ? "PAXG LIVE" : "LIVE TICK"}
                  livePrice={indicators.currentPrice}
                />
              </div>
            )}

            {/* TAB: RADAR (15+ Asset Scanner) */}
            {activeTab === "RADAR" && (
              <div className="space-y-4">
                <MarketOpportunityRadar
                  summaries={scannerSummaries}
                  selectedAsset={selectedAsset}
                  onSelectAsset={(sym) => {
                    setSelectedAsset(sym);
                    setActiveTab("SIGNALS");
                  }}
                  isLoading={isLoadingScanner && scannerSummaries.length === 0}
                />
              </div>
            )}

            {/* TAB: NEWS (Macro Shield & Breaking News) */}
            {activeTab === "NEWS" && (
              <div className="space-y-4 max-w-4xl mx-auto">
                <NewsFeed
                  news={news}
                  isLoading={isLoadingNews}
                  selectedAsset={selectedAsset}
                  lastNewsTime={newsLastUpdated}
                />
              </div>
            )}

            {/* TAB: JOURNAL (Win-rate & PnL History) */}
            {activeTab === "JOURNAL" && (
              <div className="space-y-4">
                <SignalJournalCard />
              </div>
            )}
          </div>
        )}
      </main>

      {/* ─── MOBILE PWA BOTTOM NAVIGATION BAR (Precision Segmented Bottom Bar) ─── */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-[#0A0C10]/95 backdrop-blur-2xl border-t border-white/[0.08] md:hidden px-2 py-1.5 flex items-center justify-around shadow-2xl shadow-black pb-[max(0.5rem,env(safe-area-inset-bottom))]">
        <button
          onClick={() => setActiveTab("ALL")}
          className={`flex flex-col items-center gap-0.5 px-3 py-1 rounded-md transition-colors ${
            activeTab === "ALL"
              ? "text-white font-semibold bg-white/[0.1] border border-white/[0.15]"
              : "text-zinc-400 hover:text-white border border-transparent"
          }`}
        >
          <Layers className="w-4 h-4 text-blue-400" />
          <span className="text-[10px]">ทั้งหมด</span>
        </button>

        <button
          onClick={() => setActiveTab("SIGNALS")}
          className={`flex flex-col items-center gap-0.5 px-3 py-1 rounded-md transition-colors ${
            activeTab === "SIGNALS"
              ? "text-white font-semibold bg-white/[0.1] border border-white/[0.15]"
              : "text-zinc-400 hover:text-white border border-transparent"
          }`}
        >
          <Target className="w-4 h-4 text-blue-400" />
          <span className="text-[10px]">สัญญาณ</span>
        </button>

        <button
          onClick={() => setActiveTab("CHART")}
          className={`flex flex-col items-center gap-0.5 px-3 py-1 rounded-md transition-colors ${
            activeTab === "CHART"
              ? "text-white font-semibold bg-white/[0.1] border border-white/[0.15]"
              : "text-zinc-400 hover:text-white border border-transparent"
          }`}
        >
          <BarChart3 className="w-4 h-4 text-blue-400" />
          <span className="text-[10px]">กราฟ</span>
        </button>

        <button
          onClick={() => setActiveTab("RADAR")}
          className={`flex flex-col items-center gap-0.5 px-3 py-1 rounded-md transition-colors ${
            activeTab === "RADAR"
              ? "text-white font-semibold bg-white/[0.1] border border-white/[0.15]"
              : "text-zinc-400 hover:text-white border border-transparent"
          }`}
        >
          <Radio className="w-4 h-4 text-blue-400" />
          <span className="text-[10px]">เรดาร์</span>
        </button>

        <button
          onClick={() => setActiveTab("NEWS")}
          className={`flex flex-col items-center gap-0.5 px-3 py-1 rounded-md transition-colors ${
            activeTab === "NEWS"
              ? "text-white font-semibold bg-white/[0.1] border border-white/[0.15]"
              : "text-zinc-400 hover:text-white border border-transparent"
          }`}
        >
          <Newspaper className="w-4 h-4 text-blue-400" />
          <span className="text-[10px]">ข่าว</span>
        </button>

        <button
          onClick={() => setActiveTab("JOURNAL")}
          className={`flex flex-col items-center gap-0.5 px-3 py-1 rounded-md transition-colors ${
            activeTab === "JOURNAL"
              ? "text-white font-semibold bg-white/[0.1] border border-white/[0.15]"
              : "text-zinc-400 hover:text-white border border-transparent"
          }`}
        >
          <BookOpen className="w-4 h-4 text-blue-400" />
          <span className="text-[10px]">บันทึก</span>
        </button>
      </nav>

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

      {/* Visual FX & Background Studio Modal */}
      <BackgroundCustomizerModal
        isOpen={isBackgroundModalOpen}
        onClose={() => setIsBackgroundModalOpen(false)}
        currentTheme={bgTheme}
        onSelectTheme={handleSelectBgTheme}
        intensity={bgIntensity}
        onChangeIntensity={handleChangeIntensity}
        parallaxEnabled={parallaxEnabled}
        onToggleParallax={handleToggleParallax}
      />
    </div>
  );
}
