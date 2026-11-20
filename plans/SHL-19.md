---
id: SHL-19
status: draft
---
# SHL-19 plan — polish gate: accessibility pass, phone e2e check, M7 checks

Planner draft, revision 1, from `main` at 3d66dc3 (clean tree). Unit `units/SHL-19-polish-gate.md` (module Frontend shell, `phase:polish`, M7). Source tags: `U n` is line n of the unit file; `M n` is line n of `modules/shell.md`; `R n` is line n of `units/README.md`; `DEC date` is an entry of `plans/DECISIONS.md`; `path:n` is a repository line. Status stays `draft` until a reviser checks it and it is approved.

## 1. Decisions this plan follows

- **D1. The unit closes the gate.** Merging SHL-19 closes Frontend shell `phase:polish`. It unblocks nothing: `unblocks: []` (U9) matches the repository, where no unit's `blocked_by` names SHL-19. Source: U14; R83; grep over `units/`.
- **D2. Seam.** Criteria 1 and 2 are system checks: Platform's Playwright e2e against the build the API serves on port 8080. Criterion 1 names Playwright as the tool ("e.g. axe via Playwright"). The criteria heading has no parenthetical, so the module default (rendered routes under Angular's Vitest runner, M93) is not the seam for them. Source: U21; M95; R57 (a parenthetical names a different seam); `e2e/playwright.config.ts:20` (`baseURL` 127.0.0.1:8080).
- **D3. Axe scope.** Criterion 1 covers six areas: nav, landing, notices, editor, diff and card. Each is scanned in light and dark. The theme is pinned by `localStorage['scriba.theme']` (`apps/web/src/app/shell/theme.ts:8`; the service sets `data-theme` on `<html>`, `theme.ts:37` to `:62`). The states that show each area are in section 4. Source: U21.
- **D4. Failure rule.** A scan fails on axe impacts `serious` and `critical`. `moderate` and `minor` are printed in the report and do not fail. Source: U21 ("no serious violations"); ASM-6.
- **D5. Rule set.** axe's default rules, with no tag filter. The default set includes `color-contrast` (ASM-6). Source: simplest option.
- **D6. Scope of a scan.** A scan covers the whole rendered state the author sees. One exception: the device-class banner state (A3b) scans only `app-notice-banners`, because the page under it is the graph runner's canvas. Violations in feature-owned code are not changed here (OP-5). Source: M48 (feature UIs live in `features/<m>/` and are owned by their module; the Shell's own code lives outside `features/`).
- **D7. Read-only diff sides get an accessible name.** The base side and the read-only proposed side get `aria-label`s through `EditorView.contentAttributes`: `Base text for <path>` and `Proposed text for <path>`. The editable proposed side keeps SHL-16's `Proposed text for <path>`. Source: U21; `plans/SHL-16.md:16` (D6: the editable side has a label; read-only sides get none, citing D2 at `:12`), `:101` ("that is SHL-19's to fix"); `plans/DECISIONS.md:3322`, item 2 (CodeMirror content with `role="textbox"` and no name, flagged by axe). The read-only branch is `apps/web/src/app/shell/diff-view.ts:91` to `:103`.
- **D8. The phone check is a new spec.** It is `e2e/specs/shell-phone.e2e.ts`. PST-20's `e2e/specs/review-phone.e2e.ts` (lines 47 to 195) already drives the bottom nav and the review step at 390 by 844. That file is not changed. The new spec states the gate's own check, so a failure is traceable to this unit. Source: U18; U31; `review-phone.e2e.ts:47` to `:195`.
- **D9. No service worker in the new specs.** `e2e/playwright.config.ts:22` to `:23` set `serviceWorkers: 'block'`; only `e2e/specs/pwa.e2e.ts:35` allows one. Source: `plans/SHL-17.md:43` (P12) and `:229`.
- **D10. Criterion 3 is SHL-17's two tests.** They are `pwa.e2e.ts:190` ("criterion 1: installable ...") and `:348` ("criterion 2: excluded paths ..."), run with `--grep`. No new test, and no change to `pwa.e2e.ts` or `apps/web/ngsw-config.json`, which SHL-17 keeps stable (its rule at `plans/SHL-17.md:236`). The unit branch runs them after the rebase (step 11); after the merge the orchestrator runs the same command on `main`. Source: U23; `plans/SHL-17.md` section 6 (lines 225 to 231).
- **D11. Notice states.** (a) The "Server unreachable" banner, posted by `apps/web/src/app/shell/connection-status.ts:43` to `:50` when the SSE client's reachability probe fails (`sse-client.ts:159`, `:163` to `:167`). (b) The device-class banner, posted by `device-class.ts:86` to `:92` when an open view needs a larger class than the device has (text at `device-class.ts:47`). The PWA update banner (`pwa-update.ts:30`) is not scanned: it needs a second build (SHL-17 test 3, `pwa.e2e.ts:461`). It is rendered by the same component (`notice-banners.ts:19` to `:33`).
- **D12. The card state uses a project model, not the app default.** The provider is created with the mock's `summarize-outline` scenario and set as the active project's model: `POST /api/providers/project-model` with body `{providerId, model}` (`apps/api/src/modules/providers/providers.service.ts:95` to `:101`; `packages/contracts/src/providers/routes.ts:13`; `packages/contracts/src/providers/model.ts:5` to `:8`). The app default is global, and `e2e/specs/providers-phone.e2e.ts:35` to `:41` restores it because other specs read it. The request shape (origin header, body) follows `e2e/specs/journey.e2e.ts:209` to `:228`; the origin header is required by the API guard (`providers-phone.e2e.ts:43`).
- **D13. The editor state is the Shell's own mount.** It is `/core-gate?projectId=<p>&path=<f>` (`apps/web/src/app/shell/core-gate/core-gate.ts:16` to `:18` and `:23` to `:28`; `e2e/specs/shell-polish.e2e.ts:15` to `:47` for the seeding pattern, mount at `:41` to `:44`; `plans/SHL-15.md:116` suggests it for this pass). It renders `app-editor-layout`: the split view on tablet and desktop, the Edit/Preview toggle on phone (`apps/web/src/app/shell/editor-layout.ts:28` to `:33`). The Files page is not scanned here.
- **D14. The landing state holds its redirect.** The landing page leaves `/` after `GET /api/project-store/active` (`apps/web/src/app/shell/landing.ts:70` to `:76`; the path is `project-store-copies.ts:15`). The test holds that GET with `page.route`, so the page stays at `/` while it is scanned. The version and health reads are not held (`landing.ts:47` to `:52`).
- **D15. Test data, helpers and timeouts.** Project ids are `shell-a11y` and `shell-phone`. Each spec seeds its own files and removes its project directory in `afterAll` (pattern: `e2e/specs/nav-phone.e2e.ts:26` to `:30`). Helpers are copies in each file, not imports (`plans/SHL-17.md:209`). The active-project pointer is left as the last spec set it, as `nav-phone.e2e.ts` does; the full run (step 14) checks this, because leftover library state broke the full suite before (the title of `plans/PLT-23.md:3`). The a11y tests call `test.setTimeout(120_000)`, because one test runs two themes.
- **D16. Focus order is in the scope, with no criterion.** One keyboard test, F1, checks that Tab visits the side nav's links in DOM order (U17). It is an extra test. The shortcut focus of SHL-18 (`plans/SHL-18.md:51`, P4) stays as it is unless F1 fails.
- **D17. One existing unit test changes.** `apps/web/src/app/shell/diff-view-editable.spec.ts` C4 (lines 200 to 218) asserts that read-only sides carry no label (line 216). Under D7 it asserts the labels instead. This is the only change to an existing unit test.
- **D18. New dev dependency.** `@axe-core/playwright` in `e2e/package.json` `devDependencies` at `^4.14.0`. The registry showed 4.14.0 at planning, with peer `playwright-core >= 1.0.0` and dependency `axe-core ~4.14.0` (registry read at planning). The implementer resolves the newest 4.14.x at step 3. Source: U21 ("e.g. axe via Playwright").
- **D19. Shell code changes follow measured findings only.** Besides D7, a change to Shell code (`apps/web/src/app/shell/**`, `app.html`, `app.css`, `app.ts`, `apps/web/src/styles.css`, `apps/web/src/material-theme.scss`) is made only for a serious or critical finding of the baseline run (step 6). Each such change is named in the report with its rule id.
- **D20. Dependencies are met on main.** SHL-10 to SHL-18 and PST-22 are `status: done` on main (section 7). M11 says the polish gate waits for the editor phase because its accessibility pass covers the editor; SHL-13 to SHL-16 are done. Source: U7; M11.
- **D21. Demo steps are manual.** Demo steps 1, 3 and 5 need the iPad, the Mac's `git diff` and the phone's airplane mode (U28, U30, U32), and the install check needs the tailnet (`plans/SHL-17.md:204`, item 12). None is an acceptance criterion, so none is automated. The M7 byte check depends on the round trip that SHL-13 and SHL-14 test (`plans/SHL-13.md:163`). The manual legs are OP-1.

