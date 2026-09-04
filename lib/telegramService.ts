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

  const lines = [
    `🚀 <b>AI MARKET & NEWS INTELLIGENCE ALERT</b> 🚀`,
    `━━━━━━━━━━━━━━━━━━━━`,
    `📊 <b>Asset:</b> <code>${analysis.symbol}</code>  |  ⏱️ <b>TF:</b> <code>${analysis.timeframe}</code>`,
    `💰 <b>Live Price:</b> <code>${formatPrice(analysis.currentPrice, analysis.symbol)} USD</code>`,
    `🎯 <b>AI Signal:</b> ${signalBadge} (Score: <b>${analysis.confidence}%</b> | Grade: <b>${analysis.setupGrade || "A"}</b>)`,
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
    `━━━━━━━━━━━━━━━━━━━━`,
    `⚡ <b>ACTIONABLE TRADE SETUP:</b>`,
    `• Action: <b>${analysis.tradeSetup.action}</b> (${analysis.tradeSetup.orderType})`,
    `• Entry Zone: <code>${analysis.tradeSetup.entryZone.min} - ${analysis.tradeSetup.entryZone.max}</code>`,
    `• Stop Loss (SL): <code>${analysis.tradeSetup.stopLoss}</code> (-${analysis.tradeSetup.slPips || 0} pips)`,
    `• Take Profit 1 (TP1): <code>${analysis.tradeSetup.takeProfit1}</code> (+${analysis.tradeSetup.tp1Pips || 0} pips)`,
    `• Take Profit 2 (TP2): <code>${analysis.tradeSetup.takeProfit2}</code> (+${analysis.tradeSetup.tp2Pips || 0} pips)`,
    `• R:R Ratio: <b>${analysis.tradeSetup.riskRewardRatio}</b>`,
    `• Invalidation: <i>${escapeHtml(analysis.tradeSetup.invalidationNote)}</i>`,
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
