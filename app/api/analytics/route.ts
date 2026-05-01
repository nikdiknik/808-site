import { NextResponse } from "next/server";

import { recordAnalyticsEvent } from "@/lib/analytics";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { event?: string };
    if (body.event === "premium_clicked") {
      await recordAnalyticsEvent("premium_clicked");
      return NextResponse.json({ ok: true });
    }
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  return NextResponse.json({ ok: false }, { status: 400 });
}
