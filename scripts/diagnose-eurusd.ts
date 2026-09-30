import { getMarketCandles, resampleCandlesTo4H } from "../lib/marketService";
import { optimizeIndicatorParameters } from "../lib/optimizerEngine";
import { calculateEMA, calculateRSI, calculateADX, calculateATR } from "../lib/indicators";

async function diagnose() {
  const candles = await getMarketCandles("EURUSD", "1h");
  const opt = optimizeIndicatorParameters(candles, "EURUSD");
  console.log("Opt for EURUSD:", opt);

  const emaFast = calculateEMA(candles, opt.emaFast || 20);
  const emaSlow = calculateEMA(candles, opt.emaSlow || 50);
  const emaTrend = calculateEMA(candles, opt.emaTrend || 200);
  const rsi = calculateRSI(candles, opt.rsiPeriod || 14);
  const adx = calculateADX(candles, 14);
  const atrs = calculateATR(candles, 14);

  let trendBars = 0;
  let pullbackBars = 0;
  let rejectionBars = 0;
  let obstacleBlocked = 0;
  let boxCandidates = 0;

  const minBuffer = 0.0018;

  for (let i = 35; i < candles.length; i++) {
    const c = candles[i];
    const prevC = candles[i - 1];
    const eFast = emaFast[i] ?? c.close;
    const eSlow = emaSlow[i] ?? c.close;
    const eTrend = emaTrend[i] ?? c.close;
    const rVal = rsi[i] ?? 50;
    const adxVal = adx[i] ?? 25;
    const currentATR = atrs[i] ?? 0.0010;
    const candleRange = c.high - c.low;
    const lowerWick = Math.min(c.close, c.open) - c.low;

    const isBullTrend = eFast > eSlow && c.close > eTrend;
    const isBearTrend = eFast < eSlow && c.close < eTrend;

    if (adxVal >= 18 && (isBullTrend || isBearTrend)) {
      trendBars++;
      const isBuyPullback = c.low <= eFast * 1.012 && c.close >= eSlow * 0.990 && rVal >= 30 && rVal <= 75;
      if (isBullTrend && isBuyPullback) {
        pullbackBars++;
        const isBullishRejection = candleRange > 0 && ((lowerWick >= candleRange * 0.25 && c.close >= c.open) || (c.close > c.open && c.close > prevC.high));
        if (isBullishRejection) {
          rejectionBars++;
          const entry = c.close;
          const recentLows = candles.slice(Math.max(0, i - 5), i + 1).map((k) => k.low);
          const swingLow = Math.min(...recentLows);
          const slDist = Math.max(entry - swingLow + currentATR * 0.35, currentATR * 1.35, minBuffer);

          const lookbackObstacle = candles.slice(Math.max(0, i - 24), i);
          const recentSwingHigh = Math.max(...lookbackObstacle.map((b) => b.high));
          if (recentSwingHigh > entry && (recentSwingHigh - entry) < slDist * 0.75) {
            obstacleBlocked++;
          }
        }
      }
    }
  }

  console.log({
    totalBars: candles.length,
    trendBars,
    pullbackBars,
    rejectionBars,
    obstacleBlocked,
  });
}
diagnose();
