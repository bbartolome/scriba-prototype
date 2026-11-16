// Manual eval of the Agent loop against a real local model (or the mock). Not part of CI. See README.md.
// Node built-ins only. Exit codes: 0 every result has no error; 1 a result has an error, or the API did not start;
// 2 usage, an invalid case file, an unknown case, or port 8080 in use.
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { createServer } from 'node:net';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { setTimeout as sleep } from 'node:timers/promises';

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, '..', '..');
const DEFAULT_BASE_URL = 'http://127.0.0.1:11434/v1';
const DEFAULT_CASES_DIR = join(here, 'cases');
const DEFAULT_REPORTS_DIR = join(repoRoot, 'eval-reports');
const API_MAIN = join(repoRoot, 'apps/api/dist/main.js');
const API_PORT = 8080;
const API_ORIGIN = `http://127.0.0.1:${API_PORT}`;
const SESSION_COOKIE = `scriba_setup_${API_PORT}`;
const SCHEMA_VERSION = 1;
const HEALTH_TIMEOUT_MS = 60_000;
const RUN_LIMIT_MS = 10 * 60_000;
const STOP_GRACE_MS = 30_000;
const KILL_AFTER_MS = 10_000;
const POLL_MS = 1000;
const CASE_ID = /^[a-z0-9][a-z0-9-]*$/;
const CASE_KEYS = ['sample', 'intent', 'expect'];
const EXPECT_KEYS = ['reason', 'tools', 'citations'];
const RUN_END_REASONS = [
  'completed',
  'stopped',
  'capped',
  'error',
  'project-switched',
];
const CITATION_MODES = ['present', 'absent', 'any'];
const USAGE =
  'usage: npm run eval:agent -- --model <name> [--model <name> ...] [--base-url <url>] [--case <id> ...] [--cases-dir <dir>] [--reports-dir <dir>]';

// Exit 2: the command line or a case file is wrong. Nothing has been created when it is thrown.
class UsageError extends Error {}
// A step of the run failed. Inside a case it becomes that result's error. Outside a case it ends the run.
class StepError extends Error {}

const isPlainObject = (value) =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

function parseOptions(argv) {
  let values;
  try {
    ({ values } = parseArgs({
      args: argv,
      options: {
        model: { type: 'string', multiple: true },
        'base-url': { type: 'string' },
        case: { type: 'string', multiple: true },
        'cases-dir': { type: 'string' },
        'reports-dir': { type: 'string' },
      },
      strict: true,
    }));
  } catch (error) {
    throw new UsageError(`${error.message}\n${USAGE}`);
  }
  const models = values.model ?? [];
  if (models.length === 0 || models.some((name) => name.trim() === '')) {
    throw new UsageError(
      `at least one non-empty --model is required\n${USAGE}`,
    );
  }
  const baseUrl = values['base-url'] ?? DEFAULT_BASE_URL;
  let protocol;
  try {
    protocol = new URL(baseUrl).protocol;
  } catch {
    protocol = undefined;
  }
  if (protocol !== 'http:' && protocol !== 'https:') {
    throw new UsageError(`--base-url must be an http or https URL\n${USAGE}`);
  }
  return {
    models,
    baseUrl,
    cases: values.case ?? [],
    casesDir: resolve(values['cases-dir'] ?? DEFAULT_CASES_DIR),
    reportsDir: resolve(values['reports-dir'] ?? DEFAULT_REPORTS_DIR),
  };
}

// Checks the keys and values of one case file, and returns the case. The message names the file.
function parseCase(raw, name) {
  const fail = (message) => {
    throw new UsageError(`${name}: ${message}`);
  };
  if (!isPlainObject(raw)) fail('a case is a JSON object');
  for (const key of Object.keys(raw)) {
    if (!CASE_KEYS.includes(key)) fail(`unknown key "${key}"`);
  }
  if (typeof raw.sample !== 'string' || raw.sample === '') {
    fail('"sample" must be a non-empty string');
  }
  if (typeof raw.intent !== 'string' || raw.intent === '') {
    fail('"intent" must be a non-empty string');
  }
  if (!isPlainObject(raw.expect)) fail('"expect" must be an object');
  const expect = raw.expect;
  for (const key of Object.keys(expect)) {
    if (!EXPECT_KEYS.includes(key)) fail(`unknown expect key "${key}"`);
  }
  if ('reason' in expect && !RUN_END_REASONS.includes(expect.reason)) {
    fail(`"expect.reason" must be one of ${RUN_END_REASONS.join(', ')}`);
  }
  if (
    'tools' in expect &&
    !(
      Array.isArray(expect.tools) &&
      expect.tools.every((tool) => typeof tool === 'string' && tool !== '')
    )
  ) {
    fail('"expect.tools" must be a list of tool names');
  }
  if ('citations' in expect && !CITATION_MODES.includes(expect.citations)) {
    fail(`"expect.citations" must be one of ${CITATION_MODES.join(', ')}`);
  }
  return { sample: raw.sample, intent: raw.intent, expect };
}

