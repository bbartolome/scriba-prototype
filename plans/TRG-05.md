---
id: TRG-05
status: draft
---
# TRG-05 plan — Spike gate: dev preview on /tools, running-app checks, spike note

Unit: `units/TRG-05-spike-gate.md` (module Tool registry, phase:form-renderer, milestone M2): front matter lines 2 to 9, scope lines 16 to 18, criteria lines 21 to 25. Revision 1 (planner), checked at main `4270ac1`. Availability, checked before writing: `plans/QUEUE.md` line 8 says `available: yes`; the blockers TRG-02, TRG-03, TRG-04 and PST-12 each have `status: done` on line 3 of their plan, and their code is on main (`64a0dba`, `a914406`, `7b9253c`, `4989d44`); there is no `plans/TRG-05.md` and no `unit/TRG-05` branch. Nothing was built, installed, run or changed except this file.

Summary. The spike renders one workhorse tool, the registry's cold-open fixture, in two layouts on `/tools`, submits it through validate, and records a note. Four facts found while planning change what the unit's wording and the earlier hand-offs give:

- **F-A. The running app serves no tool on main.** The root `dev` script sets `SCRIBA_PACKS_DIR` inline (`package.json` line 24), so an outer value is ignored, and the e2e harness starts the API with `packages/packs` (`e2e/harness/global-setup.ts` line 80), which has no pack folder. The fixture is in `apps/api/test/fixtures/packs`. TRG-06's hand-off to this unit (`plans/TRG-06.md` section 7, point 1) is not applied on main.
- **F-B. A chip needs its own drop list.** DECISIONS 2026-11-15 (TRG-04, line 4223) says the dev chip is "a `cdkDrag` in the same `cdkDropListGroup` as the picker". CDK 22.2.7 gives a drag a source container only when the item sits in a `cdkDropList` (`node_modules/@angular/cdk/fesm2022/drag-drop.mjs` lines 1000 to 1016 and 1101 to 1122). The group then connects the lists (lines 3098 to 3106). This plan puts each chip in its own `cdkDropList` inside the group. The decision's intent stands.
- **F-C. The running-app chip check is this unit's.** `plans/TRG-04.md` line 120 hands it to criterion 2 of this unit. Criterion 2's test in this plan is that check.
- **F-D. The browser loads no runtime zod.** TRG-04 copies the Project store's routes and guards by hand (`apps/web/src/app/features/tool-registry/project-store-copy.ts`, header comment). This plan does the same for the tool-registry responses.

## 1. Decisions this plan obeys

### 1a. Settled by the unit, the module, the README and earlier decisions

