import * as fs from "fs";
import * as path from "path";
import { Candle, BacktestTrade } from "../lib/types";
import { getMarketCandles, simulateInstitutionalBacktest } from "../lib/marketService";

interface SimulationResult {
  round: number;
  eaProfile: string;
  timeframe: string;
  phase: "BACKWARD (IS)" | "FORWARD (OOS)";
  trades: number;
  wins: number;
  losses: number;
  winRate: number;
  startBalance: number;
  finalBalance: number;
  netProfit: number;
  roiPct: number;
  maxDrawdownPct: number;
  profitFactor: number;
  survived: boolean;
}

interface EaConfig {
  name: string;
  allowedRegimes: ("TREND" | "BOX")[];
  maxSlPips: number;
  enableUsOpenFreeze: boolean;
  asianBoxHourEnd: number; // e.g. 14 (block 06:00 - 13:59)
  cooldownBars: number;
  enableFastTrackBE: boolean;
}

const EA_PROFILES: Record<string, (tf: string) => EaConfig> = {
  "Sniper Scalper (M5/M15)": (tf: string) => ({
    name: "Sniper Scalper",
    allowedRegimes: ["TREND", "BOX"],
    maxSlPips: tf === "1h" ? 20.0 : 15.0,
    enableUsOpenFreeze: true,
    asianBoxHourEnd: 14,
    cooldownBars: 2,
    enableFastTrackBE: true,
  }),
  "SMC Pro Trend Surfer": (tf: string) => ({
    name: "SMC Pro Trend Surfer",
    allowedRegimes: ["TREND"],
    maxSlPips: tf === "1h" ? 22.0 : 18.0,
    enableUsOpenFreeze: false,
    asianBoxHourEnd: 0,
    cooldownBars: 2,
    enableFastTrackBE: false,
  }),
  "Range Box S/R Scalper": (tf: string) => ({
    name: "Range Box S/R Scalper",
    allowedRegimes: ["BOX"],
    maxSlPips: tf === "1h" ? 22.0 : 15.0,
    enableUsOpenFreeze: false,
    asianBoxHourEnd: 14, // Asian + Pre-London Shield active
    cooldownBars: 1,
    enableFastTrackBE: true,
  }),
  "Aegis Multi-Regime Unified EA": (tf: string) => ({
    name: "Aegis Multi-Regime Unified EA",
    allowedRegimes: ["TREND", "BOX"],
    maxSlPips: tf === "1h" ? 22.0 : 15.0,
    enableUsOpenFreeze: tf === "5m" || tf === "15m",
    asianBoxHourEnd: 14,
    cooldownBars: 2,
    enableFastTrackBE: true,
  }),
};

