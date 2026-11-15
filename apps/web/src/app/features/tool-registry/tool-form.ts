import { NgTemplateOutlet } from '@angular/common';
import {
  Component,
  computed,
  input,
  model,
  OnInit,
  output,
  TemplateRef,
} from '@angular/core';
import { MatButton } from '@angular/material/button';
import { MatFormField, MatLabel } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { MatSlideToggle } from '@angular/material/slide-toggle';
import type {
  FormDescriptor,
  FormField,
  PortDescriptor,
  PortType,
  ToolArguments,
  ToolArgsIssue,
  ValueType,
} from '@bbartolome/scriba-contracts/tool-registry';

/** The layout the form draws: every field, or the port rows and parameters of a canvas node. */
export type ToolFormLayout = 'form' | 'node-body';

/** One row of the node-body layout: an input port, then the output row, which comes last. */
export interface ToolFormPortRow {
  side: 'input' | 'output';
  key: string;
  title: string;
  type: PortType;
  list: boolean;
  required: boolean;
}

/** How a field is drawn. The first rule of the control mapping that matches a field wins. */
type FieldKind =
  | 'picker'
  | 'list'
  | 'select'
  | 'text'
  | 'textarea'
  | 'number'
  | 'range'
  | 'toggle';

/** A rendered field: its descriptor and the rendering facts the template reads. */
interface FieldView {
  readonly field: FormField;
  readonly index: number;
  readonly key: string;
  readonly kind: FieldKind;
  readonly options: readonly string[];
  readonly numeric: boolean;
  readonly rangeMin: string;
  readonly rangeMax: string;
  readonly rangeStep: string;
  readonly numberStep: string | null;
}

/** One server issue, with its id and the key of the field it names (undefined for the whole set). */
interface IssueView {
  readonly id: string;
  readonly key: string | undefined;
  readonly text: string;
}

let formCount = 0;

/**
 * The JSON type of the value a field sends. An absent valueType reads as number for number and slider
 * controls, and as string for the others.
 */
function valueTypeOf(field: FormField): ValueType {
  if (field.valueType !== undefined) return field.valueType;
  return field.control === 'number' || field.control === 'slider'
    ? 'number'
    : 'string';
}

/** The rendering of a field (D4): pickers, then lists, then the scalar controls. */
function kindOf(field: FormField): FieldKind {
  if (field.control === 'entity-picker' || field.control === 'style-picker') {
    return 'picker';
  }
  if (field.list) return 'list';
  if (field.control === 'select' && (field.enum?.length ?? 0) > 0) {
    return 'select';
  }
  if (
    field.control === 'slider' &&
    field.minimum !== undefined &&
    field.maximum !== undefined
  ) {
    return 'range';
  }
  if (field.control === 'number' || field.control === 'slider') return 'number';
  if (field.control === 'textarea') return 'textarea';
  if (field.control === 'toggle') return 'toggle';
  return 'text';
}

function viewOf(field: FormField, index: number): FieldView {
  const type = valueTypeOf(field);
  return {
    field,
    index,
    key: field.key,
    kind: kindOf(field),
    options: field.enum ?? [],
    numeric: type === 'integer' || type === 'number',
    rangeMin: field.minimum === undefined ? '' : String(field.minimum),
    rangeMax: field.maximum === undefined ? '' : String(field.maximum),
    rangeStep:
      type === 'integer'
        ? '1'
        : String(((field.maximum ?? 0) - (field.minimum ?? 0)) / 100),
    numberStep: type === 'number' ? 'any' : null,
  };
}

/** A value as the text of an input: nothing for an absent or null value. */
function textOf(value: unknown): string {
  return value === undefined || value === null ? '' : String(value);
}

/** The ids of a picker's value, as read-only text: a list is joined with commas. */
function idsOf(value: unknown): string {
  return Array.isArray(value) ? value.map(textOf).join(', ') : textOf(value);
}

/**
 * The segments of a JSON Pointer, unescaped as validate.ts does (`~1` is `/`, then `~0` is `~`).
 * A path that is empty, or is not a pointer, has no segments: it names the whole set.
 */
