import { getThaiTimeParts } from "./sessionEngine";
import { Candle } from "./types";

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
  state: "SAFE_TRADING_WINDOW" | "APPROACHING_RED_FOLDER" | "RED_FOLDER_FREEZE" | "POST_NEWS_VOLATILITY" | "POST_NEWS_SNIPER_ACTIVE";
  badgeText: string;
  badgeColor: string;
  nextHighImpactEvent: EconomicCalendarEvent | null;
  minutesToNextEvent: number | null;
  tradeAllowed: boolean;
  freezeReason: string;
  strategyPlaybook: string;
  relevantEvents: EconomicCalendarEvent[];
  spreadSafetyMultiplier?: number;
  positionSizeReductionPct?: number;
  isLiveFeed?: boolean;
  newsSweepInfo?: {
    sweptSide: "BSL" | "SSL" | "BOTH";
    sweepHigh: number;
    sweepLow: number;
    isTurtleSoupConfirmed: boolean;
    newsFvgLevel?: number;
  };
  economicSurprise?: {
    actual: string;
    forecast: string;
    deviationSigma: number;
    surpriseSentiment: "HAWKISH" | "DOVISH" | "NEUTRAL";
  };
}

interface ForexFactoryRawItem {
  title: string;
  country: string;
  date: string;
  impact: string;
  forecast?: string;
  previous?: string;
}

let _liveEventsCache: EconomicCalendarEvent[] = [];
let _lastCalendarSyncTime = 0;
const CALENDAR_CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes

/**
 * Fetches real-time Forex Factory calendar events from CDN and maps to GMT+7 Bangkok time.
 */
export async function syncLiveEconomicCalendar(): Promise<EconomicCalendarEvent[]> {
  // In the browser, do not fetch third-party JSON directly to avoid CORS violations.
  if (typeof window !== "undefined") {
    return _liveEventsCache;
  }

  const now = Date.now();
  if (_liveEventsCache.length > 0 && now - _lastCalendarSyncTime < CALENDAR_CACHE_TTL_MS) {
    return _liveEventsCache;
  }

  try {
    const res = await fetch("https://nfs.faireconomy.media/ff_calendar_thisweek.json", {
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" },
      signal: AbortSignal.timeout(8000),
      next: { revalidate: 900 },
    });
    if (!res.ok) return _liveEventsCache;

    const rawList: ForexFactoryRawItem[] = await res.json();
    if (!Array.isArray(rawList)) return _liveEventsCache;

    const events: EconomicCalendarEvent[] = rawList
      .filter((item) => item && item.title && item.date)
      .map((item) => {
        const dateObj = new Date(item.date);
        const { hour, minute } = getThaiTimeParts(dateObj);
        const timeStr = `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`;
        const impactUpper = (item.impact || "LOW").toUpperCase();
        const impact: CalendarImpact =
          impactUpper === "HIGH" ? "HIGH" : impactUpper === "MEDIUM" ? "MEDIUM" : impactUpper === "LOW" ? "LOW" : "HOLIDAY";

        const cur = (item.country || "USD").toUpperCase();
        let strategyAdvice = "⚪ ข้อมูลเศรษฐกิจทั่วไป กราฟวิ่งตามปัจจัยเทคนิคอลปกติ";
        if (impact === "HIGH") {
          strategyAdvice = `🟥 ข่าวกล่องแดงแรงสูง (${cur}): กราฟอาจสะบัดรุนแรงและสเปรดถ่าง ระงับออเดอร์อัตโนมัติ 30 นาทีก่อนข่าว และ 15 นาทีหลังข่าว`;
        } else if (impact === "MEDIUM") {
          strategyAdvice = `🟧 ข่าวกล่องส้ม (${cur}): ผันผวนปานกลาง แนะนำปรับลดขนาด Lot ลง 30% และเลื่อน SL บังหน้าทุนเมื่อกำไร`;
        } else if (impact === "LOW") {
          strategyAdvice = `🟨 ข่าวกล่องเหลือง (${cur}): ผลกระทบต่ำ กราฟวิ่งตามโครงสร้างแนวรับแนวต้านเทคนิคอลปกติ`;
        }

        return {
          id: `ff_${cur}_${dateObj.getTime()}_${item.title.replace(/[^a-zA-Z0-9]/g, "").substring(0, 10)}`,
          timeStr,
          hour,
          minute,
          currency: cur,
          impact,
          title: `${impact === "HIGH" ? "🔴" : impact === "MEDIUM" ? "🟠" : impact === "LOW" ? "🟡" : "⚪"} ${item.title}`,
          forecast: item.forecast || "-",
          previous: item.previous || "-",
          strategyAdvice,
          timestamp: dateObj.getTime(),
        };
      });

    if (events.length > 0) {
      _liveEventsCache = events;
      _lastCalendarSyncTime = now;
    }
  } catch (err) {
    console.warn("[calendarEngine] Live calendar sync notice:", (err as Error)?.message || err);
  }

  return _liveEventsCache;
}

