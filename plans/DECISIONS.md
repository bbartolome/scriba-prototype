# Decisions

Record of Navigator decisions and Opus rejections. Only add to this file. Each entry has the date, the unit, the decision and the reason.

## 2026-11-10 — PLT-01 — batch and step list (iteration 1)

- **Decision:** Batch `[PLT-01]` approved. Step list accepted: write `plans/PLT-01.md` with `status: planned`, commit it locally, do not push. Implementation is a later iteration.
- **Reason:** PLT-01 is the only unblocked unit in the first open phase (Platform `phase:scaffold`). No plan exists yet. No git remote is configured, so the work stays local.
- **Correction:** The Navigator's carry-forward line "no DECISIONS.md entry is forced this iteration" is wrong. The driver rules (steps 2 and 5) require each Navigator decision to be recorded here, so this entry is required.

## 2026-11-10 — PLT-01 — how the Angular, NestJS and Zod majors are pinned (Option B)

- **Decision (Navigator):** Option B. PLT-01 records the Angular, NestJS and Zod majors in a documented pin section in the root `package.json`, and installs none of the three packages. The resolved numbers are recorded when PLT-01 is implemented, not hardcoded in the plan. PLT-02 adds `zod` to `packages/contracts`, PLT-03 adds `@angular/*` and Material to `apps/web`, and PLT-04 adds `@nestjs/core` and `@nestjs/serve-static` to `apps/api`, each at its recorded major. The pin is a section, not npm `overrides`.
- **Reason (Navigator):** Keeps the three packages out of the lockfile until their owning units. Avoids baking possibly stale version numbers into a plan that is not implemented in this iteration.
- **Driver challenge (open at the time of writing):** The stated reason "no downstream file changes" does not separate Option A from Option B. Under both, PLT-02, PLT-03 and PLT-04 edit the workspace `package.json` files that PLT-01 creates (PLT-01 Scope line 32). No acceptance criterion tests the pin section (AC 4 covers only Node and npm). The challenge is recorded in a separate navigator question. Its answer will be added here.

## 2026-11-10 — PLT-01 — answer to the challenge on Option B (criterion added)

- **Decision (Navigator):** Option (a). Keep Option B. The reason is corrected to the ownership boundary: PLT-01 is the scaffold and must not pre-declare dependencies owned by PLT-02 (contracts), PLT-03 (web) and PLT-04 (api). PLT-01 records the three majors so those units install at the recorded major. Option A (install now) is rejected.
- **Criterion change (Navigator, PLT-01):** Added one acceptance criterion: the root `package.json` pin section names the Angular, NestJS and Zod majors. A test asserts that the three names are present. Version numbers are not checked. This is additive; no existing criterion was removed or weakened. The unit file records the change.
- **Reason (Navigator):** The stated reason "no downstream file changes" did not separate Option A from Option B, so it was withdrawn. The pin is required by PLT-01's Decisions ("Angular, NestJS and Zod majors are pinned here"). No criterion tested it, so a criterion is added. A presence-only check avoids baking stale version numbers into the plan.
- **Driver note:** The challenge recorded in the entry above is closed by this answer.

## 2026-11-10 — PLT-01 — TypeScript major in the pin section

- **Decision (Navigator, confirmed):** TypeScript is pinned to the 6.0.x line (range `>=6.0 <6.1`). The exact patch is resolved when PLT-01 is implemented and recorded in the root `package.json` pin section. 7.x and 5.x are rejected. The earlier "6.x" label is withdrawn as too wide.
- **Reason (Navigator, checked by the driver against the npm registry, 2026-11-10):** `@angular/build@22.2.5`, `@angular-devkit/build-angular@22.2.5` and `@angular/compiler-cli@22.2.5` each declare peer `typescript` `>=6.0 <6.1`, which alone forces 6.0.x. The registry `latest` is 7.0.2, which those packages exclude. Angular 21 accepts `>=5.9 <6.0` and Angular 20 accepts `>=5.8 <6.0`, so no Angular line checked accepts 7.x. `typescript-eslint` (latest) declares `>=4.8.4 <6.1.0`, a secondary constraint not required by the PLT-01 unit.
- **Why the newest-major rule does not apply to TypeScript:** the rule was set for Angular, NestJS and Zod. Applied to TypeScript it picks 7.0.2, which the Angular build tooling excludes.

## 2026-11-10 — PLT-01 — Node runtime for the tests

