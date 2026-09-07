import { Candle, IndicatorData, MarketRegimeInfo, OrchestratorDecisionInfo, StrategyPresetType } from "./types";

interface OrchestratorInput {
  candles: Candle[];
  indicators: IndicatorData;
  regimeInfo?: MarketRegimeInfo;
  userPreset?: StrategyPresetType;
}

/**
 * Anti-Clash Strategy Orchestrator Engine
 * Enforces indicator orthogonality, silences clashing counter-signals,
 * and dynamically activates the single most mathematically coherent toolset.
 */
export function orchestrateStrategyDecision(input: OrchestratorInput): OrchestratorDecisionInfo {
  const { candles, indicators, regimeInfo, userPreset = "AUTO_REGIME" } = input;
  const currentPrice = candles.length > 0 ? candles[candles.length - 1].close : indicators.currentPrice;

  // ─── 1. EXTRACT REGIME & MARKET PHYSICS ───
  const hurst = indicators.masterSuite?.quantMath.hurst.hurst ?? 0.50;
  const isSqueezeActive = indicators.masterSuite?.volatility.ttmSqueeze.isSqueezeOn ??
    (indicators.bollingerBands && indicators.bollingerBands.length > 0
      ? (indicators.bollingerBands[indicators.bollingerBands.length - 1]?.bandwidth ?? 5) < 2.0
      : false);

  const isStrongTrend = hurst > 0.54 || (indicators.adx && indicators.adx.length > 0 ? (indicators.adx[indicators.adx.length - 1] ?? 0) > 25 : false);
  const isChopMarket = hurst < 0.46 || (indicators.adx && indicators.adx.length > 0 ? (indicators.adx[indicators.adx.length - 1] ?? 0) < 18 : false);
  const hasHarmonicPattern = indicators.masterSuite?.harmonics.hasPattern ?? false;

  // ─── 2. DETERMINE EFFECTIVE PRESET ───
  let effectivePreset: OrchestratorDecisionInfo["effectivePreset"] = "SMC_PRICE_ACTION";

  if (userPreset === "AUTO_REGIME") {
    if (isSqueezeActive) {
      effectivePreset = "SQUEEZE_BREAKOUT";
    } else if (hasHarmonicPattern) {
      effectivePreset = "HARMONIC_REVERSAL";
    } else if (isStrongTrend) {
      effectivePreset = indicators.orderBlocks?.nearestBlock ? "SMC_PRICE_ACTION" : "QUANT_TREND_SURFER";
    } else if (isChopMarket) {
      effectivePreset = "MEAN_REVERSION_SCALPER";
    } else {
      effectivePreset = "SMC_PRICE_ACTION";
    }
  } else {
    effectivePreset = userPreset;
  }

  // ─── 3. ENFORCE REGIME-GATED MUTING (ANTI-CLASH FILTERS) ───
  let activeIndicators: string[] = [];
  let mutedIndicators: string[] = [];
  let clashResolutionReason = "";

  switch (effectivePreset) {
    case "SMC_PRICE_ACTION":
      activeIndicators = [
        "🏛️ Order Blocks (OB & Rejection Blocks)",
        "⚡ Fair Value Gaps (FVG Mitigation)",
        "📐 Market Structure Shift (MSS/BOS)",
        "🎯 Optimal Trade Entry (OTE Fib 61.8-78.6%)",
        "🪤 Liquidity Inducement Trap Detector",
      ];
      mutedIndicators = [
        "⛔ RSI Overbought/Oversold (Muted: สถาบันไม่ใช้ RSI ในการตัดสินใจ)",
        "⛔ Moving Average Crossovers (Muted: สัญญาณช้าและหลอกบ่อย)",
        "⛔ Stochastic Oscillator (Muted: สัญญาณขัดแย้งกับเทรนด์ใหญ่)",
      ];
      clashResolutionReason = "กรองสัญญาณรบกวนออกทั้งหมด ปิด Oscillator และเส้น MA เพื่อเทรดตามรอยเท้าสถาบัน (Pure Institutional Flow)";
      break;

    case "QUANT_TREND_SURFER":
      activeIndicators = [
        "🌊 EMA 20/50/200 Ribbon Wave",
        "🛡️ SuperTrend ATR Direction",
        "🌐 MTF Structure Matrix (M15+H1+H4 Aligned)",
        "📈 Hurst Persistent Trend Momentum (H > 0.5)",
        "🎯 Structural Trailing Stop Engine",
      ];
      mutedIndicators = [
        "⛔ RSI Overbought/Oversold (Muted: เทรนด์แรง RSI ค้างสูง ห้ามดักสวน)",
        "⛔ Bollinger Bands Counter-Trend (Muted: สวนเทรนด์เสี่ยงโดนลาก)",
        "⛔ StochRSI Mean-Reversion (Muted: ตัดขาดทุนบ่อยในแนวโน้มใหญ่)",
      ];
      clashResolutionReason = "ปิดระบบดักสวนเทรนด์ทั้งหมด (Mute RSI/BB Reversal) ป้องกันการเข้า Sell ดักยอดหรือ Buy ดักก้นในเทรนด์ทรงพลัง";
      break;

    case "SQUEEZE_BREAKOUT":
      activeIndicators = [
        "🎯 TTM Squeeze Engine (BB inside Keltner)",
        "📊 Volume Profile Point of Control (POC)",
        "💥 Institutional ChoS Expansion Velocity",
        "⚡ Cumulative Volume Delta (CVD Absorption)",
      ];
      mutedIndicators = [
        "⛔ ทุกสัญญาณ Buy/Sell ชั่วคราว (Muted: ตลาดสะสมพลัง ห้ามเข้าก่อนระเบิด)",
        "⛔ Moving Average Crosses (Muted: สับหลอกรุนแรงในกรอบแคบ)",
        "⛔ Oscillator Extremes (Muted: ไร้ทิศทางชัดเจน)",
      ];
      clashResolutionReason = "ระงับสัญญาณเข้าเทรดสุ่มสี่สุ่มห้า (Mute Entries) บังคับให้อยู่ในโหมดเฝ้าระวังจนกว่าสปริงราคาจะดีดระเบิด (Squeeze Fired)";
      break;

    case "MEAN_REVERSION_SCALPER":
      activeIndicators = [
        "🔄 Bollinger Bands Outer Boundary (2.0σ)",
        "📉 Rolling Z-Score Extreme (Z ± 2.0)",
        "⚡ StochRSI Turning Point (0-20, 80-100)",
        "🕳️ Liquidity Void 50% Fast-Fill Target",
        "⏱️ Half-Life Mean Reversion Velocity",
      ];
      mutedIndicators = [
        "⛔ SuperTrend Direction (Muted: เทรนด์ไม่มีนัยสำคัญใน Sideway)",
        "⛔ Moving Average Breakouts (Muted: เกิด Fakeout บ่อยที่สุด)",
        "⛔ MACD Zero-Line Trend Crosses (Muted: ดีเลย์และขาดทุนซ้ำซาก)",
      ];
      clashResolutionReason = "ปิดระบบตามเทรนด์ทั้งหมด (Mute Trend Indicators) ป้องกันการโดนหลอกซื้อแพงขายถูกที่กรอบบนและล่างของ Sideway";
      break;

    case "HARMONIC_REVERSAL":
      activeIndicators = [
        "📐 Harmonic Patterns Engine (Gartley, Bat, Butterfly, Crab, ABCD)",
        "🎯 Potential Reversal Zone (PRZ Confluence)",
        "🔢 Fibonacci Cluster Mesh (0.618 / 0.786 / 1.272 / 1.618)",
        "🕯️ Exhaustion Pinbar Confirmation",
      ];
      mutedIndicators = [
        "⛔ Simple Trend Following (Muted: ทับซ้อนกับจุดกลับตัวเรขาคณิต)",
        "⛔ Moving Average Lag (Muted: ช้ากว่าโครงสร้างสัดส่วนทองคำ)",
      ];
      clashResolutionReason = "โฟกัสเฉพาะสัดส่วนเรขาคณิตและโซน PRZ ปิดระบบตามเทรนด์เดิมเพื่อโฟกัสจุดวกกลับที่มีความแม่นยำสูง (Precision Reversal)";
      break;
  }

  // ─── 4. HIERARCHICAL VETO CHECKS (VETO HIERARCHY) ───
  let vetoTriggered = false;
  let vetoReason = "";

  // Veto Check 1: Liquidity Inducement Trap (Safety Lock 12)
  if (indicators.liquidityInducement?.isInducementTrap) {
    vetoTriggered = true;
    vetoReason = `⛔ ติดกับดักสภาพคล่อง (${indicators.liquidityInducement.trapType}): สถาบันกำลังล่อซื้อขายที่ ${indicators.liquidityInducement.idmLevel} ห่างเพียง ${indicators.liquidityInducement.distanceToTrapPips} pips`;
  }
  // Veto Check 2: Macro DXY / Yield Conflict (Safety Lock 9)
  else if (indicators.correlationShield?.shieldStatus === "HEDGE_ALERT" || indicators.correlationShield?.macroRegime === "LIQUIDATION_ANOMALY") {
    vetoTriggered = true;
    vetoReason = `⛔ สัญญาณขัดแย้งข้ามตลาด (Correlation Shield): สินทรัพย์วิ่งผิดธรรมชาติเทียบกับดอลลาร์/บอนด์ยิลด์ ห้ามเข้าออเดอร์`;
  }
  // Veto Check 3: Squeeze Active without Fire
  else if (effectivePreset === "SQUEEZE_BREAKOUT" && isSqueezeActive) {
    vetoTriggered = true;
    vetoReason = `⏳ พลังงานราคากำลังบีบอัดตัว (TTM Squeeze Active): รอแท่งเทียนดีดตัวหลุดกรอบก่อนเข้าออเดอร์`;
  }
  // Veto Check 4: HTF Trend Conflict (Safety Lock 11)
  else if (indicators.mtfStructureMatrix?.isHTFConflict) {
    vetoTriggered = true;
    vetoReason = `⛔ สัญญาณขัดแย้งโครงสร้างใหญ่ H4/D1: ฝืนเทรนด์ระดับสถาบัน โดน Veto ทันที`;
  }

  // ─── 5. SYNTHESIZE UNIFIED SIGNAL WITHOUT CONTRADICTIONS ───
  let unifiedSignal: OrchestratorDecisionInfo["unifiedSignal"] = "HOLD_WAIT";
  let confidencePct = 50;
  let primaryEngine = "";
  let executionAdvice = "";

  if (vetoTriggered) {
    unifiedSignal = "HOLD_WAIT";
    confidencePct = 40;
    primaryEngine = "Safety Veto Gate";
    executionAdvice = vetoReason;
  } else {
    // Determine direction based strictly on the chosen non-clashing active toolset
    if (effectivePreset === "SMC_PRICE_ACTION") {
      const isBullOB = indicators.orderBlocks?.nearestBlock?.type?.includes("BULLISH") ?? false;
      const isBearOB = indicators.orderBlocks?.nearestBlock?.type?.includes("BEARISH") ?? false;
      const isMSSBull = (indicators.marketStructureShift?.detected && indicators.marketStructureShift.type === "BULLISH_MSS") ?? false;
      const isMSSBear = (indicators.marketStructureShift?.detected && indicators.marketStructureShift.type === "BEARISH_MSS") ?? false;

      if (isBullOB || isMSSBull) {
        unifiedSignal = "BUY";
        confidencePct = 88;
        primaryEngine = "SMC Institutional Footprint (OB/MSS)";
        executionAdvice = "เปิดสถานะ BUY ตามรอยเท้าสถาบันที่โซน Order Block / OTE Discount ปลอดภัยจากกับดัก";
      } else if (isBearOB || isMSSBear) {
        unifiedSignal = "SELL";
        confidencePct = 88;
        primaryEngine = "SMC Institutional Footprint (OB/MSS)";
        executionAdvice = "เปิดสถานะ SELL ในโซน Premium หลังเกิด Market Structure Shift ชัดเจน";
      } else {
        unifiedSignal = "HOLD_WAIT";
        confidencePct = 60;
        primaryEngine = "SMC Structure Monitor";
        executionAdvice = "รอราคาย่อตัวเข้าสู่โซน Discount / Order Block เพื่อได้เปรียบต้นทุน";
      }
    } else if (effectivePreset === "QUANT_TREND_SURFER") {
      const isEmaBull = (indicators.ema20[indicators.ema20.length - 1] ?? 0) > (indicators.ema50[indicators.ema50.length - 1] ?? 0);
      const isSuperTrendBull = indicators.superTrend ? indicators.superTrend[indicators.superTrend.length - 1]?.direction === "UP" : true;

      if (isEmaBull && isSuperTrendBull) {
        unifiedSignal = "BUY";
        confidencePct = 85;
        primaryEngine = "Quant Trend Ribbon";
        executionAdvice = "เทรนด์ขาขึ้นแข็งแกร่ง (EMA Ribbon + SuperTrend เขียว) รันกำไรตาม Trailing Stop";
      } else if (!isEmaBull && !isSuperTrendBull) {
        unifiedSignal = "SELL";
        confidencePct = 85;
        primaryEngine = "Quant Trend Ribbon";
        executionAdvice = "เทรนด์ขาลงชัดเจน (EMA Ribbon + SuperTrend แดง) รันสถานะฝั่ง Short";
      } else {
        unifiedSignal = "HOLD_WAIT";
        confidencePct = 55;
        primaryEngine = "Trend Confluence Filter";
        executionAdvice = "EMA และ SuperTrend ยังไม่สอดคล้องกันเต็มร้อย รอความชัดเจน";
      }
    } else if (effectivePreset === "MEAN_REVERSION_SCALPER") {
      const lastBB = indicators.bollingerBands ? indicators.bollingerBands[indicators.bollingerBands.length - 1] : null;
      const isOversold = currentPrice <= (lastBB?.lower ?? 0);
      const isOverbought = currentPrice >= (lastBB?.upper ?? Infinity);

      if (isOversold) {
        unifiedSignal = "BUY";
        confidencePct = 82;
        primaryEngine = "Statistical Mean Reversion (BB Lower + Z-Score)";
        executionAdvice = "ราคาชนกรอบล่างของส่วนเบี่ยงเบนมาตรฐาน (Oversold Extreme) คาดหวังการดีดกลับหา Median";
      } else if (isOverbought) {
        unifiedSignal = "SELL";
        confidencePct = 82;
        primaryEngine = "Statistical Mean Reversion (BB Upper + Z-Score)";
        executionAdvice = "ราคาชนกรอบบนของส่วนเบี่ยงเบนมาตรฐาน (Overbought Extreme) คาดหวังการย่อตัวกลับหาค่าเฉลี่ย";
      } else {
        unifiedSignal = "HOLD_WAIT";
        confidencePct = 50;
        primaryEngine = "Mean Reversion Range Gate";
        executionAdvice = "ราคายังอยู่กลางกรอบ Sideway ไม่มีความได้เปรียบทางสถิติ";
      }
    } else if (effectivePreset === "HARMONIC_REVERSAL") {
      const bestPat = indicators.masterSuite?.harmonics.bestPattern;
      if (bestPat && bestPat.type === "BULLISH") {
        unifiedSignal = "BUY";
        confidencePct = 86;
        primaryEngine = `Harmonic Pattern (${bestPat.patternName})`;
        executionAdvice = `เข้าเทรด ณ จุดกลับตัวเรขาคณิต ${bestPat.patternName} ในกรอบ PRZ ${bestPat.prz.min} - ${bestPat.prz.max}`;
      } else if (bestPat && bestPat.type === "BEARISH") {
        unifiedSignal = "SELL";
        confidencePct = 86;
        primaryEngine = `Harmonic Pattern (${bestPat.patternName})`;
        executionAdvice = `เข้าเทรดฝั่ง Short ณ จุดกลับตัวเรขาคณิต ${bestPat.patternName} ในกรอบ PRZ ${bestPat.prz.min} - ${bestPat.prz.max}`;
      } else {
        unifiedSignal = "HOLD_WAIT";
        confidencePct = 60;
        primaryEngine = "Harmonic Scanner";
        executionAdvice = "กำลังสแกนหารูปทรง Harmonic Pattern สัดส่วนทองคำ";
      }
    } else {
      unifiedSignal = "HOLD_WAIT";
      confidencePct = 65;
      primaryEngine = "Squeeze Breakout Sentry";
      executionAdvice = "จับตาแท่งเทียนแท่งแรกที่หลุดกรอบ Squeeze พร้อมวอลุ่มหนุน";
    }
  }

  const regimeState = isSqueezeActive
    ? "VOLATILITY_SQUEEZE_ACCUMULATION"
    : isStrongTrend
    ? "STRONG_DIRECTIONAL_TREND"
    : isChopMarket
    ? "RANGE_BOUND_MEAN_REVERSION"
    : "NORMAL_MARKET_FLOW";

  return {
    selectedPreset: userPreset,
    effectivePreset,
    regimeState,
    activeIndicators,
    mutedIndicators,
    clashResolutionReason,
    unifiedSignal,
    confidencePct,
    primaryEngine,
    vetoTriggered,
    vetoReason: vetoTriggered ? vetoReason : undefined,
    executionAdvice,
  };
}
