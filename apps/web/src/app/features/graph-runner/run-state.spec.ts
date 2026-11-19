import type {
  GraphFile,
  RunState,
} from '@bbartolome/scriba-contracts/graph-runner';
import type { FormField } from '@bbartolome/scriba-contracts/tool-registry';
import { describe, expect, it } from 'vitest';
import {
  dialogFieldsOf,
  foldNodeStatus,
  foldRunEnded,
  runOfGraph,
  runRequestOf,
  scopeOfRecipe,
} from './run-state';

const POSITION = { x: 0, y: 0 };

/** One form field of a tool, with the fields the rules read. */
function portField(key: string, entityKinds?: string[]): FormField {
  return {
    key,
    title: key,
    description: '',
    control: 'entity-picker',
    required: false,
    default: undefined,
    list: true,
    port: true,
    ...(entityKinds === undefined ? {} : { entityKinds }),
  };
}

// chapter-notes (text), people (entity, entityKind person), look (style) feed cold-open; cold-open feeds draft
// (path set) and spare (no params).
const GRAPH = {
  schemaVersion: 1,
  view: 'recipe',
  name: 'Dialog run',
  nodes: [
    {
      id: 'chapter-notes',
      kind: 'input',
      position: POSITION,
      params: { type: 'text', label: 'Chapter notes' },
    },
    {
      id: 'people',
      kind: 'input',
      position: POSITION,
      params: { type: 'entity', label: 'People', entityKind: 'person' },
    },
    {
      id: 'look',
      kind: 'input',
      position: POSITION,
      params: { type: 'style', label: 'Look' },
    },
    {
      id: 'cold-open',
      kind: 'tool',
      position: POSITION,
      tool: 'cold_open',
    },
    {
      id: 'draft',
      kind: 'output',
      position: POSITION,
      params: { path: 'drafts/ch02-opening.md' },
    },
    { id: 'spare', kind: 'output', position: POSITION },
  ],
  edges: [
    { id: 'w1', from: 'chapter-notes.out', to: 'cold-open.coreIdea' },
    { id: 'w2', from: 'people.out', to: 'cold-open.person' },
    { id: 'w3', from: 'look.out', to: 'cold-open.styleProfile' },
    { id: 'w4', from: 'cold-open.output', to: 'draft.in' },
    { id: 'w5', from: 'cold-open.output', to: 'spare.in' },
  ],
} as unknown as GraphFile;

const FORMS = new Map<string, FormField[]>([
  [
    'cold_open',
    [
      portField('coreIdea'),
      portField('person', ['person']),
      portField('styleProfile'),
    ],
  ],
]);

const RUN: RunState = {
  runId: 'run-1',
  graphId: 'dialog-run',
  status: 'running',
  startedAt: '2026-11-14T09:00:00Z',
  inputs: {},
  targets: {},
  nodes: {
    'chapter-notes': { status: 'done' },
    'cold-open': { status: 'running' },
  },
  pendingChangeIds: [],
};

