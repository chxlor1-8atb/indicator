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
  Calculator,
  Brain,
  Database,
  Cpu,
  Activity,
  Scale
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
  const [activeQuantLayer, setActiveQuantLayer] = useState<1 | 2 | 3 | 4 | 5>(3);

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
    const ote = analysis.tradeSetup.oteZone || analysis.oteZone;
    const ssl = analysis.tradeSetup.structuralSL;
    const be = analysis.tradeSetup.breakevenAdvice || analysis.breakevenAdvice;
    const vd = analysis.volumeDelta;
    const vp = analysis.tradeSetup.volumeProfile || analysis.volumeProfile;
    const td = analysis.tdSequential;
    const ts = analysis.tradeSetup.trailingStop || analysis.trailingStop;
    const sp = analysis.tradeSetup.spreadImpact || analysis.spreadImpact;
    const vwap = analysis.tradeSetup.anchoredVwap || analysis.anchoredVwap;
    const cvd = analysis.tradeSetup.cvd || analysis.cvd;
    const ob = analysis.tradeSetup.orderBlocks || analysis.orderBlocks;
    const kelly = analysis.tradeSetup.kellySizing || analysis.kellySizing;
    const swp = analysis.tradeSetup.sessionSweep || analysis.sessionSweep;
    const fib = analysis.tradeSetup.fibonacciCluster || analysis.fibonacciCluster;
    const rv = analysis.tradeSetup.realizedVolatility || analysis.realizedVolatility;
    const micro = analysis.tradeSetup.candleMicrostructure || analysis.candleMicrostructure;
    const shield = analysis.tradeSetup.correlationShield || analysis.correlationShield;
    const fvg = analysis.tradeSetup.fvgMitigation || analysis.fvgMitigation;
    const mss = analysis.tradeSetup.marketStructureShift || analysis.marketStructureShift;
    const pd = analysis.tradeSetup.premiumDiscount || analysis.premiumDiscount;
    const key = analysis.tradeSetup.keyLevelTargets || analysis.keyLevelTargets;
    const flow = analysis.tradeSetup.orderFlowVelocity || analysis.orderFlowVelocity;
    const beLadder = analysis.tradeSetup.breakevenLadder || analysis.breakevenLadder;
    const lVoid = analysis.tradeSetup.liquidityVoid || analysis.liquidityVoid;
    const fibExt = analysis.tradeSetup.fibonacciExtension || analysis.fibonacciExtension;
    const vsa = analysis.tradeSetup.footprintAbsorption || analysis.footprintAbsorption;
    const mtf = analysis.tradeSetup.mtfStructureMatrix || analysis.mtfStructureMatrix;
    const idm = analysis.tradeSetup.liquidityInducement || analysis.liquidityInducement;
    const chos = analysis.tradeSetup.institutionalChoS || analysis.institutionalChoS;
    const drb = analysis.tradeSetup.dynamicRiskBracket || analysis.dynamicRiskBracket;
    const rej = analysis.tradeSetup.rejectionBlock || analysis.rejectionBlock;
    const mcpi = analysis.tradeSetup.mcpiConviction || analysis.mcpiConviction;
    const iq = (analysis as any)?.institutionalQuant;

    const text = `📊 [INSTITUTIONAL QUANT PLAN: ${analysis.symbol} (${analysis.timeframe.toUpperCase()})]\n` +
      `• Signal: ${analysis.signal} (Grade: ${analysis.setupGrade || "A"}, Confluence: ${mc?.totalScore || analysis.confidence}%)\n` +
      `• Calendar Shield: ${cal?.badgeText || "SAFE"} (${cal?.freezeReason || "ปกติ"})\n` +
      `• Session Timing: ${sess?.sessionBadge.text || "NORMAL"} (${sess?.thaiTimeStr || ""})\n` +
      `• Market Regime: ${reg?.title || "NORMAL"}\n` +
      `• OTE Golden Pocket: ${analysis.tradeSetup.entryZone.min} - ${analysis.tradeSetup.entryZone.max} (Sweet Spot: ${analysis.tradeSetup.pendingPrice})\n` +
      (fvg && fvg.recommendedEntryLimit ? `• FVG C.E. 50%: ${fvg.recommendedEntryLimit} (${fvg.bias} | Unmitigated: ${fvg.unmitigatedCount})\n` : "") +
      (mss && mss.detected ? `• Market Structure Shift: ${mss.type} (Displacement: ${mss.displacementMultiplier}x ATR - ${mss.displacementVelocity})\n` : "") +
      (pd ? `• Premium/Discount: ${pd.percentile}% (${pd.zone} | Equilibrium: ${pd.equilibrium})\n` : "") +
      (key ? `• Key Liquidity Target: ${key.nearestLiquidityTarget.name} (${key.nearestLiquidityTarget.price} - ${key.nearestLiquidityTarget.distancePips} pips)\n` : "") +
      (flow ? `• Order Flow Velocity: Score ${flow.velocityScore} (${flow.momentumState})\n` : "") +
      (beLadder ? `• Multi-Stage BE Ladder: ขั้นที่ ${beLadder.currentStage}/3 (${beLadder.actionAdvice} | Rec SL: ${beLadder.recommendedSL})\n` : "") +
      (lVoid && lVoid.activeVoidCount > 0 ? `• Liquidity Void: ${lVoid.vacuumDirection} (${lVoid.activeVoidCount} จุด, เติม 50% ที่ ${lVoid.nearestVoid?.fillTarget50} - ความน่าจะเป็น ${lVoid.fastFillProbabilityPct}%)\n` : "") +
      (fibExt && fibExt.bestTakeProfitTarget ? `• Fib Extension Mesh: 1.618 Golden Target ${fibExt.bestTakeProfitTarget.price} (${fibExt.bestTakeProfitTarget.label})\n` : "") +
      (vsa ? `• VSA Footprint: ${vsa.vsaSignal} (Effort/Result: ${vsa.effortVsResult} | Vol: ${vsa.relativeVolume}x)\n` : "") +
      (mtf ? `• MTF Structure Matrix: ${mtf.overallAlignment} (สอดคล้อง ${mtf.alignmentScorePct}% | HTF: ${mtf.htfTrend})\n` : "") +
      (idm && idm.isInducementTrap ? `• 🪤 Inducement Trap Alert: ${idm.trapType} (${idm.inducementDirection} - ห่าง ${idm.distanceToTrapPips} pips)\n` : "") +
      (chos ? `• 🚀 ChoS Delivery: ${chos.deliveryState} (${chos.dominantParticipant} | Score: ${chos.deliveryScore}/100)\n` : "") +
      (drb ? `• 🛡️ Dynamic Risk Bracket: [${drb.currentRiskBracket}] แนะนำเสี่ยง ${drb.recommendedRiskPct}% (Throttle: ${drb.drawdownThrottleMultiplier}x)\n` : "") +
      (rej && rej.blocks.length > 0 ? `• 🧱 Rejection Blocks: พบ ${rej.blocks.length} บล็อค (Wick Ratio: ${rej.rejectionWickRatioPct}% | Exhaustion: ${rej.wickExhaustionScore}/100)\n` : "") +
      (mcpi ? `• ⚡ Unified MCPI Conviction: ${mcpi.score}/100 [เกรด ${mcpi.convictionTier}] (${mcpi.isApprovedForExecution ? "APPROVED" : "BLOCKED"})\n` : "") +
      (vp ? `• Volume Profile Value Area: ${vp.val} - ${vp.vah} (POC: ${vp.poc})\n` : "") +
      (vwap ? `• Anchored VWAP: ${vwap.vwap} (Pos: ${vwap.pricePosition} | ±2σ: ${vwap.lowerBand2}-${vwap.upperBand2})\n` : "") +
      (cvd ? `• CVD Flow: ${cvd.cvdTrend} (${cvd.divergence !== "NONE" ? cvd.divergence : `Buyer ${cvd.buyerVolumeRatio}%`})\n` : "") +
      (ob && ob.nearestBlock ? `• SMC Block: ${ob.nearestBlock.type} (${ob.nearestBlock.priceMin}-${ob.nearestBlock.priceMax})\n` : "") +
      (swp && swp.sweepType !== "NONE" ? `• Liquidity Sweep: ${swp.sweepType} (${swp.sweptLevel ? `Level ${swp.sweptLevel} | ${swp.sweptSession} (+${swp.sweepDistancePips} pips)` : ""})\n` : "") +
      (fib ? `• Fibonacci Clusters: ${fib.confluenceCount} Levels (${fib.clusterZone.min}-${fib.clusterZone.max})\n` : "") +
      (rv ? `• Realized Volatility: ${rv.volState} (${rv.realizedVol}%, Buffer ${rv.recommendedBufferMultiplier}x)\n` : "") +
      (micro ? `• Microstructure: ${micro.rejectionStrength} (Wick: ${micro.wickRatio}%)\n` : "") +
      (shield ? `• Macro Correlation Shield: ${shield.macroRegime} (${shield.shieldStatus})\n` : "") +
      `• Stop Loss: ${analysis.tradeSetup.stopLoss} (${analysis.tradeSetup.slPips || 0} Pips ${ssl ? `| ${ssl.protectionType}` : ""})\n` +
      `• Take Profit 1: ${analysis.tradeSetup.takeProfit1} (+${analysis.tradeSetup.tp1Pips || 0} Pips | Breakeven Point)\n` +
      `• Take Profit 2: ${analysis.tradeSetup.takeProfit2} (+${analysis.tradeSetup.tp2Pips || 0} Pips | Trend Runner)\n` +
      `• R:R: ${analysis.tradeSetup.riskRewardRatio}\n` +
      (kelly ? `• Kelly Sizing: Half-Kelly ${kelly.halfKellyPct}% (แนะนำเสี่ยง ${kelly.volatilityAdjustedPct}% ต่อไม้)\n` : "") +
      (be ? `• Breakeven Shield (+1.0R): ${be.actionText}\n` : "") +
      (ts ? `• Chandelier Trailing Stop: ${ts.trailingStopPrice}\n` : "") +
      (sp ? `• Broker Spread Impact: ~${sp.estimatedSpreadPips} pips (Net R:R: ${sp.effectiveRiskReward})\n` : "") +
      (td && td.isExhausted ? `• Exhaustion Warning: ${td.note}\n` : "") +
      (vd ? `• Volume Delta: ซื้อ ${vd.buyerVolumePct}% vs ขาย ${vd.sellerVolumePct}% (${vd.dominantSide})\n` : "") +
      (iq ? `• 🧠 5-Layer Quant: ML ${iq.layer3Brain.mlDirection} (${iq.layer3Brain.probabilities.buy}% Buy / ${iq.layer3Brain.probabilities.sell}% Sell) | Strategy: ${iq.layer3Brain.adaptiveStrategy.strategyMode} | WFE: ${iq.layer5Validation.walkForwardEfficiency}%\n` : "") +
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
  const iq = analysis.institutionalQuant;

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

      {/* ─── 🏛️ 5-LAYER INSTITUTIONAL QUANT ENGINE (ระดับสถาบันสากล) ─── */}
      {iq && (
        <div className="p-4 rounded-xl bg-gradient-to-br from-slate-900 via-surface-100 to-indigo-950/40 border border-indigo-500/40 shadow-xl space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-md shadow-indigo-500/20">
                <Brain className="w-5 h-5" />
              </div>
              <div>
                <h5 className="text-sm font-black text-white flex items-center gap-2">
                  <span>🏛️ 5-Layer Institutional Quant Engine</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                    AI/ML Hybrid Pipeline
                  </span>
                </h5>
                <p className="text-[10px] text-slate-400">
                  สถาปัตยกรรม 5 ชั้นระดับสถาบัน: Data Hygiene • 24-D Features • ML Brain & Regime • Dynamic Risk • Walk-Forward WFE
                </p>
              </div>
            </div>

            {/* Layer Selection Tabs (1 to 5) */}
            <div className="flex items-center bg-slate-950/80 p-1 rounded-xl border border-slate-800 text-xs font-bold">
              {[
                { id: 1, label: "L1: Data", icon: Database },
                { id: 2, label: "L2: Features", icon: Layers },
                { id: 3, label: "L3: Brain & ML", icon: Brain },
                { id: 4, label: "L4: Risk", icon: Scale },
                { id: 5, label: "L5: Walk-Forward", icon: Activity },
              ].map((tab) => {
                const Icon = tab.icon;
                const isActive = activeQuantLayer === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveQuantLayer(tab.id as 1 | 2 | 3 | 4 | 5)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                      isActive
                        ? "bg-indigo-600 text-white shadow-sm shadow-indigo-500/30"
                        : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Layer 1 Content: Data Hygiene & Macro Pipeline */}
          {activeQuantLayer === 1 && (
            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <div className="p-3 rounded-xl bg-surface-50/80 border border-slate-800 space-y-1">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-400">ความสมบูรณ์ของแท่งเทียน (Data Hygiene):</span>
                    <span className="font-mono font-bold text-emerald-400">{iq.layer1Data.dataIntegrityScore}%</span>
                  </div>
                  <div className="text-xs font-mono font-bold text-white">
                    {iq.layer1Data.cleanCandlesCount} แท่ง (กรองจุดลวง {iq.layer1Data.outliersFiltered} จุด)
                  </div>
                  <p className="text-[10px] text-slate-400">Zero Bad Ticks • ปราศจากสัญญาณไส้หลอก</p>
                </div>

                <div className="p-3 rounded-xl bg-surface-50/80 border border-slate-800 space-y-1">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-400">การกระจายตัว (Rolling Z-Score):</span>
                    <span className="font-mono font-bold text-cyan-300">Z = {iq.layer1Data.rollingZScoreRange.current}</span>
                  </div>
                  <div className="text-xs font-mono text-slate-200">
                    กรอบ 30 แท่ง: [{iq.layer1Data.rollingZScoreRange.min} ถึง {iq.layer1Data.rollingZScoreRange.max}]
                  </div>
                  <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded border ${
                    iq.layer1Data.stationarityStatus === "STATIONARY"
                      ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
                      : "bg-amber-500/20 text-amber-300 border-amber-500/30"
                  }`}>
                    {iq.layer1Data.stationarityStatus === "STATIONARY" ? "✅ ข้อมูลมีความนิ่ง (Stationary)" : "⚡ ข้อมูลมีแนวโน้ม (Trend Drift)"}
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-surface-50/80 border border-slate-800 space-y-1">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-400">ความสัมพันธ์มหภาค ({iq.layer1Data.correlation.benchmarkSymbol}):</span>
                    <span className="font-mono font-bold text-indigo-300">r = {iq.layer1Data.correlation.correlationR}</span>
                  </div>
                  <div className="text-xs font-bold text-white flex items-center gap-1.5">
                    <span className="text-[10px] px-2 py-0.5 rounded bg-indigo-500/20 border border-indigo-500/30 text-indigo-200">
                      {iq.layer1Data.correlation.correlationRegime}
                    </span>
                    <span className={`text-[10px] px-2 py-0.5 rounded border ${
                      iq.layer1Data.correlation.shieldAction === "PROCEED"
                        ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
                        : "bg-amber-500/20 text-amber-300 border-amber-500/30"
                    }`}>
                      {iq.layer1Data.correlation.shieldAction}
                    </span>
                  </div>
                  {iq.layer1Data.correlation.divergenceWarning ? (
                    <p className="text-[10px] text-amber-300">{iq.layer1Data.correlation.divergenceWarning}</p>
                  ) : (
                    <p className="text-[10px] text-slate-400">แรงส่งความสัมพันธ์มหภาคเป็นไปตามทิศทางปกติ</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Layer 2 Content: 24-D Feature Engineering Vector */}
          {activeQuantLayer === 2 && (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-xl bg-surface-50/80 border border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="text-xs">
                    <span className="text-slate-400 block text-[10px]">Bullish Weight:</span>
                    <strong className="text-emerald-400 font-mono text-sm">{iq.layer2Features.aggregateBullScore}%</strong>
                  </div>
                  <div className="text-xs">
                    <span className="text-slate-400 block text-[10px]">Bearish Weight:</span>
                    <strong className="text-rose-400 font-mono text-sm">{iq.layer2Features.aggregateBearScore}%</strong>
                  </div>
                  <div className="text-xs border-l border-slate-800 pl-3">
                    <span className="text-slate-400 block text-[10px]">หมวดเด่นที่มีอิทธิพลสูงสุด:</span>
                    <strong className="text-indigo-300 font-mono text-xs">{iq.layer2Features.dominantCategory}</strong>
                  </div>
                </div>
                <div className="text-[11px] text-slate-300 italic">
                  {iq.layer2Features.summary}
                </div>
              </div>

              {/* 24 Features Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                {iq.layer2Features.features.map((f, idx) => (
                  <div
                    key={idx}
                    className="p-2 rounded-lg bg-surface-50/60 border border-slate-800 space-y-1 hover:border-indigo-500/40 transition-colors"
                  >
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="text-slate-400 truncate max-w-[100px]">{f.name}</span>
                      <span className={`font-bold font-mono px-1 rounded ${
                        f.signal === "BULLISH"
                          ? "text-emerald-400 bg-emerald-500/10"
                          : f.signal === "BEARISH"
                          ? "text-rose-400 bg-rose-500/10"
                          : "text-slate-400 bg-slate-800"
                      }`}>
                        {f.value > 0 ? `+${f.value}` : f.value}
                      </span>
                    </div>
                    <div className="text-[9px] text-slate-400 truncate" title={f.description}>
                      {f.description}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Layer 3 Content: ML Brain & Dynamic Strategy Switching */}
          {activeQuantLayer === 3 && (
            <div className="space-y-3.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* ML Inference Probabilities */}
                <div className="p-3.5 rounded-xl bg-surface-50/90 border border-slate-800 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Cpu className="w-4 h-4 text-indigo-400" />
                      <span className="text-xs font-bold text-white">Random Forest Ensemble Inference</span>
                    </div>
                    <span className={`text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full border ${
                      iq.layer3Brain.mlDirection === "BUY"
                        ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                        : iq.layer3Brain.mlDirection === "SELL"
                        ? "bg-rose-500/20 text-rose-300 border-rose-500/40"
                        : "bg-surface-100 text-slate-300 border-slate-700"
                    }`}>
                      {iq.layer3Brain.mlDirection} ({iq.layer3Brain.confidence}% Conf)
                    </span>
                  </div>

                  {/* 3-Part Probability Bar */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px] font-mono">
                      <span className="text-emerald-400">BUY: {iq.layer3Brain.probabilities.buy}%</span>
                      <span className="text-slate-400">WAIT/CHOP: {iq.layer3Brain.probabilities.neutral}%</span>
                      <span className="text-rose-400">SELL: {iq.layer3Brain.probabilities.sell}%</span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-slate-900 flex overflow-hidden border border-slate-800">
                      <div className="bg-emerald-500 transition-all duration-500" style={{ width: `${iq.layer3Brain.probabilities.buy}%` }} />
                      <div className="bg-slate-700 transition-all duration-500" style={{ width: `${iq.layer3Brain.probabilities.neutral}%` }} />
                      <div className="bg-rose-500 transition-all duration-500" style={{ width: `${iq.layer3Brain.probabilities.sell}%` }} />
                    </div>
                  </div>

                  {/* Feature Importance Leaderboard */}
                  <div className="space-y-1.5 pt-1 border-t border-slate-800">
                    <span className="text-[10px] font-bold text-slate-400 block">
                      Top 5 Feature Importance (SHAP-like Contribution Weights):
                    </span>
                    <div className="space-y-1">
                      {iq.layer3Brain.featureImportance.map((item, idx) => (
                        <div key={idx} className="flex items-center justify-between text-[11px]">
                          <span className="text-slate-300 flex items-center gap-1.5">
                            <span className="text-indigo-400 font-mono font-bold">#{idx + 1}</span>
                            <span>{item.featureName}</span>
                          </span>
                          <div className="flex items-center gap-2">
                            <div className="w-16 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                              <div className="h-full bg-indigo-400 rounded-full" style={{ width: `${Math.min(100, item.weight * 3.5)}%` }} />
                            </div>
                            <span className="font-mono text-[10px] font-bold text-indigo-300">
                              {item.weight}%
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Regime-Adaptive Strategy Switching */}
                <div className="p-3.5 rounded-xl bg-surface-50/90 border border-slate-800 space-y-2.5 flex flex-col justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Zap className="w-4 h-4 text-amber-400" />
                        <span className="text-xs font-bold text-white">Dynamic Regime Strategy Switching</span>
                      </div>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold">
                        {iq.layer3Brain.adaptiveStrategy.strategyMode}
                      </span>
                    </div>

                    <div className="text-xs font-bold text-indigo-300">
                      กลยุทธ์ที่เปิดใช้งาน: {iq.layer3Brain.adaptiveStrategy.strategyName}
                    </div>

                    <p className="text-[11px] text-slate-300 leading-relaxed bg-slate-900/60 p-2 rounded-lg border border-slate-800">
                      {iq.layer3Brain.adaptiveStrategy.tacticalExecution}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-slate-800">
                    <div className="p-2 rounded bg-surface-100 border border-slate-800">
                      <span className="text-[10px] text-slate-400 block">Risk Multiplier:</span>
                      <strong className="text-emerald-400 font-mono">{iq.layer3Brain.adaptiveStrategy.riskMultiplier}x Normal</strong>
                    </div>
                    <div className="p-2 rounded bg-surface-100 border border-slate-800">
                      <span className="text-[10px] text-slate-400 block">Target R:R:</span>
                      <strong className="text-indigo-300 font-mono">{iq.layer3Brain.adaptiveStrategy.targetRR}</strong>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Layer 4 Content: Risk Management & Dynamic Bracket */}
          {activeQuantLayer === 4 && (
            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <div className="p-3 rounded-xl bg-surface-50/80 border border-slate-800 space-y-1">
                  <span className="text-[11px] text-slate-400 block">ATR Volatility Lot Size:</span>
                  <div className="text-base font-mono font-black text-emerald-400">
                    {iq.layer4Risk.calculatedLotSize} Lots
                  </div>
                  <p className="text-[10px] text-slate-400">
                    คุมความเสี่ยง {iq.layer4Risk.riskPct}% (${iq.layer4Risk.dollarRisk}) บนระยะ SL {iq.layer4Risk.slPips} pips
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-surface-50/80 border border-slate-800 space-y-1">
                  <span className="text-[11px] text-slate-400 block">Fractional Kelly Criterion:</span>
                  <div className="text-base font-mono font-black text-indigo-300">
                    {iq.layer4Risk.fractionalKellyLot} Lots (f* = {iq.layer4Risk.kellyFraction})
                  </div>
                  <p className="text-[10px] text-slate-400">
                    Half-Kelly ป้องกัน Over-leverage ตามสถิติ Win Rate & Profit Factor
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-surface-50/80 border border-slate-800 space-y-1">
                  <span className="text-[11px] text-slate-400 block">Institutional Confidence Gate:</span>
                  <div className="flex items-center gap-1.5">
                    <span className={`text-xs font-bold font-mono px-2 py-0.5 rounded border ${
                      iq.layer4Risk.confidenceGateStatus === "APPROVED"
                        ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                        : iq.layer4Risk.confidenceGateStatus === "CAUTION_HALF_RISK"
                        ? "bg-amber-500/20 text-amber-300 border-amber-500/40"
                        : "bg-rose-500/20 text-rose-300 border-rose-500/40"
                    }`}>
                      {iq.layer4Risk.confidenceGateStatus}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-300 leading-tight">
                    {iq.layer4Risk.gateReason}
                  </p>
                </div>
              </div>

              {/* Dynamic 3-Stage Bracket Diagram */}
              <div className="p-3 rounded-xl bg-surface-50/90 border border-slate-800 space-y-2">
                <span className="text-[11px] font-bold text-white block">
                  🎯 Dynamic Multi-Stage Bracket Execution:
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-center text-xs font-mono">
                  <div className="p-2 rounded bg-surface-100 border border-slate-800">
                    <span className="text-[9px] text-slate-400 block">1. Entry Zone</span>
                    <strong className="text-amber-300 text-xs">
                      {iq.layer4Risk.executionBracket.entryZone.min} - {iq.layer4Risk.executionBracket.entryZone.max}
                    </strong>
                  </div>
                  <div className="p-2 rounded bg-surface-100 border border-rose-500/30">
                    <span className="text-[9px] text-rose-400 block">2. Structural SL</span>
                    <strong className="text-rose-300 text-xs">
                      {iq.layer4Risk.executionBracket.structuralSL}
                    </strong>
                  </div>
                  <div className="p-2 rounded bg-surface-100 border border-cyan-500/30">
                    <span className="text-[9px] text-cyan-400 block">3. BE Shield Trigger (+1.0R)</span>
                    <strong className="text-cyan-300 text-xs">
                      {iq.layer4Risk.executionBracket.beTriggerPrice}
                    </strong>
                  </div>
                  <div className="p-2 rounded bg-surface-100 border border-emerald-500/30">
                    <span className="text-[9px] text-emerald-400 block">4. TP1 (+1.2R / 50% Close)</span>
                    <strong className="text-emerald-300 text-xs">
                      {iq.layer4Risk.executionBracket.tp1Price}
                    </strong>
                  </div>
                  <div className="p-2 rounded bg-surface-100 border border-indigo-500/30">
                    <span className="text-[9px] text-indigo-400 block">5. TP2 (+2.5R Trailing)</span>
                    <strong className="text-indigo-300 text-xs">
                      {iq.layer4Risk.executionBracket.tp2Price}
                    </strong>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Layer 5 Content: Walk-Forward Validation & Feedback */}
          {activeQuantLayer === 5 && (
            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <div className="p-3 rounded-xl bg-surface-50/80 border border-slate-800 space-y-1">
                  <span className="text-[11px] text-slate-400 block">Walk-Forward Efficiency (WFE):</span>
                  <div className="flex items-baseline gap-2">
                    <span className="text-xl font-mono font-black text-emerald-400">
                      {iq.layer5Validation.walkForwardEfficiency}%
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      {iq.layer5Validation.robustnessGrade}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400">
                    WFE &gt; 70% พิสูจน์ว่าระบบไม่เกิด Curve-Fitting
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-surface-50/80 border border-slate-800 space-y-1">
                  <span className="text-[11px] text-slate-400 block">In-Sample vs Out-of-Sample (OOS):</span>
                  <div className="text-xs font-mono font-bold space-y-0.5">
                    <div className="text-slate-300">In-Sample Win Rate: <span className="text-indigo-300">{iq.layer5Validation.avgISWinRate}%</span></div>
                    <div className="text-slate-300">Out-of-Sample Win Rate: <span className="text-emerald-400">{iq.layer5Validation.avgOOSWinRate}%</span></div>
                  </div>
                  <p className="text-[10px] text-slate-400">ทดสอบบนข้อมูลช่วงเวลาอนาคตที่โมเดลไม่เคยเห็น</p>
                </div>

                <div className="p-3 rounded-xl bg-surface-50/80 border border-slate-800 space-y-1">
                  <span className="text-[11px] text-slate-400 block">Triple Barrier Event Distribution:</span>
                  <div className="text-xs font-mono space-y-0.5">
                    <span className="text-emerald-400 block">Upper TP Hit: {iq.layer5Validation.tripleBarrierStats.hitUpperTP} ไม้</span>
                    <span className="text-rose-400 block">Lower SL Hit: {iq.layer5Validation.tripleBarrierStats.hitLowerSL} ไม้</span>
                    <span className="text-slate-400 block">Vertical Timeouts: {iq.layer5Validation.tripleBarrierStats.hitVerticalTimeout} ไม้</span>
                  </div>
                </div>
              </div>

              {/* Rolling 5-Fold Walk-Forward Table */}
              <div className="p-3 rounded-xl bg-surface-50/90 border border-slate-800 space-y-2">
                <span className="text-[11px] font-bold text-white block">
                  📊 Rolling K-Fold Walk-Forward Matrix (5 Folds):
                </span>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs font-mono">
                    <thead>
                      <tr className="border-b border-slate-800 text-[10px] text-slate-400">
                        <th className="pb-1.5">Fold #</th>
                        <th className="pb-1.5">In-Sample (IS) Win %</th>
                        <th className="pb-1.5">Out-of-Sample (OOS) Win %</th>
                        <th className="pb-1.5">OOS Profit Factor</th>
                        <th className="pb-1.5 text-right">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 text-[11px]">
                      {iq.layer5Validation.folds.map((f) => (
                        <tr key={f.foldIndex} className="hover:bg-slate-800/30">
                          <td className="py-1.5 font-bold text-indigo-300">Fold {f.foldIndex}</td>
                          <td className="py-1.5 text-slate-300">{f.isWinRate}% (PF: {f.isProfitFactor})</td>
                          <td className="py-1.5 text-emerald-400 font-bold">{f.oosWinRate}%</td>
                          <td className="py-1.5 text-cyan-300">{f.oosProfitFactor}x</td>
                          <td className="py-1.5 text-right">
                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                              f.passed ? "bg-emerald-500/20 text-emerald-300" : "bg-rose-500/20 text-rose-300"
                            }`}>
                              {f.passed ? "PASS" : "FAIL"}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="text-[10px] text-slate-400 pt-1 italic">
                  {iq.layer5Validation.summary}
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 5c. 🎯 Institutional Order Flow & Sniper Precision Suite (Plans 11-15) */}
      {(analysis.oteZone || analysis.volumeDelta || analysis.roundLevel) && (
        <div className="p-4 rounded-xl bg-surface-100 border border-slate-700/60 space-y-3.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/30">
                <Target className="w-4 h-4" />
              </div>
              <div>
                <h5 className="text-xs font-bold text-white flex items-center gap-2">
                  <span>Institutional Order Flow & Sniper Precision (แผน 11-15)</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    Smart Money Engine
                  </span>
                </h5>
                <p className="text-[10px] text-slate-400">ผสานโซนย่อซื้อ OTE 61.8%-78.6%, สัดส่วน Volume Delta และแรงดึงดูดตัวเลขกลม</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* 1. OTE Golden Pocket */}
            {analysis.oteZone && (
              <div className="p-3 rounded-xl bg-surface-100/90 border border-slate-800 space-y-1.5">
                <div className="flex items-center justify-between text-[11px] font-bold">
                  <span className="text-slate-300">🎯 OTE Golden Pocket</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded font-mono ${
                    analysis.oteZone.isPriceInOTE
                      ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                      : "bg-surface-50 text-slate-400 border border-slate-800"
                  }`}>
                    {analysis.oteZone.isPriceInOTE ? "⚡ In Zone" : "Waiting"}
                  </span>
                </div>
                <div className="space-y-1 text-xs">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-400">Fib 61.8% - 78.6%:</span>
                    <span className="font-mono font-bold text-amber-300">
                      {analysis.oteZone.oteMin} - {analysis.oteZone.oteMax}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-400">Sweet Spot (70.5%):</span>
                    <span className="font-mono font-bold text-emerald-300">
                      {analysis.oteZone.sweetSpot}
                    </span>
                  </div>
                </div>
                <p className="text-[10px] text-slate-400 leading-tight pt-1 border-t border-slate-800/80">
                  {analysis.oteZone.description}
                </p>
              </div>
            )}

            {/* 2. Volume Delta & Imbalance */}
            {analysis.volumeDelta && (
              <div className="p-3 rounded-xl bg-surface-100/90 border border-slate-800 space-y-1.5">
                <div className="flex items-center justify-between text-[11px] font-bold">
                  <span className="text-slate-300">⚖️ Volume Delta Flow</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded font-mono ${
                    analysis.volumeDelta.dominantSide === "BUYERS"
                      ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                      : analysis.volumeDelta.dominantSide === "SELLERS"
                      ? "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                      : "bg-surface-50 text-slate-400 border border-slate-800"
                  }`}>
                    {analysis.volumeDelta.dominantSide}
                  </span>
                </div>
                <div className="space-y-1 pt-0.5">
                  <div className="flex items-center justify-between text-[10px] font-mono">
                    <span className="text-emerald-400 font-bold">ซื้อ {analysis.volumeDelta.buyerVolumePct}%</span>
                    <span className="text-rose-400 font-bold">ขาย {analysis.volumeDelta.sellerVolumePct}%</span>
                  </div>
                  <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden flex">
                    <div className="h-full bg-emerald-500" style={{ width: `${analysis.volumeDelta.buyerVolumePct}%` }}></div>
                    <div className="h-full bg-rose-500" style={{ width: `${analysis.volumeDelta.sellerVolumePct}%` }}></div>
                  </div>
                </div>
                <p className="text-[10px] text-slate-400 leading-tight pt-1 border-t border-slate-800/80">
                  {analysis.volumeDelta.description}
                </p>
                {analysis.volumeDelta.isAbsorption && (
                  <div className="p-1 rounded bg-amber-500/10 border border-amber-500/30 text-[10px] text-amber-300 font-bold text-center">
                    🔥 ตรวจพบสถาบันดูดซับสภาพคล่อง (Absorption)
                  </div>
                )}
              </div>
            )}

            {/* 3. Psychological Round Number Gravity */}
            {analysis.roundLevel && (
              <div className="p-3 rounded-xl bg-surface-100/90 border border-slate-800 space-y-1.5">
                <div className="flex items-center justify-between text-[11px] font-bold">
                  <span className="text-slate-300">🧲 Round Number Gravity</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded font-mono ${
                    analysis.roundLevel.isMagnetZone
                      ? "bg-purple-500/20 text-purple-300 border border-purple-500/30"
                      : "bg-surface-50 text-slate-400 border border-slate-800"
                  }`}>
                    {analysis.roundLevel.isMagnetZone ? "🧲 Magnet Active" : "Neutral"}
                  </span>
                </div>
                <div className="space-y-1 text-xs">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-400">เลขกลมหลัก (Major Level):</span>
                    <span className="font-mono font-bold text-indigo-300">
                      {analysis.roundLevel.nearestMajor}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-400">ระยะห่างจากราคาปัจจุบัน:</span>
                    <span className="font-mono font-bold text-slate-200">
                      {analysis.roundLevel.distancePips} pips
                    </span>
                  </div>
                </div>
                <p className="text-[10px] text-slate-400 leading-tight pt-1 border-t border-slate-800/80">
                  {analysis.roundLevel.description}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 5d. 📊 Advanced Market Profile, Exhaustion & Order Flow Suite (Plans 16-20) */}
      {(analysis.volumeProfile || analysis.tdSequential) && (
        <div className="p-4 rounded-xl bg-surface-100 border border-slate-700/60 space-y-3.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                <BarChart3 className="w-4 h-4" />
              </div>
              <div>
                <h5 className="text-xs font-bold text-white flex items-center gap-2">
                  <span>Institutional Market Profile & Exhaustion Shield (แผน 16-20)</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                    Precision Profile
                  </span>
                </h5>
                <p className="text-[10px] text-slate-400">
                  ตรวจจับจุดรวมสภาพคล่องสถาบัน (Volume Profile Value Area 70%) และดักจับจุดหมดแรงแท่งเทียน 9 สเต็ป (TD Sequential 9)
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* 1. Session Volume Profile (POC, VAH, VAL) */}
            {analysis.volumeProfile && (
              <div className="p-3 rounded-xl bg-surface-100/90 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between text-[11px] font-bold">
                  <span className="text-slate-300">📊 Volume Profile Value Area (70%)</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded font-mono ${
                    analysis.volumeProfile.isInsideValueArea
                      ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                      : "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                  }`}>
                    {analysis.volumeProfile.isInsideValueArea ? "⚖️ Fair Value Zone" : "⚡ Out of Value Area"}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center py-1">
                  <div className="p-2 rounded-lg bg-slate-900/60 border border-slate-800">
                    <span className="text-[9px] text-slate-400 block font-semibold">VAH (กรอบบน 70%)</span>
                    <span className="text-xs font-mono font-bold text-emerald-300">{analysis.volumeProfile.vah}</span>
                  </div>
                  <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/40">
                    <span className="text-[9px] text-amber-300 block font-black">POC (จุดหนาแน่นสูงสุด)</span>
                    <span className="text-xs font-mono font-black text-amber-300">{analysis.volumeProfile.poc}</span>
                  </div>
                  <div className="p-2 rounded-lg bg-slate-900/60 border border-slate-800">
                    <span className="text-[9px] text-slate-400 block font-semibold">VAL (กรอบล่าง 70%)</span>
                    <span className="text-xs font-mono font-bold text-rose-300">{analysis.volumeProfile.val}</span>
                  </div>
                </div>

                <p className="text-[10px] text-slate-400 leading-tight pt-1 border-t border-slate-800/80">
                  {analysis.volumeProfile.description}
                </p>
              </div>
            )}

            {/* 2. TD Sequential 9 Momentum Exhaustion */}
            {analysis.tdSequential && (
              <div className="p-3 rounded-xl bg-surface-100/90 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between text-[11px] font-bold">
                  <span className="text-slate-300">⏱️ TD Sequential 9 Exhaustion Shield</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded font-mono ${
                    analysis.tdSequential.isExhausted
                      ? "bg-rose-500/20 text-rose-300 border border-rose-500/40 font-bold animate-pulse"
                      : "bg-surface-50 text-slate-400 border border-slate-800"
                  }`}>
                    {analysis.tdSequential.exhaustionType === "BUY_EXHAUSTION_9"
                      ? "🛑 BUY EXHAUSTION 9"
                      : analysis.tdSequential.exhaustionType === "SELL_EXHAUSTION_9"
                      ? "🟢 SELL EXHAUSTION 9"
                      : `Setup Count: ${Math.max(analysis.tdSequential.buySetupCount, analysis.tdSequential.sellSetupCount)}/9`}
                  </span>
                </div>

                {/* Progress bar visual for 9 counts */}
                <div className="space-y-1 py-1">
                  <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                    <span>
                      {analysis.tdSequential.buySetupCount > 0
                        ? `Buy Sequence: ${analysis.tdSequential.buySetupCount}/9`
                        : `Sell Sequence: ${analysis.tdSequential.sellSetupCount}/9`}
                    </span>
                    <span>{analysis.tdSequential.isExhausted ? "⚠️ Trigger Reversal" : "Building Trend"}</span>
                  </div>
                  <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden flex">
                    <div
                      className={`h-full transition-all ${
                        analysis.tdSequential.isExhausted
                          ? "bg-rose-500"
                          : analysis.tdSequential.buySetupCount > 0
                          ? "bg-emerald-500"
                          : "bg-amber-500"
                      }`}
                      style={{
                        width: `${(Math.max(analysis.tdSequential.buySetupCount, analysis.tdSequential.sellSetupCount) / 9) * 100}%`,
                      }}
                    />
                  </div>
                </div>

                <p className="text-[10px] text-slate-400 leading-tight pt-1 border-t border-slate-800/80">
                  {analysis.tdSequential.note}
                </p>

                {analysis.tdSequential.isExhausted && (
                  <div className="p-1.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-[10px] text-rose-300 font-medium">
                    🛡️ <strong>Safety Lock 7 Active:</strong> ระบบล็อคห้ามตามน้ำ ณ จุดปลายคลื่นแท่งที่ 9 เพื่อป้องกันการติดดอย/ก้นเหว
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 5e. 🏛️ Institutional SMC, Anchored VWAP & CVD Matrix (Plans 21-25) */}
      {(analysis.anchoredVwap || analysis.cvd || analysis.orderBlocks) && (
        <div className="p-4 rounded-xl bg-surface-100 border border-slate-700/60 space-y-3.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-teal-500/20 text-teal-300 border border-teal-500/30">
                <Layers className="w-4 h-4" />
              </div>
              <div>
                <h5 className="text-xs font-bold text-white flex items-center gap-2">
                  <span>Institutional SMC, Anchored VWAP & CVD Matrix (แผน 21-25)</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal-500/20 text-teal-300 border border-teal-500/30">
                    Quant SMC Matrix
                  </span>
                </h5>
                <p className="text-[10px] text-slate-400">
                  ผสานเส้นเฉลี่ยถ่วงน้ำหนักวอลุ่ม (Anchored VWAP ±3σ), การไหลของแรงซื้อขายสะสม (CVD) และโครงสร้างบล็อกสถาบัน (SMC Order & Breaker Block)
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* 1. Anchored Multi-Band VWAP (±1σ, ±2σ, ±3σ) */}
            {analysis.anchoredVwap && (
              <div className="p-3 rounded-xl bg-surface-100/90 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between text-[11px] font-bold">
                  <span className="text-slate-300">🌐 Anchored Multi-Band VWAP</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded font-mono ${
                    analysis.anchoredVwap.pricePosition === "OVERBOUGHT_EXTREME"
                      ? "bg-rose-500/20 text-rose-300 border border-rose-500/40"
                      : analysis.anchoredVwap.pricePosition === "OVERSOLD_EXTREME"
                      ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                      : analysis.anchoredVwap.pricePosition === "ABOVE_VWAP"
                      ? "bg-teal-500/20 text-teal-300 border border-teal-500/30"
                      : "bg-surface-50 text-slate-400 border border-slate-800"
                  }`}>
                    {analysis.anchoredVwap.pricePosition}
                  </span>
                </div>

                <div className="space-y-1 text-xs">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-400">เส้นหลักสถาบัน (VWAP):</span>
                    <span className="font-mono font-black text-amber-300">
                      {analysis.anchoredVwap.vwap}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-400">Mean Reversion (±2σ):</span>
                    <span className="font-mono font-bold text-teal-300">
                      {analysis.anchoredVwap.lowerBand2} - {analysis.anchoredVwap.upperBand2}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-400">Exhaustion Zone (±3σ):</span>
                    <span className="font-mono text-rose-300">
                      {analysis.anchoredVwap.lowerBand3} - {analysis.anchoredVwap.upperBand3}
                    </span>
                  </div>
                </div>

                <p className="text-[10px] text-slate-400 leading-tight pt-1 border-t border-slate-800/80">
                  {analysis.anchoredVwap.description}
                </p>
              </div>
            )}

            {/* 2. Cumulative Volume Delta (CVD) Divergence Engine */}
            {analysis.cvd && (
              <div className="p-3 rounded-xl bg-surface-100/90 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between text-[11px] font-bold">
                  <span className="text-slate-300">🌊 CVD Flow & Divergence</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded font-mono ${
                    analysis.cvd.divergence === "BULLISH_CVD_DIVERGENCE"
                      ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold"
                      : analysis.cvd.divergence === "BEARISH_CVD_DIVERGENCE"
                      ? "bg-rose-500/20 text-rose-300 border border-rose-500/40 font-bold"
                      : "bg-surface-50 text-slate-400 border border-slate-800"
                  }`}>
                    {analysis.cvd.divergence !== "NONE" ? analysis.cvd.divergence : `Trend: ${analysis.cvd.cvdTrend}`}
                  </span>
                </div>

                <div className="space-y-1.5 pt-0.5">
                  <div className="flex items-center justify-between text-[10px] font-mono">
                    <span className="text-emerald-400 font-bold">ซื้อสะสม {analysis.cvd.buyerVolumeRatio}%</span>
                    <span className="text-rose-400 font-bold">ขายสะสม {(100 - analysis.cvd.buyerVolumeRatio).toFixed(1)}%</span>
                  </div>
                  <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden flex">
                    <div className="h-full bg-emerald-500" style={{ width: `${analysis.cvd.buyerVolumeRatio}%` }}></div>
                    <div className="h-full bg-rose-500" style={{ width: `${100 - analysis.cvd.buyerVolumeRatio}%` }}></div>
                  </div>
                  <div className="flex items-center justify-between text-[11px] font-mono">
                    <span className="text-slate-400">Cumulative Delta:</span>
                    <span className={`font-bold ${analysis.cvd.currentCVD >= 0 ? "text-emerald-300" : "text-rose-300"}`}>
                      {analysis.cvd.currentCVD > 0 ? `+${analysis.cvd.currentCVD}` : analysis.cvd.currentCVD}
                    </span>
                  </div>
                </div>

                <p className="text-[10px] text-slate-400 leading-tight pt-1 border-t border-slate-800/80">
                  {analysis.cvd.description}
                </p>
                {analysis.cvd.absorptionDetected && (
                  <div className="p-1 rounded bg-teal-500/10 border border-teal-500/30 text-[10px] text-teal-300 font-bold text-center">
                    ⚡ สถาบันซับแรงคำสั่งซื้อขาย (Absorption Divergence Active)
                  </div>
                )}
              </div>
            )}

            {/* 3. SMC Order Block Mitigation & Breaker Block Validator */}
            {analysis.orderBlocks && (
              <div className="p-3 rounded-xl bg-surface-100/90 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between text-[11px] font-bold">
                  <span className="text-slate-300">🧱 SMC Order Block & Breakers</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded font-mono ${
                    analysis.orderBlocks.isRetestingBreaker
                      ? "bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold animate-pulse"
                      : analysis.orderBlocks.hasUnmitigatedOB
                      ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                      : "bg-surface-50 text-slate-400 border border-slate-800"
                  }`}>
                    {analysis.orderBlocks.isRetestingBreaker
                      ? "🔥 Breaker Retest"
                      : analysis.orderBlocks.hasUnmitigatedOB
                      ? "🟢 Fresh OB"
                      : "Mitigated"}
                  </span>
                </div>

                {analysis.orderBlocks.nearestBlock ? (
                  <div className="space-y-1 text-xs">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-400">บล็อกใกล้สุด ({analysis.orderBlocks.nearestBlock.type}):</span>
                      <span className="font-mono font-bold text-indigo-300">
                        {analysis.orderBlocks.nearestBlock.priceMin} - {analysis.orderBlocks.nearestBlock.priceMax}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-400">สถานะบล็อก:</span>
                      <span className="font-mono text-slate-200">
                        {analysis.orderBlocks.nearestBlock.isBreaker ? "⚡ Breaker Flipped" : analysis.orderBlocks.nearestBlock.isMitigated ? "Mitigated (ทดสอบแล้ว)" : "Unmitigated (สดใหม่)"}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="text-[11px] text-slate-400">กำลังสแกนโครงสร้างบล็อกสถาบัน...</div>
                )}

                <p className="text-[10px] text-slate-400 leading-tight pt-1 border-t border-slate-800/80">
                  {analysis.orderBlocks.description}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 5f. 🏹 Institutional Sweeps, Fib Clusters & Correlation Shield (Plans 26-30) */}
      {(analysis.sessionSweep || analysis.fibonacciCluster || analysis.realizedVolatility || analysis.correlationShield) && (
        <div className="p-4 rounded-xl bg-surface-100 border border-slate-700/60 space-y-3.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                <Target className="w-4 h-4" />
              </div>
              <div>
                <h5 className="text-xs font-bold text-white flex items-center gap-2">
                  <span>Session Liquidity Sweeps, Fib Clusters & Macro Shield (แผน 26-30)</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                    Institutional Liquidity & Volatility
                  </span>
                </h5>
                <p className="text-[10px] text-slate-400">
                  ตรวจจับการกวาดสภาพคล่องเซสชั่น (Turtle Soup), คลัสเตอร์ฟิโบนักชี 3D, ความผันผวน Parkinson Realized Volatility และ Macro Correlation Hedge Shield
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* 1. Session Liquidity Sweeps */}
            {analysis.sessionSweep && (
              <div className="p-3 rounded-xl bg-surface-100/90 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between text-[11px] font-bold">
                  <span className="text-slate-300">🏹 Session Sweep Alert</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded font-mono ${
                    analysis.sessionSweep.sweepType !== "NONE"
                      ? "bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold animate-pulse"
                      : "bg-surface-50 text-slate-400 border border-slate-800"
                  }`}>
                    {analysis.sessionSweep.sweepType !== "NONE" ? analysis.sessionSweep.sweepType : "No Sweep"}
                  </span>
                </div>
                <div className="space-y-1 text-xs">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-400">Swept Session:</span>
                    <span className="font-mono text-slate-300">{analysis.sessionSweep.sweptSession}</span>
                  </div>
                  {analysis.sessionSweep.sweptLevel > 0 && (
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-400">Swept Level:</span>
                      <span className="font-mono font-bold text-rose-300">
                        {analysis.sessionSweep.sweptLevel} (+{analysis.sessionSweep.sweepDistancePips} pips)
                      </span>
                    </div>
                  )}
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-400">Turtle Soup:</span>
                    <span className="font-mono text-emerald-400">{analysis.sessionSweep.isTurtleSoup ? "⚡ Active Setup" : "None"}</span>
                  </div>
                </div>
                <p className="text-[10px] text-slate-400 leading-tight pt-1 border-t border-slate-800/80">
                  {analysis.sessionSweep.description}
                </p>
              </div>
            )}

            {/* 2. Fibonacci Multi-Timeframe Clusters */}
            {analysis.fibonacciCluster && (
              <div className="p-3 rounded-xl bg-surface-100/90 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between text-[11px] font-bold">
                  <span className="text-slate-300">📐 Fibonacci 3D Clusters</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded font-mono ${
                    analysis.fibonacciCluster.isPriceInCluster
                      ? "bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold"
                      : analysis.fibonacciCluster.confluenceCount >= 2
                      ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                      : "bg-surface-50 text-slate-400 border border-slate-800"
                  }`}>
                    {analysis.fibonacciCluster.confluenceCount} Confluences
                  </span>
                </div>
                <div className="space-y-1 text-xs">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-400">Golden Zone:</span>
                    <span className="font-mono font-bold text-amber-300">
                      {analysis.fibonacciCluster.clusterZone.min} - {analysis.fibonacciCluster.clusterZone.max}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-400">สถานะราคา:</span>
                    <span className="font-mono text-slate-200">
                      {analysis.fibonacciCluster.isPriceInCluster ? "🎯 Inside Golden Zone" : "Outside Zone"}
                    </span>
                  </div>
                </div>
                <p className="text-[10px] text-slate-400 leading-tight pt-1 border-t border-slate-800/80">
                  {analysis.fibonacciCluster.description}
                </p>
              </div>
            )}

            {/* 3. Realized Volatility & Microstructure */}
            {(analysis.realizedVolatility || analysis.candleMicrostructure) && (
              <div className="p-3 rounded-xl bg-surface-100/90 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between text-[11px] font-bold">
                  <span className="text-slate-300">⚡ Realized Vol & Micro</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded font-mono ${
                    analysis.realizedVolatility?.volState === "EXPANSION"
                      ? "bg-rose-500/20 text-rose-300 border border-rose-500/40 font-bold"
                      : analysis.realizedVolatility?.volState === "COMPRESSION"
                      ? "bg-teal-500/20 text-teal-300 border border-teal-500/30 font-bold"
                      : "bg-surface-50 text-slate-400 border border-slate-800"
                  }`}>
                    {analysis.realizedVolatility?.volState || "NORMAL"}
                  </span>
                </div>
                <div className="space-y-1 text-xs">
                  {analysis.realizedVolatility && (
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-400">Parkinson Vol:</span>
                      <span className="font-mono text-slate-200">{analysis.realizedVolatility.realizedVol}% (Buffer {analysis.realizedVolatility.recommendedBufferMultiplier}x)</span>
                    </div>
                  )}
                  {analysis.candleMicrostructure && (
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-400">Micro Pattern:</span>
                      <span className="font-mono text-sky-300">{analysis.candleMicrostructure.rejectionStrength}</span>
                    </div>
                  )}
                </div>
                <p className="text-[10px] text-slate-400 leading-tight pt-1 border-t border-slate-800/80">
                  {analysis.candleMicrostructure?.description || analysis.realizedVolatility?.description}
                </p>
              </div>
            )}

            {/* 4. Multi-Asset Correlation Hedge Shield */}
            {analysis.correlationShield && (
              <div className="p-3 rounded-xl bg-surface-100/90 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between text-[11px] font-bold">
                  <span className="text-slate-300">🛡️ Correlation Hedge</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded font-mono ${
                    analysis.correlationShield.macroRegime === "LIQUIDATION_ANOMALY"
                      ? "bg-rose-500/20 text-rose-300 border border-rose-500/40 font-bold animate-pulse"
                      : analysis.correlationShield.macroRegime === "DECOUPLED_SAFE_HAVEN"
                      ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold"
                      : "bg-surface-50 text-slate-400 border border-slate-800"
                  }`}>
                    {analysis.correlationShield.macroRegime}
                  </span>
                </div>
                <div className="space-y-1 text-xs">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-400">Shield Status:</span>
                    <span className="font-mono text-slate-300 text-[10px]">{analysis.correlationShield.shieldStatus}</span>
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-400">DXY Trend:</span>
                    <span className="font-mono font-bold text-indigo-300">{analysis.correlationShield.dxyTrend}</span>
                  </div>
                </div>
                <p className="text-[10px] text-slate-400 leading-tight pt-1 border-t border-slate-800/80">
                  {analysis.correlationShield.description}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 5g. 🏛️ Institutional Price Action, FVG & Premium/Discount Matrix (Plans 31-35) */}
      {(analysis.fvgMitigation || analysis.marketStructureShift || analysis.premiumDiscount || analysis.keyLevelTargets || analysis.orderFlowVelocity) && (
        <div className="p-4 rounded-xl bg-surface-100 border border-slate-700/60 space-y-3.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/30">
                <Gauge className="w-4 h-4" />
              </div>
              <div>
                <h5 className="text-xs font-bold text-white flex items-center gap-2">
                  <span>Institutional FVG, Market Structure & Premium/Discount Matrix (แผน 31-35)</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    Smart Money Price Action
                  </span>
                </h5>
                <p className="text-[10px] text-slate-400">
                  สแกน FVG Consequent Encroachment (50%), การเปลี่ยนโครงสร้างแท้จริง (MSS Displacement), กรอบ Dealing Range 0-100% (Safety Lock 10) และเป้าหมายสภาพคล่องภายนอก
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* 1. Institutional FVG & C.E. 50% Tracker */}
            {analysis.fvgMitigation && (
              <div className="p-3 rounded-xl bg-surface-100/90 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between text-[11px] font-bold">
                  <span className="text-slate-300">🕳️ FVG Imbalance Tracker</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded font-mono ${
                    analysis.fvgMitigation.bias === "BULLISH_IMBALANCE"
                      ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                      : analysis.fvgMitigation.bias === "BEARISH_IMBALANCE"
                      ? "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                      : "bg-surface-50 text-slate-400 border border-slate-800"
                  }`}>
                    {analysis.fvgMitigation.bias}
                  </span>
                </div>
                <div className="space-y-1 text-xs">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-400">Unmitigated FVGs:</span>
                    <span className="font-mono text-amber-300 font-bold">{analysis.fvgMitigation.unmitigatedCount} ช่องว่าง</span>
                  </div>
                  {analysis.fvgMitigation.recommendedEntryLimit && (
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-400">C.E. 50% Limit Entry:</span>
                      <span className="font-mono font-bold text-emerald-400">
                        {analysis.fvgMitigation.recommendedEntryLimit}
                      </span>
                    </div>
                  )}
                  {analysis.fvgMitigation.nearestFVG && (
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-400">สถานะ FVG ใกล้สุด:</span>
                      <span className="font-mono text-[10px] text-slate-300">
                        {analysis.fvgMitigation.nearestFVG.mitigationStatus}
                      </span>
                    </div>
                  )}
                </div>
                <p className="text-[10px] text-slate-400 leading-tight pt-1 border-t border-slate-800/80">
                  {analysis.fvgMitigation.description}
                </p>
              </div>
            )}

            {/* 2. Market Structure Shift (MSS) */}
            {analysis.marketStructureShift && (
              <div className="p-3 rounded-xl bg-surface-100/90 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between text-[11px] font-bold">
                  <span className="text-slate-300">⚡ MSS Displacement Engine</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded font-mono ${
                    analysis.marketStructureShift.type === "BULLISH_MSS"
                      ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold"
                      : analysis.marketStructureShift.type === "BEARISH_MSS"
                      ? "bg-rose-500/20 text-rose-300 border border-rose-500/40 font-bold"
                      : "bg-surface-50 text-slate-400 border border-slate-800"
                  }`}>
                    {analysis.marketStructureShift.type !== "NONE" ? analysis.marketStructureShift.type : "Structure Intact"}
                  </span>
                </div>
                <div className="space-y-1 text-xs">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-400">Displacement:</span>
                    <span className="font-mono font-bold text-slate-200">
                      {analysis.marketStructureShift.displacementMultiplier}x ATR ({analysis.marketStructureShift.displacementVelocity})
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-400">ความถูกต้องโครงสร้าง:</span>
                    <span className={`font-mono text-[10px] ${analysis.marketStructureShift.isTrueDisplacement ? "text-emerald-400 font-bold" : "text-amber-400"}`}>
                      {analysis.marketStructureShift.isTrueDisplacement ? "⚡ True Displacement" : "Normal / Wick"}
                    </span>
                  </div>
                  {analysis.marketStructureShift.breakPrice > 0 && (
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-400">จุดเบรกโครงสร้าง:</span>
                      <span className="font-mono text-indigo-300 font-bold">
                        {analysis.marketStructureShift.breakPrice}
                      </span>
                    </div>
                  )}
                </div>
                <p className="text-[10px] text-slate-400 leading-tight pt-1 border-t border-slate-800/80">
                  {analysis.marketStructureShift.description}
                </p>
              </div>
            )}

            {/* 3. Premium vs Discount Dealing Range Matrix */}
            {analysis.premiumDiscount && (
              <div className="p-3 rounded-xl bg-surface-100/90 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between text-[11px] font-bold">
                  <span className="text-slate-300">📊 Dealing Range (P/D Matrix)</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded font-mono ${
                    analysis.premiumDiscount.zone === "EXTREME_PREMIUM"
                      ? "bg-rose-500/20 text-rose-300 border border-rose-500/40 font-bold animate-pulse"
                      : analysis.premiumDiscount.zone === "DEEP_DISCOUNT"
                      ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold animate-pulse"
                      : analysis.premiumDiscount.zone === "PREMIUM"
                      ? "bg-rose-500/10 text-rose-300 border border-rose-500/20"
                      : analysis.premiumDiscount.zone === "DISCOUNT"
                      ? "bg-emerald-500/10 text-emerald-300 border border-emerald-500/20"
                      : "bg-surface-50 text-slate-400 border border-slate-800"
                  }`}>
                    {analysis.premiumDiscount.zone} ({analysis.premiumDiscount.percentile}%)
                  </span>
                </div>

                {/* Visual Dealing Range Percentile Bar */}
                <div className="space-y-1">
                  <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden relative">
                    <div className="absolute left-0 top-0 bottom-0 bg-emerald-500/30" style={{ width: "20%" }}></div>
                    <div className="absolute left-[20%] top-0 bottom-0 bg-emerald-500/15" style={{ width: "25%" }}></div>
                    <div className="absolute left-[45%] top-0 bottom-0 bg-slate-600/30" style={{ width: "10%" }}></div>
                    <div className="absolute left-[55%] top-0 bottom-0 bg-rose-500/15" style={{ width: "25%" }}></div>
                    <div className="absolute left-[80%] top-0 bottom-0 bg-rose-500/30" style={{ width: "20%" }}></div>
                    <div
                      className="absolute top-0 bottom-0 w-1.5 bg-amber-400 shadow-md shadow-amber-400/50 rounded-full -ml-0.5"
                      style={{ left: `${analysis.premiumDiscount.percentile}%` }}
                    ></div>
                  </div>
                  <div className="flex items-center justify-between text-[9px] text-slate-500 font-mono">
                    <span>0% Deep Disc</span>
                    <span className="text-slate-400">50% Eq: {analysis.premiumDiscount.equilibrium}</span>
                    <span>100% Ext Prem</span>
                  </div>
                </div>

                <div className="space-y-1 text-xs">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-400">Safety Lock 10:</span>
                    <span className={`font-mono text-[10px] font-bold ${analysis.premiumDiscount.tradeAllowed ? "text-emerald-400" : "text-rose-400 animate-pulse"}`}>
                      {analysis.premiumDiscount.tradeAllowed ? "✅ ปลดล็อคเทรดได้" : "⛔ ห้ามเปิดออเดอร์ตามโซน"}
                    </span>
                  </div>
                </div>
                <p className="text-[10px] text-slate-400 leading-tight pt-1 border-t border-slate-800/80">
                  {analysis.premiumDiscount.description}
                </p>
              </div>
            )}

            {/* 4. Liquidity Targets & Order Flow Velocity */}
            {(analysis.keyLevelTargets || analysis.orderFlowVelocity) && (
              <div className="p-3 rounded-xl bg-surface-100/90 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between text-[11px] font-bold">
                  <span className="text-slate-300">🎯 Liquidity & Flow Velocity</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded font-mono ${
                    analysis.orderFlowVelocity?.isClimaxExhaustion
                      ? "bg-rose-500/20 text-rose-300 border border-rose-500/40 font-bold animate-pulse"
                      : (analysis.orderFlowVelocity?.velocityScore ?? 0) > 0
                      ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                      : "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                  }`}>
                    {analysis.orderFlowVelocity?.isClimaxExhaustion ? "🔥 Climax Alert" : `Vel: ${analysis.orderFlowVelocity?.velocityScore ?? 0}`}
                  </span>
                </div>
                <div className="space-y-1 text-xs">
                  {analysis.keyLevelTargets && (
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-400">เป้าสภาพคล่องใกล้สุด:</span>
                      <span className="font-mono font-bold text-amber-300">
                        {analysis.keyLevelTargets.nearestLiquidityTarget.name} ({analysis.keyLevelTargets.nearestLiquidityTarget.distancePips} pips)
                      </span>
                    </div>
                  )}
                  {analysis.orderFlowVelocity && (
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-400">สภาวะโมเมนตัม:</span>
                      <span className="font-mono text-slate-200 text-[10px]">
                        {analysis.orderFlowVelocity.momentumState}
                      </span>
                    </div>
                  )}
                </div>
                <p className="text-[10px] text-slate-400 leading-tight pt-1 border-t border-slate-800/80">
                  {analysis.keyLevelTargets?.description || analysis.orderFlowVelocity?.description}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 5h. 📈 Dynamic Multi-Stage Breakeven, Liquidity Void & MTF Structure Dashboard (Plans 36-40) */}
      {(analysis.breakevenLadder || analysis.liquidityVoid || analysis.fibonacciExtension || analysis.footprintAbsorption || analysis.mtfStructureMatrix) && (
        <div className="p-4 rounded-xl bg-surface-100 border border-slate-700/60 space-y-3.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-teal-500/20 text-teal-300 border border-teal-500/30">
                <Layers className="w-4 h-4" />
              </div>
              <div>
                <h5 className="text-xs font-bold text-white flex items-center gap-2">
                  <span>Dynamic BE Ladder, Liquidity Void & MTF Structure Dashboard (แผน 36-40)</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal-500/20 text-teal-300 border border-teal-500/30">
                    Execution & Structure Matrix
                  </span>
                </h5>
                <p className="text-[10px] text-slate-400">
                  ระบบบันไดเลื่อน SL กึ่งอัตโนมัติ 3 ขั้น, แรงดูดสุญญากาศสภาพคล่อง Liquidity Void, ตาข่าย Fibonacci Extension Mesh, ปริมาณดูดซับสถาบัน VSA และแดชบอร์ดโครงสร้าง 4 ไทม์เฟรม (Safety Lock 11)
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Card 1: Multi-Stage Breakeven Ladder (Plan 36) */}
            {analysis.breakevenLadder && (
              <div className="p-3 rounded-xl bg-surface-100/90 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between text-[11px] font-bold">
                  <span className="text-slate-300">🪜 Dynamic BE Ladder</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded font-mono ${
                    analysis.breakevenLadder.currentStage >= 2
                      ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold"
                      : analysis.breakevenLadder.currentStage === 1
                      ? "bg-teal-500/20 text-teal-300 border border-teal-500/30"
                      : "bg-surface-50 text-slate-400 border border-slate-800"
                  }`}>
                    ขั้นที่ {analysis.breakevenLadder.currentStage}/3 ({analysis.breakevenLadder.currentRMultiple > 0 ? `+${analysis.breakevenLadder.currentRMultiple}` : analysis.breakevenLadder.currentRMultiple}R)
                  </span>
                </div>
                <div className="space-y-1 text-xs">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-400">SL ที่แนะนำตอนนี้:</span>
                    <span className="font-mono text-emerald-400 font-bold">{analysis.breakevenLadder.recommendedSL}</span>
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-400">สัดส่วนแบ่งปิดกำไร:</span>
                    <span className="font-mono font-bold text-amber-300">
                      {analysis.breakevenLadder.partialCloseRecommendedPct}%
                    </span>
                  </div>
                  {/* Stages indicator */}
                  <div className="pt-1 space-y-1">
                    {analysis.breakevenLadder.stages.map((st) => (
                      <div key={st.stage} className="flex items-center justify-between text-[9px] font-mono text-slate-400">
                        <span className={st.isTriggered ? "text-emerald-300 font-bold" : "text-slate-500"}>
                          {st.isTriggered ? "✅" : "⏳"} ขั้น {st.stage} (+{st.triggerGainR}R)
                        </span>
                        <span className="text-slate-300">SL: {st.slMovePrice}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <p className="text-[10px] text-slate-400 leading-tight pt-1 border-t border-slate-800/80">
                  {analysis.breakevenLadder.actionAdvice}
                </p>
              </div>
            )}

            {/* Card 2: Liquidity Void & Fast-Fill Vacuum (Plan 37) */}
            {analysis.liquidityVoid && (
              <div className="p-3 rounded-xl bg-surface-100/90 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between text-[11px] font-bold">
                  <span className="text-slate-300">🌪️ Liquidity Void Fast-Fill</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded font-mono ${
                    analysis.liquidityVoid.vacuumDirection === "UPWARD_VACUUM"
                      ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                      : analysis.liquidityVoid.vacuumDirection === "DOWNWARD_VACUUM"
                      ? "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                      : "bg-surface-50 text-slate-400 border border-slate-800"
                  }`}>
                    {analysis.liquidityVoid.vacuumDirection !== "NONE" ? analysis.liquidityVoid.vacuumDirection : "No Big Void"}
                  </span>
                </div>
                <div className="space-y-1 text-xs">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-400">ช่องว่างค้างในตลาด:</span>
                    <span className="font-mono font-bold text-amber-300">
                      {analysis.liquidityVoid.activeVoidCount} โซน
                    </span>
                  </div>
                  {analysis.liquidityVoid.nearestVoid && (
                    <>
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-400">เป้าดูด 50% Fast-Fill:</span>
                        <span className="font-mono text-cyan-300 font-bold">
                          {analysis.liquidityVoid.nearestVoid.fillTarget50}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-400">ความน่าจะเป็นเติมเต็ม:</span>
                        <span className="font-mono text-emerald-400 font-bold">
                          {analysis.liquidityVoid.fastFillProbabilityPct}% (เติมแล้ว {analysis.liquidityVoid.nearestVoid.fillPercentage}%)
                        </span>
                      </div>
                    </>
                  )}
                </div>
                <p className="text-[10px] text-slate-400 leading-tight pt-1 border-t border-slate-800/80">
                  {analysis.liquidityVoid.description}
                </p>
              </div>
            )}

            {/* Card 3: Fibonacci Extension Mesh & VSA Footprint (Plan 38 & 39) */}
            {(analysis.fibonacciExtension || analysis.footprintAbsorption) && (
              <div className="p-3 rounded-xl bg-surface-100/90 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between text-[11px] font-bold">
                  <span className="text-slate-300">📐 Fib Mesh & Footprint</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded font-mono ${
                    analysis.footprintAbsorption?.isInstitutionalAbsorption
                      ? "bg-purple-500/20 text-purple-300 border border-purple-500/40 font-bold animate-pulse"
                      : "bg-surface-50 text-slate-400 border border-slate-800"
                  }`}>
                    {analysis.footprintAbsorption?.vsaSignal !== "NORMAL" ? analysis.footprintAbsorption?.vsaSignal : "VSA Balanced"}
                  </span>
                </div>
                <div className="space-y-1 text-xs">
                  {analysis.fibonacciExtension?.bestTakeProfitTarget && (
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-400">1.618 Golden Extension:</span>
                      <span className="font-mono font-bold text-amber-300">
                        {analysis.fibonacciExtension.bestTakeProfitTarget.price}
                      </span>
                    </div>
                  )}
                  {analysis.footprintAbsorption && (
                    <>
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-400">Effort vs Result:</span>
                        <span className={`font-mono text-[10px] font-bold ${
                          analysis.footprintAbsorption.effortVsResult === "HIGH_EFFORT_LOW_RESULT"
                            ? "text-purple-300"
                            : "text-slate-300"
                        }`}>
                          {analysis.footprintAbsorption.effortVsResult}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-400">Relative Volume:</span>
                        <span className="font-mono text-slate-200">
                          {analysis.footprintAbsorption.relativeVolume}x (Spread: {analysis.footprintAbsorption.spreadRatio}x)
                        </span>
                      </div>
                    </>
                  )}
                </div>
                <p className="text-[10px] text-slate-400 leading-tight pt-1 border-t border-slate-800/80">
                  {analysis.footprintAbsorption?.description || analysis.fibonacciExtension?.description}
                </p>
              </div>
            )}

            {/* Card 4: MTF Structure Matrix Dashboard (Plan 40 & Safety Lock 11) */}
            {analysis.mtfStructureMatrix && (
              <div className="p-3 rounded-xl bg-surface-100/90 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between text-[11px] font-bold">
                  <span className="text-slate-300">🌐 MTF Structure Matrix</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded font-mono ${
                    analysis.mtfStructureMatrix.isHTFConflict
                      ? "bg-rose-500/20 text-rose-300 border border-rose-500/40 font-bold animate-pulse"
                      : analysis.mtfStructureMatrix.overallAlignment.includes("FULL")
                      ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold"
                      : "bg-surface-50 text-slate-400 border border-slate-800"
                  }`}>
                    {analysis.mtfStructureMatrix.alignmentScorePct}% Aligned
                  </span>
                </div>

                {/* 4-Timeframe Grid: 15m, 1h, 4h, 1D */}
                <div className="grid grid-cols-4 gap-1 pt-0.5">
                  {(["m15", "h1", "h4", "d1"] as const).map((tfKey) => {
                    const tf = analysis.mtfStructureMatrix?.timeframes[tfKey];
                    if (!tf) return null;
                    const isBull = tf.trendBias === "BULLISH";
                    const isBear = tf.trendBias === "BEARISH";
                    return (
                      <div
                        key={tfKey}
                        className={`p-1 rounded text-center border ${
                          isBull
                            ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
                            : isBear
                            ? "bg-rose-500/10 border-rose-500/30 text-rose-300"
                            : "bg-surface-50 border-slate-800 text-slate-400"
                        }`}
                      >
                        <div className="text-[9px] font-bold uppercase">{tf.timeframe}</div>
                        <div className="text-[8px] font-mono font-black">{tf.structure}</div>
                      </div>
                    );
                  })}
                </div>

                <div className="space-y-1 text-xs">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-400">Safety Lock 11 (HTF):</span>
                    <span className={`font-mono text-[10px] font-bold ${
                      analysis.mtfStructureMatrix.isHTFConflict
                        ? "text-rose-400 animate-pulse"
                        : "text-emerald-400"
                    }`}>
                      {analysis.mtfStructureMatrix.isHTFConflict ? "⛔ สวนเทรนด์ H4/D1" : "✅ สอดคล้องโครงสร้างใหญ่"}
                    </span>
                  </div>
                </div>
                <p className="text-[10px] text-slate-400 leading-tight pt-1 border-t border-slate-800/80">
                  {analysis.mtfStructureMatrix.description}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 5i. 🎯 Liquidity Inducement, ChoS Delivery, Risk Bracket & MCPI Conviction Matrix (Plans 41-45) */}
      {(analysis.liquidityInducement || analysis.institutionalChoS || analysis.dynamicRiskBracket || analysis.rejectionBlock || analysis.mcpiConviction) && (
        <div className="p-4 rounded-xl bg-surface-100 border border-slate-700/60 space-y-3.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                <Target className="w-4 h-4" />
              </div>
              <div>
                <h5 className="text-xs font-bold text-white flex items-center gap-2">
                  <span>Liquidity Inducement, ChoS Delivery, Risk Bracket & MCPI Matrix (แผน 41-45)</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                    Institutional Precision & Safety Lock 12
                  </span>
                </h5>
                <p className="text-[10px] text-slate-400">
                  ระบบตรวจจับกับดักสภาพคล่อง IDM/EQH/EQL, การส่งมอบคำสั่ง ChoS สถาบัน, พิกัดความเสี่ยง Adaptive Risk Bracket, บล็อคปฏิเสธราคา Rejection Block และคะแนนรวมเอกภาพ MCPI 0-100
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Card 1: Liquidity Inducement & Engineering (Plan 41 & Safety Lock 12) */}
            {analysis.liquidityInducement && (
              <div className="p-3 rounded-xl bg-surface-100/90 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between text-[11px] font-bold">
                  <span className="text-slate-300">🪤 Liquidity Inducement</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded font-mono ${
                    analysis.liquidityInducement.isInducementTrap
                      ? "bg-rose-500/20 text-rose-300 border border-rose-500/40 font-bold animate-pulse"
                      : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold"
                  }`}>
                    {analysis.liquidityInducement.isInducementTrap ? "⛔ TRAP DETECTED" : "✅ CLEAR ZONE"}
                  </span>
                </div>
                <div className="space-y-1 text-xs">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-400">Trap Type:</span>
                    <span className="font-mono font-bold text-amber-300">
                      {analysis.liquidityInducement.trapType}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-400">ทิศทางกับดัก:</span>
                    <span className="font-mono text-cyan-300 font-bold text-[10px]">
                      {analysis.liquidityInducement.inducementDirection}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-400">ระดับดักสภาพคล่อง (IDM):</span>
                    <span className="font-mono text-slate-200">
                      {analysis.liquidityInducement.idmLevel ?? "None"} ({analysis.liquidityInducement.distanceToTrapPips} pips)
                    </span>
                  </div>
                  {(analysis.liquidityInducement.eqhPrice || analysis.liquidityInducement.eqlPrice) && (
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-400">EQH / EQL Pool:</span>
                      <span className="font-mono text-amber-400 font-bold">
                        {analysis.liquidityInducement.eqhPrice ? `EQH: ${analysis.liquidityInducement.eqhPrice}` : `EQL: ${analysis.liquidityInducement.eqlPrice}`}
                      </span>
                    </div>
                  )}
                </div>
                <p className="text-[10px] text-slate-400 leading-tight pt-1 border-t border-slate-800/80">
                  {analysis.liquidityInducement.description}
                </p>
              </div>
            )}

            {/* Card 2: Institutional ChoS Delivery Matrix (Plan 42) */}
            {analysis.institutionalChoS && (
              <div className="p-3 rounded-xl bg-surface-100/90 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between text-[11px] font-bold">
                  <span className="text-slate-300">🚀 ChoS Delivery Matrix</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded font-mono ${
                    analysis.institutionalChoS.deliveryState === "EXPANSION_DELIVERY"
                      ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold"
                      : analysis.institutionalChoS.deliveryState === "ACCUMULATION"
                      ? "bg-purple-500/20 text-purple-300 border border-purple-500/30 font-bold"
                      : analysis.institutionalChoS.deliveryState === "MANIPULATION"
                      ? "bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold"
                      : "bg-surface-50 text-slate-400 border border-slate-800"
                  }`}>
                    {analysis.institutionalChoS.deliveryState}
                  </span>
                </div>
                {/* Score Progress Bar */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-400">Delivery Score:</span>
                    <span className="font-mono font-bold text-indigo-300">{analysis.institutionalChoS.deliveryScore} / 100</span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-indigo-500 to-cyan-400 rounded-full"
                      style={{ width: `${Math.min(100, Math.max(0, analysis.institutionalChoS.deliveryScore))}%` }}
                    />
                  </div>
                </div>
                <div className="space-y-1 text-xs">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-400">ผู้เล่นหลักในตลาด:</span>
                    <span className="font-mono text-[10px] font-bold text-slate-200">
                      {analysis.institutionalChoS.dominantParticipant}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-400">Expansion Bars:</span>
                    <span className="font-mono text-cyan-300 font-bold">
                      {analysis.institutionalChoS.consecutiveExpansionBars} แท่งขยายตัวต่อเนื่อง
                    </span>
                  </div>
                </div>
                <p className="text-[10px] text-slate-400 leading-tight pt-1 border-t border-slate-800/80">
                  {analysis.institutionalChoS.description}
                </p>
              </div>
            )}

            {/* Card 3: Dynamic Risk Bracket & Rejection Block (Plan 43 & 44) */}
            {(analysis.dynamicRiskBracket || analysis.rejectionBlock) && (
              <div className="p-3 rounded-xl bg-surface-100/90 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between text-[11px] font-bold">
                  <span className="text-slate-300">🛡️ Risk Bracket & Rejection</span>
                  {analysis.dynamicRiskBracket && (
                    <span className={`text-[10px] px-2 py-0.5 rounded font-mono ${
                      analysis.dynamicRiskBracket.currentRiskBracket === "DEFENSIVE_HALT"
                        ? "bg-rose-500/20 text-rose-300 border border-rose-500/30 font-bold"
                        : analysis.dynamicRiskBracket.currentRiskBracket === "CONSERVATIVE"
                        ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                        : analysis.dynamicRiskBracket.currentRiskBracket === "AGGRESSIVE"
                        ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold"
                        : "bg-surface-50 text-slate-300 border border-slate-700"
                    }`}>
                      {analysis.dynamicRiskBracket.currentRiskBracket}
                    </span>
                  )}
                </div>
                <div className="space-y-1 text-xs">
                  {analysis.dynamicRiskBracket && (
                    <>
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-400">ความเสี่ยงแนะนำ:</span>
                        <span className="font-mono font-bold text-emerald-300">
                          {analysis.dynamicRiskBracket.recommendedRiskPct}% (Scale: {analysis.dynamicRiskBracket.drawdownThrottleMultiplier}x)
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-400">โควต้าเทรดเหลือวันนี้:</span>
                        <span className="font-mono text-slate-300">
                          {analysis.dynamicRiskBracket.maxDailyTradesRemaining} ไม้ (เสียติดกัน: {analysis.dynamicRiskBracket.consecutiveLossCount})
                        </span>
                      </div>
                    </>
                  )}
                  {analysis.rejectionBlock && (
                    <>
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-400">Rejection Blocks:</span>
                        <span className="font-mono text-cyan-300 font-bold">
                          {analysis.rejectionBlock.blocks.length} โซน (Wick: {analysis.rejectionBlock.rejectionWickRatioPct}%)
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-400">Wick Exhaustion:</span>
                        <span className="font-mono text-[10px] font-bold text-amber-300">
                          {analysis.rejectionBlock.wickExhaustionScore} / 100
                        </span>
                      </div>
                    </>
                  )}
                </div>
                <p className="text-[10px] text-slate-400 leading-tight pt-1 border-t border-slate-800/80">
                  {analysis.dynamicRiskBracket?.description || analysis.rejectionBlock?.description}
                </p>
              </div>
            )}

            {/* Card 4: Unified MCPI Conviction Matrix (Plan 45 & Safety Lock 12) */}
            {analysis.mcpiConviction && (
              <div className="p-3 rounded-xl bg-surface-100/90 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between text-[11px] font-bold">
                  <span className="text-slate-300">⚡ Unified MCPI Conviction</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded font-mono font-bold ${
                    analysis.mcpiConviction.convictionTier === "TITANIUM"
                      ? "bg-purple-500/20 text-purple-300 border border-purple-500/40 glow-purple"
                      : analysis.mcpiConviction.convictionTier === "PLATINUM"
                      ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40"
                      : analysis.mcpiConviction.convictionTier === "GOLD"
                      ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                      : analysis.mcpiConviction.convictionTier === "SILVER"
                      ? "bg-slate-500/20 text-slate-300 border border-slate-500/40"
                      : "bg-rose-500/20 text-rose-300 border border-rose-500/40 animate-pulse"
                  }`}>
                    {analysis.mcpiConviction.convictionTier}
                  </span>
                </div>

                {/* Big Score Display */}
                <div className="flex items-center justify-between p-2 rounded-lg bg-surface-50 border border-slate-800">
                  <div className="text-center flex-1">
                    <span className="text-[10px] text-slate-400 block">MCPI Score</span>
                    <span className="text-lg font-black font-mono text-white">
                      {analysis.mcpiConviction.score} <span className="text-xs font-normal text-slate-400">/ 100</span>
                    </span>
                  </div>
                  <div className="text-center flex-1 border-l border-slate-800">
                    <span className="text-[10px] text-slate-400 block">Safety Lock 12</span>
                    <span className={`text-[11px] font-bold font-mono ${
                      analysis.mcpiConviction.isApprovedForExecution ? "text-emerald-400" : "text-rose-400"
                    }`}>
                      {analysis.mcpiConviction.isApprovedForExecution ? "✅ APPROVED" : "⛔ BLOCKED"}
                    </span>
                  </div>
                </div>

                {/* 12-Pillar Metrics */}
                <div className="space-y-1 text-xs">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-400">ผ่านเสาหลัก Confluence:</span>
                    <span className="font-mono text-emerald-400 font-bold">
                      {analysis.mcpiConviction.pillarsPassedCount} / 12 เสาหลัก
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-400">Institutional Backing:</span>
                    <span className="font-mono text-indigo-300 font-bold">
                      {analysis.mcpiConviction.institutionalBackingRatioPct}% สถาบันหนุน
                    </span>
                  </div>
                </div>

                <p className="text-[10px] text-slate-400 leading-tight pt-1 border-t border-slate-800/80">
                  {analysis.mcpiConviction.description}
                </p>
              </div>
            )}
          </div>
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
              {analysis.tradeSetup.oteZone ? `OTE 70.5% (${analysis.tradeSetup.entryZone.min}-${analysis.tradeSetup.entryZone.max})` : "แตะเพื่อคัดลอก • รอซื้อที่แนวรับ"}
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
              {analysis.tradeSetup.structuralSL ? `🛡️ Liquidity Shield (-${analysis.tradeSetup.slPips || 0} pips)` : analysis.tradeSetup.slPips ? `-${analysis.tradeSetup.slPips} pips (ตัดขาดทุนอัตโนมัติ)` : "ซ่อนหลัง Swing"}
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
              +{analysis.tradeSetup.tp1Pips || 0} pips (TP1 +1.0R / เลื่อนบังทุน)
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
              +{analysis.tradeSetup.tp2Pips || 0} pips (TP2 รันเทรนด์สถาบัน)
            </span>
          </div>
        </div>

        {/* Automated Risk-Free Breakeven Shield [แผน 14] */}
        {(analysis.tradeSetup.breakevenAdvice || analysis.breakevenAdvice) && (
          <div className="p-3 rounded-xl bg-indigo-950/40 border border-indigo-500/30 flex items-start gap-2.5 text-xs">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <span className="font-bold text-emerald-300 text-[11px] block">
                🛡️ เกราะป้องกันทุน Breakeven Shield (+1.0R Rule):
              </span>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                {(analysis.tradeSetup.breakevenAdvice || analysis.breakevenAdvice)?.actionText}
              </p>
            </div>
          </div>
        )}

        {/* Chandelier ATR Trailing Stop [แผน 20] */}
        {(analysis.tradeSetup.trailingStop || analysis.trailingStop) && (
          <div className="p-3 rounded-xl bg-purple-950/30 border border-purple-500/30 flex items-start gap-2.5 text-xs">
            <Sliders className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
            <div className="space-y-1 w-full">
              <div className="flex flex-wrap items-center justify-between gap-1">
                <span className="font-bold text-purple-300 text-[11px] flex items-center gap-1.5">
                  <span>🎯 Chandelier ATR Trailing Stop (แผน 20 - เลื่อนล็อคกำไรอัตโนมัติ):</span>
                  <span className="font-mono text-[10px] px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-200 border border-purple-500/30">
                    +{(analysis.tradeSetup.trailingStop || analysis.trailingStop)?.stepPips} pips Trailing Step
                  </span>
                </span>
                <span className="font-mono font-black text-amber-300 text-xs">
                  Trail SL: {(analysis.tradeSetup.trailingStop || analysis.trailingStop)?.trailingStopPrice}
                </span>
              </div>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                {(analysis.tradeSetup.trailingStop || analysis.trailingStop)?.instruction}
              </p>
            </div>
          </div>
        )}

        {/* Dynamic Spread & Slippage Impact Calculator [แผน 18] */}
        {(analysis.tradeSetup.spreadImpact || analysis.spreadImpact) && (() => {
          const sp = analysis.tradeSetup.spreadImpact || analysis.spreadImpact!;
          return (
            <div className={`p-3 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs ${
              sp.isSpreadWarning
                ? "bg-rose-950/30 border-rose-500/40 text-rose-200"
                : "bg-surface-100/90 border-slate-800 text-slate-300"
            }`}>
              <div className="flex items-center gap-2">
                <div className={`p-1.5 rounded-lg ${sp.isSpreadWarning ? "bg-rose-500/20 text-rose-400" : "bg-blue-500/10 text-blue-400"}`}>
                  <AlertTriangle className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white text-[11px]">ต้นทุนสเปรดโบรกเกอร์ (Broker Spread Impact - แผน 18)</span>
                    <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded ${
                      sp.isSpreadWarning
                        ? "bg-rose-500/20 text-rose-300 border border-rose-500/30 font-bold"
                        : "bg-emerald-500/10 text-emerald-300 border border-emerald-500/20"
                    }`}>
                      {sp.isSpreadWarning ? "⚠️ SPREAD HIGH DANGER" : "✅ SPREAD ACCEPTABLE"}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400">
                    สเปรดประมาณ {sp.estimatedSpreadPips} pips (${sp.spreadCostUSD} USD / 0.01 lot) • กินระยะ SL ไป {sp.spreadToSLPercent}%
                    {sp.warningMessage ? ` • ${sp.warningMessage}` : ""}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 self-end sm:self-center font-mono">
                <span className="text-[10px] text-slate-400">Net R:R สุทธิ:</span>
                <span className={`text-xs font-black px-2 py-0.5 rounded ${
                  sp.isSpreadWarning ? "bg-rose-500/20 text-rose-300" : "bg-emerald-500/20 text-emerald-300"
                }`}>
                  {sp.effectiveRiskReward}
                </span>
              </div>
            </div>
          );
        })()}

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

              {/* Kelly Criterion Math Sizing Advisor [แผน 21] */}
              {(analysis.tradeSetup.kellySizing || analysis.kellySizing) && (() => {
                const ks = analysis.tradeSetup.kellySizing || analysis.kellySizing!;
                return (
                  <div className="p-3 rounded-xl bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border border-indigo-500/30 space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-1.5 text-xs">
                      <div className="flex items-center gap-1.5">
                        <Calculator className="w-3.5 h-3.5 text-indigo-400" />
                        <span className="font-bold text-white text-[11px]">
                          Kelly Criterion Math Sizing (แผน 21):
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 font-mono text-[10px]">
                        <span className="text-slate-400">Half-Kelly: <strong className="text-indigo-300">{ks.halfKellyPct}%</strong></span>
                        <span className="text-slate-400">•</span>
                        <span className="text-emerald-300 font-bold bg-emerald-500/15 px-1.5 py-0.5 rounded border border-emerald-500/30">
                          แนะนำเสี่ยง: {ks.volatilityAdjustedPct}%
                        </span>
                        <button
                          onClick={() => setCustomRiskPct(ks.volatilityAdjustedPct)}
                          className="px-2 py-0.5 rounded bg-blue-600 hover:bg-blue-500 text-white font-sans text-[10px] transition-all font-semibold cursor-pointer"
                        >
                          ใช้ค่านี้
                        </button>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-center font-mono text-[10px] pt-0.5">
                      <div className="p-1.5 rounded-lg bg-surface-50 border border-slate-800">
                        <span className="text-slate-400 block text-[9px]">พอร์ต $10 USD</span>
                        <span className="text-xs font-bold text-amber-300">{ks.suggestedLot10USD} lot</span>
                      </div>
                      <div className="p-1.5 rounded-lg bg-surface-50 border border-slate-800">
                        <span className="text-slate-400 block text-[9px]">พอร์ต $100 USD</span>
                        <span className="text-xs font-bold text-emerald-300">{ks.suggestedLot100USD} lot</span>
                      </div>
                      <div className="p-1.5 rounded-lg bg-surface-50 border border-slate-800">
                        <span className="text-slate-400 block text-[9px]">พอร์ต $1,000 USD</span>
                        <span className="text-xs font-bold text-sky-300">{ks.suggestedLot1000USD} lot</span>
                      </div>
                    </div>
                    <p className="text-[10px] text-slate-400 leading-tight border-t border-slate-800/80 pt-1">
                      {ks.rationale}
                    </p>
                  </div>
                );
              })()}

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