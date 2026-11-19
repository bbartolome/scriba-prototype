---
id: GRR-15
status: draft
---
# GRR-15 plan — touch checks, theme tokens on the canvas, large-graph measurement

Unit: `units/GRR-15-touch-styling-perf.md` (module graph-runner, phase:canvas, M4). Base: main `3f16c03`, working tree clean. Revision 1, by the planner (draft stage). This plan changes no code, unit file or module file. Its blockers GRR-11, GRR-12, GRR-13 and GRR-14 are done and on main (checked: their plans are `status: done`, and their entries in `plans/DECISIONS.md` record the merges at lines 5971, 6083, 6111 and 6204).

## 1. Decisions this plan follows

- **Touch criteria.** A wire is connected, a node is moved and an entity chip is dropped by touch, in Playwright touch emulation at a tablet viewport: 1024 by 768 with `hasTouch: true`. Source: unit line 20; the same viewport and touch setting as `e2e/specs/touch-editor.e2e.ts` (its `test.use`, line 8).
- **The viewport is the tablet class.** 1024 by 768 in landscape is the CDK `Tablet` class (`node_modules/@angular/cdk/fesm2022/layout.mjs`, lines 49 to 51), so the canvas route, which is gated by `deviceClassGuard('tablet')` (`graph-runner.routes.ts`), opens. Checked.
- **Pan and zoom by touch.** The Decision names pan and zoom (unit line 15); the criteria name connect, move and drop only. Pan on the empty background is checked as test T4. Pinch zoom is not checked (open point 1).
- **Touch drag input.** Playwright's `page.touchscreen` only taps. A touch drag is a sequence of `Input.dispatchTouchEvent` calls through a CDP session, which works in Chromium only. Source: `plans/DECISIONS.md` lines 4830 and 4832 (SHL-15: `touchscreen.tap` sends only touchStart and touchEnd); `plans/SHL-15.md` F19 and F20 (`newCDPSession`, `Input.dispatchTouchEvent`).
- **Chips are pointer-event drags for mouse and touch.** Chips are CDK `cdkDrag` items. Source: `plans/DECISIONS.md` line 4224 (TRG-04 O7); `plans/GRR-12.md` D2 and D19 (line 112). The real-gesture check of this mechanism is this unit's (`plans/DECISIONS.md` line 4245).
- **Drop rules do not change.** A refused drop shows its reason, an accepted drop pins the chip, and only `onChipDrop` decides. Source: `plans/GRR-12.md` C-4 (line 119).
- **No reflow while dragging.** A refusal reason is written only on drop (`plans/GRR-12.md` D14, line 107). Source of the reason: `plans/DECISIONS.md` line 4331 (TRG-05 observation, which names GRR-15). This plan adds no drag-state style that changes a box size; the rule `:host ::ng-deep .port-row .cdk-drag-placeholder { display: none; }` (`canvas-page.ts` line 779) stays.
- **Touch move runs while idle.** Nodes cannot be moved while a run is active (`plans/GRR-13.md` line 217, C-11). T2 therefore runs with no run.
- **Theme tokens.** The Shell's theme tokens are the Material 3 system variables `--mat-sys-*`, set by `mat.theme` in `apps/web/src/material-theme.scss` (line 13), and `html[data-theme]` set by `ThemeService` (`apps/web/src/app/shell/theme.ts`, lines 57 and 59). Source: unit line 16; `plans/SHL-04.md` line 12 (the `--mat-sys-` prefix) and line 178 (the visual check is GRR-15's). Twelve other feature and shell files already use these variables (grep, section 2).
- **What "nodes, chips, dialogs and badges" covers.** Canvas nodes and their issue state (`.vnode`, `.vnode.issue`, `circle.issue`); port glyphs (`.port-glyph.port-text`, `.port-entity`, `.port-style`, whose colours are GRR-15's: `plans/GRR-11.md` lines 39 and 120); chips (`.chip`, in the entity side list and on the ports); the story panel border (`.story-panel`); the status badges (`.badge[data-status]`); the path-missing badge (`[data-badge]`); and the inline run dialog (`section[data-run-dialog]`). The dialog is an inline section, not a Material dialog, and GRR-15's "dialogs" styling covers it with tokens (`plans/GRR-13.md` line 217). Source: unit line 16; `plans/GRR-14.md` line 182.
- **Tokens in CSS, not Material components.** Colours come from `var(--mat-sys-*)` in the existing `styles` blocks. No element is replaced by a Material component, so the DOM, the hooks and the routes stay. Source: the simplest option (this plan); unit line 16 says "using the Shell's theme tokens".
- **Colour only, no size change.** Only colours, border colours, backgrounds and, for the dialog alone, padding and radius change. Node and port sizes stay, so the arrange constants hold (`plans/GRR-14.md` C-14, line 124; GRR-15 may change them, and this plan does not).
- **Hooks and class names stay.** Every hook named in `plans/GRR-13.md` line 217, `plans/GRR-14.md` line 182 and `plans/GRR-12.md` line 201 stays, and so does the class `.issue`, which `canvas-page.spec.ts` checks (lines 539 and 544). GRR-17's demo and e2e depend on the same hooks (section 6).
- **Large graphs.** One measurement, on desktop, of a generated 150-node recipe: its opening and a pan are measured, and the result is recorded. Source: unit lines 17 and 22; `modules/graph-runner.md` line 54 (one recorded large-graph measurement). "Blocking" is read as the Long Tasks API: the threshold is that no long task lasts longer than 200 ms (this plan's reading; open point 4 covers a failure).
- **External behaviour only.** Checks read the rendered page, the computed styles, the saved file and the browser's performance entries. Source: `modules/graph-runner.md` line 49. The DOM test environment has no layout (`modules/graph-runner.md` line 53), so the three criteria are Playwright tests. No Vitest test covers them; jsdom does not resolve CSS variables.
- **Spec layout.** Three new spec files, one per criterion, named `e2e/specs/graph-<concern>.e2e.ts`. Each seeds its own library project and activates it, so the order of the specs does not matter. Helpers are copies in each file, not imports, as `graph-chips.e2e.ts` and `graph-wires.e2e.ts` do. Source: the header comments of `graph-chips.e2e.ts` and `graph-canvas.e2e.ts` (line 9 has its `test.use`); `plans/DECISIONS.md` lines 4846 to 4850 (the shared harness library).
- **Manual checks.** The real-iPad Safari check belongs to GRR-17 (`units/GRR-17-canvas-gate.md`, Scope), not to this unit. The visual check of criterion 2 is recorded in the PR (unit line 21). Source: `modules/graph-runner.md` line 54.
- **Bundle budget.** Warning at 500 kB, error at 1 MB (`apps/web/angular.json`, lines 32 to 37). This unit adds no dependency. The current warning is pre-existing (`plans/DECISIONS.md` line 6225).

## 2. Facts checked and facts assumed

### 2.1 Checked

- `units/GRR-15-touch-styling-perf.md`: front matter lines 7 to 9 (`blocked_by` GRR-11, GRR-12, GRR-13, GRR-14; `parallel_with` GRR-16; `unblocks` GRR-17); Decisions lines 15 to 17; criteria lines 20 to 22. It has no notes section (`grep -i note` finds nothing), and its only commit is `2fed3f4` (`git log --all -- units/GRR-15-touch-styling-perf.md`). No GRR-15 change entry is in `plans/DECISIONS.md` (grep for `GRR-15` gives lines 4223, 4224, 4226, 4245 and 4331 only, none a unit change).
- `modules/graph-runner.md`: lines 26 (sequence), 42 (validation in one place), 45 (design choices, six node statuses), 49 (external behaviour), 53 (gesture checks, desktop and touch-emulated), 54 (manual iPad and one large-graph measurement), 55 (prior art), 70 (risks carried into canvas).
- `units/README.md`: blocker notation (line 64: `unblocks` is the exact inverse of `blocked_by`); phase table (line 119). Grep over `units/` for GRR-15: it appears in the `unblocks` of GRR-11, GRR-12, GRR-13 and GRR-14 (line 9 of each), and in the `blocked_by` of GRR-17 (line 7) only. Its own `blocked_by` (line 7) and `unblocks` (line 9) match those.
- `plans/PLT-02.md`: headings and sections 1 to 6 (the format followed here).
- Draft and planned plans: `grep -l -E '^status: (draft|planned)' plans/*.md` printed nothing. Every GRR, TRG, SHL, GNP, CEX and SAU plan is `status: done` (grep of `^status:`).
- `plans/DECISIONS.md`: searched by grep for GRR-11 to GRR-17 and for touch, CDP and `touchscreen`; read lines 4220 to 4245, 4326 to 4332, 4823 to 4832, 4846 to 4850 and 6223 to 6227.
- Plan notes left for GRR-15 by done plans: `plans/GRR-11.md` lines 39 and 120; `plans/GRR-12.md` lines 107, 112, 119, 201 and 219; `plans/GRR-13.md` line 217; `plans/GRR-14.md` lines 124 and 182; `plans/SHL-04.md` lines 12 and 178; `plans/TRG-04.md` line 132; `plans/QUEUE.md` line 7 (grep and read).
- Unit files of the blockers and of the downstream unit, read in full: `units/GRR-10`, `GRR-11`, `GRR-12`, `GRR-13`, `GRR-14`, `GRR-16`, `GRR-17`.
- Later units that name the canvas or the graph runner (grep over `units/`): `units/GNP-19-fiction-gate.md` line 7 (blocked by GRR-17, not GRR-15); `units/GNP-24-remaining-shapes-gate.md` line 20 (a canvas node). No later unit names GRR-15 except through GRR-17. `units/SHL-17` to `SHL-19` were not read; no `blocked_by` names GRR-15 (grep).
- Module code, `apps/web/src/app/features/graph-runner/`: `ls`; grep for `styles`, hard-coded colours (`crimson`, `Canvas`, `currentColor`, hex values) and `@Component`. Three components have templates: `canvas-page.ts`, `graph-list-page.ts` (line 53) and `run-dialog.ts` (line 64). Only `canvas-page.ts` has a `styles` block (lines 707 to 782); `run-dialog.ts` has none. `entity-chips.ts` and `tool-nodes.ts` are plain modules. `canvas-page.ts` read at lines 1 to 300 (imports, helpers), 300 to 720 (template and hooks: `data-badge="path-missing"` line 588, `.badge` status line 577, `port-glyph` classes lines 628 and 629), 707 to 782 (styles), 890 to 935 and 955 to 985 (computed signals: `editable`, `issueNodes` at 940, `runBlocked`, `connection`), 1068 to 1100 (`onConnect`, `onMove`), 1340 to 1430 (`isChipTarget`, `onChipDrop`, `dropReason`).
- The styles block of `canvas-page.ts` (lines 707 to 782): `.vnode` (715) with `border: 1px solid currentColor` and `background: Canvas`; `.vnode.issue` (722) with `crimson`; `circle.issue` (735) with `stroke: crimson`; `.story-panel` (739) with `currentColor`; `[data-badge]` (743) with `crimson` in `border` and `color`; `.chip` (750) with `currentColor`; `.drop-reason` (773) with `min-height: 1.4em`; the placeholder rule (779). No rule for `.port-glyph`, `.badge` or `.port-*` exists.
- `apps/web/src/app/features/graph-runner/run-dialog.ts`: `@Component` at line 60; template at line 64; `section role="dialog" data-run-dialog` at line 65; no `styles` (grep).
- `apps/web/src/app/features/graph-runner/canvas-page.spec.ts`: `.issue` checks at lines 539 and 544; `.drop-reason` minimum height 22.4 px at lines 1399 to 1401; the placeholder `display: none` checks at lines 1409 to 1417.
- Node statuses: `packages/contracts/src/graph-runner/constants.ts` lines 60 to 67 (`idle`, `queued`, `running`, `done`, `error`, `stopped`). Port types: `packages/contracts/src/tool-registry/constants.ts` line 26 (`text`, `entity`, `style`).
- Shell: `apps/web/src/material-theme.scss` (line 13 `mat.theme`; `html[data-theme]` rules at lines 25 to 30); `apps/web/src/app/shell/theme.ts` (lines 57 and 59); `apps/web/src/app/shell/theme-toggle.ts` (line 17 `aria-label="Theme"`, lines 21 to 23 the System, Light and Dark toggles); `apps/web/src/app/shell/device-class.ts` (the CDK breakpoints and `deviceClassGuard`).
- Token use in the repo (grep over `apps/web/src`): `--mat-sys-*` appears in 12 files besides `material-theme.scss`. The names used so far are `surface`, `surface-container`, `surface-container-low`, `on-surface`, `on-surface-variant`, `outline`, `outline-variant`, `error`, `error-container`, `on-error-container`, `secondary-container`, `on-secondary-container`, `tertiary-container`, `on-tertiary-container`. `tool-form.ts` imports Material components (4 matches of `@angular/material`), and the node-body form is the Tool registry's.
- Shared e2e helpers and config, read in full or in part: `e2e/playwright.config.ts` (`workers: 1`, `testMatch` `**/*.e2e.ts`, `baseURL` `127.0.0.1:8080`); `e2e/harness/global-setup.ts` (its `buildWorkspaces` builds contracts, api and web before the run); `e2e/package.json` (`@playwright/test` 1.65.0); `e2e/specs/graph-canvas.e2e.ts` (`test.use` line 9; the helpers `openCanvas`, `centreOf`, `hitsAtCentre`, `drag`, `saveAndStatus`; the position and wire tests); `e2e/specs/graph-chips.e2e.ts` (`openCanvas` with the `anna`, `claim-1` and `house-style` entities; `dragChip` with `twoFrames`; the final test asserting `params: { person: 'anna' }`); `e2e/specs/touch-editor.e2e.ts` (`test.use` line 8 with `hasTouch`; `page.touchscreen.tap`; the X2 test reading the `radiogroup` named `Theme`).
- `e2e/test-results/` is git-ignored (`.gitignore` line 8).
- Tool: `packages/packs/nonfiction/tools/cold_open.yaml` exists. Its ports `person`, `coreIdea` and `entityIds` are as `graph-chips.e2e.ts` uses them (the file itself was not read here, except the lines GRR-11 cites).
- CDK 22.2.7 (`node_modules/@angular/cdk`): `fesm2022/layout.mjs` lines 49 to 57 (breakpoints); `fesm2022/drag-drop.mjs` line 203 (`touch-action` is `none` only while a drag is disabled), line 236 (`passive: false`), line 310 (document `touchmove` listener), line 719 (`touchstart` listener, passive).
- ngx-vflow 2.7.0 (the version pinned in `apps/web/package.json` line 33), read from `/Users/bbartolome/workspace/scriba-prototype-wt/GRR-11/node_modules/ngx-vflow/fesm2022/ngx-vflow.mjs` (read only). Lines: 549 to 575 (`allowRootZoomForNodeTarget`: root zoom ignores touchstart inside a `.vflow-node`, except undraggable nodes and the drag-handle case); 645 to 651 (the d3-zoom behaviour and its filter); 834 to 841 (node drag filter); 2384 to 2430 (host `mousedown` and `touchstart`, `touchmove` with `preventDefault` at 2404, `touchend` at 2413); 3080 to 3086 (handle `onPointerStart`, touch sets the initial touch); 1487 (`magnetRadius` 20); 3171 to 3178 (edge colours `#b1b1b7` and selected `#0f4c75`); 3275 to 3282 and 3890 to 3909 (hard-coded `#fff`, `#000`, `#1b262c`; the selector of 3275 was not checked).
- `node_modules` of this working tree: `@angular/*` is present, `ngx-vflow` is not (`ls node_modules | grep -i vflow` is empty). The implementation must run `npm ci` in its own worktree first.
- `apps/web/angular.json`: budgets lines 32 to 37 (warning 500 kB, error 1 MB); `defaultConfiguration` production at line 58 (the build target, read as such).
- Git: HEAD `3f16c03` on main; `git status --short` empty. The unit branches `unit/CEX-03`, `unit/CEX-04`, `unit/GRR-11`, `unit/GRR-13` and `unit/TRG-14`, and the detached worktree `live` (`71c1e46`), have no diff under `apps/web/src/app/features/graph-runner` or `e2e/specs` against main. The backups `unit/SAU-11-old-backup`, `unit/SAU-11-pre-linear` and `unit/TRG-05-reviewed-93aaecf` change `e2e/specs/journey.e2e.ts`, `setup-phone.e2e.ts` and `tools-preview.e2e.ts` only.

### 2.2 Facts assumed (not run in this planning session)

- A1. Chromium (Playwright 1.65) turns CDP `Input.dispatchTouchEvent` touch sequences into real touch input for CDK drag and for ngx-vflow handles and nodes. The repo has no touch drag yet (SHL-15 used taps only). Test T1 to T3 check it.
- A2. `page.context().newCDPSession(page)` and `Input.dispatchTouchEvent` exist with those names in 1.65.0 (checked in `plans/SHL-15.md` F19 against the package types; not re-checked here).
- A3. d3-zoom on the ngx-vflow root svg takes a touch pan on the background, and no page scroll interferes. Read from source (section 2.1), not run. T4 checks it.
- A4. `PerformanceObserver` with `type: 'longtask'` reports entries in headless Chromium.
- A5. Whether 150 `cold_open` tool nodes render within 200 ms is unknown. The measurement decides (open point 4).
- A6. The following `--mat-sys-*` names exist in Material 22.2.7: `primary-container`, `on-primary-container`, `surface-variant`, `on-surface-variant`, `surface-container-high`, `surface-container-highest`, `on-tertiary-container` (the last is used in the repo). Step 8 checks each one by grep of `node_modules/@angular/material/core/tokens/m3/_md-sys-color.scss` (the file SHL-04 checked).
- A7. The Shell's theme radio group is visible at the desktop viewport 1280 by 800 (the X2 test uses it at 1024 by 768).
- A8. The ngx-vflow in a fresh `npm ci` is the same 2.7.0 file that was read in the GRR-11 worktree.
- A9. Whether the library's wrapper and edge colours (section 2.1) clash in dark mode is unknown. The screenshot pass decides (open point 7).
- A10. No shipped tool has a non-port entity or style input, so no `EntityPicker` joins the node body (stated in `plans/GRR-12.md` C-4 and section 2 of that plan; not re-checked).

## 3. Files to change

| Path | Change | Purpose |
|---|---|---|
| `apps/web/src/app/features/graph-runner/canvas-page.ts` | edit the `styles` block (lines 707 to 782) only | Replace `currentColor`, `Canvas` and `crimson` with tokens (table 3.1); add the port-glyph, status-badge and chip rules. No template change, no size change |
| `apps/web/src/app/features/graph-runner/run-dialog.ts` | add a `styles` property to the `@Component` (decorator at line 60) | Tokens for `section[data-run-dialog]` and `[data-run-error]` |
| `e2e/specs/graph-theme.e2e.ts` | new | Criterion 2: tests T5 and T6 |
| `e2e/specs/graph-touch.e2e.ts` | new | Criterion 1: tests T1 to T3; decision check T4 |
| `e2e/specs/graph-large.e2e.ts` | new | Criterion 3: test T7 |
| `plans/GRR-15.md` | this plan | none |

Not changed: the unit file, the module file, the template of `canvas-page.ts`, `ngx-vflow`, `package.json`, `angular.json`, `material-theme.scss`, the contracts and the API. A graph-runner file other than the two above changes only if T1 to T4 fail and the smallest fix is in graph-runner (step 6, Part B).

### 3.1 Token table

Each element gets the token of its role. The `border: 1px solid` widths stay.

| Element (selector) | Property | Token |
|---|---|---|
| `.vnode` | background | `var(--mat-sys-surface-container)` |
| `.vnode` | color | `var(--mat-sys-on-surface)` |
| `.vnode` | border-color | `var(--mat-sys-outline)` |
| `.vnode.issue` | border-color | `var(--mat-sys-error)` |
| `circle.issue` | stroke | `var(--mat-sys-error)` |
| `.story-panel` | border-top-color | `var(--mat-sys-outline-variant)` |
| `.chip` | background, color, border-color | `var(--mat-sys-secondary-container)`, `var(--mat-sys-on-secondary-container)`, `var(--mat-sys-outline-variant)` |
| `.port-glyph.port-text` | color | `var(--mat-sys-primary)` |
| `.port-glyph.port-entity` | color | `var(--mat-sys-tertiary)` |
| `.port-glyph.port-style` | color | `var(--mat-sys-secondary)` |
| `[data-badge]` | background, color, border-color | `var(--mat-sys-error-container)`, `var(--mat-sys-on-error-container)`, `var(--mat-sys-error)` |
| `.badge[data-status='idle']` | background, color | `var(--mat-sys-surface-variant)`, `var(--mat-sys-on-surface-variant)` |
| `.badge[data-status='queued']` | background, color | `var(--mat-sys-secondary-container)`, `var(--mat-sys-on-secondary-container)` |
| `.badge[data-status='running']` | background, color | `var(--mat-sys-tertiary-container)`, `var(--mat-sys-on-tertiary-container)` |
| `.badge[data-status='done']` | background, color | `var(--mat-sys-primary-container)`, `var(--mat-sys-on-primary-container)` |
| `.badge[data-status='error']` | background, color | `var(--mat-sys-error-container)`, `var(--mat-sys-on-error-container)` |
| `.badge[data-status='stopped']` | background, color | `var(--mat-sys-surface-container-highest)`, `var(--mat-sys-on-surface)` |
| `section[data-run-dialog]` (in `run-dialog.ts`) | background, color, border | `var(--mat-sys-surface-container-high)`, `var(--mat-sys-on-surface)`, `1px solid var(--mat-sys-outline-variant)`; plus `padding: 12px` and `border-radius: 12px` |
| `[data-run-error]` (in `run-dialog.ts`) | color | `var(--mat-sys-error)` |

The `.drop-reason` rule, the `.port-row` rule, the placeholder rule and the `.entities` width are not changed.

## 4. Method (ordered procedure)

Run from the implementation worktree on branch `unit/GRR-15`, created from main, as the other units do. Record `node -v` and `npm -v` beside each result (Node 26 is required, as in `plans/PLT-02.md`). Do not push. The steps are grouped into the review parts of section 9.

1. (Part D) Runtime and install. `node -v` prints `v26.x`. `npm ci` at the root. Expected: exit 0. ngx-vflow is missing from the main checkout's `node_modules` (section 2.1), so `npm ci` is needed before anything else.
2. (Part D) Baseline build. `npm run build`. Expected: exit 0, and the bundle warning for the initial bundle (about 589 kB, pre-existing) is the only warning.
3. (Part D) Baseline feature tests. `npm test -w @bbartolome/scriba-web -- --include 'src/app/features/graph-runner/**/*.spec.ts'` (the form the GRR-12 and GRR-13 plans used). Expected: all pass. If the run times out under load, rerun when the machine is quiet and record both runs.
4. (Part D) Baseline graph e2e. `npm run e2e -w @bbartolome/scriba-e2e -- graph-canvas graph-wires graph-chips`. Expected: all pass. The global setup builds the workspaces first.
5. (Part A) Write `e2e/specs/graph-theme.e2e.ts` (tests T5 and T6, section 5) before any style change. Expected on the baseline: the assertions fail, because the colours are `Canvas` and `crimson` and do not match the tokens. Record the failure.
6. (Part B) Write `e2e/specs/graph-touch.e2e.ts` (tests T1 to T4, section 5) with the CDP helper below, and run it on the baseline. Record which tests pass.
   - If T1 to T3 pass unchanged, no code change is needed for touch. Record that.
   - If one fails, first check the target with `hitsWithin` (the element at the point is the one expected). Then, if a touch-specific cause shows, make the smallest fix in graph-runner. Likely candidates: `touch-action: none` on `.chip` (CDK leaves `touch-action` at the browser default for an enabled drag, `drag-drop.mjs` line 203, so a page scroll could take the touch) or on the `vflow` host (for T4). Do not weaken an assertion. If the fix would need a change inside ngx-vflow, stop and report.
   - CDP helper (copied into the spec): `const cdp = await page.context().newCDPSession(page)`; `Input.dispatchTouchEvent` with `type: 'touchStart'` and `touchPoints: [{ x, y, id: 1 }]`; then ten `touchMove` events on the straight line to the target; then two animation frames (as `twoFrames` in `graph-chips.e2e.ts`); then `touchEnd` with `touchPoints: []`; then `cdp.detach()`. For T3 the target is measured after the drag has started (after `.cdk-drag-preview` is visible and two frames have passed), the same ordering as `dragChip` in `graph-chips.e2e.ts`.
7. (Part C) Write `e2e/specs/graph-large.e2e.ts` (test T7, section 5). The baseline may be run to find the selectors. The recorded numbers come only from step 12 (the final code).
8. (Part A) Edit the styles, following table 3.1: `canvas-page.ts` styles block (lines 707 to 782) and a new `styles` property on `RunDialog`. Then check, by grep, that the token names of table 3.1 exist in `node_modules/@angular/material/core/tokens/m3/_md-sys-color.scss` (assumption A6), and that the styles block has no `crimson`, `Canvas` or `currentColor`. Do not change the template, the `data-*` hooks, class names, sizes, `ARRANGE_*` constants, `VALIDATE_DELAY_MS` or the placeholder rule.
9. (Part A) Run T5 and T6 until they pass. Then run step 3 again: `canvas-page.spec.ts` lines 539, 544 and 1399 to 1417 must still pass.
10. (Part A) Visual check. Take six screenshots. Four at 1280 by 800: the recipe canvas with a pinned chip, the entity side list and the run dialog open, in light and in dark; and the story canvas with the missing-file badge, in light and in dark. Two at 1024 by 768: the recipe canvas in light and in dark. Attach them to the PR; do not commit them. The reviewer checks contrast and the library's edge and wrapper colours (A9, open point 7).
11. (Part B) Run T1 to T4 on the final code, twice. Expected: all pass both times.
12. (Part C) Measurement. Record `uptime` and the Chromium version. Run T7 once on a quiet machine. Record: the open time (from the click that opens the canvas to the 150th node visible), the longest long task during the open, the longest long task during the pan, and the number of long tasks of 50 ms or more during each. If the run is disturbed by load, rerun and record both runs. The numbers go to the PR body.
13. (Part D) Regression. Repeat steps 3 and 4 on the final code. Expected: all pass.
14. (Part D) Gates. `npm run lint`, `npm run build`, `npm test` from the root. Expected: each exits 0 on a quiet machine. The lint output ends with `All matched files use Prettier code style!`.
15. (Part D) Fresh clone. `git clone --branch unit/GRR-15 <this repository> <empty folder outside the repository>`; in it `npm ci && npm run lint && npm test && npm run build`, each exit 0. Record the Node and npm versions and remove the folder.
16. (Part D) Commit by explicit paths, with the message `feat(GRR-15): touch checks, theme tokens on the canvas, large-graph measurement`. Each commit that carries GRR-15 names it.
17. (Part D) PR body: the criteria with their test names and results, the two sets of numbers (T7), the screenshots (step 10), the answers to the open points that were decided during implementation, and the list of hooks and class names kept.

## 5. Acceptance criteria and tests

Each criterion has at least one test. Test names are the ones used in the specs. The helpers are copies in each spec, as section 1 says.

| Criterion (unit line) | Test, file | What it does | Pass condition |
|---|---|---|---|
| Touch: connect, move a node and drop a chip in touch emulation at a tablet viewport (line 20) | T1 "touch: a wire connects two handles", `graph-touch.e2e.ts`, `test.use({ viewport: { width: 1024, height: 768 }, hasTouch: true })` | Recipe `touch-canvas` with an input `chapter-notes` and an output `draft` (positions as in `graph-canvas.e2e.ts`). Touch-drag from `[data-port="chapter-notes.out"]` to `[data-port="draft.in"]`. Save | Save returns 200. The file's `edges` equal `[{ id: 'w1', from: 'chapter-notes.out', to: 'draft.in' }]` |
| (same) | T2 "touch: a node moves and only its position changes", same file | Touch-drag the `.vnode-head` of `chapter-notes` by 120 px right and 40 px down (idle, no run). Save | Save returns 200. The node's `position` is a number pair that differs from the seeded one. With that position put back, the file equals the seeded text byte for byte (as `graph-canvas.e2e.ts` does) |
| (same) | T3 "touch: a matching entity chip pins on an entity port", same file | Recipe `tool-chips` as in `graph-chips.e2e.ts`. Touch-drag `[data-entity="anna"]` to `[data-drop-port="cold-open.person"]`. Save | `[data-pinned="cold-open.person"]` contains `anna`; `[data-drop-reason]` is empty; save returns 200; the file equals the seeded graph with `cold-open.params` set to `{ person: 'anna' }` |
| Decision line 15: pan by touch (not a criterion) | T4 "touch: the background pans the canvas", same file | Find a background point of the vflow (its target is not inside `.vflow-node`). Touch-drag by (−150, −60) px. No save | The `chapter-notes` node's bounding box moves by (−150, −60) px, each within 5 px |
| Nodes, chips, dialogs and badges render with theme tokens in both themes (line 21; the visual check is recorded in the PR) | T5 "recipe view: nodes, chips and the run dialog use the tokens in both themes", `graph-theme.e2e.ts` | Recipe `theme-recipe` with an input `chapter-notes`, a `cold_open` tool node `cold-open` with `params: { person: 'anna' }`, and the entity `anna` (person) in `entities/`. Choose a `tone` value for `cold-open` that leaves Run enabled (read `cold_open.yaml`; the test asserts `[data-run]` is enabled before it clicks). Set Light, then Dark, through the radio group named `Theme`. Click `[data-run]` for the dialog | For each theme, each row of table 3.1 that the view shows has a computed value equal to the probe value of its token in that theme (probe below). `.vnode` background differs between Light and Dark |
| (same) | T6 "story view: the path-missing badge and the issue node use the tokens in both themes", same file | Story `theme-story` with a scene node pointing at `drafts/missing.md` (not in the project). Set Light, then Dark | For each theme: `[data-badge="path-missing"]` colour, background and border equal their tokens; `.vnode.issue` border colour equals `--mat-sys-error`; `.story-panel` border equals its token |
| Large graphs: a 150-node generated recipe opens and pans without blocking the main thread more than 200 ms, measured once and recorded (line 22) | T7 "a 150-node recipe opens and pans with no long task over 200 ms", `graph-large.e2e.ts`, desktop 1280 by 800 | Generates the recipe in the test: 150 `cold_open` tool nodes `n001` to `n150` on a grid of 15 by 10 (x = 40 + 200 × column, y = 40 + 300 × row). Opens the graph list in the app, then clicks the link to the graph (an in-app navigation, so the application bundle is not parsed again). Before the click, sets `window.__long = []` through a `PerformanceObserver` (`longtask`, buffered) that `addInitScript` installs. Waits until 150 `.vnode` are visible. Then finds a background point, drags the background by (−200, −100) px with the mouse in 20 steps, and clears `__long` again before the drag | The pan moved `n001` by (−200, −100) px within 5 px, which proves the pan happened. Every long task of the open and of the pan lasts 200 ms or less. The four numbers of step 12 are printed for the PR |

Probe for T5 and T6: a `div` is appended to `body` with `color: var(<token>)` (or `background-color` or `border-color`, as the property needs), its computed value is read, and it is removed. The same probe gives the expected value in the same theme, so the test needs no hard-coded colour.

Notes on the tests:
- The seeded graphs of T1 to T3 are the ones of `graph-canvas.e2e.ts` and `graph-chips.e2e.ts`. At 1024 by 768 a target may be outside the visible vflow. Then the seed positions are moved left (test data only, no code), and the change is recorded in the PR. A target is never reached by panning inside a test.
- Each test seeds its own project (`canvas-touch`, `canvas-theme`, `canvas-large`) and activates it, so no test depends on which project is active before it.
- T7 runs against the production build, which the e2e global setup produces (`apps/web/angular.json` line 58 is the production default).

## 6. Agreement with downstream units and later phases

- **GRR-17 (blocked by GRR-15; `phase:canvas` gate).** Needs: GRR-09 to GRR-16 criteria green on main. This plan keeps them: steps 3, 4, 13 and 14 run the same tests as before. GRR-17's e2e (its Scope: run the sample with input values, every node reaches `done`, the pending change appears) and its demo (Run, the badges moving from queued to done, the output link) use `data-run`, `data-run-dialog`, `data-start`, the status badges (`.badge[data-status]`) and `data-review-link`. All of them stay (section 1, hooks). GRR-17's manual iPad check runs on the touch behaviour that this unit checks in emulation. If Part B changes behaviour, the PR says so for GRR-17's reviewer.
- **GRR-16 (done).** Its sample recipe and its mock scenario are unchanged. Its tests read the recipe, not the styles.
- **GRR-12, GRR-13 and GRR-14 plans.** Their notes for GRR-15 (section 1) are met: the placeholder rule and D14 hold; the dialog is styled, not replaced; the touch move runs while idle; the story panel and the path-missing badge get tokens; the arrange constants are not changed.
- **GRR-11 plan (lines 39 and 120).** The port-type colours and the interim classes `issue`, `port-glyph` and `chip` are styled here, as the plan asked.
- **SHL-04 (done).** Its token contract is consumed, not changed. `material-theme.scss` is not edited. Its visual check (its plan line 178) is this unit's, and it is recorded in step 10.
- **TRG-04 and TRG-05 (done).** The chips inside a tool node's body belong to the Tool registry's entity picker. No shipped tool has one (assumption A10), so this plan styles only canvas chips.
- **GNP-19 and GNP-24 (later phases).** GNP-19 is blocked by GRR-17 (`units/GNP-19-fiction-gate.md` line 7), and GNP-24 uses the canvas as a node (line 20). Neither names GRR-15. They inherit this unit's output through GRR-17.
- **SHL-17 to SHL-19 (`phase:polish`, M7).** Not read in detail. None of them names GRR-15 (grep). If a polish unit restyles the canvas, it is later work and needs its own plan.

## 7. Other plans on the same files

- No draft or planned plan exists (section 2.1), so no plan changes the same files now.
- No in-flight branch or worktree changes `apps/web/src/app/features/graph-runner` or `e2e/specs` against main (section 2.1, git). The backup branches change other e2e specs.
- Done plans that changed these files and that this plan must keep: `plans/GRR-10.md` (the canvas and the adapter), `plans/GRR-11.md` (ports, chips and the `.issue` rule), `plans/GRR-12.md` (the chip drop and the placeholder rule), `plans/GRR-13.md` (the run dialog and the read-only states), `plans/GRR-14.md` (the story panel and the arrange constants). Their changes are on main. This plan changes only the `styles` block of `canvas-page.ts` and adds a `styles` property to `run-dialog.ts`, so the order with later plans does not matter, provided the hooks stay.

## 8. Open points

1. **Pinch zoom by touch is not checked.** The Decision names zoom; the criteria do not. Proposed: not checked, and the PR says so. CDP can send two touch points, so it could be added. Needs a decision.
2. **A touch pan that starts on a node body does not pan.** ngx-vflow ignores a touchstart inside a `.vflow-node` for the root zoom (ngx-vflow 2.7.0, lines 549 to 575). Proposed: accept this library behaviour and record it in the PR. Needs a decision.
3. **Where the large-graph numbers go, and whether T7 runs in CI.** Proposed: the numbers go into the PR body; the spec stays in the suite, as every e2e spec does. The risk is a load-induced failure (`plans/DECISIONS.md` line 6227 records timeouts under load). The alternative is to run it only when an environment variable is set. Needs a decision.
4. **If T7 is above 200 ms, this plan has no fix.** Options: a new revision with an optimisation of the canvas (for example, lighter node bodies or fewer change-detection passes over 150 nodes), or a change of the criterion by the user. Needs a decision before Part C starts.
5. **The shape of the 150-node recipe.** Proposed: 150 `cold_open` tool nodes, because a tool node carries the form and the ports and is the costliest kind. The alternative (150 input nodes) is cheaper and would understate the cost. Recorded as the default.
6. **Status-badge colours need a run.** T5 and T6 do not start a run. Proposed: the badge colours are checked in the screenshot pass (step 10), and GRR-17's e2e runs the sample. If they must be automated, a run with the mock server is needed. Needs a decision only if automation is wanted.
7. **Library colours outside the criteria.** ngx-vflow 2.7.0 hard-codes edge colours (`#b1b1b7`, selected `#0f4c75`) and some node-wrapper colours (`#fff`, `#000`, `#1b262c`). Proposed: left as they are; the dark-mode screenshot decides. Any override is a new decision.
8. **Material components or tokens.** Proposed: tokens only, the simplest option. If "Material styling" was meant as Material components (for example `MatDialog` or `mat-chip`), the structure, the hooks and GRR-13's inline dialog would change. Needs a decision.
9. **Touch on Safari.** Playwright's CDP touch is Chromium only, so WebKit is not covered here. GRR-17's iPad check covers it. Recorded, not a decision.
10. **The brief named unit notes that record a change.** The unit file has no notes section, its only commit is `2fed3f4`, and `plans/DECISIONS.md` has no GRR-15 change entry (section 2.1). This plan treats the unit as written. Needs confirmation.
11. **The initial bundle warning.** About 589 kB against the 500 kB warning, pre-existing (`plans/DECISIONS.md` line 6225). Its owner is not decided, and it is not this unit's. Recorded only.

## 9. Review parts

Every step of section 4 and every test of section 5 appears in exactly one part.

- **Part A: criterion 2 (theme tokens).** Steps 5, 8, 9 and 10. Tests T5 and T6. Files: `canvas-page.ts` (styles), `run-dialog.ts` (styles), `graph-theme.e2e.ts`. Review: table 3.1 matches the code; no literal colour is left; the hooks and sizes are unchanged; the probe compares computed values; the screenshots are attached.
- **Part B: criterion 1 (touch).** Steps 6 and 11. Tests T1, T2, T3 and T4. Files: `graph-touch.e2e.ts`, and a graph-runner file only if the smallest fix is needed. Review: no assertion is weakened; each gesture is a CDP touch sequence with the ordering of section 4 step 6; any fix is listed.
- **Part C: criterion 3 (large graphs).** Steps 7 and 12. Test T7. File: `graph-large.e2e.ts`. Review: the longtask observer is reset before the in-app navigation and before the pan; the pan is asserted; the numbers come from the final code on a quiet machine.
- **Part D: gates and commit (no new test).** Steps 1, 2, 3, 4, 13, 14, 15, 16 and 17. Files: none new. Review: the baseline and final runs are both recorded; the lint, build and test gates and the fresh clone exit 0; the commit names GRR-15 and uses explicit paths.
