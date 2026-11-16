import {
  PROJECT_ENTITY_RESOLVE_ROUTE,
  entityResolutionSchema,
  projectStoreEventSchema,
} from '@bbartolome/scriba-contracts/project-store';
import {
  AGENT_CARD_STATUSES,
  AGENT_CONVERSATION_ROUTE,
  AGENT_CONVERSATIONS_ROUTE,
  AGENT_ERROR_CODES,
  AGENT_GROUNDING_ROUTE,
  AGENT_RUN_CURRENT_ROUTE,
  AGENT_RUN_END_REASONS,
  AGENT_RUN_STATUSES,
  AGENT_RUN_STOP_ROUTE,
  AGENT_RUNS_ROUTE,
  AGENT_SETTINGS_ROUTE,
  AGENT_TOOL_FAMILIES,
  agentLoopEventSchema,
  agentRunStateSchema,
  agentSettingsSchema,
  agentStartResponseSchema,
  conversationHistorySchema,
  conversationListSchema,
} from '@bbartolome/scriba-contracts/agent-loop';
import { describe, expect, it } from 'vitest';
import {
  AGENT_CONVERSATION_PATH,
  AGENT_CONVERSATIONS_PATH,
  AGENT_GROUNDING_PATH,
  AGENT_NO_PROVIDER_CODE,
  AGENT_RUN_ACTIVE_CODE,
  AGENT_RUN_CURRENT_PATH,
  AGENT_RUN_NOT_FOUND_CODE,
  AGENT_RUN_STOP_PATH,
  AGENT_RUNS_PATH,
  AGENT_SETTINGS_PATH,
  anyReply,
  CARD_STATUS_VALUES,
  conversationHistoryReply,
  conversationListReply,
  conversationPath,
  entityResolutionReply,
  entityResolvePath,
  isChatEvent,
  isQueueEvent,
  PROJECT_ENTITY_RESOLVE_PATH,
  RUN_END_REASON_VALUES,
  RUN_STATUS_VALUES,
  runStateReply,
  settingsReply,
  startReply,
  TOOL_FAMILY_VALUES,
} from './agent-contract';

type Checkable = { safeParse(data: unknown): { success: boolean } };

/** Each valid sample passes both the guard and the contract; each invalid one fails both. */
function agreesWithContract(
  guard: Checkable,
  schema: Checkable,
  valid: readonly unknown[],
  invalid: readonly unknown[],
): void {
  for (const sample of valid) {
    expect(guard.safeParse(sample).success).toBe(true);
    expect(schema.safeParse(sample).success).toBe(true);
  }
  for (const sample of invalid) {
    expect(guard.safeParse(sample).success).toBe(false);
    expect(schema.safeParse(sample).success).toBe(false);
  }
}

const card = {
  callId: 'c1',
  name: 'read_file',
  family: 'project',
  status: 'done',
  arguments: { path: 'drafts/ch01.md' },
  valid: true,
  summary: '1 file',
  output: 'text',
};

const runState = {
  runId: 'r1',
  conversationId: 'c1',
  status: 'running',
  step: 1,
  cap: 12,
  assistantText: 'abc',
  cards: [card],
  groundingResults: [],
  pendingChangeIds: ['pc1'],
  lastSeq: 4,
};

const endedCard = { ...card, status: 'done' };

const HASH = `sha256:${'a'.repeat(64)}`;
const claim = {
  text: 'The rain began at noon.',
  span: { start: 0, end: 24 },
  verdict: 'supported',
  passage: {
    path: 'sources/outline.md',
    offset: 0,
    snippet: 'The rain began at noon.',
  },
  reason: 'Matches the outline.',
};
/** A grounding result without the event's seq (the body of grounding-result and of a run state item). */
const RESULT = {
  schemaVersion: 1,
  targetPath: 'drafts/ch01.md',
  contentHash: HASH,
  checkedAt: '2026-11-16T10:00:00Z',
  runId: 'r1',
  claims: [claim],
};

function envelope(type: string, data: unknown): unknown {
  return { module: 'agent-loop', type, data };
}

const RUN = { runId: 'r1', seq: 1 };
const CALL = { runId: 'r1', seq: 2, callId: 'c1' };

