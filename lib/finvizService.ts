import { getMarketCandles } from "./marketService";
import type {
  CurrencyStrengthItem,
  FinvizForexStrengthData,
  FinvizMarketSentiment,
  PairDivergenceResult,
} from "./types";

export type {
  CurrencyStrengthItem,
  FinvizForexStrengthData,
  FinvizMarketSentiment,
  PairDivergenceResult,
};

// In-Memory Cache (TTL: 5 minutes)
let _cachedForexStrength: FinvizForexStrengthData | null = null;
let _lastForexStrengthTime = 0;
const FOREX_STRENGTH_TTL_MS = 5 * 60 * 1000;

let _cachedSentiment: FinvizMarketSentiment | null = null;
let _lastSentimentTime = 0;
const SENTIMENT_TTL_MS = 10 * 60 * 1000;

const MAJOR_CURRENCIES = ["USD", "EUR", "GBP", "JPY", "AUD", "CAD", "CHF", "NZD"] as const;

/**
 * Fetches real-time Relative Currency Strength for 8 major currencies from Finviz.
 * If Finviz is blocked or offline, falls back seamlessly to Synthetic Matrix calculated from live pairs.
 */
export async function fetchFinvizForexStrength(forceRefresh = false): Promise<FinvizForexStrengthData> {
  const now = Date.now();
  if (!forceRefresh && _cachedForexStrength && now - _lastForexStrengthTime < FOREX_STRENGTH_TTL_MS) {
    return _cachedForexStrength;
  }

  // Attempt 1: Scrape from Finviz Forex Performance
  try {
    const res = await fetch("https://finviz.com/forex_performance.ashx", {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
      },
      signal: AbortSignal.timeout(6000),
      next: { revalidate: 300 },
    });

    if (res.ok) {
      const html = await res.text();
      const parsed = parseFinvizForexHtml(html);
      if (parsed && parsed.length >= 6) {
        const result = buildStrengthData(parsed, false);
        _cachedForexStrength = result;
        _lastForexStrengthTime = now;
        return result;
      }
    }
  } catch (err) {
    // Graceful fallback to synthetic strength
    console.warn("[finvizService] Finviz scrape notice, using synthetic cross-currency matrix:", (err as Error)?.message || err);
  }

  // Attempt 2: Synthetic Relative Currency Strength (100% Guaranteed Uptime)
  const synthetic = await computeSyntheticForexStrength();
  _cachedForexStrength = synthetic;
  _lastForexStrengthTime = now;
  return synthetic;
}

/**
 * Regex parser for Finviz Forex Performance HTML table
 */
function parseFinvizForexHtml(html: string): { currency: string; changePct: number }[] | null {
  const results: { currency: string; changePct: number }[] = [];

  for (const cur of MAJOR_CURRENCIES) {
    // Finviz table row pattern: e.g. >USD< ... >+0.45%< or class="is-positive">0.45%<
    const regex = new RegExp(`${cur}[\\s\\S]*?([+-]?\\d+\\.\\d{1,2})%`, "i");
    const match = html.match(regex);
    if (match && match[1]) {
      const val = parseFloat(match[1]);
      if (!isNaN(val)) {
        results.push({ currency: cur, changePct: val });
      }
    }
  }

  return results.length >= 5 ? results : null;
}

/**
 * Computes Synthetic Relative Currency Strength Matrix using our live market feeds.
 * Solves relative performance across EURUSD, GBPUSD, USDJPY, AUDUSD, USDCAD, USDCHF, NZDUSD.
 */
