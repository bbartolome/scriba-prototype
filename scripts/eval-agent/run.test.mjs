import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import {
  copyFileSync,
  existsSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { startMockOpenAI } from '../../e2e/fixtures/mock-openai/server.mjs';

// Tests for the manual eval script. These run the script against the mock OpenAI server and a booted API on
// port 8080, so they are not part of npm test. Run them after building contracts and the API.
const here = dirname(fileURLToPath(import.meta.url));
const script = join(here, 'run.mjs');
const casesDir = join(here, 'cases');
const readme = join(here, 'README.md');
const SCENARIO = 'summarize-outline';
const RUN_TIMEOUT_MS = 300_000;

let mock;

before(async () => {
  mock = await startMockOpenAI();
});

after(async () => {
  await mock?.close();
});

function runScript(args) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [script, ...args], {
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk) => (stdout += chunk));
    child.stderr.on('data', (chunk) => (stderr += chunk));
    child.once('error', reject);
    child.once('close', (code) => resolve({ code, stdout, stderr }));
  });
}

function providerArgs(reportsDir) {
  return [
    '--model',
    'mock-model',
    '--base-url',
    `${mock.baseUrl}/scenario/${SCENARIO}/v1`,
    '--reports-dir',
    reportsDir,
  ];
}

function onlyStampFolder(reportsDir) {
  const stamps = readdirSync(reportsDir);
  assert.equal(stamps.length, 1, 'one stamp folder in the reports folder');
  return join(reportsDir, stamps[0]);
}

test(
  'T1 runs the summarize-outline case against a provider and writes a report',
  { timeout: RUN_TIMEOUT_MS },
  async () => {
    const reportsDir = mkdtempSync(join(tmpdir(), 'agl25-t1-'));
    try {
      await fetch(`${mock.baseUrl}/__mock/scenarios/${SCENARIO}/reset`, {
        method: 'POST',
      });
      const result = await runScript([
        ...providerArgs(reportsDir),
        '--case',
        'summarize-outline',
      ]);
      assert.equal(result.code, 0, result.stderr);

      const stampDir = onlyStampFolder(reportsDir);
      const reportText = readFileSync(join(stampDir, 'report.json'), 'utf8');
      const report = JSON.parse(reportText);
      assert.equal(report.schemaVersion, 1);
      assert.equal(report.results.length, 1);

      const [item] = report.results;
      assert.equal(item.case, 'summarize-outline');
      assert.equal(item.model, 'mock-model');
      assert.equal(item.reason, 'completed');
      assert.equal(item.error, null);
      assert.deepEqual(
        item.cards.map((card) => [card.name, card.status]),
        [
          ['list_files', 'done'],
          ['read_file', 'done'],
        ],
      );
      assert.ok(
        item.assistantText.includes('The outline has six chapters'),
        'the answer text is in the result',
      );
      assert.equal(item.citations, 0);
      assert.deepEqual(item.citationIds, []);
      assert.deepEqual(item.failureModes, {
        malformedCalls: 0,
        withdrawals: 0,
        stepCapped: false,
      });
      assert.deepEqual(item.expect, {
        reason: 'pass',
        tools: 'pass',
        citations: 'pass',
      });

      // The mock saw the three steps of the scenario, in order, for the one conversation.
      const requestsResponse = await fetch(
        `${mock.baseUrl}/__mock/scenarios/${SCENARIO}/requests`,
      );
      const records = await requestsResponse.json();
      assert.deepEqual(
        records.map((record) => record.step),
        [0, 1, 2],
      );

      // No cookie name, no setup-token query key in the report or in the script's output.
      assert.equal(reportText.includes('scriba_setup_8080'), false);
      assert.equal(reportText.includes('token='), false);
      assert.equal(result.stdout.includes('scriba_setup_8080'), false);
      assert.equal(result.stdout.includes('token='), false);
      assert.equal(result.stderr.includes('scriba_setup_8080'), false);
      assert.equal(result.stderr.includes('token='), false);

      // The setup files are removed after the run.
      assert.equal(existsSync(join(stampDir, 'library', '.scriba')), false);
    } finally {
      rmSync(reportsDir, { recursive: true, force: true });
    }
  },
);

test(
  'T2 a case added as one data file runs with no code change',
  { timeout: RUN_TIMEOUT_MS },
  async () => {
    const reportsDir = mkdtempSync(join(tmpdir(), 'agl25-t2-reports-'));
    const cases = mkdtempSync(join(tmpdir(), 'agl25-t2-cases-'));
    try {
      copyFileSync(
        join(casesDir, 'summarize-outline.json'),
        join(cases, 'summarize-outline.json'),
      );
      copyFileSync(
        join(casesDir, 'summarize-outline.json'),
        join(cases, 'summarize-outline-copy.json'),
      );
      const hashBefore = sha256(script);

      const result = await runScript([
        ...providerArgs(reportsDir),
        '--cases-dir',
        cases,
      ]);
      assert.equal(result.code, 0, result.stderr);

      const report = JSON.parse(
        readFileSync(join(onlyStampFolder(reportsDir), 'report.json'), 'utf8'),
      );
      const caseIds = report.results.map((item) => item.case).sort();
      assert.deepEqual(caseIds, [
        'summarize-outline',
        'summarize-outline-copy',
      ]);
      for (const item of report.results) {
        assert.equal(item.reason, 'completed', item.case);
        assert.equal(item.error, null, item.case);
      }

      assert.equal(sha256(script), hashBefore, 'run.mjs is unchanged');
    } finally {
      rmSync(reportsDir, { recursive: true, force: true });
      rmSync(cases, { recursive: true, force: true });
    }
  },
);

test('T3 the README documents the case file keys', () => {
  assert.ok(existsSync(readme), 'the README exists');
  const text = readFileSync(readme, 'utf8');
  assert.ok(text.includes('one file'), 'README says a case is one file');
  assert.ok(
    text.includes('npm run eval:agent'),
    'README gives the run command',
  );
  for (const key of [
    'sample',
    'intent',
    'expect',
    'reason',
    'tools',
    'citations',
  ]) {
    assert.ok(text.includes(key), `README names the case key ${key}`);
  }
});

function sha256(file) {
  return createHash('sha256').update(readFileSync(file)).digest('hex');
}
