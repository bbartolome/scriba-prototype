import { describe, expect, expectTypeOf, it } from 'vitest';
import type { ZodType } from 'zod';
import {
  AGENT_CARD_STATUSES,
  AGENT_CONVERSATION_ROUTE,
  AGENT_CONVERSATIONS_ROUTE,
  AGENT_DEFAULT_STEP_CAP,
  AGENT_ERROR_CODE_VALUES,
  AGENT_ERROR_CODES,
  AGENT_ERROR_STATUS,
  AGENT_GROUNDING_ROUTE,
  AGENT_RESERVED_TOOL_NAMES,
  AGENT_RUN_CURRENT_ROUTE,
  AGENT_RUN_END_REASONS,
  AGENT_RUN_STATUSES,
  AGENT_RUN_STOP_ROUTE,
  AGENT_RUNS_ROUTE,
  AGENT_SETTINGS_DEFAULTS,
  AGENT_SETTINGS_ROUTE,
  AGENT_TOOL_FAMILIES,
  AGENT_TRANSCRIPT_KINDS,
  AGENT_TRANSCRIPT_PATH_PATTERN,
  AGENT_TRANSCRIPT_PATH_TEMPLATE,
  AGENT_TRANSCRIPT_SCHEMA_VERSION,
  agentCardSchema,
  agentConversationIdSchema,
  agentErrorCodeSchema,
  agentEventBaseSchema,
  agentLoopEventSchema,
  agentReservedToolNameSchema,
  agentRunEndReasonSchema,
  agentRunIdSchema,
  agentRunStateSchema,
  agentRunStatusSchema,
  agentCardStatusSchema,
  agentSeqSchema,
  agentSettingsSchema,
  agentSettingsUpdateSchema,
  agentStartRequestSchema,
  agentStartResponseSchema,
  agentStopRequestSchema,
  agentToolFamilySchema,
  agentTranscriptKindSchema,
  conversationHistorySchema,
  conversationListSchema,
  conversationTurnSchema,
  draftProvenanceSchema,
  groundingClaimSchema,
  groundingRequestSchema,
  GROUNDING_ARTEFACT_PATH_PATTERN,
  GROUNDING_ARTEFACT_PATH_PREFIX,
  GROUNDING_ARTEFACT_PATH_SUFFIX,
  GROUNDING_ARTEFACT_PATH_TEMPLATE,
  GROUNDING_RESULT_SCHEMA_VERSION,
  GROUNDING_VERDICTS,
  groundingResultSchema,
  groundingSummarySchema,
  groundingVerdictSchema,
  runStartedDataSchema,
  tokenDeltaDataSchema,
  toolCallStartedDataSchema,
  toolCallArgsDataSchema,
  toolCallResultDataSchema,
  toolCallErrorDataSchema,
  groundingStartedDataSchema,
  groundingResultDataSchema,
  stepCapReachedDataSchema,
  runEndedDataSchema,
  toolCallIdSchema,
  transcriptEntrySchema,
  type AgentLoopEvent,
  type GroundingSummary,
} from '../src/agent-loop/index.js';
import {
  contentHashSchema,
  entityRefSchema,
  pendingChangeSchema,
  pendingGroundingSchema,
  type PendingGrounding,
} from '../src/project-store/index.js';
import { errorCodeSchema } from '../src/platform/index.js';

const AT = '2026-11-14T09:00:00Z';
const HASH = `sha256:${'a'.repeat(64)}`;
const RUN = 'run-1';

const claimSupported = {
  text: 'Ann left the city in May.',
  span: { start: 0, end: 25 },
  verdict: 'supported',
  passage: {
    path: 'sources/ann.md',
    offset: 10,
    snippet: 'Ann left the city in May.',
  },
  reason: 'The passage states the move.',
};

const claimWeak = {
  text: 'She never came back.',
  span: { start: 26, end: 46 },
  verdict: 'weak',
  passage: {
    path: 'sources/ann.md',
    offset: 40,
    snippet: 'She stayed away for years.',
  },
  reason: 'The passage implies it.',
};

const claimUnsupported = {
  text: 'The city was flooded.',
  span: { start: 47, end: 68 },
  verdict: 'unsupported',
  reason: 'No passage mentions a flood.',
};

