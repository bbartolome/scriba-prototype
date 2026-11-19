import { Injectable } from '@nestjs/common';
import { parseDocument } from 'yaml';
import {
  BIBLIOGRAPHY_DEFAULT,
  BIBLIOGRAPHY_DEFAULT_BY_PACK,
  EXPORT_LANG_DEFAULT,
  type BibliographyMode,
  type ManuscriptPart,
} from '@bbartolome/scriba-contracts/compile-export';
import {
  PROJECT_ERROR_CODES,
  PROJECT_ERROR_STATUS,
  projectYamlSchema,
  type ProjectYaml,
} from '@bbartolome/scriba-contracts/project-store';
import { ModuleError } from '../platform/platform.module';
import {
  EntitiesService,
  FilesService,
  ProjectStoreService,
} from '../project-store/project-store.module';
import { PreferencesReader } from '../setup-auth/setup-auth.module';
import { ManuscriptService } from './manuscript.service';
import {
  renderDocument,
  type AssemblyParts,
  type BibliographyEntry,
  type MetadataValues,
} from './assembly';
import { citationIds, splitFrontMatter } from './markdown-text';

// Fixed messages of this module. No input value is echoed.
const NO_ACTIVE_MESSAGE = 'No project is active. Activate a project first.';
const PROJECT_INVALID_MESSAGE =
  'The project.yaml does not match the project schema.';

// A manuscript file of the view, with its part and its full text.
interface ManuscriptText {
  path: string;
  part: ManuscriptPart;
  content: string;
}

// The empty string is unset (S6, S14).
function nonEmpty(value: string | undefined): string | undefined {
  return value !== undefined && value !== '' ? value : undefined;
}

// The assembled Markdown of the active project (P4 to P13). Only reads; the builder publishes no event and writes
// nothing. CEX-10 calls it with the export time.
@Injectable()
export class AssemblyService {
  constructor(
    private readonly store: ProjectStoreService,
    private readonly files: FilesService,
    private readonly entities: EntitiesService,
    private readonly preferences: PreferencesReader,
    private readonly manuscript: ManuscriptService,
  ) {}

  // The document of the active project at `now` (P12).
  assemble(now: Date): string {
    const projectId = this.activeProjectId();
    const project = this.projectYaml(projectId);
    const settings = project.export ?? {};
    const prefs = this.preferences.read();
    const view = this.manuscript.view();

    const manuscript: ManuscriptText[] = view.entries.map((entry) => ({
      path: entry.path,
      part: entry.part,
      content: this.files.read(projectId, entry.path).content,
    }));

    const mode = this.bibliographyMode(
      project.genrePack,
      settings.bibliography,
    );
    let bibliography: BibliographyEntry[] | undefined;
    if (mode !== 'off') {
      const cited =
        mode === 'cited'
          ? this.citedIds(manuscript.map((file) => file.content))
          : undefined;
      bibliography = this.bibliographyEntries(projectId, cited);
    }

    const metadata: MetadataValues = {
      title: project.title,
      lang: nonEmpty(settings.lang) ?? EXPORT_LANG_DEFAULT,
      date: now.toISOString().slice(0, 10),
      identifier: `urn:scriba:${projectId}`,
      wordcount: Math.round(view.totals.body / 1000) * 1000,
    };
    const subtitle = nonEmpty(settings.subtitle);
    const author = nonEmpty(settings.author) ?? nonEmpty(prefs.authorName);
    const rights = nonEmpty(settings.rights);
    const contact = nonEmpty(settings.contact);
    if (subtitle !== undefined) metadata.subtitle = subtitle;
    if (author !== undefined) metadata.author = author;
    if (rights !== undefined) metadata.rights = rights;
    if (contact !== undefined) metadata.contact = contact;

    const parts: AssemblyParts = {
      front: this.bodiesOf(manuscript, 'front'),
      body: this.bodiesOf(manuscript, 'body'),
      back: this.bodiesOf(manuscript, 'back'),
    };
    const dedication = nonEmpty(settings.dedication);
    if (dedication !== undefined) parts.dedication = dedication;
    if (bibliography !== undefined) parts.bibliography = bibliography;

    return renderDocument(metadata, parts);
  }

  // The active project's id (P13).
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

  // project.yaml, parsed and checked against the whole project schema (P13).
  private projectYaml(projectId: string): ProjectYaml {
    const doc = parseDocument(
      this.files.read(projectId, 'project.yaml').content,
    );
    if (doc.errors.length > 0) throw this.invalidProject();
    const parsed = projectYamlSchema.safeParse(doc.toJS());
    if (!parsed.success) throw this.invalidProject();
    return parsed.data;
  }

  // The bibliography mode (P8): the export value, then the pack default, then the global default. The pack is found
  // with Object.entries, so an inherited key never matches.
  private bibliographyMode(
    genrePack: string,
    setting: BibliographyMode | undefined,
  ): BibliographyMode {
    if (setting !== undefined) return setting;
    const pack = Object.entries(BIBLIOGRAPHY_DEFAULT_BY_PACK).find(
      ([key]) => key === genrePack,
    );
    return pack?.[1] ?? BIBLIOGRAPHY_DEFAULT;
  }

  // The ids cited in the bodies of every manuscript file (P10).
  private citedIds(texts: string[]): Set<string> {
    const ids = new Set<string>();
    for (const text of texts) {
      for (const id of citationIds(text)) ids.add(id);
    }
    return ids;
  }

  // The bibliography entries (P9, P11): every Source, or the cited ones when `cited` is given. A Source with no usable
  // citation is listed by its title, else its id (P9).
  private bibliographyEntries(
    projectId: string,
    cited: Set<string> | undefined,
  ): BibliographyEntry[] {
    const sources = this.entities
      .list(projectId, { type: 'source' })
      .entities.slice()
      .sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0));
    const entries: BibliographyEntry[] = [];
    for (const source of sources) {
      if (cited !== undefined && !cited.has(source.id)) continue;
      const data = this.frontMatterOf(projectId, source.path);
      const citation =
        typeof data.citation === 'string' && data.citation.trim() !== ''
          ? data.citation
          : undefined;
      const url =
        typeof data.url === 'string' && data.url !== '' ? data.url : undefined;
      const text = citation ?? source.title ?? source.id;
      entries.push(url !== undefined ? { text, url } : { text });
    }
    return entries;
  }

  // The YAML front matter of a file as a plain object; {} when it has none or it does not parse.
  private frontMatterOf(
    projectId: string,
    path: string,
  ): Record<string, unknown> {
    const { yaml } = splitFrontMatter(this.files.read(projectId, path).content);
    if (yaml === undefined) return {};
    const doc = parseDocument(yaml);
    if (doc.errors.length > 0) return {};
    const data: unknown = doc.toJS();
    return typeof data === 'object' && data !== null
      ? (data as Record<string, unknown>)
      : {};
  }

  // The bodies of the files of one part, in view order, with trailing whitespace removed (P3).
  private bodiesOf(files: ManuscriptText[], part: ManuscriptPart): string[] {
    return files
      .filter((file) => file.part === part)
      .map((file) => splitFrontMatter(file.content).body.trimEnd());
  }

  private invalidProject(): ModuleError {
    return new ModuleError(
      PROJECT_ERROR_CODES.INVALID,
      PROJECT_ERROR_STATUS.PROJECT_INVALID,
      PROJECT_INVALID_MESSAGE,
    );
  }
}
