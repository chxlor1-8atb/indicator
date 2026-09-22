"use client";

import React, { useState } from "react";
import { NewsItem } from "@/lib/types";
import { Newspaper, ExternalLink, Flame, TrendingUp, TrendingDown, Minus, Filter, Calendar, Clock, AlertOctagon, Copy, Check } from "lucide-react";
import { getDailyEconomicCalendar, getNewsSafetyShieldStatus } from "@/lib/calendarEngine";

interface NewsFeedProps {
  news: NewsItem[];
  isLoading: boolean;
  selectedAsset: string;
  lastNewsTime?: number | null;
}

function NewsFeed({ news, isLoading, selectedAsset, lastNewsTime }: NewsFeedProps) {
  const [viewMode, setViewMode] = useState<"NEWS" | "CALENDAR">("NEWS");
  const [filter, setFilter] = useState<"ALL" | "RELEVANT" | "HIGH_IMPACT">("ALL");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopyNewsLink = (e: React.MouseEvent, item: NewsItem) => {
    e.preventDefault();
    e.stopPropagation();
    if (item.url) {
      navigator.clipboard.writeText(item.url);
      setCopiedId(item.id);
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  const calendarEvents = getDailyEconomicCalendar(selectedAsset);
  const safetyStatus = getNewsSafetyShieldStatus(selectedAsset);

  const filteredNews = news.filter((item) => {
    if (filter === "HIGH_IMPACT") return item.impact === "HIGH";
    if (filter === "RELEVANT") return item.relatedSymbols.includes(selectedAsset) || item.impact === "HIGH";
    return true;
  });

  const getSentimentBadge = (sentiment: NewsItem["sentiment"]) => {
    switch (sentiment) {
      case "BULLISH":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <TrendingUp className="w-3 h-3" /> 🟢 แรงซื้อหนุน (มองขึ้น)
          </span>
        );
      case "BEARISH":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20">
            <TrendingDown className="w-3 h-3" /> 🔴 แรงขายกดดัน (มองลง)
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-500/10 text-slate-400 border border-slate-700/40">
            <Minus className="w-3 h-3" /> ⚪ ทรงตัวในกรอบ (เป็นกลาง)
          </span>
        );
    }
  };

  const getImpactBadge = (impact: NewsItem["impact"]) => {
    if (impact === "HIGH") {
      return (
        <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30">
          <Flame className="w-3 h-3" /> 🔥 ข่าวสำคัญมาก
        </span>
      );
    }
    return null;
  };

  const getTimeAgo = (isoString: string) => {
    const seconds = Math.floor((Date.now() - new Date(isoString).getTime()) / 1000);
    if (seconds < 60) return "เมื่อสักครู่";
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes} นาทีที่แล้ว`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} ชั่วโมงที่แล้ว`;
    return `${Math.floor(hours / 24)} วันที่แล้ว`;
  };

  return (
    <div className="terminal-card p-4 flex flex-col h-full">
      {/* Header with Mode Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-md bg-surface-50 text-slate-300 border border-slate-800 shadow-xs">
            {viewMode === "NEWS" ? <Newspaper className="w-4 h-4 text-primary" /> : <Calendar className="w-4 h-4 text-amber-400" />}
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white tracking-tight">
              {viewMode === "NEWS" ? "ข่าวสารเศรษฐกิจสด & ปฏิทินการเงิน" : "ปฏิทินเศรษฐกิจ 4 สี (Forex Factory)"}
            </h3>
            <p className="text-[11px] text-slate-400">
              {viewMode === "NEWS" ? "เกาะติดพาดหัวข่าวสำคัญระดับโลกแบบ Real-time" : "กล่องแดง 🔴 ส้ม 🟠 เหลือง 🟡 เทา ⚪ (เวลาไทย GMT+7)"}
              {lastNewsTime && (
                <span className="text-[10px] text-slate-500 font-mono ml-1.5 border-l border-slate-700 pl-1.5">
                  ดึงข่าว: {new Date(lastNewsTime).toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                </span>
              )}
            </p>
          </div>
        </div>

        {/* View Mode Toggle Buttons */}
        <div className="flex items-center gap-1 bg-surface-50 p-0.5 rounded-md border border-slate-800 text-xs">
          <button
            onClick={() => setViewMode("NEWS")}
            className={`px-2.5 py-1 rounded-[5px] font-semibold transition-colors cursor-pointer ${
              viewMode === "NEWS" ? "bg-primary text-white shadow-xs" : "text-slate-400 hover:text-slate-200"
            }`}
          >
            📰 ข่าวสารทันเหตุการณ์
          </button>
          <button
            onClick={() => setViewMode("CALENDAR")}
            className={`px-2.5 py-1 rounded-[5px] font-semibold transition-colors cursor-pointer ${
              viewMode === "CALENDAR" ? "bg-primary text-white shadow-xs" : "text-slate-400 hover:text-slate-200"
            }`}
          >
            📅 ปฏิทิน 4 กล่องข่าว
          </button>
        </div>
      </div>

      {/* Sub-filter if News Mode */}
      {viewMode === "NEWS" && (
        <div className="flex items-center justify-between pt-2.5 pb-1">
          <span className="text-[10px] text-slate-400 font-semibold">ตัวกรอง:</span>
          <div className="flex items-center gap-1 bg-[#0E131F] p-0.5 rounded-lg border border-slate-800 text-[10px]">
            <button
              onClick={() => setFilter("ALL")}
              className={`px-2 py-0.5 rounded transition-all cursor-pointer ${
                filter === "ALL" ? "bg-slate-800 text-white font-bold" : "text-slate-400 hover:text-slate-200"
              }`}
            >
              ทั้งหมด
            </button>
            <button
              onClick={() => setFilter("RELEVANT")}
              className={`px-2 py-0.5 rounded transition-all cursor-pointer ${
                filter === "RELEVANT" ? "bg-slate-800 text-cyan-300 font-bold border border-cyan-500/30" : "text-slate-400 hover:text-slate-200"
              }`}
            >
              #{selectedAsset}
            </button>
            <button
              onClick={() => setFilter("HIGH_IMPACT")}
              className={`px-2 py-0.5 rounded transition-all cursor-pointer ${
                filter === "HIGH_IMPACT" ? "bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30" : "text-slate-400 hover:text-slate-200"
              }`}
            >
              เฉพาะข่าวสำคัญมาก
            </button>
          </div>
        </div>
      )}

      {/* Content Feed */}
      <div className="mt-3 space-y-2.5 overflow-y-auto flex-1 max-h-[520px] lg:max-h-[calc(100vh-220px)] pr-1">
        {viewMode === "CALENDAR" ? (
          <>
            {/* Live Economic Calendar Shield Telemetry Banner */}
            <div className={`p-3 rounded-xl border flex flex-col gap-2 mb-2.5 ${
              safetyStatus.state === "RED_FOLDER_FREEZE"
                ? "bg-rose-950/30 border-rose-500/50 shadow-lg shadow-rose-950/20"
                : safetyStatus.state === "POST_NEWS_VOLATILITY"
                ? "bg-amber-950/30 border-amber-500/50"
                : safetyStatus.state === "APPROACHING_RED_FOLDER"
                ? "bg-amber-950/20 border-amber-500/40"
                : "bg-emerald-950/20 border-emerald-500/30"
            }`}>
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className={`p-1.5 rounded-lg ${
                    !safetyStatus.tradeAllowed
                      ? "bg-rose-500/20 text-rose-300 animate-pulse"
                      : safetyStatus.state === "APPROACHING_RED_FOLDER"
                      ? "bg-amber-500/20 text-amber-300"
                      : "bg-emerald-500/20 text-emerald-300"
                  }`}>
                    <AlertOctagon className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-100 flex items-center gap-1.5">
                      {safetyStatus.badgeText}
                    </span>
                    <span className="text-[10px] text-slate-400 block">
                      {safetyStatus.freezeReason}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-black/40 border border-slate-700 text-purple-300">
                    📡 Forex Factory Live
                  </span>
                </div>
              </div>

              {/* Safety Specs Bar */}
              <div className="grid grid-cols-3 gap-1.5 text-[10px] font-mono pt-2 border-t border-slate-800/80">
                <div className="bg-black/30 p-1.5 rounded border border-slate-800 text-center">
                  <span className="text-slate-400 block">สถานะเทรด</span>
                  <span className={`font-bold ${safetyStatus.tradeAllowed ? "text-emerald-400" : "text-rose-400"}`}>
                    {safetyStatus.tradeAllowed ? "✅ ALLOWED" : "⛔ FROZEN"}
                  </span>
                </div>
                <div className="bg-black/30 p-1.5 rounded border border-slate-800 text-center">
                  <span className="text-slate-400 block">เกราะ Spread</span>
                  <span className="font-bold text-amber-300">
                    {safetyStatus.spreadSafetyMultiplier ?? 1.0}x Buffer
                  </span>
                </div>
                <div className="bg-black/30 p-1.5 rounded border border-slate-800 text-center">
                  <span className="text-slate-400 block">การปรับ Lot</span>
                  <span className={`font-bold ${
                    (safetyStatus.positionSizeReductionPct ?? 0) > 0 ? "text-rose-400" : "text-emerald-400"
                  }`}>
                    {(safetyStatus.positionSizeReductionPct ?? 0) > 0 ? `-${safetyStatus.positionSizeReductionPct}%` : "100% ปกติ"}
                  </span>
                </div>
              </div>
            </div>

            {/* Economic Calendar View */}
            {calendarEvents.map((evt, idx) => {
              const isRed = evt.impact === "HIGH";
              const isOrange = evt.impact === "MEDIUM";
              const isYellow = evt.impact === "LOW";

              return (
                <div
                  key={`${evt.id}-${idx}`}
                  className={`p-3 rounded-xl border transition-all ${
                    isRed
                      ? "bg-rose-950/20 border-rose-500/30 hover:border-rose-500/50"
                      : isOrange
                      ? "bg-amber-950/15 border-amber-500/30 hover:border-amber-500/50"
                      : "bg-surface-50 border-slate-800 hover:border-slate-700"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs">
                        {isRed ? "🔴" : isOrange ? "🟠" : isYellow ? "🟡" : "⚪"}
                      </span>
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-surface-100 border border-slate-700 text-amber-300 font-bold">
                        {evt.timeStr}
                      </span>
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-surface-100 border border-slate-700 text-slate-300 font-bold">
                        {evt.currency}
                      </span>
                    </div>

                    <span
                      className={`text-[9px] font-bold px-2 py-0.5 rounded-full border uppercase ${
                        isRed
                          ? "bg-rose-500/20 text-rose-300 border-rose-500/40"
                          : isOrange
                          ? "bg-amber-500/20 text-amber-300 border-amber-500/40"
                          : "bg-slate-700/60 text-slate-300 border-slate-600"
                      }`}
                    >
                      {isRed ? "กล่องแดง (รุนแรงสุด)" : isOrange ? "กล่องส้ม (ปานกลาง)" : "กล่องเหลือง (ผันผวนต่ำ)"}
                    </span>
                  </div>

                  <div className="flex items-start justify-between gap-2 mb-2">
                    <span className="text-xs font-semibold text-slate-100 block leading-tight">
                      {evt.title}
                    </span>
                    <div className="text-right shrink-0 text-[10px] font-mono">
                      <span className="text-slate-300 block">คาดการณ์: {evt.forecast}</span>
                      <span className="text-slate-500 block">ครั้งก่อน: {evt.previous}</span>
                    </div>
                  </div>

                  {/* Practical Advice for Beginners */}
                  <div className="p-2 rounded-lg bg-surface-100/90 border border-slate-800/90 text-[11px] text-slate-300 leading-relaxed">
                    <span className="font-semibold text-amber-300">💡 คำแนะนำ: </span>
                    {evt.strategyAdvice}
                  </div>
                </div>
              );
            })}
          </>
        ) : isLoading ? (
          <div className="space-y-2.5">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="p-3 bg-surface-50 border border-slate-800/80 rounded-xl space-y-2 animate-pulse"
              >
                <div className="flex items-center justify-between">
                  <div className="h-3 w-20 bg-slate-700/60 rounded" />
                  <div className="h-3 w-16 bg-slate-800 rounded" />
                </div>
                <div className="h-4 w-5/6 bg-slate-700/80 rounded" />
                <div className="h-3 w-2/3 bg-slate-800/80 rounded" />
              </div>
            ))}
          </div>
        ) : filteredNews.length === 0 ? (
          <div className="py-10 text-center text-xs text-slate-500">
            ไม่พบหัวข้อข่าวสารสำหรับตัวกรองนี้
          </div>
        ) : (
          filteredNews.map((item, idx) => (
            <div
              key={`${item.id}-${idx}`}
              className="p-3 bg-surface-50 hover:bg-slate-800/60 border border-slate-800/80 hover:border-slate-700/80 rounded-xl transition-all group"
            >
              {/* Badges and Source */}
              <div className="flex items-center justify-between gap-2 mb-1.5 flex-wrap">
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] font-semibold text-slate-300">{item.source}</span>
                  <span className="text-[10px] text-slate-500">• {getTimeAgo(item.publishedAt)}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  {getImpactBadge(item.impact)}
                  {getSentimentBadge(item.sentiment)}
                </div>
              </div>

              {/* Title & Link */}
              <a
                href={item.url}
                target="_blank"
                rel="noreferrer"
                className="text-xs font-semibold text-slate-200 group-hover:text-brand-blue transition-colors line-clamp-2 leading-relaxed flex items-start justify-between gap-1"
              >
                <span>{item.title}</span>
                <ExternalLink className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 mt-0.5 text-slate-400" />
              </a>

              {/* Summary (Clean text only - ซ่อนลิงก์ดิบและโค้ด HTML รกตาทั้งหมด) */}
              {item.summary && 
               !item.summary.includes("&lt;") && 
               !item.summary.includes("<a") && 
               !item.summary.includes("href=") && 
               !item.summary.startsWith("http") && (
                <p className="text-[11px] text-slate-400 mt-1 line-clamp-2 leading-normal">
                  {item.summary}
                </p>
              )}

              {/* Card Footer: Related tags & Copy Link action */}
              <div className="flex items-center justify-between gap-2 mt-2.5 pt-2 border-t border-slate-800/60">
                {/* Related tags */}
                <div className="flex items-center gap-1 flex-wrap">
                  {item.relatedSymbols.length > 0 ? (
                    Array.from(new Set(item.relatedSymbols)).map((sym, tagIdx) => (
                      <span
                        key={`${sym}-${tagIdx}`}
                        className={`text-[9px] font-mono px-1.5 py-0.5 rounded border ${
                          sym === selectedAsset
                            ? "bg-blue-500/10 text-blue-400 border-blue-500/30"
                            : "bg-surface-100 text-slate-500 border-slate-800"
                        }`}
                      >
                        #{sym}
                      </span>
                    ))
                  ) : (
                    <span className="text-[9px] text-slate-600 font-mono">#Market</span>
                  )}
                </div>

                {/* Copy Link & Source Link Actions */}
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={(e) => handleCopyNewsLink(e, item)}
                    title="คัดลอกลิงก์ข่าวต้นทาง"
                    className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-surface-100 hover:bg-white/[0.08] border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white transition-colors"
                  >
                    {copiedId === item.id ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-400" />
                        <span className="text-emerald-400 font-semibold">คัดลอกแล้ว</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3 text-slate-400" />
                        <span>คัดลอกลิงก์</span>
                      </>
                    )}
                  </button>

                  <a
                    href={item.url}
                    target="_blank"
                    rel="noreferrer"
                    title="เปิดอ่านข่าวต้นทาง"
                    className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-700/80 transition-all flex items-center"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default React.memo(NewsFeed);