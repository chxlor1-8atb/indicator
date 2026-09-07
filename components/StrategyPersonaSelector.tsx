"use client";

import React, { useState } from "react";
import { OrchestratorDecisionInfo, StrategyPresetType } from "@/lib/types";
import { ShieldCheck, ShieldAlert, Zap, Layers, Compass, Crosshair, RefreshCw, Sparkles, EyeOff, CheckCircle2 } from "lucide-react";

interface StrategyPersonaSelectorProps {
  orchestrator?: OrchestratorDecisionInfo;
  onPresetChange?: (preset: StrategyPresetType) => void;
}

const PRESETS: Array<{
  id: StrategyPresetType;
  title: string;
  tagline: string;
  icon: React.ElementType;
  badgeColor: string;
}> = [
  {
    id: "AUTO_REGIME",
    title: "AI Auto-Regime",
    tagline: "AI เลือกโหมดอัตโนมัติตามสภาวะตลาด",
    icon: Sparkles,
    badgeColor: "bg-indigo-500/20 text-indigo-300 border-indigo-500/30",
  },
  {
    id: "SMC_PRICE_ACTION",
    title: "SMC Pure Flow",
    tagline: "รอยเท้าสถาบัน OB, FVG, MSS (ไร้เส้นกวนตา)",
    icon: Layers,
    badgeColor: "bg-cyan-500/20 text-cyan-300 border-cyan-500/30",
  },
  {
    id: "QUANT_TREND_SURFER",
    title: "Quant Trend Surfer",
    tagline: "รันเทรนด์คำใหญ่ EMA Wave + SuperTrend",
    icon: Compass,
    badgeColor: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
  },
  {
    id: "SQUEEZE_BREAKOUT",
    title: "Squeeze Sniper",
    tagline: "ดักจับแท่งระเบิดราคา TTM Squeeze + Volume",
    icon: Crosshair,
    badgeColor: "bg-amber-500/20 text-amber-300 border-amber-500/30",
  },
  {
    id: "MEAN_REVERSION_SCALPER",
    title: "Mean-Revert Scalp",
    tagline: "เก็บรอบ Sideway Bollinger + Z-Score ±2σ",
    icon: RefreshCw,
    badgeColor: "bg-purple-500/20 text-purple-300 border-purple-500/30",
  },
  {
    id: "HARMONIC_REVERSAL",
    title: "Harmonic Geometry",
    tagline: "จุดกลับตัวสัดส่วนทองคำ Gartley/Bat/ABCD",
    icon: Zap,
    badgeColor: "bg-rose-500/20 text-rose-300 border-rose-500/30",
  },
];

