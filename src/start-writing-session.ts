import { showHUD } from "@raycast/api";
import { startActivitySession } from "./core/storage";

export default async function startWritingSession() {
  const started = await startActivitySession("writing");
  await showHUD(started ? "Writing session started" : "A writing session is already running");
}
