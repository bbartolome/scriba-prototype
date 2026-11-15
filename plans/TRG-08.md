---
id: TRG-08
status: planned
unit: units/TRG-08-template-engine.md
---
# TRG-08 plan — Pure template engine: tag parser with positions, variables and renderer

Unit: `units/TRG-08-template-engine.md` (module Tool registry, `phase:executor`, M2). Draft by the planner at `main` `f8fe30e` (`git status` clean when read). Nothing was built, installed or tested; only this file is written and committed. The unit has no change notes (its whole text was read, lines 1 to 35).

Revised by the reviser at `main` `9946159` (2026-11-15): the facts of section 7 were re-checked; the six open points are resolved in section 6 (none needs the Navigator); corrections are listed in section 9. No unit file changes.

## 1. Decisions this plan obeys

Labels: **U** = the unit, **M** = the module, other units and the contract, **C** = a smaller choice this plan makes (recorded here, not in `plans/DECISIONS.md`, as `prompt.md` asks for smaller decisions).

### From the unit and the module

- **U1** The registry's own small parser and renderer, not the Handlebars runtime; exact line and column for lint. Source: `units/TRG-08-template-engine.md` line 20.
- **U2** The supported syntax is exactly: `{{field}}` (scalar as plain text, no escaping; array joined with ", "; nothing when absent), `{{#each field}} … {{this}} … {{@index}} … {{/each}}`, `{{#if field}} … {{else}} … {{/if}}`, `{{entity id}}` (id a field or `this` inside `each`; inserts the resolved entity as a header line of kind, id and project-relative path, then its content), `{{toolCatalog}}` (the catalogue of the tools passed in), and `{{!-- comments --}}`. Source: unit lines 22 to 27.
- **U3** Nothing else parses. Parse errors carry line and column. Source: unit line 28.
- **U4** API: `parse(template) → AST | diagnostics`, `variables(AST)` (for lint), `render(AST, {args, entities, toolCatalog}) → string`. Source: unit line 29.
- **U5** Rendering takes only validated arguments, caller-supplied entity contents and catalogue data. It never reads project files, calls the network or runs code. Source: unit lines 17 and 29.
- **U6** Four acceptance criteria, each tested through a harness that renders fixture templates; the HTTP seam lands in TRG-12. Source: unit lines 31 to 35.
- **M1** The engine is pure and dependency-free, built first and reused by lint (TRG-07) and the executor (TRG-12). Source: `modules/tool-registry.md` lines 7 and 16; unit line 14.
- **M2** Prompt templates use only this subset (`{{field}}`, `{{#each}}`, `{{#if}}`, `{{entity id}}`, `{{toolCatalog}}`). Source: `modules/genre-packs.md` line 46. Genre packs already write `{{#each characterIds}}` with `{{entity this}}` (`units/GNP-16-dialogue.md` line 18).
- **M3** Positions are 1-based integers, against the YAML source for lint. TRG-08 emits 1-based positions. Source: `plans/TRG-01.md` D10 (line 103) and open point 5 (line 241), which names TRG-08 as a 1-based emitter.
- **M4** Entity shape: `ResolvedEntity` `{ref, type, path, content}`, with `type` as the kind. Source: `packages/contracts/src/tool-registry/call.ts` (`resolvedEntitySchema`); `plans/TRG-01.md` D12 (line 105) and section 5 (line 221).
- **M5** Port shape: `PortDescriptor` `{inputs: [{key, type, list, required, title}], output: {key, type, kind}, params}`. Source: `packages/contracts/src/tool-registry/views.ts`; `plans/TRG-01.md` D6 (line 82).
- **M6** Contract changes: none. The engine uses the existing contract types (`ResolvedEntity`, `ToolArguments`, `PortDescriptor`, `OutputKind`), so `packages/contracts/**` does not change. Source: `plans/TRG-01.md` (contract phase closed; later changes by expand only).
- **M7** `plans/DECISIONS.md` has no entry about TRG-08 or the template engine. A search for `TRG-08`, `template`, `Handlebars`, `toolCatalog` and `parse` found only the TRG-01 entries (lines 3403 to 3414 and 3620), which settle the contract shapes this plan reuses; line 3413 says TRG-08 is unchanged by them. A search by the module name (`Tool registry`, `tool-registry`) adds only line 1945 (model resolution, MPR-05) and review records of other units; none settles a template decision.

