import { createDecipheriv, scrypt } from "crypto";
import { promises as fs } from "fs";
import { promisify } from "util";
import { mergeBrowserExport } from "./browser";
import { mergeClipboardPatternExport } from "./clipboard-history";
import { restoreGoals } from "./goals";
import { mergeImportedWritingState } from "./storage";

const scryptAsync = promisify(scrypt);

type Backup = {
  schemaVersion: number;
  writing?: unknown;
  goals?: unknown;
  browser?: unknown;
  clipboardPatterns?: unknown;
};

type EncryptedBackup = {
  format: "writing-signal-encrypted-export";
  cipher: "aes-256-gcm";
  keyDerivation: "scrypt";
  salt: string;
  initializationVector: string;
  authenticationTag: string;
  ciphertext: string;
};

function parseBackup(raw: string, passphrase?: string): Promise<Backup> {
  const parsed = JSON.parse(raw) as Backup | EncryptedBackup;
  if ((parsed as EncryptedBackup).format !== "writing-signal-encrypted-export")
    return Promise.resolve(parsed as Backup);
  if (!passphrase) throw new Error("This backup is encrypted; enter its passphrase");
  const encrypted = parsed as EncryptedBackup;
  if (encrypted.cipher !== "aes-256-gcm" || encrypted.keyDerivation !== "scrypt")
    throw new Error("Unsupported encrypted backup");
  return scryptAsync(passphrase, Buffer.from(encrypted.salt, "base64"), 32).then((key) => {
    const decipher = createDecipheriv(
      "aes-256-gcm",
      key as Buffer,
      Buffer.from(encrypted.initializationVector, "base64"),
    );
    decipher.setAuthTag(Buffer.from(encrypted.authenticationTag, "base64"));
    const plaintext = Buffer.concat([
      decipher.update(Buffer.from(encrypted.ciphertext, "base64")),
      decipher.final(),
    ]).toString("utf8");
    return JSON.parse(plaintext) as Backup;
  });
}

export async function importPortableBackup(
  filePath: string,
  passphrase?: string,
): Promise<{ writingDays: number; browserDays: number; clipboardDays: number }> {
  const backup = await parseBackup(await fs.readFile(filePath, "utf8"), passphrase);
  if (backup.schemaVersion !== 1 || !backup.writing || !backup.goals || !backup.browser)
    throw new Error("This is not a supported Writing Signal backup");
  const [writingDays, browserDays, clipboardDays] = await Promise.all([
    mergeImportedWritingState(backup.writing),
    mergeBrowserExport(backup.browser),
    mergeClipboardPatternExport(backup.clipboardPatterns ?? { days: {} }),
    restoreGoals(backup.goals),
  ]).then(([writing, browser, clipboard]) => [writing, browser, clipboard]);
  return { writingDays, browserDays, clipboardDays };
}
