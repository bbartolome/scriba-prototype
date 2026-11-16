---
id: TRG-12
status: planned
---
# TRG-12 plan — executor service, render and execute endpoints, entity kind checks, per-output system messages, model call

Revision 2. Revision 1 was written on main from the repository alone. Revision 2 is the Opus reviser's correction on 2026-11-16 at main `32dbeef` (notes in section 9). The planner and the reviser changed no code and ran no test. The reviser made no unit change. Status stays draft until the orchestrator sets it.

## 1. Decisions this plan follows

Settled by the unit (`units/TRG-12-executor.md`) or the module (`modules/tool-registry.md`), unless the line says "design choice".

- In-process `ExecutorService`, plus `POST /api/tool-registry/tools/:name/render` (no model call) and `POST /api/tool-registry/tools/:name/execute`, on one path. Source: unit line 20; module lines 38 and 46; README line 131 (every command is a POST).
- Steps, in order. (1) Tool lookup: disabled gives `TOOL_DISABLED`, invalid gives `TOOL_INVALID`. (2) Ajv in full mode. (3) Every referenced entity has a resolved entity in the request (`TOOL_ENTITY_UNRESOLVED`) whose `type` is in the field's kinds (`TOOL_ENTITY_KIND_MISMATCH`); no error here calls the model. (4) Render with TRG-08, with the catalogue for `{{toolCatalog}}`. (5) Model call with the active project's model choice, one system message per output kind, then one user message holding the rendered prompt. (6) Return `{output: {kind, content}, sourcesUsed}`. Source: unit lines 22 to 27.
- `content` is the model's final text, trimmed, with one enclosing code fence removed for `graph`; it is not parsed. Source: unit line 28.
- `sourcesUsed` is the resolved references of entity-typed fields, de-duplicated, in property order; style profiles are excluded. Source: unit line 29.
- Non-streaming in v1. Accepts an abort signal. Transport retries stay in the client. Provider failures wrap as `TOOL_MODEL_ERROR` and keep the provider's message. Source: unit line 30; `apps/api/src/modules/providers/client/types.ts` lines 31 to 39 (`ChatRequest.signal` at 35).
- A style field left empty is filled by the caller, not by the executor. Source: unit line 31; AGL-09 line 19; TRG-16 line 15.
- The executor never writes files. Source: unit line 32; module line 46.
- The model choice is resolved through the active project id. Source: unit line 26; DECISIONS 2026-11-13, MPR-05 entry (line 1945): "the Agent loop and the Tool registry resolve through the active project (TRG-12 line 26)".
- The `{{toolCatalog}}` catalogue is "the catalogue of currently enabled tools (name, one-line description, port keys with port types, output kind)", registry data passed in by the caller. Source: `units/TRG-08-template-engine.md` line 26; `units/GNP-04-propose-graph.md` line 20 ("enabled tools with port keys and types"). Design choice C7.
- Error codes and HTTP statuses are in the contract: `packages/contracts/src/tool-registry/errors.ts` lines 6 to 17 (codes) and 39 to 50 (statuses: `TOOL_DISABLED` 409; `TOOL_INVALID`, `TOOL_ARGS_INVALID`, `TOOL_ENTITY_UNRESOLVED`, `TOOL_ENTITY_KIND_MISMATCH` 422; `TOOL_MODEL_ERROR` 502).
- Contract shapes exist and this plan changes no contract file: `call.ts` lines 47 to 51 (`toolCallRequestSchema`), 54 (`toolRenderRequestSchema`), 58 to 61 (render result), 64 to 75 (output and call result); `routes.ts` lines 20 to 23 (`TOOL_RENDER_ROUTE`, `TOOL_EXECUTE_ROUTE`). `resolvedEntitySchema.type` is `z.string().min(1)` (`call.ts` line 14), as DECISIONS 2026-11-14, TRG-01 review item 2 (line 3893), requires; the comment at `call.ts` lines 10 to 11 names TRG-12's `TOOL_ENTITY_KIND_MISMATCH`.
- Testing: external behaviour only. API tests boot the composed app with `createTestApp` against a temp library and the mock server. No test reads `examples/` or the real packs. Tests assert on HTTP replies and on what the mock received, and import nothing from `apps/api/src/`. Source: README line 138; module lines 49 to 52.
- A mock scenario for a tool execution is added to `e2e/fixtures/mock-openai/scenarios/`, one file, reached by base URL path. Source: unit line 33; `units/PLT-12-mock-openai-server.md` lines 22 to 25.
- The resolver has no abort signal, so a model listing during resolution cannot be aborted. Source: DECISIONS 2026-11-15, MPR-08 entry (line 4015); `providers.resolution.ts` line 70 (`resolve`) and 93 (`listModels`). Point O5.

Design choices of this plan (small, recorded here; none changes an acceptance criterion or a settled decision):

