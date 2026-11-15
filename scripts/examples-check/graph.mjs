import { readFileSync } from 'node:fs';
import { join, resolve, sep } from 'node:path';
import { issueLines, lstatOrNull, toRel, walk } from './lib.mjs';

// The graph layer of the examples check (PLT-21). Layer contract (D16): check(ctx) returns
// [{file, message}]. Every regular file under <sample>/graphs/ parses with the Graph runner's graph
// schema, and every story-node path names an existing file in the same sample.

// D7: one record {file, graph, issues} for each regular file under <sample>/graphs/, at any depth,
// sorted by path. graph is the schema-parsed graph when issues is empty, else null. PLT-22 reuses
// this. A missing graphs/ folder, or one that is a link or a file, yields no records.
export function graphFiles(ctx, sample) {
  return walk(join(sample.dir, 'graphs'))
    .filter((entry) => entry.kind === 'file')
    .map((entry) => parseGraphFile(ctx, entry.path));
}

export function check(ctx) {
  const issues = [];
  for (const sample of ctx.samples) {
    issues.push(...checkGraphsEntry(ctx, sample));
    for (const record of graphFiles(ctx, sample)) {
      issues.push(...record.issues);
      if (record.graph !== null && record.graph.view === 'story') {
        issues.push(...checkStoryPaths(sample, record));
      }
    }
  }
  return issues;
}

// D4: graphs/ is a folder, or missing (no issue), or a symbolic link (the M1 layer reports it).
function checkGraphsEntry(ctx, sample) {
  const path = join(sample.dir, 'graphs');
  const stat = lstatOrNull(path);
  if (stat !== null && stat.isFile()) {
    return [
      {
        file: toRel(ctx.root, path),
        message: 'graphs must be a folder, not a file',
      },
    ];
  }
  return [];
}

// D5: JSON.parse of the text, then the graph file schema. A parse failure is one issue.
function parseGraphFile(ctx, path) {
  const file = toRel(ctx.root, path);
  let value;
  try {
    value = JSON.parse(readFileSync(path, 'utf8'));
  } catch (error) {
    const firstLine = String(error.message).split('\n')[0];
    return {
      file,
      graph: null,
      issues: [{ file, message: `not valid JSON: ${firstLine}` }],
    };
  }
  const result = ctx.graphRunner.graphFileSchema.safeParse(value);
  if (!result.success) {
    return { file, graph: null, issues: issueLines(result, file) };
  }
  return { file, graph: result.data, issues: [] };
}

// D6: each node with a path must name a regular file inside the sample. A path that leaves the
// sample, a folder, a link and a missing file share one message. Label-only nodes are skipped.
function checkStoryPaths(sample, record) {
  const issues = [];
  for (const node of record.graph.nodes) {
    if (node.path === undefined) continue;
    if (!isExistingSampleFile(sample, node.path)) {
      issues.push({
        file: record.file,
        message: `node "${node.id}": path "${node.path}" is not an existing file in this sample`,
      });
    }
  }
  return issues;
}

function isExistingSampleFile(sample, path) {
  const target = resolve(sample.dir, path);
  if (!target.startsWith(sample.dir + sep)) return false;
  const stat = lstatOrNull(target);
  return stat !== null && stat.isFile();
}
