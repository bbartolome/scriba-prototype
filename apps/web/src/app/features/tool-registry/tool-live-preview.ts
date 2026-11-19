import {
  Component,
  computed,
  DestroyRef,
  inject,
  input,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import type {
  FormField,
  ToolArgsIssue,
  ToolArguments,
  ToolViews,
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
import { toolRenderCopy, toolRenderPath } from './tool-copy';
import { ToolForm } from './tool-form';
import { idsOf, isEmpty, isStyleField } from './tools-try';
import { issuesOf } from './tools-preview';

const PROJECT_YAML = 'project.yaml';

/** The four tabs of the panel (TRG-15 D2). */
type LiveTab = 'form' | 'node' | 'function' | 'prompt';

const TABS: readonly { readonly id: LiveTab; readonly label: string }[] = [
  { id: 'form', label: 'Form' },
  { id: 'node', label: 'Node' },
  { id: 'function', label: 'Function schema' },
  { id: 'prompt', label: 'Rendered prompt' },
];

/**
 * The live panel beside the tool editor (TRG-15). It draws the form, the node, the function schema and the
 * rendered prompt of the views the editor's lint gave. The rendered prompt posts the source of the editor to
 * render, so an unsaved text renders. The panel writes no file and saves nothing.
 */
@Component({
  selector: 'app-tool-live-preview',
  imports: [ToolForm],
  styles: `
    :host {
      display: block;
    }

    [role='tablist'] {
      display: flex;
      flex-wrap: wrap;
      gap: 4px;
      margin: 0 0 12px;
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
    <section aria-label="Live preview">
      @if (views(); as view) {
        <div role="tablist">
          @for (item of tabs; track item.id) {
            <button
              type="button"
              role="tab"
              [attr.data-live-tab]="item.id"
              [attr.aria-selected]="tab() === item.id"
              (click)="tab.set(item.id)"
            >
              {{ item.label }}
            </button>
          }
        </div>

        <div role="tabpanel" data-live-panel>
          @switch (tab()) {
            @case ('form') {
              <app-tool-form
                [form]="view.form"
                layout="form"
                [issues]="issues()"
                [(value)]="formValue"
              />
            }
            @case ('node') {
              <app-tool-form
                [form]="view.form"
                layout="node-body"
                [ports]="view.ports"
                [(value)]="formValue"
              />
            }
            @case ('function') {
              <pre data-function>{{ functionText() }}</pre>
            }
            @case ('prompt') {
              <button type="button" data-render (click)="render()">
                Render
              </button>
              @if (runNote() !== '') {
                <p class="note" role="alert">{{ runNote() }}</p>
              }
              @if (resolutionErrors().length > 0) {
                <ul class="note" data-resolution-errors>
                  @for (message of resolutionErrors(); track $index) {
                    <li>{{ message }}</li>
                  }
                </ul>
              }
              @if (prompt(); as text) {
                <pre data-prompt>{{ text }}</pre>
              }
            }
          }
        </div>
      } @else {
        <p class="note" data-live-note>
          Nothing to preview: the source has no valid views yet.
        </p>
      }
    </section>
  `,
})
export class ToolLivePreview {
  /** The tool name, used in the render path. A draft has its name here, and it is not saved. */
  readonly tool = input.required<string>();
  /** The YAML text the views are of. Render receives it, so an unsaved text renders. */
  readonly source = input.required<string>();
  /** The views of the source, or null when the source has no valid views. */
  readonly views = input<ToolViews | null>(null);

  protected readonly tabs = TABS;

  private readonly api = inject(API_CLIENT);
  private readonly destroyRef = inject(DestroyRef);

  /** The selected tab. The form is the first and the default. */
  protected readonly tab = signal<LiveTab>('form');
  /** The active project's ID, or null when none is active. Read on the first Render, not at creation. */
  private readonly active = signal<string | null>(null);
  /** True once the active project has been read. */
  private activeLoaded = false;
  /** True when the active project could not be read. */
  private readonly activeFailed = signal(false);
  /** The arguments of the form, shared by the Form and the Node tabs. */
  protected readonly formValue = signal<ToolArguments>({});
  /** The issues of the last refused render, shown beside their fields. */
  protected readonly issues = signal<ToolArgsIssue[]>([]);
  /** The reason the render could not start or finish, or '' when there is none. */
  protected readonly runNote = signal('');
  /** The messages of the resolution errors (unknown or duplicate IDs). */
  protected readonly resolutionErrors = signal<readonly string[]>([]);
  /** The prompt of the last successful render, or null before one. */
  protected readonly prompt = signal<string | null>(null);
  /** True while a render is in flight; a click then does nothing. */
  private readonly running = signal(false);

  /** The function schema, as the JSON text the tab shows. */
  protected readonly functionText = computed(() =>
    this.views() === null
      ? ''
      : JSON.stringify(this.views()?.functionSchema, null, 2),
  );

  /** Render: the chain of a render. Each step stops it when it fails. Nothing is saved. */
  protected render(): void {
    const view = this.views();
    if (view === null || this.running()) return;
    this.prompt.set(null);
    this.issues.set([]);
    this.resolutionErrors.set([]);
    this.runNote.set('');
    if (this.activeFailed()) {
      this.runNote.set('The active project could not be read.');
      return;
    }
    this.running.set(true);
    this.loadActive(() => {
      const project = this.active();
      if (project === null) {
        this.runNote.set(
          'No active project, so the prompt cannot be rendered.',
        );
        this.running.set(false);
        return;
      }
      this.fillStyle(project, view.form.fields, this.formValue(), (filled) =>
        this.resolve(project, view.form.fields, filled),
      );
    });
  }

  /** Reads the active project once, on the first Render. A failed read sets activeFailed. */
  private loadActive(next: () => void): void {
    if (this.activeLoaded) {
      next();
      return;
    }
    this.api
      .get(ACTIVE_PROJECT_PATH, activeCopy)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ active }) => {
          this.active.set(active);
          this.activeLoaded = true;
          next();
        },
        error: () => {
          this.activeFailed.set(true);
          this.runNote.set('The active project could not be read.');
          this.running.set(false);
        },
      });
  }

  /** An empty style field takes the project's style profile. A failed read leaves it empty. */
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

  /** Resolves the chosen IDs, or none, then renders. */
  private resolve(
    project: string,
    fields: readonly FormField[],
    args: ToolArguments,
  ): void {
    const ids = idsOf(fields, args);
    if (ids.length === 0) {
      this.renderPrompt(args, []);
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
          // The entity names the ID `ref`, as the Try chain does (TRG-16 C6).
          const entities = resolution.resolved.map((item) => ({
            ref: item.id,
            type: item.type,
            path: item.path,
            content: item.content,
          }));
          this.renderPrompt(args, entities);
        },
        error: () => {
          this.runNote.set('The entities could not be resolved.');
          this.running.set(false);
        },
      });
  }

  /** Posts the arguments, the entities and the source to render, and shows the prompt. */
  private renderPrompt(
    args: ToolArguments,
    entities: readonly unknown[],
  ): void {
    this.api
      .post(
        toolRenderPath(this.tool()),
        { arguments: args, entities, source: this.source() },
        toolRenderCopy,
      )
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (result) => {
          this.prompt.set(result.prompt);
          this.running.set(false);
        },
        error: (error: unknown) => {
          this.refused(error);
          this.running.set(false);
        },
      });
  }

  /** A refused render shows its issues beside the fields; another ApiError its message; else a fallback. */
  private refused(error: unknown): void {
    if (error instanceof ApiError && error.code === 'TOOL_ARGS_INVALID') {
      this.issues.set(issuesOf(error.details));
      return;
    }
    if (error instanceof ApiError) {
      this.runNote.set(error.message);
      return;
    }
    this.runNote.set('The prompt could not be rendered.');
  }
}
