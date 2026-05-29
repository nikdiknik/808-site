import { randomUUID } from "node:crypto";
import { existsSync } from "node:fs";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import { constants } from "node:fs";
import path from "node:path";
import { z } from "zod";

import type { AppUser } from "@/lib/supabase/server";
import {
  coverOptions,
  trackStatuses,
  trackTypes,
  type CoverId,
  type TrackInstrument,
  type TrackStatus,
  type TrackType,
} from "@/lib/track-options";
import { addUserDemo, ensureUserProfile, removeUserDemo } from "@/lib/users";

export type TrackProgressItem = {
  id: string;
  title: string;
  isDone: boolean;
};

export type TrackProgressSection = {
  id:
    | "idea"
    | "structure"
    | "beat"
    | "bass"
    | "harmony_melody"
    | "solo"
    | "sound_fx"
    | "vocal"
    | "mixing_mastering";
  title: string;
  description: string;
  isDone: boolean;
  isSkipped?: boolean;
  items: TrackProgressItem[];
  structureItems?: TrackProgressItem[];
};

export type Track = {
  id: string;
  userId: string;
  title: string;
  subtitle: string;
  notes: string;
  type: TrackType;
  instruments: TrackInstrument[];
  status: TrackStatus;
  coverId: CoverId;
  progressPercent: number;
  progressSections: TrackProgressSection[];
  createdAt: string;
  updatedAt: string;
};

type TracksData = {
  tracks: Record<string, Track>;
};

export type TracksStorageInfo = {
  tracksPath: string;
  fileExists: boolean;
  directoryWritable: boolean;
};

export const createTrackSchema = z.object({
  title: z.string().trim().min(1, "Добавь название демки").max(120),
  subtitle: z.string().trim().max(180).optional().default(""),
  notes: z.string().trim().max(1200).optional().default(""),
  type: z.enum(trackTypes).default("unknown"),
  instruments: z.array(z.string().trim().min(1).max(80)).default([]),
  status: z.enum(trackStatuses).default("idea"),
  coverId: z.enum(coverOptions.map((cover) => cover.id) as [CoverId, ...CoverId[]]).default("acid-grid"),
});

export const updateTrackSchema = createTrackSchema.partial().extend({
  progressSections: z.array(z.any()).optional(),
});

const defaultTracksData: TracksData = {
  tracks: {},
};

function getTracksPath(): string {
  const volumePath = process.env.RAILWAY_VOLUME_MOUNT_PATH;
  const rawPath = volumePath ? path.join(volumePath, "tracks.json") : process.env.TRACKS_PATH || "data/tracks.json";
  return path.isAbsolute(rawPath) ? rawPath : path.join(process.cwd(), rawPath);
}

async function loadTracks(): Promise<TracksData> {
  try {
    const raw = await readFile(getTracksPath(), "utf8");
    return { ...defaultTracksData, ...JSON.parse(raw) } as TracksData;
  } catch {
    return structuredClone(defaultTracksData);
  }
}

async function saveTracks(data: TracksData): Promise<void> {
  const tracksPath = getTracksPath();
  await mkdir(path.dirname(tracksPath), { recursive: true });
  await access(path.dirname(tracksPath), constants.W_OK);
  await writeFile(tracksPath, JSON.stringify(data, null, 2), "utf8");
}

async function canWriteDirectory(directory: string): Promise<boolean> {
  try {
    await mkdir(directory, { recursive: true });
    await access(directory, constants.W_OK);
    return true;
  } catch {
    return false;
  }
}

function makeItems(titles: string[]): TrackProgressItem[] {
  return titles.map((title) => ({
    id: title.toLowerCase().replaceAll(" ", "_").replaceAll("/", "_").replaceAll("ё", "е"),
    title,
    isDone: false,
  }));
}

