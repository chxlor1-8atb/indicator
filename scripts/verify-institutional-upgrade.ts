/**
 * scripts/verify-institutional-upgrade.ts
 * Automated Verification Script for Institutional Quant Upgrades:
 * 1. Multi-Timeframe (MTF) Confluence Engine
 * 2. Institutional SMC Dealing Range Hard Veto / Invariant Guard
 * 3. Post-News Sniper State & Economic Surprise Engine
 * 4. Spread Safety Blowout Shield
 * 5. Structural Stop Loss with Order Block Awareness & Spread Buffer
 */

import {
  calculateMTFConfluence,
  calculateStructuralStopLoss,
} from "../lib/indicators";
import { validateSpreadSafety } from "../lib/priceIntegrity";
import { getNewsSafetyShieldStatus } from "../lib/calendarEngine";
import { orchestrateStrategyDecision } from "../lib/strategyOrchestrator";
import { Candle } from "../lib/types";

function generateMockCandles(count: number, basePrice: number, trend: "UP" | "DOWN"): Candle[] {
  const candles: Candle[] = [];
  let price = basePrice;
  const now = Math.floor(Date.now() / 1000);

  for (let i = 0; i < count; i++) {
    const time = now - (count - i) * 3600;
    const move = trend === "UP" ? (Math.random() * 2 - 0.5) : (Math.random() * 2 - 1.5);
    const open = price;
    const close = price + move;
    const high = Math.max(open, close) + Math.random() * 1.5;
    const low = Math.min(open, close) - Math.random() * 1.5;
    const volume = 1000 + Math.random() * 500;
    candles.push({ time, open, high, low, close, volume });
    price = close;
  }
  return candles;
}

