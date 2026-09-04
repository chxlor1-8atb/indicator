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
    suggestedLotSize?: {
      balance500: number;
      balance1k: number;
      balance5k: number;
      balance10k: number;
    };
    invalidationNote: string;
  };
}

export interface TelegramConfig {
  botToken: string;
  chatId: string;
}