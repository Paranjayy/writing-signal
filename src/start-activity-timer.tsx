import { Action, ActionPanel, Form, Icon, showHUD } from "@raycast/api";
import { ACTIVITY_KINDS, ACTIVITY_LABELS, ActivityKind } from "./core/types";
import { startActivitySession } from "./core/storage";

type FormValues = { kind: ActivityKind };

export default function StartActivityTimer() {
  async function submit(values: FormValues) {
    const started = await startActivitySession(values.kind);
    await showHUD(started ? `${ACTIVITY_LABELS[values.kind]} timer started` : "An activity timer is already running");
  }

  return (
    <Form
      navigationTitle="Start Activity Timer"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Start Timer" icon={Icon.Play} onSubmit={submit} />
        </ActionPanel>
      }
    >
      <Form.Description text="Choose an intention, then forget about the clock. Stop it when you switch contexts." />
      <Form.Dropdown id="kind" title="What are you doing?" defaultValue="focus">
        {ACTIVITY_KINDS.map((kind) => (
          <Form.Dropdown.Item key={kind} value={kind} title={ACTIVITY_LABELS[kind]} />
        ))}
      </Form.Dropdown>
    </Form>
  );
}
