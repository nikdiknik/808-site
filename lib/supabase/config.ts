export function getSupabaseBrowserConfig() {
  return {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL || "",
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "",
  };
}

export function normalizeSiteUrl(url: string) {
  return url.replace(/\/+$/, "");
}

export function getPublicSiteUrl(fallbackUrl = "") {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || fallbackUrl;
  return siteUrl ? normalizeSiteUrl(siteUrl) : "";
}

export function isSupabaseConfigured() {
  const { url, anonKey } = getSupabaseBrowserConfig();
  return Boolean(url && anonKey);
}
