---
id: TRG-09
status: done
---
# TRG-09 plan — read endpoints, functions, the enable switch and the params proof

Unit: TRG-09 (module Tool registry, `phase:loader-validation`, M2). The unit file `units/TRG-09-read-endpoints-enabled.md` has its front matter at lines 2 to 9, its Why at line 15, its decisions at lines 18 to 20 and its criteria at lines 23 to 26. Revision 1 (the planner) was checked at `main` `4dbe960`. Revision 2 (the reviser, 2026-11-15) was checked at `main` `e197e40`; `git diff --stat 4dbe960 e197e40` lists only this plan. Revision 2 corrections are listed in section 9.

Availability (checked): `plans/QUEUE.md` line 9 lists `TRG-09 | M2 | available: yes`. Before revision 1, no `plans/TRG-09.md` existed; no `unit/TRG-09` branch exists (`git branch -a`). The only blocker is `TRG-06`, and `plans/TRG-06.md` front matter says `status: done`. The unit file has no status field, and it is not blocked.

## 1. Decisions this plan obeys

### 1a. Settled by the unit, the Navigator, or a merged plan

- **Routes.** GET: `TOOLS_ROUTE` (summaries, optional `genrePack` query), `TOOL_ROUTE` (exists), `TOOL_BUILTIN_ROUTE`, `TOOL_USER_ROUTE`, `FUNCTIONS_ROUTE`, `ENTITY_TYPES_ROUTE`. POST: `TOOL_ENABLED_ROUTE`. `TOOL_VALIDATE_ROUTE` exists from TRG-02. Source: unit line 18; `packages/contracts/src/tool-registry/routes.ts`. `TOOL_USER_ROUTE` is the Navigator's option (ii): `plans/DECISIONS.md` line 3620, `plans/TRG-01.md` lines 134 and 247.
- **Invalid entries.** For a file that cannot be parsed or is refused, the summary has `output` null, `description` `''`, `enabled` false and `error`. The detail has `spec` and `views` null and keeps `source` and `lint`. Source: unit line 18; `plans/DECISIONS.md` lines 3409 to 3414 (option A); `plans/TRG-01.md` line 104 (D11).
- **Missing copies.** `/user` for a name with no user file, and `/builtin` for a name with no built-in, return `TOOL_NOT_FOUND` (404). Source: `plans/TRG-01.md` line 134 chose this for `/user`. This plan applies the same rule to `/builtin`.
- **Validate.** Full or `params`. Params mode removes the port keys from the arguments before validation and compiles the required list without ports, so a pinned port value is never checked and a missing port is never required. Source: unit line 19; `packages/contracts/src/tool-registry/call.ts` (`toolValidateRequestSchema` requires `mode`).
- **Enable switch.** The spec's `enabled` is the default. The author's override is the `tools` section `{schemaVersion: 1, enabled: {<name>: boolean}}`, and only overridden tools appear. Toggling never creates a copy-on-write fork. A disabled tool is left out of function schemas and refused by the executor (TRG-12), and it stays listed, editable and on the canvas. Source: unit line 20; `toolsSectionSchema` in `packages/contracts/src/tool-registry/settings.ts`; `plans/TRG-01.md` line 135 (D15).
- **Lint and the switch.** A tool that fails lint keeps the author's switch. The offering rule is `enabled && valid`. Source: `plans/DECISIONS.md` line 3440; `plans/TRG-06.md` line 56 (C6).
- **Loading.** Built-ins are read once at start. The user pack is re-scanned by its manifest before each read, and a scan never creates a folder. Source: `plans/TRG-06.md` line 30 (S4) and line 59 (C9). The switch is keyed by tool name, so it survives a built-in update at the next start.
- **Genre for offering.** The catalog takes the genre pack as a parameter and never reads `project.yaml` (`plans/TRG-06.md` line 56, C6). TRG-06 hands the active project's pack to this unit for `GET …/functions` (`plans/TRG-06.md` line 152). The read goes through the Project store's in-process file API, the same way `units/MPR-12-project-override-api.md` line 18 reads the `model` field.
- **Events.** TRG-10 publishes `catalog-changed` from the catalog's `onChange` listeners, and it names a toggle as one trigger (`units/TRG-10-save-delete-catalog-changed.md` line 21). A toggle therefore calls the listeners with the tool name (`apps/api/src/modules/tool-registry/catalog.service.ts` line 127, `onChange`).
- **Module boundaries.** A module is imported only through its entry file (rule R1, `eslint.config.mjs`). The Project store entry `apps/api/src/modules/project-store/project-store.module.ts` exports `ProjectStoreService` and `FilesService` (lines 59 to 65). The Platform entry exports `SettingsService`.
- **Settings section.** `tools` is one of the fixed keys (`packages/contracts/src/platform/settings.ts`). A module registers its section with a `SettingsSectionDef` before boot, as `apps/api/src/modules/agent-loop/agent-settings.section.ts` and the `AgentLoopModule` registration provider do.
- **Testing.** External behaviour only: HTTP responses and files on disk. The seam is the module in `createTestApp`, with the guard, a temp library and `SCRIBA_PACKS_DIR` at the fixture packs (`modules/tool-registry.md`, Testing principles; `units/README.md`, Conventions, Testing).
- **Invariant sweep.** A route template that contains `:` needs an entry in `FIXTURE_PATHS` in `apps/api/test/invariant-sweep.ts` (header lines 4 to 5; lookup lines 183 to 189). The sweep requests the GET routes and checks that they change nothing.

