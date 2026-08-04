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

export type CollectorSegment = {
  application: { name: string; bundleIdentifier: string; category: CollectorCategory };
  startedAt: string;
  endedAt: string;
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
  currentSegmentStartedAt?: string;
  days: Record<string, Record<string, CollectorApplication>>;
  segmentsByDay?: Record<string, CollectorSegment[]>;
  keyboardByDay: Record<string, CollectorKeyboardSummary>;
  keyboardByDayAndApplication?: Record<string, Record<string, CollectorKeyboardSummary>>;
};

const COLLECTOR_STALE_AFTER_MILLISECONDS = 15_000;

type RuleFile = {
  schemaVersion: 1;
  categories: Record<string, CollectorCategory>;
  excludedBundleIdentifiers?: string[];
  idleAfterSeconds?: number;
  pausedUntil?: string;
  retentionDays?: number;
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

export function isCollectorLive(summary: CollectorSummary | undefined, now = new Date()): boolean {
  if (!summary?.isTracking) return false;
  const generatedAt = new Date(summary.generatedAt).getTime();
  return (
    Number.isFinite(generatedAt) &&
    now.getTime() - generatedAt >= 0 &&
    now.getTime() - generatedAt < COLLECTOR_STALE_AFTER_MILLISECONDS
  );
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
          idleAfterSeconds:
            typeof parsed.idleAfterSeconds === "number" && Number.isFinite(parsed.idleAfterSeconds)
              ? Math.max(15, Math.floor(parsed.idleAfterSeconds))
              : undefined,
          pausedUntil:
            typeof parsed.pausedUntil === "string" && Number.isFinite(new Date(parsed.pausedUntil).getTime())
              ? parsed.pausedUntil
              : undefined,
          retentionDays:
            typeof parsed.retentionDays === "number" &&
            Number.isFinite(parsed.retentionDays) &&
            parsed.retentionDays >= 7
              ? Math.floor(parsed.retentionDays)
              : undefined,
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

export async function getCollectorIdleAfterSeconds(): Promise<number | undefined> {
  return (await getRuleFile()).idleAfterSeconds;
}

export async function setCollectorIdleAfterSeconds(seconds: number): Promise<void> {
  if (!Number.isFinite(seconds) || seconds < 15) throw new Error("Idle threshold must be at least 15 seconds");
  const rules = await getRuleFile();
  rules.idleAfterSeconds = Math.floor(seconds);
  await writeRules(rules);
}

export async function getCollectorPausedUntil(): Promise<Date | undefined> {
  const value = (await getRuleFile()).pausedUntil;
  if (!value) return undefined;
  const date = new Date(value);
  return date > new Date() ? date : undefined;
}

export async function setCollectorPausedUntil(until: Date | undefined): Promise<void> {
  const rules = await getRuleFile();
  rules.pausedUntil = until && until > new Date() ? until.toISOString() : undefined;
  await writeRules(rules);
}

export async function getCollectorRetentionDays(): Promise<number | undefined> {
  return (await getRuleFile()).retentionDays;
}

export async function setCollectorRetentionDays(days: number | undefined): Promise<void> {
  if (days !== undefined && (!Number.isFinite(days) || days < 7)) {
    throw new Error("Retention must be at least 7 days");
  }
  const rules = await getRuleFile();
  rules.retentionDays = days === undefined ? undefined : Math.floor(days);
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

export function segmentsForDay(summary: CollectorSummary | undefined, date = new Date()): CollectorSegment[] {
  if (!summary) return [];
  const key = localDayKey(date);
  const segments = [...(summary.segmentsByDay?.[key] ?? [])];
  if (
    summary.activeApplication &&
    summary.currentSegmentStartedAt &&
    localDayKey(new Date(summary.currentSegmentStartedAt)) === key
  ) {
    segments.push({
      application: summary.activeApplication,
      startedAt: summary.currentSegmentStartedAt,
      endedAt: new Date().toISOString(),
    });
  }
  return segments.sort((left, right) => new Date(right.startedAt).getTime() - new Date(left.startedAt).getTime());
}
