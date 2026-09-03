import { NextRequest, NextResponse } from "next/server";
import { getMarketCandles } from "@/lib/marketService";
import { calculateAllIndicators } from "@/lib/indicators";
import { fetchLiveNews } from "@/lib/newsService";
import { analyzeWithGemini } from "@/lib/geminiService";
import { sendTelegramMessage } from "@/lib/telegramService";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    // Optional CRON_SECRET verification for security
    const authHeader = request.headers.get("authorization");
    if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const watchList = ["XAUUSD", "BTCUSDT", "EURUSD"];
    const results = [];
    const news = await fetchLiveNews();

    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;

    for (const symbol of watchList) {
      const candles = await getMarketCandles(symbol, "1h");
      const indicators = calculateAllIndicators(candles);
      const analysis = await analyzeWithGemini(symbol, "1h", candles, indicators, news);

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
