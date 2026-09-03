//+------------------------------------------------------------------+
//|                                           AI_Trend_Signal.mq4    |
//|                         AI Confluence Trend & Entry Indicator    |
//|                                  https://your-vercel-domain.app  |
//+------------------------------------------------------------------+
#property copyright "AI Market Intelligence"
#property link      "https://github.com"
#property version   "1.00"
#property strict
#property indicator_chart_window
#property indicator_buffers 4
#property indicator_color1 clrLimeGreen   // Buy Arrow
#property indicator_color2 clrCrimson     // Sell Arrow
#property indicator_color3 clrDodgerBlue  // Fast EMA
#property indicator_color4 clrOrange      // Slow EMA

#property indicator_width1 2
#property indicator_width2 2
#property indicator_width3 1
#property indicator_width4 1

//--- Input Parameters
input string   _Header1_             = "=== INDICATOR SETTINGS ===";
input int      FastEMA_Period        = 20;            // Fast EMA Period
input int      SlowEMA_Period        = 50;            // Slow EMA Period
input int      TrendEMA_Period       = 200;           // Major Trend EMA Period
input int      RSI_Period            = 14;            // RSI Period
input double   RSI_Buy_Threshold     = 52.0;          // RSI Bullish Level
input double   RSI_Sell_Threshold    = 48.0;          // RSI Bearish Level
input double   ATR_Multiplier_SL     = 1.5;           // ATR Multiplier for Stop Loss
input double   ATR_Multiplier_TP     = 2.5;           // ATR Multiplier for Take Profit

input string   _Header2_             = "=== ALERT SETTINGS ===";
input bool     Enable_Alerts         = true;          // Popup Alerts
input bool     Enable_Sound          = true;          // Sound Alerts
input bool     Enable_Mobile_Push    = false;         // Mobile Push Notification

//--- Indicator Buffers
double BuyBuffer[];
double SellBuffer[];
double FastEMABuffer[];
double SlowEMABuffer[];

datetime lastAlertTime = 0;

//+------------------------------------------------------------------+
//| Custom indicator initialization function                         |
//+------------------------------------------------------------------+
int OnInit()
{
   // Indicator Buffers
   SetIndexBuffer(0, BuyBuffer);
   SetIndexBuffer(1, SellBuffer);
   SetIndexBuffer(2, FastEMABuffer);
   SetIndexBuffer(3, SlowEMABuffer);

   // Buy Arrow Style (Wingdings 233 = Arrow Up)
   SetIndexStyle(0, DRAW_ARROW, EMPTY, 2, clrLimeGreen);
   SetIndexArrow(0, 233);

   // Sell Arrow Style (Wingdings 234 = Arrow Down)
   SetIndexStyle(1, DRAW_ARROW, EMPTY, 2, clrCrimson);
   SetIndexArrow(1, 234);

   // EMA Line Styles
   SetIndexStyle(2, DRAW_LINE, STYLE_SOLID, 1, clrDodgerBlue);
   SetIndexStyle(3, DRAW_LINE, STYLE_SOLID, 1, clrOrange);

   IndicatorShortName("AI Trend & Entry Signal");

   return(INIT_SUCCEEDED);
}

//+------------------------------------------------------------------+
//| Custom indicator deinitialization function                       |
//+------------------------------------------------------------------+
void OnDeinit(const int reason)
{
   ObjectsDeleteAll(0, "AI_Panel_");
}

