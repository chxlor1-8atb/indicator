import * as fs from "fs";
import * as path from "path";
import { Candle } from "../lib/types";
import { calculateATR, calculateEMA, calculateRSI, calculateADX } from "../lib/indicators";
import { resampleCandlesTo4H } from "../lib/marketService";

async function testRangeBoxIntegration() {
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

  let active: any = null;
  let trendDirection: "BULL" | "BEAR" | "NONE" = "NONE";
  let pullbacksInTrend = 0;
  let highestHighInTrend = 0;
  let lowestLowInTrend = Infinity;
  let lastTradeExitBar = -6;
  let lastConfirmedSwingHigh = 0;
  let lastConfirmedSwingLow = 0;
  const trades: any[] = [];

  for (let i = 35; i < candles.length; i++) {
    const c = candles[i];
    const prevC = candles[i - 1];

    if (i >= 5) {
      const p = candles[i - 2];
      if (p.high > candles[i - 3].high && p.high > candles[i - 1].high && p.high > (candles[i - 4]?.high || 0) && p.high > c.high) {
        lastConfirmedSwingHigh = p.high;
      }
      if (p.low < candles[i - 3].low && p.low < candles[i - 1].low && p.low < (candles[i - 4]?.low || Infinity) && p.low < c.low) {
        lastConfirmedSwingLow = p.low;
      }
    }

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
          trades.push({ type: "BUY", mode: active.mode, result: "WIN", pnlR: active.tpMultiplier, pnlPips: (active.tp2 - active.entryPrice) * 10 });
          active = null;
          lastTradeExitBar = i;
        } else if (c.low <= active.sl) {
          if (active.tp1Hit) {
            trades.push({ type: "BUY", mode: active.mode, result: "WIN", pnlR: 1.0, pnlPips: (active.tp1 - active.entryPrice) * 10 });
          } else if (active.beHit) {
            trades.push({ type: "BUY", mode: active.mode, result: "BE", pnlR: 0.1, pnlPips: (active.sl - active.entryPrice) * 10 });
          } else {
            trades.push({ type: "BUY", mode: active.mode, result: "LOSS", pnlR: -1.0, pnlPips: -(active.entryPrice - active.sl) * 10 });
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
          trades.push({ type: "SELL", mode: active.mode, result: "WIN", pnlR: active.tpMultiplier, pnlPips: (active.entryPrice - active.tp2) * 10 });
          active = null;
          lastTradeExitBar = i;
        } else if (c.high >= active.sl) {
          if (active.tp1Hit) {
            trades.push({ type: "SELL", mode: active.mode, result: "WIN", pnlR: 1.0, pnlPips: (active.entryPrice - active.tp1) * 10 });
          } else if (active.beHit) {
            trades.push({ type: "SELL", mode: active.mode, result: "BE", pnlR: 0.1, pnlPips: (active.entryPrice - active.sl) * 10 });
          } else {
            trades.push({ type: "SELL", mode: active.mode, result: "LOSS", pnlR: -1.0, pnlPips: -(active.sl - active.entryPrice) * 10 });
          }
          active = null;
          lastTradeExitBar = i;
        }
      }
    }

    if (!active) {
      if (i - lastTradeExitBar < 3) continue;

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

      const eFast = emaFast[i] ?? c.close;
      const eSlow = emaSlow[i] ?? c.close;
      const eTrend = emaTrend[i] ?? c.close;
      const rVal = rsi[i] ?? 50;
      const rValPrev = rsi[i - 1] ?? 50;
      const adxVal = adx[i] ?? 25;
      const currentATR = atrs[i] ?? 10;
      const isExplosive = adxVal >= 28;

      const isBullTrend = eFast > eSlow && c.close > eTrend;
      const isBearTrend = eFast < eSlow && c.close < eTrend;

      // ─── BRANCH 1: TREND SWING (ADX >= 18) ───
      if (adxVal >= 18) {
        if (isBullTrend && dynamicHtfBias === "BEAR") continue;
        if (isBearTrend && dynamicHtfBias === "BULL") continue;

        if (isBullTrend && lastConfirmedSwingLow > 0 && c.close < lastConfirmedSwingLow && prevC.close < lastConfirmedSwingLow) continue;
        if (isBearTrend && lastConfirmedSwingHigh > 0 && c.close > lastConfirmedSwingHigh && prevC.close > lastConfirmedSwingHigh) continue;

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

        const distFromTrend = Math.abs(c.close - eTrend);
        if (distFromTrend > currentATR * 3.0) {
          if (isBullTrend && rVal > 68) continue;
          if (isBearTrend && rVal < 32) continue;
        }
        if (distFromTrend > currentATR * 4.5) continue;

        const isBuyPullback  = c.low <= eFast * 1.012 && c.close >= eSlow * 0.990 && rVal >= 30 && rVal <= 75;
        const isSellPullback = c.high >= eFast * 0.988 && c.close <= eSlow * 1.010 && rVal <= 70 && rVal >= 25;

        const candleRange = c.high - c.low;
        const candleBody = Math.abs(c.close - c.open);
        const lowerWick = Math.min(c.close, c.open) - c.low;
        const upperWick = c.high - Math.max(c.close, c.open);

        const recent3Lows = candles.slice(Math.max(0, i - 4), i).map((k) => k.low);
        const minRecentLow = Math.min(...recent3Lows);
        const hasBullSweep = c.low <= minRecentLow && c.close > minRecentLow;

        const recent3Highs = candles.slice(Math.max(0, i - 4), i).map((k) => k.high);
        const maxRecentHigh = Math.max(...recent3Highs);
        const hasBearSweep = c.high >= maxRecentHigh && c.close < maxRecentHigh;

        const isBullishRejection = candleRange > 0 && ((lowerWick >= candleRange * 0.25 && c.close >= c.open) || hasBullSweep || (c.close > c.open && c.close > prevC.high));
        const isBearishRejection = candleRange > 0 && ((upperWick >= candleRange * 0.25 && c.close <= c.open) || hasBearSweep || (c.close < c.open && c.close < prevC.low));

        const isHammer = candleRange > 0 && lowerWick >= candleRange * 0.60 && (c.close >= c.open || candleBody >= candleRange * 0.18);
        const isShootingStar = candleRange > 0 && upperWick >= candleRange * 0.60 && (c.close <= c.open || candleBody >= candleRange * 0.18);

        if (isBullTrend && isBuyPullback && isBullishRejection && rVal >= rValPrev && (c.close > c.open || isHammer)) {
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
            mode: "TREND_SWING",
            entryPrice: entry,
            sl: entry - slDist,
            tp08: entry + slDist * 0.8,
            tp1: entry + slDist * 1.0,
            tp2: entry + slDist * 2.0,
            tpMultiplier: 2.0,
            beHit: false,
            tp1Hit: false,
          };
          continue;
        } else if (isBearTrend && isSellPullback && isBearishRejection && rVal <= rValPrev && (c.close < c.open || isShootingStar)) {
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
            mode: "TREND_SWING",
            entryPrice: entry,
            sl: entry + slDist,
            tp08: entry - slDist * 0.8,
            tp1: entry - slDist * 1.0,
            tp2: entry - slDist * 2.0,
            tpMultiplier: 2.0,
            beHit: false,
            tp1Hit: false,
          };
          continue;
        }
      }

      // ─── BRANCH 2: SIDEWAY RANGE BOX TRADING (ADX < 18 or Consolidation) ───
      else {
        // Calculate 20-bar box boundaries
        const boxCandles = candles.slice(Math.max(0, i - 20), i);
        const boxHigh = Math.max(...boxCandles.map((k) => k.high));
        const boxLow = Math.min(...boxCandles.map((k) => k.low));
        const boxHeight = boxHigh - boxLow;
        const boxMid = (boxHigh + boxLow) / 2;

        // Healthy box: between 1.5x and 4.0x ATR
        if (boxHeight >= currentATR * 1.5 && boxHeight <= currentATR * 4.0) {
          const candleRange = c.high - c.low;
          const lowerWick = Math.min(c.close, c.open) - c.low;
          const upperWick = c.high - Math.max(c.close, c.open);

          // 1. Buy Box Floor: Price touches bottom 25% of Box + Bullish rejection + RSI oversold/hook
          const isAtBoxFloor = c.low <= boxLow + boxHeight * 0.25;
          const isFloorReject = candleRange > 0 && ((lowerWick >= candleRange * 0.35) || (c.close > c.open));
          const isRsiFloorHook = rVal <= 45 && rVal >= rValPrev;

          if (isAtBoxFloor && isFloorReject && isRsiFloorHook && dynamicHtfBias !== "BEAR") {
            const entry = c.close;
            const slDist = Math.max(entry - boxLow + currentATR * 0.35, currentATR * 1.0, 2.5);
            const targetMid = boxMid;
            const targetHigh = boxHigh - currentATR * 0.3;
            const tpDist = targetHigh - entry;

            if (tpDist >= slDist * 1.15) {
              active = {
                type: "BUY",
                mode: "SIDEWAY_BOX",
                entryPrice: entry,
                sl: entry - slDist,
                tp08: entry + slDist * 0.7,
                tp1: targetMid,
                tp2: targetHigh,
                tpMultiplier: 1.5,
                beHit: false,
                tp1Hit: false,
              };
              continue;
            }
          }

          // 2. Sell Box Ceiling: Price touches top 25% of Box + Bearish rejection + RSI overbought/hook
          const isAtBoxCeiling = c.high >= boxHigh - boxHeight * 0.25;
          const isCeilingReject = candleRange > 0 && ((upperWick >= candleRange * 0.35) || (c.close < c.open));
          const isRsiCeilingHook = rVal >= 55 && rVal <= rValPrev;

          if (isAtBoxCeiling && isCeilingReject && isRsiCeilingHook && dynamicHtfBias !== "BULL") {
            const entry = c.close;
            const slDist = Math.max(boxHigh - entry + currentATR * 0.35, currentATR * 1.0, 2.5);
            const targetMid = boxMid;
            const targetLow = boxLow + currentATR * 0.3;
            const tpDist = entry - targetLow;

            if (tpDist >= slDist * 1.15) {
              active = {
                type: "SELL",
                mode: "SIDEWAY_BOX",
                entryPrice: entry,
                sl: entry + slDist,
                tp08: entry - slDist * 0.7,
                tp1: targetMid,
                tp2: targetLow,
                tpMultiplier: 1.5,
                beHit: false,
                tp1Hit: false,
              };
              continue;
            }
          }
        }
      }
    }
  }

  const trendTrades = trades.filter((t) => t.mode === "TREND_SWING");
  const boxTrades = trades.filter((t) => t.mode === "SIDEWAY_BOX");

  console.log("================================================================================");
  console.log(" 🏆 INTEGRATED RESULTS: TREND SWING + SIDEWAY BOX TRADING");
  console.log("================================================================================\n");

  const calcReport = (ts: any[], title: string) => {
    const wins = ts.filter((t) => t.result === "WIN");
    const losses = ts.filter((t) => t.result === "LOSS");
    const bes = ts.filter((t) => t.result === "BE");
    const wr = Number(((wins.length / (wins.length + losses.length)) * 100).toFixed(1));
    const netR = Number(ts.reduce((a, t) => a + t.pnlR, 0).toFixed(1));
    const netPips = Number(ts.reduce((a, t) => a + t.pnlPips, 0).toFixed(1));
    const gainR = wins.reduce((a, t) => a + t.pnlR, 0);
    const lossR = Math.abs(losses.reduce((a, t) => a + t.pnlR, 0));
    const pf = lossR > 0 ? Number((gainR / lossR).toFixed(2)) : 99;

    console.log(`[${title}]`);
    console.log(`- จำนวนไม้: ${ts.length} ไม้ (ชนะ ${wins.length} | แพ้ ${losses.length} | เสมอ ${bes.length})`);
    console.log(`- Win Rate: ${wr}% | Profit Factor: ${pf} | Net Pips: +${netPips} pips | Net R: +${netR}R\n`);
  };

  calcReport(trendTrades, "1. TREND SWING (เทรนด์ใหญ่)");
  calcReport(boxTrades, "2. SIDEWAY BOX (กรอบไซด์เวย์)");
  calcReport(trades, "🌟 COMBINED TOTAL (รวมเทรนด์ + ไซด์เวย์)");
}

testRangeBoxIntegration().catch(console.error);
