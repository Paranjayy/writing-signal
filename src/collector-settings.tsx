import { Action, ActionPanel, Alert, Form, Icon, Toast, confirmAlert, showToast } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import {
  getCollectorIdleAfterSeconds,
  getCollectorRetentionDays,
  setCollectorIdleAfterSeconds,
  setCollectorRetentionDays,
} from "./core/collector";

const options = [
  { value: "30", title: "30 seconds — strict" },
  { value: "60", title: "1 minute" },
  { value: "120", title: "2 minutes — default" },
  { value: "300", title: "5 minutes" },
  { value: "600", title: "10 minutes — relaxed" },
];

const retentionOptions = [
  { value: "forever", title: "Keep indefinitely" },
  { value: "30", title: "Keep 30 days" },
  { value: "90", title: "Keep 90 days" },
  { value: "365", title: "Keep 1 year" },
];

export default function CollectorSettings() {
  const { data, isLoading } = usePromise(async () => {
    const [idleAfterSeconds, retentionDays] = await Promise.all([
      getCollectorIdleAfterSeconds(),
      getCollectorRetentionDays(),
    ]);
    return { idleAfterSeconds, retentionDays };
  });

  async function submit(values: { idleAfterSeconds: string; retentionDays: string }) {
    const retentionDays = values.retentionDays === "forever" ? undefined : Number(values.retentionDays);
    if (
      retentionDays !== undefined &&
      (data?.retentionDays === undefined || (data.retentionDays !== undefined && retentionDays < data.retentionDays))
    ) {
      const confirmed = await confirmAlert({
        title: "Shorten automatic history retention?",
        message:
          "The native collector will permanently remove older app-time and keyboard aggregates on its next update. Existing exports are not affected.",
        primaryAction: { title: "Apply Retention", style: Alert.ActionStyle.Destructive },
      });
      if (!confirmed) return;
    }
    await setCollectorIdleAfterSeconds(Number(values.idleAfterSeconds));
    await setCollectorRetentionDays(retentionDays);
    await showToast({ style: Toast.Style.Success, title: "Automatic tracking settings saved locally" });
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
      <Form.Dropdown id="idleAfterSeconds" title="Idle threshold" defaultValue={String(data?.idleAfterSeconds ?? 120)}>
        {options.map((option) => (
          <Form.Dropdown.Item key={option.value} {...option} />
        ))}
      </Form.Dropdown>
      <Form.Dropdown
        id="retentionDays"
        title="Automatic history"
        defaultValue={String(data?.retentionDays ?? "forever")}
      >
        {retentionOptions.map((option) => (
          <Form.Dropdown.Item key={option.value} {...option} />
        ))}
      </Form.Dropdown>
    </Form>
  );
}