function segmentsOf(path: string): string[] {
  if (!path.startsWith('/')) return [];
  return path
    .slice(1)
    .split('/')
    .map((segment) => segment.replace(/~1/g, '/').replace(/~0/g, '~'));
}

/** An issue on one list item names it by its index: the message gets `Item N: ` (N counts from 1). */
function itemPrefixOf(segment: string): string {
  return /^\d+$/.test(segment) ? `Item ${Number(segment) + 1}: ` : '';
}

/**
 * The tool form (TRG-03): the arguments of one tool as typed controls in the form layout, or as the
 * port rows and parameters of a canvas node in the node-body layout. The control of each field is the
 * one the server derived; this component never chooses it from `valueType`. It never validates: the
 * `issues` are the server's, shown next to their fields. The pickers are TRG-04's: here they show their
 * ids as read-only text.
 */
@Component({
  selector: 'app-tool-form',
  imports: [
    MatButton,
    MatFormField,
    MatInput,
    MatLabel,
    MatSlideToggle,
    NgTemplateOutlet,
  ],
  styles: `
    :host {
      display: block;
    }

    section,
    fieldset {
      display: flex;
      flex-direction: column;
      gap: 4px;
      margin: 0 0 12px;
      padding: 0;
      border: 0;
    }

    form {
      display: flex;
      flex-direction: column;
      gap: 4px;
      max-width: 32rem;
    }

    .mark {
      margin-left: 2px;
    }

    .hint,
    .issue {
      margin: 0;
    }

    .hint {
      font-size: 12px;
    }

    .issue {
      font-weight: 600;
    }

    .field-title {
      margin: 0;
    }

    .picker-slot {
      min-height: 44px;
      padding: 8px 0;
      overflow-wrap: anywhere;
    }

    .range {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .item {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 8px;
    }

    .item mat-form-field {
      flex: 1 1 12rem;
    }

    .ports {
      list-style: none;
      margin: 0 0 12px;
      padding: 0;
    }

    .ports li {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 4px 8px;
      padding: 4px 0;
    }
  `,
  template: `
    @for (issue of topIssues(); track issue.id) {
      <p class="issue">{{ issue.text }}</p>
    }
    @if (layout() === 'node-body') {
      <ul class="ports">
        @for (row of portRows(); track row.key) {
          <li [attr.data-port]="row.key" [attr.data-side]="row.side">
            <span class="port-title">{{ row.title }}</span>
            <span class="port-type">{{
              row.type + (row.list ? ' list' : '')
            }}</span>
            @if (row.required) {
              <span class="mark" aria-hidden="true">*</span>
            }
            @if (handle(); as template) {
              <ng-container
                [ngTemplateOutlet]="template"
                [ngTemplateOutletContext]="{ $implicit: row }"
              ></ng-container>
            }
            @for (issue of issuesFor(row.key); track issue.id) {
              <p class="issue" [id]="issue.id">{{ issue.text }}</p>
            }
          </li>
        }
      </ul>
      <div class="params">
        <ng-container [ngTemplateOutlet]="fieldList"></ng-container>
      </div>
    } @else {
      <form novalidate (submit)="submit($event)">
        <ng-container [ngTemplateOutlet]="fieldList"></ng-container>
        <button matButton="filled" type="submit">Submit</button>
      </form>
    }

    <ng-template #fieldList>
      @for (view of fields(); track view.key) {
        <section
          [attr.data-key]="view.key"
          [attr.data-control]="view.field.control"
        >
          @switch (view.kind) {
            @case ('picker') {
              <p class="field-title">
                {{ view.field.title }}
                @if (view.field.required) {
                  <span class="mark" aria-hidden="true">*</span>
                }
              </p>
              <div
                class="picker-slot"
                [attr.data-control]="view.field.control"
                [attr.aria-describedby]="describedBy(view) || null"
              >
                {{ idsOf(valueOf(view.key)) }}
              </div>
            }
            @case ('list') {
              <fieldset>
                <legend>
                  {{ view.field.title }}
                  @if (view.field.required) {
                    <span class="mark" aria-hidden="true">*</span>
                  }
                </legend>
                @for (item of itemsOf(view.key); track $index; let n = $index) {
                  <div class="item">
                    <mat-form-field [hideRequiredMarker]="true">
                      @if (view.numeric) {
                        <input
                          matInput
                          type="number"
                          [id]="itemId(view, n)"
                          [attr.aria-label]="
                            view.field.title + ' item ' + (n + 1)
                          "
                          [attr.step]="view.numberStep"
                          [required]="view.field.required"
                          [aria-describedby]="describedBy(view)"
                          [value]="textOf(item)"
                          (input)="onItemNumber(view.key, n, $event)"
                        />
                      } @else {
                        <input
                          matInput
                          type="text"
                          [id]="itemId(view, n)"
                          [attr.aria-label]="
                            view.field.title + ' item ' + (n + 1)
                          "
                          [required]="view.field.required"
                          [aria-describedby]="describedBy(view)"
                          [value]="textOf(item)"
                          (input)="onItemText(view.key, n, $event)"
                        />
                      }
                    </mat-form-field>
                    <button
                      matButton
                      type="button"
                      (click)="removeItem(view.key, n)"
                    >
                      Remove
                    </button>
                  </div>
                }
                <div>
                  <button matButton type="button" (click)="addItem(view)">
                    Add item
                  </button>
                </div>
              </fieldset>
            }
            @case ('select') {
              <mat-form-field [hideRequiredMarker]="true">
                <mat-label>
                  {{ view.field.title }}
                  @if (view.field.required) {
                    <span class="mark" aria-hidden="true">*</span>
                  }
                </mat-label>
                <select
                  matNativeControl
                  [id]="idOf(view)"
                  [required]="view.field.required"
                  [aria-describedby]="describedBy(view)"
                  (change)="onSelect(view.key, $event)"
                >
                  <option
                    value=""
                    [selected]="textFor(view.key) === ''"
                  ></option>
                  @for (option of view.options; track option) {
                    <option
                      [value]="option"
                      [selected]="option === valueOf(view.key)"
                    >
                      {{ option }}
                    </option>
                  }
                </select>
              </mat-form-field>
            }
            @case ('text') {
              <mat-form-field [hideRequiredMarker]="true">
                <mat-label>
                  {{ view.field.title }}
                  @if (view.field.required) {
                    <span class="mark" aria-hidden="true">*</span>
                  }
                </mat-label>
                <input
                  matInput
                  type="text"
                  [id]="idOf(view)"
                  [required]="view.field.required"
                  [aria-describedby]="describedBy(view)"
                  [value]="textFor(view.key)"
                  (input)="onText(view.key, $event)"
                />
              </mat-form-field>
            }
            @case ('textarea') {
              <mat-form-field [hideRequiredMarker]="true">
                <mat-label>
                  {{ view.field.title }}
                  @if (view.field.required) {
                    <span class="mark" aria-hidden="true">*</span>
                  }
                </mat-label>
                <textarea
                  matInput
                  [id]="idOf(view)"
                  [required]="view.field.required"
                  [aria-describedby]="describedBy(view)"
                  [value]="textFor(view.key)"
                  (input)="onText(view.key, $event)"
                ></textarea>
              </mat-form-field>
            }
            @case ('number') {
              <mat-form-field [hideRequiredMarker]="true">
                <mat-label>
                  {{ view.field.title }}
                  @if (view.field.required) {
                    <span class="mark" aria-hidden="true">*</span>
                  }
                </mat-label>
                <input
                  matInput
                  type="number"
                  [id]="idOf(view)"
                  [attr.step]="view.numberStep"
                  [required]="view.field.required"
                  [aria-describedby]="describedBy(view)"
                  [value]="textFor(view.key)"
                  (input)="onNumber(view.key, $event)"
                />
              </mat-form-field>
            }
            @case ('range') {
              <div class="range">
                <label [attr.for]="idOf(view)">
                  {{ view.field.title }}
                  @if (view.field.required) {
                    <span class="mark" aria-hidden="true">*</span>
                  }
                </label>
                <!-- The bounds are properties, set before the value: a value is clamped to the bounds in place when it is set. -->
                <input
                  type="range"
                  [id]="idOf(view)"
                  [min]="view.rangeMin"
                  [max]="view.rangeMax"
                  [step]="view.rangeStep"
                  [attr.aria-required]="view.field.required ? 'true' : null"
                  [attr.aria-describedby]="describedBy(view) || null"
                  [value]="textFor(view.key)"
                  (input)="onNumber(view.key, $event)"
                />
              </div>
            }
            @case ('toggle') {
              <mat-slide-toggle
                [id]="idOf(view)"
                [checked]="valueOf(view.key) === true"
                [required]="view.field.required"
                [aria-describedby]="describedBy(view)"
                (change)="onToggle(view.key, $event.checked)"
              >
                {{ view.field.title }}
                @if (view.field.required) {
                  <span class="mark" aria-hidden="true">*</span>
                }
              </mat-slide-toggle>
            }
          }
          @if (view.field.description !== '') {
            <p class="hint" [id]="hintId(view)">{{ view.field.description }}</p>
          }
          @for (issue of issuesFor(view.key); track issue.id) {
            <p class="issue" [id]="issue.id">{{ issue.text }}</p>
          }
        </section>
      }
    </ng-template>
  `,
})
export class ToolForm implements OnInit {
  /** The form descriptor: the fields of the tool, in form order. */
  readonly form = input.required<FormDescriptor>();
  /** The port descriptor, used by the node-body layout only. */
  readonly ports = input<PortDescriptor | null>(null);
  readonly layout = input<ToolFormLayout>('form');
  /** The server's issues of refused arguments, shown next to their fields. */
  readonly issues = input<ToolArgsIssue[]>([]);
  /** The handle template of each port row (the Graph runner's), with the row as its context. */
  readonly handle = input<TemplateRef<{ $implicit: ToolFormPortRow }> | null>(
    null,
  );
  /** The arguments. Two-way: `[(value)]` keeps the host and the form in step. */
  readonly value = model<ToolArguments>({});
  /** The form layout's submit: the arguments, with the defaults shown. */
  readonly submitted = output<ToolArguments>();

