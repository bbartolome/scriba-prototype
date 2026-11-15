import type { SearchResult } from '@bbartolome/scriba-contracts/project-store';
import { ModuleError } from '../../platform/platform.module';
import {
  FilesService,
  SearchService,
} from '../../project-store/project-store.module';
import { ToolArgumentError, type ToolDefinition } from './tool-types';

// The built-in read tools of M1 (D6, D7) and search_notes (M2). Each calls the Project store in-process, with
// project-relative paths, and none writes. The Project store checks the paths; a refusal comes back as a readable
// tool error.

interface ListFilesArgs {
  path?: string;
  recursive?: boolean;
}

interface ReadFileArgs {
  path: string;
}

interface SearchNotesArgs {
  query: string;
  limit?: number;
  scope?: ('sources' | 'entities')[];
}

// The folder name in the summary (S11): the project root reads as `the project root`.
function folderName(path: string): string {
  const segments = path
    .split('/')
    .filter((segment) => segment !== '' && segment !== '.');
  return segments.length === 0 ? 'the project root' : segments.join('/');
}

export function builtinTools(
  files: FilesService,
  search: SearchService,
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
    description: 'Read the text of a project-relative file.',
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
      // The hash and the mtime are left out, to keep the model text short (S11).
      const file = files.read(ctx.run.projectId, input.path);
      return {
        summary: `Read ${file.path}.`,
        output: { path: file.path, content: file.content },
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

  return [listFiles, readFile, searchNotes];
}
