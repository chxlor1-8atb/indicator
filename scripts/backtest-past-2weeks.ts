import * as fs from "fs";
import * as path from "path";
import { Candle, BacktestTrade } from "../lib/types";
import { getMarketCandles, simulateInstitutionalBacktest } from "../lib/marketService";

interface BacktestConfig {
  symbol: string;
  timeframe: string;
  startingBalance: number;
}

async function testSymbolBacktest(symbol: string, timeframe: string, startingBalance: number = 10.0) {
  console.log(`=======================================================================`);
  console.log(` 📊 AUDITING 2-WEEK PERFORMANCE FOR: ${symbol} (${timeframe.toUpperCase()})`);
  console.log(`    Capital: $${startingBalance.toFixed(2)} USD | Mode: Market-Adaptive AutoLot`);
  console.log(`=======================================================================`);

  let candles: Candle[] = [];
  try {
    candles = await getMarketCandles(symbol, timeframe);
  } catch (err) {
    console.warn(`[-] Failed to fetch live candles for ${symbol}:`, err);
  }

  if (!candles || candles.length < 50) {
    console.log(`[!] Insufficient candle data (${candles ? candles.length : 0} bars) for ${symbol} on ${timeframe}.\n`);
    return { symbol, timeframe, trades: 0, wins: 0, losses: 0, netProfitUSD: 0, finalBalance: startingBalance, winRate: 0, maxDD: 0 };
  }

  candles.sort((a, b) => a.time - b.time);
  const latestCandle = candles[candles.length - 1];
  const latestTimeSec = latestCandle.time > 1e11 ? Math.floor(latestCandle.time / 1000) : latestCandle.time;
  const twoWeeksAgoSec = latestTimeSec - (14 * 24 * 3600);

  const latestDate = new Date(latestTimeSec * 1000);
  const twoWeeksAgoDate = new Date(twoWeeksAgoSec * 1000);

  console.log(`[*] Window: ${twoWeeksAgoDate.toLocaleDateString("th-TH")} to ${latestDate.toLocaleDateString("th-TH")}`);
  console.log(`    Latest Price: ${latestCandle.close} | Total Bars Available: ${candles.length}`);

  // Warmup buffer
  const warmupStartSec = twoWeeksAgoSec - (150 * 3600);
  const backtestCandles = candles.filter(c => {
    const t = c.time > 1e11 ? Math.floor(c.time / 1000) : c.time;
    return t >= warmupStartSec;
  });

  const allGeneratedTrades = simulateInstitutionalBacktest(symbol, backtestCandles);

  // Filter trades to past 14 days
  const twoWeekTrades = allGeneratedTrades.filter(t => {
    const tSec = t.entryTime > 1e11 ? Math.floor(t.entryTime / 1000) : t.entryTime;
    return tSec >= twoWeeksAgoSec && tSec <= latestTimeSec;
  });

  console.log(`[+] Setups in past 14 days: ${twoWeekTrades.length}\n`);

  if (twoWeekTrades.length === 0) {
    console.log(`[!] No trades triggered in this 14-day window for ${symbol}.\n`);
    return { symbol, timeframe, trades: 0, wins: 0, losses: 0, netProfitUSD: 0, finalBalance: startingBalance, winRate: 0, maxDD: 0 };
  }

  // Run simulation
  let balance = startingBalance;
  let peakBalance = startingBalance;
  let maxDD = 0.0;
  let wins = 0;
  let losses = 0;
  let totalGrossProfit = 0;
  let totalGrossLoss = 0;
  let winStreak = 0;

  const isGold = symbol.includes("XAU") || symbol.includes("GOLD");
  const isForex = !isGold && !symbol.includes("USDT") && !symbol.includes("BTC") && !symbol.includes("OIL");
  const isCrypto = symbol.includes("USDT") || symbol.includes("BTC");
  const pipMultiplier = isGold ? 10 : isCrypto ? 1 : symbol.includes("JPY") ? 100 : 10000;
  const pipValPerStdLot = isGold || isForex ? 10.0 : 1.0;

  for (let i = 0; i < twoWeekTrades.length; i++) {
    const t = twoWeekTrades[i];
    const entryDate = new Date(t.entryTime > 1e11 ? t.entryTime : t.entryTime * 1000);
    const thaiEntryStr = entryDate.toLocaleString("th-TH", { timeZone: "Asia/Bangkok", hour12: false });

    // Lot sizing logic
    let lot = 0.01;
    if (balance >= 100 && balance < 250) lot = 0.02;
    else if (balance >= 250 && balance < 500) lot = 0.04;
    else if (balance >= 500 && balance < 1000) lot = 0.08;
    else if (balance >= 1000) lot = Number((balance / 12000).toFixed(2));

    // Profit Martingale
    let streakMult = 1.0;
    if (winStreak === 1) streakMult = 1.5;
    else if (winStreak >= 2) streakMult = 2.0;

    if (balance >= 20.0) {
      lot = Number((lot * streakMult).toFixed(2));
    }

    const pips = t.pnlPips !== undefined && !isNaN(t.pnlPips)
      ? t.pnlPips
      : (t.type === "BUY" ? (t.exitPrice - t.entryPrice) : (t.entryPrice - t.exitPrice)) * pipMultiplier;

    // Dollar profit: lot * pips * (pipValPerStdLot / 10.0 or 1.0 depending on lot units)
    // 0.01 standard lot on gold: 1 pip ($0.10 price change) = $0.10.
    // pips * lot * 10.0:
    // If pips = 50, lot = 0.01 -> 50 * 0.01 * 10 = $5.00
    let dollarProfit = Number((lot * pips * pipValPerStdLot).toFixed(2));

    // Check if result is WIN/LOSS
    const isWin = t.result === "WIN" || (t.result === "BE" && dollarProfit >= 0) || dollarProfit > 0;
    if (t.result === "LOSS" && dollarProfit > 0) dollarProfit = -Math.abs(dollarProfit);
    if (t.result === "WIN" && dollarProfit < 0) dollarProfit = Math.abs(dollarProfit);

    balance = Number((balance + dollarProfit).toFixed(2));
    if (balance < 0.01) balance = 0.0;

    if (balance > peakBalance) peakBalance = balance;
    const dd = peakBalance > 0 ? ((peakBalance - balance) / peakBalance) * 100 : 0;
    if (dd > maxDD) maxDD = dd;

    if (isWin) {
      wins++;
      winStreak++;
      totalGrossProfit += dollarProfit;
    } else {
      losses++;
      winStreak = 0;
      totalGrossLoss += Math.abs(dollarProfit);
    }

    const badge = isWin ? "✅ WIN " : "❌ LOSS";
    console.log(
      `  #${(i + 1).toString().padStart(2, "0")} | ${thaiEntryStr} | ${t.type.padEnd(4)} | ` +
      `${t.entryPrice.toFixed(2)} -> ${t.exitPrice.toFixed(2)} | ` +
      `Lot: ${lot.toFixed(2)} | PnL: ${dollarProfit >= 0 ? "+" : ""}$${dollarProfit.toFixed(2)} (${pips >= 0 ? "+" : ""}${pips.toFixed(1)} p) | ` +
      `Bal: $${balance.toFixed(2)} | ${badge} [${t.regime || "TREND"}]`
    );
  }

  const winRate = twoWeekTrades.length > 0 ? (wins / twoWeekTrades.length) * 100 : 0;
  const netProfitUSD = Number((balance - startingBalance).toFixed(2));
  const netROI = Number(((netProfitUSD / startingBalance) * 100).toFixed(2));
  const profitFactor = totalGrossLoss > 0 ? Number((totalGrossProfit / totalGrossLoss).toFixed(2)) : (totalGrossProfit > 0 ? 99.99 : 0);

  console.log(`\n  -------------------------------------------------------------------`);
  console.log(`  • Summary for ${symbol} (${timeframe}):`);
  console.log(`    - Starting Balance: $${startingBalance.toFixed(2)} USD`);
  console.log(`    - Final Balance:    $${balance.toFixed(2)} USD`);
  console.log(`    - Net PnL:          ${netProfitUSD >= 0 ? "+" : ""}$${netProfitUSD.toFixed(2)} USD (${netROI >= 0 ? "+" : ""}${netROI.toFixed(1)}%)`);
  console.log(`    - Trades:           ${twoWeekTrades.length} (Wins: ${wins}, Losses: ${losses}) | WR: ${winRate.toFixed(1)}%`);
  console.log(`    - Max Drawdown:     -${maxDD.toFixed(1)}% | Profit Factor: ${profitFactor}`);
  console.log(`  -------------------------------------------------------------------\n`);

  return {
    symbol,
    timeframe,
    trades: twoWeekTrades.length,
    wins,
    losses,
    netProfitUSD,
    finalBalance: balance,
    winRate,
    maxDD,
  };
}

