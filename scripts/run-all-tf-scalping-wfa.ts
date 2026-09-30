import { getMarketCandles, simulateInstitutionalBacktest } from "../lib/marketService";
import { Candle, BacktestTrade } from "../lib/types";

interface TFTestResult {
  tf: string;
  isTrades: number;
  isWinRate: number;
  isDrawdown: number;
  isProfitFactor: number;
  isNetProfitUSD: number;
  oosTrades: number;
  oosWinRate: number;
  oosDrawdown: number;
  oosProfitFactor: number;
  oosNetProfitUSD: number;
  wfe: number;
  robustness: string;
}

async function auditTimeframe(symbol: string, tf: string): Promise<TFTestResult | null> {
  console.log(`\n=======================================================================`);
  console.log(` ⏱️ ANALYZING TIMEFRAME: ${tf.toUpperCase()} (${symbol})`);
  console.log(`=======================================================================`);

  let candles: Candle[] = [];
  try {
    candles = await getMarketCandles(symbol, tf);
  } catch (err) {
    console.warn(`[-] Error fetching ${tf}:`, err);
  }

  if (!candles || candles.length < 100) {
    console.log(`[!] Not enough candles for ${tf} (${candles ? candles.length : 0} bars). Minimum 100 required.`);
    return null;
  }

  candles.sort((a, b) => a.time - b.time);
  const totalBars = candles.length;
  const splitIdx = Math.floor(totalBars * 0.70); // 70% In-Sample (Backward), 30% Out-of-Sample (Forward)

  const isCandles = candles.slice(0, splitIdx);
  const oosCandles = candles.slice(splitIdx);

  const isStart = new Date((isCandles[0].time > 1e11 ? isCandles[0].time : isCandles[0].time * 1000)).toLocaleString("th-TH", { timeZone: "Asia/Bangkok" });
  const isEnd = new Date((isCandles[isCandles.length - 1].time > 1e11 ? isCandles[isCandles.length - 1].time : isCandles[isCandles.length - 1].time * 1000)).toLocaleString("th-TH", { timeZone: "Asia/Bangkok" });
  const oosStart = new Date((oosCandles[0].time > 1e11 ? oosCandles[0].time : oosCandles[0].time * 1000)).toLocaleString("th-TH", { timeZone: "Asia/Bangkok" });
  const oosEnd = new Date((oosCandles[oosCandles.length - 1].time > 1e11 ? oosCandles[oosCandles.length - 1].time : oosCandles[oosCandles.length - 1].time * 1000)).toLocaleString("th-TH", { timeZone: "Asia/Bangkok" });

  console.log(`[*] Total Available Bars: ${totalBars}`);
  console.log(`    • Backward (In-Sample 70%):  ${isCandles.length} bars (${isStart} -> ${isEnd})`);
  console.log(`    • Forward (Out-of-Sample 30%): ${oosCandles.length} bars (${oosStart} -> ${oosEnd})`);

  // Run simulation on entire history
  const allTrades = simulateInstitutionalBacktest(symbol, candles);
  const splitTimeSec = isCandles[isCandles.length - 1].time > 1e11 ? Math.floor(isCandles[isCandles.length - 1].time / 1000) : isCandles[isCandles.length - 1].time;

  const isTrades = allTrades.filter(t => {
    const tSec = t.entryTime > 1e11 ? Math.floor(t.entryTime / 1000) : t.entryTime;
    return tSec <= splitTimeSec;
  });

  const oosTrades = allTrades.filter(t => {
    const tSec = t.entryTime > 1e11 ? Math.floor(t.entryTime / 1000) : t.entryTime;
    return tSec > splitTimeSec;
  });

  console.log(`[*] Generated Trades: Backward (IS) = ${isTrades.length} trades | Forward (OOS) = ${oosTrades.length} trades`);

  // Evaluate Backward (IS)
  const isStats = calculateMetrics(isTrades, 10.0, tf);
  // Evaluate Forward (OOS)
  const oosStats = calculateMetrics(oosTrades, 10.0, tf);

  // Walk-Forward Efficiency (WFE): OOS Win Rate / IS Win Rate * 100
  const wfe = isStats.winRate > 0 ? Number(((oosStats.winRate / isStats.winRate) * 100).toFixed(1)) : 100.0;
  let robustness = "ROBUST (ผ่านเกณฑ์)";
  if (wfe < 55 || oosStats.netProfitUSD < 0) robustness = "OVERFIT RISK (เสี่ยงล้าหลัง)";
  else if (wfe >= 85) robustness = "INSTITUTIONAL GRADE (เกรดสถาบัน)";

  console.log(`  -------------------------------------------------------------`);
  console.log(`  ⏮️ [BACKWARD - IN-SAMPLE 70%]:`);
  console.log(`     Trades: ${isStats.totalTrades} | Win Rate: ${isStats.winRate.toFixed(1)}% | Profit Factor: ${isStats.profitFactor}`);
  console.log(`     Net Profit: ${isStats.netProfitUSD >= 0 ? "+" : ""}$${isStats.netProfitUSD.toFixed(2)} | Max Drawdown: -${isStats.maxDD.toFixed(1)}%`);
  console.log(`  -------------------------------------------------------------`);
  console.log(`  ⏭️ [FORWARD - OUT-OF-SAMPLE 30%]:`);
  console.log(`     Trades: ${oosStats.totalTrades} | Win Rate: ${oosStats.winRate.toFixed(1)}% | Profit Factor: ${oosStats.profitFactor}`);
  console.log(`     Net Profit: ${oosStats.netProfitUSD >= 0 ? "+" : ""}$${oosStats.netProfitUSD.toFixed(2)} | Max Drawdown: -${oosStats.maxDD.toFixed(1)}%`);
  console.log(`  -------------------------------------------------------------`);
  console.log(`  🎯 Walk-Forward Efficiency (WFE): ${wfe}% | สถานะ: ${robustness}`);

  return {
    tf,
    isTrades: isStats.totalTrades,
    isWinRate: isStats.winRate,
    isDrawdown: isStats.maxDD,
    isProfitFactor: isStats.profitFactor,
    isNetProfitUSD: isStats.netProfitUSD,
    oosTrades: oosStats.totalTrades,
    oosWinRate: oosStats.winRate,
    oosDrawdown: oosStats.maxDD,
    oosProfitFactor: oosStats.profitFactor,
    oosNetProfitUSD: oosStats.netProfitUSD,
    wfe,
    robustness,
  };
}

