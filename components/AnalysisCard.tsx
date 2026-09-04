"use client";

import React, { useState } from "react";
import { AnalysisResult } from "@/lib/types";
import {
  Sparkles,
  Send,
  ShieldAlert,
  Target,
  Clock,
  CheckCircle2,
  XCircle,
  TrendingUp,
  Info,
  Layers,
  AlertTriangle,
  Copy,
  Check,
  Award,
  BarChart3,
  Sliders,
  History,
  Zap,
  ArrowRight,
  Compass,
  MapPin,
  Flame,
  ShieldCheck,
  Gauge,
  Lock,
  Timer,
  Radio,
  Clock3,
  Calendar,
  AlertOctagon,
  BookOpen,
  ChevronDown,
  ChevronUp,
  Smartphone,
  Calculator
} from "lucide-react";

interface AnalysisCardProps {
  analysis: AnalysisResult | null;
  isLoading: boolean;
  onSendTelegram: () => void;
  isSendingTelegram: boolean;
  telegramStatus: { success: boolean; message: string } | null;
}

export default function AnalysisCard({
  analysis,
  isLoading,
  onSendTelegram,
  isSendingTelegram,
  telegramStatus,
}: AnalysisCardProps) {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [showPlaybookGuide, setShowPlaybookGuide] = useState<boolean>(false);
  const [customBalance, setCustomBalance] = useState<number>(10);
  const [customRiskPct, setCustomRiskPct] = useState<number>(2);
  const [accountType, setAccountType] = useState<"STANDARD" | "CENT">("STANDARD");

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleCopyFullPlan = () => {
    if (!analysis) return;
    const mc = analysis.masterConfluence;
    const reg = analysis.regimeInfo;
    const sess = analysis.sessionStatus;
    const cal = analysis.calendarSafety;
    const text = `📊 [ECONOMIC CALENDAR & SESSION PLAN: ${analysis.symbol}]\n` +
      `• Signal: ${analysis.signal} (Grade: ${analysis.setupGrade || "A"}, Score: ${mc?.totalScore || analysis.confidence}%)\n` +
      `• Calendar Shield: ${cal?.badgeText || "SAFE"}\n` +
      `• Calendar Note: ${cal?.freezeReason || ""}\n` +
      `• Session Timing: ${sess?.sessionBadge.text || "NORMAL"} (${sess?.thaiTimeStr || ""})\n` +
      `• Market Regime: ${reg?.title || "NORMAL"} (Target Win Rate: ${reg?.targetedWinRate || "75-85%"})\n` +
      `• Entry: ${analysis.tradeSetup.entryZone.min} - ${analysis.tradeSetup.entryZone.max}\n` +
      `• Stop Loss: ${analysis.tradeSetup.stopLoss} (${analysis.tradeSetup.slPips || 0} Pips)\n` +
      `• Take Profit 1: ${analysis.tradeSetup.takeProfit1} (+${analysis.tradeSetup.tp1Pips || 0} Pips)\n` +
      `• Take Profit 2: ${analysis.tradeSetup.takeProfit2} (+${analysis.tradeSetup.tp2Pips || 0} Pips)\n` +
      `• R:R: ${analysis.tradeSetup.riskRewardRatio}\n` +
      `• Invalidation: ${analysis.tradeSetup.invalidationNote}`;
    copyToClipboard(text, "full_plan");
  };

  if (isLoading) {
    return (
      <div className="bg-surface-100 border border-slate-800 rounded-2xl p-8 shadow-sm flex flex-col items-center justify-center min-h-[480px] text-center">
        <div className="relative">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-brand-blue to-brand-purple flex items-center justify-center shadow-xl shadow-blue-500/20 animate-pulse">
            <Sparkles className="w-8 h-8 text-white animate-spin" />
          </div>
        </div>
        <h3 className="text-base font-bold text-white mt-4">Scanning Economic Calendar & Market Sessions...</h3>
        <p className="text-xs text-slate-400 max-w-md mt-1 leading-relaxed">
          ตรวจจับข่าวกล่องแดง 🔴 ส้ม 🟠 เหลือง 🟡 เทา ⚪ ตรวจเช็คเวลาห้ามเทรด (Freeze Shield) และ Golden Hours...
        </p>
      </div>
    );
  }

  if (!analysis) {
    return (
      <div className="bg-surface-100 border border-slate-800 rounded-2xl p-8 shadow-sm text-center flex flex-col items-center justify-center min-h-[350px]">
        <div className="w-12 h-12 rounded-xl bg-surface-50 border border-slate-800 flex items-center justify-center text-slate-400 mb-3">
          <Sparkles className="w-6 h-6" />
        </div>
        <h3 className="text-sm font-semibold text-white">No AI Analysis Generated Yet</h3>
        <p className="text-xs text-slate-400 max-w-sm mt-1">
          กดปุ่ม <strong>AI Synthesize</strong> เพื่อให้ระบบตรวจสอบข่าวกล่องแดงและออกแผนเทรด
        </p>
      </div>
    );
  }

  const getSignalBadge = (signal: AnalysisResult["signal"]) => {
    switch (signal) {
      case "STRONG_BUY":
        return {
          bg: "bg-emerald-500/10 border-emerald-500/30 text-emerald-400",
          label: "STRONG BUY",
          glow: "glow-green",
        };
      case "BUY":
        return {
          bg: "bg-emerald-500/10 border-emerald-500/20 text-emerald-400",
          label: "BUY",
          glow: "",
        };
      case "STRONG_SELL":
        return {
          bg: "bg-rose-500/10 border-rose-500/30 text-rose-400",
          label: "STRONG SELL",
          glow: "glow-red",
        };
      case "SELL":
        return {
          bg: "bg-rose-500/10 border-rose-500/20 text-rose-400",
          label: "SELL",
          glow: "",
        };
      default:
        return {
          bg: "bg-amber-500/10 border-amber-500/20 text-amber-400",
          label: "WAIT / NEUTRAL",
          glow: "",
        };
    }
  };

  const getGradeBadge = (grade?: string) => {
    const g = grade || "B";
    if (g.includes("A+")) return "bg-emerald-500/20 text-emerald-300 border-emerald-500/40";
    if (g.includes("A")) return "bg-teal-500/20 text-teal-300 border-teal-500/30";
    if (g.includes("B")) return "bg-blue-500/20 text-blue-300 border-blue-500/30";
    return "bg-slate-700/50 text-slate-300 border-slate-600";
  };

  const signalConfig = getSignalBadge(analysis.signal);
  const backtest = analysis.historicalBacktest;
  const opt = analysis.optimizedConfig;
  const mc = analysis.masterConfluence;
  const reg = analysis.regimeInfo;
  const sess = analysis.sessionStatus;
  const cal = analysis.calendarSafety;

  return (
    <div className="bg-surface-100 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-5">
      {/* 1. Header Signal & Actions Banner */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-4 rounded-xl bg-surface-50 border border-slate-800">
        <div className="flex flex-wrap items-center gap-3">
          <div className={`px-4 py-2 rounded-xl border text-sm font-black tracking-wide ${signalConfig.bg} ${signalConfig.glow}`}>
            {signalConfig.label}
          </div>

          {/* Setup Grade */}
          <div className={`flex items-center gap-1 px-3 py-1.5 rounded-lg border text-xs font-bold ${getGradeBadge(analysis.setupGrade)}`}>
            <Award className="w-3.5 h-3.5" />
            <span>Grade: {analysis.setupGrade || "A"} Setup</span>
          </div>

          {/* Confluence Score Gauge */}
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-300">Master Confluence Score</span>
              <span className="text-xs font-mono font-bold text-white">{mc?.totalScore || analysis.confidence}%</span>
            </div>
            <div className="w-36 h-2 bg-slate-800 rounded-full overflow-hidden mt-1">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  (mc?.totalScore || analysis.confidence) >= 85
                    ? "bg-emerald-400"
                    : (mc?.totalScore || analysis.confidence) >= 70
                    ? "bg-teal-400"
                    : (mc?.totalScore || analysis.confidence) >= 55
                    ? "bg-amber-400"
                    : "bg-rose-400"
                }`}
                style={{ width: `${mc?.totalScore || analysis.confidence}%` }}
              ></div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleCopyFullPlan}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-surface-100 hover:bg-slate-800 border border-slate-700 text-xs font-semibold text-slate-200 transition-all active:scale-95"
            title="Copy MT4/MT5 trade setup to clipboard"
          >
            {copiedKey === "full_plan" ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400">Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-slate-400" />
                <span>Copy MT4/5 Plan</span>
              </>
            )}
          </button>

          <button
            onClick={onSendTelegram}
            disabled={isSendingTelegram}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-xs font-bold text-white shadow-md shadow-blue-500/20 transition-all active:scale-95 disabled:opacity-50"
          >
            <Send className={`w-3.5 h-3.5 ${isSendingTelegram ? "animate-spin" : ""}`} />
            <span>{isSendingTelegram ? "Sending..." : "Send to Telegram Bot"}</span>
          </button>
        </div>
      </div>

      {/* 2. 📅 ECONOMIC CALENDAR & RED FOLDER SHIELD (กล่องแดง เหลือง เทา) */}
      {cal && (
        <div className="p-4 rounded-xl bg-gradient-to-r from-rose-950/20 via-surface-50 to-slate-900 border border-rose-500/30 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-rose-500/20 text-rose-300 border border-rose-500/40">
                <AlertOctagon className="w-4 h-4" />
              </div>
              <div>
                <h5 className="text-xs font-bold text-white flex items-center gap-2">
                  <span>Economic Calendar & News Shield</span>
                  <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${cal.badgeColor}`}>
                    {cal.badgeText}
                  </span>
                </h5>
                <p className="text-[10px] text-slate-400">วิเคราะห์ข่าวกล่องแดง 🔴 ส้ม 🟠 เหลือง 🟡 เทา ⚪ สั่งหยุดเทรดอัตโนมัติก่อน-หลังข่าว</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowPlaybookGuide(!showPlaybookGuide)}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-surface-100 hover:bg-slate-800 border border-slate-700 text-[10px] font-semibold text-amber-300 transition-all active:scale-95"
              >
                <BookOpen className="w-3 h-3 text-amber-400" />
                <span>คู่มือ 4 กล่องข่าว</span>
                {showPlaybookGuide ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </button>

              <span className={`px-2.5 py-1 rounded-lg border text-[11px] font-bold ${
                cal.tradeAllowed
                  ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                  : "bg-rose-500/20 text-rose-300 border-rose-500/40 animate-pulse"
              }`}>
                {cal.tradeAllowed ? "✅ ระบบอนุญาตให้เทรด" : "⛔ สั่งระงับการเทรด (FREEZE)"}
              </span>
            </div>
          </div>

          {/* Expandable 4-Box Playbook Guide */}
          {showPlaybookGuide && (
            <div className="p-3.5 rounded-xl bg-surface-100/95 border border-slate-700 space-y-2.5 text-xs">
              <h6 className="font-bold text-white text-[11px] flex items-center gap-1.5 border-b border-slate-800 pb-2">
                <BookOpen className="w-4 h-4 text-amber-400" />
                <span>📖 คู่มือการเทรดรับมือ 4 กล่องข่าวเศรษฐกิจ (ฉบับมือใหม่เข้าใจง่ายทันที)</span>
              </h6>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-[11px]">
                <div className="p-2.5 rounded-xl bg-rose-950/25 border border-rose-500/30 space-y-1">
                  <span className="font-bold text-rose-400 flex items-center gap-1">
                    <span>🟥</span> 1. กล่องสีแดง (High Impact) — อันตรายรุนแรงสูงสุด
                  </span>
                  <p className="text-slate-300 text-[11px] leading-relaxed">
                    <strong>ข่าวระดับโลก:</strong> เงินเฟ้อสหรัฐฯ (CPI), การจ้างงาน (NFP), แถลงดอกเบี้ยเฟด (Fed)
                  </p>
                  <p className="text-rose-200/90 text-[10px] leading-relaxed bg-rose-950/40 p-1.5 rounded border border-rose-500/20">
                    👉 <strong>สำหรับมือใหม่:</strong> กราฟสามารถสะบัดขึ้นลงแรงเป็นพันจุดในพริบตา ระบบจะล็อกเป็น <strong>WAIT</strong> อัตโนมัติ เพื่อไม่ให้คุณเผลอเปิดออเดอร์แล้วพอร์ตแตก ควรนั่งดูเฉยๆ รอให้ข่าวออกไปแล้ว 15 นาทีจนตลาดนิ่ง
                  </p>
                </div>

                <div className="p-2.5 rounded-xl bg-amber-950/25 border border-amber-500/30 space-y-1">
                  <span className="font-bold text-amber-400 flex items-center gap-1">
                    <span>🟧</span> 2. กล่องสีส้ม (Medium Impact) — ผันผวนปานกลาง
                  </span>
                  <p className="text-slate-300 text-[11px] leading-relaxed">
                    <strong>ข่าวตัวเลขทั่วไป:</strong> ดัชนีความเชื่อมั่นโรงงาน (PMI), ยอดค้าปลีก (Retail Sales)
                  </p>
                  <p className="text-amber-200/90 text-[10px] leading-relaxed bg-amber-950/40 p-1.5 rounded border border-amber-500/20">
                    👉 <strong>สำหรับมือใหม่:</strong> กราฟจะวิ่งไปตามทิศทางตัวเลขอย่างมีเหตุผล ไม่กระชากมั่วซั่ว สามารถเปิดออเดอร์ตามแนวโน้มเดิมได้สบายใจ แต่ต้องตั้งจุดยอมแพ้ (Stop Loss) ทุกครั้ง
                  </p>
                </div>

                <div className="p-2.5 rounded-xl bg-yellow-950/25 border border-yellow-500/30 space-y-1">
                  <span className="font-bold text-yellow-400 flex items-center gap-1">
                    <span>🟨</span> 3. กล่องสีเหลือง (Low Impact) — ผันผวนต่ำ (ปลอดภัยสุด)
                  </span>
                  <p className="text-slate-300 text-[11px] leading-relaxed">
                    <strong>ข่าวระดับย่อย:</strong> สถิติประจำวัน, รายงานการค้าทั่วไป
                  </p>
                  <p className="text-yellow-200/90 text-[10px] leading-relaxed bg-yellow-950/40 p-1.5 rounded border border-yellow-500/20">
                    👉 <strong>สำหรับมือใหม่:</strong> สวรรค์ของคนเทรด! กราฟจะเคารพแนวรับแนวต้านอย่างแม่นยำ เหมาะที่สุดสำหรับมือใหม่ในการฝึกเทรดและเก็บกำไรตามระบบ
                  </p>
                </div>

                <div className="p-2.5 rounded-xl bg-slate-800/60 border border-slate-700 space-y-1">
                  <span className="font-bold text-slate-300 flex items-center gap-1">
                    <span>⬜️</span> 4. กล่องสีเทา/ขาว (Bank Holiday) — วันหยุดตลาด
                  </span>
                  <p className="text-slate-400 text-[11px] leading-relaxed">
                    <strong>วันหยุดราชการ:</strong> ธนาคารใหญ่ในสหรัฐฯ หรือยุโรปปิดทำการ
                  </p>
                  <p className="text-slate-300 text-[10px] leading-relaxed bg-slate-800/80 p-1.5 rounded border border-slate-700">
                    👉 <strong>สำหรับมือใหม่:</strong> ไม่มีคนซื้อขาย วอลุ่มจะแห้งสนิท กราฟจะแทบไม่ขยับ และค่าธรรมเนียม (Spread) อาจถ่างกว้าง แนะนำให้ปิดหน้าจอพักผ่อน ถือเงินสดไว้สบายใจที่สุด
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Callout Notice */}
          <div className={`p-2.5 rounded-lg text-[11px] border leading-relaxed ${
            cal.tradeAllowed
              ? "bg-surface-100/80 border-slate-800 text-slate-300"
              : "bg-rose-950/40 border-rose-500/40 text-rose-200"
          }`}>
            <span className="font-semibold">{cal.tradeAllowed ? "🛡️ สถานะความปลอดภัย:" : "⚠️ ประกาศเตือนด่วน:"}</span> {cal.freezeReason}
          </div>

          {/* Upcoming Economic Events Today */}
          {cal.relevantEvents && cal.relevantEvents.length > 0 && (
            <div className="space-y-1.5 pt-1">
              <span className="text-[10px] font-semibold text-slate-400 block">ข่าวเศรษฐกิจวันนี้ที่มีผลต่อ {analysis.symbol}:</span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                {cal.relevantEvents.slice(0, 4).map((evt) => {
                  const getImpactBadge = (impact: string) => {
                    switch (impact) {
                      case "HIGH":
                        return { bg: "bg-rose-500/20 text-rose-400 border-rose-500/40", icon: "🔴", label: "กล่องแดง (High)" };
                      case "MEDIUM":
                        return { bg: "bg-amber-500/20 text-amber-400 border-amber-500/40", icon: "🟠", label: "กล่องส้ม (Med)" };
                      case "LOW":
                        return { bg: "bg-yellow-500/20 text-yellow-400 border-yellow-500/40", icon: "🟡", label: "กล่องเหลือง (Low)" };
                      default:
                        return { bg: "bg-slate-700 text-slate-300 border-slate-600", icon: "⚪", label: "วันหยุด (Holiday)" };
                    }
                  };
                  const badge = getImpactBadge(evt.impact);

                  return (
                    <div
                      key={evt.id}
                      className="p-2 rounded-lg bg-surface-100/70 border border-slate-800 text-[11px] flex items-center justify-between gap-2"
                    >
                      <div className="flex items-center gap-2 truncate">
                        <span className="text-[10px]">{badge.icon}</span>
                        <div className="truncate">
                          <span className="font-bold text-white block truncate">{evt.title}</span>
                          <span className="text-[10px] text-slate-400 font-mono">
                            เวลา {evt.timeStr} • {evt.currency}
                          </span>
                        </div>
                      </div>
                      <div className="text-right shrink-0 text-[10px] font-mono">
                        <span className="text-slate-400 block">Exp: {evt.forecast}</span>
                        <span className="text-slate-500 block">Prev: {evt.previous}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 3. ⏰ LIVE TRADING SESSION & GOLDEN HOURS RADAR */}
      {sess && (
        <div className="p-4 rounded-xl bg-gradient-to-r from-amber-950/20 via-surface-50 to-indigo-950/30 border border-amber-500/30 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/40">
                <Clock3 className="w-4 h-4 animate-spin" />
              </div>
              <div>
                <h5 className="text-xs font-bold text-white flex items-center gap-2">
                  <span>Live Trading Session Clock</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-surface-100 border border-slate-700 text-amber-300">
                    เวลาไทย (GMT+7): {sess.thaiTimeStr}
                  </span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${sess.sessionBadge.color}`}>
                    {sess.sessionBadge.text}
                  </span>
                </h5>
                <p className="text-[10px] text-slate-400">วิเคราะห์พฤติกรรมวอลุ่ม สเปรด และช่วงเวลาทำกำไรเฉพาะของ {analysis.symbol}</p>
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs font-mono">
              <span className={`px-2.5 py-1 rounded-lg border text-[11px] font-bold ${
                sess.spreadStatus === "TIGHT"
                  ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                  : sess.spreadStatus === "WIDE_DANGER"
                  ? "bg-rose-500/20 text-rose-300 border-rose-500/40 animate-pulse"
                  : "bg-surface-100 text-slate-300 border-slate-700"
              }`}>
                {sess.spreadStatus === "TIGHT" ? "🟢 สเปรดต่ำสุด (Optimal)" : sess.spreadStatus === "WIDE_DANGER" ? "🔴 ระวังสเปรดถ่าง (Danger)" : "⚪ สเปรดปกติ"}
              </span>
            </div>
          </div>

          {/* Active Global Sessions Pill List */}
          <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
            <span className="text-[10px] text-slate-400 font-semibold mr-1">ตลาดที่เปิดอยู่:</span>
            {["Sydney", "Tokyo", "London", "New York"].map((sName) => {
              const isOpen = sess.activeSessions.includes(sName);
              return (
                <div
                  key={sName}
                  className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border ${
                    isOpen
                      ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                      : "bg-surface-100/60 text-slate-500 border-slate-800"
                  }`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${isOpen ? "bg-emerald-400 animate-ping" : "bg-slate-600"}`}></span>
                  <span>{sName}</span>
                </div>
              );
            })}
          </div>

          {/* Tactical Advice Callout */}
          <div className="p-2.5 rounded-lg bg-surface-100/70 border border-slate-800 text-[11px] text-slate-200 flex items-start gap-2">
            <Timer className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <span className="leading-relaxed"><strong>คำแนะนำตามช่วงเวลา:</strong> {sess.assetSessionAdvice}</span>
          </div>
        </div>
      )}

      {/* 4. 🧠 LIVE MARKET REGIME & MOMENTUM RADAR */}
      {reg && (
        <div className="p-4 rounded-xl bg-surface-100 border border-slate-700/60 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-zinc-800 text-zinc-200 border border-zinc-700">
                <Radio className="w-4 h-4 animate-pulse" />
              </div>
              <div>
                <h5 className="text-xs font-bold text-white flex items-center gap-2">
                  <span>Dynamic Live Market Regime</span>
                  <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-full border tracking-wide uppercase ${reg.badgeColor}`}>
                    {reg.title}
                  </span>
                </h5>
                <p className="text-[10px] text-slate-400">{reg.description}</p>
              </div>
            </div>

            <div className="flex items-center gap-2 bg-surface-50 px-3 py-1.5 rounded-lg border border-slate-700 text-xs font-mono">
              <span className="text-slate-400 text-[11px]">เป้า Win Rate สภาวะนี้:</span>
              <strong className="text-emerald-400">{reg.targetedWinRate}</strong>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
            <div className="p-2 rounded-lg bg-surface-50/80 border border-slate-800">
              <span className="text-[10px] text-slate-400 block">ADX Strength</span>
              <span className={`text-xs font-mono font-bold ${reg.adxValue >= 24 ? "text-emerald-400" : "text-amber-400"}`}>
                {reg.adxValue} ({reg.adxValue >= 24 ? "Trending" : "Ranging"})
              </span>
            </div>

            <div className="p-2 rounded-lg bg-surface-50/80 border border-slate-800">
              <span className="text-[10px] text-slate-400 block">Bollinger Width</span>
              <span className="text-xs font-mono font-bold text-sky-400">
                {reg.bandwidthValue}%
              </span>
            </div>

            <div className="p-2 rounded-lg bg-surface-50/80 border border-slate-800">
              <span className="text-[10px] text-slate-400 block">Adaptive Ribbon</span>
              <span className="text-xs font-mono font-bold text-amber-300">
                EMA {reg.optimalParams.emaFast}/{reg.optimalParams.emaSlow}
              </span>
            </div>

            <div className="p-2 rounded-lg bg-surface-50/80 border border-slate-800">
              <span className="text-[10px] text-slate-400 block">Optimal R:R Ratio</span>
              <span className="text-xs font-mono font-bold text-emerald-300">
                1 : {reg.optimalParams.tpMultiplier.toFixed(1)}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* 5. 🏛️ 5-Pillar Master Confluence Suite */}
      {mc && (
        <div className="p-4 rounded-xl bg-surface-100 border border-slate-700/60 space-y-3.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-zinc-800 text-zinc-200 border border-zinc-700">
                <Gauge className="w-4 h-4" />
              </div>
              <div>
                <h5 className="text-xs font-bold text-white flex items-center gap-2">
                  <span>5-Pillar Institutional Confluence Suite</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    คะแนนรวม: {mc.totalScore} / 100
                  </span>
                </h5>
                <p className="text-[10px] text-slate-400">ผสาน 5 เสาหลักของการวิเคราะห์เทคนิคอลเพื่อความแม่นยำสูงสุด</p>
              </div>
            </div>

            <div className="text-xs font-bold px-3 py-1 rounded-lg bg-surface-50 border border-slate-700 text-zinc-200">
              {mc.verdict}
            </div>
          </div>

          {/* 5 Pillars Progress Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-5 gap-2.5">
            <div className="p-2.5 rounded-xl bg-surface-100/80 border border-slate-800 space-y-1.5">
              <div className="flex items-center justify-between text-[11px] font-bold text-slate-200">
                <span>1. Trend & Regime</span>
                <span className="font-mono text-indigo-400">{mc.pillars.trendRegime.score}/25</span>
              </div>
              <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full bg-indigo-400 rounded-full" style={{ width: `${(mc.pillars.trendRegime.score / 25) * 100}%` }}></div>
              </div>
              <p className="text-[10px] text-slate-400 leading-tight">{mc.pillars.trendRegime.status}</p>
            </div>

            <div className="p-2.5 rounded-xl bg-surface-100/80 border border-slate-800 space-y-1.5">
              <div className="flex items-center justify-between text-[11px] font-bold text-slate-200">
                <span>2. Momentum Cycles</span>
                <span className="font-mono text-cyan-400">{mc.pillars.momentumCycles.score}/20</span>
              </div>
              <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full bg-cyan-400 rounded-full" style={{ width: `${(mc.pillars.momentumCycles.score / 20) * 100}%` }}></div>
              </div>
              <p className="text-[10px] text-slate-400 leading-tight">{mc.pillars.momentumCycles.status}</p>
            </div>

            <div className="p-2.5 rounded-xl bg-surface-100/80 border border-slate-800 space-y-1.5">
              <div className="flex items-center justify-between text-[11px] font-bold text-slate-200">
                <span>3. Volatility Squeeze</span>
                <span className="font-mono text-amber-400">{mc.pillars.volatilitySqueeze.score}/20</span>
              </div>
              <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full bg-amber-400 rounded-full" style={{ width: `${(mc.pillars.volatilitySqueeze.score / 20) * 100}%` }}></div>
              </div>
              <p className="text-[10px] text-slate-400 leading-tight">{mc.pillars.volatilitySqueeze.status}</p>
            </div>

            <div className="p-2.5 rounded-xl bg-surface-100/80 border border-slate-800 space-y-1.5">
              <div className="flex items-center justify-between text-[11px] font-bold text-slate-200">
                <span>4. Active Sessions</span>
                <span className="font-mono text-emerald-400">{mc.pillars.volumeFlow.score}/15</span>
              </div>
              <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-400 rounded-full" style={{ width: `${(mc.pillars.volumeFlow.score / 15) * 100}%` }}></div>
              </div>
              <p className="text-[10px] text-slate-400 leading-tight">{mc.pillars.volumeFlow.status}</p>
            </div>

            <div className="p-2.5 rounded-xl bg-surface-100/80 border border-slate-800 space-y-1.5">
              <div className="flex items-center justify-between text-[11px] font-bold text-slate-200">
                <span>5. Smart Money FVG</span>
                <span className="font-mono text-purple-400">{mc.pillars.smartMoneyStructure.score}/20</span>
              </div>
              <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full bg-purple-400 rounded-full" style={{ width: `${(mc.pillars.smartMoneyStructure.score / 20) * 100}%` }}></div>
              </div>
              <p className="text-[10px] text-slate-400 leading-tight">{mc.pillars.smartMoneyStructure.status}</p>
            </div>
          </div>
        </div>
      )}

      {/* 5b. 🧭 Dynamic Multi-Timeframe Alignment Matrix [แผน 3] */}
      {analysis.timeframeMatrix && (
        <div className="p-3.5 rounded-xl bg-surface-100/90 border border-slate-700/60 space-y-2.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-zinc-800 text-zinc-200 border border-zinc-700">
                <Compass className="w-4 h-4 text-cyan-400" />
              </div>
              <div>
                <h5 className="text-xs font-bold text-white flex items-center gap-2">
                  <span>Dynamic MTF Alignment Matrix (แผน 3)</span>
                  {analysis.timeframeMatrix.alignmentScore !== undefined && (
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                        analysis.timeframeMatrix.alignmentScore >= 40
                          ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
                          : analysis.timeframeMatrix.alignmentScore <= -40
                          ? "bg-rose-500/20 text-rose-300 border-rose-500/30"
                          : "bg-amber-500/20 text-amber-300 border-amber-500/30"
                      }`}
                    >
                      คะแนนความสอดคล้อง: {analysis.timeframeMatrix.alignmentScore > 0 ? `+${analysis.timeframeMatrix.alignmentScore}` : analysis.timeframeMatrix.alignmentScore}%
                    </span>
                  )}
                </h5>
                <p className="text-[10px] text-slate-400">
                  ถ่วงน้ำหนักตามสินทรัพย์ ({analysis.timeframeMatrix.assetCategory?.toUpperCase() || "ASSET"} Adaptive Weights) • {analysis.timeframeMatrix.summary || "สแกนทิศทางหลายช่วงเวลา"}
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-2">
            {[
              { tf: "15M", val: analysis.timeframeMatrix.m15, label: "Intraday Flow" },
              { tf: "1H", val: analysis.timeframeMatrix.h1, label: "Hourly Trend" },
              { tf: "4H", val: analysis.timeframeMatrix.h4, label: "Macro Swing" },
              { tf: "1D", val: analysis.timeframeMatrix.d1, label: "Daily Cycle" },
            ].map((item) => {
              const isBull = item.val === "BULLISH";
              const isBear = item.val === "BEARISH";
              return (
                <div
                  key={item.tf}
                  className={`p-2 rounded-lg border flex flex-col items-center justify-center text-center transition-all ${
                    isBull
                      ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
                      : isBear
                      ? "bg-rose-500/10 border-rose-500/30 text-rose-300"
                      : "bg-surface-50 border-slate-800 text-slate-400"
                  }`}
                >
                  <span className="text-[10px] font-mono font-bold text-slate-400">{item.tf}</span>
                  <span className="text-xs font-black tracking-tight my-0.5">
                    {isBull ? "BULLISH ▲" : isBear ? "BEARISH ▼" : "NEUTRAL ─"}
                  </span>
                  <span className="text-[9px] text-slate-400">{item.label}</span>
                </div>
              );
            })}
          </div>

          {/* [แผน 8] Quad-EMA 200 Confluence Badge */}
          {analysis.timeframeMatrix.quadEma && analysis.timeframeMatrix.quadEma.status !== "MIXED" && (
            <div className={`p-2.5 rounded-lg text-xs font-bold flex items-center justify-between border ${
              analysis.timeframeMatrix.quadEma.status === "GOLDEN_STACK"
                ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-300"
                : "bg-rose-500/15 border-rose-500/40 text-rose-300"
            }`}>
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4" />
                <span>
                  {analysis.timeframeMatrix.quadEma.status === "GOLDEN_STACK"
                    ? "🔥 QUAD-EMA 200 GOLDEN STACK: ราคายืนเหนือ EMA 200 ครบทั้ง 4 ไทม์เฟรม (แรงซื้อสถาบันครบทุกมิติ)"
                    : "🛑 QUAD-EMA 200 DEATH STACK: ราคาอยู่ใต้ EMA 200 ครบทั้ง 4 ไทม์เฟรม (แรงขายคุมทุกมิติ ห้ามสวนเทรนด์)"}
                </span>
              </div>
              <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-black/40 border border-slate-700">
                {analysis.timeframeMatrix.quadEma.status === "GOLDEN_STACK" ? "+10 Confluence" : "-10 Penalty"}
              </span>
            </div>
          )}

          {/* [แผน 9] Session Open Range Breakout (ORB) */}
          {analysis.sessionStatus?.orb && (
            <div className={`p-2.5 rounded-lg text-xs font-bold flex items-center justify-between border ${
              analysis.sessionStatus.orb.status === "BREAKOUT_BULL"
                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
                : analysis.sessionStatus.orb.status === "BREAKOUT_BEAR"
                ? "bg-rose-500/10 border-rose-500/30 text-rose-300"
                : "bg-surface-50 border-slate-800 text-slate-400"
            }`}>
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-amber-400" />
                <span>
                  30-Min Opening Range ({analysis.sessionStatus.orb.session}):{" "}
                  {analysis.sessionStatus.orb.status === "BREAKOUT_BULL"
                    ? `เบรกทะลุกรอบบน (${analysis.sessionStatus.orb.high}) ยืนยันทิศทางขึ้น ▲`
                    : analysis.sessionStatus.orb.status === "BREAKOUT_BEAR"
                    ? `เบรกหลุดกรอบล่าง (${analysis.sessionStatus.orb.low}) ยืนยันทิศทางลง ▼`
                    : `กำลังสะสมในกรอบ (${analysis.sessionStatus.orb.low} - ${analysis.sessionStatus.orb.high})`}
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 6. 📱 MT4 / MT5 Mobile Pending Order Ticket */}
      <div className="p-4 rounded-xl bg-gradient-to-br from-slate-900 via-surface-50 to-indigo-950/20 border border-blue-500/40 space-y-3.5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-blue-500/20 text-blue-400 border border-blue-500/30">
              <Smartphone className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-white flex items-center gap-2">
                <span>MT4 / MT5 Mobile Pending Order Ticket</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-500/10 text-blue-300 border border-blue-500/20">
                  สำหรับกดตั้งค่าบนมือถือ
                </span>
              </h4>
              <p className="text-[10px] text-slate-400">คำนวณราคารับล่วงหน้า (Limit Order) และระยะ SL/TP พร้อมเปิดแอปกรอกตามได้ทันที</p>
            </div>
          </div>

          {/* Order Type Badge */}
          <div className="flex items-center gap-2">
            <span className={`px-3 py-1 rounded-lg border text-xs font-black tracking-wide ${
              analysis.tradeSetup.orderType === "BUY_LIMIT"
                ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40 glow-green"
                : analysis.tradeSetup.orderType === "SELL_LIMIT"
                ? "bg-rose-500/20 text-rose-300 border-rose-500/40 glow-red"
                : analysis.tradeSetup.orderType === "BUY_STOP"
                ? "bg-sky-500/20 text-sky-300 border-sky-500/40"
                : analysis.tradeSetup.orderType === "SELL_STOP"
                ? "bg-amber-500/20 text-amber-300 border-amber-500/40"
                : "bg-surface-100 text-slate-400 border-slate-700"
            }`}>
              {analysis.tradeSetup.orderType === "BUY_LIMIT"
                ? "🟢 BUY LIMIT (ตั้งรับซื้อของถูกล่วงหน้า)"
                : analysis.tradeSetup.orderType === "SELL_LIMIT"
                ? "🔴 SELL LIMIT (ตั้งรอขายราคาสูงล่วงหน้า)"
                : analysis.tradeSetup.orderType === "BUY_STOP"
                ? "🚀 BUY STOP (ดักซื้อเมื่อราคาพุ่งทะลุ)"
                : analysis.tradeSetup.orderType === "SELL_STOP"
                ? "🔻 SELL STOP (ดักขายเมื่อราคาหลุดร่วง)"
                : "⚪ พักดูจังหวะ (ตลาดยังไม่ให้แต้มต่อ)"}
            </span>

            <span className="text-[11px] text-slate-400 font-mono">
              ความคุ้มค่า (R:R): <strong className="text-brand-green">{analysis.tradeSetup.riskRewardRatio}</strong>
            </span>
          </div>
        </div>

        {/* 4 Main MT4/MT5 Mobile Input Fields */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {/* 1. Price */}
          <div
            onClick={() => copyToClipboard(`${analysis.tradeSetup.pendingPrice || analysis.tradeSetup.entryZone.min}`, "price")}
            className="p-3 rounded-xl bg-surface-100/90 hover:bg-slate-800 border border-slate-700 hover:border-blue-500/50 cursor-pointer transition-all group relative"
          >
            <div className="flex items-center justify-between text-[11px] text-slate-400 mb-0.5">
              <span className="font-semibold text-white">1. ราคาตั้งเปิด (Price)</span>
              {copiedKey === "price" ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 text-slate-400" />}
            </div>
            <span className="text-sm font-mono font-black text-amber-300 block">
              {analysis.tradeSetup.pendingPrice || analysis.tradeSetup.entryZone.min}
            </span>
            <span className="text-[10px] text-slate-400 font-sans block truncate">
              แตะเพื่อคัดลอก • รอซื้อที่แนวรับ
            </span>
          </div>

          {/* 2. Stop Loss */}
          <div
            onClick={() => copyToClipboard(`${analysis.tradeSetup.stopLoss}`, "sl")}
            className="p-3 rounded-xl bg-surface-100/90 hover:bg-slate-800 border border-slate-700 hover:border-rose-500/50 cursor-pointer transition-all group relative"
          >
            <div className="flex items-center justify-between text-[11px] text-rose-400 mb-0.5">
              <span className="font-semibold text-rose-300">2. จุดยอมแพ้ (Stop Loss)</span>
              {copiedKey === "sl" ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 text-slate-400" />}
            </div>
            <span className="text-sm font-mono font-black text-rose-300 block">
              {analysis.tradeSetup.stopLoss}
            </span>
            <span className="text-[10px] font-sans text-rose-300/80 block">
              {analysis.tradeSetup.slPips ? `-${analysis.tradeSetup.slPips} pips (ตัดขาดทุนอัตโนมัติ)` : "ซ่อนหลัง Swing"}
            </span>
          </div>

          {/* 3. Take Profit 1 */}
          <div
            onClick={() => copyToClipboard(`${analysis.tradeSetup.takeProfit1}`, "tp1")}
            className="p-3 rounded-xl bg-surface-100/90 hover:bg-slate-800 border border-slate-700 hover:border-emerald-500/50 cursor-pointer transition-all group relative"
          >
            <div className="flex items-center justify-between text-[11px] text-emerald-400 mb-0.5">
              <span className="font-semibold text-emerald-300">3. กำไรเป้าแรก (TP1)</span>
              {copiedKey === "tp1" ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 text-slate-400" />}
            </div>
            <span className="text-sm font-mono font-black text-emerald-300 block">
              {analysis.tradeSetup.takeProfit1}
            </span>
            <span className="text-[10px] font-sans text-emerald-300/80 block">
              +{analysis.tradeSetup.tp1Pips || 0} pips (ปิดครึ่ง + เลื่อนบังทุน)
            </span>
          </div>

          {/* 4. Take Profit 2 */}
          <div
            onClick={() => copyToClipboard(`${analysis.tradeSetup.takeProfit2}`, "tp2")}
            className="p-3 rounded-xl bg-surface-100/90 hover:bg-slate-800 border border-slate-700 hover:border-emerald-500/50 cursor-pointer transition-all group relative"
          >
            <div className="flex items-center justify-between text-[11px] text-emerald-400 mb-0.5">
              <span className="font-semibold text-emerald-300">4. กำไรเป้าใหญ่ (TP2)</span>
              {copiedKey === "tp2" ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 text-slate-400" />}
            </div>
            <span className="text-sm font-mono font-black text-emerald-300 block">
              {analysis.tradeSetup.takeProfit2}
            </span>
            <span className="text-[10px] font-sans text-emerald-300/80 block">
              +{analysis.tradeSetup.tp2Pips || 0} pips (ปล่อยรันเทรนด์)
            </span>
          </div>
        </div>

        {/* Micro-Account Interactive Lot & Risk Calculator (เริ่มต้นตั้งแต่ $10 USD) */}
        {(() => {
          const balance = Math.max(1, Number(customBalance) || 10);
          const slPipsVal = Math.max(10, analysis.tradeSetup.slPips || 50);
          const tp1PipsVal = Math.max(10, analysis.tradeSetup.tp1Pips || 50);
          const tp2PipsVal = Math.max(10, analysis.tradeSetup.tp2Pips || 100);

          // Asset-aware pip value per 0.01 lot standard
          const sym = analysis.symbol.toUpperCase();
          const isCrypto = sym.endsWith("USDT") || ["BTC", "ETH", "SOL", "BNB"].some(c => sym.startsWith(c));
          const isJPY = sym.includes("JPY");
          const pipDollarPer001 = isCrypto ? 0.01 : isJPY ? 0.07 : 0.10;

          // Standard Account Calculation (0.01 lot min)
          const stdCalculatedLot = Math.max(0.01, Number(((balance * (customRiskPct / 100)) / (slPipsVal * (pipDollarPer001 * 10))).toFixed(2)));
          const stdLot = balance < 100 ? 0.01 : stdCalculatedLot;
          const stdLossUSD = Number((stdLot * slPipsVal * pipDollarPer001).toFixed(2));
          const stdTp1USD = Number((stdLot * tp1PipsVal * pipDollarPer001).toFixed(2));
          const stdTp2USD = Number((stdLot * tp2PipsVal * pipDollarPer001).toFixed(2));
          const stdRiskPctActual = ((stdLossUSD / balance) * 100).toFixed(1);

          // Cent Account Calculation (USC - 100x smaller, ideal for $10-$50)
          const centBalanceUSC = balance * 100;
          const centLot = Math.max(0.01, Number(((centBalanceUSC * (customRiskPct / 100)) / (slPipsVal * (pipDollarPer001 * 10))).toFixed(2)));
          const centLossUSD = Number((centLot * slPipsVal * (pipDollarPer001 * 0.01)).toFixed(2));
          const centTp1USD = Number((centLot * tp1PipsVal * (pipDollarPer001 * 0.01)).toFixed(2));
          const centTp2USD = Number((centLot * tp2PipsVal * (pipDollarPer001 * 0.01)).toFixed(2));

          const isCent = accountType === "CENT";
          const activeLot = isCent ? centLot : stdLot;
          const activeLossUSD = isCent ? centLossUSD : stdLossUSD;
          const activeTp1USD = isCent ? centTp1USD : stdTp1USD;
          const activeTp2USD = isCent ? centTp2USD : stdTp2USD;
          const activeRiskPct = isCent ? customRiskPct.toFixed(1) : stdRiskPctActual;

          return (
            <div className="p-3.5 rounded-xl bg-surface-100/80 border border-slate-800 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-2.5">
                <div className="flex items-center gap-2">
                  <div className="p-1 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                    <Calculator className="w-4 h-4" />
                  </div>
                  <div>
                    <h5 className="text-xs font-bold text-white flex items-center gap-1.5">
                      <span>คำนวณขนาดไม้ & ความเสี่ยงเงินจริง (เริ่ม $10 USD)</span>
                      <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        สำหรับ MT4 / MT5
                      </span>
                    </h5>
                    <p className="text-[10px] text-slate-400">คำนวณกำไร/ขาดทุนเป็นดอลลาร์จริง ละเอียดยิบตามเงินทุนในพอร์ต</p>
                  </div>
                </div>

                {/* Account Type Toggle */}
                <div className="flex items-center gap-1 bg-surface-50 p-1 rounded-lg border border-slate-800 text-[10px]">
                  <button
                    onClick={() => setAccountType("STANDARD")}
                    className={`px-2 py-0.5 rounded font-medium transition-all ${
                      accountType === "STANDARD" ? "bg-blue-600 text-white shadow-sm" : "text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    💵 Standard ($)
                  </button>
                  <button
                    onClick={() => setAccountType("CENT")}
                    className={`px-2 py-0.5 rounded font-medium transition-all ${
                      accountType === "CENT" ? "bg-amber-600 text-white shadow-sm" : "text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    🪙 Cent (USC พอร์ตเล็ก)
                  </button>
                </div>
              </div>

              {/* Controls: Balance Input & Risk Selector */}
              <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
                {/* Balance Selector */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[11px] text-slate-400 font-semibold">เงินทุนพอร์ต:</span>
                  {[10, 20, 50, 100, 500, 1000].map((bVal) => (
                    <button
                      key={bVal}
                      onClick={() => setCustomBalance(bVal)}
                      className={`px-2 py-0.5 rounded text-[11px] font-mono transition-all border ${
                        customBalance === bVal
                          ? "bg-indigo-600 text-white border-indigo-500 shadow-sm"
                          : "bg-surface-50 text-slate-400 border-slate-800 hover:text-white"
                      }`}
                    >
                      ${bVal}
                    </button>
                  ))}
                  <div className="flex items-center gap-1 bg-surface-50 px-2 py-0.5 rounded border border-slate-800">
                    <span className="text-[10px] text-slate-500">$</span>
                    <input
                      type="number"
                      min={1}
                      max={100000}
                      value={customBalance}
                      onChange={(e) => setCustomBalance(Math.max(1, Number(e.target.value)))}
                      className="w-14 bg-transparent text-[11px] font-mono font-bold text-white focus:outline-none"
                    />
                  </div>
                </div>

                {/* Risk Selector */}
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] text-slate-400 font-semibold">ยอมเสี่ยง:</span>
                  {[1, 2, 5, 10].map((rVal) => (
                    <button
                      key={rVal}
                      onClick={() => setCustomRiskPct(rVal)}
                      className={`px-1.5 py-0.5 rounded text-[10px] font-mono transition-all border ${
                        customRiskPct === rVal
                          ? "bg-rose-500/20 text-rose-300 border-rose-500/40 font-bold"
                          : "bg-surface-50 text-slate-400 border-slate-800 hover:text-white"
                      }`}
                    >
                      {rVal}%
                    </button>
                  ))}
                </div>
              </div>

              {/* Detailed Real-Dollar Calculation Breakdown */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                {/* 1. Recommended Lot */}
                <div className="p-2 rounded-lg bg-surface-50 border border-slate-800 space-y-0.5">
                  <span className="text-[10px] text-slate-400 block">ขนาดไม้แนะนำ (Lot)</span>
                  <span className="text-sm font-mono font-black text-amber-300 block">
                    {activeLot} {isCent ? "Cent" : "Lot"}
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono block truncate">
                    {isCent ? `(${balance * 100} Cents)` : `(Min 0.01)`}
                  </span>
                </div>

                {/* 2. Loss at SL */}
                <div className="p-2 rounded-lg bg-rose-950/20 border border-rose-500/30 space-y-0.5">
                  <span className="text-[10px] text-rose-400 block">ถ้าชน SL เสียเงิน</span>
                  <span className="text-sm font-mono font-black text-rose-300 block">
                    -${activeLossUSD} USD
                  </span>
                  <span className="text-[10px] text-rose-400/80 font-mono block">
                    เสี่ยง {activeRiskPct}% ของพอร์ต
                  </span>
                </div>

                {/* 3. Profit at TP1 */}
                <div className="p-2 rounded-lg bg-emerald-950/20 border border-emerald-500/30 space-y-0.5">
                  <span className="text-[10px] text-emerald-400 block">ถ้าชน TP1 ได้เงิน</span>
                  <span className="text-sm font-mono font-black text-emerald-300 block">
                    +${activeTp1USD} USD
                  </span>
                  <span className="text-[10px] text-emerald-400/80 font-mono block">
                    กำไร +{((activeTp1USD / balance) * 100).toFixed(1)}%
                  </span>
                </div>

                {/* 4. Profit at TP2 */}
                <div className="p-2 rounded-lg bg-emerald-950/20 border border-emerald-500/30 space-y-0.5">
                  <span className="text-[10px] text-emerald-400 block">ถ้าชน TP2 ได้เงิน</span>
                  <span className="text-sm font-mono font-black text-emerald-300 block">
                    +${activeTp2USD} USD
                  </span>
                  <span className="text-[10px] text-emerald-400/80 font-mono block">
                    กำไร +{((activeTp2USD / balance) * 100).toFixed(1)}%
                  </span>
                </div>
              </div>

              {/* Micro-account Advice for Beginners */}
              <div className="p-3 rounded-xl bg-indigo-950/30 border border-indigo-500/30 text-[11px] text-slate-300 space-y-1.5 leading-relaxed">
                <span className="font-bold text-amber-300 flex items-center gap-1.5">
                  <span>💡</span> คำแนะนำสำหรับมือใหม่ที่เพิ่งเริ่มต้นเทรด:
                </span>
                <p className="text-[10px] text-slate-300">
                  • <strong>พอร์ตขนาดเล็ก ($10 – $50):</strong> แนะนำให้ใช้ <strong>บัญชี Cent (USC)</strong> เพราะเงิน $10 จะกลายเป็น 1,000 Cents ทำให้คุณสามารถเปิดไม้ขนาดเล็กและคุมความเสี่ยงให้เสียไม่เกินไม้ละ <strong>${centLossUSD} USD (ประมาณ {Math.max(1, Math.round(centLossUSD * 36))} บาท)</strong> ช่วยให้ฝึกเทรดได้สบายใจ พอร์ตไม่มีวันแตก
                </p>
                <p className="text-[10px] text-slate-300">
                  • <strong>พอร์ตเติบโต ($100 ขึ้นไป):</strong> สามารถเลือกใช้ <strong>บัญชี Standard ($)</strong> ได้ตามปกติ โดยตั้งขนาดไม้เริ่มต้นที่ 0.01 Lot
                </p>
              </div>
            </div>
          );
        })()}

        {/* Invalidation Rule */}
        <div className="p-2 rounded-lg bg-surface-100/40 border border-slate-800/80 text-[11px] text-slate-400 flex items-start gap-1.5">
          <Info className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
          <span><strong>เงื่อนไขยกเลิกออเดอร์:</strong> {analysis.tradeSetup.invalidationNote}</span>
        </div>
      </div>
    </div>
  );
}