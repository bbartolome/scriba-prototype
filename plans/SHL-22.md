---
id: SHL-22
status: planned
---
# SHL-22 plan — explicit wait timeouts in the load-sensitive specs

Revision 2 (reviser, draft; revision 1 by the planner). Base: `main` at f81ae12; aae2d78, the commit of this plan, adds only `plans/SHL-22.md`. The four spec files are unchanged since 1f1e234 (section 8), so the line numbers below hold at f81ae12 and at aae2d78. The planner ran no test, build or install. Every command in section 3 is for the implementer.

## 1. Decisions this plan obeys

Unit decisions (`units/SHL-22-load-sensitive-spec-waits.md`, "Decisions", lines 38 to 41):

- **D1. Test-only.** No source file changes. No assertion is touched. No `it.skip`, `it.todo` or `describe.skip` is added. Source: unit line 38; criterion 2 (unit line 50).
- **D2. 5000 ms per listed call.** Each listed `vi.waitFor` gets `{ timeout: 5000 }`, the value of commit 1f1e234. Source: unit line 39; `apps/web/src/app/shell/landing.spec.ts` line 51; DECISIONS line 4391.
- **D3. Named constant for many calls.** A spec with many calls declares the option once and passes it to each call, as `LOAD_WAIT` in `landing.spec.ts`. Source: unit line 39; `landing.spec.ts` line 51.
- **D4. Test-level timeout where the waits can add up.** The API spec needs none, because `apps/api/vitest.config.mts` line 9 sets `testTimeout: 20000`. Source: unit line 40.
- **D5. No lengthening of absence checks.** None of the 27 listed calls waits for an absence. Source: unit line 41; section 8.
- **D6. Scope.** Only the four files of section 2. Not `apps/web/src/app/shell/notices.spec.ts` (line 93, `{ timeout: 1000 }`, unchanged), not the calls that already carry a timeout, not the local polling helpers, not the Playwright specs, and not the `setTimeout` sleeps (`sleepFor` in `apps/api/test/providers-client-timeout-abort.test.ts` lines 49 to 50 and 138; `settleMacrotask` in `connection-status.spec.ts` line 114). Source: unit lines 30 to 32 and 44 to 46.
- **D7. Test seams.** `ng test` for the web specs, through `npm test -w @bbartolome/scriba-web -- --include=...`. `vitest run` for the API spec. Source: unit line 48 (the seam of the criteria) and criterion 4 (line 52).

Plan choices (the unit leaves the values to this plan, line 40):

- **D8. Per-test timeout rule.** A test that holds a listed wait gets its own timeout: the sum of its listed waits' timeouts plus 5000 ms, unless the runner default already reaches that value. This reproduces 1f1e234 exactly: 20000 for three waits (`landing.spec.ts` line 90) and 10000 for one wait (line 113). The API file is the case where the default already reaches the value (D4).
- **D9. Naming and layout.** `LOAD_WAIT`, with the same name and value as in `landing.spec.ts`, is declared once in `project-route.spec.ts`, the only file with more than four calls (21). The other three files write `{ timeout: 5000 }` inline (at most three calls each). Test timeouts are inline numbers.
- **D10. Worktree.** `/Users/bbartolome/workspace/scriba-prototype-wt/SHL-22` on branch `unit/SHL-22`, cut from `main`. This follows the layout of the existing worktree `scriba-prototype-wt/AGL-05` (`git worktree list`).
- **D11. Commit subject.** `test(SHL-22): give the load-sensitive spec waits an explicit timeout`. The repository uses `test(<unit>): ...` for test-only commits (for example `test(AGL-04): ...` in `git log`).

Decisions log (`plans/DECISIONS.md`), searched by unit id:

- "SHL-22" occurs once, at line 4443 (the AGL-05 review judges the SHL-22 additions to main acceptable). No decision on SHL-22's waits exists.
- "SHL-08" occurs in many entries. The waits of `project-route.spec.ts` come from the SHL-08 plan, whose review (line 2533) chose `vi.waitFor` for the switch-page checks; no SHL-08 entry sets a timeout. The 1f1e234 fix (commit `fix(SHL-08)`) is recorded in the 2026-11-15 corrections at lines 4391 and 4435: the cause, the 5000 ms and 20000/10000 ms values, no assertion changed. The results there are REPORTED by a subagent run (section 9, A6).
- Line 1223 (the SHL-06 plan review) is the source of the 3000 and 4000 ms values of `connection-status.spec.ts` lines 234 and 246. This plan leaves them unchanged (open point 4).

