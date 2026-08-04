# Writing Signal native collector

This lightweight macOS companion records foreground-app time locally. It writes only a safe aggregate summary to `~/.writing-signal/summary.json`, which the Raycast extension can read. The directory is owner-only (`0700`) and the summary is owner-read/write (`0600`).

## Default mode

```bash
cd native
swift run writing-signal-tracker
```

Default mode records the active app, app bundle ID, a broad activity category, and duration. It does not record window titles, websites, screenshots, or typed content.

## Optional keyboard activity

```bash
swift run writing-signal-tracker --keyboard
```

This requires a macOS **Input Monitoring** permission prompt. It records only aggregate counts—key presses, separators, deletes, and estimated words—and never saves key values or text.

## Limits of this first companion

- It tracks while the process is running; a signed app plus user-approved launch agent is the next packaging step.
- The aggregate summary is designed for Raycast. The future detailed local vault and encrypted cross-device sync are separate work; this bridge contains only non-content totals.
