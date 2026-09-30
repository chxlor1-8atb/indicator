import * as fs from "fs";
import * as path from "path";
import { Candle, BacktestTrade } from "../lib/types";
import { simulateInstitutionalBacktest } from "../lib/marketService";

const dataPath = path.resolve(process.cwd(), "data", "xauusd_1h_10year.json");
const candles: Candle[] = JSON.parse(fs.readFileSync(dataPath, "utf-8"));
const allTrades = simulateInstitutionalBacktest("XAUUSD", candles);

const losingTrades = allTrades.filter(t => t.result === "LOSS");
console.log(`=== FORENSIC ANALYSIS OF ${losingTrades.length} LOSING TRADES (10-YEAR XAUUSD 1H) ===\n`);

// 1. Loss breakdown by Type (BUY vs SELL)
const buyLosses = losingTrades.filter(t => t.type === "BUY");
const sellLosses = losingTrades.filter(t => t.type === "SELL");
console.log(`1. Direction Breakdown:`);
console.log(`   - BUY Losses:  ${buyLosses.length} (${((buyLosses.length / losingTrades.length) * 100).toFixed(1)}%)`);
console.log(`   - SELL Losses: ${sellLosses.length} (${((sellLosses.length / losingTrades.length) * 100).toFixed(1)}%)\n`);

// 2. Loss breakdown by Regime (TREND vs BOX)
const trendLosses = losingTrades.filter(t => t.regime === "TREND");
const boxLosses = losingTrades.filter(t => t.regime === "BOX");
console.log(`2. Regime Breakdown:`);
console.log(`   - TREND Regime Losses: ${trendLosses.length} (${((trendLosses.length / losingTrades.length) * 100).toFixed(1)}%)`);
console.log(`   - BOX Regime Losses:   ${boxLosses.length} (${((boxLosses.length / losingTrades.length) * 100).toFixed(1)}%)\n`);

// 3. Loss breakdown by Thai Trading Hours (UTC+7)
const hourlyLosses: Record<number, number> = {};
const sessionLosses = {
  ASIAN_MORNING: 0, // 06:00 - 13:59
  LONDON_AFTERNOON: 0, // 14:00 - 18:59
  NY_OVERLAP: 0, // 19:00 - 23:59
  DEAD_ZONE: 0, // 00:00 - 05:59
};

for (const t of losingTrades) {
  const d = new Date(t.entryTime > 1e11 ? t.entryTime : t.entryTime * 1000);
  const thaiHour = (d.getUTCHours() + 7) % 24;
  hourlyLosses[thaiHour] = (hourlyLosses[thaiHour] || 0) + 1;

  if (thaiHour >= 6 && thaiHour < 14) sessionLosses.ASIAN_MORNING++;
  else if (thaiHour >= 14 && thaiHour < 19) sessionLosses.LONDON_AFTERNOON++;
  else if (thaiHour >= 19 && thaiHour < 24) sessionLosses.NY_OVERLAP++;
  else sessionLosses.DEAD_ZONE++;
}

console.log(`3. Session Distribution of Losses (Thai Time UTC+7):`);
console.log(`   - Asian Morning (06:00-14:00):      ${sessionLosses.ASIAN_MORNING} (${((sessionLosses.ASIAN_MORNING / losingTrades.length) * 100).toFixed(1)}%)`);
console.log(`   - London Afternoon (14:00-19:00):   ${sessionLosses.LONDON_AFTERNOON} (${((sessionLosses.LONDON_AFTERNOON / losingTrades.length) * 100).toFixed(1)}%)`);
console.log(`   - NY Overlap Peak (19:00-24:00):     ${sessionLosses.NY_OVERLAP} (${((sessionLosses.NY_OVERLAP / losingTrades.length) * 100).toFixed(1)}%)`);
console.log(`   - Dead Zone / Late Night (00:00-06:00): ${sessionLosses.DEAD_ZONE} (${((sessionLosses.DEAD_ZONE / losingTrades.length) * 100).toFixed(1)}%)\n`);

// 4. Holding Duration of Losses
const durations = losingTrades.map(t => {
  const entryMs = t.entryTime > 1e11 ? t.entryTime : t.entryTime * 1000;
  const exitMs = t.exitTime > 1e11 ? t.exitTime : t.exitTime * 1000;
  return (exitMs - entryMs) / (1000 * 3600); // hours
});
const avgDuration = durations.reduce((a, b) => a + b, 0) / durations.length;
const fastLosses = durations.filter(d => d <= 2).length; // Struck out within 1-2 bars
console.log(`4. Trade Duration & Speed of Loss:`);
console.log(`   - Average holding time before SL: ${avgDuration.toFixed(1)} hours`);
console.log(`   - Fast Stop-Outs (within <= 2 bars / 2 hours): ${fastLosses} (${((fastLosses / losingTrades.length) * 100).toFixed(1)}%)`);
console.log(`   - Slow Grinding Losses (> 2 hours): ${losingTrades.length - fastLosses} (${(((losingTrades.length - fastLosses) / losingTrades.length) * 100).toFixed(1)}%)\n`);

// 5. Sample 10 Specific Losing Trades
console.log(`5. Sample Specific Losing Trades (Forensic Details):`);
console.table(
  losingTrades.slice(0, 10).map(t => {
    const d = new Date(t.entryTime > 1e11 ? t.entryTime : t.entryTime * 1000);
    return {
      Time: d.toISOString().replace("T", " ").slice(0, 16),
      Type: t.type,
      Regime: t.regime,
      Entry: t.entryPrice,
      Exit: t.exitPrice,
      SL: t.sl,
      Pips: t.pnlPips,
      RiskDist: Math.abs(t.entryPrice - t.sl).toFixed(2),
    };
  })
);
