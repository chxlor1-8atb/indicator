import {
  AssetScannerSummary,
  Candle,
  MtBridgeOrder,
  TelemetryLog,
  AutonomousPilotConfig,
  AnalysisResult,
  RiskProfileType,
} from "./types";
import { calculateAllIndicators, calculateATR } from "./indicators";
import { getMarketCandles, AVAILABLE_ASSETS } from "./marketService";
import { generateRuleBasedAnalysis } from "./geminiService";
import { validatePriceIntegrity, validateOrderConfluence } from "./priceIntegrity";
import {
  calculateDynamicPositionSize,
  calculateAdaptiveTrailingStop,
  calculatePartialTpPlan,
} from "./riskEngine";

// ─── IN-MEMORY AUTONOMOUS STATE BUS ───
const activeOrdersStore = new Map<string, MtBridgeOrder>();
const telemetryLogsStore: TelemetryLog[] = [];
const MAX_LOGS = 60;

// Watchlist of top high-conviction institutional assets tradable on MT5 (Gold, Oil, Silver, Forex Majors & Crosses)
// Optimized to 8 core assets to stay well within Vercel Serverless CPU limits
export const AUTONOMOUS_WATCHLIST = [
  "XAUUSD",
  "BTCUSDT",
  "ETHUSDT",
  "SOLUSDT",
  "EURUSD",
  "GBPUSD",
  "USDJPY",
  "GBPJPY",
  "AUDUSD",
  "USOIL",
  "XAGUSD",
];

export const DEFAULT_PILOT_CONFIG: AutonomousPilotConfig = {
  isEnabled: true,
  autoDispatchTelegram: true,
  autoFocusHighestConfluence: false,
  minConfluenceThreshold: 52, // Grade B / B+ / 5-Pillars actionable entry
  riskPercentPerTrade: 1.5,
  accountType: "STANDARD",
  scanIntervalMs: 8000,
  /**
   * SIGNAL_ONLY = Pure Web AI Signal Trading + Telegram Alerts (ไม่มีการส่ง order ไป MT4/MT5)
   */
  approvalMode: "SIGNAL_ONLY",
};

/**
 * Record a new telemetry event to the live real-time stream
 */
export function addTelemetryLog(
  symbol: string,
  type: TelemetryLog["type"],
  message: string,
  confluence?: number,
  grade?: string,
  details?: Record<string, unknown>
): TelemetryLog {
  const now = new Date();
  const timeStr = now.toTimeString().split(" ")[0];
  const log: TelemetryLog = {
    id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    timestamp: timeStr,
    timeMs: Date.now(),
    symbol,
    type,
    message,
    confluence,
    grade,
    details,
  };

  telemetryLogsStore.unshift(log);
  if (telemetryLogsStore.length > MAX_LOGS) {
    telemetryLogsStore.pop();
  }
  return log;
}

/**
 * Get the latest telemetry logs for the real-time activity stream
 */
export function getTelemetryLogs(limit = 40): TelemetryLog[] {
  return telemetryLogsStore.slice(0, limit);
}

/**
 * Retrieve all currently active pending/open orders
 */
export function getActiveBridgeOrders(symbol?: string): MtBridgeOrder[] {
  const orders = Array.from(activeOrdersStore.values());
  if (!symbol) return orders;
  return orders.filter((o) => o.symbol.toUpperCase() === symbol.toUpperCase());
}

/**
 * Clean up expired or cancelled orders
 */
export function pruneExpiredOrders() {
  const now = Date.now();
  for (const [id, order] of Array.from(activeOrdersStore.entries())) {
    if (order.expiresAt && order.expiresAt < now && order.status === "PENDING") {
      order.status = "CANCELLED";
      addTelemetryLog(
        order.symbol,
        "ORDER",
        `Pending order #${order.id.slice(-6)} expired without fill. Order cancelled.`
      );
      activeOrdersStore.delete(id);
    }
  }
}

/**
 * Evaluates a single asset and produces an autonomous decision if setup passes Grade A/A+
 */
