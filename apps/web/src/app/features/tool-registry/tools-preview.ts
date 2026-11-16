import { CdkDrag, CdkDropList, CdkDropListGroup } from '@angular/cdk/drag-drop';
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
import type { EntityList } from '@bbartolome/scriba-contracts/project-store';
import type {
  ToolArgsIssue,
  ToolArguments,
  ToolValidateResult,
} from '@bbartolome/scriba-contracts/tool-registry';
import { API_CLIENT, ApiError } from '../../shell';
import {
  ACTIVE_PROJECT_PATH,
  activeCopy,
  entityListCopy,
  projectEntitiesPath,
} from './project-store-copy';
import {
  toolDetailCopy,
  toolPath,
  toolValidateCopy,
  toolValidatePath,
  type ToolDetailView,
} from './tool-copy';
import { ToolForm } from './tool-form';

type EntityItem = EntityList['entities'][number];

/** One entity chip: its id, its kind (the drag payload) and the label it shows. */
interface Chip {
  readonly id: string;
  readonly type: string;
  readonly label: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function chipOf(entity: EntityItem): Chip {
  return {
    id: entity.id,
    type: entity.type,
    label: entity.title ? entity.title : entity.id,
  };
}

/** The issues of a refused validate: the `issues` of ApiError.details, each with a path and a message. */
export function issuesOf(details: unknown): ToolArgsIssue[] {
  if (!isRecord(details)) {
    return [];
  }
  const list: unknown = details['issues'];
  if (!Array.isArray(list)) {
    return [];
  }
  return list.filter(
    (issue): issue is ToolArgsIssue =>
      isRecord(issue) &&
      typeof issue['path'] === 'string' &&
      typeof issue['message'] === 'string',
  );
}

/**
 * The Tools preview (TRG-05): the cold-open fixture, loaded once from the API, drawn in the form layout and
 * in the node-body layout side by side. The entity chips come from the active project; a chip dragged onto
 * a picker lands in it. Submit posts the form's arguments to validate: a refusal shows its issues inline, and
 * a valid answer shows the arguments with their defaults applied. It is the Preview tab of a tool's detail (TRG-13).
 */
@Component({
  selector: 'app-tools-preview',
  imports: [CdkDrag, CdkDropList, CdkDropListGroup, ToolForm],
  styles: `
    :host {
      display: block;
    }

    .layouts {
      display: flex;
      flex-wrap: wrap;
      align-items: flex-start;
      gap: 24px;
    }

    .layout {
      flex: 1 1 22rem;
      min-width: 0;
    }

    .chips {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      list-style: none;
      margin: 0 0 12px;
      padding: 0;
    }

    .chip {
      display: inline-block;
      padding: 4px 8px;
      border: 1px solid currentColor;
      border-radius: 4px;
      cursor: grab;
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
    <div cdkDropListGroup class="preview">
      <h2>Tools preview</h2>
      <p class="note">
        The cold-open tool, from one API response: a form layout and a node
        body.
      </p>

      @if (failure(); as text) {
        <p class="note" role="alert">{{ text }}</p>
      }
      @if (loading()) {
        <p class="note">Loading the tool</p>
      }

      <section aria-label="Entity chips">
        <h2>Entities</h2>
        @if (entityNote(); as text) {
          <p class="note">{{ text }}</p>
        }
        <ul class="chips">
          @for (chip of chips(); track chip.id) {
            <li>
              <div
                cdkDropList
                class="chip-slot"
                [cdkDropListSortingDisabled]="true"
              >
                <span
                  cdkDrag
                  class="chip"
                  [cdkDragData]="{ id: chip.id, type: chip.type }"
                  [attr.data-chip]="chip.id"
                  >{{ chip.label }}</span
                >
              </div>
            </li>
          }
        </ul>
      </section>

      @if (view(); as tool) {
        <div class="layouts">
          <section class="layout" aria-label="Form layout">
            <h2>Form layout</h2>
            <app-tool-form
              [form]="tool.form"
              layout="form"
              [issues]="issues()"
              [(value)]="formValue"
              (submitted)="submit($event)"
            />
          </section>
          <section class="layout" aria-label="Node body">
            <h2>Node body</h2>
            <app-tool-form
              [form]="tool.form"
              [ports]="tool.ports"
              layout="node-body"
              [issues]="issues()"
              [handle]="dropHandle"
              [(value)]="nodeValue"
            />
          </section>
        </div>

        <section aria-label="Form value">
          <h2>Form value</h2>
          <pre>{{ formText() }}</pre>
        </section>

        <section aria-label="Validate result">
          <h2>Validate result</h2>
          @if (result() !== null) {
            <pre>{{ resultText() }}</pre>
          }
        </section>
      }

      <ng-template #dropHandle let-row>
        <i
          class="handle"
          aria-hidden="true"
          [attr.data-port]="row.key"
          [attr.data-side]="row.side"
        ></i>
      </ng-template>
    </div>
  `,
})
export class ToolsPreviewPage implements OnInit {
  /** The tool the preview reads and validates, by name. */
  readonly tool = input.required<string>();

