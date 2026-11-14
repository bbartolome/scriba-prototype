import { describe, expect, it } from 'vitest';
import {
  ACTIVE_PROJECT_ROUTE,
  CITATION_PATTERN,
  citationSchema,
  ENTITY_ID_PATTERN,
  entityBaseSchema,
  draftVersionSchema,
  fileEntrySchema,
  fileReadSchema,
  fileWriteResultSchema,
  PROJECT_ENTITIES_ROUTE,
  PROJECT_ENTITY_RESOLVE_ROUTE,
  PROJECT_ERROR_CODE_VALUES,
  PROJECT_ERROR_STATUS,
  PROJECT_FILE_DELETE_ROUTE,
  PROJECT_FILE_EDIT_ROUTE,
  PROJECT_FILE_MOVE_ROUTE,
  PROJECT_FILE_ROUTE,
  PROJECT_FILE_WRITE_ROUTE,
  PROJECT_FILES_ROUTE,
  PROJECT_IMPORT_ROUTE,
  PROJECT_NEW_ROUTE,
  PROJECT_PENDING_ACCEPT_ANYWAY_ROUTE,
  PROJECT_PENDING_ACCEPT_ROUTE,
  PROJECT_PENDING_REFRESH_ROUTE,
  PROJECT_PENDING_REJECT_ROUTE,
  PROJECT_PENDING_ROUTE,
  PROJECT_REBUILD_ROUTE,
  PROJECT_SEARCH_ROUTE,
  PROJECT_START_FROM_SAMPLE_ROUTE,
  PROJECT_VERSION_RESTORE_ROUTE,
  PROJECT_VERSION_ROUTE,
  PROJECT_VERSIONS_ROUTE,
  PROJECTS_ROUTE,
  PROJECTS_SECTION_SCHEMA_VERSION,
  pendingChangeSchema,
  projectStoreEventSchema,
  projectsSectionSchema,
  projectYamlSchema,
  SAMPLES_ROUTE,
  searchRequestSchema,
  searchResultSchema,
} from '../src/project-store/index.js';
import { errorCodeSchema } from '../src/platform/index.js';

const HASH = `sha256:${'a'.repeat(64)}`;
const TS = '2026-11-14T09:00:00Z';
const LATER = '2026-11-14T09:05:00Z';

// A full pending change: the agent-run origin, a diff, a grounding block and a conflict.
function pendingChange(): Record<string, unknown> {
  return {
    id: 'pc-1',
    projectId: 'my-book',
    targetPath: 'drafts/ch01.md',
    kind: 'modify',
    diff: '--- a/drafts/ch01.md\n+++ b/drafts/ch01.md\n@@ -1 +1 @@\n-old\n+new\n',
    capturedBase: { hash: HASH, content: 'old\n' },
    proposed: 'new\n',
    origin: { kind: 'agent-run', runId: 'run-1', toolCallId: 'call-1' },
    provenance: {
      graphId: 'g1',
      nodeId: 'n1',
      entityIds: ['ann'],
      sourcesUsed: ['sources/a.md'],
    },
    grounding: { supported: 2, weak: 1, unsupported: 0, checkedAt: LATER },
    status: 'pending',
    conflict: { reason: 'base-changed', detectedAt: LATER },
    createdAt: TS,
    updatedAt: LATER,
  };
}

// The recipe-run variant: a create with no captured base and no conflict.
function recipePendingChange(): Record<string, unknown> {
  return {
    ...pendingChange(),
    id: 'pc-2',
    kind: 'create',
    capturedBase: null,
    conflict: null,
    origin: { kind: 'recipe-run', runId: 'run-2', graphId: 'g1', nodeId: 'n2' },
  };
}

const ROUTES = [
  PROJECTS_ROUTE,
  PROJECT_NEW_ROUTE,
  PROJECT_IMPORT_ROUTE,
  PROJECT_START_FROM_SAMPLE_ROUTE,
  SAMPLES_ROUTE,
  ACTIVE_PROJECT_ROUTE,
  PROJECT_FILES_ROUTE,
  PROJECT_FILE_ROUTE,
  PROJECT_FILE_WRITE_ROUTE,
  PROJECT_FILE_EDIT_ROUTE,
  PROJECT_FILE_DELETE_ROUTE,
  PROJECT_FILE_MOVE_ROUTE,
  PROJECT_ENTITIES_ROUTE,
  PROJECT_ENTITY_RESOLVE_ROUTE,
  PROJECT_SEARCH_ROUTE,
  PROJECT_REBUILD_ROUTE,
  PROJECT_PENDING_ROUTE,
  PROJECT_PENDING_ACCEPT_ROUTE,
  PROJECT_PENDING_REJECT_ROUTE,
  PROJECT_PENDING_REFRESH_ROUTE,
  PROJECT_PENDING_ACCEPT_ANYWAY_ROUTE,
  PROJECT_VERSIONS_ROUTE,
  PROJECT_VERSION_ROUTE,
  PROJECT_VERSION_RESTORE_ROUTE,
];

