import {
  existsSync,
  readdirSync,
  readFileSync,
  statSync,
  type Stats,
} from 'node:fs';
import { basename, join } from 'node:path';
import { parse } from 'yaml';
import {
  BUILTIN_ORIGINS,
  TOOL_ERROR_CODES,
  TOOL_SPEC_SCHEMA_VERSION,
  toolSpecSchema,
  type BuiltinOrigin,
  type ToolErrorCode,
  type ToolErrorInfo,
  type ToolOrigin,
  type ToolSpec,
  type ToolViews,
} from '@bbartolome/scriba-contracts/tool-registry';
import { BootError } from '../platform/platform.module';
import { emitViews } from './emit';
import { isRecord, ToolSpecError } from './inputs';
import { compileTool, createAjv, type CompiledTool } from './validate';

// The file-level loader: reads the tool files of the packs and of the user pack, and checks each one.
// It holds no state of its own; CatalogService keeps the results.

const YAML_SUFFIX = '.yaml';

// A tool that passed every check: its spec, its source, its three views and its validators.
export interface LoadedTool {
  spec: ToolSpec;
  source: string;
  origin: ToolOrigin;
  views: ToolViews;
  compiled: CompiledTool;
}

// One tool file. A file that passes is valid and holds its LoadedTool. A file that does not is listed with its
// error, and its summary has output null, description '' and enabled false (TRG-01 option A).
export type ToolEntry =
  | {
      valid: true;
      name: string;
      origin: ToolOrigin;
      source: string;
      tool: LoadedTool;
    }
  | {
      valid: false;
      name: string;
      origin: ToolOrigin;
      source: string;
      error: ToolErrorInfo;
    };

// The (mtime, size) of one user-pack file, the freshness mark of the manifest.
export interface FileMark {
  mtimeMs: number;
  size: number;
}

// The state of the user pack after one scan.
export interface UserPackScan {
  // The mark of each file, keyed by its path.
  marks: Map<string, FileMark>;
  // The entry of each file, keyed by the file stem, which is the tool name.
  entries: Map<string, ToolEntry>;
  // The stems added, edited or removed by this scan. Sorted, with no duplicates.
  changed: string[];
}

// A scan of a folder with no files: the start of the first scan.
export function emptyUserScan(): UserPackScan {
  return { marks: new Map(), entries: new Map(), changed: [] };
}

// The folder of the user's tools: `<library>/.scriba/packs/user/tools`.
export function userToolsDir(booksDir: string): string {
  return join(booksDir, '.scriba', 'packs', 'user', 'tools');
}

// Migrates a tool spec read from an older schemaVersion to the current one, in memory. Version 1 is the only
// version, so the migration is the identity. It exists so the first older version needs no change in the loader.
export function migrateToolSpec(
  raw: Record<string, unknown>,
): Record<string, unknown> {
  return raw;
}

// The error of one file the loader lists as invalid. The code is the summary's error code.
class ToolFileError extends Error {
  readonly code: ToolErrorCode;

  constructor(code: ToolErrorCode, message: string) {
    super(message);
    this.name = 'ToolFileError';
    this.code = code;
  }
}

// The issues of a zod parse as one line: `path: message`, joined with semicolons.
function describeIssues(
  issues: ReadonlyArray<{ path: PropertyKey[]; message: string }>,
): string {
  return issues
    .map((issue) =>
      issue.path.length === 0
        ? issue.message
        : `${issue.path.map(String).join('.')}: ${issue.message}`,
    )
    .join('; ');
}

function reasonOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

// Checks the parsed YAML of one tool file. The schemaVersion is read before the strict parse, so a newer file is
// refused whatever else it holds. Throws ToolFileError; returns the spec with its views and validators.
export function checkTool(
  raw: unknown,
  stem: string,
  label: string,
): { spec: ToolSpec; views: ToolViews; compiled: CompiledTool } {
  if (!isRecord(raw)) {
    throw new ToolFileError(
      TOOL_ERROR_CODES.INVALID,
      `The file "${label}" must hold a YAML mapping of tool fields.`,
    );
  }
  const version = raw.schemaVersion;
  if (typeof version === 'number' && version > TOOL_SPEC_SCHEMA_VERSION) {
    throw new ToolFileError(
      TOOL_ERROR_CODES.SCHEMA_VERSION_UNSUPPORTED,
      `The file "${label}" has schemaVersion ${version}; this version of Scriba reads schemaVersion ${TOOL_SPEC_SCHEMA_VERSION}, so the file is refused.`,
    );
  }
  const parsed = toolSpecSchema.safeParse(migrateToolSpec(raw));
  if (!parsed.success) {
    throw new ToolFileError(
      TOOL_ERROR_CODES.INVALID,
      `The file "${label}" is not a valid tool: ${describeIssues(parsed.error.issues)}.`,
    );
  }
  const spec = parsed.data;
  if (spec.name !== stem) {
    throw new ToolFileError(
      TOOL_ERROR_CODES.INVALID,
      `The file "${label}" defines the tool "${spec.name}", but the tool name must match the file name "${stem}".`,
    );
  }
  try {
    return {
      spec,
      views: emitViews(spec),
      compiled: compileTool(spec, createAjv()),
    };
  } catch (error) {
    if (error instanceof ToolSpecError) {
      throw new ToolFileError(
        TOOL_ERROR_CODES.INVALID,
        `The file "${label}" is not a valid tool: ${error.message}`,
      );
    }
    throw error;
  }
}

