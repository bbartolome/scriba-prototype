---
id: PLT-17
title: Dispenser script and first install
module: platform
phase: phase:installer
milestone: M1 (release track)
blocked_by: [PLT-16]
parallel_with: ["wave-1 modules"]
unblocks: [PLT-18]
---

# PLT-17 — Dispenser and first install

## Why
Install with one pasted command, no clone/build/YAML (story 1); fail fast on missing prerequisites (story 2); library and `.scriba/` created (story 3); container runs as the author's UID/GID (story 4); wait for healthy and print the setup URL (story 5).

## Decisions
- **Dispenser:** `docker run --rm -e SETUP=true bbartolome/scriba | bash`, modelled on Tride's dispenser. Replaces PLT-14's entrypoint stub.
  - The printed script pins the image ref it came from.
  - Interactive answers are read from `/dev/tty` (stdin is the pipe).
  - It extracts the `deploy/` files by running the same image with `tar` over `/opt/installer`.
  - Nothing but the script ever goes to the dispenser's stdout.
- **Install folder** is the folder the one-liner runs in. Docs recommend a dedicated folder outside the library, so `.secret` is never readable by the app through the library mount.
- **First install** (no `.env` present):
  1. Check Docker and Compose v2 — abort before writing anything if missing.
  2. Extract the `deploy/` files.
  3. Ask for the library path (default `~/Books`) and port (default 8080), or use the defaults with no TTY.
  4. Create the library and its `.scriba/` folder, owned by the user.
  5. Write `.env` (`SCRIBA_LIBRARY`, `SCRIBA_UID`/`SCRIBA_GID` from `id -u`/`id -g`, `SCRIBA_PORT`, `SCRIBA_IMAGE_TAG`, `SCRIBA_COMPOSE_VERSION`), the compose file, and an optional `.secret` (mode 0600).
  6. `docker compose up -d`.
  7. Wait for healthy, with a timeout and a pointer to `docker compose logs` on failure.
  8. Print the setup URL from `<library>/.scriba/setup-url` (written by Setup & auth); until it exists, print the loopback URL.
  9. Print a hint: Ollama with `OLLAMA_CONTEXT_LENGTH` ≥ 64000, plus the Linux host-binding note from ST-3, which is the text of `/opt/installer/installer-hint.txt` in the image (source `deploy/installer-hint.txt`, written by PLT-16).
- **Tests:** Vitest drives the emitted script in a temp `HOME` with a stub `docker` on `PATH` that records its calls and serves the `tar` extraction.

## Acceptance criteria
- [x] On a clean machine (stubbed), the one-liner checks Docker and Compose v2, creates `~/Books/.scriba/`, writes `.env` (host UID/GID), the compose file and an optional `.secret` (0600), starts the stack, waits for healthy and prints the setup URL; falls back to the loopback URL if `setup-url` isn't there yet.
- [x] With no TTY, first install uses defaults without prompting.
- [x] Nothing but the script goes to the dispenser's stdout (`bash -n` passes on it).
- [x] A missing Docker or Compose v2 aborts before anything is written.
- [x] A health timeout exits non-zero and points to `docker compose logs`.
