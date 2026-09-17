import {
  InstitutionalRiskEngineInfo,
  MarketRegimeType,
  Candle,
  RiskProfileType,
} from "./types";

export interface DynamicPositionSizeOptions {
  symbol: string;
  accountBalance: number;
  currentPrice: number;
  stopLossDistancePrice: number;
  riskProfile?: RiskProfileType;
  candles?: Candle[];
  consecutiveLosses?: number;
  customRiskPct?: number;
}

export interface DynamicPositionSizeResult {
  calculatedLotSize: number;
  effectiveRiskPct: number;
  dollarRisk: number;
  slPips: number;
  volatilityScaleRatio: number;
  drawdownThrottle: number;
  rationale: string;
  isSmallAccount?: boolean;
  centAccountLots?: number;
  centAccountRiskUSD?: number;
  smallAccountGuidance?: string;
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

/**
 * Calculates dynamic position sizing adjusted for Risk Profile,
 * Realized Volatility (ATR ratio), and Drawdown Dampeners.
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
  } = options;

  const sym = symbol.toUpperCase();
  const isJpyOrGold = sym.includes("JPY") || sym === "XAUUSD" || sym.startsWith("XAU") || sym === "GOLD";
  const isForex = !isJpyOrGold && ["EUR", "GBP", "AUD", "NZD", "USD", "CAD", "CHF"].some(
    (c) => sym.startsWith(c) || sym.endsWith(c)
  );

  const pipMultiplier = isForex ? 10000 : isJpyOrGold ? 100 : sym.endsWith("USDT") ? 1 : 10000;
  const pipValuePerStandardLot = isForex || sym === "XAUUSD" ? 10.0 : 1.0;

  // 1. Base Risk Percentage by Profile
  let baseRiskPct = 1.5;
  if (customRiskPct !== undefined && customRiskPct > 0) {
    baseRiskPct = customRiskPct;
  } else if (riskProfile === "CONSERVATIVE") {
    baseRiskPct = 0.75;
  } else if (riskProfile === "AGGRESSIVE") {
    baseRiskPct = 2.5;
  } else {
    baseRiskPct = 1.5; // MODERATE default
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

  const effectiveRiskPct = Number((baseRiskPct * volatilityScaleRatio * drawdownThrottle).toFixed(2));
  const dollarRisk = Number(((accountBalance * effectiveRiskPct) / 100).toFixed(2));

  const slPips = Math.max(5, Math.round(stopLossDistancePrice * pipMultiplier));
  let calculatedLotSize = Number(
    (dollarRisk / (Math.max(1, slPips) * pipValuePerStandardLot)).toFixed(2)
  );

  if (calculatedLotSize < 0.01) calculatedLotSize = 0.01;

  const isSmallAccount = accountBalance <= 50;
  const centAccountLots = isSmallAccount
    ? Math.max(0.01, Number(((accountBalance * 100 * (effectiveRiskPct / 100)) / (Math.max(1, slPips) * pipValuePerStandardLot)).toFixed(2)))
    : undefined;
  const centAccountRiskUSD = isSmallAccount && centAccountLots
    ? Number((centAccountLots * slPips * (pipValuePerStandardLot * 0.001)).toFixed(2))
    : undefined;

  let smallAccountGuidance: string | undefined;
  if (isSmallAccount) {
    const std001Loss = Number((0.01 * slPips * (pipValuePerStandardLot * 0.1)).toFixed(2));
    if (slPips <= 16) {
      smallAccountGuidance = `🎯 Sniper Micro-SL (${slPips} pips): ทุน $${accountBalance} เทรด 0.01 lot ได้จริง เสี่ยงเพียง -$${std001Loss} USD หรือเลือกใช้ Cent Account เพื่อคุมความเสี่ยงระดับ 1.5%`;
    } else {
      smallAccountGuidance = `⚠️ ระยะ SL ปัจจุบัน (${slPips} pips) เสี่ยง -$${std001Loss} USD แนะนำเปิดโหมด Sniper Micro-SL หรือใช้ Cent Account เพื่อรักษาความปลอดภัยของพอร์ต $${accountBalance}`;
    }
  }

  const rationale = `Risk Profile: ${riskProfile} (${baseRiskPct}% base -> ${effectiveRiskPct}% eff) | Vol Ratio: ${volatilityScaleRatio}x | Drawdown Dampener: ${drawdownThrottle}x${isSmallAccount ? ` | Micro-Capital Active ($${accountBalance})` : ""}`;

  return {
    calculatedLotSize,
    effectiveRiskPct,
    dollarRisk,
    slPips,
    volatilityScaleRatio,
    drawdownThrottle,
    rationale,
    isSmallAccount,
    centAccountLots,
    centAccountRiskUSD,
    smallAccountGuidance,
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
