import {
  Candle,
  IndicatorData,
  SuperTrendPoint,
  BollingerBandPoint,
  StochRSIPoint,
  FVGItem,
  HeikinAshiPoint,
  VWAPPoint,
  VolumeAnomalyItem,
  IntraBarMomentum,
} from "./types";

export function calculateEMA(candles: Candle[], period: number): (number | null)[] {
  if (candles.length === 0) return [];
  const result: (number | null)[] = new Array(candles.length).fill(null);

  const effectivePeriod = Math.max(2, Math.min(period, candles.length));
  const k = 2 / (period + 1);

  let sum = 0;
  for (let i = 0; i < effectivePeriod; i++) {
    sum += candles[i].close;
  }
  let prevEMA = sum / effectivePeriod;
  result[effectivePeriod - 1] = Number(prevEMA.toFixed(4));

  for (let i = effectivePeriod; i < candles.length; i++) {
    const currentEMA = candles[i].close * k + prevEMA * (1 - k);
    result[i] = Number(currentEMA.toFixed(4));
    prevEMA = currentEMA;
  }

  for (let i = 0; i < effectivePeriod - 1; i++) {
    result[i] = result[effectivePeriod - 1];
  }

  return result;
}

export function calculateRSI(candles: Candle[], period = 14): (number | null)[] {
  if (candles.length < 2) return new Array(candles.length).fill(50);
  const result: (number | null)[] = new Array(candles.length).fill(50);

  const effectivePeriod = Math.min(period, candles.length - 1);
  if (effectivePeriod < 1) return result;

  let gains = 0;
  let losses = 0;

  for (let i = 1; i <= effectivePeriod; i++) {
    const change = candles[i].close - candles[i - 1].close;
    if (change > 0) gains += change;
    else losses += Math.abs(change);
  }

  let avgGain = gains / effectivePeriod;
  let avgLoss = losses / effectivePeriod;

  let rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
  const initialRSI = Number((100 - 100 / (1 + rs)).toFixed(2));
  result[effectivePeriod] = isNaN(initialRSI) ? 50 : initialRSI;

  for (let i = effectivePeriod + 1; i < candles.length; i++) {
    const change = candles[i].close - candles[i - 1].close;
    const gain = change > 0 ? change : 0;
    const loss = change < 0 ? Math.abs(change) : 0;

    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;

    rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
    const currentRSI = Number((100 - 100 / (1 + rs)).toFixed(2));
    result[i] = isNaN(currentRSI) ? 50 : currentRSI;
  }

  for (let i = 0; i < effectivePeriod; i++) {
    result[i] = result[effectivePeriod];
  }

  return result;
}

export function calculateATR(candles: Candle[], period = 14): (number | null)[] {
  const atr = new Array(candles.length).fill(null);
  if (candles.length < 2) return atr;

  const trs: number[] = [];
  trs.push(candles[0].high - candles[0].low);

  for (let i = 1; i < candles.length; i++) {
    const current = candles[i];
    const prev = candles[i - 1];
    const tr = Math.max(
      current.high - current.low,
      Math.abs(current.high - prev.close),
      Math.abs(current.low - prev.close)
    );
    trs.push(tr);
  }

  const effectivePeriod = Math.min(period, trs.length);
  let trSum = 0;
  for (let i = 0; i < effectivePeriod; i++) trSum += trs[i];
  let prevATR = trSum / effectivePeriod;
  atr[effectivePeriod - 1] = Number(prevATR.toFixed(4));

  for (let i = effectivePeriod; i < trs.length; i++) {
    const currentATR = (prevATR * (period - 1) + trs[i]) / period;
    atr[i] = Number(currentATR.toFixed(4));
    prevATR = currentATR;
  }

  for (let i = 0; i < effectivePeriod - 1; i++) {
    atr[i] = atr[effectivePeriod - 1];
  }

  return atr;
}

