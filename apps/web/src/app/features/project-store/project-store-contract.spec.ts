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
} from './project-store-contract';

const acceptedActive: unknown[] = [{ active: 'alpha' }, { active: null }];

const refusedActive: unknown[] = [{ active: '' }, { active: 3 }, {}];

const summaries: unknown[] = [
  { id: 'alpha', title: 'Alpha', active: true, status: 'ok' },
  { id: 'beta', active: false, status: 'importable' },
  {
    id: 'delta',
    title: 'Delta',
    genrePack: 'novel',
    active: false,
    status: 'invalid',
    error: 'Manifest unreadable.',
  },
  { id: 'epsilon', title: 'Epsilon', active: false, status: 'too-new' },
];

const refusedSummaries: unknown[] = [
  { id: 'alpha', active: true },
  { id: '', active: true, status: 'ok' },
  { id: 'alpha', active: 'yes', status: 'ok' },
  { id: 'alpha', title: 3, active: true, status: 'ok' },
  { id: 'alpha', active: true, status: 'bad' },
  { id: 'alpha', active: true, status: 'ok', error: 3 },
];

const acceptedList: unknown[] = [{ projects: [] }, { projects: summaries }];

const refusedList: unknown[] = [
  {},
  { projects: [{ id: '', active: true, status: 'ok' }] },
  { projects: [refusedSummaries[4]] },
];

const acceptedSamples: unknown[] = [
  [],
  [{ id: 'nonfiction', title: 'Nonfiction', description: 'A sample.' }],
];

const refusedSamples: unknown[] = [
  {},
  [{ id: '', title: '', description: '' }],
  [{ id: 'nonfiction', title: 'Nonfiction' }],
  [{ id: 'nonfiction', title: 3, description: '' }],
];

describe('project-store copies', () => {
  it('the route paths agree with the contract', () => {
    expect(PROJECTS_PATH).toBe(PROJECTS_ROUTE);
    expect(PROJECT_NEW_PATH).toBe(PROJECT_NEW_ROUTE);
    expect(PROJECT_IMPORT_PATH).toBe(PROJECT_IMPORT_ROUTE);
    expect(PROJECT_START_FROM_SAMPLE_PATH).toBe(PROJECT_START_FROM_SAMPLE_ROUTE);
    expect(SAMPLES_PATH).toBe(SAMPLES_ROUTE);
    expect(ACTIVE_PROJECT_PATH).toBe(ACTIVE_PROJECT_ROUTE);
  });

  it('the active answer agrees with activeProjectSchema', () => {
    for (const sample of acceptedActive) {
      expect(activeProjectSchema.safeParse(sample).success).toBe(true);
      expect(activeCopy.safeParse(sample).success).toBe(true);
    }
    for (const sample of refusedActive) {
      expect(activeProjectSchema.safeParse(sample).success).toBe(false);
      expect(activeCopy.safeParse(sample).success).toBe(false);
    }
  });

  it('the list answer agrees with projectListSchema', () => {
    for (const sample of acceptedList) {
      expect(projectListSchema.safeParse(sample).success).toBe(true);
      expect(projectListCopy.safeParse(sample).success).toBe(true);
    }
    for (const sample of refusedList) {
      expect(projectListSchema.safeParse(sample).success).toBe(false);
      expect(projectListCopy.safeParse(sample).success).toBe(false);
    }
  });

  it('the summary of a create, an import or a start agrees with projectSummarySchema', () => {
    for (const sample of summaries) {
      expect(projectSummarySchema.safeParse(sample).success).toBe(true);
      expect(projectSummaryCopy.safeParse(sample).success).toBe(true);
    }
    for (const sample of refusedSummaries) {
      expect(projectSummarySchema.safeParse(sample).success).toBe(false);
      expect(projectSummaryCopy.safeParse(sample).success).toBe(false);
    }
  });

  it('the sample list agrees with sampleListSchema', () => {
    for (const sample of acceptedSamples) {
      expect(sampleListSchema.safeParse(sample).success).toBe(true);
      expect(sampleListCopy.safeParse(sample).success).toBe(true);
    }
    for (const sample of refusedSamples) {
      expect(sampleListSchema.safeParse(sample).success).toBe(false);
      expect(sampleListCopy.safeParse(sample).success).toBe(false);
    }
  });
});
