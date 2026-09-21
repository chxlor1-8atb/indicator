/**
 * Aegis Quant Terminal — Unified Production Runner
 * 
 * Runs Next.js Web Dashboard on 0.0.0.0:$PORT and
 * simultaneously runs the Autonomous Scanner 24/7 in the background.
 * 
 * Perfect for Render Free Web Service, Koyeb, Docker, and VPS.
 */

import { spawn } from "node:child_process";

const PORT = process.env.PORT || "3000";
const SCAN_INTERVAL_MS = (Number(process.env.SCAN_INTERVAL_SEC) || 30) * 1000;

console.log(`\n=============================================================`);
console.log(`AEGIS QUANT TERMINAL — ALL-IN-ONE PRODUCTION RUNNER`);
console.log(`Dashboard Port: ${PORT}`);
console.log(`Scan Interval:  ${SCAN_INTERVAL_MS / 1000} seconds`);
console.log(`Auto-Pilot:     Active 24/7 in background`);
console.log(`=============================================================\n`);

// 1. Start Next.js server on 0.0.0.0:$PORT
const nextServer = spawn(`npx next start -H 0.0.0.0 -p ${PORT}`, {
  stdio: "inherit",
  shell: true,
  env: { ...process.env, PORT },
});

nextServer.on("error", (err) => {
  console.error("[Next.js] Failed to start server:", err);
  process.exit(1);
});

nextServer.on("exit", (code) => {
  if (code !== 0) {
    console.error(`[Next.js] Server exited with code ${code}`);
    process.exit(code || 1);
  }
});

// 2. Run continuous autonomous scan loop against local Next.js server
let scanCount = 0;

async function runAutonomousScan() {
  scanCount++;
  const timestamp = new Date().toLocaleTimeString("th-TH", { timeZone: "Asia/Bangkok" });
  try {
    const url = `http://127.0.0.1:${PORT}/api/autonomous-scanner?scan=true`;
    const res = await fetch(url);
    if (!res.ok) {
      console.warn(`[${timestamp}] [Scanner] HTTP ${res.status}: ${res.statusText}`);
      return;
    }
    const data = await res.json();
    if (!data.success) {
      console.warn(`[${timestamp}] [Scanner] Error:`, data.error || "Unknown scan error");
      return;
    }

    const summaries = data.scannerSummaries || [];
    const actionable = summaries.filter(
      (s) => s.signal !== "WAIT" && s.orderType !== "WAIT_NO_ORDER" && s.confluenceScore >= 52
    );
    const topAsset = summaries[0];

    console.log(
      `[${timestamp}] [Scan #${scanCount}] Scanned ${summaries.length} assets | Actionable: ${actionable.length} | Top: ${topAsset ? `${topAsset.symbol} (${topAsset.signal} ${topAsset.confluenceScore}%)` : "None"}`
    );

    if (actionable.length > 0) {
      for (const a of actionable) {
        console.log(`  🎯 [${a.symbol}] ${a.signal} | ${a.orderType} @ ${a.pendingPrice} (SL: ${a.slPrice}, TP: ${a.tpPrice}) Grade: ${a.setupGrade}`);
      }
    }
  } catch (err) {
    // Next.js might still be initializing during first few seconds
    if (scanCount <= 2) {
      console.log(`[${timestamp}] [Scanner] Waiting for dashboard server to initialize...`);
    } else {
      console.warn(`[${timestamp}] [Scanner] Connection note:`, err.message);
    }
  }
}

// Wait 8 seconds for Next.js to bind port before launching scanner loop
setTimeout(() => {
  runAutonomousScan();
  setInterval(runAutonomousScan, SCAN_INTERVAL_MS);
}, 8000);

// Graceful cleanup
const cleanExit = () => {
  console.log("\n[Runner] Shutting down gracefully...");
  nextServer.kill("SIGTERM");
  process.exit(0);
};

process.on("SIGTERM", cleanExit);
process.on("SIGINT", cleanExit);
