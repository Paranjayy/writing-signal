import { LocalStorage } from "@raycast/api";
import { emptyCounts, positiveDelta } from "./classify";
import { ACTIVITY_KINDS, ActivityKind, DayStats, TokenCounts, WritingState } from "./types";

const STORAGE_KEY = "writing-signal:state:v1";

export function dayKey(date: Date): string {
  return date.toLocaleDateString("en-CA");
}

function emptyDay(): DayStats {
  return {
    ...emptyCounts(),
    snapshots: 0,
    activityMillis: { writing: 0, creating: 0, focus: 0, consuming: 0 },
  };
}

function normalizeDay(input: Partial<DayStats> & { writingMillis?: number }): DayStats {
  const day = emptyDay();
  for (const key of Object.keys(emptyCounts()) as (keyof TokenCounts)[]) day[key] = input[key] ?? 0;
  day.snapshots = input.snapshots ?? 0;
  for (const kind of ACTIVITY_KINDS) day.activityMillis[kind] = input.activityMillis?.[kind] ?? 0;
  // v1 stored only writing time. Preserve it when loading existing local data.
  day.activityMillis.writing += input.writingMillis ?? 0;
  return day;
}

function normalizeState(input: unknown): WritingState {
  if (!input || typeof input !== "object") return { days: {} };
  const raw = input as {
    days?: Record<string, Partial<DayStats> & { writingMillis?: number }>;
    baseline?: TokenCounts;
    activeSessionStartedAt?: string;
    activeSession?: WritingState["activeSession"];
  };
  return {
    days: Object.fromEntries(Object.entries(raw.days ?? {}).map(([key, day]) => [key, normalizeDay(day)])),
    baseline: raw.baseline,
    activeSession:
      raw.activeSession ??
      (raw.activeSessionStartedAt ? { startedAt: raw.activeSessionStartedAt, kind: "writing" } : undefined),
  };
}

export async function getState(): Promise<WritingState> {
  const raw = await LocalStorage.getItem<string>(STORAGE_KEY);
  if (!raw) return { days: {} };
  try {
    return normalizeState(JSON.parse(raw));
  } catch {
    return { days: {} };
  }
}

async function saveState(state: WritingState): Promise<void> {
  await LocalStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function addCounts(day: DayStats, counts: TokenCounts): void {
  for (const [key, value] of Object.entries(counts)) {
    day[key as keyof TokenCounts] += value;
  }
}

export async function recordSnapshot(counts: TokenCounts): Promise<TokenCounts> {
  const state = await getState();
  const delta = positiveDelta(counts, state.baseline ?? emptyCounts());
  state.baseline = counts;

  const key = dayKey(new Date());
  const day = state.days[key] ?? emptyDay();
  addCounts(day, delta);
  day.snapshots += 1;
  state.days[key] = day;
  await saveState(state);
  return delta;
}

export async function startActivitySession(kind: ActivityKind, plannedEndAt?: Date): Promise<boolean> {
  const state = await getState();
  if (state.activeSession) return false;
  state.activeSession = {
    startedAt: new Date().toISOString(),
    kind,
    plannedEndAt: plannedEndAt && plannedEndAt > new Date() ? plannedEndAt.toISOString() : undefined,
  };
  await saveState(state);
  return true;
}

export async function stopActivitySession(
  end = new Date(),
): Promise<{ duration: number; kind: ActivityKind } | undefined> {
  const state = await getState();
  if (!state.activeSession) return undefined;

  const { kind } = state.activeSession;
  const start = new Date(state.activeSession.startedAt);
  if (end <= start) return undefined;
  let cursor = start;
  while (cursor < end) {
    const nextMidnight = new Date(cursor);
    nextMidnight.setHours(24, 0, 0, 0);
    const segmentEnd = nextMidnight < end ? nextMidnight : end;
    const key = dayKey(cursor);
    const day = state.days[key] ?? emptyDay();
    day.activityMillis[kind] += segmentEnd.getTime() - cursor.getTime();
    state.days[key] = day;
    cursor = segmentEnd;
  }

  state.activeSession = undefined;
  await saveState(state);
  return { duration: end.getTime() - start.getTime(), kind };
}

export async function stopActivitySessionIfDue(
  now = new Date(),
): Promise<{ duration: number; kind: ActivityKind } | undefined> {
  const state = await getState();
  const plannedEndAt = state.activeSession?.plannedEndAt ? new Date(state.activeSession.plannedEndAt) : undefined;
  if (!plannedEndAt || plannedEndAt > now) return undefined;
  return stopActivitySession(plannedEndAt);
}

export async function recordActivity(kind: ActivityKind, durationMillis: number, date: Date): Promise<void> {
  const state = await getState();
  const key = dayKey(date);
  const day = state.days[key] ?? emptyDay();
  day.activityMillis[kind] += durationMillis;
  state.days[key] = day;
  await saveState(state);
}

export function aggregateDays(state: WritingState, from: Date, through: Date): DayStats {
  const total = emptyDay();
  for (const [key, day] of Object.entries(state.days)) {
    if (key >= dayKey(from) && key <= dayKey(through)) {
      addCounts(total, day);
      total.snapshots += day.snapshots;
      for (const kind of ACTIVITY_KINDS) total.activityMillis[kind] += day.activityMillis[kind];
    }
  }
  return total;
}

export function activeSessionMillisSince(state: WritingState, since: Date, now = new Date()): number {
  if (!state.activeSession) return 0;
  const start = new Date(state.activeSession.startedAt);
  const plannedEnd = state.activeSession.plannedEndAt ? new Date(state.activeSession.plannedEndAt) : now;
  const end = plannedEnd < now ? plannedEnd : now;
  return Math.max(0, end.getTime() - Math.max(start.getTime(), since.getTime()));
}

export function totalActivityMillis(day: DayStats): number {
  return ACTIVITY_KINDS.reduce((total, kind) => total + day.activityMillis[kind], 0);
}

export async function clearAllData(): Promise<void> {
  await LocalStorage.removeItem(STORAGE_KEY);
}
