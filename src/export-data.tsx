import { Action, ActionPanel, Detail, Icon, showHUD } from "@raycast/api";
import { writeExportSnapshot } from "./core/export";
import ExportEncryptedData from "./export-encrypted-data";

const markdown = `# Export Local Data

Export a portable JSON snapshot of your local Writing Signal aggregates and settings.

## Included

- Daily writing and intentional-timer totals
- Optional daily goals
- Browser hostname aggregates and browser rules
- Native collector app-time, aggregate keyboard metrics, app rules, and exclusions

## Never included

- Raw writing, individual keystrokes, clipboard contents, URL paths, search terms, page content, screenshots, or credentials

The export is written with owner-only file permissions to **Documents/Writing Signal Backups**. It is plain JSON so you can inspect it or use it for a future opt-in migration. Treat it as private because app names and hostname aggregates can still be sensitive.

Want a protected backup instead? Use **Create Encrypted Export** to encrypt this same snapshot with your passphrase. The passphrase is never retained.
`;

export default function ExportData() {
  async function exportSnapshot() {
    const destination = await writeExportSnapshot();
    await showHUD(`Exported local data to ${destination}`);
  }

  return (
    <Detail
      navigationTitle="Export Local Data"
      markdown={markdown}
      actions={
        <ActionPanel>
          <Action title="Create Local JSON Export" icon={Icon.Download} onAction={exportSnapshot} />
          <Action.Push title="Create Encrypted Export" icon={Icon.Lock} target={<ExportEncryptedData />} />
        </ActionPanel>
      }
    />
  );
}
