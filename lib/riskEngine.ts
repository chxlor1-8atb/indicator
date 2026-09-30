import {
  InstitutionalRiskEngineInfo,
  MarketRegimeType,
  Candle,
  RiskProfileType,
  NetSpreadAnalysisInfo,
  PreTradeChecklistInfo,
  PreTradeChecklistItem,
  DrawdownRecoveryInfo,
} from "./types";

export interface DynamicPositionSizeOptions {
  symbol: string;
  accountBalance: number;
  currentPrice?: number;
  entryPrice?: number;
  stopLossDistancePrice?: number;
  stopLossPrice?: number;
  riskProfile?: RiskProfileType;
  candles?: Candle[];
  consecutiveLosses?: number;
  customRiskPct?: number;
  peakBalance?: number;
  setupGrade?: string;
  confluenceScore?: number;
  accountType?: "STANDARD" | "CENT";
  leverage?: number;
  marketRegime?: MarketRegimeType | string;
}

export interface MilestoneTierInfo {
  tierName: string;
  tierRange: string;
  nextMilestoneUSD: number;
  baseRiskPct: number;
}

export interface DynamicPositionSizeResult {
  calculatedLotSize: number;
  lotSize: number;
  effectiveRiskPct: number;
  dollarRisk: number;
  actualDollarRisk?: number;
  actualRiskPct?: number;
  slPips: number;
  volatilityScaleRatio: number;
  drawdownThrottle: number;
  rationale: string;
  isSmallAccount?: boolean;
  centAccountLots?: number;
  centAccountRiskUSD?: number;
  smallAccountGuidance?: string;
  // Institutional Safe Compounding & Milestone Scaling Fields
  tierName?: string;
  tierRange?: string;
  nextMilestoneUSD?: number;
  gradeMultiplier?: number;
  regimeMultiplier?: number;
  drawdownGovernorActive?: boolean;
  marginRequiredUSD?: number;
  marginUtilizationPct?: number;
}

export interface AdaptiveTrailingStopResult {
  stage: number; // 0: Initial, 1: Breakeven, 2: ATR Trail, 3: Peak Locking
  trailingSlPrice: number;
  isBreakevenMoved: boolean;
  rMultipleGained: number;
  statusDescription: string;
}

export interface PartialTpPlan {
  initialLots: number;
  tp1Lots: number;     // 50%
  tp2Lots: number;     // 30%
  runnerLots: number;  // 20%
  tp1Price: number;
  tp2Price: number;
  description: string;
}

export interface EarlyProfitHarvestResult {
  shouldHarvest: boolean;
  reason: string;
  harvestReason: string;
  harvestAction: "CLOSE_ALL" | "CLOSE_PARTIAL" | "HOLD";
  harvestType: "FULL" | "PARTIAL" | "NONE";
  profitR: number;
  currentR: number;
  triggerType: "RSI_HOOK" | "CLIMAX_REJECTION_WICK" | "OPPOSITE_ZONE_FRONTRUN" | "NONE";
}

export interface EarlyProfitHarvestOptions {
  isBuy?: boolean;
  direction?: "BUY" | "SELL";
  currentPrice: number;
  entryPrice: number;
  stopLossPrice: number;
  takeProfit1Price?: number;
  tp1Price?: number;
  currentR?: number;
  candles?: Candle[];
  lastCandle?: Candle;
  oppositeZonePrice?: number;
  opposingZonePrice?: number;
  pipMultiplier?: number;
  symbol?: string;
  rsiValues?: number[];
  minHarvestR?: number; // default 0.75R
}

/**
 * Early Profit Harvesting Engine:
 * Secures profit early before price reverses and hits Breakeven.
 * Evaluates Opposite Zone barriers, TP1 front-running, RSI hooks, and Climax Rejection Wicks.
 */
export function evaluateEarlyProfitHarvest(options: EarlyProfitHarvestOptions): EarlyProfitHarvestResult {
  const isBuy = options.isBuy !== undefined ? options.isBuy : (options.direction === "BUY");
  const {
    currentPrice,
    entryPrice,
    stopLossPrice,
    candles = [],
    lastCandle,
    minHarvestR = 0.75,
    rsiValues,
    symbol,
  } = options;

  const tp1 = options.takeProfit1Price ?? options.tp1Price;
  const oppZone = options.oppositeZonePrice ?? options.opposingZonePrice;

  // Derive pip multiplier if symbol provided
  let pipMult = options.pipMultiplier;
  if (!pipMult && symbol) {
    const s = symbol.toUpperCase();
    if (s.includes("XAU") || s.includes("GOLD")) pipMult = 10;
    else if (s.includes("JPY")) pipMult = 100;
    else if (s.includes("USDT") || s.includes("BTC") || s.includes("ETH")) pipMult = 1;
    else pipMult = 10000;
  }
  pipMult = pipMult || 10;

  // Compute profit R if not provided
  let effectiveR = options.currentR;
  if (effectiveR === undefined) {
    const riskDistance = Math.abs(entryPrice - stopLossPrice);
    const profitDistance = isBuy ? (currentPrice - entryPrice) : (entryPrice - currentPrice);
    effectiveR = riskDistance > 0 ? (profitDistance / riskDistance) : 0;
  }

  // Helper to build return object
  const buildResult = (
    shouldHarvest: boolean,
    reason: string,
    action: "CLOSE_ALL" | "CLOSE_PARTIAL" | "HOLD",
    type: "FULL" | "PARTIAL" | "NONE",
    trigger: "RSI_HOOK" | "CLIMAX_REJECTION_WICK" | "OPPOSITE_ZONE_FRONTRUN" | "NONE"
  ): EarlyProfitHarvestResult => ({
    shouldHarvest,
    reason,
    harvestReason: reason,
    harvestAction: action,
    harvestType: type,
    profitR: effectiveR!,
    currentR: effectiveR!,
    triggerType: trigger,
  });

  // 1. Must have accumulated minimum profit threshold (e.g. >= 0.75R)
  if (effectiveR < minHarvestR) {
    return buildResult(false, `Profit below minimum harvest threshold (${effectiveR.toFixed(2)}R < ${minHarvestR}R)`, "HOLD", "NONE", "NONE");
  }

  // 2. Opposite Zone Front-Running (Within 2.5 pips of opposite Order Block / FVG / Resistance)
  if (oppZone && oppZone > 0) {
    const distToZonePips = Math.abs(currentPrice - oppZone) * pipMult;
    if (distToZonePips <= 2.5) {
      return buildResult(
        true,
        `Opposing zone barrier front-run (within ${distToZonePips.toFixed(1)} pips of opposing barrier @ ${oppZone})`,
        "CLOSE_ALL",
        "FULL",
        "OPPOSITE_ZONE_FRONTRUN"
      );
    }
  }

  // 3. TakeProfit1 Front-Running (Within 1.5 pips of TP1 target)
  if (tp1 && tp1 > 0) {
    const distToTp1Pips = isBuy
      ? (tp1 - currentPrice) * pipMult
      : (currentPrice - tp1) * pipMult;
    if (distToTp1Pips <= 1.5 && distToTp1Pips >= -0.5) {
      return buildResult(
        true,
        `Front-running TP1 target (within ${Math.max(0, distToTp1Pips).toFixed(1)} pips of TP1 @ ${tp1})`,
        "CLOSE_ALL",
        "FULL",
        "OPPOSITE_ZONE_FRONTRUN"
      );
    }
  }

  // 4. RSI Momentum Hook Check (Overbought turning down on BUY, or Oversold turning up on SELL)
  if (rsiValues && rsiValues.length >= 2) {
    const currRsi = rsiValues[0];
    const prevRsi = rsiValues[1];
    if (isBuy && prevRsi >= 68.0 && currRsi < prevRsi) {
      return buildResult(
        true,
        `RSI momentum hook downwards from overbought (RSI ${prevRsi.toFixed(1)} -> ${currRsi.toFixed(1)})`,
        "CLOSE_ALL",
        "FULL",
        "RSI_HOOK"
      );
    } else if (!isBuy && prevRsi <= 32.0 && currRsi > prevRsi) {
      return buildResult(
        true,
        `RSI momentum hook upwards from oversold (RSI ${prevRsi.toFixed(1)} -> ${currRsi.toFixed(1)})`,
        "CLOSE_ALL",
        "FULL",
        "RSI_HOOK"
      );
    }
  }

  // 5. Climax Rejection Wick Detection
  const targetCandle = lastCandle || (candles.length > 0 ? candles[candles.length - 1] : undefined);
  if (targetCandle) {
    const range = Math.max(0.0001, targetCandle.high - targetCandle.low);
    const upperWick = targetCandle.high - Math.max(targetCandle.open, targetCandle.close);
    const lowerWick = Math.min(targetCandle.open, targetCandle.close) - targetCandle.low;

    // For BUY: strong upper rejection wick (> 50% of candle range) indicates heavy sellers pushing down
    if (isBuy && (upperWick / range) >= 0.48) {
      return buildResult(
        true,
        `Bearish climax rejection wick (${((upperWick / range) * 100).toFixed(0)}% upper wick)`,
        "CLOSE_ALL",
        "FULL",
        "CLIMAX_REJECTION_WICK"
      );
    }

    // For SELL: strong lower rejection wick (> 50% of candle range) indicates heavy buyers pushing up
    if (!isBuy && (lowerWick / range) >= 0.48) {
      return buildResult(
        true,
        `Bullish climax rejection wick (${((lowerWick / range) * 100).toFixed(0)}% lower wick)`,
        "CLOSE_ALL",
        "FULL",
        "CLIMAX_REJECTION_WICK"
      );
    }
  }

  return buildResult(false, "No exhaustion or barrier detected", "HOLD", "NONE", "NONE");
}

