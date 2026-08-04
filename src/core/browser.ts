import { BrowserExtension, LocalStorage } from "@raycast/api";

const STORAGE_KEY = "writing-signal:browser-activity:v1";
const RULES_STORAGE_KEY = "writing-signal:browser-rules:v1";
const MAX_PULSE_GAP_MS = 2 * 60_000;

export type BrowserCategory = "writing" | "creating" | "consuming" | "other";

export type DomainUsage = { host: string; category: BrowserCategory; milliseconds: number };

export type BrowserState = {
  days: Record<string, Record<string, DomainUsage>>;
  previous?: { host: string; category: BrowserCategory; seenAt: string };
};

export type BrowserRules = { categoryByHost: Record<string, BrowserCategory>; excludedHosts: string[] };

function dayKey(date: Date): string {
  return date.toLocaleDateString("en-CA");
}

function categoryForHost(host: string): BrowserCategory {
  if (
    ["github.com", "docs.google.com", "notion.so", "figma.com", "linear.app", "stackoverflow.com"].some(
      (domain) => host === domain || host.endsWith(`.${domain}`),
    )
  ) {
    return "creating";
  }
  if (
    ["youtube.com", "netflix.com", "twitch.tv", "reddit.com", "x.com", "instagram.com", "tiktok.com"].some(
      (domain) => host === domain || host.endsWith(`.${domain}`),
    )
  ) {
    return "consuming";
  }
  if (
    ["medium.com", "substack.com", "wikipedia.org", "readwise.io"].some(
      (domain) => host === domain || host.endsWith(`.${domain}`),
    )
  ) {
    return "writing";
  }
  return "other";
}

async function getState(): Promise<BrowserState> {
  const raw = await LocalStorage.getItem<string>(STORAGE_KEY);
  if (!raw) return { days: {} };
  try {
    return JSON.parse(raw) as BrowserState;
  } catch {
    return { days: {} };
  }
}

async function saveState(state: BrowserState): Promise<void> {
  await LocalStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

async function getRules(): Promise<BrowserRules> {
  const raw = await LocalStorage.getItem<string>(RULES_STORAGE_KEY);
  if (!raw) return { categoryByHost: {}, excludedHosts: [] };
  try {
    const parsed = JSON.parse(raw) as Partial<BrowserRules>;
    return { categoryByHost: parsed.categoryByHost ?? {}, excludedHosts: parsed.excludedHosts ?? [] };
  } catch {
    return { categoryByHost: {}, excludedHosts: [] };
  }
}

async function saveRules(rules: BrowserRules): Promise<void> {
  await LocalStorage.setItem(RULES_STORAGE_KEY, JSON.stringify(rules));
}

export async function getBrowserRules(): Promise<BrowserRules> {
  return getRules();
}

export async function getBrowserExport(): Promise<{ activity: BrowserState; rules: BrowserRules }> {
  const [activity, rules] = await Promise.all([getState(), getRules()]);
  return { activity, rules };
}

export async function setBrowserCategory(host: string, category: BrowserCategory): Promise<void> {
  const normalized = normalizeHost(host);
  if (!normalized) throw new Error("Hostname is required");
  const rules = await getRules();
  rules.categoryByHost[normalized] = category;
  await saveRules(rules);
}

export async function removeBrowserCategory(host: string): Promise<void> {
  const rules = await getRules();
  delete rules.categoryByHost[normalizeHost(host)];
  await saveRules(rules);
}

export async function excludeBrowserHost(host: string): Promise<void> {
  const normalized = normalizeHost(host);
  if (!normalized) throw new Error("Hostname is required");
  const rules = await getRules();
  rules.excludedHosts = [...new Set([...rules.excludedHosts, normalized])].sort();
  await saveRules(rules);
}

export async function includeBrowserHost(host: string): Promise<void> {
  const rules = await getRules();
  rules.excludedHosts = rules.excludedHosts.filter((entry) => entry !== normalizeHost(host));
  await saveRules(rules);
}

function normalizeHost(host: string): string {
  return host
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .split("/")[0];
}

export async function recordBrowserPulse(now = new Date()): Promise<DomainUsage | undefined> {
  const tabs = await BrowserExtension.getTabs();
  const activeTab = tabs.find((tab) => tab.active && /^https?:/i.test(tab.url));
  if (!activeTab) return undefined;

  const host = normalizeHost(new URL(activeTab.url).hostname);
  const rules = await getRules();
  const state = await getState();
  const previous = state.previous;
  if (previous && !rules.excludedHosts.includes(previous.host)) {
    const previousDate = new Date(previous.seenAt);
    const milliseconds = Math.min(Math.max(0, now.getTime() - previousDate.getTime()), MAX_PULSE_GAP_MS);
    if (milliseconds > 0) {
      const key = dayKey(previousDate);
      const domains = state.days[key] ?? {};
      const usage = domains[previous.host] ?? { host: previous.host, category: previous.category, milliseconds: 0 };
      usage.milliseconds += milliseconds;
      domains[previous.host] = usage;
      state.days[key] = domains;
    }
  }
  if (rules.excludedHosts.includes(host)) {
    state.previous = undefined;
    await saveState(state);
    return undefined;
  }
  const category = rules.categoryByHost[host] ?? categoryForHost(host);
  state.previous = { host, category, seenAt: now.toISOString() };
  await saveState(state);
  return { host, category, milliseconds: 0 };
}

export async function getBrowserUsage(from: Date, through: Date): Promise<DomainUsage[]> {
  const state = await getState();
  const fromKey = dayKey(from);
  const throughKey = dayKey(through);
  const merged: Record<string, DomainUsage> = {};
  for (const [date, domains] of Object.entries(state.days)) {
    if (date < fromKey || date > throughKey) continue;
    for (const usage of Object.values(domains)) {
      const current = merged[usage.host];
      merged[usage.host] = current
        ? { ...current, milliseconds: current.milliseconds + usage.milliseconds }
        : { ...usage };
    }
  }
  return Object.values(merged).sort((left, right) => right.milliseconds - left.milliseconds);
}

export async function clearBrowserData(): Promise<void> {
  await Promise.all([LocalStorage.removeItem(STORAGE_KEY), LocalStorage.removeItem(RULES_STORAGE_KEY)]);
}
