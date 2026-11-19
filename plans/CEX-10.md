---
id: CEX-10
status: draft
---
# CEX-10 plan — Pandoc runner, md export, download endpoint, busy/timeout/error mapping, CI Pandoc and Typst

Planner revision 1, at main d152b38. Unit: `units/CEX-10-pandoc-runner-md-export.md` (module compile-export, phase:export, M5). The unit has no change note (grep for "Moved", "Loosened", "Reworded" and "Removed by revision" finds none), so it is planned as written. No contract change is needed. Status stays draft until a reviewer approves it.

Tags: `F<n>` is a fact checked in section 2a, with its file and line. `A<n>` is an assumption in section 2b. `D<n>` is a choice of this plan (names, layout, test structure and the values the unit leaves open). Line numbers were read with `cat -n`, `sed -n` or `grep -n` at d152b38. Pandoc and Typst are not installed in this environment, so nothing about their behaviour was run here.

## 1. Decisions this plan follows

### 1a. From the unit, the module and the README

- **U1 Route and body.** `POST /api/compile-export/export {format}` returns `{format, fileName, bytes, downloadUrl, preflight: summary, warnings}`. It always runs preflight first and attaches its summary; the export still succeeds when preflight has errors. Source: unit line 15; `packages/contracts/src/compile-export/export.ts` lines 6 to 18.
- **U2 Download.** The GET of `downloadUrl` streams the file with `Content-Disposition: attachment; filename=<fileName>` and has no side effects. Source: unit line 16.
- **U3 Storage.** Output goes under `stateDir(projectId, 'compile-export')/exports/` with plain `fs`; only the latest file per format is kept; `fileName` is `<title-slug>-<yyyymmdd-hhmm>.<ext>` in UTC; no `exports/` folder in the project layout. Source: unit line 17; module "Settled decisions" (module line 53).
- **U4 Pandoc invocation.** Pandoc 3.13 as a child process with an argument array and no shell, in a temp working directory; `--resource-path` is the project root; a wall-clock timeout (default 120 s) gives `COMPILE_PANDOC_TIMEOUT`; an output size cap; never `--filter` or Lua filters from project content; one export per project at a time (a second one gives `COMPILE_EXPORT_BUSY`); stderr warnings go in `warnings`; a non-zero exit gives `COMPILE_PANDOC_FAILED` with the stderr tail; an empty manuscript gives `COMPILE_EMPTY_MANUSCRIPT`. Source: unit line 18.
- **U5 md.** The assembled Markdown itself, without calling Pandoc, validated by a Pandoc parse in tests. Source: unit line 19; module "Testing principles" (module line 60).
- **U6 Event.** Publish `export-finished`. Source: unit line 20; module "Events" (module line 44).
- **U7 CI.** Add the Pandoc 3.13 and Typst installation to Platform's `ci.yml` as an additive step. Export tests skip locally with a clear message when a binary is missing; CI sets a flag that turns the skip into a failure. Source: unit line 21.
- **U8 Test seam.** External behaviour only (HTTP, files on disk), never internal services or Pandoc's argument list. Primary seam: the module in `create-test-app`. Source: module "Testing principles" (module lines 58 and 59); `units/README.md`, "Conventions shared by every module", Testing bullet.
- **U9 Reads.** A GET never mutates. Source: `units/README.md`, "Conventions shared by every module", HTTP bullet.
- **U10 Criteria.** The four criteria at unit lines 24 to 27 are tested in section 5. None is added, dropped or weakened.

### 1b. From DECISIONS and other plans

- **P1 Writable folder.** Pandoc 3.13 writes PDF media into the current directory. The API's working directory `/opt/scriba/app` is not writable by UID 1000, so the runner sets the child's `cwd` to a temp folder. Source: `plans/DECISIONS.md` line 757 (PLT-14 review, Blocking 1, which names CEX-10); `plans/PLT-14.md` lines 229, 233 and 283.
- **P2 Pins.** Pandoc 3.13 (`pandoc-3.13-1-<arch>.deb`) and Typst v0.15.1 are pinned with SHA256 in the Dockerfile. CI on `ubuntu-latest` uses the amd64 pins. Source: `Dockerfile` lines 10 to 12 (pins), 19 and 21 (URLs), 23 (tarball layout); `scripts/smoke-image.sh` lines 50 to 64 (version checks).
- **P3 CI step placement.** The four ordered runs stay unchanged, and the install step goes before `Test`. Source: `plans/PLT-10.md` line 119; `scripts/ci-workflow.test.mjs` lines 14 and 26 to 40.
- **P4 CI evidence.** A CI run cannot be observed from this environment. Earlier units recorded this as a local proxy and a Navigator decision. Source: `plans/DECISIONS.md` lines 602 and 649 (PLT-11 criterion 5); lines 4905 to 4907 (the local-only rule). Open point 1.

### 1c. Choices of this plan (recorded here, not in DECISIONS)

Pandoc runner:

