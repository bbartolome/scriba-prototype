---
id: TRG-02
status: planned
---
# TRG-02 plan — emission of the three views, Ajv full validate and the fixture-backed tool read

Unit: TRG-02 (module Tool registry, phase:form-renderer, milestone M2; `units/TRG-02-emission-validate.md` front matter lines 2 to 9, body lines 14 to 31). Revision 2 (reviser), status draft, checked at `main` b09bccb; revision 1 was written at `main` 3ababdd. The file and line citations of this plan still hold at b09bccb; the facts that changed since 3ababdd (PST-09 is now `done`; MPR-08 has a branch) are corrected in section 5 and F21. Section 7 lists the facts checked, with file and line, and the facts assumed. The unit's line 21 carries the Navigator's valueType decision as corrected at `bb76e4a` (DECISIONS lines 3439 and 3449); no other unit note changes this unit.

## 1. Decisions this plan follows

### 1a. Settled and obeyed

- **Module shape.** One skeleton at `apps/api/src/modules/tool-registry/`, registered with one import and one array entry in the composition root `apps/api/src/app.module.ts` (lines 12 to 15 imports, lines 18 to 24 `COMPOSED_MODULES`). Source: unit line 18; `modules/tool-registry.md` line 38; `units/README.md` line 128. The module reaches the platform only through its entry file (`apps/api/src/modules/platform/platform.module.ts` line 17; `eslint.config.mjs` line 50, rule R1).
- **Inputs subset.** Root `type: object`, `properties`, `required`, and `additionalProperties` always treated as false. Property types `string`, `integer`, `number`, `boolean`, and `array` of string, integer or number items. Annotations `title`, `description`, `default`. Property order is the form field order and the port order. The key `output` is reserved. Source: unit line 19. Lint enforces the subset in TRG-07 (`units/TRG-07-lint-pack-lint-cli.md` line 19). Nested objects, `$ref` and combinators are out of scope (`modules/tool-registry.md` lines 55 to 63).
- **Function schema.** `{type: 'function', function: {name, description, parameters}}` (unit line 20; `packages/contracts/src/tool-registry/views.ts` lines 80 to 88). `parameters` is `inputs` with every `x-` key removed and `additionalProperties: false`. Entity and style fields get a short hint appended to their description. Style fields are never required in the function schema. Source: unit line 20.
- **Form descriptor.** Ordered fields with key, title, description, control, required, default, enum options, numeric bounds, list flag, entity kinds, port flag, element type and `valueType` (unit line 21; `views.ts` lines 53 to 71, sixteen keys; DECISIONS lines 3403 to 3407). The control is derived on the server, and `valueType` is the type of the value the control sends (unit line 21; DECISIONS line 3439; `units/TRG-03-form-renderer.md` line 22).
- **Port descriptor.** Its shape is `{inputs, output, params}` and its derivation rule is the doc comment of `views.ts` lines 29 to 40 (`portDescriptorSchema`, lines 41 to 46). Source: unit line 22.
- **Computed at load.** The three views are computed at load and returned by get, so the web app never parses YAML or JSON Schema. Source: unit line 23.
- **Ajv.** Each spec's `inputs` is compiled once, draft-07, with `allErrors`, `useDefaults`, `strict`, and no coercion. A bad argument set becomes `TOOL_ARGS_INVALID` (422) with a model-readable `message` (a lead line naming the tool, then one line per issue naming the field, what was expected and what was received), unknown fields reported together with the allowed fields, and structured `issues` of `{path, message}`. The registry never retries. Source: unit line 24; `modules/tool-registry.md` line 59 (retries are out of scope); `packages/contracts/src/tool-registry/errors.ts` lines 6 to 17 (codes), 39 to 50 (statuses: `TOOL_ARGS_INVALID` 422), 56 to 61 (`toolArgsIssueSchema`), 64 to 70 (`toolArgsInvalidDetailsSchema`).
- **Validate result.** A valid validate returns the arguments with defaults applied and the entity IDs to resolve, each tagged with its field and whether it is a style field. Source: unit line 24; `call.ts` lines 21 to 26 (`entityToResolveSchema`) and 40 to 44 (`toolValidateResultSchema`).
- **Error body.** Module errors take Platform's base shape `{error: {code, message, details}}` with the module's code and status (`platform/errors/module-error.ts` lines 2 to 17; `platform-exception.filter.ts` lines 43 to 49; `units/README.md` line 130).
- **Fixture.** `GET /api/tool-registry/tools/:name` and `POST /api/tool-registry/tools/:name/validate` are fixture-backed. The fixture is a registry-owned cold-open fixture: a test fixture, not Genre packs content. The loader replaces the fixture source in TRG-06. Source: unit line 25; `units/TRG-06-pack-loader-catalog.md` line 26; `modules/tool-registry.md` line 52.
- **HTTP.** Routes sit under `/api/tool-registry` behind Setup & auth's global guard. GET reads and never mutates; every command is a POST. Per-tool routes sit under `/tools/:name`. Source: `modules/tool-registry.md` line 42; `units/README.md` line 129; `routes.ts` line 6 (`TOOL_ROUTE`) and lines 13 to 14 (`TOOL_VALIDATE_ROUTE`); `setup-auth.module.ts` line 44 (`APP_GUARD`).
- **Contract.** The shapes are TRG-01's, already on `main` (commits f81179b, 9f6525e, 42fa4d4, 9c8af4e; `plans/TRG-01.md` line 3 `status: done`). This unit adds no contract shape. Names of TRG-01 are used as they are (`plans/TRG-01.md` section 2, lines 138 to 160).
- **Navigator decisions in force.** valueType and its reading of `x-scriba-type` (DECISIONS lines 3403 to 3407, with the correction at lines 3439 and 3449). Unreadable files (lines 3409 to 3414) and the user-copy route (line 3620) are not used here: this unit serves a fixture, not a user pack.
- **Tests.** External behaviour only, through HTTP in `create-test-app` with Setup & auth's guard and a temp library. Unit tests keep their own fixtures and never read `examples/` or the real packs. Source: `modules/tool-registry.md` lines 49 to 52; `units/README.md` line 136.
- **Blockers are done.** Unit line 7 names TRG-01 and PLT-11. `plans/TRG-01.md` line 3 and `plans/PLT-11.md` line 3 both say `status: done`.

