# 🤖 คู่มือการติดตั้ง Aegis Quant Terminal Expert Advisor (EA) บน MetaTrader 5 (MT5)

> **Aegis Quant Terminal EA v2.5** คือระบบบอทเทรดอัตโนมัติเชื่อมต่อตรงกับ Aegis Quant Terminal ผ่าน WebRequest API รองรับการเทรดแบบ 5 เสาหลักสถาบัน (Confluence Matrix), ระบบสเกลพอร์ต Milestone Compounding ($10-$50 ฯลฯ), เกราะลดความเสี่ยง Drawdown Governor, และหน้าต่าง **On-Chart GUI Dashboard** สวยงามบนกราฟ MT5

---

## 📦 รายการไฟล์ในระบบ (`mql/`)

1. **`Aegis_Quant_Terminal.mq5`** — ไฟล์โค้ด EA หลักสำหรับ MT5 (พร้อม On-Chart GUI)
2. **`Aegis_XAUUSD_Cent.set`** — ไฟล์พรีเซ็ตตั้งค่าสำหรับทองคำ (XAUUSD) ในบัญชี Cent ($10 - $50)
3. **`Aegis_Forex_Standard.set`** — ไฟล์พรีเซ็ตตั้งค่าสำหรับคู่เงิน Forex ในบัญชี Standard ($100+)
4. **`AI_Trend_Signal.mq4 / mq5`** — Indicator เสริมสำหรับวาดลูกศรและ Ribbon บนกราฟ

---

## 🚀 ขั้นตอนการติดตั้ง 4 สเต็ป (Quick Setup Guide)

### 1. เปิดสิทธิ์ WebRequest ใน MetaTrader 5 (สำคัญที่สุด ⚠️)
เพื่อให้ EA สามารถดึงสัญญาณและส่งคำสั่งเชื่อมต่อกับ Web Terminal ได้:
1. เปิดโปรแกรม **MT5** ➔ ไปที่เมนู **Tools ➔ Options** (หรือกด `Ctrl + O`)
2. คลิกแท็บ **Expert Advisors**
3. ติ๊กเครื่องหมายถูกที่ช่อง:
   - ✅ **Allow Algo Trading** (อนุญาตการเทรดอัตโนมัติ)
   - ✅ **Allow WebRequest for listed URL** (อนุญาตการส่ง WebRequest)
4. ดับเบิ้ลคลิกเพิ่ม URL ของ Web Terminal เช่น:
   ```
   http://localhost:3000
   ```
   *(หรือใส่ URL โดเมน Vercel ของคุณ เช่น `https://your-aegis-domain.vercel.app`)*
5. กด **OK** บันทึกการตั้งค่า

---

### 2. นำไฟล์ EA ไปวางในโฟลเดอร์ MT5
1. ในโปรแกรม MT5 ➔ ไปที่เมนู **File ➔ Open Data Folder** (แฟ้ม ➔ เปิดโฟลเดอร์ข้อมูล)
2. ดับเบิ้ลคลิกเข้าไปที่โฟลเดอร์:
   ```
   MQL5 ➔ Experts
   ```
3. คัดลอกไฟล์ **`Aegis_Quant_Terminal.mq5`** ไปวางในโฟลเดอร์นี้
4. นำไฟล์พรีเซ็ต `.set` ไปวางในโฟลเดอร์:
   ```
   MQL5 ➔ Presets
   ```

---

### 3. คอมไพล์ (Compile) และเริ่มใช้งาน EA
1. กลับมาที่หน้าต่าง MT5 ➔ กดปุ่ม **F4** เพื่อเปิดโปรแกรม **MetaEditor**
2. ในแถบ Navigator ทางซ้าย ดับเบิ้ลคลิกเปิดไฟล์ `Experts/Aegis_Quant_Terminal.mq5`
3. กดปุ่ม **Compile** (หรือกดปุ่ม `F7`)
   - รอจนขึ้น `0 errors, 0 warnings` ในหน้าต่างด้านล่าง
