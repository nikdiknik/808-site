import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

import { getSupabaseBrowserConfig, isSupabaseConfigured } from "@/lib/supabase/config";

const adminSessionCookie = "admin_session";
const adminSessionValue = "808-admin";

export type AppUser = {
  id: string;
  email: string;
  role: "admin" | "user";
};

export async function createAdminSession() {
  const cookieStore = await cookies();
  cookieStore.set(adminSessionCookie, adminSessionValue, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}

export async function clearAdminSession() {
  const cookieStore = await cookies();
  cookieStore.delete(adminSessionCookie);
}

async function getAdminUser(): Promise<AppUser | null> {
  const cookieStore = await cookies();
  const session = cookieStore.get(adminSessionCookie)?.value;

  if (session !== adminSessionValue) return null;

  return {
    id: "admin",
    email: "admin",
    role: "admin",
  };
}

export async function createSupabaseServerClient() {
  if (!isSupabaseConfigured()) return null;

  const cookieStore = await cookies();
  const { url, anonKey } = getSupabaseBrowserConfig();

  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // Server Components can read cookies but cannot always write refreshed auth cookies.
        }
      },
    },
  });
}

export async function getCurrentUser(): Promise<AppUser | null> {
  const adminUser = await getAdminUser();
  if (adminUser) return adminUser;

  const supabase = await createSupabaseServerClient();
  if (!supabase) return null;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  return {
    id: user.id,
    email: user.email || "",
    role: "user",
  };
}
