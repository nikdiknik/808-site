import Link from "next/link";
import { redirect } from "next/navigation";

import { PremiumToggle } from "@/components/admin/premium-toggle";
import { UserDeleteButton } from "@/components/admin/user-delete-button";
import { getAnalyticsSnapshot, getAnalyticsStorageInfo } from "@/lib/analytics";
import { experienceLabels, problemLabels, type ExperienceId, type ProblemId } from "@/lib/options";
import { dawOptions, genreOptions, roleOptions } from "@/lib/profile-options";
import { getAllTracksSnapshot, getTracksStorageInfo, reassignTracksOwner, type Track } from "@/lib/tracks";
import { trackStatusLabels, trackStatuses } from "@/lib/track-options";
import { getCurrentUser } from "@/lib/supabase/server";
import { deleteUserProfilesById, getUserProfilesSnapshot, getUsersStorageInfo, mergeDuplicateUserProfilesByEmail, type UserProfile } from "@/lib/users";

export const dynamic = "force-dynamic";

const metricLabels = {
  started: "Запусков сценария",
  completed: "Успешных генераций",
  failed: "Ошибок генерации",
  checklist_clicked: "Кликов по чек-листу",
  premium_clicked: "Кликов по Premium",
} as const;

function formatDate(value: string) {
  if (!value) return "Пока нет событий";
  return new Intl.DateTimeFormat("ru-RU", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function getAverageProgress(tracks: Track[]) {
  if (!tracks.length) return 0;
  return Math.round(tracks.reduce((sum, track) => sum + track.progressPercent, 0) / tracks.length);
}

function getLastActivity(profile: UserProfile, tracks: Track[]) {
  const latestTrackUpdate = tracks.reduce((latest, track) => {
    const updatedAt = Date.parse(track.updatedAt);
    return Number.isFinite(updatedAt) && updatedAt > latest ? updatedAt : latest;
  }, 0);
  return latestTrackUpdate ? new Date(latestTrackUpdate).toISOString() : profile.createdAt;
}

function makeRows<T extends string>(values: readonly T[], selected: T[]) {
  return values
    .map((value) => ({
      label: value,
      value: selected.filter((item) => item === value).length,
    }))
    .filter((row) => row.value > 0)
    .sort((a, b) => b.value - a.value);
}

function StatCard({ label, value }: { label: string; value: number | string }) {
  return (
    <section className="rounded-[24px] border border-white/6 bg-[#1E1E1E] p-5">
      <p className="heading-font text-[12px] uppercase text-[#78F761]">{label}</p>
      <p className="heading-font mt-4 text-[42px] leading-none text-white">{value}</p>
    </section>
  );
}

function Breakdown({
  title,
  rows,
}: {
  title: string;
  rows: Array<{ label: string; value: number }>;
}) {
  return (
    <section className="rounded-[26px] border border-white/6 bg-[#1E1E1E] p-5">
      <h2 className="heading-font text-[22px] text-white">{title}</h2>
      <div className="mt-5 space-y-3">
        {rows.length ? (
          rows.map((row) => (
            <div key={row.label} className="flex items-center justify-between gap-4 rounded-[16px] bg-[#303030] p-4">
              <span className="text-[16px] text-[#D8D8D8]">{row.label}</span>
              <span className="heading-font text-[18px] text-[#78F761]">{row.value}</span>
            </div>
          ))
        ) : (
          <p className="rounded-[16px] border border-dashed border-white/10 p-4 text-[#838383]">Данных пока нет</p>
        )}
      </div>
    </section>
  );
}

function StorageCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[16px] bg-[#303030] p-4">
      <p className="heading-font text-[12px] uppercase text-[#78F761]">{label}</p>
      <p className="mt-2 break-all text-[#C9C9C9]">{value}</p>
    </div>
  );
}

export default async function AnalyticsPage() {
  const currentUser = await getCurrentUser();
  if (currentUser?.role !== "admin") {
    redirect("/auth/sign-in");
  }

  const merges = await mergeDuplicateUserProfilesByEmail();
  await Promise.all(merges.map((merge) => reassignTracksOwner(merge.mergedUserIds, merge.targetUserId)));
  await deleteUserProfilesById(merges.flatMap((merge) => merge.mergedUserIds));

  const [analytics, analyticsStorage, users, usersStorage, tracks, tracksStorage] = await Promise.all([
    getAnalyticsSnapshot(),
    getAnalyticsStorageInfo(),
    getUserProfilesSnapshot(),
    getUsersStorageInfo(),
    getAllTracksSnapshot(),
    getTracksStorageInfo(),
  ]);

  const tracksByUser = new Map<string, Track[]>();
  tracks.forEach((track) => {
    tracksByUser.set(track.userId, [...(tracksByUser.get(track.userId) || []), track]);
  });

  const totalRequests = analytics.totals.started;
  const successfulRequests = analytics.totals.completed;
  const conversionRate = totalRequests ? Math.round((successfulRequests / totalRequests) * 100) : 0;
  const premiumUsers = users.filter((user) => user.isPremium).length;
  const usersWithTracks = users.filter((user) => (tracksByUser.get(user.id) || []).length > 0).length;
  const averageTrackProgress = getAverageProgress(tracks);

  const userRows = users
    .map((user) => {
      const userTracks = tracksByUser.get(user.id) || [];
      return {
        user,
        tracks: userTracks,
        averageProgress: getAverageProgress(userTracks),
        lastActivity: getLastActivity(user, userTracks),
      };
    })
    .sort((first, second) => Date.parse(second.lastActivity) - Date.parse(first.lastActivity));

  const trackStatusRows = trackStatuses.map((status) => ({
    label: trackStatusLabels[status],
    value: tracks.filter((track) => track.status === status).length,
  }));

  const experienceRows = Object.entries(analytics.byExperience)
    .map(([key, value]) => ({
      label: experienceLabels[key as ExperienceId],
      value: value || 0,
    }))
    .filter((row) => row.value > 0)
    .sort((a, b) => b.value - a.value);

  const profileExperienceRows = Object.entries(experienceLabels)
    .map(([key, label]) => ({
      label,
      value: users.filter((user) => user.experience === key).length,
    }))
    .filter((row) => row.value > 0)
    .sort((a, b) => b.value - a.value);

  const problemRows = Object.entries(analytics.byProblem)
    .map(([key, value]) => ({
      label: problemLabels[key as ProblemId],
      value: value || 0,
    }))
    .filter((row) => row.value > 0)
    .sort((a, b) => b.value - a.value);

  return (
    <main className="min-h-screen bg-[#0A0A0A] px-4 py-6 text-white sm:px-8">
      <div className="mx-auto max-w-[1240px]">
        <div className="rounded-[30px] border border-white/6 bg-[#111111] p-5 md:p-8">
          <p className="heading-font text-[12px] uppercase text-[#78F761]">808 Демок / analytics</p>
          <div className="mt-4 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <h1 className="heading-font text-[34px] leading-tight md:text-[48px]">Аналитика MVP</h1>
              <p className="mt-3 text-[17px] text-[#C9C9C9]">Последнее событие: {formatDate(analytics.lastUpdatedAt)}</p>
            </div>
            <Link
              href="/app"
              className="inline-flex min-h-[48px] items-center justify-center rounded-full bg-[#303030] px-5 text-[15px] font-bold text-white"
            >
              Вернуться на сайт
            </Link>
          </div>
        </div>

        <section className="mt-6 rounded-[30px] border border-white/6 bg-[#111111] p-5 md:p-8">
          <h2 className="heading-font text-[26px] text-white">Пользователи</h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Всего пользователей" value={users.length} />
            <StatCard label="Premium" value={premiumUsers} />
            <StatCard label="Free" value={users.length - premiumUsers} />
            <StatCard label="С демками" value={usersWithTracks} />
          </div>

          <div className="mt-6 overflow-x-auto rounded-[24px] border border-white/6 bg-[#1E1E1E]">
            <table className="min-w-[1080px] w-full border-collapse text-left text-[14px] text-[#D8D8D8]">
              <thead className="heading-font text-[11px] uppercase text-[#78F761]">
                <tr>
                  <th className="px-4 py-4">Никнейм</th>
                  <th className="px-4 py-4">Email / логин</th>
                  <th className="px-4 py-4">Premium</th>
                  <th className="px-4 py-4">Демок</th>
                  <th className="px-4 py-4">Средний прогресс</th>
                  <th className="px-4 py-4">Перезапусков</th>
                  <th className="px-4 py-4">Создан</th>
                  <th className="px-4 py-4">Активность</th>
                  <th className="px-4 py-4">Действия</th>
                </tr>
              </thead>
              <tbody>
                {userRows.length ? (
                  userRows.map(({ user, tracks: userTracks, averageProgress, lastActivity }) => (
                    <tr key={user.id} className="border-t border-white/6">
                      <td className="px-4 py-4 text-white">{user.name || "Не заполнено"}</td>
                      <td className="px-4 py-4">{user.email}</td>
                      <td className="px-4 py-4">
                        <PremiumToggle userId={user.id} initialValue={user.isPremium} />
                      </td>
                      <td className="px-4 py-4">{userTracks.length}</td>
                      <td className="px-4 py-4">{averageProgress}%</td>
                      <td className="px-4 py-4">{user.restartCount}</td>
                      <td className="px-4 py-4">{formatDate(user.createdAt)}</td>
                      <td className="px-4 py-4">{formatDate(lastActivity)}</td>
                      <td className="px-4 py-4">
                        <UserDeleteButton userId={user.id} userLabel={user.name || user.email || user.id} />
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={9} className="px-4 py-6 text-[#838383]">
                      Пользователей пока нет
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="mt-6 rounded-[30px] border border-white/6 bg-[#111111] p-5 md:p-8">
          <h2 className="heading-font text-[26px] text-white">Трекер демок</h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <StatCard label="Всего демок" value={tracks.length} />
            <StatCard label="Средний прогресс" value={`${averageTrackProgress}%`} />
            <StatCard label="Пользователей с демками" value={usersWithTracks} />
          </div>
          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            <Breakdown title="По статусу демки" rows={trackStatusRows} />
            <Breakdown
              title="По уровню опыта профиля"
              rows={profileExperienceRows}
            />
          </div>
        </section>

        <section className="mt-6 rounded-[30px] border border-white/6 bg-[#111111] p-5 md:p-8">
          <h2 className="heading-font text-[26px] text-white">Перезапуски</h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Object.entries(metricLabels).map(([key, label]) => (
              <StatCard key={key} label={label} value={analytics.totals[key as keyof typeof metricLabels]} />
            ))}
            <StatCard label="Конверсия в ответ" value={`${conversionRate}%`} />
          </div>
          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            <Breakdown title="По уровню опыта в перезапусках" rows={experienceRows} />
            <Breakdown title="По проблеме / ступору" rows={problemRows} />
          </div>
        </section>

        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <Breakdown title="Музыкальные роли" rows={makeRows(roleOptions, users.flatMap((user) => user.roles))} />
          <Breakdown title="Жанры" rows={makeRows(genreOptions, users.flatMap((user) => user.genres))} />
          <Breakdown title="DAW" rows={makeRows(dawOptions, users.flatMap((user) => user.daw))} />
        </div>

        <section className="mt-6 rounded-[26px] border border-white/6 bg-[#1E1E1E] p-5">
          <h2 className="heading-font text-[22px] text-white">Хранилище</h2>
          <div className="mt-5 grid gap-3 text-[15px] md:grid-cols-2">
            <StorageCard label="analytics path" value={analyticsStorage.analyticsPath} />
            <StorageCard label="users path" value={usersStorage.usersPath} />
            <StorageCard label="tracks path" value={tracksStorage.tracksPath} />
            <StorageCard label="volume mount" value={analyticsStorage.mountPath || "Volume не обнаружен"} />
            <StorageCard label="analytics json" value={analyticsStorage.fileExists ? "Файл найден" : "Файл ещё не создан"} />
            <StorageCard label="users json" value={usersStorage.fileExists ? "Файл найден" : "Файл ещё не создан"} />
            <StorageCard label="tracks json" value={tracksStorage.fileExists ? "Файл найден" : "Файл ещё не создан"} />
            <StorageCard
              label="write access"
              value={
                analyticsStorage.directoryWritable && usersStorage.directoryWritable && tracksStorage.directoryWritable
                  ? "Запись доступна"
                  : "Есть проблема с записью"
              }
            />
          </div>
        </section>
      </div>
    </main>
  );
}
