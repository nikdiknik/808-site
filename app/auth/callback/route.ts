import { NextResponse } from "next/server";

import { getPublicSiteUrl } from "@/lib/supabase/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const siteUrl = getPublicSiteUrl(requestUrl.origin);
  const code = requestUrl.searchParams.get("code");

  if (!code) {
    return NextResponse.redirect(new URL("/auth/sign-in?error=missing_code", siteUrl));
  }

  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return NextResponse.redirect(new URL("/auth/sign-in?error=supabase_not_configured", siteUrl));
  }

  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    return NextResponse.redirect(
      new URL(`/auth/sign-in?error=${encodeURIComponent(error.message)}`, siteUrl),
    );
  }

  return NextResponse.redirect(new URL("/app", siteUrl));
}