export function createDefaultProgressSections(): TrackProgressSection[] {
  return [
    {
      id: "idea",
      title: "Идея трека",
      description: "Зафиксируй главный замысел: о чём трек, какое у него настроение и что он должен передавать",
      isDone: false,
      items: makeItems(["Вайб / настроение", "Тема / смысл (про что трек)", "Направление (жанр / референсы)"]),
    },
    {
      id: "structure",
      title: "Структура",
      description: "Разложи трек на основные части, чтобы понимать, что уже написано, а чего не хватает",
      isDone: false,
      items: makeItems(["Интро", "Куплет", "Припев", "Бридж", "Соло", "Яма", "Аутро"]),
    },
    {
      id: "beat",
      title: "Бит",
      description: "Собери ритмическую основу трека: грув, ударные и движение",
      isDone: false,
      items: makeItems(["Основной грув: бочка и снейр/клэп", "Хэты, другие тарелки и перкуссия", "Сбивки / вариации"]),
    },
    {
      id: "bass",
      title: "Бас",
      description: "Добавь низ и проверь, как бас работает с битом",
      isDone: false,
      items: makeItems(["Основная бас-партия", "Саб-бас", "Сочетается с бочкой и гармонией"]),
    },
    {
      id: "harmony_melody",
      title: "Гармония и мелодия",
      description: "Собери музыкальную основу: аккорды, мелодии и партии, которые раскрывают настроение",
      isDone: false,
      items: makeItems(["Аккорды / гармоническая основа", "Основная мелодия", "Выбраны звуки (пэды / пиано / синты и т.д.)"]),
    },
    {
      id: "solo",
      title: "Соло-партии",
      description: "Добавь выразительные партии, которые цепляют внимание и делают трек живее",
      isDone: false,
      items: makeItems(["Лид-партия (гитара/синт/духовые)", "Есть соло / импровизации", "Есть акценты / хуки"]),
    },
    {
      id: "sound_fx",
      title: "Саунд-дизайн и FX",
      description: "Добавь переходы, текстуры и эффекты, которые склеивают части трека",
      isDone: false,
      items: makeItems(["Переходы (райзеры и другие эффекты)", "Атмосфера / текстуры / шумы / семплы", "Эффекты (реверб, дилей и т.д.)"]),
    },
    {
      id: "vocal",
      title: "Вокал и текст",
      description: "Подготовь текст, вокальную партию и обработку, если в треке есть голос",
      isDone: false,
      isSkipped: false,
      items: makeItems(["Идея / черновик текста", "Основной вокал", "Бэки / эдлибы"]),
    },
    {
      id: "mixing_mastering",
      title: "Сведение и мастеринг",
      description: "Приведи партии в баланс: громкость, панорама, эквализация, обработка. Или делегируй это кому-то другому :)",
      isDone: false,
      items: makeItems(["Баланс громкости всех дорожек", "Панорама", "Эквализация", "Эффекты", "Пост-обработка", "Экспорт в аудио"]),
    },
  ];
}

const itemAliases: Record<string, string[]> = {
  "Основной грув: бочка и снейр/клэп": ["Прописана бочка", "Прописан снейр / клэп"],
  "Хэты, другие тарелки и перкуссия": ["Прописаны хай-хэты / тарелки", "Есть перкуссия (опционально)"],
  "Сбивки / вариации": ["Ритм качает и держит структуру трека"],
  "Основная бас-партия": ["Прописана бас-партия"],
  "Саб-бас": ["Прописан саб-бас"],
  "Сочетается с бочкой и гармонией": ["Партия сочетается с киком", "Гармонирует с другими инструментами"],
  "Аккорды / гармоническая основа": ["Есть аккорды / гармоническая основа"],
  "Основная мелодия": ["Пэды", "Синты", "Гитары"],
  "Лид-партия (гитара/синт/духовые)": ["Соло-гитара", "Лид-синт"],
  "Есть соло / импровизации": ["Импровизационная партия"],
  "Есть акценты / хуки": ["Дополнительные хуки"],
  "Переходы (райзеры и другие эффекты)": ["Райзеры", "Переходы", "Эффекты на переходах"],
  "Атмосфера / текстуры / шумы / семплы": ["Шумы", "Текстуры", "Вокальные сэмплы"],
  "Идея / черновик текста": ["Идея текста", "Черновик текста", "Куплет", "Припев"],
  "Основной вокал": ["Запись вокала"],
  "Бэки / эдлибы": ["Бэки", "Адлибы"],
  "Пост-обработка": ["Компрессия"],
  "Экспорт в аудио": ["Экспорт WAV", "Экспорт MP3", "Версия для публикации"],
};

