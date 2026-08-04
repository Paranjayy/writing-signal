import { Action, ActionPanel, Form, Icon, Toast, showToast } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { getCollectorIdleAfterSeconds, setCollectorIdleAfterSeconds } from "./core/collector";

const options = [
  { value: "30", title: "30 seconds — strict" },
  { value: "60", title: "1 minute" },
  { value: "120", title: "2 minutes — default" },
  { value: "300", title: "5 minutes" },
  { value: "600", title: "10 minutes — relaxed" },
];

export default function CollectorSettings() {
  const { data: idleAfterSeconds, isLoading } = usePromise(getCollectorIdleAfterSeconds);

  async function submit(values: { idleAfterSeconds: string }) {
    await setCollectorIdleAfterSeconds(Number(values.idleAfterSeconds));
    await showToast({ style: Toast.Style.Success, title: "Idle threshold saved locally" });
  }

  return (
    <Form
      isLoading={isLoading}
      navigationTitle="Automatic Tracking Settings"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save Tracking Settings" icon={Icon.Check} onSubmit={submit} />
        </ActionPanel>
      }
    >
      <Form.Description text="When no input has occurred for this long, the native collector stops attributing foreground-app time. This affects future time only and is applied without restarting the collector." />
      <Form.Dropdown id="idleAfterSeconds" title="Idle threshold" defaultValue={String(idleAfterSeconds ?? 120)}>
        {options.map((option) => (
          <Form.Dropdown.Item key={option.value} {...option} />
        ))}
      </Form.Dropdown>
    </Form>
  );
}
