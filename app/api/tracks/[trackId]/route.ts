import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { deleteUserTrack, getUserTrack, updateTrackSchema, updateUserTrack } from "@/lib/tracks";
import { getCurrentUser } from "@/lib/supabase/server";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{
    trackId: string;
  }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { trackId } = await context.params;
  const track = await getUserTrack(user, trackId);
  if (!track) {
    return NextResponse.json({ error: "Track not found" }, { status: 404 });
  }

  return NextResponse.json({ track });
}

export async function PATCH(request: Request, context: RouteContext) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { trackId } = await context.params;
    const payload = updateTrackSchema.parse(await request.json());
    const track = await updateUserTrack(user, trackId, payload);
    if (!track) {
      return NextResponse.json({ error: "Track not found" }, { status: 404 });
    }

    return NextResponse.json({ track });
  } catch (error) {
    const message = error instanceof ZodError ? error.issues[0]?.message || "Проверь поля демки" : "Не получилось обновить демку";
    return NextResponse.json({ error: { code: "INVALID_TRACK", message } }, { status: 400 });
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { trackId } = await context.params;
  const deleted = await deleteUserTrack(user, trackId);
  if (!deleted) {
    return NextResponse.json({ error: "Track not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
