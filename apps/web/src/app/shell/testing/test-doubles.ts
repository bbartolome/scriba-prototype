import { HttpBackend } from '@angular/common/http';
import { signal, type Provider } from '@angular/core';
import type {
  PublishingModuleSlug,
  SseEnvelope,
} from '@bbartolome/scriba-contracts/platform';
import { defer, filter, map, Observable, of, Subject, throwError } from 'rxjs';
import {
  parseResponse,
  type ApiClient,
  type ApiPath,
  type ResponseSchema,
} from '../api-client';
import type { ApiError } from '../api-error';
import type {
  ConnectionState,
  ReconcileReason,
  SseClient,
} from '../sse-client';
import { isPlatformEnvelope } from '../sse-envelope';
import { API_CLIENT, SSE_CLIENT } from '../tokens';

/** One request that reached the fake API client. `params` and `body` appear only when given. */
export interface RecordedRequest {
  method: 'GET' | 'POST';
  path: string;
  params?: Record<string, string>;
  body?: unknown;
}

type Canned =
  { kind: 'body'; body: unknown } | { kind: 'error'; error: ApiError };

function routeKey(method: 'GET' | 'POST', path: string): string {
  return `${method} ${path}`;
}

/**
 * A fake of the typed API client, with the same interface as HttpApiClient. Tests register a
 * canned 2xx body or a typed error per method and path. A canned body goes through the same
 * parseResponse as the real client, so a mismatch fails the same way.
 */
export class FakeApiClient implements ApiClient {
  /** Every request that reached the client, in subscription order. */
  readonly requests: RecordedRequest[] = [];
  private readonly canned = new Map<string, Canned>();

  /** Registers a 2xx body for a method and path. A later registration replaces the earlier one. */
  respond(method: 'GET' | 'POST', path: ApiPath, body: unknown): void {
    this.canned.set(routeKey(method, path), { kind: 'body', body });
  }

  /** Registers a typed error for a method and path. */
  fail(method: 'GET' | 'POST', path: ApiPath, error: ApiError): void {
    this.canned.set(routeKey(method, path), { kind: 'error', error });
  }

  get<T>(
    path: ApiPath,
    schema: ResponseSchema<T>,
    params?: Record<string, string>,
  ): Observable<T> {
    return defer(() => {
      this.requests.push(
        params === undefined
          ? { method: 'GET', path }
          : { method: 'GET', path, params },
      );
      return this.answer('GET', path, schema);
    });
  }

  post<T>(
    path: ApiPath,
    body: unknown,
    schema: ResponseSchema<T>,
  ): Observable<T> {
    return defer(() => {
      this.requests.push({ method: 'POST', path, body });
      return this.answer('POST', path, schema);
    });
  }

  private answer<T>(
    method: 'GET' | 'POST',
    path: ApiPath,
    schema: ResponseSchema<T>,
  ): Observable<T> {
    const canned = this.canned.get(routeKey(method, path));
    if (canned === undefined) {
      return throwError(
        () => new Error(`No canned response for ${method} ${path}.`),
      );
    }
    if (canned.kind === 'error') {
      const error = canned.error;
      return throwError(() => error);
    }
    return of(canned.body).pipe(
      map((body) => parseResponse(path, schema, body)),
    );
  }
}

/**
 * A fake of the SSE client's public surface: the per-module streams, the connection state, the
 * server reachability and the reconcile ticks. The tests push envelopes and simulate a drop, a
 * re-open and the visibility events that fire ticks. It starts open and reachable.
 */
export class FakeEventSource implements Pick<
  SseClient,
  'stream' | 'connectionState' | 'serverReachable' | 'reconcile$'
> {
  private readonly state = signal<ConnectionState>('open');
  private readonly reachable = signal(true);
  private readonly envelopes = new Subject<SseEnvelope>();
  private readonly ticks = new Subject<ReconcileReason>();

  readonly connectionState = this.state.asReadonly();
  readonly serverReachable = this.reachable.asReadonly();
  readonly reconcile$: Observable<ReconcileReason> = this.ticks.asObservable();

  /** Envelopes of one module, in push order. Hot, with no replay. */
  stream(slug: PublishingModuleSlug): Observable<SseEnvelope> {
    return this.envelopes.pipe(filter((envelope) => envelope.module === slug));
  }

  /** Delivers an envelope to its module's stream. A value the real client would drop is refused. */
  push(envelope: SseEnvelope): void {
    if (!isPlatformEnvelope(envelope)) {
      throw new TypeError('Not a Platform envelope.');
    }
    this.envelopes.next(envelope);
  }

  /** Sets the connection state. No tick is emitted. */
  setConnectionState(state: ConnectionState): void {
    this.state.set(state);
  }

  /** Sets whether the server is reachable. No tick is emitted. */
  setServerReachable(reachable: boolean): void {
    this.reachable.set(reachable);
  }

  /** Simulates a dropped stream. No tick is emitted. */
  drop(state: ConnectionState = 'reconnecting'): void {
    this.state.set(state);
  }

  /** Simulates the stream opening again: open, reachable, and a `reopen` tick. */
  reopen(): void {
    this.state.set('open');
    this.reachable.set(true);
    this.ticks.next('reopen');
  }

  /** Emits a reconcile tick for any reason, as a visibility or online event would. */
  tick(reason: ReconcileReason): void {
    this.ticks.next(reason);
  }
}

/** The fakes, and the providers that swap them in for a rendered route. */
export interface ShellTestDoubles {
  api: FakeApiClient;
  events: FakeEventSource;
  providers: Provider[];
}

// Errors any HTTP request made while the helper is in use, so a request that bypasses API_CLIENT
// fails loudly and never reaches the network.
const throwingBackend: HttpBackend = {
  handle: () =>
    throwError(
      () =>
        new Error(
          'Real HTTP is off in Shell tests; inject the fake API client.',
        ),
    ),
};

/**
 * Creates the fakes and the providers for a rendered route: API_CLIENT and SSE_CLIENT are
 * replaced, and HttpBackend throws. The guard covers only tests that use this helper.
 */
export function createShellTestDoubles(): ShellTestDoubles {
  const api = new FakeApiClient();
  const events = new FakeEventSource();
  return {
    api,
    events,
    providers: [
      { provide: API_CLIENT, useValue: api },
      { provide: SSE_CLIENT, useValue: events },
      { provide: HttpBackend, useValue: throwingBackend },
    ],
  };
}