describe('agent contract copies', () => {
  it('X1 the route paths, the response guards and the event guard agree with the contract', () => {
    // Route paths and error codes.
    expect(AGENT_RUNS_PATH).toBe(AGENT_RUNS_ROUTE);
    expect(AGENT_RUN_STOP_PATH).toBe(AGENT_RUN_STOP_ROUTE);
    expect(AGENT_GROUNDING_PATH).toBe(AGENT_GROUNDING_ROUTE);
    expect(AGENT_RUN_CURRENT_PATH).toBe(AGENT_RUN_CURRENT_ROUTE);
    expect(AGENT_CONVERSATIONS_PATH).toBe(AGENT_CONVERSATIONS_ROUTE);
    expect(AGENT_CONVERSATION_PATH).toBe(AGENT_CONVERSATION_ROUTE);
    expect(AGENT_SETTINGS_PATH).toBe(AGENT_SETTINGS_ROUTE);
    expect(conversationPath('c 1/x')).toBe(
      '/api/agent-loop/conversations/c%201%2Fx',
    );
    expect(AGENT_NO_PROVIDER_CODE).toBe(AGENT_ERROR_CODES.NO_PROVIDER);
    expect(AGENT_RUN_ACTIVE_CODE).toBe(AGENT_ERROR_CODES.RUN_ACTIVE);
    expect(AGENT_RUN_NOT_FOUND_CODE).toBe(AGENT_ERROR_CODES.RUN_NOT_FOUND);

    // Enumerations.
    expect(TOOL_FAMILY_VALUES).toEqual(AGENT_TOOL_FAMILIES);
    expect(CARD_STATUS_VALUES).toEqual(AGENT_CARD_STATUSES);
    expect(RUN_STATUS_VALUES).toEqual(AGENT_RUN_STATUSES);
    expect(RUN_END_REASON_VALUES).toEqual(AGENT_RUN_END_REASONS);

    // Start reply.
    agreesWithContract(
      startReply,
      agentStartResponseSchema,
      [{ runId: 'r1', conversationId: 'c1' }],
      [
        { runId: 'r1' },
        { runId: '', conversationId: 'c1' },
        { runId: 'r1', conversationId: '' },
        null,
        'r1',
      ],
    );

    // Run state: a valid state, then each invalid one varies a checked field.
    agreesWithContract(
      runStateReply,
      agentRunStateSchema,
      [
        runState,
        { ...runState, status: 'ended', reason: 'capped', step: 12, cap: 12 },
        { ...runState, groundingResults: [] },
        { ...runState, groundingResults: [RESULT] },
      ],
      [
        { ...runState, status: 'pending' },
        { ...runState, step: -1 },
        { ...runState, cap: 0 },
        { ...runState, lastSeq: -1 },
        { ...runState, assistantText: 3 },
        { ...runState, cards: 'x' },
        { ...runState, cards: [{ ...card, status: 'pending' }] },
        { ...runState, cards: [{ ...card, family: 'other' }] },
        { ...runState, cards: [{ ...card, callId: '' }] },
        {
          ...runState,
          cards: [{ ...card, error: { message: 'm', attempt: 0 } }],
        },
        { ...runState, reason: 'paused' },
        { ...runState, pendingChangeIds: [''] },
        { ...runState, groundingResults: {} },
        {
          ...runState,
          groundingResults: [
            { ...RESULT, claims: [{ ...claim, verdict: 'maybe' }] },
          ],
        },
        { ...runState, groundingResults: [{ ...RESULT, targetPath: 3 }] },
        { ...runState, runId: '' },
        { ...runState, conversationId: undefined },
      ],
    );
    // A run state is replaced by null when no run is active.
    expect(runStateReply.safeParse(null).success).toBe(true);

    // Conversation list.
    const summary = {
      conversationId: 'c1',
      intent: 'Outline',
      updatedAt: '2026-11-15T10:00:00Z',
      turnCount: 2,
    };
    agreesWithContract(
      conversationListReply,
      conversationListSchema,
      [{ conversations: [summary] }, { conversations: [] }],
      [
        {},
        { conversations: [{ ...summary, conversationId: '' }] },
        { conversations: [{ ...summary, intent: '' }] },
        { conversations: 'x' },
      ],
    );

    // Conversation history.
    const turn = {
      runId: 'r1',
      intent: 'Outline',
      assistantText: 'Done',
      cards: [endedCard],
      endedAt: '2026-11-15T10:00:00Z',
      reason: 'completed',
    };
    const history = { conversationId: 'c1', turns: [turn] };
    agreesWithContract(
      conversationHistoryReply,
      conversationHistorySchema,
      [history],
      [
        { ...history, conversationId: '' },
        { ...history, turns: 'x' },
        { ...history, turns: [{ ...turn, reason: 'paused' }] },
        { ...history, turns: [{ ...turn, intent: '' }] },
        { ...history, turns: [{ ...turn, runId: '' }] },
        {
          ...history,
          turns: [{ ...turn, cards: [{ ...endedCard, status: 'pending' }] }],
        },
      ],
    );

    // Settings: the same guard serves GET and POST.
    const settings = {
      schemaVersion: 1,
      stepCap: 12,
      research: { enabled: false },
    };
    agreesWithContract(
      settingsReply,
      agentSettingsSchema,
      [
        settings,
        {
          schemaVersion: 1,
          stepCap: 5,
          research: { enabled: true, searchEndpoint: 'http://localhost:8888' },
        },
        {
          schemaVersion: 1,
          stepCap: 1,
          research: {
            enabled: false,
            searchEndpoint: 'https://search.example.com/q',
          },
        },
      ],
      [
        { ...settings, schemaVersion: 2 },
        { ...settings, stepCap: 0 },
        { ...settings, stepCap: 1.5 },
        { schemaVersion: 1, stepCap: 12 },
        { ...settings, research: { enabled: 'yes' } },
        {
          ...settings,
          research: {
            enabled: false,
            searchEndpoint: 'ftp://files.example.com',
          },
        },
        {
          ...settings,
          research: { enabled: false, searchEndpoint: 'not a url' },
        },
      ],
    );

    // The stop reply accepts every body.
    expect(anyReply.safeParse({}).success).toBe(true);
    expect(anyReply.safeParse(null).success).toBe(true);
  });

  it('X1b isChatEvent agrees with the contract for the ten handled types', () => {
    const valid: unknown[] = [
      envelope('run-started', RUN),
      envelope('token-delta', { ...RUN, seq: 2, text: '' }),
      envelope('tool-call-started', {
        ...CALL,
        name: 'read_file',
        family: 'project',
      }),
      envelope('tool-call-args', {
        ...CALL,
        arguments: 'raw text',
        valid: false,
      }),
      envelope('tool-call-result', {
        ...CALL,
        summary: '1 file',
        output: { kind: 'markdown', content: 'x' },
        diffPreview: { path: 'drafts/ch01.md', base: '', proposed: 'x' },
        sourcesUsed: [],
      }),
      envelope('tool-call-error', {
        ...CALL,
        message: 'File not found',
        attempt: 2,
        withdrawn: true,
      }),
      envelope('step-cap-reached', { ...RUN, step: 12, cap: 12 }),
      envelope('run-ended', {
        ...RUN,
        reason: 'completed',
        pendingChangeIds: ['pc1'],
      }),
      envelope('run-ended', {
        ...RUN,
        reason: 'stopped',
        message: 'by user',
        pendingChangeIds: [],
      }),
    ];
    const invalid: unknown[] = [
      envelope('run-started', { runId: 'r1', seq: 0 }),
      envelope('run-started', { runId: '', seq: 1 }),
      { module: 'platform', type: 'run-started', data: RUN },
      { module: 'agent-loop', type: 'run-started' },
      envelope('run-started', null),
      envelope('token-delta', { runId: 'r1', seq: 0, text: 'x' }),
      envelope('token-delta', { ...RUN, seq: 2 }),
      envelope('tool-call-started', {
        ...CALL,
        name: 'read_file',
        family: 'other',
      }),
      envelope('tool-call-started', {
        ...CALL,
        callId: '',
        name: 'read_file',
        family: 'project',
      }),
      envelope('tool-call-args', { ...CALL, arguments: 1 }),
      envelope('tool-call-result', { ...CALL }),
      envelope('tool-call-result', { ...CALL, summary: 'x', diffPreview: 'x' }),
      envelope('tool-call-result', { ...CALL, summary: 'x', sourcesUsed: 'x' }),
      envelope('tool-call-result', { ...CALL, summary: 'x', provenance: 'x' }),
      envelope('tool-call-error', { ...CALL, message: 'm', attempt: 0 }),
      envelope('tool-call-error', {
        ...CALL,
        message: 'm',
        attempt: 1,
        withdrawn: 'yes',
      }),
      envelope('step-cap-reached', { ...RUN, step: -1, cap: 12 }),
      envelope('step-cap-reached', { ...RUN, step: 12, cap: 0 }),
      envelope('run-ended', { ...RUN, reason: 'paused', pendingChangeIds: [] }),
      envelope('run-ended', { ...RUN, reason: 'completed' }),
      envelope('run-ended', {
        ...RUN,
        reason: 'completed',
        pendingChangeIds: [''],
      }),
      envelope('unknown-type', RUN),
    ];

    for (const sample of valid) {
      expect(isChatEvent(sample)).toBe(true);
      expect(agentLoopEventSchema.safeParse(sample).success).toBe(true);
    }
    for (const sample of invalid) {
      expect(isChatEvent(sample)).toBe(false);
      expect(agentLoopEventSchema.safeParse(sample).success).toBe(false);
    }

    // The grounding types: a valid sample passes both, and each invalid one fails both.
    const groundingStarted = (data: Record<string, unknown>): unknown =>
      envelope('grounding-started', {
        ...RUN,
        targetPath: 'drafts/ch01.md',
        ...data,
      });
    const groundingResult = (data: Record<string, unknown>): unknown =>
      envelope('grounding-result', { ...RESULT, seq: 2, ...data });
    const groundingValid: unknown[] = [
      groundingStarted({}),
      groundingResult({}),
      groundingResult({ targetPath: '' }),
    ];
    const groundingInvalid: unknown[] = [
      groundingStarted({ targetPath: 3 }),
      groundingStarted({ seq: 0 }),
      groundingResult({ targetPath: 3 }),
      groundingResult({ seq: 0 }),
      groundingResult({ claims: [{ ...claim, verdict: 'maybe' }] }),
      groundingResult({ schemaVersion: 2 }),
      groundingResult({ claims: undefined }),
    ];
    for (const sample of groundingValid) {
      expect(isChatEvent(sample)).toBe(true);
      expect(agentLoopEventSchema.safeParse(sample).success).toBe(true);
    }
    for (const sample of groundingInvalid) {
      expect(isChatEvent(sample)).toBe(false);
      expect(agentLoopEventSchema.safeParse(sample).success).toBe(false);
    }
  });

  it('Q1 isChatEvent refuses a diff preview that the contract refuses, and accepts the one it accepts', () => {
    const withPreview = (diffPreview: unknown): unknown =>
      envelope('tool-call-result', { ...CALL, summary: 'x', diffPreview });
    const valid: unknown[] = [
      withPreview({ path: 'drafts/ch01.md', base: '', proposed: 'x' }),
    ];
    const invalid: unknown[] = [
      withPreview({ path: 'drafts/ch01.md', proposed: 'x' }),
      withPreview({ path: 'drafts/ch01.md', base: null, proposed: 'x' }),
      withPreview({ path: 3, base: '', proposed: 'x' }),
    ];

    for (const sample of valid) {
      expect(isChatEvent(sample)).toBe(true);
      expect(agentLoopEventSchema.safeParse(sample).success).toBe(true);
    }
    for (const sample of invalid) {
      expect(isChatEvent(sample)).toBe(false);
      expect(agentLoopEventSchema.safeParse(sample).success).toBe(false);
    }
  });

  it('Q2 isQueueEvent agrees with the Project store event schema for the three queue events', () => {
    const change = {
      id: 'pc1',
      projectId: 'p1',
      targetPath: 'drafts/ch01.md',
      kind: 'create',
      diff: '',
      capturedBase: null,
      proposed: 'x',
      origin: { kind: 'agent-run', runId: 'r1', toolCallId: 'c1' },
      status: 'pending',
      conflict: null,
      createdAt: '2026-11-16T10:00:00Z',
      updatedAt: '2026-11-16T10:00:00Z',
    };
    const queue = (
      type: string,
      data: unknown,
      module: string = 'project-store',
    ): unknown => ({ module, type, data });
    const data = { projectId: 'p1', pendingChange: change };
    const valid: unknown[] = [
      queue('pending-created', data),
      queue('pending-updated', {
        ...data,
        pendingChange: { ...change, status: 'accepted' },
      }),
      queue('pending-resolved', {
        ...data,
        pendingChange: { ...change, status: 'rejected' },
      }),
    ];
    const invalid: unknown[] = [
      queue('pending-created', {
        ...data,
        pendingChange: { ...change, status: 'done' },
      }),
      queue('pending-created', { projectId: 'p1' }),
      queue('pending-created', data, 'agent-loop'),
    ];

    for (const sample of valid) {
      expect(isQueueEvent(sample)).toBe(true);
      expect(projectStoreEventSchema.safeParse(sample).success).toBe(true);
    }
    for (const sample of invalid) {
      expect(isQueueEvent(sample)).toBe(false);
      expect(projectStoreEventSchema.safeParse(sample).success).toBe(false);
    }
  });

  it('W2 the entity resolve path and reply guard agree with the project-store contract', () => {
    expect(PROJECT_ENTITY_RESOLVE_PATH).toBe(PROJECT_ENTITY_RESOLVE_ROUTE);
    expect(entityResolvePath('p 1/x')).toBe(
      '/api/project-store/projects/p%201%2Fx/entities/resolve',
    );

    agreesWithContract(
      entityResolutionReply,
      entityResolutionSchema,
      [
        {
          resolved: [
            {
              id: 'ada-lovelace',
              type: 'person',
              path: 'entities/ada-lovelace.md',
              content: 'Ada wrote the first program.',
            },
          ],
          errors: [],
        },
        { resolved: [], errors: [{ id: 'ghost-entity', code: 'unknown' }] },
        {
          resolved: [],
          errors: [
            {
              id: 'ada-lovelace',
              code: 'duplicate',
              paths: ['entities/a.md', 'entities/b.md'],
            },
          ],
        },
      ],
      [
        null,
        { resolved: [] },
        {
          resolved: [
            {
              id: 'ada-lovelace',
              type: 'person',
              content: 'Ada wrote the first program.',
            },
          ],
          errors: [],
        },
        { resolved: [], errors: [{ id: 'ghost-entity', code: 'missing' }] },
      ],
    );
  });
});
