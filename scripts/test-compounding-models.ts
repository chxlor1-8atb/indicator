import * as fs from "fs";
import * as path from "path";
import { Candle, BacktestTrade } from "../lib/types";
import { simulateInstitutionalBacktest } from "../lib/marketService";
import { calculateDynamicPositionSize } from "../lib/riskEngine";

const dataPath = path.resolve(process.cwd(), "data", "xauusd_1h_10year.json");
const candles: Candle[] = JSON.parse(fs.readFileSync(dataPath, "utf-8"));
const allTrades = simulateInstitutionalBacktest("XAUUSD", candles);

function simModel(
  trades: BacktestTrade[],
  modelName: string,
  lotFn: (balance: number, t: BacktestTrade) => number
) {
  let balance = 10.0;
  let peak = 10.0;
  let maxDD = 0;
  let maxLot = 0.01;
  let busted = false;

  for (let i = 0; i < trades.length; i++) {
    const t = trades[i];
    let lot = lotFn(balance, t);
    if (lot > maxLot) maxLot = lot;

    let effPips = t.pnlPips;
    if (balance < 50 && effPips < 0) {
      effPips = Math.max(-25, effPips);
    }

    const pnlUSD = effPips * (lot * 10);
    balance += pnlUSD;

    if (balance > peak) peak = balance;
    const dd = ((peak - balance) / peak) * 100;
    if (dd > maxDD) maxDD = dd;

    if (balance <= 1.50) {
      busted = true;
      break;
    }
  }

  console.log(
    `[${modelName.padEnd(38)}] Final: $${balance.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })} | Max Lot: ${maxLot.toFixed(2)} | Max DD: -${maxDD.toFixed(1)}% | Busted: ${busted}`
  );
}

console.log("=== COMPARING COMPOUNDING MODELS STARTING FROM $10 USD (10 YEARS, 507 TRADES) ===\n");

// Model 1: The conservative capped script (Cap 5.0 lots)
simModel(allTrades, "1. Capped at 5.0 Lots (ผลเทสเดิม)", (b) => {
  if (b < 100) return 0.01;
  if (b < 250) return 0.02;
  if (b < 500) return 0.04;
  if (b < 1000) return 0.08;
  if (b < 2500) return 0.15;
  if (b < 5000) return 0.30;
  if (b < 10000) return 0.60;
  return Math.min(5.0, Number((b / 15000).toFixed(2)));
});

// Model 2: Dynamic Sizing with 10.0 Lots Cap
simModel(allTrades, "2. Dynamic Sizing (Cap 10.0 Lots)", (b) => {
  if (b < 100) return 0.01;
  if (b < 250) return 0.02;
  if (b < 500) return 0.04;
  if (b < 1000) return 0.08;
  if (b < 2500) return 0.15;
  if (b < 5000) return 0.30;
  if (b < 10000) return 0.60;
  return Math.min(10.0, Number((b / 7500).toFixed(2)));
});

// Model 3: True Standard Institutional Risk (1.5% fixed risk per trade, min 0.01 lot)
simModel(allTrades, "3. Institutional 1.5% Risk (No Cap)", (b, t) => {
  if (b < 50) return 0.01;
  const riskUSD = b * 0.015;
  const slDist = Math.max(1.5, Math.abs(t.entryPrice - (t.pnlPips < 0 ? t.entryPrice - t.pnlPips / 10 : t.entryPrice - 2.5)));
  const slPips = slDist * 10;
  const lot = Math.max(0.01, Number((riskUSD / (slPips * 10)).toFixed(2)));
  return lot;
});

// Model 4: Market-Adaptive Auto Lot Scaling (ตามสภาวะตลาด + Balance)
simModel(allTrades, "4. Market-Adaptive Auto Lot (BALANCED)", (b, t) => {
  if (b < 50) return 0.01;

  // Base institutional risk 1.8%
  let riskPct = 1.8;

  // Market Regime Multiplier (ขยายหรือลดขนาดล็อตตามสภาพตลาด)
  let regimeMultiplier = 1.0;
  if (t.regime === "TREND") {
    regimeMultiplier = 1.25; // ตลาดเทรนด์สถาบันโมเมนตัมสูง ขยายล็อตขึ้น +25%
  } else if (t.regime === "BOX") {
    regimeMultiplier = 0.70; // ตลาดกรอบไซด์เวย์ ลดล็อตลง -30%
  }

  const effectiveRiskPct = riskPct * regimeMultiplier;
  const riskUSD = b * (effectiveRiskPct / 100);
  const slDist = Math.max(1.5, Math.abs(t.entryPrice - (t.pnlPips < 0 ? t.entryPrice - t.pnlPips / 10 : t.entryPrice - 2.5)));
  const slPips = slDist * 10;
  
  // Cap at 10.0 lots for safety
  const lot = Math.min(10.0, Math.max(0.01, Number((riskUSD / (slPips * 10)).toFixed(2))));
  return lot;
});

// Model 6: Hybrid Tiered Compounding + Market Regime Adaptive (Best of Both Worlds)
simModel(allTrades, "6. Hybrid Tiered + Market Adaptive (PRO)", (b, t) => {
  let baseLot = 0.01;
  if (b < 100) baseLot = 0.01;
  else if (b < 250) baseLot = 0.02;
  else if (b < 500) baseLot = 0.04;
  else if (b < 1000) baseLot = 0.08;
  else if (b < 2500) baseLot = 0.15;
  else if (b < 5000) baseLot = 0.30;
  else if (b < 10000) baseLot = 0.60;
  else baseLot = Number((b / 7500).toFixed(2));

  // Multiplier according to Market Regime
  let regimeMultiplier = 1.0;
  if (t.regime === "TREND") {
    regimeMultiplier = 1.25; // ตลาดเทรนด์สถาบันโมเมนตัมสูง เร่ง +25%
  } else if (t.regime === "BOX") {
    regimeMultiplier = 0.70; // ตลาดกรอบไซด์เวย์ ลด -30%
  }

  const finalLot = Math.min(15.0, Math.max(0.01, Number((baseLot * regimeMultiplier).toFixed(2))));
  return finalLot;
});