### Choices of this plan (C)

- **C1 Exported names.** `parseTemplate`, `templateVariables` and `renderTemplate`, and the error class `TemplateRenderError`. The unit's names `parse`, `variables` and `render` are descriptive; the longer names avoid a clash with YAML `parse` at TRG-07's import sites.
- **C2 Types.** `TemplateDiagnostic = {message: string, line: number, column: number}`. `parseTemplate(source) → {ok: true, ast} | {ok: false, diagnostics: TemplateDiagnostic[]}`. `TemplateReference = {field: string, usage: 'value' | 'each' | 'if' | 'entity', line: number, column: number}`. `templateVariables(ast) → TemplateReference[]`, one entry per tag occurrence in document order. `ToolCatalogEntry = {name: string, description: string, ports: PortDescriptor}`; its output kind is `ports.output.kind`. `RenderInput = {args: ToolArguments, entities: readonly ResolvedEntity[], toolCatalog: readonly ToolCatalogEntry[]}`. `renderTemplate(ast, input) → string`.
- **C3 Errors and recovery.** The parser reports every bad tag, not only the first. After a bad tag it resumes after that tag's first `}}`. An unclosed `{{` or an unclosed comment ends the scan with one diagnostic. A closing tag that does not match the open block is reported once and closes that block. Each diagnostic has a non-empty message.
- **C4 Positions of diagnostics.** The `{{` of the bad tag. For a mismatched closing tag, the closing tag. For an unclosed block, its opening tag. Lines split on `\n` only. Columns count UTF-16 code units from 1.
- **C5 Grammar.** Accepted tags: `{{name}}`; `{{this}}` and `{{@index}}` (only inside `#each`, and they refer to the innermost enclosing `#each`); `{{toolCatalog}}`; `{{entity X}}` (X an identifier, or `this` only inside `#each`); `{{#each name}}`; `{{#if name}}` (a field name only); `{{else}}` (only inside `#if`, once per `#if`); `{{/each}}`; `{{/if}}`; `{{!-- … --}}` (ends at the first `--}}`). Spaces and tabs just inside the braces are ignored (`{{ field }}` equals `{{field}}`), and one or more spaces or tabs separate `#each`, `#if` and `entity` from their argument. Identifiers match `^[A-Za-z_][A-Za-z0-9_]*$`. The words `this`, `each`, `if`, `else`, `entity` and `toolCatalog` are reserved and are not field names. `#each` and `#if` may nest. A stray `}}` in text is text. There is no escape syntax, so `{{` always opens a tag.
- **C6 Refused forms** (each a positioned error): triple `{{{`, `{{&`, `{{~`, `{{^`, partials `{{>`, any other block such as `{{#with}}` or `{{#unless}}`, `{{else}}` outside `#if` or a second `else`, a closing tag with no open block, a `{{!` not followed by `--`, a path with `.` or `/` (`../x`, `a.b`), a helper or a second argument (`{{upper x}}`), an empty tag, a `#each`, `#if` or `entity` tag with no argument, and an unclosed `{{` or comment.
- **C7 Standalone lines.** A block tag (`#each`, `/each`, `#if`, `else`, `/if`) or a comment that is the only content of its line (spaces and tabs around it allowed) removes that whole line, including its line break. Plain `{{…}}` tags never do. This follows Handlebars 4.7.10's standalone rule (`node_modules/handlebars/dist/cjs/handlebars/compiler/whitespace-control.js`, `isPrevWhitespace` line 148 and `isNextWhitespace` line 167). Source of the choice: the unit calls the engine "Handlebars-like" (title, line 3), and pack templates lay blocks out on their own lines (`units/GNP-16-dialogue.md` line 18). Settled in open point 3.
- **C8 Value rendering.** A string as it is; a number or boolean as `String(value)`; an array of scalars joined with ", "; absent, `null` or a non-scalar renders as nothing. Nothing is escaped.
- **C9 `#if` truthiness.** False for `undefined`, `null`, `false`, `0`, `''`, `NaN` and an empty array; true otherwise. This follows Handlebars 4.7.10 `helpers/if.js` line 26 (`!conditional`, then `isEmpty`), where `0` is falsy by default.
- **C10 `#each`.** Over an absent, `null` or non-array value it iterates zero times. `this` is the item. `@index` is 0-based, as in Handlebars 4.7.10 (`helpers/each.js` line 62, `data.index = index`). Settled in open point 2.
- **C11 Lookups.** Arguments are read only by own property (`Object.hasOwn`). The names `__proto__`, `constructor` and `prototype` are never looked up: a tag naming them renders as absent. Entities are looked up in a `Map` keyed by `ref`, so no prototype is consulted.
- **C12 `{{entity X}}`.** Resolve X (`this` gives the item). An absent, `null` or `''` id renders nothing. A non-string id, or an id with no entity in `entities`, throws `TemplateRenderError` naming the id. Otherwise the output is `<type> <ref> (<path>)`, a line break, then `content` verbatim (no trimming, no escaping). Settled in open point 1.
- **C13 `{{toolCatalog}}`.** One line per entry: `- <name>: <description> Output: <output kind>. Inputs: <inputs>.` where `<inputs>` is the `ports.inputs` list as `<key> (<type>, list|single, required|optional)` joined with `; `, or `none`. Entries are joined with a line break; an empty catalogue renders nothing. The output port is not listed (its key is always `output`, its type `text`). The caller passes only the tools to offer; TRG-08 renders what it is given. Settled in open point 1.
- **C14 Variables.** `templateVariables` reports a `TemplateReference` for each `{{name}}` (usage `value`), `{{#each name}}` (`each`), `{{#if name}}` (`if`) and `{{entity X}}` (`entity`). `{{entity this}}` is reported against the enclosing `#each` field with usage `entity`; `{{this}}` and `{{@index}}` against that field with usage `value`. `{{toolCatalog}}`, comments and text are not references.
- **C15 Purity.** The module has no runtime import: only `import type` from `@bbartolome/scriba-contracts/tool-registry`. No `node:` module, no `eval`, no `Function`, no I/O.

