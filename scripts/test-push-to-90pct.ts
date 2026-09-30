import * as fs from "fs";
import * as path from "path";
import { Candle } from "../lib/types";

async function diagnoseBE() {
  const dataPath = path.resolve(process.cwd(), "data", "xauusd_1h_ultra_deep.json");
  const candles: Candle[] = JSON.parse(fs.readFileSync(dataPath, "utf-8"));
  const { simulateInstitutionalBacktest } = await import("../lib/marketService");

  const trades = simulateInstitutionalBacktest("XAUUSD", candles);
  const losses = trades.filter(t => t.result === "LOSS");

  for (const loss of losses) {
    const entryIdx = candles.findIndex(c => c.time === loss.entryTime);
    const exitIdx = candles.findIndex(c => c.time === loss.exitTime);

    let maxProfitPips = 0;
    for (let k = entryIdx + 1; k <= exitIdx && k < candles.length; k++) {
      const c = candles[k];
      const pips = loss.type === "BUY" ? (c.high - loss.entryPrice) * 10 : (loss.entryPrice - c.low) * 10;
      if (pips > maxProfitPips) maxProfitPips = pips;
    }

    if (maxProfitPips >= 10.0) {
      console.log(`Found trade with MFE +${maxProfitPips.toFixed(1)} pips:`);
      console.log(`  Type: ${loss.type}, Entry: ${loss.entryPrice}, SL: ${loss.sl}, Exit: ${loss.exitPrice}`);
      console.log(`  Distance to SL: ${Math.abs(loss.entryPrice - loss.sl)}`);
      for (let k = entryIdx; k <= exitIdx; k++) {
        const c = candles[k];
        console.log(`    Bar ${k - entryIdx} (${new Date(c.time * 1000).toISOString()}): O:${c.open} H:${c.high} L:${c.low} C:${c.close}`);
      }
      break;
    }
  }
}

diagnoseBE().catch(console.error);
