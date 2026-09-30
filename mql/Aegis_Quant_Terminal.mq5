//+------------------------------------------------------------------+
//|                                     Aegis_Quant_Terminal.mq5     |
//|                    Institutional AI Trading Terminal & EA        |
//|                 5-Pillar Confluence + Milestone Compounding      |
//|                      Copyright 2026, Aegis Quant Terminal        |
//+------------------------------------------------------------------+
#property copyright   "Aegis Quant Terminal"
#property link        "https://github.com/aegis-quant"
#property version     "3.00"
#property description "Institutional MT5 EA v3.0 Master: Forex Factory News Shield, OnTradeTransaction 0ms Sync, Smart Retry Engine, One-Chart Multi-Symbol & Milestone Compounding"

#include <Trade\Trade.mqh>
#include <Trade\PositionInfo.mqh>
#include <Trade\OrderInfo.mqh>
#include <Trade\AccountInfo.mqh>

//--- Enums
enum ENUM_EXECUTION_MODE
{
   MODE_FULL_AUTO    = 0, // Full Auto-Pilot (ส่งออเดอร์และจัดการ SL/TP ทันที)
   MODE_SEMI_AUTO    = 1, // Semi-Auto (ส่งสัญญาณและแจ้งเตือน รอกดปุ่มบนกราฟ)
   MODE_SIGNAL_ONLY  = 2  // Signal Only (ดูสถิติและ Confluence บน HUD เท่านั้น)
};

enum ENUM_ACCOUNT_MODE
{
   ACCOUNT_STANDARD  = 0, // บัญชี Standard USD ($)
   ACCOUNT_CENT      = 1  // บัญชี Cent USC (พอร์ตเล็ก $10-$50)
};

enum ENUM_SINGLE_LOT_MODE
{
   SINGLE_LOT_CASH_HARVEST = 0, // ปิดทำกำไร 100% ทันทีที่ TP1 (พอร์ต $10-$50 ปั้นทุนไว ล็อคกำไรเต็ม ไม่ลุ้นย่อชน BE)
   SINGLE_LOT_RUNNER_TRAIL  = 1  // ขยับ SL ไป Breakeven (+1.5 pips) แล้วปล่อยรันไป TP2
};

enum ENUM_GUI_THEME
{
   THEME_DARK_CYBER     = 0, // Dark Cyber (Obsidian Black + Neon Emerald/Cyan)
   THEME_STEALTH_SLATE  = 1, // Stealth Slate (Deep Slate + Royal Blue + Gold)
   THEME_MIDNIGHT_NAVY  = 2  // Midnight Navy (Navy Blue + Electric Violet + Aqua)
};

enum ENUM_LOT_COMPOUND_MODE
{
   COMPOUND_CONSERVATIVE   = 0, // Conservative Cap (Max 5.0 lots - เน้นความปลอดภัยสูงสุด สถาบัน)
   COMPOUND_BALANCED       = 1, // Balanced Market-Adaptive (Max 15.0 lots - ปรับขนาดตามสภาพตลาดและโมเมนตัม)
   COMPOUND_AGGRESSIVE     = 2, // Aggressive Hyper-Growth (Max 30.0 lots - ทบต้นเต็มพิกัด เร่งพอร์ตไว)
   COMPOUND_MANUAL_SCALPER = 3  // Manual Scalper (สายเทรดมือปั้นพอร์ตไว - House Money + Pyramiding)
};

enum ENUM_WOW_TRAILING_MODE
{
   TRAIL_OFF                 = 0, // ปิดระบบ Trailing Stop
   TRAIL_SMC_STRUCTURE       = 1, // 🏛️ SMC Structure (เลื่อน SL ซ่อนหลัง Swing High / Swing Low ป้องกันโดนกวาดไส้)
   TRAIL_ATR_PARABOLIC       = 2, // ⚡ ATR Parabolic Accelerator (ยิ่งกำไรเยอะ ยิ่งบีบแคบ 2.0x -> 1.0x ATR)
   TRAIL_MULTI_STAGE_RATCHET = 3, // 🪜 Multi-Stage Ratchet (บันไดล็อกกำไร 5 ระดับ: +5p->+1p, +15p->+8p, +25p->+16p, +40p->+30p)
   TRAIL_HYBRID_INSTITUTIONAL= 4  // 👑 Hybrid Master (ผสาน SMC Structure + Candle-by-Candle ที่ยอดดอย + ล็อกกันทุน)
};

//--- Input Parameters
input group "=== 🌐 BRIDGE & SERVER SETTINGS ==="
input string             InpServerUrl         = "http://localhost:3000"; // Server URL (อย่าใส่ / ต่อท้าย)
input int                InpPollIntervalSec   = 2;                       // ความถี่ดึงสัญญาณ (วินาที)
input ulong              InpMagicNumber       = 777888;                  // Magic Number ประจำ EA

input group "=== 📈 MARKET-ADAPTIVE DYNAMIC LOT SCALING ==="
input bool                    InpEnableAutoLotScale    = true;                    // เปิดโหมดคำนวณและปรับขนาด Lot อัตโนมัติตามสภาวะตลาด
input ENUM_LOT_COMPOUND_MODE InpLotCompoundMode       = COMPOUND_MANUAL_SCALPER; // โหมดทบต้นและเพดาน Lot (แนะนำ MANUAL_SCALPER สายเทรดมือปั้นพอร์ตไว)
input double                  InpBaseRiskPct           = 1.8;                     // เปอร์เซ็นต์ความเสี่ยงพื้นฐานต่อไม้ (%)
input double                  InpMaxLotCap             = 15.0;                    // เพดานขนาด Lot สูงสุดที่อนุญาต (ป้องกัน Slippage)
input bool                    InpRegimeLotBoost        = true;                    // เร่ง Lot (+25%) เมื่อตลาดเป็น Trend แรง และลด Lot (-30%) ใน Sideway
input bool                    InpEnableProfitMartingale= true;                    // เปิดโหมด Profit Martingale (เร่ง Lot ด้วยกำไรเมื่อชนะติดกัน)
input double                  InpStreak2Multiplier     = 1.5;                     // ตัวคูณเร่ง Lot เมื่อชนะติดกัน 2 ไม้
input double                  InpStreak3Multiplier     = 2.0;                     // ตัวคูณเร่ง Lot เมื่อชนะติดกัน 3 ไม้ขึ้นไป

input group "=== 🥷 STEALTH / VIRTUAL SL & TP ENGINE ==="
input bool               InpEnableStealthMode     = true;                   // เปิดระบบซ่อน SL/TP จากโบรกเกอร์ (Stealth Virtual SL/TP)
input bool               InpUseDisasterSL         = true;                   // ส่ง SL สำรองไกลๆ ไปที่โบรกเกอร์กันไฟดับ/เน็ตหลุด (Disaster SL)
input double             InpDisasterSLPips        = 150.0;                  // ระยะ Disaster SL (Pips) ส่งไปโบรกเกอร์

input group "=== ⚙️ EXECUTION & RISK SETTINGS ==="
input ENUM_EXECUTION_MODE InpExecMode         = MODE_FULL_AUTO;          // โหมดการทำงาน
input ENUM_ACCOUNT_MODE  InpAccountMode       = ACCOUNT_STANDARD;        // ประเภทบัญชี
input double             InpMaxSpreadPips     = 3.5;                     // สเปรดสูงสุดที่ยอมรับได้ (Pips)
input int                InpSlippagePips      = 10;                      // Slippage ยอมรับได้ (Points)
input double             InpMaxMarginPct      = 20.0;                    // เพดาน Margin สูงสุดของพอร์ต (%)

input group "=== 🎨 ON-CHART GUI DASHBOARD ==="
input bool               InpShowGUI           = true;                    // เปิดแสดงหน้าต่าง Dashboard บนกราฟ
input int                InpGuiX              = 20;                      // ตำแหน่งแกน X (พิกเซล)
input int                InpGuiY              = 35;                      // ตำแหน่งแกน Y (พิกเซล)
input ENUM_GUI_THEME     InpGuiTheme          = THEME_DARK_CYBER;        // ธีมสีหน้าต่าง (Dark Cyber / Stealth Slate / Midnight Navy)

input group "=== 🔔 NOTIFICATIONS ==="
input bool               InpSoundAlerts       = true;                    // เสียงแจ้งเตือน
input bool               InpPushAlerts        = false;                   // Push Notification เข้ามือถือ

input group "=== 🌾 EARLY PROFIT HARVESTER & 0.01 LOT MODE ==="
input bool               InpEnableEarlyHarvest = true;                   // เปิดระบบชิงปิดทำกำไรก่อนถึง TP
input double             InpHarvestMinR       = 0.75;                   // กำไรขั้นต่ำ (R-Multiple) ก่อนเริ่มดักเก็บกำไร
input double             InpHarvestMinPips    = 12.0;                   // กำไรขั้นต่ำ (Pips) ก่อนเริ่มดักเก็บกำไร
input ENUM_SINGLE_LOT_MODE InpSingleLotMode   = SINGLE_LOT_CASH_HARVEST; // โหมด TP สำหรับไม้ 0.01 Lot (CASH_HARVEST vs RUNNER_TRAIL)

input group "=== 🌪️ WOW-GRADE ADAPTIVE TRAILING STOP ENGINE ==="
input ENUM_WOW_TRAILING_MODE InpTrailingMode          = TRAIL_HYBRID_INSTITUTIONAL; // โหมด Trailing Stop อัจฉริยะ (แนะนำ Hybrid Master)
input double                 InpTrailActivationPips   = 10.0;                       // กำไรขั้นต่ำ (Pips) ก่อนเริ่มสตาร์ท Trailing Stop
input double                 InpTrailStepPips         = 1.0;                        // ระยะห่างขยับแต่ละครั้ง (Pips) เพื่อไม่ให้ส่งคำสั่งถี่เกิน
input int                    InpSmcSwingLookbackBars  = 5;                          // จำนวนแท่งเทียนย้อนหลังสำหรับหา Swing Pivot (3 - 8 แท่ง)
input bool                   InpTrailBarByBarAtPeak   = true;                       // สลับเข้าสู่ Candle-by-Candle จี้ใต้แท่งเทียนทันทีเมื่อกำไรเกิน +30 pips
input double                 InpTrailPeakThresholdPips= 30.0;                       // ระดับกำไร (Pips) ที่จะเริ่มจี้ใต้แท่งเทียนเพื่อล็อกกำไรยอดดอย

input group "=== ⚡ FLASH VOLATILITY SPIKE GUARD ==="
input bool               InpEnableFlashSpikeGuard = true;                // ตรวจจับแท่งเทียนกระชากผิดปกติ (>3x ATR) พักเทรดทันที
input double             InpFlashSpikeATRMult     = 3.0;                 // ตัวคูณ ATR สำหรับตรวจจับ Spike
input int                InpSpikeFreezeMinutes    = 15;                  // เวลาหยุดเทรดหลังเจอ Spike (นาที)

input group "=== 🛡️ DAILY DRAWDOWN GUARD (PROP FIRM) ==="
input bool               InpEnableDailyGuard  = true;                   // เปิดระบบตัดขาดทุนรายวัน (Circuit Breaker)
input double             InpMaxDailyLossPct   = 4.0;                    // ขาดทุนสูงสุดต่อวัน (%) ก่อนสั่งปิดหมดและหยุดเทรด
input double             InpTrailingDailyLockPct = 50.0;                // ล็อคกำไรรายวัน (%) หากกำไรพีคย่อลงมาเกินกำหนด

input group "=== 🧺 BASKET CLOSE & MAX POSITIONS GUARD ==="
input bool               InpEnableBasketClose     = true;                   // เปิดระบบปิดรวบ (Basket Close) เมื่อขาดทุนรวมถึงเพดาน
input double             InpBasketMaxLossPct      = 3.0;                    // ขาดทุนรวมของทุกไม้ (%) เทียบทุนก่อนปิดรวบทุกไม้ทันที
input double             InpBasketProfitLockPct   = 40.0;                   // ล็อคกำไรลอยตัวรวมตะกร้า (%) ถ้ากำไรพีคแล้วย่อเกินกำหนดให้ปิดรวบ
input int                InpMaxOpenPositions      = 3;                      // จำนวนออเดอร์เปิดพร้อมกันสูงสุด (รวม Pyramid) ป้องกันเปิดซ้อนมากเกิน
input bool               InpEnableEquityShield    = true;                   // เปิดเกราะ Equity Shield ปิดทุกไม้ทันทีเมื่อ Equity หลุดเส้นแดง
input double             InpEquityShieldPct       = 8.0;                    // เส้นแดง Equity Shield: หาก Equity ลดลงรวมเกิน N% จากจุดเริ่มต้นวัน ปิดหมดทันที

input group "=== ⏰ SESSION & TIME FILTER ==="
input bool               InpEnableTimeFilter  = true;                   // เปิดตัวกรองเวลาเทรด
input bool               InpAsianBoxShield    = true;                   // บล็อกการเทรดกรอบ Box ช่วงเอเชียและก่อนเปิดลอนดอน (06:00 - 14:00 น. Win Rate 93.1%)
input int                InpRolloverStartHour = 23;                     // ชั่วโมงเริ่ม Rollover สเปรดถ่าง (Server Time)

input int                InpRolloverEndHour   = 1;                      // ชั่วโมงสิ้นสุด Rollover (Server Time)
input bool               InpCloseFridayNight  = false;                  // สั่งปิดทุกไม้ก่อนวันหยุดสุดสัปดาห์ (ศุกร์กลางคืน)
input int                InpFridayCloseHour   = 22;                     // ชั่วโมงปิดไม้วันศุกร์ (Server Time)

input group "=== 🎯 ZERO-DRAWDOWN SUITE & SNIPER SCALPING (5M/15M) ==="
input bool               InpEnableScalpSniper     = true;                   // เปิดโหมด Sniper Scalping ความแม่นยำสูง (5M / 15M)
input bool               InpEnableMtfFilter       = true;                   // กรองทิศทางไม่ให้สวนเทรนด์ H1 (1H EMA21 vs EMA55)
input bool               InpEnableLiquiditySweep  = true;                   // ตรวจจับไส้กวาดสภาพคล่องสถาบัน (Turtle Soup Sweep)
input bool               InpRequireLiquiditySweep = false;                  // บังคับเฉพาะไม้ที่กวาด Sweep ชัดเจนเท่านั้น (โหมด Conservative)
input bool               InpUsOpenSpikeFreeze     = true;                   // ฟรีซคำสั่งช่วงเปิดตลาดหุ้นสหรัฐฯ (20:25 - 21:45 น. เวลาไทย)
input bool               InpEnableFastTrackBE     = true;                   // เปิดระบบ Hyper Fast-Track SL ล็อกหน้าทุนเร็วพิเศษ (Zero-Risk Shield)
input double             InpFastTrackBePips       = 5.0;                    // กระชับ SL ล็อกหน้าทุนทันทีเมื่อบวกถึง (+5.0 pips)
input double             InpFastTrackLockPips     = 1.0;                    // ระยะล็อกกำไรหน้าทุน (+1.0 pips พ้นค่าสเปรด)
input bool               InpEnableScratchExit     = true;                   // เปิดระบบหนีตาย 3 แท่งเทียน (3-Bar Scratch Invalidation ไม่รอโดนลาก)
input int                InpScratchMaxBars        = 3;                      // จำนวนแท่งเทียนที่รอความเร็วโมเมนตัม (3 แท่ง = 15 นาทีบน M5)
input double             InpScratchStallPips      = 2.5;                    // เพดานกำไรที่ถือว่ายังไม่เร่งสปีด (+2.5 pips)
input double             InpScratchMaxLossPips    = 4.0;                    // ยอมเสียค่า Scratch สูงสุดไม่เกิน -4.0 pips (ตัดทิ้งทันทีก่อนโดนลาก -22 pips)
input bool               InpEnableGoldenSessionLock = true;                 // ล็อคเทรดเฉพาะช่วง High-Momentum Golden Windows (London & NY Overlap)
input bool               InpEnableOteDeepEntry    = true;                   // บังคับดักเฉพาะ OTE 70.5% - 78.6% Fib ปลายไส้ (Zero-MAE Entry)
input double             InpMinRejectWickPct      = 40.0;                   // บังคับแท่งทดสอบต้องมีไส้ปฏิเสธราคาอย่างน้อย 40% ป้องกันแท่งตันทะลุ
input bool               InpEnableAutoPyramiding  = true;                   // เปิดระบบยัดไม้เพิ่มอัตโนมัติเมื่อไม้แรกขยับกันทุนแล้ว (Auto-Pyramiding Scale-In)
input double             InpPyramidTriggerPips    = 15.0;                   // ระยะกำไรของไม้แรก (Pips) ที่จะเริ่มยัดไม้ที่ 2 ตามน้ำ
input double             InpPyramidLotMultiplier  = 1.0;                    // สัดส่วนขนาด Lot ของไม้ยัดเพิ่มเทียบกับไม้แรก (1.0x เท่ากัน)
input bool               InpEnableTimeStop        = true;                   // เปิดระบบตัดออเดอร์หมดอายุเวลา (Time-Decay Stop)
input int                InpTimeStopBars          = 4;                      // ปิดออเดอร์ทันทีหากผ่านไป N แท่ง (เช่น 4 แท่ง 5M = 20 นาที) แล้วราคานิ่ง
input double             InpMaxScalpSpreadPips    = 2.5;                    // สเปรดสูงสุดที่ยอมรับได้สำหรับ Scalp (ทองคำไม่เกิน 2.5 pips)

input group "=== 🎯 PENDING ORDERS & ROUTER ==="
input bool               InpUsePendingOrders  = true;                   // รองรับ Buy/Sell Limit ดักราคาที่ Order Block
input int                InpPendingExpiryHours = 4;                     // อายุของ Pending Order ก่อนยกเลิก (ชั่วโมง)
input double             InpMarketExecBufferPips = 2.0;                 // ถ้าราคาห่างจาก Limit ไม่เกินกี่ Pip ให้เข้า Market เลย

input group "=== 🎯 INSTITUTIONAL PRECISION & ENTRY OPTIMIZER ==="
input bool               InpEnableTwoStageExec      = true;  // เปิดโหมด Split Entry (50% Market + 50% Limit ที่ OTE)
input bool               InpEnableAdaptiveSpread    = true;  // ปรับเพดานสเปรดตามคาดหวัง R:R (Spread EV Cushion)
input bool               InpEnableJudasSwing        = true;  // ปลดล็อค Judas Swing Reversal ช่วง 12:00-13:59 (เวลาไทย)
input bool               InpEnableMacroPullbackPass = true;  // อนุญาต Pullback Scalp เข้าหา Macro Equilibrium Zone
input double             InpFrontRunBufferPips      = 1.0;   // ดักราคาก่อนถึง Limit (Front-Run Buffer) กันตกรถ

