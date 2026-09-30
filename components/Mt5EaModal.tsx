"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  Download,
  Copy,
  Check,
  Cpu,
  Layers,
  ShieldCheck,
  ExternalLink,
  Activity,
  FileCode,
  Sliders,
  BookOpen,
  CheckCircle2,
  Terminal,
} from "lucide-react";

interface Mt5EaModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function Mt5EaModal({ isOpen, onClose }: Mt5EaModalProps) {
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [serverUrl, setServerUrl] = useState("http://localhost:3000");
  const [bridgeStatus, setBridgeStatus] = useState<"checking" | "online" | "offline">("checking");
  const [activeOrderCount, setActiveOrderCount] = useState<number>(0);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setServerUrl(window.location.origin);
    }
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    // Check MT Bridge status
    const checkBridge = async () => {
      try {
        setBridgeStatus("checking");
        const res = await fetch("/api/mt-bridge");
        if (res.ok) {
          const data = await res.json();
          setBridgeStatus("online");
          setActiveOrderCount(data.count ?? 0);
        } else {
          setBridgeStatus("offline");
        }
      } catch {
        setBridgeStatus("offline");
      }
    };

    checkBridge();
    const interval = setInterval(checkBridge, 10000);
    return () => clearInterval(interval);
  }, [isOpen]);

  if (!isOpen) return null;

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(serverUrl);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-fade-in overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-[#0D1117] border border-white/[0.12] rounded-2xl shadow-2xl shadow-black/80 overflow-hidden text-slate-200 my-auto">
        {/* Ambient Top Glow Bar */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 via-blue-500 to-indigo-500" />

        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.08] bg-white/[0.02]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white tracking-tight">
                  Aegis Quant Terminal EA (MetaTrader 5)
                </h3>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  v2.5 Institutional
                </span>
              </div>
              <p className="text-xs text-slate-400">
                ระบบบอทเทรดสถาบัน + หน้าต่าง On-Chart GUI Dashboard บนกราฟ MT5
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.06] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto custom-scrollbar">
          {/* Bridge Live Telemetry Banner */}
          <div className="p-3 rounded-xl bg-surface-100/60 border border-slate-800 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <span
                className={`w-2 h-2 rounded-full ${
                  bridgeStatus === "online"
                    ? "bg-emerald-400 animate-pulse"
                    : bridgeStatus === "checking"
                    ? "bg-amber-400 animate-pulse"
                    : "bg-rose-400"
                }`}
              />
              <span className="font-medium text-slate-300">
                สถานะ Bridge API:
              </span>
              <strong
                className={
                  bridgeStatus === "online"
                    ? "text-emerald-400"
                    : bridgeStatus === "checking"
                    ? "text-amber-400"
                    : "text-rose-400"
                }
              >
                {bridgeStatus === "online"
                  ? "พร้อมเชื่อมต่อ (Online)"
                  : bridgeStatus === "checking"
                  ? "กำลังตรวจสอบ..."
                  : "ออฟไลน์"}
              </strong>
            </div>
            <div className="flex items-center gap-1.5 text-slate-400 font-mono text-[11px]">
              <span>Active Orders:</span>
              <strong className="text-white font-bold">{activeOrderCount}</strong>
            </div>
          </div>

          {/* 1. Server WebRequest URL (Important Step) */}
          <div className="p-3.5 rounded-xl bg-blue-950/20 border border-blue-500/30 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-blue-300 flex items-center gap-1.5">
                <Terminal className="w-4 h-4 text-blue-400" />
                <span>1. WebRequest Server URL (ใส่ในโปรแกรม MT5)</span>
              </span>
              <span className="text-[10px] text-blue-400/80 font-mono">
                Tools ➔ Options ➔ Expert Advisors
              </span>
            </div>
            <p className="text-[11px] text-slate-300 leading-relaxed">
              ใน MT5 ให้ไปที่เมนู <strong>Tools ➔ Options ➔ Expert Advisors</strong> แล้วติ๊กถูกที่{" "}
              <strong className="text-white">Allow WebRequest for listed URL</strong> จากนั้นเพิ่ม URL ด้านล่างนี้:
            </p>
            <div className="flex items-center gap-2">
              <div className="flex-1 px-3 py-2 rounded-lg bg-surface-200 border border-slate-700 font-mono text-xs text-emerald-300 select-all truncate">
                {serverUrl}
              </div>
              <button
                onClick={handleCopyUrl}
                className="px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-all shrink-0 cursor-pointer shadow-sm"
              >
                {copiedUrl ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-white" />
                    <span>คัดลอกแล้ว!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>คัดลอก URL</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* 2. Direct Download Section */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
              <Download className="w-4 h-4 text-emerald-400" />
              <span>2. ดาวน์โหลดไฟล์สำหรับ MetaTrader 5</span>
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {/* Card 1: Main EA */}
              <div className="p-3 rounded-xl bg-surface-100/90 border border-slate-800 hover:border-emerald-500/40 transition-all flex flex-col justify-between gap-2.5">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      <FileCode className="w-4 h-4" />
                    </div>
                    <div>
                      <h5 className="text-xs font-bold text-white">Aegis_Quant_Terminal.mq5</h5>
                      <span className="text-[10px] text-slate-400">ไฟล์ EA หลัก (พร้อม On-Chart GUI HUD)</span>
                    </div>
                  </div>
                  <p className="text-[10.5px] text-slate-400">
                    นำไปวางในโฟลเดอร์ <code>MQL5/Experts/</code> แล้วกด Compile ใน MetaEditor
                  </p>
                </div>
                <a
                  href="/api/download-ea?type=mq5"
                  download="Aegis_Quant_Terminal.mq5"
                  className="w-full py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-sm"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>ดาวน์โหลด EA (.mq5)</span>
                </a>
              </div>

              {/* Card 2: Preset Cent Account */}
              <div className="p-3 rounded-xl bg-surface-100/90 border border-slate-800 hover:border-amber-500/40 transition-all flex flex-col justify-between gap-2.5">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
                      <Sliders className="w-4 h-4" />
                    </div>
                    <div>
                      <h5 className="text-xs font-bold text-white">Aegis_XAUUSD_Cent.set</h5>
                      <span className="text-[10px] text-amber-300 font-medium">พรีเซ็ตพอร์ต $10-$50 (ทองคำ บัญชี Cent)</span>
                    </div>
                  </div>
                  <p className="text-[10.5px] text-slate-400">
                    ตั้งค่าความเสี่ยงระดับ 1,000 - 5,000 USC สำหรับปั้นพอร์ตเล็กอย่างปลอดภัย
                  </p>
                </div>
                <a
                  href="/api/download-ea?type=set_cent"
                  download="Aegis_XAUUSD_Cent.set"
                  className="w-full py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-sm"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>โหลด Preset Cent (.set)</span>
                </a>
              </div>

              {/* Card 3: Preset Forex Standard */}
              <div className="p-3 rounded-xl bg-surface-100/90 border border-slate-800 hover:border-blue-500/40 transition-all flex flex-col justify-between gap-2.5">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20">
                      <Sliders className="w-4 h-4" />
                    </div>
                    <div>
                      <h5 className="text-xs font-bold text-white">Aegis_Forex_Standard.set</h5>
                      <span className="text-[10px] text-blue-300 font-medium">พรีเซ็ต Forex Standard ($100+)</span>
                    </div>
                  </div>
                  <p className="text-[10.5px] text-slate-400">
                    ตั้งค่าสำหรับคู่เงิน EURUSD, GBPUSD, USDJPY สเปรดแคบ คุม Max Margin 20%
                  </p>
                </div>
                <a
                  href="/api/download-ea?type=set_std"
                  download="Aegis_Forex_Standard.set"
                  className="w-full py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-sm"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>โหลด Preset Forex (.set)</span>
                </a>
              </div>

              {/* Card 4: Installation Guide */}
              <div className="p-3 rounded-xl bg-surface-100/90 border border-slate-800 hover:border-indigo-500/40 transition-all flex flex-col justify-between gap-2.5">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                      <BookOpen className="w-4 h-4" />
                    </div>
                    <div>
                      <h5 className="text-xs font-bold text-white">HOW_TO_INSTALL.md</h5>
                      <span className="text-[10px] text-indigo-300 font-medium">คู่มือติดตั้งภาษาไทยฉบับจับมือทำ</span>
                    </div>
                  </div>
                  <p className="text-[10.5px] text-slate-400">
                    คำอธิบายวิธีติดตั้ง การเปิดปุ่ม Algo Trading และวิธีใช้งานฟังก์ชันบนกราฟ
                  </p>
                </div>
                <a
                  href="/api/download-ea?type=guide"
                  download="HOW_TO_INSTALL.md"
                  className="w-full py-2 rounded-lg bg-surface-200 hover:bg-surface-300 text-slate-200 text-xs font-bold flex items-center justify-center gap-1.5 transition-all border border-slate-700"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>ดาวน์โหลดคู่มือ (.md)</span>
                </a>
              </div>
            </div>
          </div>

          {/* 3. 4-Step Quick Visual Steps */}
          <div className="p-4 rounded-xl bg-surface-100/80 border border-slate-800 space-y-2.5">
            <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>สรุป 4 ขั้นตอนติดตั้งพร้อมใช้งานทันที</span>
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-slate-300">
              <div className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-blue-500/20 text-blue-400 font-bold flex items-center justify-center shrink-0 text-xs">
                  1
                </span>
                <span>เปิด MT5 ใส่ <strong>Server URL</strong> ในเมนู Tools ➔ Options ➔ Expert Advisors</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-blue-500/20 text-blue-400 font-bold flex items-center justify-center shrink-0 text-xs">
                  2
                </span>
                <span>นำไฟล์ <code>Aegis_Quant_Terminal.mq5</code> ไปวางในโฟลเดอร์ <code>MQL5/Experts</code></span>
              </div>
              <div className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-blue-500/20 text-blue-400 font-bold flex items-center justify-center shrink-0 text-xs">
                  3
                </span>
                <span>กด <strong>F4</strong> เปิด MetaEditor แล้วกด <strong>Compile</strong> (0 errors)</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-blue-500/20 text-blue-400 font-bold flex items-center justify-center shrink-0 text-xs">
                  4
                </span>
                <span>ลาก EA ลงกราฟ XAUUSD / EURUSD แล้วกดเปิดปุ่ม <strong>Algo Trading</strong> บน MT5</span>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3 border-t border-white/[0.08] bg-white/[0.02] flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 text-slate-400">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>ระบบมีเกราะกัน Spread Blowout & Margin Cap 20% ในตัว</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-surface-200 hover:bg-surface-300 text-white font-medium transition-colors"
          >
            ปิดหน้าต่าง
          </button>
        </div>
      </div>
    </div>
  );
}
