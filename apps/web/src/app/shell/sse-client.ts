import { DestroyRef, inject, Injectable, signal } from '@angular/core';
import { Router } from '@angular/router';
import type {
  PublishingModuleSlug,
  SseEnvelope,
} from '@bbartolome/scriba-contracts/platform';
import { filter, Observable, Subject } from 'rxjs';
import { EVENTS_PATH, HEALTHZ_PATH, isPlatformEnvelope } from './sse-envelope';

/** Connection state of the one stream. */
export type ConnectionState = 'connecting' | 'open' | 'reconnecting' | 'closed';

/** Why a reconcile tick fired. Features re-fetch their current run state on each tick. */
export type ReconcileReason = 'reopen' | 'visible' | 'online' | 'pageshow';

/** First wait after a CLOSED stream, in ms. The wait doubles after each failed recovery. */
export const SSE_BACKOFF_BASE_MS = 1000;

/** Longest wait between recovery attempts, in ms. */
export const SSE_BACKOFF_MAX_MS = 30000;

/** The setup-status route the recovery probes; a 401 routes to /setup. */
export const SETUP_STATUS_ROUTE = '/api/setup-auth/status';

/** Platform's member types, checked by name only. */
const PLATFORM_TYPES: ReadonlySet<string> = new Set(['hello', 'echo']);

// EventSource readyState values (WHATWG).
const READY_CONNECTING = 0;
const READY_CLOSED = 2;

/**
 * The one EventSource of the tab. Envelopes are checked and demultiplexed by `module`; the
 * connection state and the reachability of the server are signals; reconcile ticks tell features
 * to re-fetch.
 */
@Injectable()
export class SseClient {
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly state = signal<ConnectionState>('connecting');
  private readonly reachable = signal(true);
  private readonly envelopes = new Subject<SseEnvelope>();
  private readonly ticks = new Subject<ReconcileReason>();
  private source: EventSource | null = null;
  private timer: ReturnType<typeof setTimeout> | undefined;
  private started = false;
  private destroyed = false;
  private hasOpened = false;
  private failures = 0;

  /** Connection state: connecting, open, reconnecting or closed. */
  readonly connectionState = this.state.asReadonly();

  /** False while a /healthz probe fails; true again when a probe succeeds or the stream opens. */
  readonly serverReachable = this.reachable.asReadonly();

  /** Hot, with no replay. One tick per event that calls for a re-fetch. */
  readonly reconcile$: Observable<ReconcileReason> = this.ticks.asObservable();

  private readonly onVisibilityChange = (): void => {
    if (document.visibilityState === 'visible') {
      this.tick('visible');
    }
  };

  private readonly onOnline = (): void => {
    this.tick('online');
  };

  private readonly onPageshow = (event: PageTransitionEvent): void => {
    if (event.persisted) {
      this.tick('pageshow');
    }
  };

  /** Envelopes of one module, in arrival order. */
  stream(slug: PublishingModuleSlug): Observable<SseEnvelope> {
    return this.envelopes.pipe(filter((envelope) => envelope.module === slug));
  }

  /** Opens the one stream and its listeners. A second call does nothing. */
  start(): void {
    if (this.started || this.destroyed) {
      return;
    }
    this.started = true;
    this.destroyRef.onDestroy(() => this.dispose());
    document.addEventListener('visibilitychange', this.onVisibilityChange);
    window.addEventListener('online', this.onOnline);
    window.addEventListener('pageshow', this.onPageshow);
    this.connect('connecting');
  }

  private connect(next: 'connecting' | 'reconnecting'): void {
    const source = new globalThis.EventSource(EVENTS_PATH);
    this.source = source;
    this.state.set(next);
    source.onopen = () => {
      if (source === this.source) {
        this.handleOpen();
      }
    };
    source.onmessage = (event: MessageEvent<string>) => {
      if (source === this.source) {
        this.handleMessage(event.data);
      }
    };
    source.onerror = () => {
      if (source === this.source) {
        this.handleError(source);
      }
    };
  }

  private handleOpen(): void {
    const reopened = this.hasOpened;
    this.hasOpened = true;
    this.failures = 0;
    this.state.set('open');
    this.reachable.set(true);
    if (reopened) {
      this.tick('reopen');
    }
  }

  private handleMessage(raw: string): void {
    let value: unknown;
    try {
      value = JSON.parse(raw);
    } catch {
      console.debug('[sse] ignored envelope', 'malformed JSON');
      return;
    }
    if (!isPlatformEnvelope(value)) {
      console.debug('[sse] ignored envelope', 'not a valid envelope');
      return;
    }
    if (value.module === 'platform' && !PLATFORM_TYPES.has(value.type)) {
      console.debug(
        '[sse] ignored envelope',
        `unknown platform type ${value.type}`,
      );
      return;
    }
    this.envelopes.next(value);
  }

  private handleError(source: EventSource): void {
    if (source.readyState === READY_CLOSED) {
      this.source = null;
      this.state.set('closed');
      this.scheduleRecovery();
      return;
    }
    // The browser retries a network drop by itself (readyState CONNECTING).
    this.state.set('reconnecting');
    if (source.readyState === READY_CONNECTING) {
      void this.checkReachable();
    }
  }

  private async checkReachable(): Promise<void> {
    const response = await this.probe(HEALTHZ_PATH);
    if (!this.destroyed && this.state() !== 'open') {
      this.reachable.set(response?.ok === true);
    }
  }

  private scheduleRecovery(): void {
    const delay = Math.min(
      SSE_BACKOFF_BASE_MS * 2 ** this.failures,
      SSE_BACKOFF_MAX_MS,
    );
    this.timer = setTimeout(() => {
      this.timer = undefined;
      void this.recover();
    }, delay);
  }

  private async recover(): Promise<void> {
    const health = await this.probe(HEALTHZ_PATH);
    if (this.destroyed) {
      return;
    }
    this.reachable.set(health?.ok === true);
    if (health?.ok !== true) {
      this.recoveryFailed();
      return;
    }
    const status = await this.probe(SETUP_STATUS_ROUTE);
    if (this.destroyed) {
      return;
    }
    if (status === null) {
      this.recoveryFailed();
      return;
    }
    if (status.status === 401) {
      this.navigateToSetup();
      this.recoveryFailed();
      return;
    }
    // Counted as failed until the new stream opens; handleOpen resets the count.
    this.failures += 1;
    this.connect('reconnecting');
  }

  private recoveryFailed(): void {
    this.failures += 1;
    this.scheduleRecovery();
  }

  private navigateToSetup(): void {
    void this.router.navigateByUrl('/setup').catch((error: unknown) => {
      console.debug('[sse] /setup navigation failed', error);
    });
  }

  /** A GET probe with no cache; null when the request fails at the network level. */
  private async probe(path: string): Promise<Response | null> {
    try {
      return await globalThis.fetch(path, { cache: 'no-store' });
    } catch {
      return null;
    }
  }

  private tick(reason: ReconcileReason): void {
    console.debug('[sse] tick', reason);
    this.ticks.next(reason);
  }

  private dispose(): void {
    this.destroyed = true;
    this.source?.close();
    this.source = null;
    clearTimeout(this.timer);
    this.timer = undefined;
    document.removeEventListener('visibilitychange', this.onVisibilityChange);
    window.removeEventListener('online', this.onOnline);
    window.removeEventListener('pageshow', this.onPageshow);
  }
}
