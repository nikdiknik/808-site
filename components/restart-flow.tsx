"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { ArrowDownToLine, Loader2, Lock, RotateCcw, Sparkles, X } from "lucide-react";
import clsx from "clsx";

import { experienceOptions, problemOptions, type ExperienceId, type ProblemId } from "@/lib/options";
import type { RestartResult } from "@/lib/schemas";

type ApiError = {
  error?: {
    code: string;
    message: string;
  };
};

const loadingLines = [
  "Слушаю, где трек заклинило...",
  "Кручу ручки креативного синта...",
  "Ищу методику без советов уровня «просто вдохновись»...",
  "Снимаю пыль с зависшей демки...",
];

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
  onClick,
}: {
  selected: boolean;
  title: string;
  meta: string;
  description?: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={clsx(
        "group min-h-[76px] rounded-[22px] border p-4 text-left transition duration-200",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-[#78F761]",
        selected
          ? "border-[#78F761] bg-[#78F761] text-[#0A0A0A] mint-glow"
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
        featured && "bg-[#303030] md:col-span-2",
      )}
    >
      <p className="heading-font text-[12px] uppercase text-[#78F761]">{eyebrow}</p>
      <h3 className="heading-font mt-3 text-[20px] leading-tight text-white">{title}</h3>
      <div className="mt-4 text-[16px] leading-relaxed text-[#D8D8D8]">{children}</div>
    </section>
  );
}

function PremiumModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end bg-black/70 p-3 backdrop-blur-sm sm:items-center sm:justify-center">
      <div className="w-full max-w-[460px] rounded-[28px] border border-white/8 bg-[#1E1E1E] p-5 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="heading-font text-[12px] uppercase text-[#78F761]">Premium</p>
            <h2 className="heading-font mt-3 text-[26px] leading-tight">Разблокируй полный перезапуск</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#303030] text-white"
            aria-label="Закрыть"
          >
            <X size={20} />
          </button>
        </div>
        <p className="mt-5 text-[17px] leading-relaxed text-[#C9C9C9]">
          Premium откроет все методики, расширенный трекер прогресса, генератор идей и сохранение результатов по треку
        </p>
        <PillButton className="mt-6 w-full">
          <Lock size={18} />
          Premium за 399 ₽
        </PillButton>
      </div>
    </div>
  );
}

export function RestartFlow() {
  const [experience, setExperience] = useState<ExperienceId | null>(null);
  const [problem, setProblem] = useState<ProblemId | null>(null);
  const [otherText, setOtherText] = useState("");
  const [result, setResult] = useState<RestartResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingIndex, setLoadingIndex] = useState(0);
  const [premiumOpen, setPremiumOpen] = useState(false);
  const [checklistError, setChecklistError] = useState<string | null>(null);

  const canSubmit = Boolean(experience && problem && (problem !== "other" || otherText.trim()));

  const selectedProblemLabel = useMemo(() => {
    if (!problem) return "ступор ещё не выбран";
    return problemOptions.find((item) => item.id === problem)?.title || "ступор выбран";
  }, [problem]);

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
        throw new Error("error" in data ? data.error?.message : "Не получилось подобрать перезапуск.");
      }

      setResult(data as RestartResult);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Что-то пошло не так. Попробуй ещё раз.");
    } finally {
      setIsLoading(false);
    }
  }

  function resetFlow() {
    setExperience(null);
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
      setChecklistError(data?.error?.message || "Не получилось скачать чек-лист.");
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

      <div className="relative mx-auto grid min-h-screen w-full max-w-[1180px] gap-6 py-4 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
        <section className="relative overflow-hidden rounded-[30px] border border-white/6 bg-[#0A0A0A] p-5 md:min-h-[560px] lg:sticky lg:top-6">
          <div className="relative z-10">
            <div className="heading-font inline-flex rounded-full bg-[#303030] px-4 py-2 text-[12px] uppercase text-[#78F761]">
              808 Демок
            </div>
            <h1 className="heading-font mt-5 max-w-[680px] text-[34px] leading-[1.08] sm:text-[44px] lg:text-[54px]">
              Подобрать сценарий перезапуска
            </h1>
            <p className="mt-5 max-w-[520px] text-[18px] leading-relaxed text-[#C9C9C9]">
              Для демки, которая вроде живая, но уже третий вечер смотрит на тебя из DAW без движения.
            </p>
          </div>

          <div className="relative mt-10 h-[280px] overflow-hidden rounded-[28px] bg-[#050505] sm:h-[360px] lg:h-[420px]">
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
                <p className="heading-font text-[12px] uppercase text-[#78F761]">restart flow</p>
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
                    onClick={() => setExperience(option.id)}
                  />
                ))}
              </div>
            </div>

            <div className="mt-4 rounded-[24px] bg-[#303030] p-4">
              <p className="heading-font text-[13px] uppercase text-[#78F761]">02 / ступор</p>
              <div className="mt-4 grid gap-3">
                {problemOptions.map((option) => (
                  <ChoiceCard
                    key={option.id}
                    selected={problem === option.id}
                    title={option.title}
                    meta={option.meta}
                    onClick={() => setProblem(option.id)}
                  />
                ))}
              </div>

              {problem === "other" ? (
                <textarea
                  value={otherText}
                  onChange={(event) => setOtherText(event.target.value)}
                  placeholder="Например: куплет нормальный, но припев звучит как заглушка..."
                  className="mt-4 min-h-[140px] w-full resize-none rounded-[18px] border border-white/6 bg-[#1E1E1E] p-4 text-[16px] leading-relaxed text-white outline-none placeholder:text-white/25 focus:border-[#78F761]"
                />
              ) : null}
            </div>

            {!result && !isLoading ? (
              <div className="mt-4 rounded-[24px] border border-dashed border-white/10 bg-[#0F0F0F] p-4 text-[15px] leading-relaxed text-[#838383]">
                Выбери опыт и место, где демка зависла. Дальше backend спросит OpenAI по таблице методик и вернёт тебе
                конкретный перезапуск.
              </div>
            ) : null}

            {error ? (
              <div className="mt-4 rounded-[22px] border border-[#D621D7]/30 bg-[#D621D7]/10 p-4 text-[15px] leading-relaxed text-[#FFD8FF]">
                {error}
              </div>
            ) : null}

            <PillButton className="mt-5 w-full" disabled={!canSubmit || isLoading} onClick={submitFlow}>
              {isLoading ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18} />}
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

              <div className="grid gap-3 rounded-[26px] bg-[#1E1E1E] p-4 md:col-span-2 md:grid-cols-3">
                <PillButton variant="secondary" onClick={resetFlow}>
                  <RotateCcw size={18} />
                  Попробовать ещё раз
                </PillButton>
                <PillButton variant="secondary" onClick={downloadChecklist}>
                  <ArrowDownToLine size={18} />
                  Получить чек-лист
                </PillButton>
                <PillButton onClick={openPremium}>
                  <Lock size={18} />
                  Разблокировать Premium
                </PillButton>
                {checklistError ? (
                  <p className="text-[14px] text-[#FFD8FF] md:col-span-3">{checklistError}</p>
                ) : null}
              </div>
            </div>
          ) : null}
        </section>
      </div>

      {premiumOpen ? <PremiumModal onClose={() => setPremiumOpen(false)} /> : null}
    </main>
  );
}