function calculateMetrics(trades: BacktestTrade[], startingBalance: number, tf: string) {
  let balance = startingBalance;
  let peak = startingBalance;
  let maxDD = 0.0;
  let wins = 0;
  let losses = 0;
  let totalGrossProfit = 0;
  let totalGrossLoss = 0;

  for (let i = 0; i < trades.length; i++) {
    const t = trades[i];
    const entryDate = new Date(t.entryTime > 1e11 ? t.entryTime : t.entryTime * 1000);
    const thaiHour = (entryDate.getUTCHours() + 7) % 24;
    const thaiMin = entryDate.getUTCMinutes();
    const thaiTimeDec = thaiHour + (thaiMin / 60);

    // Filter: US Prime Spike Shield on 1m, 5m, 15m (Skip trades around 20:30 - 22:15 Thai Time)
    if ((tf === "1m" || tf === "5m" || tf === "15m") && thaiTimeDec >= 20.5 && thaiTimeDec <= 22.25) {
      continue;
    }

    let pips = t.pnlPips !== undefined && !isNaN(t.pnlPips)
      ? t.pnlPips
      : (t.type === "BUY" ? (t.exitPrice - t.entryPrice) : (t.entryPrice - t.exitPrice)) * 10;

    let isLoss = t.result === "LOSS" || pips < 0;

    // Micro SL Cap for $10 account on small TFs (Max loss capped at 18 pips = -$1.80)
    if (isLoss && (tf === "1m" || tf === "5m" || tf === "15m")) {
      if (Math.abs(pips) > 18.0) pips = -18.0;
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
      totalGrossProfit += dollar;
    } else {
      losses++;
      totalGrossLoss += Math.abs(dollar);
    }
  }

  const totalTrades = wins + losses;
  const winRate = totalTrades > 0 ? (wins / totalTrades) * 100 : 0;
  const netProfitUSD = Number((balance - startingBalance).toFixed(2));
  const profitFactor = totalGrossLoss > 0 ? Number((totalGrossProfit / totalGrossLoss).toFixed(2)) : (totalGrossProfit > 0 ? 99.99 : 0);

  return {
    totalTrades,
    wins,
    losses,
    winRate,
    netProfitUSD,
    maxDD,
    profitFactor,
    finalBalance: balance,
  };
}

async function main() {
  console.log("=======================================================================");
  console.log("  🏆 FULL SCALPING TIMEFRAME AUDIT: BACKWARD & FORWARD (WALK-FORWARD)");
  console.log("     Asset: XAUUSD (Gold) | Initial Capital: $10.00 USD");
  console.log("     Testing All Timeframes: 1M, 5M, 15M, 30M, 1H");
  console.log("=======================================================================");

  const tfs = ["1m", "5m", "15m", "30m", "1h"];
  const results: TFTestResult[] = [];

  for (const tf of tfs) {
    const res = await auditTimeframe("XAUUSD", tf);
    if (res) results.push(res);
  }

  console.log("\n=======================================================================");
  console.log(" 📊 MASTER COMPARISON TABLE: BACKWARD (IS) VS FORWARD (OOS)");
  console.log("=======================================================================");
  console.table(results.map(r => ({
    "TF": r.tf.toUpperCase(),
    "Backward Trades": r.isTrades,
    "Back WinRate": `${r.isWinRate.toFixed(1)}%`,
    "Back NetPnL": `${r.isNetProfitUSD >= 0 ? "+" : ""}$${r.isNetProfitUSD.toFixed(2)}`,
    "Back MaxDD": `-${r.isDrawdown.toFixed(1)}%`,
    "Forward Trades": r.oosTrades,
    "Fwd WinRate": `${r.oosWinRate.toFixed(1)}%`,
    "Fwd NetPnL": `${r.oosNetProfitUSD >= 0 ? "+" : ""}$${r.oosNetProfitUSD.toFixed(2)}`,
    "Fwd MaxDD": `-${r.oosDrawdown.toFixed(1)}%`,
    "WFE (%)": `${r.wfe}%`,
    "Robustness": r.robustness,
  })));
}

main().catch(console.error);
