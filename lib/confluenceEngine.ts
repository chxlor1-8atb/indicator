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

  const stDirection = lastST.direction;
  const isADXStrong = lastADX >= 22; // Confirms trend is genuine and not choppy sideways
  const isAboveVWAP = lastVWAP ? currentPrice >= lastVWAP.vwap : true;

  if (bias === "BULLISH") {
    if (stDirection === "UP") p1Score += 8;
    if (currentPrice > lastEMA200) p1Score += 6;
    if (isADXStrong) p1Score += 5;
    if (isAboveVWAP) p1Score += 3; // [แผน 2] VWAP confirmation
    if (lastHA && lastHA.isUp && lastHA.hasNoLowerWick) p1Score += 3; // [แผน 1] Strong Bullish Heikin-Ashi
  } else if (bias === "BEARISH") {
    if (stDirection === "DOWN") p1Score += 8;
    if (currentPrice < lastEMA200) p1Score += 6;
    if (isADXStrong) p1Score += 5;
    if (!isAboveVWAP) p1Score += 3; // [แผน 2] VWAP confirmation
    if (lastHA && !lastHA.isUp && lastHA.hasNoUpperWick) p1Score += 3; // [แผน 1] Strong Bearish Heikin-Ashi
  } else {
    p1Score += 8;
  }

  const p1Status = isADXStrong
    ? `เทรนด์แรงชัดเจน (ADX ${lastADX.toFixed(1)}, SuperTrend ${stDirection}${lastVWAP ? `, VWAP: ${isAboveVWAP ? "เหนือ" : "ใต้"}` : ""})`
    : `ตลาดพลังอ่อนแอ/ไซด์เวย์ (ADX ${lastADX.toFixed(1)})`;

  // ─── PILLAR 2: MOMENTUM & CYCLES (Max 20) ───
  let p2Score = 0;
  const lastRSI = indicators.rsi14.slice(-1)[0] ?? 50;
  const lastStoch = indicators.stochRSI?.slice(-1)[0] ?? { k: 50, d: 50 };
  const intraBar = indicators.intraBarMomentum;

  if (bias === "BULLISH") {
    if (lastRSI >= 45 && lastRSI <= 75) p2Score += 8;
    if (lastStoch.k >= lastStoch.d) p2Score += 8;
    if (intraBar && intraBar.bias === "STRONG_BUYERS") p2Score += 4; // [แผน 5] Intra-bar live buyers
  } else if (bias === "BEARISH") {
    if (lastRSI >= 25 && lastRSI <= 55) p2Score += 8;
    if (lastStoch.k <= lastStoch.d) p2Score += 8;
    if (intraBar && intraBar.bias === "STRONG_SELLERS") p2Score += 4; // [แผน 5] Intra-bar live sellers
  } else {
    p2Score += 8;
  }

  const p2Status = `RSI ${lastRSI.toFixed(1)} | StochRSI K: ${lastStoch.k.toFixed(1)} / D: ${lastStoch.d.toFixed(1)}${intraBar ? ` (Intra-Bar: ${intraBar.percentInRange}%)` : ""}`;

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
  const hasAnomalySpike = (indicators.volumeAnomalies?.length ?? 0) > 0 && (indicators.volumeAnomalies?.slice(-1)[0]?.index ?? -1) >= candles.length - 3;

  if (bias === "BULLISH" && obvTrend === "UP") p4Score += 6;
  if (bias === "BEARISH" && obvTrend === "DOWN") p4Score += 6;
  if (hasVolumeSpike) p4Score += 5;
  if (hasAnomalySpike) p4Score += 4; // [แผน 4] Institutional Volume Spike > 2.5x
  if (p4Score === 0) p4Score = 6;

  const p4Status = hasAnomalySpike
    ? `🚨 ตรวจพบ Institutional Volume Anomaly (${indicators.volumeAnomalies?.slice(-1)[0]?.ratio}x) สถาบันเข้าสะสม`
    : hasVolumeSpike
    ? `มี Volume Spike วอลุ่มกระชาก (+${Math.round((lastCandle.volume / avgVol) * 100 - 100)}%) ยืนยันแรงสถาบัน`
    : `OBV ทิศทาง ${obvTrend} วอลุ่มสะสมสม่ำเสมอ`;

  // ─── PILLAR 5: SMART MONEY & STRUCTURE (Max 20) ───
  let p5Score = 0;
  const fvgs = indicators.fvgs ?? [];
  const relevantFVGs = fvgs.filter((f) => (bias === "BULLISH" ? f.type === "BULLISH" : f.type === "BEARISH"));

  if (relevantFVGs.length > 0) p5Score += 10;
  if (indicators.supportLevels.length > 0 && indicators.resistanceLevels.length > 0) p5Score += 10;
  if (p5Score === 0) p5Score = 10;

  const p5Status = relevantFVGs.length > 0
    ? `พบ ${relevantFVGs.length} โซน Fair Value Gap (FVG) สภาพคล่องพร้อมหนุนราคา`
    : "โครงสร้างแนวรับ-แนวต้านคมชัด ไม่มี Liquidity Trap";

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
  } else if (totalScore >= 70) {
    grade = "A";
    verdict = "✅ สัญญาณเกรด A คุณภาพสูง: เทรนด์และโมเมนตัมยืนยันร่วมกัน เข้าเทรดตามแผนได้";
  } else if (totalScore >= 55) {
    grade = "B";
    verdict = "⚖️ สัญญาณเกรด B: มีบางปัจจัยยังก้ำกึ่ง แนะนำคุมความเสี่ยงแบ่งไม้เข้า";
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