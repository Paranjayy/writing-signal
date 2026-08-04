import { DomainUsage } from "./browser";
import { CollectorApplication, CollectorCategory, CollectorSummary, usageForDay, usageForRange } from "./collector";
import { aggregateDays } from "./storage";
import { WritingState } from "./types";

export type InsightSnapshot = {
  todayWords: number;
  weekWords: number;
  estimatedTypedWords: number;
  automaticAppMillis: number;
  automaticWeekMillis: number;
  topApp?: CollectorApplication;
  topWeekApp?: CollectorApplication;
  categoryMillis: Record<CollectorCategory, number>;
  topDomain?: DomainUsage;
};

export function buildInsights(
  state: WritingState,
  collector: CollectorSummary | undefined,
  browserUsage: DomainUsage[],
  now = new Date(),
): InsightSnapshot {
  const weekStart = new Date(now);
  weekStart.setDate(weekStart.getDate() - 6);
  const today = aggregateDays(state, now, now);
  const week = aggregateDays(state, weekStart, now);
  const todayApps = usageForDay(collector, now);
  const weekApps = usageForRange(collector, weekStart, now);
  const categoryMillis: Record<CollectorCategory, number> = { writing: 0, creating: 0, consuming: 0, other: 0 };
  for (const app of todayApps) categoryMillis[app.category] += app.seconds * 1_000;

  return {
    todayWords: today.words,
    weekWords: week.words,
    estimatedTypedWords: collector?.keyboardByDay[now.toLocaleDateString("en-CA")]?.estimatedWords ?? 0,
    automaticAppMillis: todayApps.reduce((total, app) => total + app.seconds * 1_000, 0),
    automaticWeekMillis: weekApps.reduce((total, app) => total + app.seconds * 1_000, 0),
    topApp: todayApps[0],
    topWeekApp: weekApps[0],
    categoryMillis,
    topDomain: browserUsage[0],
  };
}
