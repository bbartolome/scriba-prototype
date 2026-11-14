import {
  Component,
  computed,
  DestroyRef,
  effect,
  ElementRef,
  inject,
  input,
  output,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import type { FileReference } from '@bbartolome/scriba-contracts/project-store';
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands';
import { markdown } from '@codemirror/lang-markdown';
import {
  defaultHighlightStyle,
  syntaxHighlighting,
} from '@codemirror/language';
import { Compartment, EditorState, type Extension } from '@codemirror/state';
import { EditorView, highlightSpecialChars, keymap } from '@codemirror/view';
import type { Subscription } from 'rxjs';
import { ApiError } from './api-error';
import { documentExtensions, documentText } from './markdown-document';
import {
  projectFilePath,
  projectFileWritePath,
  readCopy,
  writeResultCopy,
} from './project-store-copies';
import { API_CLIENT } from './tokens';

/** The save state the editor reports: saved, saving, unsaved, failed or conflict. */
export type SaveState = 'saved' | 'saving' | 'unsaved' | 'failed' | 'conflict';

/** The project file the editor loads and saves. */
export interface EditorReference {
  projectId: string;
  path: FileReference;
}

// The write conflict code of the project store (`PROJECT_ERROR_CODES.WRITE_CONFLICT`).
const WRITE_CONFLICT = 'PROJECT_WRITE_CONFLICT';

const STATUS_TEXT: Record<SaveState, string> = {
  saved: 'Saved',
  saving: 'Saving...',
  unsaved: 'Unsaved changes',
  failed: 'Not saved',
  conflict: 'Not saved: the file changed elsewhere',
};

function readOnlyExtensions(readOnly: boolean): Extension[] {
  return [EditorState.readOnly.of(readOnly), EditorView.editable.of(!readOnly)];
}

function isWriteConflict(error: unknown): boolean {
  return error instanceof ApiError && error.code === WRITE_CONFLICT;
}

/**
 * A lossless Markdown editor over one project file. It loads the file through the file API and
 * saves the text it holds, with the separators and the BOM as the file had them. Its one save is
 * the Save button; the debounce, the shortcut and the leave guard come with SHL-14.
 */
@Component({
  selector: 'app-markdown-editor',
  template: `
    <p role="status">{{ statusText() }}</p>
    @if (error(); as message) {
      <p role="alert">{{ message }}</p>
    }
    <div #host></div>
    <button
      type="button"
      [disabled]="readOnly() || saveState() === 'saving'"
      (click)="save()"
    >
      Save
    </button>
  `,
})
export class MarkdownEditor {
  readonly reference = input.required<EditorReference>();
  readonly readOnly = input(false);
  readonly contentChange = output<string>();
  readonly dirtyChange = output<boolean>();
  readonly saveStateChange = output<SaveState>();
  readonly errorChange = output<string | null>();

  private readonly api = inject(API_CLIENT);
  private readonly host = viewChild.required<ElementRef<HTMLElement>>('host');
  private readonly editable = new Compartment();
  private view: EditorView | undefined;
  private loadSub: Subscription | undefined;
  private saveSub: Subscription | undefined;
  // The hash of the last load or the last successful save, and the text it covers.
  private baseHash = '';
  private savedText = '';

  protected readonly saveState = signal<SaveState>('saved');
  protected readonly error = signal<string | null>(null);
  protected readonly statusText = computed(() => STATUS_TEXT[this.saveState()]);

  constructor() {
    effect(() => {
      const reference = this.reference();
      untracked(() => this.load(reference));
    });
    effect(() => {
      const readOnly = this.readOnly();
      untracked(() => this.applyReadOnly(readOnly));
    });
    inject(DestroyRef).onDestroy(() => {
      this.loadSub?.unsubscribe();
      this.saveSub?.unsubscribe();
      this.destroyView();
    });
  }

  /** Writes the text the document holds, with the base hash of the last load or save. */
  protected save(): void {
    const view = this.view;
    if (
      view === undefined ||
      this.readOnly() ||
      this.saveState() === 'saving'
    ) {
      return;
    }
    const { projectId, path } = this.reference();
    const content = documentText(view.state);
    this.setError(null);
    this.setSaveState('saving');
    this.saveSub = this.api
      .post(
        projectFileWritePath(projectId),
        { path, content, baseHash: this.baseHash },
        writeResultCopy,
      )
      .subscribe({
        next: (result) => {
          this.baseHash = result.hash;
          this.savedText = content;
          // The text may have changed while the write was in flight, so compare with what was saved.
          const dirty = documentText(view.state) !== content;
          this.dirtyChange.emit(dirty);
          this.setSaveState(dirty ? 'unsaved' : 'saved');
        },
        error: (error: unknown) => this.reportError(error),
      });
  }

  private load(reference: EditorReference): void {
    this.loadSub?.unsubscribe();
    this.saveSub?.unsubscribe();
    this.destroyView();
    this.setError(null);
    this.loadSub = this.api
      .get(projectFilePath(reference.projectId), readCopy, {
        path: reference.path,
      })
      .subscribe({
        next: (file) => {
          this.baseHash = file.hash;
          this.savedText = file.content;
          this.createView(reference, file.content);
          this.contentChange.emit(file.content);
          this.dirtyChange.emit(false);
          this.setSaveState('saved');
        },
        error: (error: unknown) => this.reportError(error),
      });
  }

  private createView(reference: EditorReference, raw: string): void {
    this.view = new EditorView({
      parent: this.host().nativeElement,
      state: EditorState.create({
        doc: raw,
        extensions: [
          documentExtensions(raw),
          this.editorExtensions(reference.path),
          this.editable.of(readOnlyExtensions(this.readOnly())),
        ],
      }),
    });
  }

  private applyReadOnly(readOnly: boolean): void {
    this.view?.dispatch({
      effects: this.editable.reconfigure(readOnlyExtensions(readOnly)),
    });
  }

  private editorExtensions(path: string): Extension[] {
    return [
      history(),
      keymap.of([...defaultKeymap, ...historyKeymap]),
      markdown(),
      syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
      highlightSpecialChars(),
      EditorView.lineWrapping,
      EditorView.contentAttributes.of({
        'aria-label': `Markdown source for ${path}`,
      }),
      EditorView.theme({
        '&': {
          backgroundColor: 'var(--mat-sys-surface)',
          color: 'var(--mat-sys-on-surface)',
        },
      }),
      EditorView.updateListener.of((update) => {
        if (update.docChanged) {
          this.onDocumentChange(update.state);
        }
      }),
    ];
  }

  private onDocumentChange(state: EditorState): void {
    const text = documentText(state);
    const dirty = text !== this.savedText;
    this.contentChange.emit(text);
    this.dirtyChange.emit(dirty);
    // A save in flight keeps its state; its result sets the state from the text it saved.
    if (this.saveState() !== 'saving') {
      this.setSaveState(dirty ? 'unsaved' : 'saved');
    }
  }

  private reportError(error: unknown): void {
    this.setError(
      error instanceof Error ? error.message : 'The request failed.',
    );
    this.setSaveState(isWriteConflict(error) ? 'conflict' : 'failed');
  }

  private setSaveState(state: SaveState): void {
    this.saveState.set(state);
    this.saveStateChange.emit(state);
  }

  private setError(message: string | null): void {
    this.error.set(message);
    this.errorChange.emit(message);
  }

  private destroyView(): void {
    this.view?.destroy();
    this.view = undefined;
  }
}
