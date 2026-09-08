import {
  AssetScannerSummary,
  Candle,
  IndicatorData,
  MtBridgeOrder,
  TelemetryLog,
  AutonomousPilotConfig,
  AnalysisResult,
} from "./types";
import { calculateAllIndicators, calculateATR } from "./indicators";
import { evaluateMasterConfluence } from "./confluenceEngine";
import { classifyMarketRegime } from "./regimeClassifier";
import { getNewsSafetyShieldStatus } from "./calendarEngine";
import { orchestrateStrategyDecision } from "./strategyOrchestrator";
import { getMarketCandles, AVAILABLE_ASSETS } from "./marketService";

// ─── IN-MEMORY AUTONOMOUS STATE BUS ───
const activeOrdersStore = new Map<string, MtBridgeOrder>();
const telemetryLogsStore: TelemetryLog[] = [];
const MAX_LOGS = 60;

// Watchlist of high-conviction institutional assets
export const AUTONOMOUS_WATCHLIST = [
  "XAUUSD",
  "BTCUSDT",
  "ETHUSDT",
  "EURUSD",
  "GBPUSD",
  "USOIL",
];

export const DEFAULT_PILOT_CONFIG: AutonomousPilotConfig = {
  isEnabled: true,
  autoDispatchTelegram: true,
  autoFocusHighestConfluence: false,
  minConfluenceThreshold: 75, // Grade A sniper entry
  riskPercentPerTrade: 1.5,
  accountType: "STANDARD",
  scanIntervalMs: 8000,
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
  decisionTriggered: boolean;
}> {
  const sym = symbol.toUpperCase();
  const currentPrice = candles[candles.length - 1]?.close || 0;
  const prevPrice = candles[0]?.open || currentPrice;
  const change24h = prevPrice > 0 ? ((currentPrice - prevPrice) / prevPrice) * 100 : 0;
  const high24h = Math.max(...candles.map((c) => c.high));
  const low24h = Math.min(...candles.map((c) => c.low));

  // 1. Vectorized Indicators & Safety
  const indicators = calculateAllIndicators(candles, sym);
  const regimeInfo = classifyMarketRegime(candles, indicators);
  const calendarSafety = getNewsSafetyShieldStatus(sym);

  // 2. Anti-Clash Strategy Orchestration
  orchestrateStrategyDecision({
    candles,
    indicators,
    regimeInfo,
    userPreset: "AUTO_REGIME",
  });

  // 3. Directional Bias Determination
  const ema20 = indicators.ema20.slice(-1)[0] ?? currentPrice;
  const ema50 = indicators.ema50.slice(-1)[0] ?? currentPrice;
  const ema200 = indicators.ema200.slice(-1)[0] ?? currentPrice;
  const isBullishStructure = currentPrice > ema200 && ema20 >= ema50;
  const isBearishStructure = currentPrice < ema200 && ema20 <= ema50;
  const bias = isBullishStructure ? "BULLISH" : isBearishStructure ? "BEARISH" : "NEUTRAL";

  // 4. Master Confluence Score (0-100)
  const masterConfluence = evaluateMasterConfluence(candles, indicators, bias);
  const totalScore = masterConfluence.totalScore;
  const setupGrade = masterConfluence.grade;

  // Signal categorization
  let signal: AssetScannerSummary["signal"] = "WAIT";
  let orderType = "WAIT_NO_ORDER";

  if (bias === "BULLISH" && totalScore >= 70) {
    signal = totalScore >= 80 ? "STRONG_BUY" : "BUY";
    orderType = "BUY_LIMIT";
  } else if (bias === "BEARISH" && totalScore >= 70) {
    signal = totalScore >= 80 ? "STRONG_SELL" : "SELL";
    orderType = "SELL_LIMIT";
  }

  // Check News Safety Shield
  const isNewsFrozen = !calendarSafety.tradeAllowed;
  if (isNewsFrozen) {
    signal = "WAIT";
    orderType = "NEWS_FREEZE";
  }

  // Calculate Precision and Pip Size
  const isGold = sym.includes("XAU") || sym.includes("GOLD");
  const isJpy = sym.includes("JPY");
  const pipMultiplier = isGold ? 10 : isJpy ? 100 : sym.endsWith("USDT") ? 1 : 10000;
  const precision = isGold || isJpy ? 2 : sym.endsWith("USDT") && currentPrice > 50 ? 2 : 4;

  // Calculate ATR-based Pending Order Parameters
  const atrList = calculateATR(candles, 14);
  const currentAtr = atrList.slice(-1)[0] || (currentPrice * 0.005);
  const slDistance = Math.max(currentAtr * 1.5, currentPrice * 0.0025);
  const tp1Distance = slDistance * 1.0;
  const tp2Distance = slDistance * 2.0;

  // Optimal Entry Zone (Pullback to EMA20 / 38.2% discount)
  let pendingPrice = currentPrice;
  let slPrice = currentPrice;
  let tp1Price = currentPrice;
  let tp2Price = currentPrice;

  if (orderType === "BUY_LIMIT") {
    // Buy limit at slight discount (EMA20 or current - 0.15 ATR)
    pendingPrice = Number((Math.min(currentPrice, ema20) - (currentAtr * 0.15)).toFixed(precision));
    if (pendingPrice >= currentPrice) pendingPrice = Number((currentPrice - (currentAtr * 0.2)).toFixed(precision));
    slPrice = Number((pendingPrice - slDistance).toFixed(precision));
    tp1Price = Number((pendingPrice + tp1Distance).toFixed(precision));
    tp2Price = Number((pendingPrice + tp2Distance).toFixed(precision));
  } else if (orderType === "SELL_LIMIT") {
    // Sell limit at slight premium (EMA20 or current + 0.15 ATR)
    pendingPrice = Number((Math.max(currentPrice, ema20) + (currentAtr * 0.15)).toFixed(precision));
    if (pendingPrice <= currentPrice) pendingPrice = Number((currentPrice + (currentAtr * 0.2)).toFixed(precision));
    slPrice = Number((pendingPrice + slDistance).toFixed(precision));
    tp1Price = Number((pendingPrice - tp1Distance).toFixed(precision));
    tp2Price = Number((pendingPrice - tp2Distance).toFixed(precision));
  }

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
    regime: regimeInfo.title,
    isNewsFrozen,
    pendingPrice: orderType !== "WAIT_NO_ORDER" ? pendingPrice : undefined,
    slPrice: orderType !== "WAIT_NO_ORDER" ? slPrice : undefined,
    tpPrice: orderType !== "WAIT_NO_ORDER" ? tp1Price : undefined,
    distancePips,
    updatedAt: Date.now(),
  };

  // 5. Autonomous Decision Gate: High Confluence Trigger (>= 75 score & Grade A/A+)
  let newOrder: MtBridgeOrder | undefined;
  let decisionTriggered = false;

  if (
    config.isEnabled &&
    !isNewsFrozen &&
    totalScore >= config.minConfluenceThreshold &&
    (signal === "BUY" || signal === "STRONG_BUY" || signal === "SELL" || signal === "STRONG_SELL") &&
    (orderType === "BUY_LIMIT" || orderType === "SELL_LIMIT")
  ) {
    // Check Deduplication against active orders
    const existingOrder = getActiveBridgeOrders(sym).find(
      (o) => o.status === "PENDING" && o.orderType === orderType
    );

    // If no existing pending order or price moved sufficiently
    if (!existingOrder || Math.abs(existingOrder.price - pendingPrice) > (currentAtr * 0.5)) {
      decisionTriggered = true;
      const lotSize = config.accountType === "CENT" ? 0.10 : 0.02;

      newOrder = {
        id: `ord_${sym}_${Date.now()}`,
        symbol: sym,
        orderType,
        price: pendingPrice,
        stopLoss: slPrice,
        takeProfit1: tp1Price,
        takeProfit2: tp2Price,
        lotSize,
        confluenceScore: totalScore,
        setupGrade,
        comment: `Aegis_Auto_${setupGrade.split(" ")[0]}`,
        status: "PENDING",
        timestamp: Date.now(),
        expiresAt: Date.now() + 4 * 60 * 60 * 1000, // 4 hours validity
      };

      activeOrdersStore.set(newOrder.id, newOrder);

      addTelemetryLog(
        sym,
        "DECISION",
        `Autonomous Decision: ${orderType} @ ${pendingPrice} primed (Confluence ${totalScore}%, Grade ${setupGrade})`,
        totalScore,
        setupGrade,
        { price: pendingPrice, sl: slPrice, tp1: tp1Price }
      );

      addTelemetryLog(
        sym,
        "ORDER",
        `Institutional Ticket dispatched to MT4/MT5 Bridge (SL: ${slPrice} | TP1: ${tp1Price})`
      );
    }
  }

  return { scannerSummary, newOrder, decisionTriggered };
}

