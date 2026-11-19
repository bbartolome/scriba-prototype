import type { GraphFile } from '@bbartolome/scriba-contracts/graph-runner';
import type { ToolViews } from '@bbartolome/scriba-contracts/tool-registry';
import { describe, expect, it } from 'vitest';
import {
  chipDropRefusalOf,
  type EntityItem,
  groupEntitiesOf,
  pinnedParamsAfterDrop,
  pinnedParamsAfterRemoval,
} from './entity-chips';

const ENTITIES: EntityItem[] = [
  {
    id: 'claim-1',
    type: 'claim',
    path: 'entities/claim-1.md',
    title: 'A claim',
  },
  { id: 'anna', type: 'person', path: 'entities/anna.md', title: 'Anna Lee' },
  { id: 'bo', type: 'person', path: 'entities/bo.md' },
  { id: 'house-style', type: 'style-profile', path: 'entities/house-style.md' },
];

/** A recipe with one tool node, `cold-open`, whose inputs are the four keys the tests drop on. */
const FILE = {
  schemaVersion: 1,
  view: 'recipe',
  name: 'Chips',
  nodes: [
    {
      id: 'chapter-notes',
      kind: 'input',
      position: { x: 0, y: 0 },
      params: { type: 'text', label: 'Chapter notes' },
    },
    {
      id: 'people',
      kind: 'input',
      position: { x: 0, y: 200 },
      params: { type: 'entity', label: 'People', entityKind: 'person' },
    },
    {
      id: 'cold-open',
      kind: 'tool',
      tool: 'cold_open',
      position: { x: 300, y: 0 },
    },
  ],
  edges: [{ id: 'w1', from: 'people.out', to: 'cold-open.entityIds' }],
} as unknown as GraphFile;

function fieldOf(key: string, port: boolean, entityKinds?: string[]) {
  return {
    key,
    title: key,
    description: '',
    control: 'text',
    required: false,
    default: null,
    list: false,
    port,
    ...(entityKinds === undefined ? {} : { entityKinds }),
  };
}

const VIEWS = {
  functionSchema: {
    type: 'function',
    function: { name: 'cold_open', description: 'd', parameters: {} },
  },
  form: {
    fields: [
      fieldOf('coreIdea', true),
      fieldOf('entityIds', true),
      fieldOf('styleProfile', true),
      fieldOf('person', true, ['person']),
      fieldOf('length', false),
    ],
  },
  ports: {
    inputs: [
      {
        key: 'coreIdea',
        type: 'text',
        list: false,
        required: true,
        title: 'coreIdea',
      },
      {
        key: 'entityIds',
        type: 'entity',
        list: true,
        required: false,
        title: 'entityIds',
      },
      {
        key: 'styleProfile',
        type: 'style',
        list: false,
        required: false,
        title: 'styleProfile',
      },
      {
        key: 'person',
        type: 'entity',
        list: false,
        required: true,
        title: 'person',
      },
    ],
    output: { key: 'output', type: 'text', kind: 'draft' },
    params: ['length'],
  },
} as unknown as ToolViews;

const VIEWS_BY_NODE = new Map([['cold-open', VIEWS]]);

const ANNA = { id: 'anna', type: 'person' };
const CLAIM = { id: 'claim-1', type: 'claim' };
const STYLE = { id: 'house-style', type: 'style-profile' };

