import { SecurityContext } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import type { SseEnvelope } from '@bbartolome/scriba-contracts/platform';
import { provideMarkdown, SANITIZE } from 'ngx-markdown';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { PROJECT_ROUTES } from '../../app.routes';
import { ApiError, type ApiPath } from '../../shell';
import {
  restoreMatchMedia,
  stubMatchMedia,
} from '../../shell/testing/match-media';
import {
  createShellTestDoubles,
  type ShellTestDoubles,
} from '../../shell/testing/test-doubles';
import { AppNav } from '../../shell/app-nav';
import { filesRoutes } from './project-store.routes';

const LIST: ApiPath = '/api/project-store/projects/p1/files';
const READ: ApiPath = '/api/project-store/projects/p1/file';
const LIST_PARAMS = { path: '.', recursive: 'true' };
const MTIME = '2026-11-14T09:00:00Z';
const HASH = `sha256:${'a'.repeat(64)}`;

const OUTLINE = '# Outline\n\nThe rain began at noon.\n';

function dir(path: string) {
  return { path, kind: 'dir', size: 0, mtime: MTIME };
}

function file(path: string) {
  return { path, kind: 'file', size: 10, mtime: MTIME };
}

/** The eight entries of T1: a sibling pair whose names share a prefix, and a dot-directory. */
const TREE = [
  dir('drafts'),
  file('drafts/ch1.md'),
  dir('drafts-old'),
  file('drafts-old/ch0.md'),
  dir('sources'),
  file('sources/outline.md'),
  dir('.scriba'),
  file('.scriba/state.json'),
];

function read(path: string, content: string) {
  return { path, content, hash: HASH, mtime: MTIME };
}

beforeEach(() => {
  stubMatchMedia(1280, 800);
});

afterEach(() => {
  restoreMatchMedia();
});

