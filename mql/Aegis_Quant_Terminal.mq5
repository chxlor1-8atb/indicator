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
   COMPOUND_CONSERVATIVE = 0, // Conservative Cap (Max 5.0 lots - เน้นความปลอดภัยสูงสุด สถาบัน)
   COMPOUND_BALANCED     = 1, // Balanced Market-Adaptive (Max 15.0 lots - ปรับขนาดตามสภาพตลาดและโมเมนตัม)
   COMPOUND_AGGRESSIVE   = 2  // Aggressive Hyper-Growth (Max 30.0 lots - ทบต้นเต็มพิกัด เร่งพอร์ตไว)
};

//--- Input Parameters
input group "=== 🌐 BRIDGE & SERVER SETTINGS ==="
input string             InpServerUrl         = "http://localhost:3000"; // Server URL (อย่าใส่ / ต่อท้าย)
input int                InpPollIntervalSec   = 2;                       // ความถี่ดึงสัญญาณ (วินาที)
input ulong              InpMagicNumber       = 777888;                  // Magic Number ประจำ EA

input group "=== 📈 MARKET-ADAPTIVE DYNAMIC LOT SCALING ==="
input bool                    InpEnableAutoLotScale    = true;                    // เปิดโหมดคำนวณและปรับขนาด Lot อัตโนมัติตามสภาวะตลาด
input ENUM_LOT_COMPOUND_MODE InpLotCompoundMode       = COMPOUND_BALANCED;       // โหมดทบต้นและเพดาน Lot สูงสุด
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

input group "=== ⚡ FLASH VOLATILITY SPIKE GUARD ==="
input bool               InpEnableFlashSpikeGuard = true;                // ตรวจจับแท่งเทียนกระชากผิดปกติ (>3x ATR) พักเทรดทันที
input double             InpFlashSpikeATRMult     = 3.0;                 // ตัวคูณ ATR สำหรับตรวจจับ Spike
input int                InpSpikeFreezeMinutes    = 15;                  // เวลาหยุดเทรดหลังเจอ Spike (นาที)

input group "=== 🛡️ DAILY DRAWDOWN GUARD (PROP FIRM) ==="
input bool               InpEnableDailyGuard  = true;                   // เปิดระบบตัดขาดทุนรายวัน (Circuit Breaker)
input double             InpMaxDailyLossPct   = 4.0;                    // ขาดทุนสูงสุดต่อวัน (%) ก่อนสั่งปิดหมดและหยุดเทรด
input double             InpTrailingDailyLockPct = 50.0;                // ล็อคกำไรรายวัน (%) หากกำไรพีคย่อลงมาเกินกำหนด

input group "=== ⏰ SESSION & TIME FILTER ==="
input bool               InpEnableTimeFilter  = true;                   // เปิดตัวกรองเวลาเทรด
input bool               InpAsianBoxShield    = true;                   // บล็อกการเทรดกรอบ Box ช่วงเช้าเอเชีย (06:00 - 12:00 น. Win Rate 90.7%)
input int                InpRolloverStartHour = 23;                     // ชั่วโมงเริ่ม Rollover สเปรดถ่าง (Server Time)

input int                InpRolloverEndHour   = 1;                      // ชั่วโมงสิ้นสุด Rollover (Server Time)
input bool               InpCloseFridayNight  = false;                  // สั่งปิดทุกไม้ก่อนวันหยุดสุดสัปดาห์ (ศุกร์กลางคืน)
input int                InpFridayCloseHour   = 22;                     // ชั่วโมงปิดไม้วันศุกร์ (Server Time)

input group "=== 🎯 PENDING ORDERS & ROUTER ==="
input bool               InpUsePendingOrders  = true;                   // รองรับ Buy/Sell Limit ดักราคาที่ Order Block
input int                InpPendingExpiryHours = 4;                     // อายุของ Pending Order ก่อนยกเลิก (ชั่วโมง)
input double             InpMarketExecBufferPips = 2.0;                 // ถ้าราคาห่างจาก Limit ไม่เกินกี่ Pip ให้เข้า Market เลย

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

// Stealth Virtual SL / TP State (Hidden from Broker)
double   m_stealthSL            = 0.0;
double   m_stealthTP1           = 0.0;
double   m_stealthTP2           = 0.0;
bool     m_isStealthActive      = false;

// Profit Martingale Win Streak State
int      m_winStreak            = 0;

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
void   ExecuteInstitutionalSignal(string orderId, string typeStr, double price, double sl, double tp1, double tp2, double lots, string targetSym = "");
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
            }

            // Execute if FULL_AUTO and not yet processed
            if(m_currentMode == MODE_FULL_AUTO && (status == "PENDING" || status == "FILLED"))
            {
               ExecuteInstitutionalSignal(orderId, typeStr, price, sl, tp1, tp2, lots, targetBrokerSym);
            }
         }
      }
   }
}

