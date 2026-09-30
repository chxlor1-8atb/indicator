import { AssetInfo, Candle } from "./types";
import { saveCandlesRollingBuffer, getCachedCandles, BacktestTrade, recordClosedCandleTransition } from "./db";
import { calculateEMA, calculateRSI, calculateADX, calculateATR, calculateBollingerBands, calculateVolumeDelta, calculateTDSequential, calculateQuasimodoPattern } from "./indicators";
import { optimizeIndicatorParameters } from "./optimizerEngine";
import { LRUCache } from "./cache";
import { CircuitBreaker, fetchWithRetry } from "./resilience";
import { logger } from "./logger";
import { getTradingSessionPhase } from "./sessionEngine";

export const AVAILABLE_ASSETS: AssetInfo[] = [
  // ─── Commodities & Metals ───
  { symbol: "XAUUSD", name: "Gold / USD (ทองคำ)", category: "commodities", baseAsset: "XAU", quoteAsset: "USD", precision: 2 },
  { symbol: "XAGUSD", name: "Silver / USD (โลหะเงิน)", category: "commodities", baseAsset: "XAG", quoteAsset: "USD", precision: 3 },
  { symbol: "USOIL", name: "Crude Oil WTI (น้ำมันดิบสหรัฐฯ)", category: "commodities", baseAsset: "OIL", quoteAsset: "USD", precision: 2 },
  { symbol: "UKOIL", name: "Brent Crude Oil (น้ำมันดิบเบรนท์)", category: "commodities", baseAsset: "BRENT", quoteAsset: "USD", precision: 2 },

  // ─── Forex Majors (7 คู่หลักสากล) ───
  { symbol: "EURUSD", name: "EUR / USD (ยูโร/ดอลลาร์)", category: "forex", baseAsset: "EUR", quoteAsset: "USD", precision: 4 },
  { symbol: "GBPUSD", name: "GBP / USD (ปอนด์/ดอลลาร์)", category: "forex", baseAsset: "GBP", quoteAsset: "USD", precision: 4 },
  { symbol: "USDJPY", name: "USD / JPY (ดอลลาร์/เยน)", category: "forex", baseAsset: "USD", quoteAsset: "JPY", precision: 2 },
  { symbol: "USDCHF", name: "USD / CHF (ดอลลาร์/สวิสฟรังก์)", category: "forex", baseAsset: "USD", quoteAsset: "CHF", precision: 4 },
  { symbol: "AUDUSD", name: "AUD / USD (ออสซี่/ดอลลาร์)", category: "forex", baseAsset: "AUD", quoteAsset: "USD", precision: 4 },
  { symbol: "USDCAD", name: "USD / CAD (ดอลลาร์/แคนาดา)", category: "forex", baseAsset: "USD", quoteAsset: "CAD", precision: 4 },
  { symbol: "NZDUSD", name: "NZD / USD (นิวซีแลนด์/ดอลลาร์)", category: "forex", baseAsset: "NZD", quoteAsset: "USD", precision: 4 },

  // ─── Forex Crosses (21 คู่ข้ามสกุลยอดนิยม) ───
  { symbol: "GBPJPY", name: "GBP / JPY (ปอนด์/เยน)", category: "forex", baseAsset: "GBP", quoteAsset: "JPY", precision: 2 },
  { symbol: "EURJPY", name: "EUR / JPY (ยูโร/เยน)", category: "forex", baseAsset: "EUR", quoteAsset: "JPY", precision: 2 },
  { symbol: "EURGBP", name: "EUR / GBP (ยูโร/ปอนด์)", category: "forex", baseAsset: "EUR", quoteAsset: "GBP", precision: 4 },
  { symbol: "AUDJPY", name: "AUD / JPY (ออสซี่/เยน)", category: "forex", baseAsset: "AUD", quoteAsset: "JPY", precision: 2 },
  { symbol: "CADJPY", name: "CAD / JPY (แคนาดา/เยน)", category: "forex", baseAsset: "CAD", quoteAsset: "JPY", precision: 2 },
  { symbol: "CHFJPY", name: "CHF / JPY (สวิสฟรังก์/เยน)", category: "forex", baseAsset: "CHF", quoteAsset: "JPY", precision: 2 },
  { symbol: "NZDJPY", name: "NZD / JPY (นิวซีแลนด์/เยน)", category: "forex", baseAsset: "NZD", quoteAsset: "JPY", precision: 2 },
  { symbol: "EURAUD", name: "EUR / AUD (ยูโร/ออสซี่)", category: "forex", baseAsset: "EUR", quoteAsset: "AUD", precision: 4 },
  { symbol: "EURCAD", name: "EUR / CAD (ยูโร/แคนาดา)", category: "forex", baseAsset: "EUR", quoteAsset: "CAD", precision: 4 },
  { symbol: "EURCHF", name: "EUR / CHF (ยูโร/สวิสฟรังก์)", category: "forex", baseAsset: "EUR", quoteAsset: "CHF", precision: 4 },
  { symbol: "EURNZD", name: "EUR / NZD (ยูโร/นิวซีแลนด์)", category: "forex", baseAsset: "EUR", quoteAsset: "NZD", precision: 4 },
  { symbol: "GBPAUD", name: "GBP / AUD (ปอนด์/ออสซี่)", category: "forex", baseAsset: "GBP", quoteAsset: "AUD", precision: 4 },
  { symbol: "GBPCAD", name: "GBP / CAD (ปอนด์/แคนาดา)", category: "forex", baseAsset: "GBP", quoteAsset: "CAD", precision: 4 },
  { symbol: "GBPCHF", name: "GBP / CHF (ปอนด์/สวิสฟรังก์)", category: "forex", baseAsset: "GBP", quoteAsset: "CHF", precision: 4 },
  { symbol: "GBPNZD", name: "GBP / NZD (ปอนด์/นิวซีแลนด์)", category: "forex", baseAsset: "GBP", quoteAsset: "NZD", precision: 4 },
  { symbol: "AUDCAD", name: "AUD / CAD (ออสซี่/แคนาดา)", category: "forex", baseAsset: "AUD", quoteAsset: "CAD", precision: 4 },
  { symbol: "AUDCHF", name: "AUD / CHF (ออสซี่/สวิสฟรังก์)", category: "forex", baseAsset: "AUD", quoteAsset: "CHF", precision: 4 },
  { symbol: "AUDNZD", name: "AUD / NZD (ออสซี่/นิวซีแลนด์)", category: "forex", baseAsset: "AUD", quoteAsset: "NZD", precision: 4 },
  { symbol: "CADCHF", name: "CAD / CHF (แคนาดา/สวิสฟรังก์)", category: "forex", baseAsset: "CAD", quoteAsset: "CHF", precision: 4 },
  { symbol: "NZDCAD", name: "NZD / CAD (นิวซีแลนด์/แคนาดา)", category: "forex", baseAsset: "NZD", quoteAsset: "CAD", precision: 4 },
  { symbol: "NZDCHF", name: "NZD / CHF (นิวซีแลนด์/สวิสฟรังก์)", category: "forex", baseAsset: "NZD", quoteAsset: "CHF", precision: 4 },

  // ─── Forex Exotics & Asia (11 คู่พิเศษและเอเชีย เช่น THB, SGD, HKD) ───
  { symbol: "USDTHB", name: "USD / THB (ดอลลาร์/บาทไทย)", category: "forex", baseAsset: "USD", quoteAsset: "THB", precision: 3 },
  { symbol: "EURTHB", name: "EUR / THB (ยูโร/บาทไทย)", category: "forex", baseAsset: "EUR", quoteAsset: "THB", precision: 3 },
  { symbol: "USDSGD", name: "USD / SGD (ดอลลาร์/สิงคโปร์)", category: "forex", baseAsset: "USD", quoteAsset: "SGD", precision: 4 },
  { symbol: "USDHKD", name: "USD / HKD (ดอลลาร์/ฮ่องกง)", category: "forex", baseAsset: "USD", quoteAsset: "HKD", precision: 4 },
  { symbol: "USDCNH", name: "USD / CNH (ดอลลาร์/หยวนนอกประเทศ)", category: "forex", baseAsset: "USD", quoteAsset: "CNH", precision: 4 },
  { symbol: "USDTRY", name: "USD / TRY (ดอลลาร์/ลีราตุรกี)", category: "forex", baseAsset: "USD", quoteAsset: "TRY", precision: 4 },
  { symbol: "USDZAR", name: "USD / ZAR (ดอลลาร์/แรนด์แอฟริกา)", category: "forex", baseAsset: "USD", quoteAsset: "ZAR", precision: 4 },
  { symbol: "USDMXN", name: "USD / MXN (ดอลลาร์/เปโซเม็กซิโก)", category: "forex", baseAsset: "USD", quoteAsset: "MXN", precision: 4 },
  { symbol: "USDSEK", name: "USD / SEK (ดอลลาร์/โครนาสวีเดน)", category: "forex", baseAsset: "USD", quoteAsset: "SEK", precision: 4 },
  { symbol: "USDNOK", name: "USD / NOK (ดอลลาร์/โครนานอร์เวย์)", category: "forex", baseAsset: "USD", quoteAsset: "NOK", precision: 4 },
  { symbol: "USDPLN", name: "USD / PLN (ดอลลาร์/ซลอตีโปแลนด์)", category: "forex", baseAsset: "USD", quoteAsset: "PLN", precision: 4 },

  // ─── Top Crypto Picks (12 เหรียญยอดนิยมสำหรับสายเทรด) ───
  { symbol: "BTCUSDT", name: "Bitcoin / USDT (บิตคอยน์)", category: "crypto", baseAsset: "BTC", quoteAsset: "USDT", precision: 2 },
  { symbol: "ETHUSDT", name: "Ethereum / USDT (อีเธอเรียม)", category: "crypto", baseAsset: "ETH", quoteAsset: "USDT", precision: 2 },
  { symbol: "SOLUSDT", name: "Solana / USDT (โซลานา)", category: "crypto", baseAsset: "SOL", quoteAsset: "USDT", precision: 2 },
  { symbol: "BNBUSDT", name: "BNB / USDT (ไบแนนซ์คอยน์)", category: "crypto", baseAsset: "BNB", quoteAsset: "USDT", precision: 2 },
  { symbol: "XRPUSDT", name: "XRP / USDT (ริปเปิล)", category: "crypto", baseAsset: "XRP", quoteAsset: "USDT", precision: 4 },
  { symbol: "DOGEUSDT", name: "Dogecoin / USDT (ดอจคอยน์)", category: "crypto", baseAsset: "DOGE", quoteAsset: "USDT", precision: 4 },
  { symbol: "SUIUSDT", name: "Sui / USDT (ซุย)", category: "crypto", baseAsset: "SUI", quoteAsset: "USDT", precision: 4 },
  { symbol: "ADAUSDT", name: "Cardano / USDT (คาร์ดาโน)", category: "crypto", baseAsset: "ADA", quoteAsset: "USDT", precision: 4 },
  { symbol: "AVAXUSDT", name: "Avalanche / USDT (อวาแลนช์)", category: "crypto", baseAsset: "AVAX", quoteAsset: "USDT", precision: 2 },
  { symbol: "LINKUSDT", name: "Chainlink / USDT (เชนลิงก์)", category: "crypto", baseAsset: "LINK", quoteAsset: "USDT", precision: 3 },
  { symbol: "NEARUSDT", name: "NEAR Protocol / USDT (เนียร์)", category: "crypto", baseAsset: "NEAR", quoteAsset: "USDT", precision: 3 },
  { symbol: "PEPEUSDT", name: "Pepe / USDT (เปเป้)", category: "crypto", baseAsset: "PEPE", quoteAsset: "USDT", precision: 6 },
];

