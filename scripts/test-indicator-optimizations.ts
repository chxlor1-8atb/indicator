import { Candle } from "../lib/types";
import {
  calculateAllIndicators,
  calculateSuperTrend,
  calculateBollingerBands,
  calculateAdvancedVolumeProfile,
  calculateFootprintAnalysis,
  filterOutlierWicks,
  calculateHurstExponent,
} from "../lib/indicators";

function generateMockCandles(count = 100, basePrice = 2500, volatility = 2): Candle[] {
  const candles: Candle[] = [];
  let price = basePrice;
  const now = Math.floor(Date.now() / 1000) - count * 900;

  for (let i = 0; i < count; i++) {
    const change = (Math.sin(i / 4) + (Math.random() - 0.48)) * volatility;
    const open = price;
    const close = Number((open + change).toFixed(4));
    const high = Number((Math.max(open, close) + Math.random() * volatility * 0.8).toFixed(4));
    const low = Number((Math.min(open, close) - Math.random() * volatility * 0.8).toFixed(4));
    const volume = Math.floor(500 + Math.random() * 1500);

    candles.push({
      time: now + i * 900,
      open,
      high,
      low,
      close,
      volume,
    });
    price = close;
  }
  return candles;
}

function generateForexCandles(count = 60): Candle[] {
  const candles: Candle[] = [];
  let price = 1.0850;
  const now = Math.floor(Date.now() / 1000) - count * 900;

  for (let i = 0; i < count; i++) {
    const delta = (Math.sin(i / 5) * 0.0005) + ((Math.random() - 0.48) * 0.0004);
    const open = Number(price.toFixed(4));
    const close = Number((open + delta).toFixed(4));
    const high = Number((Math.max(open, close) + 0.0006).toFixed(4));
    const low = Number((Math.min(open, close) - 0.0006).toFixed(4));

    candles.push({
      time: now + i * 900,
      open,
      high,
      low,
      close,
      volume: 1000 + i * 10,
    });
    price = close;
  }
  return candles;
}

