import { parse } from 'yaml';
import {
  projectYamlSchema,
  type EntityResolution,
} from '@bbartolome/scriba-contracts/project-store';
import {
  TOOL_ERROR_CODES,
  toolArgsInvalidDetailsSchema,
  type FormField,
  type ModelFunction,
  type OutputKind,
  type ResolvedEntity,
  type ToolCallResult,
} from '@bbartolome/scriba-contracts/tool-registry';
import { ModuleError } from '../../platform/platform.module';
import type {
  EntitiesService,
  FilesService,
  ProjectsService,
  ProjectStoreService,
  ResolvedProjectPath,
} from '../../project-store/project-store.module';
import type { ExecutorService } from '../../tool-registry/tool-registry.module';
import {
  FOLDER_MESSAGE,
  SIZE_MESSAGE,
  captureOf,
  isFolder,
  isTooLarge,
  targetOf,
} from './builtin-tools';
import { routedFolder, stampOf, withSuffix } from './output-routing';
import {
  ToolArgumentError,
  type NarrativeToolDefinition,
  type ToolArgumentSchema,
  type ToolContext,
  type ToolIssue,
} from './tool-types';

// The narrative tools of AGL-09: each enabled registry tool is offered as a function, and its call resolves the
// entities it names, runs the executor, and reports what it used. This file holds the handler and its error table.
// A draft or entity output is routed to a file of its folder (AGL-13): the call may name the file in `target`.

export interface NarrativeSettings {
  genrePack?: string;
  styleProfile?: string;
}

export interface NarrativeDeps {
  executor: ExecutorService;
  entities: EntitiesService;
  files: FilesService;
  store: ProjectStoreService;
  projects: ProjectsService;
}

// The genre pack and the style profile of a project, from its project.yaml (PC1). A missing or invalid file gives
// neither, and no error reaches the caller.
export function readProjectNarrativeSettings(
  files: FilesService,
  projectId: string,
): NarrativeSettings {
  try {
    const { content } = files.read(projectId, 'project.yaml');
    const checked = projectYamlSchema.safeParse(parse(content));
    if (!checked.success) return {};
    const { genrePack, styleProfile } = checked.data;
    return {
      ...(genrePack === undefined ? {} : { genrePack }),
      ...(styleProfile === undefined ? {} : { styleProfile }),
    };
  } catch {
    return {};
  }
}

// A key in a JSON Pointer (RFC 6901): '~' is written '~0' and '/' is written '~1'.
function pointerOf(key: string): string {
  return `/${key.replace(/~/g, '~0').replace(/\//g, '~1')}`;
}

// The arguments with the style fields filled (PC6). A style field that is absent, or empty ('' or null), takes the
// project's profile. When the project has none, an empty key is removed, and an absent key stays absent, so the
// executor sees the field as absent. A non-empty value from the model is kept.
function filledArguments(
  args: Record<string, unknown>,
  fields: readonly FormField[],
  styleProfile: string | undefined,
): Record<string, unknown> {
  const values = { ...args };
  for (const field of fields) {
    if (field.elementType !== 'style') continue;
    const value = values[field.key];
    const empty = value === undefined || value === '' || value === null;
    if (!empty) continue;
    if (styleProfile === undefined) {
      delete values[field.key];
    } else {
      values[field.key] = styleProfile;
    }
  }
  return values;
}

// Every ID the entity and style fields name, in field order (PC10). A list gives its items, and a non-string item is
// skipped, because the executor refuses it. Each reference keeps the field that names it.
function referencesOf(
  fields: readonly FormField[],
  values: Record<string, unknown>,
): Array<{ id: string; key: string }> {
  const refs: Array<{ id: string; key: string }> = [];
  for (const field of fields) {
    if (field.elementType !== 'entity' && field.elementType !== 'style') {
      continue;
    }
    const value = values[field.key];
    const items: unknown[] = Array.isArray(value) ? value : [value];
    for (const item of items) {
      if (typeof item === 'string') refs.push({ id: item, key: field.key });
    }
  }
  return refs;
}

