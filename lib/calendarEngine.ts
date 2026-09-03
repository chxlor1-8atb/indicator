import { getThaiTimeParts } from "./sessionEngine";

export type CalendarImpact = "HIGH" | "MEDIUM" | "LOW" | "HOLIDAY";

export interface EconomicCalendarEvent {
  id: string;
  timeStr: string;
  hour: number;
  minute: number;
  currency: string;
  impact: CalendarImpact;
  title: string;
  forecast: string;
  previous: string;
  actual?: string;
  strategyAdvice: string;
  timestamp: number;
}

export interface CalendarSafetyStatus {
  state: "SAFE_TRADING_WINDOW" | "APPROACHING_RED_FOLDER" | "RED_FOLDER_FREEZE" | "POST_NEWS_VOLATILITY";
  badgeText: string;
  badgeColor: string;
  nextHighImpactEvent: EconomicCalendarEvent | null;
  minutesToNextEvent: number | null;
  tradeAllowed: boolean;
  freezeReason: string;
  strategyPlaybook: string;
  relevantEvents: EconomicCalendarEvent[];
}

export function getDailyEconomicCalendar(symbol: string, customDate?: Date): EconomicCalendarEvent[] {
  const now = customDate || new Date();
  
  // Thailand Time (GMT+7) via Serverless-safe Intl
  const { day, month, year } = getThaiTimeParts(now);
  const startOfDay = new Date(Date.UTC(year, month - 1, day, 0, 0, 0));

  const rawEvents: Array<{
    hour: number;
    minute: number;
    currency: string;
    impact: CalendarImpact;
    title: string;
    forecast: string;
    previous: string;
    strategyAdvice: string;
  }> = [
    // Asian Session
    {
      hour: 6,
      minute: 50,
      currency: "JPY",
      impact: "MEDIUM",
      title: "Japan Retail Sales YoY (ยอดค้าปลีกญี่ปุ่น)",
      forecast: "2.1%",
      previous: "1.9%",
      strategyAdvice: "🟧 ผันผวนปานกลาง: สามารถหาจังหวะ Follow Trend คู่ JPY ได้ แต่ต้องตั้ง SL เสมอ",
    },
    {
      hour: 8,
      minute: 30,
      currency: "AUD",
      impact: "LOW",
      title: "Australia Private Sector Credit MoM",
      forecast: "0.5%",
      previous: "0.5%",
      strategyAdvice: "🟨 ผันผวนต่ำ: กราฟวิ่งตามแนวรับ-แนวต้านเชิงเทคนิคอลแม่นยำ ไม่กระทบเทรนด์หลัก",
    },
    {
      hour: 10,
      minute: 0,
      currency: "CNY",
      impact: "MEDIUM",
      title: "China Manufacturing PMI (ดัชนีการผลิตจีน)",
      forecast: "49.8",
      previous: "49.5",
      strategyAdvice: "🟧 ผันผวนปานกลาง: ส่งผลต่อทองคำและดอลลาร์ออสเตรเลีย (AUD) เล็กน้อย เทรดตามระบบปกติได้",
    },

    // European / London Session
    {
      hour: 13,
      minute: 0,
      currency: "EUR",
      impact: "LOW",
      title: "German Import Price Index MoM",
      forecast: "-0.1%",
      previous: "-0.2%",
      strategyAdvice: "🟨 ผันผวนต่ำ: กราฟเคลื่อนไหวในกรอบปกติ เหมาะกับสายเทรดแนวรับ-แนวต้าน",
    },
    {
      hour: 14,
      minute: 0,
      currency: "GBP",
      impact: "MEDIUM",
      title: "UK GDP MoM (การเติบโตทางเศรษฐกิจอังกฤษ)",
      forecast: "0.2%",
      previous: "0.0%",
      strategyAdvice: "🟧 ผันผวนปานกลาง: กราฟ GBP มักเลือกทางวิ่งชัดเจน สามารถ Follow Trend ได้โดยมี SL คุมความเสี่ยง",
    },
    {
      hour: 15,
      minute: 0,
      currency: "EUR",
      impact: "HIGH",
      title: "🔴 Eurozone Core CPI Flash Estimate (เงินเฟ้อยุโรป)",
      forecast: "2.8%",
      previous: "2.9%",
      strategyAdvice: "🟥 รุนแรงสูงสุด: ห้ามสวนเทรนด์เด็ดขาด เคลียร์กำไรหรือเลื่อน SL บังทุนก่อนเวลา 15:00 น.",
    },

    // New York / US Session (The Monster Movers)
    {
      hour: 19,
      minute: 30,
      currency: "USD",
      impact: "HIGH",
      title: "🔴 US Core CPI (ดัชนีเงินเฟ้อสหรัฐฯ) MoM",
      forecast: "0.3%",
      previous: "0.3%",
      strategyAdvice: "🟥 รุนแรงสูงสุด: กราฟทองคำและคู่เงินสามารถกระชาก 1,000–3,000 จุด ห้ามเปิดไม้ใหม่ช่วงข่าวเด็ดขาด",
    },
    {
      hour: 19,
      minute: 30,
      currency: "USD",
      impact: "HIGH",
      title: "🔴 US Non-Farm Payrolls (NFP) & Unemployment Rate",
      forecast: "165K / 4.1%",
      previous: "142K / 4.2%",
      strategyAdvice: "🟥 รุนแรงสูงสุด: บิ๊กแมตช์ของสายเทรด! ตลาดสะบัดรุนแรงสองฝั่ง รอจบแท่งแรกหลังข่าวออก 15 นาที",
    },
    {
      hour: 20,
      minute: 45,
      currency: "USD",
      impact: "MEDIUM",
      title: "🟠 US Flash Manufacturing PMI",
      forecast: "51.0",
      previous: "50.4",
      strategyAdvice: "🟧 ผันผวนปานกลาง: กราฟขยับตามทิศทางตัวเลข ไม่กระชากทำลายล้าง เล่นตามเทรนด์ได้",
    },
    {
      hour: 21,
      minute: 0,
      currency: "USD",
      impact: "HIGH",
      title: "🔴 US ISM Services PMI (ดัชนีภาคบริการสหรัฐฯ)",
      forecast: "52.5",
      previous: "51.5",
      strategyAdvice: "🟥 รุนแรงสูงสุด: ส่งผลกระทบต่อทิศทางดอลลาร์สหรัฐและทองคำโดยตรง ระวังการกระชากเปลี่ยนเทรนด์",
    },
    {
      hour: 21,
      minute: 30,
      currency: "USD",
      impact: "LOW",
      title: "🟡 US Crude Oil Inventories (สต็อกน้ำมันดิบ)",
      forecast: "-1.2M",
      previous: "-0.8M",
      strategyAdvice: "🟨 ผันผวนต่ำ: ส่งผลต่อน้ำมันและคู่เงิน CAD กราฟทองคำวิ่งตามเทคนิคอลปกติ",
    },
    {
      hour: 1,
      minute: 0,
      currency: "USD",
      impact: "HIGH",
      title: "🔴 FOMC Fed Interest Rate Decision & Powell Press",
      forecast: "5.00%",
      previous: "5.25%",
      strategyAdvice: "🟥 รุนแรงสูงสุดแห่งปี: ประธาน Fed แถลง กราฟสามารถสะบัดได้ทั้งคืน ห้ามถือออเดอร์โดยไม่มี Stop Loss",
    },
    {
      hour: 0,
      minute: 0,
      currency: "USD",
      impact: "HOLIDAY",
      title: "⚪ US Bank Holiday (ตลาดธนาคารสหรัฐฯ ปิดทำการ)",
      forecast: "-",
      previous: "-",
      strategyAdvice: "⬜️ กล่องเทา: ตลาดสหรัฐฯ ปิด วอลุ่มแห้งสนิท สเปรดอาจถ่างกว้าง แนะนำพักการเทรด",
    },
  ];

  const events: EconomicCalendarEvent[] = rawEvents.map((e, idx) => {
    const eventDate = new Date(startOfDay.getTime() + (e.hour * 3600 + e.minute * 60) * 1000);
    return {
      id: `evt-${idx}-${e.hour}-${e.minute}`,
      timeStr: `${String(e.hour).padStart(2, "0")}:${String(e.minute).padStart(2, "0")} น.`,
      hour: e.hour,
      minute: e.minute,
      currency: e.currency,
      impact: e.impact,
      title: e.title,
      forecast: e.forecast,
      previous: e.previous,
      strategyAdvice: e.strategyAdvice,
      timestamp: Math.floor(eventDate.getTime() / 1000),
    };
  });

  return events.sort((a, b) => a.hour * 60 + a.minute - (b.hour * 60 + b.minute));
}

