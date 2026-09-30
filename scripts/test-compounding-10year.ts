import * as fs from "fs";
import * as path from "path";
import { Candle, BacktestTrade } from "../lib/types";
import { simulateInstitutionalBacktest } from "../lib/marketService";

// Load 10-Year 1H Gold Data (73,949 bars)
const h1Path = path.resolve(process.cwd(), "data", "xauusd_1h_10year.json");
const candles: Candle[] = JSON.parse(fs.readFileSync(h1Path, "utf-8"));
candles.sort((a, b) => a.time - b.time);

console.log("==========================================================================================");
console.log(" 🚀 10-YEAR COMPOUNDING & LOT SCALING SIMULATION (XAUUSD 1H: 2016 - 2026)");
console.log(`    Total Candlesticks: ${candles.length} bars | Starting Capital: $10.00 USD`);
console.log("==========================================================================================\n");

const trades = simulateInstitutionalBacktest("XAUUSD", candles);
console.log(`✅ Total Institutional Trades Generated: ${trades.length} trades\n`);

interface ModeConfig {
  modeName: string;
  calcLot: (balance: number, streak: number, slPips: number) => number;
}

const MODES: ModeConfig[] = [
  {
    modeName: "1. Fixed 0.01 Lot (No Compounding - แบบที่เทสไปก่อนหน้า)",
    calcLot: () => 0.01,
  },
  {
    modeName: "2. Tiered Milestone Compounding (ก้าวหน้าตามระดับทุน $10 -> $50 -> $100 -> $500)",
    calcLot: (bal) => {
      if (bal < 35.0) return 0.01;
      if (bal < 80.0) return 0.02;
      if (bal < 150.0) return 0.04;
      if (bal < 300.0) return 0.08;
      if (bal < 600.0) return 0.15;
      if (bal < 1200.0) return 0.30;
      if (bal < 2500.0) return 0.60;
      if (bal < 5000.0) return 1.20;
      if (bal < 10000.0) return 2.50;
      if (bal < 25000.0) return 5.00;
      return 10.00; // Cap at 10 lots
    },
  },
  {
    modeName: "3. Institutional Risk Compounding (เสี่ยงคงที่ 2.0% ของ Equity ต่อไม้)",
    calcLot: (bal, streak, slPips) => {
      if (bal < 30.0) return 0.01;
      const riskDollar = bal * 0.02; // 2.0%
      const effectiveSlPips = Math.max(15, slPips);
      let lot = riskDollar / (effectiveSlPips * 10.0);
      lot = Math.max(0.01, Math.min(20.0, Math.floor(lot * 100) / 100));
      return lot;
    },
  },
  {
    modeName: "4. Profit Martingale + Dynamic Compounding (เร่งสปีดเมื่อชนะต่อเนื่อง 2-3 ไม้ติด)",
    calcLot: (bal, streak, slPips) => {
      if (bal < 30.0) return 0.01;
      const riskDollar = bal * 0.02; // 2.0%
      const effectiveSlPips = Math.max(15, slPips);
      let lot = riskDollar / (effectiveSlPips * 10.0);
      // If win streak >= 2, boost lot by 1.35x using house money
      if (streak >= 2) lot *= 1.35;
      lot = Math.max(0.01, Math.min(30.0, Math.floor(lot * 100) / 100));
      return lot;
    },
  },
];

