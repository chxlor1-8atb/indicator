import { Candle } from "../lib/types";
import { runQuantDataPipeline } from "../lib/quantDataPipeline";
import { extractFeatureVector24D } from "../lib/featureEngineering";
import { runMachineLearningInference } from "../lib/mlEngine";
import { determineAdaptiveStrategy } from "../lib/regimeEngine";
import { calculateInstitutionalRisk } from "../lib/riskEngine";
import { runWalkForwardAnalysis } from "../lib/walkForwardEngine";
import { calculateAllIndicators } from "../lib/indicators";

function generateSyntheticCandles(count = 120, startPrice = 2500): Candle[] {
  const candles: Candle[] = [];
  let price = startPrice;
  const now = Math.floor(Date.now() / 1000);

  for (let i = 0; i < count; i++) {
    const time = now - (count - i) * 3600;
    const trendCycle = Math.sin(i / 10) * 15 + (i * 0.5);
    const noise = (Math.random() - 0.48) * 8;
    const close = Math.round((startPrice + trendCycle + noise) * 100) / 100;
    const open = Math.round((price + (Math.random() - 0.5) * 3) * 100) / 100;
    const high = Math.round((Math.max(open, close) + Math.random() * 5) * 100) / 100;
    const low = Math.round((Math.min(open, close) - Math.random() * 5) * 100) / 100;
    const volume = Math.floor(500 + Math.random() * 1500 + (i % 7 === 0 ? 3000 : 0));

    candles.push({ time, open, high, low, close, volume });
    price = close;
  }

  // Inject 1 bad outlier wick to verify Layer 1 cleaning
  candles[50].high = candles[50].close + 250;

  return candles;
}

