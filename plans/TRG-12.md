---
id: TRG-12
status: draft
---
# TRG-12 plan — executor service, render and execute endpoints, entity kind checks, per-output system messages, model call

Revision 1, written on main from the repository alone. Status stays draft until the Opus plan review approves it.

## 1. Decisions this plan follows

Settled by the unit (`units/TRG-12-executor.md`) or the module (`modules/tool-registry.md`), unless the line says "design choice".

- In-process `ExecutorService`, plus `POST /api/tool-registry/tools/:name/render` (no model call) and `POST /api/tool-registry/tools/:name/execute`, on one path. Source: unit line 20; module line 46; README line 131 (every command is a POST).
- Steps, in order. (1) Tool lookup: disabled gives `TOOL_DISABLED`, invalid gives `TOOL_INVALID`. (2) Ajv in full mode. (3) Every referenced entity has a resolved entity in the request (`TOOL_ENTITY_UNRESOLVED`) whose `type` is in the field's kinds (`TOOL_ENTITY_KIND_MISMATCH`); no error here calls the model. (4) Render with TRG-08, with the catalogue for `{{toolCatalog}}`. (5) Model call with the active project's model choice, one system message per output kind, then one user message holding the rendered prompt. (6) Return `{output: {kind, content}, sourcesUsed}`. Source: unit lines 22 to 27.
- `content` is the model's final text, trimmed, with one enclosing code fence removed for `graph`; it is not parsed. Source: unit line 28.
- `sourcesUsed` is the resolved references of entity-typed fields, de-duplicated, in property order; style profiles are excluded. Source: unit line 29.
- Non-streaming in v1. Accepts an abort signal. Transport retries stay in the client. Provider failures wrap as `TOOL_MODEL_ERROR` and keep the provider's message. Source: unit line 30; `apps/api/src/modules/providers/client/types.ts` lines 31 to 39 (`ChatRequest.signal`).
- A style field left empty is filled by the caller, not by the executor. Source: unit line 31.
- The executor never writes files. Source: unit line 32; module line 46.
- The model choice is resolved through the active project id. Source: unit line 26; DECISIONS 2026-11-13, MPR-05 entry (line 1945): "the Agent loop and the Tool registry resolve through the active project (TRG-12 line 26)".
- The `{{toolCatalog}}` catalogue is the enabled tools. Source: `units/TRG-08-template-engine.md` line 26 (the template engine's rule); TRG-12 supplies the data (open point O2).
- Error codes and HTTP statuses are in the contract: `packages/contracts/src/tool-registry/errors.ts` lines 6 to 17 (codes) and 39 to 50 (statuses: `TOOL_DISABLED` 409; `TOOL_INVALID`, `TOOL_ARGS_INVALID`, `TOOL_ENTITY_UNRESOLVED`, `TOOL_ENTITY_KIND_MISMATCH` 422; `TOOL_MODEL_ERROR` 502).
- Contract shapes exist and this plan changes no contract file: `call.ts` lines 47 to 51 (`toolCallRequestSchema`), 54 (`toolRenderRequestSchema`), 58 to 61 (render result), 64 to 75 (output and call result); `routes.ts` lines 20 to 23 (`TOOL_RENDER_ROUTE`, `TOOL_EXECUTE_ROUTE`). `resolvedEntitySchema.type` is `z.string().min(1)` (`call.ts` line 14), as DECISIONS 2026-11-14, TRG-01 review item 2, requires.
- Testing: external behaviour only. API tests boot the composed app with `createTestApp` against a temp library and the mock server. No test reads `examples/`. Source: README line 138; module lines 49 to 52.
- A mock scenario for a tool execution is added to `e2e/fixtures/mock-openai/scenarios/`, one file, reached by base URL path. Source: unit line 33; `units/PLT-12-mock-openai-server.md` lines 22 to 26.
- The resolver has no abort signal, so a model listing during resolution cannot be aborted. Source: DECISIONS 2026-11-15, MPR-08 entry (line 4015). Open point O5.

Design choices of this plan (small, recorded here; none changes an acceptance criterion or a settled decision):

- C1 Layout. One new service file. `tools.controller.ts` gains the two routes. `tool-registry.module.ts` registers and exports the service. One new test file, one new fixture folder, one new scenario file, and two entries in the invariant sweep table.
- C2 Model call. `streamChat(target, {messages, signal})`, with the collect loop written inline as `agent-run.ts` lines 43 to 54 does. `collectStream` is exported from the providers client index but not from `providers.module.ts` (lines 14 to 27), so this plan does not add an export to another module.
- C3 Active project. `ProjectStoreService.activeId() ?? undefined` (`project-store.service.ts` line 51). With no active project the app default applies (`providers.resolution.ts` lines 142 to 158).
- C4 Error mapping. A `ModuleError` whose code starts with `PROVIDER_` becomes `new ModuleError(TOOL_ERROR_CODES.MODEL_ERROR, TOOL_ERROR_STATUS.TOOL_MODEL_ERROR, <same message>)`. This covers resolve errors (`PROVIDER_NOT_CONFIGURED`) and `PROVIDER_ABORTED`. Any other error is rethrown unchanged.
- C5 Entity kinds. A field's kinds are `hints['x-scriba-entity-kinds']` (`inputs.ts` line 25, from `compiled.fields`). A field with no declared kinds accepts any type. A style field requires the type `style-profile` (open point O1).
- C6 `sourcesUsed` order. The order in which `validateArguments` reports entity references (`validate.ts` lines 109 to 134: property order, list items in order). Style references are dropped; the first occurrence of each id is kept.
- C7 `{{toolCatalog}}` data. The functions offered to the active project (`catalog.functions(genrePack)`, `catalog.service.ts` lines 320 to 335), each with its function name, its one-line description and `catalog.ports(name)`. Open point O2.
- C8 System messages. Five constants, exported as `OUTPUT_SYSTEM_MESSAGES` from `executor.service.ts`, with the text in section 3, step 4.
- C9 Render arguments. The arguments that `catalog.validate` returns, with the defaults applied (`validate.ts` lines 84 to 137).
- C10 Duplicate entity refs. In `request.entities`, the first entry with a given `ref` is used.
- C11 Template problems. A parse failure of `spec.prompt`, or a `TemplateRenderError`, is `TOOL_INVALID` (422). A tool that passes lint cannot reach this; the guard is defensive.
- C12 HTTP abort. Open point O3.

## 2. Files to create or change

Only the paths below change. `packages/contracts/**`, `catalog.service.ts`, `template.ts`, `validate.ts`, `apps/api/src/modules/providers/**`, `apps/api/src/modules/project-store/**`, `packages/packs/**` and every `package.json` do not change. `package-lock.json` does not change (no dependency is added).

| Path | Change | Purpose |
|---|---|---|
| `apps/api/src/modules/tool-registry/executor.service.ts` | new | `ExecutorService` with `render` and `execute`, a private `prepare` (steps 1 to 4), `OUTPUT_SYSTEM_MESSAGES`, the style kind constant and the error mapping (section 3, step 4) |
| `apps/api/src/modules/tool-registry/tools.controller.ts` | edit | Constructor gains `ExecutorService`. Adds `@Post(TOOL_RENDER_ROUTE) @HttpCode(200) render(name, body)` with `toolRenderRequestSchema` through `ZodValidationPipe`, and `@Post(TOOL_EXECUTE_ROUTE) @HttpCode(200) execute(name, body, @Res({passthrough: true}) response)` with `toolCallRequestSchema`. Updates the header comment at lines 44 and 45. Step 5 gives the execute body |
| `apps/api/src/modules/tool-registry/tool-registry.module.ts` | edit | Imports `ProvidersModule` from `../providers/providers.module`. Adds `ExecutorService` to `providers`. `exports: [CatalogService, ExecutorService]` (line 59). Adds `export { ExecutorService } from './executor.service';` after the CatalogService export (line 15). Updates the comment at line 25 to "the read, validate, render and execute API" |
| `apps/api/test/invariant-sweep.ts` | edit | Two entries in `FIXTURE_PATHS`, after the `delete` entry (lines 144 to 146) and before `setup-auth` (line 147): `'/api/tool-registry/tools/:name/render'` with path `/api/tool-registry/tools/no-such-tool/render`, and `'/api/tool-registry/tools/:name/execute'` with path `/api/tool-registry/tools/no-such-tool/execute`. Without them `sweepMutations` fails by name in `invariant-mutation-guard.test.ts` and `token-guard-gate.test.ts` (`concretePath`, lines 218 to 224). `sweepGetHead` reads GET routes only |
| `apps/api/test/tool-registry-executor.test.ts` | new | Criteria C1 to C5 and the extra test X1 (section 4) |
| `apps/api/test/fixtures/executor/packs/core/tools/render_probe.yaml` | new | Fixture tool for criterion C1 (section 3, step 2). Its folder is the only pack folder of that test; the shared fixture packs are not changed |
| `e2e/fixtures/mock-openai/scenarios/tool-execute-draft.json` | new | One chat step for a draft reply (section 3, step 3) |

## 3. Procedure

Run in a worktree of `main` on branch `unit/TRG-12`, created by the implementer with `git worktree add <path> -b unit/TRG-12 main`. Record `node -v` and `npm -v` beside each gate result. The expected Node is `v26.x`, as in PLT-02 step 1. Do not push.

Preconditions, checked before step 1: `plans/TRG-08.md`, `plans/TRG-11.md`, `plans/MPR-08.md` and `plans/PLT-12.md` all have `status: done`. Each is a blocker of TRG-12 in its `blocked_by` list.

1. Install. `npm ci` at the worktree root. Expected: exit 0.

2. Create `apps/api/test/fixtures/executor/packs/core/tools/render_probe.yaml` with this content. The prompt is one double-quoted string, because a plain scalar with ": " is a YAML mapping error.

```yaml
schemaVersion: 1
name: render_probe
description: Renders a fixed prompt from its core idea, an optional tone and its entities.
inputs:
  type: object
  properties:
    coreIdea:
      type: string
      title: Core idea
      x-scriba-type: text
      x-scriba-port: true
      x-scriba-control: textarea
    entityIds:
      type: array
      title: Entities
      items:
        type: string
      x-scriba-type: entity
      x-scriba-port: true
      x-scriba-entity-kinds: [person]
    tone:
      type: string
      title: Tone
  required: [coreIdea]
output: draft
enabled: true
prompt: "Core idea: {{coreIdea}}. Tone: {{tone}}.{{#each entityIds}} [{{entity this}}]{{/each}}"
```

3. Create `e2e/fixtures/mock-openai/scenarios/tool-execute-draft.json`. Expected: the final text, trimmed, is `The cold open opens on the bench at dawn.`

```json
{
  "steps": [
    {
      "match": { "endpoint": "chat", "turnIndex": 0 },
      "reply": {
        "kind": "stream",
        "deltas": ["The cold open opens on the ", "bench at dawn.\n"]
      }
    }
  ]
}
```

4. Create `apps/api/src/modules/tool-registry/executor.service.ts`. Imports: `Injectable` from `@nestjs/common`; `ModuleError` from `../platform/platform.module`; `CatalogService` from `./catalog.service`; `ActiveGenreService` from `./active-genre.service`; `ProjectStoreService` from `../project-store/project-store.module`; `ModelResolver`, `streamChat` and `type ChatMessage` from `../providers/providers.module`; `parseTemplate`, `renderTemplate`, `TemplateRenderError` and `type ToolCatalogEntry` from `./template`; the contract's `TOOL_ERROR_CODES`, `TOOL_ERROR_STATUS` and the call types from `@bbartolome/scriba-contracts/tool-registry`.

   a. `export const OUTPUT_SYSTEM_MESSAGES: Record<OutputKind, string>` with these exact texts:
      - `draft`: `Write the answer as Markdown prose. Return only the text of the answer, with no preface and no closing remarks.`
      - `entity`: `Return one Markdown file: YAML front matter between two lines of ---, then the Markdown body. Return nothing outside the file.`
      - `claims`: `Return one claim per line. No numbering, no bullets, no blank lines and no other text.`
      - `graph`: `Return only a JSON document, with no prose before or after it.`
      - `check`: `Return only the findings, one per line, each naming the problem and where it occurs. If there are none, return the single line: No findings.`
   b. `const STYLE_PROFILE_KIND = 'style-profile';`
   c. `@Injectable() export class ExecutorService`, constructor `(catalog: CatalogService, genre: ActiveGenreService, store: ProjectStoreService, resolver: ModelResolver)`.
   d. `render(name, request: ToolRenderRequest): ToolRenderResult` returns `{prompt}` from `prepare(name, request)`.
   e. `async execute(name, request: ToolCallRequest, signal?: AbortSignal): Promise<ToolCallResult>`:
      - `const { tool, prompt, sources } = this.prepare(name, request)`;
      - `const kind = tool.spec.output`;
      - resolve the model inside a try that maps errors with `modelFailure`: `const target = await this.resolver.resolve({ projectId: this.store.activeId() ?? undefined })`;
      - build `messages = [{role: 'system', content: OUTPUT_SYSTEM_MESSAGES[kind]}, {role: 'user', content: prompt}]`;
      - collect inside a try mapped by `modelFailure`: `let text = ''; for await (const event of streamChat(target, {messages, signal})) { if (event.type === 'text-delta') text += event.text; }`;
      - return `{output: {kind, content: finish(kind, text)}, sourcesUsed: sources}`.
   f. `private prepare(name, request)` runs steps 1 to 4 of the unit, in this order:
      1. `const tool = this.catalog.entry(name)` (TOOL_NOT_FOUND or TOOL_INVALID come from here). If `!this.catalog.enabledOf(tool)`, throw `ModuleError(TOOL_ERROR_CODES.DISABLED, TOOL_ERROR_STATUS.TOOL_DISABLED, 'The tool "<name>" is disabled.')`.
      2. `const checked = this.catalog.validate(name, {arguments: request.arguments, mode: 'full'})`. This throws TOOL_ARGS_INVALID.
      3. For each `ref` of `checked.entityRefs`: `entity` is the first item of `request.entities` with `entity.ref === ref.id`. If none, throw `ENTITY_UNRESOLVED` (422) with `Entity "<id>" for "<field>" is not among the resolved entities of the request.` Otherwise `kinds` is `[STYLE_PROFILE_KIND]` when `ref.style`, else the `hints['x-scriba-entity-kinds']` of the field whose `key` is `ref.field` in `tool.compiled.fields`. If `kinds` is defined and does not include `entity.type`, throw `ENTITY_KIND_MISMATCH` (422) with `Entity "<id>" for "<field>" is of kind "<type>", but the field takes "<k1>", ...`.
      4. `sources` is `checked.entityRefs` filtered to non-style references, mapped to `id`, de-duplicated, first occurrence kept.
      5. `const parsed = parseTemplate(tool.spec.prompt)`. If not ok, throw `TOOL_INVALID` (422) naming the first diagnostic.
      6. `toolCatalog` is `this.catalog.functions(this.genre.genrePack()).functions.map((f) => ({name: f.function.name, description: f.function.description, ports: this.catalog.ports(f.function.name)}))`.
      7. Render inside a try: `renderTemplate(parsed.ast, {args: checked.arguments, entities: request.entities, toolCatalog})`. A `TemplateRenderError` becomes `TOOL_INVALID` (422).
      8. Return `{tool, prompt, sources}`.
   g. `modelFailure(error: unknown): never`: if `error instanceof ModuleError && error.code.startsWith('PROVIDER_')`, throw `new ModuleError(TOOL_ERROR_CODES.MODEL_ERROR, TOOL_ERROR_STATUS.TOOL_MODEL_ERROR, error.message)`; otherwise throw `error` unchanged.
   h. `finish(kind, text)`: `const trimmed = text.trim()`. If `kind` is `graph` and `/^```[^\n]*\n([\s\S]*)\n```$/` matches `trimmed`, return the trimmed group 1. Otherwise return `trimmed`.

5. Edit `apps/api/src/modules/tool-registry/tools.controller.ts`. Add `ExecutorService` to the constructor, and the imports `TOOL_RENDER_ROUTE`, `TOOL_EXECUTE_ROUTE`, `toolRenderRequestSchema`, `toolCallRequestSchema`, `Res`, `type ToolRenderResult`, `type ToolCallResult`, `type ServerResponse` from `node:http`. The execute handler is:

```ts
@Post(TOOL_EXECUTE_ROUTE)
@HttpCode(200)
async execute(
  @Param('name') name: string,
  @Body(new ZodValidationPipe(toolCallRequestSchema)) body: ToolCallRequest,
  @Res({ passthrough: true }) response: ServerResponse,
): Promise<ToolCallResult> {
  // A client that goes away before the reply is finished aborts the model request (open point O3).
  const controller = new AbortController();
  response.on('close', () => {
    if (!response.writableFinished) controller.abort();
  });
  return this.executor.execute(name, body, controller.signal);
}
```

   The render handler is the same shape without the abort, returning `this.executor.render(name, body)`.

6. Edit `tool-registry.module.ts` as the section 2 row says.

7. Edit `apps/api/test/invariant-sweep.ts` as the section 2 row says.

8. Create `apps/api/test/tool-registry-executor.test.ts` with the five criteria and X1 of section 4. Helpers, in this file only:
   - `openApp(packsDir, providerBaseURL)` writes `settings.yaml` with `makeLibrary(text)`, where the text is `stringify` of `{schemaVersion: 1, providers: {schemaVersion: 1, list: [{id: 'mock', kind: 'openai-compatible', baseURL, model: 'mock-model', ...PROVIDER_DEFAULTS}], appDefault: {providerId: 'mock', model: 'mock-model'}}}`, the same shape as `apps/api/test/agent-loop-start.test.ts` lines 47 to 69. It then boots `createTestApp({libraryDir, env: {SCRIBA_PACKS_DIR: packsDir}})` and gets the cookie with `sessionCookie(app, library)`.
   - Requests go through `send(app.baseUrl, {host: LOOPBACK_HOST, origin: LOOPBACK_ORIGIN, cookie, method: 'POST', path, body})`, as `tool-registry-api.test.ts` does.
   - Every test removes its library, its temp scenario folder and its app, and resets the scenario records it reads (`resetScenario`).

9. Gates, in this order, each with exit 0:
   - Format the new and changed files: `npx prettier --write apps/api/test/fixtures/executor/packs/core/tools/render_probe.yaml e2e/fixtures/mock-openai/scenarios/tool-execute-draft.json apps/api/src/modules/tool-registry/executor.service.ts apps/api/src/modules/tool-registry/tools.controller.ts apps/api/src/modules/tool-registry/tool-registry.module.ts apps/api/test/invariant-sweep.ts apps/api/test/tool-registry-executor.test.ts`
   - `git status --short` lists only the section 2 paths.
   - `npm run build` (root).
   - `cd <worktree>/apps/api && npx vitest run test/tool-registry-executor.test.ts`. Expected: C1 to C5 and X1 pass.
   - Regression, from `<worktree>/apps/api`: `npx vitest run test/tool-registry-api.test.ts test/tool-registry-loader-gate.test.ts test/tool-registry-read-enable.test.ts test/tool-registry-save.test.ts test/tool-registry-template.test.ts test/invariant-mutation-guard.test.ts test/invariant-get-head.test.ts test/token-guard-gate.test.ts test/agent-loop-start.test.ts test/providers-client-errors.test.ts`.
   - `npm test` (root). Expected: exit 0.
   - `npm run lint` (root). Expected: exit 0, ending with `All matched files use Prettier code style!`.

10. Commit on `unit/TRG-12` with the message `feat(TRG-12): executor service, render and execute endpoints`. Do not squash later. Record each gate's output and whether each criterion passed.

## 4. Acceptance criteria and tests

All tests are in `apps/api/test/tool-registry-executor.test.ts`, run with the commands of section 3, step 9. Criteria are the unit's lines 36 to 40.

| Criterion (unit line) | Test name | Setup | Pass condition |
|---|---|---|---|
| C1 (36) render | `C1 render returns the expected prompt, expands each entity in #each and renders an absent field as nothing` | Packs folder `apps/api/test/fixtures/executor/packs`. POST render of `render_probe` with arguments `coreIdea: 'Engines reward patience'`, `entityIds: ['ada-lovelace', 'grace-hopper']`, no `tone`. Entities: `ada-lovelace` (type `person`, path `entities/ada-lovelace.md`, content `Ada wrote the first program.`) and `grace-hopper` (type `person`, path `entities/grace-hopper.md`, content `Grace Hopper wrote the first compiler.`) | Status 200. `toolRenderResultSchema` parses the body and `prompt` equals `Core idea: Engines reward patience. Tone: . [person ada-lovelace (entities/ada-lovelace.md)` + newline + `Ada wrote the first program.] [person grace-hopper (entities/grace-hopper.md)` + newline + `Grace Hopper wrote the first compiler.]`. The mock scenario has 0 records |
| C2 (37) execute | `C2 execute returns the draft and the sources it cites, and the mock got the draft system message then the rendered prompt` | Shared fixture packs (`apps/api/test/fixtures/packs`). Scenario `tool-execute-draft` through the default scenarios folder. Request for `cold_open`: `coreIdea: 'Engines reward patience'`, `entityIds: ['grace-hopper', 'ada-lovelace']`, `styleProfile: 'house-style'`, `person: 'ada-lovelace'`. Entities: `grace-hopper` and `ada-lovelace` (type `person`), `house-style` (type `style-profile`) | Status 200. `toolCallResultSchema` parses the body. `output` is `{kind: 'draft', content: 'The cold open opens on the bench at dawn.'}`. `sourcesUsed` is `['grace-hopper', 'ada-lovelace']`. The mock has 1 record. Its `body.messages[0]` is `{role: 'system', content: OUTPUT_SYSTEM_MESSAGES.draft}`. Its `body.messages[1]` is `{role: 'user', content}` with the `prompt` that POST render returns for the same request |
| C3 (38) errors | `C3 malformed arguments name every bad field; wrong-kind and unresolved entities are refused by name; the model is never called` | Shared fixture packs; scenario `tool-execute-draft`, reset first. Three POST executes of `cold_open`: (a) `coreIdea: 42` and `unexpected: 'x'` with no `person` and no entities; (b) `person: 'ada-lovelace'` with the entity `ada-lovelace` typed `claim`; (c) `person: 'ada-lovelace'` with no entities | (a) 422 `TOOL_ARGS_INVALID`; `toolArgsInvalidDetailsSchema` parses the details and the issue paths include `/coreIdea`, `/person` and `/unexpected`; the message names all three. (b) 422 `TOOL_ENTITY_KIND_MISMATCH` naming `person`. (c) 422 `TOOL_ENTITY_UNRESOLVED` naming `person`. The mock has 0 records after the three calls |
| C4 (39) disabled and abort | `C4 a disabled tool answers TOOL_DISABLED, and a dropped client connection stops the model request` | Part 1: shared fixture packs; POST `TOOL_ENABLED_ROUTE` for `cold_open` with `{enabled: false}`. Part 2: a second app whose provider base URL is `<mock>/scenario/tool-execute-stall/v1`, with a temp scenario folder holding one chat step with `delayMs: 5000` and a stream reply (the shape of `agent-loop-start.test.ts` lines 32 to 38) | Part 1: render and execute of `cold_open` answer 409 `TOOL_DISABLED`; the mock has 0 records. Part 2: send execute with `node:http` (Host `LOOPBACK_HOST`, Origin `LOOPBACK_ORIGIN`, the cookie, a JSON body). When `recordsOf` shows 1 record, destroy the request. Within 2000 ms the record shows `closedByClient: true` |
| C5 (40) M2 done-when | `C5 each workhorse-shaped fixture tool returns a draft that cites its entity files through sourcesUsed` | Shared fixture packs; scenario reset. Execute `myth_buster` with `coreIdea` and `entityIds: ['claim-one', 'claim-two']` (entities typed `claim`). Execute `cold_open` with `coreIdea`, `entityIds: ['grace-hopper']` and `person: 'ada-lovelace'` (entities typed `person`) | Both 200, `output.kind` is `draft`. `sourcesUsed` is `['claim-one', 'claim-two']` and `['grace-hopper', 'ada-lovelace']` |
| X1 (extra; covers unit line 30) | `X1 a provider failure answers TOOL_MODEL_ERROR with the provider's message` | Temp scenario folder with one chat step: status 404 and body `{error: {code: 'model_not_found'}}`, copied from `e2e/fixtures/mock-openai/scenarios/unknown-model.json`. Execute `cold_open` | 502 `TOOL_MODEL_ERROR`, message `The model provider does not know the model.` (`client/errors.ts` line 23). X1 is not one of the five criteria; it is here because the unit names the behaviour and no criterion covers it |

## 5. Agreement with the downstream units

- **AGL-09 (narrative tools).** Needs an in-process executor that returns `{output, sourcesUsed}`, is abortable by stop, and gives readable TOOL_* errors. Provided: `ExecutorService.execute(name, request, signal?)`, exported from `tool-registry.module.ts`. Errors are `ModuleError` with the contract codes and readable messages. AGL-09 resolves the entities and passes them in `request.entities`; the executor never resolves. AGL-09's own criterion (unit line 27) is its unknown-id error; the executor's `TOOL_ENTITY_UNRESOLVED` is the registry's error for the same case.
- **GRR-04 (run engine core).** Needs an executor call per tool node with resolved entities, cancellable, with the result kept in memory. Provided: the same method and the `signal` parameter. `sourcesUsed` gives the citations. The caller fills style fields (unit line 31).
- **GNP-02 (golden harness).** Needs `POST .../execute` and `POST .../render` for fixture arguments, the mock's received request (system message, then user message) and `TOOL_ARGS_INVALID`. Provided: both routes; C2 checks the message order; C3 checks the invalid-argument path. The system messages are the constants of this plan. Goldens pin the texts later; this plan does not.
- **TRG-15 (live previews).** Needs `render` with the preview values and entities. Provided: `render`. TRG-15's own change, the inline-spec form of `render` (`units/TRG-15-live-previews.md` line 18), is TRG-15's and is not part of this plan.
- **TRG-16 (Try panel).** Needs `execute`, and readable `TOOL_*` errors including model errors. Provided: `execute` and the `TOOL_MODEL_ERROR` mapping (X1). The executor writes no files, so the Try panel writes none either.
- **TRG-13 (parallel).** Its `parallel_with` names TRG-12 (`units/TRG-13-tools-page-list.md` line 8). No file in common.
- **Planned plans on the same area.** `plans/GNP-06.md` (planned) creates `packages/packs/nonfiction/entity-types/{person,claim,concept}.yaml` and `apps/api/test/packs/nonfiction-entity-types.test.ts` (its lines 54 to 58). `plans/SAU-17.md` (planned) only mentions TRG-11 (its line 228). Neither changes a file of this plan, so either merge order is correct.

## 6. Open points

- **O1. Style fields have no kind.** The spec declares no kinds for a style field. Chosen: a style field accepts only the type `style-profile`, the kind of `packages/packs/core/entity-types/style-profile.yaml` (line 2). Why: a reference to any other kind is a mismatch, and nothing else in the spec says what a style field takes. Alternative: accept any type. Neither option changes a criterion. The Navigator confirms.
- **O2. Which tools fill `{{toolCatalog}}`.** The unit says "enabled" (`units/TRG-08-template-engine.md` line 26). `catalog.list()` without a genre pack lists every origin, while `catalog.functions()` without one lists core and user only (`catalog.service.ts` lines 189 to 200 and 320 to 335). Chosen: the functions offered to the active project, so the catalogue lists only tools the model may call. Alternative: every enabled valid tool. The Navigator confirms.
- **O3. How an HTTP call is aborted.** The criterion says "an aborted call" and does not name a transport. Chosen: the in-process `signal` parameter, plus abort on an HTTP close before the reply finishes (section 3, step 5). Alternative: no HTTP abort; C4 part 2 would then be checked in-process only.
- **O4. "Naming every bad field" (criterion 3).** `catalog.validate` reports every Ajv issue, since `createAjv` sets `allErrors` (`validate.ts` lines 36 to 38). The entity-ID format check runs only after Ajv passes (`validate.ts` lines 109 to 134). So a malformed entity id next to an Ajv error is not named. Chosen: C3 names the Ajv-visible bad fields only. Alternative: change `validate.ts` (a TRG-09 file) so the format check also runs on Ajv failure. The Navigator decides whether the criterion needs it.
- **O5. Abort during model resolution.** `ModelResolver.resolve` (`providers.resolution.ts` line 70) takes no signal, and its `listModels` calls (lines 93 and 132) cannot be aborted. Chosen: leave it. C4 uses a configured model, so no listing runs. DECISIONS 2026-11-15 (MPR-08) records the same gap.
- **O6. Genre check on execute.** Execute does not refuse a tool outside the active project's genre pack (for example `scene_builder` in a nonfiction project). Chosen: no check, because the unit lists no such refusal. The Try panel and the agent offer only tools that are offered.
- **O7. Output-message wording and graph fence.** No criterion covers the five system message texts or the fence removal for `graph`. Chosen: the texts and the rule of section 3, step 4 as written, with no dedicated test. GNP-02's goldens cover them later. The Navigator may ask for a test now.

## 7. Facts checked and facts assumed

**Checked** (file and line on main):

- Unit `units/TRG-12-executor.md`: front matter lines 1 to 10; Decisions lines 20 to 33; criteria lines 36 to 40 (five, all unticked). No "Removed by revision", "Loosened by revision", "Reworded by revision" or "Moved to" line exists in the unit.
- Blockers merged: `plans/TRG-08.md`, `plans/TRG-11.md`, `plans/MPR-08.md`, `plans/PLT-12.md` all `status: done`. Commits on main: `d5db35d` (TRG-08), `b297173` (TRG-11), `6941839` (MPR-08).
- Module `modules/tool-registry.md`: lines 7, 23, 38, 42, 45 to 46, 49 to 52.
- README: line 131 (HTTP convention), line 138 (testing convention), line 103 (phase table).
- Contract: `call.ts` lines 7 to 75, `errors.ts` lines 6 to 50, `routes.ts` lines 20 to 23, `constants.ts` lines 11 and 17 to 23, `spec.ts` lines 14 to 15, 33, 61, `catalog.ts` lines 62 to 65 and 80 to 82, `views.ts` lines 41 to 46, 80 to 96. `entities.ts` line 6 (`entityIdSchema` is `ENTITY_ID_PATTERN` `/^[a-z0-9][a-z0-9-]*$/`, `constants.ts` line 4). `files.ts` line 6 (`projectPathSchema` is `z.string()`).
- `catalog.service.ts`: `notFound` 73 to 79; `enabledWith` 146 to 149; `list` 189 to 200; `entry` 303 to 306; `ports` 309 to 311; `enabledOf` 313 to 317 (comment 313 to 314 names TRG-12); `functions` 320 to 335; `validate` 338 to 341; `entityKinds` 344 to 346.
- `validate.ts`: `createAjv` 36 to 38; `validateArguments` 84 to 137; the entity-ID check 109 to 134; `entityRefs.push` at 120.
- `template.ts`: `ToolCatalogEntry` 75 to 79; `RenderInput` 81 to 85; `TemplateRenderError` 87 to 92; `renderEntity` 56 to 78 (header format at 77); `parseTemplate` 291; `renderTemplate` 655; the catalogue format 108 to 109. `parseTemplate` is used only by lint (`lint.ts` line 779).
- `inputs.ts`: `InputField` 21 to 35 (`hints` 25, `isEntity` 33, `isStyle` 34); `readInputs` 147.
- `packs.ts`: `LoadedTool` 35 to 41 (spec, source, origin, views, compiled); folder comments at 274 and 313 and 339 to 340 (a missing folder is an empty pack).
- `lint.ts`: an unknown entity kind is a warning (`lint.ts` 491 to 498, `report.warning` for `entity-kind`).
- `tool-registry.module.ts`: imports line 28; providers 56 to 58; `exports` line 59; the class at 61; comment line 25; entry exports line 15.
- `tools.controller.ts`: header comment 44 to 45; constructor 48 to 51; the enable switch 86 to 94.
- Providers: `providers.module.ts` exports 14 to 27 (`ModelResolver`, `streamChat`, types; not `collectStream`), class at 53, export array at 51; `providers.resolution.ts` `ResolvedModel` 40 to 47, `resolve` 70 to 103, `listModels` calls 93 and 132, `projectOverride` 108 to 121, `selectionOf` 142 to 158; `client/types.ts` `ChatMessage` 5 to 9, `ProviderTarget` 25 to 29, `ChatRequest` 31 to 39 (`signal` 35); `openai-compatible-client.ts` `streamChat` 116 to 151 (`PROVIDER_ABORTED` at 122); `client/errors.ts` messages 20 to 30 (404 model-not-found text at 23), `providerError` 32 to 34; `client/index.ts` exports `collectStream` (line 6).
- `agent-run.ts` lines 43 to 54 (the inline collect loop); `agent-loop.module.ts` line 34 (imports `ProvidersModule`).
- Projects: `project-store.service.ts` line 51 (`activeId()`); `project-store.module.ts` exports `ProjectStoreService` (line 66); `active-genre.service.ts` lines 18 to 28 (`genrePack()`).
- Events: `events.publisher.ts` line 2 (`ServerResponse` import) and line 42 (`res.on('close', ...)`). Platform uses `@nestjs/platform-express` (`apps/api/package.json` line 14).
- Sweep: `invariant-sweep.ts` header fixture rule (line 4); `FIXTURE_PATHS` line 73; the tool-registry entries 126 to 146 (`delete` 144 to 146); `setup-auth` 147; `concretePath` 218 to 224 (throw at 222); `sweepMutations` 646 to 657; `tool-registry-loader-gate.test.ts` lines 13 to 26 (eleven routes) and 56 (`arrayContaining`, so new routes do not break it).
- Test seam: `create-test-app.ts` `createTestApp` 65 and env merge 77 to 82; `providers-client.kit.ts` `targetFor` 28 to 34, `recordsOf` 61 to 69, `resetScenario` 72 to 79; `guard-request.ts` `RequestOptions` 7 to 12, `send` 27, `sessionCookie` 80; `settings.kit.ts` `makeLibrary` 60 to 67; `agent-loop-start.test.ts` `STALL_STEPS` 32 to 38, `providerEntry` 47 to 55, `settingsText` 57 to 69; `tool-registry-api.test.ts` line 19 (`FIXTURE_PACKS`).
- Mock: `e2e/fixtures/mock-openai/server.mjs` `matcherHolds` 103 to 131 (`turnIndex` counts assistant messages), `findStepIndex` 133, `closedByClient` set at 206, records pushed at 292 to 302 (`body`, `closedByClient`); `server.d.mts` (`MockOpenAI.close`, `MockOpenAIRecord`); scenarios `unknown-model.json` (404 `model_not_found`) and `stalled.json` (5000 ms delay).
- Fixture tools: `cold_open.yaml` (`entityIds` kinds `[person]` at line 20; `styleProfile` style at line 24; `person` at 36 to 41; `required` line 47; prompt 50 to 54); `myth_buster.yaml` (`entityIds` kinds `[claim]` at line 20; prompt 24 to 28); `scene_builder.yaml` has no entity field.
- Style kind: `packages/packs/core/entity-types/style-profile.yaml` line 2 (`kind: style-profile`).
- Entity id pattern and the Agent loop's output type: `packages/contracts/src/agent-loop/events.ts` line 10 (`output: z.unknown().optional()`).
- Shared plans: `plans/GNP-06.md` lines 54 to 58 (files), `plans/SAU-17.md` line 228; `plans/PLT-02.md` (structure: front matter, sections 1 to 6).
- DECISIONS entries: line 1945 (MPR-05, active-project resolution); line 2902 (AGL-01 review item 3, output alignment); line 3893 (TRG-01 review item 2, `type` is `z.string().min(1)`); line 4015 (MPR-08, no abort signal, "lines 17 to 19 and 42"). Each entry was read by its heading, not as a whole file.
- Gates: root `package.json` scripts `build`, `test` (`npm test --workspaces && node --test 'scripts/*.test.mjs'`), `lint` (workspaces, `lint:examples`, `lint:packs`, `prettier --check .`); `apps/api/package.json` scripts `build` (`tsc -p tsconfig.build.json && tsc --noEmit -p tsconfig.json`), `test` (`npm run build && vitest run`), `lint` (`eslint .`).
- Boundary rule: `eslint.config.mjs` lines 30 to 40 (cross-module imports go through `src/modules/*/*.module.ts`); `tool-registry` already imports `../project-store/project-store.module`, and `agent-loop` imports `../providers/providers.module`.
- Only `tool-registry-loader-gate.test.ts` reads the tool-registry routes, with `arrayContaining` (line 56). `providers-gate.test.ts` and `project-store-files-gate.test.ts` read no tool-registry route.

**Assumed** (each is checked by a named test or step):

- A1. Under `@Res({passthrough: true})` the Nest response has `on` and `writableFinished`, as the Express adapter gives (checked by C4 part 2).
- A2. A test file's tests run in sequence, so a shared scenario's records are reset per test (vitest's default within a file; C2, C3, C5 reset first).
- A3. A fixture pack folder with only `core/` boots: `readEntityTypes` treats missing `entity-types` folders as empty, as `builtinFiles` does (checked by C1's boot).
- A4. A destroyed client socket reaches the mock as `closedByClient: true` (checked by C4 part 2, the same mechanism the providers client tests use).
- A5. The providers settings written in the test pass `ModelResolver` without a listing, because `choice.model` is set (`providers.resolution.ts` lines 86 to 88).

**Inconsistencies noticed (reported, not fixed):**

- I1. `units/TRG-12-executor.md` step 3 (line 24) says "whose type is in the field's kinds". Style fields have no kinds in the spec, so the unit does not say what a style field takes (open point O1).
- I2. `units/TRG-12-executor.md` Scope names no test-seam file, yet the invariant sweep (`apps/api/test/invariant-sweep.ts`, header fixture rule at line 4) makes `sweepMutations` fail by name for any templated mutation route without a `FIXTURE_PATHS` entry. TRG-12 must edit that shared file.
- I3. DECISIONS 2026-11-15 (MPR-08, line 4015) cites `providers.resolution.ts` "lines 17 to 19 and 42" for the missing abort signal. On main, `resolve` is at line 70 and the `listModels` calls at 93 and 132; the cited lines are not those.
- I4. DECISIONS 2026-11-14 (AGL-01 review, line 2902) asks that `tool-call-result` output align with `toolOutputSchema`. `packages/contracts/src/agent-loop/events.ts` line 10 uses `z.unknown().optional()`. That is not a TRG-12 file, but the two shapes differ in type.
- I5. Stale comments after TRG-12: `tool-registry.module.ts` line 25 ("the read and validate API") and `tool-registry-loader-gate.test.ts` line 13 ("the eleven routes"). This plan updates the first and does not change the second, which still passes.
