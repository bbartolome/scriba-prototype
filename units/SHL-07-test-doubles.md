---
id: SHL-07
title: Test doubles — fake API client and fake event source typed from contracts, plus the feature route-test template
module: shell
phase: phase:core
milestone: M1
blocked_by: [SHL-02, SHL-03]
parallel_with: [SHL-05, SHL-06]
unblocks: [SHL-08, SHL-09, "every feature module's UI tests"]
---

# SHL-07 — Test doubles

## Decisions
- **Fake API client:** same interface as SHL-02; tests register canned responses (or typed errors) per route constant, typed from the contract package; records requests for assertions.
- **Fake event source:** same interface as SHL-03's per-module streams and connection signal; tests push envelopes and simulate drop/re-open/visibility to fire reconcile ticks.
- A provider helper that swaps both in for a rendered route under Angular's Vitest runner.
- A **template feature route test** (a dummy feature registered through the real pattern) that feature modules copy.

## Acceptance criteria
- [x] The dummy feature's route test runs under Vitest using only the fakes, asserting a rendered value from a fake response and a live update from a fake envelope.
- [x] The fakes reject responses that don't match the passed schema (same behaviour as the real client).