function isEquivalentDone(currentSection: TrackProgressSection | undefined, title: string): boolean {
  if (!currentSection) return false;
  const aliases = [title, ...(itemAliases[title] || [])];
  return currentSection.items.some((item) => aliases.includes(item.title) && item.isDone);
}

function normalizeProgressSections(sections: TrackProgressSection[]): TrackProgressSection[] {
  const defaults = createDefaultProgressSections();
  const currentStructureSection = sections.find((section) => section.id === "structure");
  const structureItems = (currentStructureSection?.items || []).filter((item) => item.isDone);
  const sectionIdsWithStructureChips: TrackProgressSection["id"][] = ["beat", "bass", "harmony_melody", "solo", "vocal"];

  return defaults.map((defaultSection) => {
    const currentSection = sections.find((section) => section.id === defaultSection.id);

    if (defaultSection.id === "structure") {
      return {
        ...defaultSection,
        items: currentSection?.items || defaultSection.items,
        isDone: Boolean(currentSection?.items?.some((item) => item.isDone)),
      };
    }

    const items = defaultSection.items.map((item) => ({
      ...item,
      isDone: isEquivalentDone(currentSection, item.title),
    }));
    const currentStructureItems = currentSection?.structureItems || [];
    const syncedStructureItems = sectionIdsWithStructureChips.includes(defaultSection.id)
      ? structureItems.map((structureItem) => ({
          ...structureItem,
          isDone: currentStructureItems.some((item) => item.id === structureItem.id && item.isDone),
        }))
      : undefined;

    const isSkipped = defaultSection.id === "vocal" ? Boolean(currentSection?.isSkipped) : false;
    return {
      ...defaultSection,
      isSkipped,
      items,
      ...(syncedStructureItems ? { structureItems: syncedStructureItems } : {}),
      isDone: !isSkipped && items.length > 0 && items.every((item) => item.isDone),
    };
  });
}

function getStatusAvailability(progressSections: TrackProgressSection[]) {
  const ideaDone = progressSections.some((section) => section.id === "idea" && section.isDone);
  const structureDone = progressSections.some((section) => section.id === "structure" && section.isDone);
  const preMixSectionsDone = progressSections
    .filter((section) => section.id !== "mixing_mastering")
    .every((section) => section.isSkipped || section.isDone);
  const mixingStarted = progressSections
    .find((section) => section.id === "mixing_mastering")
    ?.items.some((item) => item.isDone) || false;

  return { ideaDone, structureDone, preMixSectionsDone, mixingStarted };
}

function normalizeTrackStatus(progressSections: TrackProgressSection[]): TrackStatus {
  const { ideaDone, structureDone, preMixSectionsDone, mixingStarted } = getStatusAvailability(progressSections);

  if (mixingStarted) return "mixing";
  if (preMixSectionsDone) return "recording";
  if (ideaDone && structureDone) return "arrangement";
  if (ideaDone || structureDone) return "demo";
  return "idea";
}

export function recalculateTrackProgress(track: Track): Track {
  const progressSections = normalizeProgressSections(track.progressSections).map((section) => {
    if (section.id === "vocal") {
      const isSkipped = !track.instruments.includes("Вокал");
      if (isSkipped) {
        return {
          ...section,
          isSkipped: true,
          isDone: false,
        };
      }
      return {
        ...section,
        isSkipped: false,
      };
    }

    if (section.isSkipped) {
      return {
        ...section,
        isDone: false,
      };
    }
    const items = section.isDone ? section.items.map((item) => ({ ...item, isDone: true })) : section.items;
    const progressItems = [...items, ...(section.structureItems || [])];
    return {
      ...section,
      items,
      isDone: progressItems.length > 0 && progressItems.every((item) => item.isDone),
    };
  });
  const progressUnits = progressSections
    .filter((section) => !section.isSkipped)
    .flatMap((section) => (section.id === "structure" ? [{ isDone: section.isDone }] : [...section.items, ...(section.structureItems || [])]));
  const doneUnits = progressUnits.filter((item) => item.isDone);
  const progressPercent = progressUnits.length ? Math.round((doneUnits.length / progressUnits.length) * 100) : 0;
  const status = normalizeTrackStatus(progressSections);
  return { ...track, status, progressSections, progressPercent };
}