const groundingResult = {
  schemaVersion: 1,
  targetPath: 'drafts/ch01.md',
  contentHash: HASH,
  checkedAt: AT,
  runId: RUN,
  claims: [claimSupported, claimWeak, claimUnsupported],
};

const runningState = {
  runId: RUN,
  conversationId: 'conv-1',
  status: 'running',
  step: 2,
  cap: 12,
  assistantText: 'Looking at the outline.',
  cards: [
    {
      callId: 'call-1',
      name: 'list_files',
      family: 'project',
      status: 'running',
    },
    {
      callId: 'call-2',
      name: 'read_file',
      family: 'project',
      status: 'done',
      summary: 'Read one file',
      output: 'Chapter one.',
    },
    {
      callId: 'call-3',
      name: 'edit_file',
      family: 'project',
      status: 'error',
      error: { message: 'No match for the old text', attempt: 1 },
    },
  ],
  groundingResults: [groundingResult],
  pendingChangeIds: ['pc-1'],
  lastSeq: 7,
};

const turn = {
  runId: RUN,
  intent: 'Summarize my outline',
  assistantText: 'The outline has three chapters.',
  cards: [],
  endedAt: AT,
  reason: 'completed',
};

const NARRATIVE_OUTPUT = { kind: 'draft', content: 'Once upon a time' };
const STRING_OUTPUT = 'Chapter one begins in May.';
const LIST_OUTPUT = [
  { path: 'sources/outline.md', kind: 'file', size: 120, mtime: AT },
];

const PROVENANCE = {
  runId: RUN,
  toolCallId: 'call-1',
  tool: 'write_file',
  entityIds: ['ann'],
  sourcesUsed: ['ann'],
  model: 'mock-model',
  at: AT,
};

const SUMMARY = { supported: 1, weak: 1, unsupported: 1, checkedAt: AT };

type Data = Record<string, unknown>;

function envelope(type: string, data: Data): Record<string, unknown> {
  return { module: 'agent-loop', type, data };
}

function without(data: Data, key: string): Data {
  const copy = { ...data };
  delete copy[key];
  return copy;
}