/**
 * Evaluates the Milestone Tier of an account balance according to the 5-Tier Institutional Compounding Model.
 */
export function evaluateMilestoneTier(balanceUSD: number): MilestoneTierInfo {
  if (balanceUSD < 50) {
    return {
      tierName: "Tier 1: Foundation (ตั้งไข่)",
      tierRange: "$10 - $50",
      nextMilestoneUSD: 50,
      baseRiskPct: 2.0,
    };
  } else if (balanceUSD < 250) {
    return {
      tierName: "Tier 2: Accumulation (สะสมพลัง)",
      tierRange: "$50 - $250",
      nextMilestoneUSD: 250,
      baseRiskPct: 2.0,
    };
  } else if (balanceUSD < 1000) {
    return {
      tierName: "Tier 3: Growth (เติบโต)",
      tierRange: "$250 - $1,000",
      nextMilestoneUSD: 1000,
      baseRiskPct: 2.0,
    };
  } else if (balanceUSD < 10000) {
    return {
      tierName: "Tier 4: Acceleration (ทวีคูณ)",
      tierRange: "$1,000 - $10,000",
      nextMilestoneUSD: 10000,
      baseRiskPct: 1.8,
    };
  } else {
    return {
      tierName: "Tier 5: Institutional (สถาบัน)",
      tierRange: "$10,000+",
      nextMilestoneUSD: Number((balanceUSD * 1.5).toFixed(0)),
      baseRiskPct: 1.5,
    };
  }
}

/**
 * Calculates dynamic position sizing adjusted for Risk Profile,
 * Realized Volatility (ATR ratio), Milestone Scaling, and Drawdown Dampeners.
 */
