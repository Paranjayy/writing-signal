import { showHUD } from "@raycast/api";
import { getCollectorSummary, usageForDay } from "./core/collector";
import { markDailyReviewSent, shouldSendDailyReview } from "./core/daily-review";
import { formatDuration, formatNumber } from "./core/presentation";
import { aggregateDays, getState } from "./core/storage";

export default async function dailyReviewPulse() {
  const now = new Date();
  if (!(await shouldSendDailyReview(now))) return;
  const [state, collector] = await Promise.all([getState(), getCollectorSummary()]);
  const writing = aggregateDays(state, now, now).words;
  const apps = usageForDay(collector, now);
  const categories = apps.reduce(
    (total, app) => ({ ...total, [app.category]: total[app.category] + app.seconds * 1_000 }),
    { writing: 0, creating: 0, consuming: 0, other: 0 },
  );
  await showHUD(
    `Today: ${formatNumber(writing)} selected words · ${formatDuration(categories.creating)} creating · ${formatDuration(categories.consuming)} consuming`,
  );
  await markDailyReviewSent(now);
}
