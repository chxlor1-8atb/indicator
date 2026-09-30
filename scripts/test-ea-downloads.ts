import fs from "fs";
import path from "path";

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ FAIL: ${message}`);
    process.exit(1);
  } else {
    console.log(`✅ PASS: ${message}`);
  }
}

console.log("\n========================================================");
console.log("🤖 TESTING MT5 EXPERT ADVISOR ARTIFACTS & SETUP FILES");
console.log("========================================================\n");

// 1. Verify Aegis_Quant_Terminal.mq5 exists and has core components
const mq5Path = path.join(process.cwd(), "mql", "Aegis_Quant_Terminal.mq5");
assert(fs.existsSync(mq5Path), "Aegis_Quant_Terminal.mq5 exists on disk");
const mq5Content = fs.readFileSync(mq5Path, "utf-8");

assert(mq5Content.includes("Aegis Quant Terminal"), "EA metadata copyright present");
assert(mq5Content.includes("#include <Trade\\Trade.mqh>"), "CTrade include present");
assert(mq5Content.includes("CreateDashboardGUI"), "On-Chart GUI HUD generator present");
assert(mq5Content.includes("PollBridgeServer"), "WebRequest polling engine present");
assert(mq5Content.includes("PositionClosePartial"), "TP1 50% partial close present");
assert(mq5Content.includes("OnChartEvent"), "Interactive GUI button handler present");
assert(mq5Content.includes("InpMaxSpreadPips"), "Spread protection parameter present");
assert(mq5Content.includes("InpMaxMarginPct"), "Margin cap parameter present");
console.log(`✅ Aegis_Quant_Terminal.mq5 size: ${(mq5Content.length / 1024).toFixed(1)} KB, lines: ${mq5Content.split("\n").length}`);

// 2. Verify Preset Files
const setCentPath = path.join(process.cwd(), "mql", "Aegis_XAUUSD_Cent.set");
assert(fs.existsSync(setCentPath), "Aegis_XAUUSD_Cent.set exists");
const setCentContent = fs.readFileSync(setCentPath, "utf-8");
assert(setCentContent.includes("InpAccountMode=1"), "Cent preset sets InpAccountMode=1");

const setStdPath = path.join(process.cwd(), "mql", "Aegis_Forex_Standard.set");
assert(fs.existsSync(setStdPath), "Aegis_Forex_Standard.set exists");
const setStdContent = fs.readFileSync(setStdPath, "utf-8");
assert(setStdContent.includes("InpAccountMode=0"), "Standard preset sets InpAccountMode=0");

// 3. Verify HOW_TO_INSTALL.md
const guidePath = path.join(process.cwd(), "mql", "HOW_TO_INSTALL.md");
assert(fs.existsSync(guidePath), "HOW_TO_INSTALL.md exists");
const guideContent = fs.readFileSync(guidePath, "utf-8");
assert(guideContent.includes("Allow WebRequest"), "Guide explains WebRequest setup");
assert(guideContent.includes("MQL5 ➔ Experts"), "Guide specifies MQL5/Experts folder");

console.log("\n========================================================");
console.log("🎉 ALL MT5 EA FILES & ARTIFACTS VERIFIED SUCCESSFULLY!");
console.log("========================================================\n");
