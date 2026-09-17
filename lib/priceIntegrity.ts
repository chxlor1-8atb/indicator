/**
 * Real-time Price Integrity & Order Confluence Validation Engine.
 * Ensures orders are never executed against stale, corrupted, or logically contradictory price levels.
 */
import { Candle } from "./types";
import { logger } from "./logger";

export interface PriceIntegrityResult {
  isValid: boolean;
  reason?: string;
  price: number;
  stalenessSeconds?: number;
  deviationPct?: number;
}

export interface ConfluenceValidationResult {
  isValid: boolean;
  reason?: string;
  effectiveRR: number;
  distancePips: number;
}

// Broad plausible boundary ranges per asset family to block malformed API feed anomalies
const ASSET_SANITY_BOUNDS: Record<string, { min: number; max: number }> = {
  XAUUSD: { min: 1200, max: 4500 },
  GOLD: { min: 1200, max: 4500 },
  XAGUSD: { min: 10, max: 80 },
  USOIL: { min: 20, max: 200 },
  UKOIL: { min: 25, max: 220 },
  EURUSD: { min: 0.8, max: 1.5 },
  GBPUSD: { min: 0.9, max: 1.8 },
  USDJPY: { min: 80, max: 200 },
  GBPJPY: { min: 120, max: 250 },
  AUDUSD: { min: 0.4, max: 1.1 },
  USDCAD: { min: 0.9, max: 1.7 },
  USDCHF: { min: 0.7, max: 1.4 },
  NZDUSD: { min: 0.4, max: 1.0 },
};

/**
 * Validates the integrity, freshness, and sanity of a live market price quote.
 */
export function validatePriceIntegrity(
  symbol: string,
  price: number,
  lastCandle?: Candle,
  timestampMs?: number,
  maxStalenessSec = 30
): PriceIntegrityResult {
  const sym = symbol.toUpperCase();

  // 1. Basic numerical validity
  if (typeof price !== "number" || isNaN(price) || !isFinite(price) || price <= 0) {
    logger.warn(`Price integrity failed: invalid number for ${sym}`, { symbol: sym, price });
    return { isValid: false, reason: "Price must be a positive finite number", price };
  }

  // 2. Staleness check
  if (timestampMs) {
    const stalenessSeconds = (Date.now() - timestampMs) / 1000;
    if (stalenessSeconds > maxStalenessSec) {
      logger.warn(`Price integrity failed: stale quote for ${sym} (${stalenessSeconds.toFixed(1)}s)`, {
        symbol: sym,
        price,
        stalenessSeconds,
      });
      return {
        isValid: false,
        reason: `Price quote is stale (${stalenessSeconds.toFixed(0)}s > limit ${maxStalenessSec}s)`,
        price,
        stalenessSeconds,
      };
    }
  }

  // 3. Absolute sanity range boundaries
  const bounds = ASSET_SANITY_BOUNDS[sym];
  if (bounds) {
    if (price < bounds.min || price > bounds.max) {
      logger.error(`Price integrity failed: price ${price} outside sanity bounds [${bounds.min}, ${bounds.max}] for ${sym}`, {
        symbol: sym,
        price,
      });
      return {
        isValid: false,
        reason: `Price ${price} is outside safe sanity bounds [${bounds.min}, ${bounds.max}]`,
        price,
      };
    }
  }

  // 4. Flash anomaly check against recent candle close (max 5.0% gap without volatility backing)
  if (lastCandle && lastCandle.close > 0) {
    const deviationPct = (Math.abs(price - lastCandle.close) / lastCandle.close) * 100;
    const maxAllowedDeviation = sym.endsWith("USDT") ? 10.0 : 4.5;

    if (deviationPct > maxAllowedDeviation) {
      logger.warn(`Price integrity failed: flash deviation of ${deviationPct.toFixed(2)}% for ${sym}`, {
        symbol: sym,
        price,
        deviationPct,
      });
      return {
        isValid: false,
        reason: `Sudden flash gap detected (${deviationPct.toFixed(2)}% deviation from last candle close)`,
        price,
        deviationPct,
      };
    }
  }

  return { isValid: true, price };
}

