import { AssetInfo, Candle } from "./types";
import { saveCandlesRollingBuffer, getCachedCandles } from "./db";

export const AVAILABLE_ASSETS: AssetInfo[] = [
  // ─── Commodities & Metals ───
  { symbol: "XAUUSD", name: "Gold / USD (ทองคำ)", category: "commodities", baseAsset: "XAU", quoteAsset: "USD", precision: 2 },
  { symbol: "XAGUSD", name: "Silver / USD (โลหะเงิน)", category: "commodities", baseAsset: "XAG", quoteAsset: "USD", precision: 3 },
  { symbol: "USOIL", name: "Crude Oil WTI (น้ำมันดิบ)", category: "commodities", baseAsset: "OIL", quoteAsset: "USD", precision: 2 },
  { symbol: "UKOIL", name: "Brent Crude Oil", category: "commodities", baseAsset: "BRENT", quoteAsset: "USD", precision: 2 },

  // ─── Forex Majors ───
  { symbol: "EURUSD", name: "EUR / USD (ยูโร/ดอลลาร์)", category: "forex", baseAsset: "EUR", quoteAsset: "USD", precision: 4 },
  { symbol: "GBPUSD", name: "GBP / USD (ปอนด์/ดอลลาร์)", category: "forex", baseAsset: "GBP", quoteAsset: "USD", precision: 4 },
  { symbol: "USDJPY", name: "USD / JPY (ดอลลาร์/เยน)", category: "forex", baseAsset: "USD", quoteAsset: "JPY", precision: 2 },
  { symbol: "USDCHF", name: "USD / CHF (ดอลลาร์/สวิสฟรังก์)", category: "forex", baseAsset: "USD", quoteAsset: "CHF", precision: 4 },
  { symbol: "AUDUSD", name: "AUD / USD (ออสซี่/ดอลลาร์)", category: "forex", baseAsset: "AUD", quoteAsset: "USD", precision: 4 },
  { symbol: "USDCAD", name: "USD / CAD (ดอลลาร์/แคนาดา)", category: "forex", baseAsset: "USD", quoteAsset: "CAD", precision: 4 },
  { symbol: "NZDUSD", name: "NZD / USD (นิวซีแลนด์/ดอลลาร์)", category: "forex", baseAsset: "NZD", quoteAsset: "USD", precision: 4 },

  // ─── Forex Crosses ───
  { symbol: "GBPJPY", name: "GBP / JPY (ปอนด์/เยน)", category: "forex", baseAsset: "GBP", quoteAsset: "JPY", precision: 2 },
  { symbol: "EURJPY", name: "EUR / JPY (ยูโร/เยน)", category: "forex", baseAsset: "EUR", quoteAsset: "JPY", precision: 2 },
  { symbol: "EURGBP", name: "EUR / GBP (ยูโร/ปอนด์)", category: "forex", baseAsset: "EUR", quoteAsset: "GBP", precision: 4 },
  { symbol: "AUDJPY", name: "AUD / JPY (ออสซี่/เยน)", category: "forex", baseAsset: "AUD", quoteAsset: "JPY", precision: 2 },
  { symbol: "CADJPY", name: "CAD / JPY (แคนาดา/เยน)", category: "forex", baseAsset: "CAD", quoteAsset: "JPY", precision: 2 },
  { symbol: "CHFJPY", name: "CHF / JPY (สวิสฟรังก์/เยน)", category: "forex", baseAsset: "CHF", quoteAsset: "JPY", precision: 2 },
  { symbol: "EURAUD", name: "EUR / AUD (ยูโร/ออสซี่)", category: "forex", baseAsset: "EUR", quoteAsset: "AUD", precision: 4 },
  { symbol: "GBPAUD", name: "GBP / AUD (ปอนด์/ออสซี่)", category: "forex", baseAsset: "GBP", quoteAsset: "AUD", precision: 4 },
  { symbol: "AUDCAD", name: "AUD / CAD (ออสซี่/แคนาดา)", category: "forex", baseAsset: "AUD", quoteAsset: "CAD", precision: 4 },
  { symbol: "NZDJPY", name: "NZD / JPY (นิวซีแลนด์/เยน)", category: "forex", baseAsset: "NZD", quoteAsset: "JPY", precision: 2 },

  // ─── Crypto Top Coins ───
  { symbol: "BTCUSDT", name: "Bitcoin / USDT", category: "crypto", baseAsset: "BTC", quoteAsset: "USDT", precision: 2 },
  { symbol: "ETHUSDT", name: "Ethereum / USDT", category: "crypto", baseAsset: "ETH", quoteAsset: "USDT", precision: 2 },
  { symbol: "SOLUSDT", name: "Solana / USDT", category: "crypto", baseAsset: "SOL", quoteAsset: "USDT", precision: 2 },
  { symbol: "BNBUSDT", name: "BNB / USDT", category: "crypto", baseAsset: "BNB", quoteAsset: "USDT", precision: 2 },
  { symbol: "XRPUSDT", name: "XRP / USDT (Ripple)", category: "crypto", baseAsset: "XRP", quoteAsset: "USDT", precision: 4 },
  { symbol: "ADAUSDT", name: "Cardano / USDT", category: "crypto", baseAsset: "ADA", quoteAsset: "USDT", precision: 4 },
  { symbol: "DOGEUSDT", name: "Dogecoin / USDT", category: "crypto", baseAsset: "DOGE", quoteAsset: "USDT", precision: 4 },
  { symbol: "AVAXUSDT", name: "Avalanche / USDT", category: "crypto", baseAsset: "AVAX", quoteAsset: "USDT", precision: 2 },
  { symbol: "LINKUSDT", name: "Chainlink / USDT", category: "crypto", baseAsset: "LINK", quoteAsset: "USDT", precision: 2 },
  { symbol: "SUIUSDT", name: "Sui / USDT", category: "crypto", baseAsset: "SUI", quoteAsset: "USDT", precision: 4 },

  // ─── Indices & Stocks ───
  { symbol: "SPY", name: "S&P 500 ETF (US500)", category: "stocks", baseAsset: "SPY", quoteAsset: "USD", precision: 2 },
  { symbol: "QQQ", name: "Nasdaq 100 ETF (NAS100)", category: "stocks", baseAsset: "QQQ", quoteAsset: "USD", precision: 2 },
  { symbol: "DIA", name: "Dow Jones ETF (US30)", category: "stocks", baseAsset: "DIA", quoteAsset: "USD", precision: 2 },
  { symbol: "NVDA", name: "NVIDIA Corp.", category: "stocks", baseAsset: "NVDA", quoteAsset: "USD", precision: 2 },
  { symbol: "TSLA", name: "Tesla Inc.", category: "stocks", baseAsset: "TSLA", quoteAsset: "USD", precision: 2 },
  { symbol: "AAPL", name: "Apple Inc.", category: "stocks", baseAsset: "AAPL", quoteAsset: "USD", precision: 2 },
  { symbol: "MSFT", name: "Microsoft Corp.", category: "stocks", baseAsset: "MSFT", quoteAsset: "USD", precision: 2 },
  { symbol: "AMZN", name: "Amazon.com Inc.", category: "stocks", baseAsset: "AMZN", quoteAsset: "USD", precision: 2 },
  { symbol: "META", name: "Meta Platforms", category: "stocks", baseAsset: "META", quoteAsset: "USD", precision: 2 },
  { symbol: "AMD", name: "Advanced Micro Devices", category: "stocks", baseAsset: "AMD", quoteAsset: "USD", precision: 2 },
];

