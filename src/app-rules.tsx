import { Action, ActionPanel, Alert, confirmAlert, Form, Icon, List, showToast, Toast } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import {
  COLLECTOR_CATEGORIES,
  CollectorCategory,
  getCollectorRules,
  removeCollectorRule,
  setCollectorRule,
} from "./core/collector";

const labels: Record<CollectorCategory, string> = {
  writing: "Writing",
  creating: "Creating",
  consuming: "Consuming",
  other: "Other",
};

type RuleValues = { bundleIdentifier: string; category: CollectorCategory };

export function AppRuleForm({
  bundleIdentifier = "",
  category = "creating",
  onSaved,
}: {
  bundleIdentifier?: string;
  category?: CollectorCategory;
  onSaved?: () => Promise<void>;
}) {
  async function submit(values: RuleValues) {
    try {
      await setCollectorRule(values.bundleIdentifier, values.category);
      await showToast({ style: Toast.Style.Success, title: "App rule saved" });
      await onSaved?.();
    } catch (error) {
      await showToast({ style: Toast.Style.Failure, title: "Could not save rule", message: String(error) });
    }
  }

  return (
    <Form
      navigationTitle="Set App Category"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save Rule" icon={Icon.Check} onSubmit={submit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="bundleIdentifier"
        title="Bundle Identifier"
        defaultValue={bundleIdentifier}
        placeholder="com.example.app"
      />
      <Form.Dropdown id="category" title="Category" defaultValue={category}>
        {COLLECTOR_CATEGORIES.map((category) => (
          <Form.Dropdown.Item key={category} value={category} title={labels[category]} />
        ))}
      </Form.Dropdown>
    </Form>
  );
}

export default function AppRules() {
  const { data: rules = {}, isLoading, revalidate } = usePromise(getCollectorRules);
  const entries = Object.entries(rules).sort(([left], [right]) => left.localeCompare(right));
  const refreshRules = async () => {
    await revalidate();
  };

  async function remove(bundleIdentifier: string) {
    const confirmed = await confirmAlert({
      title: "Remove app rule?",
      message: `${bundleIdentifier} will go back to the collector's broad default category.`,
      primaryAction: { title: "Remove Rule", style: Alert.ActionStyle.Destructive },
    });
    if (!confirmed) return;
    await removeCollectorRule(bundleIdentifier);
    await revalidate();
  }

  return (
    <List isLoading={isLoading} navigationTitle="Manage App Rules">
      <List.EmptyView
        title="No custom app rules"
        description="The collector currently uses its broad built-in categories. Add rules for the apps you use differently."
        actions={
          <ActionPanel>
            <Action.Push title="Add App Rule" icon={Icon.Plus} target={<AppRuleForm onSaved={refreshRules} />} />
          </ActionPanel>
        }
      />
      {entries.map(([bundleIdentifier, category]) => (
        <List.Item
          key={bundleIdentifier}
          title={bundleIdentifier}
          accessories={[{ text: labels[category] }]}
          actions={
            <ActionPanel>
              <Action.Push
                title="Edit Rule"
                icon={Icon.Pencil}
                target={<AppRuleForm bundleIdentifier={bundleIdentifier} category={category} onSaved={refreshRules} />}
              />
              <Action
                title="Remove Rule"
                icon={Icon.Trash}
                style={Action.Style.Destructive}
                onAction={() => remove(bundleIdentifier)}
              />
              <Action.CopyToClipboard title="Copy Bundle Identifier" content={bundleIdentifier} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
