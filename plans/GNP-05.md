---
id: GNP-05
title: Core gate — image read-only check, registry lists propose_graph
status: planned
---
# GNP-05 — plan

Batch: [GNP-05] (Genre packs, phase:core-propose-graph, M2), a batch of one. Written by the planner against main at `572ad32`. The working tree holds only ` M units/SAU-12-providers-step.md` (not touched) and this file. The planner built, tested, committed and pushed nothing. Section 7 lists the facts checked and the facts ASSUMED.

Revised by the reviser at main `e369b3e` (2026-11-16). The revision: applies the Navigator decision of `plans/DECISIONS.md`, 2026-11-16, GNP-01, option (a), to criterion 1 (unit line 20; D2, D12, open point 1); confirms the "criterion 20" mapping (D3, open point 2); settles open points 3 to 5 as plan choices (D7, D8, D16); moves the ticks and `status: done` to the orchestrator, as for GNP-04 and GNP-07 (step 14, section 2); corrects step 0 for the committed plan, the `await`s of the test code, the root `lint` script, the tool-row fields, the PLT-19 status and assumption A3; adds the image clean-up (step 13) and the section "Review parts". No unit file is changed.

## 1. Decisions this plan obeys

Each item names its source. "Plan choice" marks a small choice that no source settles; the simplest option is taken.

**D1 What the unit is.** A check, not code. GNP-05 adds no pack content, no runtime code and no contract slice. Its deliverables are the image check (criterion 3), the registry-list check (criterion 4), and the closing of the phase. Source: unit line 14 (closes the phase) and line 17 (scope); module line 3 ("content module ... no runtime code"); module line 38 ("Genre packs only verifies it").

**D2 Criteria.** Four checkboxes, unit lines 20 to 23. Their text is copied in section 4 and is not changed. This plan ticks none, and the implementer ticks none. After the merge, the orchestrator ticks lines 21 to 23 for the criteria whose tests passed (step 14), as it did for GNP-04 and GNP-07 (commit `52fd911`, `docs(GNP-07): criteria checked, plan status done`). Line 20 stays `[ ]`, and the unit is complete without it (D12). Source: unit lines 20 to 23; DECISIONS.md, 2026-11-16, GNP-01 (lines 4903 to 4908, the Navigator decision and its driver note).

**D3 Numbering.** DECISIONS.md, 2026-11-16, GNP-01 (line 4908) calls the CI clause "criterion 20". That number is the unit line, not the ordinal. Here the checkboxes are numbered 1 to 4, and the CI clause is criterion 1, on unit line 20. GNP-04's plan uses the same unit line numbers for these criteria ("lines 21 and 23", plans/GNP-04.md line 198), and so does GNP-01's plan (line 117, "GNP-05's criterion 20 (...) is the CI clause"). Confirmed by the reviser: the text that DECISIONS.md line 4908 quotes for "criterion 20" ("CI runs the pack validation suite on every push and fails on its broken-spec fixtures (GNP-01)") is, word for word, unit line 20, the first checkbox. The unit has 23 lines, so no ordinal 20 exists. Source: unit lines 20 to 23.

**D4 Blockers (unit line 7).** GNP-01, GNP-02, GNP-03, GNP-04 and the PLT-14 image build are merged on main, and each plan is `status: done`. The PLT-14 entry names the unit, as units/README.md line 63 asks when only part of a phase is needed. Source: unit line 7; units/README.md lines 61 and 63; section 7, F4.

**D5 Gate.** Merging this closes Genre packs `phase:core-propose-graph` (GNP-01 to GNP-05). Source: unit line 14; units/README.md line 105.

**D6 Image contract.** The runtime stage copies `packages/packs` to `/opt/scriba/packs` with `COPY`, without `--chown`, so the files are root-owned (Dockerfile line 58). The stage runs as `USER 1000:1000` (Dockerfile line 63). The read-only property therefore comes from ownership, not from a mount option. GNP-05 verifies it and does not change the Dockerfile. Source: module line 38; plans/PLT-14.md line 230 ("GNP-05 ... needs /opt/scriba/packs/core present and not writable by the app user").

**D7 Where the image check lives (plan choice; unit line 17 allows "Platform's image smoke or a local image test script").** A new local script, `scripts/packs-image-check.sh <image-ref>`. It is not added to `scripts/smoke-image.sh`, because that script belongs to PLT-19, which is done (`plans/PLT-19.md` line 3); it runs only in the publish job on a pushed image, which this local environment cannot produce; and `scripts/smoke-image.test.mjs` loops over its `CHECKS` list (lines 13 to 22, used at lines 104 and 127), so a new check would also change that done test. `plans/PLT-19.md` D12 (line 131) and line 619 allow a later additive packs step there; this unit does not add it. Source: unit line 17; section 7, F12.

