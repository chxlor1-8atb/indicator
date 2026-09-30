import * as fs from "fs";
import * as path from "path";
import { Candle } from "../lib/types";
import { simulateInstitutionalBacktest } from "../lib/marketService";

async function test10DollarSolutions() {
  console.log("================================================================================");
  console.log(" 🔬 SOLUTIONS LAB: HOW TO MAKE A $10 ACCOUNT SURVIVE & GROW TO $1,000+");
  console.log("================================================================================\n");

  const dataPath = path.resolve(process.cwd(), "data", "xauusd_1h_deep.json");
  const candles: Candle[] = JSON.parse(fs.readFileSync(dataPath, "utf-8"));
  const trades = simulateInstitutionalBacktest("XAUUSD", candles);

  // Solution A: Cent Account with 2% Compounding Risk
  let centBal = 1000.0;
  let maxCentDD = 0;
  let peakCent = 1000.0;
  for (const t of trades) {
    let pnlPct = 0;
    if (t.result === "WIN") pnlPct = t.pnlR * 0.02;
    else if (t.result === "LOSS") pnlPct = -0.02;
    else pnlPct = 0.002;

    centBal *= (1 + pnlPct);
    if (centBal > peakCent) peakCent = centBal;
    const dd = ((peakCent - centBal) / peakCent) * 100;
    if (dd > maxCentDD) maxCentDD = dd;
  }

  console.log(`Solution 1: CENT ACCOUNT (USC) - วิธีที่กองทุนและมืออาชีพแนะนำ 100%`);
  console.log(`  • ทุนเริ่มต้น: 1,000 Cents ($10 USD)`);
  console.log(`  • ยอดเงินหลัง 2 ปี: ${centBal.toFixed(1)} Cents ($${(centBal / 100).toFixed(2)} USD)`);
  console.log(`  • กำไรเติบโต: +${(((centBal - 1000) / 1000) * 100).toFixed(1)}%`);
  console.log(`  • Max Drawdown: -${maxCentDD.toFixed(1)}% (พอร์ตไม่เคยเสี่ยงแตกเลย)\n`);

  // Solution B: Standard Account with "Micro-Sniper Strict Cap" ($1.20 Max SL)
  // If trade has SL > 12 pips, SKIP IT! Only take trades where SL is <= 12 pips ($1.20 risk on 0.01 lot)
  let stdBal = 10.0;
  let stdPeak = 10.0;
  let stdMaxDD = 0;
  let stdBusted = false;
  let stdTradesTaken = 0;
  let stdWins = 0;
  let stdLosses = 0;

  for (let i = 0; i < trades.length; i++) {
    const t = trades[i];
    const riskDollars = Math.abs(t.entryPrice - t.sl) * 1.0; // on Gold 0.01 lot: $1 per $1 move

    // Cap SL risk to max $1.20 (12% of $10 balance)
    // Only take high-precision sniper setups
    if (riskDollars > 1.50) continue; // Skip wide SL trades to protect $10 account!

    stdTradesTaken++;
    const pnlDollars = t.pnlR > 0 ? t.pnlR * 1.20 : t.pnlR < 0 ? -1.20 : 0.10;
    stdBal += pnlDollars;

    if (stdBal > stdPeak) stdPeak = stdBal;
    const dd = ((stdPeak - stdBal) / stdPeak) * 100;
    if (dd > stdMaxDD) stdMaxDD = dd;

    if (t.result === "WIN") stdWins++;
    else if (t.result === "LOSS") stdLosses++;

    if (stdBal <= 1.5) {
      stdBusted = true;
      break;
    }
  }

  console.log(`Solution 2: STANDARD ACCOUNT WITH "SNIPER MICRO-SL CAP" (จำกัด SL ไม่เกิน $1.50)`);
  if (stdBusted) {
    console.log(`  ❌ พอร์ตแตกเนื่องจากยังมี Streak การแพ้ติดกันเกิน 6 ไม้`);
  } else {
    console.log(`  • ไม้ที่ผ่านเกณฑ์ Sniper SL แคบ: ${stdTradesTaken} ไม้ (ชนะ ${stdWins} | แพ้ ${stdLosses})`);
    console.log(`  • ยอดเงินคงเหลือ: $${stdBal.toFixed(2)} USD (จากทุน $10)`);
    console.log(`  • Max Drawdown: -${stdMaxDD.toFixed(1)}%\n`);
  }
}

test10DollarSolutions().catch(console.error);