- C1 Layout. One new service file. `tools.controller.ts` gains the two routes. `tool-registry.module.ts` imports `ProvidersModule`, registers and exports the service. `validate.ts` gains the entity-ID check on an Ajv failure (C13). One new test file, one new fixture folder, one new scenario file, and two entries in the invariant sweep table.
- C2 Model call. `streamChat(target, {messages, signal})`, with the collect loop written inline as `agent-run.ts` lines 219 to 232 (`askModel`) does. `collectStream` is exported from the providers client index (`client/index.ts` line 6) but not from `providers.module.ts` (lines 14 to 27), so this plan adds no export to another module.
- C3 Active project. `ProjectStoreService.activeId() ?? undefined` (`project-store.service.ts` line 51). With no active project the app default applies (`providers.resolution.ts` lines 142 to 158).
- C4 Error mapping. A `ModuleError` whose code starts with `PROVIDER_` becomes `new ModuleError(TOOL_ERROR_CODES.MODEL_ERROR, TOOL_ERROR_STATUS.TOOL_MODEL_ERROR, <same message>)`. This covers resolve errors (`PROVIDER_NOT_CONFIGURED`) and `PROVIDER_ABORTED`. Any other error is rethrown unchanged.
- C5 Entity kinds (point O1, resolved). The kinds of an entity field are its `hints['x-scriba-entity-kinds']` (`inputs.ts` line 25; the hint is optional, `spec.ts` line 33); an entity field with no declared kinds accepts any type. A style field cannot declare kinds (`lint.ts` line 488: "x-scriba-entity-kinds needs x-scriba-type: entity"); its kind is the style-profile kind, so its kinds are `['style-profile']`. Sources for the style-profile kind: `packages/packs/core/entity-types/style-profile.yaml` line 2 (`kind: style-profile`); TRG-02 unit line 20 (a style field's hint is "Style-profile entity ID"); TRG-04 unit line 19 (the style picker lists style-profile entities); AGL-09 line 19 and TRG-16 line 15 (callers fill an empty style field with the project's `styleProfile`); `apps/web/src/app/features/tool-registry/project-store-copy.ts` line 43 (`STYLE_PROFILE_KIND = 'style-profile'`). This reading gives unit line 24 a meaning for every field without changing the unit.
- C6 `sourcesUsed` order. The order in which `validateArguments` reports entity references (`validate.ts` lines 109 to 134: property order, list items in order). Style references are dropped; the first occurrence of each id is kept.
- C7 `{{toolCatalog}}` data (point O2, resolved). Every tool that is valid and enabled, of every origin: `catalog.list().tools` (no genre pack: every origin, `catalog.service.ts` lines 188 to 201) filtered to `valid && enabled`, each mapped to `{name, description, ports: catalog.ports(name)}` (`ToolCatalogEntry`, `template.ts` lines 74 to 79; the renderer prints the output kind from `ports.output.kind`, `template.ts` line 567). This is the literal reading of TRG-08 line 26 ("currently enabled tools") and GNP-04 line 20, and agrees with the canvas palette (GRR-11 line 19: `enabled && valid`) and with execute, which does not check the genre (O6). The executor therefore needs no `ActiveGenreService`.
- C8 System messages. Five constants, `OUTPUT_SYSTEM_MESSAGES` in `executor.service.ts`, with the text in section 3, step 5. Tests compare against the literal text, not the import.
- C9 Render arguments. The arguments that `catalog.validate` returns, with the defaults applied (`validate.ts` lines 84 to 137).
- C10 Duplicate entity refs. In `request.entities`, the first entry with a given `ref` is used, by the kind check and by the render. `renderTemplate` builds its map with `Map.set`, so the last entry would win (`template.ts` lines 655 to 658); the executor therefore passes the de-duplicated list (first kept) to `renderTemplate`.
- C11 Template problems. A parse failure of `spec.prompt`, or a `TemplateRenderError`, is `TOOL_INVALID` (422). A tool that passes lint cannot reach this; the guard is defensive.
- C12 HTTP abort (point O3, resolved). The in-process `signal` parameter, and on HTTP a close of the response before it has finished aborts the controller's signal (section 3, step 6). The same mechanism is used by `events.publisher.ts` line 42 (`res.on('close', ...)`).
- C13 Every bad field (point O4, resolved). `validateArguments` now runs the entity-ID check also when Ajv fails, and throws one `TOOL_ARGS_INVALID` with the Ajv issues first and the entity-ID issues after them. On an Ajv failure the check looks only at string items (a list field whose value is not an array, and an item that is not a string, already have an Ajv issue). When Ajv passes, the behaviour is unchanged. So a malformed entity ID next to an Ajv error is named too, and criterion 3's "naming every bad field" holds for every field. The validate endpoint (TRG-09) shares the function and reports the same extra issues; no existing test expects fewer (section 7).

## 2. Files to create or change

Only the paths below change. `packages/contracts/**`, `catalog.service.ts`, `template.ts`, `apps/api/src/modules/providers/**`, `apps/api/src/modules/project-store/**`, `packages/packs/**`, the shared fixture packs under `apps/api/test/fixtures/packs/`, and every `package.json` do not change. `package-lock.json` does not change (no dependency is added).

| Path | Change | Purpose |
|---|---|---|
| `apps/api/src/modules/tool-registry/executor.service.ts` | new | `ExecutorService` with `render` and `execute`, a private `prepare` (steps 1 to 4), `OUTPUT_SYSTEM_MESSAGES`, the style kind constant and the error mapping (section 3, step 5) |
| `apps/api/src/modules/tool-registry/validate.ts` | edit | `validateArguments` (lines 84 to 137): the entity-ID check also runs after an Ajv failure (C13; section 3, step 4) |
| `apps/api/src/modules/tool-registry/tools.controller.ts` | edit | Constructor gains `ExecutorService`. Adds `@Post(TOOL_RENDER_ROUTE) @HttpCode(200) render(name, body)` with `toolRenderRequestSchema` through `ZodValidationPipe`, and `@Post(TOOL_EXECUTE_ROUTE) @HttpCode(200) execute(name, body, @Res({passthrough: true}) response)` with `toolCallRequestSchema`. Updates the header comment at lines 44 and 45 to name render and execute. Step 6 gives the execute body |
| `apps/api/src/modules/tool-registry/tool-registry.module.ts` | edit | Imports `ProvidersModule` from `../providers/providers.module` into `imports` (line 28). Adds `ExecutorService` to `providers` (lines 30 to 58). `exports: [CatalogService, ExecutorService]` (line 59). Adds `export { ExecutorService } from './executor.service';` after the CatalogService export (line 15). Updates the comment at line 25 to "the read, validate, render and execute API" |
| `apps/api/test/invariant-sweep.ts` | edit | Two entries in `FIXTURE_PATHS` (line 73), after the `delete` entry (lines 144 to 146) and before `setup-auth` (line 147): `'/api/tool-registry/tools/:name/render'` with path `/api/tool-registry/tools/no-such-tool/render`, and `'/api/tool-registry/tools/:name/execute'` with path `/api/tool-registry/tools/no-such-tool/execute`. Without them `sweepMutations` (line 646) fails by name in `invariant-mutation-guard.test.ts` and `token-guard-gate.test.ts` (`concretePath`, lines 218 to 224; fixture rule at line 4). The sweep's mutation requests have no cookie or a refused Origin or Host, so the guard answers them and the executor is never reached. `sweepGetHead` reads GET routes only |
| `apps/api/test/tool-registry-executor.test.ts` | new | Criteria C1 to C5 and the extra test X1 (section 4) |
| `apps/api/test/fixtures/executor/packs/core/tools/render_probe.yaml` | new | Fixture tool for criterion C1 (section 3, step 2). Its folder is the only pack folder of that test; the shared fixture packs are not changed, so no test that counts their tools changes |
| `e2e/fixtures/mock-openai/scenarios/tool-execute-draft.json` | new | One chat step for a draft reply (section 3, step 3) |

