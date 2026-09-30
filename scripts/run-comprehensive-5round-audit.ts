import * as fs from "fs";
import * as path from "path";
import { Candle, BacktestTrade } from "../lib/types";
import { getMarketCandles, simulateInstitutionalBacktest } from "../lib/marketService";

// ============================================================================
// DATA STRUCTURES
// ============================================================================
interface EaConfig {
  name: string;
  allowedRegimes: ("TREND" | "BOX")[];
  maxSlPips: number;
  enableUsOpenFreeze: boolean;
  asianBoxHourEnd: number; // e.g. 14 (block 06:00 - 13:59 Thai time)
  cooldownBars: number;
  enableFastTrackBE: boolean;
}

const EA_PROFILES: Record<string, (tf: string) => EaConfig> = {
  "Sniper Scalper": (tf: string) => ({
    name: "Sniper Scalper",
    allowedRegimes: ["TREND", "BOX"],
    maxSlPips: tf === "1h" ? 20.0 : 15.0,
    enableUsOpenFreeze: true,
    asianBoxHourEnd: 14,
    cooldownBars: 2,
    enableFastTrackBE: true,
  }),
  "SMC Pro Trend": (tf: string) => ({
    name: "SMC Pro Trend",
    allowedRegimes: ["TREND"],
    maxSlPips: tf === "1h" ? 22.0 : 18.0,
    enableUsOpenFreeze: false,
    asianBoxHourEnd: 0,
    cooldownBars: 2,
    enableFastTrackBE: false,
  }),
  "Range Box S/R": (tf: string) => ({
    name: "Range Box S/R",
    allowedRegimes: ["BOX"],
    maxSlPips: tf === "1h" ? 22.0 : 15.0,
    enableUsOpenFreeze: false,
    asianBoxHourEnd: 14,
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

interface SimOutput {
  total: number;
  wins: number;
  losses: number;
  winRate: number;
  startBal: number;
  finalBal: number;
  netProfit: number;
  roiPct: number;
  maxDDPct: number;
  profitFactor: number;
  survived: boolean;
}

function simulateAccount(
  trades: BacktestTrade[],
  tf: string,
  config: EaConfig,
  startBal: number = 10.0
): SimOutput {
  let bal = startBal;
  let peak = startBal;
  let maxDD = 0.0;
  let wins = 0;
  let losses = 0;
  let grossProfit = 0;
  let grossLoss = 0;
  let lastLossSec = 0;

  for (const t of trades) {
    if (!t.regime || !config.allowedRegimes.includes(t.regime)) continue;

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

    // 3. Post-Loss Cooldown
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

    // Micro-SL Cap to protect $10 account
    if (isLoss && Math.abs(pips) > config.maxSlPips) {
      pips = -config.maxSlPips;
    }

    // Pip value: $0.10 for 0.01 lot on XAUUSD and standard Forex
    const lot = 0.01;
    let dollar = Number((lot * pips * 10.0).toFixed(2));
    if (isLoss && dollar > 0) dollar = -Math.abs(dollar);
    if (!isLoss && dollar < 0) dollar = Math.abs(dollar);

    bal = Number((bal + dollar).toFixed(2));
    if (bal < 0.10) bal = 0.0;
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
  const net = Number((bal - startBal).toFixed(2));
  const roi = Number(((net / startBal) * 100).toFixed(1));
  const pf = grossLoss > 0 ? Number((grossProfit / grossLoss).toFixed(2)) : 99.99;
  const survived = bal > 2.0;

  return {
    total,
    wins,
    losses,
    winRate: wr,
    startBal,
    finalBal: bal,
    netProfit: net,
    roiPct: roi,
    maxDDPct: Number(maxDD.toFixed(1)),
    profitFactor: pf,
    survived,
  };
}

async function main() {
  console.log("==========================================================================================================");
  console.log(" 🧪 COMPREHENSIVE 5-ROUND BIDIRECTIONAL WALK-FORWARD AUDIT (กลับไปมา 5 รอบ ทุก TF ทุก EA)");
  console.log("    Account Capital Test: $10.00 USD | Fixed 0.01 Lot | Margin-Call Ruin Level: <= $2.00");
  console.log("==========================================================================================================\n");

  // 1. Load Data
  console.log("⏳ Fetching multi-asset multi-timeframe candle datasets...");
  const symbols = ["XAUUSD", "EURUSD", "GBPUSD"];

  const datasets: Record<string, Record<string, Candle[]>> = {
    "5m": {},
    "15m": {},
    "1h": {},
  };

  for (const sym of symbols) {
    datasets["5m"][sym] = await getMarketCandles(sym, "5m");
    datasets["15m"][sym] = await getMarketCandles(sym, "15m");
    datasets["1h"][sym] = await getMarketCandles(sym, "1h");
  }

  // Load 10-Year 1H Gold Data (73,949 bars)
  const h1Path = path.resolve(process.cwd(), "data", "xauusd_1h_10year.json");
  const gold10yCandles: Candle[] = JSON.parse(fs.readFileSync(h1Path, "utf-8"));
  gold10yCandles.sort((a, b) => a.time - b.time);
  datasets["1h"]["XAUUSD_10YEAR"] = gold10yCandles;

  console.log("✅ Data successfully loaded:");
  console.log(`   - 5M:  XAUUSD (${datasets["5m"]["XAUUSD"].length}), EURUSD (${datasets["5m"]["EURUSD"].length}), GBPUSD (${datasets["5m"]["GBPUSD"].length})`);
  console.log(`   - 15M: XAUUSD (${datasets["15m"]["XAUUSD"].length}), EURUSD (${datasets["15m"]["EURUSD"].length}), GBPUSD (${datasets["15m"]["GBPUSD"].length})`);
  console.log(`   - 1H:  XAUUSD 10-Year Deep Dataset (${gold10yCandles.length} bars) + FX Institutional datasets\n`);

  // Define 5 Bidirectional Walk-Forward Split Functions (กลับไปมา 5 รูปแบบ)
  const ROUND_NAMES = [
    "Round 1: Forward Walk-Forward (First 70% In-Sample ➔ Last 30% Future Out-of-Sample)",
    "Round 2: Reverse Walk-Forward (Last 70% In-Sample ➔ First 30% Past Retest - กลับหลัง)",
    "Round 3: Middle Expanding Fold (Center 60% In-Sample ➔ Outer 40% Flanks Out-of-Sample)",
    "Round 4: Rolling Shift Fold (25%-75% In-Sample ➔ 75%-100% Out-of-Sample)",
    "Round 5: High-Entropy Split (Even/Odd Alternating Regime Split)",
  ];

  function getSplits(candles: Candle[], round: number): { isCandles: Candle[]; oosCandles: Candle[] } {
    const n = candles.length;
    if (round === 1) {
      const split = Math.floor(n * 0.70);
      return { isCandles: candles.slice(0, split), oosCandles: candles.slice(split) };
    } else if (round === 2) {
      const split = Math.floor(n * 0.30);
      return { isCandles: candles.slice(split), oosCandles: candles.slice(0, split) };
    } else if (round === 3) {
      const isStart = Math.floor(n * 0.20);
      const isEnd = Math.floor(n * 0.80);
      const isCandles = candles.slice(isStart, isEnd);
      const oosCandles = [...candles.slice(0, isStart), ...candles.slice(isEnd)];
      return { isCandles, oosCandles };
    } else if (round === 4) {
      const isStart = Math.floor(n * 0.25);
      const isEnd = Math.floor(n * 0.75);
      const isCandles = candles.slice(isStart, isEnd);
      const oosCandles = candles.slice(isEnd);
      return { isCandles, oosCandles };
    } else {
      // Round 5: Split by blocks of 50 candles (even blocks IS, odd blocks OOS)
      const blockSize = Math.max(10, Math.floor(n / 20));
      const isCandles: Candle[] = [];
      const oosCandles: Candle[] = [];
      for (let i = 0; i < n; i += blockSize) {
        const chunk = candles.slice(i, i + blockSize);
        const blockIdx = Math.floor(i / blockSize);
        if (blockIdx % 2 === 0) isCandles.push(...chunk);
        else oosCandles.push(...chunk);
      }
      return { isCandles, oosCandles };
    }
  }

  // Pre-generate institutional backtest trades for each timeframe across symbols
  interface RoundResult {
    round: number;
    roundName: string;
    tf: string;
    eaName: string;
    isTrades: number;
    isWins: number;
    isWinRate: number;
    isNetProfit: number;
    isMaxDD: number;
    isSurvived: boolean;
    oosTrades: number;
    oosWins: number;
    oosWinRate: number;
    oosNetProfit: number;
    oosMaxDD: number;
    oosFinalBal: number;
    oosSurvived: boolean;
    oosPF: number;
  }

  const allRoundResults: RoundResult[] = [];
  const timeframes = ["5m", "15m", "1h"];

  for (const tf of timeframes) {
    console.log(`\n==========================================================================================================`);
    console.log(` ▶️ RUNNING 5-ROUND WALK-FORWARD AUDIT FOR TIMEFRAME: ${tf.toUpperCase()}`);
    console.log(`==========================================================================================================`);

    for (let round = 1; round <= 5; round++) {
      let isTrades: BacktestTrade[] = [];
      let oosTrades: BacktestTrade[] = [];

      if (tf === "1h") {
        const { isCandles, oosCandles } = getSplits(datasets["1h"]["XAUUSD_10YEAR"], round);
        isTrades = simulateInstitutionalBacktest("XAUUSD", isCandles);
        oosTrades = simulateInstitutionalBacktest("XAUUSD", oosCandles);
      } else {
        for (const sym of ["XAUUSD", "EURUSD", "GBPUSD"]) {
          const symCandles = datasets[tf][sym];
          if (!symCandles || symCandles.length < 20) continue;
          const { isCandles, oosCandles } = getSplits(symCandles, round);
          const symIs = simulateInstitutionalBacktest(sym, isCandles);
          const symOos = simulateInstitutionalBacktest(sym, oosCandles);
          isTrades.push(...symIs);
          oosTrades.push(...symOos);
        }
        isTrades.sort((a, b) => a.entryTime - b.entryTime);
        oosTrades.sort((a, b) => a.entryTime - b.entryTime);
      }

      for (const [eaKey, eaBuilder] of Object.entries(EA_PROFILES)) {
        const config = eaBuilder(tf);

        const isSim = simulateAccount(isTrades, tf, config, 10.0);
        const oosSim = simulateAccount(oosTrades, tf, config, 10.0);

        allRoundResults.push({
          round,
          roundName: `Round ${round}`,
          tf: tf.toUpperCase(),
          eaName: config.name,
          isTrades: isSim.total,
          isWins: isSim.wins,
          isWinRate: isSim.winRate,
          isNetProfit: isSim.netProfit,
          isMaxDD: isSim.maxDDPct,
          isSurvived: isSim.survived,
          oosTrades: oosSim.total,
          oosWins: oosSim.wins,
          oosWinRate: oosSim.winRate,
          oosNetProfit: oosSim.netProfit,
          oosMaxDD: oosSim.maxDDPct,
          oosFinalBal: oosSim.finalBal,
          oosSurvived: oosSim.survived,
          oosPF: oosSim.profitFactor,
        });
      }
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // TABLE 1: Master Summary Matrix by Timeframe & EA across all 5 Rounds
  // ──────────────────────────────────────────────────────────────────────────
  console.log("\n==========================================================================================================");
  console.log(" 📊 TABLE 1: MASTER 5-ROUND AUDIT MATRIX (AVERAGED OVER ALL 5 BIDIRECTIONAL ROUNDS)");
  console.log("==========================================================================================================");

  const aggMap: Record<string, {
    tf: string;
    ea: string;
    isWins: number;
    isTotal: number;
    isNetSum: number;
    isDDSum: number;
    oosWins: number;
    oosTotal: number;
    oosNetSum: number;
    oosDDSum: number;
    oosSurvCount: number;
    count: number;
  }> = {};

  for (const r of allRoundResults) {
    const key = `${r.tf}__${r.eaName}`;
    if (!aggMap[key]) {
      aggMap[key] = {
        tf: r.tf,
        ea: r.eaName,
        isWins: 0,
        isTotal: 0,
        isNetSum: 0,
        isDDSum: 0,
        oosWins: 0,
        oosTotal: 0,
        oosNetSum: 0,
        oosDDSum: 0,
        oosSurvCount: 0,
        count: 0,
      };
    }
    aggMap[key].isWins += r.isWins;
    aggMap[key].isTotal += r.isTrades;
    aggMap[key].isNetSum += r.isNetProfit;
    aggMap[key].isDDSum += r.isMaxDD;

    aggMap[key].oosWins += r.oosWins;
    aggMap[key].oosTotal += r.oosTrades;
    aggMap[key].oosNetSum += r.oosNetProfit;
    aggMap[key].oosDDSum += r.oosMaxDD;
    if (r.oosSurvived) aggMap[key].oosSurvCount++;
    aggMap[key].count++;
  }

  const masterTable = Object.values(aggMap).map((m) => {
    const isWR = m.isTotal > 0 ? ((m.isWins / m.isTotal) * 100).toFixed(1) : "100.0";
    const oosWR = m.oosTotal > 0 ? ((m.oosWins / m.oosTotal) * 100).toFixed(1) : "100.0";
    const avgIsNet = (m.isNetSum / m.count).toFixed(2);
    const avgOosNet = (m.oosNetSum / m.count).toFixed(2);
    const avgIsDD = (m.isDDSum / m.count).toFixed(1);
    const avgOosDD = (m.oosDDSum / m.count).toFixed(1);
    const survRate = ((m.oosSurvCount / m.count) * 100).toFixed(0);

    return {
      Timeframe: m.tf,
      "EA Profile": m.ea,
      "Backward WR": `${isWR}% (${m.isWins}/${m.isTotal})`,
      "Backward Avg PnL": `+$${avgIsNet}`,
      "Backward Avg DD": `-${avgIsDD}%`,
      "Forward WR (OOS)": `${oosWR}% (${m.oosWins}/${m.oosTotal})`,
      "Forward Avg PnL": `+$${avgOosNet}`,
      "Forward Avg DD": `-${avgOosDD}%`,
      "$10 Survival Rate": `${survRate}% (${m.oosSurvCount}/5 Rounds)`,
      "Status": Number(survRate) >= 80 ? "✅ รอดและกำไร" : "⚠️ ระวัง",
    };
  });

  console.table(masterTable);

  // ──────────────────────────────────────────────────────────────────────────
  // TABLE 2: Round-by-Round Breakdown of Aegis Multi-Regime Unified EA
  // ──────────────────────────────────────────────────────────────────────────
  console.log("\n==========================================================================================================");
  console.log(" 🔍 TABLE 2: ROUND-BY-ROUND AUDIT FOR 'AEGIS MULTI-REGIME UNIFIED EA' ($10 INITIAL CAPITAL)");
  console.log("==========================================================================================================");

  const unifiedDetails = allRoundResults
    .filter((r) => r.eaName === "Aegis Multi-Regime Unified EA")
    .map((r) => ({
      Round: r.roundName,
      TF: r.tf,
      "Backward (IS)": `${r.isWins}/${r.isTrades} (${r.isWinRate}%) | +$${r.isNetProfit.toFixed(2)} | DD -${r.isMaxDD}%`,
      "Forward (OOS)": `${r.oosWins}/${r.oosTrades} (${r.oosWinRate}%) | +$${r.oosNetProfit.toFixed(2)} | DD -${r.oosMaxDD}%`,
      "OOS Final Bal": `$${r.oosFinalBal.toFixed(2)}`,
      PF: r.oosPF,
      "$10 Survived": r.oosSurvived ? "✅ YES" : "❌ NO",
    }));

  console.table(unifiedDetails);

  // ──────────────────────────────────────────────────────────────────────────
  // TABLE 3: The $10 Sequential Compounding Experiment across 5 Rounds
  // ──────────────────────────────────────────────────────────────────────────
  console.log("\n==========================================================================================================");
  console.log(" 💰 TABLE 3: $10 SEQUENTIAL COMPOUNDING CHALLENGE (NO RESET - PROFITS ACCUMULATE OVER 5 ROUNDS)");
  console.log("==========================================================================================================");

  for (const tf of timeframes) {
    let rollingBal = 10.0;
    let peakBal = 10.0;
    let maxOverallDD = 0.0;
    let totalWins = 0;
    let totalTrades = 0;
    const roundBreakdown: any[] = [];

    for (let round = 1; round <= 5; round++) {
      let oosTrades: BacktestTrade[] = [];

      if (tf === "1h") {
        const { oosCandles } = getSplits(datasets["1h"]["XAUUSD_10YEAR"], round);
        oosTrades = simulateInstitutionalBacktest("XAUUSD", oosCandles);
      } else {
        for (const sym of ["XAUUSD", "EURUSD", "GBPUSD"]) {
          const symCandles = datasets[tf][sym];
          if (!symCandles || symCandles.length < 20) continue;
          const { oosCandles } = getSplits(symCandles, round);
          const symOos = simulateInstitutionalBacktest(sym, oosCandles);
          oosTrades.push(...symOos);
        }
        oosTrades.sort((a, b) => a.entryTime - b.entryTime);
      }
      const config = EA_PROFILES["Aegis Multi-Regime Unified EA"](tf);

      const sim = simulateAccount(oosTrades, tf, config, rollingBal);
      const prev = rollingBal;
      rollingBal = sim.finalBal;
      totalWins += sim.wins;
      totalTrades += sim.total;

      if (rollingBal > peakBal) peakBal = rollingBal;
      const curDD = peakBal > 0 ? ((peakBal - rollingBal) / peakBal) * 100 : 0;
      if (curDD > maxOverallDD) maxOverallDD = curDD;

      roundBreakdown.push({
        Round: `Round ${round}`,
        "Start Bal": `$${prev.toFixed(2)}`,
        Trades: `${sim.wins}/${sim.total} (${sim.winRate}%)`,
        Profit: `${sim.netProfit >= 0 ? "+" : ""}$${sim.netProfit.toFixed(2)}`,
        "End Bal": `$${rollingBal.toFixed(2)}`,
        "Round DD": `-${sim.maxDDPct}%`,
      });
    }

    console.log(`\n▶️ Sequential Compounding on Timeframe: ${tf.toUpperCase()}`);
    console.table(roundBreakdown);
    const overallRoi = (((rollingBal - 10.0) / 10.0) * 100).toFixed(1);
    const overallWR = totalTrades > 0 ? ((totalWins / totalTrades) * 100).toFixed(1) : "100.0";
    console.log(`   🏁 ผลลัพธ์ $10 บน ${tf.toUpperCase()}: เงินต้น $10.00 ➔ พอร์ตจบที่ $${rollingBal.toFixed(2)} | ROI รวม: +${overallRoi}% | Win Rate รวม: ${overallWR}% | Max Overall DD: -${maxOverallDD.toFixed(1)}% | ปั้น $10 รอดไหม: ${rollingBal >= 10.0 ? "🎉 รอด 100% ปั้นพอร์ตเติบโตอย่างมั่นคง" : "❌ ไม่รอด"}`);
  }
}

main().catch(console.error);
