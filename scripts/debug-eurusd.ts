import { getMarketCandles, simulateInstitutionalBacktest } from "../lib/marketService";

async function main() {
  const candles = await getMarketCandles("EURUSD", "1h");
  console.log("EURUSD candles count:", candles.length);
  if (candles.length > 0) {
    console.log("First candle:", candles[0]);
    console.log("Last candle:", candles[candles.length - 1]);
    const trades = simulateInstitutionalBacktest("EURUSD", candles);
    console.log("EURUSD trades count:", trades.length);
  }
}
main();
