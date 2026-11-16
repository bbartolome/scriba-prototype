// Sweeps for the cross-module invariant tests (SAU-07). Test 1 and control N1 and N4 call sweepGetHead;
// test 2 and controls N2 and N3 call sweepMutations. Each test and control reads its result as a list of violations.
//
// Fixture rule: a route template that contains ':' or '{' needs an entry in FIXTURE_PATHS, which gives the
// concrete path the sweep requests. A template with no entry fails the test by name; nothing is skipped silently.
//
// Seeding rule: an entry's optional seed(library) writes sample data into the temp library before the app boots,
// so the library snapshot never sees it. seedFixtures runs every seed before the app is created.
//
// Sending rule: every sweep request goes through sendRequest, with an explicit Host and the method as a string.
// It resolves at the response headers (sweepGetHead) or at the end of the reply (sweepMutations), or at
// RESPONSE_CAP_MS with the status and headers it has. Its socket is destroyed when it resolves, so the request
// counts as sent. sweepGetHead asserts no status at all. A reply that never ends resolves at the cap: on main,
// HEAD /events writes its stream and never ends it, so that request resolves at the cap.
//
// Cost of a request in sweepGetHead: its resolution (at most RESPONSE_CAP_MS), then the EVENT_WAIT_MS window,
// in which the observer's blocks are attributed to that request.
import { createHash } from 'node:crypto';
import { lstatSync, readdirSync, readFileSync } from 'node:fs';
import {
  request as httpRequest,
  type IncomingHttpHeaders,
  type IncomingMessage,
} from 'node:http';
import { join } from 'node:path';
import {
  EVENTS_ROUTE,
  HEALTHZ_ROUTE,
} from '@bbartolome/scriba-contracts/platform';
import {
  HANDSHAKE_ROUTE,
  IDENTITY_ROUTE,
} from '@bbartolome/scriba-contracts/setup-auth';
import type { RouteEntry, TestApp } from './create-test-app';
import { dataOf } from './sse';

// The host and origin of the loopback app, as the guard expects them.
export const LOOPBACK_HOST = '127.0.0.1:8080';
export const LOOPBACK_ORIGIN = 'http://127.0.0.1:8080';
const FOREIGN_ORIGIN = 'http://evil.example';
const FRAME_POLICY = "frame-ancestors 'none'";
const SAFE_METHODS = ['GET', 'HEAD', 'OPTIONS'];
const ALL_METHODS = ['POST', 'PUT', 'PATCH', 'DELETE'];
const ECHO_BODY = JSON.stringify({ count: 1, intervalMs: 0 });

// The host names the guard must refuse. Copied from apps/api/test/setup-auth-guard.test.ts lines 34 to 39.
// The tailnet name is not listed; the short name scriba:8080 is.
export const FOREIGN_HOSTS = [
  'evil.example:8080',
  '127.0.0.1:9999',
  'scriba:8080',
  '127.0.0.1',
];

// The route template of the static fallback, registered by ServeStaticModule (@nestjs/serve-static 12.1.1).
export const SPA_FALLBACK_TEMPLATE = '{*any}' as const;

// The fixed public set (SAU-04): every other enumerated route must refuse a request without a credential.
export const FIXED_PUBLIC_ROUTES: readonly RouteEntry[] = [
  { method: 'GET', path: HEALTHZ_ROUTE },
  { method: 'GET', path: HANDSHAKE_ROUTE },
  { method: 'GET', path: IDENTITY_ROUTE },
  { method: 'GET', path: SPA_FALLBACK_TEMPLATE },
];

interface Fixture {
  path: string; // the concrete path the sweep requests
  seed?: (library: string) => void; // writes sample data before the app boots
}

