import { NextRequest, NextResponse } from "next/server";
import { getMarketCandles, AVAILABLE_ASSETS, simulateInstitutionalBacktest } from "@/lib/marketService";
import { calculateEMA, calculateRSI } from "@/lib/indicators";
import { saveBacktestResults, clearBacktestResults, BacktestTrade } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));

    // ─── Clear / Reset Action ───
    if (body.action === "clear" || body.clearOnly) {
      const sym = body.symbol || (body.category === "all" ? undefined : undefined);
      await clearBacktestResults(sym);
      return NextResponse.json({
        success: true,
        message: `ล้างข้อมูลผลลัพธ์ Backtest เรียบร้อยแล้ว (${sym || "ทั้งหมด"})`,
      });
    }

    // ─── Batch Seeder Mode: 500 Historical Candles across ALL Currency Pairs / Categories ───
    if (body.action === "seed-all" || body.seedAll) {
      const targetCategory = body.category || "all";
      const assets = AVAILABLE_ASSETS.filter(
        (a) => targetCategory === "all" || a.category === targetCategory
      );

      if (body.resetPrevious || body.clearFirst) {
        if (targetCategory === "all") {
          await clearBacktestResults();
        } else {
          for (const a of assets) {
            await clearBacktestResults(a.symbol);
          }
        }
      }

      let totalSaved = 0;
      let totalTradesGenerated = 0;
      const results: Array<{ symbol: string; saved: number; trades: number; error?: string }> = [];

      // Process in concurrent chunks of 4 to maximize throughput safely
      const chunkSize = 4;
      for (let i = 0; i < assets.length; i += chunkSize) {
        const chunk = assets.slice(i, i + chunkSize);
        const chunkResults = await Promise.all(
          chunk.map(async (asset) => {
            try {
              const candles = await getMarketCandles(asset.symbol, "1h");
              const candles500 = candles.slice(-500);
              if (candles500.length < 35) {
                return { symbol: asset.symbol, saved: 0, trades: 0, error: "Insufficient candles" };
              }

              const trades = simulateInstitutionalBacktest(asset.symbol, candles500);
              if (trades.length > 0) {
                const saveRes = await saveBacktestResults(asset.symbol, "1h", trades);
                return { symbol: asset.symbol, saved: saveRes.saved, trades: trades.length };
              }
              return { symbol: asset.symbol, saved: 0, trades: 0 };
            } catch (err) {
              return { symbol: asset.symbol, saved: 0, trades: 0, error: String(err) };
            }
          })
        );

        for (const r of chunkResults) {
          totalSaved += r.saved;
          totalTradesGenerated += r.trades;
          results.push(r);
        }
      }

      return NextResponse.json({
        success: true,
        message: `ประมวลผลย้อนหลัง 500 แท่งสำเร็จ ${assets.length} คู่เงิน: สร้าง ${totalTradesGenerated} trades, บันทึกลง Neon DB ใหม่ ${totalSaved} trades`,
        totalSaved,
        totalTradesGenerated,
        processedCount: assets.length,
        results,
      });
    }

    const symbol = body.symbol || "XAUUSD";
    const timeframe = body.timeframe || "1h";

    const candles = await getMarketCandles(symbol, timeframe);
    if (!candles || candles.length < 50) {
      return NextResponse.json({ success: false, error: "Insufficient historical data" }, { status: 400 });
    }

    const candles500 = candles.slice(-500);
    const trades = simulateInstitutionalBacktest(symbol, candles500);

    const wins = trades.filter((t) => t.result === "WIN").length;
    const beTrades = trades.filter((t) => t.result === "BE").length;
    const losses = trades.filter((t) => t.result === "LOSS").length;
    const totalTrades = trades.length;

    const resolved = wins + losses;
    const winRate = resolved > 0 ? Number(((wins / resolved) * 100).toFixed(1)) : 0;
    const netReturnR = Number(trades.reduce((acc, t) => acc + t.pnlR, 0).toFixed(2));
    const profitFactor = losses > 0 ? Number(((wins * 1.5) / losses).toFixed(2)) : wins > 0 ? 99 : 0;

    const dbResult = await saveBacktestResults(symbol, timeframe, trades);

    return NextResponse.json({
      success: true,
      symbol,
      timeframe,
      candleCount: candles500.length,
      metrics: {
        totalTrades,
        wins,
        beTrades,
        losses,
        winRate,
        netReturnR,
        profitFactor,
      },
      dbSaved: dbResult,
      tradeHistory: trades.slice(-8).map((t) => ({
        type: t.type,
        entry: t.entryPrice,
        exit: t.exitPrice,
        result: t.result,
        pnlR: t.pnlR > 0 ? `+${t.pnlR}R` : `${t.pnlR}R`,
        date: new Date(t.entryTime * 1000).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }),
      })),
    });
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : "Backtest execution failed";
    return NextResponse.json({ success: false, error: errMsg }, { status: 500 });
  }
}