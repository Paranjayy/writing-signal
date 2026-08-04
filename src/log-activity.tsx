import { Action, ActionPanel, Form, Icon, showToast, Toast } from "@raycast/api";
import { recordActivity } from "./core/storage";
import { ACTIVITY_KINDS, ACTIVITY_LABELS, ActivityKind } from "./core/types";

type FormValues = { kind: ActivityKind; minutes: string; date: Date };

export default function LogActivity() {
  async function submit(values: FormValues) {
    const minutes = Number(values.minutes);
    if (!Number.isFinite(minutes) || minutes <= 0 || minutes > 1_440) {
      await showToast({ style: Toast.Style.Failure, title: "Enter between 1 and 1,440 minutes" });
      return;
    }
    await recordActivity(values.kind, Math.round(minutes * 60_000), values.date);
    await showToast({ style: Toast.Style.Success, title: `${ACTIVITY_LABELS[values.kind]} time added` });
  }

  return (
    <Form
      navigationTitle="Log Past Activity"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Add Time" icon={Icon.Plus} onSubmit={submit} />
        </ActionPanel>
      }
    >
      <Form.Description text="For the moments you notice time already disappeared. This adds an aggregate—no timeline or activity contents." />
      <Form.Dropdown id="kind" title="Activity" defaultValue="focus">
        {ACTIVITY_KINDS.map((kind) => (
          <Form.Dropdown.Item key={kind} value={kind} title={ACTIVITY_LABELS[kind]} />
        ))}
      </Form.Dropdown>
      <Form.TextField id="minutes" title="Minutes" placeholder="30" />
      <Form.DatePicker id="date" title="When" defaultValue={new Date()} />
    </Form>
  );
}
