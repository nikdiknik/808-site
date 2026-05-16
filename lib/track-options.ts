export const trackTypes = ["electronic", "acoustic", "unknown"] as const;
export const trackStatuses = ["idea", "demo", "arrangement", "recording", "mixing"] as const;
export const trackInstruments = [
  "Пока не знаю",
  "Гитара",
  "Фортепиано",
  "Синты",
  "Электронный бит",
  "Барабаны",
  "Вокал",
  "Другое",
] as const;

export const coverOptions = [
  { id: "acid-grid", title: "Acid grid" },
  { id: "neon-orbit", title: "Neon orbit" },
  { id: "green-wave", title: "Green wave" },
  { id: "signal-core", title: "Signal core" },
  { id: "dark-pulse", title: "Dark pulse" },
] as const;

export type TrackType = (typeof trackTypes)[number];
export type TrackStatus = (typeof trackStatuses)[number];
export type TrackInstrument = string;
export type CoverId = (typeof coverOptions)[number]["id"];

export const trackTypeLabels: Record<TrackType, string> = {
  electronic: "Скорее электронный",
  acoustic: "Скорее акустический",
  unknown: "Пока не знаю",
};

export const trackTypeDescriptions: Record<TrackType, string> = {
  electronic: "Синты и бит",
  acoustic: "Гитары, клавиши, барабаны",
  unknown: "Разберёмся по ходу",
};

export const trackStatusLabels: Record<TrackStatus, string> = {
  idea: "Идея",
  demo: "Структура",
  arrangement: "Аранж",
  recording: "Запись",
  mixing: "Сведение",
};
