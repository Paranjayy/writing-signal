import { Icon, launchCommand, LaunchType, MenuBarExtra } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { getCollectorSummary, usageForDay } from "./core/collector";
import { formatDuration } from "./core/presentation";

export default function ActivityMenuBar() {
  const { data: summary, isLoading } = usePromise(getCollectorSummary);
  const usage = usageForDay(summary);
  const total = usage.reduce((sum, app) => sum + app.seconds, 0);
  const active = summary?.activeApplication;
  const title = active ? `${formatDuration(total)} · ${active.name}` : "Activity";

  return (
    <MenuBarExtra title={title} icon={Icon.Clock} isLoading={isLoading} tooltip="Writing Signal">
      <MenuBarExtra.Section title={active ? `Now: ${active.name}` : "Collector not connected"}>
        <MenuBarExtra.Item title={active ? `Category: ${active.category}` : "Run the native collector to begin"} />
        <MenuBarExtra.Item title={`Today: ${formatDuration(total)}`} />
      </MenuBarExtra.Section>
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
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}
