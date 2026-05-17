"use client";

import { FormEvent, useMemo, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { ArrowRight, Loader2 } from "lucide-react";
import clsx from "clsx";

import { CoverArt } from "@/components/tracks/cover-art";
import {
  coverOptions,
  trackInstruments,
  trackStatusLabels,
  trackStatuses,
  trackTypeDescriptions,
  trackTypeLabels,
  trackTypes,
  type CoverId,
  type TrackInstrument,
  type TrackStatus,
  type TrackType,
} from "@/lib/track-options";

type ApiTrackResponse = {
  track?: {
    id: string;
  };
  error?: {
    code: string;
    message: string;
  };
};

function FieldIsland({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-[28px] bg-white/[0.08] p-4">
      <div>
        <h2 className="text-[20px] font-bold leading-tight text-white">{title}</h2>
        {description ? <p className="mt-1 text-[15px] leading-snug text-[#838383]">{description}</p> : null}
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function TextInput({
  value,
  onChange,
  placeholder,
  required,
  multiline,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  required?: boolean;
  multiline?: boolean;
}) {
  const className =
    "w-full rounded-[14px] border border-white/6 bg-white/[0.08] px-4 py-3 text-[16px] text-white outline-none placeholder:text-white/20 focus:border-[#78F761]";

  return multiline ? (
    <textarea
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      rows={4}
      className={className}
    />
  ) : (
    <input
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      required={required}
      className={className}
    />
  );
}

function CellIcon({ kind, selected }: { kind: string; selected: boolean }) {
  const commonClass = clsx("size-6", selected ? "text-[#78F761]" : "text-[#838383]");
  const assetClass = clsx("size-6", !selected && "opacity-55 grayscale");

  if (kind === "electronic" || kind === "Электронный бит") {
    return <Image src="/assets/cd-playing.svg" alt="" width={24} height={24} className={assetClass} />;
  }

  if (kind === "Синты") {
    return <Image src="/assets/wave.svg" alt="" width={24} height={24} className={assetClass} />;
  }

  if (kind === "acoustic" || kind === "Гитара") {
    return <Image src="/assets/guitar.svg" alt="" width={24} height={24} className={assetClass} />;
  }

  if (kind === "unknown" || kind === "Пока не знаю") {
    return (
      <svg viewBox="0 0 24 24" className={commonClass} aria-hidden="true">
        <path fill="currentColor" d="M12 2a10 10 0 1 0 10 10A10.01 10.01 0 0 0 12 2Zm.05 16a1.25 1.25 0 1 1 0-2.5 1.25 1.25 0 0 1 0 2.5ZM13 13.2v.3a1 1 0 1 1-2 0v-.9c0-1.2.8-1.8 1.7-2.4.8-.5 1.3-.9 1.3-1.7 0-.9-.7-1.5-1.8-1.5-1 0-1.7.5-2.1 1.3a1 1 0 1 1-1.8-.8C9 6 10.4 5 12.2 5 14.5 5 16 6.4 16 8.4c0 1.9-1.2 2.8-2.1 3.4-.6.4-.9.7-.9 1.4Z" />
      </svg>
    );
  }

  if (kind === "Фортепиано") {
    return <Image src="/assets/synthesizer.svg" alt="" width={24} height={24} className={assetClass} />;
  }

  if (kind === "Барабаны") {
    return <Image src="/assets/drum.svg" alt="" width={24} height={24} className={assetClass} />;
  }

  if (kind === "Вокал") {
    return (
      <svg viewBox="0 0 24 24" className={commonClass} aria-hidden="true">
        <path fill="currentColor" d="M12 2a4 4 0 0 0-4 4v5a4 4 0 0 0 8 0V6a4 4 0 0 0-4-4Zm7 8a1 1 0 1 0-2 0v1a5 5 0 0 1-10 0v-1a1 1 0 1 0-2 0v1a7 7 0 0 0 6 6.93V20H8a1 1 0 1 0 0 2h8a1 1 0 1 0 0-2h-3v-2.07A7 7 0 0 0 19 11v-1Z" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" className={commonClass} aria-hidden="true">
      <path fill="currentColor" d="M11 3a1 1 0 0 1 2 0v8h8a1 1 0 1 1 0 2h-8v8a1 1 0 1 1-2 0v-8H3a1 1 0 1 1 0-2h8V3Z" />
    </svg>
  );
}

function FilledCheck({ className = "size-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path fill="currentColor" d="M9.1 17.6a1.4 1.4 0 0 1-1-.4l-4-4a1.4 1.4 0 1 1 2-2l3 3 8.8-8.8a1.4 1.4 0 0 1 2 2l-9.8 9.8a1.4 1.4 0 0 1-1 .4Z" />
    </svg>
  );
}

export function NewTrackForm() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [notes, setNotes] = useState("");
  const [type, setType] = useState<TrackType>("electronic");
  const [status, setStatus] = useState<TrackStatus>("idea");
  const [instruments, setInstruments] = useState<TrackInstrument[]>([]);
  const [otherInstrumentDraft, setOtherInstrumentDraft] = useState("");
  const [isEditingOtherInstrument, setIsEditingOtherInstrument] = useState(false);
  const [coverId, setCoverId] = useState<CoverId>("acid-grid");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  const canSubmit = useMemo(() => title.trim().length > 0 && Boolean(coverId), [title, coverId]);

  function toggleInstrument(instrument: TrackInstrument) {
    if (instrument === "Пока не знаю") {
      setInstruments((current) => (current.includes(instrument) ? [] : [instrument]));
      return;
    }

    setInstruments((current) => {
      const next = current.filter((item) => item !== "Пока не знаю");
      return next.includes(instrument) ? next.filter((item) => item !== instrument) : [...next, instrument];
    });
  }

  const customInstrument = instruments.find((instrument) => !trackInstruments.includes(instrument as (typeof trackInstruments)[number]));

  function saveOtherInstrument() {
    const value = otherInstrumentDraft.trim();
    if (!value) return;

    setInstruments((current) => {
      const withoutCustom = current.filter((instrument) => trackInstruments.includes(instrument as (typeof trackInstruments)[number]));
      return Array.from(new Set([...withoutCustom.filter((instrument) => instrument !== "Пока не знаю"), value]));
    });
    setOtherInstrumentDraft("");
    setIsEditingOtherInstrument(false);
  }

  async function submitForm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSubmit) return;

    setError("");
    setIsSaving(true);
    try {
      const response = await fetch("/api/tracks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, subtitle, notes, type, instruments, status, coverId }),
      });
      const data = (await response.json()) as ApiTrackResponse;

      if (!response.ok || !data.track) {
        throw new Error(data.error?.message || "Не получилось создать демку");
      }

      router.push(`/app/tracks/${data.track.id}`);
      router.refresh();
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Не получилось создать демку");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <form onSubmit={submitForm} className="mt-6 grid gap-3">
      <FieldIsland title="Название">
        <TextInput value={title} onChange={setTitle} placeholder="track10" required />
      </FieldIsland>

      <FieldIsland
        title="Краткое описание"
        description="Жанр, вайб или любая пара слов, которые дадут понять, что за трек"
      >
        <TextInput value={subtitle} onChange={setSubtitle} placeholder="Гиперпоп в стиле Charli XCX" />
      </FieldIsland>

      <FieldIsland title="Заметки" description="Можно оставить рефы, мысли по аранжу или что не забыть">
        <TextInput value={notes} onChange={setNotes} placeholder="Что важно помнить по этой демке" multiline />
      </FieldIsland>

      <FieldIsland title="На каком этапе трек?">
        <div className="grid gap-3">
          <div className="grid grid-cols-2 gap-2">
            {trackStatuses.slice(0, 2).map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setStatus(option)}
                className="flex flex-col items-center gap-2 text-center"
              >
                <span
                  className={clsx(
                    "size-12 rounded-full border border-white/8 transition",
                    status === option ? "bg-[#78F761] shadow-[0_0_20px_rgba(120,247,97,0.25)]" : "bg-[#303030]",
                  )}
                />
                <span className="text-[12px] text-[#838383]">{trackStatusLabels[option]}</span>
              </button>
            ))}
          </div>

          <div className="rounded-[22px] border border-dashed border-white/16 p-3">
            <p className="mb-3 text-center text-[13px] leading-snug text-[#838383]">Эти статусы будут доступны дальше в трекере</p>
            <div className="grid grid-cols-3 gap-2">
              {trackStatuses.slice(2).map((option) => (
                <button
                  key={option}
                  type="button"
                  disabled
                  className="flex cursor-not-allowed flex-col items-center gap-2 text-center opacity-45"
                >
                  <span className="size-12 rounded-full border border-dashed border-white/12 bg-[#303030]" />
                  <span className="text-[12px] text-[#838383]">{trackStatusLabels[option]}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </FieldIsland>

      <FieldIsland
        title="Электронный или акустический?"
        description="Это нужно, чтобы дальше предложить подходящие шаблоны инструментов"
      >
        <div className="grid gap-2">
          {trackTypes.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setType(option)}
              className={clsx(
                "flex min-h-[58px] items-center gap-3 rounded-[14px] px-3 py-2 text-left transition",
                type === option ? "bg-[#3D3D3D]" : "bg-white/[0.08] hover:bg-[#303030]",
              )}
            >
              <span
                className={clsx(
                  "flex size-10 items-center justify-center rounded-[10px]",
                  type === option ? "bg-[#1E1E1E]" : "bg-[#3D3D3D]",
                )}
              >
                <CellIcon kind={option} selected={type === option} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[16px] text-white">{trackTypeLabels[option]}</span>
                <span className="block truncate text-[14px] text-white/40">{trackTypeDescriptions[option]}</span>
              </span>
              {type === option ? <FilledCheck className="size-6 text-[#78F761]" /> : null}
            </button>
          ))}
        </div>
      </FieldIsland>

      <FieldIsland title="Примерный состав инструментов" description="Если уже есть идеи. Дальше всё можно будет поменять">
        <div className="grid gap-2">
          {trackInstruments.filter((instrument) => instrument !== "Другое").map((instrument) => {
            const selected = instruments.includes(instrument);
            return (
              <button
                key={instrument}
                type="button"
                onClick={() => toggleInstrument(instrument)}
                className={clsx(
                  "flex min-h-[54px] items-center gap-3 rounded-[14px] px-3 text-left transition",
                  selected ? "bg-[#3D3D3D]" : "bg-white/[0.08] hover:bg-[#303030]",
                )}
              >
                <span
                  className={clsx(
                    "flex size-9 items-center justify-center rounded-[9px]",
                    selected ? "bg-[#1E1E1E]" : "bg-[#3D3D3D]",
                  )}
                >
                  <CellIcon kind={instrument} selected={selected} />
                </span>
                <span className="flex-1 text-[16px] text-white">
                  {instrument}
                </span>
                {selected ? <FilledCheck className="size-6 text-[#78F761]" /> : null}
              </button>
            );
          })}

          {isEditingOtherInstrument ? (
            <div className="flex min-h-[54px] items-center gap-3 rounded-[14px] bg-white/[0.08] px-3 py-2">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-[9px] bg-[#3D3D3D]">
                <CellIcon kind="Другое" selected={false} />
              </span>
              <input
                value={otherInstrumentDraft}
                onChange={(event) => setOtherInstrumentDraft(event.target.value)}
                placeholder="Напиши инструмент"
                className="min-w-0 flex-1 bg-transparent text-[16px] text-white outline-none placeholder:text-white/25"
              />
              <button
                type="button"
                onClick={saveOtherInstrument}
                disabled={!otherInstrumentDraft.trim()}
                aria-label="Сохранить инструмент"
                className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#78F761] text-[#0A0A0A] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <FilledCheck className="size-5" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => {
                setOtherInstrumentDraft(customInstrument || "");
                setIsEditingOtherInstrument(true);
              }}
              className={clsx(
                "flex min-h-[54px] items-center gap-3 rounded-[14px] px-3 text-left transition",
                customInstrument ? "bg-[#3D3D3D]" : "bg-white/[0.08] hover:bg-[#303030]",
              )}
            >
              <span
                className={clsx(
                  "flex size-9 items-center justify-center rounded-[9px]",
                  customInstrument ? "bg-[#1E1E1E]" : "bg-[#3D3D3D]",
                )}
              >
                <CellIcon kind="Другое" selected={Boolean(customInstrument)} />
              </span>
              <span className={clsx("flex-1 text-[16px]", customInstrument ? "text-white" : "text-white/25")}>
                {customInstrument || "Другое"}
              </span>
              {customInstrument ? <FilledCheck className="size-6 text-[#78F761]" /> : null}
            </button>
          )}
        </div>
      </FieldIsland>

      <FieldIsland
        title="Выбери обложку"
        description="Поможет визуально отличать трек. Конечно же, не итоговая обложка релиза"
      >
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          {coverOptions.map((cover) => (
            <button
              key={cover.id}
              type="button"
              onClick={() => setCoverId(cover.id)}
              className={clsx(
                "rounded-[24px] border p-2 transition",
                coverId === cover.id ? "border-[#78F761] bg-[#78F761]/10" : "border-white/6 bg-white/[0.06]",
              )}
            >
              <CoverArt coverId={cover.id} className="aspect-square w-full" />
            </button>
          ))}
        </div>
      </FieldIsland>

      {error ? <p className="rounded-[18px] border border-[#D621D7]/30 bg-[#D621D7]/10 p-4 text-[#FFD8FF]">{error}</p> : null}

      <button
        type="submit"
        disabled={!canSubmit || isSaving}
        className="mt-2 flex min-h-[58px] items-center justify-center gap-2 rounded-full bg-[#78F761] px-5 text-[17px] font-bold text-[#0A0A0A] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {isSaving ? <Loader2 size={18} className="animate-spin" /> : <ArrowRight size={18} />}
        Создать демку
      </button>
    </form>
  );
}
