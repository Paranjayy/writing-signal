import { Action, ActionPanel, Alert, Form, Icon, Toast, confirmAlert, showToast } from "@raycast/api";
import { importPortableBackup } from "./core/import";

type Values = { files: string[]; passphrase: string };

export default function ImportData() {
  async function submit(values: Values) {
    const file = values.files[0];
    if (!file) {
      await showToast({ style: Toast.Style.Failure, title: "Choose one Writing Signal backup" });
      return;
    }
    const confirmed = await confirmAlert({
      title: "Merge this backup into local data?",
      message:
        "This adds portable writing, browser, and clipboard aggregates to this Raycast extension and restores its daily goals. It does not overwrite or import native collector summaries, so a running companion remains safe.",
      primaryAction: { title: "Merge Local Backup", style: Alert.ActionStyle.Default },
    });
    if (!confirmed) return;
    try {
      const result = await importPortableBackup(file, values.passphrase || undefined);
      await showToast({
        style: Toast.Style.Success,
        title: "Local backup merged",
        message: `${result.writingDays} writing days · ${result.browserDays} browser days · ${result.clipboardDays} clipboard days`,
      });
    } catch (error) {
      await showToast({ style: Toast.Style.Failure, title: "Could not import backup", message: String(error) });
    }
  }

  return (
    <Form
      navigationTitle="Import Local Data"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Merge Local Backup" icon={Icon.Upload} onSubmit={submit} />
        </ActionPanel>
      }
    >
      <Form.Description text="Merge a plain or AES-256-GCM encrypted Writing Signal export. The passphrase is used only to decrypt this file and is never stored. Native collector summaries are intentionally not imported while a companion may be writing them." />
      <Form.FilePicker
        id="files"
        title="Writing Signal backup"
        allowMultipleSelection={false}
        canChooseDirectories={false}
      />
      <Form.PasswordField id="passphrase" title="Passphrase (only for encrypted backup)" />
    </Form>
  );
}