The unit has no **Scope** section (`units/TRG-12-executor.md` lines 16 to 40: Why, Decisions, Acceptance criteria). This table is the scope of the work. `invariant-sweep.ts` is in it because the sweep's fixture rule requires an entry for each new templated route.

## 3. Procedure

Run in a worktree of `main` on branch `unit/TRG-12`, created by the implementer with `git worktree add <path> -b unit/TRG-12 main`. Record `node -v` and `npm -v` beside each gate result. The expected Node is `v26.x`, as in PLT-02 step 1. Do not push.

Preconditions, checked before step 1: `plans/TRG-08.md`, `plans/TRG-11.md`, `plans/MPR-08.md` and `plans/PLT-12.md` all have `status: done`. Each is a blocker of TRG-12 in its `blocked_by` list (unit line 7).

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

4. Edit `apps/api/src/modules/tool-registry/validate.ts`, function `validateArguments` (lines 84 to 137), as C13 says:
   - Replace lines 102 to 107 with: `const ajvPassed = validate(args); const issues: ToolArgsIssue[] = ajvPassed ? [] : (validate.errors ?? []).map((error) => issueOf(error, args, fields));`.
   - In the loop over entity and style fields (lines 112 to 133), when `!ajvPassed`: skip a list field whose value is not an array, and skip an item that is not a string. Otherwise the loop is as it is. The issues of the loop are pushed to the same `issues` list, after the Ajv issues.
   - Change the comment at line 109 to "Every entity or style value must be an entity ID (each item of a list). After an Ajv failure, only string values are checked, so every bad field is named once by Ajv or here."
   - After the loop: `if (issues.length > 0) throw argsInvalid(spec.name, fields, issues);` (line 134 as it is), then `return { arguments: args, entityRefs };`.
   Expected: with Ajv passing, the result and the errors are those of main.

5. Create `apps/api/src/modules/tool-registry/executor.service.ts`. Imports: `Injectable` from `@nestjs/common`; `ModuleError` from `../platform/platform.module`; `CatalogService` from `./catalog.service`; `ProjectStoreService` from `../project-store/project-store.module`; `ModelResolver`, `streamChat` and `type ChatMessage` from `../providers/providers.module`; `parseTemplate`, `renderTemplate`, `TemplateRenderError` and `type ToolCatalogEntry` from `./template`; the contract's `TOOL_ERROR_CODES`, `TOOL_ERROR_STATUS`, `type OutputKind`, `type ResolvedEntity` and the call types from `@bbartolome/scriba-contracts/tool-registry`.

   a. `export const OUTPUT_SYSTEM_MESSAGES: Record<OutputKind, string>` with these exact texts:
      - `draft`: `Write the answer as Markdown prose. Return only the text of the answer, with no preface and no closing remarks.`
      - `entity`: `Return one Markdown file: YAML front matter between two lines of ---, then the Markdown body. Return nothing outside the file.`
      - `claims`: `Return one claim per line. No numbering, no bullets, no blank lines and no other text.`
      - `graph`: `Return only a JSON document, with no prose before or after it.`
      - `check`: `Return only the findings, one per line, each naming the problem and where it occurs. If there are none, return the single line: No findings.`
   b. `const STYLE_PROFILE_KIND = 'style-profile';` with a comment citing C5.
   c. `@Injectable() export class ExecutorService`, constructor `(catalog: CatalogService, store: ProjectStoreService, resolver: ModelResolver)`.
   d. `render(name, request: ToolRenderRequest): ToolRenderResult` returns `{prompt}` from `prepare(name, request)`.
   e. `async execute(name, request: ToolCallRequest, signal?: AbortSignal): Promise<ToolCallResult>`:
      - `const { tool, prompt, sources } = this.prepare(name, request)`;
      - `const kind = tool.spec.output`;
      - resolve the model inside a try that maps errors with `modelFailure`: `const target = await this.resolver.resolve({ projectId: this.store.activeId() ?? undefined })`;
      - build `messages: ChatMessage[] = [{role: 'system', content: OUTPUT_SYSTEM_MESSAGES[kind]}, {role: 'user', content: prompt}]`;
      - collect inside a try mapped by `modelFailure`: `let text = ''; for await (const event of streamChat(target, {messages, signal})) { if (event.type === 'text-delta') text += event.text; }`;
      - return `{output: {kind, content: finish(kind, text)}, sourcesUsed: sources}`.
   f. `private prepare(name, request)` runs steps 1 to 4 of the unit, in this order:
      1. `const tool = this.catalog.entry(name)` (TOOL_NOT_FOUND or TOOL_INVALID come from here, `catalog.service.ts` lines 303 to 306 and 385 to 395). If `!this.catalog.enabledOf(tool)`, throw `ModuleError(TOOL_ERROR_CODES.DISABLED, TOOL_ERROR_STATUS.TOOL_DISABLED, 'The tool "<name>" is disabled.')`.
      2. `const checked = this.catalog.validate(name, {arguments: request.arguments, mode: 'full'})`. This throws TOOL_ARGS_INVALID.
      3. `entities`: `request.entities` with only the first entry of each `ref` kept (C10). For each `ref` of `checked.entityRefs`: `entity` is the item of `entities` with `entity.ref === ref.id`. If none, throw `ENTITY_UNRESOLVED` (422) with `Entity "<id>" for "<field>" is not among the resolved entities of the request.` Otherwise `kinds` is `[STYLE_PROFILE_KIND]` when `ref.style`, else the `hints['x-scriba-entity-kinds']` of the field whose `key` is `ref.field` in `tool.compiled.fields`. If `kinds` is defined and does not include `entity.type`, throw `ENTITY_KIND_MISMATCH` (422) with `Entity "<id>" for "<field>" is of kind "<type>", but the field takes "<k1>", "<k2>".` (the kinds joined with ", ").
      4. `sources` is `checked.entityRefs` filtered to non-style references, mapped to `id`, de-duplicated, first occurrence kept.
      5. `const parsed = parseTemplate(tool.spec.prompt)` (`template.ts` line 291). If not ok, throw `TOOL_INVALID` (422) naming the first diagnostic.
      6. `toolCatalog: ToolCatalogEntry[]` is `this.catalog.list().tools.filter((t) => t.valid && t.enabled).map((t) => ({name: t.name, description: t.description, ports: this.catalog.ports(t.name)}))` (C7).
      7. Render inside a try: `renderTemplate(parsed.ast, {args: checked.arguments, entities, toolCatalog})` (`template.ts` line 655). A `TemplateRenderError` becomes `TOOL_INVALID` (422).
      8. Return `{tool, prompt, sources}`.
   g. `modelFailure(error: unknown): never`: if `error instanceof ModuleError && error.code.startsWith('PROVIDER_')`, throw `new ModuleError(TOOL_ERROR_CODES.MODEL_ERROR, TOOL_ERROR_STATUS.TOOL_MODEL_ERROR, error.message)`; otherwise throw `error` unchanged.
   h. `finish(kind, text)`: `const trimmed = text.trim()`. If `kind` is `graph` and `/^```[^\n]*\n([\s\S]*)\n```$/` matches `trimmed`, return the trimmed group 1. Otherwise return `trimmed`.

