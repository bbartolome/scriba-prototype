import { ComponentFixture, TestBed } from '@angular/core/testing';
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  Mock,
  MockInstance,
  vi,
} from 'vitest';
import { App } from '../app';
import {
  type ReconcileReason,
  SETUP_STATUS_ROUTE,
  SseClient,
} from './sse-client';
import { HEALTHZ_PATH } from './sse-envelope';
import { SSE_CLIENT } from './tokens';

/** A reply of the stubbed fetch: an HTTP status, or a network failure. */
type Reply = number | 'network';

let sources: FakeEventSource[];
let replies: Partial<Record<string, Promise<Reply> | Reply>>;
let fetchStub: Mock<(path: string) => Promise<Response>>;
let debug: MockInstance<typeof console.debug>;

/** The one EventSource of the tab, as the browser exposes it to the client. */
class FakeEventSource {
  readyState = 0;
  onopen: ((event: Event) => void) | null = null;
  onmessage: ((event: MessageEvent<string>) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;

  constructor() {
    sources.push(this);
  }

  close(): void {
    this.readyState = 2;
  }

  emitOpen(): void {
    this.readyState = 1;
    this.onopen?.(new Event('open'));
  }

  emitError(readyState: 0 | 2): void {
    this.readyState = readyState;
    this.onerror?.(new Event('error'));
  }
}

/** Renders the whole App with the SSE client provided. The client is not started. */
async function render(): Promise<{
  client: SseClient;
  fixture: ComponentFixture<App>;
}> {
  await TestBed.configureTestingModule({
    imports: [App],
    providers: [{ provide: SSE_CLIENT, useClass: SseClient }],
  }).compileComponents();
  const fixture = TestBed.createComponent(App);
  fixture.detectChanges();
  await fixture.whenStable();
  return { client: TestBed.inject(SSE_CLIENT), fixture };
}

function latest(): FakeEventSource {
  return sources[sources.length - 1];
}

function root(fixture: ComponentFixture<App>): HTMLElement {
  return fixture.nativeElement as HTMLElement;
}

/** The connection indicator's status element, or null when it is hidden. */
function indicator(fixture: ComponentFixture<App>): HTMLElement | null {
  return root(fixture).querySelector<HTMLElement>(
    'app-connection-status [data-state]',
  );
}

/** The text of the app-wide banner area. */
function bannerText(fixture: ComponentFixture<App>): string {
  return root(fixture).querySelector('app-notice-banners')?.textContent ?? '';
}

/** The paths the stubbed fetch has been called with, in order. */
function probedPaths(): string[] {
  return fetchStub.mock.calls.map(([path]) => path);
}

function collectTicks(client: SseClient): ReconcileReason[] {
  const reasons: ReconcileReason[] = [];
  client.reconcile$.subscribe((reason) => reasons.push(reason));
  return reasons;
}

/** A fetch reply that the test settles when it chooses. */
function deferredReply(): {
  reply: Promise<Reply>;
  settle: (reply: Reply) => void;
} {
  let settle: (reply: Reply) => void = () => undefined;
  const reply = new Promise<Reply>((resolve) => {
    settle = resolve;
  });
  return { reply, settle };
}

/** Lets the probe's awaited fetch settle, one macrotask later. */
const settleMacrotask = (): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, 0));

