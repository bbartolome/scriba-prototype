import { createServer } from 'node:http';
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const DEFAULT_SCENARIOS_DIR = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  'scenarios',
);
const DEFAULT_MODEL = 'mock-model';
const CHUNK_ID = 'chatcmpl-mock';
const CHUNK_OBJECT = 'chat.completion.chunk';
const COMPLETION_OBJECT = 'chat.completion';
const CREATED = 1700000000;
const REPLY_KINDS = new Set(['stream', 'toolCalls', 'status', 'drop']);

export async function startMockOpenAI(options = {}) {
  const scenarios = loadScenarios(
    options.scenariosDir ?? DEFAULT_SCENARIOS_DIR,
  );
  const server = createServer((req, res) => {
    handleRequest(req, res, scenarios).catch((error) => {
      if (res.headersSent) {
        res.destroy();
      } else {
        sendJson(res, 500, { error: String(error?.message ?? error) });
      }
    });
  });

  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      server.off('error', reject);
      resolve();
    });
  });

  const { port } = server.address();
  return {
    baseUrl: `http://127.0.0.1:${port}`,
    close() {
      return new Promise((resolve, reject) => {
        server.closeAllConnections();
        server.close((error) => (error ? reject(error) : resolve()));
      });
    },
  };
}

function loadScenarios(dir) {
  const scenarios = new Map();
  const files = readdirSync(dir)
    .filter((name) => name.endsWith('.json'))
    .sort();
  for (const file of files) {
    const text = readFileSync(path.join(dir, file), 'utf8');
    let data;
    try {
      data = JSON.parse(text);
    } catch (error) {
      throw new Error(
        `mock OpenAI: ${file} is not valid JSON (${error.message})`,
      );
    }
    if (!data || !Array.isArray(data.steps)) {
      throw new Error(`mock OpenAI: ${file} needs a "steps" array`);
    }
    data.steps.forEach((step, index) => {
      const kind = step?.reply?.kind;
      if (!REPLY_KINDS.has(kind)) {
        throw new Error(
          `mock OpenAI: ${file} step ${index} has an unknown reply kind ${JSON.stringify(kind)}`,
        );
      }
    });
    scenarios.set(file.slice(0, -'.json'.length), {
      steps: data.steps,
      records: [],
      attempts: { chat: 0, models: 0 },
    });
  }
  return scenarios;
}

function messagesOf(body) {
  return Array.isArray(body?.messages) ? body.messages : [];
}

function textOf(message) {
  const content = message?.content;
  if (typeof content === 'string') {
    return content;
  }
  if (Array.isArray(content)) {
    return content
      .map((part) => (typeof part?.text === 'string' ? part.text : ''))
      .join('');
  }
  return '';
}

function matcherHolds(name, expected, request) {
  const isChat = request.endpoint === 'chat';
  const messages = messagesOf(request.body);
  const last = messages[messages.length - 1];
  switch (name) {
    case 'endpoint':
      return request.endpoint === expected;
    case 'attempt':
      return request.attempt === expected;
    case 'header': {
      const field = String(expected?.name ?? '').toLowerCase();
      const actual = request.headers[field];
      return actual !== undefined && actual === expected?.value;
    }
    case 'turnIndex':
      return (
        isChat &&
        messages.filter((m) => m?.role === 'assistant').length === expected
      );
    case 'lastMessageRole':
      return isChat && last?.role === expected;
    case 'lastMessageContent':
      return isChat && textOf(last).includes(expected);
    case 'toolResultPresent':
      return isChat && messages.some((m) => m?.role === 'tool') === expected;
    default:
      return false;
  }
}

function findStepIndex(steps, request) {
  return steps.findIndex((step) =>
    Object.entries(step.match ?? {}).every(([name, expected]) =>
      matcherHolds(name, expected, request),
    ),
  );
}

