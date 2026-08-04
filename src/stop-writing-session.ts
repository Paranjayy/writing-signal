import { showHUD } from "@raycast/api";
import { formatActivityLabel, formatDuration } from "./core/presentation";
import { stopActivitySession } from "./core/storage";

export default async function stopWritingSession() {
  const result = await stopActivitySession();
  await showHUD(
    result === undefined
      ? "No activity timer is running"
      : `${formatActivityLabel(result.kind)} saved · ${formatDuration(result.duration)}`,
  );
}
