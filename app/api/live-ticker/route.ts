import { NextRequest, NextResponse } from "next/server";
import { fetchTradingViewSpotQuote } from "@/lib/marketService";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const symbol = searchParams.get("symbol") || "XAUUSD";

    const quote = await fetchTradingViewSpotQuote(symbol);
    if (quote && quote.price > 0) {
      return NextResponse.json(
        {
          success: true,
          symbol,
          price: quote.price,
          high: quote.high,
          low: quote.low,
          open: quote.open,
          change: quote.change,
          volume: quote.volume,
          source: symbol.toUpperCase() === "XAUUSD" ? "OANDA:XAUUSD (TradingView)" : "TradingView Interbank",
          timestamp: Date.now(),
        },
        {
          headers: {
            "Cache-Control": "no-store, max-age=0",
          },
        }
      );
    }

    return NextResponse.json({ success: false, error: "Quote not available" }, { status: 404 });
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : "Failed to fetch live ticker";
    return NextResponse.json({ success: false, error: errMsg }, { status: 500 });
  }
}
