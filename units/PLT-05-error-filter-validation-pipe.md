---
id: PLT-05
title: Global error filter and Zod validation pipe
module: platform
phase: phase:scaffold
milestone: M1
blocked_by: [PLT-04]
parallel_with: [PLT-06, PLT-07, PLT-08]
unblocks: [PLT-11]
---

# PLT-05 — Global error filter and Zod validation pipe

## Why
Every module's errors must look alike to the Shell's API client (story 34), and request bodies are validated with each module's contract Zod schemas without validation glue (story 35).

## Decisions
- A **global exception filter** maps every error to the base error shape `{error: {code, message, details?}}` from `/platform`:
  - Zod validation failures → `PLATFORM_VALIDATION_FAILED` (400) with the issues in `details`.
  - Unknown routes under `/api` → `PLATFORM_NOT_FOUND` (404). (Non-API unknown paths still fall back to `index.html`.)
  - Oversized bodies → `PLATFORM_PAYLOAD_TOO_LARGE` (413).
  - Anything uncaught → `PLATFORM_INTERNAL` (500), no stack in the body, full error logged to stdout.
- Modules throw a typed error carrying their own code (e.g. `PROVIDER_UNREACHABLE`) and status; the filter passes it through in the base shape. Provide that error class/helper from the platform module.
- **Zod validation pipe** that modules apply with their contract schemas.
- `message` never contains secrets.

## Scope
- Filter, pipe, module-error helper, and a test-only controller exercising them.

## Acceptance criteria
- [ ] An invalid body to a test controller using the pipe returns 400 `PLATFORM_VALIDATION_FAILED` in the base shape with Zod issues in `details`.
- [ ] An unknown `/api/...` route returns 404 `PLATFORM_NOT_FOUND`; an unknown non-API path still returns `index.html`.
- [ ] A body over the limit returns 413 `PLATFORM_PAYLOAD_TOO_LARGE`.
- [ ] A thrown plain `Error` returns 500 `PLATFORM_INTERNAL` with no stack in the body and the error logged.
- [ ] A module error with a custom code/status is returned unchanged in the base shape.
- [ ] Every error body validates against the `/platform` error schema.