- **Decision (Navigator):** The Node pin is Node 26 in `.nvmrc` and `engines`, as PLT-01 Decisions line 25 requires. This iteration writes `plans/PLT-01.md` with `status: planned` only and runs no tests. No local Node 24.21.0 run is recorded, and no criterion is marked passed. The four acceptance-criterion tests run on a Node 26 runtime at implementation time, obtained from nodejs.org or the npm `node@26` package.
- **Reason (Navigator):** A Node 24 run would misrepresent the pin, and no test runs in this iteration anyway. Changing the pin to Node 24 would alter the unit's stated decision and force a unit edit.

## 2026-11-10 — PLT-01 — location and coverage of the pin-section test

- **Decision (Navigator):** The test for the new pin-section criterion is `scripts/pins.test.mjs` at the repo root. It runs with Node's built-in `node:test`, invoked by the root `test` script after the workspace fan-out. It asserts that the keys `angular`, `nestjs` and `zod` are present in the root pin section. It does not check version numbers, and it has no TypeScript key.
- **Reason (Navigator):** The pin section is in the root `package.json`, so the test is root-owned. `packages/contracts` belongs to PLT-02, so the test is not placed there. A root Vitest config would add a file and a dependency for a presence check. `node:test` is built into Node, and the root `test` script already fans out to every workspace. The criterion names only the three majors, so the coverage matches it.
- **Correction:** The Navigator's reason "a TypeScript key would force version checking" is wrong. A presence check on a TypeScript key does not check its version. The coverage choice still stands, because the criterion names only the three majors, and widening the criterion is the Navigator's call.

## 2026-11-10 — PLT-01 — Opus rejection 1 of the plan (blocking problems)

- **Rejection (Opus subagent, plan review):** `plans/PLT-01.md` is not approved. Count for PLT-01: 1 rejection.
- **Blocking 1:** Root `prettier --check .` (plan section 2) also checks the tracked Markdown files in `units/`, `modules/` and `plans/`, and the plan adds no `.prettierignore`. So AC 2 cannot pass. The driver confirmed this: Prettier 3 flags `units/PLT-01-workspace-scaffold.md` with default config.
- **Blocking 2:** The AC 3 command `find node_modules -path '*/node_modules/typescript/package.json'` returns 0 for the root copy, because the path has no `/` before its first `node_modules`. The driver confirmed this: the plan's pattern returns 0 and `find . -path '*/node_modules/typescript/package.json'` returns 1.
- **Non-blocking notes to fold into the plan:** the workspace `lint` runs Prettier, which reads only the cwd's ignore files, so it can check generated `dist/` output; the section 5 downstream list misses PLT-12's possible `e2e/` workspace, PLT-04's `build` and `tsconfig` changes, PLT-03's deletion of the placeholder test, and PLT-11's `concurrently` and `.scriba-dev/` use; pins must be resolved before the first install; the ESLint version wording should not name a version; the `node -v` and `npm -v` output should be recorded with each result; the pin section should be documented with a `//` key.

## 2026-11-10 — PLT-01 — Prettier scope (Navigator decision, after Opus rejection 1)

- **Decision (Navigator):** Option (a). A root `.prettierignore` excludes `units/`, `modules/` and `plans/`. Prettier then checks code and config in the four workspaces only. The driver fixes to the plan are accepted: the AC 3 `find` pattern (`find . -path '*/node_modules/typescript/package.json'`), workspace `lint` as ESLint only, the completed section 5 downstream list, pins resolved before the first install, version-free ESLint wording, node and npm versions recorded with each result, and `scribaPins` documented with a `//` key.
- **Reason (Navigator):** It honors the unit's decision "ESLint flat config plus Prettier check across workspaces" (PLT-01 line 26) without a unit edit, because the document folders are not workspaces. It is additive. It avoids reformatting about 212 documents (option b), and it avoids the unit edit that dropping Prettier would need (option c).

## 2026-11-10 — PLT-01 — Opus rejection 2 of the plan (blocking problem)

