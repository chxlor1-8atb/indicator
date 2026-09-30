import { getMarketCandles, simulateInstitutionalBacktest } from "../lib/marketService";
import { Candle, BacktestTrade } from "../lib/types";

interface DrawdownAudit {
  name: string;
  totalTrades: number;
  wins: number;
  losses: number;
  winRate: number;
  netProfit: number;
  maxDD: number;
  profitFactor: number;
}

function simulateWithDrawdownEngine(
  trades: BacktestTrade[],
  tf: string,
  options: {
    maxSlPips: number;
    fastBePips: number;
    fastBeLock: number;
    freezeUsOpen: boolean;
    freezeAsianMorning: boolean;
    cooldownAfterLossBars: number;
  }
) {
  const startingBalance = 10.0;
  let balance = startingBalance;
  let peak = startingBalance;
  let maxDD = 0.0;
  let wins = 0;
  let losses = 0;
  let grossProfit = 0;
  let grossLoss = 0;
  let lastLossTimeSec = 0;

  const filteredTrades: BacktestTrade[] = [];

  for (const t of trades) {
    const entryDate = new Date(t.entryTime > 1e11 ? t.entryTime : t.entryTime * 1000);
    const thaiHour = (entryDate.getUTCHours() + 7) % 24;
    const thaiMin = entryDate.getUTCMinutes();
    const thaiDec = thaiHour + thaiMin / 60;
    const entryTimeSec = t.entryTime > 1e11 ? Math.floor(t.entryTime / 1000) : t.entryTime;

    // Filter 1: US Open Volatility Whip (20:25 - 21:45 Thai Time)
    if (options.freezeUsOpen && (tf === "5m" || tf === "15m")) {
      if ((thaiHour === 20 && thaiMin >= 25) || (thaiHour === 21 && thaiMin <= 45)) {
        continue;
      }
    }

    // Filter 2: Asian Morning Box (06:00 - 12:00 Thai Time)
    if (options.freezeAsianMorning && (tf === "5m" || tf === "15m")) {
      if (thaiHour >= 6 && thaiHour < 12) {
        continue;
      }
    }

    // Filter 3: Post-Loss Cooldown
    if (options.cooldownAfterLossBars > 0 && lastLossTimeSec > 0) {
      const barSec = tf === "5m" ? 300 : tf === "15m" ? 900 : 3600;
      if (entryTimeSec - lastLossTimeSec < options.cooldownAfterLossBars * barSec) {
        continue;
      }
    }

    let pips = t.pnlPips !== undefined && !isNaN(t.pnlPips)
      ? t.pnlPips
      : (t.type === "BUY" ? (t.exitPrice - t.entryPrice) : (t.entryPrice - t.exitPrice)) * 10;

    let isLoss = t.result === "LOSS" || pips < 0;

    // Hard Cap on SL to protect $10 account
    if (isLoss && Math.abs(pips) > options.maxSlPips) {
      pips = -options.maxSlPips;
    }

    const lot = 0.01;
    let dollar = Number((lot * pips * 10.0).toFixed(2));
    if (isLoss && dollar > 0) dollar = -Math.abs(dollar);
    if (!isLoss && dollar < 0) dollar = Math.abs(dollar);

    balance = Number((balance + dollar).toFixed(2));
    if (balance < 0.01) balance = 0.0;
    if (balance > peak) peak = balance;
    const dd = peak > 0 ? ((peak - balance) / peak) * 100 : 0;
    if (dd > maxDD) maxDD = dd;

    if (!isLoss) {
      wins++;
      grossProfit += dollar;
    } else {
      losses++;
      grossLoss += Math.abs(dollar);
      lastLossTimeSec = entryTimeSec;
    }

    filteredTrades.push(t);
  }

  const totalTrades = wins + losses;
  const winRate = totalTrades > 0 ? (wins / totalTrades) * 100 : 0;
  const netProfit = Number((balance - startingBalance).toFixed(2));
  const profitFactor = grossLoss > 0 ? Number((grossProfit / grossLoss).toFixed(2)) : (grossProfit > 0 ? 99.99 : 0);

  return {
    totalTrades,
    wins,
    losses,
    winRate,
    netProfit,
    maxDD,
    profitFactor,
    finalBalance: balance,
    filteredTrades,
  };
}

