---
id: TRG-05
status: draft
---
# TRG-05 plan — Spike gate: dev preview on /tools, running-app checks, spike note

Unit: `units/TRG-05-spike-gate.md` (module Tool registry, phase:form-renderer, milestone M2): front matter lines 2 to 9, scope lines 16 to 18, criteria lines 21 to 25. Revision 2 (reviser), checked at main `e1c0996` (revision 1, the planner's, was checked at `4270ac1`; `e1c0996` only adds this file). Availability: `plans/QUEUE.md` line 8 says `available: yes`; the blockers TRG-02, TRG-03, TRG-04 and PST-12 each have `status: done` on line 3 of their plan; there is no `unit/TRG-05` branch. Nothing was built, installed, run or changed except this file.

Summary. The spike renders one workhorse tool, the registry's cold-open fixture, in two layouts on `/tools`, submits it through validate, and records a note. Facts found while planning:

- **F-A. The running app serves no tool on main, and the user pack is the way in.** The e2e harness starts the API with `SCRIBA_PACKS_DIR` at `packages/packs` (`e2e/harness/global-setup.ts` line 80), and the root `dev` script sets it inline to the same folder (`package.json` line 24); `packages/packs` has no pack folder. But the catalog reads the user pack at `<library>/.scriba/packs/user/tools` (`apps/api/src/modules/tool-registry/packs.ts` lines 80 to 83) and re-scans it before each read, "so a host-side edit shows up without a restart" (`catalog.service.ts` lines 95 and 96, `refresh` lines 116 to 124); a valid user copy, or a user tool with no built-in, is served (`resolve`, lines 212 to 218). So the e2e spec and the manual look copy the fixture into the library's user pack. The harness and the root `package.json` stay unchanged (revision 2; this replaces revision 1's open points 1 and 2, see section 8).
- **F-B. A chip needs its own drop list.** DECISIONS 2026-11-15 (TRG-04, line 4223) says the dev chip is "a `cdkDrag` in the same `cdkDropListGroup` as the picker". CDK 22.2.7 gives a drag a source container only when the item sits in a `cdkDropList` (`node_modules/@angular/cdk/fesm2022/drag-drop.mjs` lines 1000 to 1016); the group then connects every list (lines 3098 to 3106). This plan puts each chip in its own `cdkDropList` inside the group. The decision's intent stands.
- **F-C. The running-app chip check is this unit's.** `plans/TRG-04.md` line 120 hands it to criterion 2 of this unit, and P17 (d) (line 60) names the drop onto the fixture's single-ID field `person`. Criterion 2's test is that check.
- **F-D. The browser loads no runtime zod.** TRG-04 copies the Project store's routes and guards by hand (`apps/web/src/app/features/tool-registry/project-store-copy.ts`, header lines 8 to 10). This plan does the same for the tool-registry responses.

## 1. Decisions this plan obeys

### 1a. Settled by the unit, the module, the README and earlier decisions

