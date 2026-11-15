import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router, RouterOutlet } from '@angular/router';
import { beforeEach, describe, expect, it } from 'vitest';
import { ApiError } from '../../shell/api-error';
import {
  createShellTestDoubles,
  type ShellTestDoubles,
} from '../../shell/testing/test-doubles';
import { ActiveProjectNav } from './active-project-nav';
import { PROJECTS_PATH } from './project-store-contract';

@Component({ template: '<p>chat stub</p>' })
class ChatStub {}

@Component({ template: '<p>core stub</p>' })
class CoreStub {}

// The Shell's nav slot is filled by the widget; the outlet shows the route under test.
@Component({
  imports: [ActiveProjectNav, RouterOutlet],
  template: '<app-active-project-nav /><router-outlet />',
})
class NavHost {}

const ROUTES = [
  { path: 'projects/:projectId/chat', component: ChatStub },
  { path: 'core-gate', component: CoreStub },
];

const ALPHA_ACTIVE = {
  projects: [
    { id: 'alpha', title: 'Alpha', active: true, status: 'ok' },
    { id: 'beta', title: 'Beta', active: false, status: 'ok' },
  ],
};

const BETA_ACTIVE = {
  projects: [
    { id: 'alpha', title: 'Alpha', active: false, status: 'ok' },
    { id: 'beta', title: 'Beta', active: true, status: 'ok' },
  ],
};

const NONE_ACTIVE = {
  projects: [
    { id: 'alpha', title: 'Alpha', active: false, status: 'ok' },
    { id: 'beta', title: 'Beta', active: false, status: 'ok' },
  ],
};

const UNTITLED_ACTIVE = {
  projects: [{ id: 'alpha', active: true, status: 'ok' }],
};

let doubles: ShellTestDoubles;
let fixture: ComponentFixture<NavHost>;

beforeEach(() => {
  doubles = createShellTestDoubles();
  TestBed.configureTestingModule({
    providers: [provideRouter(ROUTES), ...doubles.providers],
  });
  fixture = TestBed.createComponent(NavHost);
});

async function settle(): Promise<void> {
  await fixture.whenStable();
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
}

async function go(url: string): Promise<void> {
  fixture.detectChanges();
  await TestBed.inject(Router).navigateByUrl(url);
  await settle();
}

function widgetText(): string {
  const host = (fixture.nativeElement as HTMLElement).querySelector(
    'app-active-project-nav',
  );
  if (!host) throw new Error('no widget');
  return host.textContent?.trim() ?? '';
}

function listReads(): number {
  return doubles.api.requests.filter(
    (request) => request.method === 'GET' && request.path === PROJECTS_PATH,
  ).length;
}

describe('active project nav', () => {
  it('K2a shows the title of the active project on a project page', async () => {
    doubles.api.respond('GET', PROJECTS_PATH, ALPHA_ACTIVE);

    await go('/projects/alpha/chat');

    expect(widgetText()).toBe('Alpha');
  });

  it('K2b shows the id when the active project has no title', async () => {
    doubles.api.respond('GET', PROJECTS_PATH, UNTITLED_ACTIVE);

    await go('/projects/alpha/chat');

    expect(widgetText()).toBe('alpha');
  });

  it('K2c shows the new active project after a project-switched event', async () => {
    doubles.api.respond('GET', PROJECTS_PATH, ALPHA_ACTIVE);
    await go('/projects/alpha/chat');
    expect(widgetText()).toBe('Alpha');

    doubles.api.respond('GET', PROJECTS_PATH, BETA_ACTIVE);
    doubles.events.push({
      module: 'project-store',
      type: 'project-switched',
      data: { from: 'alpha', to: 'beta' },
    });
    await settle();

    expect(widgetText()).toBe('Beta');
  });

  it('K2d shows nothing when no project is active', async () => {
    doubles.api.respond('GET', PROJECTS_PATH, NONE_ACTIVE);

    await go('/projects/alpha/chat');

    expect(widgetText()).toBe('');
  });

  it('K2e shows nothing when the list read fails, and throws nothing', async () => {
    doubles.api.fail(
      'GET',
      PROJECTS_PATH,
      new ApiError(500, 'PLATFORM_INTERNAL', 'The server could not read.'),
    );

    await go('/projects/alpha/chat');

    expect(widgetText()).toBe('');
    expect(listReads()).toBe(1);
  });

  it('K2f sends no list read on a URL with no project id', async () => {
    doubles.api.respond('GET', PROJECTS_PATH, ALPHA_ACTIVE);

    await go('/core-gate');

    expect(widgetText()).toBe('');
    expect(listReads()).toBe(0);
  });

  it('K2g keeps the active project shown on a later page and sends no new read', async () => {
    doubles.api.respond('GET', PROJECTS_PATH, ALPHA_ACTIVE);
    await go('/projects/alpha/chat');
    expect(widgetText()).toBe('Alpha');

    await go('/core-gate');

    expect(widgetText()).toBe('Alpha');
    expect(listReads()).toBe(1);
  });
});
