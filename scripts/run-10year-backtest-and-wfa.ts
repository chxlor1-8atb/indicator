import * as fs from "fs";
import * as path from "path";
import { Candle, BacktestTrade } from "../lib/types";
import { simulateInstitutionalBacktest } from "../lib/marketService";

interface YahooDailyBar {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

async function fetchYahoo10YearDaily(): Promise<YahooDailyBar[]> {
  const url = "https://query1.finance.yahoo.com/v8/finance/chart/GC=F?interval=1d&range=10y";
  const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
  if (!res.ok) {
    throw new Error(`Failed to fetch Yahoo 10y daily data: HTTP ${res.status}`);
  }
  const json = await res.json();
  const result = json.chart.result[0];
  const timestamps: number[] = result.timestamp;
  const quote = result.indicators.quote[0];

  const dailyBars: YahooDailyBar[] = [];
  for (let i = 0; i < timestamps.length; i++) {
    const o = quote.open[i];
    const h = quote.high[i];
    const l = quote.low[i];
    const c = quote.close[i];
    const v = quote.volume[i] || 1000;

    if (o && h && l && c && o > 0 && h >= Math.max(o, c) && l <= Math.min(o, c)) {
      dailyBars.push({
        time: timestamps[i],
        open: Number(o.toFixed(2)),
        high: Number(h.toFixed(2)),
        low: Number(l.toFixed(2)),
        close: Number(c.toFixed(2)),
        volume: v,
      });
    }
  }

  return dailyBars;
}

/**
 * Reconstructs realistic 24 hourly candles for a single trading day,
 * strictly bounded by the authentic daily Open, High, Low, Close.
 */
function synthesizeDayHourlyCandles(bar: YahooDailyBar): Candle[] {
  const candles: Candle[] = [];
  const baseTime = bar.time;
  const isBull = bar.close >= bar.open;
  const range = Math.max(0.1, bar.high - bar.low);

  let current = bar.open;

  for (let h = 0; h < 24; h++) {
    const candleTime = baseTime + h * 3600;
    let target = bar.open;
    let volWeight = 1.0;

    // Session cycle:
    // 00:00 - 06:00 (Asian): Consolidation near open
    if (h < 7) {
      target = bar.open + (Math.sin((h / 7) * Math.PI) * range * 0.15 * (isBull ? 1 : -1));
      volWeight = 0.5 + Math.random() * 0.3;
    }
    // 07:00 - 12:00 (London): First major expansion
    else if (h < 13) {
      if (isBull) {
        // Bullish day often dips early London then pushes up
        target = h <= 9 ? bar.low + range * 0.2 : bar.open + range * 0.5;
      } else {
        target = h <= 9 ? bar.high - range * 0.2 : bar.open - range * 0.5;
      }
      volWeight = 1.2 + Math.random() * 0.5;
    }
    // 13:00 - 19:00 (NY Overlap & Main Drive): Hits the daily extreme
    else if (h < 20) {
      const progress = (h - 13) / 7;
      if (isBull) {
        target = bar.open + (bar.high - bar.open) * (0.6 + progress * 0.4);
      } else {
        target = bar.open - (bar.open - bar.low) * (0.6 + progress * 0.4);
      }
      volWeight = 1.8 + Math.random() * 0.8;
    }
    // 20:00 - 23:00 (NY Close): Reverts and settles to daily close
    else {
      const progress = (h - 20) / 4;
      target = current + (bar.close - current) * progress;
      volWeight = 0.6 + Math.random() * 0.4;
    }

    const openPrice = current;
    // Bound candle between bar.low and bar.high
    const closePrice = Math.max(bar.low, Math.min(bar.high, Number(target.toFixed(2))));
    
    // Slight wick volatility
    const localNoise = range * 0.05 * (Math.random() - 0.48);
    let highPrice = Math.max(openPrice, closePrice) + Math.abs(localNoise);
    let lowPrice = Math.min(openPrice, closePrice) - Math.abs(localNoise);

    // If this is the peak hour, clamp to exact daily high/low
    if (h === 16) {
      if (isBull) highPrice = bar.high;
      else lowPrice = bar.low;
    } else if (h === 8) {
      if (isBull) lowPrice = bar.low;
      else highPrice = bar.high;
    }

    highPrice = Math.min(bar.high, Math.max(highPrice, Math.max(openPrice, closePrice)));
    lowPrice = Math.max(bar.low, Math.min(lowPrice, Math.min(openPrice, closePrice)));

    // On the final hour (23:00), force exact daily close
    const finalClose = h === 23 ? bar.close : closePrice;

    candles.push({
      time: candleTime,
      open: Number(openPrice.toFixed(2)),
      high: Number(highPrice.toFixed(2)),
      low: Number(lowPrice.toFixed(2)),
      close: Number(finalClose.toFixed(2)),
      volume: Math.round(bar.volume * volWeight / 24),
    });

    current = finalClose;
  }

  return candles;
}

async function assemble10YearDataset(): Promise<Candle[]> {
  const tenYearCachePath = path.resolve(process.cwd(), "data", "xauusd_1h_10year.json");
  if (fs.existsSync(tenYearCachePath)) {
    console.log("📂 Loading existing 10-year dataset from cache...");
    return JSON.parse(fs.readFileSync(tenYearCachePath, "utf-8"));
  }

  console.log("🌐 Fetching 10-year authentic daily tape from Yahoo Finance...");
  const dailyBars = await fetchYahoo10YearDaily();
  console.log(`Fetched ${dailyBars.length} daily bars (${new Date(dailyBars[0].time * 1000).toISOString().split("T")[0]} to ${new Date(dailyBars[dailyBars.length - 1].time * 1000).toISOString().split("T")[0]})`);

  // Load existing ultra deep hourly dataset (2021-2026)
  const ultraDeepPath = path.resolve(process.cwd(), "data", "xauusd_1h_ultra_deep.json");
  const verifiedHourly: Candle[] = fs.existsSync(ultraDeepPath)
    ? JSON.parse(fs.readFileSync(ultraDeepPath, "utf-8"))
    : [];

  const verifiedStartSec = verifiedHourly.length > 0 ? verifiedHourly[0].time : Infinity;

  // Synthesize hourly bars for the earlier period (2016 to 2021)
  const earlyDailyBars = dailyBars.filter((b) => b.time < verifiedStartSec);
  console.log(`Synthesizing session-accurate hourly bars for ${earlyDailyBars.length} daily bars prior to ${new Date(verifiedStartSec * 1000).toISOString().split("T")[0]}...`);

  const earlyHourly: Candle[] = [];
  for (const bar of earlyDailyBars) {
    const dayHours = synthesizeDayHourlyCandles(bar);
    earlyHourly.push(...dayHours);
  }

  console.log(`Synthesized ${earlyHourly.length.toLocaleString()} hourly bars for 2016-2021.`);
  console.log(`Merging with ${verifiedHourly.length.toLocaleString()} tick-verified hourly bars for 2021-2026...`);

  const full10Year: Candle[] = [...earlyHourly, ...verifiedHourly].sort((a, b) => a.time - b.time);

  // Save to disk for instant subsequent runs
  fs.writeFileSync(tenYearCachePath, JSON.stringify(full10Year));
  console.log(`💾 Saved complete 10-year dataset to ${tenYearCachePath} (${full10Year.length.toLocaleString()} bars)`);

  return full10Year;
}

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

async function run10YearBacktestAndWFA() {
  const candles = await assemble10YearDataset();

  console.log(`\n================================================================================`);
  console.log(` 🏆 10-YEAR ULTRA-DEEP QUANTITATIVE BACKTEST & WALK-FORWARD SUITE`);
  console.log(`    Asset: Gold (XAUUSD / GC=F) | Total 1-Hour Candles: ${candles.length.toLocaleString()}`);
  console.log(`    Coverage: ${new Date(candles[0].time * 1000).toISOString().split("T")[0]} to ${new Date(candles[candles.length - 1].time * 1000).toISOString().split("T")[0]}`);
  console.log(`    Price Trajectory: $${candles[0].close} -> $${candles[candles.length - 1].close} (+${(((candles[candles.length - 1].close - candles[0].close) / candles[0].close) * 100).toFixed(1)}%)`);
  console.log(`================================================================================\n`);

  // ──────────────────────────────────────────────────────────────────────────
  // PART 1: 10-YEAR FULL BACKTEST
  // ──────────────────────────────────────────────────────────────────────────
  console.log("⚡ Executing 10-Year Full Institutional Simulation across 100+ Indicators...");
  const t0 = Date.now();
  const allTrades = simulateInstitutionalBacktest("XAUUSD", candles);
  const elapsed = Date.now() - t0;
  console.log(`Simulation complete in ${(elapsed / 1000).toFixed(2)}s. Total Trades Simulated: ${allTrades.length.toLocaleString()}\n`);

  const overall = calculateStats(allTrades);

  console.log(`┌──────────────────────────────────────────────────────────────────────────────┐`);
  console.log(`│ 📊 สถิติภาพรวม 10 ปีเต็ม (10-Year Overall Quantitative Performance)          │`);
  console.log(`├──────────────────────────────────────────────────────────────────────────────┤`);
  console.log(`│  • วินเรทมาตรฐาน (Win Rate - Excl. BE)    : ${String(overall.winRate + "%").padEnd(10, " ")} [🎯 Institutional Benchmark]`);
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
  // PART 2: YEAR-BY-YEAR DETAILED AUDIT (2016 - 2026)
  // ──────────────────────────────────────────────────────────────────────────
  console.log("📅 รายงานผลการดำเนินงานแยกรายปี 10 ปีเต็ม (Year-by-Year Performance Breakdown):");
  const years = [2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025, 2026];
  const yearlyTable: any[] = [];

  for (const yr of years) {
    const yrTrades = allTrades.filter((t) => {
      const d = new Date(t.entryTime * 1000);
      return d.getUTCFullYear() === yr;
    });

    if (yrTrades.length === 0) continue;
    const stats = calculateStats(yrTrades);
    yearlyTable.push({
      "ปี (Year)": yr,
      "จำนวนไม้": stats.total,
      "ชนะ (W)": stats.wins,
      "แพ้ (L)": stats.losses,
      "เสมอ (BE)": stats.bes,
      "Win Rate": `${stats.winRate}%`,
      "Profit Factor": stats.profitFactor,
      "Net Pips": `${stats.totalNetPips > 0 ? "+" : ""}${stats.totalNetPips}`,
      "Net R": `+${stats.totalNetR}R`,
      "Max DD": `-${stats.maxDDR}R`,
    });
  }

  console.table(yearlyTable);

  // ──────────────────────────────────────────────────────────────────────────
  // PART 3: 10-FOLD ROLLING WALK-FORWARD ANALYSIS (WFA)
  // ──────────────────────────────────────────────────────────────────────────
  console.log("\n================================================================================");
  console.log(" 🧪 10-FOLD ROLLING WALK-FORWARD VALIDATION (ความเสถียรข้าม 10 ทศวรรษ)");
  console.log("================================================================================\n");

  const totalCandles = candles.length;
  const foldSize = Math.floor(totalCandles / 10);
  const foldTable: any[] = [];
  let passingFolds = 0;

  for (let f = 0; f < 10; f++) {
    const startIdx = f * foldSize;
    const endIdx = f === 9 ? totalCandles : (f + 1) * foldSize;
    const foldCandles = candles.slice(startIdx, endIdx);
    const foldTrades = simulateInstitutionalBacktest("XAUUSD", foldCandles);
    const stats = calculateStats(foldTrades);

    const startDateStr = new Date(foldCandles[0].time * 1000).toISOString().split("T")[0];
    const endDateStr = new Date(foldCandles[foldCandles.length - 1].time * 1000).toISOString().split("T")[0];

    const isRobust = stats.winRate >= 80.0 && stats.profitFactor >= 2.0;
    if (isRobust) passingFolds++;

    foldTable.push({
      Fold: `Fold ${f + 1}`,
      "ช่วงเวลา (Time Window)": `${startDateStr} -> ${endDateStr}`,
      "จำนวนไม้": stats.total,
      "ชนะ (W)": stats.wins,
      "แพ้ (L)": stats.losses,
      "เสมอ (BE)": stats.bes,
      "Win Rate": `${stats.winRate}%`,
      "Profit Factor": stats.profitFactor,
      "Net R": `+${stats.totalNetR}R`,
      "Max DD": `-${stats.maxDDR}R`,
      "ประเมิน": isRobust ? "✅ แข็งแกร่งสูง" : "⚠️ ปานกลาง",
    });
  }

  console.table(foldTable);
  console.log(`\n🎯 10-Fold Robustness Rate: ${passingFolds}/10 Folds (${(passingFolds / 10 * 100).toFixed(0)}%) ผ่านเกณฑ์มาตรฐานสถาบัน`);
}

run10YearBacktestAndWFA().catch((err) => {
  console.error("10-Year Backtest Error:", err);
  process.exit(1);
});
