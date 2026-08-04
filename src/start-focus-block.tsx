import { Action, ActionPanel, Form, Icon, showHUD } from "@raycast/api";
import { ACTIVITY_KINDS, ACTIVITY_LABELS, ActivityKind } from "./core/types";
import { startActivitySession } from "./core/storage";

type Values = { kind: ActivityKind; duration: string };

const durations = [
  { value: "25", title: "25 minutes — a short sprint" },
  { value: "50", title: "50 minutes" },
  { value: "90", title: "90 minutes — a deep block" },
  { value: "120", title: "2 hours" },
];

export default function StartFocusBlock() {
  async function submit(values: Values) {
    const minutes = Number(values.duration);
    const end = new Date(Date.now() + minutes * 60_000);
    const started = await startActivitySession(values.kind, end);
    await showHUD(
      started
        ? `${ACTIVITY_LABELS[values.kind]} block started · ends ${end.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`
        : "An activity timer is already running",
    );
  }

  return (
    <Form
      navigationTitle="Start Focus Block"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Start Focus Block" icon={Icon.Play} onSubmit={submit} />
        </ActionPanel>
      }
    >
      <Form.Description text="A local planned session that ends itself and saves the exact scheduled duration. You can still stop it early from Stop Writing Session." />
      <Form.Dropdown id="kind" title="Intention" defaultValue="focus">
        {ACTIVITY_KINDS.map((kind) => (
          <Form.Dropdown.Item key={kind} value={kind} title={ACTIVITY_LABELS[kind]} />
        ))}
      </Form.Dropdown>
      <Form.Dropdown id="duration" title="Length" defaultValue="25">
        {durations.map((duration) => (
          <Form.Dropdown.Item key={duration.value} {...duration} />
        ))}
      </Form.Dropdown>
    </Form>
  );
}
