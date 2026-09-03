import { Candle, HistoricalBacktestMetrics } from "./types";
import { calculateEMA, calculateRSI, calculateADX, calculateATR } from "./indicators";

export function runAutomatedBacktest(candles: Candle[]): HistoricalBacktestMetrics {
  if (candles.length < 40) {
    return {
      candleCount: candles.length,
      totalTrades: 0,
      wins: 0,
      beTrades: 0,
      losses: 0,
      winRate: 0,
      netReturnR: 0,
      profitFactor: 0,
      recentTrades: [],
    };
  }

  const ema20 = calculateEMA(candles, 20);
  const ema50 = calculateEMA(candles, 50);
  const ema200 = calculateEMA(candles, 200);
  const rsi = calculateRSI(candles, 14);
  const adx = calculateADX(candles, 14);
  const atrs = calculateATR(candles, 14);

  const trades: Array<{
    type: "BUY" | "SELL";
    entry: number;
    exit: number;
    result: "WIN" | "LOSS" | "BE";
    pnlR: string;
    date: string;
  }> = [];

  let activeTrade: {
    type: "BUY" | "SELL";
    entryPrice: number;
    entryTime: number;
    riskDist: number;
    sl: number;
    tp1: number;
    tp2: number;
    tp1Hit: boolean;
  } | null = null;

  for (let i = 30; i < candles.length; i++) {
    const c = candles[i];
    const prevC = candles[i - 1];

    // Manage active trade with Rule 6: Break-Even at 1.0R
    if (activeTrade) {
      if (activeTrade.type === "BUY") {
        if (!activeTrade.tp1Hit && c.high >= activeTrade.tp1) {
          activeTrade.tp1Hit = true;
          activeTrade.sl = activeTrade.entryPrice; // Lock risk to zero!
        }

        if (c.high >= activeTrade.tp2) {
          trades.push({
            type: "BUY",
            entry: activeTrade.entryPrice,
            exit: activeTrade.tp2,
            result: "WIN",
            pnlR: "+2.0R",
            date: new Date(activeTrade.entryTime * 1000).toLocaleString("en-US", { month: "short", day: "numeric" }),
          });
          activeTrade = null;
        } else if (c.low <= activeTrade.sl) {
          const isBE = activeTrade.tp1Hit && activeTrade.sl >= activeTrade.entryPrice;
          trades.push({
            type: "BUY",
            entry: activeTrade.entryPrice,
            exit: activeTrade.sl,
            result: isBE ? "BE" : "LOSS",
            pnlR: isBE ? "+0.5R" : "-1.0R",
            date: new Date(activeTrade.entryTime * 1000).toLocaleString("en-US", { month: "short", day: "numeric" }),
          });
          activeTrade = null;
        }
      } else if (activeTrade.type === "SELL") {
        if (!activeTrade.tp1Hit && c.low <= activeTrade.tp1) {
          activeTrade.tp1Hit = true;
          activeTrade.sl = activeTrade.entryPrice; // Lock risk to zero!
        }

        if (c.low <= activeTrade.tp2) {
          trades.push({
            type: "SELL",
            entry: activeTrade.entryPrice,
            exit: activeTrade.tp2,
            result: "WIN",
            pnlR: "+2.0R",
            date: new Date(activeTrade.entryTime * 1000).toLocaleString("en-US", { month: "short", day: "numeric" }),
          });
          activeTrade = null;
        } else if (c.high >= activeTrade.sl) {
          const isBE = activeTrade.tp1Hit && activeTrade.sl <= activeTrade.entryPrice;
          trades.push({
            type: "SELL",
            entry: activeTrade.entryPrice,
            exit: activeTrade.sl,
            result: isBE ? "BE" : "LOSS",
            pnlR: isBE ? "+0.5R" : "-1.0R",
            date: new Date(activeTrade.entryTime * 1000).toLocaleString("en-US", { month: "short", day: "numeric" }),
          });
          activeTrade = null;
        }
      }
    }

    // ─── 6-POINT ELITE PRECISION ENTRY FILTER ───
    if (!activeTrade) {
      const e20 = ema20[i] ?? c.close;
      const e50 = ema50[i] ?? c.close;
      const e200 = ema200[i] ?? c.close;
      const rVal = rsi[i] ?? 50;
      const adxVal = adx[i] ?? 25;
      const currentATR = atrs[i] ?? Math.max(c.high - c.low, c.close * 0.005);

      // Rule 1: Chop Filter (ADX >= 21 eliminates sideways whipsaws)
      if (adxVal < 21) continue;

      // Rule 2: Higher-Timeframe Trend Direction
      const isUpTrend = c.close > e50 && e20 > e50 && c.close > e200;
      const isDownTrend = c.close < e50 && e20 < e50 && c.close < e200;

      // Value Zone Pullback
      const isBuyPullback = c.low <= e20 * 1.004 && c.close >= e20 * 0.998 && rVal >= 42 && rVal <= 68;
      const isSellPullback = c.high >= e20 * 0.996 && c.close <= e20 * 1.002 && rVal <= 58 && rVal >= 32;

      // Rule 3: Candlestick Rejection / Liquidity Sweep Filter
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
          entryTime: c.time,
          riskDist: risk,
          sl: Number((c.close - risk).toFixed(2)),
          tp1: Number((c.close + risk * 1.0).toFixed(2)),
          tp2: Number((c.close + risk * 2.0).toFixed(2)),
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
          entryTime: c.time,
          riskDist: risk,
          sl: Number((c.close + risk).toFixed(2)),
          tp1: Number((c.close - risk * 1.0).toFixed(2)),
          tp2: Number((c.close - risk * 2.0).toFixed(2)),
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
  const netReturnR = Number((wins * 2.0 + beTrades * 0.5 - losses * 1.0).toFixed(2));
  const profitFactor = losses > 0 ? Number(((wins * 2.0 + beTrades * 0.5) / losses).toFixed(2)) : wins > 0 ? 99 : 0;

  return {
    candleCount: candles.length,
    totalTrades,
    wins,
    beTrades,
    losses,
    winRate,
    netReturnR,
    profitFactor,
    recentTrades: trades.slice(-5).reverse(),
  };
}