---
id: PLT-14
title: Two-stage Dockerfile, entrypoint and local multi-arch build script
module: platform
phase: phase:image-compose
milestone: M1 (release track)
blocked_by: [PLT-11]
parallel_with: [PLT-12, PLT-13, "wave-1 modules"]
unblocks: [PLT-15, "Genre packs core gate (GNP-05)"]
---

# PLT-14 — Image

Release track: not needed for the dev-server M1 demo. Touches only Platform-owned files. Compile & export's export work gates on `phase:image-compose` for Pandoc 3.13 and Typst.

## Why
Export must work with nothing else installed (story 13), images for Apple Silicon and Intel/AMD (story 25), image about 300–400 MB (story 26).

## Decisions
- **Two stages.** Build stage on `node:<lts>` runs `npm ci` and builds contracts, API and web. Runtime stage on `node:<lts>-slim` (newest LTS, same major as `.nvmrc`) gets production dependencies only, plus:
  - the built API and web;
  - `packages/packs` at `/opt/scriba/packs`;
  - `examples/` at `/opt/scriba/examples`;
  - the `deploy/` files at `/opt/installer`.
- **Runtime contents:** built-in `node:sqlite` with FTS5 (no native addons); Pandoc 3.13 from the official per-arch `.deb`; Typst as a pinned static binary per arch, checksum-verified at build (`--to=typst --pdf-engine=typst` works out of the box); `ca-certificates`. **No git, no build toolchain.**
- **Build args:** semver version, revision and build time, reported by `/healthz` and version info. The expected compose version is a constant shipped with `deploy/` (PLT-15).
- **Entrypoint:** if `SETUP=true`, print the dispenser script to stdout (all diagnostics on stderr) and exit — **a stub here** that prints a valid no-op bash script; the real dispenser is PLT-17. Otherwise start the API.
- Default user is non-root UID 1000 so a bare `docker run` works; compose overrides with `user:`. No gosu.
- **Native builds** on amd64 and arm64; size measured and recorded.
- **No per-user thin layer.** TeX Live only ever arrives as a derived `FROM bbartolome/scriba` image if Compile & export's Typst spike calls for it.

## Scope
- `Dockerfile`, `.dockerignore`, entrypoint script, `scripts/build-image.sh` (local `docker buildx` for both arches).

## Acceptance criteria
- [ ] `docker build` produces an image whose runtime stage has Node LTS, Pandoc 3.13, Typst, `ca-certificates`, and no `git` or compiler (`cc`, `gcc`, `make` absent). Size measured and recorded in the PR.
- [x] `docker run` with no library mount fails clearly on the app-state check; with a writable `/books` mount, `/healthz` returns 200.
- [x] `docker run --rm -e SETUP=true <image>` prints only a script to stdout that passes `bash -n`.
- [x] An FTS5 `MATCH` query through `node:sqlite` returns a row inside the image.
- [ ] The image builds natively on both amd64 and arm64.
