import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import {
  PROVIDER_DEFAULTS,
  type ProviderConfig,
} from '@bbartolome/scriba-contracts/providers';
import { describe, expect, it } from 'vitest';
import {
  createShellTestDoubles,
  type ShellTestDoubles,
} from '../../shell/testing/test-doubles';
import { ProjectModelPanel } from './project-model-panel';
import {
  ACTIVE_PROJECT_PATH,
  EFFECTIVE_MODEL_PATH,
  PROJECT_MODEL_CLEAR_PATH,
  PROJECT_MODEL_PATH,
  PROVIDERS_PATH,
} from './providers-copies';
import { readView } from './providers-test-server';

// The "This project" section in a host page, against the Shell's fake API client and fake event
// source. Every state is a new host, and every reply is registered before the action that sends
// its request.

@Component({
  imports: [ProjectModelPanel],
  template: '<app-project-model-panel />',
})
class PanelHost {}

interface Host {
  fixture: ComponentFixture<PanelHost>;
  doubles: ShellTestDoubles;
}

function providerConfig(id: string, baseURL: string): ProviderConfig {
  return {
    id,
    kind: 'openai-compatible',
    baseURL,
    model: '',
    ...PROVIDER_DEFAULTS,
  };
}

const MOCK = readView(providerConfig('mock', 'http://localhost:9001/v1'));
const OTHER = readView(providerConfig('other', 'http://localhost:9002/v1'));

function effective(
  providerId: string,
  model: string,
  source: 'project' | 'app' | 'auto',
  warning?: string,
): Record<string, unknown> {
  const reply: Record<string, unknown> = {
    choice: { providerId, model },
    source,
    contextSize: 64000,
  };
  if (warning !== undefined) reply['warning'] = warning;
  return reply;
}

function root(fixture: ComponentFixture<unknown>): HTMLElement {
  return fixture.nativeElement as HTMLElement;
}

async function settle(fixture: ComponentFixture<unknown>): Promise<void> {
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
}

/** Creates a new host: a new fake client, the replies `serve` registers, and a first render. */
async function host(serve: (doubles: ShellTestDoubles) => void): Promise<Host> {
  TestBed.resetTestingModule();
  const doubles = createShellTestDoubles();
  serve(doubles);
  TestBed.configureTestingModule({
    imports: [PanelHost],
    providers: doubles.providers,
  });
  await TestBed.compileComponents();
  const fixture = TestBed.createComponent(PanelHost);
  await settle(fixture);
  return { fixture, doubles };
}

function buttonIn(scope: ParentNode, text: string): HTMLButtonElement {
  const found = [...scope.querySelectorAll<HTMLButtonElement>('button')].find(
    (button) => button.textContent.trim() === text,
  );
  if (!found) throw new Error(`No button "${text}".`);
  return found;
}

/** Sets a control's value and fires the event it listens to: `input`, or `change` for a select. */
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

function select(fixture: ComponentFixture<unknown>): HTMLSelectElement {
  const found = root(fixture).querySelector<HTMLSelectElement>(
    'select[name="projectProvider"]',
  );
  if (!found) throw new Error('No provider select.');
  return found;
}

function modelInput(fixture: ComponentFixture<unknown>): HTMLInputElement {
  const found = root(fixture).querySelector<HTMLInputElement>(
    'input[name="projectModel"]',
  );
  if (!found) throw new Error('No model input.');
  return found;
}

function serveActive(doubles: ShellTestDoubles, active: string | null): void {
  doubles.api.respond('GET', ACTIVE_PROJECT_PATH, { active });
}