## 2. Files to create or change

Only the paths below change. Everything else is unchanged.

| Path | Change | Purpose |
|---|---|---|
| `e2e/package.json` | edit | `devDependencies["@axe-core/playwright"]` at `^<axe>` (D18). Other entries unchanged |
| `package-lock.json` | changed by npm | adds `@axe-core/playwright` and `axe-core`; no other entry |
| `e2e/specs/shell-a11y.e2e.ts` | new | criterion 1 tests A1 to A6 and the extra focus test F1 (section 4) |
| `e2e/specs/shell-phone.e2e.ts` | new | criterion 2 test P1; test P2 only if OP-2 is decided yes |
| `apps/web/src/app/shell/diff-view.ts` | edit | D7. `sideExtensions` (line 91) takes the side's label; its read-only branch (lines 92 to 103) adds `EditorView.contentAttributes` with it. The call sites (lines 194, 214, 217) pass the path from the component's `path` input |
| `apps/web/src/app/shell/diff-view-editable.spec.ts` | edit | D17. C4 (lines 200 to 218) expects the labels, for each layout the spec loops over |
| Shell code, only as the baseline requires | edit, conditional | D19. Named in the report, one rule id per change |
| `e2e/playwright.config.ts`, `e2e/harness/**`, every existing `e2e/specs/*.e2e.ts` | unchanged | the suite's shared setup and other specs |
| `apps/web/src/app/features/**` | unchanged | OP-5 |
| `units/**`, `modules/**`, `plans/DECISIONS.md`, other `plans/*.md` | unchanged | the unit and module files are not edited by a plan |
| `plans/SHL-19.md` | new (planner) | this plan; the implementer does not change it |

