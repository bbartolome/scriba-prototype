import type {
  ToolCallResult,
  LintDiagnostic,
  ToolDetail,
  ToolList,
  ToolOrigin,
  ToolRenderResult,
  ToolSummary,
  ToolValidateResult,
  ToolViews,
} from '@bbartolome/scriba-contracts/tool-registry';
import type { ApiPath, ResponseSchema } from '../../shell';

// Hand-written copies of the tool-registry routes and response guards that the Tools preview reads.
// This file imports only types from the contract: the browser ships no runtime zod, so a value
// import would not load. tool-copy.spec.ts (S1) checks each copy against the contract.

/** `GET` the tool list (`TOOLS_ROUTE`). */
export const TOOLS_PATH = '/api/tool-registry/tools' as ApiPath;

/** `GET` one tool (`TOOL_ROUTE`), with `:name` in place. */
export const TOOL_PATH_TEMPLATE = '/api/tool-registry/tools/:name';

/** `POST` the validate command of one tool (`TOOL_VALIDATE_ROUTE`), with `:name` in place. */
export const TOOL_VALIDATE_PATH_TEMPLATE =
  '/api/tool-registry/tools/:name/validate';

/** `POST` the enabled switch of one tool (`TOOL_ENABLED_ROUTE`), with `:name` in place. */
export const TOOL_ENABLED_PATH_TEMPLATE =
  '/api/tool-registry/tools/:name/enabled';

/** `POST` the execute command of one tool (`TOOL_EXECUTE_ROUTE`), with `:name` in place. */
export const TOOL_EXECUTE_PATH_TEMPLATE =
  '/api/tool-registry/tools/:name/execute';

/** `POST` the render command of one tool (`TOOL_RENDER_ROUTE`), with `:name` in place. */
export const TOOL_RENDER_PATH_TEMPLATE =
  '/api/tool-registry/tools/:name/render';

/** The origins in the order the list shows its groups (a copy of `TOOL_ORIGINS`). */
export const TOOL_ORIGIN_ORDER: readonly ToolOrigin[] = [
  'core',
  'nonfiction',
  'fiction',
  'user',
];

/** The origins a user copy can override (a copy of `BUILTIN_ORIGINS`). */
const BUILTIN_ORIGIN_ORDER: readonly string[] = [
  'core',
  'nonfiction',
  'fiction',
];

/** The enabled path of one tool, with its name encoded as one path segment. */
export function toolEnabledPath(name: string): ApiPath {
  return TOOL_ENABLED_PATH_TEMPLATE.replace(
    ':name',
    encodeURIComponent(name),
  ) as ApiPath;
}

/** The detail path of one tool, with its name encoded as one path segment. */
export function toolPath(name: string): ApiPath {
  return TOOL_PATH_TEMPLATE.replace(
    ':name',
    encodeURIComponent(name),
  ) as ApiPath;
}

/** The execute path of one tool, with its name encoded as one path segment. */
export function toolExecutePath(name: string): ApiPath {
  return TOOL_EXECUTE_PATH_TEMPLATE.replace(
    ':name',
    encodeURIComponent(name),
  ) as ApiPath;
}

/** The render path of one tool, with its name encoded as one path segment. */
export function toolRenderPath(name: string): ApiPath {
  return TOOL_RENDER_PATH_TEMPLATE.replace(
    ':name',
    encodeURIComponent(name),
  ) as ApiPath;
}

