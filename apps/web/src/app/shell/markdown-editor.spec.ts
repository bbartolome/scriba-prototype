import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { EditorView } from '@codemirror/view';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { map, type Observable, Subject } from 'rxjs';
import { parseResponse, type ApiPath, type ResponseSchema } from './api-client';
import { ApiError, CLIENT_ERROR_CODES } from './api-error';
import { MarkdownEditor } from './index';
import { FakeApiClient } from './testing/test-doubles';
import { API_CLIENT } from './tokens';

const PROJECT_ID = 'book';
const PATH = 'drafts/ch01.md';
const READ_PATH = '/api/project-store/projects/book/file';
const WRITE_PATH = '/api/project-store/projects/book/file/write';
const READ_HASH = `sha256:${'a'.repeat(64)}`;
const WRITE_HASH = `sha256:${'b'.repeat(64)}`;
const MTIME = '2026-11-14T10:00:00Z';

// The round-trip fixtures (criterion 1). Each is an escape sequence, so no raw CR, LF-only text or BOM byte is in this file.
const FIXTURES: readonly { name: string; raw: string }[] = [
  {
    name: 'YAML front matter',
    raw: '---\ntitle: The Long Road\nstatus: draft\n---\n\n# Chapter One\n\nText.\n',
  },
  {
    name: 'underscore and star emphasis',
    raw: '_emphasis_ text\n*emphasis* text\n',
  },
  {
    name: 'CRLF endings',
    raw: '# Chapter One\r\n\r\nFirst paragraph.\r\nSecond line.\r\n',
  },
  {
    name: 'mixed endings, CRLF dominant',
    raw: '# Chapter One\r\n\r\nFirst paragraph.\nSecond line.\r\nThird line.\n',
  },
  {
    name: 'mixed endings, LF dominant',
    raw: 'alpha\nbeta\r\ngamma\ndelta\n',
  },
  {
    name: 'no trailing newline',
    raw: '# Chapter One\n\nLast line with no newline',
  },
  { name: 'CRLF with no trailing newline', raw: 'one\r\ntwo' },
  {
    name: 'leading BOM',
    raw: '\u{FEFF}# Chapter One\n\nText.\n',
  },
  {
    name: 'trailing whitespace',
    raw: 'Trailing spaces.   \nTab\t\n\n',
  },
  { name: 'lone carriage return', raw: 'alpha\rbeta\n' },
  { name: 'empty file', raw: '' },
  { name: 'only a newline', raw: '\n' },
];

@Component({
  imports: [MarkdownEditor],
  template: `
    <app-markdown-editor
      [reference]="reference"
      [readOnly]="readOnly"
      (contentChange)="content = $event"
      (dirtyChange)="dirty = $event"
      (saveStateChange)="saveState = $event"
      (errorChange)="error = $event"
    />
  `,
})
class EditorHost {
  reference = { projectId: PROJECT_ID, path: PATH };
  readOnly = false;
  content: string | undefined;
  dirty: boolean | undefined;
  saveState: string | undefined;
  error: string | null | undefined;
}

interface RenderOptions {
  raw?: string;
  readOnly?: boolean;
  readError?: ApiError;
  client?: FakeApiClient;
}

interface Rendered {
  fixture: ComponentFixture<EditorHost>;
  host: EditorHost;
  api: FakeApiClient;
}

/** Renders the host with a fake API client that answers the read with `raw`, or fails it. */
async function render(options: RenderOptions): Promise<Rendered> {
  const api = options.client ?? new FakeApiClient();
  if (options.readError !== undefined) {
    api.fail('GET', READ_PATH, options.readError);
  } else {
    api.respond('GET', READ_PATH, {
      path: PATH,
      content: options.raw ?? '',
      hash: READ_HASH,
      mtime: MTIME,
    });
  }
  api.respond('POST', WRITE_PATH, {
    path: PATH,
    hash: WRITE_HASH,
    mtime: MTIME,
  });
  await TestBed.configureTestingModule({
    imports: [EditorHost],
    providers: [{ provide: API_CLIENT, useValue: api }],
  }).compileComponents();
  const fixture = TestBed.createComponent(EditorHost);
  fixture.componentInstance.readOnly = options.readOnly ?? false;
  fixture.detectChanges();
  return { fixture, host: fixture.componentInstance, api };
}

