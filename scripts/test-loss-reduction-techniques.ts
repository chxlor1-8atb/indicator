import * as fs from "fs";
import * as path from "path";
import { Candle } from "../lib/types";
import { calculateATR, calculateEMA, calculateRSI, calculateADX } from "../lib/indicators";
import { resampleCandlesTo4H } from "../lib/marketService";
import { optimizeIndicatorParameters } from "../lib/optimizerEngine";

async function testLossReduction() {
  const dataPath = path.resolve(process.cwd(), "data", "xauusd_1h_deep.json");
  const candles: Candle[] = JSON.parse(fs.readFileSync(dataPath, "utf-8"));

  const opt = optimizeIndicatorParameters(candles, "XAUUSD");
  const emaFast = calculateEMA(candles, opt.isOptimized ? opt.emaFast : 20);
  const emaSlow = calculateEMA(candles, opt.isOptimized ? opt.emaSlow : 50);
  const emaTrend = calculateEMA(candles, opt.isOptimized ? opt.emaTrend : 200);
  const rsi = calculateRSI(candles, opt.isOptimized ? opt.rsiPeriod : 14);
  const adx = calculateADX(candles, 14);
  const atrs = calculateATR(candles, 14);

  const candles4H = resampleCandlesTo4H(candles);
  const ema20_4H = calculateEMA(candles4H, 20);
  const ema50_4H = calculateEMA(candles4H, 50);
  const ema200_4H = calculateEMA(candles4H, 200);

  const fourHourMap = new Map<number, number>();
  for (let k = 0; k < candles4H.length; k++) fourHourMap.set(candles4H[k].time, k);

  function simulate(opts: {
    beTriggerRatio: number; // e.g. 0.45 vs 0.70/0.80
    timeStopBars: number;   // e.g. 6 bars stagnation exit
    strictChoch: boolean;
  }) {
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
        if (p.high > candles[i - 3].high && p.high > candles[i - 1].high && p.high > (candles[i - 4]?.high || 0) && p.high > c.high) lastConfirmedSwingHigh = p.high;
        if (p.low < candles[i - 3].low && p.low < candles[i - 1].low && p.low < (candles[i - 4]?.low || Infinity) && p.low < c.low) lastConfirmedSwingLow = p.low;
      }

      // Active Trade Management
      if (active) {
        const barsHeld = i - active.entryBar;

        if (active.type === "BUY") {
          // Early Breakeven Trigger
          if (!active.beHit && c.high >= active.entryPrice + active.originalRisk * opts.beTriggerRatio) {
            active.beHit = true;
            active.sl = active.entryPrice + 0.1; // Lock risk to zero!
          }
          if (!active.tp1Hit && c.high >= active.tp1) {
            active.tp1Hit = true;
            active.sl = active.entryPrice + 0.2;
          }

          // Stagnation Time-Stop: If held for N bars and price is negative but hasn't hit SL -> scratch early!
          const isStagnant = opts.timeStopBars > 0 && barsHeld >= opts.timeStopBars && c.close < active.entryPrice && !active.tp1Hit;

          if (c.high >= active.tp2) {
            trades.push({ type: "BUY", result: "WIN", pnlR: 2.0, pnlPips: (active.tp2 - active.entryPrice) * 10 });
            active = null;
            lastTradeExitBar = i;
          } else if (c.low <= active.sl) {
            if (active.tp1Hit) trades.push({ type: "BUY", result: "WIN", pnlR: 1.0, pnlPips: (active.tp1 - active.entryPrice) * 10 });
            else if (active.beHit) trades.push({ type: "BUY", result: "BE", pnlR: 0.05, pnlPips: 1 });
            else trades.push({ type: "BUY", result: "LOSS", pnlR: -1.0, pnlPips: -(active.entryPrice - active.sl) * 10 });
            active = null;
            lastTradeExitBar = i;
          } else if (isStagnant) {
            // Cut stagnant trade with small scratch loss instead of full -1.0R
            const lossDist = active.entryPrice - c.close;
            trades.push({ type: "BUY", result: "BE", pnlR: -0.25, pnlPips: -lossDist * 10 });
            active = null;
            lastTradeExitBar = i;
          }
        } else {
          if (!active.beHit && c.low <= active.entryPrice - active.originalRisk * opts.beTriggerRatio) {
            active.beHit = true;
            active.sl = active.entryPrice - 0.1;
          }
          if (!active.tp1Hit && c.low <= active.tp1) {
            active.tp1Hit = true;
            active.sl = active.entryPrice - 0.2;
          }

          const isStagnant = opts.timeStopBars > 0 && barsHeld >= opts.timeStopBars && c.close > active.entryPrice && !active.tp1Hit;

          if (c.low <= active.tp2) {
            trades.push({ type: "SELL", result: "WIN", pnlR: 2.0, pnlPips: (active.entryPrice - active.tp2) * 10 });
            active = null;
            lastTradeExitBar = i;
          } else if (c.high >= active.sl) {
            if (active.tp1Hit) trades.push({ type: "SELL", result: "WIN", pnlR: 1.0, pnlPips: (active.entryPrice - active.tp1) * 10 });
            else if (active.beHit) trades.push({ type: "SELL", result: "BE", pnlR: 0.05, pnlPips: 1 });
            else trades.push({ type: "SELL", result: "LOSS", pnlR: -1.0, pnlPips: -(active.sl - active.entryPrice) * 10 });
            active = null;
            lastTradeExitBar = i;
          } else if (isStagnant) {
            const lossDist = c.close - active.entryPrice;
            trades.push({ type: "SELL", result: "BE", pnlR: -0.25, pnlPips: -lossDist * 10 });
            active = null;
            lastTradeExitBar = i;
          }
        }
      }

      if (!active) {
        if (i - lastTradeExitBar < 2) continue;

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

        const eFastVal = emaFast[i] ?? c.close;
        const eSlowVal = emaSlow[i] ?? c.close;
        const eTrendVal = emaTrend[i] ?? c.close;
        const rVal = rsi[i] ?? 50;
        const rValPrev = rsi[i - 1] ?? 50;
        const adxVal = adx[i] ?? 25;
        const currentATR = atrs[i] ?? Math.max(c.high - c.low, c.close * 0.005);

        const isBullTrend = eFastVal > eSlowVal && c.close > eTrendVal;
        const isBearTrend = eFastVal < eSlowVal && c.close < eTrendVal;

        const candleRange = c.high - c.low;
        const candleBody = Math.abs(c.close - c.open);
        const lowerWick = Math.min(c.close, c.open) - c.low;
        const upperWick = c.high - Math.max(c.close, c.open);

        // Trend Swing
        if (adxVal >= 18 && (isBullTrend || isBearTrend)) {
          if (isBullTrend && dynamicHtfBias === "BEAR") continue;
          if (isBearTrend && dynamicHtfBias === "BULL") continue;

          if (isBullTrend && lastConfirmedSwingLow > 0 && c.close < lastConfirmedSwingLow && prevC.close < lastConfirmedSwingLow) continue;
          if (isBearTrend && lastConfirmedSwingHigh > 0 && c.close > lastConfirmedSwingHigh && prevC.close > lastConfirmedSwingHigh) continue;

          const distFromTrend = Math.abs(c.close - eTrendVal);
          if (distFromTrend > currentATR * 3.0) {
            if (isBullTrend && rVal > 68) continue;
            if (isBearTrend && rVal < 32) continue;
          }
          if (distFromTrend > currentATR * 4.5) continue;

          const isBuyPullback  = c.low <= eFastVal * 1.012 && c.close >= eSlowVal * 0.990 && rVal >= 30 && rVal <= 75;
          const isSellPullback = c.high >= eFastVal * 0.988 && c.close <= eSlowVal * 1.010 && rVal <= 70 && rVal >= 25;

          const isBullishRejection = candleRange > 0 && ((lowerWick >= candleRange * 0.25 && c.close >= c.open) || (c.close > c.open && c.close > prevC.high));
          const isBearishRejection = candleRange > 0 && ((upperWick >= candleRange * 0.25 && c.close <= c.open) || (c.close < c.open && c.close < prevC.low));

          const isHammer = candleRange > 0 && lowerWick >= candleRange * 0.60 && (c.close >= c.open || candleBody >= candleRange * 0.18);
          const isShootingStar = candleRange > 0 && upperWick >= candleRange * 0.60 && (c.close <= c.open || candleBody >= candleRange * 0.18);

          if (isBullTrend && isBuyPullback && isBullishRejection && rVal >= rValPrev && (c.close > c.open || isHammer)) {
            const entry = c.close;
            const recentLows = candles.slice(Math.max(0, i - 5), i + 1).map((k) => k.low);
            const slDist = Math.max(entry - Math.min(...recentLows) + currentATR * 0.35, currentATR * 1.35, 2.5);

            active = {
              type: "BUY",
              entryBar: i,
              entryPrice: entry,
              sl: entry - slDist,
              originalRisk: slDist,
              tp1: entry + slDist * 1.0,
              tp2: entry + slDist * 2.0,
              beHit: false,
              tp1Hit: false,
            };
            continue;
          } else if (isBearTrend && isSellPullback && isBearishRejection && rVal <= rValPrev && (c.close < c.open || isShootingStar)) {
            const entry = c.close;
            const recentHighs = candles.slice(Math.max(0, i - 5), i + 1).map((k) => k.high);
            const slDist = Math.max(Math.max(...recentHighs) - entry + currentATR * 0.35, currentATR * 1.35, 2.5);

            active = {
              type: "SELL",
              entryBar: i,
              entryPrice: entry,
              sl: entry + slDist,
              originalRisk: slDist,
              tp1: entry - slDist * 1.0,
              tp2: entry - slDist * 2.0,
              beHit: false,
              tp1Hit: false,
            };
            continue;
          }
        }
        // Sideway Box
        else {
          const boxCandles = candles.slice(Math.max(0, i - 20), i);
          const boxHigh = Math.max(...boxCandles.map((k) => k.high));
          const boxLow = Math.min(...boxCandles.map((k) => k.low));
          const boxHeight = boxHigh - boxLow;
          const boxMid = (boxHigh + boxLow) / 2;

          if (boxHeight >= currentATR * 1.5 && boxHeight <= currentATR * 4.0) {
            const isAtBoxFloor = c.low <= boxLow + boxHeight * 0.25;
            const isFloorReject = candleRange > 0 && ((lowerWick >= candleRange * 0.35) || (c.close > c.open));
            const isRsiFloorHook = rVal <= 45 && rVal >= rValPrev;

            if (isAtBoxFloor && isFloorReject && isRsiFloorHook && dynamicHtfBias !== "BEAR") {
              const entry = c.close;
              const slDist = Math.max(entry - boxLow + currentATR * 0.35, currentATR * 1.0, 2.5);
              const targetHigh = boxHigh - currentATR * 0.3;

              if (targetHigh - entry >= slDist * 1.15) {
                active = {
                  type: "BUY",
                  entryBar: i,
                  entryPrice: entry,
                  sl: entry - slDist,
                  originalRisk: slDist,
                  tp1: boxMid,
                  tp2: targetHigh,
                  beHit: false,
                  tp1Hit: false,
                };
                continue;
              }
            } else {
              const isAtBoxCeiling = c.high >= boxHigh - boxHeight * 0.25;
              const isCeilingReject = candleRange > 0 && ((upperWick >= candleRange * 0.35) || (c.close < c.open));
              const isRsiCeilingHook = rVal >= 55 && rVal <= rValPrev;

              if (isAtBoxCeiling && isCeilingReject && isRsiCeilingHook && dynamicHtfBias !== "BULL") {
                const entry = c.close;
                const slDist = Math.max(boxHigh - entry + currentATR * 0.35, currentATR * 1.0, 2.5);
                const targetLow = boxLow + currentATR * 0.3;

                if (entry - targetLow >= slDist * 1.15) {
                  active = {
                    type: "SELL",
                    entryBar: i,
                    entryPrice: entry,
                    sl: entry + slDist,
                    originalRisk: slDist,
                    tp1: boxMid,
                    tp2: targetLow,
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
    }

    const wins = trades.filter((t) => t.result === "WIN").length;
    const losses = trades.filter((t) => t.result === "LOSS").length;
    const bes = trades.filter((t) => t.result === "BE").length;
    const total = trades.length;
    const wr = Number(((wins / (wins + losses)) * 100).toFixed(1));
    const noLossRate = Number((((wins + bes) / total) * 100).toFixed(1));
    const netR = Number(trades.reduce((a, t) => a + t.pnlR, 0).toFixed(1));
    const gainR = trades.filter((t) => t.result === "WIN").reduce((a, t) => a + t.pnlR, 0);
    const lossR = Math.abs(trades.filter((t) => t.result === "LOSS" || t.pnlR < 0).reduce((a, t) => a + t.pnlR, 0));
    const pf = lossR > 0 ? Number((gainR / lossR).toFixed(2)) : 99;

    return { total, wins, losses, bes, wr, noLossRate, netR, pf };
  }

  console.log("================================================================================");
  console.log(" 🧪 EXPERIMENTS: LOSS REDUCTION & NO-LOSS PROTECTION MAXIMIZATION");
  console.log("================================================================================\n");

  const r1 = simulate({ beTriggerRatio: 0.80, timeStopBars: 0, strictChoch: false });
  console.log(`1. Baseline (Current):          ${r1.total} trades | Losses: ${r1.losses} | Wins: ${r1.wins} | BE: ${r1.bes} | WR: ${r1.wr}% | No-Loss: ${r1.noLossRate}% | Net R: +${r1.netR}R | PF: ${r1.pf}`);

  const r2 = simulate({ beTriggerRatio: 0.45, timeStopBars: 0, strictChoch: false });
  console.log(`2. Ultra-Early BE (+0.45R):     ${r2.total} trades | Losses: ${r2.losses} 📉 | Wins: ${r2.wins} | BE: ${r2.bes} 🛡️ | WR: ${r2.wr}% | No-Loss: ${r2.noLossRate}% | Net R: +${r2.netR}R | PF: ${r2.pf}`);

  const r3 = simulate({ beTriggerRatio: 0.40, timeStopBars: 6, strictChoch: false });
  console.log(`3. + 6H Stagnation Time-Stop:   ${r3.total} trades | Losses: ${r3.losses} 📉 | Wins: ${r3.wins} | BE: ${r3.bes} 🛡️ | WR: ${r3.wr}% | No-Loss: ${r3.noLossRate}% | Net R: +${r3.netR}R | PF: ${r3.pf}`);
}

testLossReduction().catch(console.error);
