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
  type ResolvedEntity,
  type ToolCallResult,
} from '@bbartolome/scriba-contracts/tool-registry';
import { ModuleError } from '../../platform/platform.module';
import type {
  EntitiesService,
  FilesService,
} from '../../project-store/project-store.module';
import type { ExecutorService } from '../../tool-registry/tool-registry.module';
import {
  ToolArgumentError,
  type NarrativeToolDefinition,
  type ToolArgumentSchema,
  type ToolIssue,
} from './tool-types';

// The narrative tools of AGL-09: each enabled registry tool is offered as a function, and its call resolves the
// entities it names, runs the executor, and reports what it used. This file holds the handler and its error table.

export interface NarrativeSettings {
  genrePack?: string;
  styleProfile?: string;
}

export interface NarrativeDeps {
  executor: ExecutorService;
  entities: EntitiesService;
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

// The narrative definition of one registry tool. Its description and schema are the registry's function schema, and
// its fields are the form descriptor of the tool.
export function narrativeDefinition(
  deps: NarrativeDeps,
  fn: ModelFunction,
  fields: readonly FormField[],
  styleProfile: string | undefined,
): NarrativeToolDefinition {
  const name = fn.function.name;
  return {
    name,
    family: 'narrative',
    description: fn.function.description,
    schema: fn.function.parameters as unknown as ToolArgumentSchema,
    handler: async (ctx, args) => {
      const values = filledArguments(
        args as Record<string, unknown>,
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
      const kind = result.output.kind;
      return {
        summary: kind === 'draft' ? `Drafted with ${name}.` : `Ran ${name}.`,
        output: result.output,
        citations: { entityIds: ids, sourcesUsed: result.sourcesUsed },
      };
    },
  };
}
