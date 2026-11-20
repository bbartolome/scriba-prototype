---
id: SHL-18
status: done
---
# SHL-18 plan — About panel, desktop keyboard shortcuts, loading skeletons, Shell empty states

Unit: Frontend shell, `phase:polish` (M7). `blocked_by: [SHL-09]` (done on main). `unblocks: [SHL-19]` (not planned yet). Revision 2 (reviser, 2026-11-20), rechecked against `main` at `9d1d995`. Revision 1 was written from `f6fb151`; `git diff --stat f6fb151 9d1d995 -- apps/web/src/app/shell apps/web/src/app/app.html apps/web/src/app/app.ts apps/web/src/app/app.routes.ts e2e modules units/SHL-*` shows that only compile-export files and this plan changed in between, so every line number of revision 1 still holds. No build, test or e2e run was made by the planner or the reviser; every fact below comes from reading the repository.

Revision 2 settles the open points of revision 1 (section 6), gives each criterion exactly one test (section 4), and adds the review parts (section 8).

## 1. Decisions this plan follows

Unit decisions and criteria (source: `units/SHL-18-polish-about-shortcuts.md`):

- D1. The About panel shows the app version and the revision from Platform's version info (`GET /api/platform/version`), and the health from `GET /healthz`. Source: unit line 15 and criterion line 20. The revision field is in `versionInfoSchema` (`packages/contracts/src/platform/http.ts` line 20) and in `units/PLT-04-api-composition-root.md` line 25.
- D2. Desktop keyboard shortcuts navigate between nav entries and save in the editor. Every action is also reachable without a hardware key: nav entries are links, and the editor has its Save button (`apps/web/src/app/shell/markdown-editor.ts` lines 101 to 103). Source: unit lines 16 and 21.
- D3. Loading skeletons for the loading states the Shell owns. Empty states the Shell owns: no project, no features registered, not found. Source: unit line 17.
- D4. The three criteria are unit lines 20 to 22; section 4 gives each one exactly one test. The unit has no revision notes.

Module decisions (source: `modules/shell.md`):

- M1. The Shell publishes no contract slice (line 5). This plan adds no contract and changes no package.
- M2. Standalone components, signals first, zoneless (line 47). The Shell's own code lives outside `features/` (line 48), so every new file goes in `apps/web/src/app/shell/`.
- M3. The Shell reads only `/platform` among the pieces this plan touches (line 49). Reads are `GET` (line 50).
- M4. The route table's paths are fixed (heading of line 53). This plan adds no route and changes no row: the About panel lives on the Shell's own `/core-gate` page (R1), which is already in the table (line 69).
- M5. Features declare a device class, never pixel widths (line 109). The shortcuts have no pixel or device gate (R5).
- M6. Test seams (lines 91 to 96): rendered components and routes under Angular's Vitest runner with the fake API client (`apps/web/src/app/shell/testing/test-doubles.ts` line 43), and system checks with Playwright against the build the API serves on port 8080 (`e2e/playwright.config.ts` line 20).

Settled by earlier units (binding on this plan):

- S1. The toolbar keeps its three items in their order and gets no new item. Source: `units/SHL-20-phone-toolbar.md` lines 20, 21 and 29 (done). Its e2e (`e2e/specs/phone-toolbar.e2e.ts` lines 14 to 32 and 68 to 79) loads `/core-gate` at 390 by 844 and fails if the page scrolls sideways, so whatever this plan adds to `/core-gate` must wrap at 390 px (step 7).
- S2. The phone bottom nav has ten items and fits 390 px. This plan adds no nav entry. Source: `units/SHL-23-phone-bottom-nav-fit.md` lines 3 and 17; `units/README.md` line 87.
- S3. The editor's save shortcut (Ctrl or Cmd with S) is a keydown listener on the editor's host element (`markdown-editor.ts` lines 105 to 109 and `isSaveShortcut` at line 78; `plans/SHL-14.md` line 48, D15). Criterion 2 asks for save "in the editor", so this plan adds no page-wide Ctrl-S (`plans/SHL-14.md` line 195 leaves that choice to SHL-18).
- S4. SHL-17 (merged) stays as it is: no `dataGroups`, the exclusions of `apps/web/ngsw-config.json`, and `serviceWorkers: 'block'` for every e2e spec except `pwa.e2e.ts` (`e2e/playwright.config.ts` line 23). `/healthz` and `/api/platform/version` are never cached (`plans/SHL-17.md` line 235). This plan changes none of the files SHL-17 named as shared (`app.config.ts`, `notices.ts`, `notice-banners.ts`, `app.html`, `app.ts`, `e2e/playwright.config.ts`) except `app-nav.ts`, which SHL-17 did not change; the rule of `plans/SHL-17.md` line 236 is met.
- S5. Nav items are `routerLink` links, and SHL-18 owns the shortcut handler (`plans/SHL-05.md` line 260).
- S6. Production budgets (`apps/web/angular.json`, `production`): component styles warn at 4 kB and fail at 8 kB; the initial bundle warns at 500 kB and fails at 1 MB. `CoreGatePage` is a lazy chunk (SHL-09 criterion 2, `units/SHL-09-core-gate.md`), so the About panel imported by it stays out of the initial bundle.