## 3. Method

Run from `/Users/bbartolome/workspace/scriba-prototype`. Record `node -v` and `npm -v` beside each result. Port 8080 must be free for every e2e run (`e2e/harness/global-setup.ts:20`). Run one e2e command at a time.

1. **Runtime and base.** `node -v` prints `v26.x`, `npm -v` prints `11.20.0`. With a clean tree, `git worktree add ../scriba-prototype-wt/SHL-19 -b unit/SHL-19 main`. Record `git rev-parse --short main`. Run every later step in that worktree.
2. **Install.** `npm ci`. Expected: exit 0.
3. **Dependency and two facts.** `npm view @axe-core/playwright version` gives `<axe>` (4.14.0 at planning). Then `npm install -D @axe-core/playwright@^<axe> --workspace=@bbartolome/scriba-e2e`. Expected: exit 0; `git diff --stat -- e2e/package.json` shows one added line; `npm ls axe-core` shows one copy. Check ASM-6 on the installed copy: `ls node_modules/axe-core` (find the bundle file), then `grep -o "'minor'\|'moderate'\|'serious'\|'critical'" <bundle> | sort -u` prints all four, and `grep -c "color-contrast" <bundle>` prints at least 1.
4. **Criterion 3 before any change.** `npm run e2e -w @bbartolome/scriba-e2e -- specs/pwa.e2e.ts --grep "criterion 1|criterion 2"`. Expected: 2 passed.
5. **Red: the diff labels.** Change C4 in `diff-view-editable.spec.ts` as D17 says. Run `npm test -w @bbartolome/scriba-web`. Expected: C4 fails for the missing labels. Record the message.
6. **Red: the axe scans.** Write `e2e/specs/shell-a11y.e2e.ts` with A1 to A6 and F1 (section 4). Run `npm run e2e -w @bbartolome/scriba-e2e -- specs/shell-a11y.e2e.ts`. Expected: each test reaches its states. A timeout while waiting for a state is a defect of the test or of the Shell; record it and fix the test first. Each failing scan lists its rule id, impact and first targets. Not known in advance: A5's read-only base side should fail `aria-input-field-name`, as `plans/DECISIONS.md:3322` says. This run is the baseline for step 8.
7. **Green: the diff.** Change `diff-view.ts` as D7 says. Run `npm test -w @bbartolome/scriba-web` (expected: exit 0, C4 passes) and `npm run e2e -w @bbartolome/scriba-e2e -- specs/shell-a11y.e2e.ts --grep "criterion 1: diff"` (expected: passes in both themes, unless step 6 found another finding in these states).
8. **The other serious and critical findings.** For each finding left by the baseline, make the smallest change in Shell code (D19) and re-run the affected test. Record the rule id, the element, the file and line, and the fix. A finding in `apps/web/src/app/features/**` is not changed: stop and report it (OP-5). Moderate and minor findings are listed in the report and not fixed. Known in advance: the nested `<main class="chat">` at `apps/web/src/app/features/agent-loop/chat-page.ts:264` inside `app.html:8` is expected to be a landmark finding of moderate impact, not serious (to be confirmed at step 6; ASM-6 covers the impact names only); it is not changed (OP-5).
9. **Focus test.** F1 must pass. If it fails, the smallest change is in `apps/web/src/app/shell/app-nav.ts`, which is Shell code (D19); if that does not fix it, stop and report.
10. **Phone check.** Write `e2e/specs/shell-phone.e2e.ts` with P1 (section 4). Run `npm run e2e -w @bbartolome/scriba-e2e -- specs/shell-phone.e2e.ts`. Expected: 1 passed. If OP-2 is decided yes, add P2 first and run the file again.
11. **Criterion 3 on the branch.** If `main` moved since step 1, `git rebase main` and repeat steps 4 and 11 on the rebased tree. Otherwise rerun the command of step 4. Expected: 2 passed.
12. **Mutation check (not committed).** Remove the two read-only `aria-label`s from `diff-view.ts`, then run `--grep "criterion 1: diff"`. Expected: A5 fails with `aria-input-field-name`. Restore the labels and run again. Expected: passes. Record both results.
13. **Gates.** From the root: `npm run build`, `npm test`, `npm run lint`. Expected: each exits 0. The root `lint` ends with `prettier --check .`; if it fails on the new files, run prettier on them and rerun.
14. **Full e2e.** `npm run e2e`. Expected: exit 0, including A1 to A6, F1 and P1 (and P2 if decided). Record the passed count. This run also checks the leftover-state risk (D15).
15. **Manual legs.** Not run by the implementer. The report says "not run" for demo steps 1, 3 and 5 and the iPad install, unless the orchestrator asks for them (OP-1).
16. **Commit.** On `unit/SHL-19`, stage the changed paths by name (never `git add -A`) and commit as `feat(SHL-19): accessibility pass and phone e2e check`.
17. **Report.** For each test: result. For each baseline finding: rule id, state and theme. The changed files. The criterion 3 result. The manual legs not run. Each open point still open.