### 1b. Decisions this plan makes

Each is the smallest option that meets the unit. None changes a settled decision or a criterion. Section 6 names the ones a reviewer may want to change.

- **D1 Layout.** The files of section 2 under `apps/api/src/modules/tool-registry/`: `inputs.ts` (reads the properties; strips extension keys; `ToolSpecError`), `emit.ts` (`emitViews`), `validate.ts` (`createAjv`, `compileTool`, `validateArguments`), `catalog.service.ts` (`TOOL_SOURCE`, `ToolSourceEntry`, `LoadedTool`, `CatalogService`), `tools.controller.ts`, `cold-open.ts` (the fixture), `tool-registry.module.ts` (the module and its entry re-exports).
- **D2 Derivation per property.** For each property `p` in `properties` order, `hints` is its `x-scriba-*` keys parsed with `toolHintsSchema` (`spec.ts` lines 30 to 35; an unknown `x-scriba-*` key or a value outside the vocabulary is refused).
  - `valueType` is `p.type` for a scalar and `p.items.type` for an array. It must be one of `VALUE_TYPES` (`constants.ts` line 67).
  - `title` is `p.title`, else the key. `description` is `p.description`, else `''`. `default` is `p.default` when the key is present, else `null`.
  - `list` is `p.type === 'array'`. `required` is true when the key is in `inputs.required` (raw; D4).
  - `port` is `hints['x-scriba-port'] === true`. `elementType` is `hints['x-scriba-type']` when present, whether or not the field is a port. `entityKinds` is `hints['x-scriba-entity-kinds']` when present. `enum`, `minimum`, `maximum`, `minLength` and `maxLength` are copied when present on `p`.
  - Port: `{key, type: hints['x-scriba-type'], list, required, title}`. The port type is required; a port without one is a `ToolSpecError` (D9). `params` is the list of non-port keys in property order. The output port is `{key: 'output', type: 'text', kind: spec.output}`.
- **D3 Control.** The first rule that matches wins: (1) `x-scriba-control`; (2) `x-scriba-type` entity gives `entity-picker`; (3) style gives `style-picker`; (4) an `enum` gives `select`; (5) boolean gives `toggle`; (6) integer or number gives `slider` when both `minimum` and `maximum` are present, else `number`; (7) string gives `textarea` when `maxLength` is above 200, else `text`. A list with no entity or style hint takes rules (4) to (7) on its item type. The unit names `textarea` for "long text" without a rule, so this rule is the plan's (section 6, points 1 and 2).
- **D4 Required and style.** The raw `inputs.required` array drives the form's `required`, the port's `required` (the D6 rule of `views.ts` reads the raw array) and the validator. Only the function schema drops style keys from `required`, which is the settled rule (unit line 20). Callers fill an empty style field with the project's style profile before validation (`units/AGL-09-narrative-tools.md` line 19; `units/TRG-16-try-panel.md` line 15; `units/TRG-12-executor.md` line 31), so the validator needs no style exception.
- **D5 Hints and the Ajv setup.**
  - Hint text for an entity field (`x-scriba-type` entity): `Entity ID(s) of kind <k1 or k2>.` when `x-scriba-entity-kinds` is present, else `Entity ID(s).`. For a style field: `Style-profile entity ID; defaults to the project's style profile.` The hint is appended to the property's own description with one space, or used alone when there is none. The wording of the first hint is the unit's (unit line 20). The hint goes into the **function schema only** (`parameters.properties.<key>.description`), as unit line 20 places it; the form field's `description` stays the raw `p.description` or `''` (D2), as the contract test's `coldOpenFields` (lines 79 to 167) expects.
  - `ajv` is added to `apps/api` `dependencies` at exact `8.20.0`, as `yaml` and `openai` are pinned there (`apps/api/package.json` lines 16 and 19). `8.20.0` is the newest 8.x (`npm view ajv@8 version`, section 7a).
  - Options: `new Ajv({allErrors: true, useDefaults: true, strict: true})`. `coerceTypes` is left unset, so it is false. The compiled schema is the inputs with every `x-` key removed at every depth, `type: 'object'`, the raw `required`, and `additionalProperties: false`. Strict mode throws on `x-scriba-type` (section 7a), which is why extensions are stripped first.
  - Two validators per tool, both compiled at load: `full`, and `params` (D6).
- **D6 Params mode.** `mode: 'params'` removes the port keys from a copy of the arguments and validates with the `params` validator, whose `required` drops the port keys. The contract request carries `mode` (`call.ts` lines 33 to 37), so the endpoint must do something per mode. `modules/tool-registry.md` and TRG-09 (`units/TRG-09-read-endpoints-enabled.md` line 19) give the same rule; TRG-09 keeps its acceptance test (section 6, point 6).
- **D7 Messages and issues.** Ajv runs with `allErrors`. Each Ajv error becomes one issue.
  - `path` is a JSON Pointer. For a `required` error it is the parent `instancePath` plus `/` plus the escaped `params.missingProperty` (for example `/coreIdea`). For an `additionalProperties` error it is `/` plus the escaped `params.additionalProperty`. Other errors use `instancePath`, which Ajv already escapes (section 7a). A key is escaped with `~` as `~0` and `/` as `~1`. The empty string is for the whole argument set.
  - `message` is the text after the field name. A missing required field gives `required, expected <what>, received nothing`. A type, enum or bound error gives `expected <what>, received <value>`, or for an enum `expected one of "warm", "dry", received "loud"`. `<what>` comes from the keyword: type `a string`, `an integer`, `a number`, `a boolean` or `a list` (for an item, its item type); `at least N` and `at most N` for bounds; `at least N characters` and `at most N characters` for lengths; `at least N items` and `at most N items` for list lengths; `unique items`; `a value that matches the pattern`. `<value>` is `JSON.stringify(value)`, cut to 80 characters with `...`.
  - An unknown key gives one issue per key with message `unknown field`.
  - The error message is a lead line `Arguments for the tool "<name>" are not valid:`, then one line `- <field>: <message>.` per field issue (`<field>` is `key`, or `key[index]` for an item), then one line `- Unknown fields "a" and "b". Allowed fields: <all property keys in order>.` (`Unknown field "a".` for one). The error is `new ModuleError(TOOL_ERROR_CODES.ARGS_INVALID, TOOL_ERROR_STATUS.TOOL_ARGS_INVALID, message, {issues})`.