- **Scope and criteria.** A dev preview route on `/tools`, registered with one Shell route-table entry, loads the cold-open fixture from the API and shows both layouts side by side, with submit to validate; a short spike note; five criteria. Source: unit lines 16 to 25.
- **The gate closes `phase:form-renderer`** (TRG-02 to TRG-05; gate TRG-05). Source: `units/README.md`, the phase table row `Tool registry | phase:form-renderer`.
- **The fixture is registry test data, not pack content.** Pack content is Genre packs' (GNP-07). Source: `modules/tool-registry.md` line 52; `units/TRG-02-emission-validate.md` line 25; `plans/TRG-06.md` section 7, point 1.
- **The hint vocabulary is closed.** `HINT_KEYS` in `packages/contracts/src/tool-registry/constants.ts` lines 43 to 48 is the closed set. Any change is an expand–contract in `/tool-registry` before `phase:loader-validation` closes (unit line 18; lint builds on the set, `modules/tool-registry.md` Ordering).
- **The server derives the control; `valueType` types the value.** Source: DECISIONS 2026-11-14 (TRG-01, open point 1), lines 3403 to 3407, corrected at lines 3439 and 3449. The form draws what `views.form` says and never chooses a control from `valueType`.
- **ToolForm's API.** Inputs `form`, `ports`, `layout` (`'form'` or `'node-body'`), `issues`, `handle`; model `value`; output `submitted`. Source: `apps/web/src/app/features/tool-registry/tool-form.ts` lines 483 to 496; `plans/TRG-03.md` section 1a. The node-body port row is `li[data-port]` with `.port-title` and `.port-type` (`tool-form.ts` lines 244 to 250).
- **Feature entry file.** Other features import this feature only through `tool-registry.routes.ts`. Its header (lines 1 to 3) says TRG-05 adds the dev route and TRG-13 adds `toolsRoutes`. Source: `plans/TRG-03.md` section 1a (feature entry file).
- **Picker and drop.** The entity picker lists the active project's entities filtered by the field's kinds, and takes dropped chips through CDK drag and drop (option b). Source: DECISIONS 2026-11-15 (TRG-04), lines 4220 to 4223; `plans/TRG-04.md` sections 4 and 7.
- **Browser copies.** Hand-written path functions and `ResponseSchema` copies with a parity spec, because the browser loads no runtime zod. Source: `plans/TRG-04.md` section 2 and the header of `project-store-copy.ts`.
- **Testing seams.** External behaviour only. UI tests: Vitest with the Shell's fakes (`modules/tool-registry.md` line 51; `units/README.md` line 136). A check in the running app is a Playwright spec in `e2e/specs/`, as a real-viewport check is (`plans/PST-09.md` R1; precedent `e2e/specs/projects-phone.e2e.ts`).
- **Route shape that TRG-13 needs.** `units/TRG-13-tools-page-list.md`, first Decisions bullet: `/tools` is app-level, one Shell route-table entry, minimum class `phone`, and it "replaces the dev preview route's placement (keep the preview as a detail tab)". This plan gives the entry and `toolsRoutes` the shape TRG-13 edits.
- **Validate modes.** `VALIDATE_MODES` is `full` and `params` (`constants.ts` line 64). Params mode drops the port keys (`validate.ts` line 93). A form submit is `full`.
- **Packs for the dev run.** `plans/TRG-06.md` section 7, point 1: the running check runs the API with `SCRIBA_PACKS_DIR` at `apps/api/test/fixtures/packs`, and the root `dev` script should honour an outer value with `${SCRIBA_PACKS_DIR:-$PWD/packages/packs}`.

### 1b. Decisions this plan makes

- **D1 Route.** `ToolsPreviewPage` in `tools-preview.ts`, exported as `toolsRoutes` from `tool-registry.routes.ts` (one child route, path `''`, `pathMatch: 'full'`). One `APP_ROUTES` entry `tools` above `'**'` with `data: {scope: 'app'}`, no `nav`, and the default device class (tablet; `route-data.ts`, the `ShellRouteData` comment). No nav entry until TRG-13.
- **D2 Running-app seam.** Criteria 1 and 2 are Playwright tests in the e2e harness: the built web, the API started by the harness, a temp library, and the fixture packs (open point 1). The `npm run dev` look is a manual check recorded in the note, not a test.
- **D3 Chips.** Each entity chip is a `cdkDrag` with `cdkDragData` `{id, type}` inside its own `cdkDropList`. One `cdkDropListGroup` wraps both forms and every chip list (F-B).
- **D4 Copies.** `tool-copy.ts` holds `toolPath(name)`, `toolValidatePath(name)`, `toolDetailCopy` and `toolValidateCopy`. The guards check the fields the page reads; S1 compares them with the contract's zod.
- **D5 Submit.** The form's `submitted` posts `{arguments, mode: 'full'}`. A 200 shows the returned `arguments` in a `<pre>`. A 422 `TOOL_ARGS_INVALID` passes `details.issues` (from `ApiError.details`; `apps/web/src/app/shell/api-error.ts` lines 10 to 13) to the form's `issues` input.
- **D6 Note.** `docs/adr/0002-form-renderer-spike.md`. `0001` is the only ADR on main, and no plan or unit names `0002` (grep).
- **D7 Vocabulary.** No change is expected. The fixture uses four hint keys, all in `HINT_KEYS` (section 7a). A missing hint stops the step and is reported (open point 3). This plan makes no vocabulary edit.
- **D8 Dev script.** The root `dev` script honours an outer `SCRIBA_PACKS_DIR` (open point 2).

## 2. Files to create or change

