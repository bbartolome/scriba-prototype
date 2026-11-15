import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import type {
  FormDescriptor,
  FormField,
  PortDescriptor,
  ToolArgsIssue,
} from '@bbartolome/scriba-contracts/tool-registry';
import { beforeEach, describe, expect, it } from 'vitest';
import { createShellTestDoubles } from '../../shell/testing/test-doubles';
import { ToolForm, type ToolFormLayout } from './tool-registry.routes';

/** One field as the merged emitter writes it: every key present, the optional ones only when set. */
function field(
  key: string,
  partial: Partial<FormField> &
    Pick<FormField, 'title' | 'control' | 'valueType'>,
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

// The form fixture: one field per control, the two list fields and the entity list.
const FORM: FormDescriptor = {
  fields: [
    field('coreIdea', {
      title: 'Core idea',
      control: 'text',
      valueType: 'string',
      required: true,
      port: true,
    }),
    field('notes', {
      title: 'Notes',
      control: 'textarea',
      valueType: 'string',
      maxLength: 500,
    }),
    field('tone', {
      title: 'Tone',
      control: 'select',
      valueType: 'string',
      enum: ['warm', 'dry'],
    }),
    field('length', {
      title: 'Length',
      control: 'slider',
      valueType: 'integer',
      minimum: 200,
      maximum: 2000,
      default: 800,
    }),
    field('count', { title: 'Count', control: 'number', valueType: 'integer' }),
    field('moody', { title: 'Moody', control: 'toggle', valueType: 'boolean' }),
    field('person', {
      title: 'Person',
      control: 'entity-picker',
      valueType: 'string',
      elementType: 'entity',
      entityKinds: ['person'],
      port: true,
    }),
    field('styleProfile', {
      title: 'Style profile',
      control: 'style-picker',
      valueType: 'string',
      elementType: 'style',
      port: true,
    }),
    field('entityIds', {
      title: 'Entities',
      control: 'entity-picker',
      valueType: 'string',
      elementType: 'entity',
      list: true,
      port: true,
    }),
    field('tags', {
      title: 'Tags',
      control: 'text',
      valueType: 'string',
      list: true,
    }),
    field('numbers', {
      title: 'Numbers',
      control: 'number',
      valueType: 'integer',
      list: true,
    }),
  ],
};

// The node-body fixture: the cold-open ports in property order, and the params length and tone.
const NODE_FORM: FormDescriptor = {
  fields: [
    field('coreIdea', {
      title: 'Core idea',
      control: 'text',
      valueType: 'string',
      required: true,
      port: true,
    }),
    field('entityIds', {
      title: 'Entities',
      control: 'entity-picker',
      valueType: 'string',
      elementType: 'entity',
      list: true,
      port: true,
    }),
    field('styleProfile', {
      title: 'Style profile',
      control: 'style-picker',
      valueType: 'string',
      elementType: 'style',
      port: true,
    }),
    field('person', {
      title: 'Person',
      control: 'entity-picker',
      valueType: 'string',
      elementType: 'entity',
      port: true,
    }),
    field('moment', {
      title: 'Moment',
      control: 'text',
      valueType: 'string',
      port: true,
    }),
    field('length', {
      title: 'Length',
      control: 'slider',
      valueType: 'integer',
      minimum: 200,
      maximum: 2000,
    }),
    field('tone', {
      title: 'Tone',
      control: 'select',
      valueType: 'string',
      enum: ['warm', 'dry'],
    }),
  ],
};

const NODE_PORTS: PortDescriptor = {
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
      title: 'Style profile',
    },
    {
      key: 'person',
      type: 'entity',
      list: false,
      required: false,
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

/**
 * The host binds the inputs and `[(value)]`, and records `submitted`. The handle template is the
 * Graph runner's: it carries the port's key and side.
 */
@Component({
  imports: [ToolForm],
  template: `
    <ng-template #handleTpl let-port>
      <i
        class="handle"
        [attr.data-port]="port.key"
        [attr.data-side]="port.side"
      ></i>
    </ng-template>
    <app-tool-form
      [form]="form"
      [ports]="ports"
      [layout]="layout"
      [issues]="issues"
      [handle]="withHandle ? handleTpl : null"
      [(value)]="value"
      (submitted)="submitted = $event"
    />
  `,
})
class Host {
  form: FormDescriptor = FORM;
  ports: PortDescriptor | null = null;
  layout: ToolFormLayout = 'form';
  issues: ToolArgsIssue[] = [];
  withHandle = false;
  value: Record<string, unknown> = {};
  submitted: Record<string, unknown> | undefined = undefined;
}

interface Setup {
  form?: FormDescriptor;
  ports?: PortDescriptor;
  layout?: ToolFormLayout;
  issues?: ToolArgsIssue[];
  withHandle?: boolean;
  value?: Record<string, unknown>;
}

beforeEach(() => {
  // The Shell's fakes, as the module's UI seam names them. The component does no I/O, so no test drives them.
  const doubles = createShellTestDoubles();
  TestBed.configureTestingModule({ providers: [...doubles.providers] });
});

/** Renders the host with the given inputs and lets the first render settle. */
async function render(setup: Setup = {}): Promise<ComponentFixture<Host>> {
  const fixture = TestBed.createComponent(Host);
  const host = fixture.componentInstance;
  if (setup.form !== undefined) host.form = setup.form;
  if (setup.ports !== undefined) host.ports = setup.ports;
  if (setup.layout !== undefined) host.layout = setup.layout;
  if (setup.issues !== undefined) host.issues = setup.issues;
  if (setup.withHandle !== undefined) host.withHandle = setup.withHandle;
  if (setup.value !== undefined) host.value = setup.value;
  await settle(fixture);
  return fixture;
}

/** The app is zoneless, so each event is followed by a detectChanges and a settle. */
async function settle(fixture: ComponentFixture<Host>): Promise<void> {
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
}

function rootOf(fixture: ComponentFixture<Host>): HTMLElement {
  return fixture.nativeElement as HTMLElement;
}

function must<T>(value: T | null | undefined, what: string): T {
  if (value === null || value === undefined) throw new Error(`no ${what}`);
  return value;
}

function sectionOf(root: ParentNode, key: string): HTMLElement {
  return must(
    root.querySelector<HTMLElement>(`section[data-key="${key}"]`),
    `section ${key}`,
  );
}

function elementOf<T extends Element>(scope: ParentNode, selector: string): T {
  return must(scope.querySelector<T>(selector), selector);
}

/** Sets a DOM control's value, then fires the event a user's edit fires. */
function edit(
  element: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement,
  value: string,
  eventName = 'input',
): void {
  element.value = value;
  element.dispatchEvent(new Event(eventName));
}

function buttonLabelled(scope: ParentNode, label: string): HTMLButtonElement {
  const button = [...scope.querySelectorAll<HTMLButtonElement>('button')].find(
    (candidate) => candidate.textContent.trim() === label,
  );
  return must(button, `button ${label}`);
}

function inputsOf(scope: ParentNode): HTMLInputElement[] {
  return [...scope.querySelectorAll<HTMLInputElement>('input')];
}

describe('ToolForm, form layout', () => {
  it('T1 renders each control type from the fixture, with the list items of each list', async () => {
    const fixture = await render({
      value: { coreIdea: 'Seven days', tags: ['a'], numbers: [1] },
    });
    const root = rootOf(fixture);

    const controls: Record<string, string> = {
      coreIdea: 'text',
      notes: 'textarea',
      tone: 'select',
      length: 'slider',
      count: 'number',
      moody: 'toggle',
      person: 'entity-picker',
      styleProfile: 'style-picker',
      entityIds: 'entity-picker',
      tags: 'text',
      numbers: 'number',
    };
    for (const [key, control] of Object.entries(controls)) {
      expect(sectionOf(root, key).getAttribute('data-control')).toBe(control);
    }

    elementOf(root, 'section[data-key="notes"] textarea');
    elementOf(root, 'section[data-key="tone"] select');
    elementOf(root, 'section[data-key="coreIdea"] input[type="text"]');
    elementOf(root, 'section[data-key="length"] input[type="range"]');
    elementOf(root, 'section[data-key="count"] input[type="number"]');
    elementOf(root, 'section[data-key="moody"] mat-slide-toggle');
    elementOf(root, 'section[data-key="person"] .picker-slot');

    const tagItems = inputsOf(sectionOf(root, 'tags'));
    expect(tagItems.map((input) => input.type)).toEqual(['text']);
    const numberItems = inputsOf(sectionOf(root, 'numbers'));
    expect(numberItems.map((input) => input.type)).toEqual(['number']);
  });

  it('T2 round-trips the scalar values: none at render, the edited values after', async () => {
    const input = {
      coreIdea: 'Seven days',
      notes: 'Rain.',
      tone: 'dry',
      length: 900,
      count: 3,
      moody: true,
    };
    const fixture = await render({ value: { ...input } });
    const root = rootOf(fixture);
    const host = fixture.componentInstance;

    expect(host.value).toEqual(input);
    expect(
      elementOf<HTMLInputElement>(root, 'section[data-key="coreIdea"] input')
        .value,
    ).toBe('Seven days');
    expect(
      elementOf<HTMLTextAreaElement>(root, 'section[data-key="notes"] textarea')
        .value,
    ).toBe('Rain.');
    expect(
      elementOf<HTMLSelectElement>(root, 'section[data-key="tone"] select')
        .value,
    ).toBe('dry');
    expect(
      elementOf<HTMLInputElement>(root, 'section[data-key="length"] input')
        .value,
    ).toBe('900');
    expect(
      elementOf<HTMLInputElement>(root, 'section[data-key="count"] input')
        .value,
    ).toBe('3');
    expect(
      elementOf(
        root,
        'section[data-key="moody"] button[role="switch"]',
      ).getAttribute('aria-checked'),
    ).toBe('true');

    edit(elementOf(root, 'section[data-key="coreIdea"] input'), 'Eight days');
    edit(elementOf(root, 'section[data-key="notes"] textarea'), 'Snow.');
    edit(elementOf(root, 'section[data-key="tone"] select'), 'warm', 'change');
    edit(elementOf(root, 'section[data-key="length"] input'), '1000');
    edit(elementOf(root, 'section[data-key="count"] input'), '12');
    elementOf<HTMLButtonElement>(
      root,
      'section[data-key="moody"] button[role="switch"]',
    ).click();
    await settle(fixture);

    expect(host.value).toEqual({
      coreIdea: 'Eight days',
      notes: 'Snow.',
      tone: 'warm',
      length: 1000,
      count: 12,
      moody: false,
    });
    expect(typeof host.value['length']).toBe('number');
    expect(typeof host.value['count']).toBe('number');
    expect(typeof host.value['moody']).toBe('boolean');
  });

  it('T3 round-trips the list items: edit, remove, and add with a null number row', async () => {
    const fixture = await render({
      value: { tags: ['a', 'b'], numbers: [1, 2] },
    });
    const root = rootOf(fixture);
    const host = fixture.componentInstance;

    edit(inputsOf(sectionOf(root, 'tags'))[1], 'c');
    await settle(fixture);
    buttonLabelled(sectionOf(root, 'tags'), 'Remove').click();
    await settle(fixture);
    expect(host.value['tags']).toEqual(['c']);

    buttonLabelled(sectionOf(root, 'numbers'), 'Add item').click();
    await settle(fixture);
    expect(host.value['numbers']).toEqual([1, 2, null]);

    edit(inputsOf(sectionOf(root, 'numbers'))[2], '3');
    await settle(fixture);
    expect(host.value['numbers']).toEqual([1, 2, 3]);
    expect(
      (host.value['numbers'] as unknown[]).every(
        (item) => typeof item === 'number',
      ),
    ).toBe(true);
  });

  it('T4 shows the picker values as read-only text and emits them unchanged on submit', async () => {
    const fixture = await render({
      value: {
        person: 'ada',
        styleProfile: 'house-style',
        entityIds: ['ada', 'bob'],
      },
    });
    const root = rootOf(fixture);
    const host = fixture.componentInstance;

    expect(
      elementOf(
        root,
        'section[data-key="person"] .picker-slot[data-control="entity-picker"]',
      ).textContent,
    ).toContain('ada');
    const entitySlot = elementOf(
      root,
      'section[data-key="entityIds"] .picker-slot[data-control="entity-picker"]',
    );
    expect(entitySlot.textContent).toContain('ada');
    expect(entitySlot.textContent).toContain('bob');
    expect(
      elementOf(
        root,
        'section[data-key="styleProfile"] .picker-slot[data-control="style-picker"]',
      ).textContent,
    ).toContain('house-style');

    // The only value added is the length default (D6): the picker values are unchanged.
    buttonLabelled(root, 'Submit').click();
    await settle(fixture);
    expect(host.value).toEqual({
      person: 'ada',
      styleProfile: 'house-style',
      entityIds: ['ada', 'bob'],
      length: 800,
    });
    expect(host.submitted).toEqual(host.value);
  });

  it('T7 shows each field issue inside its field, with the item prefix and the aria-describedby link', async () => {
    const issues: ToolArgsIssue[] = [
      {
        path: '/coreIdea',
        message: 'required, expected a string, received nothing',
      },
      { path: '/length', message: 'expected an integer, received "3"' },
      {
        path: '/entityIds/1',
        message:
          'expected an entity ID (lower-case letters, digits and hyphens), received "Ada Lovelace"',
      },
    ];
    const fixture = await render({ issues, value: {} });
    const root = rootOf(fixture);

    const coreIdea = sectionOf(root, 'coreIdea');
    const coreIdeaIssue = elementOf<HTMLElement>(coreIdea, 'p.issue');
    expect(coreIdeaIssue.textContent).toBe(
      'required, expected a string, received nothing',
    );
    expect(
      elementOf<HTMLInputElement>(coreIdea, 'input').getAttribute(
        'aria-describedby',
      ),
    ).toContain(coreIdeaIssue.id);

    const length = sectionOf(root, 'length');
    const lengthIssue = elementOf<HTMLElement>(length, 'p.issue');
    expect(lengthIssue.textContent).toBe('expected an integer, received "3"');
    expect(
      elementOf<HTMLInputElement>(length, 'input').getAttribute(
        'aria-describedby',
      ),
    ).toContain(lengthIssue.id);

    const entities = sectionOf(root, 'entityIds');
    const entityIssue = elementOf<HTMLElement>(entities, 'p.issue');
    expect(entityIssue.textContent).toBe(
      'Item 2: expected an entity ID (lower-case letters, digits and hyphens), received "Ada Lovelace"',
    );
    expect(
      elementOf<HTMLElement>(entities, '.picker-slot').getAttribute(
        'aria-describedby',
      ),
    ).toContain(entityIssue.id);
  });

  it('T8 shows the issues that name no field above the fields, inside no section', async () => {
    const issues: ToolArgsIssue[] = [
      { path: '', message: 'expected an object' },
      { path: '/extra', message: 'unknown field' },
    ];
    const fixture = await render({ issues, value: {} });
    const root = rootOf(fixture);

    const messages = [...root.querySelectorAll<HTMLElement>('p.issue')];
    expect(messages.map((message) => message.textContent)).toEqual([
      'expected an object',
      'unknown field',
    ]);
    const firstSection = must(root.querySelector('section'), 'a section');
    for (const message of messages) {
      expect(
        firstSection.compareDocumentPosition(message) &
          Node.DOCUMENT_POSITION_PRECEDING,
      ).toBeTruthy();
    }
    expect(root.querySelectorAll('section .issue').length).toBe(0);
  });

  it('E1 marks a required field, and writes a default into the value and the control', async () => {
    const fixture = await render({ value: {} });
    const root = rootOf(fixture);
    const host = fixture.componentInstance;

    const coreIdea = sectionOf(root, 'coreIdea');
    expect(elementOf(coreIdea, 'span[aria-hidden="true"]').textContent).toBe(
      '*',
    );
    expect(
      elementOf<HTMLInputElement>(coreIdea, 'input').getAttribute(
        'aria-required',
      ),
    ).toBe('true');
    expect(
      elementOf<HTMLInputElement>(
        sectionOf(root, 'length'),
        'input[type="range"]',
      ).value,
    ).toBe('800');
    expect(host.value['length']).toBe(800);
  });

  it('E2 emits the value with the defaults on submit, and removes a cleared key', async () => {
    const fixture = await render({ value: { coreIdea: 'Seven days' } });
    const root = rootOf(fixture);
    const host = fixture.componentInstance;

    buttonLabelled(root, 'Submit').click();
    await settle(fixture);
    expect(host.submitted).toEqual({ coreIdea: 'Seven days', length: 800 });
    expect(host.submitted).toEqual(host.value);

    const before = host.value;
    edit(elementOf(root, 'section[data-key="coreIdea"] input'), '');
    await settle(fixture);
    expect(host.value).not.toBe(before);
    expect('coreIdea' in host.value).toBe(false);
  });
});

describe('ToolForm, node-body layout', () => {
  it('T5 shows the port rows in order, with the handle, and the params controls only', async () => {
    const fixture = await render({
      form: NODE_FORM,
      ports: NODE_PORTS,
      layout: 'node-body',
      withHandle: true,
      value: { tone: 'dry' },
    });
    const root = rootOf(fixture);
    const host = fixture.componentInstance;

    const rows = [...root.querySelectorAll<HTMLElement>('li[data-port]')];
    expect(rows.map((row) => row.getAttribute('data-port'))).toEqual([
      'coreIdea',
      'entityIds',
      'styleProfile',
      'person',
      'moment',
      'output',
    ]);
    expect(rows.map((row) => row.getAttribute('data-side'))).toEqual([
      'input',
      'input',
      'input',
      'input',
      'input',
      'output',
    ]);
    for (const row of rows) {
      const handles = row.querySelectorAll<HTMLElement>('.handle');
      expect(handles.length).toBe(1);
      expect(handles[0].getAttribute('data-port')).toBe(
        row.getAttribute('data-port'),
      );
    }

    // Only the params have controls: the range and the select.
    expect(
      root.querySelectorAll('input, select, textarea, mat-slide-toggle').length,
    ).toBe(2);
    expect(
      elementOf(root, 'section[data-key="length"] input').getAttribute('type'),
    ).toBe('range');
    expect(elementOf(root, 'section[data-key="tone"] select')).toBeTruthy();
    expect(root.querySelectorAll('button[type="submit"]').length).toBe(0);

    edit(elementOf(root, 'section[data-key="length"] input'), '1000');
    await settle(fixture);
    expect(host.value).toEqual({ tone: 'dry', length: 1000 });
    expect('coreIdea' in host.value).toBe(false);
  });

  it('T6 renders the rows with no handle and no error, each with its title', async () => {
    const fixture = await render({
      form: NODE_FORM,
      ports: NODE_PORTS,
      layout: 'node-body',
      withHandle: false,
      value: { tone: 'dry' },
    });
    const root = rootOf(fixture);

    expect(root.querySelectorAll('.handle').length).toBe(0);
    const rows = [...root.querySelectorAll<HTMLElement>('li[data-port]')];
    expect(rows.length).toBe(6);
    expect(
      rows.map((row) => elementOf(row, '.port-title').textContent),
    ).toEqual([
      'Core idea',
      'Entities',
      'Style profile',
      'Person',
      'Moment',
      'Output',
    ]);
  });
});
