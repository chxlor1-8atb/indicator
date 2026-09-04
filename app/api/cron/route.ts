import { NextRequest, NextResponse } from "next/server";
import { getMarketCandles } from "@/lib/marketService";
import { calculateAllIndicators } from "@/lib/indicators";
import { fetchLiveNews } from "@/lib/newsService";
import { analyzeWithGemini } from "@/lib/geminiService";
import { sendTelegramMessage } from "@/lib/telegramService";

import { resolveOpenSignals, saveAiSignal } from "@/lib/db";

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

    return NextResponse.json({
      success: true,
      message: "Cron job executed successfully",
      scanned: results,
      timestamp: new Date().toISOString(),
    });
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : "Cron execution failed";
    return NextResponse.json({ success: false, error: errMsg }, { status: 500 });
  }
}
