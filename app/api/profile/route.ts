import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { getCurrentUser } from "@/lib/supabase/server";
import { ensureUserProfile, profileUpdateSchema, updateUserProfile } from "@/lib/users";

export const runtime = "nodejs";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const profile = await ensureUserProfile(user);
  return NextResponse.json({ profile });
}

export async function PATCH(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const update = profileUpdateSchema.parse(await request.json());
    const profile = await updateUserProfile(user, update);
    return NextResponse.json({ profile });
  } catch (error) {
    const message =
      error instanceof ZodError ? error.issues[0]?.message || "Проверь поля профиля" : "Не получилось сохранить профиль";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
