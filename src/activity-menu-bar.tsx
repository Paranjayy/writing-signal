import { Icon, launchCommand, LaunchType, MenuBarExtra } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { getCollectorSummary, isCollectorLive, usageForDay } from "./core/collector";
import { getGoals } from "./core/goals";
import { formatActivityLabel, formatDuration } from "./core/presentation";
import { dayKey, getState } from "./core/storage";

export default function ActivityMenuBar() {
  const { data, isLoading } = usePromise(async () => {
    const [summary, goals, state] = await Promise.all([getCollectorSummary(), getGoals(), getState()]);
    return { summary, goals, state };
  });
  const summary = data?.summary;
  const isLive = isCollectorLive(summary);
  const usage = usageForDay(summary);
  const total = usage.reduce((sum, app) => sum + app.seconds, 0);
  const active = isLive ? summary?.activeApplication : undefined;
  const today = data?.state.days[dayKey(new Date())];
  const activeSession = data?.state.activeSession;
  const title = active ? `${formatDuration(total)} · ${active.name}` : "Activity";

  return (
    <MenuBarExtra title={title} icon={Icon.Clock} isLoading={isLoading} tooltip="Writing Signal">
      <MenuBarExtra.Section
        title={
          active ? `Now: ${active.name}` : summary ? "Collector not currently reporting" : "Collector not connected"
        }
      >
        <MenuBarExtra.Item
          title={
            active
              ? `Category: ${active.category}`
              : summary
                ? "Last data is stale; check collector status"
                : "Run the native collector to begin"
          }
        />
        <MenuBarExtra.Item title={`Today: ${formatDuration(total)}`} />
      </MenuBarExtra.Section>
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
          title="Open Automatic Screen Time"
          icon={Icon.BarChart}
          onAction={() => launchCommand({ name: "screen-time", type: LaunchType.UserInitiated })}
        />
        <MenuBarExtra.Item
          title="Open Dashboard"
          icon={Icon.Window}
          onAction={() => launchCommand({ name: "dashboard", type: LaunchType.UserInitiated })}
        />
        <MenuBarExtra.Item
          title="Set Daily Goals"
          icon={Icon.BullsEye}
          onAction={() => launchCommand({ name: "goals", type: LaunchType.UserInitiated })}
        />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}
