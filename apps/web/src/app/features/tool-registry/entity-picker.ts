import {
  CdkDropList,
  type CdkDrag,
  type CdkDragDrop,
} from '@angular/cdk/drag-drop';
import {
  Component,
  computed,
  DestroyRef,
  inject,
  input,
  model,
  OnInit,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatButton } from '@angular/material/button';
import { MatFormField, MatLabel } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import type { EntityList } from '@bbartolome/scriba-contracts/project-store';
import type { FormField } from '@bbartolome/scriba-contracts/tool-registry';
import { API_CLIENT } from '../../shell';
import {
  ACTIVE_PROJECT_PATH,
  activeCopy,
  ENTITY_ID_PATTERN,
  entityListCopy,
  fileReadCopy,
  projectEntitiesPath,
  projectFilePath,
  STYLE_PROFILE_KIND,
  styleProfileOf,
} from './project-store-copy';

type EntityItem = EntityList['entities'][number];

/** The state of the reads: the active project, then the entity list (and, for a style picker, project.yaml). */
type ReadStatus = 'loading' | 'ready' | 'failed' | 'no-project';

/** One option of a select, or one chip: the entity's id and its label (the title when present, else the id). */
interface Choice {
  readonly id: string;
  readonly label: string;
}

/** A dragged entity chip's payload: an entity id and its kind. */
interface ChipLike {
  readonly id: string;
  readonly type: string;
}

const PROJECT_YAML = 'project.yaml';

let pickerCount = 0;

/** A chip is an object with an entity id and a non-empty kind. Anything else is malformed. */
function isChip(value: unknown): value is ChipLike {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const { id, type } = value as Record<string, unknown>;
  return (
    typeof id === 'string' &&
    ENTITY_ID_PATTERN.test(id) &&
    typeof type === 'string' &&
    type !== ''
  );
}

