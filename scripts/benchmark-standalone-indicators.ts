/**
 * Aegis Quant Terminal — Standalone Indicator Win-Rate Benchmark
 * 
 * ทดสอบวัด Win-Rate ของแต่ละ Indicator แบบเดี่ยวๆ 100% (Pure Standalone)
 * โดยไม่พึ่งพา AI, ไม่พึ่งพา ข่าวเศรษฐกิจ, และไม่พึ่งพา 5 Pillars Confluence
 * เพื่อดูว่าอินดิเคเตอร์แต่ละตัวมีความแม่นยำเท่าไหร่ และตัวไหนควรปรับปรุงอย่างไร
 */

import * as fs from "fs";
import * as path from "path";
import { getMarketCandles } from "../lib/marketService";
import {
  calculateEMA,
  calculateRSI,
  calculateMACD,
  calculateSuperTrend,
  calculateBollingerBands,
  calculateStochRSI,
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
} catch {
  // ignore
}

interface Trade {
  type: "BUY" | "SELL";
  entryIndex: number;
  entryPrice: number;
  sl: number;
  tp: number;
  result: "WIN" | "LOSS";
  exitIndex: number;
  exitPrice: number;
  rPnL: number;
}

interface IndicatorTestResult {
  name: string;
  category: "Trend" | "Momentum / Oscillator" | "Volatility / Breakout" | "Smart Money (SMC)" | "Volume Flow";
  totalTrades: number;
  wins: number;
  losses: number;
  winRate: number;
  profitFactor: number;
  netR: number;
  avgBarsHeld: number;
}

const TEST_ASSETS = ["XAUUSD", "EURUSD", "GBPUSD", "USDJPY", "BTCUSDT"];

/**
 * Simulator engine for a sequence of BUY/SELL signals
 */
function simulateSignals(
  candles: Candle[],
  signals: Array<"BUY" | "SELL" | null>,
  atr: Array<number | null>,
  tpMultiplier = 1.5,
  slMultiplier = 1.5
): Trade[] {
  const trades: Trade[] = [];
  let activeTrade: {
    type: "BUY" | "SELL";
    entryIndex: number;
    entryPrice: number;
    sl: number;
    tp: number;
  } | null = null;

  for (let i = 30; i < candles.length; i++) {
    const c = candles[i];

    // Check active trade exit
    if (activeTrade) {
      if (activeTrade.type === "BUY") {
        if (c.high >= activeTrade.tp) {
          trades.push({
            type: "BUY",
            entryIndex: activeTrade.entryIndex,
            entryPrice: activeTrade.entryPrice,
            sl: activeTrade.sl,
            tp: activeTrade.tp,
            result: "WIN",
            exitIndex: i,
            exitPrice: activeTrade.tp,
            rPnL: tpMultiplier / slMultiplier,
          });
          activeTrade = null;
        } else if (c.low <= activeTrade.sl) {
          trades.push({
            type: "BUY",
            entryIndex: activeTrade.entryIndex,
            entryPrice: activeTrade.entryPrice,
            sl: activeTrade.sl,
            tp: activeTrade.tp,
            result: "LOSS",
            exitIndex: i,
            exitPrice: activeTrade.sl,
            rPnL: -1.0,
          });
          activeTrade = null;
        }
      } else {
        if (c.low <= activeTrade.tp) {
          trades.push({
            type: "SELL",
            entryIndex: activeTrade.entryIndex,
            entryPrice: activeTrade.entryPrice,
            sl: activeTrade.sl,
            tp: activeTrade.tp,
            result: "WIN",
            exitIndex: i,
            exitPrice: activeTrade.tp,
            rPnL: tpMultiplier / slMultiplier,
          });
          activeTrade = null;
        } else if (c.high >= activeTrade.sl) {
          trades.push({
            type: "SELL",
            entryIndex: activeTrade.entryIndex,
            entryPrice: activeTrade.entryPrice,
            sl: activeTrade.sl,
            tp: activeTrade.tp,
            result: "LOSS",
            exitIndex: i,
            exitPrice: activeTrade.sl,
            rPnL: -1.0,
          });
          activeTrade = null;
        }
      }
    }

    // New signal entry if flat
    if (!activeTrade && signals[i]) {
      const sig = signals[i]!;
      const currentATR = atr[i] ?? Math.max(c.high - c.low, c.close * 0.005);
      const risk = currentATR * slMultiplier;
      const target = currentATR * tpMultiplier;

      if (sig === "BUY") {
        activeTrade = {
          type: "BUY",
          entryIndex: i,
          entryPrice: c.close,
          sl: c.close - risk,
          tp: c.close + target,
        };
      } else {
        activeTrade = {
          type: "SELL",
          entryIndex: i,
          entryPrice: c.close,
          sl: c.close + risk,
          tp: c.close - target,
        };
      }
    }
  }

  return trades;
}

