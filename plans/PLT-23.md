---
id: PLT-23
title: Full-suite e2e failures: leftover library state from earlier specs
status: draft
---
# PLT-23 plan — full-suite e2e failures (journey "project from sample", TRG-05 C2)

Draft by the planner (Haiku, effort xhigh). Not revised by Opus. Checked against main at 5c2c93e (the e2e files are the same as at 1badb76). The two failures were recorded on main at cc82fb0 (`plans/DECISIONS.md`, 2026-11-19, "Step 13 failures verified on main cc82fb0"). Nothing was run here: the causes come from the logs of that run and from reading the code.

## 1. Decisions this plan follows

- **Fix the isolation, not the assertion.** Every `expect(...)`, every test title, every `test.use`, every timeout and the retry setting stay as they are. The fix is in the setup and teardown of the specs that leave state behind. Source: unit "Decisions" (lines 25 to 27) and "Acceptance criteria" 4 (line 37); `prompt.md` line 189 (no weaker test to get a pass).
- **Find the cause first and record it before any change.** Done in section 2 from the logs and the code. The implementer confirms it with runs T1 and T2 (section 6) before it edits anything. Source: unit line 25 and criterion 1 (line 34).
- **The producer removes what it leaves.** The fix goes to the spec that writes the state, and that spec removes it in `test.afterAll`. The repository already does this: `e2e/specs/tools-live-preview.e2e.ts` lines 104 to 106 remove the probe it writes. Source: that file. Not chosen: a precondition in `journey.e2e.ts` that deletes the other projects before its check. It would pass, but it hides the leftovers and it does not cover the user tools that TRG-05 C2 needs. It is the fallback in open point 1.
- **Scope.** Only `e2e/specs/` changes. `e2e/harness/global-setup.ts` and `e2e/playwright.config.ts` do not need a change for the causes found. Not in scope: GRR-15's code, the checks of the two tests, and other flakes. Source: unit lines 30 to 31.
- **The user's decision of 2026-11-19, option (b).** Fix the two full-suite failures on main first, as a separate unit, and then rerun GRR-15 step 13. Source: `plans/DECISIONS.md`, entry "2026-11-19 — GRR-15 — user decision on step 13: option (b), fix the two full-suite failures on main first" (line 6758). The entry at line 6764 repeats it for the orchestrator.
- **Keep the viewport of tools-preview at 3200 px.** GNP-14 choice C12 set it (commit 6e0071a on main). GNP-15 and GNP-16 depend on its margin for their new rows. Source: `e2e/specs/tools-preview.e2e.ts` line 23; `plans/GNP-15.md` lines 80 and 372 and `plans/GNP-16.md` line 84. GNP-15 line 89 cites the DECISIONS entry at line 6587 and GNP-16 line 84 cites `plans/GNP-14.md` line 51; neither was read here.
- **Keep the file names and the run order.** `journey.e2e.ts` runs before the specs that need a fresh start. `verdicts-sample.e2e.ts` is named so that it sorts after every other spec and needs journey first (its header, lines 6 to 8; `plans/AGL-19.md`, D-ORDER). No file is renamed.
- **The journey steps and their owner comments are fixed.** `plans/PLT-13.md` criterion C3b and the owner-comment rule. This plan does not change `journey.e2e.ts`.
- **Tests exercise external behaviour.** `modules/platform.md`, "Testing principles" (line 57). The change touches only the setup and teardown of specs, not any private function.
- **Pipeline rules for this stage.** Change only `plans/PLT-23.md`. Do not commit. Do not run the whole suite. Source: `prompt.md` "Draft" section (lines 84 to 94) and the task.

## 2. The cause of each failure

### 2.1 journey "project from sample" (`e2e/specs/journey.e2e.ts`, failing line 204 at cc82fb0 and on main)

