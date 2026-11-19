---
id: PST-24
title: Byte-safe file write — optional base64 bytes field on write, stored without the UTF-8 encode
module: project-store
phase: phase:files
milestone: M5 (for Compile & export's copy operations)
blocked_by: [PST-06]
parallel_with: []
unblocks: []
---

# PST-24 — Byte-safe file write

## Why
Other modules' copy operations (Compile & export copying a binary default template, such as a DOCX, into the project) must store a file's exact bytes. The PST-06 `write` encodes `content` as UTF-8 text, which corrupts binary content. Navigator decision O1 (option a, `plans/DECISIONS.md`, 2026-11-19) puts a byte-safe write in the Project store.

## Scope
- `packages/contracts/src/project-store/files.ts`: `fileWriteSchema` gains an optional field `contentBase64` (a base64-encoded string of the bytes to store).
- `apps/api/src/modules/project-store/files.service.ts`, `commit`: when `contentBase64` is present, the decoded bytes are written directly (atomic, temp file in the same folder + rename, as for text), bypassing the UTF-8 encode (`Buffer.from(content, 'utf8')`) and `writeText`.
- Unchanged: the size cap (`FILE_SIZE_CAP_BYTES`, applied to the decoded bytes), the `project.yaml` guard, the `files-changed` event, the hash (`hashOf` over the stored bytes), and the read path (`decodeText`): read and list stay text-only.

## Decisions
- Field name: `contentBase64`. Absent, the write behaves exactly as in PST-06.
- The bytes path is for other modules' copy operations (author actions); agent and recipe writes still go through `propose` (PST-15).
- A file stored through the bytes path that is not valid UTF-8 text reads as binary: `decodeText` returns undefined, so the read refuses it with `PROJECT_NOT_TEXT` as any binary file (PST-06); it still appears in `list`.
- `content` is unchanged in the schema; when `contentBase64` is present, the plan settles how `content` is treated (ignored, or required empty).

## Acceptance criteria
- [ ] A write with the byte-safe field stores the exact bytes (round-trip equality), and a subsequent read returns undefined (binary is not text).
