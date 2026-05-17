import { NextResponse } from "next/server";
import { z } from "zod";

import { getPublicSiteUrl } from "@/lib/supabase/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const requestSchema = z.object({
  email: z.string().trim().email(),
});

export async function POST(request: Request) {
  const parsed = requestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Введи корректный email" }, { status: 400 });
  }

  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return NextResponse.json(
      { error: "Supabase ещё не настроен. Добавь NEXT_PUBLIC_SUPABASE_URL и NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY" },
      { status: 500 },
    );
  }

  const requestUrl = new URL(request.url);
  const siteUrl = getPublicSiteUrl(requestUrl.origin);
  const { error } = await supabase.auth.signInWithOtp({
    email: parsed.data.email,
    options: {
      shouldCreateUser: true,
      emailRedirectTo: `${siteUrl}/auth/confirm`,
    },
  });

  if (error) {
    const isRateLimit = error.message.toLowerCase().includes("rate limit");
    return NextResponse.json(
      {
        error: isRateLimit ? "По Email сейчас войти не получается. Попробуй войти по логину" : error.message,
        code: isRateLimit ? "EMAIL_RATE_LIMIT" : "SUPABASE_ERROR",
      },
      { status: isRateLimit ? 429 : 400 },
    );
  }

  return NextResponse.json({ ok: true });
}
