import * as fs from "fs";
import * as path from "path";
import { Candle } from "../lib/types";
import { calculateATR, calculateEMA, calculateRSI, calculateADX, calculateBollingerBands } from "../lib/indicators";
import { resampleCandlesTo4H } from "../lib/marketService";

async function testDualRegime() {
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
  const bb = calculateBollingerBands(candles, 20, 2);

  // We will run a Dual-Regime Backtest:
  // 1. Trend Regime (ADX >= 20 & Alignment): Trend Swing Pullback (our current 338 trades engine)
  // 2. Sideway Regime (ADX < 20 or Sideway Box): Range Box Mean Reversion (Buy Box Low, Sell Box High)

  let active: any = null;
  let lastTradeExitBar = -6;
  const trades: any[] = [];

  // Track 20-bar Rolling Box (Highest High & Lowest Low)
  for (let i = 35; i < candles.length; i++) {
    const c = candles[i];
    const prevC = candles[i - 1];
    const atr = atrs[i] || 10;
    const adxVal = adx[i] || 20;
    const rVal = rsi[i] || 50;
    const rValPrev = rsi[i - 1] || 50;

    // Active Trade Management
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
      if (i - lastTradeExitBar < 2) continue;

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

      const eFast = emaFast[i] ?? c.close;
      const eSlow = emaSlow[i] ?? c.close;
      const eTrend = emaTrend[i] ?? c.close;

      const isBullTrend = eFast > eSlow && c.close > eTrend;
      const isBearTrend = eFast < eSlow && c.close < eTrend;

      // ─── REGIME 1: TREND SWING (When ADX >= 18 and trend is clear) ───
      if (adxVal >= 18 && (isBullTrend || isBearTrend)) {
        if (isBullTrend && dynamicHtfBias === "BEAR") continue;
        if (isBearTrend && dynamicHtfBias === "BULL") continue;

        const isBuyPullback  = c.low <= eFast * 1.012 && c.close >= eSlow * 0.990 && rVal >= 30 && rVal <= 75;
        const isSellPullback = c.high >= eFast * 0.988 && c.close <= eSlow * 1.010 && rVal <= 70 && rVal >= 25;

        const candleRange = c.high - c.low;
        const candleBody = Math.abs(c.close - c.open);
        const lowerWick = Math.min(c.close, c.open) - c.low;
        const upperWick = c.high - Math.max(c.close, c.open);

        const isBullishRejection = candleRange > 0 && ((lowerWick >= candleRange * 0.25 && c.close >= c.open) || (c.close > c.open && c.close > prevC.high));
        const isBearishRejection = candleRange > 0 && ((upperWick >= candleRange * 0.25 && c.close <= c.open) || (c.close < c.open && c.close < prevC.low));

        const isHammer = candleRange > 0 && lowerWick >= candleRange * 0.60 && (c.close >= c.open || candleBody >= candleRange * 0.18);
        const isShootingStar = candleRange > 0 && upperWick >= candleRange * 0.60 && (c.close <= c.open || candleBody >= candleRange * 0.18);

        if (isBullTrend && isBuyPullback && isBullishRejection && rVal >= rValPrev && (c.close > c.open || isHammer)) {
          const entry = c.close;
          const recentLows = candles.slice(Math.max(0, i - 5), i + 1).map((k) => k.low);
          const slDist = Math.max(entry - Math.min(...recentLows) + atr * 0.35, atr * 1.35, 2.5);

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
          const slDist = Math.max(Math.max(...recentHighs) - entry + atr * 0.35, atr * 1.35, 2.5);

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

      // ─── REGIME 2: SIDEWAY RANGE BOX (When market is in consolidation / ADX < 22) ───
      // Calculate 20-bar Range Box Support & Resistance
      const boxCandles = candles.slice(Math.max(0, i - 20), i);
      const boxHigh = Math.max(...boxCandles.map((k) => k.high));
      const boxLow = Math.min(...boxCandles.map((k) => k.low));
      const boxHeight = boxHigh - boxLow;
      const boxMid = (boxHigh + boxLow) / 2;

      // Only trade healthy boxes (height between 1.5x and 4.0x ATR)
      if (boxHeight >= atr * 1.5 && boxHeight <= atr * 4.5 && adxVal < 25) {
        const b = bb[i];

        // 1. Buy at Box Support (Bottom 25% of Box + RSI Oversold Hook)
        const isNearBoxFloor = c.low <= boxLow + boxHeight * 0.22;
        const isRsiOversold = rVal <= 42 && rVal >= rValPrev;
        const isLowerWickReject = (Math.min(c.close, c.open) - c.low) >= (c.high - c.low) * 0.35 || c.close > c.open;

        if (isNearBoxFloor && isRsiOversold && isLowerWickReject && dynamicHtfBias !== "BEAR") {
          const entry = c.close;
          const slDist = Math.max(entry - boxLow + atr * 0.35, atr * 1.0, 2.5);
          const targetMid = boxMid;
          const targetHigh = boxHigh - atr * 0.3;
          const tpDist = targetHigh - entry;

          if (tpDist >= slDist * 1.2) { // Minimum 1:1.2 RR for range trade
            active = {
              type: "BUY",
              mode: "SIDEWAY_RANGE",
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

        // 2. Sell at Box Resistance (Top 25% of Box + RSI Overbought Hook)
        const isNearBoxCeiling = c.high >= boxHigh - boxHeight * 0.22;
        const isRsiOverbought = rVal >= 58 && rVal <= rValPrev;
        const isUpperWickReject = (c.high - Math.max(c.close, c.open)) >= (c.high - c.low) * 0.35 || c.close < c.open;

        if (isNearBoxCeiling && isRsiOverbought && isUpperWickReject && dynamicHtfBias !== "BULL") {
          const entry = c.close;
          const slDist = Math.max(boxHigh - entry + atr * 0.35, atr * 1.0, 2.5);
          const targetMid = boxMid;
          const targetLow = boxLow + atr * 0.3;
          const tpDist = entry - targetLow;

          if (tpDist >= slDist * 1.2) {
            active = {
              type: "SELL",
              mode: "SIDEWAY_RANGE",
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

  console.log("================================================================================");
  console.log(" 🏆 DUAL-REGIME TERMINAL RESULTS: TREND SWING + SIDEWAY RANGE BOX");
  console.log("================================================================================\n");

  const trendTrades = trades.filter((t) => t.mode === "TREND_SWING");
  const rangeTrades = trades.filter((t) => t.mode === "SIDEWAY_RANGE");

  const calcStats = (ts: any[], label: string) => {
    const w = ts.filter((t) => t.result === "WIN").length;
    const l = ts.filter((t) => t.result === "LOSS").length;
    const b = ts.filter((t) => t.result === "BE").length;
    const wr = Number(((w / (w + l)) * 100).toFixed(1));
    const netR = Number(ts.reduce((a, t) => a + t.pnlR, 0).toFixed(1));
    const netPips = Number(ts.reduce((a, t) => a + t.pnlPips, 0).toFixed(1));
    const gainR = ts.filter((t) => t.result === "WIN").reduce((a, t) => a + t.pnlR, 0);
    const lossR = Math.abs(ts.filter((t) => t.result === "LOSS").reduce((a, t) => a + t.pnlR, 0));
    const pf = lossR > 0 ? Number((gainR / lossR).toFixed(2)) : 99;
    console.log(`[${label}]`);
    console.log(`- จำนวนไม้: ${ts.length} ไม้ (ชนะ: ${w} | แพ้: ${l} | เสมอ: ${b})`);
    console.log(`- Win Rate: ${wr}% | Profit Factor: ${pf} | Net Pips: +${netPips} pips | Net R: +${netR}R\n`);
  };

  calcStats(trendTrades, "1. TREND SWING ENGINE (เทรนด์ใหญ่)");
  calcStats(rangeTrades, "2. SIDEWAY RANGE BOX ENGINE (กรอบไซด์เวย์)");
  calcStats(trades, "🌟 COMBINED ALL-WEATHER TERMINAL (รวมทั้งสองระบบ)");
}

testDualRegime().catch(console.error);