describe('run-state', () => {
  it('W3 scopeOfRecipe gives every node with no target, and the target with its upstream otherwise', () => {
    expect([...scopeOfRecipe(GRAPH)].sort()).toEqual([
      'chapter-notes',
      'cold-open',
      'draft',
      'look',
      'people',
      'spare',
    ]);
    expect([...scopeOfRecipe(GRAPH, 'cold-open')].sort()).toEqual([
      'chapter-notes',
      'cold-open',
      'look',
      'people',
    ]);
    expect([...scopeOfRecipe(GRAPH, 'draft')].sort()).toEqual([
      'chapter-notes',
      'cold-open',
      'draft',
      'look',
      'people',
    ]);
  });

  it('W3 dialogFieldsOf lists the inputs and outputs of the scope in file order, with kinds and paths', () => {
    const whole = dialogFieldsOf(GRAPH, scopeOfRecipe(GRAPH), FORMS);
    expect(whole).toEqual([
      {
        nodeId: 'chapter-notes',
        kind: 'input',
        type: 'text',
        label: 'Chapter notes',
        entityKinds: [],
      },
      {
        nodeId: 'people',
        kind: 'input',
        type: 'entity',
        label: 'People',
        entityKinds: ['person'],
      },
      {
        nodeId: 'look',
        kind: 'input',
        type: 'style',
        label: 'Look',
        entityKinds: [],
      },
      { nodeId: 'draft', kind: 'output', path: 'drafts/ch02-opening.md' },
      { nodeId: 'spare', kind: 'output', path: '' },
    ]);
    const toHere = dialogFieldsOf(
      GRAPH,
      scopeOfRecipe(GRAPH, 'cold-open'),
      FORMS,
    );
    expect(toHere.map((field) => field.nodeId)).toEqual([
      'chapter-notes',
      'people',
      'look',
    ]);
  });

  it('W3 dialogFieldsOf takes the kinds of every port an input feeds, once each, else the entityKind', () => {
    const graph = {
      ...GRAPH,
      nodes: [
        ...GRAPH.nodes,
        {
          id: 'extra',
          kind: 'tool',
          position: POSITION,
          tool: 'other',
        },
      ],
      edges: [
        ...GRAPH.edges,
        { id: 'w6', from: 'people.out', to: 'extra.person' },
      ],
    } as unknown as GraphFile;
    const forms = new Map<string, FormField[]>([
      ...FORMS,
      ['other', [portField('person', ['claim', 'person'])]],
    ]);
    const people = dialogFieldsOf(graph, scopeOfRecipe(graph), forms).find(
      (field) => field.nodeId === 'people',
    );
    expect(people).toMatchObject({ entityKinds: ['person', 'claim'] });
    const none = dialogFieldsOf(GRAPH, scopeOfRecipe(GRAPH), new Map()).find(
      (field) => field.nodeId === 'people',
    );
    expect(none).toMatchObject({ entityKinds: ['person'] });
  });

  it('W3 runRequestOf omits targets for empty paths and includes target only for Run to here', () => {
    const values = {
      inputs: {
        'chapter-notes': { kind: 'text', text: 'Notes' },
        look: { kind: 'style', ref: 'house-style' },
      },
      targets: { draft: 'drafts/ch02-opening.md', spare: '' },
    } as const;
    const whole = runRequestOf('dialog-run', values);
    expect(whole).toEqual({
      graphId: 'dialog-run',
      inputs: values.inputs,
      targets: { draft: 'drafts/ch02-opening.md' },
    });
    expect(whole).not.toHaveProperty('target');

    const toHere = runRequestOf(
      'dialog-run',
      { inputs: values.inputs, targets: { spare: '' } },
      'cold-open',
    );
    expect(toHere).toEqual({
      graphId: 'dialog-run',
      inputs: values.inputs,
      target: { nodeId: 'cold-open' },
    });
    expect(toHere).not.toHaveProperty('targets');
  });

  it('W3 foldNodeStatus changes only the node of the matching run, and foldRunEnded sets status and reason', () => {
    const folded = foldNodeStatus(RUN, {
      runId: 'run-1',
      nodeId: 'cold-open',
      status: 'done',
      result: {
        output: { kind: 'draft', content: 'Opening text' },
        sourcesUsed: ['anna'],
      },
    });
    expect(folded.nodes['cold-open']).toEqual({
      status: 'done',
      result: {
        output: { kind: 'draft', content: 'Opening text' },
        sourcesUsed: ['anna'],
      },
    });
    expect(folded.nodes['chapter-notes']).toEqual({ status: 'done' });
    expect(
      foldNodeStatus(RUN, {
        runId: 'run-2',
        nodeId: 'cold-open',
        status: 'done',
      }),
    ).toBe(RUN);

    const failed = foldNodeStatus(RUN, {
      runId: 'run-1',
      nodeId: 'draft',
      status: 'error',
      error: {
        code: 'PLATFORM_INTERNAL',
        message: 'The model did not answer.',
      },
    });
    expect(failed.nodes['draft']).toEqual({
      status: 'error',
      error: {
        code: 'PLATFORM_INTERNAL',
        message: 'The model did not answer.',
      },
    });

    const ended = foldRunEnded(RUN, {
      runId: 'run-1',
      status: 'stopped',
      reason: 'author',
    });
    expect(ended).toMatchObject({ status: 'stopped', reason: 'author' });
    expect(foldRunEnded(RUN, { runId: 'run-2', status: 'done' })).toBe(RUN);
  });

  it('W3 runOfGraph returns the run of its own graph only', () => {
    expect(runOfGraph(RUN, 'dialog-run')).toBe(RUN);
    expect(runOfGraph(RUN, 'other-graph')).toBeUndefined();
    expect(runOfGraph(null, 'dialog-run')).toBeUndefined();
  });
});
