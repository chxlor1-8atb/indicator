"use client";

import React, { useState } from "react";
import { NewsItem } from "@/lib/types";
import { Newspaper, ExternalLink, Flame, TrendingUp, TrendingDown, Minus, Filter, Calendar, Clock, AlertOctagon } from "lucide-react";
import { getDailyEconomicCalendar } from "@/lib/calendarEngine";

interface NewsFeedProps {
  news: NewsItem[];
  isLoading: boolean;
  selectedAsset: string;
}

export default function NewsFeed({ news, isLoading, selectedAsset }: NewsFeedProps) {
  const [viewMode, setViewMode] = useState<"NEWS" | "CALENDAR">("NEWS");
  const [filter, setFilter] = useState<"ALL" | "RELEVANT" | "HIGH_IMPACT">("ALL");

  const calendarEvents = getDailyEconomicCalendar(selectedAsset);

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
    <div className="bg-surface-100 border border-slate-800 rounded-2xl p-4 shadow-sm flex flex-col h-full">
      {/* Header with Mode Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-3 border-b border-slate-800/80">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            {viewMode === "NEWS" ? <Newspaper className="w-4 h-4" /> : <Calendar className="w-4 h-4 text-amber-400" />}
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">
              {viewMode === "NEWS" ? "ข่าวสารเศรษฐกิจสด & ปฏิทินการเงิน" : "ปฏิทินเศรษฐกิจ 4 สี (Forex Factory)"}
            </h3>
            <p className="text-[11px] text-slate-400">
              {viewMode === "NEWS" ? "เกาะติดพาดหัวข่าวสำคัญระดับโลกแบบ Real-time" : "กล่องแดง 🔴 ส้ม 🟠 เหลือง 🟡 เทา ⚪ (เวลาไทย GMT+7)"}
            </p>
          </div>
        </div>

        {/* View Mode Toggle Buttons */}
        <div className="flex items-center gap-1 bg-surface-50 p-1 rounded-lg border border-slate-800 text-xs">
          <button
            onClick={() => setViewMode("NEWS")}
            className={`px-2.5 py-1 rounded font-medium transition-all ${
              viewMode === "NEWS" ? "bg-slate-800 text-white shadow-sm" : "text-slate-400 hover:text-slate-200"
            }`}
          >
            📰 ข่าวสารทันเหตุการณ์
          </button>
          <button
            onClick={() => setViewMode("CALENDAR")}
            className={`px-2.5 py-1 rounded font-medium transition-all ${
              viewMode === "CALENDAR" ? "bg-slate-800 text-amber-300 shadow-sm" : "text-slate-400 hover:text-slate-200"
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
          <div className="flex items-center gap-1 bg-surface-50 p-0.5 rounded border border-slate-800 text-[10px]">
            <button
              onClick={() => setFilter("ALL")}
              className={`px-2 py-0.5 rounded transition-all ${
                filter === "ALL" ? "bg-slate-800 text-white" : "text-slate-400 hover:text-slate-200"
              }`}
            >
              ทั้งหมด
            </button>
            <button
              onClick={() => setFilter("RELEVANT")}
              className={`px-2 py-0.5 rounded transition-all ${
                filter === "RELEVANT" ? "bg-slate-800 text-white" : "text-slate-400 hover:text-slate-200"
              }`}
            >
              #{selectedAsset}
            </button>
            <button
              onClick={() => setFilter("HIGH_IMPACT")}
              className={`px-2 py-0.5 rounded transition-all ${
                filter === "HIGH_IMPACT" ? "bg-amber-500/20 text-amber-300" : "text-slate-400 hover:text-slate-200"
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
          /* Economic Calendar View */
          calendarEvents.map((evt) => {
            const isRed = evt.impact === "HIGH";
            const isOrange = evt.impact === "MEDIUM";
            const isYellow = evt.impact === "LOW";

            return (
              <div
                key={evt.id}
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
          })
        ) : isLoading ? (
          <div className="py-12 text-center text-xs text-slate-500 space-y-2">
            <div className="w-6 h-6 border-2 border-brand-blue border-t-transparent rounded-full animate-spin mx-auto"></div>
            <p>กำลังดึงข้อมูลข่าวสารตลาดการเงินสด...</p>
          </div>
        ) : filteredNews.length === 0 ? (
          <div className="py-10 text-center text-xs text-slate-500">
            ไม่พบหัวข้อข่าวสารสำหรับตัวกรองนี้
          </div>
        ) : (
          filteredNews.map((item) => (
            <div
              key={item.id}
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

              {/* Summary */}
              {item.summary && (
                <p className="text-[11px] text-slate-400 mt-1 line-clamp-2 leading-normal">
                  {item.summary}
                </p>
              )}

              {/* Related tags */}
              {item.relatedSymbols.length > 0 && (
                <div className="flex items-center gap-1 mt-2">
                  {item.relatedSymbols.map((sym) => (
                    <span
                      key={sym}
                      className={`text-[9px] font-mono px-1.5 py-0.5 rounded border ${
                        sym === selectedAsset
                          ? "bg-blue-500/10 text-blue-400 border-blue-500/30"
                          : "bg-surface-100 text-slate-500 border-slate-800"
                      }`}
                    >
                      #{sym}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}