export async function fetchMassiveCandles(symbol: string, interval = "1h", apiKey: string): Promise<Candle[]> {
  try {
    const timespan = interval === "1D" ? "day" : interval === "4h" ? "hour" : interval === "15m" ? "minute" : "hour";
    const multiplier = interval === "15m" ? 15 : interval === "4h" ? 4 : 1;
    
    let ticker = symbol;
    if (symbol.length === 6 && !symbol.includes("USDT") && !symbol.startsWith("C:")) {
      ticker = `C:${symbol}`;
    } else if (symbol.endsWith("USDT") && !symbol.startsWith("X:")) {
      ticker = `X:${symbol.replace("USDT", "USD")}`;
    } else if (symbol === "XAUUSD") {
      ticker = "C:XAUUSD";
    }

    const toDate = new Date().toISOString().split("T")[0];
    const daysBack = interval === "1D" ? 365 : interval === "4h" ? 90 : interval === "15m" ? 10 : 45;
    const fromDate = new Date(Date.now() - daysBack * 86400000).toISOString().split("T")[0];

    const url = `https://api.massive.com/v2/aggs/ticker/${ticker}/range/${multiplier}/${timespan}/${fromDate}/${toDate}?adjusted=true&sort=desc&limit=250&apiKey=${apiKey}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(4500), cache: "no-store" });
    
    if (res.ok) {
      const data = await res.json();
      if (data.results && Array.isArray(data.results)) {
        const candles = data.results.map((r: { t: number; o: number; h: number; l: number; c: number; v: number }) => ({
          time: Math.floor(r.t / 1000),
          open: r.o,
          high: r.h,
          low: r.l,
          close: r.c,
          volume: r.v || 1000,
        }));
        candles.sort((a: Candle, b: Candle) => a.time - b.time);
        return candles;
      }
    }
  } catch (err) {
    console.warn("Massive API fetch failed, falling back...", err);
  }
  return [];
}

export async function fetchCryptoCandles(symbol: string, interval = "1h", limit = 200): Promise<Candle[]> {
  const binanceIntervalMap: Record<string, string> = {
    "15m": "15m",
    "1h": "1h",
    "4h": "4h",
    "1D": "1d",
  };
  const intervalKey = binanceIntervalMap[interval] || "1h";
  const bSymbol = symbol.endsWith("USDT") ? symbol : `${symbol}USDT`;
  const url = `https://api.binance.com/api/v3/klines?symbol=${bSymbol}&interval=${intervalKey}&limit=${limit}`;

  const res = await fetch(url, { signal: AbortSignal.timeout(4500), cache: "no-store" });
  if (!res.ok) {
    throw new Error(`Binance API error: ${res.statusText}`);
  }
  const data = await res.json();
  
  return data.map((item: (string | number)[]) => ({
    time: Math.floor(Number(item[0]) / 1000),
    open: parseFloat(item[1] as string),
    high: parseFloat(item[2] as string),
    low: parseFloat(item[3] as string),
    close: parseFloat(item[4] as string),
    volume: parseFloat(item[5] as string),
  }));
}

/**
 * Resamples consecutive hourly candles into true 4-hour OHLCV candles,
 * aligning boundaries with standard 4-hour UTC blocks (00:00, 04:00, 08:00, 12:00, 16:00, 20:00).
 */
export function resampleCandlesTo4H(hourlyCandles: Candle[]): Candle[] {
  if (!hourlyCandles || hourlyCandles.length === 0) return [];

  const fourHourCandles: Candle[] = [];
  const FOUR_HOURS_SEC = 4 * 3600;

  let currentBucketTime = -1;
  let currentGroup: Candle[] = [];

  for (const c of hourlyCandles) {
    const bucketTime = Math.floor(c.time / FOUR_HOURS_SEC) * FOUR_HOURS_SEC;
    if (bucketTime !== currentBucketTime) {
      if (currentGroup.length > 0) {
        fourHourCandles.push({
          time: currentBucketTime,
          open: currentGroup[0].open,
          high: Math.max(...currentGroup.map((g) => g.high)),
          low: Math.min(...currentGroup.map((g) => g.low)),
          close: currentGroup[currentGroup.length - 1].close,
          volume: currentGroup.reduce((acc, g) => acc + (g.volume || 0), 0),
        });
      }
      currentBucketTime = bucketTime;
      currentGroup = [c];
    } else {
      currentGroup.push(c);
    }
  }

  if (currentGroup.length > 0) {
    fourHourCandles.push({
      time: currentBucketTime,
      open: currentGroup[0].open,
      high: Math.max(...currentGroup.map((g) => g.high)),
      low: Math.min(...currentGroup.map((g) => g.low)),
      close: currentGroup[currentGroup.length - 1].close,
      volume: currentGroup.reduce((acc, g) => acc + (g.volume || 0), 0),
    });
  }

  return fourHourCandles;
}

export async function fetchYahooCandles(symbol: string, interval = "1h"): Promise<Candle[]> {
  const yahooSymbolMap: Record<string, string> = {
    "XAUUSD": "XAUT-USD", // Physical Spot Gold (avoids GC=F +45$ futures contango)
    "XAGUSD": "SI=F",
    "USOIL": "CL=F",
    "UKOIL": "BZ=F",
    "EURUSD": "EURUSD=X",
    "GBPUSD": "GBPUSD=X",
    "USDJPY": "JPY=X",
    "USDCHF": "CHF=X",
    "AUDUSD": "AUDUSD=X",
    "USDCAD": "CAD=X",
    "NZDUSD": "NZDUSD=X",
    "GBPJPY": "GBPJPY=X",
    "EURJPY": "EURJPY=X",
    "EURGBP": "EURGBP=X",
    "AUDJPY": "AUDJPY=X",
    "CADJPY": "CADJPY=X",
    "CHFJPY": "CHFJPY=X",
    "EURAUD": "EURAUD=X",
    "GBPAUD": "GBPAUD=X",
    "AUDCAD": "AUDCAD=X",
    "NZDJPY": "NZDJPY=X",
    "SPY": "SPY",
    "QQQ": "QQQ",
    "DIA": "DIA",
    "NVDA": "NVDA",
    "TSLA": "TSLA",
    "AAPL": "AAPL",
    "MSFT": "MSFT",
    "AMZN": "AMZN",
    "META": "META",
    "AMD": "AMD",
    "BTCUSDT": "BTC-USD",
    "ETHUSDT": "ETH-USD",
    "SOLUSDT": "SOL-USD",
    "BNBUSDT": "BNB-USD",
    "XRPUSDT": "XRP-USD",
    "ADAUSDT": "ADA-USD",
    "DOGEUSDT": "DOGE-USD",
    "AVAXUSDT": "AVAX-USD",
  };

  let ySymbol = yahooSymbolMap[symbol.toUpperCase()];
  if (!ySymbol) {
    if (symbol.length === 6 && !symbol.includes("USDT")) {
      ySymbol = `${symbol.toUpperCase()}=X`;
    } else {
      ySymbol = symbol.toUpperCase();
    }
  }

  const yahooIntervalMap: Record<string, string> = {
    "15m": "15m",
    "1h": "60m",
    "4h": "60m",
    "1D": "1d",
  };
  const yInterval = yahooIntervalMap[interval] || "60m";
  const yRange = interval === "15m" ? "5d" : interval === "4h" ? "3mo" : interval === "1D" ? "1y" : "1mo";

  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ySymbol)}?interval=${yInterval}&range=${yRange}&_t=${Date.now()}`;
  
  const res = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
    },
    signal: AbortSignal.timeout(4500),
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`Yahoo Finance API error: ${res.statusText}`);
  }

  const data = await res.json();
  const result = data?.chart?.result?.[0];
  if (!result || !result.timestamp) {
    throw new Error("Invalid Yahoo Finance response");
  }

  const timestamps: number[] = result.timestamp;
  const quote = result.indicators.quote[0];
  const candles: Candle[] = [];

  for (let i = 0; i < timestamps.length; i++) {
    const o = quote.open?.[i];
    const h = quote.high?.[i];
    const l = quote.low?.[i];
    const c = quote.close?.[i];
    const v = quote.volume?.[i] || 1000;

    if (o !== null && h !== null && l !== null && c !== null && !isNaN(o) && !isNaN(c)) {
      candles.push({
        time: timestamps[i],
        open: Number(o.toFixed(4)),
        high: Number(h.toFixed(4)),
        low: Number(l.toFixed(4)),
        close: Number(c.toFixed(4)),
        volume: Number(v),
      });
    }
  }

  // Update latest candle close with the ultra-fresh regularMarketPrice if available
  const currentLivePrice = result.meta?.regularMarketPrice;
  if (currentLivePrice && candles.length > 0) {
    const last = candles[candles.length - 1];
    last.close = Number(currentLivePrice.toFixed(4));
    last.high = Math.max(last.high, last.close);
    last.low = Math.min(last.low, last.close);
  }

  // If 4h requested, resample hourly candles into accurate 4h bars
  if (interval === "4h") {
    return resampleCandlesTo4H(candles);
  }

  return candles;
}

export function generateRealisticCandles(symbol: string, basePrice = 2500, count = 120): Candle[] {
  const candles: Candle[] = [];
  const now = Math.floor(Date.now() / 1000);
  const step = 3600;

  let current = basePrice;
  const startTime = now - count * step;

  for (let i = 0; i < count; i++) {
    const time = startTime + i * step;
    const volatility = current * 0.005;
    const change = (Math.random() - 0.49) * volatility;
    const open = current;
    const close = open + change;
    const high = Math.max(open, close) + Math.random() * volatility * 0.5;
    const low = Math.min(open, close) - Math.random() * volatility * 0.5;
    const volume = Math.floor(1000 + Math.random() * 5000);

    candles.push({
      time,
      open: Number(open.toFixed(2)),
      high: Number(high.toFixed(2)),
      low: Number(low.toFixed(2)),
      close: Number(close.toFixed(2)),
      volume,
    });

    current = close;
  }

  return candles;
}

// In-memory cache with 15s TTL to prevent rate-limiting and maximize performance
interface CacheEntry {
  candles: Candle[];
  timestamp: number;
}
const candleCache = new Map<string, CacheEntry>();
const CANDLE_CACHE_TTL_MS = 15000; // 15 seconds

/**
 * Helper to update memory cache and trigger background Neon rolling buffer persistence
 */
function cacheAndPersist(sym: string, tf: string, candles: Candle[]): Candle[] {
  const cacheKey = `${sym.toUpperCase()}_${tf}`;
  candleCache.set(cacheKey, { candles, timestamp: Date.now() });
  // Non-blocking fire-and-forget save to Neon rolling FIFO buffer
  saveCandlesRollingBuffer(sym, tf, candles).catch((err) => {
    console.error(`Background saveCandlesRollingBuffer error for ${sym}:`, err);
  });
  return candles;
}

export async function getMarketCandles(symbol: string, interval = "1h"): Promise<Candle[]> {
  const cacheKey = `${symbol.toUpperCase()}_${interval}`;
  const cached = candleCache.get(cacheKey);
  const now = Date.now();
  if (cached && (now - cached.timestamp) < CANDLE_CACHE_TTL_MS && cached.candles.length >= 20) {
    return cached.candles;
  }

  const asset = AVAILABLE_ASSETS.find((a) => a.symbol === symbol);

  // 1. If Gold (XAUUSD), use live Spot Gold feed (PAXGUSDT on Binance)
  // This matches TradingView (OANDA/FXCM) and Investing.com Spot Gold 1:1, avoiding COMEX Futures contango premium (+45$)
  if (symbol.toUpperCase() === "XAUUSD" || symbol.toUpperCase() === "GOLD") {
    try {
      const candles = await fetchCryptoCandles("PAXGUSDT", interval, 200);
      if (candles.length >= 20) {
        return cacheAndPersist(symbol, interval, candles);
      }
    } catch (err) {
      console.warn("Binance PAXG Spot Gold fetch failed, falling back...", err);
    }
  }

  // 2. If Crypto, use Binance API (Real-time & Fast 200 candles)
  if (asset?.category === "crypto" || symbol.endsWith("USDT")) {
    try {
      const candles = await fetchCryptoCandles(symbol, interval, 200);
      if (candles.length >= 20) {
        return cacheAndPersist(symbol, interval, candles);
      }
    } catch (err) {
      console.warn(`Binance fetch failed for ${symbol}, trying Yahoo...`, err);
    }
  }

  // 3. If Massive API key exists, try Massive API
  const massiveKey = process.env.MASSIVE_API_KEY;
  if (massiveKey) {
    const massiveCandles = await fetchMassiveCandles(symbol, interval, massiveKey);
    if (massiveCandles.length >= 20) {
      return cacheAndPersist(symbol, interval, massiveCandles);
    }
  }

  // 4. Try Yahoo Finance for Commodities, Forex, Stocks, Indices
  try {
    const candles = await fetchYahooCandles(symbol, interval);
    if (candles.length >= 20) {
      return cacheAndPersist(symbol, interval, candles);
    }
  } catch (err) {
    console.warn(`Yahoo fetch failed for ${symbol}, using fallback data...`, err);
  }

  // 5. High-Availability Fallback: Fetch from Neon PostgreSQL Rolling Buffer
  try {
    const dbCandles = await getCachedCandles(symbol, interval, 200);
    if (dbCandles && dbCandles.length >= 20) {
      candleCache.set(cacheKey, { candles: dbCandles, timestamp: Date.now() });
      return dbCandles;
    }
  } catch (dbErr) {
    console.warn(`Neon DB fallback fetch failed for ${symbol}:`, dbErr);
  }

  // 6. Last resort synthetic fallback base prices
  const fallbackPrices: Record<string, number> = {
    XAUUSD: 2850.5,
    XAGUSD: 32.5,
    USOIL: 72.8,
    UKOIL: 76.5,
    EURUSD: 1.085,
    GBPUSD: 1.295,
    USDJPY: 152.3,
    USDCHF: 0.885,
    AUDUSD: 0.655,
    USDCAD: 1.395,
    NZDUSD: 0.595,
    GBPJPY: 197.5,
    EURJPY: 165.2,
    EURGBP: 0.835,
    AUDJPY: 99.8,
    CADJPY: 109.2,
    CHFJPY: 172.0,
    BTCUSDT: 88500,
    ETHUSDT: 2800,
    SOLUSDT: 195,
    BNBUSDT: 650,
    XRPUSDT: 1.45,
    SPY: 590,
    QQQ: 510,
    DIA: 435,
    NVDA: 135,
    TSLA: 260,
    AAPL: 230,
    MSFT: 420,
  };

  const basePrice = fallbackPrices[symbol] || 100;
  return generateRealisticCandles(symbol, basePrice, 120);
}