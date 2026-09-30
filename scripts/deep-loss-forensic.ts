import * as fs from "fs";
import * as path from "path";
import { Candle } from "../lib/types";
import { simulateInstitutionalBacktest, resampleCandlesTo4H } from "../lib/marketService";
import { calculateEMA, calculateRSI, calculateATR } from "../lib/indicators";

async function deepLossForensic() {
  const dataPath = path.resolve(process.cwd(), "data", "xauusd_1h_deep.json");
  const candles: Candle[] = JSON.parse(fs.readFileSync(dataPath, "utf-8"));
  const trades = simulateInstitutionalBacktest("XAUUSD", candles);

  const losses = trades.filter((t) => t.result === "LOSS");
  const candles4H = resampleCandlesTo4H(candles);
  const ema20_4H = calculateEMA(candles4H, 20);
  const ema50_4H = calculateEMA(candles4H, 50);
  const ema200_4H = calculateEMA(candles4H, 200);

  const emaFast = calculateEMA(candles, 20);
  const emaSlow = calculateEMA(candles, 50);
  const emaTrend = calculateEMA(candles, 200);
  const rsi = calculateRSI(candles, 14);
  const atrs = calculateATR(candles, 14);

  const candleMap = new Map<number, number>();
  for (let i = 0; i < candles.length; i++) candleMap.set(candles[i].time, i);

  const fourHourMap = new Map<number, number>();
  for (let k = 0; k < candles4H.length; k++) fourHourMap.set(candles4H[k].time, k);

  let counter4HTrend = 0;
  let overextendedClimax = 0; // Price > 3.0 ATR from EMA200
  let rsiDivergenceOpposing = 0;
  let fakeWickTrap = 0; // Candle closed back inside prior bar
  let mssFailed = 0; // Market Structure Shift occurred against trade within 3 bars

  for (const l of losses) {
    const idx = candleMap.get(l.entryTime);
    if (idx === undefined) continue;

    const c = candles[idx];
    const prevC = candles[idx - 1];
    const atr = atrs[idx] ?? 10;
    const eFastVal = emaFast[idx] ?? c.close;
    const eSlowVal = emaSlow[idx] ?? c.close;
    const eTrendVal = emaTrend[idx] ?? c.close;

    // 1. HTF 4H Alignment
    const current4HBucketTime = Math.floor(c.time / (4 * 3600)) * (4 * 3600);
    const idx4H = fourHourMap.get(current4HBucketTime);
    let htfBias: "BULL" | "BEAR" | "NEUTRAL" = "NEUTRAL";
    if (idx4H !== undefined && idx4H >= 1) {
      const p4 = idx4H - 1;
      const c4 = candles4H[p4]?.close;
      const e4_20 = ema20_4H[p4];
      const e4_50 = ema50_4H[p4];
      const e4_200 = ema200_4H[p4] ?? e4_50;
      if (c4 && e4_20 && e4_50 && e4_200) {
        if (c4 > e4_20 && e4_20 > e4_50 && c4 > e4_200) htfBias = "BULL";
        else if (c4 < e4_20 && e4_20 < e4_50 && c4 < e4_200) htfBias = "BEAR";
      }
    }

    if ((l.type === "BUY" && htfBias === "BEAR") || (l.type === "SELL" && htfBias === "BULL")) {
      counter4HTrend++;
    }

    // 2. Climax / Overextension: Distance from EMA200 > 2.5 ATR
    const dist200 = Math.abs(c.close - eTrendVal);
    if (dist200 > atr * 2.5) {
      overextendedClimax++;
    }

    // 3. Fake Wick Trap / SFP: candle had long wick but closed weak
    const range = c.high - c.low;
    const body = Math.abs(c.close - c.open);
    if (range > 0 && body / range < 0.35) {
      fakeWickTrap++;
    }

    // 4. Structure: Check if prior 5 candles made a Higher High then immediately broke Lower Low (CHoCH / MSS)
    const recentLows = candles.slice(Math.max(0, idx - 5), idx).map((k) => k.low);
    const recentHighs = candles.slice(Math.max(0, idx - 5), idx).map((k) => k.high);
    if (l.type === "BUY" && c.close < Math.min(...recentLows)) {
      mssFailed++;
    } else if (l.type === "SELL" && c.close > Math.max(...recentHighs)) {
      mssFailed++;
    }
  }

  console.log("================================================================================");
  console.log(" 🔍 ROOT CAUSE ATTRIBUTION FOR 105 LOSSES");
  console.log("================================================================================\n");
  console.log(`Total Losses Analyzed: ${losses.length}`);
  console.log(`1. Counter HTF 4H Trend: ${counter4HTrend} (${((counter4HTrend / losses.length) * 100).toFixed(1)}%) -> HTF filter already blocks direct clash!`);
  console.log(`2. Overextended Climax / Late in Trend (> 2.5 ATR from EMA200): ${overextendedClimax} (${((overextendedClimax / losses.length) * 100).toFixed(1)}%)`);
  console.log(`3. Fake Wick / Weak Body Trap (Body < 35% of Range, Doji/Wick Trap): ${fakeWickTrap} (${((fakeWickTrap / losses.length) * 100).toFixed(1)}%)`);
  console.log(`4. Structural Breakdown (CHoCH against trade at entry bar): ${mssFailed} (${((mssFailed / losses.length) * 100).toFixed(1)}%)\n`);

  // Let's check what happened in the 33 Quick Stop-Outs (<= 3 hours)
  const quickLosses = losses.filter((l) => (l.exitTime - l.entryTime) / 3600 <= 3);
  console.log(`--- QUICK STOP-OUTS (33 Trades <= 3h) FORENSIC ---`);
  let quickWickTrap = 0;
  let quickOverextended = 0;
  for (const l of quickLosses) {
    const idx = candleMap.get(l.entryTime);
    if (idx === undefined) continue;
    const c = candles[idx];
    const atr = atrs[idx] ?? 10;
    const eTrendVal = emaTrend[idx] ?? c.close;
    const range = c.high - c.low;
    const body = Math.abs(c.close - c.open);
    if (range > 0 && body / range < 0.35) quickWickTrap++;
    if (Math.abs(c.close - eTrendVal) > atr * 2.5) quickOverextended++;
  }
  console.log(`- Weak Body / Fake Wick Trap: ${quickWickTrap} / ${quickLosses.length} (${((quickWickTrap / quickLosses.length) * 100).toFixed(1)}%)`);
  console.log(`- Overextended from Mean (> 2.5 ATR): ${quickOverextended} / ${quickLosses.length} (${((quickOverextended / quickLosses.length) * 100).toFixed(1)}%)\n`);
}

deepLossForensic().catch(console.error);
