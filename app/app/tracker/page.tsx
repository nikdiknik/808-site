import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { getCurrentUser } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function TrackerPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/auth/sign-in");
  }

  return (
    <main className="relative min-h-screen overflow-hidden px-4 py-5 text-white sm:px-6 lg:px-8">
      <div className="noise-layer pointer-events-none absolute inset-0 opacity-50" />
      <section className="relative mx-auto mt-10 max-w-[920px] rounded-[30px] border border-white/6 bg-[#111111]/92 p-5 shadow-2xl backdrop-blur md:p-8">
        <Link href="/app" className="inline-flex items-center gap-2 rounded-full bg-[#303030] px-4 py-2 text-[14px] font-bold text-white">
          <ArrowLeft size={16} />
          Назад
        </Link>
        <p className="heading-font mt-8 text-[12px] uppercase text-[#78F761]">demo tracker</p>
        <h1 className="heading-font mt-5 text-[34px] leading-tight text-white md:text-[48px]">Трекер прогресса по демкам</h1>
        <p className="mt-5 max-w-[680px] text-[18px] leading-relaxed text-[#C9C9C9]">
          Тут будет список треков, статусы готовности и следующие шаги. Доступ уже закрыт авторизацией
        </p>
      </section>
    </main>
  );
}
