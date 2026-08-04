import { Action, ActionPanel, Form, Icon, Toast, showToast } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { getDailyReviewHour, setDailyReviewHour } from "./core/daily-review";

const options = [
  { value: "off", title: "Off" },
  { value: "17", title: "5 PM" },
  { value: "18", title: "6 PM" },
  { value: "20", title: "8 PM" },
  { value: "21", title: "9 PM" },
];

export default function DailyReviewSettings() {
  const { data: hour, isLoading } = usePromise(getDailyReviewHour);
  async function submit(values: { hour: string }) {
    await setDailyReviewHour(values.hour === "off" ? undefined : Number(values.hour));
    await showToast({
      style: Toast.Style.Success,
      title: values.hour === "off" ? "Daily check-in turned off" : "Daily check-in saved locally",
    });
  }
  return (
    <Form
      isLoading={isLoading}
      navigationTitle="Daily Check-in Settings"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save Daily Check-In" icon={Icon.Check} onSubmit={submit} />
        </ActionPanel>
      }
    >
      <Form.Description text="At the selected hour, Writing Signal shows one local summary of your day. It is off by default, never contacts a server, and never includes raw content." />
      <Form.Dropdown id="hour" title="Daily check-in" defaultValue={hour === undefined ? "off" : String(hour)}>
        {options.map((option) => (
          <Form.Dropdown.Item key={option.value} {...option} />
        ))}
      </Form.Dropdown>
    </Form>
  );
}
