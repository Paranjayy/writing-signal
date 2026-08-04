import { Action, ActionPanel, Detail, Icon } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { getCollectorPausedUntil, getCollectorSummary, isCollectorLive, usageForDay } from "./core/collector";
import { formatDuration } from "./core/presentation";
import CollectorSettings from "./collector-settings";
import CollectorSetup from "./collector-setup";
import KeyboardActivity from "./keyboard-activity";
import TrackingPause from "./tracking-pause";

export default function CollectorStatus() {
  const { data, isLoading, revalidate } = usePromise(async () => {
    const [summary, pausedUntil] = await Promise.all([getCollectorSummary(), getCollectorPausedUntil()]);
    return { summary, pausedUntil };
  });
  const summary = data?.summary;
  const pausedUntil = data?.pausedUntil;
  const tracked = usageForDay(summary).reduce((total, app) => total + app.seconds, 0);
  const keyboard = summary?.keyboardByDay[new Date().toLocaleDateString("en-CA")];
  const isLive = isCollectorLive(summary);

  const markdown = summary
    ? `# Native Collector\n\n**Status:** ${pausedUntil ? `paused until ${pausedUntil.toLocaleString()}` : isLive ? "tracking" : "stopped or stale"}  \n**Last summary:** ${new Date(summary.generatedAt).toLocaleString()}  \n**Active app:** ${pausedUntil ? "Collection paused" : isLive ? (summary.activeApplication?.name ?? "Unknown") : "Not currently reporting"}\n\n## Today\n\n- App time: ${formatDuration(tracked)}\n- Apps seen: ${usageForDay(summary).length}\n- Keyboard aggregate: ${keyboard ? `${keyboard.keyDowns} keys · ${keyboard.estimatedWords} estimated words` : "disabled"}\n\n## Consent\n\nApp tracking records only foreground app metadata and time. Keyboard activity is ${summary.settings.keyboardTrackingEnabled ? "enabled" : "disabled"}; it never stores key values or text.`
    : "# Native Collector\n\nNot running yet. The companion is optional and must be started deliberately.";

  return (
    <Detail
      isLoading={isLoading}
      navigationTitle="Native Collector Status"
      markdown={markdown}
      actions={
        <ActionPanel>
          <Action title="Refresh Status" icon={Icon.ArrowClockwise} onAction={revalidate} />
          <Action.Push title="Open Keyboard Activity" icon={Icon.Keyboard} target={<KeyboardActivity />} />
          <Action.Push title="Automatic Tracking Settings" icon={Icon.Gear} target={<CollectorSettings />} />
          <Action.Push title="Set up Automatic Tracking" icon={Icon.WrenchScrewdriver} target={<CollectorSetup />} />
          <Action.Push title="Pause Automatic Tracking" icon={Icon.Pause} target={<TrackingPause />} />
        </ActionPanel>
      }
    />
  );
}
