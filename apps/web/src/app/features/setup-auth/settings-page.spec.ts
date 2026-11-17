import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import {
  VERSION_ROUTE,
  type VersionInfo,
} from '@bbartolome/scriba-contracts/platform';
import {
  IDENTITY_ROUTE,
  PREFERENCES_ROUTE,
  SETUP_AUTH_EXAMPLES,
  SETUP_STATUS_ROUTE,
  SIGN_OUT_ROUTE,
  TAILSCALE_STATUS_ROUTE,
  type SetupStatus,
} from '@bbartolome/scriba-contracts/setup-auth';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { APP_ROUTES } from '../../app.routes';
import {
  restoreMatchMedia,
  stubMatchMedia,
} from '../../shell/testing/match-media';
import {
  createShellTestDoubles,
  type ShellTestDoubles,
} from '../../shell/testing/test-doubles';
import { ProvidersPanel } from '../providers/providers.routes';
import { SettingsPage } from './settings-page';
import { TAILSCALE_POLL_MS } from './tailscale-panel';

/** Stands in for the Model providers panel, which makes its own reads. */
@Component({ selector: 'app-providers-panel', template: '' })
class ProvidersStub {}

const version = {
  version: '1.2.3',
  revision: 'abc1234',
  builtAt: '2026-11-14T00:00:00Z',
  composeVersion: 3,
} satisfies VersionInfo;

// The one-liner of units/SAU-10-compose-version-status.md line 21, written out here, so that a typo
// in COMPOSE_UPDATE_COMMAND fails this test.
const COMPOSE_ONE_LINER =
  'docker run --rm -e SETUP=true bbartolome/scriba | bash';
const LOOPBACK_TEXT = 'Signed in from this computer (loopback).';
const TAILNET_TEXT = 'Signed in over the tailnet as ada@example.com.';
const VERSION_TEXT = 'Scriba 1.2.3 (revision abc1234)';
const COMPOSE_TEXT = 'Compose version 3';
const RECOVERY_COMMANDS = [
  'cat ~/Books/.scriba/setup-url',
  'docker compose logs scriba',
  '~/Books/.scriba/setup-token',
  'docker compose restart',
  'docker compose stop',
  '~/Books/.scriba/',
];

beforeEach(() => {
  stubMatchMedia(390, 844);
});

afterEach(() => {
  restoreMatchMedia();
});

/** The status with the given compose check and the example steps. */
function statusWith(compose: SetupStatus['compose']): SetupStatus {
  return { ...SETUP_AUTH_EXAMPLES.setupStatus, compose };
}

/** Renders `/settings` with the doubles, and the providers panel replaced by a stub. */
async function renderSettings(
  doubles: ShellTestDoubles,
): Promise<RouterTestingHarness> {
  TestBed.overrideComponent(SettingsPage, {
    remove: { imports: [ProvidersPanel] },
    add: { imports: [ProvidersStub] },
  });
  TestBed.configureTestingModule({
    providers: [provideRouter(APP_ROUTES), ...doubles.providers],
  });
  return RouterTestingHarness.create('/settings');
}

/** A new render of `/settings`: away to the not-found page, then back, so the page reads again. */
async function rerender(harness: RouterTestingHarness): Promise<void> {
  await harness.navigateByUrl('/no-such-page');
  await harness.navigateByUrl('/settings');
}

function rootOf(harness: RouterTestingHarness): HTMLElement {
  const root = harness.routeNativeElement;
  if (!root) {
    throw new Error('The settings page is not rendered.');
  }
  return root;
}

function paragraphs(root: ParentNode): string[] {
  return [...root.querySelectorAll('p')].map((p) =>
    (p.textContent ?? '').trim(),
  );
}

function buttonTexts(root: ParentNode): string[] {
  return [...root.querySelectorAll('button')].map((b) =>
    (b.textContent ?? '').trim(),
  );
}

function buttonNamed(root: ParentNode, text: string): HTMLButtonElement | null {
  const found = [...root.querySelectorAll('button')].find(
    (b) => (b.textContent ?? '').trim() === text,
  );
  return found ?? null;
}

