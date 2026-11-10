---
id: PLT-04
title: NestJS composition root, env parsing, app-state check, /healthz, version info, create-test-app
module: platform
phase: phase:scaffold
milestone: M1
blocked_by: [PLT-01, PLT-02]
parallel_with: [PLT-03, PLT-09, PLT-10, PLT-12]
unblocks: [PLT-05, PLT-06, PLT-07, PLT-08, PLT-11, "Genre packs golden harness (GNP-02)"]
---

# PLT-04 — API composition root

## Why
Each module registers its NestJS `@Module` with one import in the composition root (story 32), and every module's API tests need one shared bootstrap (`create-test-app`).

## Decisions
- **One NestJS app, one port.** Listens on 8080 on all interfaces inside the shared network namespace (Docker's loopback publish needs it). Serves the built Angular bundle with `@nestjs/serve-static`, with SPA fallback to `index.html` for non-API paths. Static files, `/api`, `/healthz` and `/events` share one origin. No CORS headers.
- **Feature registration.** Each module adds its own one-line `@Module` import to the root module, in its own PR. Controllers mount under `/api/<module-slug>/…`. No module mounts routes outside its prefix, except Platform's `/healthz` and `/events`. Route constants live in each module's contract slice.
- Platform's own code is the `platform` module at `apps/api/src/modules/platform/`, structured so PLT-05…PLT-08 each add a provider/sub-folder without touching each other's files.
- **Env and config.** `SCRIBA_*` variables are parsed with Zod at boot (names from `/platform`); a bad value stops boot with a readable message.
- **App-state folder check.** At boot the app ensures `${SCRIBA_BOOKS_DIR}/.scriba/` exists and is writable by its UID. If not, it exits non-zero with a message naming the UID/GID and the host path. The folder's contents belong to other modules (settings sections, secrets file, token and `setup-url`, index files).
- **Boot sequence:** env parse → app-state check → (settings migration, added by PLT-07) → listen. The server does not listen before boot finishes, so `GET /healthz` 200 means ready.
- **`GET /healthz`** returns 200 `{status: 'ok', version}`. Unguarded forever (compose healthcheck and image smoke run before setup). Never touches the tailnet.
- **`GET /api/platform/version`** returns `{version, revision, builtAt, composeVersion}`. `version`, `revision`, `builtAt` come from build args baked into the image (dev: `0.0.0-dev`); `composeVersion` is the expected compose version constant that ships with `deploy/` (PLT-15 owns the value; use a placeholder constant here). The installed value arrives via `SCRIBA_COMPOSE_VERSION`; Setup & auth turns the pair into its compose-mismatch status. Guarded once Setup & auth `phase:token-guard` lands.
- **Guards.** Setup & auth owns the single global guard. Before it lands nothing is guarded (dev only; no image is published from that state).
- **Logging** to stdout, level from `SCRIBA_LOG_LEVEL`.
- **Shutdown.** On SIGTERM the app stops accepting connections and closes open streams (PLT-06 hooks its stream close into this).
- **Test-app helper.** `apps/api/test/create-test-app.ts` boots the composed app (or a given subset of modules plus Platform's root providers) against a caller-supplied temp library folder and env overrides (`SCRIBA_BOOKS_DIR`, `SCRIBA_PACKS_DIR`, …), listens on an ephemeral port, and returns the base URL, an SSE helper (connect to `/events`, collect parsed envelopes) and a close function. Every module's API tests use it.

## Scope
- Root module, `main.ts`, platform module skeleton, env parsing, app-state check, serve-static + SPA fallback, `/healthz`, version info, SIGTERM handling, `create-test-app` (SSE helper can be a thin `fetch` stream reader; `/events` itself lands in PLT-06).

## Acceptance criteria
- [ ] `GET /healthz` returns `{status:'ok', version}` with 200; `GET /api/platform/version` returns the version-info shape.
- [ ] A non-API path returns `index.html` (tested with a fixture static dir).
- [ ] An invalid `SCRIBA_*` value makes boot exit non-zero with a readable message naming the variable.
- [ ] An unwritable `.scriba/` folder makes the app exit non-zero with a message naming the UID/GID and the path.
- [ ] A test using `create-test-app` boots against a temp library on an ephemeral port and reads `/healthz`.