// One entry per route template that contains ':' or '{'. A module with a path parameter adds its entry here.
// The providers entries use no-such-provider, so the sweep never reaches a stored provider.
export const FIXTURE_PATHS: Readonly<Record<string, Fixture>> = {
  [SPA_FALLBACK_TEMPLATE]: { path: '/spa-probe-path' },
  '/api/agent-loop/conversations/:conversationId': {
    path: '/api/agent-loop/conversations/no-such-conversation',
  },
  '/api/providers/:id/update': {
    path: '/api/providers/no-such-provider/update',
  },
  '/api/providers/:id/delete': {
    path: '/api/providers/no-such-provider/delete',
  },
  '/api/providers/:id/models': {
    path: '/api/providers/no-such-provider/models',
  },
  '/api/project-store/projects/:projectId/files': {
    path: '/api/project-store/projects/no-such-project/files',
  },
  '/api/project-store/projects/:projectId/file': {
    path: '/api/project-store/projects/no-such-project/file',
  },
  '/api/project-store/projects/:projectId/file/write': {
    path: '/api/project-store/projects/no-such-project/file/write',
  },
  '/api/project-store/projects/:projectId/file/edit': {
    path: '/api/project-store/projects/no-such-project/file/edit',
  },
  '/api/project-store/projects/:projectId/file/delete': {
    path: '/api/project-store/projects/no-such-project/file/delete',
  },
  '/api/project-store/projects/:projectId/file/move': {
    path: '/api/project-store/projects/no-such-project/file/move',
  },
  '/api/project-store/projects/:projectId/entities': {
    path: '/api/project-store/projects/no-such-project/entities',
  },
  '/api/project-store/projects/:projectId/entities/resolve': {
    path: '/api/project-store/projects/no-such-project/entities/resolve',
  },
  '/api/project-store/projects/:projectId/search': {
    path: '/api/project-store/projects/no-such-project/search',
  },
  '/api/project-store/projects/:projectId/rebuild': {
    path: '/api/project-store/projects/no-such-project/rebuild',
  },
  '/api/project-store/projects/:projectId/pending': {
    path: '/api/project-store/projects/no-such-project/pending',
  },
  '/api/tool-registry/tools/:name': {
    path: '/api/tool-registry/tools/no-such-tool',
  },
  '/api/tool-registry/tools/:name/validate': {
    path: '/api/tool-registry/tools/no-such-tool/validate',
  },
  '/api/tool-registry/tools/:name/builtin': {
    path: '/api/tool-registry/tools/no-such-tool/builtin',
  },
  '/api/tool-registry/tools/:name/user': {
    path: '/api/tool-registry/tools/no-such-tool/user',
  },
  '/api/tool-registry/tools/:name/enabled': {
    path: '/api/tool-registry/tools/no-such-tool/enabled',
  },
  '/api/tool-registry/tools/:name/save': {
    path: '/api/tool-registry/tools/no-such-tool/save',
  },
  '/api/tool-registry/tools/:name/delete': {
    path: '/api/tool-registry/tools/no-such-tool/delete',
  },
  '/api/setup-auth/steps/:step': {
    path: '/api/setup-auth/steps/access',
  },
};

// The disposable derived caches, exempt from the library snapshot. The exemption covers each path and
// everything below it. A directory is compared by presence only, so its times are never compared.
export const DERIVED_CACHE_PATHS: readonly string[] = ['.scriba/index'];

// The settings file, compared as its bytes as well as by its fingerprint.
const SETTINGS_PATH = '.scriba/settings.yaml';

// The events a GET may emit, as module and type pairs, with the reason for each. A module that needs an entry adds
// one here with its reason.
export const EVENT_ALLOWLIST: readonly {
  module: string;
  type: string;
  reason: string;
}[] = [
  {
    module: 'tool-registry',
    type: 'catalog-changed',
    reason:
      'A GET runs the user-pack re-scan, which publishes a host-side change made outside the app (units TRG-06 line 20 and TRG-10 line 21). The GET itself changes no file.',
  },
];

// The window in which a request's events are collected (sweepGetHead).
export const EVENT_WAIT_MS = 200;
// The most time a sweep request may take before it resolves at its cap.
export const RESPONSE_CAP_MS = 1000;

export interface Violation {
  kind:
    | 'library-changed'
    | 'event-emitted'
    | 'no-credential-401'
    | 'origin-missing-403'
    | 'origin-foreign-403'
    | 'host-foreign-403'
    | 'fixed-route-answer'
    | 'fixed-route-missing';
  method: string;
  path: string; // the route template, as the router holds it
}

export interface SendOptions {
  host: string;
  path: string;
  method: string;
  cookie?: string;
  origin?: string;
  body?: string;
  until: 'headers' | 'end';
}

export interface SendResult {
  status?: number; // undefined when no response arrived before the cap
  headers: IncomingHttpHeaders;
  body: string;
  capped: boolean;
}

