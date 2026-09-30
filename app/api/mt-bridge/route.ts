import { NextRequest, NextResponse } from "next/server";
import {
  getActiveBridgeOrders,
  addTelemetryLog,
  resolveOrdersAgainstLivePrice,
  syncBridgeOrderEvent,
  scanWatchlistAutonomous,
  DEFAULT_PILOT_CONFIG,
} from "@/lib/autonomousEngine";
import { validatePriceIntegrity, validateSpreadSafety } from "@/lib/priceIntegrity";
import { sendTelegramMessage } from "@/lib/telegramService";
import { getNewsSafetyShieldStatus, calculateMacroDirectionalInsight } from "@/lib/calendarEngine";

export const dynamic = "force-dynamic";

/**
 * Normalizes broker-specific symbol names (e.g. XAUUSDm, XAUUSD.a, GOLD, EURUSDmicro)
 * to internal unified canonical symbols.
 */
function normalizeSymbol(raw?: string): string | undefined {
  if (!raw) return undefined;
  const s = raw.toUpperCase().trim();
  if (s.includes("XAU") || s.includes("GOLD")) return "XAUUSD";
  if (s.includes("BTC")) return "BTCUSDT";
  if (s.includes("ETH")) return "ETHUSDT";
  if (s.includes("OIL") || s.includes("WTI")) return "USOIL";
  if (s.includes("SPY") || s.includes("US500") || s.includes("SPX")) return "SPY";

  const forexRoots = ["EURUSD", "GBPUSD", "USDJPY", "AUDUSD", "NZDUSD", "USDCAD", "USDCHF", "EURJPY", "GBPJPY"];
  for (const root of forexRoots) {
    if (s.startsWith(root)) return root;
  }
  return s;
}

