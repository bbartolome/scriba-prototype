import { Document, parseDocument } from 'yaml';
import { projectYamlSchema } from '@bbartolome/scriba-contracts/project-store';

// The project.yaml schema version this app writes and reads. A newer one is too-new, whatever else the file holds.
export const PROJECT_YAML_SCHEMA_VERSION = 1;

// One problem of a project.yaml: a Zod issue as it is, or, for a YAML syntax error, a path-less message.
export interface YamlIssue {
  path: PropertyKey[];
  message: string;
}

// The state of one project.yaml as discovery reads it. `importable` is a folder with no project.yaml.
export type YamlState =
  | { status: 'importable' }
  | { status: 'too-new' }
  | { status: 'ok'; title: string; genrePack: string }
  | { status: 'invalid'; error: string; issues: YamlIssue[] };

// Classifies the text of a project.yaml (P3, P4). Pure: the same text always gives the same state.
// The too-new threshold is currentVersion, the project.yaml version the registry reports (PST-23 C1).
export function readYamlState(
  text: string,
  currentVersion: number = PROJECT_YAML_SCHEMA_VERSION,
): YamlState {
  const doc = parseDocument(text);
  if (doc.errors.length > 0) {
    return invalidState([
      { path: [], message: firstLine(doc.errors[0].message) },
    ]);
  }
  const value: unknown = doc.toJS();
  if (isMapping(value)) {
    const version = value.schemaVersion;
    if (
      typeof version === 'number' &&
      Number.isInteger(version) &&
      version > currentVersion
    ) {
      return { status: 'too-new' };
    }
  }
  const parsed = projectYamlSchema.safeParse(value);
  if (!parsed.success) return invalidState(parsed.error.issues);
  return {
    status: 'ok',
    title: parsed.data.title,
    genrePack: parsed.data.genrePack,
  };
}

// An invalid state. Its one-line error is the first issue (P4).
export function invalidState(issues: YamlIssue[]): YamlState {
  return { status: 'invalid', error: oneLine(issues[0]), issues };
}

// The minimal project.yaml that New and Import write (P12): built as a document, written once, never edited
// as an object afterwards.
export function newProjectYaml(fields: {
  title: string;
  genrePack: string;
}): Document {
  return new Document({
    schemaVersion: PROJECT_YAML_SCHEMA_VERSION,
    title: fields.title,
    genrePack: fields.genrePack,
  });
}

function oneLine(issue: YamlIssue): string {
  if (issue.path.length === 0) return issue.message;
  return `${issue.path.map(String).join('.')}: ${issue.message}`;
}

function firstLine(text: string): string {
  return text.split('\n')[0] ?? text;
}

function isMapping(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
