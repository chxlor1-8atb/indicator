import {
  Candle,
  IndicatorData,
  FeatureVector24D,
  QuantFeatureItem,
  IntermarketCorrelationInfo,
  AnalysisResult,
} from "./types";
import { detectRSIDivergence } from "./indicators";

/**
 * Extracts a 24-Dimensional Normalized Quant Feature Vector (X_t) from raw market indicators and price action.
 * Every feature is normalized or bounded to [-1.0, 1.0] or [0.0, 1.0] for direct Machine Learning ingestion.
 */
export function extractFeatureVector24D(
  candles: Candle[],
  indicators: IndicatorData,
  symbol: string,
  mtfMatrix?: AnalysisResult["timeframeMatrix"],
  intermarket?: IntermarketCorrelationInfo
): FeatureVector24D {
  const features: QuantFeatureItem[] = [];
  const len = candles.length;
  const currentPrice = indicators.currentPrice;
  const lastCandle = candles[len - 1] || { open: currentPrice, high: currentPrice, low: currentPrice, close: currentPrice, volume: 100, time: 0 };

  // Helper: Get ATR value safely
  const atrArr = indicators.atr14 || [];
  const currentATR = Math.max(1e-5, atrArr[atrArr.length - 1] || currentPrice * 0.005);

  // ──────────────────────────────────────────
  // 1. TREND FEATURES
  // ──────────────────────────────────────────

  // f_adx_strength: 0 to 1
  const adxArr = indicators.adx || [];
  const lastADX = adxArr[adxArr.length - 1] ?? 25;
  const prevADX = adxArr[adxArr.length - 4] ?? lastADX;
  const adxVal = Math.min(1.0, Math.max(0.0, lastADX / 50));
  features.push({
    name: "ADX Trend Strength",
    code: "f_adx_strength",
    category: "TREND",
    value: Number(adxVal.toFixed(2)),
    zScore: Number(((lastADX - 25) / 10).toFixed(2)),
    description: `ความแข็งแกร่งของแนวโน้ม ADX: ${lastADX.toFixed(1)} (${lastADX >= 25 ? "เทรนด์ชัด" : "ไซด์เวย์"})`,
    signal: lastADX >= 25 ? "BULLISH" : "NEUTRAL",
  });

  // f_adx_slope: -1 to 1 (trend accelerating vs decelerating)
  const adxSlope = Math.max(-1.0, Math.min(1.0, (lastADX - prevADX) / 10));
  features.push({
    name: "ADX Acceleration Slope",
    code: "f_adx_slope",
    category: "TREND",
    value: Number(adxSlope.toFixed(2)),
    zScore: Number((adxSlope * 2).toFixed(2)),
    description: `ความเร่งโมเมนตัมเทรนด์ (ADX Delta): ${adxSlope >= 0 ? "+" : ""}${adxSlope.toFixed(2)}`,
    signal: adxSlope > 0.1 ? "BULLISH" : adxSlope < -0.1 ? "BEARISH" : "NEUTRAL",
  });

  // f_ema_slope_fast: EMA 20 slope
  const ema20Arr = indicators.ema20 || [];
  const lastEMA20 = ema20Arr[ema20Arr.length - 1] ?? currentPrice;
  const prevEMA20 = ema20Arr[ema20Arr.length - 4] ?? lastEMA20;
  const emaSlope = Math.max(-1.0, Math.min(1.0, ((lastEMA20 - prevEMA20) / currentATR) * 0.5));
  features.push({
    name: "EMA 20 Fast Slope",
    code: "f_ema_slope_fast",
    category: "TREND",
    value: Number(emaSlope.toFixed(2)),
    zScore: Number((emaSlope * 1.5).toFixed(2)),
    description: `ความชันเส้นค่าเฉลี่ยสปีดเร็ว EMA 20: ${emaSlope >= 0 ? "+" : ""}${emaSlope.toFixed(2)}`,
    signal: emaSlope > 0.15 ? "BULLISH" : emaSlope < -0.15 ? "BEARISH" : "NEUTRAL",
  });

  // f_ema_ribbon_spread: (EMA50 - EMA200) / ATR
  const ema50Arr = indicators.ema50 || [];
  const ema200Arr = indicators.ema200 || [];
  const lastEMA50 = ema50Arr[ema50Arr.length - 1] ?? currentPrice;
  const lastEMA200 = ema200Arr[ema200Arr.length - 1] ?? currentPrice;
  const ribbonSpread = Math.max(-1.0, Math.min(1.0, (lastEMA50 - lastEMA200) / (currentATR * 4)));
  features.push({
    name: "EMA Ribbon Spread Ratio",
    code: "f_ema_ribbon_spread",
    category: "TREND",
    value: Number(ribbonSpread.toFixed(2)),
    zScore: Number((ribbonSpread * 2).toFixed(2)),
    description: `การกางออกของ Ribbon EMA 50/200: ${ribbonSpread.toFixed(2)} ATR`,
    signal: ribbonSpread > 0.2 ? "BULLISH" : ribbonSpread < -0.2 ? "BEARISH" : "NEUTRAL",
  });

  // f_quad_ema_stack: -1, 0, 1
  const quadStack = mtfMatrix?.quadEma;
  const quadVal = quadStack?.isQuadGoldenStack ? 1.0 : quadStack?.isQuadDeathStack ? -1.0 : 0.0;
  features.push({
    name: "Quad-EMA 200 Stack Alignment",
    code: "f_quad_ema_stack",
    category: "TREND",
    value: quadVal,
    zScore: quadVal * 2.0,
    description: quadVal === 1 ? "Golden Stack สมบูรณ์ (EMA 20 > 50 > 100 > 200)" : quadVal === -1 ? "Death Stack สมบูรณ์" : "การเรียงตัวผสมผสาน",
    signal: quadVal === 1 ? "BULLISH" : quadVal === -1 ? "BEARISH" : "NEUTRAL",
  });

  // ──────────────────────────────────────────
  // 2. VOLATILITY FEATURES
  // ──────────────────────────────────────────

  // f_atr_percentile: 0 to 1
  const recentATRs = atrArr.slice(-30).filter((v): v is number => v !== null && !isNaN(v));
  const minATR = recentATRs.length ? Math.min(...recentATRs) : currentATR;
  const maxATR = recentATRs.length ? Math.max(...recentATRs) : currentATR * 1.5;
  const atrRange = maxATR - minATR || 1e-5;
  const atrPercentile = Math.max(0.0, Math.min(1.0, (currentATR - minATR) / atrRange));
  features.push({
    name: "ATR Volatility Percentile",
    code: "f_atr_percentile",
    category: "VOLATILITY",
    value: Number(atrPercentile.toFixed(2)),
    zScore: Number(((atrPercentile - 0.5) * 3).toFixed(2)),
    description: `ระดับความผันผวนสัมพัทธ์ในกรอบ: ${(atrPercentile * 100).toFixed(0)}% (${atrPercentile > 0.7 ? "ผันผวนสูง" : atrPercentile < 0.3 ? "บีบตัวต่ำ" : "ปกติ"})`,
    signal: atrPercentile < 0.25 ? "NEUTRAL" : atrPercentile > 0.8 ? "BULLISH" : "NEUTRAL",
  });

  // f_bb_bandwidth_z: Bollinger Bandwidth Squeeze / Expansion
  const bbArr = indicators.bollingerBands || [];
  const lastBB = bbArr[bbArr.length - 1] ?? { upper: currentPrice * 1.01, middle: currentPrice, lower: currentPrice * 0.99, bandwidth: 2.0 };
  const prevBB = bbArr[bbArr.length - 6] ?? lastBB;
  const bbDelta = (lastBB.bandwidth - prevBB.bandwidth) / (prevBB.bandwidth || 1);
  const bbZ = Math.max(-1.0, Math.min(1.0, bbDelta * 3));
  features.push({
    name: "Bollinger Squeeze/Expansion Z",
    code: "f_bb_bandwidth_z",
    category: "VOLATILITY",
    value: Number(bbZ.toFixed(2)),
    zScore: Number((bbZ * 1.8).toFixed(2)),
    description: lastBB.bandwidth < 1.5 ? "BB บีบตัวแคบ (Volatility Squeeze)" : bbZ > 0.2 ? "BB กำลังเปิดปากขยายตัว (Expansion)" : "กรอบความกว้างปกติ",
    signal: bbZ > 0.2 ? "BULLISH" : bbZ < -0.2 ? "BEARISH" : "NEUTRAL",
  });

  // f_realized_volatility: Realized volatility ratio
  const realizedVol = indicators.realizedVolatility?.expansionFactor ?? 1.0;
  const realVolNorm = Math.max(-1.0, Math.min(1.0, (realizedVol - 1.0) / 1.5));
  features.push({
    name: "Realized Volatility Ratio",
    code: "f_realized_volatility",
    category: "VOLATILITY",
    value: Number(realVolNorm.toFixed(2)),
    zScore: Number((realVolNorm * 2).toFixed(2)),
    description: `ความผันผวนจริงเทียบค่าเฉลี่ย: ${realizedVol.toFixed(2)}x`,
    signal: realizedVol > 1.2 ? "BULLISH" : "NEUTRAL",
  });

  // ──────────────────────────────────────────
  // 3. STRUCTURE (SMC) FEATURES
  // ──────────────────────────────────────────

  // f_fvg_proximity: Proximity to nearest active FVG in ATR units
  const fvgs = indicators.fvgs || [];
  let fvgProximity = 0;
  if (fvgs.length > 0) {
    const nearest = fvgs[fvgs.length - 1];
    const distToMid = ((nearest.top + nearest.bottom) / 2 - currentPrice) / currentATR;
    fvgProximity = Math.max(-1.0, Math.min(1.0, nearest.type === "BULLISH" ? 1.0 / (1 + Math.abs(distToMid)) : -1.0 / (1 + Math.abs(distToMid))));
  }
  features.push({
    name: "Fair Value Gap (FVG) Proximity",
    code: "f_fvg_proximity",
    category: "STRUCTURE",
    value: Number(fvgProximity.toFixed(2)),
    zScore: Number((fvgProximity * 2).toFixed(2)),
    description: fvgProximity > 0 ? "ราคาเข้าใกล้ Bullish FVG โซนเติมสภาพคล่อง" : fvgProximity < 0 ? "ราคาเข้าใกล้ Bearish FVG" : "ไม่พบ FVG ในระยะใกล้",
    signal: fvgProximity > 0.2 ? "BULLISH" : fvgProximity < -0.2 ? "BEARISH" : "NEUTRAL",
  });

  // f_liquidity_sweep: Session high/low sweep status
  const sweep = indicators.sessionSweep;
  const sweepVal = sweep?.sweepType === "BULLISH_SWEEP" ? 0.9 : sweep?.sweepType === "BEARISH_SWEEP" ? -0.9 : 0.0;
  features.push({
    name: "Liquidity Sweep Rejection",
    code: "f_liquidity_sweep",
    category: "STRUCTURE",
    value: sweepVal,
    zScore: sweepVal * 2.5,
    description: sweep?.sweepType === "BULLISH_SWEEP" ? "กวาดสภาพคล่องจุดต่ำสุดสำเร็จ (Bullish Liquidity Hunt)" : sweep?.sweepType === "BEARISH_SWEEP" ? "กวาดสภาพคล่องยอดดอย (Bearish Sweep)" : "ยังไม่มีการกวาดสภาพคล่องเด่นชัด",
    signal: sweepVal > 0 ? "BULLISH" : sweepVal < 0 ? "BEARISH" : "NEUTRAL",
  });

  // f_ote_depth: Fibonacci Optimal Trade Entry depth
  const ote = indicators.oteZone;
  let oteVal = 0;
  if (ote && ote.isPriceInOTE) {
    oteVal = ote.bias === "BULLISH" ? 0.85 : -0.85;
  }
  features.push({
    name: "Fibonacci OTE 61.8-78.6% Depth",
    code: "f_ote_depth",
    category: "STRUCTURE",
    value: oteVal,
    zScore: oteVal * 2,
    description: oteVal !== 0 ? `ราคาพักตัวเข้าสู่ Golden Pocket OTE (${ote?.fib618} - ${ote?.fib786})` : "ราคายังอยู่นอกโซน OTE",
    signal: oteVal > 0 ? "BULLISH" : oteVal < 0 ? "BEARISH" : "NEUTRAL",
  });

  // f_market_structure_shift: MSS
  const mss = indicators.marketStructureShift;
  const mssVal = mss?.type === "BULLISH_MSS" ? 1.0 : mss?.type === "BEARISH_MSS" ? -1.0 : 0.0;
  features.push({
    name: "Market Structure Shift (BOS/CHOCH)",
    code: "f_market_structure_shift",
    category: "STRUCTURE",
    value: mssVal,
    zScore: mssVal * 2,
    description: mssVal === 1.0 ? "โครงสร้างตลาดเปลี่ยนเป็นขาขึ้นชัดเจน (Bullish MSS)" : mssVal === -1.0 ? "โครงสร้างตลาดเปลี่ยนเป็นขาลง (Bearish MSS)" : "โครงสร้างทรงตัวตามกรอบ",
    signal: mssVal === 1 ? "BULLISH" : mssVal === -1 ? "BEARISH" : "NEUTRAL",
  });

  // ──────────────────────────────────────────
  // 4. MOMENTUM FEATURES
  // ──────────────────────────────────────────

  // f_rsi_normalized: -1 to +1
  const rsiArr = indicators.rsi14 || [];
  const lastRSI = rsiArr[rsiArr.length - 1] ?? 50;
  const rsiNorm = Math.max(-1.0, Math.min(1.0, (lastRSI - 50) / 50));
  features.push({
    name: "RSI Normalized Momentum",
    code: "f_rsi_normalized",
    category: "MOMENTUM",
    value: Number(rsiNorm.toFixed(2)),
    zScore: Number((rsiNorm * 2).toFixed(2)),
    description: `โมเมนตัม RSI(14): ${lastRSI.toFixed(1)} (${lastRSI > 50 ? "โซนกระทิง" : "โซนหมี"})`,
    signal: lastRSI >= 55 ? "BULLISH" : lastRSI <= 45 ? "BEARISH" : "NEUTRAL",
  });

  // f_stoch_rsi_spread: (K - D) / 100
  const stochArr = indicators.stochRSI || [];
  const lastStoch = stochArr[stochArr.length - 1] ?? { k: 50, d: 50 };
  const stochSpread = Math.max(-1.0, Math.min(1.0, (lastStoch.k - lastStoch.d) / 50));
  features.push({
    name: "StochRSI K-D Spread",
    code: "f_stoch_rsi_spread",
    category: "MOMENTUM",
    value: Number(stochSpread.toFixed(2)),
    zScore: Number((stochSpread * 1.5).toFixed(2)),
    description: `รอบแกว่งตัว StochRSI (K: ${lastStoch.k.toFixed(1)}, D: ${lastStoch.d.toFixed(1)})`,
    signal: stochSpread > 0.1 ? "BULLISH" : stochSpread < -0.1 ? "BEARISH" : "NEUTRAL",
  });

  // f_rsi_divergence: -1 to 1
  const divResult = detectRSIDivergence(candles, indicators.rsi14);
  let divVal = 0;
  if (divResult.bullishDivergence) divVal = 0.9;
  else if (divResult.bearishDivergence) divVal = -0.9;
  features.push({
    name: "Momentum Divergence Signal",
    code: "f_rsi_divergence",
    category: "MOMENTUM",
    value: divVal,
    zScore: divVal * 2.5,
    description: divVal > 0 ? "ตรวจพบ Bullish Divergence (ราคาทำ Low ใหม่แต่แรงขายหมด)" : divVal < 0 ? "ตรวจพบ Bearish Divergence (แรงซื้ออ่อนแรง)" : "ไม่มีสัญญาณ Divergence ขัดแย้ง",
    signal: divVal > 0 ? "BULLISH" : divVal < 0 ? "BEARISH" : "NEUTRAL",
  });

  // f_td_sequential_exhaustion: TD Sequential count
  const td = indicators.tdSequential;
  const tdVal = td?.exhaustionType === "SELL_EXHAUSTION_9" ? 0.85 : td?.exhaustionType === "BUY_EXHAUSTION_9" ? -0.85 : 0.0;
  features.push({
    name: "TD Sequential Count Exhaustion",
    code: "f_td_sequential_exhaustion",
    category: "MOMENTUM",
    value: tdVal,
    zScore: tdVal * 2,
    description: tdVal !== 0 ? `TD Sequential นับครบ 9 (${td?.exhaustionType === "SELL_EXHAUSTION_9" ? "แรงขายหมดตัว รอเด้ง" : "แรงซื้อตัน"})` : "TD Count อยู่ในรอบปกติ",
    signal: tdVal > 0 ? "BULLISH" : tdVal < 0 ? "BEARISH" : "NEUTRAL",
  });

  // ──────────────────────────────────────────
  // 5. ORDER FLOW & VOLUME FEATURES
  // ──────────────────────────────────────────

  // f_volume_delta_ratio: Volume Delta / Volume
  const vDelta = indicators.volumeDelta;
  const deltaRatio = vDelta ? Math.max(-1.0, Math.min(1.0, (vDelta.buyerVolumePct - vDelta.sellerVolumePct) / 100)) : 0;
  features.push({
    name: "Volume Delta Buy/Sell Ratio",
    code: "f_volume_delta_ratio",
    category: "ORDER_FLOW",
    value: Number(deltaRatio.toFixed(2)),
    zScore: Number((deltaRatio * 2).toFixed(2)),
    description: `อัตราส่วนแรงซื้อขายในแท่งสุทธิ: ${(deltaRatio * 100).toFixed(0)}%`,
    signal: deltaRatio > 0.15 ? "BULLISH" : deltaRatio < -0.15 ? "BEARISH" : "NEUTRAL",
  });

  // f_cvd_trend: Cumulative Volume Delta slope
  const cvd = indicators.cvd;
  const cvdVal = cvd?.cvdTrend === "RISING" ? 0.8 : cvd?.cvdTrend === "FALLING" ? -0.8 : 0.0;
  features.push({
    name: "Cumulative Volume Delta (CVD) Flow",
    code: "f_cvd_trend",
    category: "ORDER_FLOW",
    value: cvdVal,
    zScore: cvdVal * 2,
    description: cvd?.description || "วอลุ่มสะสมคงที่",
    signal: cvdVal > 0 ? "BULLISH" : cvdVal < 0 ? "BEARISH" : "NEUTRAL",
  });

  // f_volume_anomaly: Volume Spike anomaly ratio
  const vAnomalies = indicators.volumeAnomalies || [];
  const lastAnomaly = vAnomalies[vAnomalies.length - 1];
  const isRecentAnomaly = lastAnomaly && lastAnomaly.index >= len - 3;
  const anomalyVal = isRecentAnomaly ? (lastAnomaly.type === "BUYING_SPIKE" ? Math.min(1.0, lastAnomaly.ratio / 3) : -Math.min(1.0, lastAnomaly.ratio / 3)) : 0.0;
  features.push({
    name: "Institutional Volume Spike Anomaly",
    code: "f_volume_anomaly",
    category: "ORDER_FLOW",
    value: Number(anomalyVal.toFixed(2)),
    zScore: Number((anomalyVal * 2.5).toFixed(2)),
    description: isRecentAnomaly ? `ตรวจพบ Institutional Spike (${lastAnomaly.ratio}x ค่าเฉลี่ย)` : "ปริมาณวอลุ่มสม่ำเสมอตามเกณฑ์ปกติ",
    signal: anomalyVal > 0 ? "BULLISH" : anomalyVal < 0 ? "BEARISH" : "NEUTRAL",
  });

  // f_poc_proximity: Distance to Volume Profile POC
  const vp = indicators.volumeProfile;
  let pocProximity = 0;
  if (vp && vp.poc > 0) {
    const distPOC = (currentPrice - vp.poc) / currentATR;
    pocProximity = Math.max(-1.0, Math.min(1.0, distPOC / 3));
  }
  features.push({
    name: "Volume Profile POC Center Gravity",
    code: "f_poc_proximity",
    category: "ORDER_FLOW",
    value: Number(pocProximity.toFixed(2)),
    zScore: Number((pocProximity * 1.5).toFixed(2)),
    description: `ระยะห่างจาก Point of Control (POC ${vp?.poc || 0}): ${pocProximity.toFixed(2)} ATR`,
    signal: Math.abs(pocProximity) < 0.3 ? "NEUTRAL" : pocProximity > 0 ? "BULLISH" : "BEARISH",
  });

  // ──────────────────────────────────────────
  // 6. MACRO & MULTI-TIMEFRAME FEATURES
  // ──────────────────────────────────────────

  // f_macro_correlation: Correlation alignment
  const corrR = intermarket?.correlationR ?? -0.7;
  const corrVal = Number((corrR * -1).toFixed(2)); // Invert so positive is bullish for gold/risk
  features.push({
    name: "Intermarket Macro Correlation Factor",
    code: "f_macro_correlation",
    category: "MTF",
    value: Math.max(-1.0, Math.min(1.0, corrVal)),
    zScore: Number((corrVal * 1.5).toFixed(2)),
    description: `ความสัมพันธ์กับ ${intermarket?.benchmarkSymbol || "DXY"}: r = ${corrR.toFixed(2)}`,
    signal: corrVal > 0.2 ? "BULLISH" : corrVal < -0.2 ? "BEARISH" : "NEUTRAL",
  });

  // f_mtf_m15_confluence: M15
  const m15Val = mtfMatrix?.m15 === "BULLISH" ? 1.0 : mtfMatrix?.m15 === "BEARISH" ? -1.0 : 0.0;
  features.push({
    name: "MTF M15 Scalp Alignment",
    code: "f_mtf_m15_confluence",
    category: "MTF",
    value: m15Val,
    zScore: m15Val * 1.5,
    description: `ทิศทาง Timeframe M15: ${mtfMatrix?.m15 || "NEUTRAL"}`,
    signal: mtfMatrix?.m15 === "BULLISH" ? "BULLISH" : mtfMatrix?.m15 === "BEARISH" ? "BEARISH" : "NEUTRAL",
  });

  // f_mtf_h1_confluence: H1
  const h1Val = mtfMatrix?.h1 === "BULLISH" ? 1.0 : mtfMatrix?.h1 === "BEARISH" ? -1.0 : 0.0;
  features.push({
    name: "MTF H1 Intra-Day Alignment",
    code: "f_mtf_h1_confluence",
    category: "MTF",
    value: h1Val,
    zScore: h1Val * 2.0,
    description: `ทิศทาง Timeframe H1: ${mtfMatrix?.h1 || "NEUTRAL"}`,
    signal: mtfMatrix?.h1 === "BULLISH" ? "BULLISH" : mtfMatrix?.h1 === "BEARISH" ? "BEARISH" : "NEUTRAL",
  });

  // f_mtf_h4_d1_alignment: H4 + D1 Macro Wave
  const h4Val = mtfMatrix?.h4 === "BULLISH" ? 0.5 : mtfMatrix?.h4 === "BEARISH" ? -0.5 : 0.0;
  const d1Val = mtfMatrix?.d1 === "BULLISH" ? 0.5 : mtfMatrix?.d1 === "BEARISH" ? -0.5 : 0.0;
  const macroMtf = Number((h4Val + d1Val).toFixed(2));
  features.push({
    name: "MTF H4/D1 Macro Wave Alignment",
    code: "f_mtf_h4_d1_alignment",
    category: "MTF",
    value: macroMtf,
    zScore: macroMtf * 2.0,
    description: `คลื่นใหญ่ H4 & D1 Confluence: ${macroMtf > 0 ? "ขาขึ้นสอดคล้อง" : macroMtf < 0 ? "ขาลงสอดคล้อง" : "ก้ำกึ่ง"}`,
    signal: macroMtf > 0.3 ? "BULLISH" : macroMtf < -0.3 ? "BEARISH" : "NEUTRAL",
  });

  // ──────────────────────────────────────────
  // AGGREGATE SCORING
  // ──────────────────────────────────────────
  let totalBullWeights = 0;
  let totalBearWeights = 0;
  const categoryCounts: Record<string, { bull: number; bear: number }> = {
    TREND: { bull: 0, bear: 0 },
    VOLATILITY: { bull: 0, bear: 0 },
    STRUCTURE: { bull: 0, bear: 0 },
    MOMENTUM: { bull: 0, bear: 0 },
    ORDER_FLOW: { bull: 0, bear: 0 },
    MTF: { bull: 0, bear: 0 },
  };

  for (const f of features) {
    if (f.signal === "BULLISH") {
      totalBullWeights += Math.abs(f.value || 0.5);
      categoryCounts[f.category].bull += 1;
    } else if (f.signal === "BEARISH") {
      totalBearWeights += Math.abs(f.value || 0.5);
      categoryCounts[f.category].bear += 1;
    }
  }

  const aggregateBullScore = Math.min(100, Math.round((totalBullWeights / 16) * 100));
  const aggregateBearScore = Math.min(100, Math.round((totalBearWeights / 16) * 100));

  let dominantCategory = "STRUCTURE & MOMENTUM";
  let maxImpact = 0;
  for (const [cat, counts] of Object.entries(categoryCounts)) {
    const sum = counts.bull + counts.bear;
    if (sum > maxImpact) {
      maxImpact = sum;
      dominantCategory = cat;
    }
  }

  const summary =
    aggregateBullScore > aggregateBearScore + 20
      ? `Feature Vector ส่งสัญญาณแรงซื้อได้เปรียบ (${aggregateBullScore}% vs ${aggregateBearScore}%) ขับเคลื่อนโดยหมวด ${dominantCategory}`
      : aggregateBearScore > aggregateBullScore + 20
      ? `Feature Vector ส่งสัญญาณแรงขายครองตลาด (${aggregateBearScore}% vs ${aggregateBullScore}%) ขับเคลื่อนโดยหมวด ${dominantCategory}`
      : `Feature Vector สมดุลก้ำกึ่ง (${aggregateBullScore}% กระทิง / ${aggregateBearScore}% หมี) ตลาดกำลังเลือกทิศทาง`;

  return {
    features,
    aggregateBullScore,
    aggregateBearScore,
    dominantCategory,
    summary,
  };
}
