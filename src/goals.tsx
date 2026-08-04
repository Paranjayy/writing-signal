import { Action, ActionPanel, Form, Toast, showToast } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { getGoals, Goals, saveGoals } from "./core/goals";

type GoalValues = Record<keyof Goals, string>;

function parseGoal(value: string): number | undefined {
  if (!/^\d+$/.test(value.trim())) return undefined;
  return Number(value);
}

export default function GoalsCommand() {
  const { data: goals, isLoading } = usePromise(getGoals);

  async function submit(values: GoalValues) {
    const dailyWords = parseGoal(values.dailyWords);
    const dailyFocusMinutes = parseGoal(values.dailyFocusMinutes);
    const dailyCreatingMinutes = parseGoal(values.dailyCreatingMinutes);
    const dailyConsumingLimitMinutes = parseGoal(values.dailyConsumingLimitMinutes);
    if (
      dailyWords === undefined ||
      dailyFocusMinutes === undefined ||
      dailyCreatingMinutes === undefined ||
      dailyConsumingLimitMinutes === undefined
    ) {
      await showToast({ style: Toast.Style.Failure, title: "Use whole numbers that are zero or higher" });
      return;
    }
    await saveGoals({ dailyWords, dailyFocusMinutes, dailyCreatingMinutes, dailyConsumingLimitMinutes });
    await showToast({ style: Toast.Style.Success, title: "Daily goals saved locally" });
  }

  return (
    <Form
      isLoading={isLoading}
      navigationTitle="Set Daily Goals"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save Daily Goals" onSubmit={submit} />
        </ActionPanel>
      }
    >
      <Form.Description text="Optional, local targets for orientation—not streaks or guilt. Set a field to 0 to hide that goal." />
      <Form.TextField
        id="dailyWords"
        title="Words"
        defaultValue={String(goals?.dailyWords ?? 0)}
        placeholder="e.g. 500"
      />
      <Form.TextField
        id="dailyFocusMinutes"
        title="Focused work (minutes)"
        defaultValue={String(goals?.dailyFocusMinutes ?? 0)}
        placeholder="e.g. 90"
      />
      <Form.TextField
        id="dailyCreatingMinutes"
        title="Creating (minutes)"
        defaultValue={String(goals?.dailyCreatingMinutes ?? 0)}
        placeholder="e.g. 60"
      />
      <Form.TextField
        id="dailyConsumingLimitMinutes"
        title="Consuming ceiling (minutes)"
        defaultValue={String(goals?.dailyConsumingLimitMinutes ?? 0)}
        placeholder="e.g. 90"
      />
    </Form>
  );
}
