import type { GraphFile } from '@bbartolome/scriba-contracts/graph-runner';
import type {
  FormDescriptor,
  PortDescriptor,
  ToolSummary,
  ToolViews,
} from '@bbartolome/scriba-contracts/tool-registry';
import { describe, expect, it } from 'vitest';
import {
  acceptsWire,
  blockingIssuesOf,
  formValueOf,
  paletteOf,
  paramsAfterEdit,
  pinnedValuesOf,
  portRowsOf,
  toolStateOf,
  typeGlyphOf,
} from './tool-nodes';

// W1 (plan section 4): the rules of tool-nodes.ts without the library.

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
      key: 'person',
      type: 'entity',
      list: false,
      required: false,
      title: 'Person',
    },
  ],
  output: { key: 'output', type: 'text', kind: 'draft' },
  params: ['length'],
};

const FORM: FormDescriptor = {
  fields: [
    {
      key: 'coreIdea',
      title: 'x',
      description: '',
      control: 'text',
      required: true,
      default: null,
      list: false,
      port: true,
    },
    {
      key: 'length',
      title: 'Length',
      description: '',
      control: 'number',
      required: false,
      default: 800,
      list: false,
      port: false,
    },
    {
      key: 'tone',
      title: 'Tone',
      description: '',
      control: 'text',
      required: false,
      default: null,
      list: false,
      port: false,
    },
  ],
};

function row(overrides: Partial<ToolSummary> & { name: string }): ToolSummary {
  return {
    description: 'A tool.',
    output: 'draft',
    enabled: true,
    origin: 'nonfiction',
    valid: true,
    lintCounts: { errors: 0, warnings: 0 },
    ...overrides,
  };
}

const VIEWS = {
  functionSchema: {},
  form: FORM,
  ports: PORTS,
} as unknown as ToolViews;

// A recipe: an input of text, an input of entity, a tool with the ports above, and an output.
function recipe(edges: GraphFile['edges'] = []): GraphFile {
  return {
    schemaVersion: 1,
    view: 'recipe',
    name: 'W1',
    nodes: [
      {
        id: 'notes',
        kind: 'input',
        position: { x: 0, y: 0 },
        params: { type: 'text', label: 'Notes' },
      },
      {
        id: 'people',
        kind: 'input',
        position: { x: 0, y: 0 },
        params: { type: 'entity', label: 'People', entityKind: 'person' },
      },
      {
        id: 'cold',
        kind: 'tool',
        tool: 'cold_open',
        position: { x: 0, y: 0 },
        params: { length: 500, person: 'ada' },
      },
      { id: 'draft', kind: 'output', position: { x: 0, y: 0 } },
    ],
    edges,
  } as GraphFile;
}

const READY = new Map([['cold', PORTS]]);

