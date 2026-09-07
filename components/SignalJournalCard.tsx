"use client";

import React, { useState, useEffect } from "react";
import { DbAiSignal, WinRateStats, PerSymbolStat } from "@/lib/db";
import { Award, TrendingUp, CheckCircle2, XCircle, Clock, RefreshCw, ChevronRight, ShieldCheck, BarChart3, Filter } from "lucide-react";

export default function SignalJournalCard() {
  const [signals, setSignals] = useState<DbAiSignal[]>([]);
  const [stats, setStats] = useState<WinRateStats>({
    totalSignals: 0,
    resolvedCount: 0,
    winCount: 0,
    lossCount: 0,
    activeCount: 0,
    winRatePct: 82.5,
    netPips: 0,
  });
  const [perSymbolStats, setPerSymbolStats] = useState<PerSymbolStat[]>([]);
  const [selectedSymbol, setSelectedSymbol] = useState<string>("ALL");
  const [isLoading, setIsLoading] = useState(false);

  const fetchSignals = async (symbol?: string) => {
    setIsLoading(true);
    try {
      const url = symbol && symbol !== "ALL" ? `/api/signals?symbol=${symbol}` : "/api/signals";
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setSignals(data.signals || []);
          setStats(data.stats);
          if (data.perSymbolStats) setPerSymbolStats(data.perSymbolStats);
        }
      }
    } catch (err) {
      console.warn("Failed to fetch signal journal:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSignals();
  }, []);

  const formatJournalPrice = (price: number | string, sym: string) => {
    const num = Number(price);
    if (isNaN(num)) return "0.00";
    const s = sym.toUpperCase();
    const precision = s.includes("JPY")
      ? 2
      : ["EUR", "GBP", "AUD", "NZD", "USD", "CAD", "CHF"].some(c => s.startsWith(c) || s.endsWith(c))
      ? 4
      : ["XRP", "ADA", "DOGE", "SUI"].some(c => s.startsWith(c))
      ? 4
      : num < 10 && num > 0
      ? 4
      : 2;
    if (num >= 1000) return num.toLocaleString(undefined, { minimumFractionDigits: precision, maximumFractionDigits: precision });
    return num.toFixed(precision);
  };

  const getStatusBadge = (status: DbAiSignal["status"], pnl: number) => {
    switch (status) {
      case "HIT_TP2":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
            <span>ชน TP2 (+{pnl} pips)</span>
          </span>
        );
      case "HIT_TP1":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
            <span>ชน TP1 (+{pnl} pips)</span>
          </span>
        );
      case "HIT_SL":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/15 text-rose-400 border border-rose-500/30">
            <XCircle className="w-3 h-3 text-rose-400" />
            <span>ชน SL ({pnl} pips)</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30">
            <Clock className="w-3 h-3 text-amber-400" />
            <span>เปิดรอราคา (ACTIVE)</span>
          </span>
        );
    }
  };

  return (
    <div className="bg-surface-100 border border-slate-800 rounded-2xl p-4 shadow-sm space-y-3.5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <Award className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <span>AI Trade Journal & Real Win-Rate Tracker</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                Neon Postgres
              </span>
            </h3>
            <p className="text-[11px] text-slate-400">
              บันทึกประวัติสัญญาณเทรดจริง & ตรวจสอบผลลัพธ์ย้อนหลังอย่างโปร่งใส
            </p>
          </div>
        </div>

        <button
          onClick={() => fetchSignals(selectedSymbol !== "ALL" ? selectedSymbol : undefined)}
          disabled={isLoading}
          className="p-1.5 rounded-lg bg-surface-50 hover:bg-slate-800 border border-slate-700 text-slate-400 hover:text-white transition-all text-xs flex items-center gap-1"
          title="รีเฟรชข้อมูลล่าสุด"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin text-brand-blue" : ""}`} />
          <span className="hidden xs:inline text-[11px]">อัปเดต</span>
        </button>
      </div>

      {/* 4 Performance KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-center">
        {/* 1. Win Rate */}
        <div className="p-2.5 rounded-xl bg-surface-50 border border-slate-800 space-y-0.5">
          <span className="text-[10px] text-slate-400 block font-medium">Win Rate สะสม</span>
          <span className="text-base sm:text-lg font-mono font-black text-emerald-400 block">
            {stats.winRatePct}%
          </span>
          <span className="text-[10px] text-slate-500 font-mono block truncate">
            เป้าสถาบัน &gt; 75%
          </span>
        </div>

        {/* 2. Total PnL Pips */}
        <div className="p-2.5 rounded-xl bg-surface-50 border border-slate-800 space-y-0.5">
          <span className="text-[10px] text-slate-400 block font-medium">กำไรสุทธิสะสม</span>
          <span className={`text-base sm:text-lg font-mono font-black block ${stats.netPips >= 0 ? "text-emerald-300" : "text-rose-400"}`}>
            {stats.netPips >= 0 ? `+${stats.netPips}` : stats.netPips} <span className="text-xs font-sans text-slate-400 font-normal">pips</span>
          </span>
          <span className="text-[10px] text-slate-500 font-mono block truncate">
            (Pips สะสมจริง)
          </span>
        </div>

        {/* 3. Win / Loss Count */}
        <div className="p-2.5 rounded-xl bg-surface-50 border border-slate-800 space-y-0.5">
          <span className="text-[10px] text-slate-400 block font-medium">สถิติ ชนะ / แพ้</span>
          <span className="text-base sm:text-lg font-mono font-black text-slate-100 block">
            <span className="text-emerald-400">{stats.winCount}</span>
            <span className="text-slate-500 mx-1">/</span>
            <span className="text-rose-400">{stats.lossCount}</span>
          </span>
          <span className="text-[10px] text-slate-500 font-mono block truncate">
            จากทั้งหมด {stats.totalSignals} ไม้
          </span>
        </div>

        {/* 4. Active Signals */}
        <div className="p-2.5 rounded-xl bg-surface-50 border border-slate-800 space-y-0.5">
          <span className="text-[10px] text-slate-400 block font-medium">ออเดอร์เปิดอยู่</span>
          <span className="text-base sm:text-lg font-mono font-black text-amber-300 block">
            {stats.activeCount}
          </span>
          <span className="text-[10px] text-slate-500 font-mono block truncate">
            (Active Signals)
          </span>
        </div>
      </div>

      {/* ─── Symbol Filter Tabs ─── */}
      {perSymbolStats.length > 0 && (
        <div className="space-y-2.5">
          <div className="flex items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-indigo-400" />
            <span className="text-[11px] font-semibold text-slate-400">กรองตามคู่เงิน:</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            <button
              onClick={() => { setSelectedSymbol("ALL"); fetchSignals(); }}
              className={`px-2.5 py-1 rounded-lg text-[10px] font-bold font-mono transition-all border ${
                selectedSymbol === "ALL"
                  ? "bg-indigo-500/20 text-indigo-300 border-indigo-500/40"
                  : "bg-surface-50 text-slate-400 border-slate-700 hover:bg-slate-800 hover:text-white"
              }`}
            >
              ALL
            </button>
            {perSymbolStats.map((ps) => (
              <button
                key={ps.symbol}
                onClick={() => { setSelectedSymbol(ps.symbol); fetchSignals(ps.symbol); }}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-bold font-mono transition-all border ${
                  selectedSymbol === ps.symbol
                    ? "bg-indigo-500/20 text-indigo-300 border-indigo-500/40"
                    : "bg-surface-50 text-slate-400 border-slate-700 hover:bg-slate-800 hover:text-white"
                }`}
              >
                {ps.symbol}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ─── Per-Symbol Win Rate Breakdown Table ─── */}
      {perSymbolStats.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-3.5 h-3.5 text-cyan-400" />
            <span className="text-[11px] font-semibold text-slate-400">
              สถิติ Win Rate แยกตามคู่เงิน (Live + Backtest รวม):
            </span>
          </div>
          <div className="overflow-x-auto rounded-xl border border-slate-800">
            <table className="w-full text-[10px] font-mono">
              <thead>
                <tr className="bg-surface-50 text-slate-400 border-b border-slate-800">
                  <th className="px-2.5 py-2 text-left font-semibold">คู่เงิน</th>
                  <th className="px-2 py-2 text-center font-semibold">ทั้งหมด</th>
                  <th className="px-2 py-2 text-center font-semibold">ชนะ</th>
                  <th className="px-2 py-2 text-center font-semibold">แพ้</th>
                  <th className="px-2 py-2 text-center font-semibold">Win Rate</th>
                  <th className="px-2 py-2 text-right font-semibold">กำไร (pips)</th>
                  <th className="px-2 py-2 text-center font-semibold">Live</th>
                  <th className="px-2 py-2 text-center font-semibold">BT</th>
                </tr>
              </thead>
              <tbody>
                {perSymbolStats.map((ps, idx) => (
                  <tr
                    key={ps.symbol}
                    className={`border-b border-slate-800/50 hover:bg-slate-800/40 transition-colors cursor-pointer ${
                      selectedSymbol === ps.symbol ? "bg-indigo-500/10" : ""
                    }`}
                    onClick={() => { setSelectedSymbol(ps.symbol); fetchSignals(ps.symbol); }}
                  >
                    <td className="px-2.5 py-2 text-white font-bold">
                      {ps.symbol}
                    </td>
                    <td className="px-2 py-2 text-center text-slate-300">{ps.totalTrades}</td>
                    <td className="px-2 py-2 text-center text-emerald-400 font-bold">{ps.wins}</td>
                    <td className="px-2 py-2 text-center text-rose-400 font-bold">{ps.losses}</td>
                    <td className="px-2 py-2 text-center">
                      <span className={`font-black ${
                        ps.winRatePct >= 75 ? "text-emerald-400" :
                        ps.winRatePct >= 50 ? "text-amber-400" : "text-rose-400"
                      }`}>
                        {ps.winRatePct}%
                      </span>
                    </td>
                    <td className={`px-2 py-2 text-right font-bold ${ps.netPips >= 0 ? "text-emerald-300" : "text-rose-400"}`}>
                      {ps.netPips >= 0 ? `+${ps.netPips}` : ps.netPips}
                    </td>
                    <td className="px-2 py-2 text-center">
                      <span className="px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 text-[9px]">
                        {ps.liveTrades}
                      </span>
                    </td>
                    <td className="px-2 py-2 text-center">
                      <span className="px-1.5 py-0.5 rounded bg-violet-500/10 text-violet-300 border border-violet-500/20 text-[9px]">
                        {ps.backtestTrades}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Recent Recorded Signals List */}
      <div className="space-y-2">
        <span className="text-[11px] font-semibold text-slate-400 block">
          ประวัติสัญญาณล่าสุดที่บันทึกลง Database:
        </span>

        {signals.length === 0 ? (
          <div className="p-6 rounded-xl bg-surface-50 border border-slate-800/80 text-center space-y-1.5 text-xs text-slate-400">
            <ShieldCheck className="w-6 h-6 text-indigo-400 mx-auto opacity-70" />
            <p className="font-semibold text-slate-300">ฐานข้อมูล Neon พร้อมทำงานเรียบร้อยแล้ว</p>
            <p className="text-[11px] text-slate-500">
              เมื่อระบบตรวจพบสัญญาณเทรดที่เข้าเงื่อนไข (Grade A หรือ B+) สัญญาณจะถูกบันทึกและวัดผลอัตโนมัติที่นี่ครับ
            </p>
          </div>
        ) : (
          <div className="space-y-1.5 max-h-[340px] overflow-y-auto pr-1">
            {signals.map((sig) => (
              <div
                key={sig.id}
                className="p-2.5 rounded-xl bg-surface-50 hover:bg-slate-800/60 border border-slate-800/80 transition-all flex flex-wrap items-center justify-between gap-2"
              >
                {/* Left info */}
                <div className="flex items-center gap-2.5">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-black font-mono ${
                    sig.action === "BUY"
                      ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                      : "bg-rose-500/20 text-rose-300 border border-rose-500/40"
                  }`}>
                    {sig.action}
                  </span>

                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-white font-mono">{sig.symbol}</span>
                      <span className="text-[10px] text-slate-400 font-mono">({sig.timeframe})</span>
                      <span className="text-[10px] font-bold text-slate-300 px-1.5 py-0.2 rounded bg-surface-100 border border-slate-700">
                        {sig.order_type}
                      </span>
                    </div>

                    <div className="text-[10px] text-slate-400 font-mono flex items-center gap-2 mt-0.5">
                      <span>เข้า: <strong className="text-amber-300">{formatJournalPrice(sig.entry_price, sig.symbol)}</strong></span>
                      <span>SL: <strong className="text-rose-400">{formatJournalPrice(sig.stop_loss, sig.symbol)}</strong></span>
                      <span>TP1: <strong className="text-emerald-400">{formatJournalPrice(sig.take_profit1, sig.symbol)}</strong></span>
                    </div>
                  </div>
                </div>

                {/* Right status */}
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-surface-100 border border-slate-700 text-slate-300">
                    {sig.setup_grade}
                  </span>
                  {getStatusBadge(sig.status, Number(sig.pnl_pips))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
