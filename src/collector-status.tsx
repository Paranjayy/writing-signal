import { Action, ActionPanel, Detail, Icon, LaunchType, launchCommand } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { getCollectorSummary, isCollectorLive, usageForDay } from "./core/collector";
import { formatDuration } from "./core/presentation";

export default function CollectorStatus() {
  const { data: summary, isLoading, revalidate } = usePromise(getCollectorSummary);
  const tracked = usageForDay(summary).reduce((total, app) => total + app.seconds, 0);
  const keyboard = summary?.keyboardByDay[new Date().toLocaleDateString("en-CA")];
  const isLive = isCollectorLive(summary);

  const markdown = summary
    ? `# Native Collector\n\n**Status:** ${isLive ? "tracking" : "stopped or stale"}  \n**Last summary:** ${new Date(summary.generatedAt).toLocaleString()}  \n**Active app:** ${isLive ? (summary.activeApplication?.name ?? "Unknown") : "Not currently reporting"}\n\n## Today\n\n- App time: ${formatDuration(tracked)}\n- Apps seen: ${usageForDay(summary).length}\n- Keyboard aggregate: ${keyboard ? `${keyboard.keyDowns} keys · ${keyboard.estimatedWords} estimated words` : "disabled"}\n\n## Consent\n\nApp tracking records only foreground app metadata and time. Keyboard activity is ${summary.settings.keyboardTrackingEnabled ? "enabled" : "disabled"}; it never stores key values or text.`
    : "# Native Collector\n\nNot running yet. The companion is optional and must be started deliberately.";

  return (
    <Detail
      isLoading={isLoading}
      navigationTitle="Native Collector Status"
      markdown={markdown}
      actions={
        <ActionPanel>
          <Action title="Refresh Status" icon={Icon.ArrowClockwise} onAction={revalidate} />
          <Action
            title="Open Keyboard Activity"
            icon={Icon.Keyboard}
            onAction={() => launchCommand({ name: "keyboard-activity", type: LaunchType.UserInitiated })}
          />
          <Action
            title="Automatic Tracking Settings"
            icon={Icon.Gear}
            onAction={() => launchCommand({ name: "collector-settings", type: LaunchType.UserInitiated })}
          />
        </ActionPanel>
      }
    />
  );
}
