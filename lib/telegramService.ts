import { AnalysisResult } from "./types";

export interface SendTelegramOptions {
  botToken: string;
  chatId: string;
  message?: string;
  analysis?: AnalysisResult;
}

export function formatTelegramAnalysisMessage(analysis: AnalysisResult): string {
  const signalEmoji = {
    STRONG_BUY: "???? *STRONG BUY*",
    BUY: "?? *BUY*",
    WAIT: "?? *WAIT / NEUTRAL*",
    SELL: "?? *SELL*",
    STRONG_SELL: "???? *STRONG SELL*",
  }[analysis.signal] || "? *NEUTRAL*";

  const sentimentEmoji = {
    BULLISH: "?? Bullish",
    BEARISH: "?? Bearish",
    NEUTRAL: "?? Neutral",
  }[analysis.newsSentimentAnalysis.overallSentiment];

  const lines = [
    `?? *AI MARKET & NEWS ANALYSIS ALERT* ??`,
    `????????????????????`,
    `?? *Asset:* \`${analysis.symbol}\`  |  ? *TF:* \`${analysis.timeframe}\``,
    `?? *Current Price:* \`${analysis.currentPrice.toLocaleString()}\``,
    `?? *AI Signal:* ${signalEmoji} (Confidence: *${analysis.confidence}%*)`,
    `????????????????????`,
    `?? *TECHNICAL STRUCTURE:*`,
    `• Trend: *${analysis.technicalAnalysis.trend}*`,
    `• RSI(14): *${analysis.technicalAnalysis.rsiStatus}*`,
    `• EMA: *${analysis.technicalAnalysis.emaStatus}*`,
    `• Support: \`${analysis.technicalAnalysis.keySupport}\``,
    `• Resistance: \`${analysis.technicalAnalysis.keyResistance}\``,
    ``,
    `?? *NEWS & MACRO SENTIMENT:*`,
    `• Market Tone: ${sentimentEmoji} (Score: *${analysis.newsSentimentAnalysis.sentimentScore}*)`,
    `• Key Catalysts:`,
    ...analysis.newsSentimentAnalysis.topHeadlines.slice(0, 2).map((h) => `  ?? _${h.title}_`),
    ``,
    `????????????????????`,
    `?? *ACTIONABLE TRADE SETUP:*`,
    `• Action: *${analysis.tradeSetup.action}*`,
    `• Entry Zone: \`${analysis.tradeSetup.entryZone.min} - ${analysis.tradeSetup.entryZone.max}\``,
    `• Stop Loss (SL): \`${analysis.tradeSetup.stopLoss}\``,
    `• Take Profit 1 (TP1): \`${analysis.tradeSetup.takeProfit1}\``,
    `• Take Profit 2 (TP2): \`${analysis.tradeSetup.takeProfit2}\``,
    `• R:R Ratio: *${analysis.tradeSetup.riskRewardRatio}*`,
    `• Invalidation: _${analysis.tradeSetup.invalidationNote}_`,
    `????????????????????`,
    `?? *AI Summary:*`,
    `_${analysis.summary}_`,
    ``,
    `? *Analyzed at:* \`${new Date(analysis.timestamp).toUTCString()}\``,
  ];

  return lines.join("\n");
}

export async function sendTelegramMessage(options: SendTelegramOptions): Promise<{ success: boolean; error?: string }> {
  const { botToken, chatId, message, analysis } = options;

  if (!botToken || !chatId) {
    return { success: false, error: "Telegram Bot Token and Chat ID are required." };
  }

  const textToSend = analysis ? formatTelegramAnalysisMessage(analysis) : message || "Test Notification from AI Indicator Bot";

  try {
    const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: textToSend,
        parse_mode: "Markdown",
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
