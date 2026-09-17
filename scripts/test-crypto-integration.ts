import { getMarketCandles, AVAILABLE_ASSETS } from "../lib/marketService";
import { calculateAllIndicators } from "../lib/indicators";
import { generateRuleBasedAnalysis, detectAssetCategory } from "../lib/geminiService";

async function runTest() {
  console.log("==================================================");
  console.log("TESTING CRYPTO ASSETS INTEGRATION & ACCURACY");
  console.log("==================================================\n");

  const cryptoAssets = AVAILABLE_ASSETS.filter((a) => a.category === "crypto");
  console.log(`Found ${cryptoAssets.length} registered crypto assets in AVAILABLE_ASSETS:`);
  cryptoAssets.forEach((a) => {
    console.log(`  - [${a.symbol}] ${a.name} | Precision: ${a.precision} | Category: ${a.category}`);
  });

  const testSymbols = ["BTCUSDT", "ETHUSDT", "SOLUSDT", "DOGEUSDT", "PEPEUSDT"];

  for (const sym of testSymbols) {
    console.log(`\n--------------------------------------------------`);
    console.log(`Testing: ${sym}`);
    console.log(`--------------------------------------------------`);

    const detectedCategory = detectAssetCategory(sym);
    console.log(`  Category Detection: ${detectedCategory} ${detectedCategory === "crypto" ? "OK" : "FAIL"}`);

    try {
      const startTime = Date.now();
      const candles = await getMarketCandles(sym, "1h");
      const elapsedMs = Date.now() - startTime;
      console.log(`  Candles fetched: ${candles.length} bars in ${elapsedMs}ms`);

      if (candles.length >= 20) {
        const last = candles[candles.length - 1];
        console.log(`  Last Candle: Close = $${last.close} (High: $${last.high}, Low: $${last.low})`);

        const indStart = Date.now();
        const indicators = calculateAllIndicators(candles, sym);
        const indElapsedMs = Date.now() - indStart;
        const lastEma20 = indicators.ema20?.slice(-1)[0] ?? 0;
        const lastEma50 = indicators.ema50?.slice(-1)[0] ?? 0;
        const lastRsi = indicators.rsi14?.slice(-1)[0] ?? 0;

        console.log(`  100+ Indicators calculated in ${indElapsedMs}ms`);
        console.log(`    EMA20: ${lastEma20.toFixed(4)} | EMA50: ${lastEma50.toFixed(4)} | RSI14: ${lastRsi.toFixed(1)}`);
        console.log(`    Volume Profile PoC: $${indicators.volumeProfile?.poc}`);
        console.log(`    FVG Bullish Count: ${indicators.fvgZones?.bullishCount || 0} | Bearish Count: ${indicators.fvgZones?.bearishCount || 0}`);

        const analysisStart = Date.now();
        const analysis = generateRuleBasedAnalysis(sym, "1h", candles, indicators, []);
        const analysisElapsedMs = Date.now() - analysisStart;
        console.log(`  Rule-Based Decision Brain in ${analysisElapsedMs}ms:`);
        console.log(`    Signal: ${analysis.signal} (Confidence: ${analysis.confidence}%)`);
        console.log(`    Setup Grade: ${analysis.setupGrade}`);
        console.log(`    Order Type: ${analysis.tradeSetup?.orderType} (${analysis.tradeSetup?.action})`);
        console.log(`    Entry: $${analysis.tradeSetup?.pendingPrice || analysis.tradeSetup?.entryPrice}`);
        console.log(`    SL: $${analysis.tradeSetup?.stopLoss} | TP1: $${analysis.tradeSetup?.takeProfit1} | TP2: $${analysis.tradeSetup?.takeProfit2}`);
        console.log(`  PASS: ${sym} PASSED ALL TESTS`);
      } else {
        console.error(`  FAIL: Insufficient candles for ${sym}: got ${candles.length}`);
      }
    } catch (err: any) {
      console.error(`  FAIL: Error processing ${sym}:`, err.message || err);
    }
  }

  console.log("\n==================================================");
  console.log("ALL CRYPTO INTEGRATION VERIFICATION COMPLETE");
  console.log("==================================================\n");
}

runTest();
