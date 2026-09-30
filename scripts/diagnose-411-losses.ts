import * as fs from "fs";
import * as path from "path";
import { Candle } from "../lib/types";
import { simulateInstitutionalBacktest } from "../lib/marketService";

async function diagnose() {
  const dataPath = path.resolve(process.cwd(), "data", "xauusd_1h_deep.json");
  const candles: Candle[] = JSON.parse(fs.readFileSync(dataPath, "utf-8"));
  const trades = simulateInstitutionalBacktest("XAUUSD", candles);

  const wins = trades.filter((t) => t.result === "WIN");
  const losses = trades.filter((t) => t.result === "LOSS");
  const bes = trades.filter((t) => t.result === "BE");

  const buyTrades = trades.filter((t) => t.type === "BUY");
  const sellTrades = trades.filter((t) => t.type === "SELL");

  const buyWins = buyTrades.filter((t) => t.result === "WIN");
  const buyLosses = buyTrades.filter((t) => t.result === "LOSS");
  const buyBEs = buyTrades.filter((t) => t.result === "BE");

  const sellWins = sellTrades.filter((t) => t.result === "WIN");
  const sellLosses = sellTrades.filter((t) => t.result === "LOSS");
  const sellBEs = sellTrades.filter((t) => t.result === "BE");

  console.log("================================================================================");
  console.log(" 🔬 FORENSIC LOSS & REVERSAL DIAGNOSTIC: 411 TRADES");
  console.log("================================================================================\n");

  console.log(`TOTAL TRADES: ${trades.length}`);
  console.log(`- Overall Win Rate (excl BE): ${((wins.length / (wins.length + losses.length)) * 100).toFixed(1)}%`);
  console.log(`- BUY Trades:  ${buyTrades.length} (Wins: ${buyWins.length}, Losses: ${buyLosses.length}, BE: ${buyBEs.length}) | BUY WR: ${((buyWins.length / (buyWins.length + buyLosses.length)) * 100).toFixed(1)}%`);
  console.log(`- SELL Trades: ${sellTrades.length} (Wins: ${sellWins.length}, Losses: ${sellLosses.length}, BE: ${sellBEs.length}) | SELL WR: ${((sellWins.length / (sellWins.length + sellLosses.length)) * 100).toFixed(1)}%\n`);

  console.log("--- LOSS BREAKDOWN ---");
  console.log(`Total Losses: ${losses.length}`);
  console.log(`- BUY Losses:  ${buyLosses.length} (${((buyLosses.length / losses.length) * 100).toFixed(1)}%)`);
  console.log(`- SELL Losses: ${sellLosses.length} (${((sellLosses.length / losses.length) * 100).toFixed(1)}%)\n`);

  // Analyze holding duration of losses
  const lossDurations = losses.map((l) => (l.exitTime - l.entryTime) / 3600);
  const quickStops = lossDurations.filter((d) => d <= 3).length;
  const mediumStops = lossDurations.filter((d) => d > 3 && d <= 12).length;
  const slowStops = lossDurations.filter((d) => d > 12).length;

  console.log(`Loss Duration Analysis:`);
  console.log(`- Quick Stop-Out (<= 3 hours, immediate rejection / fakeout): ${quickStops} (${((quickStops / losses.length) * 100).toFixed(1)}%)`);
  console.log(`- Medium Stop-Out (3 - 12 hours): ${mediumStops} (${((mediumStops / losses.length) * 100).toFixed(1)}%)`);
  console.log(`- Slow Stop-Out (> 12 hours, slow bleed / trend exhaustion): ${slowStops} (${((slowStops / losses.length) * 100).toFixed(1)}%)\n`);

  // Sample 10 losses with detailed context
  console.log("--- SAMPLE 15 LOSSES INSPECTION ---");
  for (let i = 0; i < Math.min(15, losses.length); i++) {
    const l = losses[i];
    const duration = Math.round((l.exitTime - l.entryTime) / 3600);
    const dateStr = new Date(l.entryTime * 1000).toISOString().replace("T", " ").substring(0, 16);
    console.log(
      `[${i + 1}] ${l.type} @ $${l.entryPrice} -> SL $${l.sl} | Exit @ $${l.exitPrice} | Held ${duration}h | Date: ${dateStr} | Loss: ${l.pnlPips} pips`
    );
  }
}

diagnose().catch(console.error);