/**
 * Scans the institutional watchlist in parallel and returns real-time market radar summaries
 */
export async function scanWatchlistAutonomous(
  config: AutonomousPilotConfig = DEFAULT_PILOT_CONFIG
): Promise<{
  summaries: AssetScannerSummary[];
  newOrders: MtBridgeOrder[];
  timestamp: number;
}> {
  pruneExpiredOrders();

  const summaries: AssetScannerSummary[] = [];
  const newOrders: MtBridgeOrder[] = [];

  // Parallel scanning across watchlist assets
  const scanPromises = AUTONOMOUS_WATCHLIST.map(async (sym) => {
    try {
      const candles = await getMarketCandles(sym, "1h");
      if (!candles || candles.length < 20) return null;

      const evalResult = await evaluateAssetAutonomous(sym, candles, "1h", config);
      return evalResult;
    } catch (err) {
      console.warn(`Autonomous scan error for ${sym}:`, err);
      return null;
    }
  });

  const results = await Promise.allSettled(scanPromises);

  for (const res of results) {
    if (res.status === "fulfilled" && res.value) {
      summaries.push(res.value.scannerSummary);
      if (res.value.newOrder) {
        newOrders.push(res.value.newOrder);
      }
    }
  }

  // Sort summaries: Grade A+ first, then by confluence score descending
  summaries.sort((a, b) => b.confluenceScore - a.confluenceScore);

  return {
    summaries,
    newOrders,
    timestamp: Date.now(),
  };
}

