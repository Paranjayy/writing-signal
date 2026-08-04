import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { DomainUsage, getBrowserUsage } from "./core/browser";
import { formatDuration } from "./core/presentation";
import { BrowserRuleForm } from "./browser-rules";
import { ExcludeBrowserForm } from "./browser-exclusions";

const categoryIcon = { writing: Icon.Pencil, creating: Icon.Hammer, consuming: Icon.Play, other: Icon.Circle };

export default function BrowserTime() {
  const { data, isLoading, revalidate } = usePromise(async () => {
    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(weekStart.getDate() - 6);
    const [today, week] = await Promise.all([getBrowserUsage(now, now), getBrowserUsage(weekStart, now)]);
    return { today, week };
  });

  function domainItem(usage: DomainUsage, prefix: string) {
    return (
      <List.Item
        key={`${prefix}-${usage.host}`}
        title={usage.host}
        subtitle={usage.category}
        icon={categoryIcon[usage.category]}
        accessories={[{ text: formatDuration(usage.milliseconds) }]}
        actions={
          <ActionPanel>
            <Action title="Refresh Browser Time" icon={Icon.ArrowClockwise} onAction={revalidate} />
            <Action.Push
              title="Set Domain Category"
              icon={Icon.Pencil}
              target={<BrowserRuleForm host={usage.host} category={usage.category} />}
            />
            <Action.Push
              title="Exclude Domain"
              icon={Icon.EyeDisabled}
              target={<ExcludeBrowserForm host={usage.host} />}
            />
            <Action.OpenInBrowser title="Open Domain" url={`https://${usage.host}`} />
          </ActionPanel>
        }
      />
    );
  }

  return (
    <List isLoading={isLoading} navigationTitle="Browser Time" searchBarPlaceholder="Filter domains">
      <List.Section title="Today" subtitle={`${data?.today.length ?? 0} domains`}>
        {(data?.today ?? []).map((usage) => domainItem(usage, "today"))}
      </List.Section>
      <List.Section title="Last 7 Days" subtitle={`${data?.week.length ?? 0} domains`}>
        {(data?.week ?? []).map((usage) => domainItem(usage, "week"))}
      </List.Section>
    </List>
  );
}
