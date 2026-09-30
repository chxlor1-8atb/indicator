import * as fs from "fs";
import * as path from "path";
import { Candle } from "../lib/types";
import {
  calculateEMA,
  calculateRSI,
  calculateADX,
  calculateATR,
  calculateBollingerBands,
  calculateVolumeDelta,
  calculateTDSequential,
  calculateQuasimodoPattern,
} from "../lib/indicators";
import { optimizeIndicatorParameters } from "../lib/optimizerEngine";
import { getTradingSessionPhase } from "../lib/sessionEngine";
import { resampleCandlesTo4H } from "../lib/marketService";

const dataPath = path.resolve(process.cwd(), "data", "xauusd_1h_deep.json");
const candles: Candle[] = JSON.parse(fs.readFileSync(dataPath, "utf-8"));

const opt = optimizeIndicatorParameters(candles, "XAUUSD");
const emaFastPeriod = opt.isOptimized ? opt.emaFast : 20;
const emaSlowPeriod = opt.isOptimized ? opt.emaSlow : 50;
const emaTrendPeriod = opt.isOptimized ? opt.emaTrend : 200;
const rsiPeriod = opt.isOptimized ? opt.rsiPeriod : 14;
const effectiveTP = opt.isOptimized ? opt.tpMultiplier : 2.0;

const emaFast = calculateEMA(candles, emaFastPeriod);
const emaSlow = calculateEMA(candles, emaSlowPeriod);
const emaTrend = calculateEMA(candles, emaTrendPeriod);
const rsi = calculateRSI(candles, rsiPeriod);
const adx = calculateADX(candles, 14);
const atrs = calculateATR(candles, 14);
const bBands = calculateBollingerBands(candles, 20, 2.0);

const candles4H = resampleCandlesTo4H(candles);
const ema20_4H = calculateEMA(candles4H, 20);
const ema50_4H = calculateEMA(candles4H, 50);
const ema200_4H = calculateEMA(candles4H, 200);

const fourHourMap = new Map<number, number>();
for (let k = 0; k < candles4H.length; k++) fourHourMap.set(candles4H[k].time, k);

