import * as fs from "fs";
import * as path from "path";
import { Candle } from "../lib/types";
import { simulateInstitutionalBacktest } from "../lib/marketService";
import { calculateQuasimodoPattern } from "../lib/indicators";

const dataPath = path.resolve(process.cwd(), "data", "xauusd_1h_deep.json");
const candles: Candle[] = JSON.parse(fs.readFileSync(dataPath, "utf-8"));

const trades = simulateInstitutionalBacktest("XAUUSD", candles);
const losses = trades.filter(t => t.result === "LOSS");

console.log(`Total Trades: ${trades.length}, Losses: ${losses.length}`);

// Map candles by time
const candleMap = new Map<number, number>();
candles.forEach((c, idx) => candleMap.set(c.time, idx));

// Analyze each loss
losses.forEach((loss, i) => {
  const entryIdx = candleMap.get(loss.entryTime) ?? -1;
  const exitIdx = candleMap.get(loss.exitTime) ?? -1;
  
  if (entryIdx >= 35) {
    const slice35 = candles.slice(entryIdx - 35, entryIdx + 1);
    const qm = calculateQuasimodoPattern(slice35, 2);
    
    // Check if there was an opposing CHoCH in recent 5 bars
    const prev5 = candles.slice(entryIdx - 5, entryIdx);
    const c = candles[entryIdx];
    
    console.log(`Loss #${i+1}: ${loss.type} | Date: ${new Date(loss.entryTime * 1000).toISOString().slice(0, 16)} | Entry: ${loss.entryPrice} SL: ${loss.sl} Dur: ${exitIdx - entryIdx}b | QM: ${qm.detected ? `${qm.type} (Held:${qm.isQmlHeld}, QML:${qm.qmlPrice})` : 'NONE'}`);
  }
});