## 2. Files to change

Only these paths change. No package file, lockfile, unit file or module file changes.

| Path | Change |
|---|---|
| `apps/web/src/app/shell/project-route.spec.ts` | edit. Declares `LOAD_WAIT` (comment, then `const LOAD_WAIT = { timeout: 5000 };`) between the import block (ends line 16) and `const projectList` (line 18). Passes `LOAD_WAIT` as the second argument of the 21 `vi.waitFor` calls at lines 88, 95, 98, 107, 129, 140, 151, 169, 175, 186, 192, 199, 210, 215, 222, 239, 245, 257, 263, 266, 274. Gives the eight test definitions (seven `it`, one `it.each` run as two cases) the third argument of table 2.3. |
| `apps/web/src/app/shell/api-client.spec.ts` | edit. `{ timeout: 5000 }` as the second argument of the call at line 182. T7 (`it` at line 172, closing `});` at line 187) gets `10000` as its third argument. |
| `apps/web/src/app/shell/connection-status.spec.ts` | edit. `{ timeout: 5000 }` on the calls at lines 162 and 171. The test at line 138 (closing `});` at line 179) gets `15000` as its third argument. |
| `apps/api/test/providers-client-timeout-abort.test.ts` | edit. `{ timeout: 5000 }` on the calls at lines 70, 117 and 207. No test-level change. |
| `plans/SHL-22.md` | this plan. Committed on `main` by the orchestrator, not by the implementer, and not on `unit/SHL-22`. |

The check scripts of section 3 are written to `/tmp/shl22-check/`, outside the repository, and are not committed.

Table 2.3. Test-level timeouts (the web runner default is 5000 ms; D8). "Line" is the `it`/`test` line at main.

| File | Test (line) | Listed waits (lines) | Own timeout |
|---|---|---|---|
| project-route | C2, "shows the switch page for a mismatched project…" (79) | 88, 95, 98, 107 | 25000 |
| project-route | E2, "ActiveProjectSignal reads the id of the URL" (116) | 129 | 10000 |
| project-route | E3, "a failed Switch shows the message…" (132) | 140, 151 | 15000 |
| project-route | E6, "carries a query in the remainder…" (155) | 169, 175 | 15000 |
| project-route | "a switch page reused for another URL…" (178) | 186, 192, 199 | 20000 |
| project-route | "a switch page reused for another project id…" (202) | 210, 215, 222 | 20000 |
| project-route | "a valid to keeps its path and query…" (231) | 239, 245 | 15000 |
| project-route | `it.each` "an invalid to (%s) is treated as empty…" (248), both cases | 257, 263, 266, 274 | 25000 |
| connection-status | "stopping the API shows Reconnecting…" (138) | 162, 171 | 15000 |
| api-client | T7, "sends a 401 to /setup…" (172) | 182 | 10000 |
| providers | three tests at lines 54, 94 and 189 | 70, 117, 207 (one each) | none. The API config's 20000 ms already reaches 5000 + 5000 (D4) |

Not changed: the test at `connection-status.spec.ts` line 219 (its waits at 234 and 246 already carry 3000 and 4000 ms, and its own timeout 10000 is already in place, line 258).

Changed calls, by file (45 `vi.waitFor` calls in the scope of section 4, of which 27 have no timeout at main: 21 + 1 + 2 + 3):

- `project-route.spec.ts`: 21 calls (all).
- `api-client.spec.ts`: line 182.
- `connection-status.spec.ts`: lines 162 and 171.
- `providers-client-timeout-abort.test.ts`: lines 70, 117 and 207.

## 3. Procedure

The implementer runs these steps in order. Record `node -v` and `npm -v` beside each result. Do not push, and use no git remote other than the local repository.

**Setup and baseline**

0. **Preconditions.** On `main`, `git status --short` prints nothing. `git diff --quiet 1f1e234 main -- apps/web/src/app/shell/project-route.spec.ts apps/web/src/app/shell/api-client.spec.ts apps/web/src/app/shell/connection-status.spec.ts apps/api/test/providers-client-timeout-abort.test.ts` exits 0. If either fails, stop and re-check the line numbers of section 2 before any edit.
1. **Runtime.** `node -v` prints `v26.x` (root `package.json` line 12, `>=26 <27`). `npm -v` prints `11.x` (root line 14, `npm@11.20.0`). Record `N`, the number of CPU cores (`nproc`; on macOS `sysctl -n hw.ncpu`). The planner's sandbox has N = 6.
2. **Branch and worktree.** `git worktree add /Users/bbartolome/workspace/scriba-prototype-wt/SHL-22 -b unit/SHL-22 main`. Record `BASE=$(git rev-parse main)` at that moment; every later comparison with `main` in this plan uses `$BASE` (after a rebase in step 9, `BASE=$(git merge-base main HEAD)`). In the worktree, run `npm ci` (exit 0), then `npm run build -w @bbartolome/scriba-contracts` (exit 0). The web and API specs import `@bbartolome/scriba-contracts/*` through `dist` (`packages/contracts/package.json` lines 10 to 13; `apps/api/test/providers-client.kit.ts` line 7), so the build must come first.

