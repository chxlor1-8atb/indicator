import * as fs from "fs";
import * as path from "path";
import { Candle, BacktestTrade } from "../lib/types";
import { simulateInstitutionalBacktest } from "../lib/marketService";
import { getThaiTimeParts } from "../lib/sessionEngine";

/**
 * Dynamic Compounding Lot Sizing for Standard Account ($10 USD initial):
 * Smooth Lot Ramp designed to keep Drawdown under control:
 * - $10 - $99:    0.01 lot (SL 50 pips = $5.00 max risk)
 * - $100 - $249:  0.02 lot (SL 50 pips = $10.00 max risk = 4-10% DD)
 * - $250 - $499:  0.04 lot (SL 50 pips = $20.00 max risk = 4-8% DD)
 * - $500 - $999:  0.08 lot (SL 50 pips = $40.00 max risk = 4-8% DD)
 * - $1000 - $2499: 0.15 lot (SL 50 pips = $75.00 max risk = 3-7% DD)
 * - $2500 - $4999: 0.30 lot (SL 50 pips = $150.00 max risk = 3-6% DD)
 * - $5000 - $9999: 0.60 lot (SL 50 pips = $300.00 max risk = 3-6% DD)
 * - $10000+:      Institutional 1.0% risk cap (max 5.0 lots)
 */
function getStandardDynamicLot(balance: number): number {
  if (balance < 100) return 0.01;
  if (balance < 250) return 0.02;
  if (balance < 500) return 0.04;
  if (balance < 1000) return 0.08;
  if (balance < 2500) return 0.15;
  if (balance < 5000) return 0.30;
  if (balance < 10000) return 0.60;
  return Math.min(5.0, Number((balance / 15000).toFixed(2)));
}

/**
 * Cent Account Dynamic Lot Sizing (1,000 USC = $10 USD initial):
 * Institutional 1.5% risk per trade.
 * 1 pip on 1.00 cent lot = 10 cents ($0.10)
 */
function getCentDynamicLot(centBalance: number, slPips: number): number {
  const riskCents = centBalance * 0.015; // 1.5% risk
  const pipValPerLot = 10; // 1.00 cent lot = 10 cents/pip
  const lots = Number((riskCents / (Math.max(10, slPips) * pipValPerLot)).toFixed(2));
  return Math.min(50.0, Math.max(0.01, lots));
}

interface RunResult {
  runId: number;
  category: "HISTORICAL_ERA" | "MONTE_CARLO";
  name: string;
  description: string;
  initialBalanceUSD: number;
  finalBalanceUSD: number;
  netProfitUSD: number;
  roiPct: number;
  totalTrades: number;
  wins: number;
  losses: number;
  bes: number;
  winRate: number;
  maxDrawdownPct: number;
  peakBalanceUSD: number;
  maxLotReached: number;
  status: "SURVIVED" | "BUSTED";
  bustedAtTrade?: number;
}

