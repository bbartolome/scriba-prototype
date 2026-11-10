---
id: PST-07
title: delete, move and in-process helpers (updateProjectYaml, appendLog, stateDir)
module: project-store
phase: phase:files
milestone: M1
blocked_by: [PST-06]
parallel_with: [PST-08, PST-09, PST-10]
unblocks: [PST-12]
---

# PST-07 — delete, move and in-process helpers

Consumers: Graph runner (graph delete/rename, run logs), Compile & export (snapshot restore, `order`/`export` keys, `.scriba/compile-export/`), Model providers (`model` key), Agent loop (transcripts, claims artefacts).

## Decisions
- **delete** (author action, POST) `{path, baseHash?}`: removes one file, never a folder. Stale `baseHash` → `PROJECT_WRITE_CONFLICT`. Publishes `files-changed`.
- **move** (author action, POST) `{from, to}`: renames one file within the project; both paths pass path safety; `to` must not exist (`PROJECT_FILE_EXISTS`); missing parents created. Publishes `files-changed` with both paths.
- In-process only (on the provider, not HTTP):
  - `updateProjectYaml(projectId, patch)`: sets or removes **top-level keys** through the YAML document API, preserving comments, key order and every other key; validates the result against the schema before an atomic write; publishes `files-changed`.
  - `appendLog(projectId, path, line)`: appends one line to a file under `logs/` (path safety applies; path must be inside `logs/`). **Allowed for any `ok` project** (a run stopped by a switch can finish its log). Publishes nothing.
  - `stateDir(projectId, owner)`: returns the absolute path of `<project>/.scriba/<owner>/` (owner is a module slug), creating it if needed. Only that module reads/writes there with plain `fs`.
- Claims artefacts are written with `write` under `logs/` (by the Agent loop).

## Acceptance criteria
- [ ] `delete` and `move` work on single files, refuse folders, reserved and unsafe paths; `move` refuses an existing target.
- [ ] `updateProjectYaml` changes only the named key: a fixture with comments is byte-identical outside that key; an invalid patch is refused and the file is unchanged.
- [ ] `appendLog` refuses paths outside `logs/`, works for a non-active `ok` project, and appends exactly one line.
- [ ] `stateDir` creates and returns `.scriba/<owner>/`, which remains unreachable through the public file API.
