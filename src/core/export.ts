import { promises as fs } from "fs";
import { homedir } from "os";
import path from "path";
import { getBrowserExport } from "./browser";
import { getCollectorRules, getCollectorSummary } from "./collector";
import { getGoals } from "./goals";
import { getState } from "./storage";

export async function createExportSnapshot(): Promise<string> {
  const [writing, goals, browser, collector, collectorRules] = await Promise.all([
    getState(),
    getGoals(),
    getBrowserExport(),
    getCollectorSummary(),
    getCollectorRules(),
  ]);
  return JSON.stringify(
    {
      schemaVersion: 1,
      exportedAt: new Date().toISOString(),
      notice:
        "Local aggregates only. This backup contains no raw writing, keystrokes, clipboard contents, URL paths, or page content.",
      writing,
      goals,
      browser,
      collector: { summary: collector, rules: collectorRules },
    },
    null,
    2,
  );
}

export async function writeExportSnapshot(): Promise<string> {
  const directory = path.join(homedir(), "Documents", "Writing Signal Backups");
  await fs.mkdir(directory, { recursive: true, mode: 0o700 });
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const destination = path.join(directory, `writing-signal-backup-${timestamp}.json`);
  await fs.writeFile(destination, await createExportSnapshot(), { encoding: "utf8", mode: 0o600, flag: "wx" });
  return destination;
}
