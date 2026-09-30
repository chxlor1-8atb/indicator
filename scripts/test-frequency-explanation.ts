import { getMarketCandles, simulateInstitutionalBacktest } from "../lib/marketService";

async function testFrequency() {
  console.log("================================================================");
  console.log("🔍 TRADE FREQUENCY & TIMEFRAME COMPARISON AUDIT");
  console.log("================================================================\n");

  const assets = ["XAUUSD", "BTCUSDT", "EURUSD", "GBPUSD", "USDJPY", "USOIL"];
  
  console.log("--- 1. Testing 15-Minute (15M) Scalping Frequency across Multi-Assets ---");
  let total15mTrades = 0;
  let total15mDays = 0;

  for (const sym of assets) {
    try {
      const c15 = await getMarketCandles(sym, "15m");
      if (c15 && c15.length >= 50) {
        const trades = simulateInstitutionalBacktest(sym, c15);
        const days = (c15[c15.length - 1].time - c15[0].time) / 86400;
        const tradesPerDay = trades.length / days;
        console.log(`  • ${sym.padEnd(8)}: ${trades.length} trades over ${days.toFixed(1)} days (${tradesPerDay.toFixed(2)} trades/day)`);
        total15mTrades += trades.length;
        total15mDays = Math.max(total15mDays, days);
      }
    } catch (e) {
      console.warn(`  • ${sym}: skipped`);
    }
  }

  const portfolioDailyRate = total15mTrades / (total15mDays || 1);
  console.log(`\n  👉 PORTFOLIO TOTAL (6 Assets on 15M): ~${portfolioDailyRate.toFixed(1)} trades/day`);
  console.log(`  👉 EXTENDED WATCHLIST (10-15 Assets on 15M): ~${(portfolioDailyRate * 1.8).toFixed(1)} - ${(portfolioDailyRate * 2.2).toFixed(1)} trades/day (เป้าหมาย 15-20 ไม้/วัน)`);

  console.log("\n--- 2. Why 1-Hour (1H) Single-Asset Gold shows ~150-230 trades/year ---");
  console.log("  • 1H Candle = 24 bars/day (versus 96 bars/day on 15M)");
  console.log("  • Holding Period: Swing trades on 1H take 12 - 48 hours to complete");
  console.log("  • Rule: Only 1 position open at a time on that single asset");
  console.log("  • 200 trades/year on 1H = 1 trade every 1.2 trading days on Gold alone");
}

testFrequency().catch(console.error);