/** The validate path of one tool, with its name encoded as one path segment. */
export function toolValidatePath(name: string): ApiPath {
  return TOOL_VALIDATE_PATH_TEMPLATE.replace(
    ':name',
    encodeURIComponent(name),
  ) as ApiPath;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** The fields of a tool detail that the preview reads, with the others the contract requires checked for presence. */
export type ToolDetailView = Pick<ToolDetail, 'source' | 'lint' | 'views'>;

/** Whether a views value has the form fields and the port descriptor the preview reads. */
function isViews(value: unknown): boolean {
  if (!isRecord(value)) {
    return false;
  }
  const { form, ports } = value;
  return (
    isRecord(form) &&
    Array.isArray(form['fields']) &&
    isRecord(ports) &&
    Array.isArray(ports['inputs']) &&
    isRecord(ports['output']) &&
    Array.isArray(ports['params'])
  );
}

/** Response of GET one tool (`toolDetailSchema`). `views` is null for an invalid tool. */
export const toolDetailCopy: ResponseSchema<ToolDetailView> = {
  safeParse(data) {
    const fields: Record<string, unknown> = isRecord(data) ? data : {};
    const { source, lint, views } = fields;
    if (
      typeof source === 'string' &&
      Array.isArray(lint) &&
      (views === null || isViews(views))
    ) {
      // The views were checked above for the keys the preview reads; the rest of their shape is the contract's.
      return {
        success: true,
        data: { source, lint, views } as ToolDetailView,
      };
    }
    return { success: false, error: 'not a tool detail' };
  },
};

/** Response of POST execute (`toolCallResultSchema`): the output and the ids of the sources it drew on. */
export const toolCallResultCopy: ResponseSchema<ToolCallResult> = {
  safeParse(data) {
    const fields: Record<string, unknown> = isRecord(data) ? data : {};
    const { output, sourcesUsed } = fields;
    if (
      isRecord(output) &&
      typeof output['kind'] === 'string' &&
      typeof output['content'] === 'string' &&
      Array.isArray(sourcesUsed) &&
      sourcesUsed.every((source) => typeof source === 'string')
    ) {
      return {
        success: true,
        data: {
          output: { kind: output['kind'], content: output['content'] },
          sourcesUsed: sourcesUsed as ToolCallResult['sourcesUsed'],
        },
      } as { success: true; data: ToolCallResult };
    }
    return { success: false, error: 'not a call result' };
  },
};

/** Response of POST render (`toolRenderResultSchema`): the prompt the model would receive. */
export const toolRenderCopy: ResponseSchema<ToolRenderResult> = {
  safeParse(data) {
    if (isRecord(data) && typeof data['prompt'] === 'string') {
      return { success: true, data: { prompt: data['prompt'] } };
    }
    return { success: false, error: 'not a render result' };
  },
};

/** Response of POST validate (`toolValidateResultSchema`): the arguments and the entity references. */
export const toolValidateCopy: ResponseSchema<ToolValidateResult> = {
  safeParse(data) {
    const fields: Record<string, unknown> = isRecord(data) ? data : {};
    const { arguments: args, entityRefs } = fields;
    if (isRecord(args) && Array.isArray(entityRefs)) {
      return {
        success: true,
        data: {
          arguments: args,
          entityRefs: entityRefs as ToolValidateResult['entityRefs'],
        },
      };
    }
    return { success: false, error: 'not a validate result' };
  },
};

/** Whether a value has the shape of one tool summary (`toolSummarySchema`). */
function isSummary(value: unknown): value is ToolSummary {
  if (!isRecord(value)) {
    return false;
  }
  const { name, description, origin, valid, enabled, output, lintCounts } =
    value;
  const { overrides, error } = value;
  return (
    typeof name === 'string' &&
    typeof description === 'string' &&
    typeof origin === 'string' &&
    TOOL_ORIGIN_ORDER.includes(origin as ToolOrigin) &&
    typeof valid === 'boolean' &&
    typeof enabled === 'boolean' &&
    (output === null || typeof output === 'string') &&
    isRecord(lintCounts) &&
    typeof lintCounts['errors'] === 'number' &&
    typeof lintCounts['warnings'] === 'number' &&
    (overrides === undefined ||
      (typeof overrides === 'string' &&
        BUILTIN_ORIGIN_ORDER.includes(overrides))) &&
    (error === undefined ||
      (isRecord(error) &&
        typeof error['code'] === 'string' &&
        typeof error['message'] === 'string'))
  );
}

/** Response of GET the tool list (`toolListSchema`): every row is checked with `isSummary`. */
export const toolListCopy: ResponseSchema<ToolList> = {
  safeParse(data) {
    const fields: Record<string, unknown> = isRecord(data) ? data : {};
    const { tools } = fields;
    if (Array.isArray(tools) && tools.every(isSummary)) {
      return { success: true, data: { tools } as ToolList };
    }
    return { success: false, error: 'not a tool list' };
  },
};

/** One row of the list (`toolSummarySchema`), as the enabled answer gives it. */
export const toolSummaryCopy: ResponseSchema<ToolSummary> = {
  safeParse(data) {
    if (isSummary(data)) {
      return { success: true, data };
    }
    return { success: false, error: 'not a tool summary' };
  },
};

/** A tool name: lower snake case, 1 to 64 characters, starting with a letter (a copy of `TOOL_NAME_PATTERN`). */
export const TOOL_NAME_PATTERN = /^[a-z][a-z0-9_]{0,63}$/;

/** `POST` the lint of a source (`LINT_ROUTE`). Writes nothing. */
export const LINT_PATH = '/api/tool-registry/lint' as ApiPath;

/** `GET` the built-in source of one tool (`TOOL_BUILTIN_ROUTE`), with `:name` in place. */
export const TOOL_BUILTIN_PATH_TEMPLATE =
  '/api/tool-registry/tools/:name/builtin';

/** `GET` the user copy of one tool (`TOOL_USER_ROUTE`), with `:name` in place. */
export const TOOL_USER_PATH_TEMPLATE = '/api/tool-registry/tools/:name/user';

/** `POST` the save of one tool (`TOOL_SAVE_ROUTE`), with `:name` in place. */
export const TOOL_SAVE_PATH_TEMPLATE = '/api/tool-registry/tools/:name/save';

/** `POST` the delete of one user copy (`TOOL_DELETE_ROUTE`), with `:name` in place. */
export const TOOL_DELETE_PATH_TEMPLATE =
  '/api/tool-registry/tools/:name/delete';

/** The built-in source path of one tool, with its name encoded as one path segment. */
export function toolBuiltinPath(name: string): ApiPath {
  return TOOL_BUILTIN_PATH_TEMPLATE.replace(
    ':name',
    encodeURIComponent(name),
  ) as ApiPath;
}

/** The user copy path of one tool, with its name encoded as one path segment. */
export function toolUserPath(name: string): ApiPath {
  return TOOL_USER_PATH_TEMPLATE.replace(
    ':name',
    encodeURIComponent(name),
  ) as ApiPath;
}

/** The save path of one tool, with its name encoded as one path segment. */
export function toolSavePath(name: string): ApiPath {
  return TOOL_SAVE_PATH_TEMPLATE.replace(
    ':name',
    encodeURIComponent(name),
  ) as ApiPath;
}

/** The delete path of one tool, with its name encoded as one path segment. */
export function toolDeletePath(name: string): ApiPath {
  return TOOL_DELETE_PATH_TEMPLATE.replace(
    ':name',
    encodeURIComponent(name),
  ) as ApiPath;
}

/** One lint diagnostic (`lintDiagnosticSchema`): severity, rule, message, and a line and column of at least 1. */
export type ToolLintDiagnostic = LintDiagnostic;

/** Whether a value has the shape of one lint diagnostic (`lintDiagnosticSchema`). */
function isDiagnostic(value: unknown): value is LintDiagnostic {
  if (!isRecord(value)) {
    return false;
  }
  const { severity, rule, message, line, column } = value;
  return (
    (severity === 'error' || severity === 'warning') &&
    typeof rule === 'string' &&
    typeof message === 'string' &&
    Number.isInteger(line) &&
    (line as number) >= 1 &&
    Number.isInteger(column) &&
    (column as number) >= 1
  );
}

/** The source of one tool with its lint and views: the built-in, the user copy, and the save answer. */
export type ToolSourceView = {
  source: string;
  lint: LintDiagnostic[];
  views: ToolViews | null;
};

/** Response of GET `/builtin`, GET `/user` and POST save: a source, its lint and its views (null when invalid). */
export const toolSourceCopy: ResponseSchema<ToolSourceView> = {
  safeParse(data) {
    const fields: Record<string, unknown> = isRecord(data) ? data : {};
    const { source, lint, views } = fields;
    if (
      typeof source === 'string' &&
      Array.isArray(lint) &&
      lint.every(isDiagnostic) &&
      (views === null || isViews(views))
    ) {
      return {
        success: true,
        data: {
          source,
          lint: lint as LintDiagnostic[],
          views: views as ToolViews | null,
        },
      };
    }
    return { success: false, error: 'not a tool source' };
  },
};

/** Response of POST lint (`lintResponseSchema`): the diagnostics and the views. Writes nothing. */
export const lintResponseCopy: ResponseSchema<{
  lint: LintDiagnostic[];
  views: ToolViews | null;
}> = {
  safeParse(data) {
    const fields: Record<string, unknown> = isRecord(data) ? data : {};
    const { lint, views } = fields;
    if (
      Array.isArray(lint) &&
      lint.every(isDiagnostic) &&
      (views === null || isViews(views))
    ) {
      return {
        success: true,
        data: {
          lint: lint as LintDiagnostic[],
          views: views as ToolViews | null,
        },
      };
    }
    return { success: false, error: 'not a lint response' };
  },
};

/** The diagnostics of a 422 `details` (`{lint}`), or undefined when the details carry none. */
export function lintDetailsCopy(
  details: unknown,
): LintDiagnostic[] | undefined {
  if (!isRecord(details) || !Array.isArray(details['lint'])) {
    return undefined;
  }
  const lint = details['lint'];
  return lint.every(isDiagnostic) ? (lint as LintDiagnostic[]) : undefined;
}

/** The delete answer is empty, so any body is accepted and the result is undefined. */
export const toolDeleteCopy: ResponseSchema<undefined> = {
  safeParse() {
    return { success: true, data: undefined };
  },
};
