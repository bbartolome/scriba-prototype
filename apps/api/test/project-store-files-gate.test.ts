import { existsSync, realpathSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, it } from 'vitest';
import {
  errorBodySchema,
  PLATFORM_ERROR_CODES,
  PLATFORM_ERROR_STATUS,
} from '@bbartolome/scriba-contracts/platform';
import {
  ACTIVE_PROJECT_ROUTE,
  entityListSchema,
  entityResolutionSchema,
  fileListSchema,
  fileReadSchema,
  PROJECT_ENTITIES_ROUTE,
  PROJECT_ENTITY_RESOLVE_ROUTE,
  PROJECT_ERROR_CODES,
  PROJECT_ERROR_STATUS,
  PROJECT_FILE_DELETE_ROUTE,
  PROJECT_FILE_EDIT_ROUTE,
  PROJECT_FILE_MOVE_ROUTE,
  PROJECT_FILE_ROUTE,
  PROJECT_FILE_WRITE_ROUTE,
  PROJECT_FILES_ROUTE,
  PROJECT_IMPORT_ROUTE,
  PROJECT_NEW_ROUTE,
  PROJECT_PENDING_ROUTE,
  PROJECT_START_FROM_SAMPLE_ROUTE,
  PROJECT_VERSION_ROUTE,
  PROJECT_VERSIONS_ROUTE,
  PROJECTS_ROUTE,
  SAMPLES_ROUTE,
} from '@bbartolome/scriba-contracts/project-store';
import { createTestApp, type TestApp } from './create-test-app';
import { send, sessionCookie, type Reply } from './guard-request';
import {
  EVENT_WAIT_MS,
  LOOPBACK_HOST,
  LOOPBACK_ORIGIN,
  observeEvents,
  sendRequest,
  snapshotLibrary,
} from './invariant-sweep';
import {
  ACTIVE_BOOK_SETTINGS,
  bookLibrary,
  fileUrl,
  listFiles,
  putFile,
  readFile,
} from './project-store-files.kit';
import {
  buildPathSafetyLibrary,
  pathSafetyCases,
  type ResolveCase,
} from './project-store-path-safety.kit';
import {
  changedPaths,
  postJson,
  withProjectsApp,
} from './project-store-projects.kit';
import { dataOf } from './sse';

// The three tests of the files gate (PST-12). Each builds its own temp library and removes it.

const BOOK = 'book';
const PROJECT_STORE_PREFIX = '/api/project-store/';
const NO_SUCH_PROJECT = 'no-such-project';
// Sixty seconds per test, as the invariant tests use (the Vitest default is twenty).
const GATE_TIMEOUT_MS = 60000;
// Any absolute container path in a response, as project-store-path-safety.test.ts uses it.
const ABSOLUTE_PATH_PATTERN = /\/(?:etc|books|tmp|var|private|home|Users)\b/;

type ProjectErrorCode =
  (typeof PROJECT_ERROR_CODES)[keyof typeof PROJECT_ERROR_CODES];

// The refusal code of each path outcome of the table. Undefined for allowed rows and for not-found.
function refusalCodeOf(
  outcome: ResolveCase['outcome'],
): ProjectErrorCode | undefined {
  switch (outcome) {
    case 'invalid':
      return PROJECT_ERROR_CODES.PATH_INVALID;
    case 'outside':
      return PROJECT_ERROR_CODES.PATH_OUTSIDE;
    case 'reserved':
      return PROJECT_ERROR_CODES.PATH_RESERVED;
    default:
      return undefined;
  }
}

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

// The code of an error body in the base shape, or undefined for any other body.
function codeOf(body: string): unknown {
  const parsed = parseJson(body);
  if (!isRecord(parsed) || !isRecord(parsed.error)) return undefined;
  return parsed.error.code;
}

// The reason a reply is not the refusal of `code` at `status`, or undefined when it is.
function refusalMismatch(
  reply: Reply,
  code: string,
  status: number,
): string | undefined {
  if (reply.status !== status) {
    return `status ${reply.status}, expected ${status} (${reply.body})`;
  }
  const body = parseJson(reply.body);
  if (!isRecord(body) || JSON.stringify(Object.keys(body)) !== '["error"]') {
    return `body ${reply.body} does not have exactly the key error`;
  }
  if (!errorBodySchema.safeParse(body).success) {
    return `body ${reply.body} does not parse with errorBodySchema`;
  }
  const error = body.error as Record<string, unknown>;
  if (error.code !== code) {
    return `error.code ${String(error.code)}, expected ${code}`;
  }
  if (code !== PLATFORM_ERROR_CODES.VALIDATION_FAILED && 'details' in error) {
    return `error has details: ${reply.body}`;
  }
  return undefined;
}

