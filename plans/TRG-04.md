---
id: TRG-04
status: draft
unit: units/TRG-04-entity-style-pickers.md
module: tool-registry
phase: phase:form-renderer
milestone: M2
---
# TRG-04 plan — Entity picker (kind-filtered, several, chip drop) and style picker (project default)

Unit: `units/TRG-04-entity-style-pickers.md` (Tool registry, phase:form-renderer, milestone M2). Checked at main `5111a16`. The first read was at `9cf0218`; the one commit between them (`5111a16`) changes only `plans/SHL-14.md` (its status becomes `planned`). Nothing was built, installed, run or committed except this file. The status stays `draft` until the Navigator settles the open points in section 7.

Scope in one line: the two picker controls of TRG-03's tool form replace their read-only slots; they read the Project store's entity list (PST-08) and, for the style picker, the project's style profile. No server code, endpoint or contract change is planned (section 2).

Tags: **checked** means read in this session (file and line, or a grep, ls or git command). **assumed** means not run or not verified here (section 8b).

Result in short: the blockers are done (TRG-03, PST-08, PST-01; section 8a). Each of the unit's three criteria gets one UI test (section 4). Eleven open points (section 7) must be settled before the code. Three of them decide what the tests stub: the project source (O3), the style default source (O4) and the drop payload (O7).

## 1. Decisions this plan obeys

### 1a. Settled by the unit, the module, the README and earlier decisions

- **Entity picker contents.** It lists the active project's entities from the Project store's entity list, `{id, type, path, title?}`, filtered by `x-scriba-entity-kinds`; a single ID, or chips for a list field; it accepts dropped entity chips. Source: unit lines 18, 23 and 24; module line 45 (the list is "filterable by `type`").
- **Style picker.** It lists style-profile entities and defaults to the project's `styleProfile` from `project.yaml`. Source: unit lines 19 and 25. The kind name `style-profile` is in `modules/genre-packs.md` line 74 (the core entity type; GNP-03, not on main).
- **Test seam.** Component tests use the Shell's fake API; the running app uses the real Project store. Source: unit line 20; module lines 50 to 52 (the UI seam is the tool-form component with Angular's Vitest runner against the Shell's fakes, SHL-07). The unit heading has no parenthetical, so the module's default seam applies (`units/README.md` line 57).
- **Fixtures.** The mixed-type fixture belongs to this unit and lives in its spec file. Unit tests never read `examples/` or the real packs. Source: module line 52; `units/README.md` line 136.
- **Values are IDs.** The picker holds entity IDs and never resolves them to contents. Callers resolve (module line 60); the Try panel resolves in the browser (`units/TRG-16-try-panel.md` line 15). TRG-03's tests already use ID strings and ID arrays (`tool-form.spec.ts` T4, line 438).
- **No validation in the form.** The server's issues are shown next to their fields; the form never validates (TRG-03 unit line 23; TRG-03 plan section 1b, D8).
- **Callers fill an empty style field** before a call (`plans/TRG-02.md` line 41, D4; `units/TRG-12-executor.md` line 31; `units/AGL-09-narrative-tools.md` line 19; `units/TRG-16-try-panel.md` line 15). The picker must not change this rule (O5 is the only place it can).
- **ToolForm's API is TRG-03's.** Inputs `form`, `ports`, `layout`, `issues`, `handle`, two-way `value`; output `submitted` (`plans/TRG-03.md` section 1b, D2). No input is added unless O3 chooses one.
- **Feature boundary.** A web feature imports another only through its entry file (`eslint.config.mjs` line 41 for the entry pattern; the web policy at lines 60 to 67). TRG-04 therefore cannot import the copies in `features/project-store/`; it writes its own.
- **Browser contract route.** The Shell ships no runtime zod. Contract imports in the browser are type-only, and hand-written copies of paths and guards are checked by a Vitest parity spec. Source: `plans/DECISIONS.md` lines 1086 to 1089 (the Shell rule) and lines 2546 to 2549 (the `/project-store` values, option b); `plans/TRG-01.md` line 225 (web units follow it). TRG-03's plan does not record it (O11).
- **Entity list shape.** GET `PROJECT_ENTITIES_ROUTE` (`packages/contracts/src/project-store/routes.ts` line 27); query `type`, a single optional string (`entities.ts` line 50); response `{entities: [{id, type, path, title?}], invalid: [{path, reason}]}` (`entities.ts` lines 55 to 70). An invalid file is "not resolvable" (PST-08 unit, Decisions).
- **Chips are the Graph runner's.** The drag source, the pinning rules on ports, and chip removal belong to GRR-12 (its unit lines 18 to 20). This plan takes only the drop onto the Tool form's picker (O7).

