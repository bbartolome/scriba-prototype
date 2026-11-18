import { ComponentFixture, TestBed } from '@angular/core/testing';
import type { WritableSignal } from '@angular/core';
import type {
  FormDescriptor,
  FormField,
  PortDescriptor,
  ToolArguments,
} from '@bbartolome/scriba-contracts/tool-registry';
import { EditorView } from '@codemirror/view';
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
import { ToolLivePreview } from './tool-live-preview';

const ACTIVE_PATH = '/api/project-store/active';
const ENTITIES_PATH = '/api/project-store/projects/p1/entities';
const FILE_PATH = '/api/project-store/projects/p1/file';
const RESOLVE_ADA_PATH =
  '/api/project-store/projects/p1/entities/resolve?ids=ada';
const RENDER_PATH = '/api/tool-registry/tools/cold_open/render';
const LIST_PATH = '/api/tool-registry/tools';
const LINT_PATH = '/api/tool-registry/lint';
const MY_TOOL_DETAIL_PATH = '/api/tool-registry/tools/my_tool';
const MY_TOOL_USER_PATH = '/api/tool-registry/tools/my_tool/user';

const HASH = `sha256:${'0'.repeat(64)}`;
const SOURCE = 'schemaVersion: 1\nname: cold_open\n';

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

// A small form: a text, an entity list, a style and a required person.
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
    field('person', {
      title: 'Person',
      control: 'entity-picker',
      required: true,
      entityKinds: ['person'],
      port: true,
    }),
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
  ],
  output: { key: 'output', type: 'text', kind: 'draft' },
  params: [],
};

// The same form with the coreIdea port removed: one input port fewer.
const PORTS_WITHOUT_CORE: PortDescriptor = {
  ...PORTS,
  inputs: PORTS.inputs.filter((input) => input.key !== 'coreIdea'),
};

const FUNCTION_SCHEMA = {
  type: 'function',
  function: {
    name: 'cold_open',
    description: 'Drafts the cold open of a chapter from its core idea.',
    parameters: { type: 'object', properties: {} },
  },
};

