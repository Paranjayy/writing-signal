import { Icon, launchCommand, LaunchType, MenuBarExtra } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import {
  getCollectorPausedUntil,
  getCollectorSummary,
  isCollectorLive,
  setCollectorPausedUntil,
  usageForDay,
} from "./core/collector";
import { getGoals } from "./core/goals";
import { formatActivityLabel, formatDuration } from "./core/presentation";
import { dayKey, getState } from "./core/storage";

export default function ActivityMenuBar() {
  const { data, isLoading } = usePromise(async () => {
    const [summary, goals, state, pausedUntil] = await Promise.all([
      getCollectorSummary(),
      getGoals(),
      getState(),
      getCollectorPausedUntil(),
    ]);
    return { summary, goals, state, pausedUntil };
  });
  const summary = data?.summary;
  const isLive = isCollectorLive(summary);
  const usage = usageForDay(summary);
  const total = usage.reduce((sum, app) => sum + app.seconds, 0);
  const active = isLive ? summary?.activeApplication : undefined;
  const pausedUntil = data?.pausedUntil;
  const today = data?.state.days[dayKey(new Date())];
  const activeSession = data?.state.activeSession;
  const title = active ? `${formatDuration(total)} · ${active.name}` : "Activity";

  return (
    <MenuBarExtra title={title} icon={Icon.Clock} isLoading={isLoading} tooltip="Writing Signal">
      <MenuBarExtra.Section
        title={
          active
            ? `Now: ${active.name}`
            : pausedUntil
              ? "Automatic tracking paused"
              : summary
                ? "Collector not currently reporting"
                : "Collector not connected"
        }
      >
        <MenuBarExtra.Item
          title={
            active
              ? `Category: ${active.category}`
              : summary
                ? pausedUntil
                  ? `Paused until ${pausedUntil.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`
                  : "Last data is stale; check collector status"
                : "Run the native collector to begin"
          }
        />
        <MenuBarExtra.Item title={`Today: ${formatDuration(total)}`} />
        {active && summary?.settings.keyboardTrackingEnabled && (
          <MenuBarExtra.Item
            title={`Live typing: ${summary.liveTyping?.estimatedWordsPerMinute ?? 0} est. WPM · ${summary.liveTyping?.keysPerMinute ?? 0} keys/min`}
          />
        )}
      </MenuBarExtra.Section>
      {pausedUntil && (
        <MenuBarExtra.Section>
          <MenuBarExtra.Item
            title="Resume Automatic Tracking"
            icon={Icon.Play}
            onAction={() => setCollectorPausedUntil(undefined)}
          />
        </MenuBarExtra.Section>
      )}
      {activeSession && (
        <MenuBarExtra.Section title="Intentional timer">
          <MenuBarExtra.Item
            title={`${formatActivityLabel(activeSession.kind)}${activeSession.plannedEndAt ? ` · ends ${new Date(activeSession.plannedEndAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}` : " · open-ended"}`}
          />
          <MenuBarExtra.Item
            title="Stop Intentional Timer"
            icon={Icon.Stop}
            onAction={() => launchCommand({ name: "stop-writing-session", type: LaunchType.UserInitiated })}
          />
        </MenuBarExtra.Section>
      )}
      {data &&
        (data.goals.dailyWords > 0 ||
          data.goals.dailyFocusMinutes > 0 ||
          data.goals.dailyCreatingMinutes > 0 ||
          data.goals.dailyConsumingLimitMinutes > 0) && (
          <MenuBarExtra.Section title="Gentle goals">
            {data.goals.dailyWords > 0 && (
              <MenuBarExtra.Item title={`Words: ${today?.words ?? 0} / ${data.goals.dailyWords}`} />
            )}
            {data.goals.dailyFocusMinutes > 0 && (
              <MenuBarExtra.Item
                title={`Focus: ${formatDuration(today?.activityMillis.focus ?? 0)} / ${formatDuration(data.goals.dailyFocusMinutes * 60_000)}`}
              />
            )}
            {data.goals.dailyCreatingMinutes > 0 && (
              <MenuBarExtra.Item
                title={`Creating: ${formatDuration(today?.activityMillis.creating ?? 0)} / ${formatDuration(data.goals.dailyCreatingMinutes * 60_000)}`}
              />
            )}
            {data.goals.dailyConsumingLimitMinutes > 0 && (
              <MenuBarExtra.Item
                title={`Consuming: ${formatDuration(usage.filter((app) => app.category === "consuming").reduce((total, app) => total + app.seconds * 1_000, 0))} / ${formatDuration(data.goals.dailyConsumingLimitMinutes * 60_000)}`}
              />
            )}
          </MenuBarExtra.Section>
        )}
      {usage.length > 0 && (
        <MenuBarExtra.Section title="Top apps today">
          {usage.slice(0, 5).map((app) => (
            <MenuBarExtra.Item key={app.bundleIdentifier} title={`${app.name} · ${formatDuration(app.seconds)}`} />
          ))}
        </MenuBarExtra.Section>
      )}
      <MenuBarExtra.Section>
        <MenuBarExtra.Item
          title="Open Writing Signal"
          icon={Icon.Window}
          onAction={() => launchCommand({ name: "dashboard", type: LaunchType.UserInitiated })}
        />
        <MenuBarExtra.Item
          title="Start Focus Block"
          icon={Icon.Clock}
          onAction={() => launchCommand({ name: "start-focus-block", type: LaunchType.UserInitiated })}
        />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}
