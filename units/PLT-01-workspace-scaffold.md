---
id: PLT-01
title: Root npm workspace, pins and scripts skeleton
module: platform
phase: phase:scaffold
milestone: M1
blocked_by: []
parallel_with: []
unblocks: [PLT-02, PLT-03, PLT-04, PLT-09, PLT-10, PLT-12]
---

# PLT-01 — Root npm workspace, pins and scripts skeleton

## Why
Ten modules build in parallel and none can start until there is something to build into. Module builders need one root workspace with one lockfile so dependencies are added in one place and installs are reproducible (user story 27).

## Decisions
- **Plain npm workspaces**, one root `package.json` and lockfile. Contracts listed first so they build first. Workspaces:
  - `packages/contracts` → `@bbartolome/scriba-contracts`
  - `apps/api` → `@bbartolome/scriba-api` (NestJS)
  - `apps/web` → `@bbartolome/scriba-web` (Angular + Material)
  - `packages/packs` (content; its tool-spec YAML is validated by the Tool registry)
- `deploy/`, `e2e/` and `examples/` are folders, not packages (`e2e/` becomes a workspace only if it needs its own dev dependencies).
- **Vertical layout:** each module lives at `apps/api/src/modules/<m>/` plus `apps/web/src/app/features/<m>/`. Platform's own API code sits under the same convention as the `platform` module.
- **Pins:** Node via `.nvmrc` and `engines` (newest LTS, Node 26 at the time of writing, same major as the image); npm via `packageManager`; exactly one TypeScript version hoisted at the root. Angular, NestJS and Zod majors are pinned here.
- **Tooling:** Vitest in every workspace (Angular's default Vitest runner; NestJS via `unplugin-swc`). ESLint flat config plus Prettier check across workspaces.
- **Dev library:** `SCRIBA_BOOKS_DIR` defaults in dev to a git-ignored repo-local folder; `SCRIBA_PACKS_DIR` / `SCRIBA_EXAMPLES_DIR` point at `packages/packs` and `examples/`, so dev and image run the same code paths. Add the git-ignore entry here.
- Not used: pnpm, Yarn, Nx, Turborepo.

## Scope
- Root `package.json` with workspaces, `engines`, `packageManager`, and root scripts `build`, `test`, `lint` that fan out to every workspace (`dev`, `e2e`, `mock:openai` are added by PLT-11, PLT-13, PLT-12).
- Empty workspace packages with their own `package.json` and a trivial passing test each, so `build`/`test`/`lint` cover every workspace from day one.
- `tsconfig.base.json`, root ESLint flat config, Prettier config, `.nvmrc`, `.gitignore` (dev library folder, build output).
- Empty `deploy/`, `e2e/`, `examples/` folders (with `.gitkeep`).

## Acceptance criteria
- [x] `npm ci` on a fresh clone succeeds with one root lockfile.
- [x] `npm run build`, `npm test` and `npm run lint` pass from the root and each runs in every workspace.
- [x] Exactly one TypeScript version is installed (`npm ls typescript` shows a single deduped version).
- [x] Node and npm pins are present (`.nvmrc`, `engines`, `packageManager`).
- [x] The root `package.json` pin section names the Angular, NestJS and Zod majors (a test asserts that the three names are present; version numbers are not checked). Added by Navigator decision, 2026-11-10 (see `plans/DECISIONS.md`).