**D8 Which image (plan choice).** The arm64 image only, which is the native architecture of this host (`docker info`: aarch64). It is built with the `docker buildx build` command of `scripts/build-image.sh` (lines 29 to 35), limited to `linux/arm64` and tagged `bbartolome/scriba:gnp05-arm64`. The existing `bbartolome/scriba:local-arm64` is not reused: `docker images` shows it was built three days ago, so it may predate the packs now on main. Amd64 is not built: the criterion names no architecture, and the lines that make the property (Dockerfile lines 58 and 63, `COPY` without `--chown` and `USER 1000:1000`) are the same for both platforms. PLT-14's criterion 5 (both architectures) stays PLT-14's. This settles old open point 3.

**D9 Criterion 2 is GNP-04's test (unit line 21).** GNP-05 adds no test for it. Its tests are the two `it` blocks of `apps/api/test/packs/propose-graph.test.ts` ("AC 1" at line 30, "AC 2" at line 45). Goldens change only on purpose, in the PR that changes the prompt (module line 87). This unit changes no prompt, so the procedure never passes `--update-goldens`. The recipe golden holds the tool catalogue, per the Navigator's decision N1 (DECISIONS.md, 2026-11-16, GNP-04, line 5137).

**D10 Criterion 4 has no test yet (unit line 23).** `apps/api/test/packs/core-gate.test.ts` (new) reads the registry list over HTTP, the external seam module line 85 asks for. The route is `GET /api/tool-registry/tools` (`packages/contracts/src/tool-registry/routes.ts` line 5; `apps/api/src/modules/tool-registry/tools.controller.ts` line 65). With no `genrePack` query the list holds every origin (`apps/api/src/modules/tool-registry/catalog.service.ts` lines 188 to 189). The row shape is `toolSummarySchema` (`packages/contracts/src/tool-registry/catalog.ts` lines 26 to 37).

**D11 Test harness (plan choice, taken from the existing kit).** The test boots as `apps/api/test/packs/golden.kit.ts` does: `await createTestApp({libraryDir, env: {SCRIBA_PACKS_DIR: PACKS_ROOT}})` (golden.kit.ts lines 169 to 172) and `await sessionCookie(app, library)` (line 173); `makeLibrary()` with no argument, then `TOOLS_ROUTE`, is the pattern of `apps/api/test/tool-registry-read-enable.test.ts` lines 247 to 261; `PACKS_ROOT` is exported at lines 28 to 36; `send` and `sessionCookie` come from `apps/api/test/guard-request.ts` (lines 27 and 80); `makeLibrary()` comes from `apps/api/test/settings.kit.ts` (line 60); the temp library is removed in a `finally` (golden.kit.ts line 235). Source: module line 87.

**D12 CI clause (unit line 20). Decided by the Navigator: option (a), "cannot test locally".** DECISIONS.md, 2026-11-16, GNP-01 (line 4903) decides it for GNP-01, and its driver note (line 4908) gives GNP-05's criterion 20 the same treatment. So: the CI clause is not tested locally; the checkbox on line 20 stays UNticked; the unit is complete without it; `.github/workflows/ci.yml` is not changed. The local proxy of that decision is recorded at step 10, with its two preconditions: (1) the root `npm test` output (step 9) includes the packs suite with its five broken-spec rows; (2) `node --test scripts/ci-workflow.test.mjs` passes. The proxy is evidence, not a pass.

**D13 Files this unit does not touch.** `Dockerfile`, `.dockerignore`, `.github/workflows/ci.yml`, `scripts/smoke-image.sh`, `scripts/smoke-image.test.mjs`, everything under `packages/packs/` and `packages/contracts/`, `apps/web/`, `e2e/`, `modules/`, `plans/DECISIONS.md`, `plans/QUEUE.md`, `apps/api/test/packs/propose-graph.test.ts`, the golden files, and every unit file except `units/GNP-05-core-gate.md` (ticks only, step 14). Source: module lines 3 and 89 (no runtime code, no e2e step); unit line 17.

**D14 Checks for the new TypeScript file (plan choice).** `apps/api/test/packs/core-gate.test.ts` must pass `npx prettier --check` (root `lint`, root package.json line 26) and `npm run lint -w @bbartolome/scriba-api` (`eslint .`, apps/api package.json).

**D15 Naming (plan choice).** Test names copy the criterion number and the criterion text, as GNP-04's `AC 1:` and `AC 2:` do (`apps/api/test/packs/propose-graph.test.ts` lines 30 and 45).

**D16 Three packs (settles old open point 4).** The scope (unit line 17) names `/opt/scriba/packs/{core,nonfiction,fiction}`; criterion 3 (unit line 22) names `core`. The script checks all three, because the scope asks for it. The `core` probes are the test of criterion 3; the `nonfiction` and `fiction` probes deliver the scope. Any failed probe fails the script (exit 1), and the unit is then not done: the implementer stops and reports, because the scope is not met even when every `core` probe passes.

**D17 Image clean-up (plan choice).** The tag `bbartolome/scriba:gnp05-arm64` is removed after step 8's output is recorded (step 13), so the build leaves no new tag. The other tags of F14 are not touched.

## 2. Files to create or change