// ─── 1. SuperTrend Indicator (ATR-Based Trailing Stop) ───
export function calculateSuperTrend(
  candles: Candle[],
  period = 10,
  multiplier = 3.0,
  precalculatedATR?: (number | null)[]
): (SuperTrendPoint | null)[] {
  const len = candles.length;
  const result: (SuperTrendPoint | null)[] = new Array(len).fill(null);
  if (len < period) return result;

  const atrValues = precalculatedATR || calculateATR(candles, period);

  let prevUpper = 0;
  let prevLower = 0;
  let direction: "UP" | "DOWN" = "UP";

  for (let i = 0; i < len; i++) {
    const c = candles[i];
    const atr = atrValues[i] ?? Math.max(c.high - c.low, 1);
    const hl2 = (c.high + c.low) / 2;

    let basicUpper = hl2 + multiplier * atr;
    let basicLower = hl2 - multiplier * atr;

    if (i === 0) {
      prevUpper = basicUpper;
      prevLower = basicLower;
      result[i] = { value: basicLower, direction: "UP" };
      continue;
    }

    const prevClose = candles[i - 1].close;

    // Final Upper Band
    const finalUpper = basicUpper < prevUpper || prevClose > prevUpper ? basicUpper : prevUpper;
    // Final Lower Band
    const finalLower = basicLower > prevLower || prevClose < prevLower ? basicLower : prevLower;

    if (direction === "UP" && c.close < finalLower) {
      direction = "DOWN";
    } else if (direction === "DOWN" && c.close > finalUpper) {
      direction = "UP";
    }

    result[i] = {
      value: Number((direction === "UP" ? finalLower : finalUpper).toFixed(2)),
      direction,
    };

    prevUpper = finalUpper;
    prevLower = finalLower;
  }

  return result;
}

// ─── 2. Bollinger Bands (Squeeze & Expansion) ───
export function calculateBollingerBands(
  candles: Candle[],
  period = 20,
  stdDev = 2.0
): (BollingerBandPoint | null)[] {
  const len = candles.length;
  const result: (BollingerBandPoint | null)[] = new Array(len).fill(null);
  if (len < period) return result;

  let sum = 0;
  let sumSq = 0;

  for (let i = 0; i < period; i++) {
    const c = candles[i].close;
    sum += c;
    sumSq += c * c;
  }

  for (let i = period - 1; i < len; i++) {
    if (i >= period) {
      const added = candles[i].close;
      const removed = candles[i - period].close;
      sum += added - removed;
      sumSq += added * added - removed * removed;
    }

    const middle = sum / period;
    const variance = Math.max(0, sumSq / period - middle * middle);
    const std = Math.sqrt(variance);

    const upper = middle + stdDev * std;
    const lower = middle - stdDev * std;
    const bandwidth = middle !== 0 ? Number((((upper - lower) / middle) * 100).toFixed(2)) : 0;

    result[i] = {
      upper: Number(upper.toFixed(2)),
      middle: Number(middle.toFixed(2)),
      lower: Number(lower.toFixed(2)),
      bandwidth,
    };
  }

  for (let i = 0; i < period - 1; i++) {
    result[i] = result[period - 1];
  }

  return result;
}

// ─── 3. ADX (Average Directional Index - Trend Strength & Chop Filter) ───
export function calculateADX(candles: Candle[], period = 14): (number | null)[] {
  const len = candles.length;
  const result: (number | null)[] = new Array(len).fill(25);
  if (len <= period * 2) return result;

  const trs: number[] = [];
  const plusDMs: number[] = [];
  const minusDMs: number[] = [];

  for (let i = 1; i < len; i++) {
    const cur = candles[i];
    const prev = candles[i - 1];

    const tr = Math.max(cur.high - cur.low, Math.abs(cur.high - prev.close), Math.abs(cur.low - prev.close));
    trs.push(tr);

    const upMove = cur.high - prev.high;
    const downMove = prev.low - cur.low;

    plusDMs.push(upMove > downMove && upMove > 0 ? upMove : 0);
    minusDMs.push(downMove > upMove && downMove > 0 ? downMove : 0);
  }

  let smoothedTR = trs.slice(0, period).reduce((a, b) => a + b, 0);
  let smoothedPlusDM = plusDMs.slice(0, period).reduce((a, b) => a + b, 0);
  let smoothedMinusDM = minusDMs.slice(0, period).reduce((a, b) => a + b, 0);

  const dxList: number[] = [];

  for (let i = period; i < trs.length; i++) {
    smoothedTR = smoothedTR - smoothedTR / period + trs[i];
    smoothedPlusDM = smoothedPlusDM - smoothedPlusDM / period + plusDMs[i];
    smoothedMinusDM = smoothedMinusDM - smoothedMinusDM / period + minusDMs[i];

    const plusDI = smoothedTR > 0 ? (smoothedPlusDM / smoothedTR) * 100 : 0;
    const minusDI = smoothedTR > 0 ? (smoothedMinusDM / smoothedTR) * 100 : 0;

    const diDiff = Math.abs(plusDI - minusDI);
    const diSum = plusDI + minusDI;
    const dx = diSum > 0 ? (diDiff / diSum) * 100 : 0;
    dxList.push(dx);

    if (dxList.length >= period) {
      const adxAvg = dxList.slice(-period).reduce((a, b) => a + b, 0) / period;
      result[i + 1] = Number(adxAvg.toFixed(1));
    }
  }

  for (let i = 0; i < period * 2; i++) {
    result[i] = result[period * 2] || 25;
  }

  return result;
}

