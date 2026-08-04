import { Action, ActionPanel, Detail, Icon, LaunchType, launchCommand, openExtensionPreferences } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { getCollectorSummary, isCollectorLive, usageForDay } from "./core/collector";
import { getBrowserUsage } from "./core/browser";
import { aggregateClipboardHistory, getClipboardHistory } from "./core/clipboard-history";
import { activeSessionMillisSince, aggregateDays, dayKey, getState } from "./core/storage";
import { dashboardMarkdown } from "./core/presentation";

export default function Dashboard() {
  const { data, isLoading, revalidate } = usePromise(async () => {
    const now = new Date();
    const [state, collector, browserUsage, clipboardHistory] = await Promise.all([
      getState(),
      getCollectorSummary(),
      getBrowserUsage(now, now),
      getClipboardHistory(),
    ]);
    return { state, collector, browserUsage, clipboardHistory, now };
  });
  const state = data?.state;
  const collector = data?.collector;
  const now = data?.now ?? new Date();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - 6);

  const today = state ? aggregateDays(state, now, now) : undefined;
  const week = state ? aggregateDays(state, weekStart, now) : undefined;
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  const activeTodayMilliseconds = state ? activeSessionMillisSince(state, todayStart, now) : 0;
  const activeWeekMilliseconds = state ? activeSessionMillisSince(state, weekStart, now) : 0;

  return (
    <Detail
      isLoading={isLoading}
      navigationTitle="Writing Dashboard"
      markdown={
        today && week
          ? dashboardMarkdown(
              today,
              week,
              activeTodayMilliseconds,
              activeWeekMilliseconds,
              state?.activeSession?.kind,
              state?.activeSession?.plannedEndAt,
              usageForDay(collector),
              collector?.keyboardByDay[dayKey(now)],
              data?.browserUsage,
              data ? aggregateClipboardHistory(data.clipboardHistory, now, now) : undefined,
            )
          : "# Writing Signal"
      }
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Data" text="Local encrypted Raycast storage" />
          <Detail.Metadata.Label title="Selected text" text="Never retained" />
          <Detail.Metadata.Label
            title="Automatic tracking"
            text={
              isCollectorLive(collector)
                ? "Native companion active"
                : collector
                  ? "Last collector data is stale"
                  : "Not connected"
            }
          />
          <Detail.Metadata.Label title="Today" text={dayKey(now)} />
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <Action title="Refresh Dashboard" icon={Icon.ArrowClockwise} onAction={revalidate} />
          <Action
            title="Start Focus Block"
            icon={Icon.Clock}
            onAction={() => launchCommand({ name: "start-focus-block", type: LaunchType.UserInitiated })}
          />
          <Action
            title="Daily Check-In Settings"
            icon={Icon.Bell}
            onAction={() => launchCommand({ name: "daily-review-settings", type: LaunchType.UserInitiated })}
          />
          <Action
            title="Open Weekly Review"
            icon={Icon.Calendar}
            onAction={() => launchCommand({ name: "weekly-review", type: LaunchType.UserInitiated })}
          />
          <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
        </ActionPanel>
      }
    />
  );
}