  protected readonly textOf = textOf;
  protected readonly idsOf = idsOf;
  private readonly uid = `tool-form-${++formCount}`;

  /** The rendered fields: every field in the form layout, the parameters in the node-body layout. */
  protected readonly fields = computed<FieldView[]>(() => {
    const all = this.form().fields;
    const shown =
      this.layout() === 'node-body' ? all.filter((field) => !field.port) : all;
    return shown.map((field, index) => viewOf(field, index));
  });

  /** The port rows of the node-body layout, then the output row. */
  protected readonly portRows = computed<ToolFormPortRow[]>(() => {
    const ports = this.ports();
    if (this.layout() !== 'node-body' || ports === null) return [];
    const inputs = ports.inputs.map((port): ToolFormPortRow => ({
      side: 'input',
      key: port.key,
      title: port.title,
      type: port.type,
      list: port.list,
      required: port.required,
    }));
    const output: ToolFormPortRow = {
      side: 'output',
      key: ports.output.key,
      title: 'Output',
      type: ports.output.type,
      list: false,
      required: false,
    };
    return [...inputs, output];
  });

  private readonly issueViews = computed<IssueView[]>(() =>
    this.issues().map((issue, index) => {
      const segments = segmentsOf(issue.path);
      const prefix = segments.length > 1 ? itemPrefixOf(segments[1]) : '';
      return {
        id: `${this.uid}-issue-${index}`,
        key: segments.length > 0 ? segments[0] : undefined,
        text: `${prefix}${issue.message}`,
      };
    }),
  );

