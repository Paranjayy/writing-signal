import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import AppActivityDetail from "./app-activity-detail";
import { CollectorApplication, CollectorKeyboardSummary, getCollectorSummary, localDayKey } from "./core/collector";
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

export default function KeyboardActivity() {
  const { data, isLoading, revalidate } = usePromise(async () => {
    const summary = await getCollectorSummary();
    const apps = summary?.days[localDayKey()] ?? {};
    const keyboardByApp = summary?.keyboardByDayAndApplication?.[localDayKey()] ?? {};
    const items = Object.entries(keyboardByApp)
      .map(([bundleIdentifier, keyboard]) => {
        const application = apps[bundleIdentifier];
        return application
          ? { ...application, keyboard }
          : { name: bundleIdentifier, bundleIdentifier, category: "other" as const, seconds: 0, keyboard };
      })
      .sort((left, right) => right.keyboard.estimatedWords - left.keyboard.estimatedWords);
    return { enabled: summary?.settings.keyboardTrackingEnabled ?? false, items, total: totalFor(items) };
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
            ? `${formatNumber(data.total.estimatedWords)} estimated words · ${formatNumber(data.total.keyDowns)} keys`
            : ""
        }
      >
        {(data?.items ?? []).map((app) => (
          <List.Item
            key={app.bundleIdentifier}
            title={app.name}
            subtitle={app.category}
            icon={categoryIcon[app.category]}
            accessories={[
              { text: `${formatNumber(app.keyboard.estimatedWords)} est. words` },
              { text: `${formatNumber(app.keyboard.keyDowns)} keys` },
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
