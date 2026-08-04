import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { getCollectorSummary, localDayKey, segmentsForDay } from "./core/collector";
import { formatDuration } from "./core/presentation";
import AppActivityDetail from "./app-activity-detail";
import { useState } from "react";

const categoryIcon = { writing: Icon.Pencil, creating: Icon.Hammer, consuming: Icon.Play, other: Icon.Circle };

function timeRange(startedAt: string, endedAt: string): string {
  const start = new Date(startedAt);
  const end = new Date(endedAt);
  return `${start.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })} – ${end.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`;
}

function recentDays(): Date[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Array.from({ length: 14 }, (_, index) => {
    const date = new Date(today);
    date.setDate(today.getDate() - index);
    return date;
  });
}

function dayLabel(date: Date): string {
  if (localDayKey(date) === localDayKey()) return "Today";
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  if (localDayKey(date) === localDayKey(yesterday)) return "Yesterday";
  return date.toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" });
}

export default function ActivityTimeline() {
  const { data: summary, isLoading, revalidate } = usePromise(getCollectorSummary);
  const dates = recentDays();
  const [selectedDay, setSelectedDay] = useState(localDayKey());
  const selectedDate = dates.find((date) => localDayKey(date) === selectedDay) ?? new Date();
  const segments = segmentsForDay(summary, selectedDate);
  return (
    <List
      isLoading={isLoading}
      navigationTitle="Activity Timeline"
      searchBarPlaceholder="Filter activity"
      searchBarAccessory={
        <List.Dropdown tooltip="Timeline day" value={selectedDay} onChange={setSelectedDay}>
          {dates.map((date) => (
            <List.Dropdown.Item key={localDayKey(date)} title={dayLabel(date)} value={localDayKey(date)} />
          ))}
        </List.Dropdown>
      }
    >
      <List.Section title={dayLabel(selectedDate)} subtitle={`${segments.length} segments`}>
        {segments.map((segment) => {
          const seconds = Math.max(
            0,
            (new Date(segment.endedAt).getTime() - new Date(segment.startedAt).getTime()) / 1_000,
          );
          return (
            <List.Item
              key={`${segment.application.bundleIdentifier}-${segment.startedAt}`}
              title={segment.application.name}
              subtitle={`${segment.application.category} · ${timeRange(segment.startedAt, segment.endedAt)}`}
              icon={categoryIcon[segment.application.category]}
              accessories={[{ text: formatDuration(seconds * 1_000) }]}
              actions={
                <ActionPanel>
                  <Action title="Refresh Timeline" icon={Icon.ArrowClockwise} onAction={revalidate} />
                  <Action.Push
                    title="View App Activity"
                    icon={Icon.BarChart}
                    target={<AppActivityDetail application={segment.application} />}
                  />
                </ActionPanel>
              }
            />
          );
        })}
      </List.Section>
    </List>
  );
}
