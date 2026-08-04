import { LocalStorage } from "@raycast/api";

const STORAGE_KEY = "writing-signal:goals:v1";

export type Goals = {
  dailyWords: number;
  dailyFocusMinutes: number;
  dailyCreatingMinutes: number;
  dailyConsumingLimitMinutes: number;
};

export const DEFAULT_GOALS: Goals = {
  dailyWords: 0,
  dailyFocusMinutes: 0,
  dailyCreatingMinutes: 0,
  dailyConsumingLimitMinutes: 0,
};

function nonNegativeNumber(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 ? Math.floor(value) : 0;
}

export async function getGoals(): Promise<Goals> {
  const raw = await LocalStorage.getItem<string>(STORAGE_KEY);
  if (!raw) return DEFAULT_GOALS;
  try {
    const parsed = JSON.parse(raw) as Partial<Goals>;
    return {
      dailyWords: nonNegativeNumber(parsed.dailyWords),
      dailyFocusMinutes: nonNegativeNumber(parsed.dailyFocusMinutes),
      dailyCreatingMinutes: nonNegativeNumber(parsed.dailyCreatingMinutes),
      dailyConsumingLimitMinutes: nonNegativeNumber(parsed.dailyConsumingLimitMinutes),
    };
  } catch {
    return DEFAULT_GOALS;
  }
}

export async function saveGoals(goals: Goals): Promise<void> {
  await LocalStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      dailyWords: nonNegativeNumber(goals.dailyWords),
      dailyFocusMinutes: nonNegativeNumber(goals.dailyFocusMinutes),
      dailyCreatingMinutes: nonNegativeNumber(goals.dailyCreatingMinutes),
      dailyConsumingLimitMinutes: nonNegativeNumber(goals.dailyConsumingLimitMinutes),
    } satisfies Goals),
  );
}

export async function clearGoals(): Promise<void> {
  await LocalStorage.removeItem(STORAGE_KEY);
}