- **Rejection (Opus subagent, re-review of revision 2):** `plans/PLT-01.md` is not approved. Count for PLT-01: 2 rejections. The next rejection is the third, and at three the Navigator must choose to make the unit smaller, divide it, or stop it.
- **Blocking:** The `.prettierignore` entries in revision 2 are unanchored (`modules/`). Gitignore rules make such a pattern match a folder of that name at any depth, so `apps/api/src/modules/**` would be ignored too. The driver confirmed this with Prettier 3: `apps/api/src/modules/platform/platform.module.ts` reports `"ignored": true` with `modules/`, and `"ignored": false` with `/modules/`.
- **Non-blocking, folded into the revision:** PLT-03's replacement `package.json` must keep `build`, `test` and `lint` scripts. PLT-09's fixtures must fail lint, so the root config needs an ignore for their folder. PLT-13 also adds a root `e2e` script. PLT-11 adds a root `README.md` that Prettier checks. Prettier formatting is applied to `package.json` before the check. The unit branch `unit/PLT-01` is created before the first commit, and the fresh clone uses `-b unit/PLT-01`. The chosen Angular major's build peer must admit the 6.0 patch. The `packageManager` value must match an exact npm version.

## 2026-11-10 — PLT-01 — Opus rejection 3 of the plan (blocking problem)

- **Rejection (Opus subagent, round 3 review of revision 3):** `plans/PLT-01.md` is not approved. Count for PLT-01: 3 rejections. Per the driver rules, at three rejections the Navigator must select one of: make the unit smaller, divide the unit, or stop the unit. No further plan revision is made before that selection.
- **Blocking:** The workspace `package.json` files have no `version`. npm prints the package name in each workspace's run banner only when `version` is set. The driver confirmed this in a temporary two-workspace project: the workspace without `version` printed `> build`, and the one with `"version": "0.0.0"` printed `> @x/b@0.0.0 build`. So AC 2's requirement that each fan-out name all four packages cannot be met as written. The fix is `"version": "0.0.0"` in each workspace, plus a banner check in AC 2.
- **Non-blocking, to fold in if the unit continues:** Step 1 must resolve the tool versions and require `npm install` to succeed without `--legacy-peer-deps`. Step 1c must check the exact Angular version from step 1a, and also the `@angular/compiler-cli` peer. Step 3 must run AC 2 to 5 in the working tree, with AC 1 run after the step 4 commit. Step 2 must run `prettier --write` after the install, so the locked Prettier version formats the files. Section 5 must cover the TypeScript devDependency that the Angular and NestJS generators add, the root Prettier check reaching the files PLT-03, PLT-10 and PLT-12 add, PLT-12's tests not running under root `npm test` if `e2e/` stays a plain folder, and any root devDependency PLT-09 adds. The smoke test must import `describe`, `it` and `expect` from `vitest`.

## 2026-11-10 — PLT-01 — response to the third rejection (Navigator decision)

- **Decision (Navigator):** Keep PLT-01 as one unit and fix the defects in place. No scope cut, no division, no stop. Apply the blocking fix (`"version": "0.0.0"` in each of the four workspace `package.json` files, plus a banner check that npm names all four packages in AC 2) and the non-blocking notes above. Then re-send the plan to Opus.
- **Reason (Navigator):** The three rejections are mechanical defects, not scope problems. Dividing would change the `blocked_by` and `unblocks` fields of about ten units and the README phase table for a one-line version field. Stopping would block the whole build.
- **Driver note on the label:** The question offered "(a) make the unit smaller" as the first option. The Navigator's answer is labelled (a), but its text describes no scope cut. The driver records the selection as keep-whole, fix-in-place. This is not one of the three literal options. It is flagged here so the user can see it.

## 2026-11-10 — PLT-01 — Angular and TypeScript conflict rule (Navigator decision)

- **Decision (Navigator):** Option (a). The newest-Angular-major rule and the TypeScript 6.0.x line are two separate Navigator decisions. If the newest Angular major's build-tooling TypeScript peer excludes the 6.0.x line, the implementation stops and records the conflict for the Navigator. It does not pick a non-newest Angular major, and it does not move the TypeScript line.
- **Reason (Navigator):** Choosing an older Angular major would silently downgrade a decision. Moving the TypeScript line would silently reopen the 6.0.x decision, whose premise is the Angular 22.2.5 build peer. Only the Navigator may re-decide either one.

## 2026-11-10 — PLT-01 — step list for the implementation iteration (Navigator decision)

