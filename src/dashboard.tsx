import { Action, ActionPanel, Detail, Icon, openExtensionPreferences } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { activeSessionMillisSince, aggregateDays, dayKey, getState } from "./core/storage";
import { dashboardMarkdown } from "./core/presentation";

export default function Dashboard() {
  const { data: state, isLoading, revalidate } = usePromise(getState);
  const now = new Date();
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
          ? dashboardMarkdown(today, week, activeTodayMilliseconds, activeWeekMilliseconds, state?.activeSession?.kind)
          : "# Writing Signal"
      }
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Data" text="Local encrypted Raycast storage" />
          <Detail.Metadata.Label title="Selected text" text="Never retained" />
          <Detail.Metadata.Label title="Sync" text="Local-only in this prototype" />
          <Detail.Metadata.Label title="Today" text={dayKey(now)} />
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <Action title="Refresh Dashboard" icon={Icon.ArrowClockwise} onAction={revalidate} />
          <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
        </ActionPanel>
      }
    />
  );
}