## 4. Acceptance criteria and tests

Section 4 maps each criterion of the unit to tests. The criterion 1 test titles start with `criterion 1: <area>`, so `--grep` selects them.

| Criterion (unit line) | Test (file, title) | Seam | Command | Pass condition |
|---|---|---|---|---|
| C1 (U21): nav | A1 `criterion 1: nav` (shell-a11y) | Playwright e2e, port 8080 | `npm run e2e -w @bbartolome/scriba-e2e -- specs/shell-a11y.e2e.ts --grep "criterion 1: nav"` | no serious or critical axe violation on the side nav (1280 by 800) and on the bottom nav (390 by 844), in light and dark |
| C1: landing | A2 `criterion 1: landing` | same | `--grep "criterion 1: landing"` | same, on `/` while its redirect is held |
| C1: notices | A3 `criterion 1: notices` | same | `--grep "criterion 1: notices"` | same, on the server-unreachable banner (A3a) and the device-class banner (A3b) |
| C1: editor | A4 `criterion 1: editor` | same | `--grep "criterion 1: editor"` | same, on the split view (1280 by 800) and the Edit/Preview toggle (390 by 844) |
| C1: diff | A5 `criterion 1: diff` | same | `--grep "criterion 1: diff"` | same, on the review diff (D-a) and the version-history diff (D-b) |
| C1: card | A6 `criterion 1: card` | same | `--grep "criterion 1: card"` | same, on a tool-call card in the chat |
| C2 (U22) | P1 `criterion 2: phone` (shell-phone) | Playwright e2e, 390 by 844 | `npm run e2e -w @bbartolome/scriba-e2e -- specs/shell-phone.e2e.ts` | the bottom nav shows Review as a reachable link; the review opens; Accept writes the proposed text to the file; no sideways scroll; no page error |
| C3 (U23) | the two SHL-17 tests `criterion 1: installable ...` and `criterion 2: excluded paths ...` in `pwa.e2e.ts` (existing) | Playwright e2e | `npm run e2e -w @bbartolome/scriba-e2e -- specs/pwa.e2e.ts --grep "criterion 1|criterion 2"` | both pass |
| extra (U17) | F1 `focus order: side nav` (shell-a11y) | Playwright e2e | `--grep "focus order"` | Tab visits the side nav's links in DOM order |
| extra (D7, D17) | C4 in `diff-view-editable.spec.ts` | Angular Vitest runner with jsdom (module default, M93) | `npm test -w @bbartolome/scriba-web` | passes: the read-only sides carry their labels, emit nothing and stay read-only |

Count: 8 new e2e tests (A1 to A6, F1, P1), 1 changed unit test (C4), 2 existing e2e tests reused for criterion 3. P2 is a ninth new e2e test only if OP-2 is decided yes.

Shared helpers, copied into each new spec (D15). The Playwright and config calls are the ones the existing specs use.

- `signIn(page)`: read `$SCRIBA_E2E_LIBRARY/.scriba/setup-url` and `page.goto` it (`review-phone.e2e.ts:53` to `:58`). Playwright gives each test a new context, so each test signs in.
- `seed(project)`: write `project.yaml` (`schemaVersion: 1`, a title, `genrePack: nonfiction`), `drafts/ch1.md`, `sources/outline.md`, and one pending change for `drafts/ch1.md` written by a copy of `pendingRecord` (`review-phone.e2e.ts:24` to `:45`) as `.scriba/pending/20261114T090000000Z-000001.json`. Write the drafts before the pending file (`review-phone.e2e.ts:60` to `:61`).
- `activate(page, project)`: go to `/projects`, click the row's Switch button, expect `/projects/<project>/chat` (`review-phone.e2e.ts:98` to `:113`).
- `setTheme(page, theme)`: `page.evaluate` sets `localStorage['scriba.theme']` on the current origin. The next `goto` applies it, because the service reads it at load (`theme.ts:8`, `:37` to `:62`).
- `scan(page, label, include?)`: `new AxeBuilder({ page })`, with `.include(include)` when given, then `.analyze()`. Keep the violations whose impact is `serious` or `critical`. `expect(blocking, label).toEqual([])`, each entry printed as id, impact and first targets. Other impacts are printed, not asserted.
- `expectReachable(locator)`: visible, enabled, scrolled into view, and `toBeInViewport({ ratio: 1 })` (`review-phone.e2e.ts:11` to `:16`).

