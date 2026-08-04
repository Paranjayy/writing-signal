# Portable Data Format

Writing Signal exports a versioned JSON snapshot for user-controlled migration between future clients. It contains aggregates and settings only: never raw writing, individual keystrokes, clipboard text, URL paths, page content, screenshots, or credentials.

## Plain export

```json
{
  "schemaVersion": 1,
  "exportedAt": "ISO-8601 timestamp",
  "writing": { "days": {} },
  "goals": {},
  "browser": { "activity": { "days": {} }, "rules": {} },
  "clipboardPatterns": { "days": {} },
  "collector": { "summary": {}, "rules": {} }
}
```

Raycast imports the portable `writing`, `goals`, `browser`, and `clipboardPatterns` sections as a merge. Native collector summary data is deliberately not imported while a companion may be writing it.

## Encrypted export

Encrypted exports wrap the exact plain JSON bytes in an AES-256-GCM envelope. The key is derived from a user-supplied passphrase with salted `scrypt`.

```json
{
  "schemaVersion": 1,
  "format": "writing-signal-encrypted-export",
  "cipher": "aes-256-gcm",
  "keyDerivation": "scrypt",
  "salt": "base64",
  "initializationVector": "base64",
  "authenticationTag": "base64",
  "ciphertext": "base64"
}
```

No client may upload, log, or retain the passphrase. A future sync transport must move this same encrypted envelope end-to-end, not unwrap it on a service.