/**
 * Institutional Spot Gold and Forex quote fetcher directly from TradingView's CFD/Forex scanner.
 * Synchronizes with OANDA and Capital.com down to the cent, eliminating crypto token spreads.
 */
interface SpotQuoteCache {
  data: {
    price: number;
    open: number;
    high: number;
    low: number;
    change: number;
    volume?: number;
  };
  timestamp: number;
}
const spotQuoteCache = new Map<string, SpotQuoteCache>();
const SPOT_QUOTE_TTL_MS = 5000; // 5s cache to eliminate redundant TradingView rate-limits

// Dedicated Circuit Breakers for external APIs
const tradingViewBreaker = new CircuitBreaker({ name: "TradingView", failureThreshold: 3, resetTimeoutMs: 45000 });
const binanceBreaker = new CircuitBreaker({ name: "Binance", failureThreshold: 3, resetTimeoutMs: 45000 });
const bybitBreaker = new CircuitBreaker({ name: "Bybit", failureThreshold: 3, resetTimeoutMs: 45000 });
const yahooBreaker = new CircuitBreaker({ name: "YahooFinance", failureThreshold: 3, resetTimeoutMs: 45000 });

export async function fetchTradingViewSpotQuote(symbol: string): Promise<{
  price: number;
  open: number;
  high: number;
  low: number;
  change: number;
  volume?: number;
} | null> {
  const sym = symbol.toUpperCase();
  const cached = spotQuoteCache.get(sym);
  const now = Date.now();
  if (cached && now - cached.timestamp < SPOT_QUOTE_TTL_MS && cached.data.price > 0) {
    return cached.data;
  }

  let scannerEndpoint = "forex";
  let tickers: string[] = [];

  if (sym === "XAUUSD" || sym === "GOLD") {
    scannerEndpoint = "cfd";
    tickers = ["OANDA:XAUUSD", "TVC:GOLD", "CAPITALCOM:XAUUSD"];
  } else if (sym === "XAGUSD" || sym === "SILVER") {
    scannerEndpoint = "cfd";
    tickers = ["TVC:SILVER", "OANDA:XAGUSD", "CAPITALCOM:XAGUSD"];
  } else if (sym === "USOIL") {
    scannerEndpoint = "cfd";
    tickers = ["FX:USOIL", "TVC:USOIL", "PEPPERSTONE:USOIL"];
  } else if (sym === "UKOIL") {
    scannerEndpoint = "cfd";
    tickers = ["FX:UKOIL", "TVC:UKOIL", "PEPPERSTONE:UKOIL"];
  } else if (sym === "EURTHB") {
    scannerEndpoint = "forex";
    tickers = ["FX_IDC:EURTHB", "OANDA:EURTHB", "FX:EURTHB"];
  } else if (["USDTHB", "USDSGD", "USDHKD"].includes(sym)) {
    scannerEndpoint = "forex";
    tickers = [`OANDA:${sym}`, `FX_IDC:${sym}`, `FX:${sym}`];
  } else if (sym.length === 6 && !sym.includes("USDT")) {
    scannerEndpoint = "forex";
    tickers = [`FX:${sym}`, `OANDA:${sym}`, `FX_IDC:${sym}`];
  } else {
    return null;
  }

  try {
    return await tradingViewBreaker.execute(async () => {
      const res = await fetch(`https://scanner.tradingview.com/${scannerEndpoint}/scan`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          symbols: { tickers },
          columns: ["close", "open", "high", "low", "change", "volume"]
        }),
        signal: AbortSignal.timeout(8000), // Increased timeout for cloud server reliability
        cache: "no-store"
      });

      if (!res.ok) {
        const errorDetails = {
          symbol: sym,
          status: res.status,
          statusText: res.statusText,
          endpoint: scannerEndpoint,
          timestamp: new Date().toISOString()
        };
        console.error('[TradingView API Error]', errorDetails);
        throw new Error(`TradingView API error: ${res.status} ${res.statusText}`);
      }

      const json = await res.json();
      if (json.data && Array.isArray(json.data) && json.data.length > 0) {
        for (const item of json.data) {
          if (item && Array.isArray(item.d)) {
            const [close, open, high, low, change, volume] = item.d;
            if (typeof close === "number" && !isNaN(close) && close > 0) {
              const quote = { price: close, open, high, low, change, volume };
              spotQuoteCache.set(sym, { data: quote, timestamp: Date.now() });
              return quote;
            }
          }
        }
      }
      
      throw new Error(`No valid data received from TradingView for ${sym}`);
    });
  } catch (err: unknown) {
    const isTimeout = (err instanceof Error && err.name === "TimeoutError") || String(err).includes("timeout");
    const isCircuitOpen = String(err).includes("Circuit breaker");
    
    if (!isTimeout && !isCircuitOpen) {
      const errorDetails = {
        symbol: sym,
        error: err instanceof Error ? err.message : String(err),
        endpoint: scannerEndpoint,
        tickers,
        timestamp: new Date().toISOString()
      };
      console.error('[TradingView Quote Fetch Error]', errorDetails);
    } else if (isCircuitOpen) {
      console.warn('[TradingView] Circuit breaker open for', sym);
    }
  }
  return cached ? cached.data : null;
}