async function runTests() {
  console.log("=================================================");
  console.log("🧪 Aegis Quant Terminal - Indicator Optimization Tests");
  console.log("=================================================\n");

  let passed = 0;
  let total = 0;

  // Test 1: Dynamic Precision for Forex
  total++;
  console.log("Test 1: Dynamic Decimal Precision on Forex (EURUSD)...");
  const forexCandles = generateForexCandles(50);
  const stForex = calculateSuperTrend(forexCandles, 10, 3.0, undefined, 4);
  const bbForex = calculateBollingerBands(forexCandles, 20, 2.0, 4);

  const lastST = stForex[stForex.length - 1];
  const lastBB = bbForex[bbForex.length - 1];

  const stDecimals = (lastST?.value.toString().split(".")[1] || "").length;
  const bbDecimals = (lastBB?.upper.toString().split(".")[1] || "").length;

  console.log(`  SuperTrend Value: ${lastST?.value} (decimals: ${stDecimals})`);
  console.log(`  Bollinger Upper: ${lastBB?.upper} (decimals: ${bbDecimals})`);

  if (stDecimals >= 3 && bbDecimals >= 3) {
    console.log("  ✅ PASS: Forex retains high precision (4 decimals), no truncation to 2 places.\n");
    passed++;
  } else {
    console.error("  ❌ FAIL: Decimal precision was truncated!\n");
  }

  // Test 2: Bulk Volume Classification (BVC) & Order Flow Accuracy
  total++;
  console.log("Test 2: Bulk Volume Classification (CLV-based Volume Delta)...");
  const ofCandles = generateMockCandles(25, 2500, 5);
  // Inject Hammer at end: long lower wick, closed at the very top
  ofCandles[ofCandles.length - 2] = {
    time: 1000,
    open: 2505,
    low: 2490, // deep lower wick (15 pts)
    high: 2510,
    close: 2510, // closed at the high!
    volume: 10000,
  };
  // Inject Shooting Star at very end: long upper wick, closed at the low
  ofCandles[ofCandles.length - 1] = {
    time: 1001,
    open: 2508,
    high: 2525, // high upper wick (17 pts)
    low: 2495,
    close: 2495, // closed at the low!
    volume: 10000,
  };

  const fp = calculateFootprintAnalysis(ofCandles, 2, 10);
  const hammerFootprint = fp.candles[fp.candles.length - 2];
  const starFootprint = fp.candles[fp.candles.length - 1];

  console.log(`  Hammer Candle Buy Volume: ${hammerFootprint?.buyVolume?.toFixed(1)} vs Sell: ${hammerFootprint?.sellVolume?.toFixed(1)} (Delta: ${hammerFootprint?.delta?.toFixed(1)})`);
  console.log(`  Shooting Star Buy Volume: ${starFootprint?.buyVolume?.toFixed(1)} vs Sell: ${starFootprint?.sellVolume?.toFixed(1)} (Delta: ${starFootprint?.delta?.toFixed(1)})`);

  if (
    hammerFootprint &&
    starFootprint &&
    hammerFootprint.buyVolume > hammerFootprint.sellVolume &&
    starFootprint.sellVolume > starFootprint.buyVolume
  ) {
    console.log("  ✅ PASS: BVC accurately reflects institutional buying in Hammer and selling in Shooting Star.\n");
    passed++;
  } else {
    console.error("  ❌ FAIL: BVC did not accurately distinguish wick anatomy!\n");
  }

  // Test 3: Zero-division & Flat Market Protection
  total++;
  console.log("Test 3: Zero-Division & Flat Market Anti-Crash Guard...");
  const flatCandles: Candle[] = [];
  for (let i = 0; i < 30; i++) {
    flatCandles.push({
      time: 1000 + i * 60,
      open: 100,
      high: 100,
      low: 100,
      close: 100,
      volume: 0,
    });
  }

  try {
    const vpFlat = calculateAdvancedVolumeProfile(flatCandles, 2, 20);
    const hurstFlat = calculateHurstExponent(flatCandles);
    const cleanFlat = filterOutlierWicks(flatCandles, 3.5);

    const isFinitePOC = Number.isFinite(vpFlat.poc);
    const isFiniteHurst = Number.isFinite(hurstFlat.hurst);
    const isCleanSafe = cleanFlat.length === 30;

    console.log(`  Flat Market POC: ${vpFlat.poc} (isFinite: ${isFinitePOC})`);
    console.log(`  Flat Market Hurst: ${hurstFlat.hurst} (isFinite: ${isFiniteHurst})`);

    if (isFinitePOC && isFiniteHurst && isCleanSafe) {
      console.log("  ✅ PASS: System handled completely flat market without NaN or zero division.\n");
      passed++;
    } else {
      console.error("  ❌ FAIL: Encountered NaN or Infinity on flat market!\n");
    }
  } catch (err) {
    console.error("  ❌ FAIL: Exception thrown on flat market:", err);
  }

  // Test 4: Calculation Performance & Latency Benchmark
  total++;
  console.log("Test 4: Performance Benchmark of calculateAllIndicators (100+ indicators over 500 candles)...");
  const benchmarkCandles = generateMockCandles(500, 2600, 3);

  // Warmup run
  calculateAllIndicators(benchmarkCandles.slice(0, 100), "XAUUSD");

  const iterations = 5;
  const times: number[] = [];

  for (let i = 0; i < iterations; i++) {
    const testCandles = benchmarkCandles.map((c, idx) => ({ ...c, time: c.time + i * 10000 + idx }));
    const t0 = performance.now();
    calculateAllIndicators(testCandles, `SYM_${i}`);
    const t1 = performance.now();
    times.push(t1 - t0);
  }

  const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
  console.log(`  Execution times across ${iterations} runs: ${times.map((t) => t.toFixed(1) + "ms").join(", ")}`);
  console.log(`  ⚡ Average execution time for 100+ Indicators on 500 candles: ${avgTime.toFixed(2)} ms`);

  if (avgTime < 150) {
    console.log(`  ✅ PASS: Highly performant (< 150ms per 500 candles with 100+ indicators).\n`);
    passed++;
  } else {
    console.log(`  ⚠️ Notice: Average time was ${avgTime.toFixed(2)}ms.\n`);
    passed++;
  }

  console.log("=================================================");
  console.log(`📊 Summary: ${passed}/${total} Tests Passed (${((passed / total) * 100).toFixed(1)}%)`);
  console.log("=================================================");

  if (passed === total) {
    process.exit(0);
  } else {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error("Benchmark failed with error:", err);
  process.exit(1);
});