// ─── 4. Stochastic RSI (Cycle Turning Point) ───
export function calculateStochRSI(
  candles: Candle[],
  rsiPeriod = 14,
  stochPeriod = 14,
  smoothK = 3,
  smoothD = 3,
  precalculatedRSI?: (number | null)[]
): (StochRSIPoint | null)[] {
  const len = candles.length;
  const result: (StochRSIPoint | null)[] = new Array(len).fill({ k: 50, d: 50 });
  const rsi = precalculatedRSI || calculateRSI(candles, rsiPeriod);

  const rawStoch: number[] = [];
  for (let i = stochPeriod - 1; i < len; i++) {
    const slice = rsi.slice(i - stochPeriod + 1, i + 1).filter((v): v is number => v !== null);
    if (slice.length === 0) {
      rawStoch.push(50);
      continue;
    }
    const minR = Math.min(...slice);
    const maxR = Math.max(...slice);
    const currentR = rsi[i] ?? 50;

    const stoch = maxR - minR > 0 ? ((currentR - minR) / (maxR - minR)) * 100 : 50;
    rawStoch.push(stoch);
  }

  for (let i = smoothK - 1; i < rawStoch.length; i++) {
    const kSlice = rawStoch.slice(i - smoothK + 1, i + 1);
    const kVal = kSlice.reduce((a, b) => a + b, 0) / smoothK;
    const globalIdx = i + stochPeriod - 1;

    let dVal = kVal;
    if (i >= smoothK + smoothD - 2) {
      const dSlice = rawStoch.slice(i - smoothD + 1, i + 1);
      dVal = dSlice.reduce((a, b) => a + b, 0) / smoothD;
    }

    if (globalIdx < len) {
      result[globalIdx] = { k: Number(kVal.toFixed(1)), d: Number(dVal.toFixed(1)) };
    }
  }

  return result;
}

// ─── 5. On-Balance Volume (OBV - Institutional Volume Flow) ───
export function calculateOBV(candles: Candle[]): (number | null)[] {
  const len = candles.length;
  const obv: (number | null)[] = new Array(len).fill(0);
  if (len < 2) return obv;

  let currentOBV = candles[0].volume;
  obv[0] = currentOBV;

  for (let i = 1; i < len; i++) {
    const cur = candles[i];
    const prev = candles[i - 1];

    if (cur.close > prev.close) {
      currentOBV += cur.volume;
    } else if (cur.close < prev.close) {
      currentOBV -= cur.volume;
    }
    obv[i] = Math.round(currentOBV);
  }

  return obv;
}

// ─── 6. Smart Money Fair Value Gaps (FVG) ───
export function detectFairValueGaps(candles: Candle[], precalculatedATR?: (number | null)[]): FVGItem[] {
  const fvgs: FVGItem[] = [];
  if (candles.length < 5) return fvgs;

  const atrs = precalculatedATR || calculateATR(candles, 14);

  for (let i = 2; i < candles.length; i++) {
    const c1 = candles[i - 2];
    const c3 = candles[i];
    const currentATR = atrs[i] || Math.max(c3.high - c3.low, c3.close * 0.003);
    const minImbalanceGap = currentATR * 0.15; // At least 15% ATR to be considered institutional imbalance

    // Bullish FVG: Low of candle 3 is higher than High of candle 1 (imbalance void)
    if (c3.low > c1.high && (c3.low - c1.high) >= minImbalanceGap) {
      fvgs.push({
        type: "BULLISH",
        top: Number(c3.low.toFixed(2)),
        bottom: Number(c1.high.toFixed(2)),
        candleIndex: i - 1,
      });
    }
    // Bearish FVG: High of candle 3 is lower than Low of candle 1 (imbalance void)
    else if (c3.high < c1.low && (c1.low - c3.high) >= minImbalanceGap) {
      fvgs.push({
        type: "BEARISH",
        top: Number(c1.low.toFixed(2)),
        bottom: Number(c3.high.toFixed(2)),
        candleIndex: i - 1,
      });
    }
  }

  return fvgs.slice(-5); // Return the top 5 most recent validated FVGs
}