// Loads every *.json file of the cases folder. The file name without .json is the case id.
async function loadCases(casesDir, wanted) {
  let names;
  try {
    names = (await readdir(casesDir)).filter((name) => name.endsWith('.json'));
  } catch {
    throw new UsageError(`cannot read the cases folder ${casesDir}`);
  }
  names.sort();
  if (names.length === 0) {
    throw new UsageError(`no case files (*.json) in ${casesDir}`);
  }
  const cases = [];
  for (const name of names) {
    const id = name.slice(0, -'.json'.length);
    if (!CASE_ID.test(id)) {
      throw new UsageError(
        `${name}: the file name must be a case id (lowercase letters, digits and hyphens)`,
      );
    }
    let raw;
    try {
      raw = JSON.parse(await readFile(join(casesDir, name), 'utf8'));
    } catch (error) {
      throw new UsageError(`${name}: not valid JSON (${error.message})`);
    }
    cases.push({ id, ...parseCase(raw, name) });
  }
  for (const id of wanted) {
    if (!cases.some((item) => item.id === id)) {
      throw new UsageError(
        `unknown case "${id}"; the cases are ${cases.map((item) => item.id).join(', ')}`,
      );
    }
  }
  return wanted.length === 0
    ? cases
    : cases.filter((item) => wanted.includes(item.id));
}

// Refuses to run while port 8080 is held, because the API always binds it.
function assertPortFree(port) {
  return new Promise((resolvePort, reject) => {
    const probe = createServer();
    probe.once('error', () => {
      reject(
        new UsageError(
          `port ${port} is in use; stop the process that holds it, then run again`,
        ),
      );
    });
    probe.listen(port, '0.0.0.0', () => {
      probe.close(() => resolvePort());
    });
  });
}

// The UTC stamp of a report folder: yyyymmddThhmmssZ.
function stampOf(date) {
  return date
    .toISOString()
    .replace(/\.\d{3}Z$/, 'Z')
    .replace(/[-:]/g, '');
}

// Hides the token, the setup URL and the cookie in API output before the script prints it.
function redact(line) {
  return line
    .replace(/token=\S+/g, 'token=<redacted>')
    .replace(/Setup URL: \S+/g, 'Setup URL: <redacted>')
    .replace(/scriba_setup_\d+=\S+/g, '<cookie redacted>');
}

// The API gets the environment of the e2e harness. Its stdout is never read, because it prints the setup URL.
function startApi(library) {
  const child = spawn(process.execPath, [API_MAIN], {
    cwd: repoRoot,
    env: {
      PATH: process.env.PATH ?? '',
      SCRIBA_BOOKS_DIR: library,
      SCRIBA_PACKS_DIR: join(repoRoot, 'packages/packs'),
      SCRIBA_EXAMPLES_DIR: join(repoRoot, 'examples'),
    },
    stdio: ['ignore', 'ignore', 'pipe'],
  });
  child.stderrTail = [];
  child.stderr.setEncoding('utf8');
  child.stderr.on('data', (chunk) => {
    for (const line of chunk.split('\n')) {
      if (line.trim() !== '') child.stderrTail.push(redact(line));
    }
    child.stderrTail.splice(0, Math.max(0, child.stderrTail.length - 20));
  });
  return child;
}

const hasExited = (api) => api.exitCode !== null || api.signalCode !== null;

// Stops the API with SIGTERM, and with SIGKILL if it does not exit within a few seconds.
async function stopApi(api) {
  if (hasExited(api)) return;
  const exited = once(api, 'exit');
  api.kill('SIGTERM');
  const killer = setTimeout(() => {
    if (!hasExited(api)) api.kill('SIGKILL');
  }, KILL_AFTER_MS);
  await exited;
  clearTimeout(killer);
}

async function isHealthy() {
  try {
    const response = await fetch(`${API_ORIGIN}/healthz`);
    const body = await response.json().catch(() => ({}));
    return response.status === 200 && body.status === 'ok';
  } catch {
    return false;
  }
}

async function waitForApi(api) {
  const deadline = Date.now() + HEALTH_TIMEOUT_MS;
  while (!(await isHealthy())) {
    if (hasExited(api)) {
      throw new StepError(
        `the API exited before it was ready (code ${api.exitCode}, signal ${api.signalCode})`,
      );
    }
    if (Date.now() >= deadline) {
      throw new StepError('the API did not report healthy within 60 s');
    }
    await sleep(200);
  }
}

