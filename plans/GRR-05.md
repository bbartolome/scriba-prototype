---
unit: GRR-05
status: planned
---
# GRR-05 plan — stop, fail-fast on error, and stop on project switch

Unit: GRR-05 (module graph-runner, phase:engine, M4). `units/GRR-05-stop-fail-fast-switch.md`: front matter lines 2 to 9 (`blocked_by` GRR-04; `parallel_with` GRR-06, GRR-07; `unblocks` GRR-08, GRR-13). Why line 15, Decisions lines 18 to 20, criteria lines 23 to 25. Drafted against main `fec7c07`. Nothing was built, run, committed or changed except this file. "CHECKED" means read or grepped on main; "ASSUMED" means not checked here (section 2b).

Revised on 2026-11-17 against main `3fe3182` (no code change since `fec7c07`): A3 to A6 checked against the code (section 2b); both open points decided by the reviser (section 7); the test fixtures corrected (the `RECIPES` and `recordsOf` imports, the event stream opened before each start, the mock's `closedByClient` read by polling); the contract path of `projectSwitchedDataSchema` corrected; section 8 "Review parts" added. No unit file was changed.

## Goal

GRR-04 (merged) already fails fast on a thrown node error; that is GRR-04's open point 2 (section 4 table). GRR-05 adds what is missing: the stop route and its effect on the running model call, a stop reason on the run, the stop on a project switch, and the rule that no node step runs after a stop is received. It adds three tests, one per criterion, and no other behaviour.

Out of scope: output nodes and pending changes (GRR-06), run logs and restart recovery (GRR-07), the Run UI and its Stop button (GRR-13), any contract change and any unit or DECISIONS change.

## 1. Sources

Decisions this plan obeys:

- **D1 fail-fast** (unit line 18): "when a node fails it becomes `error` with a readable message; every node still `queued` becomes `stopped`; the run ends `error`. Pending changes already created stay in the queue."
- **D2 stop** (unit line 19): "POST `{runId}`; unknown run → `GRAPH_RUN_NOT_FOUND`: aborts the model call in progress; the running node and every queued node become `stopped`; the run ends `stopped` with reason `author`. **No pending change is created after the stop is received.**"
- **D3 project switch** (unit line 20): "register with the Project store's in-process `onProjectSwitched` hook; a switch stops the old project's active run exactly like Stop, with reason `project-switched`."
- **Criteria** (unit lines 23 to 25): quoted in section 5, unchanged.
- **Module** (`modules/graph-runner.md`): line 40 "All routes act on the active project"; line 41 every command is a POST; line 43 `GRAPH_RUN_NOT_FOUND`; line 45 "nodes run one at a time; fail-fast on error; one active run per project"; line 50 the API seam (composed app, mock model server, scripted slow responses).
- **Units README**: line 64 (`unblocks` is the exact inverse of `blocked_by`; CHECKED: GRR-08 and GRR-13 name GRR-05); line 132 (reads are GET, commands are POST); line 139 (external behaviour only).
- **GRR-04 plan** (`plans/GRR-04.md`): section 6 open point 2 and P9 (a failing tool node before GRR-05: node `error`, queued nodes `stopped`, run `error`, no reason); P12 (`setStatus` is the one place a status changes; `finish` moves the record to `last` before `run-ended`); P18 (`RunRecord.controller` is for GRR-05; GRR-04 never calls `abort()`).
- **DECISIONS** (`plans/DECISIONS.md` lines 5651 to 5656, the GRR-04 review of 2026-11-17): records P9 as the fail-fast rule "until GRR-05". No entry names GRR-05 (grep CHECKED).
- **Contract** (`packages/contracts/src/graph-runner/`): `runs.ts` 16 to 17 (`runReasonSchema`), 58 to 61 (`runStopRequestSchema`, strict `{runId}`), 99 (`reason` on the run state); `events.ts` 24 to 29 (`run-ended` data with optional `reason`); `constants.ts` 50 (`RUN_STATUSES` has `stopped`), 53 to 57 (`RUN_REASONS`: `author`, `project-switched`, `interrupted`), 60 (`NODE_RUN_STATUSES` has `stopped`); `routes.ts` 18 (`RUN_STOP_ROUTE`); `errors.ts` 12 and 40 (`GRAPH_RUN_NOT_FOUND`, 404).
- **Agent loop, the same behaviour already in the repository**: `apps/api/src/modules/agent-loop/agent-run.ts` 175 to 181 (`requestEnd`: the first reason wins, nothing happens after the end, the controller is aborted); `agent-runs.service.ts` 200 to 209 (`stop`: an unknown run is refused, a repeated stop is a no-op), 221 to 229 (the switch handler, which never throws); `agent-runs.controller.ts` 53 to 61 (stop answers `{}`); `apps/api/test/agent-loop-stop.test.ts` 227 to 268 (the switch test) and line 275 (the repeat-stop and unknown-run rule). The plan copies these rules; section 4 names each copy.

Decided here, so not open points: a stop of an unknown run is `GRAPH_RUN_NOT_FOUND` (404); a stop of the active project's last finished run is a 200 no-op; "unknown" means not the active or last run of the active project (module line 40); the stop answers 200 with `{}`.

## 2. Facts checked and facts assumed

### 2a. CHECKED (read on main at `fec7c07`)

- `apps/api/src/modules/graph-runner/runs.service.ts`:
  - 74 to 84: `RunRecord` has `controller` (line 83) and no stop flag.
  - 112 to 117: `failureOf`. A `ModuleError` keeps its code and message; any other error becomes `PLATFORM_INTERNAL` with a fixed message.
  - 124 to 131: the constructor takes no `ProjectStoreService`; nothing registers a switch hook.
  - 280 to 307: `engine`. The fail-fast branch is 295 to 304: the node to `error` (296), each queued node to `stopped` (297 to 301), `finish(record, 'error')` (302).
  - 311 to 349: `toolStep` passes `record.controller.signal` to the executor (347).
  - 378 to 390: `setStatus`, the one place a status changes. 393 to 405: `finish` sets `status` and `endedAt`, moves the record to `last`, and publishes `run-ended` with no reason (400 to 404).
  - grep: `stop`, `abort` and `reason` appear only at line 299 (the `stopped` status). No stop route, no reason, no abort call.
- `runs.controller.ts` 18 to 30: start and current only.
- `graph-runner.service.ts` 59: `graphError` is exported. `runs.service.ts` 136 and 236 call `this.graphs.activeProjectId()`, so it is not private.
- `graph-runner.module.ts` 13 to 18: imports `ProjectStoreModule`, provides `RunsService`, declares `RunsController`. No module change is needed for a new constructor dependency.
- `project-store/project-store.module.ts` 25 exports `ProjectStoreService` from the entry file; the exports array (71 to 79) includes it.
- `project-store/project-store.service.ts` 59 `onProjectSwitched`; 64 `notifyProjectSwitched` calls each handler in order and catches nothing.
- `project-store/active-project.service.ts` 64 to 67: a switch to the same project calls no hook. 72 to 73: the hook is called with `{from, to}`. 76 to 79: the settings write (step 5), after the hook.
- `packages/contracts/src/project-store/events.ts` 19 to 22: `projectSwitchedDataSchema` is `{from: nullable, to}`; the type `ProjectSwitchedData` is imported from `@bbartolome/scriba-contracts/project-store` (as `agent-runs.service.ts` line 13 does).
- `tool-registry/executor.service.ts` 70 to 76: `execute(name, request, signal?)`. 93: the signal goes to `streamChat`. 196 to 205: `modelFailure` maps every `PROVIDER_*` error to `TOOL_MODEL_ERROR`.
- `tool-registry/errors.ts` 16 (`MODEL_ERROR` is `TOOL_MODEL_ERROR`) and 49 (status 502).
- `providers/client/errors.ts` 96 to 119: `statusFailure`. A 400 that is not a model-not-found error reaches the final fallback at line 119, which is non-retryable. 124 to 125: `classifyFailure` maps a caller abort to `PROVIDER_ABORTED`, non-retryable.
- `providers/client/openai-compatible-client.ts` 63 to 66: the caller's abort aborts the attempt. 121: an already aborted signal is refused before the call.
- `e2e/fixtures/mock-openai/server.mjs`: 204 to 207, a client close before the reply ends sets `closedByClient` on the record; 297 to 312, the record is stored before the `delayMs` wait (also GRR-04 A3); 321 to 322, the `status` reply; 347 to 353, `sendStatus`.
- `apps/api/test/invariant-sweep.ts`: line 4 (a route template with `:` needs a fixture; the new route has none); 539 and 687 enumerate `app.routes()`, so the new POST is swept with no change.
- `graph-validation.ts` 93 to 101 and 387 to 406: the output-node rules (`output-unwired`, `output-not-fed-by-tool`, `output-kind-unwritable`). `graph.ts` 78 to 79: output params are optional.
- `apps/api/test/graph-runner-run.kit.ts`: exports `openRunHarness` (82), `putGraph` (145), `writeGraphs` (258), `postRun` (271), `getRun` (288), `OK_STEPS` (27), `slowFirstSteps` (30). `graph-runner-run.test.ts` keeps `untilRunEnded` (32), `openEvents` (49), `errorOf` (54), `currentOf` (59) and `pollUntil` (64) private.
- `project-store/routes.ts` 12 (`ACTIVE_PROJECT_ROUTE`) and 36 (`PROJECT_PENDING_ROUTE`, with `:projectId`); `pending.controller.ts` 31 (GET); `project-store/pending.ts` 65 to 67 (`pendingListSchema`, `{changes}`).
- `events.ts` (graph-runner) 14 to 20: `nodeStatusDataSchema` carries an optional `error`.
- Units GRR-06 and GRR-07 have no "Scope" section; their Decisions are at GRR-06 lines 17 to 26 and GRR-07 lines 17 to 19. No plan exists for GRR-06 or GRR-07 (`ls plans`). The only plans with status draft or planned are `plans/SAU-22.md` and `plans/TRG-14.md`; neither names `runs.service.ts`, `runs.controller.ts`, `graph-runner-run`, `graph-runner.module` or `run-scope` (grep CHECKED).
- `plans/QUEUE.md` line 4: GRR-05 is available.

Checked by the reviser (were A3 to A6 of the draft):

- A3 CHECKED. The mock's `status` reply (`server.mjs` 321 to 322, 347 to 353) answers HTTP 400; the clients are built with `maxRetries: 0` (`openai-compatible-client.ts` 215, 298, 332), so the SDK raises an `APIError` with status 400 once. `classifyFailure` (`errors.ts` 146 to 147) sends it to `statusFailure`; the body `{error: 'refused'}` is not a model-not-found message (`isModelNotFound`, 83 to 93), so line 119 gives `PROVIDER_BAD_RESPONSE`, non-retryable, message `'The model provider sent an unusable response.'` (line 26). `modelFailure` (`executor.service.ts` 196 to 205) maps it to `TOOL_MODEL_ERROR` with that message, and `failureOf` (`runs.service.ts` 112 to 117) keeps code and message.
- A4 CHECKED. In `graph-validation.ts`: `in1.out` (input `text`) to `n1.topic` (`gr_text` port `topic`, `x-scriba-type: text`) and `n1.output` (tool output, type `text`) to `out1.in` (output input, type `text`) resolve as usable wires of equal type (`endOf`, 276 to 303; mismatch check 323 to 330); `out1` is wired and fed by a tool (386 to 397); `gr_text` outputs `draft` (`graph-runner-run.kit.ts` GR_TEXT_YAML), which is writable (only `claims` and `check` are not); `dead-step` is a warning (line 110) and does not apply since `n1` reaches `out1`. Output `params` are optional (`graph.ts` 102 to 107).
- A5 CHECKED. `PendingController.list` (`pending.controller.ts` 31 to 38) with no `run` query returns every open change; `PendingService.list` (`pending.service.ts` 102 to 121) needs `book` active, and `readOpenChanges(undefined)` returns `[]` when the pending folder does not exist (`pending-store.ts` 48 to 49). The same read is used by `agent-loop-output-routing.test.ts` 210 to 216.
- A6 CHECKED. `runs.service.ts` 295 to 304 on main: the failing node goes `error` with `failureOf(error)`, each in-scope node still `queued` goes `stopped` in order, and `finish(record, 'error')` publishes `run-ended` `{runId, status}` with no reason (400 to 404). C1 therefore passes on main; it is GRR-04 P9 (open point 2 of GRR-04, "until GRR-05").

### 2b. ASSUMED (not checked here; the step named checks it)

- A1. Node 26 and npm 11 are the runtimes (step 0).
- A2. The API test baseline passes on main (step 0).
- A7. The stop to `run-ended` takes far less than 2 s; step 7 records the measured time.

## 3. Files to change

| Path | Change | Purpose |
|---|---|---|
| `apps/api/src/modules/graph-runner/runs.service.ts` | edit | (a) `RunRecord.stopReason?: RunReason`; (b) `MESSAGES.RUN_NOT_FOUND`; (c) the constructor takes `ProjectStoreService` and registers the switch hook; (d) new `stop`, `requestEnd`, `onProjectSwitched`, `endStopped`; (e) `finish(record, status, reason?)`; (f) `engine`: a check after the tool await and at the top of the `catch` |
| `apps/api/src/modules/graph-runner/runs.controller.ts` | edit | adds POST `RUN_STOP_ROUTE`, body `{runId}`, answer 200 `{}` |
| `apps/api/test/graph-runner-stop.test.ts` | new | C1 to C3 (section 5), with local copies of the five private helpers of `graph-runner-run.test.ts` |

Not changed, on purpose: `graph-runner.module.ts` (the provider and the import exist), `graph-runner.service.ts`, `run-scope.ts`, `graph-runner-run.kit.ts` and `graph-runner-run.test.ts` (GRR-04's files stay as they are, so GRR-06 and GRR-07 do not collide with them), the contracts, the tool registry, the project store, the providers, `invariant-sweep.ts`, the units, and `plans/DECISIONS.md`. `plans/GRR-05.md` is committed by the orchestrator; the implementer does not change it.

## 4. Procedure

### 4a. What is on main and what GRR-05 adds

| Part of the unit | On main | Added by GRR-05 |
|---|---|---|
| Failing node becomes `error` with a readable message (D1) | yes: `failureOf` 112 to 117; engine 295 to 296 | nothing |
| Queued nodes become `stopped` (D1) | yes: engine 297 to 301 | unchanged; `endStopped` has its own loop over `queued` and `running` nodes |
| Run ends `error` (D1) | yes: `finish` 302 | nothing; the reason stays unset |
| Pending changes stay in the queue (D1) | yes by design: nothing removes them | nothing; GRR-06 must not remove them on a stop |
| Stop route and `GRAPH_RUN_NOT_FOUND` (D2) | no | yes: `stop` and the controller route |
| Abort of the model call (D2) | `controller` exists, never aborted (P18) | yes: `requestEnd` calls `abort()` |
| The error caused by the abort is `stopped`, not `error` (D2) | no | yes: the check at the top of the `catch` |
| Running and queued nodes become `stopped`; run `stopped` with reason (D2) | no | yes: `endStopped`, and the reason in `finish` |
| No node step after a stop; a late tool result is dropped (D2) | no | yes: the check after the tool await |
| Switch hook stops the old project's run (D3) | no | yes: constructor and `onProjectSwitched` |

### 4b. Steps

0. **Preconditions.** `git status --short` prints nothing. `git branch --list 'unit/GRR-05'` prints nothing. `grep -c "RUN_STOP_ROUTE" apps/api/src/modules/graph-runner/runs.controller.ts` prints `0`. Record `node -v` and `npm -v` (A1) and the API baseline's file and test counts (A2).
1. **Branch.** `git switch -c unit/GRR-05` on a clean tree, from main. Expected: `Switched to a new branch 'unit/GRR-05'`.
2. **Test file first.** Write `apps/api/test/graph-runner-stop.test.ts` as section 5 describes: the recipe `chainOut`, the scenario steps, the project `other`, the local helpers, and C1 to C3. Then `npx prettier --write apps/api/test/graph-runner-stop.test.ts`.
3. **Red run.** `npm test -w @bbartolome/scriba-api -- graph-runner-stop`. Expected: C1 passes (section 4a, the fail-fast rows are on main; A3, A6). C2 fails at its first refusal check (no stop route). C3 fails (the switch does not stop the run: either the 10 s deadline of `untilRunEnded` throws, or the run ends `done` after the mock's 10 s delay). If C1 fails, stop and report before editing: the fail-fast of main then differs from section 4a.
4. **Engine edits, `runs.service.ts`.**
   - 4.1 Imports: `type RunReason` from `@bbartolome/scriba-contracts/graph-runner`; `type ProjectSwitchedData` from `@bbartolome/scriba-contracts/project-store`; `ProjectStoreService` from `../project-store/project-store.module` (the entry file, as `FilesService` is imported at lines 26 to 29).
   - 4.2 `MESSAGES.RUN_NOT_FOUND`: `'No run of the active project has that id.'`
   - 4.3 `RunRecord`: add `stopReason?: RunReason`. It is set once, by `requestEnd`.
   - 4.4 Constructor: add `private readonly store: ProjectStoreService` as the last parameter. In the body, register once: `this.store.onProjectSwitched((event) => this.onProjectSwitched(event));`, with a comment that the handler never throws. This copies `agent-runs.service.ts` line 69.
   - 4.5 `stop(runId: string): void`, public. Find the record with this run id in `entryOf(this.graphs.activeProjectId())`, looking at `active` and then `last`. None: `throw graphError('RUN_NOT_FOUND', MESSAGES.RUN_NOT_FOUND)`. Found: `this.requestEnd(record, 'author')`.
   - 4.6 `private requestEnd(record: RunRecord, reason: RunReason): void`. Return when `record.state.endedAt` is set or `record.stopReason` is set. Otherwise set `record.stopReason = reason` and call `record.controller.abort()`. This is `agent-run.ts` 175 to 181.
   - 4.7 `private onProjectSwitched(event: ProjectSwitchedData): void`. Inside `try`: return when `event.from` is `null`; look up `this.registry.get(event.from)?.active`; when found, `this.requestEnd(active, 'project-switched')`. The `catch` holds only a comment that nothing here may throw, as `agent-runs.service.ts` 221 to 229 does.
   - 4.8 `finish(record, status, reason?: RunReason)`. After the existing once-only guard, its first statement sets `record.state.reason = reason` when a reason is given, so that any later statement (GRR-07's log line, for one) reads it. The `run-ended` data gets `reason` only when one is given. The rest is unchanged.
   - 4.9 `private endStopped(record: RunRecord): void`. For each id of `record.order` whose status is `queued` or `running`, call `setStatus(record, id, 'stopped')`. Then `finish(record, 'stopped', record.stopReason)`.
   - 4.10 `engine`: (a) right after `const result = await this.toolStep(record, node);`, if `record.stopReason !== undefined`, call `endStopped(record)` and return; the result is not stored in `results`. (b) At the top of the `catch`, the same check, before the existing fail-fast lines. The fail-fast lines are unchanged. The output-node branch is not touched (GRR-06 owns it). The loop has no other `await`, so a stop can only arrive during a tool call, and (a) and (b) cover every case.
5. **Controller.** `runs.controller.ts`: add `@Post(RUN_STOP_ROUTE)`, `@HttpCode(200)`, `stop(@Body(new ZodValidationPipe(runStopRequestSchema)) body: RunStopRequest): Record<string, never>`, which calls `this.runs.stop(body.runId)` and returns `{}`. Same shape as `agent-runs.controller.ts` 53 to 61.
6. **Format.** `npx prettier --write` on the three files of section 3, then `npx prettier --check` on the same files. Expected: exit 0.
7. **Green.** `npm test -w @bbartolome/scriba-api -- graph-runner-stop`. Expected: 3 of 3 pass. Record the time C2 measures from the stop POST to `run-ended` (A7).
8. **Mutation evidence (not committed).** Before each change, copy the file to `/tmp/grr05-mut/`; change it; run `npm test -w @bbartolome/scriba-api -- graph-runner-stop`; restore from the copy; `cmp` against the copy.
   - M1, `requestEnd`: drop `abort()`. Expected: C2 fails.
   - M2, the top of the `catch`: drop the stop check. Expected: C2 fails (the node goes to `error`).
   - M3, `onProjectSwitched`: return before `requestEnd`. Expected: C3 fails.
   - M4, the fail-fast loop: skip the queued-to-stopped marks. Expected: C1 fails.
9. **Regressions.** `npm test -w @bbartolome/scriba-api -- graph-runner-run graph-runner-graph-crud graph-runner-validation invariant-get-head invariant-mutation-guard token-guard-gate` exits 0. Then `npm test -w @bbartolome/scriba-api` exits 0, with one file and three tests more than the baseline (A2).
10. **Root gates.** `npm run build`, `npm test`, `npm run lint`: each exits 0. The lint ends with `All matched files use Prettier code style!`.
11. **Commit.** `git add` the three paths of section 3, then `git commit -m "feat(GRR-05): stop, fail-fast and stop on project switch" -- <the three paths>`. Do not push. The orchestrator ticks the unit's criteria afterwards, as `35a652e` did for GRR-04; the implementer does not edit `units/`.
12. **Report.** Node and npm versions; the exit code and counts of steps 3, 7, 8, 9 and 10; the measured time of step 7. Stop.

## 5. Tests

Shared setup: `openRunHarness` from the GRR-04 kit (`./graph-runner-run.kit`), with `prepare` writing the graphs (`writeGraphs`, which writes `chain` among others) and the extra files of each test; `postRun`, `getRun`, `putGraph`, `slowFirstSteps`, `SCENARIO` and `RECIPES` from the same kit (`RECIPES.chain.id` is `'chain'`; the kit's `toolNode` and `textInput` are private, so `chainOut` is written out in full). Other imports, as `graph-runner-run.test.ts` lines 1 to 28 and `agent-loop-stop.test.ts` use them: `recordsOf` from `./providers-client.kit`; `LOOPBACK_HOST`, `observeEvents` and `type Observer` from `./invariant-sweep`; `dataOf` from `./sse`; `type Reply` from `./guard-request`; `type ErrorBody` from `./project-store-projects.kit`; `RUNS_ROUTE`, `RUN_STOP_ROUTE`, `RUN_CURRENT_ROUTE`, `currentRunSchema`, `graphRunnerEventSchema`, `runStartResultSchema` and `type GraphRunnerEvent` from `@bbartolome/scriba-contracts/graph-runner`; `ACTIVE_PROJECT_ROUTE`, `PROJECT_PENDING_ROUTE` and `pendingListSchema` from `@bbartolome/scriba-contracts/project-store`; `mkdirSync`, `writeFileSync` from `node:fs` and `join` from `node:path`. Local to the new file:

- `chainOut`: a recipe with `schemaVersion: 1`, `view: 'recipe'` and a name; nodes `in1` (input, text, `params` `{type: 'text', label: 'Topic'}`), `n1` (tool `gr_text`, `params` `{words: 40}`) and `out1` (output, no `params`); edges `w1` `in1.out` to `n1.topic` and `w2` `n1.output` to `out1.in`. Every node has `position` `{x: 0, y: 0}`. Written with `putGraph` into `book`.
- `failFirstSteps`: `[{reply: {kind: 'status', status: 400, body: {error: 'refused'}}}]`. It matches every chat request; a 400 that is not a model-not-found error is not retried, so the run fails at the first request.
- The project `other`: `<library>/other/project.yaml` with the text `schemaVersion: 1`, `title: Other`, `genrePack: nonfiction` (as `agent-loop-stop.test.ts` 229 to 234).
- Copies of `untilRunEnded` (10 s deadline), `openEvents`, `errorOf`, `currentOf` and `pollUntil` from `graph-runner-run.test.ts` (lines 32 to 70).
- The mock's abort check: `pollUntil(async () => (await recordsOf(harness.mock, SCENARIO))[0]?.closedByClient === true)`. The mock sets `closedByClient` in its socket `close` handler (`server.mjs` 204 to 207), which can come after the API's `run-ended` reaches the test, so it is polled, not read once (as `agent-loop-stop.test.ts` 188 to 196 and `tool-registry-executor.test.ts` 375 do). The 2 s bound of C2 applies to the run's end, which is measured separately.

Every check is through HTTP, SSE, or the mock's records (module line 50, README line 139). Each test opens the event stream before its first start and closes its stream and its harness in `finally`.

### C1 — `stop and fail-fast, C1: a mock tool failure marks the node error, the queued nodes stopped, and ends the run error`

- Criterion (unit line 23, verbatim): "A mock tool failure marks that node `error`, queued nodes `stopped`, and ends the run `error`."
- Seam: recipe `chain` (`in1`, `n1`, `n2`, `n3`) started by POST with `in1` = text `Ada`, after the event stream is opened; steps `failFirstSteps`.
- Check: start answers 200. The node-status events of the run, in order, are exactly `in1:queued`, `n1:queued`, `n2:queued`, `n3:queued`, `in1:running`, `in1:done`, `n1:running`, `n1:error`, `n2:stopped`, `n3:stopped`. The `n1:error` event has `error.code` `TOOL_MODEL_ERROR` and a non-empty `error.message`. The last event is `run-ended` with `status: 'error'` and no `reason` key. The mock has recorded exactly 1 request. `GET` current shows `status: 'error'`, `nodes.n1.status: 'error'`, `nodes.n2` and `nodes.n3` `stopped`, and no `reason`.
- Expected on main: passes (A6).

### C2 — `stop and fail-fast, C2: a stop during a slow mock call ends the run stopped within 2 seconds, the mock sees the request aborted, and no pending change is created afterwards`

- Criterion (unit line 24, verbatim): "Stop during a slow mock call ends the run `stopped` within 2 seconds, the mock sees the request aborted, and no pending change is created afterwards."
- Seam: recipe `chainOut`; steps `slowFirstSteps(10000)`. The first chat request waits 10 s in the mock, far longer than the 2 s bound, so the stop lands during the call.
- Steps and checks:
  1. Before any run, POST stop `{runId: 'no-such-run'}`: 404, `error.code` `GRAPH_RUN_NOT_FOUND`.
  2. Open the event stream. Start `chainOut` with `in1` = text `Ada`: 200. `pollUntil` the mock has 1 record.
  3. Record `t0 = Date.now()`. POST stop `{runId}`: 200, body `{}`.
  4. `untilRunEnded`: the last event is `run-ended` with `{runId, status: 'stopped', reason: 'author'}`, and `Date.now() - t0` is below 2000.
  5. The mock's abort check (shared setup) passes, and the mock then has exactly 1 record (the request was aborted and not retried).
  6. After the event `n1:running`, the node-status events are `n1:stopped` and `out1:stopped`. No event marks `n1` or `out1` `done` or `error`.
  7. `GET` current: `status: 'stopped'`, `reason: 'author'`, `pendingChangeIds: []`, `nodes.n1` and `nodes.out1` `stopped`.
  8. `GET` the pending list of `book` (`PROJECT_PENDING_ROUTE` with `book` in place of `:projectId`): 200 and `changes` is empty (`pendingListSchema`).
  9. POST stop with the same `runId` again: 200, and the run is still `stopped` with reason `author` (the repeat is a no-op, as in the Agent loop).
- Expected on main: fails at step 1.
- Note: step 8 holds now and keeps its force once GRR-06 adds the output step's propose: then a missing stop check would let `out1` propose a draft and step 8 would fail (section 7, point 1, decided).

### C3 — `stop and fail-fast, C3: switching the active project mid-run ends the run stopped with reason project-switched`

- Criterion (unit line 25, verbatim): "Switching the active project mid-run ends the run `stopped` with reason `project-switched`."
- Seam: `prepare` writes the graphs and the project `other`; recipe `chain`; steps `slowFirstSteps(10000)`.
- Steps: open the event stream. Start `chain`: 200. `pollUntil` the mock has 1 record. POST `ACTIVE_PROJECT_ROUTE` with `{projectId: 'other'}`: 200. The hook runs before this answer (`active-project.service.ts` 72 to 73).
- Check: `untilRunEnded` ends with `run-ended` `{runId, status: 'stopped', reason: 'project-switched'}`. The node-status events after `n1:running` are `n1:stopped`, `n2:stopped`, `n3:stopped`. The mock's abort check (shared setup) passes, and the mock then has exactly 1 record.
- Expected on main: fails (the run goes on to `done` after the mock delay).

## 6. Agreement with downstream and parallel units

### GRR-08 (engine gate; blocked by GRR-05)

Needs: GRR-05's criteria pass on main; the new route behind the guard; Platform's boundaries lint. The plan adds one route with no `:`, so the sweep needs no fixture, and it enumerates routes from the app (`invariant-sweep.ts` 4, 539, 687). The new import of `ProjectStoreService` comes from the project-store entry file, the same form as the existing `FilesService` import. Agreed.

### GRR-13 (run UI; blocked by GRR-05)

Needs: POST `RUN_STOP_ROUTE` with `{runId}` answers 200 (the body is not used); `run-ended` after a stop with `status: 'stopped'` and `reason: 'author'`, so the canvas can return to editable; `node-status` `stopped` for the running and queued nodes; `reason` on the current run state. This plan provides all four. Agreed.

### GRR-06 (output nodes; parallel with GRR-05)

Overlap in `runs.service.ts`: the `RunRecord` interface, `MESSAGES`, the engine loop and `finish`. GRR-06 changes the output-node branch of the engine (the P21 step) and adds the propose call and `pendingChangeIds`. GRR-05 changes the check after the tool await, the top of the `catch`, and `finish`; it does not change the output branch.

Constraint on GRR-06, binding in both orders: no `await` may sit between a stop check and its propose call. If GRR-06 needs an `await` before propose, it checks `record.stopReason` again right before the propose call. A stop never removes pending changes that already exist. GRR-06's plan must keep `graph-runner-stop.test.ts` passing unchanged: C2's `out1` (no target, no `params.path`) would get a generated `drafts/` target, so C2 step 8 then checks GRR-06's propose.

- Order A (GRR-05 merges first): GRR-06 rebases. Its output step runs after the GRR-05 checks, so its code needs no change to GRR-05's code. Correct.
- Order B (GRR-06 merges first): the output branch sits between two tool steps. GRR-05's checks are in the tool path and in the `catch`, which GRR-06 leaves alone. A stop received during an earlier tool's await is handled by that tool's check before the output step is reached; the output node is then `stopped`, and no propose runs. Step 8 of C2 then also covers GRR-06's pending changes. Correct.

### GRR-07 (run logs and recovery; parallel with GRR-05)

Overlap: `setStatus`, `finish` and the run start. GRR-05's stop marks go through `setStatus`, so each one is logged once GRR-07 logs status changes there. GRR-05 sets the reason as the first statement of `finish`, so the end entry reads `author` or `project-switched` in either order. GRR-07 writes its end entry from `record.state` after that statement. Restart recovery writes `interrupted` (in `RUN_REASONS`), which does not collide with the two reasons GRR-05 writes.

- Order A (GRR-05 first): GRR-07 adds its end entry after the reason statement. Correct.
- Order B (GRR-07 first): the end entry is written inside `finish` and the reason statement must come before it. GRR-05 places its statement first, so the rebase keeps the order. Correct.

No other unit in GRR-05's `parallel_with` or `unblocks` touches these files.

## 7. Open points (both decided by the reviser; no Navigator decision needed)

Neither decision changes the text of a criterion or a settled decision of `modules/graph-runner.md`; each is a test-structure or ordering choice inside this unit.

1. **C2's "no pending change" check. Decided: option (a), keep step 8 in C2.** Unit line 24 puts "no pending change is created afterwards" in GRR-05's criterion, so its test belongs to GRR-05; moving step 8 to GRR-06 (option b) would make C2 check less than its criterion says, which weakens it. Step 8 holds now (no propose exists), the engine checks of steps 5 to 7 prove the stop rule that makes it hold, and once GRR-06 lands step 8 fails if a stop lets an output node propose (section 6, GRR-06). The criterion text is unchanged.
2. **The switch hook runs before the active project is written. Decided: option (a), accept the Project store's order.** `active-project.service.ts` 71 to 79 calls the hooks "before anything is written or published (D7, D8)": that order is the Project store's own settled rule (PST-04), and unit line 20 tells GRR-05 only to register with that hook. Option (b) changes the Project store, a module outside this unit, and would differ from the Agent loop, which uses the same hook in the same way (`agent-runs.service.ts` 68 to 69, 221 to 229). If the settings write fails after the hook, the old run is stopped and the switch answers an error; the author starts the run again. No code of this plan depends on the choice.

## 8. Review parts

One part. GRR-05 is one small change to two source files plus one new test file: the stop route, the stop and switch paths and the reason in `finish` share one mechanism (`stopReason`, `requestEnd`, `endStopped`), so neither can be reviewed without the other, and C1 needs no code change. Splitting would give a reviewer a part with no behaviour to test.

- **Part 1: stop, fail-fast and stop on project switch.** Steps 0 to 12 (files `runs.service.ts`, `runs.controller.ts`, `graph-runner-stop.test.ts`). Tests: C1 (fail-fast, already on main), C2 (stop during a slow call, abort, no pending change), C3 (project switch).
