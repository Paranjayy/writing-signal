import { Clipboard, LocalStorage } from "@raycast/api";
import { createHmac, randomBytes } from "crypto";
import { classifyText, emptyCounts } from "./classify";
import { TokenCounts } from "./types";

const STORAGE_KEY = "writing-signal:clipboard-patterns:v1";
const SECRET_KEY = "writing-signal:clipboard-pattern-key:v1";

export type ClipboardDay = TokenCounts & { copies: number };

type ClipboardHistoryState = {
  days: Record<string, ClipboardDay>;
  lastFingerprint?: string;
};

function dayKey(date = new Date()): string {
  return date.toLocaleDateString("en-CA");
}

function emptyDay(): ClipboardDay {
  return { ...emptyCounts(), copies: 0 };
}

async function fingerprint(text: string): Promise<string> {
  let key = await LocalStorage.getItem<string>(SECRET_KEY);
  if (!key) {
    key = randomBytes(32).toString("base64");
    await LocalStorage.setItem(SECRET_KEY, key);
  }
  return createHmac("sha256", key).update(text, "utf8").digest("base64");
}

export async function getClipboardHistory(): Promise<ClipboardHistoryState> {
  const raw = await LocalStorage.getItem<string>(STORAGE_KEY);
  if (!raw) return { days: {} };
  try {
    const parsed = JSON.parse(raw) as Partial<ClipboardHistoryState>;
    const days = Object.fromEntries(
      Object.entries(parsed.days ?? {}).map(([key, value]) => {
        const input = value as Partial<ClipboardDay>;
        const day = emptyDay();
        for (const countKey of Object.keys(emptyCounts()) as (keyof TokenCounts)[]) {
          day[countKey] = typeof input[countKey] === "number" ? (input[countKey] ?? 0) : 0;
        }
        day.copies = typeof input.copies === "number" ? input.copies : 0;
        return [key, day];
      }),
    );
    return { days, lastFingerprint: parsed.lastFingerprint };
  } catch {
    return { days: {} };
  }
}

function addCounts(day: ClipboardDay, counts: TokenCounts): void {
  for (const [key, value] of Object.entries(counts)) day[key as keyof TokenCounts] += value;
}

export async function recordClipboardPulse(): Promise<ClipboardDay | undefined> {
  const text = await Clipboard.readText();
  if (!text) return undefined;
  const [state, nextFingerprint] = await Promise.all([getClipboardHistory(), fingerprint(text)]);
  if (state.lastFingerprint === nextFingerprint) return undefined;
  const key = dayKey();
  const day = state.days[key] ?? emptyDay();
  day.copies += 1;
  addCounts(day, classifyText(text));
  state.days[key] = day;
  state.lastFingerprint = nextFingerprint;
  await LocalStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  return day;
}

export function aggregateClipboardHistory(state: ClipboardHistoryState, from: Date, through: Date): ClipboardDay {
  const total = emptyDay();
  const fromKey = dayKey(from);
  const throughKey = dayKey(through);
  for (const [key, day] of Object.entries(state.days)) {
    if (key < fromKey || key > throughKey) continue;
    total.copies += day.copies;
    addCounts(total, day);
  }
  return total;
}

export async function clearClipboardHistory(): Promise<void> {
  await Promise.all([LocalStorage.removeItem(STORAGE_KEY), LocalStorage.removeItem(SECRET_KEY)]);
}

export async function getClipboardPatternExport(): Promise<{ days: Record<string, ClipboardDay> }> {
  const state = await getClipboardHistory();
  return { days: state.days };
}
