import { NextRequest, NextResponse } from "next/server";
import { getMarketCandles } from "@/lib/marketService";
import { calculateAllIndicators } from "@/lib/indicators";
import { fetchLiveNews } from "@/lib/newsService";
import { analyzeWithGemini } from "@/lib/geminiService";
import { saveAiSignal, resolveOpenSignals } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const symbol = body.symbol || "XAUUSD";
    const timeframe = body.timeframe || "1h";
    const customApiKey = body.customApiKey;

    // 1. Fetch market candles & calculate technical indicators
    const candles = await getMarketCandles(symbol, timeframe);
    const indicators = calculateAllIndicators(candles);

    // 2. Fetch live market news
    const news = await fetchLiveNews();

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
    // Check open signals against current price & record new actionable setup
    if (indicators.currentPrice > 0) {
      resolveOpenSignals(symbol, indicators.currentPrice).catch(console.error);
    }
    if (analysis.signal !== "WAIT" && analysis.tradeSetup?.orderType !== "WAIT_NO_ORDER") {
      saveAiSignal(analysis).catch(console.error);
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