6. Edit `apps/api/src/modules/tool-registry/tools.controller.ts`. Add `ExecutorService` to the constructor (import from `./executor.service`), and the imports `TOOL_RENDER_ROUTE`, `TOOL_EXECUTE_ROUTE`, `toolRenderRequestSchema`, `toolCallRequestSchema`, `type ToolRenderRequest`, `type ToolCallRequest`, `type ToolRenderResult`, `type ToolCallResult` from the contract, `Res` from `@nestjs/common`, and `type ServerResponse` from `node:http`. The execute handler is:

```ts
@Post(TOOL_EXECUTE_ROUTE)
@HttpCode(200)
async execute(
  @Param('name') name: string,
  @Body(new ZodValidationPipe(toolCallRequestSchema)) body: ToolCallRequest,
  @Res({ passthrough: true }) response: ServerResponse,
): Promise<ToolCallResult> {
  // A client that goes away before the reply is finished aborts the model request (C12).
  const controller = new AbortController();
  response.on('close', () => {
    if (!response.writableFinished) controller.abort();
  });
  return this.executor.execute(name, body, controller.signal);
}
```

   The render handler is the same shape without `@Res` and without the abort, with `toolRenderRequestSchema`, returning `this.executor.render(name, body)`.

7. Edit `tool-registry.module.ts` as the section 2 row says.

8. Edit `apps/api/test/invariant-sweep.ts` as the section 2 row says.

9. Create `apps/api/test/tool-registry-executor.test.ts` with the five criteria and X1 of section 4. Helpers, in this file only:
   - `openApp(packsDir, scenario)` starts a mock with `startMockOpenAI()` (the default scenarios folder, `e2e/fixtures/mock-openai/scenarios/`), writes `settings.yaml` with `makeLibrary(text)`, where the text is `stringify` of `{schemaVersion: 1, providers: {schemaVersion: 1, list: [{id: 'mock', kind: 'openai-compatible', baseURL: `${mock.baseUrl}/scenario/${scenario}/v1`, model: 'mock-model', ...PROVIDER_DEFAULTS}], appDefault: {providerId: 'mock', model: 'mock-model'}}}`, the shape of `apps/api/test/agent-loop-start.test.ts` lines 47 to 69 with no projects section (no active project, so the app default applies). It then boots `createTestApp({libraryDir, env: {SCRIBA_PACKS_DIR: packsDir}})` and gets the cookie with `sessionCookie(app, library)`. It returns `{app, cookie, mock, close}`; `close` closes the app and the mock and removes the library.
   - Requests go through `send(app.baseUrl, {host: LOOPBACK_HOST, origin: LOOPBACK_ORIGIN, cookie, method: 'POST', path, body: JSON.stringify(body)})`, as `tool-registry-api.test.ts` does.
   - The mock's records are read with `recordsOf(mock, scenario)` (`providers-client.kit.ts` lines 61 to 69). Each test starts its own mock, so no records carry over.
   - Every test calls `close` in a `finally`.
   - The test file imports nothing from `apps/api/src/`; the system message text is written in the test as a literal.

