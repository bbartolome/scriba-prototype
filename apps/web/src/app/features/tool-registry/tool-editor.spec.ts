import { TestBed, type ComponentFixture } from '@angular/core/testing';
import type { LintDiagnostic } from '@bbartolome/scriba-contracts/tool-registry';
import { EditorView } from '@codemirror/view';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '../../shell';
import {
  createShellTestDoubles,
  type ShellTestDoubles,
} from '../../shell/testing/test-doubles';
import { UnsavedTextRegistry } from '../../shell/unsaved-text';
import { ToolEditor } from './tool-editor';

const LINT_PATH = '/api/tool-registry/lint';
const SAVE_PATH = '/api/tool-registry/tools/cold_open/save';

// Five lines; the tests refer to line 2 and line 3.
const SOURCE = [
  'schemaVersion: 1',
  'name: cold_open',
  'description: Drafts the cold open.',
  'output: draft',
  'enabled: true',
].join('\n');

function diagnostic(
  partial: Partial<LintDiagnostic> & Pick<LintDiagnostic, 'line'>,
): LintDiagnostic {
  return {
    severity: 'error',
    rule: 'file-name',
    message: 'the name "x" must match the file name "cold_open"',
    column: 1,
    ...partial,
  };
}

function root(fixture: ComponentFixture<ToolEditor>): HTMLElement {
  return fixture.nativeElement as HTMLElement;
}

function viewOf(fixture: ComponentFixture<ToolEditor>): EditorView {
  const view = EditorView.findFromDOM(root(fixture));
  if (view === null) {
    throw new Error('No editor view.');
  }
  return view;
}

function saveButton(fixture: ComponentFixture<ToolEditor>): HTMLButtonElement {
  const button = root(fixture).querySelector<HTMLButtonElement>('[data-save]');
  if (button === null) {
    throw new Error('No Save button.');
  }
  return button;
}

/** Inserts `text` at the end of a line, through the view's public dispatch. */
function insertAtLineEnd(
  fixture: ComponentFixture<ToolEditor>,
  lineNumber: number,
  text: string,
): void {
  const view = viewOf(fixture);
  const line = view.state.doc.line(lineNumber);
  view.dispatch({ changes: { from: line.to, insert: text } });
}

/** The line number of each mark of one lint severity. */
function markedLines(
  fixture: ComponentFixture<ToolEditor>,
  severity: 'error' | 'warning',
): number[] {
  const view = viewOf(fixture);
  return [
    ...root(fixture).querySelectorAll<HTMLElement>(`.cm-lintRange-${severity}`),
  ].map((mark) => view.state.doc.lineAt(view.posAtDOM(mark)).number);
}

function statusText(fixture: ComponentFixture<ToolEditor>): string {
  return (
    root(fixture).querySelector('[role="status"]')?.textContent?.trim() ?? ''
  );
}

/** Lets the promises of the lint answer run under fake timers. */
async function settle(): Promise<void> {
  for (let turn = 0; turn < 10; turn += 1) {
    await Promise.resolve();
  }
}