- **Decision (Navigator):** Step list s1 to s8. s1: send `plans/PLT-01.md` revision 4 to an Opus subagent for plan review, as a gate before any implementation. This closes the gap that no approval of revision 4 is recorded. If Opus rejects, the count becomes 4, and the iteration stops to record the conflict for the Navigator. s2 to s8 follow plan section 3: branch `unit/PLT-01` from main; resolve versions (3.1); create the files and run `npm install` and `prettier --write`; run AC 2 to AC 5 in the working tree on Node 26; commit on `unit/PLT-01`; run AC 1 and AC 2 to AC 5 in a fresh clone; one merge commit to main with the checkboxes and `status: done`. No push.
- **Reason (Navigator):** Revision 4 has no Opus approval, so approval must come before any implementation. The repo has no remote, so the work stays local.
- **Driver note:** The Navigator's carry-forward line "Node 26 runtime required for the four AC tests" is wrong. The plan has five criteria, AC 1 to AC 5 (`plans/PLT-01.md` section 4). Node 26 applies to all five. The driver recorded this as a `carry_forward_verdict` with evidence.

## 2026-11-10 — PLT-01 — Opus review of plan revision 4: APPROVED

- **Result (Opus subagent, plan review of `plans/PLT-01.md` revision 4):** APPROVED. No blocking problem. The rejection count for PLT-01 stays at 3. The plan may be implemented (step s2 onward).
- **Reason:** The reviewer checked all five acceptance criteria against tests and pass conditions; the Decisions of `units/PLT-01-workspace-scaffold.md`; the downstream units PLT-02, PLT-03, PLT-04, PLT-09, PLT-10, PLT-11, PLT-12 and PLT-13; the front matter (`unblocks` matches the `blocked_by` fields); the order of the method steps; and the points in plan section 6.
- **Non-blocking notes, not yet folded into the plan.** Each needs a Navigator decision before the plan changes:
  1. Plan section 5 cites "its unit, line 31" for PLT-13's root `e2e` script. The reviewer reports the script is at PLT-13 line 26.
  2. Plan section 4, AC 2, writes to `/tmp/plt01-ac2/` but no step creates that folder. A `mkdir -p` is needed.
  3. Plan section 2 (`.gitignore`) says "The last is the dev library folder". The folder is `.scriba-dev/`, not `.claude/settings.local.json`.
  4. Step 1d: if the ESLint fallback picks an older major, `@eslint/js` must be on the same major (its peer is `eslint ^10.0.0`). Step 1d does not say so.
  5. The "Decision (Navigator)" entry at line 50 of this file says Prettier checks "the four workspaces only". The plan, as approved, checks the whole repo except the anchored `.prettierignore` paths. This entry is superseded by the plan's scope.
  6. Byte-exact fixtures in later units (the reviewer names SHL-13 and GNP-02) will need `.prettierignore` entries. This is not PLT-01's concern.
  7. PLT-10 runs tests before build. Tests in contracts and api that import the built contracts package need a build step first. This is owned by PLT-02 or PLT-10, not PLT-01.

## 2026-11-10 — PLT-01 — revision 5 (documentation-only) and disposition of the non-blocking notes (Navigator decision, Option B)

- **Decision (Navigator):** Revision 5 of `plans/PLT-01.md` is documentation-only. It changes three texts and no acceptance criterion:
  - Note 1: section 5, the PLT-13 citation changes from "its unit, line 31" to "its unit, line 26". Verified: `units/PLT-13-playwright-harness-e2e.md` line 26 is the root `npm run e2e` script.
  - Note 2: the AC 2 procedure now runs `mkdir -p /tmp/plt01-ac2/` before the fan-out redirects. This is also an implementation detail, since the driver creates the folder, but the procedure is made complete.
  - Note 3: section 2, `.gitignore` wording. `.scriba-dev/` is named as the dev library folder, not `.claude/settings.local.json`. Verified: `units/PLT-01-workspace-scaffold.md` line 27 names neither folder.
- **Supersession (note 5):** The entry "Prettier scope (Navigator decision, after Opus rejection 1)", with its sentence "Prettier then checks code and config in the four workspaces only", is superseded. The approved plan checks the whole repo except the anchored `.prettierignore` paths (`/units/`, `/modules/`, `/plans/`, `/package-lock.json`). The other decisions in that entry still stand.
- **Implementation-time or downstream decisions (notes 4, 6, 7; not plan changes):**
  - Note 4: at step 1d, if the ESLint fallback picks an older major, `@eslint/js` must be on that same major, because its peer is `eslint ^10.0.0`. Implementation applies this.
  - Note 6: byte-exact fixtures in later units (the reviewer names SHL-13 and GNP-02) need `.prettierignore` entries. Those units own them.
  - Note 7: PLT-10 runs tests before build, so contracts and api tests that import the built contracts package need a build step first. Owned by PLT-02 or PLT-10.
