---
id: MPR-12
status: draft
---
# MPR-12 plan — project model override: resolution, set and clear API, type compatibility test

Unit: MPR-12 (module Model providers, `phase:project-override`, M2; blocked by MPR-05, MPR-08 and Project store `phase:files` (PST-12); unblocks MPR-13). Base: `main` at e079fb8, clean tree. Revision 1, a draft by the planner. The unit file has no "by revision" note (`grep -n "by revision"` prints nothing). The code stage uses a branch `unit/MPR-12` from main, as PLT-02 did.

## 1. Decisions this plan follows

### 1a. Settled by the unit, the module, earlier plans or DECISIONS

- Resolution reads the `model` key of the project's `project.yaml` through the Project store's in-process file API, as the first step of the order: project override, app default, provider model, first listed. Source: unit lines 18 and 21; `modules/providers.md` (Cross-cutting, `project.yaml` override bullet); `apps/api/src/modules/providers/providers.resolution.ts` (order comment, line 50).
- An override naming a missing provider falls back to the app default and sets `warning`. Source: unit line 19; `ResolvedModel.warning` already exists (`providers.resolution.ts` line 29) and its comment says MPR-12 sets it.
- Set and clear act on the active project, fail with `PROJECT_NO_ACTIVE` when none is active, and write through `updateProjectYaml` (comment-preserving, `model` key only). They are author actions, not pending changes. Source: unit line 20; `FilesService.updateProjectYaml` (`apps/api/src/modules/project-store/files.service.ts` line 394) and `projectFor` (line 525), which calls `requireActive` (`project-store.service.ts` line 66).
- No caching across switches. Source: unit line 21; the resolver reads on every call (its comment at `providers.resolution.ts` line 32).
- A type-level test shows the Project store's `project.yaml` `model` shape matches `ModelChoice`. Source: unit line 22; `modules/providers.md` (`project.yaml` override bullet).
- Routes: `PROJECT_MODEL_ROUTE` (`/api/providers/project-model`) and `PROJECT_MODEL_CLEAR_ROUTE` already exist in `packages/contracts/src/providers/routes.ts` (lines 13 to 15). Commands are POST, reads are GET. Source: `units/README.md` (conventions, HTTP); the route file's own comment.
- Errors: the Project store's codes (`PROJECT_NO_ACTIVE` 409, `PROJECT_NOT_ACTIVE` 409, `PROJECT_NOT_FOUND` 404, `PROJECT_INVALID` 422) and the providers codes (`PROVIDER_NOT_FOUND` 404). Source: `packages/contracts/src/project-store/errors.ts` (line 69 for the 409); `packages/contracts/src/providers/errors.ts` (`PROVIDER_ERROR_STATUS`).
- Module boundary: a module is imported by another only through its entry file. Source: `eslint.config.mjs` lines 27 to 66 (rule R1; Platform's PLT-09 lint).
- Testing: external behaviour only, through `createTestApp` on a temp library. Unit tests never read `examples/`. Source: `units/README.md` (Testing); `modules/providers.md` (Testing principles).

### 1b. Decided here (smaller choices, the simplest option in each case)

- **D1 Reading the override.** `ModelResolver` reads `project.yaml` with `FilesService.read(projectId, 'project.yaml')`. That method is synchronous (`files.service.ts` line 257). The text is parsed with the `yaml` package and checked with `projectYamlSchema` (`packages/contracts/src/project-store/project.ts` lines 20 to 29), the whole document, because criterion 5 says the sample "validates". The override is the `model` key. What happens when the read fails or the document does not validate is open point 1.
- **D2 Resolver changes** (`providers.resolution.ts`). The resolver injects `FilesService` and `ProjectStoreService`. The placeholder `projectChoice` (lines 111 to 117, with its eslint-disable comment) is replaced by a public method `projectOverride(projectId)` that returns the stored `ModelChoice` or undefined. One private function returns the choice, its source and an optional warning. The override is chosen when it exists and `registry.get(providerId)` finds its provider. An override that names a missing provider gives the app default with source `app` and the warning of D3. `hasChoice` and `resolve` both use this function, so they agree. `hasChoice` stays synchronous. A plain fill-in of `projectChoice` would make `hasChoice` (line 43) return false when the override names a missing provider, while the app default is valid. The source `project` is passed to `resolved()` (from line 149) on the override path.
- **D3 Warning text.** A fixed string: "The project's model provider was deleted, so the app default is used." It names no id, following the Project store's rule that no input value is echoed in a message.
- **D4 Module wiring.** `ProvidersModule` (`providers.module.ts`) imports `ProjectStoreModule` from `apps/api/src/modules/project-store/project-store.module.ts`, which exports `FilesService` and `ProjectStoreService`. No cycle: the Project store imports only the Platform module.
- **D5 Set.** `POST /api/providers/project-model`, body `modelChoiceSchema` (existing). Order: (1) the active id from `ProjectStoreService.activeId()` (`project-store.service.ts` line 46); when it is null, refuse with `PROJECT_NO_ACTIVE` (409) and the message "No project is active. Activate a project first.", the same text as the Project store's private message; (2) `registry.find(providerId)` refuses an unknown provider with `PROVIDER_NOT_FOUND` (404), as `setAppDefault` does, and writes nothing; (3) `updateProjectYaml(activeId, {model: {providerId, model}})`. Reply 200 with `{projectModel: <the choice>}`.
- **D6 Clear.** `POST /api/providers/project-model/clear`, no body. (1) the active id as in D5; (2) when `projectOverride(activeId)` is undefined, reply 200 with `{projectModel: null}` and write nothing; (3) otherwise `updateProjectYaml(activeId, {model: null})`, which deletes the key (checked, section 8a), and reply 200 with `{projectModel: null}`.
- **D7 Reply shape and contract.** `{projectModel: ModelChoice | null}`, mirroring `{appDefault}` of `APP_DEFAULT_ROUTE` (`providers.controller.ts` lines 73 to 78). New contract export in `packages/contracts/src/providers/model.ts`: `projectModelResponseSchema` = an object with `projectModel` of `modelChoiceSchema` nullable, and its type `ProjectModelResponse`. This is an expand; no existing export changes.
- **D8 Write side effects.** `updateProjectYaml` publishes `files-changed` through `commit` (`files.service.ts` from line 536). This is inherited from PST-07 and stays as it is.
- **D9 Status codes.** Set and clear answer 200 (`@HttpCode(200)`), as the key routes do.
- **D10 Test seams.** `createTestApp({libraryDir})` with its default modules (the composed app, as `providers-api.test.ts` uses it); a temp library from `makeLibrary` (`apps/api/test/settings.kit.ts` line 60); the session cookie from `sessionCookie`; requests through `send` (`guard-request.ts`) with `LOOPBACK_HOST`, and `LOOPBACK_ORIGIN` on every POST (`invariant-sweep.ts`). Fixtures are inline in the test file. Activation is a POST to `ACTIVE_PROJECT_ROUTE` (`packages/contracts/src/project-store/routes.ts` line 12). No new kit file.
- **D11 Files not touched.** The Project store code (`FilesService.read`, `updateProjectYaml`, `ProjectStoreService.activeId`) is reused as it is. No file under `apps/web/`, `units/`, `modules/`, `plans/DECISIONS.md` or other plans changes.

## 2. Files to create or change

| Path | Change | Purpose |
|---|---|---|
| `packages/contracts/src/providers/model.ts` | edit | adds `projectModelResponseSchema` and `ProjectModelResponse` (D7) |
| `packages/contracts/test/providers.exports.test.ts` | edit | adds `projectModelResponseSchema` to `REQUIRED_EXPORTS` (after `PROJECT_MODEL_CLEAR_ROUTE`, line 59) |
| `packages/contracts/test/project-model.types.test.ts` | new | T1 (criterion 6) |
| `apps/api/src/modules/providers/providers.resolution.ts` | edit | D1, D2, D3; the branches of open points 1 and 3 |
| `apps/api/src/modules/providers/providers.module.ts` | edit | D4: imports `ProjectStoreModule` |
| `apps/api/src/modules/providers/providers.service.ts` | edit | `setProjectModel` and `clearProjectModel` (D5, D6) |
| `apps/api/src/modules/providers/providers.controller.ts` | edit | two POST routes, 200 (D9) |
| `apps/api/test/providers-project-override.test.ts` | new | O1 to O5 (criteria 1 to 5), O6 (extra) |
| `apps/api/test/providers-gate.test.ts` | edit | `CONTROLLER_ROUTES` (lines 51 to 64) gains the two POST entries, and the comment on line 50 changes "twelve" to "fourteen". G1 (line 139) then covers both routes |
| `apps/api/test/providers-resolution.test.ts` and `apps/api/test/providers-api.test.ts` | edit only under open point 1, option (a) | C4 in each (lines 238 to 266 and 377 to 403) activates a project `p-1` first |
| `plans/MPR-12.md` | new | this plan (the planner's commit only) |

Not changed, checked: `providers.registry.ts` (`find`, `appDefault`, `delete` and `setAppDefault` are used as they are); `project-store/**`; `agent-loop/**` (its calls to `hasChoice` and `resolve` keep their signatures); `apps/api/test/invariant-sweep.ts` (its `FIXTURE_PATHS` comment, lines 71 and 72, gives an entry only to templates with `:` or `{`, and the two new routes have neither); `apps/web/**`.

## 3. Procedure

0. **Base.** On branch `unit/MPR-12` from main, in a worktree. Record `node -v` and `npm -v`. `npm ci`. Then `npm run build -w @bbartolome/scriba-contracts`. The API resolves `@bbartolome/scriba-contracts/*` through `dist`, so the build must be current. Expected: exit 0.
1. **Red.** Write `packages/contracts/test/project-model.types.test.ts` (T1) and `apps/api/test/providers-project-override.test.ts` (O1 to O6). Run `npm test -w @bbartolome/scriba-api -- providers-project-override`. Expected: O1 to O4 and O6 fail, because the POST route answers 404. O5 passes before the change, so it guards. T1 passes before the change, because both types exist and are equal, so it guards. Save the output.
2. **Contracts.** Add `projectModelResponseSchema` and `ProjectModelResponse` (D7), and the `REQUIRED_EXPORTS` entry. Run `npm run build -w @bbartolome/scriba-contracts` and `npm test -w @bbartolome/scriba-contracts`. Expected: both exit 0, T1 included.
3. **Resolver.** Edit `providers.resolution.ts` (D1, D2, D3). **Wait for open points 1 and 3.** Their options change the failure branch of D1 and the empty-model case of D2. Open point 2 does not block this step.
4. **Module.** `providers.module.ts` imports `ProjectStoreModule` (D4).
5. **Service and controller.** `providers.service.ts` gets `setProjectModel` and `clearProjectModel` (D5, D6). `providers.controller.ts` gets the two POST routes with 200 (D9). The set body goes through `ZodValidationPipe` with `modelChoiceSchema`, as the app default route does.
6. **Gate test.** Two entries in `CONTROLLER_ROUTES` and the imports; the comment changes to "fourteen" (section 2).
7. **Existing `projectId` tests.** Under open point 1, option (a): C4 in `providers-resolution.test.ts` and in `providers-api.test.ts` activates a project `p-1` with a valid `project.yaml`. Under options (b) or (c): no edit; the run in step 8 confirms it.
8. **Green.** `npm test -w @bbartolome/scriba-api`. Expected: exit 0; O1 to O6 pass; every `providers-*.test.ts` and `agent-loop-*.test.ts` file passes. The only edits to existing files are those of steps 6 and 7. Save the output.
9. **Root gates.** `npm run build`, `npm test`, `npm run lint` at the root. Expected: each exits 0. The lint includes the boundary rules (R1) and `prettier --check .`.
10. **Paths.** `git status --short`. Expected: only the paths of section 2.
11. **Commit and fresh clone.** Commit on `unit/MPR-12` with `feat(MPR-12): per-project model override, resolution and set/clear API`. Then clone the branch into an empty folder under /tmp, and run `npm ci && npm run lint && npm test && npm run build` there. Expected: each exits 0. Nothing is pushed.

## 4. Acceptance criteria and tests

Six criteria (unit lines 25 to 30), six with a test.

| Criterion | Test file | Test | Seam | Pass condition |
|---|---|---|---|---|
| 1. Set writes only `model` (other bytes untouched); the next resolution uses it, source `project` | `apps/api/test/providers-project-override.test.ts` | O1 | HTTP and the file on disk | The file after the set equals the fixture with `model:`, `  providerId: mock`, `  model: gemma3` appended. The fixture is a comment line, `schemaVersion: 1`, `title: Book # working title`, `genrePack: nonfiction`, `export:` and `  template: default`. GET `effective-model?projectId=book` gives `mock`/`gemma3`, source `project` |
| 2. Clear returns to the app default | same | O2 | same | After the clear the file equals the fixture byte for byte. Effective model is source `app`, `mock`/`llama3.1`. A second clear answers 200 and leaves the bytes unchanged |
| 3. An override naming a deleted provider resolves to the app default with a warning | same | O3 | same | The override names `other`; `DELETE` of `other` answers 204; effective model is `mock`/`llama3.1`, source `app`, a non-empty `warning`. The file still names `other`. No provider with id `other` is created again (open point 2) |
| 4. Switching the active project changes the effective model | same | O4 | same | `book` (override `gemma3`) reads as `project`/`gemma3`. Activate `second` (no override): its effective model is `app`/`llama3.1`. Activate `book` again: `project`/`gemma3` |
| 5. A project.yaml with no override validates and resolves to the app default | same | O5 | same | A project with the three sample lines (`schemaVersion: 1`, `title`, `genrePack: nonfiction`) is listed with status `ok` by GET `projects`, and its effective model is source `app`. Passes before the change |
| 6. The type-level compatibility test compiles | `packages/contracts/test/project-model.types.test.ts` | T1 | the type checker | `npm run build -w @bbartolome/scriba-contracts` exits 0. The file holds `expectTypeOf` for `ProjectModel` against `ModelChoice`, in both directions. Passes before the change |

Extra (not a criterion): O6 checks D2's `hasChoice` rule. With an override that names a deleted provider and a valid app default, POST `AGENT_RUNS_ROUTE` is not refused with `AGENT_NO_PROVIDER` (409). The test then POSTs `AGENT_RUN_STOP_ROUTE`. Seam: HTTP.

## 5. Agreement with the downstream unit (MPR-13)

MPR-13 (`units/MPR-13-project-model-panel.md`, lines 17 to 20) needs from this unit:

- Set: POST `/api/providers/project-model` with a `ModelChoice` body. Answers 200 `{projectModel}`. Refusals: `PROJECT_NO_ACTIVE` (409) and `PROVIDER_NOT_FOUND` (404).
- Clear: POST `/api/providers/project-model/clear`. Answers 200 `{projectModel: null}`.
- Readout: GET `/api/providers/effective-model?projectId=<active id>`, with `choice`, `source` (`project`, `app` or `auto`), `contextSize` and `warning` (set only for a deleted provider). The shape already exists in `effectiveModelSchema`.
- Types: `ProjectModelResponse` (new), `ModelChoice` and `EffectiveModel` (existing).
- MPR-13 hides its section when no project is active, using the Project store's active endpoint, not this unit. It only asks the readout for the active id, which works under every option of open point 1.
- MPR-12 changes no web file. MPR-13 adds the copies of the new type in `providers-copies.ts`.

MPR-13 has no plan file yet.

## 6. The other draft or planned plans

Scan of `plans/*.md` by `status:`: 91 `done`, 2 `planned` (MPR-11, PLT-21), 0 `draft`. `DECISIONS.md` and `QUEUE.md` have no status.

- **MPR-11** (`plans/MPR-11.md`, section 2). Changes `apps/web/src/app/app.routes.ts`, `features/providers/providers.routes.ts`, `providers-texts.ts`, and adds `providers-page.ts`, `providers-route.spec.ts` and `e2e/specs/providers-phone.e2e.ts`. Its "must not change" list includes `packages/contracts/**` and `apps/api/**`. Shared files with this plan: none. Both orders are correct. MPR-11 calls only the existing `/api/providers` reads and the panel, and it never sends a `projectId` query. MPR-12 adds two POST routes and one type, and changes no web file. If MPR-12 merges first, MPR-11's fakes and tests are built from the types and routes that stay in place. If MPR-11 merges first, MPR-12 changes no file it touched.
- **PLT-21** (`plans/PLT-21.md`, section 2). Changes `scripts/examples-check/graph.mjs` (new), `index.mjs`, `lib.mjs` and `scripts/examples-check-graph.test.mjs` (new). Shared files: none. Both orders are correct. PLT-21 reads graph-runner files and the examples tree, not providers. Its root `npm test` (its step 9) and its contracts build (step 2) are expected to pass with this plan's changes in either order.

## 7. Open points (not decided here, for the Navigator)

1. **OPEN. What resolution does for a project id that cannot be read.** Cases: the id is not the active project (the file API refuses it with `PROJECT_NOT_ACTIVE`, `project-store.service.ts` line 66); the id names no project (`PROJECT_NOT_FOUND`); the active project's `project.yaml` is invalid (`PROJECT_INVALID`, 422), too new (`PROJECT_SCHEMA_TOO_NEW`, 409), or fails the schema.
   - (a) Errors propagate. Effects: C4 in `providers-resolution.test.ts` (lines 238 to 266, `projectId=p-1` with no such project) and C4 in `providers-api.test.ts` (lines 377 to 403; the GET at line 388) fail, and must activate a project `p-1` (step 7). An agent start on an active project with an invalid `project.yaml` is refused with that code, not started.
   - (b) A project id that is not active, or whose `project.yaml` cannot be read or validated, has no override. The app default applies, source `app`, no warning. Both C4 tests pass unchanged. An override in an invalid `project.yaml` is ignored without a message.
   - (c) Mixed: a project id that is not active or names no project has no override (b); an invalid or too-new `project.yaml` is an error (a).
   - Steps 3 and 7 wait for the answer.
2. **OPEN. Freed provider ids (the reuse case of criterion 3).** `ProvidersRegistry.create` takes the first free id (`providers.registry.ts` lines 139 to 145). After a delete, a new provider can take the same id, and an override naming it would bind silently. The question is recorded in `plans/MPR-02.md` line 156 (open point 5, for the MPR-06 and MPR-12 planners) and `plans/MPR-06.md` line 164 (open point 1, for the coordinator). Options: (a) never reuse an id; `create` skips retired ids. (b) keep a retired-id list that MPR-12 checks, so an override naming a retired id falls back with a warning. Both need a retired-id list in the stored `providers` section (a stored-shape change under expand–contract, with a migration). The DECISIONS lines that name MPR-12 (1899 and 2052) record no decision. Until one is made, this plan tests only the no-reuse case (O3).
3. **OPEN. An override with an empty model (`model: ''`).** `modelChoiceSchema` allows it (`packages/contracts/src/providers/model.ts` lines 5 to 8). Options: (a) source `project`, with the model taken from the provider's own model, else the first listed (the order stays, the source stays `project`); (b) source `auto` when the model is empty; (c) set refuses an empty model with `PLATFORM_VALIDATION_FAILED` (400). Step 3 waits for the answer. Under (a) or (b), a test is added as O7.

## 8. Facts checked and facts assumed

### 8a. Facts checked (how)

- The unit file read in full. `grep -n "by revision"` on it prints nothing. `units/README.md` read (front matter, blocker notation, conventions).
- `modules/providers.md` read (ordering, cross-cutting decisions, testing principles).
- `units/MPR-13-project-model-panel.md` read. Its front matter says `blocked_by: [MPR-11, MPR-12]`. `units/MPR-09`, `MPR-10`, `MPR-11` each list MPR-12 in `parallel_with`. `units/PST-07` lists `unblocks: [PST-12]`, as DECISIONS 2026-11-15 records (commit 79b5ec8).
- Plan statuses: `status:` of every `plans/*.md` (script): 91 done, 2 planned (MPR-11, PLT-21), 0 draft.
- Blockers done (status lines): MPR-05, MPR-08, PST-07, PST-12. MPR-06 and MPR-04 (done) were read as context.
- DECISIONS: `grep -n "MPR-12" plans/DECISIONS.md` gives lines 1899, 2052, 2295, 4042 and 4046. Only these lines were read, as the task asks. Line 1899 and the MPR-06 approval at 2052 leave the freed-id question to the planners and the coordinator. Lines 4042 and 4046 are the PST-07 unblocks change.
- `apps/api/src/modules/providers/providers.resolution.ts`, `providers.registry.ts`, `providers.service.ts`, `providers.controller.ts`, `providers.module.ts` read in full: the placeholder `projectChoice`, `hasChoice` (line 43), `resolve` (line 51), `resolved()` (line 149), `freeId` (lines 139 to 145), `indexOf` (line 148), `delete` (line 65, refusing only the app default), `setAppDefault` (line 84), the controller's app default routes (73 to 78) and the module's imports and exports.
- `packages/contracts/src/providers/model.ts`, `routes.ts`, `errors.ts`, `index.ts` read in full. `packages/contracts/src/project-store/project.ts` (`projectModelSchema` line 13, `model` key line 26), `routes.ts` (line 12), `errors.ts` (line 69) read.
- `apps/api/src/modules/project-store/files.service.ts` (class line 224, `read` 257, `updateProjectYaml` 394, `projectFor` 525, `commit` 536 publishing `files-changed`), `project-store.service.ts` (`activeId` 46, `requireActive` 66), `project-store.module.ts` (exports) and `project-yaml.ts` read.
- yaml package (2.9.1 in `node_modules/yaml`), checked by a read-only `node -e` script that printed to stdout and wrote no file, on a fixture like the one in O1. Adding the `model` key appends it at the end of the top-level map as `model:`, `  providerId:`, `  model:`. Replacing it keeps its position. Deleting it, with the document's `delete`, gives back the fixture text exactly, comments included.
- Existing tests: `providers-resolution.test.ts` (C4 at line 238 with `projectId=p-1` at line 249; E1 at line 268 with no project id), `providers-resolution.kit.ts` (the test-only resolve route), `providers-api.test.ts` (C4 at line 377; `projectId=p-1` at line 388; the `post` helper at line 125), `providers-gate.test.ts` (`CONTROLLER_ROUTES` at lines 50 to 64; G1 at line 139; `toContainEqual` at line 148), `providers.exports.test.ts` (`REQUIRED_EXPORTS`, checked with `arrayContaining`, line 13, `PROJECT_MODEL_CLEAR_ROUTE` at line 59), `project-store-files-helpers.test.ts` (U1 at line 105, the exact-text style), `project-store-active.kit.ts` (`addOkProject`, `postJsonPlain`), `project-store-projects.kit.ts` (`buildProjectsLibrary`, `withProjectsApp`), `settings.kit.ts` (`makeLibrary` at line 60).
- Agent-loop tests: `agent-loop-start.test.ts` and `agent-loop-run.test.ts` use `buildProjectsLibrary`, which writes a valid `book/project.yaml`. In `agent-loop-current.test.ts`, the folders written at lines 380 and 476 are a `logs` folder of `book` and a second, non-active project `other` with a valid `project.yaml`.
- `apps/api/src/modules/agent-loop/agent-runs.service.ts` (`start`, line 74 calls `hasChoice`), `agent-run.ts` (`execute`, line 151 calls `resolve`; a throw becomes `finish('error', message)`, line 203 to 204).
- `packages/contracts/tsconfig.json` includes `src` and `test`. Its `build` script runs `tsc -p tsconfig.build.json && tsc --noEmit -p tsconfig.json`, so T1 is type-checked by the build.
- `apps/api/package.json` and `packages/contracts/package.json` scripts; root `package.json` scripts (lines 23 to 26); workspace names `@bbartolome/scriba-api` and `@bbartolome/scriba-contracts`.
- `eslint.config.mjs` lines 27 to 66 (boundaries, rule R1).
- `apps/api/test/invariant-sweep.ts` `FIXTURE_PATHS` comment (lines 71 and 72).
- `createTestApp` default modules are `COMPOSED_MODULES` (`create-test-app.ts` line 13 documents the default; `app.module.ts` line 51 uses it).
- `examples/nonfiction/project.yaml`: a comment line, `schemaVersion: 1`, `title`, `genrePack: nonfiction`, no `model` key.
- `packages/contracts/src/agent-loop/routes.ts` (`AGENT_RUNS_ROUTE` line 3, `AGENT_RUN_STOP_ROUTE` line 4).
- `plans/MPR-11.md` sections 2 and 5 read; `plans/PLT-21.md` section 2 and step 9 read.
- `plans/MPR-02.md` line 156 and `plans/MPR-06.md` line 164 read (the freed-id text).

### 8b. Facts assumed without a check

- The invariant sweep enumerates the running app's routes (assumed from its comments; the enumeration code was not read). The gate test checks its own fixed list (`CONTROLLER_ROUTES`, checked).
- Adding `ProjectStoreModule` to `ProvidersModule` creates no dependency-injection cycle, and the Project store's singletons are shared (Nest's default). Not run.
- The other agent-loop test files (search, transcript, tools, trim, stop, history, conversations) use the active project from `buildProjectsLibrary` with a valid `project.yaml`. Only start, run and current were read.
- Vitest's `expectTypeOf` does nothing at run time. A wrong type fails `tsc`, not Vitest. Standard behaviour; not run.
- A POST to an unknown route answers 404 before the change (step 1 relies on this).
- `packages/contracts/dist` matches `src` in the main worktree. Step 0 rebuilds it.
- No Playwright test calls the project-model routes or a `projectId` query.
- The web's hand-written copies in `providers-copies.ts` do not need the new type until MPR-13.