// Signs in with the setup URL that the API wrote into the library. The URL, the token and the cookie stay in
// memory. They are never printed and never written to the report.
async function signIn(library) {
  const setupUrl = (
    await readFile(join(library, '.scriba', 'setup-url'), 'utf8')
  ).trim();
  const response = await fetch(setupUrl, { redirect: 'manual' });
  await response.text();
  if (response.status !== 303) {
    throw new StepError(`sign-in answered ${response.status}, expected 303`);
  }
  const cookie = response.headers
    .getSetCookie()
    .find((value) => value.startsWith(`${SESSION_COOKIE}=`));
  if (cookie === undefined) {
    throw new StepError('sign-in set no session cookie');
  }
  return { cookie: cookie.split(';')[0] };
}

// One HTTP step. Its error names the step and the status, never a cookie or a token.
async function call(session, step, method, path, expectStatus, body) {
  const headers = { cookie: session.cookie };
  const init = { method, headers };
  if (method === 'POST') headers.origin = API_ORIGIN;
  if (body !== undefined) {
    headers['content-type'] = 'application/json';
    init.body = JSON.stringify(body);
  }
  let response;
  try {
    response = await fetch(`${API_ORIGIN}${path}`, init);
  } catch (error) {
    throw new StepError(
      `${step}: no answer (${error.cause?.code ?? error.message})`,
    );
  }
  const text = await response.text();
  if (response.status !== expectStatus) {
    throw new StepError(
      `${step}: answered ${response.status}, expected ${expectStatus}`,
    );
  }
  if (text === '') return undefined;
  try {
    return JSON.parse(text);
  } catch {
    throw new StepError(`${step}: the answer is not JSON`);
  }
}

// The finished turn of one run, or undefined while it is still running.
async function findTurn(session, conversationId, runId) {
  const history = await call(
    session,
    'read conversation',
    'GET',
    `/api/agent-loop/conversations/${encodeURIComponent(conversationId)}`,
    200,
  );
  return (history.turns ?? []).find((turn) => turn.runId === runId);
}

// Citation presence: the [@id] matches in the answer and in the cards, and their distinct ids in first-seen order.
// Whether an id is valid is left to the reader of the report.
function citationsOf(assistantText, cards) {
  const idsIn = (text) =>
    [...text.matchAll(/\[@([^\]\s]+)\]/g)].map((match) => match[1]);
  const found = [...idsIn(assistantText), ...idsIn(JSON.stringify(cards))];
  return { count: found.length, ids: [...new Set(found)] };
}

// The outcome of each expectation the case sets: pass or fail. A key the case omits is unchecked. A result with no
// turn fails every key the case sets.
function judge(expect, turn) {
  const cards = turn?.cards ?? [];
  const citations = citationsOf(turn?.assistantText ?? '', cards).count;
  const outcome = (key, holds) => {
    if (!(key in expect)) return 'unchecked';
    return turn !== undefined && holds() ? 'pass' : 'fail';
  };
  return {
    reason: outcome('reason', () => turn.reason === expect.reason),
    tools: outcome('tools', () =>
      expect.tools.every((name) =>
        cards.some((card) => card.name === name && card.status === 'done'),
      ),
    ),
    citations: outcome('citations', () => {
      if (expect.citations === 'any') return true;
      if (expect.citations === 'present') return citations > 0;
      return citations === 0;
    }),
  };
}

// One result row. With no turn, the outcome fields are empty and the error says why.
function buildResult({ caseItem, model, runId, conversationId, turn, error }) {
  const cards = turn?.cards ?? [];
  const reason = turn?.reason ?? null;
  const citations = citationsOf(turn?.assistantText ?? '', cards);
  return {
    case: caseItem.id,
    model,
    runId,
    conversationId,
    reason,
    assistantText: turn?.assistantText ?? null,
    citations: citations.count,
    citationIds: citations.ids,
    cards,
    failureModes: {
      malformedCalls: cards.filter((card) => card.error !== undefined).length,
      withdrawals: cards.filter((card) => card.error?.withdrawn === true)
        .length,
      stepCapped: reason === 'capped',
    },
    expect: judge(caseItem.expect, turn),
    error,
  };
}

// Stops a run that the script could not finish. Its own error is not recorded, because the first one is.
async function bestEffortStop(session, runId) {
  try {
    await call(session, 'stop run', 'POST', '/api/agent-loop/runs/stop', 200, {
      runId,
    });
  } catch {
    // The run may have ended already.
  }
}