const VIEWS = { functionSchema: FUNCTION_SCHEMA, form: FORM, ports: PORTS };
const VIEWS_WITHOUT_CORE = {
  functionSchema: FUNCTION_SCHEMA,
  form: FORM,
  ports: PORTS_WITHOUT_CORE,
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

/** The answers of the pickers and the project: the active project p1, its entities and its file. */
function respondToProject(): void {
  doubles.api.respond('GET', ACTIVE_PATH, { active: 'p1' });
  doubles.api.respond('GET', ENTITIES_PATH, {
    entities: [
      { id: 'ada', type: 'person', path: 'entities/ada.md' },
      { id: 'field-notes', type: 'source', path: 'sources/field-notes.md' },
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

async function settle(
  fixture: ComponentFixture<ToolLivePreview> | ComponentFixture<ToolsListPage>,
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

/** Renders the panel with the given views and lets the first reads settle. */
async function render(
  views: unknown,
): Promise<ComponentFixture<ToolLivePreview>> {
  const fixture = TestBed.createComponent(ToolLivePreview);
  fixture.componentRef.setInput('tool', 'cold_open');
  fixture.componentRef.setInput('source', SOURCE);
  fixture.componentRef.setInput('views', views);
  await settle(fixture);
  return fixture;
}

async function clickTab(
  fixture: ComponentFixture<ToolLivePreview>,
  id: 'form' | 'node' | 'function' | 'prompt',
): Promise<void> {
  must(
    root(fixture).querySelector<HTMLButtonElement>(`[data-live-tab="${id}"]`),
    `tab ${id}`,
  ).click();
  await settle(fixture);
}

function formOf(
  fixture: ComponentFixture<ToolLivePreview>,
): WritableSignal<ToolArguments> {
  return (
    fixture.componentInstance as unknown as {
      formValue: WritableSignal<ToolArguments>;
    }
  ).formValue;
}

function requestsTo(method: 'GET' | 'POST', path: string) {
  return doubles.api.requests.filter(
    (request) => request.method === method && request.path === path,
  );
}

describe('ToolLivePreview: the four tabs', () => {
  it('V1 a new views input moves the node-body port rows', async () => {
    respondToProject();
    const fixture = await render(VIEWS);
    await clickTab(fixture, 'node');
    expect(root(fixture).querySelectorAll('li[data-port]')).toHaveLength(
      PORTS.inputs.length + 1,
    );

    fixture.componentRef.setInput('views', VIEWS_WITHOUT_CORE);
    await settle(fixture);
    expect(root(fixture).querySelectorAll('li[data-port]')).toHaveLength(
      PORTS_WITHOUT_CORE.inputs.length + 1,
    );
    expect(root(fixture).querySelector('li[data-port="coreIdea"]')).toBeNull();
  });

  it('V2 the entity picker offers the entities of the kinds the field takes, and it re-filters when the kinds change', async () => {
    respondToProject();
    const fixture = await render(VIEWS);
    await clickTab(fixture, 'form');
    const offered = () =>
      Array.from(
        must(
          root(fixture).querySelector<HTMLSelectElement>(
            'section[data-key="entityIds"] select',
          ),
          'the entity picker',
        ).options,
      )
        .map((option) => option.value)
        .filter((value) => value !== '');
    expect(offered()).toEqual(['ada']);

    const sourceKinds: FormDescriptor = {
      fields: FORM.fields.map((item) =>
        item.key === 'entityIds' ? { ...item, entityKinds: ['source'] } : item,
      ),
    };
    fixture.componentRef.setInput('views', {
      ...VIEWS,
      form: sourceKinds,
    });
    await settle(fixture);
    expect(offered()).toEqual(['field-notes']);
  });

  it('V3 render posts the arguments, the resolved entity as ref = id, and the source; the answer shows in the prompt', async () => {
    respondToProject();
    doubles.api.respond('GET', RESOLVE_ADA_PATH, {
      resolved: [
        { id: 'ada', type: 'person', path: 'entities/ada.md', content: 'Ada.' },
      ],
      errors: [],
    });
    doubles.api.respond('POST', RENDER_PATH, {
      prompt: 'Core idea: Engines reward patience. person ada',
    });
    const fixture = await render(VIEWS);
    formOf(fixture).set({
      coreIdea: 'Engines reward patience',
      entityIds: ['ada'],
      person: 'ada',
    });
    await settle(fixture);
    await clickTab(fixture, 'prompt');
    must(
      root(fixture).querySelector<HTMLButtonElement>('[data-render]'),
      'Render',
    ).click();
    await settle(fixture);

    const posts = requestsTo('POST', RENDER_PATH);
    expect(posts).toHaveLength(1);
    const body = posts[0]?.body as {
      arguments: Record<string, unknown>;
      entities: { ref: string; type: string }[];
      source: string;
    };
    expect(body.arguments).toMatchObject({
      coreIdea: 'Engines reward patience',
      entityIds: ['ada'],
      person: 'ada',
    });
    expect(body.entities).toEqual([
      expect.objectContaining({ ref: 'ada', type: 'person' }),
    ]);
    expect(body.source).toBe(SOURCE);
    expect(
      must(root(fixture).querySelector('[data-prompt]'), 'the prompt')
        .textContent,
    ).toContain('Core idea: Engines reward patience');
  });

  it('V4 a refused render (TOOL_ARGS_INVALID) shows each issue beside its field', async () => {
    respondToProject();
    doubles.api.respond('GET', RESOLVE_ADA_PATH, {
      resolved: [
        { id: 'ada', type: 'person', path: 'entities/ada.md', content: 'Ada.' },
      ],
      errors: [],
    });
    doubles.api.fail(
      'POST',
      RENDER_PATH,
      new ApiError(422, 'TOOL_ARGS_INVALID', 'The arguments are not valid.', {
        issues: [{ path: '/coreIdea', message: 'must have required property' }],
      }),
    );
    const fixture = await render(VIEWS);
    formOf(fixture).set({ person: 'ada' });
    await settle(fixture);
    await clickTab(fixture, 'prompt');
    must(
      root(fixture).querySelector<HTMLButtonElement>('[data-render]'),
      'Render',
    ).click();
    await settle(fixture);

    expect(root(fixture).querySelector('[data-prompt]')).toBeNull();
    // The issue shows beside its field on the Form tab, which keeps the issues.
    await clickTab(fixture, 'form');
    expect(
      must(
        root(fixture).querySelector<HTMLElement>(
          'section[data-key="coreIdea"]',
        ),
        'section coreIdea',
      ).textContent,
    ).toContain('must have required property');
  });

  it('V5 with null views the panel shows its note, no tab and no picker or render request', async () => {
    respondToProject();
    const fixture = await render(null);

    expect(root(fixture).querySelector('[data-live-note]')).not.toBeNull();
    expect(root(fixture).querySelectorAll('[role="tab"]')).toHaveLength(0);
    expect(doubles.api.requests.map((request) => request.path)).toEqual([
      ACTIVE_PATH,
    ]);
  });

  it('V3b the Function tab shows the function schema as JSON', async () => {
    respondToProject();
    const fixture = await render(VIEWS);
    await clickTab(fixture, 'function');
    expect(
      JSON.parse(
        must(
          root(fixture).querySelector('[data-function]'),
          'the function schema',
        ).textContent ?? '',
      ),
    ).toEqual(FUNCTION_SCHEMA);
  });
});

describe('ToolsListPage: the live panel beside the Source tab', () => {
  // V6: the panel's node preview follows the editor's lint answer, and returns to the loaded views when the text
  // is typed back to the loaded text.
  it('V6 a typed change and its lint answer move the node preview; typing back restores the loaded rows', async () => {
    doubles.api.respond('GET', LIST_PATH, {
      tools: [
        {
          name: 'my_tool',
          description: 'A user tool',
          output: 'draft',
          enabled: true,
          origin: 'user',
          valid: true,
          lintCounts: { errors: 0, warnings: 0 },
        },
      ],
    });
    doubles.api.respond('GET', MY_TOOL_DETAIL_PATH, {
      spec: null,
      source: SOURCE,
      origin: 'user',
      lint: [],
      views: VIEWS,
    });
    doubles.api.respond('GET', MY_TOOL_USER_PATH, {
      source: SOURCE,
      lint: [],
      views: VIEWS,
    });
    doubles.api.respond('POST', LINT_PATH, {
      lint: [],
      views: VIEWS_WITHOUT_CORE,
    });
    respondToProject();
    const fixture = TestBed.createComponent(ToolsListPage);
    await settle(fixture);

    must(
      root(fixture).querySelector<HTMLButtonElement>(
        'li[data-tool="my_tool"][data-origin="user"] [data-open]',
      ),
      'open my_tool',
    ).click();
    await settle(fixture);
    must(
      root(fixture).querySelector<HTMLButtonElement>('[data-tab="source"]'),
      'the Source tab',
    ).click();
    await settle(fixture);
    must(
      root(fixture).querySelector<HTMLButtonElement>('[data-live-tab="node"]'),
      'the node tab',
    ).click();
    await settle(fixture);
    const portCount = () =>
      root(fixture).querySelectorAll(
        'section[aria-label="Live preview"] li[data-port]',
      ).length;
    expect(portCount()).toBe(PORTS.inputs.length + 1);

    const editor = EditorView.findFromDOM(
      must(
        root(fixture).querySelector<HTMLElement>('[data-editor]'),
        'the editor',
      ),
    );
    if (editor === null) throw new Error('No editor view.');
    editor.dispatch({
      changes: { from: editor.state.doc.length, insert: '# changed\n' },
    });
    // The editor lints after its debounce of 500 ms, with a real timer in this test.
    await new Promise((resolve) => setTimeout(resolve, 600));
    await settle(fixture);
    expect(portCount()).toBe(PORTS_WITHOUT_CORE.inputs.length + 1);

    editor.dispatch({
      changes: { from: 0, to: editor.state.doc.length, insert: SOURCE },
    });
    await new Promise((resolve) => setTimeout(resolve, 600));
    await settle(fixture);
    expect(portCount()).toBe(PORTS.inputs.length + 1);
  });
});