## 2. Files to create or change

| Path | Change | Purpose |
|---|---|---|
| `apps/api/src/modules/tool-registry/template.ts` | new | `parseTemplate`, `templateVariables`, `renderTemplate`, the types of C2, `TemplateRenderError`; implements C3 to C15 |
| `apps/api/test/tool-registry-template.test.ts` | new | Tests T1 to T4 of section 4 (four `it`s, fixtures inline). Imports `../src/modules/tool-registry/template` |

Not changed: `packages/contracts/**` (M6); `apps/api/package.json` and `package-lock.json` (no dependency; the unit says dependency-free); `apps/api/src/modules/tool-registry/tool-registry.module.ts` (the engine is pure functions, not a provider, so there is nothing to register); `catalog.service.ts`; `apps/api/vitest.config.mts`; `units/`; `modules/`; `plans/` except `plans/TRG-08.md` (the planner commits this file only).

Shared-file check (re-run at `9946159`): no draft or planned plan names `template.ts`, `tool-registry-template.test.ts` or the template engine. The only plans not done are `plans/GRR-01.md` and `plans/MPR-08.md`. A search of `plans/*.md` for `tool-registry` and `template` finds `plans/GRR-01.md` (planned since `f8fe30e`; it changes only `packages/contracts/src/graph-runner/**` and its tests) and `plans/MPR-08.md` (planned; no tool-registry line). The units with no plan yet that touch this module are TRG-05 (web preview route and a doc note), TRG-07 and TRG-12 (both blocked by TRG-08, so they merge after it). No draft or planned plan names either file of this plan, so no merge order can conflict on them.

## 3. Procedure

For the implementer. Work in the unit's own worktree, as `plans/TRG-01.md` section 3 sets out: `/Users/bbartolome/workspace/scriba-prototype-wt/TRG-08` on branch `unit/TRG-08`. Create it with `git -C /Users/bbartolome/workspace/scriba-prototype worktree add /Users/bbartolome/workspace/scriba-prototype-wt/TRG-08 -b unit/TRG-08 main`, or without `-b` when only the branch exists. If the worktree already exists, use it. Commit by path only, never `git add -A` or `git commit -a`.

