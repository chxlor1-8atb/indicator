import * as fs from "fs";
import * as path from "path";
import { Candle, BacktestTrade } from "../lib/types";
import { simulateInstitutionalBacktest } from "../lib/marketService";

/**
 * Standard Account Ultra-Low Drawdown Dynamic Lot Sizing
 * คุม Drawdown สำหรับบัญชี Standard เริ่มต้น $10 USD
 * 
 * - $10 - $99: 0.01 lot
 * - $100 - $249: 0.02 lot
 * - $250 - $499: 0.04 lot
 * - $500 - $999: 0.08 lot
 * - $1000 - $2499: 0.15 lot
 * - $2500 - $4999: 0.30 lot
 * - $5000 - $9999: 0.60 lot
 * - $10000+: 1.0% institutional risk formula (Cap 5.0 lots)
 */
function getStandardLot(balance: number): number {
  if (balance < 100) return 0.01;
  if (balance < 250) return 0.02;
  if (balance < 500) return 0.04;
  if (balance < 1000) return 0.08;
  if (balance < 2500) return 0.15;
  if (balance < 5000) return 0.30;
  if (balance < 10000) return 0.60;
  return Math.min(5.0, Number((balance / 15000).toFixed(2)));
}

interface StandardRunResult {
  runId: number;
  description: string;
  startPeriod: string;
  initialBalance: number;
  finalBalance: number;
  profitUSD: number;
  roiPct: number;
  totalTrades: number;
  wins: number;
  losses: number;
  bes: number;
  winRate: number;
  maxDrawdownPct: number;
  maxLotReached: number;
  status: "SURVIVED" | "BUSTED";
  bustedAtTrade?: number;
}

function simulateStandardRun(
  trades: BacktestTrade[],
  runId: number,
  description: string,
  startPeriod: string
): StandardRunResult {
  const initialBalance = 10.0;
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

    if (t.result === "WIN") wins++;
    else if (t.result === "LOSS") losses++;
    else bes++;

    const lot = getStandardLot(balance);
    if (lot > maxLot) maxLot = lot;

    // Micro-SL Cap for small capital < $50: Cap risk at 25 pips ($2.50) to protect 0.01 lot
    let effPips = t.pnlPips;
    if (balance < 50 && effPips < 0) {
      effPips = Math.max(-25, effPips);
    }

    // Gold XAUUSD: 1 pip on 0.01 lot = $0.10 -> on `lot` = lot * 10 USD per pip
    const pnlUSD = Number((effPips * (lot * 10)).toFixed(2));
    balance += pnlUSD;

    if (balance > peak) peak = balance;
    const dd = ((peak - balance) / peak) * 100;
    if (dd > maxDDPct) maxDDPct = dd;

    // Margin stop-out threshold for 0.01 lot on Gold with 1:500 or 1:1000 leverage (~$1.50)
    if (balance <= 1.50 && !busted) {
      busted = true;
      bustTradeIdx = i + 1;
      break;
    }
  }

  const wr = wins + losses > 0 ? (wins / (wins + losses)) * 100 : 0;
  const profitUSD = Number((balance - initialBalance).toFixed(2));
  const roiPct = Number(((profitUSD / initialBalance) * 100).toFixed(1));

  return {
    runId,
    description,
    startPeriod,
    initialBalance,
    finalBalance: Number(balance.toFixed(2)),
    profitUSD,
    roiPct,
    totalTrades: trades.length,
    wins,
    losses,
    bes,
    winRate: Number(wr.toFixed(1)),
    maxDrawdownPct: Number(maxDDPct.toFixed(1)),
    maxLotReached: maxLot,
    status: busted ? "BUSTED" : "SURVIVED",
    bustedAtTrade: busted ? bustTradeIdx : undefined,
  };
}