// The executor's refusals that the loop counts (PC4). Each becomes a ToolArgumentError, which the dispatcher counts.
// Any other refusal becomes a plain error, which the dispatcher answers without counting. A non-module error is
// returned unchanged, so an abort is rethrown.
function refusalOf(error: unknown): unknown {
  if (!(error instanceof ModuleError)) return error;
  switch (error.code) {
    case TOOL_ERROR_CODES.ARGS_INVALID: {
      const checked = toolArgsInvalidDetailsSchema.safeParse(error.details);
      return new ToolArgumentError(
        checked.success
          ? checked.data.issues
          : [{ path: '', message: error.message }],
      );
    }
    case TOOL_ERROR_CODES.ENTITY_UNRESOLVED:
    case TOOL_ERROR_CODES.ENTITY_KIND_MISMATCH:
      return new ToolArgumentError([{ path: '', message: error.message }]);
    default:
      return new Error(error.message);
  }
}

// The offered copy of a routed tool's schema (AGL-13 P11): the registry's schema with an optional `target`. The
// registry's object is not changed.
function withTarget(
  schema: ToolArgumentSchema,
  folder: string,
): ToolArgumentSchema {
  return {
    ...schema,
    properties: {
      ...schema.properties,
      target: {
        type: 'string',
        minLength: 1,
        description: `Optional. The file to write, in ${folder}/. Left out, a new file is named for you.`,
      },
    },
  };
}

// The arguments without `target` (AGL-13 P12). The executor refuses an unknown argument, so it never sees it.
function withoutTarget(args: Record<string, unknown>): Record<string, unknown> {
  const copy = { ...args };
  delete copy.target;
  return copy;
}

// The explicit target of a routed call, checked and captured (AGL-13 P4, P5, P6). Undefined when the call left the
// target out. Every refusal is one issue at `/target`, and it is raised before the executor runs.
function explicitTargetOf(
  deps: NarrativeDeps,
  ctx: ToolContext,
  folder: string,
  value: unknown,
): ResolvedProjectPath | undefined {
  if (value === undefined) return undefined;
  const notInFolder: ToolIssue[] = [
    { path: '/target', message: `The target must be a file in ${folder}/.` },
  ];
  if (typeof value !== 'string' || value === '') {
    throw new ToolArgumentError(notInFolder);
  }
  const projectId = ctx.run.projectId;
  try {
    const target = targetOf(deps.store, deps.projects, projectId, value);
    if (
      !target.relativePath.startsWith(`${folder}/`) ||
      target.relativePath.length <= folder.length + 1
    ) {
      throw new ToolArgumentError(notInFolder);
    }
    if (isFolder(target)) {
      throw new ToolArgumentError([
        { path: '/target', message: FOLDER_MESSAGE },
      ]);
    }
    captureOf(ctx.run, deps.files, projectId, target);
    return target;
  } catch (error) {
    if (error instanceof ModuleError) {
      throw new ToolArgumentError([
        { path: '/target', message: error.message },
      ]);
    }
    throw error;
  }
}

// The default path of a routed call (AGL-13 P8): `<folder>/<tool-name>-<stamp>.md`, with `-2`, `-3`, ... before the
// extension until the path is free on disk and in this run's overlay.
function defaultTargetOf(
  deps: NarrativeDeps,
  ctx: ToolContext,
  folder: string,
  name: string,
  now: Date,
): ResolvedProjectPath {
  const base = `${folder}/${name}-${stampOf(now)}.md`;
  const resolve = (path: string): ResolvedProjectPath =>
    targetOf(deps.store, deps.projects, ctx.run.projectId, path);
  const taken = (target: ResolvedProjectPath): boolean =>
    target.exists ||
    ctx.run.overlay.contentOf(target.relativePath) !== undefined;
  let target = resolve(base);
  for (let n = 2; taken(target); n += 1) {
    target = resolve(withSuffix(base, n));
  }
  return target;
}

