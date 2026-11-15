import { Inject, Injectable } from '@nestjs/common';
import {
  BUILTIN_ORIGINS,
  TOOL_ERROR_CODES,
  TOOL_ERROR_STATUS,
  type BuiltinOrigin,
  type FunctionList,
  type PortDescriptor,
  type ToolDetail,
  type ToolList,
  type ToolListQuery,
  type ToolOrigin,
  type ToolSummary,
  type ToolValidateRequest,
  type ToolValidateResult,
} from '@bbartolome/scriba-contracts/tool-registry';
import {
  ModuleError,
  SCRIBA_ENV,
  type ScribaEnv,
} from '../platform/platform.module';
import {
  emptyUserScan,
  readBuiltinTools,
  scanUserTools,
  userToolsDir,
  type LoadedTool,
  type ToolEntry,
  type UserPackScan,
} from './packs';
import { validateArguments } from './validate';

// Called with the names that a refresh changed, once per change.
export type CatalogListener = (names: string[]) => void;

// One row of the list: the entry, and the built-in pack a user copy overrides.
interface Row {
  entry: ToolEntry;
  overrides: BuiltinOrigin | undefined;
}

function isBuiltinOrigin(value: unknown): value is BuiltinOrigin {
  return (
    typeof value === 'string' &&
    (BUILTIN_ORIGINS as readonly string[]).includes(value)
  );
}

// The origins a project is offered: core, the genre pack when it is a built-in pack, and the user pack (C6).
// An unknown genre pack gives core and user only.
function offeredOrigins(genrePack: string | undefined): Set<ToolOrigin> {
  const origins = new Set<ToolOrigin>(['core', 'user']);
  if (isBuiltinOrigin(genrePack)) origins.add(genrePack);
  return origins;
}

// The switch of a tool. TRG-06 reads the spec's own value; TRG-09 adds the project's override here.
function isEnabled(tool: LoadedTool): boolean {
  return tool.spec.enabled;
}

function summaryOf({ entry, overrides }: Row): ToolSummary {
  const shadow = overrides === undefined ? {} : { overrides };
  const common = {
    name: entry.name,
    origin: entry.origin,
    ...shadow,
    valid: entry.valid,
    lintCounts: { errors: 0, warnings: 0 },
  };
  if (!entry.valid) {
    return {
      ...common,
      description: '',
      output: null,
      enabled: false,
      error: entry.error,
    };
  }
  return {
    ...common,
    description: entry.tool.spec.description,
    output: entry.tool.spec.output,
    enabled: isEnabled(entry.tool),
  };
}

// Serves the tools of the built-in packs and of the user pack. Built-ins are read once, at construction. The user
// pack is checked against its manifest before each read, so a host-side edit shows up without a restart.
@Injectable()
export class CatalogService {
  private readonly builtins: Map<string, ToolEntry>;
  private readonly userFolder: string;
  private userScan: UserPackScan;
  private readonly listeners: CatalogListener[] = [];

  constructor(@Inject(SCRIBA_ENV) env: ScribaEnv) {
    this.builtins = new Map(
      readBuiltinTools(env.SCRIBA_PACKS_DIR).map(
        (entry): [string, ToolEntry] => [entry.name, entry],
      ),
    );
    this.userFolder = userToolsDir(env.SCRIBA_BOOKS_DIR);
    this.userScan = scanUserTools(this.userFolder, emptyUserScan());
  }

  // Re-scans the user pack when its manifest changed. Calls each listener with the changed names, and returns them.
  refresh(): string[] {
    const scan = scanUserTools(this.userFolder, this.userScan);
    this.userScan = scan;
    if (scan.changed.length > 0) {
      for (const listener of this.listeners) listener(scan.changed);
    }
    return scan.changed;
  }

  // Registers a listener for the names that a refresh changes.
  onChange(listener: CatalogListener): void {
    this.listeners.push(listener);
  }

  // The tool list. With a genre pack, only core, that pack and the user pack; without one, every origin.
  list(query: ToolListQuery = {}): ToolList {
    this.refresh();
    const origins =
      query.genrePack === undefined
        ? undefined
        : offeredOrigins(query.genrePack);
    return {
      tools: this.rows()
        .filter((row) => origins === undefined || origins.has(row.entry.origin))
        .map(summaryOf),
    };
  }

  // The detail of one tool. For an invalid effective tool, spec and views are null. Lint is TRG-07's, so empty here.
  detail(name: string): ToolDetail {
    this.refresh();
    const entry = this.resolve(name);
    if (!entry.valid) {
      return {
        spec: null,
        source: entry.source,
        origin: entry.origin,
        lint: [],
        views: null,
      };
    }
    return {
      spec: entry.tool.spec,
      source: entry.source,
      origin: entry.origin,
      lint: [],
      views: entry.tool.views,
    };
  }

  // The loaded tool, or TOOL_NOT_FOUND, or TOOL_INVALID for an invalid effective tool.
  entry(name: string): LoadedTool {
    this.refresh();
    return this.loaded(name);
  }

  // The port descriptor of one tool.
  ports(name: string): PortDescriptor {
    return this.entry(name).views.ports;
  }

  // The model function schemas of the enabled, valid tools offered to a project with this genre pack.
  functions(genrePack?: string): FunctionList {
    this.refresh();
    const origins = offeredOrigins(genrePack);
    const functions: FunctionList['functions'] = [];
    for (const { entry } of this.rows()) {
      if (entry.valid && isEnabled(entry.tool) && origins.has(entry.origin)) {
        functions.push(entry.tool.views.functionSchema);
      }
    }
    return { functions };
  }

  // Checks the arguments of one call against the tool's inputs.
  validate(name: string, request: ToolValidateRequest): ToolValidateResult {
    this.refresh();
    return validateArguments(this.loaded(name), request);
  }

  // The entry a name resolves to: a valid user copy, else the built-in, else an invalid user copy alone.
  private resolve(name: string): ToolEntry {
    const user = this.userScan.entries.get(name);
    if (user?.valid) return user;
    const builtin = this.builtins.get(name);
    if (builtin !== undefined) return builtin;
    if (user !== undefined) return user;
    throw new ModuleError(
      TOOL_ERROR_CODES.NOT_FOUND,
      TOOL_ERROR_STATUS.TOOL_NOT_FOUND,
      `No tool named "${name}".`,
    );
  }

  // The loaded tool a name resolves to, without a refresh. TOOL_INVALID when that entry is invalid.
  private loaded(name: string): LoadedTool {
    const entry = this.resolve(name);
    if (!entry.valid) {
      throw new ModuleError(
        TOOL_ERROR_CODES.INVALID,
        TOOL_ERROR_STATUS.TOOL_INVALID,
        entry.error.message,
      );
    }
    return entry.tool;
  }

  // One row per effective tool. A valid user copy shadows its built-in; an invalid user copy is listed beside it.
  private rows(): Row[] {
    const names = new Set([
      ...this.builtins.keys(),
      ...this.userScan.entries.keys(),
    ]);
    const rows: Row[] = [];
    for (const name of [...names].sort()) {
      const builtin = this.builtins.get(name);
      const user = this.userScan.entries.get(name);
      const overrides =
        builtin !== undefined && isBuiltinOrigin(builtin.origin)
          ? builtin.origin
          : undefined;
      if (user?.valid) {
        rows.push({ entry: user, overrides });
        continue;
      }
      if (builtin !== undefined) {
        rows.push({ entry: builtin, overrides: undefined });
      }
      if (user !== undefined) rows.push({ entry: user, overrides });
    }
    return rows;
  }
}
