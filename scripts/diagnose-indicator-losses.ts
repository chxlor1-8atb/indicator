/**
 * Deep Quantitative Attribution: Diagnose Indicator Win-Rates & Loss Drivers
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
} catch {}

async function main() {
  const { sql, resilientQuery } = await import("../lib/db");
  const { getMarketCandles, simulateInstitutionalBacktest } = await import("../lib/marketService");
  const { calculateEMA, calculateRSI, calculateADX, calculateATR } = await import("../lib/indicators");

  console.log("================================================================================");
  console.log("🔍 DEEP QUANTITATIVE DIAGNOSTIC: INDICATOR ATTRIBUTION & LOSS CAUSE ANALYSIS");
  console.log("================================================================================\n");

  // ─── PART 1: NEON DB LIVE SIGNALS ATTRIBUTION ───
  if (sql) {
    console.log("📊 [PART 1] Analyzing Live Trades in Neon DB (ai_signals)...");
    
    // 1.1 Win Rate by Setup Grade
    const gradeRows = await resilientQuery<Array<{ grade: string; total: number; wins: number; losses: number }>>(`
      SELECT 
        setup_grade as grade,
        COUNT(*)::int as total,
        COUNT(CASE WHEN status IN ('HIT_TP1','HIT_TP2') THEN 1 END)::int as wins,
        COUNT(CASE WHEN status = 'HIT_SL' THEN 1 END)::int as losses
      FROM ai_signals
      WHERE status IN ('HIT_TP1','HIT_TP2','HIT_SL')
      GROUP BY setup_grade
      ORDER BY total DESC;
    `);

    console.log("\n• Win Rate by Setup Grade:");
    console.table(gradeRows.map(r => ({
      Grade: r.grade,
      Total: r.total,
      Wins: r.wins,
      Losses: r.losses,
      WinRate: (r.wins + r.losses) > 0 ? `${((r.wins / (r.wins + r.losses)) * 100).toFixed(1)}%` : "0%"
    })));

    // 1.2 Win Rate by Confluence Score Bracket
    const confRows = await resilientQuery<Array<{ bracket: string; total: number; wins: number; losses: number }>>(`
      SELECT 
        CASE 
          WHEN confluence_score >= 85 THEN '85-100 (Supreme)'
          WHEN confluence_score >= 75 THEN '75-84 (High)'
          WHEN confluence_score >= 65 THEN '65-74 (Moderate)'
          WHEN confluence_score >= 52 THEN '52-64 (Minimum)'
          ELSE '< 52 (Low)'
        END as bracket,
        COUNT(*)::int as total,
        COUNT(CASE WHEN status IN ('HIT_TP1','HIT_TP2') THEN 1 END)::int as wins,
        COUNT(CASE WHEN status = 'HIT_SL' THEN 1 END)::int as losses
      FROM ai_signals
      WHERE status IN ('HIT_TP1','HIT_TP2','HIT_SL')
      GROUP BY 1
      ORDER BY 1 DESC;
    `);

    console.log("• Win Rate by Confluence Score Bracket:");
    console.table(confRows.map(r => ({
      Bracket: r.bracket,
      Total: r.total,
      Wins: r.wins,
      Losses: r.losses,
      WinRate: (r.wins + r.losses) > 0 ? `${((r.wins / (r.wins + r.losses)) * 100).toFixed(1)}%` : "0%"
    })));

    // 1.3 Inspect Top Recorded Lessons for Losses in signal_feedback_lessons
    const lessons = await resilientQuery<Array<{ symbol: string; pnl_pips: number; confluence_score: number; lesson_summary: string }>>(`
      SELECT symbol, pnl_pips, confluence_score, lesson_summary
      FROM signal_feedback_lessons
      WHERE outcome = 'HIT_SL'
      ORDER BY created_at DESC
      LIMIT 10;
    `);

    if (lessons.length > 0) {
      console.log("\n• Sample Recorded Loss Attribution Lessons:");
      for (const l of lessons.slice(0, 5)) {
        console.log(`  ❌ [${l.symbol}] (Loss ${l.pnl_pips} pips, Conf: ${l.confluence_score}): ${l.lesson_summary}`);
      }
    }
  }

  // ─── PART 2: EMPIRICAL INDICATOR DRIFT ON HISTORICAL LOSSES ───
  console.log("\n================================================================================");
  console.log("🔬 [PART 2] Deep Indicator Condition Analysis on Losing Trades");
  console.log("================================================================================\n");

  const testAssets = ["XAUUSD", "EURUSD", "USDJPY", "XAGUSD", "GBPUSD"];
  
  // Track loss metrics
  const lossStats = {
    totalLosses: 0,
    lowAdxCount: 0,         // ADX < 22 (Choppy market whipsaw)
    extremeRsiCount: 0,     // RSI > 65 on BUY or RSI < 35 on SELL (Late chase into exhaustion)
    overextendedCount: 0,   // Distance from EMA200 > 2.2 ATR (Climax reversal)
    asianDeadzoneCount: 0,  // Session 21:00 - 05:00 UTC (Spread spike / low liquidity)
    weakRejectionCount: 0,  // Wick ratio < 30% of candle range
    tightSlCount: 0,        // SL < 1.0 ATR (Stopped out by normal market breathing)
  };

  const winStats = {
    totalWins: 0,
    adxSum: 0,
    rsiSum: 0,
  };

  for (const sym of testAssets) {
    const candles = await getMarketCandles(sym, "1h");
    if (candles.length < 50) continue;

    const trades = simulateInstitutionalBacktest(sym, candles);
    const rsi = calculateRSI(candles, 14);
    const adx = calculateADX(candles, 14);
    const atrs = calculateATR(candles, 14);
    const ema200 = calculateEMA(candles, 200);

    for (const t of trades) {
      const idx = candles.findIndex(c => c.time === t.entryTime);
      if (idx === -1) continue;

      const c = candles[idx];
      const currentRsi = rsi[idx] ?? 50;
      const currentAdx = adx[idx] ?? 25;
      const currentAtr = atrs[idx] ?? (c.high - c.low);
      const currentEma200 = ema200[idx] ?? c.close;
      const distFromEma200 = Math.abs(c.close - currentEma200);
      const utcHour = new Date(c.time * 1000).getUTCHours();
      const candleRange = c.high - c.low;
      const wick = t.type === "BUY" ? Math.min(c.close, c.open) - c.low : c.high - Math.max(c.close, c.open);
      const wickRatio = candleRange > 0 ? wick / candleRange : 0;
      const slDist = Math.abs(t.entryPrice - (t.sl ?? t.entryPrice));

      if (t.result === "LOSS") {
        lossStats.totalLosses++;
        if (currentAdx < 22) lossStats.lowAdxCount++;
        if ((t.type === "BUY" && currentRsi > 62) || (t.type === "SELL" && currentRsi < 38)) lossStats.extremeRsiCount++;
        if (distFromEma200 > currentAtr * 2.2) lossStats.overextendedCount++;
        if (utcHour >= 21 || utcHour < 6) lossStats.asianDeadzoneCount++;
        if (wickRatio < 0.28) lossStats.weakRejectionCount++;
        if (slDist < currentAtr * 1.15) lossStats.tightSlCount++;
      } else if (t.result === "WIN") {
        winStats.totalWins++;
        winStats.adxSum += currentAdx;
        winStats.rsiSum += currentRsi;
      }
    }
  }

  console.log(`Analyzed across ${testAssets.join(", ")}: Total Wins: ${winStats.totalWins}, Total Losses: ${lossStats.totalLosses}\n`);
  console.log("🚨 Root Causes Breakdown of Losing Trades:");
  console.log("--------------------------------------------------------------------------------");
  const pct = (val: number, total: number) => total > 0 ? `${((val / total) * 100).toFixed(1)}%` : "0%";

  console.log(`1. 🌪️  Chop / Low ADX (< 22)           : ${lossStats.lowAdxCount} ไม้ (${pct(lossStats.lowAdxCount, lossStats.totalLosses)}) -> ตลาดไซด์เวย์ ไม่มีเทรนด์จริง โดน Whipsaw หลอก`);
  console.log(`2. ⚠️  RSI Momentum Exhaustion (>62/<38): ${lossStats.extremeRsiCount} ไม้ (${pct(lossStats.extremeRsiCount, lossStats.totalLosses)}) -> ไล่ราคาซื้อตอนใกล้ Peak หรือขายตอนใกล้ก้น`);
  console.log(`3. 📏  Overextended จาก EMA200 (> 2.2 ATR): ${lossStats.overextendedCount} ไม้ (${pct(lossStats.overextendedCount, lossStats.totalLosses)}) -> ราคาห่างเส้นเทรนด์ใหญ่เกินไป ถูก Mean Reversion ดึงกลับ`);
  console.log(`4. 🌙  Asian Deadzone / Low Volume     : ${lossStats.asianDeadzoneCount} ไม้ (${pct(lossStats.asianDeadzoneCount, lossStats.totalLosses)}) -> เปิดคำสั่งช่วงสภาพคล่องต่ำ สเปรดถ่าง`);
  console.log(`5. 🕯️  Weak Candle Rejection (< 28%)   : ${lossStats.weakRejectionCount} ไม้ (${pct(lossStats.weakRejectionCount, lossStats.totalLosses)}) -> ไส้เทียนปฏิเสธราคาไม่ชัดเจน (ขาดแรงสถาบัน)`);
  console.log(`6. 🎯  SL แคบเกินไป (< 1.15 ATR)       : ${lossStats.tightSlCount} ไม้ (${pct(lossStats.tightSlCount, lossStats.totalLosses)}) -> SL แนบชิดเกินไป โดนไส้แท่งเทียนปกติสะกิดหลุด`);
  console.log("--------------------------------------------------------------------------------\n");
}

main().catch(console.error);
