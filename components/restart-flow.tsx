"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowDownToLine, ArrowLeft, Loader2, Lock, RotateCcw } from "lucide-react";
import clsx from "clsx";

import { PremiumLimitModal } from "@/components/premium/premium-limit-modal";
import { CoverArt } from "@/components/tracks/cover-art";
import { experienceOptions, problemOptions, type ExperienceId, type ProblemId } from "@/lib/options";
import type { CoverId } from "@/lib/track-options";
import type { RestartResult } from "@/lib/schemas";

type ApiError = {
  error?: {
    code: string;
    message: string;
  };
};

type RestartTrackOption = {
  id: string;
  title: string;
  subtitle: string;
  notes: string;
  coverId: CoverId;
  progressPercent: number;
};

type RestartFlowProps = {
  initialExperience?: ExperienceId | null;
  tracks?: RestartTrackOption[];
};

const loadingLines = [
  "Слушаю, где трек заклинило",
  "Кручу ручки креативного синта",
  "Ищу методику без советов уровня «просто вдохновись»",
  "Снимаю пыль с зависшей демки",
];

function StarsIcon({ className = "size-5" }: { className?: string }) {
  return (
    <span
      className={clsx("inline-block shrink-0 bg-current", className)}
      style={{
        mask: "url('/assets/stars.svg') center / contain no-repeat",
        WebkitMask: "url('/assets/stars.svg') center / contain no-repeat",
      }}
      aria-hidden="true"
    />
  );
}

function PillButton({
  children,
  variant = "primary",
  className,
  disabled,
  onClick,
  type = "button",
}: {
  children: React.ReactNode;
  variant?: "primary" | "secondary";
  className?: string;
  disabled?: boolean;
  onClick?: () => void;
  type?: "button" | "submit";
}) {
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={clsx(
        "flex min-h-[54px] items-center justify-center gap-2 rounded-full px-5 text-[16px] font-bold transition duration-200",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-[#78F761] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0A0A0A]",
        variant === "primary"
          ? "bg-[#78F761] text-[#0A0A0A] hover:brightness-110"
          : "bg-[#303030] text-white hover:bg-[#3D3D3D]",
        disabled && "cursor-not-allowed opacity-40 hover:brightness-100",
        className,
      )}
    >
      {children}
    </button>
  );
}

