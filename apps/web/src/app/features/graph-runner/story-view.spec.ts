import { RELATION_VOCABULARY } from '@bbartolome/scriba-contracts/graph-runner';
import { describe, expect, it } from 'vitest';
import {
  fileChoicesOf,
  folderOfKind,
  pathChoicesOf,
  RELATION_OPTIONS,
  withPath,
  withRelation,
} from './story-view';

const FILES = [
  { path: 'drafts', kind: 'dir', size: 0, mtime: '2026-11-14T09:00:00Z' },
  { path: 'drafts/b.md', kind: 'file', size: 1, mtime: '2026-11-14T09:00:00Z' },
  { path: 'drafts/a.md', kind: 'file', size: 1, mtime: '2026-11-14T09:00:00Z' },
  {
    path: 'drafts/.versions/old.md',
    kind: 'file',
    size: 1,
    mtime: '2026-11-14T09:00:00Z',
  },
  {
    path: 'drafts/sub/c.md',
    kind: 'file',
    size: 1,
    mtime: '2026-11-14T09:00:00Z',
  },
  {
    path: 'entities/mara.yaml',
    kind: 'file',
    size: 1,
    mtime: '2026-11-14T09:00:00Z',
  },
] as const;

const STORY = {
  schemaVersion: 1,
  view: 'story',
  name: 'Story',
  nodes: [
    {
      id: 'scene-1',
      kind: 'scene',
      label: 'Arrival',
      path: 'drafts/a.md',
      position: { x: 0, y: 0 },
    },
    { id: 'beat-1', kind: 'beat', label: 'Storm', position: { x: 10, y: 10 } },
  ],
  edges: [
    { id: 'e1', from: 'beat-1', to: 'scene-1' },
    { id: 'e2', from: 'scene-1', to: 'beat-1', relation: 'order' },
  ],
} as const;

describe('story-view', () => {
  it('W-S1 folderOfKind gives drafts for scene and beat and entities for entity', () => {
    expect(folderOfKind('scene')).toBe('drafts');
    expect(folderOfKind('beat')).toBe('drafts');
    expect(folderOfKind('entity')).toBe('entities');
  });

  it('W-S1 fileChoicesOf keeps the files under the folder, sorted, without dot segments', () => {
    expect(fileChoicesOf(FILES, 'drafts')).toEqual([
      'drafts/a.md',
      'drafts/b.md',
      'drafts/sub/c.md',
    ]);
    expect(fileChoicesOf(FILES, 'entities')).toEqual(['entities/mara.yaml']);
  });

  it('W-S1 pathChoicesOf adds a current path that is not listed and keeps the list otherwise', () => {
    const choices = ['drafts/a.md', 'drafts/b.md'];
    expect(pathChoicesOf(choices, 'drafts/gone.md')).toEqual([
      'drafts/a.md',
      'drafts/b.md',
      'drafts/gone.md',
    ]);
    expect(pathChoicesOf(choices, 'drafts/a.md')).toEqual(choices);
    expect(pathChoicesOf(choices, undefined)).toEqual(choices);
  });

  it('W-S1 withPath sets, removes and returns the same object when nothing changes', () => {
    const set = withPath(STORY as never, 'beat-1', 'drafts/b.md');
    const beat = set.nodes.find((node) => node.id === 'beat-1');
    expect(beat).toEqual({
      id: 'beat-1',
      kind: 'beat',
      label: 'Storm',
      path: 'drafts/b.md',
      position: { x: 10, y: 10 },
    });
    expect(set.edges).toBe(STORY.edges);
    expect(set.nodes[0]).toBe(STORY.nodes[0]);

    const removed = withPath(set, 'beat-1', '');
    const cleared = removed.nodes.find((node) => node.id === 'beat-1');
    expect(cleared && 'path' in cleared).toBe(false);
    expect(Object.keys(cleared ?? {})).toEqual([
      'id',
      'kind',
      'label',
      'position',
    ]);

    expect(withPath(STORY as never, 'scene-1', 'drafts/a.md')).toBe(STORY);
    expect(withPath(STORY as never, 'beat-1', '')).toBe(STORY);
  });

  it('W-S1 withRelation sets, removes, keeps free text and returns the same object when nothing changes', () => {
    const free = withRelation(STORY as never, 'e1', 'mentions');
    expect(free.edges[0]).toEqual({
      id: 'e1',
      from: 'beat-1',
      to: 'scene-1',
      relation: 'mentions',
    });
    expect(free.nodes).toBe(STORY.nodes);

    const removed = withRelation(free, 'e1', '');
    expect(Object.keys(removed.edges[0] ?? {})).toEqual(['id', 'from', 'to']);

    expect(withRelation(STORY as never, 'e2', 'order')).toBe(STORY);
    expect(withRelation(STORY as never, 'e1', '')).toBe(STORY);
  });

  it('W-S1 RELATION_OPTIONS names and meanings equal the contract RELATION_VOCABULARY', () => {
    expect(RELATION_OPTIONS).toEqual(
      Object.entries(RELATION_VOCABULARY).map(([value, meaning]) => ({
        value,
        meaning,
      })),
    );
  });
});