function runBacktest(mode: ModeConfig) {
  let bal = 10.0;
  let peak = 10.0;
  let maxDD = 0.0;
  let wins = 0;
  let losses = 0;
  let winStreak = 0;
  let maxWinStreak = 0;
  let lastLossSec = 0;

  const milestoneLog: { milestone: string; tradesCount: number; dateStr: string }[] = [];
  const milestones = [50, 100, 500, 1000, 5000, 10000, 50000, 100000, 500000, 1000000];
  let nextMilestoneIdx = 0;

  for (const t of trades) {
    const d = new Date(t.entryTime > 1e11 ? t.entryTime : t.entryTime * 1000);
    const thaiHour = (d.getUTCHours() + 7) % 24;
    const entrySec = t.entryTime > 1e11 ? Math.floor(t.entryTime / 1000) : t.entryTime;

    // Filter 1: Asian & Pre-London Transition Box Shield
    if (t.regime === "BOX" && thaiHour >= 6 && thaiHour < 14) continue;

    // Filter 2: Cooldown
    if (lastLossSec > 0 && entrySec - lastLossSec < 2 * 3600) continue;

    let pips = t.pnlPips !== undefined && !isNaN(t.pnlPips)
      ? t.pnlPips
      : (t.type === "BUY" ? (t.exitPrice - t.entryPrice) : (t.entryPrice - t.exitPrice)) * 10;

    let isLoss = t.result === "LOSS" || pips < 0;
    if (isLoss && Math.abs(pips) > 22.0) {
      pips = -22.0;
    }

    const slPips = isLoss ? Math.abs(pips) : 20.0;
    const lot = mode.calcLot(bal, winStreak, slPips);

    let dollar = Number((lot * pips * 10.0).toFixed(2));
    if (isLoss && dollar > 0) dollar = -Math.abs(dollar);
    if (!isLoss && dollar < 0) dollar = Math.abs(dollar);

    bal = Number((bal + dollar).toFixed(2));
    if (bal < 0.10) {
      bal = 0.0;
      break;
    }

    if (bal > peak) peak = bal;
    const dd = peak > 0 ? ((peak - bal) / peak) * 100 : 0;
    if (dd > maxDD) maxDD = dd;

    if (!isLoss) {
      wins++;
      winStreak++;
      if (winStreak > maxWinStreak) maxWinStreak = winStreak;
    } else {
      losses++;
      winStreak = 0;
      lastLossSec = entrySec;
    }

    // Check milestones
    if (nextMilestoneIdx < milestones.length && bal >= milestones[nextMilestoneIdx]) {
      milestoneLog.push({
        milestone: `$${milestones[nextMilestoneIdx].toLocaleString()}`,
        tradesCount: wins + losses,
        dateStr: d.toISOString().split("T")[0],
      });
      nextMilestoneIdx++;
    }
  }

  const total = wins + losses;
  const wr = total > 0 ? Number(((wins / total) * 100).toFixed(1)) : 0;

  return {
    modeName: mode.modeName,
    trades: `${wins}/${total} (${wr}%)`,
    finalBalance: bal,
    maxDD: Number(maxDD.toFixed(1)),
    maxStreak: maxWinStreak,
    milestones: milestoneLog,
  };
}

const results = MODES.map(runBacktest);

console.log("==========================================================================================");
console.log(" 📊 สรุปเปรียบเทียบการปั้นพอร์ต 10 ปี (2016 - 2026): เงินต้น $10.00 USD");
console.log("==========================================================================================");

const summaryTable = results.map((r) => ({
  "รูปแบบการจัดการ Lot": r.modeName,
  "ผลเทรด ชนะ/ทั้งหมด": r.trades,
  "เงินเริ่มต้น": "$10.00",
  "พอร์ตปลายทาง (10 ปี)": `$${r.finalBalance.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
  "กำไรสุทธิ (Net PnL)": `+$${(r.finalBalance - 10.0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
  "ผลตอบแทน (ROI)": `+${(((r.finalBalance - 10.0) / 10.0) * 100).toLocaleString("en-US", { maximumFractionDigits: 0 })}%`,
  "Drawdown สูงสุด": `-${r.maxDD}%`,
  "Win Streak สูงสุด": `${r.maxStreak} ไม้ติด`,
}));

console.table(summaryTable);

console.log("\n==========================================================================================");
console.log(" 🏆 ไทม์ไลน์การเติบโตตามหลักไมล์ (Milestones) ของโหมด Institutional Risk 2%:");
console.log("==========================================================================================");
const riskMode = results[2];
console.table(riskMode.milestones);
