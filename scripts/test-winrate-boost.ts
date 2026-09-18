import * as fs from "fs";
import * as path from "path";

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

import { getMarketCandles, AVAILABLE_ASSETS } from "../lib/marketService";
import { calculateEMA, calculateRSI, calculateADX, calculateATR } from "../lib/indicators";
import { optimizeIndicatorParameters } from "../lib/optimizerEngine";

interface TestResult {
  symbol: string;
  baselineWins: number;
  baselineLosses: number;
  baselineWR: number;
  optimizedWins: number;
  optimizedLosses: number;
  optimizedWR: number;
  wrDelta: number;
}

function runSimulationEngine(
  symbol: string,
  candles: any[],
  config: {
    minADX: number;
    minWickPct: number;
    maxDistFromTrendATR: number;
    minSlATR: number;
    tpMultiplier: number;
    tp1Ratio: number;
  }
) {
  const opt = optimizeIndicatorParameters(candles, symbol);
  const emaFastPeriod = opt.isOptimized ? opt.emaFast : 20;
  const emaSlowPeriod = opt.isOptimized ? opt.emaSlow : 50;
  const emaTrendPeriod = opt.isOptimized ? opt.emaTrend : 200;
  const rsiPeriod = opt.isOptimized ? opt.rsiPeriod : 14;

  const emaFast = calculateEMA(candles, emaFastPeriod);
  const emaSlow = calculateEMA(candles, emaSlowPeriod);
  const emaTrend = calculateEMA(candles, emaTrendPeriod);
  const rsi = calculateRSI(candles, rsiPeriod);
  const adx = calculateADX(candles, 14);
  const atrs = calculateATR(candles, 14);

  const sym = symbol.toUpperCase();
  const isGold = sym.includes("XAU") || sym === "GOLD";
  const isCrypto = ["BTC", "ETH", "SOL"].some(c => sym.includes(c));
  const precision = isGold ? 2 : isCrypto ? 2 : sym.includes("JPY") ? 3 : 5;

  let wins = 0;
  let losses = 0;
  let beTrades = 0;

  let active: any = null;
  let trendDirection = "NONE";
  let pullbacksInTrend = 0;

  for (let i = 35; i < candles.length; i++) {
    const c = candles[i];
    const prevC = candles[i - 1];

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
          wins++;
          active = null;
        } else if (c.low <= active.sl) {
          if (active.tp1Hit) wins++;
          else if (active.beHit) beTrades++;
          else losses++;
          active = null;
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
          wins++;
          active = null;
        } else if (c.high >= active.sl) {
          if (active.tp1Hit) wins++;
          else if (active.beHit) beTrades++;
          else losses++;
          active = null;
        }
      }
    }

    if (!active) {
      const eFast = emaFast[i] ?? c.close;
      const eSlow = emaSlow[i] ?? c.close;
      const eSlow_prev3 = emaSlow[i - 3] ?? eSlow;
      const eTrend = emaTrend[i] ?? c.close;
      const rVal = rsi[i] ?? 50;
      const rValPrev = rsi[i - 1] ?? 50;
      const adxVal = adx[i] ?? 25;
      const currentATR = atrs[i] ?? Math.max(c.high - c.low, c.close * 0.005);

      if (adxVal < config.minADX) continue;

      if (!isCrypto) {
        const utcHour = new Date(c.time * 1000).getUTCHours();
        if (utcHour >= 21 || utcHour < 6) continue;
      }

      const isBullTrend = eFast > eSlow && c.close > eTrend && eSlow >= eSlow_prev3;
      const isBearTrend = eFast < eSlow && c.close < eTrend && eSlow <= eSlow_prev3;

      if (isBullTrend) {
        if (trendDirection !== "BULL") {
          trendDirection = "BULL";
          pullbacksInTrend = 0;
        }
      } else if (isBearTrend) {
        if (trendDirection !== "BEAR") {
          trendDirection = "BEAR";
          pullbacksInTrend = 0;
        }
      } else {
        trendDirection = "NONE";
        pullbacksInTrend = 0;
      }

      if (pullbacksInTrend >= 3) continue;

      // Filter: Overextended distance from trend
      const distFromTrend = Math.abs(c.close - eTrend);
      if (distFromTrend > currentATR * config.maxDistFromTrendATR) continue;

      const isBuyPullback = c.low <= eFast * 1.003 && c.close >= eSlow * 0.997 && rVal >= 38 && rVal <= 64;
      const isSellPullback = c.high >= eFast * 0.997 && c.close <= eSlow * 1.003 && rVal <= 62 && rVal >= 36;

      const candleRange = c.high - c.low;
      const lowerWick = Math.min(c.close, c.open) - c.low;
      const upperWick = c.high - Math.max(c.close, c.open);

      const recent3Lows = candles.slice(Math.max(0, i - 4), i).map((k: any) => k.low);
      const minRecentLow = Math.min(...recent3Lows);
      const hasBullSweep = c.low <= minRecentLow && c.close > minRecentLow;

      const recent3Highs = candles.slice(Math.max(0, i - 4), i).map((k: any) => k.high);
      const maxRecentHigh = Math.max(...recent3Highs);
      const hasBearSweep = c.high >= maxRecentHigh && c.close < maxRecentHigh;

      const isBullishRejection =
        candleRange > 0 &&
        ((lowerWick >= candleRange * config.minWickPct && c.close >= c.open) ||
         hasBullSweep ||
         (c.close > c.open && c.close > prevC.high));

      const isBearishRejection =
        candleRange > 0 &&
        ((upperWick >= candleRange * config.minWickPct && c.close <= c.open) ||
         hasBearSweep ||
         (c.close < c.open && c.close < prevC.low));

      const isRsiBullHook = rVal >= rValPrev;
      const isRsiBearHook = rVal <= rValPrev;

      if (isBullTrend && isBuyPullback && isBullishRejection && isRsiBullHook && c.close > c.open) {
        const entry = Number(Math.min(c.close, eFast * 1.001).toFixed(precision));
        const recentLows = candles.slice(Math.max(0, i - 5), i + 1).map((k: any) => k.low);
        const swingLow = Math.min(...recentLows);
        // Robust SL: give breathing room with config.minSlATR
        const slDist = Math.max(entry - swingLow + currentATR * 0.35, currentATR * config.minSlATR);

        const lookbackObstacle = candles.slice(Math.max(0, i - 24), i);
        const recentSwingHigh = Math.max(...lookbackObstacle.map((b: any) => b.high));
        if (recentSwingHigh > entry && (recentSwingHigh - entry) < slDist * 1.2) continue;

        active = {
          type: "BUY",
          entryPrice: entry,
          sl: Number((entry - slDist).toFixed(precision)),
          tp08: Number((entry + slDist * 0.8).toFixed(precision)),
          tp1: Number((entry + slDist * config.tp1Ratio).toFixed(precision)),
          tp2: Number((entry + slDist * config.tpMultiplier).toFixed(precision)),
          beHit: false,
          tp1Hit: false,
        };
        pullbacksInTrend++;
      } else if (isBearTrend && isSellPullback && isBearishRejection && isRsiBearHook && c.close < c.open) {
        const entry = Number(Math.max(c.close, eFast * 0.999).toFixed(precision));
        const recentHighs = candles.slice(Math.max(0, i - 5), i + 1).map((k: any) => k.high);
        const swingHigh = Math.max(...recentHighs);
        // Robust SL: give breathing room with config.minSlATR
        const slDist = Math.max(swingHigh - entry + currentATR * 0.35, currentATR * config.minSlATR);

        const lookbackObstacle = candles.slice(Math.max(0, i - 24), i);
        const recentSwingLow = Math.min(...lookbackObstacle.map((b: any) => b.low));
        if (recentSwingLow < entry && (entry - recentSwingLow) < slDist * 1.2) continue;

        active = {
          type: "SELL",
          entryPrice: entry,
          sl: Number((entry + slDist).toFixed(precision)),
          tp08: Number((entry - slDist * 0.8).toFixed(precision)),
          tp1: Number((entry - slDist * config.tp1Ratio).toFixed(precision)),
          tp2: Number((entry - slDist * config.tpMultiplier).toFixed(precision)),
          beHit: false,
          tp1Hit: false,
        };
        pullbacksInTrend++;
      }
    }
  }

  const resolved = wins + losses;
  const wr = resolved > 0 ? (wins / resolved) * 100 : 0;
  return { wins, losses, beTrades, wr };
}

