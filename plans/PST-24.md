---
id: PST-24
status: draft
title: Byte-safe file write — optional base64 bytes field on write, stored without the UTF-8 encode
module: project-store
---

# PST-24 plan — byte-safe file write

Project store, phase:files, M5. Unit `units/PST-24-byte-safe-file-write.md`. Blocked by PST-06, `status: done` (`plans/PST-06.md` line 3). Base: `main` at `de2a44a` (the draft was written at `82fde43`; the only later commit is this plan's draft, so no cited line moved), clean tree. Written by the planner and corrected by the reviser: nothing was built, installed, run or tested. Every code citation was read on `main` with read-only commands, and the reviser re-checked each **Checked** fact. The unit's one criterion stays unchecked until the implementation is reviewed.

Tags: **Checked** means read in the repository, with file and line. **Assumed** means not verified here (section 2b). **Choice** means a decision of this plan, with its reason (section 1b).

## 1. Decisions the plan obeys

### 1a. Settled by the unit, the module, DECISIONS, the units README or PST-06

- **D1 Field and bytes (unit lines 23 to 25).** An optional base64 string `contentBase64`. Absent, the write is exactly PST-06's. The bytes path is for other modules' copy operations. A file stored through it that is not valid UTF-8 text reads as binary: `decodeText` gives undefined, the read refuses it with `PROJECT_NOT_TEXT`, and it still appears in `list`.
- **D2 Scope (unit lines 18 to 20).** `fileWriteSchema` gains the field. `commit` writes the decoded bytes atomically (temp file in the same folder, then rename). The size cap applies to the decoded bytes. The project.yaml guard, the `files-changed` event, the hash over the stored bytes and the read path do not change.
- **D3 Content (unit line 26).** `content` is unchanged in the schema. How it is treated when `contentBase64` is present is settled by this plan (choice P2).
- **D4 Criterion (unit line 29).** One criterion, quoted in section 5. Nothing here weakens it.
- **D5 Out of scope (module line 68).** Binary files: read and list stay text-only; "a byte-safe write exists for other modules' copy operations, PST-24". This is the line narrowed by Navigator decision O1. The narrowed text is line 68; line 69 is "Stable draft IDs".
- **D6 Module rules the write keeps.** GETs never mutate (module line 46). Atomic writes: temp file in the same folder, then rename, missing parents created (module line 51). No import of another module's implementation (line 52). The in-process provider goes through the same checks as HTTP (line 53). Tests are external behaviour on a temp library and never read `examples/` (lines 56, 57, 59).
- **D7 Hash (module line 50; PST-06 plan section 1a, S5).** `sha256:` plus the lower-case hex SHA-256 of the file's bytes. The module's words say "of the file's UTF-8 bytes"; the code hashes the raw bytes. The bytes path follows the code (choice P4; inconsistency I2).
- **D8 Contract change (units README line 137).** A published contract changes by expand–contract. An optional field is an expansion.
- **D9 Agent and recipe writes (units README line 138; unit line 24).** They stay pending changes (PST-15). The bytes field is for author actions only.
- **D10 Navigator decision O1 (`plans/DECISIONS.md` lines 6732 and 6733).** Option (a): a byte-safe Project store write, as PST-24. Reason: the text API carries a string and `commit` writes UTF-8, so the built-in DOCX (608 NUL bytes, per the orchestrator's check at line 6733) cannot survive a text round trip. Options (b) and (c) were rejected.
- **D11 What PST-06 settled and the write keeps (`plans/PST-06.md` section 1a).** S6 read refusals (413 over the cap, 415 not text). S7 a stale `baseHash` gives 409 `PROJECT_WRITE_CONFLICT`. S10 `project.yaml` is validated before a write. S11 a too-new `project.yaml` is refused. S12 `files-changed` after the rename.

### 1b. This plan's choices

- **P1 Field shape.** `contentBase64: z.string().regex(BASE64_PATTERN).optional()`. `BASE64_PATTERN` is canonical padded base64: a length that is a multiple of 4, with `==` or `=` padding allowed only at the end. The empty string is allowed and means a zero-byte file. Reason: Node's `Buffer.from(s, 'base64')` silently skips characters it does not know, so without the pattern the stored bytes would not be the bytes the caller sent. The pattern is a module-private constant in `files.ts`, beside the schema.
- **P2 `content` when `contentBase64` is present: ignored.** It is not read, not stored and not checked beyond its type. It stays required in the schema, so a caller sends `content: ""`. Reason: the unit says `content` is unchanged and that the schema "gains an optional field" and nothing else. The other option (required empty) would add a rule the unit does not state. A caller that sends text in both fields gets the bytes; B5 checks it.
- **P3 A bytes write to the root `project.yaml` is refused** with `PROJECT_INVALID` (422), message `PROJECT_MESSAGES.INVALID`, no details. Reason: the YAML guard works on text (`files.service.ts` line 533); it cannot check a binary `project.yaml`; and the root `project.yaml` is changed in-process only through `updateProjectYaml` (line 402), which keeps the comments.
- **P4 `baseHash` for a bytes write is checked exactly as for text.** The same lines (283 to 288) compare `baseHash` with `hashOf(disk)`, the hash of the raw disk bytes. No change.
- **P5 Bytes reach the disk through `writeText`, not around it.** `writeText` (line 154) already accepts `string | Buffer` and does no encoding of its own: it calls `writeFileAtomic` (`atomic-write.ts` line 6, also `string | Buffer`) and maps `ENOTDIR`, `EEXIST` and `EISDIR` to the path refusal (lines 162 to 164). The only UTF-8 encode on the write path is a string passed to it (line 528, and line 543 with a string argument, as DECISIONS line 6733 names them). Passing the decoded Buffer bypasses that encode at both lines. Reason: the unit's Scope (line 19) asks for the write "atomic, temp file in the same folder + rename, as for text", and a direct call to `writeFileAtomic` would either copy the errno mapping or turn a path that runs through a file into an unmapped 500. The Scope's "bypassing the UTF-8 encode (...) and `writeText`" is met in its purpose, no UTF-8 encode of the bytes; it is not a criterion or a module decision. Open point O3, decided.
- **P6 The 5 MiB cap** (`FILE_SIZE_CAP_BYTES`, `constants.ts` line 23) is checked on the decoded byte length in `commit` (line 529), as now.
- **P7 PST-23 interplay.** A bytes payload is never migrated or rewritten (section 6.2, rule R1).
- **P8 Test seam for "a subsequent read returns undefined".** The test asserts the public refusal, `PROJECT_NOT_TEXT` (415), which is what the read does with the undefined of `decodeText` (lines 262 to 264). The unit's own Decision (line 25) states this meaning: "`decodeText` returns undefined, so the read refuses it with `PROJECT_NOT_TEXT`". Neither the HTTP read nor the in-process `read` (line 257, return type `FileRead`) can return undefined, so the criterion's "(binary is not text)" is observed only as that refusal. The module forbids asserting private helpers (module line 56). The criterion is satisfied as written; no criterion change is needed. Open point O4, decided.
- **P9 Names.** Test file `apps/api/test/project-store-files-bytes.test.ts`. Test IDs `B1` to `B5`; no `B` ID exists in the project-store tests (checked with grep). Fixture path `reference.docx` at the project root, as CEX-14 suggests (`units/CEX-14-template-overrides-settings.md` line 17).

## 2. Facts checked and facts assumed

### 2a. Checked

- **C1 Unit.** Front matter: `phase: phase:files` (line 5), `blocked_by: [PST-06]` (line 7), `unblocks: []` (line 9). Scope lines 17 to 20. Decisions lines 22 to 26. The one criterion is at line 29.
- **C2 `fileWriteSchema` on main.** `packages/contracts/src/project-store/files.ts` lines 42 to 46: `path` at 43, `content: z.string()` at 44 (required), `baseHash` at 45. The brief cited line 43 for `content`; the correct line is 44. `contentBase64` is absent on main (grep over `apps` and `packages` finds none). The `FileWrite` type is at line 81.
- **C3 Users of the schema.** `fileWriteSchema` is used only by the write route: `apps/api/src/modules/project-store/files.controller.ts` line 15 (import) and line 63 (`ZodValidationPipe(fileWriteSchema)`). Propose (PST-15) has its own schema, so it is unaffected.
- **C4 `write()`** (`files.service.ts` lines 272 to 290): path resolved (274); a directory is refused (275 to 277); a too-new disk `project.yaml` is refused on its text (278 to 282); the `baseHash` check compares `hashOf(disk)` (283 to 288); then `this.commit(project, target, request.content)` (289).
- **C5 `commit()`** (lines 523 to 555): `content: string` (526); `Buffer.from(content, 'utf8')` (528); the cap on the bytes (529 to 531); the project.yaml guard on the text, `readYamlState(content)` at 533, too-new at 534, invalid with `PROJECT_INVALID` at 535 to 541; `writeText(target.realPath, content)` (543); `hashOf(bytes)` (554).
- **C6 Atomic write.** `writeText` (lines 154 to 166) accepts `string | Buffer`; errno mapping at 162 to 165. `writeFileAtomic` (`apps/api/src/modules/project-store/atomic-write.ts` line 6) accepts `string | Buffer`; it creates the folder (7), writes `${target}.tmp` (8, 10), and renames (11).
- **C7 Hash.** `hashOf` (`files.service.ts` lines 87 to 89) takes a Buffer. The read hash (268) and the write hash (554) are over the raw bytes.
- **C8 `decodeText`** (lines 93 to 102): undefined when a byte is 0 (94); a fatal UTF-8 decode (96 to 98); undefined on error (99 to 101). The BOM is kept (91 to 92).
- **C9 Read refusal.** `read()` (257 to 269): undefined gives `PROJECT_NOT_TEXT` (262 to 264). The code is `packages/contracts/src/project-store/errors.ts` line 10; its status, 415, is at line 63.
- **C10 Other codes** (`errors.ts`): `PROJECT_INVALID` is line 19, status 422 at line 72. `PROJECT_WRITE_CONFLICT` is 409 (line 66). `PROJECT_FILE_TOO_LARGE` is 413 (line 64). `PROJECT_MESSAGES.INVALID` is at `apps/api/src/modules/project-store/projects.service.ts` line 42; `files.service.ts` imports it (line 44).
- **C11 Other callers of `commit`.** `edit` (319 to 323) and `updateProjectYaml` (427 to 431) pass strings. `updateProjectYaml` starts at 402 and reads its text at 408 to 412.
- **C12 Cap.** `FILE_SIZE_CAP_BYTES = 5 * 1024 * 1024` (`packages/contracts/src/project-store/constants.ts` line 23).
- **C13 PST-06 is done.** `plans/PST-06.md` line 3, `status: done`. Section 1a items S5 to S12 list the hash, the refusals, the stale base, the atomic write, project.yaml, the too-new refusal and the events that the write keeps.
- **C14 PST-23.** `units/PST-23-lazy-migrations.md` line 7, `blocked_by: [PST-16]`. Decisions line 20 (a migrator registry), line 21 (migration "on their first write through the module (write/edit/apply/restore)"), line 22 (a GET returns an upgraded view), line 23 (backups to `<project>/.scriba/backups/`). Criteria: line 30 (a too-new file is refused for read and write), line 32 (a test migrator for another kind runs on that file's first write). No `plans/PST-23.md` exists (`ls plans`).
- **C15 CEX-14.** `units/CEX-14-template-overrides-settings.md` line 7, `blocked_by: [CEX-03, CEX-10, CEX-11]` (no PST-24). Line 17: the copy default goes through the Project store file API. Line 21: criterion 2, copy default writes the built-in file.
- **C16 DECISIONS.** The O1 entry is at 6730. Decision at 6732, reason at 6733, pending unit changes at 6735. "Not applied" (the CEX-14 `blocked_by`, its plan and the `unblocks` inverse) is at 6741; "Applied separately" (PST-24 created, module line 68 narrowed) is at 6742. The PST-23 backup path change, pending, is at 4041. Precedent for a late unit in `phase:files`: PST-34, lines 4083 (PST-12 does not wait on it) and 4090 (phase table note).
- **C17 Body size, as stated in DECISIONS.** Lines 513 to 515: a 100 KB default body limit; a text save over it gets 413; a known gap until PLT-04 is revised. Checked in DECISIONS only; the code is Assumed (A1).
- **C18 Units README.** Line 97: the gate of `phase:files` is PST-12, and its note says "PST-12 (the gate) does not wait on PST-24 or PST-34". Line 98 (added by commit `bebba1a`): a PST-24 row that also names `phase:files`, at M5, with PST-24 as its gate (inconsistency I1). Line 62: an external dependency names the gate unit in its string, e.g. `"Project store phase:files (PST-12)"`. Line 137: expand–contract. Line 138: agent and recipe changes are pending.
- **C19 Build and package.** `packages/contracts/dist` is not tracked (`git ls-files packages/contracts/dist` lists nothing). `packages/contracts/package.json` exports (lines 5 to 8) point at `dist`. Its build script is at line 48. `apps/api/package.json`: `test` runs `npm run build` first (line 7); `build` is a type check of `tsconfig.build.json` and `tsconfig.json` (line 6); `apps/api/tsconfig.json` line 8 includes `test`, so the build type-checks the test files. Root `test` runs every workspace's tests (root `package.json` line 25). Root `lint` runs `prettier --check .` (root `package.json` line 26).
- **C20 Test kit.** `apps/api/test/project-store-files.kit.ts` exports `bookLibrary` (line 44), `sha256Of` (line 60, takes `string | Buffer`), `readFile` (98) and `writeFile` (112, body typed `FileWrite`); it imports `FilesService` (line 27). `apps/api/test/project-store-projects.kit.ts` exports `withProjectsApp` (89), `readJson` (127), `errorOf` (131); `ProjectsLibrary` has `library` and `remove()` (lines 19 to 23). Existing tests: W1 at `project-store-files-write.test.ts` line 31, W3 at 134, X1 at 273; the binary-read test R2 at `project-store-files-read.test.ts` line 32 already checks 413 or 415.
- **C21 Validation.** `ZodValidationPipe.transform` calls `schema.parse` (`apps/api/src/modules/platform/errors/zod-validation.pipe.ts` lines 5 to 10). `PLATFORM_VALIDATION_FAILED` has status 400 (`packages/contracts/src/platform/errors.ts` lines 37 and 45).
- **C22 Zod version.** `zod` is `^4` in `apps/api/package.json` (line 21) and `^4.6.7` in `packages/contracts/package.json` (line 53).

### 2b. Assumed (not verified here)

- **A1** The 100 KB body limit (C17) applies to `POST .../file/write`. I did not find a parser setting in `apps/api/src/bootstrap.ts` (a grep for json and limit finds none). Consequence: an HTTP bytes write is limited to about 75 KB of binary, and the 5 MiB cap is reachable only in-process. CEX-14 is in-process, so this does not bind it.
- **A2** `writeFileSync(path, string)` writes the same bytes as `writeFileSync(path, Buffer.from(string, 'utf8'))`, Node's default encoding. Checked at step 5 by the existing text tests (with the plan, the text path also passes a Buffer, line 543).
- **A3** The API tests import the contracts through `dist` (C19), so `dist` must be rebuilt after the schema change (step 3).
- **A4** A `ZodError` from the pipe reaches the client as `PLATFORM_VALIDATION_FAILED` (400) through the platform filter. Checked by B4.
- **A5** The built-in DOCX is 11,589 bytes with 608 NUL bytes (DECISIONS line 6733, the orchestrator's check). Not re-checked here. Its base64 is about 15.5 KB, inside the cap.

## 3. Files to change

| File | Change | Why |
|---|---|---|
| `packages/contracts/src/project-store/files.ts` | Add an unexported `BASE64_PATTERN` above `fileWriteSchema` (line 42). Add `contentBase64: z.string().regex(BASE64_PATTERN).optional()` to the schema after `baseHash` (line 45). Extend the comment at line 41. `content` (44) and `baseHash` (45) do not change. The `FileWrite` type (81) gains the field. | D1, D8, P1, P2 |
| `apps/api/src/modules/project-store/files.service.ts` | (a) `write()`, line 289: pass `request.contentBase64 === undefined ? request.content : Buffer.from(request.contentBase64, 'base64')`. Lines 272 to 288 do not change. (b) `commit()`: the parameter becomes `content: string \| Buffer` (526). Replace line 528 with `const bytes = typeof content === 'string' ? Buffer.from(content, 'utf8') : content;`. The cap at 529 uses `bytes.length`. In the project.yaml branch (532), before line 533, add `if (typeof content !== 'string') throw refuse(PROJECT_ERROR_CODES.INVALID, PROJECT_MESSAGES.INVALID);` (P3). Line 543 becomes `writeText(target.realPath, bytes)`. Line 554 `hashOf(bytes)` does not change. (c) Add one line to the comment at 521 to 522 about the bytes path. | D2, P3 to P6 |
| `apps/api/test/project-store-files-bytes.test.ts` (new) | Test B1 (the criterion) and B2 to B5 (checks of P1 to P3). Uses the kit (C20). | section 5 |
| `packages/contracts/dist/` | Rebuild only, with `npm run build` in `packages/contracts`. Untracked (C19); not committed. | A3 |

No other file changes. In particular: not the unit, the module, `plans/DECISIONS.md`, `units/README.md`, the PST-23 or CEX-14 files, the Shell, the Agent loop, or any worktree.

## 4. Procedure

Each step is small and has a check. The implementer works on branch `unit/PST-24`, cut from `main`, and does not work on `main`.

1. **Baseline.** In `packages/contracts`, `npm test` exits 0. In `apps/api`, `npx vitest run test/project-store-` passes. Record the counts. Check: exit 0 and the counts.
2. **Red test first.** Create `apps/api/test/project-store-files-bytes.test.ts` with B1 to B5 (section 5). Run it with `npx vitest run test/project-store-files-bytes.test.ts` in `apps/api` (vitest does not type-check; `npm test` and `npm run build` would fail here, because `writeFile`'s body is typed `FileWrite` and does not yet have `contentBase64`, C19 and C20). Check: on the baseline, B1 fails, because zod strips `contentBase64` and `''` is stored, so the hash (step 2a) and the bytes differ. Record the failure text. B2 to B5 may pass or fail on the baseline; record which.
3. **Contract.** Change `files.ts` as in section 3. Check: `npm run build` in `packages/contracts` exits 0, and `grep -n contentBase64 packages/contracts/dist/project-store/files.d.ts` finds the field.
4. **Write path and commit.** Change `write()` at line 289 as in section 3 (a), and `commit()` as in section 3 (b) and (c). The two changes are one step, because the type check passes only with both. Check: `npm run build` in `apps/api` exits 0, and `npx vitest run test/project-store-files-bytes.test.ts` passes B1 to B5.
5. **Text path unchanged.** Run `npx vitest run test/project-store-files` in `apps/api`. Check: every test passes, and the count is the step 1 count for those files plus the five new tests. The text paths are covered by W1 to W5 and X1 (`project-store-files-write.test.ts`), R2 (`project-store-files-read.test.ts`) and the atomic test.
6. **Whole project store.** Run `npx vitest run test/project-store-` in `apps/api`. Check: all pass.
7. **Repo gate.** Run `npx eslint` and `npx prettier --check` on the three changed files, then root `npm test`. Check: each exits 0. If a failure is outside project-store, record its name and stop; do not change that code.
8. **Scope.** Run `git status --short` and `git diff --stat`. Check: only `files.ts`, `files.service.ts` and the new test file are changed, and no other tracked file.
9. **Hand-off.** Commit the three files by path on `unit/PST-24`. Review and merge are the orchestrator's. Check: `git show --stat HEAD` lists exactly those three files.

## 5. Acceptance criteria and tests

The unit has one criterion (unit line 29), word for word:

> A write with the byte-safe field stores the exact bytes (round-trip equality), and a subsequent read returns undefined (binary is not text).

Count: one criterion, one test (B1). Test seam: the composed app over HTTP, on a temp library (module line 57, the default).

**B1** — "B1: a write with contentBase64 stores the exact bytes (round-trip equal on disk, hash of those bytes), and the read of that file is refused as PROJECT_NOT_TEXT"

Exact check:

1. `const fixture = bookLibrary();` and `const payload = Buffer.from(Array.from({ length: 256 }, (_, i) => i));`. The payload holds every byte value from 0x00 to 0xFF, so it contains 0x00 and bytes that are not UTF-8.
2. Inside `try { ... } finally { fixture.remove(); }`, within `withProjectsApp(fixture, async (app, cookie) => { ... })`:
   a. `const res = await writeFile(app, cookie, 'book', { path: 'reference.docx', content: '', contentBase64: payload.toString('base64') });` Then `expect(res.status).toBe(200)` and `expect(readJson<FileWriteResult>(res).hash).toBe(sha256Of(payload))`.
   b. `expect(Buffer.compare(readFileSync(join(fixture.library, 'book', 'reference.docx')), payload)).toBe(0);` This is the round-trip equality on disk.
   c. `const read = await readFile(app, cookie, 'book', 'reference.docx');` Then `expect(read.status).toBe(415)` and `expect(errorOf(read).code).toBe('PROJECT_NOT_TEXT')`.

On the baseline, step 2a fails. Imports: `readFileSync` from `node:fs`, `join` from `node:path`, `FileWriteResult` from the contracts subpath. The test reads no file under `examples/` (module line 59).

**Supporting checks** (not criteria; each checks a choice of section 1b; they do not change the count of one criterion):

- **B2** (P3): `writeFile` with `path: 'project.yaml'` and a valid base64 body gives 422 `PROJECT_INVALID`, and `project.yaml` on disk is unchanged.
- **B3** (P4): a bytes write whose `baseHash` is not the disk hash gives 409 `PROJECT_WRITE_CONFLICT`, and the disk is unchanged.
- **B4** (P1, A4): `contentBase64: 'AAE=!'` gives 400 `PLATFORM_VALIDATION_FAILED`, and no `reference.docx` is created.
- **B5** (P2): `content: 'ignored'` with `contentBase64: 'AAE='` gives 200, and the disk bytes equal `Buffer.from([0, 1])`.

## 6. Agreement with downstream units and PST-23

### 6.1 CEX-14 (not yet blocked by PST-24)

- CEX-14 line 7 names no PST-24 today. PST-24 keeps `unblocks: []`, which matches C16 (DECISIONS 6741 and 6742). The change belongs to the Navigator (open point O2).
- If the Navigator allows it, CEX-14's `blocked_by` could gain a quoted entry in the form used for a named unit outside the module (PST-34 precedent, DECISIONS commit `7fa462c`): `"Project store byte-safe write (PST-24)"`, and PST-24's `unblocks` the inverse, `"Compile & export templates (CEX-14)"`. These texts are a suggestion only. CEX-14 is in the pipeline (`plans/CEX-14.md` exists), so no reviser of PST-24 may change it, and this plan does not change either file. The change waits for the Navigator's answer to the open question (DECISIONS lines 6738 to 6743).
- What CEX-14 uses from PST-24: the in-process `FilesService.write` (module line 53), with the chosen project path, `content: ''` and `contentBase64` of the built-in file. Its criterion 2 (CEX-14 line 21) rests on B1's round trip. The in-process route is not bound by A1.

### 6.2 PST-23 (no plan yet; it may touch the same path)

**The change PST-24 makes on that path:** in `write()`, the argument to `commit` (line 289) becomes `string | Buffer`. In `commit()`, the parameter becomes `string | Buffer`; the byte source (528), the cap (529), the project.yaml branch (532) and the `writeText` call (543) change. The disk-side checks (lines 278 to 288: directory, too-new disk `project.yaml` on its text, `baseHash`) do not change.

**Rules that PST-24 sets for PST-23, in either merge order:**

- **R1.** A bytes payload is never migrated, rewritten or transformed. The incoming bytes are the caller's exact bytes; B1 checks the round trip. A PST-23 migrator runs only on a string payload, which is the text path that exists today.
- **R2.** The disk-side checks run for both payloads in the same order. A too-new file on disk is refused for a bytes write too; PST-23's criterion (line 30) asks for that refusal on write. PST-24 does not block a PST-23 hook placed in those lines.
- **R3.** PST-23's backup and log line (its Decisions lines 21 and 23) apply to a migration of the disk file. The copy itself triggers neither, and PST-24 adds neither.

**Merge order A (PST-24 first):** PST-23's planner keeps R1 to R3 when it adds its hook. If the hook is placed in `commit`, it takes the string branch only.

**Merge order B (PST-23 first):** the PST-24 implementer rebases. The conflict is in the signature lines and the `writeText` call. The text branch is unchanged, so the hook still runs for text. R1 holds by construction, because the bytes branch never reaches the text hook.

Neither order needs a `blocked_by` change: PST-23 is blocked by PST-16 only (C14) and PST-24 by PST-06 only (C1). `parallel_with: []` stays as the unit has it.

### 6.3 PST-06 and the rest of the file API

`read`, `list`, `edit`, `delete`, `move`, `updateProjectYaml` and `appendLog` do not change. `edit` and `updateProjectYaml` pass strings (C11), which is the text branch.

### 6.4 Shell, fakes and propose

The contract grows by one optional field (D8), so the Shell's fake API and typed fakes need no change. Propose (PST-15) does not use `fileWriteSchema` (C3), and agent and recipe writes stay pending (D9).

## 7. Open points

All four points are decided at plan level by the reviser. None changes a criterion, a settled module decision or a unit, and none holds the implementation.

- **O1 (decided: no change needed by this plan).** `units/README.md` line 98 gives `phase:files` a second row (M5, gate PST-24), while line 97 names PST-12 as the gate of the same phase. The tension does not affect any blocker: line 97's note already says PST-12 does not wait on PST-24, and an external dependency names its gate unit in its string (README line 62), so `"Project store phase:files (PST-12)"` stays unambiguous. The unit keeps `phase: phase:files` and the gate of the phase stays PST-12 (PST-34 precedent, DECISIONS 4083 and 4090). Merging line 98 into line 97 is a README correction for a later step (I1); this plan does not make it and does not depend on it.
- **O2 (decided: not applied; waits on the already-open Navigator question).** The CEX-14 `blocked_by` change and PST-24's `unblocks` (DECISIONS 6741 and 6742) are not applied. CEX-14 is in the pipeline (`plans/CEX-14.md`, `status: draft`). PST-24 keeps `unblocks: []`. The implementation is not held by it (section 6.1).
- **O3 (decided: keep `writeText`, P5).** `writeText` does no encoding (lines 154 to 165); the UTF-8 encode is the string argument at lines 528 and 543, which the bytes path no longer passes. Keeping `writeText` gives the bytes the same atomic write and the same path refusals as text, which the Scope asks for ("as for text", unit line 19). The unit text is not changed (I4).
- **O4 (decided: assert the public refusal, P8).** The unit's Decision line 25 defines the criterion's "returns undefined (binary is not text)" as the read's refusal with `PROJECT_NOT_TEXT`. B1 asserts 415 `PROJECT_NOT_TEXT`. No criterion change is needed; the module's line 56 forbids asserting `decodeText`.

Choices made here without an open question, recorded in section 1b: P1, P2, P3, P4, P6, P7, P9.

### 7b. Inconsistencies found in unit and module files (not fixed)

- **I1** `units/README.md` lines 97 and 98: two rows name `phase:files`, with gates PST-12 and PST-24 (see O1). A README correction for a later step; not made here.
- **I2** `modules/project-store.md` line 50: "Hashes everywhere are `sha256:` + lowercase hex SHA-256 of the file's UTF-8 bytes." The code hashes the raw bytes: `hashOf` takes a Buffer (`files.service.ts` lines 87 to 89); the read hashes the bytes read from disk (268) and the write the bytes it stores (554). PST-06 settled "of the file's bytes" (`plans/PST-06.md` S5), and the unit says "`hashOf` over the stored bytes" (line 20). For a UTF-8 text file the two readings give the same hash; for a file stored through the bytes path, which need not be UTF-8, only the raw-bytes reading applies. The bytes path follows the code and the unit. Checked by the reviser. A module file is the Navigator's to change; not changed here, and the plan does not depend on it.
- **I3** `units/PST-23-lazy-migrations.md` line 23 names `<project>/.scriba/backups/`. `plans/DECISIONS.md` line 4041 records a pending change to `.scriba/project-store/backups/`, not applied. PST-23 has no plan yet.
- **I4** `units/PST-24-byte-safe-file-write.md` line 19 ("bypassing ... `writeText`", also DECISIONS line 6735) against `writeText` accepting a Buffer and doing no encoding (`files.service.ts` lines 154 to 165). See O3. A unit text change is not made; the plan meets the Scope's purpose.

## Review parts

The plan is small; it has one part.

- **Part 1.** Steps 1 to 9 (section 4). Tests: B1 (the unit's one criterion, line 29) and the supporting checks B2 to B5 (section 5).
