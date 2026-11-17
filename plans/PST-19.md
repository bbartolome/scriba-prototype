---
id: PST-19
status: done
---
# PST-19 plan — optional file watcher: files-changed, conflict re-check and pending-updated

Project store, phase:pending-review, M3. Unit `units/PST-19-optional-watcher.md`, read from HEAD `1fc0dd6`: front matter lines 1 to 10, Decisions lines 15 to 18 (four bullets), acceptance criteria lines 21 and 22 (two criteria). The unit has no Why, Scope or Demo section. Planner's draft (Haiku), checked against main `1fc0dd6`; revised by the reviser (Opus) on 2026-11-17 against main `7f083c2` (only `plans/PST-19.md` changed since `1fc0dd6`). Nothing was built, installed or changed except this file. The reviser ran one throwaway Node probe outside the repository (section 8a, F27).

Tags: **Dn** is a decision of this plan. **Rn** is a decision made by the reviser (section 7). **Fn** is a checked fact (section 8a). **An** is an assumption not checked (section 8b).

## 1. Decisions this plan follows

- **D1. What is watched** (unit lines 15, 18). The watcher watches the active project's folder only. It starts at boot for the project named by the projects section, if one is set and is `ok` (R6). It re-targets on `project-switched`: the hook runs before the settings write and before the event, so the watcher reads the new id from the event's `to` (F9). It stops at shutdown, in `beforeApplicationShutdown` as `EventsPublisher` does (F10).
- **D2. UI refresh only** (unit line 16; module line 80). Correctness does not depend on the watcher. The list still computes each conflict in memory (PST-16 D4, F5), so with the watcher off the GET shows the same conflict (test W3).
- **D3. Toggle** (unit line 17; module line 78). `SCRIBA_WATCHER`, default `true` (F13). With `false`, no fs watch is ever opened and no switch handler is registered. Platform already parses the variable. No contract change. The production default stays `true`; only the API test harness sets `false` in its base env (R1).
- **D4. Events** (unit line 15). On each debounced batch of paths the watcher publishes `files-changed {projectId, paths}` once, then calls `ProjectStoreService.notifyFilesChanged({projectId, paths})`. That is the publish-then-notify order of the file API (F8). The recheck that PST-16 registered (F7) persists each changed flag and publishes `pending-updated` (PST-16 D4, D15, D17). PST-16 unit line 23 already names the watcher as a source of persisted flags (F4). The watcher writes no file itself. An empty batch publishes nothing.
- **D5. Which paths are published** (R5; module line 45). A path is published only if no segment starts with `.` and `store.resolvePath` accepts it (a throw skips the path). Both reserved prefixes (`.scriba/`, `drafts/.versions/`, F16) have a dot segment, so propose's writes under `.scriba/pending/`, the persisted conflict flags and accept's version writes publish nothing. A deleted path is still published (`resolvePath` accepts a missing target, F28), so a host delete refreshes the tree.
- **D6. Debounce** (unit line 15, "debounced"; R3). A trailing window of 200 ms, a constant in the service file, restarted by each fs event. One batch collects every path changed in the window and publishes them sorted and unique.
- **D7. No new surface.** The watcher adds no route, so `apps/api/test/invariant-sweep.ts` needs no row. It adds no event type and no contract change (F12). The web needs no change, because the files page already refetches on `files-changed` (F20).
- **D8. Code shape** (F6, F11). One provider, `ProjectWatcherService`, in `apps/api/src/modules/project-store/`. It injects `ProjectStoreService` (`activeId`, `resolvePath`, `notifyFilesChanged`, `onProjectSwitched`), `ProjectsService` (`find`, for the project root and status, F17), `EventsPublisher` (imported from `../platform/platform.module`, as `pending.service.ts` line 19 does) and `SCRIBA_ENV` (as `project-store.service.ts` line 36 does). When the toggle is on, its constructor registers `onProjectSwitched`, as `SearchService` does; `onApplicationBootstrap` starts it at boot. `project-store.service.ts` is not changed.
- **D9. Test seam** (README testing bullet; module lines 56 to 57). Tests boot the pending kit (`pendingKitModule`, which imports `ProjectStoreModule` and `PlatformModule`, F21) with `createTestApp` on a temp library, make host edits with `writeFileSync`, and read `/events` with `openSse`. The env reaches the app only through `createTestApp({env})`, because `bootstrap` reads `process.env` only when it gets no env object (F14). `bookLibrary()` already makes `book` the active project in `settings.yaml` (F29), so with the watcher on the watcher starts at boot.

