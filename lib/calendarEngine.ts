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