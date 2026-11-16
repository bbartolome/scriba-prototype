import { TestBed, type ComponentFixture } from '@angular/core/testing';
import type {
  FormDescriptor,
  FormField,
  PortDescriptor,
} from '@bbartolome/scriba-contracts/tool-registry';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
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

// The paths of the list, the detail and the preview's reads (the project p1 is active in these answers).
const LIST_PATH = '/api/tool-registry/tools';
const DETAIL_PATH = '/api/tool-registry/tools/cold_open';
const MYSTERY_ENABLED_PATH =
  '/api/tool-registry/tools/mystery_question/enabled';
const COLD_ENABLED_PATH = '/api/tool-registry/tools/cold_open/enabled';
const LINT_FAIL_PATH = '/api/tool-registry/tools/lint_fail';
const ACTIVE_PATH = '/api/project-store/active';
const ENTITIES_PATH = '/api/project-store/projects/p1/entities';
const FILE_PATH = '/api/project-store/projects/p1/file';

const HASH = `sha256:${'0'.repeat(64)}`;

function field(
  key: string,
  partial: Partial<FormField> & Pick<FormField, 'title' | 'control'>,
): FormField {
  return {
    key,
    description: '',
    required: false,
    default: null,
    list: false,
    port: false,
    ...partial,
  };
}

