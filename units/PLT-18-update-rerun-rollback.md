---
id: PLT-18
title: Re-run/update with backup and merge, override handling, fast path and rollback docs
module: platform
phase: phase:installer
milestone: M1 (release track)
blocked_by: [PLT-17]
parallel_with: ["wave-1 modules"]
unblocks: [PLT-19]
---

# PLT-18 — Update, re-run and rollback

Merging this (with PLT-17) **closes `phase:installer`**.

## Why
Update by re-running the same command (story 14), with backups (story 15), keeping existing settings (story 16), keeping compose tweaks in an override (story 17); `docker compose pull && up -d` as a fast path (story 18); pin and roll back (story 19).

## Decisions
- **Re-run / update** (`.env` present), non-interactive:
  1. Back up `.env` and the compose file with a timestamp.
  2. Merge `.env` keys add-missing/keep-existing.
  3. Replace the compose file with the new version (local edits belong in `compose.override.yaml`, never written by the installer).
  4. Stamp the new `SCRIBA_COMPOSE_VERSION`.
  5. `docker compose pull` and `up -d`, wait for healthy, print the URL.
  6. Idempotent; never clobbers config.
- **Fast path:** `docker compose pull && docker compose up -d` covers image-only releases.
- **Rollback:** set `SCRIBA_IMAGE_TAG` to the previous tag, `up -d`, restore the backups.
- Both documented (README / `deploy/` docs). No auto-update and no "update available" notice in v1.
- README security note: the app controls tailscaled through the shared socket (accepted for a single owner).

## Acceptance criteria
- [x] On re-run with `.env` present, nothing prompts. `.env` and the compose file are backed up with a timestamp. Existing `.env` values are kept, new keys added, `SCRIBA_COMPOSE_VERSION` updated, `compose.override.yaml` untouched.
- [x] Running the re-run twice in a row changes nothing beyond new backups.
- [x] Setting `SCRIBA_IMAGE_TAG` to an older tag and running `up -d` rolls back; documented with the backup restore.

## Demo (under 5 minutes)
1. In an empty folder, `docker run --rm -e SETUP=true bbartolome/scriba | bash`, accept defaults, watch it print the setup URL.
2. Open the URL on the Mac; show `~/Books/.scriba/` and file ownership.
3. Re-run the one-liner: silent; show the backups and the unchanged `.env`.
4. `docker compose ps` shows both services healthy.
