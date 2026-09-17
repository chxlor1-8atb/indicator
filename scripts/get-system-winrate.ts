/**
 * Aegis Quant Terminal — System Win-Rate & Closed Candle Ledger CLI
 * คำสั่งดึงสถิติวินเรทระบบและประวัติแท่งเทียนที่ปิดแล้วจากฐานข้อมูล Neon Postgres ทันที
 * 
 * วิธีใช้:
 *   npm run winrate
 *   npx tsx scripts/get-system-winrate.ts [symbol]
 */

import * as fs from "fs";
import * as path from "path";

// 1. Load .env.local before importing modules that read process.env at evaluation
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
  // Ignore env load errors
}

async function main() {
  // Dynamic import so lib/db reads process.env after .env.local is populated
  const { getSystemWinRateSummary, sql } = await import("../lib/db");

  const filterSymbol = process.argv[2] ? process.argv[2].toUpperCase() : undefined;

  console.log("\n================================================================================");
  console.log(" 📊 AEGIS QUANT TERMINAL — REAL-TIME SYSTEM WIN-RATE & CLOSED CANDLE LEDGER");
  console.log("================================================================================");

  if (!sql) {
    console.warn("⚠️  DATABASE_URL / POSTGRES_URL ไม่ได้ตั้งค่าหรือเชื่อมต่อ Neon ไม่ได้");
    console.log("กรุณาตรวจสอบการตั้งค่า .env.local\n");
    return;
  }

  const startTime = Date.now();
  const summary = await getSystemWinRateSummary(filterSymbol);
  const durationMs = Date.now() - startTime;

  console.log(`⏱️  ดึงข้อมูลจาก Neon Postgres สำเร็จใน ${durationMs}ms (0 External API Calls)\n`);

  // 1. OVERALL STATS
  const { overall } = summary;
  const grade =
    overall.winRatePct >= 80 ? "⭐ A+ (Institutional Grade)" :
    overall.winRatePct >= 70 ? "🟢 A (Strong Edge)" :
    overall.winRatePct >= 55 ? "🟡 B (Profitable)" : "⚪ C / Neutral";

  console.log("┌──────────────────────────────────────────────────────────────────────────────┐");
  console.log(`│ 🏆 ภาพรวมวินเรทระบบ (System Overall Performance)                             │`);
  console.log("├──────────────────────────────────────────────────────────────────────────────┤");
  console.log(`│  • วินเรทปัจจุบัน (Win Rate)    : \x1b[32m\x1b[1m${overall.winRatePct.toFixed(1)}%\x1b[0m [${grade}]`);
  console.log(`│  • จำนวนไม้ทั้งหมด (Total)      : ${overall.totalTrades} ไม้ (ชนะ ${overall.wins} / แพ้ ${overall.losses} / เสมอ ${overall.breakeven})`);
  console.log(`│  • กำไรสุทธิ (Net Pips)         : \x1b[36m\x1b[1m${overall.netPips > 0 ? "+" : ""}${overall.netPips} pips\x1b[0m`);
  console.log(`│  • Profit Factor                : ${overall.profitFactor.toFixed(2)}`);
  console.log(`│  • สัดส่วนข้อมูล (Data Mix)     : สัญญาณสด ${overall.liveTrades} ไม้ | Backtest ${overall.backtestTrades} ไม้`);
  console.log("└──────────────────────────────────────────────────────────────────────────────┘\n");

  // 2. PER-SYMBOL PERFORMANCE TABLE
  if (summary.perSymbol.length > 0) {
    console.log("📈 แยกรายสินทรัพย์ (Per-Symbol Performance Breakdown):");
    console.log("--------------------------------------------------------------------------------");
    console.log(
      " สินทรัพย์".padEnd(12) +
      "วินเรท (%)".padStart(12) +
      "จำนวนไม้".padStart(10) +
      "ชนะ / แพ้".padStart(14) +
      "Net Pips".padStart(14) +
      "ประเภทข้อมูล".padStart(16)
    );
    console.log("--------------------------------------------------------------------------------");

    for (const s of summary.perSymbol) {
      const color = s.winRatePct >= 70 ? "\x1b[32m" : s.winRatePct >= 50 ? "\x1b[33m" : "\x1b[31m";
      const symStr = s.symbol.padEnd(10);
      const wrStr = `${color}${s.winRatePct.toFixed(1)}%\x1b[0m`.padStart(20);
      const totalStr = `${s.totalTrades}`.padStart(10);
      const winLossStr = `${s.wins}W / ${s.losses}L`.padStart(14);
      const pipsStr = `${s.netPips > 0 ? "+" : ""}${s.netPips}`.padStart(14);
      const mixStr = `L:${s.liveTrades} / B:${s.backtestTrades}`.padStart(16);
      console.log(` ${symStr}${wrStr}${totalStr}${winLossStr}${pipsStr}${mixStr}`);
    }
    console.log("--------------------------------------------------------------------------------\n");
  }

  // 3. CLOSED CANDLE TRANSITION LEDGER
  if (summary.recentClosedCandles.length > 0) {
    console.log("🕯️  ประวัติการข้ามแท่งเทียนที่จบแล้ว (Closed Candle Transitions):");
    console.log("--------------------------------------------------------------------------------");
    console.log(
      " สินทรัพย์/TF".padEnd(14) +
      "ราคาปิดแท่ง".padStart(13) +
      "ราคาแท่งก่อน".padStart(13) +
      "ราคาเปิดแท่งใหม่".padStart(16) +
      "Gap (pips)".padStart(12) +
      "Range".padStart(10)
    );
    console.log("--------------------------------------------------------------------------------");

    for (const c of summary.recentClosedCandles.slice(0, 10)) {
      const symTf = `${c.symbol} (${c.timeframe.toUpperCase()})`.padEnd(14);
      const closeStr = c.close.toFixed(2).padStart(13);
      const prevCloseStr = c.prevClose !== null ? c.prevClose.toFixed(2).padStart(13) : "-".padStart(13);
      const nextOpenStr = c.nextOpen !== null ? c.nextOpen.toFixed(2).padStart(16) : "-".padStart(16);
      const gapColor = Math.abs(c.gapPips) > 5 ? "\x1b[33m" : "\x1b[90m";
      const gapStr = `${gapColor}${c.gapPips > 0 ? "+" : ""}${c.gapPips}\x1b[0m`.padStart(20);
      const rangeStr = `${c.rangePips}`.padStart(10);

      console.log(` ${symTf}${closeStr}${prevCloseStr}${nextOpenStr}${gapStr}${rangeStr}`);
    }
    console.log("--------------------------------------------------------------------------------\n");
  } else {
    console.log("🕯️  ยังไม่มีประวัติแท่งเทียนที่ปิดใน closed_candles_archive (ระบบจะบันทึกอัตโนมัติเมื่อมีการสแกน/ดึงแท่งเทียน)\n");
  }

  console.log("💡 ระบบบันทึกแท่งเทียนที่จบและ Telemetry ลง Neon Postgres อัตโนมัติทุกรอบการวิเคราะห์");
  console.log("================================================================================\n");
}

main().catch((err) => {
  console.error("เกิดข้อผิดพลาดในการดึงข้อมูลวินเรท:", err);
  process.exit(1);
});