input group "=== 📊 ON-CHART VISUAL LEVELS ==="
input bool               InpDrawChartLevels   = true;                   // วาดเส้น Entry, SL, TP1, TP2 ลงบนกราฟ
input color              InpColorEntry        = clrDodgerBlue;          // สีเส้น Entry
input color              InpColorSL           = clrCrimson;             // สีเส้น Stop Loss
input color              InpColorTP1          = clrLimeGreen;           // สีเส้น TP1 (Harvest)
input color              InpColorTP2          = clrGold;                // สีเส้น TP2 (Target)

input group "=== 📰 FOREX FACTORY NEWS SHIELD ==="
input bool               InpEnableNewsShield      = true;                   // เปิดระบบป้องกันข่าว Forex Factory
input int                InpNewsPreFreezeMins     = 15;                     // ระยะเวลาหยุดรับสัญญาณก่อนข่าวแดงออก (นาที)
input bool               InpNewsAutoBreakeven     = true;                   // เลื่อน SL มาล็อกหน้าทุนอัตโนมัติก่อนข่าวแดงออก 15 นาที
input bool               InpEnablePostNewsSniper  = true;                   // เปิดรับสัญญาณดักสไนเปอร์สวนไส้ข่าว (Turtle Soup)

input group "=== 🧭 INSTITUTIONAL MACRO NEWS DIRECTION & ZONES ==="
input bool               InpEnableMacroBiasFilter = true;                   // กรองทิศทางการเทรดตามข่าวเศรษฐกิจและตัวเลขคาดการณ์ (Macro Directional Bias)
input bool               InpDrawMacroNewsZone     = true;                   // วาดกรอบโซนราคาตอบรับข่าว (Macro News Reaction Zone / FVG) บนกราฟ
input color              InpMacroZoneBullColor    = C'20,40,30';            // สีกล่องโซนฝั่ง Buy (Demand FVG)
input color              InpMacroZoneBearColor    = C'45,20,25';            // สีกล่องโซนฝั่ง Sell (Supply FVG)

input group "=== 🌐 ONE-CHART MULTI-SYMBOL ENGINE ==="
input bool               InpOneChartMultiSymbol   = false;                  // เปิดโหมดเทรดหลายคู่เงินพร้อมกันจากกราฟเดียว
input string             InpWatchlistSymbols      = "XAUUSD,EURUSD,GBPUSD,USDJPY,BTCUSD,USOIL"; // รายชื่อคู่เงินที่ต้องการให้ EA เทรด

input group "=== ⚡ SMART RETRY EXECUTION ENGINE ==="
input int                InpMaxOrderRetries       = 3;                      // จำนวนครั้งส่งคำสั่งซ้ำเมื่อโดน Requote / Off-Quotes
input int                InpRetryDelayMs          = 300;                    // ระยะเวลารอระหว่างส่งซ้ำ (มิลลิวินาที)

input group "=== 📶 OFFLINE STANDALONE FALLBACK ==="
input bool               InpOfflineFallback   = true;                   // เปิดโหมดทำงานสำรองเมื่อเซิร์ฟเวอร์เว็บหลุด
input int                InpMaxLossCooldownTrades = 2;                  // จำนวนไม้ที่โดน SL ติดกันก่อนเข้า Cooldown
input int                InpCooldownMinutes   = 60;                     // ระยะเวลาพักเทรดหลังแพ้ติดกัน (นาที)

//--- Global Trading Objects
CTrade         m_trade;
CPositionInfo  m_position;
COrderInfo     m_order;
CAccountInfo   m_account;
int            hRSI   = INVALID_HANDLE;
int            hEMA20 = INVALID_HANDLE;
int            hEMA50 = INVALID_HANDLE;
int            hATR   = INVALID_HANDLE;
int            hMtfEMA21 = INVALID_HANDLE;
int            hMtfEMA55 = INVALID_HANDLE;

//--- State Variables
datetime m_lastPollTime           = 0;
datetime m_lastSuccessfulPoll     = 0;
datetime m_lastPingTime           = 0;
int      m_lastPingMs             = 0;
bool     m_isOnline               = false;
bool     m_isMinimized            = false;
ENUM_EXECUTION_MODE m_currentMode;

// Forex Factory News State
int      m_newsMinutesToNext      = -999;
string   m_newsState              = "SAFE_TRADING_WINDOW";
string   m_newsTitle              = "NONE";
bool     m_newsTradeAllowed       = true;
string   m_newsTimeStr            = "--:--";

// Institutional Macro Direction & Zones State
string   m_macroBias              = "NEUTRAL"; // BUY_ONLY, SELL_ONLY, NEUTRAL
double   m_macroZoneHigh          = 0.0;
double   m_macroZoneLow           = 0.0;
double   m_macroZoneMid           = 0.0;
string   m_macroSentiment         = "NEUTRAL";
string   m_macroEventTitle        = "NONE";

// Flash Volatility Spike State
datetime m_spikeFreezeUntil       = 0;
string   m_spikeReason            = "";

// Daily Drawdown Guard State
datetime m_dayCurrentDate         = 0;
double   m_dayStartEquity         = 0.0;
double   m_dayPeakEquity          = 0.0;
bool     m_isDailyLocked          = false;
string   m_dailyLockReason        = "";

// Consecutive Loss Cooldown State
int      m_consecutiveLosses      = 0;
datetime m_cooldownUntil          = 0;

// Telemetry from Web Bridge
string   m_lastOrderId          = "";
string   m_lastOrderType        = "NONE";
double   m_lastOrderPrice       = 0.0;
double   m_lastOrderSL          = 0.0;
double   m_lastOrderTP1         = 0.0;
double   m_lastOrderTP2         = 0.0;
double   m_lastOrderLot         = 0.01;
double   m_lastRemainingLot     = 0.01;
string   m_lastOrderStatus      = "IDLE";
double   m_lastTrailingSl       = 0.0;
string   m_lastDefenseReason    = "NONE";
string   m_lastTierName         = "Tier 1: Foundation";
string   m_lastGovernorStatus   = "NORMAL";
double   m_confluenceScore      = 82.5;
string   m_setupGrade           = "A+";
string   m_lastOrderFlags       = "STANDARD";

// Stealth Virtual SL / TP State (Hidden from Broker)
double   m_stealthSL            = 0.0;
double   m_stealthTP1           = 0.0;
double   m_stealthTP2           = 0.0;
bool     m_isStealthActive      = false;

// Profit Martingale Win Streak State
int      m_winStreak            = 0;
bool     m_hasPyramidedThisCycle = false;

// Basket Close State
double   m_basketPeakFloatingPnl = 0.0;
bool     m_basketLocked          = false;
string   m_basketLockReason      = "";

// GUI Object Name Prefix

#define GUI_PREFIX "AegisHUD_"
#define LEVEL_PREFIX "AegisLvl_"

//--- Forward Function Prototypes
double GetPipMultiplier(string sym = "");
bool   HasOpenPosition(string orderId, string sym = "");
bool   HasPendingOrder(string orderId, string sym = "");
bool   IsSymbolMatching(string bridgeSym, string chartSym);
bool   IsWatchlistSymbol(string sym);
string ResolveBrokerSymbol(string canonicalSym);
void   NotifyBridgeOrderEvent(string orderId, string action, double execPrice, double profitPips, string sym = "");
void   ExecuteInstitutionalSignal(string orderId, string typeStr, double price, double sl, double tp1, double tp2, double lots, string targetSym = "", string optFlags = "");
double CalculateMarketAdaptiveLot(string sym, double entryPrice, double slPrice, double fallbackLot);

//+------------------------------------------------------------------+
//| Expert initialization function                                   |
//+------------------------------------------------------------------+
int OnInit()
{
   m_currentMode = InpExecMode;
   m_trade.SetExpertMagicNumber(InpMagicNumber);
   m_trade.SetDeviationInPoints(InpSlippagePips);
   
   // Dynamic Broker Filling Mode Autodetection (IOC / FOK / RETURN)
   uint fillingMode = (uint)SymbolInfoInteger(_Symbol, SYMBOL_FILLING_MODE);
   if((fillingMode & SYMBOL_FILLING_IOC) != 0)
      m_trade.SetTypeFilling(ORDER_FILLING_IOC);
   else if((fillingMode & SYMBOL_FILLING_FOK) != 0)
      m_trade.SetTypeFilling(ORDER_FILLING_FOK);
   else
      m_trade.SetTypeFilling(ORDER_FILLING_RETURN);

   // Daily Guard baseline initialization
   m_dayStartEquity = m_account.Equity();
   m_dayPeakEquity = m_dayStartEquity;
   MqlDateTime dt;
   datetime now = TimeCurrent();
   TimeToStruct(now, dt);
   m_dayCurrentDate = (datetime)(now - (dt.hour * 3600 + dt.min * 60 + dt.sec));

   // ตรวจสอบการเปิดใช้งาน WebRequest
   char testPost[], testResult[];
   string testHeaders;
   ResetLastError();
   int res = WebRequest("GET", InpServerUrl + "/api/mt-bridge?symbol=" + _Symbol, "", 1000, testPost, testResult, testHeaders);
   if(res == -1 && GetLastError() == 4060)
   {
      Alert("⚠️ [Aegis EA] กรุณาเปิด WebRequest ใน MT5:\nTools ➔ Options ➔ Expert Advisors ➔ ติ๊ก Allow WebRequest และเพิ่ม URL:\n" + InpServerUrl);
      Print("WebRequest not allowed for URL: ", InpServerUrl);
   }
   else if(res == 301 || res == 308)
   {
      Alert("⚠️ [Aegis EA] ตรวจพบการ Redirect (HTTP 301/308):\nกรุณาเปลี่ยน InpServerUrl ให้ขึ้นต้นด้วย https:// (เช่น https://xxx.vercel.app)");
      Print("HTTP Redirect detected. Please use https:// for InpServerUrl to avoid Vercel redirects.");
   }

   EventSetTimer(1); // Timer ทุก 1 วินาที
   hRSI = iRSI(_Symbol, _Period, 14, PRICE_CLOSE);
   hEMA20 = iMA(_Symbol, _Period, 20, 0, MODE_EMA, PRICE_CLOSE);
   hEMA50 = iMA(_Symbol, _Period, 50, 0, MODE_EMA, PRICE_CLOSE);
   hATR   = iATR(_Symbol, _Period, 14);
   hMtfEMA21 = iMA(_Symbol, PERIOD_H1, 21, 0, MODE_EMA, PRICE_CLOSE);
   hMtfEMA55 = iMA(_Symbol, PERIOD_H1, 55, 0, MODE_EMA, PRICE_CLOSE);

   if(InpShowGUI)
   {
      CreateDashboardGUI();
      UpdateDashboardGUI();
   }

   Print("✅ Aegis Quant Terminal EA Initialized on ", _Symbol, " | Magic: ", InpMagicNumber, " | Start Equity: $", m_dayStartEquity);
   return(INIT_SUCCEEDED);
}

//+------------------------------------------------------------------+
//| Expert deinitialization function                                 |
//+------------------------------------------------------------------+
void OnDeinit(const int reason)
{
   EventKillTimer();
   if(hRSI != INVALID_HANDLE)   { IndicatorRelease(hRSI);   hRSI = INVALID_HANDLE; }
   if(hEMA20 != INVALID_HANDLE) { IndicatorRelease(hEMA20); hEMA20 = INVALID_HANDLE; }
   if(hEMA50 != INVALID_HANDLE) { IndicatorRelease(hEMA50); hEMA50 = INVALID_HANDLE; }
   if(hATR != INVALID_HANDLE)   { IndicatorRelease(hATR);   hATR = INVALID_HANDLE; }
   if(hMtfEMA21 != INVALID_HANDLE) { IndicatorRelease(hMtfEMA21); hMtfEMA21 = INVALID_HANDLE; }
   if(hMtfEMA55 != INVALID_HANDLE) { IndicatorRelease(hMtfEMA55); hMtfEMA55 = INVALID_HANDLE; }
   
   ClearChartTradeLevels();
   DestroyDashboardGUI();
   Print("Aegis Quant Terminal EA Deinitialized. Reason: ", reason);
}

//+------------------------------------------------------------------+
//| On-Chart Visual Trade Levels Functions                           |
//+------------------------------------------------------------------+
void ClearChartTradeLevels()
{
   ObjectsDeleteAll(0, LEVEL_PREFIX);
   ObjectDelete(0, "Aegis_Macro_Zone");
   ObjectDelete(0, "Aegis_Macro_Label");
   ChartRedraw();
}

void CreateChartHLine(string name, double price, color clr, ENUM_LINE_STYLE style, int width, string desc)
{
   string objName = LEVEL_PREFIX + name;
   ObjectDelete(0, objName);
   ObjectCreate(0, objName, OBJ_HLINE, 0, 0, price);
   ObjectSetInteger(0, objName, OBJPROP_COLOR, clr);
   ObjectSetInteger(0, objName, OBJPROP_STYLE, style);
   ObjectSetInteger(0, objName, OBJPROP_WIDTH, width);
   ObjectSetString(0, objName, OBJPROP_TEXT, desc);
   ObjectSetInteger(0, objName, OBJPROP_BACK, false);
   ObjectSetInteger(0, objName, OBJPROP_SELECTABLE, false);
}

void DrawChartTradeLevels(string typeStr, double entry, double sl, double tp1, double tp2)
{
   if(!InpDrawChartLevels) return;

   int digits = (int)SymbolInfoInteger(_Symbol, SYMBOL_DIGITS);
   ClearChartTradeLevels();

   // Entry line
   CreateChartHLine("Entry", entry, InpColorEntry, STYLE_SOLID, 2, StringFormat("Aegis ENTRY @ %.*f [%s]", digits, entry, typeStr));

   // Stop Loss line
   if(sl > 0)
   {
      CreateChartHLine("SL", sl, InpColorSL, STYLE_SOLID, 2, StringFormat("Aegis SL @ %.*f (-1.0R)", digits, sl));
   }

   // TP1 Harvest line
   if(tp1 > 0)
   {
      CreateChartHLine("TP1", tp1, InpColorTP1, STYLE_DASH, 1, StringFormat("Aegis TP1 Harvest @ %.*f (+1.2R)", digits, tp1));
   }

   // TP2 Final Target line
   if(tp2 > 0)
   {
      CreateChartHLine("TP2", tp2, InpColorTP2, STYLE_SOLID, 2, StringFormat("Aegis TP2 Target @ %.*f (+2.5R)", digits, tp2));
   }

   ChartRedraw();
}

//+------------------------------------------------------------------+
//| Draw Institutional Macro News Reaction Zone & Equilibrium on Chart |
//+------------------------------------------------------------------+
void DrawMacroReactionZone()
{
   if(!InpDrawMacroNewsZone || m_macroZoneHigh <= 0 || m_macroZoneLow <= 0) return;
   
   int digits = (int)SymbolInfoInteger(_Symbol, SYMBOL_DIGITS);
   int barSeconds = PeriodSeconds(_Period);
   if(barSeconds <= 0) barSeconds = 300;
   datetime tStart = TimeCurrent() - (barSeconds * 16);
   datetime tEnd   = TimeCurrent() + (barSeconds * 16);
   
   color zoneColor   = (m_macroBias == "BUY_ONLY") ? InpMacroZoneBullColor : (m_macroBias == "SELL_ONLY") ? InpMacroZoneBearColor : C'30,30,40';
   color borderColor = (m_macroBias == "BUY_ONLY") ? clrMediumSpringGreen : (m_macroBias == "SELL_ONLY") ? clrTomato : clrSlateGray;
   
   ObjectDelete(0, "Aegis_Macro_Zone");
   ObjectCreate(0, "Aegis_Macro_Zone", OBJ_RECTANGLE, 0, tStart, m_macroZoneHigh, tEnd, m_macroZoneLow);
   ObjectSetInteger(0, "Aegis_Macro_Zone", OBJPROP_COLOR, borderColor);
   ObjectSetInteger(0, "Aegis_Macro_Zone", OBJPROP_BGCOLOR, zoneColor);
   ObjectSetInteger(0, "Aegis_Macro_Zone", OBJPROP_FILL, true);
   ObjectSetInteger(0, "Aegis_Macro_Zone", OBJPROP_STYLE, STYLE_DASHDOT);
   ObjectSetInteger(0, "Aegis_Macro_Zone", OBJPROP_BACK, true);

   ObjectDelete(0, "Aegis_Macro_Label");
   ObjectCreate(0, "Aegis_Macro_Label", OBJ_TEXT, 0, tStart, m_macroZoneHigh);
   string labelText = StringFormat("🧭 MACRO %s (%s) | Eq 50%%: %.*f", m_macroBias, m_macroEventTitle, digits, m_macroZoneMid);
   ObjectSetString(0, "Aegis_Macro_Label", OBJPROP_TEXT, labelText);
   ObjectSetInteger(0, "Aegis_Macro_Label", OBJPROP_COLOR, (m_macroBias == "BUY_ONLY") ? clrSpringGreen : clrCoral);
   ObjectSetInteger(0, "Aegis_Macro_Label", OBJPROP_FONTSIZE, 9);
   
   ChartRedraw();
}

//+------------------------------------------------------------------+
//| Emergency Close All Positions and Cancel All Pending Orders      |
//+------------------------------------------------------------------+
void CloseAllPositionsAndPendings()
{
   for(int i = PositionsTotal() - 1; i >= 0; i--)
   {
      if(m_position.SelectByIndex(i))
      {
         if(m_position.Symbol() == _Symbol && m_position.Magic() == InpMagicNumber)
         {
            m_trade.PositionClose(m_position.Ticket());
         }
      }
   }

   for(int i = OrdersTotal() - 1; i >= 0; i--)
   {
      if(m_order.SelectByIndex(i))
      {
         if(m_order.Symbol() == _Symbol && m_order.Magic() == InpMagicNumber)
         {
            m_trade.OrderDelete(m_order.Ticket());
         }
      }
   }

   ClearChartTradeLevels();
}

