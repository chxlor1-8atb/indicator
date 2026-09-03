import { NextRequest, NextResponse } from "next/server";
import { fetchLiveNews } from "@/lib/newsService";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category") || "all";
    const symbol = searchParams.get("symbol") || "";

    const news = await fetchLiveNews(category);
    let filteredNews = news;

    if (symbol) {
      const match = news.filter((n) => n.relatedSymbols.includes(symbol));
      if (match.length > 0) {
        filteredNews = match;
      }
    }

    return NextResponse.json({
      success: true,
      count: filteredNews.length,
      news: filteredNews,
    });
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : "Failed to fetch news";
    return NextResponse.json({ success: false, error: errMsg }, { status: 500 });
  }
}