- **D1 Target arguments.** `PANDOC_TARGET_ARGS`: `docx` gives `['--to=docx']`; `epub` gives `['--to=epub3']`; `pdf` gives `['--to=typst', '--pdf-engine=typst']`. CEX-11, CEX-12 and CEX-13 each add their own flags to their entry (`--reference-doc` in CEX-11 line 15; `--split-level=1` in CEX-12 line 15; the template in CEX-13 line 15). Until those units land, the three formats use Pandoc's default styling. The four routes must answer, and the busy, timeout and failure criteria must be tested over HTTP, so the runner needs one real Pandoc path now.
- **D2 Input and arguments.** The assembled Markdown goes to Pandoc's stdin. The arguments are `--from=markdown`, the target arguments of D1, `--resource-path=<project root>` and `--output=<partial path>`. No input file, no `--filter`, no Lua filter, no metadata file.
- **D3 Partial output.** The output is written to `<exports folder>/.<random hex>.<ext>`, with the extension of the format, and renamed to `fileName` only after success. The extension is kept because Pandoc picks PDF output from the file name (A1).
- **D4 Child process.** `spawn(command, args, {cwd: workdir, shell: false, stdio: pipe, windowsHide: true})`. `workdir` is `mkdtemp(join(os.tmpdir(), 'scriba-pandoc-'))`, removed in a `finally`. An error on the child's stdin (EPIPE) is ignored.
- **D5 Timeout.** `timeoutMs` 120000. On expiry the runner sends SIGKILL, waits for `close`, and rejects with `COMPILE_PANDOC_TIMEOUT` (504, `packages/contracts/src/compile-export/errors.ts` line 44). No details.
- **D6 Stderr.** The runner keeps the last `stderrMaxBytes` = 16384 bytes of stderr. That text is `details.stderrTail` on failure. On success, its non-empty trimmed lines are `warnings`.
- **D7 Output size cap.** `outputMaxBytes` = 104857600 (100 MiB), checked after a zero exit. Over the cap: `COMPILE_PANDOC_FAILED` with `details.reason = 'output-too-large'`. The unit names a cap but gives neither a number nor a code (open point 2).
- **D8 Failure mapping.** Every Pandoc failure is `COMPILE_PANDOC_FAILED` (500, `errors.ts` line 43) with the fixed message `Pandoc failed.` and `details = {reason, exitCode, stderrTail}`. The reasons are `exit` (non-zero exit, `exitCode` set, `null` after a signal), `not-started` (spawn error), `no-output` (zero exit, no file) and `output-too-large`. The tail is in `details`, not in the message (section 6, CEX-18).
- **D9 Tuning token.** `export-tuning.ts` exports the symbol `PANDOC_TUNING`, the interface `PandocTuning` {command, timeoutMs, stderrMaxBytes, outputMaxBytes}, and `DEFAULT_PANDOC_TUNING` = {command: 'pandoc', timeoutMs: 120000, stderrMaxBytes: 16384, outputMaxBytes: 104857600}. The service reads it with `@Optional() @Inject(PANDOC_TUNING)` and merges it over the defaults. Tests override it with a `@Global()` test module. This is the events precedent (`events.publisher.ts` lines 30 and 31; `test/events-write-limit.ts`). No `SCRIBA_*` name is added: the env list is fixed (`packages/contracts/src/platform/env.ts` lines 3 to 21), and a new name would change the contract.

Export flow:

- **D10 Busy.** An in-memory set of project ids. A second export of the same project while one runs, in any format, gives `COMPILE_EXPORT_BUSY` (409, `errors.ts` line 42). The id is released in a `finally`.
- **D11 Order.** Inside the busy guard: (1) the active project, else `PROJECT_NO_ACTIVE` (409, `project-store/errors.ts` line 69); (2) `now = new Date()`; (3) `preflight.run(now)` and its summary; (4) the manuscript view, and `COMPILE_EMPTY_MANUSCRIPT` (422) when it has no entries; (5) `assemble(now)`; (6) the project root, the title, `fileName`, the exports folder and the partial path; (7) for `md`, write the partial file, for the others `runPandoc`; (8) rename to `fileName`, `bytes`, delete older files of the same format (D17); (9) publish `export-finished`; (10) answer. Every read happens before the first await, so the write uses the project captured at step (1) even if the active project changes during Pandoc. The partial file is removed on every failure path.
- **D12 Empty manuscript.** The manuscript is empty when the effective order has no entries (`view.entries.length === 0`). A manuscript whose files are all blank is not empty under this rule (open point 3). CEX-14's template check goes between steps (4) and (7) (section 6).
- **D13 Summary.** `summaryOf(result)` counts the findings of all checks by severity and returns `{ranAt, revision, errors, warnings, infos}` (`packages/contracts/src/compile-export/preflight.ts` lines 41 to 47). It adds no contract field.
- **D14 File name.** `slugOf(title)` (`compile-export/snapshot-names.ts` lines 8 to 18; a title with no Latin letters gives `snapshot`) plus `-` plus `yyyymmdd-hhmm` from `stampOf(now)` (lines 21 to 26), by slicing the stamp. The title is `projects.find(id).summary.title`, which `project-discovery.ts` line 62 sets from `project.yaml` when the status is `ok`. It is read after step (5), so an invalid `project.yaml` fails first with `PROJECT_INVALID`.
- **D15 downloadUrl.** `EXPORT_DOWNLOAD_ROUTE` (`routes.ts` lines 19 and 20) with `:format` replaced by the format. It is a path, not a full URL.
- **D16 md.** `bytes` is `Buffer.byteLength(markdown, 'utf8')`; `warnings` is `[]`.
- **D17 Retention.** After the rename, delete every other file in the exports folder whose name ends with `.<format>` and does not start with a dot.
- **D18 Event.** `{module: 'compile-export', type: 'export-finished', data: {projectId, format, fileName}}` through `EventsPublisher`, after the rename. Nothing is published on failure.

Download:

- **D19 GET.** `:format` is checked with `ZodValidationPipe(exportFormatSchema)` (a bad value gives 400). The GET is read-only: it finds the active project and the folder `<root>/.scriba/compile-export/exports`, with `statSync`, and creates nothing. `stateDir` is not called, because it creates folders (`files.service.ts` lines 479 to 510, `mkdirSync` at 498). The folder passes the same realpath containment check as `stateDir`; a failure is refused with `PROJECT_ERROR_CODES.PATH_OUTSIDE`. No file of that format gives a Nest `NotFoundException`, which the Platform filter maps to `PLATFORM_NOT_FOUND` (`platform-exception.filter.ts` line 61). The contract has no code for a missing export, so none is added.
- **D20 Candidate file.** A regular file (`lstat`), not starting with a dot, ending `.<format>`. If several exist (a crash between write and delete), the newest by `mtime` wins.
- **D21 Response.** `new StreamableFile(createReadStream(path), {type, disposition: 'attachment; filename=<fileName>', length: bytes})`. The types: `md` `text/markdown; charset=utf-8`; `docx` `application/vnd.openxmlformats-officedocument.wordprocessingml.document`; `epub` `application/epub+zip`; `pdf` `application/pdf`.
- **D22 POST status.** `@HttpCode(200)`, as the other commands (`preflight.controller.ts` lines 13 and 14).

