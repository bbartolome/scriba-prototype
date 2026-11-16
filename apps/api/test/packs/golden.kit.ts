import {
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
  copyFileSync,
  existsSync,
} from 'node:fs';
import { join, resolve } from 'node:path';
import { isDeepStrictEqual } from 'node:util';
import { expect } from 'vitest';
import { errorBodySchema } from '@bbartolome/scriba-contracts/platform';
import { PROVIDER_DEFAULTS } from '@bbartolome/scriba-contracts/providers';
import {
  TOOL_EXECUTE_ROUTE,
  toolCallRequestSchema,
  toolCallResultSchema,
  type ToolCallRequest,
  type ToolCallResult,
} from '@bbartolome/scriba-contracts/tool-registry';
import { createTestApp, type TestApp } from '../create-test-app';
import { send, sessionCookie, type Reply } from '../guard-request';
import { LOOPBACK_HOST, LOOPBACK_ORIGIN } from '../invariant-sweep';
import { recordsOf, startMockOpenAI } from '../providers-client.kit';
import { makeLibrary } from '../settings.kit';
import { stringify } from 'yaml';

// The real packs root: this folder sits in apps/api/test/packs, so the root is four levels up.
export const PACKS_ROOT = resolve(
  __dirname,
  '..',
  '..',
  '..',
  '..',
  'packages',
  'packs',
);
export const GOLDEN_ROOT = join(PACKS_ROOT, 'test', 'golden');
// Set by the vitest config from `--update-goldens` (see apps/api/vitest.config.mts).
export const UPDATE_GOLDENS = process.env.SCRIBA_UPDATE_GOLDENS === '1';

// The terms that packs/test/README.md must state (AC 2). Kept here, not in the test file, because the
// examples-check rule forbids a unit test from naming the examples/ folder.
export const README_TERMS = [
  'goldenCase',
  'golden.kit.ts',
  'apps/api/test/packs/',
  '--update-goldens',
  'pack-<tool>.json',
  'golden/<tool>/',
  '.fixture.json',
  '.golden.json',
  'SCRIBA_PACKS_DIR',
  'invalidWithout',
  'TOOL_ARGS_INVALID',
  'toolCatalog',
  '.scriba/packs/user/tools',
  'examples/',
  'same PR',
];

export type GoldenStatus = 'match' | 'differs' | 'missing' | 'written';
export type OutputKind = ToolCallResult['output']['kind'];

export interface GoldenRequest {
  messages: unknown[];
  tools?: unknown[];
}

export interface GoldenRunOptions {
  tool: string;
  name: string;
  expect: { kind: OutputKind; sourcesUsed: string[] };
  invalidWithout: string;
  userTool?: string;
  goldenDir?: string;
  update?: boolean;
}

export interface GoldenRunResult {
  kind: OutputKind;
  content: string;
  sourcesUsed: string[];
  golden: GoldenStatus;
  request: GoldenRequest;
  invalid: { status: number; code: string | undefined; message: string };
  modelCalls: number;
}

export interface GoldenCaseOptions {
  tool: string;
  name: string;
  expect: { kind: OutputKind; sourcesUsed: string[] };
  invalidWithout: string;
  userTool?: string;
  check?: (result: GoldenRunResult) => void | Promise<void>;
}

const LOOPBACK = { host: LOOPBACK_HOST, origin: LOOPBACK_ORIGIN };

function post(
  app: TestApp,
  cookie: string,
  path: string,
  body: unknown,
): Promise<Reply> {
  return send(app.baseUrl, {
    ...LOOPBACK,
    cookie,
    method: 'POST',
    path,
    body: JSON.stringify(body),
  });
}

// The request the mock recorded, as a golden holds it: the messages, and the tools when the request has them.
function requestOf(body: unknown): GoldenRequest {
  const record = (body ?? {}) as { messages?: unknown[]; tools?: unknown[] };
  const request: GoldenRequest = { messages: record.messages ?? [] };
  if (record.tools !== undefined) request.tools = record.tools;
  return request;
}

