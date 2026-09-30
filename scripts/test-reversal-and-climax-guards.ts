import * as fs from "fs";
import * as path from "path";
import { Candle } from "../lib/types";
import { calculateEMA, calculateRSI, calculateADX, calculateATR } from "../lib/indicators";
import { resampleCandlesTo4H } from "../lib/marketService";

async function testImprovements() {
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

  function simulate(opts: {
    maxDistATR: number; // e.g. 2.4 vs 5.0
    requireCleanBody: boolean; // reject Doji trap wicks
    useMSSProtection: boolean; // detect real CHoCH vs fake reversal
  }) {
    let active: any = null;
    let trendDirection: "BULL" | "BEAR" | "NONE" = "NONE";
    let pullbacksInTrend = 0;
    let highestHighInTrend = 0;
    let lowestLowInTrend = Infinity;
    let lastTradeExitBar = -6;
    const trades: any[] = [];

    // Track swing highs and lows for CHoCH / MSS (Market Structure Shift)
    let lastMajorSwingHigh = 0;
    let lastMajorSwingLow = 0;

    for (let i = 35; i < candles.length; i++) {
      const c = candles[i];
      const prevC = candles[i - 1];

      // Update structural swing points
      if (i >= 5) {
        const isSwingHigh = candles[i - 2].high > candles[i - 4].high &&
                            candles[i - 2].high > candles[i - 3].high &&
                            candles[i - 2].high > candles[i - 1].high &&
                            candles[i - 2].high > candles[i].high;
        if (isSwingHigh) lastMajorSwingHigh = candles[i - 2].high;

        const isSwingLow = candles[i - 2].low < candles[i - 4].low &&
                           candles[i - 2].low < candles[i - 3].low &&
                           candles[i - 2].low < candles[i - 1].low &&
                           candles[i - 2].low < candles[i].low;
        if (isSwingLow) lastMajorSwingLow = candles[i - 2].low;
      }

      // Trade management
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
            trades.push({ type: "BUY", result: "WIN", pnlR: 2.0, pnlPips: (active.tp2 - active.entryPrice) * 10 });
            active = null;
            lastTradeExitBar = i;
          } else if (c.low <= active.sl) {
            if (active.tp1Hit) {
              trades.push({ type: "BUY", result: "WIN", pnlR: 1.0, pnlPips: (active.tp1 - active.entryPrice) * 10 });
            } else if (active.beHit) {
              trades.push({ type: "BUY", result: "BE", pnlR: 0.1, pnlPips: (active.sl - active.entryPrice) * 10 });
            } else {
              trades.push({ type: "BUY", result: "LOSS", pnlR: -1.0, pnlPips: -(active.entryPrice - active.sl) * 10 });
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
            trades.push({ type: "SELL", result: "WIN", pnlR: 2.0, pnlPips: (active.entryPrice - active.tp2) * 10 });
            active = null;
            lastTradeExitBar = i;
          } else if (c.high >= active.sl) {
            if (active.tp1Hit) {
              trades.push({ type: "SELL", result: "WIN", pnlR: 1.0, pnlPips: (active.entryPrice - active.tp1) * 10 });
            } else if (active.beHit) {
              trades.push({ type: "SELL", result: "BE", pnlR: 0.1, pnlPips: (active.entryPrice - active.sl) * 10 });
            } else {
              trades.push({ type: "SELL", result: "LOSS", pnlR: -1.0, pnlPips: -(active.sl - active.entryPrice) * 10 });
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

        // Dynamic 4H Bias
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

        // Market Structure Shift (MSS / CHoCH) Protection:
        // If in Bull trend, but price closed BELOW last major swing low (CHoCH to downside) -> DO NOT BUY! Real reversal beginning!
        if (opts.useMSSProtection) {
          if (isBullTrend && lastMajorSwingLow > 0 && c.close < lastMajorSwingLow) continue; // Real Bearish CHoCH
          if (isBearTrend && lastMajorSwingHigh > 0 && c.close > lastMajorSwingHigh) continue; // Real Bullish CHoCH
        }

        // Pullback tracking
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

        // Climax / Overextension filter
        const distFromTrend = Math.abs(c.close - eTrend);
        if (distFromTrend > currentATR * opts.maxDistATR) continue;

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

        if (opts.requireCleanBody) {
          // Reject Doji trap wicks: Body must be at least 15% of range OR candle closes in trend direction
          if (candleRange > 0 && candleBody / candleRange < 0.15 && c.close <= c.open) isHammer = false;
          if (candleRange > 0 && candleBody / candleRange < 0.15 && c.close >= c.open) isShootingStar = false;
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

  console.log("================================================================================");
  console.log(" 🧪 EXPERIMENT MATRIX: SOLVING REVERSALS & CLIMAX LOSSES");
  console.log("================================================================================\n");

  const baseline = simulate({ maxDistATR: 5.0, requireCleanBody: false, useMSSProtection: false });
  console.log(`1. Baseline (Current):          ${baseline.total} trades | WR: ${baseline.wr}% | PF: ${baseline.pf} | Losses: ${baseline.losses} | Net R: +${baseline.netR}R`);

  const exp1 = simulate({ maxDistATR: 3.5, requireCleanBody: false, useMSSProtection: false });
  console.log(`2. Climax Guard (3.5 ATR):      ${exp1.total} trades | WR: ${exp1.wr}% | PF: ${exp1.pf} | Losses: ${exp1.losses} | Net R: +${exp1.netR}R`);

  const exp2 = simulate({ maxDistATR: 3.5, requireCleanBody: true, useMSSProtection: false });
  console.log(`3. + Reject Doji Trap Wicks:    ${exp2.total} trades | WR: ${exp2.wr}% | PF: ${exp2.pf} | Losses: ${exp2.losses} | Net R: +${exp2.netR}R`);

  const exp3 = simulate({ maxDistATR: 3.5, requireCleanBody: true, useMSSProtection: true });
  console.log(`4. + MSS / CHoCH Reversal Guard:${exp3.total} trades | WR: ${exp3.wr}% | PF: ${exp3.pf} | Losses: ${exp3.losses} | Net R: +${exp3.netR}R`);

  const exp4 = simulate({ maxDistATR: 3.8, requireCleanBody: true, useMSSProtection: true });
  console.log(`5. + Balanced Climax (3.8 ATR): ${exp4.total} trades | WR: ${exp4.wr}% | PF: ${exp4.pf} | Losses: ${exp4.losses} | Net R: +${exp4.netR}R`);
}

testImprovements().catch(console.error);
