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
  AGENT_GROUNDING_PATH,
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

const HASH = `sha256:${'a'.repeat(64)}`;

/** One claim of a grounding result; a passage is given as its path and snippet. */
function groundingClaim(
  text: string,
  verdict: string,
  passage?: { path: string; snippet: string },
): Record<string, unknown> {
  return {
    text,
    span: { start: 0, end: text.length },
    verdict,
    ...(passage === undefined
      ? {}
      : {
          passage: { path: passage.path, offset: 0, snippet: passage.snippet },
        }),
    reason: 'Checked against the sources.',
  };
}

/** The data of a grounding result of run r1, without the event's seq. */
function groundingResult(
  targetPath: string,
  claims: Record<string, unknown>[],
): Record<string, unknown> {
  return {
    runId: 'r1',
    schemaVersion: 1,
    targetPath,
    contentHash: HASH,
    checkedAt: '2026-11-16T10:00:00Z',
    claims,
  };
}

/** The buttons whose text is exactly `name`, in document order. */
function buttonsNamed(scope: ParentNode, name: string): HTMLButtonElement[] {
  return Array.from(scope.querySelectorAll('button')).filter(
    (button) => (button.textContent ?? '').trim() === name,
  );
}

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

// A queue event of the Project store (AGL-14 P9): the pending change as it now stands.
function pushQueue(
  doubles: ShellTestDoubles,
  type: string,
  data: Record<string, unknown>,
): void {
  doubles.events.push({
    module: 'project-store',
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
  it('G1 at phone width the summary chip shows text labels, and the claim list is collapsed until the chip is tapped', async () => {
    restoreMatchMedia();
    resize = stubMatchMedia(390, 844);
    const doubles = createShellTestDoubles();
    registerInitialReads(doubles);
    const harness = await render(doubles);

    push(doubles, 'run-started', { runId: 'r1', seq: 1 });
    push(doubles, 'grounding-started', {
      runId: 'r1',
      seq: 2,
      targetPath: 'drafts/ch01.md',
    });
    push(doubles, 'grounding-result', {
      seq: 3,
      ...groundingResult('drafts/ch01.md', [
        groundingClaim('The rain began at noon.', 'supported', {
          path: 'sources/outline.md',
          snippet: 'The rain began at noon.',
        }),
        groundingClaim('It rained all week.', 'weak', {
          path: 'sources/outline.md',
          snippet: 'Rain fell on Monday.',
        }),
        groundingClaim('The ship sank in May.', 'unsupported'),
      ]),
    });
    await settle(harness);

    const chip = page(harness).querySelector<HTMLButtonElement>(
      'app-grounding-chip button',
    );
    expect(chip?.querySelector('span.summary')?.textContent?.trim()).toBe(
      '1 supported · 1 weak · 1 unsupported',
    );
    expect(chip?.getAttribute('aria-expanded')).toBe('false');
    expect(page(harness).querySelector('li.claim')).toBeNull();

    chip?.click();
    await settle(harness);

    expect(
      page(harness)
        .querySelector<HTMLButtonElement>('app-grounding-chip button')
        ?.getAttribute('aria-expanded'),
    ).toBe('true');
    const badges = Array.from(
      page(harness).querySelectorAll(
        'app-grounding-chip li.claim [data-verdict]',
      ),
    );
    expect(
      badges.map((badge) =>
        badge.querySelector('span.label')?.textContent?.trim(),
      ),
    ).toEqual(['Supported', 'Weak', 'Unsupported']);
    for (const badge of badges) {
      expect(badge.querySelector('mat-icon')?.getAttribute('aria-hidden')).toBe(
        'true',
      );
    }
  });

  it('G2 the summary counts the claims of a grounding result, and expanding shows each passage with a link to its file', async () => {
    const doubles = createShellTestDoubles();
    registerInitialReads(doubles);
    const harness = await render(doubles);

    push(doubles, 'run-started', { runId: 'r1', seq: 1 });
    push(doubles, 'grounding-result', {
      seq: 2,
      ...groundingResult('drafts/ch01.md', [
        groundingClaim('Claim one.', 'supported', {
          path: 'sources/a.md',
          snippet: 'Snippet from a.',
        }),
        groundingClaim('Claim two.', 'supported', {
          path: 'sources/b.md',
          snippet: 'Snippet from b.',
        }),
        groundingClaim('Claim three.', 'weak', {
          path: 'sources/c.md',
          snippet: 'Snippet from c.',
        }),
        groundingClaim('Claim four.', 'unsupported'),
      ]),
    });
    await settle(harness);

    const chip = () =>
      page(harness).querySelector<HTMLButtonElement>(
        'app-grounding-chip button',
      );
    expect(chip()?.querySelector('span.summary')?.textContent?.trim()).toBe(
      '2 supported · 1 weak · 1 unsupported',
    );
    expect(chip()?.getAttribute('aria-expanded')).toBe('true');

    chip()?.click();
    await settle(harness);
    expect(chip()?.getAttribute('aria-expanded')).toBe('false');
    expect(page(harness).querySelector('li.claim')).toBeNull();

    chip()?.click();
    await settle(harness);
    const rows = Array.from(page(harness).querySelectorAll('li.claim'));
    expect(rows).toHaveLength(4);
    const passages = [
      ['sources/a.md', 'Snippet from a.'],
      ['sources/b.md', 'Snippet from b.'],
      ['sources/c.md', 'Snippet from c.'],
    ];
    for (const [index, [path, snippet]] of passages.entries()) {
      const row = rows[index];
      expect(row?.textContent).toContain(snippet);
      const link = row?.querySelector('a');
      expect(link).not.toBeNull();
      const href = new URL(
        link?.getAttribute('href') ?? '',
        'http://localhost',
      );
      expect(href.pathname).toBe('/projects/p1/files');
      expect(href.searchParams.get('path')).toBe(path);
    }
    expect(rows[3]?.textContent).toContain('No source passage cited.');
  });

  it('G3 grounding-started shows a checking state, and the seq rule applies to grounding events', async () => {
    const doubles = createShellTestDoubles();
    registerInitialReads(doubles);
    const harness = await render(doubles);

    push(doubles, 'run-started', { runId: 'r1', seq: 1 });
    push(doubles, 'grounding-started', {
      runId: 'r1',
      seq: 2,
      targetPath: 'drafts/ch02.md',
    });
    await settle(harness);
    expect(
      page(harness)
        .querySelector('app-grounding-chip span.summary')
        ?.textContent?.trim(),
    ).toBe('Checking drafts/ch02.md');

    push(doubles, 'grounding-result', {
      seq: 3,
      ...groundingResult('drafts/ch02.md', [
        groundingClaim('The rain began at noon.', 'supported', {
          path: 'sources/outline.md',
          snippet: 'The rain began at noon.',
        }),
      ]),
    });
    await settle(harness);
    expect(
      page(harness)
        .querySelector('app-grounding-chip span.summary')
        ?.textContent?.trim(),
    ).toBe('1 supported · 0 weak · 0 unsupported');

    // A second result at seq 2 is at or below the turn's lastSeq (3) and is refused.
    push(doubles, 'grounding-result', {
      seq: 2,
      ...groundingResult('drafts/ch02.md', [
        groundingClaim('Other.', 'unsupported'),
      ]),
    });
    await settle(harness);
    expect(
      page(harness)
        .querySelector('app-grounding-chip span.summary')
        ?.textContent?.trim(),
    ).toBe('1 supported · 0 weak · 0 unsupported');
  });

  it('G4 a run state with grounding results shows the chip after the read', async () => {
    const doubles = createShellTestDoubles();
    registerInitialReads(doubles);
    doubles.api.respond('GET', AGENT_RUN_CURRENT_PATH, {
      ...RUN_STATE_BASE,
      lastSeq: 1,
      groundingResults: [
        groundingResult('drafts/ch01.md', [
          groundingClaim('The rain began at noon.', 'weak', {
            path: 'sources/outline.md',
            snippet: 'Rain fell.',
          }),
        ]),
      ],
    });
    const harness = await render(doubles);

    expect(
      page(harness)
        .querySelector('app-grounding-chip span.summary')
        ?.textContent?.trim(),
    ).toBe('0 supported · 1 weak · 0 unsupported');
  });

  it('G5 Check grounding on a draft card posts its path, the chip sits after its card, and the reply starts a run', async () => {
    const doubles = createShellTestDoubles();
    registerInitialReads(doubles);
    const harness = await render(doubles);

    push(doubles, 'run-started', { runId: 'r1', seq: 1 });
    push(doubles, 'tool-call-started', {
      runId: 'r1',
      seq: 2,
      callId: 'c1',
      name: 'draft_chapter',
      family: 'narrative',
    });
    push(doubles, 'tool-call-args', {
      runId: 'r1',
      seq: 3,
      callId: 'c1',
      arguments: {},
      valid: true,
    });
    push(doubles, 'tool-call-result', {
      runId: 'r1',
      seq: 4,
      callId: 'c1',
      summary: 'Drafted.',
      diffPreview: { path: 'drafts/ch01.md', base: '', proposed: 'Text.' },
    });
    push(doubles, 'tool-call-started', {
      runId: 'r1',
      seq: 5,
      callId: 'c2',
      name: 'write_file',
      family: 'project',
    });
    push(doubles, 'tool-call-args', {
      runId: 'r1',
      seq: 6,
      callId: 'c2',
      arguments: {},
      valid: true,
    });
    push(doubles, 'tool-call-result', {
      runId: 'r1',
      seq: 7,
      callId: 'c2',
      summary: 'Wrote notes.',
      diffPreview: { path: 'notes/a.md', base: '', proposed: 'Notes.' },
    });
    push(doubles, 'grounding-result', {
      seq: 8,
      ...groundingResult('drafts/ch01.md', [
        groundingClaim('The rain began at noon.', 'supported', {
          path: 'sources/outline.md',
          snippet: 'The rain began at noon.',
        }),
      ]),
    });
    push(doubles, 'run-ended', {
      runId: 'r1',
      seq: 9,
      reason: 'completed',
      pendingChangeIds: [],
    });
    await settle(harness);

    const [first, second] = cards(harness);
    const chips = Array.from(
      page(harness).querySelectorAll('app-grounding-chip'),
    );
    expect(chips).toHaveLength(1);
    expect(
      first?.compareDocumentPosition(chips[0] as Element) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(
      (chips[0] as Element).compareDocumentPosition(second as Element) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();

    const checks = buttonsNamed(page(harness), 'Check grounding');
    expect(checks).toHaveLength(1);
    const check = checks[0];
    expect(check?.disabled).toBe(false);
    expect(
      (first as Element).compareDocumentPosition(check as Element) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(
      (check as Element).compareDocumentPosition(second as Element) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();

    doubles.api.respond('POST', AGENT_GROUNDING_PATH, {
      runId: 'g1',
      conversationId: 'c1',
    });
    check?.click();
    await settle(harness);

    expect(
      doubles.api.requests.filter(
        (request) => request.path === AGENT_GROUNDING_PATH,
      ),
    ).toEqual([
      {
        method: 'POST',
        path: AGENT_GROUNDING_PATH,
        body: { path: 'drafts/ch01.md' },
      },
    ]);
    expect(buttonNamed(page(harness), 'Stop')).toBeDefined();
    const intents = Array.from(page(harness).querySelectorAll('p.intent')).map(
      (element) => element.textContent?.trim(),
    );
    expect(intents).toContain('Check grounding: drafts/ch01.md');
    expect(buttonsNamed(page(harness), 'Check grounding')[0]?.disabled).toBe(
      true,
    );
  });

  it('G6 the check query of the Files link shows a Check grounding button that posts the path', async () => {
    const doubles = createShellTestDoubles();
    registerInitialReads(doubles);
    const harness = await render(doubles);

    await harness.navigateByUrl('/projects/p1/chat?check=drafts/ch01.md');
    await settle(harness);

    const named = buttonsNamed(
      page(harness),
      'Check grounding: drafts/ch01.md',
    );
    expect(named).toHaveLength(1);
    expect(requestsTo(doubles, AGENT_GROUNDING_PATH)).toBe(0);

    doubles.api.respond('POST', AGENT_GROUNDING_PATH, {
      runId: 'g1',
      conversationId: 'c1',
    });
    named[0]?.click();
    await settle(harness);

    expect(
      doubles.api.requests.filter(
        (request) => request.path === AGENT_GROUNDING_PATH,
      ),
    ).toEqual([
      {
        method: 'POST',
        path: AGENT_GROUNDING_PATH,
        body: { path: 'drafts/ch01.md' },
      },
    ]);

    await harness.navigateByUrl('/projects/p1/chat?check=sources/a.md');
    await settle(harness);
    const starts = Array.from(page(harness).querySelectorAll('button')).some(
      (button) =>
        (button.textContent ?? '').trim().startsWith('Check grounding:'),
    );
    expect(starts).toBe(false);
  });
});

describe('chat page write diffs and the review link (AGL-14)', () => {
  // A write_file run: its call, its arguments and its result with the diff preview of the write.
  function pushWriteCard(
    doubles: ShellTestDoubles,
    diffPreview: { path: string; base: string; proposed: string },
  ): void {
    push(doubles, 'run-started', { runId: 'r1', seq: 1 });
    push(doubles, 'tool-call-started', {
      runId: 'r1',
      seq: 2,
      callId: 'c1',
      name: 'write_file',
      family: 'project',
    });
    push(doubles, 'tool-call-args', {
      runId: 'r1',
      seq: 3,
      callId: 'c1',
      arguments: { path: diffPreview.path, content: diffPreview.proposed },
      valid: true,
    });
    push(doubles, 'tool-call-result', {
      runId: 'r1',
      seq: 4,
      callId: 'c1',
      summary: `Wrote ${diffPreview.path}`,
      diffPreview,
    });
  }

  it('V1 a write card shows the diff inside the card, side by side on a desktop', async () => {
    const doubles = createShellTestDoubles();
    registerInitialReads(doubles);
    const harness = await render(doubles);

    pushWriteCard(doubles, {
      path: 'notes/a.md',
      base: 'Old line\n',
      proposed: 'New line\n',
    });
    await settle(harness);

    const card = page(harness).querySelector('app-tool-call-card');
    const view = card?.querySelector('app-diff-view');
    expect(view).not.toBeNull();
    const section = view?.querySelector(
      'section[aria-label="Changes to notes/a.md"]',
    );
    expect(section).not.toBeNull();
    expect(section?.querySelector('.cm-mergeView')).not.toBeNull();
    expect(section?.querySelector('.cm-merge-a')?.textContent).toContain(
      'Old line',
    );
    expect(section?.querySelector('.cm-merge-b')?.textContent).toContain(
      'New line',
    );
  });

  it('V2 the review link of a run appears with its pending change IDs and goes when a queue event accepts them', async () => {
    const doubles = createShellTestDoubles();
    registerInitialReads(doubles);
    const harness = await render(doubles);
    const link = 'a[href="/projects/p1/review?run=r1"]';

    push(doubles, 'run-started', { runId: 'r1', seq: 1 });
    pushQueue(doubles, 'pending-created', {
      projectId: 'p1',
      pendingChange: { id: 'pc1', status: 'pending' },
    });
    push(doubles, 'run-ended', {
      runId: 'r1',
      seq: 2,
      reason: 'completed',
      pendingChangeIds: ['pc1'],
    });
    await settle(harness);
    expect(page(harness).querySelector(link)).not.toBeNull();

    pushQueue(doubles, 'pending-resolved', {
      projectId: 'p1',
      pendingChange: { id: 'pc1', status: 'accepted' },
    });
    await settle(harness);
    expect(page(harness).querySelector(link)).toBeNull();
  });

  it('V3 a queue event of another project, or a change still pending, leaves the review link in place', async () => {
    const doubles = createShellTestDoubles();
    registerInitialReads(doubles);
    const harness = await render(doubles);
    const link = 'a[href="/projects/p1/review?run=r1"]';

    push(doubles, 'run-started', { runId: 'r1', seq: 1 });
    push(doubles, 'run-ended', {
      runId: 'r1',
      seq: 2,
      reason: 'completed',
      pendingChangeIds: ['pc1'],
    });
    await settle(harness);
    expect(page(harness).querySelector(link)).not.toBeNull();

    pushQueue(doubles, 'pending-resolved', {
      projectId: 'p2',
      pendingChange: { id: 'pc1', status: 'accepted' },
    });
    await settle(harness);
    expect(page(harness).querySelector(link)).not.toBeNull();

    pushQueue(doubles, 'pending-updated', {
      projectId: 'p1',
      pendingChange: { id: 'pc1', status: 'pending' },
    });
    await settle(harness);
    expect(page(harness).querySelector(link)).not.toBeNull();
  });

  it('V4 on a phone the diff is unified and the write card is collapsed until it is opened', async () => {
    restoreMatchMedia();
    resize = stubMatchMedia(390, 844);
    const doubles = createShellTestDoubles();
    registerInitialReads(doubles);
    const harness = await render(doubles);

    pushWriteCard(doubles, {
      path: 'notes/a.md',
      base: 'Old line\n',
      proposed: 'New line\n',
    });
    await settle(harness);

    const header = page(harness).querySelector<HTMLButtonElement>(
      'app-tool-call-card button.header',
    );
    expect(header?.getAttribute('aria-expanded')).toBe('false');
    expect(page(harness).querySelector('app-diff-view')).toBeNull();

    header?.click();
    await settle(harness);
    expect(header?.getAttribute('aria-expanded')).toBe('true');
    const view = page(harness).querySelector('app-diff-view');
    expect(view).not.toBeNull();
    expect(view?.querySelector('.cm-mergeView')).toBeNull();
    expect(view?.querySelector('.cm-merge-a')).toBeNull();
    const unified = [...(view?.querySelectorAll('[role="radio"]') ?? [])].find(
      (button) => button.textContent?.trim() === 'Unified',
    );
    expect(unified?.getAttribute('aria-checked')).toBe('true');
  });
});