Test details.

- **A1 nav.** Seed and activate `shell-a11y`. For each theme: `setTheme`, `goto('/projects/shell-a11y/chat')` at 1280 by 800, wait for the navigation named "Side navigation", `scan`. Then set 390 by 844, wait for the navigation named "Bottom navigation", `scan`.
- **A2 landing.** Sign in. `page.route('**/api/project-store/active')`: for a GET, hold it until the test ends (ASM-10); other methods continue. For each theme: `setTheme`, `goto('/')`, wait for text "Platform version:" inside `app-landing` (`landing.ts:18`), expect the URL to stay `/`, `scan`.
- **A3a server-unreachable.** For each theme: `setTheme`, `goto('/core-gate')`, abort `**/events` and `**/healthz`, wait for the status "Server unreachable" (ASM-1), `scan`. Remove both routes at the end of the test.
- **A3b device-class.** Seed and activate. For each theme: `setTheme`, `goto('/projects/shell-a11y/graphs/graph-a11y')` at 1280 by 800 (the canvas child route, `graph-runner.routes.ts:14` to `:20`), set 390 by 844, wait for the text "This view needs a larger screen" (ASM-2), `scan` with `include('app-notice-banners')` (D6). Do not click Dismiss.
- **A4 editor.** Seed and activate. For each theme: `setTheme`, `goto('/core-gate?projectId=shell-a11y&path=drafts%2Fch1.md')` at 1280 by 800, wait for the textbox "Markdown source for drafts/ch1.md", `scan`. Then set 390 by 844, wait for the group "Edit or preview", `scan`.
- **A5 diff.** Seed and activate. D-a, for each theme: `setTheme`, `goto('/projects/shell-a11y/review')`, click "Open" in the `drafts/ch1.md` row (row locator as `review-phone.e2e.ts:130` to `:133`), wait for the region "Changes to drafts/ch1.md", `scan`. Then, once, click "Accept" in that row (`review-phone.e2e.ts:150` to `:155`). D-b, for each theme: `setTheme`, `goto('/projects/shell-a11y/files?path=drafts%2Fch1.md')`, select the earlier version in the version history (ASM-4; the control names are read from `version-history.ts` at step 6), wait for the region "Changes to drafts/ch1.md", `scan`.
- **A6 card.** Seed (with `sources/outline.md`), sign in, activate. Once: `POST /api/providers` with the body of `journey.e2e.ts:216` to `:228`, except `label` `Shell a11y mock` and `baseURL` `${SCRIBA_E2E_MOCK_URL}/scenario/summarize-outline/v1`; then `POST /api/providers/project-model` with `{providerId, model: 'mock-model'}`. Both with the origin header `http://127.0.0.1:8080`. Expect 201 and 200. For each theme: `setTheme`, `goto('/projects/shell-a11y/chat')`, fill the textbox "Intent" with "summarize my outline", click "Send", wait up to 15 s for the article "Tool call: list_files" (`journey.e2e.ts:238` to `:244`), `scan`. For the second theme the card must still be there after the `goto` (ASM-9).
- **F1 focus (extra).** Light theme, 1280 by 800, on `/projects/shell-a11y/chat`. Press Tab up to 40 times until the first link of the "Side navigation" has focus. Then, for each next link (count from the locator), press Tab and expect that link to be focused. Source: U17.
- **P1 phone (criterion 2).** `test.use({ viewport: { width: 390, height: 844 } })`. Seed `shell-phone` (one pending change). Sign in, activate. Expect the navigation "Bottom navigation" to be visible. Expect its link "Review" to pass `expectReachable`. Click it, expect `/projects/shell-phone/review` and the heading "Review". Open the `drafts/ch1.md` row, `expectReachable` "Accept", click it. Expect `drafts/ch1.md` on disk to equal the proposed text, and `drafts/.versions/ch1.md` to hold the old text (`review-phone.e2e.ts:157` to `:170`). Expect `document.documentElement.scrollWidth <= window.innerWidth` and no `pageerror` (`review-phone.e2e.ts:190` to `:194`). `afterAll` removes the project directory (D15).
- **P2 typing (only if OP-2 is decided yes).** At 390 by 844, on `shell-phone`, open `/core-gate?projectId=shell-phone&path=drafts%2Fch2.md` (a second draft), click "Edit", click into the textbox "Markdown source for drafts/ch2.md", type with `page.keyboard.type`, wait for the status "saved", and expect the file on disk to equal the typed text.
- **U1 unit C4.** In `diff-view-editable.spec.ts`, C4 renders each layout of the `describe.each(LAYOUTS)` loop (line 138), with the same base and proposed texts as the spec's C3 (`:177`). Expect: in the split layout, the base `.cm-content` has `aria-label` "Base text for notes/chapter.md"; in both layouts, the proposed `.cm-content` has "Proposed text for notes/chapter.md"; the sides keep `contenteditable="false"`; `host.edited()` stays `null`. In the unified layout there is no base content element, so only the proposed one is checked.

