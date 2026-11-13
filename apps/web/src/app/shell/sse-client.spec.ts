import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  MockInstance,
  vi,
} from 'vitest';
import { HEALTHZ_PATH } from './sse-envelope';
import {
  type ConnectionState,
  type ReconcileReason,
  SETUP_STATUS_ROUTE,
  SseClient,
} from './sse-client';
import { SSE_CLIENT } from './tokens';

/** Reply of the stubbed fetch: an HTTP status, or a network failure. */
type Reply = number | 'network';

let sources: FakeEventSource[];
let log: string[];
let replies: Partial<Record<string, Reply>>;
let healthzAt: number[];
let startedAt: number;
let debug: MockInstance<typeof console.debug>;

class FakeEventSource {
  readyState = 0;
  readonly url: string;
  readonly createdAt: number;
  onopen: ((event: Event) => void) | null = null;
  onmessage: ((event: MessageEvent<string>) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;

  constructor(url: string) {
    this.url = url;
    this.createdAt = Date.now() - startedAt;
    sources.push(this);
    log.push(`EventSource ${url}`);
  }

  close(): void {
    this.readyState = 2;
  }

  emitOpen(): void {
    this.readyState = 1;
    this.onopen?.(new Event('open'));
  }

  emitMessage(data: string): void {
    this.onmessage?.({ data } as MessageEvent<string>);
  }

  emitError(readyState: 0 | 2): void {
    this.readyState = readyState;
    this.onerror?.(new Event('error'));
  }
}

const fetchStub = vi.fn(async (path: string): Promise<Response> => {
  log.push(path);
  if (path === HEALTHZ_PATH) {
    healthzAt.push(Date.now() - startedAt);
  }
  const reply = replies[path] ?? 200;
  if (reply === 'network') {
    throw new TypeError('Failed to fetch');
  }
  return { ok: reply >= 200 && reply < 300, status: reply } as Response;
});

function setup(): SseClient {
  TestBed.configureTestingModule({
    providers: [
      provideRouter([]),
      { provide: SSE_CLIENT, useClass: SseClient },
    ],
  });
  const client = TestBed.inject(SSE_CLIENT);
  client.start();
  return client;
}

function latest(): FakeEventSource {
  return sources[sources.length - 1];
}

/** Fake clock for the backoff tests; the start time is read after the clock is installed. */
function useFakeClock(): void {
  vi.useFakeTimers();
  startedAt = Date.now();
}

function setVisibility(state: DocumentVisibilityState): void {
  Object.defineProperty(document, 'visibilityState', {
    configurable: true,
    value: state,
  });
}

function collectTicks(client: SseClient): ReconcileReason[] {
  const reasons: ReconcileReason[] = [];
  client.reconcile$.subscribe((reason) => reasons.push(reason));
  return reasons;
}

/** Lets the probes' awaited fetch calls settle, on real timers. */
const flush = (): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, 0));

