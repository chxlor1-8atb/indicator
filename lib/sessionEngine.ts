import { Candle, SessionORB } from "./types";

export type TradingSessionPhase = "MORNING" | "AFTERNOON" | "NIGHT" | "DEAD_ZONE";

export interface SessionPhaseInfo {
  phase: TradingSessionPhase;
  label: string;
  thaiLabel: string;
  description: string;
  recommendedRegime: "RANGE_BOX" | "TREND_SWING" | "STAND_DOWN";
  tpMultiplierBonus: number;
  beTriggerRatio: number;
  allowNewTrades: boolean;
}

export interface SessionStatus {
  thaiTimeStr: string;
  hour: number;
  minute: number;
  dayOfWeek: number; // 0 = Sun, 1 = Mon, ..., 6 = Sat
  isDST: boolean;
  activeSessions: string[];
  isGoldenHour: boolean;
  isWitchingHour: boolean;
  isMondayOpenGapRisk: boolean;
  isIndexOpeningVolatile: boolean;
  assetSessionAdvice: string;
  sessionBadge: {
    text: string;
    color: string;
    isOptimal: boolean;
  };
  spreadStatus: "NORMAL" | "TIGHT" | "WIDE_DANGER";
  tradeAllowed: boolean;
  confidenceModifier: number;
  isWeekendCloseFreeze?: boolean;
  sessionPhase?: SessionPhaseInfo;
  orb?: SessionORB;
}

export function isDaylightSavingTime(date: Date): boolean {
  // DST in US/Europe roughly from second Sunday of March to first Sunday of November
  const month = date.getUTCMonth(); // 0 = Jan, 2 = Mar, 10 = Nov
  if (month > 2 && month < 10) return true;
  if (month < 2 || month > 10) return false;
  // March (month === 2) and November (month === 10) transition approximate check
  const day = date.getUTCDate();
  if (month === 2) return day >= 8;
  if (month === 10) return day < 7;
  return true;
}

export function getThaiTimeParts(date: Date = new Date()) {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Bangkok",
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
    hour12: false,
    weekday: "short",
  });
  const parts = formatter.formatToParts(date);
  const findPart = (type: string) => {
    const p = parts.find((item) => item.type === type);
    return p ? parseInt(p.value, 10) : 0;
  };

  const hour = findPart("hour") % 24;
  const minute = findPart("minute");
  const day = findPart("day");
  const month = findPart("month");
  const year = findPart("year");

  const weekdayStr = parts.find((p) => p.type === "weekday")?.value || "Sun";
  const weekdayMap: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };
  const dayOfWeek = weekdayMap[weekdayStr] ?? 0;

  return { hour, minute, day, month, year, dayOfWeek };
}

/**
 * Categorize current time into 3 primary trading zones + 1 rollover dead zone (Thai Time GMT+7)
 */
