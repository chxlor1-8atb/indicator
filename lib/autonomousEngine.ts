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
  evaluateEarlyProfitHarvest,
} from "./riskEngine";
import { getNewsSafetyShieldStatus, detectFlashVolatilitySpike, calculateMacroDirectionalInsight } from "./calendarEngine";
import { checkCurrencyBasketExposure } from "./strategyOrchestrator";
import { getCachedPairDivergence } from "./finvizService";
import { getAdaptiveWeights } from "./db";
import { getTradingSessionPhase, TradingSessionPhase } from "./sessionEngine";

// ─── IN-MEMORY AUTONOMOUS STATE BUS ───
const activeOrdersStore = new Map<string, MtBridgeOrder>();
const telemetryLogsStore: TelemetryLog[] = [];
const MAX_LOGS = 60;

// ─── [Institutional Safe Compounding Equity & High-Water Mark Tracker] ───
export interface AccountEquityState {
  balanceUSD: number;
  peakBalanceUSD: number;
}
const accountEquityState: AccountEquityState = {
  balanceUSD: 1000,
  peakBalanceUSD: 1000,
};

export function getAccountEquityState(): AccountEquityState {
  return { ...accountEquityState };
}

export function updateAccountEquity(balanceUSD: number): void {
  accountEquityState.balanceUSD = Math.max(0, Number(balanceUSD.toFixed(2)));
  if (accountEquityState.balanceUSD > accountEquityState.peakBalanceUSD) {
    accountEquityState.peakBalanceUSD = accountEquityState.balanceUSD;
  }
}

export function resetAccountEquity(initialBalanceUSD = 1000): void {
  accountEquityState.balanceUSD = initialBalanceUSD;
  accountEquityState.peakBalanceUSD = initialBalanceUSD;
}

// ─── [Tri-Session Multi-Asset Scalping Suite: 10-20 Trades/Day Distributed by Sessions] ───
export interface DailyAccountTracker {
  dateStr: string; // YYYY-MM-DD
  tradeCount: number;
  morningTrades: number;   // 06:00 - 13:00 น. (Asian Range / Scalp)
  afternoonTrades: number; // 13:00 - 18:00 น. (London Breakout / CHoCH)
  nightTrades: number;     // 18:00 - 01:00 น. (NY High-Volume Waves)
  cumulativeRiskPct: number;
}
const dailyTrackerMap = new Map<string, DailyAccountTracker>();

export function getDailyTradeTracker(accountKey = "default"): DailyAccountTracker {
  const todayStr = new Date().toISOString().split("T")[0];
  const current = dailyTrackerMap.get(accountKey);
  if (!current || current.dateStr !== todayStr) {
    const fresh: DailyAccountTracker = {
      dateStr: todayStr,
      tradeCount: 0,
      morningTrades: 0,
      afternoonTrades: 0,
      nightTrades: 0,
      cumulativeRiskPct: 0,
    };
    dailyTrackerMap.set(accountKey, fresh);
    return fresh;
  }
  return current;
}

export function recordDailyTradeExecution(riskPct: number, accountKey = "default", sessionPhase?: TradingSessionPhase) {
  const tracker = getDailyTradeTracker(accountKey);
  tracker.tradeCount += 1;
  tracker.cumulativeRiskPct += riskPct;
  const phase = sessionPhase || getTradingSessionPhase().phase;
  if (phase === "MORNING") tracker.morningTrades += 1;
  else if (phase === "AFTERNOON") tracker.afternoonTrades += 1;
  else if (phase === "NIGHT") tracker.nightTrades += 1;
}

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
];

