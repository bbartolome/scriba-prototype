import {
  snapshotCreatedDataSchema,
  snapshotCreateRequestSchema,
  snapshotListSchema,
  snapshotRestoredDataSchema,
  snapshotRestoreRequestSchema,
  SNAPSHOT_RESTORE_ROUTE,
  SNAPSHOTS_ROUTE,
} from '@bbartolome/scriba-contracts/compile-export';
import { describe, expect, it } from 'vitest';
import {
  isSnapshotEventData,
  SNAPSHOT_RESTORE_PATH,
  SNAPSHOTS_PATH,
  snapshotListCopy,
} from './snapshot-contract';

const READABLE = {
  id: 'before-cut-20261119T101500Z',
  label: 'before-cut',
  createdAt: '2026-11-19T10:15:00Z',
  fileCount: 4,
  words: { body: 2800, total: 3000 },
};

const WITH_FRACTION = {
  ...READABLE,
  id: 'fraction-20261119T101500',
  createdAt: '2026-11-19T10:15:00.123Z',
};

const UNREADABLE = {
  id: 'broken-20261118T090000Z',
  label: 'broken',
  createdAt: '2026-11-18T09:00:00Z',
  fileCount: 2,
  words: null,
  unreadable: true,
};

const acceptedLists: unknown[] = [
  { snapshots: [READABLE] },
  { snapshots: [WITH_FRACTION] },
  { snapshots: [READABLE, UNREADABLE] },
  { snapshots: [] },
];

const refusedLists: unknown[] = [
  { snapshots: [{ ...READABLE, createdAt: '2026-11-19T10:15:00+01:00' }] },
  { snapshots: [{ ...READABLE, createdAt: '2026-11-19T10:15:00' }] },
  { snapshots: [{ ...READABLE, fileCount: -1 }] },
  { snapshots: [{ ...READABLE, words: undefined }] },
  { snapshots: [{ ...READABLE, id: '' }] },
  { snapshots: 'before-cut' },
];

describe('snapshot-contract', () => {
  it('K1 snapshotListCopy accepts and refuses the fixtures that snapshotListSchema does', () => {
    for (const fixture of acceptedLists) {
      expect(snapshotListSchema.safeParse(fixture).success).toBe(true);
      expect(snapshotListCopy.safeParse(fixture).success).toBe(true);
    }
    for (const fixture of refusedLists) {
      expect(snapshotListSchema.safeParse(fixture).success).toBe(false);
      expect(snapshotListCopy.safeParse(fixture).success).toBe(false);
    }
  });

  it('K2 the routes equal the contract, and the bodies the panel sends pass the request schemas', () => {
    expect(SNAPSHOTS_PATH).toBe(SNAPSHOTS_ROUTE);
    expect(SNAPSHOT_RESTORE_PATH).toBe(SNAPSHOT_RESTORE_ROUTE);
    expect(
      snapshotCreateRequestSchema.safeParse({ label: 'before-cut' }).success,
    ).toBe(true);
    expect(
      snapshotRestoreRequestSchema.safeParse({
        id: 'before-cut-20261119T101500Z',
      }).success,
    ).toBe(true);
  });

  it('K3 isSnapshotEventData accepts what the event schemas accept and refuses an empty or missing project', () => {
    const created = {
      projectId: 'p1',
      snapshot: READABLE,
    };
    const restored = { projectId: 'p1', snapshotId: READABLE.id };
    expect(snapshotCreatedDataSchema.safeParse(created).success).toBe(true);
    expect(snapshotRestoredDataSchema.safeParse(restored).success).toBe(true);
    expect(isSnapshotEventData(created)).toBe(true);
    expect(isSnapshotEventData(restored)).toBe(true);

    const refused: unknown[] = [
      { ...created, projectId: '' },
      { snapshotId: READABLE.id },
      { ...restored, projectId: '' },
    ];
    for (const data of refused) {
      expect(isSnapshotEventData(data)).toBe(false);
    }
  });
});
