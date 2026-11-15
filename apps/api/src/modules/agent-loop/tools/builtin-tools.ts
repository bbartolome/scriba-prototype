import { FilesService } from '../../project-store/project-store.module';
import type { ToolDefinition } from './tool-types';

// The built-in read tools of M1 (D6, D7). Each calls the Project store's file API in-process, with project-relative
// paths. The Project store checks the paths; a refusal comes back as a readable tool error.

interface ListFilesArgs {
  path?: string;
  recursive?: boolean;
}

interface ReadFileArgs {
  path: string;
}

// The folder name in the summary (S11): the project root reads as `the project root`.
function folderName(path: string): string {
  const segments = path
    .split('/')
    .filter((segment) => segment !== '' && segment !== '.');
  return segments.length === 0 ? 'the project root' : segments.join('/');
}

export function builtinTools(files: FilesService): ToolDefinition[] {
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

  return [listFiles, readFile];
}
