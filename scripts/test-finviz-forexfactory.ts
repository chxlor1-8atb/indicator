import {
  fetchFinvizForexStrength,
  computeSyntheticForexStrength,
  fetchFinvizMarketSentiment,
  getPairCurrencyDivergence,
} from "../lib/finvizService";
import { syncLiveEconomicCalendar, getNewsSafetyShieldStatus } from "../lib/calendarEngine";

async function runTests() {
  console.log("=================================================");
  console.log("🧪 RUNNING FINVIZ & FOREX FACTORY PIPELINE TESTS");
  console.log("=================================================\n");

  // 1. Test Forex Factory Live Sync
  console.log("1️⃣ Testing Forex Factory Live CDN Calendar...");
  try {
    const events = await syncLiveEconomicCalendar();
    console.log(`   ✅ Successfully synced ${events.length} Forex Factory calendar events.`);
    const highImpact = events.filter((e) => e.impact === "HIGH");
    console.log(`   🔴 High Impact Events (Red Folders): ${highImpact.length}`);
    if (highImpact.length > 0) {
      console.log(`   Sample Red Folder: [${highImpact[0].currency}] ${highImpact[0].title} @ ${highImpact[0].timeStr}`);
    }

    const goldSafety = getNewsSafetyShieldStatus("XAUUSD");
    console.log(`   🛡️ Gold (XAUUSD) News Shield Status: ${goldSafety.badgeText} (Trade Allowed: ${goldSafety.tradeAllowed})`);
  } catch (err) {
    console.error("   ❌ Forex Factory Test Failed:", err);
  }

  console.log("\n-------------------------------------------------");

  // 2. Test Finviz Forex Relative Currency Strength
  console.log("2️⃣ Testing Finviz Relative Currency Strength Meter (CSM)...");
  try {
    const csm = await fetchFinvizForexStrength();
    console.log(`   ✅ Retrieved ${csm.currencies.length} currencies (Mode: ${csm.isSynthetic ? "Synthetic Fallback" : "Finviz Live"})`);
    console.log("   Rankings (Strongest to Weakest):");
    csm.currencies.forEach((c) => {
      console.log(`     #${c.rank} ${c.currency}: ${c.changePct >= 0 ? "+" : ""}${c.changePct}% (Normalized Score: ${c.score})`);
    });

    console.log(`   💪 Top Strongest: ${csm.topStrong.join(", ")}`);
    console.log(`   🔻 Top Weakest:   ${csm.topWeak.join(", ")}`);

    if (csm.bestMatchups.length > 0) {
      console.log(`   🔥 Best Statistical Matchup: ${csm.bestMatchups[0].pair} (${csm.bestMatchups[0].direction}) - ${csm.bestMatchups[0].reason}`);
    }
  } catch (err) {
    console.error("   ❌ Finviz CSM Test Failed:", err);
  }

  console.log("\n-------------------------------------------------");

  // 3. Test Pair Currency Divergence
  console.log("3️⃣ Testing Pair Currency Divergence Alignment...");
  try {
    const csm = await fetchFinvizForexStrength();
    const testPairs = ["USDJPY", "EURUSD", "GBPJPY", "XAUUSD"];
    for (const pair of testPairs) {
      const div = getPairCurrencyDivergence(pair, csm);
      console.log(`   🎯 [${pair}] Alignment: ${div.alignment} | Confluence Bonus: ${div.confluenceBonus > 0 ? "+" : ""}${div.confluenceBonus} pts`);
      console.log(`      Reason: ${div.description}`);
    }
  } catch (err) {
    console.error("   ❌ Divergence Test Failed:", err);
  }

  console.log("\n-------------------------------------------------");

  // 4. Test Market Sentiment
  console.log("4️⃣ Testing Macro Market Sentiment (Risk-On / Risk-Off)...");
  try {
    const sentiment = await fetchFinvizMarketSentiment();
    console.log(`   ✅ Market Regime: ${sentiment.regime}`);
    console.log(`   Gold Bias:     ${sentiment.goldBias}`);
    console.log(`   Equity Trend:  ${sentiment.equityTrend}`);
    console.log(`   Summary:       ${sentiment.summary}`);
  } catch (err) {
    console.error("   ❌ Sentiment Test Failed:", err);
  }

  console.log("\n=================================================");
  console.log("🎉 ALL FINVIZ & FOREX FACTORY TESTS COMPLETE!");
  console.log("=================================================");
}

runTests();
