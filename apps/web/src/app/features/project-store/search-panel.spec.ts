import { SecurityContext } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { provideMarkdown, SANITIZE } from 'ngx-markdown';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { ApiPath } from '../../shell';
import {
  restoreMatchMedia,
  stubMatchMedia,
} from '../../shell/testing/match-media';
import {
  createShellTestDoubles,
  type RecordedRequest,
  type ShellTestDoubles,
} from '../../shell/testing/test-doubles';
import { filesRoutes } from './project-store.routes';

const LIST: ApiPath = '/api/project-store/projects/p1/files';
const READ: ApiPath = '/api/project-store/projects/p1/file';
const SEARCH: ApiPath = '/api/project-store/projects/p1/search';
const LIST_PARAMS = { path: '.', recursive: 'true' };
const MTIME = '2026-11-14T09:00:00Z';
const HASH = `sha256:${'a'.repeat(64)}`;

const NOTES = 'Gamma rays and gamma bursts.\n';

// The search answer of the shared fixtures, best first.
const PASSAGES = [
  {
    path: 'sources/notes.md',
    offset: 0,
    snippet: 'Gamma rays and gamma bursts.',
    score: 2.1,
  },
  { path: 'sources/outline.md', offset: 0, snippet: '# Outline', score: 0.7 },
];

function file(path: string) {
  return { path, kind: 'file', size: 10, mtime: MTIME };
}

function read(path: string, content: string) {
  return { path, content, hash: HASH, mtime: MTIME };
}

beforeEach(() => {
  stubMatchMedia(1280, 800);
  // jsdom has no layout and no scrollIntoView. The page scrolls the anchor of an offset; these
  // tests check what renders and what is sent, not the scroll.
  Element.prototype.scrollIntoView = () => undefined;
});

afterEach(() => {
  restoreMatchMedia();
  delete (Element.prototype as Partial<Element>).scrollIntoView;
});

function render(
  doubles: ShellTestDoubles,
  url: string,
): Promise<RouterTestingHarness> {
  TestBed.configureTestingModule({
    providers: [
      provideRouter([
        { path: 'projects/:projectId/files', children: filesRoutes },
      ]),
      provideMarkdown({
        sanitize: { provide: SANITIZE, useValue: SecurityContext.HTML },
      }),
      ...doubles.providers,
    ],
  });
  return RouterTestingHarness.create(url).then(async (harness) => {
    await settle(harness);
    return harness;
  });
}

async function settle(harness: RouterTestingHarness): Promise<void> {
  harness.detectChanges();
  await harness.fixture.whenStable();
  harness.detectChanges();
}

/** The debounce of the search box is 250 ms of real time; the tests wait past it. */
function pause(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function root(harness: RouterTestingHarness): HTMLElement {
  const element = harness.routeNativeElement;
  expect(element).toBeDefined();
  return element as HTMLElement;
}

/** Types into the search box, as a keystroke does: the value is set, then an input event fires. */
function typeInto(harness: RouterTestingHarness, text: string): void {
  const box = root(harness).querySelector<HTMLInputElement>(
    'input[type="search"]',
  );
  expect(box).not.toBeNull();
  box!.value = text;
  box!.dispatchEvent(new Event('input'));
}

/** The toggle button of one scope, by its label. */
function toggleNamed(
  harness: RouterTestingHarness,
  label: string,
): HTMLButtonElement {
  const toggle = Array.from(
    root(harness).querySelectorAll<HTMLButtonElement>('mat-button-toggle button'),
  ).find((button) => button.textContent?.trim() === label);
  expect(toggle).toBeDefined();
  return toggle!;
}

function posts(doubles: ShellTestDoubles): RecordedRequest[] {
  return doubles.api.requests.filter((request) => request.method === 'POST');
}

describe('SearchPanel', () => {
  it('T1 typing a query shows ranked results; selecting a result opens that path', async () => {
    const doubles = createShellTestDoubles();
    doubles.api.respond('GET', LIST, {
      entries: [file('sources/notes.md'), file('sources/outline.md')],
    });
    doubles.api.respond('POST', SEARCH, PASSAGES);
    doubles.api.respond('GET', READ, read('sources/notes.md', NOTES));
    const harness = await render(doubles, '/projects/p1/files');

    typeInto(harness, 'gamma');
    await pause(300);
    await settle(harness);

    expect(posts(doubles)).toStrictEqual([
      { method: 'POST', path: SEARCH, body: { query: 'gamma' } },
    ]);
    const rows = Array.from(
      root(harness).querySelectorAll('ol[aria-label="Search results"] li'),
    );
    expect(rows).toHaveLength(2);
    expect(rows[0]?.textContent).toContain('sources/notes.md');
    expect(rows[0]?.textContent).toContain('Gamma rays and gamma bursts.');
    expect(rows[1]?.textContent).toContain('sources/outline.md');
    expect(rows[1]?.textContent).toContain('# Outline');

    const first = root(harness).querySelector<HTMLAnchorElement>(
      'ol[aria-label="Search results"] a',
    );
    expect(first).not.toBeNull();
    first!.click();
    await settle(harness);

    const router = TestBed.inject(Router);
    expect(router.parseUrl(router.url).queryParams['path']).toBe(
      'sources/notes.md',
    );
    expect(doubles.api.requests).toContainEqual({
      method: 'GET',
      path: READ,
      params: { path: 'sources/notes.md' },
    });
    expect(
      root(harness).querySelector('app-markdown-preview')?.textContent,
    ).toContain('Gamma rays and gamma bursts.');

    typeInto(harness, '');
    await pause(300);
    await settle(harness);

    expect(posts(doubles)).toHaveLength(1);
    expect(
      root(harness).querySelector('ol[aria-label="Search results"]'),
    ).toBeNull();
  });

  it('T2 the scope toggle restricts the request', async () => {
    const doubles = createShellTestDoubles();
    doubles.api.respond('GET', LIST, {
      entries: [file('sources/notes.md'), file('sources/outline.md')],
    });
    doubles.api.respond('POST', SEARCH, PASSAGES);
    const harness = await render(doubles, '/projects/p1/files');

    typeInto(harness, 'gamma');
    await pause(300);
    await settle(harness);

    expect(toggleNamed(harness, 'Sources').getAttribute('aria-pressed')).toBe(
      'true',
    );
    expect(toggleNamed(harness, 'Entities').getAttribute('aria-pressed')).toBe(
      'true',
    );

    toggleNamed(harness, 'Sources').click();
    await settle(harness);
    expect(toggleNamed(harness, 'Sources').getAttribute('aria-pressed')).toBe(
      'false',
    );
    expect(toggleNamed(harness, 'Entities').getAttribute('aria-pressed')).toBe(
      'true',
    );

    toggleNamed(harness, 'Sources').click();
    await settle(harness);
    expect(toggleNamed(harness, 'Sources').getAttribute('aria-pressed')).toBe(
      'true',
    );

    toggleNamed(harness, 'Entities').click();
    await settle(harness);
    expect(toggleNamed(harness, 'Entities').getAttribute('aria-pressed')).toBe(
      'false',
    );
    expect(toggleNamed(harness, 'Sources').getAttribute('aria-pressed')).toBe(
      'true',
    );

    expect(posts(doubles).map((request) => request.body)).toStrictEqual([
      { query: 'gamma' },
      { query: 'gamma', scope: ['entities'] },
      { query: 'gamma' },
      { query: 'gamma', scope: ['sources'] },
    ]);
  });
});