- **Reason (Navigator):** These are text fixes that change no criterion, so the revision-4 Opus approval carries over. Re-sending revision 5 to Opus would risk a fourth rejection, and a fourth rejection stops the iteration.

## 2026-11-10 — PLT-01 — versions resolved at implementation (plan section 3, steps 1a to 1e)

- **Resolved (driver, Node v26.13.0, npm 11.20.0):** Angular major 22 (`@angular/core` 22.2.5). NestJS major 12 (`@nestjs/core` 12.4.2). Zod major 4 (`zod` 4.6.7). TypeScript 6.0.3, the highest of `typescript@6.0` (`npm view typescript@6.0 version` lists 6.0.2 and 6.0.3). Tools: `vitest` 5.1.0, `eslint` 10.14.0, `@eslint/js` 10.0.1, `typescript-eslint` 8.72.2, `prettier` 3.9.10. `packageManager` is `npm@11.20.0`, the npm bundled with Node 26.13.0.
- **Peer checks (steps 1c and 1d):** `@angular/build@22.2.5` and `@angular/compiler-cli@22.2.5` both declare `typescript` `>=6.0 <6.1`, which admits 6.0.3. `@angular/build@22.2.5` declares `vitest` `^4.0.8 || ^5.0.0`, so the newest admitted vitest is 5.1.0. `typescript-eslint@8.72.2` declares `eslint` `^8.57.0 || ^9.0.0 || ^10.0.0` and `typescript` `>=4.8.4 <6.1.0`, which admit eslint 10.14.0 and TypeScript 6.0.3. `@eslint/js@10.0.1` declares `eslint` `^10.0.0`.
- **Conflict rule (Angular and TypeScript):** not triggered. The newest Angular build tooling admits the 6.0.x line, so implementation continues.
- **Implementation-time decision (note 4 of the approval entry):** `@eslint/js` and `eslint` are both on major 10, so the install and the ESLint config resolve.
- **Install:** `npm install` at the root succeeded on Node 26.13.0 without `--legacy-peer-deps`, adding 132 packages and writing the single root `package-lock.json`. npm reported 10 moderate vulnerabilities. No criterion covers audit results, so they are not addressed in PLT-01.

## 2026-11-10 — PLT-01 — Opus implementation review of the merge commit cf7a8bb: APPROVED (recorded after the merge)