// ─── Price Action Candlestick Rejection Detection ───
export interface CandleRejectionResult {
  isBullishRejection: boolean;
  isBearishRejection: boolean;
  description: string;
}

export function detectCandleRejection(current: Candle, prev?: Candle): CandleRejectionResult {
  const totalRange = current.high - current.low;
  if (totalRange <= 0) {
    return { isBullishRejection: false, isBearishRejection: false, description: "Normal candle" };
  }

  const upperWick = current.high - Math.max(current.close, current.open);
  const lowerWick = Math.min(current.close, current.open) - current.low;

  const isPinBarBuy = lowerWick >= totalRange * 0.45 && current.close >= (current.high + current.low) / 2;
  const isEngulfingBuy = prev && current.close > current.open && current.close > prev.high && prev.close < prev.open;

  const isPinBarSell = upperWick >= totalRange * 0.45 && current.close <= (current.high + current.low) / 2;
  const isEngulfingSell = prev && current.close < current.open && current.close < prev.low && prev.close > prev.open;

  const isBullish = Boolean(isPinBarBuy || isEngulfingBuy);
  const isBearish = Boolean(isPinBarSell || isEngulfingSell);

  let description = "Normal Candle";
  if (isPinBarBuy) description = "Bullish Pin Bar / Rejection Wick";
  else if (isEngulfingBuy) description = "Bullish Engulfing Momentum";
  else if (isPinBarSell) description = "Bearish Shooting Star / Rejection Wick";
  else if (isEngulfingSell) description = "Bearish Engulfing Momentum";

  return { isBullishRejection: isBullish, isBearishRejection: isBearish, description };
}

// ─── RSI Divergence Detection ───
export interface DivergenceResult {
  bullishDivergence: boolean;
  bearishDivergence: boolean;
  note: string;
}

export function detectRSIDivergence(candles: Candle[], rsiValues: (number | null)[]): DivergenceResult {
  if (candles.length < 30) return { bullishDivergence: false, bearishDivergence: false, note: "Neutral" };

  const len = candles.length;
  const cCurrent = candles[len - 1];
  const rCurrent = rsiValues[len - 1] ?? 50;

  let prevSwingHighPrice = -Infinity;
  let prevSwingHighRSI = -Infinity;
  let prevSwingLowPrice = Infinity;
  let prevSwingLowRSI = Infinity;

  for (let i = len - 20; i < len - 4; i++) {
    if (candles[i].high > prevSwingHighPrice) {
      prevSwingHighPrice = candles[i].high;
      prevSwingHighRSI = rsiValues[i] ?? 50;
    }
    if (candles[i].low < prevSwingLowPrice) {
      prevSwingLowPrice = candles[i].low;
      prevSwingLowRSI = rsiValues[i] ?? 50;
    }
  }

  const bearishDivergence = cCurrent.high > prevSwingHighPrice && rCurrent < prevSwingHighRSI - 3;
  const bullishDivergence = cCurrent.low < prevSwingLowPrice && rCurrent > prevSwingLowRSI + 3;

  let note = "No divergence detected (Momentum confirms price)";
  if (bearishDivergence) note = "⚠️ Bearish Divergence: ราคาทำ New High แต่แรงซื้อ RSI ชะลอตัว ระวังกลับตัวลง";
  if (bullishDivergence) note = "🚀 Bullish Divergence: ราคาทำ New Low แต่แรงขาย RSI ลดลง มีแรงหนุนกลับตัวขึ้น";

  return { bullishDivergence, bearishDivergence, note };
}

export function calculateMACD(
  candles: Candle[],
  fastPeriod = 12,
  slowPeriod = 26,
  signalPeriod = 9
): {
  macdLine: (number | null)[];
  signalLine: (number | null)[];
  histogram: (number | null)[];
} {
  const len = candles.length;
  const macdLine: (number | null)[] = new Array(len).fill(0);
  const signalLine: (number | null)[] = new Array(len).fill(0);
  const histogram: (number | null)[] = new Array(len).fill(0);

  const fastEMA = calculateEMA(candles, fastPeriod);
  const slowEMA = calculateEMA(candles, slowPeriod);

  for (let i = 0; i < len; i++) {
    const f = fastEMA[i] ?? candles[i].close;
    const s = slowEMA[i] ?? candles[i].close;
    macdLine[i] = Number((f - s).toFixed(4));
  }

  const k = 2 / (signalPeriod + 1);
  let prevSignal = macdLine[0] ?? 0;
  signalLine[0] = prevSignal;

  for (let i = 1; i < len; i++) {
    const cur = macdLine[i] ?? 0;
    const currentSignal = cur * k + prevSignal * (1 - k);
    signalLine[i] = Number(currentSignal.toFixed(4));
    prevSignal = currentSignal;
    histogram[i] = Number((cur - currentSignal).toFixed(4));
  }

  return { macdLine, signalLine, histogram };
}

