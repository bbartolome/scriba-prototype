---
id: PLT-15
status: done
---
# PLT-15 plan — compose with Tailscale sidecar, shared socket and healthcheck

Revision 9, written by the planner against `main` at `005d85c` (the DECISIONS record of rejection 7, the revision-8 rejection; the code base is unchanged since `0412772`). Rejection history: revision 1 (rejection 1 of 3, `plans/DECISIONS.md` line 788); revision 2 (rejection 2 of 3, line 800); revision 3 (rejection 3 of 3, line 811), whose item 1 went to the Navigator and was decided on 2026-11-13 (`dffd203`, line 822); the file that Opus and the Navigator call revision 5 (rejection 4, `e02685e`, line 830); revision 6 (rejection 5, `4d37759`, line 842); revision 7 (rejection 6, `2226770`, line 851); revision 8 (rejection 7, `005d85c`, line 860). This file is labelled revision 9. The file is untracked; nothing is committed, pushed or added to a remote. Status is `planned` since the Opus approval of revision 9 (DECISIONS 2026-11-13, commit d8de76c). Sources: "unit" is `units/PLT-15-compose-sidecar.md`; "module" is `modules/platform.md`; "DECISIONS" is `plans/DECISIONS.md`. Section 7 lists the facts checked, with commands; section 8 lists what is assumed.

## Revision 9 changes

- **Item 1 (step 1, step 4, step 6).** Step 1 reads "Steps 2 to 6 and 10 run in `/tmp/plt15-wt`". Step 4 copies the worktree's `deploy/` into CFG with `cp -R /tmp/plt15-wt/deploy/. "${CFG:?}"/`; the main checkout's `deploy/` holds only `.gitkeep`. The six cases were re-run from a `cp -R` copy and gave the expected results (fact 28).
- **Item 2 (step 12, step 0, facts 22 and 27).** Step 12 now says `scriba-check2` stays untouched. The container was created from `bbartolome/scriba:dev` (image `9b392c90203c`, which `docker image inspect` reports absent), so step 0's list no longer names an untagged image. This corrects the image wording of revision 8.
- **Item 3 (section 5, PLT-18).** The health hand-off is recorded: only `scriba` has a healthcheck, `tailscale/tailscale` has none (fact 26), and PLT-18's demo step 4 should read "scriba healthy, tailscale running". No `tailscale` healthcheck is added.
- **Item 4 (non-blocking).** The stale "revision 7" wording at step 0, the criterion 4 note and section 8 is updated to revision 9. Step 9 adds the run-time `printenv SCRIBA_COMPOSE_VERSION` check, expecting `1`, as the only run-time check that the stamped `.env` value reaches the bare key; step 9b's unstamped check is unchanged.
- **Also.** The header and fact 2 cite HEAD `005d85c`, the rejection-7 record.

## Revision 8 changes

- **Item 1 (step 4).** Each case is written in full: `SCRIBA_LIBRARY=/tmp/x` in the command for (a), (c), (d) and (f); `env -u SCRIBA_COMPOSE_VERSION SCRIBA_LIBRARY=/tmp/x` for (e); `env -u SCRIBA_LIBRARY` for (b). The expected results are unchanged. The six forms were run in revision 8 against the compose text of this file (fact 25), and all six gave the expected results.
- **Item 2 (step 9b).** The restore command is written in full with the prefix: `docker compose -p plt15-check --project-directory "${INST:?}" up -d --wait`. Every other command in step 9b carries the prefix too.
- **Item 3 (fact 22, step 0).** `scriba-check2` is described from `docker inspect`: an existing exited container, created 2026-11-06, not made by this check. It is read only with `docker cp`, and step 0 leaves it alone with `tride`, `installer-tailscale-1` and the untagged image `9b392c90203c`. The two hosts lines match on re-check, and are kept.
- **Item 4 (fact 17, step 12).** Fact 17 is restated for revision 8: no `up`, build, pull or container start; the only daemon reads are listed. Step 12 says the branch `unit/PLT-15` stays, because it holds the commit from step 6, so the cleanup list matches the paths step 0 checks.
- **Also.** The header and fact 2 cite HEAD `2226770`, the rejection-6 record.

## Revision 7 changes

- **Item 1 (criterion 4).** The expected output is one IPv4 line, `<IPv4><TAB>host.docker.internal` (here `192.168.65.254`), with an IPv6 line recorded if one appears (`fdc4:f303:9324::254` on the existing exited `scriba-check2`, fact 22). The pass test is the IPv4 pattern grep exiting 0. The lookup command uses `{family: 4}` and must equal the IPv4 line. The in-container check is not run in this revision.
- **Item 2 (step 4).** Every config check is `docker compose --project-directory "${CFG:?}" config`, including the `env -u SCRIBA_LIBRARY` case. Step 4 prints `CFG`; step 11 records it next to `INST` and `LIB`; step 12 removes `${CFG:?}` with the other paths.
- **Item 3 (step 0, step 9, steps 11 and 12).** Step 0 adds the absent-path checks for `/tmp/plt15-wt` and `/tmp/plt15-fresh`, and an empty `git branch --list unit/PLT-15`. Step 9's `up` pulls `tailscale/tailscale:v1.104.4`, which is not on the daemon (only `tailscale/tailscale:latest`). Step 12 leaves that image in place on purpose, because PLT-16 reuses it, and step 11 lists it as left in place.
- **Item 4 (non-blocking).** The second telling of the revision 1 and 2 rejection history on line 7 is deleted. The two `ls -ln` citations of Decision A (item 3 of the revision 6 list, and criterion 1) now cite the "Plan changes" line of the 2026-11-13 entry (DECISIONS line 828).
- **Also.** The header and fact 2 cite HEAD `4d37759`, the rejection-5 record, as checked with `git rev-parse --short HEAD`.

## Revision 6 changes

- **Item 1 (open point 6, header, fact 2).** Open point 6 is retitled as resolved (DECISIONS 2026-11-13). The restated claim that Docker Desktop reports the reader's owner is dropped, and the probe wording is used. The header cites `e02685e` and rejection 4. Fact 2 gives HEAD as `e02685e`, not `dffd203`: HEAD is `e02685e` now (checked), and `dffd203`, the decision commit, is one below it.
- **Item 2 (open point 3).** It cites only Decision A (option b), Decision B (the process-UID proof is supporting evidence, not a substitute) and the native-leg sentence. The Navigator credit for criteria 1, 3 and 4 and for the process-UID half of criterion 2 is removed. The coverage of criteria 1, 3 and 4 is stated as the plan's own.
- **Item 3 (contradictions).** The sentence "Criterion 2's command block is left as written" is deleted. Section 8 says busybox is pulled by step 12 only. Step 12's reason is "the shell may be unable to remove files the app created". The Mac `ls -ln` is a recorded observation, per the "Plan changes" line of the 2026-11-13 entry (DECISIONS line 828). Step 9c called it criterion 2's; it is in criterion 1's recipe, so step 9c now says that.
- **Item 4 (step 11).** The record list adds "native Linux leg (criterion 2 `stat -c %u:%g` on the host path, open point 3): not run".
- **Item 5 (criterion 4).** A `/etc/hosts` grep is added, with the expected form and the failure case. The DNS lookup alone passes either way on Docker Desktop (checked: no hosts line, `nameserver 127.0.0.11`). Section 8 names the grep and marks the `network_mode` sharing as assumed. Not run: no stack is up, so the line inside `scriba` has not been seen.
- **Item 6 (cleanup).** Step 4's copies of `deploy/` go to `mktemp -d /tmp/plt15-cfg.XXXX`, removed in step 12. Step 0 adds the `plt15-check` image guard (checked: prints nothing).
- **Item 7 (non-blocking).** Section 1 has a row of its own for the `SCRIBA_LIBRARY` pass-through, sourced to the PLT-04 hand-off (DECISIONS line 413).

## Revision 5 changes

Navigator decision on criterion 2 (DECISIONS 2026-11-13, PLT-15; set_plan steps a1 to a5):

- **Decision A (option b).** Criterion 2 stays unticked and is marked cannot-test-locally. The unit is complete without the literal host-owner check.
- **Decision B.** The process-UID proof (`id -u` and `id -g` = 1001 in the container, and `.scriba/` created by that process) is supporting evidence that `user:` is applied. It is not a substitute for the host-owner check. The criterion wording is unchanged.
- **Native Linux leg (open point 3)** is optional, not required before status `done`; recorded as not run.
- **Step a1/a2.** The `ls -ldn` and busybox `stat` commands are removed from the criterion 2 test. The step 9c Mac `ls -ln` stays as a recorded observation with no pass or fail.
- **Driver correction to the Navigator's wording.** The Navigator's step a1 says Docker Desktop reports "the reader's UID". A probe on this daemon (DECISIONS 2026-11-13) did not show that: a file created by a root container read as `0:0` from root, `0:0` from UID 1001 and 4242, and `1000:1000` five seconds later, also from root. The owner shown is not the creator's UID and it changes between reads. The text below uses that wording.
- **Open points 3 and 6** record the decision.