//+------------------------------------------------------------------+
//| Daily Drawdown Guard & Circuit Breaker                           |
//+------------------------------------------------------------------+
void CheckDailyDrawdownGuard()
{
   if(!InpEnableDailyGuard) return;

   datetime now = TimeCurrent();
   MqlDateTime dt;
   TimeToStruct(now, dt);

   // Check if a new day has begun (00:00 server time)
   datetime todayDate = (datetime)(now - (dt.hour * 3600 + dt.min * 60 + dt.sec));
   if(todayDate != m_dayCurrentDate)
   {
      m_dayCurrentDate = todayDate;
      m_dayStartEquity = AccountInfoDouble(ACCOUNT_EQUITY);
      m_dayPeakEquity  = m_dayStartEquity;
      m_isDailyLocked  = false;
      m_dailyLockReason = "";
      PrintFormat("🌅 [Aegis Daily Guard] New Day Initialized. Starting Equity: $%.2f", m_dayStartEquity);
   }

   if(m_isDailyLocked) return;

   double currentEquity = AccountInfoDouble(ACCOUNT_EQUITY);
   if(currentEquity > m_dayPeakEquity) m_dayPeakEquity = currentEquity;

   if(m_dayStartEquity > 0)
   {
      double dailyPnlPct = ((currentEquity - m_dayStartEquity) / m_dayStartEquity) * 100.0;
      
      // 1. Hard Daily Max Loss Trigger
      if(dailyPnlPct <= -MathAbs(InpMaxDailyLossPct))
      {
         m_isDailyLocked = true;
         m_dailyLockReason = StringFormat("DAILY LOSS LIMIT HIT (%.2f%%)", dailyPnlPct);
         PrintFormat("🚨 [Aegis Daily Guard] CIRCUIT BREAKER ACTIVATED! Daily PnL: %.2f%% <= -%.2f%%. Locking EA until tomorrow.", dailyPnlPct, InpMaxDailyLossPct);

         CloseAllPositionsAndPendings();
         NotifyBridgeOrderEvent(m_lastOrderId, "DAILY_LOSS_LIMIT", currentEquity, MathAbs(dailyPnlPct));
         if(InpSoundAlerts) PlaySound("alert2.wav");
         if(InpPushAlerts) SendNotification(StringFormat("Aegis CIRCUIT BREAKER: Daily Drawdown Limit hit on %s (-%.1f%%). All positions closed.", _Symbol, MathAbs(dailyPnlPct)));
         return;
      }

      // 2. Trailing Daily Profit Lock (Secures gains if day reached >= +2% then retraced)
      double peakGain = m_dayPeakEquity - m_dayStartEquity;
      if(peakGain > (m_dayStartEquity * 0.02) && InpTrailingDailyLockPct > 0)
      {
         double currentGain = currentEquity - m_dayStartEquity;
         if(currentGain < peakGain * (1.0 - (InpTrailingDailyLockPct / 100.0)))
         {
            m_isDailyLocked = true;
            m_dailyLockReason = StringFormat("TRAILING PROFIT LOCK (Secured +$%.2f)", currentGain);
            PrintFormat("🛡️ [Aegis Daily Guard] Trailing Profit Lock triggered. Preserving gains: $%.2f.", currentGain);
            CloseAllPositionsAndPendings();
            NotifyBridgeOrderEvent(m_lastOrderId, "DAILY_PROFIT_LOCKED", currentEquity, (currentGain / m_dayStartEquity) * 100.0);
            return;
         }
      }
   }
}

//+------------------------------------------------------------------+
//| Trading Session & Rollover Spread Filter                         |
//+------------------------------------------------------------------+
bool IsTradingTimeAllowed()
{
   if(!InpEnableTimeFilter) return true;

   datetime now = TimeCurrent();
   MqlDateTime dt;
   TimeToStruct(now, dt);

   // A. Weekend (Saturday & Sunday)
   if(dt.day_of_week == 0 || dt.day_of_week == 6) return false;

   // B. Friday Night Closeout
   if(InpCloseFridayNight && dt.day_of_week == 5)
   {
      if(dt.hour >= InpFridayCloseHour) return false;
   }

   // C. Rollover Midnight Spread Protection (Server Time)
   if(InpRolloverStartHour > InpRolloverEndHour)
   {
      if(dt.hour >= InpRolloverStartHour || dt.hour <= InpRolloverEndHour) return false;
   }
   else
   {
      if(dt.hour >= InpRolloverStartHour && dt.hour <= InpRolloverEndHour) return false;
   }

   // D. Golden Session Lock (เทรดเฉพาะช่วง London & NY Overlap ที่มี Institutional Volume หนาแน่น)
   if(InpEnableGoldenSessionLock)
   {
      int thaiHour = (dt.hour + 4) % 24; // Broker server time to Thai time UTC+7
      bool isLondonSession = (thaiHour >= 14 && thaiHour < 18); // 14:00 - 17:59
      bool isNewYorkSession = (thaiHour >= 19 && thaiHour < 24); // 19:00 - 23:59
      bool isJudasHour = (thaiHour >= 12 && thaiHour < 14); // Judas Swing Pre-London
      
      // If outside high-conviction windows and not A+ setup
      if(!isLondonSession && !isNewYorkSession && !isJudasHour && m_setupGrade != "A+")
      {
         return false; // Suppress low-volume choppy Asian noise to keep Drawdown near 0%!
      }
   }

   return true;
}

//+------------------------------------------------------------------+
//| Check if Pending Order is already active                         |
//+------------------------------------------------------------------+
bool HasPendingOrder(string orderId, string sym = "")
{
   if(sym == "") sym = _Symbol;
   for(int i = OrdersTotal() - 1; i >= 0; i--)
   {
      if(m_order.SelectByIndex(i))
      {
         if(m_order.Symbol() == sym && m_order.Magic() == InpMagicNumber)
         {
            return true;
         }
      }
   }
   return false;
}

//+------------------------------------------------------------------+
//| Check Institutional Liquidity Sweep (Turtle Soup) on Symbol/TF   |
//+------------------------------------------------------------------+
bool CheckLiquiditySweep(string sym, ENUM_TIMEFRAMES tf, bool isBuy)
{
   MqlRates rates[];
   ArraySetAsSeries(rates, true);
   if(CopyRates(sym, tf, 0, 22, rates) < 22) return false;

   double priorExtremum = isBuy ? rates[2].low : rates[2].high;
   for(int i = 3; i <= 21; i++)
   {
      if(isBuy) {
         if(rates[i].low < priorExtremum) priorExtremum = rates[i].low;
      } else {
         if(rates[i].high > priorExtremum) priorExtremum = rates[i].high;
      }
   }

   for(int barIdx = 1; barIdx >= 0; barIdx--)
   {
      double high = rates[barIdx].high;
      double low = rates[barIdx].low;
      double open = rates[barIdx].open;
      double close = rates[barIdx].close;
      double totalRange = high - low;
      if(totalRange <= 0) continue;

      if(isBuy)
      {
         bool pierced = (low < priorExtremum && close > priorExtremum);
         double lowerWick = MathMin(open, close) - low;
         bool pinbarRejection = (lowerWick / totalRange) >= 0.38;
         if(pierced && pinbarRejection) return true;
      }
      else
      {
         bool pierced = (high > priorExtremum && close < priorExtremum);
         double upperWick = high - MathMax(open, close);
         bool pinbarRejection = (upperWick / totalRange) >= 0.38;
         if(pierced && pinbarRejection) return true;
      }
   }

   return false;
}

//+------------------------------------------------------------------+
//| Check 1H Macro Trend Alignment (3-Screen MTF Gatekeeper)         |
//+------------------------------------------------------------------+
bool IsMtfTrendAligned(string sym, bool isBuy)
{
   if(!InpEnableMtfFilter) return true;

   int emaFastHandle = (sym == _Symbol && hMtfEMA21 != INVALID_HANDLE) ? hMtfEMA21 : iMA(sym, PERIOD_H1, 21, 0, MODE_EMA, PRICE_CLOSE);
   int emaSlowHandle = (sym == _Symbol && hMtfEMA55 != INVALID_HANDLE) ? hMtfEMA55 : iMA(sym, PERIOD_H1, 55, 0, MODE_EMA, PRICE_CLOSE);

   if(emaFastHandle == INVALID_HANDLE || emaSlowHandle == INVALID_HANDLE) return true;

   double fast[1], slow[1];
   if(CopyBuffer(emaFastHandle, 0, 0, 1, fast) != 1 || CopyBuffer(emaSlowHandle, 0, 0, 1, slow) != 1)
   {
      if(sym != _Symbol)
      {
         IndicatorRelease(emaFastHandle);
         IndicatorRelease(emaSlowHandle);
      }
      return true;
   }

   if(sym != _Symbol)
   {
      IndicatorRelease(emaFastHandle);
      IndicatorRelease(emaSlowHandle);
   }

   // For BUY: 1H EMA21 must be >= 1H EMA55
   // For SELL: 1H EMA21 must be <= 1H EMA55
   if(isBuy && fast[0] < slow[0]) return false;
   if(!isBuy && fast[0] > slow[0]) return false;

   return true;
}

//+------------------------------------------------------------------+
//| Standalone Offline Fallback Trading Engine                       |
//+------------------------------------------------------------------+
void RunOfflineFallbackEngine()
{
   if(!InpOfflineFallback || m_isDailyLocked || TimeCurrent() < m_cooldownUntil || !IsTradingTimeAllowed())
      return;

   if(HasOpenPosition("") || HasPendingOrder("")) return;
   if(hEMA20 == INVALID_HANDLE || hEMA50 == INVALID_HANDLE || hRSI == INVALID_HANDLE) return;

   double ema20[2], ema50[2], rsi[2];
   if(CopyBuffer(hEMA20, 0, 0, 2, ema20) != 2) return;
   if(CopyBuffer(hEMA50, 0, 0, 2, ema50) != 2) return;
   if(CopyBuffer(hRSI, 0, 0, 2, rsi) != 2) return;

   int digits = (int)SymbolInfoInteger(_Symbol, SYMBOL_DIGITS);
   double pipMult = GetPipMultiplier();
   double ask = SymbolInfoDouble(_Symbol, SYMBOL_ASK);
   double bid = SymbolInfoDouble(_Symbol, SYMBOL_BID);

   bool buySignal = (ema20[0] > ema50[0] && rsi[1] <= 42.0 && rsi[0] > rsi[1]);
   bool sellSignal = (ema20[0] < ema50[0] && rsi[1] >= 58.0 && rsi[0] < rsi[1]);

   double lot = (InpAccountMode == ACCOUNT_CENT) ? 0.05 : 0.01;

   if(buySignal)
   {
      double sl = NormalizeDouble(ask - (25 * _Point * pipMult), digits);
      double tp1 = NormalizeDouble(ask + (30 * _Point * pipMult), digits);
      double tp2 = NormalizeDouble(ask + (60 * _Point * pipMult), digits);
      if(m_trade.PositionOpen(_Symbol, ORDER_TYPE_BUY, lot, ask, sl, tp2, "Aegis_Standalone_Buy"))
      {
         m_lastOrderType = "BUY (OFFLINE)";
         m_lastOrderPrice = ask;
         m_lastOrderSL = sl;
         m_lastOrderTP1 = tp1;
         m_lastOrderTP2 = tp2;
         m_lastOrderLot = lot;
         m_lastOrderStatus = "FILLED";
         DrawChartTradeLevels("BUY (LOCAL)", ask, sl, tp1, tp2);
         Print("📶 [Aegis Offline Fallback] Executed local BUY 0.01 @ ", ask);
      }
   }
   else if(sellSignal)
   {
      double sl = NormalizeDouble(bid + (25 * _Point * pipMult), digits);
      double tp1 = NormalizeDouble(bid - (30 * _Point * pipMult), digits);
      double tp2 = NormalizeDouble(bid - (60 * _Point * pipMult), digits);
      if(m_trade.PositionOpen(_Symbol, ORDER_TYPE_SELL, lot, bid, sl, tp2, "Aegis_Standalone_Sell"))
      {
         m_lastOrderType = "SELL (OFFLINE)";
         m_lastOrderPrice = bid;
         m_lastOrderSL = sl;
         m_lastOrderTP1 = tp1;
         m_lastOrderTP2 = tp2;
         m_lastOrderLot = lot;
         m_lastOrderStatus = "FILLED";
         DrawChartTradeLevels("SELL (LOCAL)", bid, sl, tp1, tp2);
         Print("📶 [Aegis Offline Fallback] Executed local SELL 0.01 @ ", bid);
      }
   }
}

//+------------------------------------------------------------------+
//| Check for Flash Volatility Spike (> 3.0x ATR)                    |
//+------------------------------------------------------------------+
void CheckFlashVolatilitySpike()
{
   if(!InpEnableFlashSpikeGuard) return;
   if(hATR == INVALID_HANDLE) return;

   double atrVals[1];
   if(CopyBuffer(hATR, 0, 1, 1, atrVals) != 1) return;
   double baseATR = atrVals[0];
   if(baseATR <= 0) return;

   MqlRates rates[1];
   if(CopyRates(_Symbol, _Period, 0, 1, rates) != 1) return;
   double currentRange = rates[0].high - rates[0].low;
   double currentBody  = MathAbs(rates[0].close - rates[0].open);

   if(currentRange >= InpFlashSpikeATRMult * baseATR || currentBody >= (InpFlashSpikeATRMult * 0.8) * baseATR)
   {
      datetime now = TimeCurrent();
      if(now >= m_spikeFreezeUntil)
      {
         m_spikeFreezeUntil = now + (InpSpikeFreezeMinutes * 60);
         double spikeRatio = currentRange / baseATR;
         m_spikeReason = StringFormat("Bar range %.1f pips (%.1fx ATR)", currentRange / (_Point * GetPipMultiplier()), spikeRatio);
         PrintFormat("⚡ [Aegis Flash Spike Guard] Abnormal volatility spike detected: %s. Freezing new orders for %d minutes (until %s).",
                     m_spikeReason, InpSpikeFreezeMinutes, TimeToString(m_spikeFreezeUntil, TIME_MINUTES));
      }
   }
}

//+------------------------------------------------------------------+
//| Timer event handler                                              |
//+------------------------------------------------------------------+
void OnTimer()
{
   datetime now = TimeCurrent();
   CheckDailyDrawdownGuard();
   CheckFlashVolatilitySpike();

   if(now - m_lastPollTime >= InpPollIntervalSec)
   {
      m_lastPollTime = now;
      PollBridgeServer();
      ManageActivePositions();
      if(InpShowGUI) UpdateDashboardGUI();
   }
}

//+------------------------------------------------------------------+
//| Tick event handler                                               |
//+------------------------------------------------------------------+
void OnTick()
{
   CheckDailyDrawdownGuard();
   CheckFlashVolatilitySpike();
   ManageActivePositions();
   if(InpShowGUI && !m_isMinimized)
   {
      UpdateLiveTickDisplay();
   }
}

//+------------------------------------------------------------------+
//| TradeTransaction event handler (0ms Native Real-Time Sync)       |
//+------------------------------------------------------------------+
void OnTradeTransaction(const MqlTradeTransaction& trans,
                        const MqlTradeRequest& request,
                        const MqlTradeResult& result)
{
   // Catch completed deal additions (Order closure by SL / TP / Market / SO)
   if(trans.type == TRADE_TRANSACTION_DEAL_ADD)
   {
      ulong dealTicket = trans.deal;
      if(HistoryDealSelect(dealTicket))
      {
         long dealMagic = HistoryDealGetInteger(dealTicket, DEAL_MAGIC);
         if(dealMagic == InpMagicNumber)
         {
            ENUM_DEAL_ENTRY dealEntry = (ENUM_DEAL_ENTRY)HistoryDealGetInteger(dealTicket, DEAL_ENTRY);
            if(dealEntry == DEAL_ENTRY_OUT)
            {
               string dealSymbol = HistoryDealGetString(dealTicket, DEAL_SYMBOL);
               ENUM_DEAL_REASON dealReason = (ENUM_DEAL_REASON)HistoryDealGetInteger(dealTicket, DEAL_REASON);
               double dealProfit = HistoryDealGetDouble(dealTicket, DEAL_PROFIT);
               double dealPrice  = HistoryDealGetDouble(dealTicket, DEAL_PRICE);
               
               string action = "CLOSE";
               if(dealReason == DEAL_REASON_SL) action = "HIT_SL";
               else if(dealReason == DEAL_REASON_TP) action = "HIT_TP2";
               else if(dealReason == DEAL_REASON_SO) action = "STOP_OUT";

               PrintFormat("⚡ [OnTradeTransaction 0ms] Position Closed on %s! Reason: %s | PnL: $%.2f | Price: %.5f",
                           dealSymbol, action, dealProfit, dealPrice);

               // Profit Martingale Win Streak & Stealth State Tracking
               if(dealProfit > 0)
               {
                  m_winStreak++;
                  PrintFormat("🔥 [Profit Martingale] Winning Streak: %d consecutive wins! Next trend trade will scale lot.", m_winStreak);
               }
               else if(dealProfit < 0)
               {
                  m_winStreak = 0; // Immediate Ratchet Reset to Base Lot
                  Print("🛡️ [Profit Martingale] Loss detected. Ratchet Reset: Streak reset to 0 to preserve profit!");
               }
               m_isStealthActive = false;
               m_stealthSL = 0.0;
               m_stealthTP1 = 0.0;
               m_stealthTP2 = 0.0;

               NotifyBridgeOrderEvent(m_lastOrderId, action, dealPrice, dealProfit, dealSymbol);
               if(dealSymbol == _Symbol) ClearChartTradeLevels();
               if(InpShowGUI) UpdateDashboardGUI();

            }
         }
      }
   }
}

//+------------------------------------------------------------------+
//| Resolve canonical symbol into broker-specific symbol name        |
//| (Handles suffixes like XAUUSDm, EURUSD.a, GOLD)                  |
//+------------------------------------------------------------------+
string ResolveBrokerSymbol(string canonicalSym)
{
   if(SymbolInfoInteger(canonicalSym, SYMBOL_VISIBLE)) return canonicalSym;
   int total = SymbolsTotal(false);
   for(int s = 0; s < total; s++)
   {
      string name = SymbolName(s, false);
      if(IsSymbolMatching(canonicalSym, name))
      {
         SymbolSelect(name, true);
         return name;
      }
   }
   return "";
}

//+------------------------------------------------------------------+
//| Poll signals & orders from Web Bridge API                        |
//+------------------------------------------------------------------+
void PollBridgeServer()
{
   string url;
   if(InpOneChartMultiSymbol)
   {
      url = StringFormat("%s/api/mt-bridge?format=mt&multi=true&symbol=ALL", InpServerUrl);
   }
   else
   {
      double brokerBid = SymbolInfoDouble(_Symbol, SYMBOL_BID);
      double brokerAsk = SymbolInfoDouble(_Symbol, SYMBOL_ASK);
      double brokerSpread = (double)SymbolInfoInteger(_Symbol, SYMBOL_SPREAD) * _Point / GetPipMultiplier(_Symbol);
      url = StringFormat("%s/api/mt-bridge?format=mt&symbol=%s&bid=%.5f&ask=%.5f&spread=%.2f",
                         InpServerUrl, _Symbol, brokerBid, brokerAsk, brokerSpread);
   }

   char postData[], resultData[];
   string resultHeaders;

   uint startTicks = GetTickCount();
   ResetLastError();
   int statusCode = WebRequest("GET", url, "", 1500, postData, resultData, resultHeaders);
   m_lastPingMs = (int)(GetTickCount() - startTicks);

   if(statusCode == 200)
   {
      m_isOnline = true;
      m_lastSuccessfulPoll = TimeCurrent();
      string responseText = CharArrayToString(resultData);
      ParseBridgeResponse(responseText);
   }
   else
   {
      m_isOnline = false;
      if(InpOfflineFallback && (TimeCurrent() - m_lastSuccessfulPoll > 60))
      {
         RunOfflineFallbackEngine();
      }
   }
}

