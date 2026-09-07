import { Candle } from "../lib/types";
import { calculateAllIndicators } from "../lib/indicators";
import { orchestrateStrategyDecision } from "../lib/strategyOrchestrator";

function generateMockTrendCandles(count = 100): Candle[] {
  const candles: Candle[] = [];
  let price = 2500;
  const now = Math.floor(Date.now() / 1000) - count * 900;

  for (let i = 0; i < count; i++) {
    const change = 1.8 + (Math.sin(i / 5) * 0.5); // Persistent upward drift
    const open = price;
    const close = open + change;
    const high = Math.max(open, close) + 1.2;
    const low = Math.min(open, close) - 0.8;
    const volume = 1500 + Math.floor(Math.sin(i / 3) * 300);

    candles.push({
      time: now + i * 900,
      open: Number(open.toFixed(2)),
      high: Number(high.toFixed(2)),
      low: Number(low.toFixed(2)),
      close: Number(close.toFixed(2)),
      volume,
    });
    price = close;
  }
  return candles;
}

function generateMockChopCandles(count = 100): Candle[] {
  const candles: Candle[] = [];
  const base = 2500;
  const now = Math.floor(Date.now() / 1000) - count * 900;

  for (let i = 0; i < count; i++) {
    const cycle = Math.sin(i / 2) * 4; // Mean reverting oscillation
    const open = base + cycle;
    const close = base + Math.sin((i + 1) / 2) * 4;
    const high = Math.max(open, close) + 1.5;
    const low = Math.min(open, close) - 1.5;
    const volume = 800 + Math.floor(Math.random() * 200);

    candles.push({
      time: now + i * 900,
      open: Number(open.toFixed(2)),
      high: Number(high.toFixed(2)),
      low: Number(low.toFixed(2)),
      close: Number(close.toFixed(2)),
      volume,
    });
  }
  return candles;
}

async function runTests() {
  console.log("================================================================================");
  console.log("🛡️ RUNNING ANTI-CLASH STRATEGY ORCHESTRATOR VERIFICATION TESTS");
  console.log("================================================================================\n");

  // TEST 1: Trending Market Verification
  console.log("▶ TEST 1: TRENDING MARKET TEST (Hurst > 0.55)");
  const trendCandles = generateMockTrendCandles(100);
  const trendIndicators = calculateAllIndicators(trendCandles, "XAUUSD");
  const trendDecision = orchestrateStrategyDecision({
    candles: trendCandles,
    indicators: trendIndicators,
    userPreset: "QUANT_TREND_SURFER",
  });

  console.log(`  Selected Preset: ${trendDecision.selectedPreset}`);
  console.log(`  Effective Preset: ${trendDecision.effectivePreset}`);
  console.log(`  Regime State: ${trendDecision.regimeState}`);
  console.log(`  Active Tools: ${trendDecision.activeIndicators.join(", ")}`);
  console.log(`  Muted Tools: ${trendDecision.mutedIndicators.join(", ")}`);
  console.log(`  Unified Signal: ${trendDecision.unifiedSignal} (${trendDecision.confidencePct}%)`);
  console.log(`  Clash Resolution: ${trendDecision.clashResolutionReason}`);

  const isRsiMuted = trendDecision.mutedIndicators.some((t) => t.includes("RSI"));
  if (!isRsiMuted) {
    throw new Error("FAIL: In Trending mode, RSI counter-trend must be MUTED!");
  }
  console.log("  ✅ PASS: RSI counter-trend was successfully muted to prevent clash!\n");

  // TEST 2: Sideway / Mean-Reversion Market Verification
  console.log("▶ TEST 2: SIDEWAY / MEAN-REVERTING MARKET TEST");
  const chopCandles = generateMockChopCandles(100);
  const chopIndicators = calculateAllIndicators(chopCandles, "XAUUSD");
  const chopDecision = orchestrateStrategyDecision({
    candles: chopCandles,
    indicators: chopIndicators,
    userPreset: "MEAN_REVERSION_SCALPER",
  });

  console.log(`  Selected Preset: ${chopDecision.selectedPreset}`);
  console.log(`  Effective Preset: ${chopDecision.effectivePreset}`);
  console.log(`  Active Tools: ${chopDecision.activeIndicators.join(", ")}`);
  console.log(`  Muted Tools: ${chopDecision.mutedIndicators.join(", ")}`);
  console.log(`  Unified Signal: ${chopDecision.unifiedSignal}`);

  const isSuperTrendMuted = chopDecision.mutedIndicators.some((t) => t.includes("SuperTrend"));
  if (!isSuperTrendMuted) {
    throw new Error("FAIL: In Sideway mode, SuperTrend must be MUTED!");
  }
  console.log("  ✅ PASS: SuperTrend was successfully muted to prevent whipsaw in chop!\n");

  // TEST 3: Veto Hierarchy (Inducement Trap Safety Lock 12)
  console.log("▶ TEST 3: VETO HIERARCHY TEST (Inducement Trap Trigger)");
  const trapIndicators = {
    ...trendIndicators,
    liquidityInducement: {
      eqhPrice: 2550,
      eqlPrice: null,
      idmLevel: 2548,
      isInducementTrap: true,
      trapType: "EQUAL_HIGHS_BAIT" as const,
      inducementDirection: "BULL_TRAP_INDUCEMENT" as const,
      distanceToTrapPips: 4.2,
      description: "Equal Highs Bait Trap ahead",
    },
  };

  const vetoDecision = orchestrateStrategyDecision({
    candles: trendCandles,
    indicators: trapIndicators,
    userPreset: "AUTO_REGIME",
  });

  console.log(`  Veto Triggered: ${vetoDecision.vetoTriggered}`);
  console.log(`  Veto Reason: ${vetoDecision.vetoReason}`);
  console.log(`  Signal Overridden to: ${vetoDecision.unifiedSignal}`);

  if (!vetoDecision.vetoTriggered || vetoDecision.unifiedSignal !== "HOLD_WAIT") {
    throw new Error("FAIL: Veto did not override signal to HOLD_WAIT on Inducement Trap!");
  }
  console.log("  ✅ PASS: Veto successfully overrode signals on detected trap!\n");

  console.log("================================================================================");
  console.log("🎉 ALL ANTI-CLASH ORCHESTRATOR TESTS PASSED WITH 100% INTEGRITY!");
  console.log("================================================================================");
}

runTests().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
