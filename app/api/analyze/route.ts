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
} from "@/lib/db";

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
    
    // 4. Save AI Signal to Neon DB with deduplication for UI Journal & Win-rate tracking
    // Note: Automatic Telegram broadcast is centralized in the Autonomous Scanner (/api/autonomous-scanner)
    // to prevent duplicate double-alerts when users browse assets on the dashboard.
    const isActionable =
      analysis.signal !== "WAIT" &&
      analysis.tradeSetup?.orderType !== "WAIT_NO_ORDER" &&
      analysis.tradeSetup?.action !== "NO_TRADE" &&
      (analysis.masterConfluence?.totalScore ?? 0) >= 70 &&
      !analysis.setupGrade.includes("C") &&
      !analysis.setupGrade.includes("Wait");

    if (isActionable) {
      await saveAiSignal(analysis).catch((err) => {
        console.error("Save AI signal error:", err);
      });
    }

    // 5. Continuous Real-time Win Rate & Backtest Sync into Neon DB (Background Fire-and-Forget)
    const candles500 = candles.slice(-500);
    if (candles500.length >= 35) {
      setTimeout(() => {
        try {
          const btTrades = simulateInstitutionalBacktest(symbol, candles500);
          if (btTrades.length > 0) {
            saveBacktestResults(symbol, timeframe, btTrades).catch((e) =>
              console.warn(`Real-time backtest sync warning for ${symbol}:`, e)
            );
          }
        } catch (e) {
          console.warn(`Background backtest sync warning for ${symbol}:`, e);
        }
      }, 0);
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
