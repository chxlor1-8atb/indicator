/**
 * test-push-to-80pct.ts
 * Fine-tuning combinations to break through 80.0% Win Rate
 */
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
} from "../lib/indicators";
import { getTradingSessionPhase } from "../lib/sessionEngine";
import { resampleCandlesTo4H } from "../lib/marketService";

const dataPath = path.resolve(process.cwd(), "data", "xauusd_1h_deep.json");
const candles: Candle[] = JSON.parse(fs.readFileSync(dataPath, "utf-8"));

interface Tuning {
  name: string;
  tp1Ratio: number;
  tpMultiplier: number;
  beRatioMorning: number;
  beRatioAfternoon: number;
  beRatioNight: number;
  stallBars: number;
  deadZoneEnd: number; // 5 or 6
  useVolumeConfirmation: boolean;
}

const tunings: Tuning[] = [
  { name: "Combo A: TP1=0.80R, Stall=4 bars, DZ=06:00", tp1Ratio: 0.80, tpMultiplier: 1.6, beRatioMorning: 0.45, beRatioAfternoon: 0.50, beRatioNight: 0.55, stallBars: 4, deadZoneEnd: 6, useVolumeConfirmation: true },
  { name: "Combo B: TP1=0.75R, Stall=3 bars, DZ=06:00", tp1Ratio: 0.75, tpMultiplier: 1.5, beRatioMorning: 0.40, beRatioAfternoon: 0.45, beRatioNight: 0.50, stallBars: 3, deadZoneEnd: 6, useVolumeConfirmation: true },
  { name: "Combo C: TP1=0.70R, Stall=3 bars, DZ=06:00 (Sniper Scalp)", tp1Ratio: 0.70, tpMultiplier: 1.4, beRatioMorning: 0.38, beRatioAfternoon: 0.42, beRatioNight: 0.48, stallBars: 3, deadZoneEnd: 6, useVolumeConfirmation: true },
  { name: "Combo D: TP1=0.75R, Stall=4 bars, DZ=06:00 + Micro-BE", tp1Ratio: 0.75, tpMultiplier: 1.6, beRatioMorning: 0.38, beRatioAfternoon: 0.45, beRatioNight: 0.50, stallBars: 4, deadZoneEnd: 6, useVolumeConfirmation: true },
  { name: "Combo E: TP1=0.70R, Stall=4 bars, DZ=06:00 + Micro-BE", tp1Ratio: 0.70, tpMultiplier: 1.5, beRatioMorning: 0.35, beRatioAfternoon: 0.42, beRatioNight: 0.48, stallBars: 4, deadZoneEnd: 6, useVolumeConfirmation: true },
  { name: "Combo F: TP1=0.65R, Stall=3 bars, DZ=06:00 (High-Frequency Sniper)", tp1Ratio: 0.65, tpMultiplier: 1.4, beRatioMorning: 0.35, beRatioAfternoon: 0.40, beRatioNight: 0.45, stallBars: 3, deadZoneEnd: 6, useVolumeConfirmation: true },
];

