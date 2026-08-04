import { recordClipboardPulse } from "./core/clipboard-history";

export default async function clipboardPulse() {
  await recordClipboardPulse();
}
