import { NextRequest, NextResponse } from "next/server";
import {
  getActiveBridgeOrders,
  addTelemetryLog,
  resolveOrdersAgainstLivePrice,
} from "@/lib/autonomousEngine";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const format = searchParams.get("format");
    const symbol = searchParams.get("symbol") || undefined;

    const orders = getActiveBridgeOrders(symbol);

    if (format === "csv" || format === "mt") {
      // Format for MT4/MT5 EA line parser:
      // TICKET_ID,SYMBOL,TYPE,PRICE,SL,TP1,TP2,LOTS
      const lines = orders.map(
        (o) =>
          `${o.id},${o.symbol},${o.orderType},${o.price},${o.stopLoss},${o.takeProfit1},${o.takeProfit2},${o.lotSize}`
      );
      return new NextResponse(lines.join("\n"), {
        status: 200,
        headers: {
          "Content-Type": "text/plain",
          "Cache-Control": "no-store",
        },
      });
    }

    return NextResponse.json(
      {
        success: true,
        count: orders.length,
        orders,
        timestamp: Date.now(),
      },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : "MT Bridge error";
    return NextResponse.json({ success: false, error: errMsg }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { orderId, action, symbol, executionPrice, profitPips } = body;

    if (symbol && executionPrice) {
      resolveOrdersAgainstLivePrice(symbol, executionPrice);
    }

    if (orderId && action) {
      addTelemetryLog(
        symbol || "MT_BRIDGE",
        action === "FILL" ? "ORDER" : "RESOLVE",
        `MT4/MT5 EA Event: Order ${orderId} ${action} @ ${executionPrice || "Market"} (PnL: ${profitPips || 0} pips)`
      );
    }

    return NextResponse.json({ success: true, message: "MT Bridge event recorded" });
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : "MT Bridge post failed";
    return NextResponse.json({ success: false, error: errMsg }, { status: 500 });
  }
}
