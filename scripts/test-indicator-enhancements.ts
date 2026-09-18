/**
 * Test Enhanced Indicator Algorithms
 * ทดสอบการยกระดับอัลกอริทึมอินดิเคเตอร์แต่ละตัวหลังใส่ตัวกรองเชิงควอนต์
 */

import * as fs from "fs";
import * as path from "path";
import { getMarketCandles } from "../lib/marketService";
import {
  calculateEMA,
  calculateRSI,
  calculateSuperTrend,
  calculateBollingerBands,
  calculateADX,
  calculateATR,
  detectFairValueGaps,
  identifyOrderBlocksAndBreakers,
} from "../lib/indicators";
import { Candle } from "../lib/types";

// Load .env.local
try {
  const envPath = path.resolve(process.cwd(), ".env.local");
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, "utf-8").split("\n");
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith("#") && trimmed.includes("=")) {
        const [k, ...v] = trimmed.split("=");
        const key = k.trim();
        const val = v.join("=").trim().replace(/^["']|["']$/g, "");
        if (!process.env[key]) process.env[key] = val;
      }
    }
  }
} catch {}

interface Trade {
  result: "WIN" | "LOSS";
  rPnL: number;
}

function simulate(candles: Candle[], signals: Array<"BUY" | "SELL" | null>, atr: (number | null)[], tp = 1.5, sl = 1.5): Trade[] {
  const trades: Trade[] = [];
  let active: { type: "BUY" | "SELL"; sl: number; tp: number } | null = null;

  for (let i = 30; i < candles.length; i++) {
    const c = candles[i];
    if (active) {
      if (active.type === "BUY") {
        if (c.high >= active.tp) {
          trades.push({ result: "WIN", rPnL: tp / sl });
          active = null;
        } else if (c.low <= active.sl) {
          trades.push({ result: "LOSS", rPnL: -1.0 });
          active = null;
        }
      } else {
        if (c.low <= active.tp) {
          trades.push({ result: "WIN", rPnL: tp / sl });
          active = null;
        } else if (c.high >= active.sl) {
          trades.push({ result: "LOSS", rPnL: -1.0 });
          active = null;
        }
      }
    }

    if (!active && signals[i]) {
      const currentATR = atr[i] ?? Math.max(c.high - c.low, c.close * 0.005);
      const risk = currentATR * sl;
      const target = currentATR * tp;
      active = {
        type: signals[i]!,
        sl: signals[i] === "BUY" ? c.close - risk : c.close + risk,
        tp: signals[i] === "BUY" ? c.close + target : c.close - target,
      };
    }
  }
  return trades;
}

