import {
  AnalysisResult,
  Candle,
  IndicatorData,
  NewsItem,
  ConfluenceCheckItem,
  TraderTierHierarchy,
  QuadEmaConfluence,
  OTEZoneInfo,
  VolumeDeltaInfo,
  BreakevenAdvice,
  RoundLevelInfo,
  StructuralStopLossInfo,
  VolumeProfileInfo,
  TDSequentialInfo,
  SpreadImpactInfo,
  TrailingStopInfo,
  KellySizingInfo,
  AnchoredVWAPInfo,
  CVDInfo,
  OrderBlockValidatorInfo,
  PriceFeedIntegrityInfo,
  SessionSweepInfo,
  FibonacciClusterInfo,
  RealizedVolatilityInfo,
  CandleMicrostructureInfo,
  CorrelationShieldInfo,
  FVGMitigationInfo,
  MarketStructureShiftInfo,
  PremiumDiscountInfo,
  KeyLevelTargetsInfo,
  OrderFlowVelocityInfo,
  BreakevenLadderInfo,
  LiquidityVoidInfo,
  FibonacciExtensionInfo,
  FootprintAbsorptionInfo,
  MTFStructureMatrixInfo,
  LiquidityInducementInfo,
  InstitutionalChoSInfo,
  DynamicRiskBracketInfo,
  RejectionBlockInfo,
  MCPIConvictionInfo,
  HarmonicScanResult,
  EhlersMESAInfo,
  ShannonEntropyInfo,
  CandlestickScanResult,
  GrandQuantMilestone50Info,
  HurstExponentInfo,
  KalmanFilterPoint,
  HalfLifeInfo,
  TTMSqueezeInfo,
  CMFInfo,
  KAMAInfo,
  HMAInfo,
  ParabolicSARPoint,
  AroonInfo,
  VortexInfo,
  FisherTransformPoint,
  ConnorsRSIInfo,
  AwesomeOscillatorPoint,
  TSIInfo,
  AdvancedVolatilitySuite,
} from "./types";
import { orchestrateStrategyDecision } from "./strategyOrchestrator";
import { runAutomatedBacktest } from "./backtestEngine";
import { optimizeIndicatorParameters } from "./optimizerEngine";
import {
  calculateATR,
  calculateEMA,
  detectCandleRejection,
  detectRSIDivergence,
  calculateOTEZones,
  calculateStructuralStopLoss,
  calculateVolumeDelta,
  calculateBreakevenRules,
  calculateRoundNumberGravity,
  calculateSessionVolumeProfile,
  calculateTDSequential,
  calculateSpreadImpact,
  calculateChandelierTrailingStop,
  calculateKellyCriterionSizing,
  calculateAnchoredVWAP,
  calculateCumulativeVolumeDelta,
  identifyOrderBlocksAndBreakers,
  calculatePriceFeedIntegrity,
  calculateSessionLiquiditySweeps,
  calculateFibonacciClusters,
  calculateRealizedVolatility,
  calculateCandleMicrostructure,
  calculateCorrelationHedgeShield,
  calculateFVGMitigation,
  calculateMarketStructureShift,
  calculatePremiumDiscount,
  calculateKeyLevelTargets,
  calculateOrderFlowVelocity,
  calculateBreakevenLadder,
  calculateLiquidityVoid,
  calculateFibonacciExtension,
  calculateFootprintAbsorption,
  calculateMTFStructureMatrix,
  calculateLiquidityInducement,
  calculateInstitutionalChoS,
  calculateDynamicRiskBracket,
  calculateRejectionBlocks,
  calculateUnifiedMCPI,
  detectHarmonicPatterns,
  calculateEhlersMESA,
  calculateShannonEntropy,
  scanCandlestickPatterns,
  synthesizeGrandQuantMilestone50,
  calculateHurstExponent,
  calculateKalmanFilter,
  calculateHalfLife,
  calculateTTMSqueeze,
  calculateCMF,
  calculateKAMA,
  calculateHMA,
  calculateParabolicSAR,
  calculateAroon,
  calculateVortex,
  calculateFisherTransform,
  calculateConnorsRSI,
  calculateAwesomeOscillator,
  calculateTSI,
  calculateAdvancedVolatilitySuite,
} from "./indicators";
import { evaluateMasterConfluence } from "./confluenceEngine";
import { classifyMarketRegime } from "./regimeClassifier";
import { getMarketSessionStatus } from "./sessionEngine";
import { getNewsSafetyShieldStatus } from "./calendarEngine";
import { getRecentLessons, getAdaptiveWeights, AdaptiveWeightsConfig, getCachedCandles } from "./db";

