import { describe, expect, it } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';

interface PackageJson {
  dependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
  optionalDependencies?: Record<string, string>;
}

const PACKAGE_DIR = path.join(__dirname, '..');
const DIST_DIR = path.join(PACKAGE_DIR, 'dist');

const pkg = JSON.parse(
  fs.readFileSync(path.join(PACKAGE_DIR, 'package.json'), 'utf8'),
) as PackageJson;

function listJsFiles(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      return listJsFiles(full);
    }
    return entry.name.endsWith('.js') ? [full] : [];
  });
}

const REQUIRE_PATTERN = /require\(\s*(['"])([^'"]+)\1\s*\)/g;

// Non-relative require() specifiers in one built file.
function externalRequires(file: string): string[] {
  const source = fs.readFileSync(file, 'utf8');
  return [...source.matchAll(REQUIRE_PATTERN)]
    .map((match) => match[2])
    .filter(
      (specifier) => !specifier.startsWith('.') && !specifier.startsWith('/'),
    );
}

describe('runtime dependencies', () => {
  it('has zod as the only runtime dependency', () => {
    expect(Object.keys(pkg.dependencies ?? {})).toEqual(['zod']);
  });

  it('declares no peer or optional dependencies', () => {
    expect(pkg.peerDependencies).toBeUndefined();
    expect(pkg.optionalDependencies).toBeUndefined();
  });

  it('the built JS requires only zod from outside the package', () => {
    const specifiers = new Set(listJsFiles(DIST_DIR).flatMap(externalRequires));
    expect([...specifiers].sort()).toEqual(['zod']);
  });
});
