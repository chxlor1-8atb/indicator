import { getMarketCandles, simulateInstitutionalBacktest } from "../lib/marketService";
import { runAutomatedBacktest } from "../lib/backtestEngine";
import { Candle } from "../lib/types";

async function runWinrateTuning() {
  console.log("================================================================================");
  console.log("   ITERATIVE WIN-RATE OPTIMIZATION BENCHMARK ACROSS ASSETS");
  console.log("================================================================================\n");

  const symbols = ["XAUUSD", "EURUSD", "GBPUSD", "USDJPY"];
  
  for (const sym of symbols) {
    try {
      const candles = await getMarketCandles(sym, "1h");
      if (!candles || candles.length < 50) {
        console.log(`[${sym}] Insufficient candles.`);
        continue;
      }

      const metrics = runAutomatedBacktest(candles, sym);
      console.log(`--------------------------------------------------------------------------------`);
      console.log(`【 สินทรัพย์: ${sym} 】 (จำนวนแท่งเทียน: ${metrics.candleCount} แท่ง)`);
      console.log(`--------------------------------------------------------------------------------`);
      console.log(`  • อัตราการชนะ (Win Rate): ${metrics.winRate}%`);
      console.log(`  • ผลการเทรด: ทั้งหมด ${metrics.totalTrades} ไม้ | ชนะ ${metrics.wins} | เสมอ (BE) ${metrics.beTrades} | แพ้ ${metrics.losses}`);
      console.log(`  • Profit Factor: ${metrics.profitFactor}`);
      console.log(`  • กำไรสะสมสุทธิ: ${metrics.netReturnR > 0 ? "+" : ""}${metrics.netReturnR} R`);
      console.log(`  • รายการ 5 ไม้ล่าสุด:`);
      for (const t of metrics.recentTrades) {
        console.log(`     - [${t.date}] ${t.type} @ ${t.entry} -> ออก @ ${t.exit} | ผล: ${t.result} (${t.pnlR})`);
      }
      console.log("");
    } catch (err) {
      console.error(`Error testing ${sym}:`, err);
    }
  }

  console.log("================================================================================\n");
}

runWinrateTuning().catch(console.error);