## Revision 4 changes

- **Owner check (Opus rejection 3, item 1).** Not changed here, as instructed. Criterion 2's owner text is marked `[PENDING NAVIGATOR: owner check]`, and open point 6 records Opus's proposed correction for the Navigator.
- **Item 2 (paths and guards).** Step 9 prints and records the two `mktemp` paths. Later commands use the literal paths or `${INST:?}` and `${LIB:?}`, so an empty value stops the command. Step 9 re-runs the step-0 scriba guard before `up`. The whole check runs under `-p plt15-check`, not the compose file's fixed `name: scriba`: this keeps the check's containers and volumes apart from any real install, and makes `down -v` reach only the check's project. The step-0 guards cover both names.
- **Item 3 (cleanup scope).** The root container now removes only `/l/.scriba` in the library. The shell then removes `"${LIB:?}"` and `"${INST:?}"`. Refused removals are recorded in step 11, as PLT-14 did.
- **Item 4 (image tag).** The build and `.env` use the new tag `plt15-check`, removed in step 12. PLT-14's `bbartolome/scriba:local-arm64` (ID `a5fca3e65422`) is not retagged. Section 5's PLT-16 sentence follows this.
- **Non-blocking.** Fact 2 names `086f4e0` as HEAD. Fact 14 cites the per-mount flag and the `af_unix.c` line 1223 basis. The Mac recipe has `sleep 1` after the server starts.

## Revision 3 changes

- **Item 1 (step 0 guard).** Step 0 stops if `docker compose ls -a` shows a `scriba` row, or if `docker volume ls -q --filter name=scriba_` prints anything. Checked now: `ls -a` lists `devcontainer`, `homelab`, `installer` and `ui-kit`, with no `scriba` row, and the filter prints nothing.
- **Item 2 (LAN hand-off).** New step 9c leaves the step-9 stack up and hands the Mac-terminal recipe and the `$INST` and `$LIB` paths to the Navigator. Step 12 runs only after the LAN result is recorded (step 11) or the Navigator defers it. Criterion 1 stays unticked until then.
- **Item 3 (criterion 2 ownership).** Criterion 2 now says that `ls -ldn` and busybox `stat` read Docker Desktop's file-sharing view, not the Mac's owner. The Mac-terminal recipe adds `ls -ln "$LIB/.scriba"` as a recorded observation with no pass or fail on 1001. The literal "owned on the host" is exact only on the native Linux leg, which now also records bind-mount ownership (open point 3). Criterion 2's checkbox stays unticked until that leg runs, or the Navigator accepts the view check.
- **Item 4 (socket mount).** The socket is mounted `tailscale-socket:/var/run/tailscale:ro` on `scriba`, and stays read-write on `tailscale`, which creates it. The section 1 reason is corrected: `connect()` checks write permission on the socket inode's mode bits, and the read-only mount check does not apply to sockets (kernel source, section 7, fact 14). Criterion 3 proves it.
- **Item 5 (Dockerfile line).** `USER 1000:1000` is Dockerfile line 63; line 64 is `ENTRYPOINT`; line 60 is the `COPY` of `deploy/` (checked).
- **Non-blocking (section 5, PLT-16).** The loopback publish does not make `http://<100.x>:8080` refused. `scriba` listens on all interfaces in the shared namespace, which includes `tailscale0`, so the refusal comes from PLT-08's tailnet filter. The bullet is reworded that way.

## Revision 2 changes

- **Item 1 (criterion 1).** The shell is a container (`/.dockerenv`), so the positive probe now runs from the shell at `http://host.docker.internal:18080/healthz` (resolves to `192.168.65.254`, checked). Added `docker inspect` of the `tailscale` container's `PortBindings`, expecting only `HostIp 127.0.0.1`. The LAN half is marked "cannot test locally" with its cause (the shell cannot see the Mac's LAN address), and it has a Mac-terminal recipe with a positive control.
- **Item 2 (step 9).** The install folder and the library are created under `/Users/bbartolome/workspace` with `mktemp -d`, and removed in step 12 with a busybox `rm`. Added a check that `docker compose exec -T tailscale cat /config/serve/serve.json` is byte-identical to the committed file.
- **Item 3 (criterion 2).** The test pair is `1001:1001` with `chmod 0777` on the library, so the default `1000` cannot pass by accident. Expected values come from `ls -ldn`, `busybox stat` in a second container, and `id -u` / `id -g` in the container. Criterion 3's expected UID is now `1001`. The Dockerfile's `USER 1000:1000` is on line 63.
- **Item 4 (`SCRIBA_COMPOSE_VERSION`).** Chosen: the bare key `SCRIBA_COMPOSE_VERSION:` with no default. Unset gives an absent variable, so the app sees `undefined` and SAU-10 reports `unknown` (SAU-10 line 19, criterion line 24). The deviation list is empty. SAU-16 line 24 still shows the warning when unset. Step 4 checks how `.env` values resolve, and step 9b checks the unset case at run time.
- **Item 5 (hosts).** The daemon is Docker Desktop on the Mac (`docker info`: Docker Desktop, kernel `7.0.14-linuxkit`, `aarch64`), and it is the only daemon here. Criteria 1 to 4 are tested on it, from this shell. "Cannot test locally" now covers only the native Linux Engine leg (not available here) and the LAN half of criterion 1. The planning-run reason is removed.
- **Item 6 (open point 2).** Closed. SAU-20 line 15 shows the "HTTPS certificates off" hint pointing to the admin console, and SAU-17 lines 21 and 22 derive `httpsCertsEnabled` from an empty `CertDomains`.
- **Non-blocking a (criterion 5).** The test passes `staticRoot: resolve(__dirname, 'fixtures/static')`, as `healthz-version.test.ts` line 8 does, so it does not depend on the web build.
- **Non-blocking b (criterion 1).** The running stack is also asked for `/api/platform/version`, which must show `composeVersion` 1.
- **Non-blocking c (open point 1).** `depends_on.tailscale.restart: true` is in the draft. It covers restarts that Compose drives. Open point 1 now asks only about crash restarts by the daemon.

## 1. Decisions this plan follows

| Decision | Source |
|---|---|
| Services `tailscale` and `scriba`; `scriba` uses `network_mode: service:tailscale`. The loopback publish sits on `tailscale`, which owns the shared namespace. | unit lines 20–21 |
| `tailscale`: kernel mode (`TS_USERSPACE=false`, `/dev/net/tun`, `NET_ADMIN`); `TS_HOSTNAME=scriba`; `TS_STATE_DIR` on a named state volume; `TS_SOCKET=/var/run/tailscale/tailscaled.sock`; `extra_hosts` `host.docker.internal:host-gateway`; publish `127.0.0.1:${SCRIBA_PORT:-8080}:8080`. | unit line 21 |
| `.secret` is an optional env file of `tailscale`. Without `TS_AUTHKEY` the login is interactive. | unit line 21; module line 38 (`.secret` stays outside the library) |
| Serve: a candidate `TS_SERVE_CONFIG` with a `${TS_CERT_DOMAIN}:443` HTTPS handler proxying `http://127.0.0.1:8080`. No 60-second give-up, no `--http=80` handler. ST-1 (PLT-16) decides whether it ships. | unit line 22; module line 42; PLT-16 unit, Decisions (ST-1) |
| Shared socket volume at `/var/run/tailscale` in both services. The app's non-root UID calls `GET /localapi/v0/status`. App control of tailscaled is accepted for a single owner. The mount on `scriba` is read-only (choice below). | unit line 23; module line 44; SAU-17 line 20 (the app only reads status) |
| `scriba`: `image: bbartolome/scriba:${SCRIBA_IMAGE_TAG:-latest}`; `user: ${SCRIBA_UID:-1000}:${SCRIBA_GID:-1000}`; bind `${SCRIBA_LIBRARY}:/books`; `SCRIBA_COMPOSE_VERSION` and `SCRIBA_PORT` passed through; healthcheck is a Node one-liner on `http://127.0.0.1:8080/healthz`. | unit line 24; PLT-14 plan section 5 (UID 1000, `/books`, `node` on PATH) |
| `init: true` and `restart: unless-stopped` on both services. | unit line 25 |
| `compose.override.yaml` belongs to the author. The installer never writes it. | unit line 26; PLT-18 unit line 23 |
| `SCRIBA_COMPOSE_VERSION` is an integer constant shipped in `deploy/`, bumped when compose or the `.env` key set changes. It is wired to PLT-04's `composeVersion`, and PLT-15 owns the value. | unit line 27; PLT-04 unit line 25; DECISIONS 2026-11-11 "PLT-02, PLT-03, PLT-09 — smaller plan choices accepted as drafted", item 2 |
| Unset `SCRIBA_COMPOSE_VERSION` means `unknown`; a set value is compared. | SAU-10 lines 19 and 24 |
| `deploy/` is Platform-owned and is touched on the release track. | module line 30 |
| No LAN publishing, no `0.0.0.0` publish, no second compose topology. | module line 51 |
| Tests exercise external behaviour; Vitest everywhere. | module lines 55 to 58 |
| Env names and defaults: `SCRIBA_PORT` 8080, `SCRIBA_UID` and `SCRIBA_GID` 1000, `SCRIBA_IMAGE_TAG` latest, `SCRIBA_TS_SOCKET` default path. The `.env` keys the installer writes. | PLT-02 unit lines 40 to 51; `packages/contracts/src/platform/env.ts` |
| Pass `SCRIBA_LIBRARY` through to the app, as well as the bind mount. | DECISIONS line 413, in the entry "PLT-04 — Opus plan review of revision 2: APPROVED (point 1 still open)", 2026-11-12 ("a PLT-15 handoff to pass the variable through") |
| `SCRIBA_LIBRARY=""` and an empty `SCRIBA_COMPOSE_VERSION` are refused by the app, so PLT-15 must not pass an empty value. | DECISIONS 2026-11-12 "PLT-04 — Opus plan review of revision 3: APPROVED (point 1 still open)"; `apps/api/src/modules/platform/boot/env.ts` |
| The image runs as UID 1000 (`USER` line 63 of the Dockerfile), has `/books` as the library mount point, `node` on PATH, the app on 8080, and `deploy/` copied to `/opt/installer`. | PLT-14 plan section 5; `Dockerfile` lines 60 and 63 |

