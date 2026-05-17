"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { ArrowLeft, Loader2 } from "lucide-react";
import clsx from "clsx";

import { CoverArt } from "@/components/tracks/cover-art";
import { trackInstruments, trackStatusLabels, trackStatuses } from "@/lib/track-options";
import type { Track, TrackProgressSection } from "@/lib/tracks";

type TrackDetailsClientProps = {
  track: Track;
};

const structureParts = ["Интро", "Куплет", "Припев", "Бридж", "Соло", "Яма", "Аутро"] as const;

function EditIcon() {
  return <Image src="/assets/edit.svg" alt="" width={20} height={20} />;
}

function FilledCheck({ className = "size-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path fill="currentColor" d="M9.1 17.6a1.4 1.4 0 0 1-1-.4l-4-4a1.4 1.4 0 1 1 2-2l3 3 8.8-8.8a1.4 1.4 0 0 1 2 2l-9.8 9.8a1.4 1.4 0 0 1-1 .4Z" />
    </svg>
  );
}

function textOrEmpty(value: string, fallback: string) {
  return value.trim() || fallback;
}

function formatUpdatedAt(value: string) {
  return new Intl.DateTimeFormat("ru-RU", {
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function PencilIcon() {
  return <Image src="/assets/edit.svg" alt="" width={18} height={18} />;
}

function TrashIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-5" aria-hidden="true">
      <path fill="currentColor" d="M9 3a2 2 0 0 0-2 2v1H4a1 1 0 1 0 0 2h1v11a3 3 0 0 0 3 3h8a3 3 0 0 0 3-3V8h1a1 1 0 1 0 0-2h-3V5a2 2 0 0 0-2-2H9Zm0 3V5h6v1H9Zm0 4a1 1 0 0 1 1 1v7a1 1 0 1 1-2 0v-7a1 1 0 0 1 1-1Zm6 0a1 1 0 0 1 1 1v7a1 1 0 1 1-2 0v-7a1 1 0 0 1 1-1Z" />
    </svg>
  );
}

function normalizeProgressSections(sections: TrackProgressSection[]) {
  return sections.map((section) => {
    if (section.id === "vocal") {
      return {
        ...section,
        isSkipped: Boolean(section.isSkipped),
      };
    }

    if (section.id !== "mixing_mastering") return section;

    const isDoneByTitle = (title: string, aliases: string[] = []) =>
      section.items.some((item) => [title, ...aliases].includes(item.title) && item.isDone);

    const items = [
      {
        id: "balans_gromkosti_vseh_dorozhek",
        title: "Баланс громкости всех дорожек",
        isDone: isDoneByTitle("Баланс громкости всех дорожек"),
      },
      {
        id: "panorama",
        title: "Панорама",
        isDone: isDoneByTitle("Панорама"),
      },
      {
        id: "ekvalizaciya",
        title: "Эквализация",
        isDone: isDoneByTitle("Эквализация"),
      },
      {
        id: "effekty",
        title: "Эффекты",
        isDone: isDoneByTitle("Эффекты"),
      },
      {
        id: "post_obrabotka",
        title: "Пост-обработка",
        isDone: isDoneByTitle("Пост-обработка", ["Компрессия"]),
      },
      {
        id: "eksport_v_audio",
        title: "Экспорт в аудио",
        isDone: isDoneByTitle("Экспорт в аудио", ["Экспорт WAV", "Экспорт MP3", "Версия для публикации"]),
      },
    ];

    return {
      ...section,
      items,
      isDone: items.length > 0 && items.every((item) => item.isDone),
    };
  });
}

function makeStructureItem(title: string) {
  const slug = title.toLowerCase().replaceAll(" ", "_").replaceAll("ё", "е");
  return {
    id: `${slug}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    title,
    isDone: true,
  };
}

export function TrackDetailsClient({ track }: TrackDetailsClientProps) {
  const router = useRouter();
  const initialTrack = { ...track, progressSections: normalizeProgressSections(track.progressSections) };
  const [savedTrack, setSavedTrack] = useState(initialTrack);
  const [title, setTitle] = useState(track.title);
  const [subtitle, setSubtitle] = useState(track.subtitle);
  const [notes, setNotes] = useState(track.notes);
  const [instruments, setInstruments] = useState(track.instruments);
  const [progressSections, setProgressSections] = useState(initialTrack.progressSections);
  const [isEditingInstruments, setIsEditingInstruments] = useState(false);
  const [instrumentDraft, setInstrumentDraft] = useState("");
  const [isStructureModalOpen, setIsStructureModalOpen] = useState(false);
  const [structureDraft, setStructureDraft] = useState<TrackProgressSection["items"]>([]);
  const [draggedStructureIndex, setDraggedStructureIndex] = useState<number | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [savingProgressKey, setSavingProgressKey] = useState("");
  const [error, setError] = useState("");

  function syncTrack(nextTrack: Track) {
    const normalizedTrack = { ...nextTrack, progressSections: normalizeProgressSections(nextTrack.progressSections) };
    setSavedTrack(normalizedTrack);
    setTitle(nextTrack.title);
    setSubtitle(nextTrack.subtitle);
    setNotes(nextTrack.notes);
    setInstruments(nextTrack.instruments);
    setProgressSections(normalizedTrack.progressSections);
  }

  async function patchTrack(patch: Partial<Track>) {
    setError("");

    const response = await fetch(`/api/tracks/${savedTrack.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    const data = (await response.json()) as { track?: Track; error?: { message?: string } };
    if (!response.ok || !data.track) {
      throw new Error(data.error?.message || "Не получилось сохранить трек");
    }

    syncTrack(data.track);
    return data.track;
  }

  async function saveTrack(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);

    try {
      await patchTrack({ title, subtitle, notes });
      setIsEditing(false);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Не получилось сохранить трек");
    } finally {
      setIsSaving(false);
    }
  }

  function toggleInstrument(instrument: string) {
    setInstruments((current) => (current.includes(instrument) ? current.filter((item) => item !== instrument) : [...current, instrument]));
  }

  async function saveInstruments() {
    setIsSaving(true);
    try {
      const nextSections = progressSections.map((section) => (section.id === "vocal" ? { ...section, isSkipped: !instruments.includes("Вокал") } : section));
      await patchTrack({ instruments, progressSections: nextSections });
      setInstrumentDraft("");
      setIsEditingInstruments(false);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Не получилось сохранить инструменты");
    } finally {
      setIsSaving(false);
    }
  }

  async function toggleProgressItem(sectionId: TrackProgressSection["id"], itemId: string) {
    const previousSections = progressSections;
    const nextSections = progressSections.map((section) => {
      if (section.id !== sectionId) return section;

      const items = section.items.map((item) => (item.id === itemId ? { ...item, isDone: !item.isDone } : item));
      return {
        ...section,
        items,
        isDone: items.length > 0 && items.every((item) => item.isDone),
      };
    });

    setProgressSections(nextSections);
    setSavingProgressKey(`${sectionId}:${itemId}`);
    try {
      await patchTrack({ progressSections: nextSections });
    } catch (caughtError) {
      setProgressSections(previousSections);
      setError(caughtError instanceof Error ? caughtError.message : "Не получилось сохранить прогресс");
    } finally {
      setSavingProgressKey("");
    }
  }

  async function toggleStructureChip(sectionId: TrackProgressSection["id"], itemId: string) {
    const previousSections = progressSections;
    const nextSections = progressSections.map((section) => {
      if (section.id !== sectionId) return section;

      const structureItems = (section.structureItems || []).map((item) => (item.id === itemId ? { ...item, isDone: !item.isDone } : item));
      const progressItems = [...section.items, ...structureItems];
      return {
        ...section,
        structureItems,
        isDone: progressItems.length > 0 && progressItems.every((item) => item.isDone),
      };
    });

    setProgressSections(nextSections);
    setSavingProgressKey(`${sectionId}:structure:${itemId}`);
    try {
      await patchTrack({ progressSections: nextSections });
    } catch (caughtError) {
      setProgressSections(previousSections);
      setError(caughtError instanceof Error ? caughtError.message : "Не получилось сохранить часть структуры");
    } finally {
      setSavingProgressKey("");
    }
  }

  async function setVocalEnabled(enabled: boolean) {
    const previousInstruments = instruments;
    const previousSections = progressSections;
    const nextInstruments = enabled ? Array.from(new Set([...instruments, "Вокал"])) : instruments.filter((instrument) => instrument !== "Вокал");
    const nextSections = progressSections.map((section) =>
      section.id === "vocal"
        ? {
            ...section,
            isSkipped: !enabled,
            isDone: enabled ? section.items.length > 0 && section.items.every((item) => item.isDone) : false,
          }
        : section,
    );

    setInstruments(nextInstruments);
    setProgressSections(nextSections);
    setSavingProgressKey("vocal:toggle");
    try {
      await patchTrack({ instruments: nextInstruments, progressSections: nextSections });
    } catch (caughtError) {
      setInstruments(previousInstruments);
      setProgressSections(previousSections);
      setError(caughtError instanceof Error ? caughtError.message : "Не получилось обновить вокал");
    } finally {
      setSavingProgressKey("");
    }
  }

  function getStructureItems() {
    const section = progressSections.find((item) => item.id === "structure");
    return section?.items.filter((item) => item.isDone) || [];
  }

  function openStructureBuilder() {
    setStructureDraft(getStructureItems());
    setIsStructureModalOpen(true);
  }

  function addStructurePart(title: string) {
    setStructureDraft((current) => [...current, makeStructureItem(title)]);
  }

  function removeStructurePart(index: number) {
    setStructureDraft((current) => current.filter((_, itemIndex) => itemIndex !== index));
  }

  function moveStructurePart(fromIndex: number, toIndex: number) {
    if (fromIndex === toIndex) return;
    setStructureDraft((current) => {
      const next = [...current];
      const [movedItem] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, movedItem);
      return next;
    });
  }

  async function saveStructure() {
    setIsSaving(true);
    const nextSections = progressSections.map((section) => {
      if (section.id !== "structure") return section;
      return {
        ...section,
        title: "Структура",
        items: structureDraft.map((item) => ({ ...item, isDone: true })),
        isDone: structureDraft.length > 0,
      };
    });

    try {
      await patchTrack({ progressSections: nextSections });
      setIsStructureModalOpen(false);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Не получилось сохранить структуру");
    } finally {
      setIsSaving(false);
    }
  }

  async function deleteTrack() {
    setError("");
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/tracks/${savedTrack.id}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        throw new Error("Не получилось удалить трек");
      }
      router.push("/app/tracks");
      router.refresh();
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Не получилось удалить трек");
      setIsDeleting(false);
    }
  }

  return (
    <div className="space-y-5">
      <section className="rounded-[30px] border border-white/6 bg-[#111111]/92 p-5 shadow-2xl backdrop-blur md:p-8">
        <div className="flex items-center gap-3">
          <Link
            href="/app/tracks"
            aria-label="Назад"
            className="flex size-11 items-center justify-center rounded-full bg-[#1E1E1E] text-[#78F761] transition hover:bg-[#303030]"
          >
            <ArrowLeft size={20} />
          </Link>
          <p className="heading-font text-[12px] uppercase text-[#78F761]">Track details</p>
        </div>

        <div className="mt-8 grid gap-8 md:grid-cols-[280px_minmax(0,1fr)] md:items-start">
          <CoverArt coverId={savedTrack.coverId} className="aspect-square w-full" />
          <div className="min-w-0">
      {isEditing ? (
        <form onSubmit={saveTrack} className="rounded-[28px] bg-[#1E1E1E] p-5">
          <p className="heading-font text-[12px] uppercase text-[#78F761]">редактирование</p>
          <div className="mt-4 grid gap-3">
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Название"
              required
              className="min-h-[58px] rounded-[18px] border border-white/6 bg-[#303030] px-4 text-[22px] font-bold text-white outline-none placeholder:text-white/25 focus:border-[#78F761]"
            />
            <input
              value={subtitle}
              onChange={(event) => setSubtitle(event.target.value)}
              placeholder="Описание"
              className="min-h-[54px] rounded-[18px] border border-white/6 bg-[#303030] px-4 text-[17px] text-white outline-none placeholder:text-white/25 focus:border-[#78F761]"
            />
            <textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Заметки"
              rows={4}
              className="rounded-[18px] border border-white/6 bg-[#303030] p-4 text-[17px] text-white outline-none placeholder:text-white/25 focus:border-[#78F761]"
            />
          </div>
          {error ? <p className="mt-3 rounded-[16px] border border-[#D621D7]/30 bg-[#D621D7]/10 p-3 text-[#FFD8FF]">{error}</p> : null}
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <button
              type="submit"
              disabled={isSaving || !title.trim()}
              className="flex min-h-[52px] items-center justify-center gap-2 rounded-full bg-[#78F761] px-5 text-[16px] font-bold text-[#0A0A0A] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {isSaving ? <Loader2 size={18} className="animate-spin" /> : <FilledCheck />}
              Сохранить
            </button>
            <button
              type="button"
              onClick={() => {
                setTitle(savedTrack.title);
                setSubtitle(savedTrack.subtitle);
                setNotes(savedTrack.notes);
                setIsEditing(false);
              }}
              className="flex min-h-[52px] items-center justify-center rounded-full bg-[#303030] px-5 text-[16px] font-bold text-white transition hover:bg-[#3D3D3D]"
            >
              Отменить
            </button>
          </div>
        </form>
      ) : (
        <div className="flex items-center justify-between gap-4">
          <h1 className="heading-font min-w-0 flex-1 text-[34px] leading-tight text-white md:text-[52px]">{savedTrack.title}</h1>
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={() => setIsEditing(true)}
              aria-label="Редактировать трек"
              className="flex size-12 items-center justify-center rounded-full bg-[#303030] transition hover:bg-[#3D3D3D]"
            >
              <EditIcon />
            </button>
            <button
              type="button"
              onClick={() => setIsDeleteModalOpen(true)}
              aria-label="Удалить трек"
              className="flex size-12 items-center justify-center rounded-full bg-[#303030] text-[#838383] transition hover:bg-[#3D3D3D] hover:text-white"
            >
              <TrashIcon />
            </button>
          </div>
        </div>
      )}

      {!isEditing ? (
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <section className="rounded-[24px] bg-[#1E1E1E] p-5">
            <p className="heading-font text-[12px] uppercase text-[#78F761]">описание</p>
            <p className="mt-4 text-[18px] leading-relaxed text-[#D8D8D8]">
              {textOrEmpty(savedTrack.subtitle, "Описание пока не заполнено")}
            </p>
          </section>
          <section className="rounded-[24px] bg-[#1E1E1E] p-5">
            <p className="heading-font text-[12px] uppercase text-[#78F761]">заметки</p>
            <p className="mt-4 text-[18px] leading-relaxed text-[#D8D8D8]">
              {textOrEmpty(savedTrack.notes, "Заметок пока нет")}
            </p>
          </section>
        </div>
      ) : null}

      <section className="mt-5 rounded-[26px] bg-[#1E1E1E] p-5">
        <p className="heading-font text-[12px] uppercase text-[#78F761]">статус</p>
        <div className="mt-5 grid grid-cols-5 gap-2">
          {trackStatuses.map((option) => {
            const selected = savedTrack.status === option;
            return (
              <div
                key={option}
                className="flex flex-col items-center gap-2 text-center"
              >
                <span
                  className={clsx(
                    "size-12 rounded-full border transition",
                    selected ? "bg-[#78F761] shadow-[0_0_20px_rgba(120,247,97,0.25)]" : "bg-[#303030]",
                    "border-white/8",
                  )}
                />
                <span className={clsx("text-[12px]", selected ? "text-white" : "text-[#838383]")}>
                  {trackStatusLabels[option]}
                </span>
              </div>
            );
          })}
        </div>
      </section>

      <div id="track-progress" className="mt-5 scroll-mt-8 rounded-[26px] bg-[#1E1E1E] p-5">
        <p className="heading-font text-[12px] uppercase text-[#78F761]">прогресс</p>
        <div className="mt-4 flex items-end justify-between gap-4">
          <span className="heading-font text-[56px] leading-none text-white">{savedTrack.progressPercent}%</span>
          <span className="text-right text-[16px] leading-snug text-[#838383]">
            Отмечай этапы ниже
            <br />
            Обновлено {formatUpdatedAt(savedTrack.updatedAt)}
          </span>
        </div>
        <div className="mt-5 h-3 overflow-hidden rounded-full bg-[#303030]">
          <div className="h-full rounded-full bg-[#78F761]" style={{ width: `${savedTrack.progressPercent}%` }} />
        </div>
      </div>

      <section className="mt-5 rounded-[28px] bg-[#1E1E1E] p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="heading-font text-[12px] uppercase text-[#78F761]">инструменты</p>
              <p className="mt-2 text-[15px] leading-snug text-[#838383]">Список можно менять по мере того, как демка обрастает слоями</p>
            </div>
            <button
              type="button"
              onClick={() => setIsEditingInstruments((value) => !value)}
              aria-label="Редактировать инструменты"
              className="flex size-11 shrink-0 items-center justify-center rounded-full bg-[#303030] text-[#78F761] transition hover:bg-[#3D3D3D]"
            >
              <PencilIcon />
            </button>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {instruments.length ? (
              instruments.map((instrument) => (
                <span key={instrument} className="rounded-full bg-[#303030] px-4 py-2 text-[14px] text-white">
                  {instrument}
                </span>
              ))
            ) : (
              <span className="rounded-full bg-[#303030] px-4 py-2 text-[14px] text-[#838383]">Инструменты пока не выбраны</span>
            )}
          </div>

          {isEditingInstruments ? (
            <div className="mt-4 grid gap-3">
              <div className="flex flex-wrap gap-2">
                {trackInstruments.filter((instrument) => instrument !== "Другое").map((instrument) => {
                  const selected = instruments.includes(instrument);
                  return (
                    <button
                      key={instrument}
                      type="button"
                      onClick={() => toggleInstrument(instrument)}
                      className={clsx(
                        "rounded-full px-4 py-2 text-[14px] transition",
                        selected ? "bg-[#78F761] text-[#0A0A0A]" : "bg-[#303030] text-white hover:bg-[#3D3D3D]",
                      )}
                    >
                      {instrument}
                    </button>
                  );
                })}
              </div>

              <div className="flex gap-2">
                <input
                  value={instrumentDraft}
                  onChange={(event) => setInstrumentDraft(event.target.value)}
                  placeholder="Другой инструмент"
                  className="min-h-[48px] min-w-0 flex-1 rounded-full border border-white/6 bg-[#303030] px-4 text-[15px] text-white outline-none placeholder:text-white/25 focus:border-[#78F761]"
                />
                <button
                  type="button"
                  onClick={() => {
                    const value = instrumentDraft.trim();
                    if (!value) return;
                    setInstruments((current) => Array.from(new Set([...current.filter((item) => item !== "Пока не знаю"), value])));
                    setInstrumentDraft("");
                  }}
                  disabled={!instrumentDraft.trim()}
                  aria-label="Добавить инструмент"
                  className="flex size-12 shrink-0 items-center justify-center rounded-full bg-[#78F761] text-[#0A0A0A] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <FilledCheck />
                </button>
              </div>

              <button
                type="button"
                onClick={saveInstruments}
                disabled={isSaving}
                className="flex min-h-[52px] items-center justify-center rounded-full bg-[#78F761] px-5 text-[16px] font-bold text-[#0A0A0A] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {isSaving ? <Loader2 size={18} className="animate-spin" /> : "Сохранить инструменты"}
              </button>
            </div>
          ) : null}
      </section>
          </div>
        </div>
      </section>

      <section className="mt-5 rounded-[28px] bg-[#111111] p-5">
        <div className="grid w-full gap-4 md:grid-cols-2">
          {progressSections.map((section) => (
            section.id === "structure" ? (
              <article
                key={section.id}
                className={clsx(
                  "flex flex-col rounded-[24px] border p-5 transition",
                  getStructureItems().length ? "border-[#78F761]/40 bg-[#1E1E1E]" : "border-white/6 bg-[#1E1E1E]",
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="text-[20px] font-bold leading-tight text-white">Структура</h2>
                    <p className="mt-2 text-[14px] leading-snug text-[#838383]">{section.description}</p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-3">
                    <span className={clsx("heading-font text-[12px] uppercase", getStructureItems().length ? "text-[#78F761]" : "text-[#838383]")}>
                      {getStructureItems().length ? "done" : "todo"}
                    </span>
                    {getStructureItems().length ? (
                      <button
                        type="button"
                        onClick={openStructureBuilder}
                        aria-label="Редактировать структуру"
                        className="flex h-8 w-12 items-center justify-center rounded-full bg-[#303030] text-[#78F761] transition hover:bg-[#3D3D3D]"
                      >
                        <PencilIcon />
                      </button>
                    ) : null}
                  </div>
                </div>

                <div className={clsx("grid gap-2", getStructureItems().length ? "mt-4" : "mt-auto pt-4")}>
                  {getStructureItems().length ? (
                    getStructureItems().map((item, index) => (
                      <div key={item.id} className="flex min-h-[46px] items-center gap-3 rounded-[14px] bg-[#303030] px-3 text-left">
                        <span className="heading-font flex size-7 shrink-0 items-center justify-center rounded-full bg-[#1E1E1E] text-[11px] text-[#78F761]">
                          {String(index + 1).padStart(2, "0")}
                        </span>
                        <span className="text-[15px] text-[#D8D8D8]">{item.title}</span>
                      </div>
                    ))
                  ) : (
                    <button
                      type="button"
                      onClick={openStructureBuilder}
                      className="flex min-h-[46px] items-center justify-center rounded-[14px] bg-[#303030] px-3 text-[15px] font-bold text-white transition hover:bg-[#3D3D3D]"
                    >
                      Собрать структуру
                    </button>
                  )}
                </div>
              </article>
            ) : (
            <article
              key={section.id}
              className={clsx(
                "rounded-[24px] border p-5 transition",
                section.id === "mixing_mastering" && "md:col-span-2",
                section.isSkipped
                  ? "border-white/6 bg-[#1E1E1E] opacity-45"
                  : section.isDone
                    ? "border-[#78F761]/40 bg-[#1E1E1E]"
                    : "border-white/6 bg-[#1E1E1E]",
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-[20px] font-bold leading-tight text-white">{section.title}</h2>
                  <p className="mt-2 text-[14px] leading-snug text-[#838383]">{section.description}</p>
                  {section.id === "vocal" ? (
                    <button
                      type="button"
                      onClick={() => setVocalEnabled(Boolean(section.isSkipped))}
                      disabled={Boolean(savingProgressKey)}
                      className="mt-4 flex items-center gap-3 rounded-full bg-[#303030] px-3 py-2 text-[14px] text-white transition hover:bg-[#3D3D3D] disabled:cursor-wait"
                    >
                      <span
                        className={clsx(
                          "relative h-6 w-11 rounded-full transition",
                          section.isSkipped ? "bg-[#1E1E1E]" : "bg-[#78F761]",
                        )}
                      >
                        <span
                          className={clsx(
                            "absolute top-1 size-4 rounded-full bg-white transition",
                            section.isSkipped ? "left-1 opacity-50" : "left-6",
                          )}
                        />
                      </span>
                      <span>{section.isSkipped ? "В треке нет вокала" : "Вокал есть в треке"}</span>
                    </button>
                  ) : null}
                </div>
                <span className={clsx("heading-font text-[12px] uppercase", section.isDone ? "text-[#78F761]" : "text-[#838383]")}>
                  {section.isSkipped ? "off" : section.isDone ? "done" : "todo"}
                </span>
              </div>

              <div className={clsx("mt-4 grid gap-2", section.id === "mixing_mastering" && "md:grid-cols-2")}>
                {section.items.map((item) => {
                  const saving = savingProgressKey === `${section.id}:${item.id}`;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => toggleProgressItem(section.id, item.id)}
                      disabled={Boolean(savingProgressKey) || Boolean(section.isSkipped)}
                      className="flex min-h-[46px] items-center gap-3 rounded-[14px] bg-[#303030] px-3 text-left transition hover:bg-[#3D3D3D] disabled:cursor-wait disabled:opacity-70"
                    >
                      <span
                        className={clsx(
                          "flex size-6 shrink-0 items-center justify-center rounded-[6px] border transition",
                          item.isDone ? "border-[#78F761] bg-[#78F761] text-[#0A0A0A]" : "border-white/25 bg-[#1E1E1E] text-transparent",
                        )}
                      >
                        {saving ? <Loader2 size={14} className="animate-spin text-[#0A0A0A]" /> : <FilledCheck className="size-4" />}
                      </span>
                      <span className={clsx("text-[15px]", item.isDone ? "text-white" : "text-[#D8D8D8]")}>{item.title}</span>
                    </button>
                  );
                })}
              </div>
              {section.structureItems?.length ? (
                <div className="mt-4 flex flex-wrap gap-2">
                  {section.structureItems.map((item) => {
                    const saving = savingProgressKey === `${section.id}:structure:${item.id}`;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => toggleStructureChip(section.id, item.id)}
                        disabled={Boolean(savingProgressKey) || Boolean(section.isSkipped)}
                        className={clsx(
                          "rounded-full px-3 py-2 text-[13px] font-bold transition disabled:cursor-wait disabled:opacity-70",
                          item.isDone ? "bg-[#78F761] text-[#0A0A0A]" : "bg-[#303030] text-[#D8D8D8] hover:bg-[#3D3D3D]",
                        )}
                      >
                        {saving ? "..." : item.title}
                      </button>
                    );
                  })}
                </div>
              ) : null}
            </article>
            )
          ))}
        </div>
        <div className="mt-5 flex justify-end">
          <button
            type="button"
            onClick={() => document.getElementById("track-progress")?.scrollIntoView({ behavior: "smooth", block: "center" })}
            className="flex min-h-[52px] w-full items-center justify-center rounded-full bg-[#303030] px-5 text-[16px] font-bold text-white transition hover:bg-[#3D3D3D] sm:w-auto"
          >
            Перейти к прогрессу
          </button>
        </div>
      </section>

      <section className="mt-5 w-full rounded-[28px] bg-[#111111] p-5">
          <p className="heading-font text-[12px] uppercase text-[#78F761]">restart</p>
          <div className="mt-3 grid w-full gap-4 sm:grid-cols-[1fr_auto] sm:items-center">
            <h2 className="text-[24px] font-bold leading-tight text-white">Застрял в треке?</h2>
            <Link
              href="/restart"
              className="flex min-h-[52px] items-center justify-center rounded-full bg-[#78F761] px-5 text-[16px] font-bold text-[#0A0A0A] transition hover:brightness-110"
            >
              Нужен творческий перезапуск
            </Link>
          </div>
      </section>

      {isDeleteModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 py-6 backdrop-blur-sm">
          <div className="w-full max-w-[460px] rounded-[30px] border border-white/8 bg-[#1E1E1E] p-5 shadow-2xl">
            <p className="heading-font text-[12px] uppercase text-[#78F761]">delete</p>
            <h2 className="mt-3 text-[28px] font-bold leading-tight text-white">Удалить демку?</h2>
            <p className="mt-3 text-[16px] leading-snug text-[#A5A5A5]">
              Трек, заметки и прогресс исчезнут из трекера. Это действие нельзя отменить
            </p>
            {error ? <p className="mt-4 rounded-[16px] border border-[#D621D7]/30 bg-[#D621D7]/10 p-3 text-[#FFD8FF]">{error}</p> : null}
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={deleteTrack}
                disabled={isDeleting}
                className="flex min-h-[54px] items-center justify-center rounded-full bg-[#303030] px-5 text-[16px] font-bold text-white transition hover:bg-[#3D3D3D] disabled:cursor-not-allowed disabled:opacity-40"
              >
                {isDeleting ? <Loader2 size={18} className="animate-spin" /> : "Удалить"}
              </button>
              <button
                type="button"
                onClick={() => setIsDeleteModalOpen(false)}
                disabled={isDeleting}
                className="flex min-h-[54px] items-center justify-center rounded-full bg-[#78F761] px-5 text-[16px] font-bold text-[#0A0A0A] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Оставить
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {isStructureModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 py-6 backdrop-blur-sm">
          <div className="max-h-[90vh] w-full max-w-[620px] overflow-y-auto rounded-[30px] border border-white/8 bg-[#1E1E1E] p-5 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="heading-font text-[12px] uppercase text-[#78F761]">структура</p>
                <h2 className="mt-3 text-[28px] font-bold leading-tight text-white">Собери структуру</h2>
                <p className="mt-2 text-[16px] leading-snug text-[#A5A5A5]">Добавляй части трека и перетаскивай их в нужном порядке</p>
              </div>
              <button
                type="button"
                onClick={() => setIsStructureModalOpen(false)}
                aria-label="Закрыть"
                className="flex size-11 shrink-0 items-center justify-center rounded-full bg-[#303030] text-white transition hover:bg-[#3D3D3D]"
              >
                ×
              </button>
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              {structureParts.map((part) => (
                <button
                  key={part}
                  type="button"
                  onClick={() => addStructurePart(part)}
                  className="rounded-full bg-[#303030] px-4 py-2 text-[15px] text-white transition hover:bg-[#3D3D3D]"
                >
                  + {part}
                </button>
              ))}
            </div>

            <div className="mt-5 grid gap-2">
              {structureDraft.length ? (
                structureDraft.map((item, index) => (
                  <div
                    key={item.id}
                    draggable
                    onDragStart={() => setDraggedStructureIndex(index)}
                    onDragOver={(event) => event.preventDefault()}
                    onDrop={() => {
                      if (draggedStructureIndex === null) return;
                      moveStructurePart(draggedStructureIndex, index);
                      setDraggedStructureIndex(null);
                    }}
                    className="flex min-h-[54px] cursor-grab items-center gap-3 rounded-[16px] bg-[#303030] px-4 active:cursor-grabbing"
                  >
                    <span className="heading-font flex size-8 shrink-0 items-center justify-center rounded-full bg-[#1E1E1E] text-[11px] text-[#78F761]">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <span className="flex-1 text-[17px] text-white">{item.title}</span>
                    <button
                      type="button"
                      onClick={() => removeStructurePart(index)}
                      aria-label="Удалить часть"
                      className="flex size-9 items-center justify-center rounded-full bg-[#1E1E1E] text-[#838383] transition hover:text-white"
                    >
                      ×
                    </button>
                  </div>
                ))
              ) : (
                <div className="rounded-[18px] border border-dashed border-white/12 bg-[#111111] p-5 text-[16px] text-[#838383]">
                  Добавь первую часть трека
                </div>
              )}
            </div>

            {error ? <p className="mt-4 rounded-[16px] border border-[#D621D7]/30 bg-[#D621D7]/10 p-3 text-[#FFD8FF]">{error}</p> : null}

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={saveStructure}
                disabled={isSaving || structureDraft.length === 0}
                className="flex min-h-[54px] items-center justify-center rounded-full bg-[#78F761] px-5 text-[16px] font-bold text-[#0A0A0A] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {isSaving ? <Loader2 size={18} className="animate-spin" /> : "Сохранить структуру"}
              </button>
              <button
                type="button"
                onClick={() => setIsStructureModalOpen(false)}
                className="flex min-h-[54px] items-center justify-center rounded-full bg-[#303030] px-5 text-[16px] font-bold text-white transition hover:bg-[#3D3D3D]"
              >
                Отменить
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