describe('ToolEditor', () => {
  let doubles: ShellTestDoubles;

  beforeEach(async () => {
    vi.useFakeTimers();
    doubles = createShellTestDoubles();
    doubles.api.respond('POST', LINT_PATH, { lint: [], views: null });
    await TestBed.configureTestingModule({
      providers: [...doubles.providers],
    }).compileComponents();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  function create(saveName: string | undefined = 'cold_open'): {
    fixture: ComponentFixture<ToolEditor>;
    component: ToolEditor;
  } {
    const fixture = TestBed.createComponent(ToolEditor);
    fixture.componentRef.setInput('source', SOURCE);
    fixture.componentRef.setInput('label', 'cold_open.yaml');
    fixture.componentRef.setInput('saveName', saveName);
    fixture.detectChanges();
    return { fixture, component: fixture.componentInstance };
  }

  it('T1a a save refused with 422 marks each diagnostic on its line and writes the diagnostics list', async () => {
    doubles.api.fail(
      'POST',
      SAVE_PATH,
      new ApiError(
        422,
        'TOOL_SPEC_LINT_FAILED',
        'Tool "cold_open" was not saved.',
        {
          lint: [diagnostic({ line: 3 })],
        },
      ),
    );
    const { fixture } = create();

    insertAtLineEnd(fixture, 5, ' ');
    vi.advanceTimersByTime(500);
    await settle();
    fixture.detectChanges();
    saveButton(fixture).click();
    fixture.detectChanges();

    expect(markedLines(fixture, 'error')).toEqual([3]);
    const items = root(fixture).querySelectorAll('[data-diagnostics] li');
    expect(items).toHaveLength(1);
    expect(items[0]?.textContent).toContain('line 3:');
    expect(items[0]?.textContent).toContain(
      'the name "x" must match the file name "cold_open"',
    );
    expect(statusText(fixture)).toBe('The tool was not saved. Lint errors: 1.');
    expect(viewOf(fixture).state.doc.line(5).text).toBe('enabled: true ');
  });

  it('T1b a save with warnings only is saved, and its warnings show on their lines', () => {
    doubles.api.respond('POST', SAVE_PATH, {
      source: SOURCE,
      origin: 'user',
      spec: null,
      views: null,
      lint: [
        diagnostic({
          severity: 'warning',
          rule: 'additional-properties',
          message: 'an unused property',
          line: 2,
        }),
      ],
    });
    const { fixture, component } = create();
    const saved: string[] = [];
    component.saved.subscribe((result) => saved.push(result.source));

    insertAtLineEnd(fixture, 4, ' ');
    fixture.detectChanges();
    saveButton(fixture).click();
    fixture.detectChanges();

    expect(saved).toHaveLength(1);
    expect(saved[0]).toBe(SOURCE);
    expect(markedLines(fixture, 'warning')).toEqual([2]);
    expect(statusText(fixture)).toBe('Saved. Warnings: 1.');
  });

  it('T1c typing sends one debounced lint request with the source and the save name, and its diagnostics show on their lines', async () => {
    doubles.api.respond('POST', LINT_PATH, {
      lint: [diagnostic({ line: 2 })],
      views: null,
    });
    const { fixture, component } = create();
    const linted: LintDiagnostic[][] = [];
    component.linted.subscribe((answer) => linted.push(answer.lint));
    const lintRequests = () =>
      doubles.api.requests.filter((request) => request.path === LINT_PATH);

    insertAtLineEnd(fixture, 3, 'a');
    insertAtLineEnd(fixture, 3, 'b');
    fixture.detectChanges();
    vi.advanceTimersByTime(499);
    expect(lintRequests()).toHaveLength(0);

    vi.advanceTimersByTime(1);
    await settle();
    fixture.detectChanges();

    expect(lintRequests()).toHaveLength(1);
    expect(lintRequests()[0]?.body).toEqual({
      source: viewOf(fixture).state.doc.toString(),
      name: 'cold_open',
    });
    expect(markedLines(fixture, 'error')).toEqual([2]);
    expect(linted).toHaveLength(1);
  });

  it('T7 linted carries the text it is of: the linted text, the saved text, and the loaded text with no lint request', async () => {
    doubles.api.respond('POST', LINT_PATH, { lint: [], views: null });
    const { fixture, component } = create();
    const answers: { source: string; lint: LintDiagnostic[] }[] = [];
    component.linted.subscribe((answer) => answers.push(answer));
    const lintRequests = () =>
      doubles.api.requests.filter((request) => request.path === LINT_PATH);

    // (a) a debounced lint answer carries the text that was linted.
    insertAtLineEnd(fixture, 3, 'x');
    const edited = viewOf(fixture).state.doc.toString();
    vi.advanceTimersByTime(500);
    await settle();
    expect(lintRequests()).toHaveLength(1);
    expect(answers.at(-1)?.source).toBe(edited);

    // (b) a save answer carries the saved text.
    doubles.api.respond('POST', SAVE_PATH, {
      source: edited,
      origin: 'user',
      spec: null,
      views: null,
      lint: [],
    });
    saveButton(fixture).click();
    await settle();
    expect(answers.at(-1)?.source).toBe(edited);

    // (c) after the save the loaded text is the saved text. Typed back to it, the next run emits that text and sends
    // no lint request.
    const before = lintRequests().length;
    const answersBefore = answers.length;
    viewOf(fixture).dispatch({
      changes: {
        from: 0,
        to: viewOf(fixture).state.doc.length,
        insert: edited,
      },
    });
    fixture.detectChanges();
    vi.advanceTimersByTime(500);
    await settle();
    expect(lintRequests()).toHaveLength(before);
    expect(answers).toHaveLength(answersBefore + 1);
    expect(answers.at(-1)).toMatchObject({ source: edited, lint: [] });
  });

  it('T6 an unsaved edit is reported to the unsaved-text registry, and flush answers false, so leaving asks', () => {
    const registry = TestBed.inject(UnsavedTextRegistry);
    const { fixture } = create();
    expect(registry.unsaved()).toHaveLength(0);

    insertAtLineEnd(fixture, 2, ' ');
    fixture.detectChanges();
    const sources = registry.unsaved();
    expect(sources).toHaveLength(1);

    const answers: boolean[] = [];
    sources[0]?.flush().subscribe((saved) => answers.push(saved));
    expect(answers).toEqual([false]);
  });
});