10. Gates, in this order, each with exit 0:
   - Format the new and changed files: `npx prettier --write apps/api/test/fixtures/executor/packs/core/tools/render_probe.yaml e2e/fixtures/mock-openai/scenarios/tool-execute-draft.json apps/api/src/modules/tool-registry/executor.service.ts apps/api/src/modules/tool-registry/validate.ts apps/api/src/modules/tool-registry/tools.controller.ts apps/api/src/modules/tool-registry/tool-registry.module.ts apps/api/test/invariant-sweep.ts apps/api/test/tool-registry-executor.test.ts`
   - `git status --short` lists only the section 2 paths.
   - `npm run build` (root).
   - `cd <worktree>/apps/api && npx vitest run test/tool-registry-executor.test.ts`. Expected: C1 to C5 and X1 pass.
   - Regression, from `<worktree>/apps/api`: `npx vitest run test/tool-registry-api.test.ts test/tool-registry-loader.test.ts test/tool-registry-loader-gate.test.ts test/tool-registry-read-enable.test.ts test/tool-registry-save.test.ts test/tool-registry-template.test.ts test/invariant-mutation-guard.test.ts test/invariant-get-head.test.ts test/token-guard-gate.test.ts test/agent-loop-start.test.ts test/providers-client-errors.test.ts`.
   - `npm test` (root). Expected: exit 0.
   - `npm run lint` (root). Expected: exit 0, ending with `All matched files use Prettier code style!`.

11. Commit on `unit/TRG-12` with the message `feat(TRG-12): executor service, render and execute endpoints`. Do not squash later. Record each gate's output and whether each criterion passed.

## 4. Acceptance criteria and tests

All tests are in `apps/api/test/tool-registry-executor.test.ts`, run with the commands of section 3, step 10. Criteria are the unit's lines 36 to 40. "Shared fixture packs" is `apps/api/test/fixtures/packs` (`tool-registry-api.test.ts` line 19). The draft system message text below is `Write the answer as Markdown prose. Return only the text of the answer, with no preface and no closing remarks.`

| Criterion (unit line) | Test name | Setup | Pass condition |
|---|---|---|---|
| C1 (36) render | `C1 render returns the expected prompt, expands each entity in #each and renders an absent field as nothing` | `openApp('apps/api/test/fixtures/executor/packs', 'tool-execute-draft')`. POST render of `render_probe` with arguments `coreIdea: 'Engines reward patience'`, `entityIds: ['ada-lovelace', 'grace-hopper']`, no `tone`. Entities: `ada-lovelace` (type `person`, path `entities/ada-lovelace.md`, content `Ada wrote the first program.`) and `grace-hopper` (type `person`, path `entities/grace-hopper.md`, content `Grace Hopper wrote the first compiler.`) | Status 200. `toolRenderResultSchema` parses the body and `prompt` equals `Core idea: Engines reward patience. Tone: . [person ada-lovelace (entities/ada-lovelace.md)` + newline + `Ada wrote the first program.] [person grace-hopper (entities/grace-hopper.md)` + newline + `Grace Hopper wrote the first compiler.]` (header format: `template.ts` line 595). The mock has 0 records for `tool-execute-draft` |
| C2 (37) execute | `C2 execute returns the draft and the sources it cites, and the mock got the draft system message then the rendered prompt` | `openApp(shared fixture packs, 'tool-execute-draft')`. Request for `cold_open`: `coreIdea: 'Engines reward patience'`, `entityIds: ['grace-hopper', 'ada-lovelace']`, `styleProfile: 'house-style'`, `person: 'ada-lovelace'`. Entities: `grace-hopper` and `ada-lovelace` (type `person`), `house-style` (type `style-profile`). First POST render with the same request, then POST execute | Render 200. Execute 200. `toolCallResultSchema` parses the body. `output` is `{kind: 'draft', content: 'The cold open opens on the bench at dawn.'}`. `sourcesUsed` is `['grace-hopper', 'ada-lovelace']` (de-duplicated, no `house-style`). The mock has 1 record. Its `body.messages` has length 2: `messages[0]` is `{role: 'system', content: <draft system message text>}`; `messages[1]` is `{role: 'user', content}` with the `prompt` of the render |
| C3 (38) errors | `C3 malformed arguments name every bad field; wrong-kind and unresolved entities are refused by name; the model is never called` | `openApp(shared fixture packs, 'tool-execute-draft')`. Four POST executes of `cold_open`: (a) `coreIdea: 42`, `entityIds: ['Bad Id']`, `unexpected: 'x'`, no `person`, no entities; (b) `coreIdea: 'x'`, `person: 'ada-lovelace'` with the entity `ada-lovelace` typed `claim`; (c) `coreIdea: 'x'`, `person: 'ada-lovelace'` with no entities; (d) `coreIdea: 'x'`, `person: 'ada-lovelace'`, `styleProfile: 'grace-hopper'`, with `ada-lovelace` and `grace-hopper` both typed `person` | (a) 422 `TOOL_ARGS_INVALID`; `toolArgsInvalidDetailsSchema` parses the details and the issue paths are, in any order, exactly `/coreIdea`, `/person`, `/unexpected` and `/entityIds/0`; the message contains `coreIdea`, `person`, `"unexpected"` and `entityIds`. (b) 422 `TOOL_ENTITY_KIND_MISMATCH`; the message contains `ada-lovelace`, `person` and `claim`. (c) 422 `TOOL_ENTITY_UNRESOLVED`; the message contains `ada-lovelace` and `person`. (d) 422 `TOOL_ENTITY_KIND_MISMATCH`; the message contains `grace-hopper`, `styleProfile` and `style-profile`. The mock has 0 records after the four calls |
| C4 (39) disabled and abort | `C4 a disabled tool answers TOOL_DISABLED, and a dropped client connection stops the model request` | Part 1: `openApp(shared fixture packs, 'tool-execute-draft')`; POST `TOOL_ENABLED_ROUTE` for `cold_open` with `{enabled: false}`; then render and execute of `cold_open` with valid arguments and entities. Part 2: `openApp(shared fixture packs, 'stalled')` (the existing scenario `stalled.json`: one chat step, `delayMs` 5000, a stream reply). Send execute of `cold_open` with valid arguments over `node:http` (Host `LOOPBACK_HOST`, Origin `LOOPBACK_ORIGIN`, the cookie, a JSON body, `agent: false`) | Part 1: render and execute answer 409 `TOOL_DISABLED`; the mock has 0 records for `tool-execute-draft`. Part 2: poll `recordsOf(mock, 'stalled')` every 50 ms until it shows 1 record (at most 2000 ms), then destroy the request. Within 2000 ms the record shows `closedByClient: true` (`server.mjs` lines 204 to 207) |
| C5 (40) M2 done-when | `C5 each workhorse-shaped fixture tool returns a draft that cites its entity files through sourcesUsed` | `openApp(shared fixture packs, 'tool-execute-draft')`. Execute `myth_buster` with `coreIdea: 'x'` and `entityIds: ['claim-one', 'claim-two']` (entities typed `claim`). Execute `cold_open` with `coreIdea: 'x'`, `entityIds: ['grace-hopper']` and `person: 'ada-lovelace'` (entities typed `person`). The two fixture tools with entity inputs are `cold_open` and `myth_buster`; `scene_builder` has text inputs only (`scene_builder.yaml` lines 7 to 17), so it has no source to cite and is not workhorse-shaped | Both 200, `output.kind` is `draft` and `output.content` is `The cold open opens on the bench at dawn.`. `sourcesUsed` is `['claim-one', 'claim-two']` and `['grace-hopper', 'ada-lovelace']`. The mock has 2 records |
| X1 (extra; covers unit line 30) | `X1 a provider failure answers TOOL_MODEL_ERROR with the provider's message` | `openApp(shared fixture packs, 'unknown-model')` (the existing scenario `unknown-model.json`: 404 `model_not_found`). Execute `cold_open` with valid arguments and entities | 502 `TOOL_MODEL_ERROR`, message `The model provider does not know the model.` (`client/errors.ts` line 23). X1 is not one of the five criteria; it is here because the unit names the behaviour and no criterion covers it |

