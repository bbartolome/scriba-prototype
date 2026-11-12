---
id: PLT-14
status: planned
---
# PLT-14 plan — two-stage Dockerfile, entrypoint and local build script

Batch: [PLT-14] (Platform, phase:image-compose, M1, release track); batch of one. Revision 3 was approved by Opus (DECISIONS 2026-11-12 "PLT-14 — Opus plan review of revision 3", commit eab17be), and the status is `planned`. The post-approval text items are the first list at the top of section 6. Revision 2 was rejected by Opus (rejection 2 of 3, commit ceac02c); revision 1 was rejected by Opus (rejection 1, commit 9db6152). Written against `main` at `20e2349`; `main` is now at `eab17be`, which changes `plans/DECISIONS.md` only. The plan file is untracked. Nothing is committed, pushed or added to a remote by the planner. Section 7 lists the facts checked with commands; section 8 lists what is assumed or not checked.

Sources: "unit" is `units/PLT-14-dockerfile-entrypoint.md`; "module" is `modules/platform.md`; "DECISIONS" is `plans/DECISIONS.md`.

## 1. Decisions this plan follows

Settled by the sources:

| Decision | Source |
|---|---|
| Two stages. The build stage on Node LTS line 26 runs `npm ci` and builds contracts, API and web. The runtime stage on `node:26-slim` gets production dependencies, the built API and web, `packages/packs` at `/opt/scriba/packs`, `examples/` at `/opt/scriba/examples`, and `deploy/` at `/opt/installer`. | unit, Decisions "Two stages"; `.nvmrc` is `26`; root `engines` is `>=26 <27` |
| Runtime contents: built-in `node:sqlite` with FTS5 and no native addons; Pandoc 3.13 from the official per-arch `.deb`; Typst as a pinned static binary per arch, checksum-verified at build; `ca-certificates`; no `git`, no build toolchain. | unit, Decisions "Runtime contents" |
| Build args: semver version, revision and build time, reported by `/healthz` and version info. | unit, Decisions "Build args"; unit PLT-04 line 25 |
| The Dockerfile writes `apps/api/src/modules/platform/build-info.ts` from the build args, inside the build stage only. The repo file is not edited. | `build-info.ts` line 1: "PLT-14 overwrites this file from build args" |
| The expected compose version is not set by PLT-14. `compose-version.ts` keeps its placeholder; PLT-15 sets the real value. | unit, Build args; `compose-version.ts`; DECISIONS 2026-11-11 "PLT-02, PLT-03, PLT-09 — smaller plan choices accepted as drafted (Navigator decision)", item 2 |
| Entrypoint: with `SETUP=true`, print the dispenser stub to stdout and exit; diagnostics go to stderr. The stub is a valid no-op bash script. PLT-17 replaces it. Otherwise start the API. | unit, Decisions "Entrypoint"; unit PLT-17 ("Replaces PLT-14's entrypoint stub") |
| Default user is non-root UID 1000, so a bare `docker run` works. Compose overrides it with `user:`. No gosu. | unit, Decisions |
| Native builds on amd64 and arm64. Image size measured and recorded. | unit, Decisions and criteria 1 and 5 |
| No per-user thin layer. No TeX Live. | unit, Decisions |
| Scope: `Dockerfile`, `.dockerignore`, the entrypoint script, `scripts/build-image.sh` (local `docker buildx` for both arches). Nothing else. | unit, Scope |
| Tests exercise external behaviour only: image behaviour, process exit codes, emitted scripts. | module, Testing principles |
| npm only. No pnpm, Yarn, Nx or Turborepo. | module, Out of scope |
| Packs layout is `packages/packs/{core,nonfiction,fiction}/`. The image ships them read-only at `/opt/scriba/packs/{core,nonfiction,fiction}` through PLT-14's copy of `packages/packs`. | module `genre-packs.md` lines 37-38; unit GNP-05 (core gate: the app user cannot write to `/opt/scriba/packs/core`) |
| A criterion that needs a remote or a runner is marked "cannot test locally", with its cause, and its checkbox stays unticked. | DECISIONS 2026-11-12 "PLT-11 — acceptance criterion 5"; DECISIONS 2026-11-12 "PLT-13 — criterion 2 runner part" |
| Prettier parses none of the new file types (`Dockerfile`, `.dockerignore`, `.sh`), so the root `prettier --check .` does not check them. | DECISIONS 2026-11-10 "PLT-01 — Prettier scope"; `prettier --file-info` (section 7) |

Decisions this plan makes, where the unit is open (each is the simplest option that meets the criteria):

- Build stage is `node:26` (full image), as the unit's `node:<lts>` says. The build stage is discarded.
- Fetch stage is `node:26-slim` with `curl` and `xz-utils`, used only to download and check Pandoc and Typst. The runtime image gets none of these tools. `node:26-slim` ships neither (section 7).
- Runtime `node_modules` comes from `npm ci --omit=dev -w @bbartolome/scriba-api -w @bbartolome/scriba-contracts` in the build stage. Measured: 101 packages, 33 MB, no Angular. `npm prune --omit=dev` is rejected: it keeps Angular (52 MB), because apps/web lists Angular under `dependencies`.
- Runtime app tree is `/opt/scriba/app`, laid out like the repo: `node_modules`; `apps/api/package.json` and `apps/api/dist`; `apps/web/dist/scriba-web/browser`; `packages/contracts/package.json`, `packages/contracts/dist` and `packages/contracts/node_modules`. The last one holds `zod` 4.6.7, while the root `node_modules/zod` is 4.6.6 (the lock pins both). `apps/api/node_modules` is copied only if the build stage created it. Reason: `bootstrap.ts` resolves the static root relative to its own `__dirname`, and `@bbartolome/scriba-contracts` resolves through the workspace symlink, then its own nested `zod`.
- The entrypoint is `scripts/entrypoint.sh`, copied to `/usr/local/bin/scriba-entrypoint`. It is POSIX `sh` and ends with `exec node`, so Node gets the signals. The stub is inline in the entrypoint, not a separate file. The unit does not name the file. `deploy/` keeps installer files only, because PLT-17 extracts all of `/opt/installer`.
- The entrypoint sets `SCRIBA_BOOKS_DIR`, `SCRIBA_PACKS_DIR` and `SCRIBA_EXAMPLES_DIR` with `${VAR:-default}`, so compose can still override them. The defaults are `/books`, `/opt/scriba/packs` and `/opt/scriba/examples`, which equal the contract defaults in `packages/contracts/src/platform/env.ts`. Source: the task brief (the paths the entrypoint sets).
- Pandoc is `pandoc-3.13-1-$TARGETARCH.deb` from GitHub release `3.13`. It is installed in the runtime stage with a read-only bind mount of the `.deb` from the fetch stage, so the 36 MB package is not kept in a layer, and `apt-get install` resolves its dependencies. The dependencies are already installed in `node:26-slim` (section 7).
- Pandoc writes its PDF media into the current folder. Verified (section 7): from `/` or `/opt/scriba/app` it fails for UID 1000, and from `/tmp` it succeeds. So every Pandoc run in the image uses a writable folder, such as a temp dir (section 5). The image's `WORKDIR` stays `/opt/scriba/app`.
- Typst is release `v0.15.1`, asset `typst-<triple>.tar.xz`, where the triple is `x86_64-unknown-linux-musl` (amd64) or `aarch64-unknown-linux-musl` (arm64). The binary goes to `/usr/local/bin/typst`. The version is open point 3.
- Checksums are the SHA-256 values in GitHub's asset `digest` field (section 7), pinned as literals in the fetch stage's `case`. The downloads are checked with `sha256sum -c`.
- `ca-certificates` is installed by apt in the runtime stage, because `node:26-slim` does not ship it.
- Build args: `VERSION` (default `0.0.0-dev`), `REVISION` (default `dev`), `BUILT_AT` (default `dev`). The Dockerfile declares them just before the `build-info.ts` write (section 2). `scripts/build-image.sh` validates them, passes them explicitly and prints them.
- PLT-17 reads the pinned version from `build-info.js` inside the image. One source only: no OCI label and no ENV for the version (section 5).
- Image metadata: `WORKDIR /opt/scriba/app`, `USER 1000:1000`, `ENTRYPOINT ["/usr/local/bin/scriba-entrypoint"]`. No `CMD`, `EXPOSE` or `HEALTHCHECK`. Compose owns the healthcheck (PLT-15).
- No committed test file and no CI change. The checks are the commands in section 4. `ci.yml` has no Docker step, and the unit does not ask for one. Image smoke in CI is PLT-19.
- Local tags: `bbartolome/scriba:plt14` for the test image; `bbartolome/scriba:local-amd64` and `bbartolome/scriba:local-arm64` from `scripts/build-image.sh`. The existing local image `bbartolome/scriba:dev` is not touched (section 7).
- Image sizes are recorded as unpacked and compressed, for both arches: arm64 in criterion 1, amd64 in criterion 5 after the build. Story 26 is compared with the compressed size (open point 2).

