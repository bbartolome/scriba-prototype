import { Inject, Injectable } from '@nestjs/common';
import { join } from 'node:path';
import {
  BUILTIN_ORIGINS,
  TOOL_ERROR_CODES,
  TOOL_ERROR_STATUS,
  TOOL_NAME_PATTERN,
  type BuiltinOrigin,
  type EntityTypeList,
  type FunctionList,
  type LintResponse,
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
  readEntityTypes,
  entityValidatorOf,
  type EntityTypeEntry,
  type EntityValidator,
} from './entity-types';
import { countsOf, lintToolSource } from './lint';
import {
  emptyUserScan,
  readBuiltinTools,
  scanUserTools,
  userToolsDir,
  type LoadedTool,
  type ToolEntry,
  type UserPackScan,
} from './packs';
import {
  ToolSwitchesService,
  type ToolSwitches,
} from './tool-switches.service';
import { removeUserTool, writeUserTool } from './user-pack';
import { validateArguments } from './validate';

// Called with the names that a refresh or a toggle changed, once per change.
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

function notFound(message: string): ModuleError {
  return new ModuleError(
    TOOL_ERROR_CODES.NOT_FOUND,
    TOOL_ERROR_STATUS.TOOL_NOT_FOUND,
    message,
  );
}

// The effective switch of a valid tool: the author's override when the section has one for it, else the spec's
// `enabled` default. Object.hasOwn, so a name that is an Object property is not read from the prototype.
function enabledWith(tool: LoadedTool, switches: ToolSwitches): boolean {
  const { name } = tool.spec;
  return Object.hasOwn(switches, name) ? switches[name] : tool.spec.enabled;
}

// The switch of an entry as a toggle compares it. An invalid entry without a spec has no default, so it is false.
function switchOf(entry: ToolEntry, switches: ToolSwitches): boolean {
  if (entry.valid) return enabledWith(entry.tool, switches);
  if (Object.hasOwn(switches, entry.name)) return switches[entry.name];
  return entry.spec?.enabled ?? false;
}

function summaryOf(
  { entry, overrides }: Row,
  switches: ToolSwitches,
): ToolSummary {
  const shadow = overrides === undefined ? {} : { overrides };
  const common = {
    name: entry.name,
    origin: entry.origin,
    ...shadow,
    valid: entry.valid,
    lintCounts: countsOf(entry.lint),
  };
  if (!entry.valid) {
    // An invalid entry keeps its spec when the file parsed, so its output and its switch default come from it.
    const spec = entry.spec;
    const override = Object.hasOwn(switches, entry.name)
      ? switches[entry.name]
      : undefined;
    return {
      ...common,
      description: spec?.description ?? '',
      output: spec?.output ?? null,
      enabled: spec === null ? false : (override ?? spec.enabled),
      error: entry.error,
    };
  }
  return {
    ...common,
    description: entry.tool.spec.description,
    output: entry.tool.spec.output,
    enabled: enabledWith(entry.tool, switches),
  };
}

/**
 * Serves the tools of the built-in packs and of the user pack. Built-ins are read once, at construction. The user
 * pack is checked against its manifest before each read, so a host-side edit shows up without a restart.
 *
 * Consumers. The Agent loop and the Graph runner inject CatalogService from the exports of ToolRegistryModule. They do
 * not import the other files of the module.
 *
 * Read methods for consumers: list, detail, entry, ports, enabledOf, functions, validate, entityTypes,
 * entityValidator and entityKinds. onChange registers a listener.
 *
 * Reads write no file. list, detail, builtinDetail, userDetail, entry (and so ports), functions and validate first
 * re-scan the user pack. A host-side change found by that re-scan is published to the listeners, which publish
 * catalog-changed. enabledOf, entityTypes, entityKinds, entityValidator and lint do not re-scan.
 *
 * lint, save, delete and setEnabled are the HTTP commands. Consumers do not call them.
 *
 * entry and validate throw TOOL_NOT_FOUND for an unknown name and TOOL_INVALID for an invalid effective tool.
 * validate takes {arguments, mode}; mode "params" drops the port keys before validation.
 *
 * enabledOf returns the effective switch of a valid tool: the author's override, else the spec's default.
 */
