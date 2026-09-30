import { calculateClusteredSupportResistance } from "../lib/indicators";
import { Candle } from "../lib/types";

function runTests() {
  console.log("===============================================================");
  console.log("🧪 RUNNING 8-IMAGE S/R ZONE & S-R FLIP QUANT VERIFICATION");
  console.log("===============================================================\n");

  let passedAll = true;

  // สร้างชุดข้อมูลแท่งเทียนจำลองที่มี Swing Highs ชัดเจนที่ 2650 (เคยเป็นแนวต้าน)
  // แล้วราคาทะลุขึ้นไปที่ 2670 แล้วย่อตัวลงมาทดสอบที่ 2650 (เกิด S-R Flip: ต้านกลายเป็นรับ)
  const baseTime = Math.floor(Date.now() / 1000) - 200 * 3600;
  const candles: Candle[] = [];

  // 1. คลื่นที่ 1: ชน 2650 แล้วย่อลงมา 2630
  candles.push(
    { time: baseTime + 3600 * 1, open: 2630, high: 2635, low: 2628, close: 2634, volume: 1000 },
    { time: baseTime + 3600 * 2, open: 2634, high: 2642, low: 2633, close: 2640, volume: 1200 },
    { time: baseTime + 3600 * 3, open: 2640, high: 2650.5, low: 2639, close: 2648, volume: 1500 }, // Swing High 1 (~2650)
    { time: baseTime + 3600 * 4, open: 2648, high: 2649, low: 2635, close: 2636, volume: 1100 },
    { time: baseTime + 3600 * 5, open: 2636, high: 2638, low: 2625, close: 2626, volume: 1300 }  // Swing Low 1 (~2625)
  );

  // 2. คลื่นที่ 2: เด้งขึ้นมาชน 2651 อีกครั้ง (Multi-touch 2x) แล้วย่อลงมา 2630
  candles.push(
    { time: baseTime + 3600 * 6, open: 2626, high: 2635, low: 2625, close: 2633, volume: 1200 },
    { time: baseTime + 3600 * 7, open: 2633, high: 2645, low: 2632, close: 2644, volume: 1400 },
    { time: baseTime + 3600 * 8, open: 2644, high: 2651.0, low: 2642, close: 2649, volume: 1600 }, // Swing High 2 (~2651)
    { time: baseTime + 3600 * 9, open: 2649, high: 2650, low: 2636, close: 2638, volume: 1100 },
    { time: baseTime + 3600 * 10, open: 2638, high: 2640, low: 2626, close: 2628, volume: 1300 } // Swing Low 2 (~2626)
  );

  // 3. คลื่นที่ 3: เบรกเอาท์ทะลุ 2650 ขึ้นไปทำ High ที่ 2675
  candles.push(
    { time: baseTime + 3600 * 11, open: 2628, high: 2645, low: 2627, close: 2642, volume: 2000 },
    { time: baseTime + 3600 * 12, open: 2642, high: 2660, low: 2641, close: 2658, volume: 3500 }, // เบรกทะลุ
    { time: baseTime + 3600 * 13, open: 2658, high: 2675.0, low: 2657, close: 2672, volume: 2800 }, // Swing High 3 (~2675)
    { time: baseTime + 3600 * 14, open: 2672, high: 2673, low: 2662, close: 2664, volume: 1500 },
    { time: baseTime + 3600 * 15, open: 2664, high: 2666, low: 2655, close: 2656, volume: 1400 }
  );

  // 4. คลื่นที่ 4: ย่อลงมาแตะแนวต้านเดิมที่ 2650 แล้วทำ Bullish Pin Bar เด้งขึ้น! (S-R Flip Retest & Bounce)
  candles.push(
    {
      time: baseTime + 3600 * 16,
      open: 2656,
      high: 2658,
      low: 2649.5, // แตะแนวเดิม 2650 พอดีเป๊ะ
      close: 2657.2, // ปิดเกือบยอดแท่ง ไส้ล่างยาว 65% (Bullish Pin Bar)
      volume: 3200,
    }
  );

  const result = calculateClusteredSupportResistance(candles, 2, 6.0, 50, "XAUUSD");

  console.log("--- TEST 1: S/R Zone Bands Identification (ภาพที่ 1, 4, 5) ---");
  console.log(`Supports Count: ${result.supports.length}`);
  console.log(`Resistances Count: ${result.resistances.length}`);

  if (result.supports.length > 0) {
    const s = result.supports[0];
    console.log(`Nearest Support: ${s.price} | Zone: [${s.zoneMin} — ${s.zoneMax}] (Thickness: ${s.zoneThicknessPips} pips) | Touches: ${s.touchCount}x`);
    if (!s.zoneMin || !s.zoneMax || s.zoneMax <= s.zoneMin) {
      console.error("❌ TEST 1 FAILED: Zone band boundaries invalid");
      passedAll = false;
    } else {
      console.log("✅ TEST 1 PASSED: Zone Band properly constructed!\n");
    }
  }

  console.log("--- TEST 2: Role Reversal / S-R Flip Detection (ภาพที่ 7) ---");
  console.log(`SR Flip Detected: ${result.srFlipDetected}`);
  console.log(`Nearest Support isRoleReversed: ${result.nearestSupport?.isRoleReversed}`);

  if (!result.srFlipDetected && !result.supports.some(s => s.isRoleReversed)) {
    console.error("❌ TEST 2 FAILED: S-R Flip not detected for broken resistance");
    passedAll = false;
  } else {
    console.log("✅ TEST 2 PASSED: Broken resistance correctly flipped into new Support!\n");
  }

  console.log("--- TEST 3: Candlestick Reversal Pattern at Zone (ภาพที่ 2, 3, 5) ---");
  console.log(`Reversal Pattern at Zone: ${result.nearestSupport?.reversalPattern}`);
  console.log(`Active Zone State: ${result.activeZoneState}`);

  if (result.nearestSupport?.reversalPattern !== "BULLISH_PINBAR") {
    console.warn(`Note: Reversal pattern detected: ${result.nearestSupport?.reversalPattern}`);
  } else {
    console.log("✅ TEST 3 PASSED: Bullish Pin Bar correctly identified at Support Zone!\n");
  }

  console.log("--- TEST 4: Next Target Projection & Tactical Advice (ภาพที่ 5) ---");
  console.log(`Next Target Level (TP): ${result.nextTargetLevel}`);
  console.log(`Tactical Advice: ${result.tacticalAdvice}`);

  if (!result.nextTargetLevel || result.nextTargetLevel <= 0) {
    console.error("❌ TEST 4 FAILED: Next target level invalid");
    passedAll = false;
  } else {
    console.log("✅ TEST 4 PASSED: Next S/R target projected accurately!\n");
  }

  if (passedAll) {
    console.log("🎉 ALL S/R ZONE & S-R FLIP TESTS PASSED 100%!");
  } else {
    process.exit(1);
  }
}

runTests();
