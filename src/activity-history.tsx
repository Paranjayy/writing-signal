import { Action, ActionPanel, Icon, LaunchType, List, launchCommand } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { CollectorApplication, getCollectorSummary, localDayKey } from "./core/collector";
import { formatDuration, formatNumber } from "./core/presentation";

const categoryIcon = { writing: Icon.Pencil, creating: Icon.Hammer, consuming: Icon.Play, other: Icon.Circle };

function calendarDays(count: number): Date[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Array.from({ length: count }, (_, index) => {
    const date = new Date(today);
    date.setDate(today.getDate() - index);
    return date;
  });
}

function titleForDay(date: Date): string {
  const key = localDayKey(date);
  const today = localDayKey();
  if (key === today) return "Today";
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  if (key === localDayKey(yesterday)) return "Yesterday";
  return date.toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" });
}

function categoryTotals(apps: CollectorApplication[]): Record<CollectorApplication["category"], number> {
  return apps.reduce((totals, app) => ({ ...totals, [app.category]: totals[app.category] + app.seconds }), {
    writing: 0,
    creating: 0,
    consuming: 0,
    other: 0,
  });
}

export default function ActivityHistory() {
  const { data: summary, isLoading, revalidate } = usePromise(getCollectorSummary);
  const days = calendarDays(14).map((date) => {
    const key = localDayKey(date);
    const apps = Object.values(summary?.days[key] ?? {});
    const totals = categoryTotals(apps);
    const totalSeconds = apps.reduce((total, app) => total + app.seconds, 0);
    const leadingCategory = (Object.entries(totals) as [CollectorApplication["category"], number][]).sort(
      (left, right) => right[1] - left[1],
    )[0];
    return { date, key, apps, totals, totalSeconds, leadingCategory, keyboard: summary?.keyboardByDay[key] };
  });

  if (!isLoading && !summary) {
    return (
      <List navigationTitle="Activity History">
        <List.EmptyView
          icon={Icon.Calendar}
          title="No automatic activity yet"
          description="Install and run the optional native collector to build your private day-by-day screen-time recap."
        />
      </List>
    );
  }

  return (
    <List isLoading={isLoading} navigationTitle="Activity History" searchBarPlaceholder="Filter days">
      <List.Section title="Last 14 days" subtitle="Foreground-app time, not raw content">
        {days.map((day) => (
          <List.Item
            key={day.key}
            title={titleForDay(day.date)}
            subtitle={
              day.totalSeconds > 0
                ? `${day.apps.length} apps · mostly ${day.leadingCategory[0]}`
                : "No foreground app activity recorded"
            }
            icon={categoryIcon[day.leadingCategory[0]]}
            accessories={[
              { text: formatDuration(day.totalSeconds * 1_000) },
              ...(day.keyboard ? [{ text: `${formatNumber(day.keyboard.estimatedWords)} est. words` }] : []),
            ]}
            actions={
              <ActionPanel>
                <Action title="Refresh Activity History" icon={Icon.ArrowClockwise} onAction={revalidate} />
                <Action
                  title="Open Automatic Screen Time"
                  icon={Icon.BarChart}
                  onAction={() => launchCommand({ name: "screen-time", type: LaunchType.UserInitiated })}
                />
                <Action
                  title="Open Today’s Timeline"
                  icon={Icon.List}
                  onAction={() => launchCommand({ name: "activity-timeline", type: LaunchType.UserInitiated })}
                />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}
