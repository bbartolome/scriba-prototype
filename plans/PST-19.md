---
id: PST-19
status: draft
---
# PST-19 plan — optional file watcher: files-changed, conflict re-check and pending-updated

Project store, phase:pending-review, M3. Unit `units/PST-19-optional-watcher.md`, read from HEAD `1fc0dd6`: front matter lines 1 to 10, Decisions lines 15 to 18 (four bullets), acceptance criteria lines 21 and 22 (two criteria). The unit has no Why, Scope or Demo section. Planner's draft (Haiku), checked against main `1fc0dd6`. Nothing was built, installed, run or changed except this file.

Tags: **Dn** is a decision of this plan. "(plan choice)" marks a decision that no source settles; section 7 lists each one that needs a Navigator decision. **Fn** is a fact checked by the planner (section 8a). **An** is an assumption not checked (section 8b).

## 1. Decisions this plan follows

- **D1. What is watched** (unit lines 15, 18). The watcher watches the active project's folder only. It starts at boot for the project named by the projects section, if one is set (plan choice, open point 6). It re-targets on `project-switched`. The hook runs before the settings write and before the event, so the watcher reads the new id from the event's `to` (F9). It stops at shutdown, in `beforeApplicationShutdown` as `EventsPublisher` does (F10).
- **D2. UI refresh only** (unit line 16; module line 80). Correctness does not depend on the watcher. The list still computes each conflict in memory (PST-16 D4, F5), so with the watcher off the GET shows the same conflict (test W3).
- **D3. Toggle** (unit line 17). `SCRIBA_WATCHER`, default `true` (F13). With `false`, no watcher is created. Platform already parses the variable. No contract change.
- **D4. Events** (unit line 15). On each debounced batch of host paths the watcher publishes `files-changed {projectId, paths}` once, then calls `ProjectStoreService.notifyFilesChanged({projectId, paths})`. That is the publish-then-notify order of the file API (F8). The recheck that PST-16 registered (F7) persists each changed flag and publishes `pending-updated` (PST-16 D4, D15, D17). PST-16 unit line 23 already names the watcher as a source of persisted flags (F4). The watcher writes no file itself.
- **D5. Which paths are published** (plan choice; module line 45). A path is published only if `resolvePath` accepts it, no segment starts with `.` (the file list skips dot-entries, F8), and it is not under a reserved prefix (`.scriba/`, `drafts/.versions/`, F16). So propose's writes under `.scriba/pending/` and accept's version writes publish nothing.
- **D6. Debounce** (unit line 15, "debounced"). The window is not in any source (open point 3). One batch collects every path changed in the window and publishes them sorted and unique.
- **D7. No new surface.** The watcher adds no route, so `apps/api/test/invariant-sweep.ts` needs no row. It adds no event type and no contract change (F12). The web needs no change, because the files page already refetches on `files-changed` (F20).
- **D8. Code shape** (plan choice; F6, F11). One provider, `ProjectWatcherService`, in `apps/api/src/modules/project-store/`. Its constructor registers `onProjectSwitched`, as `SearchService` does. `onApplicationBootstrap` starts it at boot. It uses only existing `ProjectStoreService` members (`activeId`, `libraryRoot`, `resolvePath`, `notifyFilesChanged`, `onProjectSwitched`), so `project-store.service.ts` is not changed.
- **D9. Test seam** (README testing bullet; module lines 56 to 57). Tests boot the composed app or the pending kit on a temp library, make host edits with `writeFileSync`, and read `/events` with `openSse`. The env reaches the app only through `createTestApp({env})`, because `bootstrap` reads `process.env` only when it gets no env object (F14).

## 2. Files to create or change

