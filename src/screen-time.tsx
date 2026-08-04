import { Action, ActionPanel, Detail, Icon, LaunchType, List, launchCommand } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import {
  CollectorApplication,
  getCollectorSummary,
  keyboardForAppDay,
  usageForDay,
  usageForRange,
} from "./core/collector";
import { formatDuration } from "./core/presentation";
import { AppRuleForm } from "./app-rules";
import { ExcludeAppForm } from "./privacy-exclusions";
import AppActivityDetail from "./app-activity-detail";

const categoryIcon = { writing: Icon.Pencil, creating: Icon.Hammer, consuming: Icon.Play, other: Icon.Circle };

export default function ScreenTime() {
  const { data: summary, isLoading, revalidate } = usePromise(getCollectorSummary);
  const usage = usageForDay(summary);
  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - 6);
  const weeklyUsage = usageForRange(summary, weekStart, new Date());

  function appItem(app: CollectorApplication, keyPrefix = "today") {
    const keyboard = keyPrefix === "today" ? keyboardForAppDay(summary, app.bundleIdentifier) : undefined;
    return (
      <List.Item
        key={`${keyPrefix}-${app.bundleIdentifier}`}
        title={app.name}
        subtitle={app.category}
        icon={categoryIcon[app.category]}
        accessories={[
          { text: formatDuration(app.seconds) },
          ...(keyboard ? [{ text: `${keyboard.estimatedWords} est. words` }] : []),
        ]}
        actions={
          <ActionPanel>
            <Action title="Refresh Screen Time" icon={Icon.ArrowClockwise} onAction={revalidate} />
            <Action.Push
              title="View App Activity"
              icon={Icon.BarChart}
              target={<AppActivityDetail application={app} />}
            />
            <Action.Push
              title="Set App Category"
              icon={Icon.Pencil}
              target={<AppRuleForm bundleIdentifier={app.bundleIdentifier} category={app.category} />}
            />
            <Action.Push
              title="Exclude App from Tracking"
              icon={Icon.EyeDisabled}
              target={<ExcludeAppForm bundleIdentifier={app.bundleIdentifier} />}
            />
            <Action.CopyToClipboard title="Copy Bundle Identifier" content={app.bundleIdentifier} />
          </ActionPanel>
        }
      />
    );
  }

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
        {usage.map((app) => appItem(app))}
      </List.Section>
      <List.Section title="Last 7 Days" subtitle={`${weeklyUsage.length} apps`}>
        {weeklyUsage.map((app) => appItem(app, "week"))}
      </List.Section>
      <List.Section>
        <List.Item
          title="Open Keyboard Activity"
          subtitle="Optional local key and estimated-word aggregates by app"
          icon={Icon.Keyboard}
          actions={
            <ActionPanel>
              <Action
                title="Open Keyboard Activity"
                onAction={() => launchCommand({ name: "keyboard-activity", type: LaunchType.UserInitiated })}
              />
            </ActionPanel>
          }
        />
      </List.Section>
    </List>
  );
}
