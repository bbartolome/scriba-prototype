import {
  ACTIVE_PROJECT_ROUTE,
  activeProjectSchema,
  PROJECTS_ROUTE,
  projectListSchema,
} from '@bbartolome/scriba-contracts/project-store';
import { describe, expect, it } from 'vitest';
import {
  ACTIVE_PROJECT_PATH,
  activeProjectCopy,
  PROJECTS_PATH,
  projectListCopy,
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
});