Reviser's resolutions of the revision 1 open points (no Navigator decision needed: the unit names no entry point, no documentation place and no device class, and none of these choices changes a unit, the module file, a route or a done unit's criterion):

- R1 (was OP-1). The About panel is rendered on the Shell's `/core-gate` page (`apps/web/src/app/shell/core-gate/core-gate.ts`), after the page's paragraph and before the editor layout. Reason: `/core-gate` is a Shell-owned route with a nav entry at every device class (`app.routes.ts` lines 102 to 114, `minDeviceClass: 'phone'`; `modules/shell.md` line 69), so the panel is reachable on phone, tablet and desktop with no new route, no toolbar item (S1) and no nav entry (S2). The page stays a lazy chunk. Existing tests stay green: `apps/web/src/app/core-gate.spec.ts` C2 and M1 read only the first `h2` ("Core gate", lines 53, 76, 87) and `app-editor-layout`, so the panel's heading is an `h3` and follows the page's `h2`. Options (a) to (d) of revision 1 are not taken.
- R2 (was OP-2). The shortcuts are documented in the About panel, as a list (P10). No `docs/` file.
- R3 (was OP-3). The Shell's no-project empty state is on the switch page: "No project is active." when the active-project read answers `null`. The switch page is where every project URL goes when no project is active (`active-project-guard.ts` lines 27 to 32), and it is the Shell's (`modules/shell.md` line 68).
- R4 (was OP-4). A lazy route chunk gets no placeholder. The Shell's loading states are the reads of the landing, the switch page and the About panel.
- R5 (was OP-5). The shortcuts are active at every device class, with no device check. "Desktop" in the unit names where hardware keys are expected; a tablet or phone with a keyboard is not harmed, and a device check would be code no criterion needs.

Planner's small decisions (recorded here, not in `plans/DECISIONS.md`):

- P1. Names and files: `ShellSkeleton`, selector `app-skeleton`, in `apps/web/src/app/shell/skeleton.ts`; `AboutPanel`, selector `app-about-panel`, in `apps/web/src/app/shell/about-panel.ts`. Angular Material has no skeleton component.
- P2. Shortcut keys: Alt+`[` (`event.code` `BracketLeft`) goes to the previous nav entry, and Alt+`]` (`BracketRight`) to the next. The handler matches `event.code`, so Option+[ and Option+] should work on a Mac layout (assumption A2, manual leg in step 15). It needs Alt and no Ctrl, Meta or Shift. Reason: CodeMirror's default keymap binds Alt+Arrow keys, Alt-l, Mod-[ and Mod-] (`node_modules/@codemirror/commands/dist/index.js` lines 1796 to 1810), and the editors use it (`markdown-editor.ts` line 365; `features/tool-registry/tool-editor.ts` line 163). Alt-[ and Alt-] are bound in neither.
- P3. The shortcut does nothing when its event target is inside an `input`, a `textarea`, a `select` or a `contenteditable` element, so typing and the editor are never taken over. Its cycle is the nav entries shown at the current device class (`AppNav.items`, `apps/web/src/app/shell/app-nav.ts` lines 190 to 197), in nav order, wrapping at both ends. When the current URL path (cut at the first `?` or `#`) matches no entry, next goes to the first entry and previous to the last.
- P4. After a shortcut navigation, focus moves to the link of the entry it opened. SHL-19 owns the wider focus-order pass and may change this.
- P5. Empty nav: when no entry of the route table has `data.nav`, at any depth, the nav shows the text "No features registered." Device-class filtering alone shows nothing, as it does now.
- P6. The About panel reads the version, the revision and the health each time it is created, with no cache. A failed read shows its message in `role="alert"`, as `landing.ts` does (lines 77 to 82); the other read is unaffected.
- P7. Skeleton markup: a `span` with `role="status"` that holds visually hidden text "Loading" and one `aria-hidden="true"` bar per line. The pulse animation runs only inside `@media (prefers-reduced-motion: no-preference)`. The bar colour is the Material token `--mat-sys-surface-container-highest` (`node_modules/@angular/material/core/tokens/_classes.scss`).
- P8. Landing: the skeleton replaces the word `loading` only. The loaded text is unchanged, because `apps/web/src/app/shell/landing.spec.ts` line 107 checks "Platform version: 1.2.3".
- P9. Switch page: the skeleton replaces the `<h2>` while the project list read is pending.
- P10. The About panel's shortcut list has exactly two items: "Alt+[ and Alt+]: previous and next nav entry (Option on a Mac)" and "Ctrl+S (Cmd+S on a Mac) in the editor: save now".

## 2. Files to create or change

