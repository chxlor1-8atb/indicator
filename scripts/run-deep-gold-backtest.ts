import * as fs from "fs";
import * as path from "path";
import { Candle } from "../lib/types";
import { simulateInstitutionalBacktest } from "../lib/marketService";
import { BacktestTrade } from "../lib/db";

async function runDeepGoldBacktest() {
  const dataPath = path.resolve(process.cwd(), "data", "xauusd_1h_deep.json");
  if (!fs.existsSync(dataPath)) {
    console.error(`Data file not found at ${dataPath}. Please run scripts/fetch-deep-gold-history.ts first.`);
    return;
  }

  console.log(`\n================================================================================`);
  console.log(` 🏆 2-YEAR DEEP HISTORICAL QUANT BACKTEST: GOLD (XAUUSD / PAXG)`);
  console.log(`================================================================================\n`);

  const rawJson = fs.readFileSync(dataPath, "utf-8");
  const candles: Candle[] = JSON.parse(rawJson);
  console.log(`Loaded ${candles.length.toLocaleString()} 1-Hour candles`);
  console.log(`Time Span: ${new Date(candles[0].time * 1000).toISOString().split("T")[0]} to ${new Date(candles[candles.length - 1].time * 1000).toISOString().split("T")[0]}`);
  console.log(`Price Range: $${candles[0].close} -> $${candles[candles.length - 1].close}\n`);

  const t0 = Date.now();
  console.log("Running Institutional Backtest with 5-Pillars, Anti-Clash Veto & Dynamic SL/TP...");
  const trades: BacktestTrade[] = simulateInstitutionalBacktest("XAUUSD", candles);
  const elapsed = Date.now() - t0;

  console.log(`Execution completed in ${elapsed}ms. Total Trades Simulated: ${trades.length}\n`);

  if (trades.length === 0) {
    console.warn("No trades generated.");
    return;
  }

  const wins = trades.filter((t) => t.result === "WIN");
  const losses = trades.filter((t) => t.result === "LOSS");
  const bes = trades.filter((t) => t.result === "BE");

  const winRate = Number(((wins.length / (wins.length + losses.length)) * 100).toFixed(1));
  const beInclusiveWinRate = Number((((wins.length + bes.length * 0.5) / trades.length) * 100).toFixed(1));
  const totalNetPips = Number(trades.reduce((acc, t) => acc + (t.pnlPips || 0), 0).toFixed(1));
  const totalNetR = Number(trades.reduce((acc, t) => acc + (t.pnlR || 0), 0).toFixed(2));

  const totalGainR = wins.reduce((acc, t) => acc + (t.pnlR || 0), 0);
  const totalLossR = Math.abs(losses.reduce((acc, t) => acc + (t.pnlR || 0), 0));
  const profitFactor = totalLossR > 0 ? Number((totalGainR / totalLossR).toFixed(2)) : 99.0;

  // Max consecutive wins / losses
  let maxConsecWins = 0;
  let maxConsecLosses = 0;
  let currWins = 0;
  let currLosses = 0;
  let maxDrawdownR = 0;
  let peakR = 0;
  let cumulativeR = 0;

  for (const t of trades) {
    cumulativeR += t.pnlR;
    if (cumulativeR > peakR) peakR = cumulativeR;
    const dd = peakR - cumulativeR;
    if (dd > maxDrawdownR) maxDrawdownR = dd;

    if (t.result === "WIN") {
      currWins++;
      currLosses = 0;
      if (currWins > maxConsecWins) maxConsecWins = currWins;
    } else if (t.result === "LOSS") {
      currLosses++;
      currWins = 0;
      if (currLosses > maxConsecLosses) maxConsecLosses = currLosses;
    }
  }

  console.log(`┌──────────────────────────────────────────────────────────────────────────────┐`);
  console.log(`│ 📊 สถิติภาพรวม 2 ปีเต็ม (2-Year Overall Quantitative Performance)            │`);
  console.log(`├──────────────────────────────────────────────────────────────────────────────┤`);
  console.log(`│  • วินเรทมาตรฐาน (Win Rate - Excl. BE)    : ${String(winRate + "%").padEnd(10, " ")} [🎯 Target 70-80%]`);
  console.log(`│  • วินเรทรวม BE (Win Rate - Incl. BE)     : ${String(beInclusiveWinRate + "%").padEnd(10, " ")}`);
  console.log(`│  • จำนวนไม้ทั้งหมด (Total Executions)     : ${String(trades.length).padEnd(10, " ")} ไม้`);
  console.log(`│  • สัดส่วนผลลัพธ์ (Outcome Ratio)         : ชนะ ${wins.length} | แพ้ ${losses.length} | เสมอ ${bes.length}`);
  console.log(`│  • กำไรสุทธิ (Net Pips)                   : ${String(totalNetPips > 0 ? "+" + totalNetPips : totalNetPips).padEnd(10, " ")} pips`);
  console.log(`│  • ผลตอบแทนสะสม (Cumulative Payoff)       : ${String("+" + totalNetR + "R").padEnd(10, " ")}`);
  console.log(`│  • Profit Factor (Gross Gain / Gross Loss): ${String(profitFactor).padEnd(10, " ")} [สถาบัน > 2.0]`);
  console.log(`│  • ชนะติดต่อกันสูงสุด (Max Consecutive W)  : ${String(maxConsecWins).padEnd(10, " ")} ไม้`);
  console.log(`│  • แพ้ติดต่อกันสูงสุด (Max Consecutive L)  : ${String(maxConsecLosses).padEnd(10, " ")} ไม้`);
  console.log(`│  • Maximum Drawdown (DD)                  : ${String("-" + maxDrawdownR.toFixed(1) + "R").padEnd(10, " ")}`);
  console.log(`└──────────────────────────────────────────────────────────────────────────────┘\n`);

  // Breakdown by Year & Quarter
  interface PeriodStats {
    period: string;
    total: number;
    wins: number;
    losses: number;
    bes: number;
    netPips: number;
    netR: number;
  }
  const periodMap = new Map<string, PeriodStats>();

  for (const t of trades) {
    const d = new Date(t.entryTime * 1000);
    const yr = d.getUTCFullYear();
    const qtr = Math.floor(d.getUTCMonth() / 3) + 1;
    const periodKey = `${yr}-Q${qtr}`;

    let st = periodMap.get(periodKey);
    if (!st) {
      st = { period: periodKey, total: 0, wins: 0, losses: 0, bes: 0, netPips: 0, netR: 0 };
      periodMap.set(periodKey, st);
    }
    st.total++;
    if (t.result === "WIN") st.wins++;
    else if (t.result === "LOSS") st.losses++;
    else if (t.result === "BE") st.bes++;
    st.netPips += t.pnlPips || 0;
    st.netR += t.pnlR || 0;
  }

  const periodRows = Array.from(periodMap.values())
    .sort((a, b) => a.period.localeCompare(b.period))
    .map((p) => {
      const wr = p.wins + p.losses > 0 ? ((p.wins / (p.wins + p.losses)) * 100).toFixed(1) + "%" : "0%";
      return {
        "ไตรมาส (Quarter)": p.period,
        "จำนวนไม้": p.total,
        "ชนะ (W)": p.wins,
        "แพ้ (L)": p.losses,
        "เสมอ (BE)": p.bes,
        "Win Rate": wr,
        "Net Pips": (p.netPips > 0 ? "+" : "") + p.netPips.toFixed(1),
        "Net R": (p.netR > 0 ? "+" : "") + p.netR.toFixed(1) + "R",
      };
    });

  console.log("📈 ผลการทดสอบแยกตามรายไตรมาส (Quarterly Robustness Matrix):");
  console.table(periodRows);
}

runDeepGoldBacktest().catch(console.error);
