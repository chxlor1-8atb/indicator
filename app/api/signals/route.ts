import { NextRequest, NextResponse } from "next/server";
import { getSignalsAndStats, saveAiSignal } from "@/lib/db";
import { AVAILABLE_ASSETS } from "@/lib/marketService";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const symbol = searchParams.get("symbol") || undefined;
    const limit = Number(searchParams.get("limit")) || 20;

    const data = await getSignalsAndStats(limit, symbol);

    // Enrich perSymbolStats with human-readable name and asset category
    const enrichedPerSymbolStats = (data.perSymbolStats || []).map((ps) => {
      const asset = AVAILABLE_ASSETS.find((a) => a.symbol === ps.symbol);
      return {
        ...ps,
        name: asset?.name || ps.symbol,
        category: asset?.category || (ps.symbol.endsWith("USDT") ? "crypto" : "forex"),
      };
    });

    return NextResponse.json(
      {
        success: true,
        ...data,
        perSymbolStats: enrichedPerSymbolStats,
      },
      {
        headers: {
          "Cache-Control": "public, s-maxage=5, stale-while-revalidate=15",
        },
      }
    );
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    if (!body.analysis) {
      return NextResponse.json({ success: false, error: "Missing analysis data" }, { status: 400 });
    }

    const result = await saveAiSignal(body.analysis);
    return NextResponse.json({ success: true, ...result });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