function root(fixture: ComponentFixture<EditorHost>): HTMLElement {
  return fixture.nativeElement as HTMLElement;
}

function saveButton(fixture: ComponentFixture<EditorHost>): HTMLButtonElement {
  const button = root(fixture).querySelector<HTMLButtonElement>('button');
  if (button === null) {
    throw new Error('No Save button.');
  }
  return button;
}

function contentElement(fixture: ComponentFixture<EditorHost>): HTMLElement {
  const content = root(fixture).querySelector<HTMLElement>('.cm-content');
  if (content === null) {
    throw new Error('No editor content element.');
  }
  return content;
}

/** The text of the last request that reached the fake client, as a write sends it. */
function writtenContent(api: FakeApiClient): unknown {
  const body = api.requests[api.requests.length - 1]?.body as
    { content?: unknown } | undefined;
  return body?.content;
}

/** Clicks Save and lets the view settle. */
function save(fixture: ComponentFixture<EditorHost>): void {
  saveButton(fixture).click();
  fixture.detectChanges();
}

/** Inserts `text` at the end of a line, through the view's public dispatch. */
function insertAtLineEnd(
  fixture: ComponentFixture<EditorHost>,
  lineNumber: number,
  text: string,
): void {
  const view = EditorView.findFromDOM(root(fixture));
  if (view === null) {
    throw new Error('No editor view.');
  }
  const line = view.state.doc.line(lineNumber);
  view.dispatch({ changes: { from: line.to, insert: text } });
}

describe('MarkdownEditor', () => {
  it.each(FIXTURES)(
    'saves $name with no edits byte for byte',
    async ({ raw }) => {
      const { fixture, api } = await render({ raw });
      expect(api.requests).toEqual([
        { method: 'GET', path: READ_PATH, params: { path: PATH } },
      ]);

      save(fixture);

      expect(api.requests[api.requests.length - 1]).toEqual({
        method: 'POST',
        path: WRITE_PATH,
        body: { path: PATH, content: raw, baseHash: READ_HASH },
      });
    },
  );

  it('changes only the inserted text in a CRLF file', async () => {
    const { fixture, api } = await render({ raw: 'alpha\r\nbeta\r\n' });

    insertAtLineEnd(fixture, 1, 'X');
    save(fixture);

    expect(writtenContent(api)).toBe('alphaX\r\nbeta\r\n');
  });

  it('changes only the inserted text in a mixed-endings file', async () => {
    const { fixture, api } = await render({ raw: 'alpha\r\nbeta\ngamma\r\n' });

    insertAtLineEnd(fixture, 2, 'X');
    save(fixture);

    expect(writtenContent(api)).toBe('alpha\r\nbeta\ngammaX\r\n');
  });

  it('a read-only editor takes no edits and cannot be saved', async () => {
    const { fixture } = await render({ raw: 'alpha\n', readOnly: true });

    expect(contentElement(fixture).getAttribute('contenteditable')).toBe(
      'false',
    );
    expect(saveButton(fixture).disabled).toBe(true);
  });

  it('an editable editor takes edits', async () => {
    const { fixture, host } = await render({ raw: 'alpha\n' });

    expect(contentElement(fixture).getAttribute('contenteditable')).toBe(
      'true',
    );
    insertAtLineEnd(fixture, 1, 'X');

    expect(host.dirty).toBe(true);
  });

  it('reports the text, dirty state and save state through its outputs', async () => {
    const { fixture, host, api } = await render({
      raw: '# Chapter One\n\nText.\n',
    });
    expect(host.content).toBe('# Chapter One\n\nText.\n');
    expect(host.dirty).toBe(false);
    expect(host.saveState).toBe('saved');

    insertAtLineEnd(fixture, 1, 'X');
    expect(host.dirty).toBe(true);
    expect(host.saveState).toBe('unsaved');

    save(fixture);
    expect(writtenContent(api)).toBe('# Chapter OneX\n\nText.\n');
    expect(host.dirty).toBe(false);
    expect(host.saveState).toBe('saved');
  });

  it('a failed read shows the typed error and no editor', async () => {
    const { fixture, host } = await render({
      readError: new ApiError(
        404,
        'PROJECT_NOT_FOUND',
        'The file was not found.',
      ),
    });

    expect(
      root(fixture).querySelector('[role="alert"]')?.textContent,
    ).toContain('The file was not found.');
    expect(root(fixture).querySelector('.cm-editor')).toBeNull();
    expect(host.error).toBe('The file was not found.');
  });
});

