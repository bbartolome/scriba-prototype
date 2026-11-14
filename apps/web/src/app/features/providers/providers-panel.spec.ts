import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import {
  PROVIDER_DEFAULTS,
  PROVIDER_PRESETS,
  PROVIDERS_EXAMPLES,
  type ProviderConfig,
} from '@bbartolome/scriba-contracts/providers';
import { describe, expect, it } from 'vitest';
import { ApiError } from '../../shell/api-error';
import {
  createShellTestDoubles,
  type ShellTestDoubles,
} from '../../shell/testing/test-doubles';
import { ProvidersPanel } from './providers.routes';
import {
  installProvidersServer,
  readView,
  serveModels,
} from './providers-test-server';

// The panel in a host page, against the Shell's fake API client. Every test registers each reply
// it needs before the action that sends the request.

@Component({ imports: [ProvidersPanel], template: '<app-providers-panel />' })
class PanelHost {}

const MASK = '\u2022\u2022\u2022\u2022';
const OPENROUTER_KEY = 'sk-or-v1-secret-abcd';
const OLLAMA: ProviderConfig = PROVIDERS_EXAMPLES.ollamaProvider;
const OLLAMA_READ = PROVIDERS_EXAMPLES.ollamaRead;
const OPENROUTER: ProviderConfig = PROVIDERS_EXAMPLES.openRouterProvider;
const OPENROUTER_READ = PROVIDERS_EXAMPLES.openRouterRead;
const OLLAMA_DEFAULT = PROVIDERS_EXAMPLES.modelChoice;
const CONTEXT_HINT =
  "The model's context length in tokens. Scriba uses it to budget a prompt; it is not sent to the provider.";
const TIMEOUT_HINT =
  'Milliseconds. 0 means 300000 (5 minutes), not no limit. A wait with no data also ends after 300000 even if you set more.';

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

