---
id: PLT-15
title: deploy/ compose with tailscale sidecar, shared socket and healthcheck
module: platform
phase: phase:image-compose
milestone: M1 (release track)
blocked_by: [PLT-14]
parallel_with: [PLT-13, "wave-1 modules"]
unblocks: [PLT-16, "Setup & auth phase that consumes the LocalAPI socket"]
---

# PLT-15 — Compose

Merging this (with PLT-14) **closes `phase:image-compose`**. Setup & auth's Tailscale phase consumes the shared LocalAPI socket volume and `SCRIBA_TS_SOCKET` from here.

## Why
Always reachable at `http://127.0.0.1:${SCRIBA_PORT}` (story 6), never on the LAN (story 7), optional tailnet login without an auth key (story 8), host Ollama at `host.docker.internal:11434` (story 11), auto-restart (story 24), LocalAPI socket shared and readable by the app UID (story 50), compose versions available to the app (story 51).

## Decisions
- Services `tailscale` and `scriba`; `scriba` uses `network_mode: service:tailscale`.
- **`tailscale`:** kernel mode (`TS_USERSPACE=false`, `/dev/net/tun`, `NET_ADMIN`); `TS_HOSTNAME=scriba`; `TS_STATE_DIR` on a named state volume; `env_file: .secret` (optional `TS_AUTHKEY`; without it login is interactive); `TS_SOCKET=/var/run/tailscale/tailscaled.sock`; `extra_hosts: ["host.docker.internal:host-gateway"]` (shared namespace shares `/etc/hosts`); the loopback publish `127.0.0.1:${SCRIBA_PORT:-8080}:8080`.
- **Serve:** ship the candidate `TS_SERVE_CONFIG` pointing at a shipped Serve config with a `${TS_CERT_DOMAIN}:443` HTTPS handler proxying to `http://127.0.0.1:8080`. The fallback (CLI loop: run containerboot, wait indefinitely for an IP, then `tailscale serve --bg --https=443 http://127.0.0.1:8080`) is decided by ST-1 in PLT-16. Unlike Tride: no 60-second give-up, no `--http=80` handler.
- **Shared socket volume** mounted at `/var/run/tailscale` in both services; the app's non-root UID must be able to call `GET /localapi/v0/status`. (The app gaining control of tailscaled is accepted for a single owner.)
- **`scriba`:** `image: bbartolome/scriba:${SCRIBA_IMAGE_TAG:-latest}`; `user: "${SCRIBA_UID:-1000}:${SCRIBA_GID:-1000}"`; bind mount `${SCRIBA_LIBRARY}:/books`; `SCRIBA_COMPOSE_VERSION` and `SCRIBA_PORT` passed through; healthcheck runs a Node one-liner fetching `http://127.0.0.1:8080/healthz`.
- `init: true` and `restart: unless-stopped` on both services.
- `compose.override.yaml` is the author's; the installer never writes it.
- **`SCRIBA_COMPOSE_VERSION`** is an integer constant shipped in `deploy/`, bumped whenever compose or the `.env` key set changes. Wire PLT-04's version-info `composeVersion` to it.

## Acceptance criteria
- [ ] `docker compose up -d` with no auth key reaches `healthy`; the app answers on `127.0.0.1:${SCRIBA_PORT}` and on no other host interface.
- [ ] Files the app writes into the library are owned by `SCRIBA_UID:SCRIBA_GID` on the host.
- [ ] From the `scriba` container as its non-root UID, `GET /localapi/v0/status` over the shared socket returns `BackendState` (`NeedsLogin` before login).
- [ ] `host.docker.internal` resolves inside the `scriba` container.
- [ ] `GET /api/platform/version` reports the shipped `composeVersion`.