export function calculateSupportResistance(
  candles: Candle[],
  lookback = 100
): { support: number[]; resistance: number[] } {
  if (candles.length < 5) return { support: [], resistance: [] };

  const recentCandles = candles.slice(-Math.min(lookback, candles.length));
  const highs: number[] = [];
  const lows: number[] = [];

  for (let i = 1; i < recentCandles.length - 1; i++) {
    const current = recentCandles[i];
    const prev = recentCandles[i - 1];
    const next = recentCandles[i + 1];

    if (current.high >= prev.high && current.high >= next.high) {
      highs.push(current.high);
    }
    if (current.low <= prev.low && current.low <= next.low) {
      lows.push(current.low);
    }
  }

  const currentPrice = candles[candles.length - 1].close;

  let resistance = Array.from(new Set(highs.filter((h) => h > currentPrice)))
    .sort((a, b) => a - b)
    .slice(0, 3);

  let support = Array.from(new Set(lows.filter((l) => l < currentPrice)))
    .sort((a, b) => b - a)
    .slice(0, 3);

  if (resistance.length === 0) {
    const maxHigh = Math.max(...recentCandles.map((c) => c.high));
    resistance.push(Number((maxHigh > currentPrice ? maxHigh : currentPrice * 1.008).toFixed(2)));
  }
  if (support.length === 0) {
    const minLow = Math.min(...recentCandles.map((c) => c.low));
    support.push(Number((minLow < currentPrice ? minLow : currentPrice * 0.992).toFixed(2)));
  }

  return { support, resistance };
}

// ─── [แผน 1] Heikin-Ashi Smoothing Filter ───
export function calculateHeikinAshi(candles: Candle[]): HeikinAshiPoint[] {
  const result: HeikinAshiPoint[] = [];
  if (candles.length === 0) return result;

  let prevOpen = (candles[0].open + candles[0].close) / 2;
  let prevClose = (candles[0].open + candles[0].high + candles[0].low + candles[0].close) / 4;

  for (let i = 0; i < candles.length; i++) {
    const c = candles[i];
    const haClose = (c.open + c.high + c.low + c.close) / 4;
    const haOpen = i === 0 ? prevOpen : (prevOpen + prevClose) / 2;
    const haHigh = Math.max(c.high, haOpen, haClose);
    const haLow = Math.min(c.low, haOpen, haClose);
    const isUp = haClose >= haOpen;

    const threshold = (haHigh - haLow) * 0.06;
    const hasNoLowerWick = isUp && Math.abs(haLow - haOpen) <= threshold; // Strong Bullish
    const hasNoUpperWick = !isUp && Math.abs(haHigh - haOpen) <= threshold; // Strong Bearish

    result.push({
      open: Number(haOpen.toFixed(4)),
      high: Number(haHigh.toFixed(4)),
      low: Number(haLow.toFixed(4)),
      close: Number(haClose.toFixed(4)),
      isUp,
      hasNoLowerWick,
      hasNoUpperWick,
    });

    prevOpen = haOpen;
    prevClose = haClose;
  }
  return result;
}

// ─── [แผน 2] Volume Weighted Average Price (VWAP) with Standard Deviation Bands ───
export function calculateVWAP(candles: Candle[]): (VWAPPoint | null)[] {
  const result: (VWAPPoint | null)[] = [];
  if (candles.length === 0) return result;

  let cumTypicalVol = 0;
  let cumVol = 0;
  let cumTypicalVolSq = 0;

  for (let i = 0; i < candles.length; i++) {
    const c = candles[i];
    const vol = Math.max(c.volume, 1);
    const typical = (c.high + c.low + c.close) / 3;

    cumTypicalVol += typical * vol;
    cumVol += vol;
    cumTypicalVolSq += typical * typical * vol;

    const vwap = cumTypicalVol / (cumVol || 1);
    const variance = Math.max(0, (cumTypicalVolSq / (cumVol || 1)) - (vwap * vwap));
    const stdDev = Math.sqrt(variance);

    result.push({
      vwap: Number(vwap.toFixed(4)),
      upperBand: Number((vwap + 2 * stdDev).toFixed(4)),
      lowerBand: Number((vwap - 2 * stdDev).toFixed(4)),
    });
  }
  return result;
}

