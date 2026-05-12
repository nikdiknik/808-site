import { NextResponse } from "next/server";

import { clearAdminSession, createSupabaseServerClient } from "@/lib/supabase/server";

export async function POST() {
  await clearAdminSession();

  const supabase = await createSupabaseServerClient();
  if (supabase) {
    await supabase.auth.signOut();
  }

  return NextResponse.json({ ok: true });
}
