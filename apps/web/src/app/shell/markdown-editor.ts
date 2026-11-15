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
import {
  defer,
  map,
  Observable,
  of,
  Subject,
  take,
  type Subscription,
} from 'rxjs';
import { ApiError } from './api-error';
import { documentExtensions, documentText } from './markdown-document';
import {
  projectFilePath,
  projectFileWritePath,
  readCopy,
  writeResultCopy,
} from './project-store-copies';
import { API_CLIENT } from './tokens';
import { confirmUnsavedLeave, UnsavedTextRegistry } from './unsaved-text';

/** The save state the editor reports: saved, saving, unsaved, failed or conflict. */
export type SaveState = 'saved' | 'saving' | 'unsaved' | 'failed' | 'conflict';

/** How the editor saves. The author's text goes straight to the file: the only mode. */
export type SaveMode = 'direct';

/** The project file the editor loads and saves. */
export interface EditorReference {
  projectId: string;
  path: FileReference;
}

// The write conflict code of the project store (`PROJECT_ERROR_CODES.WRITE_CONFLICT`).
const WRITE_CONFLICT = 'PROJECT_WRITE_CONFLICT';

// The idle time after the last edit before the text is saved.
const SAVE_DEBOUNCE_MS = 1500;

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

/** Ctrl-S or Cmd-S, with no Shift and no Alt, in any letter case. */
function isSaveShortcut(event: KeyboardEvent): boolean {
  return (
    (event.ctrlKey || event.metaKey) &&
    !event.shiftKey &&
    !event.altKey &&
    event.key.toLowerCase() === 's'
  );
}

/**
 * A lossless Markdown editor over one project file. It loads the file through the file API and
 * saves the text it holds, with the separators and the BOM as the file had them. It saves after
 * a pause, on Ctrl/Cmd-S and the Save button, on blur, and before the page is left. One write is
 * in flight at a time; the edits made meanwhile are saved by one follow-up write.
 */
@Component({
  selector: 'app-markdown-editor',
  template: `
    <p role="status">{{ statusText() }}</p>
    @if (error(); as message) {
      <p role="alert">{{ message }}</p>
    }
    <div #host></div>
    <button type="button" [disabled]="readOnly()" (click)="requestSave(true)">
      Save
    </button>
  `,
  host: {
    '(keydown)': 'onKeydown($event)',
    '(focusout)': 'onFocusOut($event)',
    '(window:beforeunload)': 'onBeforeUnload($event)',
  },
})
export class MarkdownEditor {
  readonly reference = input.required<EditorReference>();
  readonly readOnly = input(false);
  readonly saveMode = input<SaveMode>('direct');
  readonly contentChange = output<string>();
  readonly dirtyChange = output<boolean>();
  readonly saveStateChange = output<SaveState>();
  readonly errorChange = output<string | null>();

  private readonly api = inject(API_CLIENT);
  private readonly element = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly host = viewChild.required<ElementRef<HTMLElement>>('host');
  private readonly editable = new Compartment();
  private view: EditorView | undefined;
  private loadSub: Subscription | undefined;
  // The debounce timer. Each edit restarts it.
  private timer: ReturnType<typeof setTimeout> | undefined;
  // The trigger that waits for the write in flight. An explicit one outranks an automatic one.
  private pending: 'explicit' | 'automatic' | undefined;
  // The file the open text was loaded from. Writes go there, never to the current input.
  private loaded: EditorReference | undefined;
  // Emits when no write is in flight and none is pending. A flush waits for it.
  private readonly settled = new Subject<void>();
  private destroyed = false;
  // The hash of the last load or the last successful save, and the text it covers.
  private baseHash = '';
  private savedText = '';

  protected readonly saveState = signal<SaveState>('saved');
  protected readonly error = signal<string | null>(null);
  protected readonly statusText = computed(() => STATUS_TEXT[this.saveState()]);

  constructor() {
    const unregister = inject(UnsavedTextRegistry).register({
      hasUnsavedText: () => this.hasUnsavedText(),
      flush: () => this.flush(),
    });
    effect(() => {
      const reference = this.reference();
      untracked(() => this.load(reference));
    });
    effect(() => {
      const readOnly = this.readOnly();
      untracked(() => this.applyReadOnly(readOnly));
    });
    inject(DestroyRef).onDestroy(() => {
      clearTimeout(this.timer);
      unregister();
      // A write in flight is not cancelled: its result changes no output once the editor is gone.
      this.destroyed = true;
      this.loadSub?.unsubscribe();
      this.destroyView();
    });
  }

