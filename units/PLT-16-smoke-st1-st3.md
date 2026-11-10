---
id: PLT-16
title: ST-1 to ST-3 runbook, manual runs, Serve-mechanism ADR
module: platform
phase: phase:smoke
milestone: M1 (release track)
blocked_by: [PLT-15]
parallel_with: [PLT-13, "wave-1 modules"]
unblocks: [PLT-17, "Setup & auth tailnet gate (SAU-21)"]
---

# PLT-16 — Smoke tests ST-1 to ST-3

Merging this **closes `phase:smoke`**. Setup & auth's Tailscale phase needs ST-1's outcome (Serve configured by shipped config file vs CLI loop).

## Why
Tailnet and host-network behaviour is verified on real hardware before releases that touch deployment (story 48), and ST-1's outcome is recorded so nobody re-litigates it (story 49).

## Decisions
- Manual, pre-release checklist items on real hardware and a real tailnet. Runbook in `deploy/`; outcomes in `docs/adr/`.
- **ST-1, late login with HTTPS Serve:** start compose with no auth key, app healthy on loopback; log in later via the auth URL (LocalAPI status or `docker compose logs`); within a minute `https://scriba.<tailnet>.ts.net` serves the app with a valid certificate, and still does after `docker compose restart` and a host reboot; `http://scriba` and `http://<100.x>:8080` both fail. Run with `TS_SERVE_CONFIG` first; if it fails, run the CLI loop. **The variant that passes ships**, recorded in an ADR, compose updated to match. Record the peer addresses seen on the Serve and loopback-publish paths (validates PLT-08).
- **ST-2, SSE unbuffered through Serve:** over the tailnet URL, `POST /api/platform/echo` with 10 events 1 s apart; each `platform/echo` arrives on `/events` within ~250 ms of its `sentAt`, over HTTP/2.
- **ST-3, host Ollama:** on a Mac (Docker Desktop) and Linux (Docker Engine), `GET http://host.docker.internal:11434/v1/models` from inside `scriba` returns 200. Linux needs Ollama bound beyond `127.0.0.1` (e.g. `OLLAMA_HOST` set to the bridge or `0.0.0.0`); recorded as installer and setup guidance (Model providers relies on this).
- **ST-4, userspace mode:** deferred; the runbook names it as such.

## Acceptance criteria
- [ ] ST-1 passes for one Serve variant, compose ships that variant, and the ADR records both attempts and the result.
- [ ] ST-1's extra checks pass: `http://scriba` and `http://<100.x>:8080` are refused from another tailnet device.
- [ ] ST-2 passes: echo envelopes arrive unbatched over the tailnet URL.
- [ ] ST-3 passes on a Mac and on Linux, and the Linux host-binding requirement is written into the installer hint text (consumed by PLT-17) and the setup guidance.
- [ ] The runbook names ST-4 as deferred.
