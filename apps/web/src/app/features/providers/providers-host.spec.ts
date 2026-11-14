import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import {
  PROVIDER_DEFAULTS,
  PROVIDER_PRESETS,
  PROVIDERS_EXAMPLES,
  type ProviderConfig,
} from '@bbartolome/scriba-contracts/providers';
import { describe, expect, it, vi } from 'vitest';
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

// The panel in a host page that has no settings route and no providers route.

@Component({ imports: [ProvidersPanel], template: '<app-providers-panel />' })
class Host {}

const MY_LOCAL_LLAMA: ProviderConfig = {
  id: 'my-local-llama',
  kind: 'openai-compatible',
  baseURL: 'http://localhost:9000/v1',
  model: '',
  ...PROVIDER_DEFAULTS,
};

function rowIds(scope: HTMLElement): string[] {
  return [
    ...scope.querySelectorAll<HTMLElement>(
      'ul[aria-label="Providers"] > li .provider-id',
    ),
  ].map((id) => id.textContent.trim());
}

function buttonIn(scope: ParentNode, text: string): HTMLButtonElement {
  const found = [...scope.querySelectorAll<HTMLButtonElement>('button')].find(
    (button) => button.textContent.trim() === text,
  );
  if (!found) throw new Error(`No button "${text}".`);
  return found;
}

/** Fires a click and lets the view and the fake settle. */
async function click(
  fixture: ComponentFixture<unknown>,
  element: HTMLElement,
): Promise<void> {
  element.click();
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
}

async function setValue(
  fixture: ComponentFixture<unknown>,
  element: HTMLInputElement | HTMLSelectElement,
  value: string,
): Promise<void> {
  element.value = value;
  element.dispatchEvent(
    new Event(element instanceof HTMLSelectElement ? 'change' : 'input'),
  );
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
}

/** Fails when a rendered link points at the settings route or a routerLink attribute is present. */
function expectNoSettingsLink(scope: HTMLElement): void {
  for (const link of scope.querySelectorAll('a[href]')) {
    expect(link.getAttribute('href') ?? '').not.toContain('/settings');
  }
  expect(scope.querySelector('[routerlink]')).toBeNull();
}

describe('providers panel in a host page', () => {
  it('C4a renders in a bare host with only the Shell doubles', async () => {
    const doubles = createShellTestDoubles();
    installProvidersServer(doubles.api, {
      providers: [PROVIDERS_EXAMPLES.ollamaRead],
      presets: PROVIDER_PRESETS,
      appDefault: PROVIDERS_EXAMPLES.modelChoice,
    });
    TestBed.configureTestingModule({
      imports: [Host],
      providers: [...doubles.providers],
    });
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(rowIds(fixture.nativeElement as HTMLElement)).toEqual(['ollama']);
  });

  it('C4b renders in a routed host whose table has no settings or providers route, and never navigates', async () => {
    const doubles: ShellTestDoubles = createShellTestDoubles();
    installProvidersServer(doubles.api, {
      providers: [PROVIDERS_EXAMPLES.ollamaRead],
      presets: PROVIDER_PRESETS,
      appDefault: PROVIDERS_EXAMPLES.modelChoice,
    });
    TestBed.configureTestingModule({
      providers: [
        provideRouter([{ path: 'host', component: Host }]),
        ...doubles.providers,
      ],
    });
    const harness = await RouterTestingHarness.create('/host');
    const fixture = harness.fixture;
    const scope = fixture.nativeElement as HTMLElement;
    const router = TestBed.inject(Router);
    const navigateByUrl = vi.spyOn(router, 'navigateByUrl');
    const navigate = vi.spyOn(router, 'navigate');
    // Checked after every action: still on /host, no navigation call, and no settings link.
    const stillOnHost = (): void => {
      expect(router.url).toBe('/host');
      expect(navigateByUrl).not.toHaveBeenCalled();
      expect(navigate).not.toHaveBeenCalled();
      expectNoSettingsLink(scope);
    };
    harness.detectChanges();
    stillOnHost();

    // Add a custom provider.
    const created = readView(MY_LOCAL_LLAMA);
    doubles.api.respond('POST', '/api/providers', created);
    serveModels(doubles.api, 'my-local-llama', []);
    await click(fixture, buttonIn(scope, 'Custom URL'));
    stillOnHost();
    const name = scope.querySelector<HTMLInputElement>('[name="label"]');
    const baseURL = scope.querySelector<HTMLInputElement>('[name="baseURL"]');
    if (!name || !baseURL) throw new Error('No custom URL fields.');
    await setValue(fixture, name, 'My Local Llama');
    stillOnHost();
    await setValue(fixture, baseURL, 'http://localhost:9000/v1');
    stillOnHost();
    await click(fixture, buttonIn(scope, 'Save'));
    stillOnHost();
    expect(rowIds(scope)).toEqual(['ollama', 'my-local-llama']);

    // Make the custom provider the app default, then the Ollama provider again.
    doubles.api.respond('POST', '/api/providers/app-default', {
      appDefault: { providerId: 'my-local-llama', model: '' },
    });
    const select = scope.querySelector<HTMLSelectElement>(
      'select[name="appDefault"]',
    );
    if (!select) throw new Error('No app default select.');
    await setValue(fixture, select, 'my-local-llama');
    stillOnHost();
    doubles.api.respond('POST', '/api/providers/app-default', {
      appDefault: { providerId: 'ollama', model: '' },
    });
    await setValue(fixture, select, 'ollama');
    stillOnHost();

    // Delete the custom provider.
    doubles.api.respond('POST', '/api/providers/my-local-llama/delete', null);
    const customRow = [
      ...scope.querySelectorAll<HTMLElement>('ul[aria-label="Providers"] > li'),
    ].find(
      (item) =>
        item.querySelector('.provider-id')?.textContent.trim() ===
        'my-local-llama',
    );
    if (!customRow) throw new Error('No row for my-local-llama.');
    await click(fixture, buttonIn(customRow, 'Delete'));
    stillOnHost();
    await click(fixture, buttonIn(scope, 'Confirm delete'));
    stillOnHost();

    expect(rowIds(scope)).toEqual(['ollama']);
    expect(
      doubles.api.requests.filter(
        (request) =>
          request.method === 'POST' && request.path === '/api/providers',
      ),
    ).toHaveLength(1);
    expect(
      doubles.api.requests.every((request) =>
        request.path.startsWith('/api/providers'),
      ),
    ).toBe(true);
  });
});
