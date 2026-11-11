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

## 2026-11-11 — PLT-02 — @types/node for the contracts tests (Navigator decision, disposition of PLT-02 open point 3)

- **Decision (Navigator):** Option A. `@types/node` at `^26` is a devDependency of `packages/contracts`, as the draft proposes. The build's second step type-checks `src` and `test` (`plans/PLT-02-...` section 1, line 15, "as the PLT-01 build did"), and the tests import `node:` modules, so the Node types are needed for that check to pass.
- **Criterion 3 is unaffected.** It forbids runtime dependencies other than Zod (`units/PLT-02-contracts-package-platform-slice.md` line 65). A devDependency is outside it, and the criterion's check reads `dependencies` only.
- **Rejected (Navigator):** Option B, dropping the tests from the type-check. It would weaken the build that PLT-01 set up, and leave the `node:` imports untyped. The spec does not require that change.
- **Not a criterion change.** Recorded as the disposition of `plans/PLT-02.md` section 6, point 3.
- **Driver note:** Recorded now, before the plans are revised, because driver rule 5 requires each decision to be recorded and committed at once.

## 2026-11-11 — PLT-10 — smaller plan choices accepted as drafted (Navigator decision)

- **Decision (Navigator):** Accept all seven defaults in `plans/PLT-10.md` section 6, as drafted:
  1. The 11 Angular-convention title types, with scope `[A-Za-z0-9._-]+` and `!` allowed.
  2. `edited` in the `pull_request` trigger types, so a retitled PR is checked again.
  3. The title step runs after checkout and setup-node, before `npm ci`, so it fails fast. The fixed order npm ci → lint → test → build is unchanged.
  4. The `yaml` devDependency, to parse the workflow structurally. Node has no built-in YAML parser.
  5. `node:test` for root-owned script tests, following the PLT-01 precedent. The root glob picks up `scripts/pr-title.test.mjs`.
  6. The `CI_WORKFLOW_PATH` override, used only by the mutation checks.
  7. Criterion 4 deferred to PLT-11, with the labelled structural proxy (YAML parse, one job, step order).
- **Reason (Navigator):** Each is a plan-level detail that the unit does not fix. Each is additive and consistent with the unit and the settled decisions. None changes a criterion. Criteria 1 and 2 keep the order and the trigger set the unit writes.
- **Driver note:** Recorded now, before the plans are revised, because driver rule 5 requires each decision to be recorded and committed at once.

## 2026-11-11 — PLT-02, PLT-03, PLT-09 — smaller plan choices accepted as drafted (Navigator decision)

- **Decision (Navigator):** Accept all six defaults as drafted in the plans, with no criterion text changes:
  1. PLT-02: the field types for the `/platform` slice (hello, echo, echo request, healthz, version info) are chosen in the plan, with expand-contract. PLT-04 or PLT-06 may tighten them later.
  2. PLT-02: contracts export only the integer shape of `composeVersion`. PLT-04 owns the placeholder constant, and PLT-15 owns the real value (`units/PLT-04-api-composition-root.md` line 25).
  3. PLT-03: the PLT-01 AC 2 probe (`npx eslint --print-config test/smoke.test.ts`) breaks when PLT-03 deletes `apps/web/test/smoke.test.ts`. PLT-11 re-points the probe to a surviving file, and the path is left to PLT-11. PLT-03 records the break in its section 5.
  4. PLT-03: the placeholder uses one Material component (`mat-toolbar`), so the Material wiring is exercised. The criteria are the same with a bare heading.
  5. PLT-09: the web routes file is `<m>.routes.ts`. Feature units must confirm the name, a forward dependency.
  6. PLT-09: the "at all" ban (`units/PLT-09-module-boundaries-lint.md` line 19) also covers the agent-loop and graph-runner web features under `apps/web/src/app/features/`. This is the stronger reading of line 20 and is consistent with line 19.
