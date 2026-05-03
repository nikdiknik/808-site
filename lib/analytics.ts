import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import type { ExperienceId, ProblemId } from "@/lib/options";

export type AnalyticsEvent = "started" | "completed" | "failed" | "checklist_clicked" | "premium_clicked";

export type AnalyticsData = {
  totals: Record<AnalyticsEvent, number>;
  byExperience: Partial<Record<ExperienceId, number>>;
  byProblem: Partial<Record<ProblemId, number>>;
  lastUpdatedAt: string;
};

const defaultAnalytics: AnalyticsData = {
  totals: {
    started: 0,
    completed: 0,
    failed: 0,
    checklist_clicked: 0,
    premium_clicked: 0,
  },
  byExperience: {},
  byProblem: {},
  lastUpdatedAt: "",
};

function getAnalyticsPath(): string {
  const rawPath = process.env.ANALYTICS_PATH || "data/analytics.json";
  return path.isAbsolute(rawPath) ? rawPath : path.join(process.cwd(), rawPath);
}

async function loadAnalytics(): Promise<AnalyticsData> {
  try {
    const raw = await readFile(getAnalyticsPath(), "utf8");
    return { ...defaultAnalytics, ...JSON.parse(raw) };
  } catch {
    return structuredClone(defaultAnalytics);
  }
}

export async function getAnalyticsSnapshot(): Promise<AnalyticsData> {
  return loadAnalytics();
}

export async function recordAnalyticsEvent(
  event: AnalyticsEvent,
  context?: { experience?: ExperienceId; problem?: ProblemId },
): Promise<void> {
  try {
    const analyticsPath = getAnalyticsPath();
    const data = await loadAnalytics();

    data.totals[event] = (data.totals[event] || 0) + 1;
    if (context?.experience) {
      data.byExperience[context.experience] = (data.byExperience[context.experience] || 0) + 1;
    }
    if (context?.problem) {
      data.byProblem[context.problem] = (data.byProblem[context.problem] || 0) + 1;
    }
    data.lastUpdatedAt = new Date().toISOString();

    await mkdir(path.dirname(analyticsPath), { recursive: true });
    await writeFile(analyticsPath, JSON.stringify(data, null, 2), "utf8");
  } catch (error) {
    console.warn("Analytics write failed", error);
  }
}