function createCancelScope() {
  const pending = new Set();
  let cancelled = false;
  return {
    isCancelled: () => cancelled,
    wait(ms) {
      return new Promise((resolve) => {
        if (cancelled) {
          resolve();
          return;
        }
        let timer = null;
        const finish = () => {
          clearTimeout(timer);
          pending.delete(finish);
          resolve();
        };
        pending.add(finish);
        timer = setTimeout(finish, ms);
      });
    },
    cancel() {
      cancelled = true;
      for (const finish of [...pending]) {
        finish();
      }
    },
  };
}

function readBody(req) {
  return new Promise((resolve) => {
    const chunks = [];
    const finish = () => resolve(Buffer.concat(chunks).toString('utf8'));
    req.on('data', (chunk) => chunks.push(chunk));
    req.once('end', finish);
    req.once('close', finish);
    req.once('error', finish);
  });
}

function parseBody(raw) {
  try {
    return JSON.parse(raw);
  } catch {
    return raw;
  }
}

function sendJson(res, status, body) {
  res.writeHead(status, { 'content-type': 'application/json' });
  res.end(JSON.stringify(body));
}

function unknownScenario(req, res) {
  req.resume();
  sendJson(res, 404, { error: 'unknown scenario' });
}

async function handleRequest(req, res, scenarios) {
  const { pathname } = new URL(req.url ?? '/', 'http://127.0.0.1');
  const turn = { record: null, dropped: false };
  const scope = createCancelScope();
  res.on('close', () => {
    if (turn.record && !res.writableEnded && !turn.dropped) {
      turn.record.closedByClient = true;
    }
    scope.cancel();
  });

  const chat = /^\/scenario\/([^/]+)\/v1\/chat\/completions$/.exec(pathname);
  if (chat && req.method === 'POST') {
    return serveScenario(
      req,
      res,
      scenarios,
      chat[1],
      'chat',
      pathname,
      turn,
      scope,
    );
  }

  const models = /^\/scenario\/([^/]+)\/v1\/models$/.exec(pathname);
  if (models && req.method === 'GET') {
    return serveScenario(
      req,
      res,
      scenarios,
      models[1],
      'models',
      pathname,
      turn,
      scope,
    );
  }

  const requests = /^\/__mock\/scenarios\/([^/]+)\/requests$/.exec(pathname);
  if (requests && req.method === 'GET') {
    const scenario = scenarios.get(requests[1]);
    if (!scenario) {
      return unknownScenario(req, res);
    }
    return sendJson(res, 200, scenario.records);
  }

  const reset = /^\/__mock\/scenarios\/([^/]+)\/reset$/.exec(pathname);
  if (reset && req.method === 'POST') {
    const scenario = scenarios.get(reset[1]);
    if (!scenario) {
      return unknownScenario(req, res);
    }
    scenario.records = [];
    scenario.attempts = { chat: 0, models: 0 };
    res.writeHead(204);
    return res.end();
  }

  req.resume();
  return sendJson(res, 404, { error: 'not found' });
}

async function serveScenario(
  req,
  res,
  scenarios,
  name,
  endpoint,
  pathname,
  turn,
  scope,
) {
  const scenario = scenarios.get(name);
  if (!scenario) {
    return unknownScenario(req, res);
  }

  const body = parseBody(await readBody(req));
  if (scope.isCancelled()) {
    return;
  }

  scenario.attempts[endpoint] += 1;
  const request = {
    endpoint,
    attempt: scenario.attempts[endpoint],
    headers: req.headers,
    body,
  };
  const stepIndex = findStepIndex(scenario.steps, request);
  const record = {
    attempt: request.attempt,
    endpoint,
    method: req.method,
    path: pathname,
    headers: { ...req.headers },
    body,
    step: stepIndex === -1 ? null : stepIndex,
    closedByClient: false,
  };
  scenario.records.push(record);
  turn.record = record;

  if (stepIndex === -1) {
    return sendJson(res, 500, { error: 'no scenario step matches' });
  }

  const step = scenario.steps[stepIndex];
  if (step.delayMs) {
    await scope.wait(step.delayMs);
  }
  if (scope.isCancelled()) {
    return;
  }
  return renderReply(req, res, step.reply, request, turn, scope);
}