| Path | Change | Purpose |
|---|---|---|
| `apps/web/src/app/features/tool-registry/tools-preview.ts` | new | `ToolsPreviewPage` (standalone, selector `app-tools-preview`). Reads the active project (`ACTIVE_PROJECT_PATH`, `activeCopy`), its entity list (`projectEntitiesPath`, `entityListCopy`) and the `cold_open` detail once (`toolPath`, `toolDetailCopy`). Two `app-tool-form`s: `layout="form"` with `[form]`, and `layout="node-body"` with `[ports]` and a dev handle template (`ng-template` with `<i class="handle" [attr.data-port] [attr.data-side]>`). The page's `cdkDropListGroup` wraps both forms and the chip lists. Submit as D5. Shows the form's value and the last validate result in `<pre>` elements. |
| `apps/web/src/app/features/tool-registry/tool-copy.ts` | new | D4: path functions and `ResponseSchema` copies for the detail and the validate result. Type-only imports from `@bbartolome/scriba-contracts/tool-registry`. |
| `apps/web/src/app/features/tool-registry/tool-copy.spec.ts` | new | S1: the copies against the contract. |
| `apps/web/src/app/features/tool-registry/tools-preview.spec.ts` | new | C3: the page with the Shell's fakes. |
| `apps/web/src/app/features/tool-registry/tool-registry.routes.ts` | edit | Adds `export const toolsRoutes: Routes = [{ path: '', pathMatch: 'full', component: ToolsPreviewPage }]`. Replaces the header comment (lines 1 to 3, "It holds no routes yet"). Keeps the three existing exports. |
| `apps/web/src/app/app.routes.ts` | edit | One entry `tools` above `{ path: '**', component: NotFoundPage }` (line 115): `pathMatch: 'full'`, `data: {scope: 'app'} satisfies ShellRouteData`, `loadChildren` of `feature.toolsRoutes` from `./features/tool-registry/tool-registry.routes`. No `nav`. |
| `e2e/harness/global-setup.ts` | edit (open point 1) | Line 80: `SCRIBA_PACKS_DIR` becomes `join(repoRoot, 'apps/api/test/fixtures/packs')`. Nothing else. |
| `e2e/specs/tools-preview.e2e.ts` | new | C1 (test T1) and C2 (test T2). |
| `package.json` | edit (open point 2) | Line 24, the `dev` script: `SCRIBA_PACKS_DIR='$PWD/packages/packs'` becomes `SCRIBA_PACKS_DIR='${SCRIBA_PACKS_DIR:-$PWD/packages/packs}'`. The first shell expands the braces inside the script's double quotes; the single quotes survive. Nothing else in the file. |
| `docs/adr/0002-form-renderer-spike.md` | new | D6: the note. C5. |