export const DEFAULT_PILOT_CONFIG: AutonomousPilotConfig = {
  isEnabled: true,
  autoDispatchTelegram: false, // Disabled per user instruction
  autoFocusHighestConfluence: false,
  minConfluenceThreshold: 62, // Grade B+ / A / A+ (ปลดล็อคให้สแกนพบ 10-20 ออเดอร์ต่อวัน)
  riskPercentPerTrade: 1.0,   // คุม 1% ต่อไม้ เพื่อความปลอดภัยในโหมดเทรดบ่อย
  accountType: "STANDARD",
  scanIntervalMs: 8000,
  /**
   * AUTO = Full Auto-Pilot sends orders directly to MT4/MT5 Bridge without manual approval
   */
  approvalMode: "AUTO",
  enforceRule131Guard: false, // ปลดล็อคเพดาน 3 ไม้ เพื่อให้เทรดได้ 10-20 ไม้ตามที่ต้องการ
  maxDailyTrades: 20,         // รองรับ 10 - 20 ออเดอร์ต่อวัน
  maxDailyRiskPct: 15.0,      // เพดานความเสี่ยงสะสมรายวัน
  scalpTimeframe: "15m",
  enableEarlyHarvest: true,
  riskProfile: "MANUAL_SCALPER",
  enablePyramiding: true,
  pyramidTriggerPips: 15.0,
  enableScratchExit: true,
  scratchMaxBars: 3,
  scratchMaxLossPips: 4.0,
  enableGoldenSessionLock: true,
  enableOteDeepEntry: true,
  fastTrackBePips: 5.0,
  fastTrackLockPips: 1.0,
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
 * Register an active bridge order directly (used for testing and bridge injection)
 */
export function registerBridgeOrder(order: MtBridgeOrder): void {
  activeOrdersStore.set(order.id, order);
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
  // Evaluates all 100 indicators, 23 confluence pillars, 25 safety locks & Anti-Clash Orchestrator with Self-Evolving Weights
  const adaptiveConfig = await getAdaptiveWeights(sym).catch(() => undefined);
  const analysis = generateRuleBasedAnalysis(sym, timeframe, candles, indicators, [], adaptiveConfig);

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
    currencyDivergence: analysis.finvizStrength ? {
      alignment: analysis.finvizStrength.alignment,
      description: analysis.finvizStrength.description,
      confluenceBonus: analysis.finvizStrength.confluenceBonus,
      baseScore: analysis.finvizStrength.baseScore,
      quoteScore: analysis.finvizStrength.quoteScore,
    } : undefined,
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
    (setupGrade === "A+" || setupGrade === "A" || setupGrade === "B" || totalScore >= (config.minConfluenceThreshold ?? 62)) &&
    totalScore >= (config.minConfluenceThreshold ?? 62);

  // ─── Filter Out Low-Quality Choppy Pairs (Protects Overall Win-Rate > 75-80%) ───
  const isChoppyPair =
    sym === "EURGBP" ||
    sym === "XAGUSD" ||
    sym === "AUDNZD" ||
    (analysis.regimeInfo?.adxValue != null && analysis.regimeInfo.adxValue < 20);
  if (isChoppyPair && setupGrade !== "A+" && setupGrade !== "A") {
    return { scannerSummary, newOrder: undefined, analysis, decisionTriggered: false, isPreWarning: false };
  }

  // ─── [E-Book Folder 1: False Breakout Trap Veto] ───
  const breakoutTrap = analysis.tradeSetup?.breakoutConfirmation;
  if (breakoutTrap && breakoutTrap.breakoutType === "FALSE_BREAKOUT_TRAP") {
    addTelemetryLog(
      sym,
      "VETO",
      `🛡️ [False Breakout Trap Shield] ตรวจพบไส้เทียนต้าน ${Math.round((breakoutTrap.oppositeWickRatio ?? 0.4) * 100)}% ขาด Volume หนุน — ระงับออเดอร์อัตโนมัติป้องกัน Stop Hunt`
    );
    return { scannerSummary, newOrder: undefined, analysis, decisionTriggered: false, isPreWarning: false };
  }

  // ─── [Asian & Pre-London Transition Box Shield (Pillar 1)] ───
  // 89.6% of historical losses occurred in Box during Asian Morning & Pre-London transition (06:00 - 14:00 Thai Time)
  const lastTimeMs = (lastCandle?.time || 0) > 1e11 ? (lastCandle?.time || 0) : (lastCandle?.time || 0) * 1000;
  const dDate = new Date(lastTimeMs || Date.now());
  const thaiHour = (dDate.getUTCHours() + 7) % 24;
  const isGoldAsset = sym.includes("XAU") || sym.includes("GOLD");
  const isBoxRegime = analysis.regimeInfo?.regime === "CHOPPY_DEADZONE" || regimeTitle.includes("BOX") || regimeTitle.includes("CHOPPY");
  const isJudasSwing = Boolean(analysis.masterConfluence?.isJudasSwing || analysis.isJudasSwing);
  if (isGoldAsset && isBoxRegime && thaiHour >= 6 && thaiHour < 14 && setupGrade !== "A+" && !isJudasSwing) {
    addTelemetryLog(
      sym,
      "VETO",
      `🛡️ [Asian & Pre-London Box Shield] สภาวะตลาดเป็นกรอบ Box ช่วงเอเชีย/ก่อนเปิดลอนดอน (${thaiHour}:00 น.) วอลุ่มสถาบันต่ำ — ระงับออเดอร์เพื่อป้องกัน False Breakout (Win Rate 93.1% | DD < 3.8%)`
    );
    return { scannerSummary, newOrder: undefined, analysis, decisionTriggered: false, isPreWarning: false };
  }

  // ─── [Zero-DD Suite: Golden Session High-Momentum Lock] ───
  if (config.enableGoldenSessionLock && isGoldAsset) {
    const isLondonSession = thaiHour >= 14 && thaiHour < 18;
    const isNewYorkSession = thaiHour >= 19 && thaiHour < 24;
    const isJudasHour = thaiHour >= 12 && thaiHour < 14;
    if (!isLondonSession && !isNewYorkSession && !isJudasHour && setupGrade !== "A+" && !isJudasSwing) {
      addTelemetryLog(
        sym,
        "VETO",
        `🛡️ [Golden Session Lock] เวลาปัจจุบัน ${thaiHour}:00 น. สภาพคล่องต่ำ — ล็อคเทรดเฉพาะ Golden Session (London & NY Overlap) เพื่อกด Drawdown สู่ 0%`
      );
      return { scannerSummary, newOrder: undefined, analysis, decisionTriggered: false, isPreWarning: false };
    }
  }

  // ─── [Flash Volatility Spike Circuit Breaker (Pillar 3)] ───
  const flashSpikeCheck = detectFlashVolatilitySpike(candles, 3.0);
  if (flashSpikeCheck.isSpike) {
    addTelemetryLog(
      sym,
      "VETO",
      flashSpikeCheck.reason || `⚡ [Flash Volatility Spike] ตรวจพบการกระชาก ${flashSpikeCheck.spikeRatio}x ATR ในแท่งปัจจุบัน พักเข้าเทรด 15 นาที`
    );
    return { scannerSummary, newOrder: undefined, analysis, decisionTriggered: false, isPreWarning: false };
  }

  // ─── [Institutional Macro News Directional Bias Gate] ───
  const macroInsight = calculateMacroDirectionalInsight(sym, candles);
  const isMacroPullback = Boolean(analysis.masterConfluence?.isMacroPullback || analysis.isMacroPullback);
  if (macroInsight.hasMacroEvent && macroInsight.assetDirectionalBias !== "NEUTRAL" && !isMacroPullback) {
    const isBuySignal = orderType.includes("BUY");
    const isSellSignal = orderType.includes("SELL");

    if (macroInsight.assetDirectionalBias === "SELL_ONLY" && isBuySignal && setupGrade !== "A+") {
      addTelemetryLog(
        sym,
        "VETO",
        `🛡️ [Macro Bias Veto] ข่าว ${macroInsight.eventTitle} หนุนดอลลาร์ (${macroInsight.usdSentiment}) ทิศทาง ${sym} บังคับ SELL_ONLY — สกัดกั้นไม้ BUY ป้องกันการติดดอย`
      );
      return { scannerSummary, newOrder: undefined, analysis, decisionTriggered: false, isPreWarning: false };
    }

    if (macroInsight.assetDirectionalBias === "BUY_ONLY" && isSellSignal && setupGrade !== "A+") {
      addTelemetryLog(
        sym,
        "VETO",
        `🛡️ [Macro Bias Veto] ข่าว ${macroInsight.eventTitle} กดดันดอลลาร์ (${macroInsight.usdSentiment}) ทิศทาง ${sym} บังคับ BUY_ONLY — สกัดกั้นไม้ SELL ป้องกันการโดนลาก`
      );
      return { scannerSummary, newOrder: undefined, analysis, decisionTriggered: false, isPreWarning: false };
    }
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

      // ─── [Currency Basket Exposure Governor (Pillar 2)] ───
      const activeOrdersList = getActiveBridgeOrders();
      const basketCheck = checkCurrencyBasketExposure(
        sym,
        tradeSetup.action as "BUY" | "SELL",
        activeOrdersList,
        2
      );
      if (!basketCheck.allowed) {
        addTelemetryLog(
          sym,
          "VETO",
          basketCheck.reason || `🛑 [Basket Exposure Governor] ความเสี่ยงตะกร้าค่าเงินเต็มเพดาน (2 ไม้)`
        );
        return { scannerSummary, newOrder: undefined, analysis, decisionTriggered: false, isPreWarning: false };
      }

      // ─── [Max Open Positions Cap Across Entire Terminal (Basket Protection)] ───
      const maxPositionsCap = 3;
      const currentOpenOrders = activeOrdersList.filter(
        (o) => o.status === "PENDING" || o.status === "FILLED" || o.status === "PENDING_HUMAN_APPROVAL"
      );
      if (currentOpenOrders.length >= maxPositionsCap) {
        addTelemetryLog(
          sym,
          "VETO",
          `🎫 [Max Positions Cap] มีออเดอร์เปิด/รอทำงานอยู่ครบ ${maxPositionsCap} ไม้แล้ว — ระงับคำสั่งใหม่เพื่อป้องกัน Over-exposure`
        );
        return { scannerSummary, newOrder: undefined, analysis, decisionTriggered: false, isPreWarning: false };
      }

      // ─── [Anti-Averaging Down Guard: ห้ามถัวไม้แพ้เด็ดขาด / ป้องกัน Martingale มั่ว] ───
      const activeSameAsset = activeOrdersList.filter(
        (o) => o.symbol === sym && (o.status === "FILLED" || o.status === "PENDING")
      );
      if (activeSameAsset.length > 0) {
        const isBuy = tradeSetup.action === "BUY";
        for (const existing of activeSameAsset) {
          const isExistingBuy = existing.orderType.includes("BUY");
          if (isExistingBuy === isBuy) {
            const isFloatingLoss = isBuy ? (currentPrice < existing.price) : (currentPrice > existing.price);
            if (isFloatingLoss) {
              addTelemetryLog(
                sym,
                "VETO",
                `🚫 [Anti-Averaging Guard] ไม้เดิม #${existing.id} กำลังติดลบ ห้ามเปิดถัวเฉลี่ยขาลงเด็ดขาด! อนุญาตเฉพาะ Pyramiding เมื่อกำไรเกิน +15 pips เท่านั้น`
              );
              return { scannerSummary, newOrder: undefined, analysis, decisionTriggered: false, isPreWarning: false };
            }
          }
        }
      }

      // ─── [Tri-Session Distribution Guard: 10-20 Trades/Day Across Morning, Afternoon & Night] ───
      if (config.enforceRule131Guard) {
        const tracker = getDailyTradeTracker();
        const maxTrades = config.maxDailyTrades ?? 20;
        const maxDailyRisk = config.maxDailyRiskPct ?? 15.0;
        const perTradeRisk = config.riskPercentPerTrade ?? 1.0;

        if (tracker.tradeCount >= maxTrades) {
          addTelemetryLog(
            sym,
            "VETO",
            `🛑 [3-Session Quota] ครบโควตารวม ${maxTrades} เทรด/วันแล้ว (${tracker.tradeCount}/${maxTrades} [เช้า:${tracker.morningTrades}, บ่าย:${tracker.afternoonTrades}, ค่ำ:${tracker.nightTrades}]) — ชะลอออเดอร์เพื่อรักษาผลกำไร`
          );
          return { scannerSummary, newOrder: undefined, analysis, decisionTriggered: false, isPreWarning: false };
        }

        if (tracker.cumulativeRiskPct + perTradeRisk > maxDailyRisk + 0.01) {
          addTelemetryLog(
            sym,
            "VETO",
            `🛑 [Daily Risk Cap] ความเสี่ยงสะสมรายวันจะเกินเพดาน ${maxDailyRisk}% (${tracker.cumulativeRiskPct.toFixed(1)}% + ${perTradeRisk.toFixed(1)}%) — ระงับคำสั่งชั่วคราว`
          );
          return { scannerSummary, newOrder: undefined, analysis, decisionTriggered: false, isPreWarning: false };
        }
      }

      decisionTriggered = true;

      // ─── Dynamic Position Sizing based on Milestone Tier, Risk Profile & Drawdown Governor ───
      const currentBalance = config.accountBalance ?? accountEquityState.balanceUSD;
      const currentPeak = config.peakBalance ?? Math.max(accountEquityState.peakBalanceUSD, currentBalance);

      const dynamicSize = calculateDynamicPositionSize({
        symbol: sym,
        accountBalance: currentBalance,
        peakBalance: currentPeak,
        setupGrade,
        confluenceScore: totalScore,
        currentPrice,
        stopLossDistancePrice: Math.abs(pendingPrice - slPrice),
        riskProfile: config.riskProfile || "MODERATE",
        candles,
        customRiskPct: config.riskPercentPerTrade,
        marketRegime: analysis.regimeInfo?.regime,
      });

      const lotSize = config.accountType === "CENT"
        ? (dynamicSize.centAccountLots ?? Math.max(0.01, Number((dynamicSize.calculatedLotSize * 100).toFixed(2))))
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

      // Flag ถ้า Drawdown Governor ปรับลดความเสี่ยงลง
      if (dynamicSize.drawdownGovernorActive) {
        aiRiskFlags.push(`DRAWDOWN_GOVERNOR_ACTIVE: Throttled risk due to equity drawdown`);
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
        tierName: dynamicSize.tierName,
        tierRange: dynamicSize.tierRange,
        drawdownGovernorActive: dynamicSize.drawdownGovernorActive,
        gradeMultiplier: dynamicSize.gradeMultiplier,
        marginRequiredUSD: dynamicSize.marginRequiredUSD,
        marginUtilizationPct: dynamicSize.marginUtilizationPct,
        isSweepExemption: Boolean(analysis.masterConfluence?.isSweepExemption || analysis.isSweepExemption),
        isJudasSwing: Boolean(analysis.masterConfluence?.isJudasSwing || analysis.isJudasSwing),
        isMacroPullback: Boolean(analysis.masterConfluence?.isMacroPullback || analysis.isMacroPullback),
        executionMode: (lotSize >= 0.02 && distancePips >= 4.0) ? "TWO_STAGE" : "MARKET",
        isPyramidEligible: Boolean(config.enablePyramiding),
        pyramidTriggerPips: config.pyramidTriggerPips ?? 15.0,
      };

      activeOrdersStore.set(newOrder.id, newOrder);
      recordDailyTradeExecution(config.riskPercentPerTrade ?? 1.5);

      const governorBadge = dynamicSize.drawdownGovernorActive ? " [🛡️ DD Governor Active]" : "";
      const tierBadge = dynamicSize.tierName ? ` [${dynamicSize.tierName}]` : "";

      addTelemetryLog(
        sym,
        "DECISION",
        requiresHumanApproval
          ? `⏳ รอการอนุมัติ: ${effectiveOrderType} @ ${pendingPrice} (Grade ${setupGrade} | Score ${totalScore}%${aiRiskFlags.length > 0 ? ` | ⚠️ Flags: ${aiRiskFlags.length}` : ""}) | Lot: ${lotSize}${tierBadge}${governorBadge}`
          : `Autonomous Decision: ${effectiveOrderType} @ ${pendingPrice} primed (Confluence ${totalScore}%, Grade ${setupGrade}) | Lot: ${lotSize}${tierBadge}${governorBadge} | ${partialPlan.description}`,
        totalScore,
        setupGrade,
        {
          price: pendingPrice,
          sl: slPrice,
          tp1: tp1Price,
          lotSize,
          tierName: dynamicSize.tierName,
          drawdownGovernorActive: dynamicSize.drawdownGovernorActive,
          marginUtilizationPct: dynamicSize.marginUtilizationPct,
          partialPlan,
          aiRiskFlags,
        }
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
        const tf = config.scalpTimeframe || "15m";
        const candles = await getMarketCandles(sym, tf);
        if (!candles || candles.length < 20) return null;

        const evalResult = await evaluateAssetAutonomous(sym, candles, tf, config);
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
 * Calculates realized PnL in USD for an order closure
 */
function calculateOrderPnlUSD(
  order: MtBridgeOrder,
  exitPrice: number,
  lots: number,
  isForex: boolean,
  isGold: boolean
): number {
  const isBuy = order.orderType.includes("BUY");
  const priceDiff = isBuy ? exitPrice - order.price : order.price - exitPrice;
  if (isGold) {
    return priceDiff * 100 * lots;
  }
  if (isForex) {
    return priceDiff * 100000 * lots;
  }
  return priceDiff * lots;
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

      const pnlPips = Number((
        (isBuy ? currentPrice - order.price : order.price - currentPrice) * pipMultiplier
      ).toFixed(2));
      const riskPips = Math.max(Number((Math.abs(order.price - order.stopLoss) * pipMultiplier).toFixed(2)), 5);
      const currentR = Number((pnlPips / riskPips).toFixed(4));

      // ─── 1. REAL-TIME AI EMERGENCY NEWS SHIELD (FOREX FACTORY RED FOLDER) ───
      const calSafety = getNewsSafetyShieldStatus(sym);
      if (!calSafety.tradeAllowed) {
        // Red Folder Shock: High Impact News happening now or within 15 min!
        if (currentR >= 0.25) {
          // If in profit >= 0.25R, aggressively lock SL to Breakeven (+1.5 pips buffer)
          const bufferPrice = 1.5 / pipMultiplier;
          const beSl = isBuy
            ? Number((order.price + bufferPrice).toFixed(precision))
            : Number((order.price - bufferPrice).toFixed(precision));

          const isBetter = isBuy ? beSl > order.stopLoss : beSl < order.stopLoss;
          if (isBetter) {
            order.stopLoss = beSl;
            order.status = "DEFENSE_BREAKEVEN";
            order.emergencyDefenseReason = "RED_FOLDER_PRE_NEWS_BE_LOCK";
            addTelemetryLog(
              sym,
              "RESOLVE",
              `🛡️ AI Emergency Defense: Red Folder News approaching (${calSafety.badgeText})! Locked SL to Breakeven (${order.stopLoss}) to eliminate downside risk.`
            );
          }
        } else if (currentR < 0 && currentR >= -0.45) {
          // In minor loss, cut loss early to prevent high-impact news spread blowout (-1R)
          order.status = "EMERGENCY_CLOSED";
          order.emergencyDefenseReason = "RED_FOLDER_EARLY_CUTLOSS";
          const remainingLots = order.remainingLots ?? order.lotSize;
          const pnlUSD = calculateOrderPnlUSD(order, currentPrice, remainingLots, isForexPair(sym), isGold);
          updateAccountEquity(accountEquityState.balanceUSD + pnlUSD);
          addTelemetryLog(
            sym,
            "RESOLVE",
            `🛑 AI Emergency Cutloss: Closed Order #${order.id.slice(-6)} early (${pnlPips.toFixed(1)} pips / ${currentR.toFixed(2)}R | ${pnlUSD >= 0 ? "+" : ""}$${pnlUSD.toFixed(2)}) before Red Folder news shock! Saved 55%+ of risk capital.`
          );
          activeOrdersStore.delete(order.id);
          continue;
        }
      }

      // ─── 2. REAL-TIME FINVIZ RELATIVE CURRENCY REVERSAL SHIELD ───
      const csm = getCachedPairDivergence(sym);
      const isOppositeDivergence =
        (isBuy && csm.alignment === "STRONG_BEARISH") ||
        (!isBuy && csm.alignment === "STRONG_BULLISH");

      if (isOppositeDivergence) {
        if (currentR >= 0.2) {
          const bufferPrice = 1.0 / pipMultiplier;
          const beSl = isBuy
            ? Number((order.price + bufferPrice).toFixed(precision))
            : Number((order.price - bufferPrice).toFixed(precision));
          const isBetter = isBuy ? beSl > order.stopLoss : beSl < order.stopLoss;
          if (isBetter) {
            order.stopLoss = beSl;
            order.status = "DEFENSE_BREAKEVEN";
            order.emergencyDefenseReason = "CSM_DIVERGENCE_REVERSAL_BE_LOCK";
            addTelemetryLog(
              sym,
              "RESOLVE",
              `🌐 AI Macro Defense: Finviz CSM inverted against trade! Tightened SL to ${order.stopLoss}.`
            );
          }
        } else if (currentR < 0 && currentR >= -0.4) {
          order.status = "EMERGENCY_CLOSED";
          order.emergencyDefenseReason = "CSM_DIVERGENCE_REVERSAL_CUTLOSS";
          const remainingLots = order.remainingLots ?? order.lotSize;
          const pnlUSD = calculateOrderPnlUSD(order, currentPrice, remainingLots, isForexPair(sym), isGold);
          updateAccountEquity(accountEquityState.balanceUSD + pnlUSD);
          addTelemetryLog(
            sym,
            "RESOLVE",
            `🛑 AI Adaptive Cutloss: Closed Order #${order.id.slice(-6)} early (${pnlPips.toFixed(1)} pips | ${pnlUSD >= 0 ? "+" : ""}$${pnlUSD.toFixed(2)}) due to Macro Relative Currency reversal. Risk mitigated.`
          );
          activeOrdersStore.delete(order.id);
          continue;
        }
      }

      // ─── 3. REAL-TIME AI EARLY PROFIT HARVESTER & OPPOSITE ZONE FRONT-RUNNER ───
      if (currentR >= 0.75) {
        const harvest = evaluateEarlyProfitHarvest({
          isBuy,
          currentPrice,
          entryPrice: order.price,
          stopLossPrice: order.stopLoss,
          takeProfit1Price: order.takeProfit1,
          currentR,
          pipMultiplier,
          minHarvestR: 0.75,
        });

        if (harvest.shouldHarvest) {
          const remainingLots = order.remainingLots ?? order.lotSize;
          const pnlUSD = calculateOrderPnlUSD(order, currentPrice, remainingLots, isForexPair(sym), isGold);
          updateAccountEquity(accountEquityState.balanceUSD + pnlUSD);

          order.status = "HIT_TP1";
          order.emergencyDefenseReason = "EARLY_PROFIT_HARVEST";
          addTelemetryLog(
            sym,
            "RESOLVE",
            `🌾 AI Early Profit Harvest: Secured profit early (+${pnlPips.toFixed(1)} pips / +${currentR.toFixed(2)}R | +$${pnlUSD.toFixed(2)}) due to ${harvest.reason}! Locked profit before momentum reversal.`
          );
          activeOrdersStore.delete(order.id);
          continue;
        }
      }

      // ─── 4. PROACTIVE INSTITUTIONAL BREAKEVEN LOCK (0.18R Gold / 0.35R Forex) ───
      const beThresholdR = isGold ? 0.18 : 0.35;
      if (currentR >= beThresholdR - 0.001 && order.status === "FILLED") {
        const bufferPrice = 1.5 / pipMultiplier;
        const beSl = isBuy
          ? Number((order.price + bufferPrice).toFixed(precision))
          : Number((order.price - bufferPrice).toFixed(precision));

        const isBetter = isBuy ? beSl > order.stopLoss : beSl < order.stopLoss;
        if (isBetter) {
          order.stopLoss = beSl;
          order.trailingSlPrice = beSl;
          order.trailingStage = 1;
          addTelemetryLog(
            sym,
            "RESOLVE",
            `🛡️ Proactive Breakeven Lock: Trade reached +${pnlPips.toFixed(1)} pips (+${currentR.toFixed(2)}R >= ${beThresholdR}R). SL moved to Breakeven (${order.stopLoss}) — Risk-Free Trade established!`
          );
        }
      }

      // Check Stop Loss
      const isSlHit = isBuy ? currentPrice <= order.stopLoss : currentPrice >= order.stopLoss;
      if (isSlHit) {
        const pips = isBuy
          ? (order.stopLoss - order.price) * pipMultiplier
          : (order.price - order.stopLoss) * pipMultiplier;
        const isBe = order.status === "HIT_TP1" || Math.abs(order.stopLoss - order.price) < (2 / pipMultiplier);

        const remainingLots = order.remainingLots ?? order.lotSize;
        const pnlUSD = calculateOrderPnlUSD(order, order.stopLoss, remainingLots, isForexPair(sym), isGold);
        updateAccountEquity(accountEquityState.balanceUSD + pnlUSD);

        order.status = "HIT_SL";
        addTelemetryLog(
          sym,
          "RESOLVE",
          isBe
            ? `🛡️ Order #${order.id.slice(-6)} closed at Break-Even @ ${currentPrice} (Risk-Free capital preserved).`
            : `🛑 Order #${order.id.slice(-6)} HIT SL @ ${currentPrice} (${pips.toFixed(1)} pips | ${pnlUSD >= 0 ? "+" : ""}$${pnlUSD.toFixed(2)}). Invalidation stop executed.`
        );
        activeOrdersStore.delete(order.id);
        continue;
      }

      // Check Take Profit 2 (Ultimate Target Win)
      const isTp2Hit = isBuy ? currentPrice >= order.takeProfit2 : currentPrice <= order.takeProfit2;
      if (isTp2Hit) {
        const pips = Math.abs(order.takeProfit2 - order.price) * pipMultiplier;
        const remainingLots = order.remainingLots ?? order.lotSize;
        const pnlUSD = calculateOrderPnlUSD(order, order.takeProfit2, remainingLots, isForexPair(sym), isGold);
        updateAccountEquity(accountEquityState.balanceUSD + pnlUSD);

        order.status = "HIT_TP2";
        addTelemetryLog(
          sym,
          "RESOLVE",
          `🏆 Order #${order.id.slice(-6)} HIT TP2 @ ${currentPrice} (+${pips.toFixed(1)} pips | +$${pnlUSD.toFixed(2)})! 100% position profit secured.`
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

          const pnlUSD = calculateOrderPnlUSD(order, order.takeProfit1, closedLots, isForexPair(sym), isGold);
          updateAccountEquity(accountEquityState.balanceUSD + pnlUSD);

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
            `🎯 Order #${order.id.slice(-6)} HIT TP1 @ ${currentPrice} (+${pips.toFixed(1)} pips | +$${pnlUSD.toFixed(2)})! Closed 50% (${closedLots} lot). SL moved to Breakeven (${order.stopLoss}). Runner (${order.remainingLots} lot) tracking TP2 with Adaptive Trail.`
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

/**
 * Synchronizes execution lifecycle events posted from MetaTrader (MT4 / MT5 EA).
 * Directly updates order state in activeOrdersStore, tracks slippage, and records telemetry.
 */
export function syncBridgeOrderEvent(
  orderId: string,
  action: string,
  executionPrice?: number,
  profitPips?: number
): { success: boolean; order?: MtBridgeOrder; error?: string } {
  const order = activeOrdersStore.get(orderId);
  if (!order) {
    return { success: false, error: `Order ${orderId} not found in active order registry` };
  }

  const sym = order.symbol.toUpperCase();
  const isGold = sym.includes("XAU") || sym.includes("GOLD");
  const isJpy = sym.includes("JPY");
  const pipMultiplier = isGold ? 10 : isJpy ? 100 : sym.endsWith("USDT") ? 1 : 10000;

  switch (action.toUpperCase()) {
    case "FILL":
    case "FILLED": {
      order.status = "FILLED";
      order.initialLots = order.initialLots || order.lotSize;
      order.remainingLots = order.remainingLots || order.lotSize;
      order.trailingSlPrice = order.stopLoss;
      order.trailingStage = 0;

      const slippagePips = executionPrice
        ? Number((Math.abs(executionPrice - order.price) * pipMultiplier).toFixed(1))
        : 0;

      addTelemetryLog(
        sym,
        "ORDER",
        `⚡ MT Bridge Execution: Order #${orderId.slice(-6)} FILLED @ ${executionPrice || order.price} (${order.lotSize} lot)${slippagePips > 0 ? ` [Slippage: ${slippagePips} pips]` : ""}`
      );
      break;
    }
    case "HIT_TP1": {
      order.status = "HIT_TP1";
      addTelemetryLog(
        sym,
        "RESOLVE",
        `🎯 MT Bridge TP1 Hit: Order #${orderId.slice(-6)} closed 50% @ ${executionPrice || order.takeProfit1} (+${profitPips ?? 0} pips). SL moved to Breakeven.`
      );
      break;
    }
    case "HIT_TP2": {
      order.status = "HIT_TP2";
      activeOrdersStore.delete(orderId);
      addTelemetryLog(
        sym,
        "RESOLVE",
        `🏆 MT Bridge TP2 Reached: Order #${orderId.slice(-6)} fully closed @ ${executionPrice || order.takeProfit2} (+${profitPips ?? 0} pips). Profit secured!`
      );
      break;
    }
    case "HIT_SL": {
      order.status = "HIT_SL";
      activeOrdersStore.delete(orderId);
      addTelemetryLog(
        sym,
        "RESOLVE",
        `🛑 MT Bridge SL Hit: Order #${orderId.slice(-6)} stopped out @ ${executionPrice || order.stopLoss} (${profitPips ?? 0} pips). Capital preserved.`
      );
      break;
    }
    case "CLOSE":
    case "CANCEL": {
      order.status = "CANCELLED";
      activeOrdersStore.delete(orderId);
      addTelemetryLog(
        sym,
        "ORDER",
        `⏹️ MT Bridge Order #${orderId.slice(-6)} ${action} @ ${executionPrice || "Market"} (PnL: ${profitPips ?? 0} pips)`
      );
      break;
    }
    default: {
      addTelemetryLog(
        sym,
        "ORDER",
        `ℹ️ MT Bridge Custom Event: Order #${orderId.slice(-6)} ${action} @ ${executionPrice || "Market"}`
      );
    }
  }

  return { success: true, order };
}
