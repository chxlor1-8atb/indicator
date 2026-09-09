import { NextRequest, NextResponse } from "next/server";
import {
  scanWatchlistAutonomous,
  getActiveBridgeOrders,
  getTelemetryLogs,
  DEFAULT_PILOT_CONFIG,
  approveOrder,
} from "@/lib/autonomousEngine";
import { saveAiSignal } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const triggerScan = searchParams.get("scan") === "true";

    let scanResult = null;
    if (triggerScan) {
      scanResult = await scanWatchlistAutonomous(DEFAULT_PILOT_CONFIG);

      // If new high-confluence orders were created, persist to DB signals
      if (scanResult.newOrders && scanResult.newOrders.length > 0) {
        for (const order of scanResult.newOrders) {
          try {
            await saveAiSignal({
              symbol: order.symbol,
              timeframe: "1h",
              signal: order.orderType.includes("BUY") ? "BUY" : "SELL",
              confidence: order.confluenceScore,
              marketCondition: order.comment,
              keyDrivers: ["AI Autonomous Multi-Pillar Trigger"],
              tradeSetup: {
                action: order.orderType.includes("BUY") ? "BUY" : "SELL",
                orderType: order.orderType as any,
                pendingPrice: order.price,
                entryZone: { min: order.price, max: order.price },
                stopLoss: order.stopLoss,
                takeProfit1: order.takeProfit1,
                takeProfit2: order.takeProfit2,
                slPips: Math.round(Math.abs(order.price - order.stopLoss) * (order.symbol.includes("XAU") ? 10 : 10000)),
                tp1Pips: Math.round(Math.abs(order.takeProfit1 - order.price) * (order.symbol.includes("XAU") ? 10 : 10000)),
                tp2Pips: Math.round(Math.abs(order.takeProfit2 - order.price) * (order.symbol.includes("XAU") ? 10 : 10000)),
                riskRewardRatio: "1:2.0",
              },
              masterConfluence: {
                totalScore: order.confluenceScore,
                grade: order.setupGrade as any,
                tradeRecommendation: "ENTER_POSITION",
                pillarsPassed: 20,
                checklist: [],
              },
              technicalAnalysis: {
                summary: `AI Autonomous Order primed: ${order.orderType} @ ${order.price}`,
                trend: order.orderType.includes("BUY") ? "UPTREND" : "DOWNTREND",
                supportResistance: { support: [order.stopLoss], resistance: [order.takeProfit2] },
                details: [],
              },
            } as any);
          } catch (e) {
            console.warn("Could not save autonomous order to signals DB:", e);
          }
        }
      }
    }

    const activeOrders = getActiveBridgeOrders();
    const telemetryLogs = getTelemetryLogs(30);

    return NextResponse.json(
      {
        success: true,
        pilotConfig: DEFAULT_PILOT_CONFIG,
        activeOrders,
        telemetryLogs,
        scannerSummaries: scanResult?.summaries || [],
        newOrders: scanResult?.newOrders || [],
        timestamp: Date.now(),
      },
      {
        headers: {
          "Cache-Control": "no-store, max-age=0",
        },
      }
    );
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : "Autonomous scanner failed";
    return NextResponse.json({ success: false, error: errMsg }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    if (typeof body.isEnabled === "boolean") {
      DEFAULT_PILOT_CONFIG.isEnabled = body.isEnabled;
    }
    if (typeof body.minConfluenceThreshold === "number") {
      DEFAULT_PILOT_CONFIG.minConfluenceThreshold = body.minConfluenceThreshold;
    }
    if (typeof body.riskPercentPerTrade === "number") {
      DEFAULT_PILOT_CONFIG.riskPercentPerTrade = body.riskPercentPerTrade;
    }
    if (body.accountType === "STANDARD" || body.accountType === "CENT") {
      DEFAULT_PILOT_CONFIG.accountType = body.accountType;
    }
    // ปรับ Approval Mode ผ่าน POST
    if (body.approvalMode === "AUTO" || body.approvalMode === "SEMI_AUTO" || body.approvalMode === "SIGNAL_ONLY") {
      DEFAULT_PILOT_CONFIG.approvalMode = body.approvalMode;
    }

    return NextResponse.json({
      success: true,
      message: "Autonomous Pilot Config updated",
      pilotConfig: DEFAULT_PILOT_CONFIG,
    });
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : "Failed to update config";
    return NextResponse.json({ success: false, error: errMsg }, { status: 500 });
  }
}

/**
 * PATCH /api/autonomous-scanner
 * Human Approval Gate — อนุมัติ/ปฏิเสธ order ที่รออยู่ใน PENDING_HUMAN_APPROVAL
 *
 * Body: { orderId: string, approved: boolean, approvedBy?: string, reason?: string }
 *
 * ตัวอย่าง:
 *   PATCH /api/autonomous-scanner
 *   { "orderId": "ord_XAUUSD_17...", "approved": true }
 *   { "orderId": "ord_BTCUSDT_17...", "approved": false, "reason": "ข่าว CPI ยังไม่ออก" }
 */
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));

    const { orderId, approved, approvedBy, reason } = body as {
      orderId?: string;
      approved?: boolean;
      approvedBy?: string;
      reason?: string;
    };

    if (!orderId || typeof orderId !== "string") {
      return NextResponse.json(
        { success: false, error: "orderId is required" },
        { status: 400 }
      );
    }
    if (typeof approved !== "boolean") {
      return NextResponse.json(
        { success: false, error: "approved (boolean) is required" },
        { status: 400 }
      );
    }

    const result = approveOrder(orderId, approved, approvedBy || "HUMAN", reason);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      action: approved ? "APPROVED" : "REJECTED",
      order: result.order,
      message: approved
        ? `✅ Order ${orderId.slice(-6)} approved — ส่งไป MT4/MT5 Bridge แล้ว`
        : `❌ Order ${orderId.slice(-6)} rejected${reason ? ` — ${reason}` : ""}`,
    });
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : "Approval action failed";
    return NextResponse.json({ success: false, error: errMsg }, { status: 500 });
  }
}