Choices this plan makes (the sources leave them open; each is small):

| Choice | Reason |
|---|---|
| Compose file `deploy/compose.yaml`, with top-level `name: scriba`. | Compose loads `compose.override.yaml` automatically only under the default file name. A fixed project name keeps volume names the same in any install folder. |
| Pin `tailscale/tailscale:v1.104.4`. | Docker Hub has this tag (checked). The upstream code at that tag implements `TS_SERVE_CONFIG` with `${TS_CERT_DOMAIN}`. `v1.104.6`, the newest release (2026-11-11), has no Docker Hub tag yet. A pinned tag means an image change is a `deploy/` change, which bumps the compose version. |
| `env_file` in long form with `required: false`. | The short form fails when `.secret` is absent (checked), and `.secret` is optional. |
| `depends_on.tailscale` with `restart: true`, next to `condition: service_started`. | When Compose restarts or recreates `tailscale`, `scriba` is restarted too, so it rejoins the new namespace. Accepted by Compose v5.6.0 (checked). Crash restarts are not covered (open point 1). |
| Serve config in its own folder, `deploy/serve/serve.json`, mounted as `./serve:/config/serve:ro`. | Containerboot watches the config's folder. A single-file bind mount keeps the old file after a replacement by the installer or PLT-18. |
| `SCRIBA_LIBRARY` written as `${SCRIBA_LIBRARY:?set SCRIBA_LIBRARY in .env}`, in both the bind mount and the app environment. | The app refuses an empty value. `:?` stops compose when the variable is unset or empty (checked). |
| `SCRIBA_COMPOSE_VERSION:` as a bare key, with no default. | Unset gives an absent variable, so the app reports `unknown` (SAU-10 line 19). A `:-0` default would report a false `mismatch` against 0 (SAU-10 line 24). SAU-16 line 24 still shows the warning when unset. Checked in section 7, fact 10. |
| `SCRIBA_TS_SOCKET` written as a literal path on `scriba`; `SCRIBA_PORT: ${SCRIBA_PORT:-8080}`. | A literal path cannot be empty. The port follows the loopback publish. |
| Shipped integer `deploy/compose-version` containing `1`, and the app constant `EXPECTED_COMPOSE_VERSION = 1`. | The installer (PLT-17, PLT-18) needs a file to read. The app should not read `deploy/` at run time: in the image it is at `/opt/installer`, in dev at `deploy/`. So the constant is a copy, and a test checks that the two match. |
| Test pair `SCRIBA_UID=1001`, `SCRIBA_GID=1001`, for the Docker checks only. The shipped default stays 1000. | The pair differs from the image's `USER 1000:1000`, so a compose that ignored `user:` would fail criteria 2 and 3. PLT-14's review ran `501:20` and got `/healthz` 200, so a non-default UID runs the app. |
| Socket volume mounted `tailscale-socket:/var/run/tailscale:ro` in `scriba`; read-write in `tailscale`, which creates the socket. | `connect()` checks write permission on the socket inode's mode bits, not on the mount. The read-only mount check does not apply to sockets (kernel source, fact 14), so `:ro` still lets the app connect. It stops the app writing into the volume, which matches SAU-17 line 20 ("the app only ever reads status"). Criterion 3 proves the connect. |
| Healthcheck `interval: 10s`, `timeout: 5s`, `retries: 3`, `start_period: 10s`. | The unit does not fix these. The one-liner's exit codes were checked on Node 26 (section 7). |
| Delete `deploy/.gitkeep`. | The folder holds real files now. DECISIONS 2026-11-12 "PLT-14 — Opus plan review of revision 3" (item 6) notes that a placeholder would be extracted into the install folder. |
| AC 5 test in `apps/api/test/compose-version.test.ts`. | Platform's testing principle: Vitest, external behaviour, run by `npm test`. |

## 2. Files to create or change

| Path | Change | Purpose |
|---|---|---|
| `deploy/compose.yaml` | new | Services `tailscale` and `scriba`; named volumes `tailscale-state` and `tailscale-socket` (spec below). |
| `deploy/serve/serve.json` | new | Candidate Serve config (spec below). |
| `deploy/compose-version` | new | One line: `1`. |
| `deploy/.gitkeep` | deleted | Placeholder no longer needed. |
| `apps/api/src/modules/platform/compose-version.ts` | changed | `EXPECTED_COMPOSE_VERSION = 1`; the placeholder comment goes. |
| `apps/api/test/compose-version.test.ts` | new | Criterion 5 test (spec below). |

Not changed: `Dockerfile` (line 60 already copies `deploy/`), `.dockerignore`, `scripts/*`, `packages/contracts` (no new `SCRIBA_*` name), `apps/api/src/modules/platform/boot/env.ts`, `build-info.ts`, `.github/workflows/*`, and every README (PLT-18 owns the security note). No `.env`, `.secret` or `compose.override.yaml` is committed; the checks create them in folders under `/Users/bbartolome/workspace`, or in temp folders for the config-only probes.

`deploy/compose.yaml` (the implementer writes this, then runs step 3 of section 3; the draft passed `docker compose config` in the probes of section 7):

```yaml
name: scriba

services:
  tailscale:
    image: tailscale/tailscale:v1.104.4
    init: true
    restart: unless-stopped
    env_file:
      - path: .secret
        required: false
    environment:
      TS_USERSPACE: 'false'
      TS_HOSTNAME: scriba
      TS_STATE_DIR: /var/lib/tailscale
      TS_SOCKET: /var/run/tailscale/tailscaled.sock
      TS_SERVE_CONFIG: /config/serve/serve.json
    cap_add:
      - NET_ADMIN
    devices:
      - /dev/net/tun:/dev/net/tun
    extra_hosts:
      - 'host.docker.internal:host-gateway'
    ports:
      - '127.0.0.1:${SCRIBA_PORT:-8080}:8080'
    volumes:
      - tailscale-state:/var/lib/tailscale
      - tailscale-socket:/var/run/tailscale
      - ./serve:/config/serve:ro

  scriba:
    image: bbartolome/scriba:${SCRIBA_IMAGE_TAG:-latest}
    init: true
    restart: unless-stopped
    network_mode: service:tailscale
    depends_on:
      tailscale:
        condition: service_started
        restart: true
    user: '${SCRIBA_UID:-1000}:${SCRIBA_GID:-1000}'
    environment:
      SCRIBA_PORT: ${SCRIBA_PORT:-8080}
      SCRIBA_LIBRARY: ${SCRIBA_LIBRARY:?set SCRIBA_LIBRARY in .env}
      SCRIBA_COMPOSE_VERSION:
      SCRIBA_TS_SOCKET: /var/run/tailscale/tailscaled.sock
    volumes:
      - ${SCRIBA_LIBRARY:?set SCRIBA_LIBRARY in .env}:/books
      - tailscale-socket:/var/run/tailscale:ro
    healthcheck:
      test: ['CMD', 'node', '-e', "fetch('http://127.0.0.1:8080/healthz').then((r) => process.exit(r.ok ? 0 : 1), () => process.exit(1))"]
      interval: 10s
      timeout: 5s
      retries: 3
      start_period: 10s

volumes:
  tailscale-state:
  tailscale-socket:
```

