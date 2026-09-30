import { getMarketCandles, simulateInstitutionalBacktest } from "../lib/marketService";

async function test() {
  const candles = await getMarketCandles("XAUUSD", "15m");
  const allTrades = simulateInstitutionalBacktest("XAUUSD", candles);
  
  // Filter: extend Box shield to 13:59 (i.e. < 14:00 Thai Time)
  const filtered = allTrades.filter(t => {
    const d = new Date(t.entryTime > 1e11 ? t.entryTime : t.entryTime * 1000);
    const thaiHour = (d.getUTCHours() + 7) % 24;
    const thaiMin = d.getUTCMinutes();
    
    // US Open Whip
    if ((thaiHour === 20 && thaiMin >= 25) || (thaiHour === 21 && thaiMin <= 45)) return false;
    // Asian + Pre-London Transition Box Shield: 06:00 - 13:59 (< 14:00)
    if (thaiHour >= 6 && thaiHour < 14 && t.regime === "BOX") return false;
    return true;
  });

  console.log("Original 15m trades:", allTrades.length);
  console.log("Filtered 15m trades:", filtered.length);
  
  let wins = 0, losses = 0, pnl = 0;
  filtered.forEach(t => {
    if (t.result === "WIN" || (t.pnlPips || 0) > 0) wins++;
    else losses++;
    pnl += (t.pnlPips || 0) * 0.1;
  });
  console.log(`Wins: ${wins}, Losses: ${losses}, WinRate: ${((wins / (wins + losses)) * 100).toFixed(1)}%, PnL: $${pnl.toFixed(2)}`);
}
test().catch(console.error);
