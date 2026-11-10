---
id: MPR-03
title: Secrets file helper (0600 in 0700, atomic writes, tighten/warn) and log redaction
module: providers
phase: phase:client
milestone: M1
blocked_by: [MPR-01, "Platform phase:scaffold (PLT-11)"]
parallel_with: [MPR-02, MPR-04]
unblocks: [MPR-05, MPR-06, MPR-08]
---

# MPR-03 — Secrets file

## Why
Keys only in the secrets file (16), readable only by the app user (17), never in logs, transcripts, errors or the event stream (18).

## Decisions
- File `${SCRIBA_BOOKS_DIR}/.scriba/secrets.yaml`, mode **0600** inside a **0700** directory. Writes are atomic: temp file, then rename, then mode check.
- On startup, create the directory and file with those modes if missing; if looser, **tighten and warn** (stdout).
- Entries keyed by opaque `keyRef`. API: `put(keyRef, key)`, `get(keyRef)` (in-process only, used by the client), `delete(keyRef)`, `hint(keyRef)` (last four characters), `has(keyRef)`.
- A reusable helper: any later module needing a secret reuses it rather than adding a second file.
- **Log redaction:** operational logs (stdout) redact the `Authorization` header and any key-shaped value (known keys and common key patterns, e.g. `sk-…`). Error messages produced by this module never include keys.

## Acceptance criteria
- [ ] A put creates the file 0600 in a 0700 directory; loosened modes are tightened on restart with a warning.
- [ ] Put/delete are atomic (no partial file after a simulated crash between write and rename).
- [ ] `hint` returns only the last four characters.
- [ ] A logged request carrying `Authorization: Bearer <key>` shows a redacted value on stdout.