Only the paths below change. Not changed: `apps/api/**`, `packages/**`, `modules/**`, `units/**`, `plans/**` (except this file's status), `e2e/playwright.config.ts`, `e2e/harness/**`, the e2e specs other than the new one, `apps/web/src/app/app.html`, `app.ts`, `app.config.ts`, `app.routes.ts`, `apps/web/src/app/core-gate.spec.ts`, `apps/web/src/app/shell/core-gate/core-gate.routes.ts`, `not-found.ts`, `notices.ts`, `notice-banners.ts`, `connection-status.ts`, `sse-client.ts`, `platform-copies.ts`, `markdown-editor.ts`, `testing/**`, `apps/web/src/app/features/**`, `apps/web/src/material-theme.scss`, `apps/web/ngsw-config.json`, `apps/web/public/**`, `apps/web/angular.json`, `package.json` and `package-lock.json`.

| Path | Change | Purpose | Part |
|---|---|---|---|
| `apps/web/src/app/shell/skeleton.ts` | new | `ShellSkeleton` (P7) | A |
| `apps/web/src/app/shell/landing.ts` | edit: `imports: [ShellSkeleton]` on the decorator (line 16); template lines 19 and 20 | P8 | A |
| `apps/web/src/app/shell/landing.spec.ts` | add test L-skel after line 113 | supporting test | A |
| `apps/web/src/app/shell/switch-project.ts` | edit: a `loading` signal; the `<h2>` of line 22 becomes a skeleton while loading; "No project is active." when `active()` is `null` | P9, R3 | A |
| `apps/web/src/app/shell/app-nav.ts` | edit (empty state, part A): a `hasFeatures` boolean and one `<p class="empty">` after the `.items` div | P5 | A |
| `apps/web/src/app/shell/polish-states.spec.ts` | new | criterion 3 test T3 | A |
| `apps/web/src/app/shell/about-panel.ts` | new | `AboutPanel` (D1, P6, P10) | B |
| `apps/web/src/app/shell/about-panel.spec.ts` | new | supporting tests A2 and A3 | B |
| `apps/web/src/app/shell/core-gate/core-gate.ts` | edit: `imports: [EditorLayout, AboutPanel]`; `<app-about-panel />` after the `<p>` of lines 11 to 13 | R1 | B |
| `apps/web/src/app/shell/core-gate/about-route.spec.ts` | new | criterion 1 test T1 | B |
| `apps/web/src/app/shell/app-nav.ts` | edit (shortcuts, part C): the `document:keydown` host listener, `isEditable`, `onKeydown` | P2 to P4 | C |
| `apps/web/src/app/shell/app-nav.spec.ts` | add supporting tests N10 and N11 after N9 (line 213) | supporting tests | C |
| `e2e/specs/shell-polish.e2e.ts` | new | criterion 2 test T2 | C |

(`app-nav.ts` is listed twice because parts A and C change different lines of it; it is one file, `apps/web/src/app/shell/app-nav.ts`.)

Other open plans that change the same files: none. The plans with `status: draft` or `planned` on main are AGL-22, CEX-15, GNP-15 and GRR-15 (section 7, F3). None changes a path of this table; GRR-15 only reads `app.html` line 3 and the theme files, which this plan does not change. No `unit/*` branch changes `apps/web/src/app/shell`, `app.html`, `app.ts` or `e2e/specs/shell-polish.e2e.ts` against main (F39). So there is no merge order to check.

## 3. Method

Run on branch `unit/SHL-18` in the worktree `/Users/bbartolome/workspace/scriba-prototype-wt/SHL-18`, made from `main`, not in the shared working tree. Record `node -v` (expected `v26.x`) and `npm -v` (expected `11.20.0`) beside each result. Before each e2e run, check that nothing listens on port 8080. Do not push.

0. Preconditions. `git status --short` prints nothing on `main`. Run `git worktree add /Users/bbartolome/workspace/scriba-prototype-wt/SHL-18 -b unit/SHL-18 main`. In the worktree run `npm ci`, then `npm run build -w @bbartolome/scriba-contracts` (exit 0). Baseline before any change: `npm test -w @bbartolome/scriba-web` (exit 0), `npm run lint` (exit 0), and `npm run e2e -w @bbartolome/scriba-e2e -- specs/phone-toolbar.e2e.ts specs/touch-editor.e2e.ts specs/pwa.e2e.ts specs/nav-phone.e2e.ts specs/journey.e2e.ts` (exit 0; otherwise record each failing test name as the baseline).

Part A — skeletons and empty states

1. Skeleton. Create `apps/web/src/app/shell/skeleton.ts` as P7 says: standalone `ShellSkeleton`, selector `app-skeleton`, `input(1)` named `lines`, a `computed` array of that length for an `@for`, a `span role="status"` holding a visually hidden "Loading" span (clip and 1px size, not `display: none`), and one `span aria-hidden="true"` bar per line. Styles: an inline-block bar, 0.9em high, 6em wide, 4px radius, the token background; the pulse keyframes inside the `prefers-reduced-motion: no-preference` media query.
2. Landing. In `apps/web/src/app/shell/landing.ts` add `imports: [ShellSkeleton]` to the decorator. Replace template lines 19 and 20 so that each keeps its label and shows `@if (version(); as value) {{{ value }}} @else {<app-skeleton />}` (the same for `health`), with no whitespace between the label, the `@if` and the value, so the loaded text is exactly `Platform version: 1.2.3` and `Health: ok` (`landing.spec.ts` lines 107 and 108). If those lines fail, the fix is in the template, not in the test.
3. Landing spec. Add test L-skel after line 113 of `apps/web/src/app/shell/landing.spec.ts`. It provides, after `...doubles.providers` (the last provider wins), a test-local subclass of `FakeApiClient` whose `get` returns a held `Subject` for `VERSION_ROUTE`, mapped through `parseResponse`, and defers to `super.get` for every other path (the pattern of `HoldingApiClient`, `markdown-editor.spec.ts` line 269, applied to `get`). Assert: while held, a `role="status"` element with the text "Loading" exists and "Platform version: 1.2.3" does not; after the subject emits the version body, "Platform version: 1.2.3" is shown.
4. Switch page. In `apps/web/src/app/shell/switch-project.ts` add `protected readonly loading = signal(true);` after line 42. In the first `tap` (lines 51 to 54) set `loading` to true. Set it to false inside the list read's `map` (lines 57 to 61) and in its `catchError` (lines 62 to 65). Replace the `<h2>` of line 22 with `@if (loading()) {<app-skeleton />} @else {<h2>Switch to {{ title() }}?</h2>}`, add `imports: [ShellSkeleton]`, and add after the Switch button (line 23) `@if (active() === null) {<p>No project is active.</p>}`. The `project-route.spec.ts` tests, which look for `Switch to Beta?` with a synchronous fake, still pass at step 13.
5. Nav empty state. In `apps/web/src/app/shell/app-nav.ts` add `protected readonly hasFeatures` as a plain boolean computed once from `this.router.config`: true when any route, at any depth (`children`), has `data.nav` (the test of `navItem`, lines 36 to 46). In the template, after the `.items` div (line 174), add `@if (!hasFeatures) {<p class="empty">No features registered.</p>}`.
6. Criterion 3 test. Create `apps/web/src/app/shell/polish-states.spec.ts` with test T3 (section 4). Set-up: `stubMatchMedia(1280, 800)` and `restoreMatchMedia` in `afterEach` (`apps/web/src/app/shell/testing/match-media.ts` line 67); `createShellTestDoubles()`; a test-local `FakeApiClient` subclass that holds `PROJECTS_ROUTE` as in step 3; `doubles.api.respond('GET', ACTIVE_PROJECT_ROUTE, { active: null })`; `provideRouter` with a test-local table that has no `data.nav`: `[{ path: 'projects/:projectId/switch', component: SwitchProjectPage }, { path: '**', component: NotFoundPage }]`. Render `AppNav` with `TestBed.createComponent` and the route through `RouterTestingHarness.create()` in the same TestBed, as `project-route.spec.ts` lines 45 to 60 do for the harness.

Part B — the About panel

7. About panel. Create `apps/web/src/app/shell/about-panel.ts`: standalone `AboutPanel`, selector `app-about-panel`, `imports: [ShellSkeleton]`, with `API_CLIENT` and `DestroyRef` injected; signals for the version, the revision, the health and the error; two reads started in the constructor, `this.api.get(VERSION_PATH, versionInfoCopy)` (sets version and revision) and `this.api.get(HEALTHZ_PATH, healthzCopy)` (sets health), each with `takeUntilDestroyed` and the `read` pattern of `landing.ts` lines 77 to 82. Template: a `section` with `aria-labelledby` its `<h3>About Scriba</h3>`; a `dl` with `dt` Version, `dt` Revision and `dt` Health, each followed by a `dd` with the value or `<app-skeleton />`; a `<h4>Keyboard shortcuts</h4>` and a `ul` with the two items of P10; then `@if (error(); as message) {<p role="alert">{{ message }}</p>}`. Styles: the `dl` a two-column grid (`grid-template-columns: max-content minmax(0, 1fr)`), `dd` with `overflow-wrap: anywhere`, so nothing scrolls sideways at 390 px (S1); well under 4 kB.
8. Core gate. In `apps/web/src/app/shell/core-gate/core-gate.ts` set `imports: [EditorLayout, AboutPanel]` and add `<app-about-panel />` after the `</p>` of line 13, before the `@if` of line 14. The page's `<h2>Core gate</h2>` stays its first heading.
9. About spec. Create `apps/web/src/app/shell/about-panel.spec.ts` with the supporting tests A2 and A3 (section 4). Seam: a host component `<app-about-panel />` rendered in TestBed with the providers of `createShellTestDoubles()` (as `landing.spec.ts` lines 55 to 62 do), and for A2 a test-local subclass holding `VERSION_ROUTE` and `HEALTHZ_ROUTE` separately, released one at a time.
10. Criterion 1 test. Create `apps/web/src/app/shell/core-gate/about-route.spec.ts` with test T1 (section 4). Set-up: `stubMatchMedia(1280, 800)`; `createShellTestDoubles()` with `respond('GET', VERSION_ROUTE, …)` and `respond('GET', HEALTHZ_ROUTE, …)`; `provideRouter(APP_ROUTES)`; `RouterTestingHarness.create()` and `harness.navigateByUrl('/core-gate')`, waiting with a 5000 ms `vi.waitFor` for the lazy chunk (as `project-route.spec.ts` line 23).

Part C — shortcuts, the criterion 2 e2e, and the gates

11. Nav shortcuts. In `apps/web/src/app/shell/app-nav.ts`: (a) add `host: { '(document:keydown)': 'onKeydown($event)' }` to the decorator (line 81). (b) Add a module function `isEditable(target: EventTarget | null): boolean`: true when `target instanceof Element` and `target.closest('input, textarea, select, [contenteditable]:not([contenteditable="false"])')` is not null. (c) Inject `ElementRef`. Add `protected onKeydown(event: KeyboardEvent): void`: return unless `event.altKey` and not `event.ctrlKey`, `event.metaKey` or `event.shiftKey`, and `event.code` is `BracketLeft` (step −1) or `BracketRight` (step +1), and `isEditable(event.target)` is false. Read `items()`; return if empty. Find the index of the item whose `href` equals the current path (P3), compute the target index, call `event.preventDefault()`, then `this.router.navigateByUrl(items[target].href).then(...)`, and in the `then` focus the link at the target index of `this.elementRef.nativeElement.querySelectorAll('.items a')`.
12. Nav spec. In `apps/web/src/app/shell/app-nav.spec.ts` add N10 and N11 after N9 (line 213). Call `resize(1280, 800)` before rendering: at desktop the probes `phone-view` (order 1), `tablet-view` (order 2) and `plain-view` (order 3) all show (lines 26 to 52). Dispatch `KeyboardEvent('keydown', { code, altKey, ctrlKey, metaKey, bubbles: true })` on `document` or on a `textarea` and a `contenteditable` element appended to the fixture.
13. Vitest gate. Run `npm test -w @bbartolome/scriba-web`. Expected: exit 0; the existing tests pass unchanged (including `apps/web/src/app/core-gate.spec.ts` C2 and M1, `project-route.spec.ts`, `landing.spec.ts` E1 and C1, and the editor's `Ctrl-S`/`Cmd-S` tests); the new tests T1, T3, L-skel, A2, A3, N10 and N11 pass and none is skipped. Run `npx prettier --write` then `npx prettier --check` on every changed file: exit 0.
14. Criterion 2 e2e. Create `e2e/specs/shell-polish.e2e.ts` with test T2 (section 4). Copy the set-up of `openEditor` (`e2e/specs/touch-editor.e2e.ts` lines 16 to 48), with the project `polish-book`, title "Polish book", and the file `drafts/ch01.md` holding a `BEFORE` text that ends in `\n`. No `test.use`: the config's desktop viewport. Run `npm run e2e -w @bbartolome/scriba-e2e -- specs/shell-polish.e2e.ts`. Expected: 1 passed.
15. Regression and root gates. Run `npm run e2e -w @bbartolome/scriba-e2e -- specs/phone-toolbar.e2e.ts specs/touch-editor.e2e.ts specs/pwa.e2e.ts specs/nav-phone.e2e.ts specs/journey.e2e.ts` (exit 0, or only the baseline failures of step 0; `phone-toolbar.e2e.ts` checks that `/core-gate`, now with the About panel, does not scroll sideways at 390 px). From the root: `npm run build`, `npm test`, `npm run lint` (each exit 0) and `npm run e2e` (only baseline failures). The build must show no budget error (S6).
16. Mutation checks, each undone before the next. Copy each file to `/tmp/shl18-<name>` first; after the undo, `cmp` the copy with the file (exit 0). M1: remove the `isEditable` check from `onKeydown`; expected: N11 fails. M2: clamp the target index instead of wrapping; expected: N10 fails. M3: render the switch page's `<h2>` while loading, with no skeleton; expected: T3 fails. M4: remove the `revision` `dd` value from the About panel; expected: T1 fails. Run the web suite and record that the named test fails.
17. Commit on `unit/SHL-18`. `git add` each path of section 2 by name. Commit with `feat(SHL-18): about panel, nav shortcuts, skeletons and empty states`. Do not push. Expected: `git status --short` prints nothing, and `git diff --name-only main...unit/SHL-18` lists only section 2 paths. Remove the `/tmp/shl18-*` copies.
18. Record. The Node and npm versions and each command's exit code and counts. Manual legs, not criteria: Option+[ and Option+] in Chrome and Safari on a Mac (A2), and VoiceOver reading "Loading" once per skeleton. Record "not run" unless a person runs them.

## 4. Acceptance criteria and tests

Each criterion has exactly one test. Every test runs locally: Vitest in `apps/web`, Playwright with the cached Chromium. No criterion needs a device, a tailnet, GitHub Actions, Docker or credentials.

| Criterion (unit line) | Test, file and seam | Command | Pass condition |
|---|---|---|---|
| "The about panel shows version, revision and health." (line 20) | T1 `criterion 1: The about panel shows version, revision and health.` in `apps/web/src/app/shell/core-gate/about-route.spec.ts`. Seam: the rendered `/core-gate` route of `APP_ROUTES` (R1) in a `RouterTestingHarness`, with the fake API client answering `VERSION_ROUTE` with `{version: '1.2.3', revision: 'abc1234', builtAt: '2026-11-14T00:00:00Z', composeVersion: 1}` and `HEALTHZ_ROUTE` with `{status: 'ok', version: '1.2.3'}`. | `npm test -w @bbartolome/scriba-web` | Inside `app-about-panel`, the `dd` after the `dt` Version is `1.2.3`, the one after Revision is `abc1234`, and the one after Health is `ok`; no `role="status"` skeleton and no `role="alert"` is in the panel. |
| "Documented shortcuts navigate between nav entries and trigger save in the editor." (line 21) | T2 `criterion 2: Documented shortcuts navigate between nav entries and trigger save in the editor.` in `e2e/specs/shell-polish.e2e.ts`. Seam: the built app on port 8080, real key events, a real CodeMirror. Sequence: (1) after set-up, `page.goto('/core-gate?projectId=polish-book&path=drafts%2Fch01.md')`; (2) documented: the `app-about-panel` list contains "Alt+[ and Alt+]" and "Ctrl+S"; (3) save: click the textbox named "Markdown source for drafts/ch01.md", press `Control+End`, type " typed", then at once (within the 1500 ms debounce, `markdown-editor.ts` line 59) start `page.waitForResponse` for the POST to `/api/project-store/projects/polish-book/file/write` and press `Control+s`; (4) click the heading "Core gate" so focus leaves the editor; (5) navigate: `Alt+BracketLeft`, then `Alt+BracketRight`, then `Alt+BracketRight`, each followed by `expect(page).toHaveURL`. | `npm run e2e -w @bbartolome/scriba-e2e -- specs/shell-polish.e2e.ts` | Step 2's texts are visible. Step 3's response is ok, and `readFile` of the file equals `BEFORE + ' typed'`. Step 5 gives the paths `/settings`, `/core-gate` and `/projects` in that order (nav order 20, 40, 50, 90, 100 of `app.routes.ts`; the wrap from the last to the first entry). |
| "Component tests cover skeletons and empty states." (line 22) | T3 `criterion 3: Component tests cover skeletons and empty states.` in `apps/web/src/app/shell/polish-states.spec.ts`. Seam: the rendered `AppNav` and the routed `SwitchProjectPage` and `NotFoundPage` in one TestBed (step 6), with the project-list read held and the active read answering `null`. | `npm test -w @bbartolome/scriba-web` | After `harness.navigateByUrl('/projects/beta/switch')`: the route shows a `role="status"` "Loading" and no `h2` (skeleton); it shows "No project is active." and the Switch button (no-project state); the nav shows "No features registered." and no link (no-features state). After the held read emits `{ projects: [{ id: 'beta', title: 'Beta', active: false, status: 'ok' }] }`: "Switch to Beta?" shows and no `role="status"` remains. After `harness.navigateByUrl('/nowhere')`: "Page not found" shows (not-found state). |

Supporting tests (not criterion tests; each guards one step and is in one review part):

- L-skel (`landing.spec.ts`, part A): the landing's version shows a skeleton while its read is held, and "Platform version: 1.2.3" after.
- A2 (`about-panel.spec.ts`, part B): each About value shows its own skeleton until its read is released; the other value is unaffected.
- A3 (`about-panel.spec.ts`, part B): when the health read fails, the version and revision still show and `role="alert"` shows the message.
- N10 (`app-nav.spec.ts`, part C): at 1280 by 800, from `/plain-view` a keydown of `BracketRight` with `altKey` on `document` makes the URL `/phone-view` and focuses its link; `BracketLeft` from there makes it `/plain-view`.
- N11 (`app-nav.spec.ts`, part C): on a `textarea` and a `contenteditable` element the URL does not change and `defaultPrevented` is false; on `document` with no Alt, with Ctrl and Alt, with Meta and Alt, and with Shift and Alt, the URL does not change.
- Unchanged existing tests that stay green: `apps/web/src/app/core-gate.spec.ts` C2 and M1; `markdown-editor.spec.ts` `Ctrl-S`/`Cmd-S saves at once` (lines 388 to 398); `app.routes.spec.ts` lines 22 and 28 and `device-gate.spec.ts` G7 (not found); `project-route.spec.ts`; `landing.spec.ts` C1 and E1; N1 to N9.

## 5. Downstream agreement

Only SHL-19 names SHL-18 in `blocked_by` (`units/SHL-19-polish-gate.md` line 7). `plans/SHL-19.md` and a `unit/SHL-19` branch do not exist. SHL-18's `unblocks` is `[SHL-19]`, consistent. The `parallel_with` lists of SHL-10, SHL-11, SHL-12, SHL-13 and SHL-17 name SHL-18 (all done; this plan changes none of their files except reading `markdown-editor.ts`).

SHL-19, what it needs and where this plan gives it:

- Criterion 1 (axe over "nav, landing, notices, editor, diff and card", SHL-19 line 21). The nav's empty state is text (P5); skeletons are `role="status"` with decorative bars hidden (P7); the About panel is a labelled `section` with an `h3`, a `dl`, a `ul` and an alert, with no colour-only state, and it sits on `/core-gate`, the page that holds the editor, so an axe run over the editor covers it. No SHL-19 text needs to change.
- Criterion 2 (phone-viewport check: bottom nav shown, review step works). No toolbar item (S1), no nav entry (S2), no phone-only behaviour; the shortcuts act only on a key press. The About panel wraps at 390 px (step 7).
- Criterion 3 (SHL-17's checks pass on `main`). No SHL-17 file and no `e2e/playwright.config.ts` change; the new spec inherits `serviceWorkers: 'block'` (S4).
- Demo (SHL-19 lines 28 to 32). Unchanged.
- Focus order. P4 is this plan's choice; SHL-19's pass may change it.

## 6. Open points

None. The five open points of revision 1 are settled by R1 to R5 (section 1).

## 7. Facts checked and facts assumed

### Facts checked (repository, on `main` at `9d1d995`)

- F1. `units/SHL-18-polish-about-shortcuts.md`: front matter lines 2 to 9; Decisions lines 15 to 17; criteria lines 20 to 22 (unchecked). No revision notes.
- F2. Downstream: `units/SHL-19-polish-gate.md` line 7 `blocked_by` names SHL-18; SHL-09 `unblocks` names SHL-18; SHL-10 to SHL-13 and SHL-17 `parallel_with` name SHL-18. No `plans/SHL-19.md`.
- F3. Plans with `status: draft` or `planned`: AGL-22 (draft), CEX-15, GNP-15, GRR-15 (planned), and this plan. A grep of each for `shell/`, `app.html`, `app.ts`, `app.routes`, `core-gate`, `app-nav`, `landing`, `switch-project` and `e2e/specs` finds no path this plan changes: AGL-22 names only `apps/api/test/create-test-app.ts`; GRR-15 adds `e2e/specs/graph-{theme,touch,large}.e2e.ts` and reads `app.html` line 3 and the theme files; GNP-15 changes no e2e file; CEX-15 names none. AGL-21 and CEX-18 are now `done`.
- F4. `grep -n 'SHL-18' plans/DECISIONS.md` prints nothing. The SHL-19 lines (3322, 3430, 3517, 3531, 3583, 3591, 3611, 3630, 4864, 4891, 6801) record advice for its accessibility pass and "unaffected" notes; none binds SHL-18.
- F5. `apps/web/src/app/app.html`: toolbar lines 1 to 4; `app-notice-banners` line 5; layout lines 6 to 11 (`app-nav` with the `nav-project` slot at line 7, `<router-outlet />` at line 9).
- F6. `apps/web/src/app/app.routes.ts`: `''` 83 to 88; `projects/:projectId/switch` 89 to 96; `projects/:projectId` 97 to 101; `core-gate` 102 to 114 (nav order 100, `minDeviceClass: 'phone'`, lazy `loadChildren`); `setup` 115 to 126 (no nav); `settings` 127 to 139 (90); `projects` 140 to 152 (20); `tools` 153 to 165 (40); `providers` 166 to 178 (50); `**` NotFoundPage line 179.
- F7. `apps/web/src/app/shell/core-gate/core-gate.ts`: `imports: [EditorLayout]` line 8; template lines 9 to 17 (`<h2>Core gate</h2>` line 10, the paragraph lines 11 to 13, the editor `@if` lines 14 to 16); `reference` from the `projectId` and `path` query, lines 20 to 26. `core-gate.routes.ts` line 5.
- F8. `apps/web/src/app/core-gate.spec.ts`: C2 (line 24) and M1 (line 56) render `App` with `APP_ROUTES` and the shell doubles at 390 by 844, and check the first `h2` is "Core gate" (lines 53, 76, 87) and `app-editor-layout`. Neither registers the version or health reads; with the About panel those reads error in the fake (`test-doubles.ts` lines 90 to 93) and the panel shows an alert, which neither test checks.
- F9. `apps/web/src/app/shell/app-nav.ts`: `navItem` lines 36 to 46; `navItems` lines 52 to 73; decorator line 81; template lines 161 to 177 (`.items` div 163 to 174, slot 175); `items` computed lines 190 to 197. `project-scope.ts` lines 11 to 23: `projectIdOf` reads route params only, so `/core-gate?projectId=…` shows the app entries only.
- F10. `apps/web/src/app/shell/landing.ts`: decorator line 16; template lines 18 to 24 (lines 19 and 20 use `?? 'loading'`); `read` lines 77 to 82.
- F11. `apps/web/src/app/shell/switch-project.ts`: `<h2>` line 22; Switch button line 23; signals lines 40 to 42 (`active` is `string | null | undefined`); the list read lines 48 to 70 (`tap` 51 to 54, `map` 57 to 61, `catchError` 62 to 65); the active read lines 71 to 83.
- F12. `apps/web/src/app/shell/active-project-guard.ts` lines 13 to 33: a project URL whose id is not the active one, `null` included, goes to the switch page (lines 27 to 32).
- F13. `apps/web/src/app/shell/not-found.ts` line 8: `<h2>Page not found</h2>`. Tests: `app.routes.spec.ts` lines 22 and 28; `device-gate.spec.ts` line 194 (G7).
- F14. `apps/web/src/app/shell/platform-copies.ts`: `VERSION_PATH` line 11, `versionInfoCopy` line 27, `healthzCopy` line 47. `sse-envelope.ts` line 13: `HEALTHZ_PATH`.
- F15. `packages/contracts/src/platform/http.ts`: `HEALTHZ_ROUTE` line 8, `VERSION_ROUTE` line 9, `healthzSchema` line 12, `versionInfoSchema` line 20. `apps/api/src/modules/platform/version.controller.ts` line 15 serves `revision`.
- F16. `apps/web/src/app/shell/markdown-editor.ts`: `SAVE_DEBOUNCE_MS = 1500` line 59; `isSaveShortcut` line 78; Save button lines 101 to 103; host listeners lines 105 to 109; the keymap line 365; `aria-label` "Markdown source for <path>" line 371.
- F17. `apps/web/src/app/features/tool-registry/tool-editor.ts` line 163: the same keymap.
- F18. `apps/web/src/app/shell/markdown-editor.spec.ts`: `HoldingApiClient` line 269 (holds `post`); `Ctrl-S`/`Cmd-S saves at once` lines 388 to 398.
- F19. `apps/web/src/app/shell/testing/test-doubles.ts`: `FakeApiClient` line 43; `respond` line 49; `get` lines 58 to 71; `answer` lines 84 to 102 (an unregistered path errors at lines 90 to 93). `testing/match-media.ts` line 67: `stubMatchMedia`.
- F20. `apps/web/src/app/shell/app-nav.spec.ts`: `probes` line 26; `resize` lines 75 to 79; N1 line 137; N4 at 1280 by 800 line 157; N9 line 213.
- F21. `apps/web/src/app/shell/landing.spec.ts`: `beforeEach` lines 55 to 62; C1 lines 70 to 90; E1 lines 92 to 113 (lines 107 and 108).
- F22. `apps/web/src/app/shell/project-route.spec.ts`: `LOAD_WAIT` line 23; `projectList` lines 25 to 31; `seed` lines 40 to 43; helpers to line 83.
- F23. `e2e/specs/touch-editor.e2e.ts`: `openEditor` lines 16 to 48 (switch-page activation lines 30 to 38; the textbox line 45). `e2e/specs/phone-toolbar.e2e.ts`: `expectFitsViewport` lines 14 to 32 (fails on sideways scroll); `/core-gate` at lines 68 and 79.
- F24. `e2e/playwright.config.ts`: `baseURL` line 20; `serviceWorkers: 'block'` line 23.
- F25. `apps/web/src/app/shell/project-store-copies.ts` lines 79 to 81: `PROJECT_FILE_WRITE_PATH` `/api/project-store/projects/:projectId/file/write`.
- F26. `node_modules/@codemirror/commands/dist/index.js` lines 1796 to 1810: `Alt-ArrowLeft/Right/Up/Down`, `Alt-l`, `Mod-[`, `Mod-]`; no `Alt-[` or `Alt-]`.
- F27. `modules/shell.md`: line 5; line 47; line 48; lines 49 and 50; line 53 (route table, paths fixed); line 68 (switch page, Shell); line 69 (`/core-gate`, Shell, phone, nav); lines 91 to 96; line 109.
- F28. `units/SHL-20-phone-toolbar.md` lines 20, 21, 29. `units/SHL-23-phone-bottom-nav-fit.md` line 17. `units/SHL-09-core-gate.md` criterion 2 (dummy feature lazy, own chunk).
- F29. `plans/SHL-14.md` lines 48 and 195; `plans/SHL-05.md` line 260; `plans/SHL-17.md` lines 233 to 237.
- F30. `apps/web/angular.json` `production` budgets (4 kB, 8 kB, 500 kB, 1 MB).
- F31. `node_modules/@angular/material/core/tokens/_classes.scss` contains `surface-container-highest`.
- F32. No `prefers-reduced-motion`, `visually-hidden`, `sr-only`, `skeleton`, `app-skeleton` or "No features" exists in `apps/web/src` (revision 1 grep; no shell file changed since).
- F39. No `unit/*` branch changes `apps/web/src/app/shell`, `app.html`, `app.ts` or `e2e/specs/shell-polish.e2e.ts` against main (`git diff --name-only main...<branch>` for each `refs/heads/unit/*`).

### Facts assumed (not checked here)

- A1. Stories 34 and 35, which the unit cites, match the unit's wording (the original specs are deleted).
- A2. On a Mac, Option+[ reports `event.code` `BracketLeft` with `altKey` true in Chrome and Safari. Manual leg (step 18).
- A3. Playwright 1.65.0 accepts `Alt+BracketLeft`, `Alt+BracketRight`, `Control+End` and `Control+s`; confirmed when T2 runs.
- A4. jsdom dispatches a `KeyboardEvent` with `code` and `altKey`; checked by N10 and N11.
- A5. `--mat-sys-surface-container-highest` resolves in the built theme. Contrast of the bars is SHL-19's.
- A6. Typing six characters and pressing Control+s in T2 takes far less than the 1500 ms debounce, so the write T2 waits for is the one the key triggers. If T2 is flaky for this reason, the fix is to start the wait and press the key right after typing, not to change the debounce.
- A7. The cached Chromium runs the new e2e spec locally, as SHL-17's plan reports for the same cache.

## 8. Review parts

Each step and each test is in exactly one part. Review in order: B uses part A's skeleton, and part C's T2 reads part B's documented list.

| Part | Steps | Criterion test | Supporting tests | Review focus |
|---|---|---|---|---|
| A — skeletons and empty states | 1, 2, 3, 4, 5, 6 | T3 (criterion 3) | L-skel | P5, P7 to P9, R3; landing and switch texts unchanged once loaded |
| B — the About panel | 7, 8, 9, 10 | T1 (criterion 1) | A2, A3 | D1, R1, R2, P6, P10; `core-gate.spec.ts` C2 and M1 unchanged; 390 px wrap |
| C — shortcuts and gates | 0, 11, 12, 13, 14, 15, 16, 17, 18 | T2 (criterion 2) | N10, N11 | P2 to P4, R5, S3; the mutation checks; the regression e2e including `phone-toolbar.e2e.ts` |