export function generateRuleBasedAnalysis(
  symbol: string,
  timeframe: string,
  candles: Candle[],
  indicators: IndicatorData,
  news: NewsItem[],
  adaptiveConfig?: AdaptiveWeightsConfig,
  multiTimeframeMatrix?: AnalysisResult["timeframeMatrix"]
): AnalysisResult {
  const currentPrice = indicators.currentPrice;
  const lastCandle = candles[candles.length - 1];
  const prevCandle = candles.length > 1 ? candles[candles.length - 2] : undefined;

  // Run automated historical backtest, parameter optimization, regime classifier, session status, and economic calendar safety shield
  const historicalBacktest = runAutomatedBacktest(candles);
  const optimizedConfig = optimizeIndicatorParameters(candles);
  const regimeInfo = classifyMarketRegime(candles, indicators);
  const sessionStatus = getMarketSessionStatus(symbol, undefined, candles);
  const calendarSafety = getNewsSafetyShieldStatus(symbol);

  // Determine asset precision dynamically (Forex = 4, Crypto under $10 = 4, JPY/Gold/Stocks = 2)
  const sym = symbol.toUpperCase();
  const precision = sym.includes("JPY") || sym === "XAUUSD" || sym.startsWith("XAU")
    ? 2
    : sym === "XAGUSD"
    ? 3
    : ["EUR", "GBP", "AUD", "NZD", "USD", "CAD", "CHF"].some(c => sym.startsWith(c) || sym.endsWith(c))
    ? 4
    : ["XRP", "ADA", "DOGE", "SUI"].some(c => sym.startsWith(c))
    ? 4
    : currentPrice < 10 && currentPrice > 0
    ? 4
    : 2;

  const lastRSI = indicators.rsi14.filter((v): v is number => v !== null && !isNaN(v)).pop() ?? 50.0;
  const lastEMA20 = indicators.ema20.filter((v): v is number => v !== null && !isNaN(v)).pop() ?? Number((currentPrice * 0.998).toFixed(precision));
  const lastEMA50 = indicators.ema50.filter((v): v is number => v !== null && !isNaN(v)).pop() ?? Number((currentPrice * 0.995).toFixed(precision));
  const lastEMA200 = indicators.ema200.filter((v): v is number => v !== null && !isNaN(v)).pop() ?? Number((currentPrice * 0.985).toFixed(precision));

  // ATR for volatility measurement
  const atrs = calculateATR(candles, 14);
  const currentATR = atrs.filter((v): v is number => v !== null && !isNaN(v)).pop() ?? Math.max(currentPrice * 0.006, 0.5);

  // Price Action & Divergence Detection
  const rejection = detectCandleRejection(lastCandle, prevCandle);
  const divergence = detectRSIDivergence(candles, indicators.rsi14);

  // ─── TIER 1: DIRECTIONAL BIAS (The Boss) ───
  let tier1Bias: "BULLISH" | "BEARISH" | "NEUTRAL" = "NEUTRAL";
  let tier1Reason = "โครงสร้างตลาดแกว่งตัวไซด์เวย์ในกรอบ";
  let trend: AnalysisResult["technicalAnalysis"]["trend"] = "SIDEWAYS";

  const isUptrend = currentPrice >= lastEMA50 && lastEMA20 >= lastEMA50;
  const isDowntrend = currentPrice < lastEMA50 && lastEMA20 < lastEMA50;

  if (isUptrend && currentPrice > lastEMA200) {
    tier1Bias = "BULLISH";
    trend = "STRONG_UPTREND";
    tier1Reason = `โครงสร้างขาขึ้นแข็งแกร่ง (EMA ${optimizedConfig.emaTrend} และ Ribbon ขยายตัวขึ้น)`;
  } else if (isUptrend) {
    tier1Bias = "BULLISH";
    trend = "UPTREND";
    tier1Reason = `โครงสร้างแนวโน้มขาขึ้น (ราคาอยู่เหนือ EMA ${optimizedConfig.emaSlow})`;
  } else if (isDowntrend && currentPrice < lastEMA200) {
    tier1Bias = "BEARISH";
    trend = "STRONG_DOWNTREND";
    tier1Reason = `โครงสร้างขาลงแข็งแกร่ง (ราคาหลุด EMA ${optimizedConfig.emaTrend} และ Ribbon กดตัวลง)`;
  } else if (isDowntrend) {
    tier1Bias = "BEARISH";
    trend = "DOWNTREND";
    tier1Reason = `โครงสร้างแนวโน้มขาลง (ราคาอยู่ใต้ EMA ${optimizedConfig.emaSlow})`;
  }

  // ─── TIER 2: VALUE LOCATION (No Chasing / Value Zone) ───
  const distFromFast = Math.abs(currentPrice - lastEMA20);
  const distInATR = Number((distFromFast / (currentATR || 1)).toFixed(1));
  const isOverextended = distInATR > 2.2;

  const inBuyValueZone = tier1Bias === "BULLISH" && (lastCandle.low <= lastEMA20 * 1.004 || currentPrice <= lastEMA20 * 1.006);
  const inSellValueZone = tier1Bias === "BEARISH" && (lastCandle.high >= lastEMA20 * 0.996 || currentPrice >= lastEMA20 * 0.994);
  const inValueZone = inBuyValueZone || inSellValueZone;

  let tier2Note = "ราคากำลังเคลื่อนไหวในโซนสมดุล";
  if (isOverextended) {
    tier2Note = `⚠️ ราคาวิ่งห่างเส้นค่าเฉลี่ยเกินไป (${distInATR}x ATR) ห้ามไล่ราคาเด็ดขาด ให้รอราคาย่อตัวก่อน`;
  } else if (inValueZone) {
    tier2Note = `✅ ราคาพักตัวเข้าสู่ Value Zone (ต้นทุนได้เปรียบระหว่าง EMA ${optimizedConfig.emaFast} - ${optimizedConfig.emaSlow})`;
  }

  // ─── TIER 3: EXECUTION TRIGGER (Confirmation & No-Divergence) ───
  const hasBuyTrigger = tier1Bias === "BULLISH" && (rejection.isBullishRejection || lastCandle.close > lastCandle.open) && !divergence.bearishDivergence;
  const hasSellTrigger = tier1Bias === "BEARISH" && (rejection.isBearishRejection || lastCandle.close < lastCandle.open) && !divergence.bullishDivergence;
  const isTriggerConfirmed = Boolean(hasBuyTrigger || hasSellTrigger);

  const traderHierarchy: TraderTierHierarchy = {
    tier1_Direction: {
      bias: tier1Bias,
      reason: tier1Reason,
      majorTrendEMA: `EMA ${optimizedConfig.emaTrend} (${lastEMA200.toFixed(2)})`,
    },
    tier2_ValueLocation: {
      inValueZone,
      distanceFromEMA: `${distInATR}x ATR`,
      isOverextended,
      note: tier2Note,
    },
    tier3_Trigger: {
      candlestickRejection: rejection.description,
      rsiCondition: `RSI(${optimizedConfig.rsiPeriod}): ${lastRSI.toFixed(1)} (ไม่มีสัญญาณขัดแย้ง)`,
      divergenceStatus: divergence.note,
      isTriggerConfirmed,
    },
  };

  // ─── 5-PILLAR MASTER CONFLUENCE SCORING WITH ADAPTIVE SELF-TUNING ───
  const masterConfluence = evaluateMasterConfluence(candles, indicators, tier1Bias, adaptiveConfig);

  // News Sentiment calculation
  let sentimentScore = 0;
  const relevantNews = news.filter((n) => n.relatedSymbols.includes(symbol) || n.impact === "HIGH");
  const newsList = relevantNews.length > 0 ? relevantNews : news.slice(0, 4);

  for (const item of newsList) {
    const weight = item.impact === "HIGH" ? 20 : item.impact === "MEDIUM" ? 10 : 5;
    if (item.sentiment === "BULLISH") sentimentScore += weight;
    if (item.sentiment === "BEARISH") sentimentScore -= weight;
  }
  sentimentScore = Math.max(-100, Math.min(100, sentimentScore));

  let overallSentiment: "BULLISH" | "BEARISH" | "NEUTRAL" = "NEUTRAL";
  if (sentimentScore >= 20) overallSentiment = "BULLISH";
  else if (sentimentScore <= -20) overallSentiment = "BEARISH";

  // MTF Matrix Resolution (True candles from DB if provided, else fallback to current series)
  const rawMtf = multiTimeframeMatrix || {
    m15: isUptrend ? "BULLISH" : isDowntrend ? "BEARISH" : "NEUTRAL",
    h1: isUptrend ? "BULLISH" : isDowntrend ? "BEARISH" : "NEUTRAL",
    h4: currentPrice > lastEMA200 ? "BULLISH" : "BEARISH",
    d1: currentPrice > lastEMA200 ? "BULLISH" : "BEARISH",
  };
  const mtfAlignment = computeMtfAlignment(symbol, rawMtf);
  const mtfMatrix: AnalysisResult["timeframeMatrix"] = {
    ...rawMtf,
    alignmentScore: rawMtf.alignmentScore ?? mtfAlignment.alignmentScore,
    assetCategory: rawMtf.assetCategory ?? mtfAlignment.assetCategory,
    summary: rawMtf.summary ?? mtfAlignment.summary,
    quadEma: rawMtf.quadEma,
  };

  // SAFETY LOCK 4: Higher-Timeframe (H4/D1) Trend Filter & Dynamic Asset-Weighted Alignment
  const macroBullish = mtfMatrix.h4 === "BULLISH" && mtfMatrix.d1 === "BULLISH";
  const macroBearish = mtfMatrix.h4 === "BEARISH" && mtfMatrix.d1 === "BEARISH";
  const mtfScore = mtfMatrix.alignmentScore ?? 0;
  const isCounterTrend = (tier1Bias === "BULLISH" && (macroBearish || mtfScore <= -40)) ||
                         (tier1Bias === "BEARISH" && (macroBullish || mtfScore >= 40));
  const isInstitutionalAligned = (tier1Bias === "BULLISH" && (macroBullish || mtfScore >= 45)) ||
                                 (tier1Bias === "BEARISH" && (macroBearish || mtfScore <= -45));

  // [แผน 7] Rolling 24-Hour Range Traps (Buying at Peak / Selling at Bottom)
  const rolling24h = indicators.rolling24h;
  const hasBuyingVolumeSpike = indicators.volumeAnomalies?.some((a) => a.type === "BUYING_SPIKE");
  const hasSellingVolumeSpike = indicators.volumeAnomalies?.some((a) => a.type === "SELLING_SPIKE");
  const isBuyAtTopTrap = tier1Bias === "BULLISH" && (rolling24h?.isNearTop ?? false) && !hasBuyingVolumeSpike;
  const isSellAtBottomTrap = tier1Bias === "BEARISH" && (rolling24h?.isNearBottom ?? false) && !hasSellingVolumeSpike;

  // [แผน 8] Quad-EMA 200 Confluence
  const quadEma = mtfMatrix.quadEma;
  const isQuadGoldenLong = quadEma?.isQuadGoldenStack && tier1Bias === "BULLISH";
  const isQuadDeathShort = quadEma?.isQuadDeathStack && tier1Bias === "BEARISH";
  const isQuadConflict = (tier1Bias === "BULLISH" && (quadEma?.isQuadDeathStack ?? false)) ||
                         (tier1Bias === "BEARISH" && (quadEma?.isQuadGoldenStack ?? false));

  // [แผน 9] Session Open Range Breakout (ORB)
  const isOrbBullBreak = sessionStatus.orb?.status === "BREAKOUT_BULL" && tier1Bias === "BULLISH";
  const isOrbBearBreak = sessionStatus.orb?.status === "BREAKOUT_BEAR" && tier1Bias === "BEARISH";

  // ─── BATCH 4 PRE-COMPUTATIONS (PLANS 16-17) ───
  const volumeProfile = indicators.volumeProfile || calculateSessionVolumeProfile(candles, precision);
  const tdSequential = indicators.tdSequential || calculateTDSequential(candles);

  // ─── BATCH 5 PRE-COMPUTATIONS (PLANS 21-25) ───
  const anchoredVwap = indicators.anchoredVwap || calculateAnchoredVWAP(candles, precision);
  const cvd = indicators.cvd || calculateCumulativeVolumeDelta(candles);
  const orderBlocks = indicators.orderBlocks || identifyOrderBlocksAndBreakers(candles, precision);
  const priceFeedIntegrity = indicators.priceFeedIntegrity || calculatePriceFeedIntegrity(currentPrice, symbol, currentATR);

  // ─── BATCH 6 PRE-COMPUTATIONS (PLANS 26-30) ───
  const sessionSweep = indicators.sessionSweep || calculateSessionLiquiditySweeps(candles, precision, symbol);
  const fibonacciCluster = indicators.fibonacciCluster || calculateFibonacciClusters(candles, precision);
  const realizedVolatility = indicators.realizedVolatility || calculateRealizedVolatility(candles, currentATR);
  const candleMicrostructure = indicators.candleMicrostructure || calculateCandleMicrostructure(candles);
  const correlationShield = indicators.correlationShield || calculateCorrelationHedgeShield(symbol, currentPrice, candles);

  // ─── BATCH 7 PRE-COMPUTATIONS (PLANS 31-35) ───
  const fvgMitigation = indicators.fvgMitigation || calculateFVGMitigation(candles, precision);
  const marketStructureShift = indicators.marketStructureShift || calculateMarketStructureShift(candles, precision);
  const premiumDiscount = indicators.premiumDiscount || calculatePremiumDiscount(candles, precision);
  const keyLevelTargets = indicators.keyLevelTargets || calculateKeyLevelTargets(candles, precision, symbol);
  const orderFlowVelocity = indicators.orderFlowVelocity || calculateOrderFlowVelocity(candles);

  // ─── BATCH 8 PRE-COMPUTATIONS (PLANS 37-40) ───
  const liquidityVoid = indicators.liquidityVoid || calculateLiquidityVoid(candles, precision);
  const fibonacciExtension = indicators.fibonacciExtension || calculateFibonacciExtension(candles, tier1Bias === "BEARISH" ? "SELL" : "BUY", precision);
  const footprintAbsorption = indicators.footprintAbsorption || calculateFootprintAbsorption(candles);
  const mtfStructureMatrix = indicators.mtfStructureMatrix || calculateMTFStructureMatrix(candles, precision, symbol);

  // ─── BATCH 9 PRE-COMPUTATIONS (PLANS 41-45) ───
  const liquidityInducement = indicators.liquidityInducement || calculateLiquidityInducement(candles, precision, symbol);
  const institutionalChoS = indicators.institutionalChoS || calculateInstitutionalChoS(candles);
  const rejectionBlock = indicators.rejectionBlock || calculateRejectionBlocks(candles, precision);

  // ─── BATCH 10 PRE-COMPUTATIONS (PLANS 46-50) ───
  const harmonics = indicators.harmonics || detectHarmonicPatterns(candles, precision);
  const ehlersMESA = indicators.ehlersMESA || calculateEhlersMESA(candles);
  const shannonEntropy = indicators.shannonEntropy || calculateShannonEntropy(candles, 30);
  const candlestickPatterns = indicators.candlestickPatterns || scanCandlestickPatterns(candles, precision);

  // ─── BATCH 11 PRE-COMPUTATIONS (PLANS 51-55) ───
  const hurstExponent = indicators.hurstExponent || calculateHurstExponent(candles);
  const kalmanFilter = indicators.kalmanFilter || calculateKalmanFilter(candles, precision);
  const halfLife = indicators.halfLife || calculateHalfLife(candles);
  const ttmSqueeze = indicators.ttmSqueeze || calculateTTMSqueeze(candles);
  const chaikinMoneyFlow = indicators.chaikinMoneyFlow || calculateCMF(candles);

  // ─── BATCH 12 PRE-COMPUTATIONS (PLANS 56-60) ───
  const kama = indicators.kama || calculateKAMA(candles, 10, 2, 30, precision);
  const hma = indicators.hma || calculateHMA(candles, 14, precision);
  const parabolicSAR = indicators.parabolicSAR || calculateParabolicSAR(candles, 0.02, 0.2, precision);
  const aroon = indicators.aroon || calculateAroon(candles, 25);
  const vortex = indicators.vortex || calculateVortex(candles, 14);

  // ─── BATCH 13 PRE-COMPUTATIONS (PLANS 61-65) ───
  const fisher = indicators.fisher || calculateFisherTransform(candles, 10);
  const connorsRSI = indicators.connorsRSI || calculateConnorsRSI(candles);
  const awesomeOsc = indicators.awesomeOsc || calculateAwesomeOscillator(candles, precision);
  const tsi = indicators.tsi || calculateTSI(candles, 25, 13);
  const advancedVol = indicators.advancedVol || calculateAdvancedVolatilitySuite(candles, 20);

  // ─── DYNAMIC REGIME, SESSION, RED FOLDER & ADAPTIVE GATING SYNTHESIS ───
  const minThreshold = adaptiveConfig?.minScoreThreshold ?? 70;
  const correlationScoreBonus = correlationShield.shieldStatus === "PROTECTED" ? 5 : correlationShield.shieldStatus === "HEDGE_ALERT" ? -15 : 0;
  let signal: AnalysisResult["signal"] = "WAIT";
  let confidence = Math.max(40, Math.min(95, masterConfluence.totalScore + sessionStatus.confidenceModifier + (quadEma?.scoreBonus ?? 0) + correlationScoreBonus));
  let setupGrade: AnalysisResult["setupGrade"] = masterConfluence.grade;

  // SAFETY LOCK 1: Red Folder News Freeze (30m before, 15m after)
  if (!calendarSafety.tradeAllowed) {
    signal = "WAIT";
    setupGrade = "C (Wait)";
    confidence = 30;
  }
  // SAFETY LOCK 2: Market Close Freeze (Forex Friday Night / Weekend) [แผน 10]
  else if (sessionStatus.isWeekendCloseFreeze) {
    signal = "WAIT";
    setupGrade = "C (Wait)";
    confidence = 25;
  }
  // SAFETY LOCK 3: The Witching Hour (03:55 - 05:05) or Monday Open Gap
  else if (!sessionStatus.tradeAllowed) {
    signal = "WAIT";
    setupGrade = "C (Wait)";
    confidence = 35;
  }
  // SAFETY LOCK 4: Counter-Trend Trap on Higher Timeframes or Quad-EMA 200 Conflict [แผน 8]
  else if (isCounterTrend || isQuadConflict) {
    signal = "WAIT";
    setupGrade = "C (Wait)";
    confidence = Math.min(confidence, 40);
  }
  // SAFETY LOCK 5: Buying at 24h Top / Selling at 24h Bottom without Volume Anomaly [แผน 7]
  else if (isBuyAtTopTrap || isSellAtBottomTrap) {
    signal = "WAIT";
    setupGrade = "C (Wait)";
    confidence = Math.min(confidence, 50);
  }
  // SAFETY LOCK 7: TD Sequential 9 Exhaustion Trap (Buying top of 9 green bars or selling bottom of 9 red bars) [แผน 17]
  else if (tier1Bias === "BULLISH" && tdSequential.exhaustionType === "BUY_EXHAUSTION_9") {
    signal = "WAIT";
    setupGrade = "C (Wait)";
    confidence = Math.min(confidence, 45);
  } else if (tier1Bias === "BEARISH" && tdSequential.exhaustionType === "SELL_EXHAUSTION_9") {
    signal = "WAIT";
    setupGrade = "C (Wait)";
    confidence = Math.min(confidence, 45);
  }
  // SAFETY LOCK 8: Extreme VWAP Exhaustion (> +3σ or < -3σ) [แผน 22]
  else if (tier1Bias === "BULLISH" && anchoredVwap.pricePosition === "OVERBOUGHT_EXTREME") {
    signal = "WAIT";
    setupGrade = "C (Wait)";
    confidence = Math.min(confidence, 40);
  } else if (tier1Bias === "BEARISH" && anchoredVwap.pricePosition === "OVERSOLD_EXTREME") {
    signal = "WAIT";
    setupGrade = "C (Wait)";
    confidence = Math.min(confidence, 40);
  }
  // SAFETY LOCK 9: Turtle Soup Liquidity Sweep & Correlation Anomaly Protection [แผน 26 & แผน 30]
  else if (tier1Bias === "BULLISH" && sessionSweep.sweepType === "BEARISH_SWEEP" && sessionSweep.isTurtleSoup) {
    signal = "WAIT";
    setupGrade = "C (Wait)";
    confidence = Math.min(confidence, 40);
  } else if (tier1Bias === "BEARISH" && sessionSweep.sweepType === "BULLISH_SWEEP" && sessionSweep.isTurtleSoup) {
    signal = "WAIT";
    setupGrade = "C (Wait)";
    confidence = Math.min(confidence, 40);
  } else if (correlationShield.macroRegime === "LIQUIDATION_ANOMALY") {
    signal = "WAIT";
    setupGrade = "C (Wait)";
    confidence = Math.min(confidence, 45);
  }
  // SAFETY LOCK 10: Institutional Dealing Range Extreme & Climax Exhaustion [แผน 33 & แผน 35]
  else if (tier1Bias === "BULLISH" && premiumDiscount.zone === "EXTREME_PREMIUM") {
    signal = "WAIT";
    setupGrade = "C (Wait)";
    confidence = Math.min(confidence, 35);
  } else if (tier1Bias === "BEARISH" && premiumDiscount.zone === "DEEP_DISCOUNT") {
    signal = "WAIT";
    setupGrade = "C (Wait)";
    confidence = Math.min(confidence, 35);
  } else if (orderFlowVelocity.isClimaxExhaustion) {
    signal = "WAIT";
    setupGrade = "C (Wait)";
    confidence = Math.min(confidence, 40);
  }
  // SAFETY LOCK 11: Multi-Timeframe Structure Conflict (LTF fighting H4/D1 Trend) & Footprint Exhaustion [แผน 39 & แผน 40]
  else if (mtfStructureMatrix.isHTFConflict) {
    signal = "WAIT";
    setupGrade = "C (Wait)";
    confidence = Math.min(confidence, 35);
  } else if (tier1Bias === "BULLISH" && footprintAbsorption.vsaSignal === "NO_DEMAND") {
    signal = "WAIT";
    setupGrade = "C (Wait)";
    confidence = Math.min(confidence, 40);
  } else if (tier1Bias === "BEARISH" && footprintAbsorption.vsaSignal === "NO_SUPPLY") {
    signal = "WAIT";
    setupGrade = "C (Wait)";
    confidence = Math.min(confidence, 40);
  }
  // SAFETY LOCK 12: Liquidity Inducement Trap (EQH/EQL Bait) [แผน 41]
  else if (liquidityInducement.isInducementTrap) {
    signal = "WAIT";
    setupGrade = "C (Wait)";
    confidence = Math.min(confidence, 40);
  }
  // SAFETY LOCK 13: Shannon Entropy Noise Shield (Chaos vs Orderliness) [แผน 48]
  else if (shannonEntropy.orderliness === "MAXIMUM_CHAOS_NOISE") {
    signal = "WAIT";
    setupGrade = "C (Wait)";
    confidence = Math.min(confidence, 35);
  }
  // SAFETY LOCK 14: Chaikin Money Flow (CMF) Institutional Divergence Shield [แผน 55]
  else if (tier1Bias === "BULLISH" && chaikinMoneyFlow.cmf < -0.15) {
    signal = "WAIT";
    setupGrade = "C (Wait)";
    confidence = Math.min(confidence, 35);
  } else if (tier1Bias === "BEARISH" && chaikinMoneyFlow.cmf > 0.15) {
    signal = "WAIT";
    setupGrade = "C (Wait)";
    confidence = Math.min(confidence, 35);
  }
  // SAFETY LOCK 15: Vortex Trend Inversion Shield (Counter-trend knife-catching lock) [แผน 60]
  else if (tier1Bias === "BULLISH" && (vortex.viMinus - vortex.viPlus > 0.15 || vortex.viMinus > 1.15)) {
    signal = "WAIT";
    setupGrade = "C (Wait)";
    confidence = Math.min(confidence, 35);
    vortex.safetyLock15Passed = false;
  } else if (tier1Bias === "BEARISH" && (vortex.viPlus - vortex.viMinus > 0.15 || vortex.viPlus > 1.15)) {
    signal = "WAIT";
    setupGrade = "C (Wait)";
    confidence = Math.min(confidence, 35);
    vortex.safetyLock15Passed = false;
  }
  // SAFETY LOCK 16: Volatility Climax Shield (Yang-Zhang Extreme or Ulcer Index Panic) [แผน 65]
  else if (!advancedVol.safetyLock16Passed || advancedVol.yangZhangVol >= 0.65 || advancedVol.ulcerIndex >= 18.0) {
    signal = "WAIT";
    setupGrade = "C (Wait)";
    confidence = Math.min(confidence, 30);
    advancedVol.safetyLock16Passed = false;
  }
  // SAFETY LOCK 6: Choppy Deadzone or Overextended
  else if (regimeInfo.regime === "CHOPPY_DEADZONE" || isOverextended || masterConfluence.totalScore < 55) {
    signal = "WAIT";
    setupGrade = "C (Wait)";
  } else if (tier1Bias === "BULLISH" && inBuyValueZone && hasBuyTrigger && masterConfluence.totalScore >= minThreshold) {
    signal = (trend === "STRONG_UPTREND" || regimeInfo.regime === "EXPLOSIVE_TREND" || isQuadGoldenLong) && masterConfluence.totalScore >= 85 ? "STRONG_BUY" : "BUY";
    if (isInstitutionalAligned) confidence = Math.min(95, confidence + 5);
    if (isOrbBullBreak) confidence = Math.min(95, confidence + 5);
    if (sessionSweep.sweepType === "BULLISH_SWEEP") confidence = Math.min(98, confidence + 6);
    if (marketStructureShift.isTrueDisplacement && marketStructureShift.type === "BULLISH_MSS") confidence = Math.min(98, confidence + 5);
    if (footprintAbsorption.isInstitutionalAbsorption && footprintAbsorption.bias === "BULLISH") confidence = Math.min(98, confidence + 5);
    if (mtfStructureMatrix.overallAlignment === "FULL_BULLISH_CONFLUENCE") confidence = Math.min(98, confidence + 5);
    if (institutionalChoS.deliveryState === "EXPANSION_DELIVERY") confidence = Math.min(98, confidence + 5);
    if (harmonics.hasPattern && harmonics.bestPattern?.type === "BULLISH") confidence = Math.min(98, confidence + 5);
    if (ehlersMESA.cycleState === "CYCLE_MODE") confidence = Math.min(98, confidence + 4);
    if (candlestickPatterns.dominantSignal === "BULLISH") confidence = Math.min(98, confidence + 4);
    if (ttmSqueeze.squeezeFired && ttmSqueeze.momentumDirection === "INCREASING_BULL") confidence = Math.min(98, confidence + 5);
    if (hurstExponent.marketCharacter === "PERSISTENT_TRENDING") confidence = Math.min(98, confidence + 4);
    if (chaikinMoneyFlow.capitalFlow === "STRONG_ACCUMULATION") confidence = Math.min(98, confidence + 4);
    if (kalmanFilter.trendBias === "BULLISH_ABOVE_KALMAN") confidence = Math.min(98, confidence + 3);
    if (hma.isTurningUp) confidence = Math.min(98, confidence + 4);
    if (parabolicSAR.isBullish) confidence = Math.min(98, confidence + 3);
    if (aroon.trendState === "STRONG_UPTREND") confidence = Math.min(98, confidence + 4);
    if (vortex.trend === "BULLISH") confidence = Math.min(98, confidence + 4);
    if (kama.trendState === "BULLISH") confidence = Math.min(98, confidence + 3);
    if (fisher.crossSignal === "BULLISH_CROSS" || fisher.isExtremeOversold) confidence = Math.min(98, confidence + 4);
    if (connorsRSI.isExtremePullback) confidence = Math.min(98, confidence + 5);
    if (awesomeOsc.saucerSignal === "BULLISH_SAUCER" || awesomeOsc.isZeroCross) confidence = Math.min(98, confidence + 4);
    if (tsi.isBullish) confidence = Math.min(98, confidence + 3);
    if (advancedVol.volatilityRegime !== "HIGH_CLIMAX") confidence = Math.min(98, confidence + 3);
    if (isQuadGoldenLong) {
      confidence = Math.min(98, confidence + 5);
      setupGrade = "A+";
    }
  } else if (tier1Bias === "BEARISH" && inSellValueZone && hasSellTrigger && masterConfluence.totalScore >= minThreshold) {
    signal = (trend === "STRONG_DOWNTREND" || regimeInfo.regime === "EXPLOSIVE_TREND" || isQuadDeathShort) && masterConfluence.totalScore >= 85 ? "STRONG_SELL" : "SELL";
    if (isInstitutionalAligned) confidence = Math.min(95, confidence + 5);
    if (isOrbBearBreak) confidence = Math.min(95, confidence + 5);
    if (sessionSweep.sweepType === "BEARISH_SWEEP") confidence = Math.min(98, confidence + 6);
    if (marketStructureShift.isTrueDisplacement && marketStructureShift.type === "BEARISH_MSS") confidence = Math.min(98, confidence + 5);
    if (footprintAbsorption.isInstitutionalAbsorption && footprintAbsorption.bias === "BEARISH") confidence = Math.min(98, confidence + 5);
    if (mtfStructureMatrix.overallAlignment === "FULL_BEARISH_CONFLUENCE") confidence = Math.min(98, confidence + 5);
    if (institutionalChoS.deliveryState === "EXPANSION_DELIVERY") confidence = Math.min(98, confidence + 5);
    if (harmonics.hasPattern && harmonics.bestPattern?.type === "BEARISH") confidence = Math.min(98, confidence + 5);
    if (ehlersMESA.cycleState === "CYCLE_MODE") confidence = Math.min(98, confidence + 4);
    if (candlestickPatterns.dominantSignal === "BEARISH") confidence = Math.min(98, confidence + 4);
    if (ttmSqueeze.squeezeFired && ttmSqueeze.momentumDirection === "INCREASING_BEAR") confidence = Math.min(98, confidence + 5);
    if (hurstExponent.marketCharacter === "PERSISTENT_TRENDING") confidence = Math.min(98, confidence + 4);
    if (chaikinMoneyFlow.capitalFlow === "HEAVY_DISTRIBUTION") confidence = Math.min(98, confidence + 4);
    if (kalmanFilter.trendBias === "BEARISH_BELOW_KALMAN") confidence = Math.min(98, confidence + 3);
    if (hma.isTurningDown) confidence = Math.min(98, confidence + 4);
    if (!parabolicSAR.isBullish) confidence = Math.min(98, confidence + 3);
    if (aroon.trendState === "STRONG_DOWNTREND") confidence = Math.min(98, confidence + 4);
    if (vortex.trend === "BEARISH") confidence = Math.min(98, confidence + 4);
    if (kama.trendState === "BEARISH") confidence = Math.min(98, confidence + 3);
    if (fisher.crossSignal === "BEARISH_CROSS" || fisher.isExtremeOverbought) confidence = Math.min(98, confidence + 4);
    if (connorsRSI.isExtremeOverbought) confidence = Math.min(98, confidence + 5);
    if (awesomeOsc.saucerSignal === "BEARISH_SAUCER" || awesomeOsc.isZeroCross) confidence = Math.min(98, confidence + 4);
    if (!tsi.isBullish) confidence = Math.min(98, confidence + 3);
    if (advancedVol.volatilityRegime !== "HIGH_CLIMAX") confidence = Math.min(98, confidence + 3);
    if (isQuadDeathShort) {
      confidence = Math.min(98, confidence + 5);
      setupGrade = "A+";
    }
  } else {
    signal = "WAIT";
    setupGrade = masterConfluence.totalScore >= 60 ? "B" : "C (Wait)";
  }

  // ─── BATCH 3 QUANT CALIBRATION (PLANS 11-15) ───
  // [แผน 11] Institutional Optimal Trade Entry (OTE - Fibonacci 61.8% – 78.6% Golden Pocket)
  const oteZone = indicators.oteZone || calculateOTEZones(candles, tier1Bias === "BEARISH" ? "BEARISH" : "BULLISH", precision);

  // [แผน 13] Volume Delta & Order Flow Imbalance Approximation
  const volumeDelta = indicators.volumeDelta || calculateVolumeDelta(candles);

  // [แผน 15] Psychological Round Number & Key Level Gravity Engine
  const roundLevel = indicators.roundLevel || calculateRoundNumberGravity(currentPrice, symbol, precision);

  // Calculate Trade Setup Levels with Dynamic TP Multiplier, Structural SL & Asset Precision
  const effectiveTPMultiplier = regimeInfo.optimalParams.tpMultiplier || optimizedConfig.tpMultiplier;
  const nearestSupport = indicators.supportLevels[0] || Number((currentPrice - currentATR * 1.5).toFixed(precision));
  const nearestResistance = indicators.resistanceLevels[0] || Number((currentPrice + currentATR * 1.5).toFixed(precision));

  let tradeAction: "BUY" | "SELL" | "NO_TRADE" = "NO_TRADE";
  let structuralSL: StructuralStopLossInfo | undefined;
  let stopLoss = Number((currentPrice - currentATR * 1.2).toFixed(precision));
  let pendingPrice = currentPrice;
  let entryZone = { min: Number((currentPrice * 0.998).toFixed(precision)), max: Number((currentPrice * 1.002).toFixed(precision)) };
  let takeProfit1 = Number((currentPrice + currentATR * 1.0).toFixed(precision));
  let takeProfit2 = Number((currentPrice + currentATR * effectiveTPMultiplier).toFixed(precision));
  let riskRewardRatio = `1:${effectiveTPMultiplier.toFixed(1)}`;

  if (signal === "STRONG_BUY" || signal === "BUY") {
    tradeAction = "BUY";
    // [แผน 12 & แผน 28] Liquidity Hunt Protection Stop Loss + Realized Volatility Buffer
    structuralSL = calculateStructuralStopLoss(candles, "BUY", currentATR, currentPrice, precision);
    const slBufferExtra = realizedVolatility.recommendedBufferMultiplier > 1.0 ? currentATR * (realizedVolatility.recommendedBufferMultiplier - 1.0) * 0.5 : 0;
    stopLoss = Number((structuralSL.stopLoss - slBufferExtra).toFixed(precision));

    // [แผน 11] OTE Zone Entry & Sweet Spot 70.5%
    pendingPrice = oteZone.sweetSpot || Number(Math.min(currentPrice, lastEMA20 * 1.002).toFixed(precision));
    entryZone = { min: oteZone.oteMin, max: oteZone.oteMax };

    // [แผน 31] FVG Consequent Encroachment (50%) Limit Refinement
    if (fvgMitigation.recommendedEntryLimit && fvgMitigation.recommendedEntryLimit < currentPrice && fvgMitigation.recommendedEntryLimit >= stopLoss) {
      pendingPrice = fvgMitigation.recommendedEntryLimit;
    }

    // [แผน 14] Dynamic Multi-Stage Take Profit
    const risk = Math.max(pendingPrice - stopLoss, currentATR * 0.8);
    takeProfit1 = Number((pendingPrice + risk * 1.0).toFixed(precision));
    takeProfit2 = Number((pendingPrice + risk * effectiveTPMultiplier).toFixed(precision));

    // [แผน 38] MTF Fibonacci Extension Golden Target Refinement
    if (fibonacciExtension.bestTakeProfitTarget?.price && fibonacciExtension.bestTakeProfitTarget.price > takeProfit1) {
      takeProfit2 = fibonacciExtension.bestTakeProfitTarget.price;
    }
    // [แผน 44] Rejection Block Low Protection
    if (rejectionBlock.nearestBlock && rejectionBlock.nearestBlock.type === "BULLISH_REJECTION_BLOCK" && rejectionBlock.nearestBlock.low < pendingPrice) {
      stopLoss = Number(Math.min(stopLoss, rejectionBlock.nearestBlock.low - currentATR * 0.1).toFixed(precision));
    }
    // [แผน 46] Harmonic PRZ Alignment
    if (harmonics.hasPattern && harmonics.bestPattern && harmonics.bestPattern.type === "BULLISH") {
      entryZone = harmonics.bestPattern.prz;
      pendingPrice = harmonics.bestPattern.points.D.price;
      takeProfit1 = harmonics.bestPattern.targetTP1;
      takeProfit2 = harmonics.bestPattern.targetTP2;
    }
    riskRewardRatio = `1:${((takeProfit2 - pendingPrice) / risk).toFixed(1)}`;
  } else if (signal === "STRONG_SELL" || signal === "SELL") {
    tradeAction = "SELL";
    // [แผน 12 & แผน 28] Liquidity Hunt Protection Stop Loss + Realized Volatility Buffer
    structuralSL = calculateStructuralStopLoss(candles, "SELL", currentATR, currentPrice, precision);
    const slBufferExtra = realizedVolatility.recommendedBufferMultiplier > 1.0 ? currentATR * (realizedVolatility.recommendedBufferMultiplier - 1.0) * 0.5 : 0;
    stopLoss = Number((structuralSL.stopLoss + slBufferExtra).toFixed(precision));

    // [แผน 11] OTE Zone Entry & Sweet Spot 70.5%
    pendingPrice = oteZone.sweetSpot || Number(Math.max(currentPrice, lastEMA20 * 0.998).toFixed(precision));
    entryZone = { min: oteZone.oteMin, max: oteZone.oteMax };

    // [แผน 31] FVG Consequent Encroachment (50%) Limit Refinement
    if (fvgMitigation.recommendedEntryLimit && fvgMitigation.recommendedEntryLimit > currentPrice && fvgMitigation.recommendedEntryLimit <= stopLoss) {
      pendingPrice = fvgMitigation.recommendedEntryLimit;
    }

    // [แผน 14] Dynamic Multi-Stage Take Profit
    const risk = Math.max(stopLoss - pendingPrice, currentATR * 0.8);
    takeProfit1 = Number((pendingPrice - risk * 1.0).toFixed(precision));
    takeProfit2 = Number((pendingPrice - risk * effectiveTPMultiplier).toFixed(precision));

    // [แผน 38] MTF Fibonacci Extension Golden Target Refinement
    if (fibonacciExtension.bestTakeProfitTarget?.price && fibonacciExtension.bestTakeProfitTarget.price < takeProfit1) {
      takeProfit2 = fibonacciExtension.bestTakeProfitTarget.price;
    }
    // [แผน 44] Rejection Block High Protection
    if (rejectionBlock.nearestBlock && rejectionBlock.nearestBlock.type === "BEARISH_REJECTION_BLOCK" && rejectionBlock.nearestBlock.high > pendingPrice) {
      stopLoss = Number(Math.max(stopLoss, rejectionBlock.nearestBlock.high + currentATR * 0.1).toFixed(precision));
    }
    // [แผน 46] Harmonic PRZ (Potential Reversal Zone) Alignment
    if (harmonics.hasPattern && harmonics.bestPattern && harmonics.bestPattern.type === "BEARISH") {
      entryZone = harmonics.bestPattern.prz;
      pendingPrice = harmonics.bestPattern.points.D.price;
      takeProfit1 = harmonics.bestPattern.targetTP1;
      takeProfit2 = harmonics.bestPattern.targetTP2;
    }
    riskRewardRatio = `1:${((pendingPrice - takeProfit2) / risk).toFixed(1)}`;
  }

  // [แผน 14] Automated Risk-Free Breakeven Shield
  const breakevenAdvice = calculateBreakevenRules(
    tradeAction !== "NO_TRADE" ? pendingPrice : currentPrice,
    stopLoss,
    takeProfit1,
    tradeAction === "SELL" ? "SELL" : "BUY",
    currentPrice,
    symbol,
    precision
  );

  // [แผน 36] Dynamic Multi-Stage Breakeven & Partial TP Laddering Engine
  const breakevenLadder = indicators.breakevenLadder || calculateBreakevenLadder(
    tradeAction !== "NO_TRADE" ? pendingPrice : currentPrice,
    stopLoss,
    currentPrice,
    tradeAction === "SELL" ? "SELL" : "BUY",
    precision,
    symbol
  );

  const pipMultiplier = symbol.includes("JPY") ? 100 : symbol.includes("XAU") ? 10 : 10000;
  const slPips = Math.round(Math.abs(pendingPrice - stopLoss) * pipMultiplier);
  const tp1Pips = Math.round(Math.abs(takeProfit1 - pendingPrice) * pipMultiplier);
  const tp2Pips = Math.round(Math.abs(takeProfit2 - pendingPrice) * pipMultiplier);

  // [แผน 18] Dynamic Spread & Slippage Impact Calculator
  const spreadImpact = calculateSpreadImpact(symbol, slPips, tp1Pips, 100, 0.01);

  // [แผน 20] Automated Multi-Stage Trailing Stop Loss (Chandelier ATR Trail)
  const trailingStop = calculateChandelierTrailingStop(candles, tradeAction === "SELL" ? "SELL" : "BUY", currentATR, precision, symbol);

  // [แผน 21] Volatility-Adjusted Kelly Criterion Sizing
  const winRate = historicalBacktest.winRate / 100 || 0.65;
  const validATRs = atrs.filter((v): v is number => v !== null && !isNaN(v));
  const avgATR = validATRs.length > 0 ? validATRs.slice(-30).reduce((a, b) => a + b, 0) / Math.min(30, validATRs.length) : currentATR;
  const kellySizing = calculateKellyCriterionSizing(
    winRate,
    effectiveTPMultiplier,
    currentATR,
    avgATR,
    precision,
    symbol
  );

  // [แผน 43] Adaptive Dynamic Risk Bracket & Portfolio Drawdown Limiter
  const dynamicRiskBracket = indicators.dynamicRiskBracket || calculateDynamicRiskBracket(winRate, realizedVolatility.realizedVol, 0);

  // [แผน 45] Algorithmic Multi-Confluence Power Index (MCPI - 0 to 100 Unified Execution Score)
  const mcpiConviction = indicators.mcpiConviction || calculateUnifiedMCPI(
    masterConfluence.totalScore,
    mtfStructureMatrix.alignmentScorePct,
    marketStructureShift.isTrueDisplacement,
    footprintAbsorption.isInstitutionalAbsorption,
    liquidityInducement.isInducementTrap,
    institutionalChoS.deliveryScore
  );

  // ─── BATCH 10: MILESTONE 50 SYNTHESIS (PLANS 46-50) ───
  const milestone50 = indicators.milestone50 || synthesizeGrandQuantMilestone50(
    masterConfluence.totalScore,
    mcpiConviction.score,
    harmonics.hasPattern,
    shannonEntropy.orderliness !== "MAXIMUM_CHAOS_NOISE",
    ehlersMESA.cycleState === "CYCLE_MODE",
    candlestickPatterns.overallScore
  );

  // SAFETY LOCK 12 (part b): MCPI Conviction Gating (Block if MCPI < 70 or Inducement Trap active)
  if (!mcpiConviction.isApprovedForExecution && (signal === "BUY" || signal === "SELL" || signal === "STRONG_BUY" || signal === "STRONG_SELL")) {
    signal = "WAIT";
    setupGrade = "C (Wait)";
    confidence = Math.min(confidence, 50);
  }

  // 13-Point Confluence Checklist with News Shield, Order Flow, Volume Profile, Anchored VWAP, & Harmonics
  const confluenceChecklist: ConfluenceCheckItem[] = [
    {
      name: `Pillar 1: Trend & Regime (${regimeInfo.title})`,
      passed: masterConfluence.pillars.trendRegime.score >= 16,
      note: `${regimeInfo.description} (ADX: ${regimeInfo.adxValue})`,
    },
    {
      name: `Pillar 2: Momentum & Cycles (RSI + Stoch)`,
      passed: masterConfluence.pillars.momentumCycles.score >= 14,
      note: masterConfluence.pillars.momentumCycles.status,
    },
    {
      name: `Pillar 3: Active Session Timing (${sessionStatus.thaiTimeStr})`,
      passed: sessionStatus.tradeAllowed && (sessionStatus.isGoldenHour || sessionStatus.sessionBadge.isOptimal),
      note: `${sessionStatus.sessionBadge.text} - ${sessionStatus.assetSessionAdvice}`,
    },
    {
      name: `Pillar 4: Economic Calendar Shield (${calendarSafety.badgeText})`,
      passed: calendarSafety.tradeAllowed,
      note: calendarSafety.freezeReason,
    },
    {
      name: `Pillar 5: Market Structure & OTE Fibonacci Zone`,
      passed: masterConfluence.pillars.smartMoneyStructure.score >= 14 || oteZone.isPriceInOTE,
      note: `${masterConfluence.pillars.smartMoneyStructure.status} • ${oteZone.description}`,
    },
    {
      name: `Pillar 6: Volume Delta & Order Flow (${volumeDelta.dominantSide})`,
      passed: (tradeAction === "BUY" && volumeDelta.buyerVolumePct >= 50) ||
              (tradeAction === "SELL" && volumeDelta.sellerVolumePct >= 50) ||
              volumeDelta.isAbsorption,
      note: volumeDelta.description,
    },
    {
      name: `Pillar 7: Volume Profile Value Area (${volumeProfile.isInsideValueArea ? "In Value" : "Imbalance"})`,
      passed: volumeProfile.isInsideValueArea || (tradeAction === "BUY" && currentPrice >= volumeProfile.poc),
      note: volumeProfile.description,
    },
    {
      name: `Pillar 8: Anchored VWAP & CVD Flow (${anchoredVwap.pricePosition})`,
      passed: (tradeAction === "BUY" && (anchoredVwap.pricePosition === "ABOVE_VWAP" || cvd.divergence === "BULLISH_CVD_DIVERGENCE")) ||
              (tradeAction === "SELL" && (anchoredVwap.pricePosition === "BELOW_VWAP" || cvd.divergence === "BEARISH_CVD_DIVERGENCE")) ||
              orderBlocks.isRetestingBreaker,
      note: `${anchoredVwap.description} • ${cvd.description}`,
    },
    {
      name: `Pillar 9: Session Sweeps & Fib Clusters (${sessionSweep.sweepType})`,
      passed: (tradeAction === "BUY" && (sessionSweep.sweepType === "BULLISH_SWEEP" || fibonacciCluster.isPriceInCluster || candleMicrostructure.rejectionStrength === "STRONG_BUY_REJECTION")) ||
              (tradeAction === "SELL" && (sessionSweep.sweepType === "BEARISH_SWEEP" || fibonacciCluster.isPriceInCluster || candleMicrostructure.rejectionStrength === "STRONG_SELL_REJECTION")) ||
              sessionSweep.sweepType === "NONE",
      note: `${sessionSweep.description} • ${fibonacciCluster.description}`,
    },
    {
      name: `Pillar 10: FVG & Premium/Discount Matrix (${premiumDiscount.zone})`,
      passed: (tradeAction === "BUY" && (premiumDiscount.zone === "DISCOUNT" || premiumDiscount.zone === "EQUILIBRIUM" || fvgMitigation.bias === "BULLISH_IMBALANCE")) ||
              (tradeAction === "SELL" && (premiumDiscount.zone === "PREMIUM" || premiumDiscount.zone === "EQUILIBRIUM" || fvgMitigation.bias === "BEARISH_IMBALANCE")) ||
              marketStructureShift.isTrueDisplacement,
      note: `${premiumDiscount.description} • MSS: ${marketStructureShift.type} (${marketStructureShift.displacementVelocity})`,
    },
    {
      name: `Pillar 11: MTF Structure Alignment & VSA Absorption (${mtfStructureMatrix.htfTrend})`,
      passed: !mtfStructureMatrix.isHTFConflict && (mtfStructureMatrix.alignmentScorePct >= 50 || footprintAbsorption.isInstitutionalAbsorption),
      note: `${mtfStructureMatrix.description} • VSA: ${footprintAbsorption.vsaSignal} (${footprintAbsorption.effortVsResult})`,
    },
    {
      name: `Pillar 12: Liquidity Inducement & MCPI (${mcpiConviction.convictionTier})`,
      passed: mcpiConviction.isApprovedForExecution && !liquidityInducement.isInducementTrap,
      note: `${mcpiConviction.description} • Inducement: ${liquidityInducement.trapType}`,
    },
    {
      name: `Pillar 13: Harmonics & DSP State (${ehlersMESA.cycleState} | Entropy: ${shannonEntropy.normalizedEntropy})`,
      passed: harmonics.hasPattern || (ehlersMESA.cycleState === "TREND_MODE" && shannonEntropy.orderliness !== "MAXIMUM_CHAOS_NOISE"),
      note: `${ehlersMESA.description} • ${shannonEntropy.description} • Harmonics: ${harmonics.hasPattern ? harmonics.bestPattern?.patternName : "None"} • Patterns: ${candlestickPatterns.dominantSignal}`,
    },
    {
      name: `Pillar 14: Statistical Memory & Volatility Squeeze (${hurstExponent.marketCharacter} | ${ttmSqueeze.isSqueezeOn ? "SQUEEZE_ON" : ttmSqueeze.squeezeFired ? "SQUEEZE_FIRED" : "NORMAL"})`,
      passed: (tradeAction === "BUY" && chaikinMoneyFlow.cmf >= -0.05) ||
              (tradeAction === "SELL" && chaikinMoneyFlow.cmf <= 0.05) ||
              ttmSqueeze.squeezeFired ||
              hurstExponent.marketCharacter === "PERSISTENT_TRENDING",
      note: `${hurstExponent.description} • ${ttmSqueeze.description} • ${chaikinMoneyFlow.description} • Kalman: ${kalmanFilter.trendBias}`,
    },
    {
      name: `Pillar 15: Adaptive Trend & Vortex Directional Matrix (${kama.trendState} | HMA: ${hma.isTurningUp ? "TURN_UP" : hma.isTurningDown ? "TURN_DOWN" : "STEADY"} | Vortex: ${vortex.trend})`,
      passed: (tradeAction === "BUY" && (vortex.trend === "BULLISH" || hma.isTurningUp || parabolicSAR.isBullish || kama.trendState === "BULLISH")) ||
              (tradeAction === "SELL" && (vortex.trend === "BEARISH" || hma.isTurningDown || !parabolicSAR.isBullish || kama.trendState === "BEARISH")) ||
              aroon.trendState !== "CONSOLIDATION",
      note: `${kama.description} • ${hma.description} • ${parabolicSAR.description} • ${aroon.description} • ${vortex.description}`,
    },
    {
      name: `Pillar 16: Gaussian Momentum & Multi-Estimator Volatility Matrix (${fisher.crossSignal !== "NONE" ? fisher.crossSignal : "GAUSSIAN_BALANCED"} | AO: ${awesomeOsc.saucerSignal !== "NONE" ? awesomeOsc.saucerSignal : awesomeOsc.isGreen ? "BULL" : "BEAR"} | Vol: ${advancedVol.volatilityRegime})`,
      passed: ((tradeAction === "BUY" && (fisher.crossSignal === "BULLISH_CROSS" || fisher.isExtremeOversold || connorsRSI.isExtremePullback || tsi.isBullish || awesomeOsc.isGreen)) ||
              (tradeAction === "SELL" && (fisher.crossSignal === "BEARISH_CROSS" || fisher.isExtremeOverbought || connorsRSI.isExtremeOverbought || !tsi.isBullish || !awesomeOsc.isGreen)) ||
              advancedVol.safetyLock16Passed) ?? false,
      note: `${fisher.description} • ${connorsRSI.description} • ${awesomeOsc.description} • ${tsi.description} • ${advancedVol.description}`,
    },
  ];

  const prefixReason = !calendarSafety.tradeAllowed
    ? `[${calendarSafety.badgeText}] ${calendarSafety.freezeReason} `
    : "";

  return {
    symbol,
    timeframe,
    timestamp: new Date().toISOString(),
    currentPrice,
    signal,
    confidence,
    setupGrade,
    summary: `${prefixReason}[${sessionStatus.sessionBadge.text}] ${sessionStatus.assetSessionAdvice} สภาวะตลาด: ${regimeInfo.title} (คะแนน Confluence: ${masterConfluence.totalScore}%) ผลลัพธ์: ${signal}`,
    confluenceChecklist,
    historicalBacktest,
    optimizedConfig,
    traderHierarchy,
    masterConfluence,
    regimeInfo,
    sessionStatus,
    calendarSafety,
    oteZone,
    volumeDelta,
    breakevenAdvice,
    roundLevel,
    volumeProfile,
    tdSequential,
    spreadImpact,
    trailingStop,
    anchoredVwap,
    cvd,
    orderBlocks,
    priceFeedIntegrity,
    sessionSweep,
    fibonacciCluster,
    realizedVolatility,
    candleMicrostructure,
    correlationShield,
    fvgMitigation,
    marketStructureShift,
    premiumDiscount,
    keyLevelTargets,
    orderFlowVelocity,
    breakevenLadder,
    liquidityVoid,
    fibonacciExtension,
    footprintAbsorption,
    mtfStructureMatrix,
    liquidityInducement,
    institutionalChoS,
    dynamicRiskBracket,
    rejectionBlock,
    mcpiConviction,
    kellySizing,
    harmonics,
    ehlersMESA,
    shannonEntropy,
    candlestickPatterns,
    milestone50,
    hurstExponent,
    kalmanFilter,
    halfLife,
    ttmSqueeze,
    chaikinMoneyFlow,
    kama,
    hma,
    parabolicSAR,
    aroon,
    vortex,
    fisher,
    connorsRSI,
    awesomeOsc,
    tsi,
    advancedVol,
    timeframeMatrix: mtfMatrix,
    technicalAnalysis: {
      trend,
      rsiStatus: `RSI(${regimeInfo.optimalParams.rsiPeriod}): ${lastRSI.toFixed(1)} (StochRSI K: ${indicators.stochRSI?.slice(-1)[0]?.k ?? 50})`,
      emaStatus: `EMA${regimeInfo.optimalParams.emaFast} (${lastEMA20.toFixed(2)}), EMA${regimeInfo.optimalParams.emaSlow} (${lastEMA50.toFixed(2)}), EMA${regimeInfo.optimalParams.emaTrend} (${lastEMA200.toFixed(2)})`,
      macdStatus: `SuperTrend: ${indicators.superTrend?.slice(-1)[0]?.direction ?? "UP"} | ADX: ${regimeInfo.adxValue}`,
      keySupport: nearestSupport,
      keyResistance: nearestResistance,
      details: [
        `Economic Calendar Shield: ${calendarSafety.badgeText}`,
        `Session Timing: ${sessionStatus.sessionBadge.text} (${sessionStatus.thaiTimeStr})`,
        `Live Market Regime: ${regimeInfo.title}`,
        `OTE Golden Pocket (61.8%-78.6%): ${oteZone.oteMin} - ${oteZone.oteMax} (Sweet Spot: ${oteZone.sweetSpot})`,
        `Volume Delta: ฝั่งซื้อ ${volumeDelta.buyerVolumePct}% vs ฝั่งขาย ${volumeDelta.sellerVolumePct}% (${volumeDelta.dominantSide})`,
        `Psychological Round Level: ${roundLevel.nearestMajor} (ห่าง ${roundLevel.distancePips} pips)`,
        `Volume Profile: POC ${volumeProfile.poc} (VAH: ${volumeProfile.vah} | VAL: ${volumeProfile.val})`,
        `TD Sequential: ${tdSequential.note}`,
        `Chandelier Trailing Stop: ${trailingStop.trailingStopPrice} (${trailingStop.instruction})`,
        `Spread Impact: ${spreadImpact.estimatedSpreadPips} pips (Net R:R: ${spreadImpact.effectiveRiskReward})`,
        `Anchored VWAP: ${anchoredVwap.vwap} (Pos: ${anchoredVwap.pricePosition})`,
        `CVD Divergence: ${cvd.divergence} (Buyer Vol: ${cvd.buyerVolumeRatio}%)`,
        `SMC Breaker Blocks: ${orderBlocks.description}`,
        `Session Liquidity Sweep: ${sessionSweep.sweepType} (${sessionSweep.sweptLevel ? `Level ${sessionSweep.sweptLevel} | ${sessionSweep.sweptSession}` : "No Sweep"})`,
        `Fibonacci Clusters: ${fibonacciCluster.confluenceCount} Confluences (Golden Zone: ${fibonacciCluster.clusterZone.min}-${fibonacciCluster.clusterZone.max})`,
        `Realized Volatility: ${realizedVolatility.volState} (${realizedVolatility.realizedVol}%, Buffer ${realizedVolatility.recommendedBufferMultiplier}x)`,
        `Candle Microstructure: ${candleMicrostructure.rejectionStrength} (Wick: ${candleMicrostructure.wickRatio}%)`,
        `Correlation Hedge Shield: ${correlationShield.macroRegime} (${correlationShield.shieldStatus} | DXY: ${correlationShield.dxyTrend})`,
        `Kelly Sizing: Half-Kelly ${kellySizing.halfKellyPct}% -> Vol-Safe ${kellySizing.volatilityAdjustedPct}%`,
        `FVG Mitigation: ${fvgMitigation.bias} (${fvgMitigation.unmitigatedCount} Unmitigated, Nearest C.E.: ${fvgMitigation.recommendedEntryLimit ?? "None"})`,
        `Market Structure Shift: ${marketStructureShift.type} (Displacement: ${marketStructureShift.displacementMultiplier}x ATR - ${marketStructureShift.displacementVelocity})`,
        `Dealing Range P/D: ${premiumDiscount.percentile}% (${premiumDiscount.zone}) - Eq: ${premiumDiscount.equilibrium}`,
        `Key Liquidity Targets: Nearest ${keyLevelTargets.nearestLiquidityTarget.name} (${keyLevelTargets.nearestLiquidityTarget.price} - ${keyLevelTargets.nearestLiquidityTarget.distancePips} pips)`,
        `Order Flow Velocity: Score ${orderFlowVelocity.velocityScore} (${orderFlowVelocity.momentumState})`,
        `Multi-Stage BE Ladder: ขั้นที่ ${breakevenLadder.currentStage}/3 (กำไร ${breakevenLadder.currentRMultiple}R | Rec SL: ${breakevenLadder.recommendedSL})`,
        `Liquidity Void Vacuum: ${liquidityVoid.vacuumDirection} (${liquidityVoid.activeVoidCount} โซน, Fast-fill prob: ${liquidityVoid.fastFillProbabilityPct}%)`,
        `Fibonacci Extension Mesh: 1.618 Golden Target ที่ ${fibonacciExtension.bestTakeProfitTarget.price} (${fibonacciExtension.bestTakeProfitTarget.label})`,
        `VSA Footprint Absorption: ${footprintAbsorption.vsaSignal} (Effort/Result: ${footprintAbsorption.effortVsResult}, Vol: ${footprintAbsorption.relativeVolume}x)`,
        `MTF Structure Matrix: ${mtfStructureMatrix.overallAlignment} (คะแนนสอดคล้อง: ${mtfStructureMatrix.alignmentScorePct}%, HTF: ${mtfStructureMatrix.htfTrend})`,
        `Liquidity Inducement: ${liquidityInducement.trapType} (${liquidityInducement.inducementDirection} - ห่าง ${liquidityInducement.distanceToTrapPips} pips)`,
        `Institutional ChoS Delivery: ${institutionalChoS.deliveryState} (${institutionalChoS.dominantParticipant} | Score: ${institutionalChoS.deliveryScore}/100)`,
        `Dynamic Risk Bracket: [${dynamicRiskBracket.currentRiskBracket}] แนะนำเสี่ยง ${dynamicRiskBracket.recommendedRiskPct}% (Scale ${dynamicRiskBracket.drawdownThrottleMultiplier}x)`,
        `Rejection Blocks: พบ ${rejectionBlock.blocks.length} บล็อค (Wick Ratio: ${rejectionBlock.rejectionWickRatioPct}% | Exhaustion: ${rejectionBlock.wickExhaustionScore}/100)`,
        `Unified MCPI Conviction: ${mcpiConviction.score}/100 [เกรด ${mcpiConviction.convictionTier}] (สถานะอนุมัติ: ${mcpiConviction.isApprovedForExecution ? "APPROVED" : "BLOCKED"})`,
        `Harmonic PRZ: ${harmonics.hasPattern ? `${harmonics.bestPattern?.patternName} (${harmonics.bestPattern?.type}) PRZ: ${harmonics.bestPattern?.prz.min}-${harmonics.bestPattern?.prz.max}` : "No Active Pattern"}`,
        `Ehlers MESA DSP: ${ehlersMESA.cycleState} (Dominant Period: ${ehlersMESA.dominantCyclePeriod} bars, Phase: ${ehlersMESA.phaseAngle}°)`,
        `Shannon Entropy: ${shannonEntropy.normalizedEntropy} (${shannonEntropy.orderliness} - Noise: ${shannonEntropy.noisePct}%)`,
        `Candlestick Matrix: ${candlestickPatterns.dominantSignal} (${candlestickPatterns.detectedPatterns.length} Patterns found)`,
        `Grand Milestone 50: [${milestone50.milestoneGrade}] Score: ${milestone50.milestoneScore}/100 - ${milestone50.goldenTicketStatus}`,
        `Hurst Exponent: H=${hurstExponent.hurst} (${hurstExponent.marketCharacter} - Conf: ${hurstExponent.confidence}%)`,
        `Kalman Filter: True Price ${kalmanFilter.filteredPrice} (Bias: ${kalmanFilter.trendBias} | Residual: ${kalmanFilter.innovativeResidual})`,
        `O-U Half-Life: ${halfLife.halfLifeCandles} Bars (${halfLife.reversionVelocity})`,
        `TTM Squeeze: ${ttmSqueeze.isSqueezeOn ? "SQUEEZE_ON (Coiling)" : ttmSqueeze.squeezeFired ? "SQUEEZE_FIRED (Explosive)" : "OFF"} (${ttmSqueeze.momentumDirection} - ${ttmSqueeze.histogramColor})`,
        `Chaikin Money Flow: CMF ${chaikinMoneyFlow.cmf} (${chaikinMoneyFlow.capitalFlow} - Lock 14: ${chaikinMoneyFlow.safetyLock14Passed ? "PASSED" : "ALERT"})`,
        `KAMA Adaptive Trend: ${kama.kamaValue} (ER: ${(kama.efficiencyRatio * 100).toFixed(1)}% - ${kama.trendState})`,
        `Hull MA Zero-Lag: ${hma.hmaValue} (${hma.isTurningUp ? "TURNING_UP" : hma.isTurningDown ? "TURNING_DOWN" : "STEADY"})`,
        `Parabolic SAR: ${parabolicSAR.sar} (${parabolicSAR.isBullish ? "BULLISH" : "BEARISH"} | Reversal: ${parabolicSAR.isReversal ? "YES" : "NO"})`,
        `Aroon Indicator: Up ${aroon.aroonUp}% / Down ${aroon.aroonDown}% (Osc: ${aroon.oscillator} - ${aroon.trendState})`,
        `Vortex Flow: VI+ ${vortex.viPlus} vs VI- ${vortex.viMinus} (${vortex.trend} | Lock 15: ${vortex.safetyLock15Passed ? "PASSED" : "BLOCKED"})`,
        `Fisher Transform: ${fisher.fisher} (Trigger: ${fisher.trigger} | Cross: ${fisher.crossSignal})`,
        `ConnorsRSI: CRSI ${connorsRSI.crsi} (RSI3: ${connorsRSI.rsiClose} | StreakRSI: ${connorsRSI.streakRSI} | Rank: ${connorsRSI.percentRank}%)`,
        `Awesome Oscillator: AO ${awesomeOsc.ao} (${awesomeOsc.isGreen ? "GREEN" : "RED"} | Saucer: ${awesomeOsc.saucerSignal})`,
        `True Strength Index: TSI ${tsi.tsi} (Signal: ${tsi.signal} | ${tsi.isBullish ? "BULLISH" : "BEARISH"})`,
        `Advanced Volatility Suite: Yang-Zhang ${(advancedVol.yangZhangVol * 100).toFixed(1)}% | GK ${(advancedVol.garmanKlassVol * 100).toFixed(1)}% | Ulcer ${advancedVol.ulcerIndex} (Regime: ${advancedVol.volatilityRegime} | Lock 16: ${advancedVol.safetyLock16Passed ? "PASSED" : "BLOCKED"})`,
      ],
    },
    newsSentimentAnalysis: {
      overallSentiment,
      sentimentScore,
      topHeadlines: newsList.slice(0, 3).map((n) => ({
        title: n.title,
        impact: n.impact,
        takeaway: n.summary.substring(0, 100) + "...",
      })),
      macroDrivers: [
        "นโยบายอัตราดอกเบี้ยและสภาพคล่องตลาดการเงินโลก",
        "ทิศทางค่าเงินดอลลาร์สหรัฐและผลตอบแทนพันธบัตร",
        "ระดับความเสี่ยงทางภูมิรัฐศาสตร์และความเชื่อมั่นของนักลงทุนสถาบัน",
      ],
    },
    tradeSetup: {
      action: tradeAction,
      orderType: tradeAction === "BUY"
        ? "BUY_LIMIT"
        : tradeAction === "SELL"
        ? "SELL_LIMIT"
        : "WAIT_NO_ORDER",
      pendingPrice,
      entryZone,
      stopLoss,
      takeProfit1,
      takeProfit2,
      slPips,
      tp1Pips,
      tp2Pips,
      riskRewardRatio,
      oteZone,
      structuralSL,
      breakevenAdvice,
      roundLevel,
      trailingStop,
      spreadImpact,
      volumeProfile,
      kellySizing,
      anchoredVwap,
      cvd,
      orderBlocks,
      sessionSweep,
      fibonacciCluster,
      realizedVolatility,
      candleMicrostructure,
      correlationShield,
      fvgMitigation,
      marketStructureShift,
      premiumDiscount,
      keyLevelTargets,
      orderFlowVelocity,
      breakevenLadder,
      liquidityVoid,
      fibonacciExtension,
      footprintAbsorption,
      mtfStructureMatrix,
      liquidityInducement,
      institutionalChoS,
      dynamicRiskBracket,
      rejectionBlock,
      mcpiConviction,
      harmonics,
      ehlersMESA,
      shannonEntropy,
      candlestickPatterns,
      milestone50,
      hurstExponent,
      kalmanFilter,
      halfLife,
      ttmSqueeze,
      chaikinMoneyFlow,
      kama,
      hma,
      parabolicSAR,
      aroon,
      vortex,
      fisher,
      connorsRSI,
      awesomeOsc,
      tsi,
      advancedVol,
      suggestedLotSize: {
        balance500: Math.max(0.01, Number((5 / Math.max(slPips, 10)).toFixed(2))),
        balance1k: Math.max(0.01, Number((10 / Math.max(slPips, 10)).toFixed(2))),
        balance5k: Math.max(0.01, Number((50 / Math.max(slPips, 10)).toFixed(2))),
        balance10k: Math.max(0.01, Number((100 / Math.max(slPips, 10)).toFixed(2))),
      },
      invalidationNote: structuralSL
        ? `หากราคาหลุดแนวรับสวิง ${structuralSL.swingRefPrice} (Stop Loss: ${stopLoss}) ถือว่าโครงสร้างเสียทรงให้ Cut ทันที`
        : `หากราคาหลุด ${tradeAction === "BUY" ? "Stop Loss ใต้แนวรับ" : "Stop Loss เหนือแนวต้าน"} ถือว่าโครงสร้างเสียทรงให้ Cut ทันที`,
    },
    orchestrator: orchestrateStrategyDecision({
      candles,
      indicators,
      regimeInfo,
    }),
  };
}

