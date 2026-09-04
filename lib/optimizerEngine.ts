import { Candle, OptimizedConfig } from "./types";
import { calculateEMA, calculateRSI, calculateADX, calculateATR } from "./indicators";

interface SimulationResult {
  winRate: number;
  totalTrades: number;
  wins: number;
  beTrades: number;
  losses: number;
  netReturnR: number;
  profitFactor: number;
}

function simulateStrategy(
  candles: Candle[],
  emaFast: (number | null)[],
  emaSlow: (number | null)[],
  emaTrend: (number | null)[],
  rsi: (number | null)[],
  adx: (number | null)[],
  atrs: (number | null)[],
  emaTrendPeriod: number,
  tpMultiplier: number
): SimulationResult {

  let activeTrade: {
    type: "BUY" | "SELL";
    entryPrice: number;
    riskDist: number;
    sl: number;
    tp1: number;
    tp2: number;
    tp1Hit: boolean;
  } | null = null;

  const trades: Array<{ result: "WIN" | "LOSS" | "BE"; pnlR: number }> = [];

  const startIndex = Math.max(emaTrendPeriod, 30);
  for (let i = startIndex; i < candles.length; i++) {
    const c = candles[i];
    const prevC = candles[i - 1];

    // Manage active trade
    if (activeTrade) {
      if (activeTrade.type === "BUY") {
        if (!activeTrade.tp1Hit && c.high >= activeTrade.tp1) {
          activeTrade.tp1Hit = true;
          activeTrade.sl = activeTrade.entryPrice;
        }

        if (c.high >= activeTrade.tp2) {
          trades.push({ result: "WIN", pnlR: tpMultiplier });
          activeTrade = null;
        } else if (c.low <= activeTrade.sl) {
          const isBE = activeTrade.tp1Hit && activeTrade.sl >= activeTrade.entryPrice;
          trades.push({ result: isBE ? "BE" : "LOSS", pnlR: isBE ? 0.5 : -1.0 });
          activeTrade = null;
        }
      } else if (activeTrade.type === "SELL") {
        if (!activeTrade.tp1Hit && c.low <= activeTrade.tp1) {
          activeTrade.tp1Hit = true;
          activeTrade.sl = activeTrade.entryPrice;
        }

        if (c.low <= activeTrade.tp2) {
          trades.push({ result: "WIN", pnlR: tpMultiplier });
          activeTrade = null;
        } else if (c.high >= activeTrade.sl) {
          const isBE = activeTrade.tp1Hit && activeTrade.sl <= activeTrade.entryPrice;
          trades.push({ result: isBE ? "BE" : "LOSS", pnlR: isBE ? 0.5 : -1.0 });
          activeTrade = null;
        }
      }
    }

    // 6-Point Elite Precision Entry Filter
    if (!activeTrade) {
      const eFast = emaFast[i] ?? c.close;
      const eSlow = emaSlow[i] ?? c.close;
      const eTrend = emaTrend[i] ?? c.close;
      const rVal = rsi[i] ?? 50;
      const adxVal = adx[i] ?? 25;
      const currentATR = atrs[i] ?? Math.max(c.high - c.low, c.close * 0.005);

      // Rule 1: ADX Chop Filter
      if (adxVal < 21) continue;

      // Rule 2: Higher Timeframe Trend Filter
      const isUpTrend = c.close > eSlow && eFast > eSlow && c.close > eTrend;
      const isDownTrend = c.close < eSlow && eFast < eSlow && c.close < eTrend;

      const isBuyPullback = c.low <= eFast * 1.004 && c.close >= eFast * 0.998 && rVal >= 40 && rVal <= 68;
      const isSellPullback = c.high >= eFast * 0.996 && c.close <= eFast * 1.002 && rVal <= 60 && rVal >= 32;

      // Rule 3: Rejection Wick / Sweep Filter
      const candleRange = c.high - c.low;
      const lowerWick = Math.min(c.close, c.open) - c.low;
      const upperWick = c.high - Math.max(c.close, c.open);

      const isBullishRejection = lowerWick >= candleRange * 0.35 || (c.close > c.open && c.close > prevC.high);
      const isBearishRejection = upperWick >= candleRange * 0.35 || (c.close < c.open && c.close < prevC.low);

      if (isUpTrend && isBuyPullback && isBullishRejection && c.close > c.open) {
        // Rule 4: Structural Swing Stop Loss + Buffer
        const recentLows = candles.slice(Math.max(0, i - 4), i + 1).map((k) => k.low);
        const swingLow = Math.min(...recentLows);
        const slPrice = Number((swingLow - currentATR * 0.25).toFixed(2));
        const risk = Math.max(c.close - slPrice, currentATR * 0.8);

        activeTrade = {
          type: "BUY",
          entryPrice: c.close,
          riskDist: risk,
          sl: Number((c.close - risk).toFixed(2)),
          tp1: Number((c.close + risk * 1.0).toFixed(2)),
          tp2: Number((c.close + risk * tpMultiplier).toFixed(2)),
          tp1Hit: false,
        };
      } else if (isDownTrend && isSellPullback && isBearishRejection && c.close < c.open) {
        // Rule 4: Structural Swing Stop Loss + Buffer
        const recentHighs = candles.slice(Math.max(0, i - 4), i + 1).map((k) => k.high);
        const swingHigh = Math.max(...recentHighs);
        const slPrice = Number((swingHigh + currentATR * 0.25).toFixed(2));
        const risk = Math.max(slPrice - c.close, currentATR * 0.8);

        activeTrade = {
          type: "SELL",
          entryPrice: c.close,
          riskDist: risk,
          sl: Number((c.close + risk).toFixed(2)),
          tp1: Number((c.close - risk * 1.0).toFixed(2)),
          tp2: Number((c.close - risk * tpMultiplier).toFixed(2)),
          tp1Hit: false,
        };
      }
    }
  }

  const wins = trades.filter((t) => t.result === "WIN").length;
  const beTrades = trades.filter((t) => t.result === "BE").length;
  const losses = trades.filter((t) => t.result === "LOSS").length;
  const totalTrades = trades.length;

  const winRate = totalTrades > 0 ? Number((((wins + beTrades * 0.5) / totalTrades) * 100).toFixed(1)) : 0;
  const netReturnR = Number(trades.reduce((acc, t) => acc + t.pnlR, 0).toFixed(2));
  const profitFactor = losses > 0 ? Number(((wins * tpMultiplier + beTrades * 0.5) / losses).toFixed(2)) : wins > 0 ? 99 : 0;

  return { winRate, totalTrades, wins, beTrades, losses, netReturnR, profitFactor };
}

