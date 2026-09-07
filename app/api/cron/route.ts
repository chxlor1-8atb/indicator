import { NextRequest, NextResponse } from "next/server";
import { getMarketCandles, simulateInstitutionalBacktest } from "@/lib/marketService";
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

    const watchList = [
      "XAUUSD", "BTCUSDT", "EURUSD", "ETHUSDT", "SOLUSDT", "GBPUSD", "USDJPY", "USOIL",
      "GBPJPY", "EURJPY", "AUDUSD", "USDCAD", "USDCHF", "NZDUSD", "EURGBP", "AUDJPY"
    ];
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

    // ─── 4. Historical Backtest Auto-Seeding (500 Candles) ───
    // Run institutional 500-candle backtest for watchlist symbols and persist to DB.
    // ON CONFLICT DO NOTHING ensures no duplicates if cron runs repeatedly.
    let backtestSeeded = 0;
    for (const symbol of watchList) {
      try {
        const btCandles = await getMarketCandles(symbol, "1h");
        const candles500 = btCandles.slice(-500);
        if (!candles500 || candles500.length < 50) continue;

        const btTrades = simulateInstitutionalBacktest(symbol, candles500);
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
