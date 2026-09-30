import * as fs from "fs";
import * as path from "path";
import { Candle } from "../lib/types";
import { resampleCandlesTo4H } from "../lib/marketService";
import { calculateEMA, calculateRSI, calculateADX, calculateATR } from "../lib/indicators";
import { getTradingSessionPhase } from "../lib/sessionEngine";

const dataPath = path.resolve(process.cwd(), "data", "xauusd_1h_deep.json");
const candles: Candle[] = JSON.parse(fs.readFileSync(dataPath, "utf-8"));

function testGrid(beMorning: number, beAfternoon: number, beNight: number, deadZone: boolean) {
  const emaFast = calculateEMA(candles, 20);
  const emaSlow = calculateEMA(candles, 50);
  const emaTrend = calculateEMA(candles, 200);
  const rsi = calculateRSI(candles, 14);
  const adx = calculateADX(candles, 14);
  const atrs = calculateATR(candles, 14);

  const pipMultiplier = 10;
  const precision = 2;
  const minBuffer = 2.50;

  const candles4H = resampleCandlesTo4H(candles);
  const ema20_4H = calculateEMA(candles4H, 20);
  const ema50_4H = calculateEMA(candles4H, 50);
  const ema200_4H = calculateEMA(candles4H, 200);

  const fourHourMap = new Map<number, number>();
  for (let k = 0; k < candles4H.length; k++) {
    fourHourMap.set(candles4H[k].time, k);
  }

  const trades: any[] = [];
  let active: any = null;

  let trendDirection: "BULL" | "BEAR" | "NONE" = "NONE";
  let pullbacksInTrend = 0;
  let highestHighInTrend = 0;
  let lowestLowInTrend = Infinity;
  let lastTradeExitBar = -6;
  let lastConfirmedSwingHigh = 0;
  let lastConfirmedSwingLow = 0;

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
          trades.push({
            type: "BUY",
            entryPrice: active.entryPrice,
            exitPrice: active.tp2,
            result: "WIN",
            pnlR: 2.0,
            pnlPips: Number(((active.tp2 - active.entryPrice) * pipMultiplier).toFixed(1)),
            entryTime: active.entryTime,
            exitTime: c.time,
          });
          active = null;
          lastTradeExitBar = i;
        } else if (c.low <= active.sl) {
          if (active.tp1Hit) {
            trades.push({
              type: "BUY",
              entryPrice: active.entryPrice,
              exitPrice: active.tp1,
              result: "WIN",
              pnlR: 1.0,
              pnlPips: Number(((active.tp1 - active.entryPrice) * pipMultiplier).toFixed(1)),
              entryTime: active.entryTime,
              exitTime: c.time,
            });
          } else if (active.beHit) {
            trades.push({
              type: "BUY",
              entryPrice: active.entryPrice,
              exitPrice: active.sl,
              result: "BE",
              pnlR: 0.1,
              pnlPips: Number(((active.sl - active.entryPrice) * pipMultiplier).toFixed(1)),
              entryTime: active.entryTime,
              exitTime: c.time,
            });
          } else {
            trades.push({
              type: "BUY",
              entryPrice: active.entryPrice,
              exitPrice: active.sl,
              result: "LOSS",
              pnlR: -1.0,
              pnlPips: Number(((-Math.abs(active.entryPrice - active.sl)) * pipMultiplier).toFixed(1)),
              entryTime: active.entryTime,
              exitTime: c.time,
            });
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
          trades.push({
            type: "SELL",
            entryPrice: active.entryPrice,
            exitPrice: active.tp2,
            result: "WIN",
            pnlR: 2.0,
            pnlPips: Number(((active.entryPrice - active.tp2) * pipMultiplier).toFixed(1)),
            entryTime: active.entryTime,
            exitTime: c.time,
          });
          active = null;
          lastTradeExitBar = i;
        } else if (c.high >= active.sl) {
          if (active.tp1Hit) {
            trades.push({
              type: "SELL",
              entryPrice: active.entryPrice,
              exitPrice: active.tp1,
              result: "WIN",
              pnlR: 1.0,
              pnlPips: Number(((active.entryPrice - active.tp1) * pipMultiplier).toFixed(1)),
              entryTime: active.entryTime,
              exitTime: c.time,
            });
          } else if (active.beHit) {
            trades.push({
              type: "SELL",
              entryPrice: active.entryPrice,
              exitPrice: active.sl,
              result: "BE",
              pnlR: 0.1,
              pnlPips: Number(((active.entryPrice - active.sl) * pipMultiplier).toFixed(1)),
              entryTime: active.entryTime,
              exitTime: c.time,
            });
          } else {
            trades.push({
              type: "SELL",
              entryPrice: active.entryPrice,
              exitPrice: active.sl,
              result: "LOSS",
              pnlR: -1.0,
              pnlPips: Number(((-Math.abs(active.sl - active.entryPrice)) * pipMultiplier).toFixed(1)),
              entryTime: active.entryTime,
              exitTime: c.time,
            });
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

      const sessionPhase = getTradingSessionPhase(c.time);
      if (deadZone && sessionPhase.phase === "DEAD_ZONE") {
        continue;
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

      const beRatio = sessionPhase.phase === "MORNING" ? beMorning : sessionPhase.phase === "AFTERNOON" ? beAfternoon : beNight;

      // Regime 1: Trend Swing
      if (adxVal >= 18 && (isBullTrend || isBearTrend)) {
        if (isBullTrend && dynamicHtfBias === "BEAR") continue;
        if (isBearTrend && dynamicHtfBias === "BULL") continue;

        if (isBullTrend && lastConfirmedSwingLow > 0 && c.close < lastConfirmedSwingLow && prevC.close < lastConfirmedSwingLow) {
          continue;
        }
        if (isBearTrend && lastConfirmedSwingHigh > 0 && c.close > lastConfirmedSwingHigh && prevC.close > lastConfirmedSwingHigh) {
          continue;
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
        const distFromTrend = Math.abs(c.close - eTrend);
        if (distFromTrend > currentATR * 2.5) {
          if (isBullTrend && rVal > 65) continue;
          if (isBearTrend && rVal < 35) continue;
        }
        if (distFromTrend > currentATR * 4.5) continue;

        const isBuyPullback = c.low <= eFast * 1.012 && c.close >= eSlow * 0.990 && rVal >= 30 && rVal <= 75;
        const isSellPullback = c.high >= eFast * 0.988 && c.close <= eSlow * 1.010 && rVal <= 70 && rVal >= 25;

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

        const isRsiBullHook = rVal >= rValPrev;
        const isRsiBearHook = rVal <= rValPrev;

        const isHammer =
          candleRange > 0 &&
          lowerWick >= candleRange * 0.60 &&
          (c.close >= c.open || candleBody >= candleRange * 0.18);
        const isShootingStar =
          candleRange > 0 &&
          upperWick >= candleRange * 0.60 &&
          (c.close <= c.open || candleBody >= candleRange * 0.18);

        if (isBullTrend && isBuyPullback && isBullishRejection && isRsiBullHook && (c.close > c.open || isHammer)) {
          const entry = Number(Math.min(c.close, eFast * 1.001).toFixed(precision));
          const recentLows = candles.slice(Math.max(0, i - 5), i + 1).map((k) => k.low);
          const swingLow = Math.min(...recentLows);
          const atrMultSL = isExplosive ? 0.45 : isSqueeze ? 0.20 : 0.35;
          const slDist = Math.max(entry - swingLow + currentATR * atrMultSL, currentATR * 1.35, minBuffer);

          const lookbackObstacle = candles.slice(Math.max(0, i - 24), i);
          const recentSwingHigh = Math.max(...lookbackObstacle.map((b) => b.high));
          if (recentSwingHigh > entry && recentSwingHigh - entry < slDist * 0.75) continue;

          let adaptiveTP = isExplosive ? 2.0 * 1.2 : 2.0;
          if (sessionPhase.phase === "NIGHT") adaptiveTP += 0.3;

          const slPrice = Number((entry - slDist).toFixed(precision));
          const tp08Price = Number((entry + slDist * beRatio).toFixed(precision));
          const tp1Price = Number((entry + slDist * 1.0).toFixed(precision));
          const tp2Price = Number((entry + slDist * adaptiveTP).toFixed(precision));

          pullbacksInTrend++;
          active = {
            type: "BUY",
            entryPrice: entry,
            entryTime: c.time,
            sl: slPrice,
            originalRisk: slDist,
            tp08: tp08Price,
            tp1: tp1Price,
            tp2: tp2Price,
            beHit: false,
            tp1Hit: false,
          };
        } else if (isBearTrend && isSellPullback && isBearishRejection && isRsiBearHook && (c.close < c.open || isShootingStar)) {
          const entry = Number(Math.max(c.close, eFast * 0.999).toFixed(precision));
          const recentHighs = candles.slice(Math.max(0, i - 5), i + 1).map((k) => k.high);
          const swingHigh = Math.max(...recentHighs);
          const atrMultSL = isExplosive ? 0.45 : isSqueeze ? 0.20 : 0.35;
          const slDist = Math.max(swingHigh - entry + currentATR * atrMultSL, currentATR * 1.35, minBuffer);

          const lookbackObstacle = candles.slice(Math.max(0, i - 24), i);
          const recentSwingLow = Math.min(...lookbackObstacle.map((b) => b.low));
          if (recentSwingLow < entry && entry - recentSwingLow < slDist * 0.75) continue;

          let adaptiveTP = isExplosive ? 2.0 * 1.2 : 2.0;
          if (sessionPhase.phase === "NIGHT") adaptiveTP += 0.3;

          const slPrice = Number((entry + slDist).toFixed(precision));
          const tp08Price = Number((entry - slDist * beRatio).toFixed(precision));
          const tp1Price = Number((entry - slDist * 1.0).toFixed(precision));
          const tp2Price = Number((entry - slDist * adaptiveTP).toFixed(precision));

          pullbacksInTrend++;
          active = {
            type: "SELL",
            entryPrice: entry,
            entryTime: c.time,
            sl: slPrice,
            originalRisk: slDist,
            tp08: tp08Price,
            tp1: tp1Price,
            tp2: tp2Price,
            beHit: false,
            tp1Hit: false,
          };
        }
      }

      // Regime 2: Sideway Range Box
      if (!active && (adxVal < 18 || (!isBullTrend && !isBearTrend) || sessionPhase.phase === "MORNING")) {
        const boxCandles = candles.slice(Math.max(0, i - 20), i);
        const boxHigh = Math.max(...boxCandles.map((k) => k.high));
        const boxLow = Math.min(...boxCandles.map((k) => k.low));
        const boxHeight = boxHigh - boxLow;
        const boxMid = (boxHigh + boxLow) / 2;

        if (boxHeight >= currentATR * 1.5 && boxHeight <= currentATR * 4.0) {
          const isAtBoxFloor = c.low <= boxLow + boxHeight * 0.25;
          const isFloorReject = candleRange > 0 && (lowerWick >= candleRange * 0.35 || c.close > c.open);
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
                sl: Number((entry - slDist).toFixed(precision)),
                originalRisk: slDist,
                tp08: Number((entry + slDist * beRatio).toFixed(precision)),
                tp1: targetMid,
                tp2: targetHigh,
                beHit: false,
                tp1Hit: false,
              };
            }
          } else {
            const isAtBoxCeiling = c.high >= boxHigh - boxHeight * 0.25;
            const isCeilingReject = candleRange > 0 && (upperWick >= candleRange * 0.35 || c.close < c.open);
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
                  sl: Number((entry + slDist).toFixed(precision)),
                  originalRisk: slDist,
                  tp08: Number((entry - slDist * beRatio).toFixed(precision)),
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
  }

  const wins = trades.filter((t) => t.result === "WIN");
  const losses = trades.filter((t) => t.result === "LOSS");
  const bes = trades.filter((t) => t.result === "BE");
  const wr = Number(((wins.length / (wins.length + losses.length)) * 100).toFixed(1));
  const noLossRate = Number((((wins.length + bes.length) / trades.length) * 100).toFixed(1));
  const netPips = Number(trades.reduce((acc, t) => acc + t.pnlPips, 0).toFixed(1));
  const netR = Number(trades.reduce((acc, t) => acc + t.pnlR, 0).toFixed(1));

  return {
    trades: trades.length,
    wins: wins.length,
    losses: losses.length,
    bes: bes.length,
    winRate: `${wr}%`,
    noLossRate: `${noLossRate}%`,
    netPips,
    netR: `+${netR}R`,
  };
}

console.log("Combo A (M:0.40, A:0.45, N:0.55, DeadZone=true):", testGrid(0.40, 0.45, 0.55, true));
console.log("Combo B (M:0.45, A:0.50, N:0.60, DeadZone=true):", testGrid(0.45, 0.50, 0.60, true));
console.log("Combo C (M:0.40, A:0.50, N:0.50, DeadZone=true):", testGrid(0.40, 0.50, 0.50, true));
console.log("Combo D (M:0.50, A:0.50, N:0.55, DeadZone=true):", testGrid(0.50, 0.50, 0.55, true));
console.log("Combo E (M:0.50, A:0.50, N:0.55, DeadZone=false):", testGrid(0.50, 0.50, 0.55, false));