## 2. Files to create or change

| Path | Change | Purpose |
|---|---|---|
| `Dockerfile` | new | Stages `fetch`, `build`, `runtime` (spec below) |
| `.dockerignore` | new | Excludes `.git`, `**/node_modules`, `**/dist`, `**/.angular`, `plans`, `units`, `modules`, `prompt.md`, `.claude`, `.scriba-dev`, `e2e/test-results`. Workspace folders stay: `npm ci` needs every workspace in the tree |
| `scripts/entrypoint.sh` | new, git mode 100755 | POSIX `sh`: the SETUP branch and the API start (spec below) |
| `scripts/build-image.sh` | new, git mode 100755 | bash: validates the args, prints them, then `docker buildx build --platform linux/<arch> --load` for amd64 and arm64 |

Not changed: root `package.json`, `package-lock.json`, `.gitignore`, `.prettierignore`, `.github/workflows/ci.yml`, `apps/api/src/modules/platform/build-info.ts` (rewritten inside the build stage only), `apps/api/src/modules/platform/compose-version.ts`, `deploy/`, `examples/`, `packages/packs/`.

Dockerfile spec (the implementer writes the exact text):

- `fetch` stage: `FROM node:26-slim AS fetch`. `ARG TARGETARCH`. Install `ca-certificates curl xz-utils` with `--no-install-recommends`. A `case` on `$TARGETARCH` (`amd64` or `arm64`, otherwise exit 1) sets the Pandoc digest, the Typst triple and the Typst digest. Download `https://github.com/jgm/pandoc/releases/download/3.13/pandoc-3.13-1-$TARGETARCH.deb` to `/tmp/pandoc.deb` and run `sha256sum -c`. Download `https://github.com/typst/typst/releases/download/v0.15.1/typst-$TYPST_TRIPLE.tar.xz`, run `sha256sum -c`, extract with `tar -xJf`, and `install -m 0755` the `typst` binary to `/out/typst`.
- `build` stage: `FROM node:26 AS build`. `WORKDIR /src`. `COPY . .`. Then `npm ci`. Then, in this order: `ARG VERSION=0.0.0-dev`, `ARG REVISION=dev`, `ARG BUILT_AT=dev`, declared immediately before the write so that changing only the args does not rebuild the `npm ci` layer; write `apps/api/src/modules/platform/build-info.ts` with `printf` as `export const BUILD_INFO = { version, revision, builtAt } as const;` (the current shape); `npm run build -w @bbartolome/scriba-contracts`; `npm run build -w @bbartolome/scriba-api`; `npm run build -w @bbartolome/scriba-web`; `npm ci --omit=dev -w @bbartolome/scriba-api -w @bbartolome/scriba-contracts`. Last, copy the runtime paths of section 1 to `/out/app`, keeping their relative layout and the workspace symlinks. Copy `apps/api/node_modules` and `packages/contracts/node_modules` only when they exist (a shell `if [ -d ... ]`), so a missing folder does not fail the build.
- `runtime` stage: `FROM node:26-slim AS runtime`. `WORKDIR /opt/scriba/app`. In one `RUN` with `--mount=type=bind,from=fetch,source=/tmp/pandoc.deb,target=/tmp/pandoc.deb`: `apt-get update`, install `ca-certificates /tmp/pandoc.deb` with `--no-install-recommends`, then `rm -rf /var/lib/apt/lists/*`. Copy `/out/typst` from `fetch` to `/usr/local/bin/typst`. Copy `/out/app` from `build` to `/opt/scriba/app`. Copy `packages/packs` to `/opt/scriba/packs`, `examples` to `/opt/scriba/examples` and `deploy` to `/opt/installer`, all from `build`, so the owner is root and the app user cannot write them. Copy `scripts/entrypoint.sh` to `/usr/local/bin/scriba-entrypoint` and `RUN chmod 0755` it. `USER 1000:1000`. `ENTRYPOINT ["/usr/local/bin/scriba-entrypoint"]`.

`scripts/entrypoint.sh` spec (exact text):

```sh
#!/bin/sh
set -eu
if [ "${SETUP:-}" = "true" ]; then
  cat <<'EOF'
#!/usr/bin/env bash
# PLT-14 stub: a no-op. PLT-17 replaces this script.
exit 0
EOF
  exit 0
fi
export SCRIBA_BOOKS_DIR="${SCRIBA_BOOKS_DIR:-/books}"
export SCRIBA_PACKS_DIR="${SCRIBA_PACKS_DIR:-/opt/scriba/packs}"
export SCRIBA_EXAMPLES_DIR="${SCRIBA_EXAMPLES_DIR:-/opt/scriba/examples}"
exec node /opt/scriba/app/apps/api/dist/main.js
```

`scripts/build-image.sh` spec: bash, `set -euo pipefail`, runs from the repo root. Defaults and checks, before any `docker` call: `VERSION` (default `0.0.0-dev`) must match the semver regex `^(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)(-[0-9A-Za-z.-]+)?(\+[0-9A-Za-z.-]+)?$`; `REVISION` (default `git rev-parse --short HEAD`) must match `^[0-9a-f]{7,40}$`; `BUILT_AT` (default `date -u +%Y-%m-%dT%H:%M:%SZ`) must match `^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}Z$`. It then prints `build-image: VERSION=<v> REVISION=<r> BUILT_AT=<b>` on stdout. Then, for `amd64` and `arm64` in turn: `docker buildx build --platform linux/$arch --build-arg VERSION="$VERSION" --build-arg REVISION="$REVISION" --build-arg BUILT_AT="$BUILT_AT" --load -t bbartolome/scriba:local-$arch .`. Any failure exits non-zero.

## 3. Method

Run from `/Users/bbartolome/workspace/scriba-prototype` unless a step names another path. Record `node -v`, `npm -v` and `docker version --format '{{.Server.Version}}'` beside each result. Expected Node `v26.x` and npm `11.20.0`. Do not use the main checkout's `node_modules`: it is stale (`zod` is absent; PLT-13 section 7). Do not push, add a remote or open a PR. Commit only after the local gates pass.

