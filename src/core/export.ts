import { createCipheriv, randomBytes, scrypt } from "crypto";
import { promises as fs } from "fs";
import { homedir } from "os";
import path from "path";
import { promisify } from "util";
import { getBrowserExport } from "./browser";
import { getCollectorRules, getCollectorSummary } from "./collector";
import { getClipboardPatternExport } from "./clipboard-history";
import { getGoals } from "./goals";
import { getState } from "./storage";

const scryptAsync = promisify(scrypt);

function backupDirectory(): string {
  return path.join(homedir(), "Documents", "Writing Signal Backups");
}

function timestamp(): string {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

export async function createExportSnapshot(): Promise<string> {
  const [writing, goals, browser, clipboardPatterns, collector, collectorRules] = await Promise.all([
    getState(),
    getGoals(),
    getBrowserExport(),
    getClipboardPatternExport(),
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
      clipboardPatterns,
      collector: { summary: collector, rules: collectorRules },
    },
    null,
    2,
  );
}

export async function writeExportSnapshot(): Promise<string> {
  const directory = backupDirectory();
  await fs.mkdir(directory, { recursive: true, mode: 0o700 });
  const destination = path.join(directory, `writing-signal-backup-${timestamp()}.json`);
  await fs.writeFile(destination, await createExportSnapshot(), { encoding: "utf8", mode: 0o600, flag: "wx" });
  return destination;
}

export async function writeEncryptedExportSnapshot(passphrase: string): Promise<string> {
  if (passphrase.length < 12) throw new Error("Use a passphrase with at least 12 characters");
  const directory = backupDirectory();
  await fs.mkdir(directory, { recursive: true, mode: 0o700 });
  const salt = randomBytes(16);
  const initializationVector = randomBytes(12);
  const key = (await scryptAsync(passphrase, salt, 32)) as Buffer;
  const cipher = createCipheriv("aes-256-gcm", key, initializationVector);
  const ciphertext = Buffer.concat([cipher.update(await createExportSnapshot(), "utf8"), cipher.final()]);
  const destination = path.join(directory, `writing-signal-backup-${timestamp()}.encrypted.json`);
  const envelope = JSON.stringify(
    {
      schemaVersion: 1,
      format: "writing-signal-encrypted-export",
      cipher: "aes-256-gcm",
      keyDerivation: "scrypt",
      salt: salt.toString("base64"),
      initializationVector: initializationVector.toString("base64"),
      authenticationTag: cipher.getAuthTag().toString("base64"),
      ciphertext: ciphertext.toString("base64"),
    },
    null,
    2,
  );
  await fs.writeFile(destination, envelope, { encoding: "utf8", mode: 0o600, flag: "wx" });
  return destination;
}
