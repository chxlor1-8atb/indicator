import * as fs from "fs";
import * as path from "path";
import { getMarketCandles, simulateInstitutionalBacktest } from "../lib/marketService";
import { Candle } from "../lib/types";

async function multiAssetBreakdown() {
  console.log("================================================================================");
  console.log(" 🌐 MULTI-ASSET GRANULAR QUANTITATIVE BREAKDOWN (แยกทุกคู่เงินแบบละเอียด)");
  console.log("================================================================================\n");

  const symbols = [
    { id: "XAUUSD", name: "Gold (Spot XAUUSD)", isDeepFile: true },
    { id: "BTCUSDT", name: "Bitcoin (BTC/USDT)", isDeepFile: false },
    { id: "ETHUSDT", name: "Ethereum (ETH/USDT)", isDeepFile: false },
    { id: "EURUSD", name: "Euro / US Dollar", isDeepFile: false },
    { id: "GBPUSD", name: "British Pound / US Dollar", isDeepFile: false },
    { id: "USDJPY", name: "US Dollar / Japanese Yen", isDeepFile: false },
    { id: "USOIL", name: "Crude Oil (WTI)", isDeepFile: false },
  ];

  const results: any[] = [];

  for (const s of symbols) {
    try {
      let candles: Candle[] = [];
      if (s.isDeepFile) {
        const dataPath = path.resolve(process.cwd(), "data", "xauusd_1h_deep.json");
        candles = JSON.parse(fs.readFileSync(dataPath, "utf-8"));
      } else {
        candles = await getMarketCandles(s.id, "1h");
      }

      if (!candles || candles.length < 50) {
        console.log(`⚠️ ไม่สามารถดึงข้อมูลแท่งเทียนสำหรับ ${s.name} ได้เพียงพอ (${candles.length} แท่ง)`);
        continue;
      }

      const trades = simulateInstitutionalBacktest(s.id, candles);
      const wins = trades.filter((t) => t.result === "WIN");
      const losses = trades.filter((t) => t.result === "LOSS");
      const bes = trades.filter((t) => t.result === "BE");

      const total = trades.length;
      const winRateExcl = total > 0 && wins.length + losses.length > 0
        ? Number(((wins.length / (wins.length + losses.length)) * 100).toFixed(1))
        : 0;
      const winRateIncl = total > 0
        ? Number((((wins.length + bes.length * 0.5) / total) * 100).toFixed(1))
        : 0;
      const capitalSafeRate = total > 0
        ? Number((((wins.length + bes.length) / total) * 100).toFixed(1))
        : 0;

      const netR = Number(trades.reduce((a, t) => a + t.pnlR, 0).toFixed(1));
      const netPips = Number(trades.reduce((a, t) => a + t.pnlPips, 0).toFixed(1));

      const grossGainR = wins.reduce((a, t) => a + t.pnlR, 0);
      const grossLossR = Math.abs(losses.reduce((a, t) => a + t.pnlR, 0));
      const profitFactor = grossLossR > 0 ? Number((grossGainR / grossLossR).toFixed(2)) : 99.0;

      let maxConsecW = 0;
      let maxConsecL = 0;
      let currW = 0;
      let currL = 0;
      let peakR = 0;
      let curR = 0;
      let maxDD = 0;

      for (const t of trades) {
        curR += t.pnlR;
        if (curR > peakR) peakR = curR;
        const dd = curR - peakR;
        if (dd < maxDD) maxDD = dd;

        if (t.result === "WIN") {
          currW++;
          currL = 0;
          if (currW > maxConsecW) maxConsecW = currW;
        } else if (t.result === "LOSS") {
          currL++;
          currW = 0;
          if (currL > maxConsecL) maxConsecL = currL;
        } else {
          currW = 0;
          currL = 0;
        }
      }

      const res = {
        symbol: s.id,
        name: s.name,
        candlesCount: candles.length,
        totalTrades: total,
        wins: wins.length,
        losses: losses.length,
        bes: bes.length,
        winRateExcl,
        winRateIncl,
        capitalSafeRate,
        netPips,
        netR,
        profitFactor,
        maxConsecW,
        maxConsecL,
        maxDD: Number(maxDD.toFixed(1)),
      };

      results.push(res);

      console.log(`────────────────────────────────────────────────────────────────────────────────`);
      console.log(`📌 【${s.id}】 - ${s.name} (ประวัติ ${candles.length.toLocaleString()} แท่ง)`);
      console.log(`────────────────────────────────────────────────────────────────────────────────`);
      console.log(`  • จำนวนไม้ทั้งหมด (Total Trades) : ${total} ไม้`);
      console.log(`  • ชนะ (Wins)                      : ${wins.length} ไม้ (${((wins.length / (total || 1)) * 100).toFixed(1)}%)`);
      console.log(`  • แพ้ (Losses)                    : ${losses.length} ไม้ (${((losses.length / (total || 1)) * 100).toFixed(1)}%)`);
      console.log(`  • เสมอ กันทุน (Breakeven)          : ${bes.length} ไม้ (${((bes.length / (total || 1)) * 100).toFixed(1)}%)`);
      console.log(`  • วินเรทมาตรฐาน (Excl. BE)         : ${winRateExcl}%`);
      console.log(`  • อัตราคุ้มครองเงินทุน (No-Loss %) : ${capitalSafeRate}% (ชนะ + เสมอ)`);
      console.log(`  • กำไรสุทธิ (Net Pips)            : ${netPips > 0 ? "+" : ""}${netPips} pips`);
      console.log(`  • กำไรสะสม (Cumulative R)         : ${netR > 0 ? "+" : ""}${netR}R`);
      console.log(`  • Profit Factor                  : ${profitFactor}`);
      console.log(`  • ชนะติดกันสูงสุด (Max Consec W)   : ${maxConsecW} ไม้`);
      console.log(`  • แพ้ติดกันสูงสุด (Max Consec L)   : ${maxConsecL} ไม้`);
      console.log(`  • Maximum Drawdown (DD)          : ${maxDD.toFixed(1)}R\n`);
    } catch (err: any) {
      console.error(`❌ เกิดข้อผิดพลาดในการวิเคราะห์ ${s.id}:`, err?.message || err);
    }
  }

  // Print Summary Comparison Table
  console.log("================================================================================");
  console.log(" 📊 ตารางเปรียบเทียบแยกรายคู่เงินทุกคู่ (Granular Comparison Matrix)");
  console.log("================================================================================");
  console.table(
    results.map((r) => ({
      Symbol: r.symbol,
      Candles: r.candlesCount,
      Trades: r.totalTrades,
      Wins: r.wins,
      Loss: r.losses,
      BE: r.bes,
      "WinRate%": `${r.winRateExcl}%`,
      "NoLoss%": `${r.capitalSafeRate}%`,
      "Net Pips": `${r.netPips > 0 ? "+" : ""}${r.netPips}`,
      "Net R": `${r.netR > 0 ? "+" : ""}${r.netR}R`,
      PF: r.profitFactor,
      MaxDD: `${r.maxDD}R`,
    }))
  );
}

multiAssetBreakdown().catch(console.error);