@Injectable()
export class CatalogService {
  private readonly builtins: Map<string, ToolEntry>;
  private readonly entityEntries: Map<string, EntityTypeEntry>;
  // The kinds of the loaded built-in entity types. The entity-kind lint reads them.
  private readonly kinds: ReadonlySet<string>;
  private readonly userFolder: string;
  private userScan: UserPackScan;
  private readonly listeners: CatalogListener[] = [];

  constructor(
    @Inject(SCRIBA_ENV) env: ScribaEnv,
    private readonly toolSwitches: ToolSwitchesService,
  ) {
    this.entityEntries = readEntityTypes(env.SCRIBA_PACKS_DIR);
    this.kinds = new Set(this.entityEntries.keys());
    this.builtins = new Map(
      readBuiltinTools(env.SCRIBA_PACKS_DIR, this.kinds).map(
        (entry): [string, ToolEntry] => [entry.name, entry],
      ),
    );
    this.userFolder = userToolsDir(env.SCRIBA_BOOKS_DIR);
    this.userScan = scanUserTools(this.userFolder, emptyUserScan(), this.kinds);
  }

  // Re-scans the user pack when its manifest changed. Calls each listener with the changed names, and returns them.
  refresh(): string[] {
    const scan = scanUserTools(this.userFolder, this.userScan, this.kinds);
    this.userScan = scan;
    if (scan.changed.length > 0) this.notify(scan.changed);
    return scan.changed;
  }