// The reason a 200 is not a file read of `expectedPath`, or undefined when it is.
function fileAnswerMismatch(
  reply: Reply,
  expectedPath: string,
): string | undefined {
  if (reply.status !== 200) return `status ${reply.status}, expected 200`;
  const parsed = fileReadSchema.safeParse(parseJson(reply.body));
  if (!parsed.success) return 'body does not parse as a file read';
  return parsed.data.path === expectedPath
    ? undefined
    : `path ${parsed.data.path}, expected ${expectedPath}`;
}

// The reason a reply is not a 200 folder listing, or undefined when it is.
function listAnswerMismatch(reply: Reply): string | undefined {
  if (reply.status !== 200) return `status ${reply.status}, expected 200`;
  return fileListSchema.safeParse(parseJson(reply.body)).success
    ? undefined
    : 'body does not parse as a folder listing';
}

type Kind = 'file' | 'folder' | 'missing';

// What the disk holds at a path under the project folder. Links are followed, as the route follows them.
function kindOnDisk(target: string): Kind {
  if (!existsSync(target)) return 'missing';
  return statSync(target).isDirectory() ? 'folder' : 'file';
}

// Test F1. The 56 rows of the path table, sent to the real file routes over HTTP with the session cookie.
it(
  'files gate, F1: the path table gives the same answers over the real file routes, over HTTP',
  async () => {
    const fixture = buildPathSafetyLibrary();
    try {
      // Makes book an ok project, and the active project, as an author's library would.
      putFile(
        fixture.library,
        `${BOOK}/project.yaml`,
        'schemaVersion: 1\ntitle: Book\ngenrePack: nonfiction\n',
      );
      putFile(fixture.library, '.scriba/settings.yaml', ACTIVE_BOOK_SETTINGS);
      const app = await createTestApp({ libraryDir: fixture.library });
      try {
        const cookie = await sessionCookie(app, fixture.library);
        const before = snapshotLibrary(fixture.library);
        const cases = pathSafetyCases(fixture);
        expect(cases).toHaveLength(56);
        const bookRoot = join(fixture.library, BOOK);
        const mismatches: string[] = [];
        const answers: { label: string; reply: Reply }[] = [];

        for (const row of cases) {
          const label = `${row.name} ${JSON.stringify(row.path)}`;
          const path = row.path;

          if (row.outcome === 'allowed' && typeof path === 'string') {
            // The kind comes from the disk. The table's exists must agree with it.
            const kind = kindOnDisk(join(bookRoot, path));
            if (row.exists !== (kind !== 'missing')) {
              mismatches.push(
                `${label}: the table says exists ${String(row.exists)}, the disk says ${kind}`,
              );
            }
            const read = await send(app.baseUrl, {
              host: LOOPBACK_HOST,
              cookie,
              path: fileUrl(PROJECT_FILE_ROUTE, BOOK, { path }),
            });
            answers.push({ label: `${label} GET file`, reply: read });
            const readReason =
              kind === 'file'
                ? fileAnswerMismatch(read, row.relativePath ?? path)
                : refusalMismatch(
                    read,
                    PROJECT_ERROR_CODES.NOT_FOUND,
                    PROJECT_ERROR_STATUS[PROJECT_ERROR_CODES.NOT_FOUND],
                  );
            if (readReason !== undefined) {
              mismatches.push(`${label} GET file: ${readReason}`);
            }

            const list = await send(app.baseUrl, {
              host: LOOPBACK_HOST,
              cookie,
              path: fileUrl(PROJECT_FILES_ROUTE, BOOK, { path }),
            });
            answers.push({ label: `${label} GET files`, reply: list });
            const listReason =
              kind === 'folder'
                ? listAnswerMismatch(list)
                : refusalMismatch(
                    list,
                    PROJECT_ERROR_CODES.NOT_FOUND,
                    PROJECT_ERROR_STATUS[PROJECT_ERROR_CODES.NOT_FOUND],
                  );
            if (listReason !== undefined) {
              mismatches.push(`${label} GET files: ${listReason}`);
            }
            continue;
          }

          const code = refusalCodeOf(row.outcome);
          if (code === undefined) {
            mismatches.push(`${label}: no refusal for outcome ${row.outcome}`);
            continue;
          }
          // Row 15 is a number, which a query string cannot carry: only the write is sent for it.
          if (typeof path === 'string') {
            const read = await send(app.baseUrl, {
              host: LOOPBACK_HOST,
              cookie,
              path: fileUrl(PROJECT_FILE_ROUTE, BOOK, { path }),
            });
            answers.push({ label: `${label} GET file`, reply: read });
            const readReason = refusalMismatch(
              read,
              code,
              PROJECT_ERROR_STATUS[code],
            );
            if (readReason !== undefined) {
              mismatches.push(`${label} GET file: ${readReason}`);
            }

            const list = await send(app.baseUrl, {
              host: LOOPBACK_HOST,
              cookie,
              path: fileUrl(PROJECT_FILES_ROUTE, BOOK, { path }),
            });
            answers.push({ label: `${label} GET files`, reply: list });
            const listReason = refusalMismatch(
              list,
              code,
              PROJECT_ERROR_STATUS[code],
            );
            if (listReason !== undefined) {
              mismatches.push(`${label} GET files: ${listReason}`);
            }
          }

          const write = await postJson(
            app,
            cookie,
            fileUrl(PROJECT_FILE_WRITE_ROUTE, BOOK),
            { path, content: 'x' },
          );
          answers.push({ label: `${label} POST write`, reply: write });
          const writeReason =
            typeof path === 'string'
              ? refusalMismatch(write, code, PROJECT_ERROR_STATUS[code])
              : refusalMismatch(
                  write,
                  PLATFORM_ERROR_CODES.VALIDATION_FAILED,
                  PLATFORM_ERROR_STATUS.PLATFORM_VALIDATION_FAILED,
                );
          if (writeReason !== undefined) {
            mismatches.push(`${label} POST write: ${writeReason}`);
          }
        }

        // A refused write changes nothing, and no allowed row writes.
        const after = snapshotLibrary(fixture.library);
        expect(changedPaths(before, after)).toEqual([]);

        // The leak check: no answer holds an absolute path of the fixture, the temp folder or the working folder.
        const forbidden = [
          fixture.library,
          realpathSync(fixture.library),
          fixture.outside,
          realpathSync(fixture.outside),
          tmpdir(),
          realpathSync(tmpdir()),
          process.cwd(),
        ];
        for (const { label, reply } of answers) {
          const fragment = forbidden.find((text) => reply.body.includes(text));
          if (fragment !== undefined) {
            mismatches.push(`${label}: answer holds ${fragment}`);
          } else if (ABSOLUTE_PATH_PATTERN.test(reply.body)) {
            mismatches.push(
              `${label}: answer matches the absolute-path pattern`,
            );
          }
        }
        expect(mismatches).toEqual([]);
      } finally {
        await app.close();
      }
    } finally {
      fixture.remove();
    }
  },
  GATE_TIMEOUT_MS,
);

