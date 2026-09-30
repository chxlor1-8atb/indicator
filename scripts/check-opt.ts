import * as fs from "fs";
import * as path from "path";
import { Candle } from "../lib/types";
import { optimizeIndicatorParameters } from "../lib/optimizerEngine";

const dataPath = path.resolve(process.cwd(), "data", "xauusd_1h_deep.json");
const candles: Candle[] = JSON.parse(fs.readFileSync(dataPath, "utf-8"));

const opt = optimizeIndicatorParameters(candles, "XAUUSD");
console.log("Opt result for XAUUSD:", opt);