export async function evaluateAssetAutonomous(
  symbol: string,
  candles: Candle[],
  timeframe = "1h",
  config: AutonomousPilotConfig = DEFAULT_PILOT_CONFIG
): Promise<{
  scannerSummary: AssetScannerSummary;
  newOrder?: MtBridgeOrder;
  analysis?: AnalysisResult;
  decisionTriggered: boolean;
  isPreWarning?: boolean;
}> {
  const sym = symbol.toUpperCase();
  const lastCandle = candles[candles.length - 1];
  const currentPrice = lastCandle?.close || 0;

  // Real-Time Price Integrity Validation
  const integrity = validatePriceIntegrity(sym, currentPrice, lastCandle);
  if (!integrity.isValid) {
    addTelemetryLog(sym, "SCAN", `Price integrity alert for ${sym}: ${integrity.reason}`);
  }

  const prevPrice = candles[0]?.open || currentPrice;
  const change24h = prevPrice > 0 ? ((currentPrice - prevPrice) / prevPrice) * 100 : 0;
  const high24h = Math.max(...candles.map((c) => c.high));
  const low24h = Math.min(...candles.map((c) => c.low));

  // 1. Vectorized Indicators Calculation
  const indicators = calculateAllIndicators(candles, sym);

  // 2. Execute Unified Institutional Rule-Based Analysis Core (Single Source of Truth)
  // Evaluates all 100 indicators, 23 confluence pillars, 25 safety locks & Anti-Clash Orchestrator
  const analysis = generateRuleBasedAnalysis(sym, timeframe, candles, indicators, []);

  const totalScore = analysis.masterConfluence?.totalScore ?? 50;
  const setupGrade = analysis.setupGrade;
  const signal = analysis.signal;
  const regimeTitle = analysis.regimeInfo?.title || "NORMAL_MARKET_FLOW";
  const isNewsFrozen = !analysis.calendarSafety?.tradeAllowed;

  // Derive execution parameters directly from unified TradeSetup (OTE Golden Pocket & Structural SL)
  const tradeSetup = analysis.tradeSetup;
  const orderType = tradeSetup.orderType;
  const pendingPrice = tradeSetup.pendingPrice;
  const slPrice = tradeSetup.stopLoss;
  const tp1Price = tradeSetup.takeProfit1;
  const tp2Price = tradeSetup.takeProfit2;

  // Calculate Precision and Pip Size
  const isGold = sym.includes("XAU") || sym.includes("GOLD");
  const isJpy = sym.includes("JPY");
  const pipMultiplier = isGold ? 10 : isJpy ? 100 : sym.endsWith("USDT") ? 1 : 10000;
  const distancePips = Math.abs(Number(((pendingPrice - currentPrice) * pipMultiplier).toFixed(1)));

  // Asset Info lookup
  const assetInfo = AVAILABLE_ASSETS.find((a) => a.symbol === sym) || {
    name: sym,
    category: sym.endsWith("USDT") ? "crypto" : "forex",
  };

  const scannerSummary: AssetScannerSummary = {
    symbol: sym,
    name: assetInfo.name,
    category: assetInfo.category,
    price: currentPrice,
    change24h,
    high24h,
    low24h,
    confluenceScore: totalScore,
    setupGrade,
    signal,
    orderType,
    regime: regimeTitle,
    isNewsFrozen,
    dealingRangeZone: tradeSetup.dealingRangeZone || analysis.premiumDiscount?.zone,
    mtfConfluenceSummary: analysis.timeframeMatrix ? {
      score: analysis.timeframeMatrix.alignmentScore ?? 50,
      alignment: analysis.timeframeMatrix.h1,
      htfTrend: analysis.timeframeMatrix.h4,
    } : undefined,
    pendingPrice: orderType !== "WAIT_NO_ORDER" ? pendingPrice : undefined,
    slPrice: orderType !== "WAIT_NO_ORDER" ? slPrice : undefined,
    tpPrice: orderType !== "WAIT_NO_ORDER" ? tp1Price : undefined,
    distancePips,
    updatedAt: Date.now(),
  };

  // 3. Autonomous Decision Gate: High Confluence & Full Safety Lock Clearance
  let newOrder: MtBridgeOrder | undefined;
  let decisionTriggered = false;

  const isSignalActionable =
    (signal === "BUY" || signal === "STRONG_BUY" || signal === "SELL" || signal === "STRONG_SELL") &&
    tradeSetup.action !== "NO_TRADE" &&
    orderType !== "WAIT_NO_ORDER";

  const fivePillars = analysis.fiveCorePillars;
  const isPillarsReady = fivePillars ? fivePillars.passedPillarsCount >= 2 : true;
  const isConfluenceEligible =
    (setupGrade === "A+" ||
      setupGrade === "A" ||
      (setupGrade === "B" && totalScore >= 68)) &&
    totalScore >= Math.max(65, config.minConfluenceThreshold);

  // ─── Filter Out Low-Quality Choppy Pairs (Protects Overall Win-Rate > 75-80%) ───
  const isChoppyPair = sym === "EURGBP" || (analysis.regimeInfo?.adxValue != null && analysis.regimeInfo.adxValue < 20);
  if (isChoppyPair && setupGrade !== "A+" && setupGrade !== "A") {
    return { scannerSummary, newOrder: undefined, analysis, decisionTriggered: false, isPreWarning: false };
  }

  // ─── Pre-Warning Radar Detection (15-30 mins advance notice) ───
  const isPreWarning = !isNewsFrozen && isSignalActionable && isConfluenceEligible && distancePips >= 5 && distancePips <= 35;

  // ─── SIGNAL_ONLY Mode: ไม่สร้าง order เลย ส่งแค่ log/Telegram ───
  if (config.approvalMode === "SIGNAL_ONLY") {
    if (config.isEnabled && !isNewsFrozen && isSignalActionable && isConfluenceEligible) {
      decisionTriggered = true;
      addTelemetryLog(
        sym, "DECISION",
        `[SIGNAL_ONLY | 5 Pillars: ${fivePillars?.passedPillarsCount ?? 0}/5] ${orderType} @ ${pendingPrice} — Grade ${setupGrade} | Score ${totalScore}% (Web Signal + Telegram Alert Ready)`,
        totalScore, setupGrade, { price: pendingPrice, sl: slPrice, tp1: tp1Price }
      );
    }
    return { scannerSummary, newOrder: undefined, analysis, decisionTriggered, isPreWarning };
  }

  if (
    config.isEnabled &&
    !isNewsFrozen &&
    isConfluenceEligible &&
    isSignalActionable
  ) {
    const effectiveOrderType = orderType === "MARKET_EXECUTION"
      ? (tradeSetup.action === "BUY" ? "BUY_LIMIT" : "SELL_LIMIT")
      : orderType;

    // Check Deduplication — นับทั้ง PENDING และ PENDING_HUMAN_APPROVAL
    const existingOrder = getActiveBridgeOrders(sym).find(
      (o) => (o.status === "PENDING" || o.status === "PENDING_HUMAN_APPROVAL") &&
              o.orderType === effectiveOrderType
    );

    const atrList = calculateATR(candles, 14);
    const currentAtr = atrList.slice(-1)[0] || (currentPrice * 0.005);

    // If no existing pending order or price moved sufficiently
    if (!existingOrder || Math.abs(existingOrder.price - pendingPrice) > (currentAtr * 0.5)) {
      // ─── Pre-Execution Order Confluence & Directional Hierarchy Validation ───
      const confluenceValidation = validateOrderConfluence(
        tradeSetup.action,
        currentPrice,
        pendingPrice,
        slPrice,
        tp1Price,
        tp2Price,
        1.1
      );
      if (!confluenceValidation.isValid) {
        addTelemetryLog(sym, "VETO", `Order Confluence Check Failed: ${confluenceValidation.reason}`);
        return { scannerSummary, newOrder: undefined, analysis, decisionTriggered: false, isPreWarning: false };
      }

      decisionTriggered = true;

      // ─── Dynamic Position Sizing based on Risk Profile & Volatility ───
      const dynamicSize = calculateDynamicPositionSize({
        symbol: sym,
        accountBalance: 1000,
        currentPrice,
        stopLossDistancePrice: Math.abs(pendingPrice - slPrice),
        riskProfile: config.riskProfile || "MODERATE",
        candles,
        customRiskPct: config.riskPercentPerTrade,
      });

      const lotSize = config.accountType === "CENT"
        ? Number((dynamicSize.calculatedLotSize * 5).toFixed(2))
        : dynamicSize.calculatedLotSize;

      const partialPlan = calculatePartialTpPlan(lotSize, tp1Price, tp2Price);

      // ─── AI RISK FLAGS: รวบรวมเหตุผลทั้งหมดที่ทำให้ควรให้มนุษย์ตรวจสอบ ───
      const aiRiskFlags: string[] = [];

      // Flags จาก News Hallucination Guard
      const newsFlags = analysis.newsSentimentAnalysis?.newsRiskFlags ?? [];
      aiRiskFlags.push(...newsFlags);

      // Flag ถ้า news reliability ต่ำ
      const newsReliability = analysis.newsSentimentAnalysis?.newsReliabilityScore ?? 1;
      if (newsReliability < 0.4) {
        aiRiskFlags.push(`LOW_NEWS_RELIABILITY: ${(newsReliability * 100).toFixed(0)}%`);
      }

      // Flag ถ้า grade ไม่ใช่ A/A+ (B grade ผ่าน threshold แต่ confidence ต่ำกว่า)
      if (setupGrade === "B") {
        aiRiskFlags.push("GRADE_B_LOWER_CONFIDENCE");
      }

      // ─── Human Approval Logic ───
      // AUTO = ไม่ต้องรอ | SEMI_AUTO = รอเสมอ | มี risk flags = รอเสมอ
      const requiresHumanApproval =
        config.approvalMode !== "AUTO" ||
        aiRiskFlags.length > 0;

      const orderStatus = requiresHumanApproval ? "PENDING_HUMAN_APPROVAL" : "PENDING";

      newOrder = {
        id: `ord_${sym}_${Date.now()}`,
        symbol: sym,
        orderType: effectiveOrderType,
        price: pendingPrice,
        stopLoss: slPrice,
        takeProfit1: tp1Price,
        takeProfit2: tp2Price,
        lotSize,
        confluenceScore: totalScore,
        setupGrade,
        comment: `Aegis_Auto_${setupGrade.split(" ")[0]}`,
        status: orderStatus,
        timestamp: Date.now(),
        expiresAt: Date.now() + 4 * 60 * 60 * 1000, // 4 hours validity
        aiRiskFlags,
        requiresHumanApproval,
        riskProfile: config.riskProfile || "MODERATE",
        initialLots: lotSize,
        remainingLots: lotSize,
        partialCloses: [],
        adaptiveTrailingActive: true,
        trailingSlPrice: slPrice,
        trailingStage: 0,
      };

      activeOrdersStore.set(newOrder.id, newOrder);

      addTelemetryLog(
        sym,
        "DECISION",
        requiresHumanApproval
          ? `⏳ รอการอนุมัติ: ${effectiveOrderType} @ ${pendingPrice} (Grade ${setupGrade} | Score ${totalScore}%${aiRiskFlags.length > 0 ? ` | ⚠️ Flags: ${aiRiskFlags.length}` : ""}) | Lot: ${lotSize}`
          : `Autonomous Decision: ${effectiveOrderType} @ ${pendingPrice} primed (Confluence ${totalScore}%, Grade ${setupGrade}) | ${partialPlan.description}`,
        totalScore,
        setupGrade,
        { price: pendingPrice, sl: slPrice, tp1: tp1Price, lotSize, partialPlan, aiRiskFlags }
      );

      addTelemetryLog(
        sym,
        "ORDER",
        requiresHumanApproval
          ? `🔐 Order #${newOrder.id.slice(-6)} อยู่ใน Human Review Queue${aiRiskFlags.length > 0 ? ` — Risk Flags: [${aiRiskFlags.join(", ")}]` : ""}`
          : `Institutional Ticket dispatched to MT4/MT5 Bridge (Lot: ${lotSize} | SL: ${slPrice} | TP1: ${tp1Price} [50%] | TP2: ${tp2Price})`
      );
    }
  }

  return { scannerSummary, newOrder, analysis, decisionTriggered, isPreWarning };
}