### 1b. Decisions this plan makes

Each is the smallest reading that meets the unit. Section 7 names the ones a reviewer may want to change.

- **P1 Shape.** One new standalone component, `entity-picker.ts` (planned name), renders both `entity-picker` and `style-picker` fields. `ToolForm` renders it in place of the `picker` branch (`apps/web/src/app/features/tool-registry/tool-form.ts` lines 84 to 86 choose the branch; lines 292 to 309 draw the read-only slot). The `idsOf` helper (line 130) and the `.picker-slot` rule (line 211) go. Basis: TRG-03 plan line 98 (TRG-04 replaces the slot) and its section 1b, D4(a).
- **P2 The browser filters by kind, whatever the request sends.** The picker filters the rows it shows by the field's kinds itself. Basis: the Shell's fake answers by method and path only (`apps/web/src/app/shell/testing/test-doubles.ts` lines 34 and 89), so a test can prove the filter only in the browser. Whether the request also sends `type` is O1.
- **P3 Kinds are read reactively.** The picker reads `entityKinds` from its input through a `computed`, so a changed descriptor re-filters the list. Basis: `units/TRG-15-live-previews.md` line 21 ("changing `x-scriba-entity-kinds` changes what the picker offers").
- **P4 Invalid files are not offered.** The picker lists `entities` only. Basis: the PST-08 unit (not resolvable) and the list shape in section 1a.
- **P5 Value shape.** A scalar entity or style field holds one ID string. A list field holds an array of ID strings. Removing a chip removes its ID and leaves the array (`[]` when it is empty), as TRG-03's `removeItem` does (`tool-form.ts`). Basis: TRG-03 plan D5 and T3.
- **P6 Issue association.** The picker control keeps `aria-describedby` with the field's hint and issue IDs, as TRG-03 does. `ToolForm` keeps rendering the issue paragraphs. Basis: TRG-03 spec T7 (`tool-form.spec.ts` lines 516 to 525) reads the slot's `aria-describedby`.
- **P7 No validation and no resolution in the picker.** Basis: module line 60; TRG-03 plan D8.
- **P8 One write path.** The picker writes through the `value` model that `ToolForm` already owns, so `[(value)]` and `submitted` keep their behaviour.
- **P9 Where the tests live.** The three criteria are tests in `tool-form.spec.ts`, through the host component (the TRG-03 seam). The copy has a parity spec. There is no HTTP test: TRG-04 adds no endpoint, and the list GET is tested by PST-08 (its unit's acceptance criteria).

## 2. Files to create or change

| Path | Change | Purpose |
|---|---|---|
| `apps/web/src/app/features/tool-registry/tool-form.ts` | edit | The picker branch (lines 84 to 86, 292 to 309) is replaced by the picker component. `idsOf` (line 130) and the `.picker-slot` rule (line 211) go. Layouts, defaults (`ngOnInit`, line 578), issues and submit are unchanged. |
| `apps/web/src/app/features/tool-registry/entity-picker.ts` (planned name) | new | The picker component: a scalar mode, a list mode with chips, a drop target, and the style variant. Injects the Shell's `API_CLIENT`. |
| `apps/web/src/app/features/tool-registry/entity-list-copy.ts` (planned name) | new | A hand-written path function for `PROJECT_ENTITIES_ROUTE` and a guard for the list response. Type-only imports from the contract. |
| `apps/web/src/app/features/tool-registry/entity-list-copy.spec.ts` (planned name) | new | The parity spec. It imports the contract's runtime route and schema, as `features/project-store/project-store-contract.spec.ts` lines 1 to 12 does. |
| `apps/web/src/app/features/tool-registry/tool-form.spec.ts` | edit | The canned GET responses in the `beforeEach` (line 240). The comment at line 241 ("The component does no I/O") stops being true and is changed. T1 picker assertions (lines 322 to 338); T4 `.picker-slot` text assertions (lines 450 to 466), while the `value` and `submitted` assertions (lines 468 to 478) stay; T7 picker `aria-describedby` (lines 516 to 525). The TRG-04 tests of section 4. |

Unchanged, checked against the list above:
- `tool-registry.routes.ts` (the entry exports `ToolForm`; the picker stays internal).
- `apps/web/package.json` and `package-lock.json` (they change only if O4 adopts a YAML reader).
- `packages/contracts/**` (it changes only if O6 puts the style kind in the contract).
- `apps/api/**` (the list is PST-08's).
- `apps/web/src/app/shell/**` (read only: `api-client.ts`, `testing/test-doubles.ts`, `project-scope.ts`, `index.ts`).
- `apps/web/src/app/features/project-store/**`.
- `units/`, `modules/`, and `plans/` except `plans/TRG-04.md`.

## 3. Procedure

For the implementer. Steps 5 to 9 wait until O3, O4, O5, O6 and O7 are settled.

1. The Navigator settles the points of section 7 and records each decision in `plans/DECISIONS.md`, as earlier plans did.
2. Start from the commit on main that holds this plan. Confirm the blockers still read done: the status line of `plans/TRG-03.md`, `plans/PST-08.md` and `plans/PST-01.md`.
3. Write `entity-list-copy.ts`: the path of the list (the route template with the project ID encoded where `:projectId` stands) and a guard that accepts the list shape of section 1a and refuses a body without `invalid`. Use type-only imports for the types.
4. Write `entity-list-copy.spec.ts`: the copy's path equals the contract route with `:projectId` replaced; the guard agrees with `entityListSchema` on two valid samples (one with an invalid entry, one without) and on two invalid ones.
5. Write `entity-picker.ts`. Inputs: the field's kinds, the control (`entity-picker` or `style-picker`), the list flag, and the project ID source (O3). A `model` for the value (P5). On init, one GET of the list through `API_CLIENT`, checked by the copy's guard; whether the request carries `type` is O1. A `computed` keeps the entities of the kinds, and drops the invalid rows (P2, P3, P4). The style kind follows O6.
6. Scalar mode: a control that lists the filtered entities (label per O9) and writes one ID.
7. List mode: one chip per ID with its removal control (O9). A drop target (payload per O7) adds an ID of the right kind and refuses any other kind (refusal per O8). The drop writes through `value` (P5).
8. Style mode: the same component with the style kind. The preselect follows O4 and O5. If O5 writes into the value, it writes only when the key is absent, as TRG-03's `ngOnInit` does for defaults (D6).
9. In `tool-form.ts`, replace the picker branch with the component, bound to the field and to `value`. Keep `describedBy(view)` on the control and the issue paragraphs below it (P6). Delete `idsOf` and the `.picker-slot` rule when nothing uses them.
10. In `tool-form.spec.ts`, keep a reference to the fake that `createShellTestDoubles()` builds (`doubles.api`; the `beforeEach` at lines 240 to 243 does not keep it today), and register on it the GET responses that the new code asks for. The fake throws for an unregistered GET (`test-doubles.ts` line 92), so every test that renders a picker needs them. Change the comment at line 241.
11. Change T1, T4 and T7 as section 2 says. Leave every other TRG-03 test as it is. If one of them fails, stop and report; do not change its expectation.
12. Add the TRG-04 tests of section 4, and the parity spec.
13. In `apps/web`, run the test script (`ng test --watch=false`) and the lint script. Run `npx prettier --check` on the changed paths. The lint boundary rule must report no import from another feature.
14. Run `git status --short`: only the paths of section 2 may appear. Commit by path only; never `git add -A` or `git commit -a`.

## 4. Acceptance criteria and tests

One test per criterion (unit lines 23 to 25). All are UI tests: the host renders `ToolForm`, the Shell's fake answers the list GET, and the test reads the rendered DOM and the `value` and `submitted` outputs. None calls an HTTP route.

| Criterion | Test | Passes when | Depends on |
|---|---|---|---|
| 1. A mixed-type fixture: the picker offers only the field's kinds (unit line 23) | `TRG-04 AC1: the entity picker offers only the kinds of its field` | A spec-local list field (kinds `['person']`) with a canned list of person, place, claim and style-profile entities plus one invalid entry renders exactly the person IDs, in list order. No other ID appears in the picker's DOM. | P2, P4; O1 (the fake ignores `type`, so the browser filter is what passes), O3 |
| 2a. List fields accept several and render chips (unit line 24) | `TRG-04 AC2a: a list field renders one chip per value` | `entityIds` with `['ada', 'bob']` renders two chips with those IDs, and no read-only text. | O9 (chip markup) |
| 2b. A dropped chip of the right kind is added (unit line 24) | `TRG-04 AC2b: a dropped chip of the right kind is added` | A drop of a person chip on `entityIds` adds its ID to `value.entityIds`, and a submit emits it in `submitted`. | O7 (payload and target) |
| 2c. A wrong-kind chip is refused (unit line 24) | `TRG-04 AC2c: a dropped chip of the wrong kind is refused` | A drop of a place chip leaves `value` equal to what it was before the drop. The refusal shows as O8 decides. | O7, O8 |
| 3. The style picker preselects the project's style profile (unit line 25) | `TRG-04 AC3: the style picker preselects the project's style profile` | With the project source answering `house-style`, the style picker shows `house-style` as selected. `value.styleProfile` is `house-style`, or absent, as O5 decides. | O3, O4, O5, O6 |

Support tests. They check agreements, not new behaviour:
- **X1 Parity.** `entity-list-copy.spec.ts` (section 3, step 4).
- **X2 Reactive kinds.** Changing the host's field descriptor from kinds `['person']` to `['place']` re-filters the list (P3; TRG-15 unit line 21).
- **X3 The TRG-03 suite.** T2, T3, T5, T6, T8, E1 and E2 pass unchanged. T1, T4 and T7 change as section 2 says and keep their `value` and issue assertions.

Drop tests. jsdom 30.1.3 has no `DataTransfer` and no `DragEvent` (checked: no match in `node_modules/jsdom/lib`). AC2b and AC2c therefore dispatch a plain event that carries a stand-in data-transfer object (assumed workable; section 8b). The payload itself is O7.

No HTTP test. The list's HTTP behaviour is PST-08's and is tested there. The parity spec checks the copy against the contract's route and schema.

## 5. Downstream agreement

- **TRG-05 (spike gate, `units/TRG-05-spike-gate.md` line 7, blocked by TRG-04).** Its criterion (line 22) needs the picker in the running dev app and a dropped chip accepted there. Two facts constrain it. The dev route sits on `/tools` (its line 17), and `/tools` has no project in its URL (`units/TRG-13-tools-page-list.md` line 15; `modules/shell.md` line 57). So the project source must work without a URL (O3). Also, no chip source exists before GRR-12 (O7). TRG-05 needs both settled; TRG-04 provides the drop target and the payload check.
- **TRG-03 (done).** Its plan says the pickers are TRG-04's (`plans/TRG-03.md` lines 98 and 107). The value round trip (T4 `value` and `submitted`) and the issue link (T7) stay. Only the slot assertions change (section 2).
- **TRG-02 (done) and the caller rule.** TRG-02's D4 (`plans/TRG-02.md` line 41) assumes a caller fills an empty style field. A preselect that writes into `value` (O5) makes the field non-empty before the call; that is consistent with D4, and the choice is O5's.
- **TRG-16 (Try panel, no plan yet, `units/TRG-16-try-panel.md` line 15).** It fills an empty style field from the project's style profile and resolves the picked IDs in the browser. It therefore needs the same project source and style source as O3 and O4, and the picker's value shape (P5) is its input.
- **TRG-15 (live previews, no plan yet, `units/TRG-15-live-previews.md` line 21).** Changing `x-scriba-entity-kinds` must change the picker's offer, which P3 provides.
- **GRR-11 (tool nodes, `units/GRR-11-tool-nodes-wires.md` line 18).** The node body uses `ToolForm` in node-body layout, so the picker also appears among the `params`. The canvas runs under `/projects/:id`, so the project source works there whatever O3 decides.
- **GRR-12 (entity chips, `units/GRR-12-entity-side-list-chips.md` lines 7 and 18 to 20, blocked by GRR-11 and PST-08).** Its side list is the chip source, and its port drops pin chips into `params` with refusal reasons. TRG-04's drop is the Tool form's. The two must share one payload (O7). GRR-12 is in M4, so TRG-04 cannot wait for it.
- **PST-08 (done, `plans/PST-08.md` section 5, the TRG-04 entry at line 153).** It hands the multi-kind question to this plan (O1). The list GET is used unchanged.
- **PST-01 (done, `units/PST-01-contract-slice.md` line 9 lists TRG-04 in `unblocks`).** The entity list shape it publishes is the one this plan copies.
- **AGL-09 and TRG-12 (`units/AGL-09-narrative-tools.md` line 19, `units/TRG-12-executor.md` line 31).** They fill an empty style field before a call. Nothing here changes that.

## 6. Shared files with draft or planned plans

The draft and planned plans at `5111a16`: `plans/GRR-01.md` (draft), `plans/MPR-08.md` (planned) and `plans/SHL-14.md` (planned; the status changed from draft at `5111a16`). None of them changes a file of section 2 (checked against each plan's section 2).

- **GRR-01 (draft).** New files under `packages/contracts/src/graph-runner/`, the graph-runner index and graph-runner tests. Its scope sentence (`plans/GRR-01.md` line 101) says `apps/`, `src/tool-registry` and `src/project-store` do not change. It only imports types from `/tool-registry`. Overlap with TRG-04: none. Either order is correct.
- **MPR-08 (planned).** Changes `apps/api/test/providers-gate.test.ts` (new) and one line in `modules/providers.md` (`plans/MPR-08.md` lines 48 to 54). Overlap: none. Either order is correct.
- **SHL-14 (planned).** Adds `apps/web/src/app/shell/unsaved-text.ts` and its spec, changes `markdown-editor.ts` and its spec, and appends one line to `apps/web/src/app/shell/index.ts` (its section 2c rule: each Shell unit appends after the last line on main at its merge time). It must not change `testing/test-doubles.ts`, `api-client.ts` (read only) or `features/**` (its section 2d, lines 100 to 102). TRG-04 adds no Shell export and reads `API_CLIENT`, `ApiPath` and `ResponseSchema` unchanged. If a Shell export were needed, TRG-04 would follow the same append rule. Either order is correct.

Units without a plan that will change the same files: TRG-05 and TRG-13 (both touch the Tool registry's routes and the `/tools` route, `units/TRG-13-tools-page-list.md` line 15). Their blockers already order them after TRG-04 (`units/TRG-05-spike-gate.md` line 7; TRG-13 is blocked by TRG-05 and TRG-11), so no rule is needed now.

## 7. Open points

The unit and the repository do not settle these. Each is listed with its options and its effect. The plan decides none of them.

- **O1 The `type` filter takes one value.** The list GET's query `type` is a single optional string (`entities.ts` line 50), and the Shell's client takes `params` as `Record<string, string>` (`apps/web/src/app/shell/api-client.ts` line 28). Options: (a) send no `type` and filter every row in the browser; (b) one GET per kind, merged in the browser; (c) send `type` only when the field has one kind. A repeated `type` is not expressible with the current client. Effect: request count only. The browser filter (P2) is needed under all three. PST-08's plan (line 153) hands this question to this plan.
- **O2 Absent `x-scriba-entity-kinds`.** The unit filters by the kinds but does not say what an entity field without them offers. Options: every valid entity; none. TRG-07's rule (`units/TRG-07-lint-pack-lint-cli.md` line 19) makes the hint optional on `entity` fields. Checked: the fixture's `styleProfile` has no hint (`apps/api/test/fixtures/packs/core/tools/cold_open.yaml` lines 21 to 25), and the TRG-03 spec's `entityIds` has none either (spec lines 77 to 82).
- **O3 Which project does the picker read.** Options: (a) the URL's project ID through `ActiveProjectSignal` (`apps/web/src/app/shell/project-scope.ts` line 75; line 76 injects `Router`; TRG-03's TestBed configures no router, and the injection in that spec is assumed to work, not run); (b) the server's active project through GET `/api/project-store/active` (the answer is `{active}`, `packages/contracts/src/project-store/project.ts`; the web copy `activeCopy` lives in `features/project-store`, which this feature cannot import); (c) a required `projectId` input on `ToolForm`, which changes TRG-03's API and every consumer (GRR-11, TRG-05, TRG-13, TRG-16). Facts: `/tools` has no project in its URL (TRG-13 line 15), so (a) cannot serve TRG-05's dev route. `project-scope.ts` line 72 says features that need the server's answer read GET active. The unit's "active project" matches the module's "the one active project" (`modules/project-store.md` line 3).
- **O4 Where the project's style profile comes from.** The browser has no source today. Facts: the project summary has no `styleProfile` (`packages/contracts/src/project-store/project.ts`, `projectSummarySchema`); no route returns a project's settings (`routes.ts`); `projectYamlSchema` has `styleProfile` (`project.ts` line 24); the file read returns `project.yaml`'s text (`files.service.ts` line 257; `files.ts`, `fileReadSchema`); `apps/web/package.json` has no YAML package. Options: (a) read `project.yaml` through the file GET and take `styleProfile` from the text (a YAML reader, which is a new dependency, or a line match); (b) add the value to a Project store read, a PST change with its own plan; (c) no preselect in the browser, so the caller fills an empty style field (TRG-02 D4). Option (c) does not meet criterion 3 as written. The same value serves TRG-16.
- **O5 Does the preselect enter `value`?** Options: (a) write it into `value` while the key is absent, so `submitted` carries it; (b) show it only, and leave `value` empty for the caller's fill (TRG-02 D4). The unit says "preselects", which fits either reading. The choice sets AC3's assertion.
- **O6 Where the style kind lives.** The unit names `style-profile`. The style field has no `x-scriba-entity-kinds` (fixture lines 21 to 25), and TRG-07's rule allows the hint only on `entity` fields. Options: (a) a constant in the web feature, with a parity check; (b) a constant in `packages/contracts/src/tool-registry/constants.ts` (a change to TRG-01's slice); (c) a new hint on style fields (a vocabulary change, expand–contract, with TRG-07 changed). GRR-12's style-port drop check uses the same kind (GRR-12 line 19).
- **O7 The drop payload and its targets.** Facts: no drag-and-drop code exists in `apps/web/src` (checked by grep for `dataTransfer`, `dragover`, `CdkDrag`, `ondrop` and `(drop)`); GRR-12, which creates chips, is in phase:canvas at M4 (GRR-12 front matter, lines 5 to 7); jsdom has no `DataTransfer` or `DragEvent` (section 4). Points to settle: (a) the payload (its MIME type, its fields, the type that names it, and whether it lives in the contract or the feature); (b) whether the picker is a drop target only in the form layout, while the canvas port drops stay GRR-12's (GRR-12 lines 18 to 20); (c) the chip source for TRG-05's running-app criterion (unit line 22) before GRR-12 exists.
- **O8 How a wrong-kind chip is refused.** The unit says "refused" and nothing else. GRR-12 says refusals "show a short reason" (GRR-12 line 19). Options: no visible change (value unchanged); an inline message next to the picker, in the style of TRG-03's issues; a notice through the Shell's `NoticesService` (exported by `apps/web/src/app/shell/index.ts` line 7).
- **O9 Widget details the unit leaves open.** (a) The single-ID control: a select, or a search field (GRR-12 asks for search on its own side list). (b) The label of an entity: `title` when present, else the ID (`entities.ts`, the list item's optional `title`). (c) Chip removal, which the unit does not state (GRR-12's story 17 covers removing its pinned chips). (d) A drop onto a single-ID field: replace or refuse. (e) When the list is read: at init only, or again on a reconcile tick (SHL-03's pattern), and what the picker shows while loading or after a failed GET (the fake has `fail`, `test-doubles.ts` line 54).
- **O10 The front matter of the unit.** `blocked_by` (unit line 7) holds PST-01 and PST-08 in one quoted string, where `units/README.md` lines 61 to 64 want one entry per dependency. The inverse rule holds: PST-01 (line 9) and PST-08 (line 9) both list TRG-04 in `unblocks`. Any change to the unit belongs to the Navigator; this plan changes no unit.
- **O11 The copy route for feature units.** `plans/TRG-01.md` line 225 says TRG-03's plan decides how web units copy contract values. `plans/TRG-03.md` does not record it (checked: no "parity", "hand-written" or "copies" in it). This plan follows the Shell's route (section 1a). The Navigator should confirm that feature units use the same route.

## 8. Facts checked and facts assumed

### 8a. Checked (at main `5111a16`; the first read was at `9cf0218`)

- **Blockers done.** `plans/TRG-03.md`, `plans/PST-08.md`, `plans/PST-01.md`: status `done`. TRG-03's unit lists TRG-04 in `unblocks` (line 9); PST-08's unit (line 9) and PST-01's (line 9) do too. `units/TRG-04-entity-style-pickers.md` has no change note of its own; its only commit on main is `2fed3f4` (2026-11-10, the consolidation of the units folder). The one recent change in the area is PST-08's reword (`8132c14`, PST-08 unit line 23), about resolution errors, not the list.
- **Parallel and downstream.** TRG-04's `parallel_with` (TRG-02, TRG-06) is symmetric (their front matter, lines 8 and 8). `unblocks` (TRG-05) is the inverse of TRG-05's `blocked_by` (line 7). No other unit names TRG-04.
- **Queue.** `plans/QUEUE.md` line 8: TRG-04 "available: yes, all blockers done".
- **Entity list in the composed app.** `apps/api/src/modules/project-store/project-store.module.ts` line 35 registers `EntitiesController`; line 54 exports `EntitiesService`. The list is `entities.service.ts` lines 25 to 29 (the `type` filter, one value), and `entities.controller.ts` serves `PROJECT_ENTITIES_ROUTE`.
- **Contract shapes.** `packages/contracts/src/project-store/entities.ts`: `entityListQuerySchema` line 50, `entityListSchema` line 55. `routes.ts` line 27: `PROJECT_ENTITIES_ROUTE`. `project.ts` line 24: `styleProfile` in `projectYamlSchema`.
- **Current picker.** `apps/web/src/app/features/tool-registry/tool-form.ts`: `kindOf` lines 84 to 86 (picker first), `idsOf` line 130, `.picker-slot` CSS line 211, the `picker` case line 292 and its slot at line 300, `value` model line 511, `ngOnInit` line 578. The picker is read-only text today.
- **TRG-03 spec.** `apps/web/src/app/features/tool-registry/tool-form.spec.ts`: `beforeEach` line 240 (comment line 241, "The component does no I/O"); TestBed providers line 243 from `createShellTestDoubles()`; T1 line 309 (picker assertions to line 338); T4 line 438 (picker text lines 450 to 466; `value` and `submitted` lines 468 to 478); T7 line 480 (picker `aria-describedby` lines 516 to 525). The spec's fixture gives `person` the kinds `['person']` (spec line 67) and leaves `entityIds` without kinds (spec lines 77 to 82; relevant to O2).
- **Shell fakes.** `apps/web/src/app/shell/testing/test-doubles.ts`: `routeKey` line 34; `FakeApiClient` line 43; `requests` line 45; `respond` line 49; `fail` line 54; the canned lookup line 89; the "No canned response" error line 92; `createShellTestDoubles` lines 187 to 199 (API_CLIENT, SSE_CLIENT and an HttpBackend that throws).
- **Shell client.** `apps/web/src/app/shell/api-client.ts`: `ApiPath` line 13 (`/${string}`); `get<T>` lines 25 to 28, with `params?: Record<string, string>` at line 28.
- **Shell exports.** `apps/web/src/app/shell/index.ts`: `NoticesService` line 7; `ActiveProjectSignal` line 11. `project-scope.ts`: the doc on the server's answer line 72; the class line 75; `inject(Router)` line 76.
- **Parity precedent.** `apps/web/src/app/features/project-store/project-store-contract.ts` header (copies, types only, checked by the spec) and `project-store-contract.spec.ts` lines 1 to 12 (a plain import of the contract's runtime routes and schemas). The header cites "K1", but the spec has no test named K1 (its `describe` is "project-store copies", line 74).
- **Boundary.** `eslint.config.mjs` line 41 (the `*.routes.ts` entry pattern), line 50 (R1), lines 60 to 67 (the web-feature policy). `apps/web/src/app/features/project-store/project-store.routes.ts` exports only `projectsRoutes`, `filesRoutes` and `ActiveProjectNav`.
- **Fixtures and styles.** `apps/api/test/fixtures/packs/core/tools/cold_open.yaml` lines 21 to 25: `styleProfile` has `x-scriba-type: style` and `x-scriba-port: true` and no `x-scriba-entity-kinds`. `style-profile` appears on main only in units, modules and the contract's pattern test (`packages/contracts/test/tool-registry.consumers.test.ts` line 118); no file under `examples/` has one.
- **No drag code.** `apps/web/src` has no `dataTransfer`, `dragover`, `CdkDrag`, `cdkDrag`, `ondrop` or `(drop)`.
- **jsdom.** `node_modules/jsdom` is version 30.1.3; its `lib` has no `DataTransfer` and no `DragEvent`.
- **Web test setup.** `apps/web/package.json`: scripts `test` (`ng test --watch=false`) and `lint`; the test builder is `@angular/build:unit-test` (`apps/web/angular.json`); devDependencies include `jsdom` and `vitest`; no `yaml` package is listed.
- **Server read path for project.yaml.** `apps/api/src/modules/project-store/files.service.ts` line 257 (`read`); line 105 (`isRootProjectYaml`).
- **Rules and decisions.** `units/README.md` lines 57 (heading parenthetical), 61 to 64 (blocker notation), 136 (testing). `modules/tool-registry.md` lines 38 (module shape), 45 (picker and entity list), 50 to 52 (testing and fixtures), 60 (resolution is the callers'). `plans/DECISIONS.md` lines 1086 to 1089 and 2546 to 2549. `plans/TRG-01.md` line 225. `plans/TRG-02.md` lines 41 and 196. `plans/TRG-03.md` lines 98 and 107.
- **Other plans.** `plans/GRR-01.md` (draft; section 2 scope at line 101); `plans/MPR-08.md` (planned; section 2 at lines 48 to 54); `plans/SHL-14.md` (planned; section 2c at line 94; section 2d at lines 100 to 102). None of their listed files is in section 2 of this plan.

### 8b. Assumed (not run, or not verified here)

- The web test script and the lint script pass on main. Not run.
- The Angular unit-test builder runs its tests under jsdom. Not verified; the devDependencies list jsdom and no other DOM library.
- A plain event carrying a stand-in data-transfer object reaches the picker's drop handler under the Angular test runner (AC2b and AC2c depend on it). Not run.
- The TRG-03 tests that render a picker still pass once they register an empty or small list for the picker's GET. Not run.
- Nothing on main reads the entity list yet, so the read pattern of O9(e) has no precedent to check.
- The `title` of an entity is a label only; the picker never uses it as a value. This follows from the unit's "value is an ID" reading (section 1a).