// One case with one model: a fresh project from the sample, made active, then one agent run.
async function runCase({ session, caseItem, model, modelIndex }) {
  let runId = null;
  let conversationId = null;
  let turn;
  let error = null;
  try {
    const project = await call(
      session,
      'start project from sample',
      'POST',
      '/api/project-store/projects/start-from-sample',
      201,
      {
        sampleId: caseItem.sample,
        folderName: `${caseItem.id}-${modelIndex}`,
        title: `Eval ${caseItem.id}`,
      },
    );
    await call(
      session,
      'activate project',
      'POST',
      '/api/project-store/active',
      200,
      {
        projectId: project.id,
      },
    );
    const started = await call(
      session,
      'start agent run',
      'POST',
      '/api/agent-loop/runs',
      200,
      { intent: caseItem.intent },
    );
    runId = started.runId;
    conversationId = started.conversationId;

    const limit = Date.now() + RUN_LIMIT_MS;
    turn = await findTurn(session, conversationId, runId);
    while (turn === undefined && Date.now() < limit) {
      await sleep(POLL_MS);
      turn = await findTurn(session, conversationId, runId);
    }
    if (turn === undefined) {
      error = 'timed out after 10 minutes';
      await bestEffortStop(session, runId);
      const stopLimit = Date.now() + STOP_GRACE_MS;
      while (turn === undefined && Date.now() < stopLimit) {
        await sleep(POLL_MS);
        turn = await findTurn(session, conversationId, runId).catch(
          () => undefined,
        );
      }
    }
  } catch (caught) {
    error = caught.message;
    if (runId !== null && turn === undefined) {
      await bestEffortStop(session, runId);
    }
  }
  return buildResult({ caseItem, model, runId, conversationId, turn, error });
}

// Creates the model's provider and makes it the app default. A failure here fails each of the model's cases.
async function setUpModel(session, { name, baseUrl, modelIndex }) {
  const provider = await call(
    session,
    'create provider',
    'POST',
    '/api/providers',
    201,
    {
      label: `eval-model-${modelIndex}`,
      kind: 'openai-compatible',
      baseURL: baseUrl,
      model: name,
      temperature: 0.7,
      contextSize: 64000,
      maxTokens: 4096,
      timeout: 120000,
      retries: 2,
    },
  );
  await call(
    session,
    'set app default',
    'POST',
    '/api/providers/app-default',
    200,
    { providerId: provider.id, model: name },
  );
}

async function main(argv) {
  const options = parseOptions(argv);
  const cases = await loadCases(options.casesDir, options.cases);
  await assertPortFree(API_PORT);

  const startedAt = new Date();
  const stampDir = join(options.reportsDir, stampOf(startedAt));
  await mkdir(options.reportsDir, { recursive: true });
  try {
    await mkdir(stampDir);
  } catch (error) {
    if (error.code === 'EEXIST') {
      throw new StepError(`the report folder ${stampDir} already exists`);
    }
    throw error;
  }
  const library = join(stampDir, 'library');
  await mkdir(library);

  const api = startApi(library);
  try {
    let session;
    try {
      await waitForApi(api);
      session = await signIn(library);
    } catch (error) {
      // No report is written when the API does not start or sign-in fails. The folder goes with it.
      await stopApi(api);
      await rm(stampDir, { recursive: true, force: true });
      const tail = api.stderrTail.map((line) => `  ${line}`).join('\n');
      process.stderr.write(
        `eval:agent: ${error.message}\n${tail === '' ? '' : `API stderr, last lines:\n${tail}\n`}`,
      );
      return 1;
    }

    const results = [];
    for (const [index, name] of options.models.entries()) {
      const modelIndex = index + 1;
      let setupError = null;
      try {
        await setUpModel(session, {
          name,
          baseUrl: options.baseUrl,
          modelIndex,
        });
      } catch (error) {
        setupError = error.message;
      }
      for (const caseItem of cases) {
        results.push(
          setupError !== null
            ? buildResult({
                caseItem,
                model: name,
                runId: null,
                conversationId: null,
                turn: undefined,
                error: setupError,
              })
            : await runCase({ session, caseItem, model: name, modelIndex }),
        );
      }
    }

    const report = {
      schemaVersion: SCHEMA_VERSION,
      startedAt: startedAt.toISOString(),
      finishedAt: new Date().toISOString(),
      baseUrl: options.baseUrl,
      library,
      results,
    };
    const reportPath = join(stampDir, 'report.json');
    await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`);
    process.stdout.write(`report: ${reportPath}\n`);
    for (const result of results) {
      process.stdout.write(
        `${result.case} ${result.model}: reason=${result.reason ?? '-'} error=${result.error ?? '-'}\n`,
      );
    }
    return results.some((result) => result.error !== null) ? 1 : 0;
  } finally {
    await stopApi(api);
    await rm(join(library, '.scriba'), { recursive: true, force: true });
  }
}

try {
  process.exitCode = await main(process.argv.slice(2));
} catch (error) {
  process.stderr.write(`eval:agent: ${error.message}\n`);
  process.exitCode = error instanceof UsageError ? 2 : 1;
}