/** The app default select, which sits outside the provider form. */
function appDefaultSelect(
  fixture: ComponentFixture<unknown>,
): HTMLSelectElement {
  const select = root(fixture).querySelector<HTMLSelectElement>(
    'select[name="appDefault"]',
  );
  if (!select) throw new Error('No app default select.');
  return select;
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

function formHeading(fixture: ComponentFixture<unknown>): string {
  return formOf(fixture).querySelector('h3')?.textContent.trim() ?? '';
}

function alertTexts(fixture: ComponentFixture<unknown>): string[] {
  return [...root(fixture).querySelectorAll('[role="alert"]')].map((element) =>
    element.textContent.trim(),
  );
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

function storageText(): string {
  return [
    ...Object.keys(localStorage),
    ...Object.values(localStorage),
    ...Object.keys(sessionStorage),
    ...Object.values(sessionStorage),
  ].join('\n');
}

/**
 * The four key checks of C1 (d): no element's text, no input or textarea value, no browser storage
 * entry and not the URL holds the key. Called after Save, while Replace shows, and after the reload.
 */
function expectNoKeyInPage(fixture: ComponentFixture<unknown>): void {
  const page = root(fixture);
  expect(page.textContent).not.toContain(OPENROUTER_KEY);
  for (const element of page.querySelectorAll('input, textarea')) {
    expect((element as HTMLInputElement).value).not.toContain(OPENROUTER_KEY);
  }
  expect(storageText()).not.toContain(OPENROUTER_KEY);
  expect(location.href).not.toContain(OPENROUTER_KEY);
}

describe('providers panel', () => {
  describe('C1 add from a preset with a key', () => {
    it('C1 adding OpenRouter from its preset with a key shows it masked, and a reload never shows the key', async () => {
      const doubles = createShellTestDoubles();
      const served = installProvidersServer(doubles.api, {
        providers: [OLLAMA_READ],
        presets: PROVIDER_PRESETS,
        appDefault: OLLAMA_DEFAULT,
      });
      const fixture = await render(doubles);

      await click(fixture, buttonIn(root(fixture), 'OpenRouter'));

      // (a) The prefill, and a password input for the key.
      expect((control(fixture, 'baseURL') as HTMLInputElement).value).toBe(
        'https://openrouter.ai/api/v1',
      );
      expect((control(fixture, 'temperature') as HTMLInputElement).value).toBe(
        '0.7',
      );
      expect((control(fixture, 'contextSize') as HTMLInputElement).value).toBe(
        '64000',
      );
      expect((control(fixture, 'maxTokens') as HTMLInputElement).value).toBe(
        '4096',
      );
      expect((control(fixture, 'timeout') as HTMLInputElement).value).toBe(
        '120000',
      );
      expect((control(fixture, 'retries') as HTMLInputElement).value).toBe('2');
      expect((control(fixture, 'key') as HTMLInputElement).type).toBe(
        'password',
      );

      // Type the key, register the replies, and save.
      const created = readView(OPENROUTER);
      const keyed = readView(OPENROUTER, OPENROUTER_KEY);
      const models = serveModels(doubles.api, 'openrouter', []);
      doubles.api.respond('POST', '/api/providers', created);
      doubles.api.respond('POST', '/api/providers/key/set', keyed);
      served.push(created, keyed, models);
      await setValue(fixture, control(fixture, 'key'), OPENROUTER_KEY);
      await click(fixture, buttonIn(formOf(fixture), 'Save'));

      // (b) After Save: the masked key, and the form is in edit mode.
      expectNoKeyInPage(fixture);
      expect(root(fixture).textContent).toContain('Key set');
      expect(root(fixture).textContent).toContain(`${MASK}abcd`);
      expect(formHeading(fixture)).toBe('Edit openrouter');

      // (c) The requests of the first panel, in order.
      expect(doubles.api.requests).toEqual([
        { method: 'GET', path: '/api/providers' },
        { method: 'GET', path: '/api/providers/presets' },
        { method: 'GET', path: '/api/providers/app-default' },
        {
          method: 'POST',
          path: '/api/providers',
          body: {
            presetId: 'openrouter',
            kind: 'openai-compatible',
            baseURL: 'https://openrouter.ai/api/v1',
            model: '',
            temperature: 0.7,
            contextSize: 64000,
            maxTokens: 4096,
            timeout: 120000,
            retries: 2,
          },
        },
        {
          method: 'POST',
          path: '/api/providers/key/set',
          body: { providerId: 'openrouter', key: OPENROUTER_KEY },
        },
        { method: 'GET', path: '/api/providers/openrouter/models' },
      ]);

      // Replace shows the input, which holds no key; a second Replace hides it and sends nothing.
      await click(fixture, buttonIn(root(fixture), 'Replace'));
      expect(control(fixture, 'key').value).toBe('');
      expectNoKeyInPage(fixture);
      await click(fixture, buttonIn(root(fixture), 'Replace'));
      expect(doubles.api.requests).toHaveLength(6);

      // Reload: the list is read again, and the page holds no key.
      fixture.destroy();
      const listed = { providers: [OLLAMA_READ, keyed] };
      doubles.api.respond('GET', '/api/providers', listed);
      served.push(listed);
      const reloaded = await mount();

      // (d) Nothing the page or the browser holds has the key.
      expectNoKeyInPage(reloaded);

      // (e) The row shows the key state with no form open, and the list was read twice.
      expect(row(reloaded, 'openrouter').textContent).toContain('Key set');
      expect(row(reloaded, 'openrouter').textContent).toContain(`${MASK}abcd`);
      expect(requestsTo(doubles, 'GET', '/api/providers')).toHaveLength(2);

      // The reload adds three reads and no model list, and the key was sent once.
      expect(doubles.api.requests.slice(6)).toEqual([
        { method: 'GET', path: '/api/providers' },
        { method: 'GET', path: '/api/providers/presets' },
        { method: 'GET', path: '/api/providers/app-default' },
      ]);
      expect(
        JSON.stringify(doubles.api.requests).split(OPENROUTER_KEY),
      ).toHaveLength(2);

      // (f) No body the test served holds the key.
      expect(JSON.stringify(served)).not.toContain(OPENROUTER_KEY);
    });
  });

  describe('C2 model picker', () => {
    it('C2a lists the models in a dropdown', async () => {
      const doubles = createShellTestDoubles();
      installProvidersServer(doubles.api, {
        providers: [readView({ ...OLLAMA, model: 'llama3.1' })],
        presets: PROVIDER_PRESETS,
        appDefault: OLLAMA_DEFAULT,
        models: { ollama: ['gemma3', 'llama3.1', 'qwen2.5'] },
      });
      const fixture = await render(doubles);
      await editRow(fixture, 'ollama');

      const select = control(fixture, 'model') as HTMLSelectElement;
      expect(select.tagName).toBe('SELECT');
      expect(Array.from(select.options, (option) => option.value)).toEqual([
        '',
        'gemma3',
        'llama3.1',
        'qwen2.5',
      ]);
      expect(select.value).toBe('llama3.1');
      expect(formOf(fixture).querySelector('input[name="model"]')).toBeNull();
      // The list loaded, so the form shows no explanation of a free-text model.
      for (const explanation of [
        'Save the provider to load its model list. Until then, type the model name.',
        'The provider listed no models. Type the model name instead.',
        'The model list could not be loaded. Type the model name instead.',
      ]) {
        expect(formOf(fixture).textContent).not.toContain(explanation);
      }

      doubles.api.respond(
        'POST',
        '/api/providers/ollama/update',
        readView({ ...OLLAMA, model: 'qwen2.5' }),
      );
      await setValue(fixture, select, 'qwen2.5');
      await click(fixture, buttonIn(formOf(fixture), 'Save'));

      const update = requestsTo(
        doubles,
        'POST',
        '/api/providers/ollama/update',
      );
      expect(update).toHaveLength(1);
      expect(update[0]?.body).toMatchObject({ model: 'qwen2.5' });
      expect(
        doubles.api.requests
          .filter((request) => request.path === '/api/providers/ollama/models')
          .map((request) => request.method),
      ).toEqual(['GET', 'GET']);
      expect(
        doubles.api.requests.slice(-2).map((request) => request.path),
      ).toEqual([
        '/api/providers/ollama/update',
        '/api/providers/ollama/models',
      ]);
    });

    it('C2b a failed list switches to free text with an explanation', async () => {
      const doubles = createShellTestDoubles();
      installProvidersServer(doubles.api, {
        providers: [readView({ ...OLLAMA, model: 'llama3.1' })],
        presets: PROVIDER_PRESETS,
        appDefault: OLLAMA_DEFAULT,
      });
      doubles.api.fail(
        'GET',
        '/api/providers/ollama/models',
        new ApiError(
          502,
          'PROVIDER_UNREACHABLE',
          'Could not reach the provider.',
        ),
      );
      const fixture = await render(doubles);
      doubles.api.respond(
        'POST',
        '/api/providers/ollama/update',
        readView({ ...OLLAMA, model: 'my-model' }),
      );
      await editRow(fixture, 'ollama');

      expect(formOf(fixture).querySelector('select')).toBeNull();
      expect((control(fixture, 'model') as HTMLInputElement).value).toBe(
        'llama3.1',
      );
      expect(root(fixture).textContent).toContain(
        'The model list could not be loaded. Type the model name instead.',
      );
      expect(root(fixture).textContent).toContain(
        'Could not reach the provider.',
      );

      await setValue(fixture, control(fixture, 'model'), 'my-model');
      await click(fixture, buttonIn(formOf(fixture), 'Save'));

      const update = requestsTo(
        doubles,
        'POST',
        '/api/providers/ollama/update',
      );
      expect(update[0]?.body).toMatchObject({ model: 'my-model' });
    });
  });

  describe('C3 delete refusal', () => {
    it('C3 deleting the app-default provider shows the refusal', async () => {
      const doubles = createShellTestDoubles();
      installProvidersServer(doubles.api, {
        providers: [readView(OLLAMA), readView(OPENROUTER)],
        presets: PROVIDER_PRESETS,
        appDefault: OLLAMA_DEFAULT,
      });
      const fixture = await render(doubles);
      doubles.api.fail(
        'POST',
        '/api/providers/ollama/delete',
        new ApiError(
          409,
          'PROVIDER_DEFAULT_IN_USE',
          'Provider "ollama" is the app default. Set another app default before you delete it.',
        ),
      );

      await click(fixture, buttonIn(row(fixture, 'ollama'), 'Delete'));
      await click(fixture, buttonIn(root(fixture), 'Confirm delete'));

      expect(
        requestsTo(doubles, 'POST', '/api/providers/ollama/delete'),
      ).toHaveLength(1);
      expect(alertTexts(fixture)).toEqual(['Pick another default first.']);
      expect(row(fixture, 'ollama').textContent).toContain('Default');
      expect(row(fixture, 'openrouter')).toBeDefined();
      expect(
        requestsTo(doubles, 'POST', '/api/providers/openrouter/delete'),
      ).toEqual([]);
    });
  });

  describe('E tests (decisions of the plan)', () => {
    it('E1 custom URL adds a provider from its name and base URL', async () => {
      const doubles = createShellTestDoubles();
      installProvidersServer(doubles.api, {
        providers: [OLLAMA_READ],
        presets: PROVIDER_PRESETS,
        appDefault: OLLAMA_DEFAULT,
      });
      const fixture = await render(doubles);
      await click(fixture, buttonIn(root(fixture), 'Custom URL'));

      expect(buttonIn(formOf(fixture), 'Save').disabled).toBe(true);
      expect((control(fixture, 'label') as HTMLInputElement).value).toBe('');
      expect((control(fixture, 'baseURL') as HTMLInputElement).value).toBe('');

      const created = readView({
        id: 'my-local-llama',
        kind: 'openai-compatible',
        baseURL: 'http://localhost:9000/v1',
        model: '',
        ...PROVIDER_DEFAULTS,
      });
      doubles.api.respond('POST', '/api/providers', created);
      serveModels(doubles.api, 'my-local-llama', []);
      await setValue(fixture, control(fixture, 'label'), 'My Local Llama');
      await setValue(
        fixture,
        control(fixture, 'baseURL'),
        'http://localhost:9000/v1',
      );
      await click(fixture, buttonIn(formOf(fixture), 'Save'));

      expect(requestsTo(doubles, 'POST', '/api/providers')[0]).toEqual({
        method: 'POST',
        path: '/api/providers',
        body: {
          label: 'My Local Llama',
          kind: 'openai-compatible',
          baseURL: 'http://localhost:9000/v1',
          model: '',
          ...PROVIDER_DEFAULTS,
        },
      });
      expect(
        doubles.api.requests.some((request) =>
          request.path.endsWith('/key/set'),
        ),
      ).toBe(false);
      expect(rowOf(fixture, 'my-local-llama')).toBeDefined();
      expect(
        requestsTo(doubles, 'GET', '/api/providers/my-local-llama/models'),
      ).toHaveLength(1);
      expect(formHeading(fixture)).toBe('Edit my-local-llama');
    });

    it('E2 the edit body sends the seven fields, with numbers as numbers, and the reply replaces the row', async () => {
      const doubles = createShellTestDoubles();
      installProvidersServer(doubles.api, {
        providers: [OLLAMA_READ],
        presets: PROVIDER_PRESETS,
        appDefault: OLLAMA_DEFAULT,
      });
      const fixture = await render(doubles);
      await editRow(fixture, 'ollama');

      doubles.api.respond(
        'POST',
        '/api/providers/ollama/update',
        readView({
          ...OLLAMA,
          temperature: 0.2,
          maxTokens: 2048,
          model: 'gemma3',
        }),
      );
      await setValue(fixture, control(fixture, 'temperature'), '0.2');
      await setValue(fixture, control(fixture, 'maxTokens'), '2048');
      await click(fixture, buttonIn(formOf(fixture), 'Save'));

      expect(
        requestsTo(doubles, 'POST', '/api/providers/ollama/update')[0]?.body,
      ).toEqual({
        baseURL: OLLAMA.baseURL,
        model: '',
        temperature: 0.2,
        contextSize: 64000,
        maxTokens: 2048,
        timeout: 120000,
        retries: 2,
      });
      expect(row(fixture, 'ollama').textContent).toContain('gemma3');
    });

    it('E3 validation blocks Save and sends nothing; the hints are on the page', async () => {
      const doubles = createShellTestDoubles();
      installProvidersServer(doubles.api, {
        providers: [OLLAMA_READ],
        presets: PROVIDER_PRESETS,
        appDefault: OLLAMA_DEFAULT,
      });
      const fixture = await render(doubles);
      await editRow(fixture, 'ollama');

      const bad: [string, string, string][] = [
        ['baseURL', 'not a url', OLLAMA.baseURL],
        ['maxTokens', '0', '4096'],
        ['retries', '-1', '2'],
        ['temperature', '', '0.7'],
      ];
      for (const [name, invalid, valid] of bad) {
        await setValue(fixture, control(fixture, name), invalid);
        expect(buttonIn(formOf(fixture), 'Save').disabled).toBe(true);
        await setValue(fixture, control(fixture, name), valid);
      }
      expect(buttonIn(formOf(fixture), 'Save').disabled).toBe(false);
      expect(
        doubles.api.requests.filter((request) => request.method === 'POST'),
      ).toEqual([]);
      expect(root(fixture).textContent).toContain(TIMEOUT_HINT);
      expect(root(fixture).textContent).toContain(CONTEXT_HINT);

      await click(fixture, buttonIn(formOf(fixture), 'Close'));
      await click(fixture, buttonIn(root(fixture), 'OpenRouter'));
      expect(buttonIn(formOf(fixture), 'Save').disabled).toBe(true);
      expect(formOf(fixture).textContent).toContain(
        'This provider needs an API key.',
      );
      expect(
        doubles.api.requests.filter((request) => request.method === 'POST'),
      ).toEqual([]);
    });

    it('E4 key states: no hint for a short key; replace; remove', async () => {
      const doubles = createShellTestDoubles();
      installProvidersServer(doubles.api, {
        providers: [readView(OLLAMA, 'abc'), OPENROUTER_READ],
        presets: PROVIDER_PRESETS,
        appDefault: OLLAMA_DEFAULT,
      });
      const fixture = await render(doubles);

      // (a) A key of four characters or fewer: no hint in the row or in the key field.
      expect(row(fixture, 'ollama').textContent).toContain('Key set');
      expect(row(fixture, 'ollama').textContent).not.toContain(MASK);
      await editRow(fixture, 'ollama');
      expect(formOf(fixture).textContent).toContain('Key set');
      expect(formOf(fixture).textContent).not.toContain(MASK);
      await click(fixture, buttonIn(root(fixture), 'Close'));

      // (b) Replace shows the input; a typed key saves with the update first, then key/set.
      const updated = PROVIDERS_EXAMPLES.openRouterRead;
      doubles.api.respond('POST', '/api/providers/openrouter/update', updated);
      doubles.api.respond(
        'POST',
        '/api/providers/key/set',
        readView(OPENROUTER, 'sk-new-key-wxyz'),
      );
      await editRow(fixture, 'openrouter');
      expect(row(fixture, 'openrouter').textContent).toContain(`${MASK}3f9x`);
      await click(fixture, buttonIn(root(fixture), 'Replace'));
      await setValue(fixture, control(fixture, 'key'), 'sk-new-key-wxyz');
      await click(fixture, buttonIn(formOf(fixture), 'Save'));

      expect(
        doubles.api.requests.slice(-3).map((request) => request.path),
      ).toEqual([
        '/api/providers/openrouter/update',
        '/api/providers/key/set',
        '/api/providers/openrouter/models',
      ]);
      expect(doubles.api.requests.slice(-3)[1]?.body).toEqual({
        providerId: 'openrouter',
        key: 'sk-new-key-wxyz',
      });
      expect(row(fixture, 'openrouter').textContent).toContain(`${MASK}wxyz`);
      expect(formOf(fixture).querySelector('input[name="key"]')).toBeNull();

      // (c) Remove posts key/clear, and the row and the key field show No key set.
      doubles.api.respond(
        'POST',
        '/api/providers/key/clear',
        readView(OPENROUTER),
      );
      await click(fixture, buttonIn(root(fixture), 'Remove'));

      expect(
        requestsTo(doubles, 'POST', '/api/providers/key/clear')[0]?.body,
      ).toEqual({
        providerId: 'openrouter',
      });
      expect(row(fixture, 'openrouter').textContent).toContain('No key set');
      expect(formOf(fixture).textContent).toContain('No key set');
      expect(root(fixture).textContent).not.toContain('openrouter-1');
      expect(
        requestsTo(doubles, 'GET', '/api/providers/openrouter/models'),
      ).toHaveLength(3);
    });

    it('E5 app default: the select lists providers, posts an empty model, and handles no default', async () => {
      const doubles = createShellTestDoubles();
      const openRouter = { ...OPENROUTER_READ, model: 'openai/gpt-4o-mini' };
      installProvidersServer(doubles.api, {
        providers: [OLLAMA_READ, openRouter],
        presets: PROVIDER_PRESETS,
        appDefault: OLLAMA_DEFAULT,
      });
      const fixture = await render(doubles);

      // (a) The options, the selected default and the badge.
      const select = appDefaultSelect(fixture);
      expect(
        Array.from(select.options, (option) => option.textContent.trim()),
      ).toEqual(['ollama', 'openrouter \u00b7 openai/gpt-4o-mini']);
      expect(select.value).toBe('ollama');
      expect(row(fixture, 'ollama').textContent).toContain('Default');

      doubles.api.respond('POST', '/api/providers/app-default', {
        appDefault: { providerId: 'openrouter', model: '' },
      });
      await setValue(fixture, select, 'openrouter');

      expect(
        requestsTo(doubles, 'POST', '/api/providers/app-default')[0]?.body,
      ).toEqual({
        providerId: 'openrouter',
        model: '',
      });
      expect(row(fixture, 'openrouter').textContent).toContain('Default');
      expect(row(fixture, 'ollama').textContent).not.toContain('Default');

      // (b) A reloaded panel with no default: the No default option is selected and disabled.
      doubles.api.respond(
        'GET',
        '/api/providers/app-default',
        PROVIDERS_EXAMPLES.appDefaultUnset,
      );
      fixture.destroy();
      const reloaded = await mount();
      const unset = appDefaultSelect(reloaded);
      const first = unset.options[0];
      expect(first?.textContent.trim()).toBe('No default');
      expect(first?.disabled).toBe(true);
      expect(first?.selected).toBe(true);
      expect(row(reloaded, 'openrouter').textContent).not.toContain('Default');
      expect(
        requestsTo(doubles, 'POST', '/api/providers/app-default'),
      ).toHaveLength(1);

      doubles.api.respond('POST', '/api/providers/app-default', {
        appDefault: { providerId: 'openrouter', model: '' },
      });
      await setValue(reloaded, unset, 'openrouter');
      expect(
        requestsTo(doubles, 'POST', '/api/providers/app-default')[1]?.body,
      ).toEqual({
        providerId: 'openrouter',
        model: '',
      });
      expect(row(reloaded, 'openrouter').textContent).toContain('Default');
      expect(
        Array.from(unset.options, (option) => option.textContent.trim()),
      ).not.toContain('No default');
    });

    it('E6 a failed key save after a create, and the retry (D6 and D7)', async () => {
      const doubles = createShellTestDoubles();
      installProvidersServer(doubles.api, {
        providers: [OLLAMA_READ],
        presets: PROVIDER_PRESETS,
        appDefault: OLLAMA_DEFAULT,
      });
      const fixture = await render(doubles);
      await click(fixture, buttonIn(root(fixture), 'OpenRouter'));
      await setValue(fixture, control(fixture, 'key'), OPENROUTER_KEY);

      doubles.api.respond('POST', '/api/providers', readView(OPENROUTER));
      doubles.api.fail(
        'POST',
        '/api/providers/key/set',
        new ApiError(500, 'PLATFORM_INTERNAL', 'Internal error.'),
      );
      serveModels(doubles.api, 'openrouter', []);
      await click(fixture, buttonIn(formOf(fixture), 'Save'));

      const keySaveFailed =
        'The provider was saved, but its key was not saved. Paste the key again and press Save.';
      expect(row(fixture, 'openrouter').textContent).toContain('No key set');
      expect(formHeading(fixture)).toBe('Edit openrouter');
      expect(alertTexts(fixture)).toEqual([keySaveFailed]);
      expect(
        Array.from(root(fixture).querySelectorAll('[role="status"]')).some(
          (element) => element.textContent.includes('Saved.'),
        ),
      ).toBe(false);
      expect((control(fixture, 'key') as HTMLInputElement).value).toBe('');
      expect(
        doubles.api.requests.slice(3).map((request) => request.path),
      ).toEqual([
        '/api/providers',
        '/api/providers/key/set',
        '/api/providers/openrouter/models',
      ]);

      // Retry: paste the key again and press Save. The save is an edit-mode save, with no create.
      doubles.api.respond(
        'POST',
        '/api/providers/openrouter/update',
        readView(OPENROUTER),
      );
      doubles.api.respond(
        'POST',
        '/api/providers/key/set',
        readView(OPENROUTER, OPENROUTER_KEY),
      );
      const before = doubles.api.requests.length;
      await setValue(fixture, control(fixture, 'key'), OPENROUTER_KEY);
      await click(fixture, buttonIn(formOf(fixture), 'Save'));

      const retry = doubles.api.requests.slice(before);
      expect(retry.map((request) => request.path)).toEqual([
        '/api/providers/openrouter/update',
        '/api/providers/key/set',
        '/api/providers/openrouter/models',
      ]);
      expect(retry[0]?.body).toEqual({
        baseURL: OPENROUTER.baseURL,
        model: '',
        temperature: 0.7,
        contextSize: 64000,
        maxTokens: 4096,
        timeout: 120000,
        retries: 2,
      });
      expect(retry[1]?.body).toEqual({
        providerId: 'openrouter',
        key: OPENROUTER_KEY,
      });
      expect(requestsTo(doubles, 'POST', '/api/providers')).toHaveLength(1);
      expect(row(fixture, 'openrouter').textContent).toContain(`${MASK}abcd`);
      expect(alertTexts(fixture)).toEqual([]);
      expect(
        Array.from(root(fixture).querySelectorAll('[role="status"]')).map(
          (element) => element.textContent.trim(),
        ),
      ).toEqual(['Saved.']);
      // The key is set, so no key input is shown, and the typed key is not on the page.
      expect(formOf(fixture).querySelector('input[name="key"]')).toBeNull();
      expect(root(fixture).textContent).not.toContain(OPENROUTER_KEY);
    });

    it('E7 empty, unsaved and missing model lists', async () => {
      const doubles = createShellTestDoubles();
      installProvidersServer(doubles.api, {
        providers: [OLLAMA_READ],
        presets: PROVIDER_PRESETS,
        appDefault: OLLAMA_DEFAULT,
      });
      const fixture = await render(doubles);

      // (a) An empty list.
      await editRow(fixture, 'ollama');
      expect(root(fixture).textContent).toContain(
        'The provider listed no models. Type the model name instead.',
      );
      expect(control(fixture, 'model').tagName).toBe('INPUT');
      await click(fixture, buttonIn(formOf(fixture), 'Close'));

      // (b) The add form requests no list.
      const listsBefore = doubles.api.requests.length;
      await click(fixture, buttonIn(root(fixture), 'OpenRouter'));
      expect(root(fixture).textContent).toContain(
        'Save the provider to load its model list. Until then, type the model name.',
      );
      expect(
        doubles.api.requests
          .slice(listsBefore)
          .some((request) => request.path.endsWith('/models')),
      ).toBe(false);
      await click(fixture, buttonIn(formOf(fixture), 'Close'));

      // (c) A provider with no canned list: the fake throws a plain Error, shown as a failed list.
      const lonely: ProviderConfig = {
        id: 'lonely',
        kind: 'openai-compatible',
        baseURL: 'http://localhost:9001/v1',
        model: '',
        ...PROVIDER_DEFAULTS,
      };
      doubles.api.respond('GET', '/api/providers', {
        providers: [OLLAMA_READ, readView(lonely)],
      });
      fixture.destroy();
      const plain = await mount();
      await editRow(plain, 'lonely');
      expect(root(plain).textContent).toContain(
        'The model list could not be loaded. Type the model name instead.',
      );
      expect(control(plain, 'model').tagName).toBe('INPUT');
    });

    it('E8 a delete removes the row; a 404 reloads the list', async () => {
      const doubles = createShellTestDoubles();
      installProvidersServer(doubles.api, {
        providers: [OLLAMA_READ, OPENROUTER_READ],
        presets: PROVIDER_PRESETS,
        appDefault: OLLAMA_DEFAULT,
      });
      const fixture = await render(doubles);

      doubles.api.respond('POST', '/api/providers/app-default', {
        appDefault: { providerId: 'openrouter', model: '' },
      });
      await setValue(fixture, appDefaultSelect(fixture), 'openrouter');

      doubles.api.respond('POST', '/api/providers/ollama/delete', null);
      await click(fixture, buttonIn(row(fixture, 'ollama'), 'Delete'));
      await click(fixture, buttonIn(root(fixture), 'Confirm delete'));
      expect(rowOf(fixture, 'ollama')).toBeUndefined();

      const listsBefore = requestsTo(doubles, 'GET', '/api/providers').length;
      doubles.api.fail(
        'POST',
        '/api/providers/openrouter/delete',
        new ApiError(
          404,
          'PROVIDER_NOT_FOUND',
          'Provider "openrouter" was not found.',
        ),
      );
      await click(fixture, buttonIn(row(fixture, 'openrouter'), 'Delete'));
      await click(fixture, buttonIn(root(fixture), 'Confirm delete'));

      expect(alertTexts(fixture)).toEqual([
        'That provider no longer exists. The list was reloaded.',
      ]);
      expect(requestsTo(doubles, 'GET', '/api/providers')).toHaveLength(
        listsBefore + 1,
      );
    });
  });
});
