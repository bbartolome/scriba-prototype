import { Document } from 'yaml';
import { patternToRegExp } from './pending-store';

// The file kind of project.yaml. Its migrators are the Project store's own (PST-23 C1).
export const PROJECT_YAML_KIND = 'project-yaml';

// One step of a migration: it changes the document from its version to the next one (PST-23 C2). A step works on
// the YAML document, or on the parsed JSON document of a .json file, so comments and key order survive.
export type MigrationStep = (doc: Document) => void;

// A migrator of one file kind: the path pattern it applies to, its steps keyed by fromVersion, and the current
// version of the kind. A file whose version is above currentVersion is too new (PST-06, P13).
export interface Migrator {
  kind: string;
  pattern: string;
  regex: RegExp;
  steps: Readonly<Record<number, MigrationStep>>;
  currentVersion: number;
}

// Builds a migrator. The steps must be exactly the keys 1 to currentVersion - 1, so every older version has a step.
export function newMigrator(
  kind: string,
  pattern: string,
  steps: Readonly<Record<number, MigrationStep>>,
  currentVersion: number,
): Migrator {
  if (!Number.isInteger(currentVersion) || currentVersion < 1) {
    throw new Error(
      'A migrator needs an integer current version of at least 1.',
    );
  }
  const keys = Object.keys(steps)
    .map(Number)
    .sort((a, b) => a - b);
  const expected = Array.from({ length: currentVersion - 1 }, (_, i) => i + 1);
  if (
    keys.length !== expected.length ||
    keys.some((key, i) => key !== expected[i])
  ) {
    throw new Error(
      'A migrator needs one step for each version below its current version.',
    );
  }
  return {
    kind,
    pattern,
    regex: patternToRegExp(pattern),
    steps,
    currentVersion,
  };
}

// The top-level schemaVersion of a document, when it is an integer. Anything else has no version (PST-23 C3).
export function versionOf(doc: Document): number | undefined {
  const value: unknown = doc.toJS();
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return undefined;
  }
  const version = (value as Record<string, unknown>).schemaVersion;
  return typeof version === 'number' && Number.isInteger(version)
    ? version
    : undefined;
}

// Runs the steps from version `from` up to the current version, setting schemaVersion after each one (PST-23 C2).
export function upgradeDocument(
  migrator: Migrator,
  doc: Document,
  from: number,
): void {
  for (let version = from; version < migrator.currentVersion; version++) {
    (migrator.steps[version] as MigrationStep)(doc);
    doc.set('schemaVersion', version + 1);
  }
}