- **D8 Entity IDs.** After Ajv passes, every entity or style value present in the arguments (each item of a list) must match `entityRefSchema` (`packages/contracts/src/project-store/entities.ts` line 8; `ENTITY_ID_PATTERN` in `constants.ts` line 4). A value that does not is an issue at its path with `expected an entity ID (lower-case letters, digits and hyphens), received "<value>"`, in the same `TOOL_ARGS_INVALID`. This is an addition to the unit, made because `entityRefs` must satisfy `entityRefSchema` (section 6, point 5). `entityRefs` lists the references in property order, list items in order, duplicates kept.
- **D9 Errors at load.** `ToolSpecError` (in `inputs.ts`) is thrown for: a property named `output`; a hint that fails `toolHintsSchema`; an `x-scriba-port` property with no `x-scriba-type`; a property type outside the subset, or an array whose `items.type` is not a scalar type; and an Ajv compile error, which is wrapped. Two sources with the same name also throw. TRG-06 catches `ToolSpecError` per file. The rules that go further (control and type fit, hint consistency) belong to TRG-07.
- **D10 Fixture.** `cold-open.ts` exports `COLD_OPEN_SOURCE` (the YAML below, as a template literal with no backtick and no `${`) and `COLD_OPEN_ENTRY = {origin: 'core', source: COLD_OPEN_SOURCE}`. `origin` is a label: the fixture is registry-owned. The fixture is the seven-property envelope of `packages/contracts/test/tool-registry.schema.test.ts` (lines 14 to 76), with the four explicit controls removed (`styleProfile`, `length`, `tone`, `person`) so that D3 derives them, and `coreIdea` carries `x-scriba-control: textarea`. With this fixture, D3 gives every control of the contract test's expectation `coldOpenFields` (lines 79 to 167).

```yaml
schemaVersion: 1
name: cold_open
description: Drafts the cold open of a chapter from its core idea.
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
    styleProfile:
      type: string
      title: Style
      x-scriba-type: style
      x-scriba-port: true
    length:
      type: integer
      title: Length
      default: 800
      minimum: 200
      maximum: 2000
    tone:
      type: string
      title: Tone
      enum: [warm, dry]
    person:
      type: string
      title: Person
      x-scriba-type: entity
      x-scriba-port: true
      x-scriba-entity-kinds: [person]
    moment:
      type: string
      title: Moment
      x-scriba-type: text
      x-scriba-port: true
  required: [coreIdea, person]
output: draft
enabled: true
prompt: |
  Write the cold open of the chapter.

  Core idea: {{coreIdea}}
  {{#each entityIds}}{{entity this}}{{/each}}
```

- **D11 Service and seam.** The module provides `TOOL_SOURCE` (a string token, as `AGENT_SETTINGS_REGISTRATION` is in `agent-loop.module.ts` line 14) with `useValue: [COLD_OPEN_ENTRY]`. `CatalogService` is `@Injectable()`, as `AgentSettingsService` is (`agent-settings.service.ts` line 11). At construction it parses each source with `yaml`'s `parse` and `toolSpecSchema` (`spec.ts` lines 54 to 63), computes the views and both validators, and stores a `LoadedTool` `{spec, source, origin, views, compiled}` by `spec.name`. Methods: `entry(name)` (the loaded entry, or `TOOL_NOT_FOUND`), `detail(name)` (a `ToolDetail` with `lint: []`, since lint is TRG-07's), and `validate(name, request)`. TRG-06 replaces the provider only.
- **D12 Routes and statuses.** `ToolsController` is `@Controller()` with `@Get(TOOL_ROUTE)` returning the detail, and `@Post(TOOL_VALIDATE_ROUTE)` with `@HttpCode(200)` and `@Body(new ZodValidationPipe(toolValidateRequestSchema))`, as `agent-settings.controller.ts` lines 13 to 29 do. An unknown name is `TOOL_NOT_FOUND` (404) on both routes. `enabled` is not checked here: the enable switch and the refusal of disabled tools are TRG-09 and TRG-12 (`units/TRG-12-executor.md` line 22).
- **D13 Entry file.** `tool-registry.module.ts` re-exports `CatalogService` and the types `ToolDetail` and `ToolValidateResult`, as `agent-loop.module.ts` lines 7 to 12 do. `emitViews`, `compileTool` and `validateArguments` are not in the entry file. TRG-06, TRG-07, TRG-09, TRG-10 and TRG-12 are in the same module, so they import `emit.ts`, `validate.ts` and `inputs.ts` directly: rule R1 (`eslint.config.mjs` lines 50 to 59) restricts only imports from another module. The pack-lint library entry is TRG-07's.

## 2. Files to create or change

Only the paths below change. The root `package.json`, `tsconfig.base.json`, `eslint.config.mjs`, `.prettierignore`, `.gitignore`, `packages/contracts/**` and `apps/web/**` do not change. `package-lock.json` changes through npm. `packages/contracts/dist/` and `apps/api/dist/` are generated and git-ignored.

