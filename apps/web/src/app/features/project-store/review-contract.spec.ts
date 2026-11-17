import {
  PROJECT_PENDING_ACCEPT_ANYWAY_ROUTE,
  PROJECT_PENDING_ACCEPT_ROUTE,
  PROJECT_PENDING_REFRESH_ROUTE,
  PROJECT_PENDING_REJECT_ROUTE,
  PROJECT_PENDING_ROUTE,
  pendingChangeSchema,
  pendingEventDataSchema,
  pendingListSchema,
} from '@bbartolome/scriba-contracts/project-store';
import { describe, expect, it } from 'vitest';
import {
  pendingActionPath,
  pendingChangeCopy,
  pendingEventCopy,
  pendingListCopy,
  pendingListPath,
} from './review-contract';

const HASH = `sha256:${'a'.repeat(64)}`;
const ID = '20261114T090000000Z-abc123';

const CHANGE = {
  id: ID,
  projectId: 'p1',
  targetPath: 'drafts/ch1.md',
  kind: 'modify',
  diff: '@@ -1 +1 @@\n-Old\n+New\n',
  capturedBase: { hash: HASH, content: 'Old' },
  proposed: 'New',
  origin: { kind: 'agent-run', runId: 'r1' },
  status: 'pending',
  conflict: null,
  createdAt: '2026-11-14T09:00:00Z',
  updatedAt: '2026-11-14T09:00:00.125Z',
};

const acceptedChanges: unknown[] = [
  CHANGE,
  { ...CHANGE, kind: 'create', capturedBase: null },
  {
    ...CHANGE,
    origin: {
      kind: 'recipe-run',
      runId: 'r2',
      graphId: 'g1',
      nodeId: 'n1',
    },
    grounding: {
      supported: 2,
      weak: 1,
      unsupported: 0,
      checkedAt: '2026-11-14T09:00:00Z',
    },
    provenance: { entityIds: ['e1'], sourcesUsed: ['sources/a.md'] },
    conflict: {
      reason: 'base-changed',
      detectedAt: '2026-11-14T09:00:00Z',
    },
  },
];

const refusedChanges: unknown[] = [
  { ...CHANGE, kind: 'move' },
  { ...CHANGE, origin: { kind: 'agent-run' } },
  { ...CHANGE, origin: { kind: 'other-run', runId: 'r1' } },
  { ...CHANGE, status: 'done' },
  {
    ...CHANGE,
    conflict: { reason: 'other', detectedAt: '2026-11-14T09:00:00Z' },
  },
  { ...CHANGE, capturedBase: { hash: 'sha256:ABC', content: 'Old' } },
  {
    ...CHANGE,
    grounding: {
      supported: -1,
      weak: 0,
      unsupported: 0,
      checkedAt: '2026-11-14T09:00:00Z',
    },
  },
  { ...CHANGE, createdAt: '2026-11-14T09:00:00' },
  { ...CHANGE, proposed: undefined },
];

describe('review-contract', () => {
  it('K1 pendingChangeCopy and pendingListCopy accept and refuse the fixtures that the contract does', () => {
    for (const fixture of acceptedChanges) {
      expect(pendingChangeSchema.safeParse(fixture).success).toBe(true);
      expect(pendingChangeCopy.safeParse(fixture).success).toBe(true);
      expect(pendingListSchema.safeParse({ changes: [fixture] }).success).toBe(
        true,
      );
      expect(pendingListCopy.safeParse({ changes: [fixture] }).success).toBe(
        true,
      );
    }
    for (const fixture of refusedChanges) {
      expect(pendingChangeSchema.safeParse(fixture).success).toBe(false);
      expect(pendingChangeCopy.safeParse(fixture).success).toBe(false);
      expect(pendingListSchema.safeParse({ changes: [fixture] }).success).toBe(
        false,
      );
      expect(pendingListCopy.safeParse({ changes: [fixture] }).success).toBe(
        false,
      );
    }
    expect(pendingListSchema.safeParse({}).success).toBe(false);
    expect(pendingListCopy.safeParse({}).success).toBe(false);
  });

  it('K1 pendingEventCopy accepts and refuses the fixtures that pendingEventDataSchema does', () => {
    const accepted = { projectId: 'p1', pendingChange: CHANGE };
    const refused: unknown[] = [
      { projectId: '', pendingChange: CHANGE },
      { projectId: 'p1' },
      { projectId: 'p1', pendingChange: { ...CHANGE, status: 'done' } },
    ];
    expect(pendingEventDataSchema.safeParse(accepted).success).toBe(true);
    expect(pendingEventCopy.safeParse(accepted).success).toBe(true);
    for (const fixture of refused) {
      expect(pendingEventDataSchema.safeParse(fixture).success).toBe(false);
      expect(pendingEventCopy.safeParse(fixture).success).toBe(false);
    }
  });

  it('K2 the path helpers equal the PROJECT_PENDING_* constants with the ids encoded', () => {
    expect(pendingListPath('my book')).toBe(
      PROJECT_PENDING_ROUTE.replace(':projectId', 'my%20book'),
    );
    const id = `${ID}`;
    const encoded = (route: string) =>
      route.replace(':projectId', 'my%20book').replace(':id', id);
    expect(pendingActionPath('my book', id, 'accept')).toBe(
      encoded(PROJECT_PENDING_ACCEPT_ROUTE),
    );
    expect(pendingActionPath('my book', id, 'reject')).toBe(
      encoded(PROJECT_PENDING_REJECT_ROUTE),
    );
    expect(pendingActionPath('my book', id, 'refresh')).toBe(
      encoded(PROJECT_PENDING_REFRESH_ROUTE),
    );
    expect(pendingActionPath('my book', id, 'accept-anyway')).toBe(
      encoded(PROJECT_PENDING_ACCEPT_ANYWAY_ROUTE),
    );
  });
});
