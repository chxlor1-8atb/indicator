import { NextRequest, NextResponse } from "next/server";
import {
  scanWatchlistAutonomous,
  getActiveBridgeOrders,
  getTelemetryLogs,
  DEFAULT_PILOT_CONFIG,
  approveOrder,
} from "@/lib/autonomousEngine";
import { saveAiSignal, resolveOpenSignals, resilientQuery } from "@/lib/db";
import { sendTelegramMessage, isSymbolAllowedForAlert } from "@/lib/telegramService";

export const dynamic = "force-dynamic";

const preWarningAlertThrottle = new Map<string, number>();
const PRE_WARNING_COOLDOWN_MS = 25 * 60 * 1000; // 25 minutes cooldown per asset
const actionableAlertThrottle = new Map<string, number>();
const ACTIONABLE_COOLDOWN_MS = 20 * 60 * 1000; // 20 minutes cooldown per asset setup

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const hasScanParam = searchParams.get("scan") === "true" || searchParams.get("scan") === "1";
    const isCronHeader = Boolean(request.headers.get("x-cron") || request.headers.get("x-vercel-cron"));
    const triggerScan = hasScanParam || isCronHeader;

    let scanResult = null;
    if (triggerScan) {
      scanResult = await scanWatchlistAutonomous(DEFAULT_PILOT_CONFIG);

      const botToken = process.env.TELEGRAM_BOT_TOKEN;
      const envChatId = process.env.TELEGRAM_CHAT_ID;
      const primaryFilter = process.env.TELEGRAM_ALERT_SYMBOLS || "ALL";

      // รวบรวมรายชื่อผู้รับการแจ้งเตือนทั้งหมด ทั้งจาก Environment Variables และ Neon DB subscribers
      const subscribersMap = new Map<string, string>();
      if (envChatId) {
        subscribersMap.set(envChatId, primaryFilter);
      }
      try {
        const dbSubs = await resilientQuery<{ chat_id: string; alert_symbol: string }[]>(
          `SELECT chat_id, alert_symbol FROM telegram_subscribers WHERE is_active = TRUE`
        );
        if (dbSubs && dbSubs.length > 0) {
          for (const sub of dbSubs) {
            subscribersMap.set(sub.chat_id, sub.alert_symbol || "ALL");
          }
        }
      } catch (dbErr) {
        console.warn("Could not query telegram_subscribers from DB:", dbErr);
      }

      // 1. บันทึก Actionable AI Signals ลงฐานข้อมูล และส่งแจ้งเตือน Telegram พร้อมกันแบบ Non-blocking (กรองเฉพาะคู่เงินที่เลือก)
      if (scanResult.actionableAnalyses && scanResult.actionableAnalyses.length > 0) {
        Promise.allSettled(
          scanResult.actionableAnalyses.map(async (analysis) => {
            // บันทึกลงฐานข้อมูลแบบแยก isolate (หาก DB มีปัญหา จะไม่ทำให้การส่ง Telegram ล้มเหลว)
            saveAiSignal(analysis).catch((err) => console.warn("Could not save signal to DB:", err));

            // ตรวจสอบ Throttle เพื่อป้องกันการส่งซ้ำทุก 25 วินาทีขณะเปิดหน้าจอค้างไว้
            const throttleKey = `${analysis.symbol}_${analysis.signal}_${analysis.tradeSetup?.orderType}`;
            const now = Date.now();
            const lastSent = actionableAlertThrottle.get(throttleKey) || 0;
            if (now - lastSent >= ACTIONABLE_COOLDOWN_MS) {
              actionableAlertThrottle.set(throttleKey, now);

              // Broadcast ไปยัง subscribers ทุกคนที่เลือกรับสัญญาณคู่นี้
              if (botToken && DEFAULT_PILOT_CONFIG.autoDispatchTelegram && subscribersMap.size > 0) {
                subscribersMap.forEach((filter, targetChatId) => {
                  if (isSymbolAllowedForAlert(analysis.symbol, filter)) {
                    sendTelegramMessage({ botToken, chatId: targetChatId, analysis }).catch((e) => {
                      console.warn(`Failed to dispatch alert to ${targetChatId}:`, e);
                    });
                  }
                });
              }
            }
          })
        ).catch((err) => console.warn("Autonomous dispatch error:", err));
      }

      // 2. ส่งการแจ้งเตือนเตือนล่วงหน้า (Pre-Warning Radar Alert 15-30 นาที) (กรองเฉพาะคู่เงินที่เลือก)
      if (scanResult.preWarningAnalyses && scanResult.preWarningAnalyses.length > 0) {
        Promise.allSettled(
          scanResult.preWarningAnalyses.map(async (analysis) => {
            const now = Date.now();
            const lastAlert = preWarningAlertThrottle.get(analysis.symbol) || 0;
            if (now - lastAlert >= PRE_WARNING_COOLDOWN_MS) {
              preWarningAlertThrottle.set(analysis.symbol, now);

              if (botToken && DEFAULT_PILOT_CONFIG.autoDispatchTelegram && subscribersMap.size > 0) {
                subscribersMap.forEach((filter, targetChatId) => {
                  if (isSymbolAllowedForAlert(analysis.symbol, filter)) {
                    sendTelegramMessage({ botToken, chatId: targetChatId, analysis, isPreWarning: true }).catch((e) => {
                      console.warn(`Failed to dispatch pre-warning to ${targetChatId}:`, e);
                    });
                  }
                });
              }
            }
          })
        ).catch((err) => console.warn("Pre-warning dispatch error:", err));
      }

      // 3. ตรวจสอบสถานะออเดอร์ที่เปิดค้างไว้ (ACTIVE / HIT_TP1) กับราคาตลาดล่าสุด เพื่อแจ้งเตือนผลลัพธ์ (Order Result: TP1, TP2, SL) ทาง Telegram
      if (scanResult.summaries && scanResult.summaries.length > 0) {
        Promise.allSettled(
          scanResult.summaries.map((s) => resolveOpenSignals(s.symbol, s.price))
        ).catch((err) => console.warn("Order resolution note:", err));
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