function evaluateTrades(trades: Trade[], name: string, category: IndicatorTestResult["category"]): IndicatorTestResult {
  const total = trades.length;
  const wins = trades.filter((t) => t.result === "WIN").length;
  const losses = trades.filter((t) => t.result === "LOSS").length;
  const winRate = total > 0 ? (wins / total) * 100 : 0;

  const totalGainR = trades.filter((t) => t.result === "WIN").reduce((sum, t) => sum + t.rPnL, 0);
  const totalLossR = trades.filter((t) => t.result === "LOSS").reduce((sum, t) => sum + Math.abs(t.rPnL), 0);
  const profitFactor = totalLossR > 0 ? totalGainR / totalLossR : totalGainR > 0 ? 99 : 0;
  const netR = totalGainR - totalLossR;

  const avgBars = total > 0 ? trades.reduce((sum, t) => sum + (t.exitIndex - t.entryIndex), 0) / total : 0;

  return {
    name,
    category,
    totalTrades: total,
    wins,
    losses,
    winRate: Number(winRate.toFixed(1)),
    profitFactor: Number(profitFactor.toFixed(2)),
    netR: Number(netR.toFixed(1)),
    avgBarsHeld: Number(avgBars.toFixed(1)),
  };
}

async function benchmarkAsset(symbol: string) {
  const candles = await getMarketCandles(symbol, "1h");
  if (!candles || candles.length < 100) {
    console.warn(`Cannot fetch candles for ${symbol}`);
    return null;
  }

  const n = candles.length;
  const atr14 = calculateATR(candles, 14);

  // 1. SuperTrend (10, 3.0)
  const atr10 = calculateATR(candles, 10);
  const st = calculateSuperTrend(candles, 10, 3.0, atr10, 4);
  const stSignals: Array<"BUY" | "SELL" | null> = new Array(n).fill(null);
  for (let i = 1; i < n; i++) {
    const curr = st[i];
    const prev = st[i - 1];
    if (curr && prev) {
      if (curr.direction === "UP" && prev.direction === "DOWN") stSignals[i] = "BUY";
      else if (curr.direction === "DOWN" && prev.direction === "UP") stSignals[i] = "SELL";
    }
  }

  // 2. EMA Trend Cross (EMA 20 vs EMA 50)
  const ema20 = calculateEMA(candles, 20);
  const ema50 = calculateEMA(candles, 50);
  const emaCrossSignals: Array<"BUY" | "SELL" | null> = new Array(n).fill(null);
  for (let i = 1; i < n; i++) {
    if (ema20[i] != null && ema50[i] != null && ema20[i - 1] != null && ema50[i - 1] != null) {
      if (ema20[i]! > ema50[i]! && ema20[i - 1]! <= ema50[i - 1]!) emaCrossSignals[i] = "BUY";
      else if (ema20[i]! < ema50[i]! && ema20[i - 1]! >= ema50[i - 1]!) emaCrossSignals[i] = "SELL";
    }
  }

  // 3. EMA 200 Macro Trend Breakout (Price vs EMA 200)
  const ema200 = calculateEMA(candles, 200);
  const ema200Signals: Array<"BUY" | "SELL" | null> = new Array(n).fill(null);
  for (let i = 1; i < n; i++) {
    if (ema200[i] != null && ema200[i - 1] != null) {
      if (candles[i].close > ema200[i]! && candles[i - 1].close <= ema200[i - 1]!) ema200Signals[i] = "BUY";
      else if (candles[i].close < ema200[i]! && candles[i - 1].close >= ema200[i - 1]!) ema200Signals[i] = "SELL";
    }
  }

  // 4. RSI (14) Mean-Reversion (Exit Oversold/Overbought: 30 / 70)
  const rsi = calculateRSI(candles, 14);
  const rsiRevSignals: Array<"BUY" | "SELL" | null> = new Array(n).fill(null);
  for (let i = 1; i < n; i++) {
    if (rsi[i] != null && rsi[i - 1] != null) {
      if (rsi[i]! > 30 && rsi[i - 1]! <= 30) rsiRevSignals[i] = "BUY";
      else if (rsi[i]! < 70 && rsi[i - 1]! >= 70) rsiRevSignals[i] = "SELL";
    }
  }

  // 5. RSI (14) Midline Momentum Cross (50 Level)
  const rsiMidSignals: Array<"BUY" | "SELL" | null> = new Array(n).fill(null);
  for (let i = 1; i < n; i++) {
    if (rsi[i] != null && rsi[i - 1] != null) {
      if (rsi[i]! > 50 && rsi[i - 1]! <= 50) rsiMidSignals[i] = "BUY";
      else if (rsi[i]! < 50 && rsi[i - 1]! >= 50) rsiMidSignals[i] = "SELL";
    }
  }

  // 6. MACD (12, 26, 9) Signal Line Cross
  const macd = calculateMACD(candles, 12, 26, 9);
  const macdSignals: Array<"BUY" | "SELL" | null> = new Array(n).fill(null);
  for (let i = 1; i < n; i++) {
    const mNow = macd.macdLine[i];
    const sNow = macd.signalLine[i];
    const mPrev = macd.macdLine[i - 1];
    const sPrev = macd.signalLine[i - 1];
    if (mNow != null && sNow != null && mPrev != null && sPrev != null) {
      if (mNow > sNow && mPrev <= sPrev) macdSignals[i] = "BUY";
      else if (mNow < sNow && mPrev >= sPrev) macdSignals[i] = "SELL";
    }
  }

  // 7. MACD Histogram Zero Cross
  const macdHistSignals: Array<"BUY" | "SELL" | null> = new Array(n).fill(null);
  for (let i = 1; i < n; i++) {
    const hNow = macd.histogram[i];
    const hPrev = macd.histogram[i - 1];
    if (hNow != null && hPrev != null) {
      if (hNow > 0 && hPrev <= 0) macdHistSignals[i] = "BUY";
      else if (hNow < 0 && hPrev >= 0) macdHistSignals[i] = "SELL";
    }
  }

  // 8. Bollinger Bands (20, 2.0) Mean-Reversion Bounce
  const bb = calculateBollingerBands(candles, 20, 2.0, 4);
  const bbSignals: Array<"BUY" | "SELL" | null> = new Array(n).fill(null);
  for (let i = 1; i < n; i++) {
    const bCurr = bb[i];
    const bPrev = bb[i - 1];
    if (bCurr && bPrev) {
      // Touch lower band and bounce green
      if (candles[i - 1].low <= bPrev.lower && candles[i].close > candles[i].open) bbSignals[i] = "BUY";
      // Touch upper band and bounce red
      else if (candles[i - 1].high >= bPrev.upper && candles[i].close < candles[i].open) bbSignals[i] = "SELL";
    }
  }

  // 9. Stochastic RSI (14, 14, 3, 3) — โซน Oversold/Overbought + Momentum Cross
  //    ผ่อนเงื่อนไขเป็น k < 40 (oversold) / k > 60 (overbought) เพื่อให้มีสัญญาณจริง
  //    และเพิ่ม pure K/D cross ใน midzone สำหรับ momentum continuation
  const stochRSI = calculateStochRSI(candles, 14, 14, 3, 3, rsi);
  const stochSignals: Array<"BUY" | "SELL" | null> = new Array(n).fill(null);
  const stochMomentumSignals: Array<"BUY" | "SELL" | null> = new Array(n).fill(null);
  for (let i = 2; i < n; i++) {
    const sCurr = stochRSI[i];
    const sPrev = stochRSI[i - 1];
    if (sCurr && sPrev && sCurr.k != null && sCurr.d != null && sPrev.k != null && sPrev.d != null) {
      // Zone-filtered reversal: relaxed to 40/60
      if (sCurr.k > sCurr.d && sPrev.k <= sPrev.d && sCurr.k < 40) stochSignals[i] = "BUY";
      else if (sCurr.k < sCurr.d && sPrev.k >= sPrev.d && sCurr.k > 60) stochSignals[i] = "SELL";

      // Pure K/D momentum cross (ไม่กรองโซน) — ใช้ทดสอบแยก
      if (sCurr.k > sCurr.d && sPrev.k <= sPrev.d && sCurr.k > 20 && sCurr.k < 80) stochMomentumSignals[i] = "BUY";
      else if (sCurr.k < sCurr.d && sPrev.k >= sPrev.d && sCurr.k > 20 && sCurr.k < 80) stochMomentumSignals[i] = "SELL";
    }
  }

  // 10. Donchian Channel (20) Breakout (Turtle Trading)
  const donchianSignals: Array<"BUY" | "SELL" | null> = new Array(n).fill(null);
  for (let i = 21; i < n; i++) {
    const prevSlice = candles.slice(i - 20, i);
    const upper20 = Math.max(...prevSlice.map((c) => c.high));
    const lower20 = Math.min(...prevSlice.map((c) => c.low));
    if (candles[i].close > upper20 && candles[i - 1].close <= upper20) donchianSignals[i] = "BUY";
    else if (candles[i].close < lower20 && candles[i - 1].close >= lower20) donchianSignals[i] = "SELL";
  }

  // 11. ADX (14) + DI Trend Momentum
  //     แก้ threshold จาก 22 → 18 เพื่อไม่ตัดสัญญาณดีออกมากเกินไป
  //     เพิ่ม SuperTrend+ADX combo (ADX ≥ 18 + SuperTrend direction = confirmation)
  const adx = calculateADX(candles, 14);
  const adxSignals: Array<"BUY" | "SELL" | null> = new Array(n).fill(null);
  // SuperTrend + ADX Combo — ADX ≥ 18 (threshold ต่ำลงเพื่อไม่ตัดสัญญาณดีออก)
  // ใช้ SuperTrend direction เป็น filter แทน EMA200 position ที่เคย false-positive สูง
  const stAdxComboSignals: Array<"BUY" | "SELL" | null> = new Array(n).fill(null);
  for (let i = 1; i < n; i++) {
    const val = adx[i];
    const prev = adx[i - 1];
    const stCurr = st[i];
    if (val && prev && val >= 18) {
      // ADX standalone (ใช้ EMA20 filter เดิมแต่ threshold ต่ำลง)
      if (val > prev && candles[i].close > (ema20[i] ?? 0)) adxSignals[i] = "BUY";
      else if (val > prev && candles[i].close < (ema20[i] ?? Infinity)) adxSignals[i] = "SELL";

      // SuperTrend + ADX combo — SuperTrend direction เป็น primary กรอง noise ด้วย ADX rising
      if (stCurr && stCurr.direction === "UP" && val > prev) stAdxComboSignals[i] = "BUY";
      else if (stCurr && stCurr.direction === "DOWN" && val > prev) stAdxComboSignals[i] = "SELL";
    }
  }


  // 13. SMC Order Blocks Retest
  const obInfo = identifyOrderBlocksAndBreakers(candles);
  const obSignals: Array<"BUY" | "SELL" | null> = new Array(n).fill(null);
  if (obInfo && obInfo.activeBlocks) {
    for (let i = 20; i < n; i++) {
      const c = candles[i];
      const bullOB = obInfo.activeBlocks.find((b) => b.type === "BULLISH_OB" && c.low <= b.priceMax && c.close >= b.priceMin);
      const bearOB = obInfo.activeBlocks.find((b) => b.type === "BEARISH_OB" && c.high >= b.priceMin && c.close <= b.priceMax);
      if (bullOB && c.close > c.open) obSignals[i] = "BUY";
      else if (bearOB && c.close < c.open) obSignals[i] = "SELL";
    }
  }

  // 14. Fair Value Gap (FVG) Tap / Retest
  const fvgList = detectFairValueGaps(candles, atr14);
  const fvgSignals: Array<"BUY" | "SELL" | null> = new Array(n).fill(null);
  for (let i = 20; i < n; i++) {
    const c = candles[i];
    const bullFVG = fvgList.find((f) => f.type === "BULLISH" && !f.mitigated && c.low <= f.top && c.close >= f.bottom);
    const bearFVG = fvgList.find((f) => f.type === "BEARISH" && !f.mitigated && c.high >= f.bottom && c.close <= f.top);
    if (bullFVG && c.close > c.open) fvgSignals[i] = "BUY";
    else if (bearFVG && c.close < c.open) fvgSignals[i] = "SELL";
  }

  // 15. CVD / Volume Delta Cumulative Trend
  const cvdSignals: Array<"BUY" | "SELL" | null> = new Array(n).fill(null);
  let runningCVD = 0;
  const cvdLine: number[] = [];
  for (let i = 0; i < n; i++) {
    const c = candles[i];
    const range = c.high - c.low;
    const vol = Math.max(c.volume || 1, 1);
    const buyRatio = range > 0 ? (c.close - c.low) / range : (c.close >= c.open ? 0.6 : 0.4);
    const delta = (buyRatio * 2 - 1) * vol;
    runningCVD += delta;
    cvdLine.push(runningCVD);

    if (i >= 2) {
      if (cvdLine[i] > cvdLine[i - 1] && cvdLine[i - 1] > cvdLine[i - 2] && c.close > c.open) {
        cvdSignals[i] = "BUY";
      } else if (cvdLine[i] < cvdLine[i - 1] && cvdLine[i - 1] < cvdLine[i - 2] && c.close < c.open) {
        cvdSignals[i] = "SELL";
      }
    }
  }

  const indicatorConfigs = [
    { name: "SuperTrend (10, 3.0)", cat: "Trend" as const, signals: stSignals },
    { name: "EMA Cross (20/50)", cat: "Trend" as const, signals: emaCrossSignals },
    { name: "EMA 200 Trend Breakout", cat: "Trend" as const, signals: ema200Signals },
    { name: "Donchian 20 Breakout", cat: "Volatility / Breakout" as const, signals: donchianSignals },
    { name: "ADX (14) Trend Momentum (≥18)", cat: "Trend" as const, signals: adxSignals },
    { name: "SuperTrend + ADX Combo", cat: "Trend" as const, signals: stAdxComboSignals },
    { name: "MACD Line Cross", cat: "Momentum / Oscillator" as const, signals: macdSignals },
    { name: "MACD Histogram Flip", cat: "Momentum / Oscillator" as const, signals: macdHistSignals },
    { name: "RSI 14 Mean-Reversion (30/70)", cat: "Momentum / Oscillator" as const, signals: rsiRevSignals },
    { name: "RSI 14 Midline Cross (50)", cat: "Momentum / Oscillator" as const, signals: rsiMidSignals },
    { name: "Stochastic RSI Zone-Rev (40/60)", cat: "Momentum / Oscillator" as const, signals: stochSignals },
    { name: "Stochastic RSI Momentum Cross", cat: "Momentum / Oscillator" as const, signals: stochMomentumSignals },
    { name: "Bollinger Bands Reversion (20, 2)", cat: "Volatility / Breakout" as const, signals: bbSignals },
    { name: "SMC Order Blocks (OB)", cat: "Smart Money (SMC)" as const, signals: obSignals },
    { name: "Fair Value Gap (FVG)", cat: "Smart Money (SMC)" as const, signals: fvgSignals },
    { name: "CVD Cumulative Volume Delta", cat: "Volume Flow" as const, signals: cvdSignals },
  ];

  const results: IndicatorTestResult[] = [];
  for (const ind of indicatorConfigs) {
    const trades = simulateSignals(candles, ind.signals, atr14, 1.5, 1.5);
    results.push(evaluateTrades(trades, ind.name, ind.cat));
  }

  return { symbol, candleCount: candles.length, results };
}

