import { describe, expect, expectTypeOf, it } from 'vitest';
import { z } from 'zod';
import * as gr from '../src/graph-runner/index.js';
import { errorCodeSchema } from '../src/platform/index.js';

const { GRAPH_RUNNER_EXAMPLES } = gr;

// A loosely typed copy of a JSON-shaped value, so that each negative case changes exactly one thing.
type Loose = Record<string, unknown>;

function copy(value: unknown): Loose {
  return structuredClone(value) as Loose;
}

function nodesOf(graph: Loose): Loose[] {
  return graph.nodes as Loose[];
}

function edgesOf(graph: Loose): Loose[] {
  return graph.edges as Loose[];
}

function nodeNamed(graph: Loose, id: string): Loose {
  const node = nodesOf(graph).find((candidate) => candidate.id === id);
  if (!node) {
    throw new Error(`no node named ${id}`);
  }
  return node;
}

function paramsOf(node: Loose): Loose {
  return node.params as Loose;
}

// The paths of the issues of a failed parse, each as `key/index/key`.
function issuePaths(result: { error?: z.ZodError }): string[] {
  return result.error
    ? result.error.issues.map((issue) => issue.path.join('/'))
    : [];
}

// A graph file refused by both the unique-id schema and the shape schema.
function expectRefused(graph: unknown): void {
  expect(gr.graphFileSchema.safeParse(graph).success).toBe(false);
  expect(gr.graphFileShapeSchema.safeParse(graph).success).toBe(false);
}

// One node per kind, for the view rules (E1).
const STORY_NODE = (kind: string): Loose => ({
  id: 'n',
  kind,
  label: 'x',
  position: { x: 0, y: 0 },
});

const RECIPE_NODE: Record<'input' | 'tool' | 'output', Loose> = {
  input: {
    id: 'n',
    kind: 'input',
    position: { x: 0, y: 0 },
    params: { type: 'text', label: 'x' },
  },
  tool: { id: 'n', kind: 'tool', position: { x: 0, y: 0 }, tool: 'cold_open' },
  output: { id: 'n', kind: 'output', position: { x: 0, y: 0 } },
};

function oneNodeGraph(view: 'story' | 'recipe', node: Loose): Loose {
  return { schemaVersion: 1, view, name: 'x', nodes: [node], edges: [] };
}

const HASH = `sha256:${'a'.repeat(64)}`;

// A run state with a text input and no file contents (E9).
const RUN_STATE = {
  runId: 'run-1',
  graphId: 'chapter-opening',
  status: 'running',
  startedAt: '2026-11-15T10:00:00Z',
  inputs: { 'chapter-notes': { kind: 'text', text: 'Notes' } },
  targets: {},
  nodes: {
    'chapter-notes': { status: 'done' },
    mystery: { status: 'running' },
  },
  pendingChangeIds: [],
};

