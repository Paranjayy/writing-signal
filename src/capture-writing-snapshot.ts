import { getSelectedText, showHUD, showToast, Toast } from "@raycast/api";
import { classifyText } from "./core/classify";
import { formatNumber } from "./core/presentation";
import { recordSnapshot } from "./core/storage";

export default async function captureWritingSnapshot() {
  try {
    const selectedText = await getSelectedText();
    if (!selectedText.trim()) {
      await showToast({ style: Toast.Style.Failure, title: "Select some writing first" });
      return;
    }

    const delta = await recordSnapshot(classifyText(selectedText));
    await showHUD(`Recorded ${formatNumber(delta.words)} new words · text discarded`);
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Could not read selected text",
      message: error instanceof Error ? error.message : "Give Raycast accessibility permission, then try again.",
    });
  }
}
