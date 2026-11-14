---
id: SHL-10
status: draft
---

# SHL-10 plan — tool-call card component and view model

Unit: SHL-10 (module shell, phase:shared-components, M1; `units/SHL-10-tool-call-card.md`). Revision 1, status `draft`. Base: `main` at `22040f6` (`git rev-parse --short HEAD` when this plan was written); `git status --short` printed nothing, and `plans/SHL-10.md` did not exist (F1). The driver creates `unit/SHL-10` from `main`. This plan writes no code and changes only `plans/SHL-10.md`.

The only blocker is SHL-09, and it is done (F3), so no workaround is needed. SHL-10 is one of three units of `phase:shared-components` (SHL-10, SHL-11, SHL-12; units/README.md line 81), so merging it does not close the phase. No DECISIONS entry names SHL-10 (`grep -n 'SHL-10' plans/DECISIONS.md` prints nothing, F4). The decisions that bind it come from the unit, `modules/shell.md`, the plans of SHL-01, SHL-05, SHL-07 and SHL-09, and the DECISIONS entries cited in section 1.

Tags: `[FACT Fn]` means checked in this session, with the file and line in section 7a. `[ASSUMED An]` means a step of section 3 tests it or section 7b lists it. `[DECISION]` means a choice made here, with its source. `[OP n]` points to an open point in section 6.

## 1. Decisions this plan follows

1. **One presentational standalone component with one required input.** `ToolCallCard` (selector `app-tool-call-card`) takes `call = input.required<ToolCallView>()` and nothing else. It injects no API client, no SSE client and no feature service. It does inject two Shell signals, for decisions 4 and 7. The host maps its events onto `ToolCallView` and replaces the object on each change. Source: unit lines 18 and 20 ("presentational standalone component on a Shell-local view model"; "The Agent loop maps its stream events onto this model"). [FACT F2] [DECISION]

2. **The view model, exactly the unit's list plus one optional field.** The unit lists: tool name; arguments (JSON, a key/value tree); status `pending | running | done | error`; output (Markdown or JSON); error text; sources used (project-relative paths); collapsed flag. The type, in `tool-call-view.ts` (every field carries a TSDoc comment, because the criterion says "documented inputs"):

   ```ts
   export type ToolCallStatus = 'pending' | 'running' | 'done' | 'error';
   export type ToolCallOutput =
     | { readonly kind: 'markdown'; readonly text: string }
     | { readonly kind: 'json'; readonly value: unknown };
   export interface ToolCallView {
     readonly name: string;
     readonly status: ToolCallStatus;
     readonly summary?: string; // one line, shown in the header (the addition, [OP 2])
     readonly arguments?: unknown; // JSON; absent while the model is still writing the call
     readonly output?: ToolCallOutput;
     readonly error?: string;
     readonly sources?: readonly string[]; // project-relative paths
     readonly collapsed?: boolean; // absent means "follow the device class" (decision 4)
   }
   ```

   `summary` is the only field the unit does not list. AGL-01's `tool-call-result` carries `summary` (units/AGL-01-contract-slice.md line 23), and the unit's "one-line summary" for a collapsed card needs a line of text beyond the name and the status. It is optional and separable. Source: unit line 18 and 19; AGL-01 line 23. [FACT F2, F13] [DECISION, OP 2]

3. **The Shell does not depend on `/agent-loop`.** No file of this unit imports `@bbartolome/scriba-contracts/agent-loop` or zod. The sample chat route of criterion 3 hand-writes the shapes of the four tool-call events as `unknown` `data` (copies of AGL-01 lines 21 to 24, labelled illustrative). The sample may import the type `SseEnvelope` from `/platform`, which the Shell consumes. Source: unit line 20; `modules/shell.md` line 43 ("It never consumes `/agent-loop` … shared components take Shell-local inputs"). [FACT F5, F13]

4. **Collapsed on phones, expanded elsewhere, from the device-class signal.** The initial state is `call().collapsed ?? (deviceClass() === 'phone')`. An explicit `collapsed` wins in both directions. A tap on the header toggles the card. The state is a `linkedSignal` over that default, so it resets only when the default value changes (a rotation that changes the class, or the host changing the flag), not on each status update. The card reads `DeviceClassService.deviceClass`. Source: unit line 19 and criterion line 25; plans/SHL-05.md line 257 (the row "SHL-10 … `DeviceClassService.deviceClass` … exported from `shell/index.ts`"). [FACT F2, F8, F21] [ASSUMED A1]

5. **Arguments and JSON output are one nested key/value tree.** Rows are `key: value` for a leaf and `key:` with nested rows for an object or array (array rows are keyed by index); a string is shown as it is, any other leaf by `String(value)`. A container at depth 8 is shown as `…` so a self-referencing value cannot loop. Source: unit line 18 ("arguments (JSON shown as a key/value tree)"; "output (… or JSON)"). [DECISION]

6. **Markdown output goes through SHL-11's preview if it is on `main` at code time, else plain text.** The card never imports `ngx-markdown` itself and never sets `innerHTML`: sanitisation and front-matter hiding are SHL-11's. Plain text means a block with `white-space: pre-wrap`. Source: unit line 21 ("if available; otherwise plain text until SHL-11 lands (no blocking)"); units/SHL-11-markdown-preview.md lines 18 to 20 (the preview takes a Markdown string). [FACT F2, F14] [DECISION, OP 1]

7. **Source paths are links to the files route when the URL has a project id, and text otherwise.** The link is `/projects/<id>/files?path=<path>`, built with `routerLink` and `queryParams` from `ActiveProjectSignal.projectId` (the id of the current URL). Source: `modules/shell.md` line 58 (the files route and its `?path=`); units/PST-10-files-ui.md line 15 (`?path=` opens a file); units/AGL-09-narrative-tools.md line 21 ("The card shows sources used as links to the files route"); project-scope.ts lines 70 to 83. [FACT F9, F13] [DECISION, OP 2]

