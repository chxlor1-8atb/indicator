"use client";

import React, { useState } from "react";
import { AnalysisResult } from "@/lib/types";
import {
  Layers,
  Target,
  ShieldCheck,
  TrendingUp,
  TrendingDown,
  Crosshair,
  CheckCircle2,
  XCircle,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Radio,
  Send,
} from "lucide-react";

interface FiveCorePillarsCardProps {
  analysis: AnalysisResult;
}

export default function FiveCorePillarsCard({ analysis }: FiveCorePillarsCardProps) {
  const [isExpanded, setIsExpanded] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<"ALL" | "PIVOTS" | "SR" | "FIB" | "BANDS" | "SMC">("ALL");

  const fcp = analysis.fiveCorePillars || analysis.tradeSetup?.fiveCorePillars;
  const pivots = analysis.pivotPoints || analysis.tradeSetup?.pivotPoints;
  const sr = analysis.clusteredSR || analysis.tradeSetup?.clusteredSR;
  const fib = analysis.autoFibonacci || analysis.tradeSetup?.autoFibonacci;
  const donchian = analysis.tradeSetup?.donchian;
  const ob = analysis.tradeSetup?.orderBlocks || analysis.orderBlocks;
  const fvg = analysis.tradeSetup?.fvgMitigation || analysis.fvgMitigation;

  const passedCount = fcp?.passedPillarsCount ?? (analysis.signal !== "WAIT" ? 3 : 1);
  const isConfluenceApproved = passedCount >= 3;
  const dominantBias = fcp?.dominantBias || (analysis.signal.includes("BUY") ? "BUY" : analysis.signal.includes("SELL") ? "SELL" : "NEUTRAL");

  const sym = analysis.symbol || "";
  const precision = sym.includes("JPY") ? 2 : ["EUR", "GBP", "AUD", "NZD", "USD", "CAD", "CHF"].some(c => sym.startsWith(c) || sym.endsWith(c)) ? 4 : sym.includes("XAU") || sym.includes("GOLD") ? 2 : 2;

  const formatPrice = (val?: number) => {
    if (val === undefined || val === null || isNaN(val) || val === 0) return "-";
    return val.toLocaleString(undefined, { minimumFractionDigits: precision, maximumFractionDigits: precision });
  };

  return (
    <div className="rounded-2xl border-2 border-indigo-500/40 bg-gradient-to-b from-slate-900 via-surface-100 to-surface-50 p-4 sm:p-5 shadow-xl space-y-4 relative overflow-hidden">
      {/* Top Ambient Glow */}
      <div
        className={`absolute top-0 left-0 right-0 h-1.5 ${
          dominantBias === "BUY"
            ? "bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-500"
            : dominantBias === "SELL"
            ? "bg-gradient-to-r from-rose-500 via-red-500 to-amber-500"
            : "bg-gradient-to-r from-amber-500 via-yellow-400 to-slate-500"
        }`}
      />

      {/* ─── 1. HEADER: 5 Core Practical Pillars Banner ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 shadow-inner">
            <Target className="w-5 h-5 text-indigo-400" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-mono font-bold tracking-wider text-indigo-300 uppercase">
                5 Core Trading Pillars
              </span>
              <span
                className={`text-[10px] font-mono px-2 py-0.5 rounded-full border font-bold ${
                  isConfluenceApproved
                    ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40 animate-pulse"
                    : "bg-amber-500/15 text-amber-300 border-amber-500/30"
                }`}
              >
                {isConfluenceApproved ? `🎯 ผ่านเกณฑ์ ${passedCount}/5 เสาหลัก (Actionable Signal)` : `⏳ รอคอนเฟิร์ม ${passedCount}/5 เสาหลัก`}
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/15 text-cyan-200 border border-cyan-500/30 flex items-center gap-1">
                <Send className="w-2.5 h-2.5" />
                Telegram Signal System
              </span>
            </div>
            <h4 className="text-sm sm:text-base font-black text-white flex items-center gap-2 mt-0.5">
              <span>5 เสาหลักเทรดจริง (Practical Trading Pillars)</span>
              <span className="text-xs font-normal text-slate-400 hidden sm:inline">
                • คัดกรองแม่นยำ ไม่ขัดแย้งกันเอง
              </span>
            </h4>
          </div>
        </div>

        {/* Dominant Bias & Quick Actions */}
        <div className="flex items-center gap-2 self-end sm:self-center">
          <div
            className={`px-3 py-1.5 rounded-xl border text-xs font-black tracking-wide flex items-center gap-1.5 ${
              dominantBias === "BUY"
                ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                : dominantBias === "SELL"
                ? "bg-rose-500/20 text-rose-300 border-rose-500/40"
                : "bg-surface-50 text-slate-400 border-slate-700"
            }`}
          >
            {dominantBias === "BUY" ? (
              <>
                <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                <span>BIAS: BULLISH (BUY)</span>
              </>
            ) : dominantBias === "SELL" ? (
              <>
                <TrendingDown className="w-3.5 h-3.5 text-rose-400" />
                <span>BIAS: BEARISH (SELL)</span>
              </>
            ) : (
              <>
                <Radio className="w-3.5 h-3.5 text-amber-400" />
                <span>BIAS: NEUTRAL (WAIT)</span>
              </>
            )}
          </div>

          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1.5 rounded-lg bg-surface-50 hover:bg-slate-800 border border-slate-700 text-slate-400 hover:text-white transition-all"
            title={isExpanded ? "ย่อรายละเอียด" : "ขยายรายละเอียด"}
          >
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* ─── 2. 5 PILLARS STATUS CHECKLIST (สรุป 5 เสาหลักในแถวเดียว) ─── */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
        {/* Pillar 1: Pivot Points */}
        <div
          onClick={() => setActiveTab(activeTab === "PIVOTS" ? "ALL" : "PIVOTS")}
          className={`p-2.5 rounded-xl border transition-all cursor-pointer ${
            fcp?.pillar3_PivotPoints?.passed
              ? "bg-emerald-950/20 border-emerald-500/40 hover:border-emerald-400"
              : "bg-surface-50/80 border-slate-800 hover:border-slate-700"
          }`}
        >
          <div className="flex items-center justify-between text-[11px] font-bold">
            <span className="text-slate-300">1. Pivot Points</span>
            {fcp?.pillar3_PivotPoints?.passed ? (
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            ) : (
              <XCircle className="w-3.5 h-3.5 text-slate-500 shrink-0" />
            )}
          </div>
          <p className="text-[10px] text-slate-400 truncate mt-1">
            {pivots ? `${pivots.marketPosition === "ABOVE_PIVOT_BULLISH" ? "เหนือ Pivot (Bull)" : pivots.marketPosition === "BELOW_PIVOT_BEARISH" ? "ใต้ Pivot (Bear)" : "ที่ Pivot"} (${pivots.nearestLevelName})` : "กำลังคำนวณ..."}
          </p>
        </div>

        {/* Pillar 2: Auto Clustered S&R */}
        <div
          onClick={() => setActiveTab(activeTab === "SR" ? "ALL" : "SR")}
          className={`p-2.5 rounded-xl border transition-all cursor-pointer ${
            fcp?.pillar4_ClusteredSR?.passed
              ? "bg-emerald-950/20 border-emerald-500/40 hover:border-emerald-400"
              : "bg-surface-50/80 border-slate-800 hover:border-slate-700"
          }`}
        >
          <div className="flex items-center justify-between text-[11px] font-bold">
            <span className="text-slate-300">2. Auto S&R Levels</span>
            {fcp?.pillar4_ClusteredSR?.passed ? (
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            ) : (
              <XCircle className="w-3.5 h-3.5 text-slate-500 shrink-0" />
            )}
          </div>
          <p className="text-[10px] text-slate-400 truncate mt-1">
            {sr?.nearestSupport || sr?.nearestResistance
              ? `รับ ${formatPrice(sr.nearestSupport?.price)} / ต้าน ${formatPrice(sr.nearestResistance?.price)}`
              : "Multi-Touch Cluster"}
          </p>
        </div>

        {/* Pillar 3: Auto Fibonacci Retracement */}
        <div
          onClick={() => setActiveTab(activeTab === "FIB" ? "ALL" : "FIB")}
          className={`p-2.5 rounded-xl border transition-all cursor-pointer ${
            fcp?.pillar2_AutoFib?.passed
              ? "bg-emerald-950/20 border-emerald-500/40 hover:border-emerald-400"
              : "bg-surface-50/80 border-slate-800 hover:border-slate-700"
          }`}
        >
          <div className="flex items-center justify-between text-[11px] font-bold">
            <span className="text-slate-300">3. Auto Fibonacci</span>
            {fcp?.pillar2_AutoFib?.passed ? (
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            ) : (
              <XCircle className="w-3.5 h-3.5 text-slate-500 shrink-0" />
            )}
          </div>
          <p className="text-[10px] text-slate-400 truncate mt-1">
            {fib
              ? `${fib.currentZone === "GOLDEN_POCKET_50_618" ? "Golden 50-61.8%" : fib.currentZone === "DEEP_PULLBACK_786" ? "Deep 78.6%" : fib.trendDirection}`
              : "Swing High/Low Fibs"}
          </p>
        </div>

        {/* Pillar 4: Dynamic Bands */}
        <div
          onClick={() => setActiveTab(activeTab === "BANDS" ? "ALL" : "BANDS")}
          className={`p-2.5 rounded-xl border transition-all cursor-pointer ${
            fcp?.pillar5_DynamicBands?.passed
              ? "bg-emerald-950/20 border-emerald-500/40 hover:border-emerald-400"
              : "bg-surface-50/80 border-slate-800 hover:border-slate-700"
          }`}
        >
          <div className="flex items-center justify-between text-[11px] font-bold">
            <span className="text-slate-300">4. Dynamic Bands</span>
            {fcp?.pillar5_DynamicBands?.passed ? (
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            ) : (
              <XCircle className="w-3.5 h-3.5 text-slate-500 shrink-0" />
            )}
          </div>
          <p className="text-[10px] text-slate-400 truncate mt-1">
            {donchian
              ? `Donchian (${formatPrice(donchian.middle)})`
              : "Donchian / Bollinger"}
          </p>
        </div>

        {/* Pillar 5: SMC Footprint */}
        <div
          onClick={() => setActiveTab(activeTab === "SMC" ? "ALL" : "SMC")}
          className={`p-2.5 rounded-xl border transition-all cursor-pointer col-span-2 sm:col-span-1 ${
            fcp?.pillar1_SMC?.passed
              ? "bg-emerald-950/20 border-emerald-500/40 hover:border-emerald-400"
              : "bg-surface-50/80 border-slate-800 hover:border-slate-700"
          }`}
        >
          <div className="flex items-center justify-between text-[11px] font-bold">
            <span className="text-slate-300">5. SMC Footprint</span>
            {fcp?.pillar1_SMC?.passed ? (
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            ) : (
              <XCircle className="w-3.5 h-3.5 text-slate-500 shrink-0" />
            )}
          </div>
          <p className="text-[10px] text-slate-400 truncate mt-1">
            {ob?.nearestBlock ? `${ob.nearestBlock.type} OB` : (fvg && fvg.unmitigatedCount > 0) ? "FVG Active" : "Order Blocks & FVG"}
          </p>
        </div>
      </div>

      {/* ─── 3. EXPANDABLE DETAILED BREAKDOWN PANELS ─── */}
      {isExpanded && (
        <div className="space-y-4 pt-1 animate-fadeIn">
          {/* Detailed Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {/* ─── CARD 1: PIVOT POINTS (Floor & Fibonacci) ─── */}
            <div className="p-3.5 rounded-xl bg-surface-50/90 border border-slate-800 space-y-2.5">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <div className="flex items-center gap-2">
                  <span className="p-1 rounded bg-indigo-500/20 text-indigo-300 text-xs font-bold">P1</span>
                  <h5 className="text-xs font-bold text-white">Standard & Fibonacci Pivot Points</h5>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-surface-100 text-slate-300 border border-slate-700">
                  {pivots?.marketPosition || "CALCULATING"}
                </span>
              </div>

              {pivots ? (
                <div className="space-y-2 text-xs">
                  <div className="flex items-center justify-between bg-surface-100/70 p-2 rounded-lg font-mono">
                    <span className="text-amber-300 font-bold">Central Pivot (P):</span>
                    <strong className="text-white text-sm">{formatPrice(pivots.pivot)}</strong>
                  </div>

                  {/* R Levels */}
                  <div className="grid grid-cols-3 gap-1.5 font-mono text-[11px] text-center">
                    <div className="p-1.5 rounded bg-rose-950/20 border border-rose-500/20">
                      <span className="text-rose-400 block text-[10px]">R1 (Resistance)</span>
                      <strong className="text-white">{formatPrice(pivots.r1)}</strong>
                    </div>
                    <div className="p-1.5 rounded bg-rose-950/20 border border-rose-500/20">
                      <span className="text-rose-400 block text-[10px]">R2 (TP2 Zone)</span>
                      <strong className="text-white">{formatPrice(pivots.r2)}</strong>
                    </div>
                    <div className="p-1.5 rounded bg-rose-950/20 border border-rose-500/20">
                      <span className="text-rose-400 block text-[10px]">R3 (Extreme)</span>
                      <strong className="text-white">{formatPrice(pivots.r3)}</strong>
                    </div>
                  </div>

                  {/* S Levels */}
                  <div className="grid grid-cols-3 gap-1.5 font-mono text-[11px] text-center">
                    <div className="p-1.5 rounded bg-emerald-950/20 border border-emerald-500/20">
                      <span className="text-emerald-400 block text-[10px]">S1 (Support)</span>
                      <strong className="text-white">{formatPrice(pivots.s1)}</strong>
                    </div>
                    <div className="p-1.5 rounded bg-emerald-950/20 border border-emerald-500/20">
                      <span className="text-emerald-400 block text-[10px]">S2 (TP2 Zone)</span>
                      <strong className="text-white">{formatPrice(pivots.s2)}</strong>
                    </div>
                    <div className="p-1.5 rounded bg-emerald-950/20 border border-emerald-500/20">
                      <span className="text-emerald-400 block text-[10px]">S3 (Extreme)</span>
                      <strong className="text-white">{formatPrice(pivots.s3)}</strong>
                    </div>
                  </div>

                  <p className="text-[10.5px] text-slate-300 leading-relaxed bg-surface-100/50 p-2 rounded border border-slate-800">
                    💡 <strong>จุดใกล้สุด:</strong> {pivots.nearestLevelName} @ {formatPrice(pivots.nearestLevelPrice)} (ห่าง {pivots.distancePips} pips) • {pivots.description}
                  </p>
                </div>
              ) : (
                <p className="text-xs text-slate-400">กำลังประมวลผล Pivot Points...</p>
              )}
            </div>

            {/* ─── CARD 2: AUTO SUPPORT & RESISTANCE (Clustered Price Action) ─── */}
            <div className="p-3.5 rounded-xl bg-surface-50/90 border border-slate-800 space-y-2.5">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <div className="flex items-center gap-2">
                  <span className="p-1 rounded bg-indigo-500/20 text-indigo-300 text-xs font-bold">P2</span>
                  <h5 className="text-xs font-bold text-white">Auto Support & Resistance Clusters</h5>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-surface-100 text-cyan-300 border border-slate-700">
                  กรอบ {sr?.channelWidthPips || 0} pips
                </span>
              </div>

              {sr ? (
                <div className="space-y-2 text-xs">
                  <div className="grid grid-cols-2 gap-2 font-mono text-[11px]">
                    {/* Nearest Resistance */}
                    <div className="p-2 rounded-lg bg-rose-950/25 border border-rose-500/30">
                      <div className="flex items-center justify-between text-rose-400 text-[10px] mb-0.5">
                        <span>แนวต้านสำคัญ</span>
                        <span>{sr.nearestResistance ? `${sr.nearestResistance.touchCount} ชน` : "-"}</span>
                      </div>
                      <strong className="text-rose-300 text-sm block">
                        {sr.nearestResistance ? formatPrice(sr.nearestResistance.price) : "ไม่พบแนวต้านใกล้"}
                      </strong>
                      <span className="text-[9.5px] text-rose-300/70">
                        {sr.nearestResistance ? `ห่าง +${sr.nearestResistance.distancePips} pips (พลัง ${sr.nearestResistance.strength}%)` : ""}
                      </span>
                    </div>

                    {/* Nearest Support */}
                    <div className="p-2 rounded-lg bg-emerald-950/25 border border-emerald-500/30">
                      <div className="flex items-center justify-between text-emerald-400 text-[10px] mb-0.5">
                        <span>แนวรับสำคัญ</span>
                        <span>{sr.nearestSupport ? `${sr.nearestSupport.touchCount} ชน` : "-"}</span>
                      </div>
                      <strong className="text-emerald-300 text-sm block">
                        {sr.nearestSupport ? formatPrice(sr.nearestSupport.price) : "ไม่พบแนวรับใกล้"}
                      </strong>
                      <span className="text-[9.5px] text-emerald-300/70">
                        {sr.nearestSupport ? `ห่าง -${sr.nearestSupport.distancePips} pips (พลัง ${sr.nearestSupport.strength}%)` : ""}
                      </span>
                    </div>
                  </div>

                  {/* Multi-touch list */}
                  <div className="space-y-1">
                    <span className="text-[10px] text-slate-400 font-semibold block">โซนที่มีนัยสำคัญทางสถิติ:</span>
                    <div className="flex flex-wrap gap-1.5">
                      {sr.supports.slice(0, 2).map((s, idx) => (
                        <span key={`sup_${idx}`} className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 font-mono text-[10px]">
                          รับ {formatPrice(s.price)} ({s.touchCount}x)
                        </span>
                      ))}
                      {sr.resistances.slice(0, 2).map((r, idx) => (
                        <span key={`res_${idx}`} className="px-2 py-0.5 rounded bg-rose-500/10 text-rose-300 border border-rose-500/30 font-mono text-[10px]">
                          ต้าน {formatPrice(r.price)} ({r.touchCount}x)
                        </span>
                      ))}
                    </div>
                  </div>

                  <p className="text-[10.5px] text-slate-300 leading-relaxed bg-surface-100/50 p-2 rounded border border-slate-800">
                    💡 {sr.description}
                  </p>
                </div>
              ) : (
                <p className="text-xs text-slate-400">กำลังวิเคราะห์ Multi-Touch Price Action...</p>
              )}
            </div>

            {/* ─── CARD 3: AUTO FIBONACCI RETRACEMENT ─── */}
            <div className="p-3.5 rounded-xl bg-surface-50/90 border border-slate-800 space-y-2.5">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <div className="flex items-center gap-2">
                  <span className="p-1 rounded bg-indigo-500/20 text-indigo-300 text-xs font-bold">P3</span>
                  <h5 className="text-xs font-bold text-white">Auto Fibonacci Retracement</h5>
                </div>
                <span className={`text-[10px] font-mono px-2 py-0.5 rounded border font-bold ${
                  fib?.currentZone === "GOLDEN_POCKET_50_618"
                    ? "bg-amber-500/20 text-amber-300 border-amber-500/40"
                    : "bg-surface-100 text-slate-300 border-slate-700"
                }`}>
                  {fib?.currentZone || "CALCULATING"}
                </span>
              </div>

              {fib ? (
                <div className="space-y-2 text-xs">
                  {/* Fibonacci Ladder */}
                  <div className="grid grid-cols-5 gap-1 font-mono text-[10px] text-center">
                    <div className="p-1 rounded bg-surface-100 border border-slate-800">
                      <span className="text-slate-400 block">23.6%</span>
                      <span className="text-slate-200 truncate block">{formatPrice(fib.fib236)}</span>
                    </div>
                    <div className="p-1 rounded bg-surface-100 border border-slate-800">
                      <span className="text-slate-400 block">38.2%</span>
                      <span className="text-slate-200 truncate block">{formatPrice(fib.fib382)}</span>
                    </div>
                    <div className="p-1 rounded bg-amber-500/15 border border-amber-500/30">
                      <span className="text-amber-300 block font-bold">50.0% EQ</span>
                      <span className="text-amber-200 truncate block font-bold">{formatPrice(fib.fib500)}</span>
                    </div>
                    <div className="p-1 rounded bg-emerald-500/15 border border-emerald-500/30">
                      <span className="text-emerald-300 block font-bold">61.8% Golden</span>
                      <span className="text-emerald-200 truncate block font-bold">{formatPrice(fib.fib618)}</span>
                    </div>
                    <div className="p-1 rounded bg-purple-500/15 border border-purple-500/30">
                      <span className="text-purple-300 block font-bold">78.6% Deep</span>
                      <span className="text-purple-200 truncate block font-bold">{formatPrice(fib.fib786)}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[11px] font-mono p-2 rounded bg-surface-100/70">
                    <span className="text-slate-400">Swing High / Low:</span>
                    <span className="text-white font-bold">{formatPrice(fib.swingHigh)} / {formatPrice(fib.swingLow)}</span>
                  </div>

                  <p className="text-[10.5px] text-slate-300 leading-relaxed bg-surface-100/50 p-2 rounded border border-slate-800">
                    💡 <strong>จุดเข้า OTE แนะนำ:</strong> {formatPrice(fib.recommendedEntryLevel)} • {fib.description}
                  </p>
                </div>
              ) : (
                <p className="text-xs text-slate-400">กำลังคำนวณ Fibonacci Levels...</p>
              )}
            </div>

            {/* ─── CARD 4: DYNAMIC BANDS (Donchian & Volatility Channels) ─── */}
            <div className="p-3.5 rounded-xl bg-surface-50/90 border border-slate-800 space-y-2.5">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <div className="flex items-center gap-2">
                  <span className="p-1 rounded bg-indigo-500/20 text-indigo-300 text-xs font-bold">P4</span>
                  <h5 className="text-xs font-bold text-white">Dynamic Channels (Donchian & Bands)</h5>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-surface-100 text-indigo-300 border border-slate-700">
                  Donchian 20 High/Low
                </span>
              </div>

              <div className="space-y-2 text-xs">
                {donchian ? (
                  <div className="grid grid-cols-3 gap-1.5 font-mono text-[11px] text-center">
                    <div className="p-1.5 rounded bg-surface-100 border border-slate-800">
                      <span className="text-slate-400 block text-[10px]">Upper (20H Break)</span>
                      <strong className="text-rose-300">{formatPrice(donchian.upper)}</strong>
                    </div>
                    <div className="p-1.5 rounded bg-indigo-950/20 border border-indigo-500/30">
                      <span className="text-indigo-300 block text-[10px]">Midline (Basis)</span>
                      <strong className="text-white">{formatPrice(donchian.middle)}</strong>
                    </div>
                    <div className="p-1.5 rounded bg-surface-100 border border-slate-800">
                      <span className="text-slate-400 block text-[10px]">Lower (20L Break)</span>
                      <strong className="text-emerald-300">{formatPrice(donchian.lower)}</strong>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-slate-400">กำลังประมวลผล Donchian Band...</p>
                )}

                <div className="flex items-center justify-between text-[11px] font-mono p-2 rounded bg-surface-100/70">
                  <span className="text-slate-400">Dynamic TP2 Target Rule:</span>
                  <span className="text-emerald-300 font-bold">
                    {dominantBias === "BUY" ? `ขอบบน Donchian (${formatPrice(donchian?.upper)})` : dominantBias === "SELL" ? `ขอบล่าง Donchian (${formatPrice(donchian?.lower)})` : "รอเบรกกรอบ"}
                  </span>
                </div>

                <p className="text-[10.5px] text-slate-300 leading-relaxed bg-surface-100/50 p-2 rounded border border-slate-800">
                  💡 <strong>หน้าที่ของแบนด์:</strong> ใช้เป็น Dynamic Support/Resistance และเป้าหมายทำกำไร Trend Runner (TP2) แทนการเป็นตัวบล็อกคำสั่ง
                </p>
              </div>
            </div>
          </div>

          {/* ─── 4. ALIGNED TRADE SETUP DERIVATION CALLOUT (ชี้ให้เห็นว่าแผนเทรดคำนวณจาก 5 เสาหลักอย่างไร) ─── */}
          <div className="p-3.5 rounded-xl bg-gradient-to-r from-indigo-950/40 via-purple-950/30 to-slate-900 border border-indigo-500/40 space-y-2">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
              <h5 className="text-xs font-bold text-white">
                การแปลงผล 5 เสาหลักเป็นแผนเทรด (5-Pillar Execution Alignment)
              </h5>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 text-xs font-mono">
              <div className="p-2 rounded bg-black/40 border border-slate-800">
                <span className="text-[10px] text-slate-400 block">Entry Point:</span>
                <span className="text-amber-300 font-bold block">{formatPrice(analysis.tradeSetup.pendingPrice || analysis.tradeSetup.entryZone.min)}</span>
                <span className="text-[9px] text-slate-500 font-sans">โซน OTE Fib / OB / S&R</span>
              </div>
              <div className="p-2 rounded bg-black/40 border border-slate-800">
                <span className="text-[10px] text-slate-400 block">Stop Loss:</span>
                <span className="text-rose-400 font-bold block">{formatPrice(analysis.tradeSetup.stopLoss)}</span>
                <span className="text-[9px] text-slate-500 font-sans">ซ่อนหลัง Swing / Liquidity</span>
              </div>
              <div className="p-2 rounded bg-black/40 border border-slate-800">
                <span className="text-[10px] text-slate-400 block">Take Profit 1:</span>
                <span className="text-emerald-400 font-bold block">{formatPrice(analysis.tradeSetup.takeProfit1)}</span>
                <span className="text-[9px] text-slate-500 font-sans">Pivot R1/S1 หรือ S&R ใกล้สุด</span>
              </div>
              <div className="p-2 rounded bg-black/40 border border-slate-800">
                <span className="text-[10px] text-slate-400 block">Take Profit 2:</span>
                <span className="text-emerald-400 font-bold block">{formatPrice(analysis.tradeSetup.takeProfit2)}</span>
                <span className="text-[9px] text-slate-500 font-sans">Pivot R2/S2 หรือ Donchian</span>
              </div>
            </div>

            <p className="text-[10.5px] text-slate-300 leading-relaxed pt-1">
              📱 <strong>ระบบ AI Signal Web & Telegram:</strong> ระบบวิเคราะห์อัตโนมัติ 24 ชม. เมื่อตรวจพบความสอดคล้อง ≥ 3 เสาหลัก สัญญาณจะอัปเดตบนหน้าเว็บนี้ทันที และส่งตรงไปยัง Telegram พร้อมจุด Entry, SL, TP1, TP2 โดยไม่มีการส่งคำสั่งไป MT4/MT5
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
