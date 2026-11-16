import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { EditorView } from '@codemirror/view';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { EditorLayout } from './index';
import { FakeApiClient } from './testing/test-doubles';
import { restoreMatchMedia, stubMatchMedia } from './testing/match-media';
import { API_CLIENT } from './tokens';

const PROJECT_ID = 'book';
const PATH = 'drafts/ch01.md';
const READ_PATH = '/api/project-store/projects/book/file';
const WRITE_PATH = '/api/project-store/projects/book/file/write';
const READ_HASH = `sha256:${'a'.repeat(64)}`;
const WRITE_HASH = `sha256:${'b'.repeat(64)}`;
const MTIME = '2026-11-14T10:00:00Z';
const RAW = '# Chapter One\n\nText.\n';

@Component({
  imports: [EditorLayout],
  template: `<app-editor-layout [reference]="reference" />`,
})
class LayoutHost {
  reference = { projectId: PROJECT_ID, path: PATH };
}

let resize: (width: number, height: number) => void;

beforeEach(() => {
  resize = stubMatchMedia(1024, 768);
});

afterEach(() => {
  restoreMatchMedia();
});

async function render(
  width: number,
  height: number,
): Promise<ComponentFixture<LayoutHost>> {
  resize(width, height);
  const api = new FakeApiClient();
  api.respond('GET', READ_PATH, {
    path: PATH,
    content: RAW,
    hash: READ_HASH,
    mtime: MTIME,
  });
  api.respond('POST', WRITE_PATH, {
    path: PATH,
    hash: WRITE_HASH,
    mtime: MTIME,
  });
  await TestBed.configureTestingModule({
    imports: [LayoutHost],
    providers: [provideRouter([]), { provide: API_CLIENT, useValue: api }],
  }).compileComponents();
  const fixture = TestBed.createComponent(LayoutHost);
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
  return fixture;
}

/** Waits for the CDK's debounced media change to reach the component. */
async function settle(fixture: ComponentFixture<LayoutHost>): Promise<void> {
  await new Promise((r) => setTimeout(r, 0));
  await fixture.whenStable();
  fixture.detectChanges();
}

function el<T extends Element = HTMLElement>(
  fixture: ComponentFixture<LayoutHost>,
  selector: string,
): T {
  const found = (fixture.nativeElement as HTMLElement).querySelector<T>(
    selector,
  );
  if (found === null) {
    throw new Error(`No element for ${selector}.`);
  }
  return found;
}

function toggleGroup(fixture: ComponentFixture<LayoutHost>): HTMLElement {
  return el(fixture, '[role="group"][aria-label="Edit or preview"]');
}

function section(
  fixture: ComponentFixture<LayoutHost>,
  name: 'Source' | 'Preview',
): HTMLElement {
  return el(fixture, `section[aria-label="${name}"]`);
}

function toggleButton(
  fixture: ComponentFixture<LayoutHost>,
  name: 'Edit' | 'Preview',
): HTMLButtonElement {
  const button = [...toggleGroup(fixture).querySelectorAll('button')].find(
    (b) => b.textContent?.trim() === name,
  );
  if (button === undefined) {
    throw new Error(`No ${name} toggle.`);
  }
  return button;
}

function editorView(fixture: ComponentFixture<LayoutHost>): EditorView {
  const cm = el(fixture, 'app-markdown-editor .cm-editor');
  const view = EditorView.findFromDOM(cm);
  if (view === null) {
    throw new Error('No editor view.');
  }
  return view;
}

describe('EditorLayout', () => {
  it('C1 split view with a live preview on a tablet and a desktop, the Edit and Preview toggle on a phone', async () => {
    const fixture = await render(1024, 768);

    // Tablet: both panes shown, the toggle hidden, the preview renders the file.
    expect(section(fixture, 'Source').hasAttribute('hidden')).toBe(false);
    expect(section(fixture, 'Preview').hasAttribute('hidden')).toBe(false);
    expect(toggleGroup(fixture).hasAttribute('hidden')).toBe(true);
    expect(section(fixture, 'Preview').querySelector('h1')?.textContent).toBe(
      'Chapter One',
    );

    // A change in the source reaches the live preview.
    const view = editorView(fixture);
    view.dispatch({
      changes: { from: view.state.doc.length, insert: '\nAdded paragraph.\n' },
    });
    await settle(fixture);
    expect(section(fixture, 'Preview').textContent).toContain(
      'Added paragraph.',
    );

    // Desktop: still split, toggle hidden.
    resize(1280, 800);
    await settle(fixture);
    expect(section(fixture, 'Source').hasAttribute('hidden')).toBe(false);
    expect(section(fixture, 'Preview').hasAttribute('hidden')).toBe(false);
    expect(toggleGroup(fixture).hasAttribute('hidden')).toBe(true);

    // Phone: the toggle shows, Edit is the default, one pane at a time.
    resize(390, 844);
    await settle(fixture);
    expect(toggleGroup(fixture).hasAttribute('hidden')).toBe(false);
    expect(toggleButton(fixture, 'Edit').getAttribute('aria-pressed')).toBe(
      'true',
    );
    expect(toggleButton(fixture, 'Preview').getAttribute('aria-pressed')).toBe(
      'false',
    );
    expect(section(fixture, 'Preview').hasAttribute('hidden')).toBe(true);
    expect(section(fixture, 'Source').hasAttribute('hidden')).toBe(false);
    expect(el(fixture, 'app-markdown-editor')).not.toBeNull();

    toggleButton(fixture, 'Preview').click();
    fixture.detectChanges();
    expect(section(fixture, 'Preview').hasAttribute('hidden')).toBe(false);
    expect(section(fixture, 'Source').hasAttribute('hidden')).toBe(true);
    expect(el(fixture, 'app-markdown-editor')).not.toBeNull();
    expect(toggleButton(fixture, 'Preview').getAttribute('aria-pressed')).toBe(
      'true',
    );

    toggleButton(fixture, 'Edit').click();
    fixture.detectChanges();
    expect(section(fixture, 'Source').hasAttribute('hidden')).toBe(false);
    expect(section(fixture, 'Preview').hasAttribute('hidden')).toBe(true);
    expect(toggleButton(fixture, 'Edit').getAttribute('aria-pressed')).toBe(
      'true',
    );
  });

  it('X1 a change of device class keeps the editor and its unsaved text', async () => {
    const fixture = await render(390, 844);
    toggleButton(fixture, 'Preview').click();
    fixture.detectChanges();

    const before = el(fixture, 'app-markdown-editor');
    const view = editorView(fixture);
    view.dispatch({
      changes: { from: view.state.doc.length, insert: 'Kept.' },
    });

    resize(1024, 768);
    await settle(fixture);

    expect(el(fixture, 'app-markdown-editor')).toBe(before);
    expect(editorView(fixture).state.doc.toString()).toContain('Kept.');
    expect(section(fixture, 'Source').hasAttribute('hidden')).toBe(false);
    expect(section(fixture, 'Preview').hasAttribute('hidden')).toBe(false);
  });
});
