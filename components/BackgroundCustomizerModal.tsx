"use client";

import React from "react";
import { X, Sparkles, Sliders, Eye, Check, Layers, Move } from "lucide-react";
import { BackgroundTheme } from "./AmbientBackground";

interface BackgroundCustomizerModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentTheme: BackgroundTheme;
  onSelectTheme: (theme: BackgroundTheme) => void;
  intensity: number;
  onChangeIntensity: (intensity: number) => void;
  parallaxEnabled: boolean;
  onToggleParallax: (enabled: boolean) => void;
}

const THEME_OPTIONS: {
  id: BackgroundTheme;
  title: string;
  subtitle: string;
  tag: string;
  colors: string[];
}[] = [
  {
    id: "cyber-aurora",
    title: "Deep Cyber Aurora",
    subtitle: "แสงออโรร่าสีฟ้า-น้ำเงินพุ่งผ่านความมืด มิติระดับสถาบัน",
    tag: "แนะนำ (ตรงตามภาพ)",
    colors: ["from-cyan-400", "via-indigo-500", "to-purple-600"],
  },
  {
    id: "dark-gold",
    title: "Institutional Dark Gold",
    subtitle: "ประกายทองคำ Champagne & Amber สำหรับพอร์ตทองคำ XAUUSD",
    tag: "Luxury Gold",
    colors: ["from-amber-400", "via-yellow-500", "to-orange-600"],
  },
  {
    id: "neural-matrix",
    title: "Neural Matrix Grid",
    subtitle: "คลื่นควอนต์มรกต-ฟ้า พร้อมลายตาข่ายไฮเทคสไตล์ AI",
    tag: "AI Emerald",
    colors: ["from-emerald-400", "via-teal-500", "to-cyan-600"],
  },
  {
    id: "minimal-obsidian",
    title: "Minimal Obsidian",
    subtitle: "โทนสีเทาดำลึกเรียบหรู คมชัด เน้นข้อมูลกราฟแท่งเทียน 100%",
    tag: "Clean Focus",
    colors: ["from-slate-500", "via-zinc-600", "to-neutral-800"],
  },
];