// The narrative definition of one registry tool. Its description and schema are the registry's function schema, and
// its fields are the form descriptor of the tool. Its kind is the tool's declared output kind (AGL-13 P15).
export function narrativeDefinition(
  deps: NarrativeDeps,
  fn: ModelFunction,
  fields: readonly FormField[],
  styleProfile: string | undefined,
  kind: OutputKind,
): NarrativeToolDefinition {
  const name = fn.function.name;
  const ownSchema = fn.function.parameters as unknown as ToolArgumentSchema;
  // A draft or entity output is routed (AGL-13 P1, P11). A tool whose own inputs have a `target` keeps it, and its
  // output takes the default path, without the routing argument.
  const folder = routedFolder(kind);
  const routing =
    folder !== undefined && !('target' in ownSchema.properties)
      ? folder
      : undefined;
  return {
    name,
    family: 'narrative',
    description: fn.function.description,
    schema: routing === undefined ? ownSchema : withTarget(ownSchema, routing),
    handler: async (ctx, args) => {
      const raw = args as Record<string, unknown>;
      const explicit =
        routing === undefined
          ? undefined
          : explicitTargetOf(deps, ctx, routing, raw.target);
      const values = filledArguments(
        routing === undefined ? raw : withoutTarget(raw),
        fields,
        styleProfile,
      );
      const refs = referencesOf(fields, values);
      const ids = [...new Set(refs.map((ref) => ref.id))];
      const keyOf = (id: string): string =>
        refs.find((ref) => ref.id === id)?.key ?? '';

      let entities: ResolvedEntity[] = [];
      if (ids.length > 0) {
        let resolution: EntityResolution;
        try {
          resolution = deps.entities.resolve(ctx.run.projectId, ids);
        } catch (error) {
          if (error instanceof ModuleError) {
            throw new ToolArgumentError([{ path: '', message: error.message }]);
          }
          throw error;
        }
        const issues: ToolIssue[] = resolution.errors.map((error) =>
          error.code === 'duplicate'
            ? {
                path: pointerOf(keyOf(error.id)),
                message: `Entity "${error.id}" is in more than one file: ${(error.paths ?? []).join(', ')}.`,
              }
            : {
                path: pointerOf(keyOf(error.id)),
                message: `Entity "${error.id}" is not in this project.`,
              },
        );
        if (issues.length > 0) throw new ToolArgumentError(issues);
        entities = resolution.resolved.map((entity) => ({
          ref: entity.id,
          type: entity.type,
          path: entity.path,
          content: entity.content,
        }));
      }

      let result: ToolCallResult;
      try {
        result = await deps.executor.execute(
          name,
          { arguments: values, entities },
          ctx.signal,
        );
      } catch (error) {
        throw refusalOf(error);
      }
      const summary =
        result.output.kind === 'draft'
          ? `Drafted with ${name}.`
          : `Ran ${name}.`;
      const citations = { entityIds: ids, sourcesUsed: result.sourcesUsed };
      if (routing === undefined) {
        return { summary, output: result.output, citations };
      }
      // The routed text: refused when it is over the cap (AGL-13 P7), else placed at the explicit target or at a
      // free default path (P6, P8), and returned for the run to put in the overlay (P3).
      if (isTooLarge(result.output.content)) {
        throw new ToolArgumentError([{ path: '', message: SIZE_MESSAGE }]);
      }
      const target =
        explicit ?? defaultTargetOf(deps, ctx, routing, name, new Date());
      if (explicit === undefined) {
        captureOf(ctx.run, deps.files, ctx.run.projectId, target);
      }
      return {
        summary,
        output: result.output,
        citations,
        written: { path: target.relativePath, content: result.output.content },
      };
    },
  };
}