1. Set up. Run `npm ci` in the worktree. Record `node -v` and `npm -v`. Confirm that `plans/TRG-01.md` reads `status: done` on the base commit. Expected: `npm ci` exits 0.
2. Build the contract the API reads: `npm run build -w @bbartolome/scriba-contracts`. Expected: exit 0.
3. Baseline: `npm test -w @bbartolome/scriba-api` on the untouched tree. Expected: exit 0. Record the number of test files and tests. If a test fails before any change, stop and report.
4. Write `apps/api/test/tool-registry-template.test.ts` with tests T1 to T4 of section 4, importing from `../src/modules/tool-registry/template`. Run `npx vitest run test/tool-registry-template.test.ts` in `apps/api`. Expected: the file fails to load because the module does not exist.
5. Commit the test file: `git commit -m "test(TRG-08): add the template engine tests for criteria 1 to 4" -- apps/api/test/tool-registry-template.test.ts`.
6. Write `apps/api/src/modules/tool-registry/template.ts` as section 1 (C2 to C15) describes: the tag scanner with diagnostics, the standalone-line rule, `templateVariables`, `renderTemplate` and `TemplateRenderError`. Use `import type` for the contract types only.
7. Run `npx vitest run test/tool-registry-template.test.ts` in `apps/api`. Expected: 4 passed, 0 failed.
8. Run `npm run build -w @bbartolome/scriba-api`. Expected: exit 0. This compiles `src` and type-checks `src` and `test`.
9. Run `npm test -w @bbartolome/scriba-api`. Expected: exit 0, with the step 3 counts plus 1 test file and 4 tests.
10. Run `npm run lint -w @bbartolome/scriba-api` and `npx prettier --check apps/api/src/modules/tool-registry/template.ts apps/api/test/tool-registry-template.test.ts` from the root. Expected: both exit 0.
11. Purity check: `grep -nE "from '|require\(|\beval\(|Function\(|process\.|fs\." apps/api/src/modules/tool-registry/template.ts`. Expected: the only match is the `import type` line from `@bbartolome/scriba-contracts/tool-registry`.
12. Run `git status --short`. Expected: only `apps/api/src/modules/tool-registry/template.ts`, untracked (the test file was committed at step 5). Commit the engine: `git commit -m "feat(TRG-08): add the template parser, variables and renderer" -- apps/api/src/modules/tool-registry/template.ts`.
13. Report the outputs of steps 1 to 12 (versions, exit codes, counts, the purity grep). The reviewer checks them against section 4. The unit's checkboxes are marked in a later commit after review, as in `3c62f7c`.

## 4. Acceptance criteria and tests

Each criterion has exactly one test, which is one `it`. The seam is in-process: the three exported functions called from the test, with fixtures written in the test file. No HTTP, no packs and no `examples/` are read (`modules/tool-registry.md` lines 48 to 52; unit line 31). Command for all four: `npx vitest run test/tool-registry-template.test.ts` in `apps/api`.

**T1 (criterion 1: fields, arrays, absent fields, `#each` with `this` and `@index`, `#if`/`else`, comment, `{{toolCatalog}}`).** Template, eleven lines with a trailing line break:

```
Role: draft {{coreIdea}}.
{{#if coreIdea}}Idea set.{{else}}No idea.{{/if}}
Material: {{entityIds}}
Length: {{length}}
{{#each entityIds}}
{{@index}}: {{this}}
{{/each}}
{{#if tone}}Tone: {{tone}}{{else}}Tone: none{{/if}}
{{!-- a comment --}}
Tools:
{{toolCatalog}}
```

Input: `args` `{coreIdea: 'the <lighthouse> & "keeper"', entityIds: ['ada', 'bo']}` (no `length`, no `tone`); `entities` `[]`; `toolCatalog` with one entry: name `propose_graph`, description `Sketch a story graph or a recipe from a plain-language intent.`, `ports.inputs` `[intent (text, single, required), entityIds (entity, list, optional)]`, `ports.output.kind` `graph`, `params` `['view', 'files']`.

Expected output, exact (the `Length` line ends with a space; the output ends with a line break):

```
Role: draft the <lighthouse> & "keeper".
Idea set.
Material: ada, bo
Length: 
0: ada
1: bo
Tone: none
Tools:
- propose_graph: Sketch a story graph or a recipe from a plain-language intent. Output: graph. Inputs: intent (text, single, required); entityIds (entity, list, optional).
```

