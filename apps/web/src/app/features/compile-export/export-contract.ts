import type {
  BibliographyMode,
  CheckStatus,
  ExportFormat,
  ExportResult,
  ExportSettings,
  ExportSettingsView,
  FindingSeverity,
  PreflightCheck,
  PreflightCheckId,
  PreflightFinding,
  PreflightResult,
  PreflightSummary,
} from '@bbartolome/scriba-contracts/compile-export';
import type { ApiPath, ResponseSchema } from '../../shell';

// Hand-written copies of the preflight, export and export-settings routes, values and response shapes
// that the preflight and settings panels read. This file imports only types from the contract: the
// browser ships no runtime zod, so a value import would not load. export-contract.spec.ts (K1 to K3)
// checks each copy against the contract.

/** POST of a preflight run (`PREFLIGHT_ROUTE`). */
export const PREFLIGHT_PATH = '/api/compile-export/preflight' as ApiPath;
/** POST of an export run (`EXPORT_ROUTE`). */
export const EXPORT_PATH = '/api/compile-export/export' as ApiPath;
/** GET reads the export settings, POST writes them (`EXPORT_SETTINGS_ROUTE`). */
export const EXPORT_SETTINGS_PATH = '/api/compile-export/settings' as ApiPath;
/** POST copies the built-in template of a format into the project (`EXPORT_COPY_DEFAULT_ROUTE`). */
export const EXPORT_COPY_DEFAULT_PATH =
  '/api/compile-export/template/copy-default' as ApiPath;

/** The export formats, in the contract's order (`EXPORT_FORMATS`). */
export const EXPORT_FORMAT_VALUES = [
  'md',
  'docx',
  'epub',
  'pdf',
] as const satisfies readonly ExportFormat[];

/** The formats with a template override, in the contract's order (`TEMPLATE_FORMATS`). */
export const TEMPLATE_FORMAT_VALUES = [
  'docx',
  'epub',
  'pdf',
] as const satisfies readonly ExportFormat[];

/** The bibliography modes, in the contract's order (`BIBLIOGRAPHY_MODES`). */
export const BIBLIOGRAPHY_VALUES = [
  'off',
  'all',
  'cited',
] as const satisfies readonly BibliographyMode[];

/** The preflight checks, in the contract's order (`PREFLIGHT_CHECK_IDS`). */
export const PREFLIGHT_CHECK_VALUES = [
  'placeholders',
  'unsupported-claims',
  'orphan-scenes',
  'entity-links',
  'banned-phrases',
] as const satisfies readonly PreflightCheckId[];

const CHECK_STATUS_VALUES = [
  'pass',
  'warn',
  'fail',
] as const satisfies readonly CheckStatus[];

const SEVERITY_VALUES = [
  'error',
  'warning',
  'info',
] as const satisfies readonly FindingSeverity[];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isNonNegativeInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0;
}

function isPositiveInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 1;
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0;
}

function isOneOf<T extends string>(
  values: readonly T[],
  value: unknown,
): value is T {
  return (
    typeof value === 'string' && (values as readonly string[]).includes(value)
  );
}

// The shape of z.iso.datetime() for a UTC time: a date, a time, optional fractional seconds, and `Z`.
const UTC_ISO = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/;

// The shape of contentHashSchema: `sha256:` and 64 lowercase hex digits.
const REVISION = /^sha256:[0-9a-f]{64}$/;

function isUtcIso(value: unknown): value is string {
  return typeof value === 'string' && UTC_ISO.test(value);
}

function isRevision(value: unknown): value is string {
  return typeof value === 'string' && REVISION.test(value);
}

/** One finding, checked as preflightFindingSchema does. */
function findingOf(value: unknown): PreflightFinding | undefined {
  if (!isRecord(value)) return undefined;
  const { check, severity, path, line, offset, length, message, ref } = value;
  if (
    !isOneOf(PREFLIGHT_CHECK_VALUES, check) ||
    !isOneOf(SEVERITY_VALUES, severity) ||
    typeof path !== 'string' ||
    typeof message !== 'string'
  ) {
    return undefined;
  }
  if (line !== undefined && !isPositiveInteger(line)) return undefined;
  if (offset !== undefined && !isNonNegativeInteger(offset)) return undefined;
  if (length !== undefined && !isNonNegativeInteger(length)) return undefined;
  if (ref !== undefined && !isRecord(ref)) return undefined;
  const finding: PreflightFinding = { check, severity, path, message };
  if (line !== undefined) finding.line = line;
  if (offset !== undefined) finding.offset = offset;
  if (length !== undefined) finding.length = length;
  if (ref !== undefined) finding.ref = ref;
  return finding;
}