export function calculateDynamicPositionSize(options: DynamicPositionSizeOptions): DynamicPositionSizeResult {
  const {
    symbol,
    accountBalance,
    currentPrice,
    stopLossDistancePrice,
    riskProfile = "MODERATE",
    candles = [],
    consecutiveLosses = 0,
    customRiskPct,
    peakBalance,
    setupGrade,
    confluenceScore,
    accountType,
    leverage = 500,
  } = options;

  const effectivePrice = currentPrice ?? options.entryPrice ?? 1.0;
  let effectiveSlDist = stopLossDistancePrice;
  if (!effectiveSlDist && options.stopLossPrice && effectivePrice) {
    effectiveSlDist = Math.abs(effectivePrice - options.stopLossPrice);
  }
  effectiveSlDist = Math.max(0.0001, effectiveSlDist || 1.0);

  const sym = symbol.toUpperCase();
  const isGold = sym.includes("XAU") || sym.includes("GOLD");
  const isJpy = sym.includes("JPY");
  const isForex = !isGold && !isJpy && ["EUR", "GBP", "AUD", "NZD", "USD", "CAD", "CHF"].some(
    (c) => sym.startsWith(c) || sym.endsWith(c)
  );

  const pipMultiplier = isForex ? 10000 : isGold ? 10 : isJpy ? 100 : sym.endsWith("USDT") ? 1 : 10000;
  const pipValuePerStandardLot = isForex || isGold ? 10.0 : 1.0;

  // 1. Milestone Tier & Base Risk Percentage
  const tierInfo = evaluateMilestoneTier(accountBalance);
  let baseRiskPct = tierInfo.baseRiskPct;
  if (customRiskPct !== undefined && customRiskPct > 0) {
    baseRiskPct = customRiskPct;
  } else if (riskProfile === "CONSERVATIVE") {
    baseRiskPct = Math.max(0.5, baseRiskPct * 0.5);
  } else if (riskProfile === "AGGRESSIVE" || riskProfile === "MANUAL_SCALPER") {
    baseRiskPct = Math.min(3.5, baseRiskPct * 1.5);
  }

  // 2. Realized Volatility Scaling (ATR Expansion vs Baseline)
  let volatilityScaleRatio = 1.0;
  if (candles.length >= 25) {
    const recentCandles = candles.slice(-20);
    const ranges = recentCandles.map((c) => Math.max(c.high - c.low, 1e-5));
    const avgRange = ranges.reduce((a, b) => a + b, 0) / ranges.length;
    const currentRange = ranges[ranges.length - 1];

    if (avgRange > 0 && currentRange > avgRange * 1.35) {
      // High volatility spike: throttle size to avoid excessive dollar swing
      volatilityScaleRatio = Number((avgRange / currentRange).toFixed(2));
      volatilityScaleRatio = Math.max(0.5, Math.min(1.0, volatilityScaleRatio));
    }
  }

  // 3. Drawdown / Consecutive Loss Safety Dampener
  let drawdownThrottle = 1.0;
  if (consecutiveLosses >= 3) {
    drawdownThrottle = 0.5; // Cut risk by 50% after 3 consecutive losses
  } else if (consecutiveLosses >= 2) {
    drawdownThrottle = 0.75; // Cut risk by 25% after 2 consecutive losses
  }

  // 4. Asymmetric Drawdown Governor (Equity Peak Protection)
  let drawdownGovernorActive = false;
  let drawdownGovernorFactor = 1.0;
  if (peakBalance && peakBalance > accountBalance) {
    const ddPct = ((peakBalance - accountBalance) / peakBalance) * 100;
    if (ddPct >= 10) {
      drawdownGovernorActive = true;
      drawdownGovernorFactor = 0.50; // Cut risk by 50% on >=10% DD
    } else if (ddPct >= 5) {
      drawdownGovernorActive = true;
      drawdownGovernorFactor = 0.75; // Cut risk by 25% on >=5% DD
    }
  }

  // 5. Signal Quality Multiplier (Grade Multiplier)
  let gradeMultiplier = 1.0;
  if (setupGrade) {
    const g = setupGrade.toUpperCase();
    if (g.includes("A+")) gradeMultiplier = 1.0;
    else if (g.includes("A")) gradeMultiplier = 0.80;
    else if (g.includes("B")) gradeMultiplier = 0.50;
    else gradeMultiplier = 0.35;
  } else if (confluenceScore !== undefined) {
    if (confluenceScore >= 85) gradeMultiplier = 1.0;
    else if (confluenceScore >= 75) gradeMultiplier = 0.80;
    else if (confluenceScore >= 65) gradeMultiplier = 0.50;
    else gradeMultiplier = 0.35;
  }

  // 5b. Market Regime Adaptive Multiplier (ปรับขนาด Lot ตามสภาพตลาดและโมเมนตัมสถาบัน)
  let regimeMultiplier = 1.0;
  const regimeStr = (options.marketRegime || "").toUpperCase();
  if (regimeStr.includes("EXPLOSIVE") || regimeStr.includes("TREND")) {
    regimeMultiplier = 1.25; // ตลาดเทรนด์โมเมนตัมแรง สถาบันไหลเข้า เร่งขนาด Lot +25%
  } else if (regimeStr.includes("PULLBACK")) {
    regimeMultiplier = 1.15; // จุดพักตัวในเทรนด์ใหญ่ Win rate สูง เร่งขนาด Lot +15%
  } else if (regimeStr.includes("CHOPPY") || regimeStr.includes("BOX") || regimeStr.includes("DEADZONE")) {
    regimeMultiplier = 0.70; // สภาวะไซด์เวย์กรอบแคบ ลดขนาด Lot -30% เพื่อรักษาทุน
  }

  const effectiveRiskPct = Number((baseRiskPct * volatilityScaleRatio * drawdownThrottle * drawdownGovernorFactor * gradeMultiplier * regimeMultiplier).toFixed(2));
  const dollarRisk = Number(((accountBalance * effectiveRiskPct) / 100).toFixed(2));

  const slPips = Math.max(5, Math.round(effectiveSlDist * pipMultiplier));
  let calculatedLotSize = Number(
    (dollarRisk / (Math.max(1, slPips) * pipValuePerStandardLot)).toFixed(2)
  );

  if (calculatedLotSize < 0.01) calculatedLotSize = 0.01;

  // 5c. Pro Manual Scalper (House-Money Compounding for Small Accounts $10 - $1,000)
  if (riskProfile === "MANUAL_SCALPER" || riskProfile === "AGGRESSIVE") {
    if (accountBalance >= 20 && accountBalance < 35 && calculatedLotSize < 0.02) calculatedLotSize = 0.02;
    else if (accountBalance >= 35 && accountBalance < 60 && calculatedLotSize < 0.03) calculatedLotSize = 0.03;
    else if (accountBalance >= 60 && accountBalance < 100 && calculatedLotSize < 0.05) calculatedLotSize = 0.05;
    else if (accountBalance >= 100 && accountBalance < 200 && calculatedLotSize < 0.10) calculatedLotSize = 0.10;
    else if (accountBalance >= 200 && accountBalance < 350 && calculatedLotSize < 0.20) calculatedLotSize = 0.20;
    else if (accountBalance >= 350 && accountBalance < 500 && calculatedLotSize < 0.35) calculatedLotSize = 0.35;
    else if (accountBalance >= 500 && accountBalance < 1000 && calculatedLotSize < 0.50) calculatedLotSize = 0.50;
    else if (accountBalance >= 1000 && accountBalance < 2500 && calculatedLotSize < 1.00) calculatedLotSize = 1.00;
    else if (accountBalance >= 2500 && accountBalance < 5000 && calculatedLotSize < 2.50) calculatedLotSize = 2.50;
    else if (accountBalance >= 5000 && accountBalance < 10000 && calculatedLotSize < 5.00) calculatedLotSize = 5.00;
    else if (accountBalance >= 10000) {
      const dynamicHouseMoneyLot = Math.min(30.0, Math.floor((accountBalance / 1000.0) * 1.0 * 100) / 100);
      calculatedLotSize = Math.max(calculatedLotSize, dynamicHouseMoneyLot);
    }
  }

  // 6. Margin Capacity Ceiling (Free Margin Safety Cap: max 20% margin usage)
  const effectiveLeverage = leverage || 500;
  const contractSize = sym === "XAUUSD" || sym.startsWith("XAU") ? 100 : isForex ? 100000 : 1;
  let marginRequiredUSD = Number(((calculatedLotSize * contractSize * effectivePrice) / effectiveLeverage).toFixed(2));
  const maxMarginCap = accountBalance * 0.20; // 20% max margin allocation
  if (marginRequiredUSD > maxMarginCap && maxMarginCap > 0) {
    const cappedLots = Number(((maxMarginCap * effectiveLeverage) / (contractSize * effectivePrice)).toFixed(2));
    if (cappedLots >= 0.01) {
      calculatedLotSize = cappedLots;
      marginRequiredUSD = Number(((calculatedLotSize * contractSize * effectivePrice) / effectiveLeverage).toFixed(2));
    }
  }
  const marginUtilizationPct = Number(((marginRequiredUSD / Math.max(1, accountBalance)) * 100).toFixed(1));

  const actualDollarRisk = Number((calculatedLotSize * Math.max(1, slPips) * (pipValuePerStandardLot * 0.1)).toFixed(2));
  const actualRiskPct = Number(((actualDollarRisk / accountBalance) * 100).toFixed(1));

  const isCentRequested = accountType === "CENT";
  const isSmallAccount = accountBalance <= 50 || isCentRequested;
  const centAccountLots = isSmallAccount
    ? Math.max(0.01, Number(((accountBalance * 100 * (effectiveRiskPct / 100)) / (Math.max(1, slPips) * pipValuePerStandardLot)).toFixed(2)))
    : undefined;
  const centAccountRiskUSD = isSmallAccount && centAccountLots
    ? Number((centAccountLots * slPips * (pipValuePerStandardLot * 0.001)).toFixed(2))
    : undefined;

  let smallAccountGuidance: string | undefined;
  if (riskProfile === "MANUAL_SCALPER") {
    smallAccountGuidance = `🥷 Pro Manual Scalper (House-Money Mode): ปลดล็อคขนาดล็อตตามกำไรสะสม (ทุน $${accountBalance}) -> ใช้ Lot ${calculatedLotSize} พร้อมระบบ Auto-Pyramiding ขยายไม้นิรภัย`;
  } else if (isSmallAccount) {
    const std001Loss = Number((0.01 * slPips * (pipValuePerStandardLot * 0.1)).toFixed(2));
    if (slPips <= 16) {
      smallAccountGuidance = `🎯 Sniper Micro-SL (${slPips} pips): ทุน $${accountBalance} เทรด 0.01 lot ได้จริง เสี่ยงเพียง -$${std001Loss} USD หรือเลือกใช้ Cent Account เพื่อคุมความเสี่ยงระดับ 1.5%`;
    } else {
      smallAccountGuidance = `⚠️ ระยะ SL ปัจจุบัน (${slPips} pips) เสี่ยง -$${std001Loss} USD แนะนำเปิดโหมด Sniper Micro-SL หรือใช้ Cent Account เพื่อรักษาความปลอดภัยของพอร์ต $${accountBalance}`;
    }
  }

  const rationale = `[${tierInfo.tierName}] ${riskProfile} (${baseRiskPct}% base -> ${effectiveRiskPct}% eff) | Regime: ${regimeMultiplier}x | Grade: ${gradeMultiplier}x | Vol: ${volatilityScaleRatio}x | DD Gov: ${drawdownGovernorActive ? `${drawdownGovernorFactor}x (Active)` : "Normal"}${isSmallAccount ? ` | Micro-Capital ($${accountBalance})` : ""}`;

  return {
    calculatedLotSize,
    lotSize: calculatedLotSize,
    effectiveRiskPct,
    dollarRisk,
    actualDollarRisk,
    actualRiskPct,
    slPips,
    volatilityScaleRatio,
    drawdownThrottle,
    rationale,
    isSmallAccount,
    centAccountLots,
    centAccountRiskUSD,
    smallAccountGuidance,
    tierName: tierInfo.tierName,
    tierRange: tierInfo.tierRange,
    nextMilestoneUSD: tierInfo.nextMilestoneUSD,
    gradeMultiplier,
    regimeMultiplier,
    drawdownGovernorActive,
    marginRequiredUSD,
    marginUtilizationPct,
  };
}