function codeTexts(root: ParentNode): string[] {
  return [...root.querySelectorAll('code')].map((c) =>
    (c.textContent ?? '').trim(),
  );
}

/** The section whose heading (an h3) has the given text. */
function sectionNamed(root: ParentNode, heading: string): HTMLElement {
  const section = [...root.querySelectorAll('section')].find(
    (s) => (s.querySelector('h3')?.textContent ?? '').trim() === heading,
  );
  if (!section) {
    throw new Error(`No section named ${heading}.`);
  }
  return section;
}

/** The POSTs of one path that reached the fake client, in order. */
function postsTo(doubles: ShellTestDoubles, path: string) {
  return doubles.api.requests.filter(
    (r) => r.method === 'POST' && r.path === path,
  );
}

/** Runs a check until it passes, with change detection before each try. */
async function settle(
  harness: RouterTestingHarness,
  check: (root: HTMLElement) => void,
): Promise<void> {
  await vi.waitFor(
    () => {
      harness.detectChanges();
      check(rootOf(harness));
    },
    { timeout: 5000 },
  );
}

describe('S1 settings page with the fake API', () => {
  it('S1 the settings page shows the identity variants, the versions, the compose warning for mismatch and unknown and not for ok, posts the sign-out, and navigates to /setup on re-run', async () => {
    const doubles = createShellTestDoubles();
    // Step 1: canned answers for every read and command the page makes.
    doubles.api.respond(
      'GET',
      IDENTITY_ROUTE,
      SETUP_AUTH_EXAMPLES.identityLoopback,
    );
    doubles.api.respond(
      'GET',
      SETUP_STATUS_ROUTE,
      statusWith(SETUP_AUTH_EXAMPLES.composeOk),
    );
    doubles.api.respond('GET', VERSION_ROUTE, version);
    doubles.api.respond(
      'GET',
      TAILSCALE_STATUS_ROUTE,
      SETUP_AUTH_EXAMPLES.tailscaleUnavailable,
    );
    doubles.api.respond(
      'GET',
      PREFERENCES_ROUTE,
      SETUP_AUTH_EXAMPLES.preferences,
    );
    doubles.api.respond('POST', PREFERENCES_ROUTE, {
      authorName: 'Ada',
      defaultGenrePack: 'fiction',
    });
    doubles.api.respond('POST', SIGN_OUT_ROUTE, null);

    // Step 2: the sections, the loopback identity, the versions, no warning text for ok, and the
    // four recovery steps with their commands.
    const harness = await renderSettings(doubles);
    const router = TestBed.inject(Router);
    await settle(harness, (root) => {
      expect(paragraphs(root)).toContain(LOOPBACK_TEXT);
      expect(paragraphs(root)).toContain(VERSION_TEXT);
      expect(paragraphs(root)).toContain(COMPOSE_TEXT);
      expect(buttonTexts(root)).toEqual(
        expect.arrayContaining(['Sign out this browser', 'Re-run setup']),
      );
      expect(root.querySelector('app-providers-panel')).not.toBeNull();
      // The warning element exists once the status has loaded; for ok it shows no code.
      expect(root.querySelectorAll('app-compose-warning')).toHaveLength(1);
      expect(root.querySelectorAll('app-compose-warning code')).toHaveLength(0);
      expect(root.textContent).not.toContain(COMPOSE_ONE_LINER);
      const recovery = sectionNamed(root, 'Recovery');
      expect(recovery.querySelectorAll('li')).toHaveLength(4);
      expect(codeTexts(recovery)).toEqual(
        expect.arrayContaining(RECOVERY_COMMANDS),
      );
    });

    // Step 3: the tailnet identity, on a new render.
    doubles.api.respond(
      'GET',
      IDENTITY_ROUTE,
      SETUP_AUTH_EXAMPLES.identityTailnet,
    );
    await rerender(harness);
    await settle(harness, (root) =>
      expect(paragraphs(root)).toContain(TAILNET_TEXT),
    );

    // Step 4: the warning for mismatch and for unknown, each with the one-liner only.
    for (const compose of [
      SETUP_AUTH_EXAMPLES.composeMismatch,
      SETUP_AUTH_EXAMPLES.composeUnknown,
    ]) {
      doubles.api.respond('GET', SETUP_STATUS_ROUTE, statusWith(compose));
      await rerender(harness);
      await settle(harness, (root) => {
        const warnings = root.querySelectorAll('app-compose-warning');
        expect(warnings).toHaveLength(1);
        const warning = root.querySelector('app-compose-warning');
        expect(warning && codeTexts(warning)).toEqual([COMPOSE_ONE_LINER]);
      });
    }

    // Step 5: changing one field posts only that field, and the Save button sends it.
    await settle(harness, (root) =>
      expect(
        root.querySelector('input[name="defaultGenrePack"]'),
      ).not.toBeNull(),
    );
    const field = rootOf(harness).querySelector<HTMLInputElement>(
      'input[name="defaultGenrePack"]',
    );
    if (!field) {
      throw new Error('The genre pack field is not rendered.');
    }
    field.value = 'fiction';
    field.dispatchEvent(new Event('input'));
    harness.detectChanges();
    buttonNamed(rootOf(harness), 'Save preferences')?.click();
    await vi.waitFor(
      () => expect(postsTo(doubles, PREFERENCES_ROUTE)).toHaveLength(1),
      { timeout: 5000 },
    );
    expect(postsTo(doubles, PREFERENCES_ROUTE)).toEqual([
      {
        method: 'POST',
        path: PREFERENCES_ROUTE,
        body: { defaultGenrePack: 'fiction' },
      },
    ]);

    // Step 6: Sign out this browser posts an empty body and goes to /setup.
    harness.detectChanges();
    buttonNamed(rootOf(harness), 'Sign out this browser')?.click();
    await vi.waitFor(() => expect(router.url).toBe('/setup'), {
      timeout: 5000,
    });
    expect(postsTo(doubles, SIGN_OUT_ROUTE)).toEqual([
      { method: 'POST', path: SIGN_OUT_ROUTE, body: {} },
    ]);

    // Step 7: Re-run setup goes to /setup and sends no request.
    await harness.navigateByUrl('/settings');
    await settle(harness, (root) =>
      expect(buttonTexts(root)).toContain('Re-run setup'),
    );
    const postsBefore = doubles.api.requests.filter(
      (r) => r.method === 'POST',
    ).length;
    expect(router.url).toBe('/settings');
    buttonNamed(rootOf(harness), 'Re-run setup')?.click();
    await vi.waitFor(() => expect(router.url).toBe('/setup'), {
      timeout: 5000,
    });
    expect(
      doubles.api.requests.filter((r) => r.method === 'POST'),
    ).toHaveLength(postsBefore);
  });
});