describe('W2 entity chip rules', () => {
  it('groupEntitiesOf filters by id or title, case-insensitively, and groups by type, sorted', () => {
    const all = groupEntitiesOf(ENTITIES, '');
    expect(all.map((group) => group.type)).toEqual([
      'claim',
      'person',
      'style-profile',
    ]);
    expect(all[1]?.entities.map((entity) => entity.id)).toEqual(['anna', 'bo']);

    expect(
      groupEntitiesOf(ENTITIES, 'LEE').flatMap((group) =>
        group.entities.map((entity) => entity.id),
      ),
    ).toEqual(['anna']);
    expect(
      groupEntitiesOf(ENTITIES, 'claim').flatMap((group) =>
        group.entities.map((entity) => entity.id),
      ),
    ).toEqual(['claim-1']);
    expect(groupEntitiesOf(ENTITIES, 'nothing-matches')).toEqual([]);
  });

  it('chipDropRefusalOf gives each of the five reasons in its order, and undefined for an accepted drop', () => {
    // (1) a text port
    expect(
      chipDropRefusalOf(FILE, 'cold-open.coreIdea', ANNA, VIEWS_BY_NODE),
    ).toBe('Text ports take no entities.');
    // (2) a style port with a chip that is not a style profile
    expect(
      chipDropRefusalOf(FILE, 'cold-open.styleProfile', ANNA, VIEWS_BY_NODE),
    ).toBe('Style ports take style profiles.');
    // (3) a wired port, checked before the kinds
    expect(
      chipDropRefusalOf(FILE, 'cold-open.entityIds', ANNA, VIEWS_BY_NODE),
    ).toBe('This port is already wired.');
    // (4) a field whose entity kinds do not list the chip's type
    expect(
      chipDropRefusalOf(FILE, 'cold-open.person', CLAIM, VIEWS_BY_NODE),
    ).toBe('This port takes person entities.');
    // (5) a port the views do not give
    expect(
      chipDropRefusalOf(FILE, 'cold-open.moment', ANNA, VIEWS_BY_NODE),
    ).toBe('This port takes no entities.');
    expect(chipDropRefusalOf(FILE, 'people.out', ANNA, VIEWS_BY_NODE)).toBe(
      'This port takes no entities.',
    );
    // The missing port comes last: a wire into a port the views do not give is still reported as a wire.
    const wiredMissing = {
      ...FILE,
      edges: [{ id: 'w2', from: 'people.out', to: 'cold-open.moment' }],
    } as unknown as GraphFile;
    expect(
      chipDropRefusalOf(wiredMissing, 'cold-open.moment', ANNA, VIEWS_BY_NODE),
    ).toBe('This port is already wired.');
    // A text port that is missing from the views gives no text reason: the missing port is the reason.
    expect(
      chipDropRefusalOf(FILE, 'cold-open.coreIdea', CLAIM, new Map()),
    ).toBe('This port takes no entities.');

    // Accepted: a matching chip on a port with no wire, and a style profile on a style port.
    expect(
      chipDropRefusalOf(FILE, 'cold-open.person', ANNA, VIEWS_BY_NODE),
    ).toBeUndefined();
    expect(
      chipDropRefusalOf(FILE, 'cold-open.styleProfile', STYLE, VIEWS_BY_NODE),
    ).toBeUndefined();
    // An entity port with no entity kinds takes any chip once it has no wire.
    const unwired = {
      ...FILE,
      edges: [],
    } as unknown as GraphFile;
    expect(
      chipDropRefusalOf(unwired, 'cold-open.entityIds', CLAIM, VIEWS_BY_NODE),
    ).toBeUndefined();
  });

  it('chipDropRefusalOf treats an empty entityKinds as no filter', () => {
    const open = {
      ...VIEWS,
      form: {
        fields: [fieldOf('person', true, [])],
      },
    } as unknown as ToolViews;
    expect(
      chipDropRefusalOf(
        FILE,
        'cold-open.person',
        CLAIM,
        new Map([['cold-open', open]]),
      ),
    ).toBeUndefined();
  });

  it('pinnedParamsAfterDrop replaces a scalar value and appends to a list, without a duplicate', () => {
    const scalar = { key: 'person', list: false };
    expect(
      pinnedParamsAfterDrop({ person: 'bo', length: 500 }, scalar, ANNA),
    ).toEqual({ person: 'anna', length: 500 });
    expect(pinnedParamsAfterDrop(undefined, scalar, ANNA)).toEqual({
      person: 'anna',
    });

    const list = { key: 'entityIds', list: true };
    expect(pinnedParamsAfterDrop({ entityIds: ['bo'] }, list, ANNA)).toEqual({
      entityIds: ['bo', 'anna'],
    });
    expect(pinnedParamsAfterDrop({ entityIds: ['anna'] }, list, ANNA)).toEqual({
      entityIds: ['anna'],
    });
  });

  it('pinnedParamsAfterRemoval removes a scalar key, one list item, an empty list key, and gives undefined when nothing is left', () => {
    expect(
      pinnedParamsAfterRemoval(
        { person: 'anna', length: 500 },
        'person',
        false,
        0,
      ),
    ).toEqual({ length: 500 });
    expect(
      pinnedParamsAfterRemoval(
        { entityIds: ['anna', 'claim-1'], length: 500 },
        'entityIds',
        true,
        0,
      ),
    ).toEqual({ entityIds: ['claim-1'], length: 500 });
    expect(
      pinnedParamsAfterRemoval(
        { entityIds: ['anna'], length: 500 },
        'entityIds',
        true,
        0,
      ),
    ).toEqual({ length: 500 });
    expect(
      pinnedParamsAfterRemoval({ person: 'anna' }, 'person', false, 0),
    ).toBeUndefined();
    expect(
      pinnedParamsAfterRemoval({ entityIds: ['anna'] }, 'entityIds', true, 0),
    ).toBeUndefined();
  });
});
