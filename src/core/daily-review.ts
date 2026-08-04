import { LocalStorage } from "@raycast/api";

const HOUR_KEY = "writing-signal:daily-review-hour:v1";
const LAST_SENT_KEY = "writing-signal:daily-review-last-sent:v1";

function dayKey(date = new Date()): string {
  return date.toLocaleDateString("en-CA");
}

export async function getDailyReviewHour(): Promise<number | undefined> {
  const value = await LocalStorage.getItem<string>(HOUR_KEY);
  const hour = Number(value);
  return Number.isInteger(hour) && hour >= 0 && hour <= 23 ? hour : undefined;
}

export async function setDailyReviewHour(hour: number | undefined): Promise<void> {
  if (hour === undefined) await LocalStorage.removeItem(HOUR_KEY);
  else await LocalStorage.setItem(HOUR_KEY, String(hour));
}

export async function shouldSendDailyReview(now = new Date()): Promise<boolean> {
  const hour = await getDailyReviewHour();
  if (hour === undefined || now.getHours() !== hour) return false;
  return (await LocalStorage.getItem<string>(LAST_SENT_KEY)) !== dayKey(now);
}

export async function markDailyReviewSent(now = new Date()): Promise<void> {
  await LocalStorage.setItem(LAST_SENT_KEY, dayKey(now));
}
