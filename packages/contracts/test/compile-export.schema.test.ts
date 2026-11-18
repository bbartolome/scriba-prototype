import { describe, expect, it } from 'vitest';
import {
  BIBLIOGRAPHY_DEFAULT,
  BIBLIOGRAPHY_DEFAULT_BY_PACK,
  PLACEHOLDER_PATTERN,
  PLACEHOLDER_WORDS,
  COMPILE_ERROR_CODE_VALUES,
  COMPILE_ERROR_STATUS,
  compileErrorCodeSchema,
  compileExportEventSchema,
  exportFormatSchema,
  exportRequestSchema,
  exportSettingsSchema,
  manuscriptPartSchema,
  manuscriptReorderRequestSchema,
  manuscriptStatusSchema,
  orderEntrySchema,
} from '../src/compile-export/index.js';
import { projectYamlSchema } from '../src/project-store/index.js';

const REVISION = `sha256:${'a'.repeat(64)}`;

// Each refusal has a matching accepted control, so a refusal is a rule, not a broken fixture.
describe('compile-export schemas', () => {
  it('C2: refuses an unknown status or part, an order path outside drafts/, a reorder that is not lists of paths, and an unknown export format', () => {
    expect(manuscriptStatusSchema.safeParse('draft').success).toBe(true);
    for (const status of ['outline', 'draft', 'revised', 'final']) {
      expect(manuscriptStatusSchema.safeParse(status).success).toBe(true);
    }
    expect(manuscriptStatusSchema.safeParse('published').success).toBe(false);

    for (const part of ['front', 'body', 'back']) {
      expect(manuscriptPartSchema.safeParse(part).success).toBe(true);
    }
    expect(manuscriptPartSchema.safeParse('appendix').success).toBe(false);

    expect(orderEntrySchema.safeParse({ path: 'drafts/ch01.md' }).success).toBe(
      true,
    );
    for (const path of [
      'graphs/story.json',
      'project.yaml',
      'ch01.md',
      '/drafts/ch01.md',
      'drafts/../project.yaml',
      'drafts/',
      'drafts/a\\b.md',
    ]) {
      expect(orderEntrySchema.safeParse({ path }).success, path).toBe(false);
    }
    expect(
      orderEntrySchema.safeParse({
        path: 'drafts/ch01.md',
        status: 'published',
      }).success,
    ).toBe(false);

    const reorder = {
      revision: REVISION,
      front: [],
      body: ['drafts/a.md'],
      back: [],
    };
    expect(manuscriptReorderRequestSchema.safeParse(reorder).success).toBe(
      true,
    );
    for (const bad of [
      { ...reorder, body: 'drafts/a.md' },
      { ...reorder, body: [3] },
      { ...reorder, body: ['notes/a.md'] },
      { ...reorder, revision: 'sha256:' + 'A'.repeat(64) },
      { ...reorder, revision: 'sha256:' + 'a'.repeat(63) },
    ]) {
      expect(manuscriptReorderRequestSchema.safeParse(bad).success).toBe(false);
    }

    for (const format of ['md', 'docx', 'epub', 'pdf']) {
      expect(exportFormatSchema.safeParse(format).success).toBe(true);
      expect(exportRequestSchema.safeParse({ format }).success).toBe(true);
    }
    expect(exportFormatSchema.safeParse('rtf').success).toBe(false);
    expect(exportFormatSchema.safeParse('DOCX').success).toBe(false);
  });

  it('C3: project.yaml accepts files with and without order and export, refuses the narrowed shapes, and the export settings reject an unknown bibliography mode', () => {
    const base = { schemaVersion: 1, title: 'T', genrePack: 'nonfiction' };
    const order = [{ path: 'drafts/ch01.md', status: 'final' }];
    const exportKey = { author: 'A', bibliography: 'all' };

    expect(projectYamlSchema.safeParse(base).success).toBe(true);
    expect(projectYamlSchema.safeParse({ ...base, order }).success).toBe(true);
    expect(
      projectYamlSchema.safeParse({ ...base, export: exportKey }).success,
    ).toBe(true);
    expect(
      projectYamlSchema.safeParse({ ...base, order, export: exportKey })
        .success,
    ).toBe(true);

    expect(
      projectYamlSchema.safeParse({
        ...base,
        order: [{ path: 'notes/ch01.md' }],
      }).success,
    ).toBe(false);
    expect(
      projectYamlSchema.safeParse({
        ...base,
        export: { bibliography: 'some' },
      }).success,
    ).toBe(false);
  });

  it('X1 to X4 (decisions of the plan): defaults are not written back, unknown keys survive, the placeholder pattern and error codes behave as stated', () => {
    // X1: defaults are constants, not Zod defaults.
    expect(exportSettingsSchema.parse({})).toEqual({});
    expect(orderEntrySchema.parse({ path: 'drafts/a.md' })).toEqual({
      path: 'drafts/a.md',
    });
    expect(BIBLIOGRAPHY_DEFAULT_BY_PACK.nonfiction).toBe('all');
    expect(BIBLIOGRAPHY_DEFAULT).toBe('off');

    // X2: unknown keys survive in an order entry and in export settings.
    expect(
      orderEntrySchema.parse({ path: 'drafts/a.md', futureKey: 1 }),
    ).toHaveProperty('futureKey', 1);
    expect(exportSettingsSchema.parse({ template: 'custom' })).toHaveProperty(
      'template',
      'custom',
    );

    // X3: the placeholder pattern.
    expect(PLACEHOLDER_PATTERN.test('TODO fix this')).toBe(true);
    expect(PLACEHOLDER_PATTERN.test('Hello {{author}}')).toBe(true);
    for (const text of ['TODOS', 'todo', 'TKTKS', '{x}']) {
      expect(PLACEHOLDER_PATTERN.test(text), text).toBe(false);
    }
    expect(PLACEHOLDER_WORDS).toHaveLength(5);

    // X4: error codes and the event union.
    expect(
      compileErrorCodeSchema.safeParse('COMPILE_SNAPSHOT_NOT_FOUND').success,
    ).toBe(true);
    expect(compileErrorCodeSchema.safeParse('COMPILE_nope').success).toBe(
      false,
    );
    for (const key of Object.keys(COMPILE_ERROR_STATUS)) {
      expect(COMPILE_ERROR_CODE_VALUES).toContain(key);
    }
    expect(
      compileExportEventSchema.safeParse({
        module: 'compile-export',
        type: 'snapshot-restored',
        data: { projectId: 'p1', snapshotId: 's1' },
      }).success,
    ).toBe(true);
    expect(
      compileExportEventSchema.safeParse({
        module: 'project-store',
        type: 'snapshot-restored',
        data: { projectId: 'p1', snapshotId: 's1' },
      }).success,
    ).toBe(false);
  });
});
