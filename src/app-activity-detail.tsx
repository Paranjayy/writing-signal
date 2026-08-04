import { Action, ActionPanel, Detail, Icon } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import {
  CollectorApplication,
  getCollectorSummary,
  keyboardForAppDay,
  segmentsForDay,
  usageForDay,
  usageForRange,
} from "./core/collector";
import { formatDuration, formatNumber } from "./core/presentation";
import { AppRuleForm } from "./app-rules";
import { ExcludeAppForm } from "./privacy-exclusions";

type Props = { application: Pick<CollectorApplication, "name" | "bundleIdentifier" | "category"> };

function durationBetween(startedAt: string, endedAt: string): number {
  return Math.max(0, new Date(endedAt).getTime() - new Date(startedAt).getTime());
}

export default function AppActivityDetail({ application }: Props) {
  const { data, isLoading, revalidate } = usePromise(async () => {
    const summary = await getCollectorSummary();
    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(weekStart.getDate() - 6);
    const today = usageForDay(summary, now).find((app) => app.bundleIdentifier === application.bundleIdentifier);
    const week = usageForRange(summary, weekStart, now).find(
      (app) => app.bundleIdentifier === application.bundleIdentifier,
    );
    const keyboard = keyboardForAppDay(summary, application.bundleIdentifier, now);
    const segments = segmentsForDay(summary, now).filter(
      (segment) => segment.application.bundleIdentifier === application.bundleIdentifier,
    );
    const lastSegment = segments[0];
    return { today, week, keyboard, segments, lastSegment };
  });

  const markdown = `# ${application.name}

**Category:** ${application.category}  
**Bundle identifier:** \`${application.bundleIdentifier}\`

## Screen time

- Today: ${formatDuration((data?.today?.seconds ?? 0) * 1_000)}
- Last 7 days: ${formatDuration((data?.week?.seconds ?? 0) * 1_000)}
- Today’s foreground segments: ${formatNumber(data?.segments.length ?? 0)}
${data?.lastSegment ? `- Most recent segment: ${formatDuration(durationBetween(data.lastSegment.startedAt, data.lastSegment.endedAt))}` : ""}

## Keyboard aggregates today

${
  data?.keyboard
    ? `- Key presses: ${formatNumber(data.keyboard.keyDowns)}
- Printable key presses: ${formatNumber(data.keyboard.printableKeyDowns)}
- Estimated words: ${formatNumber(data.keyboard.estimatedWords)}
- Deletes: ${formatNumber(data.keyboard.deletions)}
${(data.today?.seconds ?? 0) >= 60 && data.keyboard.estimatedWords > 0 ? `- Estimated pace: ${formatNumber(Math.round((data.keyboard.estimatedWords * 3_600) / (data.today?.seconds ?? 1)))} words/hour` : ""}

These are counts only; no keys or text are stored.`
    : "Keyboard aggregates are disabled or no activity was attributed to this app."
}
`;

  return (
    <Detail
      isLoading={isLoading}
      navigationTitle={`${application.name} Activity`}
      markdown={markdown}
      actions={
        <ActionPanel>
          <Action title="Refresh App Activity" icon={Icon.ArrowClockwise} onAction={revalidate} />
          <Action.Push
            title="Set App Category"
            icon={Icon.Pencil}
            target={<AppRuleForm bundleIdentifier={application.bundleIdentifier} category={application.category} />}
          />
          <Action.Push
            title="Exclude App from Tracking"
            icon={Icon.EyeDisabled}
            target={<ExcludeAppForm bundleIdentifier={application.bundleIdentifier} />}
          />
          <Action.CopyToClipboard title="Copy Bundle Identifier" content={application.bundleIdentifier} />
        </ActionPanel>
      }
    />
  );
}
