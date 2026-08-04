import { Action, ActionPanel, Detail, Icon } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { aggregateClipboardHistory, getClipboardHistory } from "./core/clipboard-history";
import { formatNumber } from "./core/presentation";

export default function ClipboardPatterns() {
  const { data: history, isLoading, revalidate } = usePromise(getClipboardHistory);
  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - 6);
  const today = history ? aggregateClipboardHistory(history, now, now) : undefined;
  const week = history ? aggregateClipboardHistory(history, weekStart, now) : undefined;
  const markdown = `# Clipboard Patterns

This is an optional background aggregate. Clipboard text is classified in memory then discarded. Writing Signal stores only the totals below plus a keyed local fingerprint used solely to avoid recounting the same clipboard item.

## Today

- ${formatNumber(today?.copies ?? 0)} distinct text copies observed
- ${formatNumber(today?.words ?? 0)} words
- ${formatNumber(today?.characters ?? 0)} characters
- ${formatNumber(today?.urls ?? 0)} URLs
- ${formatNumber(today?.numbers ?? 0)} numbers
- ${formatNumber(today?.linkLikeCopies ?? 0)} link-like copies
- ${formatNumber(today?.codeLikeCopies ?? 0)} code-like copies

## Last 7 days

- ${formatNumber(week?.copies ?? 0)} distinct text copies observed
- ${formatNumber(week?.words ?? 0)} words
- ${formatNumber(week?.characters ?? 0)} characters
- ${formatNumber(week?.linkLikeCopies ?? 0)} link-like copies
- ${formatNumber(week?.codeLikeCopies ?? 0)} code-like copies

Enable **Clipboard Pattern Tracking** only if these aggregate habits are useful to you. Disable its Raycast command at any time to stop future sampling.
`;

  return (
    <Detail
      isLoading={isLoading}
      navigationTitle="Clipboard Patterns"
      markdown={markdown}
      actions={
        <ActionPanel>
          <Action title="Refresh Clipboard Patterns" icon={Icon.ArrowClockwise} onAction={revalidate} />
        </ActionPanel>
      }
    />
  );
}
