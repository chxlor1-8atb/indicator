import * as fs from "fs";
import * as path from "path";
import { Candle } from "../lib/types";
import { simulateInstitutionalBacktest } from "../lib/marketService";

async function inspectLosses() {
  const dataPath = path.resolve(process.cwd(), "data", "xauusd_1h_deep.json");
  const candles: Candle[] = JSON.parse(fs.readFileSync(dataPath, "utf-8"));
  const trades = simulateInstitutionalBacktest("XAUUSD", candles);

  const losses = trades.filter((t) => t.result === "LOSS");
  console.log(`\n=== INSPECTING ${losses.length} LOSSES OUT OF ${trades.length} TRADES ===\n`);

  for (let i = 0; i < losses.length; i++) {
    const l = losses[i];
    const entryDate = new Date(l.entryTime * 1000).toISOString().replace("T", " ").substring(0, 16);
    const exitDate = new Date(l.exitTime * 1000).toISOString().replace("T", " ").substring(0, 16);
    const durationHours = Math.round((l.exitTime - l.entryTime) / 3600);
    console.log(
      `Loss #${i + 1}: ${l.type} @ $${l.entryPrice} -> SL $${l.sl} | Exit @ $${l.exitPrice} | Duration: ${durationHours}h | Entry: ${entryDate} -> Exit: ${exitDate} | PnL: ${l.pnlPips} pips`
    );
  }
}

inspectLosses().catch(console.error);
