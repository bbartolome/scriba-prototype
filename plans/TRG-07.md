---
id: TRG-07
status: planned
---
# TRG-07 plan — full lint rule set, pack-lint CLI and library entry point

Draft 1. Written against main at d3164c0. The registry code, the root `package.json`, `.prettierignore`, `scripts/` and `packages/packs` were read at d3164c0. The commits between 6e25be7 (session start) and d3164c0 touch none of them (`git diff --name-only`). The unit file records no change of the unit: it was read in full (lines 1 to 28), and its only notes are the decisions and criteria. The module file is `modules/tool-registry.md`. Status stays `draft` until the Opus review.

Revision 1 (reviser, at main 3f75bf4; the commits since d3164c0 change only `plans/`). Corrections: the compile gate of step 4 (an extra `inputs-compile` error on four fixtures), the `cold_open` warnings (three, not one: D21, X2, step 14, A9), the X1 and X3 fixtures (the draft's fixtures were refused by the existing structural checks, so they did not test the gates), one test per criterion (C2, C3, C4), the unused `clean-pack`, the GNP-01 obligations, the test precedent (D16, A10), the plan statuses (8a), and "Review parts". No unit change.

Blockers: TRG-05, TRG-06 and TRG-08 are all `status: done` (checked: `plans/TRG-05.md`, `plans/TRG-06.md`, `plans/TRG-08.md`). `plans/QUEUE.md` no longer lists TRG-07 (it is in the pipeline); it lists GNP-01, TRG-10 and TRG-11 as waiting on TRG-07. No `plans/TRG-07.md` existed before this draft.

## 1. Decisions this plan follows

Each decision names its source. Where no source settles a point, the decision is marked **plan choice**, and the simplest option is taken.

**D1 Diagnostics.** A diagnostic is `{severity, rule, message, line, column}`. `severity` is `error` or `warning`. `line` and `column` are 1-based positions in the YAML source. Source: unit line 18; `packages/contracts/src/tool-registry/lint.ts` (`lintDiagnosticSchema`); TRG-01 plan D10 (line 103). TRG-01 plan open point 5 (line 241) left the base to this planner: confirmed, 1-based.

**D2 Rule set.** The rules are those of unit lines 19 and 20. Each has one rule id, listed in section 3. The ids are plan choices (kebab case). Warnings: `additional-properties`, `hint-extension`, `entity-kind`, `template-unused`. Errors: every other rule. Source: unit lines 19 and 20, which name the warnings (`additionalProperties: true`, other `x-` keys, an unknown entity kind, a required input never used).

**D3 Inputs subset, by type.** Keywords allowed per node, besides `type`:
- root: `properties`, `required`, `additionalProperties`, and the annotations `title`, `description`;
- property, all types: the annotations `title`, `description`, `default`;
- `string`: `enum`, `minLength`, `maxLength`, `pattern`;
- `integer` and `number`: `minimum`, `maximum`;
- `boolean`: none;
- `array`: `minItems`, `maxItems`, `uniqueItems`, and `items`, where `items` holds `type` (string, integer or number) and nothing else.

Any other keyword is an `inputs-subset` error. So is a `type` outside the set, and a nested object. Source: unit line 19 ("the inputs subset"); TRG-02 unit line 19 (the keyword lists; "Lint enforces the subset in TRG-07"); TRG-02 plan line 14 (the annotations); TRG-02 plan line 54 (D9: the emitter throws for the shapes it can read, and the rest is TRG-07's). The rule that `items` holds `type` only is a plan choice (open point 3).

**D4 Hint vocabulary.** The four hint keys are the closed set `HINT_KEYS` (`constants.ts`). TRG-05 keeps it unchanged (`docs/adr/0002-form-renderer-spike.md` line 41). An `x-scriba-*` key outside the set is `hint-unknown` (error). Any other `x-` key on a property or the root is `hint-extension` (warning): the runtime strips it (`stripExtensions` in `inputs.ts`). A property whose name starts with `x-` is `property-name` (error), because `stripExtensions` keeps property names and the name would reach the function schema. Source: unit line 19; `constants.ts`; `inputs.ts`; `plans/DECISIONS.md` line 4101 (the TRG-02 review note that assigns this rule to TRG-07).

**D5 Hint consistency and control fit.** `hint-consistency` (error):
- `x-scriba-port` is a boolean, and when true the property has `x-scriba-type`;
- `x-scriba-type` is one of `PORT_TYPES`;
- `entity` needs a string or a list of strings; `style` and `text` need a string (unit line 19);
- `x-scriba-entity-kinds` is a list of non-empty strings and appears only with `x-scriba-type: entity` (unit line 19);
- `x-scriba-control` is one of `CONTROL_TYPES`.

`control-fit` (error), for a hinted `x-scriba-control` only:
- `slider` needs an integer or number with numeric `minimum` and `maximum`;
- `number` needs an integer or number;
- `toggle` needs a boolean;
- `select` needs `enum`;
- `text` and `textarea` need a string;
- `entity-picker` needs an `entity` field, `style-picker` a `style` field; an entity or style field takes its own picker.

Source: unit line 19 ("hint consistency", "control/type fit (e.g. slider on a string is an error)"); `emit.ts` `controlOf` (from line 34), which derives the same controls; TRG-02 unit line 21 (the derivation); TRG-03 unit line 22 (the derived controls). A derived control fits by construction, so only hinted controls are checked (plan choice).

**D6 Entity kinds.** `entity-kind` (warning): a kind in `x-scriba-entity-kinds` that no loaded built-in entity type declares. The check uses the built-in kinds only, because the user pack has no entity types. Source: unit line 19; `modules/tool-registry.md` line 57 ("no entity types in the user pack"), cited by TRG-06 plan S3.

**D7 Template rules and position mapping.** `template-syntax`, `template-variable`, `template-entity` and `template-unused` come from the template engine: `parseTemplate` (`template.ts` line 291) and `templateVariables` (line 477). The lint writes no second parser. Source: unit line 19; TRG-08 plan section 5 (the TRG-07 bullet: "TRG-07 must reuse parseTemplate and must not write a second parser"). The rules over `templateVariables`:
- a reference whose field is not an input key: `template-variable` (error);
- usage `entity` on an input whose `x-scriba-type` is neither `entity` nor `style`: `template-entity` (error);
- a required input that no reference names: `template-unused` (warning).

Position mapping, which settles TRG-08 plan section 6 point 6: `parseTemplate` positions are relative to the prompt string. When `prompt` is a literal block scalar (`|`, `|-`, `|+`), a template position (L, C) becomes the source line of the `prompt` key plus L, and the column equal to the indentation of the first non-blank content line plus C. For any other scalar style, the diagnostic sits at the start of the value, and its message ends with `(template line L, column C)`. The fixtures use `|`. Checked: the `yaml` package reports a literal block's `range[0]` at the `|` indicator (section 8a).

**D8 Entity-type rules.** The envelope, name and schema-version rules are those of tools (section 3). The `fields` rules:
- the root is `type: object`;
- each property is a scalar (the D3 keywords for its type), a list of scalars (the D3 `items`), or the one extension: a list of objects of scalars with `additionalProperties: false` and a list `required`;
- a property of type `object` is a nested object: `entity-field` (error);
- a keyword outside the subset, a malformed extension, or an Ajv compile failure is `entity-field` (error);
- a hint on a field may only be `x-scriba-type: entity` or `x-scriba-entity-kinds`. Any other `x-` key, including `x-scriba-port` and `x-scriba-control`, is `entity-hint` (error).

Source: unit line 20 ("the same machinery (nested object field → error; `x-scriba-port`/`x-scriba-control` → error)"); TRG-06 plan S9 (`fields` uses the tool-inputs subset plus the one extension, line 35); the runtime checks `checkField` and `checkHints` in `entity-types.ts`, read at d3164c0. Plan choice: keyword violations inside entity fields are `entity-field`, not `inputs-subset`, so one entity-type file gets one rule family.

**D9 Library entry point: placement and consumers.** The lint lives in the tool-registry module:
- `apps/api/src/modules/tool-registry/lint.ts`: the rules, and the exports `lintToolSource`, `lintEntityTypeSource`, `countsOf`, `topKeyPosition`;
- `apps/api/src/modules/tool-registry/pack-lint.ts`: `lintPacks` and `formatFinding`.

The API build emits both to `apps/api/dist/modules/tool-registry/` as CommonJS. The tsconfig reads `rootDir` `src` and `outDir` `dist`, and `apps/api/package.json` has no `"type"` field. The `.mjs` consumers load the built file by absolute path with `createRequire` from `apps/api/package.json`, as `scripts/examples-check/lib.mjs` loads contracts (`requireContracts`, lines 11 to 16): the CLI of this unit, the examples-check layer of PLT-22, and the content-check suite of GNP-01.

Source: unit line 21 ("a library entry point returns the same diagnostics; Platform's examples check and Genre packs' tests reuse it"); PLT-22 unit line 17 ("through the pack-lint CLI's library entry point"); GNP-01 unit line 16; module shape, `modules/tool-registry.md` line 38; TRG-01 plan section 5 (the pack-lint library returns `LintResult`); `lib.mjs` lines 11 to 16.

Why not elsewhere (plan choice): the examples check runs as `.mjs` and `lint:examples` builds only contracts (root `package.json`); a new workspace package would move the template, inputs and emit code out of the module; a TypeScript path import from `packages/packs` would bypass the build.

**D10 Runtime gate.** A file with a lint error is invalid: `valid: false`, `error.code` `TOOL_INVALID`, and a message that names the first error and its line. Its entry keeps its parsed `spec`, so its summary `output` is not null, and its switch keeps the spec's `enabled` as the default. A warning does not invalidate. The gate sits in `loadFile` in `packs.ts`, after the structural checks of `checkTool`. The structural checks keep their messages and codes. Lint runs before the structural checks, so every file gets its lint result, and the gate uses it afterwards.

Source: TRG-06 plan S17 (line 43: "a tool with a lint error is invalid"; "a file that parses and fails lint has a non-null `output` and `valid` false"); TRG-06 plan C3 (line 53); TRG-06 plan C4 (line 54); TRG-06 plan section 6, TRG-07 bullet; `plans/DECISIONS.md` lines 3438 and 3440 (the TRG-01 review: a file that fails lint keeps its `output`, and its `enabled` keeps the author's switch). Deviation from TRG-06 C3: C3 says TRG-07 extends `checkTool(raw, stem)`. Here `checkTool` stays structural, and the gate moves to `loadFile`, which holds the source text that the lint's positions need. Recorded for the TRG-06 owner.

**D11 Counts and detail.** Every entry keeps its lint result, whether valid or not. The summary's `lintCounts` and the detail's `lint` are filled from it. Source: TRG-09 plan C6 (line 36) and its TRG-07 bullet (line 115: "TRG-07 fills the detail's `lint` and the summary's `lintCounts`"); TRG-06 C4 (line 54: zero "until TRG-07"). Effect: two TRG-06 assertions change (D19).

**D12 Entity-type gate.** An entity-type file with a lint error stops boot, with the existing `fault` message from `entity-types.ts`. One rule set covers both kinds of file. Source: TRG-06 plan C2 (boot stops for entity-type faults); `entity-types.ts` `fault` (read). Plan choice; open point 2.

**D13 Duplicate names.** `lintPacks` reports a tool name, or an entity kind, that two built-in packs define, as a `duplicate-name` error at the `name:` or `kind:` key of the later file. The runtime keeps its BootError and its message (TRG-06 C2). The two are one rule. Source: unit lines 21 and 26; TRG-06 plan section 6, TRG-07 bullet ("its duplicate-name and file-name rules match C2 and C3, so the runtime refusal and the lint error are one rule").

**D14 CLI.** `npm run lint:packs` runs `npm run build -w @bbartolome/scriba-contracts`, then `npm run build -w @bbartolome/scriba-api`, then `node scripts/lint-packs.mjs`. The script takes `--root <dir>`, which defaults to `packages/packs`. It prints one finding per line on stderr with `formatFinding`. Exit codes: 0 when there is no error (warnings still print), 1 with any error, 2 for a usage error, a root that is not a folder, or a missing API build. The root `lint` chain becomes `npm run lint --workspaces && npm run lint:examples && npm run lint:packs && prettier --check .`. Source: unit line 21 ("`npm run lint:packs`, part of `npm run lint`"); PLT-20 plan line 141 ("both `lint:examples` and `lint:packs` must stay in the `lint` chain"); the header of `scripts/examples-check/index.mjs` (one stderr line per issue, exit 0, 1, 2: the same convention).

**D15 Prettier.** Add `/apps/api/test/fixtures/lint/` to `.prettierignore`. The `yaml-parse` fixture is not valid YAML, so `prettier --check .` (root `lint`) would fail on it. The file already ignores `/units/`, `/modules/`, `/plans/` and `/package-lock.json`. Source: root `lint` script; `.prettierignore` (read).

**D16 Test seams.** Library and runtime tests live in `apps/api/test` (Vitest). Library tests import the TypeScript source directly. The precedent is `apps/api/test/tool-registry-template.test.ts`, which imports `../src/modules/tool-registry/template` (line 10, checked). The lint library is an entry point that the unit names (line 21), so testing it is external behaviour under the module's testing principles. Runtime behaviour is checked over HTTP with `createTestApp`. CLI tests are `node --test` files in `scripts/`. Criterion 5 is a repository gate, not a unit test: the module's testing principles say unit tests never read the real packs (`modules/tool-registry.md` lines 48 to 52). Source: module lines 48 to 52; `units/README.md` Testing section; `scripts/examples-check/m1.mjs` lines 25, 26 and 30 to 33 (a test file may not name `examples/`, so no test in this plan uses that word or the path).

**D17 Nest imports kept.** `lint` loads `platform.module.ts` through `validate.ts` (`ModuleError`), `packs.ts` and `entity-types.ts` (`BootError`). The import stays. TRG-06 plan section 7 point 13 left the choice to TRG-07; moving the error classes is not needed for this unit (plan choice).

**D18 Positions.** The convention for each rule is in section 3. In brief: a key rule sits at its key; a value rule at the value's start; a missing key at its parent's start; a list item at the item; a parse error at the parser's position (`linePos`, 1-based, checked); a template rule at the mapped position (D7). Source: D1; plan choice.

**D19 Existing assertions.** Only `apps/api/test/tool-registry-loader.test.ts` asserts zero lint counts, at lines 323 and 419 (grep, section 8a). They change to the counts of their own files:
- line 323 (`schemaVersion: 2`, refused): `{errors: 1, warnings: 0}`, rule `schema-version` (assumed A2 and A3);
- line 419 (the user copy of `cold_open` with an unclosed quote): `{errors: n, warnings: 0}`, where n is the number of YAML errors the parser reports for that text (assumed A1; recorded at step 10).

No other assertion changes. Source: D11; grep of `lintCounts` and `lint:` in `apps/api/test` and `apps/web/src` (section 8a).

**D20 No contract, template or emitter change.** `packages/contracts` is not changed: the lint shapes already exist (`lint.ts`, `constants.ts`, `index.ts` re-exports them). `template.ts`, `emit.ts`, `inputs.ts` and `validate.ts` are not changed. Source: TRG-08 plan section 5 (TRG-08 touches no lint file; TRG-07 reuses its parser); TRG-02 plan line 180 (TRG-02 emits without the lint checks, which are TRG-07's).

**D21 The `cold_open` warnings.** The built-in `cold_open` (`apps/api/test/fixtures/packs/core/tools/cold_open.yaml`) gets three warnings and stays valid:
- `template-unused`: it lists `person` as required, and its prompt never names `person`;
- `entity-kind`, twice: `entityIds` and `person` both carry `x-scriba-entity-kinds: [person]`, and the only entity type of the fixture packs is `claim` (`nonfiction/entity-types/claim.yaml`).

`myth_buster` (`[claim]`) and `scene_builder` get none. This is the rules working, not a change of content. Source: the four fixture files (read); unit line 19.

## 2. Files to change

New files:
- `apps/api/src/modules/tool-registry/lint.ts`
- `apps/api/src/modules/tool-registry/pack-lint.ts`
- `apps/api/test/tool-registry-lint.test.ts`
- `apps/api/test/fixtures/lint/tools/<rule_stem>.yaml`: 21 files, one per tool rule of section 3, named with underscores (`yaml_parse.yaml`, `envelope.yaml`, `schema_version.yaml`, `name_pattern.yaml`, `file_name.yaml`, `description.yaml`, `output.yaml`, `inputs_subset.yaml`, `inputs_compile.yaml`, `additional_properties.yaml`, `hint_unknown.yaml`, `hint_extension.yaml`, `hint_consistency.yaml`, `control_fit.yaml`, `entity_kind.yaml`, `reserved_output.yaml`, `property_name.yaml`, `template_syntax.yaml`, `template_variable.yaml`, `template_entity.yaml`, `template_unused.yaml`). The underscore stems are tool names, which must match the pattern (section 5 passes each stem as the `name` option).
- `apps/api/test/fixtures/lint/entity-types/nested-object.yaml`, `entity-hint.yaml`, `file-name.yaml` (the kebab-case kinds `nested-object`, `entity-hint`, `file-name`; the test passes the stem `other-kind` for `file-name.yaml`).
- `apps/api/test/fixtures/lint/broken-pack/core/tools/dup_tool.yaml` and `broken-pack/nonfiction/tools/dup_tool.yaml` (a duplicate name, each a valid tool), and `broken-pack/fiction/entity-types/nested-object.yaml` (a nested object).
- `apps/api/test/fixtures/lint/clean-pack/core/tools/clean_tool.yaml` and `clean-pack/nonfiction/entity-types/sample-kind.yaml` (no errors; the tool uses `x-scriba-entity-kinds: [sample-kind]`).
- `scripts/lint-packs.mjs` (the CLI)
- `scripts/lint-packs.test.mjs` (the `node --test` file)

Modified files:
- `apps/api/src/modules/tool-registry/packs.ts`: `builtinFiles`, the lint gate in `loadFile`, the `ToolEntry` shapes, the new `entityKinds` parameters.
- `apps/api/src/modules/tool-registry/entity-types.ts`: `readEntityTypes` uses `builtinFiles`; `loadEntityType` gets the lint gate.
- `apps/api/src/modules/tool-registry/catalog.service.ts`: constructor order, the kinds set, `entityKinds()`, `summaryOf`, `switchOf`, `detailOf`.
- `apps/api/test/tool-registry-loader.test.ts`: lines 323 and 419 only (D19).
- `package.json` (root): the `lint` line and one new `lint:packs` line between `lint:examples` and `mock:openai`.
- `.prettierignore`: one line (D15).

Not changed (checked; these files stay as they are): `packages/contracts/**`, `packages/packs/**`, `apps/api/src/modules/tool-registry/{template,emit,inputs,validate,tools.controller,tool-switches.service,active-genre.service,tools.section,tool-registry.module}.ts`, `scripts/examples-check/**`, `.github/workflows/ci.yml`, `docs/**`, `units/**`, `modules/**`, `plans/DECISIONS.md`, `prompt.md`, `apps/web/**`, `e2e/**`.

## 3. Rules, severities, positions and fixtures

Positions follow D18. The fixture name is the file in section 2; the stem is the name the test passes.

| Rule | Severity | What it checks | Position | Fixture (`apps/api/test/fixtures/lint/`) |
|---|---|---|---|---|
| `yaml-parse` | error | each error of the YAML parser | the parser's `linePos` | `tools/yaml_parse.yaml` (an unclosed flow sequence) |
| `envelope` | error | not a mapping; a zod envelope issue other than `name`, `description`, `output`, `inputs` (this includes a non-integer `schemaVersion`); an unrecognised top-level key; a missing `enabled` or `prompt` | the value; the unknown key; the root for a missing key | `tools/envelope.yaml` (a top-level `extra: 1`) |
| `schema-version` | error | `schemaVersion` above 1 | the value of `schemaVersion` | `tools/schema_version.yaml` (`schemaVersion: 2`) |
| `name-pattern` | error | `name` missing or not `^[a-z][a-z0-9_]{0,63}$` (entity types: `kind` not kebab case) | the value of `name` (the root when `name` is missing) | `tools/name_pattern.yaml` (`name: Name_Pattern`, stem `name_pattern`) |
| `file-name` | error | the name differs from the file stem; checked only when a stem is given | the value of `name` (entity: `kind`) | `tools/file_name.yaml` (`name: other_name`, stem `file_name`); `entity-types/file-name.yaml` (stem `other-kind`) |
| `description` | error | missing, empty, over 200 characters, or containing a line break | the value | `tools/description.yaml` (a `\n` escape in the value) |
| `output` | error | not one of the five `OUTPUT_KINDS` | the value | `tools/output.yaml` (`output: summary`) |
| `inputs-subset` | error | the D3 rules: `inputs` not a mapping; a root keyword outside the set; root `type` not `object`; `required` not a list of strings; `additionalProperties` not a boolean; `properties` not a mapping; a property not a mapping; a keyword outside its type's set; a `type` outside the subset; `items` other than `{type: string|integer|number}` | the keyword's key; the value of a wrong `type` | `tools/inputs_subset.yaml` (`$ref` on a property) |
| `inputs-compile` | error | `compileTool` throws (the Ajv compile); checked only when the zod parse passed and there is no `inputs-subset`, `reserved-output`, `hint-unknown` or `hint-consistency` error (step 4) | the value of `inputs` | `tools/inputs_compile.yaml` (`pattern: "("`) |
| `additional-properties` | warning | root `additionalProperties` is `true` | the value | `tools/additional_properties.yaml` |
| `hint-unknown` | error | an `x-scriba-*` key not in `HINT_KEYS`, on a property or the root | the key | `tools/hint_unknown.yaml` (`x-scriba-colour: red`) |
| `hint-extension` | warning | another `x-` key on a property schema or the root | the key | `tools/hint_extension.yaml` (`x-note: hi` on a property) |
| `hint-consistency` | error | the D5 consistency rules and value sets | the offending hint key (for a port without a type, the `x-scriba-port` key) | `tools/hint_consistency.yaml` (`x-scriba-port: true` with no `x-scriba-type`) |
| `control-fit` | error | a hinted `x-scriba-control` that does not fit (D5) | the value of `x-scriba-control` | `tools/control_fit.yaml` (`x-scriba-control: slider` on a string) |
| `entity-kind` | warning | a kind in `x-scriba-entity-kinds` not declared by a built-in entity type (only when the kinds are given) | the kind's item | `tools/entity_kind.yaml` (`[no-such-kind]`, stem `entity_kind`, with the kinds `{sample-kind}`) |
| `reserved-output` | error | a property named `output` | the property key | `tools/reserved_output.yaml` |
| `property-name` | error | a property name starting with `x-` | the property key | `tools/property_name.yaml` (a property `x-note`) |
| `template-syntax` | error | each `parseTemplate` diagnostic | mapped (D7) | `tools/template_syntax.yaml` (an unclosed `{{#each items}}`) |
| `template-variable` | error | a reference whose field is not an input | mapped | `tools/template_variable.yaml` (`{{missing}}`) |
| `template-entity` | error | `entity` on an input that is not `entity` or `style` | mapped | `tools/template_entity.yaml` (`{{entity topic}}`, with `topic` of type `text`) |
| `template-unused` | warning | a required input that no reference names | the item in `inputs.required` | `tools/template_unused.yaml` |
| `entity-field` | error | D8: `fields` not `type: object`; a nested object; a keyword outside the subset; a malformed item extension; a non-list `required`; the Ajv compile of the fields | the property key | `entity-types/nested-object.yaml`; `broken-pack/fiction/entity-types/nested-object.yaml` |
| `entity-hint` | error | D8: a field hint other than `x-scriba-type: entity` and `x-scriba-entity-kinds` | the hint key | `entity-types/entity-hint.yaml` (`x-scriba-port: true`) |
| `duplicate-name` | error | the same tool name or entity kind in two built-in packs (`lintPacks` only) | the `name:` or `kind:` key of the later file | `broken-pack/nonfiction/tools/dup_tool.yaml` (with `core/tools/dup_tool.yaml`) |

Rules that run on the raw YAML and the parsed envelope (`yaml-parse`, `envelope`, `schema-version`, `name-pattern`, `file-name`) apply to entity types too, with `kind` for `name`. For an entity type, a zod issue on `title`, `description` or `folder` is `envelope`, and one on `fields` is `entity-field`.

## 4. Procedure

Each step ends with a check. A step that fails stops the work, and the failure is reported, not patched around.

1. **Base.** `git rev-parse --short HEAD` (d3164c0 or later) and `git status --short` (no entry under a path of section 2; an unrelated file elsewhere is left alone and never staged). Run `git diff --name-only d3164c0 HEAD -- apps/api packages scripts package.json .prettierignore`. The output must be empty. If it is not, re-read the listed files before any edit.
2. **Baseline.** `npm run build -w @bbartolome/scriba-contracts && npm run build -w @bbartolome/scriba-api && npm test -w @bbartolome/scriba-api`. Expected: exit 0. Record the test counts for the comparison in step 16.
3. **Shared reader (refactor only).** In `packs.ts`, add `builtinFiles(packsRoot, folder)`. It walks `BUILTIN_ORIGINS` in order, lists the `.yaml` files of `<pack>/<folder>` as `yamlFilesIn` does, and returns `{files, duplicates}`. A duplicate is a file whose stem an earlier pack already owns; it goes to `duplicates` with the earlier pack's origin. `readBuiltinTools` uses `builtinFiles(packsRoot, 'tools')` and throws the same BootError message at the first duplicate. In `entity-types.ts`, `readEntityTypes` uses `builtinFiles(packsRoot, 'entity-types')` with the same messages. Check: `npm test -w @bbartolome/scriba-api -- tool-registry` is green (assumed A6 for the filter form).
4. **Write `lint.ts`.** Implement D2 to D8 and the positions of section 3, with these notes:
   - Parse with `parseDocument(source, {lineCounter})` from `yaml`, and take positions as `lineCounter.linePos(node.range[0])`. The `yaml` `Document.getIn(path, true)` gives the node at a path.
   - Run `toolSpecSchema` (tools) or `entityTypeSchema` (entity types) from `@bbartolome/scriba-contracts/tool-registry` with `safeParse`. Map each issue by `path[0]` to its rule, and skip issues whose `path[0]` is `inputs`, because the inputs rules report those. An `unrecognized_keys` issue has an empty path and a `keys` list; it is reported at the key.
   - Collect every diagnostic, then sort by line, column and rule.
   - When the zod parse passed and no `inputs-subset`, `reserved-output`, `hint-unknown` or `hint-consistency` error was found, run `compileTool(spec, createAjv())` in a `try`. A `ToolSpecError` becomes `inputs-compile`. The gate is needed because `compileTool` calls `readInputs` (`validate.ts` line 57), which throws `ToolSpecError` for a reserved `output` property, a hint that fails `toolHintsSchema` (unknown key or bad value), a port without `x-scriba-type`, and a type outside the subset (`inputs.ts` lines 95 to 129). Without it, the fixtures of those four rules would also get an `inputs-compile` error, against step 5. Then, only when no error was found, run `emitViews(spec)` in the same `try`, and return its views; otherwise `views` is null.
   - `lint.ts` imports from `template.ts`, `inputs.ts`, `validate.ts`, `emit.ts` and the contracts only, never from `packs.ts` or `entity-types.ts`, which import it (steps 7 and 8). So there is no import cycle. Its Ajv compile of entity `fields` is its own (the `compileFields` of `entity-types.ts` is private and throws BootError).
   - Run the `file-name` check only when `options.name` is given.
   - Export `lintToolSource(source, {name?, entityKinds?}) → {lint, spec, views}`, `lintEntityTypeSource(source, {stem?}) → LintResult`, `countsOf(lint) → {errors, warnings}`, and `topKeyPosition(source, key) → {line, column}`, which returns the top-level key's position or 1:1.
   Check: `npx tsc --noEmit -p apps/api/tsconfig.json` passes after this step.
5. **Fixtures.** Create the files of section 2. Each tool fixture carries one fault and a valid rest of the envelope, so its only error is its own rule. `prompt` values use the `|` block scalar. Add the line `/apps/api/test/fixtures/lint/` to `.prettierignore` (D15).
6. **Write `pack-lint.ts`.** `lintPacks(packsRoot)`:
   - Read the entity types with `builtinFiles(packsRoot, 'entity-types')`, over `files` and `duplicates` both. Lint each with `lintEntityTypeSource(source, {stem})`. The kinds are the stems of the files with no error.
   - Read the tools with `builtinFiles(packsRoot, 'tools')`, over `files` and `duplicates` both. Lint each with `lintToolSource(source, {name: stem, entityKinds: kinds})`.
   - Add one `duplicate-name` error for each duplicate, at `topKeyPosition(source, 'name')` for a tool or `'kind'` for an entity type.
   - Set each finding's `file` to the path relative to the packs root (`core/tools/x.yaml`).
   - Sort by file, line, column and rule.

   Export `formatFinding(finding)` as `${file}:${line}:${column} ${severity} ${rule}: ${message}`.
7. **Runtime gate in `packs.ts`.** Change these functions:
   - `loadFile(path, stem, origin, entityKinds)`: read the source. Run `lintToolSource(source, {name: stem, entityKinds})` and keep its `lint`. An unreadable file gets `lint: []`. Then parse the YAML and run `checkTool` as now. A structural failure gives an invalid entry with `spec: null` and the existing message, carrying the lint. If `lint` has an error, the entry is invalid with the `spec` from `checkTool`, `error: {code: TOOL_INVALID, message: 'The file "<label>" fails lint: line <L>: <message>.'}`, and the lint. Otherwise the entry is valid, with the lint.
   - `ToolEntry`: the valid variant gets `lint: LintResult`. The invalid variant gets `lint: LintResult` and `spec: ToolSpec | null`. `invalidEntry` takes both.
   - `readBuiltinTools(packsRoot, entityKinds)` and `scanUserTools(dir, previous, entityKinds)` take the kinds and pass them on.
   - `checkTool` keeps its signature and its messages (D10).
8. **Entity-type gate in `entity-types.ts`.** `loadEntityType` reads the source once. After its existing checks, it runs `lintEntityTypeSource(source, {stem})`. If there is an error, it throws `fault(label, <first error message>)` with the line in the message.
9. **Catalog in `catalog.service.ts`.**
   - Constructor: read the entity types first. Store `this.kinds = new Set(this.entityEntries.keys())`. Pass `this.kinds` to `readBuiltinTools` and to `scanUserTools`. `refresh()` passes the same set to `scanUserTools`.
   - Add the public `entityKinds(): ReadonlySet<string>` (TRG-10 uses it).
   - `summaryOf`: `lintCounts: countsOf(entry.lint)`. For an invalid entry: `description: entry.spec?.description ?? ''`, `output: entry.spec?.output ?? null`, and `enabled: false` when `spec` is null, else the override if present, else `spec.enabled`.
   - `switchOf`: for an invalid entry without an override, the default is `entry.spec?.enabled ?? false`.
   - `detailOf`: `lint: entry.lint` in both branches. Remove the comment that says lint is empty.
   - `setEnabled`, `enabledOf` and `notify` are not edited (TRG-09's note).
   Check: `npm test -w @bbartolome/scriba-api`, and the TRG-06 and TRG-09 suites still pass except the two assertions of step 10.
10. **Loader test.** In `apps/api/test/tool-registry-loader.test.ts`, change the expectation at line 323 to `{errors: 1, warnings: 0}`, and at line 419 to the errors count the library gives for that user copy. Run the library on that text first to get the count (A1). Record both values in the implementer's report. Change nothing else in the file.
11. **Library and runtime tests.** Write `apps/api/test/tool-registry-lint.test.ts` (section 5: C1, C3, C4 and X1 to X4). X1 and X3 write their packs and user files in temp folders, as `tool-registry-loader.test.ts` does; they add no fixture file. Run `npm test -w @bbartolome/scriba-api -- tool-registry-lint`.
12. **CLI.** Write `scripts/lint-packs.mjs`:
   - `main(argv)` parses `--root`, defaulting to `packages/packs` under the repository root. It checks that the root is a folder, and that `apps/api/dist/modules/tool-registry/pack-lint.js` exists. Otherwise it prints the build command and exits 2.
   - It loads the library with `createRequire(join(repo, 'apps/api/package.json'))(path)` and calls `lintPacks`.
   - It prints each finding with `formatFinding` to stderr, and exits 0 or 1 by the count of errors. Export `main` for the test, as `scripts/examples-check/index.mjs` does.

   Write `scripts/lint-packs.test.mjs` (section 5, C2). The test builds the API in `before()` when `pack-lint.js` is missing (assumed A5). Run `node --test scripts/lint-packs.test.mjs`.
13. **Root wiring.** In the root `package.json`, change `lint` to `npm run lint --workspaces && npm run lint:examples && npm run lint:packs && prettier --check .`. Add `"lint:packs": "npm run build -w @bbartolome/scriba-contracts && npm run build -w @bbartolome/scriba-api && node scripts/lint-packs.mjs"` between `lint:examples` and `mock:openai`. Then:
    - `npm run lint:packs` exits 0 on `packages/packs` (C5, the gate);
    - `npm run lint:packs -- --root apps/api/test/fixtures/lint/broken-pack` exits 1 (C2, the gate; npm appends the arguments to the last command, assumed A11).
14. **Sanity on the existing fixtures.** Run `node scripts/lint-packs.mjs --root apps/api/test/fixtures/packs`. Expected: exit 0, and exactly three warnings, all in `core/tools/cold_open.yaml` (D21): two `entity-kind` for `person` (the items of the two `x-scriba-entity-kinds` lists) and one `template-unused` for `person` (its item in `inputs.required`). Any other output means a fixture or a rule is wrong, and the rule is fixed, not the fixture (A9).
15. **Full gates.** `npm run build`, `npm test`, `npm run lint` and `npx prettier --check .` each exit 0. The optional `npm run e2e` is expected to pass, since `packages/packs` has no pack folder (A12).
16. **Report.** The implementer's report lists the test counts before and after step 2, the two values set in step 10, the name of each criterion's test, and the output of step 14.
17. **Commit.** Stage by name only. Do not use `git add -A` or `git commit -a`. The unit's implementation commit is separate from this plan's commit.

## 5. Tests: one per acceptance criterion

Criteria as written in `units/TRG-07-lint-pack-lint-cli.md` lines 24 to 28.

**C1 — "Each rule has a fixture that triggers it with the right severity and line/column."** Test: `apps/api/test/tool-registry-lint.test.ts`, one `it.each` with 25 rows: the 21 tool fixtures, the 3 entity fixtures and `duplicate-name` (the last through `lintPacks` on `broken-pack`). Each row gives the file, the rule, the severity and the expected line and column (section 3). The test reads the file, calls `lintToolSource` or `lintEntityTypeSource` with the stem of section 3, and asserts that a diagnostic with that rule, severity, line and column is present. Warnings are asserted with `severity: 'warning'`. The implementer sets each expected line and column from the fixture by the position rule of D18, and the test shows them.

**C2 — "`npm run lint:packs` fails on a deliberately broken fixture pack; the library entry returns the same diagnostics."** Test: `scripts/lint-packs.test.mjs`. It runs `node scripts/lint-packs.mjs --root apps/api/test/fixtures/lint/broken-pack`, and asserts exit 1. It loads the built library with `createRequire`, calls `lintPacks` on the same root, and asserts that the stderr lines equal `lintPacks(root).map(formatFinding)` in order. It also asserts that the output contains a `duplicate-name` error and an `entity-field` error, so the failure comes from the breakage. As a contrast, the same CLI on `apps/api/test/fixtures/lint/clean-pack` exits 0 with empty stderr (the tool's kind `sample-kind` is declared by the pack, so it gets no `entity-kind` warning). To tie the test to the npm command, it reads the root `package.json` and asserts that `scripts['lint:packs']` ends with `node scripts/lint-packs.mjs` and that `scripts.lint` contains `npm run lint:packs`. The test does not run the npm script itself, because it rebuilds two workspaces; the npm form also runs at step 13.

**C3 — "Duplicate names across built-in packs fail."** Test: `apps/api/test/tool-registry-lint.test.ts`. `lintPacks(broken-pack)` returns a `duplicate-name` error for `dup_tool` at the `name:` line of `nonfiction/tools/dup_tool.yaml`. The same test asserts that `readBuiltinTools` on the same root still throws a BootError whose message names `core` and `nonfiction`, which is the TRG-06 C2 behaviour preserved. This is the one test of C3; the exit code of the CLI on that root belongs to C2's test.

**C4 — "An entity-type schema with a nested object field fails lint."** Test: `apps/api/test/tool-registry-lint.test.ts`. `lintEntityTypeSource(nested-object.yaml, {stem: 'nested-object'})` returns an `entity-field` error at the key of the nested property. This is the one test of C4; the `entity-field` line in C2's CLI output belongs to C2's test.

**C5 — "`npm run lint:packs` passes on the real `packages/packs` (possibly empty at this point)."** Test: the command `npm run lint:packs` (exit 0). This is a repository gate, not a unit test (D16). The check is step 13: `npm run lint:packs` exits 0 on `packages/packs`, which has no pack folder yet. It is also run by CI through `npm run lint` (`.github/workflows/ci.yml` line 27). No test file reads `packages/packs`.

Extra tests (not criteria; they cover the hand-offs of TRG-06 and TRG-09 and the D11 change):
- **X1 (runtime gate, D10).** Through `createTestApp`, a user-only tool `slider_text` (the test's `toolYaml` shape, with `x-scriba-control: slider` added to its string property `topic`) is listed with `valid: false`, `output` `draft` (not null), `error.code` `TOOL_INVALID`, `lintCounts: {errors: 1, warnings: 0}`. `GET /api/tool-registry/tools/slider_text` returns `lint` with one `control-fit` diagnostic at the line of the `x-scriba-control` value. The fault is one that the structural checks accept (`slider` is in `CONTROL_TYPES`, and `checkTool` does not check control fit), so only the lint gate makes the file invalid. A `$ref` would not do: `readInputs` refuses a property without a subset type, and `checkTool` would refuse the file with `spec` null.
- **X2 (warnings do not invalidate, D21).** The built-in `cold_open` is listed as `valid: true` with `lintCounts: {errors: 0, warnings: 3}`, and its detail `lint` holds the three warnings of D21.
- **X3 (entity-type gate, D12).** `createTestApp` with `SCRIBA_PACKS_DIR` pointing at a temp packs root that holds one file, `nonfiction/entity-types/fixed-kind.yaml` (kind `fixed-kind`, a valid envelope, and one string field with `const: fixed`), rejects, and the message names `nonfiction/entity-types/fixed-kind.yaml` and the `entity-field` fault. The existing checks of `entity-types.ts` accept this file (`checkField` returns for a scalar type, and Ajv accepts `const`), so only the lint gate refuses it. A nested object would not test the gate: `checkField` already refuses it (line 150).
- **X4 (library contract).** `lintToolSource` with no `name` skips `file-name`. It returns `views` for a source with no error and `views: null` for one with an error. The `lint` list is sorted by line and column.

## 6. Agreement with the downstream units

The order is fixed by `blocked_by` where it applies. Where two changes touch the same file and neither unit is blocked by the other, both orders are stated.

**TRG-09 (done; parallel with TRG-07).** TRG-09 left `lint: []` in `detailOf` and the zero `lintCounts` in `summaryOf` for TRG-07 to fill (its C6). TRG-07 fills both and edits `switchOf`, which TRG-09 did not name. Either order gives the same file: TRG-09 touches no lint field, and TRG-07 replaces the two fields. If the two had merged in the other order, the textual overlap would be the two lines of `summaryOf` and `detailOf`, and keeping both changes resolves it (TRG-09 plan, the TRG-07 bullet).

**TRG-10 (lint, save, delete, catalog-changed; blocked by TRG-06 and TRG-07).** TRG-10 uses this plan's exports.
- `lint` endpoint: `lintToolSource(source, {name, entityKinds: catalog.entityKinds()})`, returning `{lint, views: outcome.views}`. Views are null when there is an error (TRG-01 plan D10).
- `save`: the lint of the same call; any error gives 422 `TOOL_SPEC_LINT_FAILED` with the lint in `details`, and no file is written. Warnings save.
- Files: TRG-10 edits `tools.controller.ts` and adds methods to `catalog.service.ts`. TRG-07 edits `constructor`, `summaryOf`, `switchOf`, `detailOf` and adds `entityKinds()`. TRG-10 is blocked by TRG-07, so TRG-07 lands first. Its methods do not overlap with TRG-07's hunks.

**TRG-11 (loader gate; blocked by TRG-07).** Its scope line 18 says "`npm run lint:packs` wired into `npm run lint` and green in CI". D14 does the wiring. TRG-11 verifies it and changes no file for it. Its checklist (line 22) reads TRG-06's and TRG-07's criteria on `main`.

**GNP-01 (packs scaffold and content checks; blocked by TRG-07).** The content-check suite in `packages/packs/test/` loads `apps/api/dist/modules/tool-registry/pack-lint.js` with `createRequire`, as D9 says, and uses `lintPacks` and `formatFinding` for the zero-error check and the broken-spec fixtures. GNP-01 adds files under `packages/packs/`, and no file of TRG-07 is in that folder. Its broken-spec fixtures (bad output kind, unknown hint, template naming an undeclared input, duplicate name, multi-line description) map to the rules `output`, `hint-unknown`, `template-variable`, `duplicate-name` and `description`, all errors here. Its check that every `x-scriba-entity-kinds` value names a shipped entity type (an error there, GNP-01 line 18) can read this library's `entity-kind` findings (warnings) and fail on any of them: `lintPacks` derives the kinds from the same packs root. One obligation for GNP-01: its suite must build the API first (`npm run build -w @bbartolome/scriba-api`), since `dist` is absent in a fresh checkout and `npm test --workspaces` does not order the workspaces for it. GNP-01's suite reads the real packs by its own criterion ("passes on the (still empty) real packs"); the Tool registry rule that unit tests never read the real packs (`modules/tool-registry.md` line 52) applies to this module's tests, not to Genre packs'.

**PLT-22 (examples check, pack layer; blocked by TRG-11, so after TRG-07).** PLT-22 appends a layer to `LAYERS` in `scripts/examples-check/index.mjs` and loads the pack lint by D9. Its `lint:examples` script builds only contracts today, and it must also build the API, because the library is in `apps/api/dist` (PLT-22's change, not this plan's).
- Either order: TRG-07 does not touch `lint:examples` or `LAYERS`.
- Textual overlap: PLT-22's edit of the `lint:examples` line is on the line above this plan's new `lint:packs` line. Git may report a conflict there. Keep both lines: `lint:examples` (PLT-22's text) then `lint:packs` (this plan's text). The result is the same in either order.

**AGL-25 (planned; root `package.json`).** Its plan (line 54) adds `eval:agent` after the `e2e` entry, which is below `mock:openai`, so it does not touch the `lint` or `lint:examples` lines. Its status is `planned`, and its rework is recorded in `plans/DECISIONS.md` (2026-11-16). Either order: no shared line. Re-check the root file when AGL-25 lands (open point 9).

**PLT-20 (done) and PLT-21 (done).** PLT-20 plan line 141 asks that `lint:examples` and `lint:packs` both stay in the `lint` chain, and D14 keeps both. PLT-21 changed `LAYERS` and is not touched here.

**TRG-02, TRG-05, TRG-06, TRG-08 (done).** The changes to their code are the ones listed in D10, D11, D12 and D19; TRG-06's C3 wording changes as D10 says. TRG-08 gets no change (D20). TRG-05's `HINT_KEYS` set is unchanged.

**PLT-14 (done).** The image copies `packages/packs` whole (plan line 231). This plan adds nothing under `packages/packs`, so the image is unchanged. The library is in `apps/api/dist`, which the image already contains.

**Summary of same-file changes.** `catalog.service.ts`: TRG-09 (done), TRG-10 (after). Root `package.json`: AGL-25 (planned, a different line), PLT-22 (after, the `lint:examples` line). `packages/packs/`: GNP-01 (after; no overlap). `scripts/examples-check/`: PLT-22 (after; no overlap). `apps/api/test/tool-registry-loader.test.ts`: TRG-06 (done) and this plan (D19). No pair of changes in this table depends on the order of merge except the textual ones named above.

## 7. Open points

1. **Library placement (D9).** The library is in `apps/api/src/modules/tool-registry/` and loaded from `apps/api/dist` by path. The alternative, a new workspace package, moves the template, inputs and emit code out of the module, which is a much larger change. Chosen for simplicity; the reviewer may prefer the other.
2. **Entity-type gate (D12).** Lint errors in an entity-type file stop boot, as the existing faults do. TRG-06 C2 does not name lint, so this is a choice of this plan, to keep one rule set.
3. **`items` keywords (D3).** `items` holds `type` only, following TRG-02's list. A property `enum` on array items is an error here. If the Genre packs need item-level `enum`, the subset grows by an expand-contract change, and this plan does not add it.
4. **Keys this plan does not check.** A name in `inputs.required` that is not a declared property (an Ajv schema that can never validate), root annotations beyond `title` and `description`, and the format of `x-scriba-entity-kinds` values beyond "non-empty string". None is in the unit's list, so none is added.
5. **Template positions for folded and plain prompts (D7).** Mapping is exact only for literal block scalars. For other styles the diagnostic sits at the value's start, and the message carries the template position. The fixtures and the built-in packs use `|`.
6. **Duplicate precedence in `readEntityTypes` (step 3).** The duplicate check now runs before the later files load, so a duplicate is reported before a fault in a later file. The messages are unchanged. No TRG-06 test is expected to depend on the order (A8); the test run of step 2 checks this.
7. **Changed TRG-06 assertions (D19).** Two expectations in `tool-registry-loader.test.ts` change from zero to the lint counts, because refused and unparseable files now have lint results. This changes a TRG-06 test, though not a TRG-06 criterion. The reviewer should confirm that this is the intended reading of TRG-06 C4.
8. **Criterion 5 is a gate (D16).** It is run by the step-13 command and by CI, not by a unit test, because the module forbids unit tests that read the real packs. If the reviewer wants an automated check, it belongs in a script test that reads `packages/packs`, which the module would have to allow.
9. **AGL-25 root `package.json` (section 6).** AGL-25 is planned; its rework was committed on 2026-11-16 (`plans/DECISIONS.md`). Its `eval:agent` line and this plan's `lint` and `lint:packs` lines do not overlap, but the root file must be re-read when either lands.
10. **Downstream obligations to hand over.** PLT-22 and GNP-01 must build the API before they load the library, and PLT-22 must add that build to `lint:examples` (section 6). These are their changes, not this plan's, and are recorded here so that their planners see them.
11. **Nest modules in the CLI (D17).** The CLI loads `platform.module.ts` through `validate.ts`, `packs.ts` and `entity-types.ts`. It starts no Nest application. TRG-06 plan section 7 point 13 accepted this, and the reviewer may want the error classes moved out of the module.

## 8. Facts checked and facts assumed

### 8a. Facts checked (read or run at d3164c0)

- **Unit** `units/TRG-07-lint-pack-lint-cli.md`: front matter lines 2 to 9 (`blocked_by` line 7, `parallel_with` line 8, `unblocks` line 9); "Why" line 15; decisions lines 18 to 21; criteria lines 24 to 28. No change note in the file.
- **Module** `modules/tool-registry.md`: ordering line 7; module shape line 38; testing principles lines 48 to 52; the "user pack has no entity types" line 57 (cited by TRG-06 S3).
- **Unit format and blockers:** `units/README.md` (blocker notation; the phase table: `phase:loader-validation` row, line 102).
- **Example plan:** `plans/PLT-02.md` (front matter `id` and `status`; section layout).
- **Upstream statuses:** `plans/TRG-05.md`, `plans/TRG-06.md`, `plans/TRG-08.md` are `status: done`. `plans/TRG-09.md` is done. `plans/QUEUE.md` lists TRG-07 as available.
- **Downstream units:** `units/TRG-10-save-delete-catalog-changed.md` (blocked_by line 7; decisions lines 18 and 19; criteria line 25); `units/TRG-11-loader-gate.md` (line 7, scope line 18, checklist line 22); `units/GNP-01-packs-scaffold-content-checks.md` (blocked_by line 7; scope line 16); `units/PLT-22-examples-check-pack-layer.md` (decisions line 17).
- **Upstream code on main**, read with grep and reads, not as a whole: `packs.ts` (`readBuiltinTools` throws BootError on a duplicate; `checkTool`; `loadFile`; `scanUserTools`; `ToolEntry` with no lint field and an invalid variant without `spec`); `inputs.ts` (`readInputs`, `stripExtensions`, `isRecord`, `ToolSpecError`); `validate.ts` (`createAjv`, `compileTool`; imports `ModuleError` from `platform.module`); `emit.ts` (`emitViews`; `controlOf` from line 34); `template.ts` (`parseTemplate` line 291, `templateVariables` line 477, `TemplateDiagnostic` line 13, `TemplateReference` line 67); `entity-types.ts` (`readEntityTypes` line 260, `loadEntityType`, `checkField`, `checkHints`, `fault`, `compileFields`); `catalog.service.ts` (`switchOf` lines 84 to 87; `summaryOf` lines 89 to 116 with `lintCounts` at line 99; constructor lines 128 to 140; `refresh` lines 143 to 148; `detailOf` lines 299 to 316 with `lint: []` at lines 305 and 313).
- **Contracts:** `packages/contracts/src/tool-registry/lint.ts` (`lintDiagnosticSchema`, `lintResultSchema`, `lintCountsSchema`, `lintRequestSchema`, `lintResponseSchema`); `constants.ts` (`TOOL_SPEC_SCHEMA_VERSION` 1, `ENTITY_TYPE_SCHEMA_VERSION` 1, `TOOL_NAME_PATTERN`, `ENTITY_KIND_PATTERN`, `TOOL_DESCRIPTION_MAX_LENGTH` 200, `OUTPUT_KINDS`, `PORT_TYPES`, `CONTROL_TYPES`, `HINT_KEYS`, `BUILTIN_ORIGINS`, `LINT_SEVERITIES`, `OUTPUT_PORT_KEY`); `index.ts` re-exports them all; `spec.ts` (`toolSpecSchema` is `z.strictObject`; `entityTypeSchema` too); `packages/contracts/dist/tool-registry` exists.
- **Existing tests:** `apps/api/test/tool-registry-loader.test.ts` asserts `lintCounts: { errors: 0, warnings: 0 }` at lines 323 and 419, and nothing else on lint counts or `lint: []` (grep over `apps/api/test` and `apps/web/src`).
- **Fixture packs** `apps/api/test/fixtures/packs/` (four files, read): `core/tools/cold_open.yaml` (its required `person` is not named by the prompt; every other input is used; `entityIds` and `person` name the kind `person`, which no fixture entity type declares); `nonfiction/tools/myth_buster.yaml` (no fault found by reading); `fiction/tools/scene_builder.yaml` (no fault found by reading); `nonfiction/entity-types/claim.yaml` (`fields` of type object, scalars, one list of objects with `additionalProperties: false`).
- **Build and repository:** `apps/api/dist` does not exist (`ls`). `apps/api/package.json` has no `"type"` field (`grep -c` gives 0). `tsconfig.base.json` sets `module` and `moduleResolution` NodeNext. `apps/api/tsconfig.build.json` sets `rootDir` `src` and `outDir` `dist`. The root `package.json` scripts: `lint` = `npm run lint --workspaces && npm run lint:examples && prettier --check .`; `lint:examples` = `npm run build -w @bbartolome/scriba-contracts && node scripts/examples-check/index.mjs`; `test` = `npm test --workspaces && node --test 'scripts/*.test.mjs'`. No `lint:packs` script exists. `.github/workflows/ci.yml` line 27 runs `npm run lint`. `.prettierignore` holds `/units/`, `/modules/`, `/plans/`, `/package-lock.json`.
- **Examples-check rule:** `scripts/examples-check/m1.mjs` `TEST_FILE` (line 25) and `EXEMPT_TEST_FILE` (line 26): only `scripts/examples-check*.test.mjs` is exempt. `R1` (line 30) and `R2_QUOTED` (line 32) flag any test line that has `examples/` or a quoted `examples`.
- **Library behaviour, run in node:** `yaml` `LineCounter.linePos(offset)` gives 1-based `{line, col}`. A literal block scalar's `range[0]` is the `|` (for `prompt: |` on line 2, col 9). A parse error's `linePos` is an array of 1-based `{line, col}`. Ajv 8 with `strict: true` throws at compile for `pattern: "("`. Zod 4 `strictObject` gives an `unrecognized_keys` issue with `path: []` and `keys: ['zz']`, and a missing string gives `invalid_type` with the key in `path`.
- **Plans with status draft or planned** (`status:` read in every `plans/*.md`): AGL-25 (planned), SAU-12 (planned), SAU-13 (planned), SAU-14 (draft) at d3164c0. Re-read by the reviser at 3f75bf4: AGL-25, SAU-13 and SAU-14 are `planned`, SAU-12 is `done`, and no other plan is draft or planned. SAU-13 reads `catalog.service.ts` (`offeredOrigins`) and `BUILTIN_ORIGINS` as sources and changes neither. Grep for the paths this plan changes: AGL-25 names the root `package.json` (line 54) and no other path of this plan; SAU-12 and SAU-14 touch only web files, SAU-13 touches web files and `e2e/specs/setup-phone.e2e.ts` (its section 2, which also says it leaves `apps/api/**` and `packages/**` unchanged), and none touches a path of this plan.
- **Commits since session start:** `git diff --name-only 6e25be7 HEAD` lists setup-auth web files, `e2e/specs/setup-phone.e2e.ts`, `plans/*`, and `units/SAU-12-providers-step.md`. None is in the registry, `packages/packs`, `scripts/`, the root `package.json` or `.prettierignore`. The new DECISIONS headings are about AGL-25, SAU-12, SAU-13 and SAU-14.
- **Hand-offs read:** TRG-06 plan S3, S9, S17, C2, C3, C4, section 6 (TRG-07, TRG-10, TRG-11, GNP-01, PLT-22, PLT-14 bullets), section 7 points 11 and 13; TRG-08 plan section 5 (TRG-07 bullet), section 6 point 6, section 7 (the precedent citation); TRG-09 plan C6 (line 36) and the TRG-07 bullet (line 115); TRG-01 plan D10 (line 103) and open point 5 (line 241); PLT-20 plan line 141; PLT-14 plan line 231; TRG-02 plan lines 14, 54, 180; TRG-02 unit line 19 and 21; TRG-03 unit line 22; `plans/DECISIONS.md` lines 3438, 3440 and 4101; `docs/adr/0002-form-renderer-spike.md` line 41 (cited by TRG-05 plan; read through grep).

### 8b. Facts assumed (each one is marked, and each check is named)

- **A1.** The YAML parser reports the number of errors that determines the line-419 expectation (step 10 computes it). Unchecked.
- **A2.** The `future` fixture of line 323 (`schemaVersion: 2`) produces exactly one lint error, `schema-version`, and no warning. Derived by reading `toolYaml`; confirmed by the step-10 run.
- **A3.** The `schemaVersion: 2` line of the test is the only change the lint sees in that file (the rest of `toolYaml` is valid). Derived by reading; same check as A2.
- **A4.** Loading `platform.module.ts` in plain Node has no side effect beyond evaluating classes, so the CLI can load the library without starting an app. Unchecked; step 12 runs the CLI.
- **A5.** `npm run build -w @bbartolome/scriba-api` emits `apps/api/dist/modules/tool-registry/pack-lint.js` as CommonJS, from the tsconfig reads above. Derived from the config; confirmed in step 12.
- **A6.** `npm test -w @bbartolome/scriba-api -- <filter>` passes the filter to Vitest. Unchecked; if it does not, step 3 and step 11 use `npx vitest run <filter>` inside `apps/api`.
- **A7.** The vitest config of `apps/api` includes `test/**/*.test.ts` (read in TRG-08 plan section 7, not re-read here). Unchecked here.
- **A8.** No TRG-06 or TRG-09 test relies on the duplicate-before-fault order of step 3, and no test except the two of D19 asserts a lint-sensitive value. Derived from grep; the step-2 and step-15 test runs check it.
- **A9.** `apps/api/test/fixtures/packs` lints with zero errors and exactly three warnings, all in `cold_open` (D21: two `entity-kind` and one `template-unused`, all for `person`). Derived by reading the four files; confirmed at step 14.
- **A10.** Resolved by the reviser: the precedent of D16 is `apps/api/test/tool-registry-template.test.ts` line 10, which imports the template source directly (checked).
- **A11.** `npm run <script> -- --root <dir>` appends the arguments to the last command of the script (npm's standard behaviour; AGL-25 plan line 54 states the same). Confirmed at step 13.
- **A12.** The e2e suite is unaffected by this plan, because `packages/packs` has no pack folder and the e2e harness points `SCRIBA_PACKS_DIR` at it (TRG-06 plan section 6, E2E bullet). Unchecked here; the optional run of step 15 checks it.
- **A13.** Zod, the `yaml` package, Ajv and Nest are the versions in the lockfile (`package.json` pins and `apps/api/package.json`); no version is changed by this plan. Read from `package.json`; not checked against the lockfile.
- **A14.** A diagnostic for a source that fails to parse as YAML carries the parser's position, and the same source gives no further diagnostics (D18). Designed here; the step-4 check confirms it in the tests.

## Review parts

- **Part 1: the lint library, the fixtures and the runtime gates (criteria 1, 3 and 4).** Steps 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11 and 14; the files `lint.ts`, `pack-lint.ts`, the fixtures under `apps/api/test/fixtures/lint/`, `.prettierignore`, and the edits of `packs.ts`, `entity-types.ts`, `catalog.service.ts` and `tool-registry-loader.test.ts`. Tests: C1, C3, C4, X1, X2, X3 and X4 (all in `apps/api/test/tool-registry-lint.test.ts`). The reviewer of this part also checks that `checkTool` keeps its messages and codes, and that only lines 323 and 419 of the loader test change.
- **Part 2: the CLI and the root wiring (criteria 2 and 5).** Steps 12, 13, 15, 16 and 17; the files `scripts/lint-packs.mjs`, `scripts/lint-packs.test.mjs` and the root `package.json`. Tests: C2 (`scripts/lint-packs.test.mjs`) and C5 (the command `npm run lint:packs`). The reviewer of this part also checks that the diff changes only the files of section 2.
