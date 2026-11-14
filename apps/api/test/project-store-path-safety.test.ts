import { realpathSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { isDeepStrictEqual } from 'node:util';
import { expect, it } from 'vitest';
import { errorBodySchema } from '@bbartolome/scriba-contracts/platform';
import {
  PROJECT_ERROR_CODES,
  PROJECT_ERROR_STATUS,
} from '@bbartolome/scriba-contracts/project-store';
import { createTestApp, type TestApp } from './create-test-app';
import {
  buildPathSafetyLibrary,
  PathSafetyKitModule,
  pathSafetyCases,
  postResolve,
  type PathSafetyLibrary,
  type Reply,
  type ResolveCase,
  type ResolveOutcome,
} from './project-store-path-safety.kit';

const CODE_BY_OUTCOME: Record<
  ResolveOutcome,
  (typeof PROJECT_ERROR_CODES)[keyof typeof PROJECT_ERROR_CODES] | undefined
> = {
  invalid: PROJECT_ERROR_CODES.PATH_INVALID,
  outside: PROJECT_ERROR_CODES.PATH_OUTSIDE,
  reserved: PROJECT_ERROR_CODES.PATH_RESERVED,
  'not-found': PROJECT_ERROR_CODES.NOT_FOUND,
  allowed: undefined,
};

// Any absolute container path in a response: the library, the temp folder or the working folder.
const ABSOLUTE_PATH_PATTERN = /\/(?:etc|books|tmp|var|private|home|Users)\b/;

// The seven requests of E1 and what each must answer.
const E1_CASES: ResolveCase[] = [
  {
    name: 'E1 link-within through alias',
    project: 'alias',
    path: 'link-within/note.md',
    outcome: 'allowed',
    basis: 'extra (P1, S7)',
    relativePath: 'link-within/note.md',
    exists: true,
  },
  {
    name: 'E1 link-out through alias',
    project: 'alias',
    path: 'link-out/secret.md',
    outcome: 'outside',
    basis: 'extra (P1, S7)',
  },
  {
    name: 'E1 link-to-scriba through alias',
    project: 'alias',
    path: 'link-to-scriba/pending/a.json',
    outcome: 'reserved',
    basis: 'extra (P1, S7)',
  },
  {
    name: 'E1 root through alias',
    project: 'alias',
    path: '.',
    outcome: 'allowed',
    basis: 'extra (P1, S7)',
    relativePath: '',
    isRoot: true,
    exists: true,
  },
  {
    name: 'E1 missing project',
    project: 'missing',
    path: 'drafts/ch01.md',
    outcome: 'not-found',
    basis: 'extra (P1)',
  },
  {
    name: 'E1 project that is a file',
    project: 'book/drafts/ch01.md',
    path: 'drafts/ch01.md',
    outcome: 'not-found',
    basis: 'extra (P1)',
  },
  {
    name: 'E1 link-to-scriba through book',
    project: 'book',
    path: 'link-to-scriba/pending/a.json',
    outcome: 'reserved',
    basis: 'extra (P5)',
  },
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parseJson(text: string): unknown {
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return undefined;
  }
}

// Returns the reason a reply does not match its row, or undefined when it matches.
function mismatchOf(row: ResolveCase, reply: Reply): string | undefined {
  if (row.outcome === 'allowed') {
    if (reply.status !== 200) {
      return `status ${reply.status}, expected 200 (${reply.text})`;
    }
    const expected = {
      relativePath: row.relativePath ?? String(row.path),
      isRoot: row.isRoot ?? false,
      exists: row.exists,
    };
    const actual = parseJson(reply.text);
    return isDeepStrictEqual(actual, expected)
      ? undefined
      : `body ${reply.text}, expected ${JSON.stringify(expected)}`;
  }
  const code = CODE_BY_OUTCOME[row.outcome];
  if (code === undefined) return `no code for outcome ${row.outcome}`;
  const status = PROJECT_ERROR_STATUS[code];
  if (reply.status !== status) {
    return `status ${reply.status}, expected ${status}`;
  }
  const body = parseJson(reply.text);
  if (!isRecord(body) || JSON.stringify(Object.keys(body)) !== '["error"]') {
    return `body ${reply.text} does not have exactly the key error`;
  }
  if (!errorBodySchema.safeParse(body).success) {
    return `body ${reply.text} does not parse with errorBodySchema`;
  }
  const error = body.error as Record<string, unknown>;
  if (error.code !== code) {
    return `error.code ${String(error.code)}, expected ${code}`;
  }
  if ('details' in error) return `error has details: ${reply.text}`;
  return undefined;
}

// Boots the test route on a fresh library. The library and the outside folder are removed in every case.
async function withPathSafetyApp(
  run: (app: TestApp, fixture: PathSafetyLibrary) => Promise<void>,
): Promise<void> {
  const fixture = buildPathSafetyLibrary();
  try {
    let app: TestApp | undefined;
    try {
      app = await createTestApp({
        libraryDir: fixture.library,
        modules: [PathSafetyKitModule],
      });
      await run(app, fixture);
    } finally {
      await app?.close();
    }
  } finally {
    fixture.remove();
  }
}

it('C1: the path table gives invalid, outside, reserved and allowed as the unit says', async () => {
  await withPathSafetyApp(async (app, fixture) => {
    const cases = pathSafetyCases(fixture);
    expect(cases).toHaveLength(56);
    const mismatches: string[] = [];
    for (const row of cases) {
      const reply = await postResolve(app, {
        project: row.project,
        path: row.path,
      });
      const reason = mismatchOf(row, reply);
      if (reason !== undefined) {
        mismatches.push(`${row.name} ${JSON.stringify(row.path)}: ${reason}`);
      }
    }
    expect(mismatches).toEqual([]);
  });
});

it('C2: no response of any table row or E1 request contains an absolute path', async () => {
  await withPathSafetyApp(async (app, fixture) => {
    const forbidden = [
      fixture.library,
      realpathSync(fixture.library),
      fixture.outside,
      realpathSync(fixture.outside),
      tmpdir(),
      realpathSync(tmpdir()),
      process.cwd(),
    ];
    const requests = [
      ...pathSafetyCases(fixture).map((row) => ({
        name: row.name,
        project: row.project,
        path: row.path,
      })),
      ...E1_CASES.map((row) => ({
        name: row.name,
        project: row.project,
        path: row.path,
      })),
    ];
    expect(requests).toHaveLength(63);
    const leaks: string[] = [];
    for (const request of requests) {
      const reply = await postResolve(app, {
        project: request.project,
        path: request.path,
      });
      const fragment = forbidden.find((text) => reply.text.includes(text));
      if (fragment !== undefined) {
        leaks.push(`${request.name}: response holds ${fragment}`);
      } else if (ABSOLUTE_PATH_PATTERN.test(reply.text)) {
        leaks.push(
          `${request.name}: response matches the absolute-path pattern`,
        );
      }
    }
    expect(leaks).toEqual([]);
  });
});

it('E1: the project root may be reached through a symlink, and a missing or non-folder root is not found', async () => {
  await withPathSafetyApp(async (app) => {
    const mismatches: string[] = [];
    for (const row of E1_CASES) {
      const reply = await postResolve(app, {
        project: row.project,
        path: row.path,
      });
      const reason = mismatchOf(row, reply);
      if (reason !== undefined) {
        mismatches.push(`${row.name}: ${reason}`);
      }
    }
    expect(mismatches).toEqual([]);
  });
});