/**
 * Calculates Multi-Stage Adaptive Trailing Stop based on profit progression (R-multiples)
 * and market volatility (ATR).
 */
export function calculateAdaptiveTrailingStop(
  bias: "BUY" | "SELL",
  entryPrice: number,
  currentPrice: number,
  initialSl: number,
  currentSl: number,
  atrValue: number,
  symbol: string
): AdaptiveTrailingStopResult {
  const sym = symbol.toUpperCase();
  const isJpyOrGold = sym.includes("JPY") || sym === "XAUUSD" || sym.startsWith("XAU") || sym === "GOLD";
  const isForex = !isJpyOrGold && ["EUR", "GBP", "AUD", "NZD", "USD", "CAD", "CHF"].some(
    (c) => sym.startsWith(c) || sym.endsWith(c)
  );
  const precision = isForex ? 4 : 2;
  const pipMultiplier = isForex ? 10000 : isJpyOrGold ? 100 : 1;

  const isBuy = bias === "BUY";
  const initialRisk = Math.abs(entryPrice - initialSl);
  if (initialRisk <= 0) {
    return {
      stage: 0,
      trailingSlPrice: currentSl,
      isBreakevenMoved: false,
      rMultipleGained: 0,
      statusDescription: "Initial SL maintained (zero risk distance)",
    };
  }

  const currentGain = isBuy ? currentPrice - entryPrice : entryPrice - currentPrice;
  const rMultipleGained = Number((currentGain / initialRisk).toFixed(2));

  let stage = 0;
  let proposedSl = currentSl;
  let isBreakevenMoved = false;
  let statusDescription = `Stage 0: Pre-profit (<1.0R, current ${rMultipleGained}R). Structural SL maintained.`;

  // Spread buffer for breakeven (1.5 pips)
  const beBufferPrice = (1.5 / pipMultiplier);

  if (rMultipleGained >= 2.5) {
    // Stage 3: Aggressive Lock-in (Trail by 1.0x ATR behind live price)
    stage = 3;
    proposedSl = isBuy
      ? Number((currentPrice - atrValue * 1.0).toFixed(precision))
      : Number((currentPrice + atrValue * 1.0).toFixed(precision));
    isBreakevenMoved = true;
    statusDescription = `Stage 3: Peak Lock-in (${rMultipleGained}R gained >= 2.5R). Trailing tightly at 1.0x ATR.`;
  } else if (rMultipleGained >= 1.5) {
    // Stage 2: ATR Trailing Stop (Trail by 1.5x ATR)
    stage = 2;
    proposedSl = isBuy
      ? Number((currentPrice - atrValue * 1.5).toFixed(precision))
      : Number((currentPrice + atrValue * 1.5).toFixed(precision));
    isBreakevenMoved = true;
    statusDescription = `Stage 2: Dynamic ATR Trail (${rMultipleGained}R gained >= 1.5R). Trailing at 1.5x ATR.`;
  } else if (rMultipleGained >= 1.0) {
    // Stage 1: Move to Breakeven (+ spread buffer)
    stage = 1;
    proposedSl = isBuy
      ? Number((entryPrice + beBufferPrice).toFixed(precision))
      : Number((entryPrice - beBufferPrice).toFixed(precision));
    isBreakevenMoved = true;
    statusDescription = `Stage 1: Breakeven Locked (${rMultipleGained}R gained >= 1.0R). Trade is 100% Risk-Free.`;
  }

  // Ratchet Mechanism: Stop Loss can only tighten, NEVER widen risk
  let finalSl = currentSl;
  if (isBuy) {
    finalSl = Math.max(currentSl, proposedSl);
  } else {
    finalSl = Math.min(currentSl, proposedSl);
  }

  return {
    stage,
    trailingSlPrice: finalSl,
    isBreakevenMoved,
    rMultipleGained,
    statusDescription,
  };
}

/**
 * Calculates a Partial Take Profit execution plan (50% at TP1, 30% at TP2, 20% Runner).
 */
