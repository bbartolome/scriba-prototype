import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';
import { App } from './app';
import { SseClient } from './shell/sse-client';
import { FakeApiClient } from './shell/testing/test-doubles';
import { API_CLIENT, SSE_CLIENT } from './shell/tokens';

describe('App', () => {
  it('renders the Scriba heading', async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [
        { provide: SSE_CLIENT, useClass: SseClient },
        { provide: API_CLIENT, useValue: new FakeApiClient() },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    await fixture.whenStable();

    const heading = (fixture.nativeElement as HTMLElement).querySelector('h1');
    expect(heading?.textContent).toContain('Scriba');
  });
});
