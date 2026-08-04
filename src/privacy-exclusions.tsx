import { Action, ActionPanel, Alert, confirmAlert, Form, Icon, List, showToast, Toast } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { excludeCollectorApp, getCollectorExclusions, includeCollectorApp } from "./core/collector";

type FormValues = { bundleIdentifier: string };

export function ExcludeAppForm({
  bundleIdentifier = "",
  onSaved,
}: {
  bundleIdentifier?: string;
  onSaved?: () => Promise<void>;
}) {
  async function submit(values: FormValues) {
    try {
      await excludeCollectorApp(values.bundleIdentifier);
      await showToast({ style: Toast.Style.Success, title: "App excluded from collection" });
      await onSaved?.();
    } catch (error) {
      await showToast({ style: Toast.Style.Failure, title: "Could not exclude app", message: String(error) });
    }
  }

  return (
    <Form
      navigationTitle="Exclude App from Tracking"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Exclude App" icon={Icon.EyeDisabled} onSubmit={submit} />
        </ActionPanel>
      }
    >
      <Form.Description text="The native collector will stop recording this app's time, keyboard aggregates, and current-app label." />
      <Form.TextField
        id="bundleIdentifier"
        title="Bundle Identifier"
        defaultValue={bundleIdentifier}
        placeholder="com.example.private-app"
      />
    </Form>
  );
}

export default function PrivacyExclusions() {
  const { data: exclusions = [], isLoading, revalidate } = usePromise(getCollectorExclusions);
  const refresh = async () => {
    await revalidate();
  };

  async function include(bundleIdentifier: string) {
    const confirmed = await confirmAlert({
      title: "Include app again?",
      message: `${bundleIdentifier} may be collected by the native companion again.`,
      primaryAction: { title: "Include App", style: Alert.ActionStyle.Default },
    });
    if (!confirmed) return;
    await includeCollectorApp(bundleIdentifier);
    await refresh();
  }

  return (
    <List isLoading={isLoading} navigationTitle="Privacy Exclusions">
      <List.EmptyView
        title="No excluded apps"
        description="Add any app that should never appear in personal telemetry."
        actions={
          <ActionPanel>
            <Action.Push title="Exclude App" icon={Icon.EyeDisabled} target={<ExcludeAppForm onSaved={refresh} />} />
          </ActionPanel>
        }
      />
      {exclusions.map((bundleIdentifier) => (
        <List.Item
          key={bundleIdentifier}
          title={bundleIdentifier}
          subtitle="Not collected"
          icon={Icon.EyeDisabled}
          actions={
            <ActionPanel>
              <Action title="Include App Again" icon={Icon.Eye} onAction={() => include(bundleIdentifier)} />
              <Action.CopyToClipboard title="Copy Bundle Identifier" content={bundleIdentifier} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
