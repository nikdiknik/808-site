import { NextResponse } from "next/server";
import { z } from "zod";

import { createAdminSession } from "@/lib/supabase/server";

const requestSchema = z.object({
  login: z.string().trim(),
  password: z.string(),
});

export async function POST(request: Request) {
  const parsed = requestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Введи логин и пароль" }, { status: 400 });
  }

  const adminLogin = process.env.ADMIN_LOGIN;
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminLogin || !adminPassword) {
    return NextResponse.json({ error: "Админский вход ещё не настроен" }, { status: 500 });
  }

  if (parsed.data.login !== adminLogin || parsed.data.password !== adminPassword) {
    return NextResponse.json({ error: "Неверный логин или пароль" }, { status: 401 });
  }

  await createAdminSession();

  return NextResponse.json({ ok: true });
}