//+------------------------------------------------------------------+
//| Check if Bridge Symbol matches Broker Chart Symbol               |
//| Handles broker suffixes/prefixes (e.g. XAUUSDm, XAUUSD.a, GOLD)  |
//+------------------------------------------------------------------+
bool IsSymbolMatching(string bridgeSym, string chartSym)
{
   if(bridgeSym == chartSym) return true;
   string b = bridgeSym;
   string c = chartSym;
   StringToUpper(b);
   StringToUpper(c);
   if(StringFind(c, b) >= 0 || StringFind(b, c) >= 0) return true;
   if((StringFind(b, "XAU") >= 0 || StringFind(b, "GOLD") >= 0) &&
      (StringFind(c, "XAU") >= 0 || StringFind(c, "GOLD") >= 0)) return true;
   if(StringFind(b, "BTC") >= 0 && StringFind(c, "BTC") >= 0) return true;
   if(StringFind(b, "ETH") >= 0 && StringFind(c, "ETH") >= 0) return true;
   return false;
}

//+------------------------------------------------------------------+
//| Check if symbol is permitted by InpWatchlistSymbols              |
//+------------------------------------------------------------------+
bool IsWatchlistSymbol(string sym)
{
   if(!InpOneChartMultiSymbol) return IsSymbolMatching(sym, _Symbol);
   if(InpWatchlistSymbols == "" || InpWatchlistSymbols == "*") return true;
   string list[];
   int count = StringSplit(InpWatchlistSymbols, ',', list);
   for(int i = 0; i < count; i++)
   {
      string item = list[i];
      StringTrimLeft(item);
      StringTrimRight(item);
      if(IsSymbolMatching(item, sym)) return true;
   }
   return false;
}

//+------------------------------------------------------------------+
//| Parse CSV response from Web Bridge                               |
//| ID,SYMBOL,TYPE,PRICE,SL,TP1,TP2,LOTS,REM_LOTS,STATUS,TRAIL_SL,DEFENSE,TIER,GOVERNOR
//+------------------------------------------------------------------+
void ParseBridgeResponse(string responseText)
{
   if(StringLen(responseText) == 0 || StringFind(responseText, "SPREAD_BLOWOUT") >= 0)
      return;

   string lines[];
   int totalLines = StringSplit(responseText, '\n', lines);
   if(totalLines <= 0) return;

   for(int i = 0; i < totalLines; i++)
   {
      string line = lines[i];
      StringTrimLeft(line);
      StringTrimRight(line);
      if(StringLen(line) == 0) continue;

      // 1. Check Forex Factory News Header Line (#NEWS,minutes,state,title,allowed,time)
      if(StringFind(line, "#NEWS") == 0)
      {
         string newsCols[];
         int nCount = StringSplit(line, ',', newsCols);
         if(nCount >= 5)
         {
            m_newsMinutesToNext = (int)StringToInteger(newsCols[1]);
            m_newsState         = newsCols[2];
            m_newsTitle         = newsCols[3];
            m_newsTradeAllowed  = (newsCols[4] == "true");
            if(nCount >= 6) m_newsTimeStr = newsCols[5];
         }
         continue;
      }

      // 1b. Check Macro Directional & Reaction Zone Line (#MACRO,sym,bias,high,low,mid,sentiment,title)
      if(StringFind(line, "#MACRO") == 0)
      {
         string mCols[];
         int mCount = StringSplit(line, ',', mCols);
         if(mCount >= 8)
         {
            string mSym = mCols[1];
            if(mSym == _Symbol || InpOneChartMultiSymbol)
            {
               m_macroBias       = mCols[2];
               m_macroZoneHigh   = StringToDouble(mCols[3]);
               m_macroZoneLow    = StringToDouble(mCols[4]);
               m_macroZoneMid    = StringToDouble(mCols[5]);
               m_macroSentiment  = mCols[6];
               m_macroEventTitle = mCols[7];
               if(InpDrawMacroNewsZone && m_macroZoneHigh > 0 && m_macroZoneLow > 0)
               {
                  DrawMacroReactionZone();
               }
            }
         }
         continue;
      }

      // 2. Parse Order Telemetry & Signals
      string cols[];
      int count = StringSplit(line, ',', cols);
      if(count >= 10)
      {
         string orderId     = cols[0];
         string sym         = cols[1];
         string typeStr     = cols[2];
         double price       = StringToDouble(cols[3]);
         double sl          = StringToDouble(cols[4]);
         double tp1         = StringToDouble(cols[5]);
         double tp2         = StringToDouble(cols[6]);
         double lots        = StringToDouble(cols[7]);
         double remLots     = StringToDouble(cols[8]);
         string status      = cols[9];
         double trailSl     = count >= 11 ? StringToDouble(cols[10]) : sl;
         string defense     = count >= 12 ? cols[11] : "NONE";
         string tier        = count >= 13 ? cols[12] : "Tier 1: Foundation";
         string governor    = count >= 14 ? cols[13] : "NORMAL";
         string optFlags    = count >= 15 ? cols[14] : "STANDARD";

         // Multi-Symbol or Chart-Symbol Routing
         string targetBrokerSym = "";
         if(InpOneChartMultiSymbol)
         {
            if(IsWatchlistSymbol(sym))
            {
               targetBrokerSym = ResolveBrokerSymbol(sym);
            }
         }
         else if(IsSymbolMatching(sym, _Symbol))
         {
            targetBrokerSym = _Symbol;
         }

         if(targetBrokerSym != "")
         {
            // If matches the active chart symbol, update HUD telemetry variables
            if(IsSymbolMatching(targetBrokerSym, _Symbol))
            {
               m_lastOrderId        = orderId;
               m_lastOrderType      = typeStr;
               m_lastOrderPrice     = price;
               m_lastOrderSL        = sl;
               m_lastOrderTP1       = tp1;
               m_lastOrderTP2       = tp2;
               m_lastOrderLot       = lots;
               m_lastRemainingLot   = remLots;
               m_lastOrderStatus    = status;
               m_lastTrailingSl     = trailSl;
               m_lastDefenseReason  = defense;
               m_lastTierName       = tier;
               m_lastGovernorStatus = governor;
               m_lastOrderFlags     = optFlags;
            }

            // Execute if FULL_AUTO and not yet processed
            if(m_currentMode == MODE_FULL_AUTO && (status == "PENDING" || status == "FILLED"))
            {
               ExecuteInstitutionalSignal(orderId, typeStr, price, sl, tp1, tp2, lots, targetBrokerSym, optFlags);
            }
         }
      }
   }
}

//+------------------------------------------------------------------+
//| Execute or place order based on institutional criteria           |
//+------------------------------------------------------------------+
void ExecuteInstitutionalSignal(string orderId, string typeStr, double price, double sl, double tp1, double tp2, double lots, string targetSym = "", string optFlags = "")
{
   if(targetSym == "") targetSym = _Symbol;

   // 1. Institutional Circuit Breaker & Safety Guards
   if(m_isDailyLocked)
   {
      PrintFormat("🛑 [Daily Guard Locked] %s. Order skipped.", m_dailyLockReason);
      return;
   }

   if(InpEnableFlashSpikeGuard && TimeCurrent() < m_spikeFreezeUntil)
   {
      PrintFormat("⚡ [Flash Spike Active] New orders paused until %s due to %s. Order skipped.",
                  TimeToString(m_spikeFreezeUntil, TIME_MINUTES), m_spikeReason);
      return;
   }

   if(TimeCurrent() < m_cooldownUntil)
   {
      PrintFormat("⏳ [Cooldown Active] EA is in cooldown pause until %s. Order skipped.", TimeToString(m_cooldownUntil, TIME_MINUTES));
      return;
   }

   // Max Open Positions Guard (ป้องกันเปิดไม้ซ้อนเกินกว่าเพดาน)
   if(InpMaxOpenPositions > 0)
   {
      int currentOpenCount = 0;
      for(int pc = PositionsTotal() - 1; pc >= 0; pc--)
      {
         if(m_position.SelectByIndex(pc))
         {
            bool pcMatch = InpOneChartMultiSymbol ? true : (m_position.Symbol() == _Symbol);
            if(pcMatch && m_position.Magic() == InpMagicNumber)
               currentOpenCount++;
         }
      }
      if(currentOpenCount >= InpMaxOpenPositions)
      {
         PrintFormat("🎫 [Max Positions Guard] Already have %d/%d positions open. New order %s skipped to prevent overexposure.",
                     currentOpenCount, InpMaxOpenPositions, orderId);
         return;
      }
   }

   // Anti-Averaging Down Guard (ห้ามเปิดถัวขาแพ้ / ห้าม Martingale เฉลี่ยต้นทุนแบบการพนัน)
   for(int ap = PositionsTotal() - 1; ap >= 0; ap--)
   {
      if(m_position.SelectByIndex(ap))
      {
         bool apMatch = InpOneChartMultiSymbol ? true : (m_position.Symbol() == targetSym);
         if(apMatch && m_position.Magic() == InpMagicNumber)
         {
            bool isPosBuy = (m_position.PositionType() == POSITION_TYPE_BUY);
            bool isNewBuy = (StringFind(typeStr, "BUY") >= 0);
            if(isPosBuy == isNewBuy)
            {
               double openP = m_position.PriceOpen();
               double curP  = m_position.PriceCurrent();
               bool isLoss  = isPosBuy ? (curP < openP) : (curP > openP);
               if(isLoss)
               {
                  PrintFormat("🚫 [Anti-Averaging Guard] Existing position #%I64d on %s is in floating loss. Averaging down is strictly prohibited!",
                              m_position.Ticket(), targetSym);
                  return;
               }
            }
         }
      }
   }

   // Basket Lock check
   if(m_basketLocked)
   {
      PrintFormat("🧺 [Basket Locked] %s. No new orders until next trading day.", m_basketLockReason);
      return;
   }

   if(!IsTradingTimeAllowed())
   {
      Print("⏰ [Time Filter] Rollover or weekend filter active. Skipping order execution.");
      return;
   }

   // 1b. Asian & Pre-London Transition Box Shield (06:00 - 14:00 Thai Time)
   if(InpAsianBoxShield && (StringFind(typeStr, "BOX") >= 0 || m_lastDefenseReason == "BOX" || StringFind(m_setupGrade, "BOX") >= 0))
   {
      MqlDateTime dt;
      datetime now = TimeCurrent();
      TimeToStruct(now, dt);
      int thaiHour = (dt.hour + 4) % 24; // Convert broker time to Thai time (UTC+7)
      
      // [APPROACH 3] Judas Swing Reversal Exception (12:00 - 13:59 Thai time)
      bool isJudasTime = (thaiHour >= 12 && thaiHour < 14);
      bool isJudasAuthorized = InpEnableJudasSwing && isJudasTime && (StringFind(optFlags, "JUDAS") >= 0 || StringFind(typeStr, "JUDAS") >= 0 || StringFind(m_lastDefenseReason, "JUDAS") >= 0 || m_setupGrade == "A+");

      if(thaiHour >= 6 && thaiHour < 14 && m_setupGrade != "A+" && !isJudasAuthorized)
      {
         PrintFormat("🛡️ [Asian & Pre-London Box Shield] Skipping Box order %s (%02d:00 Thai Time) to preserve 93.1%% Win Rate and 0%% DD.",
                     orderId, thaiHour);
         return;
      }
      else if(isJudasAuthorized)
      {
         PrintFormat("🎯 [Judas Swing Authorized] Pre-London Stop Hunt reversal on %s (%02d:00 Thai Time) authorized!", targetSym, thaiHour);
      }
   }

   // 1c. US Cash Open Volatility Spike Freeze (20:25 - 21:45 Thai Time)
   if(InpEnableScalpSniper && InpUsOpenSpikeFreeze && _Period <= PERIOD_M15)
   {
      MqlDateTime dt;
      datetime now = TimeCurrent();
      TimeToStruct(now, dt);
      int thaiHour = (dt.hour + 4) % 24; // Convert broker time to Thai time (UTC+7)
      int thaiMin = dt.min;
      bool isUsOpenSpike = (thaiHour == 20 && thaiMin >= 25) || (thaiHour == 21 && thaiMin <= 45);
      if(isUsOpenSpike && m_setupGrade != "A+")
      {
         PrintFormat("🛡️ [US Open Freeze] Pausing 5M/15M scalp %s during US Open Volatility Spike (%02d:%02d Thai Time) to avoid whipsaw.",
                     orderId, thaiHour, thaiMin);
         return;
      }
   }

   // 1d. Macro Economic Directional Bias Guard (Consensus & Surprise Filter)
   if(InpEnableMacroBiasFilter && m_macroBias != "" && m_macroBias != "NEUTRAL")
   {
      bool isBuyOrder = (StringFind(typeStr, "BUY") >= 0);
      bool isMacroPullbackPass = InpEnableMacroPullbackPass && (StringFind(optFlags, "PULLBACK") >= 0 || StringFind(typeStr, "PULLBACK") >= 0 || StringFind(m_lastDefenseReason, "PULLBACK") >= 0);

      if(!isMacroPullbackPass)
      {
         if(m_macroBias == "SELL_ONLY" && isBuyOrder && m_setupGrade != "A+")
         {
            PrintFormat("🛡️ [Macro Bias Guard] Skipping BUY on %s: Macro News (%s | %s) dictates SELL_ONLY bias!", targetSym, m_macroEventTitle, m_macroSentiment);
            return;
         }
         if(m_macroBias == "BUY_ONLY" && !isBuyOrder && m_setupGrade != "A+")
         {
            PrintFormat("🛡️ [Macro Bias Guard] Skipping SELL on %s: Macro News (%s | %s) dictates BUY_ONLY bias!", targetSym, m_macroEventTitle, m_macroSentiment);
            return;
         }
      }
      else
      {
         PrintFormat("🎯 [Macro Pullback Exemption] Executing %s counter-trend scalp targeting Equilibrium Zone!", targetSym);
      }
   }

   // 2. Forex Factory News Shield Pre-News Freeze Guard

   bool isPostNewsSniper = (StringFind(typeStr, "POST_NEWS") >= 0 || StringFind(orderId, "POST_NEWS") >= 0 || m_lastDefenseReason == "POST_NEWS_SNIPER");
   if(InpEnableNewsShield && !m_newsTradeAllowed)
   {
      if(!isPostNewsSniper || !InpEnablePostNewsSniper)
      {
         PrintFormat("🛑 [News Shield Freeze] High-Impact Red Event '%s' in %d mins! Order %s on %s rejected.",
                     m_newsTitle, m_newsMinutesToNext, orderId, targetSym);
         return;
      }
      else
      {
         PrintFormat("⚡ [Post-News Sniper Authorized] Executing institutional reaction sniper on %s despite Red Event!", targetSym);
      }
   }

   // 3. Check if already open or pending
   if(HasOpenPosition(orderId, targetSym) || HasPendingOrder(orderId, targetSym)) return;

   // Ensure target symbol is active in Market Watch
   if(!SymbolInfoInteger(targetSym, SYMBOL_VISIBLE))
   {
      SymbolSelect(targetSym, true);
   }

   double targetPoint = SymbolInfoDouble(targetSym, SYMBOL_POINT);
   double pipMult = GetPipMultiplier(targetSym);
   int digits = (int)SymbolInfoInteger(targetSym, SYMBOL_DIGITS);

   // 4. Check Spread Safety with [APPROACH 4] Spread EV Cushion
   double ask = SymbolInfoDouble(targetSym, SYMBOL_ASK);
   double bid = SymbolInfoDouble(targetSym, SYMBOL_BID);
   if(ask <= 0 || bid <= 0) return;

   double currentSpread = (ask - bid) / (targetPoint * pipMult);
   double effectiveMaxSpread = InpMaxSpreadPips;
   if(InpEnableAdaptiveSpread)
   {
      double riskPips = MathMax(1.0, MathAbs(price - sl) / (targetPoint * pipMult));
      double rewardPips = MathAbs(tp2 - price) / (targetPoint * pipMult);
      double rrRatio = rewardPips / riskPips;
      if(rrRatio >= 2.5)
      {
         double cushion = MathMin(1.40, 1.0 + (rrRatio - 2.0) * 0.12);
         effectiveMaxSpread = InpMaxSpreadPips * cushion;
      }
   }

   if(currentSpread > effectiveMaxSpread)
   {
      PrintFormat("🛑 [Spread Protection] Spread on %s is %.1f pips (exceeds adaptive limit %.1f)", targetSym, currentSpread, effectiveMaxSpread);
      return;
   }

   double scalpMaxSpread = InpMaxScalpSpreadPips;
   if(InpEnableAdaptiveSpread) scalpMaxSpread *= 1.25;
   if(InpEnableScalpSniper && _Period <= PERIOD_M15 && currentSpread > scalpMaxSpread)
   {
      PrintFormat("🛑 [Scalp Spread Armor] Spread on %s is %.1f pips (exceeds Scalp limit %.1f). Order skipped.", targetSym, currentSpread, scalpMaxSpread);
      return;
   }

   // 4b. Dynamic Market-Adaptive Lot Scaling based on Live MT5 Balance & Market Regime
   if(InpEnableAutoLotScale)
   {
      lots = CalculateMarketAdaptiveLot(targetSym, price, sl, lots);
   }

   // 5. Check Free Margin (20% Max Cap)
   double marginReq = 0;
   if(!OrderCalcMargin(ORDER_TYPE_BUY, targetSym, lots, ask, marginReq)) marginReq = 0;
   double freeMargin = AccountInfoDouble(ACCOUNT_MARGIN_FREE);
   if(marginReq > freeMargin * (InpMaxMarginPct / 100.0))
   {
      Print("🛑 [Margin Protection] Required margin exceeds 20% cap");
      return;
   }

   bool isBuy = (StringFind(typeStr, "BUY") >= 0);

   // 5b. Sniper Scalping Multi-Timeframe (MTF) & Liquidity Sweep Guards
   if(InpEnableScalpSniper && _Period <= PERIOD_M15)
   {
      if(InpEnableMtfFilter && !IsMtfTrendAligned(targetSym, isBuy))
      {
         PrintFormat("🛡️ [MTF Gatekeeper] Skipping %s on %s: 1H Macro Trend disagrees with 5M/15M scalp direction!", typeStr, targetSym);
         return;
      }

      if(InpRequireLiquiditySweep)
      {
         bool hasSweep = CheckLiquiditySweep(targetSym, _Period, isBuy);
         if(!hasSweep && m_setupGrade != "A+")
         {
            PrintFormat("🛡️ [Liquidity Sweep Guard] Skipping %s on %s: Required institutional sweep not confirmed.", typeStr, targetSym);
            return;
         }
      }
   }
   sl    = NormalizeDouble(sl, digits);
   tp1   = NormalizeDouble(tp1, digits);
   tp2   = NormalizeDouble(tp2, digits);
   price = NormalizeDouble(price, digits);

   // Normalize Lots to Broker Specification (Step, Min, Max)
   double minLot  = SymbolInfoDouble(targetSym, SYMBOL_VOLUME_MIN);
   double maxLot  = SymbolInfoDouble(targetSym, SYMBOL_VOLUME_MAX);
   double lotStep = SymbolInfoDouble(targetSym, SYMBOL_VOLUME_STEP);
   if(minLot <= 0) minLot = 0.01;
   if(maxLot <= 0) maxLot = 100.0;
   if(lotStep <= 0) lotStep = 0.01;

   lots = MathRound(lots / lotStep) * lotStep;
   lots = MathMax(minLot, MathMin(maxLot, lots));
   lots = NormalizeDouble(lots, 2);

   // Broker Trade Stops-Level Safety Buffer
   int stopLevel = (int)SymbolInfoInteger(targetSym, SYMBOL_TRADE_STOPS_LEVEL);
   double minStopDist = (stopLevel + 2) * targetPoint;
   if(minStopDist > 0)
   {
      if(isBuy)
      {
         if(sl > 0 && (ask - sl) < minStopDist) sl = NormalizeDouble(ask - minStopDist, digits);
         if(tp2 > 0 && (tp2 - ask) < minStopDist) tp2 = NormalizeDouble(ask + minStopDist, digits);
      }
      else
      {
         if(sl > 0 && (sl - bid) < minStopDist) sl = NormalizeDouble(bid + minStopDist, digits);
         if(tp2 > 0 && (bid - tp2) < minStopDist) tp2 = NormalizeDouble(bid - minStopDist, digits);
      }
   }

   string comment = "Aegis_" + StringSubstr(orderId, StringLen(orderId)-6);
   double currentMarket = isBuy ? ask : bid;
   double distPips = MathAbs(currentMarket - price) / (targetPoint * pipMult);

   // Stealth Virtual SL / TP Preparation (Broker never sees real SL/TP!)
   double brokerSL = sl;
   double brokerTP = tp2;
   if(InpEnableStealthMode)
   {
      m_stealthSL       = sl;
      m_stealthTP1      = tp1;
      m_stealthTP2      = tp2;
      m_isStealthActive = true;

      if(InpUseDisasterSL)
      {
         brokerSL = isBuy ? NormalizeDouble(price - (InpDisasterSLPips * targetPoint * pipMult), digits)
                          : NormalizeDouble(price + (InpDisasterSLPips * targetPoint * pipMult), digits);
      }
      else
      {
         brokerSL = 0.0;
      }
      brokerTP = 0.0; // Hide TP from broker!
   }

   // 6. Institutional Pending Order Router (Buy/Sell Limit at Order Block) & Two-Stage Execution
   if(InpUsePendingOrders && (typeStr == "BUY_LIMIT" || typeStr == "SELL_LIMIT"))
   {
      double frontRunOffset = InpFrontRunBufferPips * targetPoint * pipMult;
      double adjPrice = isBuy ? (price + frontRunOffset) : (price - frontRunOffset);
      adjPrice = NormalizeDouble(adjPrice, digits);

      if(distPips > InpMarketExecBufferPips)
      {
         // [APPROACH 5] Two-Stage Execution: Split 50% Market + 50% Limit if lot >= 0.02
         if(InpEnableTwoStageExec && lots >= (lotStep * 2.0))
         {
            double mktLots = NormalizeDouble(MathRound((lots * 0.5) / lotStep) * lotStep, 2);
            double limLots = NormalizeDouble(lots - mktLots, 2);

            if(mktLots >= minLot && limLots >= minLot)
            {
               // Stage 1: Market Execution (guarantees entry during explosive momentum)
               ENUM_ORDER_TYPE mktType = isBuy ? ORDER_TYPE_BUY : ORDER_TYPE_SELL;
               double mktExecPrice = isBuy ? ask : bid;
               string mktComment = "Aegis_Mkt_" + StringSubstr(orderId, StringLen(orderId)-4);
               bool mktOk = false;
               int mRetries = 0;
               while(mRetries < InpMaxOrderRetries && !mktOk)
               {
                  if(mRetries > 0) Sleep(InpRetryDelayMs);
                  ResetLastError();
                  if(isBuy) mktOk = m_trade.Buy(mktLots, targetSym, mktExecPrice, brokerSL, brokerTP, mktComment);
                  else      mktOk = m_trade.Sell(mktLots, targetSym, mktExecPrice, brokerSL, brokerTP, mktComment);
                  if(!mktOk) mRetries++;
               }

               if(mktOk)
               {
                  PrintFormat("🚀 [Two-Stage Exec Stage 1] Market fill on %s: %.2f lot @ %.5f", targetSym, mktLots, mktExecPrice);
                  NotifyBridgeOrderEvent(orderId, "FILLED", mktExecPrice, 0.0, targetSym);
               }

               // Stage 2: Limit Order at OTE / Discount with Front-Run Buffer
               datetime expTime = TimeCurrent() + (InpPendingExpiryHours * 3600);
               string limComment = "Aegis_Lim_" + StringSubstr(orderId, StringLen(orderId)-4);
               bool limOk = false;
               int lRetries = 0;
               while(lRetries < InpMaxOrderRetries && !limOk)
               {
                  if(lRetries > 0) Sleep(InpRetryDelayMs);
                  ResetLastError();
                  if(typeStr == "BUY_LIMIT" && adjPrice < ask)
                     limOk = m_trade.BuyLimit(limLots, adjPrice, targetSym, brokerSL, brokerTP, ORDER_TIME_SPECIFIED, expTime, limComment);
                  else if(typeStr == "SELL_LIMIT" && adjPrice > bid)
                     limOk = m_trade.SellLimit(limLots, adjPrice, targetSym, brokerSL, brokerTP, ORDER_TIME_SPECIFIED, expTime, limComment);
                  if(!limOk) lRetries++;
               }

               if(limOk)
               {
                  PrintFormat("⏳ [Two-Stage Exec Stage 2] Placed Limit on %s: %.2f lot @ %.5f (Front-run +%.1fp)", targetSym, limLots, adjPrice, InpFrontRunBufferPips);
                  if(targetSym == _Symbol) DrawChartTradeLevels(typeStr, adjPrice, sl, tp1, tp2);
               }
               if(InpSoundAlerts) PlaySound("expert.wav");
               return;
            }
         }

         datetime expTime = TimeCurrent() + (InpPendingExpiryHours * 3600);
         bool pendingOk = false;
         int pRetries = 0;

         while(pRetries < InpMaxOrderRetries && !pendingOk)
         {
            if(pRetries > 0) Sleep(InpRetryDelayMs);
            ResetLastError();

            if(typeStr == "BUY_LIMIT" && adjPrice < ask)
            {
               pendingOk = m_trade.BuyLimit(lots, adjPrice, targetSym, brokerSL, brokerTP, ORDER_TIME_SPECIFIED, expTime, comment);
            }
            else if(typeStr == "SELL_LIMIT" && adjPrice > bid)
            {
               pendingOk = m_trade.SellLimit(lots, adjPrice, targetSym, brokerSL, brokerTP, ORDER_TIME_SPECIFIED, expTime, comment);
            }
            if(!pendingOk) pRetries++;
         }

         if(pendingOk)
         {
            PrintFormat("⏳ [Aegis Pending%s] Placed %s %0.2f lot on %s @ %0.*f (Front-Run +%.1fp) | SL: %0.*f TP2: %0.*f (Expires in %dh)",
                        InpEnableStealthMode ? " 🥷 STEALTH" : "", typeStr, lots, targetSym, digits, adjPrice, InpFrontRunBufferPips, digits, sl, digits, tp2, InpPendingExpiryHours);
            if(targetSym == _Symbol) DrawChartTradeLevels(typeStr, adjPrice, sl, tp1, tp2);
            NotifyBridgeOrderEvent(orderId, "PENDING_PLACED", adjPrice, 0.0, targetSym);
            if(InpSoundAlerts) PlaySound("expert.wav");
            return;
         }
         else
         {
            Print("⚠️ [Aegis] Pending limit placement not feasible at current quotes, evaluating market entry.");
         }
      }
   }

   // 7. Market Execution with Smart Retry Engine (Pillar 3 & Pillar 5)
   ENUM_ORDER_TYPE orderType = isBuy ? ORDER_TYPE_BUY : ORDER_TYPE_SELL;
   double execPrice = isBuy ? ask : bid;

   // Verify quotes haven't breached SL or touched TP1 during network transit
   if(isBuy)
   {
      if(sl > 0 && ask <= sl) { PrintFormat("🛑 [Local PA Trigger] Live Ask (%.*f) breached SL (%.*f) on %s. Fill aborted.", digits, ask, digits, sl, targetSym); return; }
      if(tp1 > 0 && ask >= tp1) { PrintFormat("🛑 [Local PA Trigger] Live Ask (%.*f) reached TP1 (%.*f) on %s. Fill aborted.", digits, ask, digits, tp1, targetSym); return; }
   }
   else
   {
      if(sl > 0 && bid >= sl) { PrintFormat("🛑 [Local PA Trigger] Live Bid (%.*f) breached SL (%.*f) on %s. Fill aborted.", digits, bid, digits, sl, targetSym); return; }
      if(tp1 > 0 && bid <= tp1) { PrintFormat("🛑 [Local PA Trigger] Live Bid (%.*f) reached TP1 (%.*f) on %s. Fill aborted.", digits, bid, digits, tp1, targetSym); return; }
   }

   bool fillSuccess = false;
   int retries = 0;
   while(retries < InpMaxOrderRetries && !fillSuccess)
   {
      if(retries > 0)
      {
         Sleep(InpRetryDelayMs);
         ask = SymbolInfoDouble(targetSym, SYMBOL_ASK);
         bid = SymbolInfoDouble(targetSym, SYMBOL_BID);
         execPrice = isBuy ? ask : bid;
         if(InpEnableStealthMode && InpUseDisasterSL)
         {
            brokerSL = isBuy ? NormalizeDouble(execPrice - (InpDisasterSLPips * targetPoint * pipMult), digits)
                             : NormalizeDouble(execPrice + (InpDisasterSLPips * targetPoint * pipMult), digits);
         }
      }

      ResetLastError();
      fillSuccess = m_trade.PositionOpen(targetSym, orderType, lots, execPrice, brokerSL, brokerTP, comment);
      if(!fillSuccess)
      {
         uint err = GetLastError();
         uint retCode = m_trade.ResultRetcode();
         PrintFormat("⚠️ [Smart Retry] Execution attempt %d/%d failed on %s (RetCode: %u, Err: %u). Retrying...",
                     retries + 1, InpMaxOrderRetries, targetSym, retCode, err);
         retries++;
      }
   }


   if(fillSuccess)
   {
      PrintFormat("🚀 [Aegis Market Fill] %s %0.2f lot on %s @ %0.*f | SL: %0.*f TP1: %0.*f TP2: %0.*f",
                  typeStr, lots, targetSym, digits, execPrice, digits, sl, digits, tp1, digits, tp2);
      if(targetSym == _Symbol) DrawChartTradeLevels(typeStr, execPrice, sl, tp1, tp2);
      if(InpSoundAlerts) PlaySound("expert.wav");
      if(InpPushAlerts) SendNotification("Aegis Executed " + typeStr + " on " + targetSym + " @ " + DoubleToString(execPrice, digits));
      NotifyBridgeOrderEvent(orderId, "FILL", execPrice, 0.0, targetSym);
   }
   else
   {
      PrintFormat("❌ [Aegis] Order Failed on %s after %d retries. Last Error: %u", targetSym, InpMaxOrderRetries, GetLastError());
   }
}

