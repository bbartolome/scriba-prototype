---
id: PLT-09
title: Module-boundaries lint rule
module: platform
phase: phase:scaffold
milestone: M1
blocked_by: [PLT-01]
parallel_with: [PLT-02, PLT-03, PLT-04, PLT-10, PLT-12]
unblocks: [PLT-11]
---

# PLT-09 — Module-boundaries lint rule

## Why
Boundaries like "the Agent loop and the Graph runner never call each other" must be enforced, not just written down (story 42).

## Decisions
- A module may import another module only through the NestJS `@Module` it exports (DI) and through `@bbartolome/scriba-contracts`, never through internal files.
- `agent-loop` and `graph-runner` may not import each other **at all**, not even their `@Module`.
- Feature folders in `apps/web/src/app/features/<m>/` follow the same rule (no importing another feature's internals).
- Implemented in the root ESLint flat config (e.g. `eslint-plugin-boundaries` or `no-restricted-imports` patterns), so `npm run lint` enforces it.
- Each module's entry file is its `<m>.module.ts` (API) / its routes file (web); document these as the only importable files.

## Acceptance criteria
- [ ] A fixture import from `apps/api/src/modules/graph-runner/**` into `modules/agent-loop/**` fails lint, and the reverse fails too.
- [ ] A fixture import of another module's internal service file fails lint; importing its `*.module.ts` passes.
- [ ] A fixture cross-feature internal import in `apps/web/src/app/features/` fails lint.
- [ ] Importing `@bbartolome/scriba-contracts/<m>` from any module passes.
- [ ] Fixtures live under a lint-test folder and don't ship.