describe('C1a: every shape parses its valid example and refuses its invalid one', () => {
  it('request group: start, stop and grounding requests', () => {
    expect(
      agentStartRequestSchema.safeParse({ intent: 'Summarize' }).success,
    ).toBe(true);
    expect(
      agentStartRequestSchema.safeParse({
        intent: 'Summarize',
        conversationId: 'conv-1',
      }).success,
    ).toBe(true);
    expect(agentStartRequestSchema.safeParse({ intent: '' }).success).toBe(
      false,
    );
    expect(agentStartRequestSchema.safeParse({}).success).toBe(false);
    expect(agentStartResponseSchema.safeParse({ runId: RUN }).success).toBe(
      false,
    );
    expect(
      agentStartResponseSchema.safeParse({
        runId: RUN,
        conversationId: 'conv-1',
      }).success,
    ).toBe(true);
    expect(agentStopRequestSchema.safeParse({ runId: '' }).success).toBe(false);
    expect(agentStopRequestSchema.safeParse({ runId: RUN }).success).toBe(true);
    expect(groundingRequestSchema.safeParse({}).success).toBe(false);
    expect(
      groundingRequestSchema.safeParse({ path: 'drafts/ch01.md' }).success,
    ).toBe(true);
  });

  it('run state: running and ended states, and the refused fields', () => {
    expect(agentRunStateSchema.safeParse(runningState).success).toBe(true);
    expect(
      agentRunStateSchema.safeParse({
        ...runningState,
        status: 'ended',
        reason: 'capped',
      }).success,
    ).toBe(true);
    expect(
      agentRunStateSchema.safeParse({ ...runningState, status: 'paused' })
        .success,
    ).toBe(false);
    expect(
      agentRunStateSchema.safeParse({ ...runningState, lastSeq: -1 }).success,
    ).toBe(false);
    expect(
      agentRunStateSchema.safeParse({ ...runningState, cap: 0 }).success,
    ).toBe(false);
    expect(
      agentRunStateSchema.safeParse({
        ...runningState,
        cards: [
          {
            callId: 'call-1',
            name: 'list_files',
            family: 'project',
            status: 'pending',
          },
        ],
      }).success,
    ).toBe(false);
  });

  it('conversations: history and list accepted; a turn without endedAt and a summary with turnCount 0 refused', () => {
    expect(
      conversationHistorySchema.safeParse({
        conversationId: 'conv-1',
        turns: [turn],
      }).success,
    ).toBe(true);
    expect(
      conversationListSchema.safeParse({
        conversations: [
          {
            conversationId: 'conv-1',
            intent: 'Summarize my outline',
            updatedAt: AT,
            turnCount: 1,
          },
        ],
      }).success,
    ).toBe(true);
    expect(
      conversationTurnSchema.safeParse(without(turn, 'endedAt')).success,
    ).toBe(false);
    expect(
      conversationListSchema.safeParse({
        conversations: [
          {
            conversationId: 'conv-1',
            intent: 'Summarize my outline',
            updatedAt: AT,
            turnCount: 0,
          },
        ],
      }).success,
    ).toBe(false);
  });

  it('grounding: result, claim verdicts, and the summary', () => {
    expect(groundingResultSchema.safeParse(groundingResult).success).toBe(true);
    expect(
      groundingResultSchema.safeParse({ ...groundingResult, schemaVersion: 2 })
        .success,
    ).toBe(false);
    expect(
      groundingResultSchema.safeParse({
        ...groundingResult,
        contentHash: 'abc',
      }).success,
    ).toBe(false);
    expect(
      groundingClaimSchema.safeParse({
        ...claimSupported,
        span: { start: -1, end: 5 },
      }).success,
    ).toBe(false);
    expect(
      groundingClaimSchema.safeParse({ ...claimSupported, verdict: 'maybe' })
        .success,
    ).toBe(false);
    expect(
      groundingClaimSchema.safeParse({ ...claimSupported, text: '' }).success,
    ).toBe(false);
    expect(groundingSummarySchema.safeParse(SUMMARY).success).toBe(true);
    expect(
      groundingSummarySchema.safeParse({ ...SUMMARY, supported: -1 }).success,
    ).toBe(false);
    expect(
      groundingSummarySchema.safeParse({ ...SUMMARY, weak: 1.5 }).success,
    ).toBe(false);
    expect(
      groundingSummarySchema.safeParse(without(SUMMARY, 'checkedAt')).success,
    ).toBe(false);
  });

  it('transcript: each of the nine kinds accepted; unknown kind, schemaVersion 2, no data, no Z, seq 0 refused', () => {
    const kinds = [
      'intent',
      'step',
      'assistant-text',
      'tool-call',
      'tool-result',
      'tool-error',
      'grounding',
      'pending-change',
      'run-end',
    ];
    for (const kind of kinds) {
      const entry = {
        schemaVersion: 1,
        at: AT,
        runId: RUN,
        conversationId: 'conv-1',
        seq: 1,
        kind,
        data: {},
      };
      expect(transcriptEntrySchema.safeParse(entry).success, kind).toBe(true);
    }
    const base = {
      schemaVersion: 1,
      at: AT,
      runId: RUN,
      conversationId: 'conv-1',
      seq: 1,
      kind: 'step',
      data: {},
    };
    expect(
      transcriptEntrySchema.safeParse({ ...base, kind: 'note' }).success,
    ).toBe(false);
    expect(
      transcriptEntrySchema.safeParse({ ...base, schemaVersion: 2 }).success,
    ).toBe(false);
    expect(transcriptEntrySchema.safeParse(without(base, 'data')).success).toBe(
      false,
    );
    expect(
      transcriptEntrySchema.safeParse({ ...base, at: '2026-11-14T09:00:00' })
        .success,
    ).toBe(false);
    expect(transcriptEntrySchema.safeParse({ ...base, seq: 0 }).success).toBe(
      false,
    );
  });

  it('provenance: accepted; an entity id `Ann` and a missing model refused', () => {
    expect(draftProvenanceSchema.safeParse(PROVENANCE).success).toBe(true);
    expect(
      draftProvenanceSchema.safeParse({ ...PROVENANCE, entityIds: ['Ann'] })
        .success,
    ).toBe(false);
    expect(
      draftProvenanceSchema.safeParse(without(PROVENANCE, 'model')).success,
    ).toBe(false);
  });

  it('settings: defaults accepted; invalid step cap, flag, and scheme refused; local and public endpoints accepted', () => {
    expect(agentSettingsSchema.safeParse(AGENT_SETTINGS_DEFAULTS).success).toBe(
      true,
    );
    expect(
      agentSettingsSchema.safeParse({ ...AGENT_SETTINGS_DEFAULTS, stepCap: 0 })
        .success,
    ).toBe(false);
    expect(
      agentSettingsSchema.safeParse({
        ...AGENT_SETTINGS_DEFAULTS,
        stepCap: 1.5,
      }).success,
    ).toBe(false);
    expect(
      agentSettingsSchema.safeParse({
        ...AGENT_SETTINGS_DEFAULTS,
        research: { enabled: 'yes' },
      }).success,
    ).toBe(false);
    expect(
      agentSettingsSchema.safeParse({
        ...AGENT_SETTINGS_DEFAULTS,
        research: { enabled: true, searchEndpoint: 'ftp://x/y' },
      }).success,
    ).toBe(false);
    expect(
      agentSettingsSchema.safeParse({
        ...AGENT_SETTINGS_DEFAULTS,
        research: {
          enabled: true,
          searchEndpoint: 'http://localhost:8888/search',
        },
      }).success,
    ).toBe(true);
    expect(
      agentSettingsSchema.safeParse({
        ...AGENT_SETTINGS_DEFAULTS,
        research: {
          enabled: true,
          searchEndpoint: 'https://search.example.com',
        },
      }).success,
    ).toBe(true);
  });
});

