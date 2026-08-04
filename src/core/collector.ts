import { promises as fs } from "fs";
import { homedir } from "os";
import path from "path";

export type CollectorCategory = "writing" | "creating" | "consuming" | "other";

export const COLLECTOR_CATEGORIES: CollectorCategory[] = ["writing", "creating", "consuming", "other"];

export type CollectorApplication = {
  name: string;
  bundleIdentifier: string;
  category: CollectorCategory;
  seconds: number;
};

export type CollectorKeyboardSummary = {
  keyDowns: number;
  printableKeyDowns: number;
  separators: number;
  deletions: number;
  estimatedWords: number;
};

export type CollectorSummary = {
  schemaVersion: number;
  generatedAt: string;
  isTracking: boolean;
  trackingStartedAt: string;
  settings: { keyboardTrackingEnabled: boolean; idleAfterSeconds: number };
  activeApplication?: { name: string; bundleIdentifier: string; category: CollectorCategory };
  days: Record<string, Record<string, CollectorApplication>>;
  keyboardByDay: Record<string, CollectorKeyboardSummary>;
  keyboardByDayAndApplication?: Record<string, Record<string, CollectorKeyboardSummary>>;
};

type RuleFile = {
  schemaVersion: 1;
  categories: Record<string, CollectorCategory>;
  excludedBundleIdentifiers?: string[];
};

function collectorDirectory(): string {
  return path.join(homedir(), ".writing-signal");
}

export function localDayKey(date = new Date()): string {
  return date.toLocaleDateString("en-CA");
}

export async function getCollectorSummary(): Promise<CollectorSummary | undefined> {
  const summaryPath = path.join(collectorDirectory(), "summary.json");
  try {
    const raw = await fs.readFile(summaryPath, "utf8");
    const parsed = JSON.parse(raw) as CollectorSummary;
    return parsed.schemaVersion === 1 ? parsed : undefined;
  } catch {
    return undefined;
  }
}

export async function getCollectorRules(): Promise<Record<string, CollectorCategory>> {
  return (await getRuleFile()).categories;
}

async function getRuleFile(): Promise<RuleFile> {
  try {
    const raw = await fs.readFile(path.join(collectorDirectory(), "rules.json"), "utf8");
    const parsed = JSON.parse(raw) as RuleFile;
    return parsed.schemaVersion === 1
      ? {
          schemaVersion: 1,
          categories: parsed.categories ?? {},
          excludedBundleIdentifiers: parsed.excludedBundleIdentifiers ?? [],
        }
      : { schemaVersion: 1, categories: {}, excludedBundleIdentifiers: [] };
  } catch {
    return { schemaVersion: 1, categories: {}, excludedBundleIdentifiers: [] };
  }
}

async function writeRules(rules: RuleFile): Promise<void> {
  const directory = collectorDirectory();
  await fs.mkdir(directory, { recursive: true, mode: 0o700 });
  await fs.writeFile(path.join(directory, "rules.json"), JSON.stringify(rules satisfies RuleFile, null, 2), {
    encoding: "utf8",
    mode: 0o600,
  });
}

export async function setCollectorRule(bundleIdentifier: string, category: CollectorCategory): Promise<void> {
  const normalized = bundleIdentifier.trim();
  if (!normalized) throw new Error("Bundle identifier is required");
  const rules = await getRuleFile();
  rules.categories[normalized] = category;
  await writeRules(rules);
}

export async function removeCollectorRule(bundleIdentifier: string): Promise<void> {
  const rules = await getRuleFile();
  delete rules.categories[bundleIdentifier];
  await writeRules(rules);
}

export async function getCollectorExclusions(): Promise<string[]> {
  return (await getRuleFile()).excludedBundleIdentifiers ?? [];
}

export async function excludeCollectorApp(bundleIdentifier: string): Promise<void> {
  const normalized = bundleIdentifier.trim();
  if (!normalized) throw new Error("Bundle identifier is required");
  const rules = await getRuleFile();
  rules.excludedBundleIdentifiers = [...new Set([...(rules.excludedBundleIdentifiers ?? []), normalized])].sort();
  await writeRules(rules);
}

export async function includeCollectorApp(bundleIdentifier: string): Promise<void> {
  const rules = await getRuleFile();
  rules.excludedBundleIdentifiers = (rules.excludedBundleIdentifiers ?? []).filter(
    (entry) => entry !== bundleIdentifier,
  );
  await writeRules(rules);
}

export async function clearCollectorData(): Promise<void> {
  const directory = collectorDirectory();
  await Promise.all(
    ["summary.json", "rules.json", "collector.log", "collector-error.log"].map(async (name) => {
      try {
        await fs.unlink(path.join(directory, name));
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
      }
    }),
  );
}

export function usageForDay(summary: CollectorSummary | undefined, date = new Date()): CollectorApplication[] {
  return usageForRange(summary, date, date);
}

export function usageForRange(
  summary: CollectorSummary | undefined,
  from: Date,
  through: Date,
): CollectorApplication[] {
  if (!summary) return [];
  const fromKey = localDayKey(from);
  const throughKey = localDayKey(through);
  const merged: Record<string, CollectorApplication> = {};
  for (const [date, apps] of Object.entries(summary.days)) {
    if (date < fromKey || date > throughKey) continue;
    for (const app of Object.values(apps)) {
      const existing = merged[app.bundleIdentifier];
      merged[app.bundleIdentifier] = existing ? { ...existing, seconds: existing.seconds + app.seconds } : { ...app };
    }
  }
  return Object.values(merged).sort((left, right) => right.seconds - left.seconds);
}

export function keyboardForAppDay(
  summary: CollectorSummary | undefined,
  bundleIdentifier: string,
  date = new Date(),
): CollectorKeyboardSummary | undefined {
  return summary?.keyboardByDayAndApplication?.[localDayKey(date)]?.[bundleIdentifier];
}
