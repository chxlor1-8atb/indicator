/**
 * Automated Verification Script for Indicator System V2 5-Pillars Enhancement
 */
import { LRUCache } from "../lib/cache";
import { CircuitBreaker, fetchWithRetry } from "../lib/resilience";
import { validatePriceIntegrity, validateOrderConfluence } from "../lib/priceIntegrity";
import { getPooledConnectionString } from "../lib/db";
import {
  calculateDynamicPositionSize,
  calculateAdaptiveTrailingStop,
  calculatePartialTpPlan,
} from "../lib/riskEngine";
import { Candle } from "../lib/types";

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ FAIL: ${message}`);
    process.exit(1);
  } else {
    console.log(`✅ PASS: ${message}`);
  }
}

async function runTests() {
  console.log("\n========================================================");
  console.log("🚀 STARTING INDICATOR SYSTEM V2 5-PILLARS VERIFICATION");
  console.log("========================================================\n");

  // ─── 1. PERFORMANCE & CACHING STRATEGY ───
  console.log("--- 1. Testing LRUCache (Capacity Eviction & TTL) ---");
  const cache = new LRUCache<string, number>({ maxSize: 3, defaultTtlMs: 200 });

  cache.set("a", 1);
  cache.set("b", 2);
  cache.set("c", 3);
  assert(cache.get("a") === 1, "LRUCache retains recent item");

  // Adding 'd' should evict 'b' since 'a' was recently accessed
  cache.set("d", 4);
  assert(cache.get("b") === undefined, "LRUCache evicts least recently used ('b')");
  assert(cache.get("a") === 1, "LRUCache keeps recently used 'a'");
  assert(cache.get("c") === 3, "LRUCache keeps 'c'");
  assert(cache.get("d") === 4, "LRUCache stores new item 'd'");

  // Test TTL expiry
  await new Promise((r) => setTimeout(r, 250));
  assert(cache.get("a") === undefined, "LRUCache expires items after TTL");

  // ─── 2. ERROR HANDLING & RESILIENCE (CIRCUIT BREAKER) ───
  console.log("\n--- 2. Testing CircuitBreaker Pattern ---");
  let failCount = 0;
  const breaker = new CircuitBreaker({
    name: "TestService",
    failureThreshold: 2,
    resetTimeoutMs: 150,
    successThreshold: 1,
  });

  const unreliableFn = async () => {
    failCount++;
    if (failCount <= 2) throw new Error("Network transient failure");
    return "SUCCESS";
  };

  // Execution 1: Fails (Failure 1)
  try { await breaker.execute(unreliableFn); } catch {}
  assert(breaker.getState() === "CLOSED", "CircuitBreaker remains CLOSED after 1 failure");

  // Execution 2: Fails (Failure 2 -> Trip to OPEN)
  try { await breaker.execute(unreliableFn); } catch {}
  assert(breaker.getState() === "OPEN", "CircuitBreaker TRIPPED to OPEN after 2 failures");

  // Execution 3: Immediate fail-fast without invoking target
  let wasTripped = false;
  try {
    await breaker.execute(async () => "SHOULD_NOT_RUN");
  } catch (err) {
    wasTripped = String(err).includes("OPEN");
  }
  assert(wasTripped, "CircuitBreaker fails fast when OPEN without running target function");

  // Wait for cooldown to HALF_OPEN
  await new Promise((r) => setTimeout(r, 180));
  assert(breaker.getState() === "HALF_OPEN", "CircuitBreaker transitions to HALF_OPEN after cooldown");

  // Probe execution succeeds -> Closes circuit
  const recoveryResult = await breaker.execute(unreliableFn);
  assert(recoveryResult === "SUCCESS", "CircuitBreaker executes successfully in HALF_OPEN");
  assert(breaker.getState() === "CLOSED", "CircuitBreaker CLOSES after successful probe");

  // ─── 3. REAL-TIME DATA SYNC ACCURACY ───
  console.log("\n--- 3. Testing Price Integrity & Order Confluence Validation ---");
  // Test Price Integrity
  const validGold = validatePriceIntegrity("XAUUSD", 2650.50);
  assert(validGold.isValid, "Valid Gold spot price approved");

  const negativePrice = validatePriceIntegrity("XAUUSD", -10);
  assert(!negativePrice.isValid, "Negative price rejected");

  const outOfBounds = validatePriceIntegrity("XAUUSD", 100);
  assert(!outOfBounds.isValid, "Gold price below sanity bounds ($100) rejected");

  const stalePrice = validatePriceIntegrity("XAUUSD", 2650.50, undefined, Date.now() - 40000);
  assert(!stalePrice.isValid, "Stale price older than 30s rejected");

  const mockCandle: Candle = { time: 1000, open: 2650, high: 2655, low: 2648, close: 2650, volume: 100 };
  const flashAnomaly = validatePriceIntegrity("XAUUSD", 2900, mockCandle);
  assert(!flashAnomaly.isValid, "Flash anomaly jump (9.4% gap) rejected");

  // Test Order Confluence
  const validBuyOrder = validateOrderConfluence("BUY", 2650, 2650, 2635, 2670, 2700, 1.2);
  assert(validBuyOrder.isValid, "Valid BUY hierarchy (SL < Entry < TP1 < TP2) approved");
  assert(validBuyOrder.effectiveRR >= 1.2, `Risk-Reward ratio verified (${validBuyOrder.effectiveRR}R)`);

  const invalidBuySlAboveEntry = validateOrderConfluence("BUY", 2650, 2650, 2660, 2670, 2700);
  assert(!invalidBuySlAboveEntry.isValid, "BUY with Stop Loss above Entry rejected");

  const liveViolatedSl = validateOrderConfluence("BUY", 2630, 2650, 2635, 2670, 2700);
  assert(!liveViolatedSl.isValid, "BUY where live price already violated Stop Loss rejected");

  // ─── 4. DATABASE PERFORMANCE (POOLED CONNECTION STRING) ───
  console.log("\n--- 4. Testing Database Connection Pooling Helper ---");
  const rawUrl = "postgresql://user:pass@ep-cool-snow-12345.us-east-2.aws.neon.tech/neondb";
  const pooledUrl = getPooledConnectionString(rawUrl);
  assert(pooledUrl.includes("-pooler.us-east-2.aws.neon.tech"), "Pooled connection string injected with -pooler");

  const alreadyPooled = "postgresql://user:pass@ep-cool-snow-12345-pooler.us-east-2.aws.neon.tech/neondb";
  assert(getPooledConnectionString(alreadyPooled) === alreadyPooled, "Already pooled string remains unchanged");

  // ─── 5. ADVANCED ORDER MANAGEMENT ───
  console.log("\n--- 5. Testing Dynamic Position Sizing, Trailing Stop & Partial TP ---");
  // 5.1 Dynamic Sizing
  const conservativeSize = calculateDynamicPositionSize({
    symbol: "XAUUSD",
    accountBalance: 10000,
    currentPrice: 2650,
    stopLossDistancePrice: 5,
    riskProfile: "CONSERVATIVE",
  });
  const aggressiveSize = calculateDynamicPositionSize({
    symbol: "XAUUSD",
    accountBalance: 10000,
    currentPrice: 2650,
    stopLossDistancePrice: 5,
    riskProfile: "AGGRESSIVE",
  });
  assert(
    aggressiveSize.calculatedLotSize > conservativeSize.calculatedLotSize,
    `Dynamic sizing respects Risk Profile: Aggressive (${aggressiveSize.calculatedLotSize} lot) > Conservative (${conservativeSize.calculatedLotSize} lot)`
  );

  // Consecutive loss throttle test
  const throttledSize = calculateDynamicPositionSize({
    symbol: "XAUUSD",
    accountBalance: 1000,
    currentPrice: 2650,
    stopLossDistancePrice: 15,
    riskProfile: "MODERATE",
    consecutiveLosses: 3,
  });
  assert(throttledSize.drawdownThrottle === 0.5, "Consecutive losses (>=3) cuts position risk by 50%");

  // 5.2 Multi-Stage Adaptive Trailing Stop
  const trailStage0 = calculateAdaptiveTrailingStop("BUY", 2650, 2655, 2640, 2640, 5, "XAUUSD");
  assert(trailStage0.stage === 0, "Stage 0 maintained when gain < 1.0R");

  const trailStage1 = calculateAdaptiveTrailingStop("BUY", 2650, 2662, 2640, 2640, 5, "XAUUSD");
  assert(trailStage1.stage === 1 && trailStage1.isBreakevenMoved, "Stage 1 moves SL to Breakeven (+ buffer) when gain >= 1.0R");

  const trailStage2 = calculateAdaptiveTrailingStop("BUY", 2650, 2668, 2640, 2650, 5, "XAUUSD");
  assert(trailStage2.stage === 2 && trailStage2.trailingSlPrice > 2650, "Stage 2 trails SL by 1.5x ATR when gain >= 1.5R");

  const trailStage3 = calculateAdaptiveTrailingStop("BUY", 2650, 2690, 2640, 2665, 5, "XAUUSD");
  assert(trailStage3.stage === 3 && trailStage3.trailingSlPrice >= 2685, "Stage 3 locks peak profit tightly with 1.0x ATR when gain >= 2.5R");

  // 5.3 Partial TP Plan
  const partialPlan = calculatePartialTpPlan(0.10, 2670, 2700);
  assert(partialPlan.tp1Lots === 0.05, "Partial TP1 allocates 50% (0.05 lot)");
  assert(partialPlan.tp2Lots === 0.03, "Partial TP2 allocates 30% (0.03 lot)");
  assert(partialPlan.runnerLots === 0.02, "Runner allocates remaining 20% (0.02 lot)");

  console.log("\n========================================================");
  console.log("🎉 ALL 5 PILLARS VERIFICATION TESTS PASSED SUCCESSFULLY!");
  console.log("========================================================\n");
}

runTests().catch((err) => {
  console.error("Verification script encountered an error:", err);
  process.exit(1);
});
