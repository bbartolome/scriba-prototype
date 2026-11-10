# Spec: Platform

## Problem Statement

Scriba is built by ten modules in parallel, and none of them can start until something exists to build into. Today the repo holds only skills, docs, a glossary and a canvas spike. There's no workspace, no shared contracts package, no API to register a NestJS module with, no stream to publish events on, no test harness, no image and no way for an author to install the app.

The author has the opposite problem. They want to run one command on their Mac, get a working app on `http://127.0.0.1:8080` and, if they choose, reach it from their iPad and phone over `https://scriba.<tailnet>.ts.net`. They want updates to be a re-run of that same command, never a reinstall, and they want to roll back by pinning a tag. They should never have to know about Pandoc, Typst, SQLite builds, UIDs or Tailscale Serve configs.

Module builders need shared files with one owner: the root `package.json`, the lockfile, compose, CI. They also need a contracts package with a slot per module, a composition root that their module plugs into, one multiplexed SSE stream, a mock OpenAI-compatible server for model-free tests, and one Playwright e2e test they can grow at their milestone.

## Solution

Platform is wave 0. It lands first and owns everything shared:

- **The repo scaffold.** Root npm workspaces (`apps/api`, `apps/web`, `packages/contracts`, `packages/packs`, plus `deploy/`, `e2e/`, `examples/` folders), one command each for dev, build, test and lint, and pinned Node, npm and TypeScript.
- **`@bbartolome/scriba-contracts`.** A built, isomorphic TS + Zod package with one subpath export per module and no shared barrel. Platform publishes its own `/platform` slice: the SSE envelope, `SCRIBA_*` env names, the base error shape and error-code convention, the `/healthz` response and app version info.
- **The API composition root.** NestJS serves the built Angular bundle with `@nestjs/serve-static` on port 8080, same origin as `/api`. It also provides `/healthz`, the multiplexed SSE stream with a publisher every module uses, the global error filter, env parsing, and the eager startup migration hook for `settings.yaml`.
- **The image.** A two-stage `node:<lts>-slim` image with built-in `node:sqlite` (FTS5), Pandoc 3.13 and Typst. It has no git and no build toolchain, and is built natively for amd64 and arm64.
- **Compose.** A `tailscale` sidecar plus a `scriba` service sharing its network namespace. The app is published on loopback, `host.docker.internal` reaches host Ollama, the LocalAPI socket is shared, the app runs as the host UID/GID, and `/healthz` drives the healthcheck.
- **The installer.** `docker run --rm -e SETUP=true bbartolome/scriba | bash` installs. Re-running it updates with a backup and a merge, and stamps `SCRIBA_COMPOSE_VERSION`.
- **CI and publishing.** `ci.yml` runs one job. The mock OpenAI server and the Playwright harness live in `e2e/`. `publish.yml` builds multi-arch on native runners and runs semantic-release in a way that avoids the `GITHUB_TOKEN` trigger gotcha. Image smoke jobs run against each built image, and a CI check validates `examples/` against the contracts.
- **Smoke tests ST-1 to ST-3.** These are manual checks against a real tailnet and host Ollama. ST-1 decides between `TS_SERVE_CONFIG` and the CLI loop.

## User Stories

1. As an author, I want to install Scriba with one pasted command, so that I don't have to clone a repo, build anything or edit YAML.
2. As an author, I want the installer to check for Docker and Compose v2 before it does anything, so that a missing prerequisite fails fast with a clear message instead of halfway through.
3. As an author, I want the installer to create my library folder (`~/Books` by default) and its `.scriba/` folder, so that my books and the app's state live in one folder I can see, back up and put under git.
4. As an author, I want the installer to set the container's user to my own UID/GID, so that files the app writes into `~/Books` are owned by me and editable in any editor.
5. As an author, I want the installer to wait until the app is healthy and then print the setup URL, so that I know the app is up and where to go next.
6. As an author, I want the app always reachable at `http://127.0.0.1:8080` (or my chosen port) on my Mac, so that I can use it even when I never log in to Tailscale.
7. As an author, I want the app never published on my LAN, so that nobody on the café Wi-Fi can reach my manuscript.
8. As an author, I want to log in to Tailscale later, from inside the app, without an auth key, so that tailnet access is optional and needs no extra setup.
9. As an author, I want my iPad and phone to reach the app at `https://scriba.<tailnet>.ts.net` over HTTPS only, so that the connection is encrypted and the app can work as a PWA.
10. As an author, I want tailnet devices unable to reach the app's plain HTTP port directly, so that nothing bypasses Serve's HTTPS and identity headers.
11. As an author, I want the app to reach Ollama on my host at `host.docker.internal:11434` with no configuration, so that local models work out of the box on Mac and Linux.
12. As an author, I want streaming chat and run status to arrive token by token on every device, including over the tailnet, so that the agent feels live instead of batched.
13. As an author, I want PDF, DOCX and EPUB export to work with nothing else installed, so that I can export from a fresh install.
14. As an author, I want to update by re-running the same install command, so that I only ever have to remember one command.
15. As an author, I want an update to back up my `.env` and compose file before changing them, so that I can restore them if something goes wrong.
16. As an author, I want an update to keep my existing settings and only add new ones, so that my port, library path and auth key survive.
17. As an author, I want my own compose tweaks kept in an override file that updates never touch, so that customisations survive updates.
18. As an author, I want `docker compose pull && docker compose up -d` to work as a fast path for image-only releases, so that small updates take seconds.
19. As an author, I want to pin a version tag and roll back with `up -d`, so that a bad release never strands me.
20. As an author, I want the app to tell me its version, so that I can report problems and know what I'm running.
21. As an author, I want my app settings migrated automatically at startup, with a backup, so that I never hand-edit a file after an update.
22. As an author, I want the app to refuse to start, with a clear log line, when `settings.yaml` is from a newer version, so that a rollback never silently corrupts my settings.
23. As an author, I want a clear startup error when the app can't write to `/books/.scriba/`, so that a UID or mount mistake is obvious from `docker compose logs`.
24. As an author, I want the app to restart by itself after a crash or reboot, so that it's just there when I open my laptop.
25. As an author, I want images for both Apple Silicon and Intel/AMD Linux, so that the same command works on my Mac and a home server.
26. As an author, I want the image to stay reasonably small (about 300–400 MB), so that installs and updates are quick.
27. As a module builder, I want one root workspace with one lockfile, so that I add my dependencies in one place and installs are reproducible.
28. As a module builder, I want `npm run dev` to build contracts, then start the API, the web dev server and a contracts watcher together, so that one command gives me a working app with live reload.
29. As a module builder, I want `npm run build`, `npm test` and `npm run lint` to cover every workspace, so that I run the same checks locally as CI does.
30. As a module builder, I want an empty `@bbartolome/scriba-contracts/<module>` subpath waiting for me, so that my `phase:contract` only fills in shapes and never edits shared package config.
31. As a module builder, I want the contracts package consumed as built JS + `.d.ts`, so that imports work at runtime in NestJS and in the Angular build without path-alias tricks.
32. As a module builder, I want to register my NestJS `@Module` with one import in the composition root, so that adding my API is additive and conflict-free.
33. As a module builder, I want an injectable publisher that puts my events on every open stream inside the shared envelope, so that I never write SSE plumbing.
34. As a module builder, I want a base error shape and a code convention, so that every module's errors look alike to the Shell's API client.
35. As a module builder, I want request bodies validated with my contract's Zod schemas and failures turned into the base error shape, so that I don't write validation glue.
36. As a module builder, I want to register a migration step for my section of `settings.yaml`, so that I own my section's shape without owning the file.
37. As a module builder, I want a scripted mock OpenAI-compatible server that I can add scenarios to, so that I can test model behaviour without a model.
38. As a module builder, I want to select a mock scenario through the base URL, so that parallel tests never share mock state.
39. As a module builder, I want the mock server to record the requests it received, so that I can assert on what my code sent (headers, body, attempt count).
40. As a module builder, I want one Playwright e2e test with placeholder steps for setup, start from sample, agent run, accepting a change and the manuscript, so that I turn on my step at my milestone instead of writing a harness.
41. As a module builder, I want CI to validate the sample projects in `examples/` against the current contracts, so that a contract change can't silently break the demos.
42. As a module builder, I want a lint rule that stops one module importing another module's internals, so that boundaries like "the Agent loop and the Graph runner never call each other" are enforced, not just written down.
43. As a maintainer, I want CI to run lint, test, build and the e2e test on every PR and push to `main`, so that `main` stays green.
44. As a maintainer, I want releases cut automatically from Conventional Commits, so that versions and changelogs never need hand-editing.
45. As a maintainer, I want a semver image published only after both architectures build and pass their smoke checks, so that a tag never points at a broken or half-built image.
46. As a maintainer, I want `latest`, `sha-<short>` and semver tags on Docker Hub, so that authors can follow, pin or bisect.
47. As a maintainer, I want smoke jobs to prove the dispenser emits parseable bash, the manifest has both arches, Pandoc and Typst run, `/healthz` answers with no tailnet and FTS5 works, so that the image's promises are checked on every publish.
48. As a maintainer, I want a written manual checklist for ST-1 to ST-3, so that tailnet and host-network behaviour is verified before releases that touch deployment.
49. As a maintainer, I want ST-1's outcome recorded in an ADR, so that nobody re-litigates the Serve mechanism later.
50. As a Setup & auth builder, I want the LocalAPI socket shared into the app container and readable by the app's non-root UID, so that the in-app Tailscale login works without a tailscale CLI in the image.
51. As a Setup & auth builder, I want the expected and installed compose versions available to the app, so that I can warn the author about a mismatch.

