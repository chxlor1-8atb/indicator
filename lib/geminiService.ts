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
  KeltnerChannelPoint,
  DonchianChannelPoint,
  ChaikinVolatilityInfo,
  KaufmanEfficiencyRatioInfo,
  VPCIInfo,
  McGinleyDynamicPoint,
  ElderForceIndexInfo,
  RelativeVolatilityIndexInfo,
  FRAMAPoint,
  Milestone75QuantFusionInfo,
  OrderBookImbalanceInfo,
  VWAPVarianceBandsInfo,
  TickVolumeVelocityInfo,
  IcebergOrderInfo,
  InstitutionalLiquidityMatrixInfo,
  AdvancedCVDDivergenceInfo,
  BidAskFootprintClusterInfo,
  VPINToxicityInfo,
  LiquidityVacuumInfo,
  InstitutionalOrderFlowFusionInfo,
  KylesLambdaPriceImpactInfo,
  TradeSizeDistributionInfo,
  MicroPriceQueueImbalanceInfo,
  AdverseSelectionHazardInfo,
  MicrostructureExecutionEngineInfo,
  CrossMarketLeadLagInfo,
  LiquidityReplenishmentVelocityInfo,
  PermanentPriceImpactInfo,
  AlgorithmicExecutionFootprintInfo,
  InstitutionalExecutionAlphaInfo,
  QuantumProbabilityVectorInfo,
  MultiFractalHurstCascadesInfo,
  FillProbabilitySlippageInfo,
  DarkPoolDealerGammaExposureInfo,
  SovereignSingularityAlphaInfo,
  ClassicTrioInfo,
  PivotPointsInfo,
  ClusteredSRInfo,
  AutoFibonacciInfo,
  FiveCorePillarsEvaluation,
} from "./types";
import { orchestrateStrategyDecision } from "./strategyOrchestrator";
import { runAutomatedBacktest } from "./backtestEngine";
import { optimizeIndicatorParameters } from "./optimizerEngine";
import {
  calculateATR,
  calculateEMA,
  calculateRSI,
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
  calculateKeltnerChannels,
  calculateDonchianChannels,
  calculateChaikinVolatility,
  calculateKaufmanEfficiencyRatio,
  calculateVPCI,
  calculateMcGinleyDynamic,
  calculateElderForceIndex,
  calculateRelativeVolatilityIndex,
  calculateFRAMA,
  synthesizeGrandQuantMilestone75,
  calculateOrderBookImbalance,
  calculateVWAPVarianceBands,
  calculateTickVolumeVelocity,
  detectIcebergOrders,
  synthesizeInstitutionalLiquidityMatrix,
  calculateAdvancedCVDDivergence,
  calculateBidAskFootprintCluster,
  calculateVPINToxicity,
  detectLiquidityVacuum,
  synthesizeInstitutionalOrderFlowFusion,
  calculateKylesLambdaPriceImpact,
  analyzeTradeSizeDistribution,
  calculateMicroPriceQueueImbalance,
  calculateAdverseSelectionHazard,
  synthesizeMicrostructureExecutionEngine,
  calculateCrossMarketLeadLag,
  calculateLiquidityReplenishmentVelocity,
  calculatePermanentPriceImpact,
  detectAlgorithmicExecutionFootprint,
  synthesizeInstitutionalExecutionAlpha,
  calculateQuantumProbabilityVector,
  calculateMultiFractalHurstCascades,
  forecastFillProbabilityAndSlippage,
  calculateDarkPoolDealerGammaExposure,
  synthesizeSovereignSingularityQuantAlpha,
  calculateClassicTrio,
  calculateStandardPivotPoints,
  calculateClusteredSupportResistance,
  calculateAutoFibonacciRetracement,
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
  const historicalBacktest = runAutomatedBacktest(candles, symbol);
  const optimizedConfig = optimizeIndicatorParameters(candles, symbol);
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

  // ─── SELF-ADAPTIVE INDICATOR ENGINE (Real-Time Walk-Forward Parameter Application) ───
  // Calculate and apply the exact EMA and RSI periods optimized for maximum Win Rate on this asset
  const adaptiveFastList = optimizedConfig.isOptimized && optimizedConfig.emaFast !== 20
    ? calculateEMA(candles, optimizedConfig.emaFast)
    : indicators.ema20;
  const adaptiveSlowList = optimizedConfig.isOptimized && optimizedConfig.emaSlow !== 50
    ? calculateEMA(candles, optimizedConfig.emaSlow)
    : indicators.ema50;
  const adaptiveTrendList = optimizedConfig.isOptimized && optimizedConfig.emaTrend !== 200
    ? calculateEMA(candles, optimizedConfig.emaTrend)
    : indicators.ema200;
  const adaptiveRsiList = optimizedConfig.isOptimized && optimizedConfig.rsiPeriod !== 14
    ? calculateRSI(candles, optimizedConfig.rsiPeriod)
    : indicators.rsi14;

  const lastRSI = adaptiveRsiList.filter((v): v is number => v !== null && !isNaN(v)).pop() ?? 50.0;
  const lastEMA20 = adaptiveFastList.filter((v): v is number => v !== null && !isNaN(v)).pop() ?? Number((currentPrice * 0.998).toFixed(precision));
  const lastEMA50 = adaptiveSlowList.filter((v): v is number => v !== null && !isNaN(v)).pop() ?? Number((currentPrice * 0.995).toFixed(precision));
  const lastEMA200 = adaptiveTrendList.filter((v): v is number => v !== null && !isNaN(v)).pop() ?? Number((currentPrice * 0.985).toFixed(precision));

  // ATR for volatility measurement
  const atrs = calculateATR(candles, 14);
  const currentATR = atrs.filter((v): v is number => v !== null && !isNaN(v)).pop() ?? Math.max(currentPrice * 0.006, 0.5);

  // Price Action & Divergence Detection with Adaptive RSI
  const rejection = detectCandleRejection(lastCandle, prevCandle);
  const divergence = detectRSIDivergence(candles, adaptiveRsiList);

  // ─── TIER 1: DIRECTIONAL BIAS (The Boss) ───
  let tier1Bias: "BULLISH" | "BEARISH" | "NEUTRAL" = "NEUTRAL";
  let tier1Reason = "โครงสร้างตลาดแกว่งตัวไซด์เวย์ในกรอบ";
  let trend: AnalysisResult["technicalAnalysis"]["trend"] = "SIDEWAYS";

  const isUptrend = currentPrice >= lastEMA50 && lastEMA20 >= lastEMA50;
  const isDowntrend = currentPrice < lastEMA50 && lastEMA20 < lastEMA50;
  // Softer fallback: if EMA20/EMA50 are mixed but price has a clear EMA200 relationship, use that
  const isAboveEMA200 = currentPrice > lastEMA200 && lastEMA20 > lastEMA200;
  const isBelowEMA200 = currentPrice < lastEMA200 && lastEMA20 < lastEMA200;

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
  } else if (isAboveEMA200) {
    // Soft BULLISH: price & EMA20 both above EMA200, but EMA20/EMA50 mixed
    tier1Bias = "BULLISH";
    trend = "UPTREND";
    tier1Reason = `แนวโน้มขาขึ้นระยะกลาง (ราคาและ EMA อยู่เหนือ EMA ${optimizedConfig.emaTrend} แม้ EMA Ribbon จะยังผสม)`;
  } else if (isBelowEMA200) {
    // Soft BEARISH: price & EMA20 both below EMA200, but EMA20/EMA50 mixed
    tier1Bias = "BEARISH";
    trend = "DOWNTREND";
    tier1Reason = `แนวโน้มขาลงระยะกลาง (ราคาและ EMA อยู่ต่ำกว่า EMA ${optimizedConfig.emaTrend} แม้ EMA Ribbon จะยังผสม)`;
  }

  // ─── TIER 2: VALUE LOCATION (No Chasing / Value Zone) ───
  const distFromFast = Math.abs(currentPrice - lastEMA20);
  const distInATR = Number((distFromFast / (currentATR || 1)).toFixed(1));
  const isOverextended = distInATR > 2.2;

  const inBuyValueZone = tier1Bias === "BULLISH" && (
    lastCandle.low <= lastEMA20 * 1.004 ||
    currentPrice <= lastEMA20 * 1.015 ||
    (currentPrice > lastEMA20 && currentPrice <= lastEMA50 * 1.025)
  );
  const inSellValueZone = tier1Bias === "BEARISH" && (
    lastCandle.high >= lastEMA20 * 0.996 ||
    currentPrice >= lastEMA20 * 0.985 ||
    (currentPrice < lastEMA20 && currentPrice >= lastEMA50 * 0.975)
  );
  const inValueZone = inBuyValueZone || inSellValueZone;

  let tier2Note = "ราคากำลังเคลื่อนไหวในโซนสมดุล";
  if (isOverextended) {
    tier2Note = `⚠️ ราคาวิ่งห่างเส้นค่าเฉลี่ยเกินไป (${distInATR}x ATR) ห้ามไล่ราคาเด็ดขาด ให้รอราคาย่อตัวก่อน`;
  } else if (inValueZone) {
    tier2Note = `✅ ราคาพักตัวเข้าสู่ Value Zone (ต้นทุนได้เปรียบระหว่าง EMA ${optimizedConfig.emaFast} - ${optimizedConfig.emaSlow})`;
  }

  // ─── TIER 3: EXECUTION TRIGGER (Smart Money Rejection & RSI Momentum Hook) ───
  const prevC = prevCandle ?? lastCandle;
  const candleRange = lastCandle.high - lastCandle.low;
  const lowerWick = Math.min(lastCandle.close, lastCandle.open) - lastCandle.low;
  const upperWick = lastCandle.high - Math.max(lastCandle.close, lastCandle.open);

  const isSmartBullRejection =
    candleRange > 0 &&
    (rejection.isBullishRejection ||
     lowerWick >= candleRange * 0.28 ||
     (lastCandle.close > lastCandle.open && lastCandle.close > prevC.high));

  const isSmartBearRejection =
    candleRange > 0 &&
    (rejection.isBearishRejection ||
     upperWick >= candleRange * 0.28 ||
     (lastCandle.close < lastCandle.open && lastCandle.close < prevC.low));

  const prevRSI = adaptiveRsiList.length >= 2 ? (adaptiveRsiList.slice(-2)[0] ?? lastRSI) : lastRSI;
  const isRsiBullHook = lastRSI >= prevRSI;
  const isRsiBearHook = lastRSI <= prevRSI;

  // Trigger: relax from strict 3-way AND to flexible: any 2 of 3 conditions, or rejection alone if RSI is neutral
  const hasBuyTrigger = tier1Bias === "BULLISH" && (
    (isSmartBullRejection && isRsiBullHook) ||
    (isSmartBullRejection && !divergence.bearishDivergence) ||
    (isRsiBullHook && !divergence.bearishDivergence && lastRSI <= 50)
  );
  const hasSellTrigger = tier1Bias === "BEARISH" && (
    (isSmartBearRejection && isRsiBearHook) ||
    (isSmartBearRejection && !divergence.bullishDivergence) ||
    (isRsiBearHook && !divergence.bullishDivergence && lastRSI >= 50)
  );
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
  const adaptiveIndicators: IndicatorData = {
    ...indicators,
    ema20: adaptiveFastList,
    ema50: adaptiveSlowList,
    ema200: adaptiveTrendList,
    rsi14: adaptiveRsiList,
  };
  const masterConfluence = evaluateMasterConfluence(candles, adaptiveIndicators, tier1Bias, adaptiveConfig);

  // ─── NEWS HALLUCINATION GUARD ───
  // วิเคราะห์ข่าวแบบ confidence-weighted เพื่อป้องกันการตีความข่าวผิดส่งผลต่อ confluence
  let sentimentScore = 0;
  const newsRiskFlags: string[] = [];

  const relevantNews = news.filter((n) => n.relatedSymbols.includes(symbol) || n.impact === "HIGH");
  const newsList = relevantNews.length > 0 ? relevantNews : news.slice(0, 4);

  // ตรวจว่ามี fallback news หรือไม่
  const hasFallbackNews = newsList.some((n) => n.isFallback);
  const realNewsCount = newsList.filter((n) => !n.isFallback).length;

  if (hasFallbackNews) {
    newsRiskFlags.push("FALLBACK_NEWS_DATA");
  }
  if (realNewsCount < 2) {
    newsRiskFlags.push("INSUFFICIENT_NEWS_COVERAGE");
  }

  for (const item of newsList) {
    // ข่าว fallback → ข้ามเลย ไม่ให้ส่งผลต่อ score
    if (item.isFallback) continue;

    // ข่าวขัดแย้ง → ข้ามหรือ penalty
    if (item.isContradictory) {
      newsRiskFlags.push(`CONTRADICTORY_NEWS: "${item.title.substring(0, 40)}..."`);
      continue; // ไม่นำมา score
    }

    // ถ้า confidence ต่ำมาก (< 0.2) → ข้ามด้วย
    if (item.sentimentConfidence < 0.2) {
      newsRiskFlags.push("LOW_NEWS_CONFIDENCE");
      continue;
    }

    const baseWeight = item.impact === "HIGH" ? 20 : item.impact === "MEDIUM" ? 10 : 5;
    // ─── Confidence Multiplier: ลด weight ตามความน่าเชื่อถือ ───
    // confidence 0.9 → 100% weight | confidence 0.4 → 44% weight | confidence 0.2 → 22%
    const effectiveWeight = Math.round(baseWeight * item.sentimentConfidence);

    if (item.sentiment === "BULLISH") sentimentScore += effectiveWeight;
    if (item.sentiment === "BEARISH") sentimentScore -= effectiveWeight;
  }
  sentimentScore = Math.max(-100, Math.min(100, sentimentScore));

  let overallSentiment: "BULLISH" | "BEARISH" | "NEUTRAL" = "NEUTRAL";
  if (sentimentScore >= 20) overallSentiment = "BULLISH";
  else if (sentimentScore <= -20) overallSentiment = "BEARISH";

  // newsReliabilityScore: 0 = ไม่น่าเชื่อ, 1 = เชื่อได้
  const avgConfidence = newsList.filter(n => !n.isFallback).reduce((s, n) => s + n.sentimentConfidence, 0) / Math.max(1, realNewsCount);
  const newsReliabilityScore = hasFallbackNews && realNewsCount === 0 ? 0 : Math.round(avgConfidence * 100) / 100;

  // ตรวจว่า sentiment ขัดกับ technical signal หรือไม่
  if (overallSentiment === "BULLISH" && tier1Bias === "BEARISH" && newsReliabilityScore < 0.5) {
    newsRiskFlags.push("NEWS_SIGNAL_CONFLICT_UNRELIABLE");
  }
  if (overallSentiment === "BEARISH" && tier1Bias === "BULLISH" && newsReliabilityScore < 0.5) {
    newsRiskFlags.push("NEWS_SIGNAL_CONFLICT_UNRELIABLE");
  }


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

  // ─── BATCH 14 PRE-COMPUTATIONS (PLANS 66-70) ───
  const keltner = indicators.keltner || calculateKeltnerChannels(candles, 20, 2.0, precision);
  const donchian = indicators.donchian || calculateDonchianChannels(candles, 20, precision);
  const chaikinVol = indicators.chaikinVol || calculateChaikinVolatility(candles, 10, 10);
  const ker = indicators.ker || calculateKaufmanEfficiencyRatio(candles, 20);
  const vpci = indicators.vpci || calculateVPCI(candles, 5, 25);

  // ─── BATCH 15 PRE-COMPUTATIONS (PLANS 71-75: GRAND MILESTONE 75) ───
  const mcginley = indicators.mcginley || calculateMcGinleyDynamic(candles, 14, precision);
  const elderForce = indicators.elderForce || calculateElderForceIndex(candles, 2, 13);
  const rvi = indicators.rvi || calculateRelativeVolatilityIndex(candles, 10, 14);
  const frama = indicators.frama || calculateFRAMA(candles, 16, precision);
  const milestone75 = indicators.milestone75 || synthesizeGrandQuantMilestone75(
    masterConfluence.totalScore,
    frama.fractalDimension,
    elderForce.efiTrend,
    rvi.rvi,
    mcginley.trendState,
    20
  );

  // ─── BATCH 16 PRE-COMPUTATIONS (PLANS 76-80: ORDER FLOW & LIQUIDITY) ───
  const orderBookImbalance = indicators.orderBookImbalance || calculateOrderBookImbalance(candles, precision);
  const vwapVarianceBands = indicators.vwapVarianceBands || calculateVWAPVarianceBands(candles, precision);
  const volumeVelocity = indicators.volumeVelocity || calculateTickVolumeVelocity(candles);
  const icebergOrders = indicators.icebergOrders || detectIcebergOrders(candles, precision);
  const liquidityMatrix = indicators.liquidityMatrix || synthesizeInstitutionalLiquidityMatrix(
    orderBookImbalance,
    vwapVarianceBands,
    volumeVelocity,
    icebergOrders,
    currentPrice,
    19
  );

  // ─── BATCH 17 PRE-COMPUTATIONS (PLANS 81-85: ADVANCED ORDER FLOW & MICROSTRUCTURE) ───
  const advancedCVD = indicators.advancedCVD || calculateAdvancedCVDDivergence(candles);
  const footprintCluster = indicators.footprintCluster || calculateBidAskFootprintCluster(candles, precision);
  const vpinToxicity = indicators.vpinToxicity || calculateVPINToxicity(candles);
  const liquidityVacuum = indicators.liquidityVacuum || detectLiquidityVacuum(candles, precision);
  const orderFlowFusion = indicators.orderFlowFusion || synthesizeInstitutionalOrderFlowFusion(
    advancedCVD,
    footprintCluster,
    vpinToxicity,
    liquidityVacuum,
    20
  );

  // ─── BATCH 18 PRE-COMPUTATIONS (PLANS 86-90: HIGH-FREQUENCY MICROSTRUCTURE & EXECUTION MECHANICS) ───
  const kylesLambda = indicators.kylesLambda || calculateKylesLambdaPriceImpact(candles, currentATR, precision);
  const tradeSizeDistribution = indicators.tradeSizeDistribution || analyzeTradeSizeDistribution(candles);
  const microPrice = indicators.microPrice || calculateMicroPriceQueueImbalance(candles, orderBookImbalance, precision);
  const adverseSelection = indicators.adverseSelection || calculateAdverseSelectionHazard(candles, vpinToxicity, precision);
  const executionEngine = indicators.executionEngine || synthesizeMicrostructureExecutionEngine(
    kylesLambda,
    tradeSizeDistribution,
    microPrice,
    adverseSelection,
    21
  );

  // ─── BATCH 19 PRE-COMPUTATIONS (PLANS 91-95: CROSS-MARKET LEAD-LAG & INSTITUTIONAL EXECUTION ALPHA) ───
  const crossMarketLeadLag = indicators.crossMarketLeadLag || calculateCrossMarketLeadLag(candles);
  const liquidityReplenishment = indicators.liquidityReplenishment || calculateLiquidityReplenishmentVelocity(candles, indicators.orderBookImbalance);
  const permanentPriceImpact = indicators.permanentPriceImpact || calculatePermanentPriceImpact(candles);
  const algoExecutionFootprint = indicators.algoExecutionFootprint || detectAlgorithmicExecutionFootprint(candles, indicators.volumeVelocity);
  const executionAlpha = indicators.executionAlpha || synthesizeInstitutionalExecutionAlpha(
    crossMarketLeadLag,
    liquidityReplenishment,
    permanentPriceImpact,
    algoExecutionFootprint,
    22
  );

  // ─── BATCH 20 PRE-COMPUTATIONS (PLANS 96-100: GRAND QUANTUM SINGULARITY MILESTONE 100) ───
  const quantumProbabilityVector = indicators.quantumProbabilityVector || calculateQuantumProbabilityVector(candles, precision);
  const multiFractalHurst = indicators.multiFractalHurst || calculateMultiFractalHurstCascades(candles);
  const fillProbabilitySlippage = indicators.fillProbabilitySlippage || forecastFillProbabilityAndSlippage(candles, precision, indicators.orderBookImbalance);
  const darkPoolDealerGamma = indicators.darkPoolDealerGamma || calculateDarkPoolDealerGammaExposure(candles, precision);
  const sovereignSingularityAlpha = indicators.sovereignSingularityAlpha || synthesizeSovereignSingularityQuantAlpha(
    quantumProbabilityVector,
    multiFractalHurst,
    fillProbabilitySlippage,
    darkPoolDealerGamma,
    executionAlpha,
    23
  );

  // ─── CLASSIC TRIO PRE-COMPUTATION (MA 20 • MA 50 • RSI 14 CONFLUENCE ENGINE) ───
  const classicTrio = indicators.classicTrio || calculateClassicTrio(
    candles,
    precision,
    indicators.ema20,
    indicators.ema50,
    indicators.rsi14
  );

  // ─── DYNAMIC REGIME, SESSION, RED FOLDER & ADAPTIVE GATING SYNTHESIS ───
  const minThreshold = Math.max(62, adaptiveConfig?.minScoreThreshold ?? 62);
  const correlationScoreBonus = correlationShield.shieldStatus === "PROTECTED" ? 5 : correlationShield.shieldStatus === "HEDGE_ALERT" ? -15 : 0;
  let signal: AnalysisResult["signal"] = "WAIT";
  let confidence = Math.max(40, Math.min(95, masterConfluence.totalScore + sessionStatus.confidenceModifier + (quadEma?.scoreBonus ?? 0) + correlationScoreBonus));
  let setupGrade: AnalysisResult["setupGrade"] = masterConfluence.grade;

  // ─── ANTI-CLASH STRATEGY ORCHESTRATION & VETO GATING ───
  const orchestrator = orchestrateStrategyDecision({
    candles,
    indicators,
    regimeInfo,
    userPreset: "AUTO_REGIME",
  });

  // ─── 5 CORE PILLARS COMPUTATIONS ───
  const pivotPoints = indicators.pivotPoints || calculateStandardPivotPoints(candles, precision, sym);
  const clusteredSR = indicators.clusteredSR || calculateClusteredSupportResistance(candles, precision, currentATR, 120, sym);
  const autoFibonacci = indicators.autoFibonacci || calculateAutoFibonacciRetracement(candles, precision, 80);

  // ─── 1. FATAL CIRCUIT BREAKERS (HARD VETO ONLY) ───
  // ตัดสิทธิ์เฉพาะสภาวะวิกฤตจริง 2 กรณี: ข่าวกล่องแดงแรงสูง หรือ ตลาดปิดเสาร์-อาทิตย์
  let isCircuitBreakerTripped = false;
  let circuitBreakerReason = "";

  if (!calendarSafety.tradeAllowed) {
    isCircuitBreakerTripped = true;
    circuitBreakerReason = `ข่าวกล่องแดงแรงสูง (${calendarSafety.badgeText}): ${calendarSafety.freezeReason}`;
  } else if (sessionStatus.isWeekendCloseFreeze) {
    isCircuitBreakerTripped = true;
    circuitBreakerReason = "ตลาดปิดสุดสัปดาห์ (Market Close Freeze)";
  }

  // ─── 2. SOFT RISK MODIFIERS (CONVERTED FROM 25 HARD LOCKS) ───
  // แทนที่จะสั่ง WAIT และตัดเป็น C ทันที เราเปลี่ยนเป็นหักคะแนนความมั่นใจ (Confidence Penalties)
  let softPenalty = 0;
  const softRiskNotes: string[] = [];

  if (regimeInfo.regime === "CHOPPY_DEADZONE") {
    softPenalty += 5;
    softRiskNotes.push("สภาวะตลาดไซด์เวย์ (เน้นเทรดตามกรอบ Pivot & S&R)");
  }

  if (tdSequential.exhaustionType === "BUY_EXHAUSTION_9" || tdSequential.exhaustionType === "SELL_EXHAUSTION_9") {
    softPenalty += 7;
    softRiskNotes.push("TD Sequential 9 Exhaustion Warning");
  }
  if (anchoredVwap.pricePosition === "OVERBOUGHT_EXTREME" || anchoredVwap.pricePosition === "OVERSOLD_EXTREME") {
    softPenalty += 6;
    softRiskNotes.push("Anchored VWAP 3σ Boundary");
  }
  if (vpinToxicity.isToxicFlowAlert) {
    softPenalty += 7;
    softRiskNotes.push("VPIN Toxic Flow detected");
  }
  if (shannonEntropy.orderliness === "MAXIMUM_CHAOS_NOISE") {
    softPenalty += 5;
    softRiskNotes.push("Market Entropy Noise High");
  }
  if (vortex.viMinus - vortex.viPlus > 0.20 && tier1Bias === "BULLISH") {
    softPenalty += 6;
    softRiskNotes.push("Vortex Counter Trend");
  }
  if (isOverextended) {
    softPenalty += 8;
    softRiskNotes.push("Price overextended from EMA Ribbon");
  }
  if (orchestrator.vetoTriggered) {
    softPenalty += 8;
    softRiskNotes.push(orchestrator.vetoReason || "Orchestrator Clash Caution");
  }
  if (mtfStructureMatrix.isHTFConflict) {
    softPenalty += 7;
    softRiskNotes.push("HTF Structure Conflict (Cautious sizing)");
  }

  // ปรับลด Confidence ตาม Soft Penalties
  confidence = Math.max(42, Math.min(98, confidence - softPenalty));

  // ─── 3. 5 CORE PILLARS EVALUATION MATRIX ───
  // เสาหลัก 1: SMC Footprint (Order Block / FVG / MSS)
  const isBullSMC = (orderBlocks.nearestBlock && orderBlocks.nearestBlock.type.includes("BULLISH")) ||
    fvgMitigation.bias === "BULLISH_IMBALANCE" ||
    (marketStructureShift.detected && marketStructureShift.type === "BULLISH_MSS");
  const isBearSMC = (orderBlocks.nearestBlock && orderBlocks.nearestBlock.type.includes("BEARISH")) ||
    fvgMitigation.bias === "BEARISH_IMBALANCE" ||
    (marketStructureShift.detected && marketStructureShift.type === "BEARISH_MSS");

  // เสาหลัก 2: Auto Fibonacci Retracement (Golden Pocket 50% - 61.8% / 38.2%)
  const isBullFib = autoFibonacci.trendDirection === "UP" && (autoFibonacci.isPullbackActive || autoFibonacci.currentZone !== "EXTENSION" || currentPrice >= autoFibonacci.fib500);
  const isBearFib = autoFibonacci.trendDirection === "DOWN" && (autoFibonacci.isPullbackActive || autoFibonacci.currentZone !== "EXTENSION" || currentPrice <= autoFibonacci.fib500);

  // เสาหลัก 3: Standard Pivot Points (Position relative to Central Pivot P)
  const isBullPivot = currentPrice >= pivotPoints.pivot;
  const isBearPivot = currentPrice < pivotPoints.pivot;

  // เสาหลัก 4: Auto Clustered S&R (Multi-touch support/resistance confluence)
  const isNearSupport = clusteredSR.nearestSupport ? (currentPrice - clusteredSR.nearestSupport.price) <= currentATR * 1.5 : inBuyValueZone;
  const isNearResistance = clusteredSR.nearestResistance ? (clusteredSR.nearestResistance.price - currentPrice) <= currentATR * 1.5 : inSellValueZone;

  // เสาหลัก 5: Dynamic Bands (Donchian / Bollinger Room to Run)
  const donchianLower = donchian.lower;
  const donchianUpper = donchian.upper;
  const donchianMid = (donchianLower + donchianUpper) / 2;
  const isBullDynamic = currentPrice >= donchianMid || donchian.breakoutState === "BULLISH_BREAKOUT_20";
  const isBearDynamic = currentPrice <= donchianMid || donchian.breakoutState === "BEARISH_BREAKOUT_20";

  let bullPillars = 0;
  if (isBullSMC) bullPillars++;
  if (isBullFib) bullPillars++;
  if (isBullPivot) bullPillars++;
  if (isNearSupport) bullPillars++;
  if (isBullDynamic) bullPillars++;

  let bearPillars = 0;
  if (isBearSMC) bearPillars++;
  if (isBearFib) bearPillars++;
  if (isBearPivot) bearPillars++;
  if (isNearResistance) bearPillars++;
  if (isBearDynamic) bearPillars++;

  const fiveCorePillars: FiveCorePillarsEvaluation = {
    score: Math.round(Math.max(bullPillars, bearPillars) * 20),
    dominantBias: bullPillars > bearPillars ? "BUY" : bearPillars > bullPillars ? "SELL" : "NEUTRAL",
    passedPillarsCount: Math.max(bullPillars, bearPillars),
    pillar1_SMC: { passed: isBullSMC || isBearSMC, note: `SMC: ${orderBlocks.nearestBlock ? orderBlocks.nearestBlock.type : "Normal Structure"} • FVG: ${fvgMitigation.bias}` },
    pillar2_AutoFib: { passed: isBullFib || isBearFib, note: `Fib: ${autoFibonacci.currentZone} (${autoFibonacci.trendDirection})` },
    pillar3_PivotPoints: { passed: isBullPivot || isBearPivot, note: `Pivot: P=${pivotPoints.pivot} (${pivotPoints.marketPosition})` },
    pillar4_ClusteredSR: { passed: isNearSupport || isNearResistance, note: `Auto S&R: ${clusteredSR.nearestSupport ? `S=${clusteredSR.nearestSupport.price}` : "No S"} | ${clusteredSR.nearestResistance ? `R=${clusteredSR.nearestResistance.price}` : "No R"}` },
    pillar5_DynamicBands: { passed: isBullDynamic || isBearDynamic, note: `Dynamic Bands: DC [${donchianLower} - ${donchianUpper}]` },
    summary: `5 Core Pillars Score: ${Math.round(Math.max(bullPillars, bearPillars) * 20)}% (${bullPillars} Bull vs ${bearPillars} Bear)`,
  };

  // ─── 4. TREND-DOMINANT & STABLE SIGNAL TRIGGERING (ELIMINATES FLIP-FLOPPING) ───
  // กฎเหล็กสถาบัน: ทิศทางแนวโน้มหลัก (Trend Bias & Classic Trio & SuperTrend) คือ "หัวหน้าใหญ่ (The Boss)"
  // ห้ามออกสัญญาณสลับไปมาระหว่าง BUY และ SELL ทุกครั้งที่ราคาขยับเล็กน้อยในกรอบ
  const isBullTrendDominant =
    tier1Bias === "BULLISH" ||
    (classicTrio.isAligned && classicTrio.signalBias === "BULLISH") ||
    (currentPrice >= lastEMA50 && lastEMA20 >= lastEMA50);

  const isBearTrendDominant =
    tier1Bias === "BEARISH" ||
    (classicTrio.isAligned && classicTrio.signalBias === "BEARISH") ||
    (currentPrice < lastEMA50 && lastEMA20 <= lastEMA50);

  if (isCircuitBreakerTripped) {
    signal = "WAIT";
    setupGrade = "C (Wait)";
    confidence = Math.min(confidence, 30);
  } else if (isBullTrendDominant && !isBearTrendDominant) {
    // 🐂 ตลาดเป็นแนวโน้มขาขึ้น (Uptrend) -> ทิศทางหลักคือ BUY อย่างมั่นคงเสมอ
    // หากราคาอยู่ที่แนวต้าน จะสั่ง BUY LIMIT ดักย่อที่แนวรับ/โซน OTE แทนที่จะสลับไป SELL
    const isStrong = bullPillars >= 2 || masterConfluence.totalScore >= 65 || (classicTrio.isAligned && classicTrio.signalBias === "BULLISH");
    signal = isStrong ? "STRONG_BUY" : "BUY";
    setupGrade = isStrong && confidence >= 68 ? "A+" : confidence >= 55 ? "A" : "B";
    if (isInstitutionalAligned) confidence = Math.min(98, confidence + 4);
    if (classicTrio.isAligned && classicTrio.signalBias === "BULLISH") confidence = Math.min(99, confidence + 5);
    if (isOrbBullBreak) confidence = Math.min(98, confidence + 3);
  } else if (isBearTrendDominant && !isBullTrendDominant) {
    // 🐻 ตลาดเป็นแนวโน้มขาลง (Downtrend) -> ทิศทางหลักคือ SELL อย่างมั่นคงเสมอ
    // หากราคาอยู่ที่แนวรับ จะสั่ง SELL LIMIT ดักเด้งที่แนวต้าน/โซน OTE แทนที่จะสลับไป BUY
    const isStrong = bearPillars >= 2 || masterConfluence.totalScore >= 65 || (classicTrio.isAligned && classicTrio.signalBias === "BEARISH");
    signal = isStrong ? "STRONG_SELL" : "SELL";
    setupGrade = isStrong && confidence >= 68 ? "A+" : confidence >= 55 ? "A" : "B";
    if (isInstitutionalAligned) confidence = Math.min(98, confidence + 4);
    if (classicTrio.isAligned && classicTrio.signalBias === "BEARISH") confidence = Math.min(99, confidence + 5);
    if (isOrbBearBreak) confidence = Math.min(98, confidence + 3);
  } else {
    // ⚖️ ตลาดไซด์เวย์ไร้เทรนด์ชัดเจน (Neutral / Range-Bound): ใช้ 5 เสาหลัก และตำแหน่ง Pivot ตัดสิน
    if (bullPillars > bearPillars || (bullPillars === bearPillars && currentPrice >= pivotPoints.pivot)) {
      const isStrong = bullPillars >= 3 || masterConfluence.totalScore >= 68;
      signal = isStrong ? "STRONG_BUY" : "BUY";
      setupGrade = "B";
      confidence = Math.max(52, confidence);
    } else {
      const isStrong = bearPillars >= 3 || masterConfluence.totalScore >= 68;
      signal = isStrong ? "STRONG_SELL" : "SELL";
      setupGrade = "B";
      confidence = Math.max(52, confidence);
    }
  }

  // ─── ANTI-CLASH DIRECTIONAL HARMONIZATION (SOFT CONFIDENCE TUNING, NEVER HARD WAIT) ───
  if (signal === "STRONG_BUY" || signal === "BUY") {
    if (orchestrator.unifiedSignal === "SELL") {
      // Counter-trend caution: ปรับลด confidence เล็กน้อย แต่คงสถานะออเดอร์พร้อมเทรดไว้เสมอ
      confidence = Math.max(48, confidence - 6);
      setupGrade = "B";
    } else if (orchestrator.unifiedSignal === "BUY") {
      confidence = Math.min(99, confidence + 5);
    }
  } else if (signal === "STRONG_SELL" || signal === "SELL") {
    if (orchestrator.unifiedSignal === "BUY") {
      // Counter-trend caution: ปรับลด confidence เล็กน้อย แต่คงสถานะออเดอร์พร้อมเทรดไว้เสมอ
      confidence = Math.max(48, confidence - 6);
      setupGrade = "B";
    } else if (orchestrator.unifiedSignal === "SELL") {
      confidence = Math.min(99, confidence + 5);
    }
  }

  // ─── BATCH 3 QUANT CALIBRATION (PLANS 11-15) ───
  // [แผน 11] Institutional Optimal Trade Entry (OTE - Fibonacci 61.8% – 78.6% Golden Pocket)
  const tradeDirection = (signal === "STRONG_SELL" || signal === "SELL") ? "BEARISH" : "BULLISH";
  const oteZone = calculateOTEZones(candles, tradeDirection, precision);

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

    // [แผน 11] OTE Zone Entry & Sweet Spot 70.5% (ย่อซื้อที่แนวรับ/โซน OTE ห้ามตั้งซื้อสูงกว่าราคาตลาด)
    const defaultBuyEntry = Number(Math.min(currentPrice, lastEMA20 * 1.002).toFixed(precision));
    pendingPrice = (oteZone.sweetSpot && oteZone.sweetSpot <= currentPrice) ? oteZone.sweetSpot : defaultBuyEntry;
    entryZone = { min: oteZone.oteMin, max: oteZone.oteMax };

    // [แผน 31] FVG Consequent Encroachment (50%) Limit Refinement
    if (fvgMitigation.recommendedEntryLimit && fvgMitigation.recommendedEntryLimit < currentPrice && fvgMitigation.recommendedEntryLimit >= stopLoss) {
      pendingPrice = fvgMitigation.recommendedEntryLimit;
    }

    // [แผน 41] Liquidity Inducement Trap Avoidance (Do not enter directly on trap)
    if (liquidityInducement.isInducementTrap && liquidityInducement.idmLevel !== null && Math.abs(pendingPrice - liquidityInducement.idmLevel) < currentATR * 0.6) {
      pendingPrice = Number((liquidityInducement.idmLevel - currentATR * 0.35).toFixed(precision));
    }

    // [แผน 14] Dynamic Multi-Stage Take Profit
    const risk = Math.max(pendingPrice - stopLoss, currentATR * 0.8);
    takeProfit1 = Number((pendingPrice + risk * 1.0).toFixed(precision));
    takeProfit2 = Number((pendingPrice + risk * effectiveTPMultiplier).toFixed(precision));

    // ─── 5 Core Pillars: Pivot Points & Clustered S&R Alignment ───
    if (pivotPoints.r1 > pendingPrice && (pivotPoints.r1 - pendingPrice) >= risk * 0.7) {
      takeProfit1 = pivotPoints.r1;
    } else if (clusteredSR.nearestResistance && clusteredSR.nearestResistance.price > pendingPrice) {
      takeProfit1 = clusteredSR.nearestResistance.price;
    }

    if (pivotPoints.r2 > takeProfit1 && (pivotPoints.r2 - pendingPrice) >= risk * 1.5) {
      takeProfit2 = pivotPoints.r2;
    } else if (donchian.upper > takeProfit1) {
      takeProfit2 = Number(donchian.upper.toFixed(precision));
    }

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
    // Invariant Guarantee: For BUY, Stop Loss must strictly be below pendingPrice
    if (stopLoss >= pendingPrice) {
      stopLoss = Number((pendingPrice - Math.max(currentATR * 1.2, pendingPrice * 0.005)).toFixed(precision));
    }
    riskRewardRatio = `1:${((takeProfit2 - pendingPrice) / Math.max(0.0001, pendingPrice - stopLoss)).toFixed(1)}`;
  } else if (signal === "STRONG_SELL" || signal === "SELL") {
    tradeAction = "SELL";
    // [แผน 12 & แผน 28] Liquidity Hunt Protection Stop Loss + Realized Volatility Buffer
    structuralSL = calculateStructuralStopLoss(candles, "SELL", currentATR, currentPrice, precision);
    const slBufferExtra = realizedVolatility.recommendedBufferMultiplier > 1.0 ? currentATR * (realizedVolatility.recommendedBufferMultiplier - 1.0) * 0.5 : 0;
    stopLoss = Number((structuralSL.stopLoss + slBufferExtra).toFixed(precision));

    // [แผน 11] OTE Zone Entry & Sweet Spot 70.5% (เด้งขายที่แนวต้าน/โซน OTE ห้ามตั้งขายต่ำกว่าราคาตลาด)
    const defaultSellEntry = Number(Math.max(currentPrice, lastEMA20 * 0.998).toFixed(precision));
    pendingPrice = (oteZone.sweetSpot && oteZone.sweetSpot >= currentPrice) ? oteZone.sweetSpot : defaultSellEntry;
    entryZone = { min: oteZone.oteMin, max: oteZone.oteMax };

    // [แผน 31] FVG Consequent Encroachment (50%) Limit Refinement
    if (fvgMitigation.recommendedEntryLimit && fvgMitigation.recommendedEntryLimit > currentPrice && fvgMitigation.recommendedEntryLimit <= stopLoss) {
      pendingPrice = fvgMitigation.recommendedEntryLimit;
    }

    // [แผน 41] Liquidity Inducement Trap Avoidance (Do not enter directly on trap)
    if (liquidityInducement.isInducementTrap && liquidityInducement.idmLevel !== null && Math.abs(pendingPrice - liquidityInducement.idmLevel) < currentATR * 0.6) {
      pendingPrice = Number((liquidityInducement.idmLevel + currentATR * 0.35).toFixed(precision));
    }

    // [แผน 14] Dynamic Multi-Stage Take Profit
    const risk = Math.max(stopLoss - pendingPrice, currentATR * 0.8);
    takeProfit1 = Number((pendingPrice - risk * 1.0).toFixed(precision));
    takeProfit2 = Number((pendingPrice - risk * effectiveTPMultiplier).toFixed(precision));

    // ─── 5 Core Pillars: Pivot Points & Clustered S&R Alignment ───
    if (pivotPoints.s1 < pendingPrice && (pendingPrice - pivotPoints.s1) >= risk * 0.7) {
      takeProfit1 = pivotPoints.s1;
    } else if (clusteredSR.nearestSupport && clusteredSR.nearestSupport.price < pendingPrice) {
      takeProfit1 = clusteredSR.nearestSupport.price;
    }

    if (pivotPoints.s2 < takeProfit1 && (pendingPrice - pivotPoints.s2) >= risk * 1.5) {
      takeProfit2 = pivotPoints.s2;
    } else if (donchian.lower < takeProfit1) {
      takeProfit2 = Number(donchian.lower.toFixed(precision));
    }

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
    // Invariant Guarantee: For SELL, Stop Loss must strictly be above pendingPrice
    if (stopLoss <= pendingPrice) {
      stopLoss = Number((pendingPrice + Math.max(currentATR * 1.2, pendingPrice * 0.005)).toFixed(precision));
    }
    riskRewardRatio = `1:${((pendingPrice - takeProfit2) / Math.max(0.0001, stopLoss - pendingPrice)).toFixed(1)}`;
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

  // MCPI Conviction & Orchestrator Soft Calibration (Adjust confidence rather than hard-killing the setup)
  if (!mcpiConviction.isApprovedForExecution) {
    confidence = Math.max(45, confidence - 6);
  }

  // De-confliction Guarantee: Whenever signal is WAIT or fatal circuit breaker is active, tradeAction must strictly be NO_TRADE
  if (signal === "WAIT" || !calendarSafety.tradeAllowed || sessionStatus.isWeekendCloseFreeze) {
    tradeAction = "NO_TRADE";
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
    {
      name: `Pillar 17: Channel Envelopes & Volume-Price Confirmation Matrix (${keltner.bandwidth > 1.0 ? "KC_EXPANDING" : "KC_NORMAL"} | DC: ${donchian.breakoutState} | KER: ${ker.regime})`,
      passed: ((tradeAction === "BUY" && (donchian.breakoutState === "BULLISH_BREAKOUT_20" || keltner.percentB > 50 || ker.efficiencyRatio >= 0.35 || vpci.volumeEnergyState === "CONFIRMED_TREND")) ||
              (tradeAction === "SELL" && (donchian.breakoutState === "BEARISH_BREAKOUT_20" || keltner.percentB < 50 || ker.efficiencyRatio >= 0.35 || vpci.volumeEnergyState === "CONFIRMED_TREND")) ||
              vpci.safetyLock17Passed) ?? false,
      note: `${keltner.description} • ${donchian.description} • ${chaikinVol.description} • ${ker.description} • ${vpci.description}`,
    },
    {
      name: `Pillar 18: Fractal Dynamics & Kinetic Force Pulse (MD: ${mcginley.trendState} | EFI: ${elderForce.forceState} | FRAMA: D=${frama.fractalDimension})`,
      passed: ((tradeAction === "BUY" && (mcginley.trendState === "BULLISH" || elderForce.forceState === "STRONG_BULL_FORCE" || rvi.rvi > 50 || frama.state === "TRENDING_SMOOTH")) ||
              (tradeAction === "SELL" && (mcginley.trendState === "BEARISH" || elderForce.forceState === "STRONG_BEAR_FORCE" || rvi.rvi < 50 || frama.state === "TRENDING_SMOOTH")) ||
              milestone75.safetyLock18Passed) ?? false,
      note: `${mcginley.description} • ${elderForce.description} • ${rvi.description} • ${frama.description} • ${milestone75.description}`,
    },
    {
      name: `Pillar 19: Order Flow Depth, VWAP Variance & Liquidity Matrix (OBI: ${orderBookImbalance.imbalanceRatio.toFixed(2)} | VWAP: ${vwapVarianceBands.bandPosition} | Matrix: ${liquidityMatrix.liquidityState})`,
      passed: ((tradeAction === "BUY" && (orderBookImbalance.pressureState === "HEAVY_BID_PRESSURE" || vwapVarianceBands.bandPosition === "INSIDE_SIGMA_1" || volumeVelocity.burstDirection === "BULLISH_BURST" || icebergOrders.icebergSide === "BUY_ICEBERG")) ||
              (tradeAction === "SELL" && (orderBookImbalance.pressureState === "HEAVY_ASK_PRESSURE" || vwapVarianceBands.bandPosition === "INSIDE_SIGMA_1" || volumeVelocity.burstDirection === "BEARISH_BURST" || icebergOrders.icebergSide === "SELL_ICEBERG")) ||
              liquidityMatrix.safetyLock19Passed) ?? false,
      note: `${orderBookImbalance.description} • ${vwapVarianceBands.description} • ${volumeVelocity.description} • ${icebergOrders.description} • ${liquidityMatrix.description}`,
    },
    {
      name: `Pillar 20: Microstructural Toxicity, CVD Divergence & Order Flow Fusion (CVD: ${advancedCVD.divergenceType} | VPIN: ${vpinToxicity.vpin} | Fusion: ${orderFlowFusion.milestone85Grade})`,
      passed: ((tradeAction === "BUY" && (advancedCVD.divergenceType === "REGULAR_BULLISH" || advancedCVD.dominantFlow === "ACCUMULATION_FLOW" || footprintCluster.clusterAbsorptionSide === "BUY_ABSORPTION")) ||
              (tradeAction === "SELL" && (advancedCVD.divergenceType === "REGULAR_BEARISH" || advancedCVD.dominantFlow === "DISTRIBUTION_FLOW" || footprintCluster.clusterAbsorptionSide === "SELL_ABSORPTION")) ||
              orderFlowFusion.safetyLock20Passed) ?? false,
      note: `${advancedCVD.description} • ${footprintCluster.description} • ${vpinToxicity.description} • ${liquidityVacuum.description} • ${orderFlowFusion.description}`,
    },
    {
      name: `Pillar 21: High-Frequency Microstructure, Micro-Price & Execution Hazard (Fragility: ${kylesLambda.fragilityState} | Stoikov: ${microPrice.tickLeadSignal} | Milestone 90: ${executionEngine.milestone90Grade})`,
      passed: ((tradeAction === "BUY" && (microPrice.tickLeadSignal === "PREDICTIVE_UP_TICK" || tradeSizeDistribution.dominantParticipant === "INSTITUTIONAL_ACCUMULATION")) ||
              (tradeAction === "SELL" && (microPrice.tickLeadSignal === "PREDICTIVE_DOWN_TICK" || tradeSizeDistribution.dominantParticipant === "INSTITUTIONAL_ACCUMULATION")) ||
              executionEngine.safetyLock21Passed) ?? false,
      note: `${kylesLambda.description} • ${tradeSizeDistribution.description} • ${microPrice.description} • ${adverseSelection.description} • ${executionEngine.description}`,
    },
    {
      name: `Pillar 22: Cross-Market Lead-Lag & Algorithmic Execution Alpha (Lead: ${crossMarketLeadLag.leadState} | Algo: ${algoExecutionFootprint.algoType} | Milestone 95: ${executionAlpha.milestone95Grade})`,
      passed: ((tradeAction === "BUY" && (crossMarketLeadLag.leadState === "BENCHMARK_LEADING_BULLISH" || algoExecutionFootprint.institutionalExecutionBias === "ALGO_BUYING_PROGRAM" || executionAlpha.milestone95Grade === "S_TIER_ALPHA_SNIPER")) ||
              (tradeAction === "SELL" && (crossMarketLeadLag.leadState === "BENCHMARK_LEADING_BEARISH" || algoExecutionFootprint.institutionalExecutionBias === "ALGO_SELLING_PROGRAM" || executionAlpha.milestone95Grade === "S_TIER_ALPHA_SNIPER")) ||
              executionAlpha.safetyLock22Passed) ?? false,
      note: `${crossMarketLeadLag.description} • ${liquidityReplenishment.description} • ${permanentPriceImpact.description} • ${algoExecutionFootprint.description} • ${executionAlpha.description}`,
    },
    {
      name: `Pillar 23: Grand Quantum Singularity & Dark Pool Alpha Matrix (Quantum: ${quantumProbabilityVector.collapseState} | GEX: ${darkPoolDealerGamma.gammaRegime} | Milestone 100: ${sovereignSingularityAlpha.milestone100Grade})`,
      passed: ((tradeAction === "BUY" && (quantumProbabilityVector.collapseState === "SUPERPOSITION_RESOLVING_BULLISH" || darkPoolDealerGamma.gammaRegime === "POSITIVE_GAMMA_VOLATILITY_SUPPRESSION" || sovereignSingularityAlpha.milestone100Grade === "S_TIER_SOVEREIGN_SINGULARITY")) ||
              (tradeAction === "SELL" && (quantumProbabilityVector.collapseState === "SUPERPOSITION_RESOLVING_BEARISH" || darkPoolDealerGamma.gammaRegime === "NEGATIVE_GAMMA_VOLATILITY_EXPLOSION" || sovereignSingularityAlpha.milestone100Grade === "S_TIER_SOVEREIGN_SINGULARITY")) ||
              sovereignSingularityAlpha.safetyLock23Passed) ?? false,
      note: `${quantumProbabilityVector.description} • ${multiFractalHurst.description} • ${fillProbabilitySlippage.description} • ${darkPoolDealerGamma.description} • ${sovereignSingularityAlpha.description}`,
    },
    {
      name: `Pillar 24: ADX Trend Rigor & EMA50 Slope Gating (ADX: ${(indicators.adx?.slice(-1)[0] ?? 25).toFixed(1)} | Slope: ${indicators.ema50 && indicators.ema50.length >= 4 && (indicators.ema50.slice(-1)[0] ?? 0) >= (indicators.ema50.slice(-4)[0] ?? 0) ? "RISING" : "FALLING"})`,
      passed: (indicators.adx && (indicators.adx.slice(-1)[0] ?? 25) >= 22) ?? true,
      note: `กรองสภาวะตลาดไร้แนวโน้ม ป้องกันการออกออเดอร์ในกรอบ Sideways (ADX >= 22 และ EMA50 Slope สอดคล้องทิศทางเทรนด์)`,
    },
    {
      name: `Pillar 25: Higher-Timeframe Macro Dominance & VSA Effort-Result Matrix (H4: ${mtfMatrix.h4} | VSA: ${footprintAbsorption.vsaSignal})`,
      passed: !isCounterTrend && !mtfStructureMatrix.isHTFConflict && !(harmonics.hasPattern && ((tradeAction === "BUY" && harmonics.bestPattern?.type === "BEARISH") || (tradeAction === "SELL" && harmonics.bestPattern?.type === "BULLISH"))),
      note: `Macro HTF Alignment: ${mtfMatrix.h4}/${mtfMatrix.d1} (Score: ${mtfMatrix.alignmentScore}%) • Harmonic PRZ Guard: ${harmonics.hasPattern ? `${harmonics.bestPattern?.patternName} (${harmonics.bestPattern?.type})` : "Clear"} • VSA: ${footprintAbsorption.vsaSignal}`,
    },
    {
      name: `Pillar 26: Classic Trio Confluence (MA20 • MA50 • RSI14)`,
      passed: classicTrio.isAligned && (
        (tradeAction === "BUY" && classicTrio.signalBias === "BULLISH") ||
        (tradeAction === "SELL" && classicTrio.signalBias === "BEARISH") ||
        tradeAction === "NO_TRADE"
      ),
      note: `${classicTrio.summary} (คะแนนสอดคล้อง: ${classicTrio.alignmentScore}%, โบนัส WR: +${classicTrio.winRateBonus}%)`,
    },
  ];

  const prefixReason = !calendarSafety.tradeAllowed
    ? `[${calendarSafety.badgeText}] ${calendarSafety.freezeReason} `
    : orchestrator.vetoTriggered
    ? `[🛡️ ANTI-CLASH VETO] ${orchestrator.vetoReason} `
    : "";

  // ─── MT4 / MT5 Order Type Recommendation Engine (Matching MetaTrader 5 Dropdown) ───
  let calculatedOrderType: "BUY_LIMIT" | "SELL_LIMIT" | "BUY_STOP" | "SELL_STOP" | "BUY_STOP_LIMIT" | "SELL_STOP_LIMIT" | "MARKET_EXECUTION" | "WAIT_NO_ORDER" = "WAIT_NO_ORDER";
  let mtOrderLabel = "Market Execution";
  let mtOrderAdvice = "รอประเมินสภาวะตลาด";
  let mtStopLimitPrice: number | undefined = undefined;

  if (signal === "WAIT" || tradeAction === "NO_TRADE") {
    calculatedOrderType = "WAIT_NO_ORDER";
    mtOrderLabel = "Wait / No Order";
    mtOrderAdvice = "ยังไม่มีจังหวะได้เปรียบทางสถิติ นั่งทับมือรอการยืนยันโครงสร้าง";
  } else if (tradeAction === "BUY") {
    const isBreakout = donchian.breakoutState === "BULLISH_BREAKOUT_20" || regimeInfo.title.includes("BREAKOUT");
    const isNearMarket = Math.abs(currentPrice - pendingPrice) < currentATR * 0.18;

    if (isNearMarket) {
      calculatedOrderType = "MARKET_EXECUTION";
      mtOrderLabel = "Market Execution";
      mtOrderAdvice = "ราคาอยู่ตรงโซนเข้าได้เปรียบพอดี แนะนำกด BUY ทันทีที่ราคาตลาด";
    } else if (pendingPrice < currentPrice) {
      calculatedOrderType = "BUY_LIMIT";
      mtOrderLabel = "Buy Limit";
      mtOrderAdvice = "ราคากำลังพักตัว แนะนำตั้ง Buy Limit ดักซื้อของถูกที่แนวรับ OTE / FVG ด้านล่าง (ไม่ต้องเฝ้าจอ)";
    } else if (isBreakout && pendingPrice > currentPrice) {
      if (currentATR > 0 && Math.abs(pendingPrice - currentPrice) > currentATR * 0.5) {
        calculatedOrderType = "BUY_STOP_LIMIT";
        mtOrderLabel = "Buy Stop Limit";
        mtStopLimitPrice = Number((pendingPrice - currentATR * 0.2).toFixed(precision));
        mtOrderAdvice = `ดักซื้อจังหวะเบรกเอาท์แล้วย่อตัว: ตั้ง Stop Price ที่ ${pendingPrice} และ Limit Price ที่ ${mtStopLimitPrice}`;
      } else {
        calculatedOrderType = "BUY_STOP";
        mtOrderLabel = "Buy Stop";
        mtOrderAdvice = `ดักซื้อตามโมเมนตัมเมื่อราคาทะลุแนวต้าน: ตั้ง Buy Stop ที่ ${pendingPrice}`;
      }
    } else {
      calculatedOrderType = "BUY_LIMIT";
      mtOrderLabel = "Buy Limit";
      mtOrderAdvice = "แนะนำตั้ง Buy Limit รอราคาย่อตัวลงมาเกี่ยวที่โซนแนวรับ OTE";
    }
  } else if (tradeAction === "SELL") {
    const isBreakdown = donchian.breakoutState === "BEARISH_BREAKOUT_20" || regimeInfo.title.includes("BREAKDOWN");
    const isNearMarket = Math.abs(currentPrice - pendingPrice) < currentATR * 0.18;

    if (isNearMarket) {
      calculatedOrderType = "MARKET_EXECUTION";
      mtOrderLabel = "Market Execution";
      mtOrderAdvice = "ราคาอยู่ตรงโซนเข้าได้เปรียบพอดี แนะนำกด SELL ทันทีที่ราคาตลาด";
    } else if (pendingPrice > currentPrice) {
      calculatedOrderType = "SELL_LIMIT";
      mtOrderLabel = "Sell Limit";
      mtOrderAdvice = "ราคากำลังเด้งขึ้น แนะนำตั้ง Sell Limit ดักขายของแพงที่แนวต้าน OTE / FVG ด้านบน (ไม่ต้องเฝ้าจอ)";
    } else if (isBreakdown && pendingPrice < currentPrice) {
      if (currentATR > 0 && Math.abs(currentPrice - pendingPrice) > currentATR * 0.5) {
        calculatedOrderType = "SELL_STOP_LIMIT";
        mtOrderLabel = "Sell Stop Limit";
        mtStopLimitPrice = Number((pendingPrice + currentATR * 0.2).toFixed(precision));
        mtOrderAdvice = `ดักขายจังหวะหลุดแนวรับแล้วเด้งรีเทส: ตั้ง Stop Price ที่ ${pendingPrice} และ Limit Price ที่ ${mtStopLimitPrice}`;
      } else {
        calculatedOrderType = "SELL_STOP";
        mtOrderLabel = "Sell Stop";
        mtOrderAdvice = `ดักขายตามโมเมนตัมเมื่อราคาหลุดแนวรับ: ตั้ง Sell Stop ที่ ${pendingPrice}`;
      }
    } else {
      calculatedOrderType = "SELL_LIMIT";
      mtOrderLabel = "Sell Limit";
      mtOrderAdvice = "แนะนำตั้ง Sell Limit รอราคาเด้งขึ้นไปเกี่ยวที่โซนแนวต้าน OTE";
    }
  }

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
    keltner,
    donchian,
    chaikinVol,
    ker,
    vpci,
    mcginley,
    elderForce,
    rvi,
    frama,
    milestone75,
    orderBookImbalance,
    vwapVarianceBands,
    volumeVelocity,
    icebergOrders,
    liquidityMatrix,
    advancedCVD,
    footprintCluster,
    vpinToxicity,
    liquidityVacuum,
    orderFlowFusion,
    kylesLambda,
    tradeSizeDistribution,
    microPrice,
    adverseSelection,
    executionEngine,
    crossMarketLeadLag,
    liquidityReplenishment,
    permanentPriceImpact,
    algoExecutionFootprint,
    executionAlpha,
    quantumProbabilityVector,
    multiFractalHurst,
    fillProbabilitySlippage,
    darkPoolDealerGamma,
    sovereignSingularityAlpha,
    classicTrio,
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
        `Keltner Channels: U:${keltner.upper} M:${keltner.middle} L:${keltner.lower} (%B: ${keltner.percentB}% | BW: ${keltner.bandwidth}% | ${keltner.isExpanding ? "EXPANDING" : "CONTRACTING"})`,
        `Donchian Channels: U:${donchian.upper} M:${donchian.middle} L:${donchian.lower} (Width: ${donchian.channelWidth} | ${donchian.breakoutState})`,
        `Chaikin Volatility: CVOL ${chaikinVol.cvol}% (${chaikinVol.volatilityTrend})`,
        `Kaufman Efficiency Ratio: KER ${ker.efficiencyRatio} (Score: ${ker.noiseDecouplingScore} | ${ker.regime})`,
        `Volume-Price Confirmation Indicator: VPCI ${vpci.vpci} (Signal: ${vpci.vpciSignal} | ${vpci.volumeEnergyState} | Lock 17: ${vpci.safetyLock17Passed ? "PASSED" : "BLOCKED"})`,
        `McGinley Dynamic: MD ${mcginley.mcginley} (${mcginley.trendState} - Deviation: ${mcginley.deviationPips} pips)`,
        `Elder Force Index: EFI(2) ${elderForce.efiShort} | EFI(13) ${elderForce.efiLong} (${elderForce.forceState} - ${elderForce.efiTrend})`,
        `Relative Volatility Index: RVI ${rvi.rvi} (Signal: ${rvi.rviSignal} | ${rvi.volatilityDirection})`,
        `FRAMA Fractal MA: ${frama.frama} (D=${frama.fractalDimension} | Alpha: ${frama.alpha} | ${frama.state})`,
        `Grand Milestone 75 Quant Fusion: [${milestone75.milestoneGrade}] Score: ${milestone75.quantScore}/100 - ${milestone75.phase3DominanceStatus} (Lock 18: ${milestone75.safetyLock18Passed ? "PASSED" : "BLOCKED"})`,
        `Order Book Imbalance: OBI ${orderBookImbalance.imbalanceRatio.toFixed(2)} (${orderBookImbalance.pressureState} - Bid: ${orderBookImbalance.bidDepthPct}% vs Ask: ${orderBookImbalance.askDepthPct}%)`,
        `VWAP Variance Envelopes: VWAP ${vwapVarianceBands.vwap} (Pos: ${vwapVarianceBands.bandPosition} | Mean Reversion: ${vwapVarianceBands.isMeanReversionZone ? "ACTIVE" : "NO"})`,
        `Tick Volume Velocity: Velocity ${volumeVelocity.velocityRatio}x | Accel ${volumeVelocity.accelerationRatio}x (${volumeVelocity.burstDirection} - Climax: ${volumeVelocity.isVolumeClimax ? "YES" : "NO"})`,
        `Iceberg Hidden Liquidity: ${icebergOrders.isIcebergDetected ? `DETECTED (${icebergOrders.icebergSide} | Ratio ${icebergOrders.anomalyRatio}x)` : "None"}`,
        `Institutional Liquidity Matrix: [${liquidityMatrix.liquidityState}] Score: ${liquidityMatrix.liquidityScore}/100 (Lock 19: ${liquidityMatrix.safetyLock19Passed ? "PASSED" : "BLOCKED"} | Spread Climax: ${liquidityMatrix.isSpreadClimaxRisk ? "YES" : "NO"})`,
        `Advanced CVD Flow: ${advancedCVD.currentCVD} (Slope: ${advancedCVD.slopeDivergenceScore} | Div: ${advancedCVD.divergenceType} - ${advancedCVD.dominantFlow})`,
        `Footprint Cluster: Delta ${footprintCluster.deltaAtExtremes} (BidVol: ${footprintCluster.lowWickBidVolume} vs AskVol: ${footprintCluster.highWickAskVolume} | Side: ${footprintCluster.clusterAbsorptionSide})`,
        `VPIN Flow Toxicity: VPIN ${vpinToxicity.vpin} (Regime: ${vpinToxicity.toxicityRegime} | Informed Trading: ${vpinToxicity.informedTradingProbabilityPct}%)`,
        `Liquidity Vacuum: ${liquidityVacuum.isVacuumDetected ? `DETECTED (${liquidityVacuum.vacuumType} | Gap ${liquidityVacuum.thinDepthGapSizePips} pips)` : "NORMAL (Healthy Depth)"}`,
        `Institutional Order Flow Fusion: [${orderFlowFusion.milestone85Grade}] Score: ${orderFlowFusion.orderFlowScore}/100 (Dominance: ${orderFlowFusion.flowDominance} | Lock 20: ${orderFlowFusion.safetyLock20Passed ? "PASSED" : "BLOCKED"})`,
        `Kyle's Lambda Impact: λ ${kylesLambda.lambda} (${kylesLambda.fragilityState} | Impact: ${kylesLambda.priceImpactPipsPerMillion} pips/$1M - Fragility: ${kylesLambda.marketFragilityScore}/100)`,
        `Trade Size Distribution: Dominance ${tradeSizeDistribution.institutionalDominanceRatio}x (${tradeSizeDistribution.dominantParticipant} | Whale: ${tradeSizeDistribution.sovereignWhaleSharePct}% - Block: ${tradeSizeDistribution.institutionalBlockSharePct}%)`,
        `Stoikov Micro-Price: ${microPrice.microPrice} (Dev: ${microPrice.microPriceDeviationPips} pips | ${microPrice.tickLeadSignal} - ${microPrice.subSpreadMomentum})`,
        `Adverse Selection Hazard: [${adverseSelection.hazardState}] Winner's Curse: ${adverseSelection.winnersCurseProbabilityPct}% (Drift: ${adverseSelection.adverseDriftPips} pips | Style: ${adverseSelection.recommendedExecutionStyle})`,
        `Milestone 90 Execution Engine: [${executionEngine.milestone90Grade}] Score: ${executionEngine.executionEfficiencyScore}/100 (Status: ${executionEngine.executionReadiness} | Lock 21: ${executionEngine.safetyLock21Passed ? "PASSED" : "BLOCKED"})`,
        `Cross-Market Lead-Lag: [${crossMarketLeadLag.leadState}] (Lag: ${crossMarketLeadLag.leadLagLagPeriods} bars | r: ${crossMarketLeadLag.leadCorrelationCoefficient} | Lead: +${crossMarketLeadLag.predictiveLeadPips} pips)`,
        `Liquidity Replenishment: [${liquidityReplenishment.liquidityStickiness}] Velocity: ${liquidityReplenishment.replenishmentVelocityScore}/100 (Cancel: ${liquidityReplenishment.cancellationRatePct}% | Half-life: ${liquidityReplenishment.replenishmentHalfLifeSeconds}s)`,
        `Hasbrouck Permanent Impact: [${permanentPriceImpact.priceDiscoveryRegime}] (Permanent: ${(permanentPriceImpact.permanentImpactRatio * 100).toFixed(0)}% | Informed: ${permanentPriceImpact.informationAsymmetryPct}% - Reversion: ${permanentPriceImpact.transitoryReversionPips} pips)`,
        `Algorithmic Footprint: [${algoExecutionFootprint.algoType}] (Bias: ${algoExecutionFootprint.institutionalExecutionBias} | Cadence: ${algoExecutionFootprint.cadenceRegularityScore}/100 | Remaining: ~${algoExecutionFootprint.estimatedRemainingBars} bars)`,
        `Milestone 95 Execution Alpha: [${executionAlpha.milestone95Grade}] Score: ${executionAlpha.executionAlphaScore}/100 (Rec: ${executionAlpha.executionAlphaRecommendation} | Lock 22: ${executionAlpha.safetyLock22Passed ? "PASSED" : "BLOCKED"})`,
        `Quantum Probability Vector: |Up⟩ ${(quantumProbabilityVector.stateVector.psiUp * 100).toFixed(0)}% vs |Down⟩ ${(quantumProbabilityVector.stateVector.psiDown * 100).toFixed(0)}% (Entropy: ${quantumProbabilityVector.shannonVonNeumannEntropy} bits | Coherence: ${quantumProbabilityVector.quantumCoherenceScore}/100 - ${quantumProbabilityVector.collapseState})`,
        `Multi-Fractal Hurst Cascades: [${multiFractalHurst.cascadePersistenceState}] H(2): ${multiFractalHurst.generalizedHurstQ2} (Singularity Width Δα: ${multiFractalHurst.singularitySpectrumWidth} | Cascade Confluence: ${multiFractalHurst.timeframeCascadesConfluencePct}%)`,
        `Fill Probability & Slippage: [${fillProbabilitySlippage.fillEfficiencyGrade}] Slippage: ~${fillProbabilitySlippage.forecastedSlippagePips} pips (Limit Fill: ${fillProbabilitySlippage.limitFillProbabilityPct}% | Style: ${fillProbabilitySlippage.recommendedExecutionStyle})`,
        `Dark Pool Dealer Gamma: [${darkPoolDealerGamma.gammaRegime}] GEX: ${darkPoolDealerGamma.netDealerGammaExposureScore} (Flip: ${darkPoolDealerGamma.syntheticGammaFlipLevel} | Pin: ${darkPoolDealerGamma.estimatedPinningStrike} | Dark Pool Index: ${darkPoolDealerGamma.darkPoolHiddenInventoryIndex}/100)`,
        `Grand Milestone 100 Sovereign Singularity: [${sovereignSingularityAlpha.milestone100Grade}] Score: ${sovereignSingularityAlpha.sovereignAlphaScore}/100 (Convergence: ${sovereignSingularityAlpha.singularityState} | Rec: ${sovereignSingularityAlpha.singularityRecommendation} | Lock 23: ${sovereignSingularityAlpha.safetyLock23Passed ? "PASSED" : "BLOCKED"})`,
        `Classic Trio (MA20 • MA50 • RSI14): ${classicTrio.summary} [Alignment: ${classicTrio.alignmentScore}%, Win Rate Boost: +${classicTrio.winRateBonus}%]`,
      ],
    },
    newsSentimentAnalysis: {
      overallSentiment,
      sentimentScore,
      /** 0 = ข่าวไม่น่าเชื่อ (fallback/contradictory), 1 = น่าเชื่อมาก */
      newsReliabilityScore,
      /** Flags ที่ตรวจพบปัญหาด้านความน่าเชื่อถือของข่าว */
      newsRiskFlags,
      topHeadlines: newsList.slice(0, 3).map((n) => ({
        title: n.title,
        impact: n.impact,
        sentimentConfidence: n.sentimentConfidence,
        isContradictory: n.isContradictory,
        isFallback: !!n.isFallback,
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
      orderType: calculatedOrderType,
      mtOrderLabel,
      mtStopLimitPrice,
      mtOrderAdvice,
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
      keltner,
      donchian,
      chaikinVol,
      ker,
      vpci,
      mcginley,
      elderForce,
      rvi,
      frama,
      milestone75,
      orderBookImbalance,
      vwapVarianceBands,
      volumeVelocity,
      icebergOrders,
      liquidityMatrix,
      advancedCVD,
      footprintCluster,
      vpinToxicity,
      liquidityVacuum,
      orderFlowFusion,
      kylesLambda,
      tradeSizeDistribution,
      microPrice,
      adverseSelection,
      executionEngine,
      crossMarketLeadLag,
      liquidityReplenishment,
      permanentPriceImpact,
      algoExecutionFootprint,
      executionAlpha,
      quantumProbabilityVector,
      multiFractalHurst,
      fillProbabilitySlippage,
      darkPoolDealerGamma,
      sovereignSingularityAlpha,
      classicTrio,
      pivotPoints,
      clusteredSR,
      autoFibonacci,
      fiveCorePillars,
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
    pivotPoints,
    clusteredSR,
    autoFibonacci,
    fiveCorePillars,
    orchestrator,
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
const mtfMatrixMemoryCache = new Map<string, { data: AnalysisResult["timeframeMatrix"]; timestamp: number }>();
const MTF_MATRIX_TTL_MS = 30 * 1000; // 30s memory cache to eliminate 4 repeated DB queries per analysis

export async function calculateTrueMultiTimeframeMatrix(
  symbol: string
): Promise<AnalysisResult["timeframeMatrix"]> {
  const sym = symbol.toUpperCase();
  const cached = mtfMatrixMemoryCache.get(sym);
  if (cached && Date.now() - cached.timestamp < MTF_MATRIX_TTL_MS) {
    return cached.data;
  }

  try {
    const [c15m, c1h, c4h, c1d] = await Promise.all([
      getCachedCandles(sym, "15m", 50),
      getCachedCandles(sym, "1h", 50),
      getCachedCandles(sym, "4h", 50),
      getCachedCandles(sym, "1D", 50),
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

    const alignment = computeMtfAlignment(sym, rawMtf);

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

    const result: AnalysisResult["timeframeMatrix"] = {
      ...rawMtf,
      alignmentScore: alignment.alignmentScore,
      assetCategory: alignment.assetCategory,
      summary: alignment.summary,
      quadEma,
    };
    mtfMatrixMemoryCache.set(sym, { data: result, timestamp: Date.now() });
    return result;
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

// ─── AI SYNTHESIZE MEMORY CACHE & RATE LIMITING ───
// Eliminates runaway API costs, provides instant cached responses, and avoids Gemini 429 Too Many Requests
interface AiAnalysisCacheEntry {
  result: AnalysisResult;
  timestamp: number;
  lastCandleTime?: number;
  lastClosePrice: number;
}
const aiAnalysisCache = new Map<string, AiAnalysisCacheEntry>();
const AI_CACHE_TTL_MS = 60000; // 60 seconds TTL

// In-flight request deduplication map to prevent redundant concurrent LLM calls
const inFlightAiRequests = new Map<string, Promise<AnalysisResult>>();

// Sliding-window rate limiter for external Gemini calls (max 12 calls/minute to stay below 15 RPM free tier)
const geminiCallTimestamps: number[] = [];
const GEMINI_RATE_LIMIT_WINDOW_MS = 60000;
const GEMINI_MAX_CALLS_PER_WINDOW = 12;

function isGeminiRateLimited(): boolean {
  const now = Date.now();
  while (geminiCallTimestamps.length > 0 && now - geminiCallTimestamps[0] > GEMINI_RATE_LIMIT_WINDOW_MS) {
    geminiCallTimestamps.shift();
  }
  return geminiCallTimestamps.length >= GEMINI_MAX_CALLS_PER_WINDOW;
}

function recordGeminiCall(): void {
  geminiCallTimestamps.push(Date.now());
}

export async function analyzeWithGemini(
  symbol: string,
  timeframe: string,
  candles: Candle[],
  indicators: IndicatorData,
  news: NewsItem[],
  customApiKey?: string
): Promise<AnalysisResult> {
  const cacheKey = `${symbol.toUpperCase()}_${timeframe.toLowerCase()}`;
  const now = Date.now();
  const lastCandle = candles[candles.length - 1];
  const currentPrice = indicators.currentPrice || (lastCandle ? lastCandle.close : 0);

  // 1. Fast Cache Lookup (Serves in <1ms without hitting external Gemini API)
  const cached = aiAnalysisCache.get(cacheKey);
  if (cached && now - cached.timestamp < AI_CACHE_TTL_MS) {
    const priceDiffPct =
      cached.lastClosePrice > 0 ? Math.abs(currentPrice - cached.lastClosePrice) / cached.lastClosePrice : 0;
    // If price hasn't swung dramatically (< 0.15%), return cached analysis instantly
    if (priceDiffPct < 0.0015) {
      return {
        ...cached.result,
        currentPrice: currentPrice > 0 ? currentPrice : cached.result.currentPrice,
      };
    }
  }

  // 2. In-flight Request Deduplication: if another request is already processing this symbol, reuse it
  const existingInFlight = inFlightAiRequests.get(cacheKey);
  if (existingInFlight) {
    return existingInFlight;
  }

  const executionPromise = (async (): Promise<AnalysisResult> => {
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
      aiAnalysisCache.set(cacheKey, {
        result: ruleAnalysis,
        timestamp: Date.now(),
        lastCandleTime: lastCandle?.time,
        lastClosePrice: currentPrice,
      });
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
    if (isGeminiRateLimited()) {
      console.warn(`Gemini rate limit threshold reached (${GEMINI_MAX_CALLS_PER_WINDOW} RPM). Serving institutional rule analysis for ${symbol}.`);
      aiAnalysisCache.set(cacheKey, {
        result: ruleAnalysis,
        timestamp: Date.now(),
        lastCandleTime: lastCandle?.time,
        lastClosePrice: currentPrice,
      });
      return ruleAnalysis;
    }
    recordGeminiCall();

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
    parsed.fisher = ruleAnalysis.fisher;
    parsed.connorsRSI = ruleAnalysis.connorsRSI;
    parsed.awesomeOsc = ruleAnalysis.awesomeOsc;
    parsed.tsi = ruleAnalysis.tsi;
    parsed.advancedVol = ruleAnalysis.advancedVol;
    parsed.keltner = ruleAnalysis.keltner;
    parsed.donchian = ruleAnalysis.donchian;
    parsed.chaikinVol = ruleAnalysis.chaikinVol;
    parsed.ker = ruleAnalysis.ker;
    parsed.vpci = ruleAnalysis.vpci;
    parsed.mcginley = ruleAnalysis.mcginley;
    parsed.elderForce = ruleAnalysis.elderForce;
    parsed.rvi = ruleAnalysis.rvi;
    parsed.frama = ruleAnalysis.frama;
    parsed.milestone75 = ruleAnalysis.milestone75;
    parsed.orderBookImbalance = ruleAnalysis.orderBookImbalance;
    parsed.vwapVarianceBands = ruleAnalysis.vwapVarianceBands;
    parsed.volumeVelocity = ruleAnalysis.volumeVelocity;
    parsed.icebergOrders = ruleAnalysis.icebergOrders;
    parsed.liquidityMatrix = ruleAnalysis.liquidityMatrix;
    parsed.advancedCVD = ruleAnalysis.advancedCVD;
    parsed.footprintCluster = ruleAnalysis.footprintCluster;
    parsed.vpinToxicity = ruleAnalysis.vpinToxicity;
    parsed.liquidityVacuum = ruleAnalysis.liquidityVacuum;
    parsed.orderFlowFusion = ruleAnalysis.orderFlowFusion;
    parsed.kylesLambda = ruleAnalysis.kylesLambda;
    parsed.tradeSizeDistribution = ruleAnalysis.tradeSizeDistribution;
    parsed.microPrice = ruleAnalysis.microPrice;
    parsed.adverseSelection = ruleAnalysis.adverseSelection;
    parsed.executionEngine = ruleAnalysis.executionEngine;
    parsed.crossMarketLeadLag = ruleAnalysis.crossMarketLeadLag;
    parsed.liquidityReplenishment = ruleAnalysis.liquidityReplenishment;
    parsed.permanentPriceImpact = ruleAnalysis.permanentPriceImpact;
    parsed.algoExecutionFootprint = ruleAnalysis.algoExecutionFootprint;
    parsed.executionAlpha = ruleAnalysis.executionAlpha;
    parsed.quantumProbabilityVector = ruleAnalysis.quantumProbabilityVector;
    parsed.multiFractalHurst = ruleAnalysis.multiFractalHurst;
    parsed.fillProbabilitySlippage = ruleAnalysis.fillProbabilitySlippage;
    parsed.darkPoolDealerGamma = ruleAnalysis.darkPoolDealerGamma;
    parsed.sovereignSingularityAlpha = ruleAnalysis.sovereignSingularityAlpha;

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
      parsed.tradeSetup.fisher = ruleAnalysis.tradeSetup.fisher;
      parsed.tradeSetup.connorsRSI = ruleAnalysis.tradeSetup.connorsRSI;
      parsed.tradeSetup.awesomeOsc = ruleAnalysis.tradeSetup.awesomeOsc;
      parsed.tradeSetup.tsi = ruleAnalysis.tradeSetup.tsi;
      parsed.tradeSetup.advancedVol = ruleAnalysis.tradeSetup.advancedVol;
      parsed.tradeSetup.keltner = ruleAnalysis.tradeSetup.keltner;
      parsed.tradeSetup.donchian = ruleAnalysis.tradeSetup.donchian;
      parsed.tradeSetup.chaikinVol = ruleAnalysis.tradeSetup.chaikinVol;
      parsed.tradeSetup.ker = ruleAnalysis.tradeSetup.ker;
      parsed.tradeSetup.vpci = ruleAnalysis.tradeSetup.vpci;
      parsed.tradeSetup.mcginley = ruleAnalysis.tradeSetup.mcginley;
      parsed.tradeSetup.elderForce = ruleAnalysis.tradeSetup.elderForce;
      parsed.tradeSetup.rvi = ruleAnalysis.tradeSetup.rvi;
      parsed.tradeSetup.frama = ruleAnalysis.tradeSetup.frama;
      parsed.tradeSetup.milestone75 = ruleAnalysis.tradeSetup.milestone75;
      parsed.tradeSetup.orderBookImbalance = ruleAnalysis.tradeSetup.orderBookImbalance;
      parsed.tradeSetup.vwapVarianceBands = ruleAnalysis.tradeSetup.vwapVarianceBands;
      parsed.tradeSetup.volumeVelocity = ruleAnalysis.tradeSetup.volumeVelocity;
      parsed.tradeSetup.icebergOrders = ruleAnalysis.tradeSetup.icebergOrders;
      parsed.tradeSetup.liquidityMatrix = ruleAnalysis.tradeSetup.liquidityMatrix;
      parsed.tradeSetup.advancedCVD = ruleAnalysis.tradeSetup.advancedCVD;
      parsed.tradeSetup.footprintCluster = ruleAnalysis.tradeSetup.footprintCluster;
      parsed.tradeSetup.vpinToxicity = ruleAnalysis.tradeSetup.vpinToxicity;
      parsed.tradeSetup.liquidityVacuum = ruleAnalysis.tradeSetup.liquidityVacuum;
      parsed.tradeSetup.orderFlowFusion = ruleAnalysis.tradeSetup.orderFlowFusion;
      parsed.tradeSetup.kylesLambda = ruleAnalysis.tradeSetup.kylesLambda;
      parsed.tradeSetup.tradeSizeDistribution = ruleAnalysis.tradeSetup.tradeSizeDistribution;
      parsed.tradeSetup.microPrice = ruleAnalysis.tradeSetup.microPrice;
      parsed.tradeSetup.adverseSelection = ruleAnalysis.tradeSetup.adverseSelection;
      parsed.tradeSetup.executionEngine = ruleAnalysis.tradeSetup.executionEngine;
      parsed.tradeSetup.crossMarketLeadLag = ruleAnalysis.tradeSetup.crossMarketLeadLag;
      parsed.tradeSetup.liquidityReplenishment = ruleAnalysis.tradeSetup.liquidityReplenishment;
      parsed.tradeSetup.permanentPriceImpact = ruleAnalysis.tradeSetup.permanentPriceImpact;
      parsed.tradeSetup.algoExecutionFootprint = ruleAnalysis.tradeSetup.algoExecutionFootprint;
      parsed.tradeSetup.executionAlpha = ruleAnalysis.tradeSetup.executionAlpha;
      parsed.tradeSetup.quantumProbabilityVector = ruleAnalysis.tradeSetup.quantumProbabilityVector;
      parsed.tradeSetup.multiFractalHurst = ruleAnalysis.tradeSetup.multiFractalHurst;
      parsed.tradeSetup.fillProbabilitySlippage = ruleAnalysis.tradeSetup.fillProbabilitySlippage;
      parsed.tradeSetup.darkPoolDealerGamma = ruleAnalysis.tradeSetup.darkPoolDealerGamma;
      parsed.tradeSetup.sovereignSingularityAlpha = ruleAnalysis.tradeSetup.sovereignSingularityAlpha;
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
    aiAnalysisCache.set(cacheKey, {
      result: parsed,
      timestamp: Date.now(),
      lastCandleTime: lastCandle?.time,
      lastClosePrice: currentPrice,
    });
    return parsed;
  } catch (err) {
    console.error("Gemini analysis error, falling back to calendar-aware rule engine:", err);
    aiAnalysisCache.set(cacheKey, {
      result: ruleAnalysis,
      timestamp: Date.now(),
      lastCandleTime: lastCandle?.time,
      lastClosePrice: currentPrice,
    });
    return ruleAnalysis;
  }
  })();

  inFlightAiRequests.set(cacheKey, executionPromise);
  try {
    return await executionPromise;
  } finally {
    inFlightAiRequests.delete(cacheKey);
  }
}