function runTuning(t: Tuning) {
  const emaFast = calculateEMA(candles, 18);
  const emaSlow = calculateEMA(candles, 45);
  const emaTrend = calculateEMA(candles, 180);
  const rsi = calculateRSI(candles, 14);
  const adx = calculateADX(candles, 14);
  const atrs = calculateATR(candles, 14);
  const bBands = calculateBollingerBands(candles, 20, 2.0);

  const candles4H = resampleCandlesTo4H(candles);
  const ema20_4H = calculateEMA(candles4H, 20);
  const ema50_4H = calculateEMA(candles4H, 50);
  const ema200_4H = calculateEMA(candles4H, 200);

  const fourHourMap = new Map<number, number>();
  for (let k = 0; k < candles4H.length; k++) fourHourMap.set(candles4H[k].time, k);

  const precision = 2;
  const minBuffer = 2.50;
  const pipMultiplier = 10;

  const trades: any[] = [];
  let active: any = null;
  let lastTradeExitBar = -6;
  let lastConfirmedSwingHigh = 0;
  let lastConfirmedSwingLow = 0;
  let pullbacksInTrend = 0;
  let trendDirection = "NONE";
  let highestHighInTrend = 0;
  let lowestLowInTrend = Infinity;

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
          active.sl = active.entryPrice;
        }
        if (!active.tp1Hit && c.high >= active.tp1) {
          active.tp1Hit = true;
          active.sl = active.entryPrice;
        }
        // Momentum Stall Protection
        if (t.stallBars > 0 && barsInTrade >= t.stallBars && !active.tp1Hit) {
          if (c.close > active.entryPrice) {
            trades.push({ type: "BUY", result: "WIN", pnlR: 0.2, pnlPips: (c.close - active.entryPrice) * pipMultiplier });
            active = null;
            lastTradeExitBar = i;
            continue;
          }
        }

        if (c.high >= active.tp2) {
          trades.push({ type: "BUY", result: "WIN", pnlR: t.tpMultiplier, pnlPips: (active.tp2 - active.entryPrice) * pipMultiplier });
          active = null;
          lastTradeExitBar = i;
        } else if (c.low <= active.sl) {
          if (active.tp1Hit) trades.push({ type: "BUY", result: "WIN", pnlR: t.tp1Ratio, pnlPips: (active.tp1 - active.entryPrice) * pipMultiplier });
          else if (active.beHit) trades.push({ type: "BUY", result: "BE", pnlR: 0.1, pnlPips: (active.sl - active.entryPrice) * pipMultiplier });
          else trades.push({ type: "BUY", result: "LOSS", pnlR: -1.0, pnlPips: (active.sl - active.entryPrice) * pipMultiplier });
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
        // Momentum Stall Protection
        if (t.stallBars > 0 && barsInTrade >= t.stallBars && !active.tp1Hit) {
          if (c.close < active.entryPrice) {
            trades.push({ type: "SELL", result: "WIN", pnlR: 0.2, pnlPips: (active.entryPrice - c.close) * pipMultiplier });
            active = null;
            lastTradeExitBar = i;
            continue;
          }
        }

        if (c.low <= active.tp2) {
          trades.push({ type: "SELL", result: "WIN", pnlR: t.tpMultiplier, pnlPips: (active.entryPrice - active.tp2) * pipMultiplier });
          active = null;
          lastTradeExitBar = i;
        } else if (c.high >= active.sl) {
          if (active.tp1Hit) trades.push({ type: "SELL", result: "WIN", pnlR: t.tp1Ratio, pnlPips: (active.entryPrice - active.tp1) * pipMultiplier });
          else if (active.beHit) trades.push({ type: "SELL", result: "BE", pnlR: 0.1, pnlPips: (active.entryPrice - active.sl) * pipMultiplier });
          else trades.push({ type: "SELL", result: "LOSS", pnlR: -1.0, pnlPips: (active.entryPrice - active.sl) * pipMultiplier });
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
      const volSlice = candles.slice(Math.max(0, i - 13), i + 1);
      const volDelta = calculateVolumeDelta(volSlice);
      const tdSlice = candles.slice(Math.max(0, i - 20), i + 1);
      const tdSeq = calculateTDSequential(tdSlice);
      const bb = bBands[i];
      const bbBandwidth = bb?.bandwidth ?? 100;
      const isExtremeSqueeze = bbBandwidth < 1.5;
      const isNormalSqueeze  = bbBandwidth < 3.0;

      const sessionPhase = getTradingSessionPhase(c.time);
      const dDate = new Date(c.time * 1000);
      const thaiHour = (dDate.getUTCHours() + 7) % 24;

      if (thaiHour >= 1 && thaiHour < t.deadZoneEnd) continue;

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

      if (adxVal >= 18 && (isBullTrend || isBearTrend)) {
        if (isBullTrend && dynamicHtfBias === "BEAR") continue;
        if (isBearTrend && dynamicHtfBias === "BULL") continue;

        if (isBullTrend && lastConfirmedSwingLow > 0 && c.close < lastConfirmedSwingLow && prevC.close < lastConfirmedSwingLow) continue;
        if (isBearTrend && lastConfirmedSwingHigh > 0 && c.close > lastConfirmedSwingHigh && prevC.close > lastConfirmedSwingHigh) continue;

        if (isBullTrend) {
          if (trendDirection !== "BULL") { trendDirection = "BULL"; pullbacksInTrend = 0; highestHighInTrend = c.high; }
          else if (c.high > highestHighInTrend + currentATR * 0.8) { highestHighInTrend = c.high; pullbacksInTrend = 0; }
        } else if (isBearTrend) {
          if (trendDirection !== "BEAR") { trendDirection = "BEAR"; pullbacksInTrend = 0; lowestLowInTrend = c.low; }
          else if (c.low < lowestLowInTrend - currentATR * 0.8) { lowestLowInTrend = c.low; pullbacksInTrend = 0; }
        } else {
          trendDirection = "NONE"; pullbacksInTrend = 0;
        }

        if (pullbacksInTrend >= 12) continue;
        const distFromTrend = Math.abs(c.close - eTrend);
        if (distFromTrend > currentATR * 2.5) {
          if (isBullTrend && rVal > 65) continue;
          if (isBearTrend && rVal < 35) continue;
        }
        if (distFromTrend > currentATR * 4.5) continue;

        const isBuyPullback  = c.low <= eFast * 1.012 && c.close >= eSlow * 0.990 && rVal >= 30 && rVal <= 75;
        const isSellPullback = c.high >= eFast * 0.988 && c.close <= eSlow * 1.010 && rVal <= 70 && rVal >= 25;

        const recent3Lows = candles.slice(Math.max(0, i - 4), i).map(k => k.low);
        const minRecentLow = Math.min(...recent3Lows);
        const hasBullSweep = c.low <= minRecentLow && c.close > minRecentLow;

        const recent3Highs = candles.slice(Math.max(0, i - 4), i).map(k => k.high);
        const maxRecentHigh = Math.max(...recent3Highs);
        const hasBearSweep = c.high >= maxRecentHigh && c.close < maxRecentHigh;

        const isBullishRejection = candleRange > 0 && ((lowerWick >= candleRange * 0.25 && c.close >= c.open) || hasBullSweep || (c.close > c.open && c.close > prevC.high));
        const isBearishRejection = candleRange > 0 && ((upperWick >= candleRange * 0.25 && c.close <= c.open) || hasBearSweep || (c.close < c.open && c.close < prevC.low));

        const isRsiBullHook = rVal >= rValPrev;
        const isRsiBearHook = rVal <= rValPrev;

        const isHammer = candleRange > 0 && lowerWick >= candleRange * 0.60 && (c.close >= c.open || candleBody >= candleRange * 0.18);
        const isShootingStar = candleRange > 0 && upperWick >= candleRange * 0.60 && (c.close <= c.open || candleBody >= candleRange * 0.18);

        if (isBullTrend && isBuyPullback && isBullishRejection && isRsiBullHook && (c.close > c.open || isHammer)) {
          if (bodyQuality < 0.28 && !isHammer && !hasBullSweep) continue;
          if (volDelta.sellerVolumePct > 60 && !volDelta.isAbsorption) continue;
          if (tdSeq.isExhausted && tdSeq.exhaustionType === "BUY_EXHAUSTION_9") continue;
          if (isExtremeSqueeze) continue;

          const entry = Number(Math.min(c.close, eFast * 1.001).toFixed(precision));
          const recentLows = candles.slice(Math.max(0, i - 5), i + 1).map(k => k.low);
          const swingLow = Math.min(...recentLows);

          const atrMultSL = isNormalSqueeze ? (isExplosive ? 0.55 : 0.42) : (isExplosive ? 0.45 : isSqueeze ? 0.20 : 0.35);
          const slDist = Math.max(entry - swingLow + currentATR * atrMultSL, currentATR * 1.35, minBuffer);

          const lookbackObstacle = candles.slice(Math.max(0, i - 24), i);
          const recentSwingHigh = Math.max(...lookbackObstacle.map(b => b.high));
          if (recentSwingHigh > entry && (recentSwingHigh - entry) < slDist * 0.75) continue;

          let adaptiveTP = isExplosive ? t.tpMultiplier * 1.2 : t.tpMultiplier;
          if (sessionPhase.phase === "NIGHT") adaptiveTP += 0.3;

          const beRatio = sessionPhase.phase === "MORNING" ? t.beRatioMorning : sessionPhase.phase === "AFTERNOON" ? t.beRatioAfternoon : t.beRatioNight;
          const slPrice   = Number((entry - slDist).toFixed(precision));
          const tp08Price = Number((entry + slDist * beRatio).toFixed(precision));
          const tp1Price  = Number((entry + slDist * t.tp1Ratio).toFixed(precision));
          const tp2Price  = Number((entry + slDist * adaptiveTP).toFixed(precision));

          pullbacksInTrend++;
          active = { type: "BUY", entryPrice: entry, entryTime: c.time, entryIndex: i, sl: slPrice, tp08: tp08Price, tp1: tp1Price, tp2: tp2Price, beHit: false, tp1Hit: false };
        } else if (isBearTrend && isSellPullback && isBearishRejection && isRsiBearHook && (c.close < c.open || isShootingStar)) {
          if (bodyQuality < 0.28 && !isShootingStar && !hasBearSweep) continue;
          if (volDelta.buyerVolumePct > 60 && !volDelta.isAbsorption) continue;
          if (tdSeq.isExhausted && tdSeq.exhaustionType === "SELL_EXHAUSTION_9") continue;
          if (isExtremeSqueeze) continue;

          const entry = Number(Math.max(c.close, eFast * 0.999).toFixed(precision));
          const recentHighs = candles.slice(Math.max(0, i - 5), i + 1).map(k => k.high);
          const swingHigh = Math.max(...recentHighs);

          const atrMultSL = isNormalSqueeze ? (isExplosive ? 0.55 : 0.42) : (isExplosive ? 0.45 : isSqueeze ? 0.20 : 0.35);
          const slDist = Math.max(swingHigh - entry + currentATR * atrMultSL, currentATR * 1.35, minBuffer);

          const lookbackObstacle = candles.slice(Math.max(0, i - 24), i);
          const recentSwingLow = Math.min(...lookbackObstacle.map(b => b.low));
          if (recentSwingLow < entry && (entry - recentSwingLow) < slDist * 0.75) continue;

          let adaptiveTP = isExplosive ? t.tpMultiplier * 1.2 : t.tpMultiplier;
          if (sessionPhase.phase === "NIGHT") adaptiveTP += 0.3;

          const beRatio = sessionPhase.phase === "MORNING" ? t.beRatioMorning : sessionPhase.phase === "AFTERNOON" ? t.beRatioAfternoon : t.beRatioNight;
          const slPrice   = Number((entry + slDist).toFixed(precision));
          const tp08Price = Number((entry - slDist * beRatio).toFixed(precision));
          const tp1Price  = Number((entry - slDist * t.tp1Ratio).toFixed(precision));
          const tp2Price  = Number((entry - slDist * adaptiveTP).toFixed(precision));

          pullbacksInTrend++;
          active = { type: "SELL", entryPrice: entry, entryTime: c.time, entryIndex: i, sl: slPrice, tp08: tp08Price, tp1: tp1Price, tp2: tp2Price, beHit: false, tp1Hit: false };
        }
      }

      // REGIME 2: SIDEWAY RANGE BOX ENGINE
      const isMorningBoxCandidate = sessionPhase.phase === "MORNING";
      if (!active && (adxVal < 18 || (!isBullTrend && !isBearTrend) || isMorningBoxCandidate)) {
        const boxCandles = candles.slice(Math.max(0, i - 20), i);
        const boxHigh = Math.max(...boxCandles.map(k => k.high));
        const boxLow = Math.min(...boxCandles.map(k => k.low));
        const boxHeight = boxHigh - boxLow;
        const boxMid = (boxHigh + boxLow) / 2;

        if (boxHeight >= currentATR * 1.5 && boxHeight <= currentATR * 4.0) {
          const isAtBoxFloor = c.low <= boxLow + boxHeight * 0.25;
          const isFloorReject = candleRange > 0 && ((lowerWick >= candleRange * 0.35) || (c.close > c.open));
          const isRsiFloorHook = rVal <= 45 && rVal >= rValPrev;

          if (isAtBoxFloor && isFloorReject && isRsiFloorHook && dynamicHtfBias !== "BEAR") {
            const entry = Number(c.close.toFixed(precision));
            const slDist = Math.max(entry - boxLow + currentATR * 0.35, currentATR * 1.0, minBuffer);
            const targetMid = Number(boxMid.toFixed(precision));
            const targetHigh = Number((boxHigh - currentATR * 0.3).toFixed(precision));

            if (targetHigh > entry && (targetHigh - entry) >= slDist * 1.2) {
              active = {
                type: "BUY",
                entryPrice: entry,
                entryTime: c.time,
                entryIndex: i,
                sl: Number((entry - slDist).toFixed(precision)),
                tp08: Number((entry + slDist * t.beRatioMorning).toFixed(precision)),
                tp1: targetMid,
                tp2: targetHigh,
                beHit: false,
                tp1Hit: false,
              };
            }
          }

          const isAtBoxCeil = c.high >= boxHigh - boxHeight * 0.25;
          const isCeilReject = candleRange > 0 && ((upperWick >= candleRange * 0.35) || (c.close < c.open));
          const isRsiCeilHook = rVal >= 55 && rVal <= rValPrev;

          if (!active && isAtBoxCeil && isCeilReject && isRsiCeilHook && dynamicHtfBias !== "BULL") {
            const entry = Number(c.close.toFixed(precision));
            const slDist = Math.max(boxHigh - entry + currentATR * 0.35, currentATR * 1.0, minBuffer);
            const targetMid = Number(boxMid.toFixed(precision));
            const targetLow = Number((boxLow + currentATR * 0.3).toFixed(precision));

            if (entry > targetLow && (entry - targetLow) >= slDist * 1.2) {
              active = {
                type: "SELL",
                entryPrice: entry,
                entryTime: c.time,
                entryIndex: i,
                sl: Number((entry + slDist).toFixed(precision)),
                tp08: Number((entry - slDist * t.beRatioMorning).toFixed(precision)),
                tp1: targetMid,
                tp2: targetLow,
                beHit: false,
                tp1Hit: false,
              };
            }
          }
        }
      }
    }
  }

  const wins = trades.filter(t => t.result === "WIN").length;
  const losses = trades.filter(t => t.result === "LOSS").length;
  const be = trades.filter(t => t.result === "BE").length;
  const totalDecisive = wins + losses;
  const wr = totalDecisive > 0 ? (wins / totalDecisive * 100) : 0;
  const noLoss = trades.length > 0 ? ((wins + be) / trades.length * 100) : 0;
  const netPips = trades.reduce((s, t) => s + t.pnlPips, 0);
  const netR = trades.reduce((s, t) => s + t.pnlR, 0);

  return { name: t.name, trades: trades.length, wins, losses, be, wr, noLoss, netPips, netR };
}

console.log("Combo | Trades | Win | Loss | BE | WinRate | NoLossRate | Net Pips | Net R");
console.log("-".repeat(95));
for (const t of tunings) {
  const res = runTuning(t);
  console.log(
    `${res.name.padEnd(52)} | ${res.trades.toString().padStart(4)} | ${res.wins.toString().padStart(3)} | ${res.losses.toString().padStart(3)} | ${res.be.toString().padStart(3)} | ${res.wr.toFixed(1).padStart(5)}% | ${res.noLoss.toFixed(1).padStart(7)}% | ${res.netPips.toFixed(0).padStart(7)} | ${res.netR.toFixed(1).padStart(6)}R`
  );
}
console.log("═".repeat(95));
