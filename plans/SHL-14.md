---
id: SHL-14
title: Editor saving — debounce, explicit save, one follow-up, save state, conflict, unsaved-changes guards
module: shell
phase: phase:editor
milestone: M3
status: planned
---

# SHL-14 plan — editor saving: debounce, explicit save, one follow-up, save state, conflict, leave guards

Unit: SHL-14 (module shell, phase:editor, M3; `units/SHL-14-editor-saving.md`). Revision 2, status `planned`: written by the planner (revision 1, commit `9cf0218`) and corrected by the Opus reviser; the reviser's corrections are listed in section 11. Base of the facts: `main` at `6829135`; at the revision `main` is at `9cf0218`, and `git diff --stat 6829135 9cf0218` lists only `apps/api/**` and `units/AGL-02-*` (AGL-02, now done) and `plans/AGL-02.md` and this file, so no file of section 2 moved. The first read was at `ebdfe3a`. Between the two, `main` gained `0631497` and `6829135`, which change only `plans/DECISIONS.md` and `plans/QUEUE.md` (`git diff --stat ebdfe3a 6829135`), so no file of section 2 moved. The blocker SHL-13 is merged (`7cc7601` feat, `02eadc0` docs; `plans/SHL-13.md` line 3 says `status: done`). This plan is therefore written against the merged `apps/web/src/app/shell/markdown-editor.ts` and `markdown-document.ts`, not against the SHL-13 plan's drafts. This plan writes no code and changes only `plans/SHL-14.md`.

Tags: **[checked]** means read in this session, with file and line in section 7a. **[assumed]** means a belief listed in section 7b; a step of section 3 tests it. **[decision]** means a choice made here, with its source. Line numbers are those at `6829135`.

**Result in short.** SHL-14 changes the merged component; it adds no new one. SHL-13 already loads, saves through `write` with the base hash, keeps the bytes, reports errors and recognises the conflict code. SHL-14 adds the debounce, one write in flight with one follow-up, the explicit triggers, the leave guard and the beforeunload prompt. It also changes three SHL-13 rules that the unit's criteria contradict: the Save button is disabled while saving (`markdown-editor.ts` line 77); an edit overwrites `failed` and `conflict` with `unsaved` (lines 222 to 231); and a reference change destroys unsaved text (`load`, lines 155 to 158). One new file, `unsaved-text.ts`, holds the guard and the registry it reads.

## 1. Decisions this plan follows

**D1. The author's typing goes through `write`, never through pending changes.** Sources: unit line 18; `modules/shell.md` line 101 ("the author's own typing saves straight to the file"); `units/README.md` line 134. [decision]

**D2. Triggers.** (a) Debounce: 1500 ms after the last edit; each edit restarts it. (b) Explicit: the Save button and Ctrl/Cmd-S. (c) Blur: focus leaves the component (D16). (d) Leave: the guard's flush (D10, D11). (e) Reference change (D13). Sources: unit lines 19 and 25; `plans/SHL-13.md` decision 12 (line 38) and open point 5 (line 174), which give the reference case to SHL-14. The unit says "~1.5 s idle"; this plan takes 1500 ms exactly (open point 4). [decision]

**D3. Automatic triggers write only when the text differs from the last saved text.** Automatic triggers are the debounce, blur, the leave flush and the reference change. The explicit trigger always writes. SHL-13 criterion 1 needs a write on Save with no edits (`units/SHL-13-editor-wrapper-lossless.md` line 23), and this plan keeps it. [decision]

**D4. One write in flight; one follow-up.** A trigger that arrives during a write sets one pending mark, `explicit` or `automatic`; a second trigger only keeps the stronger mark. When the write ends: a failure sends nothing and clears the mark (D6). A success sends one follow-up with the text at that moment when the mark is `explicit`, or when the mark is `automatic` and the text differs from what was saved. Otherwise nothing is sent. Source: unit line 19 ("One save in flight; later edits coalesce into one follow-up save"). [decision]

**D5. Base hash.** Each write sends `baseHash`, the hash of the last read or the last successful write. The returned `hash` becomes the next base. Sources: unit line 20; `packages/contracts/src/project-store/files.ts` lines 42 to 46 (`fileWriteSchema`); `apps/api/src/modules/project-store/files.service.ts` lines 283 to 287 (a base that does not match gives `PROJECT_WRITE_CONFLICT`). [checked]

**D6. Errors.** A write error whose code is `PROJECT_WRITE_CONFLICT` (`packages/contracts/src/project-store/errors.ts` line 13; HTTP 409 at line 66) gives `conflict`. Any other error gives `failed`. The text is kept. There is no automatic retry. A later edit (after its debounce) or an explicit Save tries again. Unit line 21. [decision]

**D7. Conflict.** While the state is `conflict`, automatic triggers do not write, and an edit does not arm the debounce. An explicit Save still sends, with the same base. The server refuses it while the file differs from that base, so nothing is overwritten. Edits do not clear `conflict` or `failed`; only a successful write does. SHL-14 adds no way to resolve a conflict (no reload, no merge, no overwrite). Sources: unit line 21 ("`conflict` state; never overwrites"), which holds because the base changes only on a successful write (D5) and the server refuses a stale base (`files.service.ts` lines 283 to 287); PST-34 line 22 needs only that the warning shows and the text is kept. The suspension keeps the `conflict` status and the alert on screen: an automatic retry would set `saving` and clear the alert (`markdown-editor.ts` lines 134 and 135) on every pause, so the warning PST-34 needs would flicker away. No unit and no line of `modules/shell.md` names a resolution, so none is added (open point 3, settled). [decision]

**D8. States.** An edit moves `saved` to `unsaved`. It leaves `failed`, `conflict` and `saving` as they are. A send sets `saving`. A success sets `unsaved` when the text differs from the sent text, otherwise `saved`. A failure sets `failed` or `conflict`. Unit line 26 gives the transitions. The SHL-13 rule at `markdown-editor.ts` lines 228 to 230 (an edit sets `unsaved` unless saving) is changed by this decision. [decision]

**D9. Save button.** It is disabled only when the editor is read-only. SHL-13 also disabled it while saving (line 77). Clicks during a write are accepted and coalesce (D4). Sources: unit line 25; `plans/SHL-13.md` line 158, which says SHL-14 removes that disable. [decision]

