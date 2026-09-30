import * as fs from "fs";
import * as path from "path";
import { Candle } from "../lib/types";
import { calculateATR, calculateEMA, calculateRSI, calculateADX, calculateBollingerBands } from "../lib/indicators";

async function testHighFrequencyEdge() {
  const dataPath = path.resolve(process.cwd(), "data", "xauusd_1h_deep.json");
  const candles: Candle[] = JSON.parse(fs.readFileSync(dataPath, "utf-8"));

  const atrs = calculateATR(candles, 14);
  const ema20 = calculateEMA(candles, 20);
  const ema50 = calculateEMA(candles, 50);
  const ema200 = calculateEMA(candles, 200);
  const rsi = calculateRSI(candles, 14);
  const adx = calculateADX(candles, 14);
  const bb = calculateBollingerBands(candles, 20, 2);

  console.log("================================================================================");
  console.log(" 🧪 EXPERIMENT: MAXIMIZING ACCURACY ON HIGH-FREQUENCY / BAR-BY-BAR TRADING");
  console.log("================================================================================\n");

  // Strategy A: Bar-by-bar Scalp with Asymmetric Target (TP 0.5x ATR, SL 1.0x ATR + Breakeven at +0.3x ATR)
  // Direction decided by: Multi-EMA Ribbon + RSI Slope on every bar
  let winsA = 0;
  let lossesA = 0;
  let besA = 0;
  let totalPipsA = 0;

  for (let i = 50; i < candles.length - 20; i++) {
    const c = candles[i];
    const atr = atrs[i] || 10;
    const e20 = ema20[i] || c.close;
    const e50 = ema50[i] || c.close;
    const r = rsi[i] || 50;
    const rPrev = rsi[i - 1] || 50;

    // Direction: Trend + Momentum slope
    const isBull = c.close > e20 && e20 >= e50 && r >= rPrev;
    const isBear = c.close < e20 && e20 <= e50 && r <= rPrev;

    if (!isBull && !isBear) continue;

    const entry = c.close;
    const tp = isBull ? entry + atr * 0.6 : entry - atr * 0.6;
    let sl = isBull ? entry - atr * 0.8 : entry + atr * 0.8;
    const beTrigger = isBull ? entry + atr * 0.3 : entry - atr * 0.3;
    let beHit = false;

    let tradeResult: "WIN" | "LOSS" | "BE" | "OPEN" = "OPEN";

    for (let j = i + 1; j < Math.min(i + 15, candles.length); j++) {
      const fut = candles[j];
      if (isBull) {
        if (!beHit && fut.high >= beTrigger) {
          beHit = true;
          sl = entry; // Move to BE
        }
        if (fut.high >= tp) {
          tradeResult = "WIN";
          break;
        }
        if (fut.low <= sl) {
          tradeResult = beHit ? "BE" : "LOSS";
          break;
        }
      } else {
        if (!beHit && fut.low <= beTrigger) {
          beHit = true;
          sl = entry;
        }
        if (fut.low <= tp) {
          tradeResult = "WIN";
          break;
        }
        if (fut.high >= sl) {
          tradeResult = beHit ? "BE" : "LOSS";
          break;
        }
      }
    }

    if (tradeResult === "WIN") {
      winsA++;
      totalPipsA += (atr * 0.6) * 10;
    } else if (tradeResult === "LOSS") {
      lossesA++;
      totalPipsA -= (atr * 0.8) * 10;
    } else if (tradeResult === "BE") {
      besA++;
      totalPipsA += 1;
    }
  }

  const totalTradesA = winsA + lossesA + besA;
  const wrA_excl = ((winsA / (winsA + lossesA)) * 100).toFixed(1);
  const wrA_incl = (((winsA + besA * 0.5) / totalTradesA) * 100).toFixed(1);

  console.log("--- 1. SCALPING EDGE: DYNAMIC MICRO-TARGET + EARLY BREAKEVEN ---");
  console.log(`- Trades Evaluated: ${totalTradesA.toLocaleString()} ไม้ (เฉลี่ยเกือบทุกชั่วโมง)`);
  console.log(`- Win Rate (Excl BE): ${wrA_excl}%  |  Win Rate (Incl BE): ${wrA_incl}%`);
  console.log(`- สัดส่วน: ชนะ ${winsA.toLocaleString()} | แพ้ ${lossesA.toLocaleString()} | เสมอ ${besA.toLocaleString()}`);
  console.log(`- กำไรสุทธิ: ${totalPipsA.toFixed(1)} pips | Profit Factor: ${((winsA * 0.6) / (lossesA * 0.8)).toFixed(2)}\n`);

  // Strategy B: Dual-Regime Classifier on Every Bar (Trend Following when ADX > 22, Mean Reversion when ADX <= 22)
  let winsB = 0;
  let lossesB = 0;
  let besB = 0;
  let totalPipsB = 0;

  for (let i = 50; i < candles.length - 20; i++) {
    const c = candles[i];
    const atr = atrs[i] || 10;
    const a = adx[i] || 20;
    const b = bb[i];
    const e20 = ema20[i] || c.close;
    const r = rsi[i] || 50;

    let isBull = false;
    let isBear = false;

    if (a >= 22) {
      // Regime 1: Trending -> Momentum direction
      isBull = c.close > e20 && r > 50;
      isBear = c.close < e20 && r < 50;
    } else {
      // Regime 2: Ranging (Mean Reversion) -> Fade Bollinger extremes
      if (b && c.low <= b.lower && r <= 40) isBull = true; // Buy oversold bottom
      else if (b && c.high >= b.upper && r >= 60) isBear = true; // Sell overbought top
    }

    if (!isBull && !isBear) continue;

    const entry = c.close;
    const tp = isBull ? entry + atr * 0.75 : entry - atr * 0.75;
    let sl = isBull ? entry - atr * 0.9 : entry + atr * 0.9;
    const beTrigger = isBull ? entry + atr * 0.4 : entry - atr * 0.4;
    let beHit = false;

    let tradeResult: "WIN" | "LOSS" | "BE" | "OPEN" = "OPEN";

    for (let j = i + 1; j < Math.min(i + 20, candles.length); j++) {
      const fut = candles[j];
      if (isBull) {
        if (!beHit && fut.high >= beTrigger) {
          beHit = true;
          sl = entry;
        }
        if (fut.high >= tp) { tradeResult = "WIN"; break; }
        if (fut.low <= sl) { tradeResult = beHit ? "BE" : "LOSS"; break; }
      } else {
        if (!beHit && fut.low <= beTrigger) {
          beHit = true;
          sl = entry;
        }
        if (fut.low <= tp) { tradeResult = "WIN"; break; }
        if (fut.high >= sl) { tradeResult = beHit ? "BE" : "LOSS"; break; }
      }
    }

    if (tradeResult === "WIN") {
      winsB++;
      totalPipsB += (atr * 0.75) * 10;
    } else if (tradeResult === "LOSS") {
      lossesB++;
      totalPipsB -= (atr * 0.9) * 10;
    } else if (tradeResult === "BE") {
      besB++;
      totalPipsB += 1;
    }
  }

  const totalTradesB = winsB + lossesB + besB;
  const wrB_excl = ((winsB / (winsB + lossesB)) * 100).toFixed(1);

  console.log("--- 2. REGIME-ADAPTIVE CLASSIFIER (TREND + MEAN-REVERSION) ---");
  console.log(`- Trades Evaluated: ${totalTradesB.toLocaleString()} ไม้`);
  console.log(`- Win Rate (Excl BE): ${wrB_excl}%`);
  console.log(`- สัดส่วน: ชนะ ${winsB.toLocaleString()} | แพ้ ${lossesB.toLocaleString()} | เสมอ ${besB.toLocaleString()}`);
  console.log(`- กำไรสุทธิ: ${totalPipsB.toFixed(1)} pips | Profit Factor: ${((winsB * 0.75) / (lossesB * 0.9)).toFixed(2)}\n`);
}

testHighFrequencyEdge().catch(console.error);