## 2. Files to create or change

- `apps/api/src/modules/project-store/project-watcher.service.ts`: new. The watcher provider (D1, D3 to D6, D8).
- `apps/api/src/modules/project-store/project-store.module.ts`: change. Add `ProjectWatcherService` to `providers`. No export.
- `apps/api/test/create-test-app.ts`: change. The base env gets `SCRIBA_WATCHER: 'false'`, before the `...options.env` spread, so a test can still pass `'true'` (R1). The header comment of the base env names the reason in one line.
- `apps/api/test/project-store-watcher.test.ts`: new. Tests W1 to W5 (section 4).

Not changed (checked): `project-store.service.ts`, `pending.service.ts`, `files.service.ts`, `active-project.service.ts` (the hooks exist, F6 to F9); `packages/contracts/**`; `apps/api/test/invariant-sweep.ts`; `apps/web/**`; `e2e/**`; `apps/api/package.json`, `package.json`, `package-lock.json` (no new dependency, R4); `units/**`; `modules/**`; `plans/DECISIONS.md`; every existing suite.

## 3. Procedure

**Step 1. Setup and baseline.** In a worktree on a new branch `unit/PST-19` made from `main` (the orchestrator may give the worktree; do not push), run `npm ci`, then `npm run build -w @bbartolome/scriba-contracts`. In `apps/api`, run `npx vitest run test/project-store-pending-apply.test.ts test/project-store-pending-list.test.ts test/project-store-pending-refresh.test.ts test/project-store-pending-propose.test.ts test/project-store-draft-versions.test.ts test/project-store-files-write.test.ts test/project-store-files-delete-move.test.ts test/project-store-files-gate.test.ts test/create-test-app.test.ts test/env-boot.test.ts`. Expected: all pass, since no watcher exists yet. Record `node -v` (v26.x).

**Step 2. Harness default (R1).** Edit `apps/api/test/create-test-app.ts`: in the env object passed to `bootstrap`, add `SCRIBA_WATCHER: 'false'` after `SCRIBA_LOG_LEVEL` and before `...options.env`. Run the step 1 set. Expected: all pass, unchanged.

**Step 3. The watcher.** Create `apps/api/src/modules/project-store/project-watcher.service.ts` (D1, D3 to D6, D8), `@Injectable()`, implementing `OnApplicationBootstrap` and `BeforeApplicationShutdown`.
- Constructor: when `env.SCRIBA_WATCHER` is `false`, do nothing else. Otherwise register `store.onProjectSwitched((event) => …)`: stop the current watcher and start one on `event.to`. The handler catches every error, as `SearchService` does (F11), so a failed start can never fail the switch.
- `onApplicationBootstrap`: when `env.SCRIBA_WATCHER` is `true` and `store.activeId()` names a project that `projects.find` returns with `yaml.status` `ok`, start the watcher on it. Errors are caught; the app boots without a watcher.
- Start(projectId): look up the project with `projects.find`; if it is missing or not `ok`, start nothing. Call `fs.watch(project.root, {recursive: true}, listener)` synchronously, so the watch exists before the activation POST answers (F27). Attach an `'error'` listener that closes this watcher and clears its timer (an unhandled `'error'` event of an `FSWatcher` would end the process). An exception from `fs.watch` is caught, and that project gets no watcher.
- Listener(eventType, filename): a `null` filename is ignored. Otherwise the name is already project-relative with `/` separators on Linux (F27); apply D5, add the path to the batch, and restart the 200 ms timer (D6).
- Flush: if the batch is empty, do nothing. Otherwise sort and de-duplicate the paths, clear the batch, publish `{module: 'project-store', type: 'files-changed', data: {projectId, paths}}`, then call `store.notifyFilesChanged({projectId, paths})` inside a try/catch (the hook handlers already catch their own errors, F7; this guards a later handler).
- Stop: close the watcher, clear the timer, drop the batch. `beforeApplicationShutdown` calls Stop; each switch calls Stop before Start.
- The mechanism is `node:fs` (R4). No package is added.
Expected: `npx tsc --noEmit -p apps/api/tsconfig.json` exits 0.

**Step 4. Wiring.** Edit `apps/api/src/modules/project-store/project-store.module.ts`: import `ProjectWatcherService` and add it to `providers`. Expected: the step 1 set still passes (the harness default is off).