describe('graph-runner schemas', () => {
  it('C2: the union accepts the example story graph and the example recipe', () => {
    expect(
      gr.graphFileSchema.safeParse(GRAPH_RUNNER_EXAMPLES.story).success,
    ).toBe(true);
    expect(
      gr.graphFileSchema.safeParse(GRAPH_RUNNER_EXAMPLES.recipe).success,
    ).toBe(true);
  });

  it('C2: refuses an unknown key', () => {
    const graph = copy(GRAPH_RUNNER_EXAMPLES.recipe);
    graph.comment = 'not in the schema';
    expectRefused(graph);
  });

  it('C2: refuses a recipe node in a story graph', () => {
    const graph = copy(GRAPH_RUNNER_EXAMPLES.story);
    nodesOf(graph).push({
      id: 'cold-open',
      kind: 'tool',
      position: { x: 0, y: 0 },
      tool: 'cold_open',
    });
    expectRefused(graph);
  });

  it('C2: refuses a relation on a recipe wire', () => {
    const graph = copy(GRAPH_RUNNER_EXAMPLES.recipe);
    edgesOf(graph)[0].relation = 'order';
    expectRefused(graph);
  });

  it('C2: refuses a tool node without tool', () => {
    const graph = copy(GRAPH_RUNNER_EXAMPLES.recipe);
    delete nodeNamed(graph, 'mystery').tool;
    expectRefused(graph);
  });

  it('C2: refuses a node id containing a dot', () => {
    const graph = copy(GRAPH_RUNNER_EXAMPLES.recipe);
    nodeNamed(graph, 'chapter-notes').id = 'chapter.notes';
    expectRefused(graph);
  });

  it('C2: refuses schemaVersion above 1', () => {
    const graph = copy(GRAPH_RUNNER_EXAMPLES.recipe);
    graph.schemaVersion = 2;
    expectRefused(graph);
  });

  it('C3: each example round-trips byte for byte through parse and serialise', () => {
    for (const example of [
      GRAPH_RUNNER_EXAMPLES.story,
      GRAPH_RUNNER_EXAMPLES.recipe,
    ]) {
      const text = JSON.stringify(example, null, 2) + '\n';
      const parsed = gr.graphFileSchema.parse(JSON.parse(text));
      expect(JSON.stringify(parsed, null, 2) + '\n').toBe(text);
      expect(parsed).toEqual(JSON.parse(text));
    }
  });

  it('C4: node-run-status has exactly the six values, run status exactly four', () => {
    const six = ['idle', 'queued', 'running', 'done', 'error', 'stopped'];
    const four = ['running', 'done', 'error', 'stopped'];
    expect([...gr.NODE_RUN_STATUSES]).toEqual(six);
    expect(gr.nodeRunStatusSchema.options).toEqual(six);
    expect([...gr.RUN_STATUSES]).toEqual(four);
    expect(gr.runStatusSchema.options).toEqual(four);
    expect(gr.nodeRunStatusSchema.safeParse('failed').success).toBe(false);
    expect(gr.runStatusSchema.safeParse('failed').success).toBe(false);
  });

  it('E1: legal kinds per view are constants and disjoint', () => {
    for (const kind of gr.STORY_NODE_KINDS) {
      expect(
        gr.graphFileSchema.safeParse(oneNodeGraph('story', STORY_NODE(kind)))
          .success,
      ).toBe(true);
      expect(
        gr.graphFileSchema.safeParse(oneNodeGraph('recipe', STORY_NODE(kind)))
          .success,
      ).toBe(false);
    }
    for (const kind of gr.RECIPE_NODE_KINDS) {
      expect(
        gr.graphFileSchema.safeParse(oneNodeGraph('recipe', RECIPE_NODE[kind]))
          .success,
      ).toBe(true);
      expect(
        gr.graphFileSchema.safeParse(oneNodeGraph('story', RECIPE_NODE[kind]))
          .success,
      ).toBe(false);
    }
    const recipeKinds: readonly string[] = gr.RECIPE_NODE_KINDS;
    expect(
      gr.STORY_NODE_KINDS.filter((kind) => recipeKinds.includes(kind)),
    ).toEqual([]);
  });

  it('E2: repeated node or edge ids are refused by graphFileSchema and accepted by graphFileShapeSchema', () => {
    for (const example of [
      GRAPH_RUNNER_EXAMPLES.story,
      GRAPH_RUNNER_EXAMPLES.recipe,
    ]) {
      const duplicateNode = copy(example);
      nodesOf(duplicateNode)[1].id = nodesOf(duplicateNode)[0].id;
      const strictNode = gr.graphFileSchema.safeParse(duplicateNode);
      expect(strictNode.success).toBe(false);
      expect(issuePaths(strictNode)).toContain('nodes/1/id');
      expect(gr.graphFileShapeSchema.safeParse(duplicateNode).success).toBe(
        true,
      );

      const duplicateEdge = copy(example);
      edgesOf(duplicateEdge)[1].id = edgesOf(duplicateEdge)[0].id;
      const strictEdge = gr.graphFileSchema.safeParse(duplicateEdge);
      expect(strictEdge.success).toBe(false);
      expect(issuePaths(strictEdge)).toContain('edges/1/id');
      expect(gr.graphFileShapeSchema.safeParse(duplicateEdge).success).toBe(
        true,
      );
    }
  });

  it('E3: relation is optional and non-empty; the vocabulary has its three meanings', () => {
    const withoutRelation = copy(GRAPH_RUNNER_EXAMPLES.story);
    delete edgesOf(withoutRelation)[0].relation;
    expect(gr.graphFileSchema.safeParse(withoutRelation).success).toBe(true);

    const emptyRelation = copy(GRAPH_RUNNER_EXAMPLES.story);
    edgesOf(emptyRelation)[0].relation = '';
    expect(gr.graphFileSchema.safeParse(emptyRelation).success).toBe(false);

    expect(gr.RELATION_VOCABULARY).toEqual({
      order: 'from precedes to',
      causality: 'from causes to',
      containment: 'from contains to',
    });
  });

  it('E4: input params need type and label; the input type is a port type; output and tool params are optional; tool is forbidden on input and output nodes', () => {
    const withoutParams = copy(GRAPH_RUNNER_EXAMPLES.recipe);
    delete nodeNamed(withoutParams, 'chapter-notes').params;
    expectRefused(withoutParams);

    const numberType = copy(GRAPH_RUNNER_EXAMPLES.recipe);
    paramsOf(nodeNamed(numberType, 'chapter-notes')).type = 'number';
    expectRefused(numberType);

    const entityType = copy(GRAPH_RUNNER_EXAMPLES.recipe);
    paramsOf(nodeNamed(entityType, 'chapter-notes')).type = 'entity';
    expect(gr.graphFileSchema.safeParse(entityType).success).toBe(true);

    const outputWithoutParams = copy(GRAPH_RUNNER_EXAMPLES.recipe);
    delete nodeNamed(outputWithoutParams, 'draft').params;
    expect(gr.graphFileSchema.safeParse(outputWithoutParams).success).toBe(
      true,
    );

    const toolParams = copy(GRAPH_RUNNER_EXAMPLES.recipe);
    nodeNamed(toolParams, 'mystery').params = { x: 1 };
    expect(gr.graphFileSchema.safeParse(toolParams).success).toBe(true);

    const inputWithTool = copy(GRAPH_RUNNER_EXAMPLES.recipe);
    nodeNamed(inputWithTool, 'chapter-notes').tool = 'cold_open';
    expectRefused(inputWithTool);

    const outputWithTool = copy(GRAPH_RUNNER_EXAMPLES.recipe);
    nodeNamed(outputWithTool, 'draft').tool = 'cold_open';
    expectRefused(outputWithTool);
  });

  it('E5: port ids are <nodeId>.<key>; INPUT_NODE_OUTPUT_KEY is out, OUTPUT_NODE_INPUT_KEY is in, TOOL_NODE_OUTPUT_KEY is output', () => {
    for (const id of ['notes.out', 'cold-open.output.extra']) {
      expect(gr.portIdSchema.safeParse(id).success).toBe(true);
    }
    for (const id of ['notes', '.out', 'Notes.out']) {
      expect(gr.portIdSchema.safeParse(id).success).toBe(false);
    }
    expect(gr.INPUT_NODE_OUTPUT_KEY).toBe('out');
    expect(gr.OUTPUT_NODE_INPUT_KEY).toBe('in');
    expect(gr.TOOL_NODE_OUTPUT_KEY).toBe('output');
  });

  it('E6: graph summary, create and rename shapes', () => {
    expect(
      gr.graphSummarySchema.safeParse({
        id: 'broken-file',
        name: 'broken-file',
        view: null,
        nodeCount: null,
        mtime: '2026-11-15T10:00:00Z',
        valid: false,
      }).success,
    ).toBe(true);
    expect(
      gr.graphCreateSchema.safeParse({ name: 'Chapter', view: 'grid' }).success,
    ).toBe(false);
    expect(gr.graphRenameSchema.safeParse({ name: 'Renamed' }).success).toBe(
      true,
    );
    expect(gr.graphRenameSchema.safeParse({ newId: 'renamed' }).success).toBe(
      true,
    );
    expect(gr.graphRenameSchema.safeParse({}).success).toBe(false);
    expect(
      gr.graphRenameSchema.safeParse({ name: 'Renamed', newId: 'renamed' })
        .success,
    ).toBe(false);
  });

  it('E7: fourteen error codes and eight warning codes; severities are error and warning', () => {
    const errors = [
      'illegal-node-kind',
      'unknown-tool',
      'disabled-tool',
      'missing-port',
      'port-type-mismatch',
      'multiple-wires-into-port',
      'port-wired-and-pinned',
      'required-port-unfed',
      'tool-params-invalid',
      'cycle',
      'output-unwired',
      'output-not-fed-by-tool',
      'output-kind-unwritable',
      'duplicate-id',
    ];
    const warnings = [
      'dead-step',
      'input-unwired',
      'pinned-entity-missing',
      'path-missing',
      'path-unsafe',
      'path-in-versions',
      'unknown-edge-node',
      'entity-path-outside-entities',
    ];
    expect(gr.GRAPH_ERROR_ISSUE_CODES).toHaveLength(14);
    expect(gr.GRAPH_WARNING_ISSUE_CODES).toHaveLength(8);
    expect(gr.GRAPH_ISSUE_CODES).toHaveLength(22);
    expect([...gr.GRAPH_ERROR_ISSUE_CODES]).toEqual(errors);
    expect([...gr.GRAPH_WARNING_ISSUE_CODES]).toEqual(warnings);
    expect([...gr.GRAPH_ISSUE_CODES]).toEqual([...errors, ...warnings]);
    expect([...gr.GRAPH_ISSUE_SEVERITIES]).toEqual(['error', 'warning']);

    expect(
      gr.validationIssueSchema.safeParse({
        code: 'duplicate-id',
        severity: 'info',
        nodeId: 'a',
        message: 'x',
      }).success,
    ).toBe(false);
    expect(
      gr.validationIssueSchema.safeParse({
        code: 'duplicate-id',
        severity: 'error',
        nodeId: 'a',
        message: 'x',
      }).success,
    ).toBe(true);
  });

  it('E8: GRAPH error codes match the platform error-code pattern and each has a status', () => {
    const ten = [
      'GRAPH_NOT_FOUND',
      'GRAPH_SCHEMA_INVALID',
      'GRAPH_SCHEMA_VERSION_UNSUPPORTED',
      'GRAPH_VALIDATION_FAILED',
      'GRAPH_VIEW_NOT_RUNNABLE',
      'GRAPH_RUN_ACTIVE',
      'GRAPH_RUN_NOT_FOUND',
      'GRAPH_INPUT_MISSING',
      'GRAPH_INPUT_INVALID',
      'GRAPH_TARGET_INVALID',
    ];
    expect([...gr.GRAPH_ERROR_CODE_VALUES]).toEqual(ten);
    for (const code of gr.GRAPH_ERROR_CODE_VALUES) {
      expect(errorCodeSchema.safeParse(code).success).toBe(true);
    }
    expect(gr.GRAPH_ERROR_STATUS).toEqual({
      GRAPH_NOT_FOUND: 404,
      GRAPH_SCHEMA_INVALID: 422,
      GRAPH_SCHEMA_VERSION_UNSUPPORTED: 409,
      GRAPH_VALIDATION_FAILED: 422,
      GRAPH_VIEW_NOT_RUNNABLE: 409,
      GRAPH_RUN_ACTIVE: 409,
      GRAPH_RUN_NOT_FOUND: 404,
      GRAPH_INPUT_MISSING: 422,
      GRAPH_INPUT_INVALID: 422,
      GRAPH_TARGET_INVALID: 422,
    });
    expect(Object.values(gr.GRAPH_ERROR_CODES).sort()).toEqual([...ten].sort());
    expect(Object.keys(gr.GRAPH_ERROR_STATUS).sort()).toEqual([...ten].sort());
    expect(gr.graphErrorCodeSchema.options).toEqual(ten);
  });

  it('E9: run requests, input values and run state', () => {
    const start = {
      graphId: 'chapter-opening',
      inputs: {
        'chapter-notes': { kind: 'text', text: 'Notes' },
        'house-style': { kind: 'file', ref: 'sources/style.md' },
        people: { kind: 'entities', refs: ['veteran-keeper'] },
      },
    };
    expect(gr.runStartRequestSchema.safeParse(start).success).toBe(true);
    expect(
      gr.inputValueSchema.safeParse({ kind: 'style', refs: ['veteran-keeper'] })
        .success,
    ).toBe(false);

    expect(
      gr.runStateSchema.safeParse({ ...RUN_STATE, status: 'failed' }).success,
    ).toBe(false);

    const withFile = {
      ...RUN_STATE,
      inputs: { 'house-style': { kind: 'file', ref: 'sources/style.md' } },
    };
    const parsed = gr.runStateSchema.parse(withFile);
    expect(parsed.inputs['house-style']).toEqual({
      kind: 'file',
      ref: 'sources/style.md',
    });
    expect(
      gr.inputValueSchema.safeParse({
        kind: 'file',
        ref: 'sources/style.md',
        content: 'the file text',
      }).success,
    ).toBe(false);

    expect(gr.currentRunSchema.safeParse({ run: null }).success).toBe(true);

    expect(
      gr.nodeResultSchema.safeParse({
        output: { kind: 'draft', content: 'Text.' },
        sourcesUsed: ['veteran-keeper'],
      }).success,
    ).toBe(true);
    expect(
      gr.nodeResultSchema.safeParse({
        pendingChangeId: 'pc-1',
        path: 'drafts/chapter-opening.md',
      }).success,
    ).toBe(true);
  });

  it('E10: the three SSE members and the six log entries parse against their schemas', () => {
    const runStarted = {
      module: 'graph-runner',
      type: 'run-started',
      data: RUN_STATE,
    };
    const nodeStatus = {
      module: 'graph-runner',
      type: 'node-status',
      data: {
        runId: 'run-1',
        nodeId: 'mystery',
        status: 'done',
        result: {
          output: { kind: 'draft', content: 'Question?' },
          sourcesUsed: [],
        },
      },
    };
    const runEnded = {
      module: 'graph-runner',
      type: 'run-ended',
      data: { runId: 'run-1', status: 'stopped', reason: 'author' },
    };
    for (const event of [runStarted, nodeStatus, runEnded]) {
      expect(gr.graphRunnerEventSchema.safeParse(event).success).toBe(true);
    }
    expect(
      gr.graphRunnerEventSchema.safeParse({ ...runEnded, module: 'shell' })
        .success,
    ).toBe(false);

    const at = '2026-11-15T10:00:00Z';
    const entries = [
      {
        type: 'run-started',
        at,
        runId: 'run-1',
        graphId: 'chapter-opening',
        target: { nodeId: 'cold-open' },
        inputs: {
          'chapter-notes': { kind: 'text', text: 'Notes' },
          'house-style': { kind: 'file', ref: 'sources/style.md', hash: HASH },
        },
      },
      {
        type: 'node-status',
        at,
        runId: 'run-1',
        nodeId: 'mystery',
        status: 'running',
      },
      {
        type: 'tool-call',
        at,
        runId: 'run-1',
        nodeId: 'mystery',
        arguments: { words: 40 },
        output: { kind: 'draft', content: 'Question?' },
        sourcesUsed: ['veteran-keeper'],
      },
      {
        type: 'error',
        at,
        runId: 'run-1',
        nodeId: 'mystery',
        code: 'TOOL_MODEL_ERROR',
        message: 'The model failed.',
      },
      {
        type: 'pending-change',
        at,
        runId: 'run-1',
        nodeId: 'draft',
        pendingChangeId: 'pc-1',
        path: 'drafts/chapter-opening.md',
      },
      { type: 'run-ended', at, runId: 'run-1', status: 'done' },
    ];
    expect(entries.map((entry) => entry.type)).toEqual([
      'run-started',
      'node-status',
      'tool-call',
      'error',
      'pending-change',
      'run-ended',
    ]);
    for (const entry of entries) {
      expect(gr.runLogEntrySchema.safeParse(entry).success).toBe(true);
    }
    expect(
      gr.runLogInputSchema.safeParse({
        kind: 'file',
        ref: 'sources/style.md',
      }).success,
    ).toBe(false);
  });

  it('E11: every route is under /api/graph-runner and the GET and POST names are as in section 2', () => {
    const routes = [
      gr.GRAPHS_ROUTE,
      gr.GRAPH_ROUTE,
      gr.GRAPH_CREATE_ROUTE,
      gr.GRAPH_VALIDATE_ROUTE,
      gr.GRAPH_SAVE_ROUTE,
      gr.GRAPH_RENAME_ROUTE,
      gr.GRAPH_DELETE_ROUTE,
      gr.RUNS_ROUTE,
      gr.RUN_STOP_ROUTE,
      gr.RUN_CURRENT_ROUTE,
    ];
    for (const route of routes) {
      expect(route.startsWith('/api/graph-runner/')).toBe(true);
    }
    expect(gr.GRAPH_ROUTE).toContain(':id');
    expect(gr.GRAPH_VALIDATE_ROUTE).toBe('/api/graph-runner/graphs/validate');
    expect(gr.RUNS_ROUTE).toBe('/api/graph-runner/runs');
    expect(gr.RUN_STOP_ROUTE).toBe('/api/graph-runner/runs/stop');
  });

  it('each exported type is the z.infer of its schema (compile-time, checked by tsc)', () => {
    expectTypeOf<gr.GraphView>().toEqualTypeOf<
      z.infer<typeof gr.graphViewSchema>
    >();
    expectTypeOf<gr.Position>().toEqualTypeOf<
      z.infer<typeof gr.positionSchema>
    >();
    expectTypeOf<gr.StoryNode>().toEqualTypeOf<
      z.infer<typeof gr.storyNodeSchema>
    >();
    expectTypeOf<gr.StoryEdge>().toEqualTypeOf<
      z.infer<typeof gr.storyEdgeSchema>
    >();
    expectTypeOf<gr.RecipeNode>().toEqualTypeOf<
      z.infer<typeof gr.recipeNodeSchema>
    >();
    expectTypeOf<gr.RecipeWire>().toEqualTypeOf<
      z.infer<typeof gr.recipeWireSchema>
    >();
    expectTypeOf<gr.InputParams>().toEqualTypeOf<
      z.infer<typeof gr.inputParamsSchema>
    >();
    expectTypeOf<gr.OutputParams>().toEqualTypeOf<
      z.infer<typeof gr.outputParamsSchema>
    >();
    expectTypeOf<gr.StoryGraph>().toEqualTypeOf<
      z.infer<typeof gr.storyGraphSchema>
    >();
    expectTypeOf<gr.RecipeGraph>().toEqualTypeOf<
      z.infer<typeof gr.recipeGraphSchema>
    >();
    expectTypeOf<gr.GraphFile>().toEqualTypeOf<
      z.infer<typeof gr.graphFileSchema>
    >();
    expectTypeOf<gr.GraphIssueSeverity>().toEqualTypeOf<
      z.infer<typeof gr.graphIssueSeveritySchema>
    >();
    expectTypeOf<gr.GraphIssueCode>().toEqualTypeOf<
      z.infer<typeof gr.graphIssueCodeSchema>
    >();
    expectTypeOf<gr.ValidationIssue>().toEqualTypeOf<
      z.infer<typeof gr.validationIssueSchema>
    >();
    expectTypeOf<gr.ValidationResult>().toEqualTypeOf<
      z.infer<typeof gr.validationResultSchema>
    >();
    expectTypeOf<gr.GraphSummary>().toEqualTypeOf<
      z.infer<typeof gr.graphSummarySchema>
    >();
    expectTypeOf<gr.GraphList>().toEqualTypeOf<
      z.infer<typeof gr.graphListSchema>
    >();
    expectTypeOf<gr.GraphDetail>().toEqualTypeOf<
      z.infer<typeof gr.graphDetailSchema>
    >();
    expectTypeOf<gr.GraphCreate>().toEqualTypeOf<
      z.infer<typeof gr.graphCreateSchema>
    >();
    expectTypeOf<gr.GraphRename>().toEqualTypeOf<
      z.infer<typeof gr.graphRenameSchema>
    >();
    expectTypeOf<gr.GraphIdResult>().toEqualTypeOf<
      z.infer<typeof gr.graphIdResultSchema>
    >();
    expectTypeOf<gr.RunStatus>().toEqualTypeOf<
      z.infer<typeof gr.runStatusSchema>
    >();
    expectTypeOf<gr.RunReason>().toEqualTypeOf<
      z.infer<typeof gr.runReasonSchema>
    >();
    expectTypeOf<gr.NodeRunStatus>().toEqualTypeOf<
      z.infer<typeof gr.nodeRunStatusSchema>
    >();
    expectTypeOf<gr.InputValue>().toEqualTypeOf<
      z.infer<typeof gr.inputValueSchema>
    >();
    expectTypeOf<gr.RunTarget>().toEqualTypeOf<
      z.infer<typeof gr.runTargetSchema>
    >();
    expectTypeOf<gr.RunStartRequest>().toEqualTypeOf<
      z.infer<typeof gr.runStartRequestSchema>
    >();
    expectTypeOf<gr.RunStartResult>().toEqualTypeOf<
      z.infer<typeof gr.runStartResultSchema>
    >();
    expectTypeOf<gr.RunStopRequest>().toEqualTypeOf<
      z.infer<typeof gr.runStopRequestSchema>
    >();
    expectTypeOf<gr.RunError>().toEqualTypeOf<
      z.infer<typeof gr.runErrorSchema>
    >();
    expectTypeOf<gr.OutputNodeResult>().toEqualTypeOf<
      z.infer<typeof gr.outputNodeResultSchema>
    >();
    expectTypeOf<gr.NodeResult>().toEqualTypeOf<
      z.infer<typeof gr.nodeResultSchema>
    >();
    expectTypeOf<gr.NodeRunState>().toEqualTypeOf<
      z.infer<typeof gr.nodeRunStateSchema>
    >();
    expectTypeOf<gr.RunState>().toEqualTypeOf<
      z.infer<typeof gr.runStateSchema>
    >();
    expectTypeOf<gr.CurrentRun>().toEqualTypeOf<
      z.infer<typeof gr.currentRunSchema>
    >();
    expectTypeOf<gr.NodeStatusData>().toEqualTypeOf<
      z.infer<typeof gr.nodeStatusDataSchema>
    >();
    expectTypeOf<gr.RunEndedData>().toEqualTypeOf<
      z.infer<typeof gr.runEndedDataSchema>
    >();
    expectTypeOf<gr.GraphRunnerEvent>().toEqualTypeOf<
      z.infer<typeof gr.graphRunnerEventSchema>
    >();
    expectTypeOf<gr.RunLogInput>().toEqualTypeOf<
      z.infer<typeof gr.runLogInputSchema>
    >();
    expectTypeOf<gr.RunLogEntry>().toEqualTypeOf<
      z.infer<typeof gr.runLogEntrySchema>
    >();
    expectTypeOf<gr.GraphErrorCode>().toEqualTypeOf<
      z.infer<typeof gr.graphErrorCodeSchema>
    >();
  });
});
