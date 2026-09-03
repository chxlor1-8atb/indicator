import { NextRequest, NextResponse } from "next/server";
import { getMarketCandles } from "@/lib/marketService";
import { calculateEMA, calculateRSI } from "@/lib/indicators";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const symbol = body.symbol || "XAUUSD";
    const timeframe = body.timeframe || "1h";

    const candles = await getMarketCandles(symbol, timeframe);
    if (!candles || candles.length < 50) {
      return NextResponse.json({ success: false, error: "Insufficient historical data" }, { status: 400 });
    }

    const closes = candles.map((c) => c.close);
    const ema20 = calculateEMA(candles, 20);
    const ema50 = calculateEMA(candles, 50);
    const ema200 = calculateEMA(candles, 200);
    const rsi = calculateRSI(candles, 14);

    const trades: Array<{
      type: "BUY" | "SELL";
      entryPrice: number;
      entryTime: number;
      exitPrice: number;
      exitTime: number;
      sl: number;
      tp1: number;
      tp2: number;
      result: "WIN" | "LOSS" | "BE";
      pnlR: number;
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
      const prev = candles[i - 1];

      // Check active trade
      if (activeTrade) {
        if (activeTrade.type === "BUY") {
          // Check TP1
          if (!activeTrade.tp1Hit && c.high >= activeTrade.tp1) {
            activeTrade.tp1Hit = true;
            activeTrade.sl = activeTrade.entryPrice; // Move to BE
          }

          // Check TP2
          if (c.high >= activeTrade.tp2) {
            trades.push({
              type: "BUY",
              entryPrice: activeTrade.entryPrice,
              entryTime: activeTrade.entryTime,
              exitPrice: activeTrade.tp2,
              exitTime: c.time,
              sl: activeTrade.sl,
              tp1: activeTrade.tp1,
              tp2: activeTrade.tp2,
              result: "WIN",
              pnlR: 2.0,
            });
            activeTrade = null;
          }
          // Check SL
          else if (c.low <= activeTrade.sl) {
            const isBE = activeTrade.tp1Hit && activeTrade.sl === activeTrade.entryPrice;
            trades.push({
              type: "BUY",
              entryPrice: activeTrade.entryPrice,
              entryTime: activeTrade.entryTime,
              exitPrice: activeTrade.sl,
              exitTime: c.time,
              sl: activeTrade.sl,
              tp1: activeTrade.tp1,
              tp2: activeTrade.tp2,
              result: isBE ? "BE" : "LOSS",
              pnlR: isBE ? 0.5 : -1.0,
            });
            activeTrade = null;
          }
        } else if (activeTrade.type === "SELL") {
          // Check TP1
          if (!activeTrade.tp1Hit && c.low <= activeTrade.tp1) {
            activeTrade.tp1Hit = true;
            activeTrade.sl = activeTrade.entryPrice; // Move to BE
          }

          // Check TP2
          if (c.low <= activeTrade.tp2) {
            trades.push({
              type: "SELL",
              entryPrice: activeTrade.entryPrice,
              entryTime: activeTrade.entryTime,
              exitPrice: activeTrade.tp2,
              exitTime: c.time,
              sl: activeTrade.sl,
              tp1: activeTrade.tp1,
              tp2: activeTrade.tp2,
              result: "WIN",
              pnlR: 2.0,
            });
            activeTrade = null;
          }
          // Check SL
          else if (c.high >= activeTrade.sl) {
            const isBE = activeTrade.tp1Hit && activeTrade.sl === activeTrade.entryPrice;
            trades.push({
              type: "SELL",
              entryPrice: activeTrade.entryPrice,
              entryTime: activeTrade.entryTime,
              exitPrice: activeTrade.sl,
              exitTime: c.time,
              sl: activeTrade.sl,
              tp1: activeTrade.tp1,
              tp2: activeTrade.tp2,
              result: isBE ? "BE" : "LOSS",
              pnlR: isBE ? 0.5 : -1.0,
            });
            activeTrade = null;
          }
        }
      }

      // Entry condition with Market Structure & Ribbon Pullback
      if (!activeTrade) {
        const e20 = ema20[i] ?? c.close;
        const e50 = ema50[i] ?? c.close;
        const e200 = ema200[i] ?? c.close;
        const rVal = rsi[i] ?? 50;

        const atr = Math.max(c.high - c.low, c.close * 0.005);
        const isUpTrend = c.close > e50 && e20 > e50 && c.close > e200;
        const isDownTrend = c.close < e50 && e20 < e50 && c.close < e200;

        // Pullback into Value Zone
        const isBuyPullback = c.low <= e20 * 1.002 && c.close > e20 && rVal >= 45 && rVal <= 65;
        const isSellPullback = c.high >= e20 * 0.998 && c.close < e20 && rVal <= 55 && rVal >= 35;

        if (isUpTrend && isBuyPullback && c.close > c.open) {
          const risk = Math.max(atr * 1.2, c.close - e50);
          activeTrade = {
            type: "BUY",
            entryPrice: c.close,
            entryTime: c.time,
            riskDist: risk,
            sl: Number((c.close - risk).toFixed(2)),
            tp1: Number((c.close + risk * 1.0).toFixed(2)),
            tp2: Number((c.close + risk * 2.2).toFixed(2)),
            tp1Hit: false,
          };
        } else if (isDownTrend && isSellPullback && c.close < c.open) {
          const risk = Math.max(atr * 1.2, e50 - c.close);
          activeTrade = {
            type: "SELL",
            entryPrice: c.close,
            entryTime: c.time,
            riskDist: risk,
            sl: Number((c.close + risk).toFixed(2)),
            tp1: Number((c.close - risk * 1.0).toFixed(2)),
            tp2: Number((c.close - risk * 2.2).toFixed(2)),
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
    const profitFactor = losses > 0 ? Number(((wins * 2.0 + beTrades * 0.5) / losses).toFixed(2)) : wins > 0 ? 99 : 0;

    return NextResponse.json({
      success: true,
      symbol,
      timeframe,
      candleCount: candles.length,
      metrics: {
        totalTrades,
        wins,
        beTrades,
        losses,
        winRate,
        netReturnR,
        profitFactor,
      },
      tradeHistory: trades.slice(-8).map((t) => ({
        type: t.type,
        entry: t.entryPrice,
        exit: t.exitPrice,
        result: t.result,
        pnlR: t.pnlR > 0 ? `+${t.pnlR}R` : `${t.pnlR}R`,
        date: new Date(t.entryTime * 1000).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }),
      })),
    });
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : "Backtest execution failed";
    return NextResponse.json({ success: false, error: errMsg }, { status: 500 });
  }
}