beforeEach(() => {
  sources = [];
  replies = {};
  debug = vi.spyOn(console, 'debug').mockImplementation(() => undefined);
  vi.stubGlobal('EventSource', FakeEventSource);
  fetchStub = vi.fn(async (path: string): Promise<Response> => {
    const reply = await (replies[path] ?? 200);
    if (reply === 'network') {
      throw new TypeError('Failed to fetch');
    }
    return { ok: reply >= 200 && reply < 300, status: reply } as Response;
  });
  vi.stubGlobal('fetch', fetchStub);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('connection status', () => {
  it('stopping the API shows Reconnecting, then the banner; restarting clears both and fires one reconcile tick', async () => {
    const { client, fixture } = await render();
    const ticks = collectTicks(client);
    client.start();

    // (a) the first open shows nothing and does not tick
    latest().emitOpen();
    fixture.detectChanges();
    expect(sources).toHaveLength(1);
    expect(indicator(fixture)).toBeNull();
    expect(bannerText(fixture)).not.toContain('Server unreachable');
    expect(ticks).toEqual([]);

    // (b) the stream fails; the probe is still pending, so no banner yet
    const probe = deferredReply();
    replies[HEALTHZ_PATH] = probe.reply;
    latest().emitError(0);
    fixture.detectChanges();
    expect(indicator(fixture)?.getAttribute('data-state')).toBe('reconnecting');
    expect(indicator(fixture)?.textContent?.trim()).toBe('Reconnecting');
    expect(bannerText(fixture)).not.toContain('Server unreachable');

    // (c) the probe fails at the network level: the banner appears, the label stays
    probe.settle('network');
    await vi.waitFor(
      () => {
        fixture.detectChanges();
        expect(bannerText(fixture)).toContain('Server unreachable');
      },
      { timeout: 5000 },
    );
    expect(indicator(fixture)?.getAttribute('data-state')).toBe('reconnecting');
    expect(root(fixture).querySelector('h1')?.textContent).toContain('Scriba');

    // (d) the native retry opens the same stream: label and banner clear, one reopen tick
    latest().emitOpen();
    await vi.waitFor(
      () => {
        fixture.detectChanges();
        expect(indicator(fixture)).toBeNull();
        expect(bannerText(fixture)).not.toContain('Server unreachable');
      },
      { timeout: 5000 },
    );
    expect(sources).toHaveLength(1);
    expect(ticks).toEqual(['reopen']);
    expect(debug).toHaveBeenCalledWith('[sse] tick', 'reopen');
  }, 15000);

  it('connecting and open show neither the indicator nor the banner', async () => {
    const { client, fixture } = await render();
    client.start();
    fixture.detectChanges();
    expect(root(fixture).querySelector('app-connection-status')).not.toBeNull();
    expect(root(fixture).querySelector('app-notice-banners')).not.toBeNull();
    expect(indicator(fixture)).toBeNull();
    expect(bannerText(fixture)).not.toContain('Server unreachable');

    latest().emitOpen();
    fixture.detectChanges();
    expect(indicator(fixture)).toBeNull();
    expect(bannerText(fixture)).not.toContain('Server unreachable');
  });

  it('reconnecting and closed show their own labels, and a successful probe posts no banner', async () => {
    const { client, fixture } = await render();
    client.start();
    latest().emitOpen();
    latest().emitError(0);
    await settleMacrotask();
    fixture.detectChanges();

    expect(probedPaths()).toContain(HEALTHZ_PATH);
    expect(indicator(fixture)?.getAttribute('data-state')).toBe('reconnecting');
    expect(indicator(fixture)?.textContent?.trim()).toBe('Reconnecting');
    expect(bannerText(fixture)).not.toContain('Server unreachable');

    // The recovery probe runs one second after a closed stream, so no banner yet.
    latest().emitError(2);
    fixture.detectChanges();
    expect(indicator(fixture)?.getAttribute('data-state')).toBe('closed');
    expect(indicator(fixture)?.textContent?.trim()).toBe(
      'Connection lost, retrying',
    );
    expect(bannerText(fixture)).not.toContain('Server unreachable');
  });

  it('a closed stream posts the banner after the first recovery probe; a successful probe clears it, and the next open clears the label and ticks once', async () => {
    const { client, fixture } = await render();
    const ticks = collectTicks(client);
    client.start();
    latest().emitOpen();
    latest().emitError(2);
    fixture.detectChanges();
    expect(indicator(fixture)?.getAttribute('data-state')).toBe('closed');
    expect(indicator(fixture)?.textContent?.trim()).toBe(
      'Connection lost, retrying',
    );
    expect(bannerText(fixture)).not.toContain('Server unreachable');

    // The first recovery probe runs at 1 s and finds the server down.
    replies[HEALTHZ_PATH] = 'network';
    await vi.waitFor(
      () => {
        fixture.detectChanges();
        expect(bannerText(fixture)).toContain('Server unreachable');
      },
      { timeout: 3000 },
    );
    expect(indicator(fixture)?.getAttribute('data-state')).toBe('closed');

    // The server is back: the next recovery probe succeeds and opens a second stream.
    replies[HEALTHZ_PATH] = 200;
    replies[SETUP_STATUS_ROUTE] = 200;
    await vi.waitFor(() => expect(sources).toHaveLength(2), {
      timeout: 4000,
    });
    fixture.detectChanges();
    expect(bannerText(fixture)).not.toContain('Server unreachable');
    expect(indicator(fixture)?.getAttribute('data-state')).toBe('reconnecting');

    latest().emitOpen();
    fixture.detectChanges();
    expect(indicator(fixture)).toBeNull();
    expect(bannerText(fixture)).not.toContain('Server unreachable');
    expect(ticks).toEqual(['reopen']);
  }, 10000);
});
