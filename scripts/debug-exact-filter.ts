import { getMarketCandles, resampleCandlesTo4H } from "../lib/marketService";
import { optimizeIndicatorParameters } from "../lib/optimizerEngine";
import { calculateEMA, calculateRSI, calculateADX, calculateATR, calculateBollingerBands, calculateVolumeDelta, calculateTDSequential } from "../lib/indicators";
import { getTradingSessionPhase } from "../lib/sessionEngine";

async function debugExactFilter() {
  const candles = await getMarketCandles("EURUSD", "1h");
  const opt = optimizeIndicatorParameters(candles, "EURUSD");
  const emaFast = calculateEMA(candles, opt.emaFast || 20);
  const emaSlow = calculateEMA(candles, opt.emaSlow || 50);
  const emaTrend = calculateEMA(candles, opt.emaTrend || 200);
  const rsi = calculateRSI(candles, opt.rsiPeriod || 14);
  const adx = calculateADX(candles, 14);
  const atrs = calculateATR(candles, 14);
  const bBands = calculateBollingerBands(candles, 20, 2.0);

  const candles4H = resampleCandlesTo4H(candles);
  const ema20_4H = calculateEMA(candles4H, 20);
  const ema50_4H = calculateEMA(candles4H, 50);
  const ema200_4H = calculateEMA(candles4H, 200);

  const fourHourMap = new Map<number, number>();
  for (let k = 0; k < candles4H.length; k++) fourHourMap.set(candles4H[k].time, k);

  const reasons: Record<string, number> = {};
  const count = (r: string) => reasons[r] = (reasons[r] || 0) + 1;

  for (let i = 35; i < candles.length; i++) {
    const c = candles[i];
    const prevC = candles[i - 1];
    const eFast = emaFast[i] ?? c.close;
    const eSlow = emaSlow[i] ?? c.close;
    const eTrend = emaTrend[i] ?? c.close;
    const rVal = rsi[i] ?? 50;
    const rValPrev = rsi[i - 1] ?? 50;
    const adxVal = adx[i] ?? 25;
    const currentATR = atrs[i] ?? 0.0010;
    const candleRange = c.high - c.low;
    const candleBody = Math.abs(c.close - c.open);
    const lowerWick = Math.min(c.close, c.open) - c.low;
    const upperWick = c.high - Math.max(c.close, c.open);

    const bodyQuality = candleRange > 0 ? candleBody / candleRange : 0;
    const bb = bBands[i];
    const bbBandwidth = bb?.bandwidth ?? 100;
    const isExtremeSqueeze = bbBandwidth < 1.5;

    const sessionPhase = getTradingSessionPhase(c.time);
    const dDate = new Date(c.time > 1e11 ? c.time : c.time * 1000);
    const thaiHour = (dDate.getUTCHours() + 7) % 24;

    if (sessionPhase.phase === "DEAD_ZONE") { count("dead_zone"); continue; }
    if ((thaiHour >= 22 || thaiHour === 0) && adxVal < 24) { count("late_night_chop"); continue; }

    const current4HBucketTime = Math.floor(c.time / (4 * 3600)) * (4 * 3600);
    const idx4H = fourHourMap.get(current4HBucketTime);
    let dynamicHtfBias: "BULL" | "BEAR" | "NEUTRAL" = "NEUTRAL";
    if (idx4H !== undefined && idx4H >= 1) {
      const prev4HIdx = idx4H - 1;
      const c4Close = candles4H[prev4HIdx]?.close;
      const e4_20 = ema20_4H[prev4HIdx];
      const e4_50 = ema50_4H[prev4HIdx];
      const e4_200 = ema200_4H[prev4HIdx] ?? e4_50;
      if (c4Close && e4_20 && e4_50 && e4_200) {
        if (c4Close > e4_20 && e4_20 > e4_50 && c4Close > e4_200) dynamicHtfBias = "BULL";
        else if (c4Close < e4_20 && e4_20 < e4_50 && c4Close < e4_200) dynamicHtfBias = "BEAR";
      }
    }

    const isBullTrend = eFast > eSlow && c.close > eTrend;
    const isBearTrend = eFast < eSlow && c.close < eTrend;

    if (!isBullTrend && !isBearTrend) { count("no_trend"); continue; }
    if (adxVal < 18) { count("adx_low"); continue; }

    if (isBullTrend) {
      if (dynamicHtfBias === "BEAR") { count("htf_bias_conflict"); continue; }
      const distFromTrend = Math.abs(c.close - eTrend);
      if (distFromTrend > currentATR * 4.5) { count("dist_trend_over_4.5"); continue; }

      const isBuyPullback = c.low <= eFast * 1.012 && c.close >= eSlow * 0.990 && rVal >= 30 && rVal <= 75;
      if (!isBuyPullback) { count("not_buy_pullback"); continue; }

      const isBullishRejection = candleRange > 0 && ((lowerWick >= candleRange * 0.25 && c.close >= c.open) || (c.close > c.open && c.close > prevC.high));
      if (!isBullishRejection) { count("not_bull_reject"); continue; }

      const isRsiBullHook = rVal >= rValPrev;
      if (!isRsiBullHook) { count("not_rsi_bull_hook"); continue; }

      if (bodyQuality < 0.28) { count("body_quality_fail"); continue; }

      const volSlice = candles.slice(Math.max(0, i - 13), i + 1);
      const volDelta = calculateVolumeDelta(volSlice);
      if (volDelta.sellerVolumePct > 60 && !volDelta.isAbsorption) { count("vol_sellers_dom"); continue; }

      const tdSlice = candles.slice(Math.max(0, i - 20), i + 1);
      const tdSeq = calculateTDSequential(tdSlice);
      if (tdSeq.isExhausted && tdSeq.exhaustionType === "BUY_EXHAUSTION_9") { count("td_exhausted"); continue; }

      if (isExtremeSqueeze) { count("bb_extreme_squeeze"); continue; }

      const entry = c.close;
      const recentLows = candles.slice(Math.max(0, i - 5), i + 1).map((k) => k.low);
      const swingLow = Math.min(...recentLows);
      const minBuffer = 0.0018;
      const slDist = Math.max(entry - swingLow + currentATR * 0.35, currentATR * 1.35, minBuffer);

      const lookbackObstacle = candles.slice(Math.max(0, i - 24), i);
      const recentSwingHigh = Math.max(...lookbackObstacle.map((b) => b.high));
      if (recentSwingHigh > entry && (recentSwingHigh - entry) < slDist * 0.75) {
        count("obstacle_blocked");
        continue;
      }

      count("PASSED_BUY_ENTRY");
    }
  }

  console.log("Filter Skip Reasons:", reasons);
}
debugExactFilter();
