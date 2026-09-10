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

  const sym = analysis.symbol ? analysis.symbol.toUpperCase() : "";
  const isGold = sym.includes("XAU") || sym.includes("GOLD");
  const pipMultiplier = isGold ? 10 : sym.includes("JPY") ? 100 : 10000;
  const entryPrice = analysis.tradeSetup.pendingPrice || analysis.currentPrice;
  const currentP = analysis.currentPrice || entryPrice;
  const distancePips = Math.abs(Number((entryPrice - currentP) * pipMultiplier)).toFixed(1);
  const distanceText = entryPrice === currentP || Number(distancePips) <= 2
    ? "ราคาตลาด"
    : entryPrice > currentP
    ? `สูงกว่าตลาด ${distancePips} p`
    : `ย่อตัว ${distancePips} p`;

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
  const cal = analysis.calendarSafety?.badgeText || "SAFE";
  const grade = analysis.setupGrade || "A";
  const conf = analysis.confidence;

  const newsSentiment = analysis.newsSentimentAnalysis.overallSentiment === "BULLISH"
    ? "🟢 ข่าวหนุน (Bullish)"
    : analysis.newsSentimentAnalysis.overallSentiment === "BEARISH"
    ? "🔴 ข่าวกดดัน (Bearish)"
    : "⚪ ข่าวเป็นกลาง";

  const lines = [
    `⚡ <b>AI SIGNAL: ${analysis.symbol} (${analysis.timeframe})</b>`,
    `━━━━━━━━━━━━━━━━━━━━`,
    `🎯 <b>คำสั่ง MT5:</b> ${mtOrderIcon} <b><code>${mtOrderType}</code></b> (${signalBadge})`,
    `💰 <b>ราคาตลาด:</b> <code>${formatPrice(currentP, analysis.symbol)}</code>`,
    ``,
    `📋 <b>ตั๋วเทรด MT5 (แตะตัวเลขเพื่อ Copy):</b>`,
    `• <b>Entry:</b> <code>${analysis.tradeSetup.pendingPrice}</code> <i>(${distanceText})</i>`,
    analysis.tradeSetup.mtStopLimitPrice ? `• <b>Stop Limit:</b> <code>${analysis.tradeSetup.mtStopLimitPrice}</code>` : "",
    `• <b>Stop Loss:</b> <code>${analysis.tradeSetup.stopLoss}</code> (-${analysis.tradeSetup.slPips || 0} pips)`,
    `• <b>TP1 (หลัก):</b> <code>${analysis.tradeSetup.takeProfit1}</code> (+${analysis.tradeSetup.tp1Pips || 0} pips)`,
    analysis.tradeSetup.takeProfit2 ? `• <b>TP2 (สวิง):</b> <code>${analysis.tradeSetup.takeProfit2}</code> (+${analysis.tradeSetup.tp2Pips || 0} pips)` : "",
    `• <b>R:R:</b> <b>${analysis.tradeSetup.riskRewardRatio}</b> | เกรด: <b>${grade}</b> (${conf}%)`,
    ``,
    `💡 <b>เทคนิค:</b> ${escapeHtml(analysis.technicalAnalysis.trend)} (${escapeHtml(analysis.technicalAnalysis.rsiStatus)})`,
    `📰 <b>ข่าว:</b> ${newsSentiment} | Shield: <code>${cal}</code>`,
    `━━━━━━━━━━━━━━━━━━━━`,
    `🕒 <code>${new Date(analysis.timestamp).toLocaleString("th-TH", { timeZone: "Asia/Bangkok" })} (GMT+7)</code>`,
  ].filter(Boolean);

  return lines.join("\n");
}

export function formatTelegramPreWarningMessage(analysis: AnalysisResult): string {
  const sym = analysis.symbol ? analysis.symbol.toUpperCase() : "";
  const isGold = sym.includes("XAU") || sym.includes("GOLD");
  const pipMultiplier = isGold ? 10 : sym.includes("JPY") ? 100 : 10000;
  const entryPrice = analysis.tradeSetup.pendingPrice || analysis.currentPrice;
  const currentP = analysis.currentPrice || entryPrice;
  const distancePips = Math.abs(Number((entryPrice - currentP) * pipMultiplier)).toFixed(1);

  const mtOrderType = analysis.tradeSetup.mtOrderLabel || (
    analysis.tradeSetup.action === "BUY" ? "Buy Limit" : "Sell Limit"
  );
  const mtOrderIcon = analysis.tradeSetup.action === "BUY" ? "🟢" : "🔴";
  const actionText = analysis.tradeSetup.action === "BUY" ? "BUY" : "SELL";

  const lines = [
    `⏳ <b>เรดาร์ล่วงหน้า (15-30 นาที): ${analysis.symbol} (${analysis.timeframe})</b>`,
    `━━━━━━━━━━━━━━━━━━━━`,
    `🎯 ทรงสไนเปอร์ <b>${actionText}</b> (ห่างจุดเข้า ~${distancePips} pips)`,
    `📱 <b>แนะนำตั้ง:</b> ${mtOrderIcon} <b><code>${mtOrderType}</code></b>`,
    `💰 <b>ราคาตลาด:</b> <code>${formatPrice(currentP, analysis.symbol)}</code>`,
    ``,
    `📋 <b>ตั๋วตั้งรอใน MT5 (แตะตัวเลขเพื่อ Copy):</b>`,
    `• <b>Entry:</b> <code>${analysis.tradeSetup.pendingPrice}</code>`,
    analysis.tradeSetup.mtStopLimitPrice ? `• <b>Stop Limit:</b> <code>${analysis.tradeSetup.mtStopLimitPrice}</code>` : "",
    `• <b>Stop Loss:</b> <code>${analysis.tradeSetup.stopLoss}</code> (-${analysis.tradeSetup.slPips || 0} pips)`,
    `• <b>Take Profit:</b> <code>${analysis.tradeSetup.takeProfit1}</code> (+${analysis.tradeSetup.tp1Pips || 0} pips)`,
    `• <b>R:R:</b> <b>${analysis.tradeSetup.riskRewardRatio}</b>`,
    ``,
    `💡 <i>ตั้ง ${mtOrderType} ทิ้งไว้ใน MT5 ได้เลย เมื่อราคาแตะจะเกี่ยวออเดอร์อัตโนมัติ</i>`,
    `━━━━━━━━━━━━━━━━━━━━`,
    `🕒 <code>${new Date().toLocaleString("th-TH", { timeZone: "Asia/Bangkok" })} (GMT+7)</code>`,
  ].filter(Boolean);

  return lines.join("\n");
}

export interface SendTelegramOptions {
  botToken: string;
  chatId: string;
  message?: string;
  analysis?: AnalysisResult;
  isPreWarning?: boolean;
}

export async function sendTelegramMessage(options: SendTelegramOptions): Promise<{ success: boolean; error?: string }> {
  const { botToken, chatId, message, analysis, isPreWarning } = options;

  if (!botToken || !chatId) {
    return { success: false, error: "Telegram Bot Token and Chat ID are required." };
  }

  const textToSend = analysis
    ? isPreWarning
      ? formatTelegramPreWarningMessage(analysis)
      : formatTelegramAnalysisMessage(analysis)
    : escapeHtml(message || "Test Notification from AI Indicator Bot");

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
