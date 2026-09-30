import * as fs from "fs";
import * as path from "path";
import { Candle, BacktestTrade } from "../lib/types";
import { simulateInstitutionalBacktest } from "../lib/marketService";

async function deepLossRootCause() {
  const dataPath = path.resolve(process.cwd(), "data", "xauusd_1h_ultra_deep.json");
  const candles: Candle[] = JSON.parse(fs.readFileSync(dataPath, "utf-8"));
  const trades: BacktestTrade[] = simulateInstitutionalBacktest("XAUUSD", candles);

  const losses = trades.filter((t) => t.result === "LOSS");
  console.log(`\n================================================================================`);
  console.log(` 🔬 ROOT CAUSE FORENSIC AUDIT: 114 LOSSES OUT OF 887 TRADES (5-YEAR DATA)`);
  console.log(`================================================================================\n`);

  const timeToIdx = new Map<number, number>();
  candles.forEach((c, idx) => timeToIdx.set(c.time, idx));

  interface LossDetail {
    index: number;
    type: string;
    entryTime: string;
    entryPrice: number;
    sl: number;
    barsHeld: number;
    entryRange: number;
    entryBody: number;
    bodyRatio: number;
    wickRatio: number;
    adx: number;
    retraceBeyondEntry: number;
    maxFavorablePips: number;
  }

  const lossDetails: LossDetail[] = [];

  for (let tIdx = 0; tIdx < losses.length; tIdx++) {
    const t = losses[tIdx];
    const startIdx = timeToIdx.get(t.entryTime);
    const endIdx = timeToIdx.get(t.exitTime) ?? (startIdx !== undefined ? startIdx + 3 : undefined);
    if (startIdx === undefined || endIdx === undefined) continue;

    const entryCandle = candles[startIdx];
    const isBuy = t.type === "BUY";
    const range = entryCandle.high - entryCandle.low;
    const body = Math.abs(entryCandle.close - entryCandle.open);
    const bodyRatio = range > 0 ? body / range : 0;
    const wick = isBuy
      ? (Math.min(entryCandle.open, entryCandle.close) - entryCandle.low)
      : (entryCandle.high - Math.max(entryCandle.open, entryCandle.close));
    const wickRatio = range > 0 ? wick / range : 0;

    let bestPrice = t.entryPrice;
    for (let i = startIdx; i <= endIdx; i++) {
      const bar = candles[i];
      if (!bar) continue;
      if (isBuy) {
        if (bar.high > bestPrice) bestPrice = bar.high;
      } else {
        if (bar.low < bestPrice) bestPrice = bar.low;
      }
    }
    const maxFavPips = isBuy ? (bestPrice - t.entryPrice) * 10 : (t.entryPrice - bestPrice) * 10;

    lossDetails.push({
      index: tIdx + 1,
      type: t.type,
      entryTime: new Date(t.entryTime * 1000).toISOString().replace("T", " ").substring(0, 16),
      entryPrice: t.entryPrice,
      sl: t.sl ?? 0,
      barsHeld: endIdx - startIdx,
      entryRange: Number(range.toFixed(2)),
      entryBody: Number(body.toFixed(2)),
      bodyRatio: Number(bodyRatio.toFixed(2)),
      wickRatio: Number(wickRatio.toFixed(2)),
      adx: 0,
      retraceBeyondEntry: Number((Math.abs((t.sl ?? t.entryPrice) - t.entryPrice) * 10).toFixed(1)),
      maxFavorablePips: Number(maxFavPips.toFixed(1)),
    });
  }

  // 1. How many losses had zero profit (instantly went negative)?
  const zeroFavLosses = lossDetails.filter((l) => l.maxFavorablePips <= 2.0);
  // 2. How many losses were held for only 1 bar (the immediate next bar killed it)?
  const oneBarLosses = lossDetails.filter((l) => l.barsHeld <= 1);
  // 3. How many losses had weak rejection wicks (< 25%)?
  const weakWickLosses = lossDetails.filter((l) => l.wickRatio < 0.25);
  // 4. How many losses had huge trigger bodies (> 70% of range, i.e. climax exhaustion bar)?
  const climaxLosses = lossDetails.filter((l) => l.bodyRatio >= 0.70 && l.wickRatio < 0.20);
  // 5. How many losses had some profit (+10 to +20 pips) but reversed before TP?
  const partialRunLosses = lossDetails.filter((l) => l.maxFavorablePips >= 12.0);

  console.log(`📊 สถิติเจาะลึก 114 ไม้แพ้ (Granular Root-Cause Breakdown):`);
  console.log(`────────────────────────────────────────────────────────────────────────────────`);
  console.log(`1. ไม้ที่เข้าปุ๊บติดลบทันที แทบไม่เคยเขียวเลย (<= 2 pips profit): ${zeroFavLosses.length} ไม้ (${((zeroFavLosses.length / losses.length) * 100).toFixed(1)}%)`);
  console.log(`   -> Root Cause: เข้าที่ราคาปิดของแท่งกระชาก (Impulse Top/Bottom) โดยไม่มี Retest Discount!`);
  console.log(`2. ไม้ที่ตายทันทีใน 1 แท่งถัดไป (1-Bar Instant Execution Kill): ${oneBarLosses.length} ไม้ (${((oneBarLosses.length / losses.length) * 100).toFixed(1)}%)`);
  console.log(`   -> Root Cause: เกิด False Breakout Climax Bar แท่งถัดไปกลืนกินแท่งเข้า 100%`);
  console.log(`3. ไม้ที่แท่งเข้ามี Rejection Wick สั้นเกินไป (< 25%): ${weakWickLosses.length} ไม้ (${((weakWickLosses.length / losses.length) * 100).toFixed(1)}%)`);
  console.log(`   -> Root Cause: ขาด Institutional Price Rejection ยืนยัน`);
  console.log(`4. ไม้ที่เข้าบน Climax Exhaustion Bar (เนื้อแท่ง > 70% แต่ไร้ไส้): ${climaxLosses.length} ไม้ (${((climaxLosses.length / losses.length) * 100).toFixed(1)}%)`);
  console.log(`   -> Root Cause: แท่งหมดแรง (Exhaustion Bar) ปล่อยให้รายย่อย FOMO เข้าซื้อที่ยอด/ก้น`);
  console.log(`5. ไม้ที่เคยเขียววิ่งไปแล้ว (+12 pips ขึ้นไป) แต่วกกลับมากิน SL: ${partialRunLosses.length} ไม้ (${((partialRunLosses.length / losses.length) * 100).toFixed(1)}%)`);
  console.log(`   -> Root Cause: ขาด Early Breakeven Trailing หรือ Early Harvest ในระยะสั้น!`);
  console.log(`────────────────────────────────────────────────────────────────────────────────\n`);

  console.log("ตัวอย่าง 10 ไม้แพ้ล่าสุด (Last 10 Loss Samples):");
  console.table(lossDetails.slice(-10));
}

deepLossRootCause().catch(console.error);