async function runTests() {
  console.log("================================================================================");
  console.log("🏛️  AEGIS QUANT TERMINAL — INSTITUTIONAL UPGRADE VERIFICATION TEST SUITE");
  console.log("================================================================================");
  let passedCount = 0;
  let totalCount = 0;

  function assert(name: string, condition: boolean, detail?: string) {
    totalCount++;
    if (condition) {
      console.log(`  ✅ [PASS] ${name}${detail ? ` (${detail})` : ""}`);
      passedCount++;
    } else {
      console.error(`  ❌ [FAIL] ${name}${detail ? ` (${detail})` : ""}`);
    }
  }

  // ─── Test 1: Multi-Timeframe Confluence Engine ───
  console.log("\n[Test 1] Multi-Timeframe Confluence Engine (MTF):");
  const bullCandles = generateMockCandles(150, 2600, "UP");
  const mtfResult = calculateMTFConfluence(bullCandles, 2, "XAUUSD");
  assert(
    "MTF Confluence returns valid alignment score and status",
    typeof mtfResult.alignmentScore === "number" &&
    typeof mtfResult.alignmentStatus === "string" &&
    mtfResult.h1 !== undefined &&
    mtfResult.h4 !== undefined,
    `Status: ${mtfResult.alignmentStatus}, Score: ${mtfResult.alignmentScore}, Dominant: ${mtfResult.trendAlignment.dominantTrend}`
  );

  // ─── Test 2: Institutional Spread Blowout Shield ───
  console.log("\n[Test 2] Institutional Dynamic Spread Safety Shield:");
  // XAUUSD baseline spread is 2.5 pips. Max allowed normal is 2.0x (5.0 pips).
  const safeSpread = validateSpreadSafety("XAUUSD", 2.0); // 2.0 pips spread
  assert(
    "Normal gold spread (2.0 pips) is approved for execution",
    safeSpread.isSafe && safeSpread.spreadBlowoutMultiplier < 2.0,
    `Spread: ${safeSpread.spreadPips} pips, Multiplier: ${safeSpread.spreadBlowoutMultiplier}x, MaxAllowed: ${safeSpread.maxAllowedSpread}`
  );

  const blowoutSpread = validateSpreadSafety("XAUUSD", 8.0); // 8.0 pips spread (> 5.0 pips max allowed)
  assert(
    "Excessive gold spread (8.0 pips) triggers SPREAD BLOWOUT VETO",
    !blowoutSpread.isSafe && blowoutSpread.spreadBlowoutMultiplier > 2.0,
    `Spread: ${blowoutSpread.spreadPips} pips, Multiplier: ${blowoutSpread.spreadBlowoutMultiplier}x, Warning: ${blowoutSpread.warning}`
  );

  // ─── Test 3: Structural Stop Loss with Order Block Boundary & Spread Buffer ───
  console.log("\n[Test 3] Structural Stop Loss with Order Block Boundary & Buffer:");
  const testCandles: Candle[] = [
    { time: 1000, open: 2650, high: 2660, low: 2640, close: 2655, volume: 100 },
    { time: 2000, open: 2655, high: 2670, low: 2645, close: 2665, volume: 120 },
    { time: 3000, open: 2665, high: 2675, low: 2650, close: 2670, volume: 110 },
  ];
  // SELL order with Order Block at 2680 (above swing high of 2675)
  const sellSL = calculateStructuralStopLoss(testCandles, "SELL", 5.0, 2670, 2, 2680);
  assert(
    "SELL Structural SL anchors beyond Order Block boundary",
    sellSL.stopLoss > 2680 && sellSL.swingRefPrice === 2680,
    `StopLoss: ${sellSL.stopLoss}, SwingRef: ${sellSL.swingRefPrice}, Buffer: ${sellSL.liquidityBuffer}`
  );

  // BUY order with Order Block at 2635 (below swing low of 2640)
  const buySL = calculateStructuralStopLoss(testCandles, "BUY", 5.0, 2670, 2, 2635);
  assert(
    "BUY Structural SL anchors below Order Block boundary",
    buySL.stopLoss < 2635 && buySL.swingRefPrice === 2635,
    `StopLoss: ${buySL.stopLoss}, SwingRef: ${buySL.swingRefPrice}, Buffer: ${buySL.liquidityBuffer}`
  );

  // ─── Test 4: Strategy Orchestrator Safety Lock 13 (Dealing Range Hard Veto) ───
  console.log("\n[Test 4] Institutional Dealing Range Hard Invariant Guard (Safety Lock 13):");
  const testInputCandles = generateMockCandles(100, 2600, "UP");

  // Mock indicators with BUY signal but in EXTREME_PREMIUM (85th percentile)
  const mockIndicatorsBuy = {
    currentPrice: 2650,
    orderBlocks: {
      nearestBlock: { type: "BULLISH_OB", priceMin: 2600, priceMax: 2620, isMitigated: false },
      activeBlocks: [],
    },
    marketStructureShift: { detected: true, type: "BULLISH_MSS" },
    premiumDiscount: {
      zone: "EXTREME_PREMIUM",
      percentile: 85,
      equilibrium: 2625,
      tradeAllowed: true,
    },
    rsi14: [65],
    atr14: [5],
    ema20: [2640],
    ema50: [2630],
    ema200: [2600],
  } as any;

  const decisionBuyInPremium = orchestrateStrategyDecision({
    candles: testInputCandles,
    indicators: mockIndicatorsBuy,
    userPreset: "SMC_PRICE_ACTION",
  });

  assert(
    "Safety Lock 13 vetoes BUY in EXTREME_PREMIUM zone (>55%)",
    decisionBuyInPremium.vetoTriggered === true &&
    decisionBuyInPremium.vetoReason !== undefined &&
    decisionBuyInPremium.vetoReason.includes("Safety Lock 13") &&
    decisionBuyInPremium.unifiedSignal === "HOLD_WAIT",
    `Veto Reason: ${decisionBuyInPremium.vetoReason}`
  );

  // Mock indicators with SELL signal but in DEEP_DISCOUNT (15th percentile)
  const mockIndicatorsSell = {
    currentPrice: 2600,
    orderBlocks: {
      nearestBlock: { type: "BEARISH_OB", priceMin: 2630, priceMax: 2650, isMitigated: false },
      activeBlocks: [],
    },
    marketStructureShift: { detected: true, type: "BEARISH_MSS" },
    premiumDiscount: {
      zone: "DEEP_DISCOUNT",
      percentile: 15,
      equilibrium: 2625,
      tradeAllowed: true,
    },
    rsi14: [35],
    atr14: [5],
    ema20: [2610],
    ema50: [2620],
    ema200: [2640],
  } as any;

  const decisionSellInDiscount = orchestrateStrategyDecision({
    candles: testInputCandles,
    indicators: mockIndicatorsSell,
    userPreset: "SMC_PRICE_ACTION",
  });

  assert(
    "Safety Lock 13 vetoes SELL in DEEP_DISCOUNT zone (<45%)",
    decisionSellInDiscount.vetoTriggered === true &&
    decisionSellInDiscount.vetoReason !== undefined &&
    decisionSellInDiscount.vetoReason.includes("Safety Lock 13") &&
    decisionSellInDiscount.unifiedSignal === "HOLD_WAIT",
    `Veto Reason: ${decisionSellInDiscount.vetoReason}`
  );

  // ─── Test 5: Post-News Sniper Active Window ───
  console.log("\n[Test 5] Post-News Sniper Strategy Window & Calendar Shield:");
  // Check calendar status
  const calStatus = getNewsSafetyShieldStatus("XAUUSD");
  assert(
    "getNewsSafetyShieldStatus returns valid structure and state",
    ["SAFE_TRADING_WINDOW", "APPROACHING_RED_FOLDER", "RED_FOLDER_FREEZE", "POST_NEWS_VOLATILITY", "POST_NEWS_SNIPER_ACTIVE"].includes(calStatus.state),
    `Current State: ${calStatus.state}, Badge: ${calStatus.badgeText}`
  );

  console.log("\n================================================================================");
  console.log(`📊 TEST RESULTS: ${passedCount} / ${totalCount} PASSED (${Math.round((passedCount / totalCount) * 100)}%)`);
  console.log("================================================================================");

  if (passedCount === totalCount) {
    console.log("🎉 ALL INSTITUTIONAL QUANT VERIFICATION TESTS PASSED SUCCESSFULLY!");
    process.exit(0);
  } else {
    console.error("⚠️ SOME TESTS FAILED!");
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
