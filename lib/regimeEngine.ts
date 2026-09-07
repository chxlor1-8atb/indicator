import { MarketRegimeType, RegimeAdaptiveStrategyInfo } from "./types";

/**
 * Dynamic Regime-Adaptive Strategy Switching Engine.
 * Automatically aligns execution rules, allowed order types, risk multipliers, and target R:R
 * based on the empirical market regime.
 */
export function determineAdaptiveStrategy(
  regime: MarketRegimeType
): RegimeAdaptiveStrategyInfo {
  switch (regime) {
    case "EXPLOSIVE_TREND":
      return {
        regime: "EXPLOSIVE_TREND",
        strategyName: "Institutional Trend-Surfing & Trailing Stop",
        strategyMode: "TREND_SURFING",
        tacticalExecution:
          "เทรนด์ทรงพลังรุนแรง รันกำไรตามคลื่นใหญ่ด้วย SuperTrend + Quad-EMA 200 Stack ขยายเป้ากำไร TP 1:2.5 - 1:3.0 และเปิด Chandelier Trailing Stop ล็อกกำไร",
        riskMultiplier: 1.2,
        targetRR: "1:2.5 - 1:3.0",
        allowedOrderTypes: ["BUY_LIMIT", "SELL_LIMIT", "BUY_STOP", "SELL_STOP"],
      };

    case "HEALTHY_PULLBACK":
      return {
        regime: "HEALTHY_PULLBACK",
        strategyName: "Smart Money Concepts (SMC) OTE & FVG Mitigation",
        strategyMode: "SMC_PULLBACK_OTE",
        tacticalExecution:
          "ราคาพักตัวเข้าสู่ Value Zone ดักเก็บของในโซน Fibonacci Golden Pocket (OTE 61.8% - 78.6%) วาง SL คมชัดหลังแนว Liquidity Sweep จุดได้เปรียบสูงสุด",
        riskMultiplier: 1.0,
        targetRR: "1:2.0 - 1:2.5",
        allowedOrderTypes: ["BUY_LIMIT", "SELL_LIMIT"],
      };

    case "VOLATILITY_SQUEEZE":
      return {
        regime: "VOLATILITY_SQUEEZE",
        strategyName: "Bollinger Squeeze Compression Breakout",
        strategyMode: "VOLATILITY_BREAKOUT",
        tacticalExecution:
          "กรอบราคากำลังบีบอัดสะสมพลังรอระเบิด ตั้งคำสั่ง Pending Stop (Buy Stop / Sell Stop) เหนือ/ใต้กรอบแนวรับต้าน รอรับแรงกระชากของคลื่นความผันผวน",
        riskMultiplier: 0.8,
        targetRR: "1:2.0",
        allowedOrderTypes: ["BUY_STOP", "SELL_STOP"],
      };

    case "CHOPPY_DEADZONE":
    default:
      return {
        regime: "CHOPPY_DEADZONE",
        strategyName: "Capital Preservation & Mean Reversion Scalp",
        strategyMode: "CAPITAL_PRESERVATION_WAIT",
        tacticalExecution:
          "ADX ต่ำกว่า 21 สภาวะตลาดไร้ทิศทาง (Chop / Sideways) ระบบสั่งล็อก WAIT 100% เพื่อรักษาเงินทุน หรือจำกัดเฉพาะการเทรด Reversion ที่ขอบนอกสุดของกรอบราคาเท่านั้น",
        riskMultiplier: 0.0,
        targetRR: "1:1.0",
        allowedOrderTypes: ["WAIT_NO_ORDER"],
      };
  }
}