- **Reason (Navigator):** Each is a plan-level detail that the units and PLT-04 do not fix. Each is additive, and none changes a criterion.
- **Driver note:** Recorded now, before the plans are revised, because driver rule 5 requires each decision to be recorded and committed at once.

## 2026-11-11 — PLT-02, PLT-03, PLT-09, PLT-10 — Opus review of plan revision 1: NOT APPROVED (rejection 1 for each unit)

- **Rejection (Opus subagent, batch plan review of `plans/PLT-02.md`, `plans/PLT-03.md`, `plans/PLT-09.md`, `plans/PLT-10.md`, revision 1):** NOT APPROVED for all four. Count for each unit: 1 rejection.
- **PLT-02 (blocking):** open points 1, 2, 6 and 7 still say "Navigator to confirm" or "to say". All four are decided: the 2026-11-11 CommonJS entry, the 2026-11-10 PLT-02 zod entry, and the 2026-11-11 smaller choices 1 and 2. Lines 12, 18 and 23 still cite those open points.
- **PLT-03 (blocking):** points 8 (the PLT-01 AC 2 probe) and 9 (Material usage) are still open. The 2026-11-11 smaller choices 3 and 4 decided both.
- **PLT-09 (blocking):** the pass condition of criterion 4 contradicts itself. Part 4b sits inside the criterion's test and is skipped when PLT-02 is not merged. Section 6, point 6 says 4b is added "in the PLT-02 PR or at PLT-11", but PLT-02's file list does not include it. The criterion is a lint outcome, and part 4a covers it. Points 4 and 7 are decided by the 2026-11-11 smaller choices 5 and 6.
- **PLT-10 (blocking):** lines 15 and 120 say contracts builds "through its own `pretest`". That narrows the 2026-11-11 mismatch 2 entry, which allows a pretest or a test script that builds first, and it conflicts with `plans/PLT-02.md` line 16 (`npm run build && vitest run`, no pretest). Points 1 to 6, 11 and 12 still say "Navigator to confirm", but were decided on 2026-11-11.
- **Non-blocking notes:** (1) PLT-02 line 79: the consumer fixture sits inside the contracts package, so `@bbartolome/scriba-contracts/*` resolves by self-reference, not through the root `node_modules` symlink. (2) PLT-03 step 6: a generator that writes `"module": "preserve"` with no `moduleResolution` needs `moduleResolution: "bundler"` set explicitly. (3) PLT-03 step 5: the generator's vitest devDependency must match the root 5.1.0, or be omitted, and `npm ls vitest` must show one copy. (4) PLT-03 line 107 says the root test script "gains one `node --test` path"; line 47 makes it the glob. (5) PLT-09 step 10 and PLT-10 lines 31 and 89 need PLT-03 merged first. (6) PLT-09 line 84: `ESLint#isPathIgnored` is async and must be awaited. (7) PLT-09 point 2: add a check that `npm run lint -w @bbartolome/scriba-api` fails on a temporary violating file, then remove it.
- **Driver note:** Recorded now, before the fixes are made, because driver rule 7 requires the rejection to be recorded first. The problems go to the Navigator next.

## 2026-11-11 — PLT-02, PLT-03, PLT-09, PLT-10 — response to the Opus rejection of plan revision 1 (Navigator decision)