Module and tests:

- **D23 Export is exported.** `ExportService` is re-exported from the module entry file and added to `exports`. The module comment says it exports the export service for the Agent loop, and CEX-09's plan (`plans/CEX-09.md` line 161) left the re-export to CEX-10 or AGL-24. This plan takes it, so AGL-24 needs no module edit.
- **D24 No contract change.** Every name used exists in `packages/contracts/src/compile-export`: routes (`routes.ts` 17, 19, 20), request and result (`export.ts` 6 to 18), codes and statuses (`errors.ts` 9 to 13 and 42 to 46), the `export-finished` member (`events.ts` 15 to 19 and 39 to 43), the summary (`preflight.ts` 41 to 47), and the formats (`constants.ts` 44).
- **D25 Test app.** `createTestApp` is used. The kit's `withManuscript` gets an optional `options` argument whose `modules` field is passed to `createTestApp` (`test/create-test-app.ts` line 13). Existing call sites do not change. The tuning module is `[...COMPOSED_MODULES, tuningModule(values)]` (`src/app.module.ts` lines 21 to 30).
- **D26 Fake Pandoc.** A test writes a `/bin/sh` script into its own temp folder, makes it executable and sets it as `command`. Real Pandoc is used only for the parse test. No test edits `PATH`.
- **D27 Golden.** Inline in the test, as CEX-04 settled (`plans/CEX-04.md` line 47). The C1 fixture and expected text are copied from the C1 case of `test/compile-export-assembly.test.ts` (fixture at line 109, expected text from line 130). The clock is faked with `vi.useFakeTimers({toFake: ['Date']})` and `vi.setSystemTime(new Date('2026-11-19T12:00:00Z'))`, both before the app boots. The fixture's date is the same.
- **D28 Skip and flag.** `toolStatus(present, required)` returns `run` when present, `fail` when missing and required, and `skip` otherwise. The kit computes `PANDOC_STATUS` at load from `spawnSync('pandoc', ['--version'])` and from `SCRIBA_REQUIRE_EXPORT_TOOLS === '1'`. `fail` throws at load, so the file fails. `skip` logs one line and the Pandoc tests are skipped (the precedent is `test/installer-first-install.test.ts` lines 31 to 41).
- **D29 CI.** One step, `Install Pandoc 3.13 and Typst 0.15.1`, between `Lint` and `Test` (`ci.yml` lines 26 and 28). It downloads each release, checks its SHA256 against the Dockerfile's amd64 pins, installs it, and checks the version line (the checks of `smoke-image.sh` lines 50 to 64). The `Test` step gets `env: SCRIBA_REQUIRE_EXPORT_TOOLS: '1'`. The flag name follows the `SCRIBA_E2E_CHROMIUM` precedent in the E2E step (`ci.yml` lines 33 and 34).
- **D30 Pins test.** `scripts/ci-export-tools.test.mjs` reads the Dockerfile and asserts that the amd64 SHA256 strings in `ci.yml` equal the Dockerfile's (lines 10 and 12).

## 2. Facts checked and facts assumed

### 2a. Checked

