import { AnalysisResult, Candle, IndicatorData, NewsItem, ConfluenceCheckItem, TraderTierHierarchy } from "./types";
import { runAutomatedBacktest } from "./backtestEngine";
import { optimizeIndicatorParameters } from "./optimizerEngine";
import { calculateATR, detectCandleRejection, detectRSIDivergence } from "./indicators";
import { evaluateMasterConfluence } from "./confluenceEngine";
import { classifyMarketRegime } from "./regimeClassifier";
import { getMarketSessionStatus } from "./sessionEngine";
import { getNewsSafetyShieldStatus } from "./calendarEngine";

export function generateRuleBasedAnalysis(
  symbol: string,
  timeframe: string,
  candles: Candle[],
  indicators: IndicatorData,
  news: NewsItem[]
): AnalysisResult {
  const currentPrice = indicators.currentPrice;
  const lastCandle = candles[candles.length - 1];
  const prevCandle = candles.length > 1 ? candles[candles.length - 2] : undefined;

  // Run automated historical backtest, parameter optimization, regime classifier, session status, and economic calendar safety shield
  const historicalBacktest = runAutomatedBacktest(candles);
  const optimizedConfig = optimizeIndicatorParameters(candles);
  const regimeInfo = classifyMarketRegime(candles, indicators);
  const sessionStatus = getMarketSessionStatus(symbol);
  const calendarSafety = getNewsSafetyShieldStatus(symbol);

  const lastRSI = indicators.rsi14.filter((v): v is number => v !== null && !isNaN(v)).pop() ?? 50.0;
  const lastEMA20 = indicators.ema20.filter((v): v is number => v !== null && !isNaN(v)).pop() ?? Number((currentPrice * 0.998).toFixed(2));
  const lastEMA50 = indicators.ema50.filter((v): v is number => v !== null && !isNaN(v)).pop() ?? Number((currentPrice * 0.995).toFixed(2));
  const lastEMA200 = indicators.ema200.filter((v): v is number => v !== null && !isNaN(v)).pop() ?? Number((currentPrice * 0.985).toFixed(2));

  // ATR for volatility measurement
  const atrs = calculateATR(candles, 14);
  const currentATR = atrs.filter((v): v is number => v !== null && !isNaN(v)).pop() ?? Math.max(currentPrice * 0.006, 0.5);

  // Price Action & Divergence Detection
  const rejection = detectCandleRejection(lastCandle, prevCandle);
  const divergence = detectRSIDivergence(candles, indicators.rsi14);

  // ─── TIER 1: DIRECTIONAL BIAS (The Boss) ───
  let tier1Bias: "BULLISH" | "BEARISH" | "NEUTRAL" = "NEUTRAL";
  let tier1Reason = "โครงสร้างตลาดแกว่งตัวไซด์เวย์ในกรอบ";
  let trend: AnalysisResult["technicalAnalysis"]["trend"] = "SIDEWAYS";

  const isUptrend = currentPrice >= lastEMA50 && lastEMA20 >= lastEMA50;
  const isDowntrend = currentPrice < lastEMA50 && lastEMA20 < lastEMA50;

  if (isUptrend && currentPrice > lastEMA200) {
    tier1Bias = "BULLISH";
    trend = "STRONG_UPTREND";
    tier1Reason = `โครงสร้างขาขึ้นแข็งแกร่ง (EMA ${optimizedConfig.emaTrend} และ Ribbon ขยายตัวขึ้น)`;
  } else if (isUptrend) {
    tier1Bias = "BULLISH";
    trend = "UPTREND";
    tier1Reason = `โครงสร้างแนวโน้มขาขึ้น (ราคาอยู่เหนือ EMA ${optimizedConfig.emaSlow})`;
  } else if (isDowntrend && currentPrice < lastEMA200) {
    tier1Bias = "BEARISH";
    trend = "STRONG_DOWNTREND";
    tier1Reason = `โครงสร้างขาลงแข็งแกร่ง (ราคาหลุด EMA ${optimizedConfig.emaTrend} และ Ribbon กดตัวลง)`;
  } else if (isDowntrend) {
    tier1Bias = "BEARISH";
    trend = "DOWNTREND";
    tier1Reason = `โครงสร้างแนวโน้มขาลง (ราคาอยู่ใต้ EMA ${optimizedConfig.emaSlow})`;
  }

  // ─── TIER 2: VALUE LOCATION (No Chasing / Value Zone) ───
  const distFromFast = Math.abs(currentPrice - lastEMA20);
  const distInATR = Number((distFromFast / (currentATR || 1)).toFixed(1));
  const isOverextended = distInATR > 2.2;

  const inBuyValueZone = tier1Bias === "BULLISH" && (lastCandle.low <= lastEMA20 * 1.004 || currentPrice <= lastEMA20 * 1.006);
  const inSellValueZone = tier1Bias === "BEARISH" && (lastCandle.high >= lastEMA20 * 0.996 || currentPrice >= lastEMA20 * 0.994);
  const inValueZone = inBuyValueZone || inSellValueZone;

  let tier2Note = "ราคากำลังเคลื่อนไหวในโซนสมดุล";
  if (isOverextended) {
    tier2Note = `⚠️ ราคาวิ่งห่างเส้นค่าเฉลี่ยเกินไป (${distInATR}x ATR) ห้ามไล่ราคาเด็ดขาด ให้รอราคาย่อตัวก่อน`;
  } else if (inValueZone) {
    tier2Note = `✅ ราคาพักตัวเข้าสู่ Value Zone (ต้นทุนได้เปรียบระหว่าง EMA ${optimizedConfig.emaFast} - ${optimizedConfig.emaSlow})`;
  }

  // ─── TIER 3: EXECUTION TRIGGER (Confirmation & No-Divergence) ───
  const hasBuyTrigger = tier1Bias === "BULLISH" && (rejection.isBullishRejection || lastCandle.close > lastCandle.open) && !divergence.bearishDivergence;
  const hasSellTrigger = tier1Bias === "BEARISH" && (rejection.isBearishRejection || lastCandle.close < lastCandle.open) && !divergence.bullishDivergence;
  const isTriggerConfirmed = Boolean(hasBuyTrigger || hasSellTrigger);

  const traderHierarchy: TraderTierHierarchy = {
    tier1_Direction: {
      bias: tier1Bias,
      reason: tier1Reason,
      majorTrendEMA: `EMA ${optimizedConfig.emaTrend} (${lastEMA200.toFixed(2)})`,
    },
    tier2_ValueLocation: {
      inValueZone,
      distanceFromEMA: `${distInATR}x ATR`,
      isOverextended,
      note: tier2Note,
    },
    tier3_Trigger: {
      candlestickRejection: rejection.description,
      rsiCondition: `RSI(${optimizedConfig.rsiPeriod}): ${lastRSI.toFixed(1)} (ไม่มีสัญญาณขัดแย้ง)`,
      divergenceStatus: divergence.note,
      isTriggerConfirmed,
    },
  };

  // ─── 5-PILLAR MASTER CONFLUENCE SCORING ───
  const masterConfluence = evaluateMasterConfluence(candles, indicators, tier1Bias);

  // News Sentiment calculation
  let sentimentScore = 0;
  const relevantNews = news.filter((n) => n.relatedSymbols.includes(symbol) || n.impact === "HIGH");
  const newsList = relevantNews.length > 0 ? relevantNews : news.slice(0, 4);

  for (const item of newsList) {
    const weight = item.impact === "HIGH" ? 20 : item.impact === "MEDIUM" ? 10 : 5;
    if (item.sentiment === "BULLISH") sentimentScore += weight;
    if (item.sentiment === "BEARISH") sentimentScore -= weight;
  }
  sentimentScore = Math.max(-100, Math.min(100, sentimentScore));

  let overallSentiment: "BULLISH" | "BEARISH" | "NEUTRAL" = "NEUTRAL";
  if (sentimentScore >= 20) overallSentiment = "BULLISH";
  else if (sentimentScore <= -20) overallSentiment = "BEARISH";

  // ─── DYNAMIC REGIME, SESSION & RED FOLDER SAFETY SYNTHESIS ───
  let signal: AnalysisResult["signal"] = "WAIT";
  let confidence = Math.max(40, Math.min(95, masterConfluence.totalScore + sessionStatus.confidenceModifier));
  let setupGrade: AnalysisResult["setupGrade"] = masterConfluence.grade;

  // SAFETY LOCK 1: Red Folder News Freeze (30m before, 15m after)
  if (!calendarSafety.tradeAllowed) {
    signal = "WAIT";
    setupGrade = "C (Wait)";
    confidence = 30;
  }
  // SAFETY LOCK 2: The Witching Hour (03:55 - 05:05) or Monday Open Gap
  else if (!sessionStatus.tradeAllowed) {
    signal = "WAIT";
    setupGrade = "C (Wait)";
    confidence = 35;
  }
  // SAFETY LOCK 3: Choppy Deadzone or Overextended
  else if (regimeInfo.regime === "CHOPPY_DEADZONE" || isOverextended || masterConfluence.totalScore < 55) {
    signal = "WAIT";
    setupGrade = "C (Wait)";
  } else if (tier1Bias === "BULLISH" && inBuyValueZone && hasBuyTrigger && masterConfluence.totalScore >= 70) {
    signal = (trend === "STRONG_UPTREND" || regimeInfo.regime === "EXPLOSIVE_TREND") && masterConfluence.totalScore >= 85 ? "STRONG_BUY" : "BUY";
  } else if (tier1Bias === "BEARISH" && inSellValueZone && hasSellTrigger && masterConfluence.totalScore >= 70) {
    signal = (trend === "STRONG_DOWNTREND" || regimeInfo.regime === "EXPLOSIVE_TREND") && masterConfluence.totalScore >= 85 ? "STRONG_SELL" : "SELL";
  } else {
    signal = "WAIT";
    setupGrade = masterConfluence.totalScore >= 60 ? "B" : "C (Wait)";
  }

  // Calculate Trade Setup Levels with Dynamic TP Multiplier
  const effectiveTPMultiplier = regimeInfo.optimalParams.tpMultiplier || optimizedConfig.tpMultiplier;
  const nearestSupport = indicators.supportLevels[0] || Number((currentPrice - currentATR * 1.5).toFixed(2));
  const nearestResistance = indicators.resistanceLevels[0] || Number((currentPrice + currentATR * 1.5).toFixed(2));

  let tradeAction: "BUY" | "SELL" | "NO_TRADE" = "NO_TRADE";
  let stopLoss = Number((currentPrice - currentATR * 1.2).toFixed(2));
  let takeProfit1 = Number((currentPrice + currentATR * 1.0).toFixed(2));
  let takeProfit2 = Number((currentPrice + currentATR * effectiveTPMultiplier).toFixed(2));
  let riskRewardRatio = `1:${effectiveTPMultiplier.toFixed(1)}`;

  if (signal === "STRONG_BUY" || signal === "BUY") {
    tradeAction = "BUY";
    const slCandidate = Math.min(lastCandle.low, lastEMA50) - currentATR * 0.3;
    stopLoss = Number(slCandidate.toFixed(2));
    const risk = currentPrice - stopLoss;
    takeProfit1 = Number((currentPrice + risk * 1.0).toFixed(2));
    takeProfit2 = Number((currentPrice + risk * effectiveTPMultiplier).toFixed(2));
    riskRewardRatio = `1:${effectiveTPMultiplier.toFixed(1)}`;
  } else if (signal === "STRONG_SELL" || signal === "SELL") {
    tradeAction = "SELL";
    const slCandidate = Math.max(lastCandle.high, lastEMA50) + currentATR * 0.3;
    stopLoss = Number(slCandidate.toFixed(2));
    const risk = stopLoss - currentPrice;
    takeProfit1 = Number((currentPrice - risk * 1.0).toFixed(2));
    takeProfit2 = Number((currentPrice - risk * effectiveTPMultiplier).toFixed(2));
    riskRewardRatio = `1:${effectiveTPMultiplier.toFixed(1)}`;
  }

  const pipMultiplier = symbol.includes("JPY") ? 100 : symbol.includes("XAU") ? 10 : 10000;
  const slPips = Math.round(Math.abs(currentPrice - stopLoss) * pipMultiplier);
  const tp1Pips = Math.round(Math.abs(takeProfit1 - currentPrice) * pipMultiplier);
  const tp2Pips = Math.round(Math.abs(takeProfit2 - currentPrice) * pipMultiplier);

  // 5-Point Confluence Checklist with News Shield
  const confluenceChecklist: ConfluenceCheckItem[] = [
    {
      name: `Pillar 1: Trend & Regime (${regimeInfo.title})`,
      passed: masterConfluence.pillars.trendRegime.score >= 16,
      note: `${regimeInfo.description} (ADX: ${regimeInfo.adxValue})`,
    },
    {
      name: `Pillar 2: Momentum & Cycles (RSI + Stoch)`,
      passed: masterConfluence.pillars.momentumCycles.score >= 14,
      note: masterConfluence.pillars.momentumCycles.status,
    },
    {
      name: `Pillar 3: Active Session Timing (${sessionStatus.thaiTimeStr})`,
      passed: sessionStatus.tradeAllowed && (sessionStatus.isGoldenHour || sessionStatus.sessionBadge.isOptimal),
      note: `${sessionStatus.sessionBadge.text} - ${sessionStatus.assetSessionAdvice}`,
    },
    {
      name: `Pillar 4: Economic Calendar Shield (${calendarSafety.badgeText})`,
      passed: calendarSafety.tradeAllowed,
      note: calendarSafety.freezeReason,
    },
    {
      name: `Pillar 5: Market Structure & FVGs`,
      passed: masterConfluence.pillars.smartMoneyStructure.score >= 14,
      note: masterConfluence.pillars.smartMoneyStructure.status,
    },
  ];

  const prefixReason = !calendarSafety.tradeAllowed
    ? `[${calendarSafety.badgeText}] ${calendarSafety.freezeReason} `
    : "";

  return {
    symbol,
    timeframe,
    timestamp: new Date().toISOString(),
    currentPrice,
    signal,
    confidence,
    setupGrade,
    summary: `${prefixReason}[${sessionStatus.sessionBadge.text}] ${sessionStatus.assetSessionAdvice} สภาวะตลาด: ${regimeInfo.title} (คะแนน Confluence: ${masterConfluence.totalScore}%) ผลลัพธ์: ${signal}`,
    confluenceChecklist,
    historicalBacktest,
    optimizedConfig,
    traderHierarchy,
    masterConfluence,
    regimeInfo,
    sessionStatus,
    calendarSafety,
    timeframeMatrix: {
      m15: isUptrend ? "BULLISH" : isDowntrend ? "BEARISH" : "NEUTRAL",
      h1: isUptrend ? "BULLISH" : isDowntrend ? "BEARISH" : "NEUTRAL",
      h4: currentPrice > lastEMA200 ? "BULLISH" : "BEARISH",
      d1: currentPrice > lastEMA200 ? "BULLISH" : "BEARISH",
    },
    technicalAnalysis: {
      trend,
      rsiStatus: `RSI(${regimeInfo.optimalParams.rsiPeriod}): ${lastRSI.toFixed(1)} (StochRSI K: ${indicators.stochRSI?.slice(-1)[0]?.k ?? 50})`,
      emaStatus: `EMA${regimeInfo.optimalParams.emaFast} (${lastEMA20.toFixed(2)}), EMA${regimeInfo.optimalParams.emaSlow} (${lastEMA50.toFixed(2)}), EMA${regimeInfo.optimalParams.emaTrend} (${lastEMA200.toFixed(2)})`,
      macdStatus: `SuperTrend: ${indicators.superTrend?.slice(-1)[0]?.direction ?? "UP"} | ADX: ${regimeInfo.adxValue}`,
      keySupport: nearestSupport,
      keyResistance: nearestResistance,
      details: [
        `Economic Calendar Shield: ${calendarSafety.badgeText}`,
        `Session Timing: ${sessionStatus.sessionBadge.text} (${sessionStatus.thaiTimeStr})`,
        `Live Market Regime: ${regimeInfo.title}`,
      ],
    },
    newsSentimentAnalysis: {
      overallSentiment,
      sentimentScore,
      topHeadlines: newsList.slice(0, 3).map((n) => ({
        title: n.title,
        impact: n.impact,
        takeaway: n.summary.substring(0, 100) + "...",
      })),
      macroDrivers: [
        "นโยบายอัตราดอกเบี้ยและสภาพคล่องตลาดการเงินโลก",
        "ทิศทางค่าเงินดอลลาร์สหรัฐและผลตอบแทนพันธบัตร",
        "ระดับความเสี่ยงทางภูมิรัฐศาสตร์และความเชื่อมั่นของนักลงทุนสถาบัน",
      ],
    },
    tradeSetup: {
      action: tradeAction,
      orderType: tradeAction === "BUY"
        ? (currentPrice > lastEMA20 ? "BUY_LIMIT" : "BUY_LIMIT")
        : tradeAction === "SELL"
        ? (currentPrice < lastEMA20 ? "SELL_LIMIT" : "SELL_LIMIT")
        : "WAIT_NO_ORDER",
      pendingPrice: tradeAction === "BUY"
        ? Number((Math.min(currentPrice, lastEMA20 * 1.002)).toFixed(2))
        : tradeAction === "SELL"
        ? Number((Math.max(currentPrice, lastEMA20 * 0.998)).toFixed(2))
        : currentPrice,
      entryZone: {
        min: Number((currentPrice * 0.998).toFixed(2)),
        max: Number((currentPrice * 1.002).toFixed(2)),
      },
      stopLoss,
      takeProfit1,
      takeProfit2,
      slPips,
      tp1Pips,
      tp2Pips,
      riskRewardRatio,
      suggestedLotSize: {
        balance500: Math.max(0.01, Number((5 / Math.max(slPips, 10)).toFixed(2))),
        balance1k: Math.max(0.01, Number((10 / Math.max(slPips, 10)).toFixed(2))),
        balance5k: Math.max(0.01, Number((50 / Math.max(slPips, 10)).toFixed(2))),
        balance10k: Math.max(0.01, Number((100 / Math.max(slPips, 10)).toFixed(2))),
      },
      invalidationNote: `หากราคาหลุด ${tradeAction === "BUY" ? "Stop Loss ใต้แนวรับ" : "Stop Loss เหนือแนวต้าน"} ถือว่าโครงสร้างเสียทรงให้ Cut ทันที`,
    },
  };
}

