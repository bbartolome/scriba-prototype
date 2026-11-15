import { searchResultSchema } from '@bbartolome/scriba-contracts/project-store';
import { describe, expect, it } from 'vitest';
import { searchResultCopy } from './search-contract';

const passage = {
  path: 'sources/notes.md',
  offset: 0,
  snippet: 'Gamma rays and gamma bursts.',
  score: 1.5,
};

const acceptedResults: unknown[] = [[], [passage]];

const refusedResults: unknown[] = [
  {},
  [{ path: 'sources/notes.md', snippet: 'Gamma rays.', score: 1.5 }],
  [{ ...passage, offset: -1 }],
  [{ ...passage, offset: 1.5 }],
  [{ ...passage, score: '2' }],
  [{ path: 'sources/notes.md', offset: 0, score: 1.5 }],
  [{ offset: 0, snippet: 'Gamma rays.', score: 1.5 }],
];

describe('search-contract', () => {
  it('K1 searchResultCopy accepts and refuses the fixtures that searchResultSchema does', () => {
    for (const fixture of acceptedResults) {
      expect(searchResultSchema.safeParse(fixture).success).toBe(true);
      expect(searchResultCopy.safeParse(fixture).success).toBe(true);
    }
    for (const fixture of refusedResults) {
      expect(searchResultSchema.safeParse(fixture).success).toBe(false);
      expect(searchResultCopy.safeParse(fixture).success).toBe(false);
    }
  });
});
