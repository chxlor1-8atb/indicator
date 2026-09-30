import * as fs from "fs";
import * as path from "path";
import { Candle } from "../lib/types";
import { resampleCandlesTo4H } from "../lib/marketService";
import { calculateEMA, calculateRSI, calculateATR, calculateADX } from "../lib/indicators";

const dataPath = path.resolve(process.cwd(), "data", "xauusd_1h_deep.json");
const candles: Candle[] = JSON.parse(fs.readFileSync(dataPath, "utf-8"));

const candles4H = resampleCandlesTo4H(candles);
const ema20_4H = calculateEMA(candles4H, 20);
const ema50_4H = calculateEMA(candles4H, 50);
const ema200_4H = calculateEMA(candles4H, 200);

const fourHourMap = new Map<number, number>();
for (let k = 0; k < candles4H.length; k++) fourHourMap.set(candles4H[k].time, k);

const emaFast = calculateEMA(candles, 20);
const emaSlow = calculateEMA(candles, 50);
const emaTrend = calculateEMA(candles, 200);
const rsi = calculateRSI(candles, 14);
const atrs = calculateATR(candles, 14);
const adx = calculateADX(candles, 14);

interface Trade {
  type: "BUY" | "SELL";
  entryPrice: number;
  sl: number;
  tp1: number;
  tp2: number;
  entryTime: number;
  exitTime: number;
  result: "WIN" | "LOSS" | "BREAKEVEN";
  pnlPips: number;
}

