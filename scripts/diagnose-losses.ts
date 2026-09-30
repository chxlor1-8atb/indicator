import * as fs from "fs";
import * as path from "path";

// Load .env.local
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

async function runDiagnosis() {
  const { sql } = await import("../lib/db");
  if (!sql) {
    console.error("No database connection");
    return;
  }

  console.log("=== 1. LOSSES BREAKDOWN BY SOURCE (ai_signals vs backtest_results) ===");
  const liveLosses = await sql.query(`
    SELECT COUNT(*)::int as count FROM ai_signals WHERE status = 'HIT_SL';
  `);
  const btLosses = await sql.query(`
    SELECT COUNT(*)::int as count FROM backtest_results WHERE result = 'LOSS';
  `);
  console.log(`Live ai_signals losses: ${liveLosses[0]?.count}`);
  console.log(`Backtest backtest_results losses: ${btLosses[0]?.count}`);

  console.log("\n=== 2. TOP LOSING SYMBOLS IN ai_signals (LIVE) ===");
  const liveBySym = await sql.query(`
    SELECT symbol, 
           COUNT(*)::int as total,
           COUNT(CASE WHEN status IN ('HIT_TP1', 'HIT_TP2') THEN 1 END)::int as wins,
           COUNT(CASE WHEN status = 'HIT_SL' THEN 1 END)::int as losses,
           ROUND(COUNT(CASE WHEN status IN ('HIT_TP1', 'HIT_TP2') THEN 1 END)::numeric / NULLIF(COUNT(CASE WHEN status IN ('HIT_TP1', 'HIT_TP2', 'HIT_SL') THEN 1 END), 0) * 100, 1) as win_rate,
           COALESCE(SUM(pnl_pips), 0)::numeric as net_pips
    FROM ai_signals
    WHERE status != 'ACTIVE'
    GROUP BY symbol
    ORDER BY losses DESC
    LIMIT 15;
  `);
  console.table(liveBySym);

  console.log("\n=== 3. TOP LOSING SYMBOLS IN backtest_results ===");
  const btBySym = await sql.query(`
    SELECT symbol, 
           COUNT(*)::int as total,
           COUNT(CASE WHEN result = 'WIN' THEN 1 END)::int as wins,
           COUNT(CASE WHEN result = 'LOSS' THEN 1 END)::int as losses,
           ROUND(COUNT(CASE WHEN result = 'WIN' THEN 1 END)::numeric / NULLIF(COUNT(*), 0) * 100, 1) as win_rate,
           COALESCE(SUM(pnl_pips), 0)::numeric as net_pips
    FROM backtest_results
    GROUP BY symbol
    ORDER BY losses DESC
    LIMIT 15;
  `);
  console.table(btBySym);

  console.log("\n=== 4. LOSSES BREAKDOWN BY SETUP GRADE IN ai_signals ===");
  const liveByGrade = await sql.query(`
    SELECT setup_grade,
           COUNT(*)::int as total,
           COUNT(CASE WHEN status IN ('HIT_TP1', 'HIT_TP2') THEN 1 END)::int as wins,
           COUNT(CASE WHEN status = 'HIT_SL' THEN 1 END)::int as losses,
           ROUND(COUNT(CASE WHEN status IN ('HIT_TP1', 'HIT_TP2') THEN 1 END)::numeric / NULLIF(COUNT(CASE WHEN status IN ('HIT_TP1', 'HIT_TP2', 'HIT_SL') THEN 1 END), 0) * 100, 1) as win_rate
    FROM ai_signals
    WHERE status != 'ACTIVE'
    GROUP BY setup_grade
    ORDER BY losses DESC;
  `);
  console.table(liveByGrade);

  console.log("\n=== 5. LOSSES BREAKDOWN BY ACTION (BUY vs SELL) ===");
  const liveByAction = await sql.query(`
    SELECT action,
           COUNT(*)::int as total,
           COUNT(CASE WHEN status IN ('HIT_TP1', 'HIT_TP2') THEN 1 END)::int as wins,
           COUNT(CASE WHEN status = 'HIT_SL' THEN 1 END)::int as losses,
           ROUND(COUNT(CASE WHEN status IN ('HIT_TP1', 'HIT_TP2') THEN 1 END)::numeric / NULLIF(COUNT(CASE WHEN status IN ('HIT_TP1', 'HIT_TP2', 'HIT_SL') THEN 1 END), 0) * 100, 1) as win_rate
    FROM ai_signals
    WHERE status != 'ACTIVE'
    GROUP BY action
    ORDER BY losses DESC;
  `);
  console.table(liveByAction);

  console.log("\n=== 6. ANTI-CLASH VETO IMPACT IN ai_signals ===");
  const vetoStats = await sql.query(`
    SELECT 
      CASE WHEN notes LIKE '%ANTI-CLASH VETO%' THEN 'WITH_VETO' ELSE 'NO_VETO' END as veto_group,
      COUNT(*)::int as total,
      COUNT(CASE WHEN status IN ('HIT_TP1', 'HIT_TP2') THEN 1 END)::int as wins,
      COUNT(CASE WHEN status = 'HIT_SL' THEN 1 END)::int as losses,
      ROUND(COUNT(CASE WHEN status IN ('HIT_TP1', 'HIT_TP2') THEN 1 END)::numeric / NULLIF(COUNT(CASE WHEN status IN ('HIT_TP1', 'HIT_TP2', 'HIT_SL') THEN 1 END), 0) * 100, 1) as win_rate
    FROM ai_signals
    WHERE status != 'ACTIVE'
    GROUP BY 1;
  `);
  console.table(vetoStats);

  console.log("\n=== 6.1 CONFLUENCE SCORE BINS IN ai_signals ===");
  const scoreBins = await sql.query(`
    SELECT 
      CASE 
        WHEN confluence_score >= 80 THEN '80-100 (A+)'
        WHEN confluence_score >= 70 THEN '70-79 (A)'
        WHEN confluence_score >= 60 THEN '60-69 (B)'
        ELSE '< 60 (Low / Chop)'
      END as score_range,
      COUNT(*)::int as total,
      COUNT(CASE WHEN status IN ('HIT_TP1', 'HIT_TP2') THEN 1 END)::int as wins,
      COUNT(CASE WHEN status = 'HIT_SL' THEN 1 END)::int as losses,
      ROUND(COUNT(CASE WHEN status IN ('HIT_TP1', 'HIT_TP2') THEN 1 END)::numeric / NULLIF(COUNT(CASE WHEN status IN ('HIT_TP1', 'HIT_TP2', 'HIT_SL') THEN 1 END), 0) * 100, 1) as win_rate
    FROM ai_signals
    WHERE status != 'ACTIVE'
    GROUP BY 1
    ORDER BY 1 DESC;
  `);
  console.table(scoreBins);

  console.log("\n=== 7. GRADE A & A+ LOSSES BREAKDOWN BY SYMBOL ===");
  const aGradeLossesBySym = await sql.query(`
    SELECT symbol,
           setup_grade,
           COUNT(*)::int as losses,
           ROUND(AVG(ABS(entry_price - stop_loss)), 4) as avg_sl_dist,
           ROUND(AVG(confluence_score), 1) as avg_score
    FROM ai_signals
    WHERE status = 'HIT_SL' AND setup_grade IN ('A', 'A+')
    GROUP BY symbol, setup_grade
    ORDER BY losses DESC
    LIMIT 15;
  `);
  console.table(aGradeLossesBySym);

  console.log("\n=== 8. XAGUSD, AUDUSD, NZDUSD DEEP-DIVE ===");
  const lowWrSyms = await sql.query(`
    SELECT symbol, 
           COUNT(*)::int as total,
           COUNT(CASE WHEN status IN ('HIT_TP1', 'HIT_TP2') THEN 1 END)::int as wins,
           COUNT(CASE WHEN status = 'HIT_SL' THEN 1 END)::int as losses,
           ROUND(AVG(ABS(entry_price - stop_loss)), 4) as avg_sl_dist,
           ROUND(AVG(confluence_score), 1) as avg_score,
           COUNT(CASE WHEN notes LIKE '%ANTI-CLASH VETO%' THEN 1 END)::int as veto_count
    FROM ai_signals
    WHERE symbol IN ('XAGUSD', 'AUDUSD', 'NZDUSD') AND status != 'ACTIVE'
    GROUP BY symbol;
  `);
  console.table(lowWrSyms);
}

runDiagnosis().catch(console.error);
