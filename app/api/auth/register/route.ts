import { NextResponse } from "next/server";
import { z } from "zod";

import { createPasswordSession } from "@/lib/supabase/server";
import { registerPasswordUser } from "@/lib/users";

const requestSchema = z
  .object({
    email: z.string().trim().email("Введи корректный email"),
    name: z.string().trim().min(2, "Никнейм слишком короткий").max(80, "Никнейм слишком длинный"),
    password: z.string().min(6, "Пароль должен быть не короче 6 символов"),
    passwordAgain: z.string().min(6, "Повтори пароль"),
  })
  .refine((data) => data.password === data.passwordAgain, {
    message: "Пароли не совпадают",
    path: ["passwordAgain"],
  });

export async function POST(request: Request) {
  const parsed = requestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message || "Проверь поля регистрации" }, { status: 400 });
  }

  try {
    const profile = await registerPasswordUser(parsed.data);
    await createPasswordSession(profile.id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof Error && error.name === "USER_EXISTS") {
      return NextResponse.json({ error: "Такой email уже зарегистрирован" }, { status: 409 });
    }

    return NextResponse.json({ error: "Не получилось зарегистрироваться" }, { status: 500 });
  }
}