Only these paths change. The implementer writes the two code paths, on the unit branch. The orchestrator commits the plan and, after the merge, makes the two last edits on main.

| Path | Change | Who | Reason |
|---|---|---|---|
| `apps/api/test/packs/core-gate.test.ts` | new | implementer | Criterion 4 test (D10, D11) |
| `scripts/packs-image-check.sh` | new, mode `0755` | implementer | Criterion 3 local image test script (D6, D7, D16). Bash, run once per image. Not run by CI, which has no Docker step |
| `plans/GNP-05.md` | this file; `status: done` after the merge | orchestrator | The plan. Not part of the code commit |
| `units/GNP-05-core-gate.md` | after the merge: `[x]` on those of lines 21, 22 and 23 whose tests passed | orchestrator | The repo's "criteria checked" convention (`52fd911`, `docs(GNP-07): criteria checked, plan status done`). No text changes. Line 20 stays `[ ]` (D2, D12) |

Not changed: `Dockerfile`, `.dockerignore`, `.github/workflows/ci.yml`, `scripts/smoke-image.sh`, `scripts/smoke-image.test.mjs`, `packages/packs/**`, `packages/contracts/**`, `apps/api/test/packs/propose-graph.test.ts`, `packages/packs/test/golden/**`, `plans/DECISIONS.md`, `plans/QUEUE.md`, every other unit and module file (D13).

## 3. Procedure

Run from `/Users/bbartolome/workspace/scriba-prototype`, on the branch the orchestrator names. If it names none, create `unit/GNP-05` from `main`, as PLT-02 step 2 does. Record `node -v`, `npm -v` and `docker version` with each result. Do not push. Use Node 26 for every `npm` and `node` command (ASSUMED, section 7, A6).

0. **Base and guards.**
   - (a) `git rev-parse --short HEAD` prints the main commit that holds this plan as `status: planned`, or a later commit. Check: `git diff --quiet 572ad32 HEAD -- packages/packs apps/api/test/packs apps/api/src/modules/tool-registry packages/contracts/src/tool-registry scripts Dockerfile .dockerignore` exits 0. If not, re-read the changed files before editing.
   - (b) `git status --short` prints nothing that is under a path of section 2 (an unrelated ` M units/SAU-12-providers-step.md` may be present; it is not touched).
   - (c) `grep -l '^status: \(draft\|planned\)' plans/*.md` prints `plans/GNP-05.md` only. If another plan is printed, read it and report before editing: a plan in progress could change a path of section 2.
   - (d) `for u in GNP-01 GNP-02 GNP-03 GNP-04 PLT-14; do git log --oneline main | grep -qF "($u)" || echo "missing $u"; done` prints nothing.

1. **Runtime.** `node -v` prints `v26.x` (`.nvmrc` is `26`). `npm -v` prints `11.x`. `docker info --format '{{.Architecture}}'` prints `aarch64` on this host. Expected: all three as stated (the reviser saw `v26.13.0`, `11.20.0` and `aarch64`).

2. **Baseline build of contracts.** `npm run build -w @bbartolome/scriba-contracts`. Expected: exit 0. The apps/api tests import the built `@bbartolome/scriba-contracts/*` subpaths (ASSUMED, section 7, A5).

3. **Criterion 2, baseline, before any edit.** `cd apps/api && npx vitest run test/packs/propose-graph.test.ts`. Expected: 2 passed, with no `--update-goldens` flag. If a test fails, stop and report. Do not regenerate goldens (D9). Then `git status --short packages/packs/test/golden` prints nothing.

4. **Write `apps/api/test/packs/core-gate.test.ts`** as section 4, criterion 4 specifies. Then `cd apps/api && npx vitest run test/packs/core-gate.test.ts`. Expected: 1 passed. If it fails because the `propose_graph` row is missing or its origin is not `core`, stop and report: criterion 4 is then not met on main.

5. **Write `scripts/packs-image-check.sh`** as section 4, criterion 3 specifies, then `chmod 0755 scripts/packs-image-check.sh`. Check: `bash -n scripts/packs-image-check.sh` exits 0, and running it with no argument prints a usage line on stderr and exits 2.

6. **Format and lint the TypeScript test.** `npx prettier --check apps/api/test/packs/core-gate.test.ts` exits 0 (run `npx prettier --write` on that one file if it does not). `npm run lint -w @bbartolome/scriba-api` exits 0 (D14).

7. **Build the image.** From the repo root:
   `docker buildx build --platform linux/arm64 --build-arg VERSION=0.0.0-dev --build-arg REVISION="$(git rev-parse --short HEAD)" --build-arg BUILT_AT="$(date -u +%Y-%m-%dT%H:%M:%SZ)" --load -t bbartolome/scriba:gnp05-arm64 .`
   Expected: exit 0. The build runs `npm ci` and downloads Pandoc and Typst from github.com (Dockerfile lines 19 and 21). If the build cannot reach the network, record "not attempted: no network" and leave criterion 3 unticked (ASSUMED, section 7, A1). The local `local-arm64` tag is not touched.

