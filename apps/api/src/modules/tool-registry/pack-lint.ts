import { readFileSync } from 'node:fs';
import type { LintDiagnostic } from '@bbartolome/scriba-contracts/tool-registry';
import { lintEntityTypeSource, lintToolSource, topKeyPosition } from './lint';
import { builtinFiles } from './packs';

// The pack-lint library (TRG-07). It lints every built-in tool and entity-type file of a packs root, read the way the
// runtime loader reads them, and returns the diagnostics with the file of each. The CLI, the examples check and the
// Genre packs' tests all use this one entry point.

// One diagnostic of a packs root, with the file it is in, as `core/tools/x.yaml` under the packs root.
export interface PackFinding extends LintDiagnostic {
  file: string;
}

// Lints the built-in packs of a packs root. Entity types first, because the tools check their kinds against the
// kinds that the entity types declare. Duplicate tool names and entity kinds across the packs are errors here.
export function lintPacks(packsRoot: string): PackFinding[] {
  const findings: PackFinding[] = [];
  const push = (file: string, lint: LintDiagnostic[]): void => {
    for (const diagnostic of lint) findings.push({ ...diagnostic, file });
  };

  const entityFiles = builtinFiles(packsRoot, 'entity-types');
  const kinds = new Set<string>();
  for (const file of entityFiles.files) {
    const lint = lintEntityTypeSource(readFileSync(file.path, 'utf8'), {
      stem: file.stem,
    });
    if (!lint.some((diagnostic) => diagnostic.severity === 'error')) {
      kinds.add(file.stem);
    }
    push(file.label, lint);
  }
  for (const file of entityFiles.duplicates) {
    const source = readFileSync(file.path, 'utf8');
    push(file.label, lintEntityTypeSource(source, { stem: file.stem }));
    push(file.label, [
      {
        severity: 'error',
        rule: 'duplicate-name',
        message: `the entity kind "${file.stem}" is defined in two built-in packs, ${file.first} and ${file.origin}`,
        ...topKeyPosition(source, 'kind'),
      },
    ]);
  }

  const toolFiles = builtinFiles(packsRoot, 'tools');
  for (const file of [...toolFiles.files, ...toolFiles.duplicates]) {
    const source = readFileSync(file.path, 'utf8');
    push(
      file.label,
      lintToolSource(source, { name: file.stem, entityKinds: kinds }).lint,
    );
  }
  for (const file of toolFiles.duplicates) {
    const source = readFileSync(file.path, 'utf8');
    push(file.label, [
      {
        severity: 'error',
        rule: 'duplicate-name',
        message: `the tool "${file.stem}" is defined in two built-in packs, ${file.first} and ${file.origin}`,
        ...topKeyPosition(source, 'name'),
      },
    ]);
  }

  return findings.sort(
    (a, b) =>
      compareText(a.file, b.file) ||
      a.line - b.line ||
      a.column - b.column ||
      compareText(a.rule, b.rule),
  );
}

function compareText(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

// One finding as one stderr line: `file:line:column severity rule: message`.
export function formatFinding(finding: PackFinding): string {
  return `${finding.file}:${finding.line}:${finding.column} ${finding.severity} ${finding.rule}: ${finding.message}`;
}
