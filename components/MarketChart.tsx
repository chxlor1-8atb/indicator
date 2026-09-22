"use client";

import React, { useRef, useEffect, useState, useMemo } from "react";
import { Candle, IndicatorData, OptimizedConfig, VolumeAnomalyItem } from "@/lib/types";
import { BarChart2, Activity, Zap, TrendingUp, Compass, Layers, Clock } from "lucide-react";

interface MarketChartProps {
  candles: Candle[];
  indicators: IndicatorData;
  symbol: string;
  timeframe: string;
  isLiveUpdating?: boolean;
  optimizedConfig?: OptimizedConfig;
  lastTickTime?: number | null;
  priceFeedLabel?: string;
  livePrice?: number;
}

function MarketChart({
  candles,
  indicators,
  symbol,
  timeframe,
  optimizedConfig,
  lastTickTime,
  priceFeedLabel = "LIVE TICK",
  livePrice,
}: MarketChartProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const [showSuperTrend, setShowSuperTrend] = useState(true);
  const [showBollinger, setShowBollinger] = useState(true);
  const [showEMA, setShowEMA] = useState(true);
  const [showVWAP, setShowVWAP] = useState(true);
  const [showHeikinAshi, setShowHeikinAshi] = useState(false);
  const [showSR, setShowSR] = useState(true);
  const [showRSI, setShowRSI] = useState(true);

  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(null);
  const [containerWidth, setContainerWidth] = useState<number>(0);

  // Dynamic responsive ResizeObserver to seamlessly adapt canvas to full screen & ultrawide monitors
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const updateWidth = () => {
      if (containerRef.current) {
        setContainerWidth(containerRef.current.clientWidth);
      }
    };

    updateWidth();

    let ro: ResizeObserver | null = null;
    if (typeof ResizeObserver !== "undefined") {
      ro = new ResizeObserver((entries) => {
        for (const entry of entries) {
          if (entry.contentRect.width > 0) {
            setContainerWidth(Math.round(entry.contentRect.width));
          }
        }
      });
      ro.observe(container);
    }

    window.addEventListener("resize", updateWidth);
    return () => {
      if (ro) ro.disconnect();
      window.removeEventListener("resize", updateWidth);
    };
  }, []);

  const assetPrecision = (() => {
    const sym = symbol.toUpperCase();
    if (sym.includes("JPY")) return 2;
    if (["EUR", "GBP", "AUD", "NZD", "USD", "CAD", "CHF"].some(c => sym.startsWith(c) || sym.endsWith(c))) return 4;
    if (["XRP", "ADA", "DOGE", "SUI"].some(c => sym.startsWith(c))) return 4;
    if (sym === "XAGUSD") return 3;
    if (candles[0] && candles[0].close < 10 && candles[0].close > 0) return 4;
    return 2;
  })();

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
      const width = canvas.parentElement?.clientWidth || containerWidth || 800;
      const isMobile = width < 640;
      const baseHeight = width > 1400 ? 530 : width > 800 ? 480 : width > 500 ? 410 : 340;
      const height = showRSI ? baseHeight : Math.max(260, baseHeight - 85);

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
      const padding = {
        top: isMobile ? 20 : 25,
        right: width < 500 ? 52 : 75,
        bottom: isMobile ? 18 : 25,
        left: width < 500 ? 6 : 10,
      };
      const rsiHeight = showRSI ? (isMobile ? 75 : 100) : 0;
      const mainHeight = height - padding.top - padding.bottom - (showRSI ? rsiHeight + (isMobile ? 10 : 15) : 0);

      // Clear background cleanly without buffer reset
      ctx.fillStyle = "#161618";
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
    ctx.strokeStyle = "#242428";
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

      ctx.fillStyle = "#71717a";
      ctx.font = "10px monospace";
      ctx.textAlign = "left";
      ctx.fillText(p.toFixed(assetPrecision), width - padding.right + 8, y + 3);
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

    // ─── 2. Draw Support & Resistance Zones (แนวรับ-แนวต้าน พร้อมระบบป้องกันข้อความซ้อนทับ) ───
    if (showSR) {
      // 1. วาดเส้นประแนวนอนพาดยาวตลอดหน้ากราฟ
      indicators.supportLevels.forEach((sup) => {
        const y = getY(sup);
        ctx.strokeStyle = "rgba(16, 185, 129, 0.7)";
        ctx.lineWidth = 1.5;
        ctx.setLineDash([6, 4]);
        ctx.beginPath();
        ctx.moveTo(padding.left, y);
        ctx.lineTo(width - padding.right, y);
        ctx.stroke();
      });

      indicators.resistanceLevels.forEach((res) => {
        const y = getY(res);
        ctx.strokeStyle = "rgba(244, 63, 94, 0.7)";
        ctx.lineWidth = 1.5;
        ctx.setLineDash([6, 4]);
        ctx.beginPath();
        ctx.moveTo(padding.left, y);
        ctx.lineTo(width - padding.right, y);
        ctx.stroke();
      });
      ctx.setLineDash([]);

      // 2. จัดรูปแบบตัวเลขทศนิยมให้สะอาดตาตามความละเอียดของสินทรัพย์
      const formatSRPrice = (p: number) => {
        return p.toLocaleString(undefined, { minimumFractionDigits: assetPrecision, maximumFractionDigits: assetPrecision });
      };

      interface SRBadge {
        type: "RES" | "SUP";
        price: number;
        lineY: number;
        badgeY: number;
        badgeX: number;
        text: string;
        bgColor: string;
        borderColor: string;
        dotColor: string;
        textColor: string;
      }

      const badges: SRBadge[] = [];

      indicators.resistanceLevels.forEach((res) => {
        const y = getY(res);
        badges.push({
          type: "RES",
          price: res,
          lineY: y,
          badgeY: y - 16,
          badgeX: padding.left + 8,
          text: `แนวต้าน RES: ${formatSRPrice(res)}`,
          bgColor: "rgba(24, 24, 27, 0.94)",
          borderColor: "rgba(244, 63, 94, 0.7)",
          dotColor: "#f43f5e",
          textColor: "#fca5a5",
        });
      });

      indicators.supportLevels.forEach((sup) => {
        const y = getY(sup);
        badges.push({
          type: "SUP",
          price: sup,
          lineY: y,
          badgeY: y + 2,
          badgeX: padding.left + 8,
          text: `แนวรับ SUP: ${formatSRPrice(sup)}`,
          bgColor: "rgba(24, 24, 27, 0.94)",
          borderColor: "rgba(16, 185, 129, 0.7)",
          dotColor: "#10b981",
          textColor: "#86efac",
        });
      });

      // จัดเรียงป้ายตามพิกัดแนวตั้งบนลงล่าง
      badges.sort((a, b) => a.badgeY - b.badgeY);

      // Smart Anti-Collision: ตรวจจับระยะห่าง หากป้ายใกล้กันเกินไปจะขยับลงอย่างน้อย 18px ป้องกันตัวหนังสือซ้อนกัน 100%
      for (let i = 1; i < badges.length; i++) {
        const prev = badges[i - 1];
        const curr = badges[i];
        if (curr.badgeY - prev.badgeY < 18) {
          curr.badgeY = prev.badgeY + 18;
        }
      }

      // วาดป้ายข้อความพร้อมพื้นหลัง Pill สวยงาม ชัดเจน
      ctx.font = "bold 9.5px sans-serif";
      ctx.textAlign = "left";

      badges.forEach((b) => {
        const clampedY = Math.max(padding.top + 2, Math.min(padding.top + mainHeight - 16, b.badgeY));
        const textMetrics = ctx.measureText(b.text);
        const badgeWidth = textMetrics.width + 16;
        const badgeHeight = 15;

        // วาดกล่องพื้นหลังป้ายมน (Pill Badge)
        ctx.fillStyle = b.bgColor;
        ctx.strokeStyle = b.borderColor;
        ctx.lineWidth = 1;
        ctx.beginPath();
        if (ctx.roundRect) {
          ctx.roundRect(b.badgeX, clampedY, badgeWidth, badgeHeight, 3);
        } else {
          ctx.rect(b.badgeX, clampedY, badgeWidth, badgeHeight);
        }
        ctx.fill();
        ctx.stroke();

        // จุดกลมระบุสี
        ctx.fillStyle = b.dotColor;
        ctx.beginPath();
        ctx.arc(b.badgeX + 6.5, clampedY + badgeHeight / 2, 2.5, 0, Math.PI * 2);
        ctx.fill();

        // ข้อความ
        ctx.fillStyle = b.textColor;
        ctx.fillText(b.text, b.badgeX + 13, clampedY + 11);
      });
    }

    // ─── 3. Draw Volume Bars & Volume Anomaly Detection [แผน 4] ───
    const anomalyMap = new Map<number, VolumeAnomalyItem>();
    if (indicators.volumeAnomalies) {
      indicators.volumeAnomalies.forEach((a) => anomalyMap.set(a.index, a));
    }

    candles.forEach((c, i) => {
      const x = getX(i);
      const isUp = c.close >= c.open;
      const volHeight = Math.max(2, (c.volume / (maxVolume || 1)) * (mainHeight * 0.18));
      const anomaly = anomalyMap.get(i);

      if (anomaly) {
        // Highlight Institutional Volume Spikes
        if (anomaly.type === "BUYING_SPIKE") {
          ctx.fillStyle = "rgba(16, 185, 129, 0.85)";
          ctx.fillRect(x - candleWidth / 2, padding.top + mainHeight - volHeight, candleWidth, volHeight);
          // Indicator marker above spike
          ctx.fillStyle = "#34d399";
          ctx.beginPath();
          ctx.arc(x, padding.top + mainHeight - volHeight - 3, 2, 0, Math.PI * 2);
          ctx.fill();
        } else if (anomaly.type === "SELLING_SPIKE") {
          ctx.fillStyle = "rgba(244, 63, 94, 0.85)";
          ctx.fillRect(x - candleWidth / 2, padding.top + mainHeight - volHeight, candleWidth, volHeight);
          ctx.fillStyle = "#fb7185";
          ctx.beginPath();
          ctx.arc(x, padding.top + mainHeight - volHeight - 3, 2, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.fillStyle = "rgba(168, 85, 247, 0.85)";
          ctx.fillRect(x - candleWidth / 2, padding.top + mainHeight - volHeight, candleWidth, volHeight);
        }
      } else {
        ctx.fillStyle = isUp ? "rgba(8, 153, 129, 0.15)" : "rgba(242, 54, 69, 0.15)";
        ctx.fillRect(x - candleWidth / 2, padding.top + mainHeight - volHeight, candleWidth, volHeight);
      }
    });

    // ─── 4. Draw Candlesticks (Raw or Heikin-Ashi) [แผน 1] ───
    const haCandles = indicators.heikinAshi;
    candles.forEach((rawC, i) => {
      const ha = showHeikinAshi && haCandles && haCandles[i] ? haCandles[i] : null;
      const c = ha
        ? { open: ha.open, high: ha.high, low: ha.low, close: ha.close, isUp: ha.isUp }
        : { open: rawC.open, high: rawC.high, low: rawC.low, close: rawC.close, isUp: rawC.close >= rawC.open };

      const x = getX(i);
      const openY = getY(c.open);
      const closeY = getY(c.close);
      const highY = getY(c.high);
      const lowY = getY(c.low);

      const color = c.isUp ? "#089981" : "#f23645";

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

    // ─── 6b. Draw VWAP (Volume Weighted Average Price) & ±2σ Bands [แผน 2] ───
    if (showVWAP && indicators.vwap && indicators.vwap.length > 0) {
      const vwaps = indicators.vwap;

      // 1. Draw ±2σ Bands
      ctx.strokeStyle = "rgba(234, 179, 8, 0.35)";
      ctx.setLineDash([2, 3]);
      ctx.lineWidth = 1;

      // Upper Band (+2σ)
      ctx.beginPath();
      let startedUpper = false;
      vwaps.forEach((v, i) => {
        if (v && v.upperBand !== null && v.upperBand !== undefined) {
          const x = getX(i);
          const y = getY(v.upperBand);
          if (!startedUpper) {
            ctx.moveTo(x, y);
            startedUpper = true;
          } else {
            ctx.lineTo(x, y);
          }
        }
      });
      ctx.stroke();

      // Lower Band (-2σ)
      ctx.beginPath();
      let startedLower = false;
      vwaps.forEach((v, i) => {
        if (v && v.lowerBand !== null && v.lowerBand !== undefined) {
          const x = getX(i);
          const y = getY(v.lowerBand);
          if (!startedLower) {
            ctx.moveTo(x, y);
            startedLower = true;
          } else {
            ctx.lineTo(x, y);
          }
        }
      });
      ctx.stroke();
      ctx.setLineDash([]);

      // 2. Draw Central VWAP Golden Line
      ctx.strokeStyle = "#eab308";
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      let startedVWAP = false;
      vwaps.forEach((v, i) => {
        if (v && v.vwap !== null && v.vwap !== undefined) {
          const x = getX(i);
          const y = getY(v.vwap);
          if (!startedVWAP) {
            ctx.moveTo(x, y);
            startedVWAP = true;
          } else {
            ctx.lineTo(x, y);
          }
        }
      });
      ctx.stroke();
    }

    // ─── 7. Draw Live Price Line & Pulsing Tag ───
    const currentPrice = (livePrice && livePrice > 0)
      ? livePrice
      : (indicators.currentPrice && indicators.currentPrice > 0)
      ? indicators.currentPrice
      : candles[candles.length - 1].close;
    const currentPriceY = getY(currentPrice);
    const lastCandleX = getX(candles.length - 1);
    const isCurrentUp = currentPrice >= candles[candles.length - 1].open;
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
    ctx.fillText(currentPrice.toFixed(assetPrecision), width - padding.right / 2, currentPriceY + 3.5);

    // ─── 8. Draw RSI Subpane ───
    if (showRSI) {
      const rsiTop = padding.top + mainHeight + 15;

      ctx.strokeStyle = "#242428";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(padding.left, rsiTop - 8);
      ctx.lineTo(width - padding.right, rsiTop - 8);
      ctx.stroke();

      const getRsiY = (val: number) => rsiTop + rsiHeight - (val / 100) * rsiHeight;

      [70, 50, 30].forEach((level) => {
        const y = getRsiY(level);
        ctx.strokeStyle = level === 50 ? "#242428" : "#36363d";
        ctx.setLineDash([3, 3]);
        ctx.beginPath();
        ctx.moveTo(padding.left, y);
        ctx.lineTo(width - padding.right, y);
        ctx.stroke();

        ctx.fillStyle = "#71717a";
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
      const hoveredAnomaly = indicators.volumeAnomalies?.find((a) => a.index === hoverIndex);
      const anomalyTag = hoveredAnomaly ? ` [⚡${hoveredAnomaly.type.replace("_", " ")} x${hoveredAnomaly.ratio.toFixed(1)}]` : "";
      const vwapVal = indicators.vwap?.[hoverIndex]?.vwap;
      const vwapTag = showVWAP && vwapVal ? ` VWAP: ${vwapVal.toFixed(assetPrecision)}` : "";
      const haTag = showHeikinAshi ? " [HA Smoothed]" : "";
      const stats = `[${dt}]${haTag} O: ${c.open.toFixed(assetPrecision)} H: ${c.high.toFixed(assetPrecision)} L: ${c.low.toFixed(assetPrecision)} C: ${c.close.toFixed(assetPrecision)} Vol: ${c.volume.toLocaleString()}${vwapTag}${anomalyTag}`;
      ctx.fillText(stats, padding.left + 5, padding.top - 8);
    } else if (candles.length > 0) {
      // ─── Continuous Live Bar Stats (Always visible when not hovering) ───
      const last = candles[candles.length - 1];
      const livePriceVal = (livePrice && livePrice > 0)
        ? livePrice
        : (indicators.currentPrice && indicators.currentPrice > 0)
        ? indicators.currentPrice
        : last.close;
      const isUp = livePriceVal >= last.open;
      const vwapVal = indicators.vwap?.[candles.length - 1]?.vwap;
      const vwapTag = showVWAP && vwapVal ? ` VWAP: ${vwapVal.toFixed(assetPrecision)}` : "";
      const haTag = showHeikinAshi ? " [HA]" : "";

      ctx.font = "11px monospace";
      ctx.textAlign = "left";

      // Live indicator dot & label
      ctx.fillStyle = isUp ? "#34d399" : "#f87171";
      ctx.fillText(`● LIVE [${timeframe.toUpperCase()}]`, padding.left + 5, padding.top - 8);

      ctx.fillStyle = "#94a3b8";
      const openStats = ` O: ${last.open.toFixed(assetPrecision)} H: ${last.high.toFixed(assetPrecision)} L: ${last.low.toFixed(assetPrecision)}`;
      ctx.fillText(openStats, padding.left + 82, padding.top - 8);

      const openWidth = ctx.measureText(openStats).width;
      ctx.fillStyle = isUp ? "#34d399" : "#f87171";
      const closeStats = ` C: ${livePriceVal.toFixed(assetPrecision)} (${isUp ? "▲" : "▼"})${haTag}${vwapTag} Vol: ${last.volume.toLocaleString()}`;
      ctx.fillText(closeStats, padding.left + 82 + openWidth, padding.top - 8);
    }

    ctx.restore();
  };

  animId = requestAnimationFrame(render);
  return () => cancelAnimationFrame(animId);
}, [candles, indicators, showSuperTrend, showBollinger, showEMA, showVWAP, showHeikinAshi, showSR, showRSI, hoverIndex, mousePos, optimizedConfig, containerWidth, livePrice]);

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
      if (index !== hoverIndex) {
        setHoverIndex(index);
      }
      setMousePos({ x, y });
    }
  };

  const handleMouseLeave = () => {
    setHoverIndex(null);
    setMousePos(null);
  };

  const lastCandle = candles[candles.length - 1];
  const liveClose = (livePrice && livePrice > 0)
    ? livePrice
    : (indicators.currentPrice && indicators.currentPrice > 0)
    ? indicators.currentPrice
    : lastCandle
    ? lastCandle.close
    : 0;
  const firstCandle = candles[0];
  const baselinePrice = firstCandle ? firstCandle.open : liveClose;
  const priceChange = liveClose - baselinePrice;
  const priceChangePct = baselinePrice > 0 ? (priceChange / baselinePrice) * 100 : 0;
  const isPositive = priceChange >= 0;

  // Memoize 24h High, Low, and Volume to eliminate O(N) loop on every mouse move
  const { high24h, low24h, totalVolume } = useMemo(() => {
    let high = -Infinity;
    let low = Infinity;
    let vol = 0;
    for (let i = 0; i < candles.length; i++) {
      const c = candles[i];
      if (c.high > high) high = c.high;
      if (c.low < low) low = c.low;
      vol += c.volume;
    }
    return { high24h: high, low24h: low, totalVolume: vol };
  }, [candles]);

  const lastEma20 = indicators.ema20?.filter((v): v is number => v !== null && !isNaN(v)).pop();
  const lastEma50 = indicators.ema50?.filter((v): v is number => v !== null && !isNaN(v)).pop();
  const lastRsi14 = indicators.rsi14?.filter((v): v is number => v !== null && !isNaN(v)).pop();
  const trioData = indicators.classicTrio || (lastEma20 && lastEma50 && lastRsi14 ? {
    ma20: Number(lastEma20.toFixed(assetPrecision)),
    ma50: Number(lastEma50.toFixed(assetPrecision)),
    rsi14: Number(lastRsi14.toFixed(1)),
    alignment: (candles.length > 0 && candles[candles.length - 1].close >= lastEma20 && lastEma20 >= lastEma50 && lastRsi14 >= 50) ? "FULL_BULLISH_TRIO" : "DIVERGENT",
    isAligned: (candles.length > 0 && candles[candles.length - 1].close >= lastEma20 && lastEma20 >= lastEma50 && lastRsi14 >= 50),
    winRateBonus: (candles.length > 0 && candles[candles.length - 1].close >= lastEma20 && lastEma20 >= lastEma50 && lastRsi14 >= 50) ? 7.5 : 0,
    alignmentScore: 70,
  } : null);

  return (
    <div className="terminal-card overflow-hidden" ref={containerRef}>
      {/* ─── Institutional Live Price Header Banner ─── */}
      <div className="px-2.5 sm:px-3.5 py-2 sm:py-2.5 bg-[#14171F] border-b border-white/[0.08] flex flex-wrap items-center justify-between gap-2 sm:gap-3">
        {/* Left: Symbol, Big Live Price, and Change Pill */}
        <div className="flex items-center gap-2 sm:gap-4 flex-wrap">
          <div className="flex items-center gap-1.5 sm:gap-2">
            <span className="text-sm sm:text-base md:text-lg font-bold text-white tracking-wide">{symbol}</span>
            <span className="text-[9px] sm:text-[10px] px-1.5 py-0.5 rounded bg-blue-500/10 border border-blue-500/25 text-blue-400 font-mono font-bold">
              {timeframe === "1m" ? "M1" : timeframe === "5m" ? "M5" : timeframe === "15m" ? "M15" : timeframe === "30m" ? "M30" : timeframe === "1h" ? "H1" : timeframe === "4h" ? "H4" : timeframe === "1D" ? "D1" : timeframe === "1W" ? "W1" : timeframe.toUpperCase()}
            </span>
          </div>

          {/* Big Prominent Live Price */}
          <div className="flex items-baseline gap-1">
            <span className={`text-lg sm:text-2xl md:text-3xl font-black font-mono tracking-tight transition-colors duration-150 ${
              isPositive ? "text-emerald-400" : "text-rose-400"
            }`}>
              {liveClose > 0 ? liveClose.toLocaleString(undefined, { minimumFractionDigits: assetPrecision, maximumFractionDigits: assetPrecision }) : "-"}
            </span>
            <span className="text-[9px] sm:text-[10px] text-zinc-500 font-mono font-bold">USD</span>
          </div>

          {/* Real-time 24h Change Pill */}
          <div className={`flex items-center gap-0.5 sm:gap-1 px-1.5 sm:px-2 py-0.5 rounded text-[10px] sm:text-xs font-mono font-bold ${
            isPositive
              ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
              : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
          }`}>
            <span>{isPositive ? "▲ +" : "▼ "}</span>
            <span>{Math.abs(priceChange).toFixed(assetPrecision)}</span>
            <span>({isPositive ? "+" : ""}{priceChangePct.toFixed(2)}%)</span>
          </div>
        </div>

        {/* Right: 24h High, 24h Low, Volume, Live Tick Badge */}
        <div className="flex items-center gap-2 sm:gap-4 text-xs font-mono">
          <div className="hidden md:block">
            <div className="text-[10px] uppercase text-zinc-500 font-medium">24h High</div>
            <div className="text-zinc-200 font-bold">{high24h > -Infinity ? high24h.toFixed(assetPrecision) : "-"}</div>
          </div>
          <div className="hidden md:block">
            <div className="text-[10px] uppercase text-zinc-500 font-medium">24h Low</div>
            <div className="text-zinc-200 font-bold">{low24h < Infinity ? low24h.toFixed(assetPrecision) : "-"}</div>
          </div>
          <div className="hidden sm:block">
            <div className="text-[10px] uppercase text-zinc-500 font-medium">Volume</div>
            <div className="text-zinc-200 font-bold">{totalVolume.toLocaleString()}</div>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2">
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-[10px] sm:text-[11px] font-bold text-emerald-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="font-sans">{priceFeedLabel}</span>
            </div>
            <div
              className="hidden sm:flex items-center gap-1 px-2 py-0.5 rounded bg-white/[0.03] border border-white/[0.06] text-[10.5px] text-zinc-400 font-mono"
              title="เวลาอัปเดตราคาล่าสุด"
            >
              <Clock className="w-3 h-3 text-zinc-400" />
              <span>
                {lastTickTime
                  ? new Date(lastTickTime).toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit", second: "2-digit" })
                  : candles.length > 0 && candles[candles.length - 1].time
                  ? new Date(candles[candles.length - 1].time * 1000).toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit", second: "2-digit" })
                  : "เรียลไทม์"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Chart Control Toolbar */}
      <div className="px-2.5 sm:px-3 py-1.5 border-b border-white/[0.08] bg-[#0E1015] flex flex-wrap items-center justify-between gap-1.5 sm:gap-2">
        <div className="flex items-center gap-1 sm:gap-2 overflow-x-auto scrollbar-none flex-nowrap max-w-[calc(100vw-110px)] sm:max-w-none py-0.5">
          {/* Indicator Suite Toggles (Unified Monochrome Precision Chips) */}
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={() => setShowSuperTrend(!showSuperTrend)}
              title="SuperTrend: เส้นเขียว=เทรนด์ขาขึ้น, เส้นแดง=เทรนด์ขาลง"
              className={`h-6 px-1.5 sm:px-2 rounded-[5px] text-[10px] sm:text-[11px] font-mono font-medium transition-colors cursor-pointer border shrink-0 ${
                showSuperTrend
                  ? "bg-white/[0.12] text-white border-white/[0.22]"
                  : "bg-transparent text-zinc-400 border-transparent hover:text-white hover:bg-white/[0.04]"
              }`}
            >
              SuperTrend
            </button>
            <button
              onClick={() => setShowBollinger(!showBollinger)}
              title="Bollinger Bands: กรอบความผันผวนราคา"
              className={`h-6 px-1.5 sm:px-2 rounded-[5px] text-[10px] sm:text-[11px] font-mono font-medium transition-colors cursor-pointer border shrink-0 ${
                showBollinger
                  ? "bg-white/[0.12] text-white border-white/[0.22]"
                  : "bg-transparent text-zinc-400 border-transparent hover:text-white hover:bg-white/[0.04]"
              }`}
            >
              Bollinger
            </button>
            <button
              onClick={() => setShowEMA(!showEMA)}
              title="EMA Ribbon: เส้นค่าเฉลี่ยแนวโน้มราคา"
              className={`h-6 px-1.5 sm:px-2 rounded-[5px] text-[10px] sm:text-[11px] font-mono font-medium transition-colors cursor-pointer border shrink-0 ${
                showEMA
                  ? "bg-white/[0.12] text-white border-white/[0.22]"
                  : "bg-transparent text-zinc-400 border-transparent hover:text-white hover:bg-white/[0.04]"
              }`}
            >
              {emaFastLabel}/{emaSlowLabel}
            </button>
            <button
              onClick={() => setShowVWAP(!showVWAP)}
              title="VWAP: Volume-Weighted Average Price + กรอบเบี่ยงเบนมาตรฐาน ±2σ"
              className={`h-6 px-1.5 sm:px-2 rounded-[5px] text-[10px] sm:text-[11px] font-mono font-medium transition-colors cursor-pointer border shrink-0 ${
                showVWAP
                  ? "bg-white/[0.12] text-white border-white/[0.22]"
                  : "bg-transparent text-zinc-400 border-transparent hover:text-white hover:bg-white/[0.04]"
              }`}
            >
              VWAP ±2σ
            </button>
            <button
              onClick={() => setShowHeikinAshi(!showHeikinAshi)}
              title="Heikin-Ashi: แท่งเทียนเฉลี่ยกรองความผันผวนหลอก"
              className={`h-6 px-1.5 sm:px-2 rounded-[5px] text-[10px] sm:text-[11px] font-mono font-medium transition-colors cursor-pointer border shrink-0 ${
                showHeikinAshi
                  ? "bg-white/[0.12] text-white border-white/[0.22]"
                  : "bg-transparent text-zinc-400 border-transparent hover:text-white hover:bg-white/[0.04]"
              }`}
            >
              H-Ashi
            </button>
            <button
              onClick={() => setShowSR(!showSR)}
              title="Support & Resistance: เส้นประเขียว=แนวรับ, เส้นประแดง=แนวต้าน"
              className={`h-6 px-1.5 sm:px-2 rounded-[5px] text-[10px] sm:text-[11px] font-mono font-medium transition-colors cursor-pointer border shrink-0 ${
                showSR
                  ? "bg-white/[0.12] text-white border-white/[0.22]"
                  : "bg-transparent text-zinc-400 border-transparent hover:text-white hover:bg-white/[0.04]"
              }`}
            >
              S/R
            </button>
          </div>

          {/* Mini Legend Guide (คำอธิบายสีเส้น) */}
          <div className="hidden lg:flex items-center gap-2 pl-2 border-l border-white/[0.08] text-[10.5px] font-mono font-medium shrink-0">
            <span className="flex items-center gap-1 text-emerald-400">
              <span className="w-2 h-0.5 bg-emerald-400 inline-block border-t border-dashed border-emerald-400" />
              <span>รับ</span>
            </span>
            <span className="flex items-center gap-1 text-rose-400">
              <span className="w-2 h-0.5 bg-rose-400 inline-block border-t border-dashed border-rose-400" />
              <span>ต้าน</span>
            </span>
            <span className="flex items-center gap-1 text-amber-400">
              <span className="w-2 h-0.5 bg-amber-400 inline-block" />
              <span>VWAP</span>
            </span>
          </div>
        </div>

        {/* RSI Subpane Toggle */}
        <button
          onClick={() => setShowRSI(!showRSI)}
          className={`h-6 px-2 rounded-[5px] flex items-center gap-1 text-[11px] sm:text-xs font-mono font-medium transition-colors cursor-pointer border shrink-0 ${
            showRSI ? "bg-blue-600/15 text-blue-400 border-blue-500/30" : "btn-terminal"
          }`}
        >
          <Activity className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
          <span>RSI</span>
        </button>
      </div>

      {/* Canvas chart */}
      <div className="relative w-full p-1.5 sm:p-2 bg-surface-200">
        {/* TradingView-Style On-Chart Legend: Live Running Price & Classic Trio */}
        {(liveClose > 0 || trioData) && (
          <div className="absolute top-3 sm:top-4 left-3 sm:left-4 z-10 flex flex-wrap items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg bg-slate-950/90 backdrop-blur-md border border-slate-700/70 shadow-2xl text-[10px] sm:text-[11px] font-mono pointer-events-none select-none max-w-[calc(100%-20px)]">
            {/* Live Symbol & Real-Time Running Price Badge */}
            <div className="flex items-center gap-1 sm:gap-1.5 pr-1.5 sm:pr-2 border-r border-slate-700/80">
              <span className={`w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full animate-ping shrink-0 ${isPositive ? "bg-emerald-400" : "bg-rose-400"}`} />
              <span className="font-bold text-white tracking-wide">{symbol}</span>
              <span className="text-[9px] sm:text-[10px] text-slate-400 font-medium">({timeframe === "1m" ? "M1" : timeframe === "5m" ? "M5" : timeframe === "15m" ? "M15" : timeframe === "30m" ? "M30" : timeframe === "1h" ? "H1" : timeframe === "4h" ? "H4" : timeframe === "1D" ? "D1" : timeframe === "1W" ? "W1" : timeframe.toUpperCase()})</span>
              <span className={`font-black text-[11px] sm:text-xs md:text-sm tracking-tight transition-colors duration-150 ${isPositive ? "text-emerald-400" : "text-rose-400"}`}>
                {liveClose > 0 ? liveClose.toLocaleString(undefined, { minimumFractionDigits: assetPrecision, maximumFractionDigits: assetPrecision }) : "-"}
              </span>
              <span className={`text-[8.5px] sm:text-[9.5px] font-bold ${isPositive ? "text-emerald-400" : "text-rose-400"}`}>
                {isPositive ? "▲+" : "▼"}{priceChangePct.toFixed(2)}%
              </span>
            </div>

            {trioData && (
              <>
                <div className="hidden sm:flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400"></span>
                  <span className="text-cyan-300 font-bold">MA20: {trioData.ma20}</span>
                </div>
                <span className="hidden sm:inline text-slate-600">•</span>
                <div className="hidden sm:flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                  <span className="text-amber-300 font-bold">MA50: {trioData.ma50}</span>
                </div>
                <span className="hidden sm:inline text-slate-600">•</span>
                <div className="hidden sm:flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-purple-400"></span>
                  <span className="text-purple-300 font-bold">RSI: {trioData.rsi14}</span>
                </div>
                <div className="pl-1 border-l border-slate-700/80">
                  <span className={`px-1.5 sm:px-2 py-0.2 sm:py-0.5 rounded text-[9px] sm:text-[10px] font-bold ${
                    trioData.alignment === "FULL_BULLISH_TRIO"
                      ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                      : trioData.alignment === "FULL_BEARISH_TRIO"
                      ? "bg-rose-500/20 text-rose-300 border border-rose-500/40"
                      : trioData.alignment === "PULLBACK_RETEST"
                      ? "bg-sky-500/20 text-sky-300 border border-sky-500/40"
                      : "bg-slate-800 text-slate-400 border border-slate-700"
                  }`}>
                    {trioData.alignment === "FULL_BULLISH_TRIO"
                      ? "✓ TRIO BULLISH"
                      : trioData.alignment === "FULL_BEARISH_TRIO"
                      ? "✓ TRIO BEARISH"
                      : trioData.alignment === "PULLBACK_RETEST"
                      ? "↻ TRIO RETEST"
                      : "TRIO DIVERGENT"}
                  </span>
                </div>
              </>
            )}
          </div>
        )}

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

export default React.memo(MarketChart);
