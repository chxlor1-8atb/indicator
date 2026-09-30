import * as fs from "fs";
import * as path from "path";
import { Candle, BacktestTrade } from "../lib/types";
import { simulateInstitutionalBacktest } from "../lib/marketService";

const dataPath = path.resolve(process.cwd(), "data", "xauusd_1h_10year.json");
const candles: Candle[] = JSON.parse(fs.readFileSync(dataPath, "utf-8"));
const allTrades = simulateInstitutionalBacktest("XAUUSD", candles);

// Filter test: What if we filter out Asian Morning Box trades?
const filteredTrades = allTrades.filter(t => {
  const d = new Date(t.entryTime > 1e11 ? t.entryTime : t.entryTime * 1000);
  const thaiHour = (d.getUTCHours() + 7) % 24;
  // If it's a BOX trade during Asian Morning (06:00 - 12:00), skip it!
  if (t.regime === "BOX" && thaiHour >= 6 && thaiHour <= 12) {
    return false;
  }
  return true;
});

const origWins = allTrades.filter(t => t.result === "WIN").length;
const origLosses = allTrades.filter(t => t.result === "LOSS").length;
const origWR = (origWins / (origWins + origLosses)) * 100;

const filtWins = filteredTrades.filter(t => t.result === "WIN").length;
const filtLosses = filteredTrades.filter(t => t.result === "LOSS").length;
const filtWR = (filtWins / (filtWins + filtLosses)) * 100;

console.log(`=== COMPARISON: ORIGINAL VS ASIAN BOX FILTERED ===`);
console.log(`Original: ${allTrades.length} trades | Wins: ${origWins}, Losses: ${origLosses} | WR: ${origWR.toFixed(2)}%`);
console.log(`Filtered: ${filteredTrades.length} trades | Wins: ${filtWins}, Losses: ${filtLosses} | WR: ${filtWR.toFixed(2)}%\n`);

// Profit Martingale Simulation (Anti-Martingale on Win Streak using House Money)
function simProfitMartingale(trades: BacktestTrade[], enableProfitMartingale: boolean) {
  let balance = 10.0;
  let peak = 10.0;
  let maxDD = 0;
  let winStreak = 0;
  let maxLot = 0.01;

  for (let i = 0; i < trades.length; i++) {
    const t = trades[i];

    // Base Tier Lot
    let baseLot = 0.01;
    if (balance < 100) baseLot = 0.01;
    else if (balance < 250) baseLot = 0.02;
    else if (balance < 500) baseLot = 0.04;
    else if (balance < 1000) baseLot = 0.08;
    else if (balance < 2500) baseLot = 0.15;
    else if (balance < 5000) baseLot = 0.30;
    else if (balance < 10000) baseLot = 0.60;
    else baseLot = Number((balance / 7500).toFixed(2));

    let lot = baseLot;

    // Market Regime Multiplier
    if (t.regime === "TREND") lot *= 1.25;
    else if (t.regime === "BOX") lot *= 0.70;

    // Profit Martingale (Boost lot when in profit buffer and Win Streak >= 2)
    if (enableProfitMartingale && balance >= 50.0 && winStreak >= 2) {
      // 1.5x multiplier on streak 2, 2.0x on streak >= 3
      const streakMult = winStreak === 2 ? 1.5 : 2.0;
      lot *= streakMult;
    }

    lot = Math.min(20.0, Math.max(0.01, Number(lot.toFixed(2))));
    if (lot > maxLot) maxLot = lot;

    // PnL
    let effPips = t.pnlPips;
    if (balance < 50 && effPips < 0) {
      effPips = Math.max(-25, effPips);
    }

    const pnlUSD = effPips * (lot * 10);
    balance += pnlUSD;

    if (t.result === "WIN") {
      winStreak++;
    } else if (t.result === "LOSS") {
      winStreak = 0; // Immediate Reset to base
    }

    if (balance > peak) peak = balance;
    const dd = ((peak - balance) / peak) * 100;
    if (dd > maxDD) maxDD = dd;
  }

  return { balance, maxLot, maxDD };
}

const standard = simProfitMartingale(allTrades, false);
const profitMart = simProfitMartingale(allTrades, true);

console.log(`=== PROFIT MARTINGALE TEST (HOUSE MONEY BOOST) ===`);
console.log(`Standard Balanced:   Final: $${standard.balance.toLocaleString(undefined, { maximumFractionDigits: 2 })} | Max Lot: ${standard.maxLot} | Max DD: -${standard.maxDD.toFixed(1)}%`);
console.log(`Profit Martingale:  Final: $${profitMart.balance.toLocaleString(undefined, { maximumFractionDigits: 2 })} | Max Lot: ${profitMart.maxLot} | Max DD: -${profitMart.maxDD.toFixed(1)}%`);