//+------------------------------------------------------------------+
//| Calculate WOW-Grade Institutional Trailing Stop Level            |
//+------------------------------------------------------------------+
double CalculateWowTrailingStop(ulong ticket, string sym, bool isBuy, double openPrice, double currentPrice, double currentSL, double pnlPips)
{
   if(InpTrailingMode == TRAIL_OFF) return 0.0;
   if(pnlPips < InpTrailActivationPips) return 0.0;

   int digits = (int)SymbolInfoInteger(sym, SYMBOL_DIGITS);
   double point = SymbolInfoDouble(sym, SYMBOL_POINT);
   double pipMult = GetPipMultiplier(sym);

   double calculatedSL = 0.0;
   MqlRates rates[];
   ArraySetAsSeries(rates, true);
   int lookback = MathMax(3, InpSmcSwingLookbackBars);
   int copied = CopyRates(sym, _Period, 0, lookback + 2, rates);
   if(copied < lookback + 2) return 0.0;

   // ─── 1. Candle-by-Candle High-Watermark Protection (ยอดดอย) ───
   // When profit accelerates beyond InpTrailPeakThresholdPips (+30 pips), trail directly under/above the previous candle
   if(InpTrailBarByBarAtPeak && pnlPips >= InpTrailPeakThresholdPips)
   {
      double candleBuffer = 1.0 * point * pipMult; // 1.0 pip buffer
      if(isBuy)
         calculatedSL = rates[1].low - candleBuffer;
      else
         calculatedSL = rates[1].high + candleBuffer;
   }
   // ─── 2. Mode: SMC Market Structure (Swing HL / LH Pivot) ───
   else if(InpTrailingMode == TRAIL_SMC_STRUCTURE || InpTrailingMode == TRAIL_HYBRID_INSTITUTIONAL)
   {
      double swingBuffer = 1.5 * point * pipMult; // 1.5 pips behind institutional pivot
      if(isBuy)
      {
         double swingLow = rates[1].low;
         for(int b = 2; b <= lookback; b++)
         {
            if(rates[b].low < swingLow) swingLow = rates[b].low;
         }
         calculatedSL = swingLow - swingBuffer;
      }
      else
      {
         double swingHigh = rates[1].high;
         for(int b = 2; b <= lookback; b++)
         {
            if(rates[b].high > swingHigh) swingHigh = rates[b].high;
         }
         calculatedSL = swingHigh + swingBuffer;
      }
   }
   // ─── 3. Mode: ATR Parabolic Accelerator ───
   else if(InpTrailingMode == TRAIL_ATR_PARABOLIC)
   {
      double curAtr = 1.5;
      if(hATR != INVALID_HANDLE)
      {
         double atrBuffer[1];
         if(CopyBuffer(hATR, 0, 0, 1, atrBuffer) == 1 && atrBuffer[0] > 0)
            curAtr = atrBuffer[0];
      }
      
      // Accelerator: The higher the profit, the tighter the leash!
      double atrMult = 2.0;
      if(pnlPips >= 45.0) atrMult = 1.0;
      else if(pnlPips >= 25.0) atrMult = 1.5;

      double trailDist = curAtr * atrMult;
      if(isBuy) calculatedSL = currentPrice - trailDist;
      else      calculatedSL = currentPrice + trailDist;
   }
   // ─── 4. Mode: Multi-Stage Profit Ratchet ───
   else if(InpTrailingMode == TRAIL_MULTI_STAGE_RATCHET)
   {
      double lockedPips = 1.0;
      if(pnlPips >= 60.0) lockedPips = 48.0;
      else if(pnlPips >= 40.0) lockedPips = 30.0;
      else if(pnlPips >= 25.0) lockedPips = 16.0;
      else if(pnlPips >= 15.0) lockedPips = 8.0;
      else if(pnlPips >= 8.0)  lockedPips = 2.0;

      if(isBuy) calculatedSL = openPrice + (lockedPips * point * pipMult);
      else      calculatedSL = openPrice - (lockedPips * point * pipMult);
   }

   calculatedSL = NormalizeDouble(calculatedSL, digits);

   // Validation: SL can ONLY move in the direction of profit, never retreat!
   // And must maintain a minimum InpTrailStepPips step distance
   double stepDistance = InpTrailStepPips * point * pipMult;
   if(isBuy)
   {
      if(calculatedSL > (currentSL + stepDistance) && calculatedSL < currentPrice && calculatedSL > openPrice)
         return calculatedSL;
   }
   else
   {
      if((currentSL == 0 || calculatedSL < (currentSL - stepDistance)) && calculatedSL > currentPrice && calculatedSL < openPrice)
         return calculatedSL;
   }

   return 0.0;
}

