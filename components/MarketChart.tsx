"use client";

import React, { useRef, useEffect, useState } from "react";
import { Candle, IndicatorData, OptimizedConfig } from "@/lib/types";
import { BarChart2, Activity, Zap, TrendingUp, Compass, Layers } from "lucide-react";

interface MarketChartProps {
  candles: Candle[];
  indicators: IndicatorData;
  symbol: string;
  timeframe: string;
  isLiveUpdating?: boolean;
  optimizedConfig?: OptimizedConfig;
}

export default function MarketChart({
  candles,
  indicators,
  symbol,
  timeframe,
  optimizedConfig,
}: MarketChartProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const [showSuperTrend, setShowSuperTrend] = useState(true);
  const [showBollinger, setShowBollinger] = useState(true);
  const [showEMA, setShowEMA] = useState(true);
  const [showSR, setShowSR] = useState(true);
  const [showRSI, setShowRSI] = useState(true);

  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(null);

  const emaFastLabel = optimizedConfig ? `EMA ${optimizedConfig.emaFast}` : "EMA 20";
  const emaSlowLabel = optimizedConfig ? `EMA ${optimizedConfig.emaSlow}` : "EMA 50";

  // Redraw canvas on data or setting changes with requestAnimationFrame & buffer caching
  useEffect(() => {
    let animId: number;

    const render = () => {
      const canvas = canvasRef.current;
      if (!canvas || candles.length === 0) return;

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      // High DPI - only resize buffer if dimensions actually changed
      const dpr = window.devicePixelRatio || 1;
      const width = canvas.parentElement?.clientWidth || 800;
      const height = showRSI ? 490 : 390;

      const targetW = Math.round(width * dpr);
      const targetH = Math.round(height * dpr);

      if (canvas.width !== targetW || canvas.height !== targetH) {
        canvas.width = targetW;
        canvas.height = targetH;
        canvas.style.width = `${width}px`;
        canvas.style.height = `${height}px`;
      }

      ctx.save();
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      // Layout configuration
      const padding = { top: 25, right: 75, bottom: 25, left: 10 };
      const rsiHeight = showRSI ? 100 : 0;
      const mainHeight = height - padding.top - padding.bottom - (showRSI ? rsiHeight + 15 : 0);

      // Clear background cleanly without buffer reset
      ctx.fillStyle = "#0f121a";
      ctx.fillRect(0, 0, width, height);

    // Determine min/max price
    let minPrice = Infinity;
    let maxPrice = -Infinity;
    let maxVolume = 0;

    candles.forEach((c) => {
      if (c.low < minPrice) minPrice = c.low;
      if (c.high > maxPrice) maxPrice = c.high;
      if (c.volume > maxVolume) maxVolume = c.volume;
    });

    const priceRange = maxPrice - minPrice || 1;
    const pricePadding = priceRange * 0.08;
    const chartMin = minPrice - pricePadding;
    const chartMax = maxPrice + pricePadding;
    const effectiveRange = chartMax - chartMin;

    const chartWidth = width - padding.left - padding.right;
    const candleWidth = Math.max(3, (chartWidth / candles.length) * 0.7);
    const spacing = chartWidth / candles.length;

    // Coordinate helpers
    const getY = (price: number) => padding.top + mainHeight - ((price - chartMin) / effectiveRange) * mainHeight;
    const getX = (idx: number) => padding.left + idx * spacing + spacing / 2;

    // Draw Price Grid Lines
    ctx.strokeStyle = "#1e222d";
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);

    const gridSteps = 6;
    for (let i = 0; i <= gridSteps; i++) {
      const p = chartMin + (effectiveRange / gridSteps) * i;
      const y = getY(p);
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(width - padding.right, y);
      ctx.stroke();

      ctx.fillStyle = "#64748b";
      ctx.font = "10px monospace";
      ctx.textAlign = "left";
      ctx.fillText(p.toFixed(2), width - padding.right + 8, y + 3);
    }
    ctx.setLineDash([]);

    // ─── 1. Draw Bollinger Bands (Cloud & Lines) ───
    if (showBollinger && indicators.bollingerBands) {
      const bbs = indicators.bollingerBands;

      // Draw Upper and Lower Bands
      ctx.strokeStyle = "rgba(14, 165, 233, 0.4)";
      ctx.lineWidth = 1.2;

      // Upper Line
      ctx.beginPath();
      let started = false;
      bbs.forEach((bb, i) => {
        if (bb) {
          const x = getX(i);
          const y = getY(bb.upper);
          if (!started) {
            ctx.moveTo(x, y);
            started = true;
          } else {
            ctx.lineTo(x, y);
          }
        }
      });
      ctx.stroke();

      // Lower Line
      ctx.beginPath();
      started = false;
      bbs.forEach((bb, i) => {
        if (bb) {
          const x = getX(i);
          const y = getY(bb.lower);
          if (!started) {
            ctx.moveTo(x, y);
            started = true;
          } else {
            ctx.lineTo(x, y);
          }
        }
      });
      ctx.stroke();

      // Middle Basis Line (dashed)
      ctx.strokeStyle = "rgba(14, 165, 233, 0.25)";
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      started = false;
      bbs.forEach((bb, i) => {
        if (bb) {
          const x = getX(i);
          const y = getY(bb.middle);
          if (!started) {
            ctx.moveTo(x, y);
            started = true;
          } else {
            ctx.lineTo(x, y);
          }
        }
      });
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // ─── 2. Draw Support & Resistance Zones ───
    if (showSR) {
      indicators.supportLevels.forEach((sup) => {
        const y = getY(sup);
        ctx.strokeStyle = "rgba(8, 153, 129, 0.6)";
        ctx.lineWidth = 1.5;
        ctx.setLineDash([6, 4]);
        ctx.beginPath();
        ctx.moveTo(padding.left, y);
        ctx.lineTo(width - padding.right, y);
        ctx.stroke();

        ctx.fillStyle = "#089981";
        ctx.font = "bold 9px sans-serif";
        ctx.fillText(`SUP: ${sup}`, padding.left + 8, y - 4);
      });

      indicators.resistanceLevels.forEach((res) => {
        const y = getY(res);
        ctx.strokeStyle = "rgba(242, 54, 69, 0.6)";
        ctx.lineWidth = 1.5;
        ctx.setLineDash([6, 4]);
        ctx.beginPath();
        ctx.moveTo(padding.left, y);
        ctx.lineTo(width - padding.right, y);
        ctx.stroke();

        ctx.fillStyle = "#f23645";
        ctx.font = "bold 9px sans-serif";
        ctx.fillText(`RES: ${res}`, padding.left + 8, y - 4);
      });
      ctx.setLineDash([]);
    }

    // ─── 3. Draw Volume Bars ───
    candles.forEach((c, i) => {
      const x = getX(i);
      const isUp = c.close >= c.open;
      const volHeight = (c.volume / (maxVolume || 1)) * (mainHeight * 0.18);
      ctx.fillStyle = isUp ? "rgba(8, 153, 129, 0.15)" : "rgba(242, 54, 69, 0.15)";
      ctx.fillRect(x - candleWidth / 2, padding.top + mainHeight - volHeight, candleWidth, volHeight);
    });

    // ─── 4. Draw Candlesticks ───
    candles.forEach((c, i) => {
      const x = getX(i);
      const openY = getY(c.open);
      const closeY = getY(c.close);
      const highY = getY(c.high);
      const lowY = getY(c.low);
      const isUp = c.close >= c.open;

      const color = isUp ? "#089981" : "#f23645";

      // Wick
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(x, highY);
      ctx.lineTo(x, lowY);
      ctx.stroke();

      // Body
      ctx.fillStyle = color;
      const bodyY = Math.min(openY, closeY);
      const bodyH = Math.max(Math.abs(closeY - openY), 1.5);
      ctx.fillRect(x - candleWidth / 2, bodyY, candleWidth, bodyH);
    });

    // ─── 5. Draw SuperTrend (Green UP / Red DOWN) ───
    if (showSuperTrend && indicators.superTrend) {
      const sts = indicators.superTrend;
      for (let i = 1; i < sts.length; i++) {
        const ptPrev = sts[i - 1];
        const ptCur = sts[i];
        if (ptPrev && ptCur) {
          const x1 = getX(i - 1);
          const y1 = getY(ptPrev.value);
          const x2 = getX(i);
          const y2 = getY(ptCur.value);

          ctx.strokeStyle = ptCur.direction === "UP" ? "#10b981" : "#ef4444";
          ctx.lineWidth = 2.2;
          ctx.beginPath();
          ctx.moveTo(x1, y1);
          ctx.lineTo(x2, y2);
          ctx.stroke();
        }
      }
    }

    // ─── 6. Draw EMA Lines ───
    if (showEMA) {
      const drawEMALine = (emaValues: (number | null)[], color: string) => {
        ctx.strokeStyle = color;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        let started = false;

        emaValues.forEach((val, i) => {
          if (val !== null && val !== undefined) {
            const x = getX(i);
            const y = getY(val);
            if (!started) {
              ctx.moveTo(x, y);
              started = true;
            } else {
              ctx.lineTo(x, y);
            }
          }
        });
        ctx.stroke();
      };

      drawEMALine(indicators.ema20, "#3b82f6"); // Fast Ribbon
      drawEMALine(indicators.ema50, "#f59e0b"); // Slow Ribbon
      drawEMALine(indicators.ema200, "#a855f7"); // Major Baseline
    }

    // ─── 7. Draw Live Price Line & Pulsing Tag ───
    const currentPrice = candles[candles.length - 1].close;
    const currentPriceY = getY(currentPrice);
    const lastCandleX = getX(candles.length - 1);
    const isCurrentUp = candles[candles.length - 1].close >= candles[candles.length - 1].open;
    const liveColor = isCurrentUp ? "#089981" : "#f23645";

    ctx.strokeStyle = liveColor;
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.moveTo(padding.left, currentPriceY);
    ctx.lineTo(width - padding.right, currentPriceY);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = liveColor;
    ctx.beginPath();
    ctx.arc(lastCandleX, currentPriceY, 3.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = liveColor;
    ctx.fillRect(width - padding.right + 2, currentPriceY - 9, padding.right - 4, 18);

    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 10px monospace";
    ctx.textAlign = "center";
    ctx.fillText(currentPrice.toFixed(2), width - padding.right / 2, currentPriceY + 3.5);

    // ─── 8. Draw RSI Subpane ───
    if (showRSI) {
      const rsiTop = padding.top + mainHeight + 15;

      ctx.strokeStyle = "#1e222d";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(padding.left, rsiTop - 8);
      ctx.lineTo(width - padding.right, rsiTop - 8);
      ctx.stroke();

      const getRsiY = (val: number) => rsiTop + rsiHeight - (val / 100) * rsiHeight;

      [70, 50, 30].forEach((level) => {
        const y = getRsiY(level);
        ctx.strokeStyle = level === 50 ? "#1e222d" : "#334155";
        ctx.setLineDash([3, 3]);
        ctx.beginPath();
        ctx.moveTo(padding.left, y);
        ctx.lineTo(width - padding.right, y);
        ctx.stroke();

        ctx.fillStyle = "#64748b";
        ctx.font = "9px monospace";
        ctx.fillText(level.toString(), width - padding.right + 8, y + 3);
      });
      ctx.setLineDash([]);

      ctx.strokeStyle = "#06b6d4";
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      let rsiStarted = false;

      indicators.rsi14.forEach((rsiVal, i) => {
        if (rsiVal !== null && rsiVal !== undefined) {
          const x = getX(i);
          const y = getRsiY(rsiVal);
          if (!rsiStarted) {
            ctx.moveTo(x, y);
            rsiStarted = true;
          } else {
            ctx.lineTo(x, y);
          }
        }
      });
      ctx.stroke();

      ctx.fillStyle = "#06b6d4";
      ctx.font = "10px sans-serif";
      const lastRSI = indicators.rsi14.filter((v): v is number => v !== null).slice(-1)[0] || 50;
      const rsiPeriodLabel = optimizedConfig?.rsiPeriod || 14;
      ctx.fillText(`RSI (${rsiPeriodLabel}): ${lastRSI.toFixed(1)}`, padding.left + 5, rsiTop + 12);
    }

    // Hover Tooltip
    if (hoverIndex !== null && hoverIndex >= 0 && hoverIndex < candles.length && mousePos) {
      const c = candles[hoverIndex];
      const x = getX(hoverIndex);

      ctx.strokeStyle = "rgba(148, 163, 184, 0.4)";
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(x, padding.top);
      ctx.lineTo(x, height - padding.bottom);
      ctx.stroke();

      if (mousePos.y <= padding.top + mainHeight) {
        ctx.beginPath();
        ctx.moveTo(padding.left, mousePos.y);
        ctx.lineTo(width - padding.right, mousePos.y);
        ctx.stroke();
      }
      ctx.setLineDash([]);

      ctx.fillStyle = "#cbd5e1";
      ctx.font = "11px monospace";
      ctx.textAlign = "left";
      const dt = new Date(c.time * 1000).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
      const stats = `[${dt}] O: ${c.open} H: ${c.high} L: ${c.low} C: ${c.close} Vol: ${c.volume}`;
      ctx.fillText(stats, padding.left + 5, padding.top - 8);
    }

    ctx.restore();
  };

  animId = requestAnimationFrame(render);
  return () => cancelAnimationFrame(animId);
}, [candles, indicators, showSuperTrend, showBollinger, showEMA, showSR, showRSI, hoverIndex, mousePos, optimizedConfig]);

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || candles.length === 0) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const paddingLeft = 10;
    const paddingRight = 75;
    const chartWidth = canvas.clientWidth - paddingLeft - paddingRight;
    const spacing = chartWidth / candles.length;

    const index = Math.floor((x - paddingLeft) / spacing);
    if (index >= 0 && index < candles.length) {
      setHoverIndex(index);
      setMousePos({ x, y });
    }
  };

  const handleMouseLeave = () => {
    setHoverIndex(null);
    setMousePos(null);
  };

  const lastCandle = candles[candles.length - 1];
  const liveClose = lastCandle ? lastCandle.close : indicators.currentPrice;
  const firstCandle = candles[0];
  const baselinePrice = firstCandle ? firstCandle.open : liveClose;
  const priceChange = liveClose - baselinePrice;
  const priceChangePct = baselinePrice > 0 ? (priceChange / baselinePrice) * 100 : 0;
  const isPositive = priceChange >= 0;

  let high24h = -Infinity;
  let low24h = Infinity;
  let totalVolume = 0;
  candles.forEach((c) => {
    if (c.high > high24h) high24h = c.high;
    if (c.low < low24h) low24h = c.low;
    totalVolume += c.volume;
  });

  return (
    <div className="bg-surface-100 border border-slate-800 rounded-2xl overflow-hidden shadow-sm" ref={containerRef}>
      {/* ─── Institutional Live Price Header Banner ─── */}
      <div className="px-4 py-3 bg-surface-150 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
        {/* Left: Symbol, Big Live Price, and Change Pill */}
        <div className="flex items-center gap-3 sm:gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="text-base sm:text-lg font-bold text-white tracking-wide">{symbol}</span>
            <span className="text-[11px] px-2 py-0.5 rounded bg-slate-800/80 border border-slate-700 text-slate-300 font-mono font-semibold">
              {timeframe}
            </span>
          </div>

          {/* Big Prominent Live Price */}
          <div className="flex items-baseline gap-1.5">
            <span className={`text-2xl sm:text-3xl font-black font-mono tracking-tight transition-colors duration-150 ${
              isPositive ? "text-emerald-400" : "text-rose-400"
            }`}>
              {liveClose > 0 ? liveClose.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "-"}
            </span>
            <span className="text-xs text-slate-500 font-bold">USD</span>
          </div>

          {/* Real-time 24h Change Pill */}
          <div className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-mono font-bold ${
            isPositive
              ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
              : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
          }`}>
            <span>{isPositive ? "▲ +" : "▼ "}</span>
            <span>{Math.abs(priceChange).toFixed(2)}</span>
            <span>({isPositive ? "+" : ""}{priceChangePct.toFixed(2)}%)</span>
          </div>
        </div>

        {/* Right: 24h High, 24h Low, Volume, Live Tick Badge */}
        <div className="flex items-center gap-3 sm:gap-5 text-xs font-mono">
          <div className="hidden xs:block">
            <div className="text-[10px] uppercase text-slate-500 font-medium">24h High</div>
            <div className="text-slate-200 font-bold">{high24h > -Infinity ? high24h.toFixed(2) : "-"}</div>
          </div>
          <div className="hidden xs:block">
            <div className="text-[10px] uppercase text-slate-500 font-medium">24h Low</div>
            <div className="text-slate-200 font-bold">{low24h < Infinity ? low24h.toFixed(2) : "-"}</div>
          </div>
          <div className="hidden sm:block">
            <div className="text-[10px] uppercase text-slate-500 font-medium">Volume</div>
            <div className="text-slate-200 font-bold">{totalVolume.toLocaleString()}</div>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[11px] font-bold text-emerald-400">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
            <span className="font-sans">LIVE TICK</span>
          </div>
        </div>
      </div>

      {/* Chart Control Toolbar */}
      <div className="px-4 py-2 border-b border-slate-800/80 bg-surface-200/50 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {/* Indicator Suite Toggles (SuperTrend, Bollinger, EMA Ribbon, S/R) */}
          <div className="flex flex-wrap items-center gap-1">
            <button
              onClick={() => setShowSuperTrend(!showSuperTrend)}
              className={`px-2 py-0.5 rounded text-[11px] font-bold transition-all ${
                showSuperTrend ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40" : "text-slate-500 hover:text-slate-300"
              }`}
            >
              SuperTrend
            </button>
            <button
              onClick={() => setShowBollinger(!showBollinger)}
              className={`px-2 py-0.5 rounded text-[11px] font-bold transition-all ${
                showBollinger ? "bg-sky-500/20 text-sky-300 border border-sky-500/40" : "text-slate-500 hover:text-slate-300"
              }`}
            >
              Bollinger Bands
            </button>
            <button
              onClick={() => setShowEMA(!showEMA)}
              className={`px-2 py-0.5 rounded text-[11px] font-mono font-medium transition-all ${
                showEMA ? "bg-blue-500/20 text-blue-400 border border-blue-500/30" : "text-slate-500 hover:text-slate-300"
              }`}
            >
              {emaFastLabel}/{emaSlowLabel}
            </button>
            <button
              onClick={() => setShowSR(!showSR)}
              className={`px-2 py-0.5 rounded text-[11px] font-medium transition-all ${
                showSR ? "bg-purple-500/20 text-purple-400 border border-purple-500/30" : "text-slate-500 hover:text-slate-300"
              }`}
            >
              S/R Zones
            </button>
          </div>
        </div>

        {/* RSI Subpane Toggle */}
        <button
          onClick={() => setShowRSI(!showRSI)}
          className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium border transition-all ${
            showRSI ? "bg-cyan-500/10 text-cyan-400 border-cyan-500/30" : "bg-surface-50 text-slate-400 border-slate-800"
          }`}
        >
          <Activity className="w-3.5 h-3.5" />
          <span>RSI Pane</span>
        </button>
      </div>

      {/* Canvas chart */}
      <div className="relative w-full p-2 bg-[#0f121a]">
        <canvas
          ref={canvasRef}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          className="w-full cursor-crosshair rounded-xl block"
        />
      </div>
    </div>
  );
}