interface EventCase {
  type: string;
  dataSchema: ZodType;
  valid: Data[];
  invalid: Data[];
}

const DIFF = {
  path: 'drafts/ch01.md',
  base: '',
  proposed: 'Once upon a time',
};

const EVENT_CASES: EventCase[] = [
  {
    type: 'run-started',
    dataSchema: runStartedDataSchema,
    valid: [{ runId: RUN, seq: 1 }],
    invalid: [{ runId: RUN, seq: 0 }],
  },
  {
    type: 'token-delta',
    dataSchema: tokenDeltaDataSchema,
    valid: [
      { runId: RUN, seq: 2, text: 'Hello' },
      { runId: RUN, seq: 3, text: '' },
    ],
    invalid: [{ runId: RUN, seq: 4, text: 42 }],
  },
  {
    type: 'tool-call-started',
    dataSchema: toolCallStartedDataSchema,
    valid: [
      {
        runId: RUN,
        seq: 3,
        callId: 'call-1',
        name: 'list_files',
        family: 'project',
      },
    ],
    invalid: [
      {
        runId: RUN,
        seq: 3,
        callId: 'call-1',
        name: 'list_files',
        family: 'web',
      },
    ],
  },
  {
    type: 'tool-call-args',
    dataSchema: toolCallArgsDataSchema,
    valid: [
      {
        runId: RUN,
        seq: 4,
        callId: 'call-1',
        arguments: { path: 'sources/outline.md' },
        valid: true,
      },
      {
        runId: RUN,
        seq: 4,
        callId: 'call-1',
        arguments: '{"path":',
        valid: false,
      },
    ],
    invalid: [
      {
        runId: RUN,
        seq: 4,
        callId: 'call-1',
        arguments: {},
        valid: 'yes',
      },
    ],
  },
  {
    type: 'tool-call-result',
    dataSchema: toolCallResultDataSchema,
    valid: [
      {
        runId: RUN,
        seq: 5,
        callId: 'call-1',
        summary: 'Wrote the draft',
        output: NARRATIVE_OUTPUT,
        diffPreview: DIFF,
        sourcesUsed: ['ann'],
        provenance: PROVENANCE,
      },
      {
        runId: RUN,
        seq: 5,
        callId: 'call-1',
        summary: 'Read one file',
        output: STRING_OUTPUT,
      },
      {
        runId: RUN,
        seq: 5,
        callId: 'call-1',
        summary: 'Listed one file',
        output: LIST_OUTPUT,
      },
      {
        runId: RUN,
        seq: 5,
        callId: 'call-1',
        summary: 'Done',
      },
    ],
    invalid: [
      {
        runId: RUN,
        seq: 5,
        callId: 'call-1',
        summary: 'Wrote the draft',
        diffPreview: { path: 'drafts/ch01.md', base: '' },
      },
      {
        runId: RUN,
        seq: 5,
        callId: 'call-1',
        summary: 42,
      },
    ],
  },
  {
    type: 'tool-call-error',
    dataSchema: toolCallErrorDataSchema,
    valid: [
      {
        runId: RUN,
        seq: 6,
        callId: 'call-1',
        message: 'Arguments were not valid JSON',
        attempt: 3,
        withdrawn: true,
      },
    ],
    invalid: [
      {
        runId: RUN,
        seq: 6,
        callId: 'call-1',
        message: 'Arguments were not valid JSON',
        attempt: 0,
      },
      {
        runId: RUN,
        seq: 6,
        callId: 'call-1',
        message: 42,
        attempt: 1,
      },
    ],
  },
  {
    type: 'grounding-started',
    dataSchema: groundingStartedDataSchema,
    valid: [{ runId: RUN, seq: 7, targetPath: 'drafts/ch01.md' }],
    invalid: [{ runId: RUN, seq: 7 }],
  },
  {
    type: 'grounding-result',
    dataSchema: groundingResultDataSchema,
    valid: [{ ...groundingResult, seq: 8 }],
    invalid: [{ ...groundingResult, seq: 8, contentHash: 'abc' }],
  },
  {
    type: 'step-cap-reached',
    dataSchema: stepCapReachedDataSchema,
    valid: [{ runId: RUN, seq: 9, step: 12, cap: 12 }],
    invalid: [{ runId: RUN, seq: 9, step: 12, cap: 0 }],
  },
  {
    type: 'run-ended',
    dataSchema: runEndedDataSchema,
    valid: [
      { runId: RUN, seq: 10, reason: 'capped', pendingChangeIds: ['pc-1'] },
      { runId: RUN, seq: 10, reason: 'completed', pendingChangeIds: [] },
    ],
    invalid: [
      { runId: RUN, seq: 10, reason: 'finished', pendingChangeIds: [] },
      {
        runId: RUN,
        seq: 10,
        reason: 'error',
        message: 42,
        pendingChangeIds: [],
      },
    ],
  },
];