describe('tool-nodes', () => {
  it('W1 acceptsWire refuses a text output to an entity input, a second wire, a pinned key and a missing port', () => {
    const file = recipe();
    expect(
      acceptsWire(
        file,
        { sourceHandle: 'notes.out', targetHandle: 'cold.person' },
        READY,
      ),
    ).toBe(false);
    expect(
      acceptsWire(
        file,
        { sourceHandle: 'notes.out', targetHandle: 'cold.coreIdea' },
        READY,
      ),
    ).toBe(true);
    expect(
      acceptsWire(
        file,
        { sourceHandle: 'people.out', targetHandle: 'cold.missing' },
        READY,
      ),
    ).toBe(false);
    expect(
      acceptsWire(
        file,
        { sourceHandle: 'people.out', targetHandle: 'draft.in' },
        READY,
      ),
    ).toBe(false);
    expect(
      acceptsWire(
        file,
        { sourceHandle: 'cold.output', targetHandle: 'draft.in' },
        READY,
      ),
    ).toBe(true);

    const wired = recipe([
      { id: 'w1', from: 'notes.out', to: 'cold.coreIdea' },
    ]);
    expect(
      acceptsWire(
        wired,
        { sourceHandle: 'notes.out', targetHandle: 'cold.coreIdea' },
        READY,
      ),
    ).toBe(false);

    // `length` is pinned in params (a key present), so a wire into it is refused.
    const pinned = recipe();
    const pinnedReady = new Map<string, PortDescriptor>([
      [
        'cold',
        {
          ...PORTS,
          inputs: [
            {
              key: 'length',
              type: 'text',
              list: false,
              required: false,
              title: 'Length',
            },
          ],
        },
      ],
    ]);
    expect(
      acceptsWire(
        pinned,
        { sourceHandle: 'notes.out', targetHandle: 'cold.length' },
        pinnedReady,
      ),
    ).toBe(false);

    // An entity wire into an entity list input is accepted.
    expect(
      acceptsWire(
        file,
        { sourceHandle: 'people.out', targetHandle: 'cold.entityIds' },
        READY,
      ),
    ).toBe(true);
    // A tool that is not ready has no ports, so a wire into it is refused.
    expect(
      acceptsWire(
        file,
        { sourceHandle: 'notes.out', targetHandle: 'cold.coreIdea' },
        new Map(),
      ),
    ).toBe(false);
  });

  it('W1 toolStateOf gives each state by the row and the detail read', () => {
    const rows = [
      row({ name: 'ok' }),
      row({ name: 'off', enabled: false }),
      row({ name: 'bad', valid: false }),
    ];
    expect(toolStateOf(rows, 'off', undefined)).toBe('disabled');
    expect(toolStateOf(rows, 'bad', undefined)).toBe('invalid');
    expect(toolStateOf(rows, 'gone', undefined)).toBe('unknown');
    expect(toolStateOf(rows, 'ok', 'not-found')).toBe('unknown');
    expect(toolStateOf(rows, 'ok', 'failed')).toBe('unavailable');
    expect(toolStateOf(undefined, 'ok', VIEWS)).toBe('unavailable');
    expect(toolStateOf(rows, 'ok', VIEWS)).toBe('ready');
  });

  it('W1 paletteOf lists each name once, the user row when both exist, enabled and valid only', () => {
    const rows = [
      row({ name: 'a' }),
      row({
        name: 'a',
        origin: 'user',
        overrides: 'nonfiction',
        enabled: false,
      }),
      row({ name: 'b', valid: false }),
      row({ name: 'c' }),
    ];
    expect(paletteOf(rows).map((tool) => tool.name)).toEqual(['c']);
    expect(
      paletteOf([
        row({ name: 'a' }),
        row({ name: 'a', origin: 'user', overrides: 'nonfiction' }),
      ]),
    ).toHaveLength(1);
  });

  it('W1 formValueOf adds the default of an absent non-port field and keeps a present value', () => {
    expect(formValueOf(undefined, FORM)).toEqual({ length: 800 });
    expect(formValueOf({ length: 500 }, FORM)).toEqual({ length: 500 });
    expect(formValueOf({ coreIdea: 'x' }, FORM)).toEqual({
      coreIdea: 'x',
      length: 800,
    });
  });

  it('W1 paramsAfterEdit takes the edited settings, keeps port and unknown keys, and gives no params when empty', () => {
    expect(paramsAfterEdit(undefined, { length: 500 }, FORM)).toEqual({
      length: 500,
    });
    expect(paramsAfterEdit(undefined, {}, FORM)).toBeUndefined();
    expect(paramsAfterEdit({}, {}, FORM)).toEqual({});
    expect(
      paramsAfterEdit(
        { length: 500, tone: 'dry', person: 'ada', extra: 1 },
        { length: 600 },
        FORM,
      ),
    ).toEqual({ length: 600, person: 'ada', extra: 1 });
  });

  it('W1 pinnedValuesOf gives one chip per list item and the one value otherwise', () => {
    expect(pinnedValuesOf({ entityIds: ['a', 'b'] }, 'entityIds')).toEqual([
      'a',
      'b',
    ]);
    expect(pinnedValuesOf({ person: 'ada' }, 'person')).toEqual(['ada']);
    expect(pinnedValuesOf({}, 'person')).toEqual([]);
    expect(typeGlyphOf('entity')).toBe('E');
  });

  it('W1 portRowsOf gives the inputs then the output of a ready tool, and nothing without ports', () => {
    const cold = recipe().nodes[2]!;
    expect(portRowsOf(cold, PORTS).map((port) => port.key)).toEqual([
      'coreIdea',
      'entityIds',
      'person',
      'output',
    ]);
    expect(portRowsOf(cold, undefined)).toEqual([]);
  });

  it('W1 blockingIssuesOf keeps the error issues only', () => {
    const issues = [
      { code: 'dead-step', severity: 'warning', message: 'w' },
      { code: 'cycle', severity: 'error', message: 'e' },
    ] as const;
    expect(blockingIssuesOf(issues)).toEqual([issues[1]]);
  });
});
