---
id: PST-05
status: draft
title: Start from sample and the sample list
module: project-store
---

# PST-05 plan — start from sample and the sample list

Unit: `units/PST-05-start-from-sample.md` (phase:files, M1). Blocked by PST-03, which is done (`plans/PST-03.md` status done; the last commit that touches the Project store code is `146abce`). Base: `main` at `d63a95b`. Parallel with PST-04, whose plan is `planned` and not on `main`. Scope: the API (`apps/api`) and its tests. The picker UI is PST-09.

## 1. Decisions this plan follows

Each decision gives its source. "Planner's choice" marks a choice that neither the unit, the module nor DECISIONS.md settles. Section 6 lists the choices that other units must know about.

- **Samples location.** Samples are read-only at `SCRIBA_EXAMPLES_DIR` (default `/opt/scriba/examples`; the dev script points it at `examples/`). The API never writes there. Source: unit line 18; `packages/contracts/src/platform/env.ts` line 14; root `package.json` line 24.
- **Sample list.** `GET /api/project-store/samples` (`SAMPLES_ROUTE`) reads `<SCRIBA_EXAMPLES_DIR>/samples.yaml`, a top-level list of `{id, title, description}`, and answers that array as it is. An absent file is an empty list. Source: unit line 19; `packages/contracts/src/project-store/project.ts` lines 81 to 88 (`sampleSchema`, `sampleListSchema`); `plans/PST-01.md` line 62 (answer: sample array); `plans/PLT-20.md` line 33 (D7: absent is an empty list).
- **Start from sample.** `POST /api/project-store/projects/start-from-sample` (`PROJECT_START_FROM_SAMPLE_ROUTE`) with `{sampleId, folderName, title}`, checked by `startFromSampleRequestSchema` (`project.ts` lines 64 to 69; `routes.ts` lines 9 and 10). Source: unit line 20.
- **The sample is looked up in the list only.** `sampleId` is matched against the ids in `samples.yaml`. It is never joined to a path. Source: `plans/DECISIONS.md` line 2352 (PST-01 review, item 4); `plans/PST-02.md` line 63 (S12).
- **Copy content.** The copy is the sample's own tree, `examples/<sampleId>/` in the repository layout, minus four paths matched exactly against paths relative to the sample root: `.scriba`, `logs`, `snapshots` and `drafts/.versions`. Files are copied byte for byte. Dot-files are copied, the sample's `.gitignore` among them. `samples.yaml` sits outside every sample folder, so it is never copied. Source: unit lines 20 and 21; `plans/PLT-20.md` line 37 (D11: the same four paths, at the sample root only); `plans/PST-11.md` line 155 (the dot-file hand-off). Planner's choice: the four paths are matched at the root only, so a nested `logs/` inside a sample is copied.
- **Title edit.** Only the `title` key of the copied `project.yaml` changes. The edit is a comment-preserving document edit (`parseDocument`, `Document.set`, `toString`), never a re-serialisation from an object. Source: unit line 20; `units/PST-03-discovery-new-import.md` line 23; `plans/DECISIONS.md` line 3485 (item 3: PST-05 makes this edit itself with `yaml`, which `apps/api/package.json` line 19 already lists). Measured in section 7.
- **Folder reservation.** The folder is reserved with `reserveProjectFolder`, a plain mkdir. `false` means the name is taken: 409 `PROJECT_EXISTS`. A name the disk refuses as too long (ENAMETOOLONG) is 400 `PROJECT_PATH_INVALID`, raised by the same helper. Any failure after the reservation removes the new folder again. Source: `plans/DECISIONS.md` line 3665 (the caller maps `false` to `PROJECT_EXISTS` and rolls back); `plans/PST-03.md` lines 51 and 87; `apps/api/src/modules/project-store/project-folders.ts` lines 34 to 51; `projects.service.ts` lines 82 to 102 (the pattern New uses).
- **Refusals.** An unknown `sampleId` (not in the list), and a listed sample whose folder or `project.yaml` is missing: 404 `PROJECT_NOT_FOUND`. A sample `project.yaml` that is not `ok` (invalid or too new): 422 `PROJECT_INVALID`. Source: unit line 20 (`PROJECT_NOT_FOUND`); `errors.ts` lines 9, 19, 62 and 72. The 422 row for a bad sample is a planner's choice (open point 9).
- **Answer.** Success is 201 with the project summary, as New answers. Source: `projects.controller.ts` line 30 (`@HttpCode(201)` on New); `plans/PST-01.md` line 38 (D8: start-from-sample answers the summary). Planner's choice: 201, not 200.
- **No activation.** The new project is not made active. Activation is PST-04's POST (`units/PST-04-active-project-switching.md` line 19), and the picker calls it (`units/PST-09-project-picker-ui.md` line 22). Source: unit line 20 says nothing about activation. Planner's choice; open point 1.
- **Writes.** `project.yaml` is written last, through `writeFileAtomic` (`atomic-write.ts` lines 6 to 16), as New does (`projects.service.ts` lines 95 to 98). Every destination path goes through `ProjectStoreService.resolvePath`, the one path check (`modules/project-store.md` line 44).
- **Symbolic links.** A symbolic link inside a sample, or any entry that is neither a regular file nor a folder, fails the start with 400 `PROJECT_PATH_OUTSIDE`, after the rollback. Source: `plans/PLT-20.md` line 38 (D12: no link under `examples/`, because a copy could bring in a file from outside the repository); `path-safety.ts` lines 45 to 47 (`fail`). Planner's choice of code: the contract has no sample-specific code (open point 4).
- **No layout folders.** The copy does not add `sources/`, `entities/`, `drafts/`, `graphs/` or `logs/`. It holds what the sample ships. Source: unit line 20 (copies `examples/<sampleId>/`); `units/PST-03-discovery-new-import.md` line 22 (layout folders appear lazily). Planner's choice; open point 6.
- **Messages.** Fixed strings in a module-local constant `SAMPLE_MESSAGES`, in `samples.service.ts`. Nothing is imported from `projects.service.ts`, so PST-05 does not depend on the export that PST-04 plans (`plans/PST-04.md` line 101). `plans/DECISIONS.md` line 3665 offers two options (a method in `ProjectsService`, or an exported map); this plan takes a third. Planner's choice; open point 5. No input value is echoed and no container path appears (`modules/project-store.md` line 48).
- **Unreadable list.** A `samples.yaml` that is not YAML, or fails `sampleListSchema`, throws a plain `Error`. The exception filter answers 500 `PLATFORM_INTERNAL` and logs it (`platform-exception.filter.ts` lines 94 to 97). Planner's choice.
- **Startup.** Nothing is copied at boot. Boot writes only the app-state folder and the settings file. Source: unit line 22; `platform/boot/app-state.ts` lines 8 to 11; `platform/settings/settings.service.ts` lines 82 to 95.
- **Active-project rule.** Neither route names a project id, so the active-project rule (`modules/project-store.md` line 47) does not apply. Both routes sit behind the global default-deny guard (`setup-auth/setup-auth.module.ts` line 44; `setup-auth/setup-auth.guard.ts` line 35).
- **Contract.** No contract change. Every name this unit uses already exists: `routes.ts` lines 9 to 11; `project.ts` lines 64 to 69, 81 to 88 and 98 to 104; `errors.ts` lines 6, 7, 9, 18, 19, 59, 60, 62, 71 and 72. Source: `plans/PST-01.md` (done).
- **Tests.** The tests use a temp library and a temp samples folder, through `createTestApp` with `env.SCRIBA_EXAMPLES_DIR`. No test reads the repository's `examples/`. Source: unit line 23; `modules/project-store.md` lines 56 and 58; `apps/api/test/create-test-app.ts` lines 11 and 77 to 84.
- **Test names.** `C<n>:` for a criterion and `E<n>:` for an extra test, as `apps/api/test/project-store-new.test.ts` does (lines 17 and 57). Planner's choice.