export function getTradingSessionPhase(dateOrTimestamp?: Date | number): SessionPhaseInfo {
  let thaiHour = 0;
  if (typeof dateOrTimestamp === "number") {
    const d = new Date(dateOrTimestamp > 1e11 ? dateOrTimestamp : dateOrTimestamp * 1000);
    thaiHour = (d.getUTCHours() + 7) % 24;
  } else if (dateOrTimestamp instanceof Date) {
    thaiHour = (dateOrTimestamp.getUTCHours() + 7) % 24;
  } else {
    const parts = getThaiTimeParts(new Date());
    thaiHour = parts.hour;
  }

  // 1. Dead Zone / Bank Rollover: 01:00 - 06:00 น. (ครอบคลุมช่วง 05:00 น. สเปรดถ่างสลับตลาด)
  if (thaiHour >= 1 && thaiHour < 6) {
    return {
      phase: "DEAD_ZONE",
      label: "🛑 Dead Zone / Rollover",
      thaiLabel: "ช่วงดึกสงัด / ปิดเคลียริ่ง (01:00 - 06:00 น.)",
      description: "ช่วงปิดระบบเคลียริ่งธนาคาร สเปรดถ่างสูง วอลุ่มต่ำ เสี่ยงโดนลากกิน SL ควรงดเปิดออเดอร์ใหม่",
      recommendedRegime: "STAND_DOWN",
      tpMultiplierBonus: 0,
      beTriggerRatio: 0.50,
      allowNewTrades: false,
    };
  }

  // 2. Morning Session (Tokyo / Asian): 06:00 - 13:00 น.
  if (thaiHour >= 6 && thaiHour < 13) {
    return {
      phase: "MORNING",
      label: "🌅 Morning Asian Range",
      thaiLabel: "รอบเช้า ตลาดเอเชีย (06:00 - 13:00 น.)",
      description: "ตลาดมักแกว่งตัวสะสมของในกรอบ Sideway สเปรดต่ำ เหมาะกับการเทรด Range Box ซื้อแนวรับ ขายแนวต้าน",
      recommendedRegime: "RANGE_BOX",
      tpMultiplierBonus: 0,
      beTriggerRatio: 0.32,
      allowNewTrades: true,
    };
  }

  // 3. Afternoon Session (London Open): 13:00 - 18:00 น.
  if (thaiHour >= 13 && thaiHour < 18) {
    return {
      phase: "AFTERNOON",
      label: "🏙️ Afternoon London Open",
      thaiLabel: "รอบบ่าย ตลาดยุโรปเปิด (13:00 - 18:00 น.)",
      description: "วอลุ่มยุโรปเริ่มเข้า มีจังหวะ Judas Swing สลัดเม่า เน้นรอคอนเฟิร์ม CHoCH ก่อนเข้าเทรนด์ตามน้ำ",
      recommendedRegime: "TREND_SWING",
      tpMultiplierBonus: 0.2,
      beTriggerRatio: 0.38,
      allowNewTrades: true,
    };
  }

  // 4. Night Session (Prime US / London Overlap): 18:00 - 01:00 น.
  return {
    phase: "NIGHT",
    label: "🔥 Night Prime US Session",
    thaiLabel: "รอบค่ำ/ดึก ตลาดสหรัฐฯ พีกสุด (18:00 - 01:00 น.)",
    description: "ช่วงเวลากำไรคำโต! วอลุ่มสถาบันมหาศาล กราฟวิ่งทะลุเทรนด์ยาว รันกำไรคำใหญ่ด้วย TP2 กว้างขึ้น",
    recommendedRegime: "TREND_SWING",
    tpMultiplierBonus: 0.5,
    beTriggerRatio: 0.42,
    allowNewTrades: true,
  };
}

