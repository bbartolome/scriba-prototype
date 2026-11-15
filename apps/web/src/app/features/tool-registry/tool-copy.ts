import type {
  ToolDetail,
  ToolValidateResult,
} from '@bbartolome/scriba-contracts/tool-registry';
import type { ApiPath, ResponseSchema } from '../../shell';

// Hand-written copies of the tool-registry routes and response guards that the Tools preview reads.
// This file imports only types from the contract: the browser ships no runtime zod, so a value
// import would not load. tool-copy.spec.ts (S1) checks each copy against the contract.

/** `GET` one tool (`TOOL_ROUTE`), with `:name` in place. */
export const TOOL_PATH_TEMPLATE = '/api/tool-registry/tools/:name';

/** `POST` the validate command of one tool (`TOOL_VALIDATE_ROUTE`), with `:name` in place. */
export const TOOL_VALIDATE_PATH_TEMPLATE =
  '/api/tool-registry/tools/:name/validate';

/** The detail path of one tool, with its name encoded as one path segment. */
export function toolPath(name: string): ApiPath {
  return TOOL_PATH_TEMPLATE.replace(
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
