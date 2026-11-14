import {
  ACTIVE_PROJECT_ROUTE,
  activeProjectSchema,
  fileReadSchema,
  fileWriteResultSchema,
  PROJECT_FILE_ROUTE,
  PROJECT_FILE_WRITE_ROUTE,
  PROJECTS_ROUTE,
  projectListSchema,
} from '@bbartolome/scriba-contracts/project-store';
import { describe, expect, it } from 'vitest';
import {
  ACTIVE_PROJECT_PATH,
  activeProjectCopy,
  PROJECT_FILE_PATH,
  PROJECT_FILE_WRITE_PATH,
  PROJECTS_PATH,
  projectFilePath,
  projectListCopy,
  readCopy,
  writeResultCopy,
} from './project-store-copies';

const acceptedActive: unknown[] = [{ active: 'a' }, { active: null }];

const refusedActive: unknown[] = [{ active: '' }, { active: 3 }, {}];

const acceptedList: unknown[] = [
  { projects: [] },
  {
    projects: [
      { id: 'a', title: 'Alpha', active: true, status: 'ok' },
      { id: 'b', title: 'Beta', active: false, status: 'ok' },
      { id: 'c', active: false, status: 'ok' },
    ],
  },
  {
    projects: [
      {
        id: 'd',
        title: 'Delta',
        genrePack: 'novel',
        active: false,
        status: 'invalid',
        error: 'Manifest unreadable.',
      },
    ],
  },
  {
    projects: [
      { id: 'e', title: 'Epsilon', active: false, status: 'too-new' },
      { id: 'f', title: 'Foxtrot', active: false, status: 'importable' },
    ],
  },
];

const refusedList: unknown[] = [
  {},
  { projects: [{ id: '', active: true, status: 'ok' }] },
  { projects: [{ id: 'a', title: 'Alpha', active: true, status: 'bad' }] },
  { projects: [{ id: 'a', title: 'Alpha', status: 'ok' }] },
  { projects: [{ id: 'a', title: 3, active: true, status: 'ok' }] },
  { projects: [{ id: 'a', genrePack: 3, active: true, status: 'ok' }] },
  { projects: [{ id: 'a', active: true, status: 'ok', error: 3 }] },
];

const HASH = `sha256:${'a'.repeat(64)}`;
const PATH = 'drafts/ch01.md';
const MTIME = '2026-11-14T10:00:00Z';

const acceptedRead: unknown[] = [
  { path: PATH, content: '', hash: HASH, mtime: MTIME },
  { path: PATH, content: 'text', hash: HASH, mtime: MTIME, upgraded: true },
  { path: PATH, content: 'text', hash: HASH, mtime: MTIME, extra: 1 },
];

const refusedRead: unknown[] = [
  { path: PATH, hash: HASH, mtime: MTIME },
  {
    path: PATH,
    content: 'text',
    hash: `sha256:${'A'.repeat(64)}`,
    mtime: MTIME,
  },
  { path: PATH, content: 'text', hash: HASH, mtime: '2026-11-14T10:00:00' },
  {
    path: PATH,
    content: 'text',
    hash: HASH,
    mtime: '2026-11-14T10:00:00+01:00',
  },
];

const acceptedWrite: unknown[] = [{ path: PATH, hash: HASH, mtime: MTIME }];

const refusedWrite: unknown[] = [
  { path: PATH, mtime: MTIME },
  { path: PATH, hash: 'sha256:abc', mtime: MTIME },
  { path: PATH, hash: HASH, mtime: '2026-11-14T10:00:00' },
];

describe('project-store copies', () => {
  it('the paths and the schemas agree with the contract', () => {
    expect(ACTIVE_PROJECT_PATH).toBe(ACTIVE_PROJECT_ROUTE);
    expect(PROJECTS_PATH).toBe(PROJECTS_ROUTE);

    for (const sample of acceptedActive) {
      expect(activeProjectSchema.safeParse(sample).success).toBe(true);
      expect(activeProjectCopy.safeParse(sample).success).toBe(true);
    }
    for (const sample of refusedActive) {
      expect(activeProjectSchema.safeParse(sample).success).toBe(false);
      expect(activeProjectCopy.safeParse(sample).success).toBe(false);
    }

    for (const sample of acceptedList) {
      expect(projectListSchema.safeParse(sample).success).toBe(true);
      expect(projectListCopy.safeParse(sample).success).toBe(true);
    }
    for (const sample of refusedList) {
      expect(projectListSchema.safeParse(sample).success).toBe(false);
      expect(projectListCopy.safeParse(sample).success).toBe(false);
    }
  });

  it('the file read and write copies agree with the contract', () => {
    expect(PROJECT_FILE_PATH).toBe(PROJECT_FILE_ROUTE);
    expect(PROJECT_FILE_WRITE_PATH).toBe(PROJECT_FILE_WRITE_ROUTE);
    expect(projectFilePath('book')).toBe(
      '/api/project-store/projects/book/file',
    );

    for (const sample of acceptedRead) {
      expect(fileReadSchema.safeParse(sample).success).toBe(true);
      expect(readCopy.safeParse(sample).success).toBe(true);
    }
    for (const sample of refusedRead) {
      expect(fileReadSchema.safeParse(sample).success).toBe(false);
      expect(readCopy.safeParse(sample).success).toBe(false);
    }

    for (const sample of acceptedWrite) {
      expect(fileWriteResultSchema.safeParse(sample).success).toBe(true);
      expect(writeResultCopy.safeParse(sample).success).toBe(true);
    }
    for (const sample of refusedWrite) {
      expect(fileWriteResultSchema.safeParse(sample).success).toBe(false);
      expect(writeResultCopy.safeParse(sample).success).toBe(false);
    }
  });
});