## 5. Downstream and parallel agreement

Upstream, all `done` on main (section 7):

- **SHL-12** (`plans/SHL-12.md:249` and `:267`): its plan leaves the contrast check and the axe check of the diff to SHL-19, and gives its labels only in part. Its read-only API is kept (D7 adds only a label). Its tests assert the `Changes to ...` labels (`diff-view.spec.ts:443`, `:452`), not the absence of content labels, so D7 does not break them.
- **SHL-16** (`plans/SHL-16.md:12`, `:16`, `:101`): its plan defers the read-only labels to SHL-19. D7 is that change. The unit's own line "Read-only mode is unchanged" (`units/SHL-16-editable-merge-view.md:23`) is about SHL-16's work; this unit's criterion 1 requires the label. The SHL-16 test that asserted no label is D17.
- **SHL-14** (`plans/SHL-14.md:194`, `:204`): the axe check of the editor finds the status and alert regions and the button "Save". The unsaved-changes prompt is `window.confirm` (OP-3).
- **SHL-15** (`plans/SHL-15.md:116`): the named controls (group "Edit or preview", regions "Source" and "Preview") exist; A4 uses them. No change expected.
- **SHL-13** (`plans/SHL-13.md:163`; `DEC 2026-11-14`, SHL-13 open point 7 at line 3630): the byte round trip is SHL-13's test. The keyboard-path claim in that decision is OP-2.
- **SHL-10** (`plans/SHL-10.md:224`, `:241`): the card is covered by A6; its layout claim is OP-6.
- **SHL-11**: the preview is inside the editor and card states (A4, A6). No change expected.
- **SHL-17** (`plans/SHL-17.md` section 6, lines 225 to 231): criterion 3 is its tests 1 and 2; the banner it posts is in the same banner component (A3). No change to `pwa.e2e.ts` or `ngsw-config.json`.
- **SHL-18** (`plans/SHL-18.md:51`, `:141`): its focus choice (P4) is checked by F1; its skeletons and empty states are checked by A1, A3 and A6. No change expected.
- **SHL-23** (`plans/SHL-23.md:76`, `:213`; `e2e/specs/nav-phone.e2e.ts`): the ten bottom-nav items fit at 390 by 844. P1 relies on that, and this plan does not change `app-nav.ts` except under D19.
- **SHL-05** (`plans/SHL-05.md:261` and `:283`): the phone Review step must open a project first. P1 does (step "activate").
- **PST-20** (`review-phone.e2e.ts`): unchanged; overlaps P1 (D8).
- **PST-34** (`plans/PST-34.md:72`, F25): the Files editor is not scanned (D13); the version history of A5 is reached through the Files page (ASM-4).
- **PST-22** (`units/PST-22-review-gate.md:9` lists SHL-19 in `unblocks`): consistent with SHL-19's `blocked_by` (U7).

Downstream: none. `unblocks: []` is the inverse of the repository's `blocked_by` entries (D1).

Plans not `done` that name Shell files (checked on `main`, `git show main:plans/<ID>.md`):

- **GRR-15** (planned): adds `e2e/specs/graph-large|theme|touch.e2e.ts` and changes `apps/web/src/app/features/graph-runner/*`. No file in section 2 and no spec name in common. The canvas is outside the Shell's scope (M100).
- **CEX-20** (draft): its plan says it changes neither `e2e/package.json` nor `package-lock.json` (its line 45). SHL-19 changes both. No content conflict; whichever merges second runs `npm install` to regenerate the lock.
- **AGL-22, AGL-24** (planned), **GNP-15** (planned): their file tables name no file in section 2. AGL-24 reads `tool-call-card.ts` lines 186 to 200 (its line 182) and changes none of them.

## 6. Open points

Each is for the orchestrator. The plan does not decide them.

