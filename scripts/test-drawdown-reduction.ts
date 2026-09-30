import * as fs from "fs";
import * as path from "path";
import { Candle, BacktestTrade } from "../lib/types";
import {
  calculateEMA,
  calculateRSI,
  calculateADX,
  calculateATR,
  calculateBollingerBands,
  calculateQuasimodoPattern,
  calculateVolumeDelta,
  calculateTDSequential,
} from "../lib/indicators";
import { resampleCandlesTo4H } from "../lib/marketService";
import { getTradingSessionPhase } from "../lib/sessionEngine";

interface SimOptions {
  label: string;
  slFloorMultiplier: number;     // Baseline is 1.35
  entryRetestPct: number;        // Baseline is 0.0 (c.close)
  beRatioMultiplier: number;     // Baseline is 1.0 (0.45 - 0.52R)
  earlyCutLossAfterBars?: number;// Cut loss early if still negative after N bars
}

function runCustomBacktest(candles: Candle[], opt: SimOptions): BacktestTrade[] {
  const emaFast = calculateEMA(candles, 20);
  const emaSlow = calculateEMA(candles, 50);
  const emaTrend = calculateEMA(candles, 200);
  const rsi = calculateRSI(candles, 14);
  const adx = calculateADX(candles, 14);
  const atrs = calculateATR(candles, 14);
  const bBands = calculateBollingerBands(candles, 20, 2.0);

  const sym = "XAUUSD";
  const pipMultiplier = 10;
  const precision = 2;
  const minBuffer = 2.50;
  const minADX = 20;
  const minWickPct = 0.30;
  const tpMultiplier = 2.0;
  const tp1Ratio = 1.0;

  const candles4H = resampleCandlesTo4H(candles);
  const ema20_4H = calculateEMA(candles4H, 20);
  const ema50_4H = calculateEMA(candles4H, 50);
  const ema200_4H = calculateEMA(candles4H, 200);

  const fourHourMap = new Map<number, number>();
  for (let k = 0; k < candles4H.length; k++) {
    fourHourMap.set(candles4H[k].time, k);
  }

  const trades: BacktestTrade[] = [];
  let active: {
    type: "BUY" | "SELL";
    entryPrice: number;
    entryTime: number;
    entryIndex: number;
    sl: number;
    originalRisk: number;
    tp08: number;
    tp1: number;
    tp2: number;
    beHit: boolean;
    tp1Hit: boolean;
  } | null = null;

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
          active.sl = Number((active.entryPrice - active.originalRisk * 0.08).toFixed(precision));
        }
        if (!active.tp1Hit && c.high >= active.tp1) {
          active.tp1Hit = true;
          active.sl = active.entryPrice;
        }

        const barsInTrade = i - active.entryIndex;
        // Time Stop / Momentum Stall Protection
        if (barsInTrade >= 3 && !active.tp1Hit && c.close > active.entryPrice) {
          trades.push({
            type: "BUY",
            entryPrice: active.entryPrice,
            exitPrice: c.close,
            sl: active.sl,
            tp1: active.tp1,
            tp2: active.tp2,
            result: "WIN",
            pnlR: 0.2,
            pnlPips: Number((Math.abs(c.close - active.entryPrice) * pipMultiplier).toFixed(1)),
            entryTime: active.entryTime,
            exitTime: c.time,
          });
          active = null;
          lastTradeExitBar = i;
          continue;
        }

        // Early Cut Loss on Momentum Failure
        if (opt.earlyCutLossAfterBars && barsInTrade >= opt.earlyCutLossAfterBars && !active.beHit && c.close < active.entryPrice) {
          const cutLossDist = active.entryPrice - c.close;
          const lossR = Math.min(1.0, cutLossDist / active.originalRisk);
          trades.push({
            type: "BUY",
            entryPrice: active.entryPrice,
            exitPrice: c.close,
            sl: active.sl,
            tp1: active.tp1,
            tp2: active.tp2,
            result: "LOSS",
            pnlR: Number((-lossR).toFixed(2)),
            pnlPips: Number((-cutLossDist * pipMultiplier).toFixed(1)),
            entryTime: active.entryTime,
            exitTime: c.time,
          });
          active = null;
          lastTradeExitBar = i;
          continue;
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
            pnlR: tpMultiplier,
            pnlPips: Number((Math.abs(active.tp2 - active.entryPrice) * pipMultiplier).toFixed(1)),
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
              sl: active.sl,
              tp1: active.tp1,
              tp2: active.tp2,
              result: "WIN",
              pnlR: tp1Ratio,
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
              pnlR: 0.15,
              pnlPips: Number((Math.abs(active.sl - active.entryPrice) * pipMultiplier).toFixed(1)),
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
          lastTradeExitBar = i;
        }
      } else {
        // SELL
        if (!active.beHit && c.low <= active.tp08) {
          active.beHit = true;
          active.sl = Number((active.entryPrice + active.originalRisk * 0.08).toFixed(precision));
        }
        if (!active.tp1Hit && c.low <= active.tp1) {
          active.tp1Hit = true;
          active.sl = active.entryPrice;
        }

        const barsInTradeSell = i - active.entryIndex;
        if (barsInTradeSell >= 3 && !active.tp1Hit && c.close < active.entryPrice) {
          trades.push({
            type: "SELL",
            entryPrice: active.entryPrice,
            exitPrice: c.close,
            sl: active.sl,
            tp1: active.tp1,
            tp2: active.tp2,
            result: "WIN",
            pnlR: 0.2,
            pnlPips: Number((Math.abs(active.entryPrice - c.close) * pipMultiplier).toFixed(1)),
            entryTime: active.entryTime,
            exitTime: c.time,
          });
          active = null;
          lastTradeExitBar = i;
          continue;
        }

        if (opt.earlyCutLossAfterBars && barsInTradeSell >= opt.earlyCutLossAfterBars && !active.beHit && c.close > active.entryPrice) {
          const cutLossDist = c.close - active.entryPrice;
          const lossR = Math.min(1.0, cutLossDist / active.originalRisk);
          trades.push({
            type: "SELL",
            entryPrice: active.entryPrice,
            exitPrice: c.close,
            sl: active.sl,
            tp1: active.tp1,
            tp2: active.tp2,
            result: "LOSS",
            pnlR: Number((-lossR).toFixed(2)),
            pnlPips: Number((-cutLossDist * pipMultiplier).toFixed(1)),
            entryTime: active.entryTime,
            exitTime: c.time,
          });
          active = null;
          lastTradeExitBar = i;
          continue;
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
            pnlR: tpMultiplier,
            pnlPips: Number((Math.abs(active.entryPrice - active.tp2) * pipMultiplier).toFixed(1)),
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
              sl: active.sl,
              tp1: active.tp1,
              tp2: active.tp2,
              result: "WIN",
              pnlR: tp1Ratio,
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
              pnlR: 0.15,
              pnlPips: Number((Math.abs(active.entryPrice - active.sl) * pipMultiplier).toFixed(1)),
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
      const isNormalSqueeze  = bbBandwidth < 3.0;

      const sessionPhase = getTradingSessionPhase(c.time);
      const dDate = new Date(c.time > 1e11 ? c.time : c.time * 1000);
      const thaiHour = (dDate.getUTCHours() + 7) % 24;

      if (sessionPhase.phase === "DEAD_ZONE") continue;
      if ((thaiHour >= 22 || thaiHour === 0) && adxVal < 24) continue;
      if (thaiHour >= 6 && thaiHour <= 8 && (adxVal < 20 || bodyQuality < 0.32)) continue;

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

        const distFromTrend = Math.abs(c.close - eTrend);
        if (distFromTrend > currentATR * 2.5) {
          if (isBullTrend && rVal > 65) continue;
          if (isBearTrend && rVal < 35) continue;
        }
        if (distFromTrend > currentATR * 3.4) continue;

        const isBuyPullback  = c.low <= eFast * 1.012 && c.close >= eSlow * 0.990 && rVal >= 30 && rVal <= 75;
        const isSellPullback = c.high >= eFast * 0.988 && c.close <= eSlow * 1.010 && rVal <= 70 && rVal >= 25;

        const recent3Lows = candles.slice(Math.max(0, i - 4), i).map((k) => k.low);
        const minRecentLow = Math.min(...recent3Lows);
        const hasBullSweep = c.low <= minRecentLow && c.close > minRecentLow;

        const recent3Highs = candles.slice(Math.max(0, i - 4), i).map((k) => k.high);
        const maxRecentHigh = Math.max(...recent3Highs);
        const hasBearSweep = c.high >= maxRecentHigh && c.close < maxRecentHigh;

        const isBullishRejection =
          candleRange > 0 &&
          ((lowerWick >= candleRange * minWickPct && c.close >= c.open) ||
           hasBullSweep ||
           (c.close > c.open && c.close > prevC.high));

        const isBearishRejection =
          candleRange > 0 &&
          ((upperWick >= candleRange * minWickPct && c.close <= c.open) ||
           hasBearSweep ||
           (c.close < c.open && c.close < prevC.low));

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

          // Entry sharpening: slight discount anchor to wick shoulder
          const retestDiscount = candleRange * opt.entryRetestPct;
          const baseEntry = Math.min(c.close, eFast * 1.001);
          const entry = Number((baseEntry - retestDiscount).toFixed(precision));

          const recentLows = candles.slice(Math.max(0, i - 5), i + 1).map((k) => k.low);
          const swingLow = Math.min(...recentLows);

          const atrMultSL = isNormalSqueeze
            ? (isExplosive ? 0.55 : 0.42)
            : (isExplosive ? 0.45 : isSqueeze ? 0.20 : 0.35);

          // Sharpened SL floor: customizable
          const slDist = Math.max(entry - swingLow + currentATR * atrMultSL, currentATR * opt.slFloorMultiplier, minBuffer);

          const lookbackObstacle = candles.slice(Math.max(0, i - 24), i);
          const recentSwingHigh = Math.max(...lookbackObstacle.map((b) => b.high));
          if (recentSwingHigh > entry && (recentSwingHigh - entry) < slDist * 0.75) continue;

          let adaptiveTP = isExplosive ? tpMultiplier * 1.2 : tpMultiplier;
          if (sessionPhase.phase === "NIGHT") adaptiveTP += 0.3;

          const beBase = (sessionPhase.phase === "MORNING" ? 0.45 : sessionPhase.phase === "AFTERNOON" ? 0.48 : 0.52);
          const beRatio = beBase * opt.beRatioMultiplier;

          const slPrice   = Number((entry - slDist).toFixed(precision));
          const tp08Price = Number((entry + slDist * beRatio).toFixed(precision));
          const tp1Price  = Number((entry + slDist * tp1Ratio).toFixed(precision));
          const tp2Price  = Number((entry + slDist * adaptiveTP).toFixed(precision));

          active = {
            type: "BUY",
            entryPrice: entry,
            entryTime: c.time,
            entryIndex: i,
            sl: slPrice,
            originalRisk: slDist,
            tp08: tp08Price,
            tp1: tp1Price,
            tp2: tp2Price,
            beHit: false,
            tp1Hit: false,
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

          const retestPremium = candleRange * opt.entryRetestPct;
          const baseEntry = Math.max(c.close, eFast * 0.999);
          const entry = Number((baseEntry + retestPremium).toFixed(precision));

          const recentHighs = candles.slice(Math.max(0, i - 5), i + 1).map((k) => k.high);
          const swingHigh = Math.max(...recentHighs);

          const atrMultSL = isNormalSqueeze
            ? (isExplosive ? 0.55 : 0.42)
            : (isExplosive ? 0.45 : isSqueeze ? 0.20 : 0.35);

          const slDist = Math.max(swingHigh - entry + currentATR * atrMultSL, currentATR * opt.slFloorMultiplier, minBuffer);

          const lookbackObstacle = candles.slice(Math.max(0, i - 24), i);
          const recentSwingLow = Math.min(...lookbackObstacle.map((b) => b.low));
          if (recentSwingLow < entry && (entry - recentSwingLow) < slDist * 0.75) continue;

          let adaptiveTP = isExplosive ? tpMultiplier * 1.2 : tpMultiplier;
          if (sessionPhase.phase === "NIGHT") adaptiveTP += 0.3;

          const beBase = (sessionPhase.phase === "MORNING" ? 0.45 : sessionPhase.phase === "AFTERNOON" ? 0.48 : 0.52);
          const beRatio = beBase * opt.beRatioMultiplier;

          const slPrice   = Number((entry + slDist).toFixed(precision));
          const tp08Price = Number((entry - slDist * beRatio).toFixed(precision));
          const tp1Price  = Number((entry - slDist * tp1Ratio).toFixed(precision));
          const tp2Price  = Number((entry - slDist * adaptiveTP).toFixed(precision));

          active = {
            type: "SELL",
            entryPrice: entry,
            entryTime: c.time,
            entryIndex: i,
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
    }
  }

  return trades;
}

async function runComparisons() {
  const dataPath = path.resolve(process.cwd(), "data", "xauusd_1h_deep.json");
  const candles: Candle[] = JSON.parse(fs.readFileSync(dataPath, "utf-8"));

  const configs: SimOptions[] = [
    {
      label: "1. Baseline (ปัจจุบัน)",
      slFloorMultiplier: 1.35,
      entryRetestPct: 0.0,
      beRatioMultiplier: 1.0,
    },
    {
      label: "2. Sniper Micro-SL Floor (0.95 ATR แทน 1.35 ATR)",
      slFloorMultiplier: 0.95,
      entryRetestPct: 0.0,
      beRatioMultiplier: 1.0,
    },
    {
      label: "3. Retest Shoulder Entry (เข้าคมขึ้น 10% ของไส้)",
      slFloorMultiplier: 1.35,
      entryRetestPct: 0.10,
      beRatioMultiplier: 1.0,
    },
    {
      label: "4. Fast BE Defense (ล็อก BE เร็วขึ้น 15%)",
      slFloorMultiplier: 1.35,
      entryRetestPct: 0.0,
      beRatioMultiplier: 0.85,
    },
    {
      label: "5. All-in-One Sniper Suite (Micro-SL + Retest + Fast BE)",
      slFloorMultiplier: 0.95,
      entryRetestPct: 0.08,
      beRatioMultiplier: 0.88,
    },
  ];

  const results = configs.map((cfg) => {
    const trades = runCustomBacktest(candles, cfg);
    let cumulativeR = 0;
    let peakR = 0;
    let maxDDR = 0;
    let wins = 0;
    let losses = 0;
    let bes = 0;
    let maxConsecL = 0;
    let curConsecL = 0;

    for (const t of trades) {
      if (t.result === "WIN") {
        wins++;
        curConsecL = 0;
      } else if (t.result === "LOSS") {
        losses++;
        curConsecL++;
        if (curConsecL > maxConsecL) maxConsecL = curConsecL;
      } else {
        bes++;
      }

      cumulativeR += t.pnlR;
      if (cumulativeR > peakR) peakR = cumulativeR;
      const dd = peakR - cumulativeR;
      if (dd > maxDDR) maxDDR = dd;
    }

    const wr = wins + losses > 0 ? (wins / (wins + losses)) * 100 : 0;
    const totalGainR = trades.filter(t => t.pnlR > 0).reduce((a, b) => a + b.pnlR, 0);
    const totalLossR = Math.abs(trades.filter(t => t.pnlR < 0).reduce((a, b) => a + b.pnlR, 0));
    const pf = totalLossR > 0 ? totalGainR / totalLossR : 99;

    // Simulate Cent Account $10 Compounding Drawdown
    let balCent = 1000.0;
    let peakCent = 1000.0;
    let maxDDCentPct = 0;

    for (const t of trades) {
      let pnlPct = 0;
      if (t.result === "WIN") pnlPct = t.pnlR * 0.02;
      else if (t.result === "LOSS") pnlPct = -0.02;
      else pnlPct = 0.002;

      balCent *= (1 + pnlPct);
      if (balCent > peakCent) peakCent = balCent;
      const dd = ((peakCent - balCent) / peakCent) * 100;
      if (dd > maxDDCentPct) maxDDCentPct = dd;
    }

    return {
      "แนวทางการพัฒนา": cfg.label,
      "จำนวนไม้": trades.length,
      "Win Rate": `${wr.toFixed(1)}%`,
      "กำไรสุทธิ (Net R)": `+${cumulativeR.toFixed(1)}R`,
      "Profit Factor": pf.toFixed(2),
      "Max DD (R)": `-${maxDDR.toFixed(2)}R`,
      "แพ้ติดกัน": `${maxConsecL} ไม้`,
      "Cent พอร์ต $10 จบ ($)": `$${(balCent / 100).toLocaleString(undefined, { maximumFractionDigits: 1 })}`,
      "Cent Max DD (%)": `-${maxDDCentPct.toFixed(1)}%`,
    };
  });

  console.table(results);
}

runComparisons().catch(console.error);
