import { test } from 'node:test';
import assert from 'node:assert/strict';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { makeStubDocker, runScript, tempDir } from './publish-test-kit.mjs';

const here = dirname(fileURLToPath(import.meta.url));
// The override variable exists only so the mutation checks can point the tests at a mutant copy.
const smokeScript = process.env.SMOKE_SCRIPT ?? join(here, 'smoke-image.sh');

const IMAGE = `bbartolome/scriba@sha256:${'a'.repeat(64)}`;
const PIN = 'sha-abc1234';
const CHECKS = ['dispenser', 'pandoc', 'typst', 'convert', 'healthz', 'fts5', 'size', 'arch'];

// The dispenser output: a first line, then the REF and IMAGE_TAG lines the smoke check reads.
function bootScript({ first = '#!/usr/bin/env bash', ref = `bbartolome/scriba:${PIN}`, tag = PIN, extra = '' } = {}) {
  return [first, 'set -euo pipefail', `REF=${ref}`, `IMAGE_TAG=${tag}`, extra, 'echo done', ''].join('\n');
}

function healthBody(version) {
  return `200 {"status":"ok","version":"${version}"}\n`;
}

// The ordered stub rules for one run. over[name] replaces fields of one rule. The rule names
// are the checks, plus the calls they make: healthz-run, healthz-final, healthz-poll, size-raw.
function rulesFor(over = {}, version = '0.0.0-dev') {
  const base = {
    dispenser: { match: '*-e SETUP=true*', stdout: bootScript() },
    pandoc: { match: '*--entrypoint pandoc*', stdout: 'pandoc 3.13\nFeatures: +server\n' },
    typst: { match: '*--entrypoint typst*', stdout: 'typst 0.15.1 (0a1b2c)\n' },
    convert: { match: '*-w /tmp*', stdout: 'converted\n' },
    fts5: { match: '*DatabaseSync*', stdout: '[{"body":"the quick brown fox"}]\n' },
    arch: { match: '*-p process.arch*', stdout: 'arm64\n' },
    'size-raw': { match: '*imagetools inspect --raw*', stdout: '{"layers":[{"size":1000000}]}\n' },
    size: { match: '*--user 0*', stdout: '123456\t/\n' },
    'healthz-run': { match: '*run -d*', stdout: 'c0ffee\n' },
    'healthz-final': { match: '*exec *console.log*', stdout: healthBody(version) },
    'healthz-poll': { match: '*exec *', stdout: '' },
  };
  return Object.keys(base).map((name) => ({ ...base[name], ...over[name] }));
}

// Runs smoke-image.sh. env values of undefined are removed; over and version feed the stub.
function runSmoke({ args = [IMAGE], env = {}, over = {} } = {}) {
  const stub = tempDir();
  const full = {
    EXPECTED_VERSION: '0.0.0-dev',
    EXPECTED_PIN: PIN,
    EXPECTED_ARCH: 'arm64',
    SMOKE_POLLS: undefined,
    SMOKE_POLL_SLEEP: undefined,
    GITHUB_STEP_SUMMARY: undefined,
    ...env,
  };
  makeStubDocker(stub, rulesFor(over, full.EXPECTED_VERSION));
  return runScript(smokeScript, args, full, stub);
}

function expectFail(r, name, id) {
  assert.equal(r.status, 1, `${id}: exit 1`);
  assert.match(r.stdout, new RegExp(`^FAIL ${name}: `, 'm'), `${id}: FAIL ${name}`);
}

function expectOthersPass(r, name, id) {
  for (const other of CHECKS.filter((c) => c !== name)) {
    assert.match(r.stdout, new RegExp(`^PASS ${other}: `, 'm'), `${id}: PASS ${other} still prints`);
  }
}

// The healthz container was started with a name, and the trap removed it by that name.
function expectRemoved(r, id) {
  const run = r.calls.find((c) => c.startsWith('run -d --name '));
  assert.ok(run, `${id}: the healthz container was started with --name`);
  const name = run.split(' ')[3];
  assert.ok(r.calls.includes(`rm -f ${name}`), `${id}: the call log has rm -f ${name}`);
}

test('K1 all checks pass: exit 0 and a PASS line for each of the eight checks', () => {
  const r = runSmoke();
  assert.equal(r.status, 0, 'K1: exit 0');
  for (const name of CHECKS) {
    assert.match(r.stdout, new RegExp(`^PASS ${name}: `, 'm'), `K1: PASS ${name}`);
  }
  assert.doesNotMatch(r.stdout, /^FAIL /m, 'K1: no FAIL line');
});

