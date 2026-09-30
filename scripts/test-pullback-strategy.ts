/**
 * Automated Verification Script for 8-Image Pullback Strategy Knowledge
 * Validates:
 * 1. Uptrend Pullback with Rejection Confirmation -> 4 Pillars Validated
 * 2. Trap 1 (Shallow FOMO): Price retraced shallowly without reaching key zone
 * 3. Trap 2 (No Confirmation): Price in Value Zone but no reversal candle
 * 4. Trap 3 (Counter-Trend): Trading against dominant macro trend
 */

import { evaluatePullbackQuality } from "../lib/indicators";
import { Candle } from "../lib/types";

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ FAIL: ${message}`);
    process.exit(1);
  } else {
    console.log(`✅ PASS: ${message}`);
  }
}

function runTests() {
  console.log("\n========================================================");
  console.log("📐 STARTING 8-IMAGE PULLBACK STRATEGY VERIFICATION");
  console.log("========================================================\n");

  // Synthetic candles for Uptrend with healthy pullback
  const now = Math.floor(Date.now() / 1000);
  const baseCandles: Candle[] = [];
  for (let i = 0; i < 30; i++) {
    const time = now - (30 - i) * 3600;
    const price = 2600 + i * 2;
    baseCandles.push({
      time,
      open: price,
      high: price + 2,
      low: price - 1,
      close: price + 1.5,
      volume: 1000,
    });
  }

  // --- Case 1: Perfect Pullback Setup with Rejection Candle (Image 06) ---
  console.log("--- 1. Testing Perfect Setup: Uptrend + Value Zone + Rejection Confirmation ---");
  const perfectCandles = [...baseCandles];
  // Add a pullback into 2630 zone and a strong Bullish Pin Bar
  perfectCandles.push({
    time: now,
    open: 2632,
    high: 2635,
    low: 2620, // long lower wick (rejection pin bar)
    close: 2634,
    volume: 2500,
  });

  const ema20 = perfectCandles.map(() => 2633);
  const ema50 = perfectCandles.map(() => 2628);
  const srZones = [{ min: 2625, max: 2635, label: "H1 S-R Flip Zone" }];

  const res1 = evaluatePullbackQuality(perfectCandles, ema20, ema50, 5, srZones, "BULLISH");
  assert(res1.state === "HEALTHY_VALUE_ZONE", "State is HEALTHY_VALUE_ZONE");
  assert(res1.rejectionConfirmed === true, "Rejection candle confirmed");
  assert(res1.fourPillars?.trendConfirmed === true, "Pillar 1 (Trend) confirmed");
  assert(res1.fourPillars?.valueZoneReached === true, "Pillar 2 (Value Zone) confirmed");
  assert(res1.fourPillars?.reversalSignalDetected === true, "Pillar 3 (Reversal Signal) confirmed");
  assert(res1.trapsAvoided?.noConfirmationWarning === false, "No confirmation trap avoided");

  // --- Case 2: Trap 1 (Shallow FOMO - Image 07 Trap 1) ---
  console.log("\n--- 2. Testing Trap 1: Shallow FOMO (Not reaching key zone) ---");
  const shallowCandles = [...baseCandles];
  // Price stayed high, shallow dip
  shallowCandles.push({
    time: now,
    open: 2658,
    high: 2660,
    low: 2656,
    close: 2659,
    volume: 800,
  });
  const res2 = evaluatePullbackQuality(shallowCandles, ema20, ema50, 5, undefined, "BULLISH");
  assert(res2.trapsAvoided?.shallowFomoWarning === true, "Trap 1 (Shallow FOMO) detected");
  assert(Boolean(res2.trapsAvoided?.activeTrapWarning), "Active trap warning message generated");

  // --- Case 3: Trap 2 (No Confirmation - Image 07 Trap 2) ---
  console.log("\n--- 3. Testing Trap 2: Reaching Zone but NO Reversal Confirmation ---");
  const noConfirmCandles = [...baseCandles];
  // Bearish candle closing down at zone without wick rejection
  noConfirmCandles.push({
    time: now,
    open: 2634,
    high: 2634,
    low: 2628,
    close: 2629,
    volume: 1200,
  });
  const res3 = evaluatePullbackQuality(noConfirmCandles, ema20, ema50, 5, srZones, "BULLISH");
  assert(res3.state === "HEALTHY_VALUE_ZONE", "State is in value zone");
  assert(res3.rejectionConfirmed === false, "Rejection is false");
  assert(res3.trapsAvoided?.noConfirmationWarning === true, "Trap 2 (No Confirmation) detected");
  assert(res3.tacticalAdvice.includes("กับดักที่ 2"), "Tactical advice warns against trap 2");

  // --- Case 4: Trap 3 (Counter-Trend - Image 07 Trap 3) ---
  console.log("\n--- 4. Testing Trap 3: Counter-Trend Entry ---");
  const counterTrendEMA20 = perfectCandles.map(() => 2610);
  const counterTrendEMA50 = perfectCandles.map(() => 2630); // EMA20 < EMA50 (Downtrend)
  // Trying to BUY in a downtrend below EMA50
  const res4 = evaluatePullbackQuality(perfectCandles, counterTrendEMA20, counterTrendEMA50, 5, srZones, "BEARISH");
  assert(Boolean(res4.trapsAvoided?.counterTrendWarning === true || res4.trapsAvoided?.activeTrapWarning?.includes("กับดัก")), "Trap 3 or warning active");

  console.log("\n========================================================");
  console.log("🎉 ALL 4 PULLBACK STRATEGY TEST CASES PASSED PERFECTLY!");
  console.log("========================================================\n");
}

runTests();
