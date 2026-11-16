import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { contentChecks } from './checks';

// Extra tests (GNP-01 plan, section 4): the content checks on temporary packs, because the real packs are empty.
// Each test writes its packs to a temporary folder and removes it.

let root: string;

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'gnp01-packs-'));
});

afterEach(() => {
  rmSync(root, { recursive: true, force: true });
});

function writeFile(rel: string, text: string): void {
  mkdirSync(dirname(join(root, rel)), { recursive: true });
  writeFileSync(join(root, rel), text);
}

// The five common inputs, as properties of a draft tool.
function commonProperties(coreIdeaTitle = 'Core idea'): string {
  return `    coreIdea:
      type: string
      title: ${coreIdeaTitle}
      x-scriba-type: text
      x-scriba-port: true
      x-scriba-control: textarea
    entityIds:
      type: array
      title: Entities
      items:
        type: string
      x-scriba-type: entity
      x-scriba-port: true
    styleProfile:
      type: string
      title: Style profile
      x-scriba-type: entity
      x-scriba-port: true
    length:
      type: integer
      title: Length
    tone:
      type: string
      title: Tone
`;
}

interface ToolOptions {
  name: string;
  description?: string;
  output?: string;
  properties?: string;
  required?: string;
}

// A valid tool file, with the given fields. Its prompt uses only coreIdea.
function toolYaml(options: ToolOptions): string {
  return `schemaVersion: 1
name: ${options.name}
description: ${options.description ?? 'Draft a short passage from the core idea.'}
inputs:
  type: object
  properties:
${options.properties ?? commonProperties()}  required: ${options.required ?? '[coreIdea]'}
output: ${options.output ?? 'draft'}
enabled: true
prompt: |
  Write a short passage.

  Core idea: {{coreIdea}}
`;
}

describe('content checks', () => {
  it('an entity kind that no entity type ships is a finding', () => {
    const sources = `    sources:
      type: array
      title: Sources
      items:
        type: string
      x-scriba-type: entity
      x-scriba-port: true
      x-scriba-entity-kinds: [no-such-kind]
`;
    writeFile(
      'core/tools/entity_tool.yaml',
      toolYaml({
        name: 'entity_tool',
        properties: commonProperties() + sources,
      }),
    );

    const findings = contentChecks(root);
    expect(findings).toContainEqual(
      expect.objectContaining({
        severity: 'error',
        rule: 'entity-kind',
        file: 'core/tools/entity_tool.yaml',
      }),
    );
  });

  it('draft tools whose common inputs differ are a finding', () => {
    writeFile('core/tools/a_first.yaml', toolYaml({ name: 'a_first' }));
    writeFile(
      'core/tools/b_second.yaml',
      toolYaml({
        name: 'b_second',
        properties: commonProperties('Core passage'),
      }),
    );

    const findings = contentChecks(root);
    expect(findings).toContainEqual(
      expect.objectContaining({
        rule: 'common-inputs',
        file: 'core/tools/b_second.yaml',
      }),
    );
  });

  it('identical common inputs pass', () => {
    writeFile('core/tools/a_first.yaml', toolYaml({ name: 'a_first' }));
    writeFile('core/tools/b_second.yaml', toolYaml({ name: 'b_second' }));

    expect(contentChecks(root)).toEqual([]);
  });

  it('a description of 120 characters or more is a finding', () => {
    writeFile(
      'core/tools/long_description.yaml',
      toolYaml({
        name: 'long_description',
        description: `Draft ${'word '.repeat(24).trim()}`,
      }),
    );

    const findings = contentChecks(root);
    expect(findings).toContainEqual(
      expect.objectContaining({
        rule: 'description',
        file: 'core/tools/long_description.yaml',
        message: expect.stringContaining('characters'),
      }),
    );
  });

  it('a description whose first word is not a verb is a finding', () => {
    writeFile(
      'core/tools/not_a_verb.yaml',
      toolYaml({
        name: 'not_a_verb',
        description: 'The passage names the core idea.',
      }),
    );

    const findings = contentChecks(root);
    expect(findings).toContainEqual(
      expect.objectContaining({
        rule: 'description',
        file: 'core/tools/not_a_verb.yaml',
        message: expect.stringContaining('"the"'),
      }),
    );
  });

  it('the Remix check is inactive without remix.yaml', () => {
    writeFile('core/tools/a_first.yaml', toolYaml({ name: 'a_first' }));

    const findings = contentChecks(root);
    expect(findings.some((f) => f.rule === 'remix-shapes')).toBe(false);
  });

  it('the Remix check fails when the enum differs from the draft tools', () => {
    writeFile('core/tools/a_first.yaml', toolYaml({ name: 'a_first' }));
    writeFile('core/tools/b_second.yaml', toolYaml({ name: 'b_second' }));
    writeFile(
      'core/tools/remix.yaml',
      toolYaml({
        name: 'remix',
        properties:
          commonProperties() +
          `    targetShape:
      type: string
      title: Target shape
      enum: [a_first]
`,
      }),
    );

    const findings = contentChecks(root);
    expect(findings).toContainEqual(
      expect.objectContaining({
        rule: 'remix-shapes',
        file: 'core/tools/remix.yaml',
      }),
    );
  });
});
