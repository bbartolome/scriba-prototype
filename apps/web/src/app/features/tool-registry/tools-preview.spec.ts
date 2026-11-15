import { ComponentFixture, TestBed } from '@angular/core/testing';
import type {
  FormDescriptor,
  FormField,
  PortDescriptor,
} from '@bbartolome/scriba-contracts/tool-registry';
import { beforeEach, describe, expect, it } from 'vitest';
import { ApiError } from '../../shell';
import {
  createShellTestDoubles,
  type ShellTestDoubles,
} from '../../shell/testing/test-doubles';
import { ToolsPreviewPage } from './tools-preview';

// The paths of the preview: the cold-open tool, and the project p1 that is active in these answers.
const DETAIL_PATH = '/api/tool-registry/tools/cold_open';
const VALIDATE_PATH = '/api/tool-registry/tools/cold_open/validate';
const ACTIVE_PATH = '/api/project-store/active';
const ENTITIES_PATH = '/api/project-store/projects/p1/entities';
const FILE_PATH = '/api/project-store/projects/p1/file';

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

let doubles: ShellTestDoubles;

beforeEach(() => {
  doubles = createShellTestDoubles();
  TestBed.configureTestingModule({ providers: [...doubles.providers] });
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
});

/** The app is zoneless, so each event is followed by a detectChanges and a settle. */
async function settle(
  fixture: ComponentFixture<ToolsPreviewPage>,
): Promise<void> {
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
}

/** Renders the page and lets the first reads settle. */
async function render(): Promise<ComponentFixture<ToolsPreviewPage>> {
  const fixture = TestBed.createComponent(ToolsPreviewPage);
  await settle(fixture);
  return fixture;
}

function must<T>(value: T | null | undefined, what: string): T {
  if (value === null || value === undefined) throw new Error(`no ${what}`);
  return value;
}

/** The form layout, the only one whose fields are sections with a data-key. */
function formLayout(fixture: ComponentFixture<ToolsPreviewPage>): HTMLElement {
  return must(
    (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>(
      'section[aria-label="Form layout"]',
    ),
    'form layout',
  );
}

function sectionOf(
  fixture: ComponentFixture<ToolsPreviewPage>,
  key: string,
): HTMLElement {
  return must(
    formLayout(fixture).querySelector<HTMLElement>(
      `section[data-key="${key}"]`,
    ),
    `section ${key}`,
  );
}

/** The text of the `pre` in a labelled section; empty when the section shows none. */
function preIn(
  fixture: ComponentFixture<ToolsPreviewPage>,
  label: string,
): string {
  const pre = (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>(
    `section[aria-label="${label}"] pre`,
  );
  return pre?.textContent ?? '';
}

/** Submits the form layout, as its Submit button does. */
async function submit(
  fixture: ComponentFixture<ToolsPreviewPage>,
): Promise<void> {
  const form = must(
    formLayout(fixture).querySelector<HTMLFormElement>('form'),
    'form',
  );
  form.dispatchEvent(new Event('submit', { cancelable: true }));
  await settle(fixture);
}

function validateRequests() {
  return doubles.api.requests.filter(
    (request) => request.method === 'POST' && request.path === VALIDATE_PATH,
  );
}

describe('ToolsPreviewPage: submit to validate', () => {
  it('posts the arguments to validate in full mode', async () => {
    doubles.api.respond('POST', VALIDATE_PATH, {
      arguments: { length: 800 },
      entityRefs: [],
    });
    const fixture = await render();
    await submit(fixture);

    const posts = validateRequests();
    expect(posts).toHaveLength(1);
    const body = posts[0].body as { arguments: unknown; mode: string };
    expect(body.mode).toBe('full');
    expect(body.arguments).toEqual({ length: 800 });
  });

  it('shows each refusal next to its field', async () => {
    doubles.api.fail(
      'POST',
      VALIDATE_PATH,
      new ApiError(422, 'TOOL_ARGS_INVALID', 'The arguments are not valid.', {
        issues: [
          {
            path: '/coreIdea',
            message: 'required, expected a string, received nothing',
          },
          {
            path: '/tone',
            message: 'expected one of "warm", "dry", received "spicy"',
          },
        ],
      }),
    );
    const fixture = await render();
    await submit(fixture);

    expect(sectionOf(fixture, 'coreIdea').textContent).toContain(
      'required, expected a string, received nothing',
    );
    expect(sectionOf(fixture, 'tone').textContent).toContain(
      'expected one of "warm", "dry", received "spicy"',
    );
    expect(preIn(fixture, 'Validate result')).toBe('');
  });

  it('shows the arguments with their defaults applied after a valid submit', async () => {
    doubles.api.respond('POST', VALIDATE_PATH, {
      arguments: { coreIdea: 'Seven days', person: 'ada', length: 800 },
      entityRefs: [],
    });
    const fixture = await render();
    await submit(fixture);

    expect(preIn(fixture, 'Validate result')).toContain('"length": 800');
    const issues = formLayout(fixture).querySelectorAll('p.issue');
    expect(issues).toHaveLength(0);
  });
});
