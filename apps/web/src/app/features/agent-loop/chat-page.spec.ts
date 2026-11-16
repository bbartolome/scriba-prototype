import { type Provider, SecurityContext } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import type { SseEnvelope } from '@bbartolome/scriba-contracts/platform';
import { provideMarkdown, SANITIZE } from 'ngx-markdown';
import { map, Subject } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { PROJECT_ROUTES } from '../../app.routes';
import {
  ApiError,
  API_CLIENT,
  type ApiClient,
  type ApiPath,
  type ResponseSchema,
} from '../../shell';
import { parseResponse } from '../../shell/api-client';
import {
  createShellTestDoubles,
  type ShellTestDoubles,
} from '../../shell/testing/test-doubles';
import {
  restoreMatchMedia,
  stubMatchMedia,
} from '../../shell/testing/match-media';
import {
  AGENT_CONVERSATIONS_PATH,
  AGENT_NO_PROVIDER_CODE,
  AGENT_RUN_ACTIVE_CODE,
  AGENT_RUN_CURRENT_PATH,
  AGENT_RUN_STOP_PATH,
  AGENT_RUNS_PATH,
  AGENT_SETTINGS_PATH,
  entityResolvePath,
} from './agent-contract';

const RUN_STATE_BASE = {
  runId: 'r1',
  conversationId: 'c1',
  status: 'running',
  step: 1,
  cap: 12,
  assistantText: '',
  cards: [],
  groundingResults: [],
  pendingChangeIds: [],
  lastSeq: 0,
};

let resize: (width: number, height: number) => void;

beforeEach(() => {
  resize = stubMatchMedia(1280, 800);
});

afterEach(() => {
  restoreMatchMedia();
});

/** The three reads that the page makes at load, answered with the defaults. */
function registerInitialReads(doubles: ShellTestDoubles): void {
  doubles.api.respond('GET', AGENT_SETTINGS_PATH, {
    schemaVersion: 1,
    stepCap: 12,
    research: { enabled: false },
  });
  doubles.api.respond('GET', AGENT_CONVERSATIONS_PATH, { conversations: [] });
  doubles.api.respond('GET', AGENT_RUN_CURRENT_PATH, null);
}

async function settle(harness: RouterTestingHarness): Promise<void> {
  harness.detectChanges();
  await harness.fixture.whenStable();
  harness.detectChanges();
}

async function render(
  doubles: ShellTestDoubles,
  extra: Provider[] = [],
): Promise<RouterTestingHarness> {
  TestBed.configureTestingModule({
    providers: [
      provideRouter([
        { path: 'projects/:projectId', children: PROJECT_ROUTES },
      ]),
      provideMarkdown({
        sanitize: { provide: SANITIZE, useValue: SecurityContext.HTML },
      }),
      ...doubles.providers,
      ...extra,
    ],
  });
  const harness = await RouterTestingHarness.create('/projects/p1/chat');
  await settle(harness);
  return harness;
}

function page(harness: RouterTestingHarness): HTMLElement {
  const element = harness.routeNativeElement;
  expect(element).toBeDefined();
  return element as HTMLElement;
}

function push(
  doubles: ShellTestDoubles,
  type: string,
  data: Record<string, unknown>,
): void {
  doubles.events.push({
    module: 'agent-loop',
    type,
    data,
  } satisfies SseEnvelope);
}

function buttonNamed(
  scope: ParentNode,
  name: string,
): HTMLButtonElement | undefined {
  return Array.from(scope.querySelectorAll('button')).find(
    (button) => (button.textContent ?? '').trim() === name,
  );
}

function clickButton(scope: ParentNode, name: string): void {
  const button = buttonNamed(scope, name);
  expect(button).toBeDefined();
  button?.click();
}

function typeIntent(scope: ParentNode, text: string): void {
  const area = scope.querySelector<HTMLTextAreaElement>(
    'textarea[aria-label="Intent"]',
  );
  expect(area).not.toBeNull();
  if (area === null) return;
  area.value = text;
  area.dispatchEvent(new Event('input'));
}

