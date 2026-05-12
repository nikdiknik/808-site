import Link from "next/link";
import { redirect } from "next/navigation";

import { SignOutButton } from "@/components/auth/sign-out-button";
import { ProfileForm } from "@/components/profile/profile-form";
import { getCurrentUser } from "@/lib/supabase/server";
import { ensureUserProfile } from "@/lib/users";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/auth/sign-in");
  }
  const profile = await ensureUserProfile(user);

  return (
    <main className="relative min-h-screen overflow-hidden px-4 py-5 text-white sm:px-6 lg:px-8">
      <div className="noise-layer pointer-events-none absolute inset-0 opacity-50" />
      <section className="relative mx-auto mt-10 max-w-[920px] rounded-[30px] border border-white/6 bg-[#111111]/92 p-5 shadow-2xl backdrop-blur md:p-8">
        <p className="heading-font text-[12px] uppercase text-[#78F761]">profile</p>
        <h1 className="heading-font mt-5 text-[34px] leading-tight text-white md:text-[48px]">Профиль</h1>
        <ProfileForm
          profile={profile}
          actions={
            <>
              <SignOutButton variant="secondary" />
              {user.role === "admin" ? (
                <Link
                  href="/admin/analytics"
                  className="flex min-h-[56px] w-full items-center justify-center rounded-full bg-[#303030] px-5 text-[16px] text-white transition hover:bg-[#3D3D3D] md:w-auto md:min-w-[220px]"
                >
                  Смотреть аналитику
                </Link>
              ) : null}
            </>
          }
        />
      </section>
    </main>
  );
}