function ChoiceCard({
  selected,
  title,
  meta,
  description,
  onSelect,
}: {
  selected: boolean;
  title: string;
  meta: string;
  description?: string;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onSelect}
      onPointerUp={(event) => {
        if (event.pointerType !== "mouse") {
          onSelect();
        }
      }}
      className={clsx(
        "group min-h-[76px] w-full cursor-pointer rounded-[22px] border p-4 text-left transition duration-200 active:scale-[0.99]",
        "relative z-10 touch-manipulation select-none focus:outline-none focus-visible:ring-2 focus-visible:ring-[#78F761]",
        selected
          ? "border-[#78F761] bg-[#78F761] text-[#0A0A0A] shadow-[0_0_0_1px_rgba(120,247,97,0.2),0_18px_50px_rgba(120,247,97,0.12)]"
          : "border-white/5 bg-[#303030] text-white hover:border-white/12 hover:bg-[#3D3D3D]",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[17px] font-bold leading-tight">{title}</div>
          <div className={clsx("mt-1 text-[14px]", selected ? "text-black/70" : "text-[#C9C9C9]")}>{meta}</div>
          {description ? (
            <div className={clsx("mt-2 text-[13px] leading-snug", selected ? "text-black/60" : "text-[#838383]")}>
              {description}
            </div>
          ) : null}
        </div>
        <span
          className={clsx(
            "mt-1 size-3 shrink-0 rounded-full",
            selected ? "bg-[#0A0A0A]" : "bg-[#78F761] opacity-50 group-hover:opacity-100",
          )}
        />
      </div>
    </button>
  );
}

function TrackChoiceCard({
  selected,
  title,
  meta,
  coverId,
  progressPercent,
  onSelect,
}: {
  selected: boolean;
  title: string;
  meta: string;
  coverId?: CoverId;
  progressPercent?: number;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onSelect}
      className={clsx(
        "group flex min-h-[86px] w-full items-center gap-3 rounded-[22px] border py-3 pl-3 pr-6 text-left transition duration-200 active:scale-[0.99]",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-[#78F761]",
        selected
          ? "border-[#78F761] bg-[#78F761] text-[#0A0A0A] shadow-[0_0_0_1px_rgba(120,247,97,0.2),0_18px_50px_rgba(120,247,97,0.12)]"
          : "border-white/5 bg-[#303030] text-white hover:border-white/12 hover:bg-[#3D3D3D]",
      )}
    >
      {coverId ? (
        <CoverArt coverId={coverId} className="size-14 shrink-0 rounded-[16px]" />
      ) : (
        <span className={clsx("flex size-14 shrink-0 items-center justify-center rounded-[16px]", selected ? "bg-[#0A0A0A]/15" : "bg-[#1E1E1E]")}>
          <StarsIcon className="size-5" />
        </span>
      )}
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[16px] font-bold leading-tight">{title}</span>
        <span className={clsx("mt-1 block line-clamp-1 text-[13px]", selected ? "text-black/65" : "text-[#A5A5A5]")}>{meta}</span>
      </span>
      {typeof progressPercent === "number" ? (
        <span className="heading-font shrink-0 text-[15px]">{progressPercent}%</span>
      ) : null}
    </button>
  );
}

function ResultCard({
  eyebrow,
  title,
  children,
  featured,
}: {
  eyebrow: string;
  title: string;
  children: React.ReactNode;
  featured?: boolean;
}) {
  return (
    <section
      className={clsx(
        "rounded-[26px] border border-white/6 bg-[#1E1E1E] p-5",
        featured && "md:col-span-2",
      )}
    >
      <p className="heading-font text-[12px] uppercase text-[#78F761]">{eyebrow}</p>
      <h3 className="heading-font mt-3 text-[20px] leading-tight text-white">{title}</h3>
      <div className="mt-4 text-[16px] leading-relaxed text-[#D8D8D8]">{children}</div>
    </section>
  );
}

export function RestartFlow({ initialExperience = null, tracks = [] }: RestartFlowProps) {
  const [experience, setExperience] = useState<ExperienceId | null>(initialExperience);
  const [selectedTrackId, setSelectedTrackId] = useState<string | null>(null);
  const [problem, setProblem] = useState<ProblemId | null>(null);
  const [otherText, setOtherText] = useState("");
  const [result, setResult] = useState<RestartResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingIndex, setLoadingIndex] = useState(0);
  const [premiumOpen, setPremiumOpen] = useState(false);
  const [addDemoOpen, setAddDemoOpen] = useState(false);
  const [checklistError, setChecklistError] = useState<string | null>(null);

  const canSubmit = Boolean(experience && selectedTrackId && problem && (problem !== "other" || otherText.trim()));

  const selectedProblemLabel = useMemo(() => {
    if (!problem) return "ступор ещё не выбран";
    return problemOptions.find((item) => item.id === problem)?.title || "ступор выбран";
  }, [problem]);

  function selectExperience(nextExperience: ExperienceId) {
    setExperience(nextExperience);
    setError(null);
  }

  function selectProblem(nextProblem: ProblemId) {
    setProblem(nextProblem);
    setError(null);
    if (nextProblem !== "other") {
      setOtherText("");
    }
  }

  useEffect(() => {
    if (!isLoading) return;
    const timer = window.setInterval(() => {
      setLoadingIndex((current) => (current + 1) % loadingLines.length);
    }, 1500);
    return () => window.clearInterval(timer);
  }, [isLoading]);

  async function submitFlow() {
    if (!experience || !problem) return;

    setIsLoading(true);
    setError(null);
    setChecklistError(null);
    setResult(null);

    try {
      const response = await fetch("/api/restart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          experience,
          problem,
          otherText: problem === "other" ? otherText.trim() : undefined,
        }),
      });

      const data = (await response.json()) as RestartResult | ApiError;
      if (!response.ok) {
        if ("error" in data && data.error?.code === "RESTART_LIMIT_REACHED") {
          setPremiumOpen(true);
          return;
        }
        throw new Error("error" in data ? data.error?.message : "Не получилось подобрать перезапуск");
      }

      setResult(data as RestartResult);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Что-то пошло не так. Попробуй ещё раз");
    } finally {
      setIsLoading(false);
    }
  }

  function resetFlow() {
    setExperience(initialExperience);
    setSelectedTrackId(null);
    setProblem(null);
    setOtherText("");
    setResult(null);
    setError(null);
    setChecklistError(null);
  }

  async function openPremium() {
    setPremiumOpen(true);
    await fetch("/api/analytics", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ event: "premium_clicked" }),
    }).catch(() => undefined);
  }

  async function downloadChecklist() {
    setChecklistError(null);
    const response = await fetch("/api/checklist");
    if (!response.ok) {
      const data = (await response.json().catch(() => null)) as ApiError | null;
      setChecklistError(data?.error?.message || "Не получилось скачать чек-лист");
      return;
    }

    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "checklist-808.png";
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  return (
    <main className="relative min-h-screen overflow-hidden px-3 py-4 text-white sm:px-6 lg:px-8">
      <div className="noise-layer pointer-events-none absolute inset-0 opacity-50" />

      <div className="relative mx-auto grid min-h-screen w-full max-w-[1180px] items-start gap-6 py-4 lg:grid-cols-[0.9fr_1.1fr]">
        <section className="relative overflow-hidden rounded-[30px] border border-white/6 bg-[#0A0A0A] p-5 md:min-h-[560px] lg:sticky lg:top-6">
          <div className="relative z-10">
            <div className="flex items-center gap-3">
              <Link
                href="/app"
                aria-label="Назад"
                className="flex size-11 items-center justify-center rounded-full bg-[#1E1E1E] text-[#78F761] transition hover:bg-[#303030]"
              >
                <ArrowLeft size={20} />
              </Link>
              <p className="heading-font text-[12px] uppercase text-[#78F761]">Restart flow</p>
            </div>
            <h1 className="heading-font mt-5 max-w-[680px] text-[34px] leading-[1.08] sm:text-[44px] lg:text-[54px]">
              Подобрать сценарий перезапуска
            </h1>
            <p className="mt-5 max-w-[520px] text-[18px] leading-relaxed text-[#C9C9C9]">
              Выбери демку из трекера или другой проект, отметь свой опыт и место, где трек застрял
            </p>
          </div>

          <div className="relative mt-10 h-[330px] overflow-hidden rounded-[28px] bg-[#050505] sm:h-[420px] lg:h-[500px]">
            <div className="absolute left-8 top-10 heading-font text-[96px] leading-none text-[#78F761] opacity-20 blur-[5px]">
              8
            </div>
            <div className="absolute bottom-8 right-6 heading-font text-[110px] leading-none text-[#D621D7] opacity-20 blur-[6px]">
              8
            </div>
            <Image
              src="/assets/hero-smile.png"
              alt="808 Демок"
              width={760}
              height={610}
              priority
              className="absolute left-1/2 top-1/2 w-[115%] max-w-none -translate-x-1/2 -translate-y-1/2 object-contain"
            />
          </div>
        </section>

        <section className="rounded-[30px] border border-white/6 bg-[#111111]/92 p-3 shadow-2xl backdrop-blur md:p-5">
          <div className="rounded-[28px] bg-[#1E1E1E] p-4 md:p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="heading-font text-[12px] uppercase text-[#78F761]">inputs</p>
                <h2 className="heading-font mt-2 text-[26px] leading-tight md:text-[34px]">Где трек завис?</h2>
              </div>
              <div className="rounded-full bg-[#303030] px-4 py-2 text-[14px] text-[#C9C9C9]">{selectedProblemLabel}</div>
            </div>

            <div className="mt-6 rounded-[24px] bg-[#303030] p-4">
              <p className="heading-font text-[13px] uppercase text-[#78F761]">01 / опыт</p>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {experienceOptions.map((option) => (
                  <ChoiceCard
                    key={option.id}
                    selected={experience === option.id}
                    title={option.title}
                    meta={option.meta}
                    description={option.description}
                    onSelect={() => selectExperience(option.id)}
                  />
                ))}
              </div>
            </div>

            <div className="mt-4 rounded-[24px] bg-[#303030] p-4">
              <p className="heading-font text-[13px] uppercase text-[#78F761]">02 / демка</p>
              {tracks.length ? (
                <div className="mt-4 grid gap-3">
                  {tracks.map((track) => (
                    <TrackChoiceCard
                      key={track.id}
                      selected={selectedTrackId === track.id}
                      title={track.title}
                      meta={track.subtitle || track.notes || "Демка из трекера"}
                      coverId={track.coverId}
                      progressPercent={track.progressPercent}
                      onSelect={() => setSelectedTrackId(track.id)}
                    />
                  ))}
                  <TrackChoiceCard
                    selected={selectedTrackId === "other"}
                    title="Другая демка"
                    meta="проект не из трекера"
                    onSelect={() => setSelectedTrackId("other")}
                  />
                </div>
              ) : (
                <div
                  className={clsx(
                    "mt-4 rounded-[22px] border border-dashed p-4 transition",
                    selectedTrackId === "other" ? "border-[#78F761]/70 bg-[#78F761]/10" : "border-white/10 bg-[#1E1E1E]",
                  )}
                >
                  <p className="text-[16px] font-bold text-white">В трекере пока нет демок</p>
                  <p className="mt-2 text-[14px] leading-snug text-[#A5A5A5]">
                    {selectedTrackId === "other" ? "Ок, разберём демку без привязки к трекеру" : "Можно добавить демку или разобрать другой проект"}
                  </p>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <PillButton variant={selectedTrackId === "other" ? "primary" : "secondary"} onClick={() => setSelectedTrackId("other")}>
                      Пропустить
                    </PillButton>
                    <PillButton onClick={() => setAddDemoOpen(true)}>
                      Добавить демку
                    </PillButton>
                  </div>
                </div>
              )}
            </div>

            <div className="mt-4 rounded-[24px] bg-[#303030] p-4">
              <p className="heading-font text-[13px] uppercase text-[#78F761]">03 / ступор</p>
              <div className="mt-4 grid gap-3">
                {problemOptions.map((option) => (
                  <ChoiceCard
                    key={option.id}
                    selected={problem === option.id}
                    title={option.title}
                    meta={option.meta}
                    onSelect={() => selectProblem(option.id)}
                  />
                ))}
              </div>

              {problem === "other" ? (
                <textarea
                  value={otherText}
                  onChange={(event) => setOtherText(event.target.value)}
                  placeholder="Например: куплет нормальный, но припев звучит как заглушка"
                  className="mt-4 min-h-[140px] w-full resize-none rounded-[18px] border border-white/6 bg-[#1E1E1E] p-4 text-[16px] leading-relaxed text-white outline-none placeholder:text-white/25 focus:border-[#78F761]"
                />
              ) : null}
            </div>

            {!result && !isLoading ? (
              <div className="mt-4 rounded-[24px] border border-dashed border-white/10 bg-[#0F0F0F] p-4 text-[15px] leading-relaxed text-[#838383]">
                Выбери опыт, демку и этап ступора. Мы разберём контекст, подберём технику перезапуска и дадим советы,
                что делать дальше
              </div>
            ) : null}

            {error ? (
              <div className="mt-4 rounded-[22px] border border-[#D621D7]/30 bg-[#D621D7]/10 p-4 text-[15px] leading-relaxed text-[#FFD8FF]">
                {error}
              </div>
            ) : null}

            <PillButton className="mt-5 w-full" disabled={!canSubmit || isLoading} onClick={submitFlow}>
              {isLoading ? <Loader2 size={18} className="animate-spin" /> : <StarsIcon className="size-[18px]" />}
              {isLoading ? loadingLines[loadingIndex] : "Подобрать перезапуск"}
            </PillButton>
          </div>

          {result ? (
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <ResultCard eyebrow="01" title="Разбор ситуации" featured>
                {result.feedback}
              </ResultCard>
              <ResultCard eyebrow="02" title="Лучшая методика" featured>
                <p className="text-[#78F761]">{result.best_method}</p>
                <p className="mt-3">{result.best_method_summary}</p>
                <p className="mt-3 text-[#AFAFAF]">Пример: {result.best_method_example}</p>
              </ResultCard>
              <ResultCard eyebrow="03" title="Почему подходит">
                {result.why_it_fits}
              </ResultCard>
              <ResultCard eyebrow="04" title="Что сделать прямо сейчас">
                <ol className="space-y-3">
                  {result.action_steps.map((step, index) => (
                    <li key={step} className="flex gap-3">
                      <span className="heading-font text-[#78F761]">{index + 1}</span>
                      <span>{step}</span>
                    </li>
                  ))}
                </ol>
              </ResultCard>
              <ResultCard eyebrow="05" title="Дополнительные советы" featured>
                <ul className="space-y-3">
                  {result.extra_tips.map((tip) => (
                    <li key={tip} className="flex gap-3">
                      <span className="mt-2 size-2 shrink-0 rounded-full bg-[#78F761]" />
                      <span>{tip}</span>
                    </li>
                  ))}
                </ul>
              </ResultCard>

              <section className="rounded-[26px] border border-white/6 bg-[#1E1E1E] p-5 md:col-span-2">
                <p className="heading-font text-[12px] uppercase text-[#78F761]">bonus</p>
                <h3 className="heading-font mt-3 text-[22px] leading-tight text-white">Чек-лист прогресса</h3>
                <p className="mt-4 text-[17px] leading-relaxed text-[#D8D8D8]">
                  Лови бонус: чеклист прогресса. Поможет довести трек до конца и ничего не упустить
                </p>
                <PillButton
                  variant="secondary"
                  className="mt-5 w-full md:w-auto md:min-w-[240px]"
                  onClick={downloadChecklist}
                >
                  <ArrowDownToLine size={18} />
                  Получить чек-лист
                </PillButton>
                {checklistError ? <p className="mt-3 text-[14px] text-[#FFD8FF]">{checklistError}</p> : null}
              </section>

              <div className="grid gap-3 rounded-[26px] bg-[#1E1E1E] p-4 md:col-span-2 md:grid-cols-2">
                <PillButton variant="secondary" onClick={resetFlow}>
                  <RotateCcw size={18} />
                  Попробовать ещё раз
                </PillButton>
                <PillButton onClick={openPremium}>
                  <Lock size={18} />
                  Разблокировать Premium
                </PillButton>
              </div>
            </div>
          ) : null}
        </section>
      </div>

      {addDemoOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 py-6 backdrop-blur-sm">
          <div className="w-full max-w-[460px] rounded-[30px] border border-white/8 bg-[#1E1E1E] p-5 shadow-2xl">
            <p className="heading-font text-[12px] uppercase text-[#78F761]">tracks</p>
            <h2 className="mt-3 text-[28px] font-bold leading-tight text-white">Добавить демку?</h2>
            <p className="mt-3 text-[16px] leading-snug text-[#A5A5A5]">
              Создание откроется в трекере. После добавления можно вернуться сюда и подобрать перезапуск уже для этой демки
            </p>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <Link
                href="/app/tracks/new"
                className="flex min-h-[54px] items-center justify-center rounded-full bg-[#78F761] px-5 text-[16px] font-bold text-[#0A0A0A] transition hover:brightness-110"
              >
                Добавить демку
              </Link>
              <button
                type="button"
                onClick={() => setAddDemoOpen(false)}
                className="flex min-h-[54px] items-center justify-center rounded-full bg-[#303030] px-5 text-[16px] font-bold text-white transition hover:bg-[#3D3D3D]"
              >
                Закрыть
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {premiumOpen ? <PremiumLimitModal variant="restarts" onClose={() => setPremiumOpen(false)} /> : null}
    </main>
  );
}