function runEaSimulation(
  trades: BacktestTrade[],
  tf: string,
  config: EaConfig,
  startBalance: number = 10.0
): {
  total: number;
  wins: number;
  losses: number;
  winRate: number;
  finalBalance: number;
  netProfit: number;
  roiPct: number;
  maxDrawdownPct: number;
  profitFactor: number;
  survived: boolean;
} {
  let bal = startBalance;
  let peak = startBalance;
  let maxDD = 0.0;
  let wins = 0;
  let losses = 0;
  let grossProfit = 0;
  let grossLoss = 0;
  let lastLossSec = 0;

  for (const t of trades) {
    // 0. Filter Allowed Regimes
    if (!t.regime || !config.allowedRegimes.includes(t.regime)) {
      continue;
    }

    const d = new Date(t.entryTime > 1e11 ? t.entryTime : t.entryTime * 1000);
    const thaiHour = (d.getUTCHours() + 7) % 24;
    const thaiMin = d.getUTCMinutes();
    const entrySec = t.entryTime > 1e11 ? Math.floor(t.entryTime / 1000) : t.entryTime;

    // 1. US Open Volatility Freeze (20:25 - 21:45 Thai Time)
    if (config.enableUsOpenFreeze && ((thaiHour === 20 && thaiMin >= 25) || (thaiHour === 21 && thaiMin <= 45))) {
      continue;
    }

    // 2. Asian & Pre-London Transition Box Shield (06:00 - 13:59 Thai Time)
    if (t.regime === "BOX" && thaiHour >= 6 && thaiHour < config.asianBoxHourEnd) {
      continue;
    }

    // 3. Post-Loss Cooldown (2 bars)
    if (config.cooldownBars > 0 && lastLossSec > 0) {
      const barSec = tf === "5m" ? 300 : tf === "15m" ? 900 : 3600;
      if (entrySec - lastLossSec < config.cooldownBars * barSec) {
        continue;
      }
    }

    let pips = t.pnlPips !== undefined && !isNaN(t.pnlPips)
      ? t.pnlPips
      : (t.type === "BUY" ? (t.exitPrice - t.entryPrice) : (t.entryPrice - t.exitPrice)) * 10;

    let isLoss = t.result === "LOSS" || pips < 0;

    // Hard-Cap Micro SL to prevent blowing $10 account
    if (isLoss && Math.abs(pips) > config.maxSlPips) {
      pips = -config.maxSlPips;
    }

    // Standard 0.01 lot size on $10 account (Pip value = $0.10 for XAUUSD)
    const lot = 0.01;
    let dollar = Number((lot * pips * 10.0).toFixed(2));
    if (isLoss && dollar > 0) dollar = -Math.abs(dollar);
    if (!isLoss && dollar < 0) dollar = Math.abs(dollar);

    bal = Number((bal + dollar).toFixed(2));
    if (bal < 0.10) bal = 0.0; // Stop out / blown account threshold
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
  const wr = total > 0 ? Number(((wins / total) * 100).toFixed(1)) : 100.0;
  const net = Number((bal - startBalance).toFixed(2));
  const roi = Number(((net / startBalance) * 100).toFixed(1));
  const pf = grossLoss > 0 ? Number((grossProfit / grossLoss).toFixed(2)) : 99.99;
  const survived = bal > 2.0; // Survived if account still has trading capital (> $2.00)

  return {
    total,
    wins,
    losses,
    winRate: wr,
    finalBalance: bal,
    netProfit: net,
    roiPct: roi,
    maxDrawdownPct: Number(maxDD.toFixed(1)),
    profitFactor: pf,
    survived,
  };
}

async function main() {
  console.log("==========================================================================================");
  console.log(" 🧪 5-ROUND WALK-FORWARD AUDIT: BACKWARD & FORWARD ACROSS ALL TFs & ALL EA PROFILES");
  console.log("    Capital Test: Starting at $10.00 USD | Fixed 0.01 Lot | Survived Threshold: > $2.00");
  console.log("==========================================================================================\n");

  // Load 1H 10-Year historical data (73,949 bars)
  const h1Path = path.resolve(process.cwd(), "data", "xauusd_1h_10year.json");
  const h1Candles: Candle[] = JSON.parse(fs.readFileSync(h1Path, "utf-8"));
  h1Candles.sort((a, b) => a.time - b.time);

  // Fetch 5M and 15M candles (1000 bars each)
  console.log("📡 Fetching latest 1000 bars for 5M and 15M...");
  const m5Candles = await getMarketCandles("XAUUSD", "5m");
  m5Candles.sort((a, b) => a.time - b.time);
  const m15Candles = await getMarketCandles("XAUUSD", "15m");
  m15Candles.sort((a, b) => a.time - b.time);

  console.log(`✅ Loaded: 5M (${m5Candles.length} bars), 15M (${m15Candles.length} bars), 1H (${h1Candles.length} bars)\n`);

  const allResults: SimulationResult[] = [];

  const timeframes = [
    { name: "5m", candles: m5Candles },
    { name: "15m", candles: m15Candles },
    { name: "1h", candles: h1Candles },
  ];

  // Run 5 Rounds of Walk-Forward across all TFs and EAs
  // For each TF, we create 5 distinct temporal folds / rolling windows:
  // In each Round (1 to 5):
  //   - Window A: Backward (In-Sample 70%)
  //   - Window B: Forward (Out-of-Sample 30%)
  for (const tfObj of timeframes) {
    const tf = tfObj.name;
    const candles = tfObj.candles;
    const totalBars = candles.length;
    const foldSize = Math.floor(totalBars / 5);

    console.log(`------------------------------------------------------------------------------------------`);
    console.log(` ▶️ EVALUATING TIMEFRAME: ${tf.toUpperCase()} (${totalBars} bars, Fold size: ${foldSize} bars)`);
    console.log(`------------------------------------------------------------------------------------------`);

    for (let round = 1; round <= 5; round++) {
      // 5 Rolling / Segmented Slices:
      // Slice `round`: from startIdx to endIdx
      const startIdx = (round - 1) * foldSize;
      const endIdx = round === 5 ? totalBars : round * foldSize;
      const roundCandles = candles.slice(startIdx, endIdx);

      // Split 70% In-Sample (Backward) and 30% Out-of-Sample (Forward)
      const isSplit = Math.floor(roundCandles.length * 0.70);
      const isCandles = roundCandles.slice(0, isSplit);
      const oosCandles = roundCandles.slice(isSplit);

      // Generate institutional trades
      const isTrades = simulateInstitutionalBacktest("XAUUSD", isCandles);
      const oosTrades = simulateInstitutionalBacktest("XAUUSD", oosCandles);

      // Test all EA Profiles
      for (const [eaKey, eaBuilder] of Object.entries(EA_PROFILES)) {
        const config = eaBuilder(tf);

        // Run Backward (In-Sample)
        const isRes = runEaSimulation(isTrades, tf, config, 10.0);
        allResults.push({
          round,
          eaProfile: config.name,
          timeframe: tf.toUpperCase(),
          phase: "BACKWARD (IS)",
          trades: isRes.total,
          wins: isRes.wins,
          losses: isRes.losses,
          winRate: isRes.winRate,
          startBalance: 10.0,
          finalBalance: isRes.finalBalance,
          netProfit: isRes.netProfit,
          roiPct: isRes.roiPct,
          maxDrawdownPct: isRes.maxDrawdownPct,
          profitFactor: isRes.profitFactor,
          survived: isRes.survived,
        });

        // Run Forward (Out-of-Sample)
        const oosRes = runEaSimulation(oosTrades, tf, config, 10.0);
        allResults.push({
          round,
          eaProfile: config.name,
          timeframe: tf.toUpperCase(),
          phase: "FORWARD (OOS)",
          trades: oosRes.total,
          wins: oosRes.wins,
          losses: oosRes.losses,
          winRate: oosRes.winRate,
          startBalance: 10.0,
          finalBalance: oosRes.finalBalance,
          netProfit: oosRes.netProfit,
          roiPct: oosRes.roiPct,
          maxDrawdownPct: oosRes.maxDrawdownPct,
          profitFactor: oosRes.profitFactor,
          survived: oosRes.survived,
        });
      }
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // REPORT 1: Summary by Timeframe & EA (Averaged across all 5 Rounds)
  // ──────────────────────────────────────────────────────────────────────────
  console.log("\n==========================================================================================");
  console.log(" 📊 5-ROUND SUMMARY TABLE: PERFORMANCE & $10 SURVIVAL RATE BY TF & EA");
  console.log("==========================================================================================");

  const summaryMap: Record<string, {
    tf: string;
    ea: string;
    isTrades: number;
    isWins: number;
    isWinRateSum: number;
    isNetSum: number;
    isMaxDDSum: number;
    isSurvCount: number;
    oosTrades: number;
    oosWins: number;
    oosWinRateSum: number;
    oosNetSum: number;
    oosMaxDDSum: number;
    oosSurvCount: number;
    count: number;
  }> = {};

  for (const r of allResults) {
    const key = `${r.timeframe}__${r.eaProfile}`;
    if (!summaryMap[key]) {
      summaryMap[key] = {
        tf: r.timeframe,
        ea: r.eaProfile,
        isTrades: 0,
        isWins: 0,
        isWinRateSum: 0,
        isNetSum: 0,
        isMaxDDSum: 0,
        isSurvCount: 0,
        oosTrades: 0,
        oosWins: 0,
        oosWinRateSum: 0,
        oosNetSum: 0,
        oosMaxDDSum: 0,
        oosSurvCount: 0,
        count: 0,
      };
    }

    if (r.phase === "BACKWARD (IS)") {
      summaryMap[key].isTrades += r.trades;
      summaryMap[key].isWins += r.wins;
      summaryMap[key].isWinRateSum += r.winRate;
      summaryMap[key].isNetSum += r.netProfit;
      summaryMap[key].isMaxDDSum += r.maxDrawdownPct;
      if (r.survived) summaryMap[key].isSurvCount++;
      summaryMap[key].count++;
    } else {
      summaryMap[key].oosTrades += r.trades;
      summaryMap[key].oosWins += r.wins;
      summaryMap[key].oosWinRateSum += r.winRate;
      summaryMap[key].oosNetSum += r.netProfit;
      summaryMap[key].oosMaxDDSum += r.maxDrawdownPct;
      if (r.survived) summaryMap[key].oosSurvCount++;
    }
  }

  const tableRows = Object.values(summaryMap).map((m) => {
    const rounds = m.count;
    const avgIsWR = (m.isWinRateSum / rounds).toFixed(1);
    const avgIsNet = (m.isNetSum / rounds).toFixed(2);
    const avgIsDD = (m.isMaxDDSum / rounds).toFixed(1);
    const isSurvPct = ((m.isSurvCount / rounds) * 100).toFixed(0);

    const avgOosWR = (m.oosWinRateSum / rounds).toFixed(1);
    const avgOosNet = (m.oosNetSum / rounds).toFixed(2);
    const avgOosDD = (m.oosMaxDDSum / rounds).toFixed(1);
    const oosSurvPct = ((m.oosSurvCount / rounds) * 100).toFixed(0);

    return {
      TF: m.tf,
      "EA Profile": m.ea,
      "Backward WR": `${avgIsWR}% (${m.isWins}/${m.isTrades})`,
      "Backward Net": `+$${avgIsNet}`,
      "Backward DD": `-${avgIsDD}%`,
      "Forward WR": `${avgOosWR}% (${m.oosWins}/${m.oosTrades})`,
      "Forward Net": `+$${avgOosNet}`,
      "Forward DD": `-${avgOosDD}%`,
      "$10 Survival": `${oosSurvPct}% (${m.oosSurvCount}/${rounds} Rounds)`,
    };
  });

  console.table(tableRows);

  // ──────────────────────────────────────────────────────────────────────────
  // REPORT 2: Individual 5-Round Detailed Audit for Aegis Multi-Regime Unified EA
  // ──────────────────────────────────────────────────────────────────────────
  console.log("\n==========================================================================================");
  console.log(" 🔍 DEEP DIVE: AEGIS MULTI-REGIME UNIFIED EA ACROSS 5 INDIVIDUAL ROUNDS ($10 ACC)");
  console.log("==========================================================================================");

  const unifiedResults = allResults
    .filter((r) => r.eaProfile === "Aegis Multi-Regime Unified EA")
    .map((r) => ({
      Round: `R${r.round}`,
      TF: r.timeframe,
      Phase: r.phase,
      Trades: `${r.wins}/${r.trades}`,
      "Win Rate": `${r.winRate}%`,
      "Final Bal": `$${r.finalBalance.toFixed(2)}`,
      Profit: `${r.netProfit >= 0 ? "+" : ""}$${r.netProfit.toFixed(2)} (${r.roiPct >= 0 ? "+" : ""}${r.roiPct}%)`,
      "Max DD": `-${r.maxDrawdownPct}%`,
      PF: r.profitFactor,
      "$10 Survived": r.survived ? "✅ YES" : "❌ NO",
    }));

  console.table(unifiedResults);

  // ──────────────────────────────────────────────────────────────────────────
  // REPORT 3: Compounding $10 Account Growth Test (Sequential Carry-Over)
  // ──────────────────────────────────────────────────────────────────────────
  console.log("\n==========================================================================================");
  console.log(" 💰 SEQUENTIAL COMPOUNDING TEST: PUSHING $10 ACROSS ALL 5 CONSECUTIVE ROUNDS");
  console.log("    (Balance carries over from Round 1 -> 2 -> 3 -> 4 -> 5 on Forward OOS data)");
  console.log("==========================================================================================");

  for (const tfObj of timeframes) {
    const tf = tfObj.name;
    const candles = tfObj.candles;
    const totalBars = candles.length;
    const foldSize = Math.floor(totalBars / 5);

    let rollingBalance = 10.0;
    let peakBalance = 10.0;
    let maxOverallDD = 0.0;
    let totalWins = 0;
    let totalTrades = 0;

    console.log(`\n--- Sequential Forward Compounding on ${tf.toUpperCase()} ---`);

    for (let round = 1; round <= 5; round++) {
      const startIdx = (round - 1) * foldSize;
      const endIdx = round === 5 ? totalBars : round * foldSize;
      const roundCandles = candles.slice(startIdx, endIdx);
      const isSplit = Math.floor(roundCandles.length * 0.70);
      const oosCandles = roundCandles.slice(isSplit);
      const oosTrades = simulateInstitutionalBacktest("XAUUSD", oosCandles);

      const config = EA_PROFILES["Aegis Multi-Regime Unified EA"](tf);
      const roundRes = runEaSimulation(oosTrades, tf, config, rollingBalance);

      const prevBal = rollingBalance;
      rollingBalance = roundRes.finalBalance;
      totalWins += roundRes.wins;
      totalTrades += roundRes.total;

      if (rollingBalance > peakBalance) peakBalance = rollingBalance;
      const curDD = peakBalance > 0 ? ((peakBalance - rollingBalance) / peakBalance) * 100 : 0;
      if (curDD > maxOverallDD) maxOverallDD = curDD;

      console.log(
        `  Round ${round}: Start: $${prevBal.toFixed(2)} | Trades: ${roundRes.wins}/${roundRes.total} (${roundRes.winRate}%) | End: $${rollingBalance.toFixed(2)} (${rollingBalance >= prevBal ? "+" : ""}$${(rollingBalance - prevBal).toFixed(2)}) | MaxDD: -${roundRes.maxDrawdownPct}%`
      );
    }

    const totalRoi = Number((((rollingBalance - 10.0) / 10.0) * 100).toFixed(1));
    const overallWR = totalTrades > 0 ? Number(((totalWins / totalTrades) * 100).toFixed(1)) : 100.0;

    console.log(`  🏆 [${tf.toUpperCase()} RESULT]: Initial: $10.00 -> Final Balance: $${rollingBalance.toFixed(2)} | Total ROI: +${totalRoi}% | Total WR: ${overallWR}% | Max Overall DD: -${maxOverallDD.toFixed(1)}% | Status: ${rollingBalance > 10.0 ? "🎉 SURVIVED & SCALED" : "⚠️ FAILED"}`);
  }
}

main().catch(console.error);