**D10. Leave guard.** `unsavedTextGuard`, a `CanDeactivateFn` exported by the Shell, asks every registered editor with unsaved text to flush (D11). If every flush ends saved, the navigation goes on with no prompt. Otherwise `window.confirm` asks, and Cancel keeps the page. Sources: unit line 19 ("before route leave" is a save trigger) and line 22 (a `canDeactivate` guard that warns about *unsaved* text). Criterion 3 (line 27) is read with these two decisions: the leave save of line 19 runs first, and the prompt comes before the leave completes whenever the text is still unsaved after it (open point 1, settled from the unit text). [decision]

**D11. Flush.** `flush()` returns an observable of one boolean. It resolves `true` at once when no text is unsaved. It resolves `false` at once when the editor cannot save: read-only with unsaved text, or state `conflict`. Otherwise it clears the debounce timer and starts a write, or joins the one in flight, and resolves when the editor settles (no write in flight and none pending): `true` when the state is `saved`, `false` otherwise. It subscribes to the settled signal before it starts the write, because the fake client answers inside the call and the settle could happen before the subscription. [decision]

**D12. Unload.** The editor calls `preventDefault` on `beforeunload` while it has unsaved text: the text differs from the saved text, or a write is in flight, or a follow-up is pending. Sources: unit lines 22 and 27. [decision]

**D13. Reference change.** A changed reference with unsaved text flushes the old file first. The new file is read only after that flush has saved. If the flush does not save, the editor asks the same prompt as the guard (`confirmUnsavedLeave`, D21): OK reads the new file and drops the old text; Cancel keeps the old file open with its state and error line. Without the prompt a file in `conflict` could never be left by a reference change (D11 gives `false` at once), and PST-34 changes the file through `?path=`, a query-parameter change on which the router does not run `canDeactivate` by default; so this is the "navigating away" of criterion 3 inside one route. Writes use the reference that the open text was loaded with, kept in a new field `loaded`, never the current input, so a text cannot reach a path it did not come from. Source: `plans/SHL-13.md` decision 12 (line 38) and open point 5 (line 174), which give this case to SHL-14. [decision]

**D14. Destroy.** The debounce timer is cleared, and the editor unregisters from the registry (D10) first. An in-flight write is not cancelled. After the destroy its result changes no output and no view. The reason: a write cut off by a teardown may or may not reach the disk, and a route leave already waits for it through the guard. Sources: this plan; `units/SHL-05-breakpoint-gate-nav.md` line 20 ("an open view is not torn down", which protects unsaved editor text). [decision]

**D15. Keyboard.** A keydown on the component's host element with `ctrlKey` or `metaKey`, the key `s` in any case, and no `shiftKey` and no `altKey`, is an explicit save; the default is prevented. The listener is on the host, not on `window`, so a Ctrl-S elsewhere on the page is not caught. Sources: unit lines 19 and 25; `units/SHL-15-editor-layout-touch.md` line 19 (the Save button covers the shortcut for hardware-free use). [decision]

**D16. Blur.** A `focusout` whose `relatedTarget` is outside the host element is an automatic trigger. Focus that moves to the Save button, or to any element inside the component, is not. Source: unit line 19 ("on blur"). [decision]

**D17. Save mode.** The component gains an input `saveMode` of the exported type `SaveMode = 'direct'`, with default `'direct'`. It has one value, and no code branches on it (a test on a one-value type is always true and would be dead code). Sources: the Navigator's decision (`plans/DECISIONS.md` line 3629) says SHL-14 adds the save-mode input that `units/SHL-13-editor-wrapper-lossless.md` line 18 names; the only mode any text names is direct save: SHL-14 line 18 ("straight through the Project store file API (`write`), not through pending changes"), `modules/shell.md` line 101 ("the author's own typing saves straight to the file"), `units/README.md` line 134, and PST-34 lines 15 and 22 ("direct save"). SHL-16 (the other editor-like component) does not save; it emits text for the accept request (`units/SHL-16-editable-merge-view.md` line 20). A unit that names a second mode adds the value and its branch (open point 2, settled). [decision]

**D18. Unchanged from SHL-13.** The text is sent as `documentText(state)` (`sliceDoc`). The line separator and the BOM are set as SHL-13 set them (`markdown-document.ts`, 28 lines: `dominantLineSeparator` at line 10, `documentExtensions` at line 18, `documentText` at line 26). The write body is `{path, content, baseHash}`. The eighteen tests of `markdown-editor.spec.ts` stay unedited and pass. Sources: `plans/SHL-13.md` decisions 6 to 11; unit SHL-13 lines 18 to 25. [decision]

**D19. Test seams.** A rendered host with `API_CLIENT` replaced by a fake, as the SHL-13 spec does (`markdown-editor.spec.ts` lines 58 to 118). The guard is tested through a route in a `RouterTestingHarness` (as `apps/web/src/app/shell/project-route.spec.ts` line 4 does). Time is controlled with `vi.useFakeTimers()` (as `apps/web/src/app/shell/sse-client.spec.ts` line 95 does). A held write is a spec-local subclass of `FakeApiClient` whose `post` returns a `Subject` that the test completes. `testing/test-doubles.ts` is not changed. Sources: `modules/shell.md` lines 89 and 90; `units/README.md` line 136. [decision]

**D20. No new package.** `@angular/router` (`apps/web/package.json` line 19) and rxjs are already used. [checked]

**D21. The prompt is `window.confirm`.** One function, `confirmUnsavedLeave(): boolean` in `unsaved-text.ts`, calls it; the guard (D10) and the reference change (D13) both use it. Its text is the code stage's to word, and the tests check only that a prompt was asked (open point 5). [decision]

## 2. Files to create or change

Facts used here: `markdown-editor.ts` is 254 lines; its `EditorReference` interface is at line 38; `view` at 95; `loadSub` at 96; `saveSub` at 97; `baseHash` at 99; `savedText` at 100; the Save button's `[disabled]` at line 77; `save()` at lines 123 to 152 (the early return at lines 125 to 131; the success handler at lines 143 to 150; the error handler at line 151); `load()` at lines 155 to 175; `onDocumentChange` at lines 222 to 231; `reportError` at lines 233 to 238; `onDestroy` at lines 115 to 119. [checked]

### 2a. New files (2)