/**
 * [แผน 3] Dynamic Multi-Timeframe Alignment Weighting
 * Identifies asset class and applies adaptive timeframe weights:
 * - Crypto (15m=30%, 1h=35%, 4h=25%, 1D=10%)
 * - Forex & Commodities (15m=15%, 1h=25%, 4h=35%, 1D=25%)
 * - Stocks & Indices (15m=15%, 1h=30%, 4h=30%, 1D=25%)
 */
export function detectAssetCategory(symbol: string): "crypto" | "forex" | "commodities" | "stocks" {
  const sym = symbol.toUpperCase();
  if (["BTC", "ETH", "SOL", "BNB", "XRP", "ADA", "DOGE", "AVAX", "LINK", "SUI"].some((c) => sym.startsWith(c)) || sym.endsWith("USDT")) {
    return "crypto";
  }
  if (sym === "XAUUSD" || sym === "XAGUSD" || sym === "USOIL" || sym === "UKOIL") {
    return "commodities";
  }
  if (["EUR", "GBP", "USD", "JPY", "CHF", "CAD", "AUD", "NZD"].some((c) => sym.includes(c)) && sym.length === 6) {
    return "forex";
  }
  return "stocks";
}

export function getMtfWeightsForAsset(category: "crypto" | "forex" | "commodities" | "stocks") {
  if (category === "crypto") {
    return { m15: 0.30, h1: 0.35, h4: 0.25, d1: 0.10 };
  }
  if (category === "forex" || category === "commodities") {
    return { m15: 0.15, h1: 0.25, h4: 0.35, d1: 0.25 };
  }
  return { m15: 0.15, h1: 0.30, h4: 0.30, d1: 0.25 };
}

