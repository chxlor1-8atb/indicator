/**
 * Autonomous Bot Daemon Runner (Local 24/7 Mode)
 * 
 * Runs the autonomous scanner loop continuously on local machine
 * without needing a browser tab open.
 * 
 * Usage:
 *   node scripts/bot-daemon.mjs
 *   npm run bot
 */

import http from "node:http";

const TARGET_HOST = process.env.BOT_HOST || process.argv[2] || "http://localhost:3000";
const SCAN_INTERVAL_MS = (Number(process.env.SCAN_INTERVAL_SEC) || 30) * 1000; // default 30s

console.log(`\n=============================================================`);
console.log(`AI INDICATOR AUTONOMOUS BOT DAEMON (LOCAL 24/7 MODE)`);
console.log(`Target Endpoint: ${TARGET_HOST}/api/autonomous-scanner?scan=true`);
console.log(`Scan Interval: ${SCAN_INTERVAL_MS / 1000} seconds`);
console.log(`Telegram Alerts: Auto-dispatched on actionable signals`);

if (TARGET_HOST.includes("vercel.app")) {
  console.warn(`\n⚠️ [VERCEL CPU SAFEGUARD WARNING]:`);
  console.warn(`Targeting a Vercel deployment URL directly with a continuous 24/7 daemon`);
  console.warn(`will consume Vercel Serverless Active CPU (4h monthly limit on Hobby).`);
  console.warn(`Recommended: Run 'npm run dev' locally or run this worker on Railway/VPS/Render`);
  console.warn(`where persistent background execution is 100% free.\n`);
}
console.log(`=============================================================\n`);

let scanCount = 0;

async function runScanCycle() {
  scanCount++;
  const timestamp = new Date().toLocaleTimeString("th-TH", { timeZone: "Asia/Bangkok" });
  try {
    const url = `${TARGET_HOST}/api/autonomous-scanner?scan=true`;
    const res = await fetch(url);
    if (!res.ok) {
      console.warn(`[${timestamp}] Server returned HTTP ${res.status}: ${res.statusText}`);
      return;
    }

    const data = await res.json();
    if (!data.success) {
      console.warn(`[${timestamp}] Scan response error:`, data.error || "Unknown error");
      return;
    }

    const summaries = data.scannerSummaries || [];
    const activeOrders = data.activeOrders || [];
    const topAsset = summaries[0];

    const actionable = summaries.filter(
      (s) => s.signal !== "WAIT" && s.orderType !== "WAIT_NO_ORDER" && s.confluenceScore >= 52
    );

    console.log(
      `[${timestamp}] [Scan #${scanCount}] Scanned ${summaries.length} assets | Actionable: ${actionable.length} | Active Orders: ${activeOrders.length} | Top: ${topAsset ? `${topAsset.symbol} (${topAsset.signal} ${topAsset.confluenceScore}%)` : "None"}`
    );

    if (actionable.length > 0) {
      for (const a of actionable) {
        console.log(`  [${a.symbol}] ${a.signal} | MT5: ${a.orderType} @ ${a.pendingPrice} (SL: ${a.slPrice}, TP: ${a.tpPrice}) Grade: ${a.setupGrade}`);
      }
    }
  } catch (err) {
    console.error(`[${timestamp}] Connection error to ${TARGET_HOST}: ${err.message}. (Make sure 'npm run dev' is running!)`);
  }
}

// Initial scan
runScanCycle();

// Recurring scan loop
setInterval(runScanCycle, SCAN_INTERVAL_MS);

// ─── Optional Cloud Keep-Alive & Health Check Server ───
// When deployed on Render, Koyeb, or Docker, platforms require an open HTTP port
const PORT = process.env.PORT || process.env.HEALTH_PORT;
if (PORT) {
  const server = http.createServer((req, res) => {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(
      JSON.stringify({
        status: "healthy",
        uptimeSeconds: Math.floor(process.uptime()),
        scanCount,
        targetHost: TARGET_HOST,
        timestamp: new Date().toISOString(),
      })
    );
  });
  server.listen(Number(PORT), () => {
    console.log(`[Health Server] Keep-alive health check server running on port ${PORT}`);
  });
}
