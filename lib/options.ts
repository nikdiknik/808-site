export const experienceOptions = [
  {
    id: "newbie",
    title: "Новичок",
    meta: "0-2 года",
    description: "Нужен простой вход без перегруза",
  },
  {
    id: "middle",
    title: "Миддл",
    meta: "2-5 лет",
    description: "Есть база, но трек снова висит",
  },
  {
    id: "advanced",
    title: "Продвинутый",
    meta: "5-7 лет",
    description: "Хочется свежего угла и точного пинка",
  },
  {
    id: "pro",
    title: "Профи",
    meta: "7-10 лет",
    description: "Нужен быстрый разбор без банальщины",
  },
] as const;

export const problemOptions = [
  {
    id: "no_idea",
    title: "Нет идеи трека",
    meta: "пустой проект",
  },
  {
    id: "no_structure",
    title: "Есть идея, но нет структуры трека",
    meta: "куски не складываются",
  },
  {
    id: "no_lyrics",
    title: "Нет идей для текста",
    meta: "слова не цепляют",
  },
  {
    id: "arrangement",
    title: "Не получается доделать аранжировку",
    meta: "петля крутится часами",
  },
  {
    id: "other",
    title: "Другое",
    meta: "опиши своими словами",
  },
] as const;

export type ExperienceId = (typeof experienceOptions)[number]["id"];
export type ProblemId = (typeof problemOptions)[number]["id"];

export const experienceLabels: Record<ExperienceId, string> = {
  newbie: "Новичок: 0-2 года",
  middle: "Миддл: 2-5 лет",
  advanced: "Продвинутый: 5-7 лет",
  pro: "Профи: 7-10 лет",
};

export const problemLabels: Record<ProblemId, string> = {
  no_idea: "Нет идеи трека",
  no_structure: "Есть идея, но нет структуры трека",
  no_lyrics: "Нет идей для текста",
  arrangement: "Не получается доделать аранжировку",
  other: "Другое",
};
