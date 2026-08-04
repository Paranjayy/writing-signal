import { Action, ActionPanel, Detail, Icon } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { getBrowserUsage } from "./core/browser";
import { getCollectorSummary } from "./core/collector";
import { buildInsights } from "./core/insights";
import { formatDuration, formatNumber } from "./core/presentation";
import { getState } from "./core/storage";

function percent(part: number, total: number): string {
  return total > 0 ? `${Math.round((part / total) * 100)}%` : "—";
}

export default function Insights() {
  const { data, isLoading, revalidate } = usePromise(async () => {
    const now = new Date();
    const [state, collector, browserUsage] = await Promise.all([
      getState(),
      getCollectorSummary(),
      getBrowserUsage(now, now),
    ]);
    return buildInsights(state, collector, browserUsage, now);
  });

  const markdown = data
    ? `# Personal Activity Insights

Everything below is calculated locally from your own aggregate activity data.

## Writing

- ${formatNumber(data.todayWords)} selected-text words added today
- ${formatNumber(data.weekWords)} selected-text words added in the last 7 days
- ${formatNumber(data.estimatedTypedWords)} estimated words typed automatically today${data.estimatedTypedWords === 0 ? " (enable optional keyboard aggregates to populate this)" : ""}

## Automatic activity

- ${formatDuration(data.automaticAppMillis)} of app activity today
- ${formatDuration(data.automaticWeekMillis)} of app activity in the last 7 days
- Today’s main app: ${data.topApp ? `${data.topApp.name} (${formatDuration(data.topApp.seconds * 1_000)})` : "not collected yet"}
- Week’s main app: ${data.topWeekApp ? `${data.topWeekApp.name} (${formatDuration(data.topWeekApp.seconds * 1_000)})` : "not collected yet"}

## Today’s balance

| Mode | Time | Share |
| --- | ---: | ---: |
| Writing | ${formatDuration(data.categoryMillis.writing)} | ${percent(data.categoryMillis.writing, data.automaticAppMillis)} |
| Creating | ${formatDuration(data.categoryMillis.creating)} | ${percent(data.categoryMillis.creating, data.automaticAppMillis)} |
| Consuming | ${formatDuration(data.categoryMillis.consuming)} | ${percent(data.categoryMillis.consuming, data.automaticAppMillis)} |
| Other | ${formatDuration(data.categoryMillis.other)} | ${percent(data.categoryMillis.other, data.automaticAppMillis)} |

## Browser

${data.topDomain ? `Most-used hostname today: **${data.topDomain.host}** (${formatDuration(data.topDomain.milliseconds)})` : "No browser hostnames tracked yet."}
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
        </ActionPanel>
      }
    />
  );
}