- The failing assertion is `expect(entries).toEqual(['demo-book'])` at `journey.e2e.ts` line 204. `entries` is the list of the non-dot names in `SCRIBA_E2E_LIBRARY` (lines 201 to 203). The library is one temporary folder for the whole run (`e2e/harness/global-setup.ts` lines 23 to 25; removed at teardown, line 139).
- The received list on the cc82fb0 run has six extra folders: `canvas-chips`, `canvas-connect`, `canvas-move`, `canvas-wires-accepted`, `canvas-wires-refused`, `phone-history`. Source: `/tmp/verify-main-full.log` lines 227 to 251 (the orchestrator's run; also recorded in DECISIONS line 6328).
- The writers run before journey. Playwright ran the files in alphabetical order (the log lines 198 to 204 show `graph-canvas`, `graph-chips`, `graph-wires`, `history-phone`, then `journey`):
  - `e2e/specs/graph-canvas.e2e.ts`: `openCanvas` (lines 35 to 48) makes `<library>/<project>` with `mkdir` (line 43) and writes the graph. Projects `canvas-move` (line 113) and `canvas-connect` (line 142).
  - `e2e/specs/graph-chips.e2e.ts`: `PROJECT = 'canvas-chips'` (line 11); the folder and its files are written at lines 57 to 77.
  - `e2e/specs/graph-wires.e2e.ts`: `openCanvas` (lines 54 to 67); projects `canvas-wires-refused` (line 135) and `canvas-wires-accepted` (line 168).
  - `e2e/specs/history-phone.e2e.ts`: writes `phone-history` (lines 31 to 45). Test at line 17.
- None of the four files removes its folders. No `afterAll`, `afterEach` or `rm` in them (grep). Journey alone passes (`/tmp/verify-main-journey.log`, "1 passed"; DECISIONS line 6328, run 2), because the library then holds only `demo-book`.
- Consequence for the run: the library folders are a state, not a bug in the product. The API behaves as the specs use it (assumed, see section 3).

### 2.2 TRG-05 C2 (`e2e/specs/tools-preview.e2e.ts`, "the picker offers person entities only and takes a dropped person chip")

- The failing assertion is `await expect(personPicker).toHaveValue('ada')`. At cc82fb0 it is line 211 (`/tmp/verify-main-full.log` lines 256 to 281). On main it is line 213, because commit 6e0071a added two comment lines above. The received value is `""`, and the call log shows the select resolved 14 times, each with an empty value. The two `toEqual` checks before it (`optionValues`, lines 190 and 191 on main) passed, so the picker holds `ada` and `bob`. The drag started (the preview is visible), and the drop did not reach the picker.
- The earlier writer is `e2e/specs/tools-editor.e2e.ts`. Its E1 test saves the user tools `my_tool` (line 146) and `cold_open_2` (line 179) through the API, into `<library>/.scriba/packs/user/tools/` (helper `userToolFile`, lines 63 to 72). Its `setUp` also copies `cold_open.yaml` there (line 30). Nothing removes them; the file has no `afterAll`.
- `e2e/specs/tools-live-preview.e2e.ts` removes only its own probe `live_probe` (lines 104 to 106). The run order is `tools-editor`, `tools-live-preview`, `tools-preview`. So when tools-preview runs, the user pack holds two files more than it did when tools-preview ran alone.
- Those two files are two extra rows in the `/tools` list above the form. The registry re-scans the user pack on each catalogue call (`apps/api/src/modules/tool-registry/catalog.service.ts` lines 176 to 180; the scan marks in `packs.ts` lines 72 to 79). This is assumed to be the path to the `/tools` page (section 3, A3).
- The viewport at cc82fb0 was 2100 px. The diff of 6e0071a removes `height: 2100` from line 23, and no other commit changed that line in between. With the form two rows lower, the picker centre is expected to be below y = 2100 (assumption A4), so the drop in `tools-preview.e2e.ts` (lines 209 to 211 on main) would fall outside the viewport. The same mechanism is recorded for GNP-14 (DECISIONS line 6545): two new catalogue rows and a group header moved the person select to y = 2290 in a 2100 px viewport. That diagnosis was the implementer's and was not verified by the orchestrator.
- The spec's own comment (lines 20 to 22 on main, added by 6e0071a) names this leftover: "the user tools that tools-editor.e2e.ts leaves in the shared library".
- Alone, the test passes (`/tmp/verify-main-tools.log`, "2 passed"; DECISIONS line 6328, run 3).
- **Open:** on main the viewport is now 3200 px (6e0071a). C2 may already pass in the full run. The full run of step 1b, before any change, decides this. The cause is the same either way, so the fix below is applied in both cases. The picker's y in the full run is not measured yet (test T2).

## 3. Facts checked and assumed

### Checked (file and line)

- Unit `units/PLT-23-full-suite-e2e-failures.md`: context lines 14 and 17 to 22; decisions 25 to 27; scope 30 to 31; criteria 34 to 38. Front matter: `blocked_by: []`, `unblocks: []`, `phase: none`.
- `prompt.md`: "Draft" section lines 84 to 94; line 189 (weaker criteria are not allowed).
- `plans/DECISIONS.md`: line 6328 (verification entry with runs 1 to 3); line 6545 (GNP-14 implementer's diagnosis of the picker at y = 2290); line 6758 (user decision, option (b)); line 6764 (the instruction after PLT-23). The file was not read in full.
- `/tmp/verify-main-full.log`: test order at lines 198 to 224; journey failure at lines 227 to 251 (received list and line 204); C2 failure at lines 256 to 281 (line 211 at cc82fb0, `toHaveValue`).
- `e2e/specs/journey.e2e.ts`: test at line 12; step "project from sample" at line 113; `entries` at lines 201 to 204; Mock providers created at lines 216 to 232 and 303 to 323.
- `e2e/specs/graph-canvas.e2e.ts`: imports at lines 1 to 3 (`mkdir, readFile, writeFile`; `join`; `expect, test, type Page`); `openCanvas` lines 35 to 48; Switch at line 57; tests at lines 110 and 139; projects at lines 113 and 142.
- `e2e/specs/graph-chips.e2e.ts`: imports at lines 1 to 3; `PROJECT` line 11; writes lines 57 to 77; Switch line 86; test at line 176.
- `e2e/specs/graph-wires.e2e.ts`: imports at lines 1 to 3; `openCanvas` lines 54 to 67; Switch line 76; projects at lines 135 and 168; tests at lines 132 and 165.
- `e2e/specs/history-phone.e2e.ts`: imports at lines 1 to 3 (`mkdir, readFile, writeFile`; `join` used at lines 26 and 31; `expect, test, type Locator`); test at line 17; writes lines 31 to 45; Switch at line 64.
- `e2e/specs/tools-editor.e2e.ts`: fs import at line 1 (`copyFile, mkdir, readFile, writeFile`); `join` at line 2; `setUp` copy at line 30; `userToolFile` lines 63 to 72; E1 test at line 114 with `my_tool` at line 146 and `cold_open_2` at line 179; E2 test at line 184 reads `cold_open` at line 222. No `afterAll`.
- `e2e/specs/tools-live-preview.e2e.ts`: fs import at line 1 (includes `rm`); `PROJECT = 'tools-live'` line 16; `PROBE` line 17; `probeFile` lines 25 to 28; `afterAll` lines 104 to 106.
- `e2e/specs/tools-preview.e2e.ts` on main: comment lines 20 to 22; `test.use` viewport 3200 at line 23; C2 test at line 169; drag at lines 209 to 211; `toHaveValue('ada')` at line 213.
- `e2e/specs/tools-try.e2e.ts`: copies its own `cold_open.yaml` at line 41 before it uses it (line 121).
- `e2e/specs/providers-phone.e2e.ts`: reads the app default at line 39 and restores it at lines 117 to 121. No count of providers is asserted (grep).
- `e2e/specs/verdicts-sample.e2e.ts`: header lines 6 to 8 (sorts after every other spec; journey first).
- `e2e/harness/global-setup.ts`: port 8080 at line 15; library by `mkdtemp` and `SCRIBA_E2E_LIBRARY` at lines 23 to 25; removed in `stop` at line 139.
- `e2e/playwright.config.ts`: `globalSetup` line 12; `workers: 1` line 13; no `retries` setting in the file.
- `apps/api/src/modules/tool-registry/catalog.service.ts` lines 176 to 180 (`refresh` re-scans the user pack and reports removed names). `packs.ts` lines 72 to 79 (scan result; "removed by this scan").
- `apps/api/src/modules/providers/providers.controller.ts` line 106 (`PROVIDER_DELETE_ROUTE`, used only as a contingency, open point 4).
- Git: `git diff --stat 1badb76 5c2c93e -- e2e apps packages` is empty. Between cc82fb0 and main the e2e changes are 6e0071a (tools-preview viewport 2100 to 3200, net +2 lines) and 4e7fba6 (mock fixtures for the GNP-14 packs). No branch `unit/PLT-23` exists yet.
- Other plans that name the files of this plan: section 7.

### Assumed

- A1: Playwright runs the files in alphabetical order with one worker (observed in the logs at cc82fb0, lines 198 to 224; the same config is on main).
- A2: `test.afterAll` runs after the tests of its file even when a test fails.
- A3: The `/tools` list is built from the user pack on each request, so the two extra files are rows in the list (the catalogue's `refresh` is called on each list). Not checked in the route code.
- A4: The picker lies below y = 2100 in the full run. Not measured; test T2 measures it.
- A5: No product defect is involved. Both failures are state left by specs. This is the conclusion of section 2, not a checked fact.
- A6: Journey's later steps (agent run, accept change) pass in the full run after the fix. They passed alone (`/tmp/verify-main-journey.log`) but never ran in the full run, because the run stopped at line 204.
- A7: Removing the project folders does not break the next spec, because each of the four specs activates its own project (Switch) and the active-project pointer is checked in the full run (open point 3).
- A8: The environment is as in the verify run: Node v26.13.0, npm 11.20.0, `npm ci` run in the worktree.

## 4. Files to change

Only these paths change. Nothing else in the repository changes.

| Path | Change | Purpose |
|---|---|---|
| `e2e/specs/graph-canvas.e2e.ts` | add `rm` to the fs import (line 1); add `test.afterAll` that removes `canvas-move` and `canvas-connect` from the library | journey cause (2.1) |
| `e2e/specs/graph-chips.e2e.ts` | add `rm` to the fs import (line 1); `test.afterAll` removes `PROJECT` (`canvas-chips`) | journey cause (2.1) |
| `e2e/specs/graph-wires.e2e.ts` | add `rm` to the fs import (line 1); `test.afterAll` removes `canvas-wires-refused` and `canvas-wires-accepted` | journey cause (2.1) |
| `e2e/specs/history-phone.e2e.ts` | add `rm` to the fs import (line 1); `test.afterAll` removes `phone-history` | journey cause (2.1) |
| `e2e/specs/tools-editor.e2e.ts` | add `rm` to the fs import (line 1); `test.afterAll` removes the user-pack files `my_tool.yaml`, `cold_open_2.yaml` and `cold_open.yaml` through `userToolFile` | TRG-05 C2 cause (2.2) |
| `e2e/specs/tools-preview.e2e.ts` | comment lines 20 to 22 only, same number of lines | the comment must stop naming the leftover (section 4 text below) |

Code shape for the four graph and history specs (the project names differ per file; `join` is already imported in each):

```ts
// Removes the folders this file seeds from the shared library, which journey.e2e.ts checks.
test.afterAll(async () => {
  for (const project of ['canvas-move', 'canvas-connect']) {
    await rm(join(process.env.SCRIBA_E2E_LIBRARY!, project), { recursive: true, force: true });
  }
});
```

Code shape for `tools-editor.e2e.ts` (`userToolFile` is at lines 63 to 72; a function declaration, so it can be used above its definition):

```ts
test.afterAll(async () => {
  for (const name of ['my_tool', 'cold_open_2', 'cold_open']) {
    await rm(userToolFile(name), { force: true });
  }
});
```

Text for `tools-preview.e2e.ts` lines 20 to 22 (three lines, as now; line 23 is unchanged):

```ts
// The person picker sits below the tools list and the chips, so a tall viewport keeps the chip and the picker on
// screen for the drag. The list grows with each built-in tool, so the height leaves room for them. The user tools that
// tools-editor.e2e.ts saves are removed after that file, so they add no rows here.
```

Not changed, on purpose:

- `e2e/specs/journey.e2e.ts`: the assertion and its input stay as they are.
- `e2e/specs/tools-try.e2e.ts` (line 41) also leaves a `cold_open.yaml` in the user pack. No failing test depends on it, and only specs after it run. The rule of this plan would apply if a later failure shows it (open point 6).
- `e2e/playwright.config.ts` and `e2e/harness/global-setup.ts`: no change needed for the causes found.

## 5. Procedure

Run every e2e command with `env -u SCRIBA_E2E_MEASURE` and with `-w @bbartolome/scriba-e2e`. The first attempt of the verify run without `-w` ran no tests (DECISIONS line 6328). Run one e2e command at a time: the API holds port 8080.

0. **Worktree and branch.** `git worktree add /Users/bbartolome/workspace/scriba-prototype-wt/PLT-23 -b unit/PLT-23 main` (the branch does not exist yet). In the worktree: `npm ci`, then `node -v` (expected `v26.x`). Port 8080 must be free (`global-setup.ts` line 20 checks it; the port is set at line 15).
1. **Confirm the journey cause (T1).** On the branch, before any change, run `npm run e2e -w @bbartolome/scriba-e2e -- specs/graph-canvas.e2e.ts specs/graph-chips.e2e.ts specs/graph-wires.e2e.ts specs/history-phone.e2e.ts specs/journey.e2e.ts --trace off`. Expected: journey fails at `journey.e2e.ts:204` with exactly the six extra names of section 2.1. Record the output in the report.
   1b. **Full suite before any change.** The command of step 5 on the unchanged branch. Record which tests fail. Expected: journey fails at line 204; TRG-05 C2 fails or passes (section 2.2, open point 2). This is the only full run before the change.
2. **Confirm the C2 mechanism (T2).** Make a temporary, uncommitted edit to `tools-preview.e2e.ts` (viewport `height: 2100`; a `console.log` of `await personPicker.boundingBox()` and of `target` just before `page.mouse.move(target.x, target.y, ...)`). Run (a) `specs/tools-preview.e2e.ts` alone and (b) `specs/tools-editor.e2e.ts specs/tools-preview.e2e.ts`. Expected: in (a) the target y is inside the viewport (0 to 2100) and the test passes; in (b) the target y is below 2100 and the test fails at the `toHaveValue('ada')` line. Then undo the temporary edit by hand, so that `git diff -- e2e/specs/tools-preview.e2e.ts` is empty. If (a) fails, or (b) passes with the target inside the viewport, stop and send PLAN DOES NOT WORK (the cause in section 2.2 is wrong).
3. **Make the changes** in section 4, as written. Nothing else. Do not change the plan.
4. **Lint.** `npm run lint` exits 0 (Prettier and ESLint over the changed files).
5. **Full suite (T3).** `env -u SCRIBA_E2E_MEASURE npm run e2e -w @bbartolome/scriba-e2e -- --trace off`. Expected: exit 0, "24 passed", no failures. The list shows `journey` and `TRG-05 C2` with a check mark. If the total is different, record the list.
6. **Each spec alone (T5, T6).** `... -- specs/journey.e2e.ts --trace off` exit 0 with 1 passed; `... -- specs/tools-preview.e2e.ts --trace off` exit 0 with 2 passed.
7. **Diff audit and root gates (T7, T8).** Run the audit of section 6. Then `npm test` at the root (exit 0) and `npm run build` (exit 0).
8. **Commit.** Only the six paths of section 4, by path: `git commit -m "feat(PLT-23): remove the library folders and user tools that the e2e specs leave behind" -- <six paths>`. The commit has the unit id. Do not commit the plan or the unit file.
9. **Fresh checkout (T4).** `git clone --branch unit/PLT-23 /Users/bbartolome/workspace/scriba-prototype /tmp/plt23-fresh` (a new, empty target), in it `npm ci`, then the command of step 5. Expected: exit 0. The clone is a check, not a result to keep: its output goes into the report.
10. **Report** to the orchestrator as COMPLETE: the criteria that passed; the output of T1, T2, T3 to T8 (the run lists and exit codes); each difference from the plan (none expected). If the journey "app loads" step or any later spec fails because of the active project or the providers (open points 3 and 4), report PLAN DOES NOT WORK with the test name and the output.

## 6. Acceptance criteria and tests

The unit has five criteria (unit lines 34 to 38). Each has a test. No criterion is marked passed by this plan.

| Criterion (unit line) | Test | Command | Pass condition |
|---|---|---|---|
| 1. Cause of each failure named with evidence (34) | T1 and T2 (steps 1 and 2), and section 2 of this plan | the commands of steps 1 and 2 | T1: journey fails at `journey.e2e.ts:204` with exactly `canvas-chips, canvas-connect, canvas-move, canvas-wires-accepted, canvas-wires-refused, phone-history` as the extra names. T2 (a): tools-preview alone, target y < 2100, passes. T2 (b): tools-editor then tools-preview, target y > 2100, fails at the `toHaveValue` line. If a result differs, PLAN DOES NOT WORK. |
| 2. In the full run, both tests pass (35) | T3 | step 5 command | exit 0; "24 passed"; the list shows journey "project from sample" and "TRG-05 C2" with a check mark |
| 3. Full run exits 0 on a fresh checkout; each spec alone passes (36) | T4, T5, T6 | steps 9, 6 | T4: exit 0 on the clone with `npm ci`. T5: `journey.e2e.ts` alone, exit 0, 1 passed. T6: `tools-preview.e2e.ts` alone, exit 0, 2 passed |
| 4. No test weakened, skipped, given a longer timeout, or retried (37) | T7 | `git diff main...unit/PLT-23 -- e2e \| grep -E '^[+-]' \| grep -E 'expect\(\|test\(\|test\.(skip\|fixme\|only)\|timeout\|retries'` | The grep prints nothing. The name list is exactly the six paths of section 4. `git diff main...unit/PLT-23 --stat -- e2e/playwright.config.ts e2e/harness` prints nothing |
| 5. Root `npm test` exits 0 (38) | T8 | `npm test` at the root (step 7) | exit 0. If it fails, record the failing test and stop; a rerun is recorded as a rerun |

The unit's test seam is `npm run e2e -w @bbartolome/scriba-e2e -- --trace off`. The commands above add a file filter to it for T1, T5 and T6. The runs need Chromium: `SCRIBA_E2E_CHROMIUM` if set, otherwise the cached build (`playwright.config.ts` lines 22 to 24).

## 7. Overlap with other draft and planned plans

Plans that name the same files, found by search in `plans/` and `units/`. Done plans are not listed, because their changes are on main and are the base of this plan.

- **GRR-15 (`plans/GRR-15.md`, planned; branch `unit/GRR-15`, worktree `scriba-prototype-wt/GRR-15`).** Changes no existing spec. Its file list has three new specs: `e2e/specs/graph-touch.e2e.ts`, `graph-theme.e2e.ts` and `graph-large.e2e.ts`. Each seeds its own library project (plan line 190), and the plan has no removal step (a grep for `afterAll` finds none): `touch-canvas-1` to `touch-canvas-5`, `theme-canvas-1` to `theme-canvas-3` and `canvas-large`. These names sort between `graph-chips` and `graph-wires`, so they run before journey and break its `entries` check, exactly as the four specs of section 2.1 do.
  - Change that GRR-15 must make, in either order of merge: the same `test.afterAll` removal of its projects in its three new specs. PLT-23 does not change them (they are not on main, and GRR-15 is in the pipeline). Without it, GRR-15 step 13 fails again on journey.
  - The GRR-15 plan's statement that "the order of the specs does not matter" (line 27) is true for their own tests but not for journey's library check. It is open point 1.
- **GNP-15 (`plans/GNP-15.md`, draft) and GNP-16 (`plans/GNP-16.md`, planned).** Each adds one fiction row to the `/tools` list and relies on the 3200 px margin of tools-preview (GNP-15 lines 80 and 372; GNP-16 lines 84, 368 and 371). GNP-15 settles that no e2e file changes in its unit.
  - Change of this plan: `tools-preview.e2e.ts` keeps line 23 and the 3200 px value. Lines 20 to 22 keep their number and change only their text. The two plans' line references stay correct.
  - Change of this plan to the tools list: the two leftover user rows of tools-editor are gone from the full run. The margin of GNP-15 and GNP-16 is then larger. Either merge order is correct: if PLT-23 lands first, the new rows land on a shorter list; if GNP-15 or GNP-16 lands first, the 3200 px value still holds, because this plan does not change it.
  - `tools-editor.e2e.ts` is not in any draft or planned plan. Its change is new in this plan.
- **Plans that name the same specs and are done** (GNP-14, TRG-05, TRG-14, TRG-15, TRG-16, PST-21, PLT-13, AGL-19): their changes are on main. This plan keeps their settled values: the viewport of GNP-14 (line 23), the step names of PLT-13, the sort order of AGL-19 (verdicts-sample), and the afterAll of TRG-15 (tools-live-preview).

## 8. Downstream agreement

- **GRR-15 (step 13 is the consumer).** Agreed: step 13 is rerun on `unit/GRR-15` after PLT-23 is on main. For that run to pass, GRR-15's three new specs must also remove their projects (section 7). This is a change for GRR-15's own rework, which the orchestrator must give to its implementer. It is not a change of this plan. The orchestrator decides (open point 1).
- **GNP-15 and GNP-16.** Agreed: the 3200 px value and the line numbers of lines 20 to 23 are unchanged (section 7).
- **PLT-13 (done).** Agreed: journey's five step names, their order and their owner comments are unchanged. The journey test is unchanged.
- **AGL-19 (done).** Agreed: no file is renamed, so `verdicts-sample` still sorts last and still runs after journey.
- **The contract of the harness** (`e2e/harness/global-setup.ts`): unchanged. The library is still one temporary folder for the run, and specs now remove what they leave.

## 9. Open points

1. **GRR-15's new specs (decision for the orchestrator).** They leave `touch-canvas-1..5`, `theme-canvas-1..3` and `canvas-large` in the shared library before journey runs. After GRR-15 merges, journey fails again unless those specs remove their projects. Two ways: (a) GRR-15's rework adds the same `afterAll` (recommended; it is the producer's fix, the same as this plan); (b) journey's precondition: a `test.beforeAll` in `journey.e2e.ts` that removes the non-dot folders of the library before its check (passes whatever runs before it, but it is a change to journey and it hides the leftovers). This plan takes (a). The orchestrator must make sure that the GRR-15 rework includes it, or step 13 fails.
2. **TRG-05 C2 on current main.** Unknown until step 1b. The viewport of 3200 px may already make C2 pass in the full run. The tools-editor fix is applied either way, because it is the cause and it gives margin to GNP-15 and GNP-16. The viewport is not reduced back to 2100 in this unit: GNP-15 and GNP-16 depend on it. Reducing it is a later choice for the Navigator, after their merge.
3. **The active project after the cleanups.** The four graph and history specs activate their own project (Switch: `graph-canvas.e2e.ts` line 57, `graph-chips.e2e.ts` line 86, `graph-wires.e2e.ts` line 76, `history-phone.e2e.ts` line 64). After its folder is removed, the API's active project can name a missing folder until the next Switch. Journey's first step ("app loads", lines 18 to 20 and 27 to 31) expects no page error. Check: step 5 shows whether journey passes. Contingency, if it does not: each affected spec restores the active project it found at its start (a `page.request` POST to `/api/project-store/active`, as `providers-phone.e2e.ts` lines 117 to 121 restore the app default). That is a change to the four specs, and the plan is revised first.
4. **Journey's later steps in the full run.** They have never run in the full suite. The agent-run and accept-change steps leave two providers (`Mock`, `Mock edit`, journey lines 216 to 232 and 303 to 323) and the app default `Mock edit`. Later specs that read or set the default (`providers-phone` restores its prior value, lines 117 to 121; `tools-try` and `verdicts-sample` set their own, `tools-try` at line 95 and `verdicts-sample` at line 126) are expected to be unaffected, and step 5 checks it. Contingency, if one of them fails: journey deletes its two providers at its end (`providers.controller.ts` line 106) and restores the default it found. That change is to `journey.e2e.ts`, and the plan is revised first.
5. **Playwright file order (A1) and `afterAll` on failure (A2).** Both are assumed. If the order differs, the list of writers in section 2 is still the same, but the claim "before journey" needs a check. If `afterAll` does not run after a failed test, the cleanup would miss the folders of a failing spec; step 5 would show it as a leftover.
6. **Other producers of user-pack files.** `tools-try.e2e.ts` (line 41) also leaves `cold_open.yaml` in the user pack, and `tools-live-preview` leaves its tools project `tools-live` (line 16). Neither breaks a test today. They are not changed by this unit, because they are not in the failures. If they cause a failure later, the same rule applies.
7. **The rule for future specs.** A spec that writes a project folder into the shared library, or a file into the user pack, removes it in `test.afterAll`. This plan states the rule; it is not a settled decision of a module file. The Navigator may add it to the platform module, if a later unit needs it.