// Seeds every fixture before the app boots. On main no entry has a seed.
export function seedFixtures(library: string): void {
  for (const fixture of Object.values(FIXTURE_PATHS)) {
    fixture.seed?.(library);
  }
}

// The concrete path for a route template. A template with no FIXTURE_PATHS entry fails by name.
function concretePath(template: string): string {
  if (!/[:{]/.test(template)) return template;
  const fixture = FIXTURE_PATHS[template];
  if (fixture === undefined) {
    throw new Error(
      `No fixture path for route template ${template}. Add an entry to FIXTURE_PATHS in invariant-sweep.ts.`,
    );
  }
  return fixture.path;
}

// Sends one request over node:http, with an explicit Host and the method as given. It resolves at the response
// headers (until 'headers') or at the end of the reply (until 'end'), or at RESPONSE_CAP_MS with what it has.
// The socket is destroyed when the request resolves, so the request counts as sent.
export function sendRequest(
  baseUrl: string,
  options: SendOptions,
): Promise<SendResult> {
  const { hostname, port } = new URL(baseUrl);
  const headers: Record<string, string> = { Host: options.host };
  if (options.cookie !== undefined) headers.Cookie = options.cookie;
  if (options.origin !== undefined) headers.Origin = options.origin;
  if (options.body !== undefined) {
    headers['Content-Type'] = 'application/json';
    headers['Content-Length'] = String(Buffer.byteLength(options.body));
  }
  return new Promise((resolve, reject) => {
    let settled = false;
    let response: IncomingMessage | undefined;
    const chunks: Buffer[] = [];
    const finish = (capped: boolean): void => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      request.destroy();
      resolve({
        status: response?.statusCode,
        headers: response?.headers ?? {},
        body: Buffer.concat(chunks).toString('utf8'),
        capped,
      });
    };
    const timer = setTimeout(() => finish(true), RESPONSE_CAP_MS);
    const request = httpRequest(
      {
        hostname,
        port,
        path: options.path,
        method: options.method,
        headers,
        agent: false,
      },
      (res) => {
        response = res;
        if (options.until === 'headers') {
          finish(false);
          return;
        }
        res.on('data', (chunk: Buffer) => chunks.push(chunk));
        res.on('end', () => finish(false));
        res.on('close', () => finish(false));
        res.on('error', () => finish(false));
      },
    );
    request.on('error', (error) => {
      // After the request has resolved, its own socket destroy surfaces here as ECONNRESET: not an error.
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      reject(error);
    });
    request.end(options.body);
  });
}

// The snapshot of the library: for each path, a fingerprint. A file has its size, times, inode and sha256
// (and its bytes for the settings file); a directory has its type only.
export type Snapshot = Map<string, string>;

export function snapshotLibrary(dir: string): Snapshot {
  const snapshot: Snapshot = new Map();
  recordTree(dir, '', snapshot);
  return snapshot;
}

function recordTree(root: string, relative: string, snapshot: Snapshot): void {
  for (const name of readdirSync(join(root, relative)).sort()) {
    const path = relative === '' ? name : `${relative}/${name}`;
    if (isDerived(path)) continue;
    const stats = lstatSync(join(root, path));
    if (stats.isDirectory()) {
      snapshot.set(path, 'directory');
      recordTree(root, path, snapshot);
    } else if (stats.isFile()) {
      const bytes = readFileSync(join(root, path));
      const fingerprint = {
        size: stats.size,
        mtimeMs: stats.mtimeMs,
        ctimeMs: stats.ctimeMs,
        ino: stats.ino,
        sha256: createHash('sha256').update(bytes).digest('hex'),
        ...(path === SETTINGS_PATH ? { bytes: bytes.toString('base64') } : {}),
      };
      snapshot.set(path, JSON.stringify(fingerprint));
    } else {
      snapshot.set(path, 'other');
    }
  }
}

function isDerived(path: string): boolean {
  return DERIVED_CACHE_PATHS.some(
    (cache) => path === cache || path.startsWith(`${cache}/`),
  );
}

function differs(before: Snapshot, after: Snapshot): boolean {
  if (before.size !== after.size) return true;
  for (const [path, fingerprint] of before) {
    if (after.get(path) !== fingerprint) return true;
  }
  return false;
}