- **Scope and criteria.** A dev preview route on `/tools`, registered with one Shell route-table entry, loads the cold-open fixture from the API and shows both layouts side by side, with submit to validate; a short spike note; five criteria. Source: unit lines 16 to 25.
- **The gate closes `phase:form-renderer`** (TRG-02 to TRG-05; gate TRG-05). Source: `units/README.md` line 100.
- **The fixture is registry test data, not pack content.** Pack content is Genre packs' (GNP-07). Source: `modules/tool-registry.md` lines 52 and 56; `plans/TRG-06.md` section 7, point 1 (line 171).
- **Platform's e2e needs no registry-specific step.** Source: `modules/tool-registry.md` line 53. Hence the harness is not changed (F-A); the spike spec sets up its own tool in its own test, as it sets up its own project.
- **The hint vocabulary is closed.** `HINT_KEYS` in `packages/contracts/src/tool-registry/constants.ts` lines 43 to 48 is the closed set. Any change is an expand–contract in `/tool-registry` before `phase:loader-validation` closes (unit line 18; lint builds on it, `modules/tool-registry.md` line 7).
- **The server derives the control; `valueType` types the value.** Source: DECISIONS 2026-11-14 (TRG-01, open point 1), lines 3403 to 3407, corrected at lines 3439 and 3449.
- **ToolForm's API.** Inputs `form` (required), `ports`, `layout` (`'form'` or `'node-body'`), `issues`, `handle`; model `value`; output `submitted`. Source: `tool-form.ts` lines 483 to 496. The node-body layout renders only the non-port fields as sections (`fields`, lines 502 to 505) and the port rows `li[data-port]` with `.port-title` and `.port-type` (`.port-type` is the type plus ` list` for a list), then the output row last (lines 244 to 250, 510 to 529).
- **Route registration.** The feature exports one `Routes` per owned path, named `toolsRoutes` for `/tools`, from `tool-registry.routes.ts`; `/tools` is "one entry and one export, `toolsRoutes`, registered once. The second unit adds only its content or children." Source: `plans/SHL-01.md` line 28 (decision 9) and line 203; `plans/TRG-03.md` line 99.
- **The `/tools` row of the Shell route table:** owner Tool registry, scope app, minimum class `phone`, nav yes. Source: `modules/shell.md` line 57 ("paths are fixed here; each owner registers its own entry", line 50). Pages with richer layouts declare `phone` and switch layout (line 69).
- **Picker and drop.** The entity picker lists the active project's entities filtered by the field's kinds, and takes dropped chips through CDK drag and drop (option b). Source: DECISIONS 2026-11-15 (TRG-04), lines 4220 to 4223; `plans/TRG-04.md` P12 (line 55), P17 (line 60), step 7 (line 90).
- **Browser copies.** Hand-written path functions and `ResponseSchema` copies with a parity spec. Source: `plans/TRG-04.md` section 2 and the header of `project-store-copy.ts`.
- **Testing seams.** External behaviour only. UI tests: Vitest with the Shell's fakes (`modules/tool-registry.md` line 51; `units/README.md` line 136). A check in the running app is a Playwright spec in `e2e/specs/` (`plans/PST-09.md` R1; precedent `e2e/specs/projects-phone.e2e.ts`).
- **Validate modes.** `VALIDATE_MODES` is `full` and `params` (`constants.ts` line 64). A form submit is `full`. Validate applies defaults (`apps/api/src/modules/tool-registry/validate.ts` lines 35 to 37, 82).
- **Decisions are ADRs in `docs/adr/`.** Source: `modules/tool-registry.md` line 64; `units/README.md` line 135.

### 1b. Decisions this plan makes