export function computeMtfAlignment(
  symbol: string,
  mtf: { m15: "BULLISH" | "BEARISH" | "NEUTRAL"; h1: "BULLISH" | "BEARISH" | "NEUTRAL"; h4: "BULLISH" | "BEARISH" | "NEUTRAL"; d1: "BULLISH" | "BEARISH" | "NEUTRAL" }
) {
  const category = detectAssetCategory(symbol);
  const weights = getMtfWeightsForAsset(category);

  const biasToScore = (b: "BULLISH" | "BEARISH" | "NEUTRAL") => (b === "BULLISH" ? 1 : b === "BEARISH" ? -1 : 0);
  const rawScore =
    weights.m15 * biasToScore(mtf.m15) +
    weights.h1 * biasToScore(mtf.h1) +
    weights.h4 * biasToScore(mtf.h4) +
    weights.d1 * biasToScore(mtf.d1);

  const alignmentScore = Math.round(rawScore * 100);

  let summary = "ทิศทางผสมผสาน (MTF Divergence)";
  if (alignmentScore >= 60) summary = "สอดคล้องขาขึ้นทุกระดับเวลา (Institutional Bullish Alignment)";
  else if (alignmentScore >= 25) summary = "เอียงขาขึ้นตามไทม์เฟรมหลัก (Mild Bullish Tilt)";
  else if (alignmentScore <= -60) summary = "สอดคล้องขาลงทุกระดับเวลา (Institutional Bearish Alignment)";
  else if (alignmentScore <= -25) summary = "เอียงขาลงตามไทม์เฟรมหลัก (Mild Bearish Tilt)";

  return { alignmentScore, assetCategory: category, summary };
}