Point O7: no test covers the four other system message texts or the `graph` fence removal; no criterion names them. GNP-02's goldens pin the texts later.

## 5. Agreement with the downstream units and other plans

- **AGL-09 (narrative tools).** Needs an in-process executor that returns `{output, sourcesUsed}`, is abortable by stop, and gives readable `TOOL_ARGS_INVALID`, `TOOL_ENTITY_UNRESOLVED` and `TOOL_ENTITY_KIND_MISMATCH` errors (AGL-09 lines 19 and 20). Provided: `ExecutorService.execute(name, request, signal?)`, exported from `tool-registry.module.ts`. Errors are `ModuleError` with the contract codes and readable messages. AGL-09 resolves the entities, including the style reference, and passes them in `request.entities`; the executor never resolves. A style reference resolved to a style-profile entity passes C5. `{{toolCatalog}}` lists enabled valid tools, as AGL-09 line 18 offers enabled tools.
- **GRR-04 (run engine core).** Needs an executor call per tool node with resolved entities, including style, cancellable, with the result kept in memory (GRR-04 line 24). Provided: the same method and the `signal` parameter. `sourcesUsed` gives the citations. The caller fills style fields (unit line 31).
- **GNP-02 (golden harness).** Needs `POST .../execute` with fixture arguments and resolved entities, the mock's received request (system message, then user message), the output kind and source IDs, and Ajv's readable `TOOL_ARGS_INVALID` (GNP-02 lines 16 to 19). Provided: the execute route; C2 checks the message order; C3 checks the invalid-argument path. The system messages are the constants of this plan; GNP-02's goldens pin them. GNP-02's per-tool scenarios (`pack-<tool>.json`, line 20) do not clash with `tool-execute-draft.json`.
- **GNP-04 (propose-graph).** Its template uses `{{toolCatalog}}` for "enabled tools with port keys and types" (line 20). C7 provides every enabled valid tool with its ports.
- **TRG-15 (live previews).** Needs `render` with the preview values and entities. Provided: `render`. TRG-15's own change, the inline-spec form of `render` (`units/TRG-15-live-previews.md` line 18), is TRG-15's.
- **TRG-16 (Try panel).** Needs `execute`, and readable `TOOL_*` errors including model errors (TRG-16 lines 15 to 17). Provided: `execute` and the `TOOL_MODEL_ERROR` mapping (X1). The executor writes no files.
- **TRG-13 (parallel).** Its `parallel_with` names TRG-12 (`units/TRG-13-tools-page-list.md` line 8). No file in common.
- **TRG-09 (done).** C13 changes `validateArguments`, which the validate endpoint shares. A request with both an Ajv error and a malformed entity ID now names both. TRG-09's criteria (unit lines 23 to 26) and TRG-02's (unit line 24: "one line per issue") still hold; the existing tests that use the function expect at least the issues they name (section 7).
- **Other draft and planned plans.** At main `32dbeef` the only other plan with status `draft` or `planned` is `plans/SAU-17.md` (planned). Its files are under `apps/api/src/modules/setup-auth/` and `apps/api/test/` (its lines 35 to 45); it does not change `invariant-sweep.ts`, because its route has no `:` (its line 50). No file in common; either merge order is correct. `plans/GNP-06.md` is now `done`.
- **AGL-01 / TRG-01 output type.** DECISIONS 2026-11-14 (line 2902) allowed `z.unknown().optional()` with the reason. `packages/contracts/src/agent-loop/events.ts` lines 37 and 41 and `cards.ts` lines 16 and 25 use it with the reason stated. A `ToolCallResult.output` fits it.

## 6. Open points

All seven points of revision 1 are resolved in the plan. None needs the Navigator.