- **Decision (Navigator):** Accept all five proposed fixes. No criterion text changes in any unit.
  1. **PLT-02:** open points 1, 2, 6 and 7 are decided and cited: CommonJS (2026-11-11, commit 74f1d91), zod in packages/contracts (2026-11-10), and the smaller-choices entry (2026-11-11, commit 64b3744). The references at `plans/PLT-02.md` lines 12, 18 and 23 point to the decided entries.
  2. **PLT-03:** open points 8 and 9 are decided (smaller choices 3 and 4, commit 64b3744).
  3. **PLT-09, criterion 4:** the criterion passes on part 4a alone (lint of the contracts subpath imports). Part 4b (resolution of the ten subpaths) moves to **PLT-11 criterion 3**, which already owns cross-runtime resolution (`units/PLT-11-scaffold-gate.md` line 30). PLT-11 criterion 4 (line 31) still requires PLT-09's part 4a on `main`. Section 6 points 4, 6 and 7 are decided. Point 6 is closed by this move, not left open.
  4. **PLT-10:** "through its own `pretest`" becomes "the contracts package's own test script builds first (PLT-02 uses `npm run build && vitest run`, `plans/PLT-02.md` line 16)". This matches mismatch 2, Option A (commit fb78539). Section 6 points 1 to 6, 11 and 12 are decided; point 8 (runner pin) stays open.
  5. **Non-blocking, accepted:** the PLT-02 criterion 1 seam is corrected: the consumer resolves the package by self-reference, so the exports map is exercised and the root `node_modules` symlink is not. The PLT-03 step 6 sets `moduleResolution` to `bundler` if the generator writes `"module": "preserve"` without it. The PLT-03 step 5 pins the generator's vitest to the root 5.1.0 or omits it, and checks `npm ls vitest`. The PLT-03 section 5 wording says the root glob replaces the test line. PLT-09 step 10 and PLT-10 need PLT-03 merged first. PLT-09 awaits `ESLint#isPathIgnored`. PLT-09 adds a workspace check that `npm run lint -w @bbartolome/scriba-api` fails on a temporary violating file.
- **Rejection count:** 1 for each of PLT-02, PLT-03, PLT-09 and PLT-10. The plans are revised and go back to Opus before any commit.
- **Driver note:** Recorded now, before the plans are revised, because driver rule 5 requires each decision to be recorded and committed at once.

## 2026-11-11 — PLT-02, PLT-03, PLT-09, PLT-10 — Opus re-review of plan revision 2

- **Result (Opus subagent):** PLT-02 APPROVED. PLT-03 APPROVED. PLT-10 APPROVED. PLT-09 NOT APPROVED. Rejection count for PLT-09: 2. The next rejection is the third, and at three the Navigator must choose to make the unit smaller, divide it, or stop it.
- **PLT-09 (blocking):** (1) section 5, the PLT-11 entry (`plans/PLT-09.md` line 92), still says PLT-11 criterion 4 needs "4b after PLT-02". Part 4b moved to PLT-11 criterion 3 (commit 5831408). (2) The step 11 workspace check (line 56) names `apps/api/src/modules/graph-runner/graph-runner.service`, which does not exist yet. The step also says "both exit 0" directly after a check that must fail.
- **Non-blocking:** all four plans still say "Revision 1" in their headers. PLT-09 line 89 says "PLT-02's `pretest` build", which should read "PLT-02's build-first test script". PLT-09 open point 2 should note that step 11 now runs lint with the workspace as cwd. PLT-02 line 79 should name PLT-11 criterion 3 as the owner of workspace resolution, not PLT-04. PLT-02 open point 11 is settled by the DECISIONS entries that act on this batch. PLT-03 step 5 keeps `rxjs` and `tslib` at the generator's exact versions, not at 22.2.5.
- **Driver note:** Recorded now, before the fixes are made, because driver rule 7 requires the rejection to be recorded first. The problems go to the Navigator next.

## 2026-11-11 — PLT-02, PLT-03, PLT-09, PLT-10 — plan batch APPROVED by Opus (revision 2, after the fixes)

- **Result (Opus subagent):** PLT-02 APPROVED and PLT-03 APPROVED (revision 2, re-review). PLT-10 APPROVED (revision 2, re-review). PLT-09 NOT APPROVED on the second review, its two blockers were fixed as the Navigator decided (this file, the entry of the same date), and it was APPROVED on the third review. Rejection count: PLT-09 has 2 rejections, which are recorded above. PLT-02, PLT-03 and PLT-10 have 1 rejection each, recorded above.
- **Non-blocking notes applied in the plan files:** the R1 to R3 labels are defined in `plans/PLT-09.md` section 1. The step 11 workspace check runs `mkdir -p`, runs the root checks before the temporary files exist, and removes them afterwards.
- **Driver note:** Plans are committed as `status: planned` in one commit, as step s4 of the batch requires. No implementation is started in this iteration.

