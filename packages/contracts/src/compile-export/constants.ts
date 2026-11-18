// Constants of the compile-export slice. The manuscript shapes are defined in project-store/order-export.ts (CEX-01, section 4a) and re-exported here unchanged.
import { z } from 'zod';
import {
  BIBLIOGRAPHY_MODES,
  bibliographyModeSchema,
  MANUSCRIPT_FOLDER,
  MANUSCRIPT_PARTS,
  MANUSCRIPT_PATH_PATTERN,
  MANUSCRIPT_STATUSES,
  manuscriptPartSchema,
  manuscriptStatusSchema,
} from '../project-store/order-export.js';
import type {
  BibliographyMode,
  ManuscriptPart,
  ManuscriptStatus,
} from '../project-store/order-export.js';

export {
  BIBLIOGRAPHY_MODES,
  bibliographyModeSchema,
  MANUSCRIPT_FOLDER,
  MANUSCRIPT_PARTS,
  MANUSCRIPT_PATH_PATTERN,
  MANUSCRIPT_STATUSES,
  manuscriptPartSchema,
  manuscriptStatusSchema,
};
export type { BibliographyMode, ManuscriptPart, ManuscriptStatus };

// Defaults are constants, never Zod defaults: they are applied at read time and never written back.
export const MANUSCRIPT_STATUS_DEFAULT = 'draft';
export const MANUSCRIPT_PART_DEFAULT = 'body';

// Where the manuscript's order came from.
export const ORDER_SOURCES = [
  'alphabetical',
  'project',
  'graph+project',
] as const;
export const orderSourceSchema = z.enum(ORDER_SOURCES);

// Export formats. md has no template; the template formats are the ones with a template override.
export const EXPORT_FORMATS = ['md', 'docx', 'epub', 'pdf'] as const;
export const exportFormatSchema = z.enum(EXPORT_FORMATS);

export const TEMPLATE_FORMATS = ['docx', 'epub', 'pdf'] as const;
export const templateFormatSchema = z.enum(TEMPLATE_FORMATS);

// The bibliography default is off, except for a pack listed here.
export const BIBLIOGRAPHY_DEFAULT = 'off' satisfies BibliographyMode;
export const BIBLIOGRAPHY_DEFAULT_BY_PACK = { nonfiction: 'all' } as const;

export const EXPORT_LANG_DEFAULT = 'en';

// Preflight checks, their finding severities and their statuses.
export const PREFLIGHT_CHECK_IDS = [
  'placeholders',
  'unsupported-claims',
  'orphan-scenes',
  'entity-links',
  'banned-phrases',
] as const;
export const preflightCheckIdSchema = z.enum(PREFLIGHT_CHECK_IDS);

export const FINDING_SEVERITIES = ['error', 'warning', 'info'] as const;
export const findingSeveritySchema = z.enum(FINDING_SEVERITIES);

export const CHECK_STATUSES = ['pass', 'warn', 'fail'] as const;
export const checkStatusSchema = z.enum(CHECK_STATUSES);

// Placeholder words match whole words, case-sensitive. `{{...}}` is an unrendered placeholder.
export const PLACEHOLDER_WORDS = [
  'TK',
  'TKTK',
  'TODO',
  'FIXME',
  'XXX',
] as const;
export const PLACEHOLDER_PATTERN =
  /\b(?:TKTK|TK|TODO|FIXME|XXX)\b|\{\{[^{}\n]*\}\}/;

// The schema version of a snapshot manifest.
export const SNAPSHOT_SCHEMA_VERSION = 1;

export type OrderSource = z.infer<typeof orderSourceSchema>;
export type ExportFormat = z.infer<typeof exportFormatSchema>;
export type TemplateFormat = z.infer<typeof templateFormatSchema>;
export type PreflightCheckId = z.infer<typeof preflightCheckIdSchema>;
export type FindingSeverity = z.infer<typeof findingSeveritySchema>;
export type CheckStatus = z.infer<typeof checkStatusSchema>;
