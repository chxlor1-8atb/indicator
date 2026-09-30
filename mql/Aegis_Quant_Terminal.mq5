//+------------------------------------------------------------------+
//|                                     Aegis_Quant_Terminal.mq5     |
//|                    Institutional AI Trading Terminal & EA        |
//|                 5-Pillar Confluence + Milestone Compounding      |
//|                      Copyright 2026, Aegis Quant Terminal        |
//+------------------------------------------------------------------+
#property copyright   "Aegis Quant Terminal"
#property link        "https://github.com/aegis-quant"
#property version     "2.50"
#property description "Institutional MT5 EA with On-Chart GUI HUD, 5-Pillar Confluence Engine, Milestone Scaling & Drawdown Governor"

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

//--- Input Parameters
input group "=== 🌐 BRIDGE & SERVER SETTINGS ==="
input string             InpServerUrl         = "http://localhost:3000"; // Server URL (อย่าใส่ / ต่อท้าย)
input int                InpPollIntervalSec   = 2;                       // ความถี่ดึงสัญญาณ (วินาที)
input ulong              InpMagicNumber       = 777888;                  // Magic Number ประจำ EA

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

// GUI Object Name Prefix
#define GUI_PREFIX "AegisHUD_"
#define LEVEL_PREFIX "AegisLvl_"

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
bool HasPendingOrder(string orderId)
{
   for(int i = OrdersTotal() - 1; i >= 0; i--)
   {
      if(m_order.SelectByIndex(i))
      {
         if(m_order.Symbol() == _Symbol && m_order.Magic() == InpMagicNumber)
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
//| Poll signals & orders from Web Bridge API                        |
//+------------------------------------------------------------------+
void PollBridgeServer()
{
   double brokerBid = SymbolInfoDouble(_Symbol, SYMBOL_BID);
   double brokerAsk = SymbolInfoDouble(_Symbol, SYMBOL_ASK);
   double brokerSpread = (double)SymbolInfoInteger(_Symbol, SYMBOL_SPREAD) * _Point / GetPipMultiplier();
   string url = StringFormat("%s/api/mt-bridge?format=mt&symbol=%s&bid=%.5f&ask=%.5f&spread=%.2f",
                             InpServerUrl, _Symbol, brokerBid, brokerAsk, brokerSpread);
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

         if(IsSymbolMatching(sym, _Symbol))
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

            // Execute if FULL_AUTO and not yet processed
            if(m_currentMode == MODE_FULL_AUTO && (status == "PENDING" || status == "FILLED"))
            {
               ExecuteInstitutionalSignal(orderId, typeStr, price, sl, tp1, tp2, lots);
            }
         }
      }
   }
}