let lastBridgeScanTime = 0;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const format = searchParams.get("format");
    const rawSymbol = searchParams.get("symbol") || undefined;
    const symbol = normalizeSymbol(rawSymbol);
    const currentSpread = parseFloat(searchParams.get("spread") || "0");
    const brokerBid = parseFloat(searchParams.get("bid") || "0");
    const brokerAsk = parseFloat(searchParams.get("ask") || "0");

    if (symbol && currentSpread > 0) {
      const spreadCheck = validateSpreadSafety(symbol, currentSpread);
      if (!spreadCheck.isSafe) {
        addTelemetryLog(symbol, "VETO", `🛑 [Broker Spread Blowout] ${spreadCheck.warning}`);
        if (format === "csv" || format === "mt") {
          return new NextResponse(`// SPREAD_BLOWOUT: ${spreadCheck.warning}`, {
            status: 200,
            headers: { "Content-Type": "text/plain", "Cache-Control": "no-store" },
          });
        }
        return NextResponse.json(
          {
            success: true,
            count: 0,
            orders: [],
            spreadSafety: spreadCheck,
            warning: spreadCheck.warning,
            timestamp: Date.now(),
          },
          { headers: { "Cache-Control": "no-store" } }
        );
      }
    }

    // Broker Quote Integrity & Offset Shield (Pillar 4)
    if (symbol && brokerBid > 0) {
      const integrityCheck = validatePriceIntegrity(symbol, brokerBid);
      if (!integrityCheck.isValid) {
        addTelemetryLog(symbol, "VETO", `🛑 [Broker Feed Anomaly] ${integrityCheck.reason}`);
        if (format === "csv" || format === "mt") {
          return new NextResponse(`// BROKER_QUOTE_ANOMALY: ${integrityCheck.reason}`, {
            status: 200,
            headers: { "Content-Type": "text/plain", "Cache-Control": "no-store" },
          });
        }
      } else {
        // Resolve orders against genuine real-time broker bid price
        resolveOrdersAgainstLivePrice(symbol, brokerBid);
      }
    }

    const isMulti = searchParams.get("multi") === "true" || rawSymbol === "ALL";
    const targetSymbol = isMulti ? undefined : symbol;

    let orders = getActiveBridgeOrders(targetSymbol);

    // Auto-Trigger Background Scan if registry has no orders and last scan > 30s
    const now = Date.now();
    if (orders.length === 0 && targetSymbol && now - lastBridgeScanTime > 30000) {
      lastBridgeScanTime = now;
      scanWatchlistAutonomous(DEFAULT_PILOT_CONFIG).catch(() => {});
      orders = getActiveBridgeOrders(targetSymbol);
    }

    if (format === "csv" || format === "mt") {
      // News Safety Shield Header Line:
      // #NEWS,MINUTES_TO_NEXT,STATE,TITLE,TRADE_ALLOWED,TIME_STR
      const newsSafety = getNewsSafetyShieldStatus(symbol || "XAUUSD");
      const newsCleanTitle = (newsSafety.nextHighImpactEvent?.title || "NONE")
        .replace(/,/g, " ")
        .replace(/[🔴🟠🟡⚪]/g, "")
        .trim();
      const newsLine = `#NEWS,${newsSafety.minutesToNextEvent ?? -999},${newsSafety.state},${newsCleanTitle},${newsSafety.tradeAllowed ? 1 : 0},${newsSafety.nextHighImpactEvent?.timeStr || "--:--"}`;

      // Macro Directional & Reaction Zone Header Line:
      // #MACRO,SYMBOL,BIAS,ZONE_HIGH,ZONE_LOW,ZONE_MID,SENTIMENT,EVENT_TITLE
      const macroInsight = calculateMacroDirectionalInsight(symbol || "XAUUSD");
      const macroCleanTitle = (macroInsight.eventTitle || "NONE")
        .replace(/,/g, " ")
        .replace(/[🔴🟠🟡⚪]/g, "")
        .trim();
      const macroLine = `#MACRO,${symbol || "XAUUSD"},${macroInsight.assetDirectionalBias},${macroInsight.reactionZone?.zoneHigh || 0},${macroInsight.reactionZone?.zoneLow || 0},${macroInsight.reactionZone?.zoneMid || 0},${macroInsight.usdSentiment},${macroCleanTitle}`;

      // Format for MT4/MT5 EA line parser:
      // TICKET_ID,SYMBOL,TYPE,PRICE,SL,TP1,TP2,LOTS,REMAINING_LOTS,STATUS,TRAILING_SL,DEFENSE,TIER,GOVERNOR
      const executableOrders = orders.filter((o) => o.status !== "PENDING_HUMAN_APPROVAL" && o.status !== "CANCELLED");
      const orderLines = executableOrders.map(
        (o) =>
          `${o.id},${o.symbol},${o.orderType},${o.price},${o.stopLoss},${o.takeProfit1},${o.takeProfit2},${o.lotSize},${o.remainingLots ?? o.lotSize},${o.status},${o.trailingSlPrice ?? o.stopLoss},${o.emergencyDefenseReason ?? "NONE"},${o.tierName ?? "Tier 1"},${o.drawdownGovernorActive ? "GOVERNOR_ACTIVE" : "NORMAL"}`
      );
      const lines = [newsLine, macroLine, ...orderLines];
      return new NextResponse(lines.join("\n"), {
        status: 200,
        headers: {
          "Content-Type": "text/plain",
          "Cache-Control": "no-store",
        },
      });
    }

    const macroInsight = calculateMacroDirectionalInsight(symbol || "XAUUSD");

    return NextResponse.json(
      {
        success: true,
        count: orders.length,
        orders,
        macroInsight,
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

    let syncResult: { success: boolean; error?: string } | undefined;
    if (orderId && action) {
      syncResult = syncBridgeOrderEvent(orderId, action, executionPrice, profitPips);
    }

    // ─── [MT5 Circuit Breaker & Emergency Handlers] ───
    if (action === "DAILY_LOSS_LIMIT") {
      const lossText = profitPips ? `${Number(profitPips).toFixed(1)}%` : "4.0%";
      addTelemetryLog(
        symbol || "MT5",
        "VETO",
        `🚨 [MT5 EA CIRCUIT BREAKER] แตะขีดจำกัดขาดทุนรายวัน (-${lossText})! EA ปิดทุกไม้และล็อกการเทรดของวันเพื่อปกป้องพอร์ต`
      );
      // Dispatch emergency Telegram notification to subscribers
      sendTelegramMessage({
        rawHtml: true,
        message: `🚨 <b>[AEGIS MT5: CIRCUIT BREAKER ACTIVATED]</b>\n\n⚠️ <b>ขีดจำกัดขาดทุนรายวันทำงาน!</b>\nสินทรัพย์: <b>${symbol || "ALL"}</b>\nระดับความเสี่ยง: <b>-${lossText}</b> (แตะเพดาน Max Daily Loss)\n\n🛡️ <b>การกระทำของ EA:</b> สั่งปิดออเดอร์ทั้งหมด ยกเลิกคำสั่งรอ และล็อกการเทรดอัตโนมัติจนกว่าจะขึ้นวันใหม่\n💰 <i>เงินทุนปลอดภัย ไม่ล้างพอร์ต รักษาวินัยตามหลักสถาบัน</i>`,
      }).catch((err) => console.error("Telegram daily loss alert error:", err));
    } else if (action === "DAILY_PROFIT_LOCKED") {
      const gainText = profitPips ? `${Number(profitPips).toFixed(1)}%` : "Target";
      addTelemetryLog(
        symbol || "MT5",
        "RESOLVE",
        `🛡️ [MT5 EA TRAILING PROFIT LOCK] ล็อคกำไรรายวัน (+${gainText})! EA สั่งปิดทุกไม้และล็อคผลกำไรวันนี้เรียบร้อย`
      );
    }

    if (symbol && executionPrice) {
      const integrity = validatePriceIntegrity(symbol, executionPrice);
      if (integrity.isValid) {
        resolveOrdersAgainstLivePrice(symbol, executionPrice);
      }
    }

    return NextResponse.json({
      success: true,
      message: "MT Bridge event recorded and state synchronized",
      syncResult,
    });
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : "MT Bridge post failed";
    return NextResponse.json({ success: false, error: errMsg }, { status: 500 });
  }
}
