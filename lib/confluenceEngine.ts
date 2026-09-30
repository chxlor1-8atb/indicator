import { Candle, IndicatorData, MasterConfluenceScore, PairDivergenceResult, CalendarSafetyStatus, BreakoutConfirmationInfo } from "./types";

export interface AdaptivePillarWeightsInput {
  trendWeight?: number;
  momentumWeight?: number;
  squeezeWeight?: number;
  volumeWeight?: number;
  smcWeight?: number;
  isSelfTuned?: boolean;
}

export interface ConfluenceContextOptions {
  currencyDivergence?: PairDivergenceResult;
  calendarSafety?: CalendarSafetyStatus;
  breakoutInfo?: BreakoutConfirmationInfo;
}

export function evaluateMasterConfluence(
  candles: Candle[],
  indicators: IndicatorData,
  bias: "BULLISH" | "BEARISH" | "NEUTRAL",
  adaptiveWeights?: AdaptivePillarWeightsInput,
  contextOptions?: ConfluenceContextOptions
): MasterConfluenceScore {
  const weights = {
    trendWeight: adaptiveWeights?.trendWeight ?? 25,
    momentumWeight: adaptiveWeights?.momentumWeight ?? 20,
    squeezeWeight: adaptiveWeights?.squeezeWeight ?? 20,
    volumeWeight: adaptiveWeights?.volumeWeight ?? 15,
    smcWeight: adaptiveWeights?.smcWeight ?? 20,
  };

  // Normalize weights to sum = 100
  const rawSum = Object.values(weights).reduce((a: number, b: number) => a + b, 0);
  if (rawSum > 0 && Math.abs(rawSum - 100) > 0.01) {
    const normFactor = 100 / rawSum;
    for (const k of Object.keys(weights)) {
      (weights as any)[k] = (weights as any)[k] * normFactor;
    }
  }

  const wTrend = weights.trendWeight;
  const wMom = weights.momentumWeight;
  const wSq = weights.squeezeWeight;
  const wVol = weights.volumeWeight;
  const wSmc = weights.smcWeight;
  const isSelfTuned = Boolean(adaptiveWeights?.isSelfTuned);

  const len = candles.length;
  if (len < 20) {
    return {
      totalScore: 50,
      grade: "C (Wait)",
      pillars: {
        trendRegime: { score: 12, max: wTrend, status: "Insufficient history", adx: 20, superTrend: "UP" },
        momentumCycles: { score: 10, max: wMom, status: "Neutral", rsi: 50, stochRsiK: 50 },
        volatilitySqueeze: { score: 10, max: wSq, status: "Normal", isSqueezing: false },
        volumeFlow: { score: 8, max: wVol, status: "Average", obvTrend: "UP", hasVolumeSpike: false },
        smartMoneyStructure: { score: 10, max: wSmc, status: "Neutral", fvgCount: 0, structure: "Consolidation" },
      },
      verdict: "รอสะสมข้อมูลแท่งเทียนให้ครบถ้วนก่อนยืนยันสัญญาณ",
    };
  }

  const currentPrice = indicators.currentPrice;
  const currentATR = indicators.atr14?.slice(-1)[0] ?? (currentPrice * 0.005);
  const lastCandle = candles[len - 1];

  // ─── PILLAR 1: TREND & REGIME (Max 25) ───
  let p1Score = 0;
  const lastST = indicators.superTrend?.slice(-1)[0] ?? { value: currentPrice, direction: "UP" };
  const lastADX = indicators.adx?.slice(-1)[0] ?? 25;
  const lastEMA200 = indicators.ema200.slice(-1)[0] ?? currentPrice;
  const lastVWAP = indicators.vwap?.slice(-1)[0];
  const lastHA = indicators.heikinAshi?.slice(-1)[0];
  const ema50List = indicators.ema50 ?? [];
  const lastEMA50 = ema50List.slice(-1)[0] ?? currentPrice;
  const prevEMA50_3 = ema50List.length >= 4 ? (ema50List.slice(-4)[0] ?? lastEMA50) : lastEMA50;
  const isEMA50SlopeBull = lastEMA50 >= prevEMA50_3;
  const isEMA50SlopeBear = lastEMA50 <= prevEMA50_3;

  const stDirection = lastST.direction;
  const isADXStrong = lastADX >= 22; // Confirms trend is genuine and not choppy sideways
  const isAboveVWAP = lastVWAP ? currentPrice >= lastVWAP.vwap : true;

  // Multi-Timeframe Ribbon Convergence (H1 + H4 + D1)
  const mtf = indicators.mtfStructureMatrix;
  const lastEMA20 = indicators.ema20?.slice(-1)[0] ?? currentPrice;
  const isEmaRibbonBull = currentPrice > lastEMA20 && lastEMA20 > lastEMA50 && lastEMA50 > lastEMA200;
  const isEmaRibbonBear = currentPrice < lastEMA20 && lastEMA20 < lastEMA50 && lastEMA50 < lastEMA200;

  if (bias === "BULLISH") {
    if (stDirection === "UP") p1Score += 7;
    if (currentPrice > lastEMA200) p1Score += 5;
    if (isADXStrong) p1Score += 5;
    else if (lastADX < 18) p1Score -= 6; // Chop / Sideways deadzone penalty
    const currentATR = indicators.atr14?.slice(-1)[0] ?? (currentPrice * 0.005);
    if (currentATR > 0 && Math.abs(currentPrice - lastEMA200) > currentATR * 2.5) p1Score -= 5; // Climax overextension penalty
    if (isEMA50SlopeBull) p1Score += 4;
    else p1Score -= 4; // Penalty if slope is falling against BUY
    if (isAboveVWAP) p1Score += 2; // [แผน 2] VWAP confirmation
    if (lastHA && lastHA.isUp && lastHA.hasNoLowerWick) p1Score += 2; // [แผน 1] Strong Bullish Heikin-Ashi
    if (isEmaRibbonBull) p1Score += 3; // Triple EMA Ribbon stacked bull
    if (mtf) {
      if (mtf.overallAlignment === "FULL_BULLISH_CONFLUENCE") p1Score += 6;
      else if (mtf.htfTrend === "BULLISH") p1Score += 4;
      if (mtf.isHTFConflict) p1Score -= 9;
      else if (mtf.htfTrend === "BEARISH") p1Score -= 7;
    }
    const mtfConf = indicators.mtfConfluence;
    if (mtfConf) {
      if (mtfConf.alignmentStatus === "STRONG_BULLISH_CONFLUENCE") p1Score += 5;
      else if (mtfConf.alignmentStatus === "MODERATE_BULLISH_CONFLUENCE") p1Score += 3;
      else if (mtfConf.alignmentStatus === "STRONG_BEARISH_CONFLUENCE") p1Score -= 8;
      else if (mtfConf.alignmentStatus === "MODERATE_BEARISH_CONFLUENCE") p1Score -= 5;
    }
    const pb = indicators.pullbackQuality;
    if (pb) {
      if (pb.state === "HEALTHY_VALUE_ZONE") p1Score += 4;
      else if (pb.state === "FOMO_OVEREXTENDED") p1Score -= 7;
      if (pb.rejectionConfirmed) p1Score += 2;
    }
    const cColor = indicators.candlestickPatterns?.candleColorRatio;
    if (cColor) {
      if (cColor.dominantBias === "BULLISH" && cColor.bullRatio >= 0.60) p1Score += 3; // [Folder 9] Green dominance
      else if (cColor.dominantBias === "BEARISH" && cColor.bearRatio >= 0.60) p1Score -= 4; // Penalty: red counter-trend
    }
  } else if (bias === "BEARISH") {
    if (stDirection === "DOWN") p1Score += 7;
    if (currentPrice < lastEMA200) p1Score += 5;
    if (isADXStrong) p1Score += 5;
    else if (lastADX < 18) p1Score -= 6; // Chop / Sideways deadzone penalty
    const currentATR = indicators.atr14?.slice(-1)[0] ?? (currentPrice * 0.005);
    if (currentATR > 0 && Math.abs(currentPrice - lastEMA200) > currentATR * 2.5) p1Score -= 5; // Climax overextension penalty
    if (isEMA50SlopeBear) p1Score += 4;
    else p1Score -= 4; // Penalty if slope is rising against SELL
    if (!isAboveVWAP) p1Score += 2; // [แผน 2] VWAP confirmation
    if (lastHA && !lastHA.isUp && lastHA.hasNoUpperWick) p1Score += 2; // [แผน 1] Strong Bearish Heikin-Ashi
    if (isEmaRibbonBear) p1Score += 3; // Triple EMA Ribbon stacked bear
    if (mtf) {
      if (mtf.overallAlignment === "FULL_BEARISH_CONFLUENCE") p1Score += 6;
      else if (mtf.htfTrend === "BEARISH") p1Score += 4;
      if (mtf.isHTFConflict) p1Score -= 9;
      else if (mtf.htfTrend === "BULLISH") p1Score -= 7;
    }
    const mtfConf = indicators.mtfConfluence;
    if (mtfConf) {
      if (mtfConf.alignmentStatus === "STRONG_BEARISH_CONFLUENCE") p1Score += 5;
      else if (mtfConf.alignmentStatus === "MODERATE_BEARISH_CONFLUENCE") p1Score += 3;
      else if (mtfConf.alignmentStatus === "STRONG_BULLISH_CONFLUENCE") p1Score -= 8;
      else if (mtfConf.alignmentStatus === "MODERATE_BULLISH_CONFLUENCE") p1Score -= 5;
    }
    const pb = indicators.pullbackQuality;
    if (pb) {
      if (pb.state === "HEALTHY_VALUE_ZONE") p1Score += 4;
      else if (pb.state === "FOMO_OVEREXTENDED") p1Score -= 7;
      if (pb.rejectionConfirmed) p1Score += 2;
    }
    const cColor = indicators.candlestickPatterns?.candleColorRatio;
    if (cColor) {
      if (cColor.dominantBias === "BEARISH" && cColor.bearRatio >= 0.60) p1Score += 3; // [Folder 9] Red dominance
      else if (cColor.dominantBias === "BULLISH" && cColor.bullRatio >= 0.60) p1Score -= 4; // Penalty: green counter-trend
    }
  } else {
    p1Score += 8;
  }
  p1Score = Math.max(0, p1Score);

  const p1Status = isADXStrong
    ? `เทรนด์ชัดเจน (ADX ${lastADX.toFixed(1)}, SuperTrend ${stDirection}, EMA50 Slope ${bias === "BULLISH" ? (isEMA50SlopeBull ? "ชันขึ้น" : "หัวทิ่ม") : (isEMA50SlopeBear ? "กดลง" : "เงยขึ้น")}${mtf ? `, HTF: ${mtf.htfTrend}` : ""})`
    : `ตลาดพลังอ่อนแอ/ไซด์เวย์ (ADX ${lastADX.toFixed(1)})`;

  // ─── PILLAR 2: MOMENTUM & CYCLES (Max 20) ───
  let p2Score = 0;
  const lastRSI = indicators.rsi14.slice(-1)[0] ?? 50;
  const prevRSI = indicators.rsi14.length >= 2 ? (indicators.rsi14.slice(-2)[0] ?? lastRSI) : lastRSI;
  const isRsiBullHook = lastRSI >= prevRSI;
  const isRsiBearHook = lastRSI <= prevRSI;
  const lastStoch = indicators.stochRSI?.slice(-1)[0] ?? { k: 50, d: 50 };
  const intraBar = indicators.intraBarMomentum;

  if (bias === "BULLISH") {
    if (lastRSI >= 42 && lastRSI <= 66) p2Score += 7;
    else if (lastRSI > 66 && lastRSI <= 70) p2Score += 3;
    else if (lastRSI > 70) p2Score -= 4; // Overbought peak exhaustion penalty
    else if (lastRSI >= 30 && lastRSI < 42) {
      // Healthy pullback dip in bull trend
      if (isRsiBullHook) p2Score += 6; // Hooking up out of dip -> high probability bounce!
      else p2Score += 2;
    } else if (lastRSI < 30) {
      p2Score -= 3; // Extreme collapse
    }
    if (isRsiBullHook) p2Score += 3;
    if (lastStoch.k >= lastStoch.d) p2Score += 6;
    if (intraBar && intraBar.bias === "STRONG_BUYERS") p2Score += 4; // [แผน 5] Intra-bar live buyers
    const rsiInst = indicators.rsiInstitutional;
    if (rsiInst) {
      if (rsiInst.hookState === "BULLISH_EXIT_HOOK") p2Score += 5;
      if (rsiInst.divergenceAtZone === "BULLISH_DIVERGENCE_AT_SUPPORT") p2Score += 4;
      if (rsiInst.hookState === "BULLISH_TREND_SUPPORT") p2Score += 3;
    }
    const twoBar = indicators.candlestickPatterns?.twoBarConfirmation;
    if (twoBar && twoBar.isConfirmed && twoBar.type === "BULLISH_CONFIRMATION") {
      p2Score += 3; // [Folder 3 & 9] Two-bar confirmation bounce
    }
  } else if (bias === "BEARISH") {
    if (lastRSI >= 34 && lastRSI <= 58) p2Score += 7;
    else if (lastRSI >= 30 && lastRSI < 34) p2Score += 3;
    else if (lastRSI < 30) p2Score -= 4; // Oversold bottom exhaustion penalty
    else if (lastRSI > 58 && lastRSI <= 70) {
      // Healthy rally pullback in bear trend
      if (isRsiBearHook) p2Score += 6; // Hooking down out of rally -> high probability rejection!
      else p2Score += 2;
    } else if (lastRSI > 70) {
      p2Score -= 3; // Extreme upside counter-momentum
    }
    if (isRsiBearHook) p2Score += 3;
    if (lastStoch.k <= lastStoch.d) p2Score += 6;
    if (intraBar && intraBar.bias === "STRONG_SELLERS") p2Score += 4; // [แผน 5] Intra-bar live sellers
    const rsiInst = indicators.rsiInstitutional;
    if (rsiInst) {
      if (rsiInst.hookState === "BEARISH_EXIT_HOOK") p2Score += 5;
      if (rsiInst.divergenceAtZone === "BEARISH_DIVERGENCE_AT_RESISTANCE") p2Score += 4;
      if (rsiInst.hookState === "BEARISH_TREND_RESISTANCE") p2Score += 3;
    }
    const twoBar = indicators.candlestickPatterns?.twoBarConfirmation;
    if (twoBar && twoBar.isConfirmed && twoBar.type === "BEARISH_CONFIRMATION") {
      p2Score += 3; // [Folder 3 & 9] Two-bar confirmation rejection
    }
  } else {
    p2Score += 8;
  }

  const rsiHookNote = indicators.rsiInstitutional?.hookState && indicators.rsiInstitutional.hookState !== "NEUTRAL"
    ? ` • ⚡ ${indicators.rsiInstitutional.hookState.replace(/_/g, " ")}`
    : "";
  const p2Status = `RSI ${lastRSI.toFixed(1)} (${isRsiBullHook ? "หักหัวขึ้น" : "หักหัวลง"})${rsiHookNote} | StochRSI K: ${lastStoch.k.toFixed(1)} / D: ${lastStoch.d.toFixed(1)}${intraBar ? ` (Intra-Bar: ${intraBar.percentInRange}%)` : ""}`;

  // ─── PILLAR 3: VOLATILITY & SQUEEZE (Max 20) ───
  let p3Score = 0;
  const lastBB = indicators.bollingerBands?.slice(-1)[0] ?? { upper: currentPrice * 1.01, middle: currentPrice, lower: currentPrice * 0.99, bandwidth: 2.0 };
  const prevBB = indicators.bollingerBands && indicators.bollingerBands.length > 5 ? indicators.bollingerBands.slice(-6)[0] : lastBB;
  
  // Dynamic relative expansion & squeeze (works across Forex, Gold, Crypto)
  const isExpanding = prevBB?.bandwidth ? (lastBB?.bandwidth ?? 0) > prevBB.bandwidth * 1.05 : false;
  const isSqueezing = prevBB?.bandwidth ? (lastBB?.bandwidth ?? 0) < prevBB.bandwidth * 0.92 : false;

  if (isExpanding) p3Score += 12; // Volatility expansion
  if (bias === "BULLISH" && currentPrice >= (lastBB?.middle ?? currentPrice)) p3Score += 8;
  if (bias === "BEARISH" && currentPrice <= (lastBB?.middle ?? currentPrice)) p3Score += 8;

  // TTM Squeeze Integration (John Carter Squeeze)
  const ttmSqueeze = indicators.ttmSqueeze;
  if (ttmSqueeze?.isSqueezeOn) {
    p3Score += 5; // Squeeze = energy building for breakout
  }
  // Realized Volatility Regime
  const realVol = indicators.realizedVolatility;
  if (realVol) {
    if (realVol.volState === "EXPANSION" && isExpanding) p3Score += 3;
    else if (realVol.volState === "COMPRESSION" && isSqueezing) p3Score += 3;
  }

  if (p3Score === 0) p3Score = 10;
  p3Score = Math.min(p3Score, 28);
  const p3Status = isSqueezing
    ? "Bollinger Bands Squeeze กำลังสะสมพลังรอระเบิด"
    : isExpanding
    ? "Bollinger Bands ขยายตัว รองรับการวิ่งของโมเมนตัม"
    : "กรอบความผันผวนอยู่ในระดับมาตรฐาน";

  // ─── PILLAR 4: VOLUME & INSTITUTIONAL FLOW (Max 15) ───
  let p4Score = 0;
  const obvList = indicators.obv?.filter((v): v is number => v !== null) ?? [];
  const recentOBV = obvList.slice(-1)[0] ?? 0;
  const prevOBV = obvList.length > 10 ? obvList.slice(-10)[0] : recentOBV;
  const obvTrend: "UP" | "DOWN" = recentOBV >= prevOBV ? "UP" : "DOWN";

  const avgVol = candles.slice(-20).reduce((a, c) => a + c.volume, 0) / 20;
  const hasVolumeSpike = lastCandle.volume > avgVol * 1.3;
  const isVeryLowVolume = avgVol > 0 && lastCandle.volume < avgVol * 0.65;
  const hasAnomalySpike = (indicators.volumeAnomalies?.length ?? 0) > 0 && (indicators.volumeAnomalies?.slice(-1)[0]?.index ?? -1) >= candles.length - 3;

  const cvd = indicators.cvd;
  const volDelta = indicators.volumeDelta;
  const cmf = indicators.chaikinMoneyFlow;
  const advVp = indicators.advancedVolumeProfile;
  const fp = indicators.footprintAnalysis;

  if (bias === "BULLISH") {
    if (obvTrend === "UP") p4Score += 3;
    if (cvd && (cvd.cvdTrend === "RISING" || cvd.divergence === "BULLISH_CVD_DIVERGENCE")) p4Score += 4;
    if (volDelta && volDelta.buyerVolumePct >= 52) p4Score += 3;
    if (cmf && cmf.cmf > 0.02) p4Score += 3;
    if (hasAnomalySpike) p4Score += 3;
    else if (hasVolumeSpike) p4Score += 2;
    // Advanced Volume Profile & Footprint Confluence
    if (advVp && (advVp.volumeImbalance.imbalanceStatus === "STRONG_BUYING" || advVp.volumeImbalance.imbalanceStatus === "MODERATE_BUYING")) {
      p4Score += 2;
    }
    if (fp?.deltaDivergence?.detected && fp.deltaDivergence.type === "BULLISH_DIVERGENCE") {
      p4Score += 3; // Institutional absorption
    }
    if (fp?.orderFlowSentiment === "STRONG_BUY" || fp?.orderFlowSentiment === "MODERATE_BUY") {
      p4Score += 2;
    }
    // Contradiction penalty: buying into heavy selling volume or bearish divergence
    if (volDelta && volDelta.sellerVolumePct >= 65 && cvd && cvd.cvdTrend === "FALLING") p4Score -= 4;
    if (advVp?.volumeImbalance.imbalanceStatus === "STRONG_SELLING") p4Score -= 3;
    if (fp?.deltaDivergence?.detected && fp.deltaDivergence.type === "BEARISH_DIVERGENCE") p4Score -= 4;
  } else if (bias === "BEARISH") {
    if (obvTrend === "DOWN") p4Score += 3;
    if (cvd && (cvd.cvdTrend === "FALLING" || cvd.divergence === "BEARISH_CVD_DIVERGENCE")) p4Score += 4;
    if (volDelta && volDelta.sellerVolumePct >= 52) p4Score += 3;
    if (cmf && cmf.cmf < -0.02) p4Score += 3;
    if (hasAnomalySpike) p4Score += 3;
    else if (hasVolumeSpike) p4Score += 2;
    // Advanced Volume Profile & Footprint Confluence
    if (advVp && (advVp.volumeImbalance.imbalanceStatus === "STRONG_SELLING" || advVp.volumeImbalance.imbalanceStatus === "MODERATE_SELLING")) {
      p4Score += 2;
    }
    if (fp?.deltaDivergence?.detected && fp.deltaDivergence.type === "BEARISH_DIVERGENCE") {
      p4Score += 3; // Institutional exhaustion
    }
    if (fp?.orderFlowSentiment === "STRONG_SELL" || fp?.orderFlowSentiment === "MODERATE_SELL") {
      p4Score += 2;
    }
    // Contradiction penalty: selling into heavy buying volume or bullish divergence
    if (volDelta && volDelta.buyerVolumePct >= 65 && cvd && cvd.cvdTrend === "RISING") p4Score -= 4;
    if (advVp?.volumeImbalance.imbalanceStatus === "STRONG_BUYING") p4Score -= 3;
    if (fp?.deltaDivergence?.detected && fp.deltaDivergence.type === "BULLISH_DIVERGENCE") p4Score -= 4;
  } else {
    p4Score += 6;
  }
  if (isVeryLowVolume) p4Score = Math.max(2, p4Score - 3);

  // Volume Profile POC Proximity
  const vpoc = indicators.volumeProfile;
  if (vpoc && vpoc.poc > 0) {
    const lastATR = indicators.atr14 && indicators.atr14.length > 0 ? (indicators.atr14[indicators.atr14.length - 1] ?? 0) : 0;
    if (lastATR > 0) {
      const pocDistance = Math.abs(currentPrice - vpoc.poc) / lastATR;
      if (bias === "BULLISH" && vpoc.poc < currentPrice && pocDistance < 1.5) p4Score += 2;
      else if (bias === "BEARISH" && vpoc.poc > currentPrice && pocDistance < 1.5) p4Score += 2;
    }
  }

  p4Score = Math.max(2, Math.min(15, p4Score));

  const cvdText = cvd ? `CVD: ${cvd.cvdTrend === "RISING" ? "📈 Rising" : cvd.cvdTrend === "FALLING" ? "📉 Falling" : "Flat"}` : "";
  const deltaText = volDelta ? `Delta: ${volDelta.buyerVolumePct}%B/${volDelta.sellerVolumePct}%S` : "";
  const advVpText = advVp ? `Imbalance: ${advVp.volumeImbalance.imbalanceStatus.replace("_", " ")}` : "";
  const fpDivergenceText = fp?.deltaDivergence?.detected ? `⚡ FP: ${fp.deltaDivergence.type === "BULLISH_DIVERGENCE" ? "Absorption" : "Exhaustion"}` : "";
  const p4Status = [
    hasAnomalySpike ? `🚨 Volume Anomaly (${indicators.volumeAnomalies?.slice(-1)[0]?.ratio}x)` : hasVolumeSpike ? `Volume Spike (+${Math.round((lastCandle.volume / avgVol) * 100 - 100)}%)` : isVeryLowVolume ? `⚠️ Low Volume Deadzone` : `OBV ${obvTrend}`,
    cvdText,
    deltaText,
    advVpText,
    fpDivergenceText
  ].filter(Boolean).join(" | ");

  // ─── PILLAR 5: SMART MONEY & STRUCTURE / DEMAND-SUPPLY (Max 20) ───
  let p5Score = 0;
  const fvgs = indicators.fvgs ?? [];
  const relevantFVGs = fvgs.filter((f) => (bias === "BULLISH" ? f.type === "BULLISH" : f.type === "BEARISH") && !f.mitigated);
  const orderBlocks = indicators.orderBlocks;
  const premDisc = indicators.premiumDiscount;
  const mss = indicators.marketStructureShift;

  if (bias === "BULLISH") {
    // 1. Demand Zone / Bullish Order Block validation
    const hasBullishOB = orderBlocks?.activeBlocks?.some((b) => b.type === "BULLISH_OB" && !b.isMitigated) ?? false;
    const isAtDemandZone = orderBlocks?.activeBlocks?.some((b) => b.type === "BULLISH_OB" && currentPrice >= b.priceMin && currentPrice <= b.priceMax * 1.002) ?? false;
    if (isAtDemandZone) p5Score += 6;
    else if (hasBullishOB) p5Score += 4;

    // 1b. Order Block Price Action Reversal Confirmation (PA Reversal in OB)
    const obPARev = indicators.obPAReversal;
    if (obPARev && obPARev.detected) {
      if (obPARev.type === "BULLISH_OB_REVERSAL") {
        p5Score += 7; // Institutional confirmation: Price rejected Bullish OB with Pin Bar/Engulfing/Turtle Soup!
      } else if (obPARev.type === "BEARISH_OB_REVERSAL") {
        p5Score -= 6; // Opposing Bearish OB PA Reversal against BUY
      }
    }

    // 2. Premium / Discount Zone Matrix (Wholesale discount)
    if (premDisc) {
      if (premDisc.zone === "DEEP_DISCOUNT" || premDisc.zone === "DISCOUNT") p5Score += 5;
      else if (premDisc.zone === "EQUILIBRIUM") p5Score += 2;
      else if (premDisc.zone === "EXTREME_PREMIUM") p5Score -= 6; // Penalty for buying top
      else if (premDisc.zone === "PREMIUM") p5Score -= 3; // Penalty for buying expensive premium
    }

    // 3. Market Structure Shift (BOS / ChoCH displacement)
    if (mss && mss.detected) {
      if (mss.type === "BULLISH_MSS") {
        p5Score += mss.displacementMultiplier >= 1.1 ? 6 : 4;
      } else if (mss.type === "BEARISH_MSS" && mss.displacementMultiplier >= 1.1) {
        p5Score -= 5; // Opposing Bearish CHoCH displacement penalty
      }
    }

    // 3b. Quasimodo Pattern (QML Retest & Hold - "มาถึง QM ไม่หลุด QM")
    const qm = indicators.quasimodo;
    if (qm && qm.detected) {
      if (qm.type === "BULLISH_QM") {
        if (qm.isQmlHeld) p5Score += 6;
        else if (qm.status === "ARMED") p5Score += 3;
      } else if (qm.type === "BEARISH_QM" && qm.isQmlHeld && qm.qmlPrice > currentPrice && (qm.qmlPrice - currentPrice) < currentATR * 1.8) {
        p5Score -= 6; // Opposing Bearish QM ceiling directly overhead
      }
    }

    // 4. Fair Value Gap (Bullish Imbalance magnet)
    if (relevantFVGs.length > 0) p5Score += 4;
  } else if (bias === "BEARISH") {
    // 1. Supply Zone / Bearish Order Block validation
    const hasBearishOB = orderBlocks?.activeBlocks?.some((b) => b.type === "BEARISH_OB" && !b.isMitigated) ?? false;
    const isAtSupplyZone = orderBlocks?.activeBlocks?.some((b) => b.type === "BEARISH_OB" && currentPrice <= b.priceMax && currentPrice >= b.priceMin * 0.998) ?? false;
    if (isAtSupplyZone) p5Score += 6;
    else if (hasBearishOB) p5Score += 4;

    // 1b. Order Block Price Action Reversal Confirmation (PA Reversal in OB)
    const obPARev = indicators.obPAReversal;
    if (obPARev && obPARev.detected) {
      if (obPARev.type === "BEARISH_OB_REVERSAL") {
        p5Score += 7; // Institutional confirmation: Price rejected Bearish OB with Pin Bar/Engulfing/Turtle Soup!
      } else if (obPARev.type === "BULLISH_OB_REVERSAL") {
        p5Score -= 6; // Opposing Bullish OB PA Reversal against SELL
      }
    }

    // 2. Premium / Discount Zone Matrix (Premium markup)
    if (premDisc) {
      if (premDisc.zone === "EXTREME_PREMIUM" || premDisc.zone === "PREMIUM") p5Score += 5;
      else if (premDisc.zone === "EQUILIBRIUM") p5Score += 2;
      else if (premDisc.zone === "DEEP_DISCOUNT") p5Score -= 6; // Penalty for shorting bottom
      else if (premDisc.zone === "DISCOUNT") p5Score -= 3; // Penalty for shorting cheap discount
    }

    // 3. Market Structure Shift (BOS / ChoCH displacement)
    if (mss && mss.detected) {
      if (mss.type === "BEARISH_MSS") {
        p5Score += mss.displacementMultiplier >= 1.1 ? 6 : 4;
      } else if (mss.type === "BULLISH_MSS" && mss.displacementMultiplier >= 1.1) {
        p5Score -= 5; // Opposing Bullish CHoCH displacement penalty
      }
    }

    // 3b. Quasimodo Pattern (QML Retest & Hold - "มาถึง QM ไม่หลุด QM")
    const qm = indicators.quasimodo;
    if (qm && qm.detected) {
      if (qm.type === "BEARISH_QM") {
        if (qm.isQmlHeld) p5Score += 6;
        else if (qm.status === "ARMED") p5Score += 3;
      } else if (qm.type === "BULLISH_QM" && qm.isQmlHeld && qm.qmlPrice < currentPrice && (currentPrice - qm.qmlPrice) < currentATR * 1.8) {
        p5Score -= 6; // Opposing Bullish QM floor directly below
      }
    }

    // 4. Fair Value Gap (Bearish Imbalance magnet)
    if (relevantFVGs.length > 0) p5Score += 4;
  } else {
    p5Score += 8;
  }
  if (indicators.supportLevels.length > 0 && indicators.resistanceLevels.length > 0) p5Score += 2;

  // [E-Book Folder 9 & 10: Zone-Anchored Candlesticks & S/R Role Reversal Flip]
  const patterns = indicators.candlestickPatterns?.detectedPatterns ?? [];
  const hasAnchoredPattern = patterns.some((p) => p.isZoneAnchored);
  if (hasAnchoredPattern) p5Score += 3;

  const isRoleReversed = indicators.clusteredSR?.supports.some((s) => s.isRoleReversed) || indicators.clusteredSR?.resistances.some((r) => r.isRoleReversed);
  if (isRoleReversed) p5Score += 2;

  // Session Liquidity Sweep Confluence
  const sessionSweep = indicators.sessionSweep;
  if (sessionSweep && sessionSweep.sweepType !== "NONE") {
    if ((bias === "BULLISH" && sessionSweep.sweepType === "BULLISH_SWEEP") ||
        (bias === "BEARISH" && sessionSweep.sweepType === "BEARISH_SWEEP")) {
      p5Score += 5;
    } else {
      p5Score -= 3; // Opposing sweep
    }
  }

  p5Score = Math.max(0, Math.min(20, p5Score));

  const zoneDesc = premDisc ? `Zone: ${premDisc.zone} (${premDisc.percentile}%)` : "";
  const obDesc = orderBlocks?.nearestBlock ? `OB: ${orderBlocks.nearestBlock.type}` : "SMC: Structure Normal";
  const mssDesc = mss?.detected ? `MSS: ${mss.type}` : "";
  const obPARev = indicators.obPAReversal;
  const obPAText = obPARev?.detected ? `🏛️ OB PA: ${obPARev.reversalPattern}` : "";
  const p5Status = [obPAText, obDesc, zoneDesc, mssDesc, relevantFVGs.length > 0 ? `${relevantFVGs.length} FVG` : ""].filter(Boolean).join(" | ");

  // Clamp raw scores to their natural maximums before proportional scaling.
  // Without clamping, stacking bonuses (E-Book pullback +4+2, MTF +6, MTFConf +5 on top of base 21)
  // would cause p1 to hit 45+ and p2 to hit 32+, distorting the weighted output.
  const p1Clamped = Math.max(0, Math.min(25, p1Score));
  const p2Clamped = Math.max(0, Math.min(20, p2Score));
  const p1Scaled = Math.min(wTrend, Math.round((p1Clamped / 25) * wTrend));
  const p2Scaled = Math.min(wMom, Math.round((p2Clamped / 20) * wMom));
  const p3Scaled = Math.min(wSq, Math.round((p3Score / 20) * wSq));
  const p4Scaled = Math.min(wVol, Math.round((p4Score / 15) * wVol));
  const p5Scaled = Math.min(wSmc, Math.round((p5Score / 20) * wSmc));

  // ─── MACRO & RELATIVE CURRENCY STRENGTH (FINVIZ CSM) ───
  let macroScoreDelta = 0;
  const csm = contextOptions?.currencyDivergence;
  if (csm) {
    if (bias === "BULLISH") {
      if (csm.alignment === "STRONG_BULLISH") macroScoreDelta += 6;
      else if (csm.alignment === "MODERATE_BULLISH") macroScoreDelta += 3;
      else if (csm.alignment === "STRONG_BEARISH") macroScoreDelta -= 10;
      else if (csm.alignment === "MODERATE_BEARISH") macroScoreDelta -= 5;
      else if (csm.alignment === "NEUTRAL") macroScoreDelta -= 2;
    } else if (bias === "BEARISH") {
      if (csm.alignment === "STRONG_BEARISH") macroScoreDelta += 6;
      else if (csm.alignment === "MODERATE_BEARISH") macroScoreDelta += 3;
      else if (csm.alignment === "STRONG_BULLISH") macroScoreDelta -= 10;
      else if (csm.alignment === "MODERATE_BULLISH") macroScoreDelta -= 5;
      else if (csm.alignment === "NEUTRAL") macroScoreDelta -= 2;
    }
  }

  // Total Confluence Score (Bounded 20-100)
  let totalScore = Math.min(100, Math.max(20, p1Scaled + p2Scaled + p3Scaled + p4Scaled + p5Scaled + macroScoreDelta));

  let grade: MasterConfluenceScore["grade"] = "C (Wait)";
  let verdict = "คะแนนสัญญาณต่ำกว่าเกณฑ์ความปลอดภัย แนะนำให้ WAIT / ถือเงินสด";

  if (totalScore >= 85) {
    grade = "A+";
    verdict = "🌟 สัญญาณเกรด A+ ระดับสถาบัน: 5 เสาหลักสอดคล้องกันสมบูรณ์แบบ ได้เปรียบสูงสุด";
  } else if (totalScore >= 75) {
    grade = "A";
    verdict = "✅ สัญญาณเกรด A คุณภาพสูง: เทรนด์และโมเมนตัมยืนยันร่วมกัน เข้าเทรดตามแผนได้";
  } else if (totalScore >= 60) {
    grade = "B";
    verdict = "⚖️ สัญญาณเกรด B (เฝ้าระวัง): ปัจจัยก้ำกึ่ง ยังไม่ผ่านเกณฑ์ Sniper (แนะนำ WAIT เพื่อรักษา Win Rate)";
  }

  // HTF Conflict Guard: If MTF has direct HTF conflict, cap grade at B and warn
  if (mtf?.isHTFConflict) {
    if (grade === "A+" || grade === "A") {
      grade = "B";
    }
    verdict = `🛡️ HTF Conflict Guard: สัญญาณขัดแย้งกับโครงสร้างระดับใหญ่ (${mtf.htfTrend}) - แนะนำชะลอการเข้าออเดอร์เพื่อป้องกัน False Breakout`;
  }

  // ─── [8-IMAGE MATRIX] BREAKOUT CONFIRMATION & FALSE BREAKOUT TRAP SHIELD ───
  const bInfo = contextOptions?.breakoutInfo;
  if (bInfo) {
    if (bInfo.breakoutType === "VALID_BREAKOUT" || bInfo.retestState === "RETEST_BOUNCED") {
      const bonus = (bInfo.checklistScore && bInfo.checklistScore >= 6) || bInfo.retestState === "RETEST_BOUNCED" ? 8 : 5;
      totalScore = Math.min(100, totalScore + bonus);
      if (totalScore >= 85) grade = "A+";
      else if (totalScore >= 75) grade = "A";
      verdict += bInfo.retestState === "RETEST_BOUNCED"
        ? ` • 💎 Break & Retest Bounced ยืนยันสมบูรณ์ (Win-Rate 80%+)`
        : ` • 🚀 Institutional Breakout ยืนยัน (${bInfo.checklistScore || 6}/7 ข้อ | Vol ${bInfo.volumeRatio || 1.5}x | Win-Rate 75-80%)`;
    } else if (bInfo.breakoutType === "FALSE_BREAKOUT_TRAP") {
      totalScore = Math.max(20, totalScore - 12);
      if (grade === "A+" || grade === "A") {
        grade = "B";
      }
      verdict = `⚠️ False Breakout Trap Shield: ตรวจพบไส้เทียนต้าน ${(bInfo.oppositeWickRatio ? bInfo.oppositeWickRatio * 100 : 45).toFixed(0)}% ขาด Volume หนุน - ระงับการเปิด Follow เพื่อป้องกันการโดนลาก`;
    }
  }

  // ─── [8-IMAGE S/R ZONE & S-R FLIP CONFLUENCE] ───
  const cSR = indicators.clusteredSR;
  if (cSR) {
    if (cSR.srFlipDetected) {
      totalScore = Math.min(100, totalScore + 6);
      verdict += " • ⚡ S-R Flip ยืนยันการสลับหน้าที่แนวรับ-ต้าน";
    }
    if (bias === "BULLISH" && cSR.activeZoneState === "INSIDE_SUPPORT_ZONE") {
      const rev = cSR.nearestSupport?.reversalPattern;
      if (rev === "BULLISH_PINBAR" || rev === "BULLISH_ENGULFING") {
        totalScore = Math.min(100, totalScore + 7);
        verdict += ` • 🎯 เด้งรับโซน Support พร้อม ${rev}`;
      }
    } else if (bias === "BEARISH" && cSR.activeZoneState === "INSIDE_RESISTANCE_ZONE") {
      const rev = cSR.nearestResistance?.reversalPattern;
      if (rev === "BEARISH_PINBAR" || rev === "BEARISH_ENGULFING") {
        totalScore = Math.min(100, totalScore + 7);
        verdict += ` • 🎯 เด้งต้านโซน Resistance พร้อม ${rev}`;
      }
    }
  }

  // Forex Factory Red Folder Safety Freeze
  if (contextOptions?.calendarSafety && !contextOptions.calendarSafety.tradeAllowed) {
    totalScore = Math.min(totalScore, 50);
    grade = "C (Wait)";
    verdict = `🔴 Forex Factory Shield: ตลาดติดข่าวกล่องแดงแรงสูง (${contextOptions.calendarSafety.badgeText}) - ระงับคำสั่งอัตโนมัติเพื่อป้องกันสเปรดถ่าง`;
  }

  if (csm && (csm.alignment === "STRONG_BULLISH" || csm.alignment === "STRONG_BEARISH")) {
    verdict += ` • 🌐 Finviz Macro: ${csm.description.slice(0, 65)}...`;
  }

  if (isSelfTuned) {
    verdict += " (⚡ ปรับค่าน้ำหนักตัวชี้วัดอัตโนมัติตามสถิติผลแพ้ชนะจริงในฐานข้อมูล)";
  }

  return {
    totalScore,
    grade,
    pillars: {
      trendRegime: { score: p1Scaled, max: wTrend, status: p1Status, adx: lastADX, superTrend: stDirection },
      momentumCycles: { score: p2Scaled, max: wMom, status: p2Status, rsi: lastRSI, stochRsiK: lastStoch.k },
      volatilitySqueeze: { score: p3Scaled, max: wSq, status: p3Status, isSqueezing },
      volumeFlow: { score: p4Scaled, max: wVol, status: p4Status, obvTrend, hasVolumeSpike },
      smartMoneyStructure: { score: p5Scaled, max: wSmc, status: p5Status, fvgCount: relevantFVGs.length, structure: "Valid BOS" },
    },
    verdict,
  };
}