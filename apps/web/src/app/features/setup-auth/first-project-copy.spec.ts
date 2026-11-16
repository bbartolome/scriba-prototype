import {
  ACTIVE_PROJECT_ROUTE,
  activeProjectSchema,
  PROJECT_IMPORT_ROUTE,
  PROJECT_NEW_ROUTE,
  PROJECT_START_FROM_SAMPLE_ROUTE,
  PROJECTS_ROUTE,
  projectListSchema,
  projectSummarySchema,
  SAMPLES_ROUTE,
  sampleListSchema,
} from '@bbartolome/scriba-contracts/project-store';
import { describe, expect, it } from 'vitest';
import {
  ACTIVE_PROJECT_PATH,
  activeCopy,
  PROJECT_IMPORT_PATH,
  PROJECT_NEW_PATH,
  PROJECT_START_FROM_SAMPLE_PATH,
  PROJECTS_PATH,
  projectListCopy,
  projectSummaryCopy,
  SAMPLES_PATH,
  sampleListCopy,
} from './first-project-copy';

const projectLists: unknown[] = [
  { projects: [] },
  {
    projects: [
      { id: 'my-book', title: 'My Book', active: true, status: 'ok' },
      { id: 'old-draft', active: false, status: 'importable' },
      {
        id: 'broken',
        title: 'Broken',
        active: false,
        status: 'invalid',
        error: 'Manifest unreadable.',
      },
    ],
  },
  {},
  { projects: 'x' },
  { projects: [{ id: '', active: true, status: 'ok' }] },
  { projects: [{ id: 'alpha', active: true, status: 'broken' }] },
  { projects: [{ id: 'alpha', active: 'yes', status: 'ok' }] },
];

const summaries: unknown[] = [
  { id: 'my-book', active: true, status: 'ok' },
  { id: 'my-book' },
  { id: '', active: true, status: 'ok' },
  { id: 'my-book', active: true, status: 'broken' },
];

const activeAnswers: unknown[] = [
  { active: 'my-book' },
  { active: null },
  { active: '' },
  {},
];

const sampleLists: unknown[] = [
  [],
  [{ id: 'nonfiction', title: 'Nonfiction', description: 'A short book.' }],
  [{ id: '', title: '', description: '' }],
  {},
];

describe('first-project copies', () => {
  it('FC1 the copies of the six routes and the four readers agree with the contract on each sample', () => {
    expect(PROJECTS_PATH).toBe(PROJECTS_ROUTE);
    expect(SAMPLES_PATH).toBe(SAMPLES_ROUTE);
    expect(PROJECT_NEW_PATH).toBe(PROJECT_NEW_ROUTE);
    expect(PROJECT_IMPORT_PATH).toBe(PROJECT_IMPORT_ROUTE);
    expect(PROJECT_START_FROM_SAMPLE_PATH).toBe(
      PROJECT_START_FROM_SAMPLE_ROUTE,
    );
    expect(ACTIVE_PROJECT_PATH).toBe(ACTIVE_PROJECT_ROUTE);

    for (const sample of projectLists) {
      expect(projectListCopy.safeParse(sample).success).toBe(
        projectListSchema.safeParse(sample).success,
      );
    }
    for (const sample of summaries) {
      expect(projectSummaryCopy.safeParse(sample).success).toBe(
        projectSummarySchema.safeParse(sample).success,
      );
    }
    for (const sample of activeAnswers) {
      expect(activeCopy.safeParse(sample).success).toBe(
        activeProjectSchema.safeParse(sample).success,
      );
    }
    for (const sample of sampleLists) {
      expect(sampleListCopy.safeParse(sample).success).toBe(
        sampleListSchema.safeParse(sample).success,
      );
    }
  });
});