export function getNewsSafetyShieldStatus(symbol: string, customDate?: Date): CalendarSafetyStatus {
  const now = customDate || new Date();
  
  // Thailand Time (GMT+7) via Serverless-safe Intl
  const { hour: currentHour, minute: currentMinute } = getThaiTimeParts(now);
  const currentTotalMinutes = currentHour * 60 + currentMinute;

  const allEvents = getDailyEconomicCalendar(symbol, customDate);

  const isGold = symbol.toUpperCase().includes("XAU") || symbol.toUpperCase() === "GOLD";
  const isCrypto = symbol.endsWith("USDT") || ["BTC", "ETH", "SOL", "BNB"].some((c) => symbol.startsWith(c));
  const isUSDInvolved = symbol.includes("USD") || isGold || isCrypto;
  const isEURInvolved = symbol.includes("EUR");
  const isGBPInvolved = symbol.includes("GBP");
  const isJPYInvolved = symbol.includes("JPY");

  const relevantEvents = allEvents.filter((e) => {
    if (e.currency === "USD" && isUSDInvolved) return true;
    if (e.currency === "EUR" && isEURInvolved) return true;
    if (e.currency === "GBP" && isGBPInvolved) return true;
    if (e.currency === "JPY" && isJPYInvolved) return true;
    return false;
  });

  const redFolderEvents = relevantEvents.filter((e) => e.impact === "HIGH");

  let nextRedEvent: EconomicCalendarEvent | null = null;
  let minDiffMinutes = Infinity;

  for (const e of redFolderEvents) {
    const eventTotalMinutes = e.hour * 60 + e.minute;
    const diff = eventTotalMinutes - currentTotalMinutes;

    if (diff >= -15 && diff < minDiffMinutes) {
      minDiffMinutes = diff;
      nextRedEvent = e;
    }
  }

  // 1. Pre-News Freeze: 0 to 30 minutes before Red Folder event
  if (nextRedEvent && minDiffMinutes >= 0 && minDiffMinutes <= 30) {
    return {
      state: "RED_FOLDER_FREEZE",
      badgeText: `⛔ RED FOLDER FREEZE (อีก ${minDiffMinutes} นาที)`,
      badgeColor: "bg-rose-500/20 text-rose-300 border-rose-500/40 animate-pulse",
      nextHighImpactEvent: nextRedEvent,
      minutesToNextEvent: minDiffMinutes,
      tradeAllowed: false,
      freezeReason: `ห้ามเปิดออเดอร์เด็ดขาด! กำลังจะมีการประกาศ ${nextRedEvent.title} (${nextRedEvent.timeStr}) ในอีก ${minDiffMinutes} นาที เสี่ยงโดนสเปรดถ่างและ Slippage มหาศาล`,
      strategyPlaybook: "🟥 กลยุทธ์กล่องแดง: หากไม่มีออเดอร์ 'ไม่ควรสวนเทรนด์ช่วงข่าวออก' หากมีกำไรอยู่ควรเคลียร์พอร์ต/เลื่อน SL มาบังหน้าทุนทันที",
      relevantEvents,
    };
  }

  // 2. Post-News Volatility: 0 to 15 minutes after Red Folder event
  if (nextRedEvent && minDiffMinutes < 0 && minDiffMinutes >= -15) {
    const minsAgo = Math.abs(minDiffMinutes);
    return {
      state: "POST_NEWS_VOLATILITY",
      badgeText: `⏳ POST-NEWS VOLATILITY (เพิ่งออกเมื่อ ${minsAgo} นาทีที่แล้ว)`,
      badgeColor: "bg-amber-500/20 text-amber-300 border-amber-500/40 animate-pulse",
      nextHighImpactEvent: nextRedEvent,
      minutesToNextEvent: minDiffMinutes,
      tradeAllowed: false,
      freezeReason: `ข่าว ${nextRedEvent.title} เพิ่งประกาศออกไป กราฟกำลังสะบัดแรงและเซ็ตแนวรับ-แนวต้านใหม่ ควรรอให้จบแท่งเทียน 15 นาทีแรกก่อนพิจารณาเข้าเทรด`,
      strategyPlaybook: "⏳ กลยุทธ์หลังข่าว: รอการปฏิเสธราคา (Rejection) หรือจบแท่งแรกเพื่อยืนยันทิศทางจริง ไม่กระโดดตามน้ำ (FOMO)",
      relevantEvents,
    };
  }

  // 3. Approaching Red Folder: 31 to 60 minutes before
  if (nextRedEvent && minDiffMinutes > 30 && minDiffMinutes <= 60) {
    return {
      state: "APPROACHING_RED_FOLDER",
      badgeText: `⚠️ APPROACHING RED FOLDER (อีก ${minDiffMinutes} นาที)`,
      badgeColor: "bg-amber-500/20 text-amber-300 border-amber-500/30",
      nextHighImpactEvent: nextRedEvent,
      minutesToNextEvent: minDiffMinutes,
      tradeAllowed: true,
      freezeReason: `มีข่าวกล่องแดง ${nextRedEvent.title} ในอีก ${minDiffMinutes} นาที แนะนำให้ทยอยปิดทำกำไร (Lock Profit) หรือเลื่อน SL บังหน้าทุน`,
      strategyPlaybook: "⚠️ กลยุทธ์เตรียมตัว: ตลาดอาจเริ่มชะลอตัวเพื่อรอตัวเลขข่าว แนะนำเก็บกำไรระยะสั้นและคุมความเสี่ยง",
      relevantEvents,
    };
  }

  // 4. Safe Trading Window
  return {
    state: "SAFE_TRADING_WINDOW",
    badgeText: "🟢 SAFE TRADING WINDOW",
    badgeColor: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40",
    nextHighImpactEvent: nextRedEvent && minDiffMinutes > 60 ? nextRedEvent : null,
    minutesToNextEvent: nextRedEvent && minDiffMinutes > 60 ? minDiffMinutes : null,
    tradeAllowed: true,
    freezeReason: nextRedEvent
      ? `ปลอดภัย ไม่มีข่าวกล่องแดงในระยะประชิด (ข่าวใหญ่ถัดไป: ${nextRedEvent.title} เวลา ${nextRedEvent.timeStr})`
      : "ปลอดภัย ไม่มีข่าวกล่องแดงกระทบคู่เงินนี้ในวันนี้ กราฟวิ่งตามปัจจัยเทคนิคอล 100%",
    strategyPlaybook: "🟨/🟧 กลยุทธ์สภาวะปกติ: กราฟวิ่งตามแนวรับ-แนวต้านเชิงเทคนิคอลแม่นยำสูง สามารถเทรดตามระบบสัญญาณ AI ได้อย่างเต็มประสิทธิภาพ",
    relevantEvents,
  };
}