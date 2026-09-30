/**
 * Comprehensive Automated Verification Script for E-Book Trade 10-Module Suite
 * Validates:
 * 1. Candlestick Patterns with S/R Zone Anchoring (+8% bonus, -22% penalty)
 * 2. Pullback Quality Engine (EMA 20/50 Ribbon, Golden Pocket, S/R Flip, Overextension)
 * 3. RSI Institutional Hook & Constance Brown Regimes
 * 4. PIP-LOT-Spread Friction & Net Risk:Reward Engine
 * 5. Pre-Trade 5-Point Institutional Checklist
 * 6. Asymmetric Drawdown Recovery (Ralph Vince Math & Rule 1-3-1 Anti-Revenge Guard)
 */

import {
  evaluatePullbackQuality,
  evaluateRSIInstitutionalHook,
  scanCandlestickPatterns,
} from "../lib/indicators";
import {
  calculateSpreadFrictionAndNetRR,
  validatePreTradeChecklist,
  calculateDrawdownRecoveryMetrics,
} from "../lib/riskEngine";
import { Candle } from "../lib/types";
import { getDailyTradeTracker, recordDailyTradeExecution } from "../lib/autonomousEngine";

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ FAIL: ${message}`);
    process.exit(1);
  } else {
    console.log(`✅ PASS: ${message}`);
  }
}

// Generate synthetic candles for testing
function generateCandles(basePrice: number, count: number, trend: "UP" | "DOWN" | "FLAT"): Candle[] {
  const candles: Candle[] = [];
  let current = basePrice;
  const now = Math.floor(Date.now() / 1000) - count * 3600;

  for (let i = 0; i < count; i++) {
    const time = now + i * 3600;
    const delta = trend === "UP" ? 0.5 + Math.random() * 0.5 : trend === "DOWN" ? -0.5 - Math.random() * 0.5 : (Math.random() - 0.5) * 0.5;
    const open = current;
    const close = open + delta;
    const high = Math.max(open, close) + Math.random() * 0.3;
    const low = Math.min(open, close) - Math.random() * 0.3;
    const volume = 1000 + Math.floor(Math.random() * 500);

    candles.push({ time, open, high, low, close, volume });
    current = close;
  }
  return candles;
}

async function runTestSuite() {
  console.log("\n========================================================");
  console.log("📚 STARTING E-BOOK TRADE 10-MODULE SUITE VERIFICATION");
  console.log("========================================================\n");

  // ─── TEST 1: Candlestick Pattern Detection with Zone Anchoring ───
  console.log("--- 1. Testing Candlestick Pattern Detection & Zone Anchoring ---");
  const candlesForCandles: Candle[] = [
    { time: 1000, open: 1990, high: 1995, low: 1985, close: 1992, volume: 1000 },
    { time: 2000, open: 1992, high: 2000, low: 1990, close: 1998, volume: 1100 },
    { time: 3000, open: 1998, high: 2005, low: 1995, close: 2000, volume: 1000 },
    { time: 4000, open: 2000, high: 2015, low: 1998, close: 2010, volume: 1200 },
    // Bullish Marubozu (strong full body, tiny wicks)
    { time: 5000, open: 2015, high: 2050, low: 2015, close: 2050, volume: 3000 },
  ];
  const scanUnanchored = scanCandlestickPatterns(candlesForCandles, 2, undefined);
  const scanAnchored = scanCandlestickPatterns(candlesForCandles, 2, [{ min: 2010, max: 2055, label: "H4 Support" }]);

  assert(scanUnanchored.detectedPatterns.length > 0, "Marubozu Bull detected");
  const unanchoredMarubozu = scanUnanchored.detectedPatterns.find(p => p.pattern === "MARUBOZU_BULL");
  const anchoredMarubozu = scanAnchored.detectedPatterns.find(p => p.pattern === "MARUBOZU_BULL");
  assert(Boolean(unanchoredMarubozu), "Marubozu Bull present in unanchored scan");
  assert(Boolean(anchoredMarubozu), "Marubozu Bull present in anchored scan");
  assert(anchoredMarubozu!.isZoneAnchored === true, "Zone anchoring flag set to true");
  assert(anchoredMarubozu!.confidence > unanchoredMarubozu!.confidence, "Zone-anchored pattern has higher confidence than unanchored pattern");

  // ─── TEST 2: Pullback Quality & Value Zone Radar ───
  console.log("\n--- 2. Testing Pullback Quality & Overextension Guard ---");
  const upCandles = generateCandles(2000, 60, "UP");
  const lastCandle = upCandles[upCandles.length - 1];
  
  // Healthy pullback test (near EMA20 & S/R Zone)
  const ema20 = upCandles.map(c => c.close - 1);
  const ema50 = upCandles.map(c => c.close - 5);
  const healthyPullback = evaluatePullbackQuality(
    upCandles,
    ema20,
    ema50,
    2.5, // ATR
    [{ min: lastCandle.close - 3, max: lastCandle.close + 1, label: "H4 Support Flip" }],
    "BULLISH"
  );

  assert(healthyPullback.state === "HEALTHY_VALUE_ZONE" || healthyPullback.state === "SHALLOW_PULLBACK", "Healthy or shallow pullback detected");
  assert(healthyPullback.isFomoChasing === false, "FOMO chasing is false in healthy zone");
  assert(healthyPullback.pullbackScore >= 70, "Healthy pullback scores >= 70");

  // Overextended FOMO test (price far above EMA20 > 2.0x ATR)
  const farEma20 = upCandles.map(() => lastCandle.close - 15); // 15 pts away with ATR 2.0 = 7.5x ATR!
  const overextendedPullback = evaluatePullbackQuality(
    upCandles,
    farEma20,
    ema50,
    2.0, // ATR
    undefined,
    "BULLISH"
  );
  assert(overextendedPullback.isFomoChasing === true, "FOMO overextension triggered when distance > 2.0x ATR");
  assert(overextendedPullback.state === "FOMO_OVEREXTENDED", "State classified as FOMO_OVEREXTENDED");
  assert(overextendedPullback.pullbackScore <= 30, "Overextended pullback received severe penalty score");

  // ─── TEST 3: RSI Institutional Hook & Constance Brown Regimes ───
  console.log("\n--- 3. Testing RSI Institutional Hook & Constance Brown Regimes ---");
  const rsiSeriesBullishHook = [20, 22, 26, 30, 35]; // hooked out of oversold (<32) upwards with >= 5 points
  const rsiHookResult = evaluateRSIInstitutionalHook(rsiSeriesBullishHook, upCandles, undefined, "BULLISH");
  assert(rsiHookResult.hookState === "BULLISH_EXIT_HOOK", "Hook state correctly classified as BULLISH_EXIT_HOOK");
  assert(rsiHookResult.momentumConvictionScore >= 80, "Momentum conviction score boosted for institutional hook");

  // Constance Brown Bull Market Support Range (40-80)
  const rsiBrownBullSupport = [55, 52, 48, 44, 46, 50, 52, 49, 45, 48];
  const rsiBrownResult = evaluateRSIInstitutionalHook(rsiBrownBullSupport, upCandles, undefined, "BULLISH");
  assert(rsiBrownResult.marketRegimeRange === "BULL_MARKET_RANGE_40_80", "Constance Brown 40-80 bull market range identified");

  // ─── TEST 4: PIP-LOT-Spread Friction & Net Risk:Reward Engine ───
  console.log("\n--- 4. Testing PIP-LOT-Spread Friction & Net R:R Engine ---");
  // Test low friction case (Gold: spread 1.5 pips, SL 30 pips -> ratio 5% < 12%)
  const lowFrictionResult = calculateSpreadFrictionAndNetRR("XAUUSD", 2650.0, 2647.0, 2656.0, 0.1, 15);
  assert(lowFrictionResult.spreadAlertLevel === "LOW_FRICTION", "Low friction status classified (<12% of SL)");
  assert(lowFrictionResult.isTradeCostEfficient === true, "Trade marked cost efficient");
  assert(lowFrictionResult.netRiskRewardRatio > 0, "Net R:R calculated");

  // Test excessive friction case (EURUSD during news: spread 5.0 pips, SL 15 pips -> ratio 33.3% >= 20%)
  const highFrictionResult = calculateSpreadFrictionAndNetRR("EURUSD", 1.0850, 1.0835, 1.0880, 1.0, 50);
  assert(highFrictionResult.spreadAlertLevel === "EXCESSIVE_BLOCKED", "Excessive friction blocked (>=20% of SL)");
  assert(highFrictionResult.isTradeCostEfficient === false, "Trade marked cost inefficient");
  assert(Boolean(highFrictionResult.spreadGuidance), "Spread guidance warning provided");

  // ─── TEST 5: Pre-Trade 5-Point Institutional Checklist ───
  console.log("\n--- 5. Testing Pre-Trade 5-Point Institutional Checklist ---");
  const perfectChecklist = validatePreTradeChecklist(
    "BUY",
    85, // Confluence 85
    true, // Valid setup
    true, // Structural SL
    2.1, // Net R:R 2.1
    1.5, // 1.5% Risk
    0 // 0 consecutive losses
  );

  assert(perfectChecklist.passedCount === 5, "All 5 institutional rules passed");
  assert(perfectChecklist.disciplineStatus === "DISCIPLINE_PERFECT", "Discipline status is DISCIPLINE_PERFECT");

  // Test failed checklist (Cool-down lockout due to 3 consecutive losses)
  const failedChecklist = validatePreTradeChecklist(
    "BUY",
    50, // Low confluence
    false, // No valid setup
    false,
    1.2, // R:R too low
    3.0, // Risk > 2%
    3 // 3 consecutive losses -> Cool-down active
  );
  assert(failedChecklist.passedCount === 0, "All items failed");
  assert(failedChecklist.disciplineStatus === "WAIT_DISCIPLINE_BREACH", "Discipline status is WAIT_DISCIPLINE_BREACH");
  assert(failedChecklist.rule131Status.cooldownActive === true, "Cool-down lockout triggered after 3 losses");

  // ─── TEST 6: Asymmetric Drawdown Recovery & Anti-Martingale Sizing ───
  console.log("\n--- 6. Testing Asymmetric Drawdown Recovery & Anti-Martingale Sizing ---");
  const ddNormal = calculateDrawdownRecoveryMetrics(1000, 1.5, 0);
  assert(ddNormal.drawdownThrottleMultiplier === 1.0, "Throttle is 1.0x on normal trading");
  assert(ddNormal.asymmetricRecoveryMatrix.find(m => m.drawdownPct === 20)?.requiredGainPct === 25.0, "-20% DD requires +25.0% gain to breakeven");
  assert(ddNormal.asymmetricRecoveryMatrix.find(m => m.drawdownPct === 50)?.requiredGainPct === 100.0, "-50% DD requires +100.0% gain to breakeven");

  // Test consecutive loss throttling (Anti-Martingale)
  const ddLossStreak = calculateDrawdownRecoveryMetrics(1000, 1.5, 3);
  assert(ddLossStreak.drawdownThrottleMultiplier === 0.5, "Anti-Martingale throttled risk down by 50% after 3 consecutive losses");
  assert(Boolean(ddLossStreak.consecutiveLossProtectionAdvice), "Consecutive loss advice generated");

  // ─── TEST 7: 20-Bar Candle Color Ratio & Two-Bar Confirmation ───
  console.log("\n--- 7. Testing 20-Bar Candle Color Ratio & Two-Bar Confirmation ---");
  const testCandles20: Candle[] = [];
  // 14 green candles
  for (let i = 0; i < 14; i++) {
    testCandles20.push({ time: 1000 + i * 100, open: 100 + i, high: 100 + i + 2, low: 100 + i - 0.5, close: 100 + i + 1.5, volume: 1000 });
  }
  // 4 red candles
  for (let i = 14; i < 18; i++) {
    testCandles20.push({ time: 1000 + i * 100, open: 120 - (i - 14), high: 120 - (i - 14) + 0.5, low: 120 - (i - 14) - 2, close: 120 - (i - 14) - 1.5, volume: 1000 });
  }
  // Candle 19 (penultimate): Bullish Pinbar/Hammer (long lower wick >= 55%, small upper wick <= 25%)
  // low: 110, open: 114, close: 114.5, high: 115 -> range: 5, lower wick: 4 (80%), upper wick: 0.5 (10%)
  testCandles20.push({ time: 2900, open: 114, high: 115, low: 110, close: 114.5, volume: 1500 });
  // Candle 20 (ultimate): Strong Green confirmation close above penultimate high
  testCandles20.push({ time: 3000, open: 114.5, high: 118, low: 114, close: 117.5, volume: 2200 });

  const colorAndTwoBarScan = scanCandlestickPatterns(testCandles20, 2);
  assert(Boolean(colorAndTwoBarScan.candleColorRatio), "Candle color ratio computed");
  assert(colorAndTwoBarScan.candleColorRatio!.bullRatio >= 0.70, "Bullish ratio >= 70% in uptrend sequence");
  assert(colorAndTwoBarScan.candleColorRatio!.dominantBias === "BULLISH", "Dominant color bias is BULLISH");
  assert(colorAndTwoBarScan.candleColorRatio!.isHealthyTrend === true, "Healthy trend flagged due to >= 60% ratio");
  assert(Boolean(colorAndTwoBarScan.twoBarConfirmation), "Two-bar confirmation evaluated");
  assert(colorAndTwoBarScan.twoBarConfirmation!.isConfirmed === true, "Two-bar confirmation successfully confirmed");
  assert(colorAndTwoBarScan.twoBarConfirmation!.type === "BULLISH_CONFIRMATION", "Two-bar confirmation type is BULLISH_CONFIRMATION");

  // ─── TEST 8: Rule 1-3-1 Daily Discipline Tracker ───
  console.log("\n--- 8. Testing Rule 1-3-1 Daily Discipline Tracker ---");
  const accTracker = getDailyTradeTracker("unit_test_acc");
  assert(accTracker.tradeCount === 0, "Initial daily trade count is 0");
  assert(accTracker.cumulativeRiskPct === 0, "Initial daily cumulative risk is 0%");
  recordDailyTradeExecution(1.0, "unit_test_acc");
  assert(accTracker.tradeCount === 1, "Trade count increments to 1 after order dispatch");
  assert(accTracker.cumulativeRiskPct === 1.0, "Cumulative risk increments to 1.0%");
  recordDailyTradeExecution(0.5, "unit_test_acc");
  assert(accTracker.tradeCount === 2, "Trade count increments to 2 after second order dispatch");
  assert(accTracker.cumulativeRiskPct === 1.5, "Cumulative risk increments to 1.5%");

  console.log("\n========================================================");
  console.log("🎉 ALL E-BOOK TRADE 10-MODULE TESTS PASSED PERFECTLY!");
  console.log("========================================================\n");
}

runTestSuite().catch((err) => {
  console.error("Test execution error:", err);
  process.exit(1);
});