const EVENT_CASES = [
  {
    type: 'pending-created',
    data: { projectId: 'my-book', pendingChange: pendingChange() },
  },
  {
    type: 'pending-updated',
    data: { projectId: 'my-book', pendingChange: pendingChange() },
  },
  {
    type: 'pending-resolved',
    data: { projectId: 'my-book', pendingChange: pendingChange() },
  },
  {
    type: 'files-changed',
    data: { projectId: 'my-book', paths: ['drafts/ch01.md'] },
  },
  { type: 'project-switched', data: { from: null, to: 'my-book' } },
];

describe('project-store contract slice', () => {
  it('C2: project.yaml accepts a valid file with and without order, refuses a missing schemaVersion and a schemaVersion below 1, and keeps unknown keys', () => {
    const base = { title: 'My book', genrePack: 'nonfiction' };

    expect(
      projectYamlSchema.safeParse({ schemaVersion: 1, ...base }).success,
    ).toBe(true);
    expect(
      projectYamlSchema.safeParse({
        schemaVersion: 1,
        ...base,
        order: [{ path: 'drafts/ch01.md', status: 'draft' }],
      }).success,
    ).toBe(true);

    expect(projectYamlSchema.safeParse(base).success).toBe(false);
    expect(
      projectYamlSchema.safeParse({ schemaVersion: 0, ...base }).success,
    ).toBe(false);

    const kept = projectYamlSchema.parse({
      schemaVersion: 1,
      ...base,
      futureField: { x: 1 },
      order: [{ path: 'drafts/ch01.md', futureOrderKey: true }],
    });
    expect(kept.futureField).toEqual({ x: 1 });
    expect(kept.order?.[0]).toEqual({
      path: 'drafts/ch01.md',
      futureOrderKey: true,
    });
  });

  it('C3: pending-change, search and entity-reference schemas round-trip, the ID pattern accepts and refuses the listed cases, and CITATION_PATTERN finds or misses the listed cases', () => {
    for (const input of [pendingChange(), recipePendingChange()]) {
      const first = pendingChangeSchema.parse(input);
      const second = pendingChangeSchema.parse(
        JSON.parse(JSON.stringify(first)),
      );
      expect(second).toEqual(first);
    }

    const request = searchRequestSchema.parse({
      query: 'dragon',
      limit: 5,
      scope: ['sources'],
    });
    expect(
      searchRequestSchema.parse(JSON.parse(JSON.stringify(request))),
    ).toEqual(request);

    const passages = searchResultSchema.parse([
      { path: 'sources/a.md', offset: 10, snippet: 'a dragon', score: 0.9 },
    ]);
    expect(
      searchResultSchema.parse(JSON.parse(JSON.stringify(passages))),
    ).toEqual(passages);

    const entity = entityBaseSchema.parse({
      id: 'ann',
      type: 'character',
      links: ['bob'],
    });
    expect(entityBaseSchema.parse(JSON.parse(JSON.stringify(entity)))).toEqual(
      entity,
    );

    for (const id of ['a', 'ch01', 'a-b-2']) {
      expect(ENTITY_ID_PATTERN.test(id), id).toBe(true);
    }
    for (const id of ['', '-a', 'A', 'a_b', 'a b', 'a/b', 'a.b']) {
      expect(ENTITY_ID_PATTERN.test(id), id).toBe(false);
    }

    expect('see [@ch01].'.match(CITATION_PATTERN)?.[0]).toBe('[@ch01]');
    expect('[@a; @b]'.match(CITATION_PATTERN)?.[0]).toBe('[@a; @b]');
    expect('[@a-1; @b; @c2]'.match(CITATION_PATTERN)?.[0]).toBe(
      '[@a-1; @b; @c2]',
    );
    expect('x[@a]y'.match(CITATION_PATTERN)?.[0]).toBe('[@a]');
    for (const text of [
      '[ch01]',
      '[@A]',
      '[@]',
      '[@-a]',
      '[@a;@b]',
      '[@a, @b]',
    ]) {
      expect(text.match(CITATION_PATTERN), text).toBeNull();
    }

    expect(citationSchema.safeParse('[@ch01]').success).toBe(true);
    expect(citationSchema.safeParse('[@a; @b]').success).toBe(true);
    expect(citationSchema.safeParse('[@a]x').success).toBe(false);
    expect(citationSchema.safeParse('x[@a]').success).toBe(false);
    expect(citationSchema.safeParse('[@a;@b]').success).toBe(false);
  });

  it("E1: route constants sit under /api/project-store/, project-scoped ones carry :projectId, every error code passes Platform's errorCodeSchema, PROJECT_ERROR_STATUS covers every code, the projects section parses, and every timestamp field is an ISO Z string", () => {
    expect(ROUTES).toHaveLength(24);
    for (const route of ROUTES) {
      expect(route.startsWith('/api/project-store/'), route).toBe(true);
    }
    const scoped = ROUTES.filter((route) => route.includes(':projectId'));
    expect(scoped).toHaveLength(18);
    for (const route of scoped) {
      expect(route.startsWith('/api/project-store/projects/:projectId/')).toBe(
        true,
      );
    }

    expect(PROJECT_ERROR_CODE_VALUES).toHaveLength(20);
    for (const code of PROJECT_ERROR_CODE_VALUES) {
      expect(errorCodeSchema.safeParse(code).success, code).toBe(true);
    }
    expect(Object.keys(PROJECT_ERROR_STATUS).sort()).toEqual(
      [...PROJECT_ERROR_CODE_VALUES].sort(),
    );

    expect(
      projectsSectionSchema.safeParse({
        schemaVersion: PROJECTS_SECTION_SCHEMA_VERSION,
        active: null,
      }).success,
    ).toBe(true);
    expect(
      projectsSectionSchema.safeParse({ schemaVersion: 2, active: null })
        .success,
    ).toBe(false);

    const entry = {
      path: 'drafts/ch01.md',
      kind: 'file',
      size: 10,
      mtime: TS,
    };
    const read = {
      path: 'drafts/ch01.md',
      content: 'text',
      hash: HASH,
      mtime: TS,
    };
    const written = { path: 'drafts/ch01.md', hash: HASH, mtime: TS };
    const version = { id: 'v1', createdAt: TS, size: 4 };
    const noOffset = '2026-11-14T09:00:00';

    expect(fileEntrySchema.safeParse(entry).success).toBe(true);
    expect(
      fileEntrySchema.safeParse({ ...entry, mtime: noOffset }).success,
    ).toBe(false);
    expect(fileReadSchema.safeParse(read).success).toBe(true);
    expect(fileReadSchema.safeParse({ ...read, mtime: noOffset }).success).toBe(
      false,
    );
    expect(fileReadSchema.safeParse({ ...read, upgraded: true }).success).toBe(
      true,
    );
    expect(fileWriteResultSchema.safeParse(written).success).toBe(true);
    expect(
      fileWriteResultSchema.safeParse({ ...written, mtime: noOffset }).success,
    ).toBe(false);
    expect(draftVersionSchema.safeParse(version).success).toBe(true);
    expect(
      draftVersionSchema.safeParse({ ...version, createdAt: noOffset }).success,
    ).toBe(false);

    expect(pendingChangeSchema.safeParse(pendingChange()).success).toBe(true);
    const pendingFields: Array<[string, (p: Record<string, unknown>) => void]> =
      [
        ['createdAt', (p) => (p.createdAt = noOffset)],
        ['updatedAt', (p) => (p.updatedAt = noOffset)],
        [
          'conflict.detectedAt',
          (p) =>
            (p.conflict = { reason: 'base-changed', detectedAt: noOffset }),
        ],
        [
          'grounding.checkedAt',
          (p) =>
            (p.grounding = {
              supported: 0,
              weak: 0,
              unsupported: 0,
              checkedAt: noOffset,
            }),
        ],
      ];
    for (const [field, change] of pendingFields) {
      const input = pendingChange();
      change(input);
      expect(pendingChangeSchema.safeParse(input).success, field).toBe(false);
    }
  });

  it('E2: the five SSE members parse through the envelope, and a member with another module, another type or no data key is refused', () => {
    for (const event of EVENT_CASES) {
      const parsed = projectStoreEventSchema.safeParse({
        module: 'project-store',
        ...event,
      });
      expect(parsed.success, event.type).toBe(true);
    }

    expect(
      projectStoreEventSchema.safeParse({
        module: 'platform',
        type: 'files-changed',
        data: { projectId: 'my-book', paths: ['drafts/ch01.md'] },
      }).success,
    ).toBe(false);
    expect(
      projectStoreEventSchema.safeParse({
        module: 'project-store',
        type: 'project-switched',
        data: { from: null },
      }).success,
    ).toBe(false);
    expect(
      projectStoreEventSchema.safeParse({
        module: 'project-store',
        type: 'files-changed',
      }).success,
    ).toBe(false);
  });
});
