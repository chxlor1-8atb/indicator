import * as fs from "fs";
import * as path from "path";
import { Candle, BacktestTrade } from "../lib/types";
import { simulateInstitutionalBacktest } from "../lib/marketService";

async function analyzeEntryQuality() {
  const dataPath = path.resolve(process.cwd(), "data", "xauusd_1h_ultra_deep.json");
  const candles: Candle[] = JSON.parse(fs.readFileSync(dataPath, "utf-8"));
  const trades: BacktestTrade[] = simulateInstitutionalBacktest("XAUUSD", candles);

  console.log(`\n================================================================================`);
  console.log(` 🔬 FORENSIC ENTRY QUALITY & ADVERSE EXCURSION (MAE) AUDIT`);
  console.log(`    Total Trades: ${trades.length} | Wins: ${trades.filter(t=>t.result==='WIN').length} | Losses: ${trades.filter(t=>t.result==='LOSS').length}`);
  console.log(`================================================================================\n`);

  // Map candle index by timestamp
  const timeToIdx = new Map<number, number>();
  candles.forEach((c, idx) => timeToIdx.set(c.time, idx));

  interface TradeExcursion {
    trade: BacktestTrade;
    maxAdverseExcursionPips: number; // Maximum floating drawdown during trade life
    maxAdverseExcursionR: number;
    barsHeld: number;
    entryBarRange: number;
    entryWickRatio: number;
  }

  const excursions: TradeExcursion[] = [];

  for (const t of trades) {
    const startIdx = timeToIdx.get(t.entryTime);
    const endIdx = timeToIdx.get(t.exitTime) ?? (startIdx !== undefined ? startIdx + 5 : undefined);

    if (startIdx === undefined || endIdx === undefined) continue;

    const entryCandle = candles[startIdx];
    const isBuy = t.type === "BUY";
    let worstPrice = t.entryPrice;

    for (let i = startIdx; i <= endIdx; i++) {
      const bar = candles[i];
      if (!bar) continue;
      if (isBuy) {
        if (bar.low < worstPrice) worstPrice = bar.low;
      } else {
        if (bar.high > worstPrice) worstPrice = bar.high;
      }
    }

    const pipMult = 10; // Gold 1 point = 10 pips
    const maePips = Math.abs(worstPrice - t.entryPrice) * pipMult;
    const origRiskPips = Math.abs((t.sl ?? t.entryPrice) - t.entryPrice) * pipMult;
    const maeR = origRiskPips > 0 ? maePips / origRiskPips : 0;

    const range = entryCandle.high - entryCandle.low;
    const wick = isBuy ? (Math.min(entryCandle.open, entryCandle.close) - entryCandle.low) : (entryCandle.high - Math.max(entryCandle.open, entryCandle.close));
    const wickRatio = range > 0 ? wick / range : 0;

    excursions.push({
      trade: t,
      maxAdverseExcursionPips: Number(maePips.toFixed(1)),
      maxAdverseExcursionR: Number(maeR.toFixed(2)),
      barsHeld: endIdx - startIdx,
      entryBarRange: Number(range.toFixed(2)),
      entryWickRatio: Number(wickRatio.toFixed(2)),
    });
  }

  const winExcursions = excursions.filter((e) => e.trade.result === "WIN");
  const lossExcursions = excursions.filter((e) => e.trade.result === "LOSS");

  const avgWinMaePips = winExcursions.reduce((acc, e) => acc + e.maxAdverseExcursionPips, 0) / winExcursions.length;
  const avgWinMaeR = winExcursions.reduce((acc, e) => acc + e.maxAdverseExcursionR, 0) / winExcursions.length;
  const zeroDrawdownWins = winExcursions.filter((e) => e.maxAdverseExcursionR <= 0.15).length;

  console.log(`┌──────────────────────────────────────────────────────────────────────────────┐`);
  console.log(`│ 🎯 คุณภาพจุดเข้าออเดอร์ของไม้ชนะ (Winning Trades Entry Precision)            │`);
  console.log(`├──────────────────────────────────────────────────────────────────────────────┤`);
  console.log(`│ • ค่าเฉลี่ยการย่อตัวติดลบก่อนไปชน TP (Average Drawdown) : ${avgWinMaePips.toFixed(1)} pips (${(avgWinMaeR * 100).toFixed(1)}% ของระยะ SL)`);
  console.log(`│ • ไม้เข้าคมกริบแบบแทบไม่ติดลบ (Sniper Entries <= 0.15R) : ${zeroDrawdownWins} ไม้ (${((zeroDrawdownWins / winExcursions.length) * 100).toFixed(1)}% ของไม้ชนะ)`);
  console.log(`│ • ระยะเวลาเฉลี่ยในการถือครองออเดอร์ (Average Bars Held) : ${(winExcursions.reduce((acc, e) => acc + e.barsHeld, 0) / winExcursions.length).toFixed(1)} ชั่วโมง`);
  console.log(`└──────────────────────────────────────────────────────────────────────────────┘\n`);

  console.log(`┌──────────────────────────────────────────────────────────────────────────────┐`);
  console.log(`│ 🔍 การวินิจฉัยจุดบกพร่องของไม้แพ้ ${lossExcursions.length} ไม้ (Losing Trades Diagnosis)          │`);
  console.log(`├──────────────────────────────────────────────────────────────────────────────┤`);

  // Classify loss patterns
  let instantSLArmor = 0; // Stopped out within 1-2 bars
  let prolongedStall = 0; // Stalled for > 5 bars before hitting SL
  let wickViolation = 0;  // Entered on a bar with opposing wick > 30%

  for (const l of lossExcursions) {
    if (l.barsHeld <= 2) instantSLArmor++;
    else if (l.barsHeld >= 5) prolongedStall++;
    if (l.entryWickRatio < 0.20) wickViolation++;
  }

  console.log(`│ 1. โดน Stop Loss รวดเร็วใน 1-2 แท่ง (Momentum Shockwave) : ${instantSLArmor} ไม้ (${((instantSLArmor / lossExcursions.length) * 100).toFixed(1)}%)`);
  console.log(`│    -> เกิดจากการเข้าตามน้ำที่ปลายแท่ง (Impulse Bar Close) แล้วเจอแท่งสวนทันที`);
  console.log(`│ 2. ไซด์เวย์ยืดเยื้อนานเกิน 5 ชม. ก่อนหลุด SL (Slow Drain)  : ${prolongedStall} ไม้ (${((prolongedStall / lossExcursions.length) * 100).toFixed(1)}%)`);
  console.log(`│    -> เกิดจากการเข้ากลางกรอบที่ไม่มี Liquidity สถาบันรองรับ`);
  console.log(`│ 3. ไส้เทียนฝั่งเข้าสั้นเกินไป (< 20% Rejection Wick)     : ${wickViolation} ไม้ (${((wickViolation / lossExcursions.length) * 100).toFixed(1)}%)`);
  console.log(`│    -> เกิดจากการไม่มี Rejection Wick ยืนยันการปฏิเสธราคา`);
  console.log(`└──────────────────────────────────────────────────────────────────────────────┘\n`);
}

analyzeEntryQuality().catch(console.error);
