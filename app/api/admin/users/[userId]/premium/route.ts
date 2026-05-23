import { NextResponse } from "next/server";
import { z, ZodError } from "zod";

import { getCurrentUser } from "@/lib/supabase/server";
import { setUserPremiumById } from "@/lib/users";

export const runtime = "nodejs";

const requestSchema = z.object({
  isPremium: z.boolean(),
});

type RouteContext = {
  params: Promise<{
    userId: string;
  }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  const admin = await getCurrentUser();
  if (admin?.role !== "admin") {
    return NextResponse.json({ error: "Недостаточно прав" }, { status: 403 });
  }

  try {
    const { userId } = await context.params;
    const payload = requestSchema.parse(await request.json());
    const profile = await setUserPremiumById(userId, payload.isPremium);

    if (!profile) {
      return NextResponse.json({ error: "Пользователь не найден" }, { status: 404 });
    }

    return NextResponse.json({ profile });
  } catch (error) {
    const message = error instanceof ZodError ? error.issues[0]?.message || "Проверь payload" : "Не получилось обновить Premium";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
