import * as fs from "fs";
import * as path from "path";
import { Candle } from "../lib/types";
import { calculateEMA, calculateRSI, calculateADX, calculateATR } from "../lib/indicators";
import { resampleCandlesTo4H } from "../lib/marketService";

async function testFineTuning() {
  const dataPath = path.resolve(process.cwd(), "data", "xauusd_1h_deep.json");
  const candles: Candle[] = JSON.parse(fs.readFileSync(dataPath, "utf-8"));

  const candles4H = resampleCandlesTo4H(candles);
  const ema20_4H = calculateEMA(candles4H, 20);
  const ema50_4H = calculateEMA(candles4H, 50);
  const ema200_4H = calculateEMA(candles4H, 200);

  const fourHourMap = new Map<number, number>();
  for (let k = 0; k < candles4H.length; k++) {
    fourHourMap.set(candles4H[k].time, k);
  }

  const emaFast = calculateEMA(candles, 20);
  const emaSlow = calculateEMA(candles, 50);
  const emaTrend = calculateEMA(candles, 200);
  const rsi = calculateRSI(candles, 14);
  const adx = calculateADX(candles, 14);
  const atrs = calculateATR(candles, 14);

  function runBacktest(params: {
    climaxAtrLimit: number;
    requireSolidHammer: boolean;
    chochProtection: boolean;
  }) {
    let active: any = null;
    let trendDirection: "BULL" | "BEAR" | "NONE" = "NONE";
    let pullbacksInTrend = 0;
    let highestHighInTrend = 0;
    let lowestLowInTrend = Infinity;
    let lastTradeExitBar = -6;
    const trades: any[] = [];

    // Track swing lows and highs for CHoCH
    const swingHighs: { price: number; bar: number }[] = [];
    const swingLows: { price: number; bar: number }[] = [];

    for (let i = 35; i < candles.length; i++) {
      const c = candles[i];
      const prevC = candles[i - 1];

      // Update confirmed 3-bar swing pivots at bar i-2
      if (i >= 5) {
        const pBar = i - 2;
        const p = candles[pBar];
        if (p.high > candles[pBar - 1].high && p.high > candles[pBar - 2].high &&
            p.high > candles[pBar + 1].high && p.high > candles[pBar + 2].high) {
          swingHighs.push({ price: p.high, bar: pBar });
          if (swingHighs.length > 20) swingHighs.shift();
        }
        if (p.low < candles[pBar - 1].low && p.low < candles[pBar - 2].low &&
            p.low < candles[pBar + 1].low && p.low < candles[pBar + 2].low) {
          swingLows.push({ price: p.low, bar: pBar });
          if (swingLows.length > 20) swingLows.shift();
        }
      }

      // Active trade management
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
            trades.push({ type: "BUY", result: "WIN", pnlR: 2.0, pnlPips: (active.tp2 - active.entryPrice) * 10, quarter: getQuarter(c.time) });
            active = null;
            lastTradeExitBar = i;
          } else if (c.low <= active.sl) {
            if (active.tp1Hit) {
              trades.push({ type: "BUY", result: "WIN", pnlR: 1.0, pnlPips: (active.tp1 - active.entryPrice) * 10, quarter: getQuarter(c.time) });
            } else if (active.beHit) {
              trades.push({ type: "BUY", result: "BE", pnlR: 0.1, pnlPips: (active.sl - active.entryPrice) * 10, quarter: getQuarter(c.time) });
            } else {
              trades.push({ type: "BUY", result: "LOSS", pnlR: -1.0, pnlPips: -(active.entryPrice - active.sl) * 10, quarter: getQuarter(c.time) });
            }
            active = null;
            lastTradeExitBar = i;
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
            trades.push({ type: "SELL", result: "WIN", pnlR: 2.0, pnlPips: (active.entryPrice - active.tp2) * 10, quarter: getQuarter(c.time) });
            active = null;
            lastTradeExitBar = i;
          } else if (c.high >= active.sl) {
            if (active.tp1Hit) {
              trades.push({ type: "SELL", result: "WIN", pnlR: 1.0, pnlPips: (active.entryPrice - active.tp1) * 10, quarter: getQuarter(c.time) });
            } else if (active.beHit) {
              trades.push({ type: "SELL", result: "BE", pnlR: 0.1, pnlPips: (active.entryPrice - active.sl) * 10, quarter: getQuarter(c.time) });
            } else {
              trades.push({ type: "SELL", result: "LOSS", pnlR: -1.0, pnlPips: -(active.sl - active.entryPrice) * 10, quarter: getQuarter(c.time) });
            }
            active = null;
            lastTradeExitBar = i;
          }
        }
      }

      if (!active) {
        if (i - lastTradeExitBar < 3) continue;

        const eFast = emaFast[i] ?? c.close;
        const eSlow = emaSlow[i] ?? c.close;
        const eTrend = emaTrend[i] ?? c.close;
        const rVal = rsi[i] ?? 50;
        const rValPrev = rsi[i - 1] ?? 50;
        const adxVal = adx[i] ?? 25;
        const currentATR = atrs[i] ?? 10;

        if (adxVal < 18) continue;

        const utcHour = new Date(c.time * 1000).getUTCHours();
        const isLondonNY = utcHour >= 6 && utcHour < 21;
        const isGoldExtended = utcHour < 3 || (utcHour >= 3 && utcHour < 6) || utcHour === 21;
        if (!isLondonNY && !isGoldExtended) continue;

        const current4HBucketTime = Math.floor(c.time / (4 * 3600)) * (4 * 3600);
        const idx4H = fourHourMap.get(current4HBucketTime);
        let dynamicHtfBias: "BULL" | "BEAR" | "NEUTRAL" = "NEUTRAL";
        if (idx4H !== undefined && idx4H >= 1) {
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

        const isBullTrend = eFast > eSlow && c.close > eTrend;
        const isBearTrend = eFast < eSlow && c.close < eTrend;

        if (isBullTrend && dynamicHtfBias === "BEAR") continue;
        if (isBearTrend && dynamicHtfBias === "BULL") continue;

        // CHoCH protection: if in Bull trend, check if recent close broke below confirmed swing low
        if (params.chochProtection) {
          if (isBullTrend && swingLows.length >= 1) {
            const lastSwingLow = swingLows[swingLows.length - 1].price;
            // If price decisively broke below last swing low with a solid close
            if (c.close < lastSwingLow && prevC.close < lastSwingLow) continue; // Bearish CHoCH confirmed
          }
          if (isBearTrend && swingHighs.length >= 1) {
            const lastSwingHigh = swingHighs[swingHighs.length - 1].price;
            if (c.close > lastSwingHigh && prevC.close > lastSwingHigh) continue; // Bullish CHoCH confirmed
          }
        }

        if (isBullTrend) {
          if (trendDirection !== "BULL") {
            trendDirection = "BULL";
            pullbacksInTrend = 0;
            highestHighInTrend = c.high;
          } else if (c.high > highestHighInTrend + currentATR * 0.8) {
            highestHighInTrend = c.high;
            pullbacksInTrend = 0;
          }
        } else if (isBearTrend) {
          if (trendDirection !== "BEAR") {
            trendDirection = "BEAR";
            pullbacksInTrend = 0;
            lowestLowInTrend = c.low;
          } else if (c.low < lowestLowInTrend - currentATR * 0.8) {
            lowestLowInTrend = c.low;
            pullbacksInTrend = 0;
          }
        } else {
          trendDirection = "NONE";
          pullbacksInTrend = 0;
        }

        if (pullbacksInTrend >= 12) continue;

        // Climax Guard: Distance from EMA200
        const distFromTrend = Math.abs(c.close - eTrend);
        if (distFromTrend > currentATR * params.climaxAtrLimit) {
          // If distance exceeds limit and RSI is also extreme, block entry
          if (isBullTrend && rVal > 68) continue;
          if (isBearTrend && rVal < 32) continue;
        }

        const isBuyPullback  = c.low <= eFast * 1.012 && c.close >= eSlow * 0.990 && rVal >= 30 && rVal <= 75;
        const isSellPullback = c.high >= eFast * 0.988 && c.close <= eSlow * 1.010 && rVal <= 70 && rVal >= 25;

        const candleRange = c.high - c.low;
        const lowerWick = Math.min(c.close, c.open) - c.low;
        const upperWick = c.high - Math.max(c.close, c.open);
        const candleBody = Math.abs(c.close - c.open);

        const recent3Lows = candles.slice(Math.max(0, i - 4), i).map((k) => k.low);
        const minRecentLow = Math.min(...recent3Lows);
        const hasBullSweep = c.low <= minRecentLow && c.close > minRecentLow;

        const recent3Highs = candles.slice(Math.max(0, i - 4), i).map((k) => k.high);
        const maxRecentHigh = Math.max(...recent3Highs);
        const hasBearSweep = c.high >= maxRecentHigh && c.close < maxRecentHigh;

        const isBullishRejection =
          candleRange > 0 &&
          ((lowerWick >= candleRange * 0.25 && c.close >= c.open) ||
           hasBullSweep ||
           (c.close > c.open && c.close > prevC.high));

        const isBearishRejection =
          candleRange > 0 &&
          ((upperWick >= candleRange * 0.25 && c.close <= c.open) ||
           hasBearSweep ||
           (c.close < c.open && c.close < prevC.low));

        let isHammer = candleRange > 0 && lowerWick >= candleRange * 0.60;
        let isShootingStar = candleRange > 0 && upperWick >= candleRange * 0.60;

        if (params.requireSolidHammer) {
          // Anti-Doji trap: if candle closes counter-trend, body must be at least 18% of range
          if (c.close < c.open && candleRange > 0 && candleBody / candleRange < 0.18) isHammer = false;
          if (c.close > c.open && candleRange > 0 && candleBody / candleRange < 0.18) isShootingStar = false;
        }

        const isRsiBullHook = rVal >= rValPrev;
        const isRsiBearHook = rVal <= rValPrev;

        if (isBullTrend && isBuyPullback && isBullishRejection && isRsiBullHook && (c.close > c.open || isHammer)) {
          const entry = c.close;
          const recentLows = candles.slice(Math.max(0, i - 5), i + 1).map((k) => k.low);
          const swingLow = Math.min(...recentLows);
          const slDist = Math.max(entry - swingLow + currentATR * 0.35, currentATR * 1.35, 2.5);

          const lookbackObstacle = candles.slice(Math.max(0, i - 24), i);
          const recentSwingHigh = Math.max(...lookbackObstacle.map((b) => b.high));
          if (recentSwingHigh > entry && (recentSwingHigh - entry) < slDist * 0.75) continue;

          pullbacksInTrend++;
          active = {
            type: "BUY",
            entryPrice: entry,
            sl: entry - slDist,
            tp08: entry + slDist * 0.8,
            tp1: entry + slDist * 1.0,
            tp2: entry + slDist * 2.0,
            beHit: false,
            tp1Hit: false,
          };
        } else if (isBearTrend && isSellPullback && isBearishRejection && isRsiBearHook && (c.close < c.open || isShootingStar)) {
          const entry = c.close;
          const recentHighs = candles.slice(Math.max(0, i - 5), i + 1).map((k) => k.high);
          const swingHigh = Math.max(...recentHighs);
          const slDist = Math.max(swingHigh - entry + currentATR * 0.35, currentATR * 1.35, 2.5);

          const lookbackObstacle = candles.slice(Math.max(0, i - 24), i);
          const recentSwingLow = Math.min(...lookbackObstacle.map((b) => b.low));
          if (recentSwingLow < entry && (entry - recentSwingLow) < slDist * 0.75) continue;

          pullbacksInTrend++;
          active = {
            type: "SELL",
            entryPrice: entry,
            sl: entry + slDist,
            tp08: entry - slDist * 0.8,
            tp1: entry - slDist * 1.0,
            tp2: entry - slDist * 2.0,
            beHit: false,
            tp1Hit: false,
          };
        }
      }
    }

    const wins = trades.filter((t) => t.result === "WIN").length;
    const losses = trades.filter((t) => t.result === "LOSS").length;
    const bes = trades.filter((t) => t.result === "BE").length;
    const wr = Number(((wins / (wins + losses)) * 100).toFixed(1));
    const netR = Number(trades.reduce((a, t) => a + t.pnlR, 0).toFixed(1));
    const netPips = Number(trades.reduce((a, t) => a + t.pnlPips, 0).toFixed(1));
    const gainR = trades.filter((t) => t.result === "WIN").reduce((a, t) => a + t.pnlR, 0);
    const lossR = Math.abs(trades.filter((t) => t.result === "LOSS").reduce((a, t) => a + t.pnlR, 0));
    const pf = lossR > 0 ? Number((gainR / lossR).toFixed(2)) : 99;

    return { total: trades.length, wins, losses, bes, wr, netR, netPips, pf };
  }

  function getQuarter(timestamp: number): string {
    const d = new Date(timestamp * 1000);
    const y = d.getUTCFullYear();
    const m = d.getUTCMonth();
    const q = Math.floor(m / 3) + 1;
    return `${y}-Q${q}`;
  }

  console.log("================================================================================");
  console.log(" 🎯 COMPARATIVE RESULTS: FINE-TUNED DAY TRADING FILTERS");
  console.log("================================================================================\n");

  const run1 = runBacktest({ climaxAtrLimit: 5.0, requireSolidHammer: false, chochProtection: false });
  console.log(`1. Current Day-Trade:         ${run1.total} trades | WR: ${run1.wr}% | PF: ${run1.pf} | Losses: ${run1.losses} | Net R: +${run1.netR}R`);

  const run2 = runBacktest({ climaxAtrLimit: 2.8, requireSolidHammer: false, chochProtection: false });
  console.log(`2. + Climax Guard (2.8 ATR):  ${run2.total} trades | WR: ${run2.wr}% | PF: ${run2.pf} | Losses: ${run2.losses} | Net R: +${run2.netR}R`);

  const run3 = runBacktest({ climaxAtrLimit: 2.8, requireSolidHammer: true, chochProtection: false });
  console.log(`3. + Anti-Doji Trap Rule:     ${run3.total} trades | WR: ${run3.wr}% | PF: ${run3.pf} | Losses: ${run3.losses} | Net R: +${run3.netR}R`);

  const run4 = runBacktest({ climaxAtrLimit: 2.8, requireSolidHammer: true, chochProtection: true });
  console.log(`4. + CHoCH Reversal Guard:    ${run4.total} trades | WR: ${run4.wr}% | PF: ${run4.pf} | Losses: ${run4.losses} | Net R: +${run4.netR}R`);
}

testFineTuning().catch(console.error);
