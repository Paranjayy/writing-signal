import { Action, ActionPanel, Form, Icon, Toast, showToast } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { getCollectorPausedUntil, setCollectorPausedUntil } from "./core/collector";

const pauseOptions = [
  { value: "15", title: "Pause for 15 minutes" },
  { value: "60", title: "Pause for 1 hour" },
  { value: "180", title: "Pause for 3 hours" },
  { value: "tomorrow", title: "Pause until tomorrow" },
  { value: "resume", title: "Resume tracking now" },
];

export default function TrackingPause() {
  const { data: pausedUntil, isLoading } = usePromise(getCollectorPausedUntil);

  async function submit(values: { duration: string }) {
    if (values.duration === "resume") {
      await setCollectorPausedUntil(undefined);
      await showToast({ style: Toast.Style.Success, title: "Automatic tracking resumed" });
      return;
    }
    const until = new Date();
    if (values.duration === "tomorrow") until.setHours(24, 0, 0, 0);
    else until.setMinutes(until.getMinutes() + Number(values.duration));
    await setCollectorPausedUntil(until);
    await showToast({
      style: Toast.Style.Success,
      title: "Automatic tracking paused",
      message: `Until ${until.toLocaleString()}`,
    });
  }

  return (
    <Form
      isLoading={isLoading}
      navigationTitle="Pause Automatic Tracking"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Apply Pause" icon={Icon.Pause} onSubmit={submit} />
        </ActionPanel>
      }
    >
      <Form.Description
        text={
          pausedUntil
            ? `Tracking is paused until ${pausedUntil.toLocaleString()}. While paused, the native collector records no foreground app time or keyboard aggregates.`
            : "While paused, the native collector records no foreground app time or keyboard aggregates. This local setting is applied immediately."
        }
      />
      <Form.Dropdown id="duration" title="Automatic tracking" defaultValue={pausedUntil ? "resume" : "60"}>
        {pauseOptions.map((option) => (
          <Form.Dropdown.Item key={option.value} {...option} />
        ))}
      </Form.Dropdown>
    </Form>
  );
}