function runSim(options: {
  filterDeadZone?: boolean;
  tightenBE?: boolean;
  filterFakeWicks?: boolean;
  filterOverextended?: boolean;
  sessionAwareTuning?: boolean;
}) {
  const trades: Trade[] = [];
  let active: any = null;

  for (let i = 200; i < candles.length; i++) {
    const c = candles[i];
    const prevC = candles[i - 1];
    const currentATR = atrs[i] ?? 10;
    const rVal = rsi[i] ?? 50;
    const rValPrev = rsi[i - 1] ?? 50;
    const adxVal = adx[i] ?? 20;

    const d = new Date(c.time * 1000);
    const thaiHour = (d.getUTCHours() + 7) % 24;

    // Check active trade
    if (active) {
      const slDist = Math.abs(active.entryPrice - active.initialSl);
      const beDist = options.tightenBE ? slDist * 0.30 : slDist * 0.40;

      // Breakeven check
      if (!active.isBe) {
        if (active.type === "BUY" && c.high >= active.entryPrice + beDist) {
          active.sl = active.entryPrice + 0.5;
          active.isBe = true;
        } else if (active.type === "SELL" && c.low <= active.entryPrice - beDist) {
          active.sl = active.entryPrice - 0.5;
          active.isBe = true;
        }
      }

      // Check exit
      if (active.type === "BUY") {
        if (c.low <= active.sl) {
          const res = active.isBe ? "BREAKEVEN" : "LOSS";
          const pips = (active.sl - active.entryPrice) * 10;
          trades.push({ ...active, exitTime: c.time, result: res, pnlPips: pips });
          active = null;
        } else if (c.high >= active.tp2) {
          const pips = (active.tp2 - active.entryPrice) * 10;
          trades.push({ ...active, exitTime: c.time, result: "WIN", pnlPips: pips });
          active = null;
        }
      } else {
        if (c.high >= active.sl) {
          const res = active.isBe ? "BREAKEVEN" : "LOSS";
          const pips = (active.entryPrice - active.sl) * 10;
          trades.push({ ...active, exitTime: c.time, result: res, pnlPips: pips });
          active = null;
        } else if (c.low <= active.tp2) {
          const pips = (active.entryPrice - active.tp2) * 10;
          trades.push({ ...active, exitTime: c.time, result: "WIN", pnlPips: pips });
          active = null;
        }
      }
    }

    if (active) continue;

    // ─── Filter 1: Dead zone (01:00 - 05:00 Thai Time: Bank clearing, low liquidity, high spread) ───
    if (options.filterDeadZone && (thaiHour >= 1 && thaiHour < 5)) continue;

    // ─── Filter 2: Fake wick / weak body trap (< 30% body ratio) ───
    const candleRange = c.high - c.low;
    const body = Math.abs(c.close - c.open);
    if (options.filterFakeWicks && candleRange > 0 && body / candleRange < 0.28) continue;

    // ─── Filter 3: Overextended Climax (> 2.4 ATR from EMA200) ───
    const eTrend = emaTrend[i] ?? c.close;
    if (options.filterOverextended && Math.abs(c.close - eTrend) > currentATR * 2.4) continue;

    // Standard signals (Dual-regime baseline)
    const current4HBucketTime = Math.floor(c.time / (4 * 3600)) * (4 * 3600);
    const idx4H = fourHourMap.get(current4HBucketTime);
    let dynamicHtfBias: "BULL" | "BEAR" | "NEUTRAL" = "NEUTRAL";
    if (idx4H !== undefined && idx4H >= 1) {
      const p4 = idx4H - 1;
      const c4 = candles4H[p4]?.close;
      const e4_20 = ema20_4H[p4];
      const e4_50 = ema50_4H[p4];
      const e4_200 = ema200_4H[p4] ?? e4_50;
      if (c4 && e4_20 && e4_50 && e4_200) {
        if (c4 > e4_20 && e4_20 > e4_50 && c4 > e4_200) dynamicHtfBias = "BULL";
        else if (c4 < e4_20 && e4_20 < e4_50 && c4 < e4_200) dynamicHtfBias = "BEAR";
      }
    }

    const eFast = emaFast[i] ?? c.close;
    const eSlow = emaSlow[i] ?? c.close;
    const isBullTrend = eFast > eSlow && c.close > eTrend;
    const isBearTrend = eFast < eSlow && c.close < eTrend;

    // ─── Regime 1: Trend Swing ───
    // In Night Session (18:00 - 01:00), we get prime trend expansions!
    const isNightSession = thaiHour >= 18 || thaiHour < 1;
    const isMorningSession = thaiHour >= 6 && thaiHour < 13;

    if (adxVal >= 18 && (isBullTrend || isBearTrend)) {
      if (isBullTrend && dynamicHtfBias !== "BEAR" && c.close > eFast && prevC.close <= prevC.open && c.close > c.open && rVal >= 48) {
        const slDist = Math.max(currentATR * 1.5, 2.5);
        active = {
          type: "BUY",
          entryPrice: c.close,
          initialSl: c.close - slDist,
          sl: c.close - slDist,
          tp1: c.close + slDist * 1.2,
          tp2: isNightSession ? c.close + slDist * 2.8 : c.close + slDist * 2.2, // Expand TP in Night session
          entryTime: c.time,
          isBe: false,
        };
      } else if (isBearTrend && dynamicHtfBias !== "BULL" && c.close < eFast && prevC.close >= prevC.open && c.close < c.open && rVal <= 52) {
        const slDist = Math.max(currentATR * 1.5, 2.5);
        active = {
          type: "SELL",
          entryPrice: c.close,
          initialSl: c.close + slDist,
          sl: c.close + slDist,
          tp1: c.close - slDist * 1.2,
          tp2: isNightSession ? c.close - slDist * 2.8 : c.close - slDist * 2.2,
          entryTime: c.time,
          isBe: false,
        };
      }
    }

    // ─── Regime 2: Sideway Range Box (Best in Morning/Asian Session) ───
    if (!active && (adxVal < 20 || (!isBullTrend && !isBearTrend) || isMorningSession)) {
      const boxCandles = candles.slice(Math.max(0, i - 20), i);
      const boxHigh = Math.max(...boxCandles.map((k) => k.high));
      const boxLow = Math.min(...boxCandles.map((k) => k.low));
      const boxHeight = boxHigh - boxLow;
      const boxMid = (boxHigh + boxLow) / 2;

      if (boxHeight >= currentATR * 1.5 && boxHeight <= currentATR * 4.0) {
        const lowerWick = Math.min(c.open, c.close) - c.low;
        const upperWick = c.high - Math.max(c.open, c.close);
        const isAtBoxFloor = c.low <= boxLow + boxHeight * 0.25;
        const isFloorReject = candleRange > 0 && (lowerWick >= candleRange * 0.35 || c.close > c.open);
        const isRsiFloorHook = rVal <= 45 && rVal >= rValPrev;

        if (isAtBoxFloor && isFloorReject && isRsiFloorHook && dynamicHtfBias !== "BEAR") {
          const slDist = Math.max(c.close - boxLow + currentATR * 0.4, currentATR * 1.2);
          active = {
            type: "BUY",
            entryPrice: c.close,
            initialSl: c.close - slDist,
            sl: c.close - slDist,
            tp1: boxMid,
            tp2: boxHigh - currentATR * 0.2,
            entryTime: c.time,
            isBe: false,
          };
        } else {
          const isAtBoxCeiling = c.high >= boxHigh - boxHeight * 0.25;
          const isCeilingReject = candleRange > 0 && (upperWick >= candleRange * 0.35 || c.close < c.open);
          const isRsiCeilingHook = rVal >= 55 && rVal <= rValPrev;

          if (isAtBoxCeiling && isCeilingReject && isRsiCeilingHook && dynamicHtfBias !== "BULL") {
            const slDist = Math.max(boxHigh - c.close + currentATR * 0.4, currentATR * 1.2);
            active = {
              type: "SELL",
              entryPrice: c.close,
              initialSl: c.close + slDist,
              sl: c.close + slDist,
              tp1: boxMid,
              tp2: boxLow + currentATR * 0.2,
              entryTime: c.time,
              isBe: false,
            };
          }
        }
      }
    }
  }

  const w = trades.filter((t) => t.result === "WIN").length;
  const l = trades.filter((t) => t.result === "LOSS").length;
  const be = trades.filter((t) => t.result === "BREAKEVEN").length;
  const pips = trades.reduce((acc, t) => acc + t.pnlPips, 0);
  const wr = ((w / (w + l)) * 100).toFixed(1);
  const noLossRate = (((w + be) / trades.length) * 100).toFixed(1);
  return { total: trades.length, w, l, be, wr: `${wr}%`, noLossRate: `${noLossRate}%`, pips: Math.round(pips) };
}

console.log("Baseline:                      ", runSim({}));
console.log("+ Filter Dead Zone (01-05 น.):  ", runSim({ filterDeadZone: true }));
console.log("+ Tighten BE to +0.30R:        ", runSim({ tightenBE: true }));
console.log("+ Filter Fake Wicks:           ", runSim({ filterFakeWicks: true }));
console.log("+ Filter Overextended:         ", runSim({ filterOverextended: true }));
console.log("🚀 ALL OPTIMIZATIONS COMBINED:  ", runSim({
  filterDeadZone: true,
  tightenBE: true,
  filterFakeWicks: true,
  filterOverextended: true,
}));
