import { calculateSniperPrecisionEntry, calculateSniperMicroSL } from "../lib/indicators";
import { Candle, OrderBlockValidatorInfo, FVGMitigationInfo, OTEZoneInfo } from "../lib/types";

// ─── 1. SIMULATED CANDLESTICK DATA FOR A HIGH-IMPACT FED NEWS EVENT ON GOLD (XAUUSD) ───
// Scenario: Price before news is steady around 2,500.00
// At 01:00 AM Fed announces Rate Hike:
// Candle 1 (News Spike): Sweeps High to 2,510.50 (Liquidity Hunt), then plummets violently to 2,478.00 (Close at 2,482.00)
// Candle 2 (Post-News Pullback): Retests upward into FVG / 61.8% OTE zone reaching 2,493.50, then rejects down to close at 2,485.00
// Candle 3 & 4 (Expansion): Continues institutional trend down to 2,465.00
const simulatedNewsCandles: Candle[] = [
  { time: 1726500000, open: 2498.0, high: 2501.2, low: 2497.0, close: 2500.0, volume: 1200 },
  { time: 1726500900, open: 2500.0, high: 2502.5, low: 2498.5, close: 2501.0, volume: 1450 },
  { time: 1726501800, open: 2501.0, high: 2503.0, low: 2499.0, close: 2500.5, volume: 1600 },
  // 🔴 01:00 AM - THE FED NEWS IMPULSE CANDLE (Massive volatility & 320 pip range)
  { time: 1726502700, open: 2500.5, high: 2510.5, low: 2478.0, close: 2482.0, volume: 18500 },
  // ⏳ 01:15 AM - POST-NEWS PULLBACK & RETEST (Retests 2493.50 FVG, then sells off)
  { time: 1726503600, open: 2482.0, high: 2493.5, low: 2481.0, close: 2485.0, volume: 8900 },
  // 📉 01:30 AM - INSTITUTIONAL EXPANSION
  { time: 1726504500, open: 2485.0, high: 2486.0, low: 2470.0, close: 2472.0, volume: 7200 },
  // 🎯 01:45 AM - FULL TARGET REACHED
  { time: 1726505400, open: 2472.0, high: 2474.0, low: 2464.0, close: 2465.0, volume: 6500 },
];

console.log("================================================================================");
console.log("   FED INTEREST RATE HIKE SIMULATION: GOLD (XAUUSD) - CAPITAL: $10 USD");
console.log("================================================================================\n");

// ─── STRATEGY 1: BLIND MARKET ORDER AT NEWS MOMENT (กด Market สวน/ตามตอนข่าวออกวินาทีแรก) ───
console.log("--------------------------------------------------------------------------------");
console.log("【 กลยุทธ์ที่ 1: กด Market Order ทันทีที่ข่าวออก (Blind News Chasing) 】");
console.log("--------------------------------------------------------------------------------");
const brokerSpreadSpike = 80; // 80 pips ($8.00 spread spike during Fed)
const slippage = 25; // 25 pips slippage
console.log("• พฤติกรรมตลาด: ข่าว Fed ออกปุ๊บ กราฟสะบัดขึ้นกวาด High 2,510.50 ก่อนทุบลง 2,478.00");
console.log("• ค่าสเปรดโบรกเกอร์ (Spread): ถ่างขึ้นเป็น 80 pips ($8.00) และ Slippage 25 pips");

// Case 1A: Trader presses BUY (Thinking initial spike is real)
console.log("\n[กรณี 1A: กด BUY ทันทีตอนเห็นแท่งแรกพุ่งเขียว]");
const buyFillPrice = 2500.5 + (brokerSpreadSpike / 10) + (slippage / 10); // 2511.00
const traderSL = 2495.0; // Standard 55 pip SL
console.log(`  - ราคาที่ได้จริงหลังโดน Spread & Slippage: ${buyFillPrice.toFixed(2)}`);
console.log(`  - เมื่อกราฟวกกลับทุบดิ่งลงไป 2,478.00: ชน Stop Loss ที่ ${traderSL.toFixed(2)}`);
const lossUSD_1A = ((buyFillPrice - traderSL) * 10 * 0.01).toFixed(2);
console.log(`  ❌ ผลลัพธ์: ขาดทุน -$${lossUSD_1A} USD (${((parseFloat(lossUSD_1A) / 10) * 100).toFixed(0)}% ของพอร์ต $10 พอร์ตแตกทันที!)`);

