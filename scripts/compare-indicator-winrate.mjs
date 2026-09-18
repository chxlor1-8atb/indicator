/**
 * compare-indicator-winrate.mjs v3 — Statistical Comparison (50+ trades)
 */
function calcEMA(candles, period) {
  const r = new Array(candles.length).fill(null);
  if (candles.length < period) return r;
  const k = 2 / (period + 1);
  let ema = candles.slice(0, period).reduce((s, c) => s + c.close, 0) / period;
  r[period - 1] = ema;
  for (let i = period; i < candles.length; i++) { ema = candles[i].close * k + ema * (1 - k); r[i] = ema; }
  return r;
}
function calcRSI(candles, period) {
  const r = new Array(candles.length).fill(50);
  let gains = 0, losses = 0;
  for (let i = 1; i <= period && i < candles.length; i++) { const d = candles[i].close - candles[i-1].close; if (d >= 0) gains += d; else losses -= d; }
  let ag = gains / period, al = losses / period;
  r[period] = al === 0 ? 100 : 100 - 100 / (1 + ag / al);
  for (let i = period + 1; i < candles.length; i++) {
    const d = candles[i].close - candles[i-1].close;
    ag = (ag * (period - 1) + Math.max(d, 0)) / period;
    al = (al * (period - 1) + Math.max(-d, 0)) / period;
    r[i] = al === 0 ? 100 : 100 - 100 / (1 + ag / al);
  }
  return r;
}
function calcATR(candles, period) {
  const r = new Array(candles.length).fill(100);
  const trs = candles.map((c, i) => i === 0 ? c.high - c.low : Math.max(c.high - c.low, Math.abs(c.high - candles[i-1].close), Math.abs(c.low - candles[i-1].close)));
  let atr = trs.slice(0, period).reduce((s, v) => s + v, 0) / period;
  r[period - 1] = atr;
  for (let i = period; i < candles.length; i++) { atr = (atr * (period - 1) + trs[i]) / period; r[i] = atr; }
  return r;
}

// สร้าง 2000 แท่งด้วย trend ชัดเจน
function generateCandles(count = 2000) {
  let price = 62000;
  const candles = [];
  let seed = 999;
  const rand = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return (seed >>> 0) / 0xffffffff; };
  let trendDir = 1, trendBars = 0, maxTrend = 40;
  for (let i = 0; i < count; i++) {
    trendBars++;
    if (trendBars > maxTrend) { trendDir = rand() > 0.4 ? -trendDir : trendDir; trendBars = 0; maxTrend = 20 + Math.floor(rand() * 50); }
    const vol = 100 + rand() * 150;
    const trendStrength = 0.4 + rand() * 0.5;
    const noise = (rand() - 0.5) * 0.6;
    const netDir = trendDir * trendStrength + noise;
    const body = vol * netDir * 0.4;
    const open = price, close = price + body;
    const wick = vol * 0.3;
    const high = Math.max(open, close) + rand() * wick;
    const low = Math.min(open, close) - rand() * wick;
    candles.push({ time: 1720000000 + i * 3600, open, high, low, close, volume: 500 + rand() * 1000 });
    price = close;
  }
  return candles;
}

