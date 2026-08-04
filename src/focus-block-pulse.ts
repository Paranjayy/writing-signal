import { showHUD } from "@raycast/api";
import { formatActivityLabel, formatDuration } from "./core/presentation";
import { stopActivitySessionIfDue } from "./core/storage";

export default async function focusBlockPulse() {
  const result = await stopActivitySessionIfDue();
  if (result) await showHUD(`${formatActivityLabel(result.kind)} block complete · ${formatDuration(result.duration)}`);
}
