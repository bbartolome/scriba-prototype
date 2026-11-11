import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ESLint } from 'eslint';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const FIXTURE_DIR = 'lint-fixtures';

// Lints with the real root config. ignore: false lifts the fixture ignore so the
// fixtures can be linted; criterion 5 checks the ignore with a default instance.
const linter = new ESLint({ cwd: ROOT, ignore: false });

const TARGETS = [
  'apps/api/src/modules/agent-loop/agent-loop.module.ts',
  'apps/api/src/modules/agent-loop/agent-loop.service.ts',
  'apps/api/src/modules/graph-runner/graph-runner.module.ts',
  'apps/api/src/modules/graph-runner/graph-runner.service.ts',
  'apps/api/src/modules/project-store/project-store.module.ts',
  'apps/api/src/modules/project-store/project-store.service.ts',
  'apps/web/src/app/features/project-store/project-store.routes.ts',
  'apps/web/src/app/features/project-store/project-store.state.ts',
];

const BAD_CROSS_MODULE = [
  'apps/api/src/modules/graph-runner/bad-agent-loop-service.ts',
  'apps/api/src/modules/graph-runner/bad-agent-loop-module.ts',
  'apps/api/src/modules/agent-loop/bad-graph-runner-service.ts',
  'apps/api/src/modules/agent-loop/bad-graph-runner-module.ts',
];
const BAD_INTERNAL =
  'apps/api/src/modules/tool-registry/bad-project-store-service.ts';
const OK_MODULE =
  'apps/api/src/modules/tool-registry/ok-project-store-module.ts';
const BAD_CROSS_FEATURE =
  'apps/web/src/app/features/tool-registry/bad-cross-feature.ts';
const OK_CROSS_FEATURE =
  'apps/web/src/app/features/tool-registry/ok-cross-feature-routes.ts';
const OK_CONTRACTS_AGENT_LOOP =
  'apps/api/src/modules/agent-loop/ok-contracts.ts';

// The ten contracts subpaths (PLT-02, units/PLT-02-contracts-package-platform-slice.md line 19).
const CONTRACT_SLUGS = [
  'platform',
  'setup-auth',
  'providers',
  'project-store',
  'tool-registry',
  'agent-loop',
  'graph-runner',
  'compile-export',
  'shell',
  'genre-packs',
];

const ALL_FIXTURES = [
  ...TARGETS,
  ...BAD_CROSS_MODULE,
  BAD_INTERNAL,
  OK_MODULE,
  BAD_CROSS_FEATURE,
  OK_CROSS_FEATURE,
  OK_CONTRACTS_AGENT_LOOP,
];

const fixturePath = (rel) => join(ROOT, FIXTURE_DIR, rel);
const boundaryMessages = (messages) =>
  messages.filter(
    (m) => typeof m.ruleId === 'string' && m.ruleId.startsWith('boundaries/'),
  );
const describeMessages = (messages) =>
  messages.map((m) => `${m.ruleId}: ${m.message}`).join('\n');

async function lintFixture(rel) {
  const [result] = await linter.lintFiles([fixturePath(rel)]);
  assert.ok(result, `${rel} was not linted`);
  return result.messages;
}

test('criterion 1: agent-loop and graph-runner do not import each other', async () => {
  for (const rel of BAD_CROSS_MODULE) {
    const messages = boundaryMessages(await lintFixture(rel));
    assert.ok(messages.length > 0, `${rel} should fail a boundaries rule`);
  }
});

test('criterion 2: another module internal service fails, its module file passes', async () => {
  const bad = boundaryMessages(await lintFixture(BAD_INTERNAL));
  assert.ok(bad.length > 0, `${BAD_INTERNAL} should fail a boundaries rule`);

  const ok = await lintFixture(OK_MODULE);
  assert.equal(
    ok.length,
    0,
    `${OK_MODULE} should have no messages:\n${describeMessages(ok)}`,
  );
});

test('criterion 3: cross-feature internal import fails, its routes file passes', async () => {
  const bad = boundaryMessages(await lintFixture(BAD_CROSS_FEATURE));
  assert.ok(
    bad.length > 0,
    `${BAD_CROSS_FEATURE} should fail a boundaries rule`,
  );

  const ok = await lintFixture(OK_CROSS_FEATURE);
  assert.equal(
    ok.length,
    0,
    `${OK_CROSS_FEATURE} should have no messages:\n${describeMessages(ok)}`,
  );
});

test('criterion 4: contracts subpath imports pass from every module', async () => {
  const cases = CONTRACT_SLUGS.map((slug) => ({
    rel: `apps/api/src/modules/${slug}/ok-contracts.ts`,
    slug,
  }));
  cases.push({
    rel: 'apps/web/src/app/features/tool-registry/ok-contracts.ts',
    slug: 'tool-registry',
  });

  for (const { rel, slug } of cases) {
    const text = `export * from '@bbartolome/scriba-contracts/${slug}';\n`;
    const [result] = await linter.lintText(text, {
      filePath: fixturePath(rel),
    });
    assert.equal(
      result.messages.length,
      0,
      `${rel} should have no messages:\n${describeMessages(result.messages)}`,
    );
  }

  const onDisk = await lintFixture(OK_CONTRACTS_AGENT_LOOP);
  assert.equal(
    onDisk.length,
    0,
    `${OK_CONTRACTS_AGENT_LOOP} should have no messages`,
  );
});

test('criterion 5: fixtures are ignored and are not a workspace', async () => {
  const eslint = new ESLint({ cwd: ROOT });
  for (const rel of ALL_FIXTURES) {
    assert.equal(
      await eslint.isPathIgnored(fixturePath(rel)),
      true,
      `${rel} should be ignored`,
    );
  }

  const pkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'));
  for (const workspace of pkg.workspaces) {
    assert.ok(
      !workspace.includes(FIXTURE_DIR),
      `workspace ${workspace} must not include ${FIXTURE_DIR}`,
    );
  }

  assert.equal(
    existsSync(join(ROOT, FIXTURE_DIR, 'package.json')),
    false,
    'fixtures must have no package.json',
  );
});
