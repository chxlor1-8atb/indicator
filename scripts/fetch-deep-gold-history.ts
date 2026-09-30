import * as fs from "fs";
import * as path from "path";
import { Candle } from "../lib/types";

interface RawKline {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

async function fetchBinancePAXGChunk(startTime: number, limit = 1000): Promise<RawKline[]> {
  const endpoints = [
    "https://data-api.binance.vision/api/v3/klines",
    "https://api1.binance.com/api/v3/klines",
    "https://api.binance.com/api/v3/klines",
  ];

  let lastError: Error | null = null;
  for (const ep of endpoints) {
    try {
      const url = `${ep}?symbol=PAXGUSDT&interval=1h&startTime=${startTime}&limit=${limit}`;
      const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
      if (res.ok) {
        const raw = await res.json();
        if (Array.isArray(raw)) {
          return raw.map((item: (string | number)[]) => ({
            time: Math.floor(Number(item[0]) / 1000),
            open: parseFloat(item[1] as string),
            high: parseFloat(item[2] as string),
            low: parseFloat(item[3] as string),
            close: parseFloat(item[4] as string),
            volume: parseFloat(item[5] as string),
          }));
        }
      }
    } catch (e) {
      lastError = e as Error;
    }
  }

  // Fallback to Bybit if Binance is unavailable
  try {
    const bybitUrl = `https://api.bybit.com/v5/market/kline?category=spot&symbol=PAXGUSDT&interval=60&start=${startTime}&limit=${limit}`;
    const res = await fetch(bybitUrl, { signal: AbortSignal.timeout(5000) });
    if (res.ok) {
      const json = await res.json();
      const list = json?.result?.list;
      if (Array.isArray(list) && list.length > 0) {
        return list
          .map((item: string[]) => ({
            time: Math.floor(Number(item[0]) / 1000),
            open: parseFloat(item[1]),
            high: parseFloat(item[2]),
            low: parseFloat(item[3]),
            close: parseFloat(item[4]),
            volume: parseFloat(item[5]),
          }))
          .reverse();
      }
    }
  } catch (e) {
    lastError = e as Error;
  }

  throw lastError || new Error("Failed to fetch kline chunk from all endpoints");
}

export async function fetchDeepGoldHistory(daysBack = 730): Promise<Candle[]> {
  console.log(`\n================================================================================`);
  console.log(` 🥇 DEEP HISTORICAL GOLD (XAUUSD / PAXG) INGESTION ENGINE`);
  console.log(`    Target: ${daysBack} days (~${daysBack * 24} hourly candles)`);
  console.log(`================================================================================\n`);

  const nowMs = Date.now();
  const startMs = nowMs - daysBack * 24 * 60 * 60 * 1000;
  let currentStart = startMs;
  const allCandlesMap = new Map<number, RawKline>();

  let batchNum = 1;
  const maxBatches = Math.ceil((daysBack * 24) / 1000) + 5;

  while (currentStart < nowMs && batchNum <= maxBatches) {
    try {
      const chunk = await fetchBinancePAXGChunk(currentStart, 1000);
      if (!chunk || chunk.length === 0) {
        console.log(`[Batch ${batchNum}] No more candles returned. Finished ingestion.`);
        break;
      }

      for (const c of chunk) {
        if (c.open > 0 && c.close > 0 && c.high >= Math.max(c.open, c.close) && c.low <= Math.min(c.open, c.close)) {
          allCandlesMap.set(c.time, c);
        }
      }

      const firstTime = new Date(chunk[0].time * 1000).toISOString().replace("T", " ").substring(0, 16);
      const lastTime = new Date(chunk[chunk.length - 1].time * 1000).toISOString().replace("T", " ").substring(0, 16);

      console.log(
        `✓ Batch ${String(batchNum).padStart(2, " ")}: Fetched ${chunk.length} candles [${firstTime} -> ${lastTime}] (Total unique: ${allCandlesMap.size})`
      );

      const lastCandleTimeMs = chunk[chunk.length - 1].time * 1000;
      if (lastCandleTimeMs <= currentStart) {
        // Prevent infinite loop if timestamp didn't advance
        currentStart += 1000 * 3600 * 1000;
      } else {
        currentStart = lastCandleTimeMs + 3600 * 1000;
      }

      batchNum++;
      // Sleep 150ms to be polite to exchange API
      await new Promise((r) => setTimeout(r, 150));
    } catch (err) {
      console.warn(`[Batch ${batchNum}] Error: ${(err as Error)?.message}. Retrying in 1s...`);
      await new Promise((r) => setTimeout(r, 1000));
      currentStart += 24 * 3600 * 1000; // Skip 1 day if stuck
      batchNum++;
    }
  }

  // Sort chronologically
  const sortedCandles: Candle[] = Array.from(allCandlesMap.values())
    .sort((a, b) => a.time - b.time)
    .map((c) => ({
      time: c.time,
      open: Number(c.open.toFixed(2)),
      high: Number(c.high.toFixed(2)),
      low: Number(c.low.toFixed(2)),
      close: Number(c.close.toFixed(2)),
      volume: Number(c.volume.toFixed(2)),
    }));

  console.log(`\n🎉 Ingestion Complete! Total Candles: ${sortedCandles.length}`);
  if (sortedCandles.length > 0) {
    const firstDate = new Date(sortedCandles[0].time * 1000).toISOString();
    const lastDate = new Date(sortedCandles[sortedCandles.length - 1].time * 1000).toISOString();
    console.log(`   Period: ${firstDate} to ${lastDate}`);
    console.log(`   First Price: $${sortedCandles[0].close} | Last Price: $${sortedCandles[sortedCandles.length - 1].close}`);

    // Ensure data directory exists
    const dataDir = path.resolve(process.cwd(), "data");
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    const outFile = path.join(dataDir, "xauusd_1h_deep.json");
    fs.writeFileSync(outFile, JSON.stringify(sortedCandles, null, 2), "utf-8");
    console.log(`💾 Saved to: ${outFile} (${(fs.statSync(outFile).size / 1024 / 1024).toFixed(2)} MB)\n`);
  }

  return sortedCandles;
}

if (require.main === module) {
  fetchDeepGoldHistory(730).catch(console.error);
}
