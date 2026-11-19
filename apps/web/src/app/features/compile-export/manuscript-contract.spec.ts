import {
  COMPILE_ERROR_CODES,
  MANUSCRIPT_PARTS,
  MANUSCRIPT_PART_ROUTE,
  MANUSCRIPT_REORDER_ROUTE,
  MANUSCRIPT_ROUTE,
  MANUSCRIPT_STATUS_ROUTE,
  MANUSCRIPT_STATUSES,
  manuscriptViewSchema,
} from '@bbartolome/scriba-contracts/compile-export';
import { manuscriptUpdatedDataSchema } from '@bbartolome/scriba-contracts/compile-export';
import { filesChangedDataSchema } from '@bbartolome/scriba-contracts/project-store';
import { describe, expect, it } from 'vitest';
import {
  isFilesChangedData,
  isManuscriptUpdatedData,
  MANUSCRIPT_PART_PATH,
  MANUSCRIPT_PART_VALUES,
  MANUSCRIPT_PATH,
  MANUSCRIPT_REORDER_PATH,
  MANUSCRIPT_STATUS_PATH,
  MANUSCRIPT_STATUS_VALUES,
  manuscriptViewCopy,
  ORDER_CONFLICT_CODE,
} from './manuscript-contract';

const REV1 = `sha256:${'1'.repeat(64)}`;

const entry = (path: string, part: string, status: string, words: number) => ({
  path,
  part,
  status,
  words,
  graphOrdered: false,
  inOrderField: true,
});

const VIEW_1 = {
  entries: [
    entry('drafts/front.md', 'front', 'final', 120),
    entry('drafts/ch01.md', 'body', 'draft', 900),
    entry('drafts/ch02.md', 'body', 'revised', 1200),
    entry('drafts/ch03.md', 'body', 'outline', 700),
    entry('drafts/back.md', 'back', 'draft', 80),
  ],
  totals: { body: 2800, manuscript: 3000 },
  orderSource: 'graph+project',
  warnings: [],
  revision: REV1,
};

const VIEW_WARNED = {
  ...VIEW_1,
  warnings: [
    { kind: 'graphCycle', files: ['drafts/ch02.md', 'drafts/ch03.md'] },
    { kind: 'invalidGraph', path: 'graphs/broken.json' },
    { kind: 'staleEntry', path: 'drafts/gone.md' },
  ],
};

const EMPTY_VIEW = {
  entries: [],
  totals: { body: 0, manuscript: 0 },
  orderSource: 'alphabetical',
  warnings: [],
  revision: REV1,
};

const acceptedViews: unknown[] = [VIEW_1, VIEW_WARNED, EMPTY_VIEW];

const refusedViews: unknown[] = [
  { ...VIEW_1, revision: 'sha256:abc' },
  {
    ...VIEW_1,
    entries: [entry('drafts/ch01.md', 'body', 'draft', -1)],
  },
  {
    ...VIEW_1,
    entries: [entry('drafts/ch01.md', 'body', 'done', 10)],
  },
  {
    ...VIEW_1,
    entries: [entry('drafts/ch01.md', 'middle', 'draft', 10)],
  },
  { ...VIEW_1, orderSource: 'custom' },
  { ...VIEW_1, warnings: [{ kind: 'unknownKind', path: 'x' }] },
  { entries: [], orderSource: 'alphabetical', warnings: [], revision: REV1 },
  { ...VIEW_1, entries: 'drafts/ch01.md' },
];

describe('manuscript-contract', () => {
  it('K1 manuscriptViewCopy accepts and refuses the fixtures that manuscriptViewSchema does', () => {
    for (const fixture of acceptedViews) {
      expect(manuscriptViewSchema.safeParse(fixture).success).toBe(true);
      expect(manuscriptViewCopy.safeParse(fixture).success).toBe(true);
    }
    for (const fixture of refusedViews) {
      expect(manuscriptViewSchema.safeParse(fixture).success).toBe(false);
      expect(manuscriptViewCopy.safeParse(fixture).success).toBe(false);
    }
  });

  it('K2 the route paths, the conflict code and the status and part values equal the contract', () => {
    expect(MANUSCRIPT_PATH).toBe(MANUSCRIPT_ROUTE);
    expect(MANUSCRIPT_REORDER_PATH).toBe(MANUSCRIPT_REORDER_ROUTE);
    expect(MANUSCRIPT_STATUS_PATH).toBe(MANUSCRIPT_STATUS_ROUTE);
    expect(MANUSCRIPT_PART_PATH).toBe(MANUSCRIPT_PART_ROUTE);
    expect(ORDER_CONFLICT_CODE).toBe(COMPILE_ERROR_CODES.ORDER_CONFLICT);
    expect(MANUSCRIPT_STATUS_VALUES).toEqual([...MANUSCRIPT_STATUSES]);
    expect(MANUSCRIPT_PART_VALUES).toEqual([...MANUSCRIPT_PARTS]);
  });

  it('K3 the event guards match the contract data schemas', () => {
    const updated: unknown[] = [
      { projectId: 'p1', revision: REV1 },
      { projectId: '', revision: REV1 },
      { projectId: 'p1' },
      { projectId: 'p1', revision: 'x' },
    ];
    for (const data of updated) {
      expect(isManuscriptUpdatedData(data)).toBe(
        manuscriptUpdatedDataSchema.safeParse(data).success,
      );
    }
    expect(isManuscriptUpdatedData(updated[0])).toBe(true);

    const changed: unknown[] = [
      { projectId: 'p1', paths: ['drafts/a.md'] },
      { projectId: 'p1', paths: [''] },
      { projectId: 'p1', paths: [1] },
      { projectId: '', paths: [] },
      { projectId: 'p1' },
    ];
    for (const data of changed) {
      expect(isFilesChangedData(data)).toBe(
        filesChangedDataSchema.safeParse(data).success,
      );
    }
    expect(isFilesChangedData(changed[0])).toBe(true);
  });
});