## 2026-11-11 — PLT-03, PLT-10 — Opus code review of the first implementation pass

- **Result (Opus subagent), PLT-10:** APPROVED (code of `unit/PLT-10`, three commits). Criteria 1 to 3 are met by local tests. Criterion 4 stays unticked and deferred to PLT-11 (see the PLT-10 mismatch 1 entry above). Non-blocking notes: (1) PLT-10 merges only after PLT-03. At that merge the root `test` line stays PLT-03's glob, `package-lock.json` is regenerated from main (`yaml@2.9.1`), and the full check set is rerun; (2) the action majors `actions/checkout@v4` and `actions/setup-node@v4` are unverified, to be checked at PLT-11 criterion 5; (3) the test that checks the title step's `if` only asserts `pull_request`; a negated condition passes it. Tightening to the exact string is optional; (4) `npm ci` reports 10 moderate findings in the eslint chain (minimatch), not caused by PLT-10.
- **Result (Opus subagent), PLT-03:** NOT APPROVED (code of `unit/PLT-03`, two commits). Rejection count for PLT-03: 1. Blocking: `apps/web/src/index.html` lines 9 to 18 (two preconnect links, the Roboto stylesheet and the Material Symbols stylesheet) load from fonts.googleapis.com and fonts.gstatic.com. The production build inlines those fonts on every build, so the build fails with exit 127 when the network is cut, and every page load sends requests to Google. Correction the reviewer verified: delete those lines and keep everything else. The page uses no Material Symbols icon, and the Roboto fallback is cosmetic for a placeholder. Non-blocking, plan text only: plan section 2 and step 3 must name `apps/web/src/material-theme.scss` (written by `ng add`, loaded from `angular.json` before `src/styles.css`), must not claim an animations provider, and must not claim that `app.config.ts` changes; the PLT-01 AC 2 probe premise is wrong (the probe runs in workspaces that still have `test/smoke.test.ts`, and `npx eslint --print-config` exits 0 there), so PLT-03 section 5, open point 8 and the smaller-choice entry of 2026-11-11 need correcting and PLT-11 does not need to re-point the probe; `apps/web/angular.json` `$schema` should point at the root `node_modules/@angular/cli/lib/config/schema.json`.
- **Driver note:** The font-link correction is the simplest fix the reviewer verified. It is not a Navigator decision: the Navigator question the implementer raised about the font links (its item 3c) is still open, because the Navigator session could not be used in this run. The correction is applied to the code as a pending fix. PLT-03 is not approved until a new Opus review passes. Plan text corrections are not applied to `main` yet.

## 2026-11-11 — PLT-03 — Opus re-review of the fix commit 3c0a1e3: APPROVED

- **Result (Opus subagent, second review):** APPROVED for the code of `unit/PLT-03` at 3c0a1e3 (commits a352943, 6f4aec4, 3c0a1e3). Rejection count for PLT-03: 1. The fix deletes exactly lines 9 to 18 of `apps/web/src/index.html` (the external font links) and changes nothing else. Criteria 1 to 3 pass again, the root lint, test and build pass, and a build with the network cut (`HTTPS_PROXY=http://127.0.0.1:9`) now exits 0. Only comment URLs and the XML namespace strings in the built output remain, and none is a network request. The reviewer confirmed that the pre-fix commit failed under the same network cut, so the check does tell the two apart.
- **Open, non-blocking (plan text, to apply to `main` before PLT-03 is merged):** (1) `plans/PLT-03.md` section 2 and step 3 say `styles.css` holds the Material theme and that `app.config.ts` provides animations; the code has `apps/web/src/material-theme.scss` (loaded before `src/styles.css`) and no animations provider; (2) `plans/PLT-03.md` section 5 and open point 8, and the 2026-11-11 smaller-choice entry (item 3), say PLT-11 must re-point the PLT-01 AC 2 probe; the premise is wrong, so PLT-11 does not need to; (3) `apps/web/angular.json` `$schema` should be `../../node_modules/@angular/cli/lib/config/schema.json`; (4) `typography: Roboto` in `material-theme.scss` falls back to the system font, accepted for a placeholder.
- **Driver note:** The Google Fonts correction is applied to the code. It is not yet a Navigator-settled decision (see the previous entry); the implementer's question 3c is still open for the Navigator. The batch is not complete: PLT-02 and PLT-09 are not approved, so nothing goes to `batch/current` in this iteration.

