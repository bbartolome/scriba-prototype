import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  input,
  OnInit,
  output,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import type { InputValue } from '@bbartolome/scriba-contracts/graph-runner';
import type { FormField } from '@bbartolome/scriba-contracts/tool-registry';
import { catchError, map, of } from 'rxjs';
import { API_CLIENT } from '../../shell';
import { EntityPicker } from '../tool-registry/tool-registry.routes';
import { fileListCopy, projectFilesPath } from './graph-runner-contract';
import type { DialogField, DialogValues, InputField } from './run-state';

// The input-values dialog of a run (C-5): an inline section, not a native dialog. Each input node gets its
// value (text or a project file, entities, or a style), each output node its target path. It emits the values
// on Start; the page sends them. Cancel emits without a value.

let dialogCount = 0;

/** The form field the entity or style picker draws for one input node (C-5). */
function pickerFieldOf(field: InputField): FormField {
  const style = field.type === 'style';
  return {
    key: field.nodeId,
    title: field.label,
    description: '',
    control: style ? 'style-picker' : 'entity-picker',
    required: false,
    default: undefined,
    list: !style,
    port: false,
    ...(style ? {} : { entityKinds: [...field.entityKinds] }),
  };
}

/** The value a field starts with: empty text, no entities, no style. */
function emptyValueOf(field: InputField): InputValue {
  switch (field.type) {
    case 'text':
      return { kind: 'text', text: '' };
    case 'entity':
      return { kind: 'entities', refs: [] };
    case 'style':
      return { kind: 'style', ref: '' };
  }
}

/** A value's text mode: a file reference, or typed text. */
function modeOf(value: InputValue | undefined): 'text' | 'file' {
  return value?.kind === 'file' ? 'file' : 'text';
}