test('K2 a /healthz version that differs from EXPECTED_VERSION fails healthz', () => {
  const same = runSmoke({
    env: { EXPECTED_VERSION: '1.2.3' },
    over: { 'healthz-final': { stdout: healthBody('1.2.3') } },
  });
  assert.equal(same.status, 0, 'K2: a matching version exits 0');
  assert.match(same.stdout, /^PASS healthz: /m, 'K2: a matching version passes healthz');
  const diff = runSmoke({
    env: { EXPECTED_VERSION: '1.2.4' },
    over: { 'healthz-final': { stdout: healthBody('1.2.3') } },
  });
  expectFail(diff, 'healthz', 'K2');
  expectOthersPass(diff, 'healthz', 'K2');
  expectRemoved(diff, 'K2');
});

test('K3 a dispenser script with a bad first line fails dispenser', () => {
  const r = runSmoke({ over: { dispenser: { stdout: bootScript({ first: '# x' }) } } });
  expectFail(r, 'dispenser', 'K3');
  expectOthersPass(r, 'dispenser', 'K3');
  expectRemoved(r, 'K3');
});

test('K4 a dispenser script that fails bash -n fails dispenser', () => {
  const r = runSmoke({ over: { dispenser: { stdout: bootScript({ extra: 'if true; then' }) } } });
  expectFail(r, 'dispenser', 'K4');
  expectOthersPass(r, 'dispenser', 'K4');
  expectRemoved(r, 'K4');
});

test('K5 a dispenser REF line with another tag than EXPECTED_PIN fails dispenser', () => {
  const r = runSmoke({
    over: { dispenser: { stdout: bootScript({ ref: 'bbartolome/scriba:sha-zzz9999' }) } },
  });
  expectFail(r, 'dispenser', 'K5');
  expectOthersPass(r, 'dispenser', 'K5');
  expectRemoved(r, 'K5');
});

test('K6 pandoc --version whose first line is pandoc 3.12 fails pandoc', () => {
  const r = runSmoke({ over: { pandoc: { stdout: 'pandoc 3.12\nFeatures: +server\n' } } });
  expectFail(r, 'pandoc', 'K6');
  expectOthersPass(r, 'pandoc', 'K6');
  expectRemoved(r, 'K6');
});

test('K7 typst --version that exits 1 fails typst', () => {
  const r = runSmoke({ over: { typst: { stdout: '', exit: 1 } } });
  expectFail(r, 'typst', 'K7');
  expectOthersPass(r, 'typst', 'K7');
  expectRemoved(r, 'K7');
});

test('K8 a convert run that prints nothing, or exits 1, fails convert', () => {
  for (const over of [{ stdout: '' }, { exit: 1 }]) {
    const r = runSmoke({ over: { convert: over } });
    expectFail(r, 'convert', `K8 (${JSON.stringify(over)})`);
    expectOthersPass(r, 'convert', 'K8');
    expectRemoved(r, 'K8');
  }
});

test('K9 an FTS5 query that prints [] fails fts5', () => {
  const r = runSmoke({ over: { fts5: { stdout: '[]\n' } } });
  expectFail(r, 'fts5', 'K9');
  expectOthersPass(r, 'fts5', 'K9');
  expectRemoved(r, 'K9');
});

test('K10 a container that never answers fails healthz, and the trap removes it by name', () => {
  const r = runSmoke({
    env: { SMOKE_POLLS: '2', SMOKE_POLL_SLEEP: '0' },
    over: { 'healthz-poll': { exit: 1 } },
  });
  expectFail(r, 'healthz', 'K10');
  expectOthersPass(r, 'healthz', 'K10');
  expectRemoved(r, 'K10');
});

test('K11 EXPECTED_ARCH=arm64 but process.arch prints x64 fails arch', () => {
  const r = runSmoke({ over: { arch: { stdout: 'x64\n' } } });
  expectFail(r, 'arch', 'K11');
  expectOthersPass(r, 'arch', 'K11');
  expectRemoved(r, 'K11');
});

test('K12 du that cannot be measured fails size', () => {
  const r = runSmoke({ over: { size: { stdout: '', exit: 1 } } });
  expectFail(r, 'size', 'K12');
  expectOthersPass(r, 'size', 'K12');
  expectRemoved(r, 'K12');
});

test('K13 no image argument, or EXPECTED_VERSION or EXPECTED_PIN unset: exit 2, a usage line, no docker call', () => {
  const cases = [
    { args: [], env: {} },
    { args: [IMAGE], env: { EXPECTED_VERSION: undefined } },
    { args: [IMAGE], env: { EXPECTED_PIN: undefined } },
  ];
  for (const c of cases) {
    const r = runSmoke(c);
    assert.equal(r.status, 2, `K13: ${JSON.stringify(c.env)} with ${c.args.length} argument(s) exits 2`);
    assert.match(r.stderr, /usage/i, 'K13: a usage line on stderr');
    assert.deepEqual(r.calls, [], 'K13: no docker call');
  }
});
