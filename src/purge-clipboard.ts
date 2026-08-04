import { Alert, Clipboard, confirmAlert, showHUD } from "@raycast/api";

export default async function purgeClipboard() {
  const confirmed = await confirmAlert({
    title: "Clear the current clipboard?",
    message: "This removes the clipboard content currently exposed by macOS. It cannot be restored by this extension.",
    primaryAction: { title: "Clear Clipboard", style: Alert.ActionStyle.Destructive },
  });

  if (!confirmed) return;
  await Clipboard.clear();
  await showHUD("Current clipboard cleared");
}
