import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { EditorView } from '@codemirror/view';
import { describe, expect, it } from 'vitest';
import { ApiError } from './api-error';
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
}

interface Rendered {
  fixture: ComponentFixture<EditorHost>;
  host: EditorHost;
  api: FakeApiClient;
}

/** Renders the host with a fake API client that answers the read with `raw`, or fails it. */
async function render(options: RenderOptions): Promise<Rendered> {
  const api = new FakeApiClient();
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
