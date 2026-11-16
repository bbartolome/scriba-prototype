---
id: TRG-07
title: Full lint rule set, pack-lint CLI and its library entry point
module: tool-registry
phase: phase:loader-validation
milestone: M2
blocked_by: [TRG-05, TRG-06, TRG-08]
parallel_with: [TRG-09]
unblocks: [TRG-10, TRG-11, "Genre packs packs scaffold and content checks (GNP-01)"]
---

# TRG-07 — Lint and pack-lint

## Why
Lint on save with errors blocking and warnings passing (22–23), each message on a line (24); CI lints every built-in pack file (47) and checks entity kinds (48).

## Decisions
- **Diagnostics** `{severity, rule, message, line, column}` against the YAML source.
- **Rules:** YAML parse; envelope fields; name pattern, file-name match and uniqueness; one-line description (≤ 200 chars, no newlines); output enum; the inputs subset (any keyword outside it is an error — `$ref`, `oneOf`/`anyOf`/`allOf`/`not`, `if/then/else`, nested objects, `patternProperties`, formats) and that the schema compiles in Ajv; `additionalProperties: true` → warning; **hint vocabulary** (unknown `x-scriba-*` key → error; other non-`x-scriba-` `x-` keys → warning, stripped) and its consistency (`x-scriba-port` requires `x-scriba-type`; `entity` requires string or array of string; `style`/`text` require string; `x-scriba-entity-kinds` only with `entity`); **control/type fit** (e.g. `slider` on a string is an error); **known entity kinds** (warning when no loaded entity-type schema declares the kind); reserved `output` key; **template syntax and variables** via TRG-08's parser (unknown variable, `entity` helper on a non-entity/non-style field, unbalanced blocks → errors; required input never used → warning); `schemaVersion` supported.
- Entity-type schemas are linted with the same machinery (nested object field → error; `x-scriba-port`/`x-scriba-control` → error).
- **Pack-lint CLI** `npm run lint:packs`, part of `npm run lint`: loads a packs root exactly like the runtime loader, lints every tool spec and entity-type schema, fails on any error or duplicate names. A **library entry point** returns the same diagnostics; Platform's examples check and Genre packs' tests reuse it instead of re-implementing lint.

## Acceptance criteria
- [x] Each rule has a fixture that triggers it with the right severity and line/column.
- [x] `npm run lint:packs` fails on a deliberately broken fixture pack; the library entry returns the same diagnostics.
- [x] Duplicate names across built-in packs fail.
- [x] An entity-type schema with a nested object field fails lint.
- [x] `npm run lint:packs` passes on the real `packages/packs` (possibly empty at this point).