  private readonly renderedKeys = computed(
    () =>
      new Set<string>([
        ...this.fields().map((view) => view.key),
        ...this.portRows().map((row) => row.key),
      ]),
  );

  /** The issues that name no rendered field: shown once, above the fields. */
  protected readonly topIssues = computed(() =>
    this.issueViews().filter(
      (issue) => issue.key === undefined || !this.renderedKeys().has(issue.key),
    ),
  );

  /** Writes each rendered field's default once, for the keys the value does not hold. */
  ngOnInit(): void {
    const current = this.value();
    const added: ToolArguments = {};
    for (const view of this.fields()) {
      const fallback = view.field.default;
      if (
        fallback !== null &&
        fallback !== undefined &&
        !(view.key in current)
      ) {
        added[view.key] = fallback;
      }
    }
    if (Object.keys(added).length > 0) {
      this.value.set({ ...current, ...added });
    }
  }

  protected issuesFor(key: string): IssueView[] {
    return this.issueViews().filter((issue) => issue.key === key);
  }

  /** The ids of a field's hint and issues, for its control's aria-describedby. Empty when it has none. */
  protected describedBy(view: FieldView): string {
    const ids = [
      ...(view.field.description !== '' ? [this.hintId(view)] : []),
      ...this.issuesFor(view.key).map((issue) => issue.id),
    ];
    return ids.join(' ');
  }