Pass: `parseTemplate` returns `ok: true`, and `renderTemplate` returns exactly that text. The test shows `{{field}}` is unescaped (the `<`, `&` and quotes), `{{length}}` is absent, and both `#if` branches and the comment are handled.

**T2 (criterion 2: `{{entity id}}` inside `#each` inserts each header and content).** Template, no trailing line break: `{{#each entityIds}}` line break `{{entity this}}` line break `{{/each}}`.

Input: `args` `{entityIds: ['bo', 'ada']}`; `entities` `[ada (type character, path characters/ada.md, content "Ada keeps the light."), bo (type character, path characters/bo.md, content "Bo owns the boat."), cy (type character, path characters/cy.md, content "Cy is not listed.")]`.

Expected, exact: `character bo (characters/bo.md)\nBo owns the boat.\ncharacter ada (characters/ada.md)\nAda keeps the light.\n`.

Pass: exact equality. The order follows `entityIds`, and `cy`, which is not listed, is absent.

**T3 (criterion 3: unbalanced blocks and unsupported syntax give positioned errors).** One `it` loops over thirteen templates. For each, `parseTemplate` returns `ok: false` and `diagnostics` is exactly one entry with the given line and column (and a non-empty message).

| Case | Template | Line:column | Error |
|---|---|---|---|
| a | `Intro` line break `{{#each entityIds}}` line break `body` | 2:1 | `#each` not closed |
| b | `Intro` line break two spaces `{{/if}}` | 2:3 | closing tag with no open block |
| c | `{{#if coreIdea}}a{{/each}}` | 1:18 | closing tag does not match `#if` |
| d | `{{#if coreIdea}}a{{else}}b{{else}}c{{/if}}` | 1:27 | second `else` |
| e | `Triple {{{coreIdea}}}` | 1:8 | triple stash |
| f | `{{> header}}` | 1:1 | partial |
| g | `{{upper coreIdea}}` | 1:1 | helper |
| h | `{{../coreIdea}}` | 1:1 | parent path |
| i | `{{this}}` | 1:1 | `this` outside `#each` |
| j | `{{else}}` | 1:1 | `else` outside `#if` |
| k | `{{#each entityIds}}{{this}}` | 1:1 | `#each` not closed (the `this` is valid) |
| l | `{{coreIdea` | 1:1 | unclosed tag |
| m | `{{!-- open` | 1:1 | unclosed comment |

Pass: all thirteen cases hold. The positions in case d are the second `{{else}}` (after `{{#if coreIdea}}`, 16 columns, `a`, then the first `{{else}}`, 8 columns, `b`).

**T4 (criterion 4: `__proto__` and `constructor` lookups render nothing).** Input: `args = JSON.parse('{"__proto__": ["x"], "coreIdea": "y"}')`. The test first asserts `Object.hasOwn(args, '__proto__') === true`, so the case is real. `entities` `[]`; `toolCatalog` `[]`.

Template: `[{{__proto__}}][{{constructor}}][{{#each __proto__}}e{{/each}}][{{#if constructor}}yes{{else}}no{{/if}}][{{entity constructor}}]`.

Expected, exact: `[][][][no][]`.

Pass: `parseTemplate` returns `ok: true` (the names are valid identifiers and are read as absent), and the render equals the expected text.

## 5. Downstream agreement

- **TRG-07 (lint and pack-lint CLI; `blocked_by` TRG-08; `units/TRG-07-lint-pack-lint-cli.md` line 19).** Its plan does not exist yet (`plans/QUEUE.md` lists it as waiting). It must agree with these points.
  - `parseTemplate` supplies the template-syntax errors. TRG-07 turns each into a lint diagnostic `{severity: 'error', rule, message, line, column}` with its own rule name. The positions are relative to the prompt string (open point 6).
  - `templateVariables` supplies three checks: a `field` that is not an input key is an unknown variable (error); `usage` `entity` on an input whose `x-scriba-type` is neither `entity` nor `style` is an error; a required input that no reference names is a warning. Reserved words never appear in `field`, so TRG-07 needs no list of them.
  - TRG-08 adds no lint rule and touches no lint file. TRG-07 must reuse `parseTemplate` and must not write a second parser.
  - Order: TRG-07 is blocked by TRG-08, so TRG-08 merges first. The two changes are correct in that order, and TRG-07's plan must start from the merged `template.ts`.