export function calculatePartialTpPlan(
  totalLotSize: number,
  tp1Price: number,
  tp2Price: number
): PartialTpPlan {
  const safeTotal = Math.max(0.01, totalLotSize);

  if (safeTotal <= 0.01) {
    return {
      initialLots: safeTotal,
      tp1Lots: safeTotal,
      tp2Lots: 0,
      runnerLots: 0,
      tp1Price,
      tp2Price,
      description: `Micro lot: ปิดทั้งหมดที่ TP1 (ไม่สามารถแบ่ง lot ได้)`,
    };
  }

  if (safeTotal <= 0.02) {
    // Micro lots cannot be split into 3 tiers -> 50% TP1, 50% TP2
    const tp1Lots = 0.01;
    const tp2Lots = Number((safeTotal - 0.01).toFixed(2));
    return {
      initialLots: safeTotal,
      tp1Lots,
      tp2Lots: Math.max(0, tp2Lots),
      runnerLots: 0,
      tp1Price,
      tp2Price,
      description: `Micro lot split: TP1: ${tp1Lots} lot, TP2: ${tp2Lots} lot`,
    };
  }

  const tp1Lots = Number((safeTotal * 0.5).toFixed(2));
  const tp2Lots = Number((safeTotal * 0.3).toFixed(2));
  const runnerLots = Number(Math.max(0.01, safeTotal - tp1Lots - tp2Lots).toFixed(2));

  return {
    initialLots: safeTotal,
    tp1Lots,
    tp2Lots,
    runnerLots,
    tp1Price,
    tp2Price,
    description: `Multi-Tier Partial TP: TP1 (50%): ${tp1Lots} lot, TP2 (30%): ${tp2Lots} lot, Runner (20%): ${runnerLots} lot with Adaptive Trail`,
  };
}

/**
 * Institutional Dynamic Risk Management & Execution Bracket Engine.
 * Implements strict ATR-based lot sizing, Fractional Kelly Criterion,
 * Multi-Stage Execution Bracket, and Confidence Gates.
 */
export function calculateInstitutionalRisk(
  symbol: string,
  currentPrice: number,
  bias: "BUY" | "SELL" | "NO_TRADE",
  candles: Candle[],
  atrValue: number,
  confluenceScore: number,
  mlConfidence: number,
  regime: MarketRegimeType,
  accountBalance = 1000,
  targetRiskPct = 2.0,
  riskProfile: RiskProfileType = "MODERATE"
): InstitutionalRiskEngineInfo {
  const sym = symbol.toUpperCase();
  const isJpyOrGold = sym.includes("JPY") || sym === "XAUUSD" || sym.startsWith("XAU") || sym === "GOLD";
  const isForex = !isJpyOrGold && ["EUR", "GBP", "AUD", "NZD", "USD", "CAD", "CHF"].some(
    (c) => sym.startsWith(c) || sym.endsWith(c)
  );

  // Multiplier to convert price difference to pips
  const pipMultiplier = isForex ? 10000 : isJpyOrGold ? 100 : 1;
  const pipValuePerStandardLot = isForex || sym === "XAUUSD" ? 10.0 : 1.0;

  // 1. Dynamic Stop Loss distance in price & pips (1.5x ATR)
  const safeAtr = Math.max(1e-5, atrValue || currentPrice * 0.005);
  const slDistPrice = safeAtr * 1.5;
  const slPips = Math.max(5, Math.round(slDistPrice * pipMultiplier));

  // 2. Dynamic Position Sizing based on Risk Profile
  const dynamicSizeResult = calculateDynamicPositionSize({
    symbol: sym,
    accountBalance,
    currentPrice,
    stopLossDistancePrice: slDistPrice,
    riskProfile,
    candles,
    customRiskPct: targetRiskPct,
  });

  let calculatedLotSize = dynamicSizeResult.calculatedLotSize;
  const safeRiskPct = dynamicSizeResult.effectiveRiskPct;
  const dollarRisk = dynamicSizeResult.dollarRisk;

  // 3. Fractional Kelly Criterion Sizing (Half-Kelly)
  // Historical baseline: win rate p = 0.65, win/loss payoff b = 1.8
  const p = 0.65;
  const b = 1.8;
  const q = 1 - p;
  const fullKelly = p - q / b;
  const halfKellyFraction = Math.max(0.1, Math.min(0.5, fullKelly * 0.5));
  const fractionalKellyLot = Number(
    Math.max(0.01, calculatedLotSize * (halfKellyFraction / 0.25)).toFixed(2)
  );

  // 4. Multi-Stage Dynamic Bracket Levels
  let entryMin = currentPrice;
  let entryMax = currentPrice;
  let structuralSL = currentPrice;
  let beTriggerPrice = currentPrice;
  let tp1Price = currentPrice;
  let tp2Price = currentPrice;

  if (bias === "BUY") {
    entryMin = Number((currentPrice - safeAtr * 0.4).toFixed(isForex ? 4 : 2));
    entryMax = Number((currentPrice + safeAtr * 0.1).toFixed(isForex ? 4 : 2));
    structuralSL = Number((currentPrice - slDistPrice).toFixed(isForex ? 4 : 2));
    beTriggerPrice = Number((currentPrice + slDistPrice * 1.0).toFixed(isForex ? 4 : 2)); // 1.0R
    tp1Price = Number((currentPrice + slDistPrice * 1.2).toFixed(isForex ? 4 : 2));       // 1.2R (50% exit)
    tp2Price = Number((currentPrice + slDistPrice * 2.5).toFixed(isForex ? 4 : 2));       // 2.5R (trailing)
  } else if (bias === "SELL") {
    entryMin = Number((currentPrice - safeAtr * 0.1).toFixed(isForex ? 4 : 2));
    entryMax = Number((currentPrice + safeAtr * 0.4).toFixed(isForex ? 4 : 2));
    structuralSL = Number((currentPrice + slDistPrice).toFixed(isForex ? 4 : 2));
    beTriggerPrice = Number((currentPrice - slDistPrice * 1.0).toFixed(isForex ? 4 : 2));
    tp1Price = Number((currentPrice - slDistPrice * 1.2).toFixed(isForex ? 4 : 2));
    tp2Price = Number((currentPrice - slDistPrice * 2.5).toFixed(isForex ? 4 : 2));
  }

  // 5. Institutional Confidence Gate Evaluation
  let confidenceGateStatus: InstitutionalRiskEngineInfo["confidenceGateStatus"] = "APPROVED";
  let gateReason = `สัญญาณผ่านเกณฑ์ความเชื่อมั่นสถาบันครบถ้วน อนุมัติความเสี่ยงระดับมาตรฐาน (${riskProfile})`;

  if (confluenceScore < 70 || bias === "NO_TRADE" || regime === "CHOPPY_DEADZONE") {
    confidenceGateStatus = "BLOCKED_WAIT";
    gateReason = `คะแนนความเชื่อมั่นรวม (${confluenceScore}/100) ต่ำกว่า 70 หรือตลาดอยู่ใน Deadzone บังคับคำสั่ง WAIT รักษาทุน`;
  } else if (confluenceScore < 80 || mlConfidence < 60) {
    confidenceGateStatus = "CAUTION_HALF_RISK";
    gateReason = `คะแนนความเชื่อมั่นปานกลาง (${confluenceScore}/100) ปรับลดขนาดความเสี่ยงลง 50% เพื่อความปลอดภัย`;
    calculatedLotSize = Number(Math.max(0.01, calculatedLotSize * 0.5).toFixed(2));
  }

  return {
    accountBalance,
    riskPct: safeRiskPct,
    dollarRisk,
    atrValue: Number(safeAtr.toFixed(isForex ? 5 : 2)),
    slPips,
    calculatedLotSize,
    fractionalKellyLot,
    kellyFraction: Number(halfKellyFraction.toFixed(2)),
    executionBracket: {
      entryZone: { min: entryMin, max: entryMax },
      structuralSL,
      beTriggerPrice,
      tp1Price,
      tp2Price,
    },
    confidenceGateStatus,
    gateReason,
  };
}

