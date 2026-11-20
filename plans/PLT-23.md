---
id: PLT-23
title: Full-suite e2e failures: leftover library state from earlier specs
status: planned
---
# PLT-23 plan — full-suite e2e failures (journey "project from sample", TRG-05 C2)

Draft by the planner (Haiku, effort xhigh). Revised by Opus on 2026-11-19 against main at 145d35b (the e2e and api files are the same as at 5c2c93e). The two failures were recorded on main at cc82fb0 (`plans/DECISIONS.md`, 2026-11-19, "Step 13 failures verified on main cc82fb0"). Nothing was run at the plan stages: the causes come from the logs of that run and from reading the code. The implementer confirms them (T1, T2) before any change.

Revision notes (Opus): T2 now runs on a detached worktree at cc82fb0, where the failure was seen, because on main the tools list has two more built-in rows (4e7fba6, GNP-14) and the 2100 px check of the draft would fail even alone; A3 is now checked; open point 3 has the switch-hook facts and a contingency that the API allows (there is no clear-active operation); the T7 file-list command and the T8 rerun rule are explicit; section 10 "Review parts" is added. No unit file changed.

Revision notes (Opus, 2026-11-19, after PLAN DOES NOT WORK at step 1b): section 2.3 records the cause of the three 390 px phone failures (a product regression at 6deb543, CEX-17's tenth phone nav item; the overflow is the bottom nav of SHL-05), with the runs. Step 1b answered open point 2 for main (C2 passes). Open point 8 is for the Navigator; the procedure, the tests and section 10 are unchanged until it is decided. No unit file changed.

Revision notes (2026-11-20, after the Navigator decision "2026-11-20 — PLT-23 — Navigator decision (session 5d7b216e60e341d5a9c0cd4f836c8083)", commit d8cbd30): open point 1 is settled as option (a) (each seeding spec removes what it leaves in `test.afterAll`; no `beforeAll` in `journey.e2e.ts`; GRR-15's rework adds the same afterAll to its three new specs); the tools-preview viewport is 6000 px, as main has it since aee3cd4 (GNP-22), not 3200 px, at lines 23, 49, 50, 53, 84, 96, step 2, section 7, section 8 and open point 2 (reason: GNP-22 A7, `plans/GNP-22.md` line 105). Section 4, the steps, the tests and section 10 are unchanged. No unit file changed.

Revision notes (Opus, 2026-11-19, after the Navigator decision on open point 8): open point 8 is settled (the fix is the new Shell unit SHL-23, `apps/web/src/app/shell/app-nav.ts` only; PLT-23 is blocked by it); section 2.3 "Where the fix goes" names SHL-23; step 0 checks that SHL-23 is done on main before the worktree is made; step 1b and step 5 state the expected results with SHL-23 on main and on a branch before it; section 3 records the new `blocked_by`; section 8 has the merge-order line for SHL-23. "24 passed" checked: 17 spec files in `e2e/specs/`, 24 tests. Section 4 and the criteria are unchanged.

## 1. Decisions this plan follows

- **Fix the isolation, not the assertion.** Every `expect(...)`, every test title, every `test.use`, every timeout and the retry setting stay as they are. The fix is in the setup and teardown of the specs that leave state behind. Source: unit "Decisions" (lines 25 to 27) and "Acceptance criteria" 4 (line 37); `prompt.md` line 189 (no weaker test to get a pass).
- **Find the cause first and record it before any change.** Done in section 2 from the logs and the code. The implementer confirms it with runs T1 and T2 (section 6) before it edits anything. Source: unit line 25 and criterion 1 (line 34).
- **The producer removes what it leaves.** The fix goes to the spec that writes the state, and that spec removes it in `test.afterAll`. The repository already does this: `e2e/specs/tools-live-preview.e2e.ts` lines 104 to 106 remove the probe it writes. Source: that file. Not chosen: a precondition in `journey.e2e.ts` that deletes the other projects before its check. It would pass, but it hides the leftovers and it does not cover the user tools that TRG-05 C2 needs. It is the fallback in open point 1.
- **Scope.** Only `e2e/specs/` changes. `e2e/harness/global-setup.ts` and `e2e/playwright.config.ts` do not need a change for the causes found. Not in scope: GRR-15's code, the checks of the two tests, and other flakes. Source: unit lines 30 to 31.
- **The user's decision of 2026-11-19, option (b).** Fix the two full-suite failures on main first, as a separate unit, and then rerun GRR-15 step 13. Source: `plans/DECISIONS.md`, entry "2026-11-19 — GRR-15 — user decision on step 13: option (b), fix the two full-suite failures on main first" (line 6758). The entry at line 6764 repeats it for the orchestrator.
- **Keep the viewport of tools-preview at 6000 px.** GNP-14 choice C12 raised it to 3200 px (commit 6e0071a), and GNP-22 raised it to 6000 px (commit aee3cd4, on main since 6939e66), because GNP-22 A7 measured the person picker at y 3767.4 in the 3200 px viewport with its nine new rows (`plans/GNP-22.md` line 105); 3200 px cannot pass TRG-05 C2 on main. GNP-15 and GNP-16 depend on its margin for their new rows. Source: `e2e/specs/tools-preview.e2e.ts` line 23; `plans/DECISIONS.md`, entry "2026-11-20 — PLT-23 — Navigator decision (session 5d7b216e60e341d5a9c0cd4f836c8083)"; `plans/GNP-15.md` lines 80 and 372 and `plans/GNP-16.md` line 84 (written for 3200 px; the larger value keeps their margin).
- **Keep the file names and the run order.** `journey.e2e.ts` runs before the specs that need a fresh start. `verdicts-sample.e2e.ts` is named so that it sorts after every other spec and needs journey first (its header, lines 6 to 8; `plans/AGL-19.md`, D-ORDER). No file is renamed.
- **The journey steps and their owner comments are fixed.** `plans/PLT-13.md` criterion C3b and the owner-comment rule. This plan does not change `journey.e2e.ts`.
- **Tests exercise external behaviour.** `modules/platform.md`, "Testing principles" (line 57). The change touches only the setup and teardown of specs, not any private function.
- **Pipeline rules for the code stage.** The implementer changes only the six paths of section 4, commits them by path with the unit id, and does not change the plan or the unit file. One e2e command at a time: the API holds port 8080. Source: `prompt.md` "Implement" section and this plan.

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
- The viewport at cc82fb0 was 2100 px (`git show cc82fb0:e2e/specs/tools-preview.e2e.ts`, line 21). The diff of 6e0071a replaces it with 3200 px (line 23), and no other commit changed that line in between; later aee3cd4 (GNP-22) raised it to 6000 px, the value on main. With the form two rows lower, the picker centre is expected to be below y = 2100 (assumption A4), so the drop at cc82fb0 (`const target` at line 207, `page.mouse.move(target...)` at line 208, `toHaveValue('ada')` at line 211) would fall outside the viewport. The same mechanism is recorded for GNP-14 (DECISIONS line 6545): two new catalogue rows and a group header moved the person select to y = 2290 in a 2100 px viewport. That diagnosis was the implementer's and was not verified by the orchestrator.
- Main differs from cc82fb0 for this test: 4e7fba6 (GNP-14) added the built-in rows `character_builder` and `world_builder` with a group header, and 6e0071a raised the viewport to 3200 px; since then GNP-16, GNP-17, GNP-21 and GNP-22 added rows and aee3cd4 (GNP-22) raised the viewport to 6000 px (GNP-22 A7: picker at y 3767.4 in 3200 px). So on main a 2100 px viewport fails even alone (DECISIONS line 6545), and the cause of the recorded failure can only be shown at cc82fb0. T2 therefore runs in a detached worktree at cc82fb0 (step 2).
- The spec's own comment (lines 20 to 22 on main, added by 6e0071a) names this leftover: "the user tools that tools-editor.e2e.ts leaves in the shared library".
- Alone, the test passes (`/tmp/verify-main-tools.log`, "2 passed"; DECISIONS line 6328, run 3).
- **Open:** on main the viewport is now 6000 px (aee3cd4, GNP-22; it was 3200 px at 6e0071a). C2 may already pass in the full run. The full run of step 1b, before any change, decides this. The cause is the same either way, so the fix below is applied in both cases. The picker's y in the full run is not measured yet (test T2).
- **Step 1b result (2026-11-19, implementer, c52b2b4):** C2 passes in the full run on main (`/tmp/plt23-1b-full-before.log`, test 20 not in the failed list). Open point 2 is answered for main.

### 2.3 The three 390 px phone specs (found at step 1b; not an order or state cause; a product regression)

- Failing on main in the full run (`/tmp/plt23-1b-full-before.log`) and alone: `history-phone.e2e.ts:17` at line 88, `review-phone.e2e.ts:47` at line 193, `search-phone.e2e.ts:17` at line 80. Each is the check `document.documentElement.scrollWidth <= window.innerWidth`, received false.
- Not order or state: each fails alone on main (reviser run, the three files only, exit 1, 3 failed; `/tmp/plt23-hp-alone.log` for history-phone alone). At cc82fb0 the same three files pass (exit 0, 3 passed), and in the cc82fb0 full run they passed (`/tmp/verify-main-full.log`, only journey and C2 failed).
- The regression is 6deb543 `feat(CEX-17): manuscript route entry and contract copies`. At 6deb543^ (84e25db) the three files pass (exit 0, 3 passed); at 6deb543 they fail at the same three lines (exit 1, 3 failed). The lockfile is the same at both commits. The commit adds to `apps/web/src/app/app.routes.ts` (on main lines 63 to 75, `path: 'manuscript'` at line 64) a project route `manuscript` with `minDeviceClass: 'phone'` and `nav: { label: 'Manuscript', icon: 'article', order: 32 }`. It is the tenth item of the phone bottom nav.
- The overflow is the bottom nav itself. Measured at 6deb543 at 390 px in history-phone: document `scrollWidth` 431, the `nav[aria-label="Bottom navigation"]` `scrollWidth` 431, the ten links 32, 50, 45, 32, 63 (Manuscript), 43, 35, 54, 47, 32 px. Without Manuscript the sum is 368 px, which fits. The nav is `apps/web/src/app/shell/app-nav.ts` (SHL-05, done): `nav.bottom a { flex: 1 1 0; }` (lines 132 to 136) with the default `min-width: auto`, so each link keeps the width of its label and the row cannot shrink below 431 px.
- Check: on main 25578b3, with only `minDeviceClass: 'tablet'` for the Manuscript entry (a temporary edit in a scratch worktree, reverted), the three files pass (exit 0, 3 passed). Without the edit they fail (exit 1, 3 failed). No other element overflows.
- The module route table (`modules/shell.md`, "Route table") settles `/projects/:projectId/manuscript` as min class `phone`, nav `yes`, and `/core-gate` as phone and nav `yes`. So ten phone nav items are settled, and the bottom nav of SHL-05 does not fit them at 390 px.
- Where the fix goes: the new Shell unit SHL-23 (`units/SHL-23-phone-bottom-nav-fit.md`), in `apps/web/src/app/shell/app-nav.ts` only (`min-width: 0` on `nav.bottom a` and label truncation, so the ten items fit at 390 px). It is not in this unit: PLT-23's scope stays the specs in `e2e/specs/` (unit "Scope"), and this plan's section 4 does not change. The route data of CEX-17 and the module route table are not changed. Source: `plans/DECISIONS.md`, entry "2026-11-19 — PLT-23 — Navigator decision (session 0d1c12bad0f542fa9e19f3ae9457cc46)" (open point 8). PLT-23 is blocked by SHL-23; until SHL-23 is on main, the full run (criterion 3, and GRR-15 step 13) cannot exit 0.

## 3. Facts checked and assumed

### Checked (file and line)

- Unit `units/PLT-23-full-suite-e2e-failures.md`: context lines 14 and 17 to 22; decisions 25 to 27; scope 30 to 31; criteria 34 to 38. Front matter: `blocked_by: [SHL-23]` (since 3ca880e, the Navigator decision), `unblocks: []`, `phase: none`.
- `units/SHL-23-phone-bottom-nav-fit.md`: front matter `blocked_by: [SHL-05]`, `unblocks: [PLT-23]`. `plans/SHL-23.md` does not exist on main at 2e317e6 (`git show main:plans/SHL-23.md` fails).
- `apps/web/src/app/shell/app-nav.ts` lines 132 to 136: `nav.bottom a { flex: 1 1 0; flex-direction: column; font-size: 12px; }`, no `min-width`.
- `e2e/specs/`: 17 spec files (`ls e2e/specs/*.e2e.ts | wc -l`) with 24 tests (`grep -hE '^\s*test\(' e2e/specs/*.e2e.ts | wc -l`; no `test.describe`, `test.skip`, `test.fixme` or `test.only`). The step 1b run on c52b2b4 agrees: 4 failed, 20 passed (`/tmp/plt23-1b-full-before.log` lines 317 and 322).
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
- `e2e/specs/tools-preview.e2e.ts` on main: comment lines 20 to 22; `test.use` viewport 6000 at line 23 (aee3cd4, GNP-22); C2 test at line 169; drag at lines 209 to 211; `toHaveValue('ada')` at line 213.
- `e2e/specs/tools-try.e2e.ts`: copies its own `cold_open.yaml` at line 41 before it uses it (line 121).
- `e2e/specs/providers-phone.e2e.ts`: reads the app default at line 39 and restores it at lines 117 to 121. No count of providers is asserted (grep).
- `e2e/specs/verdicts-sample.e2e.ts`: header lines 6 to 8 (sorts after every other spec; journey first).
- `e2e/harness/global-setup.ts`: port 8080 at line 15; `assertPortFree` at line 21; library by `mkdtemp` and `SCRIBA_E2E_LIBRARY` at lines 23 to 25; removed in `stop` at line 139.
- `apps/api/src/modules/tool-registry/catalog.service.ts` line 189 to 190: `list()` calls `refresh()` first; `tools.controller.ts` lines 66 to 69 serve the list from it. So each `/tools` list re-scans the user pack (was assumption A3).
- The project-switch hooks tolerate a `from` project whose folder is gone: `project-watcher.service.ts` lines 43 to 48 (errors ignored), `search.service.ts` lines 56 to 66 (uses only `to`; errors ignored), `agent-loop/agent-runs.service.ts` line 224 and `graph-runner/runs.service.ts` lines 399 to 403 (end only a run of `from`). `active-project.service.ts` lines 63 to 89: the switch writes the new id after the hooks. `active-project.controller.ts` has only GET and POST: there is no operation that clears the active project (DECISIONS, SHL-15, 2026-11-16).
- `git show cc82fb0:e2e/specs/tools-preview.e2e.ts`: viewport 2100 at line 21; C2 at line 167; `const target` line 207; `toHaveValue('ada')` line 211. `git log cc82fb0..main -- e2e`: only 6e0071a and 4e7fba6.
- `/tmp/verify-main-full.log` lines 197 to 224: the 24 tests in file order; journey is test 7, after `graph-canvas`, `graph-chips`, `graph-wires`, `history-phone`; `tools-editor` (15, 16), `tools-live-preview` (17, 18), then `tools-preview` (19, 20).
- `e2e/playwright.config.ts`: `globalSetup` line 12; `workers: 1` line 13; no `retries` setting in the file.
- `apps/api/src/modules/tool-registry/catalog.service.ts` lines 176 to 180 (`refresh` re-scans the user pack and reports removed names). `packs.ts` lines 72 to 79 (scan result; "removed by this scan").
- `apps/api/src/modules/providers/providers.controller.ts` line 106 (`PROVIDER_DELETE_ROUTE`, used only as a contingency, open point 4).
- Git: `git diff --stat 1badb76 5c2c93e -- e2e apps packages` is empty. Between cc82fb0 and main the e2e changes are 6e0071a (tools-preview viewport 2100 to 3200, net +2 lines) and 4e7fba6 (mock fixtures for the GNP-14 packs). Since then aee3cd4 (GNP-22) changed line 23 to 6000 px and the comment lines 20 to 22 keep their number. No branch `unit/PLT-23` exists yet.
- Other plans that name the files of this plan: section 7.

### Assumed

- A1: Playwright runs the files in alphabetical order with one worker (observed in the logs at cc82fb0, lines 198 to 224; the same config is on main).
- A2: `test.afterAll` runs after the tests of its file even when a test fails.
- A3: (checked since the draft; see above.)
- A4: At cc82fb0, after tools-editor, the picker lies below y = 2100. Not measured; test T2 measures it.
- A5: No product defect is involved. Both failures are state left by specs. This is the conclusion of section 2, not a checked fact.
- A6: Journey's later steps (agent run, accept change) pass in the full run after the fix. They passed alone (`/tmp/verify-main-journey.log`) but never ran in the full run, because the run stopped at line 204.
- A7: Removing the project folders does not break the next spec. Each of the four specs activates its own project (Switch). After the last one, the active id names a removed folder until journey's "Start from sample" switches to `demo-book`; the switch hooks tolerate that (checked above), and the page load is checked by the full run (open point 3).
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

Each `test.afterAll` goes after the helper functions and before the first `test(...)`, as in `tools-live-preview.e2e.ts` line 104. Code shape for the four graph and history specs (the project names differ per file; `join` is already imported in each):

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

0. **SHL-23 on main, then worktree and branch.** First, in the main working tree: `git show main:plans/SHL-23.md | grep -n '^status:'`. It must print `status: done`. If the file does not exist on main, or the status is not `done`, the unit is not available (it is blocked by SHL-23): the implementer does not start, makes no worktree and no branch, and reports BLOCKED by SHL-23 to the orchestrator. Then, only if SHL-23 is done: `git worktree add /Users/bbartolome/workspace/scriba-prototype-wt/PLT-23 -b unit/PLT-23 main` (the branch does not exist yet). In the worktree: `npm ci`, then `node -v` (expected `v26.x`). Port 8080 must be free (`global-setup.ts` line 21 checks it; the port is set at line 15).
1. **Confirm the journey cause (T1).** On the branch, before any change, run `npm run e2e -w @bbartolome/scriba-e2e -- specs/graph-canvas.e2e.ts specs/graph-chips.e2e.ts specs/graph-wires.e2e.ts specs/history-phone.e2e.ts specs/journey.e2e.ts --trace off`. Expected: journey fails at `journey.e2e.ts:204` with exactly the six extra names of section 2.1. Record the output in the report.
   1b. **Full suite before any change.** The command of step 5 on the unchanged branch. Record which tests fail. Expected, with SHL-23 on main (step 0): exit 1, 1 failed, 23 passed; the only failure is journey at `journey.e2e.ts:204` (the journey cause, section 2.1). TRG-05 C2 passes (section 2.2, step 1b result of c52b2b4). On a branch made before SHL-23 (as the c52b2b4 run was), the three phone specs `history-phone.e2e.ts:17`, `review-phone.e2e.ts:47` and `search-phone.e2e.ts:17` also fail at the `scrollWidth` check (section 2.3): 4 failed, 20 passed. That is expected there and is not a PLAN DOES NOT WORK, but step 0 does not allow such a branch. With SHL-23 on main, a phone spec that fails, or any failure other than journey line 204, is reported as PLAN DOES NOT WORK with the output. This is the only full run before the change.
2. **Confirm the C2 cause where it failed (T2), at cc82fb0.** Not on the branch: on main the list has the rows of GNP-14 and later units and a 6000 px viewport (section 2.2; aee3cd4, GNP-22 A7). Make a new detached worktree: `git worktree add --detach /Users/bbartolome/workspace/scriba-prototype-wt/PLT-23-cc82fb0 cc82fb0`, and in it `npm ci`. Do not use the kept worktree `verify-main-cc82fb0`. In the new worktree only, make a temporary edit to `e2e/specs/tools-preview.e2e.ts`: one `console.log('C2 target', JSON.stringify(target))` line just after `const target = await centerOf(personPicker);` (line 207). Nothing else. Run, one at a time, from the new worktree:
   - (a) `npm run e2e -w @bbartolome/scriba-e2e -- specs/tools-preview.e2e.ts --trace off`. Expected: exit 0, 2 passed, the logged target y below 2100.
   - (b) `npm run e2e -w @bbartolome/scriba-e2e -- specs/tools-editor.e2e.ts specs/tools-preview.e2e.ts --trace off`. Expected: C2 fails at `tools-preview.e2e.ts:211` (`toHaveValue`), the logged target y at or above 2100.
   - (c) Add, temporarily and in the new worktree only, the `tools-editor.e2e.ts` change of section 4 (the `rm` import and the `afterAll`), then run the command of (b) again. Expected: exit 0, 4 passed, the logged target y equal to (a).
   Record the three outputs. Then `git -C /Users/bbartolome/workspace/scriba-prototype-wt/PLT-23-cc82fb0 checkout -- e2e/specs` to drop the temporary edits; the worktree is detached and nothing is committed in it. Leave the worktree in place for the orchestrator. If (a) fails, (b) passes, or (c) fails, stop and send PLAN DOES NOT WORK with the outputs (the cause in section 2.2 is wrong).
3. **Make the changes** in section 4, as written. Nothing else. Do not change the plan.
4. **Lint.** `npm run lint` exits 0 (Prettier and ESLint over the changed files).
5. **Full suite (T3).** `env -u SCRIBA_E2E_MEASURE npm run e2e -w @bbartolome/scriba-e2e -- --trace off`. Expected: exit 0, "24 passed", no failures. The list shows `journey` and `TRG-05 C2` with a check mark, and the three phone specs of section 2.3 pass (SHL-23 is on main). 24 is the number of tests in the 17 files of `e2e/specs/` on main at 2e317e6 (section 3); before the run, check it with `grep -hE '^\s*test\(' e2e/specs/*.e2e.ts | wc -l` in the worktree. If the total is different, record the list and the count.
6. **Each spec alone (T5, T6).** `... -- specs/journey.e2e.ts --trace off` exit 0 with 1 passed; `... -- specs/tools-preview.e2e.ts --trace off` exit 0 with 2 passed.
7. **Root gates (T8).** `npm test` at the root (exit 0) and `npm run build` (exit 0). `npm test` is known to time out under load in `apps/web` `canvas-page.spec.ts` (DECISIONS lines 6547 and 6571), a file this unit does not touch: if the only failures are in files this unit does not change, run it once more and record both runs; T8 passes only on a run with exit 0. A failure in a changed file, or a second failing run, is reported.
8. **Commit.** Only the six paths of section 4, by path: `git commit -m "feat(PLT-23): remove the library folders and user tools that the e2e specs leave behind" -- <six paths>`. The commit has the unit id. Do not commit the plan or the unit file. Then run the audit T7 (section 6) on the commit.
9. **Fresh checkout (T4).** `git clone --branch unit/PLT-23 /Users/bbartolome/workspace/scriba-prototype /tmp/plt23-fresh` (a new, empty target), in it `npm ci`, then the command of step 5. Expected: exit 0. The clone is a check, not a result to keep: its output goes into the report.
10. **Report** to the orchestrator as COMPLETE: the criteria that passed; the output of T1, T2, T3 to T8 (the run lists and exit codes); each difference from the plan (none expected). If the journey "app loads" step or any later spec fails because of the active project or the providers (open points 3 and 4), report PLAN DOES NOT WORK with the test name and the output.

## 6. Acceptance criteria and tests

The unit has five criteria (unit lines 34 to 38). Each has a test. No criterion is marked passed by this plan.

| Criterion (unit line) | Test | Command | Pass condition |
|---|---|---|---|
| 1. Cause of each failure named with evidence (34) | T1 and T2 (steps 1 and 2), and section 2 of this plan | the commands of steps 1 and 2 | T1: journey fails at `journey.e2e.ts:204` with exactly `canvas-chips, canvas-connect, canvas-move, canvas-wires-accepted, canvas-wires-refused, phone-history` as the extra names. T2, at cc82fb0 (step 2): (a) tools-preview alone passes, target y < 2100; (b) tools-editor then tools-preview: C2 fails at `tools-preview.e2e.ts:211`, target y at or above 2100; (c) the same with the tools-editor `afterAll` added: 4 passed, target y equal to (a). If a result differs, PLAN DOES NOT WORK. |
| 2. In the full run, both tests pass (35) | T3 | step 5 command | exit 0; "24 passed"; the list shows journey "project from sample" and "TRG-05 C2" with a check mark |
| 3. Full run exits 0 on a fresh checkout; each spec alone passes (36) | T4, T5, T6 | steps 9, 6 | T4: exit 0 on the clone with `npm ci`. T5: `journey.e2e.ts` alone, exit 0, 1 passed. T6: `tools-preview.e2e.ts` alone, exit 0, 2 passed |
| 4. No test weakened, skipped, given a longer timeout, or retried (37) | T7 | `git diff main...unit/PLT-23 -- e2e \| grep -E '^[+-]' \| grep -E 'expect\(\|test\(\|test\.(skip\|fixme\|only)\|timeout\|retries'` | The grep prints nothing. `git diff --name-only main...unit/PLT-23` prints exactly the six paths of section 4. `git diff main...unit/PLT-23 --stat -- e2e/playwright.config.ts e2e/harness` prints nothing |
| 5. Root `npm test` exits 0 (38) | T8 | `npm test` at the root (step 7) | exit 0 on a recorded run; the rerun rule of step 7 |

The unit's test seam is `npm run e2e -w @bbartolome/scriba-e2e -- --trace off`. The commands above add a file filter to it for T1, T5 and T6. The runs need Chromium: `SCRIBA_E2E_CHROMIUM` if set, otherwise the cached build (`playwright.config.ts` lines 22 to 24).

## 7. Overlap with other draft and planned plans

Plans that name the same files, found by search in `plans/` and `units/`. Done plans are not listed, because their changes are on main and are the base of this plan.

- **GRR-15 (`plans/GRR-15.md`, planned; branch `unit/GRR-15`, worktree `scriba-prototype-wt/GRR-15`).** Changes no existing spec. Its file list has three new specs: `e2e/specs/graph-touch.e2e.ts`, `graph-theme.e2e.ts` and `graph-large.e2e.ts`. Each seeds its own library project (plan line 190), and the plan has no removal step (a grep for `afterAll` finds none): `touch-canvas-1` to `touch-canvas-5`, `theme-canvas-1` to `theme-canvas-3` and `canvas-large`. These names sort between `graph-chips` and `graph-wires`, so they run before journey and break its `entries` check, exactly as the four specs of section 2.1 do.
  - Change that GRR-15 must make, in either order of merge: the same `test.afterAll` removal of its projects in its three new specs. PLT-23 does not change them (they are not on main, and GRR-15 is in the pipeline). Without it, GRR-15 step 13 fails again on journey.
  - The GRR-15 plan's statement that "the order of the specs does not matter" (line 27) is true for their own tests but not for journey's library check. It is open point 1.
- **GNP-15 (`plans/GNP-15.md`, draft) and GNP-16 (`plans/GNP-16.md`, planned).** Each adds one fiction row to the `/tools` list and relies on the margin of the tools-preview viewport, written for 3200 px and now 6000 px on main (aee3cd4, GNP-22 A7) (GNP-15 lines 80 and 372; GNP-16 lines 84, 368 and 371). GNP-15 settles that no e2e file changes in its unit.
  - Change of this plan: `tools-preview.e2e.ts` keeps line 23 and the 6000 px value that main has (aee3cd4; GNP-22 A7, `plans/GNP-22.md` line 105). Lines 20 to 22 keep their number and change only their text. The two plans' line references stay correct.
  - Change of this plan to the tools list: the two leftover user rows of tools-editor are gone from the full run. The margin of GNP-15 and GNP-16 is then larger. Either merge order is correct: if PLT-23 lands first, the new rows land on a shorter list; if GNP-15 or GNP-16 lands first, the 6000 px value still holds, because this plan does not change it.
  - `tools-editor.e2e.ts` is not in any draft or planned plan. Its change is new in this plan.
- **Plans that name the same specs and are done** (GNP-14, TRG-05, TRG-14, TRG-15, TRG-16, PST-21, PLT-13, AGL-19): their changes are on main. This plan keeps their settled values: the viewport of GNP-14 (line 23), the step names of PLT-13, the sort order of AGL-19 (verdicts-sample), and the afterAll of TRG-15 (tools-live-preview).

## 8. Downstream agreement

- **GRR-15 (step 13 is the consumer).** Agreed: step 13 is rerun on `unit/GRR-15` after PLT-23 is on main. For that run to pass, GRR-15's three new specs must also remove their projects (section 7). This is a change for GRR-15's own rework, which the orchestrator must give to its implementer. It is not a change of this plan. The orchestrator decides (open point 1).
- **GNP-15 and GNP-16.** Agreed: the 6000 px value (main since aee3cd4; GNP-22 A7) and the line numbers of lines 20 to 23 are unchanged (section 7).
- **PLT-13 (done).** Agreed: journey's five step names, their order and their owner comments are unchanged. The journey test is unchanged.
- **AGL-19 (done).** Agreed: no file is renamed, so `verdicts-sample` still sorts last and still runs after journey.
- **SHL-23 (blocks this unit).** SHL-23 changes `apps/web/src/app/shell/app-nav.ts` only, and PLT-23 changes `e2e/specs` only, so the two do not conflict in either merge order. Step 0 still requires SHL-23 on main first, for the full run of criterion 3.
- **The contract of the harness** (`e2e/harness/global-setup.ts`): unchanged. The library is still one temporary folder for the run, and specs now remove what they leave.

## 9. Open points

1. **GRR-15's new specs. Settled: option (a).** Decision (Navigator, agreed by the orchestrator): each seeding spec removes what it leaves in `test.afterAll`; no `beforeAll` in `journey.e2e.ts`. GRR-15's rework adds the same afterAll to its three new specs on `unit/GRR-15`: `graph-large.e2e.ts` (removes `canvas-large`), `graph-theme.e2e.ts` (removes `theme-canvas-1..3`) and `graph-touch.e2e.ts` (removes `touch-canvas-1..5`); `plans/GRR-15.md` is not edited now (it is held), and GRR-15 step 13 exits 0 only after both PLT-23's and GRR-15's afterAlls are on main. Section 4 is unchanged. Source: `plans/DECISIONS.md`, entry "2026-11-20 — PLT-23 — Navigator decision (session 5d7b216e60e341d5a9c0cd4f836c8083)" (commit d8cbd30). The analysis before the decision: They leave `touch-canvas-1..5`, `theme-canvas-1..3` and `canvas-large` in the shared library before journey runs. After GRR-15 merges, journey fails again unless those specs remove their projects. Two ways: (a) GRR-15's rework adds the same `afterAll` (recommended; it is the producer's fix, the same as this plan); (b) journey's precondition: a `test.beforeAll` in `journey.e2e.ts` that removes the non-dot folders of the library before its check (passes whatever runs before it, but it is a change to journey and it hides the leftovers). This plan takes (a). The orchestrator must make sure that the GRR-15 rework includes it, or step 13 fails. Checked on `unit/GRR-15` (ec6293d): `git diff --stat main...unit/GRR-15 -- e2e` lists only the three new specs, so GRR-15 changes none of the files of this plan, and no merge conflict follows in either order. GRR-15 is held by the user; this plan does not change its files.
2. **TRG-05 C2 on current main.** Unknown until step 1b. The cause is shown at cc82fb0 by T2, not on main (section 2.2). The viewport of 6000 px on main (aee3cd4, GNP-22 A7) may already make C2 pass in the full run. The tools-editor fix is applied either way, because it is the cause and it gives margin to GNP-15 and GNP-16. The viewport is not reduced back to 2100 in this unit: GNP-15 and GNP-16 depend on it. Reducing it is a later choice for the Navigator, after their merge.
3. **The active project after the cleanups.** The four graph and history specs activate their own project (Switch: `graph-canvas.e2e.ts` line 57, `graph-chips.e2e.ts` line 86, `graph-wires.e2e.ts` line 76, `history-phone.e2e.ts` line 64). After its folder is removed, the API's active project can name a missing folder until the next Switch. Journey's first step ("app loads", lines 18 to 20 and 27 to 31) expects no page error. The switch hooks tolerate a removed `from` folder (section 3, checked), and journey's "Start from sample" switches to `demo-book`. Check: step 5 shows whether journey passes. Contingency, if it does not: report PLAN DOES NOT WORK with the output. Restoring the active project a spec found is not possible for `graph-canvas`, the first spec, because none is active then and the API has no clear-active operation (`active-project.controller.ts`, GET and POST only); the reviser then corrects the plan from the output.
4. **Journey's later steps in the full run.** They have never run in the full suite. The agent-run and accept-change steps leave two providers (`Mock`, `Mock edit`, journey lines 216 to 232 and 303 to 323) and the app default `Mock edit`. Later specs that read or set the default (`providers-phone` restores its prior value, lines 117 to 121; `tools-try` and `verdicts-sample` create their own provider, `tools-try` at line 95 and `verdicts-sample` at line 126) are expected to be unaffected, and step 5 checks it. Contingency, if one of them fails: journey deletes its two providers at its end (`providers.controller.ts` line 106) and restores the default it found. That change is to `journey.e2e.ts`, and the plan is revised first.
5. **Playwright file order (A1) and `afterAll` on failure (A2).** Both are assumed. If the order differs, the list of writers in section 2 is still the same, but the claim "before journey" needs a check. If `afterAll` does not run after a failed test, the cleanup would miss the folders of a failing spec; step 5 would show it as a leftover.
6. **Other producers of user-pack files.** `tools-try.e2e.ts` (line 41) also leaves `cold_open.yaml` in the user pack, and `tools-live-preview` leaves its tools project `tools-live` (line 16). Neither breaks a test today. They are not changed by this unit, because they are not in the failures. If they cause a failure later, the same rule applies.
7. **The rule for future specs.** A spec that writes a project folder into the shared library, or a file into the user pack, removes it in `test.afterAll`. This plan states the rule; it is not a settled decision of a module file. The Navigator may add it to the platform module, if a later unit needs it.
8. **The phone bottom nav overflows at 390 px since 6deb543 (section 2.3). Settled.** The fix is product code outside the unit's scope, and it needs a design choice for the bottom nav with ten items (or a change of the module route table). Decision (Navigator, option (a)): a new Shell unit SHL-23 (`units/SHL-23-phone-bottom-nav-fit.md`) makes the bottom nav fit the ten items at 390 px, in `apps/web/src/app/shell/app-nav.ts` only; the route table is not changed; PLT-23 is blocked by SHL-23 and its scope stays e2e only. Source: `plans/DECISIONS.md`, entry "2026-11-19 — PLT-23 — Navigator decision (session 0d1c12bad0f542fa9e19f3ae9457cc46)" (commit 3ca880e). This plan applies it in section 2.3, step 0, steps 1b and 5, and section 8.

## 10. Review parts

One part: the plan is small, and every change serves the same two criteria.

- **Part A (all of the plan).** Steps 0 to 10. Changes: the six paths of section 4. Tests: T1 and T2 (criterion 1), T3 (criterion 2), T4, T5 and T6 (criterion 3), T7 (criterion 4), T8 (criterion 5). The reviewer checks the diff against section 4, the outputs of T1 to T8 against section 6, and that `git diff --name-only main...unit/PLT-23` holds only the six paths.
