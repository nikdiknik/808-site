import Link from "next/link";

import { getAnalyticsSnapshot, getAnalyticsStorageInfo } from "@/lib/analytics";
import { experienceLabels, problemLabels, type ExperienceId, type ProblemId } from "@/lib/options";

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

export default async function AnalyticsPage() {
  const [analytics, storageInfo] = await Promise.all([getAnalyticsSnapshot(), getAnalyticsStorageInfo()]);
  const totalRequests = analytics.totals.started;
  const successfulRequests = analytics.totals.completed;
  const conversionRate = totalRequests ? Math.round((successfulRequests / totalRequests) * 100) : 0;

  const experienceRows = Object.entries(analytics.byExperience)
    .map(([key, value]) => ({
      label: experienceLabels[key as ExperienceId],
      value: value || 0,
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
      <div className="mx-auto max-w-[1120px]">
        <div className="rounded-[30px] border border-white/6 bg-[#111111] p-5 md:p-8">
          <p className="heading-font text-[12px] uppercase text-[#78F761]">808 Демок / analytics</p>
          <div className="mt-4 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <h1 className="heading-font text-[34px] leading-tight md:text-[48px]">Аналитика MVP</h1>
              <p className="mt-3 text-[17px] text-[#C9C9C9]">Последнее событие: {formatDate(analytics.lastUpdatedAt)}</p>
            </div>
            <Link
              href="/"
              className="inline-flex min-h-[48px] items-center justify-center rounded-full bg-[#303030] px-5 text-[15px] font-bold text-white"
            >
              Вернуться на сайт
            </Link>
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Object.entries(metricLabels).map(([key, label]) => (
              <StatCard key={key} label={label} value={analytics.totals[key as keyof typeof metricLabels]} />
            ))}
            <StatCard label="Конверсия в ответ" value={`${conversionRate}%`} />
          </div>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <Breakdown title="По уровню опыта" rows={experienceRows} />
          <Breakdown title="По проблеме / ступору" rows={problemRows} />
        </div>

        <section className="mt-6 rounded-[26px] border border-white/6 bg-[#1E1E1E] p-5">
          <h2 className="heading-font text-[22px] text-white">Storage status</h2>
          <div className="mt-5 grid gap-3 text-[15px] text-[#C9C9C9] md:grid-cols-2">
            <div className="rounded-[16px] bg-[#303030] p-4">
              <p className="heading-font text-[12px] uppercase text-[#78F761]">analytics path</p>
              <p className="mt-2 break-all">{storageInfo.analyticsPath}</p>
            </div>
            <div className="rounded-[16px] bg-[#303030] p-4">
              <p className="heading-font text-[12px] uppercase text-[#78F761]">volume mount</p>
              <p className="mt-2 break-all">{storageInfo.mountPath || "Volume не обнаружен"}</p>
            </div>
            <div className="rounded-[16px] bg-[#303030] p-4">
              <p className="heading-font text-[12px] uppercase text-[#78F761]">json file</p>
              <p className="mt-2">{storageInfo.fileExists ? "Файл найден" : "Файл ещё не создан"}</p>
            </div>
            <div className="rounded-[16px] bg-[#303030] p-4">
              <p className="heading-font text-[12px] uppercase text-[#78F761]">write access</p>
              <p className="mt-2">{storageInfo.directoryWritable ? "Запись доступна" : "Нет доступа к записи"}</p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