export const StrategyPersonaSelector: React.FC<StrategyPersonaSelectorProps> = ({
  orchestrator,
  onPresetChange,
}) => {
  const [selectedPreset, setSelectedPreset] = useState<StrategyPresetType>(
    orchestrator?.selectedPreset || "AUTO_REGIME"
  );

  const handleSelect = (presetId: StrategyPresetType) => {
    setSelectedPreset(presetId);
    if (onPresetChange) {
      onPresetChange(presetId);
    }
  };

  if (!orchestrator) return null;

  const currentPresetMeta = PRESETS.find((p) => p.id === selectedPreset) || PRESETS[0];

  return (
    <div className="p-4 rounded-xl bg-gradient-to-br from-slate-900 via-surface-100 to-indigo-950/25 border border-indigo-500/30 space-y-4">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-indigo-500/20 text-indigo-400 border border-indigo-500/40">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-white flex items-center gap-2">
              <span>Anti-Clash Strategy Orchestrator</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-mono">
                Zero-Conflict Active
              </span>
            </h4>
            <p className="text-[11px] text-slate-400">
              สถาปัตยกรรมป้องกันสัญญาณตีกัน: ปิดปากอินดิเคเตอร์ที่ผิดสภาวะตลาด และเปิดเฉพาะชุดเครื่องมือที่แม่นยำที่สุด
            </p>
          </div>
        </div>

        {/* Unified Consensus Signal */}
        <div className="flex items-center gap-2">
          <div className="text-right">
            <span className="text-[10px] text-slate-400 block uppercase font-mono">Consensus Verdict</span>
            <span
              className={`text-xs font-black font-mono px-2.5 py-1 rounded-md border ${
                orchestrator.unifiedSignal === "BUY"
                  ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                  : orchestrator.unifiedSignal === "SELL"
                  ? "bg-rose-500/20 text-rose-300 border-rose-500/40"
                  : "bg-amber-500/20 text-amber-300 border-amber-500/40"
              }`}
            >
              {orchestrator.unifiedSignal} ({orchestrator.confidencePct}%)
            </span>
          </div>
        </div>
      </div>

      {/* Preset Selector Tabs */}
      <div>
        <label className="text-[10px] uppercase tracking-wider text-slate-400 font-bold block mb-2">
          เลือกโหมดกลยุทธ์เฉพาะทาง (Strategy Persona):
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
          {PRESETS.map((preset) => {
            const Icon = preset.icon;
            const isSelected = selectedPreset === preset.id;
            return (
              <button
                key={preset.id}
                onClick={() => handleSelect(preset.id)}
                className={`p-2.5 rounded-xl text-left border transition-all flex flex-col justify-between space-y-1.5 ${
                  isSelected
                    ? "bg-indigo-600/20 border-indigo-400 text-white shadow-lg shadow-indigo-500/10 ring-1 ring-indigo-500/40"
                    : "bg-surface-50 border-slate-800 text-slate-400 hover:bg-surface-100 hover:text-slate-200"
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <Icon className={`w-4 h-4 ${isSelected ? "text-indigo-300" : "text-slate-400"}`} />
                  {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />}
                </div>
                <div>
                  <div className="text-[11px] font-bold leading-tight">{preset.title}</div>
                  <div className="text-[9px] text-slate-400 line-clamp-1 leading-tight">{preset.tagline}</div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Orchestrator Analysis & Muting Transparency Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
        {/* Left Card: Active Amplified Tools */}
        <div className="p-3 rounded-xl bg-emerald-950/20 border border-emerald-500/30 space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-emerald-300">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>ชุดเครื่องมือที่เปิดใช้งาน (Active Tools)</span>
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 font-mono">
              {orchestrator.activeIndicators.length} เครื่องมือ
            </span>
          </div>
          <ul className="space-y-1 text-[11px] text-slate-300">
            {orchestrator.activeIndicators.map((tool, idx) => (
              <li key={idx} className="flex items-center gap-1.5">
                <span className="text-emerald-400 text-xs">•</span>
                <span>{tool}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Right Card: Muted Clashing Tools */}
        <div className="p-3 rounded-xl bg-rose-950/20 border border-rose-500/30 space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-rose-300">
            <span className="flex items-center gap-1.5">
              <EyeOff className="w-4 h-4 text-rose-400" />
              <span>เครื่องมือที่ถูกปิดปาก (Muted to Prevent Clash)</span>
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded bg-rose-500/20 font-mono">
              ตัดสัญญาณหลอก
            </span>
          </div>
          <ul className="space-y-1 text-[11px] text-slate-400">
            {orchestrator.mutedIndicators.map((tool, idx) => (
              <li key={idx} className="flex items-center gap-1.5 line-through decoration-rose-500/60">
                <span className="text-rose-400 text-xs">•</span>
                <span>{tool}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Rationale & Execution Advice */}
      <div className="p-3 rounded-xl bg-surface-50 border border-slate-800 space-y-1.5 text-xs">
        <div className="flex items-center justify-between">
          <span className="text-slate-400 text-[11px]">หลักการหักล้างสัญญาณขัดแย้ง:</span>
          <span className="text-[10px] font-mono text-cyan-300">{orchestrator.regimeState}</span>
        </div>
        <p className="text-[11px] text-slate-300 leading-relaxed font-medium">
          {orchestrator.clashResolutionReason}
        </p>
        <div className="pt-2 border-t border-slate-800/80 flex items-start gap-2">
          <span className="text-amber-400 font-bold text-[11px] whitespace-nowrap">💡 คำแนะนำ:</span>
          <span className="text-slate-300 text-[11px] leading-relaxed">
            {orchestrator.executionAdvice}
          </span>
        </div>
      </div>
    </div>
  );
};
