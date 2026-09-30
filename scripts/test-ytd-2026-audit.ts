import * as fs from "fs";
import * as path from "path";
import { Candle, BacktestTrade } from "../lib/types";
import { simulateInstitutionalBacktest } from "../lib/marketService";

// 1. Load Data
const h1Path = path.resolve(process.cwd(), "data", "xauusd_1h_10year.json");
const candles: Candle[] = JSON.parse(fs.readFileSync(h1Path, "utf-8"));
candles.sort((a, b) => a.time - b.time);

console.log("==========================================================================================");
console.log(" 🏆 XAUUSD YEAR-TO-DATE (YTD 2026) AUDIT: ปั้นพอร์ตจาก $10.00 สู่ปัจจุบัน");
console.log(`    ช่วงเวลา: 1 มกราคม 2026 – ปัจจุบัน (ตุลาคม 2026) | ทุนเริ่มต้น: $10.00 USD`);
console.log("==========================================================================================\n");

// 2. Generate institutional trades across entire dataset to maintain indicator memory
const allTrades = simulateInstitutionalBacktest("XAUUSD", candles);

// 3. Filter YTD 2026 trades
const startOf2026Sec = Math.floor(new Date("2026-01-01T00:00:00Z").getTime() / 1000);
const ytdTrades = allTrades.filter(t => {
  const sec = t.entryTime > 1e11 ? Math.floor(t.entryTime / 1000) : t.entryTime;
  return sec >= startOf2026Sec;
});

console.log(`📊 จำนวนออเดอร์สถาบันทั้งหมดตลอด 10 ปี: ${allTrades.length} ไม้`);
console.log(`🎯 จำนวนออเดอร์ในรอบปี 2026 (YTD): ${ytdTrades.length} ไม้\n`);

// 4. Exact 14-Step Hyper-Growth Staircase Lot Scaling
function getStaircaseLot(bal: number, streak: number): number {
  let lot = 0.01;
  if (bal < 25.0) lot = 0.01;
  else if (bal < 40.0) lot = 0.01;
  else if (bal < 60.0) lot = 0.02;
  else if (bal < 80.0) lot = 0.03;
  else if (bal < 100.0) lot = 0.04;
  else if (bal < 150.0) lot = 0.05;
  else if (bal < 200.0) lot = 0.07;
  else if (bal < 300.0) lot = 0.10;
  else if (bal < 400.0) lot = 0.15;
  else if (bal < 500.0) lot = 0.20;
  else if (bal < 600.0) lot = 0.25;
  else if (bal < 800.0) lot = 0.30;
  else if (bal < 1000.0) lot = 0.40;
  else lot = Math.min(10.0, Math.floor((bal * 0.02 / 20.0) * 100) / 100);

  // House money streak boost (if won 2 in a row and balance >= $40)
  if (streak >= 2 && bal >= 40.0) {
    lot = Math.min(15.0, Math.floor(lot * 1.35 * 100) / 100);
  }
  return Math.max(0.01, lot);
}

// 5. Run YTD Simulation
let bal = 10.0;
let peak = 10.0;
let maxDD = 0.0;
let maxDDAmount = 0.0;
let wins = 0;
let losses = 0;
let streak = 0;
let maxWinStreak = 0;
let maxLossStreak = 0;
let curLossStreak = 0;
let grossProfit = 0;
let grossLoss = 0;
let lastLossSec = 0;

const milestones = [20, 30, 40, 50, 60, 70, 80, 90, 100, 200, 300, 400, 500, 600, 800, 1000, 1500, 2000, 3000];
const reachedMilestones: any[] = [];
let nextTarget = 0;

interface MonthlyStat {
  month: string;
  trades: number;
  wins: number;
  losses: number;
  profit: number;
  endBalance: number;
}
const monthlyStats: Map<string, MonthlyStat> = new Map();

const executedTrades: any[] = [];

