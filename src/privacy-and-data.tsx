import { Action, ActionPanel, Alert, Detail, Icon, confirmAlert, showHUD } from "@raycast/api";
import { clearAllData } from "./core/storage";

const markdown = `# Privacy & Data

## What is stored

- Day-level totals for time, word counts, and text categories.
- A temporary comparison baseline used to calculate the next selected-text delta.
- The start time and mode of one active timer, when present.

## What is never stored

- Raw selected text, keystrokes, word lists, clipboard text, screenshots, or app content.
- Analytics, advertising identifiers, or any copy of your data on a Writing Signal server.

## Storage and future sync

This Raycast prototype uses Raycast's local encrypted storage. There is intentionally no “unencrypted” toggle here because the API owns its secure local database. Future iOS, Android, web, Windows, and Linux clients should use an end-to-end encrypted vault with an optional passphrase; sync is not implemented yet.
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
    await clearAllData();
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
