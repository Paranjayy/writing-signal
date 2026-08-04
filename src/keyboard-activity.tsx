import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import AppActivityDetail from "./app-activity-detail";
import {
  CollectorApplication,
  CollectorKeyboardSummary,
  CollectorSummary,
  getCollectorSummary,
  localDayKey,
} from "./core/collector";
import { formatNumber } from "./core/presentation";

const categoryIcon = { writing: Icon.Pencil, creating: Icon.Hammer, consuming: Icon.Play, other: Icon.Circle };

type KeyboardApp = CollectorApplication & { keyboard: CollectorKeyboardSummary };

function totalFor(items: KeyboardApp[]): CollectorKeyboardSummary {
  return items.reduce(
    (total, item) => ({
      keyDowns: total.keyDowns + item.keyboard.keyDowns,
      printableKeyDowns: total.printableKeyDowns + item.keyboard.printableKeyDowns,
      separators: total.separators + item.keyboard.separators,
      deletions: total.deletions + item.keyboard.deletions,
      estimatedWords: total.estimatedWords + item.keyboard.estimatedWords,
    }),
    { keyDowns: 0, printableKeyDowns: 0, separators: 0, deletions: 0, estimatedWords: 0 },
  );
}

function addKeyboard(left: CollectorKeyboardSummary, right: CollectorKeyboardSummary): CollectorKeyboardSummary {
  return {
    keyDowns: left.keyDowns + right.keyDowns,
    printableKeyDowns: left.printableKeyDowns + right.printableKeyDowns,
    separators: left.separators + right.separators,
    deletions: left.deletions + right.deletions,
    estimatedWords: left.estimatedWords + right.estimatedWords,
  };
}

function keyboardItems(summary: CollectorSummary | undefined, keys: string[]): KeyboardApp[] {
  if (!summary) return [];
  const items: Record<string, KeyboardApp> = {};
  for (const key of keys) {
    const apps = summary.days[key] ?? {};
    for (const [bundleIdentifier, keyboard] of Object.entries(summary.keyboardByDayAndApplication?.[key] ?? {})) {
      const application = apps[bundleIdentifier] ?? {
        name: bundleIdentifier,
        bundleIdentifier,
        category: "other" as const,
        seconds: 0,
      };
      const existing = items[bundleIdentifier];
      items[bundleIdentifier] = existing
        ? {
            ...existing,
            seconds: existing.seconds + application.seconds,
            keyboard: addKeyboard(existing.keyboard, keyboard),
          }
        : { ...application, keyboard };
    }
  }
  return Object.values(items).sort((left, right) => right.keyboard.estimatedWords - left.keyboard.estimatedWords);
}

function lastSevenDayKeys(now = new Date()): string[] {
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(now);
    date.setDate(now.getDate() - index);
    return localDayKey(date);
  });
}

function pace(app: KeyboardApp): string | undefined {
  if (app.seconds < 60 || app.keyboard.estimatedWords === 0) return undefined;
  return `${formatNumber(Math.round((app.keyboard.estimatedWords * 3_600) / app.seconds))} est. words/hr`;
}

export default function KeyboardActivity() {
  const { data, isLoading, revalidate } = usePromise(async () => {
    const summary = await getCollectorSummary();
    const todayItems = keyboardItems(summary, [localDayKey()]);
    const weekItems = keyboardItems(summary, lastSevenDayKeys());
    return {
      enabled: summary?.settings.keyboardTrackingEnabled ?? false,
      todayItems,
      weekItems,
      todayTotal: totalFor(todayItems),
      weekTotal: totalFor(weekItems),
    };
  });

  if (!isLoading && !data?.enabled) {
    return (
      <List navigationTitle="Keyboard Activity">
        <List.EmptyView
          icon={Icon.Keyboard}
          title="Keyboard aggregates are off"
          description="The optional native keyboard mode must be explicitly enabled. It counts events only; it never stores keys or text."
        />
      </List>
    );
  }

  return (
    <List isLoading={isLoading} navigationTitle="Keyboard Activity" searchBarPlaceholder="Filter apps">
      <List.Section
        title="Today"
        subtitle={
          data
            ? `${formatNumber(data.todayTotal.estimatedWords)} estimated words · ${formatNumber(data.todayTotal.keyDowns)} keys`
            : ""
        }
      >
        {(data?.todayItems ?? []).map((app) => (
          <List.Item
            key={app.bundleIdentifier}
            title={app.name}
            subtitle={app.category}
            icon={categoryIcon[app.category]}
            accessories={[
              { text: `${formatNumber(app.keyboard.estimatedWords)} est. words` },
              { text: `${formatNumber(app.keyboard.keyDowns)} keys` },
              ...(pace(app) ? [{ text: pace(app)! }] : []),
              ...(app.keyboard.deletions > 0 ? [{ text: `${formatNumber(app.keyboard.deletions)} deletes` }] : []),
            ]}
            actions={
              <ActionPanel>
                <Action title="Refresh Keyboard Activity" icon={Icon.ArrowClockwise} onAction={revalidate} />
                <Action.Push
                  title="View App Activity"
                  icon={Icon.BarChart}
                  target={<AppActivityDetail application={app} />}
                />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
      <List.Section
        title="Last 7 Days"
        subtitle={
          data
            ? `${formatNumber(data.weekTotal.estimatedWords)} estimated words · ${formatNumber(data.weekTotal.keyDowns)} keys`
            : ""
        }
      >
        {(data?.weekItems ?? []).map((app) => (
          <List.Item
            key={`week-${app.bundleIdentifier}`}
            title={app.name}
            subtitle={app.category}
            icon={categoryIcon[app.category]}
            accessories={[
              { text: `${formatNumber(app.keyboard.estimatedWords)} est. words` },
              ...(pace(app) ? [{ text: pace(app)! }] : []),
              ...(app.keyboard.deletions > 0 ? [{ text: `${formatNumber(app.keyboard.deletions)} deletes` }] : []),
            ]}
            actions={
              <ActionPanel>
                <Action title="Refresh Keyboard Activity" icon={Icon.ArrowClockwise} onAction={revalidate} />
                <Action.Push
                  title="View App Activity"
                  icon={Icon.BarChart}
                  target={<AppActivityDetail application={app} />}
                />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}