// ─── Simplified but statistically robust backtest ────────────────────────────
function runBacktest(candles, config) {
  const { rsiPeriod, f1, s1, t1, ma1, ma2, useMaCross, rsiLo, rsiHi, label } = config;
  const ema_f = calcEMA(candles, f1);
  const ema_s = calcEMA(candles, s1);
  const ema_t = calcEMA(candles, t1);
  const rsi   = calcRSI(candles, rsiPeriod);
  const atr   = calcATR(candles, 14);
  const ema_ma1 = ma1 ? calcEMA(candles, ma1) : null;
  const ema_ma2 = ma2 ? calcEMA(candles, ma2) : null;
  const TP = 2.0, START = t1 + 10;
  const trades = [];
  let active = null;

  for (let i = START; i < candles.length; i++) {
    const c = candles[i], prev = candles[i-1];
    const fv = ema_f[i], sv = ema_s[i], tv = ema_t[i];
    const rv = rsi[i], rpv = rsi[i-1] ?? rv;
    const curATR = atr[i];
    if (!fv || !sv || !tv || !curATR) continue;

    // Manage
    if (active) {
      const isLong = active.type === "BUY";
      const hit08 = isLong ? c.high >= active.tp08 : c.low <= active.tp08;
      const hitTP = isLong ? c.high >= active.tp2  : c.low <= active.tp2;
      const hitSL = isLong ? c.low <= active.sl    : c.high >= active.sl;
      if (!active.beHit && hit08) { active.beHit = true; active.sl = active.entry; }
      if (hitTP) { trades.push({ r:"WIN", pnl:TP }); active = null; continue; }
      if (hitSL) { trades.push({ r: active.beHit?"BE":"LOSS", pnl: active.beHit?0.1:-1 }); active = null; continue; }
    }
    if (active) continue;

    // Trend
    const sSlope = sv - (ema_s[i-3] ?? sv);
    const isBull = fv > sv && c.close > tv && sSlope >= 0;
    const isBear = fv < sv && c.close < tv && sSlope <= 0;

    // Zone: ราคาอยู่ระหว่าง fast-slow EMA
    const inLong = c.close > sv * 0.99 && c.close < fv * 1.01 && rv >= rsiLo && rv <= rsiHi;
    const inShort = c.close < sv * 1.01 && c.close > fv * 0.99 && rv <= (100-rsiLo) && rv >= (100-rsiHi);

    // Pattern: bull/bear bar
    const bull = c.close > c.open;
    const bear = c.close < c.open;
    const rsiBull = rv >= rpv;
    const rsiBear = rv <= rpv;

    // MA cross
    let maBull = true, maBear = true;
    if (useMaCross && ema_ma1 && ema_ma2 && ema_ma1[i] && ema_ma2[i]) {
      maBull = ema_ma1[i] > ema_ma2[i];
      maBear = ema_ma1[i] < ema_ma2[i];
    }

    if (isBull && inLong && bull && rsiBull && maBull) {
      const entry = c.close;
      const swL = Math.min(...candles.slice(Math.max(0,i-5),i+1).map(k=>k.low));
      const slD = Math.max(entry - swL + curATR*0.25, curATR*1.0);
      active = { type:"BUY", entry, sl:entry-slD, tp08:entry+slD*0.8, tp2:entry+slD*TP, beHit:false };
    } else if (isBear && inShort && bear && rsiBear && maBear) {
      const entry = c.close;
      const swH = Math.max(...candles.slice(Math.max(0,i-5),i+1).map(k=>k.high));
      const slD = Math.max(swH - entry + curATR*0.25, curATR*1.0);
      active = { type:"SELL", entry, sl:entry+slD, tp08:entry-slD*0.8, tp2:entry-slD*TP, beHit:false };
    }
  }

  const W = trades.filter(t=>t.r==="WIN").length;
  const L = trades.filter(t=>t.r==="LOSS").length;
  const B = trades.filter(t=>t.r==="BE").length;
  const T = trades.length;
  const res = W + L;
  const wr  = res > 0 ? ((W/res)*100).toFixed(1) : "0.0";
  const net = trades.reduce((s,t)=>s+t.pnl,0).toFixed(2);
  const pf  = L > 0 ? (W*TP/L).toFixed(2) : W > 0 ? "INF" : "N/A";
  return { label, T, W, L, B, wr, net, pf };
}

