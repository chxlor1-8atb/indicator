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
}

export interface HMAInfo {
  period: number;
  hmaValue: number;
  isTurningUp: boolean;
  isTurningDown: boolean;
}

export interface ParabolicSARPoint {
  sar: number;
  isBullish: boolean;
  isReversal: boolean;
}

export interface AroonInfo {
  aroonUp: number;
  aroonDown: number;
  oscillator: number;
  trendState: "STRONG_UPTREND" | "STRONG_DOWNTREND" | "CONSOLIDATION";
}

export interface VortexInfo {
  viPlus: number;
  viMinus: number;
  trend: "BULLISH" | "BEARISH";
  strength: number;
}

export interface FisherTransformPoint {
  fisher: number;
  trigger: number;
  isExtremeOverbought: boolean;
  isExtremeOversold: boolean;
  crossSignal: "BULLISH_CROSS" | "BEARISH_CROSS" | "NONE";
}

export interface ConnorsRSIInfo {
  crsi: number;
  rsiClose: number;
  streakRSI: number;
  percentRank: number;
  isExtremePullback: boolean;
  isExtremeOverbought: boolean;
}

export interface TSIInfo {
  tsi: number;
  signal: number;
  isBullish: boolean;
}

export interface AwesomeOscillatorPoint {
  ao: number;
  isGreen: boolean;
  isZeroCross: boolean;
  saucerSignal: "BULLISH_SAUCER" | "BEARISH_SAUCER" | "NONE";
}

export interface TTMSqueezeInfo {
  isSqueezeOn: boolean; // BB inside Keltner Channel
  squeezeFired: boolean; // Squeeze just released
  momentum: number;
  momentumDirection: "INCREASING_BULL" | "DECREASING_BULL" | "INCREASING_BEAR" | "DECREASING_BEAR";
  histogramColor: "LIME" | "GREEN" | "RED" | "MAROON";
}

export interface KeltnerChannelPoint {
  upper: number;
  middle: number;
  lower: number;
}

export interface DonchianChannelPoint {
  upper: number;
  middle: number;
  lower: number;
}

export interface AdvancedVolatilitySuite {
  garmanKlassVol: number;
  yangZhangVol: number;
  parkinsonVol: number;
  standardDevVol: number;
  ulcerIndex: number;
  volatilityRegime: "EXTREME_LOW" | "NORMAL_EXPANSION" | "HIGH_CLIMAX";
}

export interface CMFInfo {
  cmf: number;
  capitalFlow: "STRONG_ACCUMULATION" | "MILD_ACCUMULATION" | "DISTRIBUTION" | "HEAVY_DISTRIBUTION";
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
}

export interface KalmanFilterPoint {
  filteredPrice: number;
  estimationError: number;
  innovativeResidual: number;
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