async function renderReply(req, res, reply, request, turn, scope) {
  switch (reply.kind) {
    case 'status':
      return sendStatus(res, reply);
    case 'drop':
      turn.dropped = true;
      return req.socket.destroy();
    default:
      break;
  }

  if (request.endpoint !== 'chat') {
    return sendJson(res, 500, {
      error: `reply kind ${reply.kind} needs a chat request`,
    });
  }
  const model =
    typeof request.body?.model === 'string'
      ? request.body.model
      : DEFAULT_MODEL;
  if (request.body?.stream === true) {
    const items =
      reply.kind === 'stream' ? streamItems(reply) : toolCallItems(reply);
    return streamReply(res, items, model, scope);
  }
  return sendJson(res, 200, completion(reply, model));
}

function sendStatus(res, reply) {
  res.writeHead(reply.status, {
    'content-type': 'application/json',
    ...(reply.headers ?? {}),
  });
  res.end(reply.body === undefined ? '' : JSON.stringify(reply.body));
}

function callId(call, index) {
  return call.id ?? `call_mock_${index}`;
}

function streamItems(reply) {
  const deltas = reply.deltas ?? [];
  const items =
    deltas.length === 0
      ? [{ delta: {} }]
      : deltas.map((content) => ({
          delta: { content },
          waitMs: reply.chunkDelayMs ?? 0,
        }));
  items.push({ delta: {}, finish: 'stop' });
  return items;
}

function toolCallItems(reply) {
  const items = (reply.deltas ?? []).map((content) => ({ delta: { content } }));
  (reply.calls ?? []).forEach((call, index) => {
    items.push({
      delta: {
        tool_calls: [
          {
            index,
            id: callId(call, index),
            type: 'function',
            function: { name: call.name, arguments: '' },
          },
        ],
      },
    });
    for (const fragment of call.argumentChunks ?? []) {
      items.push({
        delta: { tool_calls: [{ index, function: { arguments: fragment } }] },
      });
    }
  });
  items.push({ delta: {}, finish: 'tool_calls' });
  return items;
}

function chunk(model, delta, finishReason) {
  return {
    id: CHUNK_ID,
    object: CHUNK_OBJECT,
    created: CREATED,
    model,
    choices: [{ index: 0, delta, finish_reason: finishReason }],
  };
}

async function streamReply(res, items, model, scope) {
  res.writeHead(200, {
    'content-type': 'text/event-stream',
    'cache-control': 'no-cache',
  });
  let first = true;
  for (const item of items) {
    if (item.waitMs) {
      await scope.wait(item.waitMs);
    }
    if (scope.isCancelled()) {
      return;
    }
    const delta = first ? { role: 'assistant', ...item.delta } : item.delta;
    first = false;
    res.write(
      `data: ${JSON.stringify(chunk(model, delta, item.finish ?? null))}\n\n`,
    );
  }
  if (scope.isCancelled()) {
    return;
  }
  res.write('data: [DONE]\n\n');
  res.end();
}

function completion(reply, model) {
  const deltas = reply.deltas ?? [];
  const message = {
    role: 'assistant',
    content: deltas.length === 0 ? null : deltas.join(''),
  };
  let finishReason = 'stop';
  if (reply.kind === 'toolCalls') {
    finishReason = 'tool_calls';
    const calls = reply.calls ?? [];
    if (calls.length > 0) {
      message.tool_calls = calls.map((call, index) => ({
        id: callId(call, index),
        type: 'function',
        function: {
          name: call.name,
          arguments: (call.argumentChunks ?? []).join(''),
        },
      }));
    }
  }
  return {
    id: CHUNK_ID,
    object: COMPLETION_OBJECT,
    created: CREATED,
    model,
    choices: [{ index: 0, message, finish_reason: finishReason }],
  };
}
