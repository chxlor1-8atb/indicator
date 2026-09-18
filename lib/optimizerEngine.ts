import { Candle, OptimizedConfig } from "./types";
import { calculateEMA, calculateRSI, calculateADX, calculateATR } from "./indicators";
import { getCachedLearningWeights } from "./adaptiveLearner";

interface SimulationResult {
  winRate: number;
  totalTrades: number;
  wins: number;
  beTrades: number;
  losses: number;
  netReturnR: number;
  profitFactor: number;
  maxConsecWins: number;
}

// ─── Layer 1: Regime-Specific Parameter Grids ────────────────────────────────
type RegimeType = "EXPLOSIVE_TREND" | "HEALTHY_PULLBACK" | "VOLATILITY_SQUEEZE" | "CHOPPY_DEADZONE";

interface RegimeGrid {
  fast: number[];
  slow: number[];
  trend: number[];
  rsi: number[];
  tp: number[];
  adxMin: number;
}

const REGIME_GRIDS: Record<RegimeType, RegimeGrid> = {
  EXPLOSIVE_TREND: {
    fast:   [7, 9, 12],
    slow:   [21, 26, 34],
    trend:  [55, 89, 100],
    rsi:    [7, 9],
    tp:     [2.5, 3.0, 3.5],
    adxMin: 28,
  },
  HEALTHY_PULLBACK: {
    fast:   [13, 20, 21],
    slow:   [55, 89, 144],
    trend:  [200, 233],
    rsi:    [10, 14],
    tp:     [1.8, 2.0, 2.2],
    adxMin: 21,
  },
  VOLATILITY_SQUEEZE: {
    fast:   [20, 21],
    slow:   [50, 55],
    trend:  [200],
    rsi:    [14],
    tp:     [1.5, 1.8],
    adxMin: 18,
  },
  CHOPPY_DEADZONE: {
    fast: [], slow: [], trend: [], rsi: [], tp: [],
    adxMin: 999,
  },
};

// ─── Regime Detector (lightweight, no UI deps) ───────────────────────────────
function detectRegime(candles: Candle[], adxArr: (number | null)[]): RegimeType {
  if (candles.length < 30) return "CHOPPY_DEADZONE";

  const lastADX = adxArr[adxArr.length - 1] ?? 20;
  const prevN = candles.slice(-20);

  // Bollinger bandwidth proxy (StdDev of last 20 closes)
  const closes = prevN.map((c) => c.close);
  const mean = closes.reduce((s, v) => s + v, 0) / closes.length;
  const variance = closes.reduce((s, v) => s + (v - mean) ** 2, 0) / closes.length;
  const stdDev = Math.sqrt(variance);
  const bandwidth = mean > 0 ? (stdDev / mean) * 100 : 2.0;

  const isSqueezing = bandwidth < 0.8;

  if (isSqueezing && lastADX < 24) return "VOLATILITY_SQUEEZE";
  if (lastADX >= 28) return "EXPLOSIVE_TREND";
  if (lastADX >= 21) return "HEALTHY_PULLBACK";
  return "CHOPPY_DEADZONE";
}

