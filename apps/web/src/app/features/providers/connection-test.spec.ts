import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import {
  PROVIDER_DEFAULTS,
  PROVIDER_PRESETS,
  PROVIDERS_EXAMPLES,
} from '@bbartolome/scriba-contracts/providers';
import { describe, expect, it } from 'vitest';
import {
  createShellTestDoubles,
  type ShellTestDoubles,
} from '../../shell/testing/test-doubles';
import { ProvidersPanel } from './providers.routes';
import { installProvidersServer } from './providers-test-server';

// The connection test in the panel's form, against the Shell's fake API client. The helpers copy
// those of providers-panel.spec.ts, which does not export them. Each test registers each reply it
// needs before the click that sends the request.

@Component({ imports: [ProvidersPanel], template: '<app-providers-panel />' })
class PanelHost {}

const OLLAMA_READ = PROVIDERS_EXAMPLES.ollamaRead;
const OPENROUTER = PROVIDERS_EXAMPLES.openRouterProvider;
const OPENROUTER_READ = PROVIDERS_EXAMPLES.openRouterRead;
const OLLAMA_DEFAULT = PROVIDERS_EXAMPLES.modelChoice;

// The notes and hints as the literal strings the user reads.
const CONTEXT_NOTE =
  'Context length is set in Ollama, not in Scriba. Start Ollama with OLLAMA_CONTEXT_LENGTH=64000 or higher.';
const CONTEXT_SENTENCE = 'Context length is set in Ollama, not in Scriba.';
const PULL_NOTE = 'Pull a model on the host with `ollama pull <model>`.';
const EMPTY_LIST = 'The provider listed no models. Type the model name instead.';
const HINT_UNAUTHORIZED =
  'The provider rejected the key. Check the key. If the key is right, the account may be out of credit.';
const HINT_MODEL_UNKNOWN =
  'The provider does not know this model. Pick one from the list.';

function root(fixture: ComponentFixture<unknown>): HTMLElement {
  return fixture.nativeElement as HTMLElement;
}

async function settle(fixture: ComponentFixture<unknown>): Promise<void> {
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
}

async function render(
  doubles: ShellTestDoubles,
): Promise<ComponentFixture<PanelHost>> {
  await TestBed.configureTestingModule({
    imports: [PanelHost],
    providers: doubles.providers,
  }).compileComponents();
  return mount();
}

/** Creates a new panel host (a new store and a new load). */
async function mount(): Promise<ComponentFixture<PanelHost>> {
  const fixture = TestBed.createComponent(PanelHost);
  await settle(fixture);
  return fixture;
}

function buttonIn(scope: ParentNode, text: string): HTMLButtonElement {
  const found = [...scope.querySelectorAll<HTMLButtonElement>('button')].find(
    (button) => button.textContent.trim() === text,
  );
  if (!found) throw new Error(`No button "${text}".`);
  return found;
}

async function click(
  fixture: ComponentFixture<unknown>,
  element: HTMLElement,
): Promise<void> {
  element.click();
  await settle(fixture);
}

/** Sets a value and fires the event the control listens to: `input`, or `change` for a select. */
async function setValue(
  fixture: ComponentFixture<unknown>,
  element: HTMLInputElement | HTMLSelectElement,
  value: string,
): Promise<void> {
  element.value = value;
  element.dispatchEvent(
    new Event(element instanceof HTMLSelectElement ? 'change' : 'input'),
  );
  await settle(fixture);
}

function formOf(fixture: ComponentFixture<unknown>): HTMLFormElement {
  const form =
    root(fixture).querySelector<HTMLFormElement>('form.provider-form');
  if (!form) throw new Error('No provider form is open.');
  return form;
}

/** The form's control with this name: a text or number input, or the model select. */
function control(
  fixture: ComponentFixture<unknown>,
  name: string,
): HTMLInputElement | HTMLSelectElement {
  const element = formOf(fixture).querySelector<
    HTMLInputElement | HTMLSelectElement
  >(`[name="${name}"]`);
  if (!element) throw new Error(`No form control "${name}".`);
  return element;
}

/** The row of a provider: the `li` of the Providers list whose id element reads `id`. */
function rowOf(
  fixture: ComponentFixture<unknown>,
  id: string,
): HTMLElement | undefined {
  return [
    ...root(fixture).querySelectorAll<HTMLElement>(
      'ul[aria-label="Providers"] > li',
    ),
  ].find(
    (item) => item.querySelector('.provider-id')?.textContent.trim() === id,
  );
}

