import { NextResponse } from "next/server";
import { z } from "zod";

import { createAdminSession, createPasswordSession } from "@/lib/supabase/server";
import { verifyPasswordUser } from "@/lib/users";

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

  if (adminLogin && adminPassword && parsed.data.login === adminLogin && parsed.data.password === adminPassword) {
    await createAdminSession();
    return NextResponse.json({ ok: true });
  }

  const profile = await verifyPasswordUser(parsed.data.login, parsed.data.password);
  if (!profile) {
    return NextResponse.json({ error: "Неверный логин или пароль" }, { status: 401 });
  }

  await createPasswordSession(profile.id);

  return NextResponse.json({ ok: true });
}