`deploy/serve/serve.json` has one object: `TCP` with `"443": {"HTTPS": true}`, and `Web` with `"${TS_CERT_DOMAIN}:443"` whose `Handlers` `"/"` has `Proxy` `http://127.0.0.1:8080`. Step 3 formats it.

`apps/api/src/modules/platform/compose-version.ts` becomes:

```ts
// The compose version this image expects. Must equal deploy/compose-version (checked by test/compose-version.test.ts).
export const EXPECTED_COMPOSE_VERSION = 1;
```

`apps/api/test/compose-version.test.ts` has one `it`. It boots `createTestApp({ libraryDir, staticRoot: resolve(__dirname, 'fixtures/static') })` with a temp library, as `healthz-version.test.ts` does. It reads `resolve(__dirname, '..', '..', '..', 'deploy', 'compose-version')` as an integer. It fetches `/api/platform/version` and expects status 200, a body whose `composeVersion` equals that integer, and an integer above 0. It closes the app and removes the temp library in `finally`, because `createTestApp` removes only a library it created itself.

## 3. Method

Run from `/Users/bbartolome/workspace/scriba-prototype` unless a step names another path. The Docker checks run from this shell against the Docker Desktop daemon. Record `node -v`, `npm -v`, `docker version --format '{{.Server.Version}}'` and `docker info --format '{{.OperatingSystem}}'` beside the results. Do not push, add a remote or open a PR.

0. Guards. `git branch --show-current` prints `main`. `git status --short -- ':!plans'` prints nothing. `git remote` prints nothing. `git diff --quiet 0412772 main -- ':!plans'` exits 0. `docker context show` prints `default`. `docker compose ls -a` shows no row named `scriba` and no row named `plt15-check`, and `docker volume ls -q --filter name=scriba_` and `--filter name=plt15-check_` both print nothing. `docker image ls bbartolome/scriba:local-arm64 --format '{{.ID}}'` prints `a5fca3e65422` (the PLT-14 image, which must stay). `docker image ls -q bbartolome/scriba:plt15-check` prints nothing (checked at revision 6, fact 21, and again by the Opus reviewer at revision 9). `test ! -e /tmp/plt15-wt && test ! -e /tmp/plt15-fresh` succeeds, and `git branch --list unit/PLT-15` prints nothing; steps 1 and 7 create those paths and the branch. Any failure stops the run: a leftover project or state volume would hold an earlier Tailscale login, and criterion 3 would then print `Running`, not `NeedsLogin`. `docker ps --format '{{.Names}} | {{.Ports}}'` shows no published port 18080. Leave these alone: `tride` (no ports), `installer-tailscale-1` (`127.0.0.1:2222`), the existing exited container `scriba-check2` (created 2026-11-06 from `bbartolome/scriba:dev`; read only with `docker cp`, never started, removed or changed). Its image `9b392c90203c` is not on the daemon (`docker image inspect` reports it absent), so nothing here touches an image for it. If a check differs, stop and report.
1. Branch. `git worktree add -b unit/PLT-15 /tmp/plt15-wt main`. Steps 2 to 6 and 10 run in `/tmp/plt15-wt`.
2. Install and write. `npm ci` (expected exit 0). Write the files of section 2 and run `git rm deploy/.gitkeep`. Expected: `git status --short` lists only those paths.
3. Format. `node_modules/.bin/prettier --write deploy/compose.yaml deploy/serve/serve.json`, then `node_modules/.bin/prettier --check .`. Expected: exit 0. The root lint gate runs `prettier --check .`, and `.prettierignore` does not exclude `deploy/`. The unformatted draft fails this check (section 7).
4. Compose gates, no daemon needed. `CFG=$(mktemp -d /tmp/plt15-cfg.XXXX)`; print `CFG` (step 11 records it; step 12 removes it); copy the worktree's `deploy/` into it with `cp -R /tmp/plt15-wt/deploy/. "${CFG:?}"/` (after steps 2 and 3; the main checkout's `deploy/` holds only `.gitkeep`). Every config check runs as `docker compose --project-directory "${CFG:?}" config`, so nothing depends on the current folder. The shell has no `SCRIBA_*` variables, and `${SCRIBA_LIBRARY:?…}` makes `config` exit 1 unless the case sets it, so each case sets every variable it depends on. Each probe adds, and then removes, its own `.env` or `.secret` under `"${CFG:?}"`:
   (a) `SCRIBA_LIBRARY=/tmp/x SCRIBA_IMAGE_TAG=plt15-check docker compose --project-directory "${CFG:?}" config` exits 0 with no `.secret`.
   (b) `env -u SCRIBA_LIBRARY docker compose --project-directory "${CFG:?}" config` exits 1 and names `SCRIBA_LIBRARY`.
   (c) With `"${CFG:?}"/.secret` holding `TS_AUTHKEY=tskey-test`: `SCRIBA_LIBRARY=/tmp/x docker compose --project-directory "${CFG:?}" config`; the resolved output contains `TS_AUTHKEY`.
   (d) With `"${CFG:?}"/.env` holding `SCRIBA_COMPOSE_VERSION=1`: `SCRIBA_LIBRARY=/tmp/x docker compose --project-directory "${CFG:?}" config`; the resolved value is `"1"`.
   (e) With no `.env`: `env -u SCRIBA_COMPOSE_VERSION SCRIBA_LIBRARY=/tmp/x docker compose --project-directory "${CFG:?}" config`; the resolved value is `null`. At run time the variable must be absent (step 9b).
   (f) With `"${CFG:?}"/.env` holding `SCRIBA_COMPOSE_VERSION=` (empty): `SCRIBA_LIBRARY=/tmp/x docker compose --project-directory "${CFG:?}" config`; the resolved value is `""`. The app refuses it, so the installer must never write an empty value (PLT-17).