describe('SseClient', () => {
  beforeEach(() => {
    sources = [];
    log = [];
    replies = {};
    healthzAt = [];
    startedAt = Date.now();
    debug = vi.spyOn(console, 'debug').mockImplementation(() => undefined);
    vi.stubGlobal('EventSource', FakeEventSource);
    vi.stubGlobal('fetch', fetchStub);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
    vi.restoreAllMocks();
    Reflect.deleteProperty(document, 'visibilityState');
  });

  describe('envelope demultiplexing', () => {
    it("delivers an envelope only to its own module's stream", () => {
      const client = setup();
      const agentLoop: unknown[] = [];
      const projectStore: unknown[] = [];
      client.stream('agent-loop').subscribe((e) => agentLoop.push(e));
      client.stream('project-store').subscribe((e) => projectStore.push(e));

      latest().emitMessage(
        JSON.stringify({ module: 'agent-loop', type: 'node-status', data: {} }),
      );

      expect(agentLoop).toHaveLength(1);
      expect(projectStore).toHaveLength(0);
    });

    it('ignores an unknown module and malformed JSON without error', () => {
      const client = setup();
      const seen = vi.fn();
      client.stream('agent-loop').subscribe(seen);
      client.stream('platform').subscribe(seen);

      latest().emitMessage(
        JSON.stringify({ module: 'not-a-module', type: 'x', data: {} }),
      );
      latest().emitMessage('{');

      expect(seen).not.toHaveBeenCalled();
      expect(debug).toHaveBeenCalledTimes(2);
      for (const [message] of debug.mock.calls) {
        expect(String(message).startsWith('[sse]')).toBe(true);
      }
    });

    it('ignores an unknown platform type and passes an unknown feature type through', () => {
      const client = setup();
      const platform = vi.fn();
      const agentLoop = vi.fn();
      client.stream('platform').subscribe(platform);
      client.stream('agent-loop').subscribe(agentLoop);

      latest().emitMessage(
        JSON.stringify({ module: 'platform', type: 'future-thing', data: {} }),
      );
      expect(platform).not.toHaveBeenCalled();
      expect(debug).toHaveBeenCalledTimes(1);

      latest().emitMessage(
        JSON.stringify({
          module: 'agent-loop',
          type: 'future-thing',
          data: {},
        }),
      );
      expect(agentLoop).toHaveBeenCalledTimes(1);
    });
  });

  describe('reconcile ticks', () => {
    it('ticks once on a re-open after a drop, and not on the first open', () => {
      const client = setup();
      const reasons = collectTicks(client);

      latest().emitOpen();
      expect(reasons).toEqual([]);

      latest().emitError(0);
      latest().emitOpen();

      expect(reasons).toEqual(['reopen']);
    });

    it('ticks once on visibilitychange to visible, and not when hidden', () => {
      const client = setup();
      const reasons = collectTicks(client);

      setVisibility('visible');
      document.dispatchEvent(new Event('visibilitychange'));
      expect(reasons).toEqual(['visible']);

      setVisibility('hidden');
      document.dispatchEvent(new Event('visibilitychange'));
      expect(reasons).toEqual(['visible']);
    });

    it('ticks once on online', () => {
      const client = setup();
      const reasons = collectTicks(client);

      window.dispatchEvent(new Event('online'));

      expect(reasons).toEqual(['online']);
    });

    it('ticks once on pageshow from the back/forward cache only', () => {
      const client = setup();
      const reasons = collectTicks(client);

      window.dispatchEvent(
        Object.assign(new Event('pageshow'), { persisted: true }),
      );
      expect(reasons).toEqual(['pageshow']);

      window.dispatchEvent(
        Object.assign(new Event('pageshow'), { persisted: false }),
      );
      expect(reasons).toEqual(['pageshow']);
    });
  });

  describe('recovery after CLOSED', () => {
    it('retries /healthz at 1, 3, 7, 15, 31, 61 and 91 s while it fails, and creates no stream', async () => {
      useFakeClock();
      replies[HEALTHZ_PATH] = 'network';
      const client = setup();

      latest().emitError(2);
      await vi.advanceTimersByTimeAsync(91_000);

      expect(healthzAt).toEqual([1000, 3000, 7000, 15000, 31000, 61000, 91000]);
      expect(sources).toHaveLength(1);
      expect(client.connectionState()).toBe('closed');
    });

    it('creates a new stream after /healthz and the status probe pass', async () => {
      useFakeClock();
      const client = setup();

      latest().emitError(2);
      log.length = 0;
      await vi.advanceTimersByTimeAsync(1000);

      expect(log).toEqual([
        HEALTHZ_PATH,
        SETUP_STATUS_ROUTE,
        'EventSource /events',
      ]);
      expect(sources).toHaveLength(2);
      expect(sources[1].createdAt).toBe(1000);
      expect(client.connectionState()).toBe('reconnecting');

      // The second stream never opens, so the recovery counts as failed: the next wait is 2 s.
      sources[1].emitError(2);
      await vi.advanceTimersByTimeAsync(2000);

      expect(sources).toHaveLength(3);
      expect(sources[2].createdAt).toBe(3000);
    });

    it('routes a 401 from the status probe to /setup and keeps retrying', async () => {
      useFakeClock();
      replies[SETUP_STATUS_ROUTE] = 401;
      const client = setup();
      const navigate = vi
        .spyOn(TestBed.inject(Router), 'navigateByUrl')
        .mockRejectedValue(new Error('NG04002'));

      latest().emitError(2);
      await vi.advanceTimersByTimeAsync(1000);
      await vi.advanceTimersByTimeAsync(0);

      expect(navigate).toHaveBeenCalledTimes(1);
      expect(navigate).toHaveBeenCalledWith('/setup');
      expect(sources).toHaveLength(1);
      expect(debug).toHaveBeenCalledWith(
        '[sse] /setup navigation failed',
        new Error('NG04002'),
      );

      replies[SETUP_STATUS_ROUTE] = 200;
      await vi.advanceTimersByTimeAsync(2000);

      expect(sources).toHaveLength(2);
      expect(sources[1].createdAt).toBe(3000);
      expect(navigate).toHaveBeenCalledTimes(1);
      expect(client.connectionState()).toBe('reconnecting');
    });
  });

  describe('connection state', () => {
    it('walks connecting, open, reconnecting, open, closed, reconnecting, open', async () => {
      useFakeClock();
      const client = setup();
      const seen: ConnectionState[] = [client.connectionState()];
      const record = (): void => {
        seen.push(client.connectionState());
      };

      client.start();
      const first = latest();
      first.emitOpen();
      record();
      first.emitError(0);
      record();
      first.emitOpen();
      record();
      first.emitError(2);
      record();
      await vi.advanceTimersByTimeAsync(1000);
      record();
      latest().emitOpen();
      record();

      expect(seen).toEqual([
        'connecting',
        'open',
        'reconnecting',
        'open',
        'closed',
        'reconnecting',
        'open',
      ]);
      expect(sources).toHaveLength(2);
    });

    it('serverReachable falls when /healthz fails and returns when a stream opens', async () => {
      replies[HEALTHZ_PATH] = 'network';
      const client = setup();
      const source = latest();

      source.emitError(0);
      await flush();
      expect(client.serverReachable()).toBe(false);

      source.emitOpen();
      expect(client.serverReachable()).toBe(true);
    });
  });
});