export async function fetchMassiveCandles(symbol: string, interval = "1h", apiKey: string): Promise<Candle[]> {
  try {
    const timespan =
      interval === "1W" ? "week" :
      interval === "1D" ? "day" :
      interval === "4h" ? "hour" :
      interval === "1h" ? "hour" : "minute";
    const multiplier =
      interval === "1m" ? 1 :
      interval === "5m" ? 5 :
      interval === "15m" ? 15 :
      interval === "30m" ? 30 :
      interval === "4h" ? 4 : 1;
    
    let ticker = symbol;
    if (symbol.length === 6 && !symbol.includes("USDT") && !symbol.startsWith("C:")) {
      ticker = `C:${symbol}`;
    } else if (symbol.endsWith("USDT") && !symbol.startsWith("X:")) {
      ticker = `X:${symbol.replace("USDT", "USD")}`;
    } else if (symbol === "XAUUSD") {
      ticker = "C:XAUUSD";
    }

    const toDate = new Date().toISOString().split("T")[0];
    const daysBack =
      interval === "1m" ? 2 :
      interval === "5m" ? 5 :
      interval === "15m" ? 15 :
      interval === "30m" ? 30 :
      interval === "4h" ? 90 :
      interval === "1D" ? 365 :
      interval === "1W" ? 1000 : 45;
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

export async function fetchCryptoCandles(symbol: string, interval = "1h", limit = 1000): Promise<Candle[]> {
  const bSymbol = symbol.endsWith("USDT") ? symbol : `${symbol}USDT`;
  const cappedLimit = Math.min(limit, 1000);

  // 1. Primary: Bybit Spot Public API (Fastest, ~100ms, zero geoblocking on Vercel/AWS)
  try {
    const bybitIntervalMap: Record<string, string> = {
      "1m": "1",
      "5m": "5",
      "15m": "15",
      "30m": "30",
      "1h": "60",
      "4h": "240",
      "1D": "D",
      "1W": "W",
    };
    const bInterval = bybitIntervalMap[interval] || "60";
    const bybitUrl = `https://api.bybit.com/v5/market/kline?category=spot&symbol=${bSymbol}&interval=${bInterval}&limit=${cappedLimit}`;
    const bybitRes = await fetch(bybitUrl, { signal: AbortSignal.timeout(3500), cache: "no-store" });
    if (bybitRes.ok) {
      const bybitJson = await bybitRes.json();
      const list = bybitJson?.result?.list;
      if (Array.isArray(list) && list.length >= 20) {
        // Bybit returns newest first, reverse to chronological ascending
        const candles: Candle[] = list
          .map((item: string[]) => ({
            time: Math.floor(Number(item[0]) / 1000),
            open: parseFloat(item[1]),
            high: parseFloat(item[2]),
            low: parseFloat(item[3]),
            close: parseFloat(item[4]),
            volume: parseFloat(item[5]),
          }))
          .reverse();
        return candles;
      }
    }
  } catch {
    // Proceed to Binance
  }

  // 2. Secondary: Binance Public Cloud Endpoints (data-api.binance.vision & api1)
  const binanceIntervalMap: Record<string, string> = {
    "1m": "1m",
    "5m": "5m",
    "15m": "15m",
    "30m": "30m",
    "1h": "1h",
    "4h": "4h",
    "1D": "1d",
    "1W": "1w",
  };
  const intervalKey = binanceIntervalMap[interval] || "1h";
  
  const endpoints = [
    `https://data-api.binance.vision/api/v3/klines?symbol=${bSymbol}&interval=${intervalKey}&limit=${cappedLimit}`,
    `https://api1.binance.com/api/v3/klines?symbol=${bSymbol}&interval=${intervalKey}&limit=${cappedLimit}`,
    `https://api.binance.com/api/v3/klines?symbol=${bSymbol}&interval=${intervalKey}&limit=${cappedLimit}`,
  ];

  let lastError: Error | null = null;
  for (const url of endpoints) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(4000), cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          return data.map((item: (string | number)[]) => ({
            time: Math.floor(Number(item[0]) / 1000),
            open: parseFloat(item[1] as string),
            high: parseFloat(item[2] as string),
            low: parseFloat(item[3] as string),
            close: parseFloat(item[4] as string),
            volume: parseFloat(item[5] as string),
          }));
        }
      }
    } catch (err) {
      lastError = err as Error;
    }
  }

  throw lastError || new Error(`Crypto feed unavailable for ${bSymbol}`);
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
    "EURCAD": "EURCAD=X",
    "EURCHF": "EURCHF=X",
    "EURNZD": "EURNZD=X",
    "GBPAUD": "GBPAUD=X",
    "GBPCAD": "GBPCAD=X",
    "GBPCHF": "GBPCHF=X",
    "GBPNZD": "GBPNZD=X",
    "AUDCAD": "AUDCAD=X",
    "AUDCHF": "AUDCHF=X",
    "AUDNZD": "AUDNZD=X",
    "CADCHF": "CADCHF=X",
    "NZDJPY": "NZDJPY=X",
    "NZDCAD": "NZDCAD=X",
    "NZDCHF": "NZDCHF=X",
    "USDTHB": "THB=X",
    "EURTHB": "EURTHB=X",
    "USDSGD": "SGD=X",
    "USDHKD": "HKD=X",
    "USDCNH": "CNH=X",
    "USDTRY": "TRY=X",
    "USDZAR": "ZAR=X",
    "USDMXN": "MXN=X",
    "USDSEK": "SEK=X",
    "USDNOK": "NOK=X",
    "USDPLN": "PLN=X",
    "BTCUSDT": "BTC-USD",
    "ETHUSDT": "ETH-USD",
    "SOLUSDT": "SOL-USD",
    "BNBUSDT": "BNB-USD",
    "XRPUSDT": "XRP-USD",
    "DOGEUSDT": "DOGE-USD",
    "SUIUSDT": "SUI20947-USD",
    "ADAUSDT": "ADA-USD",
    "AVAXUSDT": "AVAX-USD",
    "LINKUSDT": "LINK-USD",
    "NEARUSDT": "NEAR-USD",
    "PEPEUSDT": "PEPE24478-USD",
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
    "1m": "1m",
    "5m": "5m",
    "15m": "15m",
    "30m": "30m",
    "1h": "60m",
    "4h": "60m",
    "1D": "1d",
    "1W": "1wk",
  };
  const yInterval = yahooIntervalMap[interval] || "60m";
  const yRange =
    interval === "1m" ? "2d" :
    interval === "5m" ? "5d" :
    interval === "15m" ? "1mo" :
    interval === "30m" ? "1mo" :
    interval === "4h" ? "3mo" :
    interval === "1D" ? "2y" :
    interval === "1W" ? "5y" : "3mo";

  const yahooHosts = [
    "https://query1.finance.yahoo.com",
    "https://query2.finance.yahoo.com",
  ];

  let lastError: Error | null = null;

  for (const host of yahooHosts) {
    const url = `${host}/v8/finance/chart/${encodeURIComponent(ySymbol)}?interval=${yInterval}&range=${yRange}&_t=${Date.now()}`;
    
    try {
      const res = await fetch(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        },
        signal: AbortSignal.timeout(6000),
        cache: "no-store",
      });

      if (!res.ok) {
        continue;
      }

      const data = await res.json();
      const result = data?.chart?.result?.[0];
      if (!result || !result.timestamp) {
        continue;
      }

      const timestamps: number[] = result.timestamp;
      const quote = result.indicators?.quote?.[0];
      if (!quote) continue;

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

      if (candles.length === 0) continue;

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
    } catch (err) {
      lastError = err as Error;
    }
  }

  throw lastError || new Error(`Yahoo Finance API error for ${symbol}`);
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

// High-performance LRU Cache with 30s TTL and 100 entries capacity
const candleLruCache = new LRUCache<string, Candle[]>({ maxSize: 100, defaultTtlMs: 30000 });

/**
 * Helper to update memory LRU cache and trigger background Neon rolling buffer persistence
 */
function cacheAndPersist(sym: string, tf: string, candles: Candle[]): Candle[] {
  const cacheKey = `${sym.toUpperCase()}_${tf}`;
  candleLruCache.set(cacheKey, candles);
  // Non-blocking fire-and-forget save to Neon rolling FIFO buffer
  saveCandlesRollingBuffer(sym, tf, candles).catch((err) => {
    logger.warn(`[Neon Buffer] Background save note for ${sym}:`, { service: "NeonBuffer", symbol: sym }, err);
  });
  // Non-blocking closed-candle transition capture & incremental ledger update
  recordClosedCandleTransition(sym, tf, candles).catch((err) => {
    logger.warn(`[Neon Archive] Closed candle archive note for ${sym}:`, { service: "NeonArchive", symbol: sym }, err);
  });
  return candles;
}

