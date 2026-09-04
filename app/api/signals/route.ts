import { NextRequest, NextResponse } from "next/server";
import { getSignalsAndStats, saveAiSignal } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const data = await getSignalsAndStats(20);
    return NextResponse.json(
      {
        success: true,
        ...data,
      },
      {
        headers: {
          // Bandwidth-saving: Cache at Vercel Edge for 30 seconds
          "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60",
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