8. **Run the image check (criterion 3).** `scripts/packs-image-check.sh bbartolome/scriba:gnp05-arm64`. Expected: exit 0 and the eleven PASS lines of section 4, criterion 3. Record the output.

9. **Root gates.** From the root: `npm run build`, `npm test` and `npm run lint`. Expected: each exits 0. `npm test` runs every workspace's tests and `scripts/*.test.mjs` (root package.json line 25). `npm run lint` runs `npm run lint --workspaces`, `lint:examples`, `lint:packs` and `prettier --check .` (line 26). Keep the `npm test` output for step 10.

10. **Criterion 1, the local proxy of the Navigator decision (D12).** (i) The root `npm test` output of step 9 includes the packs suite with its five broken-spec rows (`fails on each broken-spec fixture: output-kind`, `unknown-hint`, `template-undeclared`, `duplicate-name`, `multi-line-description`; `packages/packs/test/broken-specs.test.ts` lines 9 to 19), all passed. (ii) `node --test scripts/ci-workflow.test.mjs` exits 0. Record both. This is evidence, not a pass of criterion 1: line 20 is not ticked, and the unit is complete without it. No push is made and no CI run is started.

11. **Commit the code.** `git add apps/api/test/packs/core-gate.test.ts scripts/packs-image-check.sh` by name. Check: `git diff --cached --stat` lists only those two files, and no `plans/` or `units/` file. Commit `feat(GNP-05): core gate, packs image check and the registry list test`. Do not use `git add -A` or `git commit -a`.

12. **Fresh clone.** Clone the branch into an empty folder: `git clone --branch <branch> /Users/bbartolome/workspace/scriba-prototype <empty-tmp>`. In that folder, run `npm ci && npm run build -w @bbartolome/scriba-contracts && cd apps/api && npx vitest run test/packs/core-gate.test.ts test/packs/propose-graph.test.ts`. Expected: 3 passed. If the registry cannot be reached, record "not attempted: no network".

13. **Record and clean up.** Store each command's output and the Node, npm and Docker versions in the implementer's report, with the image id of `bbartolome/scriba:gnp05-arm64` (`docker image inspect --format '{{.Id}}'`). Then `docker image rm bbartolome/scriba:gnp05-arm64` (D17). Remove the clone folder of step 12; if that is refused, record its path.

14. **Criteria checked (orchestrator, on main, after the merge).** The implementer does not tick and does not set the status. The implementer's report says, per criterion, passed or not: line 21 needs steps 3 and 12; line 22 needs step 8 (and step 7); line 23 needs steps 4 and 12. The orchestrator then ticks those of lines 21, 22 and 23 that passed, never line 20 (D12), sets `status: done` in `plans/GNP-05.md`, and commits both by path as `docs(GNP-05): criteria checked, plan status done`. If step 7 or 8 failed or was not attempted, line 22 stays unticked with the cause named.

## 4. Acceptance criteria and tests

The criteria text is copied from `units/GNP-05-core-gate.md` lines 20 to 23. Each criterion has one named test (T1 to T4). No criterion is ticked by this plan or by the implementer (step 14).

| Criterion (unit line) | Test file and test name | Command | Pass condition |
|---|---|---|---|
| "CI runs the pack validation suite on every push and fails on its broken-spec fixtures (GNP-01)." (20) | **T1**, the local proxy of the Navigator decision (D12; DECISIONS.md, 2026-11-16, GNP-01, option (a)). The CI clause is not tested locally. The proxy is the five rows of `packages/packs/test/broken-specs.test.ts` in the root `npm test` output, and `scripts/ci-workflow.test.mjs` | root `npm test` (step 9, output read at step 10); `node --test scripts/ci-workflow.test.mjs` (step 10) | Both exit 0 and the five rows pass. This is evidence, not a pass: line 20 stays `[ ]`, and the unit is complete without it |
| "`propose_graph` validation and both-view goldens pass (GNP-04)." (21) | **T2**, GNP-04's `apps/api/test/packs/propose-graph.test.ts`: "AC 1: propose_graph validates, and a call without view returns an Ajv error naming view" and "AC 2: the story and recipe goldens match, each output parses as a graph file, and the recipe golden holds the tool catalogue" | `cd apps/api && npx vitest run test/packs/propose-graph.test.ts` (step 3, and again in step 12) | 2 passed. `git status --short packages/packs/test/golden` prints nothing (no golden changed) |
| "The built image contains `/opt/scriba/packs/core`, and the app user cannot write to it." (22) | **T3**, `scripts/packs-image-check.sh`, run on the image of step 7. Its checks are named by the probe, and each prints PASS or FAIL. The probes, in order: (1) `user`: `docker image inspect --format '{{.Config.User}}' <ref>` prints `1000:1000`. (2) `uid`: `docker run --rm --entrypoint sh <ref> -c 'id -u'` prints `1000`. (3) `present-core`, `present-nonfiction`, `present-fiction`: `test -d /opt/scriba/packs/<pack>` exits 0 for each. (4) `present-propose_graph`: `test -f /opt/scriba/packs/core/tools/propose_graph.yaml` exits 0 (this makes probe 7 meaningful). (5) `denied-core`, `denied-nonfiction`, `denied-fiction`: `touch /opt/scriba/packs/<pack>/gnp05-probe` exits non-zero and its stderr contains `Permission denied`. (6) `denied-core-tools`: `touch /opt/scriba/packs/core/tools/gnp05-probe` fails with `Permission denied`. (7) `denied-propose_graph`: `echo x >> /opt/scriba/packs/core/tools/propose_graph.yaml` fails with `Permission denied`. | `scripts/packs-image-check.sh bbartolome/scriba:gnp05-arm64` | Exit 0, with eleven PASS lines (probes 1, 2, 3 x3, 4, 5 x3, 6, 7). Exit 1 if one fails; exit 2 on bad usage. The script runs every probe even after a failure, as `scripts/smoke-image.sh` does |
| "The Tool registry's list includes `propose_graph` from the built-in `core` pack." (23) | **T4**, `apps/api/test/packs/core-gate.test.ts`: "AC 4: the tool list includes propose_graph with origin core" | `cd apps/api && npx vitest run test/packs/core-gate.test.ts` | 1 passed. The test sends `GET /api/tool-registry/tools` (no query), parses the body with `toolListSchema`, finds the row named `propose_graph`, and expects `origin` `core`, `enabled` true, `valid` true, `output` `graph` |