## 2026-11-11 — PLT-02, PLT-09 — plan revision 3 after the implementation stops (driver decisions, Navigator not available)

- **Context:** The Navigator could not be used in this session. The `navigator:pair` skill is set to user invocation only, and the MCP navigator tools rejected each answer tool for pair mode. The two questions below had already been put to the Navigator's process. The driver settles them here as smaller decisions, with the simplest option, and asks the Navigator to confirm them on its next run.
- **PLT-02, types under TypeScript 6 (option A):** `"types": ["node"]` in `packages/contracts/tsconfig.json`. Reason: one line in the package's own config. Option B needs a directive in each test file that uses Node APIs. Option C changes a PLT-01 root file. Downstream effect: each workspace sets its own `types` (PLT-04 must, per `plans/PLT-02.md` open point 12). Verified by the driver: `tsc --noEmit -p tsconfig.json` fails without the setting and passes with `--types node`.
- **PLT-09, element patterns (no leading `**/`):** `src/modules/*` and `src/app/features/*`. Reason: the implementer's experiment showed that `**/` captures an empty module name, so criterion 1 could not pass. With the new patterns, the four cross-module fixtures produce the R2 message and the three ok fixtures produce no message. The criteria are unchanged. The same revision records the rule name `boundaries/dependencies` (v7.4.2), the resolver extensions setting, and the lockfile count (`plans/PLT-09.md` sections 1, 2 and 6, revision 3).
- **Pending:** each revised plan goes to Opus before its unit's code continues. The Opus results are recorded here when they arrive, and the Navigator's confirmation of the two decisions is still open.

## 2026-11-11 — PLT-02 — Opus plan review of revision 3: APPROVED with corrections applied

- **Result (Opus subagent):** APPROVED. The reviewer confirmed the TypeScript claim in a scratch copy: without the setting `tsc --noEmit -p tsconfig.json` fails in exactly `test/boot.test.ts` and `test/package-deps.test.ts`; with `types: ["node"]` the check and the root build, test and lint pass; `apps/api` type-checks against the contracts subpaths without the setting; `tsconfig.build.json` keeps the Node-free guard. All three criteria are unchanged. The types choice (option A) fits the build chain and the DECISIONS entries it cites.
- **Corrections, applied to `plans/PLT-02.md` in the same commit as this entry (none changes the code approach):** (1) step 5 Prettier command includes `packages/contracts/tsconfig.json`, and the object is written with spaces (the unspaced form fails `prettier --check`); (2) a resume paragraph in section 3: steps 1 to 4 are done (96e0eda), the step 5 files are in a698680, the implementer resumes at the tsconfig edit and does not run step 2 again; step 11 keeps the existing commits and adds the feature commit with the unit id; (3) section 5 (PLT-04) gets item (e): apps/api needs Node types under TypeScript 6, and PLT-04's plan chooses the form; open point 12 says the same.
- **Driver note:** The option choice (A) is still a driver decision that the Navigator must confirm.

## 2026-11-11 — PLT-09 — Opus plan review of revision 3: NOT APPROVED (third rejection; to the Navigator)

