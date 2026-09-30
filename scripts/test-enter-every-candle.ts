import * as fs from "fs";
import * as path from "path";
import { Candle } from "../lib/types";
import { calculateATR, calculateEMA } from "../lib/indicators";

async function testEnterEveryCandle() {
  const dataPath = path.resolve(process.cwd(), "data", "xauusd_1h_deep.json");
  const candles: Candle[] = JSON.parse(fs.readFileSync(dataPath, "utf-8"));
  const atrs = calculateATR(candles, 14);
  const ema200 = calculateEMA(candles, 200);

  console.log(`Analyzing ${candles.length.toLocaleString()} 1-Hour candles for Gold (XAUUSD)\n`);

  // 1. Raw Candle Distribution
  let greenCandles = 0;
  let redCandles = 0;
  let dojiCandles = 0;

  let greenAfterGreen = 0;
  let redAfterGreen = 0;
  let greenAfterRed = 0;
  let redAfterRed = 0;

  for (let i = 1; i < candles.length; i++) {
    const c = candles[i];
    const prevC = candles[i - 1];

    if (c.close > c.open) greenCandles++;
    else if (c.close < c.open) redCandles++;
    else dojiCandles++;

    if (prevC.close > prevC.open) {
      if (c.close > c.open) greenAfterGreen++;
      else if (c.close < c.open) redAfterGreen++;
    } else if (prevC.close < prevC.open) {
      if (c.close > c.open) greenAfterRed++;
      else if (c.close < c.open) redAfterRed++;
    }
  }

  console.log("=== 1. RAW CANDLESTICK COLOR STATISTICS (17,520 แท่ง) ===");
  console.log(`- แท่งเขียว (Bullish Bars): ${greenCandles} (${((greenCandles / (candles.length - 1)) * 100).toFixed(2)}%)`);
  console.log(`- แท่งแดง (Bearish Bars):  ${redCandles} (${((redCandles / (candles.length - 1)) * 100).toFixed(2)}%)`);
  console.log(`- แท่ง Doji (เสมอ):         ${dojiCandles} (${((dojiCandles / (candles.length - 1)) * 100).toFixed(2)}%)`);
  console.log(`- ความน่าจะเป็นที่เขียวแล้วเขียวต่อ (Green Follow-through): ${((greenAfterGreen / (greenAfterGreen + redAfterGreen)) * 100).toFixed(2)}%`);
  console.log(`- ความน่าจะเป็นที่แดงแล้วแดงต่อ (Red Follow-through):     ${((redAfterRed / (greenAfterRed + redAfterRed)) * 100).toFixed(2)}%\n`);

  // 2. Simulation: Enter BUY every candle if previous was green, SELL if red (Next Bar Close Exit - 1 Bar Horizon)
  let win1Bar = 0;
  let loss1Bar = 0;
  let pips1Bar = 0;
  for (let i = 1; i < candles.length - 1; i++) {
    const c = candles[i];
    const nextC = candles[i + 1];
    if (c.close > c.open) {
      // BUY at next open, exit next close
      const diff = nextC.close - nextC.open;
      pips1Bar += diff * 10;
      if (diff > 0) win1Bar++;
      else if (diff < 0) loss1Bar++;
    } else if (c.close < c.open) {
      // SELL at next open, exit next close
      const diff = nextC.open - nextC.close;
      pips1Bar += diff * 10;
      if (diff > 0) win1Bar++;
      else if (diff < 0) loss1Bar++;
    }
  }

  console.log("=== 2. SIMULATION: เข้าตามสีแท่งเทียนทุกแท่ง ถือ 1 แท่งแล้วปิด (1-Bar Holding) ===");
  console.log(`- วินเรท (Win Rate): ${((win1Bar / (win1Bar + loss1Bar)) * 100).toFixed(2)}%`);
  console.log(`- จำนวนไม้: ${win1Bar + loss1Bar} ไม้ (ชนะ ${win1Bar} | แพ้ ${loss1Bar})`);
  console.log(`- กำไร/ขาดทุนสุทธิ (ยังไม่หักสเปรด): ${pips1Bar.toFixed(1)} pips\n`);

  // 3. Simulation: เข้าทุกแท่งแบบมี TP/SL สถาบัน (Fixed 1.5R TP / 1.0R SL based on 1x ATR)
  // Scenario 3A: เข้าตามสีแท่ง (เขียว=BUY, แดง=SELL) รอชน TP 1.5 ATR หรือ SL 1.0 ATR
  let tpWins3A = 0;
  let slLosses3A = 0;
  let totalTrades3A = 0;

  for (let i = 20; i < candles.length - 50; i += 2) { // sample every 2 bars to allow independent trade resolution
    const c = candles[i];
    const atr = atrs[i] || 10;
    const isBuy = c.close >= c.open;
    const entry = c.close;
    const sl = isBuy ? entry - atr * 1.0 : entry + atr * 1.0;
    const tp = isBuy ? entry + atr * 1.5 : entry - atr * 1.5;

    for (let j = i + 1; j < Math.min(i + 40, candles.length); j++) {
      const fut = candles[j];
      if (isBuy) {
        if (fut.high >= tp) { tpWins3A++; totalTrades3A++; break; }
        if (fut.low <= sl) { slLosses3A++; totalTrades3A++; break; }
      } else {
        if (fut.low <= tp) { tpWins3A++; totalTrades3A++; break; }
        if (fut.high >= sl) { slLosses3A++; totalTrades3A++; break; }
      }
    }
  }

  console.log("=== 3. SIMULATION: เข้าทุกแท่งแบบตั้ง TP 1.5x ATR / SL 1.0x ATR (ตามสีแท่ง) ===");
  console.log(`- วินเรท (Win Rate): ${((tpWins3A / (tpWins3A + slLosses3A)) * 100).toFixed(2)}%`);
  console.log(`- จำนวนไม้: ${totalTrades3A} ไม้ (ชน TP: ${tpWins3A} | ชน SL: ${slLosses3A})`);
  const pf3A = ((tpWins3A * 1.5) / (slLosses3A * 1.0)).toFixed(2);
  console.log(`- Profit Factor: ${pf3A}\n`);

  // 4. Scenario 4: เข้า BUY ทุกแท่ง (Always Long เพราะทองเป็นขาขึ้น 2 ปี) TP 1.5 ATR / SL 1.0 ATR
  let tpWinsBuyOnly = 0;
  let slLossesBuyOnly = 0;
  for (let i = 20; i < candles.length - 50; i += 2) {
    const c = candles[i];
    const atr = atrs[i] || 10;
    const entry = c.close;
    const sl = entry - atr * 1.0;
    const tp = entry + atr * 1.5;

    for (let j = i + 1; j < Math.min(i + 40, candles.length); j++) {
      const fut = candles[j];
      if (fut.high >= tp) { tpWinsBuyOnly++; break; }
      if (fut.low <= sl) { slLossesBuyOnly++; break; }
    }
  }

  console.log("=== 4. SIMULATION: เข้า BUY ตะบี้ตะบันทุกแท่ง (Always BUY - Bull Market Bias) ===");
  console.log(`- วินเรท (Win Rate): ${((tpWinsBuyOnly / (tpWinsBuyOnly + slLossesBuyOnly)) * 100).toFixed(2)}%`);
  console.log(`- ชน TP: ${tpWinsBuyOnly} | ชน SL: ${slLossesBuyOnly}`);
  const pfBuyOnly = ((tpWinsBuyOnly * 1.5) / (slLossesBuyOnly * 1.0)).toFixed(2);
  console.log(`- Profit Factor: ${pfBuyOnly}\n`);

  // 5. Scenario 5: เข้าตามเทรนด์ 200 EMA ดิบๆ ทุกแท่ง (ถ้า Close > EMA200 เข้า BUY, ถ้า < เข้า SELL)
  let tpWinsTrend = 0;
  let slLossesTrend = 0;
  for (let i = 200; i < candles.length - 50; i += 2) {
    const c = candles[i];
    const e200 = ema200[i] || c.close;
    const isBull = c.close > e200;
    const atr = atrs[i] || 10;
    const entry = c.close;
    const sl = isBull ? entry - atr * 1.0 : entry + atr * 1.0;
    const tp = isBull ? entry + atr * 1.5 : entry - atr * 1.5;

    for (let j = i + 1; j < Math.min(i + 40, candles.length); j++) {
      const fut = candles[j];
      if (isBull) {
        if (fut.high >= tp) { tpWinsTrend++; break; }
        if (fut.low <= sl) { slLossesTrend++; break; }
      } else {
        if (fut.low <= tp) { tpWinsTrend++; break; }
        if (fut.high >= sl) { slLossesTrend++; break; }
      }
    }
  }

  console.log("=== 5. SIMULATION: เข้าตามแนวโน้ม EMA 200 ดิบๆ ทุกแท่ง (Unfiltered Trend Following) ===");
  console.log(`- วินเรท (Win Rate): ${((tpWinsTrend / (tpWinsTrend + slLossesTrend)) * 100).toFixed(2)}%`);
  console.log(`- ชน TP: ${tpWinsTrend} | ชน SL: ${slLossesTrend}`);
  const pfTrend = ((tpWinsTrend * 1.5) / (slLossesTrend * 1.0)).toFixed(2);
  console.log(`- Profit Factor: ${pfTrend}\n`);
}

testEnterEveryCandle().catch(console.error);