5. Root gates. `npm run build && npm test && npm run lint`. Expected: each exits 0. `npm run lint` ends with `All matched files use Prettier code style!`.
6. Commit on `unit/PLT-15`. `git add deploy apps/api/src/modules/platform/compose-version.ts apps/api/test/compose-version.test.ts`, then `git commit -m "feat(PLT-15): compose with tailscale sidecar, shared socket and healthcheck"`. Do not add `plans/PLT-15.md`. Expected: one commit; `git ls-files deploy` lists `compose.yaml`, `compose-version` and `serve/serve.json`.
7. Fresh clone. `git clone --branch unit/PLT-15 /Users/bbartolome/workspace/scriba-prototype /tmp/plt15-fresh`. The Docker checks use only committed content.
8. Image. In `/tmp/plt15-fresh`, `docker build -t bbartolome/scriba:plt15-check .` (the host is `aarch64`). Expected: exit 0. Compose uses this tag through `SCRIBA_IMAGE_TAG=plt15-check`. The PLT-14 tag `bbartolome/scriba:local-arm64` is not touched.
9. Install folder and library, both under the shared path. `INST=$(mktemp -d /Users/bbartolome/workspace/.plt15-inst.XXXX)` and `LIB=$(mktemp -d /Users/bbartolome/workspace/.plt15-books.XXXX)`. Print them with `echo "INST=$INST LIB=$LIB"` and record both lines in step 11: shell variables do not persist between tool calls, so every later command uses the literal paths, or `${INST:?}` and `${LIB:?}`, which stop the command when a variable is empty. Copy the contents of `/tmp/plt15-fresh/deploy` into `"${INST:?}"`. Run `chmod 0777 "${LIB:?}"`, so UID 1001 can create `.scriba/`. Write `"${INST:?}"/.env` with the keys PLT-17 writes: `SCRIBA_LIBRARY=<LIB path>`, `SCRIBA_UID=1001`, `SCRIBA_GID=1001`, `SCRIBA_PORT=18080`, `SCRIBA_IMAGE_TAG=plt15-check`, `SCRIBA_COMPOSE_VERSION=1`. Write no `.secret`. Re-run the step-0 scriba and plt15-check guards. `up` pulls `tailscale/tailscale:v1.104.4`, which is not on the daemon today (only `tailscale/tailscale:latest`, checked at revision 7); step 12 leaves that image in place on purpose, because PLT-16 reuses it. Then `docker compose -p plt15-check --project-directory "${INST:?}" up -d --wait; echo "up=$?"`. Then check the sidecar's serve config: `docker compose -p plt15-check --project-directory "${INST:?}" exec -T tailscale cat /config/serve/serve.json | cmp - /tmp/plt15-fresh/deploy/serve/serve.json && echo same`. Expected: `same`. Then `docker compose -p plt15-check --project-directory "${INST:?}" exec -T scriba printenv SCRIBA_COMPOSE_VERSION`; expected `1`. This is the only run-time check that the stamped `.env` value reaches the bare key (step 9b covers the unstamped case). Then run the checks of section 4 for criteria 1 to 4.
9b. Unstamped check, after criteria 1 to 4. `docker compose -p plt15-check --project-directory "${INST:?}" down`; remove the `SCRIBA_COMPOSE_VERSION` line from `"${INST:?}"/.env`; `docker compose -p plt15-check --project-directory "${INST:?}" up -d --wait`; `docker compose -p plt15-check --project-directory "${INST:?}" exec -T scriba printenv SCRIBA_COMPOSE_VERSION; echo "exit=$?"`. Expected: no value and `exit=1`. Then restore the line (`SCRIBA_COMPOSE_VERSION=1`) and run `docker compose -p plt15-check --project-directory "${INST:?}" up -d --wait` again. Every compose command in this step carries the prefix.
9c. Hand-off for the LAN half. Leave the step-9 stack up; do not run step 12. Hand the Mac-terminal recipe of criterion 1, the literal `INST` and `LIB` paths printed at step 9, and the `ls -ln` observation in criterion 1's recipe to the Navigator. Step 12 runs only after the LAN result is recorded (step 11) or the Navigator defers it. Criterion 1 stays unticked until then.
10. Criterion 5. `npm run test -w @bbartolome/scriba-api -- compose-version` in `/tmp/plt15-wt`, then the mutation check of section 4.
11. Record. The Docker outputs (versions, the step 4 results, the outputs of criteria 1 to 4, step 9b, the LAN result with the `ls -ln` observation of step 9c, the `CFG` line printed at step 4, the `INST` and `LIB` lines printed at step 9, the `tailscale/tailscale:v1.104.4` image left in place, any removal that was refused, and `native Linux leg (criterion 2 \`stat -c %u:%g\` on the host path, open point 3): not run`) go into a dated DECISIONS entry on the main checkout, committed as `docs(PLT-15): record the compose checks`, like the other `docs(PLT-*)` records. A checkbox that a check cannot prove stays unticked.
12. Cleanup. Runs only after the LAN result is recorded (step 11) or the Navigator defers it (step 9c). `docker compose -p plt15-check --project-directory "${INST:?}" down -v`. Confirm with `docker compose ls -a` that no `plt15-check` row remains, and `docker volume ls -q --filter name=plt15-check_` prints nothing. Remove the library's `.scriba/` as root in a container, because the shell may be unable to remove files the app created: `docker run --rm -v "${LIB:?}":/l busybox rm -rf /l/.scriba`. Then, from the shell, `rm -rf -- "${LIB:?}" "${INST:?}" "${CFG:?}"` (the paths printed at steps 9 and 4). If a removal is refused, record the paths for the user in step 11 (as PLT-14 did) and do not widen the removal. Then `docker image rm bbartolome/scriba:plt15-check`, `rm -rf /tmp/plt15-fresh`, and `git worktree remove /tmp/plt15-wt`. The PLT-14 image `bbartolome/scriba:local-arm64` stays. The `tailscale/tailscale:v1.104.4` image stays on purpose, because PLT-16 reuses it. The existing exited container `scriba-check2` stays untouched (step 0). The branch `unit/PLT-15` stays, because it holds the commit from step 6; step 0 checks that it does not exist before step 1. The paths removed here are the ones step 0 checks (`/tmp/plt15-wt`, `/tmp/plt15-fresh`) and the fresh `mktemp` paths of steps 4 and 9.

## 4. Acceptance criteria and tests

Each criterion has one check. Criteria 1 to 4 run on the Docker Desktop daemon of this Mac, from this shell, at step 9. The parts that cannot run here are the native Linux Engine leg, the LAN half of criterion 1, and the literal "owned on the host" half of criterion 2 (see criterion 2).

Every `docker compose` command in criteria 1 to 4 runs with the step-9 prefix `docker compose -p plt15-check --project-directory "${INST:?}"`. `$INST` and `$LIB` mean the literal paths printed at step 9.

### criterion 1: `docker compose up -d` with no auth key reaches `healthy`; the app answers on `127.0.0.1:${SCRIBA_PORT}` and on no other host interface

Command, with the `.env` of step 9 and no `.secret`:

```
docker compose -p plt15-check --project-directory "${INST:?}" up -d --wait; echo "up=$?"
docker inspect --format '{{.State.Health.Status}}' "$(docker compose -p plt15-check --project-directory "${INST:?}" ps -q scriba)"
docker inspect --format '{{json .HostConfig.PortBindings}}' "$(docker compose -p plt15-check --project-directory "${INST:?}" ps -q tailscale)"
curl -s -o /dev/null -w '%{http_code}\n' http://host.docker.internal:18080/healthz
curl -s http://host.docker.internal:18080/api/platform/version; echo
```

Expected: `up=0`; `healthy`; `{"8080/tcp":[{"HostIp":"127.0.0.1","HostPort":"18080"}]}`, with that entry as the only one; `200`; a version body with `"composeVersion":1`.

The probe runs from the shell, not from `127.0.0.1`, because the shell is a container and its own loopback does not reach a published port (`/.dockerenv`; PLT-14 plan line 159). `host.docker.internal` resolves to `192.168.65.254` here (checked). The positive half counts only if the probe returns `200`. If it returns `000`, the criterion fails and is reported; the probe is not switched to `127.0.0.1`.

LAN half: **cannot test locally.** Cause: the shell is a container. Its addresses are `172.21.0.2` and `100.94.240.19` (a tailnet range), not the Mac's LAN address, and `ipconfig` is absent from it. Close it from a Mac terminal, outside the container, at the step 9c hand-off. Set `LIB` to the path from step 9 first:

```
LIB=<the $LIB path from step 9>
LAN=$(ipconfig getifaddr en0)
python3 -m http.server 18090 --bind "$LAN" &
sleep 1
curl -s -m 5 -o /dev/null -w '%{http_code}\n' "http://$LAN:18090/"
curl -s -m 5 -o /dev/null -w '%{http_code}\n' "http://127.0.0.1:18080/healthz"
curl -s -m 5 -o /dev/null -w '%{http_code}\n' "http://$LAN:18080/healthz"
ls -ln "$LIB/.scriba"
kill %1
```

Expected: `200` (positive control: the LAN address answers); `200` (the loopback publish works); `000` (refused on the LAN address). The `ls -ln` line is a recorded observation only, per the "Plan changes" line of DECISIONS 2026-11-13 (line 828): there is no pass or fail on `1001`. If `en0` has no address, use the active Wi-Fi interface. The checkbox stays unticked until this run is recorded.

### criterion 2: files the app writes into the library are owned by `SCRIBA_UID:SCRIBA_GID` on the host

**Cannot test locally in full. Checkbox stays unticked.** Navigator decision (DECISIONS 2026-11-13, PLT-15): the unit is complete without the literal host-owner check.

Test on Docker Desktop, after the `up` of step 9 (`.env` with `1001:1001`). This is a process-UID proof only:

```
docker compose -p plt15-check --project-directory "${INST:?}" exec -T scriba id -u
docker compose -p plt15-check --project-directory "${INST:?}" exec -T scriba id -g
test -d "${LIB:?}/.scriba" && echo "scriba-dir=present"
```

Expected: the two `id` lines are `1001` and `1001`, and the last line is `scriba-dir=present`. This shows the UID the app runs as and that it created `.scriba/`, which the app does at boot (PLT-04 unit line 22). A compose file that ignored `user:` would make the app run as `1000` and fail this check.

Why the owner is not checked: Docker Desktop's file sharing (VirtioFS) reports an owner that is not the creator's UID and changes between reads. The probe in DECISIONS 2026-11-13 showed a root-created file read as `0:0` from root, `0:0` from UID 1001 and 4242, and `1000:1000` five seconds later. An `ls -ldn` or busybox `stat` on this daemon therefore cannot verify the host owner.

The literal wording "owned by `SCRIBA_UID:SCRIBA_GID` on the host" is exact only on the native Linux Engine leg, where the bind mount is the host's own folder: there the test is `stat -c %u:%g` on the host path, expected `1001:1001` (open point 3). That leg is optional and recorded as not run until it runs. Until then this criterion's checkbox stays unticked. The Mac-terminal `ls -ln` of criterion 1 (step 9c) is a recorded observation only, with no pass or fail on `1001`.

### criterion 3: from the `scriba` container as its non-root UID, `GET /localapi/v0/status` over the shared socket returns `BackendState` (`NeedsLogin` before login)

Command:

```
docker compose -p plt15-check --project-directory "${INST:?}" exec -T scriba id -u
docker compose -p plt15-check --project-directory "${INST:?}" exec -T scriba node -e "const h=require('http');h.get({socketPath:'/var/run/tailscale/tailscaled.sock',path:'/localapi/v0/status',headers:{Host:'local-tailscaled.sock'}},(r)=>{let d='';r.on('data',(c)=>{d+=c});r.on('end',()=>console.log(r.statusCode,JSON.parse(d).BackendState))}).on('error',(e)=>{console.error(e.code);process.exit(1)})"
```

Expected: the first command prints `1001`, not `0`. The second prints `200 NeedsLogin`. If it prints `NoState` or `Starting`, retry for up to 60 seconds. No login is needed. This check also covers the macOS socket leg of SAU-21, because it runs on Docker Desktop with a non-root UID. The socket mount on `scriba` is read-only (`:ro`, section 1), so a `200` here also shows that a connect and a read of status work through a read-only mount.

### criterion 4: `host.docker.internal` resolves inside the `scriba` container

Two checks. The DNS lookup alone does not prove the `extra_hosts` entry. On Docker Desktop this shell has no `host.docker.internal` line in `/etc/hosts` (`grep` exit 1, checked), yet `getent` answers `192.168.65.254` through `nameserver 127.0.0.11` (checked). So the lookup can pass without the `tailscale` entry reaching `scriba`. The `/etc/hosts` grep is the check that reaches the entry.

Command 1, the `extra_hosts` lines inside `scriba`:

```
docker compose -p plt15-check --project-directory "${INST:?}" exec -T scriba grep host.docker.internal /etc/hosts
docker compose -p plt15-check --project-directory "${INST:?}" exec -T scriba grep -E '^[0-9.]+[[:space:]]+host\.docker\.internal$' /etc/hosts
```

Expected: the first command prints the `host-gateway` lines. There is one IPv4 line, `<IPv4><TAB>host.docker.internal` (here `192.168.65.254`), and an IPv6 line if the daemon writes one (the existing exited container `scriba-check2` had `fdc4:f303:9324::254`, fact 22). The implementer records every line printed. The second command exits 0 and prints the IPv4 line. Fail only when the second command exits non-zero: then the `extra_hosts` entry does not reach `scriba`, criterion 4 fails and the finding is recorded, and the DNS lookup does not rescue it.

Command 2, DNS, IPv4 only: `docker compose -p plt15-check --project-directory "${INST:?}" exec -T scriba node -e "require('dns').lookup('host.docker.internal',{family:4},(e,a)=>{if(e){console.error(e.code);process.exit(1)}console.log(a)})"`

Expected: exit 0, and the printed address equals the IPv4 address of command 1's hosts line (`192.168.65.254` here). On this daemon the shell's lookup gives the same value; that lookup result for `scriba` is not checked.

Not checked in revision 9: no stack is running, so the lines inside `scriba` have not been seen (fact 20). The two-line observation comes from the existing exited container `scriba-check2`, read only with `docker cp` (fact 22), not from `scriba`. The `network_mode: service:` sharing of `/etc/hosts` is assumed until command 1 runs (section 8).

### criterion 5: `GET /api/platform/version` reports the shipped `composeVersion`

Testable locally: no Docker and no login are needed.

Command, in `/tmp/plt15-wt` after `npm ci`: `npm run test -w @bbartolome/scriba-api -- compose-version`.

Expected: exit 0, with one test passed in `compose-version.test.ts`.

Mutation check, which proves the test is not vacuous: set `EXPECTED_COMPOSE_VERSION = 2` in `compose-version.ts` and leave `deploy/compose-version` at `1`. The same command must exit non-zero. Revert the mutation; the command must then exit 0 again. The checkbox can be ticked once both hold on `unit/PLT-15`.

## 5. Downstream agreement

- **PLT-16 (ST-1 to ST-3).** Relies on: the candidate Serve config at `deploy/serve/serve.json`, selected by `TS_SERVE_CONFIG` in `tailscale`; `extra_hosts` on `tailscale` for ST-3 (criterion 4). The ST-1 extra check "`http://scriba` and `http://<100.x>:8080` refused" is enforced by PLT-08's tailnet filter, not by the loopback publish. `scriba` listens on all interfaces in the shared namespace (PLT-04 unit line 18), which includes `tailscale0`, and the filter drops peers in Tailscale's ranges (PLT-08 unit lines 18 and 19; module line 35). The loopback publish only keeps the host side on `127.0.0.1` (criterion 1). If ST-1 picks the CLI loop, PLT-16 changes the `tailscale` service and removes `deploy/serve/`, which bumps the compose version. PLT-15 builds under its own tag `plt15-check` and removes it at step 12. It does not retag or reuse PLT-14's `bbartolome/scriba:local-arm64` (ID `a5fca3e65422`), which stays as it is. PLT-16 names its own local tag and passes it through `SCRIBA_IMAGE_TAG`, so no `:latest` tag is needed (PLT-14 open point 4, for PLT-16's runs). The SAU-20 hint text (section 6, point 2) can be repeated in PLT-16's runbook.
- **PLT-17 (dispenser).** Relies on: `deploy/compose.yaml` (its project name is fixed); `deploy/serve/` (a folder, so the extraction must copy it too); `deploy/compose-version` (the value to stamp); the `.env` keys of step 9, with `SCRIBA_LIBRARY` required, so the installer must write it; the integer `SCRIBA_COMPOSE_VERSION`, never an empty value (step 4(f)); an optional `.secret` holding only `TS_AUTHKEY` (its absence works); "wait for healthy" through `docker compose up -d --wait` or the healthcheck status. Open point 4 covers its Compose version check. The extraction must not place `.gitkeep`, which is deleted here.
- **PLT-18 (update and rollback).** Relies on: `compose.yaml` as the default file name, so `compose.override.yaml` still loads; replacing `compose.yaml`, `serve/` and `compose-version`; stamping `SCRIBA_COMPOSE_VERSION` from `deploy/compose-version`; rollback through `SCRIBA_IMAGE_TAG`. The README note on crash-restart recovery is open point 1. Health hand-off: only `scriba` has a healthcheck. `tailscale/tailscale:v1.104.4` has none, and neither does `tailscale/tailscale:latest` (fact 26). PLT-18 unit line 41 (demo step 4) says `docker compose ps` shows both services healthy. The plan records that only `scriba` reports health, so PLT-18's demo step 4 should read "scriba healthy, tailscale running". No `tailscale` healthcheck is added here: a check that fails before login would break `up --wait` in criterion 1.
- **PLT-19 (publish).** No compose dependency. The compose default `SCRIBA_IMAGE_TAG=latest` resolves only once PLT-19 publishes `latest`. PLT-17 pins a semver, so this is not a blocker. PLT-19's smoke list is unchanged.
- **SAU-21 (tailnet gate).** Relies on: the socket at `/var/run/tailscale/tailscaled.sock` in the shared `tailscale-socket` volume; `SCRIBA_TS_SOCKET` set on `scriba`; `user:` as the non-root UID; Serve proxying `http://127.0.0.1:8080`, which the `Tailscale-User-Login` path of SAU-18 and SAU-21 assumes. Its macOS socket smoke test is the command of criterion 3, run on Docker Desktop; its read path uses the read-only socket mount (`:ro`). Its fallback (a sidecar step relaxing socket permissions) would edit `deploy/compose.yaml`; that is not in PLT-15.
- **CEX-15 (export gate).** Depends on PLT-15 only through the closed `phase:image-compose`. Its export smoke runs inside the image, not through compose, so nothing here changes it.
- **Module units.** SAU-10 reads `SCRIBA_COMPOSE_VERSION` as `unknown` when the variable is missing (the bare key, section 1) and compares it with `composeVersion` (now 1). SAU-16 line 24 shows the warning when unset or older. SAU-17 uses the same socket path as the literal in compose. MPR-02 relies on `host.docker.internal` (criterion 4).
- **PLT-04 and PLT-14 (upstream).** PLT-04: `EXPECTED_COMPOSE_VERSION` is set here, as its unit line 25 asks. PLT-14: the `COPY --from=build /src/deploy /opt/installer` line (Dockerfile line 60) carries the new files into the image; UID 1000 (line 63) and `node` on PATH come from PLT-14.

## 6. Open points (for the Navigator)