// ─── Core Simulation (shared by optimizer + walk-forward) ────────────────────
function simulateStrategy(
  candles: Candle[],
  emaFast: (number | null)[],
  emaSlow: (number | null)[],
  emaTrend: (number | null)[],
  rsi: (number | null)[],
  adx: (number | null)[],
  atrs: (number | null)[],
  emaTrendPeriod: number,
  tpMultiplier: number,
  adxMin: number,
  symbol: string = "XAUUSD"
): SimulationResult {
  const sym = symbol.toUpperCase();
  const isGold = sym.includes("XAU") || sym === "GOLD";
  const isCrypto = ["BTC", "ETH", "SOL", "BNB", "XRP", "ADA", "DOGE", "SUI", "AVAX", "LINK", "DOT"].some(
    (c) => sym.includes(c)
  );
  const precision = isGold ? 2 : isCrypto ? 2 : sym.includes("JPY") ? 3 : 5;

  let activeTrade: {
    type: "BUY" | "SELL";
    entryPrice: number;
    riskDist: number;
    sl: number;
    tp08: number;
    tp1: number;
    tp2: number;
    beHit: boolean;
    tp1Hit: boolean;
  } | null = null;

  const trades: Array<{ result: "WIN" | "BE" | "LOSS"; pnlR: number }> = [];

  let trendDirection: "BULL" | "BEAR" | "NONE" = "NONE";
  let pullbacksInTrend = 0;
  let consecWins = 0;
  let maxConsecWins = 0;

  const startIndex = Math.max(emaTrendPeriod, 35);
  for (let i = startIndex; i < candles.length; i++) {
    const c = candles[i];
    const prevC = candles[i - 1];

    if (activeTrade) {
      if (activeTrade.type === "BUY") {
        if (!activeTrade.beHit && c.high >= activeTrade.tp08) {
          activeTrade.beHit = true;
          activeTrade.sl = activeTrade.entryPrice;
        }
        if (!activeTrade.tp1Hit && c.high >= activeTrade.tp1) {
          activeTrade.tp1Hit = true;
          activeTrade.sl = activeTrade.entryPrice;
        }
        if (c.high >= activeTrade.tp2) {
          trades.push({ result: "WIN", pnlR: tpMultiplier });
          consecWins++;
          if (consecWins > maxConsecWins) maxConsecWins = consecWins;
          activeTrade = null;
        } else if (c.low <= activeTrade.sl) {
          if (activeTrade.tp1Hit) {
            trades.push({ result: "WIN", pnlR: 1.0 });
            consecWins++;
            if (consecWins > maxConsecWins) maxConsecWins = consecWins;
          } else if (activeTrade.beHit) {
            trades.push({ result: "BE", pnlR: 0.1 });
            consecWins = 0;
          } else {
            trades.push({ result: "LOSS", pnlR: -1.0 });
            consecWins = 0;
          }
          activeTrade = null;
        }
      } else {
        if (!activeTrade.beHit && c.low <= activeTrade.tp08) {
          activeTrade.beHit = true;
          activeTrade.sl = activeTrade.entryPrice;
        }
        if (!activeTrade.tp1Hit && c.low <= activeTrade.tp1) {
          activeTrade.tp1Hit = true;
          activeTrade.sl = activeTrade.entryPrice;
        }
        if (c.low <= activeTrade.tp2) {
          trades.push({ result: "WIN", pnlR: tpMultiplier });
          consecWins++;
          if (consecWins > maxConsecWins) maxConsecWins = consecWins;
          activeTrade = null;
        } else if (c.high >= activeTrade.sl) {
          if (activeTrade.tp1Hit) {
            trades.push({ result: "WIN", pnlR: 1.0 });
            consecWins++;
            if (consecWins > maxConsecWins) maxConsecWins = consecWins;
          } else if (activeTrade.beHit) {
            trades.push({ result: "BE", pnlR: 0.1 });
            consecWins = 0;
          } else {
            trades.push({ result: "LOSS", pnlR: -1.0 });
            consecWins = 0;
          }
          activeTrade = null;
        }
      }
    }

    if (!activeTrade) {
      const eFast = emaFast[i] ?? c.close;
      const eSlow = emaSlow[i] ?? c.close;
      const eSlow_prev3 = emaSlow[i - 3] ?? eSlow;
      const eTrend = emaTrend[i] ?? c.close;
      const rVal = rsi[i] ?? 50;
      const rValPrev = rsi[i - 1] ?? 50;
      const adxVal = adx[i] ?? 25;
      const currentATR = atrs[i] ?? Math.max(c.high - c.low, c.close * 0.005);

      // Regime-aware ADX gate
      if (adxVal < adxMin) continue;

      if (!isCrypto) {
        const utcHour = new Date(c.time * 1000).getUTCHours();
        if (utcHour >= 21 || utcHour < 6) continue;
      }

      // Multi-EMA Alignment & Slope
      const isBullTrend = eFast > eSlow && c.close > eTrend && eSlow >= eSlow_prev3;
      const isBearTrend = eFast < eSlow && c.close < eTrend && eSlow <= eSlow_prev3;

      // Pillar 2: Trend Age & Pullback Tracker
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

      // Limit to max 3 pullbacks per trend cycle & reject overextended
      if (pullbacksInTrend >= 3) continue;
      const distFromTrend = Math.abs(c.close - eTrend);
      if (distFromTrend > currentATR * 3.2) continue;

      // Value Zone Pullback
      const isBuyPullback = c.low <= eFast * 1.003 && c.close >= eSlow * 0.997 && rVal >= 38 && rVal <= 70;
      const isSellPullback = c.high >= eFast * 0.997 && c.close <= eSlow * 1.003 && rVal <= 62 && rVal >= 30;

      // Pillar 4: Liquidity Sweep (Turtle Soup) & Candlestick Rejection
      const candleRange = c.high - c.low;
      const lowerWick = Math.min(c.close, c.open) - c.low;
      const upperWick = c.high - Math.max(c.close, c.open);

      const recent3Lows = candles.slice(Math.max(0, i - 4), i).map((k) => k.low);
      const minRecentLow = Math.min(...recent3Lows);
      const hasBullSweep = c.low <= minRecentLow && c.close > minRecentLow;

      const recent3Highs = candles.slice(Math.max(0, i - 4), i).map((k) => k.high);
      const maxRecentHigh = Math.max(...recent3Highs);
      const hasBearSweep = c.high >= maxRecentHigh && c.close < maxRecentHigh;

      const isBullishRejection =
        candleRange > 0 &&
        ((lowerWick >= candleRange * 0.28 && c.close >= c.open) ||
         hasBullSweep ||
         (c.close > c.open && c.close > prevC.high));

      const isBearishRejection =
        candleRange > 0 &&
        ((upperWick >= candleRange * 0.28 && c.close <= c.open) ||
         hasBearSweep ||
         (c.close < c.open && c.close < prevC.low));

      // RSI Momentum Hook
      const isRsiBullHook = rVal >= rValPrev;
      const isRsiBearHook = rVal <= rValPrev;

      // ─── Layer 4: Composite Confidence Gate ────────────────────────────
      const confidence = calcEntryConfidence({
        adxVal,
        eFast,
        eSlow,
        rVal,
        c,
        isBull: isBullTrend,
        candles,
        i,
      });
      if (confidence < 65) continue; // Reject signals that do not meet high conviction threshold

      if (isBullTrend && isBuyPullback && isBullishRejection && isRsiBullHook && c.close > c.open) {
        const entry = Number(Math.min(c.close, eFast * 1.001).toFixed(precision));
        const recentLows = candles.slice(Math.max(0, i - 5), i + 1).map((k) => k.low);
        const swingLow = Math.min(...recentLows);
        const slDist = Math.max(entry - swingLow + currentATR * 0.3, currentATR * 1.1);

        // Pillar 3: HTF Obstacle Check
        const lookbackObstacle = candles.slice(Math.max(0, i - 24), i);
        const recentSwingHigh = Math.max(...lookbackObstacle.map((b) => b.high));
        if (recentSwingHigh > entry && (recentSwingHigh - entry) < slDist * 1.15) {
          continue;
        }

        const slPrice = Number((entry - slDist).toFixed(precision));
        const tp08Price = Number((entry + slDist * 0.8).toFixed(precision));
        const tp1Price = Number((entry + slDist * 1.0).toFixed(precision));
        const tp2Price = Number((entry + slDist * tpMultiplier).toFixed(precision));

        pullbacksInTrend++;
        activeTrade = {
          type: "BUY",
          entryPrice: entry,
          riskDist: slDist,
          sl: slPrice,
          tp08: tp08Price,
          tp1: tp1Price,
          tp2: tp2Price,
          beHit: false,
          tp1Hit: false,
        };
      } else if (isBearTrend && isSellPullback && isBearishRejection && isRsiBearHook && c.close < c.open) {
        const entry = Number(Math.max(c.close, eFast * 0.999).toFixed(precision));
        const recentHighs = candles.slice(Math.max(0, i - 5), i + 1).map((k) => k.high);
        const swingHigh = Math.max(...recentHighs);
        const slDist = Math.max(swingHigh - entry + currentATR * 0.3, currentATR * 1.1);

        // Pillar 3: HTF Obstacle Check
        const lookbackObstacle = candles.slice(Math.max(0, i - 24), i);
        const recentSwingLow = Math.min(...lookbackObstacle.map((b) => b.low));
        if (recentSwingLow < entry && (entry - recentSwingLow) < slDist * 1.15) {
          continue;
        }

        const slPrice = Number((entry + slDist).toFixed(precision));
        const tp08Price = Number((entry - slDist * 0.8).toFixed(precision));
        const tp1Price = Number((entry - slDist * 1.0).toFixed(precision));
        const tp2Price = Number((entry - slDist * tpMultiplier).toFixed(precision));

        pullbacksInTrend++;
        activeTrade = {
          type: "SELL",
          entryPrice: entry,
          riskDist: slDist,
          sl: slPrice,
          tp08: tp08Price,
          tp1: tp1Price,
          tp2: tp2Price,
          beHit: false,
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

  return { winRate, totalTrades, wins, beTrades, losses, netReturnR, profitFactor, maxConsecWins };
}

// ─── Layer 4: Composite Confidence Scorer (0-100) ────────────────────────────
function calcEntryConfidence(params: {
  adxVal: number;
  eFast: number;
  eSlow: number;
  rVal: number;
  c: Candle;
  isBull: boolean;
  candles: Candle[];
  i: number;
}): number {
  const { adxVal, eFast, eSlow, rVal, c, isBull, candles, i } = params;
  let score = 0;

  // 1. ADX Strength (0-20)
  if (adxVal >= 40) score += 20;
  else if (adxVal >= 32) score += 16;
  else if (adxVal >= 26) score += 11;
  else score += 5;

  // 2. EMA Spread Width (0-20): Fast-Slow spread indicates momentum conviction
  const emaSpread = eSlow > 0 ? Math.abs(eFast - eSlow) / eSlow : 0;
  if (emaSpread > 0.006) score += 20;
  else if (emaSpread > 0.003) score += 13;
  else if (emaSpread > 0.001) score += 6;

  // 3. RSI Zone Quality (0-15)
  const rsiIdeal = isBull
    ? rVal >= 45 && rVal <= 60
    : rVal >= 40 && rVal <= 55;
  if (rsiIdeal) score += 15;
  else score += 5;

  // 4. Candle Body Quality (0-15)
  const candleRange = c.high - c.low;
  const bodySize = Math.abs(c.close - c.open);
  const bodyRatio = candleRange > 0 ? bodySize / candleRange : 0;
  if (bodyRatio >= 0.65) score += 15;
  else if (bodyRatio >= 0.45) score += 9;
  else score += 3;

  // 5. Consecutive Momentum Bars (0-15)
  const lookback3 = candles.slice(Math.max(0, i - 3), i);
  const alignedBars = isBull
    ? lookback3.filter((k) => k.close > k.open).length
    : lookback3.filter((k) => k.close < k.open).length;
  if (alignedBars >= 3) score += 15;
  else if (alignedBars >= 2) score += 9;
  else score += 3;

  // 6. Volume Surge (0-15)
  const recentVols = candles.slice(Math.max(0, i - 10), i).map((k) => k.volume || 0);
  const avgVol = recentVols.length > 0 ? recentVols.reduce((s, v) => s + v, 0) / recentVols.length : 0;
  if (avgVol > 0 && (c.volume || 0) > avgVol * 1.6) score += 15;
  else if (avgVol > 0 && (c.volume || 0) > avgVol * 1.2) score += 9;
  else score += 4;

  return score;
}

// ─── Layer 2: Walk-Forward Validation (3-Fold) ───────────────────────────────
function walkForwardValidate(
  candles: Candle[],
  config: {
    emaFastPeriod: number;
    emaSlowPeriod: number;
    emaTrendPeriod: number;
    rsiPeriod: number;
    tpMultiplier: number;
    adxMin: number;
  },
  symbol: string,
  folds = 3
): { avgWR: number; minWR: number; stability: number } {
  const totalLen = candles.length;
  const foldSize = Math.floor(totalLen / (folds + 1));
  const wrs: number[] = [];

  for (let f = 0; f < folds; f++) {
    const start = (f + 1) * foldSize;
    const end = Math.min(start + foldSize, totalLen);
    if (end - start < 40) continue;

    const slice = candles.slice(start, end);
    const sliceADX = calculateADX(slice, 14);
    const sliceATR = calculateATR(slice, 14);

    const sim = simulateStrategy(
      slice,
      calculateEMA(slice, config.emaFastPeriod),
      calculateEMA(slice, config.emaSlowPeriod),
      calculateEMA(slice, config.emaTrendPeriod),
      calculateRSI(slice, config.rsiPeriod),
      sliceADX,
      sliceATR,
      config.emaTrendPeriod,
      config.tpMultiplier,
      config.adxMin,
      symbol
    );
    if (sim.totalTrades > 0) {
      wrs.push(sim.winRate);
    }
  }

  if (wrs.length === 0) return { avgWR: 0, minWR: 0, stability: 0.5 };

  const avgWR = wrs.reduce((s, v) => s + v, 0) / wrs.length;
  const minWR = Math.min(...wrs);
  const maxWR = Math.max(...wrs);
  const stability = maxWR > 0 ? Math.max(0, 1 - (maxWR - minWR) / 100) : 0.5;

  return { avgWR, minWR, stability };
}

// ─── Layer 1+2+4: Main Optimizer Entry Point ─────────────────────────────────
export function optimizeIndicatorParameters(candles: Candle[], symbol: string = "XAUUSD"): OptimizedConfig {
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

  const adx = calculateADX(candles, 14);
  const atrs = calculateATR(candles, 14);

  const emaCache = new Map<number, (number | null)[]>();
  const getCachedEMA = (period: number) => {
    if (!emaCache.has(period)) emaCache.set(period, calculateEMA(candles, period));
    return emaCache.get(period)!;
  };

  const rsiCache = new Map<number, (number | null)[]>();
  const getCachedRSI = (period: number) => {
    if (!rsiCache.has(period)) rsiCache.set(period, calculateRSI(candles, period));
    return rsiCache.get(period)!;
  };

  const baseline = simulateStrategy(
    candles,
    getCachedEMA(20),
    getCachedEMA(50),
    getCachedEMA(200),
    getCachedRSI(14),
    adx,
    atrs,
    200,
    2.0,
    20,
    symbol
  );

  // ─── Layer 1: Detect regime → select parameter grid ─────────────────────
  const regime = detectRegime(candles, adx);
  const grid = REGIME_GRIDS[regime];

  if (regime === "CHOPPY_DEADZONE" || grid.fast.length === 0) {
    return {
      isOptimized: true,
      emaFast: 20,
      emaSlow: 50,
      emaTrend: 200,
      rsiPeriod: 14,
      tpMultiplier: 2.0,
      baselineWinRate: baseline.winRate || 50,
      optimizedWinRate: baseline.winRate || 50,
      winRateGain: 0,
      profitFactor: baseline.profitFactor || 1.5,
      netReturnR: baseline.netReturnR || 0,
      totalTradesTested: baseline.totalTrades || 0,
      reasoning: `🛑 CHOPPY DEADZONE — สภาวะตลาดไร้ทิศทาง ปรับโหมดรักษาทุนเพื่อคง Win Rate สูงสุด`,
    };
  }

  // ─── Layer 6: Incorporate Live Learning Weights from Neon DB ────────────
  const learning = getCachedLearningWeights(symbol);
  const effectiveAdxMin = Math.max(grid.adxMin, learning.preferredADXMin);

  let bestScore = -Infinity;
  let bestConfig = {
    emaFast: 20,
    emaSlow: 50,
    emaTrend: 200,
    rsiPeriod: 14,
    tpMultiplier: 2.0,
    adxMin: effectiveAdxMin,
    sim: baseline,
    wfStability: 0.5,
    wfMinWR: baseline.winRate,
  };

  for (const fast of grid.fast) {
    const emaFast = getCachedEMA(fast);
    for (const slow of grid.slow) {
      if (fast >= slow) continue;
      const emaSlow = getCachedEMA(slow);
      for (const trend of grid.trend) {
        if (slow >= trend) continue;
        const emaTrend = getCachedEMA(trend);
        for (const rsiP of grid.rsi) {
          const rsiArr = getCachedRSI(rsiP);
          for (const tp of grid.tp) {
            const sim = simulateStrategy(
              candles,
              emaFast,
              emaSlow,
              emaTrend,
              rsiArr,
              adx,
              atrs,
              trend,
              tp,
              effectiveAdxMin,
              symbol
            );
            if (sim.totalTrades < 2) continue;

            // ─── Layer 2: Walk-Forward Validation ──────────────────────
            const wf = walkForwardValidate(
              candles,
              {
                emaFastPeriod: fast,
                emaSlowPeriod: slow,
                emaTrendPeriod: trend,
                rsiPeriod: rsiP,
                tpMultiplier: tp,
                adxMin: effectiveAdxMin,
              },
              symbol
            );

            // Reject configs that fail severely on out-of-sample folds
            if (wf.minWR < 45 && sim.totalTrades >= 3) continue;

            // ─── Tiered Precision Fitness ───────────────────────────────
            const wr = sim.winRate / 100;
            const win = sim.wins;
            const loss = sim.losses;

            const precisionBonus =
              loss === 0 && win >= 3
                ? 120
                : loss === 0 && win >= 1
                ? 60
                : loss === 1 && win >= 5
                ? 35
                : loss === 1 && win >= 3
                ? 15
                : 0;

            const kellyF = wr - (1 - wr) / Math.max(0.5, tp);
            const kellyBonus = Math.max(0, kellyF) * 30;
            const streakBonus = sim.maxConsecWins >= 5 ? 25 : sim.maxConsecWins >= 3 ? 12 : 0;
            const stabilityBonus = wf.stability * 40;
            const learningBonus = learning.stabilityConfidence > 0 ? (learning.recentWinRate / 100) * 15 : 0;

            const fitness =
              sim.winRate * 2.0 +
              precisionBonus +
              kellyBonus +
              streakBonus +
              stabilityBonus +
              learningBonus +
              sim.netReturnR * 0.25 +
              Math.min(sim.profitFactor, 25) * 1.5;

            if (fitness > bestScore) {
              bestScore = fitness;
              bestConfig = {
                emaFast: fast,
                emaSlow: slow,
                emaTrend: trend,
                rsiPeriod: rsiP,
                tpMultiplier: tp,
                adxMin: effectiveAdxMin,
                sim,
                wfStability: wf.stability,
                wfMinWR: wf.minWR,
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

  const reasoning =
    `[Regime: ${regime} | ${learning.reasoning}] EMA ${bestConfig.emaFast}/${bestConfig.emaSlow}/${bestConfig.emaTrend} ` +
    `RSI(${bestConfig.rsiPeriod}) TP×${bestConfig.tpMultiplier} → ` +
    `WR ${optimizedWR}% (WF-min:${bestConfig.wfMinWR.toFixed(0)}%, stability:${(bestConfig.wfStability * 100).toFixed(0)}%) ` +
    `PF:${bestConfig.sim.profitFactor} Net:+${bestConfig.sim.netReturnR}R`;

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
