import { Action, ActionPanel, Detail, Icon } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { getBrowserUsage } from "./core/browser";
import { getCollectorSummary } from "./core/collector";
import { getGoals } from "./core/goals";
import { buildInsights } from "./core/insights";
import { formatDuration, formatNumber } from "./core/presentation";
import { dayKey, getState } from "./core/storage";
import WeeklyReview from "./weekly-review";

function percent(part: number, total: number): string {
  return total > 0 ? `${Math.round((part / total) * 100)}%` : "—";
}

export default function Insights() {
  const { data, isLoading, revalidate } = usePromise(async () => {
    const now = new Date();
    const [state, collector, browserUsage, goals] = await Promise.all([
      getState(),
      getCollectorSummary(),
      getBrowserUsage(now, now),
      getGoals(),
    ]);
    return { insight: buildInsights(state, collector, browserUsage, now), goals, state, now };
  });

  const markdown = data
    ? `# Personal Activity Insights

Everything below is calculated locally from your own aggregate activity data.

## Writing

- ${formatNumber(data.insight.todayWords)} selected-text words added today
- ${formatNumber(data.insight.weekWords)} selected-text words added in the last 7 days
- ${formatNumber(data.insight.estimatedTypedWords)} estimated words typed automatically today${data.insight.estimatedTypedWords === 0 ? " (enable optional keyboard aggregates to populate this)" : ""}

## Gentle goals

${data.goals.dailyWords > 0 ? `- Words: ${formatNumber(data.insight.todayWords)} / ${formatNumber(data.goals.dailyWords)} (${percent(data.insight.todayWords, data.goals.dailyWords)})` : "- No daily word target set"}
${data.goals.dailyFocusMinutes > 0 ? `- Focus: ${formatDuration(data.state.days[dayKey(data.now)]?.activityMillis.focus ?? 0)} / ${formatDuration(data.goals.dailyFocusMinutes * 60_000)} (${percent(data.state.days[dayKey(data.now)]?.activityMillis.focus ?? 0, data.goals.dailyFocusMinutes * 60_000)})` : ""}
${data.goals.dailyCreatingMinutes > 0 ? `- Creating: ${formatDuration(data.state.days[dayKey(data.now)]?.activityMillis.creating ?? 0)} / ${formatDuration(data.goals.dailyCreatingMinutes * 60_000)} (${percent(data.state.days[dayKey(data.now)]?.activityMillis.creating ?? 0, data.goals.dailyCreatingMinutes * 60_000)})` : ""}
${data.goals.dailyConsumingLimitMinutes > 0 ? `- Consuming ceiling: ${formatDuration(data.insight.categoryMillis.consuming)} / ${formatDuration(data.goals.dailyConsumingLimitMinutes * 60_000)} (${percent(data.insight.categoryMillis.consuming, data.goals.dailyConsumingLimitMinutes * 60_000)})` : ""}

Targets are optional and only live in your Raycast local storage.

## Automatic activity

- ${formatDuration(data.insight.automaticAppMillis)} of app activity today
- ${formatDuration(data.insight.automaticWeekMillis)} of app activity in the last 7 days
- ${formatNumber(data.insight.contextSwitchesToday)} app context switches today
- Today’s main app: ${data.insight.topApp ? `${data.insight.topApp.name} (${formatDuration(data.insight.topApp.seconds * 1_000)})` : "not collected yet"}
- Week’s main app: ${data.insight.topWeekApp ? `${data.insight.topWeekApp.name} (${formatDuration(data.insight.topWeekApp.seconds * 1_000)})` : "not collected yet"}

## Today’s balance

| Mode | Time | Share |
| --- | ---: | ---: |
| Writing | ${formatDuration(data.insight.categoryMillis.writing)} | ${percent(data.insight.categoryMillis.writing, data.insight.automaticAppMillis)} |
| Creating | ${formatDuration(data.insight.categoryMillis.creating)} | ${percent(data.insight.categoryMillis.creating, data.insight.automaticAppMillis)} |
| Consuming | ${formatDuration(data.insight.categoryMillis.consuming)} | ${percent(data.insight.categoryMillis.consuming, data.insight.automaticAppMillis)} |
| Other | ${formatDuration(data.insight.categoryMillis.other)} | ${percent(data.insight.categoryMillis.other, data.insight.automaticAppMillis)} |

## Browser

${data.insight.topDomain ? `Most-used hostname today: **${data.insight.topDomain.host}** (${formatDuration(data.insight.topDomain.milliseconds)})` : "No browser hostnames tracked yet."}
`
    : "# Personal Activity Insights";

  return (
    <Detail
      isLoading={isLoading}
      navigationTitle="Personal Activity Insights"
      markdown={markdown}
      actions={
        <ActionPanel>
          <Action title="Refresh Insights" icon={Icon.ArrowClockwise} onAction={revalidate} />
          <Action.Push title="Open Weekly Review" icon={Icon.Calendar} target={<WeeklyReview />} />
        </ActionPanel>
      }
    />
  );
}