// The route-method pairs of the composed app for the Project store, fifteen on main (PST-12 plan, section 4).
const F2_PAIRS: readonly (readonly [string, string])[] = [
  ['GET', PROJECTS_ROUTE],
  ['GET', SAMPLES_ROUTE],
  ['GET', ACTIVE_PROJECT_ROUTE],
  ['GET', PROJECT_FILES_ROUTE],
  ['GET', PROJECT_FILE_ROUTE],
  ['GET', PROJECT_ENTITIES_ROUTE],
  ['GET', PROJECT_ENTITY_RESOLVE_ROUTE],
  ['POST', PROJECT_NEW_ROUTE],
  ['POST', PROJECT_IMPORT_ROUTE],
  ['POST', PROJECT_START_FROM_SAMPLE_ROUTE],
  ['POST', ACTIVE_PROJECT_ROUTE],
  ['POST', PROJECT_FILE_WRITE_ROUTE],
  ['POST', PROJECT_FILE_EDIT_ROUTE],
  ['POST', PROJECT_FILE_DELETE_ROUTE],
  ['POST', PROJECT_FILE_MOVE_ROUTE],
];

// Test F2. Every Project store route the composed app lists refuses a request with no cookie.
it(
  'files gate, F2: every Project store route refuses a request with no credential',
  async () => {
    const fixture = bookLibrary();
    try {
      await withProjectsApp(fixture, async (app, cookie) => {
        const routes = app
          .routes()
          .filter((route) => route.path.startsWith(PROJECT_STORE_PREFIX));
        const missing = F2_PAIRS.filter(
          ([method, template]) =>
            !routes.some(
              (route) => route.method === method && route.path === template,
            ),
        ).map(([method, template]) => `${method} ${template}`);
        expect(
          missing,
          'F2: these route-method pairs are not listed by the composed app',
        ).toEqual([]);

        // Every listed route, the later units' included, is sent with no cookie and an Origin set.
        const unrefused: string[] = [];
        for (const route of routes) {
          const result = await sendRequest(app.baseUrl, {
            host: LOOPBACK_HOST,
            path: route.path.replace(/:[A-Za-z]+/g, NO_SUCH_PROJECT),
            method: route.method,
            origin: LOOPBACK_ORIGIN,
            body: route.method === 'GET' ? undefined : '{}',
            until: 'end',
          });
          if (
            result.status !== 401 ||
            codeOf(result.body) !== 'AUTH_REQUIRED'
          ) {
            unrefused.push(
              `${route.method} ${route.path}: status ${String(result.status)}, body ${result.body}`,
            );
          }
        }
        expect(unrefused).toEqual([]);

        // The control: the same listing answers 200 with the cookie.
        const control = await send(app.baseUrl, {
          host: LOOPBACK_HOST,
          cookie,
          path: PROJECTS_ROUTE,
        });
        expect(control.status).toBe(200);
      });
    } finally {
      fixture.remove();
    }
  },
  GATE_TIMEOUT_MS,
);

