---
id: AGL-02
title: Built-in tool framework (Ajv, readable errors, two retries, withdrawal) plus list_files and read_file
module: agent-loop
phase: phase:file-tools-chat
milestone: M1
blocked_by: [AGL-01, "Project store phase:files (PST-12)"]
parallel_with: [AGL-06, AGL-07]
unblocks: [AGL-03, AGL-08, AGL-10, AGL-12, AGL-22]
---

# AGL-02 — Tool framework and file reads

## Why
The agent lists and reads real files (stories 3, 13); malformed calls get readable errors and two retries (24), and a tool that keeps failing is withdrawn (25).

## Decisions
- Module skeleton (one `@Module` import). A **tool registry inside the loop**: each built-in tool has a name (from the reserved list), a JSON Schema argument schema (Ajv), a family, and a handler; the loop dispatches through it. Narrative tools plug into the same dispatcher in AGL-09.
- **Validation:** the loop validates built-in tool arguments with Ajv and catches arguments that aren't parseable JSON (raw argument strings come from the providers client unparsed).
- **Readable error format** (built-in and registry tools alike): one line per problem `<argument path>: <what is wrong>`, then a short summary of the expected arguments. This text is the tool result sent back to the model and shown on the card with the attempt number.
- **Retries:** per tool per agent run, for **consecutive** invalid calls. On the third consecutive invalid call to the same tool, answer "this tool is unavailable for the rest of this agent run" and drop it from the schemas for the remaining steps. A valid call resets the count. Unknown entity IDs and edit-text mismatches count as validation failures (used by AGL-09, AGL-12). Retries count towards the step cap.
- **`list_files`** `{path?, recursive?}` and **`read_file`** `{path}` call the Project store file API (in-process provider) with **project-relative paths only**; path safety is the Project store's. Refusals (e.g. a path outside the project) come back as readable tool errors.

## Acceptance criteria (through the composed app and mock server once AGL-03 exists; the dispatcher is tested through a test-only HTTP harness until then)
- [ ] A path outside the project is refused with a readable error.
- [ ] Unparseable JSON arguments and schema violations produce the readable format.
- [ ] Two readable errors, then the tool is withdrawn on the third consecutive invalid call; a valid call in between resets the count.
