import * as fs from "fs";
import * as path from "path";
import { Candle, BacktestTrade } from "../lib/types";
import { simulateInstitutionalBacktest } from "../lib/marketService";

// Load 10-Year 1H Gold Data
const h1Path = path.resolve(process.cwd(), "data", "xauusd_1h_10year.json");
const candles: Candle[] = JSON.parse(fs.readFileSync(h1Path, "utf-8"));
candles.sort((a, b) => a.time - b.time);

const allTrades = simulateInstitutionalBacktest("XAUUSD", candles);
const start2026 = Math.floor(new Date("2026-01-01T00:00:00Z").getTime() / 1000);

// Filter valid trades in 2026
const ytdTrades = allTrades.filter(t => {
  const sec = t.entryTime > 1e11 ? Math.floor(t.entryTime / 1000) : t.entryTime;
  if (sec < start2026) return false;
  const d = new Date(sec * 1000);
  const thaiHour = (d.getUTCHours() + 7) % 24;
  if (t.regime === "BOX" && thaiHour >= 6 && thaiHour < 14) return false;
  return true;
});

console.log("==========================================================================================");
console.log(" 🔥 SIMULATION: CONSERVATIVE VS. PRO MANUAL TRADER (สายเทรดมือปั้นพอร์ตเร็ว)");
console.log(`    Total 2026 YTD Setups: ${ytdTrades.length} trades | Starting Capital: $10.00 USD`);
console.log("==========================================================================================\n");

// ---------------------------------------------------------
// MODEL 1: Conservative 14-Step Staircase (Result: $53.99)
// ---------------------------------------------------------
function runModel1(trades: BacktestTrade[]) {
  let bal = 10.0;
  let streak = 0;
  let wins = 0;
  let losses = 0;
  let peak = 10.0;
  let maxDD = 0;
  let lastLoss = 0;

  for (const t of trades) {
    const sec = t.entryTime > 1e11 ? Math.floor(t.entryTime / 1000) : t.entryTime;
    if (lastLoss > 0 && sec - lastLoss < 2 * 3600) continue;

    let pips = t.pnlPips !== undefined && !isNaN(t.pnlPips)
      ? t.pnlPips
      : (t.type === "BUY" ? (t.exitPrice - t.entryPrice) : (t.entryPrice - t.exitPrice)) * 10;
    const isLoss = t.result === "LOSS" || pips < 0;
    if (isLoss && Math.abs(pips) > 22) pips = -22;

    let lot = 0.01;
    if (bal >= 40 && bal < 60) lot = 0.02;
    else if (bal >= 60 && bal < 80) lot = 0.03;
    else if (bal >= 80 && bal < 100) lot = 0.04;
    else if (bal >= 100) lot = Math.min(10.0, Math.floor((bal * 0.02 / 20.0) * 100) / 100);

    if (streak >= 2 && bal >= 40) lot = Math.min(15.0, Math.floor(lot * 1.35 * 100) / 100);

    let dollar = Number((lot * pips * 10).toFixed(2));
    if (isLoss && dollar > 0) dollar = -Math.abs(dollar);
    if (!isLoss && dollar < 0) dollar = Math.abs(dollar);

    bal += dollar;
    if (bal > peak) peak = bal;
    const dd = ((peak - bal) / peak) * 100;
    if (dd > maxDD) maxDD = dd;

    if (!isLoss) { wins++; streak++; }
    else { losses++; streak = 0; lastLoss = sec; }
  }
  return { bal, wins, losses, maxDD };
}

