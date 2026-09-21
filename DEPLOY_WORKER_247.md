# 🤖 คู่มือการรันบอทสแกนตลาด 24/7 ฟรีตลอดชีพ (Zero-CPU Vercel Architecture)

คู่มือนี้อธิบายวิธีนำบอท **Autonomous Scanner Daemon (`scripts/bot-daemon.mjs`)** ไปรันแยกต่างหากตลอด 24 ชั่วโมง โดย **ไม่ใช้โควตา CPU ของ Vercel แม้แต่วินาทีเดียว** ทำให้หน้าเว็บ Vercel โหลดเร็วระดับ < 20ms และไม่มีวันติดลิมิต Fluid CPU อีกต่อไป

---

## 🌟 ทำไมต้องแยก Worker ออกจาก Vercel?
- **Vercel Hobby:** เหมาะสำหรับ Web Frontend, Dashboard, Charts, และ API Response เร็วสูง (แจก Edge Requests ฟรี 1,000,000 ครั้ง/เดือน) แต่จำกัด Active CPU เพียง 4 ชม./เดือน
- **Background Worker:** สแกน 11 คู่เงินทุก 30 วินาทีตลอด 24 ชม. แล้วบันทึกผลสแกนและส่งแจ้งเตือน Telegram ลง Neon PostgreSQL DB
- **ผลลัพธ์:** หน้าเว็บ Vercel อ่านผลลัพธ์สำเร็จรูปจาก Neon DB ทันที (0.005s CPU) ปลอดภัย 100%

---

## 🛠️ วิธีที่ 1: รันบนคอมพิวเตอร์ของคุณเอง / VPS MT4-MT5 (ง่ายที่สุด & ฟรี 100%)

### ตัวเลือก 1.1: รันผ่าน Node.js / PM2 (แนะนำ)
หากคุณมีคอมพิวเตอร์ที่เปิดทิ้งไว้ หรือมี VPS สำหรับรัน MT4/MT5 อยู่แล้ว:

1. เปิด Terminal ในโฟลเดอร์โปรเจกต์
2. ติดตั้ง PM2 (ตัวจัดการ Process ใน Background):
   ```bash
   npm install -g pm2
   ```
3. เริ่มต้นรันบอทด้วย PM2:
   ```bash
   pm2 start scripts/bot-daemon.mjs --name "aegis-quant-bot"
   ```
4. ตรวจสอบสถานะการทำงาน:
   ```bash
   pm2 logs aegis-quant-bot
   ```
5. ตั้งค่าให้เปิดตัวเองอัตโนมัติเมื่อเปิดเครื่อง:
   ```bash
   pm2 startup
   pm2 save
   ```

### ตัวเลือก 1.2: รันผ่าน Docker
```bash
docker compose up -d --build
```
ตรวจสอบ Log การสแกน:
```bash
docker compose logs -f
```

---

## ☁️ วิธีที่ 2: รันบน Render (ฟรี 100% ไม่ต้องเปิดคอมฯ ทิ้งไว้)

1. สมัครบัญชีฟรีที่ [render.com](https://render.com)
2. กดปุ่ม **New +** -> เลือก **Background Worker** (หรือ **Web Service**)
3. เชื่อมต่อ Git Repository ของคุณ
4. ตั้งค่า:
   - **Environment:** `Node`
   - **Build Command:** `npm ci`
   - **Start Command:** `node scripts/bot-daemon.mjs`
5. ในส่วน **Environment Variables** ให้ใส่:
   - `DATABASE_URL`: URL ฐานข้อมูล Neon PostgreSQL ของคุณ
   - `TELEGRAM_BOT_TOKEN`: Token บอท Telegram ของคุณ
   - `TELEGRAM_CHAT_ID`: Chat ID สำหรับรับสัญญาณ
   - `SCAN_INTERVAL_SEC`: `30`
6. กด **Create Background Worker** บอทจะเริ่มสแกนตลาดและส่งสัญญาณ 24/7 ทันที!

---

## 🚂 วิธีที่ 3: รันบน Railway

1. สมัครบัญชีที่ [railway.app](https://railway.app)
2. กด **New Project** -> **Deploy from GitHub repo**
3. เลือกโปรเจกต์นี้
4. ไปที่แท็ป **Settings** -> ตั้งค่า **Custom Start Command**:
   ```bash
   node scripts/bot-daemon.mjs
   ```
5. เพิ่ม Environment Variables (`DATABASE_URL`, `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`)
6. ระบบจะเริ่มสแกนอัตโนมัติตลอด 24 ชม.

---

## ⚡ วิธีที่ 4: รันบน Koyeb (แนะนำที่สุดสำหรับ Cloud ฟรี 24/7 ไม่หลับ ไม่ต้องกรอกบัตร)

[Koyeb.com](https://koyeb.com) ให้บริการ **Free Eco Instance 512MB RAM ฟรีตลอดชีพ** โดย **ไม่มีการ Sleep (ไม่หลับเหมือน Render)**

1. สมัครบัญชีฟรีที่ [koyeb.com](https://koyeb.com)
2. กด **Create Service** -> เลือก **GitHub**
3. เลือก Repository นี้
4. ตั้งค่า:
   - **Builder:** Dockerfile (เลือก `Dockerfile.bot`) หรือ Node.js Buildpack
   - **Instance:** Free Nano (512MB RAM)
   - **Port:** `8080` (บอทมี Health Server ในตัวรองรับทันที)
5. ใส่ Environment Variables:
   - `DATABASE_URL`: Connection string ของ Neon DB
   - `TELEGRAM_BOT_TOKEN`: Token บอท Telegram
   - `TELEGRAM_CHAT_ID`: Chat ID
6. กด **Deploy** บอทจะรัน 24/7/365 ฟรีตลอดไป ไม่ต้องเปิดคอมฯ ทิ้งไว้เลย!

---

## 👑 วิธีที่ 5: Oracle Cloud Infrastructure (Always Free - สเปกแรงที่สุดในโลกฟรีตลอดชีพ)

หากต้องการ VPS เต็มรูปแบบฟรีตลอดชีพ (Linux Ubuntu 24/7):
- สมัคร [Oracle Cloud Always Free](https://www.oracle.com/cloud/free/)
- สร้าง Instance ฟรี (Ampere ARM 4 Cores, 24GB RAM หรือ AMD 1GB RAM)
- ติดตั้ง Node.js และรัน `pm2 start scripts/bot-daemon.mjs`
- ใช้งานได้ฟรี 100% ตลอดชีพ รองรับการรัน MT4/MT5 และบอทเทรดหลายสิบตัวพร้อมกัน