Test code for criterion 4, as the implementer writes it (D10, D11): import `it`, `expect` from `vitest`; `TOOLS_ROUTE`, `toolListSchema` from `@bbartolome/scriba-contracts/tool-registry`; `createTestApp`, `TestApp` from `../create-test-app`; `send`, `sessionCookie` from `../guard-request`; `LOOPBACK_HOST`, `LOOPBACK_ORIGIN` from `../invariant-sweep`; `makeLibrary` from `../settings.kit`; `PACKS_ROOT` from `./golden.kit`; `rmSync` from `node:fs`. The `it` callback is `async`. Body: `const library = makeLibrary()`; `let app: TestApp | undefined`; in `try`: `app = await createTestApp({libraryDir: library, env: {SCRIBA_PACKS_DIR: PACKS_ROOT}})`, `const cookie = await sessionCookie(app, library)`, `const reply = await send(app.baseUrl, {host: LOOPBACK_HOST, origin: LOOPBACK_ORIGIN, cookie, method: 'GET', path: TOOLS_ROUTE})`, expect `reply.status` 200, `toolListSchema.parse(JSON.parse(reply.body))`, find the row with `name === 'propose_graph' && origin === 'core'`, expect it defined and `toMatchObject({enabled: true, valid: true, output: 'graph'})`. In `finally`: `await app?.close()`, then `rmSync(library, {recursive: true, force: true})`. The row has more fields (`description`, `overrides?`, `lintCounts`, `error?`); the test does not assert them.

Script `scripts/packs-image-check.sh`, as the implementer writes it (D7): `#!/usr/bin/env bash`, `set -uo pipefail`; usage check (`$# -ne 1` prints usage to stderr, exit 2); `REF=$1`; a counter `failures`; a `pass` and a `fail` helper that print `PASS <probe>: <detail>` or `FAIL <probe>: <detail>` and count failures; each probe runs `docker run --rm --entrypoint sh "$REF" -c ...` with stderr captured. Exit 1 when `failures` is above zero, else 0.

## 5. Downstream agreement

GNP-05 produces three things: the closed phase, the image check script and the registry-list test. It changes no pack, golden, contract or Dockerfile line. The units that read those outputs:

- **GNP-12 (workhorses gate, `blocked_by` GNP-05 at unit line 7).** The only unit whose `blocked_by` names GNP-05 (`grep -n "GNP-05" units/*.md`). GNP-05's `unblocks` line 9 names GNP-12, which is the exact inverse. GNP-12 needs the phase closed. Its criteria (unit lines 17 to 20) use the common inputs, the goldens and the sample entities, which GNP-05 does not change. No change to GNP-12.
- **GNP-06, GNP-07, GNP-08, GNP-09, GNP-10, GNP-11 and GNP-13 (`parallel_with` GNP-05, unit line 8 of each).** None depends on GNP-05, and each names GNP-05 back, so the lists are symmetric (`grep -n "parallel_with" units/GNP-0*.md units/GNP-10-*.md units/GNP-11-*.md units/GNP-13-*.md`). GNP-05 changes none of their paths: the new test and the new script have their own names.
- **PLT-14 (the blocker, `unblocks` GNP-05 at its line 9).** PLT-14's plan (line 230) says GNP-05 needs `/opt/scriba/packs/core` present and not writable. GNP-05 checks that and changes nothing in PLT-14. Two notes for the orchestrator: PLT-14 is merged, so the blocker holds (units/README.md line 61); and PLT-14's own unit leaves criteria 1 and 5 unticked (`units/PLT-14-dockerfile-entrypoint.md` lines 36 and 40). See open point 6.
- **PLT-19 (publish and image smoke; done, `plans/PLT-19.md` line 3).** `scripts/smoke-image.sh` has eight checks and no packs probe (lines 152 to 160), listed in `scripts/smoke-image.test.mjs` lines 13 to 22. GNP-05 changes neither file (D7). PLT-19's plan allows a later additive packs step (D12, line 131; line 619) and does not require one, so the two plans agree.
- **GNP-01, GNP-02, GNP-03, GNP-04 (done, upstream).** Provide the suite and its fixtures (GNP-01), the golden harness (GNP-02), the `source` and `style-profile` kinds (GNP-03, which the image's `core/entity-types/` carries), and `propose_graph` with its goldens (GNP-04). GNP-05 uses them as they are.
- **GNP-07 (done, merged at `3246422`).** Its `cold_open` line is in the recipe golden on main (section 7, F10). The criterion 2 run uses main's goldens.
- **Tool registry (`TRG-13` merged).** GNP-05 reads its list route and changes nothing in it.
- **GNP-23 and GNP-24.** Unaffected: GNP-05 changes neither the Remix check nor a shape.

## 6. Open points

No point is open for the Navigator. The old points are kept with their status.

1. **The CI clause (criterion 1, unit line 20). SETTLED by the Navigator, option (a)** (DECISIONS.md, 2026-11-16, GNP-01, line 4903, and its driver note, line 4908, which names GNP-05's criterion 20). The clause is not tested locally; line 20 stays `[ ]`; the unit is complete without it; `ci.yml` is not changed (D12, step 10, T1). Facts: `.github/workflows/ci.yml` triggers on `pull_request` and on `push` to `main` only (lines 3 to 6), and `scripts/ci-workflow.test.mjs` line 45 asserts `['main']`.
2. **Criterion numbering. SETTLED (confirmed by the reviser).** "Criterion 20" in DECISIONS.md line 4908 is unit line 20, the first checkbox; the quoted text matches line 20 word for word (D3). No criterion text changes.
3. **Image architecture. SETTLED (plan choice, D8).** The arm64 image only. If the build cannot reach github.com or the npm registry (A1), line 22 stays unticked with the cause named (step 14).
4. **Three packs or core only. SETTLED (D16).** The scope asks for all three; the script checks all three.
5. **The image check is local, not in CI. SETTLED (D7).** PLT-19 is done and is not changed.
6. **PLT-14's open criteria (note only).** PLT-14 is merged and its plan is `done`, but its unit leaves criteria 1 and 5 unticked (`units/PLT-14-dockerfile-entrypoint.md` lines 36 and 40). The blocker is "merged" (units/README.md line 61), so GNP-05 is not blocked. Flagged for the orchestrator only.

## 7. Facts checked and facts assumed

### Facts checked

- **F1 Unit.** `units/GNP-05-core-gate.md` read in full (23 lines). Line 7 `blocked_by: [GNP-01, GNP-02, GNP-03, GNP-04, "Platform phase:image-compose (PLT-14; image build)"]`; line 8 `parallel_with: [GNP-06, GNP-07, GNP-08, GNP-09, GNP-10, GNP-11, GNP-13]`; line 9 `unblocks: [GNP-12]`; line 14 the gate sentence; line 17 the scope; lines 20 to 23 the four boxes, all `[ ]`. No change note: `grep -n "Removed by revision\|Loosened by revision\|Reworded by revision\|Moved to\|Split" units/GNP-*.md units/PLT-1*.md` prints nothing.
- **F2 Module.** `modules/genre-packs.md` lines 3 (content module, no runtime code, no contract slice), 16 (the GNP-05 node of the graph), 37 and 38 (pack layout; the image ships the packs read-only; "Genre packs only verifies it"), 85 to 89 (testing principles: external behaviour, golden tests, the system seam), 87 (golden tests in `apps/api/test/packs/`).
- **F3 README.** `units/README.md` line 61 (a bare id is a unit that must be merged), line 63 (name the unit when only part of a phase is needed), line 64 (`unblocks` is the exact inverse of `blocked_by`), line 105 (the gate row, GNP-01 to GNP-05).
- **F4 Blockers.** `git log --oneline main` names GNP-01, GNP-02, GNP-03, GNP-04 and PLT-14 (commit counts 7, 5, 8, 9 and 9). Their plans are `status: done` at front-matter line 4 (GNP-01, GNP-03) and line 3 (GNP-02, GNP-04, PLT-14).
- **F5 Downstream names.** `grep -n "GNP-05" units/*.md`: GNP-12 line 7 (`blocked_by`); GNP-06, GNP-07, GNP-08, GNP-09, GNP-10, GNP-11 and GNP-13 line 8 (`parallel_with`); GNP-01, GNP-02, GNP-03 and GNP-04 line 9 (`unblocks`); PLT-14 line 9 (`unblocks`). Only GNP-12 has GNP-05 in `blocked_by`.
- **F6 DECISIONS.** `grep -n "GNP-05" plans/DECISIONS.md` gives one line, 4908 (driver note on criterion 20). The GNP-01 entry starts at line 4903. GNP-04 Navigator entries at lines 5137 and 5144. PLT-14 approvals at lines 765 and 777.
- **F7 Dockerfile.** Line 50 `FROM node:26-slim AS runtime`; line 57 `COPY --from=build /out/app /opt/scriba/app`; line 58 `COPY --from=build /src/packages/packs /opt/scriba/packs`; line 63 `USER 1000:1000`. No `--chown` anywhere in the runtime stage.
- **F8 Dockerignore.** `.dockerignore` excludes `.git`, `**/node_modules`, `**/dist`, `**/.angular`, `plans`, `units`, `modules`, `prompt.md`, `.claude`, `.scriba-dev`, `e2e/test-results`. `packages/packs` is not excluded.
- **F9 Packs on main.** `find packages/packs -type f`: `core/tools/propose_graph.yaml`; `core/entity-types/source.yaml` and `style-profile.yaml`; `nonfiction/tools/cold_open.yaml`; `nonfiction/entity-types/claim.yaml`, `concept.yaml`, `person.yaml`; `fiction/tools/.gitkeep` and `fiction/entity-types/.gitkeep`; test files and goldens. All three pack folders exist on main.
- **F10 Spec and golden.** `packages/packs/core/tools/propose_graph.yaml`: line 2 `name: propose_graph`; line 3 the description; line 18 `includeCatalogue`, line 21 its description; line 35 `required: [intent, view, includeCatalogue]`; line 36 `output: graph`; line 37 `enabled: true`. `packages/packs/test/golden/propose_graph/recipe.golden.json` contains both the `cold_open` and the `propose_graph` catalogue lines (`grep -o`).
- **F11 Test seams.** `apps/api/test/packs/propose-graph.test.ts`: `it('AC 1: ...` at line 30, `it('AC 2: ...` at line 45. `apps/api/test/packs/golden.kit.ts`: imports of `send, sessionCookie` at line 22 and `LOOPBACK_HOST, LOOPBACK_ORIGIN` at line 23; `PACKS_ROOT` at lines 28 to 36; `post` helper at line 101; `createTestApp` with `SCRIBA_PACKS_DIR` at lines 169 to 172; `rmSync` at line 235. `apps/api/test/guard-request.ts`: `RequestOptions` lines 7 to 19, `send` line 27, `sessionCookie` line 80. `apps/api/test/settings.kit.ts`: `makeLibrary(settingsText?)` line 60. `apps/api/test/create-test-app.ts`: `TestApp` lines 22 to 27 (`baseUrl`, `close`). `apps/api/vitest.config.mts` line 8 `include: ['test/**/*.test.ts']`, so a new file under `test/packs/` runs.
- **F12 Platform smoke.** `scripts/smoke-image.sh` runs `check_*` functions at lines 152 to 160 (dispenser, pandoc, typst, convert, healthz, fts5, size, arch when `EXPECTED_ARCH` is set). `scripts/smoke-image.test.mjs` lines 13 to 22 (`CHECKS`) list the eight names, and lines 104 and 127 loop over them. No packs check exists in either file. `plans/PLT-19.md` line 3 is `status: done`.
- **F13 Image build command.** `scripts/build-image.sh`: line 28 `for arch in amd64 arm64; do`; lines 29 to 35 the `docker buildx build` with `--platform`, the three `--build-arg`s, `--load` and `-t "bbartolome/scriba:local-$arch" .`. `REVISION` must match the lowercase-hex regex `REVISION_RE` in the same file.
- **F14 Docker.** `docker info`: `ServerVersion` 29.8.2, `Architecture` aarch64, `OSType` linux. `docker buildx version`: v0.38.0. `docker images`: `bbartolome/scriba:local-arm64` (`a5fca3e65422`, three days old), `local-amd64` (three days old), `latest` and `0.1.0` (`bf0f179353ba`, two days old), `plt14`, `plt16-check`, `dev`. The new tag `gnp05-arm64` does not exist yet.
- **F15 CI.** `.github/workflows/ci.yml`: line 3 `pull_request:`, line 5 `push:`, line 6 `branches: [main]`; line 27 `run: npm run lint`; line 29 `run: npm test`. `scripts/ci-workflow.test.mjs` line 45 `assert.deepEqual(workflow.on.push.branches, ['main'])`.
- **F16 Root and API scripts.** Root `package.json`: line 23 `build`; line 25 `test` (`npm test --workspaces && node --test 'scripts/*.test.mjs'`); line 26 `lint` (`npm run lint --workspaces && npm run lint:examples && npm run lint:packs && prettier --check .`); line 28 `lint:packs`. `apps/api/package.json` scripts: `build` (`tsc -p tsconfig.build.json && tsc --noEmit -p tsconfig.json`), `test` (`npm run build && vitest run`), `lint` (`eslint .`).
- **F17 Registry route and list.** `packages/contracts/src/tool-registry/routes.ts` line 5 `TOOLS_ROUTE = '/api/tool-registry/tools'`; `apps/api/src/modules/tool-registry/tools.controller.ts` line 65 `@Get(TOOLS_ROUTE)`; `catalog.service.ts` line 188 (comment: "without one, every origin") and line 189 `list(query: ToolListQuery = {})`; `packages/contracts/src/tool-registry/catalog.ts` lines 26 to 37 (`toolSummarySchema`: `name`, `description`, `output` (nullable), `enabled`, `origin`, `overrides?`, `valid`, `lintCounts`, `error?`) and 46 to 49 (`toolListSchema` = `{tools}`). `packages/contracts/src/tool-registry/constants.ts` line 52: `TOOL_ORIGINS = ['core', 'nonfiction', 'fiction', 'user']`.
- **F18 PLT-14 plan.** `plans/PLT-14.md` line 230 (GNP-05 needs `core` present and not writable) and line 231 (the whole folder is copied, `test/` included).
- **F19 PLT-14 unit.** `units/PLT-14-dockerfile-entrypoint.md` lines 36 and 40 are `[ ]` (criteria 1 and 5); lines 37 to 39 are `[x]`.
- **F20 Working tree and plans.** At revision (main `e369b3e`, which commits the draft of this file): `git status --short` prints only ` M units/SAU-12-providers-step.md` and the revision of this file. `grep -l '^status: \(draft\|planned\)' plans/*.md` prints `plans/GNP-05.md` only. The unanchored grep matches body text in other plan files; their front-matter status is `done` (e.g. GNP-06, GNP-07, GNP-11, PLT-19, TRG-13). No `unit/GNP-05` or `unit/GNP-12` branch exists (`git branch --list 'unit/*'`).
- **F22 Test pattern.** `apps/api/test/tool-registry-read-enable.test.ts` lines 247 to 261: `makeLibrary()`, `await createTestApp(...)`, `await sessionCookie(app, library)`, `path: TOOLS_ROUTE`. `apps/api/test/invariant-sweep.ts` lines 38 and 39 export `LOOPBACK_HOST` and `LOOPBACK_ORIGIN`.
- **F23 Criterion 1 proxy.** `packages/packs/test/broken-specs.test.ts` lines 9 to 19: five `it.each` rows (`output-kind`, `unknown-hint`, `template-undeclared`, `duplicate-name`, `multi-line-description`). `packages/packs/package.json` `name` is `@bbartolome/scriba-packs`.
- **F21 Sibling plan.** `plans/GNP-04.md` section 5 (line 198) names GNP-05's criteria at unit lines 21 and 23 and says both are delivered by GNP-04, with no change.

### Facts assumed (ASSUMED; each is tested at the step named)

- **A1 ASSUMED.** The arm64 image build can reach github.com (Pandoc and Typst downloads, Dockerfile lines 19 and 21) and the npm registry (`npm ci`, Dockerfile line 31), and the base images `node:26-slim` (cached locally) and `node:26` (pulled if missing). From the host, the reviser saw `curl -sI` answer 302 for the Pandoc 3.13 arm64 URL and 200 for `registry.npmjs.org`. Not checked inside BuildKit. Tested at step 7.
- **A2 ASSUMED.** In the image, `/opt/scriba/packs` and its subfolders are root-owned and not writable by UID 1000, because `COPY` without `--chown` keeps root ownership and the build context modes are not group- or world-writable. Tested at step 8 (probes 5 to 7).
- **A3 ASSUMED.** `docker run --rm --entrypoint <cmd>` behaves as `scripts/smoke-image.sh` uses it (its lines 52, 61 and 70). `docker image inspect --format '{{.Config.User}}'` is not used by that script (only `scripts/entrypoint.sh` line 81 calls `docker image inspect`, without `--format`); its output `1000:1000` follows from Dockerfile line 63. Tested at step 8.
- **A4 ASSUMED.** The story and recipe goldens on main match the current code. The planner ran no test. Tested at step 3.
- **A5 ASSUMED.** The apps/api tests load the built contracts `dist` through the package subpaths, so step 2 must come first. Tested at step 3.
- **A6 ASSUMED.** Node 26 is on PATH, as in the PLT-02 and GNP-01 plans (the reviser saw `v26.13.0` and npm `11.20.0`). Tested at step 1.

### Not verified

The planner ran no build, test, lint, image build or Docker command, and made no commit or push. Every check that needs them is a step of section 3.

## 8. Review parts

One part (a small plan). Each step of section 3 and each test of section 4 is in it.

- **Part 1 — the core gate checks.** Steps 0 to 14. Tests T1 (criterion 1, local proxy only, line 20 stays unticked), T2 (criterion 2), T3 (criterion 3) and T4 (criterion 4). Files: `apps/api/test/packs/core-gate.test.ts` and `scripts/packs-image-check.sh`.