- **TRG-12 (executor; `blocked_by` TRG-08; `units/TRG-12-executor.md` lines 21 to 27).** TRG-12 closes `phase:executor` together with TRG-08.
  - Step 3 of TRG-12 (resolution and kind checks) runs before step 4 (render). So `TemplateRenderError` is not reached on the executor path. If it is reached, TRG-12 maps it to a server error; its planner chooses the code.
  - TRG-12 builds `toolCatalog` from the catalogue service: `list({genrePack})` filtered to enabled and valid rows, the description, and `ports(name)` (`apps/api/src/modules/tool-registry/catalog.service.ts` line 174). It passes only those entries; the filter is TRG-12's (C13).
  - TRG-12 passes `args` after Ajv validation with defaults applied (its step 2), and `entities` from the request. It inserts `content` verbatim (C12); if it wants front matter removed, it removes it before the call. Its planner decides that. TRG-12's criterion 1 (`units/TRG-12-executor.md` line 36) repeats criterion 2 of this unit at the HTTP seam; with the formats of C12, its expected prompt is the T2 text.
  - TRG-12 calls `parseTemplate` on the tool's prompt. A failure means lint did not run, which cannot happen after TRG-07; TRG-12 treats it as an invalid tool.
- **GNP-02 and GNP-04 goldens (later; they wait on TRG-12).** Their rendered prompts pin the header line (C12) and the catalogue line (C13). `units/GNP-02-golden-harness.md` line 24 requires a golden to fail when the template changes, so any later format change means regenerating goldens. Open point 1.
- **TRG-10 (save returns 422 with line-numbered diagnostics for a template variable that is not an input; `units/TRG-10-save-delete-catalog-changed.md` line 25).** Goes through TRG-07's lint, so it inherits the positions of open point 6.
- **TRG-15 (live previews).** Renders through the render endpoint of TRG-12. No direct dependency on TRG-08.
- **Test seams.** `modules/tool-registry.md` lines 48 to 52 say the template subset is tested through the render endpoint. The HTTP-level checks are TRG-12's criteria 1 and 2 (`units/TRG-12-executor.md` lines 36 and 37). T1 to T4 are the unit's in-process seam (open point 5).
- **Phase.** `units/README.md` line 102 lists TRG-08 in `phase:executor`. The phase closes with TRG-12; no README change is needed.

## 6. Open points, resolved by the revision

None of the six is a criterion change, a settled module decision or a protected decision, so each is resolved here with the simplest option, and none goes to the Navigator.

1. **Golden-pinned formats (C12, C13): keep.** The unit fixes only the content of the header line (kind, id, project-relative path; line 25) and of the catalogue (name, one-line description, port keys with port types, output kind; line 26), not their layout. No golden exists yet (`packages/packs/src` is empty), so nothing has to be regenerated now; GNP-02 and GNP-04 pin the formats of the merged engine. Source: unit lines 25 and 26; `units/GNP-02-golden-harness.md` line 24.
2. **`@index` base (C10): 0-based.** The unit calls the engine Handlebars-like (title) and lists `{{@index}}` without a base; Handlebars 4.7.10 is 0-based (`helpers/each.js` line 62). No unit, module or pack text needs a 1-based index (a search of `units/` and `modules/` for `@index` finds only this unit). Source: unit title and line 23.
3. **Standalone-line rule (C7): keep.** Handlebars-like (unit title), and the pack templates put `{{#each}}`, `{{entity this}}` and `{{/each}}` on lines of their own (`units/GNP-16-dialogue.md` line 18), so without the rule every block would leave blank lines in the prompt. The rule is local to the text between tags and changes no diagnostic position. Source: unit title; Handlebars 4.7.10 `whitespace-control.js` lines 148 and 167.
4. **`templateVariables` has no criterion of its own: no fifth test, no unit change.** Each criterion has exactly one test (T1 to T4); the four criteria do not name `variables(AST)`. TRG-07's criterion 1 (`units/TRG-07-lint-pack-lint-cli.md` line 24: each rule has a fixture with severity and line/column) covers the unknown-variable, `entity`-on-a-non-entity-field and unused-required-input rules, which consume `templateVariables` (TRG-07 line 19). Adding a criterion here would be a criterion change, and nothing needs it.
5. **Test seam (U6): the unit's in-process harness.** The unit's criteria header (line 31) says the criteria are tested through a harness rendering fixture templates and that the HTTP seam lands in TRG-12; the module's "tested through the render endpoint" (`modules/tool-registry.md` line 50) is met by TRG-12's criterion 1 (`units/TRG-12-executor.md` line 36), which runs the same subset through `render`. The two texts agree when read per unit, so the module's decision is not changed. The direct import has precedent (`apps/api/test/compose-version.test.ts` line 5).
6. **Position base across units (C4, M3): prompt-relative, 1-based.** TRG-08 gets only the prompt string (unit line 29: `parse(template)`), so its positions are relative to that string. TRG-07 owns diagnostics "against the YAML source" (`units/TRG-07-lint-pack-lint-cli.md` line 18; `plans/TRG-01.md` D10, line 103) and maps them: the block scalar's first content line plus the line offset, with the scalar's indentation added to the column. TRG-08 does not change. TRG-07's planner settles the mapping.