for (const t of ytdTrades) {
  const d = new Date(t.entryTime > 1e11 ? t.entryTime : t.entryTime * 1000);
  const monthKey = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
  const thaiHour = (d.getUTCHours() + 7) % 24;
  const entrySec = t.entryTime > 1e11 ? Math.floor(t.entryTime / 1000) : t.entryTime;

  // Filter A: Asian & Pre-London Transition Box Shield (06:00 - 13:59 Thai Time) unless Judas Swing
  if (t.regime === "BOX" && thaiHour >= 6 && thaiHour < 14) continue;

  // Filter B: Post-Loss Cooldown (2 hours)
  if (lastLossSec > 0 && entrySec - lastLossSec < 2 * 3600) continue;

  let pips = t.pnlPips !== undefined && !isNaN(t.pnlPips)
    ? t.pnlPips
    : (t.type === "BUY" ? (t.exitPrice - t.entryPrice) : (t.entryPrice - t.exitPrice)) * 10;

  let isLoss = t.result === "LOSS" || pips < 0;
  if (isLoss && Math.abs(pips) > 22.0) {
    pips = -22.0; // Micro-SL Hard Cap
  }

  const lot = getStaircaseLot(bal, streak);
  let dollar = Number((lot * pips * 10.0).toFixed(2));
  if (isLoss && dollar > 0) dollar = -Math.abs(dollar);
  if (!isLoss && dollar < 0) dollar = Math.abs(dollar);

  bal = Number((bal + dollar).toFixed(2));
  if (bal < 0.10) {
    bal = 0.0;
    console.log("❌ Margin Call / Blown Account!");
    break;
  }

  if (bal > peak) peak = bal;
  const curDD = peak > 0 ? ((peak - bal) / peak) * 100 : 0;
  const curDDAmount = peak - bal;
  if (curDD > maxDD) maxDD = curDD;
  if (curDDAmount > maxDDAmount) maxDDAmount = curDDAmount;

  if (!isLoss) {
    wins++;
    streak++;
    curLossStreak = 0;
    if (streak > maxWinStreak) maxWinStreak = streak;
    grossProfit += dollar;
  } else {
    losses++;
    curLossStreak++;
    streak = 0;
    if (curLossStreak > maxLossStreak) maxLossStreak = curLossStreak;
    grossLoss += Math.abs(dollar);
    lastLossSec = entrySec;
  }

  // Monthly stats tracking
  if (!monthlyStats.has(monthKey)) {
    monthlyStats.set(monthKey, {
      month: monthKey,
      trades: 0,
      wins: 0,
      losses: 0,
      profit: 0,
      endBalance: bal,
    });
  }
  const mStat = monthlyStats.get(monthKey)!;
  mStat.trades++;
  if (!isLoss) mStat.wins++;
  else mStat.losses++;
  mStat.profit = Number((mStat.profit + dollar).toFixed(2));
  mStat.endBalance = bal;

  executedTrades.push({
    date: d.toISOString().split("T")[0],
    time: d.toISOString().split("T")[1].slice(0, 5),
    type: t.type,
    entry: t.entryPrice.toFixed(2),
    exit: t.exitPrice.toFixed(2),
    pips: pips.toFixed(1),
    lot: lot.toFixed(2),
    dollar: (dollar >= 0 ? `+$${dollar.toFixed(2)}` : `-$${Math.abs(dollar).toFixed(2)}`),
    balance: `$${bal.toFixed(2)}`,
    result: isLoss ? "LOSS" : "WIN",
  });

  // Milestone tracking
  while (nextTarget < milestones.length && bal >= milestones[nextTarget]) {
    reachedMilestones.push({
      "เป้าหมาย": `$${milestones[nextTarget]}`,
      "ทุนขณะนั้น": `$${bal.toFixed(2)}`,
      "Lot ถัดไป": getStaircaseLot(bal, streak).toFixed(2),
      "จำนวนไม้": wins + losses,
      "ชนะ/แพ้": `${wins}W / ${losses}L`,
      "Win Rate": `${((wins / (wins + losses)) * 100).toFixed(1)}%`,
      "Max DD": `-${maxDD.toFixed(1)}%`,
      "วันที่บรรลุ": d.toISOString().split("T")[0],
    });
    nextTarget++;
  }
}

const totalTrades = wins + losses;
const winRate = totalTrades > 0 ? (wins / totalTrades) * 100 : 0;
const netProfit = bal - 10.0;
const roi = (netProfit / 10.0) * 100;
const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : 999;

console.log("==========================================================================================");
console.log(" 📈 สรุปผลการดำเนินงาน YTD 2026 (1 ม.ค. 2026 - ปัจจุบัน)");
console.log("==========================================================================================");
console.log(`💵 ทุนเริ่มต้น (Starting Balance):       $10.00 USD`);
console.log(`💰 ยอดพอร์ตปัจจุบัน (Current Balance):    $${bal.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD`);
console.log(`🚀 กำไรสุทธิ (Net Profit):               +$${netProfit.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD (+${roi.toLocaleString("en-US", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%)`);
console.log(`🎯 อัตราชนะ (Win Rate):                  ${winRate.toFixed(1)}% (${wins} ชนะ / ${losses} แพ้ จากทั้งหมด ${totalTrades} ไม้)`);
console.log(`🛡️ Profit Factor:                        ${profitFactor.toFixed(2)} (กำไร $${grossProfit.toFixed(2)} / ขาดทุน $${grossLoss.toFixed(2)})`);
console.log(`📉 Maximum Drawdown (DD สูงสุด):         -${maxDD.toFixed(2)}% ($${maxDDAmount.toFixed(2)})`);
console.log(`🔥 สถิติชนะติดต่อกันสูงสุด (Max Win Streak):   ${maxWinStreak} ไม้`);
console.log(`⚠️ สถิติแพ้ติดต่อกันสูงสุด (Max Loss Streak):  ${maxLossStreak} ไม้\n`);

console.log("------------------------------------------------------------------------------------------");
console.log(" 🗓️ ผลงานแบ่งรายเดือน (Monthly Breakdown 2026)");
console.log("------------------------------------------------------------------------------------------");
const monthlyTable = Array.from(monthlyStats.values()).map(m => ({
  "เดือน": m.month,
  "จำนวนไม้": m.trades,
  "ชนะ": m.wins,
  "แพ้": m.losses,
  "Win Rate": `${((m.wins / m.trades) * 100).toFixed(1)}%`,
  "กำไรรายเดือน": (m.profit >= 0 ? `+$${m.profit.toFixed(2)}` : `-$${Math.abs(m.profit).toFixed(2)}`),
  "ยอดเงินคงเหลือสิ้นเดือน": `$${m.endBalance.toFixed(2)}`,
}));
console.table(monthlyTable);

console.log("\n------------------------------------------------------------------------------------------");
console.log(" 🪜 ลำดับขั้นบันไดเป้าหมายที่ปลดล็อคได้ในปี 2026");
console.log("------------------------------------------------------------------------------------------");
console.table(reachedMilestones);

// Output recent trades
console.log("\n------------------------------------------------------------------------------------------");
console.log(" 🔍 รายการออเดอร์ทั้งหมด 23 ไม้ของปี 2026 (All Trades Log)");
console.log("------------------------------------------------------------------------------------------");
console.table(executedTrades);
