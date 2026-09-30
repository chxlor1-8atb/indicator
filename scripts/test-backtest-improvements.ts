import * as fs from "fs";
import * as path from "path";
import { Candle } from "../lib/types";
import { calculateEMA, calculateRSI, calculateADX, calculateATR } from "../lib/indicators";
import { resampleCandlesTo4H } from "../lib/marketService";

async function testOptimizedBacktest() {
  const dataPath = path.resolve(process.cwd(), "data", "xauusd_1h_deep.json");
  const candles: Candle[] = JSON.parse(fs.readFileSync(dataPath, "utf-8"));
  console.log(`Loaded ${candles.length} candles for Gold optimization test\n`);

  // 1. Resample to 4H candles and precalculate 4H EMAs
  const candles4H = resampleCandlesTo4H(candles);
  const ema20_4H = calculateEMA(candles4H, 20);
  const ema50_4H = calculateEMA(candles4H, 50);
  const ema200_4H = calculateEMA(candles4H, 200);

  // Map 4H timestamp to 4H index
  const fourHourMap = new Map<number, number>();
  for (let k = 0; k < candles4H.length; k++) {
    fourHourMap.set(candles4H[k].time, k);
  }

  // 1H indicators
  const emaFast = calculateEMA(candles, 20);
  const emaSlow = calculateEMA(candles, 50);
  const emaTrend = calculateEMA(candles, 200);
  const rsi = calculateRSI(candles, 14);
  const adx = calculateADX(candles, 14);
  const atrs = calculateATR(candles, 14);

  interface Trade {
    type: "BUY" | "SELL";
    entryPrice: number;
    exitPrice: number;
    sl: number;
    result: "WIN" | "LOSS" | "BE";
    pnlR: number;
    pnlPips: number;
    entryTime: number;
    exitTime: number;
  }

  const trades: Trade[] = [];
  let active: {
    type: "BUY" | "SELL";
    entryPrice: number;
    entryTime: number;
    sl: number;
    tp08: number;
    tp1: number;
    tp2: number;
    beHit: boolean;
    tp1Hit: boolean;
  } | null = null;

  let pullbacksInTrend = 0;
  let highestHighInTrend = 0;
  let lowestLowInTrend = Infinity;
  let trendDirection: "BULL" | "BEAR" | "NONE" = "NONE";

  for (let i = 50; i < candles.length; i++) {
    const c = candles[i];
    const prevC = candles[i - 1];

    // Manage active trade
    if (active) {
      if (active.type === "BUY") {
        if (!active.beHit && c.high >= active.tp08) {
          active.beHit = true;
          active.sl = active.entryPrice;
        }
        if (!active.tp1Hit && c.high >= active.tp1) {
          active.tp1Hit = true;
          active.sl = active.entryPrice;
        }
        if (c.high >= active.tp2) {
          trades.push({
            type: "BUY",
            entryPrice: active.entryPrice,
            exitPrice: active.tp2,
            sl: active.sl,
            result: "WIN",
            pnlR: 2.0,
            pnlPips: Number(((active.tp2 - active.entryPrice) * 10).toFixed(1)),
            entryTime: active.entryTime,
            exitTime: c.time,
          });
          active = null;
        } else if (c.low <= active.sl) {
          const res = active.tp1Hit ? "WIN" : active.beHit ? "BE" : "LOSS";
          const pnlR = active.tp1Hit ? 1.0 : active.beHit ? 0.1 : -1.0;
          const exitP = active.tp1Hit ? active.tp1 : active.sl;
          trades.push({
            type: "BUY",
            entryPrice: active.entryPrice,
            exitPrice: exitP,
            sl: active.sl,
            result: res,
            pnlR,
            pnlPips: Number(((exitP - active.entryPrice) * 10).toFixed(1)),
            entryTime: active.entryTime,
            exitTime: c.time,
          });
          active = null;
        }
      } else {
        if (!active.beHit && c.low <= active.tp08) {
          active.beHit = true;
          active.sl = active.entryPrice;
        }
        if (!active.tp1Hit && c.low <= active.tp1) {
          active.tp1Hit = true;
          active.sl = active.entryPrice;
        }
        if (c.low <= active.tp2) {
          trades.push({
            type: "SELL",
            entryPrice: active.entryPrice,
            exitPrice: active.tp2,
            sl: active.sl,
            result: "WIN",
            pnlR: 2.0,
            pnlPips: Number(((active.entryPrice - active.tp2) * 10).toFixed(1)),
            entryTime: active.entryTime,
            exitTime: c.time,
          });
          active = null;
        } else if (c.high >= active.sl) {
          const res = active.tp1Hit ? "WIN" : active.beHit ? "BE" : "LOSS";
          const pnlR = active.tp1Hit ? 1.0 : active.beHit ? 0.1 : -1.0;
          const exitP = active.tp1Hit ? active.tp1 : active.sl;
          trades.push({
            type: "SELL",
            entryPrice: active.entryPrice,
            exitPrice: exitP,
            sl: active.sl,
            result: res,
            pnlR,
            pnlPips: Number(((active.entryPrice - exitP) * 10).toFixed(1)),
            entryTime: active.entryTime,
            exitTime: c.time,
          });
          active = null;
        }
      }
    }

    // Dynamic 4H HTF Bias at current bar i (NO LOOKAHEAD BIAS)
    const current4HBucketTime = Math.floor(c.time / (4 * 3600)) * (4 * 3600);
    const idx4H = fourHourMap.get(current4HBucketTime);
    let dynamicHtfBias: "BULL" | "BEAR" | "NEUTRAL" = "NEUTRAL";
    if (idx4H !== undefined && idx4H >= 1) {
      // Use closed 4H candle prior to current
      const prev4HIdx = idx4H - 1;
      const c4Close = candles4H[prev4HIdx]?.close;
      const e4_20 = ema20_4H[prev4HIdx];
      const e4_50 = ema50_4H[prev4HIdx];
      const e4_200 = ema200_4H[prev4HIdx] ?? e4_50;
      if (c4Close && e4_20 && e4_50 && e4_200) {
        if (c4Close > e4_20 && e4_20 > e4_50 && c4Close > e4_200) dynamicHtfBias = "BULL";
        else if (c4Close < e4_20 && e4_20 < e4_50 && c4Close < e4_200) dynamicHtfBias = "BEAR";
      }
    }

    if (!active) {
      const eFast = emaFast[i] ?? c.close;
      const eSlow = emaSlow[i] ?? c.close;
      const eSlow_prev3 = emaSlow[i - 3] ?? eSlow;
      const eTrend = emaTrend[i] ?? c.close;
      const rVal = rsi[i] ?? 50;
      const rValPrev = rsi[i - 1] ?? 50;
      const adxVal = adx[i] ?? 25;
      const currentATR = atrs[i] ?? Math.max(c.high - c.low, c.close * 0.005);

      if (adxVal < 20) continue; // Basic chop filter

      const isBullTrend = eFast > eSlow && c.close > eTrend && eSlow >= eSlow_prev3;
      const isBearTrend = eFast < eSlow && c.close < eTrend && eSlow <= eSlow_prev3;

      // Anti-Clash HTF Dominance: NEVER take counter-trend trades against 4H macro trend!
      if (isBullTrend && dynamicHtfBias === "BEAR") continue;
      if (isBearTrend && dynamicHtfBias === "BULL") continue;

      // Track Trend Cycles & Reset pullback counter on new impulse breakthrough
      if (isBullTrend) {
        if (trendDirection !== "BULL") {
          trendDirection = "BULL";
          pullbacksInTrend = 0;
          highestHighInTrend = c.high;
        } else if (c.high > highestHighInTrend + currentATR * 1.5) {
          // Fresh impulse leg! Reset pullback counter
          highestHighInTrend = c.high;
          pullbacksInTrend = 0;
        }
      } else if (isBearTrend) {
        if (trendDirection !== "BEAR") {
          trendDirection = "BEAR";
          pullbacksInTrend = 0;
          lowestLowInTrend = c.low;
        } else if (c.low < lowestLowInTrend - currentATR * 1.5) {
          // Fresh impulse leg downward! Reset pullback counter
          lowestLowInTrend = c.low;
          pullbacksInTrend = 0;
        }
      } else {
        trendDirection = "NONE";
        pullbacksInTrend = 0;
      }

      if (pullbacksInTrend >= 4) continue;

      // Pullback within value zone
      const isBuyPullback = c.low <= eFast * 1.006 && c.close >= eSlow * 0.995 && rVal >= 35 && rVal <= 72;
      const isSellPullback = c.high >= eFast * 0.994 && c.close <= eSlow * 1.005 && rVal <= 65 && rVal >= 28;

      const candleRange = c.high - c.low;
      const lowerWick = Math.min(c.close, c.open) - c.low;
      const upperWick = c.high - Math.max(c.close, c.open);

      const isBullishRejection = candleRange > 0 && ((lowerWick >= candleRange * 0.22 && c.close >= c.open) || (c.close > c.open && c.close > prevC.high));
      const isBearishRejection = candleRange > 0 && ((upperWick >= candleRange * 0.22 && c.close <= c.open) || (c.close < c.open && c.close < prevC.low));

      const isRsiBullHook = rVal >= rValPrev;
      const isRsiBearHook = rVal <= rValPrev;

      if (isBullTrend && isBuyPullback && isBullishRejection && isRsiBullHook && c.close > c.open) {
        const entry = Number(Math.min(c.close, eFast * 1.001).toFixed(2));
        const recentLows = candles.slice(Math.max(0, i - 5), i + 1).map((k) => k.low);
        const swingLow = Math.min(...recentLows);
        const slDist = Math.max(entry - swingLow + currentATR * 0.35, currentATR * 1.35, 2.50);

        const slPrice = Number((entry - slDist).toFixed(2));
        const tp08Price = Number((entry + slDist * 0.75).toFixed(2));
        const tp1Price = Number((entry + slDist * 1.0).toFixed(2));
        const tp2Price = Number((entry + slDist * 2.0).toFixed(2));

        pullbacksInTrend++;
        active = {
          type: "BUY",
          entryPrice: entry,
          entryTime: c.time,
          sl: slPrice,
          tp08: tp08Price,
          tp1: tp1Price,
          tp2: tp2Price,
          beHit: false,
          tp1Hit: false,
        };
      } else if (isBearTrend && isSellPullback && isBearishRejection && isRsiBearHook && c.close < c.open) {
        const entry = Number(Math.max(c.close, eFast * 0.999).toFixed(2));
        const recentHighs = candles.slice(Math.max(0, i - 5), i + 1).map((k) => k.high);
        const swingHigh = Math.max(...recentHighs);
        const slDist = Math.max(swingHigh - entry + currentATR * 0.35, currentATR * 1.35, 2.50);

        const slPrice = Number((entry + slDist).toFixed(2));
        const tp08Price = Number((entry - slDist * 0.75).toFixed(2));
        const tp1Price = Number((entry - slDist * 1.0).toFixed(2));
        const tp2Price = Number((entry - slDist * 2.0).toFixed(2));

        pullbacksInTrend++;
        active = {
          type: "SELL",
          entryPrice: entry,
          entryTime: c.time,
          sl: slPrice,
          tp08: tp08Price,
          tp1: tp1Price,
          tp2: tp2Price,
          beHit: false,
          tp1Hit: false,
        };
      }
    }
  }

  const wins = trades.filter((t) => t.result === "WIN");
  const losses = trades.filter((t) => t.result === "LOSS");
  const bes = trades.filter((t) => t.result === "BE");

  const winRate = Number(((wins.length / (wins.length + losses.length)) * 100).toFixed(1));
  const totalNetPips = Number(trades.reduce((acc, t) => acc + (t.pnlPips || 0), 0).toFixed(1));
  const totalNetR = Number(trades.reduce((acc, t) => acc + (t.pnlR || 0), 0).toFixed(2));
  const profitFactor = losses.length > 0 ? Number(((wins.length * 2.0) / losses.length).toFixed(2)) : 99.0;

  console.log("=== OPTIMIZED 2-YEAR GOLD SIMULATION ===");
  console.log(`Total Trades: ${trades.length} (Wins: ${wins.length}, Losses: ${losses.length}, BE: ${bes.length})`);
  console.log(`Win Rate: ${winRate}%`);
  console.log(`Net Return: +${totalNetR}R (+${totalNetPips} pips)`);
  console.log(`Profit Factor: ${profitFactor}`);
}

testOptimizedBacktest().catch(console.error);
