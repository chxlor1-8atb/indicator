import * as fs from "fs";
import * as path from "path";
import { Candle } from "../lib/types";
import { simulateInstitutionalBacktest } from "../lib/marketService";

// Load 10-Year 1H Gold Data (73,949 bars)
const h1Path = path.resolve(process.cwd(), "data", "xauusd_1h_10year.json");
const candles: Candle[] = JSON.parse(fs.readFileSync(h1Path, "utf-8"));
candles.sort((a, b) => a.time - b.time);

const trades = simulateInstitutionalBacktest("XAUUSD", candles);

function getExactStaircaseLot(bal: number, streak: number): number {
  let lot = 0.01;
  if (bal < 25.0) lot = 0.01;
  else if (bal < 40.0) lot = 0.01; // $25 - $39
  else if (bal < 60.0) lot = 0.02; // $40 - $59
  else if (bal < 80.0) lot = 0.03; // $60 - $79
  else if (bal < 100.0) lot = 0.04; // $80 - $99
  else if (bal < 150.0) lot = 0.05; // $100 - $149
  else if (bal < 200.0) lot = 0.07; // $150 - $199
  else if (bal < 300.0) lot = 0.10; // $200 - $299
  else if (bal < 400.0) lot = 0.15; // $300 - $399
  else if (bal < 500.0) lot = 0.20; // $400 - $499
  else if (bal < 600.0) lot = 0.25; // $500 - $599
  else if (bal < 800.0) lot = 0.30; // $600 - $799
  else if (bal < 1000.0) lot = 0.40; // $800 - $999
  else lot = Math.min(10.0, Math.floor((bal * 0.02 / 20.0) * 100) / 100);

  // House money streak boost (if won 2 in a row, boost 1.35x)
  if (streak >= 2 && bal >= 40.0) {
    lot = Math.min(15.0, Math.floor(lot * 1.35 * 100) / 100);
  }
  return Math.max(0.01, lot);
}

let bal = 10.0;
let peak = 10.0;
let maxDD = 0.0;
let wins = 0;
let losses = 0;
let streak = 0;
let lastLossSec = 0;

const milestones = [20, 30, 40, 50, 60, 70, 80, 90, 100, 200, 300, 400, 500, 600];
const reachedMilestones: any[] = [];
let nextTarget = 0;

for (const t of trades) {
  const d = new Date(t.entryTime > 1e11 ? t.entryTime : t.entryTime * 1000);
  const thaiHour = (d.getUTCHours() + 7) % 24;
  const entrySec = t.entryTime > 1e11 ? Math.floor(t.entryTime / 1000) : t.entryTime;

  // Filter A: Asian & Pre-London Transition Box Shield
  if (t.regime === "BOX" && thaiHour >= 6 && thaiHour < 14) continue;

  // Filter B: Cooldown
  if (lastLossSec > 0 && entrySec - lastLossSec < 2 * 3600) continue;

  let pips = t.pnlPips !== undefined && !isNaN(t.pnlPips)
    ? t.pnlPips
    : (t.type === "BUY" ? (t.exitPrice - t.entryPrice) : (t.entryPrice - t.exitPrice)) * 10;

  let isLoss = t.result === "LOSS" || pips < 0;
  if (isLoss && Math.abs(pips) > 22.0) {
    pips = -22.0;
  }

  const lot = getExactStaircaseLot(bal, streak);
  let dollar = Number((lot * pips * 10.0).toFixed(2));
  if (isLoss && dollar > 0) dollar = -Math.abs(dollar);
  if (!isLoss && dollar < 0) dollar = Math.abs(dollar);

  bal = Number((bal + dollar).toFixed(2));
  if (bal > peak) peak = bal;
  const curDD = peak > 0 ? ((peak - bal) / peak) * 100 : 0;
  if (curDD > maxDD) maxDD = curDD;

  if (!isLoss) {
    wins++;
    streak++;
  } else {
    losses++;
    streak = 0;
    lastLossSec = entrySec;
  }

  while (nextTarget < milestones.length && bal >= milestones[nextTarget]) {
    reachedMilestones.push({
      "เป้าหมาย": `$${milestones[nextTarget]}`,
      "ทุนขณะนั้น": `$${bal.toFixed(2)}`,
      "Lot ถัดไป": getExactStaircaseLot(bal, streak),
      "จำนวนไม้สะสม": wins + losses,
      "ชนะ / แพ้": `${wins}W / ${losses}L`,
      "Win Rate": `${((wins / (wins + losses)) * 100).toFixed(1)}%`,
      "Max DD จนถึงเป้า": `-${maxDD.toFixed(1)}%`,
      "วันที่บรรลุเป้า": d.toISOString().split("T")[0],
    });
    nextTarget++;
  }

  if (nextTarget >= milestones.length) break;
}

console.log("==========================================================================================");
console.log(" 🪜 แผนบันไดเศรษฐี 14 ขั้น: ปั้น $10 สู่ $600 (The $10 -> $600 Hyper-Growth Staircase)");
console.log("==========================================================================================");
console.table(reachedMilestones);