- **OP-1. Manual demo legs.** Must demo steps 1, 3 and 5 (the iPad install and launch, the Mac's `git diff`, the airplane-mode check on the phone) and the iPad install check (`plans/SHL-17.md:204`, item 12) be done before the merge that closes `phase:polish`, or may the report list them as not run? Until decided, the report lists them as not run (step 15).
- **OP-2. Keyboard typing on the phone.** `DEC 2026-11-14` (SHL-13 open point 7, line 3630) says the real keyboard path "is checked by hand in step 10 and by SHL-19's e2e phone check". Criterion 2 (U22) names only the bottom nav and the review. Option (a): add P2 (typing into the editor at 390 by 844, then the file on disk). Option (b): no typing test, and that decision's claim stays unsupported by the unit. P2 is written only under (a).
- **OP-3. The unsaved-changes prompt.** `plans/SHL-14.md:204` (open point 5) asks whether this pass should replace `window.confirm` with an in-app dialog. Axe does not inspect native dialogs. The plan keeps `window.confirm` unless decided otherwise.
- **OP-4. `blocked_by` omits PST-34.** Demo step 2 (U29, "the split view appears") needs the Files editor (`plans/SHL-15.md:133`; `plans/PST-34.md:72`, F25). PST-34 is `done` on main, so the gate is met. Should `units/SHL-19-polish-gate.md` name PST-34 in `blocked_by`? This plan does not change the unit file.
- **OP-5. Violations in feature-owned files.** If a baseline serious or critical finding lies in `apps/web/src/app/features/**` (for example the chat page or the review page), may SHL-19 change that module's file, or must it stop? Until decided, step 8 stops and reports. The expected landmark finding at `chat-page.ts:264` falls in the same class if it is not moderate.
- **OP-6. Card and touch layout.** `plans/SHL-10.md:241` names SHL-19 as owner of the card's layout checks (44 px target, one-line ellipsis, long-path wrapping). Criterion 2 does not name them. This plan adds no card layout test. Should P1, or a new test, check them?

## 7. Facts checked and assumptions

Checked on `main` at 3d66dc3 (`path:n` is a line; the other items are checks of status or of files):

- Unit `units/SHL-19-polish-gate.md`: front matter lines 1 to 10 (`blocked_by` line 7 names SHL-10 to SHL-18 and PST-22; `unblocks` line 9 is empty); "Merging this closes Frontend shell `phase:polish`" line 14; scope lines 17 and 18; criteria lines 21 to 23; M7 done-when line 25; demo lines 28 to 32.
- Module `modules/shell.md`: lines 9 (consumers adopt components), 11 (the polish gate waits for the editor phase), 36 (SHL-19 row), 48 (feature UIs are owned by modules), 93 (Vitest seam), 95 (Playwright seam), 100 (the canvas is the Graph runner's), 109 (breakpoints).
- Conventions `units/README.md`: lines 57 (the heading parenthetical), 62 to 64 (blocker notation), 69 (phase gates), 83 (`phase:polish` row), 133 (testing conventions).
- Statuses (line 3 of each plan on main, or the front matter where line 3 is the title): SHL-10 to SHL-18, SHL-20 to SHL-23 and PST-22 are `done`; `plans/SHL-19.md` does not exist.
- Grep over `units/`: no `blocked_by` names SHL-19.
- Shell code: `apps/web/src/app/app.html:3` (toolbar with the connection status and theme toggle), `:5` (notice banners), `:8` (`<main class="content">`); `apps/web/src/app/shell/app-nav.ts:30` to `:34` (form labels), `:184` (`aria-label` on the nav), `:186` to `:195` (items), `:197` to `:199` (empty text), `:200` (the project slot); `editor-layout.ts:28` to `:33` (the toggle group), `:49` and `:59` (the Source and Preview sections); `markdown-editor.ts:96` and `:98` (status and alert), `:370` to `:372` (content label); `diff-view.ts:91` to `:103` (read-only branch), `:106` to `:108` (editable label), `:194`, `:214`, `:217` (call sites), `:234` (the section label); `landing.ts:18` (selector), `:44` to `:79` (load and redirect); `notice-banners.ts:21` (`role="status"`), `:27` to `:29` (Dismiss); `connection-status.ts:43` to `:50`; `device-class.ts:47` to `:48`, `:86` to `:92`; `pwa-update.ts:30`; `skeleton.ts:50` (`role="status"`); `tool-call-card.ts:162` (article label), `:166` (`aria-expanded`); `theme.ts:8`, `:37` to `:62`; `core-gate/core-gate.ts:16` to `:18`, `:23` to `:28`.
- Route table: nav entries in `apps/web/src/app/app.routes.ts` (Chat `:18`, Files `:31`, Review `:44`, Graphs `:56`, Manuscript `:69`, Tools `:159`, Providers `:172`, Core gate `:108`, Settings `:133`, Projects `:146`); the canvas child `graph-runner.routes.ts:14` to `:20` (`canMatch` tablet).
- Feature files (read, not changed): `files-page.ts:245` (editor layout), `:261` (version history); `version-history.ts:135` (read-only diff); `review-page.ts:252` (`[editable]="true"`); `chat-page.ts:264` (`<main class="chat">`), `:368` to `:376` (tool cards).
- Providers: `providers.service.ts:95` to `:101`; `routes.ts:13`; `model.ts:5` to `:8`; the controller's project-model POST at `providers.controller.ts:83` to `:89`.
- Material icons: `node_modules/@angular/material/fesm2022/icon.mjs:98` to `:100` set `aria-hidden="true"` unless the host sets it, so icon ligatures are hidden from assistive technology.
- e2e: `e2e/playwright.config.ts:13` (`workers: 1`), `:20` (`baseURL`), `:22` to `:23` (`serviceWorkers: 'block'`), `:24` to `:26` (`SCRIBA_E2E_CHROMIUM`); `e2e/harness/global-setup.ts:20` (port check) and `:60` to `:72` (builds); `e2e/package.json` (`@playwright/test` 1.65.0); `.github/workflows/ci.yml:49` runs `npm run e2e`.
- Specs: `review-phone.e2e.ts` lines 11 to 16, 24 to 45, 47 to 195, with the Switch at 103 to 113, the Review link at 115 to 124, Open and Accept at 136 to 156; `nav-phone.e2e.ts:26` (`afterAll`), `:34` (`openProject`); `shell-polish.e2e.ts:15` to `:47` (`openEditor`), `:41` to `:44` (core-gate mount); `journey.e2e.ts:209` to `:228` (provider), `:238` to `:244` (run and card); `providers-phone.e2e.ts:35` to `:41` (app default restored), `:43` (origin header); `pwa.e2e.ts:35` (`test.use` allow), `:190` and `:348` (criteria 1 and 2), `:461` (criterion 3 of SHL-17), `:539` (offline).
- Existing unit tests: `diff-view-editable.spec.ts:177` (C3), `:193` to `:194` (proposed label), `:200` to `:218` (C4), `:216` (no-label assertion); `diff-view.spec.ts:443` and `:452` (`Changes to` labels).
- Other plans read: `plans/SHL-17.md:43`, `:209`, `:225` to `:231`, `:236`, `:243`; `plans/SHL-16.md:12`, `:16`, `:101`; `plans/SHL-12.md:249`, `:267`; `plans/SHL-14.md:194`, `:204`; `plans/SHL-15.md:116`, `:133`; `plans/SHL-10.md:224`, `:241`; `plans/SHL-13.md:163`; `plans/SHL-18.md:51`, `:141`; `plans/SHL-23.md:76`, `:213`; `plans/SHL-05.md:261`, `:283`; `plans/PST-34.md:72`.
- `plans/DECISIONS.md`: line 3322 (SHL-12 review, item 2), line 3630 (SHL-13 open point 7), line 6801 (the 2026-11-19 Navigator decision on the phone nav, which says SHL-19's phone check will cover the new nav).
- Registry (read-only, at planning): `@axe-core/playwright` 4.14.0; peer `playwright-core >= 1.0.0`; dependency `axe-core ~4.14.0`; `axe-core` latest 4.14.1.

Assumptions (each is checked by the step named, and a failed check stops the run for a reviser):

- **ASM-1.** Aborting `**/events` and `**/healthz` makes the SSE client's probe fail and posts the server-unreachable banner (`sse-client.ts:159`, `:163` to `:167`; `connection-status.ts:43` to `:50`). Checked at step 6. If not, a different trigger is needed and the plan is revised.
- **ASM-2.** The device-class banner appears when a tablet-gated route is open and the viewport becomes phone-sized, even with no graph file (`graph-runner.routes.ts:14` to `:20`; `device-class.ts:86` to `:92`). Checked at step 6.
- **ASM-3.** The setup is complete on the shared server when the landing test runs; otherwise `landing.ts:59` redirects to `/setup`. `review-phone.e2e.ts` and `nav-phone.e2e.ts` make the same assumption.
- **ASM-4.** After one accept, the draft's version history is reached from the Files page (`files-page.ts:261`; `version-history.ts:135`). The control names are read from the template at step 6.
- **ASM-5.** The `summarize-outline` mock scenario produces the `list_files` and `read_file` tool calls and the article names of `journey.e2e.ts:238` to `:244`. Not run here; step 14 checks it.
- **ASM-6.** axe's impact names are `minor`, `moderate`, `serious` and `critical`, and its default rules include `color-contrast`. Checked at step 3.
- **ASM-7.** `@axe-core/playwright` 4.14.x works with `@playwright/test` 1.65.0. Checked at steps 3 and 4.
- **ASM-8.** Chromium is available: Playwright's cached build locally, or `SCRIBA_E2E_CHROMIUM` (`playwright.config.ts:24` to `:26`).
- **ASM-9.** The chat transcript is kept on the server, so the card is still shown after the second theme's `goto` (A6). If not, the second theme sends the intent again.
- **ASM-10.** A GET held by `page.route` stays pending until the test ends without breaking the landing page (A2).
