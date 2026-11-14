import { createRequire } from 'node:module';
import { lstatSync, readdirSync, readFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { parse } from 'yaml';

// Helpers of the examples check (PLT-20). Plain Node ESM.

// The contracts are resolved from apps/api, the workspace that declares them, and always from the
// repository the script lives in, never from --root: the test trees have no apps/api folder.
export function requireContracts(scriptRoot) {
  const fromApi = createRequire(
    join(scriptRoot, 'apps', 'api', 'package.json'),
  );
  return fromApi('@bbartolome/scriba-contracts/project-store');
}

// Lists every entry under dir with its lstat kind: 'file', 'dir', 'symlink' or 'other', sorted by
// path. Symbolic links are listed and never followed. A root that is not a real directory yields
// nothing. skipDir(name) decides which subdirectories are not entered; they are still listed.
export function walk(dir, skipDir = () => false) {
  if (!isRealDirectory(dir)) return [];
  const entries = [];
  const visit = (current) => {
    for (const dirent of readdirSync(current, { withFileTypes: true })) {
      const path = join(current, dirent.name);
      const stat = lstatSync(path);
      if (stat.isSymbolicLink()) {
        entries.push({ path, kind: 'symlink' });
      } else if (stat.isDirectory()) {
        entries.push({ path, kind: 'dir' });
        if (!skipDir(dirent.name)) visit(path);
      } else if (stat.isFile()) {
        entries.push({ path, kind: 'file' });
      } else {
        entries.push({ path, kind: 'other' });
      }
    }
  };
  visit(dir);
  return entries.sort((a, b) => compareText(a.path, b.path));
}

export function lstatOrNull(path) {
  try {
    return lstatSync(path);
  } catch {
    return null;
  }
}

export function lexists(path) {
  return lstatOrNull(path) !== null;
}

export function isRealDirectory(path) {
  const stat = lstatOrNull(path);
  return stat !== null && stat.isDirectory();
}

// Sample folders: immediate subdirectories of examples/ whose names do not start with a dot.
// A symbolic link is not a folder here; the walk reports it.
export function discoverSamples(examplesDir) {
  if (!isRealDirectory(examplesDir)) return [];
  return readdirSync(examplesDir, { withFileTypes: true })
    .filter((dirent) => dirent.isDirectory() && !dirent.name.startsWith('.'))
    .map((dirent) => ({ id: dirent.name, dir: join(examplesDir, dirent.name) }))
    .sort((a, b) => compareText(a.id, b.id));
}

// Front matter: a first line of ---, YAML, and a closing --- line. No opening line means no front
// matter, read as {}. The result is {data, error}; error is a one-line message or null.
export function readFrontMatter(text) {
  const lines = text.split('\n').map((line) => line.replace(/\r$/, ''));
  if (lines[0] !== '---') return { data: {}, error: null };
  const close = lines.indexOf('---', 1);
  if (close === -1) {
    return {
      data: undefined,
      error: 'front matter is not closed: no closing --- line',
    };
  }
  const parsed = parseYamlText(lines.slice(1, close).join('\n'));
  if (parsed.error !== null) return { data: undefined, error: parsed.error };
  return { data: parsed.value ?? {}, error: null };
}

// Returns {value, error}; error is a one-line message or null.
export function parseYamlText(text) {
  try {
    return { value: parse(text), error: null };
  } catch (error) {
    const firstLine = String(error.message).split('\n')[0];
    return { value: undefined, error: `not valid YAML: ${firstLine}` };
  }
}

export function parseYamlFile(path) {
  return parseYamlText(readFileSync(path, 'utf8'));
}

// One issue per zod issue: the path joined with '.' (or '(root)') and the zod message.
export function issueLines(result, file) {
  if (result.success) return [];
  return result.error.issues.map((issue) => ({
    file,
    message: `${issue.path.length > 0 ? issue.path.map(String).join('.') : '(root)'}: ${issue.message}`,
  }));
}

export function toRel(root, path) {
  return relative(root, path).split(sep).join('/');
}

export function compareText(a, b) {
  if (a < b) return -1;
  if (a > b) return 1;
  return 0;
}