describe('C2: each event schema parses one valid example and refuses one invalid example', () => {
  for (const c of EVENT_CASES) {
    it(`C2: ${c.type}`, () => {
      for (const data of c.valid) {
        expect(
          agentLoopEventSchema.safeParse(envelope(c.type, data)).success,
          c.type,
        ).toBe(true);
        expect(c.dataSchema.safeParse(data).success, c.type).toBe(true);
      }
      for (const data of c.invalid) {
        expect(
          agentLoopEventSchema.safeParse(envelope(c.type, data)).success,
          c.type,
        ).toBe(false);
        expect(c.dataSchema.safeParse(data).success, c.type).toBe(false);
      }
    });
  }

  it('C2: the four output values of a tool-call result are accepted by agentCardSchema too', () => {
    const outputs: unknown[] = [NARRATIVE_OUTPUT, STRING_OUTPUT, LIST_OUTPUT];
    for (const output of outputs) {
      const card = {
        callId: 'call-1',
        name: 'read_file',
        family: 'project',
        status: 'done',
        output,
      };
      expect(agentCardSchema.safeParse(card).success).toBe(true);
    }
    const noOutput = {
      callId: 'call-1',
      name: 'read_file',
      family: 'project',
      status: 'done',
    };
    expect(agentCardSchema.safeParse(noOutput).success).toBe(true);
  });

  const ALL_VALID = EVENT_CASES.flatMap((c) =>
    c.valid.map((data) => ({ type: c.type, data })),
  );

  it('C2 union: deleting runId refuses every valid example', () => {
    for (const { type, data } of ALL_VALID) {
      expect(
        agentLoopEventSchema.safeParse(envelope(type, without(data, 'runId')))
          .success,
        type,
      ).toBe(false);
    }
  });

  it('C2 union: deleting seq refuses every valid example', () => {
    for (const { type, data } of ALL_VALID) {
      expect(
        agentLoopEventSchema.safeParse(envelope(type, without(data, 'seq')))
          .success,
        type,
      ).toBe(false);
    }
  });

  it('C2 union: module platform and type node-status are refused', () => {
    const sample = ALL_VALID[0];
    expect(
      agentLoopEventSchema.safeParse({
        ...envelope(sample.type, sample.data),
        module: 'platform',
      }).success,
    ).toBe(false);
    expect(
      agentLoopEventSchema.safeParse({
        ...envelope(sample.type, sample.data),
        type: 'node-status',
      }).success,
    ).toBe(false);
  });

  it('C2 union: an envelope with no data key is refused', () => {
    expect(
      agentLoopEventSchema.safeParse({
        module: 'agent-loop',
        type: 'token-delta',
      }).success,
    ).toBe(false);
  });
});

