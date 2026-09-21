/**
 * Autonomous Bot Daemon Runner & Unified Production Server
 * 
 * If running in a Web Service environment (with PORT assigned e.g. on Render/Koyeb/Docker),
 * it starts Next.js to serve the full React dashboard on 0.0.0.0:$PORT and simultaneously
 * runs the 24/7 Autonomous Scanner loop.
 * 
 * If running locally against an already-running dev server (npm run dev),
 * it runs the standalone polling loop.
 */

import { spawn } from "node:child_process";

const PORT = process.env.PORT;
const TARGET_HOST = process.env.BOT_HOST || process.argv[2] || (PORT ? `http://127.0.0.1:${PORT}` : "http://localhost:3000");
const SCAN_INTERVAL_MS = (Number(process.env.SCAN_INTERVAL_SEC) || 30) * 1000;

// If deployed on Render / Koyeb / Docker with PORT assigned:
// Automatically start Next.js to serve the web dashboard on $PORT
if (PORT && !process.env.BOT_HOST) {
  console.log(`\n=============================================================`);
  console.log(`AEGIS QUANT TERMINAL — CLOUD WEB DASHBOARD & AUTONOMOUS RUNNER`);
  console.log(`Serving Web Dashboard on 0.0.0.0:${PORT}`);
  console.log(`Scan Interval: ${SCAN_INTERVAL_MS / 1000}s | Auto-Pilot: 24/7`);
  console.log(`=============================================================\n`);

  const nextServer = spawn("npx", ["next", "start", "-H", "0.0.0.0", "-p", PORT], {
    stdio: "inherit",
    shell: true,
    env: { ...process.env, PORT },
  });

  nextServer.on("error", (err) => {
    console.error("[Next.js] Failed to start:", err);
    process.exit(1);
  });

  nextServer.on("exit", (code) => {
    if (code !== 0) {
      console.error(`[Next.js] Exited with code ${code}`);
      process.exit(code || 1);
    }
  });

  const cleanExit = () => {
    nextServer.kill("SIGTERM");
    process.exit(0);
  };
  process.on("SIGTERM", cleanExit);
  process.on("SIGINT", cleanExit);
}

// Autonomous scan loop
let scanCount = 0;
async function runScanCycle() {
  scanCount++;
  const timestamp = new Date().toLocaleTimeString("th-TH", { timeZone: "Asia/Bangkok" });
  try {
    const url = `${TARGET_HOST}/api/autonomous-scanner?scan=true`;
    const res = await fetch(url);
    if (!res.ok) {
      if (scanCount > 2) console.warn(`[${timestamp}] [Scanner] HTTP ${res.status}: ${res.statusText}`);
      return;
    }

    const data = await res.json();
    if (!data.success) {
      if (scanCount > 2) console.warn(`[${timestamp}] [Scanner] Error:`, data.error || "Unknown error");
      return;
    }

    const summaries = data.scannerSummaries || [];
    const topAsset = summaries[0];

    const actionable = summaries.filter(
      (s) => s.signal !== "WAIT" && s.orderType !== "WAIT_NO_ORDER" && s.confluenceScore >= 52
    );

    console.log(
      `[${timestamp}] [Scan #${scanCount}] Scanned ${summaries.length} assets | Actionable: ${actionable.length} | Top: ${topAsset ? `${topAsset.symbol} (${topAsset.signal} ${topAsset.confluenceScore}%)` : "None"}`
    );

    if (actionable.length > 0) {
      for (const a of actionable) {
        console.log(`  🎯 [${a.symbol}] ${a.signal} | ${a.orderType} @ ${a.pendingPrice} (SL: ${a.slPrice}, TP: ${a.tpPrice}) Grade: ${a.setupGrade}`);
      }
    }
    consecutiveErrors = 0;
  } catch (err) {
    consecutiveErrors++;
    if (scanCount > 2) {
      console.warn(`[${timestamp}] Connection note: ${err.message}`);
    }
  }
}

let consecutiveErrors = 0;

// Start scan loop (delay 15s if starting Next.js server to ensure full startup, else 1s)
const startDelayMs = PORT && !process.env.BOT_HOST ? 15000 : 1000;
setTimeout(() => {
  runScanCycle();
  setInterval(() => {
    // If consecutive connection errors, back off to allow server recovery
    if (consecutiveErrors > 3) {
      console.log(`[Daemon] Backing off scan cycle due to connection errors...`);
      consecutiveErrors = 0;
      return;
    }
    runScanCycle();
  }, SCAN_INTERVAL_MS);
}, startDelayMs);