export function getDailyEconomicCalendar(symbol: string, customDate?: Date): EconomicCalendarEvent[] {
  const now = customDate || new Date();
  // Trigger background refresh on server if stale or empty (non-blocking)
  if (typeof window === "undefined" && (_liveEventsCache.length === 0 || Date.now() - _lastCalendarSyncTime > CALENDAR_CACHE_TTL_MS)) {
    syncLiveEconomicCalendar().catch(() => {});
  }
  
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
    // ─── เซสชันเอเชีย (ช่วงเช้า - บ่าย) ───
    {
      hour: 6,
      minute: 50,
      currency: "JPY",
      impact: "MEDIUM",
      title: "🟠 ยอดการใช้จ่ายของผู้บริโภคในญี่ปุ่น (Retail Sales)",
      forecast: "2.1%",
      previous: "1.9%",
      strategyAdvice: "🟧 ผันผวนปานกลาง: สะท้อนกำลังซื้อของคนญี่ปุ่น ส่งผลให้คู่เงินเยน (JPY) เคลื่อนไหวตามทิศทางชัดเจน มือใหม่สามารถเทรดตามเทรนด์หลักได้ แต่ต้องตั้งจุดยอมแพ้ (Stop Loss) ทุกครั้ง",
    },
    {
      hour: 8,
      minute: 30,
      currency: "AUD",
      impact: "LOW",
      title: "🟡 รายงานสินเชื่อภาคเอกชนออสเตรเลีย (Private Credit)",
      forecast: "0.5%",
      previous: "0.5%",
      strategyAdvice: "🟨 ผันผวนต่ำ: ข่าวนี้แทบไม่ส่งผลกระทบต่อตลาดโลก กราฟทองคำและคู่เงินจะวิ่งตามแนวรับ-แนวต้านปกติ เหมาะสำหรับมือใหม่ฝึกเทรดอย่างปลอดภัย",
    },
    {
      hour: 10,
      minute: 0,
      currency: "CNY",
      impact: "MEDIUM",
      title: "🟠 ดัชนีวัดสุขภาพภาคโรงงานของจีน (Manufacturing PMI)",
      forecast: "49.8",
      previous: "49.5",
      strategyAdvice: "🟧 ผันผวนปานกลาง: ตัวเลขชี้วัดเศรษฐกิจประเทศจีน ถ้าตัวเลขออกมาดีจะช่วยหนุนราคาทองคำและดอลลาร์ออสเตรเลีย (AUD) เล็กน้อย กราฟไม่กระชาก สามารถเทรดได้ตามปกติ",
    },

    // ─── เซสชันยุโรป / ลอนดอน (ช่วงบ่าย - ค่ำ) ───
    {
      hour: 13,
      minute: 0,
      currency: "EUR",
      impact: "LOW",
      title: "🟡 ดัชนีราคาสินค้านำเข้าของเยอรมนี (Import Price Index)",
      forecast: "-0.1%",
      previous: "-0.2%",
      strategyAdvice: "🟨 ผันผวนต่ำ: ข่าวระดับย่อย กราฟยังคงเคลื่อนไหวในกรอบเดิมอย่างสงบ ปลอดภัยสำหรับมือใหม่",
    },
    {
      hour: 14,
      minute: 0,
      currency: "GBP",
      impact: "MEDIUM",
      title: "🟠 รายงานการเติบโตทางเศรษฐกิจของอังกฤษ (UK GDP)",
      forecast: "0.2%",
      previous: "0.0%",
      strategyAdvice: "🟧 ผันผวนปานกลาง: บ่งบอกว่าเศรษฐกิจอังกฤษกำลังขยายตัวหรือชะลอตัว คู่เงินปอนด์ (GBP) มักจะเลือกทิศทางวิ่งชัดเจนหลังตัวเลขออก สามารถเทรดตามแนวโน้มได้",
    },
    {
      hour: 15,
      minute: 0,
      currency: "EUR",
      impact: "HIGH",
      title: "🔴 ดัชนีเงินเฟ้อยูโรโซน (Eurozone CPI - ค่าครองชีพยุโรป)",
      forecast: "2.8%",
      previous: "2.9%",
      strategyAdvice: "🟥 รุนแรงสูงสุด: ตัวเลขเงินเฟ้อยุโรปกระทบค่าเงินยูโรและดอลลาร์ทันที กราฟสามารถสะบัดได้หลายร้อยจุด มือใหม่ควรปิดทำกำไรล่วงหน้า หรือเลื่อนจุดยอมแพ้ (SL) มาไว้ที่ราคาเปิดเพื่อไม่ให้ขาดทุน",
    },

    // ─── เซสชันนิวยอร์ก / สหรัฐอเมริกา (ช่วงหัวค่ำ - ดึก) ───
    {
      hour: 19,
      minute: 30,
      currency: "USD",
      impact: "HIGH",
      title: "🔴 ดัชนีเงินเฟ้อสหรัฐฯ (US Core CPI - วัดค่าครองชีพคนอเมริกัน)",
      forecast: "0.3%",
      previous: "0.3%",
      strategyAdvice: "🟥 รุนแรงสูงสุด: ข่าวชี้ชะตาทองคำ! ถ้าเงินเฟ้อสูงกว่าคาด ทองคำมักร่วงแรง แต่ถ้าเงินเฟ้อลดลง ทองคำจะทะยานขึ้นทันที ตลาดจะเหวี่ยงเป็นพันจุด มือใหม่ห้ามเปิดออเดอร์เด็ดขาด ระบบจะสั่งล็อกเป็น WAIT อัตโนมัติ",
    },
    {
      hour: 19,
      minute: 30,
      currency: "USD",
      impact: "HIGH",
      title: "🔴 การจ้างงานนอกภาคเกษตรสหรัฐฯ (NFP) & อัตราการว่างงาน",
      forecast: "165K / 4.1%",
      previous: "142K / 4.2%",
      strategyAdvice: "🟥 บิ๊กแมตช์แห่งเดือน: เป็นข่าวที่มีคนเทรดมากที่สุดในโลก กราฟจะสะบัดหลอกทั้งขึ้นและลงรุนแรงมาก คำแนะนำที่ดีที่สุดสำหรับมือใหม่คือ 'นั่งดูอยู่เฉยๆ' รอให้ข่าวผ่านไป 15 นาทีจนตลาดเลือกทิศทางจริง",
    },
    {
      hour: 20,
      minute: 45,
      currency: "USD",
      impact: "MEDIUM",
      title: "🟠 ดัชนีความเชื่อมั่นภาคธุรกิจและโรงงานสหรัฐฯ (Flash PMI)",
      forecast: "51.0",
      previous: "50.4",
      strategyAdvice: "🟧 ผันผวนปานกลาง: วัดความคึกคักของธุรกิจอเมริกัน กราฟจะเคลื่อนไหวอย่างมีระเบียบตามแนวโน้มเดิม ไม่สะบัดทำลายล้าง สามารถตั้งออเดอร์เทรดตามระบบได้",
    },
    {
      hour: 21,
      minute: 0,
      currency: "USD",
      impact: "HIGH",
      title: "🔴 ดัชนีภาคบริการของสหรัฐฯ (ISM Services PMI)",
      forecast: "52.5",
      previous: "51.5",
      strategyAdvice: "🟥 รุนแรงสูงสุด: ภาคบริการคิดเป็นสัดส่วนใหญ่ที่สุดของเศรษฐกิจสหรัฐฯ ข่าวนี้สามารถเปลี่ยนทิศทางของราคาทองคำได้ทันที หากมีออเดอร์อยู่แนะนำให้ลดขนาดการถือครอง",
    },
    {
      hour: 21,
      minute: 30,
      currency: "USD",
      impact: "LOW",
      title: "🟡 รายงานปริมาณน้ำมันดิบคงคลังสหรัฐฯ (Crude Oil Inventories)",
      forecast: "-1.2M",
      previous: "-0.8M",
      strategyAdvice: "🟨 ผันผวนต่ำ: ส่งผลต่อน้ำมันดิบ (USOIL) และคู่เงินแคนาดา (CAD) โดยตรง แต่สำหรับทองคำและคู่เงินหลัก กราฟจะวิ่งตามแนวรับ-แนวต้านเชิงเทคนิคอลปกติ",
    },
    {
      hour: 1,
      minute: 0,
      currency: "USD",
      impact: "HIGH",
      title: "🔴 มติการประชุมธนาคารกลางสหรัฐฯ (แถลงมติดอกเบี้ยเฟด & แถลงการณ์พาวเวลล์)",
      forecast: "5.00%",
      previous: "5.25%",
      strategyAdvice: "🟥 รุนแรงสูงสุดแห่งปี: ประธานเฟดจะขึ้นแถลงทิศทางเศรษฐกิจโลก กราฟสามารถสะบัดได้ทั้งคืน ห้ามถือออเดอร์ข้ามคืนโดยไม่มี Stop Loss แนะนำให้ปิดออเดอร์ถือเงินสดไว้ปลอดภัยที่สุด",
    },
    {
      hour: 0,
      minute: 0,
      currency: "USD",
      impact: "HOLIDAY",
      title: "⚪ วันหยุดธนาคารและสถาบันการเงินของสหรัฐฯ (Bank Holiday)",
      forecast: "-",
      previous: "-",
      strategyAdvice: "⬜️ ตลาดปิดทำการ: ธนาคารใหญ่ในสหรัฐฯ ปิด ทำให้ไม่มีการซื้อขาย วอลุ่มในตลาดจะแห้งสนิท กราฟจะแทบไม่ขยับ และค่าธรรมเนียม (Spread) จะถ่างกว้างมาก แนะนำให้พักผ่อน ไม่ควรเข้าเทรด",
    },
  ];

  // If live events exist for today, prioritize them
  if (_liveEventsCache.length > 0) {
    const todayStart = new Date(Date.UTC(year, month - 1, day, 0, 0, 0)).getTime();
    const todayEnd = todayStart + 24 * 60 * 60 * 1000;
    const liveToday = _liveEventsCache.filter((e) => e.timestamp >= todayStart && e.timestamp < todayEnd);
    if (liveToday.length > 0) {
      return liveToday.sort((a, b) => a.timestamp - b.timestamp);
    }
  }

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
      timestamp: eventDate.getTime(),
    };
  });

  return events.sort((a, b) => a.hour * 60 + a.minute - (b.hour * 60 + b.minute));
}

