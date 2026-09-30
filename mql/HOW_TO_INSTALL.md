# 🤖 คู่มือการติดตั้ง Aegis Quant Terminal Expert Advisor (EA) บน MetaTrader 5 (MT5)

> **Aegis Quant Terminal EA v3.0 Master Edition** คือระบบบอทเทรดอัตโนมัติความเร็วสูง เชื่อมต่อตรงกับ Aegis Quant Terminal ผ่าน WebRequest API ออกแบบมาสำหรับ **MetaTrader 5 (MT5) เท่านั้น** พร้อมรองรับ 5 เสาหลักสถาบัน (5-Pillar Institutional Confluence Matrix), เกราะป้องกันข่าวเศรษฐกิจ **Forex Factory Red Folder News Shield**, ระบบซิงค์ 0ms **OnTradeTransaction**, การส่งคำสั่งแบบ **Smart Retry Execution Engine**, ระบบเทรดหลายสินทรัพย์จากกราฟเดียว **One-Chart Multi-Symbol Engine**, และหน้าต่าง **On-Chart GUI Dashboard v3.0**

---

## 📦 สรุปฟีเจอร์ระดับสถาบัน 5 เสาหลัก (v3.0 Master)

1. **📰 Forex Factory News Shield & Pre-News Auto-Breakeven:**
   - ดึงปฏิทินข่าวความรุนแรงสูง (กล่องแดง/ส้ม) สดจาก Forex Factory ผ่าน Web Bridge
   - ก่อนข่าวออก 15 นาที (`InpNewsPreFreezeMins`): หยุดรับคำสั่งใหม่ทันทีเพื่อเลี่ยงสเปรดถ่าง
   - เลื่อน Stop Loss ของทุกไม้ที่ถืออยู่ไปที่จุดเสมอตัวบวกบัฟเฟอร์ (**Breakeven + 1.5 pips**) ล็อคความเสี่ยง 0% ก่อนข่าวกระชาก
   - รองรับโหมด **Post-News Turtle Soup Sniper**: รอให้ข่าวกระชากกวาด Liquidity จบแล้วยิงสไนเปอร์สวนกลับด้วย Micro-SL แคบพิเศษ

2. **⚡ OnTradeTransaction 0ms Event-Driven Sync:**
   - ใช้ Native Event Handler ของ MT5 ดักจับการปิดออเดอร์ (ชน TP, ชน SL, หรือ Stop Out) ทันทีในระดับ 0ms
   - ซิงค์ประวัติ PnL และสถานะกลับไปยัง Web Bridge และ Telegram อัตโนมัติโดยไม่ต้องรอรอบโพลลิ่ง

3. **🔄 Smart Retry Execution Engine:**
   - แก้ปัญหาคำสั่งหลุดจากโบรกเกอร์ (Requote Code 10004, Off Quotes 10018, Common Error 2)
   - วนลูปส่งคำสั่งซ้ำอัตโนมัติสูงสุด 3 รอบ (`InpMaxOrderRetries`) พร้อมหน่วงเวลา Exponential Backoff (`InpRetryDelayMs`) และรีเฟรชราคา Tick สดก่อนส่งใหม่

4. **🌐 One-Chart Multi-Symbol Engine:**
   - เปิดกราฟเดียว (เช่น XAUUSD) แต่สามารถมอนิเตอร์และสั่งเปิด/ปิดออเดอร์ได้สูงสุด 8 คู่เงินพร้อมกัน (`InpWatchlistSymbols`: `XAUUSD,EURUSD,GBPUSD,USDJPY,BTCUSD,USOIL`)
   - ไม่ต้องเปิด 8 หน้าต่างกราฟให้เปลืองแรมและ CPU

5. **💰 Milestone Compounding & Drawdown Governor:**
   - คำนวณ Lot ปลอดภัยตามขนาดทุน ($10 ปั้นสู่ $100, $1,000, $10,000+)
   - มีระบบจำกัด Margin สูงสุดไม่เกิน 20% และมี Circuit Breaker ตัดขาดทุนรายวันปกป้องพอร์ต

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

