import * as fs from "fs";
import * as path from "path";
import { Candle, BacktestTrade } from "../lib/types";
import { simulateInstitutionalBacktest } from "../lib/marketService";

async function auditLosses() {
  const dataPath = path.resolve(process.cwd(), "data", "xauusd_1h_ultra_deep.json");
  const candles: Candle[] = JSON.parse(fs.readFileSync(dataPath, "utf-8"));

  console.log("================================================================");
  console.log("🔬 FORENSIC LOSS AUDIT: WHY IS WIN RATE 85-89% INSTEAD OF 90%+ ?");
  console.log(`Analyzing ${candles.length.toLocaleString()} Gold Candles (2021 - 2026)...`);
  console.log("================================================================\n");

  const trades = simulateInstitutionalBacktest("XAUUSD", candles);
  const losses = trades.filter((t) => t.result === "LOSS");
  const wins = trades.filter((t) => t.result === "WIN");
  const bes = trades.filter((t) => t.result === "BE");

  const total = wins.length + losses.length;
  const currentWinRate = (wins.length / total) * 100;
  console.log(`Current Total: ${trades.length} | Wins: ${wins.length} | Losses: ${losses.length} | BE: ${bes.length}`);
  console.log(`Current Win Rate (Excl BE): ${currentWinRate.toFixed(2)}%\n`);

  // To reach 90.0% Win Rate:
  // (wins.length) / (wins.length + targetLosses) = 0.90
  // targetLosses = wins.length * (1 - 0.90) / 0.90
  const targetLossesFor90 = Math.floor(wins.length * 0.10 / 0.90);
  const lossesToEliminate = losses.length - targetLossesFor90;
  console.log(`🎯 TARGET FOR 90.0%+ WIN RATE:`);
  console.log(`   Must reduce losses from ${losses.length} down to <= ${targetLossesFor90} (Eliminate ${lossesToEliminate} bad losses)\n`);

  // Detailed Loss Patterns
  let mfeAbove10Pips = 0; // Trades that were in profit > 10 pips before dying
  let mfeAbove12Pips = 0;
  let counterHtfLosses = 0;
  let deadZoneLosses = 0;
  let lowAdxChopLosses = 0;
  let highOpposingWickLosses = 0;
  let quick1BarLosses = 0;

  for (const loss of losses) {
    const entryIdx = candles.findIndex((c) => c.time === loss.entryTime);
    if (entryIdx === -1) continue;

    const entryCandle = candles[entryIdx];
    const exitIdx = candles.findIndex((c) => c.time === loss.exitTime);
    const lifeBars = exitIdx - entryIdx;

    if (lifeBars <= 1) quick1BarLosses++;

    // Track MFE (Max Favorable Excursion)
    let maxProfitPips = 0;
    for (let k = entryIdx + 1; k <= exitIdx && k < candles.length; k++) {
      const c = candles[k];
      const pips = loss.type === "BUY"
        ? (c.high - loss.entryPrice) * 10
        : (loss.entryPrice - c.low) * 10;
      if (pips > maxProfitPips) maxProfitPips = pips;
    }

    if (maxProfitPips >= 10.0) mfeAbove10Pips++;
    if (maxProfitPips >= 12.0) mfeAbove12Pips++;

    // Check entry candle attributes
    const range = entryCandle.high - entryCandle.low;
    const oppWick = loss.type === "BUY"
      ? entryCandle.high - Math.max(entryCandle.open, entryCandle.close)
      : Math.min(entryCandle.open, entryCandle.close) - entryCandle.low;
    const oppWickPct = range > 0 ? (oppWick / range) * 100 : 0;
    if (oppWickPct >= 35) highOpposingWickLosses++;

    const dDate = new Date(loss.entryTime * 1000);
    const thaiHour = (dDate.getUTCHours() + 7) % 24;
    if (thaiHour >= 1 && thaiHour < 6) deadZoneLosses++;
  }

  console.log("📊 ROOT CAUSE BREAKDOWN OF ALL LOSSES:");
  console.log(`  1. Profit Reversal (เคยกำไร +10 pips ขึ้นไป แต่ไม่ยอมเก็บ/ไม่ล็อคทุน แล้วกลับมาโดน SL):`);
  console.log(`     -> ${mfeAbove10Pips} ไม้ (${((mfeAbove10Pips / losses.length) * 100).toFixed(1)}% ของการแพ้ทั้งหมด)`);
  console.log(`     -> ถ้าเคยกำไร +12 pips: ${mfeAbove12Pips} ไม้ (${((mfeAbove12Pips / losses.length) * 100).toFixed(1)}%)`);
  console.log(`  2. ไส้เทียนต้านตรงข้ามสูง (Opposing Wick >= 35% แสดงถึงมีแรงดักตบสวน):`);
  console.log(`     -> ${highOpposingWickLosses} ไม้ (${((highOpposingWickLosses / losses.length) * 100).toFixed(1)}%)`);
  console.log(`  3. 1-Bar Execution Kills (เข้าแล้วโดนสวนทันทีในแท่งเดียว):`);
  console.log(`     -> ${quick1BarLosses} ไม้ (${((quick1BarLosses / losses.length) * 100).toFixed(1)}%)`);
  console.log(`  4. Dead Zone / Thin Liquidity (ตี 1 - ตี 5 ไทย):`);
  console.log(`     -> ${deadZoneLosses} ไม้ (${((deadZoneLosses / losses.length) * 100).toFixed(1)}%)`);
}

auditLosses().catch(console.error);