export async function getUserTracks(user: AppUser): Promise<Track[]> {
  const data = await loadTracks();
  return Object.values(data.tracks)
    .filter((track) => track.userId === user.id)
    .map((track) => recalculateTrackProgress(track))
    .sort((first, second) => Date.parse(second.updatedAt) - Date.parse(first.updatedAt));
}

export async function getAllTracksSnapshot(): Promise<Track[]> {
  const data = await loadTracks();
  return Object.values(data.tracks)
    .map((track) => recalculateTrackProgress(track))
    .sort((first, second) => Date.parse(second.updatedAt) - Date.parse(first.updatedAt));
}

export async function reassignTracksOwner(sourceUserIds: string[], targetUserId: string): Promise<void> {
  if (!sourceUserIds.length) return;

  const sourceUserIdSet = new Set(sourceUserIds);
  const data = await loadTracks();
  let changed = false;

  for (const track of Object.values(data.tracks)) {
    if (!sourceUserIdSet.has(track.userId)) continue;
    track.userId = targetUserId;
    track.updatedAt = new Date().toISOString();
    changed = true;
  }

  if (changed) {
    await saveTracks(data);
  }
}

export async function getTracksStorageInfo(): Promise<TracksStorageInfo> {
  const tracksPath = getTracksPath();
  return {
    tracksPath,
    fileExists: existsSync(tracksPath),
    directoryWritable: await canWriteDirectory(path.dirname(tracksPath)),
  };
}

export async function getUserTrack(user: AppUser, trackId: string): Promise<Track | null> {
  const data = await loadTracks();
  const track = data.tracks[trackId];
  return track?.userId === user.id ? recalculateTrackProgress(track) : null;
}

export async function createUserTrack(user: AppUser, payload: z.infer<typeof createTrackSchema>): Promise<Track> {
  const profile = await ensureUserProfile(user);
  if (!profile.isPremium && profile.demos.length >= 1) {
    const error = new Error("TRACK_LIMIT_REACHED");
    error.name = "TRACK_LIMIT_REACHED";
    throw error;
  }

  const data = await loadTracks();
  const now = new Date().toISOString();
  const initialStatus = payload.status === "demo" ? "demo" : "idea";
  const track: Track = recalculateTrackProgress({
    id: randomUUID(),
    userId: user.id,
    title: payload.title,
    subtitle: payload.subtitle || "",
    notes: payload.notes || "",
    type: payload.type,
    instruments: payload.instruments,
    status: initialStatus,
    coverId: payload.coverId,
    progressPercent: 0,
    progressSections: createDefaultProgressSections(),
    createdAt: now,
    updatedAt: now,
  });

  data.tracks[track.id] = track;
  await saveTracks(data);
  await addUserDemo(user, track.id);
  return track;
}

export async function updateUserTrack(user: AppUser, trackId: string, patch: z.infer<typeof updateTrackSchema>): Promise<Track | null> {
  const data = await loadTracks();
  const currentTrack = data.tracks[trackId];
  if (!currentTrack || currentTrack.userId !== user.id) return null;

  const nextTrack = recalculateTrackProgress({
    ...currentTrack,
    ...patch,
    id: currentTrack.id,
    userId: currentTrack.userId,
    updatedAt: new Date().toISOString(),
  } as Track);
  data.tracks[trackId] = nextTrack;
  await saveTracks(data);
  return nextTrack;
}

export async function deleteUserTrack(user: AppUser, trackId: string): Promise<boolean> {
  const data = await loadTracks();
  const track = data.tracks[trackId];
  if (!track || track.userId !== user.id) return false;

  delete data.tracks[trackId];
  await saveTracks(data);
  await removeUserDemo(user, trackId);
  return true;
}