//+------------------------------------------------------------------+
//| Execute or place order based on institutional criteria           |
//+------------------------------------------------------------------+
void ExecuteInstitutionalSignal(string orderId, string typeStr, double price, double sl, double tp1, double tp2, double lots)
{
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

   // 2. Check if already open or pending
   if(HasOpenPosition(orderId) || HasPendingOrder(orderId)) return;

   // 3. Check Spread Safety
   double currentSpread = (double)SymbolInfoInteger(_Symbol, SYMBOL_SPREAD) * _Point / GetPipMultiplier();
   if(currentSpread > InpMaxSpreadPips)
   {
      Print("🛑 [Spread Protection] Spread ", currentSpread, " pips exceeds limit ", InpMaxSpreadPips);
      return;
   }

   // 4. Check Free Margin (20% Max Cap)
   double marginReq = 0;
   double ask = SymbolInfoDouble(_Symbol, SYMBOL_ASK);
   double bid = SymbolInfoDouble(_Symbol, SYMBOL_BID);
   if(!OrderCalcMargin(ORDER_TYPE_BUY, _Symbol, lots, ask, marginReq)) marginReq = 0;
   double freeMargin = AccountInfoDouble(ACCOUNT_MARGIN_FREE);
   if(marginReq > freeMargin * (InpMaxMarginPct / 100.0))
   {
      Print("🛑 [Margin Protection] Required margin exceeds 20% cap");
      return;
   }

   bool isBuy = (StringFind(typeStr, "BUY") >= 0);
   int digits = (int)SymbolInfoInteger(_Symbol, SYMBOL_DIGITS);
   sl    = NormalizeDouble(sl, digits);
   tp1   = NormalizeDouble(tp1, digits);
   tp2   = NormalizeDouble(tp2, digits);
   price = NormalizeDouble(price, digits);

   // Normalize Lots to Broker Specification (Step, Min, Max)
   double minLot  = SymbolInfoDouble(_Symbol, SYMBOL_VOLUME_MIN);
   double maxLot  = SymbolInfoDouble(_Symbol, SYMBOL_VOLUME_MAX);
   double lotStep = SymbolInfoDouble(_Symbol, SYMBOL_VOLUME_STEP);
   if(minLot <= 0) minLot = 0.01;
   if(maxLot <= 0) maxLot = 100.0;
   if(lotStep <= 0) lotStep = 0.01;

   lots = MathRound(lots / lotStep) * lotStep;
   lots = MathMax(minLot, MathMin(maxLot, lots));
   lots = NormalizeDouble(lots, 2);

   // Broker Trade Stops-Level Safety Buffer
   int stopLevel = (int)SymbolInfoInteger(_Symbol, SYMBOL_TRADE_STOPS_LEVEL);
   double minStopDist = (stopLevel + 2) * _Point;
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
   double distPips = MathAbs(currentMarket - price) / (_Point * GetPipMultiplier());

   // 5. Institutional Pending Order Router (Buy/Sell Limit at Order Block)
   if(InpUsePendingOrders && (typeStr == "BUY_LIMIT" || typeStr == "SELL_LIMIT"))
   {
      if(distPips > InpMarketExecBufferPips)
      {
         datetime expTime = TimeCurrent() + (InpPendingExpiryHours * 3600);
         bool pendingOk = false;

         if(typeStr == "BUY_LIMIT" && price < ask)
         {
            pendingOk = m_trade.BuyLimit(lots, price, _Symbol, sl, tp2, ORDER_TIME_SPECIFIED, expTime, comment);
         }
         else if(typeStr == "SELL_LIMIT" && price > bid)
         {
            pendingOk = m_trade.SellLimit(lots, price, _Symbol, sl, tp2, ORDER_TIME_SPECIFIED, expTime, comment);
         }

         if(pendingOk)
         {
            PrintFormat("⏳ [Aegis Pending] Placed %s %0.2f lot @ %0.*f | SL: %0.*f TP2: %0.*f (Expires in %dh)",
                        typeStr, lots, digits, price, digits, sl, digits, tp2, InpPendingExpiryHours);
            DrawChartTradeLevels(typeStr, price, sl, tp1, tp2);
            NotifyBridgeOrderEvent(orderId, "PENDING_PLACED", price, 0.0);
            if(InpSoundAlerts) PlaySound("expert.wav");
            return;
         }
         else
         {
            Print("⚠️ [Aegis] Pending limit placement not feasible at current quotes, evaluating market entry.");
         }
      }
   }

   // 6. Market Execution (Instant Fill with Millisecond Local PA Trigger - Pillar 5)
   ENUM_ORDER_TYPE orderType = isBuy ? ORDER_TYPE_BUY : ORDER_TYPE_SELL;
   double execPrice = isBuy ? ask : bid;

   // Verify quotes haven't breached SL or touched TP1 during network transit
   if(isBuy)
   {
      if(sl > 0 && ask <= sl) { PrintFormat("🛑 [Local PA Trigger] Live Ask (%.*f) breached SL (%.*f). Fill aborted.", digits, ask, digits, sl); return; }
      if(tp1 > 0 && ask >= tp1) { PrintFormat("🛑 [Local PA Trigger] Live Ask (%.*f) reached TP1 (%.*f). Fill aborted.", digits, ask, digits, tp1); return; }
   }
   else
   {
      if(sl > 0 && bid >= sl) { PrintFormat("🛑 [Local PA Trigger] Live Bid (%.*f) breached SL (%.*f). Fill aborted.", digits, bid, digits, sl); return; }
      if(tp1 > 0 && bid <= tp1) { PrintFormat("🛑 [Local PA Trigger] Live Bid (%.*f) reached TP1 (%.*f). Fill aborted.", digits, bid, digits, tp1); return; }
   }

   if(m_trade.PositionOpen(_Symbol, orderType, lots, execPrice, sl, tp2, comment))
   {
      PrintFormat("🚀 [Aegis Market Fill] %s %0.2f lot @ %0.*f | SL: %0.*f TP1: %0.*f TP2: %0.*f",
                  typeStr, lots, digits, execPrice, digits, sl, digits, tp1, digits, tp2);
      DrawChartTradeLevels(typeStr, execPrice, sl, tp1, tp2);
      if(InpSoundAlerts) PlaySound("expert.wav");
      if(InpPushAlerts) SendNotification("Aegis Executed " + typeStr + " on " + _Symbol + " @ " + DoubleToString(execPrice, digits));
      NotifyBridgeOrderEvent(orderId, "FILL", execPrice, 0.0);
   }
   else
   {
      Print("❌ [Aegis] Order Failed: ", GetLastError());
   }
}

