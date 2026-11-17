import { SecurityContext } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import type { SseEnvelope } from '@bbartolome/scriba-contracts/platform';
import { provideMarkdown, SANITIZE } from 'ngx-markdown';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { ApiError, type ApiPath } from '../../shell';
import {
  restoreMatchMedia,
  stubMatchMedia,
} from '../../shell/testing/match-media';
import {
  createShellTestDoubles,
  type ShellTestDoubles,
} from '../../shell/testing/test-doubles';
import { filesRoutes } from './project-store.routes';

const LIST: ApiPath = '/api/project-store/projects/p1/files';
const READ: ApiPath = '/api/project-store/projects/p1/file';
const VERSIONS: ApiPath = '/api/project-store/projects/p1/versions';
const VERSION_READ: ApiPath = '/api/project-store/projects/p1/versions/read';
const RESTORE: ApiPath = '/api/project-store/projects/p1/versions/restore';
const MTIME = '2026-11-14T09:00:00Z';

const v2 = {
  id: '20261104T231500124Z.md',
  createdAt: '2026-11-04T23:15:00.124Z',
  size: 11,
};
const v1 = {
  id: '20261104T231500123Z.md',
  createdAt: '2026-11-04T23:15:00.123Z',
  size: 8,
};

beforeEach(() => {
  stubMatchMedia(1280, 800);
});

afterEach(() => {
  restoreMatchMedia();
});

/** The files of the project, and the draft's current text, answered for every render. */
function answerPage(doubles: ShellTestDoubles, path = 'drafts/ch1.md'): void {
  doubles.api.respond('GET', LIST, {
    entries: [
      { path: 'drafts', kind: 'dir', size: 0, mtime: MTIME },
      { path: path, kind: 'file', size: 10, mtime: MTIME },
    ],
  });
  doubles.api.respond('GET', READ, {
    path,
    content: 'Current\n',
    hash: `sha256:${'a'.repeat(64)}`,
    mtime: MTIME,
  });
}

/** The versions of the draft, newest first, and the text of an old version. */
function answerVersions(doubles: ShellTestDoubles): void {
  doubles.api.respond('GET', VERSIONS, {
    draftPath: 'drafts/ch1.md',
    versions: [v2, v1],
  });
  doubles.api.respond('GET', VERSION_READ, {
    draftPath: 'drafts/ch1.md',
    id: v2.id,
    content: 'Old one\n',
  });
  doubles.api.respond('POST', RESTORE, {
    draftPath: 'drafts/ch1.md',
    id: v2.id,
    content: 'Old one\n',
  });
}