function row(fixture: ComponentFixture<unknown>, id: string): HTMLElement {
  const found = rowOf(fixture, id);
  if (!found) throw new Error(`No row for ${id}.`);
  return found;
}

function editRow(
  fixture: ComponentFixture<unknown>,
  id: string,
): Promise<void> {
  return click(fixture, buttonIn(row(fixture, id), 'Edit'));
}

function requestsTo(
  doubles: ShellTestDoubles,
  method: 'GET' | 'POST',
  path: string,
): { method: string; path: string; body?: unknown }[] {
  return doubles.api.requests.filter(
    (request) => request.method === method && request.path === path,
  );
}

function testRequests(
  doubles: ShellTestDoubles,
): { method: string; path: string; body?: unknown }[] {
  return requestsTo(doubles, 'POST', '/api/providers/test');
}

/** The stage rows of the result view, as they read: `Label: state`. */
function stageRows(fixture: ComponentFixture<unknown>): string[] {
  return [
    ...root(fixture).querySelectorAll<HTMLElement>(
      'app-connection-test-result li',
    ),
  ].map((item) => item.textContent.trim());
}

/** How many times `needle` occurs in `text`. */
function occurrences(text: string, needle: string): number {
  return text.split(needle).length - 1;
}

describe('connection test', () => {
  it('C1 the result shows the failing stage, its message and its hint for unreachable, unauthorized and unknown-model results', async () => {
    const doubles = createShellTestDoubles();
    installProvidersServer(doubles.api, {
      providers: [OLLAMA_READ],
      presets: PROVIDER_PRESETS,
      appDefault: OLLAMA_DEFAULT,
    });
    const fixture = await render(doubles);
    await editRow(fixture, 'ollama');

    // Result 1: the server is not reached, so the reach stage fails and the later stages do not run.
    doubles.api.respond(
      'POST',
      '/api/providers/test',
      PROVIDERS_EXAMPLES.connectionTestUnreachable,
    );
    await click(fixture, buttonIn(formOf(fixture), 'Test connection'));
    expect(stageRows(fixture)).toEqual([
      'Reach the server: failed',
      'List the models: not run',
      'Send a test message: not run',
    ]);
    expect(root(fixture).textContent).toContain(
      'Could not reach the provider.',
    );
    expect(root(fixture).textContent).toContain(
      'Check that Ollama is running and listening on the host.',
    );

    // Result 2: the server is reached and rejects the key at the list stage.
    doubles.api.respond('POST', '/api/providers/test', {
      ok: false,
      stage: 'list',
      latencyMs: 120,
      error: {
        code: 'PROVIDER_UNAUTHORIZED',
        message: 'The provider rejected the request.',
        hint: HINT_UNAUTHORIZED,
      },
    });
    await click(fixture, buttonIn(formOf(fixture), 'Test connection'));
    expect(stageRows(fixture)).toEqual([
      'Reach the server: passed',
      'List the models: failed',
      'Send a test message: not run',
    ]);
    expect(root(fixture).textContent).toContain(
      'The provider rejected the request.',
    );
    expect(root(fixture).textContent).toContain(HINT_UNAUTHORIZED);

    // Result 3: the models are listed, and the chat stage names a model they do not include.
    doubles.api.respond('POST', '/api/providers/test', {
      ok: false,
      stage: 'chat',
      latencyMs: 80,
      modelCount: 3,
      error: {
        code: 'PROVIDER_MODEL_NOT_FOUND',
        message: 'The provider does not know this model.',
        hint: HINT_MODEL_UNKNOWN,
      },
    });
    await click(fixture, buttonIn(formOf(fixture), 'Test connection'));
    expect(stageRows(fixture)).toEqual([
      'Reach the server: passed',
      'List the models: passed',
      'Send a test message: failed',
    ]);
    expect(root(fixture).textContent).toContain('3 models listed.');
    expect(root(fixture).textContent).toContain(
      'The provider does not know this model.',
    );
    expect(root(fixture).textContent).toContain(HINT_MODEL_UNKNOWN);

    // Three clicks, three requests for the saved provider, with no key typed.
    expect(testRequests(doubles).map((request) => request.body)).toEqual([
      { providerId: 'ollama' },
      { providerId: 'ollama' },
      { providerId: 'ollama' },
    ]);
  });

  it('C2 an Ollama provider shows the context note, an empty list shows the pull note once, and a non-Ollama provider shows neither', async () => {
    const doubles = createShellTestDoubles();
    // Both providers have an empty model list (the helper's default).
    installProvidersServer(doubles.api, {
      providers: [OLLAMA_READ, OPENROUTER_READ],
      presets: PROVIDER_PRESETS,
      appDefault: OLLAMA_DEFAULT,
    });
    const fixture = await render(doubles);

    // (a) The saved Ollama provider with an empty list: the context note, the pull note once, and the empty-list sentence.
    await editRow(fixture, 'ollama');
    let text = formOf(fixture).textContent;
    expect(occurrences(text, CONTEXT_NOTE)).toBe(1);
    expect(occurrences(text, PULL_NOTE)).toBe(1);
    expect(text).toContain(EMPTY_LIST);

    // (b) A test whose hint is the pull line: the result view does not repeat it, so it appears once.
    doubles.api.respond('POST', '/api/providers/test', {
      ok: false,
      stage: 'chat',
      latencyMs: 40,
      modelCount: 0,
      error: {
        code: 'PROVIDER_MODEL_NOT_FOUND',
        message: 'The provider does not know this model.',
        hint: PULL_NOTE,
      },
    });
    await click(fixture, buttonIn(formOf(fixture), 'Test connection'));
    text = formOf(fixture).textContent;
    expect(text).toContain('0 models listed.');
    expect(text).toContain('The provider does not know this model.');
    expect(occurrences(text, PULL_NOTE)).toBe(1);

    // (c) The saved non-Ollama provider with an empty list: neither note, and the empty-list sentence.
    await editRow(fixture, 'openrouter');
    text = formOf(fixture).textContent;
    expect(text).not.toContain('OLLAMA_CONTEXT_LENGTH');
    expect(text).not.toContain('ollama pull');
    expect(text).not.toContain(CONTEXT_SENTENCE);
    expect(text).toContain(EMPTY_LIST);

    // (d) The Ollama preset in add mode: the context sentence once, from the note, and no pull note, because the list is unsaved.
    await click(fixture, buttonIn(root(fixture), 'Ollama'));
    text = formOf(fixture).textContent;
    expect(occurrences(text, CONTEXT_SENTENCE)).toBe(1);
    expect(text).not.toContain('Pull a model on the host');
  });

  it('E1 the test sends the saved id or the draft, and the typed key only in that request', async () => {
    const KEY = 'sk-test-typed-0001';
    const doubles = createShellTestDoubles();
    installProvidersServer(doubles.api, {
      providers: [OLLAMA_READ, OPENROUTER_READ],
      presets: PROVIDER_PRESETS,
      appDefault: OLLAMA_DEFAULT,
    });
    doubles.api.respond('POST', '/api/providers/test', {
      ok: true,
      stage: 'chat',
      latencyMs: 5,
      modelCount: 1,
    });
    const fixture = await render(doubles);

    // (a) A saved provider with a key: Replace shows the input, and the request names the id and carries the key.
    await editRow(fixture, 'openrouter');
    await click(fixture, buttonIn(formOf(fixture), 'Replace'));
    await setValue(fixture, control(fixture, 'key'), KEY);
    await click(fixture, buttonIn(formOf(fixture), 'Test connection'));
    expect(testRequests(doubles)).toEqual([
      {
        method: 'POST',
        path: '/api/providers/test',
        body: { providerId: 'openrouter', key: KEY },
      },
    ]);

    // (b) Add from the OpenRouter preset: the request carries the draft, with the same key.
    await click(fixture, buttonIn(root(fixture), 'OpenRouter'));
    await setValue(fixture, control(fixture, 'key'), KEY);
    await click(fixture, buttonIn(formOf(fixture), 'Test connection'));
    expect(testRequests(doubles).slice(1)).toEqual([
      {
        method: 'POST',
        path: '/api/providers/test',
        body: {
          draft: {
            kind: 'openai-compatible',
            baseURL: OPENROUTER.baseURL,
            model: '',
            ...PROVIDER_DEFAULTS,
          },
          key: KEY,
        },
      },
    ]);

    // (c) The key is in the two test requests only: no other request holds it, and no key is saved.
    expect(testRequests(doubles)).toHaveLength(2);
    expect(
      JSON.stringify(
        doubles.api.requests.filter(
          (request) => request.path !== '/api/providers/test',
        ),
      ),
    ).not.toContain(KEY);
    expect(requestsTo(doubles, 'POST', '/api/providers/key/set')).toEqual([]);
  });
});
