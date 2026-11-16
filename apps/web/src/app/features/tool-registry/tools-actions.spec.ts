import { TestBed, type ComponentFixture } from '@angular/core/testing';
import type {
  FormDescriptor,
  PortDescriptor,
} from '@bbartolome/scriba-contracts/tool-registry';
import { EditorView } from '@codemirror/view';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '../../shell';
import {
  restoreMatchMedia,
  stubMatchMedia,
} from '../../shell/testing/match-media';
import {
  createShellTestDoubles,
  type ShellTestDoubles,
} from '../../shell/testing/test-doubles';
import { ToolsListPage } from './tools-list';

// The paths of the list, the detail, the copies and the commands of the actions.
const LIST_PATH = '/api/tool-registry/tools';
const LINT_PATH = '/api/tool-registry/lint';
const COLD_BUILTIN_PATH = '/api/tool-registry/tools/cold_open/builtin';
const COLD_USER_PATH = '/api/tool-registry/tools/cold_open/user';
const COLD_SAVE_PATH = '/api/tool-registry/tools/cold_open/save';
const COLD_DELETE_PATH = '/api/tool-registry/tools/cold_open/delete';
const MY_USER_PATH = '/api/tool-registry/tools/my_tool/user';
const MY_SAVE_PATH = '/api/tool-registry/tools/my_tool/save';
const COPY_USER_PATH = '/api/tool-registry/tools/cold_open_2/user';
const COPY_SAVE_PATH = '/api/tool-registry/tools/cold_open_2/save';
const MY_DELETE_PATH = '/api/tool-registry/tools/my_tool/delete';
// The preview's reads of a valid row, as TRG-13's spec answers them.
const DETAIL_PATH = '/api/tool-registry/tools/cold_open';
const ACTIVE_PATH = '/api/project-store/active';
const ENTITIES_PATH = '/api/project-store/projects/p1/entities';
const FILE_PATH = '/api/project-store/projects/p1/file';

const HASH = `sha256:${'0'.repeat(64)}`;

const FORM: FormDescriptor = {
  fields: [
    {
      key: 'coreIdea',
      title: 'Core idea',
      description: '',
      control: 'textarea',
      required: true,
      default: null,
      list: false,
      port: true,
    },
  ],
};

const PORTS: PortDescriptor = {
  inputs: [
    {
      key: 'coreIdea',
      type: 'text',
      list: false,
      required: true,
      title: 'Core idea',
    },
  ],
  output: { key: 'output', type: 'text', kind: 'draft' },
  params: [],
};

const DETAIL = {
  spec: null,
  source: 'schemaVersion: 1\nname: cold_open\n',
  origin: 'user',
  lint: [],
  views: {
    functionSchema: {
      type: 'function',
      function: {
        name: 'cold_open',
        description: 'Drafts the cold open of a chapter from its core idea.',
        parameters: { type: 'object', properties: {} },
      },
    },
    form: FORM,
    ports: PORTS,
  },
};

// The built-in cold_open, and its text with the description the Compare tab shows.
const CORE_SOURCE = [
  'schemaVersion: 1',
  'name: cold_open',
  'description: Description A',
  'output: draft',
  'enabled: true',
  'prompt: |',
  '  Write it.',
  '',
].join('\n');
const USER_SOURCE = CORE_SOURCE.replace('Description A', 'Description B');

const CORE_COLD = {
  name: 'cold_open',
  description: 'Opens a scene',
  output: 'draft',
  enabled: true,
  origin: 'core',
  valid: true,
  lintCounts: { errors: 0, warnings: 0 },
};
const USER_COLD = {
  name: 'cold_open',
  description: 'Old',
  output: 'draft',
  enabled: true,
  origin: 'user',
  overrides: 'core',
  valid: true,
  lintCounts: { errors: 0, warnings: 0 },
};
const MY_TOOL = {
  name: 'my_tool',
  description: 'Mine',
  output: 'draft',
  enabled: true,
  origin: 'user',
  valid: true,
  lintCounts: { errors: 0, warnings: 0 },
};
const COLD_TWO = {
  name: 'cold_open_2',
  description: 'Copy',
  output: 'draft',
  enabled: true,
  origin: 'user',
  valid: true,
  lintCounts: { errors: 0, warnings: 0 },
};
const BROKEN = {
  name: 'broken',
  description: '',
  output: null,
  enabled: false,
  origin: 'user',
  valid: false,
  lintCounts: { errors: 1, warnings: 0 },
  error: { code: 'TOOL_INVALID', message: 'The file cannot be parsed.' },
};

