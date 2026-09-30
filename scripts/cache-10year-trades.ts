import * as fs from "fs";
import * as path from "path";
import { Candle } from "../lib/types";
import { simulateInstitutionalBacktest } from "../lib/marketService";

console.log("Loading 10-year H1 data...");
const candles: Candle[] = JSON.parse(fs.readFileSync(path.resolve("data", "xauusd_1h_10year.json"), "utf-8"));
candles.sort((a, b) => a.time - b.time);
console.log(`Loaded ${candles.length} candles. Simulating institutional trades...`);

const start = Date.now();
const trades = simulateInstitutionalBacktest("XAUUSD", candles);
console.log(`Simulation complete in ${((Date.now() - start) / 1000).toFixed(2)}s. Total trades: ${trades.length}`);

fs.writeFileSync(path.resolve("data", "xauusd_10year_institutional_trades.json"), JSON.stringify(trades));
console.log("Successfully cached to data/xauusd_10year_institutional_trades.json!");
