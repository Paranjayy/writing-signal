import { Action, ActionPanel, Detail, Icon, List } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { getCollectorSummary, usageForDay } from "./core/collector";
import { formatDuration } from "./core/presentation";
import { AppRuleForm } from "./app-rules";

const categoryIcon = { writing: Icon.Pencil, creating: Icon.Hammer, consuming: Icon.Play, other: Icon.Circle };

export default function ScreenTime() {
  const { data: summary, isLoading, revalidate } = usePromise(getCollectorSummary);
  const usage = usageForDay(summary);

  if (!isLoading && !summary) {
    return (
      <Detail
        markdown={`# Automatic Screen Time\n\nThe native companion is not writing a summary yet. Build and run it from the repository's \`native\` folder to start app-level tracking.\n\nIt records app names, broad categories, and time only—no window titles, websites, screenshots, or text.`}
      />
    );
  }

  return (
    <List isLoading={isLoading} navigationTitle="Automatic Screen Time" searchBarPlaceholder="Filter apps">
      <List.Section title="Today" subtitle={`${usage.length} apps`}>
        {usage.map((app) => (
          <List.Item
            key={app.bundleIdentifier}
            title={app.name}
            subtitle={app.category}
            icon={categoryIcon[app.category]}
            accessories={[{ text: formatDuration(app.seconds) }]}
            actions={
              <ActionPanel>
                <Action title="Refresh Screen Time" icon={Icon.ArrowClockwise} onAction={revalidate} />
                <Action.Push
                  title="Set App Category"
                  icon={Icon.Pencil}
                  target={<AppRuleForm bundleIdentifier={app.bundleIdentifier} />}
                />
                <Action.CopyToClipboard title="Copy Bundle Identifier" content={app.bundleIdentifier} />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}
