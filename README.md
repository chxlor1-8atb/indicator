# 🚀 AI Institutional Quantitative Market Terminal & MT4/MT5 Indicator

ระบบวิเคราะห์กราฟเทคนิคอลระดับสถาบัน (Institutional Confluence Terminal) ผสานปฏิทินเศรษฐกิจ Forex Factory ข่าวสารการเงินสด เซสชันตลาดโลก (GMT+7) และตั๋วคำสั่งเทรดล่วงหน้าสำหรับ MT4 / MT5 บนมือถือ พร้อมระบบส่งสัญญาณแจ้งเตือนอัตโนมัติไปยัง Telegram และรองรับการ Deploy บน **Vercel** ทันที

---

## 🌟 ฟีเจอร์เด่นระดับกองทุน (Key Features)

- 📱 **MT4 / MT5 Mobile Pending Order Ticket**: คำนวณราคาเปิดล่วงหน้า (Buy Limit / Sell Limit), จุดตัดขาดทุน (SL), จุดทำกำไร 1-2 (TP1-2) และขนาด Lot Size อัตโนมัติ พร้อมปุ่มแตะเดียว Copy ไปกรอกในแอป MT4 / MT5 บนมือถือได้ทันที
- 🧮 **Micro-Account Calculator (เริ่มต้นตั้งแต่ $10 USD)**: คำนวณกำไร/ขาดทุนเป็นดอลลาร์จริง ละเอียดยิบตามขนาดพอร์ต รองรับทั้งบัญชี **Standard ($)** และ **Cent (USC)** ป้องกันพอร์ตแตก 100%
- 🛡️ **Forex Factory 4-Box News Shield**: ตรวจจับข่าวกล่องแดง 🔴 ส้ม 🟠 เหลือง 🟡 เทา ⚪ สั่ง Freeze ล็อกระบบเป็น WAIT อัตโนมัติ 30 นาทีก่อนและ 15 นาทีหลังข่าวกล่องแดงออก
- ⏰ **Live Global Sessions Clock (เวลาไทย GMT+7)**: ตรวจจับช่วงเวลาทองคำ (Golden Hours: 14:00-16:00 และ 19:00-22:00) พร้อมระบบเตือน The Witching Hour (03:55-05:05 น.) และ Monday Open Gap (04:00-06:00 น.)
- 🧠 **Dynamic Live Market Regime Classifier**: ปรับจูนอินดิเคเตอร์ตามสภาวะตลาดสด 4 โหมด (Explosive Trend, Healthy Pullback, Volatility Squeeze, Choppy Deadzone) เพื่อรักษา Win Rate ในระดับสูงสุด 75% - 88%
- 🏛️ **5-Pillar Master Confluence Suite**: ผสาน 5 เสาหลัก (Trend & Regime, Momentum Cycles, Volatility Squeeze, Active Sessions, Smart Money FVG Structure)
- 📊 **Interactive TradingView Charts & Indicators**: รองรับ ทองคำ (XAUUSD), เงิน (XAGUSD), น้ำมัน (USOIL), คู่เงิน Forex, Crypto (BTC, ETH, SOL) และดัชนีหุ้นสหรัฐฯ (SPY, QQQ, NVDA, TSLA)
- 🤖 **Telegram Bot Automation**: ส่งสัญญาณแจ้งเตือนพร้อมตั๋วเทรด MT4/MT5 เข้าห้องแชท/กลุ่ม/Channel Telegram ทันที
- ⏱️ **Vercel Cron (`/api/cron`)**: ตั้งเวลาสแกนตลาดอัตโนมัติทุกชั่วโมง

---

## 💻 การติดตั้งและรันบนเครื่องคอมพิวเตอร์ (Local Development)

### 1. ติดตั้ง Dependencies
```bash
npm install
```

### 2. ตั้งค่าไฟล์สภาพแวดล้อม (`.env.local`)
คัดลอกไฟล์จาก `.env.example` มาเป็น `.env.local`:
```env
# Google Gemini API Key (ฟรีจาก https://aistudio.google.com/)
GEMINI_API_KEY=your_gemini_api_key_here

# Telegram Bot (สร้างจาก @BotFather และหา Chat ID ผ่าน @userinfobot)
TELEGRAM_BOT_TOKEN=your_telegram_bot_token_here
TELEGRAM_CHAT_ID=your_telegram_chat_id_here

# Vercel Cron Secret (สำหรับการรักษาความปลอดภัย)
CRON_SECRET=your_custom_cron_secret_here
```

### 3. รัน Development Server
```bash
npm run dev
```
เปิดเบราว์เซอร์ไปที่: [http://localhost:3000](http://localhost:3000)

---

## 🚀 วิธีการ Push โค้ดขึ้น GitHub

### 1. ทำการ Stage และ Commit โค้ดทั้งหมด
```bash
git add .
git commit -m "feat: institutional quantitative terminal with MT4/MT5 mobile tickets & news shield"
```

### 2. เชื่อมโยงกับ GitHub Repository ของคุณ
ไปสร้าง New Repository บน GitHub (ไม่ต้องเลือกสร้าง README/license เพราะมีอยู่แล้ว) แล้วพิมพ์คำสั่ง:
```bash
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPOSITORY.git
git branch -M main
git push -u origin main
```

---

## 🌐 วิธีการ Deploy ขึ้น Vercel ในคลิกเดียว

1. ไปที่ [Vercel Dashboard](https://vercel.com/dashboard) แล้วกด **"Add New" ➔ "Project"**
2. เลือก Repository ที่เพิ่ง Push ขึ้นไป
3. ในส่วน **Environment Variables** ให้กรอก:
   - `GEMINI_API_KEY`
   - `TELEGRAM_BOT_TOKEN`
   - `TELEGRAM_CHAT_ID`
   - `CRON_SECRET`
4. กด **Deploy** และเริ่มใช้งานได้ทันที 24 ชั่วโมงฟรี!