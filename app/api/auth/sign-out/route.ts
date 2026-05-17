import { NextResponse } from "next/server";

import { clearAdminSession, clearPasswordSession, createSupabaseServerClient } from "@/lib/supabase/server";

export async function POST() {
  await clearAdminSession();
  await clearPasswordSession();

  const supabase = await createSupabaseServerClient();
  if (supabase) {
    await supabase.auth.signOut();
  }

  return NextResponse.json({ ok: true });
}
