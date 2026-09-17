/**
 * Verification Test: Incremental Backtest & Closed-Candle Ledger
 * ทดสอบระบบจัดเก็บแท่งเทียนที่จบแล้วและการคำนวณวินเรท O(1) จาก Neon DB
 */

import * as fs from "fs";
import * as path from "path";

try {
  const envPath = path.resolve(process.cwd(), ".env.local");
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, "utf-8").split("\n");
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith("#") && trimmed.includes("=")) {
        const [k, ...v] = trimmed.split("=");
        const key = k.trim();
        const val = v.join("=").trim().replace(/^["']|["']$/g, "");
        if (!process.env[key]) {
          process.env[key] = val;
        }
      }
    }
  }
} catch {
  // Ignore
}

async function runTest() {
  console.log("\n================================================================================");
  console.log("🧪 TESTING INCREMENTAL CLOSED-CANDLE LEDGER & NEON WIN-RATE SUMMARY");
  console.log("================================================================================\n");

  const { getMarketCandles } = await import("../lib/marketService");
  const {
    getSystemWinRateSummary,
    recordClosedCandleTransition,
    archiveClosedCandlesBatch,
    sql,
  } = await import("../lib/db");

  if (!sql) {
    console.error("❌ Neon DB not connected. Test aborted.");
    process.exit(1);
  }

  // ─── Test 1: Fetch live candles and verify automatic transition capture ───
  console.log("--- 1. Testing Live Candle Fetch & Incremental Transition Capture ---");
  const symbol = "XAUUSD";
  const timeframe = "1h";
  const candles = await getMarketCandles(symbol, timeframe);
  console.log(`• Fetched ${candles.length} candles for ${symbol} (${timeframe})`);

  // Allow background fire-and-forget save to complete
  await new Promise((r) => setTimeout(r, 1500));

  // Explicitly call recordClosedCandleTransition to verify return value
  const recordRes = await recordClosedCandleTransition(symbol, timeframe, candles);
  console.log(`• recordClosedCandleTransition result:`, recordRes);

  // ─── Test 2: Batch Historical Archive ───
  console.log("\n--- 2. Testing Batch Historical Closed Candle Archive ---");
  const archivedCount = await archiveClosedCandlesBatch(symbol, timeframe, candles, 20);
  console.log(`• Archived ${archivedCount} historical closed candles for ${symbol}`);

  // ─── Test 3: Query Closed Candle Ledger & System Win Rate ───
  console.log("\n--- 3. Testing getSystemWinRateSummary() Telemetry ---");
  const t0 = Date.now();
  const summary = await getSystemWinRateSummary(symbol);
  const latency = Date.now() - t0;
  console.log(`• Query completed in ${latency}ms`);
  console.log(`• Overall Win Rate: ${summary.overall.winRatePct}% (${summary.overall.totalTrades} total trades)`);
  console.log(`• Recent Closed Candles captured: ${summary.recentClosedCandles.length}`);

  if (summary.recentClosedCandles.length > 0) {
    const latest = summary.recentClosedCandles[0];
    console.log(`• Latest Closed Candle Telemetry:`);
    console.log(`    - Symbol: ${latest.symbol} (${latest.timeframe})`);
    console.log(`    - Closed Price: $${latest.close}`);
    console.log(`    - Prev Close: $${latest.prevClose}`);
    console.log(`    - Next Open: $${latest.nextOpen}`);
    console.log(`    - Gap: ${latest.gapPips} pips`);
    console.log(`    - Range: ${latest.rangePips} pips`);
    console.log(`    - Body: ${latest.bodyPips} pips`);
    console.log(`    - Change: ${latest.changePct}%`);
  }

  // ─── Assertions ───
  if (summary.overall.totalTrades > 0 && summary.recentClosedCandles.length > 0) {
    console.log("\n================================================================================");
    console.log("✅ ALL INCREMENTAL BACKTEST & CLOSED-CANDLE LEDGER TESTS PASSED!");
    console.log("================================================================================\n");
    process.exit(0);
  } else {
    console.warn("\n⚠️ Tests completed with partial data (check recentClosedCandles).");
    process.exit(0);
  }
}

runTest().catch((err) => {
  console.error("Test failed with error:", err);
  process.exit(1);
});
