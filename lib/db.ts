import { neon } from "@neondatabase/serverless";
import { AnalysisResult, Candle } from "./types";

// Safe singleton client for Neon Serverless Postgres
const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL || "";

export const sql = connectionString ? neon(connectionString) : null;

/**
 * Resilient query wrapper with exponential backoff for transient network issues.
 */
export async function resilientQuery<T = unknown[]>(
  queryText: string,
  params: unknown[] = [],
  retries = 1,
  delayMs = 200
): Promise<T> {
  if (!sql) return [] as unknown as T;
  try {
    return (await sql.query(queryText, params)) as unknown as T;
  } catch (err) {
    if (retries > 0) {
      await new Promise((r) => setTimeout(r, delayMs));
      return resilientQuery<T>(queryText, params, retries - 1, delayMs * 1.5);
    }
    throw err;
  }
}

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

    // 3. Table for Rolling Candlestick Buffer (FIFO Ring Buffer)
    await sql.query(`
      CREATE TABLE IF NOT EXISTS market_candles (
        id SERIAL PRIMARY KEY,
        symbol VARCHAR(20) NOT NULL,
        timeframe VARCHAR(10) NOT NULL,
        time BIGINT NOT NULL,
        open NUMERIC(14, 4) NOT NULL,
        high NUMERIC(14, 4) NOT NULL,
        low NUMERIC(14, 4) NOT NULL,
        close NUMERIC(14, 4) NOT NULL,
        volume NUMERIC(20, 4) DEFAULT 0,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        CONSTRAINT uq_candle_sym_tf_time UNIQUE (symbol, timeframe, time)
      )
    `);

    await sql.query(`
      CREATE INDEX IF NOT EXISTS idx_market_candles_lookup ON market_candles (symbol, timeframe, time DESC)
    `);

    // 4. Table for Closed-Loop Outcome Attribution & Self-Learning Lessons
    await sql.query(`
      CREATE TABLE IF NOT EXISTS signal_feedback_lessons (
        id SERIAL PRIMARY KEY,
        signal_id INT,
        symbol VARCHAR(20) NOT NULL,
        timeframe VARCHAR(10) NOT NULL,
        outcome VARCHAR(20) NOT NULL,
        pnl_pips NUMERIC(10, 2) DEFAULT 0,
        confluence_score INT DEFAULT 0,
        setup_grade VARCHAR(15),
        lesson_summary TEXT NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);

    await sql.query(`
      CREATE INDEX IF NOT EXISTS idx_feedback_lessons_sym_time ON signal_feedback_lessons (symbol, created_at DESC)
    `);

    // 5. Table for Adaptive Parameter & Dynamic Weight Storage
    await sql.query(`
      CREATE TABLE IF NOT EXISTS market_adaptive_params (
        id SERIAL PRIMARY KEY,
        symbol VARCHAR(20) NOT NULL,
        timeframe VARCHAR(10) NOT NULL,
        trend_weight INT DEFAULT 25,
        momentum_weight INT DEFAULT 20,
        squeeze_weight INT DEFAULT 20,
        volume_weight INT DEFAULT 15,
        smc_weight INT DEFAULT 20,
        min_confluence_threshold INT DEFAULT 70,
        recent_win_rate NUMERIC(5, 2) DEFAULT 80.0,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        CONSTRAINT uq_adaptive_sym_tf UNIQUE (symbol, timeframe)
      )
    `);

    return { success: true, message: "Neon database initialized successfully." };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, message: msg };
  }
}

// ─── Phase 2: Run after initial tables to add backtest_results ───
export async function initBacktestTable(): Promise<void> {
  if (!sql) return;
  try {
    await sql.query(`
      CREATE TABLE IF NOT EXISTS backtest_results (
        id SERIAL PRIMARY KEY,
        symbol VARCHAR(20) NOT NULL,
        timeframe VARCHAR(10) NOT NULL,
        trade_type VARCHAR(10) NOT NULL,
        entry_price NUMERIC(14, 4) NOT NULL,
        exit_price NUMERIC(14, 4) NOT NULL,
        stop_loss NUMERIC(14, 4),
        take_profit1 NUMERIC(14, 4),
        take_profit2 NUMERIC(14, 4),
        result VARCHAR(10) NOT NULL,
        pnl_r NUMERIC(6, 2) DEFAULT 0,
        pnl_pips NUMERIC(10, 2) DEFAULT 0,
        entry_time BIGINT,
        exit_time BIGINT,
        source VARCHAR(20) DEFAULT 'BACKTEST',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        CONSTRAINT uq_bt_sym_entry UNIQUE (symbol, timeframe, entry_time, trade_type)
      )
    `);
    await sql.query(`
      CREATE INDEX IF NOT EXISTS idx_bt_results_symbol ON backtest_results (symbol, result)
    `);
    await sql.query(`
      CREATE INDEX IF NOT EXISTS idx_bt_results_created ON backtest_results (created_at DESC)
    `);
  } catch (err) {
    console.error("Error creating backtest_results table:", err);
  }
}

/**
 * Saves a new AI Signal with deduplication.
 * Prevents writing duplicate signals within 2 hours to save bandwidth and DB writes.
 */
export async function saveAiSignal(analysis: AnalysisResult): Promise<{ saved: boolean; reason?: string }> {
  if (!sql) return { saved: false, reason: "No database connection" };
  const { symbol, timeframe, signal, tradeSetup, masterConfluence, setupGrade } = analysis;

  // Store all actionable trades (Grade B, B+, A, A+ with Confluence >= 52)
  if (
    signal === "WAIT" ||
    tradeSetup.orderType === "WAIT_NO_ORDER" ||
    (masterConfluence && masterConfluence.totalScore < 52)
  ) {
    return { saved: false, reason: "Signal skipped: Non-actionable or below confluence threshold (< 52)" };
  }

  try {
    const entryPrice = tradeSetup.pendingPrice || (tradeSetup.entryZone.min + tradeSetup.entryZone.max) / 2;

    // 1. Smart State-Transition & Deduplication Filter:
    // Check the latest recorded signal for this symbol and timeframe
    const latestRows = await resilientQuery<Array<{
      id: number;
      action: string;
      entry_price: number | string;
      status: string;
      created_at: string;
    }>>(
      `
      SELECT id, action, entry_price, status, created_at
      FROM ai_signals 
      WHERE symbol = $1 AND timeframe = $2
      ORDER BY created_at DESC
      LIMIT 1;
      `,
      [symbol, timeframe]
    );

    if (latestRows && latestRows.length > 0) {
      const latest = latestRows[0];
      const prevPrice = Number(latest.entry_price);
      const isSameDirection = latest.action === signal;
      const isStillActive = latest.status === "ACTIVE";

      // Price distance from previous entry (threshold approx 0.5% or entry zone width)
      const priceDistance = Math.abs(entryPrice - prevPrice);
      const threshold = Math.max(entryPrice * 0.005, 1);

      // If active, same direction, and price hasn't moved significantly, skip duplicate signal
      if (isStillActive && isSameDirection && priceDistance < threshold) {
        return { saved: false, reason: "Signal skipped: Active trade already exists within the same entry zone" };
      }
    }

    await resilientQuery(
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
 * Optionally filter by symbol. Includes per-symbol breakdown from merged live + backtest data.
 */
export async function getSignalsAndStats(
  limit = 15,
  filterSymbol?: string
): Promise<{ signals: DbAiSignal[]; stats: WinRateStats; perSymbolStats: PerSymbolStat[] }> {
  const emptyResult = {
    signals: [] as DbAiSignal[],
    stats: {
      totalSignals: 0,
      resolvedCount: 0,
      winCount: 0,
      lossCount: 0,
      activeCount: 0,
      winRatePct: 0,
      netPips: 0,
    },
    perSymbolStats: [] as PerSymbolStat[],
  };

  if (!sql) return emptyResult;

  try {
    // Signals query — optionally filtered by symbol
    const signalQuery = filterSymbol
      ? `SELECT * FROM ai_signals WHERE symbol = $1 ORDER BY created_at DESC LIMIT $2;`
      : `SELECT * FROM ai_signals ORDER BY created_at DESC LIMIT $1;`;
    const signalParams = filterSymbol ? [filterSymbol.toUpperCase(), limit] : [limit];

    const rows = (await sql.query(signalQuery, signalParams)) as unknown as DbAiSignal[];

    // Stats query — optionally filtered by symbol
    const statsQuery = filterSymbol
      ? `SELECT
           COUNT(*)::int as total,
           COUNT(CASE WHEN status IN ('HIT_TP1', 'HIT_TP2') THEN 1 END)::int as wins,
           COUNT(CASE WHEN status = 'HIT_SL' THEN 1 END)::int as losses,
           COUNT(CASE WHEN status = 'ACTIVE' THEN 1 END)::int as active,
           COALESCE(SUM(pnl_pips), 0)::numeric as net_pips
         FROM ai_signals WHERE symbol = $1;`
      : `SELECT
           COUNT(*)::int as total,
           COUNT(CASE WHEN status IN ('HIT_TP1', 'HIT_TP2') THEN 1 END)::int as wins,
           COUNT(CASE WHEN status = 'HIT_SL' THEN 1 END)::int as losses,
           COUNT(CASE WHEN status = 'ACTIVE' THEN 1 END)::int as active,
           COALESCE(SUM(pnl_pips), 0)::numeric as net_pips
         FROM ai_signals;`;
    const statsParams = filterSymbol ? [filterSymbol.toUpperCase()] : [];

    const statsRow = await sql.query(statsQuery, statsParams);

    const s = statsRow[0] || {};
    const total = s.total || 0;
    const wins = s.wins || 0;
    const losses = s.losses || 0;
    const active = s.active || 0;
    const resolved = wins + losses;
    const winRatePct = resolved > 0 ? Number(((wins / resolved) * 100).toFixed(1)) : 0;
    const netPips = Number(s.net_pips || 0);

    // Per-symbol breakdown (merged live + backtest)
    const perSymbolStats = await getPerSymbolWinRate();

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
      perSymbolStats,
    };
  } catch (err) {
    console.error("Error reading signals from Neon:", err);
    return emptyResult;
  }
}


/**
 * Checks open ACTIVE signals against current live price and resolves them if TP or SL is touched.
 * Closed-Loop Attribution: Records an educational lesson into signal_feedback_lessons on every resolution.
 */
export async function resolveOpenSignals(symbol: string, currentPrice: number) {
  if (!sql || currentPrice <= 0) return;

  try {
    const activeSignals = await resilientQuery<DbAiSignal[]>(
      `SELECT * FROM ai_signals WHERE symbol = $1 AND status = 'ACTIVE'`,
      [symbol]
    );

    const updates: Promise<unknown>[] = [];

    for (const sig of activeSignals) {
      const isBuy = sig.action.includes("BUY");
      const sym = symbol.toUpperCase();
      const isGold = sym.includes("XAU") || sym === "GOLD";
      const isCrypto = ["BTC", "ETH", "SOL", "BNB", "XRP", "ADA", "DOGE", "SUI", "AVAX", "LINK", "DOT"].some((c) => sym.includes(c));
      const pipMultiplier = isGold ? 10 : isCrypto ? 1 : sym.includes("JPY") ? 100 : 10000;

      let outcome: "HIT_TP2" | "HIT_TP1" | "HIT_SL" | null = null;
      let pips = 0;
      let lesson = "";

      // Check Take Profit 2 (Maximum Win)
      if ((isBuy && currentPrice >= sig.take_profit2) || (!isBuy && currentPrice <= sig.take_profit2)) {
        outcome = "HIT_TP2";
        pips = Math.abs(sig.take_profit2 - sig.entry_price) * pipMultiplier;
        lesson = `🎯 ชนะเป้าสูงสุด TP2 (+${pips.toFixed(1)} pips): สัญญาณ ${sig.action} สอดคล้องกับแนวโน้มหลักอย่างสมบูรณ์ (Confluence ${sig.confluence_score}%, เกรด ${sig.setup_grade})`;
        updates.push(
          resilientQuery(
            `UPDATE ai_signals SET status = 'HIT_TP2', pnl_pips = $1, resolved_at = NOW() WHERE id = $2`,
            [Number(pips.toFixed(1)), sig.id]
          )
        );
      }
      // Check Take Profit 1 (Target 1 Win)
      else if ((isBuy && currentPrice >= sig.take_profit1) || (!isBuy && currentPrice <= sig.take_profit1)) {
        outcome = "HIT_TP1";
        pips = Math.abs(sig.take_profit1 - sig.entry_price) * pipMultiplier;
        lesson = `✅ ชนะเป้าแรก TP1 (+${pips.toFixed(1)} pips): ราคาไปถึงเป้าหมายแรกได้ตามโครงสร้าง (Confluence ${sig.confluence_score}%) ก่อนเกิดการพักตัว`;
        updates.push(
          resilientQuery(
            `UPDATE ai_signals SET status = 'HIT_TP1', pnl_pips = $1, resolved_at = NOW() WHERE id = $2`,
            [Number(pips.toFixed(1)), sig.id]
          )
        );
      }
      // Check Stop Loss
      else if ((isBuy && currentPrice <= sig.stop_loss) || (!isBuy && currentPrice >= sig.stop_loss)) {
        outcome = "HIT_SL";
        pips = -Math.abs(sig.entry_price - sig.stop_loss) * pipMultiplier;
        lesson = `⚠️ ชนจุดตัดขาดทุน SL (${pips.toFixed(1)} pips): เกิดการทะลุหลอกหรือมีแรงกระชากขัดแย้งเทรนด์ (Confluence ${sig.confluence_score}%, เกรด ${sig.setup_grade}) ให้ระวังจุดเข้าในลักษณะนี้`;
        updates.push(
          resilientQuery(
            `UPDATE ai_signals SET status = 'HIT_SL', pnl_pips = $1, resolved_at = NOW() WHERE id = $2`,
            [Number(pips.toFixed(1)), sig.id]
          )
        );
      }

      // Record Attribution Lesson for Closed-Loop Learning
      if (outcome && lesson) {
        updates.push(
          resilientQuery(
            `INSERT INTO signal_feedback_lessons (signal_id, symbol, timeframe, outcome, pnl_pips, confluence_score, setup_grade, lesson_summary)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
            [sig.id, sig.symbol, sig.timeframe, outcome, Number(pips.toFixed(1)), sig.confluence_score, sig.setup_grade, lesson]
          )
        );
      }
    }

    if (updates.length > 0) {
      await Promise.all(updates);
    }

    // Trigger background data hygiene check (debounced every 6 hours)
    runDataHygiene().catch((err) => console.error("Data hygiene trigger error:", err));
  } catch (err) {
    console.error("Error resolving open signals in batch:", err);
  }
}

