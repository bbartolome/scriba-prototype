import { readFileSync } from 'node:fs';
import { basename, join } from 'node:path';
import {
  isRealDirectory,
  issueLines,
  lexists,
  lstatOrNull,
  parseYamlFile,
  readFrontMatter,
  toRel,
  walk,
} from './lib.mjs';

// The M1 layer of the examples check (PLT-20): project.yaml, the entity base, excluded paths,
// samples.yaml, and the rule that unit tests never read examples/.
// Layer contract (D16): check(ctx) returns [{file, message}]; ctx.stats counts what was checked.

// Paths a sample must not ship; copies leave them out (project-relative).
const EXCLUDED_PATHS = ['.scriba', 'logs', 'snapshots', 'drafts/.versions'];

// Entity folders of a sample (D10). sources/ may omit type; the check fills 'source' there.
const ENTITY_FOLDERS = ['entities', 'sources'];

// D13: the test-file scan.
const TEST_FILE = /\.(test|spec)\.(ts|mjs|cjs|js)$/;
const EXEMPT_TEST_FILE = /^scripts\/examples-check[^/]*\.test\.mjs$/;
const SKIP_IN_TEST_SCAN = (name) =>
  name === 'node_modules' || name === 'dist' || name.startsWith('.');
// R1: examples/ as a path, or a relative path that ends at the folder name.
const R1 = [/(?:^|[/'"`])examples\//, /\/examples['"`]/];
// R2: a quoted examples next to a root, repo, here, dirname or cwd word.
const R2_QUOTED = /(['"`])examples\1/;
const R2_WORDS = /root|repo|here|dirname|cwd/i;

export function check(ctx) {
  const issues = [];
  if (lexists(ctx.examplesDir) && !isRealDirectory(ctx.examplesDir)) {
    issues.push({
      file: 'examples',
      message: 'examples must be a folder, not a file or a symbolic link',
    });
  }
  issues.push(...checkSamplesIndex(ctx));
  issues.push(...checkExamplesTree(ctx));
  for (const sample of ctx.samples) {
    issues.push(...checkSampleRoot(sample));
    const records = entityFiles(ctx, sample);
    ctx.stats.entityFiles += records.length;
    for (const record of records) {
      issues.push(...checkEntity(ctx, record));
    }
  }
  issues.push(...checkTestFiles(ctx));
  return issues;
}

// Every entity file of a sample (D10): each .md file under entities/ and sources/, with its parsed
// front matter and its effective type. PLT-22 reuses this.
export function entityFiles(ctx, sample) {
  const records = [];
  for (const folder of ENTITY_FOLDERS) {
    for (const entry of walk(join(sample.dir, folder))) {
      if (entry.kind !== 'file' || !entry.path.endsWith('.md')) continue;
      const parsed = readFrontMatter(readFileSync(entry.path, 'utf8'));
      let frontMatter = parsed.data;
      if (
        folder === 'sources' &&
        isPlainObject(frontMatter) &&
        frontMatter.type === undefined
      ) {
        frontMatter = { ...frontMatter, type: 'source' };
      }
      records.push({
        file: toRel(ctx.root, entry.path),
        frontMatter,
        type: isPlainObject(frontMatter) ? frontMatter.type : undefined,
        error: parsed.error,
      });
    }
  }
  return records;
}

// D7: samples.yaml is a list of {id, title, description}; absent means an empty list. Entries and
// sample folders must match one to one. The cross-check runs only when the file parses.
function checkSamplesIndex(ctx) {
  const file = 'examples/samples.yaml';
  if (!isRealDirectory(ctx.examplesDir)) return [];
  const path = join(ctx.examplesDir, 'samples.yaml');
  const stat = lstatOrNull(path);
  if (stat === null) return crossCheck(ctx, file, []);
  if (!stat.isFile()) {
    return [{ file, message: 'samples.yaml must be a file' }];
  }
  const parsed = parseYamlFile(path);
  if (parsed.error !== null) return [{ file, message: parsed.error }];
  const result = ctx.contracts.sampleListSchema.safeParse(parsed.value);
  if (!result.success) return issueLines(result, file);
  return crossCheck(
    ctx,
    file,
    result.data.map((entry) => entry.id),
  );
}

function crossCheck(ctx, file, ids) {
  const issues = [];
  const seen = new Set();
  const duplicated = new Set();
  for (const id of ids) {
    if (seen.has(id)) duplicated.add(id);
    seen.add(id);
  }
  for (const id of duplicated) {
    issues.push({ file, message: `duplicate sample id "${id}"` });
  }
  const folders = new Set(ctx.samples.map((sample) => sample.id));
  for (const id of seen) {
    if (!folders.has(id)) {
      issues.push({
        file,
        message: `sample "${id}" has no folder examples/${id}`,
      });
    }
  }
  for (const sample of ctx.samples) {
    if (!seen.has(sample.id)) {
      issues.push({
        file: `examples/${sample.id}`,
        message: 'no entry in examples/samples.yaml names this folder',
      });
    }
  }
  return issues;
}

// D9 and D12: every project.yaml at any depth is parsed with the Project store schema; every
// symbolic link under examples/ is an issue, and no link is followed.
function checkExamplesTree(ctx) {
  const issues = [];
  for (const entry of walk(ctx.examplesDir)) {
    const file = toRel(ctx.root, entry.path);
    if (entry.kind === 'symlink') {
      issues.push({
        file,
        message: 'symbolic links are not allowed in examples/',
      });
    } else if (
      entry.kind === 'file' &&
      basename(entry.path) === 'project.yaml'
    ) {
      ctx.stats.projectYaml += 1;
      const parsed = parseYamlFile(entry.path);
      if (parsed.error !== null) {
        issues.push({ file, message: parsed.error });
      } else {
        issues.push(
          ...issueLines(
            ctx.contracts.projectYamlSchema.safeParse(parsed.value),
            file,
          ),
        );
      }
    }
  }
  return issues;
}

// D8 and D11: a sample folder has its own project.yaml at its root and ships no excluded path.
function checkSampleRoot(sample) {
  const issues = [];
  const rel = `examples/${sample.id}`;
  // A symbolic link here is reported under D12 by the tree walk; a folder is not a project.yaml.
  if (!lstatOrNull(join(sample.dir, 'project.yaml'))?.isFile()) {
    issues.push({
      file: `${rel}/project.yaml`,
      message: 'sample folder has no project.yaml',
    });
  }
  for (const excluded of EXCLUDED_PATHS) {
    if (lexists(join(sample.dir, excluded))) {
      issues.push({
        file: `${rel}/${excluded}`,
        message: 'a sample must not ship this excluded path',
      });
    }
  }
  return issues;
}

function checkEntity(ctx, record) {
  if (record.error !== null) {
    return [{ file: record.file, message: record.error }];
  }
  return issueLines(
    ctx.contracts.entityBaseSchema.safeParse(record.frontMatter),
    record.file,
  );
}

// D13 (criterion 4): no unit test names examples/. Scans *.test.* and *.spec.* files, skipping
// node_modules, dist and dot-directories, and the examples-check layer tests themselves.
function checkTestFiles(ctx) {
  const issues = [];
  for (const entry of walk(ctx.root, SKIP_IN_TEST_SCAN)) {
    if (entry.kind !== 'file') continue;
    const file = toRel(ctx.root, entry.path);
    if (!TEST_FILE.test(file) || EXEMPT_TEST_FILE.test(file)) continue;
    ctx.stats.testFiles += 1;
    readFileSync(entry.path, 'utf8')
      .split('\n')
      .forEach((line, index) => {
        if (namesExamples(line)) {
          issues.push({
            file: `${file}:${index + 1}`,
            message: 'a unit test names examples/; use a temp folder',
          });
        }
      });
  }
  return issues;
}

function namesExamples(line) {
  return (
    R1.some((pattern) => pattern.test(line)) ||
    (R2_QUOTED.test(line) && R2_WORDS.test(line))
  );
}

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}
