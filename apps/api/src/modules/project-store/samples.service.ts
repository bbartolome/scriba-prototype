import {
  copyFileSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  type Dirent,
} from 'node:fs';
import { join } from 'node:path';
import { Inject, Injectable } from '@nestjs/common';
import { parse, parseDocument } from 'yaml';
import {
  PROJECT_ERROR_CODES,
  PROJECT_ERROR_STATUS,
  sampleListSchema,
  type ProjectSummary,
  type Sample,
  type StartFromSampleRequest,
} from '@bbartolome/scriba-contracts/project-store';
import {
  ModuleError,
  SCRIBA_ENV,
  type ScribaEnv,
} from '../platform/platform.module';
import { writeFileAtomic } from './atomic-write';
import { fail, PATH_MESSAGES } from './path-safety';
import { reserveProjectFolder } from './project-folders';
import { summaryOf } from './project-discovery';
import { ProjectStoreService } from './project-store.service';
import { PROJECT_MESSAGES } from './projects.service';
import { readYamlState } from './project-yaml';

const SAMPLES_FILE = 'samples.yaml';
const PROJECT_YAML = 'project.yaml';

// The paths a copy leaves out, relative to the sample root. Samples ship none of them (PLT-20 D11).
const EXCLUDED_PATHS = ['.scriba', 'logs', 'snapshots', 'drafts/.versions'];

// The three refusals of a sample. Fixed strings only; no input value and no container path is echoed.
const SAMPLE_MESSAGES = {
  NOT_FOUND: 'No sample with that id was found.',
  INVALID: "The sample's project.yaml is not valid.",
  TOO_NEW:
    "The sample's project.yaml has a newer schema version than this app supports.",
} as const;

// The sample list and Start from sample. Samples are read-only: the copy reads them and writes only into the library.
@Injectable()
export class SamplesService {
  constructor(
    private readonly store: ProjectStoreService,
    @Inject(SCRIBA_ENV) private readonly env: ScribaEnv,
  ) {}

  // The entries of samples.yaml, answered as they are. An absent file is an empty list. Reads only.
  list(): Sample[] {
    let text: string;
    try {
      text = readFileSync(
        join(this.env.SCRIBA_EXAMPLES_DIR, SAMPLES_FILE),
        'utf8',
      );
    } catch (error) {
      if (errnoOf(error) === 'ENOENT') return [];
      throw error;
    }
    let value: unknown;
    try {
      value = parse(text);
    } catch {
      throw unreadableList();
    }
    const parsed = sampleListSchema.safeParse(value);
    if (!parsed.success) throw unreadableList();
    return parsed.data;
  }

  // Start from sample (P-S): copies the sample's tree into a new library folder and sets only the title. Every
  // refusal comes before the folder is reserved, so a refused start writes nothing. The new project is not activated.
  start(request: StartFromSampleRequest): ProjectSummary {
    if (!this.list().some((sample) => sample.id === request.sampleId)) {
      throw sampleNotFound();
    }
    const sampleRoot = this.sampleRoot(request.sampleId);
    const text = readSampleYaml(sampleRoot);
    const state = readYamlState(text, this.store.projectYamlVersion());
    if (state.status === 'invalid') {
      throw new ModuleError(
        PROJECT_ERROR_CODES.INVALID,
        PROJECT_ERROR_STATUS.PROJECT_INVALID,
        SAMPLE_MESSAGES.INVALID,
      );
    }
    if (state.status === 'too-new') {
      throw new ModuleError(
        PROJECT_ERROR_CODES.SCHEMA_TOO_NEW,
        PROJECT_ERROR_STATUS.PROJECT_SCHEMA_TOO_NEW,
        SAMPLE_MESSAGES.TOO_NEW,
      );
    }
    // The text exists, so `importable` cannot occur. It is refused as a missing sample.
    if (state.status !== 'ok') throw sampleNotFound();

    const doc = parseDocument(text);
    doc.set('title', request.title);
    const yamlText = doc.toString();

    const libraryRoot = this.store.libraryRoot;
    if (!reserveProjectFolder(libraryRoot, request.folderName)) {
      throw new ModuleError(
        PROJECT_ERROR_CODES.EXISTS,
        PROJECT_ERROR_STATUS.PROJECT_EXISTS,
        PROJECT_MESSAGES.EXISTS,
      );
    }
    const root = join(libraryRoot, request.folderName);
    try {
      this.copyTree(sampleRoot, root, '');
      writeFileAtomic(
        this.store.resolvePath(root, PROJECT_YAML).realPath,
        yamlText,
      );
    } catch (error) {
      rmSync(root, { recursive: true, force: true });
      throw error;
    }
    return summaryOf(
      request.folderName,
      { status: 'ok', title: request.title, genrePack: state.genrePack },
      this.store.activeId(),
    );
  }

  // The folder of a listed sample: the entry of the samples folder whose name is the id and that is a real
  // folder. The id is never joined to a path, so a link or a `..` cannot reach another folder.
  private sampleRoot(sampleId: string): string {
    const folder = this.env.SCRIBA_EXAMPLES_DIR;
    const entry = listEntries(folder).find(
      (item) => item.name === sampleId && item.isDirectory(),
    );
    if (entry === undefined) throw sampleNotFound();
    return join(folder, entry.name);
  }

  // Copies the sample tree under `relative` into the new root. Files are copied byte for byte. A symbolic link or
  // any entry that is neither a file nor a folder is refused (D12).
  private copyTree(source: string, root: string, relative: string): void {
    for (const entry of readdirSync(join(source, relative), {
      withFileTypes: true,
    })) {
      const rel = relative === '' ? entry.name : `${relative}/${entry.name}`;
      if (EXCLUDED_PATHS.includes(rel) || rel === PROJECT_YAML) continue;
      if (entry.isDirectory()) {
        mkdirSync(this.store.resolvePath(root, rel).realPath);
        this.copyTree(source, root, rel);
      } else if (entry.isFile()) {
        copyFileSync(
          join(source, rel),
          this.store.resolvePath(root, rel).realPath,
        );
      } else {
        throw fail(PROJECT_ERROR_CODES.PATH_OUTSIDE, PATH_MESSAGES.OUTSIDE);
      }
    }
  }
}

// The entries of a folder. A folder that does not exist has none.
function listEntries(folder: string): Dirent[] {
  try {
    return readdirSync(folder, { withFileTypes: true });
  } catch (error) {
    if (errnoOf(error) === 'ENOENT') return [];
    throw error;
  }
}

// The text of a sample's project.yaml. A missing file is a missing sample.
function readSampleYaml(sampleRoot: string): string {
  try {
    return readFileSync(join(sampleRoot, PROJECT_YAML), 'utf8');
  } catch (error) {
    const code = errnoOf(error);
    if (code === 'ENOENT' || code === 'ENOTDIR') throw sampleNotFound();
    throw error;
  }
}

function sampleNotFound(): ModuleError {
  return new ModuleError(
    PROJECT_ERROR_CODES.NOT_FOUND,
    PROJECT_ERROR_STATUS.PROJECT_NOT_FOUND,
    SAMPLE_MESSAGES.NOT_FOUND,
  );
}

// A samples.yaml that is not YAML, or does not match the list schema. It carries no detail.
function unreadableList(): Error {
  return new Error('The sample list could not be read.');
}

function errnoOf(error: unknown): string | undefined {
  return (error as NodeJS.ErrnoException).code;
}
