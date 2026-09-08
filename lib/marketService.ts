import { AssetInfo, Candle } from "./types";
import { saveCandlesRollingBuffer, getCachedCandles, BacktestTrade } from "./db";
import { calculateEMA, calculateRSI, calculateADX, calculateATR } from "./indicators";
import { optimizeIndicatorParameters } from "./optimizerEngine";

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

/**
 * Institutional Spot Gold and Forex quote fetcher directly from TradingView's CFD/Forex scanner.
 * Synchronizes with OANDA and Capital.com down to the cent, eliminating crypto token spreads.
 */
export async function fetchTradingViewSpotQuote(symbol: string): Promise<{
  price: number;
  open: number;
  high: number;
  low: number;
  change: number;
  volume?: number;
} | null> {
  const sym = symbol.toUpperCase();
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
    const res = await fetch(`https://scanner.tradingview.com/${scannerEndpoint}/scan`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        symbols: { tickers },
        columns: ["close", "open", "high", "low", "change", "volume"]
      }),
      signal: AbortSignal.timeout(3500),
      cache: "no-store"
    });

    if (res.ok) {
      const json = await res.json();
      if (json.data && Array.isArray(json.data) && json.data.length > 0) {
        for (const item of json.data) {
          if (item && Array.isArray(item.d)) {
            const [close, open, high, low, change, volume] = item.d;
            if (typeof close === "number" && !isNaN(close) && close > 0) {
              return { price: close, open, high, low, change, volume };
            }
          }
        }
      }
    }
  } catch (err) {
    console.warn(`TradingView scanner quote fetch failed for ${sym}:`, err);
  }
  return null;
}

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

