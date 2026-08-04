import { promises as fs } from "fs";
import { homedir } from "os";
import path from "path";

export type CollectorCategory = "writing" | "creating" | "consuming" | "other";

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

export function localDayKey(date = new Date()): string {
  return date.toLocaleDateString("en-CA");
}

export async function getCollectorSummary(): Promise<CollectorSummary | undefined> {
  const summaryPath = path.join(homedir(), ".writing-signal", "summary.json");
  try {
    const raw = await fs.readFile(summaryPath, "utf8");
    const parsed = JSON.parse(raw) as CollectorSummary;
    return parsed.schemaVersion === 1 ? parsed : undefined;
  } catch {
    return undefined;
  }
}

export function usageForDay(summary: CollectorSummary | undefined, date = new Date()): CollectorApplication[] {
  if (!summary) return [];
  return Object.values(summary.days[localDayKey(date)] ?? {}).sort((left, right) => right.seconds - left.seconds);
}