function render(
  doubles: ShellTestDoubles,
  url: string,
): Promise<RouterTestingHarness> {
  TestBed.configureTestingModule({
    providers: [
      provideRouter([{ path: 'projects/:projectId/files', children: filesRoutes }]),
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

function root(harness: RouterTestingHarness): HTMLElement {
  const element = harness.routeNativeElement;
  expect(element).toBeDefined();
  return element as HTMLElement;
}

/** The names of the tree rows, in order. */
function rowNames(harness: RouterTestingHarness): string[] {
  return Array.from(
    root(harness).querySelectorAll('ul[aria-label="Project files"] li'),
  ).map((row) => row.textContent?.trim() ?? '');
}

/** The link of a file row, by its name. */
function linkNamed(
  harness: RouterTestingHarness,
  name: string,
): HTMLAnchorElement | undefined {
  return Array.from(root(harness).querySelectorAll('a')).find(
    (link) => link.textContent?.trim() === name,
  );
}

function countOf(doubles: ShellTestDoubles, path: ApiPath): number {
  return doubles.api.requests.filter((request) => request.path === path).length;
}

function push(
  doubles: ShellTestDoubles,
  envelope: { type: string; data: unknown },
  module: 'project-store' = 'project-store',
): void {
  const event: SseEnvelope = { module, ...envelope };
  doubles.events.push(event);
}

describe('FilesPage', () => {
  it('T1 the tree renders the project list, hides dot-entries and sorts by segment', async () => {
    const doubles = createShellTestDoubles();
    doubles.api.respond('GET', LIST, { entries: TREE });

    const harness = await render(doubles, '/projects/p1/files');

    expect(rowNames(harness)).toEqual([
      'drafts',
      'ch1.md',
      'drafts-old',
      'ch0.md',
      'sources',
      'outline.md',
    ]);
    expect(doubles.api.requests).toContainEqual({
      method: 'GET',
      path: LIST,
      params: LIST_PARAMS,
    });
  });

  it('T2 ?path= opens that file and marks its row as the current page', async () => {
    const doubles = createShellTestDoubles();
    doubles.api.respond('GET', LIST, { entries: TREE });
    doubles.api.respond(
      'GET',
      READ,
      read('sources/outline.md', OUTLINE),
    );

    const harness = await render(
      doubles,
      '/projects/p1/files?path=sources/outline.md',
    );

    expect(doubles.api.requests).toContainEqual({
      method: 'GET',
      path: READ,
      params: { path: 'sources/outline.md' },
    });
    expect(
      root(harness).querySelector('app-markdown-preview h1')?.textContent,
    ).toContain('Outline');
    expect(linkNamed(harness, 'outline.md')?.getAttribute('aria-current')).toBe(
      'page',
    );
  });

  it('T3 the preview renders Markdown', async () => {
    const doubles = createShellTestDoubles();
    doubles.api.respond('GET', LIST, { entries: TREE });
    doubles.api.respond(
      'GET',
      READ,
      read('sources/outline.md', '# Chapter One\n\n- first\n- second\n'),
    );

    const harness = await render(
      doubles,
      '/projects/p1/files?path=sources/outline.md',
    );

    const preview = root(harness).querySelector('app-markdown-preview');
    expect(preview?.querySelector('h1')?.textContent?.trim()).toBe(
      'Chapter One',
    );
    expect(
      Array.from(preview?.querySelectorAll('li') ?? []).map((item) =>
        item.textContent?.trim(),
      ),
    ).toEqual(['first', 'second']);
  });

  it('T4 a files-changed event refreshes the tree', async () => {
    const doubles = createShellTestDoubles();
    doubles.api.respond('GET', LIST, {
      entries: [dir('sources'), file('sources/outline.md')],
    });
    const harness = await render(doubles, '/projects/p1/files');
    expect(rowNames(harness)).toEqual(['sources', 'outline.md']);

    doubles.api.respond('GET', LIST, {
      entries: [
        dir('sources'),
        file('sources/outline.md'),
        file('sources/new.md'),
      ],
    });
    push(doubles, {
      type: 'files-changed',
      data: { projectId: 'p1', paths: ['sources/new.md'] },
    });
    await settle(harness);

    expect(rowNames(harness)).toContain('new.md');
    expect(countOf(doubles, LIST)).toBe(2);
  });

  it('T5 a files-changed event for another project does not refresh the tree', async () => {
    const doubles = createShellTestDoubles();
    doubles.api.respond('GET', LIST, { entries: TREE });
    const harness = await render(doubles, '/projects/p1/files');

    push(doubles, {
      type: 'files-changed',
      data: { projectId: 'p2', paths: ['sources/new.md'] },
    });
    await settle(harness);

    expect(countOf(doubles, LIST)).toBe(1);
  });

  it('T6 a files-changed event that names the open file reads it again', async () => {
    const doubles = createShellTestDoubles();
    doubles.api.respond('GET', LIST, { entries: TREE });
    doubles.api.respond('GET', READ, read('sources/outline.md', OUTLINE));
    const harness = await render(
      doubles,
      '/projects/p1/files?path=sources/outline.md',
    );

    doubles.api.respond(
      'GET',
      READ,
      read('sources/outline.md', '# Outline, revised\n'),
    );
    push(doubles, {
      type: 'files-changed',
      data: { projectId: 'p1', paths: ['sources/outline.md'] },
    });
    await settle(harness);

    expect(countOf(doubles, READ)).toBe(2);
    expect(
      root(harness).querySelector('app-markdown-preview h1')?.textContent,
    ).toContain('revised');
  });

  it('T7 a reconcile tick reads the tree and the open file again', async () => {
    const doubles = createShellTestDoubles();
    doubles.api.respond('GET', LIST, { entries: TREE });
    doubles.api.respond('GET', READ, read('sources/outline.md', OUTLINE));
    const harness = await render(
      doubles,
      '/projects/p1/files?path=sources/outline.md',
    );

    doubles.events.tick('reopen');
    await settle(harness);

    expect(countOf(doubles, LIST)).toBe(2);
    expect(countOf(doubles, READ)).toBe(2);
  });

  it.each([
    [404, 'PROJECT_NOT_FOUND', 'The file was not found.'],
    [413, 'PROJECT_FILE_TOO_LARGE', 'The file is larger than 5 MB.'],
    [415, 'PROJECT_NOT_TEXT', 'The file is not text.'],
  ])(
    'T8 a read refusal (%i %s) shows its message and no preview',
    async (status, code, message) => {
      const doubles = createShellTestDoubles();
      doubles.api.respond('GET', LIST, { entries: TREE });
      doubles.api.fail(
        'GET',
        READ,
        new ApiError(status, code, message),
      );

      const harness = await render(
        doubles,
        '/projects/p1/files?path=sources/outline.md',
      );

      expect(root(harness).querySelector('[role="alert"]')?.textContent).toBe(
        message,
      );
      expect(root(harness).querySelector('app-markdown-preview')).toBeNull();
    },
  );

  it('T9 on a phone the file shows in the read-only preview, with no editor', async () => {
    restoreMatchMedia();
    stubMatchMedia(390, 844);
    const doubles = createShellTestDoubles();
    doubles.api.respond('GET', LIST, { entries: TREE });
    doubles.api.respond('GET', READ, read('sources/outline.md', OUTLINE));

    const harness = await render(
      doubles,
      '/projects/p1/files?path=sources/outline.md',
    );

    expect(
      root(harness).querySelector('app-markdown-preview h1')?.textContent,
    ).toContain('Outline');
    expect(root(harness).querySelector('app-markdown-editor')).toBeNull();
    const saves = Array.from(root(harness).querySelectorAll('button')).filter(
      (button) => button.textContent?.trim() === 'Save',
    );
    expect(saves).toHaveLength(0);
  });

  it('T10 the page sends only GET requests', async () => {
    const doubles = createShellTestDoubles();
    doubles.api.respond('GET', LIST, { entries: TREE });
    doubles.api.respond('GET', READ, read('sources/outline.md', OUTLINE));
    const harness = await render(
      doubles,
      '/projects/p1/files?path=sources/outline.md',
    );

    push(doubles, {
      type: 'files-changed',
      data: { projectId: 'p1', paths: ['sources/outline.md'] },
    });
    doubles.events.tick('reopen');
    await settle(harness);

    expect(doubles.api.requests.length).toBeGreaterThan(0);
    expect(doubles.api.requests.every((request) => request.method === 'GET')).toBe(
      true,
    );
  });

  it('T11 the nav at 390 by 844 links the page as Files', async () => {
    restoreMatchMedia();
    stubMatchMedia(390, 844);
    const doubles = createShellTestDoubles();
    doubles.api.respond('GET', LIST, { entries: TREE });
    TestBed.configureTestingModule({
      providers: [
        provideRouter([{ path: 'projects/:projectId', children: PROJECT_ROUTES }]),
        provideMarkdown({
          sanitize: { provide: SANITIZE, useValue: SecurityContext.HTML },
        }),
        ...doubles.providers,
      ],
    });
    const harness = await RouterTestingHarness.create('/projects/p1/files');
    await settle(harness);

    const nav = TestBed.createComponent(AppNav);
    nav.detectChanges();
    await nav.whenStable();
    nav.detectChanges();

    const link = (nav.nativeElement as HTMLElement).querySelector(
      'a[href="/projects/p1/files"]',
    );
    expect(link?.textContent?.trim()).toBe('Files');
  });
});
