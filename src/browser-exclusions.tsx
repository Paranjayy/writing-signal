import { Action, ActionPanel, Form, Icon, List, showToast, Toast } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { excludeBrowserHost, getBrowserRules, includeBrowserHost } from "./core/browser";

type Values = { host: string };

export function ExcludeBrowserForm({ host = "", onSaved }: { host?: string; onSaved?: () => Promise<void> }) {
  async function submit(values: Values) {
    try {
      await excludeBrowserHost(values.host);
      await showToast({ style: Toast.Style.Success, title: "Domain excluded" });
      await onSaved?.();
    } catch (error) {
      await showToast({ style: Toast.Style.Failure, title: "Could not exclude domain", message: String(error) });
    }
  }
  return (
    <Form
      navigationTitle="Exclude Domain"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Exclude Domain" icon={Icon.EyeDisabled} onSubmit={submit} />
        </ActionPanel>
      }
    >
      <Form.TextField id="host" title="Hostname" defaultValue={host} placeholder="private.example" />
    </Form>
  );
}

export default function BrowserExclusions() {
  const { data: rules, isLoading, revalidate } = usePromise(getBrowserRules);
  const refresh = async () => {
    await revalidate();
  };
  const exclusions = rules?.excludedHosts ?? [];
  return (
    <List isLoading={isLoading} navigationTitle="Browser Privacy Exclusions">
      <List.EmptyView
        title="No excluded domains"
        description="Excluded domains never add browser activity time."
        actions={
          <ActionPanel>
            <Action.Push
              title="Exclude Domain"
              icon={Icon.EyeDisabled}
              target={<ExcludeBrowserForm onSaved={refresh} />}
            />
          </ActionPanel>
        }
      />
      {exclusions.map((host) => (
        <List.Item
          key={host}
          title={host}
          subtitle="Not collected"
          icon={Icon.EyeDisabled}
          actions={
            <ActionPanel>
              <Action
                title="Include Domain Again"
                icon={Icon.Eye}
                onAction={async () => {
                  await includeBrowserHost(host);
                  await refresh();
                }}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