- **Result (Opus subagent, implementation review of commit cf7a8bb against plan revision 5 and the unit's acceptance criteria):** APPROVED. No blocking problem. All five acceptance criteria are met by the code and the saved evidence. The 28 tracked files outside the document folders are exactly the files named in plan section 2. Nothing contradicts a downstream unit.
- **Process gap (driver):** Driver rule 7 requires the Opus implementation review before the merge commit (step 8). The driver merged `unit/PLT-01` into main as cf7a8bb before running this review, because the Navigator's step list (s1 to s8) did not include it. The review ran on the merged commit, and its approval is recorded here. The merge was local only and was not pushed. A challenge record in the session describes the gap.
- **Non-blocking notes (recorded; the Navigator decides any change):**
  1. The `node -v` and `npm -v` output is not saved next to each result in the evidence files. It was printed in the terminal for each run. Node v26.13.0 and npm 11.20.0 are recorded in this file and in the merge commit message.
  2. The fresh-clone run executed AC 2 to AC 5 and printed the results. The files in `/tmp/plt01-ac2/` were later overwritten by the merged-tree run, so the fresh-clone fan-out output is kept in the session transcript only.
  3. The Prettier `--file-info` probe, the two `find` counts, and the exit status of `npm ci` have no saved output. Their results were printed in the terminal.
  4. `tseslint.config()` is marked `@deprecated` in typescript-eslint 8.72.2 (`node_modules/typescript-eslint/dist/config-helper.js`, around line 24), in favour of ESLint's `defineConfig()`. It still works. PLT-09 may switch when it edits `eslint.config.mjs`.
  5. `plans/PLT-01.md` line 8 still says "This iteration writes the plan only ... no criterion is marked passed here." That is out of date now that the status is `done`. It describes iteration 1.
  6. The ESLint config covers only `**/*.ts`, so the root `.mjs` files (`eslint.config.mjs`, `scripts/pins.test.mjs`) are not linted. This matches the plan.

## 2026-11-10 — PLT-01 — disposition of the implementation review notes (Navigator decision, Option B)

- **Decision (Navigator):** Option B. A documentation-only commit on main corrects the out-of-date sentence at `plans/PLT-01.md` line 8 (note 5). It now says that iteration 1 wrote the plan and a later iteration implemented it, and that all five acceptance criteria passed. No change is made to `eslint.config.mjs`.
- **Disposition of the six notes:**
  - Note 1 (no saved `node -v` and `npm -v` next to each result): known. The versions are recorded in this file and in the merge commit message.
  - Note 2 (fresh-clone fan-out output overwritten): known. The fresh-clone results are in the session transcript only.
  - Note 3 (Prettier probe, `find` counts and `npm ci` exit status not saved): known.
  - Note 4 (`tseslint.config()` is deprecated in typescript-eslint 8.72.2): deferred to PLT-09, which owns `eslint.config.mjs`. The code works and AC 2 lint passes. Changing it now would reopen a closed, approved unit and need a new Opus implementation review.
  - Note 5 (stale line 8 in `plans/PLT-01.md`): fixed by the documentation-only commit. No criterion changes, so no new Opus review.
  - Note 6 (the root `.mjs` files are not linted): known. This matches the plan.
- **Reason (Navigator):** PLT-01 is closed: merged as cf7a8bb, `status: done`, and approved by the Opus implementation review. The six notes are non-blocking. A documentation-only fix needs no new review.

## 2026-11-10 — PLT-10 — mismatch 1: the green-on-PR criterion (Navigator decision)

- **Decision (Navigator):** Keep PLT-10 criterion 4 ("`ci.yml` is green on the scaffold PR (verified at PLT-11)") unchanged in `units/PLT-10-ci-workflow.md`. In PLT-10's plan, criteria 1 to 3 map to real local tests. Criterion 4 is recorded as "deferred to PLT-11, not testable here (no remote or runner)", with a local structural proxy: the workflow parses as YAML, it is a single job, and its steps run in the order npm ci → lint → test → build. The proxy is labelled a proxy, not the green-on-PR check. The green-on-PR checkbox stays unmarked.
- **Reason (Navigator):** The criterion already defers to PLT-11, and PLT-11 criterion 5 (`units/PLT-11-scaffold-gate.md` line 32) is the only owner of the green-on-PR check. Editing PLT-10 would be an unrequired one-way change. No earlier record of this mismatch exists in this file.
- **Driver note:** This entry is recorded now, not at step s3, because driver rule 5 requires each decision to be recorded and committed at once.

## 2026-11-11 — PLT-02 — mismatch 2: build before test for the contracts package (Navigator decision)

- **Decision (Navigator):** Option A. The `packages/contracts` workspace owns a build-before-test step inside its own `test` script (a `pretest` hook, or a test script that runs the `tsc` build first). PLT-02's runtime boot test (criterion 1, `units/PLT-02-contracts-package-platform-slice.md` line 63) then loads the built JS and `.d.ts` output. The CI order in PLT-10 (npm ci → lint → test → build, criterion 2 at line 25 and Decisions line 18) stays unchanged. No criterion text changes. Note 7 (line 105 of this file) is assigned to PLT-02.
- **Rejected (Navigator):** Option B, which moves the build before the test in PLT-10's job. It would change a criterion pinned in two places, a one-way change. Option C, which runs the tests against TypeScript source through a path mapping, contradicts PLT-02's stated rationale (line 15: consumed as built JS and `.d.ts` without path-alias tricks) and weakens criterion 1.
- **Reason (Navigator):** The build step belongs to the package that needs it, and the CI order stays as the unit fixes it. Mismatch 1 already set the precedent of keeping PLT-10's criteria unchanged.
- **Driver note:** apps/api tests that import the built contracts package (note 7) depend on `packages/contracts` running its `pretest` first. The root test fan-out runs `packages/contracts` first, so this holds by workspace order. PLT-04's plan must state this dependency, not rely on it silently.
- **Driver note:** Recorded now, before the PLT-02 plan is drafted, because driver rule 5 requires each decision to be recorded and committed at once.

## 2026-11-11 — PLT-09 — mismatch 3: lint fixtures versus the root ESLint config (Navigator decision)

- **Decision (Navigator):** Option A. The PLT-09 lint-test fixture folder is added to the root ESLint `ignores` array (`eslint.config.mjs` line 7). `npm run lint`, and therefore PLT-10's CI lint step, stays green. The fixtures stay as `.ts` files, so their relative import paths stay valid. The PLT-09 test runs ESLint's Node API on each fixture with the ignore lifted (for example `new ESLint({ ignore: false, overrideConfig })` or `overrideConfigFile`), and asserts that the boundary errors appear.
- **Rejected (Navigator):** Option B, a non-`.ts` extension with a temporary copy per test, because its temporary copy is fragile. Option C, a second ESLint config for the test, because it adds a second file on top of the same ignore.
- **Reason (Navigator):** The root config's comment at line 4 anticipates later units adding entries. The ignore alone does not satisfy PLT-09 criterion 5 ("don't ship"). The PLT-09 plan must pin the fixture folder as a repo-root lint-test folder, outside `packages/` and `apps/`, and must state two mechanisms: the ESLint ignore, and the fact that the folder is not an npm workspace, so `npm run build --workspaces` never builds it.
- **No criterion text changes.** PLT-10's CI order (npm ci → lint → test → build) is untouched. Recorded as a plan note for PLT-09, not as a criterion change.
- **Driver note:** Recorded now, before the plans are drafted, because driver rule 5 requires each decision to be recorded and committed at once.

## 2026-11-11 — batch [PLT-02, PLT-03, PLT-09, PLT-10] — root test script: one quoted glob (Navigator decision)

- **Decision (Navigator):** Replace the explicit file list in the root `test` script with a quoted Node-native glob, `node --test 'scripts/*.test.mjs'`. PLT-03 is the first unit by ID that edits the root `test` line, so it sets the glob in its plan. PLT-09 and PLT-10 (and PLT-12 later) add their own test file only and do not edit the `test` line. No runner script is added.
- **Change to an approved contract (recorded):** This changes the root `test` line that PLT-01 approved (DECISIONS 2026-11-10, "location and coverage of the pin-section test", which named one file). The glob is a superset: `scripts/pins.test.mjs` still runs. This is a one-way change to a PLT-01-approved line, and it is recorded here.
- **Reason (Navigator):** A single line shared by four units conflicts at every merge. With a glob, a new root test needs no `package.json` edit. A glob is simpler than a runner script, and Node's own glob is cross-platform.
- **Verified locally (driver, Node 24.21.0 at the time):** `node --test 'scripts/*.test.mjs'` and the shell-expanded form each ran every matching test file, reported 2 tests for 2 files, and did not run a non-test helper file. Node 26 behaviour is re-verified at implementation.
- **Driver note:** Recorded now, before the plans are revised, because driver rule 5 requires each decision to be recorded and committed at once.

## 2026-11-11 — PLT-02 — output format: CommonJS (Navigator decision, disposition of PLT-02 open point 1)

- **Decision (Navigator):** Option A, CommonJS, as drafted. `packages/contracts/package.json` has no `"type": "module"`, and `tsconfig.base.json` keeps `module` and `moduleResolution` NodeNext, so tsc emits CJS. PLT-02 criterion 1 (`units/PLT-02-contracts-package-platform-slice.md` line 63) is tested with a direct CJS `require` from a NestJS-style consumer, as the criterion names it.
- **Consequence handed to PLT-11:** The Angular build may warn about a CommonJS dependency and may need an `allowedCommonJsDependencies` entry. PLT-11 owns the Angular half of the cross-runtime boot test (`units/PLT-11-scaffold-gate.md` lines 22 and 30), so it makes that decision.
- **Rejected (Navigator):** Option B, ESM with `"type": "module"`. It would make NestJS, which is CJS by default, load ESM through require(esm) on Node 26, which adds risk for no benefit. `units/PLT-02-contracts-package-platform-slice.md` line 20 allows either format if both runtimes load it, so CJS is a permitted choice, not a contradiction.
- **Reason (Navigator):** The draft already emits CJS. The Angular consequence is additive (an `allowedCommonJsDependencies` entry can be added later), so this is a low-risk one-way door. PLT-03 names no output-format constraint.
- **Driver note:** Recorded now, before the plans are revised, because driver rule 5 requires each decision to be recorded and committed at once.

## 2026-11-11 — PLT-10 — criterion 3 method: local PR-title script (Navigator decision)

- **Decision (Navigator):** Option A. The PR-title check is the local Node script `scripts/check-pr-title.mjs`, tested with `node:test` through `spawnSync`, as `plans/PLT-10.md` sections 2 and 4 describe. The header pattern is the one in `plans/PLT-10.md` section 2. The title reaches the script only through the environment variable `PR_TITLE`, never inside a `run:` line, so the title cannot inject shell code.
- **Rejected (Navigator):** Option B, a third-party action such as `amannn/action-semantic-pull-request`. It cannot run or be tested here without the network, and it adds third-party code that runs with the CI token. Option C, an inline regex in the YAML, because no test would run it.
- **Reason (Navigator):** Criterion 3 names no method. The local script is the only option that runs and is tested in this environment, so criterion 3 can be verified here.
- **No criterion text changes.** Criterion 4 stays deferred to PLT-11 (decision of 2026-11-10, PLT-10 mismatch 1).
- **Driver note:** Recorded now, before the plans are revised, because driver rule 5 requires each decision to be recorded and committed at once.

## 2026-11-11 — PLT-09 — rule implementation: eslint-plugin-boundaries, with a named fallback (Navigator decision)

- **Decision (Navigator):** Option A. The boundary rule is `eslint-plugin-boundaries` 7.4.2, as a new exact root devDependency, as `plans/PLT-09.md` section 1 describes. Unit line 21 permits it. The plugin has the primitives the rules need: element types declared with a glob and a capture list (for the module slug), and ordered policies that allow or forbid element combinations.
- **Two required refinements, recorded:**
  1. **Rule name.** The draft's name `boundaries/dependencies` (plans/PLT-09.md lines 29, 39 and 68) is stale. The plugin's v2 migration guide renames the rule to `boundaries/element-types`. The v7 name is not confirmed by the search, so step 4 confirms it against the installed v7 docs. The config, the criteria and the file list then use that name.
  2. **Fallback, named in advance.** If step 4 finds that the plugin cannot express rules R1 to R3, the fallback is Option B: a local ESLint rule that resolves each import with a module resolver (`eslint-import-resolver-node`, which the plugin already brings) and checks the module and feature rules. The switch is recorded in this file when it happens. It is not silent.
- **Rejected (Navigator):** Option C, `no-restricted-imports` patterns alone, because the patterns match the raw import string and cannot see the file a relative import resolves to.
- **Residual risk (not a blocker):** how an entry file (`*.module.ts`) is told apart from an internal file, and the base for path matching (cwd or config directory), are unconfirmed. The step 4 stop rule covers both.
- **No criterion text changes.** The unit's Decisions line 21 is an implementation choice, not a criterion.
- **Driver note:** Recorded now, before the plan is revised, because driver rule 5 requires each decision to be recorded and committed at once.

## 2026-11-11 — PLT-03 — dev script ownership: web "start" only (Navigator decision)

- **Decision (Navigator):** Option A. PLT-03 adds only the apps/web `start` script (`ng serve`, with the proxy wired for exactly `/api`, `/healthz` and `/events`). PLT-11 owns and adds the root `dev` script, which composes `start` with the API watch and `tsc --watch` on contracts. No criterion text changes.
- **Rejected (Navigator):** Option B, PLT-03 adding the root `dev` script now. PLT-11 owns the `dev` script and `concurrently` (`units/PLT-11-scaffold-gate.md` line 25), so Option B would force PLT-11 to rewrite it, a one-way door against that ownership.
- **Reason (Navigator):** None of PLT-03's three acceptance criteria (`units/PLT-03-web-bootstrap.md` lines 30 to 32) names the root `dev` script. Line 15 ("`npm run dev` must work end to end") is rationale. It is realized at the PLT-11 gate (criterion 1, line 28), not at PLT-03's merge.
- **Driver note:** Recorded now, before the plans are revised, because driver rule 5 requires each decision to be recorded and committed at once.

## 2026-11-11 — PLT-03 — web tsconfig: a local override of two keys (Navigator decision)

- **Decision (Navigator):** Option A. `apps/web/tsconfig.json` extends `../../tsconfig.base.json` and overrides only `module` and `moduleResolution`, keeping the Angular generator's values. Those values are decided at implementation, because the spec does not pin them and the generator is the right source.
- **Verified (driver):** `tsconfig.base.json` lines 6 and 7 set both keys to NodeNext. `apps/web/tsconfig.json` and `apps/api/tsconfig.json` currently inherit them with no local override. The web override changes only apps/web. The base, the API and contracts stay as they are.
- **Rejected (Navigator):** Option B, a second shared base such as `tsconfig.web.base.json`. It would add a root file and a shared config for one consumer, which the spec does not require.
- **Not a criterion change.** Recorded as the disposition of `plans/PLT-03.md` section 6, point 3.
- **Driver note:** Recorded now, before the plans are revised, because driver rule 5 requires each decision to be recorded and committed at once.
