//+------------------------------------------------------------------+
//|                                           AI_Trend_Signal.mq5    |
//|                         AI Confluence Trend & Entry Indicator    |
//|                                  https://your-vercel-domain.app  |
//+------------------------------------------------------------------+
#property copyright "AI Market Intelligence"
#property link      "https://github.com"
#property version   "1.00"
#property indicator_chart_window
#property indicator_buffers 4
#property indicator_plots   4

//--- Plot 1: Buy Arrow
#property indicator_label1  "AI Buy Signal"
#property indicator_type1   DRAW_ARROW
#property indicator_color1  clrLimeGreen
#property indicator_width1  2

//--- Plot 2: Sell Arrow
#property indicator_label2  "AI Sell Signal"
#property indicator_type2   DRAW_ARROW
#property indicator_color2  clrCrimson
#property indicator_width2  2

//--- Plot 3: Fast EMA
#property indicator_label3  "Fast EMA (20)"
#property indicator_type3   DRAW_LINE
#property indicator_color3  clrDodgerBlue
#property indicator_width3  1

//--- Plot 4: Slow EMA
#property indicator_label4  "Slow EMA (50)"
#property indicator_type4   DRAW_LINE
#property indicator_color4  clrOrange
#property indicator_width4  1

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

//--- Indicator Handles
int hFastEMA, hSlowEMA, hTrendEMA, hRSI, hATR;
datetime lastAlertTime = 0;

//+------------------------------------------------------------------+
//| Custom indicator initialization function                         |
//+------------------------------------------------------------------+
int OnInit()
{
   SetIndexBuffer(0, BuyBuffer, INDICATOR_DATA);
   SetIndexBuffer(1, SellBuffer, INDICATOR_DATA);
   SetIndexBuffer(2, FastEMABuffer, INDICATOR_DATA);
   SetIndexBuffer(3, SlowEMABuffer, INDICATOR_DATA);

   PlotIndexSetInteger(0, PLOT_ARROW, 233); // Wingdings Up Arrow
   PlotIndexSetInteger(1, PLOT_ARROW, 234); // Wingdings Down Arrow

   PlotIndexSetDouble(0, PLOT_EMPTY_VALUE, EMPTY_VALUE);
   PlotIndexSetDouble(1, PLOT_EMPTY_VALUE, EMPTY_VALUE);

   // Create Handles
   hFastEMA  = iMA(_Symbol, _Period, FastEMA_Period, 0, MODE_EMA, PRICE_CLOSE);
   hSlowEMA  = iMA(_Symbol, _Period, SlowEMA_Period, 0, MODE_EMA, PRICE_CLOSE);
   hTrendEMA = iMA(_Symbol, _Period, TrendEMA_Period, 0, MODE_EMA, PRICE_CLOSE);
   hRSI      = iRSI(_Symbol, _Period, RSI_Period, PRICE_CLOSE);
   hATR      = iATR(_Symbol, _Period, 14);

   if(hFastEMA == INVALID_HANDLE || hSlowEMA == INVALID_HANDLE || hTrendEMA == INVALID_HANDLE || hRSI == INVALID_HANDLE)
   {
      Print("Failed to create indicator handles");
      return(INIT_FAILED);
   }

   IndicatorSetString(INDICATOR_SHORTNAME, "AI Trend & Entry Signal (MT5)");

   return(INIT_SUCCEEDED);
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

   double fastMA[], slowMA[], trendMA[], rsi[], atr[];
   ArraySetAsSeries(fastMA, true);
   ArraySetAsSeries(slowMA, true);
   ArraySetAsSeries(trendMA, true);
   ArraySetAsSeries(rsi, true);
   ArraySetAsSeries(atr, true);
   ArraySetAsSeries(time, true);
   ArraySetAsSeries(high, true);
   ArraySetAsSeries(low, true);
   ArraySetAsSeries(close, true);

   if(CopyBuffer(hFastEMA, 0, 0, limit + 2, fastMA) <= 0) return(0);
   if(CopyBuffer(hSlowEMA, 0, 0, limit + 2, slowMA) <= 0) return(0);
   if(CopyBuffer(hTrendEMA, 0, 0, limit + 2, trendMA) <= 0) return(0);
   if(CopyBuffer(hRSI, 0, 0, limit + 2, rsi) <= 0) return(0);
   if(CopyBuffer(hATR, 0, 0, limit + 2, atr) <= 0) return(0);

   for(int i = limit - 1; i >= 0; i--)
   {
      int bufIdx = rates_total - 1 - i;
      FastEMABuffer[bufIdx] = fastMA[i];
      SlowEMABuffer[bufIdx] = slowMA[i];
      BuyBuffer[bufIdx]     = EMPTY_VALUE;
      SellBuffer[bufIdx]    = EMPTY_VALUE;

      // Buy Confluence
      if(close[i] > trendMA[i] && fastMA[i+1] <= slowMA[i+1] && fastMA[i] > slowMA[i] && rsi[i] >= RSI_Buy_Threshold)
      {
         BuyBuffer[bufIdx] = low[i] - (atr[i] * 0.5);

         if(i == 0 && time[0] != lastAlertTime && Enable_Alerts)
         {
            lastAlertTime = time[0];
            string msg = "🟢 AI BUY SIGNAL: " + _Symbol + " on " + EnumToString(_Period) + 
                         " | Entry: " + DoubleToString(close[0], _Digits) + 
                         " | SL: " + DoubleToString(close[0] - (atr[0] * ATR_Multiplier_SL), _Digits) + 
                         " | TP: " + DoubleToString(close[0] + (atr[0] * ATR_Multiplier_TP), _Digits);
            Alert(msg);
            if(Enable_Sound) PlaySound("alert.wav");
            if(Enable_Mobile_Push) SendNotification(msg);
         }
      }

      // Sell Confluence
      if(close[i] < trendMA[i] && fastMA[i+1] >= slowMA[i+1] && fastMA[i] < slowMA[i] && rsi[i] <= RSI_Sell_Threshold)
      {
         SellBuffer[bufIdx] = high[i] + (atr[i] * 0.5);

         if(i == 0 && time[0] != lastAlertTime && Enable_Alerts)
         {
            lastAlertTime = time[0];
            string msg = "🔴 AI SELL SIGNAL: " + _Symbol + " on " + EnumToString(_Period) + 
                         " | Entry: " + DoubleToString(close[0], _Digits) + 
                         " | SL: " + DoubleToString(close[0] + (atr[0] * ATR_Multiplier_SL), _Digits) + 
                         " | TP: " + DoubleToString(close[0] - (atr[0] * ATR_Multiplier_TP), _Digits);
            Alert(msg);
            if(Enable_Sound) PlaySound("alert.wav");
            if(Enable_Mobile_Push) SendNotification(msg);
         }
      }
   }

   return(rates_total);
}
//+------------------------------------------------------------------+