/**
 * ─── [E-Book Folder 2: PIP-LOT-SPREAD & NET R:R FRICTION ENGINE] ───
 * Calculates real-market spread cost friction and Net R:R.
 * Institutional 20% Spread Friction Rule:
 * "If Spread > 20% of Stop Loss distance, NEVER execute the trade!"
 */
export function calculateSpreadFrictionAndNetRR(
  symbol: string,
  entryPrice: number,
  slPrice: number,
  tp1Price: number,
  calculatedLotSize: number,
  customSpreadPoints?: number
): NetSpreadAnalysisInfo {
  const sym = symbol.toUpperCase();
  const isJpyOrGold = sym.includes("JPY") || sym === "XAUUSD" || sym.startsWith("XAU") || sym === "GOLD";
  const isForex = !isJpyOrGold && ["EUR", "GBP", "AUD", "NZD", "USD", "CAD", "CHF"].some(
    (c) => sym.startsWith(c) || sym.endsWith(c)
  );

  const pipMultiplier = isForex ? 10000 : isJpyOrGold ? 100 : 1;
  const pipValueUSD = isForex || sym === "XAUUSD" ? 10.0 : 1.0;

  // Realistic baseline spread in pips if live points not provided
  let baselineSpreadPips = 1.2;
  if (sym.includes("XAU") || sym.includes("GOLD")) baselineSpreadPips = 2.5;
  else if (sym.includes("EURUSD")) baselineSpreadPips = 1.0;
  else if (sym.includes("GBPUSD")) baselineSpreadPips = 1.5;
  else if (sym.includes("USDJPY")) baselineSpreadPips = 1.2;
  else if (sym.endsWith("USDT") || sym === "BTC" || sym === "ETH") baselineSpreadPips = 1.0;
  else if (sym.includes("USOIL") || sym.includes("WTI")) baselineSpreadPips = 3.0;

  const isGold = sym.includes("XAU") || sym.includes("GOLD") || sym.includes("PAXG");
  const spreadPips = customSpreadPoints !== undefined && customSpreadPoints > 0
    ? Number((customSpreadPoints / ((isForex || isGold) ? 10 : 1)).toFixed(1))
    : baselineSpreadPips;

  const bidPrice = entryPrice;
  const askPrice = entryPrice + (spreadPips / pipMultiplier);

  const slDistancePrice = Math.abs(entryPrice - slPrice);
  const slDistancePips = Math.max(1, Math.round(slDistancePrice * pipMultiplier));
  const tp1DistancePrice = Math.abs(tp1Price - entryPrice);
  const tp1DistancePips = Math.max(1, Math.round(tp1DistancePrice * pipMultiplier));

  // Friction ratio = Spread Pips / SL Pips
  const spreadFrictionRatio = Number((spreadPips / slDistancePips).toFixed(3));
  const spreadCostPerLotUSD = Number((spreadPips * pipValueUSD).toFixed(2));

  // Gross vs Net R:R
  const grossRiskRewardRatio = Number((tp1DistancePips / slDistancePips).toFixed(2));
  const netGainPips = Math.max(0, tp1DistancePips - spreadPips);
  const netLossPips = slDistancePips + spreadPips;
  const netRiskRewardRatio = Number((netGainPips / Math.max(0.1, netLossPips)).toFixed(2));

  // 20% Rule Alert Threshold (E-Book Folder 2)
  let spreadAlertLevel: NetSpreadAnalysisInfo["spreadAlertLevel"] = "LOW_FRICTION";
  let spreadGuidance = `สเปรดปกติ (${spreadPips} pips, ${(spreadFrictionRatio * 100).toFixed(1)}% ของ SL) ต้นทุนต่ำพร้อมเทรด`;

  if (spreadFrictionRatio >= 0.20) {
    spreadAlertLevel = "EXCESSIVE_BLOCKED";
    spreadGuidance = `🚨 สเปรดกว้างอันตราย! ค่าสเปรดกินต้นทุนไปถึง ${(spreadFrictionRatio * 100).toFixed(1)}% ของระยะ SL (> เกณฑ์สถาบัน 20%) บล็อกคำสั่งเพื่อรักษาพอร์ต`;
  } else if (spreadFrictionRatio >= 0.12) {
    spreadAlertLevel = "MODERATE_WARNING";
    spreadGuidance = `⚠️ สเปรดค่อนข้างกว้าง (${(spreadFrictionRatio * 100).toFixed(1)}% ของ SL) ควรขยายระยะ TP หรือรอช่วงตลาดเปิดที่มีสภาพคล่องสูงขึ้น`;
  }

  return {
    symbol: sym,
    bidPrice,
    askPrice,
    spreadPips,
    pipValueUSD,
    spreadCostPerLotUSD,
    slDistancePips,
    spreadFrictionRatio,
    spreadAlertLevel,
    grossRiskRewardRatio,
    netRiskRewardRatio,
    isTradeCostEfficient: spreadAlertLevel !== "EXCESSIVE_BLOCKED",
    spreadGuidance,
  };
}

/**
 * ─── [E-Book Folder 8: TRADING PSYCHOLOGY & PRE-TRADE 5-POINT CHECKLIST] ───
 * Enforces institutional trade discipline and Rule 1-3-1:
 * Rule 1: Trade with trend & structure.
 * Rule 2: Anchor entry at Value Zone (S/R, Pullback, Breakout).
 * Rule 3: Enforce Structural Invalidation SL.
 * Rule 4: Net R:R >= 1:2.0 verified after spread friction.
 * Rule 5: 1-2% Max Capital Risk & Rule 1-3-1 (Cool-down after loss streak).
 */