| File | Content | Decisions |
|---|---|---|
| `apps/web/src/app/shell/unsaved-text.ts` | `export interface UnsavedSource { hasUnsavedText(): boolean; flush(): Observable<boolean>; }`. `@Injectable({providedIn: 'root'}) export class UnsavedTextRegistry` with `register(source): () => void` (returns the unregister function) and `unsaved(): UnsavedSource[]`. `export function confirmUnsavedLeave(): boolean` (calls `window.confirm`, D21). `export const unsavedTextGuard: CanDeactivateFn<unknown>`: `true` when `unsaved()` is empty; otherwise `forkJoin` of the flushes, and `true` when all are `true`, else `confirmUnsavedLeave()`. Imports `@angular/router` and rxjs only: no CodeMirror import and no contract import. | 10, 11, 13, 21 |
| `apps/web/src/app/shell/unsaved-text.spec.ts` | Four tests (section 4: T3.1 to T3.4). Each renders a route that holds the editor and carries `canDeactivate: [unsavedTextGuard]`. Imports `MarkdownEditor` and `unsavedTextGuard` from `./index` (the feature's seam), `FakeApiClient` from `./testing/test-doubles`, `API_CLIENT` from `./tokens`, and `RouterTestingHarness` from `@angular/router/testing`. | 10, 12, 19 |

### 2b. Changed files

| File | Change | Lines at writing | Decisions |
|---|---|---|---|
| `apps/web/src/app/shell/markdown-editor.ts` | See the list below. | 254 | 1 to 9, 11 to 17 |
| `apps/web/src/app/shell/markdown-editor.spec.ts` | Add an optional `client` argument to `render` (the 18 tests call it unchanged), add the spec-local `HoldingApiClient` (a subclass of `FakeApiClient` whose `post` records the request in `requests` and returns a `Subject`, piped through the exported `parseResponse` of `api-client.ts` line 38 so a held body is parsed as the real client parses it), and append a new `describe('MarkdownEditor saving', …)` after line 257 with the fourteen `it` blocks of section 4 (T1.1 to T2.3, T4.1, E1 to E3). The eighteen existing tests are not edited. | 257 | 19 |
| `apps/web/src/app/shell/index.ts` | Append one line after line 20: `export { unsavedTextGuard } from './unsaved-text';`. Keep every existing line. | 20 | 10 |

Changes inside `markdown-editor.ts`:
- A constant `SAVE_DEBOUNCE_MS = 1500`, an exported type `SaveMode = 'direct'`, and an input `saveMode = input<SaveMode>('direct')`, read by no branch (D17).
- Fields: `timer` (the debounce handle), `pending` (`'explicit' | 'automatic' | undefined`), `loaded` (the `EditorReference` of the open text), `settled` (a `Subject<void>`), and a `destroyed` flag (D4, D11, D13, D14).
- `save()` (lines 123 to 152) becomes `requestSave(explicit: boolean)` and a `send()`. The early return on `saving` (lines 125 to 131) goes. The success handler (lines 143 to 150) follows D4 and D8. The error handler (line 151) calls `reportError`, which also clears `pending` (D6).
- `onDocumentChange` (lines 222 to 231): when the editor is not read-only and the state is not `conflict`, it restarts the debounce; the state rule is D8.
- `load()` (lines 155 to 175): when the view holds unsaved text and the reference differs, it flushes first (D13). The view creation moves to a `loadNow(reference)`, which sets `loaded`.
- `onDestroy` (lines 115 to 119): clears the timer, unregisters, sets `destroyed`, keeps `saveSub` (D14), and unsubscribes `loadSub` as now.
- Constructor: registers the editor's `UnsavedSource` with `UnsavedTextRegistry`. Host metadata: `(keydown)`, `(focusout)` and `(window:beforeunload)` (D12, D15, D16).
- `flush()` (D11). `requestSave(true)` and `flush()` clear the debounce timer.
- The reference change (D13) imports `confirmUnsavedLeave` from `./unsaved-text`.
- The template's button binding (line 77) becomes `[disabled]="readOnly()"` (D9).
- Not changed: `STATUS_TEXT` (lines 46 to 53), `readOnlyExtensions` (lines 54 to 56), `isWriteConflict` (lines 58 to 60), `createView` (lines 177 to 189), `applyReadOnly` (lines 191 to 195), `editorExtensions` (lines 197 to 220).

### 2c. Shared with other units (the rule for each)

- `apps/web/src/app/shell/index.ts`: each Shell unit appends after the last line on `main` at its merge time and keeps the others (the rule SHL-12 and SHL-13 follow, `plans/SHL-13.md` section 2c). SHL-14 adds one line; SHL-15 and SHL-16 may append theirs.
- `markdown-editor.ts` and `markdown-editor.spec.ts`: SHL-15 runs in parallel and may touch them. Section 5 gives its rule. SHL-14 changes the class and the button line; SHL-15 adds markup outside the button and its own tests after the SHL-14 block.
- `apps/web/src/app/features/project-store/project-store.routes.ts`: this plan does not change it. PST-34 attaches the guard there (section 5).

### 2d. Files that must not change

`apps/web/src/app/shell/testing/test-doubles.ts` (the held write is a subclass in the spec); `project-store-copies.ts`; `markdown-document.ts`; `api-client.ts`, `api-error.ts` and `tokens.ts` (read only); `apps/web/src/app/app.routes.ts`; `apps/web/src/app/features/**` (their owners are PST-10 and PST-34); `apps/web/package.json` and `package-lock.json`; `packages/contracts/**`; `units/`; `modules/`; `plans/` except the implementation's own plan record.

## 3. Procedure

Run every step in the unit's own worktree on branch `unit/SHL-14`, as `prompt.md` line 118 says. If the branch does not exist, the implementer makes it from `main`. Record `node -v` and `npm -v` beside the first install. Do not push. Do not change a file outside section 2.

0. **Base and conflicts.** Run `git rev-parse --short HEAD` and `git status --short`. Run `git show main:apps/web/src/app/shell/index.ts | wc -l` (20 at writing) and `git show main:apps/web/src/app/shell/markdown-editor.ts | wc -l` (254 at writing). Run `git log --oneline main | grep -c 'feat(SHL-13)'` (1 at writing). Run `grep -n '^status:' plans/SHL-13.md` (`done`). Expected: each value matches, or differs only by what another merged unit added; record the differences and use them.

1. **Install.** `npm ci` at the root. The `@codemirror` packages are not installed in this checkout (F17), so this step is needed before any test. Then `npm run build -w @bbartolome/scriba-contracts`. Expected: both exit 0, and `ls node_modules/@codemirror/view` (or the `apps/web` copy) exists.

2. **Red first.** Append the fourteen `it` blocks of section 4 (fifteen cases; T1.3 runs for two modifiers) to `markdown-editor.spec.ts` in a new `describe` block, with its `beforeEach` calling `vi.useFakeTimers()` and its `afterEach` calling `vi.useRealTimers()`. Add the optional `client` argument to `render`. Add `HoldingApiClient`. Create `unsaved-text.spec.ts` with the four tests (T3.1 to T3.4). Create `unsaved-text.ts` with the exported names as stubs (`unsavedTextGuard` returns `true`, the registry does nothing). Expected: every new test fails except T3.4, which passes on the stub; the eighteen SHL-13 tests still pass. Record the failing list. Run `npm test -w @bbartolome/scriba-web`, or `cd apps/web && npx ng test --watch=false --include src/app/shell/markdown-editor.spec.ts` for one file (the `--include` flag is assumed, A7; confirm it with `npx ng test --help`).

3. **Implement `unsaved-text.ts`** (D10, D11, D21): the registry (a `Set` of sources), `unsaved()` (the sources whose `hasUnsavedText()` is true), and the guard as described in section 2a.

4. **Implement `markdown-editor.ts`**, in this order: the constant, the type, the input `saveMode` and the fields (D17, D4); `requestSave` and `send` with their completion (D3 to D8); the host listeners (D15, D16) and the reading of `loaded` for every write (D13); `flush` (D11); registration and the destroy changes (D14); the beforeunload listener (D12); the edit rule and the debounce arming in `onDocumentChange` (D2, D7, D8); the reference handling in `load` (D13); the template line (D9). Run `npx prettier --write` on each file this step wrote (not on `units/` or `plans/`).

5. **Add the `index.ts` line** (D10). Expected: the file has 21 lines.

6. **Green.** Run the suite. Expected: the fifteen new cases in `markdown-editor.spec.ts`, the four in `unsaved-text.spec.ts` and the eighteen SHL-13 tests pass. Expected: no test is skipped and no timer leaks into the next test (E3 checks the destroy).

7. **Controls** (mutations, each run once, reverted, not committed). Expected results are in section 4, table of controls. Record each result. Revert each before the next.

8. **Lint, types and format.** `npm run lint -w @bbartolome/scriba-web` exits 0. `npx tsc --noEmit -p apps/web/tsconfig.spec.json` and `npx tsc --noEmit -p apps/web/tsconfig.app.json` each exit 0. `npx prettier --check` on the changed and new files exits 0. Root `npm run lint` exits 0 (it ends with `prettier --check .`, `package.json` line 26). If an ESLint rule rejects a host listener or `window.confirm`, the implementer changes the code, not the rule, and records the change.

9. **Byte checks.** For each new and changed `.ts` file, `LC_ALL=C grep -c $'\r'`, `LC_ALL=C grep -c $'\xef\xbb\xbf'` and `LC_ALL=C grep -c $'\xc2\xa0'` each print `0`. The new fixtures, if any, are escape sequences.

10. **Build.** `npm run build -w @bbartolome/scriba-web` exits 0. Record the initial-chunk size line before (on `main`) and after. The CodeMirror code must not grow the initial chunk: `grep -rl 'cm-editor' apps/web/dist/scriba-web/browser` is checked as SHL-13 step 9 checks it, and its result is recorded whatever it is. `unsaved-text.ts` imports only the router and rxjs.

11. **Browser check** (manual, recorded, not a criterion, not committed). If the dev stack runs (`npm run dev`), open a temporary route that renders the editor over a fake client. Type, pause 1.5 s, and see the status change to "Saved". Press Ctrl-S and Cmd-S (on a Mac keyboard) and see one write. Tab away and see a write. Close the tab with unsaved text and see the browser's prompt. Delete the temporary route before any commit.

12. **Record.** For each criterion of section 4, record passed or failed with the command output. A criterion passes only when its pass condition holds. Record each difference from this plan. Commit by path, in one or two commits, each message with the unit id (`feat(SHL-14): ...`).

## 4. Acceptance criteria and tests

All tests run with `npm test -w @bbartolome/scriba-web` (Angular's Vitest runner, jsdom). They render a host or a route and read the DOM and the outputs. They do not call a service or a signal. Edits are made as SHL-13 makes them: `EditorView.findFromDOM`, then `dispatch` (`markdown-editor.spec.ts` lines 154 to 165). Clicks, key presses and focus changes are DOM events dispatched on `.cm-content`, the Save button, or the host, with `bubbles: true` where the browser bubbles them. The plan marks nothing passed.

Timer rules: after each timer advance, the test calls `fixture.detectChanges()` before it reads the DOM (A9). The tests use the 1500 ms debounce of D2, so the 1499 ms and 1500 ms steps are exact.

`HoldingApiClient` holds each POST until the test completes it: `held.next(body)` for a success, `held.error(...)` for a failure. The test releases a write with the hash it returns.

| Criterion (unit line) | Test (`markdown-editor.spec.ts` unless stated) | Pass condition |
|---|---|---|
| 1. Pause saves once after the debounce (25) | **T1.1** `a pause of 1.5 s after typing saves once`: insert `X` at the end of line 1; advance 1499 ms: no POST; advance 1 ms: one POST whose content is the inserted text. | Both checkpoints hold. Control M2 fails it. |
| 1. | **T1.2** `each keystroke restarts the debounce`: insert; advance 1000; insert again; advance 1000: no POST; advance 500: one POST holding both insertions. | Holds. |
| 1. Cmd/Ctrl-S saves at once | **T1.3** `Ctrl-S and Cmd-S save at once` (`it.each` over `{ctrlKey: true}` and `{metaKey: true}`): insert; dispatch `keydown` with key `s` and the modifier, bubbling, on `.cm-content`: one POST before any timer advance; advance 1500 ms: still one POST. | Both hold for both modifiers. |
| 1. Button saves at once | **T1.4** `the Save button saves at once`: insert; click Save: one POST at once; advance 1500 ms: still one. | Holds. |
| 1. (D16) | **T1.5a** `focus leaving the editor saves at once`: insert; dispatch `focusout` with `relatedTarget: null` on `.cm-content`: one POST at once. **T1.5b** `focus moving to Save does not save`: insert; dispatch `focusout` with `relatedTarget` set to the Save button: no POST. | Both hold. |
| 1. Saves during an in-flight save coalesce (25) | **T1.6** `saves during an in-flight save coalesce into one follow-up`: with `HoldingApiClient`: insert `X`; click Save (write 1 held); insert `Y`; advance 1500 ms (the debounce fires: pending); click Save (pending); dispatch Ctrl-S (pending). Still one POST. Release write 1 with hash `H1`: exactly one more POST, holding `X` and `Y`, with `baseHash` `H1`. Release it with `H2`; advance 5000 ms: no more POSTs. | Exactly two POSTs in total; the second has both insertions and `baseHash` `H1`. |
| 2. `unsaved → saving → saved` (26) | **T2.1** `the state moves unsaved, saving, saved`: with `HoldingApiClient`: insert: `saveStateChange` is `unsaved` and the status line reads "Unsaved changes"; click Save: `saving` and "Saving..."; release the write: `saved` and "Saved". | All three checkpoints hold. |
| 2. Failed write keeps the text (26) | **T2.2** `a failed write shows failed and keeps the text`: `fail('POST', WRITE_PATH, new ApiError(0, CLIENT_ERROR_CODES.NETWORK, 'Could not reach the server.'))`; insert; advance 1500 ms: state `failed`; the alert shows the message; the editor holds the insertion; dirty is `true`. Then type `Y`: the state stays `failed` (D8). Then `respond` a success with hash `H1`; click Save: the POST carries `baseHash` equal to `READ_HASH`, and the state is `saved`. | Each checkpoint holds. Control M11 fails it. |
| 2. Conflict never overwrites (26, 28) | **T2.3** `a conflict shows conflict and never overwrites`: `fail` the POST with `new ApiError(409, 'PROJECT_WRITE_CONFLICT', 'The file changed elsewhere.')`; insert; advance 1500 ms: state `conflict`; the status reads "Not saved: the file changed elsewhere"; the alert shows the message. Type `Y`; advance 5000 ms: the state is still `conflict` and there is one POST in total, with `baseHash` `READ_HASH`. Then click Save: one more POST, with the same base (D7). | Each checkpoint holds. Control M4 fails it. |
| 3. Navigating away prompts (27) | **unsaved-text.spec.ts T3.1** `navigating away with a save that fails prompts, and Cancel keeps the page`: fail the POST (network error); render `/draft` with the editor; insert `X`; spy `window.confirm` to return `false`; `navigateByUrl('/elsewhere')`: the URL is still `/draft`, `confirm` was called once, the editor holds `X`. Spy it to return `true` and navigate: the URL is `/elsewhere`. | Both hold. Controls M6 and M9 fail it. |
| 3. | **T3.2** `navigating away after a save that succeeds does not prompt`: succeed the POST; insert `X`; navigate to `/elsewhere`: `confirm` was not called, the URL is `/elsewhere`, and one POST carried `X`. | Holds. (Reading of criterion 3: open point 1.) |
| 3. Closing the tab prompts (27) | **T3.3** `closing the tab with unsaved text prevents the unload`: insert; dispatch `new Event('beforeunload', {cancelable: true})` on `window`: `defaultPrevented` is `true`. Save successfully; dispatch again: `defaultPrevented` is `false`. | Both hold. Control M7 fails it. |
| 3. Control | **T3.4** `a clean editor does not prompt on navigation or on close`: no edit; navigate to `/elsewhere`: `confirm` was not called; dispatch `beforeunload`: not prevented. | Holds. Passes on the stub too (section 3, step 2). |
| 4. The second save carries the first's hash (28) | **T4.1** `the second save carries the hash returned by the first`: respond the write with `H1`; insert; Save: `baseHash` is `READ_HASH`. Respond with `H2`; insert; Save: the second POST's `baseHash` is `H1`, neither `READ_HASH` nor `H2`. | Holds. Controls M3 fails it. |

Extra tests, from the decisions (not criteria):

| Test | Pass condition |
|---|---|
| **E1** `a reference change saves the old file first, then reads the new one` (D13): the one canned read answers both GETs (the fake keys canned answers by method and path, not by params, `test-doubles.ts` lines 48 to 51 and 90); insert in `drafts/ch01.md`; change the host's `reference` and call `detectChanges`. | `api.requests` is `[GET ch01 with params, POST ch01, GET ch02 with params]`, in that order. |
| **E2** `a reference change whose save fails asks; Cancel keeps the old file, and the next save writes to it` (D13): fail the POST; insert; spy `window.confirm` to return `false`; change the reference: `confirm` was called once; no GET for `ch02`; the alert shows the message. Respond a success; click Save. | `confirm` was called once, and the last POST's body has `path` `drafts/ch01.md` and `baseHash` `READ_HASH`. Controls M10 and M13 fail it. |
| **E3** `destroying the editor cancels a pending debounce` (D14): insert; `fixture.destroy()`; advance 1500 ms. | No POST after the destroy. Control M8 fails it. (SHL-13's tests leave armed timers behind; this test also guards them.) |

Controls (section 3, step 7). Each row is one mutation; the last column is the test that must fail.

| Control | Mutation | Must fail |
|---|---|---|
| M1 | Coalescing off: a trigger during a write starts a second write at once. | T1.6 |
| M2 | Debounce 1000 ms instead of 1500. | T1.1 |
| M3 | After a success, do not update `baseHash`. | T4.1, T1.6 |
| M4 | A `PROJECT_WRITE_CONFLICT` error gives `failed`, not `conflict`. | T2.3 |
| M5 | Keep the Save button disabled while saving (SHL-13's rule). | T1.6 |
| M6 | The guard returns `true` without flushing or prompting. | T3.1 |
| M7 | No `beforeunload` listener. | T3.3 |
| M8 | Destroy does not clear the timer. | E3 |
| M9 | `flush()` returns `true` at once, without waiting for the write. | T3.1 |
| M10 | Writes use the current `reference` input, not `loaded`. | E2 |
| M11 | An edit sets `unsaved` over `failed`. | T2.2 |
| M12 | No suspension in `conflict`: an edit arms the debounce as in any other state. | T2.3 |
| M13 | A reference change whose flush fails keeps the old file without asking. | E2 |

Each control is reverted before the next. Each control is also run against the eighteen SHL-13 tests, and any failure among them is recorded with the control.

## 5. Downstream agreement

- **SHL-13 (merged; changed here).** Three SHL-13 rules change: the Save button's saving disable (D9), the edit rule (D8), and the reference rule (D13). The `save()` method is replaced. The eighteen SHL-13 tests are not edited and pass. The read-only test (`markdown-editor.spec.ts` lines 204 to 211) still finds the button disabled, because D9 keeps the read-only disable. The round-trip fixtures and the line model are untouched (D18).
- **SHL-15 (layout, parallel; no plan yet).** Its rules, to be written into its plan: (a) it must not remove `<app-markdown-editor>` from the DOM while text is unsaved. A phone's edit/preview toggle hides the editor with CSS, or flushes first. Removing it with `@if` destroys the open text (D14), and `units/SHL-05-breakpoint-gate-nav.md` line 20 settles that an open view is not torn down. (b) It keeps the inputs `reference` and `saveMode` and the outputs unchanged. (c) It adds its markup outside the first `button` and the `role="status"` and `role="alert"` lines; the first `button` stays the Save button, which the SHL-13 spec selects. (d) Its tests go into its own `describe` after the SHL-14 block.
- **SHL-16 (merge view, parallel; no plan yet).** It does not use the editor or the registry. No change.
- **PST-34 (files editor adoption, `units/PST-34-files-editor-adoption.md`, no plan yet).** Its plan must: (a) attach `canDeactivate: [unsavedTextGuard]` to the route entry whose page hosts the editor (`filesRoutes` in `apps/web/src/app/features/project-store/project-store.routes.ts`, a PST-34 file), importing the guard from the Shell entry; (b) pass `reference` as `{projectId, path}` (the `EditorReference` interface, `markdown-editor.ts` line 38); (c) show its write-conflict warning through the `conflict` status line and the alert of D6 and D8, which keep the author's text and stay on screen because automatic writes are suspended in `conflict` (D7); a separate warning text is its own choice; (e) change the open file through the `reference` input (the `?path=` change), which flushes and, if the flush fails, prompts (D13); the route guard does not run on a query-parameter change; (d) keep the phone page without the editor, as `features/project-store/files-page.spec.ts` line 313 requires.
- **PST-10 (done).** Unchanged. Its page renders no editor on `main` (`features/project-store/files-page.ts` line 20 imports `MarkdownPreview` only).
- **SHL-19 (polish gate).** Its automated check of the editor (unit line 21) finds the status as `role="status"` (a polite live region), the alert as `role="alert"`, and the button named "Save". The leave prompt is the browser's `window.confirm` (open point 5). Its M7 byte check (`units/SHL-19-polish-gate.md` line 25) depends on D18 only.
- **SHL-18 (shortcuts; not blocked by SHL-14, `units/SHL-18-polish-about-shortcuts.md` line 7).** Its criterion "trigger save in the editor" (line 21) can document the editor's Ctrl/Cmd-S of D15. No change to SHL-14 is needed for it; a page-wide shortcut, if SHL-18 wants one, is SHL-18's.
- **"Compile & export manuscript editing"** (quoted in `unblocks`, `units/SHL-14-editor-saving.md` line 9). No unit id names it, so it is informative only (`units/README.md`, blocker notation). It would use the same component and guard.

## 6. Open points

1. **Settled (reviser): the reading of criterion 3 (D10, tests T3.1 and T3.2).** Flush first, then prompt only when the text is still unsaved. Source: the unit's own decisions. Line 19 makes "before route leave" a save trigger, and line 22 says the guard and the prompt "warn about unsaved text"; after the leave save succeeds the text is no longer unsaved, so no warning is due. "Prompts first" in line 27 means before the leave completes. The literal reading (prompt whenever text is unsaved at the click) would drop the line-19 save on a confirmed leave. A three-choice dialog is named by no unit. Not a Navigator point.
2. **Settled (reviser): the save-mode input has one value, `'direct'`, and no branch (D17).** Sources: `plans/DECISIONS.md` line 3629 (SHL-14 adds the input); SHL-14 line 18, `modules/shell.md` line 101, `units/README.md` line 134 and PST-34 lines 15 and 22 name direct save only; SHL-16 line 20 does not save. Not a Navigator point.
3. **Settled (reviser): conflict rules (D7).** Automatic writes are suspended in `conflict`; an explicit Save sends the same base; SHL-14 adds no resolution. Sources: SHL-14 line 21 needs only the state and no overwrite; PST-34 line 22 needs only the warning and the kept text; no unit and no line of `modules/shell.md` names a resolution. Not a Navigator point.
4. **Debounce value (D2).** 1500 ms exactly, where the unit says "~1.5 s idle". Tests at 1499 and 1500 ms pin it. Owner: planner (default), Navigator may change it.
5. **The prompt is `window.confirm` (D21).** It needs no new component. SHL-19's accessibility pass may want a dialog instead. Owner: SHL-19.
6. **An in-flight write and a destroyed editor (D14), and SHL-15's constraint (section 5 (a)).** The plan keeps an in-flight write alive after a destroy. SHL-15 must keep the editor rendered while text is unsaved. Owner: SHL-15's plan.
7. **No timeout in the guard.** A write that never answers holds the navigation. The browser's network failure arrives as status 0 and ends the wait. Owner: Navigator, if it wants a timeout.
8. **Ctrl-S is scoped to the component (D15).** A Ctrl-S while focus is elsewhere on the page is not caught. The unit names no wider scope. Owner: planner (default).
9. **The paste filter (SHL-13 open point 2, `plans/SHL-13.md` line 171).** Still open. It is not in SHL-14's criteria, so this plan does not add it. Owner: Navigator, to give it to SHL-14 or to a later unit.
10. **Closing SHL-13 open point 5 (D13).** The reference-change rule closes it for SHL-14, as `plans/SHL-13.md` line 174 asked. Owner: Navigator, to confirm the closure.
11. **Mac keyboard path (T1.3, step 11).** The tests use both `ctrlKey` and `metaKey` flags on a host listener, so they do not depend on the platform. The real Mac keyboard path is checked by hand, not by a criterion. Owner: the implementer's record.

## 7. Facts checked and assumed

### 7a. Facts checked (file and line at `6829135`, or the command)

- **F1.** `units/SHL-14-editor-saving.md`: front matter lines 1 to 10 (`blocked_by` line 7 is `[SHL-13]`; `parallel_with` line 8 is SHL-15 and SHL-16; `unblocks` line 9 is SHL-19, the quoted CEX entry and PST-34); "Why" line 15; "Decisions" lines 18 to 22; criteria lines 25 to 28, all unticked. No line of the unit records a change (no `Moved`, `Reworded`, `Loosened` or `Removed` note). [checked]
- **F2.** `modules/shell.md`: lines 3 (shared components, the lossless editor), 9 (consumers adopt a component at its merge), 11 (the editor wrapper and merge view need the core gate and the shared component), 29 (SHL-14 in the graph), 41 (after SHL-13, SHL-14 and SHL-15 in parallel), 85 (the editor row), 89 and 90 (testing principles), 101 (superseded list: the author's own typing saves straight to the file). [checked]
- **F3.** `units/SHL-13-editor-wrapper-lossless.md`: front matter lines 7 to 9; decisions lines 18 to 20 (inputs including the save mode, outputs, saving is SHL-14); criteria lines 23 to 25, all ticked. [checked]
- **F4.** Git: `main` at `6829135`; `7cc7601` (feat SHL-13) and `02eadc0` (docs, done); `plans/SHL-13.md` line 3 `status: done`; `git diff --stat ebdfe3a 6829135` lists `plans/DECISIONS.md` and `plans/QUEUE.md` only; `plans/QUEUE.md` line 72 says `SHL-14 | M3 | available: yes`. No `plans/SHL-14.md` existed before this file. [checked]
- **F5.** `apps/web/src/app/shell/markdown-editor.ts` (254 lines): `EditorReference` interface line 38; `SaveState` line 35; `WRITE_CONFLICT` line 44; `STATUS_TEXT` lines 46 to 53; `readOnlyExtensions` lines 54 to 56; `isWriteConflict` lines 58 to 60; template lines 69 to 82, with `[disabled]="readOnly() || saveState() === 'saving'"` at line 77; class line 84; inputs `reference` (85) and `readOnly` (86); outputs (87 to 90); `view` (95), `loadSub` (96), `saveSub` (97), `baseHash` (99), `savedText` (100); signals (102 to 104); constructor (106); effects (107 to 114); `onDestroy` (115 to 119); `save()` (123 to 152), its early return (125 to 131), the `documentText` read (133), the success handler (143 to 150) and the error handler (151); `load()` (155 to 175), `setError(null)` (159), the error handler (173); `createView` (177 to 189); `applyReadOnly` (191 to 195); `editorExtensions` (197 to 220), `keymap` (200), `updateListener` (214 to 218); `onDocumentChange` (222 to 231), the state rule (228 to 230); `reportError` (233 to 238); `setSaveState` (240 to 243); `setError` (245 to 248); `destroyView` (250 to 253). [checked]
- **F6.** `apps/web/src/app/shell/markdown-editor.spec.ts` (257 lines): `FIXTURES` line 19; `EditorHost` and its `@Component` (58 to 79); `render` (93 to 118); `saveButton` (124); `contentElement` (132); `writtenContent` (141); `save` (148); `insertAtLineEnd` (154 to 165); `describe` (167); the tests at 168 (`it.each`), 186, 195, 204, 213, 224 and 242. [checked]
- **F7.** `apps/web/src/app/shell/testing/test-doubles.ts` (199 lines): `FakeApiClient` (43); `readonly requests` (45, public); `respond` (49); `fail` (54); `get` (58); `post` (73, public and overridable); `answer` (84, private), which returns `of(canned.body)` at line 99. [checked]
- **F8.** `apps/web/src/app/shell/api-client.ts`: `ApiClient` interface (line 24); `parseResponse` (line 38, exported). `api-error.ts`: `CLIENT_ERROR_CODES` (line 4, with `NETWORK`); `ApiError` (line 10: status, code, details). `tokens.ts`: `API_CLIENT` (line 6). [checked]
- **F9.** `apps/web/src/app/shell/project-store-copies.ts`: `PROJECT_FILE_PATH` (77), `PROJECT_FILE_WRITE_PATH` (80), `projectFilePath` (84), `projectFileWritePath` (92), `readCopy` (119), `writeResultCopy` (146). [checked]
- **F10.** `apps/web/src/app/shell/markdown-document.ts` (28 lines): `dominantLineSeparator` (10), `documentExtensions` (18), `documentText` (26, `state.sliceDoc()`). [checked]
- **F11.** Contract: `packages/contracts/src/project-store/files.ts` line 33 (`fileReadSchema`), lines 42 to 46 (`fileWriteSchema`: `path`, `content`, optional `baseHash`), line 49 (`fileWriteResultSchema`); `errors.ts` line 13 (`WRITE_CONFLICT`), line 37 (the value list), line 66 (`PROJECT_WRITE_CONFLICT: 409`). [checked]
- **F12.** Server: `apps/api/src/modules/project-store/files.service.ts` line 96 (`TextDecoder` with `ignoreBOM: true`, so a BOM stays in `content`), line 272 (`write`), lines 284 to 287 (a `baseHash` that does not match throws `WRITE_CONFLICT`). [checked]
- **F13.** `apps/web/src/app/shell/index.ts` is 20 lines; line 14 exports `MarkdownEditor`. [checked]
- **F14.** Consumers: a search for `app-markdown-editor` and `MarkdownEditor` in `apps` and `packages` names only the Shell's `index.ts`, the component and its spec, and `apps/web/src/app/features/project-store/files-page.spec.ts` line 313 (no editor on a phone). `files-page.ts` imports `MarkdownPreview` (line 20). `apps/web/src/app/app.routes.ts` does not import the editor. [checked]
- **F15.** `apps/web/src/app/shell/active-project-guard.ts`: the only guard in the Shell, a `CanActivateFn` that reads `API_CLIENT` through `inject`. No `canDeactivate` exists in `apps/web/src`. [checked]
- **F16.** `vi.useFakeTimers()` is used at `apps/web/src/app/shell/sse-client.spec.ts` line 95; `RouterTestingHarness` is imported at `apps/web/src/app/shell/project-route.spec.ts` line 4. [checked]
- **F17.** Versions in the root `node_modules`: `@angular/core` and `@angular/router` 22.2.5, `vitest` 5.1.0, `rxjs` 7.8.2. `apps/web/package.json` lines 20 to 25 pin six `@codemirror` packages, `merge` among them (`state` 6.7.6, `view` 6.43.15). `@codemirror/view` and `@codemirror/state` are not installed in the root or in `apps/web` `node_modules` in this checkout (both were looked for). [checked]
- **F18.** Draft and planned plans: at `6829135`, `plans/AGL-02.md` (planned), `plans/GRR-01.md` (draft) and `plans/MPR-08.md` (planned) were the only plans with `status: draft` or `planned`; at `9cf0218` AGL-02 is done, and GRR-01 and MPR-08 remain (reviser, `grep -l '^status: \(draft\|planned\)' plans/*.md`). A grep for `apps/web`, `shell/`, `markdown-editor`, `index.ts`, `test-doubles` and `project-store-copies` finds none of them in a file of section 2. The branches `unit/AGL-02` and `unit/MPR-08` have no diff under `apps/web` against `main`. [checked]
- **F19.** `plans/DECISIONS.md`: line 3625 (the Navigator's decisions on SHL-13 open points 1, 3, 6 and 7); line 3629 (open point 6: SHL-14 adds the save-mode input); lines 4080 to 4091 (the PST-10 split into PST-34); lines 1084 to 1086 (the Shell ships no runtime zod). [checked]
- **F20.** `units/PST-34-files-editor-adoption.md`: line 7 (`blocked_by` names SHL-14), line 15 (direct save through `write` with `baseHash`), line 22 (the criterion). `units/SHL-05-breakpoint-gate-nav.md` line 20. `units/SHL-15-editor-layout-touch.md` line 19. `units/SHL-19-polish-gate.md` lines 21 and 25. `units/README.md` lines 134 and 136. [checked]
- **F21.** `plans/SHL-13.md`: line 18 (decision 2, inputs), line 38 (decision 12, reference change), line 158 (section 5: SHL-14 removes the saving disable), line 171 (open point 2, paste), line 174 (open point 5, reload). [checked]

### 7b. Things assumed

- **A1.** The host bindings `(keydown)` and `(focusout)` receive the events that bubble from CodeMirror's `.cm-content`, because CodeMirror does not stop propagation for keys and focus changes it does not handle. Not checked: `@codemirror/view` is not installed here. Tests T1.3 and T1.5 check it.
- **A2.** jsdom supports `FocusEvent` with `relatedTarget`, `KeyboardEvent` with `ctrlKey` and `metaKey`, and `new Event('beforeunload', {cancelable: true})` reaches a `window` listener of an Angular host binding `(window:beforeunload)`.
- **A3.** `vi.spyOn(window, 'confirm')` replaces `window.confirm` in the jsdom runner (the browser's own dialog is not reached).
- **A4.** The router runs `canDeactivate` on a navigation away from the route, and the guard runs in an injection context, so `inject` works in it. Tests T3.1 and T3.2 check it.
- **A5.** `vi.useFakeTimers()` replaces the global `setTimeout` that the component calls. The `sse-client.spec.ts` pattern suggests so; T1.1 checks it.
- **A6.** The fake client's `answer` is synchronous (`of(canned.body)` at `test-doubles.ts` line 99), so a write completes inside the call. The consequence (D11) is designed for it, and E2 and T3.1 check it.
- **A7.** `npx ng test --include <file>` runs one spec file in the Angular unit-test builder. Confirmed in step 2 with `npx ng test --help`.
- **A8.** The reference-change effect runs during change detection, after `fixture.detectChanges()` (SHL-13 A5 assumes the same).
- **A9.** Angular's zoneless scheduling needs one `fixture.detectChanges()` after a timer or an event before a DOM read (SHL-13 A6 assumes the same).

## 8. Shared files: other plans and the units that come after

- **Draft and planned plans** (`plans/AGL-02.md`, `plans/GRR-01.md`, `plans/MPR-08.md`): none changes a file of section 2 (F18). No change is needed for either order.
- **Units with no plan that will change a shared file**: SHL-15 (`markdown-editor.ts` and its spec, and a layout around the editor), SHL-16 (a new merge component and one line of `shell/index.ts`), and PST-34 (`project-store.routes.ts`). Each order is correct under these rules:
  - `shell/index.ts`: each unit appends after the last line on `main` at its merge time and keeps the others. SHL-14 adds one line; SHL-15 and SHL-16 each add theirs after it, or before it.
  - `markdown-editor.ts`: SHL-14 changes the class (section 2b) and the button line (line 77). SHL-15 adds markup outside the button and the status and alert lines. Either merge keeps both, as long as SHL-15 keeps the editor rendered while text is unsaved (section 5 (a)).
  - `markdown-editor.spec.ts`: SHL-14 adds its `describe` block after line 257 and changes `render` only by an optional argument. SHL-15 adds its own block after SHL-14's. Neither edits the other's tests.
  - `project-store.routes.ts`: PST-34 adds a `canDeactivate` entry to a route. SHL-14 adds no route, so either order is correct.

## 9. Summary of the commitments

- One new file, `unsaved-text.ts` (the registry and the `unsavedTextGuard`), with its spec; one export line in `shell/index.ts`.
- `MarkdownEditor` gains: a 1500 ms debounce; explicit, blur and leave triggers; one write in flight with one follow-up; `failed` and `conflict` kept until a write succeeds; the Save button enabled while saving; the beforeunload prompt; the reference-change flush; and the `saveMode` input (one value).
- Nineteen new test cases: fifteen in `markdown-editor.spec.ts` (criteria 1 to 4 and three extras) and four in `unsaved-text.spec.ts` (criterion 3 and one control), with thirteen controls, M1 to M13.
- The eighteen SHL-13 tests stay unedited and pass.
- Two commits on `unit/SHL-14` in the implementation stage. This plan changes only `plans/SHL-14.md`.

## 10. Review parts

Each step of section 3 and each test of section 4 is in exactly one part.

**Part 1: base, tests first, the registry and the guard, the barrel.** Steps 0, 1, 2, 3 and 5. Tests: T3.1, T3.2 and T3.4 (`unsaved-text.spec.ts`; criterion 3, route leave and the clean control). Decisions: D10, D11 (as the guard uses it), D19, D20, D21. The reviewer of this part also checks that the code changes only the files of section 2 (2a, 2b) and none of section 2d.

**Part 2: the editor's saving, the checks and the record.** Steps 4, 6, 7, 8, 9, 10, 11 and 12. Tests: T1.1, T1.2, T1.3, T1.4, T1.5a, T1.5b, T1.6 (criterion 1); T2.1, T2.2, T2.3 (criterion 2); T3.3 (criterion 3, closing the tab); T4.1 (criterion 4); E1, E2, E3; controls M1 to M13. Decisions: D1 to D9, D11 to D18.

## 11. Corrections by the reviser (revision 2)

- Open points 1, 2 and 3 settled from the unit text, the module file and `plans/DECISIONS.md` (section 6); none needs the Navigator.
- D7: sources and the reason for the suspension (the warning PST-34 needs stays on screen) added; no resolution in SHL-14.
- D10: criterion 3 read with unit lines 19 and 22.
- D13: a reference change whose flush fails now asks the prompt (OK reads the new file, Cancel keeps the old one). Without it a file in `conflict` could not be left inside one route, and PST-34's `?path=` change does not run the route guard. E2 changed to spy the prompt; control M13 added.
- D17: the one-value `saveMode` input has no branch (dead code removed); sources named.
- D21: one function, `confirmUnsavedLeave`, used by the guard and by D13; section 2a lists it.
- D11 and section 2b: an explicit save and a flush clear the debounce timer.
- Control M12 added for D7.
- E1: the fake answers by method and path, not by params, so one canned read answers both GETs.
- `HoldingApiClient` parses a held body with `parseResponse` (`api-client.ts` line 38).
- D5: `files.service.ts` lines 283 to 287 (the `if` begins at line 283).
- Section 5: PST-34 rule (e) for the `?path=` change; a note on SHL-18's save shortcut.
- F18 and the header: base at `9cf0218`; AGL-02 is done.
- No unit file changed.
