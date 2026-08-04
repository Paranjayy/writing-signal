import { Action, ActionPanel, Alert, Detail, Icon, Toast, confirmAlert, showToast } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { getNativeSetupState, installNativeCollector, uninstallNativeCollector } from "./core/native-setup";

export default function CollectorSetup() {
  const { data: state, isLoading, revalidate } = usePromise(getNativeSetupState);

  async function install(keyboardTracking: boolean) {
    const confirmed = await confirmAlert({
      title: keyboardTracking ? "Install app and keyboard aggregate tracking?" : "Install app-time tracking?",
      message: keyboardTracking
        ? "This installs a local Login Item-style LaunchAgent. It records foreground app names, categories, time, and aggregate keyboard counts. macOS will require Input Monitoring approval; no keys or text are stored."
        : "This installs a local LaunchAgent that starts at login and records foreground app names, categories, and time. It does not record keyboard activity or text.",
      primaryAction: { title: "Install Local Collector", style: Alert.ActionStyle.Default },
    });
    if (!confirmed) return;
    try {
      await installNativeCollector(keyboardTracking);
      await showToast({ style: Toast.Style.Success, title: "Native collector installed and started" });
      await revalidate();
    } catch (error) {
      await showToast({ style: Toast.Style.Failure, title: "Could not install collector", message: String(error) });
    }
  }

  async function uninstall() {
    const confirmed = await confirmAlert({
      title: "Remove native collector?",
      message:
        "This stops automatic tracking and removes its LaunchAgent. Your existing local summaries remain until you erase them from Privacy & Data.",
      primaryAction: { title: "Remove Collector", style: Alert.ActionStyle.Destructive },
    });
    if (!confirmed) return;
    try {
      await uninstallNativeCollector();
      await showToast({ style: Toast.Style.Success, title: "Native collector removed" });
      await revalidate();
    } catch (error) {
      await showToast({ style: Toast.Style.Failure, title: "Could not remove collector", message: String(error) });
    }
  }

  const markdown = `# Native Collector Setup

${state?.installed ? "**Installed:** automatic app-time collection starts at login." : "**Not installed:** this extension can build and install the local companion from this workspace."}

## App-time mode

Records the foreground app name, bundle identifier, broad category, and duration. It never captures window titles, screenshots, websites, or text.

## Optional keyboard aggregates

Adds only key-count, delete-count, separator-count, and estimated-word totals attributed to the foreground app. macOS Input Monitoring consent is required. Individual key values and text are never retained.

## Development note

${state?.developmentSourceAvailable ? "The native Swift source is available in this workspace, so setup can build it locally." : "This installation does not include native source. A signed packaged companion is required for one-click public distribution."}
`;

  return (
    <Detail
      isLoading={isLoading}
      navigationTitle="Native Collector Setup"
      markdown={markdown}
      actions={
        <ActionPanel>
          <Action title="Refresh Setup Status" icon={Icon.ArrowClockwise} onAction={revalidate} />
          {state?.developmentSourceAvailable && !state.installed && (
            <>
              <Action title="Install App-Time Tracking" icon={Icon.Clock} onAction={() => install(false)} />
              <Action title="Install App + Keyboard Aggregates" icon={Icon.Keyboard} onAction={() => install(true)} />
            </>
          )}
          {state?.installed && (
            <Action
              title="Remove Native Collector"
              icon={Icon.Trash}
              style={Action.Style.Destructive}
              onAction={uninstall}
            />
          )}
        </ActionPanel>
      }
    />
  );
}