export function getNewsSafetyShieldStatus(symbol: string, customDate?: Date): CalendarSafetyStatus {
  const now = customDate || new Date();
  
  // Thailand Time (GMT+7) via Serverless-safe Intl
  const { hour: currentHour, minute: currentMinute } = getThaiTimeParts(now);
  const currentTotalMinutes = currentHour * 60 + currentMinute;
  const currentTimestamp = now.getTime();

  const allEvents = getDailyEconomicCalendar(symbol, customDate);
  const isLive = _liveEventsCache.length > 0;

  const isGold = symbol.toUpperCase().includes("XAU") || symbol.toUpperCase() === "GOLD";
  const isCrypto = symbol.endsWith("USDT") || ["BTC", "ETH", "SOL", "BNB"].some((c) => symbol.startsWith(c));
  const isUSDInvolved = symbol.includes("USD") || isGold || isCrypto;
  const isEURInvolved = symbol.includes("EUR");
  const isGBPInvolved = symbol.includes("GBP");
  const isJPYInvolved = symbol.includes("JPY");
  const isAUDInvolved = symbol.includes("AUD");
  const isCADInvolved = symbol.includes("CAD");
  const isNZDInvolved = symbol.includes("NZD");
  const isCHFInvolved = symbol.includes("CHF");

  const relevantEvents = allEvents.filter((e) => {
    if (e.currency === "USD" && isUSDInvolved) return true;
    if (e.currency === "EUR" && isEURInvolved) return true;
    if (e.currency === "GBP" && isGBPInvolved) return true;
    if (e.currency === "JPY" && isJPYInvolved) return true;
    if (e.currency === "AUD" && isAUDInvolved) return true;
    if (e.currency === "CAD" && isCADInvolved) return true;
    if (e.currency === "NZD" && isNZDInvolved) return true;
    if (e.currency === "CHF" && isCHFInvolved) return true;
    return false;
  });

  const redFolderEvents = relevantEvents.filter((e) => e.impact === "HIGH");
  const orangeFolderEvents = relevantEvents.filter((e) => e.impact === "MEDIUM");

  let nextRedEvent: EconomicCalendarEvent | null = null;
  let minDiffMinutes = Infinity;

  for (const e of redFolderEvents) {
    let diff: number;
    if (e.timestamp && e.timestamp > 100000000000) {
      diff = Math.round((e.timestamp - currentTimestamp) / (60 * 1000));
    } else {
      const eventTotalMinutes = e.hour * 60 + e.minute;
      diff = eventTotalMinutes - currentTotalMinutes;
    }

    if (diff >= -15 && diff < minDiffMinutes) {
      minDiffMinutes = diff;
      nextRedEvent = e;
    }
  }

  // Check orange folder events for caution
  let isOrangeCaution = false;
  let nextOrangeEvent: EconomicCalendarEvent | null = null;
  let minOrangeDiff = Infinity;
  for (const e of orangeFolderEvents) {
    let diff: number;
    if (e.timestamp && e.timestamp > 100000000000) {
      diff = Math.round((e.timestamp - currentTimestamp) / (60 * 1000));
    } else {
      const eventTotalMinutes = e.hour * 60 + e.minute;
      diff = eventTotalMinutes - currentTotalMinutes;
    }
    if (diff >= 0 && diff <= 15 && diff < minOrangeDiff) {
      minOrangeDiff = diff;
      nextOrangeEvent = e;
      isOrangeCaution = true;
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
      spreadSafetyMultiplier: 2.5,
      positionSizeReductionPct: 100,
      isLiveFeed: isLive,
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
      spreadSafetyMultiplier: 2.0,
      positionSizeReductionPct: 100,
      isLiveFeed: isLive,
    };
  }

  // 2.1 Post-News Sniper Active: 15 to 45 minutes after Red Folder event (The Prime Institutional Execution Window)
  if (nextRedEvent && minDiffMinutes < -15 && minDiffMinutes >= -45) {
    const minsAgo = Math.abs(minDiffMinutes);
    
    // Parse economic surprise if actual data is populated
    let economicSurprise: CalendarSafetyStatus["economicSurprise"] | undefined;
    if (nextRedEvent.actual && nextRedEvent.actual !== "-" && nextRedEvent.forecast && nextRedEvent.forecast !== "-") {
      const actNum = parseFloat(nextRedEvent.actual.replace(/[^0-9.-]/g, ""));
      const fctNum = parseFloat(nextRedEvent.forecast.replace(/[^0-9.-]/g, ""));
      if (!isNaN(actNum) && !isNaN(fctNum)) {
        const diff = actNum - fctNum;
        const surpriseSentiment = diff > 0 ? "HAWKISH" : diff < 0 ? "DOVISH" : "NEUTRAL";
        economicSurprise = {
          actual: nextRedEvent.actual,
          forecast: nextRedEvent.forecast,
          deviationSigma: Number((diff / (Math.abs(fctNum) || 1)).toFixed(2)),
          surpriseSentiment,
        };
      }
    }

    return {
      state: "POST_NEWS_SNIPER_ACTIVE",
      badgeText: `🎯 POST-NEWS SNIPER (หลังข่าว ${minsAgo} นาที)`,
      badgeColor: "bg-emerald-500/20 text-emerald-300 border-emerald-500/50 animate-pulse",
      nextHighImpactEvent: nextRedEvent,
      minutesToNextEvent: minDiffMinutes,
      tradeAllowed: true,
      freezeReason: `พ้นช่วงสะบัดรุนแรง 15 นาทีแรกแล้ว สเปรดเริ่มหดตัวกลับสู่ปกติ เข้าสู่หน้าต่างทองคำ Post-News Sniper: ดักจังหวะ Retest News FVG หรือ Breaker Block`,
      strategyPlaybook: "🎯 กลยุทธ์ Sniper สถาบัน: ดักวาง Pending Limit ณ ระดับ Breaker Block หรือ News FVG พร้อมวาง SL หลบหลังยอดไส้ข่าว ปลอดภัยจาก Stop Hunt",
      relevantEvents,
      spreadSafetyMultiplier: 1.2,
      positionSizeReductionPct: 0,
      isLiveFeed: isLive,
      economicSurprise,
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
      strategyPlaybook: "⚠️ กลยุทธ์เตรียมตัว: ตลาดอาจเริ่มชะลอตัวเพื่อรอตัวเลขข่าว แนะนำปรับลดขนาด Lot 50% และขยายระยะ SL 1.5 เท่า ป้องกัน Spread Spike",
      relevantEvents,
      spreadSafetyMultiplier: 1.5,
      positionSizeReductionPct: 50,
      isLiveFeed: isLive,
    };
  }

  // 4. Safe Trading Window (with optional orange caution)
  return {
    state: "SAFE_TRADING_WINDOW",
    badgeText: isOrangeCaution ? `🟠 ORANGE CAUTION (อีก ${minOrangeDiff} นาที)` : "🟢 SAFE TRADING WINDOW",
    badgeColor: isOrangeCaution ? "bg-amber-500/15 text-amber-300 border-amber-500/30" : "bg-emerald-500/20 text-emerald-300 border-emerald-500/40",
    nextHighImpactEvent: nextRedEvent && minDiffMinutes > 60 ? nextRedEvent : null,
    minutesToNextEvent: nextRedEvent && minDiffMinutes > 60 ? minDiffMinutes : null,
    tradeAllowed: true,
    freezeReason: nextRedEvent
      ? `ปลอดภัย ไม่มีข่าวกล่องแดงในระยะประชิด (ข่าวใหญ่ถัดไป: ${nextRedEvent.title} เวลา ${nextRedEvent.timeStr})`
      : isOrangeCaution
      ? `มีข่าวกล่องส้ม ${nextOrangeEvent?.title} ในอีก ${minOrangeDiff} นาที ลดขนาดไม้ลง 30%`
      : "ปลอดภัย ไม่มีข่าวกล่องแดงกระทบคู่เงินนี้ในวันนี้ กราฟวิ่งตามปัจจัยเทคนิคอล 100%",
    strategyPlaybook: isOrangeCaution
      ? "🟧 กลยุทธ์กล่องส้ม: เทรดตามระบบได้ปกติแต่แนะนำลด Lot 30% เพื่อความปลอดภัย"
      : "🟨/🟧 กลยุทธ์สภาวะปกติ: กราฟวิ่งตามแนวรับ-แนวต้านเชิงเทคนิคอลแม่นยำสูง สามารถเทรดตามระบบสัญญาณ AI ได้อย่างเต็มประสิทธิภาพ",
    relevantEvents,
    spreadSafetyMultiplier: isOrangeCaution ? 1.2 : 1.0,
    positionSizeReductionPct: isOrangeCaution ? 30 : 0,
    isLiveFeed: isLive,
  };
}