async function main() {
  console.log("\n==========================================================================================");
  console.log(" 🧪 AEGIS QUANT TERMINAL — PURE STANDALONE INDICATOR BENCHMARK (NO AI / NO NEWS / NO FILTER)");
  console.log("==========================================================================================\n");
  console.log("⚙️  เงื่อนไขการทดสอบแบบ Pure Standalone (อิสระ 100%):");
  console.log("   • ไม่ใช้ AI Gemini / ไม่ใช้เกราะป้องกันข่าว Forex Factory / ไม่ใช้ Confluence รวม");
  console.log("   • คำนวณสัญญาณซื้อขายตามสูตรทางคณิตศาสตร์แท้ๆ ของอินดิเคเตอร์แต่ละตัว");
  console.log("   • ความเสี่ยงคงที่มาตรฐานเดียวกันทุกตัว: SL = 1.5 ATR, TP = 1.5 ATR (Risk:Reward 1:1)");
  console.log("   • ทดสอบครอบคลุมทั้ง ทองคำ (XAUUSD), Forex (EURUSD, GBPUSD, USDJPY), และ Crypto (BTCUSDT)\n");

  const assetResults = [];
  for (const sym of TEST_ASSETS) {
    process.stdout.write(`กำลังดึงข้อมูลและจำลองอินดิเคเตอร์สำหรับ ${sym}... `);
    const res = await benchmarkAsset(sym);
    if (res) {
      assetResults.push(res);
      console.log(`✅ (${res.candleCount} แท่งเทียน)`);
    } else {
      console.log(`❌ ล้มเหลว`);
    }
  }

  if (assetResults.length === 0) {
    console.error("ไม่มีข้อมูลสินทรัพย์ที่ทดสอบได้");
    return;
  }

  // Aggregate stats per indicator
  const aggregateMap = new Map<string, {
    cat: IndicatorTestResult["category"];
    totalTrades: number;
    wins: number;
    losses: number;
    totalGainR: number;
    totalLossR: number;
    perAssetWR: { [key: string]: number };
  }>();

  for (const asset of assetResults) {
    for (const r of asset.results) {
      if (!aggregateMap.has(r.name)) {
        aggregateMap.set(r.name, {
          cat: r.category,
          totalTrades: 0,
          wins: 0,
          losses: 0,
          totalGainR: 0,
          totalLossR: 0,
          perAssetWR: {},
        });
      }
      const agg = aggregateMap.get(r.name)!;
      agg.totalTrades += r.totalTrades;
      agg.wins += r.wins;
      agg.losses += r.losses;
      agg.totalGainR += r.wins * 1.0;
      agg.totalLossR += r.losses * 1.0;
      agg.perAssetWR[asset.symbol] = r.winRate;
    }
  }

  // Format final summary table
  const summaryList = Array.from(aggregateMap.entries()).map(([name, data]) => {
    const wr = data.totalTrades > 0 ? (data.wins / data.totalTrades) * 100 : 0;
    const pf = data.totalLossR > 0 ? data.totalGainR / data.totalLossR : 0;
    const netR = data.totalGainR - data.totalLossR;
    return {
      name,
      category: data.cat,
      totalTrades: data.totalTrades,
      wins: data.wins,
      losses: data.losses,
      winRate: Number(wr.toFixed(1)),
      profitFactor: Number(pf.toFixed(2)),
      netR: Number(netR.toFixed(1)),
      perAssetWR: data.perAssetWR,
    };
  });

  // Sort descending by Win Rate
  summaryList.sort((a, b) => b.winRate - a.winRate);

  console.log("\n==========================================================================================");
  console.log(" 🏆 ตารางจัดอันดับ WIN-RATE ของอินดิเคเตอร์แต่ละตัวแบบ PURE STANDALONE (คะแนนรวมทุกสินทรัพย์)");
  console.log("==========================================================================================");
  console.log(
    " อันดับ".padEnd(8) +
    "ชื่ออินดิเคเตอร์".padEnd(32) +
    "หมวดหมู่".padEnd(24) +
    "จำนวนไม้".padStart(10) +
    "ชนะ / แพ้".padStart(14) +
    "Win Rate (%)".padStart(15) +
    "Profit Factor".padStart(15)
  );
  console.log("------------------------------------------------------------------------------------------------------------------");

  summaryList.forEach((item, idx) => {
    const rank = `#${idx + 1}`.padEnd(8);
    const name = item.name.padEnd(32);
    const cat = item.category.padEnd(24);
    const trades = `${item.totalTrades}`.padStart(10);
    const wl = `${item.wins}W / ${item.losses}L`.padStart(14);
    const color = item.winRate >= 60 ? "\x1b[32m\x1b[1m" : item.winRate >= 50 ? "\x1b[33m" : "\x1b[31m";
    const wr = `${color}${item.winRate.toFixed(1)}%\x1b[0m`.padStart(24);
    const pf = `${item.profitFactor.toFixed(2)}`.padStart(15);
    console.log(` ${rank}${name}${cat}${trades}${wl}${wr}${pf}`);
  });
  console.log("------------------------------------------------------------------------------------------------------------------\n");

  // Per-Asset Breakdown Matrix
  console.log("==========================================================================================");
  console.log(" 📊 ตาราง WIN-RATE (%) แยกตามรายสินทรัพย์ (Asset Breakdown Matrix)");
  console.log("==========================================================================================");
  const assetHeaders = TEST_ASSETS.map((a) => a.padStart(12)).join("");
  console.log(" อินดิเคเตอร์".padEnd(32) + assetHeaders + "เฉลี่ยรวม".padStart(14));
  console.log("------------------------------------------------------------------------------------------------------------------");

  for (const item of summaryList) {
    const name = item.name.padEnd(32);
    const assetCols = TEST_ASSETS.map((a) => {
      const val = item.perAssetWR[a];
      if (val === undefined) return "   -    ".padStart(12);
      const color = val >= 60 ? "\x1b[32m" : val >= 50 ? "\x1b[33m" : "\x1b[31m";
      return `${color}${val.toFixed(1)}%\x1b[0m`.padStart(21);
    }).join("");
    const avgColor = item.winRate >= 60 ? "\x1b[32m\x1b[1m" : item.winRate >= 50 ? "\x1b[33m" : "\x1b[31m";
    const avg = `${avgColor}${item.winRate.toFixed(1)}%\x1b[0m`.padStart(22);
    console.log(` ${name}${assetCols}${avg}`);
  }
  console.log("------------------------------------------------------------------------------------------------------------------\n");
}

main().catch(console.error);