// The text of a `data:` block, as a parsed object with its module and type. Undefined when it is not one.
function eventKey(block: string): { module: string; type: string } | undefined {
  try {
    const parsed: unknown = JSON.parse(dataOf(block));
    if (typeof parsed !== 'object' || parsed === null) return undefined;
    const { module, type } = parsed as { module?: unknown; type?: unknown };
    if (typeof module !== 'string' || typeof type !== 'string')
      return undefined;
    return { module, type };
  } catch {
    return undefined;
  }
}

// The blocks that are mutation-type events: every block not on EVENT_ALLOWLIST.
function eventBlocks(blocks: string[]): string[] {
  return blocks.filter((block) => {
    const key = eventKey(block);
    return !EVENT_ALLOWLIST.some(
      (entry) =>
        key !== undefined &&
        entry.module === key.module &&
        entry.type === key.type,
    );
  });
}

const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

export interface Observer {
  take: (waitMs: number) => Promise<string[]>; // waits, then returns the data blocks received since the last call
  close: () => Promise<void>;
}

// Opens GET /events with an explicit Host and the cookie, consumes and checks the observer's own platform/hello,
// and returns the observer. A block is the text up to a blank line; a block with no data line is a comment.
export async function observeEvents(
  baseUrl: string,
  host: string,
  cookie: string,
): Promise<Observer> {
  const { hostname, port } = new URL(baseUrl);
  const request = httpRequest({
    hostname,
    port,
    path: EVENTS_ROUTE,
    method: 'GET',
    headers: { Host: host, Cookie: cookie, Accept: 'text/event-stream' },
    agent: false,
  });
  let buffer = '';
  const blocks: string[] = [];
  let closing = false;
  let failure: Error | undefined;
  request.on('error', (error: Error) => {
    if (!closing) failure ??= error;
  });
  const response = await new Promise<IncomingMessage>((resolve, reject) => {
    request.once('response', resolve);
    request.once('error', reject);
    request.end();
  });
  if (response.statusCode !== 200) {
    request.destroy();
    throw new Error(`GET ${EVENTS_ROUTE} answered ${response.statusCode}.`);
  }
  response.setEncoding('utf8');
  response.on('data', (chunk: string) => {
    buffer += chunk;
    for (
      let end = buffer.indexOf('\n\n');
      end !== -1;
      end = buffer.indexOf('\n\n')
    ) {
      const block = buffer.slice(0, end);
      buffer = buffer.slice(end + 2);
      if (block.split('\n').some((line) => line.startsWith('data: '))) {
        blocks.push(block);
      }
    }
  });
  response.on('end', () => {
    if (!closing) failure ??= new Error(`The ${EVENTS_ROUTE} stream ended.`);
  });
  // The first block is the observer's own hello, written by the publisher when the stream opens.
  const hello = await waitForBlock(blocks);
  const key = eventKey(hello);
  if (key?.module !== 'platform' || key.type !== 'hello') {
    request.destroy();
    throw new Error(
      `The first block of ${EVENTS_ROUTE} was not platform/hello.`,
    );
  }
  return {
    take: async (waitMs) => {
      await sleep(waitMs);
      if (failure !== undefined) throw failure;
      return blocks.splice(0);
    },
    close: async () => {
      closing = true;
      request.destroy();
    },
  };
}

// Waits for the first block to arrive, then removes it from the list and returns it.
async function waitForBlock(blocks: string[]): Promise<string> {
  for (let waited = 0; waited < 5000; waited += 10) {
    const [first] = blocks.splice(0, 1);
    if (first !== undefined) return first;
    await sleep(10);
  }
  throw new Error('No hello block arrived within 5000 ms.');
}

// The handshake path with the token from setup-url, as the browser sends it.
function handshakeTarget(library: string): string {
  const url = new URL(
    readFileSync(join(library, '.scriba', 'setup-url'), 'utf8').trim(),
  );
  return `${url.pathname}${url.search}`;
}

// One request of sweepGetHead. `entry` is the request's one violation, if it has one.
interface Planned {
  method: 'GET' | 'HEAD';
  template: string; // the route template, which names the violation
  path: string; // the concrete path, with no query
  target: string; // the path as sent, with its query
  entry?: Violation;
}