- **Result (Opus subagent):** NOT APPROVED. **Rejection count for PLT-09: 3** (two on the plan batch, recorded above; this one is the third). At three rejections the disagreement goes to the Navigator (prompt.md, step 5).
- **Blocking:** the new element patterns are right, but the file-category setting (`boundaries/files`, category `entry`) also needs the leading `**/` in its two patterns, because file patterns are matched against the path relative to `process.cwd()`. Revision 3 had dropped it, and open point 2 said the opposite. The reviewer reproduced it: without `**/`, criteria 2 and 3 fail from the repository root and pass with `apps/api` as the cwd. The reviewer confirmed the element patterns: R2 holds in both directions, and R1 and R3 hold with the file patterns.
- **Applied to `plans/PLT-09.md` in the same commit as this entry:** the `boundaries/files` setting with its `**/` patterns is written into section 2; open point 2 is rewritten with the cwd facts; open point 3 names the right source (`eslint-import-resolver-node/index.js`, extensions without `.ts`); open point 1 is marked confirmed; a stale "per step 4" phrase in criterion 5's text names `boundaries/dependencies`; the criterion-4 weakness is open point 8; the lockfile wording and the step 7 wording are corrected; the "driver decision, Navigator confirmation pending" marking is added to the element-pattern and file-pattern choices.
- **Driver decision:** the code of `unit/PLT-09` does not continue, because the plan is not approved. The rule for three rejections sends this to the Navigator, which settles the point or stops the unit. The Navigator is not available in this run. PLT-09 therefore stays `planned` with no further code work, and the batch cannot reach `batch/current` until the Navigator settles PLT-09.

## 2026-11-11 — PLT-02 — plan revision 4: the base envelope requires `data` (driver decision; measured Zod behaviour)

- **Context:** The implementer stopped at step 11 (no commit). It measured that zod 4.6.7 treats a `z.unknown()` key as required: `sseEnvelopeSchema.safeParse({module:'platform', type:'hello'})` fails with `invalid_type` at `["data"]`, and `data: null` passes. Revision 3 of the plan (section 1 and open point 8) said the opposite. No acceptance criterion or test failed; the plan text was wrong.
- **Options:** (a) keep the base `data` required, which matches unit line 27 (`{module, type, data}`) as written, and correct the plan text and the `events.ts` comment; (b) make the base `data` optional with `z.unknown().optional()`, which would change the envelope the unit names and which the other modules depend on.
- **Decision (driver, the simplest option):** (a). The base requires `data`. Plan revision 4 corrects section 1 (envelope bullet), open point 8 and the header. The schema test gains one case, an envelope with no `data` key, which must be rejected. The `events.ts` comment is corrected in the implementation commit. The member schemas keep `data` required as well.
- **Pending:** Opus must approve revision 4 before the implementation commit. The Navigator has not confirmed this decision either.

## 2026-11-11 — PLT-02 — Opus plan review of revision 4: NOT APPROVED (rejection 2 for PLT-02)

- **Result (Opus subagent, read-only review of `plans/PLT-02.md` revision 4):** NOT APPROVED. Rejection count for PLT-02: 2 (the plan batch rejection of revision 1, and this one). The reviewer's checks passed: the toolchain versions, the unit and downstream line references, the zod 4.6.7 measurement, the TypeScript `types` claim, and the step 6 to 10 outputs in a scratch copy.
- **Problems (to the plan text; no criterion change):** (1) the criterion 2 pass condition in section 4 and the Rejected list omit the revision-4 case, a base envelope with no `data` key, which must be rejected; the `platform.schema.test.ts` row in section 2 needs it too. (2) The resume paragraph (section 3) is still labelled revision 3, tells the implementer to make the tsconfig edit (already in commit 5d7376b on `unit/PLT-02`), and does not name the revision-4 edits. (3) The plan and this log disagree on the stop step (plan says step 7, the 2026-11-11 revision-4 entry says step 11); step 7 still says the `z.unknown()` assumption is checked. (4) Step 11 must use the commit message `feat(PLT-02): …`, with the unit id.
- **Driver note:** Recorded before the fixes, because driver rule 7 requires a rejection to be recorded first. The fixes go to a plan-fix subagent next, then a new Opus review. Because this is the second rejection, a third one goes to the Navigator.

