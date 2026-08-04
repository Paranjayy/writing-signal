import { ACTIVITY_KINDS, ACTIVITY_LABELS, ActivityKind, DayStats, TokenCounts } from "./types";

export function formatNumber(value: number): string {
  return new Intl.NumberFormat().format(value);
}

export function formatDuration(milliseconds: number): string {
  const minutes = Math.floor(milliseconds / 60_000);
  const hours = Math.floor(minutes / 60);
  return hours > 0 ? `${hours}h ${minutes % 60}m` : `${minutes}m`;
}

export function formatActivityLabel(kind: ActivityKind): string {
  return ACTIVITY_LABELS[kind];
}

function activityRows(day: DayStats): string {
  return ACTIVITY_KINDS.map(
    (kind) => `| ${ACTIVITY_LABELS[kind]} | ${formatDuration(day.activityMillis[kind])} |`,
  ).join("\n");
}

export function tokenBreakdown(counts: TokenCounts): string {
  return [
    `Content words | ${formatNumber(counts.contentWords)}`,
    `Function words | ${formatNumber(counts.functionWords)}`,
    `Capitalized | ${formatNumber(counts.capitalizedWords)}`,
    `Long (8+ chars) | ${formatNumber(counts.longWords)}`,
    `Numbers | ${formatNumber(counts.numbers)}`,
    `URLs | ${formatNumber(counts.urls)}`,
    `Punctuation | ${formatNumber(counts.punctuation)}`,
    `Other symbols | ${formatNumber(counts.symbols)}`,
  ].join("\n");
}

export function dashboardMarkdown(
  today: DayStats,
  week: DayStats,
  activeTodayMilliseconds: number,
  activeWeekMilliseconds: number,
  activeKind?: ActivityKind,
): string {
  const activeTodayLabel = activeKind ? formatActivityLabel(activeKind) : "";
  return `# Writing Signal

Your private answer to “where did the time go?” Text is classified in memory and discarded; only totals below are retained.

## Today

| Measure | Total |
| --- | ---: |
| Words added | ${formatNumber(today.words)} |
| Characters added | ${formatNumber(today.characters)} |
| Intentional activity time | ${formatDuration(ACTIVITY_KINDS.reduce((total, kind) => total + today.activityMillis[kind], 0) + activeTodayMilliseconds)} |
| Snapshots | ${formatNumber(today.snapshots)} |

## Last 7 days

| Measure | Total |
| --- | ---: |
| Words added | ${formatNumber(week.words)} |
| Characters added | ${formatNumber(week.characters)} |
| Intentional activity time | ${formatDuration(ACTIVITY_KINDS.reduce((total, kind) => total + week.activityMillis[kind], 0) + activeWeekMilliseconds)} |
| Snapshots | ${formatNumber(week.snapshots)} |

## Time by intention (today)

| Mode | Time |
| --- | ---: |
${activityRows(today)}

## Word and text shape (today)

| Category | Count |
| --- | ---: |
| Content words | ${formatNumber(today.contentWords)} |
| Function words | ${formatNumber(today.functionWords)} |
| Capitalized words | ${formatNumber(today.capitalizedWords)} |
| Long words (8+ characters) | ${formatNumber(today.longWords)} |
| Numbers | ${formatNumber(today.numbers)} |
| URLs | ${formatNumber(today.urls)} |
| Punctuation | ${formatNumber(today.punctuation)} |
| Other symbols | ${formatNumber(today.symbols)} |

${activeTodayMilliseconds > 0 ? `> ${activeTodayLabel} timer is currently running.` : "> No activity timer is currently running."}
`;
}
