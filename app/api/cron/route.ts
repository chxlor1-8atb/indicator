import { NextRequest, NextResponse } from "next/server";
import { getMarketCandles } from "@/lib/marketService";
import { calculateAllIndicators, calculateEMA, calculateRSI } from "@/lib/indicators";
import { fetchLiveNews } from "@/lib/newsService";
import { analyzeWithGemini } from "@/lib/geminiService";
import { sendTelegramMessage } from "@/lib/telegramService";

import { resolveOpenSignals, saveAiSignal, saveBacktestResults, BacktestTrade } from "@/lib/db";

export const dynamic = "force-dynamic";

export const maxDuration = 60;

export async function GET(request: NextRequest) {
  try {
    // Optional CRON_SECRET verification for security
    const authHeader = request.headers.get("authorization");
    if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const watchList = ["XAUUSD", "BTCUSDT", "EURUSD", "ETHUSDT", "SOLUSDT", "GBPUSD", "USDJPY", "USOIL"];
    const timeframes = ["15m", "1h", "4h", "1D"];
    const results = [];
    const news = await fetchLiveNews();

    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;

    // 1. Warm Neon PostgreSQL Rolling Buffer across all 4 timeframes concurrently
    await Promise.allSettled(
      watchList.flatMap((symbol) =>
        timeframes.map((tf) => getMarketCandles(symbol, tf).catch((e) => {
          console.warn(`Cron sync warning for ${symbol} [${tf}]:`, e);
          return null;
        }))
      )
    );

    // 2. Closed-Loop 24/7 Trade Resolution & Learning Attribution
    // Check open ACTIVE trades against latest price and record lessons upon TP/SL hit
    for (const symbol of watchList) {
      try {
        const hourlyCandles = await getMarketCandles(symbol, "1h");
        const latestPrice = hourlyCandles[hourlyCandles.length - 1]?.close;
        if (latestPrice && latestPrice > 0) {
          await resolveOpenSignals(symbol, latestPrice);
        }
      } catch (err) {
        console.warn(`Cron trade resolution failed for ${symbol}:`, err);
      }
    }

    // 3. Scan core assets for AI Signals & Telegram notifications
    const alertAssets = ["XAUUSD", "BTCUSDT", "EURUSD"];
    for (const symbol of alertAssets) {
      const candles = await getMarketCandles(symbol, "1h");
      const indicators = calculateAllIndicators(candles);
      const analysis = await analyzeWithGemini(symbol, "1h", candles, indicators, news);

      // Record actionable trades with state-transition deduplication
      if (analysis.signal !== "WAIT" && analysis.tradeSetup?.orderType !== "WAIT_NO_ORDER") {
        await saveAiSignal(analysis).catch(console.error);
      }

      // If high confidence signal (Strong Buy/Sell or >= 80% confidence), send alert
      if (
        botToken &&
        chatId &&
        (analysis.signal === "STRONG_BUY" || analysis.signal === "STRONG_SELL" || analysis.confidence >= 80)
      ) {
        await sendTelegramMessage({ botToken, chatId, analysis });
      }

      results.push({
        symbol,
        signal: analysis.signal,
        confidence: analysis.confidence,
      });
    }

    // ─── 4. Historical Backtest Auto-Seeding ───
    // Run lightweight EMA/RSI backtest for all watchList symbols and persist to DB.
    // ON CONFLICT DO NOTHING ensures no duplicates if cron runs repeatedly.
    let backtestSeeded = 0;
    for (const symbol of watchList) {
      try {
        const btCandles = await getMarketCandles(symbol, "1h");
        if (!btCandles || btCandles.length < 50) continue;


        const ema20 = calculateEMA(btCandles, 20);
        const ema50 = calculateEMA(btCandles, 50);
        const ema200 = calculateEMA(btCandles, 200);
        const rsi = calculateRSI(btCandles, 14);

        const isGold = symbol.toUpperCase().includes("XAU");
        const isCrypto = ["BTC", "ETH", "SOL", "BNB", "XRP", "ADA", "DOGE"].some((c) => symbol.toUpperCase().includes(c));
        const pipMul = isGold ? 10 : isCrypto ? 1 : symbol.toUpperCase().includes("JPY") ? 100 : 10000;

        const btTrades: BacktestTrade[] = [];
        let active: { type: "BUY" | "SELL"; entryPrice: number; entryTime: number; sl: number; tp1: number; tp2: number; tp1Hit: boolean } | null = null;

        for (let i = 30; i < btCandles.length; i++) {
          const c = btCandles[i];
          if (active) {
            if (active.type === "BUY") {
              if (!active.tp1Hit && c.high >= active.tp1) { active.tp1Hit = true; active.sl = active.entryPrice; }
              if (c.high >= active.tp2) {
                btTrades.push({ type: "BUY", entryPrice: active.entryPrice, exitPrice: active.tp2, sl: active.sl, tp1: active.tp1, tp2: active.tp2, result: "WIN", pnlR: 2.0, pnlPips: Number((Math.abs(active.tp2 - active.entryPrice) * pipMul).toFixed(1)), entryTime: active.entryTime, exitTime: c.time });
                active = null;
              } else if (c.low <= active.sl) {
                const isBE = active.tp1Hit;
                btTrades.push({ type: "BUY", entryPrice: active.entryPrice, exitPrice: active.sl, sl: active.sl, tp1: active.tp1, tp2: active.tp2, result: isBE ? "BE" : "LOSS", pnlR: isBE ? 0.5 : -1.0, pnlPips: Number((Math.abs(active.sl - active.entryPrice) * pipMul * (isBE ? 0.5 : -1)).toFixed(1)), entryTime: active.entryTime, exitTime: c.time });
                active = null;
              }
            } else {
              if (!active.tp1Hit && c.low <= active.tp1) { active.tp1Hit = true; active.sl = active.entryPrice; }
              if (c.low <= active.tp2) {
                btTrades.push({ type: "SELL", entryPrice: active.entryPrice, exitPrice: active.tp2, sl: active.sl, tp1: active.tp1, tp2: active.tp2, result: "WIN", pnlR: 2.0, pnlPips: Number((Math.abs(active.entryPrice - active.tp2) * pipMul).toFixed(1)), entryTime: active.entryTime, exitTime: c.time });
                active = null;
              } else if (c.high >= active.sl) {
                const isBE = active.tp1Hit;
                btTrades.push({ type: "SELL", entryPrice: active.entryPrice, exitPrice: active.sl, sl: active.sl, tp1: active.tp1, tp2: active.tp2, result: isBE ? "BE" : "LOSS", pnlR: isBE ? 0.5 : -1.0, pnlPips: Number((Math.abs(active.entryPrice - active.sl) * pipMul * (isBE ? 0.5 : -1)).toFixed(1)), entryTime: active.entryTime, exitTime: c.time });
                active = null;
              }
            }
          }
          if (!active) {
            const e20 = ema20[i] ?? c.close;
            const e50 = ema50[i] ?? c.close;
            const e200 = ema200[i] ?? c.close;
            const rVal = rsi[i] ?? 50;
            const atr = Math.max(c.high - c.low, c.close * 0.005);
            if (c.close > e50 && e20 > e50 && c.close > e200 && c.low <= e20 * 1.002 && c.close > e20 && rVal >= 45 && rVal <= 65 && c.close > c.open) {
              const risk = Math.max(atr * 1.2, c.close - e50);
              active = { type: "BUY", entryPrice: c.close, entryTime: c.time, sl: Number((c.close - risk).toFixed(4)), tp1: Number((c.close + risk).toFixed(4)), tp2: Number((c.close + risk * 2.2).toFixed(4)), tp1Hit: false };
            } else if (c.close < e50 && e20 < e50 && c.close < e200 && c.high >= e20 * 0.998 && c.close < e20 && rVal <= 55 && rVal >= 35 && c.close < c.open) {
              const risk = Math.max(atr * 1.2, e50 - c.close);
              active = { type: "SELL", entryPrice: c.close, entryTime: c.time, sl: Number((c.close + risk).toFixed(4)), tp1: Number((c.close - risk).toFixed(4)), tp2: Number((c.close - risk * 2.2).toFixed(4)), tp1Hit: false };
            }
          }
        }

        if (btTrades.length > 0) {
          const r = await saveBacktestResults(symbol, "1h", btTrades);
          backtestSeeded += r.saved;
        }
      } catch (err) {
        console.warn(`Cron backtest seeding failed for ${symbol}:`, err);
      }
    }

    return NextResponse.json({
      success: true,
      message: "Cron job executed successfully",
      scanned: results,
      backtestSeeded,
      timestamp: new Date().toISOString(),
    });
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : "Cron execution failed";
    return NextResponse.json({ success: false, error: errMsg }, { status: 500 });
  }
}
