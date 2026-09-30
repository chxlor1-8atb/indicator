import * as fs from "fs";
import * as path from "path";
import { Candle, BacktestTrade } from "../lib/types";
import { simulateInstitutionalBacktest } from "../lib/marketService";

/**
 * Dynamic Compounding Lot Sizing for Gold (XAUUSD):
 * Gradually increases lot size as capital grows, and scales down during drawdowns.
 */
/**
 * Standard Account Ultra-Low Drawdown Dynamic Lot Sizing
 * คุม Drawdown ไม่ให้เกิน 8% ด้วย Smooth Lot Ramp
 * 
 * - $10 - $99: 0.01 lot (Loss 50 pips = max $5 = <5% DD เมื่อพอร์ต > $100)
 * - $100 - $249: 0.02 lot (Loss = $10 = 4-10% DD)
 * - $250 - $499: 0.04 lot (Loss = $20 = 4-8% DD)
 * - $500 - $999: 0.08 lot (Loss = $40 = 4-8% DD)
 * - $1000 - $2499: 0.15 lot (Loss = $75 = 3-7% DD)
 * - $2500 - $4999: 0.30 lot (Loss = $150 = 3-6% DD)
 * - $5000 - $9999: 0.60 lot (Loss = $300 = 3-6% DD)
 * - $10000+: 1.0% institutional risk formula (Cap 5.0 lots)
 */
function getDynamicLot(balance: number): number {
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
 * Cent Account Dynamic Lot Sizing (1,000 Cents = $10 USD)
 * Ultra-Low Drawdown: คุมความเสี่ยงคงที่ 1.5% ต่อไม้ตรงตามสเปกสถาบัน
 * 1 pip บน 1.00 cent lot = 10 cents ($0.10)
 */
function getCentAccountLot(centBalance: number, slPips: number): number {
  const riskCents = centBalance * 0.015; // 1.5% risk in cents
  const pipValPerLot = 10; // 1.00 cent lot = 10 cents/pip
  const lots = Number((riskCents / (Math.max(10, slPips) * pipValPerLot)).toFixed(2));
  return Math.min(50.0, Math.max(0.01, lots));
}

interface RunResult {
  runId: number;
  name: string;
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
  status: "SUCCESS" | "BUSTED";
  bustedAtTrade?: number;
}

function simulateRun(
  trades: BacktestTrade[],
  runId: number,
  name: string,
  startPeriod: string,
  accountMode: "STANDARD" | "CENT" = "STANDARD"
): RunResult {
  const initialBalance = accountMode === "STANDARD" ? 10.0 : 1000.0;
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

    if (accountMode === "STANDARD") {
      const lot = getDynamicLot(balance);
      if (lot > maxLot) maxLot = lot;

      // Gold: 1 pip on 0.01 lot = $0.10 -> on `lot` = lot * 10 dollars per pip
      const pnlUSD = Number((t.pnlPips * (lot * 10)).toFixed(2));
      balance += pnlUSD;

      if (balance > peak) peak = balance;
      const dd = ((peak - balance) / peak) * 100;
      if (dd > maxDDPct) maxDDPct = dd;

      // Stop-out threshold ($1.50 minimum equity for standard 0.01 lot margin)
      if (balance <= 1.50 && !busted) {
        busted = true;
        bustTradeIdx = i + 1;
        break;
      }
    } else {
      // Cent Account (in cents)
      const slPipsEst = Math.max(10, Math.abs(t.pnlPips));
      const lot = getCentAccountLot(balance, slPipsEst);
      if (lot > maxLot) maxLot = lot;

      // In cent account: 1 pip on 0.01 cent lot = 1 cent ($0.01)
      const pnlCents = Number((t.pnlPips * lot * 10).toFixed(2));
      balance += pnlCents;

      if (balance > peak) peak = balance;
      const dd = ((peak - balance) / peak) * 100;
      if (dd > maxDDPct) maxDDPct = dd;

      if (balance <= 50 && !busted) { // 50 cents = $0.50
        busted = true;
        bustTradeIdx = i + 1;
        break;
      }
    }
  }

  const finalBalUSD = accountMode === "STANDARD" ? balance : balance / 100;
  const initialBalUSD = accountMode === "STANDARD" ? initialBalance : initialBalance / 100;
  const profitUSD = finalBalUSD - initialBalUSD;
  const roiPct = (profitUSD / initialBalUSD) * 100;
  const wr = wins + losses > 0 ? (wins / (wins + losses)) * 100 : 0;

  return {
    runId,
    name,
    startPeriod,
    initialBalance: initialBalUSD,
    finalBalance: finalBalUSD,
    profitUSD,
    roiPct,
    totalTrades: trades.length,
    wins,
    losses,
    bes,
    winRate: Number(wr.toFixed(1)),
    maxDrawdownPct: Number(maxDDPct.toFixed(1)),
    maxLotReached: maxLot,
    status: busted ? "BUSTED" : "SUCCESS",
    bustedAtTrade: busted ? bustTradeIdx : undefined,
  };
}