| Path | Change | Purpose |
|---|---|---|
| `apps/api/src/modules/tool-registry/inputs.ts` | new | `readInputs(spec)` (the properties in order, each with `key`, `schema`, `hints`, `valueType`, `list`, `required`, `title`, `description`, `isPort`, `isEntity`, `isStyle`); `stripExtensions(value)` (every `x-` key at every depth removed); `ToolSpecError` (D9) |
| `apps/api/src/modules/tool-registry/emit.ts` | new | `emitViews(spec): ToolViews` (D2, D3, D5 hint text, function schema, form, ports) |
| `apps/api/src/modules/tool-registry/validate.ts` | new | `createAjv()`, `compileTool(spec, ajv)` (both validators), `validateArguments(entry, request): ToolValidateResult` (D6, D7, D8) |
| `apps/api/src/modules/tool-registry/catalog.service.ts` | new | `TOOL_SOURCE`, `ToolSourceEntry`, `LoadedTool`, `CatalogService` with `entry`, `detail`, `validate` (D11) |
| `apps/api/src/modules/tool-registry/tools.controller.ts` | new | GET `TOOL_ROUTE` and POST `TOOL_VALIDATE_ROUTE` (D12) |
| `apps/api/src/modules/tool-registry/cold-open.ts` | new | `COLD_OPEN_SOURCE`, `COLD_OPEN_ENTRY` (D10) |
| `apps/api/src/modules/tool-registry/tool-registry.module.ts` | new | `ToolRegistryModule` (controllers, providers, exports) and the entry re-exports (D13) |
| `apps/api/src/app.module.ts` | edit | one import line after line 15 (`ToolRegistryModule`) and one entry after `AgentLoopModule` in `COMPOSED_MODULES` (line 23) |
| `apps/api/package.json` | edit | `"ajv": "8.20.0"` in `dependencies`, between `@nestjs/serve-static` (line 15) and `openai` (line 16) |
| `package-lock.json` | changed by npm | adds ajv 8.20.0 and the json-schema-traverse copy it needs (section 3, step 3) |
| `apps/api/test/invariant-sweep.ts` | edit | two entries in `FIXTURE_PATHS` after line 107, before the closing `};` at line 108: `'/api/tool-registry/tools/:name'` and `'/api/tool-registry/tools/:name/validate'`, each with a path that names `no-such-tool` (the sweep refuses a route template without an entry, lines 168 to 175) |
| `apps/api/test/tool-registry-api.test.ts` | new | criteria AC1 to AC4 and extras E1 to E3 (section 4) |

Must not change: every other file under `apps/api/`, `packages/`, `apps/web/`, `e2e/`, `examples/`, `packages/packs/`, `scripts/`, `units/`, `modules/`, and `plans/DECISIONS.md`. The emitter, the validator and the fixture are the only tool-registry code of this unit.

## 3. Method

Run in the worktree of `unit/TRG-02` from `/Users/bbartolome/workspace/scriba-prototype`. Use `git worktree list` to find it. If the branch exists, add the worktree without `-b`; if not, with `-b` from `main`. Record `node -v` and `npm -v` beside each result. Do not push. Do not add a remote. Do not start the dev servers.

0. **Precondition.** `grep -n '^status:' plans/TRG-01.md plans/PLT-11.md` prints `status: done` for both. In the worktree, `git status --short` prints nothing, then `npm ci` exits 0. Expected: both hold.
1. **Runtime.** `node -v` prints `v26.x`; `npm -v` prints `11.20.0`. The planner read `v26.13.0` and `11.20.0` (section 7a). Expected: the same major versions.
2. **Baseline.** `npm run build -w @bbartolome/scriba-contracts` exits 0 (this builds the `dist` that `apps/api` imports). Then `npm test -w @bbartolome/scriba-api` exits 0. Record the number of test files and tests. Expected: exit 0 on the unchanged tree.
3. **Dependency.** `npm install ajv@8.20.0 --save-exact --workspace=@bbartolome/scriba-api` exits 0 (`--save-exact` is needed: the repository has no `.npmrc` and `npm config get save-exact` prints `false`, so without it npm writes `^8.20.0`). Expected: `apps/api/package.json` gains `"ajv": "8.20.0"` at line 16. `npm ls ajv --workspace=@bbartolome/scriba-api` prints `8.20.0`. The root hoisted `ajv` stays at 6.15.0 (`package-lock.json` lines 5595 to 5597), because `@boundaries/config` needs it (line 1334). `git diff -- package-lock.json` adds the ajv 8.20.0 entry and a json-schema-traverse 1.x entry, and changes no existing version. If it changes any other version, stop and record it.
4. **Write the files** of section 2, following D1 to D13 and the YAML of D10. The fixture's text has no backtick and no `${`. Expected: `git status --short` lists the section 2 paths only.
5. **Format.** `npx prettier --write` on the new and edited files of section 2, then `npx prettier --check` on the same files. Expected: the check passes.
6. **Build.** `npm run build -w @bbartolome/scriba-api` (the `tsc` build and the `--noEmit` check over `src` and `test`). Expected: exit 0.
7. **Lint.** `npm run lint -w @bbartolome/scriba-api`. Expected: exit 0.
8. **New tests.** `npx vitest run test/tool-registry-api.test.ts` in `apps/api`. Expected: AC1 to AC4 and E1 to E3 pass.
9. **Invariant sweeps.** `npm test -w @bbartolome/scriba-api`. Expected: exit 0, with `invariant-get-head` and `invariant-mutation-guard` passing for the two new routes. Without the two `FIXTURE_PATHS` entries the sweep fails by name (`invariant-sweep.ts` lines 168 to 175); that is the reason for the entries.
10. **Root gates.** From the root: `npm run build`, `npm test`, `npm run lint`. Expected: each exits 0.
11. **Paths.** `git status --short` lists exactly the paths of section 2, and `git diff --stat "$(git merge-base main HEAD)" -- . ':!plans'` lists the same files.
12. **Commit.** Stage the section 2 paths by name (never `git add -A`) and commit with `feat(TRG-02): add the tool-registry emission, Ajv validation and the fixture-backed tool read`. The status of this plan stays `draft` in this step; the `done` mark is the orchestrator's.
13. **Fresh clone.** `git clone --branch unit/TRG-02 <repo path> <empty directory>`, then in it `npm ci && npm run build && npm test && npm run lint`. Expected: each exits 0.

## 4. Acceptance criteria and tests

All tests are in `apps/api/test/tool-registry-api.test.ts`, which boots the composed app with `createTestApp({libraryDir: makeLibrary()})` (`create-test-app.ts` lines 9 to 14 and 65; `settings.kit.ts` line 60), reads the session cookie with `sessionCookie` (`guard-request.ts` line 80), and sends requests with `send` (`guard-request.ts` line 27). It uses `LOOPBACK_HOST` and `LOOPBACK_ORIGIN` (`invariant-sweep.ts` lines 38 and 39). The helpers follow `agent-settings-api.test.ts` lines 13 to 30. Each test closes the app and removes the library in a `finally`. The tests import the contract schemas (`toolDetailSchema`, `toolValidateResultSchema`, `toolArgsInvalidDetailsSchema` and `errorBodySchema` from the platform), so every body is also checked against the contract.