describe('E1: enums, constants and path rules', () => {
  it('the enums and constants hold the unit values, and each enum schema has its tuple as options', () => {
    expect(AGENT_TOOL_FAMILIES).toEqual([
      'project',
      'narrative',
      'research',
      'compile',
      'grounding',
    ]);
    expect(AGENT_RUN_END_REASONS).toEqual([
      'completed',
      'stopped',
      'capped',
      'error',
      'project-switched',
    ]);
    expect(GROUNDING_VERDICTS).toEqual(['supported', 'weak', 'unsupported']);
    expect(AGENT_TRANSCRIPT_KINDS).toEqual([
      'intent',
      'step',
      'assistant-text',
      'tool-call',
      'tool-result',
      'tool-error',
      'grounding',
      'pending-change',
      'run-end',
    ]);
    expect(AGENT_RUN_STATUSES).toEqual(['running', 'ended']);
    expect(AGENT_CARD_STATUSES).toEqual(['running', 'done', 'error']);
    expect(AGENT_RESERVED_TOOL_NAMES).toEqual([
      'list_files',
      'read_file',
      'write_file',
      'edit_file',
      'search_notes',
      'check_grounding',
      'web_search',
      'fetch_page',
      'assemble_manuscript',
      'run_preflight',
      'export_manuscript',
    ]);
    for (const name of AGENT_RESERVED_TOOL_NAMES) {
      expect(name).toMatch(/^[a-z][a-z0-9_]{0,63}$/);
    }
    expect(AGENT_DEFAULT_STEP_CAP).toBe(12);
    expect(GROUNDING_RESULT_SCHEMA_VERSION).toBe(1);
    expect(AGENT_TRANSCRIPT_SCHEMA_VERSION).toBe(1);

    expect(agentToolFamilySchema.options).toEqual(AGENT_TOOL_FAMILIES);
    expect(agentRunEndReasonSchema.options).toEqual(AGENT_RUN_END_REASONS);
    expect(agentReservedToolNameSchema.options).toEqual(
      AGENT_RESERVED_TOOL_NAMES,
    );
    expect(agentRunStatusSchema.options).toEqual(AGENT_RUN_STATUSES);
    expect(agentCardStatusSchema.options).toEqual(AGENT_CARD_STATUSES);
    expect(agentTranscriptKindSchema.options).toEqual(AGENT_TRANSCRIPT_KINDS);
    expect(groundingVerdictSchema.options).toEqual(GROUNDING_VERDICTS);

    expect(agentToolFamilySchema.safeParse('web').success).toBe(false);
    expect(agentRunEndReasonSchema.safeParse('finished').success).toBe(false);
    expect(agentReservedToolNameSchema.safeParse('ls').success).toBe(false);
    expect(agentRunStatusSchema.safeParse('paused').success).toBe(false);
    expect(agentCardStatusSchema.safeParse('pending').success).toBe(false);
    expect(agentTranscriptKindSchema.safeParse('note').success).toBe(false);
    expect(groundingVerdictSchema.safeParse('maybe').success).toBe(false);
  });

  it('the path rules build and match the listed paths', () => {
    expect(GROUNDING_ARTEFACT_PATH_PREFIX).toBe('logs/grounding/');
    expect(GROUNDING_ARTEFACT_PATH_SUFFIX).toBe('.json');
    const built =
      GROUNDING_ARTEFACT_PATH_PREFIX +
      'drafts/ch01.md' +
      GROUNDING_ARTEFACT_PATH_SUFFIX;
    expect(built).toBe('logs/grounding/drafts/ch01.md.json');
    expect(GROUNDING_ARTEFACT_PATH_PATTERN.test(built)).toBe(true);
    expect(GROUNDING_ARTEFACT_PATH_TEMPLATE).toBe(
      'logs/grounding/<targetPath>.json',
    );
    expect(AGENT_TRANSCRIPT_PATH_TEMPLATE).toBe(
      'logs/agent-runs/<yyyymmddThhmmssZ>-<runId>.jsonl',
    );
    expect(
      GROUNDING_ARTEFACT_PATH_PATTERN.test('logs/grounding/drafts/ch01.md'),
    ).toBe(false);
    expect(GROUNDING_ARTEFACT_PATH_PATTERN.test('logs/other/x.json')).toBe(
      false,
    );
    expect(GROUNDING_ARTEFACT_PATH_PATTERN.test('logs/grounding/.json')).toBe(
      false,
    );
    expect(
      AGENT_TRANSCRIPT_PATH_PATTERN.test(
        'logs/agent-runs/20261114T093000Z-run-1.jsonl',
      ),
    ).toBe(true);
    expect(
      AGENT_TRANSCRIPT_PATH_PATTERN.test(
        'logs/agent-runs/2026-11-14-run-1.jsonl',
      ),
    ).toBe(false);
    expect(
      AGENT_TRANSCRIPT_PATH_PATTERN.test(
        'logs/agent-runs/20261114T093000Z-.jsonl',
      ),
    ).toBe(false);
    expect(
      AGENT_TRANSCRIPT_PATH_PATTERN.test(
        'logs/agent-runs/x/20261114T093000Z-r.jsonl',
      ),
    ).toBe(false);
  });

  it('the event type union is the ten type names', () => {
    expectTypeOf<AgentLoopEvent['type']>().toEqualTypeOf<
      | 'run-started'
      | 'token-delta'
      | 'tool-call-started'
      | 'tool-call-args'
      | 'tool-call-result'
      | 'tool-call-error'
      | 'grounding-started'
      | 'grounding-result'
      | 'step-cap-reached'
      | 'run-ended'
    >();
  });

  it('the base event schema and the id schemas are exported', () => {
    expect(agentEventBaseSchema.safeParse({ runId: RUN, seq: 1 }).success).toBe(
      true,
    );
    expect(agentRunIdSchema.safeParse('').success).toBe(false);
    expect(agentConversationIdSchema.safeParse('conv-1').success).toBe(true);
    expect(toolCallIdSchema.safeParse('').success).toBe(false);
    expect(agentSeqSchema.safeParse(0).success).toBe(false);
  });
});