interface GetRow {
  template: string; // the route template, as app.routes() lists it
  request: (app: TestApp, cookie: string) => Promise<Reply>;
}

// Test F3's table: each Project store GET, with a request that reads the active project book.
// A Project store GET added by a later unit needs its row here, or F3 fails by name.
const F3_ROWS: readonly GetRow[] = [
  {
    template: PROJECTS_ROUTE,
    request: (app, cookie) =>
      send(app.baseUrl, { host: LOOPBACK_HOST, cookie, path: PROJECTS_ROUTE }),
  },
  {
    template: SAMPLES_ROUTE,
    request: (app, cookie) =>
      send(app.baseUrl, { host: LOOPBACK_HOST, cookie, path: SAMPLES_ROUTE }),
  },
  {
    template: ACTIVE_PROJECT_ROUTE,
    request: (app, cookie) =>
      send(app.baseUrl, {
        host: LOOPBACK_HOST,
        cookie,
        path: ACTIVE_PROJECT_ROUTE,
      }),
  },
  {
    template: PROJECT_FILES_ROUTE,
    request: (app, cookie) => listFiles(app, cookie, BOOK, '.', true),
  },
  {
    template: PROJECT_FILE_ROUTE,
    request: (app, cookie) => readFile(app, cookie, BOOK, 'sources/outline.md'),
  },
  {
    template: PROJECT_ENTITIES_ROUTE,
    request: (app, cookie) =>
      send(app.baseUrl, {
        host: LOOPBACK_HOST,
        cookie,
        path: fileUrl(PROJECT_ENTITIES_ROUTE, BOOK),
      }),
  },
  {
    template: PROJECT_ENTITY_RESOLVE_ROUTE,
    request: (app, cookie) =>
      send(app.baseUrl, {
        host: LOOPBACK_HOST,
        cookie,
        path: fileUrl(PROJECT_ENTITY_RESOLVE_ROUTE, BOOK, { ids: 'ann' }),
      }),
  },
  {
    template: PROJECT_PENDING_ROUTE,
    request: (app, cookie) =>
      send(app.baseUrl, {
        host: LOOPBACK_HOST,
        cookie,
        path: fileUrl(PROJECT_PENDING_ROUTE, BOOK),
      }),
  },
  {
    template: PROJECT_VERSIONS_ROUTE,
    request: (app, cookie) =>
      send(app.baseUrl, {
        host: LOOPBACK_HOST,
        cookie,
        path: fileUrl(PROJECT_VERSIONS_ROUTE, BOOK, {
          draftPath: 'drafts/ch01.md',
        }),
      }),
  },
  {
    template: PROJECT_VERSION_ROUTE,
    request: (app, cookie) =>
      send(app.baseUrl, {
        host: LOOPBACK_HOST,
        cookie,
        path: fileUrl(PROJECT_VERSION_ROUTE, BOOK, {
          draftPath: 'drafts/ch01.md',
          id: '20261104T231500123Z.md',
        }),
      }),
  },
];

