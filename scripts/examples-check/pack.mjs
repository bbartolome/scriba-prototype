// The pack layer of the examples check (PLT-22). Layer contract: check(ctx) returns [{file, message}].
// It uses the Tool registry's own loader and validators, through the pack-lint library entry point
// (ctx.packs, ctx.library; see index.mjs). Plain Node ESM.

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { graphFiles } from './graph.mjs';
import { entityFiles } from './m1.mjs';
import { toRel, walk } from './lib.mjs';

// D10 (criterion 1): every tool node of a recipe names a built-in tool, and its params validate
// against that tool's inputs in params mode. Input and output nodes are not checked.
// D6 to D9 (criteria 2 and 3): entity front matter against the pack's entity-type schema, the
// references of each entity and each [@id] citation of drafts, and the ids taken from file names.
export function check(ctx) {
  const issues = [];
  for (const sample of ctx.samples) {
    for (const record of graphFiles(ctx, sample)) {
      if (record.graph === null || record.graph.view !== 'recipe') continue;
      for (const node of record.graph.nodes) {
        if (node.kind !== 'tool') continue;
        issues.push(...checkToolNode(ctx, record.file, node));
      }
    }
    issues.push(...checkEntities(ctx, sample));
  }
  return issues;
}

function checkToolNode(ctx, file, node) {
  const entry = ctx.packs.tools.find((tool) => tool.name === node.tool);
  if (entry === undefined) {
    return [
      {
        file,
        message: `node "${node.id}": tool "${node.tool}" is not a built-in tool`,
      },
    ];
  }
  if (!entry.valid) {
    return [
      {
        file,
        message: `node "${node.id}": tool "${node.tool}" is not a valid built-in tool`,
      },
    ];
  }
  try {
    ctx.library.validateArguments(
      { spec: entry.tool.spec, compiled: entry.tool.compiled },
      { mode: 'params', arguments: node.params ?? {} },
    );
    return [];
  } catch (error) {
    const issues = error?.details?.issues;
    if (!Array.isArray(issues)) throw error;
    return issues.map((issue) => ({
      file,
      message: `node "${node.id}": ${fieldOf(issue.path, '(params)')}: ${issue.message}`,
    }));
  }
}

function checkEntities(ctx, sample) {
  const records = entityFiles(ctx, sample);
  const targets = targetIndex(records);
  const issues = [];

  for (const record of records) {
    if (record.error !== null) continue; // PLT-20 reports the file (plans/PLT-20.md D10).
    const stemId = stemOf(record.file);
    if (!hasStringId(record.frontMatter)) {
      if (!ctx.contracts.ENTITY_ID_PATTERN.test(stemId)) {
        issues.push({
          file: record.file,
          message: `entity id "${stemId}" from the file name does not match ${ctx.contracts.ENTITY_ID_PATTERN.source}`,
        });
      }
    }
    if (typeof record.type !== 'string') continue;
    issues.push(...checkFrontMatter(ctx, record));
    issues.push(...checkReferences(ctx, record, targets));
  }

  issues.push(...checkCitations(ctx, sample, targets));
  return issues;
}

// D6: the front matter of a file with a built-in type validates against that type's schema.
function checkFrontMatter(ctx, record) {
  const entry = ctx.packs.entityTypes.get(record.type);
  if (entry === undefined) {
    return [
      {
        file: record.file,
        message: `type: "${record.type}" is not a built-in entity type`,
      },
    ];
  }
  const result = ctx.library.entityValidatorOf(entry)(record.frontMatter);
  return result.issues.map((issue) => ({
    file: record.file,
    message: `${fieldOf(issue.path)}: ${issue.message}`,
  }));
}

// D7: each reference field of the type (x-scriba-type: entity) names exactly one entity or source of
// the sample. A value of another shape is left to the schema check.
function checkReferences(ctx, record, targets) {
  const entry = ctx.packs.entityTypes.get(record.type);
  if (entry === undefined) return [];
  const properties = entry.spec.fields?.properties ?? {};
  const issues = [];
  for (const [field, schema] of Object.entries(properties)) {
    if (schema?.['x-scriba-type'] !== 'entity') continue;
    const value = record.frontMatter?.[field];
    const ids =
      typeof value === 'string'
        ? [value]
        : Array.isArray(value) &&
            value.every((item) => typeof item === 'string')
          ? value
          : [];
    for (const id of ids) {
      const problem = resolutionProblem(targets, id);
      if (problem !== null)
        issues.push({ file: record.file, message: `${field}: ${problem}` });
    }
  }
  return issues;
}

// D9: every [@id] and [@id1; @id2] in the prose of drafts, at any depth, names one target. Lines in a
// fenced block are skipped, and so is text inside an inline code span on one line.
function checkCitations(ctx, sample, targets) {
  const issues = [];
  const pattern = new RegExp(ctx.contracts.CITATION_PATTERN.source, 'g');
  for (const entry of walk(join(sample.dir, 'drafts'))) {
    if (entry.kind !== 'file' || !entry.path.endsWith('.md')) continue;
    const file = toRel(ctx.root, entry.path);
    let fenced = false;
    for (const line of readFileSync(entry.path, 'utf8').split('\n')) {
      const start = line.trimStart();
      if (start.startsWith('```') || start.startsWith('~~~')) {
        fenced = !fenced;
        continue;
      }
      if (fenced) continue;
      const prose = line.replace(/`[^`]*`/g, '');
      for (const match of prose.matchAll(pattern)) {
        for (const id of match[0].slice(2, -1).split('; @')) {
          const problem = resolutionProblem(targets, id);
          if (problem !== null) {
            issues.push({
              file,
              message: `[@${id}] ${problem.replace(`"${id}" `, '')}`,
            });
          }
        }
      }
    }
  }
  return issues;
}

// The entity and source files of a sample by id: the front-matter id when it is a string, otherwise
// the file stem (PST-08 line 22). Every record is listed, a broken one included, so a reference to it
// resolves to an existing file.
function targetIndex(records) {
  const targets = new Map();
  for (const record of records) {
    const id = hasStringId(record.frontMatter)
      ? record.frontMatter.id
      : stemOf(record.file);
    if (!targets.has(id)) targets.set(id, []);
    targets.get(id).push(record.file);
  }
  return targets;
}

// null when the id names exactly one file; otherwise the reason, as the tail of an issue line.
function resolutionProblem(targets, id) {
  const files = targets.get(id) ?? [];
  if (files.length === 1) return null;
  if (files.length === 0)
    return `"${id}" does not name an entity or source in this sample`;
  return `"${id}" names more than one file (${[...files].sort().join(', ')})`;
}

function hasStringId(frontMatter) {
  return (
    typeof frontMatter === 'object' &&
    frontMatter !== null &&
    typeof frontMatter.id === 'string'
  );
}

function stemOf(file) {
  return file.slice(file.lastIndexOf('/') + 1).replace(/\.md$/, '');
}

// A JSON Pointer as a dotted field name ('/evidence/1' is 'evidence.1'); the empty pointer is the root.
function fieldOf(pointer, root = '(root)') {
  return pointer === '' ? root : pointer.slice(1).split('/').join('.');
}