function invalidEntry(
  stem: string,
  origin: ToolOrigin,
  source: string,
  code: ToolErrorCode,
  message: string,
): ToolEntry {
  return {
    valid: false,
    name: stem,
    origin,
    source,
    error: { code, message },
  };
}

// Reads and checks one tool file. A file that cannot be read, parsed or checked is an invalid entry, not an error.
function loadFile(path: string, stem: string, origin: ToolOrigin): ToolEntry {
  const label = `${origin}/tools/${stem}${YAML_SUFFIX}`;
  let source: string;
  try {
    source = readFileSync(path, 'utf8');
  } catch (error) {
    return invalidEntry(
      stem,
      origin,
      '',
      TOOL_ERROR_CODES.INVALID,
      `The file "${label}" could not be read: ${reasonOf(error)}.`,
    );
  }
  let raw: unknown;
  try {
    raw = parse(source);
  } catch (error) {
    const firstLine = reasonOf(error).split('\n')[0];
    return invalidEntry(
      stem,
      origin,
      source,
      TOOL_ERROR_CODES.INVALID,
      `The file "${label}" is not valid YAML: ${firstLine}.`,
    );
  }
  try {
    const checked = checkTool(raw, stem, label);
    return {
      valid: true,
      name: stem,
      origin,
      source,
      tool: { ...checked, source, origin },
    };
  } catch (error) {
    if (error instanceof ToolFileError) {
      return invalidEntry(stem, origin, source, error.code, error.message);
    }
    throw error;
  }
}

// The names of the regular `.yaml` files directly in a folder, sorted. A folder that does not exist has none.
// Hidden files (a leading dot) are not tools.
function yamlFilesIn(dir: string): string[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true })
    .filter(
      (entry) =>
        entry.isFile() &&
        !entry.name.startsWith('.') &&
        entry.name.endsWith(YAML_SUFFIX),
    )
    .map((entry) => entry.name)
    .sort();
}

function stemOf(file: string): string {
  return file.slice(0, -YAML_SUFFIX.length);
}

// Reads the built-in tools of the packs root, once. A pack folder that does not exist is an empty pack. A tool
// name that two built-in packs define stops boot, naming the tool and both packs.
export function readBuiltinTools(packsRoot: string): ToolEntry[] {
  const owner = new Map<string, BuiltinOrigin>();
  const entries: ToolEntry[] = [];
  for (const pack of BUILTIN_ORIGINS) {
    const toolsDir = join(packsRoot, pack, 'tools');
    for (const file of yamlFilesIn(toolsDir)) {
      const stem = stemOf(file);
      const first = owner.get(stem);
      if (first !== undefined) {
        throw new BootError(
          `The tool "${stem}" is defined in two built-in packs, ${first} and ${pack}. Each tool name belongs to one pack (packs root ${packsRoot}).`,
        );
      }
      owner.set(stem, pack);
      entries.push(loadFile(join(toolsDir, file), stem, pack));
    }
  }
  return entries;
}

// Scans the user tools folder against the previous scan. A file whose (mtime, size) mark is unchanged keeps its
// entry; every other present file is reparsed, and every removed file is listed as changed. Never creates a folder.
export function scanUserTools(
  dir: string,
  previous: UserPackScan,
): UserPackScan {
  const marks = new Map<string, FileMark>();
  const entries = new Map<string, ToolEntry>();
  const changed = new Set<string>();
  for (const file of yamlFilesIn(dir)) {
    const path = join(dir, file);
    const stem = stemOf(file);
    let stat: Stats;
    try {
      stat = statSync(path);
    } catch {
      // Removed between the folder read and this stat: it is absent from this scan, so it counts as removed.
      continue;
    }
    const mark: FileMark = { mtimeMs: stat.mtimeMs, size: stat.size };
    marks.set(path, mark);
    const before = previous.marks.get(path);
    const unchanged =
      before !== undefined &&
      before.mtimeMs === mark.mtimeMs &&
      before.size === mark.size;
    const kept = previous.entries.get(stem);
    if (unchanged && kept !== undefined) {
      entries.set(stem, kept);
      continue;
    }
    changed.add(stem);
    entries.set(stem, loadFile(path, stem, 'user'));
  }
  for (const path of previous.marks.keys()) {
    if (!marks.has(path)) changed.add(stemOf(basename(path)));
  }
  return { marks, entries, changed: [...changed].sort() };
}