0. Guards. (a) `git merge-base --is-ancestor 20e2349 main` exits 0. (b) `git status --short -- ':!plans'` prints nothing. (c) `git diff --quiet 20e2349 main -- ':!plans'` exits 0, so nothing outside `plans/` differs from the base. (d) `git remote` prints nothing. (e) `docker info --format '{{.ServerVersion}}'` prints a version; `docker buildx inspect --bootstrap` lists `linux/amd64` and `linux/arm64`; `docker manifest inspect node:26-slim` and `docker manifest inspect node:26` both exit 0. (f) `curl -s -o /dev/null -w '%{http_code}' 127.0.0.1:8080/healthz` prints `000`: nothing else may hold port 8080, or the local 200 check would be a false pass. If any check differs, stop and report.
1. Pins (read-only). `gh api repos/jgm/pandoc/releases/tags/3.13 --jq '.assets[] | select(.name|endswith(".deb")) | [.name,.digest]'` and `gh api repos/typst/typst/releases/tags/v0.15.1 --jq '.assets[] | select(.name|test("linux-musl")) | [.name,.digest]'`. Expected: the digests in section 7. Any difference: stop and report.
2. Worktree. `git worktree add -b unit/PLT-14 /tmp/plt14-wt main`. The worktree is based on the tip of `main` at the time of the run, not on `20e2349`. If `main` has moved outside `plans/` since `20e2349`, guard (c) in step 0 has already stopped the run. Expected: created. Steps 3 to 8 run in `/tmp/plt14-wt`.
3. Base install. `npm ci`. Expected: exit 0 (about 6 s in the planner's check; `install-scripts` notices are expected).
4. Write the four files of section 2. Run `chmod 0755 scripts/entrypoint.sh scripts/build-image.sh`. Expected: `git status --short` lists only those four paths.
5. Lock gate. Run a plain `npm install` (no package argument). Expected: exit 0, and `git diff --quiet -- package-lock.json package.json` exits 0. No dependency is added, so the lock must not change at all. The planner checked this: a plain install after `npm ci` at `20e2349` left `package-lock.json` byte-identical to `main`.
6. Local syntax. `sh -n scripts/entrypoint.sh && bash -n scripts/build-image.sh`. Expected: exit 0. No shell or Dockerfile linter is in the repo or installed (`shellcheck` and `hadolint` are absent), so `bash -n` and the Docker checks are the gates.
7. Root gates. `npm run build && npm test && npm run lint`. Expected: each exits 0. `npm run lint` ends with `All matched files use Prettier code style!`. Then `npm run build -w @bbartolome/scriba-contracts` and `-w @bbartolome/scriba-api` once more, so `apps/api/dist` exists for the local procedures.
8. Commit on `unit/PLT-14`: `git add Dockerfile .dockerignore scripts/entrypoint.sh scripts/build-image.sh`, then `git commit -m "feat(PLT-14): two-stage Dockerfile, entrypoint and local build script"`. Do not add `plans/PLT-14.md`. Expected: one commit on `unit/PLT-14`, with the two scripts at mode 100755 (`git ls-files -s scripts/*.sh`).
9. Fresh clone. `git clone --branch unit/PLT-14 /Users/bbartolome/workspace/scriba-prototype /tmp/plt14-fresh` into an empty target. Every Docker check in section 4 runs in `/tmp/plt14-fresh`, so only committed content is tested. Expected: clone exits 0.
10. Test image. In `/tmp/plt14-fresh`: `docker build --build-arg VERSION=1.2.3 --build-arg REVISION=abc1234 --build-arg BUILT_AT=2026-11-12T00:00:00Z -t bbartolome/scriba:plt14 .`. Expected: exit 0. Record the build time. The image is arm64, the host arch.
11. Checks. Run criteria 1 to 5 in section 4, in order. Criteria 2 and 3 also have local procedures, run from `/tmp/plt14-wt` after step 7. The amd64 size is measured inside criterion 5, after the amd64 image is built.
12. Record. Store the Node, npm and Docker versions, each command's output, the image sizes (unpacked and compressed, both arches, as criteria 1 and 5 define them) and the amd64 and arm64 build times. Write the sizes as a dated entry in `plans/DECISIONS.md`, on the main checkout (branch `main`, directory `/Users/bbartolome/workspace/scriba-prototype`), and commit it there as `docs(PLT-14): record the image sizes`, like the other `docs(PLT-*)` records. Do not commit it on `unit/PLT-14`. The PR cannot exist here (no remote), so DECISIONS.md is the committed record; the sizes are not "recorded in the PR". Do not tick a checkbox that a local check cannot prove (criterion 5, native amd64).
13. Cleanup. `docker rm -f plt14-c2` if present. Remove the test library folder in the daemon's view, not only on the host: `docker run --rm -v /Users/bbartolome/workspace:/w busybox sh -c 'rm -rf /w/.plt14-books.*'`, then confirm with `ls -a /Users/bbartolome/workspace | grep -c plt14-books` (expected 0). Remove `$HOME/plt14-local-books`. Run `git worktree remove /tmp/plt14-wt`. Remove the `/tmp/plt14-*` scratch paths the implementation created, excluding `/tmp/plt14-pdf-EFcR`. The planner's PDF scratch folders (`/tmp/plt14-pdf-EFcR` and `/Users/bbartolome/workspace/.plt14-pdf-mzQd`) are not removed by the implementer: they are noted for the user, and no step tries to remove them again. The local images `bbartolome/scriba:plt14`, `:local-amd64` and `:local-arm64` stay.

## 4. Acceptance criteria and checks

Each criterion has one check named `criterion N: ...`, with the exact command and what it asserts. `$IMG` is `bbartolome/scriba:plt14`, built in step 10. The commands run in `/tmp/plt14-fresh`, except the local procedures, which run in `/tmp/plt14-wt`. Each check is a command, not a committed test (section 1). A check passes only when every assertion holds. If a check fails, stop and report it; do not change the flags, the criterion or the check.

### criterion 1: runtime stage has Node LTS, Pandoc 3.13, Typst, ca-certificates, and no git, cc, gcc or make; size recorded

Command: step 10 (`docker build` as above).

Asserts:

- The build exits 0.
- Node LTS: `docker run --rm --entrypoint node $IMG -p 'process.version'` prints `v26.` followed by digits.
- Node LTS name, in the image: `docker run --rm --entrypoint node $IMG -p 'process.release.lts'` prints `Lithium`. The planner checked the same value on host Node 26.13.0 and in `node:26-slim`.
- Pandoc: `docker run --rm --entrypoint pandoc $IMG --version` has `pandoc 3.13` as its first line.
- Typst: `docker run --rm --entrypoint typst $IMG --version` starts with `typst 0.15.1`.
- ca-certificates: `docker run --rm --entrypoint dpkg-query $IMG -W -f='${Status}\n' ca-certificates` prints `install ok installed`.
- No git or compiler: `docker run --rm --entrypoint sh $IMG -c 'for b in git cc gcc make; do command -v "$b" && echo "present: $b"; done; true'` prints nothing.
- Size, arm64, as step 12 records it. Unpacked: `docker run --rm --user 0 --entrypoint sh $IMG -c 'du -sxk / | tail -n 1'` (KiB). It runs as root, as the base measurement did (section 7). Compressed: the CONTENT SIZE column of `docker image ls $IMG`, which is the stored compressed content (it also holds the small manifest and config blobs: for `node:26-slim` the column reads 88.4 MB against an 86.1 MB layer sum). Do not use the DISK USAGE column or `docker image inspect .Size`: on this containerd-store daemon they add the unpacked and compressed sizes together (section 7). The scriba images are single-platform, because each is loaded from one `--platform` build, so their columns are per image. The base image's listed size is not fixed: it depends on the platforms pulled. After an amd64 pull, `docker image ls node:26-slim` reads 463MB / 174MB (DISK USAGE / CONTENT SIZE, as the review reports), so the base figures in section 7 are for the arm64 pull only. The amd64 sizes are measured in criterion 5. The sizes are recorded, not gated (open point 2).
- Expected values for the real build's record, reported by the review's probe (the planner did not measure them): arm64 548,816 KiB unpacked and 156 MB content size; amd64 522,736 KiB unpacked and 153 MB content size (criterion 5). The unpacked values are 535.9 MiB and 510.5 MiB, and the content sizes are 156 MB and 153 MB. Both are within the open point 2 estimate (the point estimate is about 525 MiB unpacked, and the content range is 140 to 175 MB). The implementation records the measured values in step 12 and checks them against these.
- Checkbox: criterion 1's checkbox is ticked when every assertion above holds and the size record is committed on `main` as step 12 says. The DECISIONS.md record replaces "recorded in the PR" (open point 1).
- PDF decision check, not an acceptance criterion. The unit says `--to=typst --pdf-engine=typst` works out of the box. The working folder is `/tmp`, because Pandoc writes its PDF media into the current folder and UID 1000 cannot write `/opt/scriba/app` (section 7): `docker run --rm -w /tmp --entrypoint sh $IMG -c 'printf "# T\n\nhello\n" > /tmp/t.md && pandoc /tmp/t.md --to=typst --pdf-engine=typst -o /tmp/t.pdf && head -c 5 /tmp/t.pdf'` prints `%PDF-`. If it does not, stop and report (open point 11).
- Cause check, optional, not an acceptance criterion: `docker run --rm --entrypoint sh $IMG -c 'printf "# T\n\nhello\n" > /tmp/t.md && pandoc /tmp/t.md --to=typst --pdf-engine=typst -o /tmp/t.pdf; echo "exit=$?"'` run from the default working folder prints `exit=1` and a `createDirectory: permission denied` message on stderr. This shows why the check uses `-w /tmp`.
- Optional, same spirit: with `-w /tmp`, `pandoc /tmp/t.md -o /tmp/t.docx && pandoc /tmp/t.md -o /tmp/t.epub` then `head -c 2` of each file prints `PK` (both are zip containers).

Local procedure: none without Docker. The runtime contents exist only in the image. Docker is available on this host (section 7), so this check runs with Docker.

### criterion 2: no library mount fails on the app-state check; with a writable /books mount, /healthz returns 200

Asserts (a), no mount:

- `docker run --rm $IMG; echo "exit=$?"` (stdout and stderr both captured) prints `exit=1`, and the first line is exactly `Cannot write to the app-state folder /books/.scriba as UID 1000, GID 1000.`. No `Host path:` line appears, because `SCRIBA_LIBRARY` is unset. Source of the message: `apps/api/src/modules/platform/boot/app-state.ts`; `main.ts` writes the `BootError` to stderr and exits 1.

Asserts (b), writable mount. The library folder must be in a path the daemon can see. The planner's `$HOME` folder was not, so the library goes under the workspace parent:

```
LIB=$(mktemp -d /Users/bbartolome/workspace/.plt14-books.XXXX) && chmod 0777 "$LIB"
docker run -d --name plt14-c2 -v "$LIB":/books $IMG
POLL="fetch('http://127.0.0.1:8080/healthz').then(r=>{if(r.status!==200)process.exit(1)}).catch(()=>process.exit(1))"
for i in $(seq 1 30); do docker exec plt14-c2 node -e "$POLL" && break; sleep 1; done
docker inspect -f '{{.State.Running}}' plt14-c2
docker exec plt14-c2 node -e "fetch('http://127.0.0.1:8080/healthz').then(async r=>console.log(r.status, await r.text()))"
docker exec plt14-c2 node -e "fetch('http://127.0.0.1:8080/api/platform/version').then(async r=>console.log(r.status, await r.text()))"
stat -c '%u:%g' "$LIB/.scriba"
```

- The container is still running (`true`).
- The in-container fetch prints `200 {"status":"ok","version":"1.2.3"}`, which shows the build arg reaches `/healthz`. The `docker exec` `node -e` pattern is the same one the PLT-15 healthcheck uses, and it runs inside the container's own loopback.
- Version info prints `200 {"version":"1.2.3","revision":"abc1234","builtAt":"2026-11-12T00:00:00Z","composeVersion":0}`. `composeVersion` is the PLT-04 placeholder (0), so it is not checked further.
- `stat` prints `1000:1000`, so the app writes the library as its own UID, as seen from the host.
- Optional, not required: add `-p 18080:8080` and `curl http://host.docker.internal:18080/healthz` from the host shell. The shell here runs in a container, so `127.0.0.1` does not reach a published port (section 7).
- Cleanup of this block is step 13.

Decision checks (not acceptance criteria, but needed for GNP-05, the non-root default and PLT-15's zod):

- `docker run --rm --entrypoint sh $IMG -c 'id -u; if touch /opt/scriba/packs/x 2>/dev/null; then echo WRITABLE; else echo READONLY; fi'` prints `1000` and then `READONLY`.
- `docker run --rm --entrypoint id $IMG -u` prints `1000`.
- Nested zod, the contracts package resolves zod from its own folder: `docker run --rm --entrypoint node $IMG -p "require('node:module').createRequire('/opt/scriba/app/packages/contracts/dist/platform/index.js').resolve('zod')"` prints a path that starts with `/opt/scriba/app/packages/contracts/node_modules/zod/`. And `docker run --rm --entrypoint node $IMG -p "require('/opt/scriba/app/packages/contracts/node_modules/zod/package.json').version"` prints `4.6.7`, the version the lock pins there.
- The contracts subpath resolves from the API: `docker run --rm --entrypoint node $IMG -p "require('node:module').createRequire('/opt/scriba/app/apps/api/dist/main.js').resolve('@bbartolome/scriba-contracts/platform')"` prints `/opt/scriba/app/packages/contracts/dist/platform/index.js`.

Local procedure (no Docker; uses the build from step 7 in `/tmp/plt14-wt`):

- Failure path: `cd /tmp/plt14-wt && env -i PATH="$PATH" SCRIBA_BOOKS_DIR=/plt14-no-such-dir/books node apps/api/dist/main.js; echo "exit=$?"` prints the same message with the local path, then `exit=1`. The `/` directory is not writable by UID 1000.
- Success path, with the 200 tied to the new process:

```
cd /tmp/plt14-wt
env -i PATH="$PATH" SCRIBA_BOOKS_DIR="$HOME/plt14-local-books" node apps/api/dist/main.js & PID=$!
for i in $(seq 1 40); do c=$(curl -s -o /dev/null -w '%{http_code}' 127.0.0.1:8080/healthz); [ "$c" = 200 ] && break; sleep 0.25; done
kill -0 "$PID" && echo "PID $PID alive when the 200 arrived"
curl -s 127.0.0.1:8080/healthz
kill -TERM "$PID"; wait "$PID"; echo "exit=$?"
```

  Asserts: `c` reaches `200`; `kill -0` succeeds (the 200 came from this PID, not a leftover); the body is `{"status":"ok","version":"0.0.0-dev"}`; the exit after TERM is `0`. Step 0 (f) guarantees that port 8080 was free before the start.

### criterion 3: `docker run --rm -e SETUP=true $IMG` prints only a script to stdout that passes `bash -n`

Command: `docker run --rm -e SETUP=true $IMG > /tmp/plt14-setup.sh 2> /tmp/plt14-setup.err; echo "exit=$?"; bash -n /tmp/plt14-setup.sh; echo "bash-n=$?"; head -n 1 /tmp/plt14-setup.sh; test ! -s /tmp/plt14-setup.err && echo "stderr-empty"`

Asserts: `exit=0`; `bash-n=0`; the first line is `#!/usr/bin/env bash`; stderr is empty; the last line of stdout is `exit 0`. Stdout is the stub and nothing else, because the script is the only output the entrypoint writes to stdout.

Local procedure (no Docker): `cd /tmp/plt14-wt && SETUP=true sh scripts/entrypoint.sh > /tmp/plt14-setup.sh 2> /tmp/plt14-setup.err; echo "exit=$?"`, then the same assertions. The image runs the same file.

### criterion 4: an FTS5 MATCH query through `node:sqlite` returns a row inside the image

Command:

```
docker run --rm --entrypoint node $IMG -e "const {DatabaseSync}=require('node:sqlite');const db=new DatabaseSync(':memory:');db.exec('CREATE VIRTUAL TABLE t USING fts5(body)');db.exec(\"INSERT INTO t(body) VALUES ('the quick brown fox')\");console.log(JSON.stringify(db.prepare(\"SELECT body FROM t WHERE t MATCH 'quick'\").all()))"
```

Asserts: exit 0, and the output is `[{"body":"the quick brown fox"}]`.

Local procedure (no Docker; checks the module on the host, not the image): the same script with the host `node`. The planner ran it on Node `v26.13.0` with no flags, and it returned the row.

### criterion 5: the image builds natively on both amd64 and arm64

Commands, in `/tmp/plt14-fresh`:

- `VERSION=1.2.3 scripts/build-image.sh` exits 0. It prints `build-image: VERSION=1.2.3 REVISION=<r> BUILT_AT=<b>`; record `<r>` (the short SHA of the fresh clone) and `<b>` (the build time). It builds `linux/amd64` and `linux/arm64` and loads both.
- `docker image inspect --format '{{.Architecture}}' bbartolome/scriba:local-amd64` prints `amd64`. The same for `local-arm64` prints `arm64`.
- `docker run --rm --platform linux/amd64 --entrypoint node bbartolome/scriba:local-amd64 -p 'process.arch'` prints `x64`. `docker run --rm --entrypoint node bbartolome/scriba:local-arm64 -p 'process.arch'` prints `arm64`.
- Build args hold the validated values: `docker run --rm --entrypoint node bbartolome/scriba:local-arm64 -p "JSON.stringify(require('/opt/scriba/app/apps/api/dist/modules/platform/build-info.js').BUILD_INFO)"` prints `{"version":"1.2.3","revision":"<r>","builtAt":"<b>"}` with the values recorded above. The path follows from `tsconfig.build.json` (`rootDir` `src`, `outDir` `dist`), and the first run confirms it.
- Size, after the build, as step 12 records it: `docker run --rm --platform linux/amd64 --user 0 --entrypoint sh bbartolome/scriba:local-amd64 -c 'du -sxk / | tail -n 1'` (KiB, unpacked) and the CONTENT SIZE column of `docker image ls bbartolome/scriba:local-amd64` (compressed). The arm64 values come from `docker image ls` and the same `du` command on `local-arm64` (no `--platform`). The expected amd64 values are 522,736 KiB and 153 MB content size, and the expected arm64 values are 548,816 KiB and 156 MB (criterion 1, expected values).
- `grep -c -- '--platform' Dockerfile` prints `0`. No stage pins a platform, so each arch builds its own stages, with no cross-compile.
- `VERSION=not-semver scripts/build-image.sh 2> /tmp/plt14-badver.err > /tmp/plt14-badver.out; echo "exit=$?"` prints `exit=1`. The validation runs before any `docker` call, so no buildx output appears. `/tmp/plt14-badver.out` is empty (no `build-image:` line, because the values print only after validation), and `/tmp/plt14-badver.err` is a one-line message on stderr that names `VERSION`.

Cannot test locally (the native part). The cause is analogous to DECISIONS 2026-11-12 (PLT-11 criterion 5) and PLT-13 criterion 2, but not identical: there they had no remote; here the cause is that this host has no amd64 machine and no amd64 remote builder. The amd64 leg runs under QEMU emulation in Docker Desktop. The planner checked that emulation works (`docker run --rm --platform linux/amd64 busybox uname -m` prints `x86_64`), so the amd64 build is checked to succeed, but it is not native. The native amd64 leg is recorded as "cannot test locally", and its checkbox stays unticked. The native check is PLT-19's `ubuntu-24.04` amd64 matrix leg. The Navigator decides this (open point 1).

## 5. Downstream agreement

- **PLT-15 (compose).** Needs: image `bbartolome/scriba`; UID 1000 as the default user, which the `user:` override matches; `/books` as the library mount point (matches `SCRIBA_BOOKS_DIR`); `node` on PATH for the healthcheck one-liner; the app listening on `0.0.0.0:8080` inside the container (`main.ts`). The plan provides all of these, and criterion 2 checks the first three. The contracts package's zod 4.6.7 comes from its nested folder (criterion 2 decision check), which PLT-15 does not need to handle. PLT-15 keeps its `SCRIBA_*` pass-through; the entrypoint's `${VAR:-default}` lets it.
- **PLT-16 (smoke ST-1..3).** Needs a locally built image for compose. The plan provides `bbartolome/scriba:local-<arch>` from `build-image.sh`. PLT-15's compose names `bbartolome/scriba:${SCRIBA_IMAGE_TAG:-latest}`, so PLT-16 must choose the tag mapping. Gap: no local `:latest`. Open point 4.
- **PLT-17 (dispenser).** Needs: `SETUP=true` prints only a script to stdout, which criterion 3 checks; `tar` in the image, so the dispenser can extract `/opt/installer` (`node:26-slim` ships `/usr/bin/tar`, section 7); the stub in `scripts/entrypoint.sh`, which PLT-17 replaces in place. The plan provides all three. PLT-17 must not add a second entrypoint.
- **The pinned version (PLT-17 reads it; PLT-14 provides it; PLT-19 supplies it).** PLT-17 reads the version from `build-info.js` inside the image it pins: `docker run --rm --entrypoint node <ref> -p "require('/opt/scriba/app/apps/api/dist/modules/platform/build-info.js').BUILD_INFO.version"`. Ownership: PLT-14 owns the file, whose content the Dockerfile writes from `VERSION`; PLT-17 owns the read and the pin it writes into the script; PLT-19 owns passing `VERSION`. No OCI label and no ENV carry the version, so there is one source. PLT-17 and PLT-19 take this as the rule.
- **Non-release builds (PLT-17 and PLT-19).** A build with `VERSION=0.0.0-dev` (the default of `build-image.sh` and of the Dockerfile) is not published under a semver tag, so it is not pullable. PLT-17 and PLT-19 must handle such builds by pinning the revision instead (the `REVISION` and `builtAt` values in `build-info.js`). PLT-14 changes nothing here.
- **Installer extraction (PLT-17).** `/opt/installer` holds `deploy/` as copied, including `deploy/.gitkeep` (today's only file). PLT-17's extraction into the install folder must not place `.gitkeep` there. PLT-14 changes nothing here.
- **PLT-18 (update and rollback).** Uses the same dispenser one-liner (`docker run --rm -e SETUP=true bbartolome/scriba | bash`) and published tags. The plan provides the one-liner's behaviour. Published tags are PLT-19's.
- **PLT-19 (publish).** Needs: the build args `VERSION`, `REVISION`, `BUILT_AT` (named here; `VERSION` is the semver, and the build reads the rest); the native matrix (`ubuntu-24.04` and `ubuntu-24.04-arm`, unit PLT-19 line 23); the smoke list (unit PLT-19 lines 32-34): `pandoc --version` reports 3.13, `typst --version` runs, and a Markdown file converts to DOCX, EPUB and PDF inside the image. The plan provides the tools on PATH. Gap: PLT-19's PDF smoke must run Pandoc from a writable folder (below). Gap: PLT-19's "`docker run` with no sidecar returns 200 from `/healthz`" needs a writable `/books` mount. Without one, criterion 2 shows the container exits 1. PLT-19 must add the mount.
- **Pandoc runs in CEX-10, CEX-13, CEX-15 and PLT-19's PDF smoke (the working folder rule).** Pandoc 3.13 writes its PDF media into the current folder, and the image's working folder is `/opt/scriba/app`, which UID 1000 cannot write (verified, section 7). So every Pandoc run in the image uses a writable folder, such as a temp dir, passed as the child process's working directory. The API process itself inherits `/opt/scriba/app` as its working folder, so CEX-10's runner, which spawns Pandoc from inside the API, must set `cwd` on the child process. CEX-13 and CEX-15 apply the same rule to their PDF runs, and PLT-19's PDF smoke runs with `-w /tmp` or equivalent. Open point 12 records the alternative.
- **GNP-05 (core gate).** Needs `/opt/scriba/packs/core` present and not writable by the app user. The plan copies `packages/packs` as root-owned, and the read-only decision check passes on the packs root. The `core` folder itself comes from GNP-01.
- **TRG-06 and TRG-07 (Tool registry, pack loader and lint).** The image's `/opt/scriba/packs` (and `packages/packs` in dev, which is the same `SCRIBA_PACKS_DIR` value in dev) holds `package.json`, `tsconfig.json`, `src/` and `test/` at its root, next to `core/`, `nonfiction/` and `fiction/`. The loader must read only `core`, `nonfiction` and `fiction` under the packs root and ignore everything else (TRG-06 names these three packs). PLT-14 copies the whole folder, as the unit says, and does not filter it. `test/` ships in the image too; that is acceptable for the golden fixtures of GNP-02.
- **PLT-04 (composition root).** Needs its `build-info.ts` filled from build args, and `composeVersion` left as a placeholder. The plan writes `build-info.ts` in the build stage only, and does not touch `compose-version.ts`. No conflict.
- **CEX-10, CEX-13, CEX-15 (Compile and export).** Need Pandoc 3.13 and Typst on PATH in the image. Provided. Gap: CEX-13's spike may need a different Typst (open point 3), and the working-folder rule above applies to their PDF runs.
- **SAU-10 (compose-version status).** Its UI text quotes the same dispenser one-liner. Provided by the SETUP branch.

## 6. Open points

Post-approval text changes (Opus approved revision 3, DECISIONS 2026-11-12 "PLT-14 — Opus plan review of revision 3", commit eab17be; text and check additions only, no criterion or decision changed):

- **Item 1.** Criterion 1's checkbox rule and the Navigator's choice on it: open point 1, second choice (criterion 1 section, "Checkbox").
- **Item 2.** Criterion 5: `VERSION=not-semver scripts/build-image.sh` exits 1 with a one-line message on stderr naming `VERSION`, before any `docker` call.
- **Item 3.** Criterion 1: the scriba images are single-platform; the base image's listed size depends on what was pulled (after an amd64 pull, `docker image ls node:26-slim` reads 463MB / 174MB, as the review reports).
- **Item 4.** Expected probe sizes for the real build's record: arm64 548,816 KiB unpacked and 156 MB content size; amd64 522,736 KiB unpacked and 153 MB content size, both within the open point 2 estimate (criterion 1, expected values).
- **Item 5.** Step 2: the worktree is based on the tip of `main` at the time of the run, not on `20e2349`.
- **Item 6.** Section 5, two notes for PLT-17 and PLT-19 (non-release builds with `VERSION=0.0.0-dev` pin by revision; `deploy/.gitkeep` is not extracted into the install folder). No change to PLT-14's work.
- **Item 7.** The planner's scratch folders (`/tmp/plt14-pdf-EFcR` and `/Users/bbartolome/workspace/.plt14-pdf-mzQd`) are noted for the user and are not removed by any step (step 13 and section 7).

Revision 3 changes (Opus rejection 2, DECISIONS 2026-11-12 "PLT-14 — Opus plan review of revision 2", commit ceac02c):

- **Blocking 1, PDF check.** The check runs with `-w /tmp` and keeps the exact flags `--to=typst --pdf-engine=typst`. The section 8 assumption is replaced by the verified fact: from `/` and from `/opt/scriba/app` the command exits 1 with `createDirectory: permission denied` on `./media-<hash>`; from `/tmp` it exits 0 and the file starts with `%PDF-`. Verified in a scratch container with the planned runtime steps (section 7); the planned image is not built yet, and criterion 1 confirms it. Section 1; section 4, criterion 1; section 5 (the working-folder rule for CEX-10, CEX-13, CEX-15 and PLT-19); section 8.
- **Text 2, size procedure.** (a) The `du -sxk /` measure runs with `--user 0`, as the baseline did (section 4, criteria 1 and 5). (b) The amd64 size is measured on `bbartolome/scriba:local-amd64` with `--platform linux/amd64`, inside criterion 5, after the build, not in step 11 (step 11 now says so).
- **Text 3, build args.** `build-image.sh` passes `--build-arg VERSION="$VERSION"`, `REVISION` and `BUILT_AT` explicitly and prints them (section 2). A new check in criterion 5 runs `node -p` on `/opt/scriba/app/apps/api/dist/modules/platform/build-info.js` inside `local-arm64` and compares the values with the printed ones.
- **Text 4, DECISIONS commit.** Step 12 commits the size entry on the main checkout (branch `main`), as the other `docs(PLT-*)` records do, not on `unit/PLT-14`.
- **Text 5, ci.yml list.** Section 7 now lists all the steps: checkout, setup-node, Check PR title (pull requests only), Install, Lint, Test, Build, E2E, and the trace upload (on failure only).
- **Note 1, ARG placement.** The `ARG VERSION`, `REVISION` and `BUILT_AT` lines are declared just before the `build-info.ts` write, after `npm ci` (section 2). Changing only the args does not rebuild the install layer.
- **Note 2, PLT-17 version source.** PLT-17 reads the version from `build-info.js` in the image. PLT-14 owns the file, and PLT-19 supplies `VERSION` (section 5). One source; no OCI label or ENV.

Revision 2 changes (Opus rejection 1, DECISIONS 2026-11-12 "PLT-14 — Opus plan review of revision 1", commit 9db6152), kept for the record:

- **Blocking 1, criterion 2(b).** The library is under `/Users/bbartolome/workspace` (daemon-visible), not `$HOME`. The HTTP asserts run inside the container with `docker exec ... node -e fetch(...)`. Host `127.0.0.1` is not used. The cleanup (step 13) runs a `docker run` rm.
- **Blocking 2, port 8080.** Step 0 (f) requires `curl 127.0.0.1:8080/healthz` to print `000`. The local success path asserts `kill -0 $PID` when the 200 arrives.
- **Blocking 3, nested zod.** The runtime tree copies `packages/contracts/node_modules` (zod 4.6.7) and `apps/api/node_modules` when present. Checks: `require.resolve('zod')` from the contracts dist resolves to the nested copy, and the version is 4.6.7.
- **Blocking 4, size.** The earlier estimate and the 375 MB figure were wrong (section 7). Both are now measured separately, and the procedure covers both arches. Story 26 is compared with the compressed size. The Pandoc `.deb` is bind-mounted, not copied into a layer.
- **Text 5.** Criterion 5's cause is "analogous" to PLT-11 criterion 5 and PLT-13 criterion 2, not identical. Kept as open point 1.
- **Text 7.** `node:26-slim` already has libc6 2.41-12+deb13u4, libgmp10 2:6.3.0+dfsg-3 and zlib1g 1:1.3.dfsg+really1.3.1-1+b1, each `install ok installed` (open point 9).
- **Text 8.** The citation is "DECISIONS 2026-11-11 'PLT-02, PLT-03, PLT-09 — smaller plan choices accepted as drafted (Navigator decision)', item 2".
- **Text 9.** In-image LTS check: `node -p process.release.lts` prints `Lithium` (criterion 1).
- **Text 10.** `/opt/scriba/packs` gets `package.json`, `tsconfig.json`, `src/` and `test/` as well as the pack folders (section 5, TRG-06 and TRG-07).

Open points for the Navigator:

1. **Criterion 5, native amd64.** The plan checks the amd64 build here under QEMU and records the native amd64 leg as "cannot test locally" (section 4). The cause is analogous to DECISIONS 2026-11-12 (PLT-11 criterion 5) and PLT-13 criterion 2, but not identical: this host has no amd64 machine and no amd64 remote builder. The native check is PLT-19's amd64 runner. The Navigator confirms this option before the checkbox is left unticked. Second choice, criterion 1: the planner's choice is to tick criterion 1 once the sizes are committed on `main` in `plans/DECISIONS.md` (step 12), because that record replaces "recorded in the PR". The alternative is to leave it unticked as "recorded in DECISIONS.md, not in a PR". The Navigator decides which.
2. **Image size.** Measured on this host, arm64 `node:26-slim`: unpacked 280,416 KiB (273.9 MiB, `du -sxk /` as root in the container); compressed 86,146,461 bytes (82.2 MiB, layer sum from the manifest). amd64 `node:26-slim`: compressed 85,753,455 bytes (81.8 MiB, from the manifest); its unpacked size is not measured, because it needs a pull. The DISK USAGE column (377 MB) and `inspect .Size` (375,264,732 bytes) add the two sizes together, so they are not used. For the finished image, the planner's estimate is about 525 MiB unpacked and 140 to 175 MB compressed (not measured). The Opus review of revision 2 reports an arm64 probe of about 495 MiB unpacked and 151 MB compressed; the planner did not reproduce it. The implementation records the real figures for both arches. Chosen: story 26 (image about 300 to 400 MB) is compared with the compressed size, because it is the size a user downloads and the one a registry shows. On that comparison the figures are below 300 to 400 MB. On the unpacked size they are above it. Both are recorded. Nothing gates on either. The Navigator decides which size story 26 binds to, and whether the target binds at all. A smaller base is not in the unit; dropping Pandoc is not allowed.
3. **Typst version.** The unit says "pinned" but names no version. Chosen: v0.15.1, the latest GitHub release at planning time (published 2026-07-17). The CEX-13 spike may need another version. Changing it means editing the `case` in the fetch stage: the triple names stay the same, and the two digests change.
4. **Local tags for PLT-15 and PLT-16.** `build-image.sh` tags `local-<arch>`, and the tests use `plt14`. The mapping from compose's `SCRIBA_IMAGE_TAG` to these tags is PLT-16's decision. The existing local `bbartolome/scriba:dev` (section 7) is not used or changed.
5. **Floating tags.** `node:26` and `node:26-slim` are not pinned by digest, because the unit says `node:<lts>`. At planning time both resolve to `v26.13.1`. PLT-19 may pin digests. Simplest option taken: tags.
6. **No committed tests.** The checks are commands in section 4. A committed script, for example `scripts/image-check.sh`, would be a scope addition; it is not in the plan. The Navigator decides whether one is wanted.
7. **Unvalidated build-info write.** The Dockerfile writes `build-info.ts` with `printf` from the build args. Only `build-image.sh` validates them. A direct `docker build --build-arg VERSION="x'y"` would produce invalid TypeScript and fail the build (it does not produce a bad image). Simplest option taken: accept it. PLT-19 passes validated values.
8. **Entrypoint location.** The unit does not name the file. Chosen: `scripts/entrypoint.sh`, copied to `/usr/local/bin/scriba-entrypoint`. The name matches the entrypoint of the existing local image (section 7). PLT-17 may move the file. Its stub stays inside it.
9. **Closed.** `node:26-slim` already has libc6, libgmp10 and zlib1g installed (section 7), so the Pandoc `Depends` are met. The amd64 Pandoc package's `Depends` were not read; the plan assumes they are the same (section 8). Criterion 1's build proves the install.
10. **Build time under QEMU.** `npm ci` for amd64 runs under emulation. Its time is not measured, and no timeout is set. The implementer records it (step 12).
11. **PDF flags.** The unit names `--to=typst --pdf-engine=typst`, and the reproduction (section 7) shows they write a PDF from a writable working folder. The planned image is not built yet, so criterion 1's PDF check is the first run on it. If it fails there, the implementer stops and reports; the Navigator decides whether another flag set is acceptable.
12. **WORKDIR and the API's working folder.** The plan keeps `WORKDIR /opt/scriba/app`, as the unit's layout requires. The API process runs there, so any child process that writes into its working folder fails. The alternative is `WORKDIR /tmp` in the runtime stage, which hides the problem for the API process, but CEX-10's child process should set its own `cwd` anyway, so the plan does not take it. The Navigator may prefer it.

## 7. Facts checked

Repository and host (commands at planning time):

- `main` is at `ceac02c` (the revision 2 review record). `git diff --stat 20e2349 main` shows one file, `plans/DECISIONS.md`, with 24 insertions, and `git diff --quiet 20e2349 main -- ':!plans'` exits 0, so the base guard holds. `git status --short` shows only the untracked `plans/PLT-14.md`. `git remote` prints nothing, so there is no remote and no PR.
- `Dockerfile`, `.dockerignore`, `scripts/build-image.sh` and `scripts/entrypoint.sh` do not exist. `deploy/` and `examples/` contain only `.gitkeep`. `git log --all -- Dockerfile .dockerignore deploy scripts/build-image.sh scripts/entrypoint.sh` lists only `da7d0e2` (PLT-01). No Dockerfile or `.dockerignore` was ever committed.
- `packages/packs` holds `package.json`, `tsconfig.json`, `src/.gitkeep` and `test/smoke.test.ts`. The `core`, `nonfiction` and `fiction` folders do not exist yet (GNP-01 creates them).
- Root `package.json`: `engines` `>=26 <27`; workspaces are `packages/contracts`, `apps/api`, `apps/web`, `packages/packs`, `e2e`; `build` builds contracts, api, web, packs and e2e; there is no `image` script. `.nvmrc` is `26`.
- `prettier --file-info` on a `.sh` file, a `Dockerfile` and a `.dockerignore` each prints `"inferredParser": null`, so Prettier does not check them.
- `scripts/*.test.mjs` do not read the `scripts/` folder (grep for `readdir` finds nothing).
- `.github/workflows/ci.yml` has one job, `ci`, with these steps in order: `actions/checkout@v7`; `actions/setup-node@v7` (`node-version-file: .nvmrc`, npm cache); Check PR title (`node scripts/check-pr-title.mjs`, pull requests only); Install (`npm ci`); Lint (`npm run lint`); Test (`npm test`); Build (`npm run build`); E2E (`npm run e2e`, with `SCRIBA_E2E_CHROMIUM`); Upload Playwright traces (`actions/upload-artifact@v7`, on failure only). PLT-14 does not change it.
- `apps/api/src/main.ts` listens on `8080` and `0.0.0.0`, and writes a `BootError` to stderr with exit 1.
- `apps/api/src/modules/platform/boot/app-state.ts` creates `${SCRIBA_BOOKS_DIR}/.scriba` recursively and checks `W_OK`. On failure it throws the message with the UID and GID.
- `apps/api/src/bootstrap.ts` resolves the static root as `resolve(__dirname, '..', '..', 'web', 'dist', 'scriba-web', 'browser')`, so the runtime layout must keep the repo's relative paths.
- `packages/contracts/src/platform/env.ts`: defaults `SCRIBA_PORT` `'8080'`, `SCRIBA_BOOKS_DIR` `'/books'`, `SCRIBA_PACKS_DIR` `'/opt/scriba/packs'`, `SCRIBA_EXAMPLES_DIR` `'/opt/scriba/examples'`, `SCRIBA_COMPOSE_VERSION` `null`, and others. `apps/api/src/modules/platform/boot/env.ts` requires absolute paths for the three dirs.
- `apps/api/src/modules/platform/build-info.ts` line 1: "Build values baked into the image (PLT-14 overwrites this file from build args). Dev values below." It holds `version: '0.0.0-dev'`, `revision: 'dev'`, `builtAt: 'dev'`. The compiled file is `dist/modules/platform/build-info.js`, by `tsconfig.build.json` (`rootDir` `src`, `outDir` `dist`); no built copy exists in the main checkout to confirm it, so criterion 5 confirms it on the first run.
- `apps/api/src/modules/platform/compose-version.ts`: `EXPECTED_COMPOSE_VERSION = 0`, a placeholder until PLT-15.
- `apps/api/src/modules/platform/health.controller.ts` is unguarded, and returns `{status: 'ok', version}`.
- The shell the planner used runs inside a container (`/.dockerenv` exists; `/proc/1/cgroup` is `0::/`). The Docker daemon runs in the Docker Desktop VM. Loopback in this shell is its own namespace, so a node process started here answers on `127.0.0.1` here, but a published container port does not appear at `127.0.0.1` in this shell.
- The daemon cannot see `/tmp`. A bind mount from `/tmp/plt14-pdf-EFcR` gave an empty `/src` (`cp: cannot stat '/src/pandoc.deb'`). Bind sources must be under `/Users/bbartolome/workspace`, which the daemon sees (its listing shows the workspace's entries). The build context of `docker build` is sent by the client, so the step 9 clone under `/tmp` is not affected (section 8).
- A bind mount from the workspace works for UID 1000. Test (revision 2, folder removed afterwards): `mktemp -d /Users/bbartolome/workspace/.plt14-books.XXXX`, `chmod 0777`, then `docker run --rm --user 1000:1000 -v "$LIB":/books busybox sh -c 'id -u; mkdir -p /books/.scriba && touch /books/.scriba/probe'` prints `1000`, and the files are `1000:1000` on the host, with a host-side write also `1000:1000`. A run without `--user` writes as root, which is not the image's default.
- Stale process, stopped at revision 2: PID 2822220, `node apps/api/dist/main.js`, started by the planner's probe from `/tmp/plt14-probe` (deleted, shown as `(deleted)` in its cwd), `SCRIBA_BOOKS_DIR=/tmp/plt14-books-probe`. It held port 8080 and gave a false 200. The planner sent it SIGTERM after checking the cwd and environment, and `curl 127.0.0.1:8080/healthz` then printed `000`. Not touched: PID 348609, another `node apps/api/dist/main.js` (six days old, cwd a deleted worktree of another unit); it does not hold port 8080.
- Daemon-side folder: a folder the planner created under `$HOME` (`plt14-mount-probe`) was removed on the host, but the daemon's view of `$HOME` still listed it, with a root-owned file. `$HOME` is therefore not a coherent shared folder. It was removed with `docker run --rm -v "$HOME":/h busybox rm -rf /h/plt14-mount-probe`; a later listing shows it gone.

Build and boot (scratch copy of `git archive main` in `/tmp`, deleted after the checks):

- `npm ci` exits 0 in 6.3 s, with `install-scripts` notices for `@parcel/watcher`, `@swc/core`, `esbuild`, `lmdb` and `msgpackr-extract`.
- A plain `npm install` after `npm ci` exits 0 and leaves `package-lock.json` byte-identical to `main`.
- `npm run build -w @bbartolome/scriba-contracts`, then `-w @bbartolome/scriba-api` and `-w @bbartolome/scriba-web`, each exit 0. `apps/web/dist/scriba-web/browser` holds `index.html`, `main-*.js`, `styles-*.css` and `favicon.ico`.
- The built API, with `SCRIBA_BOOKS_DIR` set to a temp folder, answers `GET /healthz` with 200 and `{"status":"ok","version":"0.0.0-dev"}`. `GET /api/platform/version` returns `{"version":"0.0.0-dev","revision":"dev","builtAt":"dev","composeVersion":0}`. `GET /` returns 200 `text/html`. It creates `<books>/.scriba/settings.yaml`. SIGTERM ends it with exit 0.
- An unwritable parent (`/plt14-no-such-dir` and `/proc/plt14`) gives the app-state message on stderr and exit 1, as UID 1000.
- `npm prune --omit=dev` leaves 86 MB, including `@angular` at 52 MB.
- `npm ci --omit=dev -w @bbartolome/scriba-api -w @bbartolome/scriba-contracts` prints "added 101 packages", leaves 33 MB, has no `@angular`, and keeps the workspace symlinks `scriba-api -> ../../apps/api` and `scriba-contracts -> ../../packages/contracts`.
- Zod, from a fresh `git archive main` with that `npm ci --omit=dev` install: root `node_modules/zod` is 4.6.6; `packages/contracts/node_modules/zod` is 4.6.7; `require.resolve('zod')` from `packages/contracts` returns the nested copy. `apps/api/node_modules` does not exist in that install. In the main checkout, `apps/api/node_modules` and `packages/contracts/node_modules` hold only a `.vite` cache. The lock has `node_modules/zod` 4.6.6 and `packages/contracts/node_modules/zod` 4.6.7.
- The boot test of a runtime tree booted, but that tree had no `packages/contracts/node_modules`, so zod came from the root (4.6.6). That test did not exercise the nested zod; the criterion 2 decision checks do.

Pandoc and Typst reproduction (revision 3; scratch container, not the planned image, which is not built yet):

- Inputs: the Pandoc arm64 `.deb` (`pandoc-3.13-1-arm64.deb`) and the Typst aarch64 archive (`typst-aarch64-unknown-linux-musl.tar.xz`) were downloaded with `gh` to a scratch folder. Their SHA-256 matched the digests in section 7. The `typst` binary was extracted on the host.
- Container: `node:26-slim`, the scratch folder bind-mounted read-only at `/src`. As root: `/opt/scriba/app` created with mode 0755 (the planned WORKDIR, root-owned); the `.deb` copied to `/tmp`, installed with `apt-get install --no-install-recommends ca-certificates /tmp/pandoc.deb` (succeeded); the binary copied to `/usr/local/bin/typst`. `pandoc --version` prints `pandoc 3.13`; `typst --version` prints `typst 0.15.1 (9dfd3a08)`.
- Checks run as UID 1000 with `setpriv --reuid=1000 --regid=1000 --clear-groups env HOME=/home/node`, with `--to=typst --pdf-engine=typst -o /tmp/tN.pdf`:
  - working folder `/`: exit 1; stderr `pandoc: ./media-7f2602e140fb24f7: createDirectory: permission denied`; no PDF.
  - working folder `/opt/scriba/app`: exit 1; stderr `pandoc: ./media-ea19411524e5170b: createDirectory: permission denied`; no PDF.
  - working folder `/tmp`: exit 0; the first five bytes are `%PDF-`.
- Scratch left behind, not removed: a removal of `/tmp/plt14-pdf-EFcR` was blocked by the safety check, and the planner did not retry it. Noted for the user; do not try to remove these folders again. Two folders hold the copies: `/tmp/plt14-pdf-EFcR` (`pandoc.deb`, `typst`) and `/Users/bbartolome/workspace/.plt14-pdf-mzQd` (`pandoc.deb`, `typst`). Step 13 lists them for removal.

Docker, registry and images:

- Docker Desktop. Server `29.8.2`, client `29.9.0`, containerd snapshotter, `aarch64`, 6 CPUs, 3.8 GiB memory. Buildx `v0.38.0`. The `default` builder (docker driver, BuildKit `v0.33.1`) lists `linux/amd64` and `linux/arm64`.
- `docker run --rm --platform linux/amd64 busybox:latest uname -m` prints `x86_64`, so QEMU emulation works.
- `docker manifest inspect node:26-slim` and `node:26` both list `linux/amd64` and `linux/arm64`.
- `node:26-slim` was pulled for these checks. Inside it: `node` `v26.13.1`, `process.release.lts` `Lithium`, npm `11.20.0`, Debian 13 (trixie), user `node` at UID 1000 and GID 1000, `/usr/bin/tar` and `/usr/bin/bash` present. Absent: `git`, `cc`, `gcc`, `make`, `curl`, `xz`. `ca-certificates` is `not-installed`.
- Sizes of `node:26-slim` (arm64 unless stated):
  - Unpacked: `du -sxk /` in the container, run as root (the image's default user), is 280,416 KiB (273.9 MiB).
  - Compressed: layer sum from `docker manifest inspect -v`: arm64 86,146,461 bytes (82.2 MiB); amd64 85,753,455 bytes (81.8 MiB). The manifest has four layers per arch.
  - `docker image ls`: DISK USAGE 377MB, CONTENT SIZE 88.4MB. `docker image inspect .Size` is 375,264,732 bytes. The unpacked 280,416 KiB is about 287 MB; 287 MB plus the 88.4 MB content is about 375 MB, which matches `.Size`. So DISK USAGE and `.Size` are the unpacked size plus the compressed content, not the unpacked size alone.
- Library versions inside `node:26-slim`, from `dpkg-query` (each `install ok installed`): libc6 `2.41-12+deb13u4`, libgmp10 `2:6.3.0+dfsg-3`, zlib1g `1:1.3.dfsg+really1.3.1-1+b1`.
- nodejs.org `dist/index.json`: `v26.13.1` has `lts` `Lithium` (2026-11-10). Node 26 is the LTS line. Host Node `v26.13.0` also prints `Lithium` for `process.release.lts`.
- Host Node `v26.13.0`, npm `11.20.0`. `require('node:sqlite')` with an FTS5 table and a `MATCH 'quick'` query returns `'the quick brown fox'` with no flags.
- `which hadolint shellcheck` prints nothing, so neither is installed.
- Local image `bbartolome/scriba:dev` exists (created 2026-11-09T22:35:46Z; Node 24.21.0; entrypoint `/usr/local/bin/scriba-entrypoint`; user `1000:1000`; env `SCRIBA_BOOKS_DIR=/books` and the two other dirs). It is not in this repo's history. It is not used and is not changed.

Pins (GitHub release API, `gh` logged in as `bbartolome`):

- Pandoc release `3.13`, published 2026-10-26. `pandoc-3.13-1-amd64.deb`: digest `sha256:7e3736f255090296ca5d1a14291a76b9b3c43cd385011b1621a4d0c16091a70f`, 35,507,160 bytes. `pandoc-3.13-1-arm64.deb`: digest `sha256:e55b480eb76997812b44c3f65f641c84214e623bc40b70a6b6d16ee00bfcca23`, 38,104,340 bytes.
- The arm64 `.deb` was downloaded to an empty folder. Its SHA-256 matched the digest. `dpkg-deb -f` shows `Depends: libc6 (>= 2.13), libgmp10, zlib1g (>= 1:1.1.4)`, `Version: 3.13-1`, `Installed-Size: 176148` (KiB). The package contains `/usr/bin/pandoc`.
- Typst latest release `v0.15.1`, published 2026-07-17. `typst-x86_64-unknown-linux-musl.tar.xz`: digest `sha256:a6d077d0a95eed5a2eba715b2dae06be954f624ccbf85758a03f389ded33118c`, 17,462,992 bytes. `typst-aarch64-unknown-linux-musl.tar.xz`: digest `sha256:5aa8d74a3d906e60ea12a66ac2f37f8eef1b14cbad7182a745e393a10c23dcee`, 16,216,812 bytes.
- The aarch64 Typst archive was downloaded to an empty folder. Its SHA-256 matched the digest. It contains `typst-aarch64-unknown-linux-musl/typst`, mode `0755`, 48,655,936 bytes, plus README, NOTICE and LICENSE.

Unit and module text the plan relies on:

- Unit PLT-14: Decisions (two stages, runtime contents, build args, entrypoint, user, native builds, no thin layer), Scope, and the five criteria (lines 36 to 40).
- Unit PLT-04 line 25: `version`, `revision` and `builtAt` come from build args baked into the image.
- Unit PLT-15: `image: bbartolome/scriba:${SCRIBA_IMAGE_TAG:-latest}`, `user: "${SCRIBA_UID:-1000}:${SCRIBA_GID:-1000}"`, `/books` bind mount, Node healthcheck of `http://127.0.0.1:8080/healthz`.
- Unit PLT-17: the dispenser `docker run --rm -e SETUP=true bbartolome/scriba | bash`, "Replaces PLT-14's entrypoint stub", extraction of `/opt/installer` with `tar`, pins the image ref it came from.
- Unit PLT-19: native `ubuntu-24.04` and `ubuntu-24.04-arm` matrix; build arg for the version; smoke list (lines 32-34).
- Unit TRG-06: packs root `SCRIBA_PACKS_DIR`, built-in packs `core`, `nonfiction`, `fiction`.
- Module `genre-packs.md` lines 37-38: packs ship read-only at `/opt/scriba/packs/{core,nonfiction,fiction}` through PLT-14's copy.
- Unit GNP-05: the image contains `/opt/scriba/packs/core` and the app user cannot write to it.

## 8. Assumed

- Verified (reproduced in a scratch `node:26-slim` container with the planned runtime steps, section 7, not the planned image): Pandoc 3.13 run as UID 1000 with `--to=typst --pdf-engine=typst -o` writes a PDF from `/tmp` (exit 0, `%PDF-`) and fails from `/` and `/opt/scriba/app` (exit 1, `createDirectory: permission denied`). Criterion 1 confirms it on the planned image with `-w /tmp`. The PDF's fonts are not inspected.
- Assumed, not run: the Pandoc `.deb` installs from the bind mount with `apt-get install` on Debian 13, because its three dependencies are already installed (section 7). Criterion 1's build proves it. The scratch reproduction installed it from `/tmp` inside the container, not from a bind mount.
- Assumed, not run: the amd64 Pandoc `.deb` installs the same way as the arm64 one, and has the same `Depends` (only its digest was read).
- Assumed, not run: Docker's `--load` works for the non-native amd64 platform on this containerd-store daemon. Criterion 5 shows it (step 11).
- Assumed, not run: `docker build` with `FROM node:26` (full) works for the build stage's `npm ci` and `ng build`, with no interactive prompt. The planner ran the same commands in a scratch copy on the host, not in Docker.
- Assumed, not run: `docker build` from `/tmp/plt14-fresh` works, because the client sends the build context and the daemon does not read `/tmp` for it. Step 10 shows it.
- Assumed, not run: `docker exec ... node -e "fetch(...)"` works in the image (Node 26 has a global `fetch`) and the container's loopback answers on 8080 from inside.
- Assumed, not run: root `npm test` and `npm run lint` pass at `ceac02c` (the same non-plans tree as `20e2349`). The planner ran only the builds. The step 7 gates will show it.
- Assumed: host port 8080 stays free for the local procedures. Step 0 (f) checks it immediately before the run.
- Assumed: the containerd snapshotter's DISK USAGE and `inspect .Size` follow the same unpacked-plus-compressed rule on the finished image. Measured on `node:26-slim` only.
- Not checked: the Docker build itself. No Dockerfile exists yet, and the planner built no image from this plan.
- Not checked: the native amd64 build (section 4, criterion 5), and the unpacked size of amd64 `node:26-slim` (it needs a pull).
- Not checked: the runtime image's `/opt/installer` and `/opt/scriba/examples` contents beyond `.gitkeep` (they hold only placeholders at this commit).