  protected idOf(view: FieldView): string {
    return `${this.uid}-field-${view.index}`;
  }

  protected hintId(view: FieldView): string {
    return `${this.uid}-hint-${view.index}`;
  }

  protected itemId(view: FieldView, position: number): string {
    return `${this.uid}-field-${view.index}-item-${position}`;
  }

  protected valueOf(key: string): unknown {
    return this.value()[key];
  }

  protected textFor(key: string): string {
    return textOf(this.value()[key]);
  }

  protected itemsOf(key: string): unknown[] {
    const list = this.value()[key];
    return Array.isArray(list) ? list : [];
  }

  /** A text or textarea edit. An empty text removes the key, so the server reads "received nothing". */
  protected onText(key: string, event: Event): void {
    const text = (event.target as HTMLInputElement | HTMLTextAreaElement).value;
    this.write(key, text === '' ? undefined : text);
  }

  /** A number or slider edit. A number the input cannot read removes the key. */
  protected onNumber(key: string, event: Event): void {
    const number = (event.target as HTMLInputElement).valueAsNumber;
    this.write(key, Number.isNaN(number) ? undefined : number);
  }

  protected onSelect(key: string, event: Event): void {
    const option = (event.target as HTMLSelectElement).value;
    this.write(key, option === '' ? undefined : option);
  }

  protected onToggle(key: string, checked: boolean): void {
    this.write(key, checked);
  }

  protected onItemText(key: string, position: number, event: Event): void {
    const text = (event.target as HTMLInputElement).value;
    this.writeItem(key, position, text);
  }

  protected onItemNumber(key: string, position: number, event: Event): void {
    const number = (event.target as HTMLInputElement).valueAsNumber;
    this.writeItem(key, position, Number.isNaN(number) ? null : number);
  }

  /** A new row is an empty text item, or null for a number item (the server refuses null for a number). */
  protected addItem(view: FieldView): void {
    this.write(view.key, [...this.itemsOf(view.key), view.numeric ? null : '']);
  }

  protected removeItem(key: string, position: number): void {
    this.write(
      key,
      this.itemsOf(key).filter((_, index) => index !== position),
    );
  }

  protected submit(event: Event): void {
    event.preventDefault();
    this.submitted.emit(this.value());
  }

  private writeItem(key: string, position: number, item: unknown): void {
    const items = [...this.itemsOf(key)];
    items[position] = item;
    this.write(key, items);
  }

  /** Sets one key of the value, or removes it when the next value is undefined. */
  private write(key: string, next: unknown): void {
    const current: ToolArguments = { ...this.value() };
    if (next === undefined) {
      delete current[key];
    } else {
      current[key] = next;
    }
    this.value.set(current);
  }
}