| Criterion (unit lines 28 to 31) | Test | Command | Pass condition |
|---|---|---|---|
| AC1: "`GET /tools/cold_open` (fixture) returns the three views; the function schema contains no key starting with `x-` and passes Ajv's draft-07 meta-schema; form and port descriptors match the fixture's declared fields and order." | `it('AC1: …')`: GET `TOOL_ROUTE` with `cold_open` | `npx vitest run test/tool-registry-api.test.ts` in `apps/api` | Status 200. `toolDetailSchema` accepts the body. The keys of `views` are `functionSchema`, `form`, `ports`. A recursive walk of `views.functionSchema` finds no key starting with `x-`. `new Ajv().validateSchema(functionSchema.function.parameters)` is true. `form.fields` keys are `coreIdea, entityIds, styleProfile, length, tone, person, moment`. `ports.inputs` keys are `coreIdea, entityIds, styleProfile, person, moment`; `ports.params` is `length, tone`; `ports.output` is `{key: 'output', type: 'text', kind: 'draft'}`. The controls are `textarea, entity-picker, style-picker, slider, select, entity-picker, text`. `person` is required. `parameters.required` is `coreIdea, person`. In `parameters.properties`, the `person` description is `Entity ID(s) of kind person.` and the `styleProfile` description is `Style-profile entity ID; defaults to the project's style profile.`; every `form.fields[].description` is `''`. Each `form.fields` entry equals the contract test's `coldOpenFields` entry for the same key (copied into this test, since test files export nothing). |
| AC2: "Missing required fields and wrong enum values return `TOOL_ARGS_INVALID` whose message names each bad field with expected and received; unknown fields list the allowed fields." | `it('AC2: …')`: POST validate with `{arguments: {tone: 'loud'}, mode: 'full'}`; then with `{arguments: {coreIdea: 'x', person: 'ada', extra: 1, other: 2}, mode: 'full'}` | same | Status 422 each time; `errorBodySchema` accepts the body; `error.code` is `TOOL_ARGS_INVALID`. The first message contains `coreIdea` with `expected a string, received nothing`, `person` with the same words, and `tone` with `warm`, `dry` and `loud`. Its `issues` include paths `/coreIdea`, `/person` and `/tone`. The second message contains `extra`, `other` and each allowed field name; its `issues` include `/extra` and `/other`. |
| AC3: "A valid validate returns defaults applied and the tagged entity IDs." | `it('AC3: …')`: POST validate with `{arguments: {coreIdea: 'Seven days', entityIds: ['ada-1', 'ada-2'], styleProfile: 'house-style', person: 'ada-lovelace'}, mode: 'full'}` | same | Status 200. `toolValidateResultSchema` accepts the body. `arguments.length` is 800. `entityRefs` equals `[{field: 'entityIds', id: 'ada-1', style: false}, {field: 'entityIds', id: 'ada-2', style: false}, {field: 'styleProfile', id: 'house-style', style: true}, {field: 'person', id: 'ada-lovelace', style: false}]`. |
| AC4: "No coercion: `"3"` for an integer field is rejected." | `it('AC4: …')`: POST validate with `{arguments: {coreIdea: 'x', person: 'ada', length: '3'}, mode: 'full'}` | same | Status 422 with `TOOL_ARGS_INVALID`. `issues` includes `{path: '/length', message: 'expected an integer, received "3"'}`. |
| E1 (extra): unknown tool | GET and POST with `no-such-tool` | same | Status 404 with `TOOL_NOT_FOUND` on both. |
| E2 (extra, D6): params mode | POST with `{arguments: {coreIdea: 'x', length: 900}, mode: 'params'}`, then with `{arguments: {tone: 'warm'}, mode: 'params'}` | same | Status 200 each time. The first `arguments` is `{length: 900}` (the port key is removed, not reported as unknown). The second is `{tone: 'warm', length: 800}` (no required port is checked). |
| E3 (extra, D8): an entity ID that is not an ID | POST with `{arguments: {coreIdea: 'x', person: 'Ada Lovelace'}, mode: 'full'}` | same | Status 422 with `TOOL_ARGS_INVALID`; an issue with path `/person`. |

The existing invariant tests (`invariant-get-head.test.ts`, `invariant-mutation-guard.test.ts`) are not new criteria; they must still pass (section 3, step 9).

## 5. Downstream agreement