- **O1. Style fields have no kind.** Resolved by C5: a style field's kinds are `['style-profile']`. A style field cannot declare kinds (`lint.ts` line 488), and the units name its kind (TRG-02 line 20, TRG-04 line 19, AGL-09 line 19, TRG-16 line 15). Test: C3 (d).
- **O2. Which tools fill `{{toolCatalog}}`.** Resolved by C7: every valid, enabled tool, of every origin, the literal reading of TRG-08 line 26 and GNP-04 line 20, as the canvas palette lists (GRR-11 line 19).
- **O3. How an HTTP call is aborted.** Resolved by C12: the `signal` parameter, and abort on a response close before it finishes. Test: C4 part 2.
- **O4. "Naming every bad field" (criterion 3).** Resolved by C13 without changing the criterion: the entity-ID check also runs on an Ajv failure. Test: C3 (a), with a malformed entity ID next to Ajv errors.
- **O5. Abort during model resolution.** Resolved: left as it is. `ModelResolver.resolve` (`providers.resolution.ts` line 70) takes no signal; a listing (line 93) runs only when neither the choice nor the provider sets a model. No criterion needs it; C4 uses a configured model. DECISIONS 2026-11-15 (MPR-08) records the gap.
- **O6. Genre check on execute.** Resolved: no check. The unit lists no such refusal (unit lines 22 to 27); the callers offer only tools that are offered (AGL-09 line 18).
- **O7. Output-message wording and graph fence.** Resolved: the texts and the rule of section 3, step 5, with no dedicated test. No criterion names them; GNP-02's goldens pin the texts.

## 7. Facts checked and facts assumed

**Checked** (file and line on main `32dbeef`):

- Unit `units/TRG-12-executor.md`: front matter lines 1 to 10; Why line 17; Decisions lines 20 to 33; criteria lines 36 to 40 (five, all unticked). No Scope section. No "Removed by", "Loosened by", "Reworded by" or "Moved to" note.
- No `unit/TRG-12` branch exists. DECISIONS, searched for `TRG-12`: lines 673, 1864, 1945, 1950, 2902, 3413, 3893, 4015; none is a PLAN DOES NOT WORK report for TRG-12.
- Blockers: `plans/TRG-08.md`, `plans/TRG-11.md`, `plans/MPR-08.md`, `plans/PLT-12.md` all `status: done`.
- Module `modules/tool-registry.md`: lines 7, 23, 38, 42, 45, 46, 49 to 52, 60, 62.
- README: line 64 (blocker notation), line 103 (phase table), line 131 (HTTP), line 138 (testing).
- Contract: `call.ts` lines 7 to 75 (`type` at 14; comment 10 to 11), `errors.ts` lines 6 to 50, `routes.ts` lines 20 to 23, `catalog.ts` lines 26 to 36 (`toolSummarySchema`: `name`, `description`, `enabled`, `valid`), `spec.ts` line 33 (`x-scriba-entity-kinds` optional), `project-store/project.ts` line 24 (`styleProfile`).
- `catalog.service.ts`: `offeredOrigins` 67 to 71; `list` 188 to 201; `entry` 303 to 306; `ports` 309 to 311; `enabledOf` 313 to 317 (comment names TRG-12); `functions` 320 to 335; `validate` 338 to 341; `loaded` 385 to 395 (TOOL_INVALID).
- `validate.ts`: `createAjv` 36 to 38 (`allErrors`); `validateArguments` 84 to 137; the Ajv failure throw 102 to 107; the entity-ID check 109 to 134.
- `template.ts`: `ToolCatalogEntry` 74 to 79; `RenderInput` 81 to 85; `TemplateRenderError` 87 to 92; `parseTemplate` 291; `formatCatalogEntry` 557 to 568 (output kind at 567); `renderEntity` 575 to 596 (header at 595); `renderTemplate` 655 to 658 (map built with `set`, last wins).
- `inputs.ts`: `InputField` 21 to 35 (`hints` 25, `isEntity` 33, `isStyle` 34); `isEntity`/`isStyle` 141 to 142; `readInputs` 147.
- `lint.ts` line 488 (kinds need `x-scriba-type: entity`), 491 to 498 (unknown kind is a warning).
- `tool-registry.module.ts`: entry export line 15; comment line 25; imports line 28; providers 30 to 58; exports line 59.
- `tools.controller.ts`: imports 1 to 42; header comment 44 to 45; constructor 48 to 51; validate route 96 to 104.
- Providers: `providers.module.ts` imports 1 to 11 (no tool-registry import, so no cycle), exports 14 to 27, `exports` array line 51; `providers.resolution.ts` `ResolvedModel` 38 to 45, `resolve` 70 to 103, `listModels` at 93; `client/types.ts` `ProviderTarget` 25 to 29, `ChatRequest` 31 to 39; `openai-compatible-client.ts` `streamChat` 116 to 151 (`PROVIDER_ABORTED` at 122); `client/errors.ts` line 23 (model-not-found text); `client/index.ts` line 6.
- `agent-run.ts` lines 210 to 235 (`askModel`, the inline collect loop 219 to 232).
- Projects: `project-store.service.ts` line 51 (`activeId()`); `project-store.module.ts` line 22 (exports `ProjectStoreService`).
- `events.publisher.ts` line 42 (`res.on('close', ...)`).
- Sweep: `invariant-sweep.ts` line 4 (fixture rule); `FIXTURE_PATHS` line 73; tool-registry entries 126 to 146; `setup-auth` 147; `concretePath` 218 to 224; `sweepMutations` 646.
- Test seam: `create-test-app.ts` `createTestApp` 65 and env merge 77 to 82; `providers-client.kit.ts` `targetFor` 28 to 34, `recordsOf` 61 to 69; `guard-request.ts` `RequestOptions` 7 to 18 (`body` is a string), `send` 27, `sessionCookie` 80; `settings.kit.ts` `makeLibrary` 60; `agent-loop-start.test.ts` `providerEntry` 47 to 55, `settingsText` 57 to 69; `tool-registry-api.test.ts` line 19 (`FIXTURE_PACKS`), `withApp` 151 to 167.
- Existing tests that read `TOOL_ARGS_INVALID` issues: `tool-registry-api.test.ts` AC2 (264 to 303, `arrayContaining`; its second request has valid entity IDs) and E3 (387 to 400, Ajv passes); `tool-registry-read-enable.test.ts` 400 to 420 (Ajv passes, one issue). C13 changes none of these results.
- Mock: `server.mjs` `startMockOpenAI` 17 to 19 (default scenarios folder), `matcherHolds` 103 to 131 (`turnIndex` counts assistant messages), `findStepIndex` 133 to 139 (steps are not consumed), `closedByClient` set at 204 to 207; scenarios `unknown-model.json` (404 `model_not_found`) and `stalled.json` (5000 ms delay, stream reply).
- Fixture tools: `cold_open.yaml` (`entityIds` kinds `[person]`, `styleProfile` style, `person` kinds `[person]`, `required: [coreIdea, person]`); `myth_buster.yaml` (`entityIds` kinds `[claim]`, `required: [coreIdea]`); `scene_builder.yaml` (text inputs only).
- Style kind: `packages/packs/core/entity-types/style-profile.yaml` line 2; `apps/web/src/app/features/tool-registry/project-store-copy.ts` line 43.
- Downstream units: TRG-15 lines 7 and 18; TRG-16 lines 7 and 15 to 17; AGL-09 lines 7 and 18 to 20; GNP-02 lines 7 and 16 to 20; GRR-04 lines 7 and 24; GNP-04 line 20; GRR-11 line 19; TRG-02 lines 20 and 24; TRG-04 line 19; TRG-08 line 26; TRG-09 lines 19 to 26. None has a `plans/<ID>.md` file or a `unit/<ID>` branch.
- Plan statuses: `plans/SAU-17.md` planned (lines 35 to 45, 50); `plans/GNP-06.md` done.
- Boundary rule: `eslint.config.mjs` lines 30 to 40; `tool-registry` already imports `../project-store/project-store.module`, and `agent-loop` imports `../providers/providers.module`.

