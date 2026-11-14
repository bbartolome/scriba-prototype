import {
  Component,
  computed,
  effect,
  ElementRef,
  inject,
  input,
  signal,
  viewChild,
} from '@angular/core';
import {
  MatButtonToggle,
  MatButtonToggleGroup,
} from '@angular/material/button-toggle';
import { MergeView, unifiedMergeView } from '@codemirror/merge';
import { EditorState, type Extension, Text } from '@codemirror/state';
import { EditorView, highlightSpecialChars } from '@codemirror/view';
import { DeviceClassService } from './device-class';

type Layout = 'unified' | 'split';
type Side = 'base' | 'proposed';

const DEFAULT_CONFLICT = 'This change conflicts with the current file.';

let theme: Extension | undefined;

/**
 * The look of both sides. The colours follow the page's `color-scheme` through
 * `light-dark()` and Material's system variables. It is built on first use,
 * because `EditorView.theme` is a CodeMirror call and none runs at module level.
 */
function diffTheme(): Extension {
  theme ??= EditorView.theme({
    '&': {
      color: 'var(--mat-sys-on-surface)',
      backgroundColor: 'transparent',
      fontSize: '0.875rem',
    },
    '& .cm-content': { fontFamily: 'ui-monospace, SFMono-Regular, monospace' },
    '& .cm-gutters': {
      backgroundColor: 'transparent',
      border: 'none',
      color: 'var(--mat-sys-on-surface-variant)',
    },
    '&.cm-merge-a .cm-changedLine, & .cm-deletedChunk': {
      backgroundColor:
        'light-dark(rgb(180 60 40 / 10%), rgb(255 120 100 / 12%))',
    },
    '&.cm-merge-b .cm-changedLine': {
      backgroundColor:
        'light-dark(rgb(30 130 60 / 10%), rgb(120 230 150 / 12%))',
    },
    // Inserted text is underlined and deleted text is struck through, so the
    // two are told apart without colour.
    '&.cm-merge-b .cm-changedText': { textDecoration: 'underline' },
    '&.cm-merge-a .cm-changedText, & .cm-deletedChunk .cm-deletedText': {
      textDecoration: 'line-through',
    },
  });
  return theme;
}

/**
 * The extensions of one side, the same in both layouts. `role` names the side;
 * SHL-16 adds an editable input here. The text is never edited.
 */
function sideExtensions(side: Side): Extension[] {
  return [
    diffTheme(),
    highlightSpecialChars(),
    EditorState.lineSeparator.of('\n'),
    EditorState.readOnly.of(true),
    EditorView.editable.of(false),
    EditorView.editorAttributes.of({ 'data-side': side }),
  ];
}

/**
 * A document built by splitting on `\n` only. A `Text` is kept as it is, so a
 * `\r` or a byte order mark stays a character of its line, and an LF to CRLF
 * change marks every line.
 */
function toText(value: string): Text {
  return Text.of(value.split('\n'));
}

function createUnified(
  parent: HTMLElement,
  base: string,
  proposed: string,
): EditorView {
  return new EditorView({
    parent,
    state: EditorState.create({
      doc: toText(proposed),
      extensions: [
        sideExtensions('proposed'),
        unifiedMergeView({ original: toText(base), mergeControls: false }),
      ],
    }),
  });
}

function createSplit(
  parent: HTMLElement,
  base: string,
  proposed: string,
): MergeView {
  return new MergeView({
    parent,
    a: { doc: toText(base), extensions: sideExtensions('base') },
    b: { doc: toText(proposed), extensions: sideExtensions('proposed') },
  });
}

/**
 * A read-only diff of two strings for a path: unified on a phone, side by side
 * on a tablet or desktop, with a toggle that overrides the device class. The
 * component never changes a document and shows no accept or reject control.
 */
@Component({
  selector: 'app-diff-view',
  imports: [MatButtonToggleGroup, MatButtonToggle],
  template: `
    <section class="diff-view" [attr.aria-label]="'Changes to ' + path()">
      <header class="diff-header">
        <span class="diff-path">{{ path() }}</span>
        @if (!identical()) {
          <mat-button-toggle-group
            aria-label="Diff layout"
            [value]="layout()"
            (change)="override.set($event.value)"
          >
            <mat-button-toggle value="unified">Unified</mat-button-toggle>
            <mat-button-toggle value="split">Side by side</mat-button-toggle>
          </mat-button-toggle-group>
        }
      </header>
      @if (conflict()) {
        <p class="diff-conflict" role="status">
          {{ conflictMessage() || defaultConflict }}
        </p>
      }
      @if (identical()) {
        <p class="diff-none">No changes</p>
      } @else {
        <div class="diff-body" #body></div>
      }
    </section>
  `,
  styles: `
    :host {
      display: block;
    }
    .diff-view {
      display: grid;
      gap: 8px;
    }
    .diff-header {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
    }
    .diff-path {
      overflow-wrap: anywhere;
      font-family: ui-monospace, SFMono-Regular, monospace;
    }
    .diff-conflict {
      margin: 0;
      color: var(--mat-sys-error);
    }
    .diff-none {
      margin: 0;
      color: var(--mat-sys-on-surface-variant);
    }
  `,
})
export class DiffView {
  readonly path = input.required<string>();
  readonly base = input.required<string>();
  readonly proposed = input.required<string>();
  readonly conflict = input<boolean>(false);
  readonly conflictMessage = input<string>();

  protected readonly defaultConflict = DEFAULT_CONFLICT;
  protected readonly override = signal<Layout | undefined>(undefined);
  protected readonly identical = computed(
    () => this.base() === this.proposed(),
  );
  protected readonly layout = computed<Layout>(
    () => this.override() ?? (this.device() === 'phone' ? 'unified' : 'split'),
  );

  private readonly device = inject(DeviceClassService).deviceClass;
  private readonly body = viewChild<ElementRef<HTMLElement>>('body');

  constructor() {
    // One view is alive at a time. The effect destroys it when an input or the
    // layout changes, and when the component is destroyed.
    effect((onCleanup) => {
      const parent = this.body()?.nativeElement;
      if (!parent) return;
      const layout = this.layout();
      const base = this.base();
      const proposed = this.proposed();
      const view =
        layout === 'unified'
          ? createUnified(parent, base, proposed)
          : createSplit(parent, base, proposed);
      onCleanup(() => view.destroy());
    });
  }
}
