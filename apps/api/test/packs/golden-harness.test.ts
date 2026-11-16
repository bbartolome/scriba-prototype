import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { isDeepStrictEqual } from 'node:util';
import { afterEach, expect, it } from 'vitest';
import {
  GOLDEN_ROOT,
  PACKS_ROOT,
  README_TERMS,
  goldenCase,
  runGoldenCase,
} from './golden.kit';

const PROBE_SPEC = join(GOLDEN_ROOT, 'golden_probe', 'golden_probe.yaml');
const PROBE_FIXTURE_DIR = join(GOLDEN_ROOT, 'golden_probe');
const PROBE_EXPECT = {
  kind: 'draft' as const,
  sourcesUsed: ['person-a', 'person-b'],
};
const README = join(PACKS_ROOT, 'test', 'README.md');

const temporaryFolders: string[] = [];

function temporaryFolder(): string {
  const folder = mkdtempSync(join(tmpdir(), 'scriba-golden-'));
  temporaryFolders.push(folder);
  return folder;
}

afterEach(() => {
  for (const folder of temporaryFolders.splice(0)) {
    rmSync(folder, { recursive: true, force: true });
  }
});

it('AC 1: the sample golden case passes, and fails when the template changes without updating the golden', async () => {
  // Part 1: the sample case passes against the checked-in golden.
  await goldenCase({
    tool: 'golden_probe',
    name: 'two-people',
    expect: PROBE_EXPECT,
    invalidWithout: 'coreIdea',
    userTool: PROBE_SPEC,
  })();

  // Part 2: a changed template differs from the golden. The copy is in a temporary folder; the golden is not written.
  const spec = readFileSync(PROBE_SPEC, 'utf8');
  expect(spec).toContain('Core idea:');
  const changed = join(temporaryFolder(), 'golden_probe.yaml');
  writeFileSync(changed, spec.replace('Core idea:', 'Core theme:'));

  const result = await runGoldenCase({
    tool: 'golden_probe',
    name: 'two-people',
    expect: PROBE_EXPECT,
    invalidWithout: 'coreIdea',
    userTool: changed,
    update: false,
  });
  expect(result.golden).toBe('differs');
}, 60000);

it('AC 2: the convention is documented in packages/packs/test/README.md', () => {
  const text = readFileSync(README, 'utf8');
  for (const term of README_TERMS) {
    expect(text, term).toContain(term);
  }
});

it('X1: invalid arguments return TOOL_ARGS_INVALID naming the missing field, and make no model call', async () => {
  const result = await runGoldenCase({
    tool: 'golden_probe',
    name: 'two-people',
    expect: PROBE_EXPECT,
    invalidWithout: 'coreIdea',
    userTool: PROBE_SPEC,
    update: false,
  });
  expect(result.invalid.status).toBe(422);
  expect(result.invalid.code).toBe('TOOL_ARGS_INVALID');
  expect(result.invalid.message).toContain('coreIdea');
  expect(result.modelCalls).toBe(1);
}, 60000);

it('X2: a golden written by the update path is the checked-in golden', async () => {
  // The update writes into a temporary folder that holds only a copy of the fixture.
  const folder = temporaryFolder();
  writeFileSync(
    join(folder, 'two-people.fixture.json'),
    readFileSync(join(PROBE_FIXTURE_DIR, 'two-people.fixture.json'), 'utf8'),
  );

  const written = await runGoldenCase({
    tool: 'golden_probe',
    name: 'two-people',
    expect: PROBE_EXPECT,
    invalidWithout: 'coreIdea',
    userTool: PROBE_SPEC,
    goldenDir: folder,
    update: true,
  });
  expect(written.golden).toBe('written');

  const writtenGolden = JSON.parse(
    readFileSync(join(folder, 'two-people.golden.json'), 'utf8'),
  ) as unknown;
  const checkedIn = JSON.parse(
    readFileSync(join(PROBE_FIXTURE_DIR, 'two-people.golden.json'), 'utf8'),
  ) as unknown;
  expect(isDeepStrictEqual(writtenGolden, checkedIn)).toBe(true);

  const again = await runGoldenCase({
    tool: 'golden_probe',
    name: 'two-people',
    expect: PROBE_EXPECT,
    invalidWithout: 'coreIdea',
    userTool: PROBE_SPEC,
    goldenDir: folder,
    update: false,
  });
  expect(again.golden).toBe('match');
}, 60000);