async function main() {
  const dataPath = path.resolve(process.cwd(), "data", "xauusd_1h_deep.json");
  const candles: Candle[] = JSON.parse(fs.readFileSync(dataPath, "utf-8"));
  const allTrades = simulateInstitutionalBacktest("XAUUSD", candles);

  const winsAll = allTrades.filter((t) => t.result === "WIN").length;
  const lossesAll = allTrades.filter((t) => t.result === "LOSS").length;
  const besAll = allTrades.filter((t) => t.result === "BE").length;
  const totalWR = (winsAll / (winsAll + lossesAll)) * 100;

  console.log(`================================================================================`);
  console.log(` 🏆 สถิติภาพรวมระบบ (OVERALL BACKTEST STATS) บน XAUUSD (Gold 2 ปีเต็ม)`);
  console.log(`================================================================================`);
  console.log(`  - ไม้ทั้งหมด: ${allTrades.length} ไม้`);
  console.log(`  - ชนะ (WIN): ${winsAll} ไม้ (${((winsAll / allTrades.length) * 100).toFixed(1)}%)`);
  console.log(`  - เสมอ (BE): ${besAll} ไม้ (${((besAll / allTrades.length) * 100).toFixed(1)}%)`);
  console.log(`  - แพ้ (LOSS): ${lossesAll} ไม้ (${((lossesAll / allTrades.length) * 100).toFixed(1)}%)`);
  console.log(`  - 🎯 WIN RATE (ไม่นับเสมอ): ${totalWR.toFixed(2)}%`);
  console.log(`  - 🛡️ WIN + BE RATE (ไม่แพ้): ${(((winsAll + besAll) / allTrades.length) * 100).toFixed(2)}%\n`);

  // ────────────────────────────────────────────────────────────────────────────
  // TEST 1: 10 สภาวะตลาดจริง (10 Staggered Market Eras / Starting Points)
  // ────────────────────────────────────────────────────────────────────────────
  console.log(`================================================================================`);
  console.log(` 🧪 การทดสอบที่ 1: ปั้นพอร์ต $10 STANDARD ACCOUNT เริ่มเทรด 10 ช่วงเวลาในประวัติศาสตร์`);
  console.log(`    (ดูว่าถ้าผู้ใช้เริ่มฝาก $10 ในแต่ละเดือน/แต่ละรอบ จะรอดหรือแตก จบที่เท่าไหร่)`);
  console.log(`================================================================================\n`);

  const n = allTrades.length;
  const eraStep = Math.floor(n / 11);
  const eraResults: StandardRunResult[] = [];

  for (let i = 0; i < 10; i++) {
    const startIdx = i * eraStep;
    const subTrades = allTrades.slice(startIdx);
    const startTrade = subTrades[0];
    const tradeDate = startTrade && (startTrade as any).entryTime ? new Date((startTrade as any).entryTime).toLocaleDateString("th-TH") : `ไม้ที่ ${startIdx + 1}`;
    
    const res = simulateStandardRun(
      subTrades,
      i + 1,
      `รอบที่ ${i + 1}`,
      `เริ่มไม้ที่ #${startIdx + 1} (${subTrades.length} ไม้)`
    );
    eraResults.push(res);
  }

  console.table(
    eraResults.map((r) => ({
      "รอบที่": r.runId,
      "จุดเริ่มต้นในอดีต": r.startPeriod,
      "ทุนเริ่ม": `$${r.initialBalance.toFixed(2)}`,
      "ทุนจบ ($)": `$${r.finalBalance.toLocaleString(undefined, { maximumFractionDigits: 2 })}`,
      "กำไร ($)": "+$" + r.profitUSD.toLocaleString(undefined, { maximumFractionDigits: 2 }),
      "ROI (%)": "+" + r.roiPct.toLocaleString(undefined, { maximumFractionDigits: 1 }) + "%",
      "Lot สูงสุด": r.maxLotReached.toFixed(2),
      "Win Rate": `${r.winRate}%`,
      "Max DD": `-${r.maxDrawdownPct}%`,
      "ผลลัพธ์": r.status === "SURVIVED" ? "✅ รอดปลอดภัย" : `❌ แตก (ไม้ #${r.bustedAtTrade})`,
    }))
  );

  // ────────────────────────────────────────────────────────────────────────────
  // TEST 2: 10 MONTE CARLO RANDOM PERMUTATIONS (สลับสุ่มลำดับผลการเทรด 10 แบบ)
  // ────────────────────────────────────────────────────────────────────────────
  console.log(`\n================================================================================`);
  console.log(` 🎲 การทดสอบที่ 2: MONTE CARLO STRESS TEST 10 รอบ (สุ่มสลับลำดับไม้ 10 เมล็ดสุ่ม)`);
  console.log(`    (ทดสอบความเสี่ยงลำดับ Sequence Risk: ถ้าเจอช่วงแพ้ติดกันตั้งแต่แรก จะรอดไหม)`);
  console.log(`================================================================================\n`);

  function shuffle<T>(array: T[], seed: number): T[] {
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

  const monteSeeds = [42, 108, 256, 512, 777, 999, 1337, 2024, 2025, 2026];
  const monteResults: StandardRunResult[] = [];

  for (let i = 0; i < monteSeeds.length; i++) {
    const seed = monteSeeds[i];
    const shuffled = shuffle(allTrades, seed);
    const res = simulateStandardRun(
      shuffled,
      i + 1,
      `Seed #${seed}`,
      `สุ่มแบบ #${seed}`
    );
    monteResults.push(res);
  }

  console.table(
    monteResults.map((r) => ({
      "รอบที่": r.runId,
      "เมล็ดสุ่ม (Seed)": r.startPeriod,
      "ทุนเริ่ม": `$${r.initialBalance.toFixed(2)}`,
      "ทุนจบ ($)": `$${r.finalBalance.toLocaleString(undefined, { maximumFractionDigits: 2 })}`,
      "กำไร ($)": "+$" + r.profitUSD.toLocaleString(undefined, { maximumFractionDigits: 2 }),
      "Max DD": `-${r.maxDrawdownPct}%`,
      "Win Rate": `${r.winRate}%`,
      "ผลลัพธ์": r.status === "SURVIVED" ? "✅ รอดปลอดภัย" : `❌ ล้างพอร์ต (ไม้ #${r.bustedAtTrade})`,
    }))
  );

  const survivedEras = eraResults.filter((r) => r.status === "SURVIVED").length;
  const survivedMonte = monteResults.filter((r) => r.status === "SURVIVED").length;

  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(` 📌 สรุปอัตราการรอดชีวิตของพอร์ต $10 STANDARD ACCOUNT:`);
  console.log(`   - 10 Market Eras (ประวัติศาสตร์จริง 10 ช่วง): รอด ${survivedEras}/10 (${((survivedEras/10)*100).toFixed(0)}%)`);
  console.log(`   - 10 Monte Carlo Stress Runs (สุ่มสลับลำดับ 10 แบบ): รอด ${survivedMonte}/10 (${((survivedMonte/10)*100).toFixed(0)}%)`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
}

main().catch(console.error);
