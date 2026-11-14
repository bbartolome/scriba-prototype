import { Component, computed, input, ViewEncapsulation } from '@angular/core';
import {
  MARKED_OPTIONS,
  MarkdownComponent,
  MarkdownService,
} from 'ngx-markdown';

const BOM = '\u{FEFF}';
const OPENING = /^---[ \t]*$/;
const CLOSING = /^(?:---|\.\.\.)[ \t]*$/;
const BLANK = /^[ \t]*$/;
// A YAML comment or a mapping key; the guard that stands in for a YAML parser.
const YAML_SHAPE = /^(?:#|[^\s#:][^:]*:(?:[ \t]|$))/;
const LEADING_BLANK_LINES = /^(?:[ \t]*(?:\r\n|\n|\r))+/;

function bare(line: string): string {
  return line.replace(/(?:\r\n|\n|\r)$/, '');
}

// Hides a leading front-matter block for display only (decision 5). The rule
// follows Pandoc's block shape, with a guard against prose and scene breaks.
function stripFrontMatter(text: string): string {
  const source = text.startsWith(BOM) ? text.slice(1) : text;
  const lines = source.match(/[^\r\n]*(?:\r\n|\n|\r)|[^\r\n]+$/g) ?? [];
  const [opening, second] = lines;
  if (opening === undefined || second === undefined) return source;
  if (!OPENING.test(bare(opening))) return source;
  if (BLANK.test(bare(second))) return source;
  for (let i = 1; i < lines.length; i++) {
    if (!CLOSING.test(bare(lines[i]))) continue;
    const between = lines
      .slice(1, i)
      .map(bare)
      .find((line) => !BLANK.test(line));
    if (between !== undefined && !YAML_SHAPE.test(between)) return source;
    return lines
      .slice(i + 1)
      .join('')
      .replace(LEADING_BLANK_LINES, '');
  }
  return source;
}

// Raw HTML from a file or from agent output is shown as text, never as elements (decision 15).
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Read-only Markdown pane. Pass the text in `content`; the pane re-renders
 * whenever the text changes and has no outputs. A test bed that renders it
 * needs no markdown provider: the component provides its own MarkdownService.
 */
@Component({
  imports: [MarkdownComponent],
  providers: [
    MarkdownService,
    {
      provide: MARKED_OPTIONS,
      useValue: {
        renderer: { html: ({ text }: { text: string }) => escapeHtml(text) },
      },
    },
  ],
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
  protected readonly body = computed(() => stripFrontMatter(this.content()));
}
