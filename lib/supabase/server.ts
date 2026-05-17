import { cookies } from "next/headers";
import { createHmac, timingSafeEqual } from "node:crypto";
import { createServerClient } from "@supabase/ssr";

import { getSupabaseBrowserConfig, isSupabaseConfigured } from "@/lib/supabase/config";
import { getPasswordUserByEmail, getPasswordUserById } from "@/lib/users";

const adminSessionCookie = "admin_session";
const adminSessionValue = "808-admin";
const passwordSessionCookie = "password_session";

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

function getSessionSecret() {
  return process.env.ADMIN_PASSWORD || process.env.OPENAI_API_KEY || process.env.NEXT_PUBLIC_SITE_URL || "808-dev-session";
}

function signSessionValue(userId: string) {
  return createHmac("sha256", getSessionSecret()).update(userId).digest("hex");
}

function createSignedSessionValue(userId: string) {
  return `${userId}.${signSessionValue(userId)}`;
}

function readSignedSessionValue(value: string | undefined) {
  if (!value) return null;
  const separatorIndex = value.lastIndexOf(".");
  if (separatorIndex <= 0) return null;

  const userId = value.slice(0, separatorIndex);
  const signature = value.slice(separatorIndex + 1);
  const expectedSignature = signSessionValue(userId);
  const signatureBuffer = Buffer.from(signature, "hex");
  const expectedBuffer = Buffer.from(expectedSignature, "hex");

  if (signatureBuffer.length !== expectedBuffer.length || !timingSafeEqual(signatureBuffer, expectedBuffer)) return null;
  return userId;
}

export async function createPasswordSession(userId: string) {
  const cookieStore = await cookies();
  cookieStore.set(passwordSessionCookie, createSignedSessionValue(userId), {
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

export async function clearPasswordSession() {
  const cookieStore = await cookies();
  cookieStore.delete(passwordSessionCookie);
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

async function getPasswordSessionUser(): Promise<AppUser | null> {
  const cookieStore = await cookies();
  const userId = readSignedSessionValue(cookieStore.get(passwordSessionCookie)?.value);
  if (!userId) return null;

  const profile = await getPasswordUserById(userId);
  if (!profile) return null;

  return {
    id: profile.id,
    email: profile.email,
    role: "user",
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

  const passwordUser = await getPasswordSessionUser();
  if (passwordUser) return passwordUser;

  const supabase = await createSupabaseServerClient();
  if (!supabase) return null;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const passwordProfile = user.email ? await getPasswordUserByEmail(user.email) : null;
  if (passwordProfile) {
    return {
      id: passwordProfile.id,
      email: passwordProfile.email,
      role: "user",
    };
  }

  return {
    id: user.id,
    email: user.email || "",
    role: "user",
  };
}