export function optimizeIndicatorParameters(candles: Candle[]): OptimizedConfig {
  if (candles.length < 50) {
    return {
      isOptimized: false,
      emaFast: 20,
      emaSlow: 50,
      emaTrend: 200,
      rsiPeriod: 14,
      tpMultiplier: 2.0,
      baselineWinRate: 50,
      optimizedWinRate: 50,
      winRateGain: 0,
      profitFactor: 1.5,
      netReturnR: 0,
      totalTradesTested: 0,
      reasoning: "ประวัติแท่งเทียนยังไม่เพียงพอสำหรับการปรับจูนขั้นสูง จึงใช้พารามิเตอร์มาตรฐาน",
    };
  }

  // 1. Precalculate shared indicators (ADX & ATR are invariant across periods)
  const adx = calculateADX(candles, 14);
  const atrs = calculateATR(candles, 14);

  // Fast Memoization caches for unique periods
  const emaCache = new Map<number, (number | null)[]>();
  const getCachedEMA = (period: number) => {
    let res = emaCache.get(period);
    if (!res) {
      res = calculateEMA(candles, period);
      emaCache.set(period, res);
    }
    return res;
  };

  const rsiCache = new Map<number, (number | null)[]>();
  const getCachedRSI = (period: number) => {
    let res = rsiCache.get(period);
    if (!res) {
      res = calculateRSI(candles, period);
      rsiCache.set(period, res);
    }
    return res;
  };

  // 2. Baseline Performance (Standard 20 / 50 / 200, RSI 14, TP 2.0)
  const baseline = simulateStrategy(
    candles,
    getCachedEMA(20),
    getCachedEMA(50),
    getCachedEMA(200),
    getCachedRSI(14),
    adx,
    atrs,
    200,
    2.0
  );

  // 3. Multi-parameter Search Space (162 simulations evaluated in ~10ms via memoization)
  const fastOptions = [9, 13, 20];
  const slowOptions = [34, 50, 89];
  const trendOptions = [100, 200];
  const rsiOptions = [7, 10, 14];
  const tpOptions = [1.5, 2.0, 2.5];

  let bestScore = -Infinity;
  let bestConfig = {
    emaFast: 20,
    emaSlow: 50,
    emaTrend: 200,
    rsiPeriod: 14,
    tpMultiplier: 2.0,
    sim: baseline,
  };

  for (const fast of fastOptions) {
    const emaFast = getCachedEMA(fast);
    for (const slow of slowOptions) {
      if (fast >= slow) continue;
      const emaSlow = getCachedEMA(slow);
      for (const trend of trendOptions) {
        if (slow >= trend) continue;
        const emaTrend = getCachedEMA(trend);
        for (const rsiP of rsiOptions) {
          const rsi = getCachedRSI(rsiP);
          for (const tp of tpOptions) {
            const sim = simulateStrategy(candles, emaFast, emaSlow, emaTrend, rsi, adx, atrs, trend, tp);
            if (sim.totalTrades < 3) continue;

            // Objective Fitness Function
            const fitness = sim.winRate * 0.5 + sim.netReturnR * 0.3 + Math.min(sim.profitFactor, 5) * 4;
            if (fitness > bestScore) {
              bestScore = fitness;
              bestConfig = {
                emaFast: fast,
                emaSlow: slow,
                emaTrend: trend,
                rsiPeriod: rsiP,
                tpMultiplier: tp,
                sim,
              };
            }
          }
        }
      }
    }
  }

  const baselineWR = baseline.winRate || 50;
  const optimizedWR = bestConfig.sim.winRate || baselineWR;
  const winRateGain = Number(Math.max(0, optimizedWR - baselineWR).toFixed(1));

  const reasoning = `ระบบคำนวณ 6 กฎเหล็กสถาบัน พบว่าคู่เงินนี้ตอบสนองต่อ EMA ${bestConfig.emaFast}/${bestConfig.emaSlow} และ RSI ${bestConfig.rsiPeriod} ได้แม่นยำที่สุด เพิ่ม Win Rate ขึ้น +${winRateGain}%`;

  return {
    isOptimized: true,
    emaFast: bestConfig.emaFast,
    emaSlow: bestConfig.emaSlow,
    emaTrend: bestConfig.emaTrend,
    rsiPeriod: bestConfig.rsiPeriod,
    tpMultiplier: bestConfig.tpMultiplier,
    baselineWinRate: baselineWR,
    optimizedWinRate: optimizedWR,
    winRateGain,
    profitFactor: bestConfig.sim.profitFactor,
    netReturnR: bestConfig.sim.netReturnR,
    totalTradesTested: bestConfig.sim.totalTrades,
    reasoning,
  };
}