// Case 1B: Trader presses SELL (Chasing red candle after drop)
console.log("\n[กรณี 1B: กด SELL ตามน้ำตอนแท่งแดงดิ่งลง]");
const sellFillPrice = 2482.0 - (slippage / 10); // 2479.50 (Filled at bottom)
const sellSL = 2488.0; // Standard SL (85 pips above)
console.log(`  - ราคาที่ได้จริง (ก้นเหวหลัง Slippage): ${sellFillPrice.toFixed(2)}`);
console.log(`  - ในแท่งถัดไป กราฟดีดตัวกลับขึ้นไป Retest High ที่ 2,493.50`);
console.log(`  - ชน Stop Loss กวาดทิ้งที่ ${sellSL.toFixed(2)} ก่อนจะค่อยลงจริง`);
const lossUSD_1B = ((sellSL - sellFillPrice) * 10 * 0.01).toFixed(2);
console.log(`  ❌ ผลลัพธ์: ขาดทุน -$${lossUSD_1B} USD (${((parseFloat(lossUSD_1B) / 10) * 100).toFixed(0)}% ของพอร์ต $10)`);

// ─── STRATEGY 2: NEWS STRADDLE PENDING (ดักหัวท้าย Buy Stop / Sell Stop) ───
console.log("\n--------------------------------------------------------------------------------");
console.log("【 กลยุทธ์ที่ 2: ตั้งดักหัวท้าย (News Straddle Breakout: Buy Stop + Sell Stop) 】");
console.log("--------------------------------------------------------------------------------");
console.log("• ผู้ใช้ตั้ง Buy Stop ที่ 2,504.00 และ Sell Stop ที่ 2,496.00 ก่อนข่าว 2 นาที");
console.log("• ข่าว Fed กระชากขึ้น High 2,510.50 -> เกี่ยว Buy Stop ติดที่ 2,504.00");
console.log("• จากนั้นทุบดิ่งทันที -> กวาด SL ฝั่ง Buy ที่ 2,498.00 (ขาดทุน -$6.00)");
console.log("• วิ่งลงมาเกี่ยว Sell Stop ที่ 2,496.00 -> พอแท่งสองเด้งไป 2,493.50 (สเปรดถ่างกิน SL อีกฝั่ง)");
console.log("  ⚠️ ผลลัพธ์: โดน 'Whipsaw Double Kill' กวาด SL ทั้งสองฝั่ง ขาดทุนรวม -$9.50 (พอร์ต $10 แทบเกลี้ยง)");

// ─── STRATEGY 3: AEGIS INSTITUTIONAL POST-NEWS SNIPER (ระบบของเรา) ───
console.log("\n--------------------------------------------------------------------------------");
console.log("【 กลยุทธ์ที่ 3: โมเดลอัจฉริยะของ Aegis Quant (Institutional Post-News Sniper) 】");
console.log("--------------------------------------------------------------------------------");
console.log("• สเต็ป 1: ล็อกสถานะ ⛔ RED FOLDER FREEZE ช่วง 01:00 - 01:15 น. (ไม่เสียเงินสักบาท)");
console.log("• สเต็ป 2: รอจบแท่งข่าวแรก (01:15 น.) สเปรดหดกลับมาปกติ (15 pips)");

// Build realistic SMC structures from the Fed news candle
const orderBlocks: OrderBlockValidatorInfo = {
  activeBlocks: [
    {
      type: "BEARISH_OB",
      priceMin: 2497.0,
      priceMax: 2501.0,
      isMitigated: false,
      isBreaker: false,
      formedIndex: 3,
    },
  ],
  hasUnmitigatedOB: true,
  isRetestingBreaker: false,
  breakerCount: 0,
  description: "Institutional Supply Order Block at 2497.00 - 2501.00",
};

const fvgMitigation: FVGMitigationInfo = {
  activeFVGs: [
    {
      id: "fvg-fed-1",
      type: "BEARISH_FVG",
      top: 2498.0,
      bottom: 2489.0,
      consequentEncroachment: 2493.5,
      sizePips: 90,
      mitigationStatus: "UNMITIGATED",
      candleIndex: 3,
    },
  ],
  unmitigatedCount: 1,
  nearestFVG: null,
  recommendedEntryLimit: 2493.5,
  bias: "BEARISH_IMBALANCE",
  description: "Displacement Bearish FVG from Fed news candle",
};

