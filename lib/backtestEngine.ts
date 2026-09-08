import { Candle, HistoricalBacktestMetrics } from "./types";
import { simulateInstitutionalBacktest } from "./marketService";

export function runAutomatedBacktest(candles: Candle[], symbol: string = "XAUUSD"): HistoricalBacktestMetrics {
  if (!candles || candles.length < 40) {
    return {
      candleCount: candles?.length || 0,
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

  const rawTrades = simulateInstitutionalBacktest(symbol, candles);

  const trades = rawTrades.map((t) => ({
    type: t.type,
    entry: t.entryPrice,
    exit: t.exitPrice,
    result: t.result,
    pnlR: t.pnlR > 0 ? `+${t.pnlR.toFixed(1)}R` : `${t.pnlR.toFixed(1)}R`,
    date: new Date(t.entryTime * 1000).toLocaleString("en-US", { month: "short", day: "numeric" }),
  }));

  const wins = trades.filter((t) => t.result === "WIN").length;
  const beTrades = trades.filter((t) => t.result === "BE").length;
  const losses = trades.filter((t) => t.result === "LOSS").length;
  const totalTrades = trades.length;

  const winRate = totalTrades > 0 ? Number((((wins + beTrades * 0.5) / totalTrades) * 100).toFixed(1)) : 0;
  const netReturnR = Number(rawTrades.reduce((acc, t) => acc + t.pnlR, 0).toFixed(2));
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