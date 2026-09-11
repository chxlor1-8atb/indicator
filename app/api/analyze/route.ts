import { NextRequest, NextResponse } from "next/server";
import { getMarketCandles, simulateInstitutionalBacktest } from "@/lib/marketService";
import { calculateAllIndicators } from "@/lib/indicators";
import { fetchLiveNews } from "@/lib/newsService";
import { analyzeWithGemini } from "@/lib/geminiService";
import { saveAiSignal, resolveOpenSignals, saveMarketSnapshot, saveBacktestResults, resilientQuery } from "@/lib/db";
import { sendTelegramMessage, isSymbolAllowedForAlert } from "@/lib/telegramService";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const symbol = body.symbol || "XAUUSD";
    const timeframe = body.timeframe || "1h";
    const customApiKey = body.customApiKey;

    // 1. Fetch market candles and live news concurrently (eliminates sequential waterfall latency)
    const [candles, news] = await Promise.all([
      getMarketCandles(symbol, timeframe),
      fetchLiveNews(),
    ]);
    const indicators = calculateAllIndicators(candles, symbol);

    // 3. Run AI Hybrid Analysis (Gemini)
    const analysis = await analyzeWithGemini(
      symbol,
      timeframe,
      candles,
      indicators,
      news,
      customApiKey
    );

    // 4. Ultra-efficient Event-Driven DB Hook (Non-blocking):
    // Check open signals, record snapshot & store new actionable trade
    if (indicators.currentPrice > 0) {
      resolveOpenSignals(symbol, indicators.currentPrice).catch(console.error);
      const lastRSI = Number(indicators.rsi14[indicators.rsi14.length - 1] || 50);
      const lastST = indicators.superTrend?.[indicators.superTrend.length - 1]?.direction || "UP";
      saveMarketSnapshot(symbol, timeframe, indicators.currentPrice, lastRSI, lastST, analysis.regimeInfo?.title).catch(console.error);
    }
    if (analysis.signal !== "WAIT" && analysis.tradeSetup?.orderType !== "WAIT_NO_ORDER") {
      saveAiSignal(analysis).catch(console.error);

      // Dispatch Telegram Alert to primary chat & active subscribers (Non-blocking)
      const botToken = process.env.TELEGRAM_BOT_TOKEN;
      const envChatId = process.env.TELEGRAM_CHAT_ID;
      const primaryFilter = process.env.TELEGRAM_ALERT_SYMBOLS || "ALL";

      if (botToken) {
        if (envChatId && isSymbolAllowedForAlert(analysis.symbol, primaryFilter)) {
          sendTelegramMessage({ botToken, chatId: envChatId, analysis }).catch((e) =>
            console.warn("[Analyze Dispatch] Primary Telegram error:", e)
          );
        }
        resilientQuery<{ chat_id: string; alert_symbol: string }[]>(
          `SELECT chat_id, alert_symbol FROM telegram_subscribers WHERE is_active = TRUE`
        ).then((subs) => {
          if (subs && subs.length > 0) {
            for (const sub of subs) {
              if (sub.chat_id !== envChatId && isSymbolAllowedForAlert(analysis.symbol, sub.alert_symbol)) {
                sendTelegramMessage({ botToken, chatId: sub.chat_id, analysis }).catch(() => {});
              }
            }
          }
        }).catch(() => {});
      }
    }

    // 5. Continuous Real-time Win Rate & Backtest Sync into Neon DB (Non-blocking)
    const candles500 = candles.slice(-500);
    if (candles500.length >= 35) {
      const btTrades = simulateInstitutionalBacktest(symbol, candles500);
      if (btTrades.length > 0) {
        saveBacktestResults(symbol, timeframe, btTrades).catch((e) =>
          console.warn(`Real-time backtest sync warning for ${symbol}:`, e)
        );
      }
    }

    return NextResponse.json({
      success: true,
      analysis,
    });
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : "Failed to perform AI analysis";
    return NextResponse.json({ success: false, error: errMsg }, { status: 500 });
  }
}