- **D1 Route.** `ToolsPreviewPage` in `tools-preview.ts`, exported as `toolsRoutes` from `tool-registry.routes.ts` (one child route, path `''`, component `ToolsPreviewPage`). One `APP_ROUTES` entry `tools` above `'**'`, `pathMatch: 'full'`, with `data: {scope: 'app', minDeviceClass: 'phone', nav: {label: 'Tools', icon: 'build', order: 40}}`, following the module table (section 1a) and the shape of the `settings` and `projects` entries (`app.routes.ts` lines 89 to 114). Label from the module's "Tools page" (`modules/tool-registry.md` line 3); order 40 is the first free slot after Files (30) and before Settings (90) (`app.routes.ts` lines 31, 95, 108); icon `build` is this plan's simplest choice. TRG-13 changes only the content. Revision 2: revision 1 used the tablet default and no nav, which departs from `modules/shell.md` line 57 with no source.
- **D2 Running-app seam.** Criteria 1 and 2 are Playwright tests against the e2e harness: the built web and the API that the harness starts (`global-setup.ts` lines 20 to 30, 74 to 85; `e2e/playwright.config.ts` line 20), with the temp library. "The running dev app" (criterion 1) is read as this composed app running locally; each test puts the fixture into the library's user pack (F-A). The `npm run dev` look (step 12) is a manual check recorded in the note, not a test.
- **D3 Chips.** Each entity chip is a `cdkDrag` with `cdkDragData` `{id, type}` inside its own `cdkDropList`. One `cdkDropListGroup` wraps both forms and every chip list (F-B).
- **D4 Copies.** `tool-copy.ts` holds `toolPath(name)`, `toolValidatePath(name)`, `toolDetailCopy` and `toolValidateCopy`. The guards check the fields the page reads; S1 compares them with the contract's zod.
- **D5 Submit.** The form's `submitted` posts `{arguments, mode: 'full'}`. A 200 shows the returned `arguments` in a `<pre>`. A 422 `TOOL_ARGS_INVALID` passes `details.issues` (from `ApiError.details`; `apps/web/src/app/shell/api-error.ts` lines 10 to 13) to the form's `issues` input.
- **D6 Note.** `docs/adr/0002-form-renderer-spike.md`. `0001-tailscale-serve-mechanism.md` is the only ADR on main, and no plan or unit names `0002`.
- **D7 Vocabulary.** No change. The fixture uses the four hint keys, all in `HINT_KEYS` (section 7a). If the implementation finds a hint the workhorse needs that the set lacks, the step stops and reports it: a vocabulary change is an expand–contract decided outside this plan (unit line 18). This plan makes no vocabulary edit.
- **D8 Layout.** The two layouts sit side by side in a wrapping flex row, so a narrow screen stacks them (the `phone` class of D1, `modules/shell.md` line 69). No phone test: no criterion asks for one.

## 2. Files to create or change

| Path | Change | Purpose |
|---|---|---|
| `apps/web/src/app/features/tool-registry/tools-preview.ts` | new | `ToolsPreviewPage` (standalone, selector `app-tools-preview`). Reads the active project (`ACTIVE_PROJECT_PATH`, `activeCopy`), its entity list (`projectEntitiesPath`, `entityListCopy`) and the `cold_open` detail once (`toolPath`, `toolDetailCopy`). Two `app-tool-form`s, each with `[form]` (a required input): `layout="form"`, and `layout="node-body"` with `[ports]` and a dev handle template (`ng-template` with `<i class="handle" [attr.data-port] [attr.data-side]>`). The page's `cdkDropListGroup` wraps both forms and the chip lists (D3). Submit as D5. Shows the form's value and the last validate result in `<pre>` elements. Layout as D8. |
| `apps/web/src/app/features/tool-registry/tool-copy.ts` | new | D4: path functions and `ResponseSchema` copies for the detail and the validate result. Type-only imports from `@bbartolome/scriba-contracts/tool-registry`. |
| `apps/web/src/app/features/tool-registry/tool-copy.spec.ts` | new | S1: the copies against the contract. |
| `apps/web/src/app/features/tool-registry/tools-preview.spec.ts` | new | T3 (C3): the page with the Shell's fakes. |
| `apps/web/src/app/features/tool-registry/tool-registry.routes.ts` | edit | Adds `export const toolsRoutes: Routes = [{ path: '', component: ToolsPreviewPage }]`. Replaces the header comment (lines 1 and 2, "It holds no routes yet…") with one naming `toolsRoutes` as the `/tools` export that TRG-13 extends. Keeps the three existing exports. |
| `apps/web/src/app/app.routes.ts` | edit | One entry `tools` above `{ path: '**', component: NotFoundPage }` (line 115), as D1, with `loadChildren` of `feature.toolsRoutes` from `./features/tool-registry/tool-registry.routes`. |
| `e2e/specs/tools-preview.e2e.ts` | new | T1 (C1) and T2 (C2). |
| `docs/adr/0002-form-renderer-spike.md` | new | D6: the note (C5). |

