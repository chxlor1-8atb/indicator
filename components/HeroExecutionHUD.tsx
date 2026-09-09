"use client";

import React from "react";
import { AnalysisResult } from "@/lib/types";
import {
  Smartphone,
  Copy,
  Check,
  ShieldCheck,
  Sliders,
  AlertTriangle,
  Calculator,
  Info,
  Zap,
  Clock,
  AlertOctagon,
  Layers,
  Lock,
} from "lucide-react";

interface HeroExecutionHUDProps {
  analysis: AnalysisResult;
  copiedKey: string | null;
  onCopy: (text: string, key: string) => void;
  customBalance: number;
  setCustomBalance: (val: number) => void;
  customRiskPct: number;
  setCustomRiskPct: (val: number) => void;
  accountType: "STANDARD" | "CENT";
  setAccountType: (type: "STANDARD" | "CENT") => void;
}

export default function HeroExecutionHUD({
  analysis,
  copiedKey,
  onCopy,
  customBalance,
  setCustomBalance,
  customRiskPct,
  setCustomRiskPct,
  accountType,
  setAccountType,
}: HeroExecutionHUDProps) {
  const ts = analysis.tradeSetup || {
    orderType: "WAIT_NO_ORDER",
    entryZone: { min: 0, max: 0 },
    stopLoss: 0,
    takeProfit1: 0,
    takeProfit2: 0,
    riskRewardRatio: "1:2.0",
  };
  const cal = analysis.calendarSafety;
  const orch = analysis.orchestrator;
  const entryPrice = ts.pendingPrice || (ts.entryZone ? (ts.entryZone.min + ts.entryZone.max) / 2 : 0);
  const currentPrice = analysis.volumeProfile?.poc || entryPrice;
  const sym = analysis.symbol ? analysis.symbol.toUpperCase() : "";
  const isGold = sym.includes("XAU") || sym.includes("GOLD");
  const pipMultiplier = isGold ? 10 : sym.includes("JPY") ? 100 : 10000;
  const distancePips = Math.abs(Number((entryPrice - currentPrice) * pipMultiplier)).toFixed(1);

  // Trigger Status Analysis
  const isFreeze = Boolean(cal && !cal.tradeAllowed);
  const isVeto = Boolean(orch?.vetoTriggered);
  const hasBuySignal = (ts.orderType?.includes("BUY") || analysis.signal?.includes("BUY")) && !isFreeze;
  const hasSellSignal = (ts.orderType?.includes("SELL") || analysis.signal?.includes("SELL")) && !isFreeze;
  const isActionable = hasBuySignal || hasSellSignal;

  const isExecutionLocked = isFreeze || !isActionable;
  const isBuy = hasBuySignal;
  const isSell = hasSellSignal;
  const isLimit = isActionable && (ts.orderType?.includes("LIMIT") || ts.orderType === "BUY_LIMIT" || ts.orderType === "SELL_LIMIT");
  const isWait = !isActionable;

  // Determine Trigger Text & Alert Style
  let triggerTitle = "จังหวะการเข้าเทรด";
  let triggerMessage = "";
  let triggerStatusIcon = <Clock className="w-5 h-5 text-amber-400 shrink-0" />;

  if (isFreeze) {
    triggerTitle = "⛔ สั่งระงับการเข้าเทรดด่วน (Calendar News Shield)";
    triggerMessage = `ตลาดกำลังเผชิญข่าวกล่องแดง/ส้ม (${cal?.freezeReason || "ความเสี่ยงผันผวนรุนแรง"}) ห้ามเปิดสถานะเด็ดขาดจนกว่าตลาดจะนิ่ง`;
    triggerStatusIcon = <AlertOctagon className="w-5 h-5 text-rose-400 shrink-0" />;
  } else if (isBuy) {
    triggerTitle = isLimit
      ? "⏳ จังหวะเข้า: ตั้งคำสั่ง BUY LIMIT รอราคาเกี่ยวที่แนวรับ"
      : "⚡ จังหวะเข้า: สัญญาณพร้อมเปิด BUY ทันที";
    triggerMessage = `วิเคราะห์ผ่านเกณฑ์ 5 เสาหลัก (${analysis.fiveCorePillars?.passedPillarsCount ?? 3}/5) • ราคาเข้าเป้าหมาย ${entryPrice} (ห่างประมาณ ${distancePips} pips) • เป้า TP1 ${ts.takeProfit1} (+${ts.tp1Pips || 0} pips)`;
    triggerStatusIcon = isLimit ? <Clock className="w-5 h-5 text-emerald-400 shrink-0" /> : <Zap className="w-5 h-5 text-emerald-400 shrink-0 animate-bounce" />;
  } else if (isSell) {
    triggerTitle = isLimit
      ? "⏳ จังหวะเข้า: ตั้งคำสั่ง SELL LIMIT รอราคาเกี่ยวที่แนวต้าน"
      : "⚡ จังหวะเข้า: สัญญาณพร้อมเปิด SELL ทันที";
    triggerMessage = `วิเคราะห์ผ่านเกณฑ์ 5 เสาหลัก (${analysis.fiveCorePillars?.passedPillarsCount ?? 3}/5) • ราคาเข้าเป้าหมาย ${entryPrice} (ห่างประมาณ ${distancePips} pips) • เป้า TP1 ${ts.takeProfit1} (+${ts.tp1Pips || 0} pips)`;
    triggerStatusIcon = isLimit ? <Clock className="w-5 h-5 text-rose-400 shrink-0" /> : <Zap className="w-5 h-5 text-rose-400 shrink-0 animate-bounce" />;
  } else {
    triggerTitle = "⚪ สถานะ: พักดูจังหวะ (ตลาดยังไม่ให้แต้มต่อ)";
    triggerMessage = "ยังไม่มีความได้เปรียบทางสถิติที่ชัดเจน นั่งทับมือรอการย่อตัวหรือการเบรกเอาท์ที่สมบูรณ์";
    triggerStatusIcon = <Clock className="w-5 h-5 text-slate-400 shrink-0" />;
  }

  // Lot Calculator Variables
  const balance = Math.max(1, Number(customBalance) || 10);
  const slPipsVal = Math.max(10, ts.slPips || 50);
  const tp1PipsVal = Math.max(10, ts.tp1Pips || 50);
  const tp2PipsVal = Math.max(10, ts.tp2Pips || 100);

  const isCrypto = sym.endsWith("USDT") || ["BTC", "ETH", "SOL", "BNB"].some(c => sym.startsWith(c));
  const isJPY = sym.includes("JPY");
  const pipDollarPer001 = isCrypto ? 0.01 : isJPY ? 0.07 : 0.10;

  const stdCalculatedLot = Math.max(0.01, Number(((balance * (customRiskPct / 100)) / (slPipsVal * (pipDollarPer001 * 10))).toFixed(2)));
  const stdLot = balance < 100 ? 0.01 : stdCalculatedLot;
  const stdLossUSD = Number((stdLot * slPipsVal * pipDollarPer001).toFixed(2));
  const stdTp1USD = Number((stdLot * tp1PipsVal * pipDollarPer001).toFixed(2));
  const stdTp2USD = Number((stdLot * tp2PipsVal * pipDollarPer001).toFixed(2));
  const stdRiskPctActual = ((stdLossUSD / balance) * 100).toFixed(1);

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
    <div className="rounded-2xl border-2 border-indigo-500/50 bg-gradient-to-b from-slate-900 via-surface-100 to-surface-50 p-4 sm:p-5 shadow-2xl space-y-4 relative overflow-hidden">
      {/* Glow Ambient Top Bar */}
      <div className={`absolute top-0 left-0 right-0 h-1.5 ${
        isBuy ? "bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-500" :
        isSell ? "bg-gradient-to-r from-rose-500 via-red-500 to-amber-500" :
        "bg-gradient-to-r from-amber-500 via-yellow-400 to-slate-500"
      }`} />

      {/* ─── 1. HERO HEADER: Order Type & R:R Ratio ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-3.5">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 shadow-inner">
            <Smartphone className="w-5 h-5 text-indigo-400" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-mono font-bold tracking-wider text-indigo-300 uppercase">
                Institutional Trade Ticket
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-indigo-500/15 text-indigo-200 border border-indigo-500/30">
                AI Signal Alert • Telegram Ready
              </span>
              {analysis.timestamp && (
                <span
                  className="hidden sm:inline-flex items-center gap-1 text-[10.5px] font-mono text-slate-300 px-2 py-0.5 rounded-full bg-surface-50 border border-slate-800"
                  title="เวลาที่ AI สร้างแผนนี้"
                >
                  <Clock className="w-3 h-3 text-slate-400" />
                  <span>วิเคราะห์ล่าสุด: {new Date(analysis.timestamp).toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}</span>
                </span>
              )}
            </div>
            <h3 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
              <span>{analysis.symbol}</span>
              <span className="text-xs text-slate-400 font-mono font-normal">({analysis.timeframe.toUpperCase()})</span>
            </h3>
          </div>
        </div>

        {/* Order Type & RR Badges */}
        <div className="flex flex-wrap items-center gap-2">
          <span className={`px-3.5 py-1.5 rounded-xl border text-xs sm:text-sm font-black tracking-wide shadow-md ${
            isFreeze || isVeto
              ? "bg-rose-500/20 text-rose-300 border-rose-500/50"
              : isWait
              ? "bg-surface-50 text-slate-400 border-slate-700"
              : ts.orderType === "BUY_LIMIT"
              ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/50 glow-green"
              : ts.orderType === "SELL_LIMIT"
              ? "bg-rose-500/20 text-rose-300 border-rose-500/50 glow-red"
              : ts.orderType === "MARKET_EXECUTION"
              ? (isBuy ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/50 glow-green" : "bg-rose-500/20 text-rose-300 border-rose-500/50 glow-red")
              : ts.orderType === "BUY_STOP"
              ? "bg-sky-500/20 text-sky-300 border-sky-500/50"
              : ts.orderType === "SELL_STOP"
              ? "bg-amber-500/20 text-amber-300 border-amber-500/50"
              : "bg-surface-50 text-slate-400 border-slate-700"
          }`}>
            {isFreeze
              ? "⛔ ระงับคำสั่ง (NEWS FREEZE)"
              : isVeto
              ? "⛔ ระงับคำสั่ง (VETO LOCKED)"
              : isWait
              ? "⚪ พักดูจังหวะ (WAIT - ไม่เปิดออเดอร์)"
              : ts.orderType === "BUY_LIMIT"
              ? "🟢 BUY LIMIT (ตั้งรับซื้อโซน OTE)"
              : ts.orderType === "SELL_LIMIT"
              ? "🔴 SELL LIMIT (ตั้งรอขายโซน OTE)"
              : ts.orderType === "MARKET_EXECUTION"
              ? (isBuy ? "⚡ MARKET BUY (เข้าทันทีที่ราคาตลาด)" : "⚡ MARKET SELL (เข้าทันทีที่ราคาตลาด)")
              : ts.orderType === "BUY_STOP"
              ? "🚀 BUY STOP (ดักซื้อเมื่อทะลุ)"
              : ts.orderType === "SELL_STOP"
              ? "🔻 SELL STOP (ดักขายเมื่อหลุด)"
              : "⚪ พักดูจังหวะ (WAIT)"}
          </span>

          <span className="px-3 py-1.5 rounded-xl bg-surface-50 border border-slate-700 text-xs font-mono font-bold text-slate-300">
            R:R <strong className="text-emerald-400 text-sm">{ts.riskRewardRatio}</strong>
          </span>
        </div>
      </div>

      {/* ─── 2. PROMINENT ENTRY TRIGGER CALLOUT (กล่องจังหวะเข้าออเดอร์ชัดเจนสุดๆ) ─── */}
      <div className={`p-3.5 rounded-xl border flex items-start gap-3 transition-all ${
        isFreeze ? "bg-rose-950/40 border-rose-500/60 text-rose-100" :
        isVeto ? "bg-amber-950/30 border-amber-500/50 text-amber-100" :
        isBuy ? "bg-emerald-950/30 border-emerald-500/50 text-emerald-100" :
        isSell ? "bg-rose-950/30 border-rose-500/50 text-rose-100" :
        "bg-slate-800/40 border-slate-700 text-slate-200"
      }`}>
        <div className="p-1 rounded-lg bg-surface-100/80 border border-white/10 shrink-0">
          {triggerStatusIcon}
        </div>
        <div className="space-y-1 w-full">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h4 className="text-xs sm:text-sm font-black tracking-wide flex items-center gap-2">
              <span>{triggerTitle}</span>
            </h4>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-black/40 text-slate-300 border border-white/10">
              สถานะ: {isFreeze ? "FREEZE" : isVeto ? "VETO" : isLimit ? "PENDING LIMIT" : isBuy || isSell ? "ACTIONABLE" : "WAIT"}
            </span>
          </div>
          <p className="text-xs leading-relaxed font-medium opacity-95">
            {triggerMessage}
          </p>
        </div>
      </div>

      {/* ─── 3. THE 4 CORE COPYABLE EXECUTION CARDS (ใหญ่ ชัดเจน คลิกก๊อปปี้ได้ใน 1 วิ) ─── */}
      <div className="space-y-2">
        {isExecutionLocked && (
          <div className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs font-semibold shadow-sm">
            <Lock className="w-4 h-4 text-amber-400 shrink-0" />
            <span>
              {isVeto
                ? "🔒 คำสั่งถูกระงับ (VETO): พบคอนฟลิกต์หรือกับดักสภาพคล่อง ระดับราคาด้านล่างเป็นค่าอ้างอิงเพื่อเฝ้าระวัง ห้ามเปิดออเดอร์"
                : isFreeze
                ? "🔒 คำสั่งถูกระงับ (NEWS FREEZE): ตลาดอยู่ในช่วงข่าวกล่องแดง/ส้ม ห้ามส่งคำสั่งจนกว่าข่าวจะผ่านพ้น"
                : "🔒 ระงับคำสั่ง (WAITING): ตลาดยังไม่เข้าเงื่อนไขแต้มต่อสถาบัน ระดับราคาด้านล่างใช้เพื่อสังเกตการณ์เท่านั้น"}
            </span>
          </div>
        )}

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
          {/* 1. Price */}
          <div
            onClick={() => onCopy(`${ts.pendingPrice || ts.entryZone.min}`, "price")}
            className={`p-3 sm:p-3.5 rounded-xl border-2 transition-all group relative shadow-sm ${
              isExecutionLocked
                ? "bg-surface-50/40 hover:bg-slate-800/60 border-slate-800 hover:border-slate-700 opacity-75 cursor-pointer"
                : "bg-surface-50/90 hover:bg-slate-800 border-slate-700 hover:border-amber-400/80 cursor-pointer hover:shadow-amber-500/10 active:scale-95"
            }`}
          >
            <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
              <span className={`font-bold ${isExecutionLocked ? "text-slate-400" : "text-slate-200"}`}>
                {isExecutionLocked ? "1. ราคาอ้างอิง (เฝ้าระวัง)" : "1. ราคาตั้งเปิด (Price)"}
              </span>
              {copiedKey === "price" ? (
                <span className="text-[10px] font-bold text-emerald-400 flex items-center gap-0.5">
                  <Check className="w-3 h-3" /> คัดลอกแล้ว
                </span>
              ) : (
                <Copy className="w-3.5 h-3.5 opacity-60 group-hover:opacity-100 text-amber-400" />
              )}
            </div>
            <span className={`text-base sm:text-xl font-mono font-black block tracking-tight ${
              isExecutionLocked ? "text-amber-400/70" : "text-amber-300"
            }`}>
              {ts.pendingPrice || ts.entryZone.min}
            </span>
            <span className="text-[10px] text-slate-400 font-sans block truncate mt-0.5">
              {isExecutionLocked
                ? "🔒 ระงับคำสั่ง (เฝ้าระวัง)"
                : ts.oteZone ? `โซน OTE (${ts.entryZone.min} - ${ts.entryZone.max})` : "แตะเพื่อคัดลอกค่านี้"}
            </span>
          </div>

          {/* 2. Stop Loss */}
          <div
            onClick={() => onCopy(`${ts.stopLoss}`, "sl")}
            className={`p-3 sm:p-3.5 rounded-xl border-2 transition-all group relative shadow-sm ${
              isExecutionLocked
                ? "bg-surface-50/40 hover:bg-slate-800/60 border-slate-800 hover:border-slate-700 opacity-75 cursor-pointer"
                : "bg-surface-50/90 hover:bg-slate-800 border-slate-700 hover:border-rose-500/80 cursor-pointer hover:shadow-rose-500/10 active:scale-95"
            }`}
          >
            <div className="flex items-center justify-between text-[11px] text-rose-400 mb-1">
              <span className={`font-bold ${isExecutionLocked ? "text-slate-400" : "text-rose-300"}`}>
                {isExecutionLocked ? "2. SL อ้างอิง" : "2. จุดยอมแพ้ (Stop Loss)"}
              </span>
              {copiedKey === "sl" ? (
                <span className="text-[10px] font-bold text-emerald-400 flex items-center gap-0.5">
                  <Check className="w-3 h-3" /> คัดลอกแล้ว
                </span>
              ) : (
                <Copy className="w-3.5 h-3.5 opacity-60 group-hover:opacity-100 text-rose-400" />
              )}
            </div>
            <span className={`text-base sm:text-xl font-mono font-black block tracking-tight ${
              isExecutionLocked ? "text-rose-400/70" : "text-rose-400"
            }`}>
              {ts.stopLoss}
            </span>
            <span className="text-[10px] text-rose-300/70 font-mono block truncate mt-0.5">
              {ts.slPips ? `-${ts.slPips} pips` : "ซ่อนหลัง Swing"} {ts.structuralSL ? "• Liquidity Shield" : ""}
            </span>
          </div>

          {/* 3. Take Profit 1 */}
          <div
            onClick={() => onCopy(`${ts.takeProfit1}`, "tp1")}
            className={`p-3 sm:p-3.5 rounded-xl border-2 transition-all group relative shadow-sm ${
              isExecutionLocked
                ? "bg-surface-50/40 hover:bg-slate-800/60 border-slate-800 hover:border-slate-700 opacity-75 cursor-pointer"
                : "bg-surface-50/90 hover:bg-slate-800 border-slate-700 hover:border-emerald-500/80 cursor-pointer hover:shadow-emerald-500/10 active:scale-95"
            }`}
          >
            <div className="flex items-center justify-between text-[11px] text-emerald-400 mb-1">
              <span className={`font-bold ${isExecutionLocked ? "text-slate-400" : "text-emerald-300"}`}>
                {isExecutionLocked ? "3. TP1 อ้างอิง" : "3. กำไรเป้าแรก (TP1)"}
              </span>
              {copiedKey === "tp1" ? (
                <span className="text-[10px] font-bold text-emerald-400 flex items-center gap-0.5">
                  <Check className="w-3 h-3" /> คัดลอกแล้ว
                </span>
              ) : (
                <Copy className="w-3.5 h-3.5 opacity-60 group-hover:opacity-100 text-emerald-400" />
              )}
            </div>
            <span className={`text-base sm:text-xl font-mono font-black block tracking-tight ${
              isExecutionLocked ? "text-emerald-400/70" : "text-emerald-300"
            }`}>
              {ts.takeProfit1}
            </span>
            <span className="text-[10px] text-emerald-300/70 font-mono block truncate mt-0.5">
              +{ts.tp1Pips || 0} pips (ถึง TP1 เลื่อน SL บังทุน)
            </span>
          </div>

          {/* 4. Take Profit 2 */}
          <div
            onClick={() => onCopy(`${ts.takeProfit2}`, "tp2")}
            className={`p-3 sm:p-3.5 rounded-xl border-2 transition-all group relative shadow-sm ${
              isExecutionLocked
                ? "bg-surface-50/40 hover:bg-slate-800/60 border-slate-800 hover:border-slate-700 opacity-75 cursor-pointer"
                : "bg-surface-50/90 hover:bg-slate-800 border-slate-700 hover:border-emerald-500/80 cursor-pointer hover:shadow-emerald-500/10 active:scale-95"
            }`}
          >
            <div className="flex items-center justify-between text-[11px] text-emerald-400 mb-1">
              <span className={`font-bold ${isExecutionLocked ? "text-slate-400" : "text-emerald-300"}`}>
                {isExecutionLocked ? "4. TP2 อ้างอิง" : "4. กำไรเป้าใหญ่ (TP2)"}
              </span>
              {copiedKey === "tp2" ? (
                <span className="text-[10px] font-bold text-emerald-400 flex items-center gap-0.5">
                  <Check className="w-3 h-3" /> คัดลอกแล้ว
                </span>
              ) : (
                <Copy className="w-3.5 h-3.5 opacity-60 group-hover:opacity-100 text-emerald-400" />
              )}
            </div>
            <span className={`text-base sm:text-xl font-mono font-black block tracking-tight ${
              isExecutionLocked ? "text-emerald-400/70" : "text-emerald-300"
            }`}>
              {ts.takeProfit2}
            </span>
            <span className="text-[10px] text-emerald-300/70 font-mono block truncate mt-0.5">
              +{ts.tp2Pips || 0} pips (รันเทรนด์โครงสร้างใหญ่)
            </span>
          </div>
        </div>
      </div>

      {/* ─── 4. SELF-TUNING ADAPTIVE ENGINE STATUS (Zero-Bloat Signal Cockpit) ─── */}
      {analysis.optimizedConfig?.isOptimized && (
        <div className="p-3 rounded-xl bg-gradient-to-r from-indigo-950/40 via-purple-950/20 to-slate-900 border border-indigo-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs shadow-inner">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-indigo-500/20 text-indigo-400 border border-indigo-500/40 shrink-0">
              <Zap className="w-4 h-4 text-indigo-300" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-black text-white text-xs tracking-wide">
                  ⚡ Self-Adaptive Indicator Engine
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold">
                  Win Rate Boost +{analysis.optimizedConfig.winRateGain}%
                </span>
              </div>
              <p className="text-[11px] text-slate-300 mt-0.5 leading-snug">
                ระบบปรับจูนพารามิเตอร์อัตโนมัติเฉพาะ <strong className="text-white">{analysis.symbol}</strong>:{" "}
                <span className="text-indigo-300 font-mono font-semibold">
                  EMA({analysis.optimizedConfig.emaFast}/{analysis.optimizedConfig.emaSlow}/{analysis.optimizedConfig.emaTrend})
                </span>{" "}
                •{" "}
                <span className="text-purple-300 font-mono font-semibold">
                  RSI({analysis.optimizedConfig.rsiPeriod})
                </span>{" "}
                (ทดสอบ {analysis.optimizedConfig.totalTradesTested} ไม้ | Win Rate เดิม {analysis.optimizedConfig.baselineWinRate}% ➔ <strong className="text-emerald-400 font-bold">{analysis.optimizedConfig.optimizedWinRate}%</strong>)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-center font-mono shrink-0">
            <span className="text-[10px] text-slate-400">Profit Factor:</span>
            <span className="text-xs font-black text-emerald-300 bg-surface-100 px-2 py-1 rounded-lg border border-slate-700">
              {analysis.optimizedConfig.profitFactor}x
            </span>
          </div>
        </div>
      )}

      {/* ─── 4.5. CLASSIC TRIO CONFLUENCE STATUS (MA 20 • MA 50 • RSI 14) ─── */}
      {analysis.classicTrio && (
        <div className={`p-3 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs shadow-inner ${
          analysis.classicTrio.alignment === "FULL_BULLISH_TRIO"
            ? "bg-gradient-to-r from-emerald-950/40 via-teal-950/20 to-slate-900 border-emerald-500/40"
            : analysis.classicTrio.alignment === "FULL_BEARISH_TRIO"
            ? "bg-gradient-to-r from-rose-950/40 via-red-950/20 to-slate-900 border-rose-500/40"
            : analysis.classicTrio.alignment === "PULLBACK_RETEST"
            ? "bg-gradient-to-r from-sky-950/40 via-indigo-950/20 to-slate-900 border-sky-500/40"
            : "bg-surface-50/70 border-slate-800"
        }`}>
          <div className="flex items-center gap-2.5">
            <div className={`p-1.5 rounded-lg border shrink-0 ${
              analysis.classicTrio.isAligned
                ? (analysis.classicTrio.signalBias === "BULLISH" ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40" : "bg-rose-500/20 text-rose-300 border-rose-500/40")
                : "bg-surface-100 text-slate-400 border-slate-700"
            }`}>
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-black text-white text-xs tracking-wide">
                  🎯 Classic Trio Confluence: MA(20) • MA(50) • RSI(14)
                </span>
                <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold border ${
                  analysis.classicTrio.alignment === "FULL_BULLISH_TRIO"
                    ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                    : analysis.classicTrio.alignment === "FULL_BEARISH_TRIO"
                    ? "bg-rose-500/20 text-rose-300 border-rose-500/40"
                    : analysis.classicTrio.alignment === "PULLBACK_RETEST"
                    ? "bg-sky-500/20 text-sky-300 border-sky-500/40"
                    : "bg-slate-800 text-slate-400 border-slate-700"
                }`}>
                  {analysis.classicTrio.alignment === "FULL_BULLISH_TRIO"
                    ? "🟢 FULL BULLISH TRIO (+7.5% WR Boost)"
                    : analysis.classicTrio.alignment === "FULL_BEARISH_TRIO"
                    ? "🔴 FULL BEARISH TRIO (+7.5% WR Boost)"
                    : analysis.classicTrio.alignment === "PULLBACK_RETEST"
                    ? "🟡 PULLBACK RETEST (+5.0% WR Boost)"
                    : "⚪ DIVERGENT (No Boost)"}
                </span>
              </div>
              <p className="text-[11px] text-slate-300 mt-0.5 leading-snug">
                {analysis.classicTrio.summary}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-center font-mono text-[11px] shrink-0">
            <span className="px-2 py-0.5 rounded bg-surface-100 border border-slate-800 text-cyan-300">
              MA20: {analysis.classicTrio.ma20}
            </span>
            <span className="px-2 py-0.5 rounded bg-surface-100 border border-slate-800 text-amber-300">
              MA50: {analysis.classicTrio.ma50}
            </span>
            <span className="px-2 py-0.5 rounded bg-surface-100 border border-slate-800 text-purple-300">
              RSI: {analysis.classicTrio.rsi14} {analysis.classicTrio.rsi14 >= analysis.classicTrio.prevRsi14 ? "↗" : "↘"}
            </span>
          </div>
        </div>
      )}

      {/* ─── 5. INTERACTIVE LOT SIZE & RISK CALCULATOR (เริ่ม $10 USD) ─── */}
      <div className="p-3.5 rounded-xl bg-surface-50/80 border border-slate-800 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-2.5">
          <div className="flex items-center gap-2">
            <div className="p-1 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Calculator className="w-4 h-4" />
            </div>
            <div>
              <h5 className="text-xs font-bold text-white flex items-center gap-1.5">
                <span>คำนวณขนาดไม้ & ความเสี่ยงเงินจริง (Lot Size Calculator)</span>
              </h5>
              <p className="text-[10px] text-slate-400">คำนวณกำไร/ขาดทุนเป็นดอลลาร์จริง ละเอียดยิบตามเงินทุนในพอร์ตของคุณ</p>
            </div>
          </div>

          {/* Account Type Toggle */}
          <div className="flex items-center gap-1 bg-surface-100 p-1 rounded-lg border border-slate-800 text-[10px]">
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

        {/* Controls: Balance Selector & Risk Selector */}
        <div className="flex flex-wrap items-center justify-between gap-2.5 text-xs">
          {/* Balance Quick Select */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[11px] text-slate-400 font-semibold">เงินทุนพอร์ต:</span>
            {[10, 20, 50, 100, 500, 1000].map((bVal) => (
              <button
                key={bVal}
                onClick={() => setCustomBalance(bVal)}
                className={`px-2 py-0.5 rounded text-[10px] font-mono transition-all border ${
                  customBalance === bVal
                    ? "bg-indigo-600 text-white border-indigo-500 shadow-sm"
                    : "bg-surface-100 text-slate-400 border-slate-800 hover:text-white"
                }`}
              >
                ${bVal}
              </button>
            ))}
            <div className="flex items-center gap-1 bg-surface-100 px-2 py-0.5 rounded border border-slate-800">
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
            <span className="text-[11px] text-slate-400 font-semibold">ความเสี่ยง:</span>
            {[1, 2, 5, 10].map((rVal) => (
              <button
                key={rVal}
                onClick={() => setCustomRiskPct(rVal)}
                className={`px-1.5 py-0.5 rounded text-[10px] font-mono transition-all border ${
                  customRiskPct === rVal
                    ? "bg-rose-500/20 text-rose-300 border-rose-500/40 font-bold"
                    : "bg-surface-100 text-slate-400 border-slate-800 hover:text-white"
                }`}
              >
                {rVal}%
              </button>
            ))}
          </div>
        </div>

        {/* 4 Calculation Outcome Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
          {/* Recommended Lot */}
          <div className="p-2 rounded-lg bg-surface-100 border border-slate-800 space-y-0.5">
            <span className="text-[10px] text-slate-400 block">ขนาดไม้แนะนำ (Lot)</span>
            <span className="text-sm sm:text-base font-mono font-black text-amber-300 block">
              {activeLot} {isCent ? "Cent" : "Lot"}
            </span>
            <span className="text-[9px] text-slate-500 font-mono block truncate">
              {isCent ? `(${balance * 100} Cents)` : `(Min 0.01 Lot)`}
            </span>
          </div>

          {/* Loss at SL */}
          <div className="p-2 rounded-lg bg-rose-950/20 border border-rose-500/30 space-y-0.5">
            <span className="text-[10px] text-rose-400 block">ถ้าชน SL เสียเงิน</span>
            <span className="text-sm sm:text-base font-mono font-black text-rose-300 block">
              -${activeLossUSD} USD
            </span>
            <span className="text-[9px] text-rose-400/80 font-mono block truncate">
              เสี่ยง {activeRiskPct}% ของพอร์ต
            </span>
          </div>

          {/* Profit at TP1 */}
          <div className="p-2 rounded-lg bg-emerald-950/20 border border-emerald-500/30 space-y-0.5">
            <span className="text-[10px] text-emerald-400 block">ถ้าชน TP1 ได้เงิน</span>
            <span className="text-sm sm:text-base font-mono font-black text-emerald-300 block">
              +${activeTp1USD} USD
            </span>
            <span className="text-[9px] text-emerald-400/80 font-mono block truncate">
              กำไร +{((activeTp1USD / balance) * 100).toFixed(1)}%
            </span>
          </div>

          {/* Profit at TP2 */}
          <div className="p-2 rounded-lg bg-emerald-950/20 border border-emerald-500/30 space-y-0.5">
            <span className="text-[10px] text-emerald-400 block">ถ้าชน TP2 ได้เงิน</span>
            <span className="text-sm sm:text-base font-mono font-black text-emerald-300 block">
              +${activeTp2USD} USD
            </span>
            <span className="text-[9px] text-emerald-400/80 font-mono block truncate">
              กำไร +{((activeTp2USD / balance) * 100).toFixed(1)}%
            </span>
          </div>
        </div>
      </div>

      {/* ─── 6. INVALIDATION RULE CALLOUT ─── */}
      {ts.invalidationNote && (
        <div className="p-2.5 rounded-lg bg-surface-100/60 border border-slate-800 text-[11px] text-slate-300 flex items-start gap-2">
          <Info className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
          <span><strong>เงื่อนไขยกเลิกออเดอร์ (Invalidation Rule):</strong> {ts.invalidationNote}</span>
        </div>
      )}
    </div>
  );
}
