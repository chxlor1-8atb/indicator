import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type") || "mq5";

    let filename = "Aegis_Quant_Terminal.ex5";
    let contentType = "application/octet-stream";
    let fileFolder = "mql";

    if (type === "ex5") {
      filename = "Aegis_Quant_Terminal.ex5";
      contentType = "application/octet-stream";
    } else if (type === "mq5" || type === "ea") {
      filename = "Aegis_Quant_Terminal.mq5";
      contentType = "text/plain; charset=utf-8";
    } else if (type === "set_gold_compound" || type === "set_cent") {
      filename = "Aegis_Gold_Standard_Compound.set";
      contentType = "text/plain; charset=utf-8";
    } else if (type === "set_multisymbol" || type === "set_std") {
      filename = "Aegis_MultiSymbol_AllInOne.set";
      contentType = "text/plain; charset=utf-8";
    } else if (type === "installer" || type === "ps1") {
      filename = "install-mt5-ea.ps1";
      fileFolder = "scripts";
      contentType = "text/plain; charset=utf-8";
    } else if (type === "guide") {
      filename = "HOW_TO_INSTALL.md";
      contentType = "text/markdown; charset=utf-8";
    } else if (type === "info") {
      return NextResponse.json({
        success: true,
        version: "3.00",
        files: [
          { type: "ex5", filename: "Aegis_Quant_Terminal.ex5", label: "MT5 Compiled Expert Advisor (พร้อมรัน ไม่ต้องคอมไพล์)" },
          { type: "mq5", filename: "Aegis_Quant_Terminal.mq5", label: "MT5 Expert Advisor (Source Code)" },
          { type: "set_gold_compound", filename: "Aegis_Gold_Standard_Compound.set", label: "Preset: Gold Compounding ($10-$50)" },
          { type: "set_multisymbol", filename: "Aegis_MultiSymbol_AllInOne.set", label: "Preset: One-Chart Multi-Symbol Master" },
          { type: "installer", filename: "install-mt5-ea.ps1", label: "1-Click Auto Installer Script" },
          { type: "guide", filename: "HOW_TO_INSTALL.md", label: "Installation Guide (Thai)" },
        ],
      });
    }

    const filePath = path.join(process.cwd(), fileFolder, filename);

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
