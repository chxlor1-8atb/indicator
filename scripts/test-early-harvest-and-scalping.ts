/**
 * Test Suite: Early Profit Harvesting & Continuous Micro-Compounding
 * Verifies:
 * 1. evaluateEarlyProfitHarvest under various price action & momentum conditions
 * 2. calculateDynamicPositionSize continuous linear lot stepping for Cent & Standard accounts
 * 3. Default pilot configuration for fast scalping (15m timeframe)
 */

import { evaluateEarlyProfitHarvest, calculateDynamicPositionSize } from '../lib/riskEngine';
import { DEFAULT_PILOT_CONFIG } from '../lib/autonomousEngine';

console.log('================================================================');
console.log('🧪 RUNNING TEST SUITE: EARLY PROFIT HARVEST & SCALPING COMPOUNDING');
console.log('================================================================\n');

let passCount = 0;
let failCount = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  if (condition) {
    console.log(`  ✅ PASS: ${testName} ${detail ? `(${detail})` : ''}`);
    passCount++;
  } else {
    console.error(`  ❌ FAIL: ${testName} ${detail ? `(${detail})` : ''}`);
    failCount++;
  }
}

// ====================================================================
// TEST 1: Early Profit Harvest - Thresholds & Momentum Exhaustion
// ====================================================================
console.log('--- TEST 1: Early Profit Harvesting Engine ---');

// Case 1A: Profit is only +0.5R (< 0.75R minimum) -> Should NOT harvest
const result1A = evaluateEarlyProfitHarvest({
  direction: 'BUY',
  entryPrice: 2600.0,
  currentPrice: 2605.0,
  stopLossPrice: 2590.0, // Risk = 10 pts, Profit = 5 pts (0.5R)
  tp1Price: 2615.0,
  symbol: 'XAUUSD',
  rsiValues: [72, 75] // Overbought but still under 0.75R
});
assert(!result1A.shouldHarvest, 'Under 0.75R should NOT harvest', `R: ${result1A.currentR.toFixed(2)}`);

// Case 1B: Profit is +0.85R with Bearish Climax Wick on BUY -> Should Harvest
const result1B = evaluateEarlyProfitHarvest({
  direction: 'BUY',
  entryPrice: 2600.0,
  currentPrice: 2608.5,
  stopLossPrice: 2590.0, // Risk = 10 pts, Profit = 8.5 pts (0.85R)
  tp1Price: 2620.0,
  symbol: 'XAUUSD',
  lastCandle: {
    open: 2606.0,
    high: 2614.0, // Top wick = 2614 - 2608.5 = 5.5 pts out of 9 pts range (~61% upper wick)
    low: 2605.0,
    close: 2608.5,
    volume: 1000,
    time: 123456
  }
});
assert(result1B.shouldHarvest, 'Bearish Climax Wick at +0.85R triggers early harvest', `Reason: ${result1B.harvestReason}`);
assert(result1B.harvestType === 'FULL', 'Exhaustion trigger requests FULL harvest');

// Case 1C: Profit is +0.80R with RSI Overbought Turning Down (Hook) on BUY
const result1C = evaluateEarlyProfitHarvest({
  direction: 'BUY',
  entryPrice: 2600.0,
  currentPrice: 2608.0,
  stopLossPrice: 2590.0,
  tp1Price: 2620.0,
  symbol: 'XAUUSD',
  rsiValues: [67.0, 74.0] // Turned down from 74 to 67
});
assert(result1C.shouldHarvest, 'RSI Bearish Hook at +0.80R triggers early harvest', `Reason: ${result1C.harvestReason}`);

// Case 1D: Profit is +0.80R with RSI Oversold Turning Up on SELL
const result1D = evaluateEarlyProfitHarvest({
  direction: 'SELL',
  entryPrice: 2600.0,
  currentPrice: 2592.0,
  stopLossPrice: 2610.0,
  tp1Price: 2580.0,
  symbol: 'XAUUSD',
  rsiValues: [33.0, 26.0] // Turned up from 26 to 33
});
assert(result1D.shouldHarvest, 'RSI Bullish Hook at +0.80R on SELL triggers harvest', `Reason: ${result1D.harvestReason}`);

// Case 1E: Front-running TP1 when price is within 1.5 pips of TP1 (0.10 pt on Gold = 1 pip)
const result1E = evaluateEarlyProfitHarvest({
  direction: 'BUY',
  entryPrice: 2600.0,
  currentPrice: 2614.90,
  stopLossPrice: 2590.0,
  tp1Price: 2615.0, // 0.10 pt = 1.0 pip away from TP1!
  symbol: 'XAUUSD'
});
assert(result1E.shouldHarvest, 'Front-running TP1 within 1.5 pips', `Reason: ${result1E.harvestReason}`);

// Case 1F: Front-running Opposing Barrier / Order Block within 2.5 pips (0.20 pt = 2.0 pips)
const result1F = evaluateEarlyProfitHarvest({
  direction: 'BUY',
  entryPrice: 2600.0,
  currentPrice: 2610.0,
  stopLossPrice: 2590.0,
  tp1Price: 2620.0,
  symbol: 'XAUUSD',
  opposingZonePrice: 2610.20 // 0.20 pt = 2.0 pips away
});
assert(result1F.shouldHarvest, 'Front-running Opposing Order Block zone within 2.5 pips', `Reason: ${result1F.harvestReason}`);

// ====================================================================
// TEST 2: Continuous Micro-Compounding (Cent & Standard Accounts)
// ====================================================================
console.log('\n--- TEST 2: Continuous Micro-Compounding Sizing ---');

const centBalances = [10, 15, 25, 50, 75, 100];
const calculatedCentLots: number[] = [];

for (const bal of centBalances) {
  const size = calculateDynamicPositionSize({
    accountBalance: bal,
    customRiskPct: 2.0,
    currentPrice: 2600.0,
    stopLossDistancePrice: 1.5, // 15 pips risk (realistic sniper micro-SL)
    symbol: 'XAUUSD',
    accountType: 'CENT'
  });
  
  const centLot = size.centAccountLots || 0;
  calculatedCentLots.push(centLot);
  console.log(`  💰 Bal: $${bal} (${bal * 100} USC) -> Standard Lot: ${size.lotSize} | Cent Lot: ${centLot} USC (${size.tierName})`);
}

// Check that Cent Lots increase monotonically and continuously as balance grows
let isMonotonic = true;
for (let i = 1; i < calculatedCentLots.length; i++) {
  if (calculatedCentLots[i] < calculatedCentLots[i - 1]) {
    isMonotonic = false;
  }
}
assert(isMonotonic, 'Cent account lot sizes scale continuously and monotonically with balance');
assert(calculatedCentLots[0] >= 0.01, 'Min Cent Lot at $10 is >= 0.01 lot');
assert(calculatedCentLots[calculatedCentLots.length - 1] > calculatedCentLots[0], 'Cent Lot at $100 is higher than at $10');

// ====================================================================
// TEST 3: Scalping Configuration Defaults
// ====================================================================
console.log('\n--- TEST 3: Autonomous Scalping Defaults ---');

assert(DEFAULT_PILOT_CONFIG.scalpTimeframe === '15m', 'Default scalp timeframe is 15m for high frequency trading');
assert(DEFAULT_PILOT_CONFIG.enableEarlyHarvest === true, 'Early Profit Harvesting is enabled by default in Pilot');

console.log('\n================================================================');
console.log(`🏁 TEST RESULTS: ${passCount} PASSED, ${failCount} FAILED`);
console.log('================================================================\n');

if (failCount > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
