import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { getCollectorSummary, segmentsForDay } from "./core/collector";
import { formatDuration } from "./core/presentation";

const categoryIcon = { writing: Icon.Pencil, creating: Icon.Hammer, consuming: Icon.Play, other: Icon.Circle };

function timeRange(startedAt: string, endedAt: string): string {
  const start = new Date(startedAt);
  const end = new Date(endedAt);
  return `${start.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })} – ${end.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`;
}

export default function ActivityTimeline() {
  const { data: summary, isLoading, revalidate } = usePromise(getCollectorSummary);
  const segments = segmentsForDay(summary);
  return (
    <List isLoading={isLoading} navigationTitle="Today’s Activity Timeline" searchBarPlaceholder="Filter activity">
      <List.Section title="Today" subtitle={`${segments.length} segments`}>
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
                </ActionPanel>
              }
            />
          );
        })}
      </List.Section>
    </List>
  );
}
