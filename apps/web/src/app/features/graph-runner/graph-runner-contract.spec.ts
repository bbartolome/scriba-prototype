import {
  currentRunSchema,
  GRAPH_RUNNER_EXAMPLES,
  graphDetailSchema,
  graphIdResultSchema,
  graphListSchema,
  validationResultSchema,
} from '@bbartolome/scriba-contracts/graph-runner';
import {
  entityListSchema,
  fileListSchema,
  PROJECT_ENTITIES_ROUTE,
  pendingListSchema,
} from '@bbartolome/scriba-contracts/project-store';
import {
  toolDetailSchema,
  toolListSchema,
} from '@bbartolome/scriba-contracts/tool-registry';
import { describe, expect, it } from 'vitest';
import {
  currentRunCopy,
  entitiesPath,
  entityListCopy,
  fileListCopy,
  graphDetailCopy,
  graphIdCopy,
  graphListCopy,
  graphDeletePath,
  graphPath,
  graphRenamePath,
  graphSavePath,
  graphValidatePath,
  GRAPHS_PATH,
  GRAPH_CREATE_PATH,
  noBodyCopy,
  pendingListCopy,
  projectFilesPath,
  pendingPath,
  RUN_CURRENT_PATH,
  toolListCopy,
  toolPath,
  toolViewsCopy,
  TOOLS_PATH,
  validationResultCopy,
} from './graph-runner-contract';

const HASH = `sha256:${'a'.repeat(64)}`;

const ROW = {
  id: 'chapter-opening',
  name: 'Chapter opening',
  view: 'recipe',
  nodeCount: 3,
  mtime: '2026-11-14T09:00:00Z',
  valid: true,
};

const RUN = {
  runId: 'run-1',
  graphId: 'chapter-opening',
  status: 'running',
  startedAt: '2026-11-14T09:00:00Z',
  inputs: {},
  targets: {},
  nodes: {},
  pendingChangeIds: [],
};

const CHANGE = {
  id: '20261114T090000000Z-abc123',
  projectId: 'p1',
  targetPath: 'graphs/chapter-opening.json',
  kind: 'modify',
  diff: '@@ -1 +1 @@\n-Old\n+New\n',
  capturedBase: { hash: HASH, content: 'Old' },
  proposed: 'New',
  origin: { kind: 'agent-run', runId: 'r1' },
  status: 'pending',
  conflict: null,
  createdAt: '2026-11-14T09:00:00Z',
  updatedAt: '2026-11-14T09:00:00Z',
};

// Each pair: a value the contract accepts and a value it refuses. The copy must agree on each.
const acceptedLists: unknown[] = [
  { graphs: [] },
  { graphs: [ROW] },
  { graphs: [{ ...ROW, view: null, nodeCount: null, valid: false }] },
];
const refusedLists: unknown[] = [
  {},
  { graphs: [ROW], extra: 1 },
  { graphs: [{ ...ROW, view: 'other' }] },
  { graphs: [{ ...ROW, nodeCount: -1 }] },
  { graphs: [{ ...ROW, mtime: '2026-11-14T09:00:00' }] },
  { graphs: [{ ...ROW, valid: 'yes' }] },
];

const acceptedRuns: unknown[] = [{ run: null }, { run: RUN }];
const refusedRuns: unknown[] = [
  {},
  { run: { ...RUN, status: 'paused' } },
  { run: { ...RUN, startedAt: 'soon' } },
  { run: { ...RUN, pendingChangeIds: [''] } },
];

const acceptedPending: unknown[] = [{ changes: [] }, { changes: [CHANGE] }];
const refusedPending: unknown[] = [
  {},
  { changes: [{ ...CHANGE, status: 'done' }] },
  { changes: [{ ...CHANGE, createdAt: '2026-11-14' }] },
];

