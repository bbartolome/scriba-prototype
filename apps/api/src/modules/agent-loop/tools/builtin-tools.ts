import { statSync } from 'node:fs';
import {
  FILE_SIZE_CAP_BYTES,
  type SearchResult,
} from '@bbartolome/scriba-contracts/project-store';
import { ModuleError } from '../../platform/platform.module';
import { summaryOf } from '../grounding-engine';
import {
  FilesService,
  ProjectsService,
  ProjectStoreService,
  SearchService,
  type ResolvedProjectPath,
} from '../../project-store/project-store.module';
import {
  DEFAULT_FETCH_POLICY,
  fetchPageDefinition,
  type FetchPolicy,
} from './fetch-page';
import type { ToolRun } from './tool-run';
import { ToolArgumentError, type ToolDefinition } from './tool-types';

// The built-in tools of the project family: list_files, read_file and search_notes (M1, M2), and write_file and
// edit_file (AGL-12). The write tools never write to disk: they change the run overlay, and the overlay is proposed
// at run end. Each tool calls the Project store in-process, with project-relative paths. The Project store checks
// the paths; a refusal comes back as a readable tool error.

interface ListFilesArgs {
  path?: string;
  recursive?: boolean;
}

interface ReadFileArgs {
  path: string;
}

interface CheckGroundingArgs {
  path: string;
}

interface WriteFileArgs {
  path: string;
  content: string;
}

interface EditFileArgs {
  path: string;
  old: string;
  new: string;
}

interface SearchNotesArgs {
  query: string;
  limit?: number;
  scope?: ('sources' | 'entities')[];
}

export const FOLDER_MESSAGE =
  'The path names a folder, so no file can be written there.';
export const SIZE_MESSAGE = 'The text is larger than the 5 MiB limit.';
const NO_FILE_MESSAGE = 'No file was found at that path.';
const NOT_FOUND_MESSAGE = 'The text to replace was not found in the file.';
const TWICE_MESSAGE =
  'The text to replace occurs more than once in the file. It must occur exactly once.';

// The folder name in the summary (S11): the project root reads as `the project root`.
function folderName(path: string): string {
  const segments = path
    .split('/')
    .filter((segment) => segment !== '' && segment !== '.');
  return segments.length === 0 ? 'the project root' : segments.join('/');
}

// The target of a path, checked as the Project store checks a read (S2): the project must be active, then it is
// looked up, then the path is resolved. A refused path is a ModuleError; a project that is not found is a plain
// error, which does not count as an invalid call.
export function targetOf(
  store: ProjectStoreService,
  projects: ProjectsService,
  projectId: string,
  path: string,
): ResolvedProjectPath {
  store.requireActive(projectId);
  const project = projects.find(projectId);
  if (project === undefined) {
    throw new Error(`Project ${projectId} was not found.`);
  }
  return store.resolvePath(project.root, path);
}

// Captures the base of a target at its first touch (AGL-12 D2): the disk text of an existing file, or null for a
// file that does not exist. A later call changes nothing. Returns the captured base.
export function captureOf(
  run: ToolRun,
  files: FilesService,
  projectId: string,
  target: ResolvedProjectPath,
): string | null {
  const known = run.overlay.baseOf(target.relativePath);
  if (known !== undefined) return known;
  const base = target.exists
    ? files.read(projectId, target.relativePath).content
    : null;
  run.overlay.capture(target.relativePath, base);
  return base;
}

// The root, or a path that is an existing folder, cannot hold a file.
export function isFolder(target: ResolvedProjectPath): boolean {
  return (
    target.isRoot || (target.exists && statSync(target.realPath).isDirectory())
  );
}

export function isTooLarge(text: string): boolean {
  return Buffer.byteLength(text, 'utf8') > FILE_SIZE_CAP_BYTES;
}

// The offsets of the needle in the text, from the start, stopping at the second one. An overlapping match counts.
function matchesOf(text: string, needle: string): number[] {
  const found: number[] = [];
  let at = text.indexOf(needle);
  while (at !== -1 && found.length < 2) {
    found.push(at);
    at = text.indexOf(needle, at + 1);
  }
  return found;
}