/**
 * Validates logical confluence between live market price, entry price, stop loss, and take profit targets.
 */
export function validateOrderConfluence(
  action: string,
  livePrice: number,
  entryPrice: number,
  stopLoss: number,
  takeProfit1: number,
  takeProfit2: number,
  minRR = 1.0
): ConfluenceValidationResult {
  const isBuy = action.toUpperCase().includes("BUY");
  const isSell = action.toUpperCase().includes("SELL");

  if (!isBuy && !isSell) {
    return { isValid: false, reason: `Unknown order action: ${action}`, effectiveRR: 0, distancePips: 0 };
  }

  // 1. All levels must be positive
  if (livePrice <= 0 || entryPrice <= 0 || stopLoss <= 0 || takeProfit1 <= 0 || takeProfit2 <= 0) {
    return { isValid: false, reason: "All price levels must be positive numbers", effectiveRR: 0, distancePips: 0 };
  }

  // 2. Directional Hierarchy Check
  if (isBuy) {
    if (stopLoss >= entryPrice) {
      return { isValid: false, reason: `BUY Invalid: Stop Loss (${stopLoss}) must be below Entry (${entryPrice})`, effectiveRR: 0, distancePips: 0 };
    }
    if (entryPrice >= takeProfit1) {
      return { isValid: false, reason: `BUY Invalid: Entry (${entryPrice}) must be below TP1 (${takeProfit1})`, effectiveRR: 0, distancePips: 0 };
    }
    if (takeProfit1 >= takeProfit2) {
      return { isValid: false, reason: `BUY Invalid: TP1 (${takeProfit1}) must be below TP2 (${takeProfit2})`, effectiveRR: 0, distancePips: 0 };
    }
    if (livePrice <= stopLoss) {
      return { isValid: false, reason: `BUY Invalid: Live price (${livePrice}) has already violated Stop Loss (${stopLoss})`, effectiveRR: 0, distancePips: 0 };
    }
    if (livePrice >= takeProfit1) {
      return { isValid: false, reason: `BUY Invalid: Live price (${livePrice}) has already touched or passed TP1 (${takeProfit1})`, effectiveRR: 0, distancePips: 0 };
    }
  } else if (isSell) {
    if (stopLoss <= entryPrice) {
      return { isValid: false, reason: `SELL Invalid: Stop Loss (${stopLoss}) must be above Entry (${entryPrice})`, effectiveRR: 0, distancePips: 0 };
    }
    if (entryPrice <= takeProfit1) {
      return { isValid: false, reason: `SELL Invalid: Entry (${entryPrice}) must be above TP1 (${takeProfit1})`, effectiveRR: 0, distancePips: 0 };
    }
    if (takeProfit1 <= takeProfit2) {
      return { isValid: false, reason: `SELL Invalid: TP1 (${takeProfit1}) must be above TP2 (${takeProfit2})`, effectiveRR: 0, distancePips: 0 };
    }
    if (livePrice >= stopLoss) {
      return { isValid: false, reason: `SELL Invalid: Live price (${livePrice}) has already violated Stop Loss (${stopLoss})`, effectiveRR: 0, distancePips: 0 };
    }
    if (livePrice <= takeProfit1) {
      return { isValid: false, reason: `SELL Invalid: Live price (${livePrice}) has already touched or passed TP1 (${takeProfit1})`, effectiveRR: 0, distancePips: 0 };
    }
  }

  // 3. Risk-Reward Ratio Calculation
  const slDist = Math.abs(entryPrice - stopLoss);
  const tpDist = Math.abs(takeProfit1 - entryPrice);

  if (slDist <= 0) {
    return { isValid: false, reason: "Stop loss distance cannot be zero", effectiveRR: 0, distancePips: 0 };
  }

  const effectiveRR = Number((tpDist / slDist).toFixed(2));
  if (effectiveRR < minRR) {
    return {
      isValid: false,
      reason: `Risk-Reward ratio (${effectiveRR}R) is below minimum threshold (${minRR}R)`,
      effectiveRR,
      distancePips: 0,
    };
  }

  return { isValid: true, effectiveRR, distancePips: slDist };
}