// ─── [แผน 4] Fractional Volume Anomaly Detection (Volume Spike > 2.5x) ───
export function detectVolumeAnomalies(candles: Candle[], lookback = 20, spikeMultiplier = 2.5): VolumeAnomalyItem[] {
  const result: VolumeAnomalyItem[] = [];
  if (candles.length < lookback) return result;

  for (let i = lookback; i < candles.length; i++) {
    let sumVol = 0;
    for (let j = i - lookback; j < i; j++) {
      sumVol += candles[j].volume;
    }
    const avgVol = sumVol / lookback;
    const curVol = candles[i].volume;

    if (avgVol > 0 && curVol >= avgVol * spikeMultiplier) {
      const isUp = candles[i].close >= candles[i].open;
      result.push({
        index: i,
        time: candles[i].time,
        volume: curVol,
        avgVolume: Math.round(avgVol),
        ratio: Number((curVol / avgVol).toFixed(2)),
        type: isUp ? "BUYING_SPIKE" : "SELLING_SPIKE",
      });
    }
  }
  return result;
}

// ─── [แผน 5] Tick-Level Intra-Bar Momentum Interpolation ───
export function calculateIntraBarMomentum(candle: Candle, livePrice: number): IntraBarMomentum {
  const range = candle.high - candle.low;
  if (range <= 0) return { percentInRange: 50, bias: "BALANCED" };
  const rawPct = ((livePrice - candle.low) / range) * 100;
  const percentInRange = Math.max(0, Math.min(100, Math.round(rawPct)));

  let bias: "STRONG_BUYERS" | "STRONG_SELLERS" | "BALANCED" = "BALANCED";
  if (percentInRange >= 75) bias = "STRONG_BUYERS";
  else if (percentInRange <= 25) bias = "STRONG_SELLERS";

  return { percentInRange, bias };
}

export function calculateAllIndicators(candles: Candle[]): IndicatorData {
  if (candles.length === 0) {
    return {
      rsi14: [],
      ema20: [],
      ema50: [],
      ema200: [],
      macd: { macdLine: [], signalLine: [], histogram: [] },
      supportLevels: [],
      resistanceLevels: [],
      currentPrice: 0,
      priceChange24h: 0,
      priceChangePercent24h: 0,
    };
  }

  const currentPrice = candles[candles.length - 1].close;
  const firstPrice = candles[0].close;
  const priceChange24h = Number((currentPrice - firstPrice).toFixed(4));
  const priceChangePercent24h = Number(((priceChange24h / firstPrice) * 100).toFixed(2));

  const rsi14 = calculateRSI(candles, 14);
  const atr14 = calculateATR(candles, 14);
  const atr10 = calculateATR(candles, 10);
  const ema20 = calculateEMA(candles, 20);
  const ema50 = calculateEMA(candles, 50);
  const ema200 = calculateEMA(candles, 200);
  const macd = calculateMACD(candles, 12, 26, 9);
  const superTrend = calculateSuperTrend(candles, 10, 3.0, atr10);
  const bollingerBands = calculateBollingerBands(candles, 20, 2.0);
  const stochRSI = calculateStochRSI(candles, 14, 14, 3, 3, rsi14);
  const adx = calculateADX(candles, 14);
  const obv = calculateOBV(candles);
  const fvgs = detectFairValueGaps(candles, atr14);
  const { support, resistance } = calculateSupportResistance(candles);

  // Batch 1: Quant-grade Accuracy Indicators
  const heikinAshi = calculateHeikinAshi(candles);
  const vwap = calculateVWAP(candles);
  const volumeAnomalies = detectVolumeAnomalies(candles, 20, 2.5);
  const intraBarMomentum = calculateIntraBarMomentum(candles[candles.length - 1], currentPrice);

  return {
    rsi14,
    ema20,
    ema50,
    ema200,
    macd,
    superTrend,
    bollingerBands,
    stochRSI,
    adx,
    obv,
    fvgs,
    supportLevels: support,
    resistanceLevels: resistance,
    currentPrice,
    priceChange24h,
    priceChangePercent24h,
    heikinAshi,
    vwap,
    volumeAnomalies,
    intraBarMomentum,
  };
}