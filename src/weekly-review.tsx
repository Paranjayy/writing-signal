import { Action, ActionPanel, Detail, Icon, LaunchType, launchCommand } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import {
  CollectorApplication,
  CollectorCategory,
  contextSwitchesForDay,
  getCollectorSummary,
  localDayKey,
} from "./core/collector";
import { formatDuration, formatNumber } from "./core/presentation";
import { getState } from "./core/storage";

type CategoryTotals = Record<CollectorCategory, number>;

function weekDates(now = new Date()): Date[] {
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(now);
    date.setDate(now.getDate() - (6 - index));
    return date;
  });
}

function categoryTotals(apps: CollectorApplication[]): CategoryTotals {
  return apps.reduce((totals, app) => ({ ...totals, [app.category]: totals[app.category] + app.seconds * 1_000 }), {
    writing: 0,
    creating: 0,
    consuming: 0,
    other: 0,
  });
}

export default function WeeklyReview() {
  const { data, isLoading, revalidate } = usePromise(async () => {
    const [state, collector] = await Promise.all([getState(), getCollectorSummary()]);
    const days = weekDates().map((date) => {
      const key = localDayKey(date);
      const apps = Object.values(collector?.days[key] ?? {});
      const categories = categoryTotals(apps);
      const keyboard = collector?.keyboardByDay[key];
      const intentional = state.days[key]?.activityMillis;
      return {
        date,
        key,
        selectedWords: state.days[key]?.words ?? 0,
        estimatedWords: keyboard?.estimatedWords ?? 0,
        totalAppMillis: apps.reduce((total, app) => total + app.seconds * 1_000, 0),
        categories,
        intentionalMillis: intentional ? Object.values(intentional).reduce((total, value) => total + value, 0) : 0,
        contextSwitches: contextSwitchesForDay(collector, date),
      };
    });
    return days;
  });

  const markdown = data
    ? `# Weekly Review

Your local seven-day signal: foreground app time, intentional timers, selected-text totals, and optional aggregate keyboard estimates. It contains no raw writing or key values.

| Day | App time | Write | Create | Consume | Switches | Intentional | Selected words | Est. typed |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
${data
  .map(
    (day) =>
      `| ${day.date.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })} | ${formatDuration(day.totalAppMillis)} | ${formatDuration(day.categories.writing)} | ${formatDuration(day.categories.creating)} | ${formatDuration(day.categories.consuming)} | ${formatNumber(day.contextSwitches)} | ${formatDuration(day.intentionalMillis)} | ${formatNumber(day.selectedWords)} | ${formatNumber(day.estimatedWords)} |`,
  )
  .join("\n")}

## Seven-day totals

- App time: ${formatDuration(data.reduce((total, day) => total + day.totalAppMillis, 0))}
- Writing apps: ${formatDuration(data.reduce((total, day) => total + day.categories.writing, 0))}
- Creating apps: ${formatDuration(data.reduce((total, day) => total + day.categories.creating, 0))}
- Consuming apps: ${formatDuration(data.reduce((total, day) => total + day.categories.consuming, 0))}
- App context switches: ${formatNumber(data.reduce((total, day) => total + day.contextSwitches, 0))}
- Intentional timer time: ${formatDuration(data.reduce((total, day) => total + day.intentionalMillis, 0))}
- Selected-text words: ${formatNumber(data.reduce((total, day) => total + day.selectedWords, 0))}
- Estimated typed words: ${formatNumber(data.reduce((total, day) => total + day.estimatedWords, 0))}
`
    : "# Weekly Review";

  return (
    <Detail
      isLoading={isLoading}
      navigationTitle="Weekly Review"
      markdown={markdown}
      actions={
        <ActionPanel>
          <Action title="Refresh Weekly Review" icon={Icon.ArrowClockwise} onAction={revalidate} />
          <Action
            title="Open Activity History"
            icon={Icon.Calendar}
            onAction={() => launchCommand({ name: "activity-history", type: LaunchType.UserInitiated })}
          />
          <Action
            title="Open Keyboard Activity"
            icon={Icon.Keyboard}
            onAction={() => launchCommand({ name: "keyboard-activity", type: LaunchType.UserInitiated })}
          />
        </ActionPanel>
      }
    />
  );
}