/** The number of status reads that reached the fake client. */
function statusReads(doubles: ShellTestDoubles): number {
  return doubles.api.requests.filter(
    (r) => r.method === 'GET' && r.path === TAILSCALE_STATUS_ROUTE,
  ).length;
}

/** The links of a section: the text and the href of each `<a>`. */
function linksIn(
  section: HTMLElement,
): { text: string; href: string | null }[] {
  return [...section.querySelectorAll('a')].map((a) => ({
    text: (a.textContent ?? '').trim(),
    href: a.getAttribute('href'),
  }));
}

function setVisibility(state: DocumentVisibilityState): void {
  Object.defineProperty(document, 'visibilityState', {
    configurable: true,
    value: state,
  });
}

/**
 * Lets the pending promises run on real timers, with change detection after each turn, for at most
 * 100 turns, until the check passes. Fake timers do not advance here: `vi.waitFor` would advance
 * them, so the S3 test does not use it.
 */
async function waitForTurns(
  harness: RouterTestingHarness,
  check: (root: HTMLElement) => void,
): Promise<void> {
  let lastError: unknown;
  for (let turn = 0; turn < 100; turn++) {
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
    harness.detectChanges();
    try {
      check(rootOf(harness));
      return;
    } catch (error: unknown) {
      lastError = error;
    }
  }
  throw lastError;
}