const candles = generateCandles(2000);
const configs = [
  { label:"A) ระบบเดิม  — RSI(14) + EMA(20/50/200)",           rsiPeriod:14, f1:20, s1:50,  t1:200, ma1:null, ma2:null, useMaCross:false, rsiLo:35, rsiHi:72 },
  { label:"B) Fast [ภาพ]— RSI(7)  + EMA(9/21/50)",             rsiPeriod:7,  f1:9,  s1:21,  t1:50,  ma1:9,    ma2:21,   useMaCross:false, rsiLo:30, rsiHi:68 },
  { label:"C) Hybrid    — RSI(7)  + EMA(20/50/200)+MA9/21",    rsiPeriod:7,  f1:20, s1:50,  t1:200, ma1:9,    ma2:21,   useMaCross:true,  rsiLo:30, rsiHi:68 },
  { label:"D) Sniper    — RSI(7)  + EMA(20/50/200) StrictZone",rsiPeriod:7,  f1:20, s1:50,  t1:200, ma1:9,    ma2:21,   useMaCross:true,  rsiLo:38, rsiHi:62 },
];

console.log("\n" + "=".repeat(90));
console.log("  📊  WIN RATE COMPARISON — " + candles.length + " candles | BTC-like 1H Synthetic");
console.log("=".repeat(90));
console.log(`  Price range: ${Math.min(...candles.map(c=>c.low)).toFixed(0)} – ${Math.max(...candles.map(c=>c.high)).toFixed(0)}\n`);

const hdr = "Config".padEnd(55) + "| Trades |  WIN | LOSS |  BE | Win%    | Net(R)  |  PF";
console.log(hdr);
console.log("-".repeat(hdr.length));

const results = configs.map(cfg => {
  const r = runBacktest(candles, cfg);
  const lbl = r.label.padEnd(54).slice(0,54);
  const badge = parseFloat(r.wr) >= 60 ? " ✅" : parseFloat(r.wr) >= 50 ? " ⚡" : " ❌";
  console.log(`${lbl} |  ${String(r.T).padStart(5)} | ${String(r.W).padStart(4)} | ${String(r.L).padStart(4)} | ${String(r.B).padStart(3)} | ${String(r.wr+"%").padStart(6)}${badge} | ${String(r.net).padStart(7)} | ${r.pf}`);
  return r;
});

const [a,b,c,d] = results;
const [wrA,wrB,wrC,wrD] = [a,b,c,d].map(x=>parseFloat(x.wr));
const best = results.reduce((bst,r)=>parseFloat(r.wr)>parseFloat(bst.wr)?r:bst);

console.log("\n─── สรุปผล ──────────────────────────────────────────────────────────────");
console.log(`  🏆 Config ที่ดีที่สุด: ${best.label}`);
console.log(`     Win Rate: ${best.wr}% | ${best.W}W / ${best.L}L / ${best.B}BE | Net: ${best.net}R | PF: ${best.pf}`);
console.log(`\n  Δ B-A: ${wrB>=wrA?"+":""}${(wrB-wrA).toFixed(1)}%  │  Δ C-A: ${wrC>=wrA?"+":""}${(wrC-wrA).toFixed(1)}%  │  Δ D-A: ${wrD>=wrA?"+":""}${(wrD-wrA).toFixed(1)}%`);
console.log(`\n  Recommendation:`);
if (wrC >= wrA && c.T >= 10) console.log(`  → นำ Config C (Hybrid) มาใช้: Win Rate +${(wrC-wrA).toFixed(1)}% ด้วย ${c.T} trades`);
else if (wrD >= wrA && d.T >= 5) console.log(`  → นำ Config D (Sniper) มาใช้: แม่นขึ้น +${(wrD-wrA).toFixed(1)}% (trade น้อยลง = คุณภาพสูงกว่า)`);
else if (wrB >= wrA) console.log(`  → Fast settings (B) ดีกว่า +${(wrB-wrA).toFixed(1)}% แต่ระวัง noise บน TF สูง`);
else console.log(`  → ระบบเดิม (A) ดีที่สุดสำหรับ 1H trend-following ยังไม่ควรเปลี่ยน`);
console.log("=".repeat(90) + "\n");
