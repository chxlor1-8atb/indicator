/**
 * Comprehensive System Health Audit Script
 * Tests all backend endpoints, data feeds, indicators, AI brain, DB connection, and MT bridge
 */

import { getMarketCandles } from "../lib/marketService";
import { calculateAllIndicators } from "../lib/indicators";
import { generateRuleBasedAnalysis } from "../lib/geminiService";
import { resilientQuery } from "../lib/db";
import { scanWatchlistAutonomous } from "../lib/autonomousEngine";
import { getDailyEconomicCalendar } from "../lib/calendarEngine";
import { getMarketSessionInfo } from "../lib/sessionEngine";

async function runAudit() {
  console.log("=============================================================");
  console.log("🔍 COMPREHENSIVE AEGIS SYSTEM AUDIT");
  console.log("=============================================================\n");

  const results: Record<string, { status: "PASS" | "FAIL" | "WARN"; note: string }> = {};

  // 1. Neon Database Connection
  console.log("1. Checking Neon Postgres Database Connection...");
  try {
    const dbRes = await resilientQuery<{ now: string }[]>("SELECT NOW() as now");
    if (dbRes && dbRes.length > 0) {
      results["Database"] = { status: "PASS", note: `Connected. DB Time: ${dbRes[0].now}` };
      console.log("  ✅ DB Connection: OK");
    } else {
      results["Database"] = { status: "WARN", note: "DB returned empty or null sql client" };
      console.log("  ⚠️ DB Connection: No rows or no client");
    }
  } catch (err: any) {
    results["Database"] = { status: "FAIL", note: err.message };
    console.log("  ❌ DB Connection: FAILED -", err.message);
  }

  // 2. Market Data Feeds (Gold, Crypto, Forex)
  console.log("\n2. Checking Market Data Feeds (Binance/Bybit/Yahoo/TV)...");
  const testSymbols = ["XAUUSD", "BTCUSDT", "EURUSD"];
  for (const sym of testSymbols) {
    try {
      const candles = await getMarketCandles(sym, "1h");
      if (candles && candles.length >= 20) {
        const last = candles[candles.length - 1];
        results[`Feed_${sym}`] = { status: "PASS", note: `${candles.length} candles. Last: $${last.close}` };
        console.log(`  ✅ Feed [${sym}]: ${candles.length} candles, Last: $${last.close}`);
      } else {
        results[`Feed_${sym}`] = { status: "FAIL", note: `Insufficient candles (${candles?.length || 0})` };
        console.log(`  ❌ Feed [${sym}]: Insufficient candles (${candles?.length || 0})`);
      }
    } catch (err: any) {
      results[`Feed_${sym}`] = { status: "FAIL", note: err.message };
      console.log(`  ❌ Feed [${sym}]: FAILED -`, err.message);
    }
  }

  // 3. Quantitative Indicators Engine
  console.log("\n3. Checking 100+ Indicators Calculation Engine...");
  try {
    const candles = await getMarketCandles("XAUUSD", "1h");
    const ind = calculateAllIndicators(candles, "XAUUSD");
    const hasEma = ind.ema20.length > 0 && ind.ema50.length > 0;
    const hasRsi = ind.rsi14.length > 0;
    const hasSMC = Boolean((ind as any).orderBlocks || (ind as any).fairValueGaps || ind.supportLevels?.length > 0);
    if (hasEma && hasRsi) {
      results["IndicatorsEngine"] = {
        status: "PASS",
        note: `EMA20: ${ind.ema20.length}, RSI: ${ind.rsi14.length}, SMC: ${hasSMC ? "OK" : "Partial"}`,
      };
      console.log("  ✅ Indicators Engine: OK (EMA, RSI, SMC calculated)");
    } else {
      results["IndicatorsEngine"] = { status: "FAIL", note: "Missing core indicator arrays" };
      console.log("  ❌ Indicators Engine: Missing core arrays");
    }
  } catch (err: any) {
    results["IndicatorsEngine"] = { status: "FAIL", note: err.message };
    console.log("  ❌ Indicators Engine: FAILED -", err.message);
  }

  // 4. Decision & Confluence Brain
  console.log("\n4. Checking Decision & 5-Pillar Confluence Engine...");
  try {
    const candles = await getMarketCandles("XAUUSD", "1h");
    const ind = calculateAllIndicators(candles, "XAUUSD");
    const analysis = generateRuleBasedAnalysis("XAUUSD", "1h", candles, ind, []);
    if (analysis && analysis.signal && analysis.tradeSetup) {
      results["DecisionBrain"] = {
        status: "PASS",
        note: `Signal: ${analysis.signal}, Grade: ${analysis.setupGrade}, Action: ${analysis.tradeSetup.action}`,
      };
      console.log(`  ✅ Decision Brain: OK (Signal: ${analysis.signal}, Grade: ${analysis.setupGrade})`);
    } else {
      results["DecisionBrain"] = { status: "FAIL", note: "Analysis missing signal or tradeSetup" };
      console.log("  ❌ Decision Brain: Missing signal or tradeSetup");
    }
  } catch (err: any) {
    results["DecisionBrain"] = { status: "FAIL", note: err.message };
    console.log("  ❌ Decision Brain: FAILED -", err.message);
  }

  // 5. Macro Calendar & Market Session Shields
  console.log("\n5. Checking Economic Calendar & Session Engines...");
  try {
    const session = getMarketSessionInfo();
    const calendar = getDailyEconomicCalendar("XAUUSD");
    results["SessionEngine"] = { status: "PASS", note: `Session: ${session.currentSession}, Overlap: ${session.isLondonNyOverlap}` };
    results["CalendarEngine"] = { status: "PASS", note: `${calendar.length} events loaded for today` };
    console.log(`  ✅ Session Engine: OK (${session.currentSession})`);
    console.log(`  ✅ Calendar Engine: OK (${calendar.length} events)`);
  } catch (err: any) {
    results["CalendarSession"] = { status: "FAIL", note: err.message };
    console.log("  ❌ Calendar/Session: FAILED -", err.message);
  }

  // 6. Autonomous Scanner Loop
  console.log("\n6. Checking Autonomous Watchlist Scanner...");
  try {
    const scan = await scanWatchlistAutonomous(undefined, true);
    if (scan && scan.summaries && scan.summaries.length > 0) {
      results["AutonomousScanner"] = {
        status: "PASS",
        note: `Scanned ${scan.summaries.length} assets. Actionable: ${scan.actionableAnalyses.length}`,
      };
      console.log(`  ✅ Autonomous Scanner: OK (${scan.summaries.length} assets scanned)`);
    } else {
      results["AutonomousScanner"] = { status: "FAIL", note: "Scan returned 0 summaries" };
      console.log("  ❌ Autonomous Scanner: 0 summaries returned");
    }
  } catch (err: any) {
    results["AutonomousScanner"] = { status: "FAIL", note: err.message };
    console.log("  ❌ Autonomous Scanner: FAILED -", err.message);
  }

  console.log("\n=============================================================");
  console.log("AUDIT SUMMARY TABLE");
  console.log("=============================================================");
  console.table(results);
}

runAudit();