## 2. Files to create or change

Only the five paths below change. Nothing under `packages/contracts/`, `examples/`, `units/`, `modules/` or `plans/` changes, except this file, which is written by the planner. `apps/api/package.json` already lists `yaml` (line 19).

| Path | Change | Purpose |
|---|---|---|
| `apps/api/src/modules/project-store/samples.service.ts` | new | `SamplesService` (`@Injectable()`). Constructor `(store: ProjectStoreService, projects: ProjectsService, @Inject(SCRIBA_ENV) env: ScribaEnv)`. Constants `SAMPLES_FILE = 'samples.yaml'`, `EXCLUDED_PATHS = ['.scriba', 'logs', 'snapshots', 'drafts/.versions']` and `SAMPLE_MESSAGES`. Methods `list(): Sample[]` and `start(request: StartFromSampleRequest): ProjectSummary`, and a private `copyTree`. Algorithm below |
| `apps/api/src/modules/project-store/samples.controller.ts` | new | `SamplesController` (`@Controller()`). `@Get(SAMPLES_ROUTE) list()`; `@Post(PROJECT_START_FROM_SAMPLE_ROUTE) @HttpCode(201) start(@Body(new ZodValidationPipe(startFromSampleRequestSchema)) body)`. Style as `projects.controller.ts` |
| `apps/api/src/modules/project-store/project-store.module.ts` | edit | Two imports, `./samples.controller` and `./samples.service`. Line 18 becomes `controllers: [ProjectsController, SamplesController],`. `SamplesService,` goes after `ProjectsService,` (line 29). `exports` and the entry-file exports do not change. Expect a text conflict with PST-04 on these lines (open point 3) |
| `apps/api/test/project-store-samples.kit.ts` | new | `buildSamplesFixture()` returns `{library, samples, remove}`. The temp library holds `book/project.yaml`. The temp samples folder holds `samples.yaml` and the samples below. `withSamplesApp(fixture, run)` boots `createTestApp({libraryDir: fixture.library, env: {SCRIBA_EXAMPLES_DIR: fixture.samples}})`, takes the session cookie and closes the app. Helpers `getSamples(app, cookie)` and `startFromSample(app, cookie, body)` |
| `apps/api/test/project-store-samples.test.ts` | new | Four tests (section 4). The file does not contain the word "examples", so the examples-check rule (section 7) cannot flag it |