/**
 * Computes true Multi-Timeframe Alignment (M15, H1, H4, D1) directly from
 * actual historical candlestick data in Neon PostgreSQL with dynamic asset-class weighting.
 */
export async function calculateTrueMultiTimeframeMatrix(
  symbol: string
): Promise<AnalysisResult["timeframeMatrix"]> {
  try {
    const [c15m, c1h, c4h, c1d] = await Promise.all([
      getCachedCandles(symbol, "15m", 50),
      getCachedCandles(symbol, "1h", 50),
      getCachedCandles(symbol, "4h", 50),
      getCachedCandles(symbol, "1D", 50),
    ]);

    const determineBias = (candles: Candle[]): "BULLISH" | "BEARISH" | "NEUTRAL" => {
      if (!candles || candles.length < 15) return "NEUTRAL";
      const last = candles[candles.length - 1];
      const ema20 = calculateEMA(candles, 20).slice(-1)[0] ?? last.close;
      const ema50 = calculateEMA(candles, 50).slice(-1)[0] ?? last.close;

      if (last.close > ema50 && ema20 >= ema50) return "BULLISH";
      if (last.close < ema50 && ema20 <= ema50) return "BEARISH";
      return "NEUTRAL";
    };

    const rawMtf = {
      m15: determineBias(c15m),
      h1: determineBias(c1h),
      h4: determineBias(c4h),
      d1: determineBias(c1d),
    };

    const alignment = computeMtfAlignment(symbol, rawMtf);

    // [แผน 8] Quad-EMA 200 Confluence Analysis across 15m, 1h, 4h, 1D
    const currentPrice = c15m[c15m.length - 1]?.close || c1h[c1h.length - 1]?.close || 0;
    const ema200_15m = (c15m.length > 20 ? calculateEMA(c15m, 200).slice(-1)[0] : null) ?? currentPrice;
    const ema200_1h = (c1h.length > 20 ? calculateEMA(c1h, 200).slice(-1)[0] : null) ?? currentPrice;
    const ema200_4h = (c4h.length > 20 ? calculateEMA(c4h, 200).slice(-1)[0] : null) ?? currentPrice;
    const ema200_1d = (c1d.length > 20 ? calculateEMA(c1d, 200).slice(-1)[0] : null) ?? currentPrice;

    const above15m = currentPrice >= ema200_15m;
    const above1h = currentPrice >= ema200_1h;
    const above4h = currentPrice >= ema200_4h;
    const above1d = currentPrice >= ema200_1d;

    const isQuadGoldenStack = above15m && above1h && above4h && above1d;
    const isQuadDeathStack = !above15m && !above1h && !above4h && !above1d;

    const quadEma: QuadEmaConfluence = {
      isQuadGoldenStack,
      isQuadDeathStack,
      status: isQuadGoldenStack ? "GOLDEN_STACK" : isQuadDeathStack ? "DEATH_STACK" : "MIXED",
      scoreBonus: isQuadGoldenStack ? 10 : isQuadDeathStack ? -10 : 0,
    };

    return {
      ...rawMtf,
      alignmentScore: alignment.alignmentScore,
      assetCategory: alignment.assetCategory,
      summary: alignment.summary,
      quadEma,
    };
  } catch (err) {
    console.warn("Failed to calculate true MTF matrix from Neon:", err);
    const category = detectAssetCategory(symbol);
    return {
      m15: "NEUTRAL",
      h1: "NEUTRAL",
      h4: "NEUTRAL",
      d1: "NEUTRAL",
      alignmentScore: 0,
      assetCategory: category,
      summary: "กำลังซิงค์ข้อมูล MTF จาก Neon Database",
    };
  }
}

