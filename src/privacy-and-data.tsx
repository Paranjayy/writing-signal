import { Action, ActionPanel, Alert, Detail, Icon, confirmAlert, showHUD } from "@raycast/api";
import { clearCollectorData } from "./core/collector";
import { clearBrowserData } from "./core/browser";
import { clearAllData } from "./core/storage";

const markdown = `# Privacy & Data

## What is stored

- Day-level totals for time, word counts, and text categories.
- A temporary comparison baseline used to calculate the next selected-text delta.
- The start time and mode of one active timer, when present.

## What is never stored

- Raw selected text, keystrokes, word lists, clipboard text, screenshots, or app content.
- Analytics, advertising identifiers, or any copy of your data on a Writing Signal server.
- Browser URL paths, query parameters, and page content. When enabled, browser activity retains a hostname only.

## Storage and future sync

This Raycast prototype uses Raycast's local encrypted storage. There is intentionally no “unencrypted” toggle here because the API owns its secure local database. Future iOS, Android, web, Windows, and Linux clients should use an end-to-end encrypted vault with an optional passphrase; sync is not implemented yet.

## Native collector bridge

The optional macOS collector writes an owner-only local summary containing app names, broad categories, durations, and—if explicitly enabled—keyboard aggregates. It does not write text. This narrow summary lets Raycast display automatic Screen Time; a passphrase-encrypted detailed vault is the next companion milestone.
`;

export default function PrivacyAndData() {
  async function erase() {
    const confirmed = await confirmAlert({
      title: "Erase all Writing Signal data?",
      message:
        "This removes every local aggregate, capture baseline, and active timer from this extension. It cannot be undone.",
      primaryAction: { title: "Erase Local Data", style: Alert.ActionStyle.Destructive },
    });
    if (!confirmed) return;
    await Promise.all([clearAllData(), clearCollectorData(), clearBrowserData()]);
    await showHUD("Writing Signal data erased");
  }

  return (
    <Detail
      navigationTitle="Privacy & Data"
      markdown={markdown}
      actions={
        <ActionPanel>
          <Action title="Erase All Local Data" icon={Icon.Trash} style={Action.Style.Destructive} onAction={erase} />
        </ActionPanel>
      }
    />
  );
}