## 7. Facts checked and facts assumed

### Checked (read in this session; no build, install or test was run)

- Unit: `units/TRG-08-template-engine.md`, whole file (front matter lines 1 to 10; decisions lines 19 to 29; criteria lines 31 to 35). `blocked_by: [TRG-01]`, `unblocks: [TRG-07, TRG-12]`. No change notes.
- Blocker inverse: `grep -rn TRG-08 units/` gives `units/TRG-07-lint-pack-lint-cli.md` line 7 and `units/TRG-12-executor.md` line 7 (`blocked_by`), and both appear in TRG-08's `unblocks`. `units/README.md` line 102 lists TRG-08 in `phase:executor`.
- Module: `modules/tool-registry.md` (ordering line 7; graph line 16; parallelism line 32; module shape line 38; HTTP line 42; testing lines 48 to 52; out of scope lines 55 to 65).
- Format: `units/README.md` (unit format and blocker notation); `plans/PLT-02.md` (section layout); `plans/TRG-04.md` and `plans/TRG-06.md` (layout, Review parts); `prompt.md` lines 84 to 112 (draft rules).
- Downstream: `units/TRG-07-lint-pack-lint-cli.md` lines 18 to 21; `units/TRG-12-executor.md` lines 16 to 36; `units/TRG-01-contract-slice.md` line 30 (API shapes); `units/GNP-04-propose-graph.md` line 20; `units/GNP-02-golden-harness.md` line 24; `units/GNP-16-dialogue.md` line 18; `modules/genre-packs.md` line 46; `units/TRG-10-save-delete-catalog-changed.md` line 25.
- Plans: `plans/TRG-01.md` D6 (line 82), D10 (103), D11 (104), D12 (105), section 3 worktree convention, open points 5 and 6 (241, 242), section 5 TRG-08 bullet (221). Status of every plan: `plans/GRR-01.md` draft, `plans/MPR-08.md` planned, the rest done. `plans/QUEUE.md` lists TRG-08 as available.
- Contract: `packages/contracts/src/tool-registry/call.ts` (`resolvedEntitySchema`, `ToolArguments`), `views.ts` (`portDescriptorSchema`, `PortDescriptor`), `catalog.ts` (`toolSummarySchema`), `spec.ts` (`outputKindSchema`), `index.ts` (re-exports all of them).
- API code: `apps/api/src/modules/tool-registry/` has no template file and no `index.ts`. `catalog.service.ts` has `list`, `detail`, `entry`, `ports(name)` (line 174), `functions(genrePack)`, `validate`. `packs.ts` `LoadedTool` (line 33).
- Config: `apps/api/vitest.config.mts` includes `test/**/*.test.ts`; `apps/api/package.json` `test` is `npm run build && vitest run`, `lint` is `eslint .`; `apps/api/tsconfig.json` includes `src` and `test` and sets `types: ["node"]`; `tsconfig.base.json` sets target ES2022; root `lint` runs the workspace lints and `prettier --check .`; `.prettierignore` lists `/plans/`, `/units/`, `/modules/`.
- Precedent: `apps/api/test/compose-version.test.ts` line 5 and `apps/api/test/events-write-limit.ts` line 2 import `../src/modules/...` directly.
- Handlebars 4.7.10, installed as a transitive dependency, read but not imported: `helpers/each.js` line 62 (`data.index = index`); `helpers/if.js` lines 22 to 27 (the `includeZero` falsy rule and `isEmpty`); `compiler/whitespace-control.js` lines 148 and 167 (the standalone checks).
- Repo state: `main` at `f8fe30e`; `git status` clean; `packages/packs/src` is empty (no tool file, so no golden exists yet).
- Re-checked by the revision at `9946159`: the unit (whole file); `modules/tool-registry.md` lines 7, 16, 38 and 48 to 52; `units/TRG-07-lint-pack-lint-cli.md` lines 7, 18, 19 and 24; `units/TRG-12-executor.md` lines 7, 14, 20 to 27 and 36; `units/GNP-16-dialogue.md` line 18; `units/GNP-02-golden-harness.md` line 24; `units/GNP-04-propose-graph.md` line 20; `modules/genre-packs.md` line 46; `units/TRG-10-save-delete-catalog-changed.md` line 25; `plans/TRG-01.md` status done, D6, D10, D12, line 221 and open point 5; `call.ts` lines 7 to 18 (`ToolArguments`, `ResolvedEntity {ref, type, path, content}`), `views.ts` lines 12 to 45 (`PortInput`, `PortOutput`, `PortDescriptor`), `spec.ts` line 15 (`OutputKind`); `catalog.service.ts` line 174 (`ports(name)`); `apps/api/package.json` scripts (`build` runs both `tsc` passes, `test` builds then runs vitest, `lint` is `eslint .`); `apps/api/tsconfig.json` includes `src` and `test`; `vitest.config.mts` includes `test/**/*.test.ts`; Handlebars 4.7.10 `each.js` line 62, `if.js` line 26, `whitespace-control.js` lines 148 and 167. `plans/GRR-01.md` and `plans/MPR-08.md` are planned, every other plan is done; no `plans/TRG-07.md` or `plans/TRG-12.md` and no `unit/TRG-07` or `unit/TRG-12` branch exists. `grep -rn TRG-08 units/` gives `blocked_by` only in TRG-07 and TRG-12. `apps/api/src/modules/tool-registry/` has no `template.ts`; `apps/api/test/` has no `tool-registry-template.test.ts`.