export interface FlashVolatilitySpikeResult {
  isSpike: boolean;
  spikeRatio: number;
  currentRange: number;
  baselineATR: number;
  reason?: string;
}

/**
 * Flash Volatility Spike Circuit Breaker (Pillar 3)
 * Detects abnormal single-bar volatility expansion (> 3.0x 14-period ATR)
 * indicating unannounced breaking news, speeches, or black swan liquidity vacuums.
 */
export function detectFlashVolatilitySpike(
  candles: Candle[],
  atrMultiplier = 3.0
): FlashVolatilitySpikeResult {
  if (!candles || candles.length < 16) {
    return { isSpike: false, spikeRatio: 1.0, currentRange: 0, baselineATR: 0 };
  }

  const lastBar = candles[candles.length - 1];
  const currentRange = lastBar.high - lastBar.low;
  const currentBody = Math.abs(lastBar.close - lastBar.open);

  // Compute 14-period baseline ATR from preceding bars (excluding the anomalous current bar)
  let sumTR = 0;
  for (let i = candles.length - 15; i < candles.length - 1; i++) {
    const prev = candles[i - 1];
    const curr = candles[i];
    const tr = Math.max(
      curr.high - curr.low,
      Math.abs(curr.high - prev.close),
      Math.abs(curr.low - prev.close)
    );
    sumTR += tr;
  }
  const baselineATR = sumTR / 14;

  if (baselineATR <= 0) {
    return { isSpike: false, spikeRatio: 1.0, currentRange, baselineATR: 0 };
  }

  const spikeRatio = Number((currentRange / baselineATR).toFixed(2));
  const bodyRatio = Number((currentBody / baselineATR).toFixed(2));

  if (spikeRatio >= atrMultiplier || bodyRatio >= atrMultiplier * 0.8) {
    return {
      isSpike: true,
      spikeRatio,
      currentRange,
      baselineATR,
      reason: `⚡ [Flash Volatility Spike Circuit Breaker] แท่งเทียนกระชากผิดปกติ (${spikeRatio}x ATR ปกติ): ตลาดอาจมีข่าวด่วนหรือ Black Swan นอกตาราง พักเข้าเทรด 15 นาที เพื่อความปลอดภัย`,
    };
  }

  return {
    isSpike: false,
    spikeRatio,
    currentRange,
    baselineATR,
  };
}