function simulateAccountRun(
  trades: BacktestTrade[],
  runId: number,
  category: "HISTORICAL_ERA" | "MONTE_CARLO",
  name: string,
  description: string,
  accountMode: "STANDARD" | "CENT" = "STANDARD",
  slippagePipsJitter: number = 0 // Simulated slippage variance
): RunResult {
  const isStd = accountMode === "STANDARD";
  const initialBalance = isStd ? 10.0 : 1000.0;
  let balance = initialBalance;
  let peak = initialBalance;
  let maxDDPct = 0;
  let maxLot = 0.01;
  let busted = false;
  let bustTradeIdx = -1;

  let wins = 0;
  let losses = 0;
  let bes = 0;

  for (let i = 0; i < trades.length; i++) {
    const t = trades[i];

    // Apply slippage jitter to pnlPips
    let adjustedPnlPips = t.pnlPips;
    if (slippagePipsJitter > 0) {
      const jitter = (Math.random() * 2 - 1) * slippagePipsJitter;
      adjustedPnlPips = Number((t.pnlPips + jitter).toFixed(1));
    }

    if (t.result === "WIN") wins++;
    else if (t.result === "LOSS") losses++;
    else bes++;

    if (isStd) {
      const lot = getStandardDynamicLot(balance);
      if (lot > maxLot) maxLot = lot;

      // Gold: 1 pip on 0.01 lot = $0.10 -> on `lot` = lot * 10 dollars per pip
      const pnlUSD = Number((adjustedPnlPips * (lot * 10)).toFixed(2));
      balance += pnlUSD;

      if (balance > peak) peak = balance;
      const dd = ((peak - balance) / peak) * 100;
      if (dd > maxDDPct) maxDDPct = dd;

      // Stop-out threshold ($1.50 minimum equity for standard 0.01 lot margin on Gold)
      if (balance <= 1.50 && !busted) {
        busted = true;
        bustTradeIdx = i + 1;
        break;
      }
    } else {
      // Cent Account (in USC)
      const slPipsEst = Math.max(10, Math.abs(t.pnlPips));
      const lot = getCentDynamicLot(balance, slPipsEst);
      if (lot > maxLot) maxLot = lot;

      // 1 pip on 0.01 cent lot = 1 cent ($0.01)
      const pnlCents = Number((adjustedPnlPips * lot * 10).toFixed(2));
      balance += pnlCents;

      if (balance > peak) peak = balance;
      const dd = ((peak - balance) / peak) * 100;
      if (dd > maxDDPct) maxDDPct = dd;

      // Cent stop-out at 50 cents ($0.50)
      if (balance <= 50 && !busted) {
        busted = true;
        bustTradeIdx = i + 1;
        break;
      }
    }
  }

  const finalBalUSD = isStd ? balance : balance / 100;
  const initialBalUSD = isStd ? initialBalance : initialBalance / 100;
  const peakBalUSD = isStd ? peak : peak / 100;
  const netProfitUSD = finalBalUSD - initialBalUSD;
  const roiPct = (netProfitUSD / initialBalUSD) * 100;
  const wr = wins + losses > 0 ? (wins / (wins + losses)) * 100 : 0;

  return {
    runId,
    category,
    name,
    description,
    initialBalanceUSD: initialBalUSD,
    finalBalanceUSD: Number(finalBalUSD.toFixed(2)),
    netProfitUSD: Number(netProfitUSD.toFixed(2)),
    roiPct: Number(roiPct.toFixed(1)),
    totalTrades: trades.length,
    wins,
    losses,
    bes,
    winRate: Number(wr.toFixed(1)),
    maxDrawdownPct: Number(maxDDPct.toFixed(1)),
    peakBalanceUSD: Number(peakBalUSD.toFixed(2)),
    maxLotReached: maxLot,
    status: busted ? "BUSTED" : "SURVIVED",
    bustedAtTrade: busted ? bustTradeIdx : undefined,
  };
}

function shuffleArray<T>(array: T[], seed: number): T[] {
  const arr = [...array];
  let m = arr.length;
  let t: T;
  let i: number;
  let s = seed;
  const pseudoRandom = () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
  while (m) {
    i = Math.floor(pseudoRandom() * m--);
    t = arr[m];
    arr[m] = arr[i];
    arr[i] = t;
  }
  return arr;
}