// GET and then HEAD to every enumerated path, in route order, then the handshake once more with its token.
function planGetHead(routes: RouteEntry[], library: string): Planned[] {
  const planned: Planned[] = [];
  for (const template of new Set(routes.map((route) => route.path))) {
    const path = concretePath(template);
    planned.push({ method: 'GET', template, path, target: path });
    planned.push({ method: 'HEAD', template, path, target: path });
  }
  planned.push({
    method: 'GET',
    template: HANDSHAKE_ROUTE,
    path: HANDSHAKE_ROUTE,
    target: handshakeTarget(library),
  });
  return planned;
}

// Test 1's verdict. Each request is sent with the cookie, until its headers arrive (or the cap).
// Attribution, in order: (2a) blocks drained before a request belong to the previous request, or to this one
// before any request; (2b) a request on the same path as the previous one, when that one has an entry, is not sent;
// (2c) a request is sent, the observer collects for EVENT_WAIT_MS, then the library is snapshotted; (2d) the
// request gets at most one entry: an event if any was collected, otherwise a library change.
// Step 3, after the last request: late blocks belong to the previous request; a change between the last snapshot
// and the current one is attributed; and a first-to-last change adds an entry only when the list is still empty.
export async function sweepGetHead(
  app: TestApp,
  cookie: string,
  library: string,
  observer: Observer,
): Promise<Violation[]> {
  const planned = planGetHead(app.routes(), library);
  const violations: Violation[] = [];
  const attribute = (request: Planned, kind: Violation['kind']): void => {
    if (request.entry !== undefined) return;
    request.entry = { kind, method: request.method, path: request.template };
    violations.push(request.entry);
  };
  const first = snapshotLibrary(library);
  let current = first;
  let previous: Planned | undefined;
  for (const request of planned) {
    // (2a)
    if (eventBlocks(await observer.take(0)).length > 0) {
      attribute(previous ?? request, 'event-emitted');
    }
    // (2b)
    if (
      previous !== undefined &&
      previous.template === request.template &&
      previous.entry !== undefined
    ) {
      continue;
    }
    // (2c)
    await sendRequest(app.baseUrl, {
      host: LOOPBACK_HOST,
      path: request.target,
      method: request.method,
      cookie,
      until: 'headers',
    });
    const events = eventBlocks(await observer.take(EVENT_WAIT_MS));
    const after = snapshotLibrary(library);
    // (2d)
    if (events.length > 0) attribute(request, 'event-emitted');
    else if (differs(current, after)) attribute(request, 'library-changed');
    current = after;
    previous = request;
  }
  // Step 3
  if (
    eventBlocks(await observer.take(0)).length > 0 &&
    previous !== undefined
  ) {
    attribute(previous, 'event-emitted');
  }
  const last = snapshotLibrary(library);
  if (previous !== undefined) {
    if (differs(current, last)) attribute(previous, 'library-changed');
    if (differs(first, last) && violations.length === 0) {
      attribute(previous, 'library-changed');
    }
  }
  return violations;
}

const isSafe = (method: string): boolean => SAFE_METHODS.includes(method);

// The methods a route answers to. A route registered with `all` (method ALL) is sent POST, PUT, PATCH and DELETE.
function expandRoutes(routes: RouteEntry[]): RouteEntry[] {
  return routes.flatMap((route) =>
    route.method === 'ALL'
      ? ALL_METHODS.map((method) => ({ method, path: route.path }))
      : [route],
  );
}

function isFixed(route: RouteEntry): boolean {
  return FIXED_PUBLIC_ROUTES.some(
    (fixed) => fixed.method === route.method && fixed.path === route.path,
  );
}

// The error of a refusal in Platform's base shape: one top-level key, error. Undefined for any other shape.
function baseError(
  body: string,
): { code?: unknown; message?: unknown } | undefined {
  try {
    const parsed: unknown = JSON.parse(body);
    if (typeof parsed !== 'object' || parsed === null) return undefined;
    if (Object.keys(parsed).join(',') !== 'error') return undefined;
    const { error } = parsed as { error?: unknown };
    return typeof error === 'object' && error !== null ? error : undefined;
  } catch {
    return undefined;
  }
}

function errorCodeOf(body: string): unknown {
  try {
    const parsed: unknown = JSON.parse(body);
    if (typeof parsed !== 'object' || parsed === null) return undefined;
    const { error } = parsed as { error?: unknown };
    if (typeof error !== 'object' || error === null) return undefined;
    return (error as { code?: unknown }).code;
  } catch {
    return undefined;
  }
}

