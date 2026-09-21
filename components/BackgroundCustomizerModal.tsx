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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-lg rounded-2xl bg-[#0E131F]/95 border border-slate-700/80 shadow-2xl shadow-black/80 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 bg-slate-900/40">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-cyan-500 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-cyan-500/20">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-extrabold text-white flex items-center gap-2">
                Background Studio
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/25">
                  Visual FX
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                ปรับแต่งพื้นหลังพรีเมียมและระบบ Parallax Scroll
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-5 space-y-5 overflow-y-auto">
          {/* Concept Banner */}
          <div className="rounded-xl bg-gradient-to-r from-cyan-950/40 via-indigo-950/30 to-purple-950/40 border border-cyan-500/20 p-3 flex items-start gap-2.5">
            <Layers className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
            <div className="text-xs text-slate-300 leading-relaxed">
              <span className="font-bold text-white">"เว็บมี Background — ดูพรีเมียมทันที"</span>
              <br />
              ระบบ Multi-layer Parallax ขับเคลื่อนด้วย GPU ทำให้เมื่อเลื่อนหน้าจอ พื้นหลังจะขยับตามช้าๆ สร้างมิติลึกอย่างนุ่มนวล
            </div>
          </div>

          {/* Theme Selection */}
          <div className="space-y-2.5">
            <label className="text-xs font-bold text-slate-300 flex items-center justify-between">
              <span>เลือกธีมพื้นหลัง (Theme Presets)</span>
              <span className="text-[11px] text-slate-400 font-normal">คลิกเพื่อเปลี่ยนทันที</span>
            </label>

            <div className="grid grid-cols-1 gap-2.5">
              {THEME_OPTIONS.map((opt) => {
                const isSelected = currentTheme === opt.id;
                return (
                  <button
                    key={opt.id}
                    onClick={() => onSelectTheme(opt.id)}
                    className={`w-full text-left p-3 rounded-xl border transition-all flex items-center justify-between gap-3 cursor-pointer ${
                      isSelected
                        ? "bg-slate-800/80 border-cyan-500/60 shadow-lg shadow-cyan-500/10 ring-1 ring-cyan-500/30"
                        : "bg-slate-900/50 border-slate-800/80 hover:border-slate-700 hover:bg-slate-850"
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {/* Color Palette Pill Preview */}
                      <div className="w-10 h-10 rounded-lg bg-gradient-to-tr p-[1px] shrink-0 overflow-hidden shadow-inner flex items-center justify-center border border-white/10">
                        <div
                          className={`w-full h-full bg-gradient-to-br ${opt.colors[0]} ${opt.colors[1]} ${opt.colors[2]} opacity-80`}
                        />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs sm:text-sm font-bold text-white truncate">
                            {opt.title}
                          </span>
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                            {opt.tag}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 truncate mt-0.5">
                          {opt.subtitle}
                        </p>
                      </div>
                    </div>

                    <div className="shrink-0">
                      {isSelected ? (
                        <div className="w-6 h-6 rounded-full bg-cyan-500 text-slate-950 flex items-center justify-center shadow-md shadow-cyan-500/30">
                          <Check className="w-3.5 h-3.5 stroke-[3]" />
                        </div>
                      ) : (
                        <div className="w-6 h-6 rounded-full border border-slate-700" />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Parallax Scroll Switch */}
          <div className="p-3.5 rounded-xl bg-slate-900/70 border border-slate-800 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-indigo-500/15 border border-indigo-500/30 text-indigo-400 flex items-center justify-center">
                <Move className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs sm:text-sm font-bold text-white block">
                  Dynamic Parallax Scroll
                </span>
                <span className="text-[11px] text-slate-400 block">
                  {parallaxEnabled
                    ? "เปิดใช้งาน (พื้นหลังขยับตามการเลื่อนหน้าจอช้าๆ)"
                    : "ปิดใช้งาน (พื้นหลังตรึงนิ่งแบบ Static)"}
                </span>
              </div>
            </div>

            <button
              onClick={() => onToggleParallax(!parallaxEnabled)}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                parallaxEnabled ? "bg-cyan-500" : "bg-slate-700"
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  parallaxEnabled ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
          </div>

          {/* Glow Intensity Presets */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-300 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Eye className="w-3.5 h-3.5 text-cyan-400" />
                ระดับแสงเรือง (Glow Intensity)
              </span>
              <span className="text-xs text-cyan-400 font-mono font-bold">
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
                    className={`py-2 px-2.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                      isAct
                        ? "bg-cyan-500/20 border-cyan-500 text-cyan-300 shadow-sm shadow-cyan-500/20"
                        : "bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800"
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
            className="px-4 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white shadow-lg shadow-cyan-500/20 active:scale-95 transition-all cursor-pointer"
          >
            เสร็จสิ้น
          </button>
        </div>
      </div>
    </div>
  );
}
