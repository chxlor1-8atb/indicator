import { NextRequest, NextResponse } from "next/server";
import {
  scanWatchlistAutonomous,
  getActiveBridgeOrders,
  getTelemetryLogs,
  DEFAULT_PILOT_CONFIG,
  approveOrder,
  getScannerCache,
} from "@/lib/autonomousEngine";
import {
  saveAiSignal,
  resolveOpenSignals,
  resilientQuery,
  updateSignalTelegramMessages,
  SaveAiSignalResult,
} from "@/lib/db";
import {
  sendTelegramMessage,
  deleteTelegramMessage,
  isSymbolAllowedForAlert,
  DEFAULT_TELEGRAM_BOT_TOKEN,
  DEFAULT_TELEGRAM_CHAT_ID,
} from "@/lib/telegramService";

export const dynamic = "force-dynamic";

const preWarningAlertThrottle = new Map<string, number>();
const PRE_WARNING_COOLDOWN_MS = 25 * 60 * 1000; // 25 minutes cooldown per asset
const actionableAlertThrottle = new Map<string, number>();
const ACTIONABLE_COOLDOWN_MS = 20 * 60 * 1000; // 20 minutes cooldown per asset setup
const preWarningMessagesMap = new Map<string, Array<{ chatId: string; messageId: number }>>();

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const hasScanParam = searchParams.get("scan") === "true" || searchParams.get("scan") === "1";
    const isCronHeader = Boolean(request.headers.get("x-cron") || request.headers.get("x-vercel-cron"));
    const isForce = searchParams.get("force") === "true";
    const triggerScan = hasScanParam || isCronHeader;

    let scanResult = null;
    if (triggerScan) {
      scanResult = await scanWatchlistAutonomous(DEFAULT_PILOT_CONFIG, isForce);

      // Only dispatch alerts and update DB on fresh scans (not cached within 3-min TTL)
      if (!scanResult.cached) {
        const botToken = process.env.TELEGRAM_BOT_TOKEN || DEFAULT_TELEGRAM_BOT_TOKEN;
        const envChatId = process.env.TELEGRAM_CHAT_ID || DEFAULT_TELEGRAM_CHAT_ID;
        
        // ดึงค่า filter จาก database subscriber หรือใช้ environment variable เป็นค่า fallback
        let primaryFilter = process.env.TELEGRAM_ALERT_SYMBOLS || "ALL";
        try {
          const subscriber = await resilientQuery<{ alert_symbol: string }[]>(
            `SELECT alert_symbol FROM telegram_subscribers WHERE chat_id = $1 AND is_active = TRUE LIMIT 1`,
            [envChatId]
          );
          if (subscriber && subscriber.length > 0 && subscriber[0].alert_symbol) {
            primaryFilter = subscriber[0].alert_symbol;
          }
        } catch (err) {
          console.warn("Failed to fetch subscriber filter, using env variable:", err);
        }

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

        // 1. บันทึก Actionable AI Signals ลงฐานข้อมูล และส่งแจ้งเตือน Telegram (AWAITED ป้องกัน Serverless kill)
        if (scanResult.actionableAnalyses && scanResult.actionableAnalyses.length > 0) {
          await Promise.allSettled(
            scanResult.actionableAnalyses.map(async (analysis) => {
              // ตรวจสอบ Throttle เพื่อป้องกันการส่งซ้ำ
              const throttleKey = `${analysis.symbol}_${analysis.signal}_${analysis.tradeSetup?.orderType}`;
              const now = Date.now();
              const lastSent = actionableAlertThrottle.get(throttleKey) || 0;

              // บันทึกลงฐานข้อมูลแบบ Smart Deduplication
              const saveRes: SaveAiSignalResult = await saveAiSignal(analysis).catch((err) => {
                console.warn("Could not save signal to DB:", err);
                return { saved: false };
              });

              // ส่ง Telegram ถ้าเป็นสัญญาณใหม่ หรือผ่าน Cooldown มาแล้ว
              if ((saveRes.saved || now - lastSent >= ACTIONABLE_COOLDOWN_MS) && now - lastSent >= ACTIONABLE_COOLDOWN_MS) {
                actionableAlertThrottle.set(throttleKey, now);

                // ── Auto-delete: ลบข้อความสัญญาณเก่าของคู่นี้ทิ้งเมื่อมีสัญญาณใหม่เข้ามาแทน ──
                if (saveRes.saved && saveRes.previousMessages && Array.isArray(saveRes.previousMessages)) {
                  for (const prev of saveRes.previousMessages) {
                    if (prev.chatId && prev.messageId) {
                      deleteTelegramMessage({ botToken, chatId: prev.chatId, messageId: prev.messageId }).catch(() => {});
                    }
                  }
                }

                // ── Auto-delete: ลบข้อความเรดาร์ล่วงหน้า (Pre-Warning) เดิมของคู่นี้ทิ้ง เพราะมีจุดเข้าจริงแล้ว ──
                const prevPreWarning = preWarningMessagesMap.get(analysis.symbol);
                if (prevPreWarning) {
                  for (const prev of prevPreWarning) {
                    deleteTelegramMessage({ botToken, chatId: prev.chatId, messageId: prev.messageId }).catch(() => {});
                  }
                  preWarningMessagesMap.delete(analysis.symbol);
                }

                if (botToken && DEFAULT_PILOT_CONFIG.autoDispatchTelegram && subscribersMap.size > 0) {
                  const sentMessages: Array<{ chatId: string; messageId: number }> = [];
                  const sendPromises: Promise<unknown>[] = [];

                  subscribersMap.forEach((filter, targetChatId) => {
                    if (isSymbolAllowedForAlert(analysis.symbol, filter)) {
                      sendPromises.push(
                        sendTelegramMessage({ botToken, chatId: targetChatId, analysis })
                          .then((res) => {
                            if (res.success && res.messageId) {
                              sentMessages.push({ chatId: targetChatId, messageId: res.messageId });
                            }
                          })
                          .catch((e) => {
                            console.warn(`Failed to dispatch alert to ${targetChatId}:`, e);
                          })
                      );
                    }
                  });

                  await Promise.allSettled(sendPromises);

                  // บันทึก Message ID ลงใน DB เพื่อให้ลบทิ้งอัตโนมัติได้เมื่อออเดอร์ชน TP/SL
                  if (saveRes.signalId && sentMessages.length > 0) {
                    await updateSignalTelegramMessages(saveRes.signalId, sentMessages);
                  }
                }
              }
            })
          );
        }

        // 2. ส่งการแจ้งเตือนเตือนล่วงหน้า (Pre-Warning Radar Alert 15-30 นาที) (AWAITED ป้องกัน Serverless kill)
        if (scanResult.preWarningAnalyses && scanResult.preWarningAnalyses.length > 0) {
          await Promise.allSettled(
            scanResult.preWarningAnalyses.map(async (analysis) => {
              const now = Date.now();
              const lastAlert = preWarningAlertThrottle.get(analysis.symbol) || 0;
              if (now - lastAlert >= PRE_WARNING_COOLDOWN_MS) {
                preWarningAlertThrottle.set(analysis.symbol, now);

                // ── Auto-delete: ลบข้อความเรดาร์ล่วงหน้าอันเก่าของคู่นี้ทิ้ง ก่อนส่งอันใหม่ ──
                const prevPreWarning = preWarningMessagesMap.get(analysis.symbol);
                if (prevPreWarning) {
                  for (const prev of prevPreWarning) {
                    deleteTelegramMessage({ botToken, chatId: prev.chatId, messageId: prev.messageId }).catch(() => {});
                  }
                }

                if (botToken && DEFAULT_PILOT_CONFIG.autoDispatchTelegram && subscribersMap.size > 0) {
                  const sentPreWarnings: Array<{ chatId: string; messageId: number }> = [];
                  const sendPromises: Promise<unknown>[] = [];

                  subscribersMap.forEach((filter, targetChatId) => {
                    if (isSymbolAllowedForAlert(analysis.symbol, filter)) {
                      sendPromises.push(
                        sendTelegramMessage({ botToken, chatId: targetChatId, analysis, isPreWarning: true })
                          .then((res) => {
                            if (res.success && res.messageId) {
                              sentPreWarnings.push({ chatId: targetChatId, messageId: res.messageId });
                            }
                          })
                          .catch((e) => {
                            console.warn(`Failed to dispatch pre-warning to ${targetChatId}:`, e);
                          })
                      );
                    }
                  });

                  await Promise.allSettled(sendPromises);

                  if (sentPreWarnings.length > 0) {
                    preWarningMessagesMap.set(analysis.symbol, sentPreWarnings);
                  }
                }
              }
            })
          );
        }

        // 3. ตรวจสอบสถานะออเดอร์ที่เปิดค้างไว้ (ACTIVE / HIT_TP1) กับราคาตลาดล่าสุด (AWAITED เพื่อส่ง Order Result และลบ Alert เก่า)
        if (scanResult.summaries && scanResult.summaries.length > 0) {
          await Promise.allSettled(
            scanResult.summaries.map((s) => resolveOpenSignals(s.symbol, s.price))
          );
        }
      }
    } else {
      // Read-only request: ส่งข้อมูลจาก In-Memory Cache เพื่อประหยัด CPU 100%
      const cached = getScannerCache();
      if (cached) {
        scanResult = { ...cached, cached: true };
      } else {
        // หาก Cache ยังว่างเปล่า (เช่น เพิ่ง Cold Start) ทำการ scan ครั้งแรก 1 ครั้ง
        scanResult = await scanWatchlistAutonomous(DEFAULT_PILOT_CONFIG, false);
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
        cached: Boolean(scanResult?.cached),
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