## Implementation Decisions

### Repo, workspace and scripts

- **Workspaces.** Plain npm workspaces with one root `package.json` and lockfile. Contracts are listed first so they build first. Workspaces: `packages/contracts` (`@bbartolome/scriba-contracts`), `apps/api` (`@bbartolome/scriba-api`, NestJS), `apps/web` (`@bbartolome/scriba-web`, Angular + Material) and `packages/packs` (content; its tool-spec YAML is validated by the Tool registry). `deploy/`, `e2e/` and `examples/` are folders, not packages, except where `e2e/` needs its own dev dependencies, in which case it becomes a workspace too.
- **Vertical layout.** Each module lives at `apps/api/src/modules/<m>/` plus `apps/web/src/app/features/<m>/`. Platform's own API code sits under the same convention as the `platform` module.
- **`apps/web` bootstrap.** Platform generates the bare Angular + Material app and the minimal dev proxy entry for `/api`, `/healthz` and the events route, so that `npm run dev` works end to end. **Ownership of the web composition root, route table and proxy passes to the Frontend shell** at its `phase:core`. Platform doesn't edit them after that.
- **Scripts.**
  - `dev`: build contracts once, then `concurrently` runs the API in watch mode, the Angular dev server with its proxy, and `tsc --watch` on contracts.
  - `build`: contracts, then API and web.
  - `test`: Vitest in every workspace (Angular's default Vitest runner; NestJS via `unplugin-swc`).
  - `lint`: ESLint (flat config) plus Prettier check across workspaces. It includes the `examples/` contract check and a boundaries rule (see below).
  - `e2e`: Playwright against the dev server with the mock OpenAI server.
  - `mock:openai`: starts the mock server on its own for manual demos.
- **Pins.** Node (`.nvmrc` and `engines`, newest LTS, the same major as the image), npm (`packageManager`), and exactly one TypeScript version hoisted at the root. Angular, NestJS and Zod majors are pinned at scaffold time.
- **Samples layout.** `examples/samples.yaml` lists the samples as `{id, title, description}` (the "start from sample" cards). Each sample is a project folder `examples/<id>/` (`examples/nonfiction/` at M1, `examples/fiction/` at M6). The index file sits outside every sample folder, so it is never copied into a project.
- **Dev library.** In dev, `SCRIBA_BOOKS_DIR` defaults to a git-ignored repo-local folder, and `SCRIBA_PACKS_DIR` / `SCRIBA_EXAMPLES_DIR` point at `packages/packs` and `examples/`. Dev and image therefore run the same code paths.
- **Module boundaries lint.** A module may import another module only through the NestJS `@Module` it exports (DI) and through `@bbartolome/scriba-contracts`, never through internal files. The `agent-loop` and `graph-runner` modules may not import each other at all. Feature folders in `apps/web` follow the same rule.

### Contracts package

- Isomorphic TypeScript + Zod, shapes and constants only. It's built to JS + `.d.ts`, and NestJS and Angular import it directly with no code generation.
- **One subpath export per module, no shared barrel:** `/platform`, `/setup-auth`, `/providers`, `/project-store`, `/tool-registry`, `/agent-loop`, `/graph-runner`, `/compile-export`, `/shell`, `/genre-packs`. Platform scaffolds all ten. Every slice except `/platform` starts empty. `/shell` and `/genre-packs` are expected to stay empty (their modules produce no contracts).
- The emitted module format must load in the NestJS runtime (Node's `require(esm)` on the pinned LTS if the output is ESM) and in Angular's bundler. A boot test proves both.
- No app-wide contract version. Persisted formats carry their own per-file `schemaVersion`. After a slice is published, changes follow expand–contract.

### API composition root

- **One NestJS app, one port.** The app listens on 8080 on all interfaces inside the shared network namespace, which Docker's loopback publish needs. It serves the built Angular bundle with `@nestjs/serve-static`, with SPA fallback to `index.html` for non-API paths. Static files, `/api`, `/healthz` and the events route all share one origin. No CORS headers.
- **Feature registration.** Each module adds its own one-line `@Module` import to the root module, in its own PR. Module controllers mount under `/api/<module-slug>/…`, where `<module-slug>` is the module's slug from the table below (for example `/api/project-store/…`, `/api/tool-registry/…`, `/api/graph-runner/…`). No module mounts routes outside its prefix, except Platform's own `/healthz` and `/events`. Each module's route constants live in its own contract slice.
- **HTTP methods.** Reads are `GET` and never mutate. Every command is a `POST`. No module uses `PUT`, `PATCH` or `DELETE`, so the Shell's API client and Setup & auth's guard tests deal with exactly two methods (plus `HEAD`/`OPTIONS` handled by the framework).
- **Module slugs.** `platform`, `setup-auth`, `providers`, `project-store`, `tool-registry`, `agent-loop`, `graph-runner`, `compile-export`, `shell`, `genre-packs`. The same slug names the contracts subpath, the API route prefix and the SSE envelope's `module`. `shell` and `genre-packs` have no API routes and publish no events.
- **Test-app helper.** `phase:scaffold` ships `apps/api/test/create-test-app.ts`: it boots the composed NestJS app (or a given subset of modules plus Platform's root providers) against a caller-supplied temp library folder and env overrides (`SCRIBA_BOOKS_DIR`, `SCRIBA_PACKS_DIR`, …), listening on an ephemeral port, and returns the base URL, an SSE helper and a close function. Every module's API tests use it, so no module writes its own bootstrap.
- **No direct tailnet connections.** The HTTP server drops connections whose peer address is in Tailscale's ranges (`100.64.0.0/10`, `fd7a:115c:a1e0::/48`). Without this filter, a tailnet peer could open `http://<100.x>:8080` and bypass Serve. That would defeat the HTTPS-only rule and Serve's identity-header stripping. Serve proxies from `127.0.0.1`, and the loopback publish arrives from the Docker gateway, so both pass. Setup & auth relies on the same distinction: it trusts the tailnet identity header only from a loopback peer. ST-1 records the peer addresses actually seen on both paths.
- **Env and config.** `SCRIBA_*` variables are parsed with Zod at boot, and a bad value stops boot with a readable message. Their names are constants in `/platform`.
- **App-state folder check.** At boot, the app makes sure `/books/.scriba/` exists and is writable by its UID. If it isn't, the app exits non-zero with a message naming the UID/GID and the host path. The folder's contents belong to other modules: settings and sections, the secrets file (Model providers), the token and `setup-url` (Setup & auth), index files (Project store).
- **`settings.yaml` startup migration hook.** Platform owns the file envelope and the hook. Modules own their sections.
  - The file is `/books/.scriba/settings.yaml`. It has a top-level `schemaVersion` (the envelope's version, `1` in v1) plus one top-level section per module. **Each section carries its own `schemaVersion`** as its first key, so modules version their sections independently.
  - The fixed section keys are: `projects` (Project store: the active project id), `providers` (Model providers: provider configs and the app default), `tools` (Tool registry: per-tool enable overrides), `agent` (Agent loop: step cap, research settings), and `setupAuth` (Setup & auth: setup step status, preferences, owner allowlist). A new section needs a new key here.
  - Modules register their section with a current version, a default value (used when the section is absent; `null` means "leave absent") and `{fromVersion → step}` migrations, through the platform module.
  - At boot, before the server listens, the hook reads the file (a missing file is treated as `{schemaVersion: 1}`). If any section is behind, it writes a timestamped backup next to the file (`settings.yaml.bak-<UTC timestamp>`) and applies that section's steps in order. It then writes the result atomically (temp file, then rename). An unknown top-level key is kept as is.
  - A file whose envelope `schemaVersion`, or any registered section's `schemaVersion`, is **newer** than the app supports is refused: the app logs the section and version it found and how to roll back, then exits non-zero.
  - The hook also exposes atomic read/write of a section to its owning module.
  - **Not here:** per-project files (`project.yaml`, entity and graph files) migrate lazily on open, with a backup and a `logs/` entry. That belongs to the Project store spec. Platform owns the eager app-state hook because it runs in the composition root's boot sequence; lazy per-project migration is Project store's.
- **Errors.** A global exception filter maps every error to the base error shape:
  - Zod validation failures become `PLATFORM_VALIDATION_FAILED` (400) with the issues in `details`.
  - Unknown routes under `/api` become `PLATFORM_NOT_FOUND` (404).
  - Oversized bodies become `PLATFORM_PAYLOAD_TOO_LARGE` (413).
  - Anything uncaught becomes `PLATFORM_INTERNAL` (500), with no stack in the body and the full error logged to stdout.
  - Platform provides a Zod validation pipe that modules use with their contract schemas.
- **Logging.** Operational logs go to stdout, with a level set by `SCRIBA_LOG_LEVEL`.
- **Guards.** The Setup & auth spec owns the single global guard every module's API uses. Platform's endpoints follow it, with one requirement: **`/healthz` stays reachable without credentials**, so the compose healthcheck and the image smoke job work before setup. Before the Setup & auth guard lands, nothing is guarded. That's acceptable in dev only, and no image is published from that state.
- **Shutdown.** On SIGTERM the app closes open streams and stops accepting connections. `init: true` reaps children such as Pandoc processes.

### `/healthz` and version info

- `GET /healthz` returns 200 with `{status: 'ok', version}` once boot (env parse, app-state check, settings migration) has finished. The server doesn't listen before then, so a 200 means the app is ready. It doesn't touch the tailnet, and it answers with no tailnet at all, as the image smoke jobs check.
- `GET /api/platform/version` (guarded) returns the app version info: `{version, revision, builtAt, composeVersion}`.
  - `version` is the baked-in semver, or `0.0.0-dev` in dev.
  - `revision` is the git SHA.
  - `composeVersion` is the compose version this image expects.
  - The installed value comes from the `SCRIBA_COMPOSE_VERSION` env var, which compose passes into the app. The Setup & auth spec turns the pair into its compose-mismatch status.

### SSE stream and envelope

- **One multiplexed stream per tab:** `GET /events` (the "events route" the dev proxy covers), `text/event-stream`. Commands are POSTs on module routes. Nothing on the stream is a command.
- **Envelope:** `{module, type, data}`.
  - `module` is one of the publishing module slugs (`platform`, `setup-auth`, `providers`, `project-store`, `tool-registry`, `agent-loop`, `graph-runner`, `compile-export`).
  - `type` is a short kebab-case name that's unique within the module.
  - `data` is whatever the module's own slice declares.
  - Each module publishes a discriminated union of its own members in its slice. Platform owns only the envelope base and its own members.
- **Wire format:**
  - Every envelope is sent as a default (unnamed) SSE message whose `data:` line is the JSON envelope, so a client needs a single `onmessage` handler.
  - The server sends `retry: 3000` on connect, and a comment heartbeat every 15 s to keep proxies and Serve from idling the connection.
  - Responses send `Cache-Control: no-cache, no-transform` and are never compressed.
- **No replay.** The stream sends no `id:` lines and has no `Last-Event-ID` buffer. A tab that reconnects (for example, a device waking from sleep) reconciles through module state endpoints, such as the "current run state" endpoint.
- **Naming.** Every `type` is kebab-case with no dots (for example `pending-created`, `node-status`). Dotted names are not used anywhere.
- **Fan-out.** The publisher broadcasts every envelope to every open stream. With one author on several devices, every tab sees every event. Data that's scoped to a project carries its project id so clients can filter.
- **Backpressure.** If a client's write buffer passes a limit, the server closes that stream. The client reconnects and reconciles.
- **Platform's own members:**
  - `platform/hello`, sent first on every connection: `{streamId, version, serverTime}`.
  - `platform/echo`: `{seq, sentAt}`. The guarded diagnostic `POST /api/platform/echo {count, intervalMs}` broadcasts it, and ST-2 and the Shell's SSE-client tests use it to measure latency.
- **Auth.** Native `EventSource` sends the cookie or rides the Serve identity. The stream is guarded like any other route once the Setup & auth guard exists.

### Error shape and code convention

- Body: `{error: {code, message, details?}}`. The status code lives on the HTTP response.
- `code` is SCREAMING_SNAKE with a per-module prefix:
  - `PLATFORM_`
  - `SETUP_` / `AUTH_`
  - `PROVIDER_`
  - `PROJECT_`
  - `TOOL_`
  - `AGENT_`
  - `GRAPH_`
  - `COMPILE_`
- Each module declares its codes as constants in its own slice.
- `message` is human-readable and never contains secrets.
- `details` is optional structured data, for example Zod issues.

### Env names (in `/platform`)

| Name | Where | Default | Meaning |
|---|---|---|---|
| `SCRIBA_PORT` | compose / `.env` → app | `8080` | Host loopback publish port. Compose also passes it into the app, which uses it for the Host allowlist and the setup URL. The app itself always listens on 8080 inside the container. |
| `SCRIBA_UID`, `SCRIBA_GID` | compose / `.env` | `1000` | Host UID/GID for `user:` |
| `SCRIBA_LIBRARY` | compose / `.env` | `~/Books` (absolute) | Host library path, bind-mounted to `/books` |
| `SCRIBA_IMAGE_TAG` | compose / `.env` | `latest` | Image tag. Pinning means setting a semver here. |
| `SCRIBA_COMPOSE_VERSION` | `.env` → app | stamped by the installer | Installed compose version |
| `SCRIBA_BOOKS_DIR` | app | `/books` | Library path inside the container |
| `SCRIBA_PACKS_DIR` | app | `/opt/scriba/packs` | Built-in packs (read-only) |
| `SCRIBA_EXAMPLES_DIR` | app | `/opt/scriba/examples` | Baked "start from sample" templates |
| `SCRIBA_TS_SOCKET` | app | `/var/run/tailscale/tailscaled.sock` | LocalAPI socket path |
| `SCRIBA_WATCHER` | app | `true` | Project store's optional file watcher, which only refreshes the UI |
| `SCRIBA_DEV_ORIGINS` | app (dev only) | empty | Comma-separated extra full origins (for example `http://localhost:4200`). Each one is added to Setup & auth's Origin allowlist, and its `host:port` to the loopback Host allowlist. `npm run dev` sets it to the Angular dev server's origin. Never set in the image. |
| `SCRIBA_SETUP_URL_BASE` | app | `http://127.0.0.1:${SCRIBA_PORT}` | Base URL written into `setup-url` (Setup & auth). `npm run dev` sets it to the Angular dev server's origin so the cookie lands on the origin the browser uses. |
| `SCRIBA_LOG_LEVEL` | app | `info` | stdout log level |

Tailscale's own variables (`TS_AUTHKEY` in `.secret`, `TS_HOSTNAME=scriba`, `TS_STATE_DIR`, `TS_USERSPACE=false`, `TS_SOCKET`, and `TS_SERVE_CONFIG` if ST-1 picks it) are set in compose. They aren't `SCRIBA_*` contract constants.

### Image

- **Two stages.** The build stage, on `node:<lts>`, runs `npm ci` and builds contracts, the API and the web app. The runtime stage, on `node:<lts>-slim` (newest LTS, Node 26 at the time of writing), gets production dependencies only, plus:
  - the built API and web;
  - `packages/packs` at `/opt/scriba/packs`;
  - `examples/` at `/opt/scriba/examples`;
  - the `deploy/` files at `/opt/installer`.
- **Runtime contents:**
  - Built-in `node:sqlite` with FTS5, so no native addons.
  - Pandoc 3.13 from the official per-arch `.deb`.
  - Typst as a pinned static binary per arch, checksum-verified at build. `--to=typst --pdf-engine=typst` works out of the box.
  - `ca-certificates`.
  - **No git, no build toolchain.**
- **Build args.** The semver version, revision and build time are baked in as build args and reported by `/healthz` and version info. The expected compose version is a constant that ships with the `deploy/` files.
- **Entrypoint.** If `SETUP=true`, the image prints the dispenser script to stdout (with all diagnostics on stderr) and exits. Otherwise it starts the API. The default user is a non-root UID 1000, so a bare `docker run` (as in the smoke jobs) works. Compose overrides it with `user:`. No gosu.
- **Native builds.** amd64 and arm64 are built on native runners. The size target is about 300–400 MB, measured by the publish workflow.
- **No per-user thin layer.** TeX Live would only arrive as a derived `FROM bbartolome/scriba` image if the Compile & export Typst quality spike calls for one.

### Compose

- **Services `tailscale` and `scriba`.** `scriba` uses `network_mode: service:tailscale`.
- **`tailscale` service:**
  - Kernel mode: `TS_USERSPACE=false`, `/dev/net/tun`, `NET_ADMIN`.
  - `TS_HOSTNAME=scriba` and `TS_STATE_DIR` on a named state volume.
  - `env_file: .secret`. An optional `TS_AUTHKEY` lives there; without it, login is interactive.
  - `TS_SOCKET=/var/run/tailscale/tailscaled.sock`.
  - `extra_hosts: ["host.docker.internal:host-gateway"]`. The shared network namespace means it shares `/etc/hosts` too.
  - The loopback publish `127.0.0.1:${SCRIBA_PORT:-8080}:8080`.
  - Serve setup, per ST-1. The candidate is `TS_SERVE_CONFIG` pointing at a shipped Serve config with a `${TS_CERT_DOMAIN}:443` HTTPS handler proxying to `http://127.0.0.1:8080`. The fallback is a CLI loop: run containerboot, wait indefinitely for an IP, then `tailscale serve --bg --https=443 http://127.0.0.1:8080`. Unlike Tride (`bbartolome/tride`, the earlier project whose dispenser installer, Tailscale sidecar and multi-arch publish pipeline Scriba follows), there's no 60-second give-up and no `--http=80` handler.
- **Shared socket volume.** A named volume is mounted at `/var/run/tailscale` in both services. The app's non-root UID must be able to call `GET /localapi/v0/status`. This is checked in `phase:image-compose`. The app gaining control of tailscaled is accepted for a single owner.
- **`scriba` service:**
  - `image: bbartolome/scriba:${SCRIBA_IMAGE_TAG:-latest}`.
  - `user: "${SCRIBA_UID:-1000}:${SCRIBA_GID:-1000}"`.
  - The bind mount `${SCRIBA_LIBRARY}:/books`.
  - `SCRIBA_COMPOSE_VERSION` and `SCRIBA_PORT` passed through as env vars.
  - `init: true` and `restart: unless-stopped` (both services).
  - A healthcheck that runs a Node one-liner fetching `http://127.0.0.1:8080/healthz`.
- **`compose.override.yaml`.** The author's own changes go here. The installer never writes it.

### Installer and update

- **Dispenser.** `docker run --rm -e SETUP=true bbartolome/scriba | bash`, modelled on Tride's dispenser.
  - The script that's printed pins the image ref it came from.
  - It reads any interactive answers from `/dev/tty`, because stdin is the pipe.
  - It extracts the `deploy/` files by running the same image with `tar` over `/opt/installer`.
- **Install folder.** This is the folder the one-liner runs in, as in Tride. Docs recommend a dedicated folder outside the library, so that `.secret` (the Tailscale auth key) is never readable by the app through the library mount.
- **First install** (no `.env` present):
  1. Check Docker and Compose v2.
  2. Extract the `deploy/` files.
  3. Ask for the library path (default `~/Books`) and the port (default 8080), or use the defaults with no TTY.
  4. Create the library and its `.scriba/` folder, owned by the user.
  5. Write `.env` (`SCRIBA_LIBRARY`, `SCRIBA_UID`/`SCRIBA_GID` from `id -u`/`id -g`, `SCRIBA_PORT`, `SCRIBA_IMAGE_TAG`, `SCRIBA_COMPOSE_VERSION`), the compose file, and an optional `.secret` (mode 0600).
  6. Run `docker compose up -d`.
  7. Wait for healthy, with a timeout and a pointer to `docker compose logs` on failure.
  8. Print the setup URL from `<library>/.scriba/setup-url`. That file is written by Setup & auth; until it exists, the installer prints the loopback URL.
  9. Print a hint: Ollama with `OLLAMA_CONTEXT_LENGTH` of at least 64000, plus the Linux host-binding note from ST-3.
- **Re-run / update** (`.env` present). Non-interactive:
  1. Back up `.env` and the compose file with a timestamp.
  2. Merge `.env` keys add-missing/keep-existing.
  3. Replace the compose file with the new version (local edits belong in `compose.override.yaml`).
  4. Stamp the new `SCRIBA_COMPOSE_VERSION`.
  5. Then `docker compose pull` and `up -d`, wait for healthy, and print the URL.
  6. Re-runs are idempotent and never clobber config.
- **`SCRIBA_COMPOSE_VERSION`** is an integer, bumped whenever compose or the `.env` key set changes. The app compares it with its own expected value. Setup & auth shows the warning.
- **Fast path and rollback.**
  - `docker compose pull && up -d` covers image-only releases.
  - Rollback means setting `SCRIBA_IMAGE_TAG` to the previous tag, running `up -d`, and restoring the backups.
  - Both are documented. There's no auto-update and no "update available" notice in v1.

### CI, mock server, e2e and publishing

- **`ci.yml`.** One job on PRs and pushes to `main`, with no paths filter: `npm ci` → lint (including the `examples/` check) → test → build → e2e. On PRs it also checks that the PR title is a Conventional Commit (squash merges make it the commit on `main`), which semantic-release needs.
- **Mock OpenAI server** (`e2e/fixtures/mock-openai/`):
  - A scripted OpenAI-compatible server for `GET /v1/models` and `POST /v1/chat/completions`, both streaming and non-streaming.
  - **The scenario is selected by base-URL path prefix** (`…/scenario/<name>/v1`), so parallel tests never share state.
  - A scenario is a data file: an ordered list of steps that match on the request (turn index, last message role/content, tool result present) and reply with streamed content deltas, streamed tool calls (with arguments split across chunks), an HTTP status with headers, a delay, or a dropped connection.
  - Every scenario records the requests it received, and a test reads them back through a mock-only endpoint. There's also a per-scenario reset.
  - Platform ships two scenarios: `tool-call` (a normal tool-call turn) and `malformed-tool-call`. Modules add scenarios additively, one data file per scenario under `e2e/fixtures/mock-openai/scenarios/<name>.json`.
  - Paths in scenarios that name files in the nonfiction sample are a contract with `examples/`: renaming a sample file updates the scenario in the same PR.
- **Playwright harness.** It builds the web bundle, starts the API (serving that bundle on one origin, so no dev origins are needed) against a temp library, starts the mock server, then waits for `/healthz`. The harness does not configure a model provider: the "agent run" step does that through the Model providers API, pointing a provider at a mock scenario URL.
  - The single e2e test has five named steps: setup → project from sample → agent run → accept change → manuscript.
  - In this spec only the harness, the boot and an app-loads check are live. The five steps are placeholders, and each owning module turns its step on at its milestone (Setup & auth, Project store, Agent loop, Project store review, Compile & export).
  - **Export stays out of the e2e.**
- **Examples check.**
  - It validates every sample under `examples/` against the current contracts: `project.yaml` with the Project store's Zod schema, entity front matter with the generic entity front-matter base, and `graphs/` files with the Graph runner's graph schema.
  - It also checks that every recipe tool node names a tool that exists in the built-in packs, with params that validate under that tool's JSON Schema (`params` mode), and that every entity file's front matter validates against its pack entity-type schema, using the Tool registry's own loader and Ajv validation (the pack-lint CLI's library entry point).
  - It also checks that every entity reference in a sample (front-matter reference fields, story-node `path`s, `[@id]` citations in drafts) resolves to an existing file or entity in the same sample.
  - It checks that no sample ships `.scriba/`, `logs/`, `snapshots/` or `drafts/.versions/`.
  - Unit tests never read `examples/`.
- **`publish.yml`** follows Tride's structure, extended:
  - It triggers on pushes to `main` (with `paths-ignore` for docs-only changes) and on `workflow_dispatch`.
  - Jobs, in order:
    1. **`plan`**: semantic-release in dry-run mode works out whether this push releases, and with which version.
    2. **`build`**: a matrix of native `ubuntu-24.04` (amd64) and `ubuntu-24.04-arm` (arm64) runners. Each pushes by digest, with the version baked in as a build arg and per-arch GHA cache.
    3. **`smoke`**: per arch, against the digest.
    4. **`merge`**: creates the manifest list and tags `latest`, `sha-<short>`, and semver when `plan` says so.
    5. **`release`**: the real semantic-release run, which creates the git tag, the GitHub release and the changelog.
  - Docker Hub credentials come from repository secrets.
- **The `GITHUB_TOKEN` gotcha.** A tag pushed with `GITHUB_TOKEN` doesn't trigger other workflows. Running the semver publish **inside the same workflow as the release** avoids it, with no GitHub App and no PAT.
  - The image is tagged before the git tag exists, so a tag never points at an image that failed to build or smoke.
  - semantic-release doesn't commit back to `main`. The version lives in the tag and the image, not in `package.json`.
- **Image smoke jobs:**
  - The dispenser output passes `bash -n`, with nothing but the script on stdout.
  - The merged manifest lists both `linux/amd64` and `linux/arm64`.
  - `pandoc --version` reports 3.13, and `typst --version` runs.
  - A tiny Markdown file converts to DOCX, EPUB and PDF (via Typst) inside the image. This is the engine-level export check that stands in for export in the e2e. The Compile & export spec may add an app-level step.
  - `docker run` with no sidecar returns 200 from `/healthz`.
  - An FTS5 `MATCH` query through `node:sqlite` returns a row.

### Smoke tests

These are manual, pre-release checklist items, run on real hardware and a real tailnet. They're written up as a runbook in `deploy/`, and the outcomes go in `docs/adr/`.

- **ST-1, late login with HTTPS Serve.**
  1. Start compose with no auth key. The app is healthy on loopback.
  2. Log in later through the auth URL (read from the LocalAPI status or `docker compose logs`).
  3. Within a minute, `https://scriba.<tailnet>.ts.net` serves the app with a valid certificate. It still does after `docker compose restart` and after a host reboot.
  4. `http://scriba` and `http://<100.x>:8080` both fail.
  - Run it with `TS_SERVE_CONFIG` first. If that fails, run the CLI loop. **The variant that passes is the one that ships**, recorded in an ADR, and compose is updated to match.
- **ST-2, SSE unbuffered through Serve.** Over the tailnet URL, `POST /api/platform/echo` with 10 events, 1 s apart. Each `platform/echo` envelope arrives on `/events` within about 250 ms of its `sentAt` (not batched), and over HTTP/2.
- **ST-3, host Ollama.** On a Mac (Docker Desktop) and on Linux (Docker Engine), `GET http://host.docker.internal:11434/v1/models` from inside the `scriba` container returns 200 with Ollama running on the host. Linux needs Ollama bound beyond `127.0.0.1` (for example, `OLLAMA_HOST` set to the bridge or `0.0.0.0`). That requirement is recorded as installer and setup guidance.
- **ST-4, userspace mode.** Deferred.

## Phases

The phases are serial. **`phase:scaffold` is the gate every other module's first phase names.** It also publishes Platform's `/platform` contract slice, instead of a separate `phase:contract` (see Further Notes).

The M-numbers in the phase names are product milestones. **M1** is the walking skeleton, done when the author types "summarize my outline" and gets a correct answer with visible tool calls. **M6** is the fiction pack, done when a dialogue scene between two characters keeps each voice distinct and respects their relationship notes.

Milestones referenced here: M2 is the tool registry, M3 is review and grounding, M4 is canvas, and M5 is compile and export.

### `phase:scaffold`, M1

Blocked by: nothing.

Scope:
- Root workspaces, lockfile, pins, and the `dev` / `build` / `test` / `lint` scripts. The generated `apps/web` with the minimal proxy (handed to the Frontend shell).
- `@bbartolome/scriba-contracts` with all ten subpaths, nine of them empty. The `/platform` slice: SSE envelope base and Platform members, `SCRIBA_*` env names, base error shape and code convention, `/healthz` response, app version info.
- The API composition root: serve-static with SPA fallback, env parsing, app-state folder check, the tailnet-address connection filter, the global error filter, the Zod validation pipe, `/healthz`, version info.
- `GET /events` with the publisher, hello, heartbeat and the `POST /api/platform/echo` diagnostic.
- The `settings.yaml` startup migration hook and section registration (per-section `schemaVersion`).
- The `create-test-app` helper for API tests.
- The module-boundaries lint rule.
- `ci.yml`: one job, npm ci → lint → test → build, plus the PR-title check.

Acceptance criteria:
- [ ] On a fresh clone, `npm ci && npm run dev` serves the placeholder web app through the Angular dev server. `/api`, `/healthz` and `/events` are proxied to the API.
- [ ] `npm run build`, `npm test` and `npm run lint` pass from the root and cover every workspace.
- [ ] All ten `@bbartolome/scriba-contracts/<module>` subpaths resolve in both the API runtime and the Angular build. There's no root barrel export.
- [ ] `GET /healthz` returns `{status:'ok', version}` with 200. `GET /api/platform/version` returns the version info shape.
- [ ] A client on `/events` gets `platform/hello` first. `POST /api/platform/echo` delivers `count` `platform/echo` envelopes in order to every open stream. A heartbeat comment arrives at least every 15 s.
- [ ] An invalid request body to a test controller using the pipe returns `PLATFORM_VALIDATION_FAILED` in the base error shape. An unknown `/api` route returns `PLATFORM_NOT_FOUND`. A non-API path returns `index.html`.
- [ ] A `settings.yaml` with a test section that's behind gets backed up and migrated by that section's registered steps before `/healthz` answers. A newer envelope or section `schemaVersion` makes the app exit non-zero with a clear message naming the section.
- [ ] A test using `create-test-app` boots the app against a temp library on an ephemeral port and reads `/healthz` and `/events`.
- [ ] An unwritable `/books/.scriba/` makes the app exit non-zero with a message naming the UID/GID.
- [ ] A connection from a Tailscale-range peer address is refused. A loopback one isn't. (The address check is tested directly; ST-1 confirms it for real.)
- [ ] A test import from `modules/graph-runner` into `modules/agent-loop` (and the reverse) fails lint.
- [ ] `ci.yml` is green on the scaffold PR.

Demo (under 5 minutes):
1. `npm ci && npm run dev`, then open the dev URL and see the placeholder app.
2. `curl localhost:8080/healthz`.
3. In one terminal, `curl -N localhost:8080/events` shows `platform/hello`. In another, `curl -X POST …/api/platform/echo` with `{count:3, intervalMs:500}`, and three echo envelopes stream in.
4. Copy `settings.yaml` with a high `schemaVersion` into the dev library, restart, and see the refusal message.

### `phase:test-harness`, M1

Blocked by: `phase:scaffold`.

Scope: the mock OpenAI server with scenario selection, request recording, reset, and the two baseline scenarios; `npm run mock:openai`; the Playwright harness and the e2e test with five placeholder steps; e2e added to `ci.yml`.

Acceptance criteria:
- [ ] The official `openai` SDK, pointed at `…/scenario/tool-call/v1`, gets a streamed tool call with arguments split across chunks, then a final text answer after the tool result is sent.
- [ ] The `malformed-tool-call` scenario returns invalid tool-call arguments on the first turn and valid ones on the retry.
- [ ] A scenario can return a status with headers (for example 429 with `Retry-After`), delay, or drop the connection. The recorded requests are readable and resettable per scenario.
- [ ] Two tests using different scenarios in parallel don't interfere.
- [ ] `npm run e2e` boots the app against a temp library and the mock server, passes the app-loads check, and reports the five journey steps as pending.
- [ ] CI runs the e2e and uploads Playwright traces on failure.

### `phase:image-compose`, M1 (release track; not needed for the dev-server M1 demo)

Blocked by: `phase:scaffold`.

Scope: the two-stage Dockerfile, the entrypoint (app or `SETUP=true` stub), `deploy/` compose with both services and the shipped Serve config candidate, the healthcheck, and a local multi-arch build script.

Acceptance criteria:
- [ ] `docker build` produces an image whose runtime stage has Node LTS, Pandoc 3.13, Typst, `ca-certificates`, and no git or compiler. The size is measured and recorded.
- [ ] `docker run` with no sidecar and no library mount fails clearly on the app-state check. With a writable `/books` mount, `/healthz` returns 200.
- [ ] `docker compose up -d` with no auth key reaches `healthy`. The app answers on `127.0.0.1:${SCRIBA_PORT}` and not on any other host interface.
- [ ] Files the app writes into the library are owned by `SCRIBA_UID:SCRIBA_GID` on the host.
- [ ] From the `scriba` container, as its non-root UID, `GET /localapi/v0/status` over the shared socket returns `BackendState` (`NeedsLogin` before login).
- [ ] `host.docker.internal` resolves inside the `scriba` container.
- [ ] The image builds natively on both amd64 and arm64.

### `phase:smoke`, M1 (release track)

Blocked by: `phase:image-compose`.

Scope: the ST-1 to ST-3 runbook in `deploy/`; running ST-1 to ST-3; the ADR recording the Serve mechanism; compose updated to match ST-1; the Linux Ollama guidance from ST-3.

Acceptance criteria:
- [ ] ST-1 passes for one Serve variant, and compose ships that variant. The ADR records both attempts and the result.
- [ ] ST-1's extra checks pass: `http://scriba` and `http://<100.x>:8080` are refused from another tailnet device.
- [ ] ST-2 passes: echo envelopes arrive unbatched over the tailnet URL.
- [ ] ST-3 passes on a Mac and on Linux, and the Linux host-binding requirement is written into the installer hint and the setup guidance.
- [ ] The runbook names ST-4 as deferred.

### `phase:installer`, M1 (release track)

Blocked by: `phase:smoke` (the compose it installs is final).

Scope: the dispenser script emitted by `SETUP=true`, first install, re-run/update with backup and merge, the `SCRIBA_COMPOSE_VERSION` stamp, `compose.override.yaml` handling, and the documented fast path, pinning and rollback.

Acceptance criteria:
- [ ] On a clean machine, the one-liner checks Docker and Compose v2, creates `~/Books/.scriba/`, writes `.env` (with the host UID/GID), the compose file and an optional `.secret` (0600), starts the stack, waits for healthy and prints the setup URL. It falls back to the loopback URL if `setup-url` isn't there yet.
- [ ] With no TTY, first install uses defaults without prompting. Nothing but the script ever goes to the dispenser's stdout.
- [ ] A missing Docker or Compose v2 aborts before anything is written.
- [ ] On re-run with `.env` present, nothing prompts. `.env` and the compose file are backed up with a timestamp. Existing `.env` values are kept, new keys are added, `SCRIBA_COMPOSE_VERSION` is updated, and `compose.override.yaml` is untouched.
- [ ] Running the re-run twice in a row changes nothing beyond new backups.
- [ ] Setting `SCRIBA_IMAGE_TAG` to an older tag and running `up -d` rolls back. This is documented with the backup restore.

Demo (under 5 minutes):
1. In an empty folder, run `docker run --rm -e SETUP=true bbartolome/scriba | bash`, accept the defaults, and watch it print the setup URL.
2. Open the URL on the Mac. Show `~/Books/.scriba/` and the file ownership.
3. Re-run the one-liner. It's silent: show the backups and the unchanged `.env`.
4. `docker compose ps` shows both services healthy.

### `phase:ci-publish`, M1 (release track)

Blocked by: `phase:installer`.

Scope: `publish.yml` (plan → build matrix → smoke → merge → release), the semantic-release config, Docker Hub secrets, the image smoke jobs, and the pre-release checklist linking the ST runbook.

Acceptance criteria:
- [ ] A push to `main` with no releasable commit publishes `latest` and `sha-<short>` for both arches and creates no git tag.
- [ ] A push with a `feat:` or `fix:` commit publishes the semver tag too, then creates the git tag and GitHub release. The image reports that semver from `/healthz`.
- [ ] A failure in any build or smoke job leaves no new tag on Docker Hub and no git tag.
- [ ] All the smoke checks listed under Implementation Decisions pass on both arches.
- [ ] No step relies on a tag push triggering another workflow, and no PAT or App token is required.

### `phase:examples-check`, M1, extended through M6 as the samples grow

Blocked by: `phase:test-harness`; the Project store's `phase:contract` (`project.yaml` and the entity front-matter base); the Graph runner's `phase:contract` (graph schema); the Tool registry's `phase:loader-validation` (recipe tool references, entity-type validators).

Scope: the `examples/` check wired into `lint`, the excluded-folder check, the reference-resolution check, and the rule that unit tests don't read `examples/`.

Acceptance criteria:
- [ ] Every `project.yaml` under `examples/` parses with the Project store schema. Every entity's front matter parses with the entity base, and every `graphs/` file parses with the Graph runner schema.
- [ ] Every recipe tool node names a built-in tool, and its params validate against that tool's inputs.
- [ ] A sample containing `.scriba/`, `logs/`, `snapshots/` or `drafts/.versions/` fails the check.
- [ ] A deliberately broken sample file fails CI with the file path and the schema issue.
- [ ] The check passes on an `examples/` folder that holds only the nonfiction skeleton, and keeps passing as later milestones add content.

## Contracts

### Produces: `@bbartolome/scriba-contracts/platform` (in `phase:scaffold`)

- **SSE envelope:** `{module, type, data}`. `module` is the enum of publishing module slugs. Each module's slice declares its own `type`/`data` members as a discriminated union. Platform members: `platform/hello {streamId, version, serverTime}` and `platform/echo {seq, sentAt}`.
- **Stream constants:** the events route (`/events`), retry hint, heartbeat interval, the echo diagnostic route and its request `{count, intervalMs}`.
- **`SCRIBA_*` env names** with their defaults (the table above).
- **Base error shape:** `{error: {code, message, details?}}`, the code convention (SCREAMING_SNAKE with a module prefix), and Platform's codes `PLATFORM_VALIDATION_FAILED`, `PLATFORM_NOT_FOUND`, `PLATFORM_PAYLOAD_TOO_LARGE`, `PLATFORM_INTERNAL`.
- **`/healthz` response:** `{status: 'ok', version}`.
- **App version info:** `{version, revision, builtAt, composeVersion}`.
- **Module slugs** (shared by subpaths, API route prefixes and the envelope's `module`): `platform`, `setup-auth`, `providers`, `project-store`, `tool-registry`, `agent-loop`, `graph-runner`, `compile-export`, `shell`, `genre-packs`.
- **`settings.yaml` envelope:** the top-level `schemaVersion` and the fixed section keys (`projects`, `providers`, `tools`, `agent`, `setupAuth`).

Also produced but not contracts: nine empty subpaths ready for their owners; the composition root's registration point; the injectable stream publisher; the Zod validation pipe; the `settings.yaml` section and migration registration; the mock OpenAI server and its scenario format; the Playwright harness and e2e test; `ci.yml` / `publish.yml`; compose; the installer.

### Consumes

- **Project store** (`phase:contract`): the `project.yaml` schema and the generic entity front-matter base, for the examples check.
- **Graph runner** (`phase:contract`): the graph file schema, for the examples check.
- **Tool registry** (`phase:loader-validation`): the pack-lint library entry point (recipe tool-reference `params` validation and entity-type validators), for the examples check.
- **Setup & auth** (`phase:token-guard`): Platform's guarded routes (`/events`, version info, echo) adopt its global guard. `/healthz` stays exempt.

### Who builds on Platform

- **Every module:** `phase:scaffold` (workspace, contracts subpath, composition root, error shape, publisher).
- **Model providers, Agent loop, Tool registry, Graph runner:** add mock OpenAI scenarios (`phase:test-harness`).
- **Setup & auth:** the LocalAPI socket volume and `SCRIBA_TS_SOCKET` (`phase:image-compose`), the compose-version pair (version info plus `SCRIBA_COMPOSE_VERSION`), the `setup-url` file the installer prints, and its e2e step.
- **Project store, Agent loop, Compile & export:** their e2e steps, and the baked `SCRIBA_EXAMPLES_DIR` / `SCRIBA_PACKS_DIR`.
- **Frontend shell:** takes over the generated web root and proxy, and builds its SSE client on the envelope plus `platform/echo`.

## Testing Decisions

- **What makes a good test:** it exercises external behaviour only (HTTP responses, SSE envelopes, files on disk, process exit codes, emitted scripts), never internal services or private functions. The one exception is the tailnet-address check, which can't be faked at the socket level in a test; it's tested as a predicate and confirmed by ST-1.
- **Primary seam: the running API's HTTP + SSE surface.** Boot the composed NestJS app against a temp library folder (and the mock OpenAI server where relevant). Assert on:
  - `/healthz` and version info;
  - the `/events` stream (hello first, echo order, fan-out to two streams, heartbeat, closing on backpressure);
  - error bodies for validation, not-found and internal errors;
  - SPA fallback;
  - `settings.yaml` on disk before and after migration (backup present, newer version refused with a non-zero exit);
  - the app-state folder check.
- **Contracts seam:** Zod tests for the `/platform` schemas (valid and invalid envelopes and error bodies), a test that every subpath resolves at runtime in Node and in the Angular build, and the examples check (`phase:examples-check`).
- **Mock OpenAI server:** tested through the official `openai` SDK as a client, the same way modules will use it: streamed tool calls, malformed arguments, status and delay steps, request recording, isolation between parallel scenarios.
- **Installer:** Vitest drives the emitted dispenser script in a temp `HOME` with a stub `docker` on `PATH` that records its calls and serves the `tar` extraction. Tests assert on files written, modes, `.env` merge results, backups, idempotence, no-TTY behaviour, the abort with no Docker, and stdout cleanliness.
- **Image:** the smoke jobs in `publish.yml` are the image's tests. Compose behaviour that needs a real tailnet or host is covered by the manual ST-1 to ST-3.
- **System seam:** the single Playwright e2e (setup → project from sample → agent run → accept change → manuscript). Platform owns the harness and the test. Modules turn on their step at their milestone. Export is excluded.
- **UI seam:** none for Platform. The placeholder web app is replaced by the Frontend shell.
- **Tooling:** Vitest everywhere, with NestJS via `unplugin-swc`.
- **Prior art:** none in this repo yet. Tride's `ci.yml`, `publish.yml`, `setup.sh` and installer compose are reference only for structure, as is the canvas spike's `e2e/spike.cjs`.

## Out of Scope

- **Owned by other specs:**
  - The web composition root, route table, proxy, API/SSE clients and theming after the handover (Frontend shell).
  - The setup token, guard, cookie, origin and Host checks, the GET-never-mutates test, the Tailscale login UI and the compose-mismatch warning UI (Setup & auth).
  - Section contents of `settings.yaml` and the secrets file (Model providers, Setup & auth).
  - Lazy per-project file migrations. Project store owns `examples/`, the "start from sample" mechanism and the nonfiction skeleton (M1). Each other sample addition belongs to the module whose milestone demos it: Genre packs for the nonfiction entities (M2) and the whole fiction sample (M6), Agent loop for the grounding-claims draft (M3), Graph runner for the nonfiction recipe (M4), and Compile & export for the `project.yaml` order field (M5).
  - App-level export (Compile & export).
  - The Typst quality spike and any TeX Live derived image (Compile & export).
- The manual real-model eval script (small and larger local model). It concerns the tool-calling loop and belongs with the Agent loop (Genre packs adds per-tool cases to it).
- ST-4, userspace networking mode (deferred).
- LAN mode and host `0.0.0.0` publishing, a second no-sidecar compose topology, a separate installer UI container, auto-update or Watchtower, an "update available" notice, a CLI reset-token, and per-user image layers.
- pnpm, Yarn, Nx, Turborepo, nginx, Caddy, WebSockets and OpenAPI code generation.
- **Replaced proposals** (each bullet states the current requirement and what it replaces):
  - The frontend is Angular with Angular Material and the backend is NestJS. This replaces React, Vite and Fastify or Hono.
  - The app is always published on loopback at `http://127.0.0.1:${SCRIBA_PORT:-8080}`. After an optional Tailscale login it is also reachable at `https://scriba.<tailnet>.ts.net`, over HTTPS on 443 only, with no plain-HTTP tailnet handler. This replaces "runs on localhost".
  - SQLite is used only for FTS5 search. A run-log index in SQLite is deferred, and `logs/` stays the source of truth. This replaces the SQLite run-log index.
  - Tool inputs are JSON Schema, not Zod. This replaces Zod for tool inputs. Platform's own contracts remain Zod.
  - Decisions are logged in `docs/adr/`. This replaces `DECISIONS.md`.

## Further Notes

- **Phase naming deviation.** By convention, a producer's first phase is `phase:contract`. Platform's first phase is `phase:scaffold`, because it creates the package every slice lives in. `phase:scaffold` publishes `/platform` and is the gate every module names. The work breakdown should treat `phase:scaffold` as Platform's contract phase.
- **Decisions this spec makes** (settled; do not reopen during implementation):
  - **The tailnet-address filter.** Listening on all interfaces is required for Docker's loopback publish, but it also exposes plain HTTP on `tailscale0`. Setup & auth additionally trusts `Tailscale-User-Login` only from a loopback peer (its spec implements this).
  - **The events route is `/events`.** The dev proxy covers `/api`, `/healthz` and the events route. The path is a constant, so it's cheap to move.
  - **Error codes use SCREAMING_SNAKE with a module prefix.** This matches the `PROVIDER_*` prefix that Model providers uses.
  - **The install folder is the current directory, kept outside the library,** so the app can't read `.secret`.
  - **semantic-release runs inside `publish.yml`.** It plans first, publishes images, and tags last. That's the option that needs no GitHub App or PAT.
  - **No SSE replay.** Reconnecting clients reconcile through state endpoints.
  - **`settings.yaml` ownership.** Platform owns the file envelope and the eager startup hook. Modules own their sections and the steps that migrate them.
- **Cookie `Secure` on `http://127.0.0.1`** is Setup & auth's to verify. Platform only guarantees one origin per access path.
- **The app controls tailscaled** through the shared socket. This is accepted for a single owner and should be stated in the README's security notes.
- **ST-1 changes compose.** This is why `phase:smoke` comes before `phase:installer`: the installer ships the compose that ST-1 approved.
- **Waves.** Wave 0 is Platform. Wave 1 is Frontend shell, Setup & auth, Model providers, Project store, Tool registry and Genre packs (nonfiction). Wave 2 is Agent loop, Graph runner and Compile & export. Wave 3 is the fiction pack and polish. Wave-1 modules start as soon as `phase:scaffold` closes. `phase:test-harness` follows right after, because Model providers and the Agent loop need the mock server. The release-track phases (image-compose → smoke → installer → ci-publish) can run alongside wave 1, since they only touch Platform-owned files. `phase:examples-check` finishes last because it waits on wave-1 and wave-2 contracts.