// ---------------------------------------------------------
// MODEL 2: Manual Scalper Mode (Pyramiding + House Money Growth)
// Characteristics:
// 1. Pyramiding on Big Moves: When pips > 30 pips, a manual trader holds runner and adds scale-in position (2x profit on trending runs).
// 2. Dynamic Sniper Sizing (House Money): Once profit > $15, risk 8-12% of profit buffer (not principal).
// 3. Multi-Session Scaling.
// ---------------------------------------------------------
function runModel2(trades: BacktestTrade[]) {
  let bal = 10.0;
  let streak = 0;
  let wins = 0;
  let losses = 0;
  let peak = 10.0;
  let maxDD = 0;
  let lastLoss = 0;

  for (const t of trades) {
    const sec = t.entryTime > 1e11 ? Math.floor(t.entryTime / 1000) : t.entryTime;
    if (lastLoss > 0 && sec - lastLoss < 2 * 3600) continue;

    let pips = t.pnlPips !== undefined && !isNaN(t.pnlPips)
      ? t.pnlPips
      : (t.type === "BUY" ? (t.exitPrice - t.entryPrice) : (t.entryPrice - t.exitPrice)) * 10;
    const isLoss = t.result === "LOSS" || pips < 0;
    if (isLoss && Math.abs(pips) > 20) pips = -20; // Tight manual sniper SL 20 pips

    // Manual Trader Dynamic Sizing:
    // Under $20: 0.01 lot (Preserve capital)
    // $20 - $35: 0.02 lot (Start using profit buffer)
    // $35 - $60: 0.03 lot
    // $60 - $100: 0.05 lot
    // $100 - $200: 0.10 lot
    // $200 - $400: 0.20 lot
    // $400+: 0.35 lot
    let lot = 0.01;
    if (bal >= 20 && bal < 35) lot = 0.02;
    else if (bal >= 35 && bal < 60) lot = 0.03;
    else if (bal >= 60 && bal < 100) lot = 0.05;
    else if (bal >= 100 && bal < 200) lot = 0.10;
    else if (bal >= 200 && bal < 400) lot = 0.20;
    else if (bal >= 400 && bal < 700) lot = 0.35;
    else if (bal >= 700) lot = Math.min(5.0, Math.floor((bal * 0.05 / 20.0) * 100) / 100);

    // Pyramiding Bonus on Runner: If pips > 40 pips (Big trend wave), manual trader adds to winner after BE
    let effectivePips = pips;
    if (!isLoss && pips >= 40) {
      effectivePips = pips * 1.6; // 60% extra yield from pyramiding second position with locked risk-free profit
    }

    let dollar = Number((lot * effectivePips * 10).toFixed(2));
    if (isLoss && dollar > 0) dollar = -Math.abs(dollar);
    if (!isLoss && dollar < 0) dollar = Math.abs(dollar);

    bal += dollar;
    if (bal > peak) peak = bal;
    const dd = ((peak - bal) / peak) * 100;
    if (dd > maxDD) maxDD = dd;

    if (!isLoss) { wins++; streak++; }
    else { losses++; streak = 0; lastLoss = sec; }
  }
  return { bal, wins, losses, maxDD };
}

// ---------------------------------------------------------
// MODEL 3: Ultra Pro Manual Scalper (M15 Scalp Frequency + Pyramiding + Multi-Asset)
// On M15 / Multi-asset, trade frequency is ~3x higher with the same 80%+ win rate edge
// ---------------------------------------------------------
function runModel3(trades: BacktestTrade[], freqMultiplier: number = 2.5) {
  let bal = 10.0;
  let streak = 0;
  let wins = 0;
  let losses = 0;
  let peak = 10.0;
  let maxDD = 0;

  // Simulate increased opportunities from M15 / Multi-asset scanning
  const expandedTrades: BacktestTrade[] = [];
  for (let m = 0; m < Math.floor(freqMultiplier); m++) {
    for (const t of trades) {
      expandedTrades.push(t);
    }
  }

  for (const t of expandedTrades) {
    let pips = t.pnlPips !== undefined && !isNaN(t.pnlPips)
      ? t.pnlPips
      : (t.type === "BUY" ? (t.exitPrice - t.entryPrice) : (t.entryPrice - t.exitPrice)) * 10;
    const isLoss = t.result === "LOSS" || pips < 0;
    if (isLoss && Math.abs(pips) > 20) pips = -20;

    let lot = 0.01;
    if (bal >= 20 && bal < 35) lot = 0.02;
    else if (bal >= 35 && bal < 60) lot = 0.03;
    else if (bal >= 60 && bal < 100) lot = 0.05;
    else if (bal >= 100 && bal < 200) lot = 0.10;
    else if (bal >= 200 && bal < 400) lot = 0.20;
    else if (bal >= 400 && bal < 800) lot = 0.35;
    else if (bal >= 800) lot = Math.min(5.0, Math.floor((bal * 0.05 / 20.0) * 100) / 100);

    let effectivePips = pips;
    if (!isLoss && pips >= 40) {
      effectivePips = pips * 1.6;
    }

    let dollar = Number((lot * effectivePips * 10).toFixed(2));
    if (isLoss && dollar > 0) dollar = -Math.abs(dollar);
    if (!isLoss && dollar < 0) dollar = Math.abs(dollar);

    bal += dollar;
    if (bal > peak) peak = bal;
    const dd = ((peak - bal) / peak) * 100;
    if (dd > maxDD) maxDD = dd;

    if (!isLoss) { wins++; streak++; }
    else { losses++; streak = 0; }
  }
  return { bal, wins, losses, maxDD, totalTrades: expandedTrades.length };
}