let lastPurgeTime = 0;
const PURGE_INTERVAL_MS = 6 * 3600 * 1000; // 6 hours

/**
 * Housekeeping Data Hygiene:
 * Purges old market snapshots (>14 days), feedback lessons (>30 days), and resolved signals (>60 days).
 * Keeps Neon Serverless Database permanently below 5MB to never exhaust free-tier limits.
 */
export async function runDataHygiene(): Promise<void> {
  if (!sql) return;
  const now = Date.now();
  if (now - lastPurgeTime < PURGE_INTERVAL_MS) return;
  lastPurgeTime = now;

  try {
    await Promise.all([
      sql.query(`DELETE FROM market_snapshots WHERE created_at < NOW() - INTERVAL '14 days'`),
      sql.query(`DELETE FROM signal_feedback_lessons WHERE created_at < NOW() - INTERVAL '30 days'`),
      sql.query(`DELETE FROM ai_signals WHERE status != 'ACTIVE' AND created_at < NOW() - INTERVAL '60 days'`),
    ]);
  } catch (err) {
    console.error("Error during background data hygiene purge:", err);
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

/**
 * Saves candles to Neon PostgreSQL in a rolling FIFO ring buffer.
 * Capped at `maxRetention` candles (default 200).
 * Automatically prunes the oldest candles past `maxRetention` using PostgreSQL OFFSET,
 * preventing database bloat and maintaining a constant storage footprint (<200KB per symbol/timeframe).
 */
export async function saveCandlesRollingBuffer(
  symbol: string,
  timeframe: string,
  candles: Candle[],
  maxRetention = 200
): Promise<void> {
  if (!sql || !candles || candles.length === 0) return;

  try {
    // Only process the latest `maxRetention` candles to minimize bandwidth & query size
    const toSave = candles.slice(-maxRetention);

    const valueClauses: string[] = [];
    const params: unknown[] = [];
    let paramIdx = 1;

    for (const c of toSave) {
      valueClauses.push(
        `($${paramIdx++}, $${paramIdx++}, $${paramIdx++}, $${paramIdx++}, $${paramIdx++}, $${paramIdx++}, $${paramIdx++}, $${paramIdx++})`
      );
      params.push(
        symbol.toUpperCase(),
        timeframe,
        Math.floor(c.time),
        c.open,
        c.high,
        c.low,
        c.close,
        c.volume || 0
      );
    }

    const batchInsertQuery = `
      INSERT INTO market_candles (symbol, timeframe, time, open, high, low, close, volume)
      VALUES ${valueClauses.join(", ")}
      ON CONFLICT (symbol, timeframe, time)
      DO UPDATE SET
        open = EXCLUDED.open,
        high = EXCLUDED.high,
        low = EXCLUDED.low,
        close = EXCLUDED.close,
        volume = EXCLUDED.volume;
    `;

    await resilientQuery(batchInsertQuery, params);

    // FIFO Pruning: Keep only the latest `maxRetention` candles, delete older ones
    await resilientQuery(
      `
      DELETE FROM market_candles
      WHERE id IN (
        SELECT id FROM market_candles
        WHERE symbol = $1 AND timeframe = $2
        ORDER BY time DESC
        OFFSET $3
      );
      `,
      [symbol.toUpperCase(), timeframe, maxRetention]
    );
  } catch (err) {
    console.error(`Error saving candles rolling buffer for ${symbol} (${timeframe}):`, err);
  }
}

/**
 * Retrieves the latest cached candles from Neon PostgreSQL rolling buffer.
 * Returns up to `limit` candles sorted in ascending chronological order (ready for chart rendering).
 */
export async function getCachedCandles(
  symbol: string,
  timeframe: string,
  limit = 200
): Promise<Candle[]> {
  if (!sql) return [];

  try {
    const rows = await resilientQuery<Array<{
      time: string | number;
      open: string | number;
      high: string | number;
      low: string | number;
      close: string | number;
      volume: string | number;
    }>>(
      `
      SELECT time, open, high, low, close, volume FROM (
        SELECT time, open, high, low, close, volume
        FROM market_candles
        WHERE symbol = $1 AND timeframe = $2
        ORDER BY time DESC
        LIMIT $3
      ) sub
      ORDER BY time ASC;
      `,
      [symbol.toUpperCase(), timeframe, limit]
    );

    if (!rows || rows.length === 0) return [];

    return rows.map((r) => ({
      time: Number(r.time),
      open: Number(r.open),
      high: Number(r.high),
      low: Number(r.low),
      close: Number(r.close),
      volume: Number(r.volume || 0),
    }));
  } catch (err) {
    console.error(`Error getting cached candles from Neon for ${symbol} (${timeframe}):`, err);
    return [];
  }
}

export interface AdaptiveWeightsConfig {
  trendWeight: number;
  momentumWeight: number;
  squeezeWeight: number;
  volumeWeight: number;
  smcWeight: number;
  minScoreThreshold: number;
  recentWinRate: number;
  isSelfTuned: boolean;
}

/**
 * Retrieves recent closed-loop trading lessons for Gemini AI Few-Shot Contextual Learning.
 */
export async function getRecentLessons(symbol: string, limit = 4): Promise<string[]> {
  if (!sql) return [];
  try {
    const rows = (await sql.query(
      `
      SELECT outcome, pnl_pips, setup_grade, lesson_summary, created_at
      FROM signal_feedback_lessons
      WHERE symbol = $1 OR symbol = 'ALL'
      ORDER BY created_at DESC
      LIMIT $2;
      `,
      [symbol.toUpperCase(), limit]
    )) as unknown as Array<{
      outcome: string;
      pnl_pips: number;
      setup_grade: string;
      lesson_summary: string;
    }>;

    if (!rows || rows.length === 0) {
      return [
        `การเข้าเทรดทองคำ (XAUUSD) และคู่เงินหลัก ให้รอราคาย่อตัวเข้าสู่ Value Zone ใกล้เส้น EMA20/50 ก่อนเสมอ ห้ามไล่ราคาเกิน 2.0 ATR`,
        `ในตลาดที่มีความผันผวนสูง (High Volatility) สัญญาณเกรด A/A+ ที่มี Confluence Score >= 80% ให้ความแม่นยำสูงสุด`,
        `หลีกเลี่ยงการเปิดสถานะใหม่ช่วงก่อนข่าวแดง (High-Impact News) ออก 15 นาที เพื่อป้องกัน Slippage และ False Breakout`,
      ];
    }

    return rows.map(
      (r) =>
        `[${r.outcome === "HIT_TP2" ? "WIN_TP2" : r.outcome === "HIT_TP1" ? "WIN_TP1" : "LOSS_SL"}] ${r.lesson_summary}`
    );
  } catch (err) {
    console.error(`Error getting recent lessons for ${symbol}:`, err);
    return [];
  }
}

/**
 * Dynamically self-tunes indicator pillar weights and gating thresholds
 * based on actual live win/loss performance from Neon DB.
 */
export async function getAdaptiveWeights(symbol: string): Promise<AdaptiveWeightsConfig> {
  const defaults: AdaptiveWeightsConfig = {
    trendWeight: 25,
    momentumWeight: 20,
    squeezeWeight: 20,
    volumeWeight: 15,
    smcWeight: 20,
    minScoreThreshold: 70,
    recentWinRate: 0,
    isSelfTuned: false,
  };

  if (!sql) return defaults;

  try {
    // Check if recently computed within 4 hours
    const cached = (await sql.query(
      `SELECT * FROM market_adaptive_params WHERE symbol = $1 AND updated_at >= NOW() - INTERVAL '4 hours' LIMIT 1`,
      [symbol.toUpperCase()]
    )) as unknown as Array<{
      trend_weight: number;
      momentum_weight: number;
      squeeze_weight: number;
      volume_weight: number;
      smc_weight: number;
      min_confluence_threshold: number;
      recent_win_rate: number;
    }>;

    if (cached && cached.length > 0) {
      const c = cached[0];
      return {
        trendWeight: Number(c.trend_weight) || 25,
        momentumWeight: Number(c.momentum_weight) || 20,
        squeezeWeight: Number(c.squeeze_weight) || 20,
        volumeWeight: Number(c.volume_weight) || 15,
        smcWeight: Number(c.smc_weight) || 20,
        minScoreThreshold: Number(c.min_confluence_threshold) || 70,
        recentWinRate: Number(c.recent_win_rate) || 0,
        isSelfTuned: true,
      };
    }

    // Query historical outcomes for this symbol
    const stats = (await sql.query(
      `
      SELECT 
        COUNT(*)::int as total,
        COUNT(CASE WHEN outcome IN ('HIT_TP1', 'HIT_TP2') THEN 1 END)::int as wins,
        COUNT(CASE WHEN outcome = 'HIT_SL' THEN 1 END)::int as losses
      FROM signal_feedback_lessons
      WHERE symbol = $1 OR symbol = 'ALL'
      `,
      [symbol.toUpperCase()]
    )) as unknown as Array<{ total: number; wins: number; losses: number }>;

    const total = stats[0]?.total || 0;
    const wins = stats[0]?.wins || 0;
    const winRate = total >= 4 ? Number(((wins / total) * 100).toFixed(1)) : (total > 0 ? Number(((wins / total) * 100).toFixed(1)) : 0);

    let trend = 25;
    let momentum = 20;
    let squeeze = 20;
    let volume = 15;
    let smc = 20;
    let minThreshold = 70;
    let isSelfTuned = false;

    if (total >= 4) {
      isSelfTuned = true;
      if (winRate < 75) {
        // Tough/choppy regime -> Strengthen trend following and institutional levels, tighten entry gating
        trend = 30;
        momentum = 15;
        squeeze = 15;
        volume = 15;
        smc = 25;
        minThreshold = 80; // Only allow Grade A/A+ setups
      } else if (winRate >= 85) {
        // High trend alignment -> Reward momentum continuation
        trend = 25;
        momentum = 25;
        squeeze = 15;
        volume = 15;
        smc = 20;
        minThreshold = 68;
      }
    }

    // Cache to market_adaptive_params
    await sql.query(
      `
      INSERT INTO market_adaptive_params (
        symbol, timeframe, trend_weight, momentum_weight, squeeze_weight, volume_weight, smc_weight, min_confluence_threshold, recent_win_rate, updated_at
      ) VALUES ($1, '1h', $2, $3, $4, $5, $6, $7, $8, NOW())
      ON CONFLICT (symbol, timeframe) DO UPDATE SET
        trend_weight = EXCLUDED.trend_weight,
        momentum_weight = EXCLUDED.momentum_weight,
        squeeze_weight = EXCLUDED.squeeze_weight,
        volume_weight = EXCLUDED.volume_weight,
        smc_weight = EXCLUDED.smc_weight,
        min_confluence_threshold = EXCLUDED.min_confluence_threshold,
        recent_win_rate = EXCLUDED.recent_win_rate,
        updated_at = NOW()
      `,
      [symbol.toUpperCase(), trend, momentum, squeeze, volume, smc, minThreshold, winRate]
    );

    return {
      trendWeight: trend,
      momentumWeight: momentum,
      squeezeWeight: squeeze,
      volumeWeight: volume,
      smcWeight: smc,
      minScoreThreshold: minThreshold,
      recentWinRate: winRate,
      isSelfTuned,
    };
  } catch (err) {
    console.error(`Error calculating adaptive weights for ${symbol}:`, err);
    return defaults;
  }
}

// ─── BACKTEST RESULTS & PER-SYMBOL WIN RATE ───

export interface BacktestTrade {
  type: "BUY" | "SELL";
  entryPrice: number;
  exitPrice: number;
  sl: number;
  tp1: number;
  tp2: number;
  result: "WIN" | "LOSS" | "BE";
  pnlR: number;
  pnlPips: number;
  entryTime: number;
  exitTime: number;
}

/**
 * Saves backtest trade results to Neon DB with ON CONFLICT DO NOTHING deduplication.
 */
export async function saveBacktestResults(
  symbol: string,
  timeframe: string,
  trades: BacktestTrade[]
): Promise<{ saved: number; skipped: number }> {
  if (!sql || !trades || trades.length === 0) return { saved: 0, skipped: 0 };

  try {
    // Ensure table exists
    await initBacktestTable();

    let saved = 0;
    for (const t of trades) {
      try {
        await resilientQuery(
          `INSERT INTO backtest_results
            (symbol, timeframe, trade_type, entry_price, exit_price, stop_loss, take_profit1, take_profit2, result, pnl_r, pnl_pips, entry_time, exit_time, source)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, 'BACKTEST')
           ON CONFLICT (symbol, timeframe, entry_time, trade_type) DO NOTHING`,
          [
            symbol.toUpperCase(),
            timeframe,
            t.type,
            t.entryPrice,
            t.exitPrice,
            t.sl,
            t.tp1,
            t.tp2,
            t.result,
            t.pnlR,
            t.pnlPips,
            t.entryTime,
            t.exitTime,
          ]
        );
        saved++;
      } catch {
        // Skip individual insert errors (duplicates handled by ON CONFLICT)
      }
    }
    return { saved, skipped: trades.length - saved };
  } catch (err) {
    console.error(`Error saving backtest results for ${symbol}:`, err);
    return { saved: 0, skipped: trades.length };
  }
}

/**
 * Clears backtest results for a specific symbol or all symbols.
 */
export async function clearBacktestResults(symbol?: string): Promise<boolean> {
  if (!sql) return false;
  try {
    await initBacktestTable();
    if (symbol && symbol.toUpperCase() !== "ALL") {
      await sql.query(`DELETE FROM backtest_results WHERE symbol = $1`, [symbol.toUpperCase()]);
    } else {
      await sql.query(`DELETE FROM backtest_results`);
    }
    return true;
  } catch (err) {
    console.error("Error clearing backtest results:", err);
    return false;
  }
}

export interface PerSymbolStat {
  symbol: string;
  name?: string;
  category?: string;
  totalTrades: number;
  wins: number;
  losses: number;
  breakeven: number;
  winRatePct: number;
  netPips: number;
  liveTrades: number;
  backtestTrades: number;
}

/**
 * Returns per-symbol win rate breakdown merged from live signals + backtest results.
 */
export async function getPerSymbolWinRate(): Promise<PerSymbolStat[]> {
  if (!sql) return [];

  try {
    // Ensure backtest table exists
    await initBacktestTable();

    const rows = await sql.query(`
      SELECT
        symbol,
        COUNT(*)::int as total_trades,
        COUNT(CASE WHEN result IN ('WIN','HIT_TP1','HIT_TP2') THEN 1 END)::int as wins,
        COUNT(CASE WHEN result IN ('LOSS','HIT_SL') THEN 1 END)::int as losses,
        COUNT(CASE WHEN result = 'BE' THEN 1 END)::int as breakeven,
        COALESCE(SUM(pnl_pips), 0)::numeric as net_pips,
        COUNT(CASE WHEN source = 'LIVE' THEN 1 END)::int as live_trades,
        COUNT(CASE WHEN source = 'BACKTEST' THEN 1 END)::int as backtest_trades
      FROM (
        SELECT symbol, status as result, pnl_pips, 'LIVE' as source
        FROM ai_signals WHERE status != 'ACTIVE'
        UNION ALL
        SELECT symbol, result, pnl_pips, 'BACKTEST' as source
        FROM backtest_results
      ) combined
      GROUP BY symbol
      ORDER BY total_trades DESC;
    `) as unknown as Array<{
      symbol: string;
      total_trades: number;
      wins: number;
      losses: number;
      breakeven: number;
      net_pips: number | string;
      live_trades: number;
      backtest_trades: number;
    }>;

    if (!rows || rows.length === 0) return [];

    return rows.map((r) => {
      const resolved = (r.wins || 0) + (r.losses || 0);
      return {
        symbol: r.symbol,
        totalTrades: r.total_trades || 0,
        wins: r.wins || 0,
        losses: r.losses || 0,
        breakeven: r.breakeven || 0,
        winRatePct: resolved > 0 ? Number(((r.wins / resolved) * 100).toFixed(1)) : 0,
        netPips: Number(r.net_pips || 0),
        liveTrades: r.live_trades || 0,
        backtestTrades: r.backtest_trades || 0,
      };
    });
  } catch (err) {
    console.error("Error getting per-symbol win rate:", err);
    return [];
  }
}

export interface EquityPoint {
  index: number;
  symbol: string;
  pnlPips: number;
  cumulativePips: number;
  result: "WIN" | "LOSS" | "BE";
  time: string;
}

export interface QuantitativeAnalytics {
  profitFactor: number;
  maxDrawdownPips: number;
  maxDrawdownPct: number;
  realizedRR: number;
  winStreak: number;
  lossStreak: number;
  recoveryFactor: number;
  bestAsset: { symbol: string; winRatePct: number; netPips: number } | null;
  equityCurve: EquityPoint[];
}

/**
 * Computes Cumulative Equity Curve points and Institutional Quantitative Analytics
 */
export async function getEquityCurveAndAnalytics(filterSymbol?: string): Promise<QuantitativeAnalytics> {
  const emptyAnalytics: QuantitativeAnalytics = {
    profitFactor: 0,
    maxDrawdownPips: 0,
    maxDrawdownPct: 0,
    realizedRR: 0,
    winStreak: 0,
    lossStreak: 0,
    recoveryFactor: 0,
    bestAsset: null,
    equityCurve: [{ index: 0, symbol: "START", pnlPips: 0, cumulativePips: 0, result: "BE", time: "Start" }],
  };

  if (!sql) return emptyAnalytics;

  try {
    await initBacktestTable();

    const query = filterSymbol
      ? `
      SELECT symbol, pnl_pips, result, trade_time
      FROM (
        SELECT symbol, pnl_pips::numeric as pnl_pips,
          CASE WHEN status IN ('HIT_TP1', 'HIT_TP2') THEN 'WIN'
               WHEN status = 'HIT_SL' THEN 'LOSS'
               ELSE 'BE' END as result,
          COALESCE(resolved_at, created_at) as trade_time
        FROM ai_signals WHERE status IN ('HIT_TP1', 'HIT_TP2', 'HIT_SL') AND symbol = $1
        UNION ALL
        SELECT symbol, pnl_pips::numeric as pnl_pips, result,
          TO_TIMESTAMP(COALESCE(exit_time, entry_time) / 1000)::timestamp as trade_time
        FROM backtest_results WHERE symbol = $1
      ) combined
      WHERE pnl_pips IS NOT NULL
      ORDER BY trade_time ASC
      LIMIT 150;
      `
      : `
      SELECT symbol, pnl_pips, result, trade_time
      FROM (
        SELECT symbol, pnl_pips::numeric as pnl_pips,
          CASE WHEN status IN ('HIT_TP1', 'HIT_TP2') THEN 'WIN'
               WHEN status = 'HIT_SL' THEN 'LOSS'
               ELSE 'BE' END as result,
          COALESCE(resolved_at, created_at) as trade_time
        FROM ai_signals WHERE status IN ('HIT_TP1', 'HIT_TP2', 'HIT_SL')
        UNION ALL
        SELECT symbol, pnl_pips::numeric as pnl_pips, result,
          TO_TIMESTAMP(COALESCE(exit_time, entry_time) / 1000)::timestamp as trade_time
        FROM backtest_results
      ) combined
      WHERE pnl_pips IS NOT NULL
      ORDER BY trade_time ASC
      LIMIT 150;
      `;

    const params = filterSymbol ? [filterSymbol.toUpperCase()] : [];
    const rows = (await sql.query(query, params)) as unknown as Array<{
      symbol: string;
      pnl_pips: number | string;
      result: "WIN" | "LOSS" | "BE";
      trade_time: string | Date;
    }>;

    if (!rows || rows.length === 0) return emptyAnalytics;

    let cumulativePips = 0;
    let grossProfit = 0;
    let grossLoss = 0;
    let winsCount = 0;
    let lossCount = 0;
    let peakPips = 0;
    let maxDrawdown = 0;
    let curWinStreak = 0;
    let maxWinStreak = 0;
    let curLossStreak = 0;
    let maxLossStreak = 0;

    const equityCurve: EquityPoint[] = [
      { index: 0, symbol: "START", pnlPips: 0, cumulativePips: 0, result: "BE", time: "Start" },
    ];

    rows.forEach((row, i) => {
      const pnl = Number(row.pnl_pips || 0);
      cumulativePips = Number((cumulativePips + pnl).toFixed(1));

      if (pnl > 0) {
        grossProfit += pnl;
        winsCount++;
        curWinStreak++;
        curLossStreak = 0;
        if (curWinStreak > maxWinStreak) maxWinStreak = curWinStreak;
      } else if (pnl < 0) {
        grossLoss += Math.abs(pnl);
        lossCount++;
        curLossStreak++;
        curWinStreak = 0;
        if (curLossStreak > maxLossStreak) maxLossStreak = curLossStreak;
      }

      if (cumulativePips > peakPips) {
        peakPips = cumulativePips;
      }
      const dd = peakPips - cumulativePips;
      if (dd > maxDrawdown) {
        maxDrawdown = dd;
      }

      const timeStr = row.trade_time ? new Date(row.trade_time).toLocaleDateString("th-TH", { month: "short", day: "numeric" }) : `#${i + 1}`;

      equityCurve.push({
        index: i + 1,
        symbol: row.symbol,
        pnlPips: pnl,
        cumulativePips,
        result: row.result || (pnl > 0 ? "WIN" : pnl < 0 ? "LOSS" : "BE"),
        time: timeStr,
      });
    });

    const profitFactor = grossLoss > 0 ? Number((grossProfit / grossLoss).toFixed(2)) : grossProfit > 0 ? 9.99 : 0;
    const avgWin = winsCount > 0 ? grossProfit / winsCount : 0;
    const avgLoss = lossCount > 0 ? grossLoss / lossCount : 0;
    const realizedRR = avgLoss > 0 ? Number((avgWin / avgLoss).toFixed(2)) : avgWin > 0 ? 2.0 : 0;
    const recoveryFactor = maxDrawdown > 0 ? Number((cumulativePips / maxDrawdown).toFixed(2)) : cumulativePips > 0 ? 9.99 : 0;
    const maxDrawdownPct = peakPips > 0 ? Number(((maxDrawdown / peakPips) * 100).toFixed(1)) : 0;

    // Determine Best Performing Asset
    const perSymbol = await getPerSymbolWinRate();
    let bestAsset: { symbol: string; winRatePct: number; netPips: number } | null = null;
    if (perSymbol && perSymbol.length > 0) {
      const sorted = [...perSymbol].sort((a, b) => b.netPips - a.netPips);
      if (sorted[0] && sorted[0].netPips > 0) {
        bestAsset = {
          symbol: sorted[0].symbol,
          winRatePct: sorted[0].winRatePct,
          netPips: sorted[0].netPips,
        };
      }
    }

    return {
      profitFactor,
      maxDrawdownPips: Number(maxDrawdown.toFixed(1)),
      maxDrawdownPct,
      realizedRR,
      winStreak: maxWinStreak,
      lossStreak: maxLossStreak,
      recoveryFactor,
      bestAsset,
      equityCurve,
    };
  } catch (err) {
    console.error("Error computing equity curve and analytics:", err);
    return emptyAnalytics;
  }
}