### 3. คอมไพล์ (Compile) ใน MetaEditor
1. กลับมาที่หน้าต่าง MT5 ➔ กดปุ่ม **F4** เพื่อเปิดโปรแกรม **MetaEditor**
2. ในแถบ Navigator ทางซ้าย ดับเบิ้ลคลิกเปิดไฟล์ `Experts/Aegis_Quant_Terminal.mq5`
3. กดปุ่ม **Compile** (หรือกดปุ่ม `F7`)
   - รอจนขึ้น `0 errors, 0 warnings` ในหน้าต่างด้านล่าง
4. ปิด MetaEditor แล้วกลับมาที่ MT5

---

### 4. นำ EA ลากลงกราฟและเริ่มใช้งาน
1. เปิดกราฟคู่เงินที่ต้องการเทรด (เช่น **XAUUSD** แนะนำ Timeframe **15M** หรือ **1H**)
2. ในหน้าต่าง Navigator ของ MT5 ➔ คลิกขวาที่ **Expert Advisors ➔ Refresh**
3. ดับเบิ้ลคลิกหรือลาก **`Aegis_Quant_Terminal`** ลงบนกราฟ
4. ในแท็บ **Inputs**:
   - ตรวจสอบช่อง **InpServerUrl** ให้ตรงกับ URL ของคุณ (เช่น `http://localhost:3000` หรือ `https://...`)
   - หากต้องการให้กราฟเดียวเทรดทุกสินทรัพย์ ให้ตั้งค่า `InpOneChartMultiSymbol = true`
   - ตรวจสอบ `InpEnableNewsShield = true` เพื่อเปิดเกราะป้องกันข่าวเศรษฐกิจ
5. กดปุ่ม **OK**
6. ตรวจสอบให้แน่ใจว่าปุ่ม **Algo Trading** (รูปรถบนแถบเครื่องมือ MT5) เป็น **สีเขียว**

---

## 🎨 การอ่านค่าหน้าต่าง On-Chart GUI Dashboard v3.0

เมื่อ EA เริ่มทำงาน จะมีหน้าต่าง HUD สไตล์ Dark Glassmorphism ปรากฏขึ้นบนกราฟ:

- **🟢 BRIDGE: ONLINE (xx ms)** — สถานะการเชื่อมต่อแบบเรียลไทม์กับเว็บเทอร์มินัล
- **📰 FF NEWS: SAFE / CAUTION / RED NEWS IN xx m** — แสดงสถานะเกราะป้องกันข่าว Forex Factory พร้อมเวลานับถอยหลัง
- **📊 CONFLUENCE SCORE & BIAS** — แสดงคะแนนและเกรดสัญญาณ 5 เสาหลัก เช่น `85.0% [A+] STRONG BUY`
- **💰 CAPITAL & DRAWDOWN GOVERNOR** — แสดงระดับ Tier พอร์ตปัจจุบัน และสถานะตัวลดความเสี่ยง Governor
- **ปุ่ม `[ ─ ]` (Minimize)** — พับหน้าต่างเหลือเพียงแถบเล็ก เพื่อดูกราฟราคาเต็มตา
- **ปุ่ม `[ AUTO: ON ]`** — คลิกเพื่อสลับโหมด:
  - `AUTO: ON` (สีเขียว): ยิงออเดอร์และบริหารไม้ TP1/TP2 ให้อัตโนมัติ 100%
  - `SEMI: ON` (สีส้ม): รอสัญญาณแล้วแจ้งเตือน รอกดปุ่มยืนยัน
  - `OFF` (สีเทา): ปิดระบบการเทรดอัตโนมัติ เหลือเฉพาะโหมดวิเคราะห์
- **ปุ่ม `[ BUY ]` / `[ SELL ]`** — ส่งคำสั่งทันทีด้วยขนาด Lot ปลอดภัยที่ AI คำนวณให้
- **ปุ่ม `[ 🛑 CLOSE ALL ]`** — ปุ่มตัดขาดทุนฉุกเฉิน ปิดทุก Position ของ EA ในคลิกเดียว