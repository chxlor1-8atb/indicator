import {
  InstitutionalRiskEngineInfo,
  MarketRegimeType,
  Candle,
} from "./types";

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
  targetRiskPct = 2.0
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

  // 2. Dollar Risk calculation
  const safeRiskPct = Math.min(5.0, Math.max(0.5, targetRiskPct));
  const dollarRisk = Number(((accountBalance * safeRiskPct) / 100).toFixed(2));

  // 3. Raw ATR Lot Size formula
  // Lot = DollarRisk / (SL_pips * PipValuePerLot)
  let calculatedLotSize = Number(
    (dollarRisk / (Math.max(1, slPips) * pipValuePerStandardLot)).toFixed(2)
  );
  if (calculatedLotSize < 0.01) calculatedLotSize = 0.01;

  // 4. Fractional Kelly Criterion Sizing (Half-Kelly)
  // Historical baseline: win rate p = 0.65, win/loss payoff b = 1.8
  const p = 0.65;
  const b = 1.8;
  const q = 1 - p;
  const fullKelly = p - q / b;
  const halfKellyFraction = Math.max(0.1, Math.min(0.5, fullKelly * 0.5));
  const fractionalKellyLot = Number(
    Math.max(0.01, calculatedLotSize * (halfKellyFraction / 0.25)).toFixed(2)
  );

  // 5. Multi-Stage Dynamic Bracket Levels
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

  // 6. Institutional Confidence Gate Evaluation
  let confidenceGateStatus: InstitutionalRiskEngineInfo["confidenceGateStatus"] = "APPROVED";
  let gateReason = "สัญญาณผ่านเกณฑ์ความเชื่อมั่นสถาบันครบถ้วน อนุมัติความเสี่ยงระดับมาตรฐาน";

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
