# Pack tests: golden cases and the per-tool mock fixture

This folder holds the tests of the genre packs: the content checks (Vitest, on the pack-lint library entry point and the contracts package) and the golden cases of the draft tools. The golden tests themselves live in `apps/api/test/packs/`.

## Golden cases

A golden case checks what a tool sends to the model. It calls the tool through `POST /api/tool-registry/tools/:name/execute` on the composed app, boots with `SCRIBA_PACKS_DIR=packages/packs`, a temporary library and the mock OpenAI server, and compares the request the mock recorded with a checked-in golden.

- The helper is `apps/api/test/packs/golden.kit.ts`. A case is declared with `goldenCase(...)`, which returns the body of one `it(...)`, in a few lines.
- `goldenCase` takes `tool`, `name`, `expect` (the output `kind` and the `sourcesUsed` the case declares), `invalidWithout` (the name of one required argument that the invalid call drops), an optional `userTool` (a test-only tool spec, see below) and an optional `check(result)` for the tool's own assertions on the result (for example a parse of the output content, or a check that the rendered prompt holds each entity ID).
- `enable: true` (optional) turns the tool on in the case's temporary library, through `POST /api/tool-registry/tools/:name/enabled`, before the call. The shipped spec keeps its `enabled` value; use the option only for a tool that ships disabled.
- Each case checks four things: the recorded request matches the golden; `output.kind` and `sourcesUsed` match `expect`; the call without `invalidWithout` returns HTTP 422 with `TOOL_ARGS_INVALID` and a message that names that argument, and makes no model call; and exactly one model request was recorded for the valid call.

### Files and where they live

- Goldens and fixtures are under `packages/packs/test/golden/<tool>/`.
- `<case>.fixture.json` is the `ToolCallRequest` the case posts: the arguments and the resolved entities.
- `<case>.golden.json` is the expected chat request: the `messages`, and `tools` when the request has them. The client's `model`, `temperature` and `max_tokens` are not in the golden.
- The mock scenario of a tool is one file per tool, `e2e/fixtures/mock-openai/scenarios/pack-<tool>.json`, reached at `/scenario/pack-<tool>/v1`.
- Fixtures are the tests' own. No test reads `examples/`; do not point a fixture or a golden at it.

### Updating goldens

Goldens change only on purpose, in the same PR as the prompt edit that changes them. To regenerate them, run:

```
cd apps/api && npx vitest run -- --update-goldens
```

The `--` is needed: vitest accepts the flag only after it. The vitest config passes the flag to the test workers as `SCRIBA_UPDATE_GOLDENS=1`. In the diff, the reviewer checks the golden's change against the prompt change.

### Goldens that include the tool catalogue

A template that uses `{{toolCatalog}}` renders every valid and enabled tool of the packs root. Such a golden changes when a built-in tool is added, removed, renamed, enabled or disabled, or when its description or ports change. That change is a change of the rendered prompt, so it belongs to the PR of the prompt edit: that PR regenerates the golden with `--update-goldens` and the reviewer sees the change in the golden's diff. Two PRs that both change the catalogue conflict on the same golden at rebase; the rebase regenerates it.

### Test-only tools

A test-only tool is installed only in the temporary library of its own case: the helper copies the spec into the library's user pack, `.scriba/packs/user/tools`, before the app boots. It is not in `packages/packs/{core,nonfiction,fiction}/tools`, so the image and the other cases never see it. The sample case uses `golden_probe`, whose spec is `packages/packs/test/golden/golden_probe/golden_probe.yaml`.

### Scenario and matchers

A tool's scenario file holds the steps that the mock answers with. When one tool has several cases, the scenario picks each reply by a matcher on that case's own prompt (for example `lastMessageContent`).

## Running the tests

- Golden cases: `cd apps/api && npx vitest run test/packs/golden-harness.test.ts`.
- Content checks: `npm test -w @bbartolome/scriba-packs` (see the package scripts).