**Step 5. Tests.** Create `apps/api/test/project-store-watcher.test.ts` with W1 to W5 (section 4). Each test builds its temp library with `bookLibrary()`, boots `createTestApp({libraryDir: fixture.library, modules: [pendingKitModule()], env: {SCRIBA_WATCHER: <value>}})`, closes the app in `finally`, then calls `fixture.remove()`. Run `npx vitest run test/project-store-watcher.test.ts` in `apps/api`. Expected: 5 tests pass. Run it twice more to see that it is stable; record the three results.

**Step 6. Suites with the toggle off (criterion 2).** From the repository root, run `npm test -w @bbartolome/scriba-api`. Expected: exit 0, with every suite except W1, W2, W4 and W5 running with the toggle off (step 2).

**Step 7. Gate.** From the repository root, run `npm run build -w @bbartolome/scriba-contracts`, `npm run lint -w @bbartolome/scriba-api` and `npx prettier --check apps/api`. Expected: each exits 0. Then run the Playwright e2e once, `npm run build` then `npm run e2e -w @bbartolome/scriba-e2e`: its API process runs with the default `true` (F30), so this is the one run of the existing specs with the watcher on. Expected: the same pass list as on main. If Chromium cannot start in the environment, record that and continue (no criterion depends on the e2e). `git status --short` shows only the paths of section 2.

**Step 8. Commit.** Stage with `git add -- <paths>`, then `git commit -m "feat(PST-19): optional file watcher" -- <paths>`. Never `git add -A` or `git commit -a`.

## 4. Acceptance criteria and tests

| Criterion (unit line) | Test | Pass condition |
|---|---|---|
| With the watcher on, a host edit produces one debounced `files-changed` and, for a pending target, a `pending-updated` with the conflict (line 21) | **W1** | Boot with `SCRIBA_WATCHER: 'true'` (`book` is active at boot, D9). Open `/events` and read hello. With no pending change, write `book/sources/outline.md` three times in a row with `writeFileSync`. Expect one `files-changed` with `projectId` `book` and `paths` `["sources/outline.md"]`, then no block for 1500 ms. This also covers the start at boot (R6). |
| | **W2** | Boot with `SCRIBA_WATCHER: 'true'`. Propose a change to `sources/outline.md` (`content` `P\n`) through the kit's propose route, then open `/events` and read hello. The host writes `H\n` to the target. Expect `files-changed` with `paths` `["sources/outline.md"]`, then one `pending-updated` whose `pendingChange.conflict.reason` is `base-changed`, then no block for 1500 ms (the persisted flag under `.scriba/pending/` publishes nothing, D5). The GET list shows the same conflict. |
| With `SCRIBA_WATCHER=false`, no watcher runs and all other suites still pass (line 22) | **W3** | Boot with `SCRIBA_WATCHER: 'false'` and repeat W2's steps. Expect no block within 1500 ms after the host write, and the GET list still shows `base-changed` (D2). The "all other suites" part is step 6. |