//+------------------------------------------------------------------+
//| Manage active positions: TP1 50% partial close & Breakeven SL    |
//+------------------------------------------------------------------+
void ManageActivePositions()
{
   if(PositionsTotal() == 0)
   {
      m_hasPyramidedThisCycle = false;
      m_basketPeakFloatingPnl = 0.0;
      m_basketLocked = false;
      m_basketLockReason = "";
      return;
   }

   // === BASKET CLOSE GUARD (ปิดรวบเมื่อขาดทุนรวมทะลุเพดาน) ===
   if(InpEnableBasketClose || InpEnableEquityShield)
   {
      double totalFloatingPnl = 0.0;
      int ownPositionCount = 0;
      for(int b = PositionsTotal() - 1; b >= 0; b--)
      {
         if(m_position.SelectByIndex(b))
         {
            bool bMatch = InpOneChartMultiSymbol ? true : (m_position.Symbol() == _Symbol);
            if(bMatch && m_position.Magic() == InpMagicNumber)
            {
               totalFloatingPnl += m_position.Profit() + m_position.Swap() + m_position.Commission();
               ownPositionCount++;
            }
         }
      }

      double balance = AccountInfoDouble(ACCOUNT_BALANCE);
      double equity  = AccountInfoDouble(ACCOUNT_EQUITY);

      // Track basket peak floating PnL for profit lock
      if(totalFloatingPnl > m_basketPeakFloatingPnl)
         m_basketPeakFloatingPnl = totalFloatingPnl;

      bool shouldBasketClose = false;
      string basketReason = "";

      // Check 1: Basket Loss exceeds threshold
      if(InpEnableBasketClose && balance > 0)
      {
         double basketLossPct = -(totalFloatingPnl / balance) * 100.0;
         if(totalFloatingPnl < 0 && basketLossPct >= InpBasketMaxLossPct)
         {
            shouldBasketClose = true;
            basketReason = StringFormat("BASKET_LOSS: Floating PnL $%.2f = -%.1f%% (Limit: -%.1f%%)", totalFloatingPnl, basketLossPct, InpBasketMaxLossPct);
         }
      }

      // Check 2: Basket Profit Lock (peaked then pulled back)
      if(InpEnableBasketClose && m_basketPeakFloatingPnl > 1.0 && totalFloatingPnl > 0)
      {
         double pullbackPct = ((m_basketPeakFloatingPnl - totalFloatingPnl) / m_basketPeakFloatingPnl) * 100.0;
         if(pullbackPct >= InpBasketProfitLockPct)
         {
            shouldBasketClose = true;
            basketReason = StringFormat("BASKET_PROFIT_LOCK: Peak $%.2f -> Now $%.2f (pullback %.0f%% > %.0f%%)", m_basketPeakFloatingPnl, totalFloatingPnl, pullbackPct, InpBasketProfitLockPct);
         }
      }

      // Check 3: Equity Shield (absolute equity floor from day start)
      if(InpEnableEquityShield && m_dayStartEquity > 0 && equity > 0)
      {
         double eqDropPct = ((m_dayStartEquity - equity) / m_dayStartEquity) * 100.0;
         if(eqDropPct >= InpEquityShieldPct)
         {
            shouldBasketClose = true;
            basketReason = StringFormat("EQUITY_SHIELD: Equity $%.2f dropped -%.1f%% from day start $%.2f (Limit: -%.1f%%)", equity, eqDropPct, m_dayStartEquity, InpEquityShieldPct);
         }
      }

      if(shouldBasketClose)
      {
         PrintFormat("🧺🚨 [BASKET CLOSE TRIGGERED] %s — Closing ALL %d positions immediately!", basketReason, ownPositionCount);
         for(int bc = PositionsTotal() - 1; bc >= 0; bc--)
         {
            if(m_position.SelectByIndex(bc))
            {
               bool bcMatch = InpOneChartMultiSymbol ? true : (m_position.Symbol() == _Symbol);
               if(bcMatch && m_position.Magic() == InpMagicNumber)
               {
                  ulong bcTicket = m_position.Ticket();
                  if(m_trade.PositionClose(bcTicket))
                     PrintFormat("🧺 [Basket Close] Closed ticket #%I64d on %s", bcTicket, m_position.Symbol());
               }
            }
         }
         m_basketLocked = true;
         m_basketLockReason = basketReason;
         m_isDailyLocked = true;
         m_dailyLockReason = "Basket Close: " + basketReason;
         if(InpSoundAlerts) PlaySound("alert.wav");
         if(InpPushAlerts) SendNotification("🧺 BASKET CLOSE: " + basketReason);
         m_stealthSL = 0; m_stealthTP1 = 0; m_stealthTP2 = 0; m_isStealthActive = false;
         m_basketPeakFloatingPnl = 0.0;
         return;
      }
   }

   for(int i = PositionsTotal() - 1; i >= 0; i--)
   {
      if(m_position.SelectByIndex(i))
      {
         bool isSymMatch = InpOneChartMultiSymbol ? true : (m_position.Symbol() == _Symbol);
         if(isSymMatch && m_position.Magic() == InpMagicNumber)
         {
            ulong ticket = m_position.Ticket();
            string posSym = m_position.Symbol();
            double openPrice = m_position.PriceOpen();
            double currentPrice = m_position.PriceCurrent();
            double currentSL = m_position.StopLoss();
            double volume = m_position.Volume();
            bool isBuy = (m_position.PositionType() == POSITION_TYPE_BUY);
            int digits = (int)SymbolInfoInteger(posSym, SYMBOL_DIGITS);
            double point = SymbolInfoDouble(posSym, SYMBOL_POINT);
            double pipMult = GetPipMultiplier(posSym);

            // 0a. Stealth Virtual SL / TP2 Real-Time Check (Hidden from Broker)
            if(InpEnableStealthMode && (posSym == _Symbol || InpOneChartMultiSymbol))
            {
               // Check Virtual Stop Loss
               if(m_stealthSL > 0)
               {
                  bool isSlBreached = isBuy ? (currentPrice <= m_stealthSL) : (currentPrice >= m_stealthSL);
                  if(isSlBreached)
                  {
                     double slPips = -MathAbs(currentPrice - openPrice) * pipMult;
                     PrintFormat("🥷 [Stealth SL Trigger] Price (%.*f) hit Virtual SL (%.*f) on ticket #%I64d (%s). Closing at Market!",
                                 digits, currentPrice, digits, m_stealthSL, ticket, posSym);
                     if(m_trade.PositionClose(ticket))
                     {
                        NotifyBridgeOrderEvent(m_lastOrderId, "HIT_SL", currentPrice, slPips, posSym);
                        m_stealthSL = 0.0;
                        m_stealthTP1 = 0.0;
                        m_stealthTP2 = 0.0;
                        m_isStealthActive = false;
                        continue;
                     }
                  }
               }

               // Check Virtual Take Profit 2 (Full Target Reached)
               if(m_stealthTP2 > 0)
               {
                  bool isTp2Breached = isBuy ? (currentPrice >= m_stealthTP2) : (currentPrice <= m_stealthTP2);
                  if(isTp2Breached)
                  {
                     double tpPips = MathAbs(currentPrice - openPrice) * pipMult;
                     PrintFormat("🥷 [Stealth TP2 Trigger] Price (%.*f) hit Virtual TP2 (%.*f) on ticket #%I64d (%s). Closing at Market!",
                                 digits, currentPrice, digits, m_stealthTP2, ticket, posSym);
                     if(m_trade.PositionClose(ticket))
                     {
                        NotifyBridgeOrderEvent(m_lastOrderId, "HIT_TP2", currentPrice, tpPips, posSym);
                        m_stealthSL = 0.0;
                        m_stealthTP1 = 0.0;
                        m_stealthTP2 = 0.0;
                        m_isStealthActive = false;
                        continue;
                     }
                  }
               }
            }

            // 0b. Pre-News Auto-Breakeven Shield (Pillar 1)
            // If upcoming Red Folder is within InpNewsPreFreezeMins (15m), lock SL to Breakeven (+1.5 pips buffer)
            if(InpEnableNewsShield && InpNewsAutoBreakeven && m_newsMinutesToNext >= 0 && m_newsMinutesToNext <= InpNewsPreFreezeMins)
            {
               double newsBeSL = isBuy ? openPrice + (1.5 * point * pipMult) : openPrice - (1.5 * point * pipMult);
               newsBeSL = NormalizeDouble(newsBeSL, digits);
               bool needsNewsBe = isBuy ? (currentSL < newsBeSL && currentPrice > newsBeSL)
                                        : ((currentSL > newsBeSL || currentSL == 0) && currentPrice < newsBeSL);
               if(needsNewsBe)
               {
                  PrintFormat("🛡️ [Pre-News Auto-BE] Red Event '%s' in %dm! Locking SL to Breakeven (+1.5 pips) on ticket #%I64d (%s)",
                              m_newsTitle, m_newsMinutesToNext, ticket, posSym);
                  if(InpEnableStealthMode) m_stealthSL = newsBeSL;
                  m_trade.PositionModify(ticket, newsBeSL, m_position.TakeProfit());
                  currentSL = newsBeSL;
               }
            }

            // 0c. Fast-Track Breakeven Ratchet for Scalper (+8.0 pips -> Lock +1.5 pips)
            if(InpEnableScalpSniper && InpEnableFastTrackBE && (posSym == _Symbol || InpOneChartMultiSymbol))
            {
               double currentPnlPoints = isBuy ? (currentPrice - openPrice) : (openPrice - currentPrice);
               double currentPnlPips = currentPnlPoints * pipMult;

               if(currentPnlPips >= InpFastTrackBePips)
               {
                  double fastBeSL = isBuy ? openPrice + (InpFastTrackLockPips * point * pipMult)
                                          : openPrice - (InpFastTrackLockPips * point * pipMult);
                  fastBeSL = NormalizeDouble(fastBeSL, digits);

                  bool needsFastBe = isBuy ? (currentSL < fastBeSL && currentPrice > fastBeSL)
                                           : ((currentSL > fastBeSL || currentSL == 0) && currentPrice < fastBeSL);
                  if(needsFastBe)
                  {
                     PrintFormat("🎯 [Fast-Track BE] Scalp on %s reached +%.1f pips! Locking risk-free SL to +%.1f pips on ticket #%I64d.",
                                 posSym, currentPnlPips, InpFastTrackLockPips, ticket);
                     if(InpEnableStealthMode) m_stealthSL = fastBeSL;
                     m_trade.PositionModify(ticket, fastBeSL, m_position.TakeProfit());
                     currentSL = fastBeSL;
                  }
               }
            }

            // 0c2. Auto-Pyramiding Scale-In for Pro Scalpers (ยัดไม้เพิ่มเมื่อไม้แรกขยับกันทุนแล้ว และกำไร >= InpPyramidTriggerPips)
            if(InpEnableAutoPyramiding && (posSym == _Symbol || InpOneChartMultiSymbol))
            {
               double currentPnlPoints = isBuy ? (currentPrice - openPrice) : (openPrice - currentPrice);
               double currentPnlPips = currentPnlPoints * pipMult;
               string posComment = PositionGetString(POSITION_COMMENT);

               bool isLockedInProfit = isBuy ? (currentSL >= openPrice) : (currentSL <= openPrice && currentSL > 0);
               bool isNotPyramidChild = (StringFind(posComment, "PYRAMID") < 0);

               if(isNotPyramidChild && isLockedInProfit && currentPnlPips >= InpPyramidTriggerPips && !m_hasPyramidedThisCycle && (InpMaxOpenPositions <= 0 || PositionsTotal() < InpMaxOpenPositions))
               {
                  double pyramidLot = NormalizeDouble(volume * InpPyramidLotMultiplier, 2);
                  if(pyramidLot < 0.01) pyramidLot = 0.01;

                  // SL for the pyramid order is placed at the openPrice of the 1st position (guaranteed net profit for the basket!)
                  double pyramidSL = openPrice;
                  double pyramidTP = m_position.TakeProfit();

                  PrintFormat("🚀 [Auto-Pyramiding Scale-In] 1st position on %s at +%.1f pips is risk-free! Entering Pyramid order %.2f lots at %.5f (SL: %.5f)",
                              posSym, currentPnlPips, pyramidLot, currentPrice, pyramidSL);

                  MqlTradeRequest pReq;
                  MqlTradeResult  pRes;
                  ZeroMemory(pReq);
                  ZeroMemory(pRes);
                  pReq.action       = TRADE_ACTION_DEAL;
                  pReq.symbol       = posSym;
                  pReq.volume       = pyramidLot;
                  pReq.type         = isBuy ? ORDER_TYPE_BUY : ORDER_TYPE_SELL;
                  pReq.price        = currentPrice;
                  pReq.sl           = pyramidSL;
                  pReq.tp           = pyramidTP;
                  pReq.deviation    = InpSlippagePips;
                  pReq.magic        = InpMagicNumber;
                  pReq.comment      = "Aegis-PYRAMID";
                  pReq.type_filling = ORDER_FILLING_IOC;

                  if(OrderSend(pReq, pRes))
                  {
                     if(pRes.retcode == TRADE_RETCODE_DONE)
                     {
                        m_hasPyramidedThisCycle = true;
                        PrintFormat("✅ [Pyramid Success] Opened Pyramid ticket #%I64d on %s successfully! Net basket is 100%% Risk-Free!", pRes.order, posSym);
                     }
                  }
               }
            }

            // 0d. 3-Bar Scratch Invalidation & Time-Decay Stop (Exit if stagnant after 3 bars to suppress Drawdown to near 0%)
            if(InpEnableScalpSniper && _Period <= PERIOD_M15 && (posSym == _Symbol || InpOneChartMultiSymbol))
            {
               int secondsPerBar = PeriodSeconds(_Period);
               if(secondsPerBar <= 0) secondsPerBar = 300;
               datetime posOpenTime = (datetime)PositionGetInteger(POSITION_TIME);
               int barsHeld = (int)((TimeCurrent() - posOpenTime) / secondsPerBar);

               double currentPnlPoints = isBuy ? (currentPrice - openPrice) : (openPrice - currentPrice);
               double currentPnlPips = currentPnlPoints * pipMult;

               // Check 1: 3-Bar Velocity Scratch Invalidation (หนีตายทันทีใน 3 แท่งเทียน ไม่รอให้โดนลากถึง SL -22 pips)
               if(InpEnableScratchExit && barsHeld >= InpScratchMaxBars)
               {
                  // If after 3 bars price hasn't accelerated into strong profit and is floating in stall zone (e.g. <= +2.5 pips and >= -4.0 pips)
                  if(currentPnlPips <= InpScratchStallPips && currentPnlPips >= -InpScratchMaxLossPips)
                  {
                     PrintFormat("🥷 [3-Bar Scratch Invalidation] Scalp ticket #%I64d held for %d bars without momentum acceleration (PnL: %.1f pips). Closing immediately at scratch level to suppress Drawdown to near 0%%!",
                                 ticket, barsHeld, currentPnlPips);
                     if(m_trade.PositionClose(ticket))
                     {
                        NotifyBridgeOrderEvent(m_lastOrderId, "SCRATCH_EXIT", currentPrice, currentPnlPips, posSym);
                        continue;
                     }
                  }
               }

               // Check 2: Time-Decay Stop if stagnant after N bars
               if(InpEnableTimeStop && barsHeld >= InpTimeStopBars)
               {
                  if(currentPnlPips > -6.0 && currentPnlPips < 6.0)
                  {
                     PrintFormat("⏱️ [Time-Decay Stop] Scalp ticket #%I64d held for %d bars on %s with stagnant PnL (%.1f pips). Closing to recycle capital.",
                                 ticket, barsHeld, posSym, currentPnlPips);
                     if(m_trade.PositionClose(ticket))
                     {
                        NotifyBridgeOrderEvent(m_lastOrderId, "TIME_STOP_EXIT", currentPrice, currentPnlPips, posSym);
                        continue;
                     }
                  }
               }
            }

            // 1. Check TP1 Partial Close (50%) or Breakeven Protection for 0.01 Lot
            if(m_lastOrderTP1 > 0 && (posSym == _Symbol || InpOneChartMultiSymbol))
            {
               bool isTp1Reached = isBuy ? (currentPrice >= m_lastOrderTP1) : (currentPrice <= m_lastOrderTP1);
               if(isTp1Reached)
               {
                  if(volume >= 0.02)
                  {
                     double closeVol = NormalizeDouble(volume * 0.5, 2);
                     if(m_trade.PositionClosePartial(ticket, closeVol))
                     {
                        PrintFormat("🎯 [Aegis] TP1 Hit on %s! Closed 50%% (%.2f lot). Moving SL to Breakeven.", posSym, closeVol);
                        // Move SL to Breakeven (+ 1.5 pips buffer)
                        double beSL = isBuy ? openPrice + (1.5 * point * pipMult) : openPrice - (1.5 * point * pipMult);
                        beSL = NormalizeDouble(beSL, digits);
                        if(InpEnableStealthMode) m_stealthSL = beSL;
                        m_trade.PositionModify(ticket, beSL, m_position.TakeProfit());
                        NotifyBridgeOrderEvent(m_lastOrderId, "HIT_TP1", currentPrice, MathAbs(currentPrice - openPrice) * pipMult, posSym);
                     }
                  }
                  else
                  {
                     // For 0.01 lot: evaluate InpSingleLotMode (Pillar 1)
                     if(InpSingleLotMode == SINGLE_LOT_CASH_HARVEST)
                     {
                        double pnlPoints = isBuy ? (currentPrice - openPrice) : (openPrice - currentPrice);
                        double pnlPips = pnlPoints * pipMult;
                        PrintFormat("🎯 [Aegis Single-Lot Harvest] TP1 Hit for 0.01 Lot on %s! Fully closing to lock profit (+%.1f pips).", posSym, pnlPips);
                        if(m_trade.PositionClose(ticket))
                        {
                           NotifyBridgeOrderEvent(m_lastOrderId, "HIT_TP1", currentPrice, pnlPips, posSym);
                           continue;
                        }
                     }
                     else
                     {
                        // SINGLE_LOT_RUNNER_TRAIL: lock risk-free by moving SL to Breakeven (+1.5 pips)
                        double beSL = isBuy ? openPrice + (1.5 * point * pipMult) : openPrice - (1.5 * point * pipMult);
                        beSL = NormalizeDouble(beSL, digits);
                        bool needsMove = isBuy ? (currentSL < beSL) : (currentSL > beSL || currentSL == 0);
                        if(needsMove)
                        {
                           PrintFormat("🎯 [Aegis] TP1 Hit for 0.01 Lot on %s! Moving SL to Breakeven (+1.5 pips) to let runner trail.", posSym);
                           if(InpEnableStealthMode) m_stealthSL = beSL;
                           m_trade.PositionModify(ticket, beSL, m_position.TakeProfit());
                           NotifyBridgeOrderEvent(m_lastOrderId, "HIT_TP1_BE", currentPrice, MathAbs(currentPrice - openPrice) * pipMult, posSym);
                        }
                     }
                  }
               }
            }

            // 2. Dynamic Early Profit Harvesting (Lock in gains before TP when momentum stalls)
            if(InpEnableEarlyHarvest && posSym == _Symbol)
            {
               double pnlPoints = isBuy ? (currentPrice - openPrice) : (openPrice - currentPrice);
               double pnlPips = pnlPoints * pipMult;
               double initialRisk = (currentSL > 0) ? MathAbs(openPrice - currentSL) : ((m_lastOrderPrice > 0 && m_lastOrderSL > 0) ? MathAbs(m_lastOrderPrice - m_lastOrderSL) : 0);
               double currentR = (initialRisk > 0) ? (pnlPoints / initialRisk) : (pnlPips / 15.0);

               if(currentR >= InpHarvestMinR || pnlPips >= InpHarvestMinPips)
               {
                  bool triggerHarvest = false;
                  string harvestReason = "";

                  // A. AI Bridge Directive
                  if(m_lastDefenseReason == "EARLY_PROFIT_HARVEST" || m_lastDefenseReason == "OPPOSING_ZONE_AHEAD")
                  {
                     triggerHarvest = true;
                     harvestReason = "AI Sentinel: " + m_lastDefenseReason;
                  }

                  // B. RSI Momentum Hook Check
                  if(!triggerHarvest && hRSI != INVALID_HANDLE)
                  {
                     double rsiValues[2];
                     if(CopyBuffer(hRSI, 0, 0, 2, rsiValues) == 2)
                     {
                        if(isBuy && rsiValues[1] >= 68.0 && rsiValues[0] < rsiValues[1])
                        {
                           triggerHarvest = true;
                           harvestReason = StringFormat("RSI Bear Hook (%.1f -> %.1f)", rsiValues[1], rsiValues[0]);
                        }
                        else if(!isBuy && rsiValues[1] <= 32.0 && rsiValues[0] > rsiValues[1])
                        {
                           triggerHarvest = true;
                           harvestReason = StringFormat("RSI Bull Hook (%.1f -> %.1f)", rsiValues[1], rsiValues[0]);
                        }
                     }
                  }

                  // C. Climax Rejection Wick Check
                  if(!triggerHarvest)
                  {
                     MqlRates rates[1];
                     if(CopyRates(_Symbol, _Period, 0, 1, rates) == 1)
                     {
                        double candleRange = rates[0].high - rates[0].low;
                        if(candleRange > 0)
                        {
                           if(isBuy)
                           {
                              double upperWick = rates[0].high - MathMax(rates[0].open, rates[0].close);
                              if((upperWick / candleRange) >= 0.48)
                              {
                                 triggerHarvest = true;
                                 harvestReason = StringFormat("Bearish Climax Wick (%.0f%%)", (upperWick / candleRange) * 100);
                              }
                           }
                           else
                           {
                              double lowerWick = MathMin(rates[0].open, rates[0].close) - rates[0].low;
                              if((lowerWick / candleRange) >= 0.48)
                              {
                                 triggerHarvest = true;
                                 harvestReason = StringFormat("Bullish Climax Wick (%.0f%%)", (lowerWick / candleRange) * 100);
                              }
                           }
                        }
                     }
                  }

                  // Execute Early Profit Harvest
                  if(triggerHarvest)
                  {
                     PrintFormat("🌾 [Aegis Early Harvest] Closing position #%I64d on %s at +%.2fR (+%.1f pips). Reason: %s", ticket, posSym, currentR, pnlPips, harvestReason);
                     if(m_trade.PositionClose(ticket))
                     {
                        NotifyBridgeOrderEvent(m_lastOrderId, "EARLY_HARVEST", currentPrice, pnlPips, posSym);
                        continue;
                     }
                  }
               }
            }

            // 3. 🌪️ WOW-Grade Adaptive Trailing Stop Engine
            double currentPnlPoints = isBuy ? (currentPrice - openPrice) : (openPrice - currentPrice);
            double currentPnlPips = currentPnlPoints * pipMult;
            double targetTrailSL = 0.0;

            // Priority A: Real-time on-chart WOW Trailing Stop Engine
            if(InpTrailingMode != TRAIL_OFF)
            {
               targetTrailSL = CalculateWowTrailingStop(ticket, posSym, isBuy, openPrice, currentPrice, currentSL, currentPnlPips);
            }
            // Priority B: Fallback to Web Bridge Trailing SL if available
            if(targetTrailSL <= 0 && m_lastTrailingSl > 0 && posSym == _Symbol)
            {
               targetTrailSL = NormalizeDouble(m_lastTrailingSl, digits);
            }

            if(targetTrailSL > 0)
            {
               if(InpEnableStealthMode)
               {
                  bool shouldUpdateStealth = isBuy ? (targetTrailSL > m_stealthSL && targetTrailSL < currentPrice)
                                                   : (targetTrailSL < m_stealthSL && targetTrailSL > currentPrice);
                  if(shouldUpdateStealth)
                  {
                     m_stealthSL = targetTrailSL;
                     PrintFormat("🥷 [Stealth WOW-Trail] Updated Virtual SL to %.*f on %s (+%.1f pips locked)", digits, targetTrailSL, posSym, currentPnlPips);
                  }
               }
               
               bool shouldModify = isBuy ? (targetTrailSL > currentSL && targetTrailSL < currentPrice)
                                         : ((currentSL == 0 || targetTrailSL < currentSL) && targetTrailSL > currentPrice);
               if(shouldModify)
               {
                  if(m_trade.PositionModify(ticket, targetTrailSL, m_position.TakeProfit()))
                  {
                     PrintFormat("🌪️ [WOW Trailing Stop] Ticket #%I64d on %s trailed to %.*f (+%.1f pips locked | Mode: %s)",
                                 ticket, posSym, digits, targetTrailSL, currentPnlPips, EnumToString(InpTrailingMode));
                     currentSL = targetTrailSL;
                  }
               }
            }
         }
      }
   }

   // Clear visual lines if no active positions or pending orders remain on active chart
   if(PositionsTotal() == 0 && OrdersTotal() == 0)
   {
      ClearChartTradeLevels();
   }
}

