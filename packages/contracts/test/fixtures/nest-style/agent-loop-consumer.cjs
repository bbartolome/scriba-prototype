'use strict';

// CJS consumer for test/agent-loop.exports.test.ts, run with process.execPath.
// It requires the agent-loop subpath by its package name, so Node resolves it through the exports map.

const mod = require('@bbartolome/scriba-contracts/agent-loop');

const types = {};
for (const name of Object.keys(mod).sort()) {
  types[name] = typeof mod[name];
}

const claim = {
  text: 'Ann left the city in May.',
  span: { start: 0, end: 25 },
  verdict: 'supported',
  passage: {
    path: 'sources/ann.md',
    offset: 10,
    snippet: 'Ann left the city in May.',
  },
  reason: 'The passage states the move.',
};

const artefact = {
  schemaVersion: 1,
  targetPath: 'drafts/ch01.md',
  contentHash: `sha256:${'a'.repeat(64)}`,
  checkedAt: '2026-11-14T09:00:00Z',
  runId: 'run-1',
  claims: [claim],
};

const results = {
  validArtefact: mod.groundingResultSchema.safeParse(artefact),
  runEnded: mod.agentLoopEventSchema.safeParse({
    module: 'agent-loop',
    type: 'run-ended',
    data: {
      runId: 'run-1',
      seq: 10,
      reason: 'capped',
      pendingChangeIds: ['pc-1'],
    },
  }),
  groundingSummary: mod.groundingSummarySchema.safeParse({
    supported: 1,
    weak: 0,
    unsupported: 0,
    checkedAt: '2026-11-14T09:00:00Z',
  }),
  invalidArtefact: mod.groundingResultSchema.safeParse({
    ...artefact,
    schemaVersion: 2,
  }),
};

process.stdout.write(
  JSON.stringify({
    names: Object.keys(types),
    types,
    results: Object.fromEntries(
      Object.entries(results).map(([key, result]) => [
        key,
        { success: result.success },
      ]),
    ),
  }),
);