// The ids a 200 entity listing holds, or none when the reply is not one.
function listedIds(reply: Reply | undefined): string[] {
  if (reply === undefined || reply.status !== 200) return [];
  const parsed = entityListSchema.safeParse(parseJson(reply.body));
  return parsed.success ? parsed.data.entities.map((entity) => entity.id) : [];
}

// The ids a 200 resolution resolves, or none when the reply is not one.
function resolvedIds(reply: Reply | undefined): string[] {
  if (reply === undefined || reply.status !== 200) return [];
  const parsed = entityResolutionSchema.safeParse(parseJson(reply.body));
  return parsed.success ? parsed.data.resolved.map((entity) => entity.id) : [];
}

// The module slug of an event block, or undefined for a block that is not one.
function moduleOf(block: string): unknown {
  const parsed = parseJson(dataOf(block));
  return isRecord(parsed) ? parsed.module : undefined;
}

// Test F3. Each Project store GET of an active project leaves the library and the event stream unchanged.
it(
  'files gate, F3: every Project store GET leaves an active project and the event stream unchanged',
  async () => {
    const fixture = bookLibrary();
    try {
      // The resolve GET reads a real entity file; bookLibrary has no entities folder.
      putFile(
        fixture.library,
        `${BOOK}/entities/ann.md`,
        '---\nid: ann\ntype: person\n---\nAnn.\n',
      );
      // A saved version of a draft, so the version GETs of F3 read a real file.
      putFile(
        fixture.library,
        `${BOOK}/drafts/.versions/ch01.md/20261104T231500123Z.md`,
        'Old\n',
      );
      await withProjectsApp(fixture, async (app, cookie) => {
        const getRoutes = [
          ...new Set(
            app
              .routes()
              .filter(
                (route) =>
                  route.method === 'GET' &&
                  route.path.startsWith(PROJECT_STORE_PREFIX),
              )
              .map((route) => route.path),
          ),
        ];
        const unlisted = getRoutes.filter(
          (template) => !F3_ROWS.some((row) => row.template === template),
        );
        expect(
          unlisted,
          'F3: these Project store GET routes have no row in F3_ROWS of project-store-files-gate.test.ts; add one for each',
        ).toEqual([]);

        const observer = await observeEvents(
          app.baseUrl,
          LOOPBACK_HOST,
          cookie,
        );
        try {
          const before = snapshotLibrary(fixture.library);
          const replies = new Map<string, Reply>();
          for (const row of F3_ROWS) {
            replies.set(row.template, await row.request(app, cookie));
          }
          const notOk = F3_ROWS.filter(
            (row) => replies.get(row.template)?.status !== 200,
          ).map(
            (row) =>
              `${row.template}: status ${String(replies.get(row.template)?.status)}`,
          );
          expect(notOk).toEqual([]);
          // sources/outline.md is an entity too, so the listing holds it with ann.
          expect(listedIds(replies.get(PROJECT_ENTITIES_ROUTE))).toContain(
            'ann',
          );
          expect(
            resolvedIds(replies.get(PROJECT_ENTITY_RESOLVE_ROUTE)),
          ).toEqual(['ann']);

          const after = snapshotLibrary(fixture.library);
          expect(changedPaths(before, after)).toEqual([]);
          const blocks = await observer.take(EVENT_WAIT_MS);
          expect(
            blocks.filter((block) => moduleOf(block) === 'project-store'),
          ).toEqual([]);
        } finally {
          await observer.close();
        }
      });
    } finally {
      fixture.remove();
    }
  },
  GATE_TIMEOUT_MS,
);