Checked and not changed: `e2e/harness/**` and the root `package.json` (F-A); `packages/contracts/**` (D7); `apps/api/**` (C4 runs TRG-02's test unchanged; the fixture file is read, not edited); `tool-form.ts`, `entity-picker.ts`, `project-store-copy.ts` (read only; a defect found in them stops the step and is reported); `apps/web/src/app/shell/**`; the other e2e specs; `units/`, `modules/`; `apps/web/package.json` and `package-lock.json` (no new dependency: `@angular/cdk` 22.2.7 is already in `apps/web`).

## 3. Procedure

Run in a worktree at `/Users/bbartolome/workspace/scriba-prototype-wt/TRG-05` on branch `unit/TRG-05` created from `main`. Record `node -v` and `npm -v` beside each result. Do not push and add no remote.

0. **Precondition.** `grep -m1 '^status' plans/TRG-02.md plans/TRG-03.md plans/TRG-04.md plans/PST-12.md` prints `status: done` for each; `git branch --list 'unit/TRG-05'` prints nothing; `git worktree list` has no TRG-05 entry; `apps/api/test/fixtures/packs/core/tools/cold_open.yaml` exists. Expected: all hold.
1. **Runtime.** `node -v` prints `v26.x`; `npm -v` prints `11.20.0`. Expected: both.
2. **Branch and install.** `git worktree add -b unit/TRG-05 /Users/bbartolome/workspace/scriba-prototype-wt/TRG-05 main`, then `npm ci` in it. Expected: both exit 0.
3. **Baseline.** In the worktree: `npm run build`, `npm test -w @bbartolome/scriba-web`, `npm test -w @bbartolome/scriba-api -- tool-registry-api`. Expected: each exits 0. Record the test counts (baseline for S2).
4. **Copies.** Write `tool-copy.ts` (D4). `toolPath(name)` returns `/api/tool-registry/tools/<name>` (`TOOL_ROUTE`, `packages/contracts/src/tool-registry/routes.ts` line 6) and `toolValidatePath(name)` adds `/validate` (`TOOL_VALIDATE_ROUTE`, line 13), with the name encoded. `toolDetailCopy` checks that `views` has `form.fields` (an array) and `ports` (`inputs`, `output`, `params`), and that `lint` and `source` are present. `toolValidateCopy` checks that `arguments` is an object and `entityRefs` an array. Expected: the file follows `project-store-copy.ts`'s shape.
5. **Copy parity (S1).** Write `tool-copy.spec.ts`. It imports `toolDetailSchema` and `toolValidateResultSchema` from `@bbartolome/scriba-contracts/tool-registry` (runtime, Vitest only, as `project-store-copy.spec.ts` does). Each copy accepts the contract's sample and refuses a detail with no `views` and a validate result with no `entityRefs`. Expected: passes at step 9.
6. **Page.** Write `tools-preview.ts` (section 2). Load order: active project, entity list, `cold_open` detail once. Each chip is `<li cdkDrag [cdkDragData]="{id, type}">` inside its own `cdkDropList`, all inside the page's `cdkDropListGroup` (D3). Submit as D5. With no active project, the page shows a short line and no chips. Expected: compiles at step 9.
7. **Route module.** Edit `tool-registry.routes.ts` as section 2 says. Expected: its exports are `ToolForm`, `ToolFormLayout`, `ToolFormPortRow` and `toolsRoutes`.
8. **Shell entry.** Edit `app.routes.ts` as D1 and section 2 say. Expected: `grep -n "path: 'tools'" apps/web/src/app/app.routes.ts` prints one line.
9. **Vitest test and web suites.** Write `tools-preview.spec.ts` (T3, section 4). Run `npm run build -w @bbartolome/scriba-web` and `npm test -w @bbartolome/scriba-web`. Expected: both exit 0; T3 and S1 pass; the S2 and S3 specs pass with at least the counts of step 3. The fake records request bodies (`apps/web/src/app/shell/testing/test-doubles.ts` lines 23 to 28, 45), so T3 reads the validate request's `mode`.
10. **E2E spec.** Write `e2e/specs/tools-preview.e2e.ts` (T1 and T2). Each test runs its own setup and relies on no other spec: sign in through `<library>/.scriba/setup-url` (as `projects-phone.e2e.ts` lines 24 to 28); copy `apps/api/test/fixtures/packs/core/tools/cold_open.yaml` (path resolved from the spec file's folder) to `<library>/.scriba/packs/user/tools/cold_open.yaml`, creating the folders (F-A); write folder `tools-spike` with `project.yaml` (`schemaVersion: 1`, `title: Tools spike`, `genrePack: nonfiction`) and `entities/ada.md`, `entities/bob.md` (front matter `type: person`), `entities/paris.md` (`type: place`); activate it by visiting `/projects/tools-spike/switch` (the folder name is the project id, `apps/api/src/modules/project-store/project-discovery.ts` line 38; the page POSTs the activation, `switch-project.ts` line 89); then open `/tools`. Drags use `page.mouse` `down`, `move` in several steps (past CDK's start threshold) and `up`. Expected: the file compiles under `e2e/tsconfig.json`.
11. **Run the e2e spec.** `npm run e2e -w @bbartolome/scriba-e2e -- tools-preview.e2e.ts`. Expected: 2 passed. Record the browser version. If the real drag does not register (assumption A1), do not weaken T2 or replace it with a fake drop: stop and report.
12. **Manual look (not a test).** `npm run dev` unchanged. In the dev library `.scriba-dev` (git-ignored, `.gitignore` line 5), sign in, copy the fixture to `.scriba-dev/.scriba/packs/user/tools/cold_open.yaml`, recreate the step-10 project folder, activate it and open `http://localhost:4200/tools`. Note what is seen (both layouts, the port rows, the pickers, a drag) for step 13. Stop the dev run. Expected: both layouts render.
13. **Spike note.** Write `docs/adr/0002-form-renderer-spike.md` (D6): a status line; context (the unit and TRG-02 to TRG-04); a table with one row per key of `HINT_KEYS`, the fixture fields that use it, and the verdict; any hint the workhorse needed that the vocabulary lacks (expected: none, D7); the outcome of T1, T2, T3 and the step-12 look, with anything not verified named as such; that the fixture reached the running app through the user pack (F-A); the consequences for TRG-07, TRG-13 and GRR-11 (section 5). Expected: no placeholder text.
14. **Root gates.** From the root: `npm run build`, `npm test`, `npm run lint`. Expected: each exits 0.
15. **C4 check (T4).** `npm test -w @bbartolome/scriba-api -- tool-registry-api`. Expected: `AC1` passes, and `git diff --quiet main -- apps/api/test/tool-registry-api.test.ts` exits 0.
16. **Paths.** `git status --short` lists only the section 2 paths. Expected: no other path.
17. **Commit and T5.** Stage the section 2 paths by name (never `git add -A` or `git commit -a`) and commit with `feat(TRG-05): add the form-renderer spike gate: /tools preview, running-app checks and spike note`. Then run T5. Expected: one commit on `unit/TRG-05`; T5 passes.
18. **Fresh clone.** `git clone --branch unit/TRG-05 /Users/bbartolome/workspace/scriba-prototype <empty directory>`; in it `npm ci && npm run build && npm test && npm run lint`. Expected: each exits 0.
19. **Record.** Store the Node and npm versions, each command's exit code and test counts (steps 3, 9, 11, 14, 15, 18), the e2e output and the note's path.

## 4. Acceptance criteria and tests

One test per criterion (unit lines 21 to 25).

| Criterion (unit line) | Test | File and seam | Step | Pass condition |
|---|---|---|---|---|
| C1: "In the running dev app, one API response for the cold-open fixture drives both a full form and a node body; the node body shows typed ports for the `entity`, `text` and `style` fields marked as ports, and the remaining controls as `params`." (21) | **T1** `TRG-05 C1: one tool response drives the form and the node body` | `e2e/specs/tools-preview.e2e.ts`; Playwright against the harness (D2) | 11 | (a) Exactly one response to GET `/api/tool-registry/tools/cold_open` while the page lives. (b) The form layout has seven `section[data-key]`, one per fixture field (`coreIdea`, `entityIds`, `styleProfile`, `length`, `tone`, `person`, `moment`), each with a `data-control`. (c) The node body has `li[data-port]` rows in this order with these `.port-type` texts: `coreIdea` text, `entityIds` entity list, `styleProfile` style, `person` entity, `moment` text, `output` text. (d) The node body's sections are exactly `length` (`slider`) and `tone` (`select`). (e) No page error. |
| C2: "The entity picker offers only entities of the fixture's kind (e.g. `person`) and accepts a dropped entity chip." (22) | **T2** `TRG-05 C2: the picker offers person entities only and takes a dropped person chip` | e2e spec; the Project store's real entity list; a real mouse drag (D2, D3) | 11 | (a) The non-empty options of the `person` picker and of the `entityIds` picker are exactly `ada` and `bob`; `paris` (type `place`) is in neither. (b) Dragging the `ada` chip onto the `person` picker (the single-ID field, `plans/TRG-04.md` P17 d) sets its value to `ada`, and the form's value `<pre>` shows `"person": "ada"`. |
| C3: "Submitting sends the arguments to `validate`: missing required fields and wrong enum values show readable messages inline; a valid submit shows the arguments with defaults applied." (23) | **T3** `TRG-05 C3: submit posts to validate; the issues show inline; a valid answer shows its arguments` | `tools-preview.spec.ts`; Vitest with `createShellTestDoubles()` | 9 | (a) The submit's request is POST `/api/tool-registry/tools/cold_open/validate` with `mode: 'full'` (`api.requests`). (b) A 422 `TOOL_ARGS_INVALID` answer with issues `[{path: '/coreIdea', message: 'required, expected a string, received nothing'}, {path: '/tone', message: 'expected one of "warm", "dry", received "spicy"'}]` shows each message inside its own `section[data-key]`. (c) A 200 answer `{arguments: {coreIdea: 'Seven days', person: 'ada', length: 800}, entityRefs: []}` shows `"length": 800` in the arguments `<pre>` and no issue text. |
| C4: "The emitted function schema has no `x-` key and passes the draft-07 meta-schema." (24) | **T4** the existing test `AC1` in `apps/api/test/tool-registry-api.test.ts` line 217 (TRG-02), run unchanged | API test through `createTestApp` with the fixture packs (line 160); it checks no `x-` key and `validateSchema` (lines 231 to 233) | 15 | `AC1` passes; the file is unchanged. |
| C5: "The spike note is committed." (25) | **T5** command check | `git ls-files` | 17 | `git ls-files docs/adr/0002-form-renderer-spike.md` prints the path; `git status --short -- docs/adr` prints nothing; the note has one verdict row per key of `HINT_KEYS`. |

Support tests (agreements, not new behaviour):
- **S1** `tool-copy.spec.ts` (step 5): each copy agrees with the contract (D4).
- **S2** the existing suites, unchanged: `tool-form.spec.ts`, `project-store-copy.spec.ts`, and the tool-registry API tests (steps 3 and 9).
- **S3** the Shell route specs `app.routes.spec.ts`, `app-nav.spec.ts` (its href checks use `toContain`, so a new nav item breaks none) and `device-gate.spec.ts` (step 9).

## 5. Agreement with the downstream units

- **TRG-07 (`blocked_by` TRG-05, TRG-06, TRG-08; line 7).** It builds on the closed set `HINT_KEYS` (its line 19). This plan leaves the set unchanged (D7). Agrees.
- **TRG-13 (`blocked_by` TRG-05, TRG-11; line 7).** Its line 15: `/tools` app-level, one Shell entry, minimum class `phone`, "replaces the dev preview route's placement (keep the preview as a detail tab)". D1 already registers that entry with `phone` and the nav item of `modules/shell.md` line 57, and `toolsRoutes` is the one export (`plans/SHL-01.md` line 203). TRG-13 changes only `toolsRoutes`' content, keeping `ToolsPreviewPage` as a detail tab. Agrees.
- **GRR-11 (`blocked_by` GRR-03, GRR-10, TRG-05; line 7).** It uses `ToolForm`'s node-body layout with the Graph runner's handle template, `params` bound through `[(value)]`, and the port descriptor (its line 18). T1 and the dev handle template exercise the same inputs; this plan changes no `ToolForm` input. Agrees.
- **TRG-04 (done).** Its plan hands the running-app chip check to this unit (line 120) and names the drop onto `person` (P17 d, line 60); T2 is that check. Agrees.
- **TRG-06 (done).** Its section 7, point 1 (line 171) hands this unit a way to serve the fixture: `SCRIBA_PACKS_DIR` at the fixture folder and an outer value honoured by the root `dev` script. This plan uses the user pack instead (F-A), which TRG-06's own catalog serves, so its section 6 harness bullet (line 165) stays true. The intent of the hand-off (the fixture, not pack content, in the running app) is kept. Agrees.

## 6. Shared files with draft or planned plans

`grep -l "^status: \(draft\|planned\)" plans/*.md` at `e1c0996`: AGL-10, GRR-01, MPR-08, PST-14, SAU-11 (and this plan).

- **AGL-10, GRR-01, MPR-08.** API, contracts and API test files only. No overlap.
- **PST-14.** `features/project-store/**` and `e2e/specs/search-phone.e2e.ts`; it keeps `app.routes.ts` unchanged (its line 58). Both e2e specs share the temp library, and PST-14's spec switches the active project there. This spec activates its own project in each test (step 10), so either order is correct. The user-pack file this spec writes is read by no other spec (no other e2e spec calls a tool route, `plans/TRG-06.md` line 202).
- **SAU-11.** `features/setup-auth/**`, `e2e/specs/setup-phone.e2e.ts`, lines 56 and 57 of `e2e/specs/journey.e2e.ts`; it keeps `app.routes.ts` unchanged (its P1). No overlap.

Units without a plan that change the same files: TRG-13 (`tool-registry.routes.ts`, the `tools` entry); blocked by this unit, so it merges after (section 5).

## 7. Facts checked and facts assumed

### 7a. Checked (read at main `e1c0996`; nothing was built or run)

- **Availability:** `plans/QUEUE.md` line 8; line 3 of `plans/TRG-02.md`, `TRG-03.md`, `TRG-04.md`, `TRG-06.md`, `PST-12.md` (`status: done`); `git branch --list 'unit/TRG-05'` empty.
- **Downstream units naming TRG-05 in `blocked_by`** (grep of `units/`): GRR-11, TRG-07, TRG-13 (line 7 each). TRG-05's `unblocks` (line 9) is their inverse.
- **The fixture** `apps/api/test/fixtures/packs/core/tools/cold_open.yaml`: ports `coreIdea` (text, `textarea`), `entityIds` (entity list, kinds `person`), `styleProfile` (style), `person` (entity, kinds `person`), `moment` (text); params `length` (integer 200 to 2000, default 800) and `tone` (enum `warm`, `dry`); required `coreIdea`, `person`; output `draft`. TRG-02's AC1 expects `ports.output` `{key: 'output', type: 'text', kind: 'draft'}` and `params` `['length', 'tone']` (`tool-registry-api.test.ts` lines 236 to 240).
- **The user pack:** `userToolsDir` (`packs.ts` lines 80 to 83); catalog re-scan before reads and resolve order (`catalog.service.ts` lines 95 and 96, 116 to 124, 211 to 222).
- **Vocabulary and validate:** `HINT_KEYS` (`constants.ts` lines 43 to 48); `VALIDATE_MODES` (line 64); Ajv `useDefaults: true` (`validate.ts` line 37).
- **ToolForm:** inputs and outputs `tool-form.ts` lines 483 to 496; node-body template lines 242 to 266; `fields` lines 502 to 505; `portRows` lines 510 to 529; sections with `data-key` and `data-control` lines 277 to 280.
- **CDK 22.2.7:** `node_modules/@angular/cdk/package.json` version; `drag-drop.mjs` lines 1000 to 1016 and 3098 to 3106.
- **Web shell:** `FakeApiClient.requests`, `respond`, `fail` (`test-doubles.ts` lines 23 to 28, 45 to 55); `ApiError` fields (`api-error.ts` lines 10 to 13); `ShellRouteData` with optional `minDeviceClass` (default tablet) and `nav` (`route-data.ts` lines 4 to 19); `app.routes.ts` entries (lines 11 to 116, `'**'` at 115); `app-nav.spec.ts` uses `toContain` (lines 174 to 198); the nav has no item limit (`app-nav.ts` lines 52 to 72).
- **Route naming:** `plans/SHL-01.md` lines 28 and 203; `tool-registry.routes.ts` lines 1 to 7; `modules/shell.md` lines 50, 57, 69.
- **Project store:** project id is the folder name (`project-discovery.ts` line 38); the switch page POSTs the activation (`switch-project.ts` line 89); `activeCopy`, `entityListCopy`, `projectEntitiesPath`, `ACTIVE_PROJECT_PATH` exported by `project-store-copy.ts` (lines 13, 24, 86, 97).
- **E2E:** harness lines 20 to 30 (temp library, `SCRIBA_E2E_LIBRARY`) and 74 to 85 (API env, `SCRIBA_PACKS_DIR` at `packages/packs`); `playwright.config.ts` line 20 (`baseURL`); `e2e/package.json` script `e2e`; `projects-phone.e2e.ts` lines 20 to 45 (sign-in, project folders).
- **Dev:** root `package.json` line 24 (`dev`, packs set inline); `.gitignore` line 5 (`.scriba-dev/`, `git check-ignore -v` confirms).
- **ADR folder:** only `docs/adr/0001-tailscale-serve-mechanism.md`.
- **Decisions cited:** DECISIONS lines 3403 to 3407, 3439, 3449; lines 4220 to 4225. The grep of DECISIONS for `TRG-05` finds lines 942, 954, 958 (SHL-01 review: TRG-05 registers `/tools`) and 4223.

### 7b. Assumed (not run)

- **A1.** Playwright's mouse drag (down, stepped move, up) starts a CDK drag and the drop reaches the picker's list. Step 11 stops and reports if not.
- **A2.** The e2e run has a Chromium and the harness starts as for the other specs (as `plans/PST-14.md` and `plans/SAU-11.md` assume).
- **A3.** A user-pack tool with no built-in of the same name is served by GET `/tools/cold_open` with the same three views as the built-in fixture (read from `resolve`; not run).
- **A4.** The page passes `ng build` budgets (step 9).

## 8. Open points

None. Revision 1's six points are settled:

1. **Packs for the running check:** settled by F-A (the user pack); no harness change. Source: `packs.ts` lines 80 to 83, `catalog.service.ts` lines 95 and 96; `modules/tool-registry.md` line 53.
2. **Root `dev` script:** not changed (YAGNI): the manual look uses the dev library's user pack (step 12).
3. **Vocabulary:** D7; the fixture's keys are all in `HINT_KEYS` (checked). A found gap stops the work and is reported.
4. **Real drag:** assumption A1 with the stop rule of step 11.
5. **Route in the production bundle:** the route is the module's `/tools` entry (phone, nav) and TRG-13 keeps the preview as a detail tab (its line 15), so no dev-only gate. Source: `modules/shell.md` line 57.
6. **Project id:** checked, the folder name (`project-discovery.ts` line 38).

## 9. Review parts

- **Part 1, the preview and its Vitest tests:** steps 0 to 9. Tests: S1 (step 5), T3 (step 9), S2 and S3 (steps 3 and 9).
- **Part 2, the running app:** steps 10 to 12. Tests: T1 and T2 (step 11). Step 12 is a manual look, with no test.
- **Part 3, the note, the gates and the commit:** steps 13 to 19. Tests: T4 (step 15), T5 (step 17), the root gates (step 14) and the fresh clone (step 18).

Each step and each test is in exactly one part.