async function testAll() {
  const testPairs = ["XAUUSD", "EURUSD", "USDJPY", "XAGUSD", "GBPUSD", "AUDUSD", "NZDUSD", "USDCAD"];
  const results: TestResult[] = [];

  console.log("Testing Baseline vs Optimized Indicator Parameters across 8 Core Assets...\n");

  for (const sym of testPairs) {
    const candles = await getMarketCandles(sym, "1h");
    if (candles.length < 50) continue;

    // Baseline: minADX 20, minWick 0.28, maxDist 3.2, minSL 1.1, tp 2.0, tp1 1.0
    const base = runSimulationEngine(sym, candles, {
      minADX: 20,
      minWickPct: 0.28,
      maxDistFromTrendATR: 3.2,
      minSlATR: 1.1,
      tpMultiplier: 2.0,
      tp1Ratio: 1.0,
    });

    // Optimized: minADX 23 (filters chop), minWick 0.30, maxDist 2.3 (prevents exhaustion chase), minSL 1.35 (noise immune), tp 1.8, tp1 0.9
    const opt = runSimulationEngine(sym, candles, {
      minADX: 23,
      minWickPct: 0.30,
      maxDistFromTrendATR: 2.3,
      minSlATR: 1.35,
      tpMultiplier: 1.8,
      tp1Ratio: 0.9,
    });

    results.push({
      symbol: sym,
      baselineWins: base.wins,
      baselineLosses: base.losses,
      baselineWR: Number(base.wr.toFixed(1)),
      optimizedWins: opt.wins,
      optimizedLosses: opt.losses,
      optimizedWR: Number(opt.wr.toFixed(1)),
      wrDelta: Number((opt.wr - base.wr).toFixed(1)),
    });
  }

  console.table(results);

  const baseTotalW = results.reduce((a, b) => a + b.baselineWins, 0);
  const baseTotalL = results.reduce((a, b) => a + b.baselineLosses, 0);
  const baseTotalWR = (baseTotalW / (baseTotalW + baseTotalL)) * 100;

  const optTotalW = results.reduce((a, b) => a + b.optimizedWins, 0);
  const optTotalL = results.reduce((a, b) => a + b.optimizedLosses, 0);
  const optTotalWR = (optTotalW / (optTotalW + optTotalL)) * 100;

  console.log(`\n🏆 OVERALL BASELINE WIN RATE : ${baseTotalWR.toFixed(1)}% (${baseTotalW}W / ${baseTotalL}L)`);
  console.log(`🚀 OVERALL OPTIMIZED WIN RATE: \x1b[32m\x1b[1m${optTotalWR.toFixed(1)}%\x1b[0m (${optTotalW}W / ${optTotalL}L)`);
  console.log(`📈 WIN RATE IMPROVEMENT     : \x1b[36m\x1b[1m+${(optTotalWR - baseTotalWR).toFixed(1)}%\x1b[0m\n`);
}

testAll().catch(console.error);