const oteZone: OTEZoneInfo = {
  swingHigh: 2510.5,
  swingLow: 2478.0,
  fib618: 2498.0,
  fib705: 2494.0,
  fib786: 2489.0,
  oteMin: 2489.0,
  oteMax: 2498.0,
  sweetSpot: 2493.5,
  isPriceInOTE: true,
  bias: "BEARISH",
  description: "OTE 61.8%-78.6% Golden Pocket aligned with FVG 50% CE",
};

const atr = 3.5;

console.log("\n🔍 การตรวจจับเชิงปริมาณของสมองกล Aegis หลังจบแท่งข่าว:");
console.log(`  1. ตรวจพบ Fair Value Gap (FVG Bearish) ระหว่าง 2,489.00 - 2,498.00 (ขนาด 90 pips)`);
console.log(`  2. ตรวจพบ Institutional OTE Sweet Spot: ${oteZone.sweetSpot} (ทับซ้อนกับ FVG 50% CE พอดี)`);
console.log(`  3. ตรวจพบ Bearish Market Structure Shift (MSS) หลังราคาหลุดแนวรับ 2,497.00`);

// Calculate Precision Entry & Micro-SL
const precisionEntry = calculateSniperPrecisionEntry(
  2485.0, // current price during pullback
  "SELL",
  orderBlocks,
  fvgMitigation,
  oteZone,
  undefined,
  2
);

const limitEntry = precisionEntry.recommendedLimit; // 2493.50
const pastCandles = simulatedNewsCandles.slice(0, 5);
const microSL = calculateSniperMicroSL(
  pastCandles,
  "SELL",
  limitEntry,
  orderBlocks,
  fvgMitigation,
  oteZone,
  atr,
  2,
  "XAUUSD"
);

console.log("\n🎯 คำสั่งที่ Aegis Quant แนะนำให้ออก (MT5 Ticket):");
console.log(`  • คำสั่ง: SELL LIMIT ที่ ${limitEntry}`);
console.log(`  • Stop Loss (Sniper Micro-SL): ${microSL.stopLoss} (สั้นเพียง ${microSL.slPips} pips)`);
console.log(`  • Take Profit 1 (TP1): ${microSL.tp1Price} (+${microSL.tp1Pips} pips) [ก้นแท่งข่าวเดิม]`);
console.log(`  • Take Profit 2 (TP2): ${microSL.tp2Price} (+${microSL.tp2Pips} pips) [เป้าสถาบัน]`);
console.log(`  • Risk / Reward Ratio: ${microSL.riskRewardRatio}`);

// Calculate Financial Outcome on $10 Account
const lot = 0.01;
const dollarRisk = (microSL.slPips * 0.10 * (lot / 0.01)).toFixed(2);
const tp1Profit = (microSL.tp1Pips * 0.10 * (lot / 0.01)).toFixed(2);
const tp2Profit = (microSL.tp2Pips * 0.10 * (lot / 0.01)).toFixed(2);

console.log("\n💰 ผลตอบแทนทางการเงินจริงบนพอร์ต $10 USD (Lot 0.01):");
console.log(`  • ความเสี่ยงสูงสุดหากผิดทาง (Max Loss): -$${dollarRisk} USD (เสี่ยงเพียง 14% ของพอร์ต)`);
console.log(`  • เมื่อกราฟทุบลงไป 2,465.00 ในแท่งที่ 6-7:`);
console.log(`    ✅ ชน TP1 (${microSL.tp1Price}): ได้กำไร +$${tp1Profit} USD (+${((parseFloat(tp1Profit) / 10) * 100).toFixed(0)}% ของพอร์ต)`);
console.log(`    🚀 ชน TP2 (${microSL.tp2Price}): ได้กำไร +$${tp2Profit} USD (+${((parseFloat(tp2Profit) / 10) * 100).toFixed(0)}% ของพอร์ต)`);
console.log(`    📈 ยอดเงินในพอร์ตโตจาก $10.00 กลายเป็น $${(10 + parseFloat(tp2Profit)).toFixed(2)} USD!`);
console.log("================================================================================\n");