### 1b. Choices this plan makes

- **C1 Removing an override (open point 1, resolved).** A toggle to the spec's `enabled` value removes the tool's key from `enabled`. Any other value writes the key. Source: "only overridden tools appear" (unit line 20; `modules/tool-registry.md` line 43). Keeping a key equal to the default would make a non-overridden tool appear.
- **C2 Section default.** `defaultValue: null`, so the `tools` section is absent until the first override. `plans/PLT-07.md` line 168 and `plans/TRG-01.md` D15 leave the default to this unit. `null` matches the providers section (`apps/api/src/modules/providers/providers.section.ts`), and a fresh install writes no `tools` key.
- **C3 No-op toggle.** A toggle that leaves the effective value unchanged writes nothing and notifies nobody. It answers with the current summary.
- **C4 Answer of the toggle.** `POST …/enabled` answers with the effective `ToolSummary` (the existing `toolSummarySchema`). No new schema.
- **C5 Active genre (open point 7, resolved).** The active id comes from `ProjectStoreService.activeId()` (returns `string | null`, `project-store.service.ts` line 46). With `null`, there is no genre. Otherwise `FilesService.read(id, 'project.yaml')` is parsed with `yaml` and checked with `projectYamlSchema` from `@bbartolome/scriba-contracts/project-store`. Any failure (not found, too new, invalid) gives no genre. No genre means core and user only. Source: the rule for an unknown genre pack, `plans/TRG-06.md` line 56 (C6), already implemented by `offeredOrigins` (`catalog.service.ts` lines 56 to 62). It is the simplest option: no new error code.
- **C6 Lint (open point 5, resolved).** No new lint code. `detail` keeps the existing `lint: []` (`catalog.service.ts` lines 154 and 162) and the summary keeps the existing zero `lintCounts` (line 76). TRG-07 fills them. Source: the module graph gives TRG-09 only TRG-06 as a need (`modules/tool-registry.md` line 20) and puts the lint rules in TRG-07 (line 19; `units/TRG-07-lint-pack-lint-cli.md` lines 69 to 72); TRG-09 line 18 requires the `lint` field in the detail, which exists; no TRG-09 criterion (lines 23 to 26) names lint. Revision 1's `lintOf` helper is dropped (not needed by any criterion or downstream unit).
- **C7 Unknown keys.** The write keeps every key of the current `tools` section except `enabled`. The section schema is loose (`toolsSectionSchema`, `packages/contracts/src/tool-registry/settings.ts` line 31).
- **C8 Reads and a malformed section (open point 3, resolved).** Each read reads the settings file again; nothing is cached, as `agent-settings.service.ts` (line 10) does. Enable changes take effect on the next call. The section is read with `toolsSectionSchema.safeParse`; an absent or malformed section counts as no overrides, and the next toggle rewrites `enabled` (keeping other keys, C7). Source: the precedent `ProjectStoreService.activeId()` (`project-store.service.ts` lines 46 to 50), which safe-parses its section and treats a malformed one as none. It needs no boot check.
- **C9 Toggling an invalid tool (open point 2, resolved).** Allowed. The override is stored by name, and the summary keeps `enabled: false` while the entry is invalid (TRG-01 option A). Source: unit line 20 (disabled tools are "still listed and editable"; nothing in the unit refuses a toggle); `plans/DECISIONS.md` line 3440 (a tool that fails lint keeps the author's switch). It is the simplest option: no new refusal, and TRG-13's toggle on an invalid row needs no error path.
- **C10 The effective switch is read from the summary (open point 4, resolved).** No contract change. `GET …/tools/:name` returns the file's `spec`, whose `enabled` is the default (unit line 20: "the spec's `enabled` is the default"). The author's effective switch is the summary's `enabled` (list and toggle answer). Source: `toolDetailSchema` has no switch field, and `/tool-registry` changes only by expand–contract (`units/README.md`, Conventions, Contracts). TRG-13 (unit line 16) reads the switch from the list; TRG-14 (lines 16, 17, 23) does not read the switch.

## 2. Files to change

| Path | Change | Purpose |
|---|---|---|
| `apps/api/src/modules/tool-registry/tools.section.ts` | new | `TOOLS_SECTION_DEF`: key `tools`, version `TOOLS_SECTION_SCHEMA_VERSION`, default `null` (C2), no migrations |
| `apps/api/src/modules/tool-registry/tool-switches.service.ts` | new | `ToolSwitchesService` (injects `SettingsService`): `overrides()` returns the `enabled` map, `{}` when the section is absent or malformed (`safeParse`, C8); `save(enabled)` writes the section and keeps unknown keys (C7) |
| `apps/api/src/modules/tool-registry/active-genre.service.ts` | new | `ActiveGenreService` (injects `ProjectStoreService` and `FilesService` from the Project store entry file): `genrePack(): string \| undefined` (C5) |
| `apps/api/src/modules/tool-registry/tool-registry.module.ts` | edit | `imports: [PlatformModule, ProjectStoreModule]` from entry files; a registration provider for `TOOLS_SECTION_DEF` as `AgentLoopModule` does; providers `ToolSwitchesService` and `ActiveGenreService` added; exports stay `CatalogService` only |
| `apps/api/src/modules/tool-registry/catalog.service.ts` | edit | switch-aware summaries, list and functions (`enabledOf`); `detailOf`, `builtinDetail`, `userDetail`; `setEnabled`; private `notify`; lint fields unchanged (C6). The module-level `isEnabled` (line 65) is replaced. Constructor gains `ToolSwitchesService` |
| `apps/api/src/modules/tool-registry/tools.controller.ts` | edit | six new handlers: `GET` list (query), `GET` functions, `GET` entity-types, `GET` builtin, `GET` user, `POST` enabled. The two existing handlers stay as they are |
| `apps/api/test/invariant-sweep.ts` | edit | three `FIXTURE_PATHS` entries after the `/validate` entry (lines 117 to 119): `…/tools/:name/builtin`, `…/user`, `…/enabled`, each on `no-such-tool` |
| `apps/api/test/tool-registry-read-enable.test.ts` | new | tests T1, T2, T4 and E1 (Part 1), then T3 (Part 2), section 4 |
| `plans/TRG-09.md` | new | this plan (the planner commits it alone) |

Not changed, on purpose:

- `packages/contracts/**`. Every route constant, schema and settings type that this unit needs exists already (`routes.ts`, `catalog.ts`, `settings.ts`, `call.ts`, `constants.ts`).
- `apps/api/src/modules/tool-registry/packs.ts`, `validate.ts`, `emit.ts`, `entity-types.ts`, `inputs.ts`. The params rule is already implemented in `validate.ts` (section 7).
- `apps/api/test/tool-registry-api.test.ts` and `apps/api/test/tool-registry-loader.test.ts`. They must pass unedited. `plans/TRG-05.md` line 59 relies on the first one staying unedited.
- `apps/api/test/fixtures/packs/**`. The tests copy the fixtures into a temp folder and never edit them.
- `apps/web/**`. The Tools page belongs to TRG-13.
- The Project store module. This plan only imports its entry file.

## 3. Procedure

Run from `/Users/bbartolome/workspace/scriba-prototype` in a worktree on branch `unit/TRG-09`, created from `main`. Record `node -v` and `npm -v` beside each result. Do not push. The steps are in two review parts (section 8).

### Part 1: the switch and the read routes

1. **Baseline.** `git worktree add <path> -b unit/TRG-09 main`, then `npm test -w @bbartolome/scriba-api -- tool-registry` on the unchanged tree. Expected: exit 0 (the TRG-02, TRG-06 and TRG-08 test files pass before any edit).
2. **Section.** Create `tools.section.ts` (section 2). Expected: one export, `TOOLS_SECTION_DEF`, with key `tools` and `defaultValue` null.
3. **Switch store.** Create `tool-switches.service.ts` (section 2, C7 and C8). Expected: `overrides()` returns `{}` when the section is absent, and the `enabled` map when it is present and valid.
4. **Active genre.** Create `active-genre.service.ts` (C5). Expected: `genrePack()` returns `undefined` with no active project, and the `genrePack` of `project.yaml` otherwise.
5. **Module.** Edit `tool-registry.module.ts` (section 2). Expected: the module imports `PlatformModule` and `ProjectStoreModule` from their entry files, and the registration provider calls `settings.register(TOOLS_SECTION_DEF)`.
6. **Catalog.** Edit `catalog.service.ts`, in this order:
   a. The constructor gains `ToolSwitchesService`.
   b. The module-level `isEnabled(tool)` goes. A public `enabledOf(tool: LoadedTool): boolean` returns the override for `tool.spec.name` when there is one, and `tool.spec.enabled` otherwise. Loops read the overrides once and pass them to a private helper.
   c. `summaryOf` takes the overrides. An invalid row keeps `enabled: false`.
   d. `list` and `functions` use the switch. Each reads the overrides once per call.
   e. `detail(name)` becomes `detailOf(resolve(name))`. `detailOf(entry: ToolEntry): ToolDetail` holds the existing branch logic unchanged, including `lint: []` (C6).
   f. `builtinDetail(name)` reads `builtins`, and `userDetail(name)` reads `userScan.entries`. Each calls `refresh()` first. A missing entry throws `TOOL_NOT_FOUND`.
   g. `setEnabled(name, enabled): ToolSummary`. Refresh, then resolve (`TOOL_NOT_FOUND` for an unknown name). Compare the effective value with the new one. If they are equal, return the summary (C3). Otherwise, for a valid entry, remove the key when `enabled` equals `spec.enabled` and write it otherwise (C1). For an invalid entry, always write it (C9). Then call `switches.save(map)`, call `notify([name])`, and return the summary of the effective row (C4).
   h. `refresh()` calls a private `notify(names)` instead of its own loop.
   Expected: `ToolSummary.enabled` and `functions()` follow the switch. `packs.ts`, `validate.ts` and `emit.ts` are not touched.
7. **Controller.** Edit `tools.controller.ts` (section 2). Six handlers are added: `list` (`@Get(TOOLS_ROUTE)`, `@Query(new ZodValidationPipe(toolListQuerySchema))`), `functions` (`@Get(FUNCTIONS_ROUTE)`, genre from `ActiveGenreService`), `entityTypes` (`@Get(ENTITY_TYPES_ROUTE)`), `builtin` (`@Get(TOOL_BUILTIN_ROUTE)`), `user` (`@Get(TOOL_USER_ROUTE)`), and `enabled` (`@Post(TOOL_ENABLED_ROUTE)`, `@HttpCode(200)`, `@Body(new ZodValidationPipe(toolEnabledRequestSchema))`). Expected: the controller has eight handlers.
8. **Sweep.** Add the three `FIXTURE_PATHS` entries to `apps/api/test/invariant-sweep.ts` (section 2). Expected: `grep -c "tool-registry/tools/no-such-tool" apps/api/test/invariant-sweep.ts` prints `5` (the two existing entries and the three new ones).
9. **Tests.** Write `apps/api/test/tool-registry-read-enable.test.ts` with T1, T2, T4 and E1 (section 4). Use `createTestApp`, `send`, `sessionCookie`, `LOOPBACK_HOST`, `LOOPBACK_ORIGIN` and `makeLibrary`, as `tool-registry-api.test.ts` does. Each test removes its own temp library and packs copy in a `finally`. T2 and T4 are also the check of assumption A7 (section 7).
10. **Part 1 gate.** `npx prettier --write` on each changed or new file. Then `npm test -w @bbartolome/scriba-api -- tool-registry invariant`. Expected: exit 0. T1, T2, T4 and E1 pass, the TRG-02, TRG-06 and TRG-08 files (`tool-registry-api.test.ts`, `tool-registry-loader.test.ts`, `tool-registry-template.test.ts`) still pass, and the invariant files pass. Then `git diff --quiet main -- apps/api/test/tool-registry-api.test.ts apps/api/test/tool-registry-loader.test.ts` exits 0.

### Part 2: the params proof and the gates

11. **Params test.** Append T3 to `tool-registry-read-enable.test.ts` (section 4).
12. **Run T3.** `npm test -w @bbartolome/scriba-api -- tool-registry-read-enable`. Expected: exit 0 and T3 passes with no code change, because `validate.ts` lines 93 to 101 already drop the port keys in params mode. If T3 fails, stop and report. The params rule would then need a code change that this plan does not contain.
13. **Mutation check.** Each mutation is temporary and is reverted before the next one. (a) `enabledOf` returns `tool.spec.enabled` only: T1 and E1 must fail. (b) `setEnabled` also creates a file under `.scriba/packs/user/tools`: T2 must fail. (c) `validateArguments` does not drop the port keys in params mode: T3 must fail. Expected: each mutation fails the named test, and `git status --short` is clean after the last revert.
14. **Root gates.** From the root: `npm run build`, `npm test` and `npm run lint`. Expected: each exits 0. `npm run lint` ends with `All matched files use Prettier code style!`.
15. **Commit.** On `unit/TRG-09`, commit the section 2 paths only, with the message `feat(TRG-09): read endpoints, functions and the enable switch`. Expected: `git status --short` prints nothing after the commit.

## 4. Acceptance criteria and tests

One test per criterion (T1 to T4). E1 is an extra decision test, not a criterion test (open point 8, resolved: kept, because unit line 18 and the Why (35) name the active project's functions and no criterion covers that path; `plans/TRG-06.md` line 152 hands the genre read to this unit). Every test uses `createTestApp` through the real routes, with the guard, a temp library and `SCRIBA_PACKS_DIR` set to a temp copy of `apps/api/test/fixtures/packs`.

| Criterion (unit line) | Test | Part | Pass condition |
|---|---|---|---|
| 1. Disabling removes the tool from `GET /functions`; the switch persists across an app restart and a built-in update (line 23) | **T1** `a disabled tool stays out of functions after a restart and after a built-in update` | 1 | Boot A, then `POST …/tools/cold_open/enabled {enabled:false}` with the loopback Origin answers 200 with `enabled: false`. `GET …/functions` has no function named `cold_open` (the name is `function.name`). Close A. Boot B on the same library and the same packs copy, with a new `sessionCookie`: `cold_open` is still absent from functions, and its row in `GET …/tools` has `enabled: false`. Close B. Overwrite the copy's `core/tools/cold_open.yaml` with a new description and `enabled: true`. Boot C: `GET …/tools/cold_open` shows the new description, and `cold_open` is still absent from functions. Close C. The library is a caller-owned temp folder (`libraryDir`), so the test removes it in its `finally`. |
| 2. Toggling writes only the `tools` section and creates no user-pack file (line 24) | **T2** `a toggle writes only the tools section and no user-pack file` | 1 | Fresh library, fixture copy. Snapshot S0: the parsed `settings.yaml` (every section) and the file list with SHA-256 of the library and of the packs copy. `POST …/tools/cold_open/enabled {enabled:false}` answers 200. Snapshot S1: the parsed settings equal S0 except `tools`, which equals `{schemaVersion: 1, enabled: {cold_open: false}}`. The directory `.scriba/packs` does not exist in the library. The library listing differs only at `.scriba/settings.yaml`, and the packs listing is identical. Then `POST …enabled {enabled:true}`: `tools.enabled` is `{}` (C1), and there is still no `.scriba/packs`. |
| 3. `params`-mode validate passes a node whose only missing fields are ports, and ignores pinned port values (line 25) | **T3** `params mode ignores pinned port values and required ports` | 2 | `POST …/tools/cold_open/validate` with `{arguments: {length: 900, styleProfile: 'Not A Ref!!'}, mode: 'params'}` answers 200 and its `arguments` equal `{length: 900}`. The required port `coreIdea` is absent and the pinned style value is not an entity ID, and both are ignored. The same pinned value in `full` mode, with both required ports supplied (`{coreIdea: 'x', person: 'ada', length: 900, styleProfile: 'Not A Ref!!'}`), answers 422 `TOOL_ARGS_INVALID` whose issues are exactly one, at path `/styleProfile`. (Both `coreIdea` and `person` are required, `cold_open.yaml` line 47; without `person`, Ajv fails first with a `/person` issue and the entity check never runs, `validate.ts` lines 102 to 107.) |
| 4. GETs are side-effect free (line 26) | **T4** `the GET routes change neither the library nor the packs` | 1 | Before boot, a valid user copy of `cold_open` (the built-in file with a new description) is written to `<library>/.scriba/packs/user/tools/cold_open.yaml`, so the user path is read. Snapshot S0 of the library and the packs copy (SHA-256 and mtime of every file). Then `GET` of `…/tools`, `…/tools?genrePack=nonfiction`, `…/tools/cold_open`, `…/tools/cold_open/builtin`, `…/tools/cold_open/user`, `…/functions` and `…/entity-types`. Each answers 200. Snapshot S1 equals S0. |
| Extra (decision, not a criterion): the active project's genre pack and the switch | **E1** `functions follow the active project's genre pack and the switch` | 1 | Fresh library. `POST` the Project store's new-project route (`PROJECT_NEW_ROUTE`) with `{title: 'Switch check', genrePack: 'nonfiction'}`, then `POST` the active-project route (`ACTIVE_PROJECT_ROUTE`) with `{projectId}` from the summary. `GET …/functions` includes `cold_open` (core) and `myth_buster` (nonfiction), and excludes `scene_builder` (fiction). `POST …/tools/myth_buster/enabled {enabled:false}`, then `GET …/functions` excludes `myth_buster` and still includes `cold_open`. |

## 5. Agreement with downstream and parallel units

The unit graph is in `units/README.md` and `modules/tool-registry.md`. The plans of the units below are not written yet, so each point is taken from that unit's file.

- **TRG-07 (lint, parallel, `parallel_with` TRG-09).** TRG-07 fills the detail's `lint` and the summary's `lintCounts` in `catalog.service.ts` (C6). This plan leaves both fields as they are on `main`. TRG-07 leaves `setEnabled`, `enabledOf` and `notify` alone. Whichever merges second resolves a textual conflict in `catalog.service.ts` by keeping both changes.
- **TRG-10 (save, delete, catalog-changed, parallel, `parallel_with` TRG-09; `units/TRG-10-save-delete-catalog-changed.md` lines 18 to 21).** TRG-10 adds the lint, save and delete handlers to `tools.controller.ts`, and the matching methods to `catalog.service.ts`. It wires the `onChange` listener to the event publisher. It relies on `setEnabled` calling the listeners with `[name]` once per effective change (C3). Its criterion 4 (line 27) names a toggle, which can only pass after TRG-09 is on `main` (open point 6; a note for the orchestrator, not a change of this plan).
- **TRG-11 (loader gate, `units/TRG-11-loader-gate.md` line 7).** Its checklist (line 22) needs TRG-09's criteria to pass on `main`. The gate documents the catalog surface: `list`, `detail`, `builtinDetail`, `userDetail`, `functions`, `entityTypes`, `enabledOf`, `setEnabled` and `onChange`.
- **TRG-12 (executor, after TRG-11; `units/TRG-12-executor.md` line 22, step 1).** Step 1 refuses a disabled tool with `TOOL_DISABLED`. It must read the effective switch through `enabledOf(entry.tool)`, not `spec.enabled`. The validate endpoint never refuses a disabled tool, because the Graph runner validates recipes that hold disabled tools (GRR-03 line 20). So the refusal lives in the executor only.
- **AGL-09 (agent loop, `units/AGL-09-narrative-tools.md` line 18).** AGL-09 calls `CatalogService.functions(genrePack)` in-process at the start of each run. It passes the genre of its own project, which `units/AGL-03-loop-core.md` line 21 builds from the project list. Because the switch is read on every call (C8), an enable change applies from the next run, as AGL-09 requires.
- **GRR-03 (graph runner, `units/GRR-03-validation.md` lines 20 and 29).** The "unknown or disabled tool" error reads the switch from the catalog (`list` summary `enabled`, or `enabledOf`). Its params-mode check calls `validate(name, {arguments, mode: 'params'})`, which is T3's behaviour.
- **GRR-11 (palette, `units/GRR-11-tool-nodes-wires.md` line 19).** The palette lists `enabled && valid` from the list summaries, one row per name.
- **TRG-13 (Tools page, `units/TRG-13-tools-page-list.md` lines 16 and 21).** The enable toggle posts `{enabled}` to `…/enabled`, and it refreshes on `catalog-changed`. It takes the answer of the toggle as a `ToolSummary` (C4). The TRG-13 plan must agree with that answer.
- **TRG-14 (YAML editor, `units/TRG-14-yaml-editor-actions.md` lines 16, 17 and 23).** The editor opens an invalid user copy through `/user` (line 16) and compares with the built-in through `GET /builtin` (lines 17 and 23). It does not read the switch; the switch is read from the summary (C10).
- **TRG-05 (spike gate, planned, `plans/TRG-05.md`).** TRG-05 is web-only, and its line 59 says `apps/api/**` is unchanged. The overlap is none. Its check `git diff --quiet main -- apps/api/test/tool-registry-api.test.ts` stays true, because this plan does not edit that file.
- **Invariant sweep (`apps/api/test/invariant-sweep.ts`, shared).** TRG-10 (save, delete) and TRG-12 (render, execute) add their own `FIXTURE_PATHS` entries to the same object literal. On a textual merge conflict, keep every entry of both sides, each once.
- **Platform.** Nothing changes in `/platform`. The `tools` key already exists (`plans/PLT-07.md` line 168).
- **Project store.** Nothing changes in its module. This plan reads `activeId()` and `FilesService.read` through the entry file only.

## 6. Open points

All nine points of revision 1 are resolved by revision 2 with the simplest option, or are notes outside this plan. None is a criterion change, a settled module decision to reopen, or a protected decision. No Navigator point is open.

1. **Removing an override.** Resolved: C1. Source: unit line 20; `modules/tool-registry.md` line 43 ("only overridden tools appear").
2. **Toggling an invalid tool.** Resolved: allowed, C9. Source: unit line 20; `plans/DECISIONS.md` line 3440.
3. **Malformed `tools` section.** Resolved: treated as no overrides, rewritten on the next toggle, C8. Source: the `activeId()` precedent, `project-store.service.ts` lines 46 to 50.
4. **`spec.enabled` in the detail.** Resolved: no contract change; the switch is the summary's `enabled`, C10. Source: unit line 20; `toolDetailSchema` (`catalog.ts` lines 52 to 58); `units/README.md`, Conventions, Contracts.
5. **`lint` in the detail.** Resolved: the existing `lint: []` and zero `lintCounts` stay; TRG-07 fills them, C6. Source: `modules/tool-registry.md` lines 19 and 20; `units/TRG-07-lint-pack-lint-cli.md` lines 69 to 72.
6. **TRG-10 criterion 4 and the parallel mark.** Not a decision of this plan. This plan calls the `onChange` listeners once per effective toggle (step 6g), which is what TRG-10 line 21 needs. Note for the orchestrator: TRG-10's toggle leg (line 27) can pass only once TRG-09 is on `main`, while `units/README.md` line 64 says `parallel_with` never pairs a unit with one it depends on. No unit is changed here (YAGNI: nothing in TRG-10 blocks a correct TRG-09 plan).
7. **Genre when `project.yaml` is missing, invalid or too new.** Resolved: core and user only, C5. Source: `plans/TRG-06.md` line 56 (C6).
8. **E1 is an extra test.** Resolved: kept as a decision test (section 4). Source: unit lines 15 and 18; `plans/TRG-06.md` line 152.
9. **Blocker of the GET criteria (`plans/SAU-07.md` line 178, open point 4).** Resolved, no change: `plans/SAU-07.md` and `plans/SAU-08.md` both have `status: done`, so the invariant sweep this plan extends is on `main` (`apps/api/test/invariant-sweep.ts`), and T4 does not depend on it. The unit's `blocked_by` stays `[TRG-06]`.

## 7. Facts checked and assumed

### Checked (revision 1 at `main` `4dbe960`; rechecked by revision 2 at `e197e40`)

- **Availability.** `plans/QUEUE.md` line 9 (`TRG-09 | M2 | available: yes`). No `unit/TRG-09` branch. `plans/TRG-06.md` front matter `status: done`.
- **Downstream and overlapping plans (revision 2).** The only unit whose `blocked_by` names TRG-09 is TRG-11 (`grep -n blocked_by units/*.md`). No plan exists for TRG-07, TRG-10, TRG-11, TRG-12, TRG-13 or TRG-14 (`ls plans/`). The draft or planned plans on `main` are AGL-10, GRR-01, MPR-08, PST-14, SAU-11 and TRG-05 (planned); none changes a file of section 2 (`grep` of the four API paths: AGL-10 line 64 and line 114 leave `invariant-sweep.ts` unedited; MPR-08 line 59 forbids it; TRG-05 line 59 leaves `apps/api/**` unchanged).
- **Unit.** `units/TRG-09-read-endpoints-enabled.md`: blocked_by `[TRG-06]`, parallel_with `[TRG-07, TRG-10]`, unblocks `[TRG-11]`. `units/TRG-11-loader-gate.md` line 7 names TRG-09. `units/TRG-07-lint-pack-lint-cli.md` line 8 and `units/TRG-10-save-delete-catalog-changed.md` line 8 name TRG-09 in `parallel_with`.
- **Controller.** `apps/api/src/modules/tool-registry/tools.controller.ts` has two handlers: `detail` (line 19) and `validate` (line 24). No list, functions, entity-types, builtin, user or enabled route exists yet.
- **Module.** `tool-registry.module.ts` has no imports, no settings registration, and providers `CatalogService` only.
- **Catalog.** `catalog.service.ts`: `isEnabled` (line 65) reads `spec.enabled`; `summaryOf` (line 69) sets `lintCounts` to zero; class (line 98); `refresh` (line 117); `onChange` (line 127); `list` (line 132); `detail` (line 146) with `lint: []`; `functions` (line 179); `validate` (line 192); `entityTypes` (line 198); `resolve` (line 212). The comment on `isEnabled` says "TRG-09 adds the project's override here".
- **Params mode is implemented.** `validate.ts` line 93 (`params`), line 98 (port keys dropped), line 101 (validator choice), line 112 (entity loop). The contract `toolValidateRequestSchema` requires `mode` (`call.ts`).
- **E2 does not prove the ignoring.** `tool-registry-api.test.ts` lines 364 to 385 pass the port value `'x'`, which is valid in full mode too. So E2 shows that required ports are not required in params mode, and it does not show that pinned values are ignored. T3 adds that.
- **Routes.** `routes.ts` names every route this unit needs (`TOOLS_ROUTE`, `TOOL_BUILTIN_ROUTE`, `TOOL_USER_ROUTE`, `FUNCTIONS_ROUTE`, `ENTITY_TYPES_ROUTE`, `TOOL_ENABLED_ROUTE`). `catalog.ts` has `toolListQuerySchema`, `functionListSchema`, `entityTypeListSchema`, `toolEnabledRequestSchema`. `settings.ts` has `toolsSectionSchema`. `errors.ts` has `TOOL_DISABLED` (409) and `TOOL_NOT_FOUND` (404).
- **Settings.** `SettingsService` has `register`, `read` and `write` (`apps/api/src/modules/platform/settings/settings.service.ts`). `write` needs a registered key and the section's `schemaVersion`. `migrateSettings` writes a default only when it is non-null (`settings.migrate.ts`). `tools` is in the fixed key list.
- **Settings pattern.** `agent-settings.section.ts`, `providers.section.ts`, `project-store.section.ts`, and the registration provider in `agent-loop.module.ts` (`imports: [PlatformModule, ProjectStoreModule]`).
- **Project store.** `project-store.module.ts` exports (lines 59 to 65). `ProjectStoreService.activeId()` (line 46, returns `string | null`; it safe-parses the `projects` section, lines 47 to 50). `FilesService.read` (`files.service.ts` line 257) runs the active check and the project lookup (`projectFor`, line 525). `projectYamlSchema` (`packages/contracts/src/project-store/project.ts` line 20) has `genrePack`. `activateRequestSchema` (line 72) has `projectId`. `PROJECT_NEW_ROUTE` and `ACTIVE_PROJECT_ROUTE` are in `project-store/routes.ts`.
- **Fixtures.** `apps/api/test/fixtures/packs/core/tools/cold_open.yaml` (ports `coreIdea`, `entityIds`, `styleProfile`, `person`, `moment`; params `length`, `tone`; `required: [coreIdea, person]`, line 47; `enabled: true`, line 49), `nonfiction/tools/myth_buster.yaml` (`enabled: true`), `fiction/tools/scene_builder.yaml` (`enabled: true`).
- **Test seam.** `create-test-app.ts` takes `libraryDir` and removes only a temp library it owns. `guard-request.ts` `sessionCookie` reads `<library>/.scriba/setup-url` and returns the cookie of the handshake. `tool-registry-api.test.ts` `withApp` (lines 152 to 168) is the pattern to copy.
- **Sweep.** `invariant-sweep.ts` `FIXTURE_PATHS` (line 73) has the two tool-registry entries at lines 114 to 119. Its header (lines 4 to 5) and lookup (lines 183 to 189) require an entry for every template with `:`.
- **Decisions.** `plans/DECISIONS.md` lines 3409 to 3414 (option A), line 3440 (lint keeps the switch), line 3620 (option ii). `plans/TRG-01.md` line 104 (D11), line 134 (`TOOL_NOT_FOUND` for a missing user copy, "the plan's choice"), line 135 (D15), line 247 (option ii).
- **TRG-06 plan.** Line 30 (S4, built-ins once), line 33 (S7, the user slot), line 56 (C6), line 57 (C7), line 59 (C9), line 62 (C12), line 152 (the hand-off to TRG-09 for the active project's genre).
- **Other plans.** `plans/TRG-05.md` line 59 (`apps/api/**` unchanged). `plans/PLT-07.md` line 168 (the `tools` default is open). `plans/SAU-07.md` line 178 (open point 4). `plans/TRG-02.md` line 181 (E2 is the acceptance line 25 of this unit).
- **Validate order (revision 2).** `validate.ts` lines 101 to 107 run Ajv first and throw on its errors; the entity and style check (lines 109 to 134) runs only after Ajv passes. `entityRefSchema` is `entityIdSchema` (`packages/contracts/src/project-store/entities.ts` line 8); `'ada'` is accepted (`tool-registry-api.test.ts` line 290).
- **Restart in a test (was A1).** A second and third `createTestApp` on the same caller-owned library start, and `sessionCookie` answers on each: `apps/api/test/agent-settings-api.test.ts` lines 58 to 60 and 77 to 79.
- **Node (was A2).** `node -v` prints `v26.13.0` (root `package.json` engines `>=26 <27`); `fs.cpSync` is a function and `readdirSync(…, {recursive: true})` runs the recursive reader.
- **`yaml` (was A6).** `apps/api/package.json` line 20 (`"yaml": "2.9.1"`); `packs.ts` line 9 imports `parse` from it.
- **No module cycle.** Nothing outside `modules/tool-registry/` imports `CatalogService` or `ToolRegistryModule` except `app.module.ts` line 25, so importing `ProjectStoreModule` creates no cycle.
- **Consumers.** `units/AGL-09-narrative-tools.md` line 18, `units/GRR-03-validation.md` lines 20 and 29, `units/GRR-11-tool-nodes-wires.md` line 19, `units/TRG-12-executor.md` lines 22 and 39, `units/TRG-13-tools-page-list.md` lines 16 and 21, `units/TRG-14-yaml-editor-actions.md` lines 16, 17 and 23, `units/AGL-03-loop-core.md` line 21, `units/MPR-12-project-override-api.md` line 18.

### Assumed (to be checked in the steps named)

- **A3.** The Setup & auth guard covers the new tool routes, as it covers the existing ones. The tests use `send` with the session cookie, and the invariant sweep checks it (step 10).
- **A5.** No `tools` key exists in any real `settings.yaml`. Nothing registers the section on `main`, so none was written.
- **A7.** A boot, the handshake and a GET write nothing to the library after the snapshot point, so T2's and T4's snapshots differ only by what the toggle writes. Checked by T2 and T4 in step 9; if a stray file appears, stop and report.

A1, A2, A4 and A6 of revision 1 are now checked (above).

## 8. Review parts

Each step and each test is in exactly one part.

- **Part 1: the switch and the read routes.** Steps 1 to 10. Tests T1, T2, T4 and E1. The gate is step 10. The reviewer checks C1 to C10 in the code, the section 2 rows for the new services, the controller and the sweep entries, and that `tool-registry-api.test.ts`, `tool-registry-loader.test.ts` and `tool-registry-template.test.ts` are unedited.
- **Part 2: the params proof and the gates.** Steps 11 to 15. Test T3. The gate is step 14 and the mutation check is step 13. The reviewer checks that T3 is the only test that touches `validate`, that T3 passes without a code change, and that each mutation fails the test it names.

The plan has two parts. Part 1 holds steps 1 to 10 and tests T1, T2, T4 and E1; Part 2 holds steps 11 to 15 and test T3. No step or test is in both.

## 9. Revision 2 corrections (reviser, 2026-11-15)

1. T3's `full`-mode leg omitted the required port `person` (`cold_open.yaml` line 47), so Ajv would answer a `/person` issue and the `/styleProfile` check would never run. The leg now supplies `person: 'ada'` and asserts exactly one issue, at `/styleProfile`.
2. C6: the `lintOf` helper is dropped (YAGNI); the existing `lint: []` and zero `lintCounts` stay. Step 6e, the section 2 row and the TRG-07 bullet follow.
3. Open points 1 to 5, 7, 8 and 9 resolved with sources (C1, C5, C6, C8, C9, C10, section 4, section 6). Open point 6 is a note for the orchestrator, not a decision of this plan.
4. A1, A2, A4 and A6 moved to the checked facts with their sources; A7 added.
5. Section 5: the TRG-14 bullet named a switch read that TRG-14 does not make; it now cites lines 16, 17 and 23. Overlapping draft and planned plans were checked (section 7).
6. Steps 1 and 10 and Part 1 name TRG-08's `tool-registry-template.test.ts`, which the `tool-registry` filter also runs.
7. Line citations: `activeId()` is at line 46, not 45; `QUEUE.md` line 9.
8. No unit file was changed.
