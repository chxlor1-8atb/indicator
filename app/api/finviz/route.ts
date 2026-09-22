import { NextRequest, NextResponse } from "next/server";
import {
  fetchFinvizForexStrength,
  fetchFinvizMarketSentiment,
  getPairCurrencyDivergence,
} from "@/lib/finvizService";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const symbol = searchParams.get("symbol") || undefined;
    const forceRefresh = searchParams.get("refresh") === "true";

    const [forexStrength, marketSentiment] = await Promise.all([
      fetchFinvizForexStrength(forceRefresh),
      fetchFinvizMarketSentiment(),
    ]);

    let pairDivergence = undefined;
    if (symbol) {
      pairDivergence = getPairCurrencyDivergence(symbol, forexStrength);
    }

    return NextResponse.json(
      {
        success: true,
        forexStrength,
        marketSentiment,
        pairDivergence,
        timestamp: Date.now(),
      },
      {
        headers: {
          "Cache-Control": "public, s-maxage=120, stale-while-revalidate=300",
        },
      }
    );
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : "Failed to fetch Finviz data";
    return NextResponse.json(
      {
        success: false,
        error: errMsg,
      },
      { status: 500 }
    );
  }
}
