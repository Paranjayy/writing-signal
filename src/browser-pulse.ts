import { environment, LaunchType, showHUD, showToast, Toast } from "@raycast/api";
import { recordBrowserPulse } from "./core/browser";

export default async function browserPulse() {
  try {
    const pulse = await recordBrowserPulse();
    if (environment.launchType === LaunchType.UserInitiated) {
      await showHUD(pulse ? `Browser activity ready · ${pulse.host}` : "No active website found");
    }
  } catch (error) {
    if (environment.launchType === LaunchType.UserInitiated) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Could not read active browser tab",
        message: String(error),
      });
    }
  }
}