describe('E2: the grounding summary and the Project store field, the provenance, and the hash', () => {
  it('the grounding summary parses like pendingGroundingSchema, and the two types are equal', () => {
    const samples: unknown[] = [
      SUMMARY,
      { ...SUMMARY, supported: -1 },
      { ...SUMMARY, weak: 1.5 },
      { supported: 1, weak: 0, unsupported: 0 },
    ];
    for (const sample of samples) {
      expect(groundingSummarySchema.safeParse(sample).success).toBe(
        pendingGroundingSchema.safeParse(sample).success,
      );
    }
    expectTypeOf<GroundingSummary>().toEqualTypeOf<PendingGrounding>();
  });

  it('a pending change keeps its draft provenance through parse, and its grounding summary', () => {
    const change = {
      id: 'pc-1',
      projectId: 'novel',
      targetPath: 'drafts/ch01.md',
      kind: 'modify',
      diff: '',
      capturedBase: { hash: HASH, content: 'Old text.' },
      proposed: 'New text.',
      origin: { kind: 'agent-run', runId: RUN, toolCallId: 'call-1' },
      provenance: PROVENANCE,
      grounding: SUMMARY,
      status: 'pending',
      conflict: null,
      createdAt: AT,
      updatedAt: AT,
    };
    const parsed = pendingChangeSchema.safeParse(change);
    expect(parsed.success).toBe(true);
    expect(parsed.data?.provenance).toEqual(
      expect.objectContaining({
        entityIds: ['ann'],
        sourcesUsed: ['ann'],
      }),
    );
    expect(parsed.data?.grounding).toEqual(SUMMARY);
  });

  it('the result hash accepts exactly the values the Project store accepts', () => {
    const candidates = [HASH, 'abc', `sha256:${'A'.repeat(64)}`];
    for (const candidate of candidates) {
      expect(
        groundingResultSchema.safeParse({
          ...groundingResult,
          contentHash: candidate,
        }).success,
      ).toBe(contentHashSchema.safeParse(candidate).success);
    }
    expect(contentHashSchema.safeParse(HASH).success).toBe(true);
    expect(entityRefSchema.safeParse('ann').success).toBe(true);
  });
});