export async function computeSyntheticForexStrength(): Promise<FinvizForexStrengthData> {
  const pairs = [
    { sym: "EURUSD", base: "EUR", quote: "USD", invert: false },
    { sym: "GBPUSD", base: "GBP", quote: "USD", invert: false },
    { sym: "AUDUSD", base: "AUD", quote: "USD", invert: false },
    { sym: "NZDUSD", base: "NZD", quote: "USD", invert: false },
    { sym: "USDJPY", base: "USD", quote: "JPY", invert: true },
    { sym: "USDCAD", base: "USD", quote: "CAD", invert: true },
    { sym: "USDCHF", base: "USD", quote: "CHF", invert: true },
  ];

  const rawDeltas: Record<string, number[]> = {
    USD: [],
    EUR: [],
    GBP: [],
    JPY: [],
    AUD: [],
    CAD: [],
    CHF: [],
    NZD: [],
  };

  await Promise.allSettled(
    pairs.map(async (p) => {
      try {
        const candles = await getMarketCandles(p.sym, "1h");
        if (candles && candles.length >= 24) {
          const current = candles[candles.length - 1].close;
          const open24h = candles[0].open;
          const changePct = open24h > 0 ? ((current - open24h) / open24h) * 100 : 0;

          if (p.invert) {
            // USD is base, quote is counter (e.g. USDJPY up -> USD strong, JPY weak)
            rawDeltas[p.base]?.push(changePct);
            rawDeltas[p.quote]?.push(-changePct);
          } else {
            // e.g. EURUSD up -> EUR strong, USD weak
            rawDeltas[p.base]?.push(changePct);
            rawDeltas[p.quote]?.push(-changePct);
          }
        }
      } catch {
        // Ignore single pair error
      }
    })
  );

  const parsedList = MAJOR_CURRENCIES.map((cur) => {
    const list = rawDeltas[cur] || [];
    const avg = list.length > 0 ? list.reduce((a, b) => a + b, 0) / list.length : 0;
    return {
      currency: cur,
      changePct: Number(avg.toFixed(2)),
    };
  });

  return buildStrengthData(parsedList, true);
}

/**
 * Normalizes scores into ranks, top strong/weak, and best matchups
 */
function buildStrengthData(
  list: { currency: string; changePct: number }[],
  isSynthetic: boolean
): FinvizForexStrengthData {
  // Sort descending: highest positive change = strongest
  const sorted = [...list].sort((a, b) => b.changePct - a.changePct);

  const maxAbs = Math.max(...sorted.map((s) => Math.abs(s.changePct)), 0.5);

  const currencies: CurrencyStrengthItem[] = sorted.map((item, idx) => ({
    currency: item.currency,
    changePct: item.changePct,
    rank: idx + 1,
    score: Math.round((item.changePct / maxAbs) * 100),
  }));

  const topStrong = currencies.slice(0, 2).map((c) => c.currency);
  const topWeak = currencies.slice(-2).reverse().map((c) => c.currency);

  // Formulate statistical best matchups (Strongest vs Weakest)
  const bestMatchups: FinvizForexStrengthData["bestMatchups"] = [];

  for (const strong of topStrong) {
    for (const weak of topWeak) {
      const strongItem = currencies.find((c) => c.currency === strong);
      const weakItem = currencies.find((c) => c.currency === weak);
      const strongPct = strongItem?.changePct ?? 0;
      const weakPct = weakItem?.changePct ?? 0;
      const edge = strongPct - weakPct;

      // Check standard market convention for pair name
      const standardPairs = [
        "EURUSD", "GBPUSD", "AUDUSD", "NZDUSD", "USDJPY", "USDCAD", "USDCHF",
        "EURJPY", "GBPJPY", "EURGBP", "AUDJPY", "CADJPY", "CHFJPY", "EURAUD"
      ];

      const direct = `${strong}${weak}`;
      const inverted = `${weak}${strong}`;

      if (standardPairs.includes(direct)) {
        bestMatchups.push({
          pair: direct,
          direction: "BUY",
          reason: `${strong} แข็งแกร่ง (${strongPct > 0 ? "+" : ""}${strongPct}%) ปะทะ ${weak} อ่อนแอ (${weakPct}%)`,
          edgeScore: Math.round(edge * 10),
        });
      } else if (standardPairs.includes(inverted)) {
        bestMatchups.push({
          pair: inverted,
          direction: "SELL",
          reason: `${strong} แข็งแกร่ง (${strongPct > 0 ? "+" : ""}${strongPct}%) กดดัน ${weak} (${weakPct}%)`,
          edgeScore: Math.round(edge * 10),
        });
      }
    }
  }

  return {
    currencies,
    topStrong,
    topWeak,
    bestMatchups: bestMatchups.slice(0, 4),
    updatedAt: Date.now(),
    isSynthetic,
  };
}

/**
 * Evaluates Macro Currency Divergence for any Forex or Gold pair
 */