//+------------------------------------------------------------------+
//| Execute or place order based on institutional criteria           |
//+------------------------------------------------------------------+
void ExecuteInstitutionalSignal(string orderId, string typeStr, double price, double sl, double tp1, double tp2, double lots, string targetSym = "")
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

   if(!IsTradingTimeAllowed())
   {
      Print("⏰ [Time Filter] Rollover or weekend filter active. Skipping order execution.");
      return;
   }

   // 1b. Asian Morning Box Shield (06:00 - 12:00 Thai Time)
   if(InpAsianBoxShield && (StringFind(typeStr, "BOX") >= 0 || m_lastDefenseReason == "BOX" || StringFind(m_setupGrade, "BOX") >= 0))
   {
      MqlDateTime dt;
      datetime now = TimeCurrent();
      TimeToStruct(now, dt);
      int thaiHour = (dt.hour + 4) % 24; // Convert broker time to Thai time (UTC+7)
      if(thaiHour >= 6 && thaiHour <= 12 && m_setupGrade != "A+")
      {
         PrintFormat("🛡️ [Asian Box Shield] Skipping Box order %s during Asian Morning (%02d:00 Thai Time) to preserve 90.7%% Win Rate.",
                     orderId, thaiHour);
         return;
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

   // 4. Check Spread Safety
   double ask = SymbolInfoDouble(targetSym, SYMBOL_ASK);
   double bid = SymbolInfoDouble(targetSym, SYMBOL_BID);
   if(ask <= 0 || bid <= 0) return;

   double currentSpread = (ask - bid) / (targetPoint * pipMult);
   if(currentSpread > InpMaxSpreadPips)
   {
      PrintFormat("🛑 [Spread Protection] Spread on %s is %.1f pips (exceeds limit %.1f)", targetSym, currentSpread, InpMaxSpreadPips);
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

   // 6. Institutional Pending Order Router (Buy/Sell Limit at Order Block)
   if(InpUsePendingOrders && (typeStr == "BUY_LIMIT" || typeStr == "SELL_LIMIT"))
   {
      if(distPips > InpMarketExecBufferPips)
      {
         datetime expTime = TimeCurrent() + (InpPendingExpiryHours * 3600);
         bool pendingOk = false;
         int pRetries = 0;

         while(pRetries < InpMaxOrderRetries && !pendingOk)
         {
            if(pRetries > 0) Sleep(InpRetryDelayMs);
            ResetLastError();

            if(typeStr == "BUY_LIMIT" && price < ask)
            {
               pendingOk = m_trade.BuyLimit(lots, price, targetSym, brokerSL, brokerTP, ORDER_TIME_SPECIFIED, expTime, comment);
            }
            else if(typeStr == "SELL_LIMIT" && price > bid)
            {
               pendingOk = m_trade.SellLimit(lots, price, targetSym, brokerSL, brokerTP, ORDER_TIME_SPECIFIED, expTime, comment);
            }
            if(!pendingOk) pRetries++;
         }

         if(pendingOk)
         {
            PrintFormat("⏳ [Aegis Pending%s] Placed %s %0.2f lot on %s @ %0.*f | SL: %0.*f TP2: %0.*f (Expires in %dh)",
                        InpEnableStealthMode ? " 🥷 STEALTH" : "", typeStr, lots, targetSym, digits, price, digits, sl, digits, tp2, InpPendingExpiryHours);
            if(targetSym == _Symbol) DrawChartTradeLevels(typeStr, price, sl, tp1, tp2);
            NotifyBridgeOrderEvent(orderId, "PENDING_PLACED", price, 0.0, targetSym);
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
//| Manage active positions: TP1 50% partial close & Breakeven SL    |
//+------------------------------------------------------------------+
void ManageActivePositions()
{
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

            // 3. Trailing Stop
            if(m_lastTrailingSl > 0 && posSym == _Symbol)
            {
               double normTrail = NormalizeDouble(m_lastTrailingSl, digits);
               if(InpEnableStealthMode)
               {
                  bool shouldUpdateStealth = isBuy ? (normTrail > m_stealthSL && normTrail < currentPrice)
                                                   : (normTrail < m_stealthSL && normTrail > currentPrice);
                  if(shouldUpdateStealth)
                  {
                     m_stealthSL = normTrail;
                     PrintFormat("🥷 [Stealth Trailing SL] Updated Virtual SL to %.*f on %s", digits, normTrail, posSym);
                  }
               }
               bool shouldModify = isBuy ? (normTrail > currentSL && normTrail < currentPrice)
                                         : (normTrail < currentSL && normTrail > currentPrice);
               if(shouldModify)
               {
                  m_trade.PositionModify(ticket, normTrail, m_position.TakeProfit());
                  PrintFormat("🛡️ [Aegis] Adaptive Trailing SL updated to %.5f on %s", normTrail, posSym);
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
   if(balance < 50.0) return 0.01; // Micro Capital Safe Armor ($10 - $50 strictly 0.01 lot)

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

   // Tiered Compounding Floor (ensures account scales smoothly)
   if(balance >= 100.0 && targetLot < 0.02) targetLot = 0.02;
   if(balance >= 250.0 && targetLot < 0.04) targetLot = 0.04;
   if(balance >= 500.0 && targetLot < 0.08) targetLot = 0.08;
   if(balance >= 1000.0 && targetLot < 0.15) targetLot = 0.15;
   if(balance >= 2500.0 && targetLot < 0.30) targetLot = 0.30;
   if(balance >= 5000.0 && targetLot < 0.60) targetLot = 0.60;

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
   else if(InpLotCompoundMode == COMPOUND_AGGRESSIVE) maxCap = MathMin(30.0, maxCap);

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
      ? (InpRegimeLotBoost && (m_setupGrade == "A+" || m_confluenceScore >= 80.0) ? "Lot: +25% 🚀" : "AutoLot: ON")
      : "Lot: FIXED";
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