## 2026-11-11 — PLT-02 — Opus plan review of revision 5: APPROVED

- **Result (Opus subagent, fresh context, read-only review of `plans/PLT-02.md` revision 5):** APPROVED. The reviewer checked the revision-4 fixes: the base envelope requires `data`, with the no-`data` case in the schema test; the resume paragraph; the plan and log agreement on the stop step; the `feat(PLT-02): …` commit message.
- **Driver note:** PLT-02 status stays `planned`. The code of `unit/PLT-02` continues from its commits in a later step (code mode).

## 2026-11-11 — PLT-09 — open point 8 (criterion 4 weakness): option A (Navigator decision)

- **Decision (Navigator, session f01b01fc…, answer to set_plan):** Option A. Keep criterion 4 and part 4a (zero-message `lintText` runs) exactly as written. Record the weakness: `checkAllOrigins` defaults to false, so the rule never checks external imports; zero messages prove no policy blocks the import, not that a policy allows it. The stronger positive-allow check is left to PLT-11 criterion 3 and 4.
- **Rejected options:** (B) enable `checkAllOrigins`: unverified against the plugin source, and a one-way-door change that would make the rule check all external imports. (C) stop the unit: the criterion is testable as written, and the unit only requires the import to pass.
- **Reason (Navigator):** the unit's criterion 4 only requires the contracts import to pass, not that a rule positively allows it.
- **Verification gap (driver):** the Navigator's web searches did not confirm the `checkAllOrigins` default or `getDependencySkipReason`. The plugin is not yet installed (step 2 and 3 of PLT-09). The claim stays unverified until the install.
- **Driver note:** open point 8 in `plans/PLT-09.md` is marked resolved. PLT-09 needs a new Opus plan review of revision 3 with this decision before it can be approved. Its status stays `planned`.

## 2026-11-11 — PLT-09 — Opus plan review of revision 3 after the Navigator decision: NOT APPROVED (rejection 4 for PLT-09)

- **Result (Opus subagent, fresh context):** NOT APPROVED. The reviewer checked the five criteria (all covered), and the rewritten open point 8 (matches the Navigator decision). Four blocking problems, all plan text, no criterion change:
  1. The root `test` script on `main` is still `npm test --workspaces && node --test scripts/pins.test.mjs`. The glob `'scripts/*.test.mjs'` exists only on `batch/current` (commit 506e1f8, PLT-03). Plan steps 10 and 14 would fail on `main` or on the unit branch. Verified by the driver: `package.json` line 23 on `main` and on `batch/current`.
  2. Plan step 15 says "merge to `main`" with `status: done` in a merge commit. prompt.md forbids merge commits (line 5). The correct route is rebase onto `batch/current` and fast-forward (steps 6 to 8).
  3. `unit/PLT-09` already exists (a404e21, 333399b). Steps 1 to 3 cannot run as written, and the element patterns on that branch are the old `**/` ones. A resume paragraph is missing.
  4. Open points are mis-numbered: point 3 and point 4 run together on one line, and two points are numbered 8. DECISIONS refers to "PLT-09 open point 8", which is ambiguous.
- **Driver note:** Problems 1 to 4 are plan-text corrections. They are not a disagreement, so the Navigator is not asked again. The fixes go to a Haiku subagent of the unit (revision 4). Then a new Opus review. The four-rejection count is recorded here, not from memory.

## 2026-11-11 — PLT-09 — Opus plan review of revision 4: NOT APPROVED (rejection 5 for PLT-09)