/**
 * Monitors and resolves active orders against live tick price
 */
export function resolveOrdersAgainstLivePrice(symbol: string, currentPrice: number) {
  const orders = getActiveBridgeOrders(symbol);
  if (orders.length === 0 || currentPrice <= 0) return;

  for (const order of orders) {
    if (order.status === "PENDING") {
      // Check if limit order is filled
      if (order.orderType === "BUY_LIMIT" && currentPrice <= order.price) {
        order.status = "FILLED";
        addTelemetryLog(
          symbol,
          "RESOLVE",
          `Order #${order.id.slice(-6)} FILLED @ ${currentPrice}. Trailing Stop & Breakeven monitors activated.`
        );
      } else if (order.orderType === "SELL_LIMIT" && currentPrice >= order.price) {
        order.status = "FILLED";
        addTelemetryLog(
          symbol,
          "RESOLVE",
          `Order #${order.id.slice(-6)} FILLED @ ${currentPrice}. Trailing Stop & Breakeven monitors activated.`
        );
      }
    } else if (order.status === "FILLED") {
      // Check TP / SL for filled orders
      if (order.orderType === "BUY_LIMIT" || order.orderType === "BUY") {
        if (currentPrice >= order.takeProfit2) {
          order.status = "HIT_TP2";
          addTelemetryLog(
            symbol,
            "RESOLVE",
            `🏆 Order #${order.id.slice(-6)} HIT TP2 @ ${currentPrice}! Target reached, full profit secured.`
          );
          activeOrdersStore.delete(order.id);
        } else if (currentPrice >= order.takeProfit1) {
          order.status = "HIT_TP1";
          order.stopLoss = order.price; // Move SL to Breakeven
          addTelemetryLog(
            symbol,
            "RESOLVE",
            `🎯 Order #${order.id.slice(-6)} HIT TP1 @ ${currentPrice}! SL automatically adjusted to Breakeven (${order.price}).`
          );
        } else if (currentPrice <= order.stopLoss) {
          order.status = "HIT_SL";
          addTelemetryLog(
            symbol,
            "RESOLVE",
            `🛑 Order #${order.id.slice(-6)} HIT SL @ ${currentPrice}. Invalidation stop triggered, capital preserved.`
          );
          activeOrdersStore.delete(order.id);
        }
      } else if (order.orderType === "SELL_LIMIT" || order.orderType === "SELL") {
        if (currentPrice <= order.takeProfit2) {
          order.status = "HIT_TP2";
          addTelemetryLog(
            symbol,
            "RESOLVE",
            `🏆 Order #${order.id.slice(-6)} HIT TP2 @ ${currentPrice}! Target reached, full profit secured.`
          );
          activeOrdersStore.delete(order.id);
        } else if (currentPrice <= order.takeProfit1) {
          order.status = "HIT_TP1";
          order.stopLoss = order.price; // Move SL to Breakeven
          addTelemetryLog(
            symbol,
            "RESOLVE",
            `🎯 Order #${order.id.slice(-6)} HIT TP1 @ ${currentPrice}! SL automatically adjusted to Breakeven (${order.price}).`
          );
        } else if (currentPrice >= order.stopLoss) {
          order.status = "HIT_SL";
          addTelemetryLog(
            symbol,
            "RESOLVE",
            `🛑 Order #${order.id.slice(-6)} HIT SL @ ${currentPrice}. Invalidation stop triggered, capital preserved.`
          );
          activeOrdersStore.delete(order.id);
        }
      }
    }
  }
}