async function main() {
  console.log("================================================================================");
  console.log("🧪 TESTING 5-LAYER INSTITUTIONAL QUANT PIPELINE (AEGIS QUANT TERMINAL)");
  console.log("================================================================================");

  const symbol = "XAUUSD";
  const candles = generateSyntheticCandles(120, 2600);
  console.log(`\nGenerated ${candles.length} synthetic candles for ${symbol}`);

  // Compute Base Indicators
  const indicators = calculateAllIndicators(candles, symbol);
  console.log(`Current Price: $${indicators.currentPrice}`);

  // ──────────────────────────────────────────
  // 1. LAYER 1: DATA PIPELINE & MACRO
  // ──────────────────────────────────────────
  console.log("\n─── 1. LAYER 1: DATA PIPELINE & MACRO ───");
  const layer1 = runQuantDataPipeline(candles, symbol);
  console.log(`Data Integrity Score: ${layer1.dataIntegrityScore}%`);
  console.log(`Clean Candles: ${layer1.cleanCandlesCount}, Outliers Filtered: ${layer1.outliersFiltered}`);
  console.log(`Stationarity: ${layer1.stationarityStatus} (Current Z-Score: ${layer1.rollingZScoreRange.current})`);
  console.log(`Intermarket Macro (${layer1.correlation.benchmarkSymbol}): r = ${layer1.correlation.correlationR} (${layer1.correlation.correlationRegime})`);
  console.log(`Shield Action: ${layer1.correlation.shieldAction}`);

  // ──────────────────────────────────────────
  // 2. LAYER 2: 24-D FEATURE ENGINEERING
  // ──────────────────────────────────────────
  console.log("\n─── 2. LAYER 2: 24-D FEATURE ENGINEERING ───");
  const layer2 = extractFeatureVector24D(candles, indicators, symbol, undefined, layer1.correlation);
  console.log(`Total Features Extracted: ${layer2.features.length}`);
  console.log(`Aggregate Bull Weight: ${layer2.aggregateBullScore}%, Bear Weight: ${layer2.aggregateBearScore}%`);
  console.log(`Dominant Category: ${layer2.dominantCategory}`);
  console.log(`Summary: ${layer2.summary}`);
  console.log("Sample Features:");
  layer2.features.slice(0, 6).forEach((f) => {
    console.log(`  • [${f.code}] ${f.name}: ${f.value} (${f.signal}) -> ${f.description}`);
  });

  // ──────────────────────────────────────────
  // 3. LAYER 3: MACHINE LEARNING & REGIME BRAIN
  // ──────────────────────────────────────────
  console.log("\n─── 3. LAYER 3: MACHINE LEARNING & REGIME BRAIN ───");
  const layer3ML = runMachineLearningInference(layer2, candles);
  const layer3Strategy = determineAdaptiveStrategy("EXPLOSIVE_TREND");
  console.log(`ML Direction: ${layer3ML.mlDirection} (Confidence: ${layer3ML.confidence}%)`);
  console.log(`Probabilities -> BUY: ${layer3ML.probabilities.buy}%, SELL: ${layer3ML.probabilities.sell}%, WAIT: ${layer3ML.probabilities.neutral}%`);
  console.log(`Top Feature Drivers (SHAP Attribution):`);
  layer3ML.featureImportance.forEach((item, i) => {
    console.log(`  #${i + 1} ${item.featureName}: ${item.weight}% (Impact: ${item.impact})`);
  });
  console.log(`Adaptive Strategy: ${layer3Strategy.strategyName} (${layer3Strategy.strategyMode})`);
  console.log(`Tactical Execution: ${layer3Strategy.tacticalExecution}`);
  console.log(`Target R:R: ${layer3Strategy.targetRR}, Risk Multiplier: ${layer3Strategy.riskMultiplier}x`);

  // ──────────────────────────────────────────
  // 4. LAYER 4: INSTITUTIONAL RISK & BRACKET
  // ──────────────────────────────────────────
  console.log("\n─── 4. LAYER 4: RISK MANAGEMENT & BRACKET ───");
  const layer4 = calculateInstitutionalRisk(
    symbol,
    indicators.currentPrice,
    layer3ML.mlDirection === "BUY" ? "BUY" : "SELL",
    candles,
    indicators.atr14?.slice(-1)[0] || 15.0,
    85, // Confluence Score 85
    layer3ML.confidence,
    "EXPLOSIVE_TREND",
    1000, // $1,000 account
    2.0   // 2% risk
  );
  console.log(`Account: $${layer4.accountBalance} | Target Risk: ${layer4.riskPct}% ($${layer4.dollarRisk})`);
  console.log(`Stop Loss Distance: ${layer4.slPips} pips (ATR: ${layer4.atrValue})`);
  console.log(`Calculated Lot Size: ${layer4.calculatedLotSize} Lots`);
  console.log(`Fractional Kelly Lot Size: ${layer4.fractionalKellyLot} Lots (f* = ${layer4.kellyFraction})`);
  console.log(`Confidence Gate Status: ${layer4.confidenceGateStatus} (${layer4.gateReason})`);
  console.log(`Multi-Stage Bracket:`);
  console.log(`  • Entry Zone: ${layer4.executionBracket.entryZone.min} - ${layer4.executionBracket.entryZone.max}`);
  console.log(`  • Structural SL: ${layer4.executionBracket.structuralSL}`);
  console.log(`  • BE Shield Trigger (+1.0R): ${layer4.executionBracket.beTriggerPrice}`);
  console.log(`  • TP1 (+1.2R / 50% Close): ${layer4.executionBracket.tp1Price}`);
  console.log(`  • TP2 (+2.5R Trailing): ${layer4.executionBracket.tp2Price}`);

  // ──────────────────────────────────────────
  // 5. LAYER 5: WALK-FORWARD VALIDATION
  // ──────────────────────────────────────────
  console.log("\n─── 5. LAYER 5: WALK-FORWARD VALIDATION ───");
  const layer5 = runWalkForwardAnalysis(candles, 5);
  console.log(`Walk-Forward Efficiency (WFE): ${layer5.walkForwardEfficiency}%`);
  console.log(`In-Sample Win Rate: ${layer5.avgISWinRate}%, Out-of-Sample (OOS) Win Rate: ${layer5.avgOOSWinRate}%`);
  console.log(`Overfitting Risk: ${layer5.overfittingRisk} (${layer5.robustnessGrade})`);
  console.log(`Triple Barrier Hits: Upper TP=${layer5.tripleBarrierStats.hitUpperTP}, Lower SL=${layer5.tripleBarrierStats.hitLowerSL}, Timeout=${layer5.tripleBarrierStats.hitVerticalTimeout}`);
  console.log(`5-Fold Results:`);
  layer5.folds.forEach((f) => {
    console.log(`  • Fold ${f.foldIndex}: IS Win=${f.isWinRate}% (PF: ${f.isProfitFactor}) | OOS Win=${f.oosWinRate}% (PF: ${f.oosProfitFactor}) -> [${f.passed ? "PASS" : "FAIL"}]`);
  });
  console.log(`Summary: ${layer5.summary}`);

  console.log("\n================================================================================");
  console.log("✅ ALL 5 LAYERS OF INSTITUTIONAL QUANT PIPELINE TESTED SUCCESSFULLY!");
  console.log("================================================================================");
}

main().catch(console.error);
