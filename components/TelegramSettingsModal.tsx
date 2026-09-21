"use client";

import React, { useState, useEffect } from "react";
import { X, Key, Send, CheckCircle2, AlertCircle, Info, ExternalLink, Database } from "lucide-react";

interface TelegramSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (config: { botToken: string; chatId: string; geminiApiKey: string; massiveApiKey: string }) => void;
}

const ALL_WATCHLIST = [
  { symbol: "XAUUSD", name: "Gold (ทองคำ)" },
  { symbol: "BTCUSDT", name: "Bitcoin" },
  { symbol: "ETHUSDT", name: "Ethereum" },
  { symbol: "SOLUSDT", name: "Solana" },
  { symbol: "EURUSD", name: "EUR/USD" },
  { symbol: "GBPUSD", name: "GBP/USD" },
  { symbol: "USDJPY", name: "USD/JPY" },
  { symbol: "GBPJPY", name: "GBP/JPY" },
  { symbol: "AUDUSD", name: "AUD/USD" },
  { symbol: "USOIL", name: "Crude Oil (น้ำมัน)" },
  { symbol: "XAGUSD", name: "Silver (เงิน)" },
];

export default function TelegramSettingsModal({ isOpen, onClose, onSave }: TelegramSettingsModalProps) {
  const [botToken, setBotToken] = useState("");
  const [chatId, setChatId] = useState("");
  const [alertSymbols, setAlertSymbols] = useState("XAUUSD");
  const [filterMode, setFilterMode] = useState<"SINGLE" | "MULTI">("SINGLE");
  const [geminiApiKey, setGeminiApiKey] = useState("");
  const [massiveApiKey, setMassiveApiKey] = useState("");
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setBotToken(localStorage.getItem("telegram_bot_token") || "");
      setChatId(localStorage.getItem("telegram_chat_id") || "");
      const savedFilter = localStorage.getItem("telegram_alert_symbols") || "ALL";
      setAlertSymbols(savedFilter);
      if (savedFilter.includes(",") || savedFilter === "ALL" || savedFilter === "FOREX") {
        setFilterMode("MULTI");
      } else {
        setFilterMode("SINGLE");
      }
      setGeminiApiKey(localStorage.getItem("gemini_api_key") || "");
      setMassiveApiKey(localStorage.getItem("massive_api_key") || "");
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const isAll = alertSymbols === "ALL" || alertSymbols === "*";
  const isGoldOnly = alertSymbols === "XAUUSD" || alertSymbols === "GOLD";
  const isForexOnly = alertSymbols === "FOREX";

  const selectedList = isAll
    ? ALL_WATCHLIST.map((a) => a.symbol)
    : isGoldOnly
    ? ["XAUUSD"]
    : isForexOnly
    ? ["EURUSD", "GBPUSD", "USDJPY", "GBPJPY", "AUDUSD"]
    : alertSymbols.split(",").map((s) => s.trim().toUpperCase());

  const handleSelectSingle = (sym: string) => {
    setFilterMode("SINGLE");
    setAlertSymbols(sym);
  };

  const toggleSymbol = (sym: string) => {
    if (filterMode === "SINGLE") {
      // Single mode: clicking directly switches to that single pair
      setAlertSymbols(sym);
      return;
    }

    let nextList: string[];
    if (isAll) {
      nextList = ALL_WATCHLIST.map((a) => a.symbol).filter((s) => s !== sym);
    } else {
      if (selectedList.includes(sym)) {
        nextList = selectedList.filter((s) => s !== sym);
      } else {
        nextList = [...selectedList, sym];
      }
    }
    if (nextList.length === 0 || nextList.length === ALL_WATCHLIST.length) {
      setAlertSymbols("ALL");
    } else {
      setAlertSymbols(nextList.join(","));
    }
  };

  const handleSave = () => {
    if (typeof window !== "undefined") {
      localStorage.setItem("telegram_bot_token", botToken);
      localStorage.setItem("telegram_chat_id", chatId);
      localStorage.setItem("telegram_alert_symbols", alertSymbols);
      localStorage.setItem("gemini_api_key", geminiApiKey);
      localStorage.setItem("massive_api_key", massiveApiKey);
    }

    if (chatId) {
      fetch("/api/telegram", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          botToken,
          chatId,
          alertSymbol: alertSymbols,
          action: "update-filter",
        }),
      }).catch(console.error);
    }

    onSave({ botToken, chatId, geminiApiKey, massiveApiKey });
    onClose();
  };

  const handleTestTelegram = async () => {
    if (!botToken || !chatId) {
      setTestResult({ success: false, message: "Please enter both Bot Token and Chat ID." });
      return;
    }

    setIsTesting(true);
    setTestResult(null);

    try {
      const res = await fetch("/api/telegram", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          botToken,
          chatId,
          alertSymbol: alertSymbols,
          message: "🚀 *Test Notification from AI Market Indicator!*\n\nYour Telegram bot is successfully connected and ready to receive real-time signals & news confluence alerts.",
        }),
      });

      const data = await res.json();
      if (data.success) {
        setTestResult({ success: true, message: "Test message sent successfully! Check your Telegram." });
      } else {
        setTestResult({ success: false, message: data.error || "Failed to send message." });
      }
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      setTestResult({ success: false, message: errMsg });
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-lg bg-surface-100 border border-slate-800 rounded-2xl shadow-2xl p-6 overflow-hidden max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-blue-500/10 text-brand-blue border border-blue-500/20">
              <Key className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-white">Settings & API Keys</h2>
              <p className="text-xs text-slate-400">Configure AI, Market Data & Telegram credentials</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <div className="mt-5 space-y-4">
          {/* Gemini API Key */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-medium text-slate-300">Google Gemini API Key (AI Analysis)</label>
              <a
                href="https://aistudio.google.com/"
                target="_blank"
                rel="noreferrer"
                className="text-[11px] text-brand-blue hover:underline flex items-center gap-0.5"
              >
                Get Free Key <ExternalLink className="w-3 h-3" />
              </a>
            </div>
            <input
              type="password"
              placeholder="AQ.Ab8RN6IBm..."
              value={geminiApiKey}
              onChange={(e) => setGeminiApiKey(e.target.value)}
              className="w-full px-3 py-2 bg-surface-50 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-brand-blue font-mono"
            />
          </div>

          {/* Massive API Key */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-medium text-slate-300">Massive API Key (Market Data - Optional)</label>
              <a
                href="https://massive.com/dashboard"
                target="_blank"
                rel="noreferrer"
                className="text-[11px] text-cyan-400 hover:underline flex items-center gap-0.5"
              >
                massive.com <ExternalLink className="w-3 h-3" />
              </a>
            </div>
            <input
              type="password"
              placeholder="Massive API Key..."
              value={massiveApiKey}
              onChange={(e) => setMassiveApiKey(e.target.value)}
              className="w-full px-3 py-2 bg-surface-50 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-brand-blue font-mono"
            />
            <p className="text-[11px] text-slate-500 mt-1">
              (ถ้าไม่ใส่ ระบบจะดึงกราฟสดจาก Binance & Yahoo Finance ให้ฟรีอัตโนมัติ)
            </p>
          </div>

          <div className="pt-2 border-t border-slate-800/80"></div>

          {/* Telegram Bot Token */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-medium text-slate-300">Telegram Bot Token</label>
              <span className="text-[11px] text-slate-400">จาก @BotFather</span>
            </div>
            <input
              type="text"
              placeholder="728349281:AAH..."
              value={botToken}
              onChange={(e) => setBotToken(e.target.value)}
              className="w-full px-3 py-2 bg-surface-50 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-brand-blue font-mono"
            />
          </div>

          {/* Telegram Chat ID */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-medium text-slate-300">Telegram Chat / Channel ID</label>
              <span className="text-[11px] text-slate-400">จาก @userinfobot</span>
            </div>
            <input
              type="text"
              placeholder="123456789"
              value={chatId}
              onChange={(e) => setChatId(e.target.value)}
              className="w-full px-3 py-2 bg-surface-50 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-brand-blue font-mono"
            />
          </div>

          {/* Telegram Alert Pair Filter */}
          <div className="pt-2 border-t border-slate-800/80">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
                <span>โหมดการแจ้งเตือนสัญญาณเทรด</span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${
                  filterMode === "SINGLE" ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30" : "bg-blue-500/20 text-blue-400"
                }`}>
                  {filterMode === "SINGLE" ? `🎯 เดี่ยว: ${alertSymbols}` : isAll ? "ทุกคู่ (11 สินทรัพย์)" : `${selectedList.length} คู่ที่เลือก`}
                </span>
              </label>
              <span className="text-[11px] text-slate-400">ปลอดภัยจาก Rate Limit</span>
            </div>

            {/* Mode Switcher Tabs */}
            <div className="grid grid-cols-2 gap-1.5 mb-2.5 bg-surface-50 p-1 rounded-xl border border-slate-800">
              <button
                type="button"
                onClick={() => {
                  setFilterMode("SINGLE");
                  if (alertSymbols.includes(",") || alertSymbols === "ALL") {
                    setAlertSymbols("XAUUSD");
                  }
                }}
                className={`py-1.5 rounded-lg text-xs font-medium transition-all flex items-center justify-center gap-1.5 ${
                  filterMode === "SINGLE"
                    ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <span>🎯</span>
                <span>รับทีละคู่เดียว (แนะนำ)</span>
              </button>
              <button
                type="button"
                onClick={() => setFilterMode("MULTI")}
                className={`py-1.5 rounded-lg text-xs font-medium transition-all flex items-center justify-center gap-1.5 ${
                  filterMode === "MULTI"
                    ? "bg-brand-blue/20 text-brand-blue border border-brand-blue/40 shadow-sm"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <span>🔀</span>
                <span>เลือกหลายคู่</span>
              </button>
            </div>

            {/* SINGLE PAIR MODE: Clean Single-Choice Grid */}
            {filterMode === "SINGLE" ? (
              <div className="space-y-2">
                <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-300 flex items-start gap-2">
                  <span className="text-base">🛡️</span>
                  <div>
                    <span className="font-semibold">ระบบแจ้งเตือนเฉพาะคู่: [{alertSymbols}]</span>
                    <p className="text-[11px] text-emerald-400/80 mt-0.5">
                      ระบบจะสแกนและส่งสัญญาณเฉพาะคู่นี้เท่านั้น คู่อื่นจะไม่ถูกส่งเข้า Telegram ป้องกันปัญหาบอทโดนระงับ 100%
                    </p>
                  </div>
                </div>

                <div className="p-2.5 rounded-xl bg-surface-50/70 border border-slate-800/80">
                  <div className="text-[11px] text-slate-400 mb-1.5">คลิกคู่เงินที่ต้องการรับแจ้งเตือนเดี่ยวๆ:</div>
                  <div className="grid grid-cols-3 gap-1.5">
                    {ALL_WATCHLIST.map((item) => {
                      const active = alertSymbols === item.symbol;
                      return (
                        <button
                          key={item.symbol}
                          type="button"
                          onClick={() => handleSelectSingle(item.symbol)}
                          className={`px-2 py-2 rounded-lg text-xs font-mono font-medium border transition-all flex flex-col items-center text-center ${
                            active
                              ? "bg-emerald-500/20 border-emerald-500 text-emerald-300 shadow-sm ring-1 ring-emerald-500/50"
                              : "bg-surface-100 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700"
                          }`}
                        >
                          <span className="font-semibold text-[12px]">{item.symbol}</span>
                          <span className="text-[10px] text-slate-500 truncate max-w-full">{item.name.split(" ")[0]}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            ) : (
              /* MULTI PAIR MODE: Checkbox Grid with Presets */
              <div className="space-y-2">
                <div className="grid grid-cols-3 gap-1.5">
                  <button
                    type="button"
                    onClick={() => setAlertSymbols("ALL")}
                    className={`px-2 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                      isAll
                        ? "bg-amber-500/20 border-amber-500 text-amber-300 shadow-sm"
                        : "bg-surface-50 border-slate-800 text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    🌐 ทุกคู่ (11)
                  </button>
                  <button
                    type="button"
                    onClick={() => setAlertSymbols("XAUUSD")}
                    className={`px-2 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                      isGoldOnly
                        ? "bg-brand-blue/20 border-brand-blue text-white shadow-sm"
                        : "bg-surface-50 border-slate-800 text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    🟡 ทองคำ
                  </button>
                  <button
                    type="button"
                    onClick={() => setAlertSymbols("FOREX")}
                    className={`px-2 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                      isForexOnly
                        ? "bg-emerald-500/20 border-emerald-500 text-emerald-300 shadow-sm"
                        : "bg-surface-50 border-slate-800 text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    💱 Forex
                  </button>
                </div>

                {isAll && (
                  <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-300">
                    ⚠️ <b>คำเตือน:</b> การเปิดรับทุกคู่พร้อมกัน อาจทำให้ Telegram ส่งข้อความถี่ในช่วงตลาดผันผวน
                  </div>
                )}

                <div className="p-2.5 rounded-xl bg-surface-50/70 border border-slate-800/80">
                  <div className="text-[11px] text-slate-400 mb-1.5 flex items-center justify-between">
                    <span>ติ๊กเลือกคู่เงินที่ต้องการ:</span>
                    <button
                      type="button"
                      onClick={() => setAlertSymbols("ALL")}
                      className="text-[10px] text-brand-blue hover:underline"
                    >
                      เลือกทั้งหมด
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto pr-1">
                    {ALL_WATCHLIST.map((item) => {
                      const active = selectedList.includes(item.symbol);
                      return (
                        <button
                          key={item.symbol}
                          type="button"
                          onClick={() => toggleSymbol(item.symbol)}
                          className={`px-2 py-1 rounded-md text-[11px] font-mono font-medium border transition-all flex items-center gap-1 ${
                            active
                              ? "bg-brand-blue/25 border-brand-blue/60 text-white shadow-xs"
                              : "bg-surface-100 border-slate-800 text-slate-500 hover:text-slate-300 hover:border-slate-700"
                          }`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${active ? "bg-emerald-400" : "bg-slate-600"}`}></span>
                          <span>{item.symbol}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Test Status Banner */}
          {testResult && (
            <div
              className={`p-3 rounded-lg border text-xs flex items-start gap-2 ${
                testResult.success
                  ? "bg-emerald-950/30 border-emerald-800/50 text-emerald-300"
                  : "bg-rose-950/30 border-rose-800/50 text-rose-300"
              }`}
            >
              {testResult.success ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              )}
              <span>{testResult.message}</span>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="mt-6 pt-4 border-t border-slate-800 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={handleTestTelegram}
            disabled={isTesting || !botToken || !chatId}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-surface-50 hover:bg-slate-800 border border-slate-700 text-xs font-medium text-slate-200 transition-colors disabled:opacity-40"
          >
            <Send className={`w-3.5 h-3.5 ${isTesting ? "animate-spin" : ""}`} />
            <span>{isTesting ? "Testing..." : "Test Telegram Alert"}</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 rounded-lg bg-transparent hover:bg-slate-800 text-xs font-medium text-slate-300 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-4 py-2 rounded-lg bg-brand-blue hover:bg-blue-600 text-xs font-semibold text-white shadow-md shadow-blue-500/20 transition-all"
            >
              Save Settings
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}