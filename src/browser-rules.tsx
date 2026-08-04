import { Action, ActionPanel, Alert, confirmAlert, Form, Icon, List, showToast, Toast } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { BrowserCategory, getBrowserRules, removeBrowserCategory, setBrowserCategory } from "./core/browser";

const categories: BrowserCategory[] = ["writing", "creating", "consuming", "other"];

type RuleValues = { host: string; category: BrowserCategory };

export function BrowserRuleForm({
  host = "",
  category = "creating",
  onSaved,
}: {
  host?: string;
  category?: BrowserCategory;
  onSaved?: () => Promise<void>;
}) {
  async function submit(values: RuleValues) {
    try {
      await setBrowserCategory(values.host, values.category);
      await showToast({ style: Toast.Style.Success, title: "Browser rule saved" });
      await onSaved?.();
    } catch (error) {
      await showToast({ style: Toast.Style.Failure, title: "Could not save browser rule", message: String(error) });
    }
  }
  return (
    <Form
      navigationTitle="Set Domain Category"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save Rule" icon={Icon.Check} onSubmit={submit} />
        </ActionPanel>
      }
    >
      <Form.TextField id="host" title="Hostname" defaultValue={host} placeholder="example.com" />
      <Form.Dropdown id="category" title="Category" defaultValue={category}>
        {categories.map((category) => (
          <Form.Dropdown.Item key={category} value={category} title={category} />
        ))}
      </Form.Dropdown>
    </Form>
  );
}

export default function BrowserRules() {
  const { data: rules, isLoading, revalidate } = usePromise(getBrowserRules);
  const entries = Object.entries(rules?.categoryByHost ?? {}).sort(([left], [right]) => left.localeCompare(right));
  const refresh = async () => {
    await revalidate();
  };
  async function remove(host: string) {
    const confirmed = await confirmAlert({
      title: "Remove domain rule?",
      message: `${host} will return to its broad default category.`,
      primaryAction: { title: "Remove Rule", style: Alert.ActionStyle.Destructive },
    });
    if (!confirmed) return;
    await removeBrowserCategory(host);
    await refresh();
  }
  return (
    <List isLoading={isLoading} navigationTitle="Manage Browser Rules">
      <List.EmptyView
        title="No custom domain rules"
        description="Add rules for domains that deserve a better category."
        actions={
          <ActionPanel>
            <Action.Push title="Add Domain Rule" icon={Icon.Plus} target={<BrowserRuleForm onSaved={refresh} />} />
          </ActionPanel>
        }
      />
      {entries.map(([host, category]) => (
        <List.Item
          key={host}
          title={host}
          accessories={[{ text: category }]}
          actions={
            <ActionPanel>
              <Action.Push
                title="Edit Rule"
                icon={Icon.Pencil}
                target={<BrowserRuleForm host={host} category={category} onSaved={refresh} />}
              />
              <Action
                title="Remove Rule"
                icon={Icon.Trash}
                style={Action.Style.Destructive}
                onAction={() => remove(host)}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
