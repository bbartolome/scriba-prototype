import {
  currentRunSchema,
  graphIdResultSchema,
  graphListSchema,
} from '@bbartolome/scriba-contracts/graph-runner';
import { pendingListSchema } from '@bbartolome/scriba-contracts/project-store';
import { describe, expect, it } from 'vitest';
import {
  currentRunCopy,
  graphIdCopy,
  graphListCopy,
  graphDeletePath,
  graphRenamePath,
  GRAPHS_PATH,
  GRAPH_CREATE_PATH,
  noBodyCopy,
  pendingListCopy,
  pendingPath,
  RUN_CURRENT_PATH,
} from './graph-runner-contract';

const HASH = `sha256:${'a'.repeat(64)}`;

const ROW = {
  id: 'chapter-opening',
  name: 'Chapter opening',
  view: 'recipe',
  nodeCount: 3,
  mtime: '2026-11-14T09:00:00Z',
  valid: true,
};

const RUN = {
  runId: 'run-1',
  graphId: 'chapter-opening',
  status: 'running',
  startedAt: '2026-11-14T09:00:00Z',
  inputs: {},
  targets: {},
  nodes: {},
  pendingChangeIds: [],
};

const CHANGE = {
  id: '20261114T090000000Z-abc123',
  projectId: 'p1',
  targetPath: 'graphs/chapter-opening.json',
  kind: 'modify',
  diff: '@@ -1 +1 @@\n-Old\n+New\n',
  capturedBase: { hash: HASH, content: 'Old' },
  proposed: 'New',
  origin: { kind: 'agent-run', runId: 'r1' },
  status: 'pending',
  conflict: null,
  createdAt: '2026-11-14T09:00:00Z',
  updatedAt: '2026-11-14T09:00:00Z',
};

// Each pair: a value the contract accepts and a value it refuses. The copy must agree on each.
const acceptedLists: unknown[] = [
  { graphs: [] },
  { graphs: [ROW] },
  { graphs: [{ ...ROW, view: null, nodeCount: null, valid: false }] },
];
const refusedLists: unknown[] = [
  {},
  { graphs: [ROW], extra: 1 },
  { graphs: [{ ...ROW, view: 'other' }] },
  { graphs: [{ ...ROW, nodeCount: -1 }] },
  { graphs: [{ ...ROW, mtime: '2026-11-14T09:00:00' }] },
  { graphs: [{ ...ROW, valid: 'yes' }] },
];

const acceptedRuns: unknown[] = [{ run: null }, { run: RUN }];
const refusedRuns: unknown[] = [
  {},
  { run: { ...RUN, status: 'paused' } },
  { run: { ...RUN, startedAt: 'soon' } },
  { run: { ...RUN, pendingChangeIds: [''] } },
];

const acceptedPending: unknown[] = [{ changes: [] }, { changes: [CHANGE] }];
const refusedPending: unknown[] = [
  {},
  { changes: [{ ...CHANGE, status: 'done' }] },
  { changes: [{ ...CHANGE, createdAt: '2026-11-14' }] },
];

describe('graph-runner-contract', () => {
  it('X3 graphListCopy agrees with graphListSchema on each sample', () => {
    for (const sample of [...acceptedLists, ...refusedLists]) {
      expect(graphListCopy.safeParse(sample).success).toBe(
        graphListSchema.safeParse(sample).success,
      );
    }
    for (const sample of acceptedLists) {
      expect(graphListCopy.safeParse(sample).success).toBe(true);
    }
  });

  it('X3 currentRunCopy agrees with currentRunSchema on each sample', () => {
    for (const sample of [...acceptedRuns, ...refusedRuns]) {
      expect(currentRunCopy.safeParse(sample).success).toBe(
        currentRunSchema.safeParse(sample).success,
      );
    }
  });

  it('X3 pendingListCopy agrees with pendingListSchema on each sample', () => {
    for (const sample of [...acceptedPending, ...refusedPending]) {
      expect(pendingListCopy.safeParse(sample).success).toBe(
        pendingListSchema.safeParse(sample).success,
      );
    }
  });

  it('X3 graphIdCopy agrees with graphIdResultSchema on each sample', () => {
    for (const sample of [{ id: 'chapter-two' }, {}, { id: 'Bad Id' }]) {
      expect(graphIdCopy.safeParse(sample).success).toBe(
        graphIdResultSchema.safeParse(sample).success,
      );
    }
  });

  it('X3 noBodyCopy accepts the empty body and refuses a value', () => {
    expect(noBodyCopy.safeParse(null).success).toBe(true);
    expect(noBodyCopy.safeParse({}).success).toBe(false);
  });

  it('X3 the path constants and helpers equal the contract routes with the ids encoded', () => {
    expect(GRAPHS_PATH).toBe('/api/graph-runner/graphs');
    expect(RUN_CURRENT_PATH).toBe('/api/graph-runner/runs/current');
    expect(GRAPH_CREATE_PATH).toBe('/api/graph-runner/graphs/create');
    expect(graphRenamePath('chapter one')).toBe(
      '/api/graph-runner/graphs/chapter%20one/rename',
    );
    expect(graphDeletePath('story-one')).toBe(
      '/api/graph-runner/graphs/story-one/delete',
    );
    expect(pendingPath('my book')).toBe(
      '/api/project-store/projects/my%20book/pending',
    );
  });
});
