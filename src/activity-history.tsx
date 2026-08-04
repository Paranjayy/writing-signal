import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useState } from "react";
import { CollectorApplication, contextSwitchesForDay, getCollectorSummary, localDayKey } from "./core/collector";
import { formatDuration, formatNumber } from "./core/presentation";
import ActivityTimeline from "./activity-timeline";
import ScreenTime from "./screen-time";

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
  const [range, setRange] = useState("14");
  const rangeDays = Number(range);
  const days = calendarDays(rangeDays).map((date) => {
    const key = localDayKey(date);
    const apps = Object.values(summary?.days[key] ?? {});
    const totals = categoryTotals(apps);
    const totalSeconds = apps.reduce((total, app) => total + app.seconds, 0);
    const leadingCategory = (Object.entries(totals) as [CollectorApplication["category"], number][]).sort(
      (left, right) => right[1] - left[1],
    )[0];
    return {
      date,
      key,
      apps,
      totals,
      totalSeconds,
      leadingCategory,
      keyboard: summary?.keyboardByDay[key],
      contextSwitches: contextSwitchesForDay(summary, date),
    };
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
    <List
      isLoading={isLoading}
      navigationTitle="Activity History"
      searchBarPlaceholder="Filter days"
      searchBarAccessory={
        <List.Dropdown tooltip="History range" value={range} onChange={setRange}>
          <List.Dropdown.Item title="Last 7 Days" value="7" />
          <List.Dropdown.Item title="Last 14 Days" value="14" />
          <List.Dropdown.Item title="Last 30 Days" value="30" />
          <List.Dropdown.Item title="Last 90 Days" value="90" />
        </List.Dropdown>
      }
    >
      <List.Section title={`Last ${rangeDays} days`} subtitle="Foreground-app time, not raw content">
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
              ...(day.contextSwitches > 0 ? [{ text: `${formatNumber(day.contextSwitches)} switches` }] : []),
              ...(day.keyboard ? [{ text: `${formatNumber(day.keyboard.estimatedWords)} est. words` }] : []),
            ]}
            actions={
              <ActionPanel>
                <Action title="Refresh Activity History" icon={Icon.ArrowClockwise} onAction={revalidate} />
                <Action.Push title="Open Automatic Screen Time" icon={Icon.BarChart} target={<ScreenTime />} />
                <Action.Push title="Open Today’s Timeline" icon={Icon.List} target={<ActivityTimeline />} />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}
