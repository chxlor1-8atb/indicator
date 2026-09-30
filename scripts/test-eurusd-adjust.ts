import { getMarketCandles, simulateInstitutionalBacktest } from "../lib/marketService";

async function testForexAdjustment() {
  const candles = await getMarketCandles("EURUSD", "1h");
  console.log("EURUSD total candles:", candles.length);
  const trades = simulateInstitutionalBacktest("EURUSD", candles);
  console.log("Current EURUSD trades:", trades.length);
}
testForexAdjustment();
