"use client";

import React, { useState, useEffect } from "react";
import { X, Key, Send, CheckCircle2, AlertCircle, Info, ExternalLink, Database } from "lucide-react";

interface TelegramSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (config: { botToken: string; chatId: string; geminiApiKey: string; massiveApiKey: string }) => void;
}

export default function TelegramSettingsModal({ isOpen, onClose, onSave }: TelegramSettingsModalProps) {
  const [botToken, setBotToken] = useState("");
  const [chatId, setChatId] = useState("");
  const [geminiApiKey, setGeminiApiKey] = useState("");
  const [massiveApiKey, setMassiveApiKey] = useState("");
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setBotToken(localStorage.getItem("telegram_bot_token") || "");
      setChatId(localStorage.getItem("telegram_chat_id") || "");
      setGeminiApiKey(localStorage.getItem("gemini_api_key") || "");
      setMassiveApiKey(localStorage.getItem("massive_api_key") || "");
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSave = () => {
    if (typeof window !== "undefined") {
      localStorage.setItem("telegram_bot_token", botToken);
      localStorage.setItem("telegram_chat_id", chatId);
      localStorage.setItem("gemini_api_key", geminiApiKey);
      localStorage.setItem("massive_api_key", massiveApiKey);
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