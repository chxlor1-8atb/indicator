import { Candle } from "../lib/types";
import { calculateMarketStructureShift } from "../lib/indicators";

function makeCandle(open: number, high: number, low: number, close: number, time: number): Candle {
  return { open, high, low, close, volume: 1500, time };
}

console.log("===============================================================");
console.log("🧪 RUNNING 8-IMAGE TREND & MARKET STRUCTURE VERIFICATION");
console.log("===============================================================");

// ─── TEST 1: Uptrend Structure (ภาพ 02, 03, 06) ───
// Sequence of HH and HL
const uptrendCandles: Candle[] = [];
let base = 2600;
let t = 1000;

for (let i = 0; i < 25; i++) {
  // Swing 1: 2600 -> 2620 -> 2610
  // Swing 2: 2610 -> 2635 -> 2625 (HH 2635, HL 2625)
  // Swing 3: 2625 -> 2650 -> 2640 (HH 2650, HL 2640)
  const step = Math.floor(i / 8);
  const offset = step * 25;
  const cycle = i % 8;
  if (cycle < 4) {
    // Up leg
    const low = base + offset + cycle * 7;
    const high = low + 5;
    uptrendCandles.push(makeCandle(low, high, low - 2, high - 1, t++));
  } else {
    // Retrace leg (higher low)
    const high = base + offset + 28 - (cycle - 4) * 4;
    const low = high - 4;
    uptrendCandles.push(makeCandle(high, high + 1, low, low + 1, t++));
  }
}

const upResult = calculateMarketStructureShift(uptrendCandles, 2);
console.log("\n--- TEST 1: Uptrend Structure (HH / HL) ---");
console.log(`Structure Type: ${upResult.structureType}`);
console.log(`Last HH: ${upResult.lastHH} | Last HL: ${upResult.lastHL}`);
console.log(`Tactical Plan: ${upResult.tacticalPlan}`);
if (upResult.structureType === "UPTREND") {
  console.log("✅ TEST 1 PASSED: Uptrend with HH & HL accurately identified!");
} else {
  console.error("❌ TEST 1 FAILED: Expected UPTREND but got " + upResult.structureType);
  process.exit(1);
}

// ─── TEST 2: Downtrend Structure (ภาพ 02, 04, 06) ───
// Sequence of LH and LL
const downtrendCandles: Candle[] = [];
base = 2700;
for (let i = 0; i < 25; i++) {
  const step = Math.floor(i / 8);
  const offset = step * 25;
  const cycle = i % 8;
  if (cycle < 4) {
    // Down leg (making lower lows)
    const high = base - offset - cycle * 7;
    const low = high - 5;
    downtrendCandles.push(makeCandle(high, high + 2, low, low + 1, t++));
  } else {
    // Bounce leg (making lower highs)
    const low = base - offset - 28 + (cycle - 4) * 4;
    const high = low + 4;
    downtrendCandles.push(makeCandle(low, high, low - 1, high - 1, t++));
  }
}

const downResult = calculateMarketStructureShift(downtrendCandles, 2);
console.log("\n--- TEST 2: Downtrend Structure (LH / LL) ---");
console.log(`Structure Type: ${downResult.structureType}`);
console.log(`Last LH: ${downResult.lastLH} | Last LL: ${downResult.lastLL}`);
console.log(`Tactical Plan: ${downResult.tacticalPlan}`);
if (downResult.structureType === "DOWNTREND") {
  console.log("✅ TEST 2 PASSED: Downtrend with LH & LL accurately identified!");
} else {
  console.error("❌ TEST 2 FAILED: Expected DOWNTREND but got " + downResult.structureType);
  process.exit(1);
}

// ─── TEST 3: Market Structure Shift / BOS (ภาพ 07) ───
// Break of Structure with Strong Displacement
const mssCandles = [...uptrendCandles];
// Add a strong sudden breakdown candle that shatters the recent swing low with large body
const lastCandle = mssCandles[mssCandles.length - 1];
const strongDrop = makeCandle(lastCandle.close, lastCandle.close + 2, 2580, 2585, t++);
mssCandles.push(strongDrop);

const mssResult = calculateMarketStructureShift(mssCandles, 2);
console.log("\n--- TEST 3: Market Structure Shift (BOS) ---");
console.log(`MSS Detected: ${mssResult.detected}`);
console.log(`MSS Type: ${mssResult.type}`);
console.log(`Break Price: ${mssResult.breakPrice}`);
console.log(`Displacement: ${mssResult.displacementMultiplier}x ATR (${mssResult.displacementVelocity})`);
console.log(`Description: ${mssResult.description}`);

if (mssResult.detected && mssResult.type === "BEARISH_MSS") {
  console.log("✅ TEST 3 PASSED: Bearish Market Structure Shift detected!");
} else {
  console.error("❌ TEST 3 FAILED: Expected BEARISH_MSS");
  process.exit(1);
}

console.log("\n🎉 ALL 8-IMAGE TREND & MARKET STRUCTURE TESTS PASSED 100%!\n");
