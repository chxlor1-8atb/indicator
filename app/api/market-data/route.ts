import { NextRequest, NextResponse } from "next/server";
import { AVAILABLE_ASSETS, getMarketCandles } from "@/lib/marketService";
import { calculateAllIndicators } from "@/lib/indicators";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const symbol = searchParams.get("symbol") || "XAUUSD";
    const timeframe = searchParams.get("timeframe") || "1h";

    const assetInfo = AVAILABLE_ASSETS.find((a) => a.symbol.toUpperCase() === symbol.toUpperCase()) || {
      symbol,
      name: symbol,
      category: "forex",
      baseAsset: symbol.substring(0, 3),
      quoteAsset: symbol.substring(3),
      precision: 2,
    };

    const candles = await getMarketCandles(symbol, timeframe);
    const indicators = calculateAllIndicators(candles, symbol);

    return NextResponse.json(
      {
        success: true,
        assetInfo,
        candles,
        indicators,
      },
      {
        headers: {
          // Vercel Global Edge Cache: instant <20ms response, background refresh
          "Cache-Control": "public, s-maxage=8, stale-while-revalidate=25",
        },
      }
    );
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : "Failed to fetch market data";
    return NextResponse.json({ success: false, error: errMsg }, { status: 500 });
  }
}