- **TRG-06 (pack loader and catalog; `units/TRG-06-pack-loader-catalog.md` line 26, blocked by TRG-02).** Replaces only the `TOOL_SOURCE` provider. It calls `emitViews`, `compileTool` and `validateArguments` unchanged, catches `ToolSpecError` per file and lists the file as invalid (its lines 22 and 23), and reads `schemaVersion` before parsing (TRG-01 D3, `plans/TRG-01.md` line 79). The route shapes do not change. Agrees.
- **TRG-05 (spike gate; `units/TRG-05-spike-gate.md` line 7, blocked by TRG-02).** Its dev route loads the cold-open fixture through GET and submits through POST validate in full mode. Both routes and their shapes are here. The name `cold_open` stays served until TRG-06 replaces the source. Agrees.
- **TRG-03 (form renderer; `units/TRG-03-form-renderer.md` lines 22 and 23).** Reads the form field `control` (D3), `valueType` for the value it sends, `required` and `default` (D2), the port rows in order, and `issues` by the segment after the first `/` of `path` (D7). Agrees; section 6 point 2 is its open question.
- **TRG-04 (pickers; `units/TRG-04-entity-style-pickers.md` lines 15 and 19).** Reads `entityKinds` (D2) and the style control. The style default is the project's, filled by the caller (D4). Agrees.
- **TRG-07 (lint; `units/TRG-07-lint-pack-lint-cli.md` lines 18 to 19).** Reuses `emitViews` and `compileTool` for "the schema compiles in Ajv" and for the views of lint. TRG-02 emits without the lint checks of control and type fit, which are TRG-07's (D9). Agrees.
- **TRG-09 (read endpoints; `units/TRG-09-read-endpoints-enabled.md` lines 18 to 20 and 25).** The `params` mode of D6 is the rule of its line 19, and its acceptance line 25 is tested by E2 here. Its `enabled` override and its list, functions and entity-type routes come later; the detail returns the spec as written. Agrees.
- **TRG-10 (lint, save, delete; `units/TRG-10-save-delete-catalog-changed.md` line 18).** Its lint endpoint returns the three views when there is no error, from `emitViews`. Agrees.
- **TRG-12 (executor; `units/TRG-12-executor.md` lines 22 to 23 and 31).** Step 2 is `validateArguments` in full mode, through `CatalogService.entry`. The caller fills the style default first (D4). Errors are the codes of `errors.ts`. Agrees.
- **AGL-09 and TRG-16 (`units/AGL-09-narrative-tools.md` line 19; `units/TRG-16-try-panel.md` line 15).** Read the descriptors to find entity and style arguments, fill an empty style field, and call the executor. Agrees.
- **MPR-04 (`plans/MPR-04.md` line 15; `units/MPR-04-openai-compatible-client.md`).** Takes the function schema shape of D5 and the `{type, function}` form as its tool schema. Agrees.
- **GNP-07 (`units/GNP-07-cold-open.md` line 17).** Its cold-open pack tool has the same name as the fixture. The fixture is registry-owned and is not pack content; TRG-06 decides which source serves the name. Agrees.
- **Other plans that change the same files.** At `main` b09bccb, `grep '^status:' plans/*.md` finds two other plans that are not `done`: `plans/MPR-08.md` (planned) and `plans/PST-10.md` (draft). PST-09 is now `done` (3c146d6). MPR-08 adds only `apps/api/test/providers-gate.test.ts` (its lines 34 and 54 to 55; `git diff --stat main...unit/MPR-08` lists that one file). Its line 59 forbids it to change `invariant-sweep.ts`, `package.json` and `package-lock.json`. It reads `app.module.ts` lines 18 to 24 (its lines 175 and 229); after this unit the array ends at line 25, which moves a citation and changes no behaviour, and its route check is presence only (`providers-gate.test.ts` line 146 on the branch), so the two new routes do not break it. PST-10 changes only `apps/web` (its lines 82 to 87). Neither changes `apps/api/src/app.module.ts`, `apps/api/package.json`, `package-lock.json` or `invariant-sweep.ts`. This plan therefore conflicts with neither, in either merge order. A later registry unit that adds a route with `:name` adds its `FIXTURE_PATHS` entry at the end of the object, as the rule of `invariant-sweep.ts` lines 3 and 4 requires.

## 6. Open points (decided in revision 2)

None blocks. Each is decided by the reviser as a smaller decision (`prompt.md`, section "Navigator"); none changes a unit, a module file or a criterion.

1. **"Long text" and textarea (D3). Decided: keep rule (7).** Unit line 21 names `textarea` for "long text" and gives no threshold, so the threshold is the plan's. No unit, module note or DECISIONS entry ties `textarea` to a required text port: the contract test's `coldOpenFields` (lines 79 to 167) is a shape example of a done unit, not a derivation rule, and the fixture still yields it because `coreIdea` carries `x-scriba-control: textarea` (D10). GNP-07 (line 17) can set the same hint on its `coreIdea`.
2. **Lists of plain values (D3). Decided: keep.** `CONTROL_TYPES` (`constants.ts` lines 32 to 41) has no list control; the field carries `list: true`, and TRG-03 renders it. A vocabulary gap found by the spike goes into TRG-05's spike note (TRG-05 line 18).
3. **Bounds of lists are not in the form (D2).** Unchanged: `FormField` has sixteen keys (TRG-01 D7); Ajv still enforces the bounds. An expand-contract adds keys if TRG-03 needs them.
4. **Style fields and `required` (D4). Decided: keep the raw `required` in the validator, the form and the ports.** Unit line 20 drops style keys from `required` in the function schema only; the port rule of `views.ts` line 33 reads the raw `required`; every caller fills an empty style field before the call (TRG-12 line 31, AGL-09 line 19, TRG-16 line 15, TRG-04 line 19). A lint rule that refuses a required style field would be a new TRG-07 rule that no unit asks for (YAGNI).
5. **Entity-ID check (D8). Decided: keep D8, `TOOL_ARGS_INVALID`.** The valid result's `entityRefs[].id` is `entityRefSchema` (`call.ts` line 23), so a validate that passes cannot return a malformed ID; the only contract-valid outcomes are to refuse or to drop it, and dropping it would hide an argument the caller must resolve. A malformed ID is a malformed argument, which TRG-12's criterion (line 38) maps to `TOOL_ARGS_INVALID` naming every bad field; `TOOL_ENTITY_UNRESOLVED` (TRG-12 line 24) is for a well-formed ID with no resolved entity, a check that needs the resolved entities, which validate does not have.
6. **Params mode in this unit (D6).** Kept: the contract request requires `mode` (`call.ts` lines 33 to 36), so the endpoint must answer `params`; the rule is TRG-09 line 19, word for word. TRG-09 keeps its own acceptance test (its line 25).
7. **A new runtime dependency of `apps/api` (D5). Decided: allowed; only the record is missing.** Ajv is a settled decision: the module file (line 3, "validates arguments with Ajv") and unit lines 3, 21, 24 and 28 name it, and TRG-07 line 19 and the Agent loop module (`modules/agent-loop.md` line 53) build on it. No module file, unit or DECISIONS entry limits the runtime dependencies of `apps/api` (the only such limit is PLT-02 line 65, for `packages/contracts`). The version (exact `8.20.0`, the newest 8.x, as `openai` and `yaml` are pinned) is the plan's; the orchestrator may record it.
8. **Fixture origin (D10).** Unchanged: `origin: 'core'` is a label; TRG-06 replaces the source.

## Review parts

One part: the plan is small, and every criterion runs through the same two routes and the same emitter and validator.

- **Part 1 — the tool-registry module, its fixture and its two routes.** Steps 0 to 13 of section 3. Tests: AC1, AC2, AC3, AC4, E1, E2 and E3 of section 4, all in `apps/api/test/tool-registry-api.test.ts`, plus the existing invariant sweeps run by step 9.