**Red run on the unchanged files (criterion 4 evidence; no edit yet)**

3. **Baseline checks.**
   a. `npx tsc --noEmit -p apps/web/tsconfig.spec.json`. Record the exit code (the baseline for step 8).
   b. Start the load: `for i in $(seq 1 $((3*N))); do node -e 'for(;;){}' & echo $! >> /tmp/shl22-burn.pids; done`. Expected: 3N PIDs in `/tmp/shl22-burn.pids` (18 on N = 6). The load is 3N, not the 2N of the unit's REPORTED check (unit line 35), because that check passed at 2N.
   c. Run each of the four files alone, six times each, in this order: `project-route.spec.ts`, `api-client.spec.ts`, `connection-status.spec.ts` (the three web commands of section 4 row 4), then `providers-client-timeout-abort.test.ts` (the API command). Record the exit code of each run and the titles of any failing test. Expected: a table of 24 rows. Whatever it shows is the red evidence. If no run fails, that is recorded as "no load tried reproduced a failure at 3N".
   d. Stop the load: `xargs kill < /tmp/shl22-burn.pids`, then `kill -0` on each PID (expected: no process is alive), then `rm /tmp/shl22-burn.pids`.

**Edits**

4. **Edit the four files** exactly as section 2 and table 2.3 say. Expected: `git status --short` lists the four paths and nothing else. Use only the wait-option arguments, the `LOAD_WAIT` declaration with its comment, and the test-level timeout arguments. Change no other line.
5. **Format.** `npx prettier --write` on the four files, then `npx prettier --check` on them. Expected: the check passes. Prettier decides the line layout of the changed calls, and the layout is not a deviation.
6. **Quick run, no load.** Run the four commands of section 4 row 4 once each. Expected: exit 0 each, with every test of each file passing. If the `--include` form runs zero tests, stop and record it (assumption A1). Do not change the form silently.
7. **Static checks (criteria 1 and 2).** Run the script of section 4 rows 1 and 2, in `main` mode and in `work` mode. Expected: the values of section 4 row 1 and row 2.
8. **Spec type check.** `npx tsc --noEmit -p apps/web/tsconfig.spec.json`. Expected: the same exit code as step 3a, and 0 if step 3a was 0. Any new error in the four files is a failure.
9. **Full suite (criterion 3).** Run `npm test` at the worktree root. Expected: exit 0. If `main` has moved past `$BASE` when this step runs, first run `git rebase main` in the worktree, then repeat steps 5 to 10 on the rebased branch. The red run (step 3) stays valid, because it concerns the unchanged files.
10. **Lint.** `npm run lint` at the worktree root. Expected: exit 0 (it includes `prettier --check .`).
11. **Green load run (criterion 4).** Start the load as in step 3b. Run the four files, six times each, in the order of step 3c. Stop the load as in step 3d. Expected: 24 of 24 runs exit 0, with every test passing.
12. **Commit.** `git add -- apps/web/src/app/shell/project-route.spec.ts apps/web/src/app/shell/api-client.spec.ts apps/web/src/app/shell/connection-status.spec.ts apps/api/test/providers-client-timeout-abort.test.ts`, then `git commit -m "test(SHL-22): give the load-sensitive spec waits an explicit timeout"`. Expected: `git show --stat HEAD` lists the four paths only, and `git status --short` is empty.
13. **Fresh clone (evidence beyond the criteria, as in earlier units).** `git clone --branch unit/SHL-22 /Users/bbartolome/workspace/scriba-prototype /tmp/shl22-fresh` into an empty target. In it, run `npm ci && npm run build && npm test && npm run lint`. Expected: each command exits 0.
14. **Record.** Store `node -v`, `npm -v`, `N`, the exit code of each command, the two load tables and the output of the static checks. A criterion counts as passed only when its row's pass condition (section 4) holds.

**Stop rules**

