import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, ArrowRight } from "lucide-react";

import { AddDemoButton } from "@/components/tracks/add-demo-button";
import { CoverArt } from "@/components/tracks/cover-art";
import { getCurrentUser } from "@/lib/supabase/server";
import { trackStatusLabels } from "@/lib/track-options";
import { getUserTracks } from "@/lib/tracks";
import { ensureUserProfile } from "@/lib/users";

export const dynamic = "force-dynamic";

function formatDate(value: string) {
  return new Intl.DateTimeFormat("ru-RU", {
    dateStyle: "medium",
  }).format(new Date(value));
}

const addButtonClass =
  "inline-flex min-h-[54px] items-center justify-center gap-2 rounded-full bg-[#78F761] px-6 text-[16px] font-bold text-[#0A0A0A] transition hover:brightness-110";

export default async function TracksPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/auth/sign-in");
  }

  const [profile, tracks] = await Promise.all([ensureUserProfile(user), getUserTracks(user)]);
  const canCreate = profile.isPremium || tracks.length < 1;

  return (
    <main className="relative min-h-screen overflow-hidden px-4 py-5 text-white sm:px-6 lg:px-8">
      <div className="noise-layer pointer-events-none absolute inset-0 opacity-50" />
      <section className="relative mx-auto mt-10 max-w-[1120px] rounded-[30px] border border-white/6 bg-[#111111]/92 p-5 shadow-2xl backdrop-blur md:p-8">
        <div className="flex items-center gap-3">
          <Link
            href="/app"
            aria-label="Назад"
            className="flex size-11 items-center justify-center rounded-full bg-[#1E1E1E] text-[#78F761] transition hover:bg-[#303030]"
          >
            <ArrowLeft size={20} />
          </Link>
          <p className="heading-font text-[12px] uppercase text-[#78F761]">tracks</p>
        </div>

        <div className="mt-6 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="heading-font text-[34px] leading-tight text-white md:text-[54px]">Трекер твоих демок</h1>
            <p className="mt-4 max-w-[720px] text-[18px] leading-relaxed text-[#C9C9C9]">
              Храни прогресс по трекам в одном месте и отмечай, что уже готово
            </p>
          </div>
          {tracks.length ? <AddDemoButton canCreate={canCreate} className={addButtonClass} /> : null}
        </div>

        {tracks.length ? (
          <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {tracks.map((track) => (
              <Link key={track.id} href={`/app/tracks/${track.id}`} className="block rounded-[28px] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#78F761]">
                <article className="h-full rounded-[28px] border border-white/6 bg-[#1E1E1E] p-4">
                  <CoverArt coverId={track.coverId} className="aspect-square w-full" />
                  <div className="mt-5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h2 className="heading-font break-words text-[24px] leading-tight text-white">{track.title}</h2>
                        <p className="mt-2 line-clamp-2 text-[15px] leading-relaxed text-[#C9C9C9]">
                          {track.subtitle || track.notes || "Без описания"}
                        </p>
                      </div>
                      <span className="heading-font shrink-0 text-[20px] text-[#78F761]">{track.progressPercent}%</span>
                    </div>
                    <div className="mt-5 h-2 overflow-hidden rounded-full bg-[#303030]">
                      <div className="h-full rounded-full bg-[#78F761]" style={{ width: `${track.progressPercent}%` }} />
                    </div>
                    <div className="mt-5 flex items-center justify-between gap-3 text-[14px] text-[#838383]">
                      <span>{trackStatusLabels[track.status]}</span>
                      <span>{formatDate(track.updatedAt)}</span>
                    </div>
                    <span className="mt-5 flex min-h-[50px] items-center justify-center gap-2 rounded-full bg-[#303030] px-5 text-[16px] font-bold text-white transition hover:bg-[#3D3D3D]">
                      Открыть
                      <ArrowRight size={18} />
                    </span>
                  </div>
                </article>
              </Link>
            ))}
          </div>
        ) : (
          <div className="mt-8 rounded-[28px] border border-dashed border-white/12 bg-[#1E1E1E] p-6 md:p-8">
            <p className="heading-font text-[12px] uppercase text-[#78F761]">empty</p>
            <h2 className="heading-font mt-4 text-[28px] leading-tight text-white">У тебя пока нет демок</h2>
            <p className="mt-4 max-w-[560px] text-[18px] leading-relaxed text-[#C9C9C9]">
              Добавь первый трек, чтобы не потерять идею и видеть прогресс
            </p>
            <AddDemoButton canCreate={canCreate} className={`${addButtonClass} mt-6`} />
          </div>
        )}
      </section>
    </main>
  );
}