//+------------------------------------------------------------------+
//| Draw On-Screen Dashboard Panel                                   |
//+------------------------------------------------------------------+
void DrawDashboard(string trend, string signal, double rsi, double sl, double tp)
{
   string prefix = "AI_Panel_";
   int x = 20, y = 30;

   // Background Box
   if(ObjectFind(0, prefix + "BG") < 0)
   {
      ObjectCreate(0, prefix + "BG", OBJ_RECTANGLE_LABEL, 0, 0, 0);
      ObjectSetInteger(0, prefix + "BG", OBJPROP_XDISTANCE, x);
      ObjectSetInteger(0, prefix + "BG", OBJPROP_YDISTANCE, y);
      ObjectSetInteger(0, prefix + "BG", OBJPROP_XSIZE, 220);
      ObjectSetInteger(0, prefix + "BG", OBJPROP_YSIZE, 130);
      ObjectSetInteger(0, prefix + "BG", OBJPROP_BGCOLOR, C'15,18,26');
      ObjectSetInteger(0, prefix + "BG", OBJPROP_BORDER_COLOR, C'42,46,57');
      ObjectSetInteger(0, prefix + "BG", OBJPROP_CORNER, CORNER_LEFT_UPPER);
   }

   // Title Label
   string text = "🤖 AI CONFLUENCE SIGNAL";
   if(ObjectFind(0, prefix + "Title") < 0)
   {
      ObjectCreate(0, prefix + "Title", OBJ_LABEL, 0, 0, 0);
      ObjectSetInteger(0, prefix + "Title", OBJPROP_XDISTANCE, x + 10);
      ObjectSetInteger(0, prefix + "Title", OBJPROP_YDISTANCE, y + 10);
      ObjectSetInteger(0, prefix + "Title", OBJPROP_COLOR, clrDodgerBlue);
      ObjectSetString(0, prefix + "Title", OBJPROP_FONT, "Arial Bold");
      ObjectSetInteger(0, prefix + "Title", OBJPROP_FONTSIZE, 9);
   }
   ObjectSetString(0, prefix + "Title", OBJPROP_TEXT, text);

   // Status Label
   string info = "Trend: " + trend + "\n" +
                 "RSI(14): " + DoubleToString(rsi, 1) + "\n" +
                 "Signal: " + signal + "\n" +
                 "Est. SL: " + DoubleToString(sl, Digits) + "\n" +
                 "Est. TP: " + DoubleToString(tp, Digits);

   if(ObjectFind(0, prefix + "Info") < 0)
   {
      ObjectCreate(0, prefix + "Info", OBJ_LABEL, 0, 0, 0);
      ObjectSetInteger(0, prefix + "Info", OBJPROP_XDISTANCE, x + 10);
      ObjectSetInteger(0, prefix + "Info", OBJPROP_YDISTANCE, y + 30);
      ObjectSetInteger(0, prefix + "Info", OBJPROP_COLOR, clrWhite);
      ObjectSetString(0, prefix + "Info", OBJPROP_FONT, "Courier New");
      ObjectSetInteger(0, prefix + "Info", OBJPROP_FONTSIZE, 8);
   }
   ObjectSetString(0, prefix + "Info", OBJPROP_TEXT, info);
}