  // Registers a listener for the names that a refresh or a toggle changes.
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
    const switches = this.toolSwitches.overrides();
    return {
      tools: this.rows()
        .filter((row) => origins === undefined || origins.has(row.entry.origin))
        .map((row) => summaryOf(row, switches)),
    };
  }

  // The detail of the effective tool. For an invalid effective tool, spec and views are null.
  detail(name: string): ToolDetail {
    this.refresh();
    return this.detailOf(this.resolve(name));
  }

  // The detail of the built-in original of a tool. TOOL_NOT_FOUND when no built-in pack defines it.
  builtinDetail(name: string): ToolDetail {
    this.refresh();
    const entry = this.builtins.get(name);
    if (entry === undefined) {
      throw notFound(`No built-in tool named "${name}".`);
    }
    return this.detailOf(entry);
  }

  // The detail of the user copy of a tool, valid or not. TOOL_NOT_FOUND when the user pack has no copy.
  userDetail(name: string): ToolDetail {
    this.refresh();
    const entry = this.userScan.entries.get(name);
    if (entry === undefined) {
      throw notFound(`No user copy of the tool "${name}".`);
    }
    return this.detailOf(entry);
  }

  // The entry of a tool, with its author's switch. Toggling to the spec's default removes the override (C1); any
  // other value is written. A toggle that leaves the switch as it is writes nothing and notifies nobody (C3).
  // An invalid entry keeps its key, since it has no spec default (C9). Answers the effective summary.
  setEnabled(name: string, enabled: boolean): ToolSummary {
    this.refresh();
    const entry = this.resolve(name);
    const switches = this.toolSwitches.overrides();
    if (switchOf(entry, switches) !== enabled) {
      if (entry.valid && enabled === entry.tool.spec.enabled) {
        delete switches[name];
      } else {
        switches[name] = enabled;
      }
      this.toolSwitches.save(switches);
      this.notify([name]);
    }
    return summaryOf(this.rowOf(entry), switches);
  }

  // Lints one tool source, writing nothing. `name` is given when the source is or will be saved under that name, so
  // the file-name rule runs. The views come back only when there is no error.
  lint(source: string, name?: string): LintResponse {
    const { lint, views } = lintToolSource(source, {
      name,
      entityKinds: this.kinds,
    });
    return { lint, views };
  }

  // Saves a user copy of a tool under its name, copy-on-write for a built-in. A source with an error is refused with
  // 422 and nothing is written; warnings do not block. Publishes the name once, through refresh.
  save(name: string, source: string): ToolDetail {
    this.requireToolName(name);
    const { lint } = lintToolSource(source, {
      name,
      entityKinds: this.kinds,
    });
    const errors = lint.filter((diagnostic) => diagnostic.severity === 'error');
    if (errors.length > 0) {
      throw new ModuleError(
        TOOL_ERROR_CODES.SPEC_LINT_FAILED,
        TOOL_ERROR_STATUS.TOOL_SPEC_LINT_FAILED,
        `Tool "${name}" was not saved: its source has ${errors.length} lint error(s).`,
        { lint },
      );
    }
    writeUserTool(this.userFolder, name, source);
    // The file has changed, so its manifest mark is dropped: the next scan reparses it even when its size and mtime
    // are the same as before.
    this.userScan.marks.delete(join(this.userFolder, `${name}.yaml`));
    this.refresh();
    return this.userDetail(name);
  }

  // Deletes the user file of a tool: a user copy reverts to its built-in, a user-only tool is removed. A name with a
  // built-in and no user copy is read-only (409); a name with neither is not found (404).
  delete(name: string): void {
    this.requireToolName(name);
    this.refresh();
    if (!this.userScan.entries.has(name)) {
      if (this.builtins.has(name)) {
        throw new ModuleError(
          TOOL_ERROR_CODES.BUILTIN_READONLY,
          TOOL_ERROR_STATUS.TOOL_BUILTIN_READONLY,
          `The built-in tool "${name}" has no user copy to delete.`,
        );
      }
      throw notFound(`No user copy of the tool "${name}".`);
    }
    removeUserTool(this.userFolder, name);
    this.refresh();
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

  // The effective switch of a valid tool: the author's override, else the spec's default. TRG-12 refuses a disabled
  // tool with this, not with spec.enabled.
  enabledOf(tool: LoadedTool): boolean {
    return enabledWith(tool, this.toolSwitches.overrides());
  }

  // The model function schemas of the enabled, valid tools offered to a project with this genre pack.
  functions(genrePack?: string): FunctionList {
    this.refresh();
    const origins = offeredOrigins(genrePack);
    const switches = this.toolSwitches.overrides();
    const functions: FunctionList['functions'] = [];
    for (const { entry } of this.rows()) {
      if (
        entry.valid &&
        enabledWith(entry.tool, switches) &&
        origins.has(entry.origin)
      ) {
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

  // The kinds of the loaded built-in entity types. The lint of a tool checks its entity kinds against them.
  entityKinds(): ReadonlySet<string> {
    return this.kinds;
  }

  // The built-in entity types, sorted by kind.
  entityTypes(): EntityTypeList {
    const entityTypes = [...this.entityEntries.values()]
      .map((entry) => entry.spec)
      .sort((a, b) => (a.kind < b.kind ? -1 : a.kind > b.kind ? 1 : 0));
    return { entityTypes };
  }

  // The checker of one entity kind's front matter, or undefined for a kind that no pack defines.
  entityValidator(kind: string): EntityValidator | undefined {
    const entry = this.entityEntries.get(kind);
    return entry === undefined ? undefined : entityValidatorOf(entry);
  }

  // Calls each listener with the names that changed.
  private notify(names: string[]): void {
    for (const listener of this.listeners) listener(names);
  }

  // A route name that is not a tool name is not found, before any file is read or written.
  private requireToolName(name: string): void {
    if (!TOOL_NAME_PATTERN.test(name)) {
      throw notFound(`No tool named "${name}".`);
    }
  }

  // The entry a name resolves to: a valid user copy, else the built-in, else an invalid user copy alone.
  private resolve(name: string): ToolEntry {
    const user = this.userScan.entries.get(name);
    if (user?.valid) return user;
    const builtin = this.builtins.get(name);
    if (builtin !== undefined) return builtin;
    if (user !== undefined) return user;
    throw notFound(`No tool named "${name}".`);
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

  // The detail of one entry, with its lint. For an invalid entry, spec and views are null.
  private detailOf(entry: ToolEntry): ToolDetail {
    if (!entry.valid) {
      return {
        spec: null,
        source: entry.source,
        origin: entry.origin,
        lint: entry.lint,
        views: null,
      };
    }
    return {
      spec: entry.tool.spec,
      source: entry.source,
      origin: entry.origin,
      lint: entry.lint,
      views: entry.tool.views,
    };
  }

  // The row of an entry. A user copy names the built-in pack it overrides, when there is one.
  private rowOf(entry: ToolEntry): Row {
    const builtin = this.builtins.get(entry.name);
    const overrides =
      entry.origin === 'user' &&
      builtin !== undefined &&
      isBuiltinOrigin(builtin.origin)
        ? builtin.origin
        : undefined;
    return { entry, overrides };
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
      if (user?.valid) {
        rows.push(this.rowOf(user));
        continue;
      }
      if (builtin !== undefined) rows.push(this.rowOf(builtin));
      if (user !== undefined) rows.push(this.rowOf(user));
    }
    return rows;
  }
}
