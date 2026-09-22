import { checkBreakoutConfirmation } from "../lib/indicators";
import { Candle } from "../lib/types";

function runTests() {
  console.log("===============================================================");
  console.log("🧪 RUNNING 8-IMAGE BREAKOUT & FALSE BREAKOUT QUANT VERIFICATION");
  console.log("===============================================================\n");

  let passedAll = true;

  // ─── TEST CASE 1: VALID BULLISH BREAKOUT (เบรกจริงขาขึ้น - โอกาสชนะ 70-80%) ───
  console.log("--- TEST 1: Valid Bullish Breakout (ภาพที่ 01-08) ---");
  const resistance = 2650.0;
  const validBuyCandle: Candle = {
    time: Math.floor(Date.now() / 1000) - 300,
    open: 2645.0,
    high: 2658.0,
    low: 2644.0,
    close: 2656.0, // ปิดเหนือ 2650 ชัดเจน เนื้อเทียนแน่น
    volume: 3500, // Volume 1.75x เทียบกับ SMA 2000
  };

  const dummyCandles: Candle[] = [
    { time: 1000, open: 2640, high: 2649, low: 2638, close: 2642, volume: 1900 },
    { time: 2000, open: 2642, high: 2650.5, low: 2640, close: 2645, volume: 2100 }, // แตะครั้งที่ 1
    { time: 3000, open: 2645, high: 2651, low: 2649.8, close: 2653, volume: 3200 }, // แตะแล้วเด้ง Retest
    validBuyCandle,
  ];

  const result1 = checkBreakoutConfirmation(
    2657.0,
    resistance,
    validBuyCandle,
    "1h",
    Date.now(),
    "BUY",
    {
      candles: dummyCandles,
      volumeSMA: 2000,
      currentATR: 8.0,
      htfTrend: "BULLISH",
      newsSafe: true,
    }
  );

  console.log(`Type: ${result1.breakoutType}`);
  console.log(`Score: ${result1.checklistScore}/7`);
  console.log(`Volume Ratio: ${result1.volumeRatio}x (Surge: ${result1.isVolumeSurge})`);
  console.log(`Opposite Wick Ratio: ${((result1.oppositeWickRatio ?? 0) * 100).toFixed(1)}%`);
  console.log(`Win Probability: ${result1.winProbability}%`);
  console.log(`Passed items:\n  - ${result1.checklistPassed?.join("\n  - ")}`);

  if (result1.breakoutType !== "VALID_BREAKOUT" || (result1.winProbability ?? 0) < 70) {
    console.error("❌ TEST 1 FAILED: Expected VALID_BREAKOUT with Win Probability >= 70%");
    passedAll = false;
  } else {
    console.log("✅ TEST 1 PASSED: Correctly identified Real Breakout with 70-80% conviction!\n");
  }

  // ─── TEST CASE 2: FALSE BULLISH BREAKOUT TRAP (เบรกหลอกขาขึ้น / Bull Trap) ───
  console.log("--- TEST 2: False Bullish Breakout Trap (ภาพที่ 01, 02, 04, 05) ---");
  // ราคาแทงทะลุ 2650 ไปแตะ 2662 แต่โดนเทขายรุนแรง ปิดที่ 2648 (หลุดกลับเข้ากรอบ) + Volume แห้ง 900
  const trapCandle: Candle = {
    time: Math.floor(Date.now() / 1000) - 300,
    open: 2646.0,
    high: 2662.0, // ทะลุไปสูงมาก
    low: 2644.0,
    close: 2648.0, // ปิดหลุดกลับมาต่ำกว่า 2650 (ไส้ยาว 77.7%!)
    volume: 900, // Volume ต่ำกว่าเฉลี่ยมาก (0.45x)
  };

  const result2 = checkBreakoutConfirmation(
    2648.0,
    resistance,
    trapCandle,
    "1h",
    Date.now(),
    "BUY",
    {
      candles: dummyCandles,
      volumeSMA: 2000,
      currentATR: 8.0,
      htfTrend: "BEARISH",
      newsSafe: true,
    }
  );

  console.log(`Type: ${result2.breakoutType}`);
  console.log(`Score: ${result2.checklistScore}/7`);
  console.log(`Volume Ratio: ${result2.volumeRatio}x`);
  console.log(`Opposite Wick Ratio: ${((result2.oppositeWickRatio ?? 0) * 100).toFixed(1)}%`);
  console.log(`Win Probability: ${result2.winProbability}%`);
  console.log(`Recommendation: ${result2.recommendation}`);

  if (result2.breakoutType !== "FALSE_BREAKOUT_TRAP" || (result2.winProbability ?? 0) > 30) {
    console.error("❌ TEST 2 FAILED: Expected FALSE_BREAKOUT_TRAP with Win Probability <= 30%");
    passedAll = false;
  } else {
    console.log("✅ TEST 2 PASSED: Correctly identified False Breakout Trap and activated Guard!\n");
  }

  // ─── TEST CASE 3: VALID BEARISH BREAKDOWN (เบรกจริงขาลง) ───
  console.log("--- TEST 3: Valid Bearish Breakdown (Support Breakdown) ---");
  const support = 2600.0;
  const validSellCandle: Candle = {
    time: Math.floor(Date.now() / 1000) - 300,
    open: 2606.0,
    high: 2607.0,
    low: 2588.0,
    close: 2590.0, // ปิดหลุด 2600 ลงมาลึก เต็มแท่งแดง
    volume: 3800, // Volume 1.9x
  };

  const sellDummyCandles: Candle[] = [
    { time: 1000, open: 2610, high: 2615, low: 2600.5, close: 2608, volume: 1800 },
    { time: 2000, open: 2608, high: 2612, low: 2599.5, close: 2604, volume: 2000 },
    { time: 3000, open: 2604, high: 2600.2, low: 2595.0, close: 2596, volume: 3100 },
    validSellCandle,
  ];

  const result3 = checkBreakoutConfirmation(
    2589.0,
    support,
    validSellCandle,
    "1h",
    Date.now(),
    "SELL",
    {
      candles: sellDummyCandles,
      volumeSMA: 2000,
      currentATR: 8.0,
      htfTrend: "BEARISH",
      newsSafe: true,
    }
  );

  console.log(`Type: ${result3.breakoutType}`);
  console.log(`Score: ${result3.checklistScore}/7`);
  console.log(`Volume Ratio: ${result3.volumeRatio}x`);
  console.log(`Win Probability: ${result3.winProbability}%`);

  if (result3.breakoutType !== "VALID_BREAKOUT" || (result3.winProbability ?? 0) < 70) {
    console.error("❌ TEST 3 FAILED: Expected VALID_BREAKOUT on SELL side");
    passedAll = false;
  } else {
    console.log("✅ TEST 3 PASSED: SELL side Support Breakdown verified!\n");
  }

  // ─── TEST CASE 4: FALSE BEARISH BREAKDOWN TRAP (Bear Trap) ───
  console.log("--- TEST 4: Bear Trap (Spike down, closed inside) ---");
  const bearTrapCandle: Candle = {
    time: Math.floor(Date.now() / 1000) - 300,
    open: 2602.0,
    high: 2605.0,
    low: 2588.0, // ทะลุแนวรับ 2600 ลงไป
    close: 2603.0, // แต่ปิดกลับเข้ามาเหนือแนวรับ ไส้ล่างยาว 88%
    volume: 1200, // Volume ต่ำ
  };

  const result4 = checkBreakoutConfirmation(
    2603.0,
    support,
    bearTrapCandle,
    "1h",
    Date.now(),
    "SELL",
    {
      candles: sellDummyCandles,
      volumeSMA: 2000,
      currentATR: 8.0,
      htfTrend: "BULLISH",
      newsSafe: true,
    }
  );

  console.log(`Type: ${result4.breakoutType}`);
  console.log(`Opposite Wick Ratio: ${((result4.oppositeWickRatio ?? 0) * 100).toFixed(1)}%`);
  console.log(`Win Probability: ${result4.winProbability}%`);

  if (result4.breakoutType !== "FALSE_BREAKOUT_TRAP") {
    console.error("❌ TEST 4 FAILED: Expected FALSE_BREAKOUT_TRAP on Bear Trap");
    passedAll = false;
  } else {
    console.log("✅ TEST 4 PASSED: Bear Trap correctly detected!\n");
  }

  if (passedAll) {
    console.log("🎉 ALL 4 TESTS PASSED! 8-IMAGE BREAKOUT & FALSE BREAKOUT ENGINE VERIFIED 100%!");
  } else {
    process.exit(1);
  }
}

runTests();