- If step 3c or step 11 shows a failing test that is not one of the listed calls' tests, stop and report it.
- If any run in step 11 fails, stop and report it (open point 2). Do not raise any timeout on your own judgment.
- If step 6 shows that the `--include` form runs zero tests, stop and record it (A1).
- If a rebase in step 9 conflicts, stop and report it.

## 4. Acceptance criteria and tests

The unit has four acceptance criteria (unit lines 49 to 52). Each has one test here. The first two are static checks on the diff, run with one script, `/tmp/shl22-check/check.cjs`, written by the implementer. It loads `typescript` from `./node_modules/typescript` (6.0.3, run from the worktree root). It takes the `.ts` files of `apps/web/src`, `apps/api/test` and `e2e` from `git ls-files` with the working-tree text (in `work` mode) or `git ls-tree -r --name-only $BASE` with `git show $BASE:<path>` (in `main` mode, `$BASE` from step 2). It finds calls by AST, not by text, so multi-line calls are covered. It resolves an identifier argument to its `const` initializer in the same file. It prints the results for step 7.

| # | Criterion (unit line) | Test | Command | Pass condition |
|---|---|---|---|---|
| 1 | Every listed call has an explicit timeout consistent with 1f1e234; a test whose waits add up past the default has its own raised timeout; no `vi.waitFor` without a timeout in `apps/web/src`, `apps/api/test` and `e2e` (line 49) | Static check (AST). Every `vi.waitFor` call in the scope, and the third argument of each `it`/`test`/`it.each` that holds a listed call | `node /tmp/shl22-check/check.cjs work` in the worktree | 45 `vi.waitFor` calls, by file as listed below the table. None without a second argument. None whose second argument lacks `timeout`. The listed calls resolve to 5000 (`LOAD_WAIT` in `project-route.spec.ts`, inline elsewhere). The third arguments of the test definitions equal table 2.3 exactly (for the `it.each`, the third argument of the inner call `it.each([...])(title, fn, 25000)`); every other `it`/`test` keeps the third argument it has at `$BASE` |
| 2 | No assertion removed, skipped or weakened; the diff changes only wait-option arguments, the `LOAD_WAIT` declaration and test-level timeout arguments; all `it`/`test` titles unchanged (line 50) | Static check (AST), three parts. (a) The ordered source text of every `expect(...)` call (whitespace-collapsed) is identical between `main` and `work`, per file. (b) The ordered string-literal title of every `it`/`test`/`describe` call is identical, per file. (c) Per file, the TypeScript printer output (`ts.createPrinter({ removeComments: true })`) of the source after three deletions is identical between `main` and `work`: the second argument of each `vi.waitFor` call, the third argument of each `it`/`test` call and of each inner `it.each(...)(...)` call, and the `const LOAD_WAIT` statement. This shows that nothing else in the diff changed | `node /tmp/shl22-check/check.cjs main` and `... work`, then compare the output; `git diff --name-only $BASE`; `git diff -U0 $BASE -- <four files>`, then search its added lines for `.skip`, `.todo`, `.only`, `xit(` and `xdescribe` | (a), (b) and (c) identical. `git diff --name-only $BASE` lists exactly the four spec files. The search finds nothing |
| 3 | The full suite passes: `npm test` at the root exits 0 (line 51) | Root `npm test` (contracts, API, web, packs and e2e through `npm test --workspaces`, then `scripts/*.test.mjs`) and `npm run lint` | `npm test` and `npm run lint` at the worktree root (step 9, 10); then the fresh clone (step 13) | Each exits 0 |
| 4 | The load check: each of the four files alone, six runs, with CPU-burning loops of at least 2N processes, passes every run (line 52) | Vitest runs of each file, alone, under 3N `node -e 'for(;;){}'` processes (step 11). The red run (step 3c) on the unchanged files is recorded beside it | Web: `npm test -w @bbartolome/scriba-web -- --include=src/app/shell/project-route.spec.ts` (and `--include=src/app/shell/api-client.spec.ts`, `--include=src/app/shell/connection-status.spec.ts`). API: in `apps/api`, `npx vitest run test/providers-client-timeout-abort.test.ts` | 24 of 24 green runs exit 0 with every test passing. The red table is recorded, whether or not it shows failures (the criterion allows either) |

Pass counts for row 1 (the 45 calls, by file): core-gate 1 (line 48), settings-page 4 (147, 247, 262, 279), setup-page 3 (127, 217, 506), api-client 1 (182), connection-status 4 (162, 171, 234, 246), landing 4 (75, 81, 89, 104), notices 1 (91), project-route 21, providers 3 (70, 117, 207), e2e mock-openai 3 (379, 436, 460). At main, 27 have no timeout; after the change, 0.