- `apps/api/src/modules/project-store/project-watcher.service.ts`: new. The watcher provider (D1, D4 to D6, D8).
- `apps/api/src/modules/project-store/project-store.module.ts`: change. Add `ProjectWatcherService` to `providers`. No export.
- `apps/api/test/project-store-watcher.test.ts`: new. Tests W1 to W6 (section 4).
- `apps/api/test/create-test-app.ts`: change, only if open point 1 picks option (a). The base env gets `SCRIBA_WATCHER: 'false'`.
- `apps/api/package.json` and `package-lock.json`: change, only if open point 4 picks a package. The procedure below adds none.

Not changed (checked): `project-store.service.ts`, `pending.service.ts` and `files.service.ts` (the hooks exist, F6 to F8); `packages/contracts/**`; `apps/api/test/invariant-sweep.ts`; `apps/web/**`; `units/**`; `modules/**`; `plans/DECISIONS.md`; every existing suite, except the change of open point 1.

## 3. Procedure

**Step 1. Setup and baseline.** In a worktree on a new branch `unit/PST-19` made from `main` (the orchestrator may give the worktree; do not push), run `npm ci`, then `npm run build -w @bbartolome/scriba-contracts`. In `apps/api`, run `npx vitest run test/project-store-pending-apply.test.ts test/project-store-pending-list.test.ts test/project-store-pending-refresh.test.ts test/project-store-pending-propose.test.ts test/project-store-draft-versions.test.ts test/project-store-files-write.test.ts test/project-store-files-delete-move.test.ts test/project-store-files-gate.test.ts`. Expected: all pass, since no watcher exists yet. Record `node -v` (v26.x).

**Step 2. Harness default (open point 1).** Apply the chosen option. For option (a), edit `apps/api/test/create-test-app.ts` so that the base env sets `SCRIBA_WATCHER: 'false'`. Run the step 1 set. Expected: all pass, unchanged.

**Step 3. The watcher.** Create `apps/api/src/modules/project-store/project-watcher.service.ts` (D1, D4 to D6, D8).
- Constructor: `store.onProjectSwitched` stops the current watcher and starts one on `event.to`. The handler catches its own errors, as `SearchService` does, so a failed start cannot fail the switch.
- `onApplicationBootstrap`: when the injected `SCRIBA_ENV.SCRIBA_WATCHER` is `true` and `store.activeId()` names a project that `projects.find` returns with status `ok`, start the watcher.
- Start: `fs.watch(project.root, {recursive: true})`, called synchronously, so the watch exists before the activation POST answers (A2 and W1 depend on this). An error is caught, and that project gets no watcher.
- Each fs event: turn the name into a project-relative path joined with `/`, apply D5, add it to the batch, and restart the debounce timer (D6).
- Flush: apply the self-write rule (open point 2), sort and de-duplicate, publish `files-changed`, then call `store.notifyFilesChanged`.
- `beforeApplicationShutdown`, and each switch, close the old watcher and clear its timer.
- The mechanism is `node:fs` (open point 4).
Expected: `npx tsc --noEmit -p apps/api/tsconfig.json` exits 0.

**Step 4. Wiring.** Edit `apps/api/src/modules/project-store/project-store.module.ts`: add `ProjectWatcherService` to `providers`. Expected: the step 1 set still passes.

**Step 5. Tests.** Create `apps/api/test/project-store-watcher.test.ts` with W1 to W6 (section 4). Each test builds its temp library with `bookLibrary()` and removes it. Run `npx vitest run test/project-store-watcher.test.ts` in `apps/api`. Expected: 6 tests pass.

**Step 6. Suites with the toggle off (criterion 2).** From the repository root, run `npm test -w @bbartolome/scriba-api`. Expected: exit 0, with every suite running with the toggle off by default (step 2).

**Step 7. Gate.** From the repository root, run `npm run build -w @bbartolome/scriba-contracts`, `npm run lint -w @bbartolome/scriba-api` and `npx prettier --check apps/api`. Expected: each exits 0. `git status --short` shows only the paths of section 2.