1. **Crash restarts.** `depends_on.tailscale.restart: true` restarts `scriba` when Compose restarts or recreates `tailscale`. It does not cover a crash that the daemon's restart policy handles, because that path does not go through Compose (assumed, section 8). Proposed default: at step 9 the implementer may observe a crash (kill the tailscaled process in `tailscale` and watch the published port). This is not a criterion. If the port stops answering, PLT-18's README note says recovery is `docker compose restart`, and no watchdog is added here. The Navigator decides.
2. **Closed: who tells the user that HTTPS certificates are off.** SAU-20 line 15 shows the "HTTPS certificates off" hint when `CertDomains` is empty, and points to the admin console. SAU-17 lines 21 and 22 derive `httpsCertsEnabled` from the same empty `CertDomains`. No change in PLT-15. PLT-16's runbook may repeat the hint.
3. **Where the native Linux Engine leg runs.** The Docker Desktop daemon on this Mac is the only daemon here. A native Linux Engine differs (`host-gateway`, `/dev/net/tun` without the VM). That leg records the bind-mount ownership on the host, where "owned on the host" is exact (criterion 2, `stat -c %u:%g` on the host path). Decision A (DECISIONS 2026-11-13, option b): criterion 2 stays unticked and is marked cannot-test-locally. Decision B: the process-UID proof is supporting evidence that `user:` is applied; it is not a substitute for the host-owner check. The native leg is optional, not required before status `done`, and is recorded as not run until it runs. The plan's own coverage: the Docker Desktop run is the test for criteria 3 and 4 and for criterion 1's Docker Desktop half. Criterion 1's LAN half comes from the step 9c Mac-terminal run.
4. **Compose versions.** `env_file` with `required` needs Compose v2.24 or later (assumed, not checked). `depends_on` with `restart` has no version check here; Compose v5.6.0 accepts it. PLT-17 checks "Compose v2" today. Options: (a) PLT-17 checks for the newest of the two versions; (b) the installer always writes an empty `.secret` (mode 0600) and drops `required`. Proposed: (a). Option (b) changes PLT-17's "optional `.secret`" wording.
5. **Compose checks in CI.** No criterion runs `docker compose config` in CI. Proposed: no CI step; step 4 of section 3 is the only check. The Navigator may add a `scripts/*.test.mjs` check that runs `docker compose config` when a Docker CLI exists.
6. **Owner check on Docker Desktop: resolved (DECISIONS 2026-11-13, Decisions A and B).** The owner shown by Docker Desktop's file sharing is not the creator's UID and changes between reads (probe in DECISIONS 2026-11-13), so the host owner is not checked on this daemon. Criterion 2 tests the process UID (`id -u` and `id -g` = 1001, and `.scriba/` created by that process) as supporting evidence (Decision B). The literal `stat -c %u:%g` host-owner check stays on the native Linux leg (open point 3). Criterion 2's checkbox stays unticked.

## 7. Facts checked

Revision 9 re-checked the facts its items rest on: fact 2 (HEAD and the record lines), fact 22 (the `scriba-check2` image, re-read with `docker inspect`), facts 26 and 27 (the healthcheck and the image), fact 28 (the step 4 forms from a `cp -R` copy). Earlier facts were not re-run in revision 9 unless a later fact says so.