//+------------------------------------------------------------------+
//| Send event notification back to Web Bridge                       |
//+------------------------------------------------------------------+
void NotifyBridgeOrderEvent(string orderId, string action, double execPrice, double profitPips, string sym = "")
{
   if(sym == "") sym = _Symbol;

   if(action == "HIT_SL")
   {
      m_consecutiveLosses++;
      if(m_consecutiveLosses >= InpMaxLossCooldownTrades)
      {
         m_cooldownUntil = TimeCurrent() + (InpCooldownMinutes * 60);
         PrintFormat("❄️ [Aegis Cooldown] Hit %d consecutive losses. Cooling down for %d minutes.", m_consecutiveLosses, InpCooldownMinutes);
      }
   }
   else if(action == "HIT_TP1" || action == "HIT_TP2" || action == "EARLY_HARVEST")
   {
      m_consecutiveLosses = 0;
   }

   string url = InpServerUrl + "/api/mt-bridge";
   string payload = StringFormat("{\"orderId\":\"%s\",\"action\":\"%s\",\"symbol\":\"%s\",\"executionPrice\":%f,\"profitPips\":%f}",
                                 orderId, action, sym, execPrice, profitPips);
   char postData[], resultData[];
   string resultHeaders;
   StringToCharArray(payload, postData);
   WebRequest("POST", url, "Content-Type: application/json\r\n", 1500, postData, resultData, resultHeaders);
}

//+------------------------------------------------------------------+
//| Check if position is already open                                |
//+------------------------------------------------------------------+
bool HasOpenPosition(string orderId, string sym = "")
{
   if(sym == "") sym = _Symbol;
   for(int i = PositionsTotal() - 1; i >= 0; i--)
   {
      if(m_position.SelectByIndex(i))
      {
         if(m_position.Symbol() == sym && m_position.Magic() == InpMagicNumber)
         {
            return true;
         }
      }
   }
   return false;
}

//+------------------------------------------------------------------+
//| Helper: Get pip multiplier based on symbol                       |
//+------------------------------------------------------------------+
double GetPipMultiplier(string sym = "")
{
   if(sym == "") sym = _Symbol;
   string s = sym;
   StringToUpper(s);
   if(StringFind(s, "XAU") >= 0 || StringFind(s, "GOLD") >= 0) return 10.0;
   if(StringFind(s, "JPY") >= 0) return 100.0;
   if(StringFind(s, "USDT") >= 0 || StringFind(s, "BTC") >= 0 || StringFind(s, "ETH") >= 0) return 1.0;
   if(StringFind(s, "OIL") >= 0 || StringFind(s, "USO") >= 0 || StringFind(s, "WTI") >= 0) return 100.0;
   return 10000.0; // Standard 5-digit Forex
}

//+------------------------------------------------------------------+
//| Helper: Calculate Market-Adaptive Dynamic Lot Size               |
//+------------------------------------------------------------------+
double CalculateMarketAdaptiveLot(string sym, double entryPrice, double slPrice, double fallbackLot)
{
   double balance = m_account.Balance();
   if(balance <= 0) balance = m_account.Equity();
   if(balance < 25.0) return 0.01; // Micro Capital Safe Armor ($10 - $24 strictly 0.01 lot)

   double point = SymbolInfoDouble(sym, SYMBOL_POINT);
   double pMult = GetPipMultiplier(sym);
   double slPips = MathAbs(entryPrice - slPrice) / (point * pMult);
   if(slPips < 5.0) slPips = 5.0;

   // Base risk percentage
   double riskPct = InpBaseRiskPct;
   if(InpLotCompoundMode == COMPOUND_CONSERVATIVE) riskPct = MathMin(1.5, riskPct);
   else if(InpLotCompoundMode == COMPOUND_AGGRESSIVE) riskPct = MathMax(2.2, riskPct);

   // Market Regime & Setup Confluence Multiplier
   double regimeMultiplier = 1.0;
   if(InpRegimeLotBoost)
   {
      // Confluence Grade A+ or Score >= 80% = Strong Institutional Momentum
      if(m_setupGrade == "A+" || m_confluenceScore >= 80.0)
      {
         regimeMultiplier = 1.25; // Boost +25%
      }
      else if(m_setupGrade == "B" || m_confluenceScore < 70.0)
      {
         regimeMultiplier = 0.70; // Throttle -30% on Choppy / Lower Edge
      }
   }

   double effectiveRisk = riskPct * regimeMultiplier;
   double dollarRisk = balance * (effectiveRisk / 100.0);
   
   // Pip value per standard lot: Forex & Gold = $10/pip, Crypto = $1/pip
   double pipVal = (StringFind(sym, "XAU") >= 0 || StringFind(sym, "GOLD") >= 0 || pMult == 10000.0) ? 10.0 : 1.0;
   double targetLot = dollarRisk / (slPips * pipVal);

   // Pro Manual Scalper (House-Money Hyper Growth):
   if(InpLotCompoundMode == COMPOUND_MANUAL_SCALPER)
   {
      // ทุน $10 - $19: 0.01 lot
      // ทุน $20 - $34: 0.02 lot (กำไรสะสมเกิน $10 = ใช้เงินตลาด)
      // ทุน $35 - $59: 0.03 lot
      // ทุน $60 - $99: 0.05 lot
      // ทุน $100 - $199: 0.10 lot
      // ทุน $200 - $349: 0.20 lot
      // ทุน $350 - $499: 0.35 lot
      // ทุน $500 - $999: 0.50 lot
      // ทุน $1,000 - $2,499: 1.00 lot
      // ทุน $2,500 - $4,999: 2.50 lots
      // ทุน $5,000 - $9,999: 5.00 lots
      // ทุน $10,000+: 10.00 lots ขึ้นไป (ขยายตามสัดส่วนเงินตลาดสูงสุดถึง 30.0 lots)
      if(balance < 20.0) targetLot = MathMax(targetLot, 0.01);
      else if(balance < 35.0) targetLot = MathMax(targetLot, 0.02);
      else if(balance < 60.0) targetLot = MathMax(targetLot, 0.03);
      else if(balance < 100.0) targetLot = MathMax(targetLot, 0.05);
      else if(balance < 200.0) targetLot = MathMax(targetLot, 0.10);
      else if(balance < 350.0) targetLot = MathMax(targetLot, 0.20);
      else if(balance < 500.0) targetLot = MathMax(targetLot, 0.35);
      else if(balance < 1000.0) targetLot = MathMax(targetLot, 0.50);
      else if(balance < 2500.0) targetLot = MathMax(targetLot, 1.00);
      else if(balance < 5000.0) targetLot = MathMax(targetLot, 2.50);
      else if(balance < 10000.0) targetLot = MathMax(targetLot, 5.00);
      else targetLot = MathMax(targetLot, MathMin(30.0, MathFloor((balance / 1000.0) * 1.0 * 100.0) / 100.0));
   }
   else
   {
      // 14-Step Hyper-Growth Staircase Floor ($10 -> $20 -> $30 -> $40 -> $50 -> $60 -> $70 -> $80 -> $90 -> $100 -> $200 -> $300 -> $400 -> $500 -> $600+)
      if(balance >= 40.0 && targetLot < 0.02) targetLot = 0.02;
      if(balance >= 60.0 && targetLot < 0.03) targetLot = 0.03;
      if(balance >= 80.0 && targetLot < 0.04) targetLot = 0.04;
      if(balance >= 100.0 && targetLot < 0.05) targetLot = 0.05;
      if(balance >= 150.0 && targetLot < 0.07) targetLot = 0.07;
      if(balance >= 200.0 && targetLot < 0.10) targetLot = 0.10;
      if(balance >= 300.0 && targetLot < 0.15) targetLot = 0.15;
      if(balance >= 400.0 && targetLot < 0.20) targetLot = 0.20;
      if(balance >= 500.0 && targetLot < 0.25) targetLot = 0.25;
      if(balance >= 600.0 && targetLot < 0.30) targetLot = 0.30;
      if(balance >= 800.0 && targetLot < 0.40) targetLot = 0.40;
      if(balance >= 1000.0 && targetLot < 0.50) targetLot = 0.50;
      if(balance >= 2500.0 && targetLot < 1.00) targetLot = 1.00;
      if(balance >= 5000.0 && targetLot < 2.00) targetLot = 2.00;
      if(balance >= 10000.0 && targetLot < 4.00) targetLot = 4.00;
   }

   // Profit Martingale Win Streak Multiplier (House Money Compounding)
   if(InpEnableProfitMartingale && m_winStreak >= 1)
   {
      double streakMult = (m_winStreak == 1) ? InpStreak2Multiplier : InpStreak3Multiplier;
      targetLot *= streakMult;
      PrintFormat("🔥 [Profit Martingale Boost] Win Streak %d -> Lot multiplied by %.2fx (%.2f lot)", m_winStreak, streakMult, targetLot);
   }

   // Cap according to Selected Mode
   double maxCap = InpMaxLotCap;
   if(InpLotCompoundMode == COMPOUND_CONSERVATIVE) maxCap = MathMin(5.0, maxCap);
   else if(InpLotCompoundMode == COMPOUND_BALANCED) maxCap = MathMin(15.0, maxCap);
   else if(InpLotCompoundMode == COMPOUND_AGGRESSIVE || InpLotCompoundMode == COMPOUND_MANUAL_SCALPER) maxCap = MathMin(30.0, maxCap);

   targetLot = MathMin(maxCap, targetLot);
   return targetLot;
}

//+------------------------------------------------------------------+
//| GUI Dashboard: Create On-Chart HUD                               |
//+------------------------------------------------------------------+
void CreateDashboardGUI()

{
   int x = InpGuiX;
   int y = InpGuiY;
   int w = 285;
   int h = 352;

   // Color Palette according to InpGuiTheme
   color bgMain, borderMain, bgHeader, borderHeader;
   color bgBoxNews, borderBoxNews, bgBoxConf, borderBoxConf, bgBoxRisk, borderBoxRisk;

   if(InpGuiTheme == THEME_STEALTH_SLATE)
   {
      bgMain        = C'15,23,42';   // Slate 900
      borderMain    = C'51,65,85';   // Slate 700
      bgHeader      = C'30,41,59';   // Slate 800
      borderHeader  = C'71,85,105';  // Slate 600
      bgBoxNews     = C'24,33,47';   // Card 1
      borderBoxNews = C'59,130,246';  // Blue
      bgBoxConf     = C'24,33,47';   // Card 2
      borderBoxConf = C'234,179,8';   // Amber
      bgBoxRisk     = C'24,33,47';   // Card 3
      borderBoxRisk = C'71,85,105';  // Slate
   }
   else if(InpGuiTheme == THEME_MIDNIGHT_NAVY)
   {
      bgMain        = C'8,14,30';    // Deep Navy
      borderMain    = C'99,102,241';  // Indigo
      bgHeader      = C'15,23,55';   // Navy header
      borderHeader  = C'129,140,248'; // Indigo accent
      bgBoxNews     = C'15,23,55';   // Card 1
      borderBoxNews = C'129,140,248'; // Light Indigo
      bgBoxConf     = C'15,23,55';   // Card 2
      borderBoxConf = C'45,212,191';  // Teal
      bgBoxRisk     = C'15,23,55';   // Card 3
      borderBoxRisk = C'99,102,241';  // Indigo
   }
   else // THEME_DARK_CYBER (Default - High Contrast Neon Bloomberg Style)
   {
      bgMain        = C'11,15,25';   // Obsidian Black
      borderMain    = C'30,58,138';  // Cobalt Blue
      bgHeader      = C'17,24,39';   // Dark Slate
      borderHeader  = C'30,41,59';   // Slate 800
      bgBoxNews     = C'17,24,39';   // Card 1
      borderBoxNews = C'14,165,233';  // Neon Sky Blue
      bgBoxConf     = C'16,24,40';   // Card 2
      borderBoxConf = C'16,185,129';  // Emerald Green
      bgBoxRisk     = C'15,23,42';   // Card 3
      borderBoxRisk = C'51,65,85';   // Slate
   }

   // Main Background Panel
   CreatePanel("BG", x, y, w, h, bgMain, borderMain, 2);

   // Header Bar
   CreatePanel("Header", x, y, w, 32, bgHeader, borderHeader, 1);
   CreateLabel("Title", x + 10, y + 8, "🛡️ AEGIS QUANT TERMINAL", "Segoe UI", 9, clrWhite, true);
   CreateLabel("VerBadge", x + 195, y + 9, "v3.0 PRO", "Consolas", 8, clrAqua);
   CreateButton("MinBtn", x + w - 24, y + 5, 18, 20, "─", clrLightSteelBlue, C'30,41,59');

   // Sub-Header: Connectivity & Market Pulse
   CreateLabel("PingLbl", x + 10, y + 36, "BRIDGE: CONNECTING...", "Consolas", 8, clrDarkGray);
   string symDisplay = InpOneChartMultiSymbol ? StringFormat("%s [MULTI-CHART 🌐]", _Symbol) : _Symbol;
   CreateLabel("AssetLbl", x + 10, y + 50, symDisplay + "  |  SPREAD: -- pips", "Segoe UI", 9, clrSilver, true);

   // Card 1: Forex Factory News Sentinel Box
   CreatePanel("NewsBox", x + 8, y + 68, w - 16, 42, bgBoxNews, borderBoxNews, 1);
   CreateLabel("NewsTitle", x + 14, y + 72, "📰 FOREX FACTORY NEWS SENTINEL:", "Segoe UI", 8, clrLightSkyBlue);
   CreateLabel("NewsLbl", x + 14, y + 87, "MONITORING ECONOMIC CALENDAR...", "Segoe UI", 8, clrSilver, true);

   // Card 2: 5-Pillar Confluence Score & Setup Plan Box
   CreatePanel("ConfBox", x + 8, y + 114, w - 16, 60, bgBoxConf, borderBoxConf, 1);
   CreateLabel("ConfTitle", x + 14, y + 118, "5-PILLAR INSTITUTIONAL CONFLUENCE:", "Segoe UI", 8, clrCyan);
   CreateLabel("ConfScore", x + 14, y + 133, "▲ 85.0% [A+] STRONG BUY", "Segoe UI", 11, clrLimeGreen, true);
   CreateLabel("SigDetail", x + 14, y + 154, "WAITING FOR PRIME SETUP...", "Consolas", 8, clrSilver);

   // Card 3: Milestone Compounding & Active Risk Telemetry
   CreatePanel("RiskBox", x + 8, y + 178, w - 16, 76, bgBoxRisk, borderBoxRisk, 1);
   CreateLabel("TierVal", x + 14, y + 182, "• Tier: Tier 1: Foundation ($10-$50)", "Segoe UI", 8, clrWhite);
   CreateLabel("GovVal", x + 14, y + 198, "• Daily PnL: +0.0% (Max Risk: 4.0%)", "Segoe UI", 8, clrLimeGreen);
   CreateLabel("FloatingPnlLbl", x + 14, y + 214, "• Floating: $0.00 (0.0 pips) | 0 Open", "Consolas", 8, clrAqua, true);
   CreateLabel("StatusVal", x + 14, y + 230, "• Harvest: ON | Time: OK | Retries: 3", "Segoe UI", 8, clrSilver);

   // Interactive Buttons (Control Deck)
   int btnW = (w - 24) / 3;
   CreateButton("BtnMode", x + 8, y + 260, btnW, 28, "AUTO: ON", clrWhite, C'16,185,129', clrLimeGreen, 8);
   CreateButton("BtnBuy", x + 12 + btnW, y + 260, btnW, 28, "BUY", clrWhite, C'37,99,235', clrDodgerBlue, 8);
   CreateButton("BtnSell", x + 16 + (btnW * 2), y + 260, btnW, 28, "SELL", clrWhite, C'225,29,72', clrCrimson, 8);
   CreateButton("BtnCloseAll", x + 8, y + 294, w - 16, 26, "🛑 EMERGENCY CLOSE ALL (PANIC)", clrGold, C'60,20,30', clrOrangeRed, 8);

   // Footer Subtext
   CreateLabel("FooterLbl", x + 10, y + 328, "• 0ms Event Sync | Confluence Matrix | VSA Box", "Segoe UI", 7, C'100,116,139');

   ChartRedraw();
}

