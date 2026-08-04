# Writing Signal

A local-first Raycast prototype for understanding writing effort without retaining your words.

## What works now

- Start and stop intentional writing, creating, focused-work, or consuming sessions.
- Backfill time in a couple of keystrokes when you only realize later that it disappeared.
- Capture selected text from the frontmost app. The extension stores only aggregate deltas (words, characters, and token types), never the selected text.
- View daily and weekly time totals, activity modes, and simple token categories.
- Keep a glanceable current-app and daily-total readout in the Raycast menu bar.
- Optionally track active browser hostnames in Raycast background refresh; URL paths and page content are discarded.
- Inspect the current clipboard's shape and explicitly clear the clipboard.
- Set optional daily writing, focus, and creating targets; they are progress cues, not streaks.
- Export a portable local JSON snapshot to an owner-only file in `Documents/Writing Signal Backups`.
- Optionally create a passphrase-encrypted AES-256-GCM backup; its passphrase is never stored.
- Tune the native collector's local idle threshold, so inactive time does not get counted as screen time.

## Important boundaries

Raycast does not provide a safe always-on system-wide typing stream. This first slice therefore uses explicit snapshots and intentional timers. A future native companion can feed the same aggregate event contract only after an explicit, highly visible permission/onboarding flow.

Raycast's local storage is encrypted at rest, so the MVP does not offer a pretend “unencrypted” switch. The local JSON export deliberately remains inspectable for portability; it includes aggregate app/hostname activity and should be treated as private. Multi-device sync is deliberately deferred until it can be designed around an end-to-end encrypted vault and optional passphrase—not a cloud copy of your activity data.

## Run locally

```bash
npm install
npm run dev
```

Open the Raycast development extension and use **Start Writing Session**, **Capture Writing Snapshot**, and **Open Writing Dashboard**.

## Privacy model

- No analytics, sync, or network requests.
- No raw clipboard or writing contents are persisted.
- Local data is stored in the extension's encrypted Raycast storage.
- **Purge Clipboard** clears only the currently exposed clipboard, after confirmation.

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for the data model and future-client boundary.