/** A scalar value as an id: nothing for an absent or non-string value. */
function idIn(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

/** A list value as its ids: the string items, in order. Anything that is not an array has none. */
function idsIn(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string')
    : [];
}

function labelOf(entity: EntityItem): string {
  return entity.title ? entity.title : entity.id;
}

/** The one-line reason a chip is refused with: its kind, or no kind when the payload is malformed (P16). */
function refusalOf(chip: unknown): string {
  return isChip(chip)
    ? `A ${chip.type} cannot go here.`
    : 'That cannot go here.';
}

/**
 * The entity picker (TRG-04): one control for an entity field or a style field. It lists the active
 * project's entities of the field's kinds, read from the Project store, and holds entity ids: one id
 * for a scalar field, an array of ids for a list field, as chips. A style picker lists the style
 * profiles and preselects the project's `styleProfile` from project.yaml when the field has no value.
 * A chip dragged onto it (a CDK drag) is accepted when its kind fits the field, and refused with a
 * one-line reason when it does not. It never validates and never resolves an id to its contents: the
 * server's issues are ToolForm's.
 */
@Component({
  selector: 'app-entity-picker',
  imports: [CdkDropList, MatButton, MatFormField, MatInput, MatLabel],
  styles: `
    :host {
      display: block;
    }

    fieldset {
      display: flex;
      flex-direction: column;
      gap: 4px;
      margin: 0 0 12px;
      padding: 0;
      border: 0;
    }

    .chips {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      list-style: none;
      margin: 0;
      padding: 0;
    }

    .chip {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 4px;
      overflow-wrap: anywhere;
    }

    .mark {
      margin-left: 2px;
    }

    .note,
    .reason {
      margin: 0;
      font-size: 12px;
    }

    .reason {
      font-weight: 600;
    }
  `,
  template: `
    <div
      cdkDropList
      [cdkDropListSortingDisabled]="true"
      [cdkDropListEnterPredicate]="admits"
      (cdkDropListDropped)="drop($event)"
    >
      @if (isList()) {
        <fieldset>
          <legend>
            {{ field().title }}
            @if (field().required) {
              <span class="mark" aria-hidden="true">*</span>
            }
          </legend>
          <ul class="chips">
            @for (id of ids(); track $index; let position = $index) {
              <li class="chip" [attr.data-id]="id">
                <span>{{ labelOf(id) }}</span>
                <button matButton type="button" (click)="removeAt(position)">
                  Remove
                </button>
              </li>
            }
          </ul>
          <mat-form-field [hideRequiredMarker]="true">
            <select
              matNativeControl
              [id]="inputId"
              [attr.aria-label]="'Add to ' + field().title"
              [attr.aria-describedby]="describedBy() || null"
              (change)="addPicked($event)"
            >
              <option value="">Add an entity</option>
              @for (choice of addable(); track $index) {
                <option [value]="choice.id">{{ choice.label }}</option>
              }
            </select>
          </mat-form-field>
        </fieldset>
      } @else {
        <mat-form-field [hideRequiredMarker]="true">
          <mat-label>
            {{ field().title }}
            @if (field().required) {
              <span class="mark" aria-hidden="true">*</span>
            }
          </mat-label>
          <select
            matNativeControl
            [id]="inputId"
            [required]="field().required"
            [attr.aria-describedby]="describedBy() || null"
            (change)="pickScalar($event)"
          >
            <option value="" [selected]="scalar() === ''">None</option>
            @for (choice of options(); track $index) {
              <option [value]="choice.id" [selected]="choice.id === scalar()">
                {{ choice.label }}
              </option>
            }
          </select>
        </mat-form-field>
      }
      @if (note(); as text) {
        <p class="note">{{ text }}</p>
      }
      <p class="reason" role="status">{{ reason() }}</p>
    </div>
  `,
})
export class EntityPicker implements OnInit {
  /** The form field this picker draws: its title, its required mark, its control and its entity kinds. */
  readonly field = input.required<FormField>();
  /** The ids of the field's hint and issues, for the control's aria-describedby. Empty when it has none. */
  readonly describedBy = input('');
  /** The field's value, two-way through ToolForm: one id, or an array of ids for a list field. */
  readonly value = model<unknown>(undefined);

  private readonly api = inject(API_CLIENT);
  private readonly destroyRef = inject(DestroyRef);
  protected readonly inputId = `entity-picker-${++pickerCount}`;

  private readonly status = signal<ReadStatus>('loading');
  private readonly entities = signal<readonly EntityItem[]>([]);
  /** The one-line reason of the last refused chip. Cleared by the next accepted drop or change. */
  protected readonly reason = signal('');

  protected readonly isList = computed(() => this.field().list);
  protected readonly isStyle = computed(
    () => this.field().control === 'style-picker',
  );
  protected readonly ids = computed(() => idsIn(this.value()));
  protected readonly scalar = computed(() => idIn(this.value()));

  private readonly labels = computed(
    () =>
      new Map(this.entities().map((entity) => [entity.id, labelOf(entity)])),
  );

  /** The entities the picker offers: the valid ones of the field's kinds, once the list has been read. */
  private readonly offered = computed<Choice[]>(() => {
    if (this.status() !== 'ready') {
      return [];
    }
    return this.entities()
      .filter((entity) => this.accepts({ id: entity.id, type: entity.type }))
      .map((entity) => ({ id: entity.id, label: labelOf(entity) }));
  });

  /** The options of a scalar select: the offered entities, then the current id when the list does not hold it. */
  protected readonly options = computed<Choice[]>(() => {
    const current = this.scalar();
    const offered = this.offered();
    if (current === '' || offered.some((choice) => choice.id === current)) {
      return offered;
    }
    return [...offered, { id: current, label: current }];
  });

  /** The options of a list field's add select: the offered entities that the list does not hold yet. */
  protected readonly addable = computed<Choice[]>(() => {
    const held = this.ids();
    return this.offered().filter((choice) => !held.includes(choice.id));
  });

  protected readonly note = computed(() => {
    switch (this.status()) {
      case 'loading':
        return 'Loading entities';
      case 'failed':
        return 'Entities could not be read';
      case 'no-project':
        return 'No active project';
      case 'ready':
        return '';
    }
  });

  /** Reads the active project once, then its entity list, and for a style picker its project.yaml. */
  ngOnInit(): void {
    this.api
      .get(ACTIVE_PROJECT_PATH, activeCopy)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ active }) => this.readProject(active),
        error: () => this.status.set('failed'),
      });
  }

  /** The label of an id: the entity's title when the list holds it, else the id itself. */
  protected labelOf(id: string): string {
    return this.labels().get(id) ?? id;
  }

  /** A scalar select's choice: one id, or nothing for the empty option. */
  protected pickScalar(event: Event): void {
    const id = (event.target as HTMLSelectElement).value;
    this.commit(id === '' ? undefined : id);
  }

  /** A list's add select: the chosen id goes at the end, then the select shows its empty option again. */
  protected addPicked(event: Event): void {
    const select = event.target as HTMLSelectElement;
    const id = select.value;
    select.value = '';
    if (id !== '') {
      this.commit([...this.ids(), id]);
    }
  }

  /** A chip's Remove: the id leaves the array, which stays an array, empty when it was the last. */
  protected removeAt(position: number): void {
    this.commit(this.ids().filter((_, index) => index !== position));
  }

  /**
   * The enter predicate of the drop list: a chip the picker refuses does not enter it, so no drop
   * reaches `drop` for it. The refusal's reason shows here (P16).
   */
  protected readonly admits = (drag: CdkDrag): boolean => {
    const admitted = this.accepts(drag.data);
    if (!admitted) {
      this.reason.set(refusalOf(drag.data));
    }
    return admitted;
  };

  /**
   * A chip dropped on the picker. The kind is checked again, since the drop may come without the enter
   * predicate (a malformed payload is refused). A list appends the id unless it holds it; a scalar
   * takes it in place of its value. A refusal leaves the value as it was (P16).
   */
  protected drop(event: CdkDragDrop<unknown>): void {
    const chip: unknown = event.item.data;
    if (!this.accepts(chip)) {
      this.reason.set(refusalOf(chip));
      return;
    }
    if (this.isList()) {
      const held = this.ids();
      this.commit(held.includes(chip.id) ? held : [...held, chip.id]);
    } else {
      this.commit(chip.id);
    }
  }

  /**
   * Whether a chip of this kind may land on this picker (P2, P11, P13): a style picker takes the style
   * kind only; any other picker takes its field's kinds, and every kind when the field names none.
   */
  private accepts(chip: unknown): chip is ChipLike {
    if (!isChip(chip)) {
      return false;
    }
    if (this.isStyle()) {
      return chip.type === STYLE_PROFILE_KIND;
    }
    const kinds = this.field().entityKinds ?? [];
    return kinds.length === 0 || kinds.includes(chip.type);
  }

  private readProject(active: string | null): void {
    if (active === null) {
      this.status.set('no-project');
      return;
    }
    this.api
      .get(projectEntitiesPath(active), entityListCopy)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (list) => {
          this.entities.set(list.entities);
          this.status.set('ready');
        },
        error: () => this.status.set('failed'),
      });
    if (this.isStyle()) {
      this.api
        .get(projectFilePath(active), fileReadCopy, { path: PROJECT_YAML })
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: (file) => this.preselect(file.content),
          error: () => {
            // A failed read, like a project.yaml with no styleProfile line, gives no preselect.
          },
        });
    }
  }

  /** A style picker whose field holds no value takes the project's style profile (P15). */
  private preselect(content: string): void {
    const profile = styleProfileOf(content);
    const current = this.value();
    if (profile === undefined || (current !== undefined && current !== '')) {
      return;
    }
    this.commit(profile);
  }

  /** Writes one value through the model, and clears the refusal reason: a change is an accepted edit. */
  private commit(next: unknown): void {
    this.reason.set('');
    this.value.set(next);
  }
}