function testMaxDist(maxDistMult: number) {
  const precision = 2;
  const pipMultiplier = 10;
  const isGold = true;
  const minBuffer = 2.50;

  const trades: any[] = [];
  let active: any = null;
  let lastTradeExitBar = -6;
  let lastConfirmedSwingHigh = 0;
  let lastConfirmedSwingLow = 0;
  let pullbacksInTrend = 0;
  let trendDirection = "NONE";
  let highestHighInTrend = 0;
  let lowestLowInTrend = Infinity;

  const tpMultiplier = effectiveTP;
  const tp1Ratio = 0.65;
  const minADX = 18;
  const minWickPct = 0.25;

  for (let i = 35; i < candles.length; i++) {
    const c = candles[i];
    const prevC = candles[i - 1];

    if (i >= 5) {
      const p = candles[i - 2];
      if (p.high > candles[i - 3].high && p.high > candles[i - 1].high && p.high > (candles[i - 4]?.high || 0) && p.high > c.high) lastConfirmedSwingHigh = p.high;
      if (p.low < candles[i - 3].low && p.low < candles[i - 1].low && p.low < (candles[i - 4]?.low || Infinity) && p.low < c.low) lastConfirmedSwingLow = p.low;
    }

    if (active) {
      const barsInTrade = i - active.entryIndex;

      if (active.type === "BUY") {
        if (!active.beHit && c.high >= active.tp08) {
          active.beHit = true;
          const bufferR = isGold ? 0.08 : 0;
          active.sl = Number((active.entryPrice - active.originalRisk * bufferR).toFixed(precision));
        }
        if (!active.tp1Hit && c.high >= active.tp1) {
          active.tp1Hit = true;
          active.sl = active.entryPrice;
        }
        if (barsInTrade >= 3 && !active.tp1Hit && c.close > active.entryPrice) {
          trades.push({ type: "BUY", result: "WIN", pnlR: 0.2, pnlPips: (c.close - active.entryPrice) * pipMultiplier });
          active = null;
          lastTradeExitBar = i;
          continue;
        }

        if (c.high >= active.tp2) {
          trades.push({ type: "BUY", result: "WIN", pnlR: tpMultiplier, pnlPips: (active.tp2 - active.entryPrice) * pipMultiplier });
          active = null;
          lastTradeExitBar = i;
        } else if (c.low <= active.sl) {
          if (active.tp1Hit) {
            trades.push({ type: "BUY", result: "WIN", pnlR: tp1Ratio, pnlPips: (active.tp1 - active.entryPrice) * pipMultiplier });
          } else if (active.beHit) {
            trades.push({ type: "BUY", result: "WIN", pnlR: 0.15, pnlPips: Math.abs(active.sl - active.entryPrice) * pipMultiplier });
          } else {
            trades.push({ type: "BUY", result: "LOSS", pnlR: -1.0, pnlPips: -Math.abs(active.entryPrice - active.sl) * pipMultiplier });
          }
          active = null;
          lastTradeExitBar = i;
        }
      } else {
        if (!active.beHit && c.low <= active.tp08) {
          active.beHit = true;
          const bufferR = isGold ? 0.08 : 0;
          active.sl = Number((active.entryPrice + active.originalRisk * bufferR).toFixed(precision));
        }
        if (!active.tp1Hit && c.low <= active.tp1) {
          active.tp1Hit = true;
          active.sl = active.entryPrice;
        }
        if (barsInTrade >= 3 && !active.tp1Hit && c.close < active.entryPrice) {
          trades.push({ type: "SELL", result: "WIN", pnlR: 0.2, pnlPips: (active.entryPrice - c.close) * pipMultiplier });
          active = null;
          lastTradeExitBar = i;
          continue;
        }

        if (c.low <= active.tp2) {
          trades.push({ type: "SELL", result: "WIN", pnlR: tpMultiplier, pnlPips: (active.entryPrice - active.tp2) * pipMultiplier });
          active = null;
          lastTradeExitBar = i;
        } else if (c.high >= active.sl) {
          if (active.tp1Hit) {
            trades.push({ type: "SELL", result: "WIN", pnlR: tp1Ratio, pnlPips: (active.entryPrice - active.tp1) * pipMultiplier });
          } else if (active.beHit) {
            trades.push({ type: "SELL", result: "WIN", pnlR: 0.15, pnlPips: Math.abs(active.entryPrice - active.sl) * pipMultiplier });
          } else {
            trades.push({ type: "SELL", result: "LOSS", pnlR: -1.0, pnlPips: -Math.abs(active.sl - active.entryPrice) * pipMultiplier });
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
      const isExplosive = adxVal >= 28;
      const isSqueeze = adxVal < 20;
      const currentATR = atrs[i] ?? Math.max(c.high - c.low, c.close * 0.005);
      const candleRange = c.high - c.low;
      const candleBody = Math.abs(c.close - c.open);
      const lowerWick = Math.min(c.close, c.open) - c.low;
      const upperWick = c.high - Math.max(c.close, c.open);
      const bodyQuality = candleRange > 0 ? candleBody / candleRange : 0;

      const bb = bBands[i];
      const bbBandwidth = bb?.bandwidth ?? 100;
      const isExtremeSqueeze = bbBandwidth < 1.5;
      const isNormalSqueeze = bbBandwidth < 3.0;

      const sessionPhase = getTradingSessionPhase(c.time);
      const dDate = new Date(c.time > 1e11 ? c.time : c.time * 1000);
      const thaiHour = (dDate.getUTCHours() + 7) % 24;

      if (sessionPhase.phase === "DEAD_ZONE") continue;
      if ((thaiHour >= 22 || thaiHour === 0) && adxVal < 24) continue;
      if (isGold && thaiHour >= 6 && thaiHour <= 8) {
        if (adxVal < 20 || bodyQuality < 0.32) continue;
      }

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

      const qmSlice = candles.slice(Math.max(0, i - 40), i + 1);
      const qm = calculateQuasimodoPattern(qmSlice, precision);

      if (adxVal >= minADX && (isBullTrend || isBearTrend)) {
        if (isBullTrend && dynamicHtfBias === "BEAR") continue;
        if (isBearTrend && dynamicHtfBias === "BULL") continue;

        if (isBullTrend && lastConfirmedSwingLow > 0 && c.close < lastConfirmedSwingLow && prevC.close < lastConfirmedSwingLow) continue;
        if (isBearTrend && lastConfirmedSwingHigh > 0 && c.close > lastConfirmedSwingHigh && prevC.close > lastConfirmedSwingHigh) continue;

        const recent3 = candles.slice(Math.max(0, i - 4), i + 1);
        if (isBullTrend && lastConfirmedSwingLow > 0) {
          const hasDisplacementBreak = recent3.some(b => b.close < lastConfirmedSwingLow && Math.abs(b.close - b.open) >= currentATR * 1.1);
          if (hasDisplacementBreak) continue;
        }
        if (isBearTrend && lastConfirmedSwingHigh > 0) {
          const hasDisplacementBreak = recent3.some(b => b.close > lastConfirmedSwingHigh && Math.abs(b.close - b.open) >= currentATR * 1.1);
          if (hasDisplacementBreak) continue;
        }

        if (qm && qm.detected && qm.isQmlHeld) {
          if (isBullTrend && qm.type === "BEARISH_QM" && qm.qmlPrice > c.close && qm.qmlPrice - c.close < currentATR * 1.8) continue;
          if (isBearTrend && qm.type === "BULLISH_QM" && qm.qmlPrice < c.close && c.close - qm.qmlPrice < currentATR * 1.8) continue;
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
        }

        if (pullbacksInTrend >= 12) continue;
        const distFromTrend = Math.abs(c.close - eTrend);
        if (distFromTrend > currentATR * 2.5) {
          if (isBullTrend && rVal > 65) continue;
          if (isBearTrend && rVal < 35) continue;
        }
        if (distFromTrend > currentATR * maxDistMult) continue;

        const isBuyPullback  = c.low <= eFast * 1.012 && c.close >= eSlow * 0.990 && rVal >= 30 && rVal <= 75;
        const isSellPullback = c.high >= eFast * 0.988 && c.close <= eSlow * 1.010 && rVal <= 70 && rVal >= 25;

        const recent3Lows = candles.slice(Math.max(0, i - 4), i).map((k) => k.low);
        const minRecentLow = Math.min(...recent3Lows);
        const hasBullSweep = c.low <= minRecentLow && c.close > minRecentLow;

        const recent3Highs = candles.slice(Math.max(0, i - 4), i).map((k) => k.high);
        const maxRecentHigh = Math.max(...recent3Highs);
        const hasBearSweep = c.high >= maxRecentHigh && c.close < maxRecentHigh;

        const isBullishRejection = candleRange > 0 && ((lowerWick >= candleRange * minWickPct && c.close >= c.open) || hasBullSweep || (c.close > c.open && c.close > prevC.high));
        const isBearishRejection = candleRange > 0 && ((upperWick >= candleRange * minWickPct && c.close <= c.open) || hasBearSweep || (c.close < c.open && c.close < prevC.low));

        const isRsiBullHook = rVal >= rValPrev;
        const isRsiBearHook = rVal <= rValPrev;

        const isHammer = candleRange > 0 && lowerWick >= candleRange * 0.60 && (c.close >= c.open || candleBody >= candleRange * 0.18);
        const isShootingStar = candleRange > 0 && upperWick >= candleRange * 0.60 && (c.close <= c.open || candleBody >= candleRange * 0.18);

        if (isBullTrend && isBuyPullback && isBullishRejection && isRsiBullHook && (c.close > c.open || isHammer)) {
          if (bodyQuality < 0.28 && !isHammer && !hasBullSweep) continue;

          const volSlice = candles.slice(Math.max(0, i - 13), i + 1);
          const volDelta = calculateVolumeDelta(volSlice);
          if (volDelta.sellerVolumePct > 60 && !volDelta.isAbsorption) continue;

          const tdSlice = candles.slice(Math.max(0, i - 20), i + 1);
          const tdSeq = calculateTDSequential(tdSlice);
          if (tdSeq.isExhausted && tdSeq.exhaustionType === "BUY_EXHAUSTION_9") continue;

          if (isExtremeSqueeze) continue;

          const entry = Number(Math.min(c.close, eFast * 1.001).toFixed(precision));
          const recentLows = candles.slice(Math.max(0, i - 5), i + 1).map((k) => k.low);
          const swingLow = Math.min(...recentLows);

          const atrMultSL = isNormalSqueeze ? (isExplosive ? 0.55 : 0.42) : (isExplosive ? 0.45 : isSqueeze ? 0.20 : 0.35);
          const slDist = Math.max(entry - swingLow + currentATR * atrMultSL, currentATR * 1.35, minBuffer);

          const lookbackObstacle = candles.slice(Math.max(0, i - 24), i);
          const recentSwingHigh = Math.max(...lookbackObstacle.map((b) => b.high));
          if (recentSwingHigh > entry && (recentSwingHigh - entry) < slDist * 0.75) continue;

          let adaptiveTP = isExplosive ? tpMultiplier * 1.2 : tpMultiplier;
          if (sessionPhase.phase === "NIGHT") adaptiveTP += 0.3;
          const beRatio = sessionPhase.phase === "MORNING" ? 0.45 : sessionPhase.phase === "AFTERNOON" ? 0.48 : 0.52;

          pullbacksInTrend++;
          active = {
            type: "BUY",
            entryPrice: entry,
            entryTime: c.time,
            entryIndex: i,
            sl: Number((entry - slDist).toFixed(precision)),
            originalRisk: slDist,
            tp08: Number((entry + slDist * beRatio).toFixed(precision)),
            tp1: Number((entry + slDist * tp1Ratio).toFixed(precision)),
            tp2: Number((entry + slDist * adaptiveTP).toFixed(precision)),
            beHit: false,
            tp1Hit: false,
            regime: "TREND",
          };
        } else if (isBearTrend && isSellPullback && isBearishRejection && isRsiBearHook && (c.close < c.open || isShootingStar)) {
          if (bodyQuality < 0.28 && !isShootingStar && !hasBearSweep) continue;

          const volSlice = candles.slice(Math.max(0, i - 13), i + 1);
          const volDelta = calculateVolumeDelta(volSlice);
          if (volDelta.buyerVolumePct > 60 && !volDelta.isAbsorption) continue;

          const tdSlice = candles.slice(Math.max(0, i - 20), i + 1);
          const tdSeq = calculateTDSequential(tdSlice);
          if (tdSeq.isExhausted && tdSeq.exhaustionType === "SELL_EXHAUSTION_9") continue;

          if (isExtremeSqueeze) continue;

          const entry = Number(Math.max(c.close, eFast * 0.999).toFixed(precision));
          const recentHighs = candles.slice(Math.max(0, i - 5), i + 1).map((k) => k.high);
          const swingHigh = Math.max(...recentHighs);

          const atrMultSL = isNormalSqueeze ? (isExplosive ? 0.55 : 0.42) : (isExplosive ? 0.45 : isSqueeze ? 0.20 : 0.35);
          const slDist = Math.max(swingHigh - entry + currentATR * atrMultSL, currentATR * 1.35, minBuffer);

          const lookbackObstacle = candles.slice(Math.max(0, i - 24), i);
          const recentSwingLow = Math.min(...lookbackObstacle.map((b) => b.low));
          if (recentSwingLow < entry && (entry - recentSwingLow) < slDist * 0.75) continue;

          let adaptiveTP = isExplosive ? tpMultiplier * 1.2 : tpMultiplier;
          if (sessionPhase.phase === "NIGHT") adaptiveTP += 0.3;
          const beRatio = sessionPhase.phase === "MORNING" ? 0.45 : sessionPhase.phase === "AFTERNOON" ? 0.48 : 0.52;

          pullbacksInTrend++;
          active = {
            type: "SELL",
            entryPrice: entry,
            entryTime: c.time,
            entryIndex: i,
            sl: Number((entry + slDist).toFixed(precision)),
            originalRisk: slDist,
            tp08: Number((entry - slDist * beRatio).toFixed(precision)),
            tp1: Number((entry - slDist * tp1Ratio).toFixed(precision)),
            tp2: Number((entry - slDist * adaptiveTP).toFixed(precision)),
            beHit: false,
            tp1Hit: false,
            regime: "TREND",
          };
        }
      }

      // Regime 2: Sideway Range Box with Max ADX = 28
      const isMorningBoxCandidate = sessionPhase.phase === "MORNING";
      if (!active && (adxVal < minADX || (!isBullTrend && !isBearTrend) || isMorningBoxCandidate)) {
        if (adxVal >= 28) continue;

        const boxCandles = candles.slice(Math.max(0, i - 20), i);
        const boxHigh = Math.max(...boxCandles.map((k) => k.high));
        const boxLow = Math.min(...boxCandles.map((k) => k.low));
        const boxHeight = boxHigh - boxLow;
        const boxMid = (boxHigh + boxLow) / 2;

        const boxBeRatio = 0.30;
        const minBoxMult = 1.8;

        if (boxHeight >= currentATR * minBoxMult && boxHeight <= currentATR * 4.0) {
          const isAtBoxFloor = c.low <= boxLow + boxHeight * 0.25;
          const isFloorReject = candleRange > 0 && ((lowerWick >= candleRange * 0.35) || (c.close > c.open));
          const isRsiFloorHook = rVal <= 45 && rVal >= rValPrev;

          if (isAtBoxFloor && isFloorReject && isRsiFloorHook && dynamicHtfBias !== "BEAR") {
            const entry = Number(c.close.toFixed(precision));
            const slDist = Math.max(entry - boxLow + currentATR * 0.35, currentATR * 1.0, minBuffer);
            const targetMid = Number(boxMid.toFixed(precision));
            const targetHigh = Number((boxHigh - currentATR * 0.3).toFixed(precision));

            if (targetHigh - entry >= slDist * 1.15) {
              active = {
                type: "BUY",
                entryPrice: entry,
                entryTime: c.time,
                entryIndex: i,
                sl: Number((entry - slDist).toFixed(precision)),
                originalRisk: slDist,
                tp08: Number((entry + slDist * boxBeRatio).toFixed(precision)),
                tp1: targetMid,
                tp2: targetHigh,
                beHit: false,
                tp1Hit: false,
                regime: "BOX",
              };
            }
          } else {
            const isAtBoxCeiling = c.high >= boxHigh - boxHeight * 0.25;
            const isCeilingReject = candleRange > 0 && ((upperWick >= candleRange * 0.35) || (c.close < c.open));
            const isRsiCeilingHook = rVal >= 55 && rVal <= rValPrev;

            if (isAtBoxCeiling && isCeilingReject && isRsiCeilingHook && dynamicHtfBias !== "BULL") {
              const entry = Number(c.close.toFixed(precision));
              const slDist = Math.max(boxHigh - entry + currentATR * 0.35, currentATR * 1.0, minBuffer);
              const targetMid = Number(boxMid.toFixed(precision));
              const targetLow = Number((boxLow + currentATR * 0.3).toFixed(precision));

              if (entry - targetLow >= slDist * 1.15) {
                active = {
                  type: "SELL",
                  entryPrice: entry,
                  entryTime: c.time,
                  entryIndex: i,
                  sl: Number((entry + slDist).toFixed(precision)),
                  originalRisk: slDist,
                  tp08: Number((entry - slDist * boxBeRatio).toFixed(precision)),
                  tp1: targetMid,
                  tp2: targetLow,
                  beHit: false,
                  tp1Hit: false,
                  regime: "BOX",
                };
              }
            }
          }
        }
      }
    }
  }

  const wins = trades.filter((t) => t.result === "WIN").length;
  const losses = trades.filter((t) => t.result === "LOSS").length;
  const wr = wins + losses > 0 ? (wins / (wins + losses)) * 100 : 0;
  const netR = trades.reduce((a, t) => a + t.pnlR, 0);
  const netPips = trades.reduce((a, t) => a + t.pnlPips, 0);
  const pf = losses > 0 ? (trades.filter(t => t.pnlR > 0).reduce((a,t) => a + t.pnlR, 0) / Math.abs(trades.filter(t => t.pnlR < 0).reduce((a,t) => a + t.pnlR, 0))) : 99;

  return {
    trades: trades.length,
    wins,
    losses,
    wr: Number(wr.toFixed(1)),
    netR: Number(netR.toFixed(1)),
    netPips: Number(netPips.toFixed(1)),
    pf: Number(pf.toFixed(2))
  };
}

console.log("Max Dist 4.5 (Baseline):", testMaxDist(4.5));
console.log("Max Dist 3.8:", testMaxDist(3.8));
console.log("Max Dist 3.4:", testMaxDist(3.4));
console.log("Max Dist 3.0:", testMaxDist(3.0));
console.log("Max Dist 2.8:", testMaxDist(2.8));