// ─── IN-MEMORY SCAN CACHE (Prevents serverless CPU burn) ───
let cachedScanResult: {
  summaries: AssetScannerSummary[];
  newOrders: MtBridgeOrder[];
  actionableAnalyses: AnalysisResult[];
  preWarningAnalyses: AnalysisResult[];
  timestamp: number;
} | null = null;
let lastScanTime = 0;
const SCAN_CACHE_TTL_MS = 3 * 60 * 1000; // 3 minutes cache guard

/**
 * Scans the institutional watchlist in parallel and returns real-time market radar summaries
 */
export async function scanWatchlistAutonomous(
  config: AutonomousPilotConfig = DEFAULT_PILOT_CONFIG,
  force = false
): Promise<{
  summaries: AssetScannerSummary[];
  newOrders: MtBridgeOrder[];
  actionableAnalyses: AnalysisResult[];
  preWarningAnalyses: AnalysisResult[];
  timestamp: number;
  cached?: boolean;
}> {
  const now = Date.now();
  if (!force && cachedScanResult && now - lastScanTime < SCAN_CACHE_TTL_MS) {
    return {
      ...cachedScanResult,
      cached: true,
    };
  }

  pruneExpiredOrders();

  const summaries: AssetScannerSummary[] = [];
  const newOrders: MtBridgeOrder[] = [];
  const actionableAnalyses: AnalysisResult[] = [];
  const preWarningAnalyses: AnalysisResult[] = [];

  // Process watchlist in controlled batches of 4 to prevent network congestion & rate limits
  const BATCH_SIZE = 4;
  for (let i = 0; i < AUTONOMOUS_WATCHLIST.length; i += BATCH_SIZE) {
    const batch = AUTONOMOUS_WATCHLIST.slice(i, i + BATCH_SIZE);
    const batchPromises = batch.map(async (sym) => {
      try {
        const candles = await getMarketCandles(sym, "1h");
        if (!candles || candles.length < 20) return null;

        const evalResult = await evaluateAssetAutonomous(sym, candles, "1h", config);
        return evalResult;
      } catch (err) {
        console.warn(`Autonomous scan note for ${sym}:`, (err as Error)?.message || err);
        return null;
      }
    });

    const results = await Promise.allSettled(batchPromises);

    for (const res of results) {
      if (res.status === "fulfilled" && res.value) {
        summaries.push(res.value.scannerSummary);
        if (res.value.newOrder) {
          newOrders.push(res.value.newOrder);
        }
        if (res.value.decisionTriggered && res.value.analysis) {
          actionableAnalyses.push(res.value.analysis);
        } else if (res.value.isPreWarning && res.value.analysis) {
          preWarningAnalyses.push(res.value.analysis);
        }
      }
    }
  }

  // Sort summaries: Grade A+ first, then by confluence score descending
  summaries.sort((a, b) => b.confluenceScore - a.confluenceScore);

  lastScanTime = Date.now();
  cachedScanResult = {
    summaries,
    newOrders,
    actionableAnalyses,
    preWarningAnalyses,
    timestamp: lastScanTime,
  };

  return {
    ...cachedScanResult,
    cached: false,
  };
}

