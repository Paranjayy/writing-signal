import { Action, ActionPanel, Form, Icon, Toast, showToast } from "@raycast/api";
import { writeEncryptedExportSnapshot } from "./core/export";

type Values = { passphrase: string; confirmation: string };

export default function ExportEncryptedData() {
  async function submit(values: Values) {
    if (values.passphrase !== values.confirmation) {
      await showToast({ style: Toast.Style.Failure, title: "Passphrases do not match" });
      return;
    }
    try {
      const destination = await writeEncryptedExportSnapshot(values.passphrase);
      await showToast({ style: Toast.Style.Success, title: "Encrypted export created", message: destination });
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Could not create encrypted export",
        message: String(error),
      });
    }
  }

  return (
    <Form
      navigationTitle="Create Encrypted Export"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create Encrypted Export" icon={Icon.Lock} onSubmit={submit} />
        </ActionPanel>
      }
    >
      <Form.Description text="Creates an AES-256-GCM encrypted local backup in Documents/Writing Signal Backups. Your passphrase is used only to create this file; Writing Signal does not save it. Keep the passphrase safe—there is no recovery mechanism." />
      <Form.PasswordField id="passphrase" title="Passphrase" placeholder="At least 12 characters" />
      <Form.PasswordField id="confirmation" title="Confirm passphrase" />
    </Form>
  );
}
