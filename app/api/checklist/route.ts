import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";

import { NextResponse } from "next/server";

import { recordAnalyticsEvent } from "@/lib/analytics";

export const runtime = "nodejs";

function getChecklistPath(): string {
  const rawPath = process.env.CHECKLIST_FILE_PATH || "public/checklist-808.png";
  return path.isAbsolute(rawPath) ? rawPath : path.join(process.cwd(), rawPath);
}

export async function GET() {
  await recordAnalyticsEvent("checklist_clicked");

  try {
    const checklistPath = getChecklistPath();
    await stat(checklistPath);

    const stream = Readable.toWeb(createReadStream(checklistPath));
    return new Response(stream as BodyInit, {
      headers: {
        "Content-Type": "image/png",
        "Content-Disposition": 'attachment; filename="checklist-808.png"',
      },
    });
  } catch {
    return NextResponse.json(
      {
        error: {
          code: "CHECKLIST_NOT_FOUND",
          message: "Чек-лист пока не найден. Проверь CHECKLIST_FILE_PATH",
        },
      },
      { status: 404 },
    );
  }
}
