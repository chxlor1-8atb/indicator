import { NextRequest, NextResponse } from "next/server";
import {
  sendTelegramMessage,
  deleteTelegramMessage,
  DEFAULT_TELEGRAM_BOT_TOKEN,
  DEFAULT_TELEGRAM_CHAT_ID,
} from "@/lib/telegramService";
import { saveTelegramSubscriber } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const botToken = body.botToken || process.env.TELEGRAM_BOT_TOKEN || DEFAULT_TELEGRAM_BOT_TOKEN;
    const chatId = body.chatId || process.env.TELEGRAM_CHAT_ID || DEFAULT_TELEGRAM_CHAT_ID;
    const alertSymbol = body.alertSymbol || "ALL";
    const minGrade = body.minGrade || "B";
    const analysis = body.analysis;
    const message = body.message;

    // Asynchronously save or update subscriber in Neon with symbol filter preferences
    if (chatId) {
      saveTelegramSubscriber(chatId, body.username || "trader", alertSymbol, minGrade).catch(console.error);
    }

    if (body.action === "update-filter") {
      return NextResponse.json({
        success: true,
        message: `Telegram alert preference updated for ${alertSymbol}`,
      });
    }

    if (body.action === "clear" || body.action === "clean") {
      const ping = await sendTelegramMessage({
        botToken,
        chatId,
        message: "🧹 กำลังล้างข้อความเก่า...",
      });
      const maxId = ping.messageId || 60;
      let deleted = 0;
      const deletePromises: Promise<unknown>[] = [];
      for (let id = Math.max(1, maxId - 150); id <= maxId; id++) {
        deletePromises.push(
          deleteTelegramMessage({ botToken, chatId, messageId: id }).then((r) => {
            if (r.success) deleted++;
          }).catch(() => {})
        );
      }
      await Promise.allSettled(deletePromises);
      return NextResponse.json({
        success: true,
        message: `ลบข้อความเก่าสำเร็จ ${deleted} ข้อความ`,
        deletedCount: deleted,
      });
    }

    if (!botToken || !chatId) {
      return NextResponse.json(
        {
          success: false,
          error: "Telegram Bot Token and Chat ID are required. Please configure them in Settings or .env.local",
        },
        { status: 400 }
      );
    }

    const result = await sendTelegramMessage({
      botToken,
      chatId,
      analysis,
      message,
    });

    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: "Alert successfully dispatched to Telegram!",
    });
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : "Failed to notify Telegram";
    return NextResponse.json({ success: false, error: errMsg }, { status: 500 });
  }
}
