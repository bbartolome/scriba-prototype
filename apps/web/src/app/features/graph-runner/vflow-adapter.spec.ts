import type { GraphFile } from '@bbartolome/scriba-contracts/graph-runner';
import { describe, expect, it } from 'vitest';
import { vflowNodeOf, vflowNodesOf } from './vflow-adapter';

// A recipe with a tool node and an output node, at known positions.
const FILE = {
  schemaVersion: 1,
  view: 'recipe',
  name: 'Adapter run',
  nodes: [
    {
      id: 'cold-open',
      kind: 'tool',
      position: { x: 40, y: 80 },
      tool: 'cold_open',
    },
    {
      id: 'draft',
      kind: 'output',
      position: { x: 300, y: 80 },
      params: { path: 'drafts/ch02-opening.md' },
    },
  ],
  edges: [{ id: 'w1', from: 'cold-open.output', to: 'draft.in' }],
} as unknown as GraphFile;

describe('vflow adapter (V1)', () => {
  it('builds an unlocked node with exactly the keys type, id, point and data, and no draggable', () => {
    const node = vflowNodeOf(FILE.nodes[0]);
    expect(Object.keys(node).sort()).toEqual(
      ['data', 'id', 'point', 'type'].sort(),
    );
    expect(node.type).toBe('html-template');
    expect(node.id).toBe('cold-open');
    expect(node.point()).toEqual({ x: 40, y: 80 });
    expect(node.data?.()).toBe(FILE.nodes[0]);
  });

  it('builds a locked node whose draggable is false, with the same other values', () => {
    const node = vflowNodeOf(FILE.nodes[0], true);
    expect(node.draggable?.()).toBe(false);
    expect(Object.keys(node).sort()).toEqual(
      ['data', 'draggable', 'id', 'point', 'type'].sort(),
    );
    expect(node.id).toBe('cold-open');
    expect(node.point()).toEqual({ x: 40, y: 80 });
    expect(node.data?.()).toBe(FILE.nodes[0]);
  });

  it('vflowNodesOf(file) has no node with a draggable key', () => {
    const nodes = vflowNodesOf(FILE);
    expect(nodes.map((node) => node.id)).toEqual(['cold-open', 'draft']);
    for (const node of nodes) {
      expect('draggable' in node).toBe(false);
    }
  });

  it('vflowNodesOf(file, true) locks every node, in file order', () => {
    const nodes = vflowNodesOf(FILE, true);
    expect(nodes.map((node) => node.id)).toEqual(['cold-open', 'draft']);
    for (const node of nodes) {
      expect(node.draggable?.()).toBe(false);
    }
  });
});