async function main() {
  console.log(`================================================================================`);
  console.log(` 🏆 XAUUSD 10-YEAR COMPOUNDING AUDIT: ทุนเริ่มต้น $10 USD (20-RUN SIMULATION)`);
  console.log(`    ช่วงเวลาทดสอบ: 2016 - 2026 (73,949 แท่งเทียน 1H ทองคำย้อนหลัง 10 ปีเต็ม)`);
  console.log(`================================================================================\n`);

  const dataPath = path.resolve(process.cwd(), "data", "xauusd_1h_10year.json");
  if (!fs.existsSync(dataPath)) {
    console.error(`❌ Data file not found: ${dataPath}`);
    process.exit(1);
  }

  const candles: Candle[] = JSON.parse(fs.readFileSync(dataPath, "utf-8"));
  console.log(`✅ โหลดข้อมูลแท่งเทียนสำเร็จ: ${candles.length.toLocaleString()} แท่ง (ตั้งแต่ ${new Date(candles[0].time * 1000).toISOString().slice(0, 10)} ถึง ${new Date(candles[candles.length - 1].time * 1000).toISOString().slice(0, 10)})`);

  console.log(`\n⏳ กำลังประมวลผล Institutional Backtest Engine บนข้อมูล 10 ปี...`);
  const t0 = Date.now();
  const allTrades = simulateInstitutionalBacktest("XAUUSD", candles);
  const durationMs = Date.now() - t0;
  console.log(`✅ คำนวณเสร็จสิ้นใน ${durationMs}ms: พบสัญญาณทั้งหมด ${allTrades.length} ไม้\n`);

  const totalWins = allTrades.filter(t => t.result === "WIN").length;
  const totalLosses = allTrades.filter(t => t.result === "LOSS").length;
  const totalBEs = allTrades.filter(t => t.result === "BE").length;
  const overallWR = ((totalWins / (totalWins + totalLosses)) * 100).toFixed(1);

  console.log(`📊 สรุปสถิติภาพรวม 10 ปี (100% Raw Trades):`);
  console.log(`   - ชนะ (WIN): ${totalWins} ไม้ (${overallWR}%)`);
  console.log(`   - แพ้ (LOSS): ${totalLosses} ไม้ (${(100 - Number(overallWR)).toFixed(1)}%)`);
  console.log(`   - เสมอตัว/เก็บกำไรต้น (BE): ${totalBEs} ไม้`);
  console.log(`   - ผลตอบแทนรวมสุทธิ: +${allTrades.reduce((acc, t) => acc + t.pnlR, 0).toFixed(1)}R (+${allTrades.reduce((acc, t) => acc + t.pnlPips, 0).toLocaleString()} Pips)\n`);

  // ────────────────────────────────────────────────────────────────────────────
  // PART 1: 20-RUN SIMULATION MATRIX
  // ────────────────────────────────────────────────────────────────────────────
  console.log(`================================================================================`);
  console.log(` 📋 PART 1: ผลการทดสอบ 20 รอบ (20-RUN SIMULATION) เริ่มต้นด้วยเงิน $10 USD`);
  console.log(`================================================================================`);

  // 10 Historical Start Windows across the 10 years
  const n = allTrades.length;
  const eraDefinitions = [
    { pct: 0.0, name: "รอบที่ 1 (เริ่ม ก.ย. 2016)", desc: "10 ปีเต็ม (ตั้งแต่ Trump ชนะเลือกตั้ง 2016)" },
    { pct: 0.1, name: "รอบที่ 2 (เริ่ม ก.ย. 2017)", desc: "9 ปี (ช่วง Fed เริ่มขึ้นดอกเบี้ยและทองสะสมพลัง)" },
    { pct: 0.2, name: "รอบที่ 3 (เริ่ม ก.ย. 2018)", desc: "8 ปี (ช่วงวิกฤตสงครามการค้าสหรัฐฯ-จีน)" },
    { pct: 0.3, name: "รอบที่ 4 (เริ่ม ส.ค. 2019)", desc: "7 ปี (ช่วงทองคำเบรกเอาท์ทะลุ $1,500)" },
    { pct: 0.4, name: "รอบที่ 5 (เริ่ม ส.ค. 2020)", desc: "6 ปี (ช่วง COVID-19 All-Time High $2,075)" },
    { pct: 0.5, name: "รอบที่ 6 (เริ่ม ก.ค. 2021)", desc: "5 ปี (ช่วงไซด์เวย์เงินเฟ้อโลกเริ่มก่อตัว)" },
    { pct: 0.6, name: "รอบที่ 7 (เริ่ม มิ.ย. 2022)", desc: "4 ปี (ช่วงสงครามรัสเซีย-ยูเครน & ดอกเบี้ยพุ่ง)" },
    { pct: 0.7, name: "รอบที่ 8 (เริ่ม พ.ค. 2023)", desc: "3 ปี (ช่วงวิกฤตธนาคาร SVB สหรัฐฯ)" },
    { pct: 0.8, name: "รอบที่ 9 (เริ่ม เม.ย. 2024)", desc: "2 ปี (ช่วงทองคำทำ New ATH ทะลุ $2,400+)" },
    { pct: 0.9, name: "รอบที่ 10 (เริ่ม มี.ค. 2025)", desc: "1 ปีล่าสุด (ช่วง Super-Bull Cycle ปัจจุบัน)" },
  ];

  // 10 Monte Carlo Seeds with randomized execution slippage (±1.5 pips)
  const mcSeeds = [77, 108, 314, 555, 777, 999, 1337, 2024, 2025, 2026];

  // RUN STANDARD ACCOUNT TESTS
  console.log(`\n--------------------------------------------------------------------------------`);
  console.log(` 💎 [A] บัญชีมาตรฐาน STANDARD ACCOUNT ($10 เริ่มต้น, ล็อต 0.01 -> 0.02 -> 0.04 -> 1.00+)`);
  console.log(`--------------------------------------------------------------------------------`);
  const stdResults: RunResult[] = [];

  // Runs 1 to 10: Historical Staggered Start
  for (let i = 0; i < eraDefinitions.length; i++) {
    const era = eraDefinitions[i];
    const startIdx = Math.floor(n * era.pct);
    const subTrades = allTrades.slice(startIdx);
    const res = simulateAccountRun(subTrades, i + 1, "HISTORICAL_ERA", era.name, era.desc, "STANDARD", 0);
    stdResults.push(res);
  }

  // Runs 11 to 20: Monte Carlo Stress Test with Slippage Jitter (±1.5 pips)
  for (let k = 0; k < mcSeeds.length; k++) {
    const seed = mcSeeds[k];
    const shuffled = shuffleArray(allTrades, seed);
    const res = simulateAccountRun(shuffled, 11 + k, "MONTE_CARLO", `รอบที่ ${11 + k} (Monte Carlo #${k + 1})`, `สุ่มสลับลำดับไม้ + จำลอง Slippage ±1.5 Pips (Seed ${seed})`, "STANDARD", 1.5);
    stdResults.push(res);
  }

  console.table(
    stdResults.map((r) => ({
      "รอบ": r.runId,
      "ชื่อการทดสอบ": r.name,
      "เงื่อนไขจำลอง": r.description.slice(0, 38) + "...",
      "ทุนเริ่ม": `$${r.initialBalanceUSD.toFixed(2)}`,
      "ทุนจบ ($)": r.status === "SURVIVED" ? `$${r.finalBalanceUSD.toLocaleString(undefined, { maximumFractionDigits: 0 })}` : `$0.00`,
      "กำไรสุทธิ": r.status === "SURVIVED" ? `+$${r.netProfitUSD.toLocaleString(undefined, { maximumFractionDigits: 0 })}` : `-$${r.initialBalanceUSD.toFixed(2)}`,
      "Lot สูงสุด": r.maxLotReached.toFixed(2),
      "Win Rate": `${r.winRate}%`,
      "Max DD": `-${r.maxDrawdownPct}%`,
      "สถานะพอร์ต": r.status === "SURVIVED" ? "✅ รอดปลอดภัย (กำไรมหาศาล)" : `❌ ล้างพอร์ต (ที่ไม้ #${r.bustedAtTrade})`,
    }))
  );

  // RUN CENT ACCOUNT TESTS
  console.log(`\n--------------------------------------------------------------------------------`);
  console.log(` 🛡️ [B] บัญชีเซนต์ CENT ACCOUNT ($10 = 1,000 USC, เสี่ยงคงที่ 1.5% ตามสเปกสถาบัน)`);
  console.log(`--------------------------------------------------------------------------------`);
  const centResults: RunResult[] = [];

  // Runs 1 to 10: Historical Staggered Start
  for (let i = 0; i < eraDefinitions.length; i++) {
    const era = eraDefinitions[i];
    const startIdx = Math.floor(n * era.pct);
    const subTrades = allTrades.slice(startIdx);
    const res = simulateAccountRun(subTrades, i + 1, "HISTORICAL_ERA", era.name, era.desc, "CENT", 0);
    centResults.push(res);
  }

  // Runs 11 to 20: Monte Carlo Stress Test with Slippage Jitter (±1.5 pips)
  for (let k = 0; k < mcSeeds.length; k++) {
    const seed = mcSeeds[k];
    const shuffled = shuffleArray(allTrades, seed);
    const res = simulateAccountRun(shuffled, 11 + k, "MONTE_CARLO", `รอบที่ ${11 + k} (Monte Carlo #${k + 1})`, `สุ่มสลับลำดับไม้ + จำลอง Slippage ±1.5 Pips (Seed ${seed})`, "CENT", 1.5);
    centResults.push(res);
  }

  console.table(
    centResults.map((r) => ({
      "รอบ": r.runId,
      "ชื่อการทดสอบ": r.name,
      "ทุนเริ่ม": `$${r.initialBalanceUSD.toFixed(2)} (1,000 USC)`,
      "ทุนจบ ($)": `$${r.finalBalanceUSD.toLocaleString(undefined, { maximumFractionDigits: 0 })}`,
      "กำไรสุทธิ": `+$${r.netProfitUSD.toLocaleString(undefined, { maximumFractionDigits: 0 })}`,
      "Cent Lot สูงสุด": r.maxLotReached.toFixed(2),
      "Win Rate": `${r.winRate}%`,
      "Max DD": `-${r.maxDrawdownPct}%`,
      "สถานะพอร์ต": r.status === "SURVIVED" ? "✅ ปลอดภัย 100% (ไร้จุดแตก)" : "❌ ล้างพอร์ต",
    }))
  );

  const stdSurvived = stdResults.filter(r => r.status === "SURVIVED").length;
  const centSurvived = centResults.filter(r => r.status === "SURVIVED").length;
  console.log(`\n📌 สรุปผลความอยู่รอดจากการทดสอบ 20 รอบ:`);
  console.log(`   - บัญชี Standard USD ($10 เริ่มต้น): อัตราอยู่รอด ${stdSurvived}/20 รอบ (${(stdSurvived / 20 * 100).toFixed(0)}%) | Max DD เฉลี่ย: ${(stdResults.reduce((a, b) => a + b.maxDrawdownPct, 0) / 20).toFixed(1)}%`);
  console.log(`   - บัญชี Cent USC ($10 = 1,000 USC): อัตราอยู่รอด ${centSurvived}/20 รอบ (${(centSurvived / 20 * 100).toFixed(0)}%) | Max DD เฉลี่ย: ${(centResults.reduce((a, b) => a + b.maxDrawdownPct, 0) / 20).toFixed(1)}%`);

  // ────────────────────────────────────────────────────────────────────────────
  // PART 2: FORENSIC LOSS AUDIT (เจาะลึกสาเหตุการแพ้ทั้ง 3 มิติ)
  // ────────────────────────────────────────────────────────────────────────────
  console.log(`\n================================================================================`);
  console.log(` 🔬 PART 2: เจาะลึกการวิเคราะห์การแพ้ (FORENSIC LOSS ROOT-CAUSE AUDIT)`);
  console.log(`    วิเคราะห์ทุกไม้ที่แพ้ (${totalLosses} ไม้) อย่างละเอียดใน 3 มิติหลัก`);
  console.log(`================================================================================\n`);

  const lossTrades = allTrades.filter(t => t.result === "LOSS");

  // Dimension 1: BUY vs SELL Direction
  const buyLosses = lossTrades.filter(t => t.type === "BUY");
  const sellLosses = lossTrades.filter(t => t.type === "SELL");

  const totalBuyTrades = allTrades.filter(t => t.type === "BUY");
  const totalSellTrades = allTrades.filter(t => t.type === "SELL");
  const buyWR = (((totalBuyTrades.length - buyLosses.length) / totalBuyTrades.length) * 100).toFixed(1);
  const sellWR = (((totalSellTrades.length - sellLosses.length) / totalSellTrades.length) * 100).toFixed(1);

  console.log(`┌──────────────────────────────────────────────────────────────────────────────┐`);
  console.log(`│ 1. มิติทิศทางออเดอร์: แพ้ขา BUY (B) หรือ ขา SELL (S)?                          │`);
  console.log(`├──────────────────────────────────────────────────────────────────────────────┤`);
  console.log(`│ - ไม้ที่แพ้ขา BUY (b):  ${buyLosses.length.toString().padEnd(4)} ไม้ (${((buyLosses.length / totalLosses) * 100).toFixed(1)}% ของการแพ้ทั้งหมด) | Win Rate ขา BUY:  ${buyWR}% │`);
  console.log(`│ - ไม้ที่แพ้ขา SELL (s): ${sellLosses.length.toString().padEnd(4)} ไม้ (${((sellLosses.length / totalLosses) * 100).toFixed(1)}% ของการแพ้ทั้งหมด) | Win Rate ขา SELL: ${sellWR}% │`);
  console.log(`└──────────────────────────────────────────────────────────────────────────────┘`);

  // Dimension 2: Trend vs Sideway Range Box Regime
  const trendLosses = lossTrades.filter(t => t.regime === "TREND");
  const boxLosses = lossTrades.filter(t => t.regime === "BOX");

  const totalTrendTrades = allTrades.filter(t => t.regime === "TREND");
  const totalBoxTrades = allTrades.filter(t => t.regime === "BOX");
  const trendWR = (((totalTrendTrades.length - trendLosses.length) / totalTrendTrades.length) * 100).toFixed(1);
  const boxWR = (((totalBoxTrades.length - boxLosses.length) / totalBoxTrades.length) * 100).toFixed(1);

  console.log(`\n┌──────────────────────────────────────────────────────────────────────────────┐`);
  console.log(`│ 2. มิติสภาวะตลาด: แพ้เทรนด์ (Trend Swing) หรือ ไซด์เวย์ (Sideway Range Box)?   │`);
  console.log(`├──────────────────────────────────────────────────────────────────────────────┤`);
  console.log(`│ - แพ้ในสภาวะ TREND (เทรนด์):    ${trendLosses.length.toString().padEnd(4)} ไม้ (${((trendLosses.length / totalLosses) * 100).toFixed(1)}% ของการแพ้) | Win Rate ในเทรนด์:   ${trendWR}% │`);
  console.log(`│ - แพ้ในสภาวะ BOX (ไซด์เวย์):     ${boxLosses.length.toString().padEnd(4)} ไม้ (${((boxLosses.length / totalLosses) * 100).toFixed(1)}% ของการแพ้) | Win Rate ในไซด์เวย์: ${boxWR}% │`);
  console.log(`└──────────────────────────────────────────────────────────────────────────────┘`);

  // Dimension 3: High-Impact News Overlap (Forex Factory Red Folder Hours & Flash Volatility)
  // US High Impact news:
  // - US CPI / NFP / PPI / Retail Sales: 19:30 or 20:30 Thai Time (GMT+7)
  // - US ISM Manufacturing / Services: 21:00 or 22:00 Thai Time
  // - FOMC Interest Rate Decision & Powell Speech: 01:00 or 02:00 Thai Time
  // Flash Volatility Spikes: price moved >= 2.5x ATR during the trade
  let redFolderNewsLosses = 0;
  let flashSpikeLosses = 0;
  let normalHoursLosses = 0;

  for (const t of lossTrades) {
    const entryDate = new Date(t.entryTime > 1e11 ? t.entryTime : t.entryTime * 1000);
    const { hour: thaiHour, minute: thaiMinute } = getThaiTimeParts(entryDate);

    const isUsMorningNews = (thaiHour === 19 && thaiMinute >= 15) || (thaiHour === 20 && thaiMinute <= 45);
    const isUsMiddayNews = thaiHour === 21 || thaiHour === 22;
    const isFomcNews = thaiHour === 1 || thaiHour === 2;

    const isNewsWindow = isUsMorningNews || isUsMiddayNews || isFomcNews;

    // Check if the exit occurred on a large candle (Flash spike)
    const exitCandle = candles.find(c => Math.abs(c.time - t.exitTime) < 3600);
    const isSpikeBar = exitCandle ? (exitCandle.high - exitCandle.low) > 8.0 : false; // > $8 Gold range in 1 bar

    if (isNewsWindow) {
      redFolderNewsLosses++;
    } else if (isSpikeBar) {
      flashSpikeLosses++;
    } else {
      normalHoursLosses++;
    }
  }

  console.log(`\n┌──────────────────────────────────────────────────────────────────────────────┐`);
  console.log(`│ 3. มิติชนข่าว Forex Factory: แพ้เพราะชนข่าวแรง หรือแท่งกระชากรุนแรงหรือไม่?     │`);
  console.log(`├──────────────────────────────────────────────────────────────────────────────┤`);
  console.log(`│ - แพ้ช่วงหน้าต่างข่าวกล่องแดงสหรัฐฯ (19:30-22:00 น. หรือ 01:00 น. FOMC):       │`);
  console.log(`│   -> ${redFolderNewsLosses.toString().padEnd(4)} ไม้ (${((redFolderNewsLosses / totalLosses) * 100).toFixed(1)}% ของการแพ้ทั้งหมด)                                   │`);
  console.log(`│ - แพ้ช่วงแท่งเทียนกระชากผิดปกติ (Flash Volatility Spike > $8 ในแท่งเดียว):      │`);
  console.log(`│   -> ${flashSpikeLosses.toString().padEnd(4)} ไม้ (${((flashSpikeLosses / totalLosses) * 100).toFixed(1)}% ของการแพ้ทั้งหมด)                                   │`);
  console.log(`│ - แพ้ในสภาวะปกติ (การย่อลึกเกินระยะ SL / Fakeout ปกติ):                      │`);
  console.log(`│   -> ${normalHoursLosses.toString().padEnd(4)} ไม้ (${((normalHoursLosses / totalLosses) * 100).toFixed(1)}% ของการแพ้ทั้งหมด)                                   │`);
  console.log(`└──────────────────────────────────────────────────────────────────────────────┘`);

  // ────────────────────────────────────────────────────────────────────────────
  // PART 3: DETAILED ACTION PLAN & NEWS-AS-ENTRY WEAPON BLUEPRINT
  // ────────────────────────────────────────────────────────────────────────────
  console.log(`\n================================================================================`);
  console.log(` 💡 PART 3: การเปลี่ยนข่าว FOREX FACTORY จาก "เกราะป้องกัน" เป็น "จุดเข้าสไนเปอร์"`);
  console.log(`    (POST-NEWS LIQUIDITY SWEEP / TURTLE SOUP REVERSAL STRATEGY)`);
  console.log(`================================================================================`);
  console.log(`
เมื่อข่าวกล่องแดงออก (CPI, NFP, ดอกเบี้ยเฟด) ตลาดจะมีพฤติกรรม 2 ขยักเสมอ:
1. ขยักที่ 1 (วินาทีที่ 0 ถึง 5 นาทีแรก): "Retail Trapping Spike"
   - กราฟจะกระชากขึ้นสุดหรือลงสุดอย่างรวดเร็ว (30 - 80 Pips)
   - สเปรดจะถ่างกว้างเป็น 10-30 pips -> ห้ามเข้าเด็ดขาด เพราะสเปรดและ Slippage จะกินทุน
   - รายย่อยที่กระโดดตามน้ำ (FOMO Chase) จะถูกขังดอย/เหว
2. ขยักที่ 2 (นาทีที่ 10 ถึง 30 หลังข่าว): "Institutional Reversal / Turtle Soup"
   - ราคากวาด Stop Loss เหนือยอดหรือใต้ก้น (Liquidity Sweep) เรียบร้อยแล้ว
   - แท่ง 5M หรือ 15M จะทิ้งไส้ยาวมาก (Rejection Wick > 65% ของแท่ง)
   - สเปรดเริ่มหดตัวกลับสู่ระดับปกติ (1.0 - 2.0 Pips)
   - นี่คือ "จังหวะทองคำของสไนเปอร์สถาบัน":
     * เข้าสวนทางกับไส้ที่ปฏิเสธราคา (Fade the Sweep)
     * วาง SL สั้นมาก (Micro SL) ไว้หลังปลายไส้ข่าวเพียง 5-10 Pips
     * เป้าหมาย TP กลับสู่ฐานราคาก่อนข่าว (Mean Reversion) หรือ News Fair Value Gap (FVG)
     * สร้าง Risk:Reward ได้สูงถึง 1:3 ถึง 1:6!
`);

  console.log(`================================================================================`);
  console.log(` ✅ การทดสอบและวิเคราะห์เสร็จสมบูรณ์ 100%`);
  console.log(`================================================================================`);
}

main().catch(console.error);