export default function BackgroundCustomizerModal({
  isOpen,
  onClose,
  currentTheme,
  onSelectTheme,
  intensity,
  onChangeIntensity,
  parallaxEnabled,
  onToggleParallax,
}: BackgroundCustomizerModalProps) {
  if (!isOpen) return null;

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-md animate-fadeIn cursor-pointer"
    >
      <div className="relative w-full max-w-lg terminal-card overflow-hidden flex flex-col max-h-[90vh] cursor-default border border-white/[0.12] shadow-2xl shadow-black">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.08] bg-[#14171F]">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-md bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                Background Studio
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 font-mono">
                  Visual FX
                </span>
              </h2>
              <p className="text-[11px] text-zinc-400">
                ปรับแต่งพื้นหลังพรีเมียมและระบบ Parallax Scroll
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="btn-terminal w-7 h-7 flex items-center justify-center cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 space-y-4 overflow-y-auto">
          {/* Concept Banner */}
          <div className="rounded-md bg-white/[0.03] border border-white/[0.08] p-2.5 flex items-start gap-2.5">
            <Layers className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
            <div className="text-xs text-zinc-300 leading-relaxed">
              <span className="font-semibold text-white">"เว็บมี Background — ดูพรีเมียมทันที"</span>
              <br />
              ระบบ Multi-layer Parallax ขับเคลื่อนด้วย GPU พื้นหลังขยับตามการเลื่อนหน้าจออย่างนุ่มนวล
            </div>
          </div>

          {/* Theme Selection */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-zinc-300 flex items-center justify-between">
              <span>เลือกธีมพื้นหลัง (Theme Presets)</span>
              <span className="text-[11px] text-zinc-500 font-normal">คลิกเพื่อเปลี่ยนทันที</span>
            </label>

            <div className="grid grid-cols-1 gap-2">
              {THEME_OPTIONS.map((opt) => {
                const isSelected = currentTheme === opt.id;
                return (
                  <button
                    key={opt.id}
                    onClick={() => onSelectTheme(opt.id)}
                    className={`w-full text-left p-2.5 rounded-md border transition-colors flex items-center justify-between gap-3 cursor-pointer ${
                      isSelected
                        ? "bg-white/[0.08] border-blue-500/60 shadow-md ring-1 ring-blue-500/30"
                        : "bg-white/[0.02] border-white/[0.06] hover:border-white/[0.15] hover:bg-white/[0.04]"
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      {/* Color Palette Pill Preview */}
                      <div className="w-9 h-9 rounded-md bg-gradient-to-tr p-[1px] shrink-0 overflow-hidden shadow-inner flex items-center justify-center border border-white/10">
                        <div className={`w-full h-full bg-gradient-to-tr ${opt.colors.join(" ")} opacity-85`} />
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-xs font-bold text-white tracking-tight">
                            {opt.title}
                          </span>
                          <span className="text-[9.5px] px-1.5 py-0.2 rounded bg-white/[0.06] text-zinc-300 border border-white/[0.08] font-mono">
                            {opt.tag}
                          </span>
                        </div>
                        <p className="text-[11px] text-zinc-400 truncate mt-0.5">
                          {opt.subtitle}
                        </p>
                      </div>
                    </div>

                    <div className="shrink-0">
                      {isSelected ? (
                        <div className="w-5 h-5 rounded-full bg-blue-500 text-white flex items-center justify-center shadow-sm">
                          <Check className="w-3 h-3 stroke-[3]" />
                        </div>
                      ) : (
                        <div className="w-5 h-5 rounded-full border border-white/[0.15]" />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Parallax Scroll Switch */}
          <div className="p-3 rounded-md bg-white/[0.03] border border-white/[0.08] flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-md bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center">
                <Move className="w-3.5 h-3.5" />
              </div>
              <div>
                <span className="text-xs font-semibold text-white block">
                  Dynamic Parallax Scroll
                </span>
                <span className="text-[11px] text-zinc-400 block">
                  {parallaxEnabled
                    ? "เปิดใช้งาน (พื้นหลังขยับตามการเลื่อนหน้าจอ)"
                    : "ปิดใช้งาน (พื้นหลังตรึงนิ่งแบบ Static)"}
                </span>
              </div>
            </div>

            <button
              onClick={() => onToggleParallax(!parallaxEnabled)}
              className={`relative inline-flex h-5 w-10 shrink-0 cursor-pointer rounded-full border border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                parallaxEnabled ? "bg-blue-600" : "bg-zinc-700"
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  parallaxEnabled ? "translate-x-5" : "translate-x-0.5"
                }`}
              />
            </button>
          </div>

          {/* Glow Intensity Presets */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-zinc-300 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Eye className="w-3.5 h-3.5 text-blue-400" />
                ระดับแสงเรือง (Glow Intensity)
              </span>
              <span className="text-xs text-blue-400 font-mono font-bold">
                {Math.round(intensity * 100)}%
              </span>
            </label>

            <div className="grid grid-cols-3 gap-2">
              {[
                { label: "Soft (35%)", val: 0.35 },
                { label: "Balanced (65%)", val: 0.65 },
                { label: "Vibrant (90%)", val: 0.9 },
              ].map((lvl) => {
                const isAct = Math.abs(intensity - lvl.val) < 0.05;
                return (
                  <button
                    key={lvl.label}
                    onClick={() => onChangeIntensity(lvl.val)}
                    className={`h-7 px-2 rounded-md text-xs font-medium transition-colors cursor-pointer border ${
                      isAct
                        ? "bg-blue-600 text-white font-bold border-blue-500"
                        : "btn-terminal"
                    }`}
                  >
                    {lvl.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-800 bg-slate-900/60 flex items-center justify-between">
          <span className="text-[11px] text-slate-400 font-mono">
            บันทึกการตั้งค่าอัตโนมัติ 100%
          </span>
          <button
            onClick={onClose}
            className="btn-primary h-8 px-4 text-xs font-semibold"
          >
            เสร็จสิ้น
          </button>
        </div>
      </div>
    </div>
  );
}