//+------------------------------------------------------------------+
//| Manage active positions: TP1 50% partial close & Breakeven SL    |
//+------------------------------------------------------------------+
void ManageActivePositions()
{
   double pipMult = GetPipMultiplier();
   int digits = (int)SymbolInfoInteger(_Symbol, SYMBOL_DIGITS);

   for(int i = PositionsTotal() - 1; i >= 0; i--)
   {
      if(m_position.SelectByIndex(i))
      {
         if(m_position.Symbol() == _Symbol && m_position.Magic() == InpMagicNumber)
         {
            ulong ticket = m_position.Ticket();
            double openPrice = m_position.PriceOpen();
            double currentPrice = m_position.PriceCurrent();
            double currentSL = m_position.StopLoss();
            double volume = m_position.Volume();
            bool isBuy = (m_position.PositionType() == POSITION_TYPE_BUY);

            // 1. Check TP1 Partial Close (50%) or Breakeven Protection for 0.01 Lot
            if(m_lastOrderTP1 > 0)
            {
               bool isTp1Reached = isBuy ? (currentPrice >= m_lastOrderTP1) : (currentPrice <= m_lastOrderTP1);
               if(isTp1Reached)
               {
                  if(volume >= 0.02)
                  {
                     double closeVol = NormalizeDouble(volume * 0.5, 2);
                     if(m_trade.PositionClosePartial(ticket, closeVol))
                     {
                        Print("🎯 [Aegis] TP1 Hit! Closed 50% (", closeVol, " lot). Moving SL to Breakeven.");
                        // Move SL to Breakeven (+ 1.5 pips buffer)
                        double beSL = isBuy ? openPrice + (1.5 * _Point * pipMult) : openPrice - (1.5 * _Point * pipMult);
                        beSL = NormalizeDouble(beSL, digits);
                        m_trade.PositionModify(ticket, beSL, m_position.TakeProfit());
                        NotifyBridgeOrderEvent(m_lastOrderId, "HIT_TP1", currentPrice, Math.Abs(currentPrice - openPrice) * pipMult);
                     }
                  }
                  else
                  {
                     // For 0.01 lot: evaluate InpSingleLotMode (Pillar 1)
                     if(InpSingleLotMode == SINGLE_LOT_CASH_HARVEST)
                     {
                        double pnlPoints = isBuy ? (currentPrice - openPrice) : (openPrice - currentPrice);
                        double pnlPips = pnlPoints * pipMult;
                        PrintFormat("🎯 [Aegis Single-Lot Harvest] TP1 Hit for 0.01 Lot! Fully closing to lock profit (+%.1f pips).", pnlPips);
                        if(m_trade.PositionClose(ticket))
                        {
                           NotifyBridgeOrderEvent(m_lastOrderId, "HIT_TP1", currentPrice, pnlPips);
                           continue;
                        }
                     }
                     else
                     {
                        // SINGLE_LOT_RUNNER_TRAIL: lock risk-free by moving SL to Breakeven (+1.5 pips)
                        double beSL = isBuy ? openPrice + (1.5 * _Point * pipMult) : openPrice - (1.5 * _Point * pipMult);
                        beSL = NormalizeDouble(beSL, digits);
                        bool needsMove = isBuy ? (currentSL < beSL) : (currentSL > beSL || currentSL == 0);
                        if(needsMove)
                        {
                           Print("🎯 [Aegis] TP1 Hit for 0.01 Lot! Moving SL to Breakeven (+1.5 pips) to let runner trail.");
                           m_trade.PositionModify(ticket, beSL, m_position.TakeProfit());
                           NotifyBridgeOrderEvent(m_lastOrderId, "HIT_TP1_BE", currentPrice, Math.Abs(currentPrice - openPrice) * pipMult);
                        }
                     }
                  }
               }
            }

            // 2. Dynamic Early Profit Harvesting (Lock in gains before TP when momentum stalls)
            if(InpEnableEarlyHarvest)
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
                     PrintFormat("🌾 [Aegis Early Harvest] Closing position #%I64d at +%.2fR (+%.1f pips). Reason: %s", ticket, currentR, pnlPips, harvestReason);
                     if(m_trade.PositionClose(ticket))
                     {
                        NotifyBridgeOrderEvent(m_lastOrderId, "EARLY_HARVEST", currentPrice, pnlPips);
                        continue;
                     }
                  }
               }
            }

            // 3. Trailing Stop
            if(m_lastTrailingSl > 0)
            {
               double normTrail = NormalizeDouble(m_lastTrailingSl, digits);
               bool shouldModify = isBuy ? (normTrail > currentSL && normTrail < currentPrice)
                                         : (normTrail < currentSL && normTrail > currentPrice);
               if(shouldModify)
               {
                  m_trade.PositionModify(ticket, normTrail, m_position.TakeProfit());
                  Print("🛡️ [Aegis] Adaptive Trailing SL updated to ", normTrail);
               }
            }
         }
      }
   }

   // Clear visual lines if no active positions or pending orders remain
   if(PositionsTotal() == 0 && OrdersTotal() == 0)
   {
      ClearChartTradeLevels();
   }
}