export interface PostNewsSweepResult {
  detected: boolean;
  type?: "BUY" | "SELL";
  sweptLevel?: number;
  sweepExtreme?: number;
  entryPrice?: number;
  slPrice?: number;
  tp1Price?: number;
  tp2Price?: number;
  riskReward?: number;
  confidenceScore?: number;
  rationale?: string;
}

/**
 * Post-News Liquidity Sweep / Turtle Soup Reversal Engine (Pillar 3 & 4)
 * Detects institutional liquidity grabs after high-impact economic news releases.
 * When price spikes out to sweep previous session high/low, exhausts volume,
 * and leaves a rejection wick > 48% of the range, it generates a sniper reversal setup.
 */
export function detectPostNewsLiquiditySweep(
  candles: Candle[],
  precision: number = 2
): PostNewsSweepResult {
  if (!candles || candles.length < 15) {
    return { detected: false };
  }

  const curr = candles[candles.length - 1];
  const prev = candles[candles.length - 2];

  // Lookback 12 bars before the current/prev bar to find pre-news session boundaries
  const preNewsLookback = candles.slice(Math.max(0, candles.length - 14), candles.length - 2);
  if (preNewsLookback.length < 5) return { detected: false };

  const sessionHigh = Math.max(...preNewsLookback.map((b) => b.high));
  const sessionLow = Math.min(...preNewsLookback.map((b) => b.low));

  // Calculate baseline ATR
  let sumTR = 0;
  for (let i = candles.length - 15; i < candles.length - 1; i++) {
    const p = candles[i - 1];
    const c = candles[i];
    sumTR += Math.max(c.high - c.low, Math.abs(c.high - p.close), Math.abs(c.low - p.close));
  }
  const atr = sumTR / 14 || 2.0;

  // Check Bullish Turtle Soup: Price swept below sessionLow, now rejected back up
  const isSweepLow = prev.low < sessionLow || curr.low < sessionLow;
  const lowestWick = Math.min(prev.low, curr.low);
  const currLowerWick = Math.min(curr.close, curr.open) - curr.low;
  const currRange = curr.high - curr.low;
  const currWickPct = currRange > 0 ? (currLowerWick / currRange) * 100 : 0;

  if (isSweepLow && curr.close > sessionLow && (currWickPct >= 48 || curr.close > curr.open)) {
    const sweepDist = sessionLow - lowestWick;
    if (sweepDist >= atr * 0.25 && sweepDist <= atr * 2.5) {
      const entry = Number(curr.close.toFixed(precision));
      const sl = Number((lowestWick - atr * 0.25).toFixed(precision));
      const risk = entry - sl;
      if (risk > 0) {
        const tp1 = Number((entry + risk * 1.5).toFixed(precision));
        const tp2 = Number((sessionHigh - atr * 0.2).toFixed(precision));
        const rr = Number(((tp2 - entry) / risk).toFixed(1));
        if (rr >= 2.0) {
          return {
            detected: true,
            type: "BUY",
            sweptLevel: sessionLow,
            sweepExtreme: lowestWick,
            entryPrice: entry,
            slPrice: sl,
            tp1Price: tp1,
            tp2Price: tp2,
            riskReward: rr,
            confidenceScore: 88,
            rationale: `🎯 [Post-News Turtle Soup BUY] ราคาสะบัดกวาด Stop Loss ใต้ก้น $${sessionLow.toFixed(precision)} ไป $${sweepDist.toFixed(precision)} จุด แล้วดีดกลับเข้ากรอบพร้อมทิ้งไส้ ${currWickPct.toFixed(0)}% (Institutional Reversal)`,
          };
        }
      }
    }
  }

  // Check Bearish Turtle Soup: Price swept above sessionHigh, now rejected back down
  const isSweepHigh = prev.high > sessionHigh || curr.high > sessionHigh;
  const highestWick = Math.max(prev.high, curr.high);
  const currUpperWick = curr.high - Math.max(curr.close, curr.open);
  const currUpperWickPct = currRange > 0 ? (currUpperWick / currRange) * 100 : 0;

  if (isSweepHigh && curr.close < sessionHigh && (currUpperWickPct >= 48 || curr.close < curr.open)) {
    const sweepDist = highestWick - sessionHigh;
    if (sweepDist >= atr * 0.25 && sweepDist <= atr * 2.5) {
      const entry = Number(curr.close.toFixed(precision));
      const sl = Number((highestWick + atr * 0.25).toFixed(precision));
      const risk = sl - entry;
      if (risk > 0) {
        const tp1 = Number((entry - risk * 1.5).toFixed(precision));
        const tp2 = Number((sessionLow + atr * 0.2).toFixed(precision));
        const rr = Number(((entry - tp2) / risk).toFixed(1));
        if (rr >= 2.0) {
          return {
            detected: true,
            type: "SELL",
            sweptLevel: sessionHigh,
            sweepExtreme: highestWick,
            entryPrice: entry,
            slPrice: sl,
            tp1Price: tp1,
            tp2Price: tp2,
            riskReward: rr,
            confidenceScore: 88,
            rationale: `🎯 [Post-News Turtle Soup SELL] ราคากระชากกวาด Stop Loss เหนือยอด $${sessionHigh.toFixed(precision)} ไป $${sweepDist.toFixed(precision)} จุด แล้วทุบกลับเข้ากรอบพร้อมทิ้งไส้ ${currUpperWickPct.toFixed(0)}% (Institutional Reversal)`,
          };
        }
      }
    }
  }

  return { detected: false };
}

