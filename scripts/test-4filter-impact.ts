/**
 * test-4filter-impact.ts
 * ทดสอบผลกระทบของ 4 Indicator Filters ใหม่ต่อ Win Rate และจำนวน Losses
 * Filter A: Candle Body Quality Guard
 * Filter B: Volume Delta Confirmation
 * Filter C: TD Sequential Exhaustion Guard
 * Filter D: BB Squeeze
 */
import * as fs from "fs";
import * as path from "path";
import { simulateInstitutionalBacktest } from "../lib/marketService";

const dataPath = path.resolve(process.cwd(), "data", "xauusd_1h_deep.json");
if (!fs.existsSync(dataPath)) {
  console.error("❌ ไม่พบไฟล์ data/xauusd_1h_deep.json");
  process.exit(1);
}

const candles = JSON.parse(fs.readFileSync(dataPath, "utf-8"));
console.log(`\n📊 โหลดแท่งเทียน: ${candles.length} แท่ง (Gold XAUUSD 1H 2 ปี)`);
console.log("═".repeat(65));

const trades = simulateInstitutionalBacktest("XAUUSD", candles);

const wins  = trades.filter(t => t.result === "WIN");
const losses = trades.filter(t => t.result === "LOSS");
const be     = trades.filter(t => t.result === "BE");

const totalDecisive = wins.length + losses.length;
const winRate = totalDecisive > 0 ? (wins.length / totalDecisive * 100) : 0;
const noLossRate = trades.length > 0 ? ((wins.length + be.length) / trades.length * 100) : 0;

const netPips = trades.reduce((s, t) => s + t.pnlPips, 0);
const netR    = trades.reduce((s, t) => s + t.pnlR, 0);
const grossWin  = trades.filter(t => t.pnlR > 0).reduce((s,t) => s + t.pnlR, 0);
const grossLoss = trades.filter(t => t.pnlR < 0).reduce((s,t) => s + Math.abs(t.pnlR), 0);
const pf = grossLoss > 0 ? (grossWin / grossLoss) : 999;

console.log(`\n🏆 ผลลัพธ์หลังเพิ่ม 4 Indicator Filters:`);
console.log(`   Total Trades : ${trades.length}`);
console.log(`   Wins         : ${wins.length}`);
console.log(`   Losses       : ${losses.length}  ← เป้าหมาย < 80`);
console.log(`   Breakeven    : ${be.length}`);
console.log(`   Win Rate     : ${winRate.toFixed(1)}%  ← เป้าหมาย > 70%`);
console.log(`   No-Loss Rate : ${noLossRate.toFixed(1)}%`);
console.log(`   Net Pips     : ${netPips > 0 ? "+" : ""}${netPips.toFixed(1)}`);
console.log(`   Net R        : ${netR > 0 ? "+" : ""}${netR.toFixed(1)}R`);
console.log(`   Profit Factor: ${pf.toFixed(2)}  ← เป้าหมาย > 2.2`);

// วิเคราะห์ช่วงเวลาที่ loss เหลืออยู่
console.log(`\n📅 Loss ที่เหลืออยู่แยกตามช่วงเวลา (Thai Time):`);
const lossHours = new Map<number, number>();
for (const l of losses) {
  const d = new Date(l.entryTime * 1000);
  const th = (d.getUTCHours() + 7) % 24;
  lossHours.set(th, (lossHours.get(th) ?? 0) + 1);
}
const sortedHours = Array.from(lossHours.entries()).sort((a, b) => b[1] - a[1]);
for (const [h, cnt] of sortedHours.slice(0, 8)) {
  const label = h < 10 ? `0${h}` : `${h}`;
  console.log(`   ${label}:00 น. → ${cnt} ไม้`);
}

// Quarter-by-quarter breakdown
console.log(`\n📈 ผลรายไตรมาส (Quarter Analysis):`);
interface QData { w: number; l: number; be: number; pips: number }
const quarters = new Map<string, QData>();
for (const t of trades) {
  const d = new Date(t.entryTime * 1000);
  const y = d.getUTCFullYear();
  const q = Math.floor(d.getUTCMonth() / 3) + 1;
  const key = `${y} Q${q}`;
  const s = quarters.get(key) ?? { w: 0, l: 0, be: 0, pips: 0 };
  if (t.result === "WIN") s.w++;
  else if (t.result === "LOSS") s.l++;
  else s.be++;
  s.pips += t.pnlPips;
  quarters.set(key, s);
}
const sortedQs = Array.from(quarters.entries()).sort();
let profitableQs = 0;
for (const [qName, s] of sortedQs) {
  const tot = s.w + s.l;
  const wr = tot > 0 ? (s.w / tot * 100).toFixed(1) : "N/A";
  const sign = s.pips >= 0 ? "✅" : "❌";
  if (s.pips >= 0) profitableQs++;
  console.log(`   ${sign} ${qName}: ${s.w}W/${s.l}L/${s.be}BE | WR ${wr}% | ${s.pips >= 0 ? "+" : ""}${s.pips.toFixed(0)} pips`);
}
console.log(`\n   Profitable Quarters: ${profitableQs}/${sortedQs.length}`);
console.log("═".repeat(65));
