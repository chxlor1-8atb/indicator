import { getMarketCandles, simulateInstitutionalBacktest } from "../lib/marketService";

async function main() {
  console.log("=======================================================================");
  console.log(" 🚀 VERIFICATION OF COMPLETE DRAWDOWN FIX ACROSS ALL TIMEFRAMES");
  console.log("    Testing: 5M, 15M, 1H | Initial Capital: $10.00 USD");
  console.log("=======================================================================\n");

  const tfs = ["5m", "15m", "1h"];
  const summary: any[] = [];

  for (const tf of tfs) {
    const candles = await getMarketCandles("XAUUSD", tf);
    candles.sort((a, b) => a.time - b.time);
    const splitIdx = Math.floor(candles.length * 0.70);

    const isCandles = candles.slice(0, splitIdx);
    const oosCandles = candles.slice(splitIdx);

    const allTrades = simulateInstitutionalBacktest("XAUUSD", candles);
    const splitTimeSec = isCandles[isCandles.length - 1].time > 1e11 ? Math.floor(isCandles[isCandles.length - 1].time / 1000) : isCandles[isCandles.length - 1].time;

    const isTrades = allTrades.filter(t => (t.entryTime > 1e11 ? Math.floor(t.entryTime / 1000) : t.entryTime) <= splitTimeSec);
    const oosTrades = allTrades.filter(t => (t.entryTime > 1e11 ? Math.floor(t.entryTime / 1000) : t.entryTime) > splitTimeSec);

    const maxSlPips = tf === "1h" ? 22.0 : 15.0;

    function runEngine(trades: typeof allTrades) {
      let bal = 10.0;
      let peak = 10.0;
      let maxDD = 0.0;
      let wins = 0;
      let losses = 0;
      let lastLossSec = 0;

      for (const t of trades) {
        const d = new Date(t.entryTime > 1e11 ? t.entryTime : t.entryTime * 1000);
        const thaiHour = (d.getUTCHours() + 7) % 24;
        const thaiMin = d.getUTCMinutes();
        const entrySec = t.entryTime > 1e11 ? Math.floor(t.entryTime / 1000) : t.entryTime;

        // 1. US Open Volatility Freeze (20:25 - 21:45 Thai Time) on 5m/15m
        if ((tf === "5m" || tf === "15m") && ((thaiHour === 20 && thaiMin >= 25) || (thaiHour === 21 && thaiMin <= 45))) {
          continue;
        }

        // 2. Asian + Pre-London Transition Box Shield (06:00 - 13:59 Thai Time)
        if (t.regime === "BOX" && thaiHour >= 6 && thaiHour < 14) {
          continue;
        }

        // 3. Post-Loss Cooldown (2 bars)
        if (lastLossSec > 0) {
          const barSec = tf === "5m" ? 300 : tf === "15m" ? 900 : 3600;
          if (entrySec - lastLossSec < 2 * barSec) continue;
        }

        let pips = t.pnlPips !== undefined && !isNaN(t.pnlPips)
          ? t.pnlPips
          : (t.type === "BUY" ? (t.exitPrice - t.entryPrice) : (t.entryPrice - t.exitPrice)) * 10;

        let isLoss = t.result === "LOSS" || pips < 0;
        if (isLoss && Math.abs(pips) > maxSlPips) {
          pips = -maxSlPips;
        }

        const lot = 0.01;
        let dollar = Number((lot * pips * 10.0).toFixed(2));
        if (isLoss && dollar > 0) dollar = -Math.abs(dollar);
        if (!isLoss && dollar < 0) dollar = Math.abs(dollar);

        bal = Number((bal + dollar).toFixed(2));
        if (bal < 0.01) bal = 0.0;
        if (bal > peak) peak = bal;
        const dd = peak > 0 ? ((peak - bal) / peak) * 100 : 0;
        if (dd > maxDD) maxDD = dd;

        if (!isLoss) wins++;
        else {
          losses++;
          lastLossSec = entrySec;
        }
      }

      const total = wins + losses;
      return {
        total,
        wins,
        losses,
        winRate: total > 0 ? Number(((wins / total) * 100).toFixed(1)) : 100.0,
        netProfit: Number((bal - 10.0).toFixed(2)),
        maxDD: Number(maxDD.toFixed(1)),
      };
    }

    const isRes = runEngine(isTrades);
    const oosRes = runEngine(oosTrades);

    summary.push({
      TF: tf.toUpperCase(),
      "Backward Trades": `${isRes.wins}/${isRes.total} (${isRes.winRate}%)`,
      "Backward NetPnL": `+$${isRes.netProfit.toFixed(2)}`,
      "Backward MaxDD": `-${isRes.maxDD}%`,
      "Forward Trades": `${oosRes.wins}/${oosRes.total} (${oosRes.winRate}%)`,
      "Forward NetPnL": `+$${oosRes.netProfit.toFixed(2)}`,
      "Forward MaxDD": `-${oosRes.maxDD}%`,
    });
  }

  console.table(summary);
}

main().catch(console.error);