@Component({
  imports: [EntityPicker],
  selector: 'app-run-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section role="dialog" data-run-dialog [attr.aria-label]="title()">
      <h3>{{ title() }}</h3>
      @for (field of fields(); track field.nodeId) {
        @if (field.kind === 'input') {
          <div data-run-field [attr.data-run-field]="field.nodeId">
            <p>{{ field.label }}</p>
            @if (field.type === 'text') {
              <select
                data-text-mode
                [attr.aria-label]="field.label + ' mode'"
                [value]="modeOf(field.nodeId)"
                (change)="setMode(field.nodeId, $any($event.target).value)"
              >
                <option value="text">Text</option>
                <option value="file">Project file</option>
              </select>
              @if (modeOf(field.nodeId) === 'file') {
                <input
                  type="text"
                  [attr.aria-label]="field.label + ' file'"
                  [attr.list]="fileListId"
                  [value]="fileOf(field.nodeId)"
                  (input)="setFile(field.nodeId, $any($event.target).value)"
                />
              } @else {
                <textarea
                  [attr.aria-label]="field.label"
                  [value]="textOf(field.nodeId)"
                  (input)="setText(field.nodeId, $any($event.target).value)"
                ></textarea>
              }
            } @else {
              @if (pickers().get(field.nodeId); as picker) {
                <app-entity-picker
                  [field]="picker"
                  [value]="valueOf(field.nodeId)"
                  (valueChange)="setPicked(field.nodeId, $event)"
                />
              }
            }
          </div>
        } @else {
          <div data-run-field [attr.data-run-field]="field.nodeId">
            <p>{{ field.nodeId }}</p>
            <label>
              Target path
              <input
                type="text"
                data-target
                [attr.list]="fileListId"
                [value]="targetOf(field.nodeId)"
                (input)="setTarget(field.nodeId, $any($event.target).value)"
              />
            </label>
            <p data-target-hint>Leave empty to use the generated name.</p>
          </div>
        }
      }
      <datalist [id]="fileListId">
        @for (path of filePaths(); track path) {
          <option [value]="path"></option>
        }
      </datalist>
      @if (failure() !== '') {
        <p role="alert" data-run-error>{{ failure() }}</p>
      }
      <div class="actions">
        <button
          type="button"
          data-start
          [disabled]="!canStart()"
          (click)="onStart()"
        >
          Start
        </button>
        <button type="button" data-cancel (click)="cancel.emit()">
          Cancel
        </button>
      </div>
    </section>
  `,
})
export class RunDialog implements OnInit {
  /** The dialog's heading, for example "Run the whole recipe". */
  readonly title = input.required<string>();
  /** The fields of the scope: the input and output nodes, in file order. */
  readonly fields = input.required<readonly DialogField[]>();
  /** The active project's id: the files of its datalist. */
  readonly projectId = input.required<string>();
  /** True while a start is sent: Start is disabled. */
  readonly busy = input(false);
  /** The server's message of a refused start; empty when there is none. */
  readonly failure = input('');

  /** The values on Start: one input value per input node and one target path per output node. */
  readonly start = output<DialogValues>();
  /** Closes the dialog without a start. */
  readonly cancel = output<void>();

  private readonly api = inject(API_CLIENT);
  private readonly destroyRef = inject(DestroyRef);
  protected readonly fileListId = `run-dialog-files-${++dialogCount}`;

  private readonly inputs = signal<Readonly<Record<string, InputValue>>>({});
  private readonly targets = signal<Readonly<Record<string, string>>>({});
  protected readonly filePaths = signal<readonly string[]>([]);

  /** The picker field of each input node that has a picker (entities and style). */
  protected readonly pickers = computed(() => {
    const map = new Map<string, FormField>();
    for (const field of this.fields()) {
      if (field.kind === 'input' && field.type !== 'text') {
        map.set(field.nodeId, pickerFieldOf(field));
      }
    }
    return map;
  });

  /** Start needs every file input to name a file and every style input a style. */
  protected readonly canStart = computed(
    () =>
      !this.busy() &&
      this.fields().every((field) => {
        if (field.kind !== 'input') return true;
        const value = this.inputs()[field.nodeId];
        if (value?.kind === 'file') return value.ref !== '';
        if (value?.kind === 'style') return value.ref !== '';
        return value !== undefined;
      }),
  );

  ngOnInit(): void {
    const inputs: Record<string, InputValue> = {};
    const targets: Record<string, string> = {};
    for (const field of this.fields()) {
      if (field.kind === 'input') inputs[field.nodeId] = emptyValueOf(field);
      else targets[field.nodeId] = field.path;
    }
    this.inputs.set(inputs);
    this.targets.set(targets);
    this.api
      .get(projectFilesPath(this.projectId()), fileListCopy, {
        path: '.',
        recursive: 'true',
      })
      .pipe(
        map((list) =>
          list.entries
            .filter((entry) => entry.kind === 'file')
            .map((entry) => entry.path),
        ),
        catchError(() => of<string[]>([])),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((paths) => this.filePaths.set(paths));
  }

  protected modeOf(nodeId: string): 'text' | 'file' {
    return modeOf(this.inputs()[nodeId]);
  }

  protected textOf(nodeId: string): string {
    const value = this.inputs()[nodeId];
    return value?.kind === 'text' ? value.text : '';
  }

  protected fileOf(nodeId: string): string {
    const value = this.inputs()[nodeId];
    return value?.kind === 'file' ? value.ref : '';
  }

  protected valueOf(nodeId: string): unknown {
    const value = this.inputs()[nodeId];
    if (value?.kind === 'entities') return value.refs;
    if (value?.kind === 'style')
      return value.ref === '' ? undefined : value.ref;
    return undefined;
  }

  protected targetOf(nodeId: string): string {
    return this.targets()[nodeId] ?? '';
  }

  protected setMode(nodeId: string, mode: string): void {
    this.setInput(
      nodeId,
      mode === 'file' ? { kind: 'file', ref: '' } : { kind: 'text', text: '' },
    );
  }

  protected setText(nodeId: string, text: string): void {
    this.setInput(nodeId, { kind: 'text', text });
  }

  protected setFile(nodeId: string, ref: string): void {
    this.setInput(nodeId, { kind: 'file', ref });
  }

  /** A picker's change: a list of ids for entities, one id (or none) for a style. */
  protected setPicked(nodeId: string, value: unknown): void {
    if (this.pickers().get(nodeId)?.control === 'style-picker') {
      this.setInput(nodeId, {
        kind: 'style',
        ref: typeof value === 'string' ? value : '',
      });
      return;
    }
    this.setInput(nodeId, {
      kind: 'entities',
      refs: Array.isArray(value)
        ? value.filter((id) => typeof id === 'string')
        : [],
    });
  }

  protected setTarget(nodeId: string, path: string): void {
    this.targets.update((current) => ({ ...current, [nodeId]: path }));
  }

  protected onStart(): void {
    if (!this.canStart()) return;
    const inputs: Record<string, InputValue> = {};
    for (const field of this.fields()) {
      if (field.kind !== 'input') continue;
      const value = this.inputs()[field.nodeId];
      if (value !== undefined) inputs[field.nodeId] = value;
    }
    const targets: Record<string, string> = {};
    for (const field of this.fields()) {
      if (field.kind === 'output') {
        targets[field.nodeId] = this.targets()[field.nodeId] ?? '';
      }
    }
    this.start.emit({ inputs, targets });
  }

  private setInput(nodeId: string, value: InputValue): void {
    this.inputs.update((current) => ({ ...current, [nodeId]: value }));
  }
}
