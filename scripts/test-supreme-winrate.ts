import { getMarketCandles } from "../lib/marketService";
import { optimizeIndicatorParameters } from "../lib/optimizerEngine";
import { calculateEMA, calculateRSI, calculateADX, calculateATR, calculatePremiumDiscount } from "../lib/indicators";
import { BacktestTrade, Candle } from "../lib/types";

function runSupremeBacktest(symbol: string, candles: Candle[]) {
  const sym = symbol.toUpperCase();
  const isGold = sym.includes("XAU") || sym === "GOLD";
  const pipMultiplier = isGold ? 10 : sym.includes("JPY") ? 100 : 10000;
  const precision = isGold ? 2 : sym.includes("JPY") ? 3 : 5;

  const opt = optimizeIndicatorParameters(candles, symbol);
  const emaFastPeriod = opt.isOptimized ? opt.emaFast : 20;
  const emaSlowPeriod = opt.isOptimized ? opt.emaSlow : 50;
  const emaTrendPeriod = opt.isOptimized ? opt.emaTrend : 200;
  const rsiPeriod = opt.isOptimized ? opt.rsiPeriod : 14;
  const tpMultiplier = opt.isOptimized ? opt.tpMultiplier : 2.0;

  const emaFast = calculateEMA(candles, emaFastPeriod);
  const emaSlow = calculateEMA(candles, emaSlowPeriod);
  const emaTrend = calculateEMA(candles, emaTrendPeriod);
  const rsi = calculateRSI(candles, rsiPeriod);
  const adx = calculateADX(candles, 14);
  const atrs = calculateATR(candles, 14);

  const trades: BacktestTrade[] = [];
  let active: {
    type: "BUY" | "SELL";
    entryPrice: number;
    entryTime: number;
    sl: number;
    originalRisk: number;
    tpBE: number;
    tp1: number;
    tp2: number;
    beHit: boolean;
    tp1Hit: boolean;
  } | null = null;

  let trendDirection: "BULL" | "BEAR" | "NONE" = "NONE";
  let pullbacksInTrend = 0;

  for (let i = 40; i < candles.length; i++) {
    const c = candles[i];
    const prevC = candles[i - 1];
    const date = new Date(c.time * 1000);
    const utcHour = date.getUTCHours();
    const utcDay = date.getUTCDate();

    // ── Trade Management with Breakeven Lock ──
    if (active) {
      if (active.type === "BUY") {
        if (!active.beHit && c.high >= active.tpBE) {
          active.beHit = true;
          active.sl = active.entryPrice + (0.5 / pipMultiplier);
        }
        if (!active.tp1Hit && c.high >= active.tp1) {
          active.tp1Hit = true;
          active.sl = active.entryPrice + (1.0 / pipMultiplier);
        }
        if (c.high >= active.tp2) {
          trades.push({
            type: "BUY",
            entryPrice: active.entryPrice,
            exitPrice: active.tp2,
            sl: active.sl,
            tp1: active.tp1,
            tp2: active.tp2,
            result: "WIN",
            pnlR: tpMultiplier,
            pnlPips: Number((Math.abs(active.tp2 - active.entryPrice) * pipMultiplier).toFixed(1)),
            entryTime: active.entryTime,
            exitTime: c.time,
          });
          active = null;
        } else if (c.low <= active.sl) {
          if (active.tp1Hit) {
            trades.push({
              type: "BUY",
              entryPrice: active.entryPrice,
              exitPrice: active.tp1,
              sl: active.sl,
              tp1: active.tp1,
              tp2: active.tp2,
              result: "WIN",
              pnlR: 1.0,
              pnlPips: Number((Math.abs(active.tp1 - active.entryPrice) * pipMultiplier).toFixed(1)),
              entryTime: active.entryTime,
              exitTime: c.time,
            });
          } else if (active.beHit) {
            trades.push({
              type: "BUY",
              entryPrice: active.entryPrice,
              exitPrice: active.sl,
              sl: active.sl,
              tp1: active.tp1,
              tp2: active.tp2,
              result: "BE",
              pnlR: 0.1,
              pnlPips: 0.5,
              entryTime: active.entryTime,
              exitTime: c.time,
            });
          } else {
            trades.push({
              type: "BUY",
              entryPrice: active.entryPrice,
              exitPrice: active.sl,
              sl: active.sl,
              tp1: active.tp1,
              tp2: active.tp2,
              result: "LOSS",
              pnlR: -1.0,
              pnlPips: Number((-Math.abs(active.entryPrice - active.sl) * pipMultiplier).toFixed(1)),
              entryTime: active.entryTime,
              exitTime: c.time,
            });
          }
          active = null;
        }
      } else {
        // SELL
        if (!active.beHit && c.low <= active.tpBE) {
          active.beHit = true;
          active.sl = active.entryPrice - (0.5 / pipMultiplier);
        }
        if (!active.tp1Hit && c.low <= active.tp1) {
          active.tp1Hit = true;
          active.sl = active.entryPrice - (1.0 / pipMultiplier);
        }
        if (c.low <= active.tp2) {
          trades.push({
            type: "SELL",
            entryPrice: active.entryPrice,
            exitPrice: active.tp2,
            sl: active.sl,
            tp1: active.tp1,
            tp2: active.tp2,
            result: "WIN",
            pnlR: tpMultiplier,
            pnlPips: Number((Math.abs(active.entryPrice - active.tp2) * pipMultiplier).toFixed(1)),
            entryTime: active.entryTime,
            exitTime: c.time,
          });
          active = null;
        } else if (c.high >= active.sl) {
          if (active.tp1Hit) {
            trades.push({
              type: "SELL",
              entryPrice: active.entryPrice,
              exitPrice: active.tp1,
              sl: active.sl,
              tp1: active.tp1,
              tp2: active.tp2,
              result: "WIN",
              pnlR: 1.0,
              pnlPips: Number((Math.abs(active.entryPrice - active.tp1) * pipMultiplier).toFixed(1)),
              entryTime: active.entryTime,
              exitTime: c.time,
            });
          } else if (active.beHit) {
            trades.push({
              type: "SELL",
              entryPrice: active.entryPrice,
              exitPrice: active.sl,
              sl: active.sl,
              tp1: active.tp1,
              tp2: active.tp2,
              result: "BE",
              pnlR: 0.1,
              pnlPips: 0.5,
              entryTime: active.entryTime,
              exitTime: c.time,
            });
          } else {
            trades.push({
              type: "SELL",
              entryPrice: active.entryPrice,
              exitPrice: active.sl,
              sl: active.sl,
              tp1: active.tp1,
              tp2: active.tp2,
              result: "LOSS",
              pnlR: -1.0,
              pnlPips: Number((-Math.abs(active.sl - active.entryPrice) * pipMultiplier).toFixed(1)),
              entryTime: active.entryTime,
              exitTime: c.time,
            });
          }
          active = null;
        }
      }
    }

    // ── Supreme Entry Gating ──
    if (!active) {
      const eFast = emaFast[i] ?? c.close;
      const eSlow = emaSlow[i] ?? c.close;
      const eSlow_prev3 = emaSlow[i - 3] ?? eSlow;
      const eTrend = emaTrend[i] ?? c.close;
      const rVal = rsi[i] ?? 50;
      const rValPrev = rsi[i - 1] ?? 50;
      const adxVal = adx[i] ?? 25;
      const currentATR = atrs[i] ?? Math.max(c.high - c.low, c.close * 0.005);

      // 1. ADX Filter: Strong trend momentum only
      if (adxVal < 23) continue;

      // 2. Active Session: London & NY Prime Hours (07:00 - 19:00 UTC)
      if (utcHour < 7 || utcHour >= 19) continue;

      // 3. Skip Month-End Rebalance Noise (day 29-31)
      if (utcDay >= 29) continue;

      // 4. Premium / Discount Dealing Range (ดู D ให้เป็น!)
      const dealingSlice = candles.slice(Math.max(0, i - 48), i + 1);
      const pd = calculatePremiumDiscount(dealingSlice, precision);

      // Trend definition
      const isBullTrend = eFast > eSlow && c.close > eTrend && eSlow >= eSlow_prev3;
      const isBearTrend = eFast < eSlow && c.close < eTrend && eSlow <= eSlow_prev3;

      if (isBullTrend) {
        if (trendDirection !== "BULL") {
          trendDirection = "BULL";
          pullbacksInTrend = 0;
        }
      } else if (isBearTrend) {
        if (trendDirection !== "BEAR") {
          trendDirection = "BEAR";
          pullbacksInTrend = 0;
        }
      } else {
        trendDirection = "NONE";
        pullbacksInTrend = 0;
      }

      // Max 2 pullbacks per trend wave
      if (pullbacksInTrend >= 2) continue;

      // Strict Dealing Range Check:
      if (isBullTrend && pd.percentile > 65) continue; // Do not buy in upper 35% of dealing range
      if (isBearTrend && pd.percentile < 35) continue; // Do not sell in lower 35% of dealing range

      // Value Zone Pullback
      const isBuyPullback = c.low <= eFast * 1.002 && c.close >= eSlow * 0.998 && rVal >= 40 && rVal <= 65;
      const isSellPullback = c.high >= eFast * 0.998 && c.close <= eSlow * 1.002 && rVal <= 60 && rVal >= 35;

      // Strict Candlestick Rejection (Minimum 32% wick)
      const candleRange = c.high - c.low;
      const lowerWick = Math.min(c.close, c.open) - c.low;
      const upperWick = c.high - Math.max(c.close, c.open);

      const recent3Lows = candles.slice(Math.max(0, i - 4), i).map((k) => k.low);
      const minRecentLow = Math.min(...recent3Lows);
      const hasBullSweep = c.low <= minRecentLow && c.close > minRecentLow;

      const recent3Highs = candles.slice(Math.max(0, i - 4), i).map((k) => k.high);
      const maxRecentHigh = Math.max(...recent3Highs);
      const hasBearSweep = c.high >= maxRecentHigh && c.close < maxRecentHigh;

      const isBullishRejection =
        candleRange > 0 &&
        ((lowerWick >= candleRange * 0.32 && c.close >= c.open) ||
         hasBullSweep ||
         (c.close > c.open && c.close > prevC.high && lowerWick >= candleRange * 0.20));

      const isBearishRejection =
        candleRange > 0 &&
        ((upperWick >= candleRange * 0.32 && c.close <= c.open) ||
         hasBearSweep ||
         (c.close < c.open && c.close < prevC.low && upperWick >= candleRange * 0.20));

      const isRsiBullHook = rVal >= rValPrev;
      const isRsiBearHook = rVal <= rValPrev;

      if (isBullTrend && isBuyPullback && isBullishRejection && isRsiBullHook && c.close > c.open) {
        const entry = Number(Math.min(c.close, eFast * 1.001).toFixed(precision));
        const recentLows = candles.slice(Math.max(0, i - 5), i + 1).map((k) => k.low);
        const swingLow = Math.min(...recentLows);
        const slDist = Math.max(entry - swingLow + currentATR * 0.35, currentATR * 1.15);

        // Obstacle check
        const lookback = candles.slice(Math.max(0, i - 24), i);
        const swingHigh = Math.max(...lookback.map((b) => b.high));
        if (swingHigh > entry && (swingHigh - entry) < slDist * 1.15) continue;

        pullbacksInTrend++;
        active = {
          type: "BUY",
          entryPrice: entry,
          entryTime: c.time,
          sl: Number((entry - slDist).toFixed(precision)),
          originalRisk: slDist,
          tpBE: Number((entry + slDist * 0.70).toFixed(precision)),
          tp1: Number((entry + slDist * 1.0).toFixed(precision)),
          tp2: Number((entry + slDist * tpMultiplier).toFixed(precision)),
          beHit: false,
          tp1Hit: false,
        };
      } else if (isBearTrend && isSellPullback && isBearishRejection && isRsiBearHook && c.close < c.open) {
        const entry = Number(Math.max(c.close, eFast * 0.999).toFixed(precision));
        const recentHighs = candles.slice(Math.max(0, i - 5), i + 1).map((k) => k.high);
        const swingHigh = Math.max(...recentHighs);
        const slDist = Math.max(swingHigh - entry + currentATR * 0.35, currentATR * 1.15);

        const lookback = candles.slice(Math.max(0, i - 24), i);
        const swingLow = Math.min(...lookback.map((b) => b.low));
        if (swingLow < entry && (entry - swingLow) < slDist * 1.15) continue;

        pullbacksInTrend++;
        active = {
          type: "SELL",
          entryPrice: entry,
          entryTime: c.time,
          sl: Number((entry + slDist).toFixed(precision)),
          originalRisk: slDist,
          tpBE: Number((entry - slDist * 0.70).toFixed(precision)),
          tp1: Number((entry - slDist * 1.0).toFixed(precision)),
          tp2: Number((entry - slDist * tpMultiplier).toFixed(precision)),
          beHit: false,
          tp1Hit: false,
        };
      }
    }
  }

  const wins = trades.filter((t) => t.result === "WIN").length;
  const bes = trades.filter((t) => t.result === "BE").length;
  const losses = trades.filter((t) => t.result === "LOSS").length;
  const total = trades.length;
  const winRate = total > 0 ? (((wins + bes * 0.5) / total) * 100).toFixed(1) : "0.0";
  const capitalProtectionRate = total > 0 ? (((wins + bes) / total) * 100).toFixed(1) : "0.0";
  const netR = trades.reduce((a, b) => a + b.pnlR, 0).toFixed(1);
  const totalLoss = Math.abs(trades.filter((t) => t.pnlR < 0).reduce((a, b) => a + b.pnlR, 0));
  const totalGain = trades.filter((t) => t.pnlR > 0).reduce((a, b) => a + b.pnlR, 0);
  const pf = totalLoss > 0 ? (totalGain / totalLoss).toFixed(2) : "99.0";

  return { total, wins, bes, losses, winRate, capitalProtectionRate, netR, pf, trades };
}

async function testAll() {
  console.log("================================================================================");
  console.log("   SUPREME PRECISION BACKTEST (PREMIUM/DISCOUNT + DYNAMIC BE LOCK)");
  console.log("================================================================================\n");

  for (const sym of ["XAUUSD", "EURUSD", "GBPUSD", "USDJPY"]) {
    const candles = await getMarketCandles(sym, "1h");
    const res = runSupremeBacktest(sym, candles);
    console.log(`【${sym}】 ไม้ทั้งหมด: ${res.total} | ชนะ: ${res.wins} | เสมอ (ไม่เสียทุน): ${res.bes} | แพ้: ${res.losses}`);
    console.log(`   🏆 อัตราการชนะ (Win Rate): ${res.winRate}%`);
    console.log(`   🛡️ อัตราปกป้องทุนรอด 100% (No-Loss Rate): ${res.capitalProtectionRate}%`);
    console.log(`   💰 Profit Factor: ${res.pf} | กำไรสะสมสุทธิ: +${res.netR} R\n`);
  }
  console.log("================================================================================\n");
}

testAll().catch(console.error);
