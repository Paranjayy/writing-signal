export type TokenCounts = {
  words: number;
  characters: number;
  functionWords: number;
  contentWords: number;
  capitalizedWords: number;
  longWords: number;
  numbers: number;
  urls: number;
  punctuation: number;
  symbols: number;
};

export type DayStats = TokenCounts & {
  snapshots: number;
  activityMillis: Record<ActivityKind, number>;
};

export type CaptureBaseline = TokenCounts;

export const ACTIVITY_KINDS = ["writing", "creating", "focus", "consuming"] as const;
export type ActivityKind = (typeof ACTIVITY_KINDS)[number];

export const ACTIVITY_LABELS: Record<ActivityKind, string> = {
  writing: "Writing",
  creating: "Creating",
  focus: "Focused work",
  consuming: "Watching / consuming",
};

export type ActiveSession = {
  startedAt: string;
  kind: ActivityKind;
  plannedEndAt?: string;
};

export type WritingState = {
  days: Record<string, DayStats>;
  baseline?: CaptureBaseline;
  activeSession?: ActiveSession;
};