const H1 = `sha256:${'c'.repeat(64)}`;
const H2 = `sha256:${'d'.repeat(64)}`;

/**
 * A fake whose writes wait for the test. Each POST is one held request, numbered in the order the
 * editor sent it. The test answers it with `holdingRelease`, with a response body.
 */
class HoldingApiClient extends FakeApiClient {
  readonly held: Subject<unknown>[] = [];

  override post<T>(
    path: ApiPath,
    body: unknown,
    schema: ResponseSchema<T>,
  ): Observable<T> {
    const reply = new Subject<unknown>();
    this.requests.push({ method: 'POST', path, body });
    this.held.push(reply);
    return reply.pipe(map((response) => parseResponse(path, schema, response)));
  }
}

function holdingRelease(
  client: HoldingApiClient,
  index: number,
  body: unknown,
): void {
  const reply = client.held[index];
  if (reply === undefined) {
    throw new Error(`No held write ${index}.`);
  }
  reply.next(body);
  reply.complete();
}

/** A write response as the project store sends it. */
function writeResult(hash: string): unknown {
  return { path: PATH, hash, mtime: MTIME };
}

function postCount(api: FakeApiClient): number {
  return api.requests.filter((request) => request.method === 'POST').length;
}

/** The body of the last write that reached the fake client. */
function lastWrite(api: FakeApiClient): Record<string, unknown> {
  const posts = api.requests.filter((request) => request.method === 'POST');
  return (posts[posts.length - 1]?.body ?? {}) as Record<string, unknown>;
}

function statusText(fixture: ComponentFixture<EditorHost>): string {
  fixture.detectChanges();
  return (
    root(fixture).querySelector('[role="status"]')?.textContent?.trim() ?? ''
  );
}

function alertText(fixture: ComponentFixture<EditorHost>): string {
  fixture.detectChanges();
  return (
    root(fixture).querySelector('[role="alert"]')?.textContent?.trim() ?? ''
  );
}

function editorText(fixture: ComponentFixture<EditorHost>): string {
  const view = EditorView.findFromDOM(root(fixture));
  if (view === null) {
    throw new Error('No editor view.');
  }
  return view.state.doc.toString();
}

/** Dispatches a keydown on the editor content, bubbling as a browser key press does. */
function pressKey(
  fixture: ComponentFixture<EditorHost>,
  key: string,
  modifiers: KeyboardEventInit,
): void {
  contentElement(fixture).dispatchEvent(
    new KeyboardEvent('keydown', { key, bubbles: true, ...modifiers }),
  );
  fixture.detectChanges();
}

/** Advances the fake clock, then lets the view react to the timers. */
function advance(fixture: ComponentFixture<EditorHost>, ms: number): void {
  vi.advanceTimersByTime(ms);
  fixture.detectChanges();
}