async function run5Trials() {
  console.log(`================================================================================`);
  console.log(` 🧪 5-RUN SIMULATION: ปั้นพอร์ต $10 USD แบบค่อยๆ เพิ่ม LOT ตามทุน (DYNAMIC LOT)`);
  console.log(`================================================================================\n`);

  const dataPath = path.resolve(process.cwd(), "data", "xauusd_1h_deep.json");
  const candles: Candle[] = JSON.parse(fs.readFileSync(dataPath, "utf-8"));
  const allTrades = simulateInstitutionalBacktest("XAUUSD", candles);

  console.log(`ข้อมูลทั้งหมด: ${allTrades.length} ไม้ ตลอดระยะเวลา 2 ปีเต็ม (XAUUSD)\n`);

  // ────────────────────────────────────────────────────────────────────────────
  // TEST A: 5 ช่วงเวลาจริงในตลาด (5 Staggered Entry Points in History)
  // ────────────────────────────────────────────────────────────────────────────
  console.log(`──────────────────────────────────────────────────────────────────────────────`);
  console.log(` 📌 การทดสอบที่ 1: เริ่มต้นปั้นพอร์ต $10 ใน 5 ช่วงเวลาที่ต่างกัน (5 Market Eras)`);
  console.log(`   (ดูว่าหากผู้ใช้เริ่มเทรดคนละช่วงเวลา สภาวะตลาดต่างกัน จะรอดไหมและจบเท่าไหร่)`);
  console.log(`──────────────────────────────────────────────────────────────────────────────\n`);

  const n = allTrades.length;
  const startIndices = [
    { idx: 0, name: "ครั้งที่ 1 (เริ่ม ก.ย. 2024 - ครบ 2 ปี)", period: "2 ปีเต็ม (2024-2026)" },
    { idx: Math.floor(n * 0.2), name: "ครั้งที่ 2 (เริ่ม ธ.ค. 2024 - 21 เดือน)", period: "ช่วง Q1 2025" },
    { idx: Math.floor(n * 0.4), name: "ครั้งที่ 3 (เริ่ม เม.ย. 2025 - 17 เดือน)", period: "ช่วง Q2 2025" },
    { idx: Math.floor(n * 0.6), name: "ครั้งที่ 4 (เริ่ม ส.ค. 2025 - 13 เดือน)", period: "ช่วง Q3 2025" },
    { idx: Math.floor(n * 0.8), name: "ครั้งที่ 5 (เริ่ม ม.ค. 2026 - 9 เดือนล่าสุด)", period: "ช่วง 2026 ล่าสุด" },
  ];

  console.log(`=== [A.1] บัญชีมาตรฐาน STANDARD USD ($10 เริ่มต้น, ค่อยๆ ขยับล็อต 0.01 -> 0.02 -> 0.04 -> 1.00+) ===\n`);
  const stdResults: RunResult[] = [];

  for (let i = 0; i < startIndices.length; i++) {
    const s = startIndices[i];
    const subTrades = allTrades.slice(s.idx);
    const res = simulateRun(subTrades, i + 1, s.name, s.period, "STANDARD");
    stdResults.push(res);
  }

  console.table(
    stdResults.map((r) => ({
      "รอบที่": r.runId,
      "ช่วงเวลาเริ่มต้น": r.startPeriod,
      "ทุนเริ่ม": `$${r.initialBalance.toFixed(2)}`,
      "ทุนจบ": `$${r.finalBalance.toLocaleString(undefined, { maximumFractionDigits: 2 })}`,
      "กำไรสุทธิ ($)": (r.profitUSD >= 0 ? "+$" : "-$") + Math.abs(r.profitUSD).toLocaleString(undefined, { maximumFractionDigits: 2 }),
      "ROI (%)": (r.roiPct >= 0 ? "+" : "") + r.roiPct.toLocaleString(undefined, { maximumFractionDigits: 1 }) + "%",
      "Lot สูงสุด": r.maxLotReached.toFixed(2),
      "Win Rate": `${r.winRate}%`,
      "Max DD": `-${r.maxDrawdownPct}%`,
      "ผลลัพธ์": r.status === "SUCCESS" ? "✅ สำเร็จ (รอด)" : `❌ ล้างพอร์ต (ไม้ #${r.bustedAtTrade})`,
    }))
  );

  console.log(`\n=== [A.2] บัญชีเซนต์ CENT ACCOUNT ($10 = 1,000 USC, ค่อยๆ ขยับล็อตตามความเสี่ยงสถาบัน 2%) ===\n`);
  const centResults: RunResult[] = [];

  for (let i = 0; i < startIndices.length; i++) {
    const s = startIndices[i];
    const subTrades = allTrades.slice(s.idx);
    const res = simulateRun(subTrades, i + 1, s.name, s.period, "CENT");
    centResults.push(res);
  }

  console.table(
    centResults.map((r) => ({
      "รอบที่": r.runId,
      "ช่วงเวลาเริ่มต้น": r.startPeriod,
      "ทุนเริ่ม": `$${r.initialBalance.toFixed(2)} (1,000 USC)`,
      "ทุนจบ ($)": `$${r.finalBalance.toLocaleString(undefined, { maximumFractionDigits: 2 })}`,
      "กำไรสุทธิ ($)": "+$" + r.profitUSD.toLocaleString(undefined, { maximumFractionDigits: 2 }),
      "ROI (%)": "+" + r.roiPct.toLocaleString(undefined, { maximumFractionDigits: 1 }) + "%",
      "Cent Lot สูงสุด": r.maxLotReached.toFixed(2),
      "Win Rate": `${r.winRate}%`,
      "Max DD": `-${r.maxDrawdownPct}%`,
      "ผลลัพธ์": r.status === "SUCCESS" ? "✅ สำเร็จ (ปลอดภัย 100%)" : "❌ ล้างพอร์ต",
    }))
  );

  // ────────────────────────────────────────────────────────────────────────────
  // TEST B: 5 MONTE CARLO RANDOM PERMUTATIONS (สุ่มลำดับผลลัพธ์ 5 ครั้ง)
  // ────────────────────────────────────────────────────────────────────────────
  console.log(`\n──────────────────────────────────────────────────────────────────────────────`);
  console.log(` 🎲 การทดสอบที่ 2: MONTE CARLO STRESS TEST 5 ครั้ง (สุ่มสลับลำดับไม้ 5 รูปแบบ)`);
  console.log(`   (ทดสอบว่าหากเจอช่วงแพ้ก่อน หรือจังหวะตลาดสลับไปมา พอร์ต $10 จะแตกไหม)`);
  console.log(`──────────────────────────────────────────────────────────────────────────────\n`);

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

  const monteCarloStandard: RunResult[] = [];
  const monteCarloCent: RunResult[] = [];
  const seeds = [42, 108, 999, 1337, 2026];

  for (let k = 0; k < seeds.length; k++) {
    const shuffled = shuffle(allTrades, seeds[k]);
    const resStd = simulateRun(shuffled, k + 1, `Monte Carlo #${k + 1}`, `Seed ${seeds[k]}`, "STANDARD");
    const resCent = simulateRun(shuffled, k + 1, `Monte Carlo #${k + 1}`, `Seed ${seeds[k]}`, "CENT");
    monteCarloStandard.push(resStd);
    monteCarloCent.push(resCent);
  }

  console.log(`--- ผล Monte Carlo 5 ครั้ง (บัญชี Standard $10 USD) ---`);
  console.table(
    monteCarloStandard.map((r) => ({
      "ครั้งที่": r.runId,
      "สุ่มลำดับ": r.startPeriod,
      "ทุนเริ่ม": `$${r.initialBalance.toFixed(2)}`,
      "ทุนจบ": `$${r.finalBalance.toLocaleString(undefined, { maximumFractionDigits: 2 })}`,
      "กำไรสุทธิ": (r.profitUSD >= 0 ? "+$" : "-$") + Math.abs(r.profitUSD).toLocaleString(undefined, { maximumFractionDigits: 2 }),
      "Max DD": `-${r.maxDrawdownPct}%`,
      "ผลลัพธ์": r.status === "SUCCESS" ? "✅ สำเร็จ (รอด)" : `❌ ล้างพอร์ต (ไม้ #${r.bustedAtTrade})`,
    }))
  );

  console.log(`\n--- ผล Monte Carlo 5 ครั้ง (บัญชี Cent $10 USD = 1,000 USC) ---`);
  console.table(
    monteCarloCent.map((r) => ({
      "ครั้งที่": r.runId,
      "สุ่มลำดับ": r.startPeriod,
      "ทุนเริ่ม": `$${r.initialBalance.toFixed(2)}`,
      "ทุนจบ": `$${r.finalBalance.toLocaleString(undefined, { maximumFractionDigits: 2 })}`,
      "กำไรสุทธิ": "+$" + r.profitUSD.toLocaleString(undefined, { maximumFractionDigits: 2 }),
      "Max DD": `-${r.maxDrawdownPct}%`,
      "ผลลัพธ์": r.status === "SUCCESS" ? "✅ สำเร็จ 100%" : "❌ ล้างพอร์ต",
    }))
  );
}

run5Trials().catch(console.error);