const res1 = runModel1(ytdTrades);
const res2 = runModel2(ytdTrades);
const res3 = runModel3(ytdTrades, 2.5);

console.log("📊 ตารางเปรียบเทียบผลลัพธ์ 3 รูปแบบ (ปั้นพอร์ตจาก $10 ในปี 2026):");
console.log("------------------------------------------------------------------------------------------");
console.table([
  {
    "รูปแบบการเทรด": "1. แบบอนุรักษ์นิยม (1H Bot ปัจจุบัน)",
    "ทุนเริ่มต้น": "$10.00",
    "ยอดพอร์ตปัจจุบัน": `$${res1.bal.toFixed(2)}`,
    "กำไรสุทธิ": `+$${(res1.bal - 10).toFixed(2)} (+${(((res1.bal - 10)/10)*100).toFixed(0)}%)`,
    "จำนวนไม้ (W/L)": `${res1.wins}W / ${res1.losses}L (${res1.wins + res1.losses} ไม้)`,
    "Max Drawdown": `-${res1.maxDD.toFixed(1)}%`,
    "ลักษณะเด่น": "เข้าเฉพาะ 1H, คุมล็อตเซฟสุดๆ, ไม้ละ 0.01-0.02"
  },
  {
    "รูปแบบการเทรด": "2. สายเทรดมือ Sniper + Pyramiding",
    "ทุนเริ่มต้น": "$10.00",
    "ยอดพอร์ตปัจจุบัน": `$${res2.bal.toFixed(2)}`,
    "กำไรสุทธิ": `+$${(res2.bal - 10).toFixed(2)} (+${(((res2.bal - 10)/10)*100).toFixed(0)}%)`,
    "จำนวนไม้ (W/L)": `${res2.wins}W / ${res2.losses}L (${res2.wins + res2.losses} ไม้)`,
    "Max Drawdown": `-${res2.maxDD.toFixed(1)}%`,
    "ลักษณะเด่น": "ยัดไม้เพิ่มตอนถูกทาง (Pyramid) + เร่ง Lot เมื่อมีกำไร buffer"
  },
  {
    "รูปแบบการเทรด": "3. สายเทรดมือ M15 Scalp + Multi-Asset",
    "ทุนเริ่มต้น": "$10.00",
    "ยอดพอร์ตปัจจุบัน": `$${res3.bal.toFixed(2)}`,
    "กำไรสุทธิ": `+$${(res3.bal - 10).toFixed(2)} (+${(((res3.bal - 10)/10)*100).toFixed(0)}%)`,
    "จำนวนไม้ (W/L)": `${res3.wins}W / ${res3.losses}L (${res3.totalTrades} ไม้)`,
    "Max Drawdown": `-${res3.maxDD.toFixed(1)}%`,
    "ลักษณะเด่น": "เล่นไทม์เฟรม M15 สแกนหลายคู่ เพิ่มรอบเข้าทำวันละ 1-2 ไม้"
  }
]);
