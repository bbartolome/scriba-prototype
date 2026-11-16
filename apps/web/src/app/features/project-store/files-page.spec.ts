import { SecurityContext } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, type Routes } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { EditorView } from '@codemirror/view';
import type { SseEnvelope } from '@bbartolome/scriba-contracts/platform';
import { provideMarkdown, SANITIZE } from 'ngx-markdown';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
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
    doubles.api.respond('GET', READ, read('sources/outline.md', OUTLINE));

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
    restoreMatchMedia();
    stubMatchMedia(390, 844);
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
    restoreMatchMedia();
    stubMatchMedia(390, 844);
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
      restoreMatchMedia();
      stubMatchMedia(390, 844);
      const doubles = createShellTestDoubles();
      doubles.api.respond('GET', LIST, { entries: TREE });
      doubles.api.fail('GET', READ, new ApiError(status, code, message));

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
    expect(
      doubles.api.requests.every((request) => request.method === 'GET'),
    ).toBe(true);
  });

  it('T11 the nav at 390 by 844 links the page as Files', async () => {
    restoreMatchMedia();
    stubMatchMedia(390, 844);
    const doubles = createShellTestDoubles();
    doubles.api.respond('GET', LIST, { entries: TREE });
    TestBed.configureTestingModule({
      providers: [
        provideRouter([
          { path: 'projects/:projectId', children: PROJECT_ROUTES },
        ]),
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
    // The link holds the icon's ligature (`folder`) and then the label in a span.
    expect(link?.querySelector('span')?.textContent?.trim()).toBe('Files');
  });

  it('F12 a draft file shows a Check grounding link to the chat; another file shows none', async () => {
    const doubles = createShellTestDoubles();
    doubles.api.respond('GET', LIST, { entries: TREE });
    doubles.api.respond('GET', READ, read('drafts/ch1.md', OUTLINE));
    const harness = await render(
      doubles,
      '/projects/p1/files?path=drafts/ch1.md',
    );

    const checks = Array.from(root(harness).querySelectorAll('a.check')).filter(
      (link) => link.textContent?.trim() === 'Check grounding',
    );
    expect(checks).toHaveLength(1);
    const href = new URL(
      checks[0]?.getAttribute('href') ?? '',
      'http://localhost',
    );
    expect(href.pathname).toBe('/projects/p1/chat');
    expect(href.searchParams.get('check')).toBe('drafts/ch1.md');
    expect(
      doubles.api.requests.every((request) => request.method === 'GET'),
    ).toBe(true);

    doubles.api.respond('GET', READ, read('sources/outline.md', OUTLINE));
    await harness.navigateByUrl('/projects/p1/files?path=sources/outline.md');
    await settle(harness);
    expect(root(harness).querySelector('a.check')).toBeNull();
  });
});

const WRITE: ApiPath = '/api/project-store/projects/p1/file/write';
const HASH2 = `sha256:${'b'.repeat(64)}`;
const CONFLICT_MESSAGE =
  'The file changed on disk since it was read. Reload it to see the new text.';
const CHANGED = '# Outline, changed elsewhere\n';
const FIRST_EDIT = 'The first edit.\n';
const SECOND_EDIT = 'The second edit.\n';
const THIRD_EDIT = 'The third edit.\n';

function renderWith(
  doubles: ShellTestDoubles,
  url: string,
  routes: Routes,
): Promise<RouterTestingHarness> {
  TestBed.configureTestingModule({
    providers: [
      provideRouter(routes),
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

/** One macrotask: the CDK delivers a media query change after a debounce of 0 ms. */
function macrotask(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

function editorElement(harness: RouterTestingHarness): HTMLElement {
  const element = root(harness).querySelector('app-markdown-editor');
  if (element === null) {
    throw new Error('No editor element.');
  }
  return element as HTMLElement;
}

/** The text in the editor's view, read through the view's public state. */
function documentOf(harness: RouterTestingHarness): string {
  return (
    EditorView.findFromDOM(editorElement(harness))?.state.doc.toString() ?? ''
  );
}

/** Inserts `text` at the end of the editor's document, through the view's public dispatch. */
function typeAtEnd(harness: RouterTestingHarness, text: string): void {
  const view = EditorView.findFromDOM(editorElement(harness));
  if (view === null) {
    throw new Error('No editor view.');
  }
  view.dispatch({ changes: { from: view.state.doc.length, insert: text } });
}

/** Clicks the editor's Save button and lets the view settle. */
async function clickSave(harness: RouterTestingHarness): Promise<void> {
  const save = Array.from(
    editorElement(harness).querySelectorAll('button'),
  ).find((button) => button.textContent?.trim() === 'Save');
  if (save === undefined) {
    throw new Error('No Save button.');
  }
  save.click();
  await settle(harness);
}

function writesOf(doubles: ShellTestDoubles) {
  return doubles.api.requests.filter(
    (request) => request.method === 'POST' && request.path === WRITE,
  );
}

describe('FilesPage with the editor (PST-34)', () => {
  it('E1 a save sends baseHash, and a write conflict shows the warning and keeps the text', async () => {
    const doubles = createShellTestDoubles();
    doubles.api.respond('GET', LIST, { entries: TREE });
    doubles.api.respond('GET', READ, read('sources/outline.md', OUTLINE));
    doubles.api.respond('POST', WRITE, {
      path: 'sources/outline.md',
      hash: HASH2,
      mtime: MTIME,
    });
    const harness = await render(
      doubles,
      '/projects/p1/files?path=sources/outline.md',
    );

    typeAtEnd(harness, FIRST_EDIT);
    await clickSave(harness);
    expect(writesOf(doubles)[0]?.body).toEqual({
      path: 'sources/outline.md',
      content: OUTLINE + FIRST_EDIT,
      baseHash: HASH,
    });

    typeAtEnd(harness, SECOND_EDIT);
    await clickSave(harness);
    expect(writesOf(doubles)[1]?.body).toEqual({
      path: 'sources/outline.md',
      content: OUTLINE + FIRST_EDIT + SECOND_EDIT,
      baseHash: HASH2,
    });

    doubles.api.fail(
      'POST',
      WRITE,
      new ApiError(409, 'PROJECT_WRITE_CONFLICT', CONFLICT_MESSAGE),
    );
    typeAtEnd(harness, THIRD_EDIT);
    await clickSave(harness);

    expect(
      editorElement(harness).querySelector('[role="status"]')?.textContent,
    ).toBe('Not saved: the file changed elsewhere');
    expect(
      editorElement(harness).querySelector('[role="alert"]')?.textContent,
    ).toBe(CONFLICT_MESSAGE);
    expect(documentOf(harness)).toBe(
      OUTLINE + FIRST_EDIT + SECOND_EDIT + THIRD_EDIT,
    );
  });

  it('E2 on a tablet the file shows in the split view with the editor', async () => {
    restoreMatchMedia();
    stubMatchMedia(820, 1180);
    const doubles = createShellTestDoubles();
    doubles.api.respond('GET', LIST, { entries: TREE });
    doubles.api.respond('GET', READ, read('sources/outline.md', OUTLINE));

    const harness = await render(
      doubles,
      '/projects/p1/files?path=sources/outline.md',
    );

    expect(root(harness).querySelector('app-editor-layout')).not.toBeNull();
    expect(
      root(harness).querySelector('section[aria-label="Source"]'),
    ).not.toBeNull();
    expect(
      root(harness).querySelector('section[aria-label="Preview"]'),
    ).not.toBeNull();
    expect(editorElement(harness)).not.toBeNull();
  });

  it('E3 leaving the page with unsaved text saves first, with no prompt', async () => {
    const doubles = createShellTestDoubles();
    doubles.api.respond('GET', LIST, { entries: TREE });
    doubles.api.respond('GET', READ, read('sources/outline.md', OUTLINE));
    doubles.api.respond('POST', WRITE, {
      path: 'sources/outline.md',
      hash: HASH2,
      mtime: MTIME,
    });
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
    const harness = await renderWith(
      doubles,
      '/projects/p1/files?path=sources/outline.md',
      [
        { path: 'projects/:projectId/files', children: filesRoutes },
        { path: 'elsewhere', children: [] },
      ],
    );

    typeAtEnd(harness, FIRST_EDIT);
    await harness.navigateByUrl('/elsewhere');
    await settle(harness);

    expect(writesOf(doubles)).toEqual([
      {
        method: 'POST',
        path: WRITE,
        body: {
          path: 'sources/outline.md',
          content: OUTLINE + FIRST_EDIT,
          baseHash: HASH,
        },
      },
    ]);
    expect(confirm).not.toHaveBeenCalled();
    confirm.mockRestore();
  });

  it('E4 an unreadable file on desktop shows the page alert, no preview and no editor', async () => {
    const doubles = createShellTestDoubles();
    doubles.api.respond('GET', LIST, { entries: TREE });
    doubles.api.fail(
      'GET',
      READ,
      new ApiError(
        413,
        'PROJECT_FILE_TOO_LARGE',
        'The file is larger than 5 MB.',
      ),
    );

    const harness = await render(
      doubles,
      '/projects/p1/files?path=sources/outline.md',
    );

    const pageAlert = Array.from(
      root(harness).querySelectorAll('[role="alert"]'),
    ).find((element) => element.closest('div.editor') === null);
    expect(pageAlert?.textContent).toBe('The file is larger than 5 MB.');
    const wrapper = root(harness).querySelector('div.editor');
    expect(wrapper === null || wrapper.hasAttribute('hidden')).toBe(true);
    expect(
      Array.from(root(harness).querySelectorAll('app-markdown-preview')).filter(
        (element) => element.closest('div.editor') === null,
      ),
    ).toHaveLength(0);
    expect(writesOf(doubles)).toHaveLength(0);
  });

  it('E5 a files-changed event for the open file does not reload the editor on desktop', async () => {
    const doubles = createShellTestDoubles();
    doubles.api.respond('GET', LIST, { entries: TREE });
    doubles.api.respond('GET', READ, read('sources/outline.md', OUTLINE));
    const harness = await render(
      doubles,
      '/projects/p1/files?path=sources/outline.md',
    );
    const readsBefore = countOf(doubles, READ);

    doubles.api.respond('GET', READ, read('sources/outline.md', CHANGED));
    push(doubles, {
      type: 'files-changed',
      data: { projectId: 'p1', paths: ['sources/outline.md'] },
    });
    await settle(harness);

    // The page's own read of the open file is the one extra read; the editor is not read again.
    expect(countOf(doubles, READ)).toBe(readsBefore + 1);
    expect(documentOf(harness)).toBe(OUTLINE);
    expect(
      Array.from(root(harness).querySelectorAll('app-markdown-preview')).filter(
        (element) => element.closest('div.editor') === null,
      ),
    ).toHaveLength(0);
    expect(writesOf(doubles)).toHaveLength(0);
  });

  it('E6 a class drop to phone keeps the editor text, and a rise shows the same editor', async () => {
    restoreMatchMedia();
    const resize = stubMatchMedia(1280, 800);
    const doubles = createShellTestDoubles();
    doubles.api.respond('GET', LIST, { entries: TREE });
    doubles.api.respond('GET', READ, read('sources/outline.md', OUTLINE));
    doubles.api.respond('POST', WRITE, {
      path: 'sources/outline.md',
      hash: HASH2,
      mtime: MTIME,
    });
    const harness = await render(
      doubles,
      '/projects/p1/files?path=sources/outline.md',
    );

    typeAtEnd(harness, FIRST_EDIT);
    resize(390, 844);
    await macrotask();
    await settle(harness);

    expect(
      root(harness).querySelector('div.editor')?.hasAttribute('hidden'),
    ).toBe(true);
    expect(
      root(harness).querySelector('app-markdown-preview h1')?.textContent,
    ).toContain('Outline');
    expect(documentOf(harness)).toBe(OUTLINE + FIRST_EDIT);

    resize(1280, 800);
    await macrotask();
    await settle(harness);

    expect(
      root(harness).querySelector('div.editor')?.hasAttribute('hidden'),
    ).toBe(false);
    expect(documentOf(harness)).toBe(OUTLINE + FIRST_EDIT);
    await clickSave(harness);
    expect(writesOf(doubles)).toEqual([
      {
        method: 'POST',
        path: WRITE,
        body: {
          path: 'sources/outline.md',
          content: OUTLINE + FIRST_EDIT,
          baseHash: HASH,
        },
      },
    ]);
  });

  it('E7 removing ?path= keeps the editor text, and a new file flushes it first', async () => {
    const doubles = createShellTestDoubles();
    doubles.api.respond('GET', LIST, { entries: TREE });
    doubles.api.respond('GET', READ, read('sources/outline.md', OUTLINE));
    doubles.api.respond('POST', WRITE, {
      path: 'sources/outline.md',
      hash: HASH2,
      mtime: MTIME,
    });
    const harness = await renderWith(
      doubles,
      '/projects/p1/files?path=sources/outline.md',
      [{ path: 'projects/:projectId/files', children: filesRoutes }],
    );

    typeAtEnd(harness, FIRST_EDIT);
    await harness.navigateByUrl('/projects/p1/files');
    await settle(harness);

    expect(root(harness).textContent).toContain('Choose a file in the tree');
    expect(
      root(harness).querySelector('div.editor')?.hasAttribute('hidden'),
    ).toBe(true);
    expect(documentOf(harness)).toBe(OUTLINE + FIRST_EDIT);

    await harness.navigateByUrl('/projects/p1/files?path=drafts/ch1.md');
    await settle(harness);

    const requests = doubles.api.requests;
    const save = requests.findIndex(
      (request) =>
        request.method === 'POST' &&
        request.path === WRITE &&
        (request.body as { path?: string } | undefined)?.path ===
          'sources/outline.md',
    );
    expect(save).toBeGreaterThanOrEqual(0);
    expect(requests[save]?.body).toEqual({
      path: 'sources/outline.md',
      content: OUTLINE + FIRST_EDIT,
      baseHash: HASH,
    });
    const readAfterSave = requests.findIndex(
      (request, index) =>
        index > save &&
        request.method === 'GET' &&
        request.path === READ &&
        request.params?.['path'] === 'drafts/ch1.md',
    );
    expect(readAfterSave).toBeGreaterThan(save);
  });
});