**Assumed** (each is checked by a named test or step):

- A1. [assumed] Under `@Res({passthrough: true})` the Express response emits `close` when the client socket is destroyed before the reply ends, and has `writableFinished` (checked by C4 part 2).
- A2. [assumed] A fixture pack folder with only `core/tools/` boots; missing genre and entity-type folders are empty packs (`packs.ts` comments at 274, 313 and 339 to 340; checked by C1's boot).
- A3. [assumed] A destroyed client request reaches the mock as `closedByClient: true` through the client's abort (checked by C4 part 2, the mechanism the providers client tests use).
- A4. [assumed] The providers settings written in the test pass `ModelResolver` without a listing, because `choice.model` is set (`providers.resolution.ts` lines 86 to 88).
- A5. [assumed] The 404 `model_not_found` reply is not retried by the client, or every retry gets the same reply; either way the error is `PROVIDER_MODEL_NOT_FOUND` (checked by X1).
- A6. [assumed] `render_probe` lints without an error in a pack with no entity types: the unknown kind `person` is a warning only (`lint.ts` 491 to 498), as for the shared `cold_open` fixture (checked by C1).

**Inconsistencies noticed (reported, not fixed):**

- I1. DECISIONS 2026-11-15 (MPR-08, line 4015) cites `providers.resolution.ts` "lines 17 to 19 and 42" for the missing abort signal. On main, `resolve` is at line 70 and the `listModels` calls at 93 and 132.
- I2. Stale comment after TRG-12: `tool-registry-loader-gate.test.ts` line 13 ("the eleven routes"). This plan does not change it; the test still passes (`arrayContaining`, line 56).

## 8. Review parts

One part. The plan is small and its steps share one test file.

- **Part 1 — executor, routes, validation and tests.** Steps 1 to 11 (install; the fixture tool; the scenario; `validate.ts`; `executor.service.ts`; `tools.controller.ts`; `tool-registry.module.ts`; `invariant-sweep.ts`; the test file; gates; commit). Tests: C1, C2, C3, C4, C5 and X1 of section 4.

## 9. Revision notes (revision 2, Opus reviser, 2026-11-16, main `32dbeef`)

1. Unit line 24, "the field's kinds" for a style field: resolved in the plan (C5, O1). A style field cannot declare kinds (`lint.ts` line 488), and the units name its kind as style-profile, so its kinds are `['style-profile']`. A correct plan is possible with the unit's text, so the YAGNI test's first condition fails and no unit change was made. C3 gained case (d) for it.
2. The unit has no Scope section, so it does not omit `invariant-sweep.ts`; no reviser action adds a scope item, and none is needed. The plan's file table (section 2) already lists the file; the reason is now stated there. The old I2 is removed.
3. O4: resolved without a Navigator decision and without changing the criterion. New C13 and step 4 change `validate.ts` so a malformed entity ID is named next to Ajv errors. C3 (a) now includes one. `validate.ts` moved from the "does not change" list to section 2.
4. O2: the catalogue is every valid enabled tool (C7), not the genre-filtered functions. `ActiveGenreService` left the executor's constructor.
5. C10: the executor passes the de-duplicated entity list to `renderTemplate`, whose map keeps the last entry (`template.ts` lines 655 to 658); revision 1 would have checked the first entry's kind and rendered the last entry.
6. C4 part 2 and X1 use the existing `stalled` and `unknown-model` scenarios in the default folder; one mock per test; tests import nothing from `src/` (C2 compares against the literal system message).
7. Section 5: GNP-06 is done; SAU-17 is the only other planned plan and shares no file; TRG-09 and GNP-04 rows added; the AGL-01 output-type point (old I4) is not an inconsistency (`events.ts` lines 37 and 41).
8. Citation fixes: `agent-run.ts` collect loop 219 to 232 (was 43 to 54); `renderEntity` 575 to 596 (was 56 to 78); `ProjectStoreService` export at `project-store.module.ts` line 22 (was 66); `ToolCatalogEntry` 74 to 79.
9. Regression gate gained `test/tool-registry-loader.test.ts`. Section 8 (Review parts) added.