  /**
   * One save request. `explicit` is the Save button and Ctrl/Cmd-S; any other request is automatic
   * (the debounce, blur, a leave or a reference change), and it writes only changed text.
   */
  protected requestSave(explicit: boolean): void {
    clearTimeout(this.timer);
    const view = this.view;
    if (view === undefined || this.readOnly()) {
      return;
    }
    if (
      !explicit &&
      (documentText(view.state) === this.savedText ||
        this.saveState() === 'conflict')
    ) {
      return;
    }
    if (this.saveState() === 'saving') {
      // One write is in flight: the request waits for it as one follow-up.
      this.pending =
        explicit || this.pending === 'explicit' ? 'explicit' : 'automatic';
      return;
    }
    this.send();
  }

  protected onKeydown(event: KeyboardEvent): void {
    if (isSaveShortcut(event)) {
      event.preventDefault();
      this.requestSave(true);
    }
  }

  protected onFocusOut(event: FocusEvent): void {
    const next = event.relatedTarget;
    if (next instanceof Node && this.element.nativeElement.contains(next)) {
      return;
    }
    this.requestSave(false);
  }

  protected onBeforeUnload(event: Event): void {
    if (this.hasUnsavedText()) {
      event.preventDefault();
    }
  }

  /** Writes the open text to the file it was loaded from, with the base hash of the last load or save. */
  private send(): void {
    const view = this.view;
    const reference = this.loaded;
    if (view === undefined || reference === undefined) {
      return;
    }
    const content = documentText(view.state);
    this.setError(null);
    this.setSaveState('saving');
    this.api
      .post(
        projectFileWritePath(reference.projectId),
        { path: reference.path, content, baseHash: this.baseHash },
        writeResultCopy,
      )
      .subscribe({
        next: (result) => this.written(result.hash, content),
        error: (error: unknown) => this.writeFailed(error),
      });
  }

  private written(hash: string, content: string): void {
    if (this.destroyed) {
      return;
    }
    this.baseHash = hash;
    this.savedText = content;
    // The text may have changed while the write was in flight, so compare with what was saved.
    const current =
      this.view === undefined ? content : documentText(this.view.state);
    const dirty = current !== content;
    this.dirtyChange.emit(dirty);
    const mark = this.pending;
    this.pending = undefined;
    if (mark === 'explicit' || (mark === 'automatic' && dirty)) {
      this.send();
      return;
    }
    this.setSaveState(dirty ? 'unsaved' : 'saved');
    this.settled.next();
  }

  private writeFailed(error: unknown): void {
    if (this.destroyed) {
      return;
    }
    this.reportError(error);
    this.settled.next();
  }

  /**
   * Saves the unsaved text now. Emits once: true when the editor ends saved, false when it does
   * not (a failed write, a conflict, or a read-only editor with unsaved text).
   */
  private flush(): Observable<boolean> {
    return defer(() => {
      if (!this.hasUnsavedText()) {
        return of(true);
      }
      if (this.readOnly() || this.saveState() === 'conflict') {
        return of(false);
      }
      return new Observable<boolean>((subscriber) => {
        // Subscribe before the write starts: a fake client answers inside the call.
        const done = this.settled
          .pipe(
            take(1),
            map(() => this.saveState() === 'saved'),
          )
          .subscribe(subscriber);
        this.requestSave(false);
        return done;
      });
    });
  }

  private hasUnsavedText(): boolean {
    const view = this.view;
    if (view === undefined) {
      return false;
    }
    return (
      documentText(view.state) !== this.savedText ||
      this.saveState() === 'saving' ||
      this.pending !== undefined
    );
  }

  private armDebounce(): void {
    clearTimeout(this.timer);
    this.timer = setTimeout(() => this.requestSave(false), SAVE_DEBOUNCE_MS);
  }

  private load(reference: EditorReference): void {
    this.loadSub?.unsubscribe();
    if (this.hasUnsavedText()) {
      // The open text is saved first, and the new file is read only after that save.
      this.loadSub = this.flush().subscribe((saved) => {
        if (saved || confirmUnsavedLeave()) {
          this.loadNow(reference);
        }
      });
      return;
    }
    this.loadNow(reference);
  }

  private loadNow(reference: EditorReference): void {
    this.destroyView();
    this.setError(null);
    this.loadSub = this.api
      .get(projectFilePath(reference.projectId), readCopy, {
        path: reference.path,
      })
      .subscribe({
        next: (file) => {
          this.loaded = reference;
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

  private onDocumentChange(docState: EditorState): void {
    const text = documentText(docState);
    const dirty = text !== this.savedText;
    this.contentChange.emit(text);
    this.dirtyChange.emit(dirty);
    // A write in flight, a failure and a conflict keep their state; an edit moves the rest.
    const keeps =
      this.saveState() === 'saving' ||
      this.saveState() === 'failed' ||
      this.saveState() === 'conflict';
    if (!keeps) {
      this.setSaveState(dirty ? 'unsaved' : 'saved');
    }
    // A conflict is not retried by an edit, so the debounce is not armed there.
    if (!this.readOnly() && this.saveState() !== 'conflict') {
      this.armDebounce();
    }
  }

  private reportError(error: unknown): void {
    this.pending = undefined;
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
