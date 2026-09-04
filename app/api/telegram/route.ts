import { NextRequest, NextResponse } from "next/server";
import { sendTelegramMessage } from "@/lib/telegramService";
import { saveTelegramSubscriber } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const botToken = body.botToken || process.env.TELEGRAM_BOT_TOKEN;
    const chatId = body.chatId || process.env.TELEGRAM_CHAT_ID;
    const analysis = body.analysis;
    const message = body.message;

    // Asynchronously save subscriber to Neon
    if (chatId) {
      saveTelegramSubscriber(chatId).catch(console.error);
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
