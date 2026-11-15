---
id: SHL-21
title: The Shell's setup-status contract loader reads the CommonJS default export
module: shell
phase: none
milestone: M1
blocked_by: [SHL-08, SAU-01]
parallel_with: []
unblocks: ["Setup & auth token-guard gate (SAU-08)"]
---

# SHL-21 — Contract loader CommonJS interop

This unit is ungated (`phase: none`): Frontend shell `phase:core` closed at its gate SHL-09 (done), and ungated units are allowed (AGL-25 precedent).

## Why
In the production build the dynamic import of the CommonJS contract `@bbartolome/scriba-contracts/setup-auth` exposes only `default`: the lazy chunk ends with `export{chunk_LBEDIZWX_default as default}` and has no named exports. The Shell's loader returns that namespace unchanged (`apps/web/src/app/shell/contract-chunks.ts` line 12), so the landing reads `contract.SETUP_STATUS_ROUTE` as undefined (`apps/web/src/app/shell/landing.ts` line 49), `apps/web/src/app/shell/api-client.ts` line 51 throws "Cannot read properties of undefined (reading 'startsWith')", and the landing shows it as an alert (`landing.ts` lines 58 to 60) instead of navigating. This was found by SAU-08's e2e run, criterion 8 step (e) (`plans/DECISIONS.md`, 2026-11-15, the SAU-08 plan-does-not-work report and the Navigator's decision, option (b)). SAU-08 waits for this unit.

## Decisions
- The loader unwraps the default export with one line, mirroring SAU-06's loader (`apps/web/src/app/features/setup-auth/setup-contract.ts` lines 24 to 26): `const mod = await import('@bbartolome/scriba-contracts/setup-auth'); return mod.default ?? mod;`. Its exported name, its return type (`SETUP_STATUS_ROUTE` and `setupStatusSchema`) and its dynamic load (zod stays in its own chunk) stay as they are.
- The file gets its first spec. It copies the mocked-default case of SAU-06's test X5 (`apps/web/src/app/features/setup-auth/setup-contract.spec.ts`): a `vi.mock` of the specifier whose factory returns `{ default: await importOriginal() }`. The spec also covers the named-export shape; how each case sees its own module shape inside the one spec file is chosen in this unit's plan.
- No other file in `apps/web` changes: not the landing, not the API client, not SAU-06's loader.
- SHL-08 stays done; this unit is a follow-up fix, not a reopening.

## Scope
- `apps/web/src/app/shell/contract-chunks.ts` and its new spec `apps/web/src/app/shell/contract-chunks.spec.ts`.
- Nothing else.

## Acceptance criteria
- [ ] The loader returns SETUP_STATUS_ROUTE and setupStatusSchema when the contract module has named exports, and when it has only default (the production build). Test seam: Vitest, the spec mocks the module both ways.
