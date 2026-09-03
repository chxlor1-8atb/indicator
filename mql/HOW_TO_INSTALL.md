# 📈 วิธีการติดตั้ง Custom Indicator ใน MT4 และ MT5

โฟลเดอร์นี้มีไฟล์ Indicator สำหรับนำไปใช้บน MetaTrader 4 และ MetaTrader 5 โดยตรง:
- `AI_Trend_Signal.mq4` (สำหรับ MT4)
- `AI_Trend_Signal.mq5` (สำหรับ MT5)

---

## 📌 ฟีเจอร์ของ Indicator บน MT4/MT5:
1. **ลูกศรจุดเข้าซื้อ-ขายอัตโนมัติ (Buy/Sell Arrows)**:
   - 🟢 **ลูกศรสีเขียว (Buy)**: เมื่อเกิด Trend ขาขึ้น + Crossover + RSI ยืนยัน Momentum
   - 🔴 **ลูกศรสีแดง (Sell)**: เมื่อเกิด Trend ขาลง + Crossover + RSI ยืนยัน Momentum
2. **On-Screen Dashboard Box** (บน MT4): แสดงสถานะ Trend ปัจจุบัน, ค่า RSI, สัญญาณ Bias, ราคา Stop Loss (SL) และ Take Profit (TP) อัตโนมัติตาม ATR
3. **ระบบแจ้งเตือน (Alerts)**: มีทั้งหน้าต่าง Pop-up Alert, เสียงเตือน, และ Push Notification เข้าแอป MT4/MT5 บนมือถือ

---

## 🛠️ ขั้นตอนการติดตั้งบน MetaTrader 4 (MT4):
1. เปิดโปรแกรม **MT4**
2. ไปที่เมนู **File ➔ Open Data Folder** (แฟ้ม ➔ เปิดโฟลเดอร์ข้อมูล)
3. ดับเบิ้ลคลิกเข้าโฟลเดอร์ **`MQL4` ➔ `Indicators`**
4. คัดลอกไฟล์ `AI_Trend_Signal.mq4` ไปวางในโฟลเดอร์นี้
5. กลับมาที่หน้าต่าง Navigator ใน MT4 แล้วคลิกขวาที่เมนู **Indicators ➔ กด Refresh** (หรือกดปุ่ม F4 เปิด MetaEditor แล้วกดปุ่ม **Compile**)
6. ลาก Indicator **AI_Trend_Signal** ใส่บนกราฟคู่เงินที่ต้องการได้ทันที!

---

## 🛠️ ขั้นตอนการติดตั้งบน MetaTrader 5 (MT5):
1. เปิดโปรแกรม **MT5**
2. ไปที่เมนู **File ➔ Open Data Folder**
3. เข้าโฟลเดอร์ **`MQL5` ➔ `Indicators`**
4. คัดลอกไฟล์ `AI_Trend_Signal.mq5` ไปวางในโฟลเดอร์นี้
5. กดปุ่ม **F4** (เปิด MetaEditor) เปิดไฟล์แล้วกดปุ่ม **Compile**
6. ลาก Indicator ใส่บนกราฟ MT5 ใช้งานได้ทันที!