const LIST_CORE = { tools: [CORE_COLD] };
const LIST_OVERRIDE = { tools: [USER_COLD] };
const LIST_MY_TOOL = { tools: [CORE_COLD, MY_TOOL] };
const LIST_WITH_BROKEN = { tools: [CORE_COLD, BROKEN] };

const LINT_ANSWER = { lint: [], views: null };

let doubles: ShellTestDoubles;
let resize: (width: number, height: number) => void;

beforeEach(() => {
  resize = stubMatchMedia(1280, 800);
  doubles = createShellTestDoubles();
  TestBed.configureTestingModule({ providers: [...doubles.providers] });
  doubles.api.respond('POST', LINT_PATH, LINT_ANSWER);
  vi.spyOn(window, 'confirm').mockReturnValue(true);
});

afterEach(() => {
  restoreMatchMedia();
  vi.restoreAllMocks();
});

/** The answers of the preview's reads of the cold-open tool. */
function respondToPreview(): void {
  doubles.api.respond('GET', DETAIL_PATH, DETAIL);
  doubles.api.respond('GET', ACTIVE_PATH, { active: 'p1' });
  doubles.api.respond('GET', ENTITIES_PATH, { entities: [], invalid: [] });
  doubles.api.respond('GET', FILE_PATH, {
    path: 'project.yaml',
    content: 'title: Book\n',
    hash: HASH,
    mtime: '2026-11-15T10:00:00Z',
  });
}

/** Renders the page and lets the first reads settle. */
async function render(): Promise<ComponentFixture<ToolsListPage>> {
  const fixture = TestBed.createComponent(ToolsListPage);
  await settle(fixture);
  return fixture;
}

/** The app is zoneless, so each event is followed by a detectChanges and a settle. */
async function settle(fixture: ComponentFixture<ToolsListPage>): Promise<void> {
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
}

function root(fixture: ComponentFixture<ToolsListPage>): HTMLElement {
  return fixture.nativeElement as HTMLElement;
}

function must<T>(value: T | null | undefined, what: string): T {
  if (value === null || value === undefined) {
    throw new Error(`${what} is not in the page`);
  }
  return value;
}

function button(
  fixture: ComponentFixture<ToolsListPage>,
  selector: string,
): HTMLButtonElement {
  return must(
    root(fixture).querySelector<HTMLButtonElement>(selector),
    selector,
  );
}

function maybe(fixture: ComponentFixture<ToolsListPage>, selector: string) {
  return root(fixture).querySelector(selector);
}

/** Clicks an element and lets the page react. */
async function click(
  fixture: ComponentFixture<ToolsListPage>,
  element: HTMLElement,
): Promise<void> {
  element.click();
  await settle(fixture);
}

/** Selects a row of the list by its name and origin. */
async function openRow(
  fixture: ComponentFixture<ToolsListPage>,
  name: string,
  origin: string,
): Promise<void> {
  const open = must(
    root(fixture).querySelector<HTMLButtonElement>(
      `li[data-tool="${name}"][data-origin="${origin}"] [data-open]`,
    ),
    `open button of ${origin}/${name}`,
  );
  await click(fixture, open);
}

/** Clicks one of the detail's tabs. */
async function tab(
  fixture: ComponentFixture<ToolsListPage>,
  name: 'preview' | 'source' | 'compare',
): Promise<void> {
  await click(fixture, button(fixture, `[data-tab="${name}"]`));
}

function editorView(fixture: ComponentFixture<ToolsListPage>): EditorView {
  const host = must(
    root(fixture).querySelector<HTMLElement>('[data-editor]'),
    'the editor',
  );
  const view = EditorView.findFromDOM(host);
  if (view === null) {
    throw new Error('No editor view.');
  }
  return view;
}