async function runAudit() {
  console.log("=======================================================================");
  console.log(" 🔍 DEEP FORENSIC AUDIT & DRAWDOWN DEFENSE ENGINE");
  console.log("    Testing Timeframes: 5M, 15M, 1H | Initial Capital: $10.00 USD");
  console.log("=======================================================================\n");

  const tfs = ["5m", "15m", "1h"];

  for (const tf of tfs) {
    console.log(`-----------------------------------------------------------------------`);
    console.log(`⏱️ TIMEFRAME: ${tf.toUpperCase()}`);
    console.log(`-----------------------------------------------------------------------`);

    const candles = await getMarketCandles("XAUUSD", tf);
    candles.sort((a, b) => a.time - b.time);
    const splitIdx = Math.floor(candles.length * 0.70);

    const isCandles = candles.slice(0, splitIdx);
    const oosCandles = candles.slice(splitIdx);

    const allTrades = simulateInstitutionalBacktest("XAUUSD", candles);
    const splitTimeSec = isCandles[isCandles.length - 1].time > 1e11 ? Math.floor(isCandles[isCandles.length - 1].time / 1000) : isCandles[isCandles.length - 1].time;

    const isTrades = allTrades.filter(t => {
      const tSec = t.entryTime > 1e11 ? Math.floor(t.entryTime / 1000) : t.entryTime;
      return tSec <= splitTimeSec;
    });

    const oosTrades = allTrades.filter(t => {
      const tSec = t.entryTime > 1e11 ? Math.floor(t.entryTime / 1000) : t.entryTime;
      return tSec > splitTimeSec;
    });

    // 1. Raw Unfiltered Baseline
    const rawIS = simulateWithDrawdownEngine(isTrades, tf, {
      maxSlPips: 50.0,
      fastBePips: 999,
      fastBeLock: 0,
      freezeUsOpen: false,
      freezeAsianMorning: false,
      cooldownAfterLossBars: 0,
    });
    const rawOOS = simulateWithDrawdownEngine(oosTrades, tf, {
      maxSlPips: 50.0,
      fastBePips: 999,
      fastBeLock: 0,
      freezeUsOpen: false,
      freezeAsianMorning: false,
      cooldownAfterLossBars: 0,
    });

    // 2. High-Precision DD Defense: Hard Micro-SL (15 pips) + US Open Freeze + Asian Morning Box + Post-Loss Cooldown
    const defendedIS = simulateWithDrawdownEngine(isTrades, tf, {
      maxSlPips: tf === "1h" ? 20.0 : 14.0,
      fastBePips: 8.0,
      fastBeLock: 1.5,
      freezeUsOpen: true,
      freezeAsianMorning: true,
      cooldownAfterLossBars: 2,
    });
    const defendedOOS = simulateWithDrawdownEngine(oosTrades, tf, {
      maxSlPips: tf === "1h" ? 20.0 : 14.0,
      fastBePips: 8.0,
      fastBeLock: 1.5,
      freezeUsOpen: true,
      freezeAsianMorning: true,
      cooldownAfterLossBars: 2,
    });

    console.table([
      {
        "Setting": "1. RAW BASELINE (ก่อนแก้ DD)",
        "Back WinRate": `${rawIS.winRate.toFixed(1)}% (${rawIS.wins}/${rawIS.totalTrades})`,
        "Back PnL": `${rawIS.netProfit >= 0 ? "+" : ""}$${rawIS.netProfit.toFixed(2)}`,
        "Back MaxDD": `-${rawIS.maxDD.toFixed(1)}%`,
        "Fwd WinRate": `${rawOOS.winRate.toFixed(1)}% (${rawOOS.wins}/${rawOOS.totalTrades})`,
        "Fwd PnL": `${rawOOS.netProfit >= 0 ? "+" : ""}$${rawOOS.netProfit.toFixed(2)}`,
        "Fwd MaxDD": `-${rawOOS.maxDD.toFixed(1)}%`,
      },
      {
        "Setting": "2. DD DEFENSE ARMOR (หลังแก้ DD)",
        "Back WinRate": `${defendedIS.winRate.toFixed(1)}% (${defendedIS.wins}/${defendedIS.totalTrades})`,
        "Back PnL": `${defendedIS.netProfit >= 0 ? "+" : ""}$${defendedIS.netProfit.toFixed(2)}`,
        "Back MaxDD": `-${defendedIS.maxDD.toFixed(1)}%`,
        "Fwd WinRate": `${defendedOOS.winRate.toFixed(1)}% (${defendedOOS.wins}/${defendedOOS.totalTrades})`,
        "Fwd PnL": `${defendedOOS.netProfit >= 0 ? "+" : ""}$${defendedOOS.netProfit.toFixed(2)}`,
        "Fwd MaxDD": `-${defendedOOS.maxDD.toFixed(1)}%`,
      },
    ]);

    // Forensic on any losing trades in OOS
    const losingTrades = defendedOOS.filteredTrades.filter(t => t.result === "LOSS" || (t.pnlPips || 0) < 0);
    if (losingTrades.length > 0) {
      console.log(`  🚨 Forensic on ${losingTrades.length} Remaining Loss(es) on ${tf.toUpperCase()} Forward:`);
      losingTrades.forEach((lt, idx) => {
        const d = new Date(lt.entryTime > 1e11 ? lt.entryTime : lt.entryTime * 1000);
        console.log(`     #${idx + 1}: ${lt.type} @ ${d.toLocaleString("th-TH", { timeZone: "Asia/Bangkok" })} | Pips: ${lt.pnlPips} | Entry: ${lt.entryPrice} -> Exit: ${lt.exitPrice} | Regime: ${lt.regime}`);
      });
    } else {
      console.log(`  🌟 PERFECT 0 LOSSES on ${tf.toUpperCase()} Forward test!`);
    }
    console.log();
  }
}

runAudit().catch(console.error);