async function runPortfolioAudit() {
  console.log("=======================================================================");
  console.log("     AEGIS QUANT TERMINAL — 2-WEEK REAL-TIME MULTI-ASSET AUDIT");
  console.log("     Starting Capital: $10.00 USD (Non-Cent Standard Account)");
  console.log("=======================================================================\n");

  const results = [];

  // 1. Gold (XAUUSD 1H)
  results.push(await testSymbolBacktest("XAUUSD", "1h", 10.0));

  // 2. Gold (XAUUSD 15M)
  results.push(await testSymbolBacktest("XAUUSD", "15m", 10.0));

  // 3. Bitcoin (BTCUSDT 1H)
  results.push(await testSymbolBacktest("BTCUSDT", "1h", 10.0));

  // 4. EURUSD (1H)
  results.push(await testSymbolBacktest("EURUSD", "1h", 10.0));

  // 5. USDJPY (1H)
  results.push(await testSymbolBacktest("USDJPY", "1h", 10.0));

  // Multi-Symbol Combined Portfolio Simulation (One-Chart Multi-Symbol)
  console.log("=======================================================================");
  console.log(" 🌐 ONE-CHART MULTI-SYMBOL PORTFOLIO BACKTEST ($10 STARTING CAPITAL)");
  console.log("    (Trading Gold + Forex + Crypto simultaneously from one terminal)");
  console.log("=======================================================================");

  // Let's print out the comparison table
  console.table(results.map(r => ({
    Symbol: r.symbol,
    TF: r.timeframe,
    Trades: r.trades,
    Wins: r.wins,
    Losses: r.losses,
    "Win Rate": `${r.winRate.toFixed(1)}%`,
    "Net PnL": `${r.netProfitUSD >= 0 ? "+" : ""}$${r.netProfitUSD.toFixed(2)}`,
    "Final Bal": `$${r.finalBalance.toFixed(2)}`,
    "Max DD": `-${r.maxDD.toFixed(1)}%`,
  })));

  // Unified Chronological Simulation across all 4 core 1H assets
  console.log("\n=======================================================================");
  console.log(" 🚀 UNIFIED MULTI-ASSET ACCOUNT CHRONOLOGICAL SEQUENCE (1H)");
  console.log("    Assets: XAUUSD + BTCUSDT + EURUSD + USDJPY simultaneously");
  console.log("=======================================================================\n");

  const symbols = ["XAUUSD", "BTCUSDT", "EURUSD", "USDJPY"];
  interface EnrichedTrade extends BacktestTrade {
    symbol: string;
  }
  const allPortfolioTrades: EnrichedTrade[] = [];

  for (const sym of symbols) {
    try {
      const c = await getMarketCandles(sym, "1h");
      if (c && c.length >= 50) {
        c.sort((a, b) => a.time - b.time);
        const latestTimeSec = c[c.length - 1].time > 1e11 ? Math.floor(c[c.length - 1].time / 1000) : c[c.length - 1].time;
        const twoWeeksAgoSec = latestTimeSec - (14 * 24 * 3600);
        const warmupStartSec = twoWeeksAgoSec - (150 * 3600);
        const filtered = c.filter(x => {
          const t = x.time > 1e11 ? Math.floor(x.time / 1000) : x.time;
          return t >= warmupStartSec;
        });
        const trs = simulateInstitutionalBacktest(sym, filtered);
        for (const t of trs) {
          const tSec = t.entryTime > 1e11 ? Math.floor(t.entryTime / 1000) : t.entryTime;
          if (tSec >= twoWeeksAgoSec && tSec <= latestTimeSec) {
            allPortfolioTrades.push({ ...t, symbol: sym });
          }
        }
      }
    } catch {}
  }

  // Sort strictly by entryTime
  allPortfolioTrades.sort((a, b) => a.entryTime - b.entryTime);

  let pBalance = 10.0;
  let pPeak = 10.0;
  let pMaxDD = 0.0;
  let pWins = 0;
  let pLosses = 0;
  let pWinStreak = 0;

  for (let i = 0; i < allPortfolioTrades.length; i++) {
    const t = allPortfolioTrades[i];
    const isGold = t.symbol.includes("XAU") || t.symbol.includes("GOLD");
    const isCrypto = t.symbol.includes("USDT") || t.symbol.includes("BTC");
    const isForex = !isGold && !isCrypto;
    const pipMultiplier = isGold ? 10 : isCrypto ? 1 : t.symbol.includes("JPY") ? 100 : 10000;
    const pipValPerStdLot = isGold || isForex ? 10.0 : 1.0;

    let lot = 0.01;
    if (pBalance >= 100 && pBalance < 250) lot = 0.02;
    else if (pBalance >= 250 && pBalance < 500) lot = 0.04;
    else if (pBalance >= 500 && pBalance < 1000) lot = 0.08;
    else if (pBalance >= 1000) lot = Number((pBalance / 12000).toFixed(2));

    let streakMult = 1.0;
    if (pWinStreak === 1) streakMult = 1.5;
    else if (pWinStreak >= 2) streakMult = 2.0;
    if (pBalance >= 20.0) lot = Number((lot * streakMult).toFixed(2));

    const pips = t.pnlPips !== undefined && !isNaN(t.pnlPips)
      ? t.pnlPips
      : (t.type === "BUY" ? (t.exitPrice - t.entryPrice) : (t.entryPrice - t.exitPrice)) * pipMultiplier;

    let dollarProfit = Number((lot * pips * pipValPerStdLot).toFixed(2));
    const isWin = t.result === "WIN" || (t.result === "BE" && dollarProfit >= 0) || dollarProfit > 0;
    if (t.result === "LOSS" && dollarProfit > 0) dollarProfit = -Math.abs(dollarProfit);
    if (t.result === "WIN" && dollarProfit < 0) dollarProfit = Math.abs(dollarProfit);

    pBalance = Number((pBalance + dollarProfit).toFixed(2));
    if (pBalance < 0.01) pBalance = 0.0;
    if (pBalance > pPeak) pPeak = pBalance;
    const dd = pPeak > 0 ? ((pPeak - pBalance) / pPeak) * 100 : 0;
    if (dd > pMaxDD) pMaxDD = dd;

    if (isWin) {
      pWins++;
      pWinStreak++;
    } else {
      pLosses++;
      pWinStreak = 0;
    }

    const entryD = new Date(t.entryTime > 1e11 ? t.entryTime : t.entryTime * 1000);
    const dateStr = entryD.toLocaleString("th-TH", { timeZone: "Asia/Bangkok", hour12: false });
    const b = isWin ? "✅ WIN " : "❌ LOSS";

    console.log(
      `  [#${(i+1).toString().padStart(2, "0")}] ${dateStr} | ${t.symbol.padEnd(7)} | ${t.type.padEnd(4)} | ` +
      `Lot: ${lot.toFixed(2)} | PnL: ${dollarProfit >= 0 ? "+" : ""}$${dollarProfit.toFixed(2)} | ` +
      `Bal: $${pBalance.toFixed(2)} | ${b}`
    );
  }

  const pNetProfit = Number((pBalance - 10.0).toFixed(2));
  const pROI = Number(((pNetProfit / 10.0) * 100).toFixed(2));
  const pWR = allPortfolioTrades.length > 0 ? ((pWins / allPortfolioTrades.length) * 100).toFixed(1) : "0";

  console.log(`\n=======================================================================`);
  console.log(` 🏆 UNIFIED MULTI-ASSET PORTFOLIO RESULTS (2 WEEKS):`);
  console.log(`    • Starting Capital:     $10.00 USD`);
  console.log(`    • Final Balance:        $${pBalance.toFixed(2)} USD`);
  console.log(`    • Total Net Profit:     +$${pNetProfit.toFixed(2)} USD (+${pROI.toFixed(1)}% ROI)`);
  console.log(`    • Total Trades:         ${allPortfolioTrades.length} trades (${pWins} Wins / ${pLosses} Losses)`);
  console.log(`    • Win Rate:             ${pWR}%`);
  console.log(`    • Max Drawdown:         -${pMaxDD.toFixed(1)}%`);
  console.log(`=======================================================================\n`);
}

runPortfolioAudit().catch(console.error);
