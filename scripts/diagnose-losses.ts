import { getMarketCandles, simulateInstitutionalBacktest } from "../lib/marketService";

async function diagnose() {
  console.log("=== DIAGNOSING LOSSES IN EURUSD & USDJPY ===\n");
  
  for (const sym of ["EURUSD", "USDJPY"]) {
    const candles = await getMarketCandles(sym, "1h");
    const trades = simulateInstitutionalBacktest(sym, candles);
    const losses = trades.filter((t) => t.result === "LOSS");
    console.log(`[${sym}] Total losses: ${losses.length} out of ${trades.length} trades`);
    for (const l of losses) {
      const d = new Date(l.entryTime * 1000).toISOString();
      console.log(`  ❌ ${d}: ${l.type} @ ${l.entryPrice} -> SL @ ${l.sl} (Loss: ${l.pnlPips} pips)`);
    }
    console.log("");
  }
}

diagnose().catch(console.error);
