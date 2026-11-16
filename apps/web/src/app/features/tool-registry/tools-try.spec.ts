import { ComponentFixture, TestBed } from '@angular/core/testing';
import type { WritableSignal } from '@angular/core';
import type {
  FormDescriptor,
  FormField,
  PortDescriptor,
  ToolArguments,
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
import { ToolsTryPanel } from './tools-try';

// The paths of the Try panel and of the list. The project p1 is the active project in these answers.
const LIST_PATH = '/api/tool-registry/tools';
const DETAIL_PATH = '/api/tool-registry/tools/cold_open';
const MY_TOOL_PATH = '/api/tool-registry/tools/my_tool';
const EXECUTE_PATH = '/api/tool-registry/tools/cold_open/execute';
const ACTIVE_PATH = '/api/project-store/active';
const ENTITIES_PATH = '/api/project-store/projects/p1/entities';
const FILE_PATH = '/api/project-store/projects/p1/file';
const RESOLVE_PATH =
  '/api/project-store/projects/p1/entities/resolve?ids=ada&ids=bob&ids=house-style';

const HASH = `sha256:${'0'.repeat(64)}`;

/** One field as the emitter writes it: every key present, the optional ones only when set. */
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

const COLD_OPEN = {
  name: 'cold_open',
  description: 'Opens a scene',
  output: 'draft',
  enabled: true,
  origin: 'core',
  valid: true,
  lintCounts: { errors: 0, warnings: 0 },
};
const MY_TOOL = {
  name: 'my_tool',
  description: 'A user tool',
  output: 'draft',
  enabled: true,
  origin: 'user',
  valid: true,
  lintCounts: { errors: 0, warnings: 0 },
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

let doubles: ShellTestDoubles;

beforeEach(() => {
  stubMatchMedia(1280, 800);
  doubles = createShellTestDoubles();
  TestBed.configureTestingModule({ providers: [...doubles.providers] });
});

afterEach(() => {
  restoreMatchMedia();
});

/** The answers of the panel's reads: the active project p1, its entities and file, and the tool. */
function respondToPanel(): void {
  doubles.api.respond('GET', DETAIL_PATH, DETAIL);
  doubles.api.respond('GET', ACTIVE_PATH, { active: 'p1' });
  doubles.api.respond('GET', ENTITIES_PATH, {
    entities: [
      { id: 'ada', type: 'person', path: 'entities/ada.md' },
      { id: 'bob', type: 'person', path: 'entities/bob.md' },
    ],
    invalid: [],
  });
  doubles.api.respond('GET', FILE_PATH, {
    path: 'project.yaml',
    content: 'title: Book\nstyleProfile: house-style\n',
    hash: HASH,
    mtime: '2026-11-15T10:00:00Z',
  });
}

/** The answer of the resolution of the Y1 IDs: two people and a style profile. */
function respondToResolution(): void {
  doubles.api.respond('GET', RESOLVE_PATH, {
    resolved: [
      {
        id: 'ada',
        type: 'person',
        path: 'entities/ada.md',
        content: 'Ada.',
      },
      {
        id: 'bob',
        type: 'person',
        path: 'entities/bob.md',
        content: 'Bob.',
      },
      {
        id: 'house-style',
        type: 'style-profile',
        path: 'styles/house-style.md',
        content: 'Plain.',
      },
    ],
    errors: [],
  });
}

/** The answer of execute: a draft that cites the two people. */
function respondToExecute(): void {
  doubles.api.respond('POST', EXECUTE_PATH, {
    output: {
      kind: 'draft',
      content: 'The cold open opens on the bench at dawn.',
    },
    sourcesUsed: ['ada', 'bob'],
  });
}

/** The panel's arguments, which its form shows and submits. */
function formOf(
  fixture: ComponentFixture<ToolsTryPanel>,
): WritableSignal<ToolArguments> {
  return (
    fixture.componentInstance as unknown as {
      formValue: WritableSignal<ToolArguments>;
    }
  ).formValue;
}

/** Renders the panel and lets the first reads settle. */
async function render(): Promise<ComponentFixture<ToolsTryPanel>> {
  const fixture = TestBed.createComponent(ToolsTryPanel);
  fixture.componentRef.setInput('tool', 'cold_open');
  await settle(fixture);
  return fixture;
}

/** The app is zoneless, so each change is followed by a detectChanges and a settle. */
async function settle(
  fixture: ComponentFixture<ToolsTryPanel> | ComponentFixture<ToolsListPage>,
): Promise<void> {
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
}

function root(fixture: { nativeElement: unknown }): HTMLElement {
  return fixture.nativeElement as HTMLElement;
}

function must<T>(value: T | null | undefined, what: string): T {
  if (value === null || value === undefined) {
    throw new Error(`${what} is not in the page`);
  }
  return value;
}

/** Submits the panel's form, as its Submit button does. */
async function submit(fixture: ComponentFixture<ToolsTryPanel>): Promise<void> {
  const form = must(
    root(fixture).querySelector<HTMLFormElement>('form'),
    'form',
  );
  form.dispatchEvent(new Event('submit', { cancelable: true }));
  await settle(fixture);
}

function requestsTo(method: 'GET' | 'POST', path: string) {
  return doubles.api.requests.filter(
    (request) => request.method === method && request.path === path,
  );
}

describe('ToolsTryPanel: run the tool', () => {
  it('Y1 the resolution carries each chosen ID once, in form order, and execute gets the resolved entities', async () => {
    respondToPanel();
    respondToResolution();
    respondToExecute();
    const fixture = await render();

    formOf(fixture).set({
      coreIdea: 'Engines reward patience',
      entityIds: ['ada', 'bob'],
      styleProfile: 'house-style',
      person: 'ada',
    });
    await settle(fixture);
    await submit(fixture);

    const resolutions = requestsTo('GET', RESOLVE_PATH);
    expect(resolutions).toHaveLength(1);

    const posts = requestsTo('POST', EXECUTE_PATH);
    expect(posts).toHaveLength(1);
    const body = posts[0].body as {
      arguments: Record<string, unknown>;
      entities: unknown[];
    };
    expect(body.arguments).toMatchObject({
      coreIdea: 'Engines reward patience',
      entityIds: ['ada', 'bob'],
      styleProfile: 'house-style',
      person: 'ada',
    });
    expect(body.entities).toEqual([
      { ref: 'ada', type: 'person', path: 'entities/ada.md', content: 'Ada.' },
      { ref: 'bob', type: 'person', path: 'entities/bob.md', content: 'Bob.' },
      {
        ref: 'house-style',
        type: 'style-profile',
        path: 'styles/house-style.md',
        content: 'Plain.',
      },
    ]);
  });

  it('Y2 the output and the sources it cites render, each with its project path', async () => {
    respondToPanel();
    respondToResolution();
    respondToExecute();
    const fixture = await render();

    formOf(fixture).set({
      coreIdea: 'Engines reward patience',
      entityIds: ['ada', 'bob'],
      styleProfile: 'house-style',
      person: 'ada',
    });
    await settle(fixture);
    await submit(fixture);

    const output = must(
      root(fixture).querySelector<HTMLElement>('[data-output]'),
      'output',
    );
    expect(output.textContent).toContain(
      'The cold open opens on the bench at dawn.',
    );
    const sources = Array.from(
      root(fixture).querySelectorAll<HTMLElement>('li[data-source]'),
    ).map((item) => item.textContent.trim());
    expect(sources).toEqual(['entities/ada.md', 'entities/bob.md']);
  });

  it('Y3 an empty style field takes the project style profile before the resolution', async () => {
    respondToPanel();
    respondToResolution();
    respondToExecute();
    const fixture = await render();

    // The style field is cleared after the picker's own preselect, so the panel's fill is the one that sets it.
    formOf(fixture).set({
      coreIdea: 'Engines reward patience',
      entityIds: ['ada', 'bob'],
      styleProfile: '',
      person: 'ada',
    });
    await settle(fixture);
    await submit(fixture);

    expect(requestsTo('GET', RESOLVE_PATH)).toHaveLength(1);
    const posts = requestsTo('POST', EXECUTE_PATH);
    expect(posts).toHaveLength(1);
    const body = posts[0].body as { arguments: Record<string, unknown> };
    expect(body.arguments['styleProfile']).toBe('house-style');
  });

  it('Y4 a resolution that names a duplicate ID shows it and posts no execute', async () => {
    respondToPanel();
    doubles.api.respond('GET', RESOLVE_PATH, {
      resolved: [],
      errors: [
        {
          id: 'ada',
          code: 'duplicate',
          paths: ['entities/ada.md', 'old/ada.md'],
        },
      ],
    });
    respondToExecute();
    const fixture = await render();

    formOf(fixture).set({
      coreIdea: 'Engines reward patience',
      entityIds: ['ada', 'bob'],
      styleProfile: 'house-style',
      person: 'ada',
    });
    await settle(fixture);
    await submit(fixture);

    const errors = must(
      root(fixture).querySelector<HTMLElement>('[data-resolution-errors]'),
      'resolution errors',
    );
    expect(errors.textContent).toContain('ada');
    expect(errors.textContent).toContain('entities/ada.md');
    expect(errors.textContent).toContain('old/ada.md');
    expect(requestsTo('POST', EXECUTE_PATH)).toHaveLength(0);
  });

  it('Y5 TOOL_ARGS_INVALID shows each issue beside its field, and TOOL_MODEL_ERROR shows the provider message', async () => {
    respondToPanel();
    respondToResolution();
    doubles.api.fail(
      'POST',
      EXECUTE_PATH,
      new ApiError(422, 'TOOL_ARGS_INVALID', 'The arguments are not valid.', {
        issues: [{ path: '/coreIdea', message: 'must have required property' }],
      }),
    );
    const fixture = await render();

    formOf(fixture).set({
      coreIdea: 'Engines reward patience',
      entityIds: ['ada', 'bob'],
      styleProfile: 'house-style',
      person: 'ada',
    });
    await settle(fixture);
    await submit(fixture);

    expect(
      must(
        root(fixture).querySelector<HTMLElement>(
          'section[data-key="coreIdea"]',
        ),
        'section coreIdea',
      ).textContent,
    ).toContain('must have required property');

    doubles.api.fail(
      'POST',
      EXECUTE_PATH,
      new ApiError(
        502,
        'TOOL_MODEL_ERROR',
        'The model provider does not know the model.',
      ),
    );
    await submit(fixture);

    const alert = must(
      root(fixture).querySelector<HTMLElement>('[role="alert"]'),
      'alert',
    );
    expect(alert.textContent).toContain(
      'The model provider does not know the model.',
    );
  });

  it('Y6 with no active project the panel posts nothing and says so', async () => {
    doubles.api.respond('GET', DETAIL_PATH, DETAIL);
    doubles.api.respond('GET', ACTIVE_PATH, { active: null });
    const fixture = await render();

    formOf(fixture).set({
      coreIdea: 'Engines reward patience',
      entityIds: [],
      styleProfile: '',
      person: '',
    });
    await settle(fixture);
    await submit(fixture);

    expect(requestsTo('POST', EXECUTE_PATH)).toHaveLength(0);
    expect(requestsTo('GET', RESOLVE_PATH)).toHaveLength(0);
    expect(root(fixture).textContent).toContain(
      'No active project, so the tool cannot run.',
    );
  });
});

/** Renders the list and selects a row by its name button, then lets the reads settle. */
async function selectRow(
  fixture: ComponentFixture<ToolsListPage>,
  name: string,
  origin: string,
): Promise<void> {
  const button = must(
    root(fixture).querySelector<HTMLElement>(
      `li[data-tool="${name}"][data-origin="${origin}"] [data-open]`,
    ),
    `name button of ${origin}/${name}`,
  );
  button.click();
  await settle(fixture);
}

function tryTab(fixture: ComponentFixture<ToolsListPage>): HTMLElement | null {
  return root(fixture).querySelector<HTMLElement>('[data-tab="try"]');
}

async function renderList(): Promise<ComponentFixture<ToolsListPage>> {
  const fixture = TestBed.createComponent(ToolsListPage);
  await settle(fixture);
  return fixture;
}

describe('ToolsListPage: the Try tab', () => {
  it('Y7a the Try tab is absent on an invalid row', async () => {
    doubles.api.respond('GET', LIST_PATH, { tools: [LINT_FAIL] });
    const fixture = await renderList();

    await selectRow(fixture, 'lint_fail', 'user');

    expect(tryTab(fixture)).toBeNull();
  });

  it('Y7b on a valid row Try is offered, and opening it mounts the panel and reads the tool once more', async () => {
    doubles.api.respond('GET', LIST_PATH, { tools: [COLD_OPEN] });
    respondToPanel();
    const fixture = await renderList();

    await selectRow(fixture, 'cold_open', 'core');

    expect(requestsTo('GET', DETAIL_PATH)).toHaveLength(1);
    expect(root(fixture).querySelector('app-tools-try')).toBeNull();

    must(tryTab(fixture), 'Try tab').click();
    await settle(fixture);

    expect(root(fixture).querySelector('app-tools-try')).not.toBeNull();
    expect(requestsTo('GET', DETAIL_PATH)).toHaveLength(2);
  });

  it('Y8 selecting another row returns the detail to Preview', async () => {
    doubles.api.respond('GET', LIST_PATH, { tools: [COLD_OPEN, MY_TOOL] });
    respondToPanel();
    doubles.api.respond('GET', MY_TOOL_PATH, DETAIL);
    const fixture = await renderList();

    await selectRow(fixture, 'cold_open', 'core');
    must(tryTab(fixture), 'Try tab').click();
    await settle(fixture);
    expect(root(fixture).querySelector('app-tools-try')).not.toBeNull();

    await selectRow(fixture, 'my_tool', 'user');

    expect(root(fixture).querySelector('app-tools-preview')).not.toBeNull();
    expect(root(fixture).querySelector('app-tools-try')).toBeNull();
    expect(tryTab(fixture)?.getAttribute('aria-selected')).toBe('false');
    const preview = must(
      root(fixture).querySelector<HTMLElement>(
        'div[role="tablist"] button[role="tab"][aria-selected="true"]',
      ),
      'selected tab',
    );
    expect(preview.textContent.trim()).toBe('Preview');
  });
});
