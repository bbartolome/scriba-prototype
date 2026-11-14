import { spawnSync } from 'node:child_process';
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

// Helpers for the PLT-19 tests. This file is not a test file: the test glob does not pick it up.

const created = [];

// A fresh folder under the system temp folder, removed when the test process exits.
export function tempDir() {
  const dir = mkdtempSync(join(tmpdir(), 'plt19-'));
  created.push(dir);
  return dir;
}

process.on('exit', () => {
  for (const dir of created) rmSync(dir, { recursive: true, force: true });
});

// Writes an executable `docker` shell script into dir. Every call is appended to dir/calls.log,
// one line with all arguments. rules is an ordered list of { match, stdout, stderr, exit }: the
// first rule whose match (a shell case pattern, where * is any text) fits the call answers it.
// A call that fits no rule exits 0 with no output. stdout and stderr are written to files, so
// they need no quoting.
export function makeStubDocker(dir, rules = []) {
  mkdirSync(dir, { recursive: true });
  const log = join(dir, 'calls.log');
  const arms = rules.map((rule, i) => {
    const outFile = join(dir, `rule-${i}.out`);
    const errFile = join(dir, `rule-${i}.err`);
    writeFileSync(outFile, rule.stdout ?? '');
    writeFileSync(errFile, rule.stderr ?? '');
    return `  ${rule.match}) cat '${outFile}'; cat '${errFile}' >&2; exit ${rule.exit ?? 0};;`;
  });
  const script = [
    '#!/bin/sh',
    `printf '%s\\n' "$*" >> '${log}'`,
    'case "$*" in',
    ...arms,
    '  *) exit 0;;',
    'esac',
    '',
  ].join('\n');
  const path = join(dir, 'docker');
  writeFileSync(path, script);
  chmodSync(path, 0o755);
  return path;
}

// The calls the stub recorded, one string per call, in order. No file means no call.
export function readCalls(dir) {
  const log = join(dir, 'calls.log');
  return existsSync(log) ? readFileSync(log, 'utf8').split('\n').filter(Boolean) : [];
}

// Runs `bash <script> ...args` with stubDir first on PATH. env values of undefined remove the
// variable. Returns the exit status, stdout, stderr and the calls the stub recorded.
export function runScript(script, args, env, stubDir) {
  const merged = { ...process.env, PATH: `${stubDir}:${process.env.PATH}` };
  for (const [key, value] of Object.entries(env ?? {})) {
    if (value === undefined) delete merged[key];
    else merged[key] = value;
  }
  const result = spawnSync('bash', [script, ...args], { env: merged, encoding: 'utf8' });
  return {
    status: result.status,
    stdout: result.stdout ?? '',
    stderr: result.stderr ?? '',
    calls: readCalls(stubDir),
  };
}