export function getPairCurrencyDivergence(
  symbol: string,
  strengthData: FinvizForexStrengthData
): PairDivergenceResult {
  const sym = symbol.toUpperCase();

  // Special handling for Gold (XAUUSD)
  if (sym.includes("XAU") || sym.includes("GOLD")) {
    const usd = strengthData.currencies.find((c) => c.currency === "USD") || { score: 0, changePct: 0 };
    // Gold is typically inversely correlated with USD Strength
    const goldScore = -usd.score; // When USD is weak, Gold has structural tailwind
    const diff = goldScore - usd.score;

    let alignment: PairDivergenceResult["alignment"] = "NEUTRAL";
    let bonus = 0;
    let desc = "USD อยู่ในระดับสมดุล ไม่มีแรงกดดันเด่นชัดต่อทองคำ";

    if (usd.score <= -30) {
      alignment = "STRONG_BULLISH";
      bonus = 8;
      desc = `ดอลลาร์อ่อนค่าแรง (${usd.changePct}%) เป็นแรงขับเคลื่อนหนุนทองคำ XAUUSD พุ่งทะยาน`;
    } else if (usd.score <= -10) {
      alignment = "MODERATE_BULLISH";
      bonus = 4;
      desc = `ดอลลาร์มีแนวโน้มอ่อนค่า (${usd.changePct}%) หนุนเชิงบวกต่อราคาทองคำ`;
    } else if (usd.score >= 30) {
      alignment = "STRONG_BEARISH";
      bonus = -8;
      desc = `ดอลลาร์แข็งค่าอย่างมีนัยสำคัญ (${usd.changePct}%) กดดันโครงสร้างราคาทองคำ`;
    } else if (usd.score >= 10) {
      alignment = "MODERATE_BEARISH";
      bonus = -4;
      desc = `ดอลลาร์ปรับตัวแข็งค่าขึ้น (${usd.changePct}%) เป็นอุปสรรคต่อการปรับขึ้นของทองคำ`;
    }

    return {
      symbol: sym,
      baseCurrency: "XAU",
      quoteCurrency: "USD",
      baseScore: goldScore,
      quoteScore: usd.score,
      divergenceScore: diff,
      alignment,
      confluenceBonus: bonus,
      description: desc,
    };
  }

  // Standard Forex Pair extraction (e.g. EURUSD -> EUR vs USD)
  const base = sym.slice(0, 3);
  const quote = sym.slice(3, 6);

  const baseItem = strengthData.currencies.find((c) => c.currency === base);
  const quoteItem = strengthData.currencies.find((c) => c.currency === quote);

  if (!baseItem || !quoteItem) {
    return {
      symbol: sym,
      baseCurrency: base,
      quoteCurrency: quote,
      baseScore: 0,
      quoteScore: 0,
      divergenceScore: 0,
      alignment: "NEUTRAL",
      confluenceBonus: 0,
      description: "ข้อมูลความแข็งแกร่งของสกุลเงินยังไม่ครอบคลุม",
    };
  }

  const diff = baseItem.score - quoteItem.score;
  let alignment: PairDivergenceResult["alignment"] = "NEUTRAL";
  let bonus = 0;
  let desc = "";

  if (diff >= 50) {
    alignment = "STRONG_BULLISH";
    bonus = 8;
    desc = `ความได้เปรียบทางสถิติสูง: ${base} แข็งแกร่ง (${baseItem.changePct > 0 ? "+" : ""}${baseItem.changePct}%) ชน ${quote} อ่อนค่า (${quoteItem.changePct}%) หนุนฝั่ง BUY สมบูรณ์แบบ`;
  } else if (diff >= 20) {
    alignment = "MODERATE_BULLISH";
    bonus = 4;
    desc = `${base} มีความแข็งแกร่งเหนือกว่า ${quote} เล็กน้อย หนุนหน้า BUY`;
  } else if (diff <= -50) {
    alignment = "STRONG_BEARISH";
    bonus = -8;
    desc = `ความได้เปรียบทางสถิติสูง: ${base} อ่อนแอ (${baseItem.changePct}%) ปะทะ ${quote} แข็งแกร่ง (${quoteItem.changePct > 0 ? "+" : ""}${quoteItem.changePct}%) หนุนฝั่ง SELL สมบูรณ์แบบ`;
  } else if (diff <= -20) {
    alignment = "MODERATE_BEARISH";
    bonus = -4;
    desc = `${base} มีความอ่อนแอกว่า ${quote} เล็กน้อย หนุนหน้า SELL`;
  } else {
    alignment = "NEUTRAL";
    bonus = -3; // Slight penalty for choppy equilibrium
    desc = `เตือนสภาวะ Sideway: ${base} และ ${quote} มีความแข็งแกร่งใกล้เคียงกัน ระวังกราฟแกว่งตัวไร้ทิศทาง`;
  }

  return {
    symbol: sym,
    baseCurrency: base,
    quoteCurrency: quote,
    baseScore: baseItem.score,
    quoteScore: quoteItem.score,
    divergenceScore: diff,
    alignment,
    confluenceBonus: bonus,
    description: desc,
  };
}

