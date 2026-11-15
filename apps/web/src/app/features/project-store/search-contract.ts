import type {
  SearchPassage,
  SearchResult,
} from '@bbartolome/scriba-contracts/project-store';
import type { ApiPath, ResponseSchema } from '../../shell';

// Hand-written copies of the search route and the search answer, which the search box reads.
// This file imports only types from the contract: the browser ships no runtime zod, so a value import
// would not load. search-contract.spec.ts (K1) checks the copy against the contract.

/** The search route of one project (`PROJECT_SEARCH_ROUTE`), with its id encoded as one path segment. */
export function projectSearchPath(projectId: string): ApiPath {
  return '/api/project-store/projects/:projectId/search'.replace(
    ':projectId',
    encodeURIComponent(projectId),
  ) as ApiPath;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** One passage, checked as searchPassageSchema does. A key the schema does not name is dropped, as zod drops it. */
function passageOf(value: unknown): SearchPassage | undefined {
  if (!isRecord(value)) return undefined;
  const { path, offset, snippet, score } = value;
  if (
    typeof path !== 'string' ||
    typeof offset !== 'number' ||
    !Number.isInteger(offset) ||
    offset < 0 ||
    typeof snippet !== 'string' ||
    typeof score !== 'number' ||
    !Number.isFinite(score)
  ) {
    return undefined;
  }
  return { path, offset, snippet, score };
}

/** Response of POST .../search (`searchResultSchema`): the passages, best first. */
export const searchResultCopy: ResponseSchema<SearchResult> = {
  safeParse(data) {
    if (!Array.isArray(data)) {
      return { success: false, error: 'the answer is not a list' };
    }
    const passages: SearchPassage[] = [];
    for (const item of data) {
      const passage = passageOf(item);
      if (passage === undefined) {
        return {
          success: false,
          error: 'a passage does not match searchPassageSchema',
        };
      }
      passages.push(passage);
    }
    return { success: true, data: passages };
  },
};