export function builtinTools(
  files: FilesService,
  search: SearchService,
  store: ProjectStoreService,
  projects: ProjectsService,
  fetchPolicy: FetchPolicy = DEFAULT_FETCH_POLICY,
): ToolDefinition[] {
  const listFiles: ToolDefinition = {
    name: 'list_files',
    family: 'project',
    description:
      'List the files and folders at a project-relative folder path. Leave the path out for the project root.',
    schema: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description: 'A project-relative folder. Leave it out for the root.',
        },
        recursive: {
          type: 'boolean',
          description: 'Whether to list the folders inside as well.',
        },
      },
      required: [],
      additionalProperties: false,
    },
    handler: async (ctx, args) => {
      const input = args as ListFilesArgs;
      const path = input.path ?? '.';
      const output = files.list(ctx.run.projectId, {
        path,
        recursive: input.recursive === true,
      });
      return { summary: `Listed ${folderName(path)}.`, output };
    },
  };

  const readFile: ToolDefinition = {
    name: 'read_file',
    family: 'project',
    description:
      'Read the text of a project-relative file. A file this run has written shows the text it proposed.',
    schema: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description: 'The project-relative path of a text file.',
        },
      },
      required: ['path'],
      additionalProperties: false,
    },
    handler: async (ctx, args) => {
      const input = args as ReadFileArgs;
      const projectId = ctx.run.projectId;
      const target = targetOf(store, projects, projectId, input.path);
      // The overlay first (AGL-12 P4): a later read in the run sees the text the run wrote.
      const pending = ctx.run.overlay.contentOf(target.relativePath);
      if (pending !== undefined) {
        return {
          summary: `Read ${target.relativePath}.`,
          output: { path: target.relativePath, content: pending },
        };
      }
      // The hash and the mtime are left out, to keep the model text short (S11).
      const file = files.read(projectId, input.path);
      if (!ctx.run.overlay.isCaptured(file.path)) {
        ctx.run.overlay.capture(file.path, file.content);
      }
      return {
        summary: `Read ${file.path}.`,
        output: { path: file.path, content: file.content },
      };
    },
  };

  const writeFile: ToolDefinition = {
    name: 'write_file',
    family: 'project',
    description:
      'Write the whole text of a project-relative file. The text is proposed for the author to accept; nothing is saved to disk yet.',
    schema: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          minLength: 1,
          description: 'The project-relative path of the file.',
        },
        content: {
          type: 'string',
          description: 'The whole new text of the file.',
        },
      },
      required: ['path', 'content'],
      additionalProperties: false,
    },
    handler: async (ctx, args) => {
      const input = args as WriteFileArgs;
      const projectId = ctx.run.projectId;
      const target = targetOf(store, projects, projectId, input.path);
      if (isFolder(target)) {
        throw new ToolArgumentError([
          { path: '/path', message: FOLDER_MESSAGE },
        ]);
      }
      if (isTooLarge(input.content)) {
        throw new ToolArgumentError([
          { path: '/content', message: SIZE_MESSAGE },
        ]);
      }
      captureOf(ctx.run, files, projectId, target);
      ctx.run.overlay.put(target.relativePath, input.content, ctx.callId);
      return {
        summary: `Wrote ${target.relativePath}.`,
        output: { path: target.relativePath },
      };
    },
  };

  const editFile: ToolDefinition = {
    name: 'edit_file',
    family: 'project',
    description:
      'Replace one piece of text in a project-relative file. The text to replace must occur exactly once. The change is proposed for the author to accept; nothing is saved to disk yet.',
    schema: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          minLength: 1,
          description: 'The project-relative path of the file.',
        },
        old: {
          type: 'string',
          minLength: 1,
          description: 'The exact text to replace. It must occur exactly once.',
        },
        new: {
          type: 'string',
          description: 'The text that replaces it.',
        },
      },
      required: ['path', 'old', 'new'],
      additionalProperties: false,
    },
    handler: async (ctx, args) => {
      const input = args as EditFileArgs;
      const projectId = ctx.run.projectId;
      const target = targetOf(store, projects, projectId, input.path);
      // The base is captured before the match, so a refused edit still fixes the base (AGL-12 P6).
      const base = captureOf(ctx.run, files, projectId, target);
      const current = ctx.run.overlay.contentOf(target.relativePath) ?? base;
      if (current === null) {
        throw new ToolArgumentError([
          { path: '/path', message: NO_FILE_MESSAGE },
        ]);
      }
      const found = matchesOf(current, input.old);
      if (found.length === 0) {
        throw new ToolArgumentError([
          { path: '/old', message: NOT_FOUND_MESSAGE },
        ]);
      }
      if (found.length > 1) {
        throw new ToolArgumentError([{ path: '/old', message: TWICE_MESSAGE }]);
      }
      const [at] = found;
      const next =
        current.slice(0, at) + input.new + current.slice(at + input.old.length);
      if (isTooLarge(next)) {
        throw new ToolArgumentError([
          { path: '/content', message: SIZE_MESSAGE },
        ]);
      }
      ctx.run.overlay.put(target.relativePath, next, ctx.callId);
      return {
        summary: `Edited ${target.relativePath}.`,
        output: { path: target.relativePath },
      };
    },
  };

  const searchNotes: ToolDefinition = {
    name: 'search_notes',
    family: 'project',
    description:
      "Search the project's notes, the sources and the entities, for a text. Returns the best passages with their project-relative paths. Drafts are never searched.",
    schema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          minLength: 1,
          description: 'The words to look for.',
        },
        limit: {
          type: 'integer',
          minimum: 1,
          description: 'The most passages to return. Twenty when left out.',
        },
        scope: {
          type: 'array',
          items: { type: 'string', enum: ['sources', 'entities'] },
          description:
            'The folders to search: sources, entities or both. Both when left out.',
        },
      },
      required: ['query'],
      additionalProperties: false,
    },
    handler: async (ctx, args) => {
      const input = args as SearchNotesArgs;
      let passages: SearchResult = [];
      let refusal: string | undefined;
      try {
        passages = search.search(ctx.run.projectId, input);
      } catch (error) {
        if (!(error instanceof ModuleError)) throw error;
        refusal = error.message;
      }
      // The throw is outside the catch, so the lint rule preserve-caught-error has nothing to flag (PST-13 plan S16).
      if (refusal !== undefined) {
        throw new ToolArgumentError([{ path: '', message: refusal }]);
      }
      const count = passages.length;
      return {
        summary: `Found ${count} ${count === 1 ? 'passage' : 'passages'} for "${input.query}".`,
        output: { passages },
      };
    },
  };

  // The grounding check of a draft, as a tool (AGL-17). The check and its events are the run's; the tool only asks
  // for it and answers the model with the verdicts.
  const checkGrounding: ToolDefinition = {
    name: 'check_grounding',
    family: 'grounding',
    description:
      'Check the claims of a project-relative draft against the sources. Returns each claim with its verdict and the source it cites.',
    schema: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          minLength: 1,
          description: 'The project-relative path of the draft to check.',
        },
      },
      required: ['path'],
      additionalProperties: false,
    },
    handler: async (ctx, args) => {
      const input = args as CheckGroundingArgs;
      const target = targetOf(store, projects, ctx.run.projectId, input.path);
      const check = ctx.run.groundingCheck;
      if (check === undefined) {
        throw new Error('Grounding checks are not available in this run.');
      }
      const result = await check(target.relativePath, ctx.signal);
      const counts = summaryOf(result);
      const claims = result.claims.map((claim) => ({
        text: claim.text,
        verdict: claim.verdict,
        reason: claim.reason,
        ...(claim.passage === undefined ? {} : { source: claim.passage.path }),
      }));
      return {
        summary: `Checked ${target.relativePath}: ${counts.supported} supported, ${counts.weak} weak, ${counts.unsupported} unsupported.`,
        output: counts,
        modelText: JSON.stringify({
          targetPath: target.relativePath,
          supported: counts.supported,
          weak: counts.weak,
          unsupported: counts.unsupported,
          claims,
        }),
      };
    },
  };

  return [
    listFiles,
    readFile,
    searchNotes,
    writeFile,
    editFile,
    checkGrounding,
    fetchPageDefinition(fetchPolicy),
  ];
}