export async function analyzeWithGemini(
  symbol: string,
  timeframe: string,
  candles: Candle[],
  indicators: IndicatorData,
  news: NewsItem[],
  customApiKey?: string
): Promise<AnalysisResult> {
  const apiKey = customApiKey || process.env.GEMINI_API_KEY;

  // Closed-loop reinforcement: Retrieve dynamic weights, past win/loss lessons, and True MTF Matrix
  const [adaptiveConfig, recentLessons, trueMTFMatrix] = await Promise.all([
    getAdaptiveWeights(symbol).catch(() => undefined),
    getRecentLessons(symbol, 4).catch(() => []),
    calculateTrueMultiTimeframeMatrix(symbol).catch(() => undefined),
  ]);

  const ruleAnalysis = generateRuleBasedAnalysis(
    symbol,
    timeframe,
    candles,
    indicators,
    news,
    adaptiveConfig,
    trueMTFMatrix
  );

  if (!apiKey) {
    return ruleAnalysis;
  }

  const lessonsText =
    recentLessons && recentLessons.length > 0
      ? recentLessons.map((l, i) => `${i + 1}. ${l}`).join("\n")
      : "1. คอยสังเกตแท่งเทียน Rejection ที่แนวรับ EMA20/50 ก่อนเข้าเทรดเสมอ";

  const prompt = `You are a World-Class Quantitative Portfolio Architect & Trading Mentor.
Your goal is to explain market conditions and trading decisions to beginners who have NEVER traded before in warm, natural, and fluent Thai (ภาษาไทยที่สละสลวย ถูกต้องตามหลักไวยากรณ์ สำนวนธรรมชาติเหมือนรุ่นพี่สอนรุ่นน้อง ไม่แปลตรงตัวแบบหุ่นยนต์).

Context:
- Economic Calendar Shield: ${ruleAnalysis.calendarSafety?.badgeText}
- Red Folder Safety Reason: ${ruleAnalysis.calendarSafety?.freezeReason} (Trade Allowed: ${ruleAnalysis.calendarSafety?.tradeAllowed})
- Current Thai Time (GMT+7): ${ruleAnalysis.sessionStatus?.thaiTimeStr}
- Active Market Session: ${ruleAnalysis.sessionStatus?.sessionBadge.text}
- Session Timing Advice: ${ruleAnalysis.sessionStatus?.assetSessionAdvice}
- Live Market Regime: ${ruleAnalysis.regimeInfo?.title}
- Confluence Score: ${ruleAnalysis.masterConfluence?.totalScore}% (Grade ${ruleAnalysis.setupGrade})
- Self-Adaptive Engine: ${adaptiveConfig?.isSelfTuned ? `Active (Win Rate: ${adaptiveConfig.recentWinRate}%, Gating: >=${adaptiveConfig.minScoreThreshold}%)` : "Baseline Institutional"}
- Institutional OTE Golden Pocket (61.8%-78.6%): ${ruleAnalysis.oteZone?.oteMin} - ${ruleAnalysis.oteZone?.oteMax} (Sweet Spot: ${ruleAnalysis.oteZone?.sweetSpot})
- Liquidity Shield Stop Loss: ${ruleAnalysis.tradeSetup.stopLoss} (${ruleAnalysis.tradeSetup.structuralSL?.protectionType || "Swing Protected"})
- Volume Delta Flow: ${ruleAnalysis.volumeDelta?.description} (Buyers ${ruleAnalysis.volumeDelta?.buyerVolumePct}% vs Sellers ${ruleAnalysis.volumeDelta?.sellerVolumePct}%)
- Breakeven Rule: ${ruleAnalysis.breakevenAdvice?.actionText}
- Round Number Magnet: ${ruleAnalysis.roundLevel?.nearestMajor} (ห่าง ${ruleAnalysis.roundLevel?.distancePips} pips)
- Volume Profile: POC ${ruleAnalysis.volumeProfile?.poc} (VAH: ${ruleAnalysis.volumeProfile?.vah}, VAL: ${ruleAnalysis.volumeProfile?.val}, Inside Value: ${ruleAnalysis.volumeProfile?.isInsideValueArea})
- TD Sequential Exhaustion: ${ruleAnalysis.tdSequential?.note}
- Broker Spread Friction: ${ruleAnalysis.spreadImpact?.estimatedSpreadPips} pips (Net R:R: ${ruleAnalysis.spreadImpact?.effectiveRiskReward})
- Chandelier Trailing Stop: ${ruleAnalysis.trailingStop?.trailingStopPrice} (${ruleAnalysis.trailingStop?.instruction})

### CLOSED-LOOP TRADING LESSONS & REINFORCEMENT MEMORY FOR ${symbol}:
${lessonsText}

SELF-IMPROVING MANDATE FOR AI:
- Learn from the past outcomes above: DO NOT repeat setups matching historical losses.
- If recent win rate is lower, advise extra caution and recommend waiting for confirmed institutional confluence.
- Reinforce high-win setups (e.g. alignment with SuperTrend, optimal London/NY sessions, value zone pullbacks).

### LIVE FINANCIAL NEWS & SENTIMENT:
${news.slice(0, 5).map((n, i) => `${i + 1}. [${n.source}] (${n.sentiment}) ${n.title}`).join("\n")}

CRITICAL INSTRUCTIONS:
1. "summary": Write 2-3 sentences in natural Thai explaining:
   - ตลาดอยู่ในสถานะอะไร ปลอดภัยหรือไม่ (เช็คเกราะกล่องข่าว ${ruleAnalysis.calendarSafety?.badgeText} และช่วงเวลา ${ruleAnalysis.sessionStatus?.sessionBadge.text})
   - แนะนำให้ผู้ใช้ทำอะไรอย่างชัดเจน (เช่น "แนะนำให้ตั้ง Buy Limit ดักซื้อของถูกที่แนวรับ" หรือ "แนะนำให้อยู่เฉยๆ ถือเงินสดไว้ก่อน")
2. Technical terms must always have plain Thai explanations (e.g., SL = จุดยอมแพ้, TP = จุดเก็บกำไร, Support = แนวรับ/ของถูก, Resistance = แนวต้าน/ของแพง).

Respond ONLY with valid JSON matching this schema:
{
  "symbol": "${symbol}",
  "timeframe": "${timeframe}",
  "timestamp": "${new Date().toISOString()}",
  "currentPrice": ${indicators.currentPrice},
  "signal": "${ruleAnalysis.signal}",
  "confidence": ${ruleAnalysis.confidence},
  "setupGrade": "${ruleAnalysis.setupGrade}",
  "summary": "บทวิเคราะห์ภาษาไทยสำนวนสละสลวยเข้าใจง่ายสำหรับมือใหม่ สรุปสถานะกล่องข่าวและสิ่งที่ควรทำ",
  "confluenceChecklist": ${JSON.stringify(ruleAnalysis.confluenceChecklist)},
  "timeframeMatrix": ${JSON.stringify(ruleAnalysis.timeframeMatrix)},
  "technicalAnalysis": {
    "trend": "${ruleAnalysis.technicalAnalysis.trend}",
    "rsiStatus": "${ruleAnalysis.technicalAnalysis.rsiStatus}",
    "emaStatus": "${ruleAnalysis.technicalAnalysis.emaStatus}",
    "macdStatus": "${ruleAnalysis.technicalAnalysis.macdStatus}",
    "keySupport": ${ruleAnalysis.technicalAnalysis.keySupport},
    "keyResistance": ${ruleAnalysis.technicalAnalysis.keyResistance},
    "details": ${JSON.stringify(ruleAnalysis.technicalAnalysis.details)}
  },
  "newsSentimentAnalysis": ${JSON.stringify(ruleAnalysis.newsSentimentAnalysis)},
  "tradeSetup": ${JSON.stringify(ruleAnalysis.tradeSetup)}
}`;

  try {
    // Attempt with fast, robust gemini-3.5-flash first
    let res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            responseMimeType: "application/json",
            temperature: 0.15,
          },
        }),
      }
    );

    // Fallback to gemini-3.1-flash-lite if 3.5 is busy
    if (!res.ok) {
      res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              responseMimeType: "application/json",
              temperature: 0.15,
            },
          }),
        }
      );
    }

    if (!res.ok) {
      console.warn(`Gemini API error: ${res.statusText}`);
      return ruleAnalysis;
    }

    const data = await res.json();
    const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!rawText) return ruleAnalysis;

    const cleanedText = rawText.replace(/```json/g, "").replace(/```/g, "").trim();
    const firstBrace = cleanedText.indexOf("{");
    const lastBrace = cleanedText.lastIndexOf("}");
    const jsonStr =
      firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace
        ? cleanedText.substring(firstBrace, lastBrace + 1)
        : cleanedText;
    const parsed: AnalysisResult = JSON.parse(jsonStr);
    parsed.historicalBacktest = ruleAnalysis.historicalBacktest;
    parsed.optimizedConfig = ruleAnalysis.optimizedConfig;
    parsed.traderHierarchy = ruleAnalysis.traderHierarchy;
    parsed.masterConfluence = ruleAnalysis.masterConfluence;
    parsed.regimeInfo = ruleAnalysis.regimeInfo;
    parsed.sessionStatus = ruleAnalysis.sessionStatus;
    parsed.calendarSafety = ruleAnalysis.calendarSafety;
    parsed.oteZone = ruleAnalysis.oteZone;
    parsed.volumeDelta = ruleAnalysis.volumeDelta;
    parsed.breakevenAdvice = ruleAnalysis.breakevenAdvice;
    parsed.roundLevel = ruleAnalysis.roundLevel;
    parsed.volumeProfile = ruleAnalysis.volumeProfile;
    parsed.tdSequential = ruleAnalysis.tdSequential;
    parsed.spreadImpact = ruleAnalysis.spreadImpact;
    parsed.trailingStop = ruleAnalysis.trailingStop;
    parsed.anchoredVwap = ruleAnalysis.anchoredVwap;
    parsed.cvd = ruleAnalysis.cvd;
    parsed.orderBlocks = ruleAnalysis.orderBlocks;
    parsed.priceFeedIntegrity = ruleAnalysis.priceFeedIntegrity;
    parsed.sessionSweep = ruleAnalysis.sessionSweep;
    parsed.fibonacciCluster = ruleAnalysis.fibonacciCluster;
    parsed.realizedVolatility = ruleAnalysis.realizedVolatility;
    parsed.candleMicrostructure = ruleAnalysis.candleMicrostructure;
    parsed.correlationShield = ruleAnalysis.correlationShield;
    parsed.fvgMitigation = ruleAnalysis.fvgMitigation;
    parsed.marketStructureShift = ruleAnalysis.marketStructureShift;
    parsed.premiumDiscount = ruleAnalysis.premiumDiscount;
    parsed.keyLevelTargets = ruleAnalysis.keyLevelTargets;
    parsed.orderFlowVelocity = ruleAnalysis.orderFlowVelocity;
    parsed.breakevenLadder = ruleAnalysis.breakevenLadder;
    parsed.liquidityVoid = ruleAnalysis.liquidityVoid;
    parsed.fibonacciExtension = ruleAnalysis.fibonacciExtension;
    parsed.footprintAbsorption = ruleAnalysis.footprintAbsorption;
    parsed.mtfStructureMatrix = ruleAnalysis.mtfStructureMatrix;
    parsed.liquidityInducement = ruleAnalysis.liquidityInducement;
    parsed.institutionalChoS = ruleAnalysis.institutionalChoS;
    parsed.dynamicRiskBracket = ruleAnalysis.dynamicRiskBracket;
    parsed.rejectionBlock = ruleAnalysis.rejectionBlock;
    parsed.mcpiConviction = ruleAnalysis.mcpiConviction;
    parsed.kellySizing = ruleAnalysis.kellySizing;
    parsed.harmonics = ruleAnalysis.harmonics;
    parsed.ehlersMESA = ruleAnalysis.ehlersMESA;
    parsed.shannonEntropy = ruleAnalysis.shannonEntropy;
    parsed.candlestickPatterns = ruleAnalysis.candlestickPatterns;
    parsed.milestone50 = ruleAnalysis.milestone50;
    parsed.hurstExponent = ruleAnalysis.hurstExponent;
    parsed.kalmanFilter = ruleAnalysis.kalmanFilter;
    parsed.halfLife = ruleAnalysis.halfLife;
    parsed.ttmSqueeze = ruleAnalysis.ttmSqueeze;
    parsed.chaikinMoneyFlow = ruleAnalysis.chaikinMoneyFlow;
    parsed.kama = ruleAnalysis.kama;
    parsed.hma = ruleAnalysis.hma;
    parsed.parabolicSAR = ruleAnalysis.parabolicSAR;
    parsed.aroon = ruleAnalysis.aroon;
    parsed.vortex = ruleAnalysis.vortex;

    if (parsed.tradeSetup) {
      parsed.tradeSetup.oteZone = ruleAnalysis.tradeSetup.oteZone;
      parsed.tradeSetup.structuralSL = ruleAnalysis.tradeSetup.structuralSL;
      parsed.tradeSetup.breakevenAdvice = ruleAnalysis.tradeSetup.breakevenAdvice;
      parsed.tradeSetup.roundLevel = ruleAnalysis.tradeSetup.roundLevel;
      parsed.tradeSetup.trailingStop = ruleAnalysis.tradeSetup.trailingStop;
      parsed.tradeSetup.spreadImpact = ruleAnalysis.tradeSetup.spreadImpact;
      parsed.tradeSetup.volumeProfile = ruleAnalysis.tradeSetup.volumeProfile;
      parsed.tradeSetup.kellySizing = ruleAnalysis.tradeSetup.kellySizing;
      parsed.tradeSetup.anchoredVwap = ruleAnalysis.tradeSetup.anchoredVwap;
      parsed.tradeSetup.cvd = ruleAnalysis.tradeSetup.cvd;
      parsed.tradeSetup.orderBlocks = ruleAnalysis.tradeSetup.orderBlocks;
      parsed.tradeSetup.sessionSweep = ruleAnalysis.tradeSetup.sessionSweep;
      parsed.tradeSetup.fibonacciCluster = ruleAnalysis.tradeSetup.fibonacciCluster;
      parsed.tradeSetup.realizedVolatility = ruleAnalysis.tradeSetup.realizedVolatility;
      parsed.tradeSetup.candleMicrostructure = ruleAnalysis.tradeSetup.candleMicrostructure;
      parsed.tradeSetup.correlationShield = ruleAnalysis.tradeSetup.correlationShield;
      parsed.tradeSetup.fvgMitigation = ruleAnalysis.tradeSetup.fvgMitigation;
      parsed.tradeSetup.marketStructureShift = ruleAnalysis.tradeSetup.marketStructureShift;
      parsed.tradeSetup.premiumDiscount = ruleAnalysis.tradeSetup.premiumDiscount;
      parsed.tradeSetup.keyLevelTargets = ruleAnalysis.tradeSetup.keyLevelTargets;
      parsed.tradeSetup.orderFlowVelocity = ruleAnalysis.tradeSetup.orderFlowVelocity;
      parsed.tradeSetup.breakevenLadder = ruleAnalysis.tradeSetup.breakevenLadder;
      parsed.tradeSetup.liquidityVoid = ruleAnalysis.tradeSetup.liquidityVoid;
      parsed.tradeSetup.fibonacciExtension = ruleAnalysis.tradeSetup.fibonacciExtension;
      parsed.tradeSetup.footprintAbsorption = ruleAnalysis.tradeSetup.footprintAbsorption;
      parsed.tradeSetup.mtfStructureMatrix = ruleAnalysis.tradeSetup.mtfStructureMatrix;
      parsed.tradeSetup.liquidityInducement = ruleAnalysis.tradeSetup.liquidityInducement;
      parsed.tradeSetup.institutionalChoS = ruleAnalysis.tradeSetup.institutionalChoS;
      parsed.tradeSetup.dynamicRiskBracket = ruleAnalysis.tradeSetup.dynamicRiskBracket;
      parsed.tradeSetup.rejectionBlock = ruleAnalysis.tradeSetup.rejectionBlock;
      parsed.tradeSetup.mcpiConviction = ruleAnalysis.tradeSetup.mcpiConviction;
      parsed.tradeSetup.harmonics = ruleAnalysis.tradeSetup.harmonics;
      parsed.tradeSetup.ehlersMESA = ruleAnalysis.tradeSetup.ehlersMESA;
      parsed.tradeSetup.shannonEntropy = ruleAnalysis.tradeSetup.shannonEntropy;
      parsed.tradeSetup.candlestickPatterns = ruleAnalysis.tradeSetup.candlestickPatterns;
      parsed.tradeSetup.milestone50 = ruleAnalysis.tradeSetup.milestone50;
      parsed.tradeSetup.hurstExponent = ruleAnalysis.tradeSetup.hurstExponent;
      parsed.tradeSetup.kalmanFilter = ruleAnalysis.tradeSetup.kalmanFilter;
      parsed.tradeSetup.halfLife = ruleAnalysis.tradeSetup.halfLife;
      parsed.tradeSetup.ttmSqueeze = ruleAnalysis.tradeSetup.ttmSqueeze;
      parsed.tradeSetup.chaikinMoneyFlow = ruleAnalysis.tradeSetup.chaikinMoneyFlow;
      parsed.tradeSetup.kama = ruleAnalysis.tradeSetup.kama;
      parsed.tradeSetup.hma = ruleAnalysis.tradeSetup.hma;
      parsed.tradeSetup.parabolicSAR = ruleAnalysis.tradeSetup.parabolicSAR;
      parsed.tradeSetup.aroon = ruleAnalysis.tradeSetup.aroon;
      parsed.tradeSetup.vortex = ruleAnalysis.tradeSetup.vortex;
      if (ruleAnalysis.tradeSetup.structuralSL) {
        parsed.tradeSetup.stopLoss = ruleAnalysis.tradeSetup.stopLoss;
        parsed.tradeSetup.entryZone = ruleAnalysis.tradeSetup.entryZone;
        parsed.tradeSetup.pendingPrice = ruleAnalysis.tradeSetup.pendingPrice;
        parsed.tradeSetup.takeProfit1 = ruleAnalysis.tradeSetup.takeProfit1;
        parsed.tradeSetup.takeProfit2 = ruleAnalysis.tradeSetup.takeProfit2;
        parsed.tradeSetup.slPips = ruleAnalysis.tradeSetup.slPips;
        parsed.tradeSetup.tp1Pips = ruleAnalysis.tradeSetup.tp1Pips;
        parsed.tradeSetup.tp2Pips = ruleAnalysis.tradeSetup.tp2Pips;
        parsed.tradeSetup.riskRewardRatio = ruleAnalysis.tradeSetup.riskRewardRatio;
      }
    }
    return parsed;
  } catch (err) {
    console.error("Gemini analysis error, falling back to calendar-aware rule engine:", err);
    return ruleAnalysis;
  }
}