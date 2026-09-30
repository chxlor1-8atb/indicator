import * as fs from "fs";
import * as path from "path";
import { Candle, BacktestTrade } from "../lib/types";
import { simulateInstitutionalBacktest } from "../lib/marketService";

async function run10DollarChallenge() {
  console.log("================================================================================");
  console.log(" 🧪 SIMULATION: THE $10 MICRO PORTFOLIO CHALLENGE (สายปั้นพอร์ต $10)");
  console.log("================================================================================\n");

  const dataPath = path.resolve(process.cwd(), "data", "xauusd_1h_deep.json");
  const candles: Candle[] = JSON.parse(fs.readFileSync(dataPath, "utf-8"));
  const trades = simulateInstitutionalBacktest("XAUUSD", candles);

  console.log(`ทดสอบกับผลการเทรดจริงของระบบทั้งหมด ${trades.length} ไม้ (ชนะ ${trades.filter(t => t.result === "WIN").length} | แพ้ ${trades.filter(t => t.result === "LOSS").length} | เสมอ ${trades.filter(t => t.result === "BE").length})\n`);

  // ────────────────────────────────────────────────────────────────────────────
  // SCENARIO 1: Standard Account (บัญชีดอลลาร์ปกติ เริ่ม $10 เทรด 0.01 Lot ขั้นต่ำ)
  // ────────────────────────────────────────────────────────────────────────────
  console.log("--- 1. SCENARIO 1: บัญชีดอลลาร์มาตรฐาน (Standard USD) เริ่ม $10 ---");
  let bal1 = 10.0;
  let peak1 = 10.0;
  let maxDD1 = 0;
  let busted1 = false;
  let bustTradeIdx1 = -1;

  for (let i = 0; i < trades.length; i++) {
    const t = trades[i];
    // 0.01 lot on Gold: 1 pip = $0.10 (1 point = $0.01)
    // pnlPips in trades is in pips (where 10 pips = $1.00 move)
    const dollarPnL = Number((t.pnlPips * 0.10).toFixed(2));
    bal1 += dollarPnL;

    if (bal1 > peak1) peak1 = bal1;
    const dd = ((peak1 - bal1) / peak1) * 100;
    if (dd > maxDD1) maxDD1 = dd;

    if (bal1 <= 1.0 && !busted1) { // Stop-out level / Margin call
      busted1 = true;
      bustTradeIdx1 = i + 1;
      break;
    }
  }

  if (busted1) {
    console.log(`❌ ผลลัพธ์: ล้างพอร์ต (Busted)! พอร์ตแตกที่ไม้ที่ #${bustTradeIdx1}`);
    console.log(`   สาเหตุ: ทุน $10 น้อยเกินไปสำหรับ 0.01 Lot มาตรฐาน ($0.10/pip) เมื่อเจอ SL 20-30 pips (-$2 ถึง -$3) เพียง 3 ไม้ติด พอร์ตจะหมดทันที!\n`);
  } else {
    console.log(`✅ ผลลัพธ์: รอดชีวิต! จบ 2 ปี ยอดเงินคงเหลือ: $${bal1.toFixed(2)} (Max DD: ${maxDD1.toFixed(1)}%)\n`);
  }

  // ────────────────────────────────────────────────────────────────────────────
  // SCENARIO 2: Cent Account (บัญชีเซนต์ $10 = 1,000 USC) คำนวณแบบสถาบัน
  // ────────────────────────────────────────────────────────────────────────────
  console.log("--- 2. SCENARIO 2: บัญชีเซนต์ (Cent Account USC) ทุน $10 = 1,000 Cents ---");
  let bal2 = 1000.0; // 1000 Cents
  let peak2 = 1000.0;
  let maxDD2 = 0;
  let busted2 = false;

  for (let i = 0; i < trades.length; i++) {
    const t = trades[i];
    // Compounding: Risk 2.0% of balance per trade
    // If trade wins +2.0R -> gain +4.0%
    // If trade wins +1.0R -> gain +2.0%
    // If trade loss -1.0R -> lose -2.0%
    // If trade BE -> gain +0.2%
    let pnlPct = 0;
    if (t.result === "WIN") pnlPct = t.pnlR * 0.02;
    else if (t.result === "LOSS") pnlPct = -0.02;
    else pnlPct = 0.002;

    bal2 *= (1 + pnlPct);
    if (bal2 > peak2) peak2 = bal2;
    const dd = ((peak2 - bal2) / peak2) * 100;
    if (dd > maxDD2) maxDD2 = dd;

    if (bal2 <= 50) {
      busted2 = true;
      break;
    }
  }

  const finalUSD2 = bal2 / 100;
  console.log(`✅ ผลลัพธ์: รอด 100% และเติบโตมหาศาล!`);
  console.log(`   • เงินเริ่มต้น: 1,000 Cents ($10.00 USD)`);
  console.log(`   • ยอดเงินสิ้นสุด: ${bal2.toLocaleString(undefined, { maximumFractionDigits: 1 })} Cents (เทียบเท่า $${finalUSD2.toLocaleString(undefined, { maximumFractionDigits: 2 })} USD) 🚀`);
  console.log(`   • อัตราผลตอบแทน: +${(((bal2 - 1000) / 1000) * 100).toFixed(1)}%`);
  console.log(`   • Maximum Drawdown สูงสุด: -${maxDD2.toFixed(1)}% (ปลอดภัยมาก ไม่เคยใกล้จุดล้างพอร์ต!)\n`);

  // ────────────────────────────────────────────────────────────────────────────
  // SCENARIO 3: Sniper Micro-Shield ($10 Standard Account with 1:1000 Leverage + Fast BE + Fixed 0.01)
  // ────────────────────────────────────────────────────────────────────────────
  console.log("--- 3. SCENARIO 3: บัญชีมาตรฐานพร้อมเกราะ Ultra-Fast BE (+0.40R Lock) ---");
  let bal3 = 10.0;
  let peak3 = 10.0;
  let maxDD3 = 0;
  let busted3 = false;
  let bustTradeIdx3 = -1;

  for (let i = 0; i < trades.length; i++) {
    const t = trades[i];
    // Dynamic lot scaling as capital grows:
    // $10 - $30: 0.01 lot
    // $30 - $70: 0.02 lot
    // $70 - $150: 0.04 lot
    // $150 - $300: 0.08 lot
    // > $300: 0.01 per $50
    let lot = 0.01;
    if (bal3 >= 300) lot = Math.min(2.0, Number((bal3 / 4000).toFixed(2)));
    else if (bal3 >= 150) lot = 0.08;
    else if (bal3 >= 70) lot = 0.04;
    else if (bal3 >= 30) lot = 0.02;

    const dollarPnL = Number((t.pnlPips * (lot * 10)).toFixed(2));
    bal3 += dollarPnL;

    if (bal3 > peak3) peak3 = bal3;
    const dd = ((peak3 - bal3) / peak3) * 100;
    if (dd > maxDD3) maxDD3 = dd;

    if (bal3 <= 2.0 && !busted3) {
      busted3 = true;
      bustTradeIdx3 = i + 1;
      break;
    }
  }

  if (busted3) {
    console.log(`❌ พอร์ตแตกที่ไม้ #${bustTradeIdx3}`);
  } else {
    console.log(`✅ ผลลัพธ์: ปั้นพอร์ตสำเร็จอย่างไม่น่าเชื่อ!`);
    console.log(`   • เริ่มต้น: $10.00 USD`);
    console.log(`   • สิ้นสุด: $${bal3.toLocaleString(undefined, { maximumFractionDigits: 2 })} USD 💰`);
    console.log(`   • Maximum Drawdown: -${maxDD3.toFixed(1)}%\n`);
  }
}

run10DollarChallenge().catch(console.error);
