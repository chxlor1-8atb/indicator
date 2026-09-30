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

async function checkDetailedWinRate() {
  const { sql } = await import("../lib/db");
  if (!sql) {
    console.error("No database connection");
    return;
  }

  console.log("\n================================================================================");
  console.log(" 📊 การแจกแจงวินเรทเชิงลึก (DETAILED WIN-RATE BREAKDOWN) — NEON POSTGRES");
  console.log("================================================================================\n");

  // 1. Live vs Backtest
  const summary = await sql.query(`
    SELECT 
      'สัญญาณสด (Live ai_signals)' as category,
      COUNT(*)::int as total,
      COUNT(CASE WHEN status IN ('HIT_TP1', 'HIT_TP2') THEN 1 END)::int as wins,
      COUNT(CASE WHEN status = 'HIT_SL' THEN 1 END)::int as losses,
      COUNT(CASE WHEN status = 'CLOSED_BE' THEN 1 END)::int as be,
      ROUND(COUNT(CASE WHEN status IN ('HIT_TP1', 'HIT_TP2') THEN 1 END)::numeric / NULLIF(COUNT(CASE WHEN status IN ('HIT_TP1', 'HIT_TP2', 'HIT_SL') THEN 1 END), 0) * 100, 1) as win_rate
    FROM ai_signals
    WHERE status != 'ACTIVE'
    UNION ALL
    SELECT 
      'การจำลองย้อนหลัง (Backtest)' as category,
      COUNT(*)::int as total,
      COUNT(CASE WHEN result = 'WIN' THEN 1 END)::int as wins,
      COUNT(CASE WHEN result = 'LOSS' THEN 1 END)::int as losses,
      COUNT(CASE WHEN result = 'BE' THEN 1 END)::int as be,
      ROUND(COUNT(CASE WHEN result = 'WIN' THEN 1 END)::numeric / NULLIF(COUNT(CASE WHEN result IN ('WIN', 'LOSS') THEN 1 END), 0) * 100, 1) as win_rate
    FROM backtest_results
  `);
  console.table(summary);

  // 2. Confluence Tier Win Rate on Live Signals
  const tiers = await sql.query(`
    SELECT 
      CASE 
        WHEN confluence_score >= 80 THEN 'Grade A+ (Confluence >= 80)'
        WHEN confluence_score >= 70 THEN 'Grade A  (Confluence 70-79)'
        WHEN confluence_score >= 60 THEN 'Grade B  (Confluence 60-69)'
        ELSE 'Grade C / Low (< 60)'
      END as tier,
      COUNT(*)::int as total,
      COUNT(CASE WHEN status IN ('HIT_TP1', 'HIT_TP2') THEN 1 END)::int as wins,
      COUNT(CASE WHEN status = 'HIT_SL' THEN 1 END)::int as losses,
      ROUND(COUNT(CASE WHEN status IN ('HIT_TP1', 'HIT_TP2') THEN 1 END)::numeric / NULLIF(COUNT(CASE WHEN status IN ('HIT_TP1', 'HIT_TP2', 'HIT_SL') THEN 1 END), 0) * 100, 1) as win_rate
    FROM ai_signals
    WHERE status != 'ACTIVE'
    GROUP BY 1
    ORDER BY MIN(confluence_score) DESC;
  `);
  console.log("\n--- 2. วินเรทแบ่งตามระดับคะแนน Confluence (Live Signals) ---");
  console.table(tiers);

  // 3. Filtered Model: If only Grade A/A+ (>= 70) and excluding XAGUSD
  const filtered = await sql.query(`
    SELECT 
      'โมเดลมาตรฐานใหม่ (Grade A & A+ เท่านั้น ไม่รวม XAGUSD)' as model,
      COUNT(*)::int as total,
      COUNT(CASE WHEN status IN ('HIT_TP1', 'HIT_TP2') THEN 1 END)::int as wins,
      COUNT(CASE WHEN status = 'HIT_SL' THEN 1 END)::int as losses,
      ROUND(COUNT(CASE WHEN status IN ('HIT_TP1', 'HIT_TP2') THEN 1 END)::numeric / NULLIF(COUNT(CASE WHEN status IN ('HIT_TP1', 'HIT_TP2', 'HIT_SL') THEN 1 END), 0) * 100, 1) as win_rate
    FROM ai_signals
    WHERE status != 'ACTIVE'
      AND confluence_score >= 70
      AND symbol != 'XAGUSD';
  `);
  console.log("\n--- 3. วินเรทหลังการกรองด้วยเกณฑ์ใหม่ (Confluence >= 70 & No XAGUSD) ---");
  console.table(filtered);

  // 4. Asset Performance on Grade A/A+
  const topSymbolsGradeA = await sql.query(`
    SELECT 
      symbol,
      COUNT(*)::int as total,
      COUNT(CASE WHEN status IN ('HIT_TP1', 'HIT_TP2') THEN 1 END)::int as wins,
      COUNT(CASE WHEN status = 'HIT_SL' THEN 1 END)::int as losses,
      ROUND(COUNT(CASE WHEN status IN ('HIT_TP1', 'HIT_TP2') THEN 1 END)::numeric / NULLIF(COUNT(CASE WHEN status IN ('HIT_TP1', 'HIT_TP2', 'HIT_SL') THEN 1 END), 0) * 100, 1) as win_rate,
      ROUND(COALESCE(SUM(pnl_pips), 0)::numeric, 1) as net_pips
    FROM ai_signals
    WHERE status != 'ACTIVE'
      AND confluence_score >= 70
    GROUP BY symbol
    ORDER BY wins DESC;
  `);
  console.log("\n--- 4. สถิติรายสินทรัพย์เมื่อเข้าด้วยเกณฑ์ Grade A & A+ (Confluence >= 70) ---");
  console.table(topSymbolsGradeA);

  // 5. Ultimate Full Quant Model: Grade A/A+ (>= 70), No XAGUSD, AND Anti-Clash Hard Veto
  const ultimateModel = await sql.query(`
    SELECT 
      'โมเดลสมบูรณ์แบบ (Grade A/A+ & No XAGUSD & Hard Veto ป้องกันกับดัก)' as model,
      COUNT(*)::int as total,
      COUNT(CASE WHEN status IN ('HIT_TP1', 'HIT_TP2') THEN 1 END)::int as wins,
      COUNT(CASE WHEN status = 'HIT_SL' THEN 1 END)::int as losses,
      ROUND(COUNT(CASE WHEN status IN ('HIT_TP1', 'HIT_TP2') THEN 1 END)::numeric / NULLIF(COUNT(CASE WHEN status IN ('HIT_TP1', 'HIT_TP2', 'HIT_SL') THEN 1 END), 0) * 100, 1) as win_rate
    FROM ai_signals
    WHERE status != 'ACTIVE'
      AND confluence_score >= 70
      AND symbol != 'XAGUSD'
      AND (notes IS NULL OR notes NOT LIKE '%[🛡️ ANTI-CLASH VETO]%');
  `);
  console.log("\n--- 5. วินเรทโมเดลสมบูรณ์แบบหลังติดตั้ง Hard Veto & Confluence >= 70 ---");
  console.table(ultimateModel);
}

checkDetailedWinRate().catch(console.error);
