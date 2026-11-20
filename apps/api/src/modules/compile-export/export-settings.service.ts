import { createHash } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { parseDocument } from 'yaml';
import {
  BIBLIOGRAPHY_DEFAULT,
  BIBLIOGRAPHY_DEFAULT_BY_PACK,
  COMPILE_ERROR_CODES,
  COMPILE_ERROR_STATUS,
  EXPORT_LANG_DEFAULT,
  type ExportSettings,
  type ExportSettingsView,
  type ExportSettingsWrite,
  exportSettingsSchema,
} from '@bbartolome/scriba-contracts/compile-export';
import {
  PROJECT_ERROR_CODES,
  PROJECT_ERROR_STATUS,
  projectYamlSchema,
} from '@bbartolome/scriba-contracts/project-store';
import { ModuleError } from '../platform/platform.module';
import {
  FilesService,
  ProjectStoreService,
} from '../project-store/project-store.module';

// Fixed messages of the settings. No input value is echoed.
const NO_ACTIVE_MESSAGE = 'No project is active. Activate a project first.';
const INVALID_MESSAGE = 'project.yaml is not valid. Fix it and try again.';
const CONFLICT_MESSAGE =
  'The export settings changed since they were read. Reload them and try again.';

// The settings revision (D2): the same form as the manuscript revision, over the `export` key only, as the YAML
// document holds it (before any schema default).
export function settingsRevisionOf(raw: unknown): string {
  const digest = createHash('sha256')
    .update(JSON.stringify(raw ?? null))
    .digest('hex');
  return `sha256:${digest}`;
}

// The stored settings plus the two read-time defaults (D3). Defaults are never written (U1).
export function effectiveSettingsOf(
  stored: ExportSettings,
  genrePack: string,
): ExportSettings {
  const lang =
    stored.lang === undefined || stored.lang === ''
      ? EXPORT_LANG_DEFAULT
      : stored.lang;
  const packDefault = Object.entries(BIBLIOGRAPHY_DEFAULT_BY_PACK).find(
    ([key]) => key === genrePack,
  );
  const bibliography =
    stored.bibliography ?? packDefault?.[1] ?? BIBLIOGRAPHY_DEFAULT;
  return { ...stored, lang, bibliography };
}

// Export settings: the read of the `export` key of project.yaml and its write (CEX-14, U1, D1 to D4). The active
// project only.
@Injectable()
export class ExportSettingsService {
  constructor(
    private readonly store: ProjectStoreService,
    private readonly files: FilesService,
  ) {}

  // The stored `export` key and the genre pack of the active project, read without any write.
  storedOf(projectId: string): { raw: unknown; stored: ExportSettings } {
    const parsed = this.read(projectId);
    return {
      raw: parsed.raw,
      stored: exportSettingsSchema.parse(parsed.raw ?? {}),
    };
  }

  // GET: the revision and the settings with the read-time defaults (D3).
  view(): ExportSettingsView {
    return this.viewOf(this.activeProjectId());
  }

  // POST (D4): a stale revision is refused and nothing is written; otherwise the body's keys replace the stored
  // ones, and only the `export` key of project.yaml changes.
  write(request: ExportSettingsWrite): ExportSettingsView {
    const projectId = this.activeProjectId();
    const { raw } = this.read(projectId);
    if (request.revision !== settingsRevisionOf(raw)) {
      throw new ModuleError(
        COMPILE_ERROR_CODES.ORDER_CONFLICT,
        COMPILE_ERROR_STATUS.COMPILE_ORDER_CONFLICT,
        CONFLICT_MESSAGE,
      );
    }
    const merged: Record<string, unknown> = {
      ...(isRecord(raw) ? raw : {}),
    };
    for (const [key, value] of Object.entries(request.settings)) {
      // An empty text or override value is unset, as the assembly treats it (O3).
      if (value === '' && key !== 'bibliography') delete merged[key];
      else merged[key] = value;
    }
    exportSettingsSchema.parse(merged);
    this.files.updateProjectYaml(projectId, { export: merged });
    return this.viewOf(projectId);
  }

  private viewOf(projectId: string): ExportSettingsView {
    const { raw, genrePack } = this.read(projectId);
    const stored = exportSettingsSchema.parse(raw ?? {});
    return {
      revision: settingsRevisionOf(raw),
      settings: effectiveSettingsOf(stored, genrePack),
    };
  }

  // project.yaml, parsed and checked against the whole project schema. `raw` is the `export` key as the YAML holds
  // it, which the revision is taken from (D2).
  private read(projectId: string): { raw: unknown; genrePack: string } {
    const doc = parseDocument(
      this.files.read(projectId, 'project.yaml').content,
    );
    if (doc.errors.length > 0) throw invalidProject();
    const js = doc.toJS() as unknown;
    const parsed = projectYamlSchema.safeParse(js);
    if (!parsed.success) throw invalidProject();
    const record = isRecord(js) ? js : {};
    return { raw: record.export, genrePack: parsed.data.genrePack };
  }

  // The active project's id, refused with the project store's code when none is active.
  private activeProjectId(): string {
    const projectId = this.store.activeId();
    if (projectId === null) {
      throw new ModuleError(
        PROJECT_ERROR_CODES.NO_ACTIVE,
        PROJECT_ERROR_STATUS.PROJECT_NO_ACTIVE,
        NO_ACTIVE_MESSAGE,
      );
    }
    return projectId;
  }
}

function invalidProject(): ModuleError {
  return new ModuleError(
    PROJECT_ERROR_CODES.INVALID,
    PROJECT_ERROR_STATUS.PROJECT_INVALID,
    INVALID_MESSAGE,
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