//+------------------------------------------------------------------+
//| Custom indicator iteration function                              |
//+------------------------------------------------------------------+
int OnCalculate(const int rates_total,
                const int prev_calculated,
                const datetime &time[],
                const double &open[],
                const double &high[],
                const double &low[],
                const double &close[],
                const long &tick_volume[],
                const long &volume[],
                const int &spread[])
{
   if(rates_total < TrendEMA_Period) return(0);

   int limit = rates_total - prev_calculated;
   if(prev_calculated > 0) limit++;

   for(int i = limit - 1; i >= 0; i--)
   {
      // Calculate EMAs
      double fastEMA = iMA(NULL, 0, FastEMA_Period, 0, MODE_EMA, PRICE_CLOSE, i);
      double slowEMA = iMA(NULL, 0, SlowEMA_Period, 0, MODE_EMA, PRICE_CLOSE, i);
      double trendEMA = iMA(NULL, 0, TrendEMA_Period, 0, MODE_EMA, PRICE_CLOSE, i);

      FastEMABuffer[i] = fastEMA;
      SlowEMABuffer[i] = slowEMA;

      // Previous values for crossover check
      double prevFast = iMA(NULL, 0, FastEMA_Period, 0, MODE_EMA, PRICE_CLOSE, i + 1);
      double prevSlow = iMA(NULL, 0, SlowEMA_Period, 0, MODE_EMA, PRICE_CLOSE, i + 1);

      // RSI & ATR
      double rsi = iRSI(NULL, 0, RSI_Period, PRICE_CLOSE, i);
      double atr = iATR(NULL, 0, 14, i);

      BuyBuffer[i] = EMPTY_VALUE;
      SellBuffer[i] = EMPTY_VALUE;

      // --- BUY SIGNAL CONFLUENCE ---
      // 1. Price above 200 EMA (Major Uptrend)
      // 2. Fast EMA crosses above Slow EMA
      // 3. RSI confirms bullish momentum (> 50)
      if(close[i] > trendEMA && prevFast <= prevSlow && fastEMA > slowEMA && rsi >= RSI_Buy_Threshold)
      {
         BuyBuffer[i] = low[i] - (atr * 0.5);

         if(i == 0 && time[0] != lastAlertTime && Enable_Alerts)
         {
            lastAlertTime = time[0];
            string msg = "🟢 AI BUY SIGNAL: " + Symbol() + " on " + EnumToString((ENUM_TIMEFRAMES)Period()) + 
                         " | Entry: " + DoubleToString(close[0], Digits) + 
                         " | SL: " + DoubleToString(close[0] - (atr * ATR_Multiplier_SL), Digits) + 
                         " | TP: " + DoubleToString(close[0] + (atr * ATR_Multiplier_TP), Digits);
            Alert(msg);
            if(Enable_Sound) PlaySound("alert.wav");
            if(Enable_Mobile_Push) SendNotification(msg);
         }
      }

      // --- SELL SIGNAL CONFLUENCE ---
      // 1. Price below 200 EMA (Major Downtrend)
      // 2. Fast EMA crosses below Slow EMA
      // 3. RSI confirms bearish momentum (< 50)
      if(close[i] < trendEMA && prevFast >= prevSlow && fastEMA < slowEMA && rsi <= RSI_Sell_Threshold)
      {
         SellBuffer[i] = high[i] + (atr * 0.5);

         if(i == 0 && time[0] != lastAlertTime && Enable_Alerts)
         {
            lastAlertTime = time[0];
            string msg = "🔴 AI SELL SIGNAL: " + Symbol() + " on " + EnumToString((ENUM_TIMEFRAMES)Period()) + 
                         " | Entry: " + DoubleToString(close[0], Digits) + 
                         " | SL: " + DoubleToString(close[0] + (atr * ATR_Multiplier_SL), Digits) + 
                         " | TP: " + DoubleToString(close[0] - (atr * ATR_Multiplier_TP), Digits);
            Alert(msg);
            if(Enable_Sound) PlaySound("alert.wav");
            if(Enable_Mobile_Push) SendNotification(msg);
         }
      }
   }

   // Update Dashboard Values on current bar
   double curTrendEMA = iMA(NULL, 0, TrendEMA_Period, 0, MODE_EMA, PRICE_CLOSE, 0);
   double curRSI = iRSI(NULL, 0, RSI_Period, PRICE_CLOSE, 0);
   double curATR = iATR(NULL, 0, 14, 0);
   string curTrend = close[0] > curTrendEMA ? "BULLISH (UPTREND)" : "BEARISH (DOWNTREND)";
   string curSignal = "NEUTRAL / SCANNING";
   double estSL = 0, estTP = 0;

   if(close[0] > curTrendEMA && FastEMABuffer[0] > SlowEMABuffer[0])
   {
      curSignal = "BUY BIAS";
      estSL = close[0] - (curATR * ATR_Multiplier_SL);
      estTP = close[0] + (curATR * ATR_Multiplier_TP);
   }
   else if(close[0] < curTrendEMA && FastEMABuffer[0] < SlowEMABuffer[0])
   {
      curSignal = "SELL BIAS";
      estSL = close[0] + (curATR * ATR_Multiplier_SL);
      estTP = close[0] - (curATR * ATR_Multiplier_TP);
   }

   DrawDashboard(curTrend, curSignal, curRSI, estSL, estTP);

   return(rates_total);
}
//+------------------------------------------------------------------+