import {
  fileListSchema,
  PROJECT_FILES_ROUTE,
} from '@bbartolome/scriba-contracts/project-store';
import { describe, expect, it } from 'vitest';
import { fileListCopy, projectFilesPath } from './files-contract';

const acceptedLists: unknown[] = [
  { entries: [] },
  {
    entries: [
      { path: 'drafts', kind: 'dir', size: 0, mtime: '2026-11-14T09:00:00Z' },
      {
        path: 'drafts/ch1.md',
        kind: 'file',
        size: 42,
        mtime: '2026-11-14T09:00:00.125Z',
      },
    ],
  },
];

const refusedLists: unknown[] = [
  {},
  {
    entries: [
      { path: 'a', kind: 'link', size: 0, mtime: '2026-11-14T09:00:00Z' },
    ],
  },
  {
    entries: [
      { path: 'a', kind: 'file', size: -1, mtime: '2026-11-14T09:00:00Z' },
    ],
  },
  {
    entries: [
      { path: 'a', kind: 'file', size: 1.5, mtime: '2026-11-14T09:00:00Z' },
    ],
  },
  {
    entries: [{ path: 'a', kind: 'file', size: 0, mtime: '2026-11-14T09:00:00' }],
  },
  { entries: 'drafts' },
];

describe('files-contract', () => {
  it('K1 fileListCopy accepts and refuses the fixtures that fileListSchema does', () => {
    for (const fixture of acceptedLists) {
      expect(fileListSchema.safeParse(fixture).success).toBe(true);
      expect(fileListCopy.safeParse(fixture).success).toBe(true);
    }
    for (const fixture of refusedLists) {
      expect(fileListSchema.safeParse(fixture).success).toBe(false);
      expect(fileListCopy.safeParse(fixture).success).toBe(false);
    }
  });

  it('K2 projectFilesPath encodes the project id as one path segment', () => {
    expect(projectFilesPath('my book')).toBe(
      PROJECT_FILES_ROUTE.replace(':projectId', 'my%20book'),
    );
  });
});
