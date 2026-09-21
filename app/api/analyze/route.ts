import { NextRequest, NextResponse } from "next/server";
import { getMarketCandles, simulateInstitutionalBacktest } from "@/lib/marketService";
import { calculateAllIndicators } from "@/lib/indicators";
import { fetchLiveNews } from "@/lib/newsService";
import { analyzeWithGemini } from "@/lib/geminiService";
import {
  saveAiSignal,
  resolveOpenSignals,
  saveMarketSnapshot,
  saveBacktestResults,
  resilientQuery,
  updateSignalTelegramMessages,
  SaveAiSignalResult,
  getTelegramSubscribers,
} from "@/lib/db";
import {
  sendTelegramMessage,
  deleteTelegramMessage,
  isSymbolAllowedForAlert,
  DEFAULT_TELEGRAM_BOT_TOKEN,
  DEFAULT_TELEGRAM_CHAT_ID,
} from "@/lib/telegramService";

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
    
    // อัปเดตราคาล่าสุดก่อนส่ง Telegram เพื่อให้ตรงกับราคาจริง
    const latestCandle = candles[candles.length - 1];
    if (latestCandle) {
      analysis.currentPrice = latestCandle.close;
    }
    
    if (analysis.signal !== "WAIT" && analysis.tradeSetup?.orderType !== "WAIT_NO_ORDER") {
      const saveRes: SaveAiSignalResult = await saveAiSignal(analysis).catch((err) => {
        console.error("Save AI signal error:", err);
        return { saved: false };
      });

      // Dispatch Telegram Alert ONLY for new, non-duplicate signals (prevents duplicate spam on page refresh)
      if (saveRes && saveRes.saved) {
        const botToken = process.env.TELEGRAM_BOT_TOKEN || DEFAULT_TELEGRAM_BOT_TOKEN;
        const envChatId = process.env.TELEGRAM_CHAT_ID || DEFAULT_TELEGRAM_CHAT_ID;

        // Run Telegram dispatch asynchronously so HTTP response is not delayed
        (async () => {
          let primaryFilter = process.env.TELEGRAM_ALERT_SYMBOLS || "ALL";
          try {
            const subscriber = await resilientQuery<{ alert_symbol: string }[]>(
              `SELECT alert_symbol FROM telegram_subscribers WHERE chat_id = $1 AND is_active = TRUE LIMIT 1`,
              [envChatId]
            );
            if (subscriber && subscriber.length > 0 && subscriber[0].alert_symbol) {
              primaryFilter = subscriber[0].alert_symbol;
            }
          } catch (err) {
            console.warn("Failed to fetch subscriber filter, using env variable:", err);
          }

          if (botToken) {
            // Auto-delete: ลบข้อความสัญญาณเก่าของคู่นี้ทิ้งเมื่อมีสัญญาณใหม่เข้ามาแทน
            if (saveRes.previousMessages && Array.isArray(saveRes.previousMessages)) {
              for (const prev of saveRes.previousMessages) {
                if (prev.chatId && prev.messageId) {
                  deleteTelegramMessage({ botToken, chatId: prev.chatId, messageId: prev.messageId }).catch(() => {});
                }
              }
            }

            // Use cached subscriber list (5-min TTL) to avoid repeated DB round-trips
            const allSubs = await getTelegramSubscribers();
            const subscribersMap = new Map<string, string>();
            if (envChatId) subscribersMap.set(envChatId, primaryFilter);
            for (const sub of allSubs) {
              subscribersMap.set(sub.chat_id, sub.alert_symbol || "ALL");
            }

            const sentMessages: Array<{ chatId: string; messageId: number }> = [];
            const sendPromises: Promise<unknown>[] = [];
            subscribersMap.forEach((filter, targetChatId) => {
              if (isSymbolAllowedForAlert(analysis.symbol, filter)) {
                sendPromises.push(
                  sendTelegramMessage({ botToken, chatId: targetChatId, analysis, currentPrice: analysis.currentPrice })
                    .then((res) => {
                      if (res?.success && res.messageId) {
                        sentMessages.push({ chatId: targetChatId, messageId: res.messageId });
                      }
                    })
                    .catch((e) => {
                      console.warn(`[Analyze Dispatch] Telegram error for ${targetChatId}:`, e);
                    })
                );
              }
            });
            await Promise.allSettled(sendPromises);

            if (saveRes.signalId && sentMessages.length > 0) {
              await updateSignalTelegramMessages(saveRes.signalId, sentMessages).catch(() => {});
            }
          }
        })().catch((err) => console.warn("[Analyze Dispatch] Background dispatch error:", err));
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
