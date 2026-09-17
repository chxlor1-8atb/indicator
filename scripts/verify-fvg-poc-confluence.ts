import { calculateSniperPrecisionEntry } from "../lib/indicators";
import { FVGMitigationInfo, VolumeProfileInfo } from "../lib/types";

console.log("================================================================================");
console.log("   TESTING 'FVG + PoC = คัดโซนคุณภาพ' ALGORITHM (4-ZONE FILTER)");
console.log("================================================================================\n");

const currentPrice = 2735.0;

// 4 Active Bullish FVGs (Zones 1, 2, 3, 4 from the user's image)
const fvgMitigation: FVGMitigationInfo = {
  activeFVGs: [
    // Zone 1: Highest FVG (where PoC sits)
    {
      id: "fvg-zone-1",
      type: "BULLISH_FVG",
      top: 2722.0,
      bottom: 2715.0,
      consequentEncroachment: 2718.5,
      sizePips: 70,
      mitigationStatus: "UNMITIGATED",
      candleIndex: 48,
    },
    // Zone 2: Mid-High FVG
    {
      id: "fvg-zone-2",
      type: "BULLISH_FVG",
      top: 2710.0,
      bottom: 2705.0,
      consequentEncroachment: 2707.5,
      sizePips: 50,
      mitigationStatus: "UNMITIGATED",
      candleIndex: 44,
    },
    // Zone 3: Mid FVG
    {
      id: "fvg-zone-3",
      type: "BULLISH_FVG",
      top: 2700.0,
      bottom: 2690.0,
      consequentEncroachment: 2695.0,
      sizePips: 100,
      mitigationStatus: "UNMITIGATED",
      candleIndex: 40,
    },
    // Zone 4: Lowest Origin FVG
    {
      id: "fvg-zone-4",
      type: "BULLISH_FVG",
      top: 2680.0,
      bottom: 2670.0,
      consequentEncroachment: 2675.0,
      sizePips: 100,
      mitigationStatus: "UNMITIGATED",
      candleIndex: 35,
    },
  ],
  unmitigatedCount: 4,
  nearestFVG: null,
  recommendedEntryLimit: 2718.5,
  bias: "BULLISH_IMBALANCE",
  description: "4 Active Bullish FVGs detected",
};

// Volume Profile PoC is inside Zone 1 (2717.50)
const volumeProfile: VolumeProfileInfo = {
  poc: 2718.0, // High Volume Node sitting directly inside Zone 1!
  vah: 2730.0,
  val: 2685.0,
  valueAreaVolumePct: 70,
  isInsideValueArea: true,
  description: "POC at 2718.00 with dense volume concentration",
};

const result = calculateSniperPrecisionEntry(
  currentPrice,
  "BUY",
  undefined,
  fvgMitigation,
  undefined,
  volumeProfile,
  2
);

console.log("Resulting Precision Entry Selection:");
console.log("• Entry Type:", result.entryType);
console.log("• Recommended Limit Price:", result.recommendedLimit);
console.log("• Rationale:", result.entryRationale);

if (result.entryType === "FVG_POC_CONFLUENCE" && result.recommendedLimit >= 2715 && result.recommendedLimit <= 2722) {
  console.log("\n✅ SUCCESS: ระบบคัดกรองเลือก Zone 1 (กล่องเขียวในภาพ) อัตโนมัติ โดยทิ้ง Zone 2, 3, 4 ทิ้งทั้งหมด!");
} else {
  console.log("\n❌ FAILED: ระบบไม่ได้เลือก Zone 1 ที่มี PoC");
}
console.log("================================================================================\n");
