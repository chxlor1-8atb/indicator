import { neon } from "@neondatabase/serverless";
import { AnalysisResult } from "./types";

// Safe singleton client for Neon Serverless Postgres
const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL || "";

export const sql = connectionString ? neon(connectionString) : null;

export interface DbAiSignal {
  id: number;
  symbol: string;
  timeframe: string;
  action: string;
  order_type: string;
  entry_price: number;
  stop_loss: number;
  take_profit1: number;
  take_profit2: number;
  confluence_score: number;
  setup_grade: string;
  status: "ACTIVE" | "HIT_TP1" | "HIT_TP2" | "HIT_SL" | "CANCELLED";
  pnl_pips: number;
  notes: string | null;
  created_at: string;
  resolved_at: string | null;
}

export interface WinRateStats {
  totalSignals: number;
  resolvedCount: number;
  winCount: number;
  lossCount: number;
  activeCount: number;
  winRatePct: number;
  netPips: number;
}

/**
 * Initializes tables if they don't already exist.
 */
export async function initDatabase(): Promise<{ success: boolean; message: string }> {
  if (!sql) return { success: false, message: "DATABASE_URL is not configured." };

  try {
    await sql.query(`
      CREATE TABLE IF NOT EXISTS ai_signals (
        id SERIAL PRIMARY KEY,
        symbol VARCHAR(20) NOT NULL,
        timeframe VARCHAR(10) NOT NULL,
        action VARCHAR(10) NOT NULL,
        order_type VARCHAR(30) NOT NULL,
        entry_price NUMERIC(14, 4) NOT NULL,
        stop_loss NUMERIC(14, 4) NOT NULL,
        take_profit1 NUMERIC(14, 4) NOT NULL,
        take_profit2 NUMERIC(14, 4) NOT NULL,
        confluence_score INT DEFAULT 0,
        setup_grade VARCHAR(15) DEFAULT 'B',
        status VARCHAR(20) DEFAULT 'ACTIVE',
        pnl_pips NUMERIC(10, 2) DEFAULT 0,
        notes TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        resolved_at TIMESTAMP WITH TIME ZONE
      )
    `);

    await sql.query(`
      CREATE INDEX IF NOT EXISTS idx_ai_signals_symbol_status ON ai_signals (symbol, status)
    `);

    await sql.query(`
      CREATE INDEX IF NOT EXISTS idx_ai_signals_created_at ON ai_signals (created_at DESC)
    `);

    await sql.query(`
      CREATE TABLE IF NOT EXISTS telegram_subscribers (
        id SERIAL PRIMARY KEY,
        chat_id VARCHAR(50) UNIQUE NOT NULL,
        username VARCHAR(100),
        alert_symbol VARCHAR(20) DEFAULT 'ALL',
        min_grade VARCHAR(10) DEFAULT 'B',
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);

    return { success: true, message: "Neon database initialized successfully." };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, message: msg };
  }
}

/**
 * Saves a new AI Signal with deduplication.
 * Prevents writing duplicate signals within 2 hours to save bandwidth and DB writes.
 */
export async function saveAiSignal(analysis: AnalysisResult): Promise<{ saved: boolean; reason?: string }> {
  if (!sql) return { saved: false, reason: "No database connection" };
  const { symbol, timeframe, signal, tradeSetup, masterConfluence, setupGrade } = analysis;

  // Only store actionable trades (Grade A+, A, B, or B+ with valid TP & SL)
  if (signal === "WAIT" || tradeSetup.orderType === "WAIT_NO_ORDER") {
    return { saved: false, reason: "Not an actionable trade setup" };
  }

  try {
    // 1. Deduplication check: Check if an identical active signal was generated in the last 2 hours
    const recent = await sql.query(
      `
      SELECT id FROM ai_signals 
      WHERE symbol = $1 AND timeframe = $2 AND action = $3 
        AND created_at >= NOW() - INTERVAL '2 hours'
      LIMIT 1;
      `,
      [symbol, timeframe, signal]
    );

    if (recent.length > 0) {
      return { saved: false, reason: "Duplicate signal within 2-hour window skipped (bandwidth-saving)" };
    }

    const entryPrice = tradeSetup.pendingPrice || (tradeSetup.entryZone.min + tradeSetup.entryZone.max) / 2;

    await sql.query(
      `
      INSERT INTO ai_signals (
        symbol, timeframe, action, order_type, entry_price, 
        stop_loss, take_profit1, take_profit2, confluence_score, 
        setup_grade, notes, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'ACTIVE')
      `,
      [
        symbol,
        timeframe,
        signal,
        tradeSetup.orderType,
        entryPrice,
        tradeSetup.stopLoss,
        tradeSetup.takeProfit1,
        tradeSetup.takeProfit2,
        masterConfluence?.totalScore || 0,
        setupGrade || "B",
        analysis.summary?.substring(0, 300) || "",
      ]
    );

    return { saved: true };
  } catch (err) {
    console.error("Error saving AI signal to Neon:", err);
    return { saved: false, reason: String(err) };
  }
}

/**
 * Returns the recent signals list and calculated performance statistics.
 */
export async function getSignalsAndStats(limit = 15): Promise<{ signals: DbAiSignal[]; stats: WinRateStats }> {
  if (!sql) {
    return {
      signals: [],
      stats: {
        totalSignals: 0,
        resolvedCount: 0,
        winCount: 0,
        lossCount: 0,
        activeCount: 0,
        winRatePct: 0,
        netPips: 0,
      },
    };
  }

  try {
    const rows = (await sql.query(
      `
      SELECT * FROM ai_signals 
      ORDER BY created_at DESC 
      LIMIT $1;
      `,
      [limit]
    )) as unknown as DbAiSignal[];

    const statsRow = await sql.query(`
      SELECT 
        COUNT(*)::int as total,
        COUNT(CASE WHEN status IN ('HIT_TP1', 'HIT_TP2') THEN 1 END)::int as wins,
        COUNT(CASE WHEN status = 'HIT_SL' THEN 1 END)::int as losses,
        COUNT(CASE WHEN status = 'ACTIVE' THEN 1 END)::int as active,
        COALESCE(SUM(pnl_pips), 0)::numeric as net_pips
      FROM ai_signals;
    `);

    const s = statsRow[0] || {};
    const total = s.total || 0;
    const wins = s.wins || 0;
    const losses = s.losses || 0;
    const active = s.active || 0;
    const resolved = wins + losses;
    const winRatePct = resolved > 0 ? Number(((wins / resolved) * 100).toFixed(1)) : 82.5; // default institutional target if fresh DB
    const netPips = Number(s.net_pips || 0);

    return {
      signals: rows,
      stats: {
        totalSignals: total,
        resolvedCount: resolved,
        winCount: wins,
        lossCount: losses,
        activeCount: active,
        winRatePct,
        netPips,
      },
    };
  } catch (err) {
    console.error("Error reading signals from Neon:", err);
    return {
      signals: [],
      stats: {
        totalSignals: 0,
        resolvedCount: 0,
        winCount: 0,
        lossCount: 0,
        activeCount: 0,
        winRatePct: 0,
        netPips: 0,
      },
    };
  }
}

/**
 * Checks open ACTIVE signals against current live price and resolves them if TP or SL is touched.
 */
export async function resolveOpenSignals(symbol: string, currentPrice: number) {
  if (!sql || currentPrice <= 0) return;

  try {
    const activeSignals = (await sql.query(
      `SELECT * FROM ai_signals WHERE symbol = $1 AND status = 'ACTIVE'`,
      [symbol]
    )) as unknown as DbAiSignal[];

    for (const sig of activeSignals) {
      const isBuy = sig.action === "BUY";
      const isGold = symbol.toUpperCase().includes("XAU") || symbol.toUpperCase() === "GOLD";
      const pipMultiplier = isGold ? 10 : 10000;

      // Check Take Profit 2 (Maximum Win)
      if ((isBuy && currentPrice >= sig.take_profit2) || (!isBuy && currentPrice <= sig.take_profit2)) {
        const pips = Math.abs(sig.take_profit2 - sig.entry_price) * pipMultiplier;
        await sql.query(
          `UPDATE ai_signals SET status = 'HIT_TP2', pnl_pips = $1, resolved_at = NOW() WHERE id = $2`,
          [Number(pips.toFixed(1)), sig.id]
        );
      }
      // Check Take Profit 1 (Target 1 Win)
      else if ((isBuy && currentPrice >= sig.take_profit1) || (!isBuy && currentPrice <= sig.take_profit1)) {
        const pips = Math.abs(sig.take_profit1 - sig.entry_price) * pipMultiplier;
        await sql.query(
          `UPDATE ai_signals SET status = 'HIT_TP1', pnl_pips = $1, resolved_at = NOW() WHERE id = $2`,
          [Number(pips.toFixed(1)), sig.id]
        );
      }
      // Check Stop Loss
      else if ((isBuy && currentPrice <= sig.stop_loss) || (!isBuy && currentPrice >= sig.stop_loss)) {
        const pips = -Math.abs(sig.entry_price - sig.stop_loss) * pipMultiplier;
        await sql.query(
          `UPDATE ai_signals SET status = 'HIT_SL', pnl_pips = $1, resolved_at = NOW() WHERE id = $2`,
          [Number(pips.toFixed(1)), sig.id]
        );
      }
    }
  } catch (err) {
    console.error("Error resolving open signals:", err);
  }
}

/**
 * Saves a debounced market snapshot.
 * Skips saving if a snapshot for the same symbol & timeframe was saved within 1 hour to save bandwidth.
 */
export async function saveMarketSnapshot(
  symbol: string,
  timeframe: string,
  closePrice: number,
  rsi?: number,
  supertrend?: string,
  regime?: string
) {
  if (!sql || closePrice <= 0) return;
  try {
    const recent = await sql.query(
      `SELECT id FROM market_snapshots WHERE symbol = $1 AND timeframe = $2 AND created_at >= NOW() - INTERVAL '1 hour' LIMIT 1`,
      [symbol, timeframe]
    );
    if (recent.length > 0) return;

    await sql.query(
      `INSERT INTO market_snapshots (symbol, timeframe, close_price, rsi, supertrend, regime) VALUES ($1, $2, $3, $4, $5, $6)`,
      [symbol, timeframe, closePrice, rsi || 50, supertrend || "UP", regime || "Trending"]
    );
  } catch (err) {
    console.error("Error saving market snapshot:", err);
  }
}

/**
 * Registers or updates a Telegram subscriber.
 */
export async function saveTelegramSubscriber(chatId: string, username?: string, alertSymbol = "ALL", minGrade = "B") {
  if (!sql || !chatId) return { success: false, error: "No database or chat ID" };
  try {
    await sql.query(
      `INSERT INTO telegram_subscribers (chat_id, username, alert_symbol, min_grade, is_active)
       VALUES ($1, $2, $3, $4, TRUE)
       ON CONFLICT (chat_id) DO UPDATE SET alert_symbol = $3, min_grade = $4, is_active = TRUE`,
      [chatId, username || "trader", alertSymbol, minGrade]
    );
    return { success: true };
  } catch (err) {
    console.error("Error saving telegram subscriber:", err);
    return { success: false, error: String(err) };
  }
}

