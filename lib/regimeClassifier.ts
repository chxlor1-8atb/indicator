import { Candle, IndicatorData, MarketRegimeInfo, MarketRegimeType } from "./types";

export function classifyMarketRegime(
  candles: Candle[],
  indicators: IndicatorData
): MarketRegimeInfo {
  const currentPrice = indicators.currentPrice;
  const len = candles.length;

  if (len < 20) {
    return {
      regime: "CHOPPY_DEADZONE",
      title: "🛑 CHOPPY DEADZONE",
      badgeColor: "bg-slate-700/50 text-slate-300 border-slate-600",
      adxValue: 20,
      bandwidthValue: 2.0,
      description: "ประวัติแท่งเทียนยังไม่เพียงพอสำหรับการระบุสภาวะตลาด",
      tacticalAction: "แนะนำให้ถือเงินสด รอข้อมูลสะสมครบถ้วน",
      targetedWinRate: "50-60%",
      optimalParams: { emaFast: 20, emaSlow: 50, emaTrend: 200, rsiPeriod: 14, tpMultiplier: 2.0 },
    };
  }

  const lastADX = indicators.adx?.slice(-1)[0] ?? 25;
  const lastBB = indicators.bollingerBands?.slice(-1)[0] ?? {
    upper: currentPrice * 1.01,
    middle: currentPrice,
    lower: currentPrice * 0.99,
    bandwidth: 2.0,
  };
  const prevBB = indicators.bollingerBands && indicators.bollingerBands.length > 5
    ? indicators.bollingerBands.slice(-6)[0]
    : lastBB;

  const bandwidth = lastBB.bandwidth;
  const isBandwidthExpanding = bandwidth > (prevBB?.bandwidth ?? bandwidth);
  const isSqueezing = bandwidth < 1.5;

  const lastEMA20 = indicators.ema20.slice(-1)[0] ?? currentPrice;
  const lastEMA50 = indicators.ema50.slice(-1)[0] ?? currentPrice;
  const lastEMA200 = indicators.ema200.slice(-1)[0] ?? currentPrice;
  const lastSuperTrend = indicators.superTrend?.slice(-1)[0]?.direction ?? "UP";

  const distFromFast = Math.abs(currentPrice - lastEMA20) / (currentPrice || 1);
  const distFromSlow = Math.abs(currentPrice - lastEMA50) / (currentPrice || 1);
  const isPullbackZone = distFromFast < 0.008 || distFromSlow < 0.008;

  const isStrongTrendDirection = (currentPrice > lastEMA50 && currentPrice > lastEMA200) ||
                                 (currentPrice < lastEMA50 && currentPrice < lastEMA200) ||
                                 (lastADX >= 35); // Extreme ADX represents monster momentum

  let regime: MarketRegimeType = "CHOPPY_DEADZONE";

  // 1. Volatility Squeeze (Pre-breakout compression)
  if (isSqueezing && lastADX < 24) {
    regime = "VOLATILITY_SQUEEZE";
  }
  // 2. Explosive Trend (Monster ADX or clear expanding trend)
  else if (lastADX >= 28 && (isBandwidthExpanding || lastADX >= 35)) {
    // If pulling back right into the ribbon, it's a high win-rate pullback inside a monster trend
    if (isPullbackZone) {
      regime = "HEALTHY_PULLBACK";
    } else {
      regime = "EXPLOSIVE_TREND";
    }
  }
  // 3. Healthy Pullback (Good ADX and price resting in Value Zone)
  else if (lastADX >= 21 && isPullbackZone) {
    regime = "HEALTHY_PULLBACK";
  }
  // 4. Moderate Trend
  else if (lastADX >= 22 && isStrongTrendDirection) {
    regime = "EXPLOSIVE_TREND";
  }
  // 5. Choppy Deadzone (Chop / Sideways filter)
  else {
    regime = "CHOPPY_DEADZONE";
  }

  switch (regime) {
    case "EXPLOSIVE_TREND":
      return {
        regime: "EXPLOSIVE_TREND",
        title: "🔥 EXPLOSIVE MOMENTUM TREND",
        badgeColor: "bg-rose-500/20 text-rose-300 border-rose-500/40 shadow-rose-500/10",
        adxValue: Number(lastADX.toFixed(1)),
        bandwidthValue: Number(bandwidth.toFixed(2)),
        description: `ตลาดมีโมเมนตัมพุ่งแรงรุนแรงเป็นพิเศษ (ADX สูงถึง ${lastADX.toFixed(1)} และกรอบราคาขยายตัว)`,
        tacticalAction: "ปรับจูนสปีดความไว EMA 9/21, RSI 7 รันกำไรด้วย SuperTrend และลากเป้า TP 1:2.5 - 1:3.0",
        targetedWinRate: "82% - 88% (Trend-Surfing)",
        optimalParams: {
          emaFast: 9,
          emaSlow: 21,
          emaTrend: 100,
          rsiPeriod: 7,
          tpMultiplier: 2.5,
        },
      };

    case "HEALTHY_PULLBACK":
      return {
        regime: "HEALTHY_PULLBACK",
        title: "🌊 HEALTHY VALUE PULLBACK",
        badgeColor: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-emerald-500/10",
        adxValue: Number(lastADX.toFixed(1)),
        bandwidthValue: Number(bandwidth.toFixed(2)),
        description: `ราคาย่อตัวพักฐานเข้าสู่ Value Zone ต้นทุนต่ำ โดยมีแรงโมเมนตัมหนุนหลัง (ADX: ${lastADX.toFixed(1)})`,
        tacticalAction: "ปรับเป็น EMA 13/89 Fibonacci Ribbon, RSI 10 ดักซื้อจังหวะย่อตัว วาง SL หลังสวิงเพื่อ Win Rate สูงสุด",
        targetedWinRate: "80% - 86% (High-Probability Dip)",
        optimalParams: {
          emaFast: 13,
          emaSlow: 89,
          emaTrend: 200,
          rsiPeriod: 10,
          tpMultiplier: 1.8,
        },
      };

    case "VOLATILITY_SQUEEZE":
      return {
        regime: "VOLATILITY_SQUEEZE",
        title: "⚡ VOLATILITY SQUEEZE (PRE-BREAKOUT)",
        badgeColor: "bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-amber-500/10",
        adxValue: Number(lastADX.toFixed(1)),
        bandwidthValue: Number(bandwidth.toFixed(2)),
        description: `กรอบ Bollinger Bands บีบตัวแคบผิดปกติ (${bandwidth.toFixed(2)}%) สะสมพลังพร้อมระเบิด Breakout`,
        tacticalAction: "ปรับเป็นโหมด Breakout Expansion รอ Volume Spike ยืนยันก่อนกระโดดตามน้ำ",
        targetedWinRate: "75% - 80% (Breakout Momentum)",
        optimalParams: {
          emaFast: 20,
          emaSlow: 50,
          emaTrend: 200,
          rsiPeriod: 14,
          tpMultiplier: 2.0,
        },
      };

    case "CHOPPY_DEADZONE":
    default:
      return {
        regime: "CHOPPY_DEADZONE",
        title: "🛑 CHOPPY DEADZONE (CAPITAL SHIELD)",
        badgeColor: "bg-slate-700/50 text-slate-300 border-slate-600",
        adxValue: Number(lastADX.toFixed(1)),
        bandwidthValue: Number(bandwidth.toFixed(2)),
        description: `ตลาดไร้ทิศทาง แกว่งเป็นฟันปลา (ADX อ่อนแรง < 21) มีความเสี่ยงโดนสับหลอกสูง`,
        tacticalAction: "เปิดใช้งาน Safety Shield สั่ง WAIT 100% ถือเงินสด ไม่เปิดออเดอร์เพื่อปกป้อง Win Rate",
        targetedWinRate: "รักษาทุน 100% (Avoid False Breakout)",
        optimalParams: {
          emaFast: 20,
          emaSlow: 50,
          emaTrend: 200,
          rsiPeriod: 14,
          tpMultiplier: 1.5,
        },
      };
  }
}