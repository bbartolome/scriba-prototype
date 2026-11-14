import { Component, computed, input, ViewEncapsulation } from '@angular/core';
import { MarkdownComponent } from 'ngx-markdown';

/**
 * Read-only Markdown pane. Pass the text in `content`; the pane re-renders
 * whenever the text changes and has no outputs. A test bed that renders it
 * needs no markdown provider.
 */
@Component({
  imports: [MarkdownComponent],
  selector: 'app-markdown-preview',
  template: '<markdown [data]="body()" />',
  styles: [
    `
      app-markdown-preview {
        display: block;
        overflow-wrap: anywhere;
      }
      app-markdown-preview markdown {
        display: block;
      }
      app-markdown-preview img {
        max-width: 100%;
        height: auto;
      }
      app-markdown-preview pre,
      app-markdown-preview table {
        display: block;
        overflow-x: auto;
      }
    `,
  ],
  encapsulation: ViewEncapsulation.None,
})
export class MarkdownPreview {
  readonly content = input<string>('');
  protected readonly body = computed(() => this.content());
}
