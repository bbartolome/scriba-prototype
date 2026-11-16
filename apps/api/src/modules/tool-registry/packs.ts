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
  type LintResult,
  type ToolErrorCode,
  type ToolErrorInfo,
  type ToolOrigin,
  type ToolSpec,
  type ToolViews,
} from '@bbartolome/scriba-contracts/tool-registry';
import { BootError } from '../platform/platform.module';
import { emitViews } from './emit';
import { lintToolSource } from './lint';
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
// error, and its summary has output null, description '' and enabled false (TRG-01 option A). A file with a lint
// error is invalid, but keeps its parsed spec, so its summary keeps its output and its switch (TRG-07 D10).
// Every entry keeps its lint result (TRG-07 D11).
export type ToolEntry =
  | {
      valid: true;
      name: string;
      origin: ToolOrigin;
      source: string;
      tool: LoadedTool;
      lint: LintResult;
    }
  | {
      valid: false;
      name: string;
      origin: ToolOrigin;
      source: string;
      error: ToolErrorInfo;
      lint: LintResult;
      spec: ToolSpec | null;
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
  error: ToolErrorInfo,
  lint: LintResult,
  spec: ToolSpec | null,
): ToolEntry {
  return { valid: false, name: stem, origin, source, error, lint, spec };
}

// Reads, lints and checks one tool file. A file that cannot be read, parsed or checked is an invalid entry, not an
// error. The structural checks run after the lint, so the file's lint result is kept on every path. A file with a
// lint error is invalid with the spec from checkTool; a warning does not invalidate (TRG-07 D10).
function loadFile(
  path: string,
  stem: string,
  origin: ToolOrigin,
  entityKinds: ReadonlySet<string>,
): ToolEntry {
  const label = `${origin}/tools/${stem}${YAML_SUFFIX}`;
  let source: string;
  try {
    source = readFileSync(path, 'utf8');
  } catch (error) {
    return invalidEntry(
      stem,
      origin,
      '',
      {
        code: TOOL_ERROR_CODES.INVALID,
        message: `The file "${label}" could not be read: ${reasonOf(error)}.`,
      },
      [],
      null,
    );
  }
  const { lint } = lintToolSource(source, { name: stem, entityKinds });
  let raw: unknown;
  try {
    raw = parse(source);
  } catch (error) {
    const firstLine = reasonOf(error).split('\n')[0];
    return invalidEntry(
      stem,
      origin,
      source,
      {
        code: TOOL_ERROR_CODES.INVALID,
        message: `The file "${label}" is not valid YAML: ${firstLine}.`,
      },
      lint,
      null,
    );
  }
  let checked: ReturnType<typeof checkTool>;
  try {
    checked = checkTool(raw, stem, label);
  } catch (error) {
    if (error instanceof ToolFileError) {
      return invalidEntry(
        stem,
        origin,
        source,
        { code: error.code, message: error.message },
        lint,
        null,
      );
    }
    throw error;
  }
  const failed = lint.find((diagnostic) => diagnostic.severity === 'error');
  if (failed !== undefined) {
    return invalidEntry(
      stem,
      origin,
      source,
      {
        code: TOOL_ERROR_CODES.INVALID,
        message: `The file "${label}" fails lint: line ${failed.line}: ${failed.message}.`,
      },
      lint,
      checked.spec,
    );
  }
  return {
    valid: true,
    name: stem,
    origin,
    source,
    lint,
    tool: { ...checked, source, origin },
  };
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

// One file of a built-in pack folder. `label` is its path under the packs root, as `core/tools/x.yaml`.
export interface BuiltinFile {
  origin: BuiltinOrigin;
  stem: string;
  path: string;
  label: string;
}

// A file whose stem an earlier built-in pack already owns, with that pack's origin.
export interface DuplicateBuiltinFile extends BuiltinFile {
  first: BuiltinOrigin;
}

// The files of one folder across the built-in packs: the first owner of each stem, and the later duplicates.
export interface BuiltinFiles {
  files: BuiltinFile[];
  duplicates: DuplicateBuiltinFile[];
}

// Lists the `.yaml` files of `<pack>/<folder>` for each built-in pack, in pack order (TRG-07 step 3). A folder that
// does not exist is an empty pack. The loaders and the pack-lint library read the packs through this one function.
export function builtinFiles(packsRoot: string, folder: string): BuiltinFiles {
  const owner = new Map<string, BuiltinOrigin>();
  const files: BuiltinFile[] = [];
  const duplicates: DuplicateBuiltinFile[] = [];
  for (const pack of BUILTIN_ORIGINS) {
    const dir = join(packsRoot, pack, folder);
    for (const file of yamlFilesIn(dir)) {
      const entry: BuiltinFile = {
        origin: pack,
        stem: stemOf(file),
        path: join(dir, file),
        label: `${pack}/${folder}/${file}`,
      };
      const first = owner.get(entry.stem);
      if (first === undefined) {
        owner.set(entry.stem, pack);
        files.push(entry);
      } else {
        duplicates.push({ ...entry, first });
      }
    }
  }
  return { files, duplicates };
}

// Reads the built-in tools of the packs root, once. A pack folder that does not exist is an empty pack. A tool
// name that two built-in packs define stops boot, naming the tool and both packs.
export function readBuiltinTools(
  packsRoot: string,
  entityKinds: ReadonlySet<string>,
): ToolEntry[] {
  const { files, duplicates } = builtinFiles(packsRoot, 'tools');
  const [duplicate] = duplicates;
  if (duplicate !== undefined) {
    throw new BootError(
      `The tool "${duplicate.stem}" is defined in two built-in packs, ${duplicate.first} and ${duplicate.origin}. Each tool name belongs to one pack (packs root ${packsRoot}).`,
    );
  }
  return files.map((file) =>
    loadFile(file.path, file.stem, file.origin, entityKinds),
  );
}

// Scans the user tools folder against the previous scan. A file whose (mtime, size) mark is unchanged keeps its
// entry; every other present file is reparsed, and every removed file is listed as changed. Never creates a folder.
export function scanUserTools(
  dir: string,
  previous: UserPackScan,
  entityKinds: ReadonlySet<string>,
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
    entries.set(stem, loadFile(path, stem, 'user', entityKinds));
  }
  for (const path of previous.marks.keys()) {
    if (!marks.has(path)) changed.add(stemOf(basename(path)));
  }
  return { marks, entries, changed: [...changed].sort() };
}
