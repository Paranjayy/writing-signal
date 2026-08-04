import { Action, ActionPanel, Detail, Icon } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { getCollectorSummary, isCollectorLive } from "./core/collector";
import { formatNumber } from "./core/presentation";
import KeyboardActivity from "./keyboard-activity";
import CollectorSetup from "./collector-setup";

export default function LiveTyping() {
  const { data: summary, isLoading, revalidate } = usePromise(getCollectorSummary);
  const live = summary?.liveTyping;
  const collectorLive = isCollectorLive(summary);
  const enabled = summary?.settings.keyboardTrackingEnabled ?? false;
  const measuredAt = live ? new Date(live.measuredAt) : undefined;
  const fresh = measuredAt && Date.now() - measuredAt.getTime() < 15_000;

  const markdown = !summary
    ? "# Live typing\n\nSet up the local macOS collector to see live typing pace."
    : !enabled
      ? "# Live typing\n\nOptional keyboard aggregates are off. Enable them only if you want live key-rate and estimated WPM; no keys or text are stored."
      : !collectorLive
        ? "# Live typing\n\nThe collector is not currently reporting. Start it or check macOS Input Monitoring permission."
        : `# Live typing\n\n## ${formatNumber(live?.estimatedWordsPerMinute ?? 0)} estimated WPM\n\n- ${formatNumber(live?.keysPerMinute ?? 0)} keys/min in the rolling last minute\n- Active app: ${summary.activeApplication?.name ?? "No active tracked app"}\n- Updated: ${fresh ? "just now" : (measuredAt?.toLocaleTimeString() ?? "waiting for input")}\n\nThis is a rolling 60-second pace. A word is estimated when a typed run ends with space, Return, or Tab; it never records key values or writing.`;

  return (
    <Detail
      navigationTitle="Live Typing"
      isLoading={isLoading}
      markdown={markdown}
      actions={
        <ActionPanel>
          <Action title="Refresh Live Pace" icon={Icon.ArrowClockwise} onAction={revalidate} />
          <Action.Push title="Open Historical Keyboard Activity" icon={Icon.BarChart} target={<KeyboardActivity />} />
          <Action.Push title="Set up Automatic Tracking" icon={Icon.Gear} target={<CollectorSetup />} />
        </ActionPanel>
      }
    />
  );
}
