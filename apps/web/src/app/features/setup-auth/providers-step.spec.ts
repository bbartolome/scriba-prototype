import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { SETUP_AUTH_EXAMPLES } from '@bbartolome/scriba-contracts/setup-auth';
import { describe, expect, it } from 'vitest';
import { ProvidersPanel } from '../providers/providers.routes';
import { StepBody } from './step-body';

/** Stands in for the Model providers panel, which makes its own reads. */
@Component({ selector: 'app-providers-panel', template: '' })
class ProvidersStub {}

/** Stands in for the `/providers` route that MPR-11 adds. */
@Component({ template: '' })
class ProvidersRouteStub {}

/** A rendered step body for the providers step. */
function renderProvidersStep() {
  const fixture = TestBed.createComponent(StepBody);
  fixture.componentRef.setInput('step', 'providers');
  fixture.componentRef.setInput('who', SETUP_AUTH_EXAMPLES.identityLoopback);
  fixture.detectChanges();
  return fixture.nativeElement as HTMLElement;
}

describe('P1 and P2 the providers step body', () => {
  it('P1 the providers step renders the Model providers component (stub) and no form of its own', () => {
    TestBed.overrideComponent(StepBody, {
      remove: { imports: [ProvidersPanel] },
      add: { imports: [ProvidersStub] },
    });
    TestBed.configureTestingModule({
      providers: [
        provideRouter([{ path: 'providers', component: ProvidersRouteStub }]),
      ],
    });

    const host = renderProvidersStep();

    expect(host.querySelectorAll('app-providers-panel')).toHaveLength(1);
    expect(host.querySelector('form, input, select, textarea')).toBeNull();
    expect(host.querySelector('a')).toBeNull();
  });

  it('P2 without the providers route the step shows a link to /providers and no panel', () => {
    TestBed.configureTestingModule({ providers: [provideRouter([])] });

    const host = renderProvidersStep();

    const links = host.querySelectorAll('a');
    expect(links).toHaveLength(1);
    expect(links[0]?.textContent.trim()).toBe('Model providers');
    expect(links[0]?.getAttribute('href')).toBe('/providers');
    expect(host.querySelector('app-providers-panel')).toBeNull();
    expect(host.querySelector('form, input, select, textarea')).toBeNull();
  });
});
