import { ComponentFixture, TestBed } from '@angular/core/testing';
import { afterEach, describe, expect, it } from 'vitest';
import { App } from '../app';
import { SseClient } from './sse-client';
import { SSE_CLIENT } from './tokens';

// Renders the whole App; the tests read and click only the DOM and localStorage.
async function render(): Promise<ComponentFixture<App>> {
  await TestBed.configureTestingModule({
    imports: [App],
    providers: [{ provide: SSE_CLIENT, useClass: SseClient }],
  }).compileComponents();
  const fixture = TestBed.createComponent(App);
  fixture.detectChanges();
  await fixture.whenStable();
  return fixture;
}

function radio(root: HTMLElement, name: string): HTMLButtonElement {
  const found = [
    ...root.querySelectorAll<HTMLButtonElement>('[role="radio"]'),
  ].find((button) => button.textContent?.trim() === name);
  if (!found) throw new Error(`no ${name} radio`);
  return found;
}

afterEach(() => {
  localStorage.clear();
  document.documentElement.removeAttribute('data-theme');
});

describe('theme', () => {
  it('stores a click on Dark, and System clears the stored choice', async () => {
    const fixture = await render();
    const root = fixture.nativeElement as HTMLElement;

    radio(root, 'Dark').click();
    fixture.detectChanges();
    expect(localStorage.getItem('scriba.theme')).toBe('dark');
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    expect(radio(root, 'Dark').getAttribute('aria-checked')).toBe('true');

    radio(root, 'System').click();
    fixture.detectChanges();
    expect(localStorage.getItem('scriba.theme')).toBeNull();
    expect(document.documentElement.hasAttribute('data-theme')).toBe(false);
  });

  it('applies a light choice stored on this device when the App loads', async () => {
    localStorage.setItem('scriba.theme', 'light');
    const fixture = await render();
    const root = fixture.nativeElement as HTMLElement;

    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
    expect(radio(root, 'Light').getAttribute('aria-checked')).toBe('true');
  });

  it('treats an invalid stored value as System', async () => {
    localStorage.setItem('scriba.theme', 'blue');
    const fixture = await render();
    const root = fixture.nativeElement as HTMLElement;

    expect(document.documentElement.hasAttribute('data-theme')).toBe(false);
    expect(radio(root, 'System').getAttribute('aria-checked')).toBe('true');
  });
});
