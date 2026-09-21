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
  getTelegramSubscribers,
  getScannerCacheFromDb,
  saveScannerCacheToDb,
} from "@/lib/db";
import {
  sendTelegramMessage,
  deleteTelegramMessage,
  isSymbolAllowedForAlert,
  DEFAULT_TELEGRAM_BOT_TOKEN,
  DEFAULT_TELEGRAM_CHAT_ID,
} from "@/lib/telegramService";

import { LRUCache } from "@/lib/cache";
import { AnalysisResult } from "@/lib/types";

export const dynamic = "force-dynamic";

type ScanResultType = Awaited<ReturnType<typeof scanWatchlistAutonomous>>;

// Use LRUCache (TTL + maxSize) instead of plain Maps to prevent unbounded memory growth
// in long-running warm Serverless instances. TTL = cooldown + buffer to auto-evict.
const preWarningAlertThrottle = new LRUCache<string, number>({ maxSize: 100, defaultTtlMs: 35 * 60 * 1000 });
const PRE_WARNING_COOLDOWN_MS = 25 * 60 * 1000; // 25 minutes cooldown per asset
const actionableAlertThrottle = new LRUCache<string, number>({ maxSize: 200, defaultTtlMs: 25 * 60 * 1000 });
const ACTIONABLE_COOLDOWN_MS = 20 * 60 * 1000; // 20 minutes cooldown per asset setup
const preWarningMessagesMap = new LRUCache<string, Array<{ chatId: string; messageId: number }>>({ maxSize: 100, defaultTtlMs: 35 * 60 * 1000 });

// Concurrency mutex to coalesce simultaneous scan requests into a single execution
let _activeScanPromise: Promise<ScanResultType> | null = null;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const hasScanParam = searchParams.get("scan") === "true" || searchParams.get("scan") === "1";
    const isCronHeader = Boolean(request.headers.get("x-cron") || request.headers.get("x-vercel-cron"));
    const isForce = searchParams.get("force") === "true";
    const triggerScan = hasScanParam || isCronHeader;

    let scanResult: ScanResultType | null = null;
    if (triggerScan) {
      // 1. If not force, check in-memory cache first
      const memCache = !isForce ? getScannerCache() : null;
      if (memCache) {
        scanResult = { ...memCache, cached: true };
      } else if (!isForce) {
        // 2. Check Neon DB persistent cache (shared across cold serverless instances)
        const dbCache = await getScannerCacheFromDb<ScanResultType>(3 * 60 * 1000);
        if (dbCache && dbCache.payload) {
          scanResult = { ...dbCache.payload, cached: true };
        }
      }

      // 3. Only run physical scan if no valid cache exists
      if (!scanResult) {
        if (!_activeScanPromise) {
          _activeScanPromise = scanWatchlistAutonomous(DEFAULT_PILOT_CONFIG, isForce).finally(() => {
            _activeScanPromise = null;
          });
        }
        scanResult = await _activeScanPromise;

        // Persist fresh scan results to Neon DB for other serverless instances
        if (scanResult && !scanResult.cached) {
          saveScannerCacheToDb(scanResult).catch(() => {});
        }
      }

      // Only dispatch alerts and update DB on fresh scans (not cached within 3-min TTL)
      if (!scanResult.cached) {
        const botToken = process.env.TELEGRAM_BOT_TOKEN || DEFAULT_TELEGRAM_BOT_TOKEN;
        const envChatId = process.env.TELEGRAM_CHAT_ID || DEFAULT_TELEGRAM_CHAT_ID;

        // ดึงค่า filter จาก environment variable เป็น default สำหรับ primary chat (เริ่มต้นเฉพาะทองคำ XAUUSD เพื่อความปลอดภัยสูงสุด)
        const primaryFilter = process.env.TELEGRAM_ALERT_SYMBOLS || "XAUUSD";

        // รวบรวมรายชื่อผู้รับการแจ้งเตือนทั้งหมดจาก cached subscriber list (5-min TTL)
        const allSubs = await getTelegramSubscribers();
        const subscribersMap = new Map<string, string>();
        if (envChatId) {
          // Use the subscriber's own filter from DB if found, else fall back to env primary filter
          const envSub = allSubs.find((s) => s.chat_id === envChatId);
          subscribersMap.set(envChatId, envSub?.alert_symbol || primaryFilter);
        }
        for (const sub of allSubs) {
          subscribersMap.set(sub.chat_id, sub.alert_symbol || "XAUUSD");
        }

        // 1. บันทึก Actionable AI Signals ลงฐานข้อมูล และส่งแจ้งเตือน Telegram (AWAITED ป้องกัน Serverless kill)
        if (scanResult.actionableAnalyses && scanResult.actionableAnalyses.length > 0) {
          // เรียงลำดับตามคะแนนความแม่นยำสูงสุดก่อนเสมอ
          const sortedAnalyses = [...scanResult.actionableAnalyses].sort(
            (a, b) => (b.confidence ?? 0) - (a.confidence ?? 0)
          );

          await Promise.allSettled(
            sortedAnalyses.map(async (analysis: AnalysisResult, idx: number) => {
              // ตรวจสอบ Throttle เพื่อป้องกันการส่งซ้ำ
              const throttleKey = `${analysis.symbol}_${analysis.signal}_${analysis.tradeSetup?.orderType}`;
              const now = Date.now();
              const lastSent = actionableAlertThrottle.get(throttleKey) || 0;

              // บันทึกลงฐานข้อมูลแบบ Smart Deduplication (บันทึกทุกคู่เพื่อสถิติใน Dashboard)
              const saveRes: SaveAiSignalResult = await saveAiSignal(analysis).catch((err) => {
                console.warn("Could not save signal to DB:", err);
                return { saved: false };
              });

              // Anti-Flood Guard: ในแต่ละรอบสแกน ส่งแจ้งเตือน Telegram สูงสุด 1 คู่ (คู่ที่คะแนนสูงสุด)
              // เพื่อป้องกันการยิงหลายคู่พร้อมกันจนบัญชี Telegram โดนระงับ
              if (idx > 0) return;

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
            scanResult.preWarningAnalyses.map(async (analysis: AnalysisResult) => {
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
      // Read-only request: prioritize caches (In-Memory -> Neon DB -> Safe single scan fallback)
      const cached = getScannerCache();
      if (cached) {
        scanResult = { ...cached, cached: true };
      } else {
        // Check Neon DB persistent cache (shared across cold serverless instances)
        const dbCache = await getScannerCacheFromDb<ScanResultType>(5 * 60 * 1000);
        if (dbCache && dbCache.payload) {
          scanResult = { ...dbCache.payload, cached: true };
        } else {
          // If DB is completely empty (e.g. initial setup), run initial scan with concurrency lock
          if (!_activeScanPromise) {
            _activeScanPromise = scanWatchlistAutonomous(DEFAULT_PILOT_CONFIG, false).finally(() => {
              _activeScanPromise = null;
            });
          }
          scanResult = await _activeScanPromise;
          if (scanResult && !scanResult.cached) {
            saveScannerCacheToDb(scanResult).catch(() => {});
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
        cached: Boolean(scanResult?.cached),
        timestamp: Date.now(),
      },
      {
        headers: {
          // Vercel Global Edge Cache: 30s Edge freshness + 60s background SWR
          // Prevents waking up Serverless Function CPU on redundant hits
          "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60",
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