// Runs one golden case: the fixture on the composed app, the mock's recorded request against the golden,
// and the invalid call (the fixture without `invalidWithout`). The app, the mock and the library are closed on every path.
export async function runGoldenCase(
  options: GoldenRunOptions,
): Promise<GoldenRunResult> {
  const goldenDir = options.goldenDir ?? join(GOLDEN_ROOT, options.tool);
  const update = options.update ?? UPDATE_GOLDENS;
  const fixture: ToolCallRequest = toolCallRequestSchema.parse(
    JSON.parse(
      readFileSync(join(goldenDir, `${options.name}.fixture.json`), 'utf8'),
    ),
  );
  if (!(options.invalidWithout in fixture.arguments)) {
    throw new Error(
      `fixture ${options.name} has no argument ${options.invalidWithout}`,
    );
  }

  const scenario = `pack-${options.tool}`;
  const mock = await startMockOpenAI();
  const library = makeLibrary(
    stringify({
      schemaVersion: 1,
      providers: {
        schemaVersion: 1,
        list: [
          {
            id: 'mock',
            kind: 'openai-compatible',
            baseURL: `${mock.baseUrl}/scenario/${scenario}/v1`,
            model: 'mock-model',
            ...PROVIDER_DEFAULTS,
          },
        ],
        appDefault: { providerId: 'mock', model: 'mock-model' },
      },
    }),
  );
  let app: TestApp | undefined;
  try {
    if (options.userTool !== undefined) {
      const toolsDir = join(library, '.scriba', 'packs', 'user', 'tools');
      mkdirSync(toolsDir, { recursive: true });
      copyFileSync(options.userTool, join(toolsDir, `${options.tool}.yaml`));
    }
    app = await createTestApp({
      libraryDir: library,
      env: { SCRIBA_PACKS_DIR: PACKS_ROOT },
    });
    const cookie = await sessionCookie(app, library);
    const path = TOOL_EXECUTE_ROUTE.replace(':name', options.tool);

    const reply = await post(app, cookie, path, fixture);
    expect(reply.status, reply.body).toBe(200);
    const result = toolCallResultSchema.parse(
      JSON.parse(reply.body) as unknown,
    );

    const records = await recordsOf(mock, scenario);
    expect(records).toHaveLength(1);
    const request = requestOf(records[0].body);

    const goldenFile = join(goldenDir, `${options.name}.golden.json`);
    let golden: GoldenStatus;
    if (update) {
      mkdirSync(goldenDir, { recursive: true });
      writeFileSync(goldenFile, `${JSON.stringify(request, null, 2)}\n`);
      golden = 'written';
    } else if (!existsSync(goldenFile)) {
      golden = 'missing';
    } else {
      golden = isDeepStrictEqual(
        JSON.parse(readFileSync(goldenFile, 'utf8')),
        request,
      )
        ? 'match'
        : 'differs';
    }

    const invalidArguments = Object.fromEntries(
      Object.entries(fixture.arguments).filter(
        ([key]) => key !== options.invalidWithout,
      ),
    );
    const invalidReply = await post(app, cookie, path, {
      arguments: invalidArguments,
      entities: fixture.entities,
    });
    const error = errorBodySchema.parse(
      JSON.parse(invalidReply.body) as unknown,
    ).error;
    const modelCalls = (await recordsOf(mock, scenario)).length;

    return {
      kind: result.output.kind,
      content: result.output.content,
      sourcesUsed: result.sourcesUsed,
      golden,
      request,
      invalid: {
        status: invalidReply.status,
        code: error.code,
        message: error.message,
      },
      modelCalls,
    };
  } finally {
    try {
      await app?.close();
    } finally {
      await mock.close();
      rmSync(library, { recursive: true, force: true });
    }
  }
}

// The body of one `it(...)`: runs the case with the standard assertions, then the tool's own `check`.
export function goldenCase(options: GoldenCaseOptions): () => Promise<void> {
  return async () => {
    const result = await runGoldenCase({
      tool: options.tool,
      name: options.name,
      expect: options.expect,
      invalidWithout: options.invalidWithout,
      userTool: options.userTool,
    });
    expect(result.golden).toBe(UPDATE_GOLDENS ? 'written' : 'match');
    expect(result.kind).toBe(options.expect.kind);
    expect(result.sourcesUsed).toEqual(options.expect.sourcesUsed);
    expect(result.invalid.status).toBe(422);
    expect(result.invalid.code).toBe('TOOL_ARGS_INVALID');
    expect(result.invalid.message).toContain(options.invalidWithout);
    expect(result.modelCalls).toBe(1);
    await options.check?.(result);
  };
}
