import { describe, expect, it } from 'vitest';
import {
  arrangeOf,
  ARRANGE_COLUMN,
  ARRANGE_MARGIN,
  ARRANGE_ROW,
} from './layout';

const AT = { x: 40, y: 40 };

/** The position of each node by id, after the layout. */
function positionsOf(file: {
  nodes: readonly { id: string; position: { x: number; y: number } }[];
}) {
  return new Map(file.nodes.map((node) => [node.id, node.position]));
}

/** A node with its key order as the file has it, with the position last. */
function story(id: string, kind = 'scene') {
  return { id, kind, label: id.toUpperCase(), position: { ...AT } };
}

describe('layout', () => {
  it('W-L1 story: the order chain gives columns left to right, in the chain order', () => {
    const file = {
      schemaVersion: 1,
      view: 'story',
      name: 'Chain',
      nodes: [story('c', 'beat'), story('a'), story('b')],
      edges: [
        { id: 'e1', from: 'a', to: 'b', relation: 'order' },
        { id: 'e2', from: 'b', to: 'c', relation: 'order' },
      ],
    };
    const at = positionsOf(arrangeOf(file as never));
    expect(at.get('a')?.x).toBeLessThan(at.get('b')?.x ?? 0);
    expect(at.get('b')?.x).toBeLessThan(at.get('c')?.x ?? 0);
    expect(at.get('a')?.y).toBe(at.get('c')?.y);
  });

  it('W-L1 story: nodes with no order edge get one column each, in file order', () => {
    const file = {
      schemaVersion: 1,
      view: 'story',
      name: 'Free',
      nodes: [story('c'), story('a'), story('b')],
      edges: [],
    };
    const at = positionsOf(arrangeOf(file as never));
    expect(at.get('c')).toEqual({ x: ARRANGE_MARGIN, y: ARRANGE_MARGIN });
    expect(at.get('a')).toEqual({
      x: ARRANGE_MARGIN + ARRANGE_COLUMN,
      y: ARRANGE_MARGIN,
    });
    expect(at.get('b')).toEqual({
      x: ARRANGE_MARGIN + 2 * ARRANGE_COLUMN,
      y: ARRANGE_MARGIN,
    });
  });

  it('W-L1 story: a containment edge does not change the sequence', () => {
    const file = {
      schemaVersion: 1,
      view: 'story',
      name: 'Containment',
      nodes: [story('c'), story('a'), story('b')],
      edges: [{ id: 'e1', from: 'a', to: 'b', relation: 'containment' }],
    };
    const at = positionsOf(arrangeOf(file as never));
    expect(at.get('c')?.x).toBe(ARRANGE_MARGIN);
    expect(at.get('a')?.x).toBe(ARRANGE_MARGIN + ARRANGE_COLUMN);
    expect(at.get('b')?.x).toBe(ARRANGE_MARGIN + 2 * ARRANGE_COLUMN);
  });

  it('W-L1 story: an order cycle with an unlinked node gives the unlinked node first, then the cycle in file order', () => {
    const file = {
      schemaVersion: 1,
      view: 'story',
      name: 'Cycle',
      nodes: [story('a'), story('b'), story('d', 'entity')],
      edges: [
        { id: 'e1', from: 'a', to: 'b', relation: 'order' },
        { id: 'e2', from: 'b', to: 'a', relation: 'order' },
      ],
    };
    const at = positionsOf(arrangeOf(file as never));
    expect(at.get('d')?.x).toBe(ARRANGE_MARGIN);
    expect(at.get('a')?.x).toBe(ARRANGE_MARGIN + ARRANGE_COLUMN);
    expect(at.get('b')?.x).toBe(ARRANGE_MARGIN + 2 * ARRANGE_COLUMN);
  });

  it('W-L1 recipe: two tools fed by one input share column 1 and stack in file order', () => {
    const file = {
      schemaVersion: 1,
      view: 'recipe',
      name: 'Fan',
      nodes: [
        {
          id: 'in',
          kind: 'input',
          position: { x: 0, y: 0 },
          params: { type: 'text', label: 'In' },
        },
        { id: 't1', kind: 'tool', tool: 'cold_open', position: { x: 0, y: 0 } },
        { id: 't2', kind: 'tool', tool: 'cold_open', position: { x: 0, y: 0 } },
        { id: 'out', kind: 'output', position: { x: 0, y: 0 } },
      ],
      edges: [
        { id: 'w1', from: 'in.out', to: 't1.coreIdea' },
        { id: 'w2', from: 'in.out', to: 't2.coreIdea' },
        { id: 'w3', from: 't1.output', to: 'out.in' },
        { id: 'w4', from: 't2.output', to: 'out.in' },
      ],
    };
    const at = positionsOf(arrangeOf(file as never));
    expect(at.get('in')).toEqual({ x: ARRANGE_MARGIN, y: ARRANGE_MARGIN });
    expect(at.get('t1')).toEqual({
      x: ARRANGE_MARGIN + ARRANGE_COLUMN,
      y: ARRANGE_MARGIN,
    });
    expect(at.get('t2')).toEqual({
      x: ARRANGE_MARGIN + ARRANGE_COLUMN,
      y: ARRANGE_MARGIN + ARRANGE_ROW,
    });
    expect(at.get('out')?.x).toBe(ARRANGE_MARGIN + 2 * ARRANGE_COLUMN);
  });

  it('W-L1 recipe: a wire cycle gives finite positions for every node', () => {
    const file = {
      schemaVersion: 1,
      view: 'recipe',
      name: 'Loop',
      nodes: [
        { id: 'a', kind: 'tool', tool: 'cold_open', position: { x: 0, y: 0 } },
        { id: 'b', kind: 'tool', tool: 'cold_open', position: { x: 0, y: 0 } },
      ],
      edges: [
        { id: 'w1', from: 'a.output', to: 'b.coreIdea' },
        { id: 'w2', from: 'b.output', to: 'a.coreIdea' },
      ],
    };
    const result = arrangeOf(file as never);
    for (const node of result.nodes) {
      expect(Number.isFinite(node.position.x)).toBe(true);
      expect(Number.isFinite(node.position.y)).toBe(true);
    }
  });

  it('W-L1 edges with an unknown endpoint are ignored without error', () => {
    const file = {
      schemaVersion: 1,
      view: 'story',
      name: 'Dangling',
      nodes: [story('a'), story('b')],
      edges: [{ id: 'e1', from: 'a', to: 'ghost', relation: 'order' }],
    };
    const at = positionsOf(arrangeOf(file as never));
    expect(at.get('a')?.x).toBe(ARRANGE_MARGIN);
    expect(at.get('b')?.x).toBe(ARRANGE_MARGIN + ARRANGE_COLUMN);
  });

  it('W-L1 only position changes, and each node keeps its key order', () => {
    const file = {
      schemaVersion: 1,
      view: 'story',
      name: 'Keys',
      nodes: [story('c', 'beat'), story('a'), story('b')],
      edges: [
        { id: 'e1', from: 'a', to: 'b', relation: 'order' },
        { id: 'e2', from: 'b', to: 'c', relation: 'order' },
      ],
    };
    const result = arrangeOf(file as never);
    const strip = (value: unknown) =>
      JSON.parse(
        JSON.stringify(value, (key, inner) =>
          key === 'position' ? undefined : inner,
        ),
      );
    expect(strip(result)).toEqual(strip(file));
    for (const [index, node] of result.nodes.entries()) {
      expect(Object.keys(node)).toEqual(Object.keys(file.nodes[index] ?? {}));
    }
    expect(result.edges).toBe(file.edges);
  });
});
