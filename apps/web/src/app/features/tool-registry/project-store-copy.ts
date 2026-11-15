import type {
  ActiveProject,
  EntityList,
  FileRead,
} from '@bbartolome/scriba-contracts/project-store';
import type { ApiPath, ResponseSchema } from '../../shell';

// Hand-written copies of the Project store's routes, response guards and patterns that the pickers
// read. This file imports only types from the contract: the browser ships no runtime zod, so a value
// import would not load. project-store-copy.spec.ts (X1) checks each copy against the contract.

/** `GET` the active project (`ACTIVE_PROJECT_ROUTE`). */
export const ACTIVE_PROJECT_PATH: ApiPath = '/api/project-store/active';

/** `GET` the entity list of a project (`PROJECT_ENTITIES_ROUTE`), with `:projectId` in place. */
export const PROJECT_ENTITIES_TEMPLATE =
  '/api/project-store/projects/:projectId/entities';

/** `GET` the file of a project (`PROJECT_FILE_ROUTE`), with `:projectId` in place. */
export const PROJECT_FILE_TEMPLATE =
  '/api/project-store/projects/:projectId/file';

/** The entity list path of one project, with its id encoded as one path segment. */
export function projectEntitiesPath(projectId: string): ApiPath {
  return PROJECT_ENTITIES_TEMPLATE.replace(
    ':projectId',
    encodeURIComponent(projectId),
  ) as ApiPath;
}

/** The file read path of one project, with its id encoded as one path segment. */
export function projectFilePath(projectId: string): ApiPath {
  return PROJECT_FILE_TEMPLATE.replace(
    ':projectId',
    encodeURIComponent(projectId),
  ) as ApiPath;
}

// ENTITY_ID_PATTERN: lower-case letters, digits and hyphens, starting with a letter or digit.
export const ENTITY_ID_PATTERN = /^[a-z0-9][a-z0-9-]*$/;

// The kind of a style profile entity: the one kind a style picker offers.
export const STYLE_PROFILE_KIND = 'style-profile';

// A content hash: sha256: followed by 64 lowercase hex digits.
const CONTENT_HASH = /^sha256:[0-9a-f]{64}$/;

// The date part of zod 4's z.iso.datetime(), copied from zod's own source (no offset, seconds required).
const ISO_DATE = String.raw`(?:(?:\d\d[2468][048]|\d\d[13579][26]|\d\d0[48]|[02468][048]00|[13579][26]00)-02-29|\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\d|30)|(?:02)-(?:0[1-9]|1\d|2[0-8])))`;

// A UTC timestamp with a Z, as the contract's `mtime` requires.
const UTC_DATETIME = new RegExp(
  String.raw`^${ISO_DATE}T(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d(?:\.\d+)?Z$`,
);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** One entry of the entity list, checked as `entities[]` of entityListSchema does. */
function isEntity(value: unknown): value is EntityList['entities'][number] {
  if (!isRecord(value)) {
    return false;
  }
  const { id, type, path, title } = value;
  return (
    typeof id === 'string' &&
    ENTITY_ID_PATTERN.test(id) &&
    typeof type === 'string' &&
    type !== '' &&
    typeof path === 'string' &&
    (title === undefined || typeof title === 'string')
  );
}

/** One entry of `invalid`, checked as entityListSchema does. */
function isInvalid(value: unknown): value is EntityList['invalid'][number] {
  if (!isRecord(value)) {
    return false;
  }
  const { path, reason } = value;
  return typeof path === 'string' && typeof reason === 'string';
}

/** Response of GET .../active (`activeProjectSchema`): `active` is null or an id. */
export const activeCopy: ResponseSchema<ActiveProject> = {
  safeParse(data) {
    const active = isRecord(data) ? data['active'] : undefined;
    if (active === null || (typeof active === 'string' && active !== '')) {
      return { success: true, data: { active } };
    }
    return { success: false, error: 'active is neither null nor a project id' };
  },
};

/** Response of GET .../entities (`entityListSchema`). A body without `invalid` is refused. */
export const entityListCopy: ResponseSchema<EntityList> = {
  safeParse(data) {
    const fields: Record<string, unknown> = isRecord(data) ? data : {};
    const { entities, invalid } = fields;
    if (
      Array.isArray(entities) &&
      entities.every(isEntity) &&
      Array.isArray(invalid) &&
      invalid.every(isInvalid)
    ) {
      return { success: true, data: { entities, invalid } };
    }
    return { success: false, error: 'not an entity list' };
  },
};

/** Response of GET .../file (`fileReadSchema`). A key the schema does not name is dropped, as zod drops it. */
export const fileReadCopy: ResponseSchema<FileRead> = {
  safeParse(data) {
    const fields: Record<string, unknown> = isRecord(data) ? data : {};
    const { path, content, hash, mtime, upgraded } = fields;
    if (
      typeof path === 'string' &&
      typeof content === 'string' &&
      typeof hash === 'string' &&
      CONTENT_HASH.test(hash) &&
      typeof mtime === 'string' &&
      UTC_DATETIME.test(mtime) &&
      (upgraded === undefined || typeof upgraded === 'boolean')
    ) {
      return {
        success: true,
        data: {
          path,
          content,
          hash,
          mtime,
          ...(upgraded === undefined ? {} : { upgraded }),
        },
      };
    }
    return { success: false, error: 'not a file read' };
  },
};

// The line rule of styleProfileOf: `styleProfile:` at column 0, an optional quote pair around the id,
// and an optional trailing comment. The id is ENTITY_ID_PATTERN without its anchors.
const STYLE_PROFILE_LINE = new RegExp(
  String.raw`^styleProfile:[ \t]*(["']?)(${ENTITY_ID_PATTERN.source.slice(1, -1)})\1[ \t]*(#.*)?$`,
);

/**
 * The style profile of a project.yaml, read by a line rule (the browser has no YAML parser): the id of
 * the first line that has a `styleProfile:` key at column 0 with a valid id. Undefined when no line
 * matches. A value written in another YAML form (a flow mapping, a block scalar, an alias) is not read.
 */
export function styleProfileOf(text: string): string | undefined {
  for (const line of text.split(/\r?\n/)) {
    const match = STYLE_PROFILE_LINE.exec(line);
    if (match !== null) {
      return match[2];
    }
  }
  return undefined;
}