Checked and not changed: `packages/contracts/**` (no vocabulary change, D7); `apps/api/**` (C4 runs TRG-02's test unchanged); `tool-form.ts`, `entity-picker.ts`, `project-store-copy.ts` (read only; a defect found in them stops the step and is reported, not fixed here); `apps/web/src/app/shell/**` (read only: `api-client.ts`, `api-error.ts`, `testing/test-doubles.ts`, `index.ts`); the other e2e specs; `units/`, `modules/`; `apps/web/package.json` and `package-lock.json` (no new dependency: `@angular/cdk` 22.2.7 is already in `apps/web`, `plans/TRG-04.md` section 2).

## 3. Procedure

Run from `/Users/bbartolome/workspace/scriba-prototype`, in a worktree at `/Users/bbartolome/workspace/scriba-prototype-wt/TRG-05` on branch `unit/TRG-05` created from `main` (the layout `git worktree list` shows for the other units). Record `node -v` and `npm -v` beside each result. Do not push, add no remote, and start no dev server before step 14.

0. **Precondition.** `grep -m1 '^status' plans/TRG-02.md plans/TRG-03.md plans/TRG-04.md plans/PST-12.md` prints `status: done` for each. `git branch --list 'unit/TRG-05'` prints nothing, and `git worktree list` has no TRG-05 entry. Expected: all hold.
1. **Runtime.** `node -v` prints `v26.x`; `npm -v` prints `11.20.0`. Expected: both.
2. **Branch and install.** `git worktree add -b unit/TRG-05 /Users/bbartolome/workspace/scriba-prototype-wt/TRG-05 main`, then `npm ci` in it. Expected: both exit 0.
3. **Baseline.** In the worktree: `npm run build`, `npm test -w @bbartolome/scriba-web`, `npm test -w @bbartolome/scriba-api -- tool-registry-api`. Expected: each exits 0. Record the test counts; they are the baseline for S2.
4. **Copies.** Write `tool-copy.ts` (D4). `toolPath(name)` returns `/api/tool-registry/tools/<name>` and `toolValidatePath(name)` adds `/validate`, with the name encoded. `toolDetailCopy` checks that `views` has `form.fields` (an array), `ports` (`inputs`, `output`, `params`), that `lint` and `source` are present. `toolValidateCopy` checks that `arguments` is an object and `entityRefs` an array. Expected: the file follows `project-store-copy.ts`'s shape (`ResponseSchema<T>` objects).
5. **Copy parity (S1).** Write `tool-copy.spec.ts`. It imports `toolDetailSchema` and `toolValidateResultSchema` from `@bbartolome/scriba-contracts/tool-registry` (runtime, Vitest only, as `project-store-copy.spec.ts` does). It checks that each copy accepts the contract's sample and refuses a detail with no `views` and a validate result with no `entityRefs`. Expected: the spec passes at step 9.
6. **Page.** Write `tools-preview.ts` (section 2). Load order: active project, entity list, `cold_open` detail once. Each chip is `<li cdkDrag [cdkDragData]="{id, type}">` inside its own `cdkDropList`, all inside the page's `cdkDropListGroup` (D3). Submit posts `{arguments, mode: 'full'}` (D5). A 422 sets the issues from `details.issues`; a 200 shows the returned `arguments`. With no active project, the page shows a short line and no chips. Expected: compiles at step 9.
7. **Route module.** Edit `tool-registry.routes.ts` as section 2 says. Expected: its exports are `ToolForm`, `ToolFormLayout`, `ToolFormPortRow` and `toolsRoutes`.
8. **Shell entry.** Edit `apps/web/src/app/app.routes.ts` as section 2 says. Expected: `grep -n "path: 'tools'" apps/web/src/app/app.routes.ts` prints one line, and the entry has no `nav` key. Then the Shell route specs `app.routes.spec.ts`, `device-gate.spec.ts` and `app-nav.spec.ts` pass (S3).
9. **Vitest test and web suites.** Write `tools-preview.spec.ts` (C3, section 4). Run `npm run build -w @bbartolome/scriba-web` (`ng build` type-checks the new files) and `npm test -w @bbartolome/scriba-web`. Expected: both exit 0; C3 and S1 pass; `tool-form.spec.ts` (the TRG-03 and TRG-04 tests), `project-store-copy.spec.ts` and the S3 specs pass with the counts of step 3. The fake records request bodies (`test-doubles.ts`, `FakeApiClient.requests`), so C3 reads the validate request's `mode`.
10. **Harness.** Edit `e2e/harness/global-setup.ts` line 80 (open point 1). Expected: `grep -n SCRIBA_PACKS_DIR e2e/harness/global-setup.ts` shows the fixture path and no other change.
11. **E2E spec.** Write `e2e/specs/tools-preview.e2e.ts` (T1 and T2). Setup as `projects-phone.e2e.ts` does: sign in through `<library>/.scriba/setup-url`, then write folder `tools-spike` with `project.yaml` (`schemaVersion: 1`, `title: Tools spike`, `genrePack: nonfiction`) and `entities/ada.md` and `entities/bob.md` (front matter `type: person`), `entities/paris.md` (`type: place`). Activate by visiting `/projects/tools-spike/switch`, whose page POSTs the activation (`apps/web/src/app/shell/switch-project.ts` line 89). Then open `/tools`. Each test runs this setup itself and does not rely on another spec's project. Expected: the file compiles under `e2e/tsconfig.json`.
12. **Run the e2e spec.** `npm run e2e -w @bbartolome/scriba-e2e -- tools-preview.e2e.ts`. Expected: 2 passed (T1 and T2). Record the browser version the run reports.
13. **Root dev script.** Edit `package.json` line 24 as section 2 says (open point 2). Expected: `git diff -- package.json` shows that one line; `npx prettier --check package.json` passes.
14. **Manual look (not a test).** Run `SCRIBA_PACKS_DIR=$PWD/apps/api/test/fixtures/packs npm run dev`, sign in, and open `http://localhost:4200/tools` with a project that has person entities. Recreate the step-11 folder in the dev library `.scriba-dev` by hand, after `git check-ignore -v .scriba-dev` confirms it is ignored. Note what is seen (both layouts, the port rows, the pickers, a drag) for step 15. Stop the dev run. Expected: both layouts render.
15. **Spike note.** Write `docs/adr/0002-form-renderer-spike.md` (D6): a status line; context (the unit and TRG-02 to TRG-04); a table with one row per key of `HINT_KEYS`, the fixture fields that use it, and the verdict; the outcome of T1, T2, T3 and the step-14 look, with anything not verified named as such; the decision (no vocabulary change, or the named expand–contract); the consequences for TRG-07, TRG-13 and GRR-11 (section 5). Expected: no placeholder text is left.
16. **Root gates.** From the root: `npm run build`, `npm test`, `npm run lint`. Expected: each exits 0; `npm run lint` ends with Prettier's `All matched files use Prettier code style!`.
17. **C4 check.** `npm test -w @bbartolome/scriba-api -- tool-registry-api`. Expected: `AC1` passes, and `git diff --quiet main -- apps/api/test/tool-registry-api.test.ts` exits 0.
18. **Paths.** `git status --short` lists only the section 2 paths. `git diff --name-only main...HEAD -- . ':!plans'` lists the same paths, with `plans/` excluded and the note included. Expected: no other path.
19. **Commit.** Stage the section 2 paths by name (never `git add -A` or `git commit -a`) and commit with `feat(TRG-05): add the form-renderer spike gate: /tools preview, running-app checks and spike note`. Then `git ls-files docs/adr/0002-form-renderer-spike.md` prints the path (C5). Expected: one commit on `unit/TRG-05`.
20. **Fresh clone.** `git clone --branch unit/TRG-05 /Users/bbartolome/workspace/scriba-prototype <empty directory>`; in it `npm ci && npm run build && npm test && npm run lint`. Expected: each exits 0.
21. **Record.** Store the Node and npm versions, each command's exit code and test counts (steps 3, 9, 12, 16, 17, 20), the e2e output and the note's path.

## 4. Acceptance criteria and tests

One test per criterion (unit lines 21 to 25). C4 and C5 need no new test beyond the one named.

| Criterion (unit line) | Test | File and seam | Step | Pass condition |
|---|---|---|---|---|
| C1: "In the running dev app, one API response for the cold-open fixture drives both a full form and a node body; the node body shows typed ports for the `entity`, `text` and `style` fields marked as ports, and the remaining controls as `params`." (21) | **T1** `TRG-05 C1: one tool response drives the form and the node body` | `e2e/specs/tools-preview.e2e.ts`; Playwright against the harness (D2) | 12 | (a) exactly one response to GET `/api/tool-registry/tools/cold_open` while the page lives. (b) The form layout has seven `section[data-key]`, one for each field of the fixture (`coreIdea`, `entityIds`, `styleProfile`, `length`, `tone`, `person`, `moment`), with the control in `data-control`. (c) The node body has `li[data-port]` rows in this order, with these `.port-type` texts: `coreIdea` text, `entityIds` entity list, `styleProfile` style, `person` entity, `moment` text, `output` text. (d) The node body's sections are exactly `length` (`slider`) and `tone` (`select`). (e) No page error. |
| C2: "The entity picker offers only entities of the fixture's kind (e.g. `person`) and accepts a dropped entity chip." (22) | **T2** `TRG-05 C2: the picker offers person entities only and takes a dropped person chip` | e2e spec; the Project store's real entity list; a real mouse drag (D2, D3) | 12 | (a) The options of the `person` picker and of the `entityIds` picker are exactly `ada` and `bob`; `paris` (type `place`) appears in neither. (b) Dragging the `ada` chip onto the `entityIds` picker adds `li.chip[data-id="ada"]` to that picker, and the form's value `<pre>` shows `"entityIds": ["ada"]`. |
| C3: "Submitting sends the arguments to `validate`: missing required fields and wrong enum values show readable messages inline; a valid submit shows the arguments with defaults applied." (23) | **T3** `TRG-05 C3: submit posts to validate; the issues show inline; a valid answer shows its arguments` | `tools-preview.spec.ts`; Vitest with `createShellTestDoubles()` | 9 | (a) The submit's request is POST `.../tools/cold_open/validate` with `mode: 'full'` (`api.requests`). (b) A 422 `TOOL_ARGS_INVALID` answer with issues `[{path: '/coreIdea', message: 'required, expected a string, received nothing'}, {path: '/tone', message: 'expected one of "warm", "dry", received "spicy"'}]` shows each message inside its own `section[data-key]`. (c) A 200 answer `{arguments: {coreIdea: 'Seven days', person: 'ada', length: 800}, entityRefs: []}` shows `"length": 800` in the arguments `<pre>` and no issue text. |
| C4: "The emitted function schema has no `x-` key and passes the draft-07 meta-schema." (24) | the existing test `AC1` in `apps/api/test/tool-registry-api.test.ts` line 217 (TRG-02), run unchanged | API test through `createTestApp` with the fixture packs (line 160) | 17 | `AC1` passes. TRG-02's test pins this criterion; this plan adds no test. |
| C5: "The spike note is committed." (25) | command check, no test | `git ls-files` | 19 | `git ls-files docs/adr/0002-form-renderer-spike.md` prints the path; `git status --short -- docs/adr` prints nothing; the note has one verdict row for each key of `HINT_KEYS`. |

Support tests (they check agreements, not new behaviour):
- **S1** `tool-copy.spec.ts` (step 5): each copy agrees with the contract (D4).
- **S2** the existing suites, unchanged: `tool-form.spec.ts` (TRG-03 T1 to T8 and E1 to E2, TRG-04 AC1 to AC3 and X1 to X4), `project-store-copy.spec.ts`, and the tool-registry API tests (steps 3 and 9).
- **S3** the Shell route specs: `app.routes.spec.ts`, `device-gate.spec.ts`, `app-nav.spec.ts` (steps 8 and 9).

## 5. Agreement with the downstream units

- **TRG-07 (lint; `blocked_by` TRG-05, TRG-06, TRG-08).** It builds on the closed set `HINT_KEYS` (`constants.ts` lines 43 to 48). This plan leaves the set unchanged, so it agrees. If open point 3 triggers, TRG-07 waits for the expand–contract that the Navigator decides.
- **TRG-13 (Tools list; `blocked_by` TRG-05, TRG-11).** The unit keeps `/tools` app-level with one Shell route-table entry and keeps the preview as a detail tab. This plan's entry (D1) and `toolsRoutes` (step 7) are the lines TRG-13 edits: its entry changes to `minDeviceClass: 'phone'` with a `nav` entry, and its route component becomes the list page, with `ToolsPreviewPage` kept as the detail tab. TRG-13 cannot merge before this unit (`blocked_by`), so the order is fixed. Agrees, provided TRG-13 keeps the component.
- **GRR-11 (tool nodes; `blocked_by` GRR-03, GRR-10, TRG-05).** It uses `ToolForm`'s node-body layout with the Graph runner's handle template (GRR-10), `params` bound through `[(value)]`, and the port descriptor. T1 and this plan's dev handle template exercise the same inputs. This plan changes no `ToolForm` input. Agrees.
- **TRG-04 (done).** Its plan (line 120) hands the running-app chip check to this unit; T2 is that check. Its Vitest drop tests (AC2b and AC2c) stay as they are. Agrees.
- **TRG-06 (done).** Its plan section 7 (point 1) hands the packs directory to this unit. Steps 10 and 13 do that (open points 1 and 2). Its section 6 bullet on the e2e harness (`packages/packs`, line 80) changes with step 10. Agrees only if the orchestrator accepts open point 1.
- **GNP-07 (cold_open pack tool; not blocked by this unit).** Its Spec lists the fixture's five common inputs, `person` and `moment`. The note compares the two (step 15). Agrees; no change.
- **PST-08 and PST-12 (done).** The e2e spec writes entity files in the format PST-08 reads (front matter `type`). Agrees.
- **The root `dev` script.** Only TRG-06's hand-off names it (open point 2). Agrees.

## 6. Shared files with draft or planned plans

`grep -l "^status: \(draft\|planned\)" plans/*.md` at `4270ac1` finds AGL-10, GRR-01, MPR-08, PST-14 and SAU-11 (planned). Their file tables:

- **AGL-10.** `apps/api/src/modules/agent-loop/**` and `apps/api/test/agent-loop-search.test.ts`. No overlap.
- **GRR-01.** `packages/contracts/src/graph-runner/**` and its tests. No overlap.
- **MPR-08.** `apps/api/test/providers-gate.test.ts` and one line in `modules/providers.md`. It changes no e2e file. No overlap.
- **PST-14.** `apps/web/src/app/features/project-store/**` (`search-panel.ts`, an edit of `files-page.ts`) and `e2e/specs/search-phone.e2e.ts`. No overlap. Both e2e specs share the temp library, and PST-14's spec switches the active project there. This spec activates its own project (step 11), so either order is correct.
- **SAU-11.** `apps/web/src/app/features/setup-auth/**`, `e2e/specs/setup-phone.e2e.ts` and lines 56 and 57 of `e2e/specs/journey.e2e.ts`. It keeps `app.routes.ts` unchanged (its P1). No overlap; either order is correct.

Units without a plan that change the same files: TRG-13 (`tool-registry.routes.ts`, the `tools` entry). Section 5 covers it; it is blocked by this unit, so it merges after.

## 7. Facts checked and facts assumed

### 7a. Checked (read at main `4270ac1`; no build or test was run by the planner)

- **Availability:** `plans/QUEUE.md` line 8; line 3 of `plans/TRG-02.md`, `plans/TRG-03.md`, `plans/TRG-04.md`, `plans/PST-12.md` (`status: done`); code commits `64a0dba`, `a914406`, `7b9253c`, `4989d44`; `git branch --list 'unit/TRG-05'` empty.
- **Downstream units that name TRG-05** (grep of `units/`): GRR-11 line 7, TRG-07 line 7, TRG-13 line 7 (`blocked_by`); TRG-02, TRG-03 and TRG-04 line 9 (`unblocks`). `modules/graph-runner.md` line 22 names TRG-05 for GRR-11.
- **The fixture** `apps/api/test/fixtures/packs/core/tools/cold_open.yaml`: `coreIdea` (text port, `textarea`), `entityIds` (entity port, list, kinds `person`), `styleProfile` (style port), `length` (integer, minimum 200, maximum 2000, default 800), `tone` (enum `warm`, `dry`), `person` (entity port, kinds `person`), `moment` (text port); required `coreIdea` and `person`; output `draft`.
- **Vocabulary:** `HINT_KEYS` has four keys (`constants.ts` lines 43 to 48); `VALIDATE_MODES` is `full`, `params` (line 64). `TOOL_ARGS_INVALID` is 422 (`errors.ts` line 45); `toolArgsInvalidDetailsSchema` is `{issues}` (lines 64 to 66).
- **Contract shapes:** `toolDetailSchema` (`catalog.ts`); `toolValidateRequestSchema` `{arguments, mode}` and `toolValidateResultSchema` `{arguments, entityRefs}` (`call.ts`); `entityListSchema` `{entities: [{id, type, path, title?}]}` (`project-store/entities.ts` lines 55 to 63); `activeProjectSchema` `{active}` (`project.ts` lines 77 to 79).
- **Project store:** `fileWriteSchema` `{path, content, baseHash?}` (`files.ts` lines 42 to 46); `newProjectRequestSchema` (`project.ts` lines 53 to 57); the summary has `id` (lines 39 to 40); the activation controller accepts POST (`active-project.controller.ts` lines 28 to 31); the switch page POSTs `ACTIVE_PROJECT_PATH` (`switch-project.ts` line 89).
- **ToolForm and picker:** inputs and outputs `tool-form.ts` lines 483 to 496; section attributes lines 278 and 279; node-body rows lines 244 to 250 (`.port-type` is `row.type` plus ` list` for a list); the picker's `cdkDropList` lines 152 to 155, chips `li.chip[data-id]` line 167, `drop` line 343; "No active project" line 283.
- **CDK 22.2.7** (`node_modules/@angular/cdk/fesm2022/drag-drop.mjs`): `_initialContainer` is set only when a drop container exists (lines 1000 to 1016); `_updateActiveDropContainer` runs only when `_dropContainer` is set (lines 855, 917) and uses `_initialContainer` (lines 1101 to 1122); `CdkDrag` injects `CDK_DROP_LIST` optionally (lines 2440 to 2446); a list's siblings include every list of its group (lines 3098 to 3106).
- **Test doubles:** `FakeApiClient.respond` and `fail` (`testing/test-doubles.ts` lines 49 and 54); `requests` records each request with its `body` (lines 23 to 28, 45).
- **Errors:** `ApiError` has `status`, `code`, `details` (`api-error.ts` lines 10 to 13); the client maps HTTP errors with `details` (`api-client.ts`, the error mapping after line 95).
- **Shell routes:** `app.routes.ts` `files` at line 26, `projects/:projectId` with its guard and `children` (line 62), `'**'` at line 115; `ShellRouteData` and its default (`route-data.ts`); `withDeviceGate` (`device-class.ts` line 148).
- **Packs:** `git ls-files packages/packs` lists `package.json`, `src/.gitkeep`, `test/smoke.test.ts`, `tsconfig.json`, and no pack folder; the API tool test sets `SCRIBA_PACKS_DIR` to the fixture folder (`tool-registry-api.test.ts` line 160); `create-test-app.ts` line 80 uses `library/packs`; the root `dev` script sets it inline (`package.json` line 24).
- **The harness:** `e2e/harness/global-setup.ts` line 25 sets `SCRIBA_E2E_LIBRARY`; `buildWorkspaces` (line 60) builds contracts, api and web; line 80 sets `SCRIBA_PACKS_DIR` to `packages/packs`.
- **E2E precedent:** `e2e/specs/projects-phone.e2e.ts` signs in through `.scriba/setup-url` and writes project folders with `project.yaml` in the temp library.
- **ADR folder:** `docs/adr/` holds only `0001-tailscale-serve-mechanism.md`; `units/README.md` line 135 says decisions are ADRs in `docs/adr/`; no plan or unit names `0002`.
- **Decisions cited:** DECISIONS lines 3403 to 3407, 3439, 3449 (valueType and the derived control); lines 4220 to 4223 (TRG-04 option b and its downstream note).

### 7b. Assumed (not run)

- Playwright's mouse drag starts a CDK drag and the drop reaches the picker's list (open point 4).
- The folder name is the project id, so `/projects/tools-spike/switch` works (step 11; open point 6).
- The e2e run has a Chromium and starts the harness as it does for the other specs (as `plans/PST-14.md` and `plans/SAU-11.md` assume).
- The two `ToolForm` instances, the chip lists and the handle template pass `ng build` budgets (step 9).
- `.scriba-dev` is git-ignored (step 14 checks it).

## 8. Open points

1. **The packs for the running check (blocks T1 and T2; recommendation (a)).** The harness starts the API with `packages/packs` (`global-setup.ts` line 80), which holds no pack folder, so no tool is served. Options: (a) point the harness at `apps/api/test/fixtures/packs` for every e2e run (step 10). No other spec calls a tool route (`plans/TRG-06.md` section 6), so this is safe; (b) read an environment variable in the harness with `packages/packs` as default; CI does not set it, so the spike spec would fail in CI (rejected); (c) put cold-open in `packages/packs`; that is pack content, GNP-07's, and TRG-06 rejected it (section 7, point 1). Recommended: (a). The orchestrator decides, because TRG-06 section 6 records the harness at `packages/packs`.
2. **The root `dev` script (recommended: yes).** Step 13 lets an outer `SCRIBA_PACKS_DIR` win (TRG-06's hand-off). The tests do not need it; the manual look (step 14) does. Without it, `npm run dev` shows no tool.
3. **Vocabulary (expected none).** The fixture uses four keys, all in `HINT_KEYS`. If the implementation finds a needed hint, or a fixture field the vocabulary cannot express, the step stops and reports it. A vocabulary change needs a Navigator decision and an expand–contract in `/tool-registry` (unit line 18). This plan makes no such change.
4. **A real drag in the running app (unverified).** T2 relies on Playwright's mouse events starting a CDK drag. If the drag does not register, T2 is not weakened and not replaced by a fake drop. The step stops at 12 and reports, so the Navigator decides. The fallback is TRG-04's Vitest drop test, which does not cover the running app.
5. **The dev route in the production bundle.** The spike route ships in the production build with the tablet default and no nav (D1). No dev-only gate is added. TRG-13 changes the route. The orchestrator confirms that no gate is wanted.
6. **Project data in T1 and T2 (check at step 11).** The spec writes folders by name and activates them through `/projects/<name>/switch`. If the summary's `id` differs from the folder name, the spec reads the id from the project list first. Assumed, not run.

Six open points.

## 9. Review parts

- **Part 1, the preview and its Vitest tests:** steps 0 to 9. Tests: S1 (step 5), C3 (step 9), S2 and S3 (steps 3, 8 and 9).
- **Part 2, the running app:** steps 10 to 14. Tests: C1 and C2 (step 12). Steps 13 and 14 are a script edit and a manual look, with no test.
- **Part 3, the note, the gates and the commit:** steps 15 to 21. Tests: C4 (step 17), C5 (step 19), the root gates (step 16) and the fresh clone (step 20).

Each step and each test is in exactly one part.
