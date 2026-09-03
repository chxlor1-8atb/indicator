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

export interface MasterConfluenceScore {
  totalScore: number; // 0 - 100
  grade: "A+" | "A" | "B" | "C (Wait)";
  pillars: {
    trendRegime: { score: number; max: 25; status: string; adx: number; superTrend: "UP" | "DOWN" };
    momentumCycles: { score: number; max: 20; status: string; rsi: number; stochRsiK: number };
    volatilitySqueeze: { score: number; max: 20; status: string; isSqueezing: boolean };
    volumeFlow: { score: number; max: 15; status: string; obvTrend: "UP" | "DOWN"; hasVolumeSpike: boolean };
    smartMoneyStructure: { score: number; max: 20; status: string; fvgCount: number; structure: string };
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
  timeframeMatrix: {
    m15: "BULLISH" | "BEARISH" | "NEUTRAL";
    h1: "BULLISH" | "BEARISH" | "NEUTRAL";
    h4: "BULLISH" | "BEARISH" | "NEUTRAL";
    d1: "BULLISH" | "BEARISH" | "NEUTRAL";
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