# Architecture

## System sketch

```text
Raycast commands
  ├─ explicit activity timer controls ──┐
  ├─ selected-text snapshot ───────────┼─> aggregate event service ─> encrypted local storage
  └─ current clipboard inspection ─────┘                                  │
                                                                       dashboard

Future opt-in native companion ─────────> same aggregate event service
```

## Data owned

The extension stores day-level aggregates, one active typed session, and capture baselines. It intentionally does not store raw text, raw word lists, or clipboard contents.

## Invariants

- Text is classified in memory and discarded before persistence.
- A snapshot adds only positive character/word deltas relative to its source baseline.
- Session time is user-directed, categorized as writing, creating, focused work, or consuming, and never inferred from global keyboard activity.
- Clipboard deletion is an explicit, confirmed operation.

## Future path

A native companion may provide system-wide activity only after explicit macOS permission and a visible indicator. It must emit aggregate events to this same core module, not raw key or clipboard streams.

Cross-device sync comes after the local event model is stable. The intended boundary is an end-to-end encrypted aggregate vault with an optional user passphrase; the sync provider must not receive text or a decryption key.

## Native collector bridge

`native/` is a macOS Swift companion that writes a minimal owner-only JSON summary for the Raycast extension. It tracks foreground app time by default and offers keyboard aggregates only behind a macOS Input Monitoring permission. It intentionally never records a key value, title, URL, or screenshot. The bridge is kept narrow so a future encrypted detailed-vault implementation can replace it without changing the extension UI contract.
