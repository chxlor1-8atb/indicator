import * as fs from "fs";
import * as path from "path";
import { Candle, BacktestTrade } from "../lib/types";
import { simulateInstitutionalBacktest } from "../lib/marketService";

async function run5YearBacktestAndWFA() {
  const dataPath = path.resolve(process.cwd(), "data", "xauusd_1h_ultra_deep.json");
  if (!fs.existsSync(dataPath)) {
    console.error("Data file not found. Please run scripts/fetch-ultra-deep-gold.ts first.");
    return;
  }

  const rawJson = fs.readFileSync(dataPath, "utf-8");
  const candles: Candle[] = JSON.parse(rawJson);

  console.log(`\n================================================================================`);
  console.log(` 🏆 5-YEAR ULTRA-DEEP QUANTITATIVE BACKTEST & FORWARD TEST SUITE`);
  console.log(`    Asset: Gold (XAUUSD / PAXG) | 1-Hour Candles: ${candles.length.toLocaleString()}`);
  console.log(`    Coverage: ${new Date(candles[0].time * 1000).toISOString().split("T")[0]} to ${new Date(candles[candles.length - 1].time * 1000).toISOString().split("T")[0]}`);
  console.log(`    Price Range: $${candles[0].close} -> $${candles[candles.length - 1].close}`);
  console.log(`================================================================================\n`);

  // ──────────────────────────────────────────────────────────────────────────
  // PART 1: FULL 5-YEAR BACKTEST
  // ──────────────────────────────────────────────────────────────────────────
  console.log("⚡ Executing Full 5-Year Institutional Simulation...");
  const t0 = Date.now();
  const allTrades: BacktestTrade[] = simulateInstitutionalBacktest("XAUUSD", candles);
  const elapsed = Date.now() - t0;
  console.log(`Execution completed in ${elapsed}ms. Total Trades Simulated: ${allTrades.length}\n`);

  function calculateStats(trades: BacktestTrade[]) {
    const wins = trades.filter((t) => t.result === "WIN");
    const losses = trades.filter((t) => t.result === "LOSS");
    const bes = trades.filter((t) => t.result === "BE");

    const winRate = wins.length + losses.length > 0 ? (wins.length / (wins.length + losses.length)) * 100 : 0;
    const beInclusiveWinRate = trades.length > 0 ? ((wins.length + bes.length * 0.5) / trades.length) * 100 : 0;
    const totalNetPips = trades.reduce((acc, t) => acc + (t.pnlPips || 0), 0);
    const totalNetR = trades.reduce((acc, t) => acc + (t.pnlR || 0), 0);
    const totalGainR = wins.reduce((acc, t) => acc + (t.pnlR || 0), 0);
    const totalLossR = Math.abs(losses.reduce((acc, t) => acc + (t.pnlR || 0), 0));
    const profitFactor = totalLossR > 0 ? totalGainR / totalLossR : 99.0;

    let maxConsecWins = 0;
    let maxConsecLosses = 0;
    let currW = 0;
    let currL = 0;
    let peakR = 0;
    let cumR = 0;
    let maxDDR = 0;

    for (const t of trades) {
      cumR += t.pnlR;
      if (cumR > peakR) peakR = cumR;
      const dd = peakR - cumR;
      if (dd > maxDDR) maxDDR = dd;

      if (t.result === "WIN") {
        currW++;
        currL = 0;
        if (currW > maxConsecWins) maxConsecWins = currW;
      } else if (t.result === "LOSS") {
        currL++;
        currW = 0;
        if (currL > maxConsecLosses) maxConsecLosses = currL;
      }
    }

    return {
      total: trades.length,
      wins: wins.length,
      losses: losses.length,
      bes: bes.length,
      winRate: Number(winRate.toFixed(1)),
      beInclusiveWinRate: Number(beInclusiveWinRate.toFixed(1)),
      totalNetPips: Number(totalNetPips.toFixed(1)),
      totalNetR: Number(totalNetR.toFixed(2)),
      profitFactor: Number(profitFactor.toFixed(2)),
      maxConsecWins,
      maxConsecLosses,
      maxDDR: Number(maxDDR.toFixed(1)),
    };
  }

  const overall = calculateStats(allTrades);

  console.log(`┌──────────────────────────────────────────────────────────────────────────────┐`);
  console.log(`│ 📊 สถิติภาพรวม 5 ปีเต็ม (5-Year Overall Quantitative Performance)            │`);
  console.log(`├──────────────────────────────────────────────────────────────────────────────┤`);
  console.log(`│  • วินเรทมาตรฐาน (Win Rate - Excl. BE)    : ${String(overall.winRate + "%").padEnd(10, " ")} [🎯 Target 80-90%]`);
  console.log(`│  • วินเรทรวม BE (Win Rate - Incl. BE)     : ${String(overall.beInclusiveWinRate + "%").padEnd(10, " ")}`);
  console.log(`│  • จำนวนไม้ทั้งหมด (Total Executions)     : ${String(overall.total).padEnd(10, " ")} ไม้`);
  console.log(`│  • สัดส่วนผลลัพธ์ (Outcome Ratio)         : ชนะ ${overall.wins} | แพ้ ${overall.losses} | เสมอ ${overall.bes}`);
  console.log(`│  • กำไรสุทธิ (Net Pips)                   : ${String(overall.totalNetPips > 0 ? "+" + overall.totalNetPips : overall.totalNetPips).padEnd(10, " ")} pips`);
  console.log(`│  • ผลตอบแทนสะสม (Cumulative Payoff)       : ${String("+" + overall.totalNetR + "R").padEnd(10, " ")}`);
  console.log(`│  • Profit Factor (Gross Gain / Gross Loss): ${String(overall.profitFactor).padEnd(10, " ")} [สถาบัน > 2.0]`);
  console.log(`│  • ชนะติดต่อกันสูงสุด (Max Consecutive W)  : ${String(overall.maxConsecWins).padEnd(10, " ")} ไม้`);
  console.log(`│  • แพ้ติดต่อกันสูงสุด (Max Consecutive L)  : ${String(overall.maxConsecLosses).padEnd(10, " ")} ไม้`);
  console.log(`│  • Maximum Drawdown (DD)                  : ${String("-" + overall.maxDDR + "R").padEnd(10, " ")}`);
  console.log(`└──────────────────────────────────────────────────────────────────────────────┘\n`);

  // ──────────────────────────────────────────────────────────────────────────
  // PART 2: YEAR-BY-YEAR BREAKDOWN (2021, 2022, 2023, 2024, 2025, 2026)
  // ──────────────────────────────────────────────────────────────────────────
  const yearlyMap = new Map<number, BacktestTrade[]>();
  for (const t of allTrades) {
    const yr = new Date(t.entryTime * 1000).getUTCFullYear();
    if (!yearlyMap.has(yr)) yearlyMap.set(yr, []);
    yearlyMap.get(yr)!.push(t);
  }

  const yearlyRows = Array.from(yearlyMap.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([yr, trs]) => {
      const s = calculateStats(trs);
      return {
        "ปี (Year)": yr,
        "จำนวนไม้": s.total,
        "ชนะ (W)": s.wins,
        "แพ้ (L)": s.losses,
        "เสมอ (BE)": s.bes,
        "Win Rate": s.winRate + "%",
        "Profit Factor": s.profitFactor,
        "Net Pips": (s.totalNetPips > 0 ? "+" : "") + s.totalNetPips,
        "Net R": (s.totalNetR > 0 ? "+" : "") + s.totalNetR + "R",
        "Max DD": "-" + s.maxDDR + "R",
      };
    });

  console.log("📈 ผลการทดสอบแยกตามรายปี (Year-by-Year Multi-Cycle Robustness):");
  console.table(yearlyRows);

  // ──────────────────────────────────────────────────────────────────────────
  // PART 3: FORWARD TEST (OUT-OF-SAMPLE WALK-FORWARD VALIDATION)
  // ──────────────────────────────────────────────────────────────────────────
  console.log("\n================================================================================");
  console.log(" 🧪 FORWARD TEST (OUT-OF-SAMPLE WALK-FORWARD VALIDATION)");
  console.log("    ทดสอบความแม่นยำบนข้อมูลอนาคตที่ระบบไม่เคยเห็นมาก่อน (Out-of-Sample)");
  console.log("================================================================================\n");

  // In-Sample (Past 70%): 2021 to mid 2024
  // Out-of-Sample Forward Test (Recent 30%): mid 2024 to late 2026
  const splitIndex = Math.floor(candles.length * 0.70);
  const inSampleCandles = candles.slice(0, splitIndex);
  const outOfSampleCandles = candles.slice(splitIndex);

  const isStartTime = new Date(inSampleCandles[0].time * 1000).toISOString().split("T")[0];
  const isEndTime = new Date(inSampleCandles[inSampleCandles.length - 1].time * 1000).toISOString().split("T")[0];
  const oosStartTime = new Date(outOfSampleCandles[0].time * 1000).toISOString().split("T")[0];
  const oosEndTime = new Date(outOfSampleCandles[outOfSampleCandles.length - 1].time * 1000).toISOString().split("T")[0];

  console.log(`📌 In-Sample Period (Backtest 70%)     : ${isStartTime} ถึง ${isEndTime} (${inSampleCandles.length.toLocaleString()} แท่ง)`);
  console.log(`📌 Out-of-Sample Period (Forward Test 30%): ${oosStartTime} ถึง ${oosEndTime} (${outOfSampleCandles.length.toLocaleString()} แท่ง)\n`);

  const inSampleTrades = simulateInstitutionalBacktest("XAUUSD", inSampleCandles);
  const forwardTrades = simulateInstitutionalBacktest("XAUUSD", outOfSampleCandles);

  const isStats = calculateStats(inSampleTrades);
  const fwdStats = calculateStats(forwardTrades);

  // Walk-Forward Efficiency (WFE) = OOS Win Rate / IS Win Rate
  const wfe = isStats.winRate > 0 ? (fwdStats.winRate / isStats.winRate) * 100 : 0;
  const isWfePassed = wfe >= 80.0 && fwdStats.profitFactor >= 2.0;

  console.log(`┌──────────────────────────────────────────────────────────────────────────────┐`);
  console.log(`│ 🏆 ตารางเปรียบเทียบผลลัพธ์ BACKTEST vs FORWARD TEST (WFA)                     │`);
  console.log(`├────────────────────────────────┬──────────────────────┬──────────────────────┤`);
  console.log(`│ ตัวชี้วัดสถิติเชิงปริมาณ         │ In-Sample (Backtest) │ Out-of-Sample (Fwd)  │`);
  console.log(`├────────────────────────────────┼──────────────────────┼──────────────────────┤`);
  console.log(`│ • จำนวนไม้เทรด (Trades)        │ ${String(isStats.total).padEnd(20, " ")} │ ${String(fwdStats.total).padEnd(20, " ")} │`);
  console.log(`│ • วินเรท (Win Rate - Excl. BE) │ ${String(isStats.winRate + "%").padEnd(20, " ")} │ ${String(fwdStats.winRate + "%").padEnd(20, " ")} │`);
  console.log(`│ • ผลลัพธ์ ชนะ/แพ้/เสมอ         │ ${String(isStats.wins + "/" + isStats.losses + "/" + isStats.bes).padEnd(20, " ")} │ ${String(fwdStats.wins + "/" + fwdStats.losses + "/" + fwdStats.bes).padEnd(20, " ")} │`);
  console.log(`│ • Profit Factor                │ ${String(isStats.profitFactor).padEnd(20, " ")} │ ${String(fwdStats.profitFactor).padEnd(20, " ")} │`);
  console.log(`│ • กำไรสะสม (Net Pips)          │ ${String("+" + isStats.totalNetPips).padEnd(20, " ")} │ ${String("+" + fwdStats.totalNetPips).padEnd(20, " ")} │`);
  console.log(`│ • ผลตอบแทน (Cumulative R)      │ ${String("+" + isStats.totalNetR + "R").padEnd(20, " ")} │ ${String("+" + fwdStats.totalNetR + "R").padEnd(20, " ")} │`);
  console.log(`│ • Max Drawdown                 │ ${String("-" + isStats.maxDDR + "R").padEnd(20, " ")} │ ${String("-" + fwdStats.maxDDR + "R").padEnd(20, " ")} │`);
  console.log(`├────────────────────────────────┴──────────────────────┴──────────────────────┤`);
  console.log(`│ 🎯 Walk-Forward Efficiency (WFE) : ${wfe.toFixed(1)}% (เกณฑ์สถาบันผ่านเมื่อ >= 80%)       │`);
  console.log(`│ 🛡️ สถานะประเมินความปลอดภัย      : ${isWfePassed ? "✅ ROBUST (ไม่ Overfit / พร้อมเทรดจริง)" : "⚠️ CAUTION"}        │`);
  console.log(`└──────────────────────────────────────────────────────────────────────────────┘\n`);

  // ──────────────────────────────────────────────────────────────────────────
  // PART 4: 5-FOLD ROLLING WALK-FORWARD MATRIX
  // ──────────────────────────────────────────────────────────────────────────
  console.log("🔄 5-Fold Rolling Walk-Forward Analysis (เคลื่อนที่ไป-กลับตรวจสอบทุกยุค):");
  const foldSize = Math.floor(candles.length / 5);
  const foldRows = [];

  for (let k = 0; k < 5; k++) {
    const start = k * foldSize;
    const end = (k === 4) ? candles.length : start + foldSize;
    const foldCandles = candles.slice(start, end);
    const fStartDate = new Date(foldCandles[0].time * 1000).toISOString().split("T")[0];
    const fEndDate = new Date(foldCandles[foldCandles.length - 1].time * 1000).toISOString().split("T")[0];

    const fTrades = simulateInstitutionalBacktest("XAUUSD", foldCandles);
    const fStat = calculateStats(fTrades);

    foldRows.push({
      "Fold": `Fold ${k + 1}`,
      "ช่วงเวลา (Time Window)": `${fStartDate} -> ${fEndDate}`,
      "จำนวนไม้": fStat.total,
      "ชนะ (W)": fStat.wins,
      "แพ้ (L)": fStat.losses,
      "เสมอ (BE)": fStat.bes,
      "Win Rate": fStat.winRate + "%",
      "Profit Factor": fStat.profitFactor,
      "Net R": "+" + fStat.totalNetR + "R",
      "Max DD": "-" + fStat.maxDDR + "R",
      "ประเมิน": fStat.winRate >= 80 ? "✅ แข็งแกร่งสูง" : "⚠️ ปานกลาง",
    });
  }

  console.table(foldRows);
}

run5YearBacktestAndWFA().catch(console.error);