describe('graph-runner-contract', () => {
  it('X3 graphListCopy agrees with graphListSchema on each sample', () => {
    for (const sample of [...acceptedLists, ...refusedLists]) {
      expect(graphListCopy.safeParse(sample).success).toBe(
        graphListSchema.safeParse(sample).success,
      );
    }
    for (const sample of acceptedLists) {
      expect(graphListCopy.safeParse(sample).success).toBe(true);
    }
  });

  it('X3 currentRunCopy agrees with currentRunSchema on each sample', () => {
    for (const sample of [...acceptedRuns, ...refusedRuns]) {
      expect(currentRunCopy.safeParse(sample).success).toBe(
        currentRunSchema.safeParse(sample).success,
      );
    }
  });

  it('X3 pendingListCopy agrees with pendingListSchema on each sample', () => {
    for (const sample of [...acceptedPending, ...refusedPending]) {
      expect(pendingListCopy.safeParse(sample).success).toBe(
        pendingListSchema.safeParse(sample).success,
      );
    }
  });

  it('X3 graphIdCopy agrees with graphIdResultSchema on each sample', () => {
    for (const sample of [{ id: 'chapter-two' }, {}, { id: 'Bad Id' }]) {
      expect(graphIdCopy.safeParse(sample).success).toBe(
        graphIdResultSchema.safeParse(sample).success,
      );
    }
  });

  it('X3 noBodyCopy accepts the empty body and refuses a value', () => {
    expect(noBodyCopy.safeParse(null).success).toBe(true);
    expect(noBodyCopy.safeParse({}).success).toBe(false);
  });

  it('X3 the path constants and helpers equal the contract routes with the ids encoded', () => {
    expect(GRAPHS_PATH).toBe('/api/graph-runner/graphs');
    expect(RUN_CURRENT_PATH).toBe('/api/graph-runner/runs/current');
    expect(GRAPH_CREATE_PATH).toBe('/api/graph-runner/graphs/create');
    expect(graphRenamePath('chapter one')).toBe(
      '/api/graph-runner/graphs/chapter%20one/rename',
    );
    expect(graphDeletePath('story-one')).toBe(
      '/api/graph-runner/graphs/story-one/delete',
    );
    expect(pendingPath('my book')).toBe(
      '/api/project-store/projects/my%20book/pending',
    );
  });

  it('K1 graphDetailCopy agrees with graphDetailSchema on each sample', () => {
    const { story, recipe } = GRAPH_RUNNER_EXAMPLES;
    const warning = {
      code: 'dead-step',
      severity: 'warning',
      nodeId: 'draft',
      message: 'Unused.',
    };
    const acceptedDetails: unknown[] = [
      { graph: story, issues: [] },
      { graph: recipe, issues: [] },
      { graph: recipe, issues: [warning] },
    ];
    const refusedDetails: unknown[] = [
      { issues: [] },
      { graph: { ...story, schemaVersion: 2 }, issues: [] },
      { graph: { ...story, view: 'other' }, issues: [] },
      {
        graph: { ...story, nodes: [{ ...story.nodes[0], id: undefined }] },
        issues: [],
      },
      { graph: { ...story, edges: [{ id: 'e1', from: 'a' }] }, issues: [] },
      { graph: story, issues: [], extra: 1 },
    ];
    for (const sample of [...acceptedDetails, ...refusedDetails]) {
      expect(graphDetailCopy.safeParse(sample).success).toBe(
        graphDetailSchema.safeParse(sample).success,
      );
    }
    for (const sample of acceptedDetails) {
      expect(graphDetailCopy.safeParse(sample).success).toBe(true);
    }
  });

  it('K2 validationResultCopy agrees with validationResultSchema on each sample', () => {
    const acceptedResults: unknown[] = [
      { issues: [] },
      {
        issues: [{ code: 'cycle', severity: 'error', message: 'A cycle.' }],
      },
    ];
    const refusedResults: unknown[] = [
      { issues: [{ code: 'cycle', severity: 'fatal', message: 'A cycle.' }] },
      { issues: [], extra: 1 },
      {},
    ];
    for (const sample of [...acceptedResults, ...refusedResults]) {
      expect(validationResultCopy.safeParse(sample).success).toBe(
        validationResultSchema.safeParse(sample).success,
      );
    }
    for (const sample of acceptedResults) {
      expect(validationResultCopy.safeParse(sample).success).toBe(true);
    }
  });

  it('K3 graphPath and graphSavePath equal the contract routes with the id encoded', () => {
    expect(graphPath('chapter-opening')).toBe(
      '/api/graph-runner/graphs/chapter-opening',
    );
    expect(graphSavePath('chapter-opening')).toBe(
      '/api/graph-runner/graphs/chapter-opening/save',
    );
    expect(graphPath('a/b')).toBe('/api/graph-runner/graphs/a%2Fb');
  });

  it('K3 toolListCopy and toolViewsCopy agree with toolListSchema and toolDetailSchema on each sample', () => {
    const ROW_OK = {
      name: 'cold_open',
      description: 'Opens a chapter.',
      output: 'draft',
      enabled: true,
      origin: 'nonfiction',
      valid: true,
      lintCounts: { errors: 0, warnings: 0 },
    };
    const VIEWS_OK = {
      functionSchema: {
        type: 'function',
        function: { name: 'cold_open', description: 'd', parameters: {} },
      },
      form: {
        fields: [
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
        ],
      },
      ports: {
        inputs: [
          {
            key: 'coreIdea',
            type: 'text',
            list: false,
            required: true,
            title: 'Core idea',
          },
        ],
        output: { key: 'output', type: 'text', kind: 'draft' },
        params: ['length'],
      },
    };
    const DETAIL = {
      spec: null,
      source: 'name: cold_open',
      origin: 'nonfiction',
      lint: [],
      views: VIEWS_OK,
    };
    const acceptedLists: unknown[] = [
      { tools: [] },
      { tools: [ROW_OK] },
      {
        tools: [
          {
            ...ROW_OK,
            output: null,
            error: { code: 'TOOL_NOT_FOUND', message: 'm' },
          },
        ],
      },
    ];
    const refusedLists: unknown[] = [
      {},
      { tools: [{ ...ROW_OK, origin: 'other' }] },
      { tools: [{ ...ROW_OK, output: 'poem' }] },
      { tools: [{ ...ROW_OK, enabled: 'yes' }] },
      { tools: [{ ...ROW_OK, lintCounts: { errors: 0 } }] },
    ];
    for (const sample of [...acceptedLists, ...refusedLists]) {
      expect(toolListCopy.safeParse(sample).success).toBe(
        toolListSchema.safeParse(sample).success,
      );
    }
    for (const sample of acceptedLists) {
      expect(toolListCopy.safeParse(sample).success).toBe(true);
    }

    const acceptedViews: unknown[] = [
      DETAIL,
      { ...DETAIL, views: null, spec: null },
    ];
    const refusedViews: unknown[] = [
      {},
      {
        ...DETAIL,
        views: {
          ...VIEWS_OK,
          ports: {
            ...VIEWS_OK.ports,
            output: { key: 'output', type: 'entity', kind: 'draft' },
          },
        },
      },
      { ...DETAIL, views: { ...VIEWS_OK, form: { fields: 'none' } } },
      {
        ...DETAIL,
        views: {
          ...VIEWS_OK,
          form: { fields: [{ key: 'length', port: false, control: 'number' }] },
        },
      },
    ];
    for (const sample of [...acceptedViews, ...refusedViews]) {
      expect(toolViewsCopy.safeParse(sample).success).toBe(
        toolDetailSchema.safeParse(sample).success,
      );
    }
    for (const sample of acceptedViews) {
      expect(toolViewsCopy.safeParse(sample).success).toBe(true);
    }
  });

  it('KS1 fileListCopy agrees with fileListSchema on each sample', () => {
    const FILE = {
      path: 'drafts/arrival.md',
      kind: 'file',
      size: 12,
      mtime: '2026-11-14T09:00:00Z',
    };
    const DIR = {
      path: 'drafts',
      kind: 'dir',
      size: 0,
      mtime: '2026-11-14T09:00:00Z',
    };
    const acceptedFiles: unknown[] = [
      { entries: [] },
      { entries: [FILE, DIR] },
    ];
    const refusedFiles: unknown[] = [
      {},
      { entries: 'none' },
      { entries: [{ ...FILE, kind: 'link' }] },
      { entries: [{ ...FILE, path: undefined }] },
    ];
    for (const sample of [...acceptedFiles, ...refusedFiles]) {
      expect(fileListCopy.safeParse(sample).success).toBe(
        fileListSchema.safeParse(sample).success,
      );
    }
    for (const sample of acceptedFiles) {
      expect(fileListCopy.safeParse(sample).success).toBe(true);
    }
  });

  it('KS2 projectFilesPath equals the contract route with the id encoded', () => {
    expect(projectFilesPath('p 1')).toBe(
      '/api/project-store/projects/p%201/files',
    );
  });

  it('K4 toolPath and graphValidatePath equal the contract routes', () => {
    expect(TOOLS_PATH).toBe('/api/tool-registry/tools');
    expect(toolPath('cold_open')).toBe('/api/tool-registry/tools/cold_open');
    expect(toolPath('a/b')).toBe('/api/tool-registry/tools/a%2Fb');
    expect(graphValidatePath()).toBe('/api/graph-runner/graphs/validate');
  });

  it('K5 entityListCopy agrees with entityListSchema on each sample, and entitiesPath equals PROJECT_ENTITIES_ROUTE', () => {
    const OK = {
      entities: [
        { id: 'anna', type: 'person', path: 'entities/anna.md', title: 'Anna' },
        { id: 'claim-1', type: 'claim', path: 'entities/claim-1.md' },
      ],
      invalid: [{ path: 'entities/bad.md', reason: 'no type' }],
    };
    const samples = [
      OK,
      { ...OK, extra: 1 },
      { entities: OK.entities },
      { entities: [{ id: 'Bad_ID', type: 'person', path: 'x' }], invalid: [] },
    ];
    for (const sample of samples) {
      const schema = entityListSchema.safeParse(sample);
      const copy = entityListCopy.safeParse(sample);
      expect(copy.success).toBe(schema.success);
      if (schema.success && copy.success) {
        expect(copy.data).toEqual(schema.data);
      }
    }
    expect(entitiesPath('p1')).toBe(
      PROJECT_ENTITIES_ROUTE.replace(':projectId', 'p1'),
    );
    expect(entitiesPath('a/b')).toBe(
      PROJECT_ENTITIES_ROUTE.replace(':projectId', 'a%2Fb'),
    );
  });
});
