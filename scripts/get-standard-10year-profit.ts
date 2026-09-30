import * as fs from "fs";
import * as path from "path";
import { Candle, BacktestTrade } from "../lib/types";
import { simulateInstitutionalBacktest } from "../lib/marketService";

function getStandardDynamicLot(balance: number): number {
  if (balance < 100) return 0.01;
  if (balance < 250) return 0.02;
  if (balance < 500) return 0.04;
  if (balance < 1000) return 0.08;
  if (balance < 2500) return 0.15;
  if (balance < 5000) return 0.30;
  if (balance < 10000) return 0.60;
  return Math.min(5.0, Number((balance / 15000).toFixed(2)));
}

async function run() {
  const dataPath = path.resolve(process.cwd(), "data", "xauusd_1h_10year.json");
  const candles: Candle[] = JSON.parse(fs.readFileSync(dataPath, "utf-8"));
  const trades = simulateInstitutionalBacktest("XAUUSD", candles);

  let balance = 10.0;
  let peak = 10.0;
  let maxDD = 0;
  let maxLot = 0.01;
  const milestones: any[] = [];

  let winCount = 0;
  let lossCount = 0;
  let beCount = 0;

  for (let i = 0; i < trades.length; i++) {
    const t = trades[i];
    if (t.result === "WIN") winCount++;
    else if (t.result === "LOSS") lossCount++;
    else beCount++;

    const lot = getStandardDynamicLot(balance);
    if (lot > maxLot) maxLot = lot;

    const pnlUSD = Number((t.pnlPips * (lot * 10)).toFixed(2));
    balance += pnlUSD;

    if (balance > peak) peak = balance;
    const dd = ((peak - balance) / peak) * 100;
    if (dd > maxDD) maxDD = dd;

    const barYear = new Date(t.exitTime > 1e11 ? t.exitTime : t.exitTime * 1000).getFullYear();
    const nextTrade = trades[i + 1];
    const nextYear = nextTrade ? new Date(nextTrade.exitTime > 1e11 ? nextTrade.exitTime : nextTrade.exitTime * 1000).getFullYear() : 2026;

    if (barYear !== nextYear || i === trades.length - 1) {
      milestones.push({
        year: barYear,
        balanceUSD: Number(balance.toFixed(2)),
        currentLot: lot,
        maxDDSoFar: Number(maxDD.toFixed(1)),
        tradeNum: i + 1,
      });
    }
  }

  const profit = balance - 10.0;
  const roi = (profit / 10.0) * 100;

  console.log(JSON.stringify({
    initialBalance: 10.0,
    finalBalance: Number(balance.toFixed(2)),
    netProfit: Number(profit.toFixed(2)),
    roiPct: Number(roi.toFixed(1)),
    maxDrawdownPct: Number(maxDD.toFixed(1)),
    maxLotReached: maxLot,
    totalTrades: trades.length,
    wins: winCount,
    losses: lossCount,
    bes: beCount,
    winRate: Number(((winCount / (winCount + lossCount)) * 100).toFixed(1)),
    yearlyMilestones: milestones,
  }, null, 2));
}

run().catch(console.error);
