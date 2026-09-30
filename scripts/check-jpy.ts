import { Candle } from "../lib/types";
import { getMarketCandles } from "../lib/marketService";
import { simulateInstitutionalBacktest } from "../lib/marketService";

async function testJpy() {
  const candles = await getMarketCandles("USDJPY", "1h");
  console.log("Current Baseline USDJPY:", {
    trades: simulateInstitutionalBacktest("USDJPY", candles).length,
    wins: simulateInstitutionalBacktest("USDJPY", candles).filter(t => t.result === "WIN").length,
    losses: simulateInstitutionalBacktest("USDJPY", candles).filter(t => t.result === "LOSS").length,
  });
}
testJpy();