describe('E3: error codes, status table and routes', () => {
  it('every code passes errorCodeSchema, and the status table covers exactly the four codes with no 401', () => {
    for (const code of Object.values(AGENT_ERROR_CODES)) {
      expect(errorCodeSchema.safeParse(code).success, code).toBe(true);
      expect(agentErrorCodeSchema.safeParse(code).success, code).toBe(true);
    }
    expect(AGENT_ERROR_CODE_VALUES).toEqual(Object.values(AGENT_ERROR_CODES));
    expect(AGENT_ERROR_CODE_VALUES).toHaveLength(4);

    expect(Object.keys(AGENT_ERROR_STATUS).sort()).toEqual([
      'AGENT_NO_ACTIVE_PROJECT',
      'AGENT_NO_PROVIDER',
      'AGENT_RUN_ACTIVE',
      'AGENT_RUN_NOT_FOUND',
    ]);
    expect(AGENT_ERROR_STATUS.AGENT_RUN_ACTIVE).toBe(409);
    expect(AGENT_ERROR_STATUS.AGENT_NO_PROVIDER).toBe(409);
    expect(AGENT_ERROR_STATUS.AGENT_NO_ACTIVE_PROJECT).toBe(409);
    expect(AGENT_ERROR_STATUS.AGENT_RUN_NOT_FOUND).toBe(404);
    expect(Object.values(AGENT_ERROR_STATUS)).not.toContain(401);
  });

  it('every route is under /api/agent-loop/, and the conversation route takes :conversationId', () => {
    const routes = [
      AGENT_RUNS_ROUTE,
      AGENT_RUN_STOP_ROUTE,
      AGENT_RUN_CURRENT_ROUTE,
      AGENT_CONVERSATIONS_ROUTE,
      AGENT_CONVERSATION_ROUTE,
      AGENT_GROUNDING_ROUTE,
      AGENT_SETTINGS_ROUTE,
    ];
    expect(routes).toHaveLength(7);
    for (const route of routes) {
      expect(route.startsWith('/api/agent-loop/'), route).toBe(true);
    }
    expect(AGENT_CONVERSATION_ROUTE).toContain(':conversationId');
  });
});

describe('E4: the settings section keeps unknown keys, and the update body takes any subset', () => {
  it('the section keeps unknown keys at both levels and refuses a research object without enabled', () => {
    const parsed = agentSettingsSchema.parse({
      ...AGENT_SETTINGS_DEFAULTS,
      extraTop: 'kept',
      research: { enabled: false, extraResearch: 'kept' },
    });
    expect(parsed).toEqual(
      expect.objectContaining({
        extraTop: 'kept',
        research: expect.objectContaining({ extraResearch: 'kept' }),
      }),
    );
    expect(agentSettingsSchema.safeParse(AGENT_SETTINGS_DEFAULTS).success).toBe(
      true,
    );
    expect(
      agentSettingsSchema.safeParse({
        ...AGENT_SETTINGS_DEFAULTS,
        research: { searchEndpoint: 'http://localhost:8888/search' },
      }).success,
    ).toBe(false);
  });

  it('the update body accepts any subset, research included, and refuses bad values', () => {
    expect(agentSettingsUpdateSchema.safeParse({}).success).toBe(true);
    expect(agentSettingsUpdateSchema.safeParse({ stepCap: 20 }).success).toBe(
      true,
    );
    expect(
      agentSettingsUpdateSchema.safeParse({ research: { enabled: true } })
        .success,
    ).toBe(true);
    expect(
      agentSettingsUpdateSchema.safeParse({
        research: { searchEndpoint: 'http://localhost:8888/search' },
      }).success,
    ).toBe(true);
    expect(agentSettingsUpdateSchema.safeParse({ stepCap: 0 }).success).toBe(
      false,
    );
    expect(
      agentSettingsUpdateSchema.safeParse({ research: { enabled: 'yes' } })
        .success,
    ).toBe(false);
    expect(
      agentSettingsUpdateSchema.safeParse({
        research: { searchEndpoint: 'javascript:alert(1)' },
      }).success,
    ).toBe(false);
  });
});
