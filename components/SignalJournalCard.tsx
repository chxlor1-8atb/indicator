"use client";

import React, { useState, useEffect, useRef } from "react";
import { DbAiSignal, WinRateStats, PerSymbolStat, QuantitativeAnalytics, EquityPoint } from "@/lib/db";
import { AVAILABLE_ASSETS } from "@/lib/marketService";
import {
  Award,
  TrendingUp,
  CheckCircle2,
  XCircle,
  Clock,
  RefreshCw,
  ChevronRight,
  ShieldCheck,
  BarChart3,
  Filter,
  Zap,
  Database,
  Sparkles,
  Search,
  StopCircle,
  LineChart,
  Target,
  ArrowUpRight,
  ArrowDownRight,
  Activity,
} from "lucide-react";

export default function SignalJournalCard() {
  const [signals, setSignals] = useState<DbAiSignal[]>([]);
  const [stats, setStats] = useState<WinRateStats>({
    totalSignals: 0,
    resolvedCount: 0,
    winCount: 0,
    lossCount: 0,
    activeCount: 0,
    winRatePct: 0,
    netPips: 0,
  });
  const [analytics, setAnalytics] = useState<QuantitativeAnalytics | null>(null);
  const [viewTab, setViewTab] = useState<"ANALYTICS" | "PER_SYMBOL" | "TRADES">("ANALYTICS");
  const [hoveredPoint, setHoveredPoint] = useState<EquityPoint | null>(null);
  const [perSymbolStats, setPerSymbolStats] = useState<PerSymbolStat[]>([]);
  const [selectedSymbol, setSelectedSymbol] = useState<string>("ALL");
  const [isLoading, setIsLoading] = useState(false);
  const [isSeeding, setIsSeeding] = useState(false);
  const [seedMessage, setSeedMessage] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [lastSyncedTime, setLastSyncedTime] = useState<string | null>(null);
  const hasAutoTriggeredRef = useRef(false);
  const cancelScanRef = useRef(false);

  // ─── Chunked Batch Scanning State (Eliminates Vercel Serverless 504 Timeout) ───
  const [scanProgress, setScanProgress] = useState<{
    current: number;
    total: number;
    percent: number;
    currentSymbols: string;
    totalTrades: number;
    savedTrades: number;
  } | null>(null);

  const handleCancelScan = () => {
    cancelScanRef.current = true;
    setSeedMessage("⚠️ กำลังหยุดการสแกนหลังจากแบทช์นี้เสร็จสิ้น...");
  };

  const handleSeed500Candles = async (category = "all", resetPrevious = true) => {
    setIsSeeding(true);
    cancelScanRef.current = false;

    let targetAssets = AVAILABLE_ASSETS;
    if (category === "forex") {
      targetAssets = AVAILABLE_ASSETS.filter((a) => a.category === "forex");
    } else if (category === "core") {
      targetAssets = AVAILABLE_ASSETS.filter((a) =>
        ["XAUUSD", "EURUSD", "GBPUSD", "USDJPY", "BTCUSDT", "USOIL"].includes(a.symbol)
      );
    }

    const allSymbols = targetAssets.map((a) => a.symbol);
    const CHUNK_SIZE = 3; // 3 symbols per chunk ensures each request finishes in ~1.5s, far below 10s timeout
    const chunks: string[][] = [];
    for (let i = 0; i < allSymbols.length; i += CHUNK_SIZE) {
      chunks.push(allSymbols.slice(i, i + CHUNK_SIZE));
    }

    setScanProgress({
      current: 0,
      total: allSymbols.length,
      percent: 0,
      currentSymbols: chunks[0]?.join(", ") || "",
      totalTrades: 0,
      savedTrades: 0,
    });

    setSeedMessage(
      `⏳ เริ่มต้นสแกน ${allSymbols.length} คู่เงินแบบ Safe-Batch (${chunks.length} แบทช์ย่อย ปลอดภัยจาก Vercel Timeout)...`
    );

    let accumulatedSaved = 0;
    let accumulatedTrades = 0;
    let processedSymbols = 0;

    try {
      for (let cIdx = 0; cIdx < chunks.length; cIdx++) {
        if (cancelScanRef.current) {
          setSeedMessage(`⚠️ สแกนหยุดชั่วคราว: ประมวลผลไปแล้ว ${processedSymbols}/${allSymbols.length} คู่เงิน`);
          break;
        }

        const chunk = chunks[cIdx];
        const isFirstChunk = cIdx === 0;

        setScanProgress({
          current: processedSymbols,
          total: allSymbols.length,
          percent: Math.round((processedSymbols / allSymbols.length) * 100),
          currentSymbols: chunk.join(", "),
          totalTrades: accumulatedTrades,
          savedTrades: accumulatedSaved,
        });

        const res = await fetch("/api/backtest", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "seed-batch",
            symbols: chunk,
            timeframe: "1h",
            resetPrevious: isFirstChunk && resetPrevious,
          }),
        });

        if (res.ok) {
          const data = await res.json();
          if (data.success) {
            accumulatedSaved += data.totalSaved || 0;
            accumulatedTrades += data.totalTradesGenerated || 0;
          }
        } else {
          console.warn(`Batch ${cIdx + 1} returned status ${res.status}`);
        }

        processedSymbols += chunk.length;
        setScanProgress({
          current: Math.min(processedSymbols, allSymbols.length),
          total: allSymbols.length,
          percent: Math.min(100, Math.round((processedSymbols / allSymbols.length) * 100)),
          currentSymbols: chunk.join(", "),
          totalTrades: accumulatedTrades,
          savedTrades: accumulatedSaved,
        });

        // Small yield to allow UI to breathe
        await new Promise((r) => setTimeout(r, 60));
      }

      if (!cancelScanRef.current) {
        setSeedMessage(
          `✅ สแกนสำเร็จครบถ้วน ${processedSymbols} คู่เงิน! สร้าง ${accumulatedTrades} trades บันทึกลง Neon DB ใหม่ ${accumulatedSaved} trades`
        );
      }
      await fetchSignals(selectedSymbol !== "ALL" ? selectedSymbol : undefined);
    } catch (err) {
      setSeedMessage(`❌ เกิดข้อผิดพลาดระหว่างสแกน: ${err}`);
    } finally {
      setIsSeeding(false);
      setTimeout(() => {
        setScanProgress(null);
        setSeedMessage(null);
      }, 10000);
    }
  };

  const fetchSignals = async (symbol?: string) => {
    setIsLoading(true);
    try {
      const url = symbol && symbol !== "ALL" ? `/api/signals?symbol=${symbol}` : "/api/signals";
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setSignals(data.signals || []);
          setStats(data.stats);
          if (data.analytics) setAnalytics(data.analytics);
          const now = new Date();
          setLastSyncedTime(
            now.toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit", second: "2-digit" })
          );
          if (data.perSymbolStats) {
            setPerSymbolStats(data.perSymbolStats);
            // Auto-trigger initial backtest sync if database has 0 historical statistics
            if (data.perSymbolStats.length === 0 && !hasAutoTriggeredRef.current) {
              hasAutoTriggeredRef.current = true;
              handleSeed500Candles("core", false);
            }
          }
        }
      }
    } catch (err) {
      console.warn("Failed to fetch signal journal:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSignals(selectedSymbol !== "ALL" ? selectedSymbol : undefined);
    // Real-time continuous polling every 20s to ensure win rates in Neon are always up-to-date
    const interval = setInterval(() => {
      fetchSignals(selectedSymbol !== "ALL" ? selectedSymbol : undefined);
    }, 20000);
    return () => clearInterval(interval);
  }, [selectedSymbol]);

  const formatJournalPrice = (price: number | string, sym: string) => {
    const num = Number(price);
    if (isNaN(num)) return "0.00";
    const s = sym.toUpperCase();
    const precision = s.includes("JPY")
      ? 2
      : ["EUR", "GBP", "AUD", "NZD", "USD", "CAD", "CHF"].some(c => s.startsWith(c) || s.endsWith(c))
      ? 4
      : ["XRP", "ADA", "DOGE", "SUI"].some(c => s.startsWith(c))
      ? 4
      : num < 10 && num > 0
      ? 4
      : 2;
    if (num >= 1000) return num.toLocaleString(undefined, { minimumFractionDigits: precision, maximumFractionDigits: precision });
    return num.toFixed(precision);
  };

  const getStatusBadge = (status: DbAiSignal["status"], pnl: number) => {
    switch (status) {
      case "HIT_TP2":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
            <span>ชน TP2 (+{pnl} pips)</span>
          </span>
        );
      case "HIT_TP1":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
            <span>ชน TP1 (+{pnl} pips)</span>
          </span>
        );
      case "HIT_SL":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/15 text-rose-400 border border-rose-500/30">
            <XCircle className="w-3 h-3 text-rose-400" />
            <span>ชน SL ({pnl} pips)</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30">
            <Clock className="w-3 h-3 text-amber-400" />
            <span>เปิดรอราคา (ACTIVE)</span>
          </span>
        );
    }
  };

  const renderEquityCurve = () => {
    const points = analytics?.equityCurve || [];
    if (points.length <= 1) {
      return (
        <div className="p-8 rounded-xl bg-surface-50 border border-slate-800 text-center space-y-2">
          <LineChart className="w-8 h-8 text-indigo-400 mx-auto animate-pulse" />
          <p className="text-xs text-slate-300 font-semibold">กำลังสะสมข้อมูลเพื่อวาดกราฟ Equity Curve...</p>
          <p className="text-[11px] text-slate-500 max-w-sm mx-auto">
            เมื่อระบบมีประวัติออเดอร์ปิดผล (Closed Trades) กราฟเส้นการเติบโตสะสมและสถิติเชิงลึกจะปรากฏขึ้นอัตโนมัติ
          </p>
        </div>
      );
    }

    const values = points.map((p) => p.cumulativePips);
    const minVal = Math.min(0, ...values);
    const maxVal = Math.max(10, ...values);
    const valRange = maxVal - minVal || 1;

    const width = 640;
    const height = 180;
    const padLeft = 45;
    const padRight = 20;
    const padTop = 20;
    const padBottom = 25;

    const plotW = width - padLeft - padRight;
    const plotH = height - padTop - padBottom;

    const getX = (i: number) => padLeft + (i / (points.length - 1)) * plotW;
    const getY = (val: number) => padTop + (1 - (val - minVal) / valRange) * plotH;

    const zeroY = getY(0);

    const linePath = points
      .map((p, i) => `${i === 0 ? "M" : "L"} ${getX(i).toFixed(1)} ${getY(p.cumulativePips).toFixed(1)}`)
      .join(" ");
    const areaPath = `${linePath} L ${getX(points.length - 1).toFixed(1)} ${getY(minVal).toFixed(1)} L ${getX(0).toFixed(1)} ${getY(minVal).toFixed(1)} Z`;

    const lastPoint = points[points.length - 1];
    const isPositive = (lastPoint?.cumulativePips ?? 0) >= 0;
    const peakVal = Math.max(...values);
    const peakIndex = values.indexOf(peakVal);

    return (
      <div className="space-y-3">
        {/* Chart Card */}
        <div className="p-3 sm:p-4 rounded-xl bg-surface-50 border border-slate-800 space-y-2 relative">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-white flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-emerald-400" />
                <span>Cumulative Equity Curve (การเติบโตของพอร์ตสะสม)</span>
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                {points.length - 1} Closed Trades
              </span>
            </div>
            <div className="flex items-center gap-3 text-[11px] font-mono">
              <span className="text-slate-400">Peak ATH: <strong className="text-emerald-400">+{peakVal} pips</strong></span>
              <span className="text-slate-400">สุทธิ: <strong className={isPositive ? "text-emerald-300" : "text-rose-400"}>{lastPoint?.cumulativePips > 0 ? `+${lastPoint?.cumulativePips}` : lastPoint?.cumulativePips} pips</strong></span>
            </div>
          </div>

          {/* SVG Curve */}
          <div className="relative w-full overflow-hidden">
            <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto overflow-visible select-none">
              <defs>
                <linearGradient id="equityGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10b981" stopOpacity="0.35" />
                  <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
                </linearGradient>
              </defs>

              {/* Zero Breakeven Line */}
              {zeroY >= padTop && zeroY <= height - padBottom && (
                <>
                  <line
                    x1={padLeft}
                    y1={zeroY}
                    x2={width - padRight}
                    y2={zeroY}
                    stroke="#475569"
                    strokeDasharray="4 4"
                    strokeWidth="1"
                  />
                  <text x={padLeft - 6} y={zeroY + 3} textAnchor="end" fill="#64748b" fontSize="9" fontFamily="monospace">0</text>
                </>
              )}

              {/* Max / Min Y Axis Labels */}
              <text x={padLeft - 6} y={getY(maxVal) + 4} textAnchor="end" fill="#10b981" fontSize="9" fontFamily="monospace">+{maxVal.toFixed(0)}</text>
              {minVal < 0 && (
                <text x={padLeft - 6} y={getY(minVal) - 2} textAnchor="end" fill="#f43f5e" fontSize="9" fontFamily="monospace">{minVal.toFixed(0)}</text>
              )}

              {/* Area Fill */}
              <path d={areaPath} fill="url(#equityGrad)" />

              {/* Main Line */}
              <path d={linePath} fill="none" stroke={isPositive ? "#34d399" : "#fb7185"} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />

              {/* Peak Milestone Dot */}
              {peakIndex > 0 && (
                <circle
                  cx={getX(peakIndex)}
                  cy={getY(peakVal)}
                  r="4.5"
                  fill="#10b981"
                  stroke="#022c22"
                  strokeWidth="2"
                />
              )}

              {/* Interactive Circles */}
              {points.map((p, i) => {
                if (i === 0) return null;
                const cx = getX(i);
                const cy = getY(p.cumulativePips);
                const isWin = p.pnlPips > 0;
                const isHovered = hoveredPoint?.index === p.index;

                return (
                  <g key={i}>
                    <circle
                      cx={cx}
                      cy={cy}
                      r={isHovered ? 5 : 2.5}
                      fill={isWin ? "#34d399" : p.pnlPips < 0 ? "#f87171" : "#94a3b8"}
                      stroke="#0f172a"
                      strokeWidth="1.5"
                      className="cursor-pointer transition-all"
                      onMouseEnter={() => setHoveredPoint(p)}
                      onMouseLeave={() => setHoveredPoint(null)}
                    />
                    <circle
                      cx={cx}
                      cy={cy}
                      r={12}
                      fill="transparent"
                      className="cursor-pointer"
                      onMouseEnter={() => setHoveredPoint(p)}
                      onMouseLeave={() => setHoveredPoint(null)}
                    />
                  </g>
                );
              })}
            </svg>

            {/* Hover Tooltip Float */}
            {hoveredPoint && (
              <div className="absolute top-2 right-2 p-2.5 rounded-lg bg-surface-100/95 border border-indigo-500/40 shadow-xl text-[10px] font-mono pointer-events-none space-y-0.5 animate-fadeIn z-10 backdrop-blur-sm">
                <div className="flex items-center justify-between gap-3 border-b border-slate-800 pb-1">
                  <span className="font-bold text-white flex items-center gap-1">
                    <span>Trade #{hoveredPoint.index}</span>
                    <span className="px-1 py-0.2 rounded bg-slate-800 text-indigo-300 font-bold">{hoveredPoint.symbol}</span>
                  </span>
                  <span className={hoveredPoint.pnlPips >= 0 ? "text-emerald-400 font-bold" : "text-rose-400 font-bold"}>
                    {hoveredPoint.pnlPips >= 0 ? `+${hoveredPoint.pnlPips}` : hoveredPoint.pnlPips} pips
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3 text-slate-400 pt-0.5">
                  <span>กำไรสะสม ณ จุดนี้:</span>
                  <span className="font-bold text-emerald-300">{hoveredPoint.cumulativePips >= 0 ? `+${hoveredPoint.cumulativePips}` : hoveredPoint.cumulativePips} pips</span>
                </div>
                <div className="text-[9px] text-slate-500 text-right">{hoveredPoint.time}</div>
              </div>
            )}
          </div>
        </div>

        {/* 6 Quantitative Fund KPI Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 text-center">
          {/* 1. Profit Factor */}
          <div className="p-2.5 rounded-xl bg-surface-50 border border-slate-800 space-y-0.5">
            <span className="text-[10px] text-slate-400 block font-medium">Profit Factor (PF)</span>
            <span className="text-base font-mono font-black text-emerald-400 block">
              {analytics?.profitFactor ?? 0}
            </span>
            <span className="text-[9px] text-slate-500 font-mono block">เป้าหมาย &gt; 1.80</span>
          </div>

          {/* 2. Max Drawdown */}
          <div className="p-2.5 rounded-xl bg-surface-50 border border-slate-800 space-y-0.5">
            <span className="text-[10px] text-slate-400 block font-medium">Max Drawdown</span>
            <span className="text-base font-mono font-black text-rose-400 block">
              -{analytics?.maxDrawdownPips ?? 0} <span className="text-[10px] font-sans text-slate-500 font-normal">pips</span>
            </span>
            <span className="text-[9px] text-slate-500 font-mono block">DD: {analytics?.maxDrawdownPct ?? 0}%</span>
          </div>

          {/* 3. Realized R:R */}
          <div className="p-2.5 rounded-xl bg-surface-50 border border-slate-800 space-y-0.5">
            <span className="text-[10px] text-slate-400 block font-medium">Realized R:R</span>
            <span className="text-base font-mono font-black text-indigo-300 block">
              1 : {analytics?.realizedRR ?? 0}
            </span>
            <span className="text-[9px] text-slate-500 font-mono block">กำไรเฉลี่ย vs ขาดทุน</span>
          </div>

          {/* 4. Win / Loss Streak */}
          <div className="p-2.5 rounded-xl bg-surface-50 border border-slate-800 space-y-0.5">
            <span className="text-[10px] text-slate-400 block font-medium">สถิติชนะติดกัน</span>
            <span className="text-base font-mono font-black text-emerald-300 block">
              {analytics?.winStreak ?? 0} <span className="text-[10px] font-sans text-slate-500 font-normal">ไม้รวด</span>
            </span>
            <span className="text-[9px] text-slate-500 font-mono block">แพ้ติดกัน: {analytics?.lossStreak ?? 0} ไม้</span>
          </div>

          {/* 5. Recovery Factor */}
          <div className="p-2.5 rounded-xl bg-surface-50 border border-slate-800 space-y-0.5">
            <span className="text-[10px] text-slate-400 block font-medium">Recovery Factor</span>
            <span className="text-base font-mono font-black text-cyan-400 block">
              {analytics?.recoveryFactor ?? 0}
            </span>
            <span className="text-[9px] text-slate-500 font-mono block">ความเร็วฟื้นตัว</span>
          </div>

          {/* 6. Best Performing Asset */}
          <div className="p-2.5 rounded-xl bg-surface-50 border border-slate-800 space-y-0.5">
            <span className="text-[10px] text-slate-400 block font-medium">Best Asset (อันดับ 1)</span>
            <span className="text-base font-mono font-black text-amber-300 block truncate">
              {analytics?.bestAsset ? analytics.bestAsset.symbol : "—"}
            </span>
            <span className="text-[9px] text-slate-500 font-mono block truncate">
              {analytics?.bestAsset ? `+${analytics.bestAsset.netPips} pips (${analytics.bestAsset.winRatePct}%)` : "รอข้อมูล"}
            </span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="bg-surface-100 border border-slate-800 rounded-2xl p-4 shadow-sm space-y-3.5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <Award className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white flex items-center gap-2 flex-wrap">
              <span>AI Trade Journal & Real Win-Rate Tracker</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                Neon Postgres
              </span>
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                <span>Live Realtime Sync</span>
              </span>
            </h3>
            <p className="text-[11px] text-slate-400">
              บันทึกประวัติสัญญาณเทรดจริง & ตรวจสอบผลลัพธ์ย้อนหลังอย่างโปร่งใส (อัปเดตอัตโนมัติตลอดเวลา)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {lastSyncedTime && (
            <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-surface-50 border border-slate-800 text-[10.5px] font-mono text-slate-300">
              <Clock className="w-3 h-3 text-slate-400" />
              <span>ซิงค์ล่าสุด: {lastSyncedTime}</span>
            </span>
          )}

          <button
            onClick={() => fetchSignals(selectedSymbol !== "ALL" ? selectedSymbol : undefined)}
            disabled={isLoading}
            className="p-1.5 rounded-lg bg-surface-50 hover:bg-slate-800 border border-slate-700 text-slate-400 hover:text-white transition-all text-xs flex items-center gap-1"
            title="รีเฟรชข้อมูลล่าสุด"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin text-brand-blue" : ""}`} />
            <span className="hidden xs:inline text-[11px]">อัปเดต</span>
          </button>
        </div>
      </div>

      {/* 4 Performance KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-center">
        {/* 1. Win Rate */}
        <div className="p-2.5 rounded-xl bg-surface-50 border border-slate-800 space-y-0.5">
          <span className="text-[10px] text-slate-400 block font-medium">Win Rate สะสม</span>
          <span className="text-base sm:text-lg font-mono font-black text-emerald-400 block">
            {stats.resolvedCount > 0 ? `${stats.winRatePct}%` : "0.0%"}
          </span>
          <span className="text-[10px] text-slate-500 font-mono block truncate">
            {stats.resolvedCount > 0 ? "เป้าสถาบัน > 75%" : stats.activeCount > 0 ? `รอสรุปผล (${stats.activeCount} ไม้เปิด)` : "ยังไม่มีไม้ที่ปิดผล"}
          </span>
        </div>

        {/* 2. Total PnL Pips */}
        <div className="p-2.5 rounded-xl bg-surface-50 border border-slate-800 space-y-0.5">
          <span className="text-[10px] text-slate-400 block font-medium">กำไรสุทธิสะสม</span>
          <span className={`text-base sm:text-lg font-mono font-black block ${stats.netPips >= 0 ? "text-emerald-300" : "text-rose-400"}`}>
            {stats.netPips >= 0 ? `+${stats.netPips}` : stats.netPips} <span className="text-xs font-sans text-slate-400 font-normal">pips</span>
          </span>
          <span className="text-[10px] text-slate-500 font-mono block truncate">
            (Pips สะสมจริง)
          </span>
        </div>

        {/* 3. Win / Loss Count */}
        <div className="p-2.5 rounded-xl bg-surface-50 border border-slate-800 space-y-0.5">
          <span className="text-[10px] text-slate-400 block font-medium">สถิติ ชนะ / แพ้</span>
          <span className="text-base sm:text-lg font-mono font-black text-slate-100 block">
            <span className="text-emerald-400">{stats.winCount}</span>
            <span className="text-slate-500 mx-1">/</span>
            <span className="text-rose-400">{stats.lossCount}</span>
          </span>
          <span className="text-[10px] text-slate-500 font-mono block truncate">
            จากทั้งหมด {stats.totalSignals} ไม้
          </span>
        </div>

        {/* 4. Active Signals */}
        <div className="p-2.5 rounded-xl bg-surface-50 border border-slate-800 space-y-0.5">
          <span className="text-[10px] text-slate-400 block font-medium">ออเดอร์เปิดอยู่</span>
          <span className="text-base sm:text-lg font-mono font-black text-amber-300 block">
            {stats.activeCount}
          </span>
          <span className="text-[10px] text-slate-500 font-mono block truncate">
            (Active Signals)
          </span>
        </div>
      </div>

      {/* ─── 500-Candle Historical Seeder Action Bar ─── */}
      <div className="p-3 rounded-xl bg-gradient-to-r from-indigo-950/40 via-surface-50 to-purple-950/30 border border-indigo-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        <div className="space-y-0.5">
          <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            <span>ดึงข้อมูลย้อนหลัง 500 แท่ง & บันทึก Win Rate ทุกคู่เงินลง Database</span>
          </h4>
          <p className="text-[10px] text-slate-400">
            จำลองระบบเทรดย้อนหลัง 500 แท่งเทียนจริง และบันทึกประวัติ Trades ทุกคู่เงินลง Neon Postgres ถาวร
          </p>
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            onClick={() => handleSeed500Candles("forex")}
            disabled={isSeeding}
            className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold text-[10px] transition-all flex items-center gap-1 shadow-md active:scale-95 cursor-pointer"
          >
            {isSeeding ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Zap className="w-3 h-3 text-amber-300" />}
            <span>สแกน Forex 39 คู่ (500 แท่ง)</span>
          </button>

          <button
            onClick={() => handleSeed500Candles("all")}
            disabled={isSeeding}
            className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 disabled:opacity-50 text-white font-bold text-[10px] transition-all flex items-center gap-1 shadow-md active:scale-95 cursor-pointer"
          >
            {isSeeding ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Database className="w-3 h-3 text-cyan-300" />}
            <span>สแกนทุกหมวด (73 คู่เงิน)</span>
          </button>
        </div>
      </div>

      {/* ─── Client-Driven Chunked Batch Progress Bar (Vercel Serverless Safe) ─── */}
      {scanProgress && (
        <div className="p-3.5 rounded-xl bg-gradient-to-r from-indigo-950/80 via-surface-100 to-purple-950/70 border border-indigo-500/50 space-y-2.5 animate-fadeIn shadow-lg">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
            <span className="font-bold text-white flex items-center gap-2">
              <RefreshCw className="w-4 h-4 animate-spin text-cyan-400 shrink-0" />
              <span>
                กำลังสแกนแบทช์ย่อย: <span className="font-mono text-cyan-300 font-black">{scanProgress.currentSymbols}</span>
              </span>
            </span>
            <div className="flex items-center gap-2">
              <span className="font-mono font-bold text-indigo-300 text-xs px-2 py-0.5 rounded-md bg-indigo-500/20 border border-indigo-500/30">
                {scanProgress.percent}% ({scanProgress.current}/{scanProgress.total} คู่เงิน)
              </span>
              <button
                onClick={handleCancelScan}
                className="px-2.5 py-1 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 text-[11px] font-bold flex items-center gap-1 transition-all active:scale-95"
                title="หยุดการสแกนชั่วคราว"
              >
                <StopCircle className="w-3.5 h-3.5" />
                <span>ยกเลิก</span>
              </button>
            </div>
          </div>

          {/* Animated Gradient Progress Bar */}
          <div className="w-full h-3 bg-slate-900/90 rounded-full overflow-hidden p-0.5 border border-slate-700/80 shadow-inner">
            <div
              className="h-full rounded-full bg-gradient-to-r from-indigo-500 via-cyan-400 to-emerald-400 transition-all duration-300 shadow-sm shadow-cyan-500/50"
              style={{ width: `${Math.max(4, scanProgress.percent)}%` }}
            />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 text-[10.5px] text-slate-400">
            <span className="flex items-center gap-1.5">
              <span>Trades ที่สร้างสะสม:</span>
              <span className="font-mono text-amber-300 font-black">{scanProgress.totalTrades.toLocaleString()}</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span>บันทึก Neon DB สำเร็จ:</span>
              <span className="font-mono text-emerald-400 font-black">{scanProgress.savedTrades.toLocaleString()}</span>
            </span>
            <span className="text-[10px] text-slate-500 font-mono">⚡ ป้องกัน Vercel 504 Timeout ด้วย Chunked Sub-batches</span>
          </div>
        </div>
      )}

      {/* Seeder Status Message */}
      {seedMessage && (
        <div className="p-2.5 rounded-xl bg-indigo-950/60 border border-indigo-500/40 text-[11px] text-indigo-200 flex items-center gap-2 animate-fadeIn">
          <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
          <span className="font-medium">{seedMessage}</span>
        </div>
      )}

      {/* 3-View Tab Navigation */}
      <div className="flex items-center gap-1.5 p-1 bg-surface-50 rounded-xl border border-slate-800 text-xs overflow-x-auto scrollbar-none">
        <button
          onClick={() => setViewTab("ANALYTICS")}
          className={`px-3 py-1.5 rounded-lg font-semibold transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
            viewTab === "ANALYTICS"
              ? "bg-indigo-600 text-white shadow-md shadow-indigo-500/20"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <LineChart className="w-3.5 h-3.5 text-emerald-400" />
          <span>📈 Equity Curve & สถิติสถาบัน</span>
        </button>

        <button
          onClick={() => setViewTab("PER_SYMBOL")}
          className={`px-3 py-1.5 rounded-lg font-semibold transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
            viewTab === "PER_SYMBOL"
              ? "bg-indigo-600 text-white shadow-md shadow-indigo-500/20"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <BarChart3 className="w-3.5 h-3.5 text-indigo-300" />
          <span>📋 สถิติแยกตามคู่เงิน ({perSymbolStats.length} คู่)</span>
        </button>

        <button
          onClick={() => setViewTab("TRADES")}
          className={`px-3 py-1.5 rounded-lg font-semibold transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
            viewTab === "TRADES"
              ? "bg-indigo-600 text-white shadow-md shadow-indigo-500/20"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <Clock className="w-3.5 h-3.5 text-amber-400" />
          <span>📝 ประวัติออเดอร์ ({signals.length})</span>
        </button>
      </div>

      {/* VIEW 1: Interactive Visual Equity Curve & Quant Fund Analytics */}
      {viewTab === "ANALYTICS" && renderEquityCurve()}

      {/* VIEW 2: Per-Symbol Win Rate Breakdown Section */}
      {viewTab === "PER_SYMBOL" && (
        perSymbolStats.length === 0 ? (
        isSeeding ? (
          <div className="p-4 rounded-xl bg-surface-50 border border-indigo-500/30 text-center space-y-2 animate-pulse">
            <div className="w-8 h-8 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 flex items-center justify-center mx-auto">
              <RefreshCw className="w-4 h-4 animate-spin text-indigo-400" />
            </div>
            <h5 className="text-xs font-bold text-white">กำลังซิงค์สถิติย้อนหลัง 500 แท่งให้อัตโนมัติ...</h5>
            <p className="text-[11px] text-slate-400 max-w-md mx-auto">
              ระบบกำลังประมวลผลย้อนหลัง 500 แท่งและบันทึกประวัติ Win Rate ลงระบบอัตโนมัติในพื้นหลัง
            </p>
          </div>
        ) : (
          <div className="p-4 rounded-xl bg-surface-50 border border-slate-800 text-center space-y-2">
            <div className="w-8 h-8 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 flex items-center justify-center mx-auto">
              <Database className="w-4 h-4" />
            </div>
            <h5 className="text-xs font-bold text-white">กำลังเตรียมข้อมูลสถิติย้อนหลัง...</h5>
            <p className="text-[11px] text-slate-400 max-w-md mx-auto">
              ระบบกำลังดึงข้อมูลสถิติ หรือกดปุ่ม <strong>&quot;สแกน Forex 39 คู่&quot;</strong> ด้านบนเพื่อซิงค์ทันที
            </p>
          </div>
        )
      ) : (
        <div className="space-y-3">
          {/* Category Filter Tabs & Search */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
              {[
                { id: "all", label: "All Assets" },
                { id: "forex", label: "Forex (39 Pairs)" },
                { id: "commodities", label: "Gold & Commodities" },
                { id: "crypto", label: "Crypto" },
                { id: "stocks", label: "Indices & Stocks" },
              ].map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id)}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-medium whitespace-nowrap transition-all border ${
                    activeCategory === cat.id
                      ? "bg-indigo-600 text-white border-indigo-500 shadow-sm font-bold"
                      : "bg-surface-50 text-slate-400 border-slate-700 hover:text-white"
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            {/* Quick Search Input */}
            <div className="relative">
              <Search className="w-3 h-3 text-slate-400 absolute left-2 top-2" />
              <input
                type="text"
                placeholder="ค้นหาคู่เงิน (เช่น EUR, XAU, JPY)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-6 pr-2.5 py-1 bg-surface-50 border border-slate-700 rounded-lg text-[10px] text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 w-full sm:w-48"
              />
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto rounded-xl border border-slate-800">
            <table className="w-full text-[10px] font-mono">
              <thead>
                <tr className="bg-surface-50 text-slate-400 border-b border-slate-800">
                  <th className="px-2.5 py-2 text-left font-semibold">คู่เงิน (Symbol)</th>
                  <th className="px-2 py-2 text-center font-semibold" title="จำนวนออเดอร์ที่เกิดขึ้นจริงจากการสแกนย้อนหลัง 500 แท่งเทียน">ออเดอร์ (จาก 500 แท่ง)</th>
                  <th className="px-2 py-2 text-center font-semibold">ชนะ</th>
                  <th className="px-2 py-2 text-center font-semibold">แพ้</th>
                  <th className="px-2 py-2 text-center font-semibold">Win Rate</th>
                  <th className="px-2 py-2 text-right font-semibold">กำไร (pips)</th>
                  <th className="px-2 py-2 text-center font-semibold">Live</th>
                  <th className="px-2 py-2 text-center font-semibold">BT</th>
                </tr>
              </thead>
              <tbody>
                {perSymbolStats
                  .filter((ps) => {
                    const matchCategory = activeCategory === "all" || ps.category === activeCategory;
                    const q = searchQuery.toLowerCase();
                    const matchSearch = !q || ps.symbol.toLowerCase().includes(q) || (ps.name && ps.name.toLowerCase().includes(q));
                    return matchCategory && matchSearch;
                  })
                  .map((ps) => (
                    <tr
                      key={ps.symbol}
                      className={`border-b border-slate-800/50 hover:bg-slate-800/40 transition-colors cursor-pointer ${
                        selectedSymbol === ps.symbol ? "bg-indigo-500/15" : ""
                      }`}
                      onClick={() => { setSelectedSymbol(ps.symbol); fetchSignals(ps.symbol); }}
                    >
                      <td className="px-2.5 py-2 text-white font-bold">
                        <div className="flex items-center gap-1.5">
                          <span>{ps.symbol}</span>
                          {ps.category && (
                            <span className="text-[8px] font-normal px-1 py-0.2 rounded bg-surface-50 text-slate-400 border border-slate-700 uppercase">
                              {ps.category === "forex" ? "FX" : ps.category === "crypto" ? "CRYPTO" : ps.category === "commodities" ? "GOLD" : "STOCK"}
                            </span>
                          )}
                        </div>
                        {ps.name && <span className="text-[9px] text-slate-500 font-normal block truncate max-w-[140px]">{ps.name}</span>}
                      </td>
                      <td className="px-2 py-2 text-center text-slate-300 font-medium">{ps.totalTrades} ไม้</td>
                      <td className="px-2 py-2 text-center text-emerald-400 font-bold">{ps.wins}</td>
                      <td className="px-2 py-2 text-center text-rose-400 font-bold">{ps.losses}</td>
                      <td className="px-2 py-2 text-center">
                        <span className={`font-black ${
                          ps.winRatePct >= 75 ? "text-emerald-400" :
                          ps.winRatePct >= 50 ? "text-amber-400" : "text-rose-400"
                        }`}>
                          {ps.winRatePct}%
                        </span>
                      </td>
                      <td className={`px-2 py-2 text-right font-bold ${ps.netPips >= 0 ? "text-emerald-300" : "text-rose-400"}`}>
                        {ps.netPips >= 0 ? `+${ps.netPips}` : ps.netPips}
                      </td>
                      <td className="px-2 py-2 text-center">
                        <span className="px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 text-[9px]">
                          {ps.liveTrades}
                        </span>
                      </td>
                      <td className="px-2 py-2 text-center">
                        <span className="px-1.5 py-0.5 rounded bg-violet-500/10 text-violet-300 border border-violet-500/20 text-[9px]">
                          {ps.backtestTrades}
                        </span>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}

      {/* VIEW 3: Recent Recorded Signals List */}
      {viewTab === "TRADES" && (
        <div className="space-y-2">
          <span className="text-[11px] font-semibold text-slate-400 block">
            ประวัติสัญญาณล่าสุดที่บันทึกลง Database:
          </span>

          {signals.length === 0 ? (
            <div className="p-6 rounded-xl bg-surface-50 border border-slate-800/80 text-center space-y-1.5 text-xs text-slate-400">
              <ShieldCheck className="w-6 h-6 text-indigo-400 mx-auto opacity-70" />
              <p className="font-semibold text-slate-300">ฐานข้อมูล Neon พร้อมทำงานเรียบร้อยแล้ว</p>
              <p className="text-[11px] text-slate-500">
                เมื่อระบบตรวจพบสัญญาณเทรดที่เข้าเงื่อนไข (Grade A หรือ B+) สัญญาณจะถูกบันทึกและวัดผลอัตโนมัติที่นี่ครับ
              </p>
            </div>
          ) : (
            <div className="space-y-1.5 max-h-[340px] overflow-y-auto pr-1">
              {signals.map((sig) => (
                <div
                  key={sig.id}
                  className="p-2.5 rounded-xl bg-surface-50 hover:bg-slate-800/60 border border-slate-800/80 transition-all flex flex-wrap items-center justify-between gap-2"
                >
                  {/* Left info */}
                  <div className="flex items-center gap-2.5">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-black font-mono ${
                      sig.action === "BUY"
                        ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                        : "bg-rose-500/20 text-rose-300 border border-rose-500/40"
                    }`}>
                      {sig.action}
                    </span>

                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-white font-mono">{sig.symbol}</span>
                        <span className="text-[10px] text-slate-400 font-mono">({sig.timeframe})</span>
                        <span className="text-[10px] font-bold text-slate-300 px-1.5 py-0.2 rounded bg-surface-100 border border-slate-700">
                          {sig.order_type}
                        </span>
                      </div>

                      <div className="text-[10px] text-slate-400 font-mono flex items-center gap-2 mt-0.5">
                        <span>เข้า: <strong className="text-amber-300">{formatJournalPrice(sig.entry_price, sig.symbol)}</strong></span>
                        <span>SL: <strong className="text-rose-400">{formatJournalPrice(sig.stop_loss, sig.symbol)}</strong></span>
                        <span>TP1: <strong className="text-emerald-400">{formatJournalPrice(sig.take_profit1, sig.symbol)}</strong></span>
                      </div>
                    </div>
                  </div>

                  {/* Right status */}
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-surface-100 border border-slate-700 text-slate-300">
                      {sig.setup_grade}
                    </span>
                    {getStatusBadge(sig.status, Number(sig.pnl_pips))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