function render(
  doubles: ShellTestDoubles,
  url = '/projects/p1/files?path=drafts/ch1.md',
): Promise<RouterTestingHarness> {
  TestBed.resetTestingModule();
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

function countOf(doubles: ShellTestDoubles, path: ApiPath): number {
  return doubles.api.requests.filter((request) => request.path === path).length;
}

function postsOf(doubles: ShellTestDoubles): number {
  return doubles.api.requests.filter((request) => request.method === 'POST')
    .length;
}

/** The text of the version rows, in order. */
function rowTexts(harness: RouterTestingHarness): string[] {
  return Array.from(
    root(harness).querySelectorAll('ul[aria-label="Versions"] li'),
  ).map((row) => row.textContent?.trim() ?? '');
}

/** The button with this text, if it is on the page. */
function buttonNamed(
  harness: RouterTestingHarness,
  name: string,
): HTMLButtonElement | undefined {
  return Array.from(root(harness).querySelectorAll('button')).find(
    (button) => button.textContent?.trim() === name,
  );
}

function clickButton(
  harness: RouterTestingHarness,
  name: string,
): Promise<void> {
  const button = buttonNamed(harness, name);
  expect(button).toBeDefined();
  button?.click();
  return settle(harness);
}

function clickFirstVersion(harness: RouterTestingHarness): Promise<void> {
  const first = root(harness).querySelector<HTMLButtonElement>(
    'ul[aria-label="Versions"] li button',
  );
  expect(first).not.toBeNull();
  first?.click();
  return settle(harness);
}

function push(
  doubles: ShellTestDoubles,
  envelope: { type: string; data: unknown },
): void {
  const event: SseEnvelope = { module: 'project-store', ...envelope };
  doubles.events.push(event);
}

describe('VersionHistory', () => {
  it('H1 lists the versions newest first, and asks for the draft list', async () => {
    const doubles = createShellTestDoubles();
    answerPage(doubles);
    answerVersions(doubles);
    const harness = await render(doubles);

    expect(rowTexts(harness)).toEqual([
      '2026-11-04T23:15:00.124Z, 11 bytes',
      '2026-11-04T23:15:00.123Z, 8 bytes',
    ]);
    expect(doubles.api.requests).toContainEqual({
      method: 'GET',
      path: VERSIONS,
      params: { draftPath: 'drafts/ch1.md' },
    });
  });

  it('H2 selecting a version shows the diff against the current draft, and sends no POST', async () => {
    const doubles = createShellTestDoubles();
    answerPage(doubles);
    answerVersions(doubles);
    const harness = await render(doubles);

    await clickFirstVersion(harness);

    expect(doubles.api.requests).toContainEqual({
      method: 'GET',
      path: VERSION_READ,
      params: { draftPath: 'drafts/ch1.md', id: v2.id },
    });
    const diff = root(harness).querySelector(
      'section[aria-label="Changes to drafts/ch1.md"]',
    );
    expect(diff).not.toBeNull();
    expect(root(harness).querySelector('.cm-merge-a')?.textContent).toContain(
      'Current',
    );
    expect(root(harness).querySelector('.cm-merge-b')?.textContent).toContain(
      'Old one',
    );
    expect(
      root(harness)
        .querySelector('ul[aria-label="Versions"] li button')
        ?.getAttribute('aria-pressed'),
    ).toBe('true');
    expect(postsOf(doubles)).toBe(0);
  });

  it('H3 restore asks for confirmation, sends one POST, then refreshes', async () => {
    const doubles = createShellTestDoubles();
    answerPage(doubles);
    answerVersions(doubles);
    const harness = await render(doubles);
    await clickFirstVersion(harness);

    await clickButton(harness, 'Restore this version');
    expect(postsOf(doubles)).toBe(0);
    expect(buttonNamed(harness, 'Confirm restore')).toBeDefined();

    const readsBefore = countOf(doubles, READ);
    await clickButton(harness, 'Confirm restore');

    const posts = doubles.api.requests.filter((r) => r.method === 'POST');
    expect(posts).toEqual([
      {
        method: 'POST',
        path: RESTORE,
        body: { draftPath: 'drafts/ch1.md', id: v2.id },
      },
    ]);
    expect(countOf(doubles, VERSIONS)).toBe(2);
    expect(countOf(doubles, READ)).toBe(readsBefore + 1);
    expect(buttonNamed(harness, 'Confirm restore')).toBeUndefined();
  });

  it('H4 refreshes on files-changed for its project and on a reconcile tick', async () => {
    const doubles = createShellTestDoubles();
    answerPage(doubles);
    answerVersions(doubles);
    const harness = await render(doubles);
    expect(countOf(doubles, VERSIONS)).toBe(1);

    push(doubles, {
      type: 'files-changed',
      data: { projectId: 'p1', paths: ['drafts/ch1.md'] },
    });
    await settle(harness);
    expect(countOf(doubles, VERSIONS)).toBe(2);

    push(doubles, {
      type: 'files-changed',
      data: { projectId: 'p2', paths: ['drafts/ch1.md'] },
    });
    await settle(harness);
    expect(countOf(doubles, VERSIONS)).toBe(2);

    doubles.events.tick('visible');
    await settle(harness);
    expect(countOf(doubles, VERSIONS)).toBe(3);
  });

  it('H5 at phone width the history is read-only: the diff shows and no restore is offered', async () => {
    restoreMatchMedia();
    stubMatchMedia(390, 844);
    const doubles = createShellTestDoubles();
    answerPage(doubles);
    answerVersions(doubles);
    const harness = await render(doubles);

    await clickFirstVersion(harness);

    const diff = root(harness).querySelector(
      'section[aria-label="Changes to drafts/ch1.md"]',
    );
    expect(diff?.textContent).toContain('Current');
    expect(diff?.textContent).toContain('Old one');
    expect(
      root(harness)
        .querySelector('[role="radio"][aria-checked="true"]')
        ?.textContent?.trim(),
    ).toBe('Unified');
    expect(buttonNamed(harness, 'Restore this version')).toBeUndefined();
    expect(postsOf(doubles)).toBe(0);
  });

  it('H6 a failed restore shows its message, closes the confirmation, and does not refresh', async () => {
    const doubles = createShellTestDoubles();
    answerPage(doubles);
    answerVersions(doubles);
    doubles.api.fail(
      'POST',
      RESTORE,
      new ApiError(409, 'PROJECT_NOT_ACTIVE', 'The project is not active.'),
    );
    const harness = await render(doubles);
    await clickFirstVersion(harness);
    await clickButton(harness, 'Restore this version');

    await clickButton(harness, 'Confirm restore');

    const alert = root(harness).querySelector('[role="alert"]');
    expect(alert?.textContent?.trim()).toBe('The project is not active.');
    expect(buttonNamed(harness, 'Confirm restore')).toBeUndefined();
    expect(countOf(doubles, VERSIONS)).toBe(1);
  });

  it('H7 an empty list says so, and a failed list shows its message with no rows', async () => {
    const empty = createShellTestDoubles();
    answerPage(empty);
    empty.api.respond('GET', VERSIONS, {
      draftPath: 'drafts/ch1.md',
      versions: [],
    });
    const emptyHarness = await render(empty);
    expect(rowTexts(emptyHarness)).toEqual([]);
    expect(root(emptyHarness).textContent).toContain('No versions yet.');

    const failed = createShellTestDoubles();
    answerPage(failed);
    failed.api.fail(
      'GET',
      VERSIONS,
      new ApiError(404, 'PROJECT_NOT_FOUND', 'No such draft.'),
    );
    const failedHarness = await render(failed);
    expect(rowTexts(failedHarness)).toEqual([]);
    expect(
      root(failedHarness).querySelector('[role="alert"]')?.textContent?.trim(),
    ).toBe('No such draft.');
    expect(root(failedHarness).textContent).not.toContain('No versions yet.');
  });

  it('H8 a file that is not a top-level draft shows no history and makes no versions request', async () => {
    for (const path of ['sources/outline.md', 'drafts/sub/ch1.md']) {
      const doubles = createShellTestDoubles();
      answerPage(doubles, path);
      answerVersions(doubles);
      const harness = await render(
        doubles,
        `/projects/p1/files?path=${encodeURIComponent(path)}`,
      );
      expect(countOf(doubles, VERSIONS)).toBe(0);
      expect(
        root(harness).querySelector('ul[aria-label="Versions"]'),
      ).toBeNull();
    }
  });
});