Extra tests, for decisions that have no criterion:
- **W4** (D1, re-target). Boot with `SCRIBA_WATCHER: 'true'`; add a second ok project with `addOkProject(fixture.library, 'second')` before the boot. Open `/events`, read hello, switch to `second` through the active POST route (`postJsonPlain`) and read `project-switched`. A host write of `book/sources/outline.md` gives no block within 1500 ms. A host write of `second/notes.md` gives one `files-changed` with `projectId` `second` and `paths` `["notes.md"]`.
- **W5** (D5). Boot with `SCRIBA_WATCHER: 'true'`. Open `/events`, read hello, propose a change to `sources/new.md` and read its `pending-created`; then expect no block within 1500 ms (propose's write under `.scriba/pending/` publishes nothing). Host writes of `book/drafts/.versions/a.md/x.md`, `book/.scriba/x.txt` and `book/sources/.hidden.md` give no block within 1500 ms.

Timings: the debounce is 200 ms (D6); every "no block" window is 1500 ms and every expected block is read with `stream.next(2000)`. Each test uses `nextEvent`-style reads of `openSse` and `dataOf` (F21). No test reads `examples/` (module testing principle). The shutdown (unit line 18) has no external effect; each test's `app.close()` runs it (R8).

## 5. Agreement with the downstream units

- **PST-22 (review gate; `blocked_by` names PST-19, unit line 7).** Demo step 3 says "The queue flags a conflict" (unit line 32). With the production default `true` (D3), a host edit of a pending target gives `files-changed` and a live `pending-updated` (W2). The Playwright harness starts the API with no `SCRIBA_WATCHER` (F30), so the e2e also runs with the watcher on. PST-22's scope adds only the "accept change" e2e step, which needs no watcher; how it checks a conflict, if ever, is PST-22's choice (R7). Nothing in this plan narrows what PST-22 needs.
- **PST-20 (review queue UI; parallel with PST-19).** Its live updates (unit line 19) need `pending-updated` for host edits, which W2 covers. PST-20 is not blocked by PST-19.
- **PST-21 (version history UI; parallel).** It refreshes on `files-changed` (unit line 16). A host write under `drafts/` publishes (the W1 pattern). Version writes under `drafts/.versions/` do not (W5); accept's own `files-changed` from the file API still refreshes the list (F8).
- **PST-10 (files UI, done) and CEX-17 (unit line 21).** Both refetch on `files-changed`, and CEX-17 also on changes under `drafts/` or to `project.yaml`. D5 keeps both kinds of path. No test in this plan covers the web.
- **PST-34 (editor adoption, done; `plans/PST-34.md` D16 and PC7).** An outside change does not reload the editor, and the page re-reads the file on each `files-changed` (F24). With the watcher on, each app write also gives a second `files-changed` (R2), which costs one extra read and changes no text.
- **PST-16 (done; its test A5 in `apps/api/test/project-store-pending-apply.test.ts`, lines 341 to 395).** A5 makes host edits with `writeFileSync` and expects exact blocks with 500 ms "nothing else" windows (F15). With the harness default off (R1) it gets no watcher event and passes unchanged.

## 6. Changes of other draft and planned plans to the same files

The only other draft or planned plan at HEAD is `plans/TRG-14.md` (planned, F23). Its section 3 says `apps/api/**` does not change; its file table lists `apps/web` files, `apps/web/package.json`, `package-lock.json` and `e2e/specs/tools-editor.e2e.ts`. This plan changes only `apps/api` files and adds no package (R4), so no path is shared and either merge order is correct. TRG-14's new e2e spec runs with the watcher on after this unit merges; it does not count `files-changed` events, so step 7's e2e run is the check.

## 7. Decisions made by the reviser (the planner's open points, settled)

- **R1 (open point 1, default in test apps).** The base env of `createTestApp` sets `SCRIBA_WATCHER: 'false'`; watcher tests pass `'true'` through `env`. Reason: it keeps every exact-sequence suite of PST-15 to PST-18 green with no edit (F15), it is the one-line change, and it is exactly the condition of criterion 2. Option (b) (only the project-store kits) leaves the composed-app suites that boot with `book` active (F29) exposed; option (c) edits done suites. The production default stays `true` (unit line 17, module line 78).
- **R2 (open point 2, the app's own writes).** Accept the duplicate: a file-API write publishes its own `files-changed` (F8) and the watcher later publishes another for the same paths (and possibly the `<target>.tmp` name of `writeFileAtomic`, F31). The recheck is idempotent (`persistConflict` publishes only when the reason changes, F7), and the UI only refetches. Options (b) and (c) add state and cannot be needed by any criterion.
- **R3 (open point 3, debounce).** A fixed trailing window of 200 ms in code. A setting would need a new env name, which module line 78 does not list.
- **R4 (open point 4, mechanism).** `node:fs` `watch(root, {recursive: true})`. The reviser's probe on Node v26.13.0, Linux (F27), saw events for a write made right after `watch()` returns, for files in folders created after the watch, and names with `/`. No new dependency.
- **R5 (open point 5, dot-entries and reserved paths).** Never published (D5). The lists skip dot-entries (F8), so publishing them would refresh nothing, and the conflict flag writes under `.scriba/pending/` would echo events.
- **R6 (open point 6, boot).** Start at boot for an active `ok` project. Needed: activating the project that is already active runs no hook (F9, step 2 of `activate`), so without a boot start a restart with a project active (the normal case of the demo, PST-22 unit line 32) would never watch. W1 covers it.
- **R7 (open point 7, PST-22 e2e and demo step 3).** No change for PST-22: the default is on in production and in the e2e harness (F30), so demo step 3 is live; how PST-22's e2e checks anything is decided in PST-22's plan. Not a Navigator point: no criterion, settled decision or downstream behaviour changes.
- **R8 (open point 8, shutdown).** Accept: the stop at shutdown is implemented (step 3) and run by every test's `app.close()` (F10); it has no external effect to assert, which the README testing rule (external behaviour only) leaves untested.

Corrections of the draft by the reviser: W1 activated `book` with the POST route, but `bookLibrary()` already makes it active, so that POST is a no-op that runs no hook (F9, F29); W1 now relies on the boot start and the draft's W6 is dropped as redundant. D8 listed only `ProjectStoreService` members, but step 3 needs `ProjectsService`, `EventsPublisher` and `SCRIBA_ENV`. Step 3 lacked an `'error'` listener (a crash risk) and the toggle check in the constructor. Step 7 now runs the e2e once, because the e2e runs with the watcher on. Section 6 no longer mentions a lockfile overlap (no package is added).

## 8. Facts

### 8a. Checked (file and line on main `1fc0dd6`; F27 to F31 by the reviser on `7f083c2`)

- **F1.** Unit `units/PST-19-optional-watcher.md`: front matter lines 1 to 10 (`blocked_by: [PST-16]` line 7, `parallel_with` line 8, `unblocks: [PST-22]` line 9), Decisions 15 to 18, criteria 21 and 22. No note in the unit records a change of PST-19.
- **F2.** Module `modules/project-store.md`: line 45 (path safety is the one function), 46 (GETs never mutate), 48 (active-project rule), 52 (no other module's implementation), 56 to 57 (testing), 78 (env names), 80 (bind-mount caveat, "only refreshes the UI").
- **F3.** `units/README.md` (HEAD): events are `{module, type, data}` with no replay (line 133); testing is external behaviour only (line 138). PST-16 line 9 names PST-19 in `unblocks`; PST-22 line 7 names PST-19 in `blocked_by`; PST-17, PST-18, PST-20, PST-21 and PST-23 each name PST-19 in `parallel_with` (line 8).
- **F4.** Downstream lines: `units/PST-16-apply-three-way-check.md` line 23 (names the watcher); `units/PST-22-review-gate.md` line 32 (demo step 3); `units/PST-20-review-queue-ui.md` line 19; `units/PST-21-version-history-ui.md` line 16; `units/PST-10-files-ui.md` line 19; `units/CEX-17-manuscript-route-outline.md` line 21.
- **F5.** `plans/PST-16.md`: D4, D15, D17, section 6 (PST-19 agreement, line 180), test A5. Status `done`, as are `plans/PST-17.md`, `plans/PST-18.md` and `plans/PST-34.md`.
- **F6.** `apps/api/src/modules/project-store/project-store.service.ts`: line 20 (comment: files-changed "from the file API or the watcher"); `SCRIBA_ENV` injected at line 36; `onProjectSwitched` 59; `notifyProjectSwitched` 64; `onFilesChanged` 71; `notifyFilesChanged` 76. It also has `activeId`, `libraryRoot`, `resolvePath` and `requireActive`.
- **F7.** `pending.service.ts`: imports `EventsPublisher` from `../platform/platform.module` (line 19); the constructor registers `onFilesChanged` at line 91; `list` lines 102 to 113; `recheck` line 322; `recheckQuietly` line 334 (catches all errors); `persistConflict` line 368, which writes and publishes `pending-updated` only when the stored reason changes.
- **F8.** `files.service.ts`: `notifyFilesChanged` after each publish at lines 349 (`delete`), 393 (`move`) and 550 (`commit`); `collect` skips dot-entries at line 568.
- **F9.** `active-project.service.ts`: step (2) returns with no hook, write or event when the project is already active; the hooks run at line 73 (`notifyProjectSwitched`), before the settings write (step 5) and before `project-switched` is published (step 6).
- **F10.** `apps/api/src/modules/platform/events/events.publisher.ts`: `publish(envelope)` at line 61; `beforeApplicationShutdown` at line 70. Nest's `close` calls the destroy and before-shutdown hooks. `apps/api/src/main.ts` line 7: `enableShutdownHooks`.
- **F11.** `search.service.ts`: `SearchService` registers `onProjectSwitched` in its constructor (lines 51 to 63, every error ignored) and implements `onApplicationBootstrap`.
- **F12.** `packages/contracts/src/project-store/events.ts`: `filesChangedDataSchema` lines 13 to 16 (`paths` an array of non-empty strings). No watcher-specific schema exists.
- **F13.** `SCRIBA_WATCHER`: `packages/contracts/src/platform/env.ts` line 16 (default `'true'`); `apps/api/src/modules/platform/boot/env.ts` line 23 (type boolean), lines 123 to 127 (read); `units/PLT-02-contracts-package-platform-slice.md` line 49. No file under `apps/api/test` names it.
- **F14.** `apps/api/src/bootstrap.ts` line 33 (`parseEnv(options.env ?? process.env)`). `apps/api/test/create-test-app.ts` lines 77 to 84: the base env sets the three directories and the log level, then spreads `options.env`.
- **F15.** `apps/api/test/project-store-pending-apply.test.ts`: test A5 at lines 341 to 395 (host edits with `writeFileSync`; `stream.next(500)` must reject at lines 363, 375 and 388); `withKit` lines 61 to 73 passes no env.
- **F16.** `packages/contracts/src/project-store/constants.ts` lines 17 to 20: `RESERVED_PATH_PREFIXES` is `.scriba/` and `drafts/.versions/`. `path-safety.ts` line 61: `isReservedPath`.
- **F17.** `projects.service.ts` line 59: `find(id)` runs discovery on each call. `project-discovery.ts` line 17: `DiscoveredProject.root` is absolute.
- **F18.** `package.json` and `apps/api/package.json` name no watcher package.
- **F19.** `package.json` lines 11 and 12: `engines` `node >=26 <27`. `node -v`: `v26.13.0`.
- **F20.** `apps/web/src/app/features/project-store/files-page.ts` refetches the tree on `files-changed` (listener line 397). Checked by grep.
- **F21.** Kit helpers: `addOkProject` (`apps/api/test/project-store-active.kit.ts` line 71; writes only `project.yaml`), `postJsonPlain` (line 81), `pendingKitModule` (`apps/api/test/project-store-pending.kit.ts` line 22; imports `PlatformModule` and `ProjectStoreModule`), `bookLibrary` (`apps/api/test/project-store-files.kit.ts` line 44), `openSse` and `dataOf` (`apps/api/test/sse.ts` lines 31 and 66).
- **F22.** Active route: `active-project.controller.ts` line 26 (POST). Settings file: `<booksDir>/.scriba/settings.yaml`, outside every project folder.
- **F23.** `grep -l "^status: \(draft\|planned\)" plans/*.md` lists `plans/TRG-14.md` (planned) and this plan. TRG-14 section 3: `apps/api/**` does not change.
- **F24.** `plans/PST-34.md`: D16 (line 32) and PC7 (line 42).
- **F25.** `plans/DECISIONS.md`: `grep -n "PST-19"` returns no lines, so no PLAN DOES NOT WORK report and no Navigator decision exists for PST-19.
- **F26.** `apps/api/src` has no watcher code.
- **F27.** Reviser's probe (a script in `/tmp`, Node v26.13.0, Linux): `fs.watch(root, {recursive: true})`, then at once `writeFileSync` of an existing subfolder's file: events `rename` and `change` for `sources/outline.md`. `mkdirSync('a/b', {recursive: true})` and a write in it with no pause, and a write after 100 ms in a new folder: events for `a`, `a/b`, `a/b/x.md`. Names use `/`. A delete gives a `rename` event for the path.
- **F28.** `path-safety.ts` lines 13 to 18: `resolveProjectPath` returns `exists: false` for a missing target instead of throwing; reserved paths throw.
- **F29.** `bookLibrary()` writes `ACTIVE_BOOK_SETTINGS` (`active: book`) into the settings file (`project-store-files.kit.ts` lines 39 to 46); `book/sources/outline.md` is `# Outline\n` (`project-store-projects.kit.ts` line 48).
- **F30.** `e2e/harness/global-setup.ts` lines 74 to 85: the API child gets `PATH` and the three directories only, so `SCRIBA_WATCHER` takes its default `true`.
- **F31.** `atomic-write.ts` line 8: the temp file is `${target}.tmp`, in the target's folder.

### 8b. Assumed, not checked

- **A1.** On macOS hosts through Docker Desktop, events can be late or missing (module line 80); not verified, and not needed by any test.
- **A2.** A 1500 ms window is long enough on the CI machine for the 200 ms debounce plus fs delivery (step 5 runs W1 to W5 three times to see this).
- **A3.** The files page behaves as PST-10 states (F20).

## 9. Review parts

One part (a small plan).

- **Part 1 — the watcher, its harness default and its tests.** Steps 1 to 8; tests W1, W2 (criterion line 21), W3 and step 6 (criterion line 22), W4 and W5.