export function getMarketSessionStatus(symbol: string, customDate?: Date, candles?: Candle[]): SessionStatus {
  const now = customDate || new Date();
  
  // Convert to Thailand Time (GMT+7) with Serverless-safe Intl format
  const { hour, minute, dayOfWeek } = getThaiTimeParts(now);
  const isDST = isDaylightSavingTime(now);
  const sessionPhase = getTradingSessionPhase(now);

  const thaiTimeStr = `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")} น.`;

  // Active Sessions
  const activeSessions: string[] = [];

  // Sydney (Summer: 04:00 - 12:00 | Winter: 05:00 - 13:00)
  const sydOpen = isDST ? 4 : 5;
  const sydClose = isDST ? 12 : 13;
  if (hour >= sydOpen && hour < sydClose) activeSessions.push("Sydney");

  // Tokyo (06:00 - 14:00 year-round)
  if (hour >= 6 && hour < 14) activeSessions.push("Tokyo");

  // London (Summer: 13:00 - 21:00 | Winter: 14:00 - 22:00)
  const lonOpen = isDST ? 13 : 14;
  const lonClose = isDST ? 21 : 22;
  if (hour >= lonOpen && hour < lonClose) activeSessions.push("London");

  // New York (Summer: 18:00 - 02:00 | Winter: 19:00 - 03:00)
  const nyOpen = isDST ? 18 : 19;
  const nyClose = isDST ? 2 : 3;
  const isNY = hour >= nyOpen || hour < nyClose;
  if (isNY) activeSessions.push("New York");

  // ─── Critical Safety Danger Zones (The Witching Hour & Gaps) ───
  // 03:55 - 05:05: Bank clearing rollover, spreads widen 10-20x!
  const isWitchingHour = (hour === 3 && minute >= 55) || hour === 4 || (hour === 5 && minute <= 5);
  // Monday 04:00 - 06:00: Weekend Gap risk
  const isMondayOpenGapRisk = dayOfWeek === 1 && hour >= 4 && hour < 6;

  // ─── [แผน 10] Market Close Freeze Buffer (Forex Friday Night Close & Weekend) ───
  // Friday night close (after 23:00 Fri until 05:00 Sat Thai time) or Weekend
  const isFridayNightClose = (dayOfWeek === 5 && hour >= 23) || (dayOfWeek === 6 && hour < 5);
  const isWeekendClosed = (dayOfWeek === 6 && hour >= 5) || dayOfWeek === 0 || (dayOfWeek === 1 && hour < 4);

  // ─── Golden Hours (Forex & Gold) ───
  // London/Tokyo Overlap: 14:00 - 16:00
  // London/NY Overlap (The Peak): 19:00 - 22:00
  const isLondonOverlap = hour >= 14 && hour < 16;
  const isPeakOverlap = hour >= 19 && hour < 22;
  const isGoldenHour = isLondonOverlap || isPeakOverlap;

  // Indices opening spike (20:30 - 21:00 DST or 21:30 - 22:00 Standard)
  const usStockOpenHour = isDST ? 20 : 21;
  const isIndexOpeningVolatile = hour === usStockOpenHour && minute >= 30;

  // ─── Asset-Specific Nuance & Advice ───
  let assetSessionAdvice = "";
  let sessionBadgeText = "";
  let sessionBadgeColor = "";
  let isOptimal = false;
  let spreadStatus: "NORMAL" | "TIGHT" | "WIDE_DANGER" = "NORMAL";
  let tradeAllowed = true;
  let confidenceModifier = 0;

  const isGold = symbol.toUpperCase().includes("XAU") || symbol.toUpperCase() === "GOLD";
  const isCrypto = symbol.endsWith("USDT") || ["BTC", "ETH", "SOL", "BNB", "XRP"].some((c) => symbol.startsWith(c));
  const isIndex = ["SPY", "QQQ", "DIA", "US30", "NAS100"].some((idx) => symbol.toUpperCase().includes(idx));
  const isWeekendCloseFreeze = (isFridayNightClose || isWeekendClosed) && !isCrypto;

  if (isWeekendCloseFreeze) {
    spreadStatus = "WIDE_DANGER";
    tradeAllowed = false;
    confidenceModifier = -40;
    sessionBadgeText = isWeekendClosed ? "🔒 MARKET CLOSED (ตลาดปิดสุดสัปดาห์)" : "🛑 FRIDAY CLOSE FREEZE (ตลาดใกล้ปิดสัปดาห์)";
    sessionBadgeColor = "bg-rose-500/20 text-rose-300 border-rose-500/40 animate-pulse";
    assetSessionAdvice = isWeekendClosed
      ? "ตลาดปิดทำการสุดสัปดาห์ สัญญาณใหม่จะประเมินเมื่อตลาดเปิดเช้าวันจันทร์"
      : "ตลาดใกล้ปิดสุดสัปดาห์ สเปรดถ่างกว้างมากและเสี่ยงต่อ Weekend Gap วันจันทร์ งดเปิดออเดอร์ใหม่โดยเด็ดขาด!";
  } else if (isWitchingHour && !isCrypto) {
    spreadStatus = "WIDE_DANGER";
    tradeAllowed = false;
    confidenceModifier = -30;
    sessionBadgeText = "⚠️ THE WITCHING HOUR (03:55 - 05:05)";
    sessionBadgeColor = "bg-rose-500/20 text-rose-300 border-rose-500/40 animate-pulse";
    assetSessionAdvice = "ช่วงธนาคารปิดระบบเคลียริ่ง สเปรดถ่างกว้าง 10-20 เท่า ห้ามเปิดออเดอร์ใหม่เด็ดขาด!";
  } else if (isMondayOpenGapRisk && !isCrypto) {
    spreadStatus = "WIDE_DANGER";
    tradeAllowed = false;
    confidenceModifier = -25;
    sessionBadgeText = "⚠️ MONDAY GAP RISK (04:00 - 06:00)";
    sessionBadgeColor = "bg-amber-500/20 text-amber-300 border-amber-500/40";
    assetSessionAdvice = "ตลาดเพิ่งเปิดวันจันทร์ ระวังราคาเปิดกระโดด (Gap) จากข่าวเสาร์-อาทิตย์ ควรรอให้ตลาดนิ่งหลัง 06:00 น.";
  } else if (isGold) {
    if (hour >= 19 && hour < 23) {
      isOptimal = true;
      spreadStatus = "TIGHT";
      confidenceModifier = 10;
      sessionBadgeText = "🔥 GOLDEN HOURS (19:00 - 23:00)";
      sessionBadgeColor = "bg-emerald-500/20 text-emerald-300 border-emerald-500/40";
      assetSessionAdvice = "ช่วงเวลาทองคำพีกที่สุด! ตลาดสหรัฐฯ เปิดเต็มตัว วอลุ่มกระชาก 1,000–3,000 จุด เหมาะกับการทำกำไรคำโต";
    } else if (hour >= 14 && hour < 17) {
      spreadStatus = "NORMAL";
      confidenceModifier = 5;
      sessionBadgeText = "⚡ EUROPE OPEN (14:00 - 17:00)";
      sessionBadgeColor = "bg-sky-500/20 text-sky-300 border-sky-500/40";
      assetSessionAdvice = "ตลาดยุโรปเปิด ทองคำเริ่มเลือกทาง ระวังการทำราคาหลอก (False Break) ก่อนรอบค่ำ";
    } else if (hour >= 5 && hour < 13) {
      spreadStatus = "NORMAL";
      confidenceModifier = -5;
      sessionBadgeText = "💤 ASIAN MORNING (05:00 - 13:00)";
      sessionBadgeColor = "bg-slate-700/50 text-slate-300 border-slate-600";
      assetSessionAdvice = "ช่วงเช้าทองคำมักแกว่งไซด์เวย์ วอลุ่มเบาบาง ไม่ควรเข้าไม้หนัก แนะนำรอรอบบ่าย 14:00 น.";
    } else {
      sessionBadgeText = "🌙 LATE NIGHT (00:00 - 04:00)";
      sessionBadgeColor = "bg-slate-700/50 text-slate-400 border-slate-600";
      assetSessionAdvice = "ตลาดเริ่มเบาบางหลังเที่ยงคืน กราฟวิ่งทรงตัว";
    }
  } else if (isIndex) {
    if (isIndexOpeningVolatile) {
      spreadStatus = "WIDE_DANGER";
      confidenceModifier = -15;
      sessionBadgeText = "⚠️ WALL STREET OPENING WHIPSAW (20:30 - 21:00)";
      sessionBadgeColor = "bg-rose-500/20 text-rose-300 border-rose-500/40 animate-pulse";
      assetSessionAdvice = "30 นาทีแรกของการเปิดตลาดหุ้นสหรัฐฯ กราฟสะบัดรุนแรงมากเพื่อจับคู่คำสั่งค้าง ระวังพอร์ตกระชาก";
    } else if (hour >= 21 && hour < 24) {
      isOptimal = true;
      spreadStatus = "TIGHT";
      confidenceModifier = 10;
      sessionBadgeText = "🔥 PRIME US CASH SESSION (21:00 - 23:30)";
      sessionBadgeColor = "bg-emerald-500/20 text-emerald-300 border-emerald-500/40";
      assetSessionAdvice = "ช่วงเวลาทองของดัชนีหุ้นสหรัฐฯ! วอลุ่มสถาบันเข้าหนาแน่น กราฟวิ่งตามเทรนด์ชัดเจนที่สุด";
    } else {
      sessionBadgeText = "💤 OFF-PEAK INDICES";
      sessionBadgeColor = "bg-slate-700/50 text-slate-400 border-slate-600";
      assetSessionAdvice = "อยู่นอกเวลาทำการตลาดหุ้นหลัก (Wall Street Cash Market) กราฟจะวิ่งเบาบาง";
    }
  } else if (isCrypto) {
    if (hour >= 20 || hour < 1) {
      isOptimal = true;
      confidenceModifier = 8;
      sessionBadgeText = "🔥 US ETF & INSTITUTIONAL SURGE (20:30 - 01:00)";
      sessionBadgeColor = "bg-emerald-500/20 text-emerald-300 border-emerald-500/40";
      assetSessionAdvice = "ตลาดหุ้นสหรัฐฯ เปิด บ็อตเทรดกองทุนและ Bitcoin ETF ทำงานเต็มกำลัง วอลุ่มวิ่งสอดคล้องกับ Nasdaq";
    } else if (hour === 6 || (hour === 7 && minute <= 30)) {
      confidenceModifier = 5;
      sessionBadgeText = "⚡ DAILY CANDLE CLOSE (06:45 - 07:30)";
      sessionBadgeColor = "bg-amber-500/20 text-amber-300 border-amber-500/40";
      assetSessionAdvice = "ช่วงเวลาปิดแท่งวัน (Daily Close 07:00 น.) กราฟมักจะสะบัดแรงเพื่อเลือกทิศทางแท่งใหม่";
    } else {
      sessionBadgeText = "🌐 24/7 GLOBAL CRYPTO STREAM";
      sessionBadgeColor = "bg-blue-500/20 text-blue-300 border-blue-500/40";
      assetSessionAdvice = "ตลาดเปิดทำการ 24 ชั่วโมง วอลุ่มกระจายตัวสม่ำเสมอทั่วโลก";
    }
  } else {
    // Forex Majors / Crosses
    if (isPeakOverlap) {
      isOptimal = true;
      spreadStatus = "TIGHT";
      confidenceModifier = 10;
      sessionBadgeText = "🔥 LONDON x NEW YORK OVERLAP (19:00 - 22:00)";
      sessionBadgeColor = "bg-emerald-500/20 text-emerald-300 border-emerald-500/40";
      assetSessionAdvice = "ช่วงที่พีกที่สุดของวัน! สเปรดต่ำที่สุด กราฟวิ่งแรงและจบแท่งไว เหมาะกับ Scalping และ Day Trade มากที่สุด";
    } else if (isLondonOverlap) {
      isOptimal = true;
      spreadStatus = "TIGHT";
      confidenceModifier = 8;
      sessionBadgeText = "⚡ TOKYO x LONDON OVERLAP (14:00 - 16:00)";
      sessionBadgeColor = "bg-sky-500/20 text-sky-300 border-sky-500/40";
      assetSessionAdvice = "ตลาดยุโรปเริ่มเปิด คู่เงิน EUR, GBP, CHF เริ่มตั้งเทรนด์ใหญ่ สเปรดเริ่มถูกลง";
    } else if (hour >= 6 && hour < 14) {
      confidenceModifier = 2;
      sessionBadgeText = "🇯🇵 TOKYO ASIAN SESSION (06:00 - 14:00)";
      sessionBadgeColor = "bg-amber-500/20 text-amber-300 border-amber-500/40";
      assetSessionAdvice = "ตลาดโตเกียวเปิดทำการ มีวอลุ่มเข้ามาช่วงเช้า เหมาะกับการเทรดคู่เงิน JPY";
    } else {
      sessionBadgeText = "🇦🇺 SYDNEY SESSION (04:00 - 12:00)";
      sessionBadgeColor = "bg-slate-700/50 text-slate-300 border-slate-600";
      assetSessionAdvice = "กราฟวิ่งเอื่อยๆ เน้นเก็บสั้นคู่ AUD, NZD สเปรดอาจจะกว้างกว่าช่วงบ่าย";
    }
  }

  // ─── [แผน 9] Session Open Range Breakout (ORB) ───
  let orb: SessionORB | undefined;
  if (candles && candles.length > 0) {
    const isLondonTime = hour >= 14 && hour < 17;
    const isNYTime = hour >= 19 && hour < 22;

    if (isLondonTime || isNYTime) {
      const targetSession: "LONDON" | "NEW_YORK" = isLondonTime ? "LONDON" : "NEW_YORK";
      const targetHour = isLondonTime ? 14 : 19;

      const orbCandles = candles.filter((c) => {
        const { hour: cHour, minute: cMin } = getThaiTimeParts(new Date(c.time * 1000));
        return cHour === targetHour && cMin < 30;
      });

      if (orbCandles.length > 0) {
        let orbHigh = -Infinity;
        let orbLow = Infinity;
        orbCandles.forEach((c) => {
          if (c.high > orbHigh) orbHigh = c.high;
          if (c.low < orbLow) orbLow = c.low;
        });

        const currentPrice = candles[candles.length - 1].close;
        let orbStatus: "BREAKOUT_BULL" | "BREAKOUT_BEAR" | "INSIDE_RANGE" = "INSIDE_RANGE";
        if (currentPrice > orbHigh) orbStatus = "BREAKOUT_BULL";
        else if (currentPrice < orbLow) orbStatus = "BREAKOUT_BEAR";

        orb = {
          session: targetSession,
          high: Number(orbHigh.toFixed(4)),
          low: Number(orbLow.toFixed(4)),
          status: orbStatus,
        };
      }
    }
  }

  return {
    thaiTimeStr,
    hour,
    minute,
    dayOfWeek,
    isDST,
    activeSessions,
    isGoldenHour,
    isWitchingHour,
    isMondayOpenGapRisk,
    isIndexOpeningVolatile,
    assetSessionAdvice,
    sessionBadge: {
      text: sessionBadgeText,
      color: sessionBadgeColor,
      isOptimal,
    },
    spreadStatus,
    tradeAllowed,
    confidenceModifier,
    isWeekendCloseFreeze,
    sessionPhase,
    orb,
  };
}

export function getMarketSessionInfo(date: Date = new Date()) {
  const status = getMarketSessionStatus("EURUSD", date);
  return {
    ...status,
    currentSession: status.activeSessions.join(", ") || "Closed/Off-Hours",
    isLondonNyOverlap: status.isGoldenHour,
  };
}