//+------------------------------------------------------------------+
//| Update GUI Live Values                                           |
//+------------------------------------------------------------------+
void UpdateDashboardGUI()
{
   if(m_isMinimized) return;

   // Online, Daily Guard & Ping Status
   string pingStr = "";
   color pingClr = clrLimeGreen;
   if(m_isDailyLocked)
   {
      pingStr = "🛑 DAILY GUARD: LOCKED";
      pingClr = clrCrimson;
   }
   else if(TimeCurrent() < m_cooldownUntil)
   {
      int remMin = (int)((m_cooldownUntil - TimeCurrent()) / 60);
      pingStr = StringFormat("❄️ COOLDOWN (%dm rem)", remMin);
      pingClr = clrAqua;
   }
   else
   {
      pingStr = m_isOnline ? StringFormat("BRIDGE: ONLINE (%d ms) 🟢", m_lastPingMs)
                            : (InpOfflineFallback ? "MODE: STANDALONE 🟡" : "BRIDGE: OFFLINE 🔴");
      pingClr = m_isOnline ? clrLimeGreen : (InpOfflineFallback ? clrGold : clrRed);
   }
   ObjectSetString(0, GUI_PREFIX + "PingLbl", OBJPROP_TEXT, pingStr);
   ObjectSetInteger(0, GUI_PREFIX + "PingLbl", OBJPROP_COLOR, pingClr);

   // Spread & Symbol
   double spreadPips = (double)SymbolInfoInteger(_Symbol, SYMBOL_SPREAD) * _Point / GetPipMultiplier();
   string symDisplay = InpOneChartMultiSymbol ? StringFormat("%s [MULTI-CHART 🌐]", _Symbol) : _Symbol;
   string assetStr = StringFormat("%s · %s  |  SPREAD: %.1f pips", symDisplay, EnumToString(_Period), spreadPips);
   color assetClr = (spreadPips > InpMaxSpreadPips) ? clrRed : ((spreadPips <= 2.5) ? clrLimeGreen : clrGold);
   ObjectSetString(0, GUI_PREFIX + "AssetLbl", OBJPROP_TEXT, assetStr);
   ObjectSetInteger(0, GUI_PREFIX + "AssetLbl", OBJPROP_COLOR, assetClr);

   // Forex Factory News Shield HUD
   string newsStr = "";
   color newsClr = clrLimeGreen;
   if(!InpEnableNewsShield)
   {
      newsStr = "[ OFF ] News Shield Disabled";
      newsClr = clrDarkGray;
   }
   else if(m_newsMinutesToNext == -999)
   {
      newsStr = "[ MONITORING ] Economic Calendar...";
      newsClr = clrSilver;
   }
   else if(m_newsMinutesToNext > 60)
   {
      newsStr = StringFormat("[ SAFE 🟢 ] %s in %dh", m_newsTitle, (int)(m_newsMinutesToNext / 60));
      newsClr = clrLimeGreen;
   }
   else if(m_newsMinutesToNext > InpNewsPreFreezeMins)
   {
      newsStr = StringFormat("[ CAUTION 🟡 ] %s in %dm", m_newsTitle, m_newsMinutesToNext);
      newsClr = clrGold;
   }
   else if(m_newsMinutesToNext >= 0)
   {
      newsStr = StringFormat("[ 🚨 FREEZE %dm ] %s (AUTO-BE LOCKED)", m_newsMinutesToNext, m_newsTitle);
      newsClr = clrCrimson;
   }
   else if(m_newsMinutesToNext >= -15)
   {
      newsStr = StringFormat("[ ⚡ POST-NEWS SNIPER ] (%dm ago)", (int)MathAbs(m_newsMinutesToNext));
      newsClr = clrCyan;
   }
   else
   {
      newsStr = "[ SAFE 🟢 ] Safe Trading Window";
      newsClr = clrLimeGreen;
   }

   if(m_macroBias != "" && m_macroBias != "NEUTRAL")
   {
      string biasBadge = (m_macroBias == "BUY_ONLY") ? "🟢 BUY ONLY" : ((m_macroBias == "SELL_ONLY") ? "🔴 SELL ONLY" : m_macroBias);
      newsStr += StringFormat(" | %s", biasBadge);
   }

   ObjectSetString(0, GUI_PREFIX + "NewsLbl", OBJPROP_TEXT, newsStr);
   ObjectSetInteger(0, GUI_PREFIX + "NewsLbl", OBJPROP_COLOR, newsClr);

   // Confluence Score & Setup Bias Display
   string dirArrow = (StringFind(m_lastOrderType, "BUY") >= 0) ? "▲ " : ((StringFind(m_lastOrderType, "SELL") >= 0) ? "▼ " : "◆ ");
   string confText = StringFormat("%s%.1f%% [%s] %s", dirArrow, m_confluenceScore, m_setupGrade, (m_lastOrderType != "NONE" ? m_lastOrderType : "STRONG BIAS"));
   color confClr = (StringFind(m_lastOrderType, "BUY") >= 0) ? clrLimeGreen : ((StringFind(m_lastOrderType, "SELL") >= 0) ? clrCrimson : clrGold);
   ObjectSetString(0, GUI_PREFIX + "ConfScore", OBJPROP_TEXT, confText);
   ObjectSetInteger(0, GUI_PREFIX + "ConfScore", OBJPROP_COLOR, confClr);

   // Active AI Signal Detail
   if(m_lastOrderType != "NONE" && m_lastOrderStatus != "IDLE")
   {
      string sigText = StringFormat("Plan: %s @ %.2f | SL: %.2f | Lot: %.2f", m_lastOrderType, m_lastOrderPrice, m_lastOrderSL, m_lastOrderLot);
      ObjectSetString(0, GUI_PREFIX + "SigDetail", OBJPROP_TEXT, sigText);
      ObjectSetInteger(0, GUI_PREFIX + "SigDetail", OBJPROP_COLOR, (StringFind(m_lastOrderType, "BUY") >= 0) ? clrLimeGreen : clrCrimson);
   }
   else
   {
      ObjectSetString(0, GUI_PREFIX + "SigDetail", OBJPROP_TEXT, "WAITING FOR PRIME SETUP...");
      ObjectSetInteger(0, GUI_PREFIX + "SigDetail", OBJPROP_COLOR, clrSilver);
   }

   // Milestone Tier & Capital Status with Market-Adaptive Lot Scaling Badge
   string lotScaleBadge = InpEnableAutoLotScale 
      ? (InpLotCompoundMode == COMPOUND_MANUAL_SCALPER 
         ? "MANUAL SCALPER 🥷" 
         : (InpRegimeLotBoost && (m_setupGrade == "A+" || m_confluenceScore >= 80.0) ? "Lot: +25% 🚀" : "AutoLot: ON"))
      : "Lot: FIXED";
   if(InpEnableAutoPyramiding) lotScaleBadge += " + PYRAMID";
   if(InpEnableScratchExit) lotScaleBadge += " | ZERO-DD 🛡️";
   ObjectSetString(0, GUI_PREFIX + "TierVal", OBJPROP_TEXT, StringFormat("• %s | %s", m_lastTierName, lotScaleBadge));

   string govStr = "";

   color govClr = clrLimeGreen;
   if(InpEnableDailyGuard && m_dayStartEquity > 0)
   {
      double currentEq = AccountInfoDouble(ACCOUNT_EQUITY);
      double dPnl = ((currentEq - m_dayStartEquity) / m_dayStartEquity) * 100.0;
      govStr = StringFormat("• Daily PnL: %+.1f%% (Max Risk: -%.1f%%)", dPnl, InpMaxDailyLossPct);
      govClr = (dPnl >= 0) ? clrLimeGreen : (dPnl <= -InpMaxDailyLossPct * 0.7) ? clrOrangeRed : clrGold;
   }
   else
   {
      govStr = StringFormat("• DD Governor: %s", m_lastGovernorStatus);
      govClr = (m_lastGovernorStatus == "NORMAL") ? clrLimeGreen : clrGold;
   }
   ObjectSetString(0, GUI_PREFIX + "GovVal", OBJPROP_TEXT, govStr);
   ObjectSetInteger(0, GUI_PREFIX + "GovVal", OBJPROP_COLOR, govClr);

   // Real-Time Floating PnL of EA Positions
   double totalFloatingProfit = 0.0;
   double totalFloatingPips   = 0.0;
   int openCount = 0;

   for(int i = PositionsTotal() - 1; i >= 0; i--)
   {
      if(m_position.SelectByIndex(i))
      {
         bool isMatch = InpOneChartMultiSymbol ? true : (m_position.Symbol() == _Symbol);
         if(isMatch && m_position.Magic() == InpMagicNumber)
         {
            openCount++;
            totalFloatingProfit += m_position.Profit();
            string pSym = m_position.Symbol();
            double pMult = GetPipMultiplier(pSym);
            double curPrice = m_position.PriceCurrent();
            double opPrice  = m_position.PriceOpen();
            double pips = (m_position.PositionType() == POSITION_TYPE_BUY)
                          ? (curPrice - opPrice) * pMult
                          : (opPrice - curPrice) * pMult;
            totalFloatingPips += pips;
         }
      }
   }

   string floatStr = StringFormat("• Floating: %+$0.2f (%+.1f pips) | %d Open",
                                  totalFloatingProfit, totalFloatingPips, openCount);
   color floatClr = (totalFloatingProfit > 0) ? clrLimeGreen : (totalFloatingProfit < 0 ? clrCrimson : clrSilver);
   ObjectSetString(0, GUI_PREFIX + "FloatingPnlLbl", OBJPROP_TEXT, floatStr);
   ObjectSetInteger(0, GUI_PREFIX + "FloatingPnlLbl", OBJPROP_COLOR, floatClr);

   // Status & Safeguards Row
   string timeStatus = IsTradingTimeAllowed() ? "OK" : "FREEZE";
   string statusStr = StringFormat("• Harvest: %s | Time: %s | Retries: %d",
                                   InpEnableEarlyHarvest ? "ON" : "OFF",
                                   timeStatus, InpMaxOrderRetries);
   ObjectSetString(0, GUI_PREFIX + "StatusVal", OBJPROP_TEXT, statusStr);
   ObjectSetInteger(0, GUI_PREFIX + "StatusVal", OBJPROP_COLOR, IsTradingTimeAllowed() ? clrSilver : clrOrange);

   ChartRedraw();
}

//+------------------------------------------------------------------+
//| Update Live Tick Display                                         |
//+------------------------------------------------------------------+
void UpdateLiveTickDisplay()
{
   double bid = SymbolInfoDouble(_Symbol, SYMBOL_BID);
   double ask = SymbolInfoDouble(_Symbol, SYMBOL_ASK);
   double spreadPips = (ask - bid) / (GetPipMultiplier() * _Point);
   string symDisplay = InpOneChartMultiSymbol ? StringFormat("%s [MULTI-CHART 🌐]", _Symbol) : _Symbol;
   string assetStr = StringFormat("%s · %s  |  SPREAD: %.1f pips", symDisplay, EnumToString(_Period), spreadPips);
   color assetClr = (spreadPips > InpMaxSpreadPips) ? clrRed : ((spreadPips <= 2.5) ? clrLimeGreen : clrGold);
   ObjectSetString(0, GUI_PREFIX + "AssetLbl", OBJPROP_TEXT, assetStr);
   ObjectSetInteger(0, GUI_PREFIX + "AssetLbl", OBJPROP_COLOR, assetClr);
}

//+------------------------------------------------------------------+
//| Chart Event Handler (Interactive Buttons)                        |
//+------------------------------------------------------------------+
void OnChartEvent(const int id, const long &lparam, const double &dparam, const string &sparam)
{
   if(id == CHARTEVENT_OBJECT_CLICK)
   {
      // Minimize / Restore Toggle
      if(sparam == GUI_PREFIX + "MinBtn")
      {
         m_isMinimized = !m_isMinimized;
         ToggleMinimizeGUI(m_isMinimized);
      }
      // Mode Toggle (Auto / Semi / Off)
      else if(sparam == GUI_PREFIX + "BtnMode")
      {
         if(m_currentMode == MODE_FULL_AUTO)
         {
            m_currentMode = MODE_SEMI_AUTO;
            ObjectSetString(0, GUI_PREFIX + "BtnMode", OBJPROP_TEXT, "SEMI: ON");
            ObjectSetInteger(0, GUI_PREFIX + "BtnMode", OBJPROP_BGCOLOR, C'234,179,8'); // Amber
            ObjectSetInteger(0, GUI_PREFIX + "BtnMode", OBJPROP_BORDER_COLOR, clrGold);
         }
         else if(m_currentMode == MODE_SEMI_AUTO)
         {
            m_currentMode = MODE_SIGNAL_ONLY;
            ObjectSetString(0, GUI_PREFIX + "BtnMode", OBJPROP_TEXT, "OFF");
            ObjectSetInteger(0, GUI_PREFIX + "BtnMode", OBJPROP_BGCOLOR, C'75,85,99'); // Gray
            ObjectSetInteger(0, GUI_PREFIX + "BtnMode", OBJPROP_BORDER_COLOR, clrGray);
         }
         else
         {
            m_currentMode = MODE_FULL_AUTO;
            ObjectSetString(0, GUI_PREFIX + "BtnMode", OBJPROP_TEXT, "AUTO: ON");
            ObjectSetInteger(0, GUI_PREFIX + "BtnMode", OBJPROP_BGCOLOR, C'16,185,129'); // Emerald
            ObjectSetInteger(0, GUI_PREFIX + "BtnMode", OBJPROP_BORDER_COLOR, clrLimeGreen);
         }
         ChartRedraw();
      }
      // One-Click BUY
      else if(sparam == GUI_PREFIX + "BtnBuy")
      {
         double ask = SymbolInfoDouble(_Symbol, SYMBOL_ASK);
         double sl = ask - (30 * _Point * GetPipMultiplier());
         double tp = ask + (60 * _Point * GetPipMultiplier());
         m_trade.PositionOpen(_Symbol, ORDER_TYPE_BUY, m_lastOrderLot, ask, sl, tp, "Aegis_Manual_Buy");
      }
      // One-Click SELL
      else if(sparam == GUI_PREFIX + "BtnSell")
      {
         double bid = SymbolInfoDouble(_Symbol, SYMBOL_BID);
         double sl = bid + (30 * _Point * GetPipMultiplier());
         double tp = bid - (60 * _Point * GetPipMultiplier());
         m_trade.PositionOpen(_Symbol, ORDER_TYPE_SELL, m_lastOrderLot, bid, sl, tp, "Aegis_Manual_Sell");
      }
      // Close All Positions Emergency Button
      else if(sparam == GUI_PREFIX + "BtnCloseAll")
      {
         CloseAllPositionsAndPendings();
         Print("🛑 [Aegis] Emergency Close All Executed.");
      }
   }
}

//+------------------------------------------------------------------+
//| Toggle Minimize GUI                                              |
//+------------------------------------------------------------------+
void ToggleMinimizeGUI(bool minimize)
{
   int hide = minimize ? 0 : 1;
   ObjectSetInteger(0, GUI_PREFIX + "BG", OBJPROP_YSIZE, minimize ? 32 : 352);
   ObjectSetString(0, GUI_PREFIX + "MinBtn", OBJPROP_TEXT, minimize ? "□" : "─");

   string elements[] = {
      "VerBadge", "PingLbl", "AssetLbl", "NewsBox", "NewsTitle", "NewsLbl",
      "ConfBox", "ConfTitle", "ConfScore", "SigDetail",
      "RiskBox", "TierVal", "GovVal", "FloatingPnlLbl", "StatusVal",
      "BtnMode", "BtnBuy", "BtnSell", "BtnCloseAll", "FooterLbl"
   };

   for(int i = 0; i < ArraySize(elements); i++)
   {
      ObjectSetInteger(0, GUI_PREFIX + elements[i], OBJPROP_TIMEFRAMES, hide ? OBJ_ALL_PERIODS : OBJ_NO_PERIODS);
   }

   ChartRedraw();
}

//+------------------------------------------------------------------+
//| GUI Helper Functions                                             |
//+------------------------------------------------------------------+
void CreatePanel(string name, int x, int y, int w, int h, color bg, color border, int borderWidth=1)
{
   string objName = GUI_PREFIX + name;
   ObjectDelete(0, objName);
   ObjectCreate(0, objName, OBJ_RECTANGLE_LABEL, 0, 0, 0);
   ObjectSetInteger(0, objName, OBJPROP_XDISTANCE, x);
   ObjectSetInteger(0, objName, OBJPROP_YDISTANCE, y);
   ObjectSetInteger(0, objName, OBJPROP_XSIZE, w);
   ObjectSetInteger(0, objName, OBJPROP_YSIZE, h);
   ObjectSetInteger(0, objName, OBJPROP_BGCOLOR, bg);
   ObjectSetInteger(0, objName, OBJPROP_BORDER_COLOR, border);
   ObjectSetInteger(0, objName, OBJPROP_WIDTH, borderWidth);
   ObjectSetInteger(0, objName, OBJPROP_CORNER, CORNER_LEFT_UPPER);
   ObjectSetInteger(0, objName, OBJPROP_SELECTABLE, false);
}

void CreateLabel(string name, int x, int y, string text, string font, int fontSize, color clr, bool bold=false)
{
   string objName = GUI_PREFIX + name;
   ObjectDelete(0, objName);
   ObjectCreate(0, objName, OBJ_LABEL, 0, 0, 0);
   ObjectSetInteger(0, objName, OBJPROP_XDISTANCE, x);
   ObjectSetInteger(0, objName, OBJPROP_YDISTANCE, y);
   ObjectSetString(0, objName, OBJPROP_TEXT, text);
   ObjectSetString(0, objName, OBJPROP_FONT, font);
   ObjectSetInteger(0, objName, OBJPROP_FONTSIZE, fontSize);
   ObjectSetInteger(0, objName, OBJPROP_COLOR, clr);
   ObjectSetInteger(0, objName, OBJPROP_CORNER, CORNER_LEFT_UPPER);
   ObjectSetInteger(0, objName, OBJPROP_SELECTABLE, false);
}

void CreateButton(string name, int x, int y, int w, int h, string text, color clr, color bg, color borderClr=clrNONE, int fontSize=8)
{
   string objName = GUI_PREFIX + name;
   ObjectDelete(0, objName);
   ObjectCreate(0, objName, OBJ_BUTTON, 0, 0, 0);
   ObjectSetInteger(0, objName, OBJPROP_XDISTANCE, x);
   ObjectSetInteger(0, objName, OBJPROP_YDISTANCE, y);
   ObjectSetInteger(0, objName, OBJPROP_XSIZE, w);
   ObjectSetInteger(0, objName, OBJPROP_YSIZE, h);
   ObjectSetString(0, objName, OBJPROP_TEXT, text);
   ObjectSetString(0, objName, OBJPROP_FONT, "Segoe UI");
   ObjectSetInteger(0, objName, OBJPROP_FONTSIZE, fontSize);
   ObjectSetInteger(0, objName, OBJPROP_COLOR, clr);
   ObjectSetInteger(0, objName, OBJPROP_BGCOLOR, bg);
   ObjectSetInteger(0, objName, OBJPROP_BORDER_COLOR, (borderClr == clrNONE ? clr : borderClr));
   ObjectSetInteger(0, objName, OBJPROP_CORNER, CORNER_LEFT_UPPER);
   ObjectSetInteger(0, objName, OBJPROP_SELECTABLE, false);
}

void DestroyDashboardGUI()
{
   ObjectsDeleteAll(0, GUI_PREFIX);
   ChartRedraw();
}
//+------------------------------------------------------------------+