export async function analyzeWithGemini(
  symbol: string,
  timeframe: string,
  candles: Candle[],
  indicators: IndicatorData,
  news: NewsItem[],
  customApiKey?: string
): Promise<AnalysisResult> {
  const apiKey = customApiKey || process.env.GEMINI_API_KEY;
  const ruleAnalysis = generateRuleBasedAnalysis(symbol, timeframe, candles, indicators, news);

  if (!apiKey) {
    return ruleAnalysis;
  }

  const prompt = `You are a World-Class Quantitative Portfolio Architect & Trading Mentor.
Your goal is to explain market conditions and trading decisions to beginners who have NEVER traded before in warm, natural, and fluent Thai (ภาษาไทยที่สละสลวย ถูกต้องตามหลักไวยากรณ์ สำนวนธรรมชาติเหมือนรุ่นพี่สอนรุ่นน้อง ไม่แปลตรงตัวแบบหุ่นยนต์).

Context:
- Economic Calendar Shield: ${ruleAnalysis.calendarSafety?.badgeText}
- Red Folder Safety Reason: ${ruleAnalysis.calendarSafety?.freezeReason} (Trade Allowed: ${ruleAnalysis.calendarSafety?.tradeAllowed})
- Current Thai Time (GMT+7): ${ruleAnalysis.sessionStatus?.thaiTimeStr}
- Active Market Session: ${ruleAnalysis.sessionStatus?.sessionBadge.text}
- Session Timing Advice: ${ruleAnalysis.sessionStatus?.assetSessionAdvice}
- Live Market Regime: ${ruleAnalysis.regimeInfo?.title}
- Confluence Score: ${ruleAnalysis.masterConfluence?.totalScore}% (Grade ${ruleAnalysis.setupGrade})

### LIVE FINANCIAL NEWS & SENTIMENT:
${news.slice(0, 5).map((n, i) => `${i + 1}. [${n.source}] (${n.sentiment}) ${n.title}`).join("\n")}

CRITICAL INSTRUCTIONS:
1. "summary": Write 2-3 sentences in natural Thai explaining:
   - ตลาดอยู่ในสถานะอะไร ปลอดภัยหรือไม่ (เช็คเกราะกล่องข่าว ${ruleAnalysis.calendarSafety?.badgeText} และช่วงเวลา ${ruleAnalysis.sessionStatus?.sessionBadge.text})
   - แนะนำให้ผู้ใช้ทำอะไรอย่างชัดเจน (เช่น "แนะนำให้ตั้ง Buy Limit ดักซื้อของถูกที่แนวรับ" หรือ "แนะนำให้อยู่เฉยๆ ถือเงินสดไว้ก่อน")
2. Technical terms must always have plain Thai explanations (e.g., SL = จุดยอมแพ้, TP = จุดเก็บกำไร, Support = แนวรับ/ของถูก, Resistance = แนวต้าน/ของแพง).

Respond ONLY with valid JSON matching this schema:
{
  "symbol": "${symbol}",
  "timeframe": "${timeframe}",
  "timestamp": "${new Date().toISOString()}",
  "currentPrice": ${indicators.currentPrice},
  "signal": "${ruleAnalysis.signal}",
  "confidence": ${ruleAnalysis.confidence},
  "setupGrade": "${ruleAnalysis.setupGrade}",
  "summary": "บทวิเคราะห์ภาษาไทยสำนวนสละสลวยเข้าใจง่ายสำหรับมือใหม่ สรุปสถานะกล่องข่าวและสิ่งที่ควรทำ",
  "confluenceChecklist": ${JSON.stringify(ruleAnalysis.confluenceChecklist)},
  "timeframeMatrix": ${JSON.stringify(ruleAnalysis.timeframeMatrix)},
  "technicalAnalysis": {
    "trend": "${ruleAnalysis.technicalAnalysis.trend}",
    "rsiStatus": "${ruleAnalysis.technicalAnalysis.rsiStatus}",
    "emaStatus": "${ruleAnalysis.technicalAnalysis.emaStatus}",
    "macdStatus": "${ruleAnalysis.technicalAnalysis.macdStatus}",
    "keySupport": ${ruleAnalysis.technicalAnalysis.keySupport},
    "keyResistance": ${ruleAnalysis.technicalAnalysis.keyResistance},
    "details": ${JSON.stringify(ruleAnalysis.technicalAnalysis.details)}
  },
  "newsSentimentAnalysis": ${JSON.stringify(ruleAnalysis.newsSentimentAnalysis)},
  "tradeSetup": ${JSON.stringify(ruleAnalysis.tradeSetup)}
}`;

  try {
    // Attempt with fast, robust gemini-3.5-flash first
    let res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            responseMimeType: "application/json",
            temperature: 0.15,
          },
        }),
      }
    );

    // Fallback to gemini-3.1-flash-lite if 3.5 is busy
    if (!res.ok) {
      res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              responseMimeType: "application/json",
              temperature: 0.15,
            },
          }),
        }
      );
    }

    if (!res.ok) {
      console.warn(`Gemini API error: ${res.statusText}`);
      return ruleAnalysis;
    }

    const data = await res.json();
    const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!rawText) return ruleAnalysis;

    const cleanedText = rawText.replace(/```json/g, "").replace(/```/g, "").trim();
    const parsed: AnalysisResult = JSON.parse(cleanedText);
    parsed.historicalBacktest = ruleAnalysis.historicalBacktest;
    parsed.optimizedConfig = ruleAnalysis.optimizedConfig;
    parsed.traderHierarchy = ruleAnalysis.traderHierarchy;
    parsed.masterConfluence = ruleAnalysis.masterConfluence;
    parsed.regimeInfo = ruleAnalysis.regimeInfo;
    parsed.sessionStatus = ruleAnalysis.sessionStatus;
    parsed.calendarSafety = ruleAnalysis.calendarSafety;
    return parsed;
  } catch (err) {
    console.error("Gemini analysis error, falling back to calendar-aware rule engine:", err);
    return ruleAnalysis;
  }
}