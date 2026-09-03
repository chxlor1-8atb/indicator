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

export function getMarketSessionStatus(symbol: string, customDate?: Date): SessionStatus {
  const now = customDate || new Date();
  
  // Convert to Thailand Time (GMT+7)
  const utc = now.getTime() + now.getTimezoneOffset() * 60000;
  const thaiDate = new Date(utc + 3600000 * 7);

  const hour = thaiDate.getHours();
  const minute = thaiDate.getMinutes();
  const dayOfWeek = thaiDate.getDay(); // 0 = Sun, 1 = Mon, 6 = Sat
  const isDST = isDaylightSavingTime(now);

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

  if (isWitchingHour && !isCrypto) {
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
  };
}