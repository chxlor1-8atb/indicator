import { NextRequest, NextResponse } from "next/server";
import { fetchTradingViewSpotQuote, getMarketCandles } from "@/lib/marketService";
import { resolveOrdersAgainstLivePrice } from "@/lib/autonomousEngine";
import { resolveOpenSignals } from "@/lib/db";
import { validatePriceIntegrity } from "@/lib/priceIntegrity";

export const dynamic = "force-dynamic";

const resolutionThrottle = new Map<string, number>();

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const symbol = searchParams.get("symbol") || "XAUUSD";

    let quote = await fetchTradingViewSpotQuote(symbol);
    if (!quote || quote.price <= 0) {
      const candles = await getMarketCandles(symbol, "1h");
      if (candles && candles.length > 0) {
        const last = candles[candles.length - 1];
        quote = {
          price: last.close,
          open: last.open,
          high: last.high,
          low: last.low,
          change: ((last.close - candles[0].open) / (candles[0].open || 1)) * 100,
          volume: last.volume,
        };
      }
    }

    if (quote && quote.price > 0) {
      // ─── Real-Time Autonomous Synchronization with Price Integrity Check ───
      const integrity = validatePriceIntegrity(symbol, quote.price);
      if (integrity.isValid) {
        try {
          resolveOrdersAgainstLivePrice(symbol, quote.price);
          // Throttle DB resolution to once per 60s per symbol to eliminate CPU burn
          const now = Date.now();
          const lastResolve = resolutionThrottle.get(symbol) || 0;
          if (now - lastResolve >= 60000) {
            resolutionThrottle.set(symbol, now);
            resolveOpenSignals(symbol, quote.price).catch(() => {});
          }
        } catch {
          // Non-blocking background resolution
        }
      }

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
            // Vercel Global Edge Cache: 5s Edge Cache + 15s SWR background revalidate
            "Cache-Control": "public, s-maxage=5, stale-while-revalidate=15",
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