- **F1** `units/CEX-10-pandoc-runner-md-export.md`: front matter lines 2 to 9 (`blocked_by` line 7, `parallel_with` line 8, `unblocks` line 9); Decisions lines 14 to 21; criteria lines 23 to 27. No change note.
- **F2** `modules/compile-export.md`: "Cross-cutting decisions" line 38; "Events" line 44; "Settled decisions" line 46 (exports bullet line 53); "Testing principles" lines 57 to 61 (external behaviour line 58, primary seam line 59, Pandoc tests line 60).
- **F3** `units/CEX-11-docx-export.md` line 15 (`--to=docx --reference-doc=<template>`), line 7 (`blocked_by: [CEX-10]`). `units/CEX-12-epub-export.md` line 15 (`--to=epub3 --split-level=1`), line 7. `units/CEX-13-pdf-typst-spike.md` line 15 (`--to=typst --pdf-engine=typst`), line 7. `units/CEX-14-template-overrides-settings.md` line 7 (`blocked_by: [CEX-03, CEX-10]`), line 16 (`COMPILE_TEMPLATE_INVALID` before Pandoc runs). `units/CEX-15-export-gate-image-smoke.md` line 7 and line 21 (criterion: CEX-10 to CEX-14 criteria pass with real Pandoc and Typst in CI). `units/CEX-18-preflight-export-panels.md` line 7 (`blocked_by: [CEX-17, CEX-05, CEX-10, CEX-14]`) and line 16 (export buttons, "Pandoc errors shown with their message", the `downloadUrl`, and the confirm dialog on preflight errors).
- **F4** The block-by-block links are consistent. `unblocks` of CEX-10 (CEX-11 to CEX-15, CEX-18) matches the `blocked_by` of each of them. `parallel_with` of CEX-16 (line 8) and CEX-17 (line 8) names CEX-10, as CEX-10 names them. Blockers CEX-04, CEX-05 and CEX-09 are done, and PLT-10 is done (`plans/QUEUE.md` line 7 still says CEX-09 has "no plan"; that file is stale, and this plan does not change it).
- **F5** Contracts (`packages/contracts/src/compile-export/`): `routes.ts` line 17 (`EXPORT_ROUTE`), lines 19 and 20 (`EXPORT_DOWNLOAD_ROUTE`, `:format`). `errors.ts` lines 9 to 13 (codes), 42 (`COMPILE_EXPORT_BUSY` 409), 43 (`COMPILE_PANDOC_FAILED` 500), 44 (`COMPILE_PANDOC_TIMEOUT` 504), 46 (`COMPILE_EMPTY_MANUSCRIPT` 422). `export.ts` lines 6 to 18. `events.ts` lines 15 to 19 and 39 to 43. `preflight.ts` lines 41 to 47. `constants.ts` line 44 (`EXPORT_FORMATS`). `index.ts` re-exports all of them.
- **F6** `packages/contracts/src/platform/env.ts` lines 3 to 21 (fixed set of 14 `SCRIBA_*` names); `apps/api/src/modules/platform/boot/env.ts` line 69 reads only those names.
- **F7** `apps/api/src/modules/compile-export/assembly.service.ts`: `assemble(now: Date): string` line 62; `activeProjectId` lines 116 to 127; `projectYaml` lines 129 to 138 (title via `projectYamlSchema`, whose `title` is required, `project.ts` line 23).
- **F8** `preflight.service.ts`: `run(now: Date): PreflightResult` lines 63 to 104 (`ranAt` and `revision` lines 103); `PREFLIGHT_RUNNERS` lines 38 to 44; `activeProjectId` lines 137 to 148.
- **F9** `manuscript.service.ts`: `view()` line 73; the view result has `entries`, `totals` and `revision` (lines 146 to 150).
- **F10** `compile-export.module.ts`: barrel re-exports lines 15 to 17; `@Module` lines 20 to 31 (`controllers`, `providers`, `exports`).
- **F11** `preflight.controller.ts` lines 9 to 17 (`@Controller()`, `@Post(PREFLIGHT_ROUTE)`, `@HttpCode(200)`). `manuscript-write.service.ts` line 190 (the `refuse(code, message)` helper: `new ModuleError(code, COMPILE_ERROR_STATUS[code], message)`) and lines 166 to 170 (the publish call pattern).
- **F12** `files.service.ts`: `stateDir` lines 479 to 510, `mkdirSync(folder, {recursive: true})` at line 498; `projectFor` (private) line 512; `PATH_OUTSIDE` refusal inside `stateDir`.
- **F13** `project-store.module.ts` barrel lines 25 to 32 (`ProjectsService` at line 31). `projects.service.ts` `find(id)` lines 59 to 61. `project-discovery.ts` `summaryOf` lines 46 to 67 (title at line 62 when `status` is `ok`).
- **F14** `platform.module.ts` lines 18 and 19 export `ZodValidationPipe`, `ModuleError` and `EventsPublisher`. `platform/errors/platform-exception.filter.ts`: line 48 (`details` from a `ModuleError`), line 61 (404 maps to `PLATFORM_NOT_FOUND`), line 119 (`details` in the body).
- **F15** `platform/events/events.tuning.ts` lines 2 and 5 (token and default); `events.publisher.ts` lines 30 and 31 (`@Optional() @Inject`); `test/events-write-limit.ts` line 7 (`@Global` module providing the token); `test/events-backpressure.test.ts` line 45 (`modules` option).
- **F16** `test/create-test-app.ts` line 13 (`modules` replaces `COMPOSED_MODULES`). `src/app.module.ts` lines 21 to 30 (`COMPOSED_MODULES`). `test/compile-export-manuscript.kit.ts` lines 20 to 45 (`manuscriptLibrary`: the project is `book/`), lines 48 to 67 (`withManuscript`).
- **F17** `test/invariant-sweep.ts`: `FIXTURE_PATHS` lines 71 to 73 (rule: a template with `:` needs an entry); `concretePath` lines 250 to 259 (fails by name when there is no entry); `snapshotLibrary` line 330; `sweepGetHead` line 533; `sweepMutations` line 679.
- **F18** `test/guard-request.ts` lines 20 to 24 (`Reply` with `status`, `headers`, `body: string`) and line 27 (`send`). `test/project-store-projects.kit.ts` line 111 (`postJson`). `test/events-heartbeat.test.ts` line 13 (`vi.useFakeTimers` with a `toFake` list).
- **F19** `apps/api/vitest.config.mts`: `include` line 8, `testTimeout` 20000 at line 9. Vitest is 5.1.0 (`node_modules/vitest/package.json`).
- **F20** `.github/workflows/ci.yml`: Install lines 24 and 25; Lint 26 and 27; Test 28 and 29; Build 30 and 31; E2E 32 to 35 (env `SCRIBA_E2E_CHROMIUM` lines 33 and 34). The job has no job-level `env`.
- **F21** `scripts/ci-workflow.test.mjs`: `ORDERED_RUNS` line 14; `assertRunsInOrder` lines 26 to 40 (each of the four runs appears exactly once, in order, as an exact `run` string). Additive steps are allowed.
- **F22** `Dockerfile`: line 10 (Pandoc SHA256, amd64), line 12 (Typst SHA256, amd64), lines 14 and 16 (arm64 pins), line 19 (Pandoc URL `pandoc-3.13-1-$TARGETARCH.deb`), line 21 (Typst URL `typst-$TYPST_TRIPLE.tar.xz` at v0.15.1), line 23 (tar layout `typst-$TYPST_TRIPLE/typst`), lines 54 and 56 (install in the runtime stage).
- **F23** `scripts/smoke-image.sh` lines 25 to 27 (Pandoc commands; line 27 is `--to=typst --pdf-engine=typst -o t.pdf`), lines 50 to 55 (`pandoc --version` first line must be `pandoc 3.13`), lines 59 to 64 (`typst --version`).
- **F24** `test/installer-first-install.test.ts` lines 31 to 41 (skip with a message when a tool is missing). `test/installer-preflight.test.ts` lines 23 to 26 (fake binaries on `PATH`).
- **F25** `project-store/project-watcher.service.ts` line 101 ignores any path with a dot-prefixed segment, so writes under `.scriba/` do not reach the watcher.
- **F26** `compile-export/snapshot-names.ts` lines 8 to 18 (`slugOf`, fallback `snapshot` at line 17) and lines 21 to 26 (`stampOf`). `preflight-checks.ts` line 66 (placeholders are `error` findings, one per match).
- **F27** `plans/CEX-04.md` line 47 (golden inline), line 92 (C1 fixture), line 158 (CEX-10 checks for an empty manuscript before the builder). `plans/CEX-05.md` line 142 (CEX-10 derives the counts from `checks`). `plans/CEX-09.md` line 161 (re-export left to CEX-10 or AGL-24).
- **F28** `test/compile-export-assembly.test.ts` line 109 (C1 preface fixture) and line 130 (expected text). Merged on main with CEX-04.
- **F29** `plans/DECISIONS.md` line 757 (writable folder, names CEX-10); lines 602 and 649 (PLT-11 CI criterion, local proxy); lines 4905 to 4907 (local-only environment). `plans/PLT-14.md` lines 229, 233, 283. `plans/PLT-10.md` line 119.
- **F30** `packages/contracts/src/platform/slugs.ts` lines 12 and 28 include `compile-export`, so `stateDir(projectId, 'compile-export')` is accepted (`files.service.ts` `stateDir` checks `MODULE_SLUGS`).
- **F31** `plans/GRR-15.md` file table lines 88 to 94 list web and e2e files only; its `ci.yml` mentions (lines 24, 28, 219) are references.
- **F32** Nest's `@nestjs/common` re-exports `StreamableFile` (`node_modules/@nestjs/common/index.d.ts` line 5); its options are `type`, `disposition` and `length` (`file-stream/interfaces/streamable-options.interface.d.ts` lines 13, 17, 21).
- **F33** Local environment: `command -v pandoc` and `command -v typst` print nothing; Node is v26.13.0.

