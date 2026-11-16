import {
  Component,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { DeviceClassService } from './device-class';
import {
  MarkdownEditor,
  type EditorReference,
  type SaveState,
} from './markdown-editor';
import { MarkdownPreview } from './markdown-preview';

/**
 * The editor with its live preview. Tablet and desktop show the source and the
 * preview side by side. A phone shows one of them, chosen by an Edit or
 * Preview toggle. Both panes stay rendered; the toggle only hides one, so the
 * editor keeps its unsaved text when the layout changes.
 */
@Component({
  selector: 'app-editor-layout',
  imports: [MarkdownEditor, MarkdownPreview],
  template: `
    <div class="layout" [class.split]="!phone()">
      <div
        class="toggle"
        role="group"
        aria-label="Edit or preview"
        [hidden]="!phone()"
      >
        <button
          type="button"
          [attr.aria-pressed]="mode() === 'edit'"
          (click)="mode.set('edit')"
        >
          Edit
        </button>
        <button
          type="button"
          [attr.aria-pressed]="mode() === 'preview'"
          (click)="mode.set('preview')"
        >
          Preview
        </button>
      </div>
      <section aria-label="Source" [hidden]="phone() && mode() !== 'edit'">
        <app-markdown-editor
          [reference]="reference()"
          [readOnly]="readOnly()"
          (contentChange)="onContent($event)"
          (dirtyChange)="dirtyChange.emit($event)"
          (saveStateChange)="saveStateChange.emit($event)"
          (errorChange)="errorChange.emit($event)"
        />
      </section>
      <section
        class="preview"
        aria-label="Preview"
        [hidden]="phone() && mode() !== 'preview'"
      >
        <app-markdown-preview [content]="text()" />
      </section>
    </div>
  `,
  styles: `
    :host {
      display: block;
    }

    [hidden] {
      display: none !important;
    }

    .layout.split {
      display: grid;
      grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
      gap: 16px;
    }

    .toggle {
      display: flex;
      gap: 8px;
    }

    .preview {
      overflow: auto;
    }
  `,
})
export class EditorLayout {
  readonly reference = input.required<EditorReference>();
  readonly readOnly = input(false);
  readonly contentChange = output<string>();
  readonly dirtyChange = output<boolean>();
  readonly saveStateChange = output<SaveState>();
  readonly errorChange = output<string | null>();

  private readonly devices = inject(DeviceClassService);
  protected readonly phone = computed(
    () => this.devices.deviceClass() === 'phone',
  );
  protected readonly mode = signal<'edit' | 'preview'>('edit');
  protected readonly text = signal('');

  protected onContent(text: string): void {
    this.text.set(text);
    this.contentChange.emit(text);
  }
}
