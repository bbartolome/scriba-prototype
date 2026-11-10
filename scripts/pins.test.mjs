import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const pkg = JSON.parse(readFileSync(join(here, '..', 'package.json'), 'utf8'));

test('pin section names the Angular, NestJS and Zod majors', () => {
  const pins = pkg.scribaPins;
  assert.ok(pins && typeof pins === 'object', 'scribaPins is an object');
  for (const key of ['angular', 'nestjs', 'zod']) {
    assert.equal(typeof pins[key], 'string', `${key} is a string`);
    assert.ok(pins[key].length > 0, `${key} is non-empty`);
  }
});