## 7. Facts checked and facts assumed

### 7a. Facts checked

All reads at `main` 3ababdd, except where a scratch run is named. Scratch files are in `/tmp/trg02-scratch` (outside the repository).

- **F1 Unit.** `units/TRG-02-emission-validate.md` lines 2 to 9 (front matter; `blocked_by` line 7, `unblocks` line 9), lines 14 to 31 (body; decisions lines 18 to 25; criteria lines 28 to 31).
- **F2 Blockers.** `plans/TRG-01.md` line 3 and `plans/PLT-11.md` line 3: `status: done`. TRG-01's commits on `main`: `f81179b`, `9f6525e`, `42fa4d4`, `9c8af4e`, `3bc13ac` (`git log`).
- **F3 Module folder.** `apps/api/src/modules/` holds `agent-loop`, `platform`, `project-store`, `providers` and `setup-auth`; there is no `tool-registry` folder.
- **F4 Composition root.** `apps/api/src/app.module.ts` lines 12 to 15 (imports), 17 (comment: each feature adds one import), 18 to 24 (`COMPOSED_MODULES`, `AgentLoopModule` at line 23).
- **F5 Pattern of a module.** `apps/api/src/modules/agent-loop/agent-loop.module.ts` lines 7 to 12 (entry re-exports), 14 (token string), 17 to 33 (`@Module`). `agent-settings.controller.ts` line 13 (`@Controller()`), 17 (`@Get`), 22 and 23 (`@Post`, `@HttpCode(200)`), 25 (`ZodValidationPipe`). `agent-settings.service.ts` lines 11 and 12 (`@Injectable()`).
- **F6 Platform.** `platform.module.ts` line 17 exports `ModuleError` and `ZodValidationPipe`. `errors/module-error.ts` lines 2 to 17. `errors/platform-exception.filter.ts` lines 42 to 49 (`mapException`, `ModuleError` branch at 43). `errors/zod-validation.pipe.ts` lines 1 to 11 (a structural `parse`).
- **F7 Hints and spec.** `packages/contracts/src/tool-registry/spec.ts`: enums 14 to 27; `toolHintsSchema` 30 to 36 (`z.strictObject`, four optional hints); `toolNameSchema` 39; `jsonSchemaObjectSchema` 50; `toolSpecSchema` 54 to 63 (`z.strictObject`, seven keys).
- **F8 Constants.** `constants.ts`: `TOOL_NAME_PATTERN` 8; `TOOL_DESCRIPTION_MAX_LENGTH` 14; `OUTPUT_KINDS` 17 to 23; `PORT_TYPES` 26; `OUTPUT_PORT_KEY` 29; `CONTROL_TYPES` 32 to 41; `HINT_KEYS` 44 to 49; `VALUE_TYPES` 67.
- **F9 Views.** `views.ts`: `portInputSchema` 12 to 19; `portOutputSchema` 22 to 27; the derivation comment 29 to 40; `portDescriptorSchema` 41 to 46 (`inputs`, `output`, `params`); `valueTypeSchema` 49 to 50; `formFieldSchema` 53 to 71 (sixteen keys, `valueType` optional); `formDescriptorSchema` 74 to 77; `modelFunctionSchema` 80 to 88; `toolViewsSchema` 91 to 96 (three keys, all required).
- **F10 Calls.** `call.ts`: `toolArgumentsSchema` 7; `resolvedEntitySchema` 12 to 18; `entityToResolveSchema` 21 to 26 (`field`, `id`, `style`); `validateModeSchema` 29 to 30; `toolValidateRequestSchema` 33 to 37 (`arguments`, `mode` required); `toolValidateResultSchema` 40 to 44; `toolCallResultSchema` 71 to 75.
- **F11 Catalog.** `catalog.ts`: `toolSummarySchema` 26 to 37; `toolDetailSchema` 52 to 59 (`spec` and `views` nullable; `source` and `lint` always present).
- **F12 Errors and routes.** `errors.ts`: `TOOL_ERROR_CODES` 6 to 17 (with `ARGS_INVALID` and `NOT_FOUND`); `TOOL_ERROR_STATUS` 39 to 50 (`TOOL_NOT_FOUND` 404, `TOOL_ARGS_INVALID` 422); `toolArgsIssueSchema` 56 to 61; `toolArgsInvalidDetailsSchema` 64 to 70. `routes.ts`: `TOOL_ROUTE` 6; `TOOL_USER_ROUTE` 9; `TOOL_VALIDATE_ROUTE` 13 to 14; `TOOLS_ROUTE` 5.
- **F13 Project store.** `packages/contracts/src/project-store/constants.ts` line 4 (`ENTITY_ID_PATTERN` = `/^[a-z0-9][a-z0-9-]*$/`); `entities.ts` lines 6 (`entityIdSchema`) and 8 (`entityRefSchema`); `files.ts` line 6 (`projectPathSchema`).
- **F14 Contract test literal.** `packages/contracts/test/tool-registry.schema.test.ts`: `PROMPT` lines 8 to 12; `coldOpen` lines 14 to 76 (the seven properties, with explicit controls on `styleProfile`, `length`, `tone` and `person`); `coldOpenFields` lines 79 to 167 (control `textarea` for `coreIdea`, `text` for `moment`, and the other controls as D3 derives); `coldOpenViews()` lines 168 to 222 (`functionSchema.parameters` is the raw inputs, which is a shape example, not a derivation; `ports` as D2 derives).
- **F15 Invariant sweep.** `apps/api/test/invariant-sweep.ts` lines 3 and 4 (fixture rule), 38 and 39 (`LOOPBACK_HOST`, `LOOPBACK_ORIGIN`), 73 to 108 (`FIXTURE_PATHS`; the last entry at 105 to 107), 132 and 133 (violation kinds), 168 to 175 (`concretePath` throws for a template with no entry). `invariant-get-head.test.ts` lines 107 and 140 (`library-changed`, `event-emitted`).
- **F16 Test seam.** `create-test-app.ts` lines 9 to 14 (`TestAppOptions`), 65 (`createTestApp`), 77 to 87 (`bootstrap` with `modules`), 82 (log level). `guard-request.ts` line 27 (`send`) and 80 (`sessionCookie`). `settings.kit.ts` line 60 (`makeLibrary`). `agent-settings-api.test.ts` line 5 (`errorBodySchema`) and lines 13 to 30 (helpers).
- **F17 Apps.** `apps/api/package.json` line 15 (`@nestjs/serve-static`), 16 (`openai` 7.55.0), 19 (`yaml` 2.9.1), 20 (`zod`). `apps/api/tsconfig.json` line 3 (`types: ["node"]`). `tsconfig.base.json`: `module` and `moduleResolution` NodeNext.
- **F18 Lock.** `package-lock.json`: hoisted `ajv` 6.15.0 at lines 5595 to 5597, needed by `@boundaries/config` (line 1334); ajv 8.20.0 nested under `@angular-devkit/core` (lines 152 to 154) and `ajv-formats` (lines 5630 to 5632); `fast-deep-equal` 3.1.3 (lines 7021 to 7022); `fast-uri` 3.1.9 (lines 7065 to 7066); `json-schema-traverse` 0.4.1 hoisted (lines 7771 to 7772); `require-from-string` 2.0.2 (lines 9316 to 9318).
- **F19 Ajv scratch (run in this session).** `/tmp/trg02-scratch/check-ajv.cjs` and `check-ajv2.cjs`, with Ajv 8.20.0 from `node_modules/ajv-formats/node_modules/ajv`, on Node v26.13.0. Results: in strict mode a schema with `x-scriba-type` throws `strict mode: unknown keyword: "x-scriba-type"`. With the extensions stripped and `additionalProperties: false`: a missing required key gives `instancePath` `""` and `params.missingProperty`; an extra key gives `""` and `params.additionalProperty`; `length: '3'` gives `/length` with `params.type` `integer`; a bad enum gives `/tone`; a bad list item gives `/entityIds/1`; a non-object gives `""`. A passing validate applies `default` (`length` becomes 800). `"3"` is refused with no coercion. A missing `a/b` key gives `params.missingProperty` `a/b`, so the plan builds the escaped pointer itself. A required key with a default passes, because the default is applied first. The draft-07 `validateSchema` of the parameters is true, and a `required: []` schema is valid. No warning was printed.
- **F20 Versions.** `node -v` gives `v26.13.0`, inside the root `package.json` `engines` of lines 11 and 12 (`>=26 <27`). `npm -v` gives `11.20.0`, the root `packageManager` of line 14. `npm view ajv@8 version` lists 8.20.0 as the highest 8.x. `npm view ajv@8.20.0 dependencies` gives `fast-deep-equal ^3.1.3`, `fast-uri ^3.0.1`, `json-schema-traverse ^1.0.0`, `require-from-string ^2.0.2`.
- **F21 Other plans (rechecked at b09bccb).** `plans/*.md` with `status:` other than `done`, besides this one: `MPR-08.md` (planned; branch `unit/MPR-08` at 8975e06 adds only `apps/api/test/providers-gate.test.ts`) and `PST-10.md` (draft). PST-09 is `done`. Their file lists: `MPR-08.md` lines 34 and 54 to 55 (test file only; line 59 forbids the shared files); `PST-10.md` lines 82 to 87 (`apps/web`). Neither changes `app.module.ts`, `apps/api/package.json`, `package-lock.json` or `invariant-sweep.ts` (grep).
- **F22 Consumers.** `units/TRG-06-pack-loader-catalog.md` lines 18, 20, 22 to 26 (packs root, load once, invalid handling, entity types, catalog service, replaces the fixture). `units/TRG-05-spike-gate.md` line 7. `units/TRG-03-form-renderer.md` lines 22 and 23. `units/TRG-04-entity-style-pickers.md` lines 15 and 19. `units/TRG-07-lint-pack-lint-cli.md` lines 18 and 19. `units/TRG-09-read-endpoints-enabled.md` lines 18 to 20 and 25. `units/TRG-10-save-delete-catalog-changed.md` line 18. `units/TRG-12-executor.md` lines 22, 23 and 31. `units/AGL-09-narrative-tools.md` line 19. `units/TRG-16-try-panel.md` line 15. `plans/MPR-04.md` line 15 (cites this unit's line 20). `units/GNP-07-cold-open.md` line 17.
- **F23 Module notes.** `modules/tool-registry.md` lines 3 (summary), 7 (the loader needs only emission), 13 (the TRG-02 box), 32 and 33 (parallelism), 38 (module shape), 40 to 46 (JSON Schema inputs, function names, HTTP, `tools` section, SSE, output port, execute), 49 to 53 (testing), 55 to 63 (out of scope).
- **F24 Decisions.** DECISIONS lines 3403 to 3407 (valueType), 3409 to 3414 (unreadable files), 3439 and 3449 (corrections to unit line 21), 3617 to 3620 (user-copy route). `plans/TRG-01.md` lines 75 to 137 (D1 to D16), 138 to 160 (section 2), 215 to 233 (section 5), 281 to 289 (section 7a, Ajv facts), 302 (A2).
- **F25 Rules.** `prompt.md` (git-ignored, read by the planner): lines 84 to 95 (the rules of a draft) and lines 297 to 301 (commit style, the unit id in each commit message).

### 7b. Facts assumed (not run)

- **A1.** `npm install ajv@8.20.0 --workspace=@bbartolome/scriba-api` adds only the entries named in section 2 and changes no other version. Inferred from F18; step 3 checks it.
- **A2.** The default import `import Ajv from 'ajv'` type-checks under NodeNext CJS. The runtime is checked (`require('ajv').default` is the class, F19); the type check is step 6.
- **A3.** The `yaml` package keeps the mapping order of the fixture, so `form.fields` follows the file order. Step 8 (AC1) checks it.
- **A4.** The composed app serves the two new routes under the guard, and the invariant sweeps accept them with the two `FIXTURE_PATHS` entries. Not run; checked by steps 8 and 9.
- **A5.** The `dist` of `packages/contracts` exists for `apps/api` after step 2. The build is run in step 2, so this is checked there.
- **A6.** TRG-01's `main` is the contract the plan reads (F2, F7 to F12). The contract files were read at `main` 3ababdd.
