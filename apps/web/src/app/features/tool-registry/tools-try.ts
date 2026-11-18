import {
  Component,
  computed,
  DestroyRef,
  inject,
  input,
  OnInit,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import type {
  FormDescriptor,
  FormField,
  ToolArgsIssue,
  ToolArguments,
  ToolCallResult,
} from '@bbartolome/scriba-contracts/tool-registry';
import { API_CLIENT, ApiError } from '../../shell';
import {
  ACTIVE_PROJECT_PATH,
  activeCopy,
  entityResolutionCopy,
  entityResolvePath,
  fileReadCopy,
  projectFilePath,
  styleProfileOf,
} from './project-store-copy';
import {
  toolCallResultCopy,
  toolDetailCopy,
  toolExecutePath,
  toolPath,
  type ToolDetailView,
} from './tool-copy';
import { ToolForm } from './tool-form';
import { issuesOf } from './tools-preview';

const PROJECT_YAML = 'project.yaml';

/** The fields that take an entity, and the style fields among them. */
const ENTITY_CONTROLS = ['entity-picker', 'style-picker'];

/** One source the output cites: its ID, and its project path when the resolution gave one. */
interface Source {
  readonly id: string;
  readonly path: string;
}

export function isEntityField(field: FormField): boolean {
  return ENTITY_CONTROLS.includes(field.control);
}

export function isStyleField(field: FormField): boolean {
  return field.control === 'style-picker';
}

/** The IDs of the entity fields, in form order, each once. An empty value adds nothing. */
export function idsOf(
  fields: readonly FormField[],
  args: ToolArguments,
): string[] {
  const ids: string[] = [];
  for (const field of fields.filter(isEntityField)) {
    const value: unknown = args[field.key];
    const values = Array.isArray(value) ? value : [value];
    for (const item of values) {
      if (typeof item === 'string' && item !== '' && !ids.includes(item)) {
        ids.push(item);
      }
    }
  }
  return ids;
}

/** Whether a style field's argument is empty, so that the project's style profile fills it. */
export function isEmpty(value: unknown): boolean {
  return value === undefined || value === null || value === '';
}

/**
 * The Try panel (TRG-16): the Try tab of a valid tool's detail. It draws the tool's form, resolves the
 * chosen entities in the browser, runs the tool with `execute` and shows the output and its sources.
 * It writes no file and creates no pending change: the only request it posts is execute.
 */
@Component({
  selector: 'app-tools-try',
  imports: [ToolForm],
  styles: `
    :host {
      display: block;
    }

    .note {
      margin: 0 0 12px;
      font-size: 12px;
    }

    pre {
      overflow-x: auto;
      margin: 0 0 12px;
    }
  `,
  template: `
    @if (failure(); as text) {
      <p class="note" role="alert">{{ text }}</p>
    }
    @if (loading()) {
      <p class="note">Loading the tool</p>
    }
    @if (activeNote(); as text) {
      <p class="note">{{ text }}</p>
    }

    @if (form(); as descriptor) {
      <app-tool-form
        [form]="descriptor"
        layout="form"
        [issues]="issues()"
        [(value)]="formValue"
        (submitted)="run($event)"
      />
    }

    @if (runNote(); as text) {
      <p class="note" role="alert">{{ text }}</p>
    }
    @if (resolutionErrors().length > 0) {
      <ul class="note" data-resolution-errors>
        @for (message of resolutionErrors(); track $index) {
          <li>{{ message }}</li>
        }
      </ul>
    }

    @if (output(); as result) {
      <pre data-output [attr.data-kind]="result.output.kind">{{
        result.output.content
      }}</pre>
      <ul aria-label="Sources">
        @for (source of sources(); track source.id) {
          <li data-source>{{ source.path }}</li>
        }
      </ul>
    }
  `,
})
export class ToolsTryPanel implements OnInit {
  /** The tool the panel runs, by name. */
  readonly tool = input.required<string>();

  private readonly api = inject(API_CLIENT);
  private readonly destroyRef = inject(DestroyRef);

  /** The active project's ID, or null when none is active. */
  protected readonly active = signal<string | null>(null);
  /** True when the active project could not be read. */
  protected readonly activeFailed = signal(false);
  /** The tool's detail, once read. Null until the read answers. */
  private readonly detail = signal<ToolDetailView | null>(null);
  /** The reason the tool could not be shown, or '' when it is not failing. */
  protected readonly failure = signal('');

  /** The form descriptor of the tool, or null when it has no views. */
  protected readonly form = computed<FormDescriptor | null>(
    () => this.detail()?.views?.form ?? null,
  );
  protected readonly loading = computed(
    () => this.detail() === null && this.failure() === '',
  );

  /** The one-line state of the active project, shown beside the form. Undefined when it is active. */
  protected readonly activeNote = computed<string | undefined>(() => {
    if (this.activeFailed()) return 'The active project could not be read.';
    if (this.detail() !== null && this.active() === null) {
      return 'No active project, so the tool cannot run.';
    }
    return undefined;
  });

  /** The arguments of the form. */
  protected readonly formValue = signal<ToolArguments>({});
  /** The issues of the last refused run, shown beside their fields. */
  protected readonly issues = signal<ToolArgsIssue[]>([]);
  /** The reason the run could not start or finish, or '' when there is none. */
  protected readonly runNote = signal('');
  /** The messages of the resolution errors (unknown or duplicate IDs). */
  protected readonly resolutionErrors = signal<readonly string[]>([]);
  /** The output of the last successful run, or null before one. */
  protected readonly output = signal<ToolCallResult | null>(null);
  /** The sources of the output: the IDs it cites, with their project paths. */
  protected readonly sources = signal<readonly Source[]>([]);

  /** True while a run is in flight; a submit then does nothing. */
  private readonly running = signal(false);

  ngOnInit(): void {
    this.api
      .get(ACTIVE_PROJECT_PATH, activeCopy)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ active }) => this.active.set(active),
        error: () => this.activeFailed.set(true),
      });
    this.api
      .get(toolPath(this.tool()), toolDetailCopy)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (detail) => {
          this.detail.set(detail);
          if (detail.views === null) {
            this.failure.set('The tool has no valid views to draw.');
          }
        },
        error: () => this.failure.set('The tool could not be read.'),
      });
  }

  /** The form's submit: the chain of a run. Each step stops the run when it fails. */
  protected run(args: ToolArguments): void {
    if (this.running()) return;
    const project = this.active();
    this.output.set(null);
    this.sources.set([]);
    this.issues.set([]);
    this.resolutionErrors.set([]);
    this.runNote.set('');
    if (this.activeFailed()) {
      this.runNote.set('The active project could not be read.');
      return;
    }
    if (project === null) {
      return;
    }
    const descriptor = this.form();
    if (descriptor === null) {
      return;
    }
    this.running.set(true);
    this.fillStyle(project, descriptor.fields, args, (filled) =>
      this.resolve(project, descriptor.fields, filled),
    );
  }

  /** Step (c): an empty style field takes the project's style profile. A failed read leaves it empty. */
  private fillStyle(
    project: string,
    fields: readonly FormField[],
    args: ToolArguments,
    next: (filled: ToolArguments) => void,
  ): void {
    const styleKeys = fields
      .filter((field) => isStyleField(field) && isEmpty(args[field.key]))
      .map((field) => field.key);
    if (styleKeys.length === 0) {
      next(args);
      return;
    }
    this.api
      .get(projectFilePath(project), fileReadCopy, { path: PROJECT_YAML })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (file) => {
          const profile = styleProfileOf(file.content);
          const filled = { ...args };
          if (profile !== undefined) {
            for (const key of styleKeys) {
              filled[key] = profile;
            }
          }
          next(filled);
        },
        error: () => next(args),
      });
  }

  /** Steps (d) to (e): resolves the chosen IDs, or none, then runs the tool. */
  private resolve(
    project: string,
    fields: readonly FormField[],
    args: ToolArguments,
  ): void {
    const ids = idsOf(fields, args);
    if (ids.length === 0) {
      this.execute(args, [], new Map());
      return;
    }
    this.api
      .get(entityResolvePath(project, ids), entityResolutionCopy)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (resolution) => {
          if (resolution.errors.length > 0) {
            this.resolutionErrors.set(
              resolution.errors.map((error) =>
                error.code === 'unknown'
                  ? `No entity has the id "${error.id}".`
                  : `More than one file has the id "${error.id}": ${(error.paths ?? []).join(', ')}.`,
              ),
            );
            this.running.set(false);
            return;
          }
          // C6: the call entity names the ID `ref`. The path is kept by ID for the sources list.
          const paths = new Map(
            resolution.resolved.map((item) => [item.id, item.path]),
          );
          const entities = resolution.resolved.map((item) => ({
            ref: item.id,
            type: item.type,
            path: item.path,
            content: item.content,
          }));
          this.execute(args, entities, paths);
        },
        error: () => {
          this.runNote.set('The entities could not be resolved.');
          this.running.set(false);
        },
      });
  }

  /** Step (f): posts the arguments and the resolved entities to execute, and shows the outcome. */
  private execute(
    args: ToolArguments,
    entities: readonly unknown[],
    paths: ReadonlyMap<string, string>,
  ): void {
    this.api
      .post(
        toolExecutePath(this.tool()),
        { arguments: args, entities },
        toolCallResultCopy,
      )
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (result) => {
          this.output.set(result);
          this.sources.set(
            result.sourcesUsed.map((id) => ({
              id,
              path: paths.get(id) ?? id,
            })),
          );
          this.running.set(false);
        },
        error: (error: unknown) => {
          this.refused(error);
          this.running.set(false);
        },
      });
  }

  /** C7: a refused run shows its issues beside the fields; another ApiError its message; else a fallback. */
  private refused(error: unknown): void {
    if (error instanceof ApiError && error.code === 'TOOL_ARGS_INVALID') {
      this.issues.set(issuesOf(error.details));
      return;
    }
    if (error instanceof ApiError) {
      this.runNote.set(error.message);
      return;
    }
    this.runNote.set('The tool could not be run.');
  }
}
