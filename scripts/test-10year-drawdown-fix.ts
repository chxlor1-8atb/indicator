import * as fs from "fs";
import * as path from "path";
import { Candle, BacktestTrade } from "../lib/types";
import { simulateInstitutionalBacktest } from "../lib/marketService";

const dataPath = path.resolve(process.cwd(), "data", "xauusd_1h_10year.json");
const candles: Candle[] = JSON.parse(fs.readFileSync(dataPath, "utf-8"));

console.log("=======================================================================");
console.log(" 🧪 10-YEAR WALK-FORWARD & DRAWDOWN SUPPRESSION TEST (XAUUSD 1H)");
console.log(`    Total 10-Year Candlesticks: ${candles.length} bars`);
console.log("=======================================================================\n");

candles.sort((a, b) => a.time - b.time);
const splitIdx = Math.floor(candles.length * 0.70); // 70% In-Sample, 30% Out-of-Sample

const isCandles = candles.slice(0, splitIdx);
const oosCandles = candles.slice(splitIdx);

const allTrades = simulateInstitutionalBacktest("XAUUSD", candles);
const splitTimeSec = isCandles[isCandles.length - 1].time > 1e11 ? Math.floor(isCandles[isCandles.length - 1].time / 1000) : isCandles[isCandles.length - 1].time;

const isTrades = allTrades.filter(t => (t.entryTime > 1e11 ? Math.floor(t.entryTime / 1000) : t.entryTime) <= splitTimeSec);
const oosTrades = allTrades.filter(t => (t.entryTime > 1e11 ? Math.floor(t.entryTime / 1000) : t.entryTime) > splitTimeSec);

function evaluateStrategy(trades: BacktestTrade[], label: string, options: {
  maxSlPips: number;
  asianBoxHourEnd: number; // e.g. 14 (block 06:00 - 13:59)
  cooldownBars: number;
  enableTimeDecayStop: boolean;
}) {
  const startBal = 10.0;
  let bal = startBal;
  let peak = startBal;
  let maxDD = 0.0;
  let wins = 0;
  let losses = 0;
  let grossProfit = 0;
  let grossLoss = 0;
  let lastLossSec = 0;

  for (const t of trades) {
    const d = new Date(t.entryTime > 1e11 ? t.entryTime : t.entryTime * 1000);
    const thaiHour = (d.getUTCHours() + 7) % 24;
    const entrySec = t.entryTime > 1e11 ? Math.floor(t.entryTime / 1000) : t.entryTime;

    // Filter A: Asian + Pre-London Transition Box Shield
    if (t.regime === "BOX" && thaiHour >= 6 && thaiHour < options.asianBoxHourEnd) {
      continue;
    }

    // Filter B: Post-Loss Cooldown
    if (options.cooldownBars > 0 && lastLossSec > 0) {
      if (entrySec - lastLossSec < options.cooldownBars * 3600) {
        continue;
      }
    }

    let pips = t.pnlPips !== undefined && !isNaN(t.pnlPips)
      ? t.pnlPips
      : (t.type === "BUY" ? (t.exitPrice - t.entryPrice) : (t.entryPrice - t.exitPrice)) * 10;

    let isLoss = t.result === "LOSS" || pips < 0;

    // Hard-Cap SL
    if (isLoss && Math.abs(pips) > options.maxSlPips) {
      pips = -options.maxSlPips;
    }

    const lot = 0.01;
    let dollar = Number((lot * pips * 10.0).toFixed(2));
    if (isLoss && dollar > 0) dollar = -Math.abs(dollar);
    if (!isLoss && dollar < 0) dollar = Math.abs(dollar);

    bal = Number((bal + dollar).toFixed(2));
    if (bal < 0.01) bal = 0.0;
    if (bal > peak) peak = bal;
    const dd = peak > 0 ? ((peak - bal) / peak) * 100 : 0;
    if (dd > maxDD) maxDD = dd;

    if (!isLoss) {
      wins++;
      grossProfit += dollar;
    } else {
      losses++;
      grossLoss += Math.abs(dollar);
      lastLossSec = entrySec;
    }
  }

  const total = wins + losses;
  const wr = total > 0 ? (wins / total) * 100 : 0;
  const net = Number((bal - startBal).toFixed(2));
  const pf = grossLoss > 0 ? Number((grossProfit / grossLoss).toFixed(2)) : 99.99;

  return {
    label,
    total,
    wins,
    losses,
    winRate: `${wr.toFixed(1)}%`,
    netProfit: `${net >= 0 ? "+" : ""}$${net.toFixed(2)}`,
    maxDD: `-${maxDD.toFixed(1)}%`,
    profitFactor: pf,
    finalBalance: `$${bal.toFixed(2)}`,
  };
}

// 1. Raw Baseline
const rawIS = evaluateStrategy(isTrades, "IS Raw Baseline", { maxSlPips: 50, asianBoxHourEnd: 0, cooldownBars: 0, enableTimeDecayStop: false });
const rawOOS = evaluateStrategy(oosTrades, "OOS Raw Baseline", { maxSlPips: 50, asianBoxHourEnd: 0, cooldownBars: 0, enableTimeDecayStop: false });

// 2. With Asian Morning Box Shield (06:00 - 12:00)
const shield12_IS = evaluateStrategy(isTrades, "IS Asian Shield (12:00)", { maxSlPips: 50, asianBoxHourEnd: 12, cooldownBars: 0, enableTimeDecayStop: false });
const shield12_OOS = evaluateStrategy(oosTrades, "OOS Asian Shield (12:00)", { maxSlPips: 50, asianBoxHourEnd: 12, cooldownBars: 0, enableTimeDecayStop: false });

// 3. With Pre-London Transition Extension (06:00 - 14:00) + Micro-SL Cap (22 pips)
const shield14_IS = evaluateStrategy(isTrades, "IS London Bridge (14:00) + SL 22p", { maxSlPips: 22, asianBoxHourEnd: 14, cooldownBars: 2, enableTimeDecayStop: true });
const shield14_OOS = evaluateStrategy(oosTrades, "OOS London Bridge (14:00) + SL 22p", { maxSlPips: 22, asianBoxHourEnd: 14, cooldownBars: 2, enableTimeDecayStop: true });

console.table([
  { Phase: "In-Sample (Backward)", ...rawIS },
  { Phase: "In-Sample (Backward)", ...shield12_IS },
  { Phase: "In-Sample (Backward)", ...shield14_IS },
  { Phase: "Out-of-Sample (Forward)", ...rawOOS },
  { Phase: "Out-of-Sample (Forward)", ...shield12_OOS },
  { Phase: "Out-of-Sample (Forward)", ...shield14_OOS },
]);