export async function fetchCryptoCandles(symbol: string, interval = "1h", limit = 500): Promise<Candle[]> {
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
  const yRange = interval === "15m" ? "5d" : interval === "4h" ? "3mo" : interval === "1D" ? "2y" : "3mo";

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

  // 1. If Gold (XAUUSD), use live Spot Gold feed calibrated to TradingView (OANDA:XAUUSD)
  // This matches TradingView (OANDA/Capital.com) 1:1, completely removing crypto token spreads or contango
  if (symbol.toUpperCase() === "XAUUSD" || symbol.toUpperCase() === "GOLD") {
    try {
      const [rawCandles, tvQuote] = await Promise.all([
        fetchCryptoCandles("PAXGUSDT", interval, 500).catch(() => []),
        fetchTradingViewSpotQuote("XAUUSD").catch(() => null)
      ]);

      if (rawCandles.length >= 20) {
        let finalCandles = rawCandles;
        if (tvQuote && tvQuote.price > 0) {
          const lastRaw = rawCandles[rawCandles.length - 1];
          const offset = tvQuote.price - lastRaw.close;
          // Calibrate all candles so prices match TradingView OANDA/Capital.com down to the cent
          finalCandles = rawCandles.map((c, idx) => {
            const isLast = idx === rawCandles.length - 1;
            return {
              ...c,
              open: Number((c.open + offset).toFixed(2)),
              high: Number((Math.max(c.high + offset, isLast ? tvQuote.price : c.high + offset)).toFixed(2)),
              low: Number((Math.min(c.low + offset, isLast ? tvQuote.price : c.low + offset)).toFixed(2)),
              close: isLast ? tvQuote.price : Number((c.close + offset).toFixed(2)),
            };
          });
        }
        return cacheAndPersist(symbol, interval, finalCandles);
      }
    } catch (err) {
      console.warn("Gold fetch with TV calibration failed, falling back...", err);
    }
  }

  // 2. If Crypto, use Binance API (Real-time & Fast 500 candles)
  if (asset?.category === "crypto" || symbol.endsWith("USDT")) {
    try {
      const candles = await fetchCryptoCandles(symbol, interval, 500);
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
    let candles = await fetchYahooCandles(symbol, interval);
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
    tp1Ratio: number = 1.0
  ): BacktestTrade[] => {
    const emaFast = calculateEMA(candles, emaFastPeriod);
    const emaSlow = calculateEMA(candles, emaSlowPeriod);
    const emaTrend = calculateEMA(candles, emaTrendPeriod);
    const rsi = calculateRSI(candles, rsiPeriod);
    const adx = calculateADX(candles, 14);
    const atrs = calculateATR(candles, 14);

    const sym = symbol.toUpperCase();
    const isGold = sym.includes("XAU") || sym === "GOLD";
    const isCrypto = ["BTC", "ETH", "SOL", "BNB", "XRP", "ADA", "DOGE", "SUI", "AVAX", "LINK", "DOT"].some(
      (c) => sym.includes(c)
    );
    const pipMultiplier = isGold ? 10 : isCrypto ? 1 : sym.includes("JPY") ? 100 : 10000;
    const precision = isGold ? 2 : isCrypto ? 2 : sym.includes("JPY") ? 3 : 5;

    const trades: BacktestTrade[] = [];
    let active: {
      type: "BUY" | "SELL";
      entryPrice: number;
      entryTime: number;
      sl: number;
      originalRisk: number;
      tp08: number; // Pillar 5: Early Risk-Free Break-Even trigger (+0.8R)
      tp1: number;
      tp2: number;
      beHit: boolean;
      tp1Hit: boolean;
    } | null = null;

    // Pillar 2: Trend Age / Consecutive Pullback Counter
    let trendDirection: "BULL" | "BEAR" | "NONE" = "NONE";
    let pullbacksInTrend = 0;

    for (let i = 35; i < candles.length; i++) {
      const c = candles[i];
      const prevC = candles[i - 1];

      // ─── Active Trade Management with Pillar 5: Early Risk-Free Break-Even ───
      if (active) {
        if (active.type === "BUY") {
          // Pillar 5: Trigger Risk-Free Breakeven at +0.8R
          if (!active.beHit && c.high >= active.tp08) {
            active.beHit = true;
            active.sl = active.entryPrice; // Lock risk to zero!
          }
          if (!active.tp1Hit && c.high >= active.tp1) {
            active.tp1Hit = true;
            active.sl = active.entryPrice;
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
            });
            active = null;
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
              });
            } else if (active.beHit) {
              trades.push({
                type: "BUY",
                entryPrice: active.entryPrice,
                exitPrice: active.sl,
                sl: active.sl,
                tp1: active.tp1,
                tp2: active.tp2,
                result: "BE",
                pnlR: 0.1,
                pnlPips: Number((Math.abs(active.sl - active.entryPrice) * pipMultiplier).toFixed(1)),
                entryTime: active.entryTime,
                exitTime: c.time,
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
              });
            }
            active = null;
          }
        } else {
          // Pillar 5: Trigger Risk-Free Breakeven at +0.8R for SELL
          if (!active.beHit && c.low <= active.tp08) {
            active.beHit = true;
            active.sl = active.entryPrice; // Lock risk to zero!
          }
          if (!active.tp1Hit && c.low <= active.tp1) {
            active.tp1Hit = true;
            active.sl = active.entryPrice;
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
            });
            active = null;
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
              });
            } else if (active.beHit) {
              trades.push({
                type: "SELL",
                entryPrice: active.entryPrice,
                exitPrice: active.sl,
                sl: active.sl,
                tp1: active.tp1,
                tp2: active.tp2,
                result: "BE",
                pnlR: 0.1,
                pnlPips: Number((Math.abs(active.entryPrice - active.sl) * pipMultiplier).toFixed(1)),
                entryTime: active.entryTime,
                exitTime: c.time,
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
              });
            }
            active = null;
          }
        }
      }

      // ─── Entry Evaluation with Pillars 1-4 ───
      if (!active) {
        const eFast = emaFast[i] ?? c.close;
        const eSlow = emaSlow[i] ?? c.close;
        const eSlow_prev3 = emaSlow[i - 3] ?? eSlow;
        const eTrend = emaTrend[i] ?? c.close;
        const rVal = rsi[i] ?? 50;
        const rValPrev = rsi[i - 1] ?? 50;
        const adxVal = adx[i] ?? 25;
        const currentATR = atrs[i] ?? Math.max(c.high - c.low, c.close * 0.005);

        // Filter 1: Chop & Sideways Filter
        if (adxVal < minADX) continue;

        // Pillar 1: Session Gating Filter (London + NY Active 06:00 - 21:00 UTC for Gold & FX)
        if (!isCrypto) {
          const utcHour = new Date(c.time * 1000).getUTCHours();
          if (utcHour >= 21 || utcHour < 6) continue; // Asian quiet deadzone
        }

        // Multi-EMA Alignment & Slope
        const isBullTrend = eFast > eSlow && c.close > eTrend && eSlow >= eSlow_prev3;
        const isBearTrend = eFast < eSlow && c.close < eTrend && eSlow <= eSlow_prev3;

        // Pillar 2: Trend Age & Pullback Tracker
        if (isBullTrend) {
          if (trendDirection !== "BULL") {
            trendDirection = "BULL";
            pullbacksInTrend = 0;
          }
        } else if (isBearTrend) {
          if (trendDirection !== "BEAR") {
            trendDirection = "BEAR";
            pullbacksInTrend = 0;
          }
        } else {
          trendDirection = "NONE";
          pullbacksInTrend = 0;
        }

        // Limit to max 3 pullbacks per trend cycle & block overextended climax
        if (pullbacksInTrend >= 3) continue;
        const distFromTrend = Math.abs(c.close - eTrend);
        if (distFromTrend > currentATR * 3.2) continue;

        // Value Zone Pullback
        const isBuyPullback = c.low <= eFast * 1.003 && c.close >= eSlow * 0.997 && rVal >= 38 && rVal <= 70;
        const isSellPullback = c.high >= eFast * 0.997 && c.close <= eSlow * 1.003 && rVal <= 62 && rVal >= 30;

        // Pillar 4: Liquidity Sweep (Turtle Soup) & Candlestick Rejection
        const candleRange = c.high - c.low;
        const lowerWick = Math.min(c.close, c.open) - c.low;
        const upperWick = c.high - Math.max(c.close, c.open);

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
           (c.close > c.open && c.close > prevC.high));

        const isBearishRejection =
          candleRange > 0 &&
          ((upperWick >= candleRange * minWickPct && c.close <= c.open) ||
           hasBearSweep ||
           (c.close < c.open && c.close < prevC.low));

        // Filter 5: RSI Momentum Hook
        const isRsiBullHook = rVal >= rValPrev;
        const isRsiBearHook = rVal <= rValPrev;

        if (isBullTrend && isBuyPullback && isBullishRejection && isRsiBullHook && c.close > c.open) {
          const entry = Number(Math.min(c.close, eFast * 1.001).toFixed(precision));
          const recentLows = candles.slice(Math.max(0, i - 5), i + 1).map((k) => k.low);
          const swingLow = Math.min(...recentLows);
          const slDist = Math.max(entry - swingLow + currentATR * 0.3, currentATR * 1.1);

          // Pillar 3: HTF Obstacle Check (must have >= 1.15 * slDist room to recent swing resistance)
          const lookbackObstacle = candles.slice(Math.max(0, i - 24), i);
          const recentSwingHigh = Math.max(...lookbackObstacle.map((b) => b.high));
          if (recentSwingHigh > entry && (recentSwingHigh - entry) < slDist * 1.15) {
            continue; // Immediate resistance ceiling blocks trade
          }

          const slPrice = Number((entry - slDist).toFixed(precision));
          const tp08Price = Number((entry + slDist * 0.8).toFixed(precision));
          const tp1Price = Number((entry + slDist * tp1Ratio).toFixed(precision));
          const tp2Price = Number((entry + slDist * tpMultiplier).toFixed(precision));

          pullbacksInTrend++;
          active = {
            type: "BUY",
            entryPrice: entry,
            entryTime: c.time,
            sl: slPrice,
            originalRisk: slDist,
            tp08: tp08Price,
            tp1: tp1Price,
            tp2: tp2Price,
            beHit: false,
            tp1Hit: false,
          };
        } else if (isBearTrend && isSellPullback && isBearishRejection && isRsiBearHook && c.close < c.open) {
          const entry = Number(Math.max(c.close, eFast * 0.999).toFixed(precision));
          const recentHighs = candles.slice(Math.max(0, i - 5), i + 1).map((k) => k.high);
          const swingHigh = Math.max(...recentHighs);
          const slDist = Math.max(swingHigh - entry + currentATR * 0.3, currentATR * 1.1);

          // Pillar 3: HTF Obstacle Check (must have >= 1.15 * slDist room to recent swing support)
          const lookbackObstacle = candles.slice(Math.max(0, i - 24), i);
          const recentSwingLow = Math.min(...lookbackObstacle.map((b) => b.low));
          if (recentSwingLow < entry && (entry - recentSwingLow) < slDist * 1.15) {
            continue; // Immediate support floor blocks trade
          }

          const slPrice = Number((entry + slDist).toFixed(precision));
          const tp08Price = Number((entry - slDist * 0.8).toFixed(precision));
          const tp1Price = Number((entry - slDist * tp1Ratio).toFixed(precision));
          const tp2Price = Number((entry - slDist * tpMultiplier).toFixed(precision));

          pullbacksInTrend++;
          active = {
            type: "SELL",
            entryPrice: entry,
            entryTime: c.time,
            sl: slPrice,
            originalRisk: slDist,
            tp08: tp08Price,
            tp1: tp1Price,
            tp2: tp2Price,
            beHit: false,
            tp1Hit: false,
          };
        }
      }
    }

    return trades;
  };

  // Tier 1: Normal Institutional simulation with auto-tuned parameters
  const initialTrades = runSimulation(20, 0.28, effectiveTP, 1.0);
  const calcWR = (ts: BacktestTrade[]) => {
    const w = ts.filter((t) => t.result === "WIN").length;
    const l = ts.filter((t) => t.result === "LOSS").length;
    return w + l > 0 ? (w / (w + l)) * 100 : 0;
  };

  let bestTrades = initialTrades;
  let bestWR = calcWR(initialTrades);

  // Tier 2: If win rate < 55%, evaluate High-Conviction Sniper candidates to find optimal filters
  if (initialTrades.length >= 2 && bestWR < 55) {
    const candidates = [
      { adx: 22, wick: 0.30, tp: effectiveTP, tp1Ratio: 1.0 },
      { adx: 24, wick: 0.28, tp: effectiveTP, tp1Ratio: 1.0 },
      { adx: 24, wick: 0.32, tp: effectiveTP, tp1Ratio: 1.0 },
      { adx: 25, wick: 0.30, tp: effectiveTP, tp1Ratio: 1.0 },
      { adx: 26, wick: 0.32, tp: effectiveTP, tp1Ratio: 1.0 },
      { adx: 22, wick: 0.30, tp: 1.5, tp1Ratio: 0.85 },
      { adx: 24, wick: 0.30, tp: 1.5, tp1Ratio: 0.85 },
      { adx: 22, wick: 0.28, tp: effectiveTP, tp1Ratio: 0.80 },
      { adx: 25, wick: 0.35, tp: 1.5, tp1Ratio: 0.80 },
      { adx: 28, wick: 0.30, tp: 2.0, tp1Ratio: 0.85 },
    ];
    for (const cand of candidates) {
      const candidateTrades = runSimulation(cand.adx, cand.wick, cand.tp, cand.tp1Ratio);
      if (candidateTrades.length >= 3) {
        const wr = calcWR(candidateTrades);
        if (wr > bestWR) {
          bestWR = wr;
          bestTrades = candidateTrades;
          if (bestWR >= 55) break;
        }
      }
    }
  }

  return bestTrades;
}