4. ปิด MetaEditor แล้วกลับมาที่ MT5
5. เปิดกราฟคู่เงินที่ต้องการเทรด (เช่น **XAUUSD** หรือ **EURUSD** แนะนำ Timeframe **1H** หรือ **15M**)
6. ในหน้าต่าง Navigator ของ MT5 ➔ คลิกขวาที่ **Expert Advisors ➔ Refresh**
7. ดับเบิ้ลคลิกหรือลาก **`Aegis_Quant_Terminal`** ลงบนกราฟ
8. ในหน้าต่าง Input parameters:
   - สามารถกดปุ่ม **Load** เพื่อเลือกไฟล์พรีเซ็ต `.set` ที่ต้องการ
   - ตรวจสอบช่อง **InpServerUrl** ให้ตรงกับ URL ของ Terminal ของคุณ
9. กดปุ่ม **OK**
10. ตรวจสอบให้แน่ใจว่าปุ่ม **Algo Trading** (รูปรถบนแถบเครื่องมือ MT5) เป็น **สีเขียว**

---

## 🎨 การใช้งานหน้าต่าง On-Chart GUI Dashboard บนกราฟ

เมื่อ EA เริ่มทำงาน จะมีหน้าต่าง Dashboard สไตล์ Dark Glassmorphism ปรากฏขึ้นบนกราฟ:

- **🟢 BRIDGE: ONLINE (xx ms)** — แสดงสถานะการเชื่อมต่อแบบเรียลไทม์กับเว็บเทอร์มินัล
- **📊 CONFLUENCE SCORE & BIAS** — แสดงคะแนนและเกรดสัญญาณ 5 เสาหลัก เช่น `85.0% [A+] STRONG BUY`
- **💰 CAPITAL & DRAWDOWN GOVERNOR** — แสดงระดับ Tier พอร์ตปัจจุบัน และสถานะตัวลดความเสี่ยง Governor
- **ปุ่ม `[ ─ ]` (Minimize)** — กดพับหน้าต่างเหลือเพียงแถบเล็ก เพื่อดูกราฟราคาเต็มตา
- **ปุ่ม `[ AUTO: ON ]`** — คลิกเพื่อสลับโหมด:
  - `AUTO: ON` (สีเขียว): ยิงออเดอร์และบริหารไม้ TP1/TP2 ให้อัตโนมัติ 100%
  - `SEMI: ON` (สีส้ม): รอสัญญาณแล้วแจ้งเตือน รอกดปุ่มยืนยัน
  - `OFF` (สีเทา): ปิดระบบการเทรดอัตโนมัติ เหลือเฉพาะโหมดวิเคราะห์
- **ปุ่ม `[ BUY ]` / `[ SELL ]`** — กดส่งคำสั่งทันทีด้วยขนาด Lot ปลอดภัยที่ AI คำนวณให้
- **ปุ่ม `[ 🛑 CLOSE ALL ]`** — ปุ่มตัดขาดทุนฉุกเฉิน ปิดทุก Position ของ EA ในคลิกเดียว

---

## 🛡️ กลไกความปลอดภัยของ EA (Built-in Risk Shields)
1. **Spread Protection:** หากสเปรดถ่างเกินค่า `InpMaxSpreadPips` (เช่น ช่วงข่าวดอกเบี้ยหรือทองกระชาก) EA จะปฏิเสธการส่งออเดอร์ทันที
2. **Margin Ceiling Cap:** คำนวณ Margin ล่วงหน้า ล็อคไม่ให้ใช้ Margin เกิน 20% ของ Free Margin เด็ดขาด
3. **TP1 Partial Close (50%):** เมื่อกำไรถึง TP1 บอทจะปิดทำกำไรครึ่งหนึ่งทันที และย้าย Stop Loss มาที่จุดเท่าทุน (Breakeven + 1.5 pips buffer) ทำให้ออเดอร์ที่เหลือกลายเป็น **Risk-Free Trade**
4. **Adaptive Trailing Stop:** ขยับ Stop Loss ล็อคกำไรตามระยะ ATR ไหลไปหาเป้า TP2