8. **One default content slot in the expanded body.** `<ng-content />` renders after the standard sections, only while the card is expanded. It is how a host adds a per-family body (AGL-07 line 19) or the diff view (AGL-14 line 15). The card has no other slot. Source: units/AGL-07-chat-panel-ui.md line 19; units/AGL-14-diff-previews-review-link.md line 15. [FACT F13] [DECISION, OP 2, OP 4]

9. **Error text is one string.** The attempt number and the "withdrawn" marker (AGL-07 line 19) are formatted into `error` by the host. Source: unit line 18 ("error text"); AGL-07 line 19. [DECISION, OP 3]

10. **Location and names.** The card and its model are flat files in `apps/web/src/app/shell/`, as the other shared components are (`theme-toggle.ts`, `notice-banners.ts`, `larger-screen.ts`). The sample chat route and its spec sit in `shell/testing/`, as the feature template does (`template-feature.ts`). Shell code lives outside `features/`; the boundaries lint does not cover `shell/`. Source: `modules/shell.md` line 42; plans/SHL-01.md lines 31 and 35 (decisions 12 and 16); DECISIONS lines 2744 to 2748 (the Navigator's decision (A) of 2026-11-14: Shell code stays outside `features/` with no exception); the precedent files. [FACT F7, F16, F18] [DECISION]

11. **Public API through `shell/index.ts`.** The entry gains `ToolCallCard` and the three types, so a feature imports the card from the Shell's entry. The sample chat route imports from `../index`, so it proves the entry is enough. Source: `shell/index.ts` line 1 (its header: "The Shell's entry for features"); modules/shell.md line 79 (the card is an Angular API provided to features). [FACT F7]

12. **Accessibility is built in, not added at the polish gate.** The card root is an `<article>` named `Tool call: <name>`. The header is a native `<button type="button">` with `aria-expanded` and `aria-controls`, `min-height: 44px`. Status is an icon plus a word (Pending, Running, Done, Error), never colour alone. Colours use the Material system variables, so both themes work. The body regions are named `Arguments`, `Output`, `Error` and `Sources`. Source: units/AGL-07-chat-panel-ui.md line 21 (tap targets of at least 44 px); units/SHL-19-polish-gate.md line 17 (the pass covers the card); notice-banners.ts lines 15 and 16 (the variable convention). [FACT F13, F19] [DECISION]

13. **No route, no nav entry, no HTTP.** The card is an Angular API, not a feature, so `app.routes.ts` does not change. Nothing in `app` imports the card, so no bundle changes (checked in step 7). Source: modules/shell.md line 79; app.routes.ts lines 17 to 51 (the routes). [FACT F17]

14. **Tests: external behaviour only, through rendered components and the Shell's fakes.** What the author sees (text, link targets, `aria-expanded`) and does (a tap). The viewport is driven by `stubMatchMedia`. The sample chat route runs on `createShellTestDoubles()`. Source: `modules/shell.md` lines 86 to 88; units/README.md line 133. [FACT F5, F6, F10, F11]

15. **Red first, then negative controls.** The specs are written against a stub card and must fail on assertions before the real card exists (step 2); three controls then each fail exactly one named test (step 4). Source: plans/SHL-09.md line 42 (decision 14). [DECISION]

16. **Build stop rule.** The production build exits 0 and the 1 MB error budget holds; the three warnings of the baseline are accepted (two CommonJS warnings and the 500 kB initial-total warning); any other warning, including a component-style budget warning (4 kB), or a build failure stops the code stage and goes to the Navigator. Source: DECISIONS lines 2681 to 2685; plans/SHL-09.md line 38 (decision 12); angular.json lines 32 to 43. [FACT F4, F15]

17. **Ticks and records are the coordinator's; branch and commit.** The code stage does not edit `units/` or `plans/DECISIONS.md`. The coordinator ticks the three criteria at closure. The implementer does not commit, push, add a remote, rebase or switch branches. Source: plans/SHL-09.md lines 44 and 48 (decisions 15 and 17). [DECISION]

18. **Scripts run as `node <script> <args>`, not `node -I`.** Node has no `-I` flag (exit 9). Source: DECISIONS line 2836 (note b of the SHL-09 code review). [FACT F4]

## 2. Files to create or change

### 2a. New files (5)

| Path | Purpose | Decision |
|---|---|---|
| `apps/web/src/app/shell/tool-call-view.ts` | The types of decision 2, with TSDoc on each. Types only, no runtime code | 2, 3 |
| `apps/web/src/app/shell/tool-call-card.ts` | Standalone `ToolCallCard` (inline template and styles, as the other shell components). Imports `MatIcon`, `NgTemplateOutlet`, `RouterLink`, `DeviceClassService` and `ActiveProjectSignal` (by their files, as `app-nav.ts` does), and, in code branch (a) of step 1b only, SHL-11's preview. Header button, then the body while expanded: Arguments, Output, Error, Sources, projected content. The tree is a nested `ul` through an `ng-template` that calls itself | 1, 4 to 9, 12 |
| `apps/web/src/app/shell/tool-call-card.spec.ts` | T1 to T6, T8 and T9 (section 4) | 14 |
| `apps/web/src/app/shell/testing/sample-chat.ts` | `SampleChatPage` and `sampleChatRoutes`: subscribes to `stream('agent-loop')` on the injected SSE client, maps `tool-call-started`, `tool-call-args`, `tool-call-result` and `tool-call-error` onto `ToolCallView`s in a signal, and renders `@for (item of calls(); track item.key) { <app-tool-call-card [call]="item.view" /> }`. It binds only `[call]`. Imports only `@angular/*`, `rxjs`, the type `SseEnvelope` from `/platform` and `../index`. Illustrative: AGL-07 maps with the real contract types | 3, 11 |
| `apps/web/src/app/shell/testing/sample-chat.spec.ts` | T7 (section 4) | 14 |

### 2b. Changed files (1)

| Path | Change | Decision |
|---|---|---|
| `apps/web/src/app/shell/index.ts` | Add two lines after line 11: `export { ToolCallCard } from './tool-call-card';` and `export type { ToolCallOutput, ToolCallStatus, ToolCallView } from './tool-call-view';`. Nothing else changes | 11 |

### 2c. Shared with other units

See section 8.

### 2d. Files that must not change

`apps/web/src/app/app.routes.ts`, `app.ts`, `app.html`, `app.config.ts`, `app.css`, `app.spec.ts`, `app.routes.spec.ts`, `core-gate.spec.ts`; every existing file under `apps/web/src/app/shell/` except `index.ts` (including `shell/testing/test-doubles.ts`, `match-media.ts`, `template-feature.ts`); `apps/web/angular.json`; `apps/web/package.json`; `package-lock.json`; `eslint.config.mjs`; `apps/web/tsconfig*.json`; `apps/web/src/app/features/.gitkeep`; `modules/shell.md`; everything under `e2e/`, `apps/api/`, `packages/contracts/` and `scripts/`; everything under `units/`; `plans/DECISIONS.md`; the other `plans/*.md`. Step 5b checks the list.

## 3. Method

Run from the repo root on `unit/SHL-10` (or on `main` if the driver has not created the branch). Do not commit, push or switch branches. Record `node -v` and `npm -v`.

0. **Preconditions (no file change).**
   - `git status --short -- ':!plans'` prints nothing (other units' plans may be untracked in a parallel batch).
   - `node -v` prints `v26.x`; `test -d node_modules/@angular/core` succeeds.
   - `npm run build -w @bbartolome/scriba-contracts` exits 0 (the web specs and build need `packages/contracts/dist`).
1. **Baseline (no file change).**
   - `npm test -w @bbartolome/scriba-web` exits 0. Record the passed count `B` (86 in 20 files at the SHL-09 batch head, DECISIONS lines 2834 to 2840).
   - `npm run build -w @bbartolome/scriba-web` exits 0. Record `Initial total` as `I0` (505.56 kB at the SHL-09 batch head) and the warnings `W0` (the two CommonJS warnings and the initial-total warning).
   - **1b. SHL-11 check.** Run `ls apps/web/src/app/shell | grep -i -E 'markdown|preview'` and `git log --oneline main -- apps/web/src/app/shell | head`. Branch (a): SHL-11's preview is on `main`; read its selector, its input name and its spec, and use it for `output.kind === 'markdown'`. Branch (b): it is not; use the plain-text block. Record the branch [ASSUMED A8]. Do not wait for SHL-11 and do not copy its code.
2. **Red first (files: the types, a stub card, `index.ts`, the sample, the three specs).** Write `tool-call-view.ts`, `testing/sample-chat.ts` and the two `index.ts` lines in their final form, a stub `tool-call-card.ts` (a standalone component with the `call` input and an empty template) and the specs with T1 to T9. Run `npm test -w @bbartolome/scriba-web`. Expect exit 1, with each of T1 to T9 failing on an assertion (each spec first asserts that the element it needs is present) and no other test failing; a test that passes against the stub is wrong and is fixed.
3. **Write the card (file: `tool-call-card.ts`).** Replace the stub with the real component (decisions 4 to 9 and 12). Then `npx prettier --write` on the six paths of 2a and 2b.
4. **Green, then negative controls.**
   - `npm test -w @bbartolome/scriba-web` exits 0, and the passed count is `B + 13` (T1 is four cases, T5 two, and T2, T3, T4, T6 to T9 one each).
   - Each control: `cp` the file to `/tmp/shl10-<name>.ts`, edit, run `npm test -w @bbartolome/scriba-web`, restore with `cp`, then `cmp` prints nothing.
   - N1: in `tool-call-card.ts`, make the default always expanded. Expected: exit 1 with T4 and T9 failing (the two tests with a phone leg that relies on the collapsed default) and no other test failing.
   - N2: ignore the `collapsed` flag. Expected: exit 1 with T6 failing and no other test failing (no other test sets the flag).
   - N3: stop rendering the Sources region. Expected: exit 1 with T1 (all four cases), T7 and T8 failing, and no other test failing.
   - N4: make the default collapsed unless the class is `desktop` (a tablet collapses). Expected: exit 1 with T5 failing for the tablet case only, and no other test failing (the other tests run on a desktop or on a phone).
5. **Static checks (no file change).**
   - a. `git status --short -uall -- ':!plans'` prints six lines: five starting `??` (2a) and one starting ` M` (2b).
   - b. `git diff --quiet -- apps/web/src/app/app.routes.ts apps/web/src/app/app.ts apps/web/src/app/app.html apps/web/src/app/app.config.ts apps/web/angular.json apps/web/package.json package-lock.json eslint.config.mjs modules units e2e apps/api packages scripts plans/DECISIONS.md` exits 0, and `git diff --name-only -- apps/web/src/app/shell` prints only `apps/web/src/app/shell/index.ts`.
   - c. `grep -rn "scriba-contracts\|from 'zod'" apps/web/src/app/shell/tool-call-view.ts apps/web/src/app/shell/tool-call-card.ts apps/web/src/app/shell/testing/sample-chat.ts` prints at most one line, the `SseEnvelope` type import from `/platform` in `sample-chat.ts`; `grep -rn "agent-loop'" apps/web/src/app/shell/tool-call-view.ts apps/web/src/app/shell/tool-call-card.ts` prints nothing (decision 3).
   - d. `grep -n "from '" apps/web/src/app/shell/testing/sample-chat.ts` prints only `@angular/`, `rxjs`, `@bbartolome/scriba-contracts/platform` and `../index` imports; `grep -n "<app-tool-call-card" apps/web/src/app/shell/testing/sample-chat.ts` prints one line, with `[call]` as its only binding (criterion 3, "only the card's documented inputs").
   - e. `grep -c '/\*\*' apps/web/src/app/shell/tool-call-view.ts` prints at least 11 (the two type aliases, the interface and its eight fields each carry a TSDoc comment).
6. **Lint, types and format (no file change).** `npm run lint -w @bbartolome/scriba-web` exits 0. `npx tsc --noEmit -p apps/web/tsconfig.spec.json` and `npx tsc --noEmit -p apps/web/tsconfig.app.json` each exit 0. `npx prettier --check` on the six paths exits 0.
7. **Production build and the bundle check.**
   - `npm run build -w @bbartolome/scriba-web -- --stats-json` exits 0 (stop rule, decision 16). Record `I1` and `W1`. Expected: `I1` equals `I0` and `W1` equals `W0`, because nothing imported by `app` imports the card [ASSUMED A6, A7].
   - BS1: a script in `/tmp`, run as `node /tmp/shl10-stats.mjs apps/web/dist/scriba-web/browser-stats.json`. It asserts that no key of `inputs` ends in `shell/tool-call-card.ts`, `shell/tool-call-view.ts` or `shell/testing/sample-chat.ts`, and that some key ends in `shell/app-nav.ts` (so an empty metafile cannot pass). Expected: all three absent and `app-nav.ts` present. The AOT compile of `src/**/*.ts` still type-checked the three files, so a template error in the sample or the card would have failed the build above.
8. **Full runs (no file change).** `npm test -w @bbartolome/scriba-web` exits 0 with count `B + 13`. The root `npm test` runs once; a failing test this unit does not touch is recorded as found on `main` and is not fixed here. `npm run e2e` is not run: no route, nav item, request or heading changes (decision 13).
9. **Record (no file change).** Report `B`, `B + 13`, `I0`, `I1`, `W0`, `W1`, the branch of step 1b, the result of BS1 and of each control, and `git status --short -uall`. Do not commit. Report what was not verified: the layout at 390 px and the 44 px target (A9) and the icon ligatures (A2).

## 4. Acceptance criteria tests

Each criterion has at least one named test. All are rendered-component tests under Angular's Vitest runner, with `stubMatchMedia` for the viewport (`stubMatchMedia(390, 844)` phone, `(820, 1180)` tablet, `(1280, 800)` desktop, the sizes of `app-nav.spec.ts`) and `restoreMatchMedia()` in `afterEach`. The card specs provide `provideRouter([])`; the card needs the router for `DeviceClassService`, `ActiveProjectSignal` and `RouterLink`. Specs read text, accessible names, `aria-expanded` and link targets; none reads a private member or a signal. A helper `treeLines(region)` in the spec turns a nested `ul` into indented lines (two spaces per level, each `li`'s own text with spaces collapsed).

**Criterion 1** (unit line 24): "Renders each status with tool name, arguments, output or error, and source paths."

- **T1 renders each status with its label, name, arguments, output or error, and sources** (`apps/web/src/app/shell/tool-call-card.spec.ts`, `it.each` over four cases). Seam: `TestBed.createComponent(ToolCallCard)` and `componentRef.setInput('call', view)` on a desktop viewport (expanded by default). The base view is `name: 'read_file'`, `arguments: { path: 'sources/outline.md', options: { lines: [1, 20], follow: false } }`, `sources: ['sources/outline.md', 'notes/ideas.md']`. Cases: `pending`, `running`, `done` with `output: { kind: 'json', value: { lines: 20 } }`, and `error` with `error: 'File not found: sources/outline.md'`. Expected in each: the article is named `Tool call: read_file`; the header shows the name and the status word (Pending, Running, Done, Error); the `Arguments` region reads `path: sources/outline.md`, `options:`, `  lines:`, `    0: 1`, `    1: 20`, `  follow: false` (as `treeLines` lines); the `Sources` region lists both paths. `done` also shows the `Output` region (`lines: 20`) and no `Error` region; `error` shows the `Error` region with the text and no `Output` region; `pending` and `running` show neither.
- **T2 shows JSON output as a tree and stops a very deep value** (same file). `done` with `output: { kind: 'json', value: { files: ['a.md', 'b.md'] } }` gives `files:`, `  0: a.md`, `  1: b.md`. A value nested ten keys deep (`{a:{a:{…:1}}}`) gives eight expanded `a:` levels and then `a: …` at the ninth line, and the page does not hang.
- **T3 shows Markdown output** (same file). `output: { kind: 'markdown', text: '**bold** text' }`. Branch (b): the `Output` region's text is `**bold** text`. Branch (a): the region has no literal `**` and shows `bold` inside a `strong`. The preview's own sanitising and front-matter tests are SHL-11's and are not repeated.
- **Command.** `npm test -w @bbartolome/scriba-web`.

**Criterion 2** (unit line 25): "Collapsed by default on a phone viewport and expands on tap; expanded by default on tablet/desktop."

- **T4 on a phone the card is collapsed, shows a one-line summary, expands on tap and collapses again** (`tool-call-card.spec.ts`). Phone viewport, a `running` view with `summary: '2 files'`, arguments and sources. Expected at first: the header button has `aria-expanded="false"` and shows the name, `Running` and `2 files`; the card's text contains none of the argument values or the sources, and has no `Arguments` or `Sources` region. After `button.click()` and a render: `aria-expanded="true"` and the regions are present. A change of the view from `running` to `done` with an output (through `setInput`) keeps it expanded and shows `Done` and the `Output` region. A second click collapses it again.
- **T5 on a tablet and on a desktop the card is expanded by default** (`it.each` over `(820, 1180)` and `(1280, 800)`). The same view; expected `aria-expanded="true"` and the regions present without a click.
- **T6 an explicit `collapsed` flag wins on both** (same file). Desktop with `collapsed: true`: collapsed. Phone with `collapsed: false`: expanded.
- **Command.** `npm test -w @bbartolome/scriba-web`.

**Criterion 3** (unit line 26): "A sample chat route built with the fake event source can render a run's tool calls using only the card's documented inputs."

- **T7 a sample chat route renders a run's tool calls from fake events, binding only `[call]`** (`apps/web/src/app/shell/testing/sample-chat.spec.ts`). Seam: a rendered route and the fake event source (SHL-07). The spec registers `{ path: 'projects/:projectId/chat', loadChildren: () => import('./sample-chat').then(f => f.sampleChatRoutes) }` with `createShellTestDoubles().providers`, a desktop viewport, and `RouterTestingHarness.create('/projects/p1/chat')`, as `template-feature.spec.ts` does (line 32). It then pushes envelopes with `doubles.events.push({ module: 'agent-loop', type, data })` and renders after each. Expected, in order: (1) `tool-call-started` for `c1`, name `list_files`: one card, `Pending`. (2) `tool-call-args` for `c1`: the same card is `Running` with `path: sources`. (3) `tool-call-result` for `c1` with `summary: '3 files'`, an `output` and `sourcesUsed: []`: `Done`, `3 files` in the header, the output rows. (4) `tool-call-started`, `tool-call-args` and `tool-call-error` for `c2` (`read_file`, `message: 'File not found'`, `attempt: 2`): a second card below the first, `Error`, with the text `Attempt 2: File not found`; the first card is still `Done`. (5) a third call, `tool-call-started` and `tool-call-result` only (no args event), whose result has `sourcesUsed: ['sources/outline.md']`: its `Sources` region lists the path, and it has no `Arguments` region. At the end `doubles.api.requests` is `[]`. Static checks 5c and 5d show the sample imports nothing from `/agent-loop` and binds only `[call]`. Controls: N3 fails it.
- **Command.** `npm test -w @bbartolome/scriba-web`.

**Beyond the criteria (decisions 7 and 8; each is separable, [OP 2]).**

- **T8 sources are links under a project URL and text elsewhere** (`tool-call-card.spec.ts`). Desktop viewport. Two sources, `sources/outline.md` and `notes/a b&c.md`. After `Router.navigateByUrl('/projects/p1/chat')` (a stub route `projects/:projectId/chat`), each path is an `a` whose `href`, parsed with `new URL`, has the pathname `/projects/p1/files` and `searchParams.get('path')` equal to the original path. After navigating to `/`, the same paths are shown with no `a`.
- **T9 projected content shows only while expanded** (same file). A test host `<app-tool-call-card [call]="view"><p>Extra body</p></app-tool-call-card>`. Desktop: the paragraph is in the card, as the last block of the expanded body, after the standard regions. Phone: it is absent until the header is tapped, then present.

## 5. Agreement with downstream units

| Unit | What it needs from SHL-10 | Provided by this plan |
|---|---|---|
| AGL-07 (named in `unblocks`; `blocked_by` line 7) | A shared card whose view model its events map onto; per-family bodies, the attempt number and the "withdrawn" marker, sources-used links (line 19); cards collapsed to one line on a phone (line 21 and criteria lines 26 and 29) | Yes. The model has name, status, arguments, output, error, sources and the flag (decision 2); per-family bodies through the content slot (decision 8); attempt and withdrawn go into the `error` string (decision 9, [OP 3]); sources are links (decision 7); phone default collapsed (decision 4, T4). The sample route (T7) shows the mapping from AGL-01's four event types. |
| AGL-08 (named in `unblocks`; `blocked_by` line 7) | `list_files` and `read_file` cards visible after the intent, found by the e2e (lines 18 and 27) | Yes. A card is an `article` named `Tool call: <name>`, so `getByRole('article', { name: /list_files/ })` finds it; the header is a button with the name, the status word and the summary (decision 12). Unconfirmed: AGL-08's own selectors. |
| SHL-19 (named in `unblocks`; `blocked_by` line 7; scope line 17 and criterion line 21) | A card the accessibility pass can cover: labels, focus order, contrast in both themes, controls reachable by a screen reader | Yes (decision 12): a native button with `aria-expanded` and `aria-controls`, named regions, icon plus word for status, Material system colours. The axe run is SHL-19's. |
| "Graph runner inline node results (optional)" (named in `unblocks`, no unit id: informative only; GRR-13 line 21 describes an expandable preview of `output` with cited files, and its `blocked_by` does not name SHL-10) | Reuse for node results: no arguments, an output, `sourcesUsed`, errors | Yes. A view with a name, a status, an output and sources, and no arguments, renders: T7's third call (a started and a result event, no args event) is such a card. GRR would map `idle` and `queued` to `pending` and use `running`, `done` and `error` as they are (GRR-01 line 28); how it shows `stopped` is its own choice. No dependency either way. |
| SHL-11 (parallel; not a blocker) | Nothing from SHL-10 | The card uses SHL-11's preview if it is on `main` at code time, else plain text (decision 6, step 1b, [OP 1]). If SHL-11 merges after SHL-10, SHL-11's code stage replaces the plain-text block with its preview in `tool-call-card.ts` and updates T3's branch; section 8 names the file. |
| SHL-12 and AGL-14 (a later user; AGL-14 line 15) | A place in the card for the diff view of a write card; on a phone the card collapsed by default (line 20) | Yes: the content slot (decision 8) and the phone default (T4). SHL-10 does not import SHL-12; `plans/SHL-12.md` line 182 plans its view to be embeddable in a card. |
| AGL-09 (a later user; line 21) | Sources shown as links to the files route | Yes (decision 7, T8). |
| AGL-18 (a later user; lines 18 and 20) | A summary chip on a draft card, collapsed by default on a phone | Partly. The chip can go in the content slot, so it shows when the card is expanded. A chip visible while the card is collapsed needs a header-level slot, which this plan does not provide ([OP 4]). |
| SHL-05, SHL-07, SHL-08, SHL-09 (done) | Used as they are | `DeviceClassService.deviceClass` (SHL-05), `stream` and `push` of the fake event source (SHL-07, plan line 150), `ActiveProjectSignal.projectId` (SHL-08). No file of theirs changes except `shell/index.ts` (two added lines). |
| SHL-13, SHL-17, SHL-18 (parallel) | Nothing | No shared file except `shell/index.ts` for SHL-13 (section 8). |

`blocked_by` is the source of truth (units/README.md line 64). The units whose `blocked_by` names SHL-10 are SHL-19 (line 7), AGL-07 (line 7) and AGL-08 (line 7) (F22); they are the three bare or quoted entries of SHL-10's `unblocks`. The fourth entry has no unit id, so it is informative. `parallel_with` is symmetric: SHL-11, SHL-12, SHL-13, SHL-17 and SHL-18 each list SHL-10 (F22). So no unit's front matter changes.

## 6. Open points

1. **Markdown output until SHL-11 lands, and who swaps the block afterwards. Owner: the Navigator or the coordinator (the merge order of SHL-10 and SHL-11).** The unit says "if available, else plain text (no blocking)". This plan checks at code time (step 1b). If SHL-11 merges later, the plain-text block stays until someone replaces it; the proposal is that SHL-11's code stage does it (one template change in `tool-call-card.ts` and the T3 branch), recorded in SHL-11's plan. No criterion depends on it.
2. **Three additions beyond the unit's list: the optional `summary` field, source links, and the content slot. Owner: the Navigator.** Each follows a downstream unit's text (AGL-01 line 23; AGL-09 line 21 and PST-10 line 15; AGL-07 line 19 and AGL-14 line 15) and none changes a criterion. They are separable: dropping one removes a field or a block and one test (T8, T9, or the `summary` part of T4 and T7). Without them AGL-07, AGL-09 and AGL-14 would each ask for an additive Shell change later (modules/shell.md line 101 gives that route for another case).
3. **The attempt number and the "withdrawn" marker (AGL-07 line 19). Owner: the Agent loop (AGL-07's planner).** The model has one `error` string. The sample shows `Attempt 2: File not found`. If AGL-07 wants a styled "withdrawn" marker, that is an additive field requested then.
4. **A slot visible while the card is collapsed (AGL-18's chip). Owner: AGL-18's planner.** Not provided here. The proposal is that AGL-18 uses the content slot first and asks for a header slot if the chip must show on a collapsed phone card.
5. **Layout is not tested. Owner: SHL-19 (the phone e2e and the axe pass) and AGL-07 (its phone check).** jsdom has no layout, so the 44 px target, the one-line ellipsis and the long-path wrapping are CSS that no test in this unit reads (A9).
6. **`unblocks` names an entry without a unit id. Owner: the coordinator; not blocking.** `"Graph runner inline node results (optional)"` is informative (units/README.md line 65). GRR-13 does not list SHL-10 in `blocked_by`, and the optional reuse needs nothing else from SHL-10.

## 7. Facts checked and assumed

### 7a. Facts checked (file and line)

- **F1.** `git rev-parse --short HEAD` prints `22040f6`; `git status --short` prints nothing; `ls plans` lists no `SHL-10.md`, `SHL-11.md` or `SHL-12.md`.
- **F2.** `units/SHL-10-tool-call-card.md`: line 7 (`blocked_by: [SHL-09]`), line 8 (`parallel_with`), line 9 (`unblocks`, four entries), line 15 (Why), line 18 (the view model), line 19 (collapsed on phones), line 20 (the Agent loop maps; no `/agent-loop` dependency), line 21 (SHL-11's preview), lines 24 to 26 (the three criteria, all unticked).
- **F3.** `plans/SHL-09.md` line 3 (`status: done`); `units/SHL-09-core-gate.md` lines 17 to 21 (all five criteria ticked `[x]`) and line 9 (`unblocks` names SHL-10).
- **F4.** `grep -n 'SHL-10' plans/DECISIONS.md` prints nothing. Entries used: lines 2744 to 2748 (location `shell/core-gate/`, Shell code outside `features/`); lines 2681 to 2685 (the bundle stop rule); lines 2712 to 2716 and 2834 to 2840 (the baseline: web 86 in 20 files, initial total 505.56 kB, the three warnings; note (b) on `node -I`, line 2836).
- **F5.** `modules/shell.md`: line 9 (consumers adopt a component when its unit merges, naming the card), line 42 (Shell code outside `features/`), line 43 (the Shell never consumes `/agent-loop`; shared components take Shell-local inputs), line 58 (the files route with `?path=`), line 79 (the card row), lines 86 to 88 (testing principles), line 101 (additive Shell changes on request).
- **F6.** `units/README.md`: line 64 (`blocked_by` is the source of truth; `unblocks` its inverse; `parallel_with` symmetric), line 65 (entries without a unit id are informative), line 81 (the `phase:shared-components` row), line 133 (testing rule).
- **F7.** `apps/web/src/app/shell/index.ts` has 11 lines: line 1 (header "The Shell's entry for features"), line 10 (`DeviceClassService`, `deviceClassGuard`), line 11 (`ActiveProjectSignal`). It exports `API_CLIENT` and `SSE_CLIENT` (line 3). `ls apps/web/src/app/shell` shows no markdown, preview, diff or card file.
- **F8.** `shell/device-class.ts` line 56 (`@Injectable({ providedIn: 'root' })`), line 57 (`DeviceClassService`), line 71 (`readonly deviceClass = toSignal(...)`). It injects `Router` and `NoticesService`, so a rendered card needs `provideRouter`.
- **F9.** `shell/project-scope.ts` lines 70 to 73 (the doc: the id is the URL's, not the server's active project), line 75 (`ActiveProjectSignal`), lines 78 to 83 (`projectId`, refreshed on each `NavigationEnd`), line 66 (`projectTarget`).
- **F10.** `shell/testing/test-doubles.ts` line 110 (`FakeEventSource`), line 124 (`stream(slug)`), line 129 (`push`, which refuses a non-Platform envelope), line 187 (`createShellTestDoubles`).
- **F11.** `shell/testing/match-media.ts` line 67 (`stubMatchMedia`), line 99 (`restoreMatchMedia`). `shell/app-nav.spec.ts` line 68 (`SIZES`: 390 by 844, 820 by 1180, 1280 by 800) and `core-gate.spec.ts` (a click on a nav link changes `router.url` in the test run).
- **F12.** `shell/sse-envelope.ts` line 22 (`'agent-loop'` is a publishing slug) and its `isPlatformEnvelope` guard (lines 35 to 49: a plain object with a known `module`, a `type` in kebab-case and a `data` key), so the sample's `tool-call-started` and the other three types pass `push`.
- **F13.** `units/AGL-01-contract-slice.md` lines 21 to 24 (`tool-call-started {callId, name, family}`, `tool-call-args {callId, arguments, valid}`, `tool-call-result {callId, summary, output?, diffPreview?, sourcesUsed?, provenance?}`, `tool-call-error {callId, message, attempt, withdrawn?}`). `packages/contracts/src/agent-loop/index.ts` is `export {};` (line 1), so the slice is not on `main`. `units/AGL-07-chat-panel-ui.md` lines 19 (cards, per-family bodies, attempt, withdrawn, sources links), 21 (phone, tap targets of at least 44 px), 26 and 29 (criteria). `units/AGL-08-file-tools-chat-gate.md` lines 18 and 27. `units/AGL-09-narrative-tools.md` line 21. `units/AGL-14-diff-previews-review-link.md` lines 15 and 20. `units/AGL-18-grounding-badges-ui.md` lines 18 and 20. `units/PST-10-files-ui.md` line 15.
- **F14.** `units/SHL-11-markdown-preview.md` lines 18 to 20 (renders through `ngx-markdown`; hides front matter; input is a Markdown string). `apps/web/src/app/app.config.ts` lines 22 to 24 (`provideMarkdown` with sanitising on). `apps/web/package.json` line 17 (`@angular/material` 22.2.7), line 20 (`@fontsource/material-icons` 5.3.0), line 21 (`ngx-markdown` 22.1.1).
- **F15.** `apps/web/angular.json` lines 32 to 43 (budgets: initial 500 kB warning and 1 MB error; component style 4 kB warning and 8 kB error). `apps/web/tsconfig.app.json` line 6 (`types: []`), line 8 (`include: src/**/*.ts`), line 9 (excludes specs), so `shell/testing/*.ts` is type-checked by the build but not bundled unless imported. `tsconfig.base.json`: `strict: true`, no `exactOptionalPropertyTypes`.
- **F16.** `eslint.config.mjs` lines 27 to 41 (the boundaries elements are `src/modules/*` and `src/app/features/*` only), so `shell/` is not covered.
- **F17.** `apps/web/src/app/app.routes.ts` lines 17 to 51 (the table: `''`, `projects/:projectId/switch`, `projects/:projectId`, `core-gate`, `**`); no entry for the card is needed.
- **F18.** `shell/testing/template-feature.ts` line 42 (`TemplateFeaturePage`), line 62 (`templateRoutes`); `template-feature.spec.ts` line 32 (`RouterTestingHarness.create('/template')`), lines 36 and 53 (T1 and T2). `grep -rn "input(\|input.required\|linkedSignal" apps/web/src` prints nothing: the card is the first component with an input.
- **F19.** `shell/notice-banners.ts` lines 15 and 16 (`--mat-sys-tertiary-container`, `--mat-sys-on-tertiary-container`); `shell/app-nav.ts` lines 3, 82 and 162 (`MatIcon` with a ligature name); `shell/connection-status.ts` (inline template and styles, `data-state`); `apps/web/src/styles.css` (the `.material-icons` class is global).
- **F20.** `apps/web/angular.json` lines 75 to 77 (the `test` target is `@angular/build:unit-test`, the Vitest runner), so the new specs run under `npm test -w @bbartolome/scriba-web`; `shell/testing/template-feature.spec.ts` sits in the same folder as the new spec.
- **F21.** `plans/SHL-05.md` line 257 (the SHL-10 row); `plans/SHL-07.md` line 150 (the SHL-10 row: "A sample chat route driven by the fake event source").
- **F22.** `grep -n 'SHL-10' units/*.md`: `units/SHL-19-polish-gate.md` line 7, `units/AGL-07-chat-panel-ui.md` line 7 and `units/AGL-08-file-tools-chat-gate.md` line 7 name SHL-10 in `blocked_by`; `units/SHL-11-markdown-preview.md`, `SHL-12-readonly-diff.md`, `SHL-13-editor-wrapper-lossless.md`, `SHL-17-pwa-service-worker.md` and `SHL-18-polish-about-shortcuts.md` name it in `parallel_with` (line 8 each). `units/GRR-13-run-controls-status.md` line 7 does not name SHL-10; line 21 describes inline results. `units/GRR-01-contract-slice.md` line 28 (node statuses `idle | queued | running | done | error | stopped`).
- **F23.** `plans/SHL-01.md` lines 31 and 35 (decisions 12 and 16); `plans/SHL-09.md` lines 38, 42, 44 and 48 (decisions 12, 14, 15 and 17).

### 7b. Things assumed

- **A1.** `@angular/core` 22.2.5 exports `linkedSignal` and `input.required`, and `@angular/common` exports `NgTemplateOutlet`. Steps 3 and 6 (tsc) check.
- **A2.** The ligature names `schedule`, `autorenew`, `check_circle` and `error` exist in the pinned Material Icons font. The tests read the ligature text only; no step looks at the glyph. Not verified.
- **A3.** The stubbed `matchMedia` classifies 390 by 844 as phone, 820 by 1180 as tablet and 1280 by 800 as desktop for a component created with `TestBed.createComponent`, as it does for `App` in `app-nav.spec.ts`. T4 and T5 test it.
- **A4.** `RouterTestingHarness.create('/projects/p1/chat')` with a lazy `loadChildren` entry works with the spec's own routes, without the active-project guard (the precedent of `template-feature.spec.ts`). T7 tests it.
- **A5.** `<ng-content />` inside an `@if` renders the projected nodes only while the `@if` is true, and keeps them across a collapse and re-expand. T9 tests it.
- **A6.** No file imported by `app` (`app.ts`, `app.config.ts`, `app.routes.ts` eagerly) imports the card, so the initial total does not change. Step 7 checks `I1` and BS1.
- **A7.** The card's inline styles stay under the 4 kB component-style budget (a few rules). Step 7 checks `W1`.
- **A8.** SHL-11's file name, selector and input are unknown at writing (`plans/SHL-11.md` does not exist). Step 1b reads them at code time; the two branches of T3 are written for it.
- **A9.** The CSS (the 44 px minimum height, the ellipsis on the summary, `overflow-wrap: anywhere` on long paths and strings, a `max-height` with scrolling on the output region) is correct at 390 px. Nothing tests it ([OP 5]).
- **A10.** The sample's event shapes match AGL-01 lines 21 to 24 now. AGL-01 is in the same batch and may rename a field. The sample is illustrative, and no other test depends on it.
- **A11.** `esbuild`'s metafile in `browser-stats.json` lists bundled inputs only, as SHL-09's lazy-chunk check relied on (plans/SHL-09.md line 108, step 7, and line 267, A4). BS1 reads absence from it; step 7 also confirms the metafile is non-empty and lists `shell/app-nav.ts`, so an empty file cannot pass.
- **A12.** Outputs and arguments are bounded by their producers (AGL), so the card adds no row limit; the output region scrolls.

## 8. Shared files

Files this plan changes or creates that another unit in the batch (SAU-06, AGL-01, PLT-19, PST-02, PST-11, SHL-11, MPR-09, SHL-12, TRG-01) might also change. The orchestrator reconciles.

| File | Change made here | Who else may touch it |
|---|---|---|
| `apps/web/src/app/shell/index.ts` | Appends two export lines after line 11: `ToolCallCard`, and the types `ToolCallOutput`, `ToolCallStatus` and `ToolCallView`. | SHL-11 will append its preview's export, and SHL-12 its diff view's. `plans/SHL-12.md` lines 64 and 72 plan the same append, each after line 11, so a merge needs only all the added lines kept; the order of the appends is the orchestrator's. SAU-06's plan reads the file (`API_CLIENT`, `ApiError`) and adds no export (`plans/SAU-06.md` line 59); MPR-09 has no plan yet, so its use of the file is not checked. |
| `apps/web/src/app/shell/tool-call-card.ts` (new) | The card. | SHL-11, if it merges after SHL-10: replaces the plain-text Markdown block with its preview (one template change, plus its import) and updates T3 in `tool-call-card.spec.ts` (decision 6, [OP 1]). If SHL-11 merges first, this plan imports its preview itself (step 1b, branch (a)). |
| `apps/web/src/app/shell/tool-call-card.spec.ts`, `tool-call-view.ts`, `testing/sample-chat.ts`, `testing/sample-chat.spec.ts` (new) | The model, the sample and the tests. | None expected. SHL-12's plan adds `shell/testing/dom-range.ts` to the same folder (`plans/SHL-12.md` line 75); the names differ. AGL-07 (not in this batch) and AGL-01 do not edit these files; AGL-01's event shapes are copied into the sample, not imported (decision 3). |
| `apps/web/src/app/app.routes.ts`, `app.config.ts`, `angular.json`, `package.json`, `package-lock.json`, `modules/shell.md`, `eslint.config.mjs` | No change. | SAU-06 (its plan, line 64) and probably MPR-09 add route entries to `app.routes.ts`; by their titles TRG-01 and AGL-01 add contract subpaths, PLT-19 changes a workflow, and PST-02 and PST-11 touch the API and `examples/`. None of these is a file this unit changes. |

## 9. Summary of the plan's commitments

- Three criteria, nine named tests: T1 to T3 (criterion 1: each status, JSON output, Markdown output), T4 to T6 (criterion 2: phone collapsed and tap, tablet and desktop expanded, the explicit flag), T7 (criterion 3: the sample chat route on the fake event source), and T8 and T9 (the source links and the content slot, beyond the criteria).
- One component with one input (`call: ToolCallView`), a Shell-local view model, no `/agent-loop` import, no route, no HTTP, no bundle change.
- New files: `shell/tool-call-view.ts`, `shell/tool-call-card.ts`, `shell/tool-call-card.spec.ts`, `shell/testing/sample-chat.ts`, `shell/testing/sample-chat.spec.ts`. Changed: `shell/index.ts` (two lines).
- Net passed count `B + 13` (step 4). Four negative controls (N1 to N4).
- Six open points: the Markdown swap (the Navigator or coordinator), the three additions (the Navigator), the attempt and withdrawn marker (AGL-07), a collapsed-visible slot (AGL-18), layout not tested (SHL-19 and AGL-07), and the `unblocks` entry without an id (the coordinator).
