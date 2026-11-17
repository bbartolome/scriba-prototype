import {
  draftVersionListSchema,
  draftVersionReadSchema,
  PROJECT_VERSION_RESTORE_ROUTE,
  PROJECT_VERSION_ROUTE,
  PROJECT_VERSIONS_ROUTE,
} from '@bbartolome/scriba-contracts/project-store';
import { describe, expect, it } from 'vitest';
import {
  draftRestorePath,
  draftVersionListCopy,
  draftVersionReadCopy,
  draftVersionReadPath,
  draftVersionsPath,
  isTopLevelDraftPath,
} from './versions-contract';

const listFixtures: unknown[] = [
  { draftPath: 'drafts/ch1.md', versions: [] },
  {
    draftPath: 'drafts/ch1.md',
    versions: [
      {
        id: '20261104T231500123Z.md',
        createdAt: '2026-11-04T23:15:00.123Z',
        size: 8,
      },
    ],
  },
];

const refusedListFixtures: unknown[] = [
  { versions: [] },
  {
    draftPath: 'drafts/ch1.md',
    versions: [
      {
        id: '20261104T231500123Z.md',
        createdAt: '2026-11-04T23:15:00.123Z',
        size: -1,
      },
    ],
  },
  {
    draftPath: 'drafts/ch1.md',
    versions: [
      {
        id: '20261104T231500123Z.md',
        createdAt: '2026-11-04T23:15:00.123',
        size: 8,
      },
    ],
  },
];

const readFixtures: unknown[] = [
  { draftPath: 'drafts/ch1.md', id: '20261104T231500123Z.md', content: '' },
];

const refusedReadFixtures: unknown[] = [
  { draftPath: 'drafts/ch1.md', id: '20261104T231500123Z.md' },
];

describe('versions-contract', () => {
  it('K1 the copies accept and refuse the fixtures that the contract schemas do', () => {
    for (const fixture of listFixtures) {
      expect(draftVersionListSchema.safeParse(fixture).success).toBe(true);
      expect(draftVersionListCopy.safeParse(fixture).success).toBe(true);
    }
    for (const fixture of refusedListFixtures) {
      expect(draftVersionListSchema.safeParse(fixture).success).toBe(false);
      expect(draftVersionListCopy.safeParse(fixture).success).toBe(false);
    }
    for (const fixture of readFixtures) {
      expect(draftVersionReadSchema.safeParse(fixture).success).toBe(true);
      expect(draftVersionReadCopy.safeParse(fixture).success).toBe(true);
    }
    for (const fixture of refusedReadFixtures) {
      expect(draftVersionReadSchema.safeParse(fixture).success).toBe(false);
      expect(draftVersionReadCopy.safeParse(fixture).success).toBe(false);
    }
  });

  it('K2 the route helpers encode the id, and the scope rule matches a top-level draft', () => {
    expect(draftVersionsPath('a b')).toBe(
      PROJECT_VERSIONS_ROUTE.replace(':projectId', 'a%20b'),
    );
    expect(draftVersionReadPath('a b')).toBe(
      PROJECT_VERSION_ROUTE.replace(':projectId', 'a%20b'),
    );
    expect(draftRestorePath('a b')).toBe(
      PROJECT_VERSION_RESTORE_ROUTE.replace(':projectId', 'a%20b'),
    );
    expect(isTopLevelDraftPath('drafts/ch1.md')).toBe(true);
    expect(isTopLevelDraftPath('drafts/sub/ch1.md')).toBe(false);
    expect(isTopLevelDraftPath('drafts/.versions/ch1.md/x')).toBe(false);
    expect(isTopLevelDraftPath('sources/outline.md')).toBe(false);
  });
});
