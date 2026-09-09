export type AssetCategory = "forex" | "crypto" | "commodities" | "stocks";

export interface AssetInfo {
  symbol: string;
  name: string;
  category: AssetCategory;
  baseAsset: string;
  quoteAsset: string;
  icon?: string;
  precision: number;
}

export interface Candle {
  time: number; // Unix timestamp in seconds
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface SuperTrendPoint {
  value: number;
  direction: "UP" | "DOWN";
}

export interface BollingerBandPoint {
  upper: number;
  middle: number;
  lower: number;
  bandwidth: number;
}

export interface StochRSIPoint {
  k: number;
  d: number;
}

export interface FVGItem {
  type: "BULLISH" | "BEARISH";
  top: number;
  bottom: number;
  candleIndex: number;
}

export interface HeikinAshiPoint {
  open: number;
  high: number;
  low: number;
  close: number;
  isUp: boolean;
  hasNoLowerWick: boolean;
  hasNoUpperWick: boolean;
}

export interface VWAPPoint {
  vwap: number;
  upperBand: number;
  lowerBand: number;
}

export interface VolumeAnomalyItem {
  index: number;
  time: number;
  volume: number;
  avgVolume: number;
  ratio: number;
  type: "BUYING_SPIKE" | "SELLING_SPIKE";
}

export interface IntraBarMomentum {
  percentInRange: number; // 0 - 100%
  bias: "STRONG_BUYERS" | "STRONG_SELLERS" | "BALANCED";
}

export interface Rolling24hRange {
  high24h: number;
  low24h: number;
  currentPrice: number;
  percentPosition: number; // 0 - 100%
  isNearTop: boolean;
  isNearBottom: boolean;
  warning?: string;
}

export interface QuadEmaConfluence {
  isQuadGoldenStack: boolean;
  isQuadDeathStack: boolean;
  status: "GOLDEN_STACK" | "DEATH_STACK" | "MIXED";
  scoreBonus: number;
}

export interface SessionORB {
  session: "LONDON" | "NEW_YORK" | "ASIAN" | "NONE";
  high: number;
  low: number;
  status: "BREAKOUT_BULL" | "BREAKOUT_BEAR" | "INSIDE_RANGE";
}

// ─── BATCH 3 (PLANS 11-15) QUANT INTERFACES ───
export interface OTEZoneInfo {
  swingHigh: number;
  swingLow: number;
  fib618: number;
  fib705: number;
  fib786: number;
  oteMin: number;
  oteMax: number;
  sweetSpot: number; // 0.705 Optimal Institutional Entry
  isPriceInOTE: boolean;
  bias: "BULLISH" | "BEARISH";
  description: string;
}

export interface VolumeDeltaInfo {
  buyerVolumePct: number; // 0 - 100%
  sellerVolumePct: number; // 0 - 100%
  netDelta: number;
  dominantSide: "BUYERS" | "SELLERS" | "BALANCED";
  isAbsorption: boolean;
  description: string;
}

export interface BreakevenAdvice {
  targetTP1: number;
  breakevenPrice: number;
  bufferPips: number;
  status: "PENDING_TP1" | "READY_FOR_BREAKEVEN" | "RISK_FREE";
  actionText: string;
  earlyBETriggerPrice?: number; // Pillar 5: +0.8R early risk-free trigger price
  earlyBEPrice?: number;        // Level to move SL to at +0.8R
}

export interface RoundLevelInfo {
  nearestMajor: number;
  nearestMinor: number;
  distancePips: number;
  isMagnetZone: boolean;
  gravityEffect: "ATTRACTING" | "REPELLING" | "NEUTRAL";
  description: string;
}

export interface StructuralStopLossInfo {
  stopLoss: number;
  swingRefPrice: number;
  liquidityBuffer: number;
  protectionType: "SWING_LOW_BUFFER" | "SWING_HIGH_BUFFER" | "VOLATILITY_ATR";
}

// ─── BATCH 4 (PLANS 16-20) QUANT INTERFACES ───
export interface VolumeProfileInfo {
  poc: number; // Point of Control (highest volume price bin)
  vah: number; // Value Area High (70% boundary)
  val: number; // Value Area Low (70% boundary)
  valueAreaVolumePct: number; // e.g. 70%
  isInsideValueArea: boolean;
  description: string;
}

export interface TDSequentialInfo {
  buySetupCount: number; // 1 to 9
  sellSetupCount: number; // 1 to 9
  isExhausted: boolean;
  exhaustionType: "BUY_EXHAUSTION_9" | "SELL_EXHAUSTION_9" | "NONE";
  note: string;
}

export interface SpreadImpactInfo {
  estimatedSpreadPips: number;
  spreadCostUSD: number;
  spreadToSLPercent: number; // Spread / SL distance * 100
  effectiveRiskReward: string; // R:R after deducting spread
  isSpreadWarning: boolean;
  warningMessage?: string;
}

export interface TrailingStopInfo {
  trailingStopPrice: number;
  stepPips: number;
  isActivated: boolean;
  instruction: string;
}

// [แผน 21] Volatility-Adjusted Kelly Criterion Sizing
export interface KellySizingInfo {
  fullKellyPct: number; // e.g. 6.2%
  halfKellyPct: number; // e.g. 3.1%
  volatilityAdjustedPct: number; // e.g. 1.8%
  suggestedLot10USD: number;
  suggestedLot100USD: number;
  suggestedLot1000USD: number;
  winRateUsed: number;
  riskRewardUsed: number;
  rationale: string;
}

// [แผน 22] Anchored Multi-Band VWAP (±1σ, ±2σ, ±3σ)
export interface AnchoredVWAPInfo {
  vwap: number;
  upperBand1: number; // +1 SD (68% boundary)
  lowerBand1: number; // -1 SD
  upperBand2: number; // +2 SD (95% Mean Reversion boundary)
  lowerBand2: number; // -2 SD
  upperBand3: number; // +3 SD (99.7% Extreme Exhaustion)
  lowerBand3: number; // -3 SD
  pricePosition: "ABOVE_VWAP" | "BELOW_VWAP" | "AT_VWAP" | "OVERBOUGHT_EXTREME" | "OVERSOLD_EXTREME";
  description: string;
}

// [แผน 23] Cumulative Volume Delta (CVD) Divergence Engine
export interface CVDInfo {
  currentCVD: number;
  cvdTrend: "RISING" | "FALLING" | "NEUTRAL";
  divergence: "BULLISH_CVD_DIVERGENCE" | "BEARISH_CVD_DIVERGENCE" | "NONE";
  absorptionDetected: boolean;
  buyerVolumeRatio: number; // percentage e.g. 58%
  description: string;
}

// [แผน 24] Order Block Mitigation & Breaker Block Validator
export interface OrderBlockItem {
  type: "BULLISH_OB" | "BEARISH_OB" | "BULLISH_BREAKER" | "BEARISH_BREAKER";
  priceMin: number;
  priceMax: number;
  isMitigated: boolean;
  isBreaker: boolean;
  formedIndex: number;
}

export interface OrderBlockValidatorInfo {
  activeBlocks: OrderBlockItem[];
  nearestBlock?: OrderBlockItem;
  hasUnmitigatedOB: boolean;
  isRetestingBreaker: boolean;
  breakerCount: number;
  description: string;
}

// [แผน 25] Multi-Source Price Feed Divergence & Fair Market Value
export interface PriceFeedIntegrityInfo {
  fairMarketValue: number;
  spreadHealth: "HEALTHY" | "WIDE" | "ANOMALOUS";
  feedReliability: "EXCELLENT" | "GOOD" | "CAUTION";
  syntheticDeviationPips: number;
  description: string;
}

// [แผน 26] Dynamic Session Liquidity Sweep Alerts & Turtle Soups
export interface SessionSweepInfo {
  sweepType: "BULLISH_SWEEP" | "BEARISH_SWEEP" | "NONE";
  sweptLevel: number;
  sweptSession: "Asian Range" | "London Session" | "New York Session" | "Previous Day";
  isTurtleSoup: boolean;
  sweepDistancePips: number;
  description: string;
}

// [แผน 27] Fibonacci Multi-Timeframe Projection Clusters & Golden Confluence Zone
export interface FibonacciClusterInfo {
  clusterZone: { min: number; max: number };
  confluenceCount: number;
  keyLevels: number[];
  isPriceInCluster: boolean;
  description: string;
}

// [แผน 28] Realized Volatility Regime Switching
export interface RealizedVolatilityInfo {
  realizedVol: number; // e.g. 0.85%
  historicalAvgVol: number;
  volState: "COMPRESSION" | "NORMAL" | "EXPANSION";
  expansionFactor: number;
  recommendedBufferMultiplier: number;
  description: string;
}

// [แผน 29] Candlestick Microstructure Wick-to-Body Strength Index
export interface CandleMicrostructureInfo {
  rejectionStrength: "STRONG_BUY_REJECTION" | "STRONG_SELL_REJECTION" | "NEUTRAL";
  wickRatio: number; // percentage e.g. 68%
  bodyDominance: number; // percentage e.g. 32%
  isPinBar: boolean;
  isFullBodyThrust: boolean;
  description: string;
}

// [แผน 30] Multi-Asset Correlation Hedge Shield
export interface CorrelationShieldInfo {
  macroRegime: "STANDARD_INVERSE" | "DECOUPLED_SAFE_HAVEN" | "LIQUIDATION_ANOMALY";
  dxyTrend: "BULLISH" | "BEARISH" | "NEUTRAL";
  shieldStatus: "PROTECTED" | "HEDGE_ALERT" | "NORMAL";
  hedgeAdvice: string;
  description: string;
}

// [แผน 31] Institutional Imbalance & FVG Mitigation Tracker
export interface FVGDetailItem {
  id: string;
  type: "BULLISH_FVG" | "BEARISH_FVG";
  top: number;
  bottom: number;
  consequentEncroachment: number; // 50% midpoint
  sizePips: number;
  mitigationStatus: "UNMITIGATED" | "PARTIALLY_MITIGATED" | "FULLY_MITIGATED";
  candleIndex: number;
  timeStr?: string;
}

export interface FVGMitigationInfo {
  activeFVGs: FVGDetailItem[];
  unmitigatedCount: number;
  nearestFVG: FVGDetailItem | null;
  recommendedEntryLimit: number | null; // C.E. 50% of nearest valid FVG
  bias: "BULLISH_IMBALANCE" | "BEARISH_IMBALANCE" | "BALANCED";
  description: string;
}

// [แผน 32] Market Structure Shift (MSS) with Displacement Velocity
export interface MarketStructureShiftInfo {
  detected: boolean;
  type: "BULLISH_MSS" | "BEARISH_MSS" | "NONE";
  breakPrice: number;
  displacementMultiplier: number; // displacement candle body / ATR
  isTrueDisplacement: boolean; // >= 1.8x ATR
  displacementVelocity: "EXPLOSIVE" | "MODERATE" | "WEAK";
  mssCandleIndex: number;
  description: string;
}

// [แผน 33] Premium vs Discount Array Matrix & Dealing Range
export interface PremiumDiscountInfo {
  rangeHigh: number;
  rangeLow: number;
  equilibrium: number; // 50% midpoint
  currentPrice: number;
  percentile: number; // 0 - 100%
  zone: "EXTREME_PREMIUM" | "PREMIUM" | "EQUILIBRIUM" | "DISCOUNT" | "DEEP_DISCOUNT";
  tradeAllowed: boolean; // False if BUY in Extreme Premium (>80%) or SELL in Deep Discount (<20%)
  actionWarning: string;
  description: string;
}

// [แผน 34] Daily & Weekly Key High/Low (PDH, PDL, PWH, PWL) Liquidity Targets
export interface KeyLevelTargetsInfo {
  pdh: number; // Previous Day High
  pdl: number; // Previous Day Low
  pwh: number; // Previous Week High
  pwl: number; // Previous Week Low
  nearestLiquidityTarget: {
    name: "PDH" | "PDL" | "PWH" | "PWL" | "NONE";
    price: number;
    distancePips: number;
    type: "BUY_SIDE_LIQUIDITY" | "SELL_SIDE_LIQUIDITY";
  };
  description: string;
}

// [แผน 35] Algorithmic Order Flow Velocity & Momentum Acceleration Index
export interface OrderFlowVelocityInfo {
  velocityScore: number; // -100 to +100
  momentumState: "ACCELERATING_BULLISH" | "ACCELERATING_BEARISH" | "DECELERATING" | "CLIMAX_EXHAUSTION" | "NEUTRAL";
  isClimaxExhaustion: boolean;
  acceleration3Bar: number;
  flowVolumeRatio: number;
  description: string;
}

// [แผน 36] Dynamic Multi-Stage Breakeven & Partial TP Laddering Engine
export interface BreakevenLadderStage {
  stage: number;
  triggerGainR: number; // e.g. 0.8, 1.5, 2.5
  action: "MOVE_TO_BE_PLUS_1" | "LOCK_HALF_AND_TRAIL_0_5R" | "TRAIL_RUNNER";
  targetPrice: number;
  slMovePrice: number;
  isTriggered: boolean;
  statusText: string;
}

export interface BreakevenLadderInfo {
  currentRMultiple: number;
  currentStage: number; // 0, 1, 2, 3
  recommendedSL: number;
  partialCloseRecommendedPct: number; // e.g. 0%, 50%, 80%
  stages: BreakevenLadderStage[];
  actionAdvice: string;
  description: string;
}

// [แผน 37] Liquidity Void & Volume Imbalance Fast-Fill Predictor
export interface LiquidityVoidItem {
  id: string;
  type: "BULLISH_VOID" | "BEARISH_VOID";
  top: number;
  bottom: number;
  fillTarget50: number;
  fillTarget100: number;
  fillPercentage: number;
  candleIndex: number;
  isFilled: boolean;
}

export interface LiquidityVoidInfo {
  voids: LiquidityVoidItem[];
  activeVoidCount: number;
  nearestVoid: LiquidityVoidItem | null;
  vacuumDirection: "UPWARD_VACUUM" | "DOWNWARD_VACUUM" | "NONE";
  fastFillProbabilityPct: number; // e.g. 85%
  description: string;
}

// [แผน 38] Multi-Timeframe Fibonacci Extension & Projection Mesh
export interface FibExtensionLevel {
  ratio: number; // e.g. 1.272, 1.414, 1.618, 2.0
  price: number;
  label: string;
  isConfluentWithKeyLevel: boolean;
}

export interface FibonacciExtensionInfo {
  anchorLow: number;
  anchorHigh: number;
  anchorRetrace: number;
  extensionLevels: FibExtensionLevel[];
  bestTakeProfitTarget: FibExtensionLevel;
  description: string;
}

// [แผน 39] Institutional Footprint Absorption & VSA Climax
export interface FootprintAbsorptionInfo {
  vsaSignal: "ABSORPTION_BUY" | "ABSORPTION_SELL" | "STOPPING_VOLUME" | "NO_DEMAND" | "NO_SUPPLY" | "NORMAL";
  effortVsResult: "HIGH_EFFORT_LOW_RESULT" | "BALANCED" | "LOW_EFFORT_HIGH_RESULT";
  relativeVolume: number; // e.g. 2.4x
  spreadRatio: number; // candle spread / ATR
  isInstitutionalAbsorption: boolean;
  bias: "BULLISH" | "BEARISH" | "NEUTRAL";
  description: string;
}

// [แผน 40] Multi-Timeframe Structure Alignment Matrix (15m, 1h, 4h, 1D BOS/CHOCH Dashboard)
export interface TimeframeStructureDetail {
  timeframe: "15m" | "1h" | "4h" | "1D";
  structure: "BULLISH_BOS" | "BEARISH_BOS" | "BULLISH_CHOCH" | "BEARISH_CHOCH" | "RANGING";
  trendBias: "BULLISH" | "BEARISH" | "NEUTRAL";
  keySwingHigh: number;
  keySwingLow: number;
}

export interface MTFStructureMatrixInfo {
  overallAlignment: "FULL_BULLISH_CONFLUENCE" | "FULL_BEARISH_CONFLUENCE" | "PARTIAL_ALIGNMENT" | "HTF_CONFLICT_WARNING";
  alignmentScorePct: number; // 0 - 100%
  htfTrend: "BULLISH" | "BEARISH" | "NEUTRAL";
  isHTFConflict: boolean;
  timeframes: {
    m15: TimeframeStructureDetail;
    h1: TimeframeStructureDetail;
    h4: TimeframeStructureDetail;
    d1: TimeframeStructureDetail;
  };
  description: string;
}

// ─── BATCH 9: PLANS 41-45 INTERFACES ───

export interface LiquidityInducementInfo {
  eqhPrice: number | null;
  eqlPrice: number | null;
  idmLevel: number | null;
  isInducementTrap: boolean;
  trapType: "EQUAL_HIGHS_BAIT" | "EQUAL_LOWS_BAIT" | "MINOR_PULLBACK_IDM" | "NONE";
  inducementDirection: "BULL_TRAP_INDUCEMENT" | "BEAR_TRAP_INDUCEMENT" | "CLEAN_STRUCTURE";
  distanceToTrapPips: number;
  description: string;
}

export interface InstitutionalChoSInfo {
  deliveryState: "ACCUMULATION" | "MANIPULATION" | "DISTRIBUTION" | "EXPANSION_DELIVERY";
  chosDetected: boolean;
  consecutiveExpansionBars: number;
  deliveryScore: number; // 0 to 100
  dominantParticipant: "INSTITUTIONAL_ALGO" | "RETAIL_CHURN" | "SMART_MONEY_ABSORPTION";
  description: string;
}

export interface DynamicRiskBracketInfo {
  currentRiskBracket: "CONSERVATIVE" | "BALANCED" | "AGGRESSIVE" | "DEFENSIVE_HALT";
  recommendedRiskPct: number; // e.g. 0.75%, 1.25%, 2.00%
  drawdownThrottleMultiplier: number; // 0.5 to 1.2
  consecutiveLossCount: number;
  maxDailyTradesRemaining: number;
  description: string;
}

export interface RejectionBlockItem {
  type: "BULLISH_REJECTION_BLOCK" | "BEARISH_REJECTION_BLOCK";
  high: number;
  low: number;
  wickSize: number;
  bodySize: number;
  isMitigated: boolean;
  candleIndex: number;
}

export interface RejectionBlockInfo {
  blocks: RejectionBlockItem[];
  nearestBlock: RejectionBlockItem | null;
  wickExhaustionScore: number; // 0 to 100
  rejectionWickRatioPct: number;
  description: string;
}

export interface MCPIConvictionInfo {
  score: number; // 0 to 100
  convictionTier: "TITANIUM" | "PLATINUM" | "GOLD" | "SILVER" | "BRONZE";
  pillarsPassedCount: number; // out of 12
  isApprovedForExecution: boolean;
  institutionalBackingRatioPct: number;
  description: string;
}

export interface MasterConfluenceScore {
  totalScore: number; // 0 - 100
  grade: "A+" | "A" | "B" | "C (Wait)";
  pillars: {
    trendRegime: { score: number; max: number; status: string; adx: number; superTrend: "UP" | "DOWN" };
    momentumCycles: { score: number; max: number; status: string; rsi: number; stochRsiK: number };
    volatilitySqueeze: { score: number; max: number; status: string; isSqueezing: boolean };
    volumeFlow: { score: number; max: number; status: string; obvTrend: "UP" | "DOWN"; hasVolumeSpike: boolean };
    smartMoneyStructure: { score: number; max: number; status: string; fvgCount: number; structure: string };
  };
  verdict: string;
}

export type MarketRegimeType = "EXPLOSIVE_TREND" | "HEALTHY_PULLBACK" | "VOLATILITY_SQUEEZE" | "CHOPPY_DEADZONE";

export interface MarketRegimeInfo {
  regime: MarketRegimeType;
  title: string;
  badgeColor: string;
  adxValue: number;
  bandwidthValue: number;
  description: string;
  tacticalAction: string;
  targetedWinRate: string;
  optimalParams: {
    emaFast: number;
    emaSlow: number;
    emaTrend: number;
    rsiPeriod: number;
    tpMultiplier: number;
  };
}

export interface SessionStatus {
  thaiTimeStr: string;
  hour: number;
  minute: number;
  dayOfWeek: number;
  isDST: boolean;
  activeSessions: string[];
  isGoldenHour: boolean;
  isWitchingHour: boolean;
  isMondayOpenGapRisk: boolean;
  isIndexOpeningVolatile: boolean;
  assetSessionAdvice: string;
  sessionBadge: {
    text: string;
    color: string;
    isOptimal: boolean;
  };
  spreadStatus: "NORMAL" | "TIGHT" | "WIDE_DANGER";
  tradeAllowed: boolean;
  confidenceModifier: number;
  isWeekendCloseFreeze?: boolean;
  orb?: SessionORB;
}

export type CalendarImpact = "HIGH" | "MEDIUM" | "LOW" | "HOLIDAY";

export interface EconomicCalendarEvent {
  id: string;
  timeStr: string;
  hour: number;
  minute: number;
  currency: string;
  impact: CalendarImpact;
  title: string;
  forecast: string;
  previous: string;
  actual?: string;
  timestamp: number;
}

export interface CalendarSafetyStatus {
  state: "SAFE_TRADING_WINDOW" | "APPROACHING_RED_FOLDER" | "RED_FOLDER_FREEZE" | "POST_NEWS_VOLATILITY";
  badgeText: string;
  badgeColor: string;
  nextHighImpactEvent: EconomicCalendarEvent | null;
  minutesToNextEvent: number | null;
  tradeAllowed: boolean;
  freezeReason: string;
  relevantEvents: EconomicCalendarEvent[];
}

export interface IndicatorData {
  rsi14: (number | null)[];
  atr14?: (number | null)[];
  ema20: (number | null)[];
  ema50: (number | null)[];
  ema200: (number | null)[];
  macd: {
    macdLine: (number | null)[];
    signalLine: (number | null)[];
    histogram: (number | null)[];
  };
  superTrend?: (SuperTrendPoint | null)[];
  bollingerBands?: (BollingerBandPoint | null)[];
  stochRSI?: (StochRSIPoint | null)[];
  adx?: (number | null)[];
  obv?: (number | null)[];
  fvgs?: FVGItem[];
  supportLevels: number[];
  resistanceLevels: number[];
  currentPrice: number;
  priceChange24h: number;
  priceChangePercent24h: number;
  heikinAshi?: HeikinAshiPoint[];
  vwap?: (VWAPPoint | null)[];
  volumeAnomalies?: VolumeAnomalyItem[];
  intraBarMomentum?: IntraBarMomentum;
  rolling24h?: Rolling24hRange;
  quadEma?: QuadEmaConfluence;
  oteZone?: OTEZoneInfo;
  volumeDelta?: VolumeDeltaInfo;
  roundLevel?: RoundLevelInfo;
  volumeProfile?: VolumeProfileInfo;
  tdSequential?: TDSequentialInfo;
  anchoredVwap?: AnchoredVWAPInfo;
  cvd?: CVDInfo;
  orderBlocks?: OrderBlockValidatorInfo;
  priceFeedIntegrity?: PriceFeedIntegrityInfo;
  sessionSweep?: SessionSweepInfo;
  fibonacciCluster?: FibonacciClusterInfo;
  realizedVolatility?: RealizedVolatilityInfo;
  candleMicrostructure?: CandleMicrostructureInfo;
  correlationShield?: CorrelationShieldInfo;
  fvgMitigation?: FVGMitigationInfo;
  marketStructureShift?: MarketStructureShiftInfo;
  premiumDiscount?: PremiumDiscountInfo;
  keyLevelTargets?: KeyLevelTargetsInfo;
  orderFlowVelocity?: OrderFlowVelocityInfo;
  breakevenLadder?: BreakevenLadderInfo;
  liquidityVoid?: LiquidityVoidInfo;
  fibonacciExtension?: FibonacciExtensionInfo;
  footprintAbsorption?: FootprintAbsorptionInfo;
  mtfStructureMatrix?: MTFStructureMatrixInfo;
  liquidityInducement?: LiquidityInducementInfo;
  institutionalChoS?: InstitutionalChoSInfo;
  dynamicRiskBracket?: DynamicRiskBracketInfo;
  rejectionBlock?: RejectionBlockInfo;
  mcpiConviction?: MCPIConvictionInfo;
  harmonics?: HarmonicScanResult;
  ehlersMESA?: EhlersMESAInfo;
  shannonEntropy?: ShannonEntropyInfo;
  candlestickPatterns?: CandlestickScanResult;
  milestone50?: GrandQuantMilestone50Info;
  hurstExponent?: HurstExponentInfo;
  kalmanFilter?: KalmanFilterPoint;
  halfLife?: HalfLifeInfo;
  ttmSqueeze?: TTMSqueezeInfo;
  chaikinMoneyFlow?: CMFInfo;
  kama?: KAMAInfo;
  hma?: HMAInfo;
  parabolicSAR?: ParabolicSARPoint;
  aroon?: AroonInfo;
  vortex?: VortexInfo;
  fisher?: FisherTransformPoint;
  connorsRSI?: ConnorsRSIInfo;
  awesomeOsc?: AwesomeOscillatorPoint;
  tsi?: TSIInfo;
  advancedVol?: AdvancedVolatilitySuite;
  keltner?: KeltnerChannelPoint;
  donchian?: DonchianChannelPoint;
  chaikinVol?: ChaikinVolatilityInfo;
  ker?: KaufmanEfficiencyRatioInfo;
  vpci?: VPCIInfo;
  mcginley?: McGinleyDynamicPoint;
  elderForce?: ElderForceIndexInfo;
  rvi?: RelativeVolatilityIndexInfo;
  frama?: FRAMAPoint;
  milestone75?: Milestone75QuantFusionInfo;
  orderBookImbalance?: OrderBookImbalanceInfo;
  vwapVarianceBands?: VWAPVarianceBandsInfo;
  volumeVelocity?: TickVolumeVelocityInfo;
  icebergOrders?: IcebergOrderInfo;
  liquidityMatrix?: InstitutionalLiquidityMatrixInfo;
  advancedCVD?: AdvancedCVDDivergenceInfo;
  footprintCluster?: BidAskFootprintClusterInfo;
  vpinToxicity?: VPINToxicityInfo;
  liquidityVacuum?: LiquidityVacuumInfo;
  orderFlowFusion?: InstitutionalOrderFlowFusionInfo;
  kylesLambda?: KylesLambdaPriceImpactInfo;
  tradeSizeDistribution?: TradeSizeDistributionInfo;
  microPrice?: MicroPriceQueueImbalanceInfo;
  adverseSelection?: AdverseSelectionHazardInfo;
  executionEngine?: MicrostructureExecutionEngineInfo;
  crossMarketLeadLag?: CrossMarketLeadLagInfo;
  liquidityReplenishment?: LiquidityReplenishmentVelocityInfo;
  permanentPriceImpact?: PermanentPriceImpactInfo;
  algoExecutionFootprint?: AlgorithmicExecutionFootprintInfo;
  executionAlpha?: InstitutionalExecutionAlphaInfo;
  quantumProbabilityVector?: QuantumProbabilityVectorInfo;
  multiFractalHurst?: MultiFractalHurstCascadesInfo;
  fillProbabilitySlippage?: FillProbabilitySlippageInfo;
  darkPoolDealerGamma?: DarkPoolDealerGammaExposureInfo;
  sovereignSingularityAlpha?: SovereignSingularityAlphaInfo;
  classicTrio?: ClassicTrioInfo;
  masterSuite?: MasterIndicatorSuite;
}

export interface NewsItem {
  id: string;
  title: string;
  summary: string;
  url: string;
  source: string;
  publishedAt: string;
  sentiment: "BULLISH" | "BEARISH" | "NEUTRAL";
  impact: "HIGH" | "MEDIUM" | "LOW";
  relatedSymbols: string[];
  /** 0–1: ความน่าเชื่อถือของ sentiment ที่ตรวจจับได้ (ต่ำ = keyword น้อย/ขัดแย้ง) */
  sentimentConfidence: number;
  /** true = ข่าวมีทั้ง bullish และ bearish keywords ปะทะกัน → ตีความยาก */
  isContradictory: boolean;
  /** true = มาจาก fallback/hardcoded data ไม่ใช่ข่าวจริง */
  isFallback?: boolean;
}

export interface ConfluenceCheckItem {
  name: string;
  passed: boolean;
  note: string;
}

export interface HistoricalBacktestMetrics {
  candleCount: number;
  totalTrades: number;
  wins: number;
  beTrades: number;
  losses: number;
  winRate: number;
  netReturnR: number;
  profitFactor: number;
  recentTrades: Array<{
    type: "BUY" | "SELL";
    entry: number;
    exit: number;
    result: "WIN" | "LOSS" | "BE";
    pnlR: string;
    date: string;
  }>;
}

export interface OptimizedConfig {
  isOptimized: boolean;
  emaFast: number;
  emaSlow: number;
  emaTrend: number;
  rsiPeriod: number;
  tpMultiplier: number;
  baselineWinRate: number;
  optimizedWinRate: number;
  winRateGain: number;
  profitFactor: number;
  netReturnR: number;
  totalTradesTested: number;
  reasoning: string;
}

export interface TraderTierHierarchy {
  tier1_Direction: {
    bias: "BULLISH" | "BEARISH" | "NEUTRAL";
    reason: string;
    majorTrendEMA: string;
  };
  tier2_ValueLocation: {
    inValueZone: boolean;
    distanceFromEMA: string;
    isOverextended: boolean;
    note: string;
  };
  tier3_Trigger: {
    candlestickRejection: string;
    rsiCondition: string;
    divergenceStatus: string;
    isTriggerConfirmed: boolean;
  };
}

export interface AnalysisResult {
  symbol: string;
  timeframe: string;
  timestamp: string;
  currentPrice: number;
  signal: "STRONG_BUY" | "BUY" | "WAIT" | "SELL" | "STRONG_SELL";
  confidence: number;
  setupGrade: "A+" | "A" | "B" | "C (Wait)";
  summary: string;
  confluenceChecklist: ConfluenceCheckItem[];
  historicalBacktest: HistoricalBacktestMetrics;
  optimizedConfig?: OptimizedConfig;
  traderHierarchy?: TraderTierHierarchy;
  masterConfluence?: MasterConfluenceScore;
  regimeInfo?: MarketRegimeInfo;
  sessionStatus?: SessionStatus;
  calendarSafety?: CalendarSafetyStatus;
  oteZone?: OTEZoneInfo;
  volumeDelta?: VolumeDeltaInfo;
  breakevenAdvice?: BreakevenAdvice;
  roundLevel?: RoundLevelInfo;
  volumeProfile?: VolumeProfileInfo;
  tdSequential?: TDSequentialInfo;
  spreadImpact?: SpreadImpactInfo;
  trailingStop?: TrailingStopInfo;
  anchoredVwap?: AnchoredVWAPInfo;
  cvd?: CVDInfo;
  orderBlocks?: OrderBlockValidatorInfo;
  priceFeedIntegrity?: PriceFeedIntegrityInfo;
  kellySizing?: KellySizingInfo;
  sessionSweep?: SessionSweepInfo;
  fibonacciCluster?: FibonacciClusterInfo;
  realizedVolatility?: RealizedVolatilityInfo;
  candleMicrostructure?: CandleMicrostructureInfo;
  correlationShield?: CorrelationShieldInfo;
  fvgMitigation?: FVGMitigationInfo;
  marketStructureShift?: MarketStructureShiftInfo;
  premiumDiscount?: PremiumDiscountInfo;
  keyLevelTargets?: KeyLevelTargetsInfo;
  orderFlowVelocity?: OrderFlowVelocityInfo;
  breakevenLadder?: BreakevenLadderInfo;
  liquidityVoid?: LiquidityVoidInfo;
  fibonacciExtension?: FibonacciExtensionInfo;
  footprintAbsorption?: FootprintAbsorptionInfo;
  mtfStructureMatrix?: MTFStructureMatrixInfo;
  liquidityInducement?: LiquidityInducementInfo;
  institutionalChoS?: InstitutionalChoSInfo;
  dynamicRiskBracket?: DynamicRiskBracketInfo;
  rejectionBlock?: RejectionBlockInfo;
  mcpiConviction?: MCPIConvictionInfo;
  harmonics?: HarmonicScanResult;
  ehlersMESA?: EhlersMESAInfo;
  shannonEntropy?: ShannonEntropyInfo;
  candlestickPatterns?: CandlestickScanResult;
  milestone50?: GrandQuantMilestone50Info;
  hurstExponent?: HurstExponentInfo;
  kalmanFilter?: KalmanFilterPoint;
  halfLife?: HalfLifeInfo;
  ttmSqueeze?: TTMSqueezeInfo;
  chaikinMoneyFlow?: CMFInfo;
  kama?: KAMAInfo;
  hma?: HMAInfo;
  parabolicSAR?: ParabolicSARPoint;
  aroon?: AroonInfo;
  vortex?: VortexInfo;
  fisher?: FisherTransformPoint;
  connorsRSI?: ConnorsRSIInfo;
  awesomeOsc?: AwesomeOscillatorPoint;
  tsi?: TSIInfo;
  advancedVol?: AdvancedVolatilitySuite;
  keltner?: KeltnerChannelPoint;
  donchian?: DonchianChannelPoint;
  chaikinVol?: ChaikinVolatilityInfo;
  ker?: KaufmanEfficiencyRatioInfo;
  vpci?: VPCIInfo;
  mcginley?: McGinleyDynamicPoint;
  elderForce?: ElderForceIndexInfo;
  rvi?: RelativeVolatilityIndexInfo;
  frama?: FRAMAPoint;
  milestone75?: Milestone75QuantFusionInfo;
  orderBookImbalance?: OrderBookImbalanceInfo;
  vwapVarianceBands?: VWAPVarianceBandsInfo;
  volumeVelocity?: TickVolumeVelocityInfo;
  icebergOrders?: IcebergOrderInfo;
  liquidityMatrix?: InstitutionalLiquidityMatrixInfo;
  advancedCVD?: AdvancedCVDDivergenceInfo;
  footprintCluster?: BidAskFootprintClusterInfo;
  vpinToxicity?: VPINToxicityInfo;
  liquidityVacuum?: LiquidityVacuumInfo;
  orderFlowFusion?: InstitutionalOrderFlowFusionInfo;
  kylesLambda?: KylesLambdaPriceImpactInfo;
  tradeSizeDistribution?: TradeSizeDistributionInfo;
  microPrice?: MicroPriceQueueImbalanceInfo;
  adverseSelection?: AdverseSelectionHazardInfo;
  executionEngine?: MicrostructureExecutionEngineInfo;
  crossMarketLeadLag?: CrossMarketLeadLagInfo;
  liquidityReplenishment?: LiquidityReplenishmentVelocityInfo;
  permanentPriceImpact?: PermanentPriceImpactInfo;
  algoExecutionFootprint?: AlgorithmicExecutionFootprintInfo;
  executionAlpha?: InstitutionalExecutionAlphaInfo;
  quantumProbabilityVector?: QuantumProbabilityVectorInfo;
  multiFractalHurst?: MultiFractalHurstCascadesInfo;
  fillProbabilitySlippage?: FillProbabilitySlippageInfo;
  darkPoolDealerGamma?: DarkPoolDealerGammaExposureInfo;
  sovereignSingularityAlpha?: SovereignSingularityAlphaInfo;
  classicTrio?: ClassicTrioInfo;
  timeframeMatrix: {
    m15: "BULLISH" | "BEARISH" | "NEUTRAL";
    h1: "BULLISH" | "BEARISH" | "NEUTRAL";
    h4: "BULLISH" | "BEARISH" | "NEUTRAL";
    d1: "BULLISH" | "BEARISH" | "NEUTRAL";
    alignmentScore?: number;
    assetCategory?: "forex" | "crypto" | "commodities" | "stocks";
    summary?: string;
    quadEma?: QuadEmaConfluence;
  };
  technicalAnalysis: {
    trend: "STRONG_UPTREND" | "UPTREND" | "SIDEWAYS" | "DOWNTREND" | "STRONG_DOWNTREND";
    rsiStatus: string;
    emaStatus: string;
    macdStatus: string;
    keySupport: number;
    keyResistance: number;
    details: string[];
  };
  newsSentimentAnalysis: {
    overallSentiment: "BULLISH" | "BEARISH" | "NEUTRAL";
    sentimentScore: number;
    topHeadlines: { title: string; impact: string; takeaway: string }[];
    macroDrivers: string[];
  };
  tradeSetup: {
    action: "BUY" | "SELL" | "NO_TRADE";
    orderType: "BUY_LIMIT" | "SELL_LIMIT" | "BUY_STOP" | "SELL_STOP" | "MARKET_EXECUTION" | "WAIT_NO_ORDER";
    pendingPrice: number;
    entryZone: { min: number; max: number };
    stopLoss: number;
    takeProfit1: number;
    takeProfit2: number;
    slPips: number;
    tp1Pips: number;
    tp2Pips: number;
    riskRewardRatio: string;
    oteZone?: OTEZoneInfo;
    structuralSL?: StructuralStopLossInfo;
    breakevenAdvice?: BreakevenAdvice;
    roundLevel?: RoundLevelInfo;
    trailingStop?: TrailingStopInfo;
    spreadImpact?: SpreadImpactInfo;
    volumeProfile?: VolumeProfileInfo;
    kellySizing?: KellySizingInfo;
    anchoredVwap?: AnchoredVWAPInfo;
    cvd?: CVDInfo;
    orderBlocks?: OrderBlockValidatorInfo;
    sessionSweep?: SessionSweepInfo;
    fibonacciCluster?: FibonacciClusterInfo;
    realizedVolatility?: RealizedVolatilityInfo;
    candleMicrostructure?: CandleMicrostructureInfo;
    correlationShield?: CorrelationShieldInfo;
    fvgMitigation?: FVGMitigationInfo;
    marketStructureShift?: MarketStructureShiftInfo;
    premiumDiscount?: PremiumDiscountInfo;
    keyLevelTargets?: KeyLevelTargetsInfo;
    orderFlowVelocity?: OrderFlowVelocityInfo;
    breakevenLadder?: BreakevenLadderInfo;
    liquidityVoid?: LiquidityVoidInfo;
    fibonacciExtension?: FibonacciExtensionInfo;
    footprintAbsorption?: FootprintAbsorptionInfo;
    mtfStructureMatrix?: MTFStructureMatrixInfo;
    liquidityInducement?: LiquidityInducementInfo;
    institutionalChoS?: InstitutionalChoSInfo;
    dynamicRiskBracket?: DynamicRiskBracketInfo;
    rejectionBlock?: RejectionBlockInfo;
    mcpiConviction?: MCPIConvictionInfo;
    harmonics?: HarmonicScanResult;
    ehlersMESA?: EhlersMESAInfo;
    shannonEntropy?: ShannonEntropyInfo;
    candlestickPatterns?: CandlestickScanResult;
    milestone50?: GrandQuantMilestone50Info;
    hurstExponent?: HurstExponentInfo;
    kalmanFilter?: KalmanFilterPoint;
    halfLife?: HalfLifeInfo;
    ttmSqueeze?: TTMSqueezeInfo;
    chaikinMoneyFlow?: CMFInfo;
    kama?: KAMAInfo;
    hma?: HMAInfo;
    parabolicSAR?: ParabolicSARPoint;
    aroon?: AroonInfo;
    vortex?: VortexInfo;
    fisher?: FisherTransformPoint;
    connorsRSI?: ConnorsRSIInfo;
    awesomeOsc?: AwesomeOscillatorPoint;
    tsi?: TSIInfo;
    advancedVol?: AdvancedVolatilitySuite;
    keltner?: KeltnerChannelPoint;
    donchian?: DonchianChannelPoint;
    chaikinVol?: ChaikinVolatilityInfo;
    ker?: KaufmanEfficiencyRatioInfo;
    vpci?: VPCIInfo;
    mcginley?: McGinleyDynamicPoint;
    elderForce?: ElderForceIndexInfo;
    rvi?: RelativeVolatilityIndexInfo;
    frama?: FRAMAPoint;
    milestone75?: Milestone75QuantFusionInfo;
    orderBookImbalance?: OrderBookImbalanceInfo;
    vwapVarianceBands?: VWAPVarianceBandsInfo;
    volumeVelocity?: TickVolumeVelocityInfo;
    icebergOrders?: IcebergOrderInfo;
    liquidityMatrix?: InstitutionalLiquidityMatrixInfo;
    advancedCVD?: AdvancedCVDDivergenceInfo;
    footprintCluster?: BidAskFootprintClusterInfo;
    vpinToxicity?: VPINToxicityInfo;
    liquidityVacuum?: LiquidityVacuumInfo;
    orderFlowFusion?: InstitutionalOrderFlowFusionInfo;
    kylesLambda?: KylesLambdaPriceImpactInfo;
    tradeSizeDistribution?: TradeSizeDistributionInfo;
    microPrice?: MicroPriceQueueImbalanceInfo;
    adverseSelection?: AdverseSelectionHazardInfo;
    executionEngine?: MicrostructureExecutionEngineInfo;
    crossMarketLeadLag?: CrossMarketLeadLagInfo;
    liquidityReplenishment?: LiquidityReplenishmentVelocityInfo;
    permanentPriceImpact?: PermanentPriceImpactInfo;
    algoExecutionFootprint?: AlgorithmicExecutionFootprintInfo;
    executionAlpha?: InstitutionalExecutionAlphaInfo;
    quantumProbabilityVector?: QuantumProbabilityVectorInfo;
    multiFractalHurst?: MultiFractalHurstCascadesInfo;
    fillProbabilitySlippage?: FillProbabilitySlippageInfo;
    darkPoolDealerGamma?: DarkPoolDealerGammaExposureInfo;
    sovereignSingularityAlpha?: SovereignSingularityAlphaInfo;
    classicTrio?: ClassicTrioInfo;
    suggestedLotSize?: {
      balance500: number;
      balance1k: number;
      balance5k: number;
      balance10k: number;
    };
    invalidationNote: string;
  };
  institutionalQuant?: Institutional5LayerHub;
  orchestrator?: OrchestratorDecisionInfo;
}

// ─── ANTI-CLASH ORCHESTRATOR & STRATEGY PERSONA TYPES ───

export type StrategyPresetType =
  | "AUTO_REGIME"
  | "SMC_PRICE_ACTION"
  | "QUANT_TREND_SURFER"
  | "SQUEEZE_BREAKOUT"
  | "MEAN_REVERSION_SCALPER"
  | "HARMONIC_REVERSAL";

export interface OrchestratorDecisionInfo {
  selectedPreset: StrategyPresetType;
  effectivePreset: "SMC_PRICE_ACTION" | "QUANT_TREND_SURFER" | "SQUEEZE_BREAKOUT" | "MEAN_REVERSION_SCALPER" | "HARMONIC_REVERSAL";
  regimeState: string;
  activeIndicators: string[];
  mutedIndicators: string[];
  clashResolutionReason: string;
  unifiedSignal: "BUY" | "SELL" | "HOLD_WAIT";
  confidencePct: number;
  primaryEngine: string;
  vetoTriggered: boolean;
  vetoReason?: string;
  executionAdvice: string;
}

// ─── 5-LAYER INSTITUTIONAL QUANT INTERFACES ───

export interface QuantDataHygieneInfo {
  cleanCandlesCount: number;
  outliersFiltered: number;
  dataIntegrityScore: number; // 0 - 100
  stationarityStatus: "STATIONARY" | "MILD_TREND" | "NON_STATIONARY";
  rollingZScoreRange: { min: number; max: number; current: number };
  status: string;
}

export interface IntermarketCorrelationInfo {
  baseSymbol: string;
  benchmarkSymbol: string;
  correlationR: number; // -1.00 to +1.00
  correlationRegime: "STRONG_INVERSE" | "MODERATE_INVERSE" | "DECOUPLED" | "MODERATE_POSITIVE" | "STRONG_POSITIVE";
  divergenceWarning: string | null;
  shieldAction: "PROCEED" | "REDUCE_RISK" | "FREEZE_HEDGE";
}

export interface QuantFeatureItem {
  name: string;
  code: string;
  category: "TREND" | "VOLATILITY" | "STRUCTURE" | "MOMENTUM" | "ORDER_FLOW" | "MTF";
  value: number; // -1.0 to 1.0 or normalized
  zScore: number;
  description: string;
  signal: "BULLISH" | "BEARISH" | "NEUTRAL";
}

export interface FeatureVector24D {
  features: QuantFeatureItem[];
  aggregateBullScore: number; // 0 - 100
  aggregateBearScore: number; // 0 - 100
  dominantCategory: string;
  summary: string;
}

export interface MLPredictionInfo {
  mlDirection: "BUY" | "SELL" | "NEUTRAL";
  probabilities: { buy: number; sell: number; neutral: number };
  confidence: number; // 0 - 100%
  sampleCount: number;
  modelType: "RANDOM_FOREST_ENSEMBLE" | "GRADIENT_BOOSTED_TREE";
  featureImportance: Array<{ featureName: string; weight: number; impact: "BULLISH" | "BEARISH" | "NEUTRAL" }>;
  summary: string;
}

export interface RegimeAdaptiveStrategyInfo {
  regime: MarketRegimeType;
  strategyName: string;
  strategyMode: "TREND_SURFING" | "SMC_PULLBACK_OTE" | "VOLATILITY_BREAKOUT" | "CAPITAL_PRESERVATION_WAIT" | "MEAN_REVERSION_SCALP";
  tacticalExecution: string;
  riskMultiplier: number; // 0.0 to 1.5
  targetRR: string;
  allowedOrderTypes: string[];
}

export interface InstitutionalRiskEngineInfo {
  accountBalance: number;
  riskPct: number;
  dollarRisk: number;
  atrValue: number;
  slPips: number;
  calculatedLotSize: number;
  fractionalKellyLot: number;
  kellyFraction: number;
  executionBracket: {
    entryZone: { min: number; max: number };
    structuralSL: number;
    beTriggerPrice: number;
    tp1Price: number;
    tp2Price: number;
  };
  confidenceGateStatus: "APPROVED" | "CAUTION_HALF_RISK" | "BLOCKED_WAIT";
  gateReason: string;
}

export interface WalkForwardFold {
  foldIndex: number;
  inSampleRange: string;
  outOfSampleRange: string;
  isWinRate: number;
  oosWinRate: number;
  isProfitFactor: number;
  oosProfitFactor: number;
  passed: boolean;
}

export interface WalkForwardAnalysisInfo {
  totalFolds: number;
  walkForwardEfficiency: number; // WFE %
  avgISWinRate: number;
  avgOOSWinRate: number;
  overfittingRisk: "LOW_ROBUST" | "MODERATE_ACCEPTABLE" | "HIGH_CURVE_FITTED";
  tripleBarrierStats: {
    hitUpperTP: number;
    hitLowerSL: number;
    hitVerticalTimeout: number;
  };
  robustnessGrade: "INSTITUTIONAL_ROBUST" | "ACCEPTABLE" | "OVERFITTED";
  folds: WalkForwardFold[];
  summary: string;
}

export interface Institutional5LayerHub {
  layer1Data: QuantDataHygieneInfo & { correlation: IntermarketCorrelationInfo };
  layer2Features: FeatureVector24D;
  layer3Brain: MLPredictionInfo & { adaptiveStrategy: RegimeAdaptiveStrategyInfo };
  layer4Risk: InstitutionalRiskEngineInfo;
  layer5Validation: WalkForwardAnalysisInfo;
}

// ─── GLOBAL INDICATOR TAXONOMY & MULTI-FAMILY INTERFACES ───

export interface KAMAInfo {
  period: number;
  efficiencyRatio: number;
  kamaValue: number;
  trendState: "BULLISH" | "BEARISH" | "FLAT";
  description?: string;
}

export interface HMAInfo {
  period: number;
  hmaValue: number;
  isTurningUp: boolean;
  isTurningDown: boolean;
  description?: string;
}

export interface ParabolicSARPoint {
  sar: number;
  isBullish: boolean;
  isReversal: boolean;
  description?: string;
}

export interface AroonInfo {
  aroonUp: number;
  aroonDown: number;
  oscillator: number;
  trendState: "STRONG_UPTREND" | "STRONG_DOWNTREND" | "CONSOLIDATION";
  description?: string;
}

export interface VortexInfo {
  viPlus: number;
  viMinus: number;
  trend: "BULLISH" | "BEARISH";
  strength: number;
  safetyLock15Passed?: boolean;
  description?: string;
}

export interface FisherTransformPoint {
  fisher: number;
  trigger: number;
  isExtremeOverbought: boolean;
  isExtremeOversold: boolean;
  crossSignal: "BULLISH_CROSS" | "BEARISH_CROSS" | "NONE";
  description?: string;
}

export interface ConnorsRSIInfo {
  crsi: number;
  rsiClose: number;
  streakRSI: number;
  percentRank: number;
  isExtremePullback: boolean;
  isExtremeOverbought: boolean;
  description?: string;
}

export interface TSIInfo {
  tsi: number;
  signal: number;
  isBullish: boolean;
  description?: string;
}

export interface AwesomeOscillatorPoint {
  ao: number;
  isGreen: boolean;
  isZeroCross: boolean;
  saucerSignal: "BULLISH_SAUCER" | "BEARISH_SAUCER" | "NONE";
  description?: string;
}

export interface TTMSqueezeInfo {
  isSqueezeOn: boolean; // BB inside Keltner Channel
  squeezeFired: boolean; // Squeeze just released
  momentum: number;
  momentumDirection: "INCREASING_BULL" | "DECREASING_BULL" | "INCREASING_BEAR" | "DECREASING_BEAR";
  histogramColor: "LIME" | "GREEN" | "RED" | "MAROON";
  description?: string;
}

export interface KeltnerChannelPoint {
  upper: number;
  middle: number;
  lower: number;
  bandwidth: number;
  percentB: number;
  isExpanding: boolean;
  description: string;
}

export interface DonchianChannelPoint {
  upper: number;
  middle: number;
  lower: number;
  channelWidth: number;
  breakoutState: "BULLISH_BREAKOUT_20" | "BEARISH_BREAKOUT_20" | "WITHIN_CHANNEL";
  description: string;
}

export interface ChaikinVolatilityInfo {
  cvol: number; // Rate of Change %
  volatilityTrend: "EXPANDING" | "CONTRACTING" | "CLIMAX";
  description: string;
}

export interface KaufmanEfficiencyRatioInfo {
  efficiencyRatio: number; // 0.0 to 1.0
  noiseDecouplingScore: number; // 0 to 100
  regime: "HYPER_EFFICIENT_DIRECTED" | "SMOOTH_SWING" | "MODERATE_CHOP" | "ENTANGLED_NOISE";
  description: string;
}

export interface VPCIInfo {
  vpci: number;
  vpciSignal: number;
  volumeEnergyState: "CONFIRMED_TREND" | "HOLLOW_BREAKOUT" | "VOLUME_EXHAUSTION" | "NEUTRAL";
  safetyLock17Passed: boolean;
  description: string;
}

export interface McGinleyDynamicPoint {
  md: number;
  mcginley: number;
  speedAdjustmentFactor: number;
  speedRatio: number;
  deviationPips: number;
  trendState: "BULLISH" | "BEARISH";
  description: string;
}

export interface ElderForceIndexInfo {
  efiShort: number; // EMA(2) of PriceChange * Volume
  efiLong: number; // Alias for efiTrend
  efiTrend: number; // EMA(13) of PriceChange * Volume
  forceState: "STRONG_BULL_FORCE" | "MILD_BULL_FORCE" | "STRONG_BEAR_FORCE" | "MILD_BEAR_FORCE" | "NEUTRAL";
  description: string;
}

export interface RelativeVolatilityIndexInfo {
  rvi: number; // 0 to 100
  rviSignal: number;
  volatilityDirection: "BULLISH_EXPANSION" | "BEARISH_EXPANSION" | "BALANCED";
  isExtremeOverbought: boolean;
  isExtremeOversold: boolean;
  description: string;
}

export interface FRAMAPoint {
  frama: number;
  fractalDimension: number; // D (1.0 to 2.0)
  alpha: number;
  state: "TRENDING_SMOOTH" | "CHAOTIC_FRACTAL" | "CONSOLIDATION";
  description: string;
}

export interface Milestone75QuantFusionInfo {
  milestoneScore: number; // 0 to 100
  quantScore: number;
  milestoneGrade: "INSTITUTIONAL_DOMINANCE" | "HIGH_CONVICTION" | "STANDARD" | "CAUTION_FRACTAL";
  phase3DominanceStatus: "PHASE_3_DOMINANCE_ACHIEVED" | "QUANT_ACCUMULATION";
  safetyLock18Passed: boolean;
  activePillarsCount: number; // out of 18
  safetyLocksPassedCount: number;
  description: string;
}

// ─── BATCH 16 (PLANS 76-80) INTERFACES: ORDER FLOW, LIQUIDITY & MICROSTRUCTURE ───
export interface OrderBookImbalanceInfo {
  imbalanceRatio: number; // -100 to +100 (%)
  bidDepthVolume: number;
  askDepthVolume: number;
  bidAskRatio: number; // e.g. 1.45
  bidDepthPct?: number; // e.g. 62%
  askDepthPct?: number; // e.g. 38%
  spreadPipsEstimate?: number;
  pressureState: "HEAVY_BID_PRESSURE" | "HEAVY_ASK_PRESSURE" | "BALANCED_DEPTH";
  description: string;
}

export interface VWAPVarianceBandsInfo {
  vwap: number;
  stdDev: number;
  standardDeviation?: number;
  upperBand1: number; // +1 sigma
  lowerBand1: number; // -1 sigma
  upperBand2: number; // +2 sigma (Mean reversion sell zone)
  lowerBand2: number; // -2 sigma (Mean reversion buy zone)
  upperBand3: number; // +3 sigma (Extreme exhaustion band)
  lowerBand3: number; // -3 sigma (Extreme exhaustion band)
  bandPosition: "INSIDE_SIGMA_1" | "EXPANDING_SIGMA_2" | "EXTREME_SIGMA_3";
  isMeanReversionZone: boolean;
  description: string;
}

export interface TickVolumeVelocityInfo {
  velocity: number; // First derivative of volume
  acceleration: number; // Second derivative of volume
  relativeBurstRatio: number; // Current volume vs 20-period moving average
  velocityRatio?: number;
  accelerationRatio?: number;
  isVolumeBurst: boolean; // True if sudden institutional surge
  isVolumeClimax?: boolean;
  burstDirection: "BULLISH_BURST" | "BEARISH_BURST" | "QUIET";
  description: string;
}

export interface IcebergOrderInfo {
  isIcebergDetected: boolean;
  icebergSide: "BUY_ICEBERG" | "SELL_ICEBERG" | "NONE";
  hiddenLevel: number;
  icebergPrice?: number;
  absorbedVolume: number;
  anomalyRatio?: number;
  icebergConfidencePct: number; // 0 to 100
  absorptionsCount: number;
  description: string;
}

export interface InstitutionalLiquidityMatrixInfo {
  liquidityScore: number; // 0 to 100
  liquidityState: "DEEP_INSTITUTIONAL" | "ADEQUATE" | "FRAGILE" | "LIQUIDITY_ABYSS";
  activePillarsCount: number; // out of 19
  safetyLock19Passed: boolean;
  isHighFrequencyAnomaly: boolean;
  phase4Readiness?: string;
  isSpreadClimaxRisk?: boolean;
  description: string;
}

export interface AdvancedVolatilitySuite {
  garmanKlassVol: number;
  yangZhangVol: number;
  parkinsonVol: number;
  standardDevVol: number;
  ulcerIndex: number;
  volatilityRegime: "EXTREME_LOW" | "NORMAL_EXPANSION" | "HIGH_CLIMAX";
  safetyLock16Passed?: boolean;
  description?: string;
}

export interface CMFInfo {
  cmf: number;
  capitalFlow: "STRONG_ACCUMULATION" | "MILD_ACCUMULATION" | "DISTRIBUTION" | "HEAVY_DISTRIBUTION";
  safetyLock14Passed?: boolean;
  description?: string;
}

export interface MFIInfo {
  mfi: number;
  isOverbought: boolean;
  isOversold: boolean;
}

export interface HurstExponentInfo {
  hurst: number; // 0.0 - 1.0
  marketCharacter: "PERSISTENT_TRENDING" | "RANDOM_WALK_BROWNIAN" | "MEAN_REVERTING_ANTI_PERSISTENT";
  confidence: number;
  interpretation: string;
  description?: string;
}

export interface KalmanFilterPoint {
  filteredPrice: number;
  estimationError: number;
  innovativeResidual: number;
  kalmanGain?: number;
  trendBias?: "BULLISH_ABOVE_KALMAN" | "BEARISH_BELOW_KALMAN" | "EQUILIBRIUM";
  description?: string;
}

export interface ShannonEntropyInfo {
  entropy: number; // bits
  normalizedEntropy: number; // 0 - 1
  orderliness: "HIGHLY_ORDERED_TREND" | "MODERATE_ENTROPY" | "MAXIMUM_CHAOS_NOISE";
  noisePct?: number;
  description?: string;
  safetyLock13Passed?: boolean;
}

export interface HalfLifeInfo {
  halfLifeCandles: number;
  reversionVelocity: "FAST_SCALP" | "MEDIUM_SWING" | "NON_MEAN_REVERTING";
  description?: string;
}

export interface EhlersMESAInfo {
  dominantCyclePeriod: number; // Period in bars
  inPhase: number;
  quadrature: number;
  phaseAngle: number;
  cycleState: "CYCLE_MODE" | "TREND_MODE";
  isCycleTurning?: boolean;
  description?: string;
}

export interface GrandQuantMilestone50Info {
  milestoneScore: number; // 0 to 100
  milestoneGrade: "INSTITUTIONAL_ALPHA" | "HIGH_PROBABILITY" | "STANDARD_SETUP" | "SUB_THRESHOLD";
  activePillarsCount: number; // out of 13
  safetyLocksPassedCount: number; // out of 13
  goldenTicketStatus: "GOLDEN_TICKET_APPROVED" | "WAIT_SAFETY_LOCKED";
  confluenceRatioPct: number;
  summary: string;
}

export interface HarmonicPatternMatch {
  patternName: "GARTLEY" | "BAT" | "BUTTERFLY" | "CRAB" | "CYPHER" | "SHARK" | "ABCD";
  type: "BULLISH" | "BEARISH";
  points: {
    X: { index: number; price: number };
    A: { index: number; price: number };
    B: { index: number; price: number };
    C: { index: number; price: number };
    D: { index: number; price: number };
  };
  prz: { min: number; max: number }; // Potential Reversal Zone
  confluenceScore: number; // 0 - 100%
  targetTP1: number;
  targetTP2: number;
  invalidationSL: number;
}

export interface HarmonicScanResult {
  hasPattern: boolean;
  patterns: HarmonicPatternMatch[];
  bestPattern: HarmonicPatternMatch | null;
  description?: string;
}

export interface CandlestickPatternMatch {
  pattern:
    | "BULLISH_ENGULFING"
    | "BEARISH_ENGULFING"
    | "HAMMER_PINBAR"
    | "SHOOTING_STAR_PINBAR"
    | "MORNING_STAR"
    | "EVENING_STAR"
    | "DOJI_STAR"
    | "DRAGONFLY_DOJI"
    | "GRAVESTONE_DOJI"
    | "MARUBOZU_BULL"
    | "MARUBOZU_BEAR"
    | "BULLISH_HARAMI"
    | "BEARISH_HARAMI"
    | "THREE_WHITE_SOLDIERS"
    | "THREE_BLACK_CROWS"
    | "TWEEZER_BOTTOM"
    | "TWEEZER_TOP"
    | "INSIDE_BAR_BREAKOUT";
  category: "BULLISH_REVERSAL" | "BEARISH_REVERSAL" | "CONTINUATION" | "INDECISION";
  confidence: number; // 0 - 100%
  candleIndex: number;
  description: string;
}

export interface CandlestickScanResult {
  detectedPatterns: CandlestickPatternMatch[];
  dominantSignal: "BULLISH" | "BEARISH" | "NEUTRAL";
  overallScore: number; // -100 to +100
  description?: string;
}

export interface MasterIndicatorSuite {
  trend: {
    kama: KAMAInfo;
    hma: HMAInfo;
    sar: ParabolicSARPoint;
    aroon: AroonInfo;
    vortex: VortexInfo;
  };
  momentum: {
    fisher: FisherTransformPoint;
    connorsRSI: ConnorsRSIInfo;
    tsi: TSIInfo;
    awesomeOsc: AwesomeOscillatorPoint;
  };
  volatility: {
    ttmSqueeze: TTMSqueezeInfo;
    advancedVol: AdvancedVolatilitySuite;
    keltner: KeltnerChannelPoint;
    donchian: DonchianChannelPoint;
  };
  volume: {
    cmf: CMFInfo;
    mfi: MFIInfo;
  };
  quantMath: {
    hurst: HurstExponentInfo;
    kalman: KalmanFilterPoint;
    entropy: ShannonEntropyInfo;
    halfLife: HalfLifeInfo;
  };
  dspCycles: {
    ehlersMESA: EhlersMESAInfo;
  };
  harmonics: HarmonicScanResult;
  candlestick: CandlestickScanResult;
}

export interface TelegramConfig {
  botToken: string;
  chatId: string;
}

// ─── BATCH 17 INTERFACES (PLANS 81-85: ADVANCED ORDER FLOW & MICROSTRUCTURE) ───

export interface AdvancedCVDDivergenceInfo {
  currentCVD: number;
  cvdFastEMA: number;
  cvdSlowEMA: number;
  divergenceType: "REGULAR_BULLISH" | "REGULAR_BEARISH" | "HIDDEN_BULLISH" | "HIDDEN_BEARISH" | "NONE";
  slopeDivergenceScore: number; // -100 to +100
  dominantFlow: "ACCUMULATION_FLOW" | "DISTRIBUTION_FLOW" | "BALANCED";
  description: string;
}

export interface BidAskFootprintClusterInfo {
  highWickAskVolume: number;
  lowWickBidVolume: number;
  finishedAuctionHigh: boolean;
  finishedAuctionLow: boolean;
  stackedImbalancesCount: number; // e.g. 3 stacked levels
  clusterAbsorptionSide: "BUY_ABSORPTION" | "SELL_ABSORPTION" | "NEUTRAL";
  deltaAtExtremes: number;
  description: string;
}

export interface VPINToxicityInfo {
  vpin: number; // 0.0 to 1.0 (Probability of Informed Trading / Toxic Flow)
  toxicityRegime: "BENIGN_FLOW" | "MODERATE_RISK" | "HIGH_TOXICITY" | "FLASH_CRASH_RISK";
  bucketVolume: number;
  informedTradingProbabilityPct: number; // 0 to 100%
  isToxicFlowAlert: boolean; // True if VPIN > 0.65
  description: string;
}

export interface LiquidityVacuumInfo {
  isVacuumDetected: boolean;
  vacuumType: "UPPER_VACUUM_PULL" | "LOWER_VACUUM_DROP" | "FLASH_SPREAD_VOID" | "NONE";
  thinDepthGapSizePips: number;
  ghostQuoteWithdrawalRate: number; // 0 to 100%
  expectedSlippagePips: number;
  safetyLock20Passed: boolean;
  description: string;
}

export interface InstitutionalOrderFlowFusionInfo {
  orderFlowScore: number; // 0 to 100
  flowDominance: "INSTITUTIONAL_BUY_FLOW" | "INSTITUTIONAL_SELL_FLOW" | "NEUTRAL_EQUILIBRIUM" | "CHAOTIC_TOXIC_FLOW";
  milestone85Grade: "S_TIER_ALPHA" | "A_TIER_CONVICTION" | "B_TIER_NEUTRAL" | "F_TIER_TOXIC";
  phase4Readiness: "PHASE_4_ADVANCED_MICROSTRUCTURE_ENGAGED";
  activePillarsCount: number; // out of 20
  safetyLock20Passed: boolean;
  description: string;
}

// ─── BATCH 18 INTERFACES (PLANS 86-90: HIGH-FREQUENCY MICROSTRUCTURE & EXECUTION MECHANICS) ───

export interface KylesLambdaPriceImpactInfo {
  lambda: number; // Kyle's Lambda illiquidity coefficient (price sensitivity to flow)
  priceImpactPipsPerMillion: number; // Estimated price impact per $1M / 10 lots
  marketFragilityScore: number; // 0 to 100 (100 = brittle/fragile order book, easily moved)
  fragilityState: "RESILIENT_DEEP_BOOK" | "MODERATE_LIQUIDITY" | "HIGH_FRAGILITY_THIN" | "FLASH_SLIPPAGE_ALERT";
  safetyLock21Passed: boolean;
  description: string;
}

export interface TradeSizeDistributionInfo {
  retailMicroSharePct: number; // Volume share from small lots (< 0.5 lots)
  midTierSharePct: number; // Volume share from medium lots (0.5 - 5 lots)
  institutionalBlockSharePct: number; // Volume share from block trades (5 - 20 lots)
  sovereignWhaleSharePct: number; // Volume share from whale tickets (> 20 lots)
  institutionalDominanceRatio: number; // (Block + Whale) / (Retail + Mid)
  dominantParticipant: "RETAIL_DOMINATED" | "BALANCED_FLOW" | "INSTITUTIONAL_ACCUMULATION" | "WHALE_SWEEP_ACTIVE";
  whaleAggressionDetected: boolean;
  description: string;
}

export interface MicroPriceQueueImbalanceInfo {
  microPrice: number; // Stoikov Micro-Price reflecting queue imbalance
  midPrice: number; // Standard mid-price
  microPriceDeviationPips: number; // (MicroPrice - MidPrice) in pips
  queueImbalanceRatio: number; // (Q_bid - Q_ask) / (Q_bid + Q_ask) from -1.0 to +1.0
  subSpreadMomentum: "FAST_BULLISH_DRIFT" | "FAST_BEARISH_DRIFT" | "SPREAD_EQUILIBRIUM";
  tickLeadSignal: "PREDICTIVE_UP_TICK" | "PREDICTIVE_DOWN_TICK" | "NEUTRAL_TICK";
  description: string;
}

export interface AdverseSelectionHazardInfo {
  adverseDriftPips: number; // Expected post-trade price drift against passive orders
  winnersCurseProbabilityPct: number; // 0 to 100% chance passive limit order is filled before sharp adverse move
  hazardState: "SAFE_PASSIVE_LIQUIDITY" | "MODERATE_ADVERSE_RISK" | "HIGH_ADVERSE_SELECTION";
  recommendedExecutionStyle: "PASSIVE_LIMIT_PREFERRED" | "PATIENT_PULLBACK_LIMIT" | "AGGRESSIVE_MARKET_CROSS" | "HALT_EXECUTION";
  safetyLock21Passed: boolean;
  description: string;
}

export interface MicrostructureExecutionEngineInfo {
  executionEfficiencyScore: number; // 0 to 100
  milestone90Grade: "S_TIER_OPTIMAL_EXECUTION" | "A_TIER_FAVORABLE" | "B_TIER_SUBOPTIMAL" | "F_TIER_ADVERSE_HAZARD";
  phase4Progress: "PHASE_4_EXECUTION_ENGINE_ENGAGED";
  activeMicrostructurePillarsCount: number; // out of 21
  safetyLock21Passed: boolean;
  executionReadiness: "CLEARED_FOR_EXECUTION" | "EXECUTION_THROTTLED" | "EXECUTION_BLOCKED";
  description: string;
}

// ─── BATCH 19 INTERFACES (PLANS 91-95: CROSS-MARKET LEAD-LAG & EXECUTION ALPHA) ───

export interface CrossMarketLeadLagInfo {
  leadLagLagPeriods: number; // Optimal lag tau (-3 to +3)
  leadCorrelationCoefficient: number; // Pearson r at optimal lag (-1.0 to +1.0)
  leadState: "BENCHMARK_LEADING_BULLISH" | "BENCHMARK_LEADING_BEARISH" | "ASSET_IS_LEADER" | "SYNCHRONOUS_NO_LEAD";
  predictiveLeadPips: number; // Anticipated catch-up move
  crossAssetBenchmark: string; // e.g. "DXY_INVERSE" | "US10Y" | "BTC_BETA"
  safetyLock22Passed: boolean;
  description: string;
}

export interface LiquidityReplenishmentVelocityInfo {
  replenishmentVelocityScore: number; // 0 to 100 (speed of post-trade limit order replenishment)
  cancellationRatePct: number; // 0 to 100% (rate of quote cancellations without trade)
  liquidityStickiness: "STICKY_COMMITTED_DEPTH" | "NORMAL_CHURN" | "HIGH_PHANTOM_SPOOFING";
  spoofingAlert: boolean; // True if cancellation rate > 75%
  replenishmentHalfLifeSeconds: number; // Estimated seconds to refill top of book
  description: string;
}

export interface PermanentPriceImpactInfo {
  permanentImpactRatio: number; // 0.0 to 1.0 (Hasbrouck permanent vs transitory ratio)
  informationAsymmetryPct: number; // 0 to 100% (share of volume driven by informed traders)
  priceDiscoveryRegime: "INFORMED_INSTITUTIONAL_DRIVE" | "TRANSITORY_NOISE_CHOP" | "BALANCED_DISCOVERY";
  transitoryReversionPips: number; // Estimated mean reversion from temporary liquidity shocks
  hasbrouckLambda: number; // Informed price revision coefficient
  description: string;
}

export interface AlgorithmicExecutionFootprintInfo {
  isAlgoActive: boolean; // True if systematic slicing algorithm detected
  algoType: "TWAP_SLICING" | "VWAP_ACCUMULATION" | "POV_PARTICIPATION" | "ICEBERG_DISCRETIONARY" | "NONE";
  participationRatePct: number; // 0 to 100% (target execution participation rate)
  estimatedRemainingBars: number; // Estimated bars until institutional parent order completes
  institutionalExecutionBias: "ALGO_BUYING_PROGRAM" | "ALGO_SELLING_PROGRAM" | "INACTIVE";
  cadenceRegularityScore: number; // 0 to 100 (rhythmicity score of order slicing)
  description: string;
}

export interface InstitutionalExecutionAlphaInfo {
  executionAlphaScore: number; // 0 to 100
  milestone95Grade: "S_TIER_ALPHA_SNIPER" | "A_TIER_FAVORABLE_EXECUTION" | "B_TIER_NEUTRAL" | "F_TIER_PHANTOM_HAZARD";
  phase4Progress: "PHASE_4_EXECUTION_ALPHA_ACTIVE";
  activeMicrostructurePillarsCount: number; // out of 22
  safetyLock22Passed: boolean;
  executionAlphaRecommendation: "AGGRESSIVE_FRONT_RUN_ALGO" | "PATIENT_LIQUIDITY_CAPTURE" | "HALT_SPOOFING_ALERT";
  description: string;
}

// ─── BATCH 20 (PLANS 96-100: GRAND QUANTUM SINGULARITY MILESTONE 100 - THE ULTIMATE FINALE) ───

export interface QuantumProbabilityVectorInfo {
  stateVector: {
    psiUp: number; // Amplitude squared |α|² (0.0 to 1.0)
    psiDown: number; // Amplitude squared |β|² (0.0 to 1.0)
    psiFlat: number; // Amplitude squared |γ|² (0.0 to 1.0)
  };
  quantumCoherenceScore: number; // 0 to 100 (state coherence before decoherence)
  collapseState: "SUPERPOSITION_RESOLVING_BULLISH" | "SUPERPOSITION_RESOLVING_BEARISH" | "MAXIMAL_SUPERPOSITION_ENTANGLED";
  shannonVonNeumannEntropy: number; // Quantum entropy (0.0 to 1.585 bits)
  decoherenceTimeframeBars: number; // Expected bars before wavefunction collapse
  safetyLock23Passed: boolean;
  description: string;
}

export interface MultiFractalHurstCascadesInfo {
  generalizedHurstQMinus2: number; // H(q = -2) left tail / small fluctuations
  generalizedHurstQ0: number; // H(q = 0) median scale
  generalizedHurstQ2: number; // H(q = +2) classical Hurst exponent
  singularitySpectrumWidth: number; // Δα = α_max - α_min (degree of multifractality)
  cascadePersistenceState: "PERSISTENT_MULTIFRACTAL_SUPER_TREND" | "ANTIPERSISTENT_MEAN_REVERTING" | "MONOFRACTAL_GAUSSIAN_RANDOM";
  timeframeCascadesConfluencePct: number; // 0 to 100% across M1-D1 cascades
  description: string;
}

export interface FillProbabilitySlippageInfo {
  forecastedSlippagePips: number; // Expected execution slippage in pips
  limitFillProbabilityPct: number; // 0 to 100% (probability of limit order fill within 3 bars)
  effectiveSpreadPips: number; // Half-spread + price impact
  adverseSelectionPenaltyPips: number; // Loss expected to informed order flow
  recommendedExecutionStyle: "IMMEDIATE_CROSS_ZERO_SLIPPAGE" | "PASSIVE_POST_ONLY_LIMIT" | "AGGRESSIVE_SWEEP_ALLOWED" | "HALT_HIGH_SLIPPAGE_RISK";
  fillEfficiencyGrade: "A_PERFECT_FILL" | "B_MODERATE_FRICTION" | "C_HIGH_SLIPPAGE_HAZARD";
  description: string;
}

export interface DarkPoolDealerGammaExposureInfo {
  netDealerGammaExposureScore: number; // -100 to +100 (synthetic GEX proxy)
  gammaRegime: "POSITIVE_GAMMA_VOLATILITY_SUPPRESSION" | "NEGATIVE_GAMMA_VOLATILITY_EXPLOSION" | "GAMMA_FLIP_NEUTRAL_ZONE";
  syntheticGammaFlipLevel: number; // Price level where dealer delta hedging inverts
  estimatedPinningStrike: number; // Magnet strike price where gamma concentration pulls spot
  darkPoolHiddenInventoryIndex: number; // 0 to 100 (proxy of unprinted institutional volume)
  volatilityAccelerationRisk: "HIGH_ACCELERATION_RISK" | "COMPRESSED_PINNING_STABLE" | "NORMAL_DRIFT";
  description: string;
}

export interface SovereignSingularityAlphaInfo {
  sovereignAlphaScore: number; // 0 to 100
  milestone100Grade: "S_TIER_SOVEREIGN_SINGULARITY" | "A_TIER_INSTITUTIONAL_SUPREMACY" | "B_TIER_BALANCED_ALPHA" | "F_TIER_CHAOS_LOCKOUT";
  singularityState: "SINGULARITY_CONVERGENCE_BUY" | "SINGULARITY_CONVERGENCE_SELL" | "SINGULARITY_NEUTRAL_HOLD";
  activeQuantPillarsCount: number; // 23 out of 23
  totalIndicatorsSynthesizedCount: number; // 100 out of 100
  safetyLock23Passed: boolean; // Master Singularity Shield
  safetyLocksPassedCount: number; // 23
  grandSingularityShieldActive: boolean;
  singularityRecommendation: "MAXIMAL_CONVICTION_EXECUTION" | "TACTICAL_PROBABILITY_PLAY" | "DEFENSIVE_CAPITAL_PRESERVATION";
  description: string;
}

// ─── AUTONOMOUS PILOT & MT-BRIDGE INTERFACES ───
export interface AssetScannerSummary {
  symbol: string;
  name: string;
  category: string;
  price: number;
  change24h: number;
  high24h: number;
  low24h: number;
  confluenceScore: number;
  setupGrade: string;
  signal: "STRONG_BUY" | "BUY" | "WAIT" | "SELL" | "STRONG_SELL";
  orderType: string;
  regime: string;
  isNewsFrozen: boolean;
  pendingPrice?: number;
  slPrice?: number;
  tpPrice?: number;
  distancePips: number;
  updatedAt: number;
}

export interface MtBridgeOrder {
  id: string;
  symbol: string;
  orderType: string;
  price: number;
  stopLoss: number;
  takeProfit1: number;
  takeProfit2: number;
  lotSize: number;
  confluenceScore: number;
  setupGrade: string;
  comment: string;
  status: "PENDING_HUMAN_APPROVAL" | "PENDING" | "FILLED" | "HIT_TP1" | "HIT_TP2" | "HIT_SL" | "CANCELLED";
  timestamp: number;
  expiresAt: number;
  /** Flags ที่ AI ตั้งใจให้มนุษย์ตรวจสอบก่อนส่ง order (เช่น "LOW_NEWS_CONFIDENCE", "NEWS_SIGNAL_CONFLICT") */
  aiRiskFlags: string[];
  /** true = ต้องรอมนุษย์ approve ก่อนจะส่งไป MT4/MT5 */
  requiresHumanApproval: boolean;
  /** ผู้ที่ approve (เช่น "HUMAN", หรือ username) */
  approvedBy?: string;
  /** Unix timestamp ที่ approve */
  approvedAt?: number;
}

export interface TelemetryLog {
  id: string;
  timestamp: string;
  timeMs: number;
  symbol: string;
  type: "DECISION" | "ORDER" | "RESOLVE" | "VETO" | "SCAN";
  message: string;
  confluence?: number;
  grade?: string;
  details?: Record<string, unknown>;
}

export interface AutonomousPilotConfig {
  isEnabled: boolean;
  autoDispatchTelegram: boolean;
  autoFocusHighestConfluence: boolean;
  minConfluenceThreshold: number;
  riskPercentPerTrade: number;
  accountType: "STANDARD" | "CENT";
  scanIntervalMs: number;
  /**
   * โหมดการทำงานของ Autonomous Pilot:
   * - "AUTO"        = สร้าง order และส่ง MT4/MT5 ทันที (ใช้เฉพาะ demo/paper trading)
   * - "SEMI_AUTO"   = สร้าง order แต่ status = PENDING_HUMAN_APPROVAL รอมนุษย์ confirm
   * - "SIGNAL_ONLY" = ไม่สร้าง order เลย ส่งเฉพาะ Telegram alert
   */
  approvalMode: "AUTO" | "SEMI_AUTO" | "SIGNAL_ONLY";
}

export interface ClassicTrioInfo {
  ma20: number;
  ma50: number;
  rsi14: number;
  prevRsi14: number;
  alignment: "FULL_BULLISH_TRIO" | "FULL_BEARISH_TRIO" | "PULLBACK_RETEST" | "DIVERGENT";
  isAligned: boolean;
  alignmentScore: number;
  winRateBonus: number;
  signalBias: "BULLISH" | "BEARISH" | "NEUTRAL";
  summary: string;
}