## 5. Downstream agreement

None. The unit's front matter has `blocked_by: []`, `parallel_with: []` and `unblocks: []` (unit lines 7 to 9). `units/README.md` line 126 says SHL-22 "blocks nothing". `modules/shell.md` line 15 says "It blocks nothing". No other unit file names SHL-22 (`git grep`). The four spec files belong to units that are all done: `project-route.spec.ts` to SHL-08 (first commit c864e58), `api-client.spec.ts` to SHL-02 (8d558a4), `connection-status.spec.ts` to SHL-06 (6b2e8fc), and `providers-client-timeout-abort.test.ts` to MPR-04 (0a327f7). The change touches only the wait and timeout arguments, so none of them depends on it.

## 6. Other draft or planned plans that change the same files

Checked by reading the front matter of every `plans/*.md` (status) and the "Files" section of each draft or planned plan. The only planned plan is `plans/AGL-05.md` (front matter `status: planned`). Its file list (lines 61 to 66) names `apps/api/src/modules/agent-loop/transcript-reader.ts`, `transcript-run-state.ts`, `agent-runs.service.ts`, `agent-runs.controller.ts`, `apps/api/test/agent-loop-transcript.kit.ts` and `apps/api/test/agent-loop-current.test.ts`. None of them is one of the four files of section 2. `plans/AGL-05.md` names none of the four spec files and none of their `vi.waitFor` calls. No other plan is in draft or planned status.

Merge order: this plan changes no file that AGL-05 changes, so SHL-22 is correct whether it merges before or after AGL-05. AGL-05's own step 3 checks were held by the landing flake, which 1f1e234 fixed. That is on `main` (checked in section 8), so AGL-05 needs no change from this plan. If AGL-05 merges first, step 9 of this plan runs on the rebased branch (section 3).

## 7. Open points

1. **Unit line 25 calls the connection-status waits "a macrotask chain".** The code has no macrotask on that path. `checkReachable` (`apps/web/src/app/shell/sse-client.ts` lines 163 to 168) awaits `probe` (lines 221 to 226, a `fetch` with a catch). The `onopen` handler (line 99) calls `handleOpen`, which sets the state and reachability signals and ticks only on a reopen. The only `setTimeout` in the file is at line 175, inside `scheduleRecovery` (lines 170 to 179), which the test at line 138 never reaches, because `readyState` 0 does not schedule a recovery. So the only timer in the two waits is `vi.waitFor`'s 50 ms interval, and these two calls are unlikely to time out under load. The plan keeps the change, because criterion 1 lists them and the unit's Decisions and Scope name the file. No decision is needed for this plan: the wording is in the "What the wait covers" column of the Why table, it changes no step or test, and dropping the two calls would break criterion 1. The reviser did not change the unit (the wording is not in the way). The orchestrator may note the wording.
2. **Contingency for a failing green run (step 11).** The planner's default is to stop and report. A decision is needed only if a run fails: (a) raise the listed waits to 10000 ms and the test timeouts with them (this changes unit line 39), or (b) report the failure and keep 5000 ms. Nothing is decided now.
3. **Full-run timeouts outside the table (DECISIONS line 4246).** The TRG-04 review saw timeouts in `sample-chat.spec.ts` and `setup-page.spec.ts` C1b in a full web run. Neither is in the table: `sample-chat.spec.ts` has no `vi.waitFor` (section 4 count), and the `setup-page.spec.ts` wait (helper at lines 127 to 133) carries 5000 ms. So the 1000 ms default is not the cause, and the cause is not checked here. The cause may be the 5000 ms default of untimed tests (unverified). The question for the orchestrator is whether any unit covers the untimed tests of the wider web suite. The planner's default is no change in this unit (unit lines 44 to 46).
4. **connection-status lines 234 and 246 keep 3000 and 4000 ms.** They already carry explicit timeouts from the SHL-06 plan (DECISIONS line 1223) and are not in the unit's table (unit line 29). Raising them to 5000 ms would be consistency with 1f1e234, and it is a choice. The planner's default is no change.

Open points: 4.

## 8. Facts checked

Unit and module files (read at f81ae12):