Fixture contents (in the kit):
- `samples.yaml`: four list items, each with `id`, `title` and `description`. `test-sample` (has a folder); `ghost` (listed, no folder); `broken` (its `project.yaml` is `schemaVersion: [1`); `linked` (has a symbolic link, below).
- `test-sample/project.yaml`: a comment line, then `schemaVersion: 1`, `title: Test Sample`, `genrePack: nonfiction`.
- `test-sample/.gitignore` (`.scriba/`), `test-sample/sources/outline.md`, `test-sample/drafts/chapter-one.md`.
- Planted excluded paths: `test-sample/.scriba/settings.yaml`, `test-sample/logs/run.log`, `test-sample/snapshots/snap.md`, `test-sample/drafts/.versions/chapter-one.md/2026-01-01T00-00-00Z.md`.
- `linked/project.yaml` (valid, same text as `test-sample`'s) and `linked/link.md`, a symbolic link with an absolute target inside the samples folder.

`SamplesService.start(request)`, in this order:
1. Find `request.sampleId` in `list()`. Not found: 404 `NOT_FOUND`.
2. Read `<samples folder>/<id>/project.yaml`. ENOENT or ENOTDIR: 404 `NOT_FOUND`. Other errors are rethrown.
3. `readYamlState(text)` (`project-yaml.ts`). A status other than `ok`: 422 `INVALID`. Keep `genrePack` from the state.
4. `const doc = parseDocument(text); doc.set('title', request.title); const yamlText = doc.toString();`
5. `reserveProjectFolder(store.libraryRoot, request.folderName)`. `false`: 409 `EXISTS`. The root is `join(store.libraryRoot, request.folderName)`.
6. In a try: `copyTree(sampleRoot, root, '')`, then `writeFileAtomic(store.resolvePath(root, 'project.yaml').realPath, yamlText)`. On any error: `rmSync(root, {recursive: true, force: true})`, then rethrow.
7. Return `summaryOf(request.folderName, {status: 'ok', title: request.title, genrePack}, this.projects.activeId())`.

`copyTree(source, root, relative)`: for each entry of `readdirSync(join(source, relative), {withFileTypes: true})`, with `rel` the path relative to the sample root (`relative === '' ? name : relative + '/' + name`):
- skip when `EXCLUDED_PATHS` contains `rel`, and skip `rel === 'project.yaml'` (step 6 writes it);
- a directory: `mkdirSync(store.resolvePath(root, rel).realPath)`, then recurse;
- a regular file: `copyFileSync(join(source, rel), store.resolvePath(root, rel).realPath)`;
- anything else: `throw fail(PROJECT_ERROR_CODES.PATH_OUTSIDE, PATH_MESSAGES.OUTSIDE)`.

`list()`: read `<samples folder>/samples.yaml`. ENOENT gives `[]`. Otherwise `parse` the text and check it with `sampleListSchema.safeParse`. A YAML error or a failed check throws `new Error('The sample list could not be read.')`. The samples folder is `this.env.SCRIBA_EXAMPLES_DIR`.

## 3. Method

Run from `/Users/bbartolome/workspace/scriba-prototype`, on branch `unit/PST-05` created from `main`, in a clean worktree or the main tree as the orchestrator directs. Record `node -v` and `npm -v` beside each result. Do not push and do not open a pull request. Leave the changes for the orchestrator to commit. Commit subjects follow the prompt.md rule noted in `plans/DECISIONS.md` line 3666.

1. Runtime. `node -v` prints `v26.x` and `npm -v` prints the version found. Expected: `v26.x`.
2. Base. On the new branch, `git status --short` prints nothing before any edit. Expected: no output.
3. Red. Write the kit and the test file (sections 2 and 4). Run `npm test -w @bbartolome/scriba-api -- project-store-samples`. Expected: the build passes, and C1, C3 and E1 fail (404 from the two routes, or the first refusal row answering 404). C2 may already pass, because it exercises the boot only and nothing copies at boot; that is expected and is recorded. No compile error.
4. Write `apps/api/src/modules/project-store/samples.service.ts` as section 2 specifies, in the order of the seven steps of `start`.
5. Write `apps/api/src/modules/project-store/samples.controller.ts` as section 2 specifies.
6. Edit `apps/api/src/modules/project-store/project-store.module.ts`: two imports, line 18 and the provider line (section 2). Change no other file under `apps/api/src`.
7. Run `npx prettier --write apps/api/src/modules/project-store apps/api/test/project-store-samples.kit.ts apps/api/test/project-store-samples.test.ts`. Expected: each file is reported as written or unchanged.
8. Green. Run `npm test -w @bbartolome/scriba-api`. Expected: exit 0. The four new tests pass, and so does every existing API test, including the PST-02 and PST-03 tests.
9. Root gates. From the root, run `npm run build`, `npm test` and `npm run lint`. Expected: each exits 0. `npm run lint` ends with `All matched files use Prettier code style!`.
10. Reading checks.
    - (a) `grep -c "examples" apps/api/test/project-store-samples.test.ts` prints `0`.
    - (b) `git diff --stat -- packages examples apps/api/src/modules/project-store/projects.service.ts apps/api/src/modules/project-store/project-store.service.ts apps/api/src/modules/project-store/projects.controller.ts` prints nothing.
    - (c) `git status --short` lists exactly the five paths of section 2.
    - (d) `grep -n "PROJECT_MESSAGES" apps/api/src/modules/project-store/samples.service.ts` prints nothing.
11. Record. Store the Node and npm versions and the output of the commands in steps 3, 8 and 9. A criterion row in section 4 is passed only when its pass condition holds.

## 4. Acceptance criteria and tests

All tests run with `npm test -w @bbartolome/scriba-api` after the build. None needs a remote, a browser or a model. The seam is the composed app (`createTestApp`, the module's default seam, `modules/project-store.md` line 56) against a temp library, with the samples folder given through `SCRIBA_EXAMPLES_DIR` (unit line 23). The tests read files on disk and HTTP answers only.

| Criterion (unit line) | Test file and test name | Pass condition |
|---|---|---|
| "Start from sample copies a test sample under a chosen name; only `title` differs in `project.yaml` (comments intact); excluded folders planted in the test sample are not copied." (26) | `apps/api/test/project-store-samples.test.ts`, `C1: start from sample copies the test sample under the chosen name, changes only the title line of project.yaml, and copies no excluded folder` | POST `{sampleId: 'test-sample', folderName: 'my-copy', title: 'My Copy'}` answers 201 with `{id: 'my-copy', title: 'My Copy', genrePack: 'nonfiction', active: false, status: 'ok'}`. The copy's `project.yaml` equals the sample text with `title: Test Sample` replaced by `title: My Copy`. `sources/outline.md`, `drafts/chapter-one.md` and `.gitignore` are byte-equal to the sample's. `.scriba`, `logs`, `snapshots` and `drafts/.versions` do not exist in the copy, and the copy has no `samples.yaml`. `snapshotLibrary(fixture.samples)` is the same before and after. |
| "Nothing is copied at startup (library unchanged after boot)." (27) | `C2: nothing is copied at startup: after boot the library changes only inside .scriba` | `createTestApp` with the fixture and no request. `changedPaths(before, after)`, without the entries `.scriba` and `.scriba/...`, is `[]`. May already pass in the red state (section 3, step 3). |
| "The sample list GET returns the `samples.yaml` entries and is side-effect free." (28) | `C3: the sample list GET returns the samples.yaml entries and changes nothing` | GET answers 200, and its body equals `parse(samples.yaml)` read from the fixture. `snapshotLibrary` of the library and of `fixture.samples` is the same before and after. |
| Extra, not a criterion: refusals | `E1: a refused start writes nothing: an existing folder, an unknown, unlisted or broken sample, a link inside a sample, and a bad folder name` | After one successful start of `my-copy`, seven refusal rows. Each row compares `snapshotLibrary(fixture.library)` before and after. `my-copy` again: 409 `PROJECT_EXISTS`. `missing`: 404 `PROJECT_NOT_FOUND`. `ghost`: 404 `PROJECT_NOT_FOUND`. `broken`: 422 `PROJECT_INVALID`. `linked`: 400 `PROJECT_PATH_OUTSIDE`. A 300-character folder name: 400 `PROJECT_PATH_INVALID`. `Bad_Name`: 400 `PLATFORM_VALIDATION_FAILED`. |

Helpers come from the kit and from `apps/api/test/project-store-projects.kit.ts` (`postJson`, `readJson`, `errorOf`, `changedPaths`); `snapshotLibrary` comes from `apps/api/test/invariant-sweep.ts`.

## 5. Downstream agreement

The units whose `blocked_by` names PST-05 are PST-09, PST-12 and GNP-18. Each check below must hold when that unit is planned and built.

- **PST-09 (project picker UI; unit lines 7, 21, 22 and 26).**
  - (a) The sample cards come from `GET /api/project-store/samples` and use `id`, `title` and `description` only.
  - (b) The request always carries `folderName`, which the schema requires (`project.ts` line 67), because the author chooses it.
  - (c) The picker reads 201 and the summary as success.
  - (d) The picker activates the new project with the PST-04 POST, called after this one, because this POST does not activate (section 1).
  - (e) The e2e step reads the nonfiction sample through `SCRIBA_EXAMPLES_DIR` (`plans/PLT-13.md` line 264).
- **PST-12 (files gate; unit lines 18, 24, 28 and 34 to 35).**
  - (a) Demo step 1, "Start from sample → Nonfiction, named `demo-book`", is this POST with `sampleId: 'nonfiction'`.
  - (b) Demo step 2: `demo-book/` has no `structure/`, because `examples/nonfiction` ships none (none of the ten files that `git ls-files examples` lists is under a `structure/` folder), and its `.gitignore` holds `.scriba/` (`examples/nonfiction/.gitignore` line 1), which the dot-file copy keeps.
  - (c) "Nothing is copied at startup" is C2.
  - (d) "Every GET is side-effect free" covers C3 and the PST-12 sweep (`units/PST-12-files-gate.md` line 18).
  - (e) Both new routes are refused without a session (the default-deny guard). PST-12 adds the unauthenticated test.
- **GNP-18 (fiction sample; unit lines 7, 16, 19 and 22).**
  - (a) Its `samples.yaml` entry is a list item with `id`, `title` and `description`, so the GET lists it.
  - (b) Its folder may hold nested `entities/`, `graphs/` and `drafts/`. The copy handles nested folders.
  - (c) Its `project.yaml` has no `order`, and the copy changes only the title.
  - (d) It adds no `.scriba/`, `logs/`, `snapshots/` or `drafts/.versions/` (unit line 22). If it did, the copy would skip them.

Indirect consumers, not blocked by PST-05:
- SAU-14 (`units/SAU-14-first-project-step.md` line 15) uses the same two endpoints. It is blocked by PST-12, so the PST-09 checks apply to it as well.
- PLT-20 (examples check): D7 (`samples.yaml` as a list), D8 (a `project.yaml` at each sample root), D11 (the same four excluded paths at the root) and D12 (no links) match the list, copy and refusal rules of this plan (`plans/PLT-20.md` lines 33, 34, 37 and 38).
- `parallel_with` symmetry holds. PST-04, PST-06, PST-08 and PST-11 each name PST-05 at line 8 of their units, and none of them is a blocker of PST-05 (PST-05 is blocked by PST-03 alone).
- `unblocks` is the exact inverse of the blocker lists. PST-05 unblocks PST-09 and PST-12 (line 9) and the GNP-18 label, and each names PST-05 in its `blocked_by` (PST-09 line 7, PST-12 line 7, GNP-18 line 7). Holds.

## 6. Open points

1. **No activation.** Start from sample does not make the new project active (section 1). PST-09's plan must say how the picker lands in the new project: the activate POST of PST-04, called after this one. Planner's choice; the orchestrator confirms it with PST-09.
2. **Status 201.** Chosen to match New. The unit does not fix it. PST-09's client must treat 201 as success.
3. **Shared module file with PST-04.** `project-store.module.ts` lines 18 and 29 are edited by both plans (`plans/PST-04.md` lines 43 and 49). The orchestrator keeps both sets of entries when the second plan merges. PST-06 and PST-08 will add providers to the same file when they are planned; the same rule applies.
4. **Link refusal code.** A link inside a sample is refused with `PROJECT_PATH_OUTSIDE` (400), a code the contract already has. The contract has no sample-specific code, and a new one would be an expand–contract change to the contract. Not done here.
5. **Duplicate message text.** `SAMPLE_MESSAGES.EXISTS` repeats the sentence of `PROJECT_MESSAGES.EXISTS` (`projects.service.ts` line 38). The two can be merged later, once PST-04 has exported its list. Not done here, so PST-05 does not depend on PST-04.
6. **Layout folders.** A copy holds only the sample's own tree. PST-07's `appendLog` (not yet planned) must create `logs/` on its first write, as `units/PST-03-discovery-new-import.md` line 22 says for every layout folder. Check when PST-07 is planned.
7. **Sweep order.** The invariant sweep covers the two new routes once they are on `main` when the sweep runs. `plans/SAU-07.md` line 178 (open point 4) leaves the ordering to the coordinator. PST-12 runs the sweep over every Project store GET (unit line 18).
8. **Unit label (informative).** The `unblocks` label of PST-05 for GNP-18 (`"Genre packs fiction sample (GNP-18)"`) differs from GNP-18's own title (`units/GNP-18-fiction-sample.md` line 3). The IDs match in both directions. No unit change is requested.
9. **Refusals of bad samples.** The 422 for an invalid or too-new sample `project.yaml`, and the 500 for an unreadable `samples.yaml`, are planner's choices. PLT-20 checks the shipped samples, so neither can happen with the shipped content.

## 7. Facts checked

Units and modules (read in full or by line):
- `units/PST-05-start-from-sample.md`: line 3 (title), 7 (`blocked_by: [PST-03]`), 8 (`parallel_with`), 9 (`unblocks`), 15 (Why), 18 to 23 (Decisions), 26 to 28 (criteria).
- `units/PST-03-discovery-new-import.md`: line 9 (`unblocks` names PST-05), 21 (New scaffolds without `structure/`), 22 (Import; layout folders created lazily), 23 (project.yaml as a YAML document, comment-preserving).
- `units/PST-04-active-project-switching.md`: line 8 (`parallel_with` names PST-05), 19 (activate is a POST).
- `units/PST-06-file-api-core.md`, `units/PST-08-entity-resolution.md`, `units/PST-11-nonfiction-sample-skeleton.md`: line 8 (`parallel_with` names PST-05).
- `units/PST-09-project-picker-ui.md`: line 7 (`blocked_by` names PST-05), 21 (Start from sample), 22 (switching by activate POST), 26 (the e2e step).
- `units/PST-12-files-gate.md`: line 7 (`blocked_by` names PST-05), 18 (GET invariant over every Project store GET), 24 (Start from sample criterion), 28 (every GET side-effect free), 34 and 35 (demo steps 1 and 2).
- `units/GNP-18-fiction-sample.md`: line 3 (title), 7 (`blocked_by` names PST-05), 16 (no `order`), 19 (graphs), 22 (no excluded paths).
- `units/SAU-14-first-project-step.md`: line 15 (uses the same endpoints).
- `units/PST-01-contract-slice.md`: line 27 (start-from-sample request; sample list `[{id, title, description}]`).
- `units/README.md`: lines 59 to 65 (blocker notation; line 64 is the `unblocks` inverse rule).
- `modules/project-store.md`: line 18 (graph), 39 (PST-04 and PST-05 in parallel), 44 (path safety), 45 (GETs never mutate), 46 and 47 (routes; active-project rule), 48 (only project-relative paths), 50 (atomic writes), 51 and 52 (no other module's implementation; exported provider), 56 (primary seam), 58 (tests never read `examples/`), 75 (samples ship no excluded paths).
- `modules/genre-packs.md`: line 23 (GNP-18 blocked by PST-05).
- `plans/PLT-02.md`: front matter lines 1 to 4; section headings at lines 11, 35, 60, 77, 89 and 95 (the structure this plan follows).

Other plans:
- `plans/PST-01.md`: line 38 (D8: start-from-sample answers the summary), lines 61 and 62 (route rows: start-from-sample POST answers the summary; samples GET answers the sample array).
- `plans/PST-02.md`: line 63 (S12, the lookup rule for `sampleId`), line 294 (PST-05 note).
- `plans/PST-03.md`: lines 51 (reservation rule), 87 (`project-folders.ts` row; PST-05 reuses `reserveProjectFolder`), 167 (PST-05 hand-off), 186 (title edit by PST-05, closed).
- `plans/PST-04.md`: line 3 (`status: planned`), 27 (D12, messages), 39 to 43 (rows for the shared files), 49 (shared-file note), 91 (check for PST-05), 101 (`PROJECT_MESSAGES` export recommended).
- `plans/PST-11.md`: line 51 (the sample's title is a one-line plain scalar), 155 (dot-files hand-off to PST-05), 160 (title-only rewrite), 182 (F7: the Dockerfile copies `examples/`).
- `plans/PLT-20.md`: lines 33 (D7), 34 (D8), 37 (D11), 38 (D12).
- `plans/PLT-13.md`: line 264 (PST-09's e2e step uses `SCRIBA_EXAMPLES_DIR`).
- `plans/SAU-07.md`: line 178 (open point 4, sweep ordering).
- `plans/DECISIONS.md`: line 2346 (heading) and 2352 (item 4: lookups in the discovered lists only); line 3483 (heading) and 3485 (item 3: PST-05 does the title edit with `yaml`); line 3660 (heading) and 3665 (note for PST-05: `reserveProjectFolder` throws only on ENAMETOOLONG; the caller maps `false` and rolls back); line 3666 (commit subjects).

Contracts (`packages/contracts/src/`):
- `project-store/routes.ts`: lines 1 to 4 (GET never mutates; POST commands), 9 and 10 (`PROJECT_START_FROM_SAMPLE_ROUTE`), 11 (`SAMPLES_ROUTE`).
- `project-store/project.ts`: lines 52 to 57 (`newProjectRequestSchema`), 64 to 69 (`startFromSampleRequestSchema`; `folderName` at line 67), 81 to 88 (`sampleSchema`, `sampleListSchema`), 98 to 104 (`StartFromSampleRequest`, `Sample`, `SampleList` types).
- `project-store/errors.ts`: lines 6 and 7 (`PATH_INVALID`, `PATH_OUTSIDE`), 9 (`NOT_FOUND`), 18 and 19 (`EXISTS`, `INVALID`); statuses at 59 (400), 60 (400), 62 (404), 71 (409), 72 (422).
- `project-store/constants.ts`: line 14 (`PROJECT_FOLDER_NAME_PATTERN`), lines 17 to 20 (reserved prefixes), line 26 (`DEFAULT_GENRE_PACK`).
- `platform/errors.ts`: lines 36 to 41 (`PLATFORM_ERROR_CODES`, including `INTERNAL` at line 40), 44 to 49 (`PLATFORM_ERROR_STATUS`, `PLATFORM_INTERNAL` 500 at line 48).
- `platform/env.ts`: line 14 (`SCRIBA_EXAMPLES_DIR` default `/opt/scriba/examples`).

API code (`apps/api/src/`):
- `modules/project-store/project-store.module.ts`: lines 1 to 6 (imports), 9 and 10 (entry-file exports), 16 to 32 (`@Module`; line 17 imports, 18 `controllers: [ProjectsController]`, 19 to 30 providers with `ProjectStoreService` at 28 and `ProjectsService` at 29, 31 exports).
- `modules/project-store/projects.controller.ts`: lines 18 and 19 (class), 22 to 27 (list), 29 to 36 (New; `@HttpCode(201)` at line 30), 38 to 44 (Import).
- `modules/project-store/projects.service.ts`: line 16 (`ModuleError` import), 35 to 44 (`PROJECT_MESSAGES`; `EXISTS` at line 38), 55 to 60 (`activeId`, public), 71 to 104 (`create`: reservation 82 to 88, rollback 90 to 102, writes 95 to 98, summary 103), 108 to 152 (`importProject`).
- `modules/project-store/project-folders.ts`: lines 34 to 51 (`reserveProjectFolder`; `EEXIST` returns `false` at line 45; ENAMETOOLONG at lines 46 to 48).
- `modules/project-store/atomic-write.ts`: lines 6 to 16 (`writeFileAtomic`).
- `modules/project-store/project-yaml.ts`: lines 14 to 18 (`YamlState`), 21 to 46 (`readYamlState`), 55 to 64 (`newProjectYaml`).
- `modules/project-store/project-discovery.ts`: lines 47 to 69 (`summaryOf`).
- `modules/project-store/path-safety.ts`: lines 21 to 34 (`PATH_MESSAGES`; `OUTSIDE` at 29 and 30), 45 to 47 (`fail`), 75 to 90 (`realRoot`; a missing root is `NOT_FOUND` at 82 and 87), 118 to 196 (`resolveProjectPath`).
- `modules/project-store/project-store.service.ts`: line 8 (`SCRIBA_ENV` injected), 10 to 13 (`libraryRoot`), 15 to 18 (`resolvePath`).
- `modules/platform/platform.module.ts`: line 13 (`SCRIBA_ENV` export), 17 (`ModuleError`, `ZodValidationPipe`), 19 (`SettingsService`).
- `modules/platform/boot/env.ts`: line 10 (`SCRIBA_ENV` token), 15 to 28 (`ScribaEnv`; line 21 `SCRIBA_EXAMPLES_DIR`), 111 to 116 (read as an absolute path).
- `modules/platform/boot/app-state.ts`: lines 8 to 11 (creates `.scriba` at boot).
- `modules/platform/settings/settings.service.ts`: lines 82 to 95 (`onApplicationBootstrap` writes the settings file).
- `modules/platform/errors/platform-exception.filter.ts`: lines 42 to 50 (a `ModuleError` keeps its own code and status), 94 to 97 (any other error is 500 `PLATFORM_INTERNAL`, logged).
- `app.module.ts`: lines 18 to 24 (`COMPOSED_MODULES`: `PlatformModule` at 19, `SetupAuthModule` at 20, `ProjectStoreModule` at 22), 36 to 41 (`buildRootModule`; `global: true` at 39, the `SCRIBA_ENV` provider at 40).
- `modules/setup-auth/setup-auth.module.ts` line 44 (`APP_GUARD`); `modules/setup-auth/setup-auth.guard.ts` line 35 (the global default-deny guard).
- `apps/api/package.json`: line 6 (`build`), 7 (`test`), 19 (`yaml` 2.9.1).
- Root `package.json` line 24 (the dev script sets `SCRIBA_EXAMPLES_DIR` to the repository's `examples/`).

Test support (`apps/api/test/`):
- `create-test-app.ts`: line 11 (`env` option, merged over the base env), 77 (the `bootstrap` call), 81 (base `SCRIBA_EXAMPLES_DIR`), 83 (`...options.env`).
- `project-store-projects.kit.ts`: lines 19 to 23 (`ProjectsLibrary`), 30 (`buildProjectsLibrary`), 89 to 100 (`withProjectsApp`), 102 to 108 (`getProjects`), 111 to 125 (`postJson`), 127 to 133 (`readJson`, `errorOf`), 140 to 148 (`changedPaths`).
- `project-store-new.test.ts`: line 15 (`LAYOUT_FOLDERS`), 17 (the C3 name), 57 (the E1 name), 99 (`Bad_Name` row: `PLATFORM_VALIDATION_FAILED`), 104 (300-character row: `PROJECT_PATH_INVALID`).
- `invariant-sweep.ts`: line 38 (`LOOPBACK_HOST`), 88 (`DERIVED_CACHE_PATHS`), 224 to 228 (`snapshotLibrary`).
- `guard-request.ts`: line 27 (`send`), 80 to 83 (`sessionCookie`).
- `scripts/examples-check/m1.mjs`: line 25 (`TEST_FILE` is `*.test.*` and `*.spec.*` only, so `*.kit.ts` is not scanned), 30 (R1), 32 and 33 (R2), 205 to 208 (the test scan), 224 to 229 (`namesExamples`).
- `scripts/boundaries.test.mjs` lines 20 and 21 (the module and the service are lint targets).

Samples and repository state:
- `examples/samples.yaml` lines 1 to 3 (one entry, `nonfiction`); `examples/nonfiction/project.yaml` lines 1 to 4 (a comment, `schemaVersion: 1`, `title: The Long Apprenticeship`, `genrePack: nonfiction`); `examples/nonfiction/.gitignore` line 1 (`.scriba/`).
- `ls examples` lists `nonfiction/` and `samples.yaml` only. `git ls-files examples` lists ten files: nine under `nonfiction/` and `samples.yaml`. None is under a `structure/` folder.
- `apps/web/src/app/features/` has no `project-store` folder (PST-09 is not on `main`).
- `git rev-parse --short HEAD` on `main` is `d63a95b`; the working tree was clean when this plan was written.
- Among the draft and planned plans, only `plans/PST-04.md` names `project-store.module.ts`, `projects.service.ts` or `project-store.service.ts` (grep of `plans/`).

Measured (a `node -e` probe against `node_modules/yaml` 2.9.1; no file was written):
- `parseDocument` of `examples/nonfiction/project.yaml` has no errors. After `doc.set('title', 'Demo Copy')` and `toString()`, the text equals the file with only the title line changed.
- A probe with a comment above the title, a quoted title and a trailing comment on the title line kept all three. A new title containing `: ` was written in double quotes.
- A probe on a file with no `title` key appended `title` as the last line.

## 8. Assumed

- The Dockerfile copies `examples/` to `/opt/scriba/examples`, as `plans/PST-11.md` line 182 says. The Dockerfile was not read in this planning run.
- `npm test -w @bbartolome/scriba-api -- <pattern>` passes the pattern to `vitest run`, and vitest picks up `apps/api/test/*.test.ts`. The existing project-store tests use this layout; the command was not run.
- The existing API tests pass on `main` at `d63a95b`. Not run by the planner.
- `readdirSync` with `withFileTypes` reports a symbolic link as neither a file nor a folder, and `copyFileSync` copies bytes exactly. These are Node's documented behaviours; not probed.
- In C2, boot writes only `.scriba` entries. `app-state.ts` and `settings.service.ts` (section 7) are the only boot writers read here.
- The string `Test Sample` occurs once in the fixture's `project.yaml`, so the C1 replacement is exact.
- PST-04 is implemented as its plan says. Its only overlap with this plan is `project-store.module.ts` (open point 3).
- PST-09, PST-12, GNP-18 and SAU-14 are built as their units say. Their plans do not exist yet.
- The two new routes get the global guard without any change (default-deny in `SetupAuthModule`), and `sessionCookie` works in the composed app on `main`, as the existing tests rely on.
- Node 26 is on the PATH. The root `engines` field asks for `>=26 <27` (`plans/PLT-13.md` line 322). Not checked in this run.
