import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { NewTrackForm } from "@/components/tracks/new-track-form";
import { TrackLimitModal } from "@/components/tracks/track-limit-modal";
import { getCurrentUser } from "@/lib/supabase/server";
import { getUserTracks } from "@/lib/tracks";
import { ensureUserProfile } from "@/lib/users";

export const dynamic = "force-dynamic";

export default async function NewTrackPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/auth/sign-in");
  }

  const [profile, tracks] = await Promise.all([ensureUserProfile(user), getUserTracks(user)]);
  const limitReached = !profile.isPremium && tracks.length >= 1;

  return (
    <main className="relative min-h-screen overflow-hidden px-4 py-5 text-white sm:px-6 lg:px-8">
      <div className="noise-layer pointer-events-none absolute inset-0 opacity-50" />
      <section className="relative mx-auto mt-10 max-w-[720px] rounded-[30px] border border-white/6 bg-[#111111]/92 p-5 shadow-2xl backdrop-blur md:p-8">
        <div className="flex items-center gap-3">
          <Link
            href="/app/tracks"
            aria-label="Назад"
            className="flex size-11 items-center justify-center rounded-full bg-[#1E1E1E] text-[#78F761] transition hover:bg-[#303030]"
          >
            <ArrowLeft size={20} />
          </Link>
          <p className="heading-font text-[24px] leading-none text-[#78F761]">новый трек</p>
        </div>

        {limitReached ? (
          <>
            <div className="mt-8 rounded-[28px] bg-[#1E1E1E] p-5">
              <p className="heading-font text-[12px] uppercase text-[#78F761]">Premium</p>
              <h1 className="heading-font mt-4 text-[30px] leading-tight text-white">Лимит Free уже выбран</h1>
              <p className="mt-4 text-[17px] leading-relaxed text-[#C9C9C9]">
                В Free можно вести одну демку. Вернись в трекер или разблокируй больше демок
              </p>
            </div>
            <TrackLimitModal />
          </>
        ) : (
          <NewTrackForm />
        )}
      </section>
    </main>
  );
}
