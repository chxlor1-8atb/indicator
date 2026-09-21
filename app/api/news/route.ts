import { NextRequest, NextResponse } from "next/server";
import { fetchLiveNews } from "@/lib/newsService";
import { syncLiveEconomicCalendar, getNewsSafetyShieldStatus } from "@/lib/calendarEngine";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category") || "all";
    const symbol = searchParams.get("symbol") || "";

    // Parallel fetch news and sync live Forex Factory calendar
    const [news] = await Promise.all([
      fetchLiveNews(category),
      syncLiveEconomicCalendar().catch(() => []),
    ]);

    let filteredNews = news;

    if (symbol) {
      const match = news.filter((n) => n.relatedSymbols.includes(symbol));
      if (match.length > 0) {
        filteredNews = match;
      }
    }

    const calendarStatus = symbol ? getNewsSafetyShieldStatus(symbol) : null;

    return NextResponse.json(
      {
        success: true,
        count: filteredNews.length,
        news: filteredNews,
        calendarStatus,
        timestamp: Date.now(),
      },
      {
        headers: {
          // Vercel Global Edge Cache: instant news load, 120s freshness, 300s background revalidation
          "Cache-Control": "public, s-maxage=120, stale-while-revalidate=300",
        },
      }
    );
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : "Failed to fetch news";
    return NextResponse.json({ success: false, error: errMsg }, { status: 500 });
  }
}
