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
      analysis.indicators = { ...analysis.indicators, currentPrice: latestCandle.close };
    }
    
    if (analysis.signal !== "WAIT" && analysis.tradeSetup?.orderType !== "WAIT_NO_ORDER") {
      const saveRes: SaveAiSignalResult = await saveAiSignal(analysis).catch((err) => {
        console.error("Save AI signal error:", err);
        return { saved: false };
      });

      // Dispatch Telegram Alert to primary chat & active subscribers
      const botToken = process.env.TELEGRAM_BOT_TOKEN || DEFAULT_TELEGRAM_BOT_TOKEN;
      const envChatId = process.env.TELEGRAM_CHAT_ID || DEFAULT_TELEGRAM_CHAT_ID;
      
      // ดึงค่า filter จาก database subscriber หรือใช้ environment variable เป็นค่า fallback
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
        if (saveRes && saveRes.saved && saveRes.previousMessages && Array.isArray(saveRes.previousMessages)) {
          for (const prev of saveRes.previousMessages) {
            if (prev.chatId && prev.messageId) {
              deleteTelegramMessage({ botToken, chatId: prev.chatId, messageId: prev.messageId }).catch(() => {});
            }
          }
        }

        const sentMessages: Array<{ chatId: string; messageId: number }> = [];

        if (envChatId && isSymbolAllowedForAlert(analysis.symbol, primaryFilter)) {
          const res = await sendTelegramMessage({ botToken, chatId: envChatId, analysis }).catch((e) => {
            console.warn("[Analyze Dispatch] Primary Telegram error:", e);
            return null;
          });
          if (res?.success && res.messageId) {
            sentMessages.push({ chatId: envChatId, messageId: res.messageId });
          }
        }

        try {
          const subs = await resilientQuery<{ chat_id: string; alert_symbol: string }[]>(
            `SELECT chat_id, alert_symbol FROM telegram_subscribers WHERE is_active = TRUE`
          );
          if (subs && subs.length > 0) {
            for (const sub of subs) {
              if (sub.chat_id !== envChatId && isSymbolAllowedForAlert(analysis.symbol, sub.alert_symbol)) {
                const res = await sendTelegramMessage({ botToken, chatId: sub.chat_id, analysis }).catch(() => null);
                if (res?.success && res.messageId) {
                  sentMessages.push({ chatId: sub.chat_id, messageId: res.messageId });
                }
              }
            }
          }
        } catch (subErr) {
          console.warn("Subscribers query note:", subErr);
        }

        if (saveRes && saveRes.signalId && sentMessages.length > 0) {
          await updateSignalTelegramMessages(saveRes.signalId, sentMessages);
        }
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