/** Lets the pending promises run on real timers, then runs change detection. */
async function flushTurns(harness: RouterTestingHarness): Promise<void> {
  for (let turn = 0; turn < 3; turn++) {
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
  }
  harness.detectChanges();
}

describe('S3 settings page polling', () => {
  afterEach(() => {
    vi.useRealTimers();
    Reflect.deleteProperty(document, 'visibilityState');
  });

  it('S3 the Tailscale status is read every 5 s while the page is visible, and not while it is hidden or after the page is left; the settings section shows the login link and then the tailnet URL', async () => {
    // Only the poll's interval is fake. Angular, the dynamic import and setTimeout stay real.
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] });
    setVisibility('visible');
    const doubles = createShellTestDoubles();
    // Canned answers as S1 step 1, with the status read answering NeedsLogin with a login link.
    doubles.api.respond(
      'GET',
      IDENTITY_ROUTE,
      SETUP_AUTH_EXAMPLES.identityLoopback,
    );
    doubles.api.respond(
      'GET',
      SETUP_STATUS_ROUTE,
      statusWith(SETUP_AUTH_EXAMPLES.composeOk),
    );
    doubles.api.respond('GET', VERSION_ROUTE, version);
    doubles.api.respond(
      'GET',
      PREFERENCES_ROUTE,
      SETUP_AUTH_EXAMPLES.preferences,
    );
    doubles.api.respond(
      'GET',
      TAILSCALE_STATUS_ROUTE,
      SETUP_AUTH_EXAMPLES.tailscaleNeedsLogin,
    );
    const harness = await renderSettings(doubles);

    // (a) The Tailscale section shows the login link to its authURL.
    await waitForTurns(harness, (root) =>
      expect(linksIn(sectionNamed(root, 'Tailscale'))).toEqual([
        {
          text: 'Log in to Tailscale',
          href: SETUP_AUTH_EXAMPLES.tailscaleNeedsLogin.authURL,
        },
      ]),
    );
    const readsAtStart = statusReads(doubles);

    // (b) The next poll reads Running: the section shows the tailnet URL and no login link.
    doubles.api.respond(
      'GET',
      TAILSCALE_STATUS_ROUTE,
      SETUP_AUTH_EXAMPLES.tailscaleRunning,
    );
    vi.advanceTimersByTime(TAILSCALE_POLL_MS);
    await flushTurns(harness);
    expect(statusReads(doubles)).toBe(readsAtStart + 1);
    expect(linksIn(sectionNamed(rootOf(harness), 'Tailscale'))).toEqual([
      {
        text: 'Open Scriba over the tailnet',
        href: SETUP_AUTH_EXAMPLES.tailscaleRunning.tailnetURL,
      },
    ]);

    // (c) Hidden: no read while the document is hidden, however long the wait.
    setVisibility('hidden');
    document.dispatchEvent(new Event('visibilitychange'));
    vi.advanceTimersByTime(3 * TAILSCALE_POLL_MS);
    await flushTurns(harness);
    expect(statusReads(doubles)).toBe(readsAtStart + 1);

    // (d) Visible again: one read at once, then one per poll interval.
    setVisibility('visible');
    document.dispatchEvent(new Event('visibilitychange'));
    await flushTurns(harness);
    expect(statusReads(doubles)).toBe(readsAtStart + 2);
    vi.advanceTimersByTime(TAILSCALE_POLL_MS);
    await flushTurns(harness);
    expect(statusReads(doubles)).toBe(readsAtStart + 3);

    // (e) Left: the page is destroyed, so no read follows however long the wait.
    await harness.navigateByUrl('/no-such-page');
    const readsWhenLeft = statusReads(doubles);
    vi.advanceTimersByTime(3 * TAILSCALE_POLL_MS);
    await flushTurns(harness);
    expect(statusReads(doubles)).toBe(readsWhenLeft);
  });
});