//+------------------------------------------------------------------+
//| Send event notification back to Web Bridge                       |
//+------------------------------------------------------------------+
void NotifyBridgeOrderEvent(string orderId, string action, double execPrice, double profitPips)
{
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
                                 orderId, action, _Symbol, execPrice, profitPips);
   char postData[], resultData[];
   string resultHeaders;
   StringToCharArray(payload, postData);
   WebRequest("POST", url, "Content-Type: application/json\r\n", 1500, postData, resultData, resultHeaders);
}

//+------------------------------------------------------------------+
//| Check if position is already open                                |
//+------------------------------------------------------------------+
bool HasOpenPosition(string orderId)
{
   for(int i = PositionsTotal() - 1; i >= 0; i--)
   {
      if(m_position.SelectByIndex(i))
      {
         if(m_position.Symbol() == _Symbol && m_position.Magic() == InpMagicNumber)
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
double GetPipMultiplier()
{
   if(StringFind(_Symbol, "XAU") >= 0 || StringFind(_Symbol, "GOLD") >= 0) return 10.0;
   if(StringFind(_Symbol, "JPY") >= 0) return 100.0;
   if(StringFind(_Symbol, "USDT") >= 0) return 1.0;
   return 10000.0; // Standard 5-digit Forex
}

//+------------------------------------------------------------------+
//| GUI Dashboard: Create On-Chart HUD                               |
//+------------------------------------------------------------------+
void CreateDashboardGUI()
{
   int x = InpGuiX;
   int y = InpGuiY;
   int w = 270;
   int h = 330;

   // Main Background Panel (Dark Glassmorphism)
   CreatePanel("BG", x, y, w, h, C'13,17,23', C'30,41,59', 2);

   // Header Bar
   CreatePanel("Header", x, y, w, 32, C'17,24,39', C'30,41,59', 1);
   CreateLabel("Title", x + 10, y + 8, "🛡️ AEGIS QUANT TERMINAL v2.5", "Segoe UI", 9, clrWhite, true);
   CreateButton("MinBtn", x + w - 26, y + 5, 20, 20, "─", clrLightSteelBlue, C'30,41,59');

   // Connection & Latency Status
   CreateLabel("PingLbl", x + 10, y + 38, "BRIDGE: CONNECTING...", "Consolas", 8, clrDarkGray);

   // Asset & Price
   CreateLabel("AssetLbl", x + 10, y + 56, _Symbol + "  |  SPREAD: -- pips", "Segoe UI", 9, clrSilver, true);

   // Confluence Score Box
   CreatePanel("ConfBox", x + 10, y + 78, w - 20, 52, C'20,29,45', C'37,99,235', 1);
   CreateLabel("ConfTitle", x + 18, y + 84, "CONFLUENCE SCORE & BIAS", "Segoe UI", 8, clrLightSkyBlue);
   CreateLabel("ConfScore", x + 18, y + 100, "85.0% [A+] STRONG BUY", "Segoe UI", 11, clrLimeGreen, true);

   // Milestone Tier & Capital Status
   CreateLabel("TierTitle", x + 10, y + 138, "CAPITAL & DRAWDOWN GOVERNOR:", "Segoe UI", 8, clrDodgerBlue, true);
   CreateLabel("TierVal", x + 10, y + 154, "• Tier 1: Foundation ($10-$50)", "Segoe UI", 8, clrWhite);
   CreateLabel("GovVal", x + 10, y + 170, "• DD Governor: NORMAL (100% Lot)", "Segoe UI", 8, clrLimeGreen);
   CreateLabel("MarginVal", x + 10, y + 186, "• Margin Cap: < 20% Safe", "Segoe UI", 8, clrSilver);

   // Signal Telemetry Box
   CreatePanel("SigBox", x + 10, y + 208, w - 20, 48, C'17,24,39', C'30,41,59', 1);
   CreateLabel("SigTitle", x + 18, y + 213, "ACTIVE AI SIGNAL:", "Segoe UI", 8, clrYellow);
   CreateLabel("SigDetail", x + 18, y + 230, "WAITING FOR PRIME SETUP...", "Segoe UI", 8, clrSilver);

   // Interactive Buttons (One-Click Execution & Mode Toggle)
   int btnW = (w - 28) / 3;
   CreateButton("BtnMode", x + 10, y + 266, btnW, 26, "AUTO: ON", clrWhite, C'16,185,129');
   CreateButton("BtnBuy", x + 14 + btnW, y + 266, btnW, 26, "BUY", clrWhite, C'37,99,235');
   CreateButton("BtnSell", x + 18 + (btnW * 2), y + 266, btnW, 26, "SELL", clrWhite, C'225,29,72');
   CreateButton("BtnCloseAll", x + 10, y + 296, w - 20, 22, "🛑 CLOSE ALL POSITIONS", clrOrange, C'30,41,59');

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

   // Spread
   double spreadPips = (double)SymbolInfoInteger(_Symbol, SYMBOL_SPREAD) * _Point / GetPipMultiplier();
   string assetStr = StringFormat("%s  |  SPREAD: %.1f pips", _Symbol, spreadPips);
   color assetClr = (spreadPips > InpMaxSpreadPips) ? clrRed : clrSilver;
   ObjectSetString(0, GUI_PREFIX + "AssetLbl", OBJPROP_TEXT, assetStr);
   ObjectSetInteger(0, GUI_PREFIX + "AssetLbl", OBJPROP_COLOR, assetClr);

   // Milestone Tier & Daily Drawdown Status
   ObjectSetString(0, GUI_PREFIX + "TierVal", OBJPROP_TEXT, "• " + m_lastTierName);

   string govStr = "";
   color govClr = clrLimeGreen;
   if(InpEnableDailyGuard && m_dayStartEquity > 0)
   {
      double currentEq = AccountInfoDouble(ACCOUNT_EQUITY);
      double dPnl = ((currentEq - m_dayStartEquity) / m_dayStartEquity) * 100.0;
      govStr = StringFormat("• Daily PnL: %+.1f%% (Cap: -%.1f%%)", dPnl, InpMaxDailyLossPct);
      govClr = (dPnl >= 0) ? clrLimeGreen : (dPnl <= -InpMaxDailyLossPct * 0.7) ? clrOrangeRed : clrGold;
   }
   else
   {
      govStr = StringFormat("• DD Governor: %s", m_lastGovernorStatus);
      govClr = (m_lastGovernorStatus == "NORMAL") ? clrLimeGreen : clrGold;
   }
   ObjectSetString(0, GUI_PREFIX + "GovVal", OBJPROP_TEXT, govStr);
   ObjectSetInteger(0, GUI_PREFIX + "GovVal", OBJPROP_COLOR, govClr);

   string timeStatus = IsTradingTimeAllowed() ? "OK" : "FREEZE";
   string harvestStr = InpEnableEarlyHarvest ? StringFormat("• Harvest: ON | Time: %s", timeStatus)
                                             : StringFormat("• Harvest: OFF | Time: %s", timeStatus);
   ObjectSetString(0, GUI_PREFIX + "MarginVal", OBJPROP_TEXT, harvestStr);
   ObjectSetInteger(0, GUI_PREFIX + "MarginVal", OBJPROP_COLOR, IsTradingTimeAllowed() ? clrAqua : clrOrange);

   // Signal detail
   if(m_lastOrderType != "NONE" && m_lastOrderStatus != "IDLE")
   {
      string sigText = StringFormat("%s @ %.2f | Lot: %.2f", m_lastOrderType, m_lastOrderPrice, m_lastOrderLot);
      ObjectSetString(0, GUI_PREFIX + "SigDetail", OBJPROP_TEXT, sigText);
      ObjectSetInteger(0, GUI_PREFIX + "SigDetail", OBJPROP_COLOR, (StringFind(m_lastOrderType, "BUY") >= 0) ? clrLimeGreen : clrCrimson);
   }
   else
   {
      ObjectSetString(0, GUI_PREFIX + "SigDetail", OBJPROP_TEXT, "WAITING FOR PRIME SETUP...");
      ObjectSetInteger(0, GUI_PREFIX + "SigDetail", OBJPROP_COLOR, clrSilver);
   }

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
   string assetStr = StringFormat("%s  |  SPREAD: %.1f pips", _Symbol, spreadPips);
   ObjectSetString(0, GUI_PREFIX + "AssetLbl", OBJPROP_TEXT, assetStr);
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
         }
         else if(m_currentMode == MODE_SEMI_AUTO)
         {
            m_currentMode = MODE_SIGNAL_ONLY;
            ObjectSetString(0, GUI_PREFIX + "BtnMode", OBJPROP_TEXT, "OFF");
            ObjectSetInteger(0, GUI_PREFIX + "BtnMode", OBJPROP_BGCOLOR, C'75,85,99'); // Gray
         }
         else
         {
            m_currentMode = MODE_FULL_AUTO;
            ObjectSetString(0, GUI_PREFIX + "BtnMode", OBJPROP_TEXT, "AUTO: ON");
            ObjectSetInteger(0, GUI_PREFIX + "BtnMode", OBJPROP_BGCOLOR, C'16,185,129'); // Emerald
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
   ObjectSetInteger(0, GUI_PREFIX + "BG", OBJPROP_YSIZE, minimize ? 32 : 330);
   ObjectSetString(0, GUI_PREFIX + "MinBtn", OBJPROP_TEXT, minimize ? "□" : "─");

   string elements[] = {
      "PingLbl", "AssetLbl", "ConfBox", "ConfTitle", "ConfScore",
      "TierTitle", "TierVal", "GovVal", "MarginVal", "SigBox",
      "SigTitle", "SigDetail", "BtnMode", "BtnBuy", "BtnSell", "BtnCloseAll"
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

void CreateButton(string name, int x, int y, int w, int h, string text, color clr, color bg)
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
   ObjectSetInteger(0, objName, OBJPROP_FONTSIZE, 8);
   ObjectSetInteger(0, objName, OBJPROP_COLOR, clr);
   ObjectSetInteger(0, objName, OBJPROP_BGCOLOR, bg);
   ObjectSetInteger(0, objName, OBJPROP_BORDER_COLOR, clr);
   ObjectSetInteger(0, objName, OBJPROP_CORNER, CORNER_LEFT_UPPER);
   ObjectSetInteger(0, objName, OBJPROP_SELECTABLE, false);
}

void DestroyDashboardGUI()
{
   ObjectsDeleteAll(0, GUI_PREFIX);
   ChartRedraw();
}
//+------------------------------------------------------------------+