// The cold-open fixture's form fields, in form order (TRG-02's emission of apps/api/test/fixtures).
const FORM: FormDescriptor = {
  fields: [
    field('coreIdea', {
      title: 'Core idea',
      control: 'textarea',
      required: true,
      port: true,
    }),
    field('entityIds', {
      title: 'Entities',
      control: 'entity-picker',
      list: true,
      entityKinds: ['person'],
      port: true,
    }),
    field('styleProfile', {
      title: 'Style',
      control: 'style-picker',
      port: true,
    }),
    field('length', {
      title: 'Length',
      control: 'slider',
      default: 800,
      minimum: 200,
      maximum: 2000,
    }),
    field('tone', { title: 'Tone', control: 'select', enum: ['warm', 'dry'] }),
    field('person', {
      title: 'Person',
      control: 'entity-picker',
      required: true,
      entityKinds: ['person'],
      port: true,
    }),
    field('moment', { title: 'Moment', control: 'text', port: true }),
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
    {
      key: 'entityIds',
      type: 'entity',
      list: true,
      required: false,
      title: 'Entities',
    },
    {
      key: 'styleProfile',
      type: 'style',
      list: false,
      required: false,
      title: 'Style',
    },
    {
      key: 'person',
      type: 'entity',
      list: false,
      required: true,
      title: 'Person',
    },
    {
      key: 'moment',
      type: 'text',
      list: false,
      required: false,
      title: 'Moment',
    },
  ],
  output: { key: 'output', type: 'text', kind: 'draft' },
  params: ['length', 'tone'],
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

// The L1 answer: four valid rows in three groups, and a user copy that overrides a nonfiction built-in.
const HOUSE_NOTE = {
  name: 'house_note',
  description: 'A note',
  output: 'draft',
  enabled: true,
  origin: 'user',
  overrides: 'nonfiction',
  valid: true,
  lintCounts: { errors: 0, warnings: 0 },
};
const MYTH_BUSTER = {
  name: 'myth_buster',
  description: 'Busts a myth',
  output: 'draft',
  enabled: true,
  origin: 'nonfiction',
  valid: true,
  lintCounts: { errors: 0, warnings: 0 },
};
const COLD_OPEN = {
  name: 'cold_open',
  description: 'Opens a scene',
  output: 'draft',
  enabled: true,
  origin: 'core',
  valid: true,
  lintCounts: { errors: 0, warnings: 0 },
};
const MYSTERY = {
  name: 'mystery_question',
  description: 'Asks a question',
  output: 'draft',
  enabled: true,
  origin: 'nonfiction',
  valid: true,
  lintCounts: { errors: 0, warnings: 0 },
};
const L1 = { tools: [HOUSE_NOTE, MYTH_BUSTER, COLD_OPEN, MYSTERY] };
const L1_WITHOUT_HOUSE_NOTE = { tools: [MYTH_BUSTER, COLD_OPEN, MYSTERY] };

// The L3 answer: a file that cannot be parsed (no output), and a file that fails lint (output, valid false).
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
const LINT_FAIL = {
  name: 'lint_fail',
  description: 'Fails lint',
  output: 'draft',
  enabled: false,
  origin: 'user',
  valid: false,
  lintCounts: { errors: 2, warnings: 0 },
};
const L3 = { tools: [BROKEN, LINT_FAIL] };

let doubles: ShellTestDoubles;
let resize: (width: number, height: number) => void;

beforeEach(() => {
  resize = stubMatchMedia(1280, 800);
  doubles = createShellTestDoubles();
  TestBed.configureTestingModule({ providers: [...doubles.providers] });
});

afterEach(() => {
  restoreMatchMedia();
});

/** The answers of the detail's preview reads: the cold-open tool, and the project p1 that is active. */
function respondToDetail(): void {
  doubles.api.respond('GET', DETAIL_PATH, DETAIL);
  doubles.api.respond('GET', ACTIVE_PATH, { active: 'p1' });
  doubles.api.respond('GET', ENTITIES_PATH, {
    entities: [
      { id: 'ada', type: 'person', path: 'entities/ada.md' },
      { id: 'bob', type: 'person', path: 'entities/bob.md' },
      { id: 'paris', type: 'place', path: 'entities/paris.md' },
    ],
    invalid: [],
  });
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

/** One macrotask: the CDK delivers a media query change after a debounce of 0 ms. */
function macrotask(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

function must<T>(value: T | null | undefined, what: string): T {
  if (value === null || value === undefined) {
    throw new Error(`${what} is not in the page`);
  }
  return value;
}

function root(fixture: ComponentFixture<ToolsListPage>): HTMLElement {
  return fixture.nativeElement as HTMLElement;
}

function rowOf(
  fixture: ComponentFixture<ToolsListPage>,
  name: string,
  origin: string,
): HTMLElement {
  return must(
    root(fixture).querySelector<HTMLElement>(
      `li[data-tool="${name}"][data-origin="${origin}"]`,
    ),
    `row ${origin}/${name}`,
  );
}

function switchOf(
  fixture: ComponentFixture<ToolsListPage>,
  name: string,
  origin: string,
): HTMLElement {
  return must(
    rowOf(fixture, name, origin).querySelector<HTMLElement>(
      'button[role="switch"]',
    ),
    `switch of ${origin}/${name}`,
  );
}

function textOf(element: Element | null | undefined): string {
  return (element?.textContent ?? '').replace(/\s+/g, ' ').trim();
}

function requestsTo(method: 'GET' | 'POST', path: string) {
  return doubles.api.requests.filter(
    (request) => request.method === method && request.path === path,
  );
}

async function click(
  fixture: ComponentFixture<ToolsListPage>,
  element: HTMLElement,
): Promise<void> {
  element.click();
  await settle(fixture);
}

describe('ToolsListPage', () => {
  it('L1 groups rows by origin in the order core, nonfiction, fiction, user, omits an empty group, keeps the answer order in a group, and marks a copy that overrides a built-in', async () => {
    doubles.api.respond('GET', LIST_PATH, L1);
    const fixture = await render();

    const headings = Array.from(
      root(fixture).querySelectorAll('section[data-group] > h2'),
    ).map((heading) => textOf(heading));
    expect(headings).toEqual(['Core', 'Nonfiction', 'User']);

    const nonfiction = Array.from(
      root(fixture).querySelectorAll(
        'section[data-group="nonfiction"] li[data-tool]',
      ),
    ).map((row) => row.getAttribute('data-tool'));
    expect(nonfiction).toEqual(['myth_buster', 'mystery_question']);

    expect(textOf(rowOf(fixture, 'house_note', 'user'))).toContain(
      'Overrides the nonfiction built-in',
    );
  });

  it('L2 the switch posts enabled to the tool route and the list is read again', async () => {
    doubles.api.respond('GET', LIST_PATH, L1);
    doubles.api.respond('POST', MYSTERY_ENABLED_PATH, {
      ...MYSTERY,
      enabled: false,
    });
    const fixture = await render();

    await click(fixture, switchOf(fixture, 'mystery_question', 'nonfiction'));

    expect(doubles.api.requests.filter((r) => r.method === 'POST')).toEqual([
      {
        method: 'POST',
        path: MYSTERY_ENABLED_PATH,
        body: { enabled: false },
      },
    ]);
    expect(requestsTo('GET', LIST_PATH)).toHaveLength(2);
  });

  it('L3 a file that cannot be parsed and a file that fails lint both read Invalid, so validity comes from valid', async () => {
    doubles.api.respond('GET', LIST_PATH, L3);
    const fixture = await render();

    expect(textOf(rowOf(fixture, 'broken', 'user'))).toContain('Invalid');
    expect(textOf(rowOf(fixture, 'broken', 'user'))).toContain(
      'The file cannot be parsed.',
    );
    expect(textOf(rowOf(fixture, 'lint_fail', 'user'))).toContain('Invalid');
    expect(textOf(rowOf(fixture, 'lint_fail', 'user'))).toContain('2 errors');
  });

  it('L4 a catalog-changed envelope reads the list again and shows the new row', async () => {
    doubles.api.respond('GET', LIST_PATH, L1_WITHOUT_HOUSE_NOTE);
    const fixture = await render();
    expect(
      root(fixture).querySelector('li[data-tool="house_note"]'),
    ).toBeNull();

    doubles.api.respond('GET', LIST_PATH, L1);
    doubles.events.push({
      module: 'tool-registry',
      type: 'catalog-changed',
      data: { names: ['house_note'] },
    });
    await settle(fixture);

    expect(requestsTo('GET', LIST_PATH)).toHaveLength(2);
    expect(
      root(fixture).querySelector('li[data-tool="house_note"]'),
    ).not.toBeNull();
  });

  it('L4b a reconcile tick reads the list again', async () => {
    doubles.api.respond('GET', LIST_PATH, L1);
    const fixture = await render();

    doubles.events.tick('reopen');
    await settle(fixture);

    expect(requestsTo('GET', LIST_PATH)).toHaveLength(2);
  });

  it('L5 on a larger screen a row name opens the detail, whose Preview tab reads the tool', async () => {
    doubles.api.respond('GET', LIST_PATH, L1);
    respondToDetail();
    const fixture = await render();

    await click(
      fixture,
      must(
        rowOf(fixture, 'cold_open', 'core').querySelector<HTMLElement>(
          '[data-open]',
        ),
        'name button',
      ),
    );

    const tab = must(
      root(fixture).querySelector(
        'div[role="tablist"] button[role="tab"][aria-selected="true"]',
      ),
      'the selected tab',
    );
    expect(textOf(tab)).toBe('Preview');
    expect(root(fixture).querySelector('app-tools-preview')).not.toBeNull();
    expect(requestsTo('GET', DETAIL_PATH)).toHaveLength(1);
    expect(
      root(fixture).querySelector('section[aria-label="Form layout"]'),
    ).not.toBeNull();
  });

  it('L5b a row that is not valid opens a detail that shows its status and makes no preview read', async () => {
    doubles.api.respond('GET', LIST_PATH, L3);
    const fixture = await render();

    await click(
      fixture,
      must(
        rowOf(fixture, 'lint_fail', 'user').querySelector<HTMLElement>(
          '[data-open]',
        ),
        'name button',
      ),
    );

    const detail = must(
      root(fixture).querySelector('section[aria-label="Tool detail"]'),
      'the tool detail',
    );
    const status = must(
      detail.querySelector('[data-detail-status]'),
      'the detail status',
    );
    expect(textOf(status)).toContain('Invalid');
    expect(textOf(status)).toContain('2 errors');
    expect(root(fixture).querySelector('app-tools-preview')).toBeNull();
    expect(requestsTo('GET', LINT_FAIL_PATH)).toHaveLength(0);
    expect(switchOf(fixture, 'lint_fail', 'user')).not.toBeNull();
  });

  it('L5c a selected row that turns invalid stays open and shows its status', async () => {
    doubles.api.respond('GET', LIST_PATH, L1);
    respondToDetail();
    const fixture = await render();
    await click(
      fixture,
      must(
        rowOf(fixture, 'cold_open', 'core').querySelector<HTMLElement>(
          '[data-open]',
        ),
        'name button',
      ),
    );
    expect(root(fixture).querySelector('app-tools-preview')).not.toBeNull();

    doubles.api.respond('GET', LIST_PATH, {
      tools: [
        {
          ...COLD_OPEN,
          description: '',
          output: null,
          valid: false,
          enabled: false,
          lintCounts: { errors: 1, warnings: 0 },
          error: {
            code: 'TOOL_INVALID',
            message: 'The file cannot be parsed.',
          },
        },
        HOUSE_NOTE,
        MYTH_BUSTER,
        MYSTERY,
      ],
    });
    doubles.events.push({
      module: 'tool-registry',
      type: 'catalog-changed',
      data: { names: ['cold_open'] },
    });
    await settle(fixture);

    expect(requestsTo('GET', LIST_PATH)).toHaveLength(2);
    expect(
      root(fixture).querySelector('section[aria-label="Tool detail"]'),
    ).not.toBeNull();
    expect(root(fixture).querySelector('app-tools-preview')).toBeNull();
    const status = must(
      root(fixture).querySelector('[data-detail-status]'),
      'the detail status',
    );
    expect(textOf(status)).toContain('Invalid');
    expect(textOf(status)).toContain('The file cannot be parsed.');
  });

  it('L6 on a 390 by 844 viewport only the list and its switches are reachable', async () => {
    restoreMatchMedia();
    resize = stubMatchMedia(390, 844);
    doubles.api.respond('GET', LIST_PATH, L1);
    doubles.api.respond('POST', COLD_ENABLED_PATH, {
      ...COLD_OPEN,
      enabled: false,
    });
    const fixture = await render();

    expect(
      root(fixture).querySelectorAll('li[data-tool] [data-open]'),
    ).toHaveLength(0);
    expect(root(fixture).querySelector('app-tools-preview')).toBeNull();
    expect(requestsTo('GET', DETAIL_PATH)).toHaveLength(0);

    await click(fixture, switchOf(fixture, 'cold_open', 'core'));

    expect(requestsTo('POST', COLD_ENABLED_PATH)).toEqual([
      { method: 'POST', path: COLD_ENABLED_PATH, body: { enabled: false } },
    ]);
  });

  it('L6b a class drop to phone hides an open detail, and a rise shows it again', async () => {
    doubles.api.respond('GET', LIST_PATH, L1);
    respondToDetail();
    const fixture = await render();
    await click(
      fixture,
      must(
        rowOf(fixture, 'cold_open', 'core').querySelector<HTMLElement>(
          '[data-open]',
        ),
        'name button',
      ),
    );
    expect(root(fixture).querySelector('app-tools-preview')).not.toBeNull();

    resize(390, 844);
    await macrotask();
    await settle(fixture);
    expect(root(fixture).querySelector('app-tools-preview')).toBeNull();
    expect(root(fixture).querySelectorAll('[data-open]')).toHaveLength(0);

    resize(1280, 800);
    await macrotask();
    await settle(fixture);
    expect(root(fixture).querySelector('app-tools-preview')).not.toBeNull();
  });

  it('L7 a refused switch shows the failure and reads the list again', async () => {
    doubles.api.respond('GET', LIST_PATH, L1);
    doubles.api.fail(
      'POST',
      MYSTERY_ENABLED_PATH,
      new ApiError(404, 'TOOL_NOT_FOUND', 'No tool named "mystery_question".'),
    );
    const fixture = await render();

    await click(fixture, switchOf(fixture, 'mystery_question', 'nonfiction'));

    expect(textOf(root(fixture))).toContain('The switch could not be saved.');
    expect(requestsTo('GET', LIST_PATH)).toHaveLength(2);
  });

  it('L8 an invalid user copy beside its built-in has no switch and names the built-in in use; the built-in row and an invalid user-only tool keep theirs', async () => {
    doubles.api.respond('GET', LIST_PATH, {
      tools: [
        COLD_OPEN,
        {
          name: 'cold_open',
          description: '',
          output: 'draft',
          enabled: false,
          origin: 'user',
          overrides: 'core',
          valid: false,
          lintCounts: { errors: 1, warnings: 0 },
        },
        BROKEN,
      ],
    });
    const fixture = await render();

    expect(
      root(fixture).querySelector(
        'li[data-tool="cold_open"][data-origin="user"] button[role="switch"]',
      ),
    ).toBeNull();
    const copy = textOf(rowOf(fixture, 'cold_open', 'user'));
    expect(copy).toContain('The core built-in is used.');
    expect(copy).toContain('Invalid copy of the core built-in');
    expect(
      root(fixture).querySelectorAll(
        'li[data-tool="cold_open"][data-origin="core"] button[role="switch"]',
      ),
    ).toHaveLength(1);
    expect(
      root(fixture).querySelectorAll(
        'li[data-tool="broken"] button[role="switch"]',
      ),
    ).toHaveLength(1);
  });
});
