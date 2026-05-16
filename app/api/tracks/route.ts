import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { createTrackSchema, createUserTrack, getUserTracks } from "@/lib/tracks";
import { getCurrentUser } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const tracks = await getUserTracks(user);
  return NextResponse.json({ tracks });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const payload = createTrackSchema.parse(await request.json());
    const track = await createUserTrack(user, payload);
    return NextResponse.json({ track }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.name === "TRACK_LIMIT_REACHED") {
      return NextResponse.json(
        {
          error: {
            code: "TRACK_LIMIT_REACHED",
            message: "В Free можно вести одну демку",
          },
        },
        { status: 402 },
      );
    }

    const message = error instanceof ZodError ? error.issues[0]?.message || "Проверь поля демки" : "Не получилось создать демку";
    return NextResponse.json({ error: { code: "INVALID_TRACK", message } }, { status: 400 });
  }
}