describe('project model panel', () => {
  it('M1 hidden with no active project; the source readout and the set, clear and warning lines follow the replies', async () => {
    // a. Hidden: no active project, so no heading, no form, and no request but the active read.
    const hidden = await host((doubles) => serveActive(doubles, null));
    expect(root(hidden.fixture).textContent).not.toContain('This project');
    expect(
      root(hidden.fixture).querySelector('select[name="projectProvider"]'),
    ).toBeNull();
    expect(
      hidden.doubles.api.requests.some(
        (request) =>
          request.path === PROVIDERS_PATH ||
          request.path === EFFECTIVE_MODEL_PATH,
      ),
    ).toBe(false);

    // b. Source project: the readout and the form show the stored override.
    const project = await host((doubles) => {
      serveActive(doubles, 'book');
      doubles.api.respond('GET', PROVIDERS_PATH, {
        providers: [MOCK, OTHER],
      });
      doubles.api.respond(
        'GET',
        EFFECTIVE_MODEL_PATH,
        effective('mock', 'gemma3', 'project'),
      );
    });
    const shown = root(project.fixture).textContent;
    expect(shown).toContain('Model in use: gemma3 from mock.');
    expect(shown).toContain('Set for this project');
    expect(select(project.fixture).value).toBe('mock');
    expect(modelInput(project.fixture).value).toBe('gemma3');
    expect(
      project.doubles.api.requests.some(
        (request) =>
          request.path === EFFECTIVE_MODEL_PATH &&
          request.params?.['projectId'] === 'book',
      ),
    ).toBe(true);

    // c. Set: a provider and a model post the override, then the readout shows the new source.
    const setting = await host((doubles) => {
      serveActive(doubles, 'book');
      doubles.api.respond('GET', PROVIDERS_PATH, {
        providers: [MOCK, OTHER],
      });
      doubles.api.respond(
        'GET',
        EFFECTIVE_MODEL_PATH,
        effective('other', '', 'app'),
      );
      doubles.api.respond('POST', PROJECT_MODEL_PATH, {
        projectModel: { providerId: 'mock', model: 'gemma3' },
      });
      doubles.api.respond(
        'GET',
        EFFECTIVE_MODEL_PATH,
        effective('mock', 'gemma3', 'project'),
      );
    });
    await setValue(setting.fixture, select(setting.fixture), 'mock');
    await setValue(setting.fixture, modelInput(setting.fixture), 'gemma3');
    buttonIn(root(setting.fixture), 'Save for this project').click();
    await settle(setting.fixture);
    expect(setting.doubles.api.requests).toContainEqual({
      method: 'POST',
      path: PROJECT_MODEL_PATH,
      body: { providerId: 'mock', model: 'gemma3' },
    });

    // d. Clear: "Use app default" posts the clear, with no body, and the readout shows the app default.
    const clearing = await host((doubles) => {
      serveActive(doubles, 'book');
      doubles.api.respond('GET', PROVIDERS_PATH, {
        providers: [MOCK, OTHER],
      });
      doubles.api.respond(
        'GET',
        EFFECTIVE_MODEL_PATH,
        effective('mock', 'gemma3', 'project'),
      );
      doubles.api.respond('POST', PROJECT_MODEL_CLEAR_PATH, {
        projectModel: null,
      });
      doubles.api.respond(
        'GET',
        EFFECTIVE_MODEL_PATH,
        effective('other', '', 'app'),
      );
    });
    await setValue(clearing.fixture, select(clearing.fixture), '');
    buttonIn(root(clearing.fixture), 'Save for this project').click();
    await settle(clearing.fixture);
    expect(clearing.doubles.api.requests).toContainEqual({
      method: 'POST',
      path: PROJECT_MODEL_CLEAR_PATH,
    });
    expect(root(clearing.fixture).textContent).toContain(
      'From the app default',
    );

    // e. The auto and app sources each show their own line.
    const auto = await host((doubles) => {
      serveActive(doubles, 'book');
      doubles.api.respond('GET', PROVIDERS_PATH, { providers: [MOCK] });
      doubles.api.respond(
        'GET',
        EFFECTIVE_MODEL_PATH,
        effective('mock', 'llama', 'auto'),
      );
    });
    expect(root(auto.fixture).textContent).toContain(
      "The provider's first listed model",
    );
    const fromApp = await host((doubles) => {
      serveActive(doubles, 'book');
      doubles.api.respond('GET', PROVIDERS_PATH, { providers: [MOCK] });
      doubles.api.respond(
        'GET',
        EFFECTIVE_MODEL_PATH,
        effective('mock', 'gemma3', 'app'),
      );
    });
    expect(root(fromApp.fixture).textContent).toContain('From the app default');

    // f. The deleted-provider warning is shown as a role="alert" line with the server's text.
    const warned = await host((doubles) => {
      serveActive(doubles, 'book');
      doubles.api.respond('GET', PROVIDERS_PATH, { providers: [MOCK] });
      doubles.api.respond(
        'GET',
        EFFECTIVE_MODEL_PATH,
        effective(
          'mock',
          'gemma3',
          'app',
          "The project's model provider was deleted, so the app default is used.",
        ),
      );
    });
    const alert = root(warned.fixture).querySelector('[role="alert"]');
    expect(alert?.textContent.trim()).toBe(
      "The project's model provider was deleted, so the app default is used.",
    );
  });

  it('M2 a project-switched event refreshes the section, and so does a reconcile tick', async () => {
    // g. A negative control: a files-changed envelope sends no request.
    const { fixture, doubles } = await host((api) => {
      serveActive(api, 'a');
      api.api.respond('GET', PROVIDERS_PATH, { providers: [MOCK] });
      api.api.respond(
        'GET',
        EFFECTIVE_MODEL_PATH,
        effective('mock', 'llama', 'app'),
      );
    });
    const before = doubles.api.requests.length;
    doubles.events.push({
      module: 'project-store',
      type: 'files-changed',
      data: { from: 'a', to: 'b' },
    });
    await settle(fixture);
    expect(doubles.api.requests.length).toBe(before);

    // h. A project-switched event re-reads the active project and the readout for the new one.
    doubles.api.respond('GET', ACTIVE_PROJECT_PATH, { active: 'b' });
    doubles.api.respond(
      'GET',
      EFFECTIVE_MODEL_PATH,
      effective('mock', 'gemma3', 'project'),
    );
    doubles.events.push({
      module: 'project-store',
      type: 'project-switched',
      data: { from: 'a', to: 'b' },
    });
    await settle(fixture);
    expect(doubles.api.requests).toContainEqual({
      method: 'GET',
      path: ACTIVE_PROJECT_PATH,
    });
    expect(doubles.api.requests).toContainEqual({
      method: 'GET',
      path: EFFECTIVE_MODEL_PATH,
      params: { projectId: 'b' },
    });
    const shownB = root(fixture).textContent;
    expect(shownB).toContain('Set for this project');
    expect(shownB).toContain('gemma3');

    // i. In the same host, a reconcile tick (`reopen`) re-reads the section for the active project.
    doubles.api.respond('GET', ACTIVE_PROJECT_PATH, { active: 'c' });
    doubles.api.respond(
      'GET',
      EFFECTIVE_MODEL_PATH,
      effective('mock', 'gemma3', 'project'),
    );
    doubles.events.tick('reopen');
    await settle(fixture);
    expect(doubles.api.requests).toContainEqual({
      method: 'GET',
      path: EFFECTIVE_MODEL_PATH,
      params: { projectId: 'c' },
    });
    const shownC = root(fixture).textContent;
    expect(shownC).toContain('Set for this project');
    expect(shownC).toContain('gemma3');
  });
});