- `units/SHL-22-load-sensitive-spec-waits.md`: front matter lines 1 to 10 (`phase: none` line 5, `blocked_by: []` line 7, `parallel_with: []` line 8, `unblocks: []` line 9). Line 14 (ungated, test-only). Lines 16 to 17 (Why and REPORTED load result). Lines 21 to 26 (table; rows at 23, 24, 25, 26). Lines 28 to 33 (checked, not on the list). Line 35 (REPORTED, not a red test, 12 loops on 6 cores). Lines 37 to 41 (Decisions). Lines 43 to 46 (Scope). Lines 48 to 52 (criteria; the four criteria are lines 49 to 52).
- The unit file has no revision or change note. `git log --oneline -- units/SHL-22-load-sensitive-spec-waits.md` lists one commit, 44e34fb (the add). `plans/DECISIONS.md` has no entry that changes the unit (section 1). So there is nothing to apply from a change note.
- `modules/shell.md`: line 13 (SHL-21 ungated), line 15 (SHL-22 ungated, test-only, "It blocks nothing"), lines 90 to 92 (Testing principles: external behaviour only; seam is rendered routes with Angular's Vitest runner).
- `units/README.md` line 86 (SHL-22 row, "nothing waits for it") and line 126 ("which blocks nothing").
- `plans/QUEUE.md` line 3 at f81ae12: `SHL-22 | M1 | available: yes | off M1 demo path; no open blockers`.
- `plans/PLT-02.md` (structure followed: front matter, decisions, files, method, criteria, downstream, open points), lines 1 to 4 and sections 1 to 6.
- `plans/AGL-05.md` (planned): front matter; file list at lines 61 to 66.

Decisions log (`plans/DECISIONS.md`):

- Line 1223 (inside the entry headed at line 1217, "SHL-06 — Opus plan review of revision 1"): the 3000 and 4000 ms values of the SHL-06 checks.
- Line 4246 (inside the entry headed at line 4238, "TRG-04 — Sonnet code review (three parts)"): the timeouts seen in a full web run.
- Lines 4391 and 4435 (2026-11-15 corrections after commit 1f1e234): the cause, the fix, the values, "no assertion changed", and the subagent results.
- Line 4443 (the AGL-05 review): SHL-22 additions judged acceptable.

Code at f81ae12 (line numbers from `git grep -n` and `sed -n`):

- `landing.spec.ts`: lines 46 to 50 (comment), 51 (`const LOAD_WAIT = { timeout: 5000 };`), 75, 81, 89, 104 (waits), 90 (`}, 20000);`), 111 (`LOAD_WAIT` on the E1 wait), 113 (`}, 10000);`). The 1f1e234 diff touches only this file (16 insertions, 6 deletions) and changes no assertion.
- `project-route.spec.ts`: line 9 (`vi` imported), line 16 (end of the import block), line 18 (`const projectList`). The 21 `vi.waitFor` calls at the lines listed in section 2. Tests: `it` at lines 79, 116, 132, 155, 178, 202, 231, closing at 114, 130, 153, 176, 200, 229, 246; `it.each` at 248, closing at 281. The `await harness.fixture.whenStable()` calls (lines 85 and 163) are not `vi.waitFor` calls and are not changed.
- `api-client.spec.ts`: line 19 (`vi` imported), line 75 (`provideRouter([{ path: 'setup', children: [] }])`, a non-lazy route), line 172 (T7 `it`), line 182 (the wait), line 187 (close). `api-client.ts` line 105 (`void this.router.navigateByUrl('/setup')`, a bare promise).
- `connection-status.spec.ts`: line 10 (`vi` imported), line 114 (`settleMacrotask`, a `setTimeout` of 0), line 138 (test `it`), lines 162 and 171 (waits), line 179 (close), line 219 (the other test with waits), lines 234 and 246 (waits with `timeout: 3000` and `timeout: 4000`), line 258 (`}, 10000);`).
- `apps/api/test/providers-client-timeout-abort.test.ts`: lines 1 to 9 (`vi` imported), lines 49 to 50 (`sleepFor`), line 54, 94, 189 (the three tests with waits), lines 70, 117, 207 (waits), line 138 (`await sleepFor(800)`).
- `apps/api/test/providers-client.kit.ts` line 7 (imports `@bbartolome/scriba-contracts/providers`). `packages/contracts/package.json` lines 10 to 13 (exports point at `./dist/...`).
- `apps/web/src/app/shell/sse-client.ts`: lines 99 (`source.onopen`), 163 to 168 (`checkReachable`), 170 to 179 (`scheduleRecovery`, the only `setTimeout` at line 175), 221 to 226 (`probe`). `setTimeout` appears only at line 175 and `clearTimeout` only at line 238.
- `apps/web/src/app/shell/active-project-guard.ts` line 13 (`async` guard) and line 21 (`api.get(...)` read, through `firstValueFrom`).
- `apps/web/src/app/app.routes.ts`: lines 20 (`chat` lazy), 33 (`files` lazy), 48 (landing lazy), 54 (switch page lazy), 72 (core gate lazy), 84 (setup lazy).
- Other existing waits: `core-gate.spec.ts` line 49 (`timeout: 5000`), `setup-page.spec.ts` lines 132, 218, 507 (5000), `settings-page.spec.ts` lines 152, 249, 263, 280 (5000), `notices.spec.ts` line 93 (`timeout: 1000`), `e2e/fixtures/mock-openai/test/mock-openai.test.ts` lines 385 (`timeout: 2000`), 444 (15000) and 464 (5000), for the calls at lines 379, 436 and 460. Calls: `core-gate` 1, `settings-page` 4, `setup-page` 3, `notices` 1, `mock-openai` 3.
- Call totals: `vi.waitFor(` occurs 45 times in `apps/web/src`, `apps/api/test` and `e2e` (`grep -rho`). At main 27 have no timeout; 18 have one. The unit's table lines match (checked line by line).
- `apps/api/vitest.config.mts` line 8 (`include: ['test/**/*.test.ts']`), line 9 (`testTimeout: 20000`).
- `apps/web/angular.json` lines 12 to 13 (`"root": ""`, `"sourceRoot": "src"`) and lines 75 to 77 (`"test": { "builder": "@angular/build:unit-test" }`, no options). A grep of `apps/web/angular.json`, `apps/web/package.json`, `apps/web/tsconfig*.json` and the root `package.json` finds no `testTimeout` or `hookTimeout`.
- `apps/web/package.json` line 8 (`"test": "ng test --watch=false"`). `apps/web/tsconfig.spec.json` line 8 (`include` of `src/**/*.spec.ts`).
- Root `package.json` line 12 (`engines` `>=26 <27`), line 14 (`packageManager` `npm@11.20.0`), line 25 (`"test": "npm test --workspaces && node --test 'scripts/*.test.mjs'"`), line 26 (lint, including `prettier --check .`), workspaces lines 4 to 10.
- `apps/api/package.json` line 7 (`"test": "npm run build && vitest run"`). `e2e/package.json` line 8 (`"test": "vitest run"`). `packages/packs/package.json` line 7 (`"test": "vitest run"`). `packages/contracts/package.json` line 49 (`"test": "npm run build && vitest run"`).
- `e2e` has no vitest config. Its Playwright specs are `e2e/specs/*.e2e.ts`, which the default vitest include does not match.
- Front matter status of every `plans/*.md`: `planned` only for AGL-05; the other plans are `done`. `plans/DECISIONS.md` and `plans/QUEUE.md` have no status.
- Owners of the four spec files by first commit: `c864e58` (`test(SHL-08)`), `8d558a4` (`feat(SHL-02)`), `6b2e8fc` (`feat(SHL-06)`), `0a327f7` (`feat(MPR-04)`).

Packages and installed tools (read from `node_modules`, not run):

- `node_modules/vitest/package.json` line 4: version 5.1.0.
- `node_modules/vitest/dist/chunks/index.Di8au7q4.js` line 9193: `resolved.testTimeout ??= ... 5e3` (5000 ms outside browser mode). `hookTimeout` 10000 (line 9194).
- `node_modules/vitest/dist/index.d.ts` lines 406 to 414: `WaitForOptions`. The default `timeout` is 1000 ms (line 414) and the default `interval` is 50 ms (line 409).
- `node_modules/vitest/dist/chunks/defaults.B1FCaFfh.js` line 5: default `include` `**/*.{test,spec}.?(c|m)[jt]s?(x)`.
- `node_modules/@angular/build/src/builders/unit-test/schema.json` line 45 (`include` default `**/*.spec.ts`, `**/*.test.ts`, relative to the project source root). `options.js` line 51 (`workspaceRoot` from `context.workspaceRoot`) and line 92 (`include`). `test-discovery.js` lines 42 to 60 (`findTests`, the project root prefix), lines 217 to 227 (`normalizePattern`: a workspace-relative prefix such as `src/` is removed), lines 244 to 262 (`resolveStaticPattern`, a static file path resolves against the source root).
- `node_modules/@angular/build/src/builders/unit-test` contains no `testTimeout` or `hookTimeout`. The only timeout in its `runners/` is the 10000 ms teardown at `runners/vitest/executor.js` line 194.
- `node_modules/typescript/package.json`: version 6.0.3.

Git (at check time, `main` at f81ae12):

- `git log -1 --format=%h main` is f81ae12 ("docs(AGL-05): record the review approval"). Since 20c9020, c37c3e6 changed `plans/QUEUE.md` only, and f81ae12 changed `plans/DECISIONS.md` only, appended after line 4450 (so the cited lines up to 4443 hold).
- `1f1e234` (`fix(SHL-08)`), `44e34fb` (`docs(SHL-22)`) and 20c9020 are ancestors of `main`.
- `git diff --stat 1f1e234 HEAD` over the four spec files, `landing.spec.ts`, `notices.spec.ts`, `app.routes.ts`, `apps/web/angular.json`, `apps/api/vitest.config.mts`, `sse-client.ts`, `api-client.ts`, `active-project-guard.ts`, `providers-client.kit.ts` and `providers-client.ts` (`apps/api/src/modules/providers/client.ts`) prints nothing: unchanged since 1f1e234. Over the whole repository since 1f1e234, only `modules/shell.md` (2 lines) and the new unit file changed, both in 44e34fb.
- `git status --short` on main at check time: empty.
- Reviser (revision 2, main at aae2d78): the `vi.waitFor` lines and test boundaries of section 2 and table 2.3 re-read and unchanged; 45 `vi.waitFor(` calls in scope; no unit has SHL-22 in `blocked_by`; `unit/AGL-05` (b499928) changes six files, none of them one of the four spec files or a runner config, and adds no `vi.waitFor`; vitest 5.1.0 `EachFunctionReturn` and `TestCollectorCallable` accept a number as the third argument (`node_modules/vitest/dist/chunks/config.d.B3YV4t0O.d.ts` lines 2687 and 2712).
- `git worktree list`: the main worktree and `/Users/bbartolome/workspace/scriba-prototype-wt/AGL-05` (branch `unit/AGL-05`).

Environment (the planner's sandbox):

- `nproc` prints 6. This is the planner's own machine and need not be the implementer's (A4).

## 9. Facts assumed

- **A1.** `ng test`, run by `npm test -w @bbartolome/scriba-web` from `apps/web`, finds `angular.json` in `apps/web`, so `workspaceRoot` is `apps/web`. Then `--include=src/app/...` is the form that `normalizePattern` strips to a source-relative path. Checked by reading the code (section 8), not run. Step 6 confirms it.
- **A2.** `npm test -w <workspace> -- <args>` passes the arguments to the script (`ng test --watch=false <args>`). Standard npm behaviour; not run.
- **A3.** The Angular runner's effective test timeout is vitest's default 5000 ms, because nothing in `@angular/build` sets one (section 8). The planner did not observe the value at run time.
- **A4.** The implementer's machine has a core count N that `nproc` (or `sysctl -n hw.ncpu`) reports. The load is 3N processes on that machine, so it is comparable with the planner's 18 on 6 cores only in ratio.
- **A5.** The margin of 5000 ms (D8) covers the untimed work of each test (`RouterTestingHarness.create`, the render, `whenStable()`), which the waits do not cover. This follows the 1f1e234 values; it is not measured.
- **A6.** The results REPORTED in DECISIONS lines 4391 and 4435 (C1 failed 4 of 6 before the fix and passed 6 of 6 after; apps/web 325 of 325) are as the subagent reported. The planner did not re-run them.
- **A7.** The REPORTED 12-loop check of unit line 35 (every test passed) is as reported. The planner did not re-run it.
- **A8.** The e2e mock-openai test runs under root `npm test` through `e2e`'s `vitest run`, because the default include matches `*.test.ts` (section 8). Not run.
- **A9.** `main` does not move during the run. If it does, step 9 rebases the branch and reruns the checks (section 3).
- **A10.** The `typescript` used by the AST script is the root's 6.0.3 (section 8), and the script runs from the worktree root, so `./node_modules/typescript` resolves there.

## 10. Unit change notes

None. The unit file has no change note, and `plans/DECISIONS.md` has no entry that changes SHL-22 (section 1 and section 8). The unit was added in 44e34fb and has not changed since.

## 11. Review parts

One part, because the plan changes four spec files with one kind of edit and all four criteria are checked on the same branch.

- **Part 1. The explicit wait timeouts and their checks.** Steps 0 to 14 of section 3 (setup and baseline, red load run, edits, format, quick run, static checks, spec type check, full suite, lint, green load run, commit, fresh clone, record) and the stop rules. Tests: section 4 rows 1, 2, 3 and 4 (criteria 1 to 4).
