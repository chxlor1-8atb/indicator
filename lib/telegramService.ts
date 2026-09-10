import { AnalysisResult } from "./types";

export interface SendTelegramOptions {
  botToken: string;
  chatId: string;
  message?: string;
  analysis?: AnalysisResult;
}

function escapeHtml(text: string): string {
  if (!text) return "";
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function formatPrice(num: number, symbol: string): string {
  const sym = symbol.toUpperCase();
  const precision = sym.includes("JPY") || sym === "XAUUSD" || sym.startsWith("XAU")
    ? 2
    : sym === "XAGUSD"
    ? 3
    : ["EUR", "GBP", "AUD", "NZD", "USD", "CAD", "CHF"].some((c) => sym.startsWith(c) || sym.endsWith(c))
    ? 4
    : ["XRP", "ADA", "DOGE", "SUI"].some((c) => sym.startsWith(c))
    ? 4
    : num < 10 && num > 0
    ? 4
    : 2;
  return num.toLocaleString(undefined, { minimumFractionDigits: precision, maximumFractionDigits: precision });
}

export function formatTelegramAnalysisMessage(analysis: AnalysisResult): string {
  const signalBadge = {
    STRONG_BUY: "🟢🟢 <b>STRONG BUY</b>",
    BUY: "🟢 <b>BUY</b>",
    WAIT: "⚪ <b>WAIT / NEUTRAL</b>",
    SELL: "🔴 <b>SELL</b>",
    STRONG_SELL: "🔴🔴 <b>STRONG SELL</b>",
  }[analysis.signal] || "⚪ <b>NEUTRAL</b>";

  const sentimentBadge = {
    BULLISH: "🟢 Bullish (แรงซื้อหนุน)",
    BEARISH: "🔴 Bearish (แรงขายกดดัน)",
    NEUTRAL: "⚪ Neutral (ทรงตัว)",
  }[analysis.newsSentimentAnalysis.overallSentiment];

  const cal = analysis.calendarSafety;
  const sess = analysis.sessionStatus;

  const sym = analysis.symbol ? analysis.symbol.toUpperCase() : "";
  const isGold = sym.includes("XAU") || sym.includes("GOLD");
  const pipMultiplier = isGold ? 10 : sym.includes("JPY") ? 100 : 10000;
  const entryPrice = analysis.tradeSetup.pendingPrice || analysis.currentPrice;
  const currentP = analysis.currentPrice || entryPrice;
  const distancePips = Math.abs(Number((entryPrice - currentP) * pipMultiplier)).toFixed(1);
  const distanceText = entryPrice === currentP || Number(distancePips) <= 2
    ? "📍 ราคา ณ ปัจจุบัน"
    : entryPrice > currentP
    ? `📈 สูงกว่าตลาด ${distancePips} pips`
    : `📉 ต่ำกว่าตลาด ${distancePips} pips (โซนย่อตัว)`;

  // MT4 / MT5 Order Label matching exact MT5 mobile dropdown options
  const mtOrderType = analysis.tradeSetup.mtOrderLabel || (
    analysis.tradeSetup.orderType === "BUY_LIMIT" ? "Buy Limit" :
    analysis.tradeSetup.orderType === "SELL_LIMIT" ? "Sell Limit" :
    analysis.tradeSetup.orderType === "BUY_STOP" ? "Buy Stop" :
    analysis.tradeSetup.orderType === "SELL_STOP" ? "Sell Stop" :
    analysis.tradeSetup.orderType === "BUY_STOP_LIMIT" ? "Buy Stop Limit" :
    analysis.tradeSetup.orderType === "SELL_STOP_LIMIT" ? "Sell Stop Limit" :
    analysis.tradeSetup.orderType === "MARKET_EXECUTION" ? "Market Execution" :
    analysis.tradeSetup.action === "BUY" ? "Buy Limit" :
    analysis.tradeSetup.action === "SELL" ? "Sell Limit" :
    "Market Execution"
  );

  const mtOrderIcon = analysis.tradeSetup.action === "BUY" ? "🟢" : analysis.tradeSetup.action === "SELL" ? "🔴" : "⚪";
  const mtOrderAdvice = analysis.tradeSetup.mtOrderAdvice || (
    mtOrderType === "Buy Limit" ? "ตั้ง Buy Limit ดักซื้อของถูกที่แนวรับ OTE / FVG (ไม่ต้องเฝ้าจอ)" :
    mtOrderType === "Sell Limit" ? "ตั้ง Sell Limit ดักขายของแพงที่แนวต้าน OTE / FVG (ไม่ต้องเฝ้าจอ)" :
    mtOrderType === "Buy Stop" ? "ตั้ง Buy Stop ซื้อตามเมื่อราคาทะลุแนวต้าน Breakout" :
    mtOrderType === "Sell Stop" ? "ตั้ง Sell Stop ขายตามเมื่อราคาหลุดแนวรับ Breakdown" :
    mtOrderType === "Buy Stop Limit" ? "ตั้ง Buy Stop Limit ดักซื้อจังหวะเบรกเอาท์แล้วย่อรีเทส" :
    mtOrderType === "Sell Stop Limit" ? "ตั้ง Sell Stop Limit ดักขายจังหวะหลุดแนวรับแล้วเด้งรีเทส" :
    "กดเปิดออเดอร์ทันทีที่ราคาตลาด (Market Execution)"
  );

  const lines = [
    `🚀 <b>AI MARKET & NEWS INTELLIGENCE ALERT</b> 🚀`,
    `━━━━━━━━━━━━━━━━━━━━`,
    `📊 <b>Asset:</b> <code>${analysis.symbol}</code>  |  ⏱️ <b>TF:</b> <code>${analysis.timeframe}</code>`,
    `💰 <b>Live Price:</b> <code>${formatPrice(analysis.currentPrice, analysis.symbol)} USD</code>`,
    `🎯 <b>AI Signal:</b> ${signalBadge} (Score: <b>${analysis.confidence}%</b> | Grade: <b>${analysis.setupGrade || "A"}</b>)`,
    `📱 <b>MT5 Order:</b> ${mtOrderIcon} <b><code>${mtOrderType}</code></b>`,
    cal ? `🛡️ <b>News Shield:</b> <code>${cal.badgeText || "SAFE"}</code>` : "",
    sess ? `🕒 <b>Market Session:</b> ${sess.sessionBadge?.text || "NORMAL"} (${sess.thaiTimeStr || ""})` : "",
    `━━━━━━━━━━━━━━━━━━━━`,
    `📈 <b>TECHNICAL STRUCTURE:</b>`,
    `• Trend: <b>${escapeHtml(analysis.technicalAnalysis.trend)}</b>`,
    `• RSI Status: <b>${escapeHtml(analysis.technicalAnalysis.rsiStatus)}</b>`,
    `• EMA Ribbon: <b>${escapeHtml(analysis.technicalAnalysis.emaStatus)}</b>`,
    `• Support: <code>${analysis.technicalAnalysis.keySupport}</code>`,
    `• Resistance: <code>${analysis.technicalAnalysis.keyResistance}</code>`,
    ``,
    `📰 <b>NEWS & MACRO SENTIMENT:</b>`,
    `• Sentiment: ${sentimentBadge} (Score: <b>${analysis.newsSentimentAnalysis.sentimentScore}</b>)`,
    `• Key Catalysts:`,
    ...analysis.newsSentimentAnalysis.topHeadlines.slice(0, 2).map((h) => `  ▪️ <i>${escapeHtml(h.title)}</i>`),
    ``,
    analysis.fiveCorePillars
      ? [
          `🏛️ <b>5 CORE PILLARS CONFLUENCE (${analysis.fiveCorePillars.passedPillarsCount}/5):</b>`,
          `• 1️⃣ SMC: <b>${escapeHtml(analysis.fiveCorePillars.pillar1_SMC.note)}</b>`,
          `• 2️⃣ Auto Fib: <b>${escapeHtml(analysis.fiveCorePillars.pillar2_AutoFib.note)}</b>`,
          `• 3️⃣ Pivot Point: <b>${escapeHtml(analysis.fiveCorePillars.pillar3_PivotPoints.note)}</b>`,
          `• 4️⃣ Auto S&R: <b>${escapeHtml(analysis.fiveCorePillars.pillar4_ClusteredSR.note)}</b>`,
          `• 5️⃣ Dynamic Bands: <b>${escapeHtml(analysis.fiveCorePillars.pillar5_DynamicBands.note)}</b>`,
          ``,
        ].join("\n")
      : "",
    `━━━━━━━━━━━━━━━━━━━━`,
    `📱 <b>คำสั่งใน MT4 / MT5 แนะนำ (ORDER TICKET):</b>`,
    `👉 <b>ประเภทคำสั่ง:</b> ${mtOrderIcon} <b><code>${mtOrderType}</code></b>`,
    `• <b>สินทรัพย์ (Symbol):</b> <code>${analysis.symbol}</code> (${analysis.timeframe})`,
    `• <b>ราคาเปิด (Entry Price):</b> <code>${formatPrice(analysis.tradeSetup.pendingPrice, analysis.symbol)}</code> <i>(${distanceText})</i>`,
    analysis.tradeSetup.mtStopLimitPrice ? `• <b>ราคา Limit (Stop Limit Price):</b> <code>${formatPrice(analysis.tradeSetup.mtStopLimitPrice, analysis.symbol)}</code>` : "",
    `• <b>จุดตัดขาดทุน (Stop Loss):</b> <code>${formatPrice(analysis.tradeSetup.stopLoss, analysis.symbol)}</code> (-${analysis.tradeSetup.slPips || 0} pips)`,
    `• <b>จุดทำกำไร 1 (TP1):</b> <code>${formatPrice(analysis.tradeSetup.takeProfit1, analysis.symbol)}</code> (+${analysis.tradeSetup.tp1Pips || 0} pips) [เป้าหลัก R1/S1]`,
    `• <b>จุดทำกำไร 2 (TP2):</b> <code>${formatPrice(analysis.tradeSetup.takeProfit2, analysis.symbol)}</code> (+${analysis.tradeSetup.tp2Pips || 0} pips) [เป้าสวิง R2/S2]`,
    `• <b>ความคุ้มค่า (R:R Ratio):</b> <b>${analysis.tradeSetup.riskRewardRatio}</b>`,
    `• <b>โซนเข้าที่ได้เปรียบ:</b> <code>${formatPrice(analysis.tradeSetup.entryZone.min, analysis.symbol)} - ${formatPrice(analysis.tradeSetup.entryZone.max, analysis.symbol)}</code>`,
    ``,
    `💡 <b>วิธีตั้งในแอป MT5:</b>`,
    `<i>1. เปิดแอป MT5 ในมือถือ ➔ แตะคู่ ${analysis.symbol} ➔ กดส่งคำสั่ง</i>`,
    `<i>2. แตะเลือกประเภทคำสั่งเป็น 👉 <b>${mtOrderType}</b></i>`,
    `<i>3. กรอกตัวเลขตามตั๋วด้านบน แล้วกดยืนยัน Place Order (ไม่ต้องเฝ้าจอ)</i>`,
    `<i>(${mtOrderAdvice})</i>`,
    ``,
    `📋 <b>คัดลอกตัวเลขวางใน MT5 (แตะตัวเลขเพื่อ Copy):</b>`,
    `ราคาเปิด: <code>${analysis.tradeSetup.pendingPrice}</code>`,
    `Stop Loss: <code>${analysis.tradeSetup.stopLoss}</code>`,
    `Take Profit 1: <code>${analysis.tradeSetup.takeProfit1}</code>`,
    `Take Profit 2: <code>${analysis.tradeSetup.takeProfit2}</code>`,
    `━━━━━━━━━━━━━━━━━━━━`,
    `💡 <b>AI Confluence Summary:</b>`,
    `<i>${escapeHtml(analysis.summary)}</i>`,
    ``,
    `🕒 <b>Time:</b> <code>${new Date(analysis.timestamp).toLocaleString("th-TH", { timeZone: "Asia/Bangkok" })} (GMT+7)</code>`,
  ].filter(Boolean);

  return lines.join("\n");
}

export async function sendTelegramMessage(options: SendTelegramOptions): Promise<{ success: boolean; error?: string }> {
  const { botToken, chatId, message, analysis } = options;

  if (!botToken || !chatId) {
    return { success: false, error: "Telegram Bot Token and Chat ID are required." };
  }

  const textToSend = analysis ? formatTelegramAnalysisMessage(analysis) : escapeHtml(message || "Test Notification from AI Indicator Bot");

  try {
    const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: textToSend,
        parse_mode: "HTML",
      }),
    });

    const data = await res.json();
    if (!res.ok || !data.ok) {
      return { success: false, error: data.description || "Failed to send message to Telegram" };
    }

    return { success: true };
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : String(err);
    return { success: false, error: errMsg };
  }
}
