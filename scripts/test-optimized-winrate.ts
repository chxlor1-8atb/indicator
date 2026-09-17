import { getMarketCandles } from "../lib/marketService";
import { calculateEMA, calculateRSI, calculateADX, calculateATR } from "../lib/indicators";
import { BacktestTrade, Candle } from "../lib/types";

function runEnhancedSimulation(symbol: string, candles: Candle[]) {
  const sym = symbol.toUpperCase();
  const isGold = sym.includes("XAU") || sym === "GOLD";
  const pipMultiplier = isGold ? 10 : sym.includes("JPY") ? 100 : 10000;
  const precision = isGold ? 2 : sym.includes("JPY") ? 3 : 5;

  const emaFast = calculateEMA(candles, 20);
  const emaSlow = calculateEMA(candles, 50);
  const emaTrend = calculateEMA(candles, 200);
  const rsi = calculateRSI(candles, 14);
  const adx = calculateADX(candles, 14);
  const atrs = calculateATR(candles, 14);

  const trades: BacktestTrade[] = [];
  let active: {
    type: "BUY" | "SELL";
    entryPrice: number;
    entryTime: number;
    sl: number;
    originalRisk: number;
    tp065: number; // Early Risk-Free Breakeven at +0.65R
    tp1: number;
    tp2: number;
    beHit: boolean;
    tp1Hit: boolean;
  } | null = null;

  let trendDirection: "BULL" | "BEAR" | "NONE" = "NONE";
  let pullbacksInTrend = 0;

  for (let i = 35; i < candles.length; i++) {
    const c = candles[i];
    const prevC = candles[i - 1];
    const date = new Date(c.time * 1000);
    const utcHour = date.getUTCHours();
    const utcDay = date.getUTCDate();

    // ── Trade Management ──
    if (active) {
      if (active.type === "BUY") {
        // Breakeven at +0.65R
        if (!active.beHit && c.high >= active.tp065) {
          active.beHit = true;
          active.sl = active.entryPrice + (0.5 / pipMultiplier); // Entry + 0.5 pip
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
            pnlR: 2.0,
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
        if (!active.beHit && c.low <= active.tp065) {
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
            pnlR: 2.0,
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

    // ── Entry Filters ──
    if (!active) {
      const eFast = emaFast[i] ?? c.close;
      const eSlow = emaSlow[i] ?? c.close;
      const eSlow_prev3 = emaSlow[i - 3] ?? eSlow;
      const eTrend = emaTrend[i] ?? c.close;
      const rVal = rsi[i] ?? 50;
      const rValPrev = rsi[i - 1] ?? 50;
      const adxVal = adx[i] ?? 25;
      const currentATR = atrs[i] ?? Math.max(c.high - c.low, c.close * 0.005);

      // Filter 1: ADX >= 22 (Avoid dead chop)
      if (adxVal < 22) continue;

      // Filter 2: London + NY Active Hours (07:00 - 20:00 UTC)
      if (utcHour < 7 || utcHour >= 20) continue;

      // Filter 3: Avoid Month-End Rebalancing Days (>= 29th of the month)
      if (utcDay >= 29) continue;

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

      // Filter 4: Max 2 pullbacks per trend cycle (avoid climax late entries)
      if (pullbacksInTrend >= 2) continue;

      // Value Zone Pullback
      const isBuyPullback = c.low <= eFast * 1.002 && c.close >= eSlow * 0.998 && rVal >= 40 && rVal <= 68;
      const isSellPullback = c.high >= eFast * 0.998 && c.close <= eSlow * 1.002 && rVal <= 60 && rVal >= 32;

      // Candle Rejection
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
        ((lowerWick >= candleRange * 0.30 && c.close >= c.open) ||
         hasBullSweep ||
         (c.close > c.open && c.close > prevC.high));

      const isBearishRejection =
        candleRange > 0 &&
        ((upperWick >= candleRange * 0.30 && c.close <= c.open) ||
         hasBearSweep ||
         (c.close < c.open && c.close < prevC.low));

      const isRsiBullHook = rVal >= rValPrev;
      const isRsiBearHook = rVal <= rValPrev;

      if (isBullTrend && isBuyPullback && isBullishRejection && isRsiBullHook && c.close > c.open) {
        const entry = Number(Math.min(c.close, eFast * 1.001).toFixed(precision));
        const recentLows = candles.slice(Math.max(0, i - 5), i + 1).map((k) => k.low);
        const swingLow = Math.min(...recentLows);
        const slDist = Math.max(entry - swingLow + currentATR * 0.4, currentATR * 1.2);

        // Obstacle check
        const lookback = candles.slice(Math.max(0, i - 24), i);
        const swingHigh = Math.max(...lookback.map((b) => b.high));
        if (swingHigh > entry && (swingHigh - entry) < slDist * 1.2) continue;

        pullbacksInTrend++;
        active = {
          type: "BUY",
          entryPrice: entry,
          entryTime: c.time,
          sl: Number((entry - slDist).toFixed(precision)),
          originalRisk: slDist,
          tp065: Number((entry + slDist * 0.65).toFixed(precision)),
          tp1: Number((entry + slDist * 1.0).toFixed(precision)),
          tp2: Number((entry + slDist * 2.0).toFixed(precision)),
          beHit: false,
          tp1Hit: false,
        };
      } else if (isBearTrend && isSellPullback && isBearishRejection && isRsiBearHook && c.close < c.open) {
        const entry = Number(Math.max(c.close, eFast * 0.999).toFixed(precision));
        const recentHighs = candles.slice(Math.max(0, i - 5), i + 1).map((k) => k.high);
        const swingHigh = Math.max(...recentHighs);
        const slDist = Math.max(swingHigh - entry + currentATR * 0.4, currentATR * 1.2);

        const lookback = candles.slice(Math.max(0, i - 24), i);
        const swingLow = Math.min(...lookback.map((b) => b.low));
        if (swingLow < entry && (entry - swingLow) < slDist * 1.2) continue;

        pullbacksInTrend++;
        active = {
          type: "SELL",
          entryPrice: entry,
          entryTime: c.time,
          sl: Number((entry + slDist).toFixed(precision)),
          originalRisk: slDist,
          tp065: Number((entry - slDist * 0.65).toFixed(precision)),
          tp1: Number((entry - slDist * 1.0).toFixed(precision)),
          tp2: Number((entry - slDist * 2.0).toFixed(precision)),
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
  const pureWinRate = total > 0 ? (((wins + bes) / total) * 100).toFixed(1) : "0.0"; // Protection rate (no loss)

  return { total, wins, bes, losses, winRate, pureWinRate, trades };
}

async function testAll() {
  console.log("=== TESTING ENHANCED HIGH-CONVICTION WIN-RATE TUNING ===\n");
  for (const sym of ["XAUUSD", "EURUSD", "GBPUSD", "USDJPY"]) {
    const candles = await getMarketCandles(sym, "1h");
    const res = runEnhancedSimulation(sym, candles);
    console.log(`【${sym}】 Total: ${res.total} | Wins: ${res.wins} | BE (Capital Safe): ${res.bes} | Loss: ${res.losses}`);
    console.log(`   🔥 Win Rate: ${res.winRate}% (No-Loss Protection Rate: ${res.pureWinRate}%)\n`);
  }
}

testAll().catch(console.error);
