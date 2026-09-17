import { calculateSniperPrecisionEntry, calculateSniperMicroSL } from "../lib/indicators";
import { Candle, OrderBlockValidatorInfo, FVGMitigationInfo, OTEZoneInfo } from "../lib/types";

// Generate synthetic gold candles around $2650
const basePrice = 2650;
const candles: Candle[] = [];
let p = basePrice;
for (let i = 0; i < 50; i++) {
  const high = p + 2.5;
  const low = p - 2.0;
  const close = p + 1.0;
  candles.push({
    time: Math.floor(Date.now() / 1000) - (50 - i) * 3600,
    open: p,
    high,
    low,
    close,
    volume: 1500,
  });
  p = close;
}

const currentPrice = candles[candles.length - 1].close;

// Mock Order Block and FVG
const orderBlocks: OrderBlockValidatorInfo = {
  activeBlocks: [
    {
      type: "BULLISH_OB",
      priceMin: currentPrice - 1.2, // 12 pips below
      priceMax: currentPrice - 0.4,
      isMitigated: false,
      isBreaker: false,
      formedIndex: 45,
    },
  ],
  hasUnmitigatedOB: true,
  isRetestingBreaker: false,
  breakerCount: 0,
  description: "Valid Bullish OB",
};

const fvgMitigation: FVGMitigationInfo = {
  activeFVGs: [
    {
      id: "fvg-1",
      type: "BULLISH_FVG",
      top: currentPrice - 0.2,
      bottom: currentPrice - 1.0,
      consequentEncroachment: currentPrice - 0.6,
      sizePips: 8,
      mitigationStatus: "UNMITIGATED",
      candleIndex: 48,
    },
  ],
  unmitigatedCount: 1,
  nearestFVG: null,
  recommendedEntryLimit: currentPrice - 0.6,
  bias: "BULLISH_IMBALANCE",
  description: "Active Bullish FVG",
};

const oteZone = {
  sweetSpot: currentPrice - 0.8,
  oteMin: currentPrice - 1.4,
  oteMax: currentPrice - 0.4,
  description: "OTE 70.5%",
} as unknown as OTEZoneInfo;

console.log("=== TESTING SNIPER PRECISION ENTRY ===");
const precisionEntry = calculateSniperPrecisionEntry(
  currentPrice,
  "BUY",
  orderBlocks,
  fvgMitigation,
  oteZone,
  undefined,
  2
);
console.log("Recommended Limit Entry:", precisionEntry);

console.log("\n=== TESTING SNIPER MICRO-SL ===");
const sniperSL = calculateSniperMicroSL(
  candles,
  "BUY",
  precisionEntry.recommendedLimit,
  orderBlocks,
  fvgMitigation,
  oteZone,
  2.5,
  2,
  "XAUUSD"
);

console.log("Sniper Micro-SL Result:", {
  entry: precisionEntry.recommendedLimit,
  stopLoss: sniperSL.stopLoss,
  slPips: sniperSL.slPips,
  invalidationType: sniperSL.invalidationType,
  dollarRiskOn001Lot: `$${sniperSL.dollarRiskOn001Lot} USD`,
  tp1: `${sniperSL.tp1Price} (+${sniperSL.tp1Pips} pips)`,
  tp2: `${sniperSL.tp2Price} (+${sniperSL.tp2Pips} pips)`,
  rr: sniperSL.riskRewardRatio,
  isSmallAccountFriendly: sniperSL.isSmallAccountFriendly,
  rationale: sniperSL.microCapitalRationale,
});
