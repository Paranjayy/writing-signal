import { Action, ActionPanel, Clipboard, Detail, Icon, showToast, Toast } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { classifyText } from "./core/classify";
import { tokenBreakdown } from "./core/presentation";
import ClipboardPatterns from "./clipboard-patterns";

type ClipboardSnapshot = { position: number; text?: string };

async function readClipboard(): Promise<ClipboardSnapshot[]> {
  const snapshots = await Promise.all(
    Array.from({ length: 6 }, async (_, position) => {
      try {
        return { position, text: await Clipboard.readText({ offset: position }) };
      } catch {
        return { position };
      }
    }),
  );
  return snapshots.filter((snapshot) => snapshot.text);
}

function clipboardMarkdown(snapshots: ClipboardSnapshot[]): string {
  if (snapshots.length === 0)
    return "# Clipboard Insights\n\nNo plain text is currently available in the clipboard history.";

  return `# Clipboard Insights

The clipboard content is read only to make this view and is never persisted by Writing Signal.

${snapshots
  .map((snapshot) => {
    const counts = classifyText(snapshot.text ?? "");
    return `## ${snapshot.position === 0 ? "Current clipboard" : `History ${snapshot.position}`}\n\n${tokenBreakdown(counts)}`;
  })
  .join("\n\n")}
`;
}

export default function ClipboardInsights() {
  const { data = [], isLoading, revalidate } = usePromise(readClipboard);

  return (
    <Detail
      isLoading={isLoading}
      navigationTitle="Clipboard Insights"
      markdown={clipboardMarkdown(data)}
      actions={
        <ActionPanel>
          <Action title="Refresh Clipboard" icon={Icon.ArrowClockwise} onAction={revalidate} />
          <Action
            title="Copy Current Character Count"
            icon={Icon.Clipboard}
            onAction={async () => {
              const count = classifyText(data[0]?.text ?? "").characters;
              await Clipboard.copy(String(count));
              await showToast({ style: Toast.Style.Success, title: "Character count copied" });
            }}
          />
          <Action.Push title="Open Clipboard Patterns" icon={Icon.BarChart} target={<ClipboardPatterns />} />
        </ActionPanel>
      }
    />
  );
}
