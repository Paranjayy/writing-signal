import { Action, ActionPanel, Detail, Icon, LaunchType, launchCommand, openExtensionPreferences } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { getCollectorSummary, isCollectorLive, usageForDay } from "./core/collector";
import { getBrowserUsage } from "./core/browser";
import { aggregateClipboardHistory, getClipboardHistory } from "./core/clipboard-history";
import { getDailyReviewHour } from "./core/daily-review";
import { activeSessionMillisSince, aggregateDays, dayKey, getState } from "./core/storage";
import { dashboardMarkdown } from "./core/presentation";
import ActivityHistory from "./activity-history";
import ActivityTimeline from "./activity-timeline";
import AppRules from "./app-rules";
import BrowserExclusions from "./browser-exclusions";
import BrowserRules from "./browser-rules";
import BrowserTime from "./browser-time";
import ClipboardInsights from "./clipboard-insights";
import ClipboardPatterns from "./clipboard-patterns";
import CollectorSettings from "./collector-settings";
import CollectorSetup from "./collector-setup";
import CollectorStatus from "./collector-status";
import DailyReviewSettings from "./daily-review-settings";
import ExportData from "./export-data";
import ExportEncryptedData from "./export-encrypted-data";
import Goals from "./goals";
import ImportData from "./import-data";
import Insights from "./insights";
import KeyboardActivity from "./keyboard-activity";
import LiveTyping from "./live-typing";
import LogActivity from "./log-activity";
import PrivacyAndData from "./privacy-and-data";
import PrivacyExclusions from "./privacy-exclusions";
import ScreenTime from "./screen-time";
import StartActivityTimer from "./start-activity-timer";
import StartFocusBlock from "./start-focus-block";
import TrackingPause from "./tracking-pause";
import WeeklyReview from "./weekly-review";

export default function Dashboard() {
  const { data, isLoading, revalidate } = usePromise(async () => {
    const now = new Date();
    const [state, collector, browserUsage, clipboardHistory, dailyReviewHour] = await Promise.all([
      getState(),
      getCollectorSummary(),
      getBrowserUsage(now, now),
      getClipboardHistory(),
      getDailyReviewHour(),
    ]);
    return { state, collector, browserUsage, clipboardHistory, dailyReviewHour, now };
  });
  const state = data?.state;
  const collector = data?.collector;
  const now = data?.now ?? new Date();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - 6);

  const today = state ? aggregateDays(state, now, now) : undefined;
  const week = state ? aggregateDays(state, weekStart, now) : undefined;
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  const activeTodayMilliseconds = state ? activeSessionMillisSince(state, todayStart, now) : 0;
  const activeWeekMilliseconds = state ? activeSessionMillisSince(state, weekStart, now) : 0;

  return (
    <Detail
      isLoading={isLoading}
      navigationTitle="Writing Signal"
      markdown={
        today && week
          ? dashboardMarkdown(
              today,
              week,
              activeTodayMilliseconds,
              activeWeekMilliseconds,
              state?.activeSession?.kind,
              state?.activeSession?.plannedEndAt,
              usageForDay(collector),
              collector?.keyboardByDay[dayKey(now)],
              data?.browserUsage,
              data ? aggregateClipboardHistory(data.clipboardHistory, now, now) : undefined,
            )
          : "# Writing Signal"
      }
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Data" text="Local encrypted Raycast storage" />
          <Detail.Metadata.Label title="Selected text" text="Never retained" />
          <Detail.Metadata.Label
            title="Automatic tracking"
            text={
              isCollectorLive(collector)
                ? "Native companion active"
                : collector
                  ? "Last collector data is stale"
                  : "Not connected"
            }
          />
          <Detail.Metadata.Label title="Today" text={dayKey(now)} />
          <Detail.Metadata.Label
            title="Daily check-in"
            text={data?.dailyReviewHour === undefined ? "Off" : `${data.dailyReviewHour}:00 local time`}
          />
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <Action title="Refresh Dashboard" icon={Icon.ArrowClockwise} onAction={revalidate} />
          <ActionPanel.Section title="Now">
            <Action.Push title="Live Typing Pace" icon={Icon.Gauge} target={<LiveTyping />} />
            <Action.Push title="Start Activity Timer" icon={Icon.Clock} target={<StartActivityTimer />} />
            <Action.Push title="Start Focus Block" icon={Icon.Stopwatch} target={<StartFocusBlock />} />
            <Action.Push title="Log Past Activity" icon={Icon.Plus} target={<LogActivity />} />
            <Action
              title="Stop Intentional Timer"
              icon={Icon.Stop}
              onAction={() => launchCommand({ name: "stop-writing-session", type: LaunchType.UserInitiated })}
            />
          </ActionPanel.Section>
          <ActionPanel.Section title="See your patterns">
            <Action.Push title="Personal Activity Insights" icon={Icon.LightBulb} target={<Insights />} />
            <Action.Push title="Weekly Review" icon={Icon.Calendar} target={<WeeklyReview />} />
            <Action.Push title="Automatic Screen Time" icon={Icon.BarChart} target={<ScreenTime />} />
            <Action.Push title="Activity Timeline" icon={Icon.List} target={<ActivityTimeline />} />
            <Action.Push title="Activity History" icon={Icon.Clock} target={<ActivityHistory />} />
            <Action.Push title="Keyboard Activity" icon={Icon.Keyboard} target={<KeyboardActivity />} />
            <Action.Push title="Browser Time" icon={Icon.Globe} target={<BrowserTime />} />
            <Action.Push title="Clipboard Patterns" icon={Icon.Clipboard} target={<ClipboardPatterns />} />
            <Action.Push title="Inspect Current Clipboard" icon={Icon.MagnifyingGlass} target={<ClipboardInsights />} />
          </ActionPanel.Section>
          <ActionPanel.Section title="Set it up and protect it">
            <Action.Push title="Set up Automatic Tracking" icon={Icon.Gear} target={<CollectorSetup />} />
            <Action.Push title="Collector Status" icon={Icon.Heartbeat} target={<CollectorStatus />} />
            <Action.Push title="Pause Automatic Tracking" icon={Icon.Pause} target={<TrackingPause />} />
            <Action.Push title="Daily Goals" icon={Icon.BullsEye} target={<Goals />} />
            <Action.Push title="Daily Check-In Settings" icon={Icon.Bell} target={<DailyReviewSettings />} />
            <Action.Push title="App Rules" icon={Icon.Pencil} target={<AppRules />} />
            <Action.Push title="Browser Rules" icon={Icon.Pencil} target={<BrowserRules />} />
            <Action.Push title="Privacy Exclusions" icon={Icon.EyeDisabled} target={<PrivacyExclusions />} />
            <Action.Push title="Browser Exclusions" icon={Icon.EyeDisabled} target={<BrowserExclusions />} />
            <Action.Push title="Automatic Tracking Settings" icon={Icon.Gear} target={<CollectorSettings />} />
            <Action.Push title="Privacy & Data" icon={Icon.Lock} target={<PrivacyAndData />} />
          </ActionPanel.Section>
          <ActionPanel.Section title="Your portable data">
            <Action.Push title="Export Local Data" icon={Icon.Download} target={<ExportData />} />
            <Action.Push title="Create Encrypted Export" icon={Icon.Lock} target={<ExportEncryptedData />} />
            <Action.Push title="Import Local Data" icon={Icon.Upload} target={<ImportData />} />
          </ActionPanel.Section>
          <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
        </ActionPanel>
      }
    />
  );
}