function requestsTo(method: 'GET' | 'POST', path: string) {
  return doubles.api.requests.filter(
    (request) => request.method === method && request.path === path,
  );
}

function rowElement(
  fixture: ComponentFixture<ToolsListPage>,
  name: string,
  origin: string,
): Element | null {
  return maybe(fixture, `li[data-tool="${name}"][data-origin="${origin}"]`);
}

describe('ToolsListPage actions', () => {
  it('T1d a refused save reads no list, and the row keeps its previous description', async () => {
    doubles.api.respond('GET', LIST_PATH, LIST_OVERRIDE);
    doubles.api.respond('GET', COLD_USER_PATH, {
      source: USER_SOURCE,
      origin: 'user',
      spec: null,
      views: null,
      lint: [],
    });
    doubles.api.fail(
      'POST',
      COLD_SAVE_PATH,
      new ApiError(
        422,
        'TOOL_SPEC_LINT_FAILED',
        'Tool "cold_open" was not saved.',
        {
          lint: [
            {
              severity: 'error',
              rule: 'file-name',
              message: 'the name "x" must match the file name "cold_open"',
              line: 2,
              column: 1,
            },
          ],
        },
      ),
    );
    const fixture = await render();
    await openRow(fixture, 'cold_open', 'user');
    await tab(fixture, 'source');

    const view = editorView(fixture);
    const line = view.state.doc.line(2);
    view.dispatch({ changes: { from: line.to, insert: 'x' } });

    const before = doubles.api.requests.length;
    await click(fixture, button(fixture, '[data-save]'));

    const listReads = doubles.api.requests
      .slice(before)
      .filter(
        (request) => request.method === 'GET' && request.path === LIST_PATH,
      );
    expect(listReads).toHaveLength(0);
    expect(rowElement(fixture, 'cold_open', 'user')?.textContent).toContain(
      'Old',
    );
  });

  it('T2a Customize opens an editable copy of the built-in, and saving it makes the list show a user copy that overrides it', async () => {
    doubles.api.respond('GET', LIST_PATH, LIST_CORE);
    doubles.api.respond('GET', COLD_BUILTIN_PATH, {
      source: CORE_SOURCE,
      origin: 'core',
      spec: null,
      views: null,
      lint: [],
    });
    doubles.api.respond('POST', COLD_SAVE_PATH, {
      source: CORE_SOURCE,
      origin: 'user',
      spec: null,
      views: null,
      lint: [],
    });
    respondToPreview();
    const fixture = await render();
    await openRow(fixture, 'cold_open', 'core');
    await tab(fixture, 'source');

    const content = must(
      root(fixture).querySelector<HTMLElement>('.cm-content'),
      'the editor content',
    );
    expect(content.getAttribute('contenteditable')).toBe('false');

    await click(fixture, button(fixture, '[data-customize]'));
    expect(
      must(
        root(fixture).querySelector<HTMLElement>('.cm-content'),
        'content',
      ).getAttribute('contenteditable'),
    ).toBe('true');
    expect(editorView(fixture).state.doc.toString()).toBe(CORE_SOURCE);

    const view = editorView(fixture);
    const line = view.state.doc.line(4);
    view.dispatch({ changes: { from: line.to, insert: ' edited' } });
    const edited = editorView(fixture).state.doc.toString();

    // The list after the save shows the user copy, and the copy reads back after the move.
    doubles.api.respond('GET', LIST_PATH, LIST_OVERRIDE);
    doubles.api.respond('GET', COLD_USER_PATH, {
      source: edited,
      origin: 'user',
      spec: null,
      views: null,
      lint: [],
    });
    await click(fixture, button(fixture, '[data-save]'));

    const saves = requestsTo('POST', COLD_SAVE_PATH);
    expect(saves).toHaveLength(1);
    expect(saves[0]?.body).toEqual({ source: edited });

    const userRow = rowElement(fixture, 'cold_open', 'user');
    expect(userRow?.textContent).toContain('Overrides the core built-in');
    expect(
      maybe(fixture, 'li[data-origin="core"][data-tool="cold_open"]'),
    ).toBeNull();
    expect(
      button(fixture, 'div[role="tablist"] [data-tab="source"]').getAttribute(
        'aria-selected',
      ),
    ).toBe('true');
    expect(requestsTo('GET', COLD_USER_PATH).length).toBeGreaterThan(0);
  });

  it('T2b Revert deletes the user copy, and the built-in row comes back', async () => {
    doubles.api.respond('GET', LIST_PATH, LIST_OVERRIDE);
    doubles.api.respond('POST', COLD_DELETE_PATH, null);
    const fixture = await render();
    await openRow(fixture, 'cold_open', 'user');
    doubles.api.respond('GET', LIST_PATH, LIST_CORE);
    respondToPreview();

    await click(fixture, button(fixture, '[data-revert]'));

    expect(requestsTo('POST', COLD_DELETE_PATH)).toHaveLength(1);
    expect(rowElement(fixture, 'cold_open', 'core')).not.toBeNull();
    expect(maybe(fixture, 'li[data-origin="user"]')).toBeNull();
    expect(maybe(fixture, 'section[aria-label="Tool detail"]')).toBeNull();
  });

  it('T3a Compare shows the built-in and the user copy in one diff, with both texts visible', async () => {
    doubles.api.respond('GET', LIST_PATH, LIST_OVERRIDE);
    doubles.api.respond('GET', COLD_BUILTIN_PATH, {
      source: CORE_SOURCE,
      origin: 'core',
      spec: null,
      views: null,
      lint: [],
    });
    doubles.api.respond('GET', COLD_USER_PATH, {
      source: USER_SOURCE,
      origin: 'user',
      spec: null,
      views: null,
      lint: [],
    });
    const fixture = await render();
    await openRow(fixture, 'cold_open', 'user');
    await tab(fixture, 'compare');

    const diff = must(
      maybe(fixture, 'section[aria-label="Changes to cold_open.yaml"]'),
      'the diff',
    );
    expect(diff.textContent).toContain('Description A');
    expect(diff.textContent).toContain('Description B');
  });

  it('T3b Compare is not offered on a built-in row or on a user-only row', async () => {
    doubles.api.respond('GET', LIST_PATH, LIST_MY_TOOL);
    const fixture = await render();

    await openRow(fixture, 'cold_open', 'core');
    expect(maybe(fixture, '[data-tab="compare"]')).toBeNull();
    await openRow(fixture, 'my_tool', 'user');
    expect(maybe(fixture, '[data-tab="compare"]')).toBeNull();
  });

  it('T4b New opens a blank draft under the typed name, and Save posts it there; the list then shows a user-only tool', async () => {
    doubles.api.respond('GET', LIST_PATH, LIST_CORE);
    doubles.api.respond('POST', MY_SAVE_PATH, {
      source: 'ignored',
      origin: 'user',
      spec: null,
      views: null,
      lint: [],
    });
    doubles.api.respond('GET', MY_USER_PATH, {
      source: 'schemaVersion: 1\nname: my_tool\n',
      origin: 'user',
      spec: null,
      views: null,
      lint: [],
    });
    const fixture = await render();

    await click(fixture, button(fixture, '[data-new]'));
    const input = must(
      root(fixture).querySelector<HTMLInputElement>('input[data-name]'),
      'the name input',
    );
    input.value = 'my_tool';
    doubles.api.respond('GET', LIST_PATH, LIST_CORE);
    await click(fixture, button(fixture, '[data-create]'));

    expect(editorView(fixture).state.doc.toString()).toContain('name: my_tool');

    doubles.api.respond('GET', LIST_PATH, LIST_MY_TOOL);
    await click(fixture, button(fixture, '[data-save]'));

    const saves = requestsTo('POST', MY_SAVE_PATH);
    expect(saves).toHaveLength(1);
    expect(String((saves[0]?.body as { source: string }).source)).toContain(
      'name: my_tool',
    );
    const row = rowElement(fixture, 'my_tool', 'user');
    expect(row).not.toBeNull();
    expect(row?.textContent).not.toContain('Overrides');
  });

  it('T4c New refuses a name in use and a name that is not a tool name', async () => {
    doubles.api.respond('GET', LIST_PATH, LIST_CORE);
    const fixture = await render();

    await click(fixture, button(fixture, '[data-new]'));
    const input = must(
      root(fixture).querySelector<HTMLInputElement>('input[data-name]'),
      'the name input',
    );
    input.value = 'cold_open';
    await click(fixture, button(fixture, '[data-create]'));
    expect(
      root(fixture).querySelector('[data-name-form]')?.textContent,
    ).toContain('That name is in use.');

    input.value = 'Bad-Name';
    await click(fixture, button(fixture, '[data-create]'));
    expect(
      root(fixture).querySelector('[data-name-form]')?.textContent,
    ).toContain('A name is lower snake case, starting with a letter.');
    expect(requestsTo('POST', MY_SAVE_PATH)).toHaveLength(0);
    expect(
      doubles.api.requests.filter(
        (request) =>
          request.method === 'POST' && request.path.endsWith('/save'),
      ),
    ).toHaveLength(0);
  });

  it('T4d Duplicate copies the row source under the new name, and Save posts it there', async () => {
    doubles.api.respond('GET', LIST_PATH, LIST_CORE);
    doubles.api.respond('GET', COLD_BUILTIN_PATH, {
      source: CORE_SOURCE,
      origin: 'core',
      spec: null,
      views: null,
      lint: [],
    });
    doubles.api.respond('POST', COPY_SAVE_PATH, {
      source: 'ignored',
      origin: 'user',
      spec: null,
      views: null,
      lint: [],
    });
    doubles.api.respond('GET', COPY_USER_PATH, {
      source: CORE_SOURCE,
      origin: 'user',
      spec: null,
      views: null,
      lint: [],
    });
    respondToPreview();
    const fixture = await render();
    await openRow(fixture, 'cold_open', 'core');

    await click(fixture, button(fixture, '[data-duplicate]'));
    const input = must(
      root(fixture).querySelector<HTMLInputElement>('input[data-name]'),
      'the name input',
    );
    input.value = 'cold_open_2';
    doubles.api.respond('GET', LIST_PATH, { tools: [CORE_COLD, COLD_TWO] });
    await click(fixture, button(fixture, '[data-create]'));

    expect(editorView(fixture).state.doc.toString()).toBe(
      CORE_SOURCE.replace('name: cold_open\n', 'name: cold_open_2\n'),
    );

    await click(fixture, button(fixture, '[data-save]'));
    expect(requestsTo('POST', COPY_SAVE_PATH)).toHaveLength(1);
  });

  it('T4e Delete removes a user-only tool', async () => {
    doubles.api.respond('GET', LIST_PATH, LIST_MY_TOOL);
    doubles.api.respond('POST', MY_DELETE_PATH, null);
    const fixture = await render();
    await openRow(fixture, 'my_tool', 'user');

    doubles.api.respond('GET', LIST_PATH, LIST_CORE);
    await click(fixture, button(fixture, '[data-delete]'));

    expect(requestsTo('POST', MY_DELETE_PATH)).toHaveLength(1);
    expect(maybe(fixture, 'li[data-tool="my_tool"]')).toBeNull();
    expect(maybe(fixture, 'section[aria-label="Tool detail"]')).toBeNull();
  });

  it('T4f Duplicate is not offered on an invalid row', async () => {
    doubles.api.respond('GET', LIST_PATH, LIST_WITH_BROKEN);
    respondToPreview();
    const fixture = await render();

    await openRow(fixture, 'broken', 'user');
    expect(maybe(fixture, '[data-duplicate]')).toBeNull();
    await openRow(fixture, 'cold_open', 'core');
    expect(maybe(fixture, '[data-duplicate]')).not.toBeNull();
  });

  it('T5 on a phone there is no detail, no editor and no action button', async () => {
    resize = stubMatchMedia(390, 844);
    doubles.api.respond('GET', LIST_PATH, LIST_OVERRIDE);
    const fixture = await render();

    for (const selector of [
      '[data-new]',
      '[data-customize]',
      '[data-duplicate]',
      '[data-delete]',
      '[data-revert]',
      'app-tool-editor',
      'section[aria-label="Tool detail"]',
    ]) {
      expect(maybe(fixture, selector), selector).toBeNull();
    }
  });
});
