# Writing Signal native collector

This lightweight macOS companion records foreground-app time locally. It writes only a safe aggregate summary to `~/.writing-signal/summary.json`, which the Raycast extension can read. The directory is owner-only (`0700`) and the summary is owner-read/write (`0600`).

## Default mode

```bash
cd native
swift run writing-signal-tracker
```

Default mode records the active app, app bundle ID, a broad activity category, and duration. It does not record window titles, websites, screenshots, or typed content.

The collector keeps a bounded 14-day local foreground-app timeline so Raycast can show the shape of a day. Each segment contains only app name, category, start time, and end time.

## Persistent background tracking

After building, install a user LaunchAgent explicitly:

```bash
swift run writing-signal-tracker --install
```

That copies the collector into your user Application Support folder and starts it automatically at login. App-time tracking starts immediately; keyboard aggregates remain disabled. To remove it later:

```bash
swift run writing-signal-tracker --uninstall
```

## Optional keyboard activity

```bash
swift run writing-signal-tracker --keyboard
```

This requires a macOS **Input Monitoring** permission prompt. It records only aggregate counts—key presses, separators, deletes, and estimated words—and never saves key values or text. The counts are attributed to the foreground app, so Raycast can show where the writing activity happened.

For persistent keyboard aggregates, include the same explicit option at install time:

```bash
swift run writing-signal-tracker --install --keyboard
```

## App rules

Use Raycast’s **Manage App Rules** command to override a bundle identifier’s broad category. Rules live in the same owner-only local directory and are applied immediately by the collector; no restart is needed.

Use **Manage Privacy Exclusions** for apps that must never be recorded at all. An excluded app contributes no app time or keyboard aggregates and is not shown as the current app.

## Limits of this first companion

- It tracks while the process is running; a signed app plus user-approved launch agent is the next packaging step.
- The aggregate summary is designed for Raycast. The future detailed local vault and encrypted cross-device sync are separate work; this bridge contains only non-content totals.