export interface MacroDirectionalInsight {
  symbol: string;
  hasMacroEvent: boolean;
  eventTitle: string;
  currency: string;
  impact: CalendarImpact;
  phase: "PRE_NEWS_FORECAST" | "POST_NEWS_SURPRISE" | "NORMAL";
  usdSentiment: "BULLISH_USD" | "BEARISH_USD" | "NEUTRAL";
  assetDirectionalBias: "BUY_ONLY" | "SELL_ONLY" | "NEUTRAL";
  confidenceScore: number;
  forecast?: string;
  previous?: string;
  actual?: string;
  deviationSigma?: number;
  reactionZone?: {
    zoneHigh: number;
    zoneLow: number;
    zoneMid: number; // 50% Equilibrium level
    zoneType: "NEWS_FVG" | "PRE_NEWS_SWEEP" | "ANCHOR_OB";
    recommendedAction: "BUY_LIMIT" | "SELL_LIMIT" | "WAIT_PULLBACK";
  };
  narrativeExplanation: string;
}

/**
 * Calculates Institutional Macro Directional Bias and Price Reaction Zones (FVG / Equilibrium 50%)
 * based on economic forecasts vs previous and actual surprises.
 */
export function calculateMacroDirectionalInsight(
  symbol: string,
  candles?: Candle[],
  precision: number = 2
): MacroDirectionalInsight {
  const lastCandle = candles && candles.length > 0 ? candles[candles.length - 1] : undefined;
  const customDate = lastCandle
    ? new Date(
        typeof lastCandle.time === "number"
          ? (lastCandle.time > 1e11 ? lastCandle.time : lastCandle.time * 1000)
          : lastCandle.time
      )
    : undefined;
  const safety = getNewsSafetyShieldStatus(symbol, customDate);
  const event = safety.nextHighImpactEvent || safety.relevantEvents.find((e) => e.impact === "HIGH");

  const canonical = symbol.toUpperCase().trim();
  const isGold = canonical.includes("XAU") || canonical.includes("GOLD");
  const isEurUsd = canonical.startsWith("EURUSD");
  const isGbpUsd = canonical.startsWith("GBPUSD");
  const isUsdJpy = canonical.startsWith("USDJPY");

  if (!event) {
    return {
      symbol,
      hasMacroEvent: false,
      eventTitle: "NONE",
      currency: "USD",
      impact: "LOW",
      phase: "NORMAL",
      usdSentiment: "NEUTRAL",
      assetDirectionalBias: "NEUTRAL",
      confidenceScore: 50,
      narrativeExplanation: "⚪ ไม่มีข่าวเศรษฐกิจกล่องแดงในระยะประชิด กราฟเคลื่อนไหวตามโครงสร้างเทคนิคอล 100%",
    };
  }

  // Parse numerical values from strings (handling %, K, M, B)
  const parseVal = (str?: string): number | null => {
    if (!str || str === "-" || str === "--") return null;
    const clean = str.replace(/[^0-9.-]/g, "");
    const val = parseFloat(clean);
    return isNaN(val) ? null : val;
  };

  const act = parseVal(event.actual);
  const fct = parseVal(event.forecast);
  const prv = parseVal(event.previous);

  let phase: "PRE_NEWS_FORECAST" | "POST_NEWS_SURPRISE" | "NORMAL" = "NORMAL";
  let usdSentiment: "BULLISH_USD" | "BEARISH_USD" | "NEUTRAL" = "NEUTRAL";
  let deviationSigma: number | undefined;
  let confidenceScore = 60;

  const titleLower = event.title.toLowerCase();
  const isInverseIndicator = titleLower.includes("unemployment") || titleLower.includes("jobless") || titleLower.includes("claim");

  // Case 1: Post-News with Actual data published
  if (act !== null && fct !== null) {
    phase = "POST_NEWS_SURPRISE";
    const rawDiff = act - fct;
    deviationSigma = Number((rawDiff / (Math.abs(fct) || 1)).toFixed(2));

    if (Math.abs(rawDiff) > 0.001) {
      if (isInverseIndicator) {
        // Higher unemployment = Bad for USD
        usdSentiment = rawDiff > 0 ? "BEARISH_USD" : "BULLISH_USD";
      } else {
        // Higher CPI, NFP, GDP, PMI = Good for USD
        usdSentiment = rawDiff > 0 ? "BULLISH_USD" : "BEARISH_USD";
      }
      confidenceScore = 90;
    }
  }
  // Case 2: Pre-News with Forecast vs Previous
  else if (fct !== null && prv !== null) {
    phase = "PRE_NEWS_FORECAST";
    const rawDiff = fct - prv;
    deviationSigma = Number((rawDiff / (Math.abs(prv) || 1)).toFixed(2));

    if (Math.abs(rawDiff) > 0.001) {
      if (isInverseIndicator) {
        usdSentiment = rawDiff > 0 ? "BEARISH_USD" : "BULLISH_USD";
      } else {
        usdSentiment = rawDiff > 0 ? "BULLISH_USD" : "BEARISH_USD";
      }
      confidenceScore = 75;
    }
  }

  // Map USD sentiment to Asset Directional Bias:
  // For Gold (XAUUSD), EURUSD, GBPUSD: Inverse to USD
  // For USDJPY, USDCAD, USDCHF: Proportional to USD
  let assetDirectionalBias: "BUY_ONLY" | "SELL_ONLY" | "NEUTRAL" = "NEUTRAL";
  if (isGold || isEurUsd || isGbpUsd) {
    if (usdSentiment === "BULLISH_USD") assetDirectionalBias = "SELL_ONLY";
    else if (usdSentiment === "BEARISH_USD") assetDirectionalBias = "BUY_ONLY";
  } else if (isUsdJpy) {
    if (usdSentiment === "BULLISH_USD") assetDirectionalBias = "BUY_ONLY";
    else if (usdSentiment === "BEARISH_USD") assetDirectionalBias = "SELL_ONLY";
  }

  // Calculate Reaction Zone from recent price action (News FVG or Pre-News Range)
  let reactionZone: MacroDirectionalInsight["reactionZone"] | undefined;
  if (candles && candles.length >= 10) {
    const last10 = candles.slice(-10);
    const highestBar = Math.max(...last10.map((b) => b.high));
    const lowestBar = Math.min(...last10.map((b) => b.low));
    const range = highestBar - lowestBar;

    if (range > 0) {
      const zoneMid = Number(((highestBar + lowestBar) / 2).toFixed(precision));
      reactionZone = {
        zoneHigh: Number(highestBar.toFixed(precision)),
        zoneLow: Number(lowestBar.toFixed(precision)),
        zoneMid,
        zoneType: phase === "POST_NEWS_SURPRISE" ? "NEWS_FVG" : "PRE_NEWS_SWEEP",
        recommendedAction:
          assetDirectionalBias === "BUY_ONLY"
            ? "BUY_LIMIT"
            : assetDirectionalBias === "SELL_ONLY"
            ? "SELL_LIMIT"
            : "WAIT_PULLBACK",
      };
    }
  }

  let narrativeExplanation = "";
  if (phase === "POST_NEWS_SURPRISE") {
    narrativeExplanation = `🚨 [Post-News Surprise] ข่าว ${event.title} ออกผลจริง (${event.actual}) เทียบคาดการณ์ (${event.forecast}) ทำให้มุมมองดอลลาร์เป็น ${usdSentiment} 👉 แนะนำเทรด ${symbol} ในทิศทาง ${assetDirectionalBias} ดักจังหวะ Retest โซน Equilibrium 50% ($${reactionZone?.zoneMid || "--"})`;
  } else if (phase === "PRE_NEWS_FORECAST") {
    narrativeExplanation = `📊 [Pre-News Consensus] ตลาดคาดการณ์ ${event.title} (${event.forecast}) เทียบครั้งก่อน (${event.previous}) สะท้อนมุมมองดอลลาร์ ${usdSentiment} 👉 กรอบทิศทาง ${symbol} เอนเอียงไปทาง ${assetDirectionalBias}`;
  } else {
    narrativeExplanation = `⚪ ข่าว ${event.title} ตัวเลขทรงตัว ตลาดวิ่งตามกรอบแนวรับ-แนวต้านเทคนิคอลปกติ`;
  }

  return {
    symbol,
    hasMacroEvent: true,
    eventTitle: event.title,
    currency: event.currency,
    impact: event.impact,
    phase,
    usdSentiment,
    assetDirectionalBias,
    confidenceScore,
    forecast: event.forecast,
    previous: event.previous,
    actual: event.actual,
    deviationSigma,
    reactionZone,
    narrativeExplanation,
  };
}