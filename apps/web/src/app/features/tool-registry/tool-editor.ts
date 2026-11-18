import {
  AfterViewInit,
  Component,
  DestroyRef,
  ElementRef,
  effect,
  inject,
  input,
  output,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import type {
  LintDiagnostic,
  ToolViews,
} from '@bbartolome/scriba-contracts/tool-registry';
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands';
import { yaml } from '@codemirror/lang-yaml';
import {
  defaultHighlightStyle,
  syntaxHighlighting,
} from '@codemirror/language';
import {
  type Diagnostic,
  linter,
  lintGutter,
  setDiagnostics,
} from '@codemirror/lint';
import {
  Compartment,
  EditorState,
  type Extension,
  type Text,
} from '@codemirror/state';
import { EditorView, highlightSpecialChars, keymap } from '@codemirror/view';
import { firstValueFrom, of } from 'rxjs';
import { API_CLIENT, ApiError } from '../../shell';
import { UnsavedTextRegistry } from '../../shell/unsaved-text';
import {
  LINT_PATH,
  lintDetailsCopy,
  lintResponseCopy,
  toolSavePath,
  toolSourceCopy,
  type ToolSourceView,
} from './tool-copy';

// The error code of a save the lint refused (`TOOL_SPEC_LINT_FAILED`, 422).
const SPEC_LINT_FAILED = 'TOOL_SPEC_LINT_FAILED';

// The idle time after the last edit before the source is linted.
const LINT_DEBOUNCE_MS = 500;

const SAVE_FAILED_TEXT = 'The tool could not be saved.';

function readOnlyExtensions(readOnly: boolean): Extension[] {
  return [EditorState.readOnly.of(readOnly), EditorView.editable.of(!readOnly)];
}

function countOf(list: LintDiagnostic[], severity: LintDiagnostic['severity']) {
  return list.filter((item) => item.severity === severity).length;
}

/** One lint diagnostic as a CodeMirror diagnostic: its whole line is marked (C11). */
function toCmDiagnostic(doc: Text, item: LintDiagnostic): Diagnostic {
  const number = Math.min(Math.max(item.line, 1), doc.lines);
  const line = doc.line(number);
  const to = line.length === 0 ? Math.min(line.from + 1, doc.length) : line.to;
  return {
    from: line.from,
    to,
    severity: item.severity,
    message: item.message,
    source: item.rule,
  };
}

/**
 * A YAML editor over one tool's source (TRG-14). It lints the text while the author types, shows the
 * diagnostics on their lines and in a list, and saves the text to the save route of `saveName`.
 * The browser parses no YAML: the diagnostics and the views come from the API.
 */
@Component({
  selector: 'app-tool-editor',
  template: `
    <p role="status">{{ message() }}</p>
    <div #host></div>
    @if (saveName() !== undefined) {
      <button type="button" data-save [disabled]="readOnly()" (click)="save()">
        Save
      </button>
    }
    <ul data-diagnostics>
      @for (item of shown(); track $index) {
        <li>line {{ item.line }}: {{ item.message }}</li>
      }
    </ul>
  `,
  host: { 'data-editor': '' },
})
export class ToolEditor implements AfterViewInit {
  /** The source to show, read once when the editor is created: the parent keys the editor by tool. */
  readonly source = input.required<string>();
  /** The diagnostics of the loaded source, shown until the author edits the text. */
  readonly diagnostics = input<LintDiagnostic[]>([]);
  readonly readOnly = input(false);
  /** The name the text is saved under, and the name the lint checks the file against. Undefined means no Save. */
  readonly saveName = input<string | undefined>(undefined);
  /** A draft is a new tool that is not saved yet: it is unsaved from the start and is linted at once. */
  readonly draft = input(false);
  /** The file name shown in the editor's accessible name. */
  readonly label = input.required<string>();

  readonly saved = output<ToolSourceView>();
  // The text that was linted, saved or loaded, with its views (TRG-15 D3, D3a). `source` is the text the views are of.
  readonly linted = output<{
    lint: LintDiagnostic[];
    views: ToolViews | null;
    source: string;
  }>();

  private readonly api = inject(API_CLIENT);
  private readonly host = viewChild.required<ElementRef<HTMLElement>>('host');
  private readonly editable = new Compartment();
  private view: EditorView | undefined;
  // The source the editor was loaded with, or the text of the last successful save.
  private loadedText = '';
  // The diagnostics of the last lint answer, of the last save answer, or of the input.
  private lastLint: LintDiagnostic[] = [];

  protected readonly message = signal('');
  protected readonly shown = signal<LintDiagnostic[]>([]);

  constructor() {
    const unregister = inject(UnsavedTextRegistry).register({
      hasUnsavedText: () => this.hasUnsavedText(),
      flush: () => of(false),
    });
    effect(() => {
      const readOnly = this.readOnly();
      untracked(() => this.applyReadOnly(readOnly));
    });
    effect(() => {
      const diagnostics = this.diagnostics();
      untracked(() => this.applyLint(diagnostics));
    });
    inject(DestroyRef).onDestroy(() => {
      unregister();
      this.view?.destroy();
      this.view = undefined;
    });
  }

  ngAfterViewInit(): void {
    this.loadedText = this.source();
    this.view = new EditorView({
      parent: this.host().nativeElement,
      state: EditorState.create({
        doc: this.loadedText,
        extensions: [
          history(),
          keymap.of([...defaultKeymap, ...historyKeymap]),
          yaml(),
          syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
          linter(this.lintSource, { delay: LINT_DEBOUNCE_MS }),
          lintGutter(),
          highlightSpecialChars(),
          EditorView.lineWrapping,
          EditorView.contentAttributes.of({
            'aria-label': `Source of ${this.label()}`,
          }),
          EditorView.theme({
            '&': {
              backgroundColor: 'var(--mat-sys-surface)',
              color: 'var(--mat-sys-on-surface)',
            },
          }),
          this.editable.of(readOnlyExtensions(this.readOnly())),
        ],
      }),
    });
    this.view.dispatch(
      setDiagnostics(this.view.state, this.marks(this.lastLint)),
    );
  }

  /** The lint of the editor's text. Unchanged loaded text keeps its diagnostics; any other text is linted by the API. */
  private readonly lintSource = async (
    view: EditorView,
  ): Promise<readonly Diagnostic[]> => {
    const text = view.state.doc.toString();
    if (!this.draft() && text === this.loadedText) {
      // The loaded text keeps its diagnostics, and its views come back with them (TRG-15 D3a).
      this.linted.emit({ lint: this.lastLint, views: null, source: text });
      return this.marks(this.lastLint, view.state.doc);
    }
    try {
      const answer = await firstValueFrom(
        this.api.post(
          LINT_PATH,
          { source: text, name: this.saveName() },
          lintResponseCopy,
        ),
      );
      this.lastLint = answer.lint;
      this.shown.set(answer.lint);
      this.linted.emit({ ...answer, source: text });
      return this.marks(answer.lint, view.state.doc);
    } catch {
      // A failed lint keeps the last diagnostics.
      return this.marks(this.lastLint, view.state.doc);
    }
  };

  protected save(): void {
    const name = this.saveName();
    if (name === undefined || this.readOnly()) {
      return;
    }
    const text = this.currentText();
    this.api
      .post(toolSavePath(name), { source: text }, toolSourceCopy)
      .subscribe({
        next: (result) => {
          this.loadedText = text;
          this.applyLint(result.lint);
          this.linted.emit({
            lint: result.lint,
            views: result.views,
            source: text,
          });
          this.saved.emit(result);
          const warnings = countOf(result.lint, 'warning');
          this.message.set(
            warnings === 0 ? 'Saved.' : `Saved. Warnings: ${warnings}.`,
          );
        },
        error: (error: unknown) => this.saveFailed(error, text),
      });
  }

  private saveFailed(error: unknown, text: string): void {
    if (error instanceof ApiError && error.code === SPEC_LINT_FAILED) {
      const lint = lintDetailsCopy(error.details) ?? [];
      this.applyLint(lint);
      this.linted.emit({ lint, views: null, source: text });
      this.message.set(
        `The tool was not saved. Lint errors: ${countOf(lint, 'error')}.`,
      );
      return;
    }
    this.message.set(SAVE_FAILED_TEXT);
  }

  private hasUnsavedText(): boolean {
    if (this.saveName() === undefined) {
      return false;
    }
    return this.draft() || this.currentText() !== this.loadedText;
  }

  private currentText(): string {
    return this.view === undefined
      ? this.loadedText
      : this.view.state.doc.toString();
  }

  /** Stores the diagnostics as the last ones and, when the editor exists, marks them on their lines. */
  private applyLint(list: LintDiagnostic[]): void {
    this.lastLint = list;
    this.shown.set(list);
    if (this.view !== undefined) {
      this.view.dispatch(setDiagnostics(this.view.state, this.marks(list)));
    }
  }

  private marks(list: LintDiagnostic[], doc?: Text): Diagnostic[] {
    const text = doc ?? this.view?.state.doc;
    if (text === undefined) {
      return [];
    }
    return list.map((item) => toCmDiagnostic(text, item));
  }

  private applyReadOnly(readOnly: boolean): void {
    this.view?.dispatch({
      effects: this.editable.reconfigure(readOnlyExtensions(readOnly)),
    });
  }
}
