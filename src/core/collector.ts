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
};

type RuleFile = { schemaVersion: 1; categories: Record<string, CollectorCategory> };

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
  try {
    const raw = await fs.readFile(path.join(collectorDirectory(), "rules.json"), "utf8");
    const parsed = JSON.parse(raw) as RuleFile;
    return parsed.schemaVersion === 1 ? parsed.categories : {};
  } catch {
    return {};
  }
}

async function writeRules(categories: Record<string, CollectorCategory>): Promise<void> {
  const directory = collectorDirectory();
  await fs.mkdir(directory, { recursive: true, mode: 0o700 });
  await fs.writeFile(
    path.join(directory, "rules.json"),
    JSON.stringify({ schemaVersion: 1, categories } satisfies RuleFile, null, 2),
    {
      encoding: "utf8",
      mode: 0o600,
    },
  );
}

export async function setCollectorRule(bundleIdentifier: string, category: CollectorCategory): Promise<void> {
  const normalized = bundleIdentifier.trim();
  if (!normalized) throw new Error("Bundle identifier is required");
  const rules = await getCollectorRules();
  rules[normalized] = category;
  await writeRules(rules);
}

export async function removeCollectorRule(bundleIdentifier: string): Promise<void> {
  const rules = await getCollectorRules();
  delete rules[bundleIdentifier];
  await writeRules(rules);
}

export function usageForDay(summary: CollectorSummary | undefined, date = new Date()): CollectorApplication[] {
  if (!summary) return [];
  return Object.values(summary.days[localDayKey(date)] ?? {}).sort((left, right) => right.seconds - left.seconds);
}