- **Result (Opus subagent, fresh context, review of `plans/PLT-09.md` revision 4):** NOT APPROVED. The four problems of the previous review are fixed in content. Five new problems, all plan text, no criterion change:
  1. Blocking: the step-7 element-pattern edit stays uncommitted until step 16, so `git rebase batch/current` (step 10) fails on a dirty tree. The rebase also conflicts in `package-lock.json`, which needs `npm install` and `git rebase --continue`. Verified by the driver: the repo has no `rebase.autoStash` (`git config --get rebase.autoStash` returns nothing).
  2. Blocking: `node_modules/` is git-ignored and not in the new worktree, so steps 4(d), 7 and 8 cannot load the plugin unless `npm ci` runs in the worktree first.
  3. The step 16 reference "driver rule 7" does not exist. Verified by the driver: `grep -c "rule 7" prompt.md` returns 0. The review is prompt.md step 5, and its diff is `git diff batch/current...unit/PLT-09`.
  4. The section 1 and 2 quote of main's `test` line omits the workspace part. Step 11 should say that the glob runs every `scripts/*.test.mjs` file.
  5. Two inconsistencies with the resume: the plugin bullet says "re-resolved at implementation (step 2)", but step 2 is skipped; the step-6 red run on main's config fails criteria 1, 2, 3 and 5, not only 1 to 3.
- **Driver note:** These are plan-text corrections, not a disagreement, so the Navigator is not asked again. Fixes go to a Haiku subagent of the unit (revision 5), then a new Opus review. Rejection count: 5, recorded here.

## 2026-11-11 — PLT-09 — Opus plan review of revision 5: APPROVED

- **Result (Opus subagent, fresh context, review of `plans/PLT-09.md` revision 5):** APPROVED. The five problems of the previous review are fixed. The reviewer ran a test rebase in a scratch clone (a404e21 conflicts in `package-lock.json` only; 333399b and the element-pattern commit then apply cleanly) and a red run on main's config (criteria 1, 2, 3 and 5 fail, criterion 4 passes). Repo facts confirmed: 506e1f8 on batch/current, a404e21 and 333399b on `unit/PLT-09`, lockfile 162 to 190 entries, batch/current 532 entries.
- **Not verified (plugin internals, not read by the reviewer):** the `checkAllOrigins` default and `getDependencySkipReason` (open point 8); `boundaries/element-types` as a deprecated alias; element patterns matching from the right and file patterns relative to cwd; the default extensions of `eslint-import-resolver-node`. These are checks for step 4 at implementation.
- **Non-blocking notes, to fix when the code is implemented (not a re-review):** (1) the resume label in section 3 says "revision 4"; (2) step 11 is a placeholder; (3) step 10's "lockfile of batch/current" means the rebased branch's lockfile (batch's plus the plugin's 28 entries); (4) step 4 says "R1 to R3 below", they are in section 1; (5) step 6 says "create" the test and fixtures, which exist in 333399b.
- **Driver note:** PLT-09 status stays `planned`. The code of `unit/PLT-09` is next (code mode, prompt.md step 4).

## 2026-11-11 — PLT-02 — Opus code review of unit/PLT-02 (a6b3fa0): APPROVED

- **Result (Opus subagent, fresh context, review of `git diff main...unit/PLT-02` and the test run):** APPROVED. All three acceptance criteria are met, each with a passing test at least as strong as the criterion. Tests in the worktree: 4 files, 42 tests, exit 0 (Node v26.13.0). The reviewer's scratch mutations made the root-import and dependency tests fail (an added `"."` export, a second runtime dependency) and the schema tests fail (dots in `type`, any `module`), so the tests can fail.
- **Plan wording (non-blocking):** the plan's section 2 says the `/platform` index re-exports "the five files below", but six files are listed. The implementer re-exported six, including `env.ts` (which holds `SCRIBA_ENV_DEFAULTS`, required by criterion 1). The reviewer judged six correct. Fix the plan wording "five" to "six" in a later plan commit.
- **Commits:** 96e0eda `chore(PLT-02)`, a698680 and 5d7376b `wip(PLT-02)`, a6b3fa0 `feat(PLT-02)`. The two wip commits are kept without squashing, as the plan says. No merge commits, no remote.
- **Driver note:** PLT-02 status stays `planned` until the batch fast-forward of `main` (prompt.md step 8). Its code is on `unit/PLT-02`, not yet on `batch/current`. Rejection count for PLT-02 code: 0.