async function run() {
  console.log("\n==========================================================================");
  console.log(" 🚀 TESTING ENHANCED INDICATOR COMBINATIONS (CROSS-DISCIPLINE QUANT)");
  console.log("==========================================================================\n");

  const assets = ["XAUUSD", "EURUSD", "GBPUSD", "USDJPY", "BTCUSDT"];

  for (const sym of assets) {
    const candles = await getMarketCandles(sym, "1h");
    const n = candles.length;
    const atr14 = calculateATR(candles, 14);
    const atr10 = calculateATR(candles, 10);
    const ema200 = calculateEMA(candles, 200);
    const ema20 = calculateEMA(candles, 20);
    const ema50 = calculateEMA(candles, 50);
    const rsi = calculateRSI(candles, 14);
    const adx = calculateADX(candles, 14);
    const bb = calculateBollingerBands(candles, 20, 2.0);
    const st = calculateSuperTrend(candles, 10, 3.0, atr10, 4);

    // 1. SuperTrend Baseline vs Enhanced (SuperTrend + ADX > 22 + Trend Filter)
    const stBaseSignals: Array<"BUY" | "SELL" | null> = new Array(n).fill(null);
    const stEnhancedSignals: Array<"BUY" | "SELL" | null> = new Array(n).fill(null);

    for (let i = 1; i < n; i++) {
      const curr = st[i];
      const prev = st[i - 1];
      if (curr && prev) {
        if (curr.direction === "UP" && prev.direction === "DOWN") {
          stBaseSignals[i] = "BUY";
          // Enhanced: only take BUY if ADX > 20 and not overextended from EMA 200
          const e200 = ema200[i] ?? candles[i].close;
          const adxVal = adx[i] ?? 20;
          if (adxVal >= 20 && candles[i].close >= e200 * 0.995) {
            stEnhancedSignals[i] = "BUY";
          }
        } else if (curr.direction === "DOWN" && prev.direction === "UP") {
          stBaseSignals[i] = "SELL";
          const e200 = ema200[i] ?? candles[i].close;
          const adxVal = adx[i] ?? 20;
          if (adxVal >= 20 && candles[i].close <= e200 * 1.005) {
            stEnhancedSignals[i] = "SELL";
          }
        }
      }
    }

    // 2. RSI Baseline vs Enhanced (RSI 30/70 + Bollinger Band Touch)
    const rsiBaseSignals: Array<"BUY" | "SELL" | null> = new Array(n).fill(null);
    const rsiEnhancedSignals: Array<"BUY" | "SELL" | null> = new Array(n).fill(null);

    for (let i = 1; i < n; i++) {
      if (rsi[i] != null && rsi[i - 1] != null) {
        if (rsi[i]! > 30 && rsi[i - 1]! <= 30) {
          rsiBaseSignals[i] = "BUY";
          // Enhanced: must touch lower BB or close green
          const b = bb[i - 1];
          if (b && candles[i - 1].low <= b.lower && candles[i].close > candles[i].open) {
            rsiEnhancedSignals[i] = "BUY";
          }
        } else if (rsi[i]! < 70 && rsi[i - 1]! >= 70) {
          rsiBaseSignals[i] = "SELL";
          const b = bb[i - 1];
          if (b && candles[i - 1].high >= b.upper && candles[i].close < candles[i].open) {
            rsiEnhancedSignals[i] = "SELL";
          }
        }
      }
    }

    // 3. EMA Cross Baseline vs Enhanced (EMA 20/50 + Slope Angle Filter)
    const emaBaseSignals: Array<"BUY" | "SELL" | null> = new Array(n).fill(null);
    const emaEnhancedSignals: Array<"BUY" | "SELL" | null> = new Array(n).fill(null);

    for (let i = 3; i < n; i++) {
      if (ema20[i] != null && ema50[i] != null && ema20[i - 1] != null && ema50[i - 1] != null) {
        if (ema20[i]! > ema50[i]! && ema20[i - 1]! <= ema50[i - 1]!) {
          emaBaseSignals[i] = "BUY";
          const slope = (ema20[i]! - ema20[i - 2]!) / (atr14[i] || 1);
          if (slope > 0.1) emaEnhancedSignals[i] = "BUY";
        } else if (ema20[i]! < ema50[i]! && ema20[i - 1]! >= ema50[i - 1]!) {
          emaBaseSignals[i] = "SELL";
          const slope = (ema20[i - 2]! - ema20[i]!) / (atr14[i] || 1);
          if (slope > 0.1) emaEnhancedSignals[i] = "SELL";
        }
      }
    }

    const tStBase = simulate(candles, stBaseSignals, atr14);
    const tStEnh = simulate(candles, stEnhancedSignals, atr14);

    const tRsiBase = simulate(candles, rsiBaseSignals, atr14);
    const tRsiEnh = simulate(candles, rsiEnhancedSignals, atr14);

    const tEmaBase = simulate(candles, emaBaseSignals, atr14);
    const tEmaEnh = simulate(candles, emaEnhancedSignals, atr14);

    const wr = (ts: Trade[]) => ts.length > 0 ? ((ts.filter(t => t.result === "WIN").length / ts.length) * 100).toFixed(1) : "0.0";

    console.log(`📌 สินทรัพย์: ${sym} (${candles.length} แท่งเทียน)`);
    console.log(`  • SuperTrend เดิม      : ${wr(tStBase)}% (${tStBase.length} ไม้)  -> อัปเกรด (ADX+Macro) : \x1b[32m${wr(tStEnh)}%\x1b[0m (${tStEnh.length} ไม้)`);
    console.log(`  • RSI 14 เดิม          : ${wr(tRsiBase)}% (${tRsiBase.length} ไม้)  -> อัปเกรด (RSI+BB Touch): \x1b[32m${wr(tRsiEnh)}%\x1b[0m (${tRsiEnh.length} ไม้)`);
    console.log(`  • EMA 20/50 Cross เดิม : ${wr(tEmaBase)}% (${tEmaBase.length} ไม้)  -> อัปเกรด (Slope Filter): \x1b[32m${wr(tEmaEnh)}%\x1b[0m (${tEmaEnh.length} ไม้)`);
    console.log("--------------------------------------------------------------------------");
  }
}

run().catch(console.error);