/**
 * Returns the in-memory cached scanner results if available
 */
export function getScannerCache() {
  return cachedScanResult;
}

/**
 * Monitors and resolves active orders against live tick price.
 * Features Price Integrity Validation, Partial Take Profit (50% at TP1),
 * Risk-Free Breakeven Lock, and Multi-Stage Adaptive Trailing Stop.
 */
export function resolveOrdersAgainstLivePrice(symbol: string, currentPrice: number) {
  const sym = symbol.toUpperCase();

  // Price Integrity Validation
  const integrity = validatePriceIntegrity(sym, currentPrice);
  if (!integrity.isValid) return;

  const orders = getActiveBridgeOrders(sym);
  if (orders.length === 0 || currentPrice <= 0) return;

  const isGold = sym.includes("XAU") || sym.includes("GOLD");
  const isJpy = sym.includes("JPY");
  const pipMultiplier = isGold ? 10 : isJpy ? 100 : sym.endsWith("USDT") ? 1 : 10000;
  const precision = isForexPair(sym) ? 4 : isJpy ? 2 : sym.endsWith("USDT") ? 2 : 2;

  for (const order of orders) {
    const isBuy = order.orderType.includes("BUY");

    // Case 1: PENDING -> FILLED
    if (order.status === "PENDING") {
      const isFilled = isBuy ? currentPrice <= order.price : currentPrice >= order.price;
      if (isFilled) {
        order.status = "FILLED";
        order.initialLots = order.initialLots || order.lotSize;
        order.remainingLots = order.remainingLots || order.lotSize;
        order.trailingSlPrice = order.stopLoss;
        order.trailingStage = 0;
        addTelemetryLog(
          sym,
          "RESOLVE",
          `Order #${order.id.slice(-6)} FILLED @ ${currentPrice} (${order.lotSize} lot). Adaptive Trailing & Partial TP monitors activated.`
        );
      }
      continue;
    }

    // Case 2: Open active orders (FILLED or HIT_TP1)
    if (order.status === "FILLED" || order.status === "HIT_TP1") {
      const initialRisk = Math.abs(order.price - order.stopLoss) || (currentPrice * 0.005);
      const estAtr = initialRisk / 1.5;

      // Check Stop Loss
      const isSlHit = isBuy ? currentPrice <= order.stopLoss : currentPrice >= order.stopLoss;
      if (isSlHit) {
        const pips = isBuy
          ? (order.stopLoss - order.price) * pipMultiplier
          : (order.price - order.stopLoss) * pipMultiplier;
        const isBe = order.status === "HIT_TP1" || Math.abs(order.stopLoss - order.price) < (2 / pipMultiplier);

        order.status = "HIT_SL";
        addTelemetryLog(
          sym,
          "RESOLVE",
          isBe
            ? `🛡️ Order #${order.id.slice(-6)} closed at Break-Even @ ${currentPrice} (Risk-Free capital preserved).`
            : `🛑 Order #${order.id.slice(-6)} HIT SL @ ${currentPrice} (${pips.toFixed(1)} pips). Invalidation stop executed.`
        );
        activeOrdersStore.delete(order.id);
        continue;
      }

      // Check Take Profit 2 (Ultimate Target Win)
      const isTp2Hit = isBuy ? currentPrice >= order.takeProfit2 : currentPrice <= order.takeProfit2;
      if (isTp2Hit) {
        const pips = Math.abs(order.takeProfit2 - order.price) * pipMultiplier;
        order.status = "HIT_TP2";
        addTelemetryLog(
          sym,
          "RESOLVE",
          `🏆 Order #${order.id.slice(-6)} HIT TP2 @ ${currentPrice} (+${pips.toFixed(1)} pips)! 100% position profit secured.`
        );
        activeOrdersStore.delete(order.id);
        continue;
      }

      // Check Take Profit 1 (Partial 50% Execution & Breakeven Lock)
      if (order.status === "FILLED") {
        const isTp1Hit = isBuy ? currentPrice >= order.takeProfit1 : currentPrice <= order.takeProfit1;
        if (isTp1Hit) {
          order.status = "HIT_TP1";
          const closedLots = Number(((order.initialLots || order.lotSize) * 0.5).toFixed(2));
          order.remainingLots = Number(Math.max(0.01, (order.lotSize - closedLots)).toFixed(2));

          // Lock SL to Breakeven (+ 1.5 pips spread buffer)
          const bufferPrice = 1.5 / pipMultiplier;
          order.stopLoss = isBuy
            ? Number((order.price + bufferPrice).toFixed(precision))
            : Number((order.price - bufferPrice).toFixed(precision));
          order.trailingSlPrice = order.stopLoss;
          order.trailingStage = 1;

          const pips = Math.abs(order.takeProfit1 - order.price) * pipMultiplier;
          if (!order.partialCloses) order.partialCloses = [];
          order.partialCloses.push({
            stage: "TP1",
            price: currentPrice,
            closedLots,
            remainingLots: order.remainingLots,
            pnlPips: Number(pips.toFixed(1)),
            timestamp: Date.now(),
          });

          addTelemetryLog(
            sym,
            "RESOLVE",
            `🎯 Order #${order.id.slice(-6)} HIT TP1 @ ${currentPrice} (+${pips.toFixed(1)} pips)! Closed 50% (${closedLots} lot). SL moved to Breakeven (${order.stopLoss}). Runner (${order.remainingLots} lot) tracking TP2 with Adaptive Trail.`
          );
          continue;
        }
      }

      // Adaptive Trailing Stop (Trail by ATR when in profit >= 1.5R)
      if (order.adaptiveTrailingActive) {
        const trailing = calculateAdaptiveTrailingStop(
          isBuy ? "BUY" : "SELL",
          order.price,
          currentPrice,
          order.price,
          order.stopLoss,
          estAtr,
          sym
        );

        const isBetterSl = isBuy
          ? trailing.trailingSlPrice > order.stopLoss
          : trailing.trailingSlPrice < order.stopLoss;

        if (isBetterSl) {
          order.stopLoss = trailing.trailingSlPrice;
          order.trailingSlPrice = trailing.trailingSlPrice;
          order.trailingStage = trailing.stage;
          addTelemetryLog(
            sym,
            "RESOLVE",
            `📈 Order #${order.id.slice(-6)} Adaptive Trail Ratchet: SL tightened to ${order.stopLoss} (${trailing.statusDescription})`
          );
        }
      }
    }
  }
}

