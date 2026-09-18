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
        if (!process.env[key]) process.env[key] = val;
      }
    }
  }
} catch {}

async function checkForex() {
  const { resilientQuery } = await import("../lib/db");
  const rows = await resilientQuery<Array<{
    symbol: string;
    action: string;
    order_type: string;
    entry_price: number;
    stop_loss: number;
    take_profit1: number;
    confluence_score: number;
    setup_grade: string;
    status: string;
    pnl_pips: number;
  }>>(`
    SELECT symbol, action, order_type, entry_price, stop_loss, take_profit1, confluence_score, setup_grade, status, pnl_pips
    FROM ai_signals
    WHERE symbol IN ('EURUSD', 'USDJPY')
    ORDER BY created_at DESC
    LIMIT 20;
  `);

  console.log("Sample EURUSD & USDJPY trades in DB:");
  console.table(rows.map(r => ({
    Sym: r.symbol,
    Action: r.action,
    Order: r.order_type,
    Entry: r.entry_price,
    SL: r.stop_loss,
    DistSL: Math.abs(r.entry_price - r.stop_loss).toFixed(4),
    Conf: r.confluence_score,
    Grade: r.setup_grade,
    Status: r.status,
    PnL: r.pnl_pips
  })));
}

checkForex().catch(console.error);
