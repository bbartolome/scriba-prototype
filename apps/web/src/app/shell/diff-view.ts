import {
  Component,
  computed,
  effect,
  ElementRef,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import {
  MatButtonToggle,
  MatButtonToggleGroup,
} from '@angular/material/button-toggle';
import {
  Change,
  type DiffConfig,
  diff,
  MergeView,
  unifiedMergeView,
} from '@codemirror/merge';
import { EditorState, type Extension, Text } from '@codemirror/state';
import { EditorView, highlightSpecialChars } from '@codemirror/view';
import { DeviceClassService } from './device-class';
import {
  documentExtensions,
  documentText,
  dominantLineSeparator,
} from './markdown-document';

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

/** What the editable proposed side needs: its loaded text, its path and the emit. */
interface Edit {
  readonly text: string;
  readonly path: string;
  readonly onEdit: (text: string) => void;
}

/** The edit options of a view, before the loaded text is added. */
type EditOptions = Omit<Edit, 'text'>;

/**
 * The extensions of one side, the same in both layouts. Only the proposed side
 * takes `edit`, and only when `editable` is true: it then uses the dominant
 * line separator of its loaded text and emits the whole edited text. The base
 * side and the read-only proposed side are never editable. Every side has an
 * accessible name for its path (`Base text for <path>` or `Proposed text for
 * <path>`), read-only sides included.
 */
function sideExtensions(side: Side, path: string, edit?: Edit): Extension[] {
  if (!edit) {
    return [
      diffTheme(),
      highlightSpecialChars(),
      EditorState.lineSeparator.of('\n'),
      EditorState.readOnly.of(true),
      EditorView.editable.of(false),
      // tabindex lets a keyboard user reach the scrolling text (axe: scrollable-region-focusable).
      EditorView.contentAttributes.of({
        'aria-label':
          (side === 'base' ? 'Base text for ' : 'Proposed text for ') + path,
        tabindex: '0',
      }),
      EditorView.editorAttributes.of({ 'data-side': side }),
    ];
  }
  return [
    diffTheme(),
    highlightSpecialChars(),
    documentExtensions(edit.text),
    EditorView.contentAttributes.of({
      'aria-label': 'Proposed text for ' + edit.path,
    }),
    EditorView.updateListener.of((update) => {
      if (update.docChanged) edit.onEdit(documentText(update.state));
    }),
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

/** The start of the line that holds position `p`. */
function lineStart(text: string, p: number): number {
  return p === 0 ? 0 : text.lastIndexOf('\n', p - 1) + 1;
}

/** The position just after the line break that ends the line holding `p`, or the end of the text. */
function lineEnd(text: string, p: number): number {
  if (p > 0 && text[p - 1] === '\n') return p;
  const next = text.indexOf('\n', p);
  return next < 0 ? text.length : next + 1;
}

/**
 * The diff of the base against the proposed text with its CRLF restored. The
 * base keeps its CRs (it is split on `\n` only), so a line-ending change shows
 * as a change. The positions of the restored text map back to the proposed
 * document, which has no CRs: each `\r\n` of the restored text is one inserted
 * CR.
 */
function crlfOverride(a: string, b: string): readonly Change[] {
  const restored = b.replace(/\n/g, '\r\n');
  const back = (p: number): number => {
    let inserted = 0;
    for (let i = 0; i < p; i++) {
      if (restored[i] === '\r' && restored[i + 1] === '\n') inserted++;
    }
    return p - inserted;
  };
  return diff(a, restored, { scanLimit: 500 }).map((change) => {
    let { fromA, toA, fromB, toB } = change;
    // A change that differs only in CRs widens to whole lines, so that the
    // LF to CRLF change marks its line on both sides.
    if (
      a.slice(fromA, toA).replace(/\r/g, '') ===
      restored.slice(fromB, toB).replace(/\r/g, '')
    ) {
      fromA = lineStart(a, fromA);
      fromB = lineStart(restored, fromB);
      toA = lineEnd(a, toA);
      toB = lineEnd(restored, toB);
    }
    return new Change(fromA, toA, back(fromB), back(toB));
  });
}

/**
 * The diff config of an editable view. Only a CRLF-dominant proposed text needs
 * the override: an LF-dominant one is split on `\n` as the base is, so the
 * default diff is exact for it.
 */
function editDiffConfig(proposed: string): DiffConfig | undefined {
  return dominantLineSeparator(proposed) === '\r\n'
    ? { scanLimit: 500, override: crlfOverride }
    : undefined;
}

function createUnified(
  parent: HTMLElement,
  base: string,
  proposed: string,
  path: string,
  edit: EditOptions | undefined,
): EditorView {
  const side = edit && { ...edit, text: proposed };
  return new EditorView({
    parent,
    state: EditorState.create({
      // The editable proposed document is split by its own line separator.
      doc: side ? proposed : toText(proposed),
      extensions: [
        sideExtensions('proposed', path, side),
        unifiedMergeView({
          original: toText(base),
          mergeControls: false,
          diffConfig: side ? editDiffConfig(proposed) : undefined,
        }),
      ],
    }),
  });
}

function createSplit(
  parent: HTMLElement,
  base: string,
  proposed: string,
  path: string,
  edit: EditOptions | undefined,
): MergeView {
  const side = edit && { ...edit, text: proposed };
  return new MergeView({
    parent,
    a: { doc: toText(base), extensions: sideExtensions('base', path) },
    b: {
      doc: side ? proposed : toText(proposed),
      extensions: sideExtensions('proposed', path, side),
    },
    diffConfig: side ? editDiffConfig(proposed) : undefined,
  });
}

/**
 * A diff of two strings for a path: unified on a phone, side by side on a
 * tablet or desktop, with a toggle that overrides the device class. Read-only
 * by default. With `editable` the proposed side accepts edits and emits the
 * whole edited text through `contentChange`; the base side is never editable.
 * The component shows no accept or reject control.
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
  readonly editable = input<boolean>(false);
  readonly contentChange = output<string>();

  protected readonly defaultConflict = DEFAULT_CONFLICT;
  protected readonly override = signal<Layout | undefined>(undefined);
  // Read-only equal texts show "No changes"; an editable proposed side always opens.
  protected readonly identical = computed(
    () => !this.editable() && this.base() === this.proposed(),
  );
  protected readonly layout = computed<Layout>(
    () => this.override() ?? (this.device() === 'phone' ? 'unified' : 'split'),
  );

  private readonly device = inject(DeviceClassService).deviceClass;
  private readonly body = viewChild<ElementRef<HTMLElement>>('body');
  private readonly onEdit = (text: string): void =>
    this.contentChange.emit(text);

  constructor() {
    // One view is alive at a time. The effect destroys it when an input or the
    // layout changes, and when the component is destroyed.
    effect((onCleanup) => {
      const parent = this.body()?.nativeElement;
      if (!parent) return;
      const layout = this.layout();
      const base = this.base();
      const proposed = this.proposed();
      const editable = this.editable();
      const path = this.path();
      const edit: EditOptions | undefined = editable
        ? { path, onEdit: this.onEdit }
        : undefined;
      const view =
        layout === 'unified'
          ? createUnified(parent, base, proposed, path, edit)
          : createSplit(parent, base, proposed, path, edit);
      onCleanup(() => view.destroy());
    });
  }
}