/** One check, checked as preflightCheckSchema does. */
function checkOf(value: unknown): PreflightCheck | undefined {
  if (!isRecord(value)) return undefined;
  const { id, status, findings } = value;
  if (
    !isOneOf(PREFLIGHT_CHECK_VALUES, id) ||
    !isOneOf(CHECK_STATUS_VALUES, status) ||
    !Array.isArray(findings)
  ) {
    return undefined;
  }
  const parsed: PreflightFinding[] = [];
  for (const item of findings) {
    const finding = findingOf(item);
    if (finding === undefined) return undefined;
    parsed.push(finding);
  }
  return { id, status, findings: parsed };
}

/** The result of a preflight run, checked as preflightResultSchema does. */
export const preflightResultCopy: ResponseSchema<PreflightResult> = {
  safeParse(data) {
    if (!isRecord(data)) {
      return { success: false, error: 'the result is not an object' };
    }
    const { ranAt, revision, checks } = data;
    if (!isUtcIso(ranAt) || !isRevision(revision)) {
      return { success: false, error: 'ranAt or revision does not match' };
    }
    if (!Array.isArray(checks)) {
      return { success: false, error: 'checks is not a list' };
    }
    const parsed: PreflightCheck[] = [];
    for (const item of checks) {
      const check = checkOf(item);
      if (check === undefined) {
        return { success: false, error: 'a check does not match' };
      }
      parsed.push(check);
    }
    return { success: true, data: { ranAt, revision, checks: parsed } };
  },
};

/** The counts of a preflight run, as preflightSummarySchema checks them. */
function summaryOf(value: unknown): PreflightSummary | undefined {
  if (!isRecord(value)) return undefined;
  const { ranAt, revision, errors, warnings, infos } = value;
  if (
    !isUtcIso(ranAt) ||
    !isRevision(revision) ||
    !isNonNegativeInteger(errors) ||
    !isNonNegativeInteger(warnings) ||
    !isNonNegativeInteger(infos)
  ) {
    return undefined;
  }
  return { ranAt, revision, errors, warnings, infos };
}

/** The result of an export run, checked as exportResultSchema does. */
export const exportResultCopy: ResponseSchema<ExportResult> = {
  safeParse(data) {
    if (!isRecord(data)) {
      return { success: false, error: 'the result is not an object' };
    }
    const { format, fileName, bytes, downloadUrl, preflight, warnings } = data;
    const summary = summaryOf(preflight);
    if (
      !isOneOf(EXPORT_FORMAT_VALUES, format) ||
      !isNonEmptyString(fileName) ||
      !isNonNegativeInteger(bytes) ||
      !isNonEmptyString(downloadUrl) ||
      summary === undefined ||
      !Array.isArray(warnings) ||
      !warnings.every((item) => typeof item === 'string')
    ) {
      return { success: false, error: 'the export result does not match' };
    }
    return {
      success: true,
      data: {
        format,
        fileName,
        bytes,
        downloadUrl,
        preflight: summary,
        warnings,
      },
    };
  },
};

/** The settings view, checked as exportSettingsViewSchema does. Unknown keys of the settings are kept. */
export const exportSettingsViewCopy: ResponseSchema<ExportSettingsView> = {
  safeParse(data) {
    if (!isRecord(data)) {
      return { success: false, error: 'the view is not an object' };
    }
    const { revision, settings } = data;
    if (!isRevision(revision) || !isRecord(settings)) {
      return { success: false, error: 'revision or settings does not match' };
    }
    for (const key of [
      'author',
      'penName',
      'contact',
      'subtitle',
      'lang',
      'rights',
      'dedication',
      'docxReferenceDoc',
      'epubCss',
      'typstTemplate',
    ]) {
      const item = settings[key];
      if (item !== undefined && typeof item !== 'string') {
        return { success: false, error: `${key} is not a string` };
      }
    }
    if (
      settings['bibliography'] !== undefined &&
      !isOneOf(BIBLIOGRAPHY_VALUES, settings['bibliography'])
    ) {
      return { success: false, error: 'bibliography is not a mode' };
    }
    return {
      success: true,
      data: { revision, settings: settings as ExportSettings },
    };
  },
};

/** The result of a copy-default write: the path, its hash and its mtime (`fileWriteResultSchema`). */
export interface FileWriteResult {
  readonly path: string;
  readonly hash: string;
  readonly mtime: string;
}

export const fileWriteResultCopy: ResponseSchema<FileWriteResult> = {
  safeParse(data) {
    if (!isRecord(data)) {
      return { success: false, error: 'the result is not an object' };
    }
    const { path, hash, mtime } = data;
    if (typeof path !== 'string' || !isRevision(hash) || !isUtcIso(mtime)) {
      return { success: false, error: 'the write result does not match' };
    }
    return { success: true, data: { path, hash, mtime } };
  },
};