describe('MarkdownEditor saving', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('a pause of 1.5 s after typing saves once', async () => {
    const { fixture, api } = await render({ raw: 'alpha\n' });

    insertAtLineEnd(fixture, 1, 'X');
    advance(fixture, 1499);
    expect(postCount(api)).toBe(0);

    advance(fixture, 1);
    expect(postCount(api)).toBe(1);
    expect(writtenContent(api)).toBe('alphaX\n');
  });

  it('each keystroke restarts the debounce', async () => {
    const { fixture, api } = await render({ raw: 'alpha\n' });

    insertAtLineEnd(fixture, 1, 'X');
    advance(fixture, 1000);
    insertAtLineEnd(fixture, 1, 'Y');
    advance(fixture, 1000);
    expect(postCount(api)).toBe(0);

    advance(fixture, 500);
    expect(postCount(api)).toBe(1);
    expect(writtenContent(api)).toBe('alphaXY\n');
  });

  it.each([
    ['Ctrl-S', { ctrlKey: true }],
    ['Cmd-S', { metaKey: true }],
  ])('%s saves at once', async (_name, modifier) => {
    const { fixture, api } = await render({ raw: 'alpha\n' });

    insertAtLineEnd(fixture, 1, 'X');
    pressKey(fixture, 's', modifier);
    expect(postCount(api)).toBe(1);

    advance(fixture, 1500);
    expect(postCount(api)).toBe(1);
  });

  it('the Save button saves at once', async () => {
    const { fixture, api } = await render({ raw: 'alpha\n' });

    insertAtLineEnd(fixture, 1, 'X');
    save(fixture);
    expect(postCount(api)).toBe(1);

    advance(fixture, 1500);
    expect(postCount(api)).toBe(1);
  });

  it('focus leaving the editor saves at once', async () => {
    const { fixture, api } = await render({ raw: 'alpha\n' });

    insertAtLineEnd(fixture, 1, 'X');
    contentElement(fixture).dispatchEvent(
      new FocusEvent('focusout', { bubbles: true, relatedTarget: null }),
    );
    fixture.detectChanges();
    expect(postCount(api)).toBe(1);
  });

  it('focus moving to Save does not save', async () => {
    const { fixture, api } = await render({ raw: 'alpha\n' });

    insertAtLineEnd(fixture, 1, 'X');
    contentElement(fixture).dispatchEvent(
      new FocusEvent('focusout', {
        bubbles: true,
        relatedTarget: saveButton(fixture),
      }),
    );
    fixture.detectChanges();
    expect(postCount(api)).toBe(0);
  });

  it('saves during an in-flight save coalesce into one follow-up', async () => {
    const client = new HoldingApiClient();
    const { fixture } = await render({ raw: 'alpha\n', client });

    insertAtLineEnd(fixture, 1, 'X');
    save(fixture);
    expect(postCount(client)).toBe(1);

    insertAtLineEnd(fixture, 1, 'Y');
    advance(fixture, 1500);
    save(fixture);
    pressKey(fixture, 's', { ctrlKey: true });
    expect(postCount(client)).toBe(1);

    holdingRelease(client, 0, writeResult(H1));
    fixture.detectChanges();
    expect(postCount(client)).toBe(2);
    expect(lastWrite(client)).toEqual({
      path: PATH,
      content: 'alphaXY\n',
      baseHash: H1,
    });

    holdingRelease(client, 1, writeResult(H2));
    fixture.detectChanges();
    advance(fixture, 5000);
    expect(postCount(client)).toBe(2);
  });

  it('the state moves unsaved, saving, saved', async () => {
    const client = new HoldingApiClient();
    const { fixture, host } = await render({ raw: 'alpha\n', client });

    insertAtLineEnd(fixture, 1, 'X');
    expect(host.saveState).toBe('unsaved');
    expect(statusText(fixture)).toBe('Unsaved changes');

    save(fixture);
    expect(host.saveState).toBe('saving');
    expect(statusText(fixture)).toBe('Saving...');

    holdingRelease(client, 0, writeResult(H1));
    fixture.detectChanges();
    expect(host.saveState).toBe('saved');
    expect(statusText(fixture)).toBe('Saved');
  });

  it('a failed write shows failed and keeps the text', async () => {
    const { fixture, host, api } = await render({ raw: 'alpha\n' });
    api.fail(
      'POST',
      WRITE_PATH,
      new ApiError(
        0,
        CLIENT_ERROR_CODES.NETWORK,
        'Could not reach the server.',
      ),
    );

    insertAtLineEnd(fixture, 1, 'X');
    advance(fixture, 1500);
    expect(host.saveState).toBe('failed');
    expect(alertText(fixture)).toBe('Could not reach the server.');
    expect(editorText(fixture)).toBe('alphaX\n');
    expect(host.dirty).toBe(true);

    insertAtLineEnd(fixture, 1, 'Y');
    expect(host.saveState).toBe('failed');

    api.respond('POST', WRITE_PATH, writeResult(H1));
    save(fixture);
    expect(lastWrite(api)).toEqual({
      path: PATH,
      content: 'alphaXY\n',
      baseHash: READ_HASH,
    });
    expect(host.saveState).toBe('saved');
  });

  it('a conflict shows conflict and never overwrites', async () => {
    const { fixture, host, api } = await render({ raw: 'alpha\n' });
    api.fail(
      'POST',
      WRITE_PATH,
      new ApiError(
        409,
        'PROJECT_WRITE_CONFLICT',
        'The file changed elsewhere.',
      ),
    );

    insertAtLineEnd(fixture, 1, 'X');
    advance(fixture, 1500);
    expect(host.saveState).toBe('conflict');
    expect(statusText(fixture)).toBe('Not saved: the file changed elsewhere');
    expect(alertText(fixture)).toBe('The file changed elsewhere.');

    insertAtLineEnd(fixture, 1, 'Y');
    advance(fixture, 5000);
    expect(host.saveState).toBe('conflict');
    expect(postCount(api)).toBe(1);
    expect(lastWrite(api)['baseHash']).toBe(READ_HASH);

    save(fixture);
    expect(postCount(api)).toBe(2);
    expect(lastWrite(api)['baseHash']).toBe(READ_HASH);
  });

  it('closing the tab with unsaved text prevents the unload', async () => {
    const { fixture } = await render({ raw: 'alpha\n' });

    insertAtLineEnd(fixture, 1, 'X');
    const unload = new Event('beforeunload', { cancelable: true });
    window.dispatchEvent(unload);
    expect(unload.defaultPrevented).toBe(true);

    save(fixture);
    const saved = new Event('beforeunload', { cancelable: true });
    window.dispatchEvent(saved);
    expect(saved.defaultPrevented).toBe(false);
  });

  it('the second save carries the hash returned by the first', async () => {
    const { fixture, api } = await render({ raw: 'alpha\n' });

    api.respond('POST', WRITE_PATH, writeResult(H1));
    insertAtLineEnd(fixture, 1, 'X');
    save(fixture);
    expect(lastWrite(api)['baseHash']).toBe(READ_HASH);

    api.respond('POST', WRITE_PATH, writeResult(H2));
    insertAtLineEnd(fixture, 1, 'Y');
    save(fixture);
    expect(lastWrite(api)['baseHash']).toBe(H1);
  });

  it('a reference change saves the old file first, then reads the new one', async () => {
    const { fixture, host, api } = await render({ raw: 'alpha\n' });

    insertAtLineEnd(fixture, 1, 'X');
    host.reference = { projectId: PROJECT_ID, path: 'drafts/ch02.md' };
    fixture.detectChanges();

    expect(api.requests).toEqual([
      { method: 'GET', path: READ_PATH, params: { path: PATH } },
      {
        method: 'POST',
        path: WRITE_PATH,
        body: { path: PATH, content: 'alphaX\n', baseHash: READ_HASH },
      },
      {
        method: 'GET',
        path: READ_PATH,
        params: { path: 'drafts/ch02.md' },
      },
    ]);
  });

  it('a reference change whose save fails asks; Cancel keeps the old file, and the next save writes to it', async () => {
    const { fixture, host, api } = await render({ raw: 'alpha\n' });
    api.fail(
      'POST',
      WRITE_PATH,
      new ApiError(
        0,
        CLIENT_ERROR_CODES.NETWORK,
        'Could not reach the server.',
      ),
    );

    insertAtLineEnd(fixture, 1, 'X');
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
    host.reference = { projectId: PROJECT_ID, path: 'drafts/ch02.md' };
    fixture.detectChanges();

    expect(confirm).toHaveBeenCalledTimes(1);
    expect(
      api.requests.some(
        (request) =>
          request.method === 'GET' &&
          request.params?.['path'] === 'drafts/ch02.md',
      ),
    ).toBe(false);
    expect(alertText(fixture)).toBe('Could not reach the server.');

    api.respond('POST', WRITE_PATH, writeResult(WRITE_HASH));
    save(fixture);
    expect(lastWrite(api)).toEqual({
      path: PATH,
      content: 'alphaX\n',
      baseHash: READ_HASH,
    });
  });

  it('destroying the editor cancels a pending debounce', async () => {
    const { fixture, api } = await render({ raw: 'alpha\n' });

    insertAtLineEnd(fixture, 1, 'X');
    fixture.destroy();
    vi.advanceTimersByTime(1500);
    expect(postCount(api)).toBe(0);
  });
});
