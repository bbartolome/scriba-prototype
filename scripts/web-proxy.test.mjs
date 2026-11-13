import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import proxy from '../apps/web/proxy.conf.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const webDir = join(here, '..', 'apps', 'web');
const readJson = (file) => JSON.parse(readFileSync(join(webDir, file), 'utf8'));

const angular = readJson('angular.json');

test('proxy config covers exactly /api, /healthz and /events', () => {
  assert.deepEqual(Object.keys(proxy).sort(), ['/api', '/events', '/healthz']);
});

test('every proxy entry targets the API on port 8080', () => {
  for (const [path, entry] of Object.entries(proxy)) {
    assert.equal(new URL(entry.target).port, '8080', `target of ${path}`);
  }
});

test('the web project serves with proxy.conf.mjs', () => {
  const [project] = Object.values(angular.projects);
  assert.equal(project.architect.serve.options.proxyConfig, 'proxy.conf.mjs');
});

test('only /events has a configure hook', () => {
  for (const [path, entry] of Object.entries(proxy)) {
    assert.equal(
      typeof entry.configure,
      path === '/events' ? 'function' : 'undefined',
      `configure of ${path}`,
    );
  }
});
