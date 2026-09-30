import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type") || "mq5";

    let filename = "Aegis_Quant_Terminal.mq5";
    let contentType = "text/plain; charset=utf-8";

    if (type === "mq5" || type === "ea") {
      filename = "Aegis_Quant_Terminal.mq5";
      contentType = "text/plain; charset=utf-8";
    } else if (type === "set_cent") {
      filename = "Aegis_XAUUSD_Cent.set";
      contentType = "text/plain; charset=utf-8";
    } else if (type === "set_std") {
      filename = "Aegis_Forex_Standard.set";
      contentType = "text/plain; charset=utf-8";
    } else if (type === "guide") {
      filename = "HOW_TO_INSTALL.md";
      contentType = "text/markdown; charset=utf-8";
    } else if (type === "info") {
      return NextResponse.json({
        success: true,
        version: "2.50",
        files: [
          { type: "mq5", filename: "Aegis_Quant_Terminal.mq5", label: "MT5 Expert Advisor (EA Source Code)" },
          { type: "set_cent", filename: "Aegis_XAUUSD_Cent.set", label: "Preset: Gold Cent Account ($10-$50)" },
          { type: "set_std", filename: "Aegis_Forex_Standard.set", label: "Preset: Forex Standard Account ($100+)" },
          { type: "guide", filename: "HOW_TO_INSTALL.md", label: "Installation Guide (Thai)" },
        ],
      });
    }

    const filePath = path.join(process.cwd(), "mql", filename);

    if (!fs.existsSync(filePath)) {
      return NextResponse.json({ success: false, error: `File ${filename} not found` }, { status: 404 });
    }

    const fileBuffer = await fs.promises.readFile(filePath);

    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-cache, no-store, must-revalidate",
      },
    });
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : "Download failed";
    return NextResponse.json({ success: false, error: errMsg }, { status: 500 });
  }
}
