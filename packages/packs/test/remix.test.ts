import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { parse, stringify } from 'yaml';
import { afterEach, describe, expect, it } from 'vitest';
import { contentChecks, lintPacks } from './checks';

// GNP-23 plan, section 4: tests A1, A2 and X1 for core/tools/remix.yaml.
const PACKS_ROOT = resolve(__dirname, '..');
const PACKS = ['core', 'nonfiction', 'fiction'];

interface Spec {
  name: string;
  description: string;
  output: string;
  enabled?: boolean;
  prompt?: string;
  inputs: {
    properties: Record<string, { enum?: string[] }>;
  };
}

function loadSpec(path: string): Spec {
  return parse(readFileSync(path, 'utf8')) as Spec;
}

// Every shipped tool file of the three packs' tools folders, with its path.
function shippedToolFiles(packsRoot: string): string[] {
  const files: string[] = [];
  for (const pack of PACKS) {
    const folder = join(packsRoot, pack, 'tools');
    if (!existsSync(folder)) continue;
    for (const file of readdirSync(folder)) {
      if (file.endsWith('.yaml')) files.push(join(folder, file));
    }
  }
  return files;
}

function draftNamesExceptRemix(packsRoot: string): string[] {
  return shippedToolFiles(packsRoot)
    .map((file) => loadSpec(file))
    .filter((spec) => spec.output === 'draft' && spec.name !== 'remix')
    .map((spec) => spec.name)
    .sort();
}

const remixPath = join(PACKS_ROOT, 'core', 'tools', 'remix.yaml');

let temporary: string | undefined;

afterEach(() => {
  if (temporary !== undefined) {
    rmSync(temporary, { recursive: true, force: true });
    temporary = undefined;
  }
});

describe('remix', () => {
  it('AC 1: the real packs pass the validation suite, and the remix enum is the shipped draft tools minus remix', () => {
    // (i) and (ii): the validation suite and the content checks on the real packs.
    const errors = lintPacks(PACKS_ROOT).filter(
      (finding) => finding.severity === 'error',
    );
    expect(errors).toEqual([]);
    expect(contentChecks(PACKS_ROOT)).toEqual([]);

    // (iii): the enum equals the sorted names of the shipped draft tools except remix, and the list is not empty.
    const drafts = draftNamesExceptRemix(PACKS_ROOT);
    expect(drafts.length).toBeGreaterThan(0);
    const remix = loadSpec(remixPath);
    const enumValues = [
      ...(remix.inputs.properties.targetShape?.enum ?? []),
    ].sort();
    expect(enumValues).toEqual(drafts);

    // (iv): the tool is a draft, and it ships enabled.
    expect(remix.output).toBe('draft');
    expect(remix.enabled).toBe(true);
  });

  it('AC 2: a draft tool that the enum does not list makes the content suite fail, and listing it passes', () => {
    temporary = mkdtempSync(join(tmpdir(), 'gnp23-packs-'));
    for (const pack of PACKS) {
      for (const folder of ['tools', 'entity-types']) {
        const source = join(PACKS_ROOT, pack, folder);
        if (existsSync(source)) {
          cpSync(source, join(temporary, pack, folder), { recursive: true });
        }
      }
    }

    // A fixture draft tool: a copy of contrast.yaml under another name.
    const fixturePath = join(
      temporary,
      'nonfiction',
      'tools',
      'fixture_draft.yaml',
    );
    const contrast = readFileSync(
      join(temporary, 'nonfiction', 'tools', 'contrast.yaml'),
      'utf8',
    );
    mkdirSync(dirname(fixturePath), { recursive: true });
    writeFileSync(
      fixturePath,
      contrast.replace(/^name: contrast$/m, 'name: fixture_draft'),
    );

    const failing = contentChecks(temporary);
    expect(failing).toContainEqual(
      expect.objectContaining({
        severity: 'error',
        rule: 'remix-shapes',
        file: 'core/tools/remix.yaml',
      }),
    );

    // Listing the fixture in the copy's enum removes the finding. The real remix.yaml is not changed.
    const copyRemix = join(temporary, 'core', 'tools', 'remix.yaml');
    const spec = parse(readFileSync(copyRemix, 'utf8')) as Spec;
    spec.inputs.properties.targetShape!.enum = [
      ...(spec.inputs.properties.targetShape!.enum ?? []),
      'fixture_draft',
    ];
    writeFileSync(copyRemix, stringify(spec));

    const passing = contentChecks(temporary);
    expect(
      passing.filter((finding) => finding.rule === 'remix-shapes'),
    ).toEqual([]);
  });

  it('X1: the remix prompt lists each shape on its own line', () => {
    const remix = loadSpec(remixPath);
    const prompt = remix.prompt ?? '';
    const shapeLines = [...prompt.matchAll(/^- ([a-z][a-z0-9_]*): /gm)].map(
      (match) => match[1] as string,
    );
    const enumValues = remix.inputs.properties.targetShape?.enum ?? [];
    expect([...shapeLines].sort()).toEqual([...enumValues].sort());
  });
});