### 2b. Assumed (not verified here)

- **A1** Pandoc 3.13 gives PDF output with `--to=typst --pdf-engine=typst` when the output name ends in `.pdf`. Suggested by `smoke-image.sh` line 27, which uses `-o t.pdf`, but not run here. The implementer checks it with real Pandoc if it is present; otherwise CI is the first check.
- **A2** With no input file and `--from=markdown`, Pandoc 3.13 reads Markdown from stdin.
- **A3** On the `ubuntu-latest` runner, `sudo apt-get install /tmp/pandoc.deb` works, and the Typst tarball unpacks to `typst-x86_64-unknown-linux-musl/typst` (the same layout as Dockerfile line 23, which PLT-14's image build exercised, but not on a runner).
- **A4** `vi.useFakeTimers({toFake: ['Date']})` fakes only the clock, as Vitest 5 passes it to sinon's fake timers.
- **A5** `spawn` with an absolute `command` path to a `/bin/sh` script, and `kill('SIGKILL')` on a script that runs `exec sleep 30`, ends the child promptly, because `exec` replaces the shell.
- **A6** Nest's `StreamableFile` with the Express adapter sends the `disposition` option unchanged as `Content-Disposition`.

## 3. Files to change

Only the paths below change. No file under `packages/contracts/`, `units/`, `modules/`, `plans/DECISIONS.md` or `Dockerfile` changes.

| Path | Change |
|---|---|
| `apps/api/src/modules/compile-export/export-tuning.ts` | new: `PANDOC_TUNING` symbol, `PandocTuning`, `DEFAULT_PANDOC_TUNING` (D9) |
| `apps/api/src/modules/compile-export/pandoc-runner.ts` | new: `PANDOC_TARGET_ARGS` (D1) and `runPandoc` with the child-process rules (D2 to D8) |
| `apps/api/src/modules/compile-export/export.service.ts` | new: `ExportService` with `export(format)`, `download(format)`, `summaryOf` (D10 to D21) |
| `apps/api/src/modules/compile-export/export.controller.ts` | new: POST `EXPORT_ROUTE` and GET `EXPORT_DOWNLOAD_ROUTE` (D19, D21, D22) |
| `apps/api/src/modules/compile-export/compile-export.module.ts` | edit: re-export `ExportService` from the barrel (D23); add the controller to `controllers`, the service to `providers` and `exports` |
| `apps/api/test/invariant-sweep.ts` | edit: one `FIXTURE_PATHS` entry, `'/api/compile-export/exports/:format': {path: '/api/compile-export/exports/md'}` |
| `apps/api/test/compile-export-manuscript.kit.ts` | edit: `withManuscript` takes an optional `options` argument with `modules` (D25) |
| `apps/api/test/compile-export-export.kit.ts` | new: `toolStatus`, `PANDOC_STATUS`, `itPandoc`, `tuningModule`, `withExport`, `fakePandoc`, `postExport`, `downloadOf` (D26, D28) |
| `apps/api/test/compile-export-export.test.ts` | new: criteria 1, 3 and 4 (real Pandoc parse), extras E1 and E2 |
| `apps/api/test/compile-export-export-runner.test.ts` | new: criterion 2 (three tests), extras E3 to E5 |
| `apps/api/test/compile-export-export-tools.test.ts` | new: criterion 4 (the flag and the skip) |
| `.github/workflows/ci.yml` | edit: one install step between `Lint` and `Test`; `env` on `Test` (D29) |
| `scripts/ci-export-tools.test.mjs` | new: criterion 4 workflow tests with `node:test` (D30) |
| `plans/CEX-10.md` | this plan (the planner's only output) |

## 4. Procedure

Run from `/Users/bbartolome/workspace/scriba-prototype`. Record `node -v` and `npm -v` with each result.

1. **Branch and baseline.** `git switch -c unit/CEX-10` on a clean tree. Run `npm run build -w @bbartolome/scriba-contracts`. Expected: exit 0.
2. **Tuning token.** Create `apps/api/src/modules/compile-export/export-tuning.ts`: `export const PANDOC_TUNING = Symbol('PANDOC_TUNING')`; `export interface PandocTuning {command: string; timeoutMs: number; stderrMaxBytes: number; outputMaxBytes: number}`; `export const DEFAULT_PANDOC_TUNING: PandocTuning` with the values of D9. Comments in the style of `events.tuning.ts`.
3. **Runner.** Create `apps/api/src/modules/compile-export/pandoc-runner.ts`:
   - `PANDOC_TARGET_ARGS` with the three entries of D1.
   - `runPandoc(tuning, format, markdown, root, outputPath): Promise<string[]>`. It makes the workdir (D4), builds the arguments (D2), spawns the child (no shell, `cwd` the workdir), writes the Markdown to stdin and ignores stdin errors, and keeps the last `stderrMaxBytes` of stderr (D6).
   - A timer sends SIGKILL at `timeoutMs` (D5). On `error` (spawn failure) it rejects with `not-started`. On `close`, if the timer fired, it rejects with `COMPILE_PANDOC_TIMEOUT`; else a non-zero code rejects with `exit`; else a missing output rejects with `no-output`; else a size over the cap deletes the output and rejects with `output-too-large` (D7); else it resolves with the warnings.
   - Errors are `new ModuleError(code, COMPILE_ERROR_STATUS[code], message, details)`. Messages: `Pandoc failed.` and `Pandoc did not finish in time.`. The workdir is removed in a `finally`.
4. **Service.** Create `apps/api/src/modules/compile-export/export.service.ts`. Inject `ProjectStoreService`, `ProjectsService`, `FilesService`, `ManuscriptService`, `AssemblyService`, `PreflightService`, `EventsPublisher`, and `@Optional() @Inject(PANDOC_TUNING) tuning?: Partial<PandocTuning>` merged over the defaults.
   - `export(format)`: the steps of D11, in that order, with the busy set of D10, the summary of D13, the file name of D14, the download URL of D15, the retention of D17 and the event of D18. Any failure removes the partial file and rethrows. The `md` branch writes the partial file; the other branches call `runPandoc` with the project root from step (6).
   - `download(format)`: the read-only lookup of D19 and D20. It returns `{path, fileName, bytes, type}` with the content types of D21.
5. **Controller.** Create `apps/api/src/modules/compile-export/export.controller.ts` with `@Controller()`. `@Post(EXPORT_ROUTE)` with `@HttpCode(200)` and `@Body(new ZodValidationPipe(exportRequestSchema))`, calling `export(body.format)`. `@Get(EXPORT_DOWNLOAD_ROUTE)` with `@Param('format', new ZodValidationPipe(exportFormatSchema))`, returning a `StreamableFile` built as in D21.
6. **Module.** Edit `compile-export.module.ts`: add `export { ExportService } from './export.service';` to the barrel (after line 17); import `ExportController` and `ExportService`; add `ExportController` to `controllers` (line 22), `ExportService` to `providers` (lines 23 to 29) and to `exports` (line 30).
7. **Sweep fixture.** Edit `apps/api/test/invariant-sweep.ts`: add the entry of section 3 to `FIXTURE_PATHS`, after the last entry. Without it the sweep fails by name (F17).
8. **Kit option.** Edit `apps/api/test/compile-export-manuscript.kit.ts`: `withManuscript(files, run, options: Pick<TestAppOptions, 'modules'> = {})` passes `modules: options.modules` to `createTestApp`. The existing call sites are unchanged.
9. **Test kit.** Create `apps/api/test/compile-export-export.kit.ts`:
   - `toolStatus(present, required)` and `PANDOC_STATUS` (D28). `fail` throws; `skip` logs one line.
   - `itPandoc = PANDOC_STATUS === 'run' ? it : it.skip`.
   - `tuningModule(values)`: a `@Global()` dynamic module providing `PANDOC_TUNING` as `{...DEFAULT_PANDOC_TUNING, ...values}`.
   - `withExport(files, tuning, run)`: `withManuscript(files, run, {modules: [...COMPOSED_MODULES, tuningModule(tuning)]})`, with `STATIC_ROOT` as the kit already does.
   - `fakePandoc(body)`: writes `#!/bin/sh` and `body` into a new `mkdtemp` folder, mode `0o755`, and returns the path. The caller removes the folder.
   - `postExport(app, cookie, format)` (via `postJson`) and `downloadOf(app, cookie, format)` (via `send` on `EXPORT_DOWNLOAD_ROUTE`).
10. **Main tests.** Create `apps/api/test/compile-export-export.test.ts` with the tests of section 5 for criteria 1, 3 and 4 (the parse test) and extras E1 and E2. The C1 files come from `compile-export-assembly.test.ts` (F28). The clock is set before the app boots (D27).
11. **Runner tests.** Create `apps/api/test/compile-export-export-runner.test.ts` with the tests of section 5 for criterion 2 and extras E3 to E5. Each fake's body is one of: `echo 'pandoc: boom' >&2; exit 3`; `exec sleep 30`; `touch '<marker>'; sleep 2; exit 2`; a body that writes `head -c 2000 /dev/zero` to its `--output=` path (found by a `for` loop over `"$@"`); a body that writes `x` to the output and `echo 'Warning: a test warning' >&2`. The `--output=` path is read in the loop.
12. **Tools test.** Create `apps/api/test/compile-export-export-tools.test.ts` with the criterion 4 test of section 5.
13. **CI.** Edit `.github/workflows/ci.yml`. Insert after the `Lint` step and before `Test`:

    ```yaml
          - name: Install Pandoc 3.13 and Typst 0.15.1
            run: |
              set -euo pipefail
              curl -fsSL -o /tmp/pandoc.deb "https://github.com/jgm/pandoc/releases/download/3.13/pandoc-3.13-1-amd64.deb"
              echo "7e3736f255090296ca5d1a14291a76b9b3c43cd385011b1621a4d0c16091a70f  /tmp/pandoc.deb" | sha256sum -c -
              sudo apt-get install -y /tmp/pandoc.deb
              test "$(pandoc --version | head -n 1)" = "pandoc 3.13"
              curl -fsSL -o /tmp/typst.tar.xz "https://github.com/typst/typst/releases/download/v0.15.1/typst-x86_64-unknown-linux-musl.tar.xz"
              echo "a6d077d0a95eed5a2eba715b2dae06be954f624ccbf85758a03f389ded33118c  /tmp/typst.tar.xz" | sha256sum -c -
              tar -xJf /tmp/typst.tar.xz -C /tmp
              sudo install -m 0755 /tmp/typst-x86_64-unknown-linux-musl/typst /usr/local/bin/typst
              test "$(typst --version | cut -d ' ' -f 2)" = "0.15.1"
    ```

    Add to the `Test` step: `env: {SCRIBA_REQUIRE_EXPORT_TOOLS: '1'}`. Leave the `run` strings of the four ordered steps unchanged.
14. **Workflow test.** Create `scripts/ci-export-tools.test.mjs` (`node:test`, `yaml` parser, as `scripts/ci-workflow.test.mjs`). It has the four tests of section 5 for criterion 4.
15. **Checks, in order.** `npm run build -w @bbartolome/scriba-api` (tsc build and type check). `npm test -w @bbartolome/scriba-api` (the whole API suite, including the invariant sweep, with the Pandoc tests skipped with a message). `node --test scripts/ci-export-tools.test.mjs scripts/ci-workflow.test.mjs`. `npx prettier --write` on each new and changed file, then `npm run lint`. Expected: each exits 0. Locally the Pandoc tests show as skipped with the D28 message.
16. **Scope check.** `git status --short` lists exactly the paths of section 3.
17. **Commit.** The implementer commits on `unit/CEX-10` with `feat(CEX-10): export runner, md export, download and CI Pandoc/Typst`. The planner does not commit.

## 5. One test for each acceptance criterion

Criteria are the four at unit lines 24 to 27. Each criterion has at least one test, named as below. Extras (E) cover decisions that no criterion names; they are cheap and do not add a criterion.

| Criterion (unit line) | Test file | Test title | Pass condition |
|---|---|---|---|
| 1. md export returns the assembled document (golden); the download GET returns the same bytes with no side effects (24) | `compile-export-export.test.ts` | `criterion 1: md export returns the C1 golden; the download GET returns the same bytes and changes nothing` | Before any export, GET gives 404 and `<root>/.scriba/compile-export` does not exist. POST md gives 200; the body parses with `exportResultSchema`; `fileName` is `book-20261119-1200.md`; `bytes` is the golden's length; `downloadUrl` is `/api/compile-export/exports/md`. The GET gives 200, the body equals the golden exactly, and `Content-Disposition` is `attachment; filename=book-20261119-1200.md`. `snapshotLibrary` is equal before and after the GET (`invariant-sweep.ts` line 330). |
| 2a. A second concurrent export returns busy (25) | `compile-export-export-runner.test.ts` | `criterion 2: a second export while Pandoc runs returns COMPILE_EXPORT_BUSY` | The fake writes a marker and sleeps. POST docx is started without await; the test polls for the marker; POST md gives 409 with code `COMPILE_EXPORT_BUSY`. The first request then settles. |
| 2b. A forced Pandoc failure returns `COMPILE_PANDOC_FAILED` with the stderr tail (25) | same | `criterion 2: a forced Pandoc failure returns COMPILE_PANDOC_FAILED with the exit code and the stderr tail` | POST docx gives 500, code `COMPILE_PANDOC_FAILED`, `details.reason` `exit`, `details.exitCode` 3, and `details.stderrTail` contains `pandoc: boom`. |
| 2c. A stalled Pandoc returns the timeout error (25) | same | `criterion 2: a stalled Pandoc returns COMPILE_PANDOC_TIMEOUT when the time limit passes` | `timeoutMs` 500, fake `exec sleep 30`. POST docx gives 504 with code `COMPILE_PANDOC_TIMEOUT` in under 10 s. |
| 3. Export attaches the preflight summary and succeeds when preflight has errors (26) | `compile-export-export.test.ts` | `criterion 3: export with a TODO (a preflight error) returns 200 with the summary, and writes the file` | Fixture `drafts/a.md` is `# Chapter one`, a blank line and `Draft TODO here.`. POST md gives 200; `preflight.errors` is at least 1 and equals the error findings in `POST PREFLIGHT_ROUTE` on the same library; `preflight.revision` equals the GET manuscript's `revision`; the download GET gives 200. |
| 4a. CI installs Pandoc 3.13 and Typst 0.15.1 before the tests (27) | `scripts/ci-export-tools.test.mjs` | `criterion 4: a Pandoc 3.13 install step runs before Test, checks its SHA256 and its version` | One step before `Test` has a `run` that contains the amd64 Pandoc URL, the SHA256 and the `pandoc 3.13` check. |
| 4b. same | same | `criterion 4: a Typst 0.15.1 install step runs before Test, checks its SHA256 and its version` | Same for the Typst URL, its SHA256 and the `0.15.1` check. |
| 4c. same | same | `criterion 4: the Test step sets SCRIBA_REQUIRE_EXPORT_TOOLS to 1` | `steps[Test].env.SCRIBA_REQUIRE_EXPORT_TOOLS` is `'1'`. |
| 4d. same | same | `criterion 4: the CI pins equal the Dockerfile's amd64 pins` | Both SHA256 strings in `ci.yml` equal the Dockerfile's lines 10 and 12. |
| 4e. The skip becomes a failure under the flag (27) | `compile-export-export-tools.test.ts` | `criterion 4: a missing pandoc is a failure when the flag is set, and a skip with a message otherwise` | `toolStatus(false, true)` is `fail`; `toolStatus(false, false)` is `skip`; `toolStatus(true, true)` and `toolStatus(true, false)` are `run`. |
| 4f. The Pandoc-dependent tests run with a real binary (27) | `compile-export-export.test.ts` | `criterion 4: the md output parses with real Pandoc 3.13` (`itPandoc`) | `spawnSync('pandoc', ['--from=markdown', '--to=native'])` with the golden on stdin exits 0 and prints something. Skipped locally when Pandoc is missing; runs in CI. |
| E1 (decision D12) | `compile-export-export.test.ts` | `extra: an empty manuscript returns COMPILE_EMPTY_MANUSCRIPT and writes nothing` | Project with only `project.yaml`: POST md gives 422, code `COMPILE_EMPTY_MANUSCRIPT`, and the exports folder does not exist. |
| E2 (D17) | same | `extra: a second md export keeps one md file` | Two POSTs at 12:00 and 13:00 UTC; the exports folder holds only the 13:00 file. |
| E3 (D7) | `compile-export-export-runner.test.ts` | `extra: output over the cap returns COMPILE_PANDOC_FAILED with reason output-too-large and no file` | `outputMaxBytes` 1000; the fake writes 2000 bytes. POST docx gives 500, reason `output-too-large`, and no file remains. |
| E4 (D6) | same | `extra: stderr warnings are returned on success` | The fake writes an output and `Warning: a test warning` to stderr. POST docx gives 200 and `warnings` equals `['Warning: a test warning']`. |
| E5 (D3, D11) | same | `extra: no partial file remains after a failure` | After the forced failure of 2b, the exports folder has no entry starting with a dot. |

Notes on the tests:

- The clock is faked with `vi.useFakeTimers({toFake: ['Date']})` in criterion 1 and E2, and restored in a `finally`. Real timers stay on, so the server and the sleep-based fakes work.
- The Pandoc tests with fake commands do not need the real binary. They run locally and in CI.
- Each test uses its own library and its own fake folder, and removes both.

## 6. Agreement with the downstream units

- **CEX-11 (DOCX, blocked by CEX-10).** Needs the runner, the `docx` entry and real Pandoc in CI. The plan provides all three. CEX-11 adds `--reference-doc` to `PANDOC_TARGET_ARGS.docx` (D1). No conflict.
- **CEX-12 (EPUB, blocked by CEX-10).** Needs the `epub` entry. The plan gives `--to=epub3`; CEX-12 adds `--split-level=1` and its stylesheet (its line 15). No conflict.
- **CEX-13 (PDF and the Typst spike, blocked by CEX-10).** Needs the `pdf` entry, the writable working folder and a partial name that ends in `.pdf`. The plan gives `--to=typst --pdf-engine=typst`, a temp `cwd` (P1) and the `.pdf` partial name (D3). CEX-13's template goes into its own entry. A1 is for CEX-13's spike to confirm.
- **CEX-14 (templates and settings, blocked by CEX-03 and CEX-10).** Needs a place to check a template before Pandoc runs. The plan puts the Pandoc branch after the empty check and before `runPandoc` (D11, steps 4 to 7), so CEX-14 adds its `COMPILE_TEMPLATE_INVALID` check there (its line 16). Its settings and copy-default routes do not use this plan's files. No conflict.
- **CEX-15 (export gate, blocked by CEX-10 to CEX-14 and the PLT images).** Needs all four formats over HTTP, the GET, and the Pandoc working folder in the image. The plan gives all of them: the routes, D15 and D21, and a temp `cwd` (P1). Its criterion at line 21 depends on open point 1.
- **CEX-18 (preflight and export UI, blocked by CEX-17, CEX-05, CEX-10 and CEX-14).** Needs `downloadUrl` (a path), the summary counts, `warnings`, the codes, and `export-finished`. The plan gives all of them. One point for the CEX-18 planner: its line 16 says "Pandoc errors shown with their message", but this plan puts the stderr tail in `details.stderrTail` and a fixed `message` (D8). The CEX-18 planner must show `details.stderrTail` too. This plan does not change CEX-18.
- **AGL-24 (Agent loop compile tools, via CEX-15).** Needs `ExportService` from the module barrel. The plan exports it (D23), so AGL-24 needs no module edit.
- **PLT-14 and PLT-19 (image and smoke).** PLT-14's open point 12 and its working-folder rule are met by the temp `cwd` (P1). PLT-19's own PDF smoke uses `-w /tmp` and does not call this code.
- **PLT-10 (ci.yml) and PLT-13 (e2e step).** The four ordered runs and the single job stay as PLT-10 tests them. PLT-13's appended step still goes last.

## 7. Other plans and units that change the same files

- **GRR-15 (planned).** Changes web graph-runner files and `e2e/specs/graph-*.e2e.ts` (F31). It changes none of this plan's files, and its ci.yml mentions are references only. No conflict in either order.
- **GNP-14 (planned).** Changes `packages/packs`, `apps/api/test/packs/character-world-builder.test.ts`, e2e fixtures and `scripts/eval-*`. It shares no file with this plan. Its scripts are picked up by the same `scripts/*.test.mjs` glob as the new `ci-export-tools.test.mjs`, and the glob takes any new file in either order.
- **Done plans on the same files (already on main; they set the base this plan builds on).**
  - CEX-04 (assembly, C1 golden inline, the empty check left to CEX-10, F27): the export calls `assemble(now)` and does not change it.
  - CEX-05 (preflight endpoint, module export of `PreflightService`, F27): the export calls `run(now)` and counts its checks.
  - CEX-09 (module barrel, re-export left open, F27): this plan adds the export re-export (D23).
  - CEX-16 (snapshots, module edit, `FIXTURE_PATHS` entries): this plan adds one more entry to the same map, and the two are additive in either order.
  - PLT-10 (`ci.yml`, job `env` empty, ordered runs, F20, F21): this plan adds a step and an env, and keeps the ordered runs.
  - PLT-14 (Dockerfile pins, working-folder rule, F22, P1): this plan copies the amd64 pins (D30) and meets the rule.
  - Many done plans (AGL, GRR, PST, SAU, MPR, TRG) edit `invariant-sweep.ts`. This plan's one line is additive and merges cleanly in either order.
  - CEX-02, CEX-03, CEX-06 to CEX-08 (`compile-export-manuscript.kit.ts`): this plan adds an optional argument, and the existing call sites do not change.

## 8. Open points

1. **Criterion 4 cannot be observed here.** A real CI run, with Pandoc and Typst installed on `ubuntu-latest` and the Pandoc tests not skipped, needs a push, and this environment is local only (F29). The plan's tests cover the workflow file (4a to 4d), the flag and the skip (4e), and the real parse test (4f, which runs wherever Pandoc is present). The Navigator decides how to tick the criterion, as earlier units did (DECISIONS lines 602 and 649).
2. **Output size cap.** The unit names a cap but gives neither a number nor an error code. The plan uses 100 MiB and `COMPILE_PANDOC_FAILED` with `reason: output-too-large` (D7, D8). The Navigator confirms or changes the number.
3. **Empty manuscript.** The unit does not define "empty". The plan uses "no entries in the effective order" (D12). A manuscript whose files are all blank is not empty under this rule. The Navigator confirms.
4. **Unverified Pandoc and Typst facts.** Pandoc and Typst are not installed here, so A1 (PDF chosen by the output name), A2 (stdin input), A3 (a local `.deb` with `apt-get` on the runner, and the Typst tarball layout) and A5 (killing `exec sleep`) are not run. The implementer runs them with real binaries where present. Otherwise the first check is the CI step, whose version lines fail fast.