**Step 8. Commit.** Stage with `git add -- <paths>`, then `git commit -m "feat(PST-19): optional file watcher" -- <paths>`. Never `git add -A` or `git commit -a`.

## 4. Acceptance criteria and tests

| Criterion (unit line) | Test | Pass condition |
|---|---|---|
| With the watcher on, a host edit gives one debounced `files-changed` and, for a pending target, a `pending-updated` with the conflict (line 21) | **W1** | Boot with `SCRIBA_WATCHER: 'true'`, activate `book` with the active POST route, open `/events` and read hello. Write `sources/outline.md` three times in quick succession with `writeFileSync`, with no pending change. Expect one `files-changed` with `paths` `["sources/outline.md"]`, then no block for 1500 ms. |
| | **W2** | Propose a change to `sources/outline.md` through the pending kit route, then open `/events` and read hello. The host writes `H\n`. Expect `files-changed` for that path, then one `pending-updated` with `conflict.reason` `base-changed`. The GET list shows the same conflict, and the open change file on disk holds it. |
| With `SCRIBA_WATCHER=false`, no watcher runs and all other suites still pass (line 22) | **W3** | Boot with `SCRIBA_WATCHER: 'false'` and repeat W2's steps. Expect no block within 1500 ms, and the GET list still shows `base-changed` (D2). The suites part is step 6. |

Extra tests, for decisions that have no criterion:
- **W4** (D1, re-target). Two ok projects, `book` and `second` (`addOkProject`), with `book` active. Switch to `second` through the active POST route and read `project-switched`. A host edit in `book` gives no block within 1500 ms. A host edit in `second` gives one `files-changed` with `projectId` `second`.
- **W5** (D5). Propose a change and read its `pending-created`, then wait 1500 ms with no block. Host writes under `drafts/.versions/` and `.scriba/` give no block.
- **W6** (D1, boot). Boot with `SCRIBA_WATCHER: 'true'`, activate `book`, close the app, and boot again on the same `libraryDir` (the settings file is under the library, F22). A host edit gives one `files-changed` with `paths` `["sources/outline.md"]`.

Timings: every "no block" window (1500 ms) and the wait of W1 must exceed the debounce window (open point 3). W2 and W3 use the pending kit helpers (`pendingKitModule`, `postJsonPlain`, `openSse`, F21). No test reads `examples/` (module testing principle).

## 5. Agreement with the downstream units

- **PST-22 (review gate; `blocked_by` names PST-19, unit line 7).** Demo step 3 says "The queue flags a conflict" (unit line 32). It needs the live `pending-updated` for a host edit of a pending target, with the watcher on by default, and `files-changed` for the tree. The plan gives both (W1 and W2, default on). With the toggle off the flag shows only on the next list (W3). Open point 7 covers the e2e.
- **PST-20 (review queue UI; parallel with PST-19).** Its live updates (unit line 19) need `pending-updated` for host edits, which W2 covers. PST-20 is not blocked by PST-19, so it may start without it.
- **PST-21 (version history UI; parallel).** It refreshes on `files-changed` (unit line 16). A host write under `drafts/` publishes (the W1 pattern). Reserved `.versions` writes do not (W5). Its list does not depend on the watcher.
- **PST-10 (files UI, done) and CEX-17 (unit line 21).** Both refetch on `files-changed`, and CEX-17 also on changes under `drafts/` or to `project.yaml`. D5 keeps both kinds of path, so host edits reach them. No test in this plan covers the web.
- **PST-34 (editor adoption, done; `plans/PST-34.md` D16 and PC7).** An outside change does not reload the editor, and the page re-reads the file on each `files-changed` (F24). With the watcher on, each app write also gives a second event (open point 2). That costs one extra read on tablet and desktop and changes no text.
- **PST-16 (done; its test A5 in `apps/api/test/project-store-pending-apply.test.ts`, lines 341 to 395).** A5 makes host edits with `writeFileSync` and expects exact blocks with 500 ms "nothing else" windows (F15). With the toggle on by default it would receive the watcher's `files-changed`, so open point 1 must be settled. Under option (a) it passes unchanged.

