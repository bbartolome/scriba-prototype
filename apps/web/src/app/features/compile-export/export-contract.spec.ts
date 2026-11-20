import {
  copyDefaultRequestSchema,
  EXPORT_COPY_DEFAULT_ROUTE,
  EXPORT_FORMATS,
  EXPORT_ROUTE,
  EXPORT_SETTINGS_ROUTE,
  exportRequestSchema,
  exportResultSchema,
  exportSettingsViewSchema,
  exportSettingsWriteSchema,
  BIBLIOGRAPHY_MODES,
  PREFLIGHT_CHECK_IDS,
  PREFLIGHT_ROUTE,
  preflightRequestSchema,
  preflightResultSchema,
  TEMPLATE_FORMATS,
} from '@bbartolome/scriba-contracts/compile-export';
import { fileWriteResultSchema } from '@bbartolome/scriba-contracts/project-store';
import { describe, expect, it } from 'vitest';
import {
  BIBLIOGRAPHY_VALUES,
  EXPORT_COPY_DEFAULT_PATH,
  EXPORT_FORMAT_VALUES,
  EXPORT_PATH,
  EXPORT_SETTINGS_PATH,
  exportResultCopy,
  exportSettingsViewCopy,
  fileWriteResultCopy,
  PREFLIGHT_CHECK_VALUES,
  PREFLIGHT_PATH,
  preflightResultCopy,
  TEMPLATE_FORMAT_VALUES,
} from './export-contract';

const REV = `sha256:${'a'.repeat(64)}`;
const RAN_AT = '2026-11-19T10:15:00.250Z';

const CHECKS = PREFLIGHT_CHECK_IDS.map((id) => ({
  id,
  status: 'pass',
  findings: [],
}));

const FINDING = {
  check: 'placeholders',
  severity: 'error',
  path: 'drafts/ch01.md',
  line: 1,
  offset: 0,
  message: 'TK',
};

const RESULT = { ranAt: RAN_AT, revision: REV, checks: CHECKS };

const SUMMARY = {
  ranAt: RAN_AT,
  revision: REV,
  errors: 0,
  warnings: 0,
  infos: 0,
};

const EXPORT_ANSWER = {
  format: 'docx',
  fileName: 'book.docx',
  bytes: 2048,
  downloadUrl: '/api/compile-export/exports/docx',
  preflight: SUMMARY,
  warnings: ['A warning.'],
};

const SETTINGS_VIEW = {
  revision: REV,
  settings: { author: 'A. Author', bibliography: 'cited' },
};

describe('export-contract', () => {
  it('K1 preflightResultCopy accepts and refuses what preflightResultSchema does', () => {
    const accepted: unknown[] = [
      RESULT,
      {
        ...RESULT,
        checks: [
          { ...CHECKS[0], status: 'fail', findings: [FINDING] },
          ...CHECKS.slice(1),
        ],
      },
    ];
    const refused: unknown[] = [
      {
        ...RESULT,
        checks: [...CHECKS, { id: 'other', status: 'pass', findings: [] }],
      },
      {
        ...RESULT,
        checks: [
          { ...CHECKS[0], findings: [{ ...FINDING, severity: 'critical' }] },
        ],
      },
      { ...RESULT, ranAt: '2026-11-19T10:15:00+01:00' },
      {
        ...RESULT,
        checks: [{ ...CHECKS[0], findings: [{ ...FINDING, line: 0 }] }],
      },
      { ...RESULT, revision: 'sha256:xyz' },
    ];
    for (const fixture of accepted) {
      expect(preflightResultSchema.safeParse(fixture).success).toBe(true);
      expect(preflightResultCopy.safeParse(fixture).success).toBe(true);
    }
    for (const fixture of refused) {
      expect(preflightResultSchema.safeParse(fixture).success).toBe(false);
      expect(preflightResultCopy.safeParse(fixture).success).toBe(false);
    }
  });

  it('K2 the routes equal the contract, and the value lists equal the contract lists', () => {
    expect(PREFLIGHT_PATH).toBe(PREFLIGHT_ROUTE);
    expect(EXPORT_PATH).toBe(EXPORT_ROUTE);
    expect(EXPORT_SETTINGS_PATH).toBe(EXPORT_SETTINGS_ROUTE);
    expect(EXPORT_COPY_DEFAULT_PATH).toBe(EXPORT_COPY_DEFAULT_ROUTE);
    expect(EXPORT_FORMAT_VALUES).toEqual(EXPORT_FORMATS);
    expect(TEMPLATE_FORMAT_VALUES).toEqual(TEMPLATE_FORMATS);
    expect(BIBLIOGRAPHY_VALUES).toEqual(BIBLIOGRAPHY_MODES);
    expect(PREFLIGHT_CHECK_VALUES).toEqual(PREFLIGHT_CHECK_IDS);
  });

  it('K3 the other copies and the request bodies match their schemas', () => {
    expect(exportResultCopy.safeParse(EXPORT_ANSWER).success).toBe(true);
    expect(exportResultSchema.safeParse(EXPORT_ANSWER).success).toBe(true);
    const badExport = { ...EXPORT_ANSWER, format: 'rtf' };
    expect(exportResultCopy.safeParse(badExport).success).toBe(false);
    expect(exportResultSchema.safeParse(badExport).success).toBe(false);

    for (const fixture of [SETTINGS_VIEW, { revision: REV, settings: {} }]) {
      expect(exportSettingsViewCopy.safeParse(fixture).success).toBe(true);
      expect(exportSettingsViewSchema.safeParse(fixture).success).toBe(true);
    }
    const badView = { revision: REV, settings: { bibliography: 'some' } };
    expect(exportSettingsViewCopy.safeParse(badView).success).toBe(false);
    expect(exportSettingsViewSchema.safeParse(badView).success).toBe(false);

    const write = { path: 'reference.docx', hash: REV, mtime: RAN_AT };
    expect(fileWriteResultCopy.safeParse(write).success).toBe(true);
    expect(fileWriteResultSchema.safeParse(write).success).toBe(true);
    const badWrite = { ...write, mtime: '2026-11-19T10:15:00' };
    expect(fileWriteResultCopy.safeParse(badWrite).success).toBe(false);
    expect(fileWriteResultSchema.safeParse(badWrite).success).toBe(false);

    expect(exportRequestSchema.safeParse({ format: 'docx' }).success).toBe(
      true,
    );
    expect(preflightRequestSchema.safeParse({}).success).toBe(true);
    expect(
      exportSettingsWriteSchema.safeParse({
        revision: REV,
        settings: { subtitle: 'A Subtitle' },
      }).success,
    ).toBe(true);
    expect(
      copyDefaultRequestSchema.safeParse({
        format: 'docx',
        path: 'custom-reference.docx',
      }).success,
    ).toBe(true);
  });
});