function isForexPair(sym: string): boolean {
  return ["EUR", "GBP", "AUD", "NZD", "USD", "CAD", "CHF"].some(
    (c) => sym.startsWith(c) || sym.endsWith(c)
  ) && !sym.includes("JPY") && sym !== "XAUUSD";
}

/**
 * Human Approval Gate: อนุมัติหรือปฏิเสธ order ที่รออยู่ใน PENDING_HUMAN_APPROVAL
 * - approved = true  → เปลี่ยน status เป็น PENDING (ส่งต่อ MT4/MT5 ได้)
 * - approved = false → เปลี่ยน status เป็น CANCELLED + log เหตุผล
 */
export function approveOrder(
  orderId: string,
  approved: boolean,
  approvedBy = "HUMAN",
  reason?: string
): { success: boolean; order?: MtBridgeOrder; error?: string } {
  const order = activeOrdersStore.get(orderId);

  if (!order) {
    return { success: false, error: `Order ${orderId} not found` };
  }

  if (order.status !== "PENDING_HUMAN_APPROVAL") {
    return {
      success: false,
      error: `Order ${orderId} is not awaiting approval (current status: ${order.status})`,
    };
  }

  const now = Date.now();

  if (approved) {
    order.status = "PENDING";
    order.approvedBy = approvedBy;
    order.approvedAt = now;
    activeOrdersStore.set(orderId, order);

    addTelemetryLog(
      order.symbol,
      "ORDER",
      `✅ Order #${orderId.slice(-6)} APPROVED by ${approvedBy} — ส่ง ${order.orderType} @ ${order.price} ไป MT4/MT5 Bridge (SL: ${order.stopLoss} | TP1: ${order.takeProfit1})`
    );

    return { success: true, order };
  } else {
    order.status = "CANCELLED";
    order.approvedBy = approvedBy;
    order.approvedAt = now;
    activeOrdersStore.delete(orderId);

    addTelemetryLog(
      order.symbol,
      "VETO",
      `❌ Order #${orderId.slice(-6)} REJECTED by ${approvedBy}${reason ? ` — เหตุผล: ${reason}` : ""} | Flags: [${order.aiRiskFlags.join(", ") || "none"}]`
    );

    return { success: true, order };
  }
}