1. Unit and module read in full. Line numbers from `grep -n` on `units/PLT-15-compose-sidecar.md` and `modules/platform.md`. PLT-14 plan line 159 (`curl http://host.docker.internal:18080/healthz` from the host shell, which is a container) was read with `sed -n '155,162p' plans/PLT-14.md`.
2. Git. `git rev-parse --short HEAD` prints `005d85c` (the rejection-7 record). `git log --oneline -6` shows `005d85c`, `2226770`, `4d37759`, `e02685e`, `dffd203` (the Navigator's criterion 2 decision) and `086f4e0`. `git status --short` shows only `?? plans/PLT-15.md`. `git remote` printed nothing (revision 1). `grep -n "PLT-15 — Opus plan review of revision\|Navigator decision on the criterion 2" plans/DECISIONS.md` gives lines 788 (revision 1), 800 (revision 2), 811 (revision 3), 822 (the Navigator decision), 830 (rejection 4, the file labelled revision 5), 842 (rejection 5, revision 6) 851 (rejection 6, revision 7) and 860 (rejection 7, revision 8).
3. Daemon. `docker info --format` prints `os=Docker Desktop kernel=7.0.14-linuxkit arch=aarch64 server=29.8.2`. `docker context show` prints `default`.
4. The shell is a container. `ls -la /.dockerenv` shows a root-owned 0-byte file. `id -u:id -g` prints `1000:1000`. `hostname -I` prints `172.21.0.2 100.94.240.19 fd7a:115c:a1e0::c83a:f014`. `which ipconfig` finds nothing.
5. `getent hosts host.docker.internal` prints `192.168.65.254 host.docker.internal`.
6. Published ports on the daemon: `docker ps --format '{{.Names}} | {{.Image}} | {{.Ports}}'` lists `tride | bbartolome/tride:latest |` (no ports) and `installer-tailscale-1 | tailscale/tailscale:latest | 127.0.0.1:2222->22/tcp`. No container publishes 18080. Both are left alone.
7. `grep -n "COPY --from=build /src/deploy\|^USER\|^ENTRYPOINT" Dockerfile` prints `60:COPY --from=build /src/deploy /opt/installer`, `63:USER 1000:1000` and `64:ENTRYPOINT ...`.
8. SAU citations, by `grep -n` and `sed -n`: SAU-10 line 19 (`unknown` when the variable is missing) and line 24 (unset gives `unknown`); SAU-20 line 15 (the "HTTPS certificates off when `CertDomains` is empty, pointing to the admin console" hint); SAU-17 lines 21 (`CertDomains`, empty means HTTPS certificates off) and 22 (`httpsCertsEnabled`); SAU-16 line 24 (unset or older shows the warning).
9. Fixture. `apps/api/test/fixtures/static/index.html` exists. `apps/api/test/healthz-version.test.ts` line 8 is `staticRoot: resolve(__dirname, 'fixtures/static')`.
10. Compose probes, in scratch folders under `/tmp` (removed afterwards), with the revised draft, through `docker compose config` (no daemon used):
    A. No `.env`, `SCRIBA_COMPOSE_VERSION` unset: the resolved value is `null`.
    B. `.env` with `SCRIBA_COMPOSE_VERSION=1`: resolved `"1"`.
    C. Shell variable `SCRIBA_COMPOSE_VERSION=7`, no `.env`: resolved `"7"`.
    D. `.env` with `SCRIBA_COMPOSE_VERSION=` (empty): resolved `""`.
    E. `SCRIBA_LIBRARY` unset: exit 1, "required variable SCRIBA_LIBRARY is missing a value: set SCRIBA_LIBRARY in .env".
    F. `depends_on` with `condition: service_started` and `restart: true`: accepted, exit 0. `SCRIBA_UID=1001` renders `user: 1001:1001`.
11. Revision 1 probes, still valid for the draft: the short form `env_file: .secret` exits 1 when `.secret` is absent, and the long form with `required: false` exits 0; with a `.secret` holding `TS_AUTHKEY`, the key appears in the resolved output. `node_modules/.bin/prettier` 3.9.10 flags the unformatted `compose.yaml` and `serve.json`. The healthcheck one-liner exits 0 on a 200 response and 1 on a closed port or a 503, on Node v26.13.0 on this host.
12. Tailscale. Docker Hub API: `tailscale/tailscale:v1.104.4` returns 200 and `v1.104.6` returns 404. The newest release is `v1.104.6`, published 2026-11-11. At tag `v1.104.4`: `cmd/containerboot/serve.go` replaces `${TS_CERT_DOMAIN}`; `settings.go` reads `TS_SERVE_CONFIG` and `TS_SOCKET`; `serve_test.go` shows the JSON shape. On `main`: `TS_USERSPACE` defaults to true; `TS_HOSTNAME`, `TS_STATE_DIR` and `TS_AUTHKEY` are read. `safesocket/safesocket.go`: `GOOSUsesPeerCreds` is true for linux and darwin. `safesocket/unixsocket.go`: the socket is `0666` when peer credentials are used. `ipn/ipnauth/ipnauth.go`: a non-root peer is read-only. `client/local/local.go`: the Host must be `local-tailscaled.sock`.
13. Revision 3, read-only checks from this shell. `docker compose ls -a` lists `devcontainer`, `homelab`, `installer` (running) and `ui-kit`, with no `scriba` row. `docker volume ls -q --filter name=scriba_` prints nothing.
14. Kernel rules, from the `torvalds/linux` master source fetched with `gh api` (this system has its man pages removed, so `man 7 unix` is unavailable). `net/unix/af_unix.c` line 1223: `err = path_permission(&path, MAY_WRITE);`, the write check at connect. `path_permission` is the static inline in `include/linux/fs.h` lines 2731 to 2735; it calls only `inode_permission` (`fs/namei.c` line 628), which checks the superblock through `sb_permission` (`fs/namei.c` lines 604 to 614) and then the inode's mode bits. `sb_permission` reads only the superblock's read-only state, and refuses a write only for regular files, directories and symlinks. A `:ro` bind mount is a per-mount flag, which `sb_permission` does not read, and the connect path does not read it either (the `mnt_want_write` calls in `fs/namei.c` are on open-for-write, create, remove and rename paths, none on connect). The conclusion that `:ro` does not stop `connect()` therefore rests on `af_unix.c` line 1223 and the mount flag being off that path. I traced the call chain of `path_permission`, not every kernel path. Criterion 3 proves it.
15. Citations re-checked: SAU-17 line 20 ("The app only ever **reads** status"); SAU-10 lines 19 and 24; SAU-20 line 15; SAU-17 lines 21 and 22; SAU-16 line 24; PLT-04 unit line 18 ("Listens on 8080 on all interfaces inside the shared network namespace"); PLT-08 unit lines 18 and 19 (the filter drops Tailscale-range peers; the loopback publish arrives from the Docker gateway and passes); module line 35; `Dockerfile` lines 60, 63 and 64; the revision-2 record at `plans/DECISIONS.md` line 800.
16. Compose probes re-run on the revised file, with `docker compose config` (no daemon): unset `SCRIBA_COMPOSE_VERSION` resolves to `null`; `.env` value `1` resolves to `"1"`; unset `SCRIBA_LIBRARY` exits 1 with the required-variable message; `SCRIBA_UID=1001` renders `user: 1001:1001`; `depends_on` `restart: true` is accepted. `docker compose config --format json` shows the socket volume read-write on `tailscale` and `read_only: true` on `scriba`, and the `serve` mount read-only on `tailscale`.
17. Not run in revision 9: no `docker compose up`, no image build, no pull, no container started. The only daemon reads in revision 9 were `docker inspect scriba-check2`, `docker image inspect` on `9b392c90203c` and on `tailscale/tailscale:latest` (facts 26 and 27). The step 4 forms ran with `docker compose config`, which uses no daemon (fact 28). The Docker checks are for step 9 and the Mac-terminal run of step 9c.
18. `-p` override, probed with `docker compose config --format json` on a scratch file under `/tmp` (removed afterwards): `docker compose -p plt15-check --project-directory <dir> config` reports `name` `plt15-check`; the same file without `-p` reports `scriba`. Bash with `cd "${INST:?}"` and `INST` empty aborts with "parameter null or not set" (exit 1), so an empty path cannot fall through to the current folder.
19. `docker image ls bbartolome/scriba:local-arm64 --format '{{.ID}}'` prints `a5fca3e65422`, the PLT-14 image, which is still tagged. The step-0 guard checks it.
20. The shell's hosts file and DNS, on Docker Desktop, checked in revision 6: `grep -n host.docker.internal /etc/hosts` prints nothing and exits 1; `/etc/resolv.conf` lists `nameserver 127.0.0.11`; `getent hosts host.docker.internal` prints `192.168.65.254 host.docker.internal`. The `extra_hosts` line inside `scriba` is not checked: no stack is running.
21. Guards, checked in revision 6: `docker image ls -q bbartolome/scriba:plt15-check` prints nothing; `docker compose ls -a` has no `scriba` or `plt15-check` row; `docker volume ls -q --filter name=scriba_` and `--filter name=plt15-check_` print nothing.
22. The two-line hosts observation, read with `docker cp scriba-check2:/etc/hosts`. `scriba-check2` is an existing exited container, not one made by this check: `docker inspect` shows it was created 2026-11-06T16:30:50Z, in bridge network mode as user 1000:1000, from image `bbartolome/scriba:dev` (`.Config.Image`; its `.Image` is `sha256:9b392c90203c…`, which `docker image inspect` reports as absent from the daemon), with a bind of `/tmp/scriba-lib-grzp:/books`. This plan does not create, start, change or remove it; step 0 leaves it alone. The read was repeated in revision 8 and gave the same two lines. `cat -A` shows `192.168.65.254^Ihost.docker.internal$` and `fdc4:f303:9324::254^Ihost.docker.internal$`: tab-separated, LF line ends. On the copy, `grep -E '^[0-9.]+[[:space:]]+host\.docker\.internal$'` exits 0 and matches the IPv4 line, and an IPv6 pattern `^[0-9a-f:]+[[:space:]]+host\.docker\.internal$` matches the second line. The `scriba` container's own file is not read (no stack is running).
23. Guards, checked in revision 7: `test ! -e /tmp/plt15-wt && test ! -e /tmp/plt15-fresh` succeeds; `git branch --list unit/PLT-15` prints nothing; `docker images tailscale/tailscale` lists only `tailscale/tailscale:latest` (`25cde9ad7602`), so `v1.104.4` is not on the daemon.
24. `docker compose --project-directory <dir> config`, run from `/`, with a temp folder under `/tmp` (removed afterwards): with `SCRIBA_LIBRARY` unset it exits 1 with the required-variable message; with it set it exits 0. The step 4 form therefore needs no current folder.
25. Step 4 case forms, run in revision 8: a scratch folder under `/tmp` got the compose text extracted from this file (`awk` between the ```yaml fences) and a `serve/serve.json`; the shell has no `SCRIBA_*` variables. Results: (a) exit 0; (b) exit 1, the message names `SCRIBA_LIBRARY`; (c) the resolved output contains `TS_AUTHKEY`; (d) `SCRIBA_COMPOSE_VERSION: "1"`; (e) `SCRIBA_COMPOSE_VERSION: null`; (f) `SCRIBA_COMPOSE_VERSION: ""`. The scratch folder was removed. No container was started.
26. `docker image inspect tailscale/tailscale:latest --format '{{.Config.Healthcheck}}'` prints `<nil>` (revision 9): the sidecar image declares no healthcheck, so only `scriba` reports health. PLT-18 unit line 41 reads "`docker compose ps` shows both services healthy" (`grep -n healthy units/PLT-18-update-rerun-rollback.md`). The pinned sidecar image `tailscale/tailscale:v1.104.4` (arm64) also has no Healthcheck in its registry config, and its Cmd is containerboot (read-only curl of the registry manifest and config, revision 9).
27. Revision 9: `docker image inspect 9b392c90203c` reports "No such image", and `docker inspect scriba-check2 --format '{{.Config.Image}}'` prints `bbartolome/scriba:dev`. The container was created 2026-11-06T16:30:50Z and is exited. The tag `bbartolome/scriba:dev` has since moved to `90de5f45e264`; the container was created while it pointed to `9b392c90203c`.
28. Step 4 forms from a copy (revision 9): a scratch folder under `/tmp` got `deploy/` (the compose text extracted from this file, `serve/serve.json` and `compose-version`); its contents were copied into a CFG folder with `cp -R deploy/. CFG/`. The six cases then ran with the shell's `SCRIBA_*` variables unset: (a) exit 0; (b) exit 1, names `SCRIBA_LIBRARY`; (c) the resolved output contains `TS_AUTHKEY`; (d) `SCRIBA_COMPOSE_VERSION: "1"`; (e) `null`; (f) `""`. Both scratch folders were removed. The main checkout's `deploy/` holds only `.gitkeep`.

## 8. Assumed

- Compose drops a bare key whose variable is unset: the resolved config shows `null` (fact 10A), and the run-time check is step 9b.
- `host.docker.internal:18080` from the shell reaches the Mac's `127.0.0.1` publish under Docker Desktop. If not, criterion 1's probe returns `000` and is reported as a failure.
- Docker Desktop's file sharing reports an owner that is not a reliable record of the creator's UID (probe, DECISIONS 2026-11-13). Criterion 2 does not rely on it; it tests the process UID instead. The Mac's owner view is recorded only as the step 9c observation.
- A `:ro` mount on the socket volume does not stop `connect()`, from the kernel rules of fact 14. Criterion 3 checks it.
- `env_file` with `required` needs Compose v2.24 or later, and `depends_on` with `restart` needs a version not checked here (open point 4).
- A crash restart by the daemon does not restart `scriba` (open point 1).
- The `extra_hosts` entry on `tailscale` reaches `scriba`, because `network_mode: service:` shares the sidecar's `/etc/hosts`. Assumed until criterion 4's `/etc/hosts` grep runs (not run in revision 9; no stack is up). The DNS lookup does not check it (fact 20).
- The named volume's root owner, mode 0755, lets UID 1001 enter `/var/run/tailscale`. Criterion 3 checks it.
- The tailscale image `v1.104.4` runs containerboot, which reads the `TS_*` variables used here. Checked in the source at the tag, not inside the image.
- UID 1001 runs the app, as PLT-14's review showed for `501:20`. Not run here.
- `${TS_CERT_DOMAIN}` Serve works only with tailnet HTTPS on. The hint is closed (section 6, point 2); the Serve behaviour itself is ST-1's.
- `docker compose up -d --wait` returns only when services are healthy. Standard Compose behaviour, not run here.
- The `busybox` image is present on the daemon or pulled on first use by step 12 only. Not pulled here.
- The `-p plt15-check` override keeps the check's containers and volumes apart from a real `scriba` install (fact 18). Compose's `name:` is not otherwise used by this check.
- `grep` is present in the `node:26-slim` runtime image (Debian base). Not run in the image.
