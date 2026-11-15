import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router, type Routes } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { EditorView } from '@codemirror/view';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError, CLIENT_ERROR_CODES } from './api-error';
import { MarkdownEditor, unsavedTextGuard } from './index';
import { FakeApiClient } from './testing/test-doubles';
import { API_CLIENT } from './tokens';

const PROJECT_ID = 'book';
const PATH = 'drafts/ch01.md';
const READ_PATH = '/api/project-store/projects/book/file';
const WRITE_PATH = '/api/project-store/projects/book/file/write';
const READ_HASH = `sha256:${'a'.repeat(64)}`;
const WRITE_HASH = `sha256:${'b'.repeat(64)}`;
const MTIME = '2026-11-14T10:00:00Z';

@Component({
  imports: [MarkdownEditor],
  template: `<app-markdown-editor [reference]="reference" />`,
})
class DraftPage {
  readonly reference = { projectId: PROJECT_ID, path: PATH };
}

@Component({ template: `<p>Elsewhere</p>` })
class ElsewherePage {}

const ROUTES: Routes = [
  { path: 'draft', component: DraftPage, canDeactivate: [unsavedTextGuard] },
  { path: 'elsewhere', component: ElsewherePage },
];

let api: FakeApiClient;

beforeEach(() => {
  api = new FakeApiClient();
  api.respond('GET', READ_PATH, {
    path: PATH,
    content: 'alpha\n',
    hash: READ_HASH,
    mtime: MTIME,
  });
  api.respond('POST', WRITE_PATH, {
    path: PATH,
    hash: WRITE_HASH,
    mtime: MTIME,
  });
  TestBed.configureTestingModule({
    providers: [provideRouter(ROUTES), { provide: API_CLIENT, useValue: api }],
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

/** The editor view of the rendered route. */
function editorViewOf(harness: RouterTestingHarness): EditorView {
  harness.detectChanges();
  const element = harness.routeNativeElement;
  const view =
    element === undefined || element === null
      ? null
      : EditorView.findFromDOM(element);
  if (view === null) {
    throw new Error('No editor view.');
  }
  return view;
}

/** Inserts `text` at the end of the first line, through the view's public dispatch. */
function insertOnFirstLine(harness: RouterTestingHarness, text: string): void {
  const view = editorViewOf(harness);
  const line = view.state.doc.line(1);
  view.dispatch({ changes: { from: line.to, insert: text } });
}

function editorText(harness: RouterTestingHarness): string {
  return editorViewOf(harness).state.doc.toString();
}

describe('unsaved text guard', () => {
  it('navigating away with a save that fails prompts, and Cancel keeps the page', async () => {
    api.fail(
      'POST',
      WRITE_PATH,
      new ApiError(
        0,
        CLIENT_ERROR_CODES.NETWORK,
        'Could not reach the server.',
      ),
    );
    const harness = await RouterTestingHarness.create('/draft');
    const router = TestBed.inject(Router);
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
    insertOnFirstLine(harness, 'X');

    await router.navigateByUrl('/elsewhere');

    expect(router.url).toBe('/draft');
    expect(confirm).toHaveBeenCalledTimes(1);
    expect(editorText(harness)).toBe('alphaX\n');

    confirm.mockReturnValue(true);
    await router.navigateByUrl('/elsewhere');

    expect(router.url).toBe('/elsewhere');
  });

  it('navigating away after a save that succeeds does not prompt', async () => {
    const harness = await RouterTestingHarness.create('/draft');
    const router = TestBed.inject(Router);
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
    insertOnFirstLine(harness, 'X');

    await router.navigateByUrl('/elsewhere');

    expect(confirm).not.toHaveBeenCalled();
    expect(router.url).toBe('/elsewhere');
    const writes = api.requests.filter((request) => request.method === 'POST');
    expect(writes).toEqual([
      {
        method: 'POST',
        path: WRITE_PATH,
        body: { path: PATH, content: 'alphaX\n', baseHash: READ_HASH },
      },
    ]);
  });

  it('a clean editor does not prompt on navigation or on close', async () => {
    await RouterTestingHarness.create('/draft');
    const router = TestBed.inject(Router);
    const confirm = vi.spyOn(window, 'confirm');

    const beforeNavigation = new Event('beforeunload', { cancelable: true });
    window.dispatchEvent(beforeNavigation);
    expect(beforeNavigation.defaultPrevented).toBe(false);

    await router.navigateByUrl('/elsewhere');

    expect(confirm).not.toHaveBeenCalled();
    expect(router.url).toBe('/elsewhere');
    const unload = new Event('beforeunload', { cancelable: true });
    window.dispatchEvent(unload);
    expect(unload.defaultPrevented).toBe(false);
  });
});