function cards(harness: RouterTestingHarness): Element[] {
  return Array.from(page(harness).querySelectorAll('app-tool-call-card'));
}

function markdownTexts(harness: RouterTestingHarness): string[] {
  return Array.from(page(harness).querySelectorAll('app-markdown-preview')).map(
    (element) => (element.textContent ?? '').trim(),
  );
}

function requestsTo(doubles: ShellTestDoubles, path: ApiPath): number {
  return doubles.api.requests.filter((request) => request.path === path).length;
}

/**
 * A client that holds the second run-state read until the test completes it. The reply goes through
 * parseResponse, as the HTTP client's does.
 */
function holdSecondRead(doubles: ShellTestDoubles): {
  held: Subject<unknown>;
  provider: Provider;
} {
  const held = new Subject<unknown>();
  let runStateReads = 0;
  const client: ApiClient = {
    get<T>(
      path: ApiPath,
      schema: ResponseSchema<T>,
      params?: Record<string, string>,
    ) {
      if (path === AGENT_RUN_CURRENT_PATH) {
        runStateReads += 1;
        if (runStateReads === 2) {
          return held.pipe(map((body) => parseResponse(path, schema, body)));
        }
      }
      return doubles.api.get(path, schema, params);
    },
    post<T>(path: ApiPath, body: unknown, schema: ResponseSchema<T>) {
      return doubles.api.post(path, body, schema);
    },
  };
  return { held, provider: { provide: API_CLIENT, useValue: client } };
}