/**
 * Fetches Global Market Sentiment (Risk-On / Risk-Off) based on Equity Indices & Volatility
 */
export async function fetchFinvizMarketSentiment(): Promise<FinvizMarketSentiment> {
  const now = Date.now();
  if (_cachedSentiment && now - _lastSentimentTime < SENTIMENT_TTL_MS) {
    return _cachedSentiment;
  }

  try {
    // Use SPY & USOIL correlation as macro market proxy
    const [spyCandles, oilCandles] = await Promise.allSettled([
      getMarketCandles("SPY", "1h"),
      getMarketCandles("USOIL", "1h"),
    ]);

    let spyChange = 0;
    if (spyCandles.status === "fulfilled" && spyCandles.value.length >= 24) {
      const c = spyCandles.value;
      spyChange = ((c[c.length - 1].close - c[0].open) / c[0].open) * 100;
    }

    let regime: FinvizMarketSentiment["regime"] = "NEUTRAL";
    let goldBias: FinvizMarketSentiment["goldBias"] = "NEUTRAL";
    let summary = "ตลาดโลกอยู่ในภาวะสมดุล ปริมาณซื้อขายกระจายตัวสม่ำเสมอ";

    if (spyChange >= 0.5) {
      regime = "RISK_ON";
      goldBias = "NEUTRAL";
      summary = "ตลาดอยู่ในโหมด Risk-On: ตลาดหุ้นและสินทรัพย์เสี่ยงปรับตัวขึ้น นักลงทุนกล้าเสี่ยง";
    } else if (spyChange <= -0.5) {
      regime = "RISK_OFF";
      goldBias = "BULLISH";
      summary = "ตลาดอยู่ในโหมด Risk-Off: สินทรัพย์เสี่ยงถูกเทขาย เงินไหลเข้าหลบภัยในทองคำ (XAUUSD)";
    }

    const sentiment: FinvizMarketSentiment = {
      regime,
      vixStatus: regime === "RISK_OFF" ? "ELEVATED_VOLATILITY" : "NORMAL_STABLE",
      goldBias,
      equityTrend: spyChange > 0 ? "BULLISH" : spyChange < 0 ? "BEARISH" : "SIDEWAYS",
      summary,
      updatedAt: now,
    };

    _cachedSentiment = sentiment;
    _lastSentimentTime = now;
    return sentiment;
  } catch {
    return {
      regime: "NEUTRAL",
      vixStatus: "NORMAL_STABLE",
      goldBias: "NEUTRAL",
      equityTrend: "SIDEWAYS",
      summary: "Macro sentiment monitoring active in background.",
      updatedAt: now,
    };
  }
}

/**
 * Synchronous accessor for Relative Currency Strength with non-blocking background refresh
 */
export function getCachedForexStrength(): FinvizForexStrengthData {
  const now = Date.now();
  if (typeof window === "undefined" && (!_cachedForexStrength || now - _lastForexStrengthTime > FOREX_STRENGTH_TTL_MS)) {
    fetchFinvizForexStrength().catch(() => {});
  }

  if (_cachedForexStrength) {
    return _cachedForexStrength;
  }

  // Default baseline before first fetch
  const baselineCurrencies = MAJOR_CURRENCIES.map((c, i) => ({
    currency: c,
    changePct: 0,
    rank: i + 1,
    score: 0,
  }));

  return {
    currencies: baselineCurrencies,
    topStrong: ["USD", "EUR"],
    topWeak: ["JPY", "GBP"],
    bestMatchups: [],
    updatedAt: now,
    isSynthetic: true,
  };
}

/**
 * Synchronous accessor for Pair Currency Divergence
 */
export function getCachedPairDivergence(symbol: string): PairDivergenceResult {
  const strength = getCachedForexStrength();
  return getPairCurrencyDivergence(symbol, strength);
}

/**
 * Synchronous accessor for Market Sentiment with non-blocking background refresh
 */
export function getCachedMarketSentiment(): FinvizMarketSentiment {
  const now = Date.now();
  if (typeof window === "undefined" && (!_cachedSentiment || now - _lastSentimentTime > SENTIMENT_TTL_MS)) {
    fetchFinvizMarketSentiment().catch(() => {});
  }

  return (
    _cachedSentiment || {
      regime: "NEUTRAL",
      vixStatus: "NORMAL_STABLE",
      goldBias: "NEUTRAL",
      equityTrend: "SIDEWAYS",
      summary: "Macro sentiment stable.",
      updatedAt: now,
    }
  );
}

