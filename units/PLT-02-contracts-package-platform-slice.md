---
id: PLT-02
title: Contracts package with ten subpaths and the /platform slice
module: platform
phase: phase:scaffold
milestone: M1
blocked_by: [PLT-01]
parallel_with: [PLT-03, PLT-09, PLT-10, PLT-12]
unblocks: [PLT-04, PLT-11, "Model providers contract slice (MPR-01)", "Project store contract slice (PST-01)", "Setup & auth contract slice (SAU-01)", "Tool registry contract slice (TRG-01)"]
---

# PLT-02 — `@bbartolome/scriba-contracts` with ten subpaths and the `/platform` slice

## Why
Every module's `phase:contract` must only fill in shapes, never edit shared package config (user story 30), and must consume the package as built JS + `.d.ts` so imports work in NestJS and the Angular build without path-alias tricks (story 31).

## Decisions
- Isomorphic TypeScript + Zod, shapes and constants only. Built to JS + `.d.ts`; NestJS and Angular import it directly with no code generation.
- **One subpath export per module, no shared barrel:** `/platform`, `/setup-auth`, `/providers`, `/project-store`, `/tool-registry`, `/agent-loop`, `/graph-runner`, `/compile-export`, `/shell`, `/genre-packs`. All ten scaffolded here; every slice except `/platform` starts empty. `/shell` and `/genre-packs` are expected to stay empty.
- The emitted module format must load in the NestJS runtime (Node's `require(esm)` on the pinned LTS if the output is ESM) and in Angular's bundler.
- No app-wide contract version. Persisted formats carry their own per-file `schemaVersion`. After a slice is published, changes follow expand–contract.
- Runtime dependencies: Zod only.

## The `/platform` slice (contract — other modules depend on these exact shapes)

- **Module slugs** (shared by subpaths, API route prefixes `/api/<slug>/…` and the envelope's `module`): `platform`, `setup-auth`, `providers`, `project-store`, `tool-registry`, `agent-loop`, `graph-runner`, `compile-export`, `shell`, `genre-packs`. `shell` and `genre-packs` have no API routes and publish no events.
- **SSE envelope:** `{module, type, data}`. `module` is the enum of *publishing* slugs (`platform`, `setup-auth`, `providers`, `project-store`, `tool-registry`, `agent-loop`, `graph-runner`, `compile-export`). `type` is short kebab-case with no dots, unique within the module (e.g. `pending-created`, `node-status`). `data` is declared by the module's own slice; each module publishes a discriminated union of its own members. Platform owns only the envelope base and its own members:
  - `platform/hello` `{streamId, version, serverTime}` — sent first on every connection.
  - `platform/echo` `{seq, sentAt}`.
- **Stream constants:** events route `/events`, retry hint `3000` ms, heartbeat interval 15 s, echo diagnostic route `POST /api/platform/echo` and its request `{count, intervalMs}`.
- **Base error shape:** `{error: {code, message, details?}}` (status lives on the HTTP response). `code` is SCREAMING_SNAKE with a per-module prefix: `PLATFORM_`, `SETUP_` / `AUTH_`, `PROVIDER_`, `PROJECT_`, `TOOL_`, `AGENT_`, `GRAPH_`, `COMPILE_`. Each module declares its codes as constants in its own slice. `message` is human-readable and never contains secrets; `details` is optional structured data (e.g. Zod issues). Platform codes: `PLATFORM_VALIDATION_FAILED` (400), `PLATFORM_NOT_FOUND` (404), `PLATFORM_PAYLOAD_TOO_LARGE` (413), `PLATFORM_INTERNAL` (500).
- **HTTP method convention (documented constant/comment):** reads are `GET` and never mutate; every command is `POST`; no `PUT`/`PATCH`/`DELETE`.
- **`/healthz` response:** `{status: 'ok', version}`.
- **App version info** (`GET /api/platform/version`): `{version, revision, builtAt, composeVersion}` — `version` is baked semver or `0.0.0-dev`; `revision` git SHA; `composeVersion` the compose version this image expects.
- **`settings.yaml` envelope:** top-level `schemaVersion` (`1` in v1) and the fixed section keys `projects` (Project store), `providers` (Model providers), `tools` (Tool registry), `agent` (Agent loop), `setupAuth` (Setup & auth). Each section carries its own `schemaVersion` as its first key. A new section needs a new key here.
- **`SCRIBA_*` env names with defaults:**

| Name | Where | Default | Meaning |
|---|---|---|---|
| `SCRIBA_PORT` | compose / `.env` → app | `8080` | Host loopback publish port. Compose also passes it into the app for the Host allowlist and the setup URL. The app always listens on 8080 inside the container. |
| `SCRIBA_UID`, `SCRIBA_GID` | compose / `.env` | `1000` | Host UID/GID for `user:` |
| `SCRIBA_LIBRARY` | compose / `.env` | `~/Books` (absolute) | Host library path, bind-mounted to `/books` |
| `SCRIBA_IMAGE_TAG` | compose / `.env` | `latest` | Image tag; pinning means a semver here |
| `SCRIBA_COMPOSE_VERSION` | `.env` → app | stamped by the installer | Installed compose version (integer) |
| `SCRIBA_BOOKS_DIR` | app | `/books` | Library path inside the container |
| `SCRIBA_PACKS_DIR` | app | `/opt/scriba/packs` | Built-in packs (read-only) |
| `SCRIBA_EXAMPLES_DIR` | app | `/opt/scriba/examples` | Baked "start from sample" templates |
| `SCRIBA_TS_SOCKET` | app | `/var/run/tailscale/tailscaled.sock` | LocalAPI socket path |
| `SCRIBA_WATCHER` | app | `true` | Project store's optional file watcher (UI refresh only) |
| `SCRIBA_DEV_ORIGINS` | app (dev only) | empty | Comma-separated extra full origins (e.g. `http://localhost:4200`); each is added to Setup & auth's Origin allowlist and its `host:port` to the loopback Host allowlist. `npm run dev` sets it to the Angular dev server's origin. Never set in the image. |
| `SCRIBA_SETUP_URL_BASE` | app | `http://127.0.0.1:${SCRIBA_PORT}` | Base URL written into `setup-url` (Setup & auth). `npm run dev` sets it to the Angular dev server's origin. |
| `SCRIBA_LOG_LEVEL` | app | `info` | stdout log level |

Tailscale's own variables (`TS_AUTHKEY`, `TS_HOSTNAME`, `TS_STATE_DIR`, `TS_USERSPACE`, `TS_SOCKET`, `TS_SERVE_CONFIG`) are compose-only, not contract constants.

## Scope
- Package build config (`exports` map with ten subpaths, no root export), `tsc` build to JS + `.d.ts`.
- `/platform` slice as above, with Zod schemas and inferred types.
- Nine empty slices (an empty module file each), so owners only add shapes.
- Node runtime boot test that imports all ten subpaths (the Angular-build half of the boot test lands in PLT-11 once `apps/web` exists).

## Acceptance criteria
- [x] All ten `@bbartolome/scriba-contracts/<module>` subpaths resolve at runtime in Node (CJS `require` from a NestJS-style consumer). Importing the package root fails (no barrel).
- [x] Zod tests: valid and invalid envelopes (bad `module`, dotted `type`), valid and invalid error bodies (lower-case code, missing prefix), hello/echo members, healthz and version-info shapes.
- [x] The package has no runtime dependency other than Zod.