### Assumed (not checked by running anything)

- The code compiles and runs under the repo's Node and TypeScript setup. `Object.hasOwn` is available under the ES2022 target, which is read from the config and not compiled.
- Vitest collects the new file from the pattern in `vitest.config.mts`.
- TRG-12 validates arguments (defaults applied) and checks entity references before it calls render (its unit lines 22 to 25; its plan does not exist yet).
- The Handlebars behaviour above is the one the unit calls "Handlebars-like". The unit does not require full compatibility; C7, C9 and C10 choose Handlebars behaviour where the unit is silent.
- Caller-supplied `content` is the text to insert; whether front matter is stripped is TRG-12's choice.

## 8. Review parts

One part, because the plan is small.

- **Part 1 — the template engine and its four tests.** Steps 1 to 13 of section 3. Tests T1, T2, T3 and T4 of section 4. The reviewer also checks that only the two section 2 paths changed, and that the purity grep of step 11 matches only the type import.

## 9. Corrections by the revision

1. Section 2: `plans/GRR-01.md` is planned (since `f8fe30e`), not draft; the shared-file check still finds no overlap.
2. Step 12: after the step 5 commit, `git status --short` shows only `template.ts`, not the two paths.
3. Step 9: the expected count adds one test file as well as four tests.
4. Step 11: the purity grep matches `\beval\(`, so a comment word such as "evaluate" is not a false match.
5. C5 and C6: whitespace inside a tag and a block or `entity` tag with no argument are now specified (the draft left them open).
6. M7: the DECISIONS search by module name is recorded.
7. Section 5: TRG-12's criterion 1 is tied to T2's expected text.
8. Section 6: the six open points are resolved, each with its source; C7, C10, C12 and C13 point to the settled points.