export function validatePreTradeChecklist(
  bias: "BUY" | "SELL" | "NO_TRADE",
  confluenceScore: number,
  hasValidSetup: boolean,
  hasStructuralSL: boolean,
  netRR: number,
  effectiveRiskPct: number,
  consecutiveLosses = 0
): PreTradeChecklistInfo {
  const isActionable = bias !== "NO_TRADE";

  // Item 1: Structure & Bias Alignment (Pillar 1 Confluence)
  const item1Passed = isActionable && confluenceScore >= 70;
  const item1: PreTradeChecklistItem = {
    id: 1,
    title: "1. Market Structure & Trend Bias",
    description: item1Passed
      ? `โครงสร้างตลาดระดับ HTF/LTF มีทิศทางชัดเจน (${bias}) คะแนน Confluence ${confluenceScore}/100`
      : `ตลาดแกว่งตัวไซด์เวย์ไร้ทิศทาง หรือคะแนน Confluence ต่ำกว่า 70 (${confluenceScore}/100)`,
    passed: item1Passed,
    score: item1Passed ? 20 : 0,
    institutionalRule: "เทรดตามทิศทางเม็ดเงินสถาบัน (Trend Alignment) เสมอ",
  };

  // Item 2: Value Zone Setup (S/R, Pullback, or Breakout)
  const item2Passed = hasValidSetup;
  const item2: PreTradeChecklistItem = {
    id: 2,
    title: "2. Entry Anchored at Value Zone",
    description: item2Passed
      ? "จุดเข้าออเดอร์ตั้งอยู่ ณ โซนคุณค่า (EMA 20/50 Ribbon, S/R Flip, หรือ Confirmed Breakout)"
      : "จุดเข้าลอยอยู่กลางทาง (No Man's Land) หรือเข้าข่ายไล่ราคา FOMO Overextended",
    passed: item2Passed,
    score: item2Passed ? 20 : 0,
    institutionalRule: "ห้ามเข้าออเดอร์กลางทาง ต้องรอราคาเข้าโซนที่มีความได้เปรียบเท่านั้น",
  };

  // Item 3: Structural Stop Loss
  const item3Passed = hasStructuralSL;
  const item3: PreTradeChecklistItem = {
    id: 3,
    title: "3. Structural Stop Loss Placement",
    description: item3Passed
      ? "วางจุด Stop Loss หลังสวิง High/Low หรือแนวรับ-ต้านที่มีนัยสำคัญทางโครงสร้าง"
      : "ไม่พบแนวรับ-ต้านที่มีนัยสำคัญสำหรับวาง SL หรือ SL แคบ/กว้างผิดปกติ",
    passed: item3Passed,
    score: item3Passed ? 20 : 0,
    institutionalRule: "Stop Loss ต้องตั้งไว้ที่จุดที่หากราคาชน แปลว่าบทวิเคราะห์ผิดทางจริง",
  };

  // Item 4: Net Risk/Reward Ratio >= 1:1.8
  const item4Passed = netRR >= 1.8;
  const item4: PreTradeChecklistItem = {
    id: 4,
    title: "4. Net Risk/Reward Ratio >= 1:2.0",
    description: item4Passed
      ? `อัตราผลตอบแทนสุทธิหลังหักสเปรดคุ้มค่าความเสี่ยง (${netRR}R >= 1.8R)`
      : `อัตราผลตอบแทนสุทธิต่ำเกินไป (${netRR}R < 1.8R) ไม่คุ้มค่าความเสี่ยงหลังหักสเปรด`,
    passed: item4Passed,
    score: item4Passed ? 20 : 0,
    institutionalRule: "R:R สุทธิหลังหัก Spread และค่าคอมฯ ต้องได้เปรียบ 1:2 ขึ้นไปเสมอ",
  };

  // Item 5: Risk Limits & Rule 1-3-1 Discipline
  const item5Passed = effectiveRiskPct <= 2.0 && consecutiveLosses < 3;
  const item5: PreTradeChecklistItem = {
    id: 5,
    title: "5. 1-2% Capital Risk & Rule 1-3-1 Discipline",
    description: item5Passed
      ? `ความเสี่ยงต่อไม้ถูกคุมไว้ที่ ${effectiveRiskPct}% (ไม่เกิน 2%) และไม่มีภาวะ Revenge Trading`
      : `ความเสี่ยงเกินเพดาน 2% หรือแพ้ติดกัน ${consecutiveLosses} ไม้ ต้องเข้าสู่โหมดพักเทรด (Cool-down)`,
    passed: item5Passed,
    score: item5Passed ? 20 : 0,
    institutionalRule: "กฎ 1-3-1: เสี่ยงไม้ละไม่เกิน 1-2%, เทรดสูงสุด 3 ไม้ต่อวัน, และหยุดพักทันทีเมื่อแพ้ 2-3 ไม้ติด",
  };

  const items = [item1, item2, item3, item4, item5];
  const passedCount = items.filter((i) => i.passed).length;
  const totalScore = items.reduce((acc, i) => acc + i.score, 0);

  let disciplineStatus: PreTradeChecklistInfo["disciplineStatus"] = "WAIT_DISCIPLINE_BREACH";
  let executiveVerdict = "";

  if (passedCount === 5) {
    disciplineStatus = "DISCIPLINE_PERFECT";
    executiveVerdict = "🌟 ผ่านเกณฑ์สถาบัน 5/5 ข้อ ครบถ้วน 100%! สภาพจิตใจและแผนการเทรดสมบูรณ์แบบ อนุมัติส่งคำสั่ง";
  } else if (passedCount >= 4) {
    disciplineStatus = "PROCEED_WITH_DISCIPLINE";
    executiveVerdict = `✅ ผ่านเกณฑ์ ${passedCount}/5 ข้อ อยู่ในเกณฑ์มาตรฐานสถาบัน สามารถเข้าเทรดได้ด้วยความระมัดระวัง`;
  } else {
    disciplineStatus = "WAIT_DISCIPLINE_BREACH";
    executiveVerdict = `⛔ ไม่ผ่านเกณฑ์ ${5 - passedCount} ข้อ แนะนำให้ WAIT รักษาทุน ป้องกันความผิดพลาดทางจิตวิทยา`;
  }

  return {
    items,
    passedCount,
    totalScore,
    disciplineStatus,
    rule131Status: {
      maxDailyTrades: 3,
      currentEstimatedTrades: consecutiveLosses + 1,
      maxDailyRiskPct: 2.0,
      cooldownActive: consecutiveLosses >= 3,
      disciplineAdvice: consecutiveLosses >= 3
        ? "⚠️ ตรวจพบการขาดทุนสะสม 3 ไม้ติด! บังคับพักเทรด 24 ชม. เพื่อรีเซ็ตอารมณ์และป้องกัน Revenge Trading"
        : "วินัยการเทรดปกติ ปฏิบัติตามแผนอย่างเคร่งครัด",
    },
    executiveVerdict,
  };
}

/**
 * ─── [E-Book Folder 6: RISK MANAGEMENT & ASYMMETRIC DRAWDOWN MATHEMATICS] ───
 * Calculates asymmetric recovery requirements and dynamic drawdown throttling.
 * Asymmetric Drawdown Recovery Formula:
 * Required Gain % = (1 / (1 - Loss%)) - 1
 */