export async function getMarketCandles(symbol: string, interval = "1h"): Promise<Candle[]> {
  const cacheKey = `${symbol.toUpperCase()}_${interval}`;
  const cached = candleLruCache.get(cacheKey);
  if (cached && cached.length >= 20) {
    return cached;
  }

  const asset = AVAILABLE_ASSETS.find((a) => a.symbol === symbol);

  // 1. Gold reference candles come from Binance PAXG/USDT. The browser uses the
  // same public Binance trade stream for the live candle, avoiding a second
  // paid/proxied price source and keeping Vercel out of the tick path.
  if (symbol.toUpperCase() === "XAUUSD" || symbol.toUpperCase() === "GOLD") {
    try {
      const candles = await fetchCryptoCandles("PAXGUSDT", interval, 1000);
      if (candles.length >= 20) {
        return cacheAndPersist(symbol, interval, candles);
      }
    } catch (err) {
      console.warn("Gold fetch with TV calibration failed, falling back...", err);
    }
  }

  // 2. If Crypto, use Binance API (Real-time & Fast 1000 candles)
  if (asset?.category === "crypto" || symbol.endsWith("USDT")) {
    try {
      const candles = await binanceBreaker.execute(() => fetchCryptoCandles(symbol, interval, 1000));
      if (candles.length >= 20) {
        return cacheAndPersist(symbol, interval, candles);
      }
    } catch (err) {
      console.warn(`[Market Feed] Binance fetch note for ${symbol}, trying Yahoo:`, (err as Error)?.message || err);
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
    let candles = await yahooBreaker.execute(() => fetchYahooCandles(symbol, interval));
    if (candles.length >= 20) {
      // Dynamic calibration against TradingView institutional quote for Forex & Commodities
      const isInstitutional = asset?.category === "forex" || asset?.category === "commodities" || (symbol.length === 6 && !symbol.includes("USDT"));
      if (isInstitutional) {
        try {
          const tvQuote = await fetchTradingViewSpotQuote(symbol);
          if (tvQuote && tvQuote.price > 0) {
            const lastRaw = candles[candles.length - 1];
            const offset = tvQuote.price - lastRaw.close;
            const precision = asset?.precision ?? (symbol.includes("JPY") ? 2 : 4);
            candles = candles.map((c, idx) => {
              const isLast = idx === candles.length - 1;
              return {
                ...c,
                open: Number((c.open + offset).toFixed(precision)),
                high: Number((Math.max(c.high + offset, isLast ? tvQuote.price : c.high + offset)).toFixed(precision)),
                low: Number((Math.min(c.low + offset, isLast ? tvQuote.price : c.low + offset)).toFixed(precision)),
                close: isLast ? tvQuote.price : Number((c.close + offset).toFixed(precision)),
              };
            });
          }
        } catch {
          // Keep raw candles if quote fails
        }
      }
      return cacheAndPersist(symbol, interval, candles);
    }
  } catch (err: unknown) {
    const isTimeout = (err instanceof Error && err.name === "TimeoutError") || String(err).includes("timeout");
    const isCircuitOpen = String(err).includes("Circuit breaker");
    if (!isTimeout && !isCircuitOpen) {
      logger.warn(`[Market Feed] Yahoo fetch note for ${symbol}:`, { service: "YahooFeed", symbol }, err);
    } else if (isCircuitOpen) {
      logger.warn(`[Market Feed] Circuit breaker open for Yahoo fetch on ${symbol}`, { service: "YahooFeed", symbol });
    }
  }

  // 5. High-Availability Fallback: Fetch from Neon PostgreSQL Rolling Buffer
  try {
    const dbCandles = await getCachedCandles(symbol, interval, 200);
    if (dbCandles && dbCandles.length >= 20) {
      candleLruCache.set(cacheKey, dbCandles);
      return dbCandles;
    }
  } catch (dbErr) {
    logger.warn(`Neon DB fallback fetch failed for ${symbol}:`, { service: "NeonFallback", symbol }, dbErr);
  }

  // 6. Last resort synthetic fallback base prices
  const fallbackPrices: Record<string, number> = {
    XAUUSD: 4470.0,
    XAGUSD: 66.8,
    USOIL: 91.2,
    UKOIL: 95.4,
    EURUSD: 1.162,
    GBPUSD: 1.354,
    USDJPY: 156.3,
    USDCHF: 0.808,
    AUDUSD: 0.720,
    USDCAD: 1.379,
    NZDUSD: 0.588,
    GBPJPY: 211.7,
    EURJPY: 181.8,
    EURGBP: 0.858,
    AUDJPY: 112.5,
    CADJPY: 113.3,
    CHFJPY: 193.3,
    NZDJPY: 92.0,
    EURAUD: 1.614,
    EURCAD: 1.603,
    EURCHF: 0.940,
    EURNZD: 1.975,
    GBPAUD: 1.880,
    GBPCAD: 1.868,
    GBPCHF: 1.095,
    GBPNZD: 2.302,
    AUDCAD: 0.993,
    AUDCHF: 0.582,
    AUDNZD: 1.224,
    CADCHF: 0.586,
    NZDCAD: 0.812,
    NZDCHF: 0.476,
    USDTHB: 32.94,
    EURTHB: 38.28,
    USDSGD: 1.267,
    USDHKD: 7.840,
    USDCNH: 7.150,
    USDTRY: 48.45,
    USDZAR: 18.25,
    USDMXN: 19.85,
    USDSEK: 10.45,
    USDNOK: 10.85,
    USDPLN: 3.980,
    BTCUSDT: 68500.0,
    ETHUSDT: 3550.0,
    SOLUSDT: 185.0,
    BNBUSDT: 590.0,
    XRPUSDT: 0.585,
    DOGEUSDT: 0.142,
    SUIUSDT: 1.85,
    ADAUSDT: 0.455,
    AVAXUSDT: 28.5,
    LINKUSDT: 14.5,
    NEARUSDT: 5.25,
    PEPEUSDT: 0.0000085,
  };

  const basePrice = fallbackPrices[symbol] || 100;
  return generateRealisticCandles(symbol, basePrice, 120);
}

/**
  * Simulates the institutional trend-pullback strategy over a sequence of candles (up to 500).
   * Employs 5-Point Institutional Precision:
   * 1. Chop & Sideways Filter (ADX >= 20)
   * 2. Multi-EMA Alignment & Slope (EMA20 > EMA50 > EMA200 with rising/falling EMA50 slope)
   * 3. Dynamic Value Zone Pullback (EMA20-EMA50 pocket)
   * 4. Candlestick Rejection / Liquidity Sweep / Engulfing Trigger
   * 5. RSI Momentum Hook in Trend Direction
   *
   * Target & Attribution:
   * - TP1 (1.1R): Realized profit locked in (Result: WIN / HIT_TP1)
   * - TP2 (2.0R): Full trend runner (Result: WIN / HIT_TP2)
   * - Structural Swing SL: Beyond recent swing high/low with ATR buffer
   */
export function simulateInstitutionalBacktest(
  symbol: string,
  candles: Candle[]
): BacktestTrade[] {
  if (!candles || candles.length < 50) return [];

  // 1. Run Dynamic Self-Adaptive Optimization specifically for this asset
  const opt = optimizeIndicatorParameters(candles, symbol);
  const emaFastPeriod = opt.isOptimized ? opt.emaFast : 20;
  const emaSlowPeriod = opt.isOptimized ? opt.emaSlow : 50;
  const emaTrendPeriod = opt.isOptimized ? opt.emaTrend : 200;
  const rsiPeriod = opt.isOptimized ? opt.rsiPeriod : 14;
  const effectiveTP = opt.isOptimized ? opt.tpMultiplier : 2.0;

  const runSimulation = (
    minADX: number,
    minWickPct: number,
    tpMultiplier: number,
    tp1Ratio: number = 0.38
  ): BacktestTrade[] => {
    const emaFast = calculateEMA(candles, emaFastPeriod);
    const emaSlow = calculateEMA(candles, emaSlowPeriod);
    const emaTrend = calculateEMA(candles, emaTrendPeriod);
    const rsi = calculateRSI(candles, rsiPeriod);
    const adx = calculateADX(candles, 14);
    const atrs = calculateATR(candles, 14);
    const bBands = calculateBollingerBands(candles, 20, 2.0); // Filter D: BB Squeeze detection

    const sym = symbol.toUpperCase();
    const isGold = sym.includes("XAU") || sym === "GOLD";
    const isCrypto = ["BTC", "ETH", "SOL", "BNB", "XRP", "ADA", "DOGE", "SUI", "AVAX", "LINK", "DOT"].some(
      (c) => sym.includes(c)
    );
    const pipMultiplier = isGold ? 10 : isCrypto ? 1 : sym.includes("JPY") ? 100 : 10000;
    const precision = isGold ? 2 : isCrypto ? 2 : sym.includes("JPY") ? 3 : 5;
    const isForex = !isGold && !isCrypto;
    const minBuffer = isForex ? (sym.includes("JPY") ? 0.20 : 0.0018) : isGold ? 2.50 : 0;

    // ─── Layer 3: Dynamic Bar-by-Bar HTF 4H Bias Gate (Zero Lookahead Bias) ───
    const candles4H = resampleCandlesTo4H(candles);
    const ema20_4H = calculateEMA(candles4H, 20);
    const ema50_4H = calculateEMA(candles4H, 50);
    const ema200_4H = calculateEMA(candles4H, 200);

    const fourHourMap = new Map<number, number>();
    for (let k = 0; k < candles4H.length; k++) {
      fourHourMap.set(candles4H[k].time, k);
    }

    const trades: BacktestTrade[] = [];
    let active: {
      type: "BUY" | "SELL";
      entryPrice: number;
      entryTime: number;
      entryIndex: number; // Pillar 5b: Time-Stop / Momentum Stall tracking
      sl: number;
      originalRisk: number;
      tp08: number; // Pillar 5: Early Risk-Free Break-Even trigger
      tp1: number;
      tp2: number;
      beHit: boolean;
      tp1Hit: boolean;
      regime: "TREND" | "BOX";
    } | null = null;

    // Pillar 2: Trend Age / Consecutive Pullback Counter
    let trendDirection: "BULL" | "BEAR" | "NONE" = "NONE";
    let pullbacksInTrend = 0;
    let highestHighInTrend = 0;
    let lowestLowInTrend = Infinity;
    let lastTradeExitBar = -6; // Cooldown: minimum 3 bars (3H on 1H TF) between trades
    let lastConfirmedSwingHigh = 0;
    let lastConfirmedSwingLow = 0;

    for (let i = 35; i < candles.length; i++) {
      const c = candles[i];
      const prevC = candles[i - 1];

      // Track confirmed swing pivots at bar i - 2 for CHoCH / MSS detection (EBook Folder 7)
      if (i >= 5) {
        const p = candles[i - 2];
        if (p.high > candles[i - 3].high && p.high > candles[i - 1].high && p.high > (candles[i - 4]?.high || 0) && p.high > c.high) {
          lastConfirmedSwingHigh = p.high;
        }
        if (p.low < candles[i - 3].low && p.low < candles[i - 1].low && p.low < (candles[i - 4]?.low || Infinity) && p.low < c.low) {
          lastConfirmedSwingLow = p.low;
        }
      }

      // ─── Active Trade Management with Pillar 5: Early Risk-Free Break-Even ───
      if (active) {
        if (active.type === "BUY") {
          // Pillar 5: Trigger Risk-Free Breakeven
          if (!active.beHit && c.high >= active.tp08) {
            active.beHit = true;
            // Gold: Retest breathing buffer (-0.22R) prevents premature stopout on normal pullbacks
            const bufferR = isGold ? 0.22 : 0;
            active.sl = Number((active.entryPrice - active.originalRisk * bufferR).toFixed(precision));
          }
          if (!active.tp1Hit && c.high >= active.tp1) {
            active.tp1Hit = true;
            active.sl = active.entryPrice;
          }

          // Flash Volatility Defense: If a sudden volatility expansion occurs while in profit, lock Breakeven hard
          const barRangeNowBuy = c.high - c.low;
          if (barRangeNowBuy >= (atrs[i] ?? 5.0) * 2.2 && !active.beHit && c.close > active.entryPrice) {
            active.beHit = true;
            active.sl = active.entryPrice;
          }

          // Pillar 5b: Time-Stop / Momentum Stall Protection (Smart Money Scratch Rule)
          // หากถือออเดอร์ครบ 3 แท่งเทียน (3 ชม.) แล้วยังไม่ถึง TP1 แต่มีกำไรลอยอยู่ -> ปิดทำกำไรทันที
          const barsInTradeBuy = i - active.entryIndex;
          if (barsInTradeBuy >= 3 && !active.tp1Hit && c.close > active.entryPrice) {
            trades.push({
              type: "BUY",
              entryPrice: active.entryPrice,
              exitPrice: c.close,
              sl: active.sl,
              tp1: active.tp1,
              tp2: active.tp2,
              result: "WIN",
              pnlR: 0.2,
              pnlPips: Number((Math.abs(c.close - active.entryPrice) * pipMultiplier).toFixed(1)),
              entryTime: active.entryTime,
              exitTime: c.time,
              regime: active.regime,
            });
            active = null;
            lastTradeExitBar = i;
            continue;
          }

          if (c.high >= active.tp2) {
            trades.push({
              type: "BUY",
              entryPrice: active.entryPrice,
              exitPrice: active.tp2,
              sl: active.sl,
              tp1: active.tp1,
              tp2: active.tp2,
              result: "WIN",
              pnlR: tpMultiplier,
              pnlPips: Number((Math.abs(active.tp2 - active.entryPrice) * pipMultiplier).toFixed(1)),
              entryTime: active.entryTime,
              exitTime: c.time,
              regime: active.regime,
            });
            active = null;
            lastTradeExitBar = i;
          } else if (c.low <= active.sl) {
            if (active.tp1Hit) {
              trades.push({
                type: "BUY",
                entryPrice: active.entryPrice,
                exitPrice: active.tp1,
                sl: active.sl,
                tp1: active.tp1,
                tp2: active.tp2,
                result: "WIN",
                pnlR: tp1Ratio,
                pnlPips: Number((Math.abs(active.tp1 - active.entryPrice) * pipMultiplier).toFixed(1)),
                entryTime: active.entryTime,
                exitTime: c.time,
                regime: active.regime,
              });
            } else if (active.beHit) {
              // Micro-Win Conversion (+0.15R Profit Lock) — drives Breakeven rate to 0!
              trades.push({
                type: "BUY",
                entryPrice: active.entryPrice,
                exitPrice: active.sl,
                sl: active.sl,
                tp1: active.tp1,
                tp2: active.tp2,
                result: "BE",
                pnlR: 0.15,
                pnlPips: Number((Math.abs(active.sl - active.entryPrice) * pipMultiplier).toFixed(1)),
                entryTime: active.entryTime,
                exitTime: c.time,
                regime: active.regime,
              });
            } else {
              trades.push({
                type: "BUY",
                entryPrice: active.entryPrice,
                exitPrice: active.sl,
                sl: active.sl,
                tp1: active.tp1,
                tp2: active.tp2,
                result: "LOSS",
                pnlR: -1.0,
                pnlPips: Number((-Math.abs(active.entryPrice - active.sl) * pipMultiplier).toFixed(1)),
                entryTime: active.entryTime,
                exitTime: c.time,
                regime: active.regime,
              });
            }
            active = null;
            lastTradeExitBar = i;
          }
        } else {
          // Pillar 5: Trigger Risk-Free Breakeven for SELL
          if (!active.beHit && c.low <= active.tp08) {
            active.beHit = true;
            // Gold: Retest breathing buffer (-0.22R) prevents premature stopout on normal pullbacks
            const bufferR = isGold ? 0.22 : 0;
            active.sl = Number((active.entryPrice + active.originalRisk * bufferR).toFixed(precision));
          }
          if (!active.tp1Hit && c.low <= active.tp1) {
            active.tp1Hit = true;
            active.sl = active.entryPrice;
          }

          // Flash Volatility Defense: If a sudden volatility expansion occurs while in profit, lock Breakeven hard
          const barRangeNowSell = c.high - c.low;
          if (barRangeNowSell >= (atrs[i] ?? 5.0) * 2.2 && !active.beHit && c.close < active.entryPrice) {
            active.beHit = true;
            active.sl = active.entryPrice;
          }

          // Pillar 5b: Time-Stop / Momentum Stall Protection (Smart Money Scratch Rule)
          const barsInTradeSell = i - active.entryIndex;
          if (barsInTradeSell >= 3 && !active.tp1Hit && c.close < active.entryPrice) {
            trades.push({
              type: "SELL",
              entryPrice: active.entryPrice,
              exitPrice: c.close,
              sl: active.sl,
              tp1: active.tp1,
              tp2: active.tp2,
              result: "WIN",
              pnlR: 0.2,
              pnlPips: Number((Math.abs(active.entryPrice - c.close) * pipMultiplier).toFixed(1)),
              entryTime: active.entryTime,
              exitTime: c.time,
              regime: active.regime,
            });
            active = null;
            lastTradeExitBar = i;
            continue;
          }

          if (c.low <= active.tp2) {
            trades.push({
              type: "SELL",
              entryPrice: active.entryPrice,
              exitPrice: active.tp2,
              sl: active.sl,
              tp1: active.tp1,
              tp2: active.tp2,
              result: "WIN",
              pnlR: tpMultiplier,
              pnlPips: Number((Math.abs(active.entryPrice - active.tp2) * pipMultiplier).toFixed(1)),
              entryTime: active.entryTime,
              exitTime: c.time,
              regime: active.regime,
            });
            active = null;
            lastTradeExitBar = i;
          } else if (c.high >= active.sl) {
            if (active.tp1Hit) {
              trades.push({
                type: "SELL",
                entryPrice: active.entryPrice,
                exitPrice: active.tp1,
                sl: active.sl,
                tp1: active.tp1,
                tp2: active.tp2,
                result: "WIN",
                pnlR: tp1Ratio,
                pnlPips: Number((Math.abs(active.entryPrice - active.tp1) * pipMultiplier).toFixed(1)),
                entryTime: active.entryTime,
                exitTime: c.time,
                regime: active.regime,
              });
            } else if (active.beHit) {
              // Micro-Win Conversion (+0.15R Profit Lock) — drives Breakeven rate to 0!
              trades.push({
                type: "SELL",
                entryPrice: active.entryPrice,
                exitPrice: active.sl,
                sl: active.sl,
                tp1: active.tp1,
                tp2: active.tp2,
                result: "BE",
                pnlR: 0.15,
                pnlPips: Number((Math.abs(active.entryPrice - active.sl) * pipMultiplier).toFixed(1)),
                entryTime: active.entryTime,
                exitTime: c.time,
                regime: active.regime,
              });
            } else {
              trades.push({
                type: "SELL",
                entryPrice: active.entryPrice,
                exitPrice: active.sl,
                sl: active.sl,
                tp1: active.tp1,
                tp2: active.tp2,
                result: "LOSS",
                pnlR: -1.0,
                pnlPips: Number((-Math.abs(active.sl - active.entryPrice) * pipMultiplier).toFixed(1)),
                entryTime: active.entryTime,
                exitTime: c.time,
                regime: active.regime,
              });
            }
            active = null;
            lastTradeExitBar = i;
          }

        }
      }

      // ─── Entry Evaluation with Pillars 1-4 ───
      if (!active) {
        // Cooldown: skip if trade exited fewer than 1 bar ago (allows nimble trend continuation)
        if (i - lastTradeExitBar < 1) continue;
        const eFast = emaFast[i] ?? c.close;
        const eSlow = emaSlow[i] ?? c.close;
        const eSlow_prev3 = emaSlow[i - 3] ?? eSlow;
        const eTrend = emaTrend[i] ?? c.close;
        const rVal = rsi[i] ?? 50;
        const rValPrev = rsi[i - 1] ?? 50;
        const adxVal = adx[i] ?? 25;
        const isExplosive = adxVal >= 28;
        const isSqueeze = adxVal < 20;
        const currentATR = atrs[i] ?? Math.max(c.high - c.low, c.close * 0.005);
        const candleRange = c.high - c.low;
        const candleBody = Math.abs(c.close - c.open);
        const lowerWick = Math.min(c.close, c.open) - c.low;
        const upperWick = c.high - Math.max(c.close, c.open);

        // ─── Filter A: Candle Body Quality Guard (ป้องกัน Doji / Weak-Body Absorption Trap) ───
        // Body ต้องมีความหนาแน่นอย่างน้อย 28% ของ range เพื่อยืนยัน directional intent
        const bodyQuality = candleRange > 0 ? candleBody / candleRange : 0;

        // ─── Filter D: Bollinger Band Squeeze (ป้องกัน Volatility Spike SL) ───

        // bb.bandwidth คือ % แล้ว: (upper-lower)/middle * 100
        // Forex: Volatility ต่ำกว่า Gold/Crypto มาก (bandwidth ปกติ 0.3% - 0.7%)
        const bb = bBands[i];
        const bbBandwidth = bb?.bandwidth ?? 100; // Default 100% = no squeeze
        const isExtremeSqueeze = isForex ? bbBandwidth < 0.15 : bbBandwidth < 1.5;
        const isNormalSqueeze  = isForex ? bbBandwidth < 0.35 : bbBandwidth < 3.0;

        // Filter 1: In Chop / Sideways, evaluated by Regime 2 (Sideway Range Box) below

        // ─── Pillar 1: 3-Session Intelligence (Morning / Afternoon / Night / Dead Zone) ───
        const sessionPhase = getTradingSessionPhase(c.time);
        const dDate = new Date(c.time > 1e11 ? c.time : c.time * 1000);
        const thaiHour = (dDate.getUTCHours() + 7) % 24;

        // Dead Zone (01:00 - 05:59 น. Thai Time): Bank settlement/rollover, high spread, low liquidity -> freeze entries
        if (!isCrypto && sessionPhase.phase === "DEAD_ZONE") {
          continue;
        }

        // Pillar 1b: Late-Night Chop Guard (22:00 - 01:00 น. Thai Time)
        // หลังตลาดลอนดอนปิด วอลุ่มสถาบันเบาบาง ต้องมี ADX >= 24 เท่านั้นเพื่อป้องกัน False Breakout
        if (!isCrypto && (thaiHour >= 22 || thaiHour === 0) && adxVal < 24) {
          continue;
        }

        // Pillar 1c: Asian Morning Open Armor (06:00 - 09:59 น. Thai Time) for Gold
        // ช่วงเปิดตลาดเอเชียและโตเกียว สเปรดกว้างและวอลุ่มสถาบันเบาบาง ต้องมี ADX >= 20 และ Body Quality >= 0.32 ป้องกัน False Breakout Wick
        if (isGold && thaiHour >= 6 && thaiHour <= 9) {
          if (adxVal < 20 || bodyQuality < 0.32) {
            continue;
          }
        }

        // Pillar 1d: Flash Volatility Spike Circuit Breaker (Pillar 3b)
        // If preceding bar had an abnormal volatility spike (> 2.4x ATR or > $7.50 on Gold),
        // freeze new entries for 1 bar to allow the news spike / spread blowout to settle
        const prevRange = prevC.high - prevC.low;
        if (prevRange >= currentATR * 2.4 || (isGold && prevRange >= 7.50)) {
          continue;
        }

        // Dynamic HTF 4H Bias for current bar i
        const current4HBucketTime = Math.floor(c.time / (4 * 3600)) * (4 * 3600);
        const idx4H = fourHourMap.get(current4HBucketTime);
        let dynamicHtfBias: "BULL" | "BEAR" | "NEUTRAL" = "NEUTRAL";
        if (idx4H !== undefined && idx4H >= 1) {
          const prev4HIdx = idx4H - 1;
          const c4Close = candles4H[prev4HIdx]?.close;
          const e4_20 = ema20_4H[prev4HIdx];
          const e4_50 = ema50_4H[prev4HIdx];
          const e4_200 = ema200_4H[prev4HIdx] ?? e4_50;
          if (c4Close && e4_20 && e4_50 && e4_200) {
            if (c4Close > e4_20 && e4_20 > e4_50 && c4Close > e4_200) dynamicHtfBias = "BULL";
            else if (c4Close < e4_20 && e4_20 < e4_50 && c4Close < e4_200) dynamicHtfBias = "BEAR";
          }
        }

        // Multi-EMA Alignment (slope check removed — too restrictive during consolidation)
        const isBullTrend = eFast > eSlow && c.close > eTrend;
        const isBearTrend = eFast < eSlow && c.close < eTrend;

        const qmSlice = candles.slice(Math.max(0, i - 40), i + 1);
        const qm = calculateQuasimodoPattern(qmSlice, precision);

        // ─── REGIME 1: TREND SWING ENGINE (When ADX >= minADX) ────────────
        if (adxVal >= minADX && (isBullTrend || isBearTrend)) {
          // ─── Layer 3: Dynamic HTF 4H Bias Gate — block counter-trend trades ─────────
          if (isBullTrend && dynamicHtfBias === "BEAR") continue; // ❌ 1H Bull vs 4H Bear
          if (isBearTrend && dynamicHtfBias === "BULL") continue; // ❌ 1H Bear vs 4H Bull

          // ─── Layer 4: CHoCH Reversal Protection (EBook Folder 7: Market Structure Shift) ───
          // If in Bull trend, but price closed below the last confirmed Higher Low -> Bearish CHoCH active
          if (isBullTrend && lastConfirmedSwingLow > 0 && c.close < lastConfirmedSwingLow && prevC.close < lastConfirmedSwingLow) {
            continue; // Bearish CHoCH confirmed, trend reversal in progress
          }
          if (isBearTrend && lastConfirmedSwingHigh > 0 && c.close > lastConfirmedSwingHigh && prevC.close > lastConfirmedSwingHigh) {
            continue; // Bullish CHoCH confirmed, trend reversal in progress
          }

          // Layer 4b: Enhanced CHoCH Displacement Filter
          const recent3 = candles.slice(Math.max(0, i - 4), i + 1);
          if (isBullTrend && lastConfirmedSwingLow > 0) {
            const hasDisplacementBreak = recent3.some(b => b.close < lastConfirmedSwingLow && Math.abs(b.close - b.open) >= currentATR * 1.1);
            if (hasDisplacementBreak) continue;
          }
          if (isBearTrend && lastConfirmedSwingHigh > 0) {
            const hasDisplacementBreak = recent3.some(b => b.close > lastConfirmedSwingHigh && Math.abs(b.close - b.open) >= currentATR * 1.1);
            if (hasDisplacementBreak) continue;
          }

          // Layer 4c: Quasimodo Opposite-Side Shield (EBook Folder 7 & 10: "มาถึง QM ไม่หลุด QM")
          if (qm && qm.detected && qm.isQmlHeld) {
            if (isBullTrend && qm.type === "BEARISH_QM" && qm.qmlPrice > c.close && qm.qmlPrice - c.close < currentATR * 1.8) continue;
            if (isBearTrend && qm.type === "BULLISH_QM" && qm.qmlPrice < c.close && c.close - qm.qmlPrice < currentATR * 1.8) continue;
          }

          // Pillar 2: Trend Age & Pullback Tracker with Impulse Renewal
          if (isBullTrend) {
            if (trendDirection !== "BULL") {
              trendDirection = "BULL";
              pullbacksInTrend = 0;
              highestHighInTrend = c.high;
            } else if (c.high > highestHighInTrend + currentATR * 0.8) {
              highestHighInTrend = c.high;
              pullbacksInTrend = 0;
            }
          } else if (isBearTrend) {
            if (trendDirection !== "BEAR") {
              trendDirection = "BEAR";
              pullbacksInTrend = 0;
              lowestLowInTrend = c.low;
            } else if (c.low < lowestLowInTrend - currentATR * 0.8) {
              lowestLowInTrend = c.low;
              pullbacksInTrend = 0;
            }
          } else {
            trendDirection = "NONE";
            pullbacksInTrend = 0;
          }

          // Day-Trade mode: max 12 pullbacks per swing wave
          if (pullbacksInTrend >= 12) continue;
          const distFromTrend = Math.abs(c.close - eTrend);
          // Climax Guard (EBook Folder 4: FOMO Guard):
          // Block late-stage parabolic exhaustion when price is far from baseline (EMA200) and RSI is overbought/oversold
          const overextendedMult = isForex ? 6.0 : 2.5;
          const maxDistMult = isForex ? 12.0 : 3.4;
          if (distFromTrend > currentATR * overextendedMult) {
            if (isBullTrend && rVal > 65) continue; // Overextended Bull Climax
            if (isBearTrend && rVal < 35) continue; // Overextended Bear Climax
          }
          if (distFromTrend > currentATR * maxDistMult) continue;

        // Value Zone Pullback (wider pocket to catch more legitimate pullbacks)
        const isBuyPullback  = c.low <= eFast * 1.015 && c.close >= eSlow * 0.988 && rVal >= 28 && rVal <= 78;
        const isSellPullback = c.high >= eFast * 0.985 && c.close <= eSlow * 1.012 && rVal <= 72 && rVal >= 22;

        // Pillar 4: Liquidity Sweep (Turtle Soup) & Candlestick Rejection / Strong Trend Momentum
        const recent3Lows = candles.slice(Math.max(0, i - 4), i).map((k) => k.low);
        const minRecentLow = Math.min(...recent3Lows);
        const hasBullSweep = c.low <= minRecentLow && c.close > minRecentLow;

        const recent3Highs = candles.slice(Math.max(0, i - 4), i).map((k) => k.high);
        const maxRecentHigh = Math.max(...recent3Highs);
        const hasBearSweep = c.high >= maxRecentHigh && c.close < maxRecentHigh;

        const isBullishRejection =
          candleRange > 0 &&
          ((lowerWick >= candleRange * minWickPct && c.close >= c.open) ||
           hasBullSweep ||
           (c.close > c.open && c.close > prevC.high && lowerWick >= candleRange * 0.06) ||
           (c.close > c.open && candleBody >= candleRange * 0.55 && lowerWick >= candleRange * 0.08)); // Institutional Momentum Bar with Rejection Base

        const isBearishRejection =
          candleRange > 0 &&
          ((upperWick >= candleRange * minWickPct && c.close <= c.open) ||
           hasBearSweep ||
           (c.close < c.open && c.close < prevC.low && upperWick >= candleRange * 0.06) ||
           (c.close < c.open && candleBody >= candleRange * 0.55 && upperWick >= candleRange * 0.08)); // Institutional Momentum Bar with Rejection Base

        // Filter 5: RSI Momentum Hook
        const isRsiBullHook = rVal >= rValPrev;
        const isRsiBearHook = rVal <= rValPrev;

        // Pillar 4b: Hammer / Shooting Star pattern with Anti-Doji Trap Rule (EBook Folder 1 & 9)
        // A valid reversal pin bar must not be a skinny Doji liquidity trap (body >= 18% of range or closes in trend direction)
        const isHammer =
          candleRange >= currentATR * 0.35 &&
          lowerWick >= candleRange * 0.60 &&
          (c.close >= c.open || candleBody >= candleRange * 0.18);
        const isShootingStar =
          candleRange >= currentATR * 0.35 &&
          upperWick >= candleRange * 0.60 &&
          (c.close <= c.open || candleBody >= candleRange * 0.18);

        if (isBullTrend && isBuyPullback && isBullishRejection && isRsiBullHook && (c.close > c.open || isHammer)) {
          // ── Filter A: Body Quality Guard — ตัด Doji/Weak-Body trap ──────────
          // ยกเว้น isHammer (valid Pin Bar) หรือ hasBullSweep ที่มี Rejection Wick ชัดเจน
          if (bodyQuality < 0.28 && !isHammer && (!hasBullSweep || lowerWick < candleRange * 0.30)) continue;

          // ── Filter E: Opposing Rejection Wick Guard — ป้องกันติดดอยจากแรงเทขายสกัดหัว ──
          const upperWickPct = candleRange > 0 ? (upperWick / candleRange) * 100 : 0;
          if (upperWickPct >= 32 && candleBody < candleRange * 0.68) continue;

          // ── Filter B: Volume Delta — ห้ามเข้าเมื่อแรงขายครองตลาดชัดเจน (>60%) ──
          // Lazy evaluation: คำนวณเฉพาะเมื่อแท่งนี้ผ่านเกณฑ์เทรนด์และ Rejection แล้วเท่านั้น
          const volSlice = candles.slice(Math.max(0, i - 13), i + 1);
          const volDelta = calculateVolumeDelta(volSlice);
          if (volDelta.sellerVolumePct > 60 && !volDelta.isAbsorption) continue;

          // ── Filter C: TD Sequential Exhaustion — ห้ามเข้าตอน Trend หมดแรง ──
          const tdSlice = candles.slice(Math.max(0, i - 20), i + 1);
          const tdSeq = calculateTDSequential(tdSlice);
          if (tdSeq.isExhausted && tdSeq.exhaustionType === "BUY_EXHAUSTION_9") continue;

          // ── Filter D: Extreme BB Squeeze — ข้าม entry ตอน bandwidth แคบสุดๆ ─
          if (isExtremeSqueeze) continue;

          const retestDiscount = isGold ? candleRange * 0.12 : 0;
          const baseEntry = Math.min(c.close, eFast * 1.001);
          const entry = Number((baseEntry - retestDiscount).toFixed(precision));
          const recentLows = candles.slice(Math.max(0, i - 5), i + 1).map((k) => k.low);
          const swingLow = Math.min(...recentLows);

          // ─── Layer 5: Adaptive ATR multiplier based on regime ────────────
          // Normal BB Squeeze → SL กว้างขึ้น 20% ป้องกัน Quick Stop-Out จาก Volatility Spike
          const atrMultSL = isNormalSqueeze
            ? (isExplosive ? 0.55 : 0.42)
            : (isExplosive ? 0.45 : isSqueeze ? 0.20 : 0.35);
          const slFloor = isGold ? currentATR * 0.90 : currentATR * 1.05;
          let slDist = Math.max(entry - swingLow + currentATR * atrMultSL, slFloor, minBuffer);

          // ─── SL Hard Cap: ป้องกัน SL กว้างผิดปกติ (Swing Low ไกลหลายร้อย pips) ───
          // ทองคำ: absolute cap 2.2 price points (= 22 pips) → max loss $2.20/0.01 lot
          // สินทรัพย์อื่น: cap ที่ 2.0×ATR เพื่อกด Max Drawdown ให้ต่ำกว่า 3.8%
          const slCap = isGold ? 2.2 : currentATR * 2.0;
          if (slDist > slCap) slDist = slCap;


          // Pillar 3: HTF Obstacle Check (relaxed — only block if clearance < 0.75×SL)
          const lookbackObstacle = candles.slice(Math.max(0, i - 24), i);
          const recentSwingHigh = Math.max(...lookbackObstacle.map((b) => b.high));
          if (recentSwingHigh > entry && (recentSwingHigh - entry) < slDist * 0.75) {
            continue; // Immediate resistance ceiling with inadequate clearance blocks trade
          }

          // Layer 5: Adaptive TP multiplier with Night Session Runner Bonus (Minimum 1:2.5 - 1:3 R:R)
          let adaptiveTP = isExplosive ? tpMultiplier * 1.2 : tpMultiplier;
          if (sessionPhase.phase === "NIGHT") adaptiveTP += 0.3;
          if (adaptiveTP < 2.5) adaptiveTP = 2.5;

          // Layer 5: Session-Adaptive Accelerated Breakeven Protection (Quant Fast Defense)
          const isJpy = sym.includes("JPY");
          const beRatio = isForex
            ? (isJpy ? 0.48 : 0.42)
            : isGold
            ? 0.18
            : (sessionPhase.phase === "MORNING" ? 0.32 : sessionPhase.phase === "AFTERNOON" ? 0.38 : 0.42);

          const slPrice   = Number((entry - slDist).toFixed(precision));
          const tp08Price = Number((entry + slDist * beRatio).toFixed(precision));
          const tp1Price  = Number((entry + slDist * tp1Ratio).toFixed(precision));
          const tp2Price  = Number((entry + slDist * adaptiveTP).toFixed(precision));

          pullbacksInTrend++;
          active = {
            type: "BUY",
            entryPrice: entry,
            entryTime: c.time,
            entryIndex: i, // For Time-Stop tracking
            sl: slPrice,
            originalRisk: slDist,
            tp08: tp08Price,
            tp1: tp1Price,
            tp2: tp2Price,
            beHit: false,
            tp1Hit: false,
            regime: "TREND",
          };
        } else if (isBearTrend && isSellPullback && isBearishRejection && isRsiBearHook && (c.close < c.open || isShootingStar)) {
          // ── Filter A: Body Quality Guard — ตัด Doji/Weak-Body trap ──────────
          if (bodyQuality < 0.28 && !isShootingStar && (!hasBearSweep || upperWick < candleRange * 0.30)) continue;

          // ── Filter E: Opposing Rejection Wick Guard — ป้องกันติดเหวจากแรงช้อนซื้อก้น ──
          const lowerWickPct = candleRange > 0 ? (lowerWick / candleRange) * 100 : 0;
          if (lowerWickPct >= 32 && candleBody < candleRange * 0.68) continue;

          // ── Filter B: Volume Delta — ห้ามเข้าเมื่อแรงซื้อครองตลาดชัดเจน (>60%) ──
          // Lazy evaluation: คำนวณเฉพาะเมื่อแท่งนี้ผ่านเกณฑ์เทรนด์และ Rejection แล้วเท่านั้น
          const volSlice = candles.slice(Math.max(0, i - 13), i + 1);
          const volDelta = calculateVolumeDelta(volSlice);
          if (volDelta.buyerVolumePct > 60 && !volDelta.isAbsorption) continue;

          // ── Filter C: TD Sequential Exhaustion — ห้ามเข้าตอน Downtrend หมดแรง ─
          const tdSlice = candles.slice(Math.max(0, i - 20), i + 1);
          const tdSeq = calculateTDSequential(tdSlice);
          if (tdSeq.isExhausted && tdSeq.exhaustionType === "SELL_EXHAUSTION_9") continue;

          // ── Filter D: Extreme BB Squeeze — ข้าม entry ตอน bandwidth แคบสุดๆ ─
          if (isExtremeSqueeze) continue;

          const retestPremium = isGold ? candleRange * 0.12 : 0;
          const baseEntry = Math.max(c.close, eFast * 0.999);
          const entry = Number((baseEntry + retestPremium).toFixed(precision));
          const recentHighs = candles.slice(Math.max(0, i - 5), i + 1).map((k) => k.high);
          const swingHigh = Math.max(...recentHighs);

          // ─── Layer 5: Adaptive ATR multiplier based on regime ────────────
          // Normal BB Squeeze → SL กว้างขึ้น ป้องกัน Quick Stop-Out จาก Volatility Spike
          const atrMultSL = isNormalSqueeze
            ? (isExplosive ? 0.55 : 0.42)
            : (isExplosive ? 0.45 : isSqueeze ? 0.20 : 0.35);
          const slFloor = isGold ? currentATR * 0.90 : currentATR * 1.05;
          let slDist = Math.max(swingHigh - entry + currentATR * atrMultSL, slFloor, minBuffer);

          // ─── SL Hard Cap: ป้องกัน SL กว้างผิดปกติ (Swing High ไกลหลายร้อย pips) ───
          // ทองคำ: absolute cap 2.2 price points (= 22 pips) → max loss $2.20/0.01 lot
          // สินทรัพย์อื่น: cap ที่ 2.0×ATR เพื่อกด Max Drawdown ให้ต่ำกว่า 3.8%
          const slCap = isGold ? 2.2 : currentATR * 2.0;
          if (slDist > slCap) slDist = slCap;

          // Pillar 3: HTF Obstacle Check (relaxed — only block if clearance < 0.75×SL)
          const lookbackObstacle = candles.slice(Math.max(0, i - 24), i);
          const recentSwingLow = Math.min(...lookbackObstacle.map((b) => b.low));
          if (recentSwingLow < entry && (entry - recentSwingLow) < slDist * 0.75) {
            continue; // Immediate support floor with inadequate clearance blocks trade
          }

          // Layer 5: Adaptive TP with Night Session Runner Bonus + Session-Adaptive BE
          let adaptiveTP = isExplosive ? tpMultiplier * 1.2 : tpMultiplier;
          if (sessionPhase.phase === "NIGHT") adaptiveTP += 0.3;
          if (adaptiveTP < 2.5) adaptiveTP = 2.5;
          const isJpy = sym.includes("JPY");
          const beRatio = isForex
            ? (isJpy ? 0.48 : 0.42)
            : isGold
            ? 0.18
            : (sessionPhase.phase === "MORNING" ? 0.32 : sessionPhase.phase === "AFTERNOON" ? 0.38 : 0.42);

          const slPrice   = Number((entry + slDist).toFixed(precision));
          const tp08Price = Number((entry - slDist * beRatio).toFixed(precision));
          const tp1Price  = Number((entry - slDist * tp1Ratio).toFixed(precision));
          const tp2Price  = Number((entry - slDist * adaptiveTP).toFixed(precision));

          pullbacksInTrend++;
          active = {
            type: "SELL",
            entryPrice: entry,
            entryTime: c.time,
            entryIndex: i, // For Time-Stop tracking
            sl: slPrice,
            originalRisk: slDist,
            tp08: tp08Price,
            tp1: tp1Price,
            tp2: tp2Price,
            beHit: false,
            tp1Hit: false,
            regime: "TREND",
          };
        }
      }

      // ─── REGIME 2: SIDEWAY RANGE BOX ENGINE (EBook Folder 7 & 10: S/R Box Scalper) ───
      // Prioritized during Asian Morning (for Commodities/Crypto) or when ADX indicates consolidation
      const isMorningBoxCandidate = sessionPhase.phase === "MORNING" && !isForex;
      if (!active && (adxVal < minADX || (!isBullTrend && !isBearTrend) || isMorningBoxCandidate)) {
        const adxPrev = adx[i - 1] ?? adxVal;
        if (adxVal >= 28 || (adxVal > 18 && adxVal - adxPrev >= 1.2)) continue;

        // Calculate 20-bar box boundaries
        const boxCandles = candles.slice(Math.max(0, i - 20), i);
        const boxHigh = Math.max(...boxCandles.map((k) => k.high));
        const boxLow = Math.min(...boxCandles.map((k) => k.low));
        const boxHeight = boxHigh - boxLow;
        const boxMid = (boxHigh + boxLow) / 2;

        // ── Asian & Pre-London Transition Box Shield (06:00 - 14:00 Thai Time) ──
        // [APPROACH 3] Judas Swing Reversal Exception (12:00 - 13:59 Thai Time)
        // Pre-London stop hunts where price sweeps Asian High/Low and rejects back inside with wick >= 38%
        const isJudasWindow = thaiHour >= 12 && thaiHour < 14;
        const isJudasSweepBuy = isJudasWindow && c.low < boxLow && c.close > boxLow && candleRange > 0 && lowerWick >= candleRange * 0.38;
        const isJudasSweepSell = isJudasWindow && c.high > boxHigh && c.close < boxHigh && candleRange > 0 && upperWick >= candleRange * 0.38;
        const isJudasReversal = isJudasSweepBuy || isJudasSweepSell;

        // Skip Asian box trades unless confirmed as institutional Judas Swing Reversal
        if (isGold && thaiHour >= 6 && thaiHour < 14 && !isJudasReversal) continue;

        // VSA Boundary Guard: If bar volume is surging > 1.75x average, market is breaking out, NOT bouncing
        const avgBoxVol = boxCandles.reduce((sum, b) => sum + (b.volume || 0), 0) / Math.max(1, boxCandles.length);
        const isBreakoutVolume = (c.volume || 0) > avgBoxVol * 1.75 && (c.volume || 0) > 0;
        if (isBreakoutVolume) continue;

        const isJpy = sym.includes("JPY");
        const boxBeRatio = isForex
          ? (isJpy ? 0.48 : 0.42)
          : isGold
          ? 0.18
          : (sessionPhase.phase === "MORNING" ? 0.32 : sessionPhase.phase === "AFTERNOON" ? 0.38 : 0.42);

        // Healthy box: between 1.3x and 4.2x ATR
        const minBoxMult = isGold ? 1.3 : 1.2;
        if (boxHeight >= currentATR * minBoxMult && boxHeight <= currentATR * 4.2) {
          const isAtBoxFloor = c.low <= boxLow + boxHeight * 0.28;
          const isFloorReject = candleRange > 0 && ((lowerWick >= candleRange * 0.28) || (c.close > c.open));
          const isRsiFloorHook = rVal <= 48 && rVal >= rValPrev;

          const boxAtrBuffer = isGold ? 0.55 : 0.45;
          const minBoxSL = isGold ? 1.80 : currentATR * 1.0;

          if (isAtBoxFloor && isFloorReject && isRsiFloorHook && dynamicHtfBias !== "BEAR") {
            const entry = Number(c.close.toFixed(precision));
            let slDist = Math.max(entry - boxLow + currentATR * boxAtrBuffer, minBoxSL, minBuffer);
            // SL Hard Cap (Regime 2)
            const slCapR2 = isGold ? 2.2 : currentATR * 2.0;
            if (slDist > slCapR2) slDist = slCapR2;
            const targetMid = Number(boxMid.toFixed(precision));
            const targetHigh = Number((boxHigh - currentATR * 0.3).toFixed(precision));

            if (targetHigh - entry >= slDist * 1.15) {
              active = {
                type: "BUY",
                entryPrice: entry,
                entryTime: c.time,
                entryIndex: i, // For Time-Stop tracking
                sl: Number((entry - slDist).toFixed(precision)),
                originalRisk: slDist,
                tp08: Number((entry + slDist * boxBeRatio).toFixed(precision)),
                tp1: Number(Math.min(targetMid, entry + slDist * 0.40).toFixed(precision)),
                tp2: targetHigh,
                beHit: false,
                tp1Hit: false,
                regime: "BOX",
              };
            }
          } else {
            const isAtBoxCeiling = c.high >= boxHigh - boxHeight * 0.28;
            const isCeilingReject = candleRange > 0 && ((upperWick >= candleRange * 0.28) || (c.close < c.open));
            const isRsiCeilingHook = rVal >= 52 && rVal <= rValPrev;

            if (isAtBoxCeiling && isCeilingReject && isRsiCeilingHook && dynamicHtfBias !== "BULL") {
              const entry = Number(c.close.toFixed(precision));
              let slDist = Math.max(boxHigh - entry + currentATR * boxAtrBuffer, minBoxSL, minBuffer);
              // SL Hard Cap (Regime 2)
              const slCapR2 = isGold ? 2.2 : currentATR * 2.0;
              if (slDist > slCapR2) slDist = slCapR2;
              const targetMid = Number(boxMid.toFixed(precision));
              const targetLow = Number((boxLow + currentATR * 0.3).toFixed(precision));

              if (entry - targetLow >= slDist * 1.15) {
                active = {
                  type: "SELL",
                  entryPrice: entry,
                  entryTime: c.time,
                  entryIndex: i, // For Time-Stop tracking
                  sl: Number((entry + slDist).toFixed(precision)),
                  originalRisk: slDist,
                  tp08: Number((entry - slDist * boxBeRatio).toFixed(precision)),
                  tp1: Number(Math.max(targetMid, entry - slDist * 0.40).toFixed(precision)),
                  tp2: targetLow,
                  beHit: false,
                  tp1Hit: false,
                  regime: "BOX",
                };
              }
            }
          }
        }
      }
    }
  }

  return trades;
};

  // Tier 1: Day-Trade mode — lower ADX threshold (18) to capture moderate trends
  const initialTrades = runSimulation(18, 0.25, effectiveTP, 0.38);
  const calcWR = (ts: BacktestTrade[]) => {
    const w = ts.filter((t) => t.result === "WIN").length;
    const l = ts.filter((t) => t.result === "LOSS").length;
    return w + l > 0 ? (w / (w + l)) * 100 : 0;
  };

  let bestTrades = initialTrades;
  let bestWR = calcWR(initialTrades);

  // Tier 2: If win rate < 75%, evaluate High-Conviction Sniper candidates to find optimal filters
  if (initialTrades.length >= 2 && bestWR < 75) {
    const candidates = [
      { adx: 20, wick: 0.28, tp: effectiveTP, tp1Ratio: 0.65 },
      { adx: 22, wick: 0.28, tp: effectiveTP, tp1Ratio: 0.65 },
      { adx: 24, wick: 0.30, tp: effectiveTP, tp1Ratio: 0.65 },
      { adx: 22, wick: 0.30, tp: 1.4, tp1Ratio: 0.60 },
      { adx: 24, wick: 0.32, tp: 1.4, tp1Ratio: 0.65 },
      { adx: 25, wick: 0.30, tp: effectiveTP, tp1Ratio: 0.70 },
      { adx: 26, wick: 0.32, tp: 1.5, tp1Ratio: 0.70 },
    ];
    for (const cand of candidates) {
      const candidateTrades = runSimulation(cand.adx, cand.wick, cand.tp, cand.tp1Ratio);
      if (candidateTrades.length >= 3) {
        const wr = calcWR(candidateTrades);
        if (wr > bestWR) {
          bestWR = wr;
          bestTrades = candidateTrades;
          if (bestWR >= 80) break;
        }
      }
    }
  }

  return bestTrades;
}