describe('chat page', () => {
  it('T1 tokens append, and a card moves from pending to done and then to error with the attempt number', async () => {
    const doubles = createShellTestDoubles();
    registerInitialReads(doubles);
    const harness = await render(doubles);

    push(doubles, 'run-started', { runId: 'r1', seq: 1 });
    push(doubles, 'token-delta', { runId: 'r1', seq: 2, text: 'Hel' });
    push(doubles, 'token-delta', { runId: 'r1', seq: 3, text: 'lo' });
    await settle(harness);
    expect(markdownTexts(harness)).toEqual(['Hello']);

    push(doubles, 'tool-call-started', {
      runId: 'r1',
      seq: 4,
      callId: 'c1',
      name: 'read_file',
      family: 'project',
    });
    await settle(harness);
    expect(cards(harness)[0]?.textContent).toContain('Pending');

    push(doubles, 'tool-call-args', {
      runId: 'r1',
      seq: 5,
      callId: 'c1',
      arguments: { path: 'drafts/ch01.md' },
      valid: true,
    });
    await settle(harness);
    expect(cards(harness)[0]?.textContent).toContain('Running');

    push(doubles, 'tool-call-result', {
      runId: 'r1',
      seq: 6,
      callId: 'c1',
      summary: '1 file',
      output: 'Read it.',
    });
    await settle(harness);
    expect(cards(harness)[0]?.textContent).toContain('Done');
    expect(cards(harness)[0]?.textContent).toContain('1 file');

    push(doubles, 'tool-call-started', {
      runId: 'r1',
      seq: 7,
      callId: 'c2',
      name: 'read_file',
      family: 'project',
    });
    push(doubles, 'tool-call-args', {
      runId: 'r1',
      seq: 8,
      callId: 'c2',
      arguments: { path: 'drafts/missing.md' },
      valid: true,
    });
    push(doubles, 'tool-call-error', {
      runId: 'r1',
      seq: 9,
      callId: 'c2',
      message: 'File not found',
      attempt: 2,
    });
    await settle(harness);
    expect(cards(harness)).toHaveLength(2);
    expect(cards(harness)[1]?.textContent).toContain('Error');
    expect(cards(harness)[1]?.textContent).toContain(
      'Attempt 2: File not found',
    );
  });

  it('T2 Stop is shown only while an agent run is active', async () => {
    const doubles = createShellTestDoubles();
    registerInitialReads(doubles);
    doubles.api.respond('POST', AGENT_RUNS_PATH, {
      runId: 'r1',
      conversationId: 'c1',
    });
    doubles.api.respond('POST', AGENT_RUN_STOP_PATH, {});
    const harness = await render(doubles);
    expect(buttonNamed(page(harness), 'Stop')).toBeUndefined();

    typeIntent(page(harness), 'Outline my book');
    await settle(harness);
    clickButton(page(harness), 'Send');
    await settle(harness);
    expect(buttonNamed(page(harness), 'Stop')).toBeDefined();

    clickButton(page(harness), 'Stop');
    expect(doubles.api.requests).toContainEqual({
      method: 'POST',
      path: AGENT_RUN_STOP_PATH,
      body: { runId: 'r1' },
    });

    push(doubles, 'run-started', { runId: 'r1', seq: 1 });
    push(doubles, 'run-ended', {
      runId: 'r1',
      seq: 2,
      reason: 'stopped',
      pendingChangeIds: [],
    });
    await settle(harness);
    expect(buttonNamed(page(harness), 'Stop')).toBeUndefined();
  });

  it('T3 a reconnect replaces the view from the run state and ignores events at or below lastSeq', async () => {
    const doubles = createShellTestDoubles();
    registerInitialReads(doubles);
    const harness = await render(doubles);

    push(doubles, 'run-started', { runId: 'r1', seq: 1 });
    push(doubles, 'token-delta', { runId: 'r1', seq: 2, text: 'a' });
    push(doubles, 'token-delta', { runId: 'r1', seq: 3, text: 'b' });
    await settle(harness);
    expect(markdownTexts(harness)).toEqual(['ab']);

    // Seq 4 was missed while the stream was down; the state carries lastSeq 4.
    doubles.api.respond('GET', AGENT_RUN_CURRENT_PATH, {
      ...RUN_STATE_BASE,
      assistantText: 'abc',
      lastSeq: 4,
    });
    doubles.events.reopen();
    await settle(harness);
    expect(markdownTexts(harness)).toEqual(['abc']);

    // Seq 3 and 4 are at or below the state's lastSeq and are refused; seq 5 applies.
    push(doubles, 'token-delta', { runId: 'r1', seq: 3, text: 'X' });
    push(doubles, 'token-delta', { runId: 'r1', seq: 4, text: 'c' });
    push(doubles, 'token-delta', { runId: 'r1', seq: 5, text: 'd' });
    await settle(harness);
    expect(markdownTexts(harness)).toEqual(['abcd']);
    expect(requestsTo(doubles, AGENT_RUN_CURRENT_PATH)).toBe(2);
  });

  it('T4 on a phone the cards are collapsed and the page has one column', async () => {
    restoreMatchMedia();
    resize = stubMatchMedia(390, 844);
    const doubles = createShellTestDoubles();
    registerInitialReads(doubles);
    const harness = await render(doubles);

    push(doubles, 'run-started', { runId: 'r1', seq: 1 });
    push(doubles, 'tool-call-started', {
      runId: 'r1',
      seq: 2,
      callId: 'c1',
      name: 'read_file',
      family: 'project',
    });
    push(doubles, 'tool-call-args', {
      runId: 'r1',
      seq: 3,
      callId: 'c1',
      arguments: { path: 'sources/outline.md' },
      valid: true,
    });
    push(doubles, 'tool-call-result', {
      runId: 'r1',
      seq: 4,
      callId: 'c1',
      summary: '1 file',
    });
    await settle(harness);

    const header = page(harness).querySelector('app-tool-call-card button');
    expect(header?.getAttribute('aria-expanded')).toBe('false');
    expect(
      page(harness).querySelector('section[aria-label="Arguments"]'),
    ).toBeNull();
    expect(page(harness).querySelector('aside')).toBeNull();
    expect(page(harness).querySelector('form textarea')).not.toBeNull();

    // The same card expands at a desktop width: the device decides.
    resize(1280, 800);
    await new Promise((done) => setTimeout(done, 0));
    await settle(harness);
    const expanded = page(harness).querySelector('app-tool-call-card button');
    expect(expanded?.getAttribute('aria-expanded')).toBe('true');
  });

  it('X2 a refused start shows AGENT_NO_PROVIDER with a link to /providers, and AGENT_RUN_ACTIVE as its own message', async () => {
    const doubles = createShellTestDoubles();
    registerInitialReads(doubles);
    doubles.api.fail(
      'POST',
      AGENT_RUNS_PATH,
      new ApiError(409, AGENT_NO_PROVIDER_CODE, 'No provider is set up.'),
    );
    const harness = await render(doubles);

    typeIntent(page(harness), 'Hello');
    await settle(harness);
    clickButton(page(harness), 'Send');
    await settle(harness);
    const alert = page(harness).querySelector('[role="alert"]');
    expect(alert?.textContent).toContain('Set up a model provider first.');
    expect(alert?.querySelector('a[href="/providers"]')).not.toBeNull();

    doubles.api.fail(
      'POST',
      AGENT_RUNS_PATH,
      new ApiError(409, AGENT_RUN_ACTIVE_CODE, 'A run is active.'),
    );
    clickButton(page(harness), 'Send');
    await settle(harness);
    expect(
      page(harness).querySelector('[role="alert"]')?.textContent,
    ).toContain('An agent run is already active in this project.');
  });

  it('X3 Continue after a capped run posts the same conversation with the intent Continue', async () => {
    const doubles = createShellTestDoubles();
    registerInitialReads(doubles);
    doubles.api.respond('GET', AGENT_RUN_CURRENT_PATH, {
      ...RUN_STATE_BASE,
      status: 'ended',
      reason: 'capped',
      step: 12,
      cap: 12,
      lastSeq: 3,
    });
    doubles.api.respond('POST', AGENT_RUNS_PATH, {
      runId: 'r2',
      conversationId: 'c1',
    });
    const harness = await render(doubles);

    clickButton(page(harness), 'Continue');
    await settle(harness);
    expect(doubles.api.requests).toContainEqual({
      method: 'POST',
      path: AGENT_RUNS_PATH,
      body: { intent: 'Continue', conversationId: 'c1' },
    });
  });

  it('X4 run-ended with pending change IDs links to the review page of that run', async () => {
    const doubles = createShellTestDoubles();
    registerInitialReads(doubles);
    const harness = await render(doubles);

    push(doubles, 'run-started', { runId: 'r1', seq: 1 });
    push(doubles, 'run-ended', {
      runId: 'r1',
      seq: 2,
      reason: 'completed',
      pendingChangeIds: ['pc1'],
    });
    await settle(harness);
    expect(
      page(harness).querySelector('a[href="/projects/p1/review?run=r1"]'),
    ).not.toBeNull();
  });

  it('X5 the settings sheet sends only the changed field and shows the stored step cap', async () => {
    const doubles = createShellTestDoubles();
    registerInitialReads(doubles);
    doubles.api.respond('POST', AGENT_SETTINGS_PATH, {
      schemaVersion: 1,
      stepCap: 5,
      research: { enabled: false },
    });
    const harness = await render(doubles);

    clickButton(page(harness), 'Settings');
    await settle(harness);
    const sheet = page(harness).querySelector(
      'section[aria-label="Agent settings"]',
    );
    const field = sheet?.querySelector<HTMLInputElement>(
      'input[type="number"]',
    );
    expect(field).toBeTruthy();
    if (sheet === null || field === null || field === undefined) return;
    field.value = '5';
    field.dispatchEvent(new Event('input'));
    clickButton(sheet, 'Save settings');
    await settle(harness);

    expect(doubles.api.requests).toContainEqual({
      method: 'POST',
      path: AGENT_SETTINGS_PATH,
      body: { stepCap: 5 },
    });
    expect(field.value).toBe('5');
  });

  it('X6 events that arrive while the run-state read is in flight are applied after the replacement', async () => {
    const doubles = createShellTestDoubles();
    registerInitialReads(doubles);
    doubles.api.respond('GET', AGENT_RUN_CURRENT_PATH, {
      ...RUN_STATE_BASE,
      assistantText: 'a',
      lastSeq: 1,
    });
    const { held, provider } = holdSecondRead(doubles);
    const harness = await render(doubles, [provider]);
    expect(markdownTexts(harness)).toEqual(['a']);

    doubles.events.reopen();
    push(doubles, 'token-delta', { runId: 'r1', seq: 2, text: 'b' });
    push(doubles, 'token-delta', { runId: 'r1', seq: 3, text: 'c' });
    await settle(harness);
    expect(markdownTexts(harness)).toEqual(['a']);

    held.next({ ...RUN_STATE_BASE, assistantText: 'ab', lastSeq: 2 });
    held.complete();
    await settle(harness);
    expect(markdownTexts(harness)).toEqual(['abc']);
  });

  it('X7 the step counter shows the step of the run state read after a tool call starts', async () => {
    const doubles = createShellTestDoubles();
    registerInitialReads(doubles);
    const harness = await render(doubles);

    push(doubles, 'run-started', { runId: 'r1', seq: 1 });
    await settle(harness);
    doubles.api.respond('GET', AGENT_RUN_CURRENT_PATH, {
      ...RUN_STATE_BASE,
      step: 2,
      cap: 12,
      lastSeq: 2,
      cards: [
        {
          callId: 'c1',
          name: 'read_file',
          family: 'project',
          status: 'running',
        },
      ],
    });
    push(doubles, 'tool-call-started', {
      runId: 'r1',
      seq: 2,
      callId: 'c1',
      name: 'read_file',
      family: 'project',
    });
    await settle(harness);

    expect(requestsTo(doubles, AGENT_RUN_CURRENT_PATH)).toBe(2);
    expect(page(harness).textContent).toContain('step 2 of 12');
    expect(cards(harness)).toHaveLength(1);
    expect(cards(harness)[0]?.textContent).toContain('read_file');
  });

  it('W1 a card with sourcesUsed links each resolved source to the files route', async () => {
    const doubles = createShellTestDoubles();
    registerInitialReads(doubles);
    doubles.api.respond('GET', entityResolvePath('p1'), {
      resolved: [
        {
          id: 'ada-lovelace',
          type: 'person',
          path: 'entities/ada-lovelace.md',
          content: 'Ada wrote the first program.',
        },
      ],
      errors: [{ id: 'ghost-entity', code: 'unknown' }],
    });
    const harness = await render(doubles);

    push(doubles, 'run-started', { runId: 'r1', seq: 1 });
    push(doubles, 'tool-call-started', {
      runId: 'r1',
      seq: 2,
      callId: 'c1',
      name: 'cold_open',
      family: 'narrative',
    });
    push(doubles, 'tool-call-result', {
      runId: 'r1',
      seq: 3,
      callId: 'c1',
      summary: 'Drafted with cold_open.',
      output: { kind: 'draft', content: 'Opening.' },
      sourcesUsed: ['ada-lovelace', 'ghost-entity'],
    });
    await settle(harness);

    push(doubles, 'tool-call-started', {
      runId: 'r1',
      seq: 4,
      callId: 'c2',
      name: 'cold_open',
      family: 'narrative',
    });
    push(doubles, 'tool-call-result', {
      runId: 'r1',
      seq: 5,
      callId: 'c2',
      summary: 'Drafted with cold_open.',
      output: { kind: 'draft', content: 'Opening again.' },
      sourcesUsed: ['ada-lovelace'],
    });
    await settle(harness);

    const resolves = doubles.api.requests.filter(
      (request) => request.path === entityResolvePath('p1'),
    );
    expect(resolves.map((request) => request.params)).toEqual([
      { ids: 'ada-lovelace' },
      { ids: 'ghost-entity' },
    ]);

    const [first, second] = cards(harness);
    for (const card of [first, second]) {
      const links = Array.from(
        card?.querySelectorAll('section[aria-label="Sources"] a') ?? [],
      );
      expect(links).toHaveLength(1);
      expect(links[0]?.textContent?.trim()).toBe('entities/ada-lovelace.md');
      expect(links[0]?.getAttribute('href')).toBe(
        '/projects/p1/files?path=entities%2Fada-lovelace.md',
      );
      expect(card?.textContent).not.toContain('ghost-entity');
    }
  });
});
