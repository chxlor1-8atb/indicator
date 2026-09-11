import { Candle, IndicatorData, MasterConfluenceScore } from "./types";

export interface AdaptivePillarWeightsInput {
  trendWeight?: number;
  momentumWeight?: number;
  squeezeWeight?: number;
  volumeWeight?: number;
  smcWeight?: number;
  isSelfTuned?: boolean;
}

export function evaluateMasterConfluence(
  candles: Candle[],
  indicators: IndicatorData,
  bias: "BULLISH" | "BEARISH" | "NEUTRAL",
  adaptiveWeights?: AdaptivePillarWeightsInput
): MasterConfluenceScore {
  const wTrend = adaptiveWeights?.trendWeight ?? 25;
  const wMom = adaptiveWeights?.momentumWeight ?? 20;
  const wSq = adaptiveWeights?.squeezeWeight ?? 20;
  const wVol = adaptiveWeights?.volumeWeight ?? 15;
  const wSmc = adaptiveWeights?.smcWeight ?? 20;
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
    if (isEMA50SlopeBull) p1Score += 4;
    else p1Score -= 4; // Penalty if slope is falling against BUY
    if (isAboveVWAP) p1Score += 2; // [แผน 2] VWAP confirmation
    if (lastHA && lastHA.isUp && lastHA.hasNoLowerWick) p1Score += 2; // [แผน 1] Strong Bullish Heikin-Ashi
    if (isEmaRibbonBull) p1Score += 3; // Triple EMA Ribbon stacked bull
    if (mtf) {
      if (mtf.htfTrend === "BULLISH" || mtf.overallAlignment === "FULL_BULLISH_CONFLUENCE") p1Score += 4;
      if (mtf.isHTFConflict || mtf.htfTrend === "BEARISH") p1Score -= 6;
    }
  } else if (bias === "BEARISH") {
    if (stDirection === "DOWN") p1Score += 7;
    if (currentPrice < lastEMA200) p1Score += 5;
    if (isADXStrong) p1Score += 5;
    if (isEMA50SlopeBear) p1Score += 4;
    else p1Score -= 4; // Penalty if slope is rising against SELL
    if (!isAboveVWAP) p1Score += 2; // [แผน 2] VWAP confirmation
    if (lastHA && !lastHA.isUp && lastHA.hasNoUpperWick) p1Score += 2; // [แผน 1] Strong Bearish Heikin-Ashi
    if (isEmaRibbonBear) p1Score += 3; // Triple EMA Ribbon stacked bear
    if (mtf) {
      if (mtf.htfTrend === "BEARISH" || mtf.overallAlignment === "FULL_BEARISH_CONFLUENCE") p1Score += 4;
      if (mtf.isHTFConflict || mtf.htfTrend === "BULLISH") p1Score -= 6;
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
    if (lastRSI >= 42 && lastRSI <= 72) p2Score += 7;
    if (isRsiBullHook) p2Score += 3;
    if (lastStoch.k >= lastStoch.d) p2Score += 6;
    if (intraBar && intraBar.bias === "STRONG_BUYERS") p2Score += 4; // [แผน 5] Intra-bar live buyers
  } else if (bias === "BEARISH") {
    if (lastRSI >= 28 && lastRSI <= 58) p2Score += 7;
    if (isRsiBearHook) p2Score += 3;
    if (lastStoch.k <= lastStoch.d) p2Score += 6;
    if (intraBar && intraBar.bias === "STRONG_SELLERS") p2Score += 4; // [แผน 5] Intra-bar live sellers
  } else {
    p2Score += 8;
  }

  const p2Status = `RSI ${lastRSI.toFixed(1)} (${isRsiBullHook ? "หักหัวขึ้น" : "หักหัวลง"}) | StochRSI K: ${lastStoch.k.toFixed(1)} / D: ${lastStoch.d.toFixed(1)}${intraBar ? ` (Intra-Bar: ${intraBar.percentInRange}%)` : ""}`;

  // ─── PILLAR 3: VOLATILITY & SQUEEZE (Max 20) ───
  let p3Score = 0;
  const lastBB = indicators.bollingerBands?.slice(-1)[0] ?? { upper: currentPrice * 1.01, middle: currentPrice, lower: currentPrice * 0.99, bandwidth: 2.0 };
  const prevBB = indicators.bollingerBands && indicators.bollingerBands.length > 5 ? indicators.bollingerBands.slice(-6)[0] : lastBB;
  
  const isSqueezing = (lastBB?.bandwidth ?? 2.0) < 1.5;
  const isExpanding = (lastBB?.bandwidth ?? 2.0) > (prevBB?.bandwidth ?? 1.5);

  if (isExpanding) p3Score += 12; // Volatility expansion
  if (bias === "BULLISH" && currentPrice >= (lastBB?.middle ?? currentPrice)) p3Score += 8;
  if (bias === "BEARISH" && currentPrice <= (lastBB?.middle ?? currentPrice)) p3Score += 8;
  if (p3Score === 0) p3Score = 10;

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

  if (bias === "BULLISH") {
    if (obvTrend === "UP") p4Score += 3;
    if (cvd && (cvd.cvdTrend === "RISING" || cvd.divergence === "BULLISH_CVD_DIVERGENCE")) p4Score += 4;
    if (volDelta && volDelta.buyerVolumePct >= 52) p4Score += 3;
    if (cmf && cmf.cmf > 0.02) p4Score += 3;
    if (hasAnomalySpike) p4Score += 3;
    else if (hasVolumeSpike) p4Score += 2;
    // Contradiction penalty: buying into heavy selling volume
    if (volDelta && volDelta.sellerVolumePct >= 65 && cvd && cvd.cvdTrend === "FALLING") p4Score -= 4;
  } else if (bias === "BEARISH") {
    if (obvTrend === "DOWN") p4Score += 3;
    if (cvd && (cvd.cvdTrend === "FALLING" || cvd.divergence === "BEARISH_CVD_DIVERGENCE")) p4Score += 4;
    if (volDelta && volDelta.sellerVolumePct >= 52) p4Score += 3;
    if (cmf && cmf.cmf < -0.02) p4Score += 3;
    if (hasAnomalySpike) p4Score += 3;
    else if (hasVolumeSpike) p4Score += 2;
    // Contradiction penalty: selling into heavy buying volume
    if (volDelta && volDelta.buyerVolumePct >= 65 && cvd && cvd.cvdTrend === "RISING") p4Score -= 4;
  } else {
    p4Score += 6;
  }
  if (isVeryLowVolume) p4Score = Math.max(2, p4Score - 3);
  p4Score = Math.max(2, Math.min(15, p4Score));

  const cvdText = cvd ? `CVD: ${cvd.cvdTrend === "RISING" ? "📈 Rising" : cvd.cvdTrend === "FALLING" ? "📉 Falling" : "Flat"}` : "";
  const deltaText = volDelta ? `Delta: ${volDelta.buyerVolumePct}%B/${volDelta.sellerVolumePct}%S` : "";
  const p4Status = [
    hasAnomalySpike ? `🚨 Volume Anomaly (${indicators.volumeAnomalies?.slice(-1)[0]?.ratio}x)` : hasVolumeSpike ? `Volume Spike (+${Math.round((lastCandle.volume / avgVol) * 100 - 100)}%)` : isVeryLowVolume ? `⚠️ Low Volume Deadzone` : `OBV ${obvTrend}`,
    cvdText,
    deltaText,
  ].filter(Boolean).join(" | ");

  // ─── PILLAR 5: SMART MONEY & STRUCTURE / DEMAND-SUPPLY (Max 20) ───
  let p5Score = 0;
  const fvgs = indicators.fvgs ?? [];
  const relevantFVGs = fvgs.filter((f) => (bias === "BULLISH" ? f.type === "BULLISH" : f.type === "BEARISH"));
  const orderBlocks = indicators.orderBlocks;
  const premDisc = indicators.premiumDiscount;
  const mss = indicators.marketStructureShift;

  if (bias === "BULLISH") {
    // 1. Demand Zone / Bullish Order Block validation
    const hasBullishOB = orderBlocks?.activeBlocks?.some((b) => b.type === "BULLISH_OB" && !b.isMitigated) ?? false;
    const isAtDemandZone = orderBlocks?.activeBlocks?.some((b) => b.type === "BULLISH_OB" && currentPrice >= b.priceMin && currentPrice <= b.priceMax * 1.002) ?? false;
    if (isAtDemandZone) p5Score += 6;
    else if (hasBullishOB) p5Score += 4;

    // 2. Premium / Discount Zone Matrix (Wholesale discount)
    if (premDisc) {
      if (premDisc.zone === "DEEP_DISCOUNT" || premDisc.zone === "DISCOUNT") p5Score += 5;
      else if (premDisc.zone === "EQUILIBRIUM") p5Score += 2;
      else if (premDisc.zone === "EXTREME_PREMIUM") p5Score -= 5; // Penalty for buying top
    }

    // 3. Market Structure Shift (BOS / ChoCH displacement)
    if (mss && mss.detected && mss.type === "BULLISH_MSS") p5Score += 5;

    // 4. Fair Value Gap (Bullish Imbalance magnet)
    if (relevantFVGs.length > 0) p5Score += 4;
  } else if (bias === "BEARISH") {
    // 1. Supply Zone / Bearish Order Block validation
    const hasBearishOB = orderBlocks?.activeBlocks?.some((b) => b.type === "BEARISH_OB" && !b.isMitigated) ?? false;
    const isAtSupplyZone = orderBlocks?.activeBlocks?.some((b) => b.type === "BEARISH_OB" && currentPrice <= b.priceMax && currentPrice >= b.priceMin * 0.998) ?? false;
    if (isAtSupplyZone) p5Score += 6;
    else if (hasBearishOB) p5Score += 4;

    // 2. Premium / Discount Zone Matrix (Premium markup)
    if (premDisc) {
      if (premDisc.zone === "EXTREME_PREMIUM" || premDisc.zone === "PREMIUM") p5Score += 5;
      else if (premDisc.zone === "EQUILIBRIUM") p5Score += 2;
      else if (premDisc.zone === "DEEP_DISCOUNT") p5Score -= 5; // Penalty for shorting bottom
    }

    // 3. Market Structure Shift (BOS / ChoCH displacement)
    if (mss && mss.detected && mss.type === "BEARISH_MSS") p5Score += 5;

    // 4. Fair Value Gap (Bearish Imbalance magnet)
    if (relevantFVGs.length > 0) p5Score += 4;
  } else {
    p5Score += 8;
  }
  if (indicators.supportLevels.length > 0 && indicators.resistanceLevels.length > 0) p5Score += 2;
  p5Score = Math.max(3, Math.min(20, p5Score));

  const zoneDesc = premDisc ? `Zone: ${premDisc.zone} (${premDisc.percentile}%)` : "";
  const obDesc = orderBlocks?.nearestBlock ? `OB: ${orderBlocks.nearestBlock.type}` : "SMC: Structure Normal";
  const mssDesc = mss?.detected ? `MSS: ${mss.type}` : "";
  const p5Status = [obDesc, zoneDesc, mssDesc, relevantFVGs.length > 0 ? `${relevantFVGs.length} FVG` : ""].filter(Boolean).join(" | ");

  const p1Scaled = Math.min(wTrend, Math.round((p1Score / 25) * wTrend));
  const p2Scaled = Math.min(wMom, Math.round((p2Score / 20) * wMom));
  const p3Scaled = Math.min(wSq, Math.round((p3Score / 20) * wSq));
  const p4Scaled = Math.min(wVol, Math.round((p4Score / 15) * wVol));
  const p5Scaled = Math.min(wSmc, Math.round((p5Score / 20) * wSmc));

  // Total Confluence Score
  const totalScore = Math.min(100, Math.max(20, p1Scaled + p2Scaled + p3Scaled + p4Scaled + p5Scaled));

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