// 401 AUTH_REQUIRED in the base shape, from any handler (the guard's own or the identity route's).
function isAuthRequired(result: SendResult): boolean {
  const error = baseError(result.body);
  return (
    result.status === 401 &&
    String(result.headers['content-type'] ?? '').startsWith(
      'application/json',
    ) &&
    error?.code === 'AUTH_REQUIRED' &&
    typeof error.message === 'string' &&
    error.message.length > 0
  );
}

// Whether a fixed route answers as its fixed behaviour says.
function answersFixed(template: string, result: SendResult): boolean {
  switch (template) {
    case HEALTHZ_ROUTE:
    case SPA_FALLBACK_TEMPLATE:
      return result.status === 200;
    case HANDSHAKE_ROUTE:
      return (
        result.status === 401 &&
        result.headers['content-type'] === 'text/html; charset=utf-8' &&
        !result.body.includes('AUTH_REQUIRED')
      );
    case IDENTITY_ROUTE:
      return isAuthRequired(result);
    default:
      return false;
  }
}

// Test 2's verdict. Every enumerated route, with each of its methods, is sent these checks, each with `until: 'end'`:
// (a) no-credential-401, for a route not on the fixed list (no cookie, Origin set): 401 AUTH_REQUIRED.
// (b) origin-missing-403, for a mutation with the cookie and no Origin: 403 AUTH_ORIGIN_REJECTED.
// (c) origin-foreign-403, for a mutation with the cookie and a foreign Origin: 403 AUTH_ORIGIN_REJECTED.
// (d) host-foreign-403, for a mutation with the cookie and each foreign Host: 403 AUTH_HOST_REJECTED, and the
//     frame policy header. One entry per route, for the first Host that fails.
// (e) and (f) fixed-route-answer, for each fixed route, and fixed-route-missing when the router does not hold it.
export async function sweepMutations(
  app: TestApp,
  cookie: string,
): Promise<Violation[]> {
  const violations: Violation[] = [];
  const add = (kind: Violation['kind'], method: string, path: string): void => {
    violations.push({ kind, method, path });
  };
  const routes = app.routes();
  for (const route of expandRoutes(routes)) {
    const path = concretePath(route.path);
    const mutation = !isSafe(route.method);
    const body = mutation ? ECHO_BODY : undefined;
    const send = (options: Partial<SendOptions>): Promise<SendResult> =>
      sendRequest(app.baseUrl, {
        host: LOOPBACK_HOST,
        path,
        method: route.method,
        body,
        until: 'end',
        ...options,
      });
    if (!isFixed(route)) {
      const result = await send({ origin: LOOPBACK_ORIGIN });
      if (!isAuthRequired(result))
        add('no-credential-401', route.method, route.path);
    }
    if (!mutation) continue;
    const missingOrigin = await send({ cookie });
    if (!refused(missingOrigin, 403, 'AUTH_ORIGIN_REJECTED')) {
      add('origin-missing-403', route.method, route.path);
    }
    const foreignOrigin = await send({ cookie, origin: FOREIGN_ORIGIN });
    if (!refused(foreignOrigin, 403, 'AUTH_ORIGIN_REJECTED')) {
      add('origin-foreign-403', route.method, route.path);
    }
    let hostOk = true;
    for (const host of FOREIGN_HOSTS) {
      if (!hostOk) break;
      const result = await send({ host, cookie, origin: LOOPBACK_ORIGIN });
      hostOk =
        refused(result, 403, 'AUTH_HOST_REJECTED') &&
        result.headers['content-security-policy'] === FRAME_POLICY;
    }
    if (!hostOk) add('host-foreign-403', route.method, route.path);
  }
  for (const fixed of FIXED_PUBLIC_ROUTES) {
    if (
      !routes.some(
        (route) => route.method === fixed.method && route.path === fixed.path,
      )
    ) {
      add('fixed-route-missing', fixed.method, fixed.path);
      continue;
    }
    const result = await sendRequest(app.baseUrl, {
      host: LOOPBACK_HOST,
      path: concretePath(fixed.path),
      method: fixed.method,
      until: 'end',
    });
    if (!answersFixed(fixed.path, result)) {
      add('fixed-route-answer', fixed.method, fixed.path);
    }
  }
  return violations;
}

function refused(result: SendResult, status: number, code: string): boolean {
  return result.status === status && errorCodeOf(result.body) === code;
}