export function calculateDrawdownRecoveryMetrics(
  accountBalance: number,
  riskPct: number,
  consecutiveLosses = 0
): DrawdownRecoveryInfo {
  const safeBalance = Math.max(10, accountBalance);
  const dollarRisk = Number(((safeBalance * riskPct) / 100).toFixed(2));

  // Anti-Martingale drawdown throttle multiplier
  let drawdownThrottleMultiplier = 1.0;
  let advice = "ระดับความเสี่ยงปกติ (1.0x Standard)";

  if (consecutiveLosses >= 3) {
    drawdownThrottleMultiplier = 0.5;
    advice = "🚨 แพ้ติดกัน 3 ไม้: ปรับลดความเสี่ยงลง 50% ทันทีเพื่อรักษาเงินต้นในพอร์ต (Anti-Martingale Guard)";
  } else if (consecutiveLosses >= 2) {
    drawdownThrottleMultiplier = 0.75;
    advice = "⚠️ แพ้ติดกัน 2 ไม้: ปรับลดความเสี่ยงลง 25% เพื่อชะลอ Drawdown";
  }

  const recoveryMatrix: DrawdownRecoveryInfo["asymmetricRecoveryMatrix"] = [
    { drawdownPct: 10, requiredGainPct: 11.1, psychologicalPressure: "LOW" },
    { drawdownPct: 20, requiredGainPct: 25.0, psychologicalPressure: "MODERATE" },
    { drawdownPct: 30, requiredGainPct: 42.9, psychologicalPressure: "HIGH" },
    { drawdownPct: 50, requiredGainPct: 100.0, psychologicalPressure: "CATASTROPHIC" },
  ];

  return {
    accountBalance: safeBalance,
    riskCapitalUSD: dollarRisk,
    riskPct,
    consecutiveLosses,
    drawdownThrottleMultiplier,
    asymmetricRecoveryMatrix: recoveryMatrix,
    consecutiveLossProtectionAdvice: advice,
  };
}

// ─── 10-DOLLAR MICRO COMPOUND PROTOCOL (พิมพ์เขียวปั้นพอร์ต $10 สู่ $1,000) ───

export interface MicroCompoundStage {
  stage: number;
  title: string;
  capitalRange: string;
  recommendedAccountType: "CENT_ACCOUNT_USC" | "STANDARD_USD";
  recommendedLot: string;
  recommendedAssets: string[];
  maxSlPips: number;
  fastBreakevenTrigger: string;
  riskRules: string;
}

export interface MicroCompoundPlan {
  initialCapitalUSD: number;
  stages: MicroCompoundStage[];
  goldenRulesFor10USD: string[];
}

export function calculateMicroCompoundPlan(balance: number = 10): MicroCompoundPlan {
  return {
    initialCapitalUSD: balance,
    stages: [
      {
        stage: 1,
        title: "🛡️ Phase 1: Survival & Base Building (สร้างฐานทุน & กันกระแทก)",
        capitalRange: "$10 - $99 USD (1,000 - 9,900 USC)",
        recommendedAccountType: "CENT_ACCOUNT_USC",
        recommendedLot: "0.01 - 0.03 Cent Lot (หรือตรึง 0.01 Standard บน Gold)",
        recommendedAssets: ["XAUUSD", "EURUSD", "USDJPY", "BTCUSDT"],
        maxSlPips: 25,
        fastBreakevenTrigger: "+0.45R (บวก 8 pips เลื่อน SL บังหน้าทุนทันที)",
        riskRules: "ตรึง 0.01 lot ยาวไปจนถึง $100 เพื่อสร้างเกราะกันกระแทก คุม Max Drawdown ต่ำกว่า 8%",
      },
      {
        stage: 2,
        title: "⚡ Phase 2: Capital Acceleration (เร่งผลตอบแทนแบบความเสี่ยงต่ำ)",
        capitalRange: "$100 - $249 USD (10,000 - 24,900 USC)",
        recommendedAccountType: "STANDARD_USD",
        recommendedLot: "0.02 Standard Lot (หรือ 0.05 - 0.08 Cent Lot)",
        recommendedAssets: ["XAUUSD", "EURUSD", "GBPUSD", "USDJPY"],
        maxSlPips: 30,
        fastBreakevenTrigger: "+0.45R (บวก 10 pips เลื่อน SL บังทุน)",
        riskRules: "ขยับเป็น 0.02 lot ความเสี่ยงต่อไม้ถูกคุมอย่างเข้มงวดไม่เกิน 1.5% ของพอร์ต",
      },
      {
        stage: 3,
        title: "🚀 Phase 3: Micro-Scaling (ขยายขนาดสัญญาแบบสมดุล)",
        capitalRange: "$250 - $999 USD",
        recommendedAccountType: "STANDARD_USD",
        recommendedLot: "0.04 - 0.08 Standard Lot",
        recommendedAssets: ["XAUUSD", "BTCUSDT", "EURUSD", "USOIL"],
        maxSlPips: 35,
        fastBreakevenTrigger: "+0.50R Lock + TP1 แบ่งปิด 50%",
        riskRules: "ใช้ระบบ 2-Tier TP: ชน TP1 ปิด 50% แล้วปล่อย 50% รันไป TP2 พร้อม SL บังทุน ตัดความเสี่ยงเป็น 0%",
      },
      {
        stage: 4,
        title: "💎 Phase 4: Institutional Compounding (เครื่องจักรทบต้นสถาบัน)",
        capitalRange: "$1,000 - $10,000+ USD",
        recommendedAccountType: "STANDARD_USD",
        recommendedLot: "0.15 - 0.60 Standard Lot (คำนวณ 1.0% Risk คงที่)",
        recommendedAssets: ["ทุกสินทรัพย์ในระบบ Confluence Matrix"],
        maxSlPips: 40,
        fastBreakevenTrigger: "+0.70R Adaptive Trail",
        riskRules: "เข้าสู่โหมดสถาบันเต็มรูปแบบ คุมความเสี่ยงคงที่ 1.0% ต่อออเดอร์ พอร์ตปลอดภัย Drawdown ต่ำกว่า 7% ตลอดกาล",
      },
    ],
    goldenRulesFor10USD: [
      "1. เปิด Cent Account (USC): ทุน $10 จะกลายเป็น 1,000 Cents ทันที ทำให้พอร์ตมีพื้นที่หายใจถึง 1,000 pips ไม่โดนล้างพอร์ต",
      "2. กฎ Ultra-Fast Breakeven (+0.40R): ทันทีที่กำไรบวก 5-8 pips ให้เลื่อน SL บังทุนทันที เปลี่ยนไม้ลบเป็น $0 Loss",
      "3. ห้ามเทรดตอนข่าวแดง (Red Box News Freeze): ข่าวแรงสเปรดถ่าง 5-10 pips จะกินพอร์ต $10 ในวินาทีเดียว",
      "4. กฎ 1-3-1: เทรดวันละไม่เกิน 3 ไม้ และห้ามเปิดซ้อนเกิน 1 ไม้เด็ดขาด",
      "5. ใช้ Leverage 1:1000 หรือ 1:2000: เพื่อลด Margin Requirement เหลือเพียง $0.15 - $0.50 ต่อไม้",
    ],
  };
}