## 6. Changes of other draft and planned plans to the same files

The only draft or planned plan at HEAD is `plans/TRG-14.md` (planned, F23). Its scope says `apps/api/**` does not change (line 95). Its file table (lines 99 to 108) lists `apps/web` files and `apps/web/package.json`, and its step 2 (line 126) adds two web dependencies and updates the lockfile. Result: none of its paths is in section 2, except `package-lock.json` when open point 4 picks a package. In that case both plans edit the lockfile. Their entries are disjoint (the `apps/web` workspace against the API), so either merge order gives the same lockfile once the second merge regenerates it with npm. No other draft or planned plan touches these files.

## 7. Open points (each needs a Navigator decision; no source settles them)

1. **Default of `SCRIBA_WATCHER` in tests.** `createTestApp` sets no watcher value, so every test app runs with the default `true` (F14). PST-16's test A5 would then break (section 5). Options: (a) the base env of `createTestApp` sets `SCRIBA_WATCHER: 'false'`, and PST-19's tests pass `env` (this changes Platform's shared harness file); (b) only the project-store kits set it off; (c) keep the default on and change the exact-sequence suites of PST-15 to PST-18.
2. **The app's own writes.** Each file-API write already publishes `files-changed` (F8), and the watcher would publish a second event for the same paths. Options: (a) accept the duplicate, so the UI refreshes twice; (b) keep a known-hash table per path, updated by the store's `onFilesChanged` hook (which runs right after each app write), and publish only the paths whose disk hash differs from the table; (c) suppress paths the app wrote within a fixed time window. Option (c) cannot hide A5's host edit.
3. **Debounce window.** The unit says "debounced" and gives no value. Options: a fixed value in code, which step 3 needs; or a setting, which would need a new env name and so a contract change, outside this unit.
4. **Watcher mechanism.** Options: (a) `node:fs` `watch` with `recursive: true`, which adds no dependency (Node 26 is the engine, F19; A1 assumes it works on Linux); (b) a watcher package in `apps/api/package.json`. `chokidar` and `@parcel/watcher` appear in `package-lock.json` only as other packages' dependencies (F18), so option (b) would be a new direct dependency and change the lockfile. Section 3 follows (a) so that the procedure is complete.
5. **Dot-entries and reserved paths (D5).** Options: (a) never published (D5); (b) published, which refreshes nothing in the UI, because the lists skip dot-entries.
6. **Start at boot (D1).** The unit says "watches the active project" and does not cover a restart with a project already active. Options: (a) start at boot (W6); (b) start only after the first switch in a process.
7. **PST-22 e2e and demo step 3.** The live conflict flag needs the watcher on. Options: (a) the e2e runs with the default (on) and step 3 is live; (b) the e2e reloads the queue before it checks, since the GET also flags the conflict. The choice belongs to PST-22.
8. **Stopping at shutdown has no external effect.** Nothing visible over HTTP or on disk shows that the watcher stopped. The plan relies on every test's `app.close()`, which runs the shutdown hook (F10). Options: accept that, or ask for a test with an observable effect (none found).

## 8. Facts

### 8a. Checked by the planner (file and line on main `1fc0dd6`)

- **F1.** Unit `units/PST-19-optional-watcher.md` (read with `git show HEAD:`; the working-tree copy is the same): front matter lines 1 to 10 (`blocked_by: [PST-16]` line 7, `parallel_with` line 8, `unblocks: [PST-22]` line 9), Decisions 15 to 18, criteria 21 and 22. No note in the unit records a change of PST-19.
- **F2.** Module `modules/project-store.md`: line 45 (path safety is the one function), 46 (GETs never mutate), 48 (active-project rule), 52 (no other module's implementation), 56 to 57 (testing), 78 (env names), 80 (bind-mount caveat, "only refreshes the UI").
- **F3.** `units/README.md` (HEAD): events are `{module, type, data}` with no replay; testing is external behaviour only; `unblocks` is the exact inverse of `blocked_by`. Consistency: PST-16 line 9 names PST-19 in `unblocks`; PST-22 line 7 names PST-19 in `blocked_by`; PST-17, PST-18, PST-20, PST-21 and PST-23 each name PST-19 in `parallel_with` (line 8).
- **F4.** Downstream lines: `units/PST-16-apply-three-way-check.md` line 23 (names the watcher); `units/PST-22-review-gate.md` line 32 (demo step 3); `units/PST-20-review-queue-ui.md` line 19; `units/PST-21-version-history-ui.md` line 16; `units/PST-10-files-ui.md` line 19; `units/CEX-17-manuscript-route-outline.md` line 21.
- **F5.** `plans/PST-16.md`: D4, D15, D17, section 6 (PST-19 agreement, line 180), test A5. Its status line is `done`, as are `plans/PST-17.md`, `plans/PST-18.md` and `plans/PST-34.md`.
- **F6.** `apps/api/src/modules/project-store/project-store.service.ts`: line 20 (comment: files-changed "from the file API or the watcher"); `onProjectSwitched` 59; `notifyProjectSwitched` 64; `onFilesChanged` 71; `notifyFilesChanged` 76. It also has `activeId`, `libraryRoot`, `resolvePath` and `requireActive`.
- **F7.** `pending.service.ts`: the constructor registers `onFilesChanged` at line 91; `list` lines 102 to 113 (the conflict is set at 112); `recheck` line 322; `recheckQuietly` line 334; `persistConflict` line 368, which publishes `pending-updated` only when the stored reason changes.
- **F8.** `files.service.ts`: `notifyFilesChanged` after each publish at lines 349 (`delete`), 393 (`move`) and 550 (`commit`); `collect` skips dot-entries at line 568.
- **F9.** `active-project.service.ts`: the hooks run at line 73 (`notifyProjectSwitched`), before the settings write (step 5) and before `project-switched` is published (step 6).
- **F10.** `apps/api/src/modules/platform/events/events.publisher.ts`: `publish(envelope)` at line 61; `beforeApplicationShutdown` at line 70. `node_modules/@nestjs/core/nest-application-context.js` lines 159 and 160: `close` calls `callDestroyHook` and `callBeforeShutdownHook`. `apps/api/src/main.ts` line 7: `enableShutdownHooks`.
- **F11.** `apps/api/src/modules/project-store/search.service.ts`: `SearchService` registers `onProjectSwitched` in its constructor (lines 51 to 63) and implements `onApplicationBootstrap` (startup prune).
- **F12.** `packages/contracts/src/project-store/events.ts`: `pendingEventDataSchema` lines 7 to 10, `filesChangedDataSchema` 13 to 16 (`paths` are non-empty strings), `projectSwitchedDataSchema` 19 to 22. No watcher-specific schema exists.
- **F13.** `SCRIBA_WATCHER`: `packages/contracts/src/platform/env.ts` line 16 (default `'true'`); `apps/api/src/modules/platform/boot/env.ts` line 23 (type), line 51 (rule: `true` or `false`, parsed to boolean), lines 123 to 127 (read); `units/PLT-02-contracts-package-platform-slice.md` line 49.
- **F14.** Test harness: `apps/api/src/bootstrap.ts` line 33 (`parseEnv(options.env ?? process.env)`). `apps/api/test/create-test-app.ts`: `options.env` is merged over a base env that sets the three directories and the log level only, so `SCRIBA_WATCHER` takes its default `true`; `libraryDir` is removed on close only when the harness created it.
- **F15.** `apps/api/test/project-store-pending-apply.test.ts`: test A5 at lines 341 to 395 (host edits with `writeFileSync`; `stream.next(500)` must reject at lines 363, 375 and 388). `apps/api/test/project-store-pending-propose.test.ts`: test P1 at line 113 ("No files-changed and no second event follow").
- **F16.** `packages/contracts/src/project-store/constants.ts` lines 17 to 20: `RESERVED_PATH_PREFIXES` is `.scriba/` and `drafts/.versions/`. `apps/api/src/modules/project-store/path-safety.ts` line 61: `isReservedPath`.
- **F17.** `projects.service.ts` line 59: `find(id)` runs discovery on each call. `project-discovery.ts` line 17: `DiscoveredProject.root` is absolute.
- **F18.** Dependencies: `package.json` and `apps/api/package.json` name no watcher package. `package-lock.json` has `chokidar` at lines 5995 and `@parcel/watcher` at line 4242, required by other packages (lines 167, 243, 853, 9474 name `chokidar`).
- **F19.** `package.json` lines 11 and 12: `engines` `node >=26 <27`. `.nvmrc` is `26`. `node -v` on this machine: `v26.13.0`. `apps/api/package.json` devDependency `@types/node` `^26.6.6`.
- **F20.** `apps/web/src/app/features/project-store/files-page.ts` refetches the tree on `files-changed` (comment line 136; listener line 397). Checked by grep, not by running.
- **F21.** Kit helpers: `addOkProject` (`apps/api/test/project-store-active.kit.ts` line 71), `postJsonPlain` (line 81), `pendingKitModule` (`apps/api/test/project-store-pending.kit.ts` line 22; the kit imports `ProjectStoreModule`, line 46), `bookLibrary` (`apps/api/test/project-store-files.kit.ts` line 44), `openSse` and `dataOf` (`apps/api/test/sse.ts` lines 31 and 66).
- **F22.** Active route: `apps/api/src/modules/project-store/active-project.controller.ts` line 21 (GET) and line 26 (POST), `ACTIVE_PROJECT_ROUTE`. Settings file: `apps/api/src/modules/platform/settings/settings.file.ts` line 6, `<booksDir>/.scriba/settings.yaml`, so it lives inside the library.
- **F23.** Draft and planned plans: `grep -l "^status: \(draft\|planned\)" plans/*.md` lists only `plans/TRG-14.md` (planned). Its line 95 (scope), lines 99 to 108 (file table), line 126 (install step).
- **F24.** `plans/PST-34.md`: D16 (line 32) and PC7 (line 42): the editor does not reload on `files-changed`; the page re-reads the open file on each `files-changed`.
- **F25.** `plans/DECISIONS.md`: `grep -n "PST-19"` returns no lines. For PST-16, PST-17, PST-18 and PST-22 I read only the matching lines (2912, 4891, 4970, 5485, 5492).
- **F26.** HEAD is `1fc0dd6`. `plans/PST-19.md` did not exist. `apps/api/src` has no watcher code (`grep -rn watch` finds only the env parse and a comment).

### 8b. Assumed, not checked

- **A1.** Node 26's `fs.watch(root, {recursive: true})` on Linux reports changes in folders created after the watch starts. No test here covers that case.
- **A2.** The watch is registered before the activation POST answers, because the switch hook is synchronous, and the first host write of W1 happens after the POST.
- **A3.** One `writeFileSync` gives one or more fs events, which the debounce merges into one batch (W1 checks the outcome).
- **A4.** On Linux, inotify reports the test process's writes to the temp library. On macOS hosts this is not verified (the bind-mount caveat, F2).
- **A5.** The debounce window chosen under open point 3 is shorter than the windows of W1 to W3.
- **A6.** `app.close()` in the tests reaches the watcher's `beforeApplicationShutdown`, as F10 shows for Nest in general.
- **A7.** Node's recursive `fs.watch` reports names with `/` separators on Linux, so the path conversion of step 3 needs no platform branch.
- **A8.** The files page behaves as PST-10 states. Only its presence and comment were checked (F20).
