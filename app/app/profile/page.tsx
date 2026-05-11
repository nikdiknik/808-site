import { redirect } from "next/navigation";

import { SignOutButton } from "@/components/auth/sign-out-button";
import { getCurrentUser } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/auth/sign-in");
  }

  return (
    <main className="relative min-h-screen overflow-hidden px-4 py-5 text-white sm:px-6 lg:px-8">
      <div className="noise-layer pointer-events-none absolute inset-0 opacity-50" />
      <section className="relative mx-auto mt-10 max-w-[720px] rounded-[30px] border border-white/6 bg-[#111111]/92 p-5 shadow-2xl backdrop-blur md:p-8">
        <p className="heading-font text-[12px] uppercase text-[#78F761]">profile</p>
        <h1 className="heading-font mt-5 text-[34px] leading-tight text-white md:text-[48px]">Профиль</h1>
        <div className="mt-6 rounded-[24px] bg-[#1E1E1E] p-5">
          <p className="heading-font text-[12px] uppercase text-[#78F761]">email</p>
          <p className="mt-3 break-all text-[18px] leading-relaxed text-[#D8D8D8]">{user.email}</p>
        </div>
        <SignOutButton />
      </section>
    </main>
  );
}