  private readonly api = inject(API_CLIENT);
  private readonly destroyRef = inject(DestroyRef);

  /** The tool's detail, once read. Null until the read answers. */
  protected readonly detail = signal<ToolDetailView | null>(null);
  /** The reason the tool could not be shown, or '' when it is not failing. */
  protected readonly failure = signal('');
  /** The one-line state of the entity list: no project, or a failed read. Null when the list is shown. */
  protected readonly entityNote = signal<string | null>(null);
  protected readonly chips = signal<readonly Chip[]>([]);

  /** The arguments of the form layout, and of the node body (its parameters). */
  protected readonly formValue = signal<ToolArguments>({});
  protected readonly nodeValue = signal<ToolArguments>({});

  /** The issues of the last refused validate, shown by both layouts. */
  protected readonly issues = signal<ToolArgsIssue[]>([]);
  /** The last accepted validate answer, or null before one. */
  protected readonly result = signal<ToolValidateResult | null>(null);

  protected readonly view = computed(() => this.detail()?.views ?? null);
  protected readonly loading = computed(
    () => this.detail() === null && this.failure() === '',
  );
  protected readonly formText = computed(() =>
    JSON.stringify(this.formValue(), null, 2),
  );
  protected readonly resultText = computed(() => {
    const result = this.result();
    return result === null ? '' : JSON.stringify(result.arguments, null, 2);
  });

  /** Reads the active project and its entity list, then the tool once. */
  ngOnInit(): void {
    this.api
      .get(ACTIVE_PROJECT_PATH, activeCopy)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ active }) => {
          if (active === null) {
            this.entityNote.set('No active project, so no entity chips.');
            this.readDetail();
          } else {
            this.readEntities(active);
          }
        },
        error: () => {
          this.entityNote.set('Entities could not be read.');
          this.readDetail();
        },
      });
  }

  /** The entity list of the active project, as chips. */
  private readEntities(projectId: string): void {
    this.api
      .get(projectEntitiesPath(projectId), entityListCopy)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (list) => {
          this.chips.set(list.entities.map(chipOf));
          this.readDetail();
        },
        error: () => {
          this.entityNote.set('Entities could not be read.');
          this.readDetail();
        },
      });
  }

  /** The tool's detail, read once. A tool with no views has no layouts to draw. */
  private readDetail(): void {
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

  /** The form layout's submit: the arguments go to validate, in full mode. */
  protected submit(args: ToolArguments): void {
    this.api
      .post(
        toolValidatePath(this.tool()),
        { arguments: args, mode: 'full' },
        toolValidateCopy,
      )
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (result) => {
          this.issues.set([]);
          this.failure.set('');
          this.result.set(result);
        },
        error: (error: unknown) => this.refused(error),
      });
  }

  /** A refused validate with issues shows them inline; any other failure says the check did not run. */
  private refused(error: unknown): void {
    this.result.set(null);
    if (
      error instanceof ApiError &&
      error.status === 422 &&
      error.code === 'TOOL_ARGS_INVALID'
    ) {
      this.failure.set('');
      this.issues.set(issuesOf(error.details));
      return;
    }
    this.failure.set('The arguments